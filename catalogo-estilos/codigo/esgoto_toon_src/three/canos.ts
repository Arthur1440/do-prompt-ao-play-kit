// Canos e caixas do esgoto. Cada peça é um grupo que "cai do alto e encaixa com um quique" (assinatura do Sisteminha).
// Todo sólido entra no corte por estêncil: parede do cano (esgoto marrom / PVC branco), miolo escuro, água e gordura.
import * as THREE from "three";
import { Kit, caixa, cil, esfera } from "./kit";
import { Corte } from "./corte";
import { caminho, cilAB, luva, V3 } from "./geo";
import { FY, REDE, XI, YR0, ZK, ZP, XS, LAV, RALO_CH, PIA, yTelhado, BUR } from "./maquete";
import { SAIDA_VASO } from "./vaso";
import { texConcreto } from "./tex";
import { rng } from "./rng";

export const R_ESG = 0.022, R_PVC = 0.014, R_COZ = 0.016;
const X_SAI = SAIDA_VASO[0];
export const XCG = 0.55, XCI1 = 1.0, XCI0 = 0.42; // caixa de gordura e caixas de inspeção
export const Y_COZ = -0.085; // altura do ramal da cozinha
export const YTOPO_RESP = yTelhado(ZP) + 0.03 + 0.17;

/** caminhos (mundo) de cada trecho, usados também pelo fluxo de água e pelo algodão */
export const CAM = {
  descida: [[X_SAI, FY + 0.004, ZP], [X_SAI, YR0, ZP], [-0.52, YR0, ZP]] as V3[],
  buraco: [[-0.52, YR0, ZP], [BUR[0] - 0.08, YR0, ZP]] as V3[],
  rua: [[-0.52, YR0, ZP], [REDE.x, YR0, ZP], [REDE.x, REDE.y + REDE.r * 0.55, ZP]] as V3[],
  cozinha: [[PIA[0], PIA[1] - 0.01, PIA[2]], [PIA[0], Y_COZ, PIA[2]], [PIA[0], Y_COZ, ZK], [XCI1, Y_COZ, ZK], [XCI1, Y_COZ, ZP], [XCI1, YR0 + R_ESG * 0.6, ZP]] as V3[],
  respiro: [[XI, YR0, ZP], [XI, YTOPO_RESP, ZP]] as V3[],
  lav: [[LAV[0], LAV[1] + 0.2, LAV[2] + 0.005], [LAV[0], -0.03, LAV[2] + 0.005], [LAV[0], -0.03, ZP], [XS - 0.05, -0.03, ZP]] as V3[],
  chuveiro: [[RALO_CH[0], FY, RALO_CH[2]], [RALO_CH[0], -0.03, RALO_CH[2]], [RALO_CH[0], -0.03, ZP], [XS + 0.05, -0.03, ZP]] as V3[],
  csSaida: [[XS, -0.07, ZP], [XS, YR0 + R_ESG * 0.6, ZP]] as V3[],
  // cozinha em três trechos: casa -> (caixa de gordura) -> caixa de inspeção -> ramal
  coz1: [[PIA[0], PIA[1] - 0.01, PIA[2]], [PIA[0], Y_COZ, PIA[2]], [PIA[0], Y_COZ, ZK], [0.55 - 0.075, Y_COZ, ZK]] as V3[],
  cozMeio: [[0.55 - 0.075, Y_COZ, ZK], [0.55 + 0.12, Y_COZ, ZK]] as V3[],
  coz2: [[0.55 + 0.12, Y_COZ, ZK], [1.0, Y_COZ, ZK], [1.0, Y_COZ, ZP], [1.0, Y_COZ - 0.03, ZP]] as V3[],
  // ligações diretas do lavatório e do ralo do chuveiro no ramal (antes da caixa sifonada)
  lavD: [[LAV[0], LAV[1] + 0.2, LAV[2] + 0.005], [LAV[0], -0.03, LAV[2] + 0.005], [LAV[0], -0.03, ZP], [LAV[0], YR0 + R_ESG * 0.6, ZP]] as V3[],
  chuD: [[RALO_CH[0], FY, RALO_CH[2]], [RALO_CH[0], -0.03, RALO_CH[2]], [RALO_CH[0], -0.03, ZP], [RALO_CH[0], YR0 + R_ESG * 0.6, ZP]] as V3[],
  // ralo do quintal -> caixa de inspeção da frente
  raloQ: [[0.64, -0.004, ZP - 0.2], [0.64, -0.07, ZP - 0.2], [0.64, -0.07, ZP], [0.48, -0.07, ZP]] as V3[],
};
/** pivô da inclinação do ramal (caimento) e altura do ramal em x para uma inclinação (rad) */
export const PIVO: V3 = [-0.52, YR0, ZP];
export const yRamal = (x: number, ang: number) => YR0 - Math.max(0, x - PIVO[0]) * Math.tan(ang);

