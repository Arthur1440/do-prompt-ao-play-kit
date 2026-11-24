// Orquestra a maquete: cenário fixo + canos (peças que caem) + vaso + pedreiro + barata + algodão + água + virada.
// Tudo é função pura do Estado: o render pode pular e repetir quadros sem herdar nada do anterior.
import * as THREE from "three";
import { Kit, Dir, montaMundo, esfera } from "./kit";
import { Corte } from "./corte";
import { Maquete, BUR, BUR_P, ZP, ZK, PIA } from "./maquete";
import { Canos, yRamal, Y_COZ, XCI1, R_ESG, R_COZ, XCG } from "./canos";
import { Vaso } from "./vaso";
import { Figura, PoseFig } from "./figura";
import { Barata, EstadoBarata } from "./barata";
import { Algodao, Nuvem } from "./algodao";
import { Virada } from "./virada";
import { texFundo, texFundoToon, texPlanta, texGradeMesa } from "./tex";
import type { V3 } from "./geo";

/** câmera em órbita em volta de `alvo`: az (graus, 0 = de frente, + à direita), el (graus), dist */
export type Cam = { az: number; el: number; dist: number; fov?: number; alvo: V3; foco?: number; forca?: number; larg?: number; rolo?: number };
export type Jato = { pts: V3[]; u: number; len?: number; r?: number };

export type Estado = {
  t: number;
  cam: Cam;
  corte?: number | null;
  buraco?: number;
  poca?: number;
  pecas?: Record<string, number | [number, number]>;
  vaso?: { canal?: "reto" | "sifao"; nivel?: number; queda?: number };
  gordura?: number;
  ped?: PoseFig;
  barata?: EstadoBarata;
  nuvens?: Nuvem[];
  jatos?: Jato[];
  telhado?: number;
  pia?: { nivel?: number; piso?: number };
  virada?: { k: number; k2: number };
  escuro?: number;
  cs?: number; // nível da água na caixa sifonada (0..1)
  cg?: { agua?: number; gordura?: number; tampa?: number };
  ciTampa?: [number, number, number]; // 0 = fechada, 1 = aberta
  inclina?: number; // caimento do ramal (rad)
  entupe?: number; // 0..1 bolo entupindo o ramal no quintal
  oleo?: Jato[]; // óleo escorrendo (pool próprio, cor de gordura)
  frig?: number; // 0..1 frigideira virando na pia
  banho?: number; // 0..1 banheiro alagado
  bolinha?: V3 | null; // a bolinha marrom discreta (caimento)
};
export const X_ENTUPE = 0.76;

