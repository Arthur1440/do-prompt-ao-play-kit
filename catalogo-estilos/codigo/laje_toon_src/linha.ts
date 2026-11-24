// Linha do tempo: cada plano e cada ação presos ao ÍNDICE das palavras da narração (fala.ts).
// Trocar a narração = regenerar fala.ts; os planos acompanham sozinhos.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Cam, EstadoPed } from "./three/mundo";
import type { Pose, Braco, Perna } from "./three/boneco";
import type { EstadoLaje } from "./three/laje";
import { HP, IX, IZ, E, ESCADA } from "./three/casa";
import { barriga } from "./three/laje";
import { degrau, DEGRAUS } from "./three/extras";

export const A = (i: number) => PALAVRAS[i].a;
export const B = (i: number) => PALAVRAS[i].b;
export const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
export const ei = (x: number) => Math.pow(c01(x), 3);
export const FPS = 30;
export const QUADROS = Math.round(DURACAO * FPS);
export const T_ULTIMO = (QUADROS - 1) / FPS;
type V3 = [number, number, number];

/** início do plano que começa na palavra i (o corte cai no vão antes dela) */
export const C = (i: number) => (i === 0 ? 0 : Math.max(B(i - 1) + 0.02, A(i) - 0.08));

export const lc = (a: Cam, b: Cam, x: number): Cam => {
  const e = eio(x);
  const L = (p = 0, q = 0) => p + (q - p) * e;
  const aa = a.alvo ?? [0, 0.8, 0], bb = b.alvo ?? [0, 0.8, 0];
  return { az: L(a.az, b.az), el: L(a.el, b.el), dist: L(a.dist, b.dist), fov: L(a.fov ?? 30, b.fov ?? 30), alvo: [L(aa[0], bb[0]), L(aa[1], bb[1]), L(aa[2], bb[2])], foco: L(a.foco ?? 0.45, b.foco ?? 0.45) };
};
/** tremida de câmera no impacto */
const treme = (c: Cam, t: number, t0: number, f = 1): Cam => {
  const k = Math.max(0, 1 - (t - t0) / 0.45) * (t >= t0 ? 1 : 0) * f;
  if (k <= 0) return c;
  const [x, y, z] = c.alvo ?? [0, 0.8, 0];
  return { ...c, alvo: [x + Math.sin(t * 71) * 0.04 * k, y + Math.cos(t * 83) * 0.04 * k, z] };
};

// ------------------------------------------------------------------------------------------ geometria da cena
const naEscada = (h: number): V3 => [ESCADA.x, h, ESCADA.zBase - (h / ESCADA.alt) * (ESCADA.zBase - (IZ + E + 0.03)) + 0.14];
export const CH0: V3 = [0.48, 0.03, 0.62]; // churrasqueira embaixo do despejo (gancho)
export const CH_IN: V3 = [0.05, 0.03, 0.12]; // churrasqueira no meio da casa, embaixo da laje
const TOPO_PE = 1.06;
export const YL = HP + 0.18; // topo da laje treliçada pronta
const LJ: EstadoLaje = { vigotas: 5, blocos: 1, capa: 1, cinta: 1 };
const NAN: V3 = [NaN, 0, 0];
const CH_TOPO = CH0[1] + 0.62;
const CORTE = IZ - 0.03; // corte que tira a parede da frente

// ------------------------------------------------------------------------------------------ poses do pedreiro
const BR: Braco = { abre: 0.18, frente: 0.05, cot: 0.25 };
function parado(pos: V3, rotY: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  return { pos, rotY, inclina: 0.02 * Math.sin(t * 2.1), bE: BR, bD: BR, cab: [0, 0.1 * Math.sin(t * 0.9), 0], ...x };
}
function andando(p0: V3, p1: V3, k: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  const pos: V3 = [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, p0[2] + (p1[2] - p0[2]) * k];
  const rotY = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]);
  const f = Math.sin(t * 10) * (k > 0 && k < 1 ? 1 : 0);
  return { pos, rotY, pulo: Math.abs(f) * 0.03, pE: { frente: 0.5 * f, joelho: 0.3 * Math.max(0, -f) }, pD: { frente: -0.5 * f, joelho: 0.3 * Math.max(0, f) }, bE: { abre: 0.15, frente: -0.4 * f, cot: 0.3 }, bD: { abre: 0.15, frente: 0.4 * f, cot: 0.3 }, ...x };
}
const ajoelha = (y: number) => ({ pE: { frente: 1.45, joelho: 1.5 } as Perna, pD: { frente: -0.05, joelho: 1.55 } as Perna, yo: y - 0.19 });
function martelando(pos: V3, rotY: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  const s = 0.5 + 0.5 * Math.sin(t * 11);
  const aj = ajoelha(pos[1]);
  return { pos: [pos[0], aj.yo, pos[2]], rotY, inclina: 0.35, pE: aj.pE, pD: aj.pD, bD: { abre: 0.2, frente: 0.8 + 1.3 * s, cot: 0.2 + 1.1 * s }, bE: { abre: 0.3, frente: 0.9, cot: 0.4 }, cab: [0.35, 0, 0], olhos: "foco", item: "martelo", itemMao: "D", ...x };
}
function susto(pos: V3, rotY: number, k: number, x: Partial<EstadoPed> = {}): EstadoPed {
  const p = Math.sin(Math.PI * c01(k * 1.8));
  return { pos, rotY, pulo: p * 0.22, inclina: -0.3 * c01(k * 3), olhos: "susto", boca: "O", bone: c01(k * 3) * (1 - eio(k01(k, 0.7, 1))) * 0.9, bE: { abre: 1.1, frente: 0.8, cot: 0.6 }, bD: { abre: 1.1, frente: 0.8, cot: 0.6 }, pE: { frente: 0.5 * p, joelho: 0.6 * p }, pD: { frente: -0.2 * p, joelho: 0.3 * p }, sq: 1 + 0.12 * p, ...x };
}
function feliz(pos: V3, rotY: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  const p = Math.abs(Math.sin(t * 7));
  return { pos, rotY, pulo: p * 0.12, sq: 1 + 0.06 * p, olhos: "feliz", bE: { abre: 0.5, frente: 2.7, cot: 0.3 }, bD: { abre: 0.5, frente: 2.7, cot: 0.3 }, ...x };
}
function coca(pos: V3, rotY: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  return { pos, rotY, olhos: "preocupado", bD: { abre: 0.5, frente: 2.3, cot: 2.1 + 0.18 * Math.sin(t * 16) }, bE: { abre: 0.2, frente: 0.3, cot: 0.9 }, cab: [-0.1, 0, 0.12], ...x };
}
function polegar(pos: V3, rotY: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  return { pos, rotY, olhos: "feliz", pulo: Math.abs(Math.sin(t * 5)) * 0.03, bD: { abre: 0.3, frente: 1.35, cot: 1.3 }, bE: { abre: 0.25, frente: 0.1, cot: 0.4 }, ...x };
}
function olhaCima(pos: V3, rotY: number, t: number, x: Partial<EstadoPed> = {}): EstadoPed {
  return { pos, rotY, olhos: "preocupado", cab: [-0.55, 0.15 * Math.sin(t * 1.3), 0], bE: { abre: 0.25, frente: 0.1, cot: 0.4 }, bD: { abre: 0.25, frente: 0.1, cot: 0.4 }, ...x };
}
function subindo(h: number, ciclo: number, extra: Partial<EstadoPed> = {}): EstadoPed {
  const f = Math.sin(ciclo * Math.PI * 2);
  const pE: Perna = { frente: 0.35 + 0.35 * Math.max(0, f), joelho: 0.2 + 0.7 * Math.max(0, f) };
  const pD: Perna = { frente: 0.35 + 0.35 * Math.max(0, -f), joelho: 0.2 + 0.7 * Math.max(0, -f) };
  return { pos: naEscada(h), rotY: Math.PI, inclina: 0.18, pE, pD, bE: { abre: 0.18, frente: 1.25 + 0.35 * f, cot: 0.5 }, bD: { abre: 0.12, frente: 0.25, cot: 0.35 }, cab: [-0.1, 0, 0], item: "balde", itemMao: "D", balde: { vira: 0 }, ...extra };
}
function despejando(vira: number, extra: Partial<EstadoPed> = {}): EstadoPed {
  return {
    pos: naEscada(TOPO_PE), rotY: Math.PI, inclina: 0.22 + 0.08 * vira,
    pE: { frente: 0.3, joelho: 0.25 }, pD: { frente: 0.1, joelho: 0.1 },
    bE: { abre: 0.0, frente: 1.0, cot: 0.4 }, bD: { abre: 0.0, frente: 1.05 - 0.1 * vira, cot: 0.35 },
    cab: [0.2, 0, 0], item: "balde", itemMao: "D", balde: { vira }, ...extra,
  };
}
function baldeando(pos: V3, rotY: number, vira: number, x: Partial<EstadoPed> = {}): EstadoPed {
  return { pos, rotY, inclina: 0.25 + 0.1 * vira, bE: { abre: 0.0, frente: 1.0, cot: 0.4 }, bD: { abre: 0.0, frente: 1.05, cot: 0.35 }, cab: [0.35, 0, 0], olhos: "foco", item: "balde", itemMao: "D", balde: { vira }, ...x };
}
const queda = (p0: V3, p1: V3, k: number): V3 => { const e = k * k; return [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * e, p0[2] + (p1[2] - p0[2]) * k]; };
const churras = (p: V3 = CH_IN, x: Record<string, number> = {}) => ({ p, rotY: -0.25, olhos: 1, ...x });