export class Peca {
  g = new THREE.Group();
  deBaixo = false; // sobe da terra (o respiro) em vez de cair do alto
  ang = 0; // inclinação em torno do PIVO (caimento)
  constructor(public nome: string) {}
  /** k: 0 = fora (no alto, invisível), 0..1 = caindo, 1 = encaixada. sobe: 0..1 = sai (é tirada para cima) */
  aplica(k: number, sobe = 0) {
    this.g.visible = k > 0.001 && sobe < 0.999;
    if (!this.g.visible) return;
    let dy: number;
    if (this.deBaixo) { const e = Math.min(1, k); dy = -(1 - e * (2 - e)) * 1.35; }
    else {
      const t = Math.min(1, k / 0.75);
      const queda = (1 - t * t) * 0.9; // acelera como queda de verdade
      const quique = k > 0.75 && k < 1 ? Math.sin(((k - 0.75) / 0.25) * Math.PI) * 0.025 : 0;
      dy = queda + quique;
    }
    // inclinação em torno do pivô: posição = p - R p
    const a = -this.ang, [px, py] = PIVO;
    this.g.rotation.z = a;
    this.g.position.set(px - (px * Math.cos(a) - py * Math.sin(a)), py - (px * Math.sin(a) + py * Math.cos(a)) + dy + sobe * sobe * 1.4, 0);
  }
}

