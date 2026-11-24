// Kit das 3 direções da laje (ficha catalogo-estilos). Material, luz e pós mudam JUNTOS:
//   A = maquete de brinquedo: plástico Physical fosco com verniz e bump de vinil, RoomEnvironment, sol quente e baixo de
//       fim de tarde, bloom leve, tilt-shift LEVE (regra 4: câmera na altura do boneco, sem borrão forte), grão, vinheta.
//   B = toon 3D com contorno: MeshToon de 3 faixas (Nearest), casco em espaço de tela (3 px), sol branco forte,
//       hemisfério neutro, SEM environment, NeutralToneMapping, vinheta leve, sem grão.
//   C = massinha em stop-motion: Physical fosco com sheen e bump de digital, malha amassada por ruído, luz de estúdio
//       macia (VSM), RoomEnvironment fraco, ACES, fundo de cartolina, animação em "twos" (15 qps).
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Dir = "A" | "B" | "C";
export type V3 = [number, number, number];

export function gradToon() {
  const d = new Uint8Array([95, 95, 95, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function texRuidoFino(seed = 3) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  const r = lcg(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ruído de valor 2D/3D (fora de qualquer laço de textura por quadro)
const h2 = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, y: number, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; };
const h3 = (x: number, y: number, z: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const n3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => h3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
};

/** Deforma a malha com um campo de ruído (só depende da posição: sem rachar costuras). */
export function amassa(geo: THREE.BufferGeometry, amp: number, freq: number) {
  const g = geo.clone();
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = freq;
    p.setXYZ(i, x + (n3(x * f, y * f, z * f) - 0.5) * amp, y + (n3(x * f + 31, y * f + 7, z * f) - 0.5) * amp, z + (n3(x * f, y * f + 17, z * f + 53) - 0.5) * amp);
  }
  g.computeVertexNormals();
  return g;
}

/** marcas de dedo da massinha: arcos concêntricos + amassado largo */
export function texDigital(seed = 7) {
  const N = 512;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  const img = g.createImageData(N, N);
  const r = lcg(seed * 97 + 13);
  const centros: [number, number, number, number][] = [];
  for (let i = 0; i < 9; i++) centros.push([r() * N, r() * N, 50 + r() * 70, r() * 6]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0.5 + (fbm(x * 0.012, y * 0.012, 3) - 0.5) * 0.55;
    for (const [cx, cy, R, f] of centros) {
      let dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy);
      const d = Math.hypot(dx, dy * 1.25);
      if (d < R) { const k = 1 - d / R; v += Math.sin(d * 0.9 + f) * 0.09 * k * k; }
    }
    v += (r() - 0.5) * 0.04;
    const i = (y * N + x) * 4;
    const b = Math.max(0, Math.min(255, v * 255));
    img.data[i] = img.data[i + 1] = img.data[i + 2] = b;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export type OpMat = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  rough?: number;
  metal?: number;
  clear?: number;
  bump?: THREE.Texture | null;
  bumpS?: number;
  semContorno?: boolean;
  liso?: boolean; // sem marca de dedo / amassado (C): olhos, metal, vidro
  emis?: THREE.ColorRepresentation;
  emisI?: number;
  transp?: number;
  lado?: THREE.Side;
  basico?: boolean;
  aditivo?: boolean;
  tipo?: "agua" | "gordura" | "cheiro" | "boneco" | "praga";
  estampa?: boolean; // mapa desenhado (azulejo, piso, telha) que o toon mantém
  chapada?: THREE.ColorRepresentation; // cor no lugar do mapa fotográfico (toon e planta)
};

// prancha de arquiteto: tudo vira tom de azul pela luminância; água, gordura, cheiro e o boné ficam coloridos
const P_ESC = new THREE.Color(0x0a2149), P_CLA = new THREE.Color(0x8fb4e2);
export function corPlanta(c: THREE.ColorRepresentation, tipo?: OpMat["tipo"]) {
  if (tipo === "agua") return new THREE.Color(0x46d6ff);
  if (tipo === "gordura") return new THREE.Color(0xffcf5a);
  if (tipo === "cheiro") return new THREE.Color(c).lerp(new THREE.Color(0x9ff0a0), 0.55);
  if (tipo === "boneco") return new THREE.Color(0xff6b2c);
  if (tipo === "praga") return new THREE.Color(c);
  const cc = new THREE.Color(c);
  const l = Math.sqrt(cc.r * 0.3 + cc.g * 0.59 + cc.b * 0.11);
  return P_ESC.clone().lerp(P_CLA, THREE.MathUtils.smoothstep(l, 0.1, 1.0));
}

export class Kit {
  grad = gradToon();
  ruido = texRuidoFino();
  digital: THREE.Texture | null = null;
  amassar = 1;
  pxPadrao = 2.6;
  constructor(public dir: Dir, public W: number, public H: number) {
    if (dir === "C") this.amassar = 0;
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const emis = new THREE.Color(o.emis ?? 0x000000);
    const d = this.dir;
    // toon e planta não usam textura de foto: o mapa vira a cor chapada (só as estampas desenhadas ficam no toon)
    const semMapa = d !== "A" && !!o.map && !(d === "B" && o.estampa);
    const cor0 = semMapa ? o.chapada ?? o.color ?? 0xffffff : o.color ?? 0xffffff;
    const mapa = semMapa || d === "C" ? null : o.map ?? null;
    if (o.basico || o.aditivo) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(d === "C" ? corPlanta(cor0, o.tipo) : cor0), map: mapa, toneMapped: false });
      if (o.aditivo) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
    } else if (d === "B" || d === "C") {
      const c = d === "C" ? corPlanta(cor0, o.tipo) : new THREE.Color(cor0);
      const tm = new THREE.MeshToonMaterial({ color: c, map: mapa, gradientMap: this.grad, emissive: emis, emissiveIntensity: o.emisI ?? 1 });
      if ((o.metal ?? 0) > 0.5) tm.emissive = c.clone().multiplyScalar(0.16);
      if (o.tipo === "agua") tm.emissive = c.clone().multiplyScalar(d === "C" ? 0.35 : 0.3);
      m = tm;
    } else {
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: cor0, map: mapa, roughness: Math.min(0.62, o.rough ?? 0.5), metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.42), clearcoatRoughness: 0.32,
        bumpMap: o.liso ? null : o.bump ?? this.ruido, bumpScale: o.bump ? o.bumpS ?? 1 : 0.15,
        emissive: emis, emissiveIntensity: o.emisI ?? 1,
      });
    }
    if (o.transp !== undefined) { m.transparent = true; (m as THREE.MeshStandardMaterial).opacity = o.transp; m.depthWrite = false; }
    if (o.lado !== undefined) m.side = o.lado;
    m.userData.semContorno = !!o.semContorno || !!o.basico || !!o.aditivo;
    m.userData.liso = !!o.liso || !!o.basico || !!o.aditivo;
    if (o.aditivo) m.userData.semProf = true;
    return m;
  }

  /** contorno escuro em espaço de tela (só B) */
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir === "A") return;
    if (!px) px = this.pxPadrao;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: this.dir === "C" ? px * 0.6 : px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color(this.dir === "C" ? "#e4efff" : "#1a0f0c") } },
      vertexShader: /* glsl */ `
        uniform float px; uniform vec2 res;
        #include <clipping_planes_pars_vertex>
        void main(){
          vec4 p = vec4(position,1.0); vec3 n = normal;
          #ifdef USE_INSTANCING
            p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
          #endif
          vec4 mvPosition = modelViewMatrix * p;
          #include <clipping_planes_vertex>
          vec4 c = projectionMatrix * mvPosition;
          vec3 vn = normalize(mat3(modelViewMatrix) * n);
          vec2 d = normalize((projectionMatrix * vec4(vn,0.0)).xy + 1e-5);
          c.xy += d * px * 2.0 / res * c.w;
          gl_Position = c;
        }`,
      fragmentShader: `uniform vec3 cor;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          gl_FragColor = vec4(cor,1.0); }`,
      side: THREE.BackSide,
      clipping: true,
    });
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    o.castShadow = o.receiveShadow = false;
    mesh.add(o);
  }

  /** malha com sombra, contorno (B) e amassado (C). Geometria dinâmica (vértices mexidos por quadro): amassar = false */
  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3, pai?: THREE.Object3D, pos?: V3, rot?: V3, esc?: V3 | number, amassar = true) {
    let g = geo;
    if (this.dir === "C" && amassar && this.amassar > 0 && !mat.userData.liso) {
      g.computeBoundingSphere();
      const R = Math.min(g.boundingSphere!.radius, 0.6);
      g = amassa(g, R * 0.055 * this.amassar, 2.2 / R);
    }
    const me = new THREE.Mesh(g, mat);
    const basico = (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    me.castShadow = me.receiveShadow = !basico;
    if (mat.userData.semProf) me.userData.semProf = true;
    if (pos) me.position.set(...pos);
    if (rot) me.rotation.set(...rot);
    if (esc !== undefined) typeof esc === "number" ? me.scale.setScalar(esc) : me.scale.set(...esc);
    this.contorno(me, px);
    if (pai) pai.add(me);
    return me;
  }
}

