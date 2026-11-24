import * as THREE from "three";
import { capsula, cil, esfera, Kit, perfil, torno, tubo, caixa, V3 } from "./kit";
import { clamp } from "./rng";

// Dirigente genérico dos anos 40 (terno e chapéu), traço simples, sem parecer pessoa real.
// Usado para o presidente (Mário Grosso, sem rosto real) e para os dirigentes rivais (sem escudo).
export type PoseDir = {
  vis?: boolean;
  pos?: V3;
  rotY?: number;
  pulo?: number;
  sq?: number;
  esc?: number;
  inclina?: number;
  cab?: V3;
  bE?: { abre: number; frente: number; cot: number };
  bD?: { abre: number; frente: number; cot: number };
  corre?: number; // fase da corrida (rad); undefined = parado
  pisca?: number; // 0..1 piscadela do olho esquerdo
  boca?: "sorri" | "O";
  sobr?: number; // sobrancelhas: -1 bravas .. 1 surpresas
  giro?: number; // giro da transformação
};

export class Dirigente {
  raiz = new THREE.Group();
  corpo = new THREE.Group();
  cabeca = new THREE.Group();
  ombroE = new THREE.Group();
  ombroD = new THREE.Group();
  cotE = new THREE.Group();
  cotD = new THREE.Group();
  pernaE = new THREE.Group();
  pernaD = new THREE.Group();
  olhoE = new THREE.Object3D();
  bocaS = new THREE.Group();
  bocaO = new THREE.Group();
  sobrs: THREE.Object3D[] = [];
  mao = new THREE.Group(); // ponto da mão direita (para a caneta)

