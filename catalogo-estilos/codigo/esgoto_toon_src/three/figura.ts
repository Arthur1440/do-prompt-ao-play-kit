// Pedreiro: boneco colecionável de maquete (escala de ferromodelismo), proporções de gente de verdade.
// Boné vermelho, camiseta cinza, bermuda jeans, meia branca, botina, base preta redonda. Sem cara de desenho:
// olhos são dois pontinhos pintados, bigode pequeno. Ele é POSICIONADO em cada ação (poses de boneco articulado).
import * as THREE from "three";
import { Kit, caixa, cil, esfera, capsula } from "./kit";
import type { V3 } from "./geo";

export type Braco = { frente?: number; abre?: number; torce?: number; cot?: number };
export type Perna = { frente?: number; abre?: number; joelho?: number };
export type PoseFig = {
  vis?: boolean;
  pos: V3;
  rotY?: number;
  inclina?: number; // tronco para a frente
  lado?: number; // tronco de lado
  torceT?: number; // tronco girando
  cab?: [number, number]; // cabeça: olhar para baixo, virar
  bE?: Braco; bD?: Braco; pE?: Perna; pD?: Perna;
  agacha?: number; // desce o quadril (joelhos dobrados)
  ergue?: number; // pega e põe (o boneco sobe e desce na base, como mão de quem posiciona)
  item?: "pa" | "cano" | "nada";
  alvoPa?: V3; // ponto (mundo) onde a lâmina da pá encosta
  terraPa?: number; // terra em cima da pá (0..1)
};

const COR = { pele: 0xc58a5e, cami: 0x9ea4ab, camiE: 0x80868d, jeans: 0x3f6ea8, jeansE: 0x335c8e, bota: 0x6e4322, sola: 0x251a12, meia: 0xedeae4, bone: 0xd62a24, aba: 0xb81f1b, cabelo: 0x2a1a12, base: 0x0e0e10 };