// ---------------------------------------------------------------------------------------------- geometrias
export const esfera = (r: number, ws = 32, hs = 24) => new THREE.SphereGeometry(r, ws, hs);
export const capsula = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 20);
export const cil = (rt: number, rb: number, h: number, s = 32, aberto = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, aberto);
export const caixa = (x: number, y: number, z: number, r = 0.02) => (r > 0 ? new RoundedBoxGeometry(x, y, z, 3, Math.min(r, x / 2.01, y / 2.01, z / 2.01)) : new THREE.BoxGeometry(x, y, z));
export const torno = (pts: [number, number][], seg = 40, phiS = 0, phiL = Math.PI * 2) => {
  // de cima para baixo inverte as normais: garante perfil de baixo para cima
  const p = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
  const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg, phiS, phiL);
  g.computeVertexNormals();
  return g;
};
export const perfil = (pts: [number, number][], n = 24): [number, number][] => {
  const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getPoints(n).map((v) => [v.x, v.y]);
};
export const tubo = (pts: V3[], r: number, seg = 32, rad = 12) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, rad, false);
export const junta = (gs: THREE.BufferGeometry[]) => {
  const n = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  n.forEach((g) => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(n, false)!;
};
export const transf = (g: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], esc: V3 | number = 1) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), typeof esc === "number" ? new THREE.Vector3(esc, esc, esc) : new THREE.Vector3(...esc));
  return g.clone().applyMatrix4(m);
};