// ------------------------------------------------------------------------------------------ gancho (palavras 0..42)
function gancho(t: number): Estado {
  const jatoK = eo(k01(t, A(3) - 0.08, A(3) + 0.42));
  const jato = { p0: NAN, p1: [CH0[0], CH_TOPO, CH0[2] + 0.02] as V3, cabeca: jatoK, cauda: 0, larg: 1 };
  const tImp = A(3) + 0.42;
  const montes = [{ p: [CH0[0], 0.03, CH0[2]] as V3, r: t > tImp ? 0.12 + 0.55 * eo(k01(t, tImp, A(43))) : 0, h: 0.06 + 0.22 * eo(k01(t, tImp, A(43))) }];
  const tB0 = A(20) - 0.05, tB1 = A(22) + 0.05;
  const kb = k01(t, tB0, tB1);
  const ach = eo(k01(t, tB1, tB1 + 0.25));
  const esmaga = t > tB1 ? 0.38 * (eo(k01(t, tB1, tB1 + 0.12)) - 0.35 * eio(k01(t, tB1 + 0.12, tB1 + 0.5))) : 0;
  const topoTampa = CH0[1] + 0.6 * (1 - 0.62 * esmaga);
  const bolas = t > tB0 ? [{ p: t < tB1 ? queda([CH0[0] + 0.02, HP + 0.35, CH0[2]], [CH0[0], CH_TOPO + 0.12, CH0[2]], kb) : [CH0[0], topoTampa + 0.17 * (1 - 0.6 * ach * 0.85) * 0.55, CH0[2]] as V3, r: 0.17, achata: ach * 0.85 }] : [];
  const ch = {
    p: CH0, rotY: -0.25, esmaga, susto: eio(k01(t, A(12), A(14))) * (t < tB1 ? 1 : 0), olhos: t < tB1 ? 1 : 1 - eio(k01(t, A(30), A(42))) * 0.7,
    tampa: 0, aperta: t > tB1 ? 1 - eio(k01(t, tB1 + 0.35, tB1 + 0.7)) : 0,
  };
  const resp = { p: [CH0[0], CH_TOPO, CH0[2]] as V3, k: k01(t, tB1, tB1 + 0.55), forca: 0.9 };
  const base = { casa: {}, laje: {}, ch, conc: { jatos: [jato], montes, bolas, respingos: resp } } as Partial<Estado>;
  if (t < C(12)) {
    const sub = k01(t, -0.5, A(2) - 0.1);
    const vira = eio(k01(t, A(2) - 0.1, A(3) + 0.2));
    const ped = sub < 1 ? subindo(0.55 + (TOPO_PE - 0.55) * eo(sub), sub * 2.2) : despejando(vira, { olhos: t > A(9) ? "susto" : "foco" });
    const cam = lc({ az: 58, el: 27, dist: 5.6, fov: 30, alvo: [0.5, 1.15, 1.05], foco: 0.5 }, { az: 48, el: 24, dist: 4.7, fov: 30, alvo: [0.5, 1.2, 1.0], foco: 0.5 }, k01(t, 0, C(12)));
    return { ...base, t, cam, ped } as Estado;
  }
  if (t < C(18)) {
    const cam = lc({ az: 176, el: -24, dist: 1.85, fov: 50, alvo: [0.5, 1.45, 0.95] }, { az: 180, el: -28, dist: 1.75, fov: 50, alvo: [0.5, 1.5, 0.98] }, k01(t, C(12), C(18)));
    return { ...base, t, cam, ped: despejando(1, { olhos: "susto", cab: [0.3, 0, 0] }) } as Estado;
  }
  if (t < C(23)) {
    const cam = lc({ az: 12, el: 9, dist: 2.3, fov: 30, alvo: [CH0[0], 0.5, CH0[2]], foco: 0.42 }, { az: 4, el: 6, dist: 2.0, fov: 30, alvo: [CH0[0], 0.45, CH0[2]], foco: 0.42 }, k01(t, C(18), C(23)));
    return { ...base, t, cam: treme(cam, t, tB1, 0.7), casa: { frente: false, escada: false }, ped: { ...despejando(1), vis: false } } as Estado;
  }
  if (t < C(30)) {
    const cam = lc({ az: 196, el: -4, dist: 2.4, fov: 32, alvo: [0.5, 1.72, 1.3], foco: 0.5 }, { az: 188, el: -2, dist: 2.05, fov: 32, alvo: [0.5, 1.74, 1.3], foco: 0.5 }, k01(t, C(23), C(30)));
    return { ...base, t, cam, ped: despejando(1, { olhos: "susto", boca: "O", cab: [0.05, 0.15, 0], bone: 0.5 * eo(k01(t, A(26), A(26) + 0.2)) * (1 - eio(k01(t, A(28), A(29)))) }) } as Estado;
  }
  const cam = lc({ az: -16, el: 11, dist: 8.0, fov: 30, alvo: [0.0, 0.85, 0.3], foco: 0.5 }, { az: -10, el: 9, dist: 7.2, fov: 30, alvo: [0.05, 0.8, 0.3], foco: 0.5 }, k01(t, C(30), C(43)));
  const fat = 3.0 * (1 - eio(k01(t, C(30), C(30) + 0.5)));
  return { ...base, t, cam, corte: CORTE + fat, ped: despejando(1, { olhos: "susto", cab: [0.5, -0.5, 0] }) } as Estado;
}