function orbita(cam: THREE.PerspectiveCamera, alvo: THREE.Vector3, c: Cam) {
  const a = THREE.MathUtils.degToRad(c.az), e = THREE.MathUtils.degToRad(Math.max(-89.8, Math.min(c.el, 89.8)));
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(e) * c.dist, alvo.y + Math.sin(e) * c.dist, alvo.z + Math.cos(a) * Math.cos(e) * c.dist);
  cam.fov = c.fov ?? 30;
  cam.near = Math.max(0.005, c.dist * 0.02);
  cam.updateProjectionMatrix();
  cam.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
  cam.lookAt(alvo);
}

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  corte: Corte;
  maq: Maquete;
  canos: Canos;
  vaso: Vaso;
  ped: Figura;
  barata: Barata;
  alg: Algodao;
  gotas: THREE.Mesh[] = [];
  oleo: THREE.Mesh[] = [];
  entupe: THREE.Mesh;
  bolinha: THREE.Mesh;
  poca: THREE.Mesh;
  virada?: Virada;
  planoVirada = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1000);
  fundo: THREE.Texture;
  tinta = new THREE.Color(0x0b1026);
  foco = 0.45; forca = 0.85; larg = 1;
  base: { sol: number; hemi: number };

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number) {
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    const k = this.kit, sc = this.w.scene;
    // A: sol de fim de tarde vindo da esquerda e da frente, baixo (sombras longas); B: sol alto de meio-dia; C: luz de prancheta
    if (dir === "A") { this.w.solDir.set(-3.4, 2.1, 2.9); this.w.sol.intensity = 3.6; }
    else if (dir === "B") this.w.solDir.set(-2.2, 4.6, 3.2);
    else this.w.solDir.set(-1.5, 5, 3);
    this.w.sol.shadow.mapSize.set(4096, 4096);
    Object.assign(this.w.sol.shadow.camera, { left: -3.2, bottom: -3.2, right: 3.2, top: 3.2, near: 0.5, far: 40 });
    this.w.sol.shadow.bias = -0.0002;
    this.w.sol.shadow.normalBias = 0.006;
    this.corte = new Corte(sc, 10);
    this.corte.planos.push(this.planoVirada);
    this.maq = new Maquete(k, this.corte);
    sc.add(this.maq.g);
    // planta: a mesa vira o papel quadriculado da prancha
    if (dir === "C") this.maq.mesa.material = new THREE.MeshBasicMaterial({ map: texGradeMesa(), toneMapped: false });
    this.canos = new Canos(k, this.corte, sc);
    this.vaso = new Vaso(k, this.corte);
    sc.add(this.vaso.g);
    this.ped = new Figura(k);
    sc.add(this.ped.raiz);
    this.barata = new Barata(k);
    sc.add(this.barata.g);
    this.alg = new Algodao(k);
    sc.add(this.alg.g);
    // gotas da água correndo pelos canos (entram no corte como água)
    const mAg = k.mat({ tipo: "agua", color: 0x4f9ad6, rough: 0.05, clear: 1, liso: true });
    for (let i = 0; i < 280; i++) {
      const me = new THREE.Mesh(esfera(1, 14, 10), mAg);
      me.visible = false;
      sc.add(me);
      this.corte.registra(me, "agua");
      this.gotas.push(me);
    }
    for (let i = 0; i < 90; i++) {
      const me = new THREE.Mesh(esfera(1, 14, 10), this.canos.matGord);
      me.visible = false;
      sc.add(me);
      this.corte.registra(me, "gordura");
      this.oleo.push(me);
    }
    this.entupe = new THREE.Mesh(esfera(1, 24, 16), k.mat({ color: 0x4a2e18, rough: 0.8, liso: true }));
    sc.add(this.entupe);
    this.corte.registra(this.entupe, "entupe");
    this.bolinha = k.m(esfera(0.0085, 16, 12), k.mat({ color: 0x5a3418, rough: 0.6, liso: true }), 0, sc);
    // poça suja no fundo do buraco
    this.poca = k.m(new THREE.CircleGeometry(0.075, 40), k.mat({ color: 0x5f5a3c, tipo: "agua", rough: 0.08, clear: 1, liso: true }), 0, sc, [BUR[0], -BUR_P * 0.72, BUR[2]], [-Math.PI / 2, 0, 0]);
    this.corte.recorta(this.poca);
    // o que não é cortado pelo corte só é varrido pela virada
    sc.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.material) return;
      for (const mm of Array.isArray(me.material) ? me.material : [me.material]) if (!mm.clippingPlanes || mm.clippingPlanes.length === 0) mm.clippingPlanes = [this.planoVirada];
    });
    this.corte.set(null);
    this.fundo = dir === "A" ? texFundo() : dir === "B" ? texFundoToon() : texPlanta();
    sc.background = this.fundo;
    this.base = { sol: this.w.sol.intensity, hemi: this.w.hemi.intensity };
  }

  sol(alvo: THREE.Vector3) {
    const { sol } = this.w;
    sol.position.copy(alvo).addScaledVector(this.w.solDir.clone().normalize(), 14);
    sol.target.position.copy(alvo);
    sol.target.updateMatrixWorld();
  }

  aplica(e: Estado) {
    const t = e.t;
    const sc = this.w.scene;
    sc.background = this.fundo;
    this.w.final.uniforms.escuro.value = e.escuro ?? 0;
    this.w.hemi.intensity = this.base.hemi;
    // cenário
    this.maq.setBuraco(e.buraco ?? 0);
    this.poca.visible = (e.poca ?? 0) > 0.01 && (e.buraco ?? 0) > 0.5;
    this.poca.scale.setScalar(Math.max(0.01, e.poca ?? 0));
    const tl = e.telhado ?? 1;
    this.maq.telhado.visible = tl > 0.01;
    this.maq.telhado.position.y = (1 - tl) * (1 - tl) * 1.2;
    const pia = e.pia ?? {};
    this.maq.pia.agua.visible = (pia.nivel ?? 0) > 0.01;
    this.maq.pia.agua.scale.y = Math.max(0.05, pia.nivel ?? 0);
    const y0 = this.maq.pia.agua.userData.y0 ?? (this.maq.pia.agua.userData.y0 = this.maq.pia.agua.position.y);
    this.maq.pia.agua.position.y = y0 + 0.028 * (pia.nivel ?? 0);
    this.maq.pia.aguaPiso.visible = (pia.piso ?? 0) > 0.01;
    this.maq.pia.aguaPiso.scale.setScalar(Math.max(0.01, pia.piso ?? 0));
    // canos
    for (const [nome, p] of Object.entries(this.canos.pecas)) {
      const v = e.pecas?.[nome];
      if (v === undefined) p.aplica(0);
      else if (typeof v === "number") p.aplica(v);
      else p.aplica(v[0], v[1]);
    }
    // caimento: o ramal até a rua inclina; a descida da cozinha estica até ele
    const ang = e.inclina ?? 0;
    this.canos.pecas.rua.ang = ang;
    const vr = e.pecas?.rua;
    if (vr !== undefined) typeof vr === "number" ? this.canos.pecas.rua.aplica(vr) : this.canos.pecas.rua.aplica(vr[0], vr[1]);
    this.canos.cozDesce.scale.y = Math.max(0.01, Y_COZ - 0.03 - (yRamal(XCI1, ang) + R_ESG * 0.3));
    this.canos.aplicaGordura(e.gordura ?? 0);
    // caixa sifonada: grelha + furo no piso só com a caixa; nível da água
    const csK = typeof e.pecas?.cs === "number" ? e.pecas.cs : e.pecas?.cs ? e.pecas.cs[0] : 0;
    this.maq.grelhaCS.visible = csK > 0.74;
    this.maq.uRalo.value.w = csK >= 1 ? 1 : 0;
    const nCS = e.cs ?? 1;
    this.canos.csAgua.visible = nCS > 0.02;
    this.canos.csAgua.scale.y = Math.max(0.02, nCS);
    this.canos.csEspelho.visible = nCS > 0.92;
    // caixa de gordura: água, gordura boiando e a tampa aberta
    const cg = e.cg ?? {};
    this.canos.cgAgua.visible = (cg.agua ?? 1) > 0.02;
    this.canos.cgAgua.scale.y = Math.max(0.02, cg.agua ?? 1);
    this.canos.cgGordura.visible = (cg.gordura ?? 1) > 0.02;
    this.canos.cgGordura.scale.set(1, Math.max(0.05, cg.gordura ?? 1), 1);
    const tp = cg.tampa ?? 0;
    this.canos.cgTampa.position.set(XCG + 0.2 * tp, 0.03 * Math.sin(Math.PI * Math.min(1, tp)), this.canos.cgTampa.position.z);
    this.canos.cgTampa.rotation.z = -0.25 * tp;
    this.maq.uCaixa.value.set(XCG, ZK, 0.07, tp > 0.3 ? 1 : 0);
    const ct = e.ciTampa ?? [0, 0, 0];
    this.maq.uCaixa2.value.set(XCI1, ZP, 0.045, (ct[2] ?? 0) > 0.3 ? 1 : 0);
    this.canos.ciTampas.forEach((tm, i) => { const a = ct[i] ?? 0; tm.rotation.z = 1.25 * a; tm.position.y = 0.06 * a; });
    // entupimento no meio do quintal
    const en = e.entupe ?? 0;
    this.entupe.visible = en > 0.01;
    this.entupe.position.set(X_ENTUPE, yRamal(X_ENTUPE, ang), ZP);
    this.entupe.scale.set(R_ESG * 2.2 * en, R_ESG * 0.8 * Math.min(1, en * 1.3), R_ESG * 0.8 * Math.min(1, en * 1.3));
    this.bolinha.visible = !!e.bolinha;
    if (e.bolinha) this.bolinha.position.set(...e.bolinha);
    // frigideira virando sobre a cuba
    const fr = e.frig ?? 0;
    const f0 = this.maq.frigideira.userData.p0 ?? (this.maq.frigideira.userData.p0 = this.maq.frigideira.position.clone());
    this.maq.frigideira.position.set(f0.x + (PIA[0] - 0.05 - f0.x) * Math.min(1, fr * 1.5), f0.y + 0.06 * Math.sin(Math.PI * Math.min(1, fr * 1.5) / 2), f0.z);
    this.maq.frigideira.rotation.z = -0.95 * Math.max(0, fr * 1.5 - 0.5);
    // banheiro alagado
    const bh = e.banho ?? 0;
    this.maq.aguaBanho.visible = bh > 0.01;
    this.maq.aguaBanho.scale.setScalar(Math.max(0.01, bh));
    this.vaso.aplica({ canal: e.vaso?.canal ?? "reto", nivel: e.vaso?.nivel, queda: e.vaso?.queda });
    // água correndo
    let j = 0;
    for (const jt of e.jatos ?? []) {
      const P = jt.pts.map((p) => new THREE.Vector3(...p));
      const seg: number[] = [];
      let L = 0;
      for (let i = 1; i < P.length; i++) { seg.push(P[i].distanceTo(P[i - 1])); L += seg[seg.length - 1]; }
      const len = jt.len ?? 0.25, r = jt.r ?? 0.012, n = Math.max(4, Math.min(this.gotas.length - j, Math.ceil(len / (r * 0.45))));
      for (let i = 0; i < n && j < this.gotas.length; i++) {
        const s = jt.u * (L + len) - (i / (n - 1)) * len;
        if (s < 0 || s > L) continue;
        let d = s, k = 0;
        while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
        const g = this.gotas[j++];
        g.visible = true;
        g.position.copy(P[k]).lerp(P[k + 1], Math.min(1, d / seg[k]));
        g.scale.setScalar(r * (i === 0 || i === n - 1 ? 0.75 : 1));
      }
    }
    for (; j < this.gotas.length; j++) this.gotas[j].visible = false;
    // óleo (mesma lógica, pool próprio)
    let jo = 0;
    for (const jt of e.oleo ?? []) {
      const P = jt.pts.map((p) => new THREE.Vector3(...p));
      const seg: number[] = [];
      let L = 0;
      for (let i = 1; i < P.length; i++) { seg.push(P[i].distanceTo(P[i - 1])); L += seg[seg.length - 1]; }
      const len = jt.len ?? 0.2, r = jt.r ?? 0.006, n = Math.max(4, Math.ceil(len / (r * 0.5)));
      for (let i = 0; i < n && jo < this.oleo.length; i++) {
        const s = jt.u * (L + len) - (i / (n - 1)) * len;
        if (s < 0 || s > L) continue;
        let d = s, kk = 0;
        while (kk < seg.length - 1 && d > seg[kk]) { d -= seg[kk]; kk++; }
        const g = this.oleo[jo++];
        g.visible = true;
        g.position.copy(P[kk]).lerp(P[kk + 1], Math.min(1, d / seg[kk]));
        g.scale.setScalar(r);
      }
    }
    for (; jo < this.oleo.length; jo++) this.oleo[jo].visible = false;
    void R_COZ;
    // personagens e cheiro
    if (e.ped) this.ped.aplica(e.ped); else this.ped.raiz.visible = false;
    this.barata.aplica(e.barata, t);
    this.alg.aplica(e.nuvens, t);
    // corte
    this.corte.set(e.corte === undefined ? null : e.corte, "z");
    this.corte.tempo(t);
    // câmera e foco
    const alvo = new THREE.Vector3(...e.cam.alvo);
    orbita(this.w.camera, alvo, e.cam);
    this.w.camera.updateMatrixWorld();
    this.foco = e.cam.foco ?? 0.45;
    this.forca = e.cam.forca ?? 0.85;
    this.larg = e.cam.larg ?? 1;
    this.sol(new THREE.Vector3(alvo.x * 0.6, 0, alvo.z * 0.6));
    // virada: congela em arame laranja + partículas
    const v = e.virada;
    if (this.virada) this.virada.g.visible = false;
    this.planoVirada.constant = 1000;
    this.planoVirada.normal.set(1, 0, 0);
    if (v && v.k > 0.001) {
      if (!this.virada) {
        sc.updateMatrixWorld(true);
        const alvos = [this.maq.g, this.vaso.g, this.ped.raiz, this.barata.g, ...Object.values(this.canos.pecas).map((p) => p.g)];
        this.virada = new Virada(alvos, new THREE.Vector3(-0.3, 0.4, -0.3), this.kit.W, this.kit.H);
        sc.add(this.virada.g);
      }
      this.virada.g.visible = true;
      this.virada.aplica(v.k, v.k2, t);
      this.planoVirada.normal.copy(this.virada.planoSolido.normal);
      this.planoVirada.constant = this.virada.planoSolido.constant;
      sc.background = this.tinta;
      this.w.hemi.intensity = this.base.hemi * (1 - 0.4 * Math.min(1, v.k * 2));
    }
  }

  render(t: number) {
    this.w.quadro(t, this.foco, this.forca, this.larg);
  }
}
