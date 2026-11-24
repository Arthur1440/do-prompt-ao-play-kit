// Kit das 3 direções (ficha catalogo-estilos). Material, luz e pós mudam JUNTOS:
//   A = maquete de brinquedo: plástico/resina Physical com verniz e bump fino, RoomEnvironment (reflexo de estúdio),
//       sol quente e baixo de fim de tarde, bloom leve, tilt-shift com foco por plano, grão, vinheta, toque quente.
//   B = toon 3D com contorno: MeshToon de 3 faixas (Nearest), casco em espaço de tela (3 px), sol forte quase branco,
//       hemisfério neutro, SEM environment, NeutralToneMapping, vinheta leve, sem grão.
//   C = gibi de banca (HQ): cor chapada + retícula de pontos (Ben-Day) na sombra calculada por pixel na tela,
//       sombra-núcleo em tinta, nanquim grosso (4,5 px), papel com fibra e moldura de quadrinho.
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
  const d = new Uint8Array([88, 88, 88, 255, 178, 178, 178, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export function lcg(seed: number) {
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

const h2 = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, y: number, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; };

export type OpMat = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  rough?: number;
  metal?: number;
  clear?: number;
  bump?: THREE.Texture | null;
  bumpS?: number;
  semContorno?: boolean;
  liso?: boolean;
  emis?: THREE.ColorRepresentation;
  emisI?: number;
  transp?: number;
  lado?: THREE.Side;
  basico?: boolean;
  aditivo?: boolean;
  vc?: boolean; // cor por vértice (bichos)
  estampa?: boolean; // mapa desenhado que o toon e o gibi mantêm
  chapada?: THREE.ColorRepresentation; // cor no lugar do mapa fotográfico (B e C)
  brilho?: number; // C: quanto o realce claro aparece (0..1)
  espec?: number; // A: intensidade do especular (pelo fosco)
};

// retícula do gibi: injetada no Lambert. luz = irradiância relativa (1 = sol de frente)
const GIBI_FRAG = /* glsl */ `
  float lumL = dot(outgoingLight - totalEmissiveRadiance, vec3(0.299,0.587,0.114));
  float lumB = max(dot(diffuseColor.rgb, vec3(0.299,0.587,0.114)), 0.025);
  float luz = clamp(lumL / (lumB * uRef), 0.0, 3.0);
  vec2 q = mat2(0.7071,-0.7071,0.7071,0.7071) * gl_FragCoord.xy / uCel;
  float dd = length(fract(q) - 0.5);
  float som = 1.0 - smoothstep(0.42, 0.92, luz);
  float raio = 0.66 * sqrt(som);
  float ponto = 1.0 - smoothstep(raio - 0.07, raio + 0.07, dd);
  vec3 base = diffuseColor.rgb;
  vec3 tinta = mix(base * 0.28, vec3(0.05, 0.045, 0.07), 0.55);
  vec3 col = mix(base, tinta, ponto * 0.92);
  col = mix(col, tinta * 0.85, smoothstep(0.2, 0.12, luz)); // sombra-núcleo chapada
  col = mix(col, base + (1.0 - base) * 0.32, smoothstep(1.32, 1.42, luz) * uBrilho); // realce
  outgoingLight = col + totalEmissiveRadiance;
  #include <opaque_fragment>`;

export class Kit {
  grad = gradToon();
  ruido = texRuidoFino();
  constructor(public dir: Dir, public W: number, public H: number) {}

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const emis = new THREE.Color(o.emis ?? 0x000000);
    const d = this.dir;
    const semMapa = d !== "A" && !!o.map && !o.estampa;
    const cor0 = o.vc ? 0xffffff : semMapa ? o.chapada ?? o.color ?? 0xffffff : o.color ?? 0xffffff;
    const mapa = semMapa ? null : o.map ?? null;
    if (o.basico || o.aditivo) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(cor0), map: mapa, toneMapped: false });
      if (o.aditivo) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
    } else if (d === "B") {
      const c = new THREE.Color(cor0);
      const tm = new THREE.MeshToonMaterial({ color: c, map: mapa, gradientMap: this.grad, emissive: emis, emissiveIntensity: o.emisI ?? 1 });
      if ((o.metal ?? 0) > 0.5) tm.emissive = c.clone().multiplyScalar(0.18);
      m = tm;
    } else if (d === "C") {
      const lm = new THREE.MeshLambertMaterial({ color: new THREE.Color(cor0), map: mapa, emissive: emis, emissiveIntensity: o.emisI ?? 1 });
      const brilho = o.brilho ?? ((o.metal ?? 0) > 0.5 ? 1 : 0.7);
      lm.onBeforeCompile = (s) => {
        s.uniforms.uCel = { value: 8.5 };
        s.uniforms.uRef = { value: 2.6 };
        s.uniforms.uBrilho = { value: brilho };
        s.fragmentShader = "uniform float uCel; uniform float uRef; uniform float uBrilho;\n" + s.fragmentShader.replace("#include <opaque_fragment>", GIBI_FRAG);
      };
      lm.customProgramCacheKey = () => "gibi" + brilho;
      m = lm;
    } else {
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: cor0, map: mapa, roughness: Math.min(0.7, o.rough ?? 0.5), metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.35), clearcoatRoughness: 0.35,
        bumpMap: o.liso ? null : o.bump ?? this.ruido, bumpScale: o.bump ? o.bumpS ?? 1 : 0.15,
        emissive: emis, emissiveIntensity: o.emisI ?? 1, specularIntensity: o.espec ?? 1,
      });
      if (o.espec !== undefined) (m as THREE.MeshPhysicalMaterial).roughness = 0.9;
    }
    if (o.vc) (m as THREE.MeshStandardMaterial).vertexColors = true;
    if (o.transp !== undefined) { m.transparent = true; (m as THREE.MeshStandardMaterial).opacity = o.transp; m.depthWrite = false; }
    if (o.lado !== undefined) m.side = o.lado;
    m.userData.semContorno = !!o.semContorno || !!o.basico || !!o.aditivo;
    if (o.aditivo) m.userData.semProf = true;
    return m;
  }

  pxContorno(px: number) {
    return this.dir === "C" ? px * 1.5 : px;
  }
  corContorno() {
    return this.dir === "C" ? "#0b0909" : "#1a0f0c";
  }

  /** contorno escuro em espaço de tela (B e C). Funciona em Mesh, InstancedMesh e SkinnedMesh (chame depois do bind). */
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir === "A") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const pele = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: this.pxContorno(px) }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color(this.corContorno()) } },
      vertexShader: /* glsl */ `
        uniform float px; uniform vec2 res;
        #include <common>
        #include <skinning_pars_vertex>
        #include <clipping_planes_pars_vertex>
        void main(){
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          vec4 p = vec4(transformed,1.0); vec3 n = objectNormal;
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
    let o: THREE.Mesh;
    if (pele) {
      const sk = mesh as THREE.SkinnedMesh;
      const s = new THREE.SkinnedMesh(sk.geometry, mat);
      s.bind(sk.skeleton, sk.bindMatrix);
      s.bindMode = sk.bindMode;
      o = s;
    } else if (mesh instanceof THREE.InstancedMesh) {
      const im = new THREE.InstancedMesh(mesh.geometry, mat, mesh.count);
      im.instanceMatrix = mesh.instanceMatrix;
      o = im;
    } else o = new THREE.Mesh(mesh.geometry, mat);
    o.userData.contorno = true;
    o.frustumCulled = false;
    o.castShadow = o.receiveShadow = false;
    if (pele) mesh.parent!.add(o);
    else mesh.add(o);
    mesh.userData.casco = o;
    return o;
  }

  /** malha com sombra e contorno (B/C) */
  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3, pai?: THREE.Object3D, pos?: V3, rot?: V3, esc?: V3 | number) {
    const me = new THREE.Mesh(geo, mat);
    const basico = (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    me.castShadow = me.receiveShadow = !basico;
    if (mat.userData.semProf) me.userData.semProf = true;
    if (pos) me.position.set(...pos);
    if (rot) me.rotation.set(...rot);
    if (esc !== undefined) typeof esc === "number" ? me.scale.setScalar(esc) : me.scale.set(...esc);
    if (px > 0) this.contorno(me, px);
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
  const p = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
  const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg, phiS, phiL);
  g.computeVertexNormals();
  return g;
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = dir === "A" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.toneMapping = dir === "A" ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = dir === "A" ? 0.95 : 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 400);

  // fim de tarde nas três (a história é "seis da tarde"): A quente e baixo, B sol forte quase branco, C laranja de gibi
  const solDir = new THREE.Vector3(-3.0, dir === "A" ? 1.25 : 1.9, -1.6);
  const pm = new THREE.PMREMGenerator(renderer);
  if (dir === "A") { scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42; }

  const sol = new THREE.DirectionalLight(dir === "A" ? 0xffa45c : dir === "B" ? 0xfff1dc : 0xfff0d8, dir === "A" ? 4.2 : dir === "B" ? 2.7 : 2.9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(4096, 4096);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.02;
  Object.assign(sol.shadow.camera, { left: -6, bottom: -6, right: 6, top: 6, near: 0.5, far: 60 });
  const hemi = new THREE.HemisphereLight(dir === "A" ? 0x8fa6d8 : dir === "B" ? 0xdfe8ff : 0xffffff, dir === "A" ? 0x7a4a30 : dir === "B" ? 0x8a7a70 : 0xb0a090, dir === "A" ? 0.6 : dir === "B" ? 1.35 : 1.45);
  const contra = new THREE.DirectionalLight(dir === "A" ? 0x9ab8ff : 0xcfe0ff, dir === "A" ? 0.9 : dir === "B" ? 0.9 : 0.5);
  contra.position.set(3, 2.5, 4);
  scene.add(sol, sol.target, hemi, contra);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "A" ? 0.22 : dir === "B" ? 0.14 : 0.08, dir === "A" ? 0.6 : 0.45, dir === "A" ? 0.9 : 0.96);
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
  final.uniforms.grao.value = dir === "A" ? 0.035 : 0.0;
  final.uniforms.vinheta.value = dir === "A" ? 0.42 : dir === "B" ? 0.16 : 0.0;
  final.uniforms.quente.value = dir === "A" ? 0.03 : 0.0;
  final.uniforms.sat.value = dir === "B" ? 1.1 : dir === "C" ? 1.04 : 1.06;
  final.uniforms.papel.value = dir === "C" ? 1 : 0;
  composer.addPass(final);

  /** foco (A) = centro da faixa nítida (0 base .. 1 topo); forca = força do tilt; larg = largura da faixa */
  const quadro = (t: number, foco = 0.45, forca = 0.85, larg = 1) => {
    if (tiltH && tiltV) {
      tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
      tiltH.uniforms.forca.value = tiltV.uniforms.forca.value = forca;
      tiltH.uniforms.larg.value = tiltV.uniforms.larg.value = larg;
    }
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, sol, solDir, hemi, contra, bloom, final, quadro, pm };
}

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
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, escuro: { value: 0.0 }, sat: { value: 1 }, papel: { value: 0 },
    branco: { value: 0 }, dessat: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, escuro, sat, papel, branco, dessat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    float hs(vec2 p){ return fract(sin(dot(p, vec2(41.31,289.17)))*24634.6345); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hs(i),hs(i+vec2(1,0)),f.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x), f.y); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat * (1.0 - dessat));
      col = (col - 0.5) * 1.06 + 0.5;
      col += vec3(quente, quente*0.35, -quente);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col *= 1.0 - escuro;
      col += (h(vUv*res) - 0.5) * grao;
      if (papel > 0.5) {
        // papel de gibi: fibra + leve amarelado nos claros + moldura de quadro
        vec2 px = vUv * res;
        float fib = vn(px * vec2(0.9, 0.08)) * 0.5 + vn(px * vec2(0.07, 0.6)) * 0.5;
        col *= 0.955 + 0.06 * fib;
        col = mix(col, col * vec3(1.0, 0.975, 0.91), smoothstep(0.55, 1.0, l));
        float m = min(min(px.x, res.x - px.x), min(px.y, res.y - px.y));
        vec3 papelC = vec3(0.96, 0.93, 0.85) * (0.97 + 0.04 * fib);
        col = m < 22.0 ? papelC : (m < 30.0 ? vec3(0.05) : col);
      }
      col = mix(col, vec3(1.0), branco);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
