// Vaso sanitário em louça, de perfil para +x. Dois canais: "reto" (sem sifão: o cheiro sobe) e "sifão" (curva embutida
// na louça com água parada). A curva do sifão também existe como peça solta que cai do alto e encaixa no corte.
import * as THREE from "three";
import { Kit, caixa, cil } from "./kit";
import { Corte } from "./corte";
import { tornoFechado, tuboCurva, V3 } from "./geo";
import { XV, ZP, FY } from "./maquete";

export const YW = 0.088; // nível da água parada (bacia e sifão), local
const BX = 0.025; // centro da bacia (local x)
const SX = 1.2; // a bacia é oval (alongada em x)
const IN: [number, number][] = [[0.01, 0.055], [0.025, 0.075], [0.045, 0.11], [0.054, 0.13]];
const rIn = (y: number) => {
  for (let i = 0; i < IN.length - 1; i++) { const [r0, y0] = IN[i], [r1, y1] = IN[i + 1]; if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); }
  return IN[IN.length - 1][0];
};
const CR = 0.011; // raio do canal
const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);
export const CURVA_SIFAO = new THREE.CatmullRomCurve3([v(0.02, 0.066), v(0.012, 0.036), v(-0.012, 0.024), v(-0.032, 0.045), v(-0.04, 0.083), v(-0.052, 0.098), v(-0.064, 0.08), v(-0.068, 0.04), v(-0.068, -0.006)], false, "centripetal");
export const CURVA_RETA = new THREE.CatmullRomCurve3([v(0.02, 0.066), v(-0.02, 0.036), v(-0.064, 0.014), v(-0.068, -0.006)], false, "centripetal");
/** saída do vaso no piso (mundo) */
export const SAIDA_VASO: V3 = [XV - 0.068, FY, ZP];

/** sub-curva de c entre u0 e u1 */
function sub(c: THREE.Curve<THREE.Vector3>, u0: number, u1: number, n = 30) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(c.getPointAt(u0 + ((u1 - u0) * i) / n));
  return new THREE.CatmullRomCurve3(pts);
}
/** parâmetro (por comprimento) onde o canal do sifão volta a subir até o nível da água */
function uNivel() {
  let passouFundo = false;
  for (let i = 0; i <= 400; i++) {
    const u = i / 400, p = CURVA_SIFAO.getPointAt(u);
    if (p.y < 0.03) passouFundo = true;
    if (passouFundo && p.y >= YW - 0.004) return u;
  }
  return 0.45;
}

