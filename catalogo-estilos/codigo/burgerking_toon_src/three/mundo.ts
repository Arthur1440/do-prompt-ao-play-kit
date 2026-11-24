import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { cil, Dir, esfera, Kit, V3 } from "./kit";
import { Boneco, Pose } from "./personagens";
import { rng } from "./rng";
import { texCeu, texLona, texMadeira, texPlaca, texSelecao } from "./tex";
import { animaGrelha, carro, cidade, driveThru, eclipse, grelha, jornal, pedestal } from "./extras";
import { mcwhopper, whopper } from "./lanches";

export type SetNome = "selecao" | "ringue" | "estrada" | "palco" | "jornal" | "escritorio" | "cidade" | "vitrine";
export type Estado = {
  set: SetNome;
  cam: { pos: V3; alvo: V3; fov: number; rolo?: number };
  foco?: number; // centro do tilt-shift (A), 0..1 de baixo p/ cima
  rei?: Pose;
  ronald?: Pose;
  execMc?: Pose;
  execBk?: Pose;
  wire?: number; // virada IA: 0..1 vira arame laranja
  jornal?: number; // 0 fechado .. 1 aberto
  mcw?: { monta: number; giro: number };
  carro?: { x: number; z: number; rotY: number; copo: boolean };
  gigante?: number; // Whopper gigante no horizonte
  eclipse?: number; // 0 sol .. 1 total
  grelha?: { vis: boolean; brilho: number; chama: number };
  ceu?: string[];
  part?: number;
  luz?: number; // 1 normal; <1 escurece (eclipse)
  tremor?: number;
};

const LARANJA = new THREE.Color("#FF6B2C");
const TINTA = new THREE.Color("#0B1026");
export const PIX = 5; // tamanho do pixel da direção C

export class Mundo {
  dir: Dir;
  k: Kit;
  W: number;
  H: number;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  final: ShaderPass;
  tiltH?: ShaderPass;
  tiltV?: ShaderPass;
  sets: Record<SetNome, THREE.Group> = {
    selecao: new THREE.Group(), ringue: new THREE.Group(), estrada: new THREE.Group(), palco: new THREE.Group(),
    jornal: new THREE.Group(), escritorio: new THREE.Group(), cidade: new THREE.Group(), vitrine: new THREE.Group(),
  };
  objJornal!: THREE.Group;
  objMcw!: THREE.Group;
  objMcwPartes: { o: THREE.Object3D; y0: number; ordem: number }[] = [];
  objCarro!: THREE.Group;
  objGigante!: THREE.Group;
  objEclipse!: THREE.Group;
  objGrelha!: THREE.Group;
  objCidade!: THREE.Group;
  rei: Boneco;
  ronald: Boneco;
  execMc: Boneco;
  execBk: Boneco;
  sol: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  contra: THREE.DirectionalLight;
  fundo: THREE.Mesh;
  mesa?: THREE.Mesh;
  wireMat: THREE.MeshBasicMaterial;
  originais = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  wireAtivo = false;
  part!: THREE.Points;
  plateia?: THREE.Points;

  constructor(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
    this.dir = dir;
    this.W = W;
    this.H = H;
    this.k = new Kit(dir, W, H);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: dir !== "C", preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = dir === "A" ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = dir === "A" ? 1.0 : 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 200);
    this.scene.add(this.camera);
    if (dir === "A") {
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.45;
    }

    // luzes
    this.sol = new THREE.DirectionalLight(dir === "A" ? 0xffcf9a : 0xffffff, dir === "A" ? 3.4 : 2.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.01;
    const sc = this.sol.shadow.camera;
    sc.left = sc.bottom = -3;
    sc.right = sc.top = 3;
    sc.near = 0.5;
    sc.far = 30;
    this.scene.add(this.sol, this.sol.target);
    this.hemi = new THREE.HemisphereLight(dir === "A" ? 0xcfe0ff : 0xffffff, dir === "A" ? 0x8a5a3a : 0x99887a, dir === "A" ? 0.9 : 1.5);
    this.scene.add(this.hemi);
    this.contra = new THREE.DirectionalLight(dir === "A" ? 0xffe2b8 : 0xfff2dd, dir === "A" ? 1.6 : 1.4);
    this.scene.add(this.contra);

    // fundo (céu/fundo infinito)
    this.fundo = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.MeshBasicMaterial({ map: texCeu(["#f6c48a", "#f2a66b"]), side: THREE.BackSide, depthWrite: false, fog: false }));
    this.scene.add(this.fundo);