export class Canos {
  pecas: Record<string, Peca> = {};
  gordura: THREE.Mesh[] = [];
  gord = new THREE.Group();
  cgGordura: THREE.Mesh;
  cgTampa: THREE.Group;
  ciTampas: THREE.Group[] = [];
  csAgua: THREE.Mesh;
  cgAgua!: THREE.Mesh;
  csEspelho!: THREE.Mesh;
  cozDesce = new THREE.Group();
  raloQ = new THREE.Group();
  matEsg: THREE.Material;
  matPvc: THREE.Material;
  matOco: THREE.Material;
  matAgua: THREE.Material;
  matGord: THREE.Material;
  constructor(public k: Kit, public C: Corte, public cena: THREE.Object3D) {
    this.matEsg = k.mat({ color: 0x9c5a30, rough: 0.32, clear: 0.6, liso: true });
    this.matPvc = k.mat({ color: 0xeeeeea, rough: 0.28, clear: 0.6, liso: true });
    this.matOco = k.mat({ color: 0x15130f, rough: 0.9, liso: true });
    this.matAgua = k.mat({ tipo: "agua", color: 0x4f9ad6, rough: 0.05, clear: 1, liso: true });
    this.matGord = k.mat({ tipo: "gordura", color: 0xead48a, rough: 0.55, clear: 0.2, liso: true });
    const P = (nome: string) => { const p = new Peca(nome); this.pecas[nome] = p; cena.add(p.g); return p; };

    // ramal do vaso (descida + cotovelo), trecho até o buraco (gancho) e trecho até a rua
    this.tubo(P("descida").g, CAM.descida, R_ESG, "esgoto", 0.045, [1]);
    this.tubo(P("buraco").g, CAM.buraco, R_ESG, "esgoto", 0.05, [0]);
    this.tubo(P("rua").g, CAM.rua, R_ESG, "esgoto", 0.06, [0]);
    // ramal da cozinha em trechos (o do meio sai quando a caixa de gordura entra) + descida até o ramal, que estica no caimento
    this.tubo(P("coz1").g, CAM.coz1, R_COZ, "pvc", 0.04, [1]);
    this.tubo(P("cozMeio").g, CAM.cozMeio, R_COZ, "pvc", 0.04, []);
    const c2 = P("coz2").g;
    this.tubo(c2, CAM.coz2, R_COZ, "pvc", 0.04, [1]);
    this.cozDesce.position.set(XCI1, Y_COZ - 0.03, ZP);
    c2.add(this.cozDesce);
    this.C.registra(this.k.m(cilAB([0, 0.002, 0], [0, -1, 0], R_COZ, 24), this.matPvc, 0, this.cozDesce), "pvc");
    const od = new THREE.Mesh(cilAB([0, 0.004, 0], [0, -1.003, 0], R_COZ * 0.78, 24), this.matOco);
    this.cozDesce.add(od);
    this.C.registra(od, "oco");
    // ligações diretas do banheiro (antes da caixa sifonada)
    this.tubo(P("lavD").g, CAM.lavD, R_PVC, "pvc", 0.03, [2]);
    this.tubo(P("chuD").g, CAM.chuD, R_PVC, "pvc", 0.03, [2]);
    // ralo do quintal (grelha de ferro + cano até a caixa de inspeção)
    const rq = P("raloQ").g;
    this.tubo(rq, CAM.raloQ, R_PVC, "pvc", 0.025, []);
    const gq = this.k.m(caixa(0.07, 0.008, 0.07, 0.003), this.k.mat({ color: 0x2c2c2e, rough: 0.4, metal: 0.8, liso: true }), 0, rq, [0.64, 0.004, ZP - 0.2]);
    this.C.recorta(gq);
    // respiro: sobe pela parede hidráulica e fura o telhado; chapéu no topo
    const resp = P("respiro").g;
    this.pecas.respiro.deBaixo = true;
    this.tubo(resp, CAM.respiro, R_PVC * 1.15, "pvc", 0.03, []);
    this.tubo(resp, [[XI, YR0, ZP], [X_SAI - 0.01, YR0, ZP]], R_PVC * 1.15, "pvc", 0.02, []);
    const chap = this.k.m(cil(0.032, 0.022, 0.018, 24), this.matPvc, 0, resp, [XI, YTOPO_RESP + 0.012, ZP]);
    this.C.registra(chap, "pvc");
    // lavatório e chuveiro (ligações do banheiro), e a caixa sifonada
    this.tubo(P("lav").g, CAM.lav, R_PVC, "pvc", 0.03, [2]);
    this.tubo(P("chuveiro").g, CAM.chuveiro, R_PVC, "pvc", 0.03, [2]);
    this.caixaSifonada(P("cs").g);
    // gordura grudando por dentro do ramal da cozinha (trecho deitado embaixo do piso)
    const R = rng(13);
    for (let i = 0; i < 170; i++) {
      const x = -1.04 + (i / 169) * 0.82 + (R.r() - 0.5) * 0.01;
      const a = (i % 2 ? 0.5 : -0.5) * Math.PI + (R.r() - 0.5) * 1.2; // em cima / embaixo (no plano do corte), com variação
      const me = new THREE.Mesh(esfera(1, 18, 12), this.matGord);
      me.userData.base = [x, Y_COZ, ZK - R.r() * 0.004];
      me.userData.s = Math.sin(a) >= 0 ? 1 : -1;
      me.userData.r = 0.8 + R.r() * 0.45;
      me.userData.ord = R.r();
      me.castShadow = false;
      this.gord.add(me);
      this.gordura.push(me);
      this.C.registra(me, "gordura");
    }
    cena.add(this.gord);
    // caixa de gordura e caixas de inspeção
    const cg = P("cg").g;
    const r1 = this.caixaConcreto(cg, XCG, ZK, 0.17, -0.24, 2);
    this.cgTampa = r1.tampa;
    this.cgGordura = new THREE.Mesh(caixa(0.13, 0.03, 0.13, 0.008), this.matGord);
    this.cgGordura.position.set(XCG, -0.06, ZK);
    cg.add(this.cgGordura);
    this.C.registra(this.cgGordura, "gordura");
    const aguaCG = new THREE.Mesh(caixa(0.13, 0.13, 0.13, 0.006).translate(0, 0.065, 0), this.matAgua);
    aguaCG.position.set(XCG, -0.2, ZK);
    cg.add(aguaCG);
    this.C.registra(aguaCG, "agua");
    this.cgAgua = aguaCG;
    // tubo mergulhado na saída (a água sai por baixo, a gordura fica em cima)
    this.tubo(cg, [[XCG + 0.04, -0.17, ZK], [XCG + 0.04, Y_COZ, ZK], [XCG + 0.12, Y_COZ, ZK]], R_COZ * 0.9, "pvc", 0.015, []);
    for (const [nome, x, z] of [["ci0", XCI0, ZP], ["ci1", XCI1, ZK], ["ci2", XCI1, ZP]] as [string, number, number][]) {
      const r = this.caixaConcreto(P(nome).g, x, z, 0.12, YR0 - 0.13, 5 + x * 3);
      this.ciTampas.push(r.tampa);
    }
    // a água parada no fundo da caixa sifonada
    this.csAgua = new THREE.Mesh(cil(0.041, 0.041, 0.118, 32).translate(0, 0.059, 0), this.matAgua);
    this.csAgua.position.set(XS, -0.069, ZP);
    this.pecas.cs.g.add(this.csAgua);
    // espelho d'água logo abaixo da grelha (o que se vê pelo ralo)
    this.csEspelho = this.k.m(new THREE.CircleGeometry(0.038, 32), this.matAgua, 0, this.pecas.cs.g, [XS, FY - 0.003, ZP], [-Math.PI / 2, 0, 0]);
    this.C.recorta(this.csEspelho);
    this.C.registra(this.csAgua, "agua");
  }

