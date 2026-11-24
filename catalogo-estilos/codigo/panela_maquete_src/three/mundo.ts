import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cil, Dir, esfera, Kit, V3 } from "./kit";
import { clamp, fbm, lerp, rng } from "./rng";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** chumaço de algodão: icosaedro amassado por ruído (vapor da maquete) */
function algodao(seed: number) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(0.5, 4));
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 2.4 + seed * 3.1, v.y * 2.4 + v.z * 1.9 - seed, 4);
    const lobo = 0.18 * Math.sin(v.x * 7 + seed) * Math.sin(v.y * 6 - seed) * Math.sin(v.z * 5 + seed * 2);
    v.multiplyScalar(0.78 + (n - 0.5) * 0.7 + lobo);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
import { texAzulejo, texEstudio, texFundoToon, texMadeira, texPonto, texQuarto, texVapor } from "./tex";
import { AGUA, H, montaPanela, Panela, posEspuma, P_FECH, P_JAN, P_SEG, P_TRAB, R, yTampa } from "./panela";

export type Vapor = { beirada?: number; trab?: number; seg?: number; jan?: number; interno?: number; aberta?: number; gancho?: number };
export type Estado = {
  cam: { pos: V3; alvo: V3; fov: number; rolo?: number };
  foco?: number; // tilt-shift (A): 0 = base da tela, 1 = topo
  corte: number; // 0 = inteira, 1 = metade cortada
  rot?: number; // giro da panela em Y
  fogo: number;
  ferv?: number; // bolhas na água
  espuma?: number;
  vapor: Vapor;
  tampa: { pos: number; giro?: number; tremor?: number; estufa?: number }; // pos 0 = fechada, 1 = fora (aberta)
  pecas: { anel: number; peso: number; seg: number; jan: number; fech: number };
  peso?: { sobe: number; giro: number };
  pino?: number;
  pinoFech?: number;
  lingua?: number;
  cadeado?: number;
  entupido?: { trab: number; seg: number };
  marcas?: { trab: number; seg: number; jan: number; fech: number };
  brilhoAnel?: number;
  mao?: { k: number; giro: number }; // mão tentando abrir (k = presença)
  wire?: number;
  part?: number;
  furo?: number; // o furinho aparece (antes do peso)
  pesoCai?: number; // o peso cai do alto e quica (0..1)
  tFix?: number; // congela o tempo da cena 3D (virada)
  congelado?: number;
};

const LARANJA = new THREE.Color("#FF6B2C");
const TINTA = new THREE.Color("#0B1026");