    if (dir === "A") {
      const mad = texMadeira();
      mad.repeat.set(3, 3);
      this.mesa = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), this.k.mat({ map: mad, rough: 0.55, clear: 0.3 }));
      this.mesa.rotation.x = -Math.PI / 2;
      this.mesa.position.y = -0.002;
      this.mesa.receiveShadow = true;
      this.scene.add(this.mesa);
    }

    for (const s of Object.values(this.sets)) this.scene.add(s);
    this.rei = new Boneco(this.k, "rei");
    this.ronald = new Boneco(this.k, "ronald");
    this.execMc = new Boneco(this.k, "execMc");
    this.execBk = new Boneco(this.k, "execBk");
    for (const b of [this.rei, this.ronald, this.execMc, this.execBk]) {
      this.scene.add(b.raiz);
      if (dir === "A") {
        // base de boneco colecionável
        const base = this.k.m(cil(0.2, 0.21, 0.035, 48), this.k.mat({ color: "#16161a", rough: 0.25, clear: 0.9 }), 2, b.raiz, [0, 0.0175, 0]);
        b.base = base;
        b.corpo.position.y = 0.035;
      }
    }
    this.montaSelecao();
    this.montaRingue();
    this.montaEstrada();
    this.montaPalco();
    this.montaNovos();
    this.wireMat = new THREE.MeshBasicMaterial({ color: LARANJA, wireframe: true, transparent: true, opacity: 0.9 });
    this.montaParticulas();

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: dir === "C" ? 0 : 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    if (dir === "C") {
      const pp = new RenderPixelatedPass(PIX, this.scene, this.camera, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.5 });
      this.composer.addPass(pp);
    } else {
      this.composer.addPass(new RenderPass(this.scene, this.camera));
    }
    if (dir === "A") this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.22, 0.6, 0.9));
    this.composer.addPass(new OutputPass());
    if (dir === "A") {
      this.tiltH = new ShaderPass(TILT);
      this.tiltH.uniforms.dir.value.set(1 / W, 0);
      this.tiltV = new ShaderPass(TILT);
      this.tiltV.uniforms.dir.value.set(0, 1 / H);
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }
    this.final = new ShaderPass(FINAL);
    this.final.uniforms.res.value.set(W, H);
    this.final.uniforms.pix.value = dir === "C" ? PIX : 0;
    this.final.uniforms.grao.value = dir === "A" ? 0.035 : 0.0;
    this.final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.25;
    this.final.uniforms.quente.value = dir === "A" ? 0.025 : 0.0;
    this.composer.addPass(this.final);
  }

  // ---------------------------------------------------------------- cenários
  private montaSelecao() {
    const g = this.sets.selecao;
    const k = this.k;
    const d = this.dir;
    // painel de fundo
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(d === "A" ? 1.9 : 7, d === "A" ? 1.9 : 7), k.mat({ map: texSelecao(d), rough: 0.8, semContorno: true, emissive: "#ffffff", ei: 0 }));
    if (d !== "A") {
      (fundo.material as THREE.MeshToonMaterial).emissiveMap = (fundo.material as THREE.MeshToonMaterial).map;
      (fundo.material as THREE.MeshToonMaterial).emissiveIntensity = 0.75;
    }
    fundo.position.set(0, d === "A" ? 0.95 : 1.2, d === "A" ? -0.55 : -2.2);
    fundo.receiveShadow = true;
    g.add(fundo);
    if (d === "A") {
      // suporte de papelão
      k.m(new THREE.BoxGeometry(1.9, 0.02, 0.3), k.mat({ color: "#c9b48e", rough: 0.9 }), 1, g, [0, 0.01, -0.45]);
    }
    // pedestais
    for (const [x, cor] of [
      [-0.33, "#D62300"],
      [0.33, "#FFC72C"],
    ] as const) {
      const ped = k.m(cil(0.24, 0.26, 0.06, 48), k.mat({ color: d === "A" ? "#2a2522" : "#2b2340", rough: 0.4 }), 3, g, [x, 0.03, 0]);
      ped.receiveShadow = true;
      k.m(cil(0.245, 0.245, 0.012, 48), k.mat({ color: cor, rough: 0.4, emissive: cor, ei: d === "A" ? 0.4 : 0.25 }), 1.5, g, [x, 0.061, 0]);
    }
    if (d !== "A") {
      const chao = new THREE.Mesh(new THREE.CircleGeometry(4, 64), k.mat({ color: "#2a1f3d", rough: 0.9, semContorno: true }));
      chao.rotation.x = -Math.PI / 2;
      chao.receiveShadow = true;
      g.add(chao);
    }
  }

  private montaRingue() {
    const g = this.sets.ringue;
    const k = this.k;
    const d = this.dir;
    const L = 2.2;
    const lona = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, L), [
      k.mat({ color: "#1e2a5a", rough: 0.7 }),
      k.mat({ color: "#1e2a5a", rough: 0.7 }),
      k.mat({ map: texLona(d), rough: 0.85 }),
      k.mat({ color: "#1e2a5a", rough: 0.7 }),
      k.mat({ color: "#1e2a5a", rough: 0.7 }),
      k.mat({ color: "#1e2a5a", rough: 0.7 }),
    ]);
    lona.position.y = 0.06;
    lona.receiveShadow = true;
    lona.castShadow = true;
    g.add(lona);
    // saia do ringue com faixas
    k.m(new THREE.BoxGeometry(L * 1.02, 0.02, L * 1.02), k.mat({ color: "#ffffff", rough: 0.5 }), 1.5, g, [0, 0.115, 0]);
    // postes e cordas
    const cores = ["#D62300", "#1e57c8", "#FFC72C", "#1e57c8"];
    const cantos: [number, number][] = [
      [-1, 1],
      [-1, -1],
      [1, -1],
      [1, 1],
    ];
    cantos.forEach(([x, z], i) => {
      const px = (x * L) / 2 - x * 0.05, pz = (z * L) / 2 - z * 0.05;
      k.m(cil(0.035, 0.035, 0.62, 20), k.mat({ color: "#d9d9de", rough: 0.3, metal: 0.8 }), 2, g, [px, 0.43, pz]);
      k.m(new THREE.BoxGeometry(0.1, 0.42, 0.1), k.mat({ color: cores[i], rough: 0.5 }), 2.5, g, [px, 0.45, pz]);
    });
    const corda = (a: [number, number], b: [number, number], y: number, cor: string) => {
      const ax = (a[0] * L) / 2 - a[0] * 0.05, az = (a[1] * L) / 2 - a[1] * 0.05;
      const bx = (b[0] * L) / 2 - b[0] * 0.05, bz = (b[1] * L) / 2 - b[1] * 0.05;
      const len = Math.hypot(bx - ax, bz - az);
      const m = k.m(cil(0.012, 0.012, len, 10), k.mat({ color: cor, rough: 0.5 }), 1.5, g, [(ax + bx) / 2, y, (az + bz) / 2]);
      m.rotation.set(Math.PI / 2, 0, 0);
      m.rotation.y = Math.atan2(bx - ax, bz - az);
      m.rotation.order = "YXZ";
    };
    for (const y of [0.3, 0.43, 0.56]) {
      for (let i = 0; i < 4; i++) corda(cantos[i], cantos[(i + 1) % 4], y, i === 0 ? "#D62300" : i === 2 ? "#FFC72C" : "#ffffff");
    }
    // plateia: luzes ao fundo
    const r = rng(5);
    const n = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const cor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.05 + r() * 0.9);
      const rad = 3.2 + r() * 2.5;
      pos.set([Math.cos(a) * rad, 0.3 + r() * 1.8 + (rad - 3.2) * 0.5, Math.sin(a) * rad], i * 3);
      const c = new THREE.Color().setHSL(r() < 0.5 ? 0.08 : 0.13, 0.9, 0.55 + r() * 0.3);
      cor.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
    const pts = (this.plateia = new THREE.Points(geo, new THREE.PointsMaterial({ size: d === "C" ? 0.035 : 0.05, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false })));
    g.add(pts);
    if (d !== "A") {
      const chao = new THREE.Mesh(new THREE.CircleGeometry(9, 64), k.mat({ color: "#1a1430", rough: 0.9, semContorno: true }));
      chao.rotation.x = -Math.PI / 2;
      chao.receiveShadow = true;
      g.add(chao);
    }
  }

  private montaEstrada() {
    const g = this.sets.estrada;
    const k = this.k;
    const d = this.dir;
    const esc = d === "A" ? 0.5 : 1;
    const raiz = new THREE.Group();
    raiz.scale.setScalar(esc);
    g.add(raiz);
    // campo
    const campo = new THREE.Mesh(new THREE.PlaneGeometry(d === "A" ? 6 : 60, d === "A" ? 6 : 60, 1, 1), k.mat({ color: d === "A" ? "#8fa04a" : "#9bd15a", rough: 0.95, semContorno: true }));
    campo.rotation.x = -Math.PI / 2;
    campo.receiveShadow = true;
    raiz.add(campo);
    if (d === "A") {
      // borda da maquete (base de isopor pintado)
      k.m(new THREE.BoxGeometry(6, 0.12, 6), k.mat({ color: "#6d5a3c", rough: 0.9 }), 1, raiz, [0, -0.061, 0]);
    }
    // faixas de plantação (França rural)
    const r = rng(9);
    for (let i = 0; i < 9; i++) {
      const cor = ["#d9b945", "#a9c45a", "#c9a23c", "#7fae4a"][i % 4];
      const f = new THREE.Mesh(new THREE.PlaneGeometry(d === "A" ? 2.4 : 24, d === "A" ? 0.5 : 5), k.mat({ color: cor, rough: 0.95, semContorno: true }));
      f.rotation.x = -Math.PI / 2;
      f.position.set((i % 2 ? 1 : -1) * (d === "A" ? 1.45 : 14), 0.002, -i * (d === "A" ? 0.55 : 5.5) + (d === "A" ? 1.5 : 10));
      f.receiveShadow = true;
      raiz.add(f);
    }
    // estrada
    const est = new THREE.Mesh(new THREE.PlaneGeometry(0.62, d === "A" ? 6 : 60), k.mat({ color: "#4a4d55", rough: 0.85, semContorno: true }));
    est.rotation.x = -Math.PI / 2;
    est.position.y = 0.004;
    est.receiveShadow = true;
    raiz.add(est);
    for (let i = 0; i < (d === "A" ? 14 : 70); i++) {
      const fx = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.18), k.mat({ color: "#f4f1e6", rough: 0.6, semContorno: true }));
      fx.rotation.x = -Math.PI / 2;
      fx.position.set(0, 0.006, 2.8 - i * 0.42);
      raiz.add(fx);
    }
    // álamos
    const tronco = k.mat({ color: "#6a4a30", rough: 0.9 });
    const copa = k.mat({ color: d === "A" ? "#4f7a35" : "#3f9a47", rough: 0.85 });
    for (let i = 0; i < 16; i++) {
      for (const s of [-1, 1]) {
        const z = 2.4 - i * 0.62 + r() * 0.1;
        const x = s * (0.55 + r() * 0.08);
        if (d === "A" && z < -2.8) continue;
        if (s > 0 && z > -0.2) continue; // abre espaço para a placa
        if (s < 0 && z > 0.5 && z < 2.3) continue; // e para o Ronald
        k.m(cil(0.015, 0.02, 0.18, 8), tronco, 1.5, raiz, [x, 0.09, z]);
        k.m(esfera(0.1, 14, 12), copa, 2, raiz, [x, 0.36, z], undefined, [0.8, 1.9, 0.8]);
      }
    }
    // colinas
    if (d !== "A") {
      for (let i = 0; i < 7; i++) {
        k.m(esfera(3 + r() * 3, 24, 12), k.mat({ color: ["#8cc456", "#76b04c", "#a3cd60"][i % 3], rough: 0.95 }), 3, raiz, [-14 + i * 5 + r() * 2, -1.5, -28 - r() * 6], undefined, [1.6, 0.6, 1]);
      }
    }
    // a placa
    const placa = new THREE.Group();
    placa.position.set(0.62, 0, 0.6);
    placa.rotation.y = -0.38;
    raiz.add(placa);
    const metal = k.mat({ color: "#b9bcc4", rough: 0.4, metal: 0.8 });
    for (const x of [-0.48, 0.48]) k.m(cil(0.025, 0.025, 1.1, 12), metal, 2, placa, [x, 0.55, -0.02]);
    const painel = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.8, 0.03), [
      k.mat({ color: "#e8e8ea", rough: 0.5 }),
      k.mat({ color: "#e8e8ea", rough: 0.5 }),
      k.mat({ color: "#e8e8ea", rough: 0.5 }),
      k.mat({ color: "#e8e8ea", rough: 0.5 }),
      k.mat({ map: texPlaca(), rough: 0.45, emissive: "#ffffff", ei: 0 }),
      k.mat({ color: "#9a9ca3", rough: 0.5 }),
    ]);
    const pm = (painel.material as THREE.Material[])[4] as THREE.MeshStandardMaterial;
    pm.emissiveMap = pm.map;
    pm.emissiveIntensity = d === "A" ? 0.12 : 0.45;
    painel.position.set(0, 0.92, 0);
    painel.castShadow = true;
    this.k.contorno(painel, 3);
    placa.add(painel);
    g.userData.placa = placa;
    g.userData.escala = esc;
  }

  private montaPalco() {
    // "tela dividida" construída de verdade: dois andares de estúdio, Méqui em cima, BK embaixo
    const g = this.sets.palco;
    const k = this.k;
    const d = this.dir;
    const painel = (y0: number, y1: number, z: number, c1: string, c2: string) => {
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 256;
      const gg = cv.getContext("2d")!;
      const gr = gg.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, c1);
      gr.addColorStop(1, c2);
      gg.fillStyle = gr;
      gg.fillRect(0, 0, 64, 256);
      const tx = new THREE.CanvasTexture(cv);
      tx.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, y1 - y0), k.mat({ map: tx, rough: 0.9, semContorno: true, emissive: "#ffffff", ei: 0 }));
      const mm = m.material as THREE.MeshStandardMaterial;
      mm.emissiveMap = tx;
      mm.emissiveIntensity = d === "A" ? 0.25 : 0.55;
      m.position.set(0, (y0 + y1) / 2, z);
      m.receiveShadow = true;
      g.add(m);
    };
    painel(-0.6, 1.08, -0.16, "#2a63d6", "#0f2a6a"); // BK embaixo
    painel(1.05, 2.6, -0.62, "#ffcf3a", "#e0261c"); // Méqui em cima
    // barra divisória
    k.m(new THREE.BoxGeometry(2.4, 0.05, 0.12), k.mat({ color: "#ffffff", rough: 0.35, emissive: "#ffffff", ei: 0.35 }), 2, g, [0, 1.085, 0.2]);
    // aros de luz atrás das cabeças
    const aro = k.mat({ color: "#ffffff", rough: 0.3, emissive: "#fff6e0", ei: 1.6, semContorno: true });
    k.m(new THREE.TorusGeometry(0.2, 0.012, 12, 60), aro, 1, g, [0.0, 0.8, -0.14]);
    k.m(new THREE.TorusGeometry(0.22, 0.013, 12, 60), aro, 1, g, [0.0, 1.38, -0.6]);
  }

  private montaNovos() {
    const k = this.k;
    // --- redação: parede com janelas + o jornal gigante
    const j = this.sets.jornal;
    const parede = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), k.mat({ color: "#f2dcae", rough: 0.9, semContorno: true }));
    parede.position.set(0, 2, -1.2);
    parede.receiveShadow = true;
    j.add(parede);
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), k.mat({ color: "#9fd6ff", emissive: "#bfe6ff", ei: 0.6, rough: 0.2, semContorno: true }));
      w.position.set(-1.65 + i * 1.1, 1.75, -1.18);
      j.add(w);
      k.m(new THREE.BoxGeometry(0.78, 0.05, 0.05), k.mat({ color: "#ffffff", rough: 0.5 }), 1.5, j, [-1.65 + i * 1.1, 1.22, -1.15]);
    }
    const chaoJ = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), k.mat({ color: "#b5723f", rough: 0.8, semContorno: true }));
    chaoJ.rotation.x = -Math.PI / 2;
    chaoJ.receiveShadow = true;
    j.add(chaoJ);
    this.objJornal = jornal(k);
    this.objJornal.position.set(0.12, 0.72, -0.25);
    j.add(this.objJornal);
    // --- escritório do executivo
    const es = this.sets.escritorio;
    const pe = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), k.mat({ color: "#2a4f8f", rough: 0.9, semContorno: true, emissive: "#2a4f8f", ei: 0.25 }));
    pe.position.set(0, 1.6, -0.9);
    es.add(pe);
    const jan = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), k.mat({ color: "#ffd59a", emissive: "#ffcf8a", ei: 0.8, semContorno: true }));
    jan.position.set(0.55, 1.15, -0.88);
    es.add(jan);
    for (let i = 0; i < 5; i++) {
      const h = 0.2 + (i % 3) * 0.15;
      const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.12, h), k.mat({ color: "#5a6f9a", semContorno: true }));
      pr.position.set(0.1 + i * 0.22, 0.8 + h / 2, -0.875);
      es.add(pr);
    }
    k.m(new THREE.BoxGeometry(1.3, 0.06, 0.6), k.mat({ color: "#6a4128", rough: 0.6, clear: 0.5 }), 2.5, es, [0, 0.42, 0.25]);
    k.m(new THREE.BoxGeometry(1.2, 0.4, 0.04), k.mat({ color: "#55331f", rough: 0.6 }), 2, es, [0, 0.2, 0.5]);
    const chaoE = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), k.mat({ color: "#3a3550", rough: 0.9, semContorno: true }));
    chaoE.rotation.x = -Math.PI / 2;
    chaoE.receiveShadow = true;
    es.add(chaoE);
    // --- vitrine: pedestal giratório com o McWhopper que se monta
    const v = this.sets.vitrine;
    v.add(pedestal(k));
    this.objMcw = mcwhopper(k);
    this.objMcw.scale.setScalar(0.26);
    this.objMcw.position.y = 0.14;
    v.add(this.objMcw);
    this.objMcw.children.forEach((metade) => {
      let ordem = 0;
      metade.children.forEach((o) => {
        this.objMcwPartes.push({ o, y0: o.position.y, ordem: ordem++ });
      });
    });
    const chaoV = new THREE.Mesh(new THREE.CircleGeometry(5, 48), k.mat({ color: "#2b1d4d", rough: 0.9, semContorno: true }));
    chaoV.rotation.x = -Math.PI / 2;
    chaoV.receiveShadow = true;
    v.add(chaoV);
    // --- cidade brasileira + eclipse
    const ci = this.sets.cidade;
    this.objCidade = cidade(k);
    ci.add(this.objCidade);
    const chaoC = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), k.mat({ color: "#7cc06a", rough: 0.9, semContorno: true }));
    chaoC.rotation.x = -Math.PI / 2;
    chaoC.position.y = -0.002;
    chaoC.receiveShadow = true;
    ci.add(chaoC);
    this.objEclipse = eclipse();
    this.objEclipse.position.set(0.9, 6.8, -9);
    this.objEclipse.scale.setScalar(1.7);
    ci.add(this.objEclipse);
    // --- estrada: carro, drive-thru e o Whopper gigante no horizonte
    const raizE = this.sets.estrada.children[0];
    this.objCarro = carro(k);
    raizE.add(this.objCarro);
    const dt = driveThru(k);
    dt.position.set(0.72, 0, -1.6);
    raizE.add(dt);
    this.objGigante = new THREE.Group();
    const wg = whopper(k);
    wg.scale.setScalar(1.6);
    this.objGigante.add(wg);
    this.objGigante.position.set(0, 0.0, -24);
    raizE.add(this.objGigante);
    // --- grelha no canto do ringue
    const carne = (whopper(k).userData.carne ?? k.mat({ color: "#5c3420" })) as THREE.Material;
    this.objGrelha = grelha(k, carne);
    this.objGrelha.position.set(-0.55, 0.12, 0.35);
    this.objGrelha.scale.setScalar(0.55);
    this.sets.ringue.add(this.objGrelha);
  }

  private montaParticulas() {
    const n = 2400;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const r = rng(33);
    for (let i = 0; i < n; i++) p.set([(r() - 0.5) * 2.6, r() * 1.6, (r() - 0.5) * 2.6], i * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.part = new THREE.Points(geo, new THREE.PointsMaterial({ color: LARANJA, size: 0.012, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.part);
  }

  // ---------------------------------------------------------------- aplica estado
  aplica(e: Estado, t: number) {
    for (const [n, s] of Object.entries(this.sets)) s.visible = n === e.set;
    const d = this.dir;
    // luz e fundo por cenário
    const fm = this.fundo.material as THREE.MeshBasicMaterial;
    const ceu: Record<string, string[]> =
      d === "A"
        ? { selecao: ["#e9c9a0", "#c98d5c"], ringue: ["#3a2a2a", "#1c1414"], estrada: ["#f7cf96", "#e6a26a", "#c97c52"], palco: ["#2a2230", "#151018"] }
        : { selecao: ["#3b2a6b", "#1b1236"], ringue: ["#2a1d5c", "#120c2a"], estrada: ["#8fd3ff", "#d9f1ff"], palco: ["#2b2140", "#151026"] };
    const ceuSet: Record<string, string[]> = { ...ceu, jornal: ["#ffe2b0", "#f2a65e"], escritorio: ["#cfe6ff", "#8fb7e8"], cidade: ["#6fc0ff", "#bfe6ff", "#ffe2a8"], vitrine: ["#3a2470", "#140c2a"] };
    const cores = e.ceu ?? ceuSet[e.set];
    const chave = e.set + d + cores.join();
    if (fm.userData.chave !== chave) {
      fm.map = texCeu(cores);
      fm.needsUpdate = true;
      fm.userData.chave = chave;
    }
    const L = e.luz ?? 1;
    if (e.set === "estrada") {
      this.sol.position.set(d === "A" ? -3 : -4, d === "A" ? 2.2 : 6, d === "A" ? 2.5 : 4);
      this.sol.intensity = (d === "A" ? 3.6 : 2.4) * L;
    } else if (e.set === "ringue") {
      this.sol.position.set(1.2, 6, 2.2);
      this.sol.intensity = (d === "A" ? 3.2 : 2.4) * L;
    } else {
      this.sol.position.set(d === "A" ? -2.2 : -2, d === "A" ? 3.2 : 4, 3);
      this.sol.intensity = (d === "A" ? 3.4 : 2.5) * L;
    }
    this.sol.target.position.set(0, 0.4, 0);
    this.contra.position.set(2.5, 2.5, -3);
    this.hemi.intensity = (d === "A" ? 0.9 : 1.5) * (0.4 + 0.6 * L);
    if (this.mesa) this.mesa.visible = true;
    // eclipse: céu escurece, coroa acende, janelas acendem
    const ec = e.set === "cidade" ? e.eclipse ?? 0 : 0;
    fm.color.setScalar(1 - 0.78 * ec);
    if (e.set === "cidade") {
      const u = this.objEclipse.userData;
      u.lua.position.x = (1 - ec) * 1.5;
      u.lua.position.y = (1 - ec) * 0.4;
      (u.coroa.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ec - 0.6) / 0.4;
      this.sol.intensity *= 1 - 0.75 * ec;
      this.hemi.intensity *= 1 - 0.55 * ec;
      this.objCidade.traverse((o) => {
        if (o.userData.janela) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = ec * 0.9;
      });
    }
    // jornal abrindo
    (this.objJornal.userData.dob as THREE.Object3D).rotation.y = -(1 - (e.jornal ?? 1)) * Math.PI * 0.98;
    // McWhopper se montando, camada por camada
    if (e.set === "vitrine") {
      const m = e.mcw ?? { monta: 1, giro: 0 };
      this.objMcw.rotation.y = m.giro;
      const n = 12;
      for (const pp of this.objMcwPartes) {
        const u0 = pp.ordem / n;
        const u = Math.min(1, Math.max(0, (m.monta - u0) / 0.16));
        const k2 = 1 - Math.pow(1 - u, 3);
        pp.o.position.y = pp.y0 + (1 - k2) * 3.5;
        pp.o.visible = u > 0.001;
      }
    }
    // carro
    if (e.carro && e.set === "estrada") {
      this.objCarro.visible = true;
      this.objCarro.position.set(e.carro.x, 0, e.carro.z);
      this.objCarro.rotation.y = e.carro.rotY;
      (this.objCarro.userData.copo as THREE.Object3D).visible = e.carro.copo;
      for (const r of this.objCarro.userData.rodas as THREE.Object3D[]) r.rotation.x = -e.carro.z * 16;
    } else this.objCarro.visible = false;
    this.objGigante.visible = (e.gigante ?? 0) > 0.001;
    this.objGigante.scale.setScalar(0.4 + 0.6 * (e.gigante ?? 0));
    // grelha
    const gr = e.grelha;
    this.objGrelha.visible = !!gr?.vis;
    const carneMat = (this.objGrelha.userData.carneM as THREE.Mesh).material as THREE.MeshStandardMaterial;
    carneMat.emissiveIntensity = (gr?.brilho ?? 0) * 3.6;
    if (gr?.vis) animaGrelha(this.objGrelha, t, gr.chama);

    // bonecos
    const bons: [Boneco, Pose | undefined][] = [
      [this.rei, e.rei],
      [this.ronald, e.ronald],
      [this.execMc, e.execMc],
      [this.execBk, e.execBk],
    ];
    for (const [b, p] of bons) {
      if (!p) b.raiz.visible = false;
      else b.aplica(p, t);
    }

    // câmera (com tremor de impacto)
    const tr = e.tremor ?? 0;
    const sh = (s: number) => Math.sin(t * 61 + s) * tr * 0.02;
    this.camera.position.set(e.cam.pos[0] + sh(1), e.cam.pos[1] + sh(2), e.cam.pos[2]);
    this.camera.fov = e.cam.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(new THREE.Vector3(...e.cam.alvo));
    if (e.cam.rolo) this.camera.rotateZ(e.cam.rolo);

    if (this.tiltH && this.tiltV) {
      const f = e.foco ?? 0.45;
      this.tiltH.uniforms.centro.value = f;
      this.tiltV.uniforms.centro.value = f;
    }
    this.final.uniforms.tempo.value = t;

    // virada IA: arame laranja + partículas
    const w = e.wire ?? 0;
    this.aplicaWire(w > 0.001);
    if (this.plateia) this.plateia.visible = w < 0.001;
    this.wireMat.opacity = 0.35 + 0.6 * w;
    (this.part.material as THREE.PointsMaterial).opacity = (e.part ?? 0) * 0.9;
    this.part.rotation.y = t * 0.15;
    this.final.uniforms.ia.value = w;
  }

  private aplicaWire(on: boolean) {
    if (on === this.wireAtivo) return;
    this.wireAtivo = on;
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || o === this.fundo) return;
      if (on) {
        this.originais.set(m, m.material);
        m.material = o.userData.contorno ? new THREE.MeshBasicMaterial({ visible: false }) : this.wireMat;
      } else {
        const orig = this.originais.get(m);
        if (orig) m.material = orig;
      }
    });
    (this.fundo.material as THREE.MeshBasicMaterial).color.set(on ? TINTA.clone().multiplyScalar(4) : 0xffffff);
    this.renderer.shadowMap.enabled = !on;
  }

  render() {
    this.composer.render();
  }
}

const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.17, 0.52, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) {
        float k = exp(-float(i*i)/24.0);
        s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k;
      }
      gl_FragColor = s / w;
    }`,
};

const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 }, pix: { value: 0 }, ia: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, pix, ia; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    float bayer(vec2 p){
      int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
      int i = x + y*4;
      float m[16];
      m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for (int k=0;k<16;k++){ if (k==i) return m[k]/16.0; }
      return 0.0;
    }
    void main(){
      vec2 uv = vUv;
      vec3 col;
      if (pix > 0.5) {
        vec2 g = floor(uv * res / pix);
        vec2 c = (g + 0.5) * pix / res;
        col = texture2D(tDiffuse, c).rgb;
        // paleta de 16 bits: 6 níveis por canal com pontilhado ordenado
        float b = bayer(g) - 0.5;
        col = floor(col * 5.0 + 0.5 + b * 0.55) / 5.0;
        // linhas de varredura discretas
        float sl = mod(floor(uv.y * res.y), pix);
        col *= sl < 1.0 ? 0.86 : 1.0;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      col += vec3(quente, quente*0.35, -quente);
      vec2 cc = vUv - 0.5;
      float v = 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col *= v;
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
