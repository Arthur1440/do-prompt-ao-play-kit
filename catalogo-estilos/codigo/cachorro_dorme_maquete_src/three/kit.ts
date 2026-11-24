// Kit das 3 direções (fichas da skill catalogo-estilos). Material, luz e pós mudam JUNTOS:
//   A = toon 3D com contorno: MeshToon de 3 faixas (Nearest), casco em espaço de tela (~3 px), sombra dura,
//       cores chapadas saturadas, NeutralToneMapping, vinheta leve, sem grão. Noite: lua azul-arroxeada + abajur quente.
//   B = maquete de brinquedo com tilt-shift: plástico/resina Physical com verniz e microtextura, RoomEnvironment
//       (reflexo de estúdio), luz azul fria de cima, abajur e janelas quentes, bloom leve, tilt-shift com foco por plano,
//       grão, vinheta e toque quente.
//   C = massinha (clay): Standard rough ~0,9 com relevo de impressão digital calculado no shader (sem UV),
//       cantos levemente irregulares (deslocamento por ruído), cores pastel, sombra macia, luz difusa de abajur,
//       personagens a 12 fps (stop motion) com câmera lisa.
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
  const d = new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export type OpMat = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  rough?: number;
  metal?: number;
  clear?: number;
  semContorno?: boolean;
  emis?: THREE.ColorRepresentation;
  emisI?: number;
  transp?: number;
  lado?: THREE.Side;
  basico?: boolean;
  aditivo?: boolean;
  vc?: boolean; // cor por vértice
  estampa?: boolean; // mapa desenhado que as três direções mantêm
  bolinhas?: THREE.ColorRepresentation; // estampa de bolinhas calculada no shader (cortina, sem UV)
  relevo?: number; // multiplicador do relevo (B: microtextura; C: digital)
  pelo?: boolean; // pelo: relevo mais forte na massinha
  semRelevo?: boolean;
  semOndula?: boolean; // C: sem o deslocamento irregular (peças finas)
};

// ---------------------------------------------------------------------------------------------- relevo em shader
// Altura procedural pela posição de MUNDO (os modelos prontos não têm UV): impressões digitais (cristas finas
// onduladas por ruído) e mossas largas para a massinha; microtextura fina de vinil para a maquete.
const RUIDO_GLSL = /* glsl */ `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i+vec3(0,0,0)),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
  float fb3(vec3 p){ return n3(p)*0.55 + n3(p*2.1)*0.3 + n3(p*4.3)*0.15; }
`;
const RELEVO_FRAG = /* glsl */ `
  vec3 perturba(vec3 pos, vec3 n, float h){
    vec3 dpx = dFdx(pos), dpy = dFdy(pos); float hx = dFdx(h), hy = dFdy(h);
    vec3 r1 = cross(dpy, n), r2 = cross(n, dpx); float det = dot(dpx, r1);
    vec3 g = sign(det) * (hx * r1 + hy * r2);
    return normalize(abs(det) * n - g);
  }
  float alturaRel(vec3 p){
    #ifdef CLAY
      // massinha: mossas largas + digitais (cristas finas que ondulam e se espalham em manchas)
      float mossa = fb3(p * 9.0);
      float w = fb3(p * 6.0 + 3.1) * 7.0;
      float cr = sin(dot(p, vec3(0.83, 0.37, 0.52)) * 340.0 + w * 6.2832);
      float mancha = smoothstep(0.45, 0.75, fb3(p * 4.0 + 7.7));
      return mossa * 0.00045 + cr * 0.000008 * mancha;
    #else
      // vinil fosco: grão fino
      return fb3(p * 300.0) * 0.00003;
    #endif
  }
`;