  /** cano em polilinha: parede (esgoto/pvc) + miolo escuro + luvas nas juntas `luvas` (índices dos vértices) */
  tubo(pai: THREE.Object3D, pts: V3[], r: number, tipo: "esgoto" | "pvc", R = 0.04, luvas: number[] = []) {
    const mat = tipo === "esgoto" ? this.matEsg : this.matPvc;
    const ext = this.k.m(caminho(pts, r, R), mat, 0, pai);
    this.C.registra(ext, tipo);
    const oco = new THREE.Mesh(caminho(pts, r * 0.78, R, 0.0015), this.matOco);
    oco.castShadow = false;
    pai.add(oco);
    this.C.registra(oco, "oco");
    for (const i of luvas) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const d: V3 = i === 0 ? [b[0] - a[0], b[1] - a[1], b[2] - a[2]] : [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]];
      const lv = this.k.m(luva(pts[i], d, r), mat, 0, pai);
      this.C.registra(lv, tipo);
    }
    return ext;
  }

  /** caixa de concreto quadrada com tampa (fundo em yFundo), centrada em (x, z) */
  caixaConcreto(pai: THREE.Object3D, x: number, z: number, L: number, yFundo: number, seed: number) {
    const conc = this.k.mat({ map: texConcreto(Math.round(seed)), chapada: 0xb9b6ae, color: 0xb9b6ae, rough: 0.85, liso: true });
    const H = 0.0 - yFundo, e = 0.018;
    const paredes: [number, number, number, number, number, number][] = [
      [x, yFundo + H / 2, z - L / 2 + e / 2, L, H, e], [x, yFundo + H / 2, z + L / 2 - e / 2, L, H, e],
      [x - L / 2 + e / 2, yFundo + H / 2, z, e, H, L - 2 * e], [x + L / 2 - e / 2, yFundo + H / 2, z, e, H, L - 2 * e],
      [x, yFundo + e / 2, z, L - 2 * e, e, L - 2 * e],
    ];
    for (const [px, py, pz, sx, sy, sz] of paredes) {
      const me = this.k.m(new THREE.BoxGeometry(sx, sy, sz), conc, 0, pai, [px, py, pz]);
      this.C.registra(me, "concreto");
    }
    const oco = new THREE.Mesh(new THREE.BoxGeometry(L - 2 * e - 0.001, H - e - 0.002, L - 2 * e - 0.001), this.matOco);
    oco.position.set(x, yFundo + e + (H - e) / 2 - 0.001, z);
    oco.material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); // só a tampa escura no corte
    pai.add(oco);
    this.C.registra(oco, "oco");
    const tampa = new THREE.Group();
    tampa.position.set(x, 0.0, z);
    const tm = this.k.m(caixa(L + 0.012, 0.016, L + 0.012, 0.004), conc, 0, tampa, [0, 0.008, 0]);
    this.C.registra(tm, "concreto");
    this.k.m(new THREE.TorusGeometry(0.012, 0.0025, 8, 20, Math.PI), this.k.mat({ color: 0x3a3a3a, metal: 0.8, rough: 0.4, liso: true }), 0, tampa, [0, 0.016, 0], [0, 0, 0]);
    pai.add(tampa);
    return { tampa };
  }

  caixaSifonada(pai: THREE.Object3D) {
    const y0 = -0.075, y1 = FY - 0.004;
    const corpo = this.k.m(cilAB([XS, y0, ZP], [XS, y1, ZP], 0.05, 40), this.matPvc, 0, pai);
    this.C.registra(corpo, "pvc");
    const oco = new THREE.Mesh(cilAB([XS, y0 + 0.008, ZP], [XS, y1 + 0.002, ZP], 0.043, 40), this.matOco);
    pai.add(oco);
    this.C.registra(oco, "oco");
    // bocais de entrada (lavatório e chuveiro) e a saída para o ramal
    this.tubo(pai, CAM.csSaida, R_PVC * 1.2, "pvc", 0.02, []);
  }

  /** gordura grudada por dentro: k 0..1 (1 = cano fechado) */
  aplicaGordura(k: number) {
    this.gord.visible = k > 0.01;
    for (const me of this.gordura) {
      const o = me.userData.ord as number;
      const kk = Math.max(0, Math.min(1, (k * 1.3 - o * 0.3)));
      const [x, y, z] = me.userData.base as V3;
      // as bolotas nascem grudadas na parede (em cima e embaixo) e crescem para o meio até fechar o cano
      const rin = R_COZ * 0.76;
      const r = rin * (0.16 + 0.5 * kk) * me.userData.r;
      const d = rin - r;
      me.position.set(x, y + me.userData.s * d, z);
      me.scale.setScalar(Math.max(0.0001, r));
      me.visible = kk > 0.02;
    }
  }
}

export { cilAB };