// ---------------------------------------------------------------------------------------------- renderizador
export function montaMundo(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, stencil: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = dir === "A" ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = dir === "A" ? 0.92 : 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 200);

  // sol: A fim de tarde (baixo, quente), B meio-dia (branco, alto), C luz de estúdio (alta, macia)
  const solDir = dir === "A" ? new THREE.Vector3(-3.8, 1.75, 2.4) : dir === "B" ? new THREE.Vector3(-2.2, 4.6, 3.2) : new THREE.Vector3(-2.4, 4.2, 3.6);
  const pm = new THREE.PMREMGenerator(renderer);
  if (dir === "A") { scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4; }

  const sol = new THREE.DirectionalLight(dir === "A" ? 0xffb066 : dir === "B" ? 0xffffff : 0xfff3e6, dir === "A" ? 4.0 : dir === "B" ? 2.6 : 1.15);
  sol.castShadow = true;
  sol.shadow.mapSize.set(4096, 4096);
  sol.shadow.bias = dir === "C" ? -0.0003 : -0.0004;
  sol.shadow.normalBias = 0.02;
  Object.assign(sol.shadow.camera, { left: -5, bottom: -5, right: 5, top: 5, near: 0.5, far: 40 });
  const hemi = new THREE.HemisphereLight(dir === "A" ? 0x9fb4dc : dir === "B" ? 0xffffff : 0xfff6ee, dir === "A" ? 0x8a4a2a : dir === "B" ? 0x9a8a78 : 0xc9b29c, dir === "A" ? 0.55 : dir === "B" ? 1.5 : 1.15);
  const contra = new THREE.DirectionalLight(dir === "A" ? 0xffc58a : 0xfff2dd, dir === "A" ? 2.2 : dir === "B" ? 1.2 : 0.7);
  contra.position.set(2.5, 2.2, -4);
  scene.add(sol, sol.target, hemi, contra);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "A" ? 0.16 : dir === "B" ? 0.16 : 0.12, dir === "A" ? 0.55 : 0.5, dir === "A" ? 0.94 : dir === "B" ? 0.97 : 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let tiltH: ShaderPass | undefined, tiltV: ShaderPass | undefined;
  if (dir === "A") {
    tiltH = new ShaderPass(TILT); tiltH.uniforms.dir.value.set(1 / W, 0);
    tiltV = new ShaderPass(TILT); tiltV.uniforms.dir.value.set(0, 1 / H);
    composer.addPass(tiltH); composer.addPass(tiltV);
  }
  const final = new ShaderPass(FINAL);
  final.uniforms.res.value.set(W, H);
  final.uniforms.grao.value = dir === "A" ? 0.035 : dir === "C" ? 0.02 : 0.0;
  final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.3;
  final.uniforms.quente.value = dir === "A" ? 0.045 : 0.0;
  final.uniforms.sat.value = dir === "B" ? 1.08 : dir === "C" ? 1.0 : 1.08;
  composer.addPass(final);

  /** foco (A) = centro da faixa nítida (0 base .. 1 topo); forca = força do tilt (leve: 0,35) */
  const quadro = (t: number, foco = 0.45, forca = 0.85, larg = 1) => {
    if (tiltH && tiltV) {
      tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
      tiltH.uniforms.forca.value = tiltV.uniforms.forca.value = forca;
      tiltH.uniforms.larg.value = tiltV.uniforms.larg.value = larg;
    }
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, sol, solDir, hemi, contra, bloom, final, quadro };
}

// tilt-shift da maquete (ficha maquete-tiltshift): faixa nítida em volta de "centro", borrão crescendo para cima e
// para baixo; "larg" alarga a faixa (macro de peça pequena pede faixa mais larga para a peça inteira ficar nítida)
export const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 }, larg: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; uniform float larg; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.17 * larg, 0.52 * larg + 0.08, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -5; i <= 5; i++) { float k = exp(-float(i*i)/12.0); s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k; }
      gl_FragColor = s / w;
    }`,
};

export const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, escuro: { value: 0.0 }, sat: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, escuro, sat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat);
      col = (col - 0.5) * 1.07 + 0.5; // contraste leve
      col += vec3(quente, quente*0.35, -quente);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col *= 1.0 - escuro;
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
