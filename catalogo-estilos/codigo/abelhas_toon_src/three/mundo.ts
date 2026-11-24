import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { apontaY, capsula, cil, Dir, esfera, Kit, tubo, V3 } from "./kit";
import { rng } from "./rng";
import { texCeu, texMadeira, texXadrez } from "./tex";
import {
  abelha, banca, caixote, faca, fatiaLaranja, fatiaPao, florLaranjeira, florMaracuja, laranja, maracuja, meiaLaranja,
  meioMaracuja, morango, pilhaFrutas, pincel, prato, ramoLaranjeira, ramoMaracuja, tabua, vapor, xicara,
} from "./objetos";
import { Mao, sdCapsula, sdCilindro, sdEsfera, sdUniao, SDF } from "./mao";

export type Plano = string | "gancho" | "corte" | "maracuja" | "prato" | "virada" | "maos" | "maos2" | "mfA" | "mfB" | "mcA" | "mcB" | "mgA" | "corteW" | "pratoW";
const LARANJA = new THREE.Color("#FF6B2C");
const TINTA = new THREE.Color("#0B1026");
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

type Conf = {
  g: THREE.Group;
  cam: { pos: THREE.Vector3; alvo: THREE.Vector3; fov: number };
  foco?: number;
  ceu: string[];
  sol: { dir: THREE.Vector3; ext: number; alvo: THREE.Vector3 };
  corte?: number; // divisão da tela (0..1) para a metade sem cor
  wire?: boolean;
  mostra?: Plano; // reaproveita o grupo de outro plano
  obj?: any; // alças para animar
};

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
  sol: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  contra: THREE.DirectionalLight;
  fundo: THREE.Mesh;
  cache = new Map<Plano, Conf>();
  wireMat = new THREE.MeshBasicMaterial({ color: LARANJA, wireframe: true, transparent: true, opacity: 0.85 });
  part: THREE.Points;
  log: string[] = [];

  constructor(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
    this.dir = dir;
    this.W = W;
    this.H = H;
    this.k = new Kit(dir, W, H);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = dir === "C" ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = dir === "B" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = dir === "C" ? 1.0 : 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.005, 200);
    this.scene.add(this.camera);
    if (dir !== "B") {
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = dir === "A" ? 0.45 : 0.32;
    }
    // luzes (receita de cada estilo)
    const corSol = dir === "A" ? 0xffcf9a : dir === "C" ? 0xfff0dc : 0xffffff;
    this.sol = new THREE.DirectionalLight(corSol, dir === "A" ? 3.4 : dir === "C" ? 3.1 : 2.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = dir === "C" ? -0.0002 : -0.0004;
    this.sol.shadow.normalBias = 0.01;
    if (dir === "C") {
      this.sol.shadow.radius = 9;
      this.sol.shadow.blurSamples = 20;
    }
    this.scene.add(this.sol, this.sol.target);
    this.hemi = new THREE.HemisphereLight(dir === "A" ? 0xcfe0ff : dir === "C" ? 0xfff6ee : 0xffffff, dir === "A" ? 0x8a5a3a : dir === "C" ? 0xb59a88 : 0x99887a, dir === "A" ? 0.9 : dir === "C" ? 0.5 : 1.5);
    this.scene.add(this.hemi);
    this.contra = new THREE.DirectionalLight(dir === "A" ? 0xffe2b8 : dir === "C" ? 0xffe8d0 : 0xfff2dd, dir === "A" ? 1.6 : dir === "C" ? 1.1 : 1.4);
    this.scene.add(this.contra);
    this.fundo = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, fog: false }));
    this.fundo.material.toneMapped = false;
    this.scene.add(this.fundo);

    // partículas da virada
    const n = 1600;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const r = rng(33);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, rr = 0.02 + Math.pow(r(), 0.6) * 0.16;
      p.set([Math.cos(a) * rr, (r() - 0.4) * 0.22, Math.sin(a) * rr - 0.03], i * 3);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.part = new THREE.Points(geo, new THREE.PointsMaterial({ color: LARANJA, size: 0.0016, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.part.visible = false;
    this.scene.add(this.part);

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
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
    this.final.uniforms.grao.value = dir === "A" ? 0.035 : dir === "C" ? 0.018 : 0.0;
    this.final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.32;
    this.final.uniforms.quente.value = dir === "A" ? 0.025 : dir === "C" ? 0.012 : 0.0;
    this.composer.addPass(this.final);
  }

  // ------------------------------------------------------------------ chão / mesa
  mesa(g: THREE.Group, y: number, tam = 4, tipo: "madeira" | "xadrez" | "massa" | "rua" = "madeira", cor?: string) {
    const k = this.k;
    let mat: THREE.Material;
    if (tipo === "madeira") {
      const t = texMadeira(k.dir !== "A");
      t.repeat.set(tam * 1.4, tam * 1.4);
      mat = k.mat({ map: t, rough: 0.55, clear: 0.3, semContorno: true });
    } else if (tipo === "xadrez") {
      const t = texXadrez(cor ?? "#e8473a", "#fff");
      t.repeat.set(tam * 5, tam * 5);
      mat = k.mat({ map: t, rough: 0.9, semContorno: true });
    } else mat = k.mat({ color: cor ?? "#a8c8e0", rough: 0.9, semContorno: true });
    const ch = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), mat);
    ch.rotation.x = -Math.PI / 2;
    ch.position.y = y;
    ch.receiveShadow = true;
    g.add(ch);
    return ch;
  }

  /** Base da maquete (tábua com corte lateral) — só A. */
  baseMaquete(g: THREE.Group, w: number, d: number, topo: number, corTopo: string, corLado = "#7a5236") {
    const k = this.k;
    k.m(new RoundedBoxGeometry(w + 0.04, 0.025, d + 0.04, 3, 0.006), k.mat({ color: "#caa071", rough: 0.6 }), 2, g, [0, topo - 0.045 - 0.0125, 0]);
    k.m(new THREE.BoxGeometry(w, 0.045, d), k.mat({ color: corLado, rough: 0.95 }), 2, g, [0, topo - 0.0225, 0]);
    k.m(new THREE.BoxGeometry(w, 0.006, d), k.mat({ color: corTopo, rough: 0.8 }), 2, g, [0, topo - 0.003, 0]);
  }

  // ------------------------------------------------------------------ planos
  conf(p: Plano): Conf {
    let c = this.cache.get(p);
    if (!c) {
      c = (this as unknown as Record<string, () => Conf>)["p_" + p].call(this);
      this.cache.set(p, c);
      this.scene.add(c.g);
    }
    return c;
  }

  // 1 · GANCHO — abelha pousando na flor de laranjeira
  p_gancho(): Conf {
    const k = this.k, d = this.dir;
    const g = new THREE.Group();
    if (d === "A") {
      // laranjeira de brinquedo num vaso, sobre a tábua
      this.mesa(g, -0.07, 6, "madeira");
      this.baseMaquete(g, 0.5, 0.36, 0, "#6b4a2e");
      const tronco = k.mat({ color: "#6e4a2e", rough: 0.8 });
      k.m(tubo([[0, 0, 0], [0.01, 0.12, 0], [-0.005, 0.24, 0.01]], (u) => 0.016 - 0.006 * u, 20, 12), tronco, 2, g);
      const copa = k.mat({ color: "#3f7a32", rough: 0.6 });
      const r = rng(8);
      const bolas: [V3, number][] = [
        [[0, 0.33, 0], 0.11], [[-0.08, 0.3, 0.03], 0.08], [[0.085, 0.31, 0.02], 0.085], [[0.02, 0.4, -0.02], 0.085], [[-0.03, 0.27, 0.06], 0.075],
      ];
      for (const [p, rr] of bolas) k.m(esfera(rr, 36, 24), copa, 2, g, p);
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2, b = r() * 0.9 - 0.2;
        const pp = V(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.8, Math.sin(a) * Math.cos(b)).multiplyScalar(0.105).add(V(0, 0.33, 0));
        if (pp.z < 0.02) continue;
        const l = laranja(k, 0.018);
        l.position.copy(pp);
        g.add(l);
      }
      // flores na frente da copa
      const ff: [V3, V3, number][] = [
        [[0.03, 0.335, 0.108], [0.25, 0.4, 1], 2.1],
        [[-0.05, 0.37, 0.085], [-0.4, 0.6, 1], 1.6],
        [[0.09, 0.37, 0.06], [0.7, 0.6, 0.6], 1.5],
        [[-0.07, 0.27, 0.1], [-0.3, 0.1, 1], 1.5],
      ];
      for (const [p, ax, s] of ff) {
        const f = florLaranjeira(k, 1);
        f.position.set(...p);
        apontaY(f, V(...ax));
        f.scale.setScalar(s);
        g.add(f);
      }
      const ab = abelha(k, { asas: 0.9 });
      ab.scale.setScalar(2.2);
      this.pousa(ab, V(0.012, 0.36, 0.118), V(0.3, 1, 0.4), V(1, -0.4, 0.5), 0);
      g.add(ab);
      // grama/terra no vaso
      k.m(cil(0.07, 0.06, 0.05, 32), k.mat({ color: "#c9653a", rough: 0.7 }), 2, g, [0, 0.025, 0]);
      const alvo = V(0.02, 0.33, 0.1);
      return { g, cam: { pos: V(0.22, 0.55, 0.95), alvo: V(0.01, 0.34, 0.06), fov: 30 }, foco: 0.62, ceu: ["#e9c9a0", "#c98d5c"], sol: { dir: V(-1.2, 1.1, 1.0), ext: 0.6, alvo } };
    }
    const ramo = ramoLaranjeira(k);
    g.add(ramo);
    const ab = abelha(k, { asas: 0.95 });
    ab.scale.setScalar(1.4);
    // chegando para pousar: acima e à esquerda da flor, de frente para ela
    this.pousa(ab, V(-0.013, 0.017, 0.008), V(0.35, 1, 0.15), V(1, -0.45, 0.55), 0);
    g.add(ab);
    if (d === "B") {
      // fundo: copas de laranjeira de desenho, longe
      const copa = k.mat({ color: "#49b84a", rough: 0.9 });
      const r = rng(3);
      for (let i = 0; i < 6; i++) {
        const p = V(-0.3 + i * 0.12 + r() * 0.04, -0.42 + r() * 0.1, -1.4 - r() * 0.3);
        k.m(esfera(0.12 + r() * 0.05, 28, 18), copa, 3, g, [p.x, p.y, p.z]);
        for (let j = 0; j < 3; j++) k.m(esfera(0.022, 16, 12), k.mat({ color: "#ff8a14" }), 2, g, [p.x + (r() - 0.5) * 0.14, p.y + r() * 0.08, p.z + 0.11]);
      }
      const alvo = V(-0.004, 0.006, 0);
      return { g, cam: { pos: V(0.03, 0.04, 0.24), alvo: V(-0.004, 0.022, 0), fov: 30 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 0.25, alvo } };
    }
    // C: a mão de quem assiste segura o raminho
    this.mesa(g, -0.42, 4, "massa", "#e8cfa8");
    const m = new Mao(k, "R").addTo(g);
    const a = V(-0.19, 0.96, -0.17).normalize();
    const H = V(0.022, -0.105, 0.012);
    this.pegaBastao(m, a, H, V(0.9, 0.0, 0.45), 0.0034);
    m.fecha(sdCapsula(V(0.03, -0.15, 0.02), V(0.008, -0.04, 0), 0.0034));
    m.fechaPolegar(sdCapsula(V(0.03, -0.15, 0.02), V(0.008, -0.04, 0), 0.0034));
    this.bracoPara(m, V(0.2, -0.35, 0.3));
    this.log.push("gancho folga " + m.folgaMin(sdCapsula(V(0.03, -0.15, 0.02), V(0.008, -0.04, 0), 0.0034)).toFixed(4));
    const alvo = V(0.0, -0.025, 0);
    return { g, cam: { pos: V(0.03, 0.03, 0.19), alvo: V(-0.002, -0.005, 0), fov: 50 }, ceu: ["#bfe0f2", "#f8e6cc", "#f4cfa6"], sol: { dir: V(-1, 1.4, 1.1), ext: 0.3, alvo } };
  }

  /** Abelha pousada: patas para a flor, frente para `frente`. */
  pousa(ab: THREE.Object3D, c: THREE.Vector3, eixo: THREE.Vector3, frente: THREE.Vector3, alt: number) {
    const Y = eixo.clone().normalize();
    const Z = frente.clone().sub(Y.clone().multiplyScalar(frente.dot(Y))).normalize();
    const X = new THREE.Vector3().crossVectors(Y, Z);
    ab.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    ab.position.copy(c).add(Y.multiplyScalar(alt));
  }

  /** Pegada de punho num bastão: `a` = para onde aponta o polegar; H = ponto do eixo no meio da mão. */
  pegaBastao(m: Mao, a: THREE.Vector3, H: THREE.Vector3, Nhint: THREE.Vector3, r: number, phi = 0, yLocal = 0.086) {
    const X = a.clone().normalize().negate();
    let N = Nhint.clone().sub(X.clone().multiplyScalar(Nhint.dot(X))).normalize();
    let F = new THREE.Vector3().crossVectors(N, X);
    if (phi) {
      const q = new THREE.Quaternion().setFromAxisAngle(N, phi);
      F = F.applyQuaternion(q);
      N = N.clone();
    }
    const q = V(0, yLocal, -(0.0135 + r + 0.0015));
    const Xh = new THREE.Vector3().crossVectors(F, N);
    const W = H.clone().sub(Xh.clone().multiplyScalar(q.x)).sub(F.clone().multiplyScalar(q.y)).sub(N.clone().multiplyScalar(q.z));
    m.pose({ W, F, N, D: V(0, -1, 0), curl: [0.2, 0.2, 0.2, 0.2], pol: { abd: 0.85, roll: -1.15, opp: 0.75, f1: 0.25, f2: 0.15 } });
    m.raiz.userData.F = F;
    m.raiz.userData.N = N;
    m.raiz.userData.W = W;
  }

  /** Mão em pegada de caneta com a ponta do pincel em A; o cabo aponta na direção `u` (cabo -> ponta). */
  seguraPincel(m: Mao, A: THREE.Vector3, u: THREE.Vector3, nHint: THREE.Vector3) {
    const pc = m.pegadaCaneta();
    const PONTA = 0.062; // da pinça até a ponta das cerdas
    const tipL = pc.P1.clone().add(pc.dir.clone().multiplyScalar(PONTA));
    const e1 = pc.dir.clone();
    const e2 = V(0, 0, 1).sub(e1.clone().multiplyScalar(e1.z)).normalize();
    const e3 = new THREE.Vector3().crossVectors(e1, e2);
    const f1 = u.clone().normalize();
    const f2 = nHint.clone().sub(f1.clone().multiplyScalar(nHint.dot(f1))).normalize();
    const f3 = new THREE.Vector3().crossVectors(f1, f2);
    const Ml = new THREE.Matrix4().makeBasis(e1, e2, e3);
    const Mw = new THREE.Matrix4().makeBasis(f1, f2, f3);
    const R = Mw.multiply(Ml.transpose());
    const q = new THREE.Quaternion().setFromRotationMatrix(R);
    const W = A.clone().sub(tipL.applyQuaternion(q));
    m.orienta(q, W);
    const pin = pincel(this.k);
    apontaY(pin, f1);
    pin.position.copy(A).sub(f1.clone().multiplyScalar(0.186));
    const sd = sdCapsula(pin.position.clone(), A.clone().sub(f1.clone().multiplyScalar(0.03)), 0.0048);
    this.log.push(`pincel sep ${pc.sep.toFixed(4)} folga ${m.folgaMin(sd).toFixed(4)}`);
    return pin;
  }

  /** Aponta o antebraço do punho para o ombro (fora do quadro). */
  bracoPara(m: Mao, ombro: THREE.Vector3) {
    const W = m.raiz.position.clone();
    const D = ombro.clone().sub(W).normalize();
    const N = (m.raiz.userData.N as THREE.Vector3) ?? V(0, 1, 0);
    const Nb = N.clone().sub(D.clone().multiplyScalar(N.dot(D))).normalize();
    const Xb = new THREE.Vector3().crossVectors(D, Nb);
    m.braco.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xb, D, Nb));
    m.braco.position.copy(W).add(D.clone().multiplyScalar(0.006));
  }

  // 2 · CAFÉ E LARANJA — o rastro da abelha passa por cima
  p_corte(): Conf {
    const k = this.k, d = this.dir;
    const g = new THREE.Group();
    if (d === "A") {
      this.mesa(g, -0.07, 6, "madeira");
      this.baseMaquete(g, 0.62, 0.46, 0, "#f1ece2", "#d7cbb8");
      // pedacinho de parede de azulejo da cozinha
      k.m(new THREE.BoxGeometry(0.62, 0.3, 0.02), k.mat({ color: "#bfe0d8", rough: 0.4 }), 2, g, [0, 0.15, -0.22]);
    } else if (d === "B") {
      this.mesa(g, 0, 4, "massa", "#ffd27a");
      k.m(new THREE.BoxGeometry(2, 1, 0.02), k.mat({ color: "#7fd3c4", rough: 0.9, semContorno: true }), 3, g, [0, 0.5, -0.3]);
      k.m(new THREE.BoxGeometry(0.42, 0.3, 0.02), k.mat({ color: "#bfeaff", emissive: "#bfeaff", ei: 0.4 }), 3, g, [0.12, 0.33, -0.285]);
    } else {
      this.mesa(g, 0, 4, "massa", "#f2d2a6");
      k.m(new THREE.BoxGeometry(2, 1, 0.03), k.mat({ color: "#a9d4c8", rough: 0.9 }), 3, g, [0, 0.5, -0.36]);
    }
    const tb = tabua(k);
    tb.position.set(0, 0, -0.02);
    g.add(tb);
    const R = 0.04;
    const O = V(-0.005, 0.022 + R * 0.94, -0.02);
    const fk = new THREE.Group();
    const fi = faca(k);
    fk.add(fi);
    g.add(fk);
    const suco = new THREE.MeshPhysicalMaterial({ color: "#ffb02e", roughness: 0.05, transparent: true, opacity: 0.8, clearcoat: 1 });
    const gota = (x: number, z: number, s: number) => {
      const go = new THREE.Mesh(esfera(0.004 * s, 14, 10), suco);
      go.scale.set(1.4, 0.35, 1.2);
      go.position.set(x, 0.0225, z);
      g.add(go);
    };
    if (d === "C") {
      const lar = laranja(k, R);
      lar.position.copy(O);
      lar.rotation.z = 0.3;
      g.add(lar);
      // faca atravessada: lâmina para a esquerda, entrando na laranja; cabo à direita
      fk.position.set(O.x + 0.055, O.y - 0.004, O.z + 0.004);
      fi.rotation.z = 0.12;
      const meia = meiaLaranja(k, R);
      meia.position.set(0.075, 0.022 + R, -0.13);
      meia.rotation.set(0.35, 0, -0.25);
      g.add(meia);
      for (const [x, z, s] of [[0.012, 0.02, 1], [0.02, 0.03, 0.6], [0.0, 0.028, 0.7]] as V3[]) gota(O.x + x, O.z + z, s);
    } else {
      // laranja recém-cortada: as duas metades com a polpa para cima e a faca deitada
      const m1 = meiaLaranja(k, R);
      m1.position.set(-0.045, 0.022 + R, -0.03);
      m1.rotation.set(0.25, 0, 0.12);
      g.add(m1);
      const m2 = meiaLaranja(k, R);
      m2.position.set(0.04, 0.022 + R, -0.0);
      m2.rotation.set(0.3, 0.5, -0.2);
      g.add(m2);
      fk.position.set(0.02, 0.0228, 0.07);
      fk.rotation.set(-Math.PI / 2, 0, 0.25);
      for (const [x, z, s] of [[-0.005, 0.03, 1], [0.012, 0.045, 0.7], [-0.02, 0.05, 0.6], [0.09, -0.02, 0.8]] as V3[]) gota(x, z, s);
    }
    const cup = xicara(k, d === "B" ? "#ff6f6f" : d === "C" ? "#f7f2ea" : "#ffffff");
    cup.position.set(-0.135, 0.012, -0.16);
    g.add(cup);
    const vp = vapor(3);
    vp.position.set(-0.135, 0.075, -0.16);
    g.add(vp);
    // rastro da abelha: do café, por cima da laranja
    const pts = [V(-0.135, 0.085, -0.16), V(-0.11, 0.15, -0.12), V(-0.05, 0.13, -0.04), V(0.0, 0.11, -0.01), V(0.04, 0.13, -0.05)];
    const curva = new THREE.CatmullRomCurve3(pts);
    const rastro = new THREE.Mesh(new THREE.TubeGeometry(curva, 80, 0.0018, 8), new THREE.MeshBasicMaterial({ color: "#ffd56a", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(rastro);
    const pg = new THREE.BufferGeometry();
    const pp: number[] = [];
    const r = rng(6);
    for (let i = 0; i < 90; i++) {
      const u = r();
      const c = curva.getPointAt(u);
      pp.push(c.x + (r() - 0.5) * 0.012, c.y + (r() - 0.5) * 0.012, c.z + (r() - 0.5) * 0.012);
    }
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pp, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: "#fff2b0", size: 0.0022, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
    const fant = abelha(k, { fantasma: true, asas: 0.9 });
    fant.scale.setScalar(2.4);
    fant.position.copy(pts[4]);
    fant.lookAt(pts[4].clone().add(V(0.5, 0.3, -0.4)));
    g.add(fant);

    if (d === "C") {
      // mão direita no cabo da faca, esquerda em garra segurando a laranja
      fk.updateWorldMatrix(true, true);
      const h0 = fi.localToWorld(V(0.012, 0.017, 0));
      const h1 = fi.localToWorld(V(0.11, 0.017, 0));
      const eixo = h1.clone().sub(h0).normalize();
      const H = fi.localToWorld(V(0.07, 0.017, 0));
      const mR = new Mao(k, "R").addTo(g);
      const sdCabo = sdCapsula(h0, h1, 0.0095);
      const sdTudo = sdUniao(sdCabo, sdEsfera(O, R), sdCilindro(V(0, 0.011, -0.02), V(0, 1, 0), 0.17, 0.011));
      this.pegaBastao(mR, eixo.clone().negate(), H, V(0.25, 1, 0.45), 0.0095);
      mR.fecha(sdTudo);
      mR.fechaPolegar(sdTudo);
      this.bracoPara(mR, V(0.3, 0.14, 0.42));
      this.log.push("faca folga " + mR.folgaMin(sdTudo).toFixed(4));
      // garra: palma sobre a laranja, pontas dos dedos encostando
      const mL = new Mao(k, "L").addTo(g);
      const F = V(0.55, -0.6, -0.55).normalize();
      const N = V(-0.35, 0.75, 0.25);
      const sdL = sdUniao(sdEsfera(O, R), sdCilindro(V(0, 0.011, -0.02), V(0, 1, 0), 0.17, 0.011));
      mL.pose({ W: V(0, 0, 0), F, N, D: V(-0.3, 0.3, 1), curl: [0.4, 0.4, 0.4, 0.4], pol: { abd: 0.45, roll: -1.0, opp: 0.55, f1: 0.2, f2: 0.2 } });
      // posiciona: centro da palma acima-esquerda da laranja
      const pc = mL.ponto(0, 0.065, -0.0135);
      const alvoP = O.clone().add(V(-0.06, 0.05, 0.015));
      mL.raiz.position.add(alvoP.sub(pc));
      mL.raiz.userData.N = N;
      mL.fecha(sdL, [0, 1, 2, 3], { ini: [0.4, 0.4, 0.4, 0.4] });
      mL.fechaPolegar(sdL);
      this.bracoPara(mL, V(-0.26, 0.12, 0.42));
      this.log.push("garra folga " + mL.folgaMin(sdL).toFixed(4));
      const alvo = V(-0.015, 0.04, -0.05);
      return { g, cam: { pos: V(0.0, 0.62, 0.44), alvo: V(0.0, 0.03, -0.06), fov: 44 }, ceu: ["#f3dcc0", "#f3dcc0"], sol: { dir: V(-0.9, 1.4, 0.4), ext: 0.45, alvo } };
    }
    const alvo = V(-0.02, 0.05, -0.06);
    if (d === "A") return { g, cam: { pos: V(0.12, 0.42, 0.62), alvo, fov: 30 }, foco: 0.47, ceu: ["#e9c9a0", "#c98d5c"], sol: { dir: V(-1.3, 1.0, 0.9), ext: 0.5, alvo } };
    return { g, cam: { pos: V(0.1, 0.32, 0.5), alvo, fov: 30 }, ceu: ["#ffe6a8", "#ffd27a"], sol: { dir: V(-1, 1.5, 1.1), ext: 0.4, alvo } };
  }

  // 3 · MARACUJÁ — banca vazia e o pincel passando o pólen
  p_maracuja(): Conf {
    const k = this.k, d = this.dir;
    const g = new THREE.Group();
    const es = d === "A" ? 0.16 : 1; // escala da feira
    const feira = new THREE.Group();
    feira.scale.setScalar(es);
    g.add(feira);
    if (d === "A") {
      this.mesa(g, -0.07, 6, "madeira");
      this.baseMaquete(g, 0.62, 0.5, 0, "#cdbf9f", "#8a6a48");
    } else this.mesa(g, 0, 30, "massa", d === "B" ? "#f1dfb0" : "#e6d2b0");
    const b1 = banca(k, { toldo: ["#ffcf3a", "#ffffff"], saia: "#3fae6a", placa: "MARACUJÁ" });
    b1.position.set(0.15, 0, d === "A" ? -0.6 : -1.15);
    feira.add(b1);
    const topo = b1.userData.topo as number;
    // caixotes vazios (sobrou 1 maracujá)
    for (const [x, n] of [[-0.38, 0], [0.0, 1], [0.38, 0]] as [number, number][]) {
      const cx = caixote(k);
      cx.position.set(x, topo, 0.02);
      b1.add(cx);
      if (n) {
        const mf = maracuja(k, 0.042);
        mf.position.set(x - 0.06, topo + 0.06, 0.04);
        mf.rotation.z = 1.3;
        b1.add(mf);
      }
    }
    // banca vizinha, cheia (laranjas)
    const b2 = banca(k, { toldo: ["#e8473a", "#ffffff"], saia: "#2f6fb8" });
    b2.position.set(-1.25, 0, d === "A" ? -0.9 : -1.6);
    b2.rotation.y = 0.25;
    feira.add(b2);
    for (const x of [-0.38, 0, 0.38]) {
      const cx = caixote(k);
      cx.position.set(x, b2.userData.topo, 0.02);
      b2.add(cx);
      const pf = pilhaFrutas(k, 14, 0.04, "#ff8a14", 0.3, 0.22, Math.round(x * 10 + 5));
      pf.position.set(x, b2.userData.topo, 0.02);
      b2.add(pf);
    }
    if (d === "A") {
      // pergolado com o maracujazeiro e o boneco do produtor com o pincel
      const mad = k.mat({ color: "#8a5a36", rough: 0.8 });
      for (const x of [-0.2, 0.12]) k.m(new THREE.BoxGeometry(0.014, 0.3, 0.014), mad, 2, g, [x, 0.15, 0.05]);
      k.m(new THREE.BoxGeometry(0.36, 0.014, 0.014), mad, 2, g, [-0.04, 0.3, 0.05]);
      const rm = ramoMaracuja(k);
      rm.scale.setScalar(0.85);
      rm.position.set(-0.04, 0.255, 0.06);
      g.add(rm);
      const fl = florMaracuja(k);
      fl.scale.setScalar(0.85);
      fl.position.set(-0.035, 0.205, 0.09);
      apontaY(fl, V(0.15, 0.5, 1));
      g.add(fl);
      const boneco = this.produtor();
      boneco.position.set(0.05, 0, 0.16);
      boneco.rotation.y = -0.75;
      g.add(boneco);
      boneco.updateWorldMatrix(true, true);
      const ponta = (boneco.userData.pincel as THREE.Object3D).localToWorld(V(0, 0.186, 0));
      fl.position.copy(ponta).add(V(-0.006, -0.012, -0.004));
      const alvo = V(-0.02, 0.2, 0.08);
      return { g, cam: { pos: V(0.24, 0.36, 0.8), alvo: V(-0.01, 0.17, 0.05), fov: 30 }, foco: 0.5, ceu: ["#e9c9a0", "#c98d5c"], sol: { dir: V(-1.2, 1.1, 1.0), ext: 0.6, alvo } };
    }
    // flor e ramo em primeiro plano, na altura do peito
    const rm = ramoMaracuja(k);
    rm.position.set(0.0, 1.22, -0.3);
    g.add(rm);
    const fl = florMaracuja(k);
    const FC = V(-0.005, 1.24, -0.27);
    fl.position.copy(FC);
    apontaY(fl, V(0.1, 0.75, 0.65));
    g.add(fl);
    fl.updateWorldMatrix(true, true);
    const an = (fl.userData.anteras as THREE.Object3D[])[1];
    const A = an.getWorldPosition(V(0, 0, 0));
    // pincel (pegada de caneta) encostando na antera
    const mR = new Mao(k, "R").addTo(g);
    const dirP = V(-0.6, -0.3, -0.72).normalize(); // do cabo para a ponta
    const pin = this.seguraPincel(mR, A, dirP, V(0.3, 1, 0.35));
    g.add(pin);
    this.bracoPara(mR, V(0.32, 1.02, 0.3));
    if (d === "B") {
      const alvo = V(0.0, 1.18, -0.4);
      return { g, cam: { pos: V(0.06, 1.48, 0.12), alvo, fov: 48 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 1.2, alvo } };
    }
    const alvo = V(0.0, 1.17, -0.4);
    return { g, cam: { pos: V(0.05, 1.47, 0.1), alvo, fov: 52 }, ceu: ["#bfe0f2", "#f8e6cc", "#f4cfa6"], sol: { dir: V(-1, 1.4, 1.1), ext: 1.3, alvo } };
  }

  /** Boneco colecionável do produtor (maquete): base preta, chapéu de palha, pincel na mão. */
  produtor() {
    const k = this.k;
    const g = new THREE.Group();
    k.m(cil(0.045, 0.047, 0.01, 40), k.mat({ color: "#16161a", rough: 0.25, clear: 0.9 }), 2, g, [0, 0.005, 0]);
    const calca = k.mat({ color: "#3b5a8a", rough: 0.6 });
    for (const s of [-1, 1]) k.m(capsula(0.011, 0.05), calca, 2, g, [s * 0.013, 0.045, 0]);
    k.m(capsula(0.026, 0.04), k.mat({ color: "#e8473a", rough: 0.6 }), 2, g, [0, 0.105, 0], undefined, [1, 1, 0.8]);
    const pele = k.mat({ color: "#c98a62", rough: 0.6 });
    k.m(esfera(0.024, 28, 20), pele, 2, g, [0, 0.165, 0]);
    for (const s of [-1, 1]) k.m(esfera(0.0032, 10, 8), k.mat({ color: "#1a1410", rough: 0.3 }), 1, g, [s * 0.008, 0.168, 0.022]);
    k.m(cil(0.044, 0.044, 0.004, 36), k.mat({ color: "#e2c26a", rough: 0.8 }), 2, g, [0, 0.183, 0]);
    k.m(cil(0.02, 0.024, 0.02, 30), k.mat({ color: "#e2c26a", rough: 0.8 }), 2, g, [0, 0.195, 0]);
    // braço esquerdo para baixo, direito erguido com o pincel
    k.m(capsula(0.008, 0.05), k.mat({ color: "#e8473a", rough: 0.6 }), 2, g, [0.031, 0.1, 0], [0, 0, 0.15]);
    const br = new THREE.Group();
    br.position.set(-0.03, 0.125, 0);
    br.rotation.set(0.6, 0, 1.0);
    g.add(br);
    k.m(capsula(0.008, 0.05), k.mat({ color: "#e8473a", rough: 0.6 }), 2, br, [0, 0.03, 0]);
    k.m(esfera(0.009, 14, 10), pele, 1.5, br, [0, 0.062, 0]);
    const pin = pincel(k);
    g.userData.pincel = pin;
    pin.scale.setScalar(0.6);
    pin.position.set(0, 0.03, 0.0);
    pin.rotation.set(-0.9, 0, -0.35);
    br.add(pin);
    return g;
  }

  // 4 · O PRATO — metade com cor, metade sem
  p_prato(): Conf {
    const k = this.k, d = this.dir;
    const g = new THREE.Group();
    const elev = d === "C" ? 0.085 : 0;
    if (d === "A") {
      this.mesa(g, -0.07, 6, "madeira");
      this.baseMaquete(g, 0.5, 0.42, 0, "#b98a5a", "#7a5236");
    } else if (d === "B") this.mesa(g, 0, 4, "xadrez", "#3f8ee8");
    else this.mesa(g, 0, 4, "massa", "#9cc3df");
    const R = d === "C" ? 0.118 : 0.13;
    const pr = new THREE.Group();
    pr.position.set(0, elev, 0);
    if (d === "C") pr.rotation.x = 0.12;
    g.add(pr);
    pr.add(prato(k, R));
    const S = 0.005;
    const ml = meiaLaranja(k, 0.034);
    ml.position.set(-0.05, S + 0.034, 0.035);
    pr.add(ml);
    for (const [x, z, rot, y] of [[-0.005, -0.03, 0.2, 0.004], [0.028, -0.042, 0.5, 0.009], [-0.035, -0.06, -0.3, 0.012]] as [number, number, number, number][]) {
      const f = fatiaLaranja(k, 0.03, 0.006);
      f.position.set(x, S + y, z);
      f.rotation.set(0.05, rot, 0.08);
      pr.add(f);
    }
    const mm = meioMaracuja(k, 0.031);
    mm.position.set(0.055, S + 0.034, 0.03);
    pr.add(mm);
    for (const [x, z, a] of [[0.0, 0.07, 0.3], [0.025, 0.055, 1.5], [-0.02, 0.06, 2.6]] as V3[]) {
      const mo = morango(k, 1);
      mo.position.set(x, S + 0.013, z);
      mo.rotation.set(0, a, Math.PI / 2);
      pr.add(mo);
    }
    const pao = fatiaPao(k);
    pao.position.set(0.05, S + 0.008, -0.055);
    pao.rotation.y = 0.5;
    pr.add(pao);
    const cup = xicara(k, d === "B" ? "#ff6f6f" : d === "C" ? "#f7f2ea" : "#ffffff");
    cup.position.set(0.17, 0.012, -0.12);
    g.add(cup);
    const PC = V(0, elev, 0);
    if (d === "C") {
      pr.updateWorldMatrix(true, true);
      const up = V(0, 1, 0).applyQuaternion(pr.quaternion);
      const sdPr = sdCilindro(pr.localToWorld(V(0, 0.009, 0)), up, R, 0.0095);
      for (const lado of ["R", "L"] as const) {
        const s = lado === "R" ? 1 : -1;
        const m = new Mao(k, lado).addTo(g);
        // dedos por baixo apontando para o centro e para longe; polegar por cima da borda
        const F = V(-s * 0.75, 0.05, -0.65).normalize();
        const N = V(s * 0.25, -1, 0.15);
        m.pose({ W: V(0, 0, 0), F, N, D: V(s * 0.4, -0.35, 1), curl: [0.15, 0.15, 0.15, 0.15], abre: 0.4, pol: { abd: 1.15, roll: -0.6, opp: 0.2, f1: 0.1, f2: 0.1 } });
        const base = m.ponto(0, 0.09, -0.0135);
        const borda = pr.localToWorld(V(s * R * 0.88, -0.006, 0.05));
        m.raiz.position.add(borda.sub(base));
        m.raiz.userData.N = N;
        m.raiz.updateWorldMatrix(true, true);
        m.fecha(sdPr, [0, 1, 2, 3], { ini: [0.0, 0.0, 0.0, 0.0] });
        m.fechaPolegar(sdPr, 2.0);
        this.bracoPara(m, V(s * 0.24, -0.1, 0.45));
        this.log.push("prato " + lado + " folga " + m.folgaMin(sdPr).toFixed(4));
      }
      const alvo = PC.clone().add(V(0, 0.0, -0.01));
      return { g, cam: { pos: V(0.0, 0.6, 0.44), alvo: alvo.clone().add(V(0, -0.03, -0.01)), fov: 50 }, corte: 0.5, ceu: ["#f3dcc0", "#f3dcc0"], sol: { dir: V(-0.9, 1.5, 0.6), ext: 0.4, alvo } };
    }
    const alvo = PC.clone().add(V(0.01, 0.01, 0));
    if (d === "A") return { g, cam: { pos: V(0.0, 0.62, 0.52), alvo, fov: 30 }, foco: 0.5, corte: 0.5, ceu: ["#e9c9a0", "#c98d5c"], sol: { dir: V(-1.3, 1.1, 0.8), ext: 0.4, alvo } };
    return { g, cam: { pos: V(0.0, 0.66, 0.42), alvo, fov: 30 }, corte: 0.5, ceu: ["#ffe6a8", "#ffd27a"], sol: { dir: V(-1, 1.6, 0.9), ext: 0.4, alvo } };
  }

  // 5 · VIRADA — o ramo vira arame laranja sobre azul-tinta
  p_virada(): Conf {
    const k = this.k;
    const g = new THREE.Group();
    const ramo = ramoLaranjeira(k);
    g.add(ramo);
    const ab = abelha(k, { asas: 0.95 });
    ab.scale.setScalar(1.4);
    this.pousa(ab, V(-0.013, 0.017, 0.008), V(0.35, 1, 0.15), V(1, -0.45, 0.55), 0);
    g.add(ab);
    const alvo = V(-0.006, 0.0, 0);
    return { g, cam: { pos: V(0.11, 0.12, 0.5), alvo: V(0.075, 0.085, 0), fov: 30 }, ceu: ["#0B1026", "#0B1026"], sol: { dir: V(-1, 1.6, 1.2), ext: 0.25, alvo }, wire: true };
  }

  // bancada de teste das mãos (POV e de lado)
  p_maos(): Conf {
    const k = this.k;
    const g = new THREE.Group();
    this.mesa(g, -0.45, 4, "massa", "#e8dcc8");
    const F = V(0, -0.25, -1).normalize(), N = V(0, 1, -0.25);
    // 1 mão aberta
    const m1 = new Mao(k, "R").addTo(g);
    m1.pose({ W: V(-0.06, 0.24, 0.05), F, N, D: V(0, 0.3, 1), curl: [0.1, 0.1, 0.12, 0.15] });
    // 2 punho num bastão vertical
    const m2 = new Mao(k, "R").addTo(g);
    const a = V(0, 1, 0), H = V(0.0, 0.06, -0.02);
    k.m(cil(0.0035, 0.0035, 0.16, 12), k.mat({ color: "#6e5236" }), 2, g, [H.x, H.y, H.z]);
    this.pegaBastao(m2, a, H, V(0.9, 0, 0.45), 0.0035);
    const sd2 = sdCapsula(H.clone().add(V(0, -0.08, 0)), H.clone().add(V(0, 0.08, 0)), 0.0035);
    m2.fecha(sd2);
    m2.fechaPolegar(sd2);
    this.bracoPara(m2, H.clone().add(V(0.3, -0.25, 0.3)));
    // 3 pincel
    const m3 = new Mao(k, "R").addTo(g);
    const A = V(-0.03, -0.12, -0.05);
    k.m(esfera(0.004, 12, 10), k.mat({ color: "#ffc928" }), 1, g, [A.x, A.y, A.z]);
    g.add(this.seguraPincel(m3, A, V(-0.5, -0.35, -0.8), V(0.3, 1, 0.3)));
    this.bracoPara(m3, A.clone().add(V(0.3, -0.25, 0.35)));
    // 4 garra na laranja
    const O = V(-0.02, -0.3, -0.04);
    const lr = laranja(k, 0.04);
    lr.position.copy(O);
    g.add(lr);
    const m4 = new Mao(k, "L").addTo(g);
    const sd4 = sdEsfera(O, 0.04);
    m4.pose({ W: V(0, 0, 0), F: V(0.55, -0.6, -0.55), N: V(-0.35, 0.75, 0.25), D: V(-0.3, 0.3, 1), curl: [0.4, 0.4, 0.4, 0.4] });
    const pc = m4.ponto(0, 0.065, -0.0135);
    m4.raiz.position.add(O.clone().add(V(-0.05, 0.055, 0.02)).sub(pc));
    m4.raiz.userData.N = V(-0.35, 0.75, 0.25);
    m4.fecha(sd4, [0, 1, 2, 3], { ini: [0.4, 0.4, 0.4, 0.4] });
    m4.polegarIK(O.clone().add(V(-0.045, 0.0, 0.02)));
    this.bracoPara(m4, O.clone().add(V(-0.3, 0.2, 0.35)));
    this.log.push("maos folgas " + [m2.folgaMin(sd2), m4.folgaMin(sd4)].map((x) => x.toFixed(4)).join(" "));
    const alvo = V(0, -0.03, 0);
    return { g, cam: { pos: V(0, 0.42, 0.95), alvo, fov: 38 }, ceu: ["#ece4d8", "#ece4d8"], sol: { dir: V(-1, 1.4, 1.1), ext: 0.6, alvo } };
  }
  p_maos2(): Conf {
    const c = this.conf("maos");
    const alvo = V(0, -0.03, -0.02);
    return { g: new THREE.Group(), cam: { pos: V(0.75, 0.15, 0.1), alvo, fov: 38 }, ceu: c.ceu, sol: c.sol, mostra: "maos" } as Conf;
  }

  // closes da bancada: punho (POV e de lado), pincel (POV e de lado), garra
  private dbg(pos: V3, alvo: V3, fov = 22): Conf {
    const c = this.conf("maos");
    return { g: new THREE.Group(), cam: { pos: V(...pos), alvo: V(...alvo), fov }, ceu: c.ceu, sol: c.sol, mostra: "maos" } as Conf;
  }
  p_corteW() { const c = this.conf("corte"); return { g: new THREE.Group(), cam: { pos: V(0.0, 0.9, 0.9), alvo: V(0, 0.05, -0.05), fov: 40 }, ceu: c.ceu, sol: c.sol, mostra: "corte" } as Conf; }
  p_pratoW() { const c = this.conf("prato"); return { g: new THREE.Group(), cam: { pos: V(0.0, 0.8, 0.9), alvo: V(0, 0.05, 0), fov: 40 }, ceu: c.ceu, sol: c.sol, mostra: "prato" } as Conf; }
  p_mfA() { return this.dbg([0.05, 0.3, 0.3], [0.0, 0.06, -0.02]); }
  p_mfB() { return this.dbg([0.3, 0.1, -0.15], [0.0, 0.06, -0.02]); }
  p_mcA() { return this.dbg([0.05, 0.1, 0.25], [-0.0, -0.12, -0.04]); }
  p_mcB() { return this.dbg([-0.25, -0.05, -0.2], [-0.0, -0.12, -0.04]); }
  p_mgA() { return this.dbg([-0.05, 0.0, 0.3], [-0.03, -0.27, -0.04]); }

  // ------------------------------------------------------------------ aplica
  mostra(p: Plano, t: number) {
    const c = this.conf(p);
    for (const [n, cc] of this.cache) cc.g.visible = n === p || n === c.mostra;
    const fm = this.fundo.material as THREE.MeshBasicMaterial;
    const chave = c.ceu.join();
    if (fm.userData.chave !== chave) {
      fm.map = texCeu(c.ceu);
      fm.needsUpdate = true;
      fm.userData.chave = chave;
    }
    const s = c.sol;
    this.sol.position.copy(s.alvo).add(s.dir.clone().normalize().multiplyScalar(s.ext * 4));
    this.sol.target.position.copy(s.alvo);
    const sc = this.sol.shadow.camera;
    sc.left = sc.bottom = -s.ext;
    sc.right = sc.top = s.ext;
    sc.near = s.ext * 0.5;
    sc.far = s.ext * 10;
    sc.updateProjectionMatrix();
    this.contra.position.copy(s.alvo).add(V(1.5, 1.2, -2).multiplyScalar(s.ext));
    this.camera.position.copy(c.cam.pos);
    this.camera.fov = c.cam.fov;
    this.camera.near = Math.max(0.003, c.cam.pos.distanceTo(c.cam.alvo) * 0.02);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(c.cam.alvo);
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = c.foco ?? 0.5;
    this.final.uniforms.tempo.value = t;
    this.final.uniforms.corte.value = c.corte ?? -1;
    if (c.wire) this.aplicaWire(c.g);
    this.part.visible = !!c.wire;
    if (c.wire) this.part.position.copy(c.cam.alvo);
    this.renderer.shadowMap.enabled = !c.wire;
    if (this.tiltH && this.tiltV) this.tiltH.enabled = this.tiltV.enabled = !c.wire;
  }

  aplicaWire(g: THREE.Group) {
    if (g.userData.wire) return;
    g.userData.wire = true;
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = o.userData.contorno ? new THREE.MeshBasicMaterial({ visible: false }) : this.wireMat;
      m.castShadow = false;
    });
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

// passada final: metade sem cor (corte), aquecimento, vinheta, grão
const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, corte: { value: -1 }, sat: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, corte, sat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col += vec3(quente, quente*0.35, -quente);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      float s = sat;
      if (corte >= 0.0) s *= mix(1.0, 0.04, smoothstep(corte - 0.002, corte + 0.002, vUv.x));
      col = mix(vec3(l), col, s);
      if (corte >= 0.0 && vUv.x > corte) col *= 0.93;
      vec2 cc = vUv - 0.5;
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