// ------------------------------------------------------------------------------------------ planos (palavra de início -> estado)
type Plano = { i: number; f: (t: number, k: number) => Estado };
const nEsc = (t: number) => 12 * eo(k01(t, A(76), A(92)));
const yMac = (lv: number, x: number) => HP + 0.16 * 2.2 - lv * 0.22 * barriga(x);

export const PLANOS: Plano[] = [
  { i: 0, f: (t) => gancho(t) },
  // ======================= 1. escoras
  { i: 43, f: (t, k) => { // monta um piso de tábua (time-lapse)
    const n = 9 * eio(k01(t, A(45), B(51)));
    const z = IZ - 0.12 - (Math.min(n, 8.6) / 9) * 2 * IZ;
    return { t, cam: lc({ az: 24, el: 34, dist: 6.4, fov: 30, alvo: [0.15, HP - 0.1, 0.05] }, { az: 16, el: 30, dist: 5.6, fov: 30, alvo: [0.15, HP - 0.05, 0.0] }, k),
      laje: { tabuas: n }, ch: churras(), ped: martelando([0.55, HP + 0.035, z + 0.05], -0.6, t) };
  } },
  { i: 52, f: (t, k) => { // pra segurar o concreto até ele endurecer
    const cf = eo(k01(t, A(53), B(58)));
    return { t, cam: lc({ az: 62, el: 22, dist: 5.4, fov: 30, alvo: [0.45, HP + 0.05, 0.85] }, { az: 70, el: 18, dist: 4.9, fov: 30, alvo: [0.45, HP + 0.05, 0.85] }, k),
      laje: { tabuas: 9, concForma: cf }, ch: churras(), ped: despejando(eio(k01(t, A(53) - 0.2, A(53) + 0.1)), { olhos: "foco" }),
      conc: { jatos: [{ p0: NAN, p1: [0.45, HP + 0.04, 0.6], cabeca: eo(k01(t, A(53) - 0.05, A(53) + 0.3)), cauda: eio(k01(t, B(58) - 0.2, B(58) + 0.2)) }] } };
  } },
  { i: 59, f: (t, k) => { // mas o concreto molhado é tão pesado que a tábua…
    const vg = 0.22 * eio(k01(t, A(65), C(69)));
    return { t, cam: lc({ az: -8, el: 4, dist: 7.4, fov: 30, alvo: [0.15, 0.95, 0] }, { az: -4, el: 4, dist: 6.6, fov: 30, alvo: [0.15, 0.95, 0] }, k), corte: CORTE,
      casa: { escada: false }, laje: { tabuas: 9, concForma: 1, tabVerga: vg }, ch: churras(CH_IN, { susto: 0.4 }),
      ped: olhaCima([0.78, 0.0, 0.55], -0.4, t) };
  } },
  { i: 69, f: (t, k) => { // verga no meio… e despenca
    const vg = 0.22 + 0.78 * eo(k01(t, A(69), B(71)));
    const q = eo(k01(t, A(73) - 0.05, A(73) + 0.7));
    const tI = A(73) + 0.35;
    const ach = eo(k01(t, tI, tI + 0.2));
    const bolas = t > A(73) ? [
      { p: t < tI ? queda([0.0, HP - 0.1, 0.1], [CH_IN[0], 0.7, CH_IN[2]], k01(t, A(73), tI)) : [CH_IN[0], 0.47 + 0.08 * (1 - ach), CH_IN[2]] as V3, r: 0.2, achata: ach * 0.8 },
      { p: queda([-0.4, HP - 0.1, -0.3], [-0.45, 0.12, -0.3], k01(t, A(73) + 0.05, tI + 0.05)), r: 0.15, achata: eo(k01(t, tI + 0.05, tI + 0.25)) * 0.7 },
      { p: queda([0.45, HP - 0.1, -0.4], [0.5, 0.1, -0.45], k01(t, A(73) + 0.1, tI + 0.1)), r: 0.14, achata: eo(k01(t, tI + 0.1, tI + 0.3)) * 0.7 },
    ] : [];
    return { t, cam: treme(lc({ az: 24, el: 10, dist: 4.4, fov: 30, alvo: [0.15, 0.95, 0.1] }, { az: 20, el: 8, dist: 4.0, fov: 30, alvo: [0.2, 0.85, 0.1] }, k), t, tI), corte: CORTE,
      casa: { escada: false }, laje: { tabuas: 9, concForma: 1, tabVerga: vg, tabQuebra: q },
      ch: churras(CH_IN, { susto: t < tI ? 1 : 0, esmaga: t > tI ? 0.45 * eo(k01(t, tI, tI + 0.1)) : 0, aperta: t > tI ? 1 : 0 }),
      conc: { bolas, respingos: { p: [CH_IN[0], 0.62, CH_IN[2]], k: k01(t, tI, tI + 0.6) } },
      ped: t < A(73) ? olhaCima([0.78, 0.0, 0.55], -0.4, t, { olhos: "susto" }) : susto([0.78 + 0.25 * eo(k01(t, A(73), A(73) + 0.4)), 0, 0.6], -0.4, k01(t, A(73), A(73) + 0.9)) };
  } },
  { i: 74, f: (t, k) => { // então você põe paus em pé embaixo das tábuas
    const kk = k01(t, C(74), C(83));
    return { t, cam: lc({ az: -20, el: 3, dist: 6.0, fov: 30, alvo: [0.2, 0.8, 0] }, { az: -14, el: 5, dist: 5.4, fov: 30, alvo: [0.25, 0.8, 0] }, k), corte: CORTE,
      casa: { escada: false }, laje: { tabuas: 9, escoras: nEsc(t) }, ch: churras(CH_IN, { olhos: 1 }),
      ped: andando([1.15, 0, 0.75], [0.55, 0, 0.45], eio(kk * 1.3), t, { item: "escora", itemMao: "D", bD: { abre: 0.1, frente: 0.6, cot: 0.9 }, olhos: "foco" }) };
  } },
  { i: 83, f: (t, k) => { // mais ou menos a cada metro, apoiados firme no chão
    return { t, cam: lc({ az: 18, el: 14, dist: 3.1, fov: 30, alvo: [-0.55, 0.38, 0.05] }, { az: 12, el: 11, dist: 2.8, fov: 30, alvo: [-0.6, 0.34, 0.05] }, k), corte: CORTE,
      casa: { escada: false }, laje: { tabuas: 9, escoras: nEsc(t) }, ch: churras(CH_IN),
      ped: martelando([-0.62, 0, 0.32], 2.4, t, { cab: [0.5, 0, 0] }) };
  } },
  { i: 93, f: (t, k) => { // essas são as escoras (com o concreto em cima, segura)
    return { t, cam: lc({ az: -6, el: 5, dist: 7.2, fov: 30, alvo: [0.0, 0.9, 0] }, { az: -2, el: 5, dist: 6.8, fov: 30, alvo: [0.0, 0.9, 0] }, k), corte: CORTE,
      casa: { escada: false }, laje: { tabuas: 9, escoras: 12, concForma: 1 }, ch: churras(CH_IN),
      ped: polegar([0.85, 0, 0.6], -0.5, t) };
  } },
  { i: 97, f: (t, k) => { // é por isso que casa em obra fica… (pela porta)
    return { t, cam: lc({ az: -6, el: 3, dist: 3.6, fov: 30, alvo: [0.0, 0.75, IZ] }, { az: 0, el: 2, dist: 2.9, fov: 30, alvo: [0.0, 0.75, IZ] }, k),
      casa: {}, laje: { tabuas: 9, escoras: 12, concForma: 1 }, ch: churras(CH_IN),
      ped: andando([0.75, 0, 2.15], [0.42, 0, 1.6], eio(k), t, { olhos: "normal", cab: [0, 0.5, 0] }) };
  } },
  { i: 104, f: (t, k) => { // semanas com aquele monte de pau embaixo da laje (de dentro, olhando para cima)
    return { t, cam: lc({ az: 205, el: -32, dist: 1.6, fov: 56, alvo: [0.2, 1.25, 0.3] }, { az: 220, el: -36, dist: 1.5, fov: 56, alvo: [0.2, 1.3, 0.3] }, k),
      casa: {}, laje: { tabuas: 9, escoras: 12, concForma: 1 }, ch: churras(CH_IN), preenche: 1,
      ped: olhaCima([0.6, 0, 0.75], -0.6, t, { olhos: "normal" }) };
  } },
  // ======================= 2. armadura (corte da laje maciça)
  { i: 114, f: (t, k) => { // aguenta ser apertado, não esticado
    const st = 0.45 * eo(k01(t, A(119) - 0.1, A(119) + 0.3)) + 0.55 * eo(k01(t, A(121) - 0.1, A(121) + 0.3));
    return { t, cam: lc({ az: 0, el: 3, dist: 5.6, fov: 30, alvo: [0, HP - 0.05, 0] }, { az: 0, el: 3, dist: 5.0, fov: 30, alvo: [0, HP - 0.05, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, setas: st }, ped: coca([0.5, 0, -0.3], -0.3, t) };
  } },
  { i: 122, f: (t, k) => { // quando a laje carrega peso (de fora: os dois sobem)
    const lv = 0.5 * eo(k01(t, A(125), A(126) + 0.2));
    return { t, cam: lc({ az: 28, el: 10, dist: 6.4, fov: 30, alvo: [0, HP + 0.3, 0] }, { az: 22, el: 8, dist: 5.8, fov: 30, alvo: [0, HP + 0.25, 0] }, k),
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, laVerga: lv },
      ch: churras([-0.3, yMac(lv, -0.3), -0.25], { susto: 0.6 }), ped: andando([1.2, yMac(lv, 0.3), -0.2], [0.3, yMac(lv, 0.3), -0.25], eio(k01(t, C(122), A(125))), t, { olhos: "normal" }) };
  } },
  { i: 127, f: (t, k) => { // a parte de baixo estica… e trinca bem no meio
    const lv = 0.5;
    const tr = eo(k01(t, A(133) - 0.05, A(133) + 0.35));
    return { t, cam: treme(lc({ az: 0, el: 3, dist: 5.2, fov: 30, alvo: [0, HP + 0.12, 0] }, { az: 0, el: 2, dist: 4.6, fov: 30, alvo: [0, HP + 0.1, 0] }, k), t, A(133), 0.5), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, laVerga: lv, setas: 0.6 + 0.4 * eo(k01(t, A(131) - 0.2, A(131) + 0.2)), trinca: tr },
      ch: churras([-0.32, yMac(lv, -0.32), -0.35], { susto: tr }), ped: t < A(133) ? parado([0.3, yMac(lv, 0.3), -0.3], -0.25, t, { olhos: "preocupado", cab: [0.45, 0, 0] }) : susto([0.3, yMac(lv, 0.3), -0.3], -0.25, k01(t, A(133), A(133) + 0.8)) };
  } },
  { i: 137, f: (t, k) => { // então você põe barras de aço na parte de baixo
    const lv = 0.5;
    return { t, cam: lc({ az: -12, el: 2, dist: 4.6, fov: 30, alvo: [0.2, HP + 0.05, 0] }, { az: -6, el: 2, dist: 4.2, fov: 30, alvo: [0.1, HP + 0.05, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, laVerga: lv, setas: 1, trinca: 1, aco: eo(k01(t, A(139), B(146))) },
      ch: churras([-0.32, yMac(lv, -0.32), -0.35]), ped: parado([0.3, yMac(lv, 0.3), -0.3], -0.25, t, { olhos: "foco", cab: [0.5, 0, 0] }) };
  } },
  { i: 147, f: (t, k) => { // que é onde a laje estica (a trinca fecha)
    const lv = 0.5 - 0.3 * eo(k01(t, A(149), B(152)));
    return { t, cam: lc({ az: 6, el: 1, dist: 2.2, fov: 30, alvo: [0, HP + 0.15, 0] }, { az: 2, el: 1, dist: 2.0, fov: 30, alvo: [0, HP + 0.15, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, laVerga: lv, setas: 1, trinca: 1 - eo(k01(t, A(149), B(152))), aco: 1 },
      ch: churras([-0.32, yMac(lv, -0.32), -0.35]), ped: parado([0.3, yMac(lv, 0.3), -0.3], -0.25, t, { olhos: "normal", cab: [0.45, 0, 0] }) };
  } },
  { i: 153, f: (t, k) => { // essa é a armadura
    const lv = 0.2;
    return { t, cam: lc({ az: 8, el: 4, dist: 4.6, fov: 30, alvo: [0.05, HP + 0.2, 0] }, { az: 10, el: 4, dist: 4.4, fov: 30, alvo: [0.05, HP + 0.2, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, laVerga: lv, aco: 1 },
      ch: churras([-0.32, yMac(lv, -0.32), -0.35]), ped: polegar([0.3, yMac(lv, 0.3), -0.3], -0.25, t) };
  } },
  // ======================= 3. laje treliçada
  { i: 157, f: (t, k) => { // laje inteira de concreto pesada demais: as paredes afundam
    const af = eo(k01(t, A(164) - 0.05, A(164) + 0.5));
    return { t, cam: treme(lc({ az: -26, el: 10, dist: 7.8, fov: 30, alvo: [0.1, 0.95, 0] }, { az: -20, el: 8, dist: 7.0, fov: 30, alvo: [0.1, 0.9, 0] }, k), t, A(164), 0.8),
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.0 }, afunda: af,
      ped: t < A(164) ? parado([-1.25, 0, 1.85], 0.4, t, { cab: [-0.2, 0, 0] }) : susto([-1.25, 0, 1.85], 0.4, k01(t, A(164), A(164) + 0.8)) };
  } },
  { i: 168, f: (t, k) => { // e cara demais pro seu bolso (carteira vazia)
    return { t, cam: lc({ az: 18, el: 4, dist: 2.0, fov: 30, alvo: [-1.2, 0.72, 1.85] }, { az: 12, el: 3, dist: 1.7, fov: 30, alvo: [-1.2, 0.74, 1.85] }, k),
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.0 }, afunda: 1,
      ped: { pos: [-1.25, 0, 1.85], rotY: 0.3, olhos: "preocupado", cab: [0.35, 0, 0], bD: { abre: 0.1, frente: 1.25, cot: 1.0 }, bE: { abre: 0.1, frente: 1.2, cot: 1.0 }, item: "carteira", itemMao: "D" } };
  } },
  { i: 174, f: (t, k) => { // vigas finas já prontas (vigota no ombro)
    const nv = 5 * eo(k01(t, A(176), B(180)));
    return { t, cam: lc({ az: 42, el: 14, dist: 6.0, fov: 30, alvo: [1.15, 1.05, 1.0] }, { az: 34, el: 16, dist: 5.6, fov: 30, alvo: [0.8, 1.1, 0.7] }, k),
      casa: { escada: false }, laje: { vigotas: nv, escoras: 12 },
      ped: andando([2.4, 0, 1.8], [1.75, 0, 0.9], eio(k), t, { item: "vigota", itemMao: "D", bD: { abre: 0.4, frente: 2.6, cot: 1.9 }, olhos: "foco" }) };
  } },
  { i: 181, f: (t, k) => { // com uma treliça de aço em cima (close)
    return { t, cam: lc({ az: 32, el: 24, dist: 1.8, fov: 30, alvo: [0.3, HP + 0.08, 0.43] }, { az: 18, el: 20, dist: 1.5, fov: 30, alvo: [0.1, HP + 0.08, 0.43] }, k),
      casa: { escada: false }, laje: { vigotas: 5, escoras: 12 },
      ped: martelando([-0.25, HP + 0.03, 0.66], 2.8, t, { item: null, bD: { abre: 0.3, frente: 1.1, cot: 0.6 }, olhos: "normal" }) };
  } },
  { i: 188, f: (t, k) => { // no meio delas encaixa blocos de isopor (time-lapse)
    const bl = eio(k01(t, A(192), B(198)));
    const xr = -1.1 + 2.2 * bl;
    return { t, cam: lc({ az: 8, el: 46, dist: 5.4, fov: 30, alvo: [0, HP, 0] }, { az: 2, el: 50, dist: 5.0, fov: 30, alvo: [0, HP, 0] }, k),
      casa: { escada: false }, laje: { vigotas: 5, blocos: bl, escoras: 12 },
      ped: martelando([xr, HP + 0.12, 0.65], Math.PI, t, { item: null, bD: { abre: 0.2, frente: 1.3 + 0.3 * Math.sin(t * 9), cot: 0.5 }, bE: { abre: 0.2, frente: 1.3 - 0.3 * Math.sin(t * 9), cot: 0.5 } }) };
  } },
  { i: 199, f: (t, k) => { // por cima, só uma capa fina de concreto
    const cp = eo(k01(t, A(201), B(206)));
    return { t, cam: lc({ az: -22, el: 22, dist: 5.4, fov: 30, alvo: [0, HP, 0] }, { az: -16, el: 20, dist: 5.0, fov: 30, alvo: [0, HP, 0] }, k),
      casa: { escada: false }, laje: { vigotas: 5, blocos: 1, capa: cp, escoras: 12 },
      ped: baldeando([0.75, HP + 0.12 + 0.06 * cp, 0.2], -1.2, eio(k01(t, A(200), A(201) + 0.2))),
      conc: { jatos: [{ p0: NAN, p1: [0.25, HP + 0.15, 0.1], cabeca: eo(k01(t, A(201) - 0.05, A(201) + 0.3)), cauda: eio(k01(t, B(206) - 0.25, B(206) + 0.1)) }] } };
  } },
  { i: 207, f: (t, k) => { // essa é a laje treliçada (corte transversal: vigota, isopor, capa)
    return { t, cam: lc({ az: 90, el: 4, dist: 3.4, fov: 30, alvo: [0.2, HP + 0.12, 0] }, { az: 86, el: 5, dist: 3.1, fov: 30, alvo: [0.2, HP + 0.12, 0] }, k), corte: 0.2, corteEixo: "x",
      casa: { escada: false }, laje: { ...LJ, cinta: 0, escoras: 12 }, ped: polegar([-0.2, YL, 0.3], Math.PI / 2, t) };
  } },
  { i: 212, f: (t, k) => { // olhando a laje de baixo… (de dentro, para cima)
    return { t, cam: lc({ az: 180, el: -62, dist: 1.25, fov: 62, alvo: [0.0, HP - 0.1, 0.1] }, { az: 200, el: -66, dist: 1.2, fov: 62, alvo: [0.1, HP - 0.1, 0.0] }, k),
      casa: {}, laje: { ...LJ, cinta: 0 }, preenche: 1, ped: olhaCima([0.35, 0, 0.55], 0.4, t, { olhos: "normal" }) };
  } },
  { i: 221, f: (t, k) => { // aquelas fileiras de blocos
    return { t, cam: lc({ az: 90, el: -34, dist: 1.4, fov: 56, alvo: [-0.5, HP - 0.1, -0.1] }, { az: 96, el: -36, dist: 1.35, fov: 56, alvo: [-0.1, HP - 0.1, -0.1] }, k),
      casa: {}, laje: { ...LJ, cinta: 0 }, preenche: 1, ped: olhaCima([0.0, 0, 0.6], 0.2, t, { olhos: "feliz" }) };
  } },
  // ======================= 4. cinta
  { i: 228, f: (t, k) => { // a laje apoiada direto no tijolo amassa a parede
    const am = k01(t, A(235) - 0.05, A(235) + 0.9);
    return { t, cam: treme(lc({ az: 22, el: 6, dist: 2.4, fov: 30, alvo: [-0.55, HP - 0.15, IZ + E] }, { az: 16, el: 5, dist: 2.1, fov: 30, alvo: [-0.55, HP - 0.18, IZ + E] }, k), t, A(235), 0.4),
      casa: { escada: false }, laje: { ...LJ, cinta: 0 }, ex: { migalhas: am },
      ped: olhaCima([-0.15, 0, IZ + E + 0.55], 0.2, t) };
  } },
  { i: 238, f: (t, k) => { // e ela começa a rachar de cima pra baixo
    const r = eio(k01(t, A(242) - 0.05, B(246)));
    return { t, cam: lc({ az: 30, el: 8, dist: 6.2, fov: 30, alvo: [-0.2, 1.0, IZ] }, { az: 26, el: 7, dist: 5.7, fov: 30, alvo: [-0.2, 0.95, IZ] }, k),
      casa: { escada: false, racha: r }, laje: { ...LJ, cinta: 0 }, ped: t < A(242) ? olhaCima([0.05, 0, IZ + E + 0.75], -0.5, t) : susto([0.05, 0, IZ + E + 0.75], -0.5, k01(t, A(242), A(242) + 0.9)) };
  } },
  { i: 247, f: (t, k) => { // antes da laje, uma viga de concreto em cima de todas as paredes
    const ci = eio(k01(t, A(253), B(262)));
    return { t, cam: lc({ az: 32, el: 34, dist: 6.6, fov: 30, alvo: [0.1, HP - 0.1, 0.35] }, { az: 44, el: 32, dist: 6.2, fov: 30, alvo: [0.1, HP - 0.1, 0.35] }, k),
      casa: {}, laje: { cinta: ci }, ped: despejando(eio(k01(t, A(252), A(253) + 0.2)), { olhos: "foco" }),
      conc: { jatos: [{ p0: NAN, p1: [0.3, HP - 0.05, IZ + E / 2], cabeca: eo(k01(t, A(253) - 0.05, A(253) + 0.3)), cauda: eio(k01(t, B(262) - 0.2, B(262) + 0.15)), larg: 0.7 }] } };
  } },
  { i: 254, f: (t, k) => { // …uma viga de concreto em cima de todas as paredes (close na cinta correndo)
    const ci = eio(k01(t, A(253), B(262)));
    return { t, cam: lc({ az: -30, el: 22, dist: 3.4, fov: 30, alvo: [-0.6, HP - 0.1, 0.9] }, { az: -40, el: 20, dist: 3.2, fov: 30, alvo: [-0.9, HP - 0.1, 0.5] }, k),
      casa: {}, laje: { cinta: ci }, ped: despejando(1, { olhos: "foco" }),
      conc: { jatos: [{ p0: NAN, p1: [0.3, HP - 0.05, IZ + E / 2], cabeca: 1, cauda: eio(k01(t, B(262) - 0.2, B(262) + 0.15)), larg: 0.7 }] } };
  } },
  { i: 263, f: (t, k) => { // que espalha o peso por igual
    const ld = eo(k01(t, C(263), C(263) + 0.4));
    return { t, cam: lc({ az: -24, el: 16, dist: 6.4, fov: 30, alvo: [-0.2, HP - 0.1, 0.1] }, { az: -18, el: 14, dist: 6.0, fov: 30, alvo: [-0.2, HP - 0.1, 0.1] }, k),
      casa: { escada: false }, laje: { ...LJ, vigotas: 5 * ld + 0.001, blocos: ld, capa: ld }, ex: { setasCinta: eo(k01(t, A(264) - 0.1, A(266))) },
      ped: polegar([-0.95, 0, IZ + E + 0.55], 0.4, t) };
  } },
  { i: 269, f: (t, k) => { // essa é a cinta
    return { t, cam: lc({ az: 42, el: -8, dist: 3.0, fov: 30, alvo: [0.6, HP - 0.2, IZ + E] }, { az: 46, el: -8, dist: 2.8, fov: 30, alvo: [0.6, HP - 0.2, IZ + E] }, k),
      casa: { escada: false }, laje: LJ, ped: feliz([1.25, 0, IZ + E + 0.5], -0.6, t) };
  } },
  // ======================= 5. vibrador
  { i: 273, f: (t, k) => { // concreto jogado fica cheio de bolhas de ar
    const nb = eo(k01(t, A(280) - 0.1, A(280) + 0.4));
    const v = 1 - eio(k01(t, C(273), A(277)));
    return { t, cam: lc({ az: 0, el: 3, dist: 5.0, fov: 30, alvo: [0, HP + 0.25, 0] }, { az: 0, el: 3, dist: 4.4, fov: 30, alvo: [0, HP + 0.22, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, bolhas: nb, aco: 1 }, ped: baldeando([0.45, yMac(0, 0.45), -0.3], -0.6, v, { balde: { vira: v, cheio: 0 } }) };
  } },
  { i: 285, f: (t, k) => { // cada bolha vira um buraco que enfraquece a laje
    const lv = 0.35 * eo(k01(t, A(292), A(292) + 0.6));
    return { t, cam: lc({ az: 14, el: 2, dist: 1.6, fov: 30, alvo: [-0.4, HP + 0.18, 0] }, { az: 10, el: 2, dist: 1.4, fov: 30, alvo: [-0.35, HP + 0.16, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, bolhas: 1, aco: 1, laVerga: lv, trinca: 0.5 * eo(k01(t, A(292), A(292) + 0.5)) },
      ped: coca([0.45, yMac(lv, 0.45), -0.3], -0.6, t) };
  } },
  { i: 295, f: (t, k) => { // enfia no concreto uma máquina que treme (o pedreiro treme junto)
    const tr = eo(k01(t, A(302), A(303) + 0.1));
    const yT = yMac(0, 0.2);
    return { t, cam: lc({ az: 24, el: 18, dist: 2.9, fov: 30, alvo: [0.2, yT + 0.45, -0.1] }, { az: 18, el: 14, dist: 2.5, fov: 30, alvo: [0.2, yT + 0.45, -0.1] }, k),
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, bolhas: 1, aco: 1 },
      ped: { pos: [0.2, yT, -0.1], rotY: 0.3, inclina: 0.3, olhos: tr > 0.5 ? "susto" : "foco", boca: tr > 0.5 ? "O" : "nada", tremor: tr * 1.6, bone: tr * 0.35 * (0.5 + 0.5 * Math.sin(t * 40)), bD: { abre: 0.1, frente: 1.0, cot: 0.5 }, bE: { abre: 0.1, frente: 1.0, cot: 0.5 }, item: "vibrador", itemMao: "D" } };
  } },
  { i: 304, f: (t, k) => { // as bolhas sobem e saem
    return { t, cam: lc({ az: 0, el: 3, dist: 4.6, fov: 30, alvo: [0, HP + 0.25, 0] }, { az: 0, el: 3, dist: 4.2, fov: 30, alvo: [0, HP + 0.22, 0] }, k), corte: 0,
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, bolhas: 1, bolhasSobe: eio(k01(t, A(305), B(309))), aco: 1 },
      ped: { pos: [0.2, yMac(0, 0.2), -0.3], rotY: 0.2, inclina: 0.3, olhos: "susto", tremor: 1.4, bD: { abre: 0.1, frente: 1.0, cot: 0.5 }, bE: { abre: 0.1, frente: 1.0, cot: 0.5 }, item: "vibrador", itemMao: "D" } };
  } },
  { i: 310, f: (t, k) => { // esse é o vibrador
    const yT = yMac(0, 0.2);
    return { t, cam: lc({ az: -28, el: 14, dist: 2.7, fov: 30, alvo: [0.2, yT + 0.4, -0.1] }, { az: -22, el: 12, dist: 2.5, fov: 30, alvo: [0.2, yT + 0.4, -0.1] }, k),
      casa: { escada: false }, laje: { macica: 1, macEsp: 2.2, aco: 1 },
      ped: { pos: [0.2, yT, -0.1], rotY: 0.3, inclina: 0.25, olhos: "feliz", tremor: 0.5, bD: { abre: 0.1, frente: 1.0, cot: 0.5 }, bE: { abre: 0.6, frente: 2.6, cot: 0.3 }, item: "vibrador", itemMao: "D" } };
  } },
  // ======================= 6. cura
  { i: 314, f: (t, k) => { // o sol seca a água do concreto antes da hora
    return { t, cam: lc({ az: 12, el: 28, dist: 4.8, fov: 32, alvo: [0.1, YL + 0.2, 0] }, { az: 6, el: 24, dist: 4.4, fov: 32, alvo: [0.1, YL + 0.25, 0] }, k),
      casa: { escada: false }, laje: LJ, ex: { sol: eo(k01(t, A(316) - 0.2, A(316) + 0.3)) }, quente: 1, luzSol: 1.35,
      ped: { pos: [0.4, YL, 0.3], rotY: -0.3, olhos: "preocupado", cab: [-0.25, 0, 0], bD: { abre: 0.4, frente: 2.4, cot: 2.3 + 0.2 * Math.sin(t * 10) }, bE: BR } };
  } },
  { i: 325, f: (t, k) => { // a laje racha inteira, feito chão de seca (vista de cima)
    return { t, cam: lc({ az: 18, el: 58, dist: 4.4, fov: 32, alvo: [0.35, YL, 0.2] }, { az: 24, el: 62, dist: 4.0, fov: 32, alvo: [0.35, YL, 0.2] }, k),
      casa: { escada: false }, laje: { ...LJ, seca: eo(k01(t, A(328) - 0.1, B(333))) }, ex: { sol: 1 }, quente: 1, luzSol: 1.35,
      ped: susto([0.95, YL, 0.6], -0.6, k01(t, A(328), A(328) + 0.9)) };
  } },
  { i: 334, f: (t, k) => { // molha a laje todo dia, por vários dias (time-lapse de dias)
    const mo = eo(k01(t, A(336), A(337) + 0.4));
    const dia = 0.75 + 0.45 * Math.cos((t - A(339)) * 9) * c01((t - A(339)) * 3);
    return { t, cam: lc({ az: 32, el: 18, dist: 4.4, fov: 30, alvo: [0.2, YL + 0.3, 0.1] }, { az: 26, el: 16, dist: 4.0, fov: 30, alvo: [0.2, YL + 0.3, 0.1] }, k),
      casa: { escada: false }, laje: { ...LJ, seca: 1 - mo, molhada: mo }, ex: { sol: 1 - mo * 0.6 }, quente: 1 - mo, luzSol: t > A(339) ? dia : 1.2,
      ped: { pos: [0.75, YL, 0.45], rotY: -1.0, inclina: 0.1, olhos: "foco", bD: { abre: 0.2, frente: 1.4, cot: 0.4 }, bE: { abre: 0.2, frente: 1.2, cot: 0.6 }, item: "mangueira", itemMao: "D" },
      agua: { p0: NAN, p1: [-0.3 + 0.4 * Math.sin(t * 2), YL + 0.01, -0.1 + 0.3 * Math.cos(t * 1.6)], k: eo(k01(t, A(336) - 0.1, A(336) + 0.2)) } };
  } },
  { i: 344, f: (t, k) => { // essa é a cura
    return { t, cam: lc({ az: -50, el: 50, dist: 4.2, fov: 30, alvo: [0.4, YL + 0.2, 0.25] }, { az: -44, el: 52, dist: 4.0, fov: 30, alvo: [0.4, YL + 0.2, 0.25] }, k),
      casa: { escada: false }, laje: { ...LJ, molhada: 1 },
      ped: { pos: [0.75, YL, 0.45], rotY: -1.0, inclina: 0.1, olhos: "feliz", bD: { abre: 0.2, frente: 1.4, cot: 0.4 }, bE: { abre: 0.5, frente: 2.6, cot: 0.3 }, item: "mangueira", itemMao: "D" },
      agua: { p0: NAN, p1: [-0.4, YL + 0.01, -0.2], k: 1 } };
  } },
  { i: 348, f: (t, k) => { // é por isso que o pedreiro fica jogando água na laje (contraplongée)
    return { t, cam: lc({ az: 210, el: -14, dist: 2.3, fov: 34, alvo: [0.5, YL + 0.75, 0.3] }, { az: 200, el: -10, dist: 2.1, fov: 34, alvo: [0.5, YL + 0.75, 0.3] }, k),
      casa: {}, laje: { ...LJ, molhada: 1 },
      ped: { pos: [0.75, YL, 0.45], rotY: -1.6, inclina: 0.05, olhos: "normal", cab: [0.2, 0, 0], bD: { abre: 0.2, frente: 1.5, cot: 0.3 }, bE: { abre: 0.3, frente: 0.3, cot: 1.6 }, item: "mangueira", itemMao: "D" },
      agua: { p0: NAN, p1: [-0.5 + 0.3 * Math.sin(t * 1.5), YL + 0.01, 0.4], k: 1 } };
  } },
  // ======================= 7. esperar
  { i: 362, f: (t, k) => { // no dia seguinte você tira as escoras…
    const ti = eo(k01(t, A(367), A(367) + 0.35));
    return { t, cam: lc({ az: 4, el: 5, dist: 7.4, fov: 30, alvo: [-0.25, 0.85, 0] }, { az: 2, el: 5, dist: 7.0, fov: 30, alvo: [-0.25, 0.85, 0] }, k), corte: CORTE,
      casa: { escada: false }, laje: { ...LJ, escoras: 12, escoraTira: ti, escorasSai: eio(k01(t, A(368), B(369))) }, ch: churras(CH_IN),
      ped: { pos: [-0.75 + 0.12 * ti, 0, 0.35], rotY: Math.PI / 2 - 0.3, inclina: -0.15 * ti, olhos: "foco", bD: { abre: 0.2, frente: 1.2, cot: 0.4 }, bE: { abre: 0.2, frente: 1.2, cot: 0.4 }, pE: { frente: -0.3 * ti }, pD: { frente: 0.3 * ti } } };
  } },
  { i: 370, f: (t, k) => { // e a laje enverga inteira (esmaga a churrasqueira de novo)
    const lv = 4.1 * eo(k01(t, A(373) - 0.05, A(373) + 0.45));
    const tI = A(373) + 0.3;
    return { t, cam: treme(lc({ az: 16, el: 2, dist: 3.8, fov: 30, alvo: [-0.3, 0.7, 0.1] }, { az: 12, el: 2, dist: 3.5, fov: 30, alvo: [-0.3, 0.65, 0.1] }, k), t, tI), corte: CORTE,
      casa: { escada: false }, laje: { ...LJ, laVerga: lv, escoras: 12, escorasSai: 1 },
      ch: churras(CH_IN, { susto: t < tI ? 1 : 0, esmaga: t > tI ? 0.55 * eo(k01(t, tI, tI + 0.12)) : 0, aperta: t > tI ? 1 : 0 }),
      ped: susto([-1.0 - 0.1 * eo(k01(t, A(373), A(373) + 0.4)), 0, 0.5], 0.5, k01(t, A(373), A(373) + 0.9)) };
  } },
  { i: 375, f: (t, k) => { // porque o concreto não fica forte de uma vez (rebobina)
    const rb = eio(k01(t, C(375), C(375) + 1.0));
    return { t, cam: lc({ az: -18, el: 10, dist: 7.6, fov: 30, alvo: [-0.1, 0.9, 0] }, { az: -22, el: 11, dist: 7.8, fov: 30, alvo: [-0.1, 0.9, 0] }, k), corte: CORTE,
      casa: { escada: false }, laje: { ...LJ, laVerga: 4.1 * (1 - rb), escoras: 12, escorasSai: 1 - rb }, ch: churras(CH_IN, { esmaga: 0.55 * (1 - rb), aperta: rb < 0.9 ? 1 : 0 }),
      ped: rb < 1 ? { pos: [-1.0 + 0.3 * rb, 0, 0.5], rotY: 0.5, olhos: "susto", bE: { abre: 1.1, frente: 0.8, cot: 0.6 }, bD: { abre: 1.1, frente: 0.8, cot: 0.6 } } : coca([-0.7, 0, 0.5], 0.4, t), rebobina: rb < 1 };
  } },
  { i: 384, f: (t, k) => { // ele vai ganhando força com o tempo (corte da laje, a barra de força enche)
    return { t, cam: lc({ az: 90, el: 4, dist: 3.4, fov: 30, alvo: [0.2, HP + 0.05, 0] }, { az: 88, el: 4, dist: 3.1, fov: 30, alvo: [0.2, HP + 0.05, 0] }, k), corte: 0.2, corteEixo: "x",
      casa: { escada: false }, laje: { ...LJ, escoras: 12 }, ped: parado([-0.4, 0, 0.3], Math.PI / 2, t, { olhos: "normal", cab: [-0.5, 0, 0] }), forca: eio(k01(t, A(385), B(390))) };
  } },
  { i: 391, f: (t, k) => { // espera semanas (calendário folheando)
    return { t, cam: lc({ az: 14, el: 6, dist: 3.4, fov: 30, alvo: [0.0, 0.75, -0.6] }, { az: 18, el: 6, dist: 3.1, fov: 30, alvo: [0.0, 0.8, -0.65] }, k), corte: CORTE,
      casa: { escada: false }, laje: { ...LJ, escoras: 0 }, ex: { calendario: 1, folhas: 6 * eio(k01(t, A(392), B(394) + 0.2)) }, ch: churras([0.85, 0.03, -0.45]),
      luzSol: 0.75 + 0.35 * Math.cos(t * 14),
      ped: { pos: [0.45, -0.19, -0.35], rotY: -0.5, olhos: "fecha", pE: { frente: 1.5, joelho: 1.5 }, pD: { frente: 1.5, joelho: 1.5 }, bE: { abre: 0.3, frente: 0.6, cot: 1.2 }, bD: { abre: 0.3, frente: 0.6, cot: 1.2 }, cab: [0.3, 0, 0.2] } };
  } },
  { i: 395, f: (t, k) => { // antes de tirar o último pau (a laje fica reta)
    const sai = eio(k01(t, A(396), A(399)));
    const ultimo = t > A(400) ? 1 : 0;
    return { t, cam: lc({ az: -4, el: 5, dist: 7.2, fov: 30, alvo: [-0.2, 0.85, 0] }, { az: 0, el: 5, dist: 6.8, fov: 30, alvo: [-0.2, 0.85, 0] }, k), corte: CORTE,
      casa: { escada: false }, laje: { ...LJ, escoras: 12, escorasSai: sai * 0.97 + 0.03 * ultimo }, ch: churras(CH_IN, { susto: 0.6 * (1 - ultimo) }),
      ped: ultimo ? feliz([-0.75, 0, 0.45], 0.5, t) : { pos: [-0.75, 0, 0.45], rotY: Math.PI / 2 - 0.3, olhos: "foco", bD: { abre: 0.2, frente: 1.2, cot: 0.4 }, bE: { abre: 0.2, frente: 1.2, cot: 0.4 } } };
  } },
  // ======================= 8. fechamento
  { i: 401, f: (t, k) => { // coloque uma mureta em volta
    return { t, cam: lc({ az: 30, el: 30, dist: 7.2, fov: 30, alvo: [0, HP, 0.1] }, { az: 22, el: 28, dist: 6.6, fov: 30, alvo: [0, HP, 0.1] }, k),
      casa: { escada: false }, laje: { ...LJ, mureta: eo(k01(t, A(403) - 0.05, A(403) + 0.45)) }, ped: polegar([0.4, YL, 0.2], -0.4, t) };
  } },
  { i: 406, f: (t, k) => { // um ralo pra chuva escorrer
    return { t, cam: lc({ az: 36, el: 40, dist: 2.4, fov: 32, alvo: [IX - 0.35, YL + 0.05, IZ - 0.3] }, { az: 30, el: 44, dist: 2.1, fov: 32, alvo: [IX - 0.3, YL, IZ - 0.28] }, k),
      casa: { escada: false }, laje: { ...LJ, mureta: 1, ralo: eo(k01(t, A(407) - 0.05, A(407) + 0.4)), molhada: 0.6 * eio(k01(t, A(409), A(410))) }, ex: { chuva: eio(k01(t, A(408), A(409))) },
      ped: { pos: [IX - 0.75, YL, IZ - 0.55], rotY: 0.8, olhos: "feliz", cab: [0.4, 0, 0], bD: { abre: 0.3, frente: 1.4, cot: 0.2 }, bE: BR } };
  } },
  { i: 411, f: (t, k) => { // e uma escada
    return { t, cam: lc({ az: 62, el: 12, dist: 6.6, fov: 30, alvo: [1.0, 0.95, 0.2] }, { az: 56, el: 12, dist: 6.2, fov: 30, alvo: [1.0, 0.95, 0.2] }, k),
      casa: { escada: false }, laje: { ...LJ, mureta: 1, ralo: 1 }, ex: { escadaFinal: eo(k01(t, A(413) - 0.25, A(413) + 0.5)) },
      ped: feliz([0.6, YL, 0.1], 1.2, t) };
  } },
  { i: 414, f: (t, k) => { // chamar a família pro churrasco na laje (sobem a escada)
    const sobe = (atraso: number) => { const u = eio(k01(t, A(416) + atraso, B(423) + atraso)); const i = Math.min(DEGRAUS - 1, Math.floor(u * DEGRAUS)); const d = degrau(i); return { pos: [d[0], d[1], d[2]] as V3, u }; };
    const m = sobe(0), n = sobe(0.35);
    const ande = (s: { pos: V3; u: number }): Pose => ({ pos: s.u >= 1 ? [IX - 0.3, YL, -0.8] : s.pos, rotY: Math.PI, pulo: Math.abs(Math.sin(t * 9)) * 0.04, pE: { frente: 0.5 * Math.sin(t * 9), joelho: 0.4 }, pD: { frente: -0.5 * Math.sin(t * 9), joelho: 0.4 }, olhos: "feliz", boca: "sorriso" });
    return { t, cam: lc({ az: 48, el: 18, dist: 6.4, fov: 30, alvo: [0.6, 1.3, 0] }, { az: 40, el: 20, dist: 6.0, fov: 30, alvo: [0.5, 1.4, 0] }, k),
      casa: { escada: false }, laje: { ...LJ, mureta: 1, ralo: 1 }, ex: { escadaFinal: 1 },
      ch: { p: [0.05, YL, 0.0], rotY: -0.3, olhos: 1, carne: eo(k01(t, A(420), A(421))), fumaca: eo(k01(t, A(420), A(421) + 0.3)) },
      ped: { pos: [0.45, YL, 0.25], rotY: 1.3, olhos: "feliz", bD: { abre: 0.9, frente: 2.6 + 0.3 * Math.sin(t * 12), cot: 0.4 }, bE: BR },
      fam: [{ ...ande(m), esc: 1 }, { ...ande(n), esc: 0.72 }] };
  } },
  { i: 424, f: (t, k) => { // Parabéns! Você bateu uma laje. (volta ao enquadramento do gancho)
    return { t, cam: lc({ az: 52, el: 25, dist: 5.2, fov: 30, alvo: [0.4, 1.45, 0.75] }, { az: 58, el: 27, dist: 5.6, fov: 30, alvo: [0.4, 1.45, 0.75] }, k),
      casa: {}, laje: { ...LJ, mureta: 1, ralo: 1 }, ex: { escadaFinal: 1 },
      ch: { p: [0.05, YL, 0.0], rotY: 0.3, olhos: 1, carne: 1, fumaca: 1 },
      ped: feliz([0.55, YL, 0.55], 0.6, t),
      fam: [{ pos: [-0.45, YL, 0.15], rotY: 0.7, olhos: "feliz", boca: "sorriso", pulo: Math.abs(Math.sin(t * 6 + 1)) * 0.06 }, { pos: [-0.1, YL, 0.65], rotY: 0.3, esc: 0.72, olhos: "feliz", boca: "sorriso", pulo: Math.abs(Math.sin(t * 7)) * 0.1, bE: { abre: 0.6, frente: 2.6, cot: 0.3 }, bD: { abre: 0.6, frente: 2.6, cot: 0.3 } }] };
  } },
];

/** a virada congela o último plano (em "Esse") e varre para arame + partículas */
export function estadoEm(t: number): Estado {
  if (t >= C(429)) {
    const e = estadoEm(C(429) - 0.001);
    const v = eio(k01(t, C(429) + 0.05, A(434)));
    const d = eio(k01(t, A(432), A(436)));
    return { ...e, t, virada: { k: v, k2: d } };
  }
  let p = PLANOS[0];
  for (const q of PLANOS) if (t >= C(q.i)) p = q;
  const idx = PLANOS.indexOf(p);
  const t1 = idx + 1 < PLANOS.length ? C(PLANOS[idx + 1].i) : C(429);
  return p.f(t, k01(t, C(p.i), t1));
}

/** início de cada plano (para cortes de som e costuras) */
export const CORTES = () => PLANOS.map((p) => C(p.i));
export const _u = { IX };