// ---------------------------------------------------------------------------- pós
const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.17, 0.52, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) { float k = exp(-float(i*i)/24.0); s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k; }
      gl_FragColor = s / w;
    }`,
};
const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, contraste: { value: 1.0 }, sat: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, contraste, sat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat);
      col = (col - 0.5) * contraste + 0.5;
      col += vec3(quente, quente*0.35, -quente);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

type Emissor = { spr: THREE.Object3D[]; mat: (THREE.Material & { rotation?: number })[] };

export class Mundo {
  dir: Dir;
  kit: Kit;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  bokeh?: BokehPass;
  tiltH?: ShaderPass;
  tiltV?: ShaderPass;
  final: ShaderPass;
  sol: THREE.DirectionalLight;
  p: Panela;
  pan = new THREE.Group(); // panela (gira)
  chamas: THREE.Mesh[] = [];
  vapores: Record<string, Emissor> = {};
  texV: THREE.Texture[];
  fundo: THREE.Object3D[] = [];
  wireMat: THREE.MeshBasicMaterial;
  invis!: THREE.MeshBasicMaterial;
  invisCorte!: THREE.MeshBasicMaterial;
  linha!: THREE.LineBasicMaterial;
  linhaCorte!: THREE.LineBasicMaterial;
  wireAtivo = false;
  originais = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  part!: THREE.Points;
  partBase!: Float32Array;
  bgOrig: THREE.Color | THREE.Texture | null = null;
  plugs: THREE.Mesh[] = [];
  mao!: THREE.Group;

  constructor(canvas: HTMLCanvasElement, dir: Dir, W: number, H_: number) {
    this.dir = dir;
    const A = dir === "A", B = dir === "B", C = dir === "C";
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H_, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = C ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = B ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = C ? 0.9 : 1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.localClippingEnabled = true;
    this.renderer = r;
    this.kit = new Kit(dir, W, H_);
    this.camera = new THREE.PerspectiveCamera(30, W / H_, 0.05, 400);

    if (A) {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.45;
    } else if (C) {
      // estúdio de comercial: sala preta com softboxes (reflexos longos no alumínio)
      const est = new THREE.Scene();
      est.background = new THREE.Color(0x020202);
      const caixa = (w: number, h: number, cor: THREE.ColorRepresentation, k: number, pos: V3, rot: V3) => {
        const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(k), side: THREE.DoubleSide }));
        me.position.set(...pos);
        me.rotation.set(...rot);
        est.add(me);
      };
      caixa(7, 2.2, 0xffffff, 2.2, [0, 6, 0.5], [Math.PI / 2, 0, 0]); // teto
      caixa(1.1, 6, 0xffd9b0, 3.0, [-5, 1.5, 2], [0, Math.PI / 2.6, 0]); // faixa quente à esquerda
      caixa(0.8, 6, 0xcfe2ff, 2.2, [5, 1.5, -1], [0, -Math.PI / 2.4, 0]); // faixa fria à direita
      caixa(5, 0.5, 0xffb070, 1.2, [0, -0.5, -5], [0, 0, 0]); // contraluz baixa
      caixa(9, 5, 0xfff4e8, 0.55, [0, 2, 7], [0, Math.PI, 0]); // rebatedor grande na frente (atrás da câmera)
      const sala = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a2522).multiplyScalar(0.5), side: THREE.BackSide }));
      est.add(sala);
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(est, 0.02).texture;
      this.scene.environmentIntensity = 1.0;
    }

    // luz
    this.sol = new THREE.DirectionalLight(A ? 0xffcf9a : C ? 0xffe2c0 : 0xffffff, A ? 3.4 : C ? 1.3 : 2.6);
    this.sol.position.set(A ? 6 : 5, A ? 6 : 9, A ? 5 : 7);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.02;
    if (C) this.sol.shadow.radius = 8;
    Object.assign(this.sol.shadow.camera, { left: -5, bottom: -5, right: 5, top: 5, near: 0.5, far: 40 });
    const hemi = new THREE.HemisphereLight(A ? 0xcfe0ff : B ? 0xffffff : 0x8090b0, A ? 0x8a5a3a : B ? 0x99887a : 0x1a1410, A ? 0.9 : B ? 1.5 : 0.25);
    const contra = new THREE.DirectionalLight(A ? 0xffe2b8 : C ? 0x9cc4ff : 0xfff2dd, A ? 1.6 : C ? 2.2 : 1.4);
    contra.position.set(-5, 4, -6);
    this.scene.add(this.sol, this.sol.target, hemi, contra);
    if (C) {
      // recorte quente do outro lado + luz baixa que pega o vapor por trás
      const rec = new THREE.DirectionalLight(0xffb070, 1.8);
      rec.position.set(6, 2.5, -5);
      const baixa = new THREE.PointLight(0x6fa8ff, 2.5, 4, 1.5);
      baixa.position.set(0, -0.15, 0);
      this.scene.add(rec, baixa);
    }

    this.texV = [texVapor(1, B), texVapor(2, B), texVapor(3, B)];
    this.montaCozinha();
    this.p = montaPanela(this.kit);
    this.pan.add(this.p.g);
    this.scene.add(this.pan);
    this.montaFogo();
    this.montaVapores();
    this.montaPlugs();
    this.montaMao();
    this.wireMat = new THREE.MeshBasicMaterial({ color: LARANJA, wireframe: true, transparent: true, opacity: 0.55, depthWrite: false });
    this.invis = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.invisCorte = new THREE.MeshBasicMaterial({ colorWrite: false, clippingPlanes: [this.kit.plano], side: THREE.DoubleSide });
    const cl = LARANJA.clone().multiplyScalar(1.7);
    this.linha = new THREE.LineBasicMaterial({ color: cl, toneMapped: false });
    this.linhaCorte = new THREE.LineBasicMaterial({ color: cl, toneMapped: false, clippingPlanes: [this.kit.plano] });

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H_, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H_);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (C) {
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 8, aperture: 0.0016, maxblur: 0.008 });
      this.composer.addPass(this.bokeh);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H_ / 2), A ? 0.22 : B ? 0.25 : 0.3, A ? 0.6 : B ? 0.25 : 0.5, A ? 0.9 : B ? 0.97 : 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    if (A) {
      this.tiltH = new ShaderPass(TILT);
      this.tiltH.uniforms.dir.value.set(1 / W, 0);
      this.tiltV = new ShaderPass(TILT);
      this.tiltV.uniforms.dir.value.set(0, 1 / H_);
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }
    this.final = new ShaderPass(FINAL);
    const u = this.final.uniforms;
    u.res.value.set(W, H_);
    if (A) (u.grao.value = 0.035), (u.vinheta.value = 0.45), (u.quente.value = 0.025);
    if (B) (u.grao.value = 0), (u.vinheta.value = 0.18);
    if (C) (u.grao.value = 0.022), (u.vinheta.value = 0.5), (u.contraste.value = 1.06), (u.quente.value = 0.01);
    this.composer.addPass(this.final);
    this.montaParticulas();
  }

  // --------------------------------------------------------------- cozinha
  montaCozinha() {
    const k = this.kit, d = this.dir;
    const A = d === "A", B = d === "B", C = d === "C";
    const add = (o: THREE.Object3D) => (this.scene.add(o), this.fundo.push(o), o);
    // fogão: tampo em y = -0.32, grelha até y = 0
    const yT = -0.32;
    const hF = A ? 1.05 : 1.7;
    const corFog = A ? 0xf1ece2 : B ? 0x3d6fd6 : 0x0d0d0f;
    const fog = k.m(new RoundedBoxGeometry(4.2, hF, 3.0, 4, A ? 0.14 : 0.08), k.mat({ color: corFog, rough: A ? 0.5 : B ? 1 : 0.12, clear: C ? 1 : undefined }), 3, undefined, [0, yT - hF / 2, -0.3]);
    add(fog);
    if (C) {
      // moldura inox
      const inox = k.mat({ color: 0xc9cbcf, metal: 1, rough: 0.22, escovado: true });
      add(k.m(new THREE.BoxGeometry(4.24, 0.05, 3.04), inox, 0, undefined, [0, yT - 0.03, -0.3]));
      add(k.m(new THREE.BoxGeometry(4.0, 0.02, 2.8), k.mat({ color: 0x050506, rough: 0.05, clear: 1 }), 0, undefined, [0, yT + 0.005, -0.3]));
    }
    // botões na frente
    for (let i = 0; i < 4; i++) {
      const x = -1.35 + i * 0.9;
      add(k.m(cil(0.11, 0.12, 0.1, 32), k.mat({ color: A ? 0x2d2d33 : B ? 0xfff3e0 : 0xb9bcc2, metal: C ? 1 : 0, rough: 0.35 }), 2, undefined, [x, yT - hF * 0.32, 1.22], [Math.PI / 2, 0, 0]));
    }
    // queimador + grelha
    const ferro = k.mat({ color: A ? 0x2a2a2e : B ? 0x2b2b33 : 0x1c1c1f, rough: C ? 0.55 : 0.6, metal: C ? 0.4 : 0 });
    add(k.m(cil(0.46, 0.5, 0.08, 48), ferro, 2, undefined, [0, yT + 0.04, 0]));
    add(k.m(cil(0.33, 0.36, 0.1, 48), k.mat({ color: A ? 0x1b1b1e : B ? 0x3a3a44 : 0x101012, rough: 0.5, metal: C ? 0.6 : 0 }), 2, undefined, [0, yT + 0.12, 0]));
    const grel = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      k.m(new RoundedBoxGeometry(1.0, 0.09, 0.09, 2, 0.03), ferro, 2.5, grel, [Math.cos(a) * 0.85, -0.05, Math.sin(a) * 0.85], [0, -a, 0]);
      k.m(new THREE.BoxGeometry(0.09, 0.27, 0.09), ferro, 2.5, grel, [Math.cos(a) * 1.32, -0.18, Math.sin(a) * 1.32]);
    }
    k.m(new THREE.TorusGeometry(1.32, 0.045, 10, 64), ferro, 2, grel, [0, -0.05, 0], [Math.PI / 2, 0, 0]);
    add(grel);
    // outras bocas (só a borda)
    for (const [x, z] of [[-1.5, -1.35], [1.5, -1.35]] as [number, number][]) add(k.m(cil(0.38, 0.4, 0.06, 40), ferro, 2, undefined, [x, yT + 0.03, z]));

    if (A) {
      // tábua com corte lateral + mesa de madeira + parede de azulejo de brinquedo + quarto ao fundo
      const tab = k.m(new RoundedBoxGeometry(6.2, 0.22, 4.6, 3, 0.06), k.mat({ color: 0xffffff, map: texMadeira(false, false), rough: 0.6 }), 0, undefined, [0, yT - hF - 0.11, 0]);
      add(tab);
      const mt = texMadeira(true);
      mt.repeat.set(3, 3);
      add(k.m(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), k.mat({ color: 0xffffff, map: mt, rough: 0.55, clear: 0.3 }), 0, undefined, [0, yT - hF - 0.22, 0]));
      const az = texAzulejo("A");
      az.repeat.set(3, 2);
      add(k.m(new RoundedBoxGeometry(6.2, 4.2, 0.18, 3, 0.05), k.mat({ color: 0xffffff, map: az, rough: 0.45 }), 0, undefined, [0, yT - hF + 2.1, -2.2]));
      // prateleira com potes
      const prat = k.mat({ color: 0xd9b48a, rough: 0.6 });
      add(k.m(new RoundedBoxGeometry(3.4, 0.08, 0.5, 2, 0.03), prat, 0, undefined, [0.9, 2.4, -1.85]));
      const cores = [0xe25b45, 0xf2b84b, 0x6aa86b];
      cores.forEach((c, i) => {
        add(k.m(cil(0.22, 0.22, 0.45, 32), k.mat({ color: c, rough: 0.45 }), 0, undefined, [-0.2 + i * 0.9, 2.67, -1.85]));
        add(k.m(cil(0.235, 0.235, 0.08, 32), k.mat({ color: 0xf4efe6, rough: 0.5 }), 0, undefined, [-0.2 + i * 0.9, 2.92, -1.85]));
      });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: texQuarto(), toneMapped: true }));
      q.position.set(0, 3, -14);
      add(q);
      this.scene.background = new THREE.Color(0x2a201a);
    } else if (B) {
      // bancada e parede chapadas, céu de "tela de jogo" ao fundo
      const az = texAzulejo("B");
      az.repeat.set(4, 3);
      add(k.m(new THREE.BoxGeometry(14, 6, 0.2), k.mat({ color: 0xffffff, map: az, semContorno: true }), 0, undefined, [0, 1.6, -2.4]));
      const arm = k.mat({ color: 0x4fc3b0 });
      add(k.m(new RoundedBoxGeometry(2.6, 1.7, 2.9, 3, 0.08), arm, 3, undefined, [-3.45, yT - 0.85, -0.35]));
      add(k.m(new RoundedBoxGeometry(2.6, 1.7, 2.9, 3, 0.08), arm, 3, undefined, [3.45, yT - 0.85, -0.35]));
      add(k.m(new RoundedBoxGeometry(2.7, 0.12, 3.0, 2, 0.04), k.mat({ color: 0xfff1d6 }), 2, undefined, [-3.45, yT + 0.02, -0.35]));
      add(k.m(new RoundedBoxGeometry(2.7, 0.12, 3.0, 2, 0.04), k.mat({ color: 0xfff1d6 }), 2, undefined, [3.45, yT + 0.02, -0.35]));
      add(k.m(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), k.mat({ color: 0xf6c76a, semContorno: true }), 0, undefined, [0, yT - 1.7, 0]));
      // potes chapados na bancada
      [[-3.0, 0xe8443a], [-3.7, 0x4b7bec], [3.3, 0x7ac74f]].forEach(([x, c]) => {
        add(k.m(cil(0.25, 0.28, 0.6, 32), k.mat({ color: c as number }), 3, undefined, [x as number, yT + 0.38, -1.3]));
      });
      this.scene.background = texFundoToon();
    } else {
      // bancada de pedra escura brilhante, fundo de estúdio com bokeh
      add(k.m(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), k.mat({ color: 0x0b0b0c, rough: 0.18, clear: 1 }), 0, undefined, [0, yT - 1.7, 0]));
      add(k.m(new THREE.BoxGeometry(14, 0.12, 4), k.mat({ color: 0x17171a, rough: 0.2, clear: 1 }), 0, undefined, [0, yT - 0.06, -0.4]));
      const f = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ map: texEstudio(), toneMapped: false }));
      f.position.set(0, 3, -16);
      add(f);
      this.scene.background = new THREE.Color(0x050505);
    }
  }

  montaFogo() {
    const k = this.kit, d = this.dir;
    const N = d === "B" ? 22 : 34;
    const yC = -0.12;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let m: THREE.Material;
      if (d === "B") m = k.mat({ color: 0x3aa8ff, emissive: 0x1a5fff, ei: 0.6 });
      else if (d === "A") m = k.mat({ color: 0x5aa8ff, emissive: 0x2a7bff, ei: 1.4, rough: 0.3, transparent: true, opacity: 0.85 });
      else m = k.mat({ basico: true, color: new THREE.Color(0.25, 0.55, 1.6), aditivo: true, opacity: 0.85 });
      const g = d === "B" ? new THREE.ConeGeometry(0.075, 0.3, 10) : new THREE.ConeGeometry(0.05, 0.26, 12);
      g.translate(0, 0.1, 0);
      const rr = d === "B" ? 0.6 : 0.58;
      const ch = k.m(g, m, 2, undefined, [Math.cos(a) * rr, yC, Math.sin(a) * rr]);
      ch.rotation.set(Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75);
      ch.castShadow = false;
      ch.userData.a = a;
      this.scene.add(ch);
      this.chamas.push(ch);
      if (d === "C") {
        // miolo mais claro
        const g2 = new THREE.ConeGeometry(0.022, 0.1, 8);
        g2.translate(0, 0.05, 0);
        const c2 = new THREE.Mesh(g2, k.mat({ basico: true, color: new THREE.Color(0.7, 0.9, 2.2), aditivo: true }));
        ch.add(c2);
      }
    }
  }

  // vapor: emissores com sprites; posição é função pura de t
  montaVapores() {
    const B = this.dir === "B";
    const A = this.dir === "A";
    // maquete: vapor de algodão (chumaços 3D com luz e sombra, como nas miniaturas de verdade)
    const geoA = A ? [1, 2, 3].map((s) => algodao(s)) : [];
    const mk = (nome: string, n: number) => {
      const spr: THREE.Object3D[] = [], mat: (THREE.Material & { rotation?: number })[] = [];
      for (let i = 0; i < n; i++) {
        if (A) {
          const ma = new THREE.MeshStandardMaterial({ color: 0xfdfbf6, roughness: 1, bumpMap: this.kit.ruido, bumpScale: 0.6, transparent: true, opacity: 0, depthWrite: false });
          const me = new THREE.Mesh(geoA[i % 3], ma);
          me.renderOrder = 3;
          me.userData.semWire = true;
          me.userData.algodao = true;
          this.scene.add(me);
          spr.push(me);
          mat.push(ma);
          continue;
        }
        const m = new THREE.SpriteMaterial({
          map: this.texV[i % 3], color: B ? 0xffffff : 0xf4f6fa, transparent: true, opacity: 0, depthWrite: false,
          alphaTest: B ? 0.5 : 0, rotation: i * 1.7,
        });
        const s = new THREE.Sprite(m);
        s.renderOrder = 3;
        s.userData.semWire = true;
        this.scene.add(s);
        spr.push(s);
        mat.push(m);
      }
      this.vapores[nome] = { spr, mat };
    };
    mk("beirada", 36);
    mk("trab", 34);
    mk("seg", 22);
    mk("jan", 26);
    mk("interno", 30);
    mk("aberta", 30);
    mk("gancho", 30);
  }

  montaPlugs() {
    // espuma tampando o furinho do peso e o da válvula de segurança (por dentro, sob a tampa)
    const m = this.kit.mat({ color: this.dir === "B" ? 0xfff3dc : 0xeee0c8, rough: 0.6, corte: true });
    for (const p of [P_TRAB, P_SEG]) {
      const pl = this.kit.m(esfera(0.11, 18, 12), m, 2);
      pl.position.set(p[0], H + 0.09, p[2]);
      pl.scale.set(1, 0.6, 1);
      pl.visible = false;
      this.p.tampa.add(pl);
      this.plugs.push(pl);
    }
  }

  montaMao() {
    // mão de brinquedo genérica (sem rosto) agarrada ao cabo da tampa; é filha da tampa,
    // então o "tentar girar" leva os dois juntos enquanto o cabo do corpo fica parado
    const k = this.kit;
    const pele = k.mat({ color: this.dir === "B" ? 0xf2b48c : 0xe0a985, rough: 0.55 });
    const manga = k.mat({ color: this.dir === "B" ? 0x4b7bec : this.dir === "C" ? 0x2b3140 : 0x4f79b8, rough: 0.8 });
    const g = new THREE.Group();
    const xh = -(R + 0.85), yt = H + 0.2;
    k.m(new RoundedBoxGeometry(0.4, 0.11, 0.32, 4, 0.05), pele, 3, g, [xh, yt + 0.06, 0.02]);
    for (let i = 0; i < 4; i++) {
      const x = xh - 0.15 + i * 0.1;
      k.m(esfera(0.05, 16, 12), pele, 2, g, [x, yt + 0.04, -0.15]);
      k.m(new THREE.CapsuleGeometry(0.045, 0.1, 6, 12), pele, 2.5, g, [x, yt - 0.05, -0.17], [0.15, 0, 0]);
    }
    k.m(new THREE.CapsuleGeometry(0.05, 0.12, 6, 12), pele, 2.5, g, [xh + 0.2, yt, 0.14], [-0.5, 0, 0.6]);
    const dir = new THREE.Vector3(-0.25, 0.75, 0.6).normalize();
    const braco = k.m(new THREE.CapsuleGeometry(0.13, 0.55, 8, 16), pele, 3, g);
    braco.position.set(xh + dir.x * 0.42, yt + 0.1 + dir.y * 0.42, 0.1 + dir.z * 0.42);
    braco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const mg = k.m(new THREE.CapsuleGeometry(0.19, 0.9, 8, 16), manga, 3, g);
    mg.position.set(xh + dir.x * 1.15, yt + 0.1 + dir.y * 1.15, 0.1 + dir.z * 1.15);
    mg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.visible = false;
    g.userData.semWire = true;
    g.userData.dir = dir;
    this.mao = g;
    this.p.tampa.add(g);
  }

  montaParticulas() {
    const r = rng(99);
    const p: number[] = [];
    for (let i = 0; i < 7000; i++) {
      // pontos sobre a panela (corpo + tampa) e o fogão
      const a = r() * Math.PI * 2;
      const u = r();
      if (u < 0.55) p.push(Math.cos(a) * R, r() * H, Math.sin(a) * R);
      else if (u < 0.8) {
        const rr = Math.sqrt(r()) * (R + 0.08);
        p.push(Math.cos(a) * rr, yTampa(rr), Math.sin(a) * rr);
      } else p.push((r() - 0.5) * 4.2, -0.32, (r() - 0.5) * 3 - 0.3);
    }
    this.partBase = new Float32Array(p);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p.slice(), 3));
    this.part = new THREE.Points(g, new THREE.PointsMaterial({ color: LARANJA, size: 0.035, map: texPonto(), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.part.visible = false;
    this.part.userData.semWire = true;
    this.scene.add(this.part);
  }

  // =============================================================== por quadro
  aplica(e: Estado, t: number) {
    const c = e.cam;
    this.camera.position.set(...c.pos);
    this.camera.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
    this.camera.lookAt(...c.alvo);
    this.camera.fov = c.fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const B = this.dir === "B";
    const p = this.p;

    // corte
    this.kit.plano.constant = lerp(6, 0.0, clamp(e.corte));
    this.pan.rotation.y = e.rot ?? 0;

    // tampa: tremor, estufa, abrir, giro
    const tm = e.tampa;
    const tr = (tm.tremor ?? 0) * (B ? 0.03 : 0.018);
    const est = tm.estufa ?? 0;
    p.tampa.visible = tm.pos < 0.98;
    p.tampa.position.set(Math.sin(t * 61) * tr * 0.6, tm.pos * 2.4 + Math.abs(Math.sin(t * 47)) * tr, -tm.pos * 0.6);
    p.tampa.rotation.set(Math.sin(t * 53) * tr * 0.5 - tm.pos * 0.35, tm.giro ?? 0, Math.cos(t * 59) * tr * 0.5);
    p.tampa.scale.set(1 + est * (B ? 0.05 : 0.015), 1 + est * (B ? 0.22 : 0.06), 1 + est * (B ? 0.05 : 0.015));
    p.corpo.position.set(Math.sin(t * 43) * tr * 0.3, 0, 0);

    // peças (aparecem com um quique)
    const pop = (o: THREE.Object3D, k: number, base = 1) => {
      o.visible = k > 0.001;
      const s = k >= 1 ? 1 : k * (1 + 0.25 * Math.sin(k * Math.PI));
      o.scale.setScalar(base * Math.max(0.001, s));
    };
    const pc = e.pecas;
    p.anel.visible = pc.anel > 0.001;
    p.anel.position.y = H + 0.03 + (1 - pc.anel) * 0.9;
    const cai = e.pesoCai;
    if (cai !== undefined) {
      p.peso.visible = cai > 0.001;
      p.peso.scale.setScalar(1.4);
    } else pop(p.peso, pc.peso, 1.4);
    const fu = e.furo ?? (pc.peso > 0 || (cai ?? 0) > 0 ? 1 : 0);
    pop(p.furo, fu);
    pop(p.pino.parent!, pc.seg, 1.35);
    pop(p.pinoFech.parent!, pc.fech, 1.35);
    p.janela.visible = pc.jan > 0.01;
    p.janela.scale.set(1, Math.max(0.001, pc.jan), 1);

    // peso: sobe e gira
    const pe = e.peso ?? { sobe: 0, giro: 0 };
    p.peso.position.y = H + 0.205 + pe.sobe * 0.05 + (pe.sobe > 0.05 ? Math.abs(Math.sin(t * 38)) * 0.012 * pe.sobe : 0);
    if (cai !== undefined && cai < 1) {
      // queda com quique: desce 1,2 e quica duas vezes
      const q = cai < 0.55 ? 1 - Math.pow(cai / 0.55, 2) : Math.abs(Math.sin(((cai - 0.55) / 0.45) * Math.PI * 2)) * 0.12 * (1 - (cai - 0.55) / 0.45);
      p.peso.position.y += q * 1.2;
      if (B) p.peso.scale.set(1.4 * (1 + 0.2 * Math.max(0, 0.1 - q)), 1.4 * (1 - 0.3 * Math.max(0, 0.1 - q) + 0.15 * (cai < 0.55 ? 1 : 0)), 1.4 * (1 + 0.2 * Math.max(0, 0.1 - q)));
    }
    p.peso.rotation.set(Math.sin(t * 29) * 0.05 * pe.sobe, pe.giro, Math.cos(t * 31) * 0.05 * pe.sobe);
    if (B) p.peso.scale.y *= 1 + 0.12 * pe.sobe * Math.sin(t * 38);
    // pinos
    p.pino.position.y = 0.04 + (e.pino ?? 0) * 0.075;
    if (B) p.pino.scale.set(1 - 0.15 * (e.pino ?? 0) * Math.sin(t * 30), 1 + 0.25 * (e.pino ?? 0) * Math.sin(t * 30), 1);
    p.pinoFech.position.y = 0.02 + (e.pinoFech ?? 0) * 0.045;
    // língua do anel pela janela
    const li = e.lingua ?? 0;
    p.lingua.visible = li > 0.01;
    const dj = new THREE.Vector3(P_JAN[0], 0, P_JAN[2]).normalize();
    p.lingua.position.set(P_JAN[0] - dj.x * 0.07 + dj.x * li * 0.09, P_JAN[1], P_JAN[2] - dj.z * 0.07 + dj.z * li * 0.09);
    // cadeado
    const cad = e.cadeado ?? 0;
    p.cadeado.visible = cad > 0.01;
    p.cadeado.children.forEach((o, i) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = (i === 2 ? 0.9 : 0.95) * cad * (0.85 + 0.15 * Math.sin(t * 9));
    });
    p.cadeado.scale.setScalar(0.85 + 0.25 * cad);
    p.cadeado.rotation.y = -this.pan.rotation.y;
    // entupido
    const en = e.entupido ?? { trab: 0, seg: 0 };
    this.plugs[0].visible = en.trab > 0.01;
    this.plugs[0].scale.set(en.trab, 0.6 * en.trab, en.trab);
    this.plugs[1].visible = en.seg > 0.01;
    this.plugs[1].scale.set(en.seg, 0.6 * en.seg, en.seg);
    // marcas
    const mk = e.marcas ?? { trab: 0, seg: 0, jan: 0, fech: 0 };
    (Object.keys(p.marcas) as (keyof typeof p.marcas)[]).forEach((k) => {
      const m = p.marcas[k];
      const v = mk[k];
      m.visible = v > 0.01;
      (m.material as THREE.MeshBasicMaterial).opacity = v;
      m.scale.setScalar(1 + 0.15 * Math.sin(t * 8));
    });
    // anel brilhando (quando ganha nome)
    const ba = e.brilhoAnel ?? 0;
    const ma = p.matAnel as THREE.MeshStandardMaterial;
    if (ma.emissive) ma.emissive.copy(LARANJA).multiplyScalar(ba * (B ? 0.5 : 0.8));

    // água: fervura (superfície ondulando + bolhas)
    const fv = e.ferv ?? 0;
    const sp = p.superficie.geometry.attributes.position as THREE.BufferAttribute;
    const base = p.superficie.userData.base as Float32Array;
    for (let i = 0; i < sp.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      sp.setY(i, base[i * 3 + 1] + fv * 0.018 * (Math.sin(x * 9 + t * 7) * Math.cos(z * 8 - t * 6) + 0.5 * Math.sin((x + z) * 15 + t * 11)));
    }
    sp.needsUpdate = true;
    p.superficie.geometry.computeVertexNormals();
    const mt = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < p.bolhas.count; i++) {
      const r = rng(500 + i);
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (R - 0.15), per = 0.6 + r() * 0.8;
      const ph = ((t / per + r()) % 1);
      const y = 0.12 + ph * (AGUA - 0.14);
      const s = fv > 0.05 ? (0.5 + ph) * (0.6 + r() * 0.8) : 0.0001;
      mt.compose(new THREE.Vector3(Math.cos(a) * rr + Math.sin(t * 5 + i) * 0.02, y, Math.sin(a) * rr), q, new THREE.Vector3(s, s, s));
      p.bolhas.setMatrixAt(i, mt);
    }
    p.bolhas.instanceMatrix.needsUpdate = true;
    // espuma
    const es = e.espuma ?? 0;
    p.espuma.visible = es > 0.005;
    for (let i = 0; i < p.espuma.count; i++) {
      const { p: pp, s } = posEspuma(i, es, t);
      const sx = B ? s * (1 + 0.12 * Math.sin(t * 9 + i)) : s;
      const sy = B ? s * (1 - 0.12 * Math.sin(t * 9 + i)) : s;
      mt.compose(pp, q, new THREE.Vector3(Math.max(sx, 0.0001), Math.max(sy, 0.0001), Math.max(s, 0.0001)));
      p.espuma.setMatrixAt(i, mt);
    }
    p.espuma.instanceMatrix.needsUpdate = true;
    if (B) {
      // carinhas nas bolhas grandes da frente da espuma
      p.carinhas.children.forEach((c, i) => {
        const v = es > 0.25 && e.corte > 0.5;
        c.visible = v;
        if (!v) return;
        const a = -0.3 + i * 0.5;
        const yy = AGUA + 0.14 + (i % 2) * 0.22 * es + es * 0.2 * i;
        const rr = 0.2 - i * 0.03;
        c.position.set(Math.sin(a) * rr * 0.6, Math.min(yy, H - 0.1), 0.06);
        const s = 0.085 + 0.012 * Math.sin(t * 9 + i);
        c.scale.set(s * 1.1, s * 0.9, s);
        // a bolha da carinha
        if (!c.userData.bolha) {
          const bm = this.kit.m(esfera(1, 20, 14), this.kit.mat({ color: 0xfff3dc }), 2.5);
          c.add(bm);
          c.userData.bolha = bm;
        }
        c.children.forEach((o) => {
          if (o !== c.userData.bolha) {
            const ol = o as THREE.Mesh;
            const pisca = Math.sin(t * 3 + i * 2) > 0.96 ? 0.15 : 1;
            ol.scale.set(1, 1.5 * pisca, 0.4);
          }
        });
      });
    }

    // fogo
    const fg = e.fogo;
    this.chamas.forEach((ch, i) => {
      ch.visible = fg > 0.01;
      const fl = 0.75 + 0.25 * Math.sin(t * 23 + i * 1.7) * Math.sin(t * 17 + i);
      ch.scale.set(B ? 1 - 0.1 * Math.sin(t * 20 + i) : 1, fg * fl * (B ? 1 : 1.1), B ? 1 - 0.1 * Math.sin(t * 20 + i) : 1);
    });

    // vapor
    this.aplicaVapor(e.vapor, t, e);

    // mão (filha da tampa): entra pela direção do braço e agarra o cabo
    const mo = e.mao;
    this.mao.visible = !!mo && mo.k > 0.01;
    if (mo && mo.k > 0.01) {
      const dr = this.mao.userData.dir as THREE.Vector3;
      this.mao.position.copy(dr).multiplyScalar((1 - mo.k) * 1.6);
    }

    this.aplicaWire(e);
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = e.foco ?? 0.55;
    if (this.bokeh) {
      const dist = new THREE.Vector3(...c.pos).distanceTo(new THREE.Vector3(...c.alvo));
      (this.bokeh.uniforms as any).focus.value = dist;
      (this.bokeh.uniforms as any).aperture.value = 0.0011 * (8 / dist);
    }
    this.final.uniforms.tempo.value = t;
  }

  aplicaVapor(v: Vapor, t: number, e: Estado) {
    const B = this.dir === "B", C = this.dir === "C";
    const o = this.pan.rotation.y;
    const w = (p: V3) => new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0, 1, 0), o).add(this.p.tampa.position);
    const opBase = B ? 1 : C ? 0.4 : 0.95;
    const roda = (nome: string, k: number, f: (i: number, ph: number, r: () => number) => { p: THREE.Vector3; s: number; a?: number }, vida = 1.4) => {
      const em = this.vapores[nome];
      em.spr.forEach((s, i) => {
        if (k <= 0.01 || (e.wire ?? 0) > 0.5) {
          s.visible = false;
          return;
        }
        const r = rng(9000 + i * 31 + nome.length * 7);
        const off = r();
        const ph = (t / vida + off) % 1;
        const { p, s: sz, a } = f(i, ph, r);
        s.visible = true;
        s.position.copy(p);
        const fade = Math.sin(Math.PI * Math.min(1, ph * 1.15));
        const rotv = i * 1.7 + t * (0.3 + r() * 0.4) * (i % 2 ? 1 : -1);
        if (s.userData.algodao) {
          // algodão: cresce e some encolhendo (não fica fantasma)
          s.scale.setScalar(sz * 0.62 * (0.55 + 0.45 * fade));
          s.rotation.set(i * 0.7, rotv, i * 1.3);
          em.mat[i].opacity = Math.min(1, opBase * k * (a ?? 1) * Math.min(1, fade * 2.2));
        } else {
          s.scale.setScalar(sz * (B ? 0.8 : 1));
          em.mat[i].opacity = opBase * k * fade * (a ?? 1);
          em.mat[i].rotation = rotv;
        }
      });
    };
    const yT = H + 0.2;
    // beirada: fiapos que escapam em volta da tampa
    roda("beirada", v.beirada ?? 0, (i, ph, r) => {
      const a = r() * Math.PI * 2;
      const pp = w([Math.cos(a) * (R + 0.1 + ph * 0.25), H + 0.02 + ph * 0.7, Math.sin(a) * (R + 0.1 + ph * 0.25)]);
      return { p: pp, s: 0.12 + ph * 0.45 };
    }, 1.2);
    // gancho: vapor começando a sair pela válvula e pela beirada
    roda("gancho", v.gancho ?? 0, (i, ph, r) => {
      const u = r();
      const a = r() * Math.PI * 2;
      const base: V3 = u < 0.5 ? [P_TRAB[0], yT + 0.2, P_TRAB[2]] : [Math.cos(a) * (R + 0.09), H + 0.03, Math.sin(a) * (R + 0.09)];
      const pp = w(base).add(new THREE.Vector3(Math.sin(i + t) * 0.1 * ph, ph * (u < 0.5 ? 1.5 : 0.6), 0));
      return { p: pp, s: (u < 0.5 ? 0.18 : 0.1) + ph * 0.6 };
    }, 1.3);
    // trab: jato do peso (radial, girando) + coluna
    roda("trab", v.trab ?? 0, (i, ph, r) => {
      const a = r() * Math.PI * 2 + t * 6;
      const radial = i % 3 !== 0;
      const pp = radial
        ? w([Math.cos(a) * (0.12 + ph * 0.45), yT + 0.06 + ph * 0.28, Math.sin(a) * (0.12 + ph * 0.45)])
        : w([Math.sin(i) * 0.05, yT + 0.25 + ph * 1.6, Math.cos(i) * 0.05]);
      return { p: pp, s: (radial ? 0.07 : 0.14) + ph * (radial ? 0.3 : 0.7) };
    }, 0.9);
    // seg: jato do pino
    roda("seg", v.seg ?? 0, (i, ph, r) => {
      const pp = w([P_SEG[0] + (r() - 0.5) * 0.08 * ph, P_SEG[1] + 0.12 + ph * 1.2, P_SEG[2] + (r() - 0.5) * 0.08 * ph]);
      return { p: pp, s: 0.06 + ph * 0.42 };
    }, 0.8);
    // jan: jato lateral pela janelinha
    roda("jan", v.jan ?? 0, (i, ph, r) => {
      const d = new THREE.Vector3(P_JAN[0], 0, P_JAN[2]).normalize();
      const pp = w([P_JAN[0] + d.x * ph * 1.4 + (r() - 0.5) * 0.1 * ph, P_JAN[1] + ph * 0.35 + (r() - 0.5) * 0.08, P_JAN[2] + d.z * ph * 1.4]);
      return { p: pp, s: 0.06 + ph * 0.5 };
    }, 0.8);
    // aberta: panela sem tampa fervendo
    roda("aberta", v.aberta ?? 0, (i, ph, r) => {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (R - 0.2);
      const pp = new THREE.Vector3(Math.cos(a) * rr + Math.sin(t * 0.8 + i) * 0.1 * ph, AGUA + 0.1 + ph * 1.6, Math.sin(a) * rr);
      return { p: pp, s: 0.25 + ph * 0.7, a: 0.8 };
    }, 2.0);
    // interno: vapor rodando no espaço de cima (só se vê no corte); fica na metade de trás
    roda("interno", v.interno ?? 0, (i, ph, r) => {
      const a = Math.PI + r() * Math.PI + t * (0.4 + r() * 0.3);
      const rr = 0.2 + r() * (R - 0.35);
      const pp = w([Math.cos(a) * rr, AGUA + 0.12 + r() * (H + 0.05 - AGUA - 0.15), Math.min(-0.05, Math.sin(a) * rr)]);
      return { p: pp, s: 0.22 + 0.1 * Math.sin(ph * 6), a: 0.75 };
    }, 2.4);
  }

  aplicaWire(e: Estado) {
    const w = e.wire ?? 0;
    const liga = w > 0.5;
    if (liga !== this.wireAtivo) {
      this.wireAtivo = liga;
      this.scene.traverse((o) => {
        if (o.userData.contorno || o.userData.tampa) {
          o.visible = !liga;
          return;
        }
        if (this.fundo.includes(o) && (o as THREE.Mesh).isMesh && !(o as THREE.Mesh).geometry.type.includes("Rounded") && !(o as THREE.Mesh).geometry.type.includes("Cylinder") && !(o as THREE.Mesh).geometry.type.includes("Torus")) {
          o.visible = !liga;
          return;
        }
        if ((o as THREE.Sprite).isSprite || o === this.part || o.userData.semWire || (o as THREE.LineSegments).isLineSegments) return;
        if ((o as THREE.InstancedMesh).isInstancedMesh) {
          o.visible = !liga;
          return;
        }
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (liga) {
          this.originais.set(m, m.material);
          const corte = !!(m.material as THREE.Material).userData?.corte;
          m.material = corte ? this.invisCorte : this.invis;
          let l = m.userData.linhas as THREE.LineSegments | undefined;
          if (!l) {
            const gp = m.geometry as THREE.LatheGeometry;
            const fonte = gp.type === "LatheGeometry" ? new THREE.LatheGeometry(gp.parameters.points.filter((_, i) => i % 2 === 0), 32) : m.geometry;
            l = new THREE.LineSegments(new THREE.EdgesGeometry(fonte, gp.type === "LatheGeometry" ? 1 : 14), corte ? this.linhaCorte : this.linha);
            l.userData.semWire = true;
            m.add(l);
            m.userData.linhas = l;
          }
          l.visible = true;
        } else if (this.originais.has(m)) {
          m.material = this.originais.get(m)!;
          if (m.userData.linhas) (m.userData.linhas as THREE.LineSegments).visible = false;
        }
      });
      if (liga) {
        this.bgOrig = this.scene.background as THREE.Color;
        this.scene.background = TINTA.clone();
        this.renderer.shadowMap.enabled = false;
      } else {
        this.scene.background = this.bgOrig;
        this.renderer.shadowMap.enabled = true;
      }
    }
    this.bloom.threshold = liga ? 0.5 : this.dir === "A" ? 0.9 : this.dir === "B" ? 0.97 : 0.92;
    this.bloom.strength = liga ? 0.8 : this.dir === "A" ? 0.22 : this.dir === "B" ? 0.25 : 0.3;
    this.final.uniforms.grao.value = liga ? 0 : this.dir === "A" ? 0.035 : this.dir === "C" ? 0.022 : 0;
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.forca.value = this.tiltV.uniforms.forca.value = liga ? 0.2 : 1;
    if (this.bokeh) (this.bokeh as any).enabled = !liga;
    this.chamas.forEach((c) => (c.visible = c.visible && !liga));
    const pa = e.part ?? 0;
    this.part.visible = liga;
    if (liga) {
      const at = this.part.geometry.attributes.position as THREE.BufferAttribute;
      const b = this.partBase;
      for (let i = 0; i < at.count; i++) {
        const k = pa * (0.3 + ((i * 7919) % 100) / 100);
        at.setXYZ(i, b[i * 3] + Math.sin(i * 1.7) * 0.6 * k, b[i * 3 + 1] + k * (0.4 + (i % 11) * 0.12), b[i * 3 + 2] + Math.cos(i * 2.3) * 0.6 * k);
      }
      at.needsUpdate = true;
    }
  }

  render() {
    this.composer.render();
  }
}