  constructor(k: Kit, cores: { terno: number; gravata: number; chapeu: number; pele: number; bigode?: boolean }) {
    const mTerno = k.mat({ color: cores.terno, rough: 0.7, tom: 0.5 });
    const mCalca = k.mat({ color: new THREE.Color(cores.terno).multiplyScalar(0.8), rough: 0.7, tom: 0.4 });
    const mPele = k.mat({ color: cores.pele, rough: 0.6, tom: 0.95 });
    const mEsc = k.mat({ color: 0x1f1714, rough: 0.35, tom: 0.12 });
    const mBranco = k.mat({ color: 0xf6f4ef, rough: 0.5, tom: 1 });
    const mGrav = k.mat({ color: cores.gravata, rough: 0.5, tom: 0.4 });
    const mCh = k.mat({ color: cores.chapeu, rough: 0.7, tom: 0.35 });
    this.raiz.add(this.corpo);
    // pernas
    for (const [s, p] of [[1, this.pernaE], [-1, this.pernaD]] as const) {
      p.position.set(s * 0.09, 0.42, 0);
      this.corpo.add(p);
      k.m(capsula(0.06, 0.26), mCalca, 2.4, p, [0, -0.19, 0]);
      k.m(capsula(0.055, 0.08), mEsc, 2.4, p, [0, -0.38, 0.04], [Math.PI / 2, 0, 0], [1, 1, 0.75]);
    }
    // tronco (paletó)
    k.m(torno(perfil([[0.0001, 0.4], [0.17, 0.41], [0.205, 0.5], [0.215, 0.62], [0.205, 0.73], [0.18, 0.81], [0.12, 0.86], [0.07, 0.88]], 24)), mTerno, 3, this.corpo);
    // camisa e gravata no V do paletó
    const v = k.m(new THREE.CircleGeometry(0.07, 3), mBranco, 0, this.corpo, [0, 0.79, 0.188], [-0.25, 0, Math.PI / 2 + Math.PI / 6]);
    v.scale.set(1.25, 1, 1);
    k.m(caixa(0.032, 0.17, 0.015), mGrav, 1.4, this.corpo, [0, 0.72, 0.205], [-0.2, 0, 0]);
    k.m(esfera(0.022), mGrav, 1.4, this.corpo, [0, 0.8, 0.19]);
    // botões
    for (const y of [0.58, 0.5]) k.m(esfera(0.012), mEsc, 0, this.corpo, [0.02, y, 0.21]);
    // braços
    for (const [s, ombro, cot] of [[1, this.ombroE, this.cotE], [-1, this.ombroD, this.cotD]] as const) {
      ombro.position.set(s * 0.21, 0.8, 0);
      this.corpo.add(ombro);
      k.m(capsula(0.058, 0.14), mTerno, 2.6, ombro, [0, -0.1, 0]);
      cot.position.set(0, -0.2, 0);
      ombro.add(cot);
      k.m(capsula(0.052, 0.1), mTerno, 2.4, cot, [0, -0.06, 0]);
      k.m(cil(0.045, 0.045, 0.03), mBranco, 1.4, cot, [0, -0.13, 0]);
      k.m(esfera(0.05), mPele, 2.4, cot, [0, -0.18, 0.005], [0, 0, 0], [1, 1.05, 0.85]);
      if (s === -1) {
        this.mao.position.set(0, -0.2, 0.03);
        cot.add(this.mao);
      }
    }
    // cabeça
    this.cabeca.position.set(0, 1.0, 0.01);
    this.corpo.add(this.cabeca);
    const H = this.cabeca;
    k.m(cil(0.065, 0.075, 0.12), mPele, 2, this.corpo, [0, 0.9, 0.01]);
    k.m(new THREE.TorusGeometry(0.07, 0.016, 10, 30), mBranco, 1.6, this.corpo, [0, 0.885, 0.01], [Math.PI / 2, 0, 0]);
    k.m(esfera(0.19, 48, 36), mPele, 3, H, [0, 0, 0], [0, 0, 0], [1, 1.05, 0.98]);
    // orelhas
    for (const s of [-1, 1]) k.m(esfera(0.045), mPele, 2.2, H, [s * 0.19, -0.01, -0.01], [0, 0, 0], [0.5, 1, 0.8]);
    // nariz
    k.m(esfera(0.042), mPele, 2.2, H, [0, -0.02, 0.19], [0, 0, 0], [1, 1.1, 1]);
    // bigode
    if (cores.bigode !== false) k.m(capsula(0.022, 0.09), mEsc, 1.6, H, [0, -0.075, 0.18], [0, 0, Math.PI / 2]);
    // olhos (pontos pretos com brilho)
    for (const s of [-1, 1]) {
      const o = new THREE.Group();
      o.position.set(s * 0.068, 0.045, 0.172);
      H.add(o);
      k.m(esfera(0.026), mEsc, 0, o, [0, 0, 0], [0, 0, 0], [0.85, 1.15, 0.6]);
      k.m(esfera(0.008), mBranco, 0, o, [0.008, 0.012, 0.015]);
      if (s === 1) this.olhoE = o;
      const sb = new THREE.Group();
      sb.position.set(s * 0.07, 0.105, 0.165);
      H.add(sb);
      k.m(capsula(0.011, 0.05), mEsc, 0, sb, [0, 0, 0], [0, 0, Math.PI / 2]);
      this.sobrs.push(sb);
    }
    // boca
    H.add(this.bocaS, this.bocaO);
    k.m(tubo([[-0.055, -0.1, 0.16], [-0.025, -0.122, 0.175], [0.025, -0.122, 0.175], [0.06, -0.098, 0.158]], () => 0.007, 20, 8), mEsc, 0, this.bocaS);
    k.m(esfera(0.03), mEsc, 0, this.bocaO, [0, -0.12, 0.165], [0, 0, 0], [1, 1.2, 0.5]);
    // chapéu
    const ch = new THREE.Group();
    ch.position.set(0, 0.13, -0.01);
    ch.rotation.set(-0.08, 0, 0.06);
    H.add(ch);
    k.m(torno(perfil([[0.0001, 0.17], [0.1, 0.165], [0.15, 0.13], [0.155, 0.04], [0.158, 0.0]], 12)), mCh, 2.6, ch);
    k.m(cil(0.26, 0.26, 0.014, 48), mCh, 2.6, ch);
    k.m(cil(0.16, 0.16, 0.035, 48), k.mat({ color: 0x1e1915, rough: 0.6, tom: 0.15 }), 1.6, ch, [0, 0.03, 0]);
    // base de boneco colecionável na maquete
    if (k.dir === "A") {
      k.m(cil(0.3, 0.32, 0.05, 48), k.mat({ color: 0x141414, rough: 0.35, clear: 0.6 }), 0, this.raiz, [0, 0.025, 0]);
    }
    this.raiz.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.contorno) o.castShadow = o.receiveShadow = true;
    });
  }

  aplica(p: PoseDir, t: number) {
    const R = this.raiz;
    R.visible = p.vis ?? true;
    if (!R.visible) return;
    R.position.set(...(p.pos ?? [0, 0, 0]));
    R.rotation.y = (p.rotY ?? 0) + (p.giro ?? 0);
    R.scale.setScalar(Math.max(0.001, p.esc ?? 1));
    const sq = p.sq ?? 1;
    this.corpo.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    const base = 0.05;
    let pulo = p.pulo ?? 0;
    const c = p.corre;
    if (c !== undefined) {
      this.pernaE.rotation.x = Math.sin(c) * 0.8;
      this.pernaD.rotation.x = -Math.sin(c) * 0.8;
      pulo += Math.abs(Math.cos(c)) * 0.05;
    } else {
      this.pernaE.rotation.x = this.pernaD.rotation.x = 0;
    }
    this.corpo.position.y = base + pulo;
    this.corpo.rotation.x = p.inclina ?? (c !== undefined ? 0.18 : 0);
    const cab = p.cab ?? [0, 0, 0];
    this.cabeca.rotation.set(cab[0] + Math.sin(t * 2.3) * 0.015, cab[1], cab[2]);
    const bE = p.bE ?? (c !== undefined ? { abre: 0.2, frente: -Math.sin(c) * 0.9, cot: 0.9 } : { abre: 0.15, frente: 0, cot: 0.15 });
    const bD = p.bD ?? (c !== undefined ? { abre: 0.2, frente: Math.sin(c) * 0.9, cot: 0.9 } : { abre: 0.15, frente: 0, cot: 0.15 });
    this.ombroE.rotation.set(-bE.frente, 0, bE.abre);
    this.ombroD.rotation.set(-bD.frente, 0, -bD.abre);
    this.cotE.rotation.set(-bE.cot, 0, 0);
    this.cotD.rotation.set(-bD.cot, 0, 0);
    this.olhoE.scale.y = 1 - clamp(p.pisca ?? 0) * 0.88;
    this.bocaS.visible = (p.boca ?? "sorri") === "sorri";
    this.bocaO.visible = !this.bocaS.visible;
    const sb = p.sobr ?? 0;
    this.sobrs.forEach((s, i) => {
      const lado = i === 0 ? -1 : 1;
      s.position.y = 0.105 + sb * 0.02;
      s.rotation.z = -lado * sb * -0.3 + (sb < 0 ? lado * 0.35 : 0);
    });
  }
}