export class Vaso {
  g = new THREE.Group();
  ocoReto: THREE.Mesh;
  ocoSifao: THREE.Mesh;
  aguaSifao: THREE.Mesh;
  aguaBacia: THREE.Mesh;
  peca = new THREE.Group(); // a curva do sifão como peça solta (cai e encaixa)
  tampa: THREE.Group;
  constructor(k: Kit, C: Corte) {
    const g = this.g;
    g.position.set(XV, FY, ZP);
    const louca = k.mat({ color: 0xf6f5f1, rough: 0.14, clear: 1, liso: true });
    const assento = k.mat({ color: 0xf0eee8, rough: 0.3, clear: 0.6, liso: true });
    const escuro = k.mat({ color: 0x141312, rough: 0.9, liso: true });
    const agua = k.mat({ tipo: "agua", color: 0x5aa2da, rough: 0.04, clear: 1, liso: true, transp: 0.88 });
    // bacia (casca fechada), pé, corpo de trás e caixa acoplada
    const perfil: [number, number][] = [[0.03, 0.05], [0.046, 0.08], [0.058, 0.108], [0.062, 0.126], [0.06, 0.131], [0.054, 0.131], ...[...IN].reverse().slice(1).map(([r, y]) => [r, y] as [number, number]), [0.008, 0.05], [0.03, 0.05]];
    const bacia = k.m(tornoFechado(perfil, 56), louca, 0, g, [BX, 0, 0], [0, 0, 0], [SX, 1, 1]);
    const pe = k.m(tornoFechado([[0.0, 0.0], [0.042, 0.0], [0.031, 0.03], [0.028, 0.06], [0.02, 0.075], [0.0, 0.075]], 48), louca, 0, g, [BX + 0.005, 0, 0], [0, 0, 0], [1.25, 1, 1]);
    const corpo = k.m(caixa(0.1, 0.115, 0.08, 0.02), louca, 0, g, [-0.055, 0.0575, 0]);
    const caixaA = k.m(caixa(0.05, 0.1, 0.15, 0.012), louca, 0, g, [-0.08, 0.165, 0]);
    k.m(caixa(0.056, 0.008, 0.155, 0.004), louca, 0, g, [-0.08, 0.218, 0]);
    k.m(cil(0.008, 0.008, 0.003, 20), k.mat({ color: 0xcfd2d4, rough: 0.15, metal: 1, liso: true }), 0, g, [-0.08, 0.223, 0]);
    for (const me of [bacia, pe, corpo, caixaA]) C.registra(me, "louca");
    // assento e tampa levantada
    const anel = k.m(new THREE.TorusGeometry(0.055, 0.007, 12, 48), assento, 0, g, [BX, 0.136, 0], [Math.PI / 2, 0, 0], [SX, 1, 0.55]);
    anel.scale.set(SX, 1, 1);
    this.tampa = new THREE.Group();
    this.tampa.position.set(-0.04, 0.136, 0);
    k.m(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 40), assento, 0, this.tampa, [0.0, 0.06, 0], [0, 0, Math.PI / 2 - 0.18], [1, 1, 1]);
    this.tampa.children[0].scale.set(1, 1, 0.95);
    g.add(this.tampa);
    C.recorta(anel); C.recorta(this.tampa);
    // canais (miolo escuro) e água parada
    this.ocoReto = new THREE.Mesh(tuboCurva(CURVA_RETA, CR, 40), escuro);
    this.ocoSifao = new THREE.Mesh(tuboCurva(CURVA_SIFAO, CR, 80), escuro);
    for (const o of [this.ocoReto, this.ocoSifao]) { g.add(o); C.registra(o, "oco"); }
    const uw = uNivel();
    this.aguaSifao = new THREE.Mesh(tuboCurva(sub(CURVA_SIFAO, 0.0, uw), CR * 0.97, 60), agua);
    g.add(this.aguaSifao);
    C.registra(this.aguaSifao, "agua");
    const pa: [number, number][] = [[0.0, 0.052], [0.009, 0.052]];
    for (let y = 0.058; y < YW; y += 0.006) pa.push([rIn(y) - 0.0012, y]);
    pa.push([rIn(YW) - 0.0012, YW], [0.0, YW]);
    this.aguaBacia = k.m(tornoFechado(pa, 48), agua, 0, g, [BX, 0, 0], [0, 0, 0], [SX, 1, 1]);
    C.registra(this.aguaBacia, "agua");
    // peça solta do sifão: casca de louça + miolo + água (mesma curva, em coordenadas locais do vaso)
    const pc = this.peca;
    const casca = k.m(tuboCurva(CURVA_SIFAO, CR * 1.45, 80), louca, 0, pc);
    const miolo = new THREE.Mesh(tuboCurva(CURVA_SIFAO, CR, 80), escuro);
    const ag = new THREE.Mesh(tuboCurva(sub(CURVA_SIFAO, 0.0, uw), CR * 0.97, 60), agua);
    pc.add(miolo, ag);
    C.registra(casca, "louca"); C.registra(miolo, "oco"); C.registra(ag, "agua");
    g.add(pc);
  }

  /** canal: "reto" | "sifao"; nivel: 0..1 da água parada; queda: 0..1 da peça do sifão caindo (1 = encaixou) */
  aplica(e: { canal?: "reto" | "sifao"; nivel?: number; queda?: number; vis?: boolean }) {
    this.g.visible = e.vis !== false;
    const sif = e.canal === "sifao";
    this.ocoReto.visible = !sif;
    this.ocoSifao.visible = sif;
    const n = sif ? e.nivel ?? 1 : 0;
    this.aguaSifao.visible = sif && n > 0.02;
    this.aguaBacia.visible = sif && n > 0.02;
    this.aguaBacia.scale.set(SX, Math.max(0.02, 0.55 + 0.45 * n), 1);
    const q = e.queda ?? 0;
    this.peca.visible = q > 0 && q < 1;
    if (this.peca.visible) {
      // cai de cima com um quique pequeno no fim
      const t = Math.min(1, q / 0.78);
      const queda = (1 - t * t) * 0.55;
      const quique = q > 0.78 ? Math.sin(((q - 0.78) / 0.22) * Math.PI) * 0.012 : 0;
      this.peca.position.set(0, queda + quique, 0);
      this.peca.rotation.z = (1 - t) * 0.5;
    }
  }
}