function injetaRelevo(m: THREE.Material, dir: Dir, o: OpMat, extraKey: string) {
  const clay = dir === "C";
  const amp = (o.relevo ?? 1) * (o.pelo && clay ? 1.6 : 1);
  const ondula = clay && !o.semOndula ? 0.0045 : 0.0;
  const bol = o.bolinhas !== undefined ? new THREE.Color(o.bolinhas) : null;
  m.onBeforeCompile = (s) => {
    s.uniforms.uAmp = { value: o.semRelevo ? 0 : amp };
    s.uniforms.uOnd = { value: ondula };
    s.uniforms.uBol = { value: bol ?? new THREE.Color(0) };
    s.uniforms.uTemBol = { value: bol ? 1 : 0 };
    const def = (clay ? "#define CLAY\n" : "") + "varying vec3 vMundo;\nvarying vec3 vObj;\nuniform float uAmp; uniform float uOnd; uniform vec3 uBol; uniform float uTemBol;\n" + RUIDO_GLSL;
    s.vertexShader = def + s.vertexShader.replace(
      "#include <project_vertex>",
      /* glsl */ `
      vObj = transformed;
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
      #endif
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wpos = modelMatrix * mvPosition;
      if (uOnd > 0.0) {
        vec3 wn = normalize(mat3(modelMatrix) * objectNormal);
        wpos.xyz += wn * (fb3(wpos.xyz * 7.0) - 0.5) * uOnd;
      }
      vMundo = wpos.xyz;
      mvPosition = viewMatrix * wpos;
      gl_Position = projectionMatrix * mvPosition;`,
    );
    s.fragmentShader = def + RELEVO_FRAG + s.fragmentShader
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        if (uTemBol > 0.5) {
          // bolinhas em grade diagonal, no espaço do objeto (acompanham o pano)
          vec3 q = vObj * 9.0;
          vec2 g = vec2(q.x + q.z, q.y);
          vec2 c = fract(g) - 0.5; vec2 c2 = fract(g + 0.5) - 0.5;
          float d = min(length(c), length(c2) * 1.4);
          diffuseColor.rgb = mix(diffuseColor.rgb, uBol, 1.0 - smoothstep(0.15, 0.19, d));
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        if (uAmp > 0.0) normal = perturba(-vViewPosition, normal, alturaRel(vMundo) * uAmp * 60.0);`,
      );
  };
  m.customProgramCacheKey = () => `rel${dir}${o.semRelevo ? 0 : amp}${ondula}${bol ? 1 : 0}${extraKey}`;
}

export class Kit {
  grad = gradToon();
  constructor(public dir: Dir, public W: number, public H: number) {}

  /** cor final por direção: C puxa para o pastel */
  cor(c: THREE.ColorRepresentation) {
    const k = new THREE.Color(c);
    if (this.dir === "C") {
      const hsl = { h: 0, s: 0, l: 0 };
      k.getHSL(hsl);
      k.setHSL(hsl.h, hsl.s * 0.72, Math.min(0.9, hsl.l * 0.82 + 0.16));
    }
    return k;
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const emis = new THREE.Color(o.emis ?? 0x000000);
    const d = this.dir;
    const cor0 = o.vc ? new THREE.Color(0xffffff) : this.cor(o.color ?? 0xffffff);
    const mapa = o.estampa ? o.map ?? null : null;
    if (o.basico || o.aditivo) {
      m = new THREE.MeshBasicMaterial({ color: o.vc ? 0xffffff : new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, toneMapped: false });
      if (o.aditivo) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
    } else if (d === "A") {
      const tm = new THREE.MeshToonMaterial({ color: cor0, map: mapa, gradientMap: this.grad, emissive: emis, emissiveIntensity: o.emisI ?? 1 });
      if ((o.metal ?? 0) > 0.5) tm.emissive = cor0.clone().multiplyScalar(0.15);
      if (o.bolinhas !== undefined) injetaRelevo(tm, d, { ...o, semRelevo: true }, "toon");
      m = tm;
    } else if (d === "B") {
      const metal = o.metal ?? 0;
      const pm = new THREE.MeshPhysicalMaterial({
        color: cor0, map: mapa, roughness: Math.min(0.75, o.rough ?? 0.5), metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        emissive: emis, emissiveIntensity: o.emisI ?? 1,
      });
      if (!o.semRelevo) injetaRelevo(pm, d, o, "phys");
      m = pm;
    } else {
      const sm = new THREE.MeshStandardMaterial({
        color: cor0, map: mapa, roughness: (o.metal ?? 0) > 0.5 ? 0.55 : 0.9, metalness: (o.metal ?? 0) > 0.5 ? 0.2 : 0,
        emissive: emis, emissiveIntensity: o.emisI ?? 1,
      });
      injetaRelevo(sm, d, o, "clay");
      m = sm;
    }
    if (o.vc) (m as THREE.MeshStandardMaterial).vertexColors = true;
    if (o.transp !== undefined) { m.transparent = true; (m as THREE.MeshStandardMaterial).opacity = o.transp; m.depthWrite = false; }
    if (o.lado !== undefined) m.side = o.lado;
    m.userData.semContorno = !!o.semContorno || !!o.basico || !!o.aditivo;
    return m;
  }

  /** contorno escuro em espaço de tela (só A). Funciona em Mesh, InstancedMesh e SkinnedMesh (chame depois do bind). */
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir !== "A") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const pele = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color("#140c18") } },
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

  /** malha com sombra e contorno (A) */
  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3, pai?: THREE.Object3D, pos?: V3, rot?: V3, esc?: V3 | number) {
    const me = new THREE.Mesh(geo, mat);
    const basico = (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    me.castShadow = me.receiveShadow = !basico;
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
export const cil = (rt: number, rb: number, h: number, s = 32, aberto = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, aberto);
export const caixa = (x: number, y: number, z: number, r = 0.02) => (r > 0 ? new RoundedBoxGeometry(x, y, z, 3, Math.min(r, x / 2.01, y / 2.01, z / 2.01)) : new THREE.BoxGeometry(x, y, z));
export const tubo = (pts: V3[], r: number, seg = 32, rad = 12) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, rad, false);
export const junta = (gs: THREE.BufferGeometry[]) => {
  const n = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  n.forEach((g) => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(n, false)!;
};

// ---------------------------------------------------------------------------------------------- renderizador
export function montaMundo(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = dir === "A" ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = dir === "A" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dir === "A" ? 1.12 : dir === "B" ? 0.95 : 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 400);

  const pm = new THREE.PMREMGenerator(renderer);
  if (dir === "B") { scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.32; }
  if (dir === "C") { scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.05; }

  // LUA: direcional azul-arroxeada que entra pela janela (B: luz fria de estúdio vinda de cima)
  const lua = new THREE.DirectionalLight(dir === "A" ? 0x8f8cff : dir === "B" ? 0x7f9cff : 0xa9a4f0, dir === "A" ? 1.9 : dir === "B" ? 2.2 : 1.7);
  lua.castShadow = true;
  lua.shadow.mapSize.set(dir === "C" ? 1024 : 4096, dir === "C" ? 1024 : 4096);
  lua.shadow.bias = -0.0004;
  lua.shadow.normalBias = 0.02;
  if (dir === "C") lua.shadow.radius = 6;
  Object.assign(lua.shadow.camera, { left: -7, bottom: -7, right: 7, top: 7, near: 0.5, far: 60 });
  // céu noturno: hemisfério frio por cima e quente-escuro por baixo
  const hemi = new THREE.HemisphereLight(dir === "A" ? 0x6c6fd0 : dir === "B" ? 0x5b6cb8 : 0x9b95d8, dir === "A" ? 0x3a2440 : dir === "B" ? 0x3a2a24 : 0x6a5060, dir === "A" ? 2.3 : dir === "B" ? 0.75 : 1.7);
  // ABAJUR: ponto quente com sombra (a fonte da sombra grande na parede)
  const abajur = new THREE.PointLight(0xffa64d, dir === "A" ? 4.2 : dir === "B" ? 4.5 : 5.0, 0, 2);
  abajur.castShadow = true;
  abajur.shadow.mapSize.set(dir === "C" ? 1024 : 2048, dir === "C" ? 1024 : 2048);
  abajur.shadow.bias = -0.002;
  abajur.shadow.normalBias = 0.02;
  abajur.shadow.camera.near = 0.05;
  if (dir === "C") abajur.shadow.radius = 8;
  // preenchimento de recorte (contraluz fria que separa o personagem do fundo)
  const contra = new THREE.DirectionalLight(0xb8c4ff, dir === "A" ? 0.0 : dir === "B" ? 0.5 : 0.45);
  contra.position.set(3, 4, 5);
  // luz do dia (laboratório)
  const dia = new THREE.DirectionalLight(0xfff6ea, 0);
  dia.castShadow = true;
  dia.shadow.mapSize.set(2048, 2048);
  dia.shadow.bias = -0.0004;
  dia.shadow.normalBias = 0.02;
  if (dir === "C") dia.shadow.radius = 6;
  Object.assign(dia.shadow.camera, { left: -5, bottom: -5, right: 5, top: 5, near: 0.5, far: 40 });
  scene.add(lua, lua.target, hemi, abajur, contra, dia, dia.target);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "A" ? 0.35 : dir === "B" ? 0.3 : 0.45, dir === "A" ? 0.45 : 0.6, dir === "A" ? 0.92 : 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let tiltH: ShaderPass | undefined, tiltV: ShaderPass | undefined;
  if (dir === "B") {
    tiltH = new ShaderPass(TILT); tiltH.uniforms.dir.value.set(1 / W, 0);
    tiltV = new ShaderPass(TILT); tiltV.uniforms.dir.value.set(0, 1 / H);
    composer.addPass(tiltH); composer.addPass(tiltV);
  }
  const final = new ShaderPass(FINAL);
  final.uniforms.res.value.set(W, H);
  final.uniforms.grao.value = dir === "B" ? 0.035 : dir === "C" ? 0.012 : 0.0;
  final.uniforms.vinheta.value = dir === "B" ? 0.45 : dir === "C" ? 0.3 : 0.2;
  final.uniforms.quente.value = dir === "B" ? 0.02 : dir === "C" ? 0.015 : 0.0;
  final.uniforms.sat.value = dir === "A" ? 1.12 : dir === "C" ? 0.98 : 1.05;
  composer.addPass(final);

  /** foco (B) = centro da faixa nítida (0 base .. 1 topo); forca = força do tilt; larg = largura da faixa */
  const quadro = (t: number, foco = 0.45, forca = 0.85, larg = 1) => {
    if (tiltH && tiltV) {
      tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
      tiltH.uniforms.forca.value = tiltV.uniforms.forca.value = forca;
      tiltH.uniforms.larg.value = tiltV.uniforms.larg.value = larg;
    }
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, lua, hemi, abajur, contra, dia, bloom, final, quadro, pm };
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
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, escuro: { value: 0.0 }, sat: { value: 1 },
    branco: { value: 0 }, dessat: { value: 0 }, frio: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, escuro, sat, branco, dessat, frio; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat * (1.0 - dessat));
      col = (col - 0.5) * 1.05 + 0.5;
      col += vec3(quente, quente*0.35, -quente);
      col += vec3(-frio*0.6, -frio*0.15, frio);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col *= 1.0 - escuro;
      col += (h(vUv*res) - 0.5) * grao;
      col = mix(col, vec3(1.0), branco);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