export class Figura {
  raiz = new THREE.Group();
  corpo = new THREE.Group();
  quadril = new THREE.Group();
  tronco = new THREE.Group();
  cabeca = new THREE.Group();
  ombroE = new THREE.Group(); ombroD = new THREE.Group();
  cotE = new THREE.Group(); cotD = new THREE.Group();
  maoE = new THREE.Group(); maoD = new THREE.Group();
  pernaE = new THREE.Group(); pernaD = new THREE.Group();
  joelhoE = new THREE.Group(); joelhoD = new THREE.Group();
  pa = new THREE.Group();
  terraPa: THREE.Mesh;
  cano = new THREE.Group();
  static HQ = 0.205; // quadril
  constructor(k: Kit) {
    const M = (c: number, o: { rough?: number; clear?: number; tipo?: "boneco" } = {}) => k.mat({ color: c, rough: o.rough ?? 0.48, clear: o.clear ?? 0.28, liso: true, tipo: o.tipo });
    const pele = M(COR.pele, { rough: 0.5, clear: 0.2 }), cami = M(COR.cami, { rough: 0.62, clear: 0.12 }), camiE = M(COR.camiE, { rough: 0.6 });
    const jeans = M(COR.jeans, { rough: 0.64, clear: 0.1 }), jeansE = M(COR.jeansE, { rough: 0.6 }), bota = M(COR.bota, { rough: 0.42, clear: 0.35 });
    const sola = M(COR.sola), meia = M(COR.meia, { rough: 0.7 }), bone = M(COR.bone, { rough: 0.45, clear: 0.35, tipo: "boneco" }), aba = M(COR.aba, { tipo: "boneco" }), cabelo = M(COR.cabelo, { rough: 0.6 });
    const base = M(COR.base, { rough: 0.25, clear: 0.9 });
    const pxAnt = k.pxPadrao;
    k.pxPadrao = 1.4;
    const R = this.raiz;
    // base preta redonda (com chanfro)
    k.m(cil(0.056, 0.06, 0.012, 48), base, 0, R, [0, 0.006, 0]);
    R.add(this.corpo);
    this.corpo.position.y = 0.012;
    const c = this.corpo;
    c.add(this.quadril);
    this.quadril.position.y = Figura.HQ;
    // ---------------------------------------------------------------- pernas
    for (const [lado, perna, joelho] of [[1, this.pernaE, this.joelhoE], [-1, this.pernaD, this.joelhoD]] as [number, THREE.Group, THREE.Group][]) {
      perna.position.set(lado * 0.019, 0, 0);
      this.quadril.add(perna);
      k.m(cil(0.0162, 0.0145, 0.088, 20), jeans, 0, perna, [0, -0.044, 0]);
      k.m(cil(0.0158, 0.0158, 0.008, 20), jeansE, 0, perna, [0, -0.086, 0]); // barra dobrada
      joelho.position.set(0, -0.095, 0);
      perna.add(joelho);
      k.m(esfera(0.0108, 16, 12), pele, 0, joelho, [0, 0, 0]);
      k.m(cil(0.0106, 0.0082, 0.074, 18), pele, 0, joelho, [0, -0.037, 0.001]);
      k.m(cil(0.0088, 0.0088, 0.012, 16), meia, 0, joelho, [0, -0.072, 0]);
      const pe = new THREE.Group();
      pe.position.set(0, -0.083, 0);
      joelho.add(pe);
      k.m(caixa(0.024, 0.022, 0.044, 0.008), bota, 0, pe, [0, -0.002, 0.008]);
      k.m(caixa(0.026, 0.006, 0.047, 0.003), sola, 0, pe, [0, -0.0125, 0.009]);
      k.m(cil(0.0098, 0.0098, 0.012, 16), bota, 0, pe, [0, 0.008, -0.002]);
    }
    // ---------------------------------------------------------------- quadril (bermuda) e tronco (camiseta)
    k.m(caixa(0.07, 0.034, 0.046, 0.016), jeans, 0, this.quadril, [0, 0.0, 0]);
    k.m(caixa(0.071, 0.006, 0.047, 0.003), M(0x5a3a22, { rough: 0.5 }), 0, this.quadril, [0, 0.017, 0]); // cinto
    this.quadril.add(this.tronco);
    this.tronco.position.y = 0.012;
    const torso = k.m(capsula(0.031, 0.06), cami, 0, this.tronco, [0, 0.066, 0], [0, 0, 0], [1.34, 1, 0.8]);
    void torso;
    k.m(caixa(0.07, 0.012, 0.042, 0.006), cami, 0, this.tronco, [0, 0.012, 0]); // barra da camiseta
    k.m(new THREE.TorusGeometry(0.0125, 0.0028, 8, 20), camiE, 0, this.tronco, [0, 0.123, 0.0], [Math.PI / 2, 0, 0]); // gola
    // ---------------------------------------------------------------- braços
    for (const [lado, ombro, cot, mao] of [[1, this.ombroE, this.cotE, this.maoE], [-1, this.ombroD, this.cotD, this.maoD]] as [number, THREE.Group, THREE.Group, THREE.Group][]) {
      ombro.position.set(lado * 0.043, 0.112, 0);
      this.tronco.add(ombro);
      k.m(esfera(0.0142, 16, 12), cami, 0, ombro, [0, 0, 0]);
      k.m(cil(0.0138, 0.0128, 0.032, 16), cami, 0, ombro, [0, -0.016, 0]); // manga
      k.m(cil(0.0098, 0.0088, 0.062, 16), pele, 0, ombro, [0, -0.031, 0]);
      cot.position.set(0, -0.062, 0);
      ombro.add(cot);
      k.m(esfera(0.0088, 14, 10), pele, 0, cot, [0, 0, 0]);
      k.m(cil(0.0086, 0.0072, 0.056, 14), pele, 0, cot, [0, -0.028, 0]);
      mao.position.set(0, -0.06, 0);
      cot.add(mao);
      k.m(caixa(0.0115, 0.022, 0.017, 0.0055), pele, 0, mao, [0, -0.006, 0.002]);
      k.m(capsula(0.0035, 0.008), pele, 0, mao, [lado * -0.006, -0.002, 0.009], [0.6, 0, 0]); // polegar
    }
    // ---------------------------------------------------------------- pescoço e cabeça
    k.m(cil(0.0105, 0.0115, 0.02, 14), pele, 0, this.tronco, [0, 0.13, 0]);
    this.cabeca.position.set(0, 0.162, 0.002);
    this.tronco.add(this.cabeca);
    const h = this.cabeca;
    k.m(esfera(0.0232, 32, 24), pele, 0, h, [0, 0, 0], [0, 0, 0], [0.9, 1.1, 0.98]);
    k.m(esfera(0.016, 20, 14), pele, 0, h, [0, -0.012, 0.006], [0, 0, 0], [1.05, 0.8, 1.1]); // queixo
    k.m(esfera(0.0045, 12, 10), pele, 0, h, [0, -0.002, 0.0235], [0, 0, 0], [0.8, 1.1, 1]); // nariz
    for (const s of [1, -1]) {
      k.m(esfera(0.0052, 10, 8), pele, 0, h, [s * 0.0205, 0.0, -0.001], [0, 0, 0], [0.5, 1, 0.8]); // orelha
      k.m(esfera(0.0021, 8, 6), M(0x15100c, { rough: 0.3, clear: 0.8 }), 0, h, [s * 0.0078, 0.0045, 0.0205]); // olho pintado
      k.m(caixa(0.0075, 0.0018, 0.002, 0.0008), cabelo, 0, h, [s * 0.008, 0.0092, 0.0212], [0, 0, s * -0.12]); // sobrancelha
    }
    k.m(capsula(0.0032, 0.011), cabelo, 0, h, [0, -0.0085, 0.0225], [0, 0, Math.PI / 2]); // bigode
    k.m(esfera(0.0215, 20, 14), cabelo, 0, h, [0, -0.002, -0.006], [0, 0, 0], [0.98, 0.95, 0.95]); // cabelo da nuca (fica por trás)
    // boné
    const boneG = new THREE.Group();
    boneG.position.set(0, 0.009, -0.001);
    h.add(boneG);
    k.m(new THREE.SphereGeometry(0.0245, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), bone, 0, boneG, [0, 0, 0], [0, 0, 0], [0.98, 0.78, 1.04]);
    k.m(cil(0.0247, 0.0247, 0.004, 28), bone, 0, boneG, [0, 0.0, 0]);
    k.m(caixa(0.034, 0.0028, 0.026, 0.0012), aba, 0, boneG, [0, -0.0005, 0.031], [-0.12, 0, 0]);
    k.m(esfera(0.0028, 8, 6), bone, 0, boneG, [0, 0.0195, 0]);
    // ---------------------------------------------------------------- ferramentas (posicionadas pelas duas mãos a cada quadro)
    const madeira = M(0xa8784a, { rough: 0.5 }), metal = k.mat({ color: 0x8c9196, rough: 0.35, metal: 0.85, liso: true });
    k.m(cil(0.0042, 0.0042, 0.22, 12), madeira, 0, this.pa, [0, 0.11, 0]);
    k.m(caixa(0.028, 0.006, 0.006, 0.002), madeira, 0, this.pa, [0, 0.222, 0]);
    k.m(caixa(0.04, 0.05, 0.004, 0.003), metal, 0, this.pa, [0, -0.022, 0.002], [0.12, 0, 0]);
    k.m(cil(0.0065, 0.0045, 0.018, 12), metal, 0, this.pa, [0, 0.004, 0]);
    this.terraPa = k.m(esfera(0.022, 14, 10), k.mat({ color: 0x3e2614, rough: 0.95, bumpS: 1 }), 0, this.pa, [0, -0.026, 0.01], [0, 0, 0], [1, 0.9, 0.5]);
    k.m(cil(0.016, 0.016, 0.16, 24), k.mat({ color: 0x9c5a30, rough: 0.32, clear: 0.6, liso: true }), 0, this.cano, [0, 0, 0], [0, 0, Math.PI / 2]);
    this.raiz.add(this.pa, this.cano);
    k.pxPadrao = pxAnt;
    this.raiz.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.receiveShadow = true; } });
  }

  aplica(p: PoseFig) {
    const R = this.raiz;
    R.visible = p.vis !== false;
    if (!R.visible) return;
    const er = p.ergue ?? 0;
    R.position.set(p.pos[0], p.pos[1] + er * 0.12, p.pos[2]);
    R.rotation.set(er * 0.12, p.rotY ?? 0, er * -0.08);
    const ag = p.agacha ?? 0;
    this.quadril.position.y = Figura.HQ - ag * 0.06;
    this.tronco.rotation.set(p.inclina ?? 0, p.torceT ?? 0, p.lado ?? 0);
    const cab = p.cab ?? [0, 0];
    this.cabeca.rotation.set(cab[0], cab[1], 0);
    const braco = (o: THREE.Group, c: THREE.Group, b: Braco | undefined, s: number) => {
      const bb = b ?? {};
      o.rotation.set(-(bb.frente ?? 0.05), (bb.torce ?? 0) * s, s * (bb.abre ?? 0.12), "XZY");
      c.rotation.set(-(bb.cot ?? 0.15), 0, 0);
    };
    braco(this.ombroE, this.cotE, p.bE, 1);
    braco(this.ombroD, this.cotD, p.bD, -1);
    // pernas: agachar dobra os joelhos sozinho
    const perna = (o: THREE.Group, j: THREE.Group, q: Perna | undefined, s: number) => {
      const qq = q ?? {};
      o.rotation.set(-(qq.frente ?? 0) - ag * 0.9, 0, s * (qq.abre ?? 0.04));
      j.rotation.set((qq.joelho ?? 0) + ag * 1.75, 0, 0);
    };
    perna(this.pernaE, this.joelhoE, p.pE, 1);
    perna(this.pernaD, this.joelhoD, p.pD, -1);
    // ferramenta: a pá passa pelas duas mãos; o cano fica entre elas
    this.pa.visible = p.item === "pa";
    this.cano.visible = p.item === "cano";
    if (p.item === "pa" || p.item === "cano") {
      R.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(R.matrixWorld).invert();
      const a = this.maoE.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      const b = this.maoD.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      a.y -= 0.008; b.y -= 0.008;
      if (p.item === "pa") {
        // cabo sai da mão de cima (b) e a lâmina encosta no alvo (no buraco); sem alvo, segue a linha das mãos
        const alvo = p.alvoPa ? new THREE.Vector3(...p.alvoPa).applyMatrix4(inv) : b.clone().add(a.clone().sub(b).normalize().multiplyScalar(0.22));
        const d = alvo.clone().sub(b).normalize();
        this.pa.position.copy(b).addScaledVector(d, 0.205);
        this.terraPa.visible = (p.terraPa ?? 0) > 0.05;
        this.terraPa.scale.set(p.terraPa ?? 0, 0.9 * (p.terraPa ?? 0), 0.5 * (p.terraPa ?? 0));
        this.pa.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
      } else {
        this.cano.position.copy(a).add(b).multiplyScalar(0.5);
        this.cano.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), a.clone().sub(b).normalize());
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------ poses prontas
/** cavando: f = fase da pazada (0..1) */
export function poseCava(pos: V3, rotY: number, f: number, buraco?: V3): PoseFig {
  const s = 0.5 - 0.5 * Math.cos(f * Math.PI * 2); // 0 = pá enfiada, 1 = pá erguida jogando a terra
  const ab: V3 | undefined = buraco ? [buraco[0] - 0.02 + 0.05 * s, -0.07 + 0.13 * s, buraco[2] - 0.05 - 0.06 * s] : undefined;
  return {
    pos, rotY, item: "pa", alvoPa: ab, terraPa: f % 1 > 0.08 && f % 1 < 0.55 ? 1 : 0, inclina: 0.55 - 0.25 * s, torceT: -0.15 + 0.35 * s, cab: [0.35 - 0.1 * s, 0.1],
    bD: { frente: 0.55 + 0.6 * s, abre: 0.1, cot: 0.35 + 0.5 * s }, bE: { frente: 1.2 + 0.3 * s, abre: -0.15, cot: 0.25 },
    pE: { frente: 0.45, joelho: 0.5 }, pD: { frente: -0.3, joelho: 0.25 },
  };
}
export const poseNariz = (pos: V3, rotY: number): PoseFig => ({
  pos, rotY, inclina: -0.16, cab: [-0.12, 0.25], item: "nada",
  bD: { frente: 2.15, abre: 0.25, cot: 2.35, torce: 0.2 }, bE: { frente: 0.4, abre: 0.5, cot: 0.4 },
  pE: { frente: 0.25, joelho: 0.1 }, pD: { frente: -0.18, joelho: 0.05 },
});
export const poseCano = (pos: V3, rotY: number): PoseFig => ({
  pos, rotY, inclina: 0.18, cab: [0.3, 0], item: "cano",
  bD: { frente: 0.95, abre: 0.25, cot: 0.55 }, bE: { frente: 0.95, abre: 0.25, cot: 0.55 },
  pE: { frente: 0.12 }, pD: { frente: -0.1 },
});
export const posePe = (pos: V3, rotY: number, x: Partial<PoseFig> = {}): PoseFig => ({ pos, rotY, item: "nada", bE: { abre: 0.14, cot: 0.2 }, bD: { abre: 0.14, cot: 0.2 }, ...x });
export const poseAjoelha = (pos: V3, rotY: number): PoseFig => ({
  pos, rotY, agacha: 0.85, inclina: 0.5, cab: [0.4, 0], item: "nada",
  pE: { frente: 0.2, abre: 0.12 }, pD: { frente: -0.08, abre: 0.12 },
  bD: { frente: 1.3, abre: 0.15, cot: 0.3 }, bE: { frente: 1.0, abre: 0.2, cot: 0.6 },
});
