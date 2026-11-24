import { Estado } from "./mundo";
import { Dir, V3 } from "./kit";
import { Braco, Pose } from "./personagens";
import { clamp, easeInOut, easeOut, lerp, smooth } from "./rng";
import { DURACAO, GAPS, PALAVRAS } from "../fala";

// Tempo (s) do início/fim da palavra i na narração editada.
export const ws = (i: number) => PALAVRAS[i].s;
export const we = (i: number) => PALAVRAS[i].e;
export const G = GAPS as unknown as Record<"R1" | "K1" | "R2" | "K2" | "R3" | "K3" | "R4" | "K4", number>;
export const T_LOOP = DURACAO - 0.75; // a partir daqui o reel volta para o quadro 0

const L3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const Y = 0.12; // piso do ringue

// ---------------------------------------------------------------- poses
const ginga = (t: number, fase = 0, amp = 1) => {
  const s = Math.abs(Math.sin((t * 1.7 + fase) * Math.PI));
  return { pulo: s * 0.035 * amp, sq: 1 + (s - 0.5) * 0.06 * amp };
};
const GUARDA_F: Braco = { abre: 0.5, frente: 0.95, cot: 1.95 }; // punho em guarda
const GUARDA_T: Braco = { abre: 0.35, frente: 0.6, cot: 2.1 };
const ERGUE: Braco = { abre: 2.85, frente: 0.3, cot: 0.35 };
const APONTA: Braco = { abre: 1.45, frente: 0.55, cot: 0.1 };
const OFERECE: Braco = { abre: 0.35, frente: 1.35, cot: 0.35 };
const ROSTO: Braco = { abre: 0.25, frente: 1.55, cot: 2.35 };

/** Reação a golpe de desenho: tranco para trás, achata e volta, chapéu/peruca pula. */
function golpe(p: Pose, dt: number): Pose {
  if (dt < 0 || dt > 1.4) return p;
  const k = Math.exp(-dt * 4.5);
  const pulaChapeu = dt < 0.55 ? Math.sin((dt / 0.55) * Math.PI) * 0.16 : 0;
  return {
    ...p,
    inclina: (p.inclina ?? 0) - 0.45 * k,
    sq: (p.sq ?? 1) * (1 - 0.18 * Math.sin(Math.min(1, dt / 0.35) * Math.PI) * k * 2),
    pos: [p.pos[0] - Math.sign(p.pos[0] || 1) * -0.0 + 0, p.pos[1], p.pos[2] - 0.08 * (1 - k)],
    chapeu: { y: (p.chapeu?.y ?? 0) + pulaChapeu, rz: (p.chapeu?.rz ?? 0) + Math.sin(dt * 14) * 0.25 * k },
    olhos: dt < 0.5 ? "aperta" : "susto",
    boca: p.boca === "sorri" ? (dt < 0.5 ? "O" : "sorri") : p.boca,
    bE: { abre: 1.2, frente: 0.3, cot: 0.4 },
    bD: { abre: 1.2, frente: 0.3, cot: 0.4 },
    pulo: (p.pulo ?? 0) + Math.max(0, Math.sin(Math.min(1, dt / 0.45) * Math.PI)) * 0.06,
  };
}

function rei(t: number, pos: V3, rotY: number, extra: Partial<Pose> = {}): Pose {
  const g = ginga(t, 0);
  return { pos, rotY, pulo: g.pulo, sq: g.sq, inclina: 0.05, bE: GUARDA_F, bD: GUARDA_T, pE: { abre: 0.16, frente: 0.15 }, pD: { abre: 0.2, frente: -0.12 }, chapeu: { y: g.pulo * 0.6, rz: Math.sin(t * 5) * 0.03 }, capa: 0.25 + Math.sin(t * 2) * 0.1, ...extra };
}
function ronald(t: number, pos: V3, rotY: number, extra: Partial<Pose> = {}): Pose {
  const g = ginga(t, 0.5);
  return { pos, rotY, pulo: g.pulo, sq: g.sq, inclina: 0.05, bE: GUARDA_T, bD: GUARDA_F, pE: { abre: 0.2, frente: -0.12 }, pD: { abre: 0.16, frente: 0.15 }, chapeu: { y: g.pulo * 0.5, rz: Math.sin(t * 5 + 1) * 0.04 }, ...extra };
}
const cam = (pos: V3, alvo: V3, fov = 30, rolo = 0) => ({ pos, alvo, fov, rolo });
/** câmera que orbita/aproxima suavemente durante o plano */
const camMov = (u: number, a: { pos: V3; alvo: V3 }, b: { pos: V3; alvo: V3 }, fov = 30) => {
  const k = easeInOut(u);
  return cam(L3(a.pos, b.pos, k), L3(a.alvo, b.alvo, k), fov);
};

// ---------------------------------------------------------------- planos
export type Plano = { nome: string; t0: number; t1: number; f: (u: number, t: number, dir: Dir) => Estado };

export function gancho(t: number): Estado {
  const tt = Math.max(-1, t);
  const ent = easeOut(clamp((tt + 0.25) / 0.4));
  const zoom = smooth(0, 2.68, tt);
  return {
    set: "selecao",
    cam: { pos: [0, 0.6, lerp(4.75, 4.45, zoom)], alvo: [0, 0.6, 0], fov: 30 },
    rei: rei(tt, [lerp(-0.6, -0.31, ent), 0.07, 0], 0.32, { bD: ERGUE, bE: GUARDA_F, cab: [0.02, 0.12, 0], segD: "whopper", escItem: 1.15 }),
    ronald: ronald(tt, [lerp(0.6, 0.31, ent), 0.07, 0], -0.32, { bE: ERGUE, bD: GUARDA_F, cab: [0.02, -0.12, 0], segE: "bigmac", escItem: 1.15 }),
    tremor: tt >= 0 ? Math.max(0, 1 - tt / 0.25) * 1.5 : 0,
  };
}

function encarada(t: number, u: number): Estado {
  // "A briga mais zueira da publicidade": testa com testa, câmera baixa girando
  const a = lerp(-0.5, 0.35, easeInOut(u));
  const R = 3.7;
  return {
    set: "selecao",
    cam: cam([Math.sin(a) * R, 0.85, Math.cos(a) * R], [0, 1.12, 0], 30),
    rei: rei(t, [-0.21, 0.07, 0], Math.PI / 2 - 0.35, { bE: GUARDA_F, bD: GUARDA_F, inclina: 0.18, cab: [0.05, 0, 0], olhos: "normal" }),
    ronald: ronald(t, [0.21, 0.07, 0], -Math.PI / 2 + 0.35, { bE: GUARDA_F, bD: GUARDA_F, inclina: 0.18, cab: [0.05, 0, 0] }),
  };
}

function rodada(t: number, u: number, n: number, gap: number): Estado {
  // os dois saltam para os seus cantos; câmera diferente por rodada
  const dt = t - gap;
  const salto = dt > 0 && dt < 0.5 ? Math.sin((dt / 0.5) * Math.PI) * 0.12 : 0;
  const angs = [0, -0.5, 0.45, 0, 0.2];
  const a = angs[n] + lerp(-0.08, 0.08, u);
  const alt = n === 3 ? 2.4 : n === 2 ? 0.55 : 1.15;
  const dist = n === 3 ? 4.2 : 4.7;
  const e: Estado = {
    set: "ringue",
    cam: cam([Math.sin(a) * dist, alt, Math.cos(a) * dist], [0, 0.5, 0], 30),
    rei: rei(t, [-0.42, Y, 0.1], 0.6, { pulo: salto + ginga(t).pulo }),
    ronald: ronald(t, [0.42, Y, 0.1], -0.6, { pulo: salto + ginga(t, 0.5).pulo }),
    tremor: dt > 0 && dt < 0.3 ? 1.4 * (1 - dt / 0.3) : 0,
  };
  return e;
}

function redacao(t: number, u: number): Estado {
  // o jornal gigante abre; o Rei, orgulhoso, apresenta a página inteira
  const abre = smooth(ws(17), ws(20), t);
  const ax = lerp(0.4, 0.12, abre);
  return {
    set: "jornal",
    cam: camMov(u, { pos: [ax - 0.6, 1.0, 4.6], alvo: [ax, 1.02, -0.2] }, { pos: [ax - 0.3, 1.12, 4.2], alvo: [ax, 1.14, -0.2] }),
    jornal: abre,
    rei: rei(t, [-0.62, 0, 0.45], 0.35, { bE: abre > 0.5 ? APONTA : GUARDA_F, bD: { abre: 0.3, frente: 0.1, cot: 0.4 }, cab: [0, 0.35, 0], olhos: "feliz" }),
  };
}

function pagina(t: number, u: number): Estado {
  // close na página; no "propôs uma trégua" o Rei entra com a bandeira branca
  const flag = smooth(ws(25), ws(26) + 0.2, t);
  return {
    set: "jornal",
    cam: camMov(u, { pos: [0.12, 0.9, 2.55], alvo: [0.12, 0.86, -0.25] }, { pos: [-0.05, 0.9, 3.1], alvo: [0.02, 0.86, -0.2] }),
    jornal: 1,
    rei: rei(t, [lerp(-1.1, -0.38, easeOut(flag)), 0, 0.55], 0.25, { bD: { abre: 2.4, frente: 0.3, cot: 0.3 }, segD: "bandeira", escItem: 2.2, itemRx: 0, cab: [0, 0.2, 0], olhos: "feliz", vis: flag > 0.01 }),
  };
}

function vitrine(t: number, u: number): Estado {
  const monta = smooth(ws(30) - 0.2, ws(35) + 0.3, t);
  return {
    set: "vitrine",
    cam: camMov(u, { pos: [0, 0.9, 2.9], alvo: [0, 0.42, 0] }, { pos: [0, 0.7, 2.45], alvo: [0, 0.4, 0] }),
    mcw: { monta, giro: -0.6 + t * 0.55 },
  };
}

function diaDaPaz(t: number, u: number): Estado {
  // no ringue, o Rei estende a bandeira branca para o Ronald (a trégua)
  return {
    set: "ringue",
    cam: camMov(u, { pos: [-0.5, 0.9, 3.5], alvo: [0, 0.68, 0] }, { pos: [0.25, 0.85, 3.2], alvo: [0, 0.68, 0] }),
    rei: rei(t, [-0.35, Y, 0], 0.9, { bD: { abre: 0.6, frente: 1.2, cot: 0.2 }, segD: "bandeira", escItem: 0.9, itemRx: 0, olhos: "feliz" }),
    ronald: ronald(t, [0.4, Y, 0], -0.9, { bE: { abre: 0.3, frente: 0.4, cot: 1.6 }, bD: { abre: 0.3, frente: 0.4, cot: 1.6 }, cab: [0, 0, 0.12] }),
  };
}

function escritorio(t: number, u: number): Estado {
  // o presidente do McDonald's responde pelo celular
  const recusa = smooth(ws(44) - 0.1, ws(44) + 0.3, t);
  return {
    set: "escritorio",
    cam: camMov(u, { pos: [-0.5, 0.95, 2.3], alvo: [0, 0.78, 0] }, { pos: [-0.2, 0.9, 1.8], alvo: [0, 0.8, 0] }),
    execMc: { pos: [0, 0, 0], rotY: 0, bD: { abre: 0.2, frente: 1.25, cot: 1.25 }, bE: { abre: 0.2, frente: 0.9, cot: 1.7 }, segD: "celular", itemRx: -0.25, cab: [0.18 - 0.1 * recusa, 0.05, 0.08 * Math.sin(t * 6) * recusa], olhos: "normal", boca: "sorri" },
  };
}

function telefonema(t: number, u: number): Estado {
  // o Ronald estende o telefone gigante; ele toca no respiro e o Rei leva o susto
  const toca = t >= we(55) && t < G.K1 + 0.5 ? 1 : 0;
  const hit = G.K1 + 0.25;
  let pr = rei(t, [-0.42, Y, 0.1], 0.7, { bE: GUARDA_F, bD: GUARDA_T });
  pr = golpe(pr, t - hit);
  return {
    set: "ringue",
    cam: camMov(u, { pos: [0.9, 0.85, 3.4], alvo: [0, 0.66, 0] }, { pos: [0.6, 0.8, 3.1], alvo: [-0.05, 0.66, 0] }),
    rei: pr,
    ronald: ronald(t, [0.32, Y, 0.1], -0.85, { bE: OFERECE, segE: "telefone", escItem: 1.3, itemRx: 0.2, toca, olhos: "feliz" }),
    tremor: t > hit && t < hit + 0.3 ? 1.6 : 0,
  };
}

function estradaAerea(t: number, u: number): Estado {
  // drone descendo sobre o campo francês até a placa
  const k = easeInOut(u);
  return {
    set: "estrada",
    cam: cam(L3([-2.2, 3.4, 6.5], [-1.7, 1.25, 5.2], k), L3([0.3, 0.2, -1], [0.42, 0.8, 0.66], k), 32),
    ronald: ronald(t, [-0.46, 0, 1.5], 0.15, { esc: 0.66, bE: { abre: lerp(0.3, 2.35, smooth(ws(64), ws(65) + 0.3, t)), frente: 0.35, cot: 0.25 }, bD: { abre: 0.35, frente: 0.5, cot: 1.6 }, cab: [0.05, 0.35, 0.08], olhos: "feliz" }),
  };
}

function placa(t: number, u: number): Estado {
  // close legível, a câmera desce da linha do Méqui para a do BK
  const alvo: V3 = [0.62 + 0.04, lerp(0.98, 0.86, smooth(ws(70), ws(72), t)), 0.6];
  const n: V3 = [-0.37, 0.04, 0.93];
  const d = lerp(4.5, 4.25, u);
  return {
    set: "estrada",
    cam: cam([alvo[0] + n[0] * d, alvo[1] + n[1] * d + 0.05, alvo[2] + n[2] * d], alvo, 30),
    ronald: ronald(t, [-0.46, 0, 1.5], 0.15, { esc: 0.66, bE: { abre: 2.35, frente: 0.35, cot: 0.25 }, olhos: "feliz" }),
  };
}

function vlog(t: number, u: number): Estado {
  // o Rei grava a resposta (moldura de vídeo na tela)
  return {
    set: "estrada",
    cam: camMov(u, { pos: [-0.05, 0.75, 4.3], alvo: [-0.05, 0.62, 1.9] }, { pos: [-0.05, 0.72, 4.0], alvo: [-0.05, 0.62, 1.9] }),
    rei: rei(t, [-0.05, 0, 1.9], 0, { bD: { abre: 2.5, frente: 0.4, cot: 0.6 + Math.sin(t * 9) * 0.25 }, bE: { abre: 0.3, frente: 0.2, cot: 0.4 }, olhos: "feliz", cab: [0, 0, Math.sin(t * 3) * 0.08] }),
  };
}

function drive(t: number, u: number): Estado {
  // o carro do casal entra no drive-thru
  const k = easeOut(clamp((t - ws(83)) / (ws(87) + 0.3 - ws(83))));
  const z = lerp(1.4, -1.6, k);
  const x = 0.14;
  return {
    set: "estrada",
    cam: camMov(u, { pos: [-1.3, 1.5, 2.0], alvo: [0.3, 0.15, -0.9] }, { pos: [-1.0, 1.15, 0.9], alvo: [0.35, 0.18, -1.5] }),
    carro: { x, z, rotY: Math.PI, copo: false },
  };
}

function cafe(t: number, u: number): Estado {
  return {
    set: "estrada",
    cam: camMov(u, { pos: [-0.55, 0.8, -3.6], alvo: [0.28, 0.22, -1.6] }, { pos: [-0.45, 0.72, -3.3], alvo: [0.28, 0.24, -1.6] }),
    carro: { x: 0.14, z: -1.6, rotY: Math.PI, copo: t > ws(91) },
  };
}

function longaEstrada(t: number, u: number): Estado {
  // o carro segue a estrada longa; lá no horizonte, o Whopper
  const k = clamp((t - ws(93)) / (ws(98) - ws(93)));
  const z = lerp(-1.8, -10, k);
  return {
    set: "estrada",
    cam: cam([0.05, lerp(1.0, 1.4, k), z + 2.9], [0.05, 0.35, z - 5], 34),
    carro: { x: 0.14, z, rotY: Math.PI, copo: true },
    gigante: 1,
  };
}

function hitCafe(t: number, u: number): Estado {
  // o Rei entrega um café gigante; o Ronald leva o susto (respiro K2)
  const hit = G.K2 + 0.1;
  let pr = ronald(t, [0.38, Y, 0.1], -0.7, { bE: { abre: 0.4, frente: 1.0, cot: 0.9 }, bD: { abre: 0.4, frente: 1.0, cot: 0.9 } });
  pr = golpe(pr, t - hit);
  return {
    set: "ringue",
    cam: camMov(u, { pos: [-0.8, 0.9, 3.4], alvo: [0, 0.66, 0] }, { pos: [-0.55, 0.85, 3.1], alvo: [0.05, 0.66, 0] }),
    rei: rei(t, [-0.3, Y, 0.1], 0.8, { bD: OFERECE, segD: "cafe", escItem: 1.8, itemRx: 0.1, olhos: "feliz" }),
    ronald: pr,
    tremor: t > hit && t < hit + 0.3 ? 1.6 : 0,
  };
}

function brasil(t: number, u: number): Estado {
  return {
    set: "cidade",
    cam: camMov(u, { pos: [-1.4, 0.6, 3.6], alvo: [-0.3, 0.9, -1.5] }, { pos: [-0.8, 0.7, 3.2], alvo: [0.1, 1.1, -1.5] }),
    eclipse: 0,
  };
}

function eclipse(t: number, u: number): Estado {
  const ec = smooth(ws(107), ws(110) + 0.2, t);
  return {
    set: "cidade",
    cam: camMov(u, { pos: [0.5, 0.25, 3.8], alvo: [0.9, 5.6, -9] }, { pos: [0.5, 0.25, 3.3], alvo: [0.9, 6.3, -9] }, 40),
    eclipse: ec,
  };
}

function postPicanha(t: number, u: number): Estado {
  return {
    set: "cidade",
    cam: camMov(u, { pos: [0.2, 0.7, 3.6], alvo: [0.15, 0.85, 0.2] }, { pos: [0.1, 0.65, 3.3], alvo: [0.15, 0.85, 0.2] }),
    eclipse: 1,
    ronald: ronald(t, [0.15, 0, 0.9], -0.1, { esc: 0.7, bE: ERGUE, segE: "lanche", escItem: 1.2, olhos: "feliz" }),
  };
}

function grelhaRei(t: number, u: number): Estado {
  return {
    set: "ringue",
    luz: 0.75,
    cam: camMov(u, { pos: [-0.1, 1.1, 3.2], alvo: [-0.55, 0.66, 0.1] }, { pos: [0.0, 1.0, 2.9], alvo: [-0.55, 0.66, 0.1] }),
    rei: rei(t, [-0.55, Y, -0.02], 0.15, { bD: { abre: 0.5, frente: 1.0, cot: 0.9 + Math.sin(t * 7) * 0.3 }, bE: { abre: 0.4, frente: 0.8, cot: 1.2 }, olhos: "feliz", cab: [0.25, 0, 0] }),
    grelha: { vis: true, brilho: 0, chama: 1 },
  };
}

function marcaGrelha(t: number, u: number): Estado {
  const b = smooth(ws(140) - 0.1, ws(141), t);
  return {
    set: "ringue",
    luz: 0.55,
    cam: camMov(u, { pos: [-0.55, 0.95, 1.25], alvo: [-0.55, 0.42, 0.35] }, { pos: [-0.55, 0.85, 1.05], alvo: [-0.55, 0.4, 0.35] }, 32),
    grelha: { vis: true, brilho: b * (0.8 + 0.2 * Math.sin(t * 14)), chama: 0.7 },
  };
}

function hitGrelha(t: number, u: number): Estado {
  const hit = G.K3 + 0.08;
  let pr = ronald(t, [0.38, Y, 0.1], -0.7);
  pr = golpe(pr, t - hit);
  return {
    set: "ringue",
    luz: 0.75,
    cam: cam([0.2, 0.85, 3.4], [0, 0.66, 0], 30),
    rei: rei(t, [-0.55, Y, -0.02], 0.6, { bD: ERGUE, olhos: "feliz" }),
    ronald: pr,
    grelha: { vis: true, brilho: 0.8, chama: 1.6 },
    tremor: t > hit && t < hit + 0.3 ? 1.6 : 0,
  };
}

function mordidas(t: number, u: number, fase: "mc" | "bk"): Estado {
  // câmera lenta: mordidinha (Méqui, em cima) x mordida enorme (BK, embaixo)
  const mc = clamp((t - ws(152)) / 1.8);
  const bk = clamp((t - ws(172)) / 1.9);
  const nib = Math.sin(mc * Math.PI);
  const big = bk < 0.75 ? easeOut(bk / 0.75) : 1 - easeInOut((bk - 0.75) / 0.25) * 0.35;
  const d = fase === "mc" ? lerp(3.4, 3.2, u) : lerp(3.9, 3.75, u);
  return {
    set: "palco",
    cam: cam([0, fase === "mc" ? 1.25 : 1.06, d], [0, fase === "mc" ? 1.25 : 1.06, 0], 30),
    execMc: {
      pos: [0, 0.48, -0.3],
      esc: 1.09,
      bE: { abre: 0.25, frente: 1.1, cot: 1.8 },
      bD: { abre: 0.25, frente: 1.1, cot: 1.8 },
      cab: [0.05 + nib * 0.06, 0, 0],
      olhos: t > ws(159) ? "feliz" : "normal",
      boca: nib > 0.3 ? "O" : "sorri",
      naBoca: { item: "lanche", z: lerp(0.24, 0.17, nib), esc: 0.07, rx: 0.15, y: -0.16 },
    },
    execBk: {
      pos: [0, 0, 0],
      bE: { abre: 0.25, frente: 1.15, cot: 1.8 },
      bD: { abre: 0.25, frente: 1.15, cot: 1.8 },
      cab: [-0.12 * big, 0, 0],
      olhos: big > 0.5 ? "fecha" : "normal",
      boca: big > 0.15 ? "mordida" : "sorri",
      naBoca: { item: "whopper", z: lerp(0.27, 0.15, big), esc: 0.11, rx: 0.25, y: lerp(-0.25, -0.15, big) },
    },
  };
}

function reacao(t: number, u: number): Estado {
  // no canto do ringue: o Ronald cobre o rosto rindo, o Rei comemora
  const g = ginga(t, 0, 1.6);
  return {
    set: "ringue",
    cam: camMov(u, { pos: [0, 0.85, 3.9], alvo: [0, 0.92, 0] }, { pos: [0, 0.95, 4.4], alvo: [0, 0.92, 0] }),
    rei: rei(t, [-0.38, Y, 0.1], 0.5, { bE: ERGUE, bD: ERGUE, pulo: g.pulo * 2, olhos: "feliz", cab: [-0.15, 0, 0] }),
    ronald: ronald(t, [0.38, Y, 0.1], -0.5, { bE: ROSTO, bD: ROSTO, inclina: 0.3, cab: [0.3, 0, Math.sin(t * 8) * 0.12], olhos: "feliz", boca: "aberta" }),
  };
}

function marcacao(t: number, u: number, fase: number): Estado {
  const g1 = ginga(t, 0), g2 = ginga(t, 0.5);
  const a = fase === 0 ? lerp(-0.12, 0.05, u) : lerp(0.08, 0.22, u);
  const bkPose = t >= ws(188) && t < ws(192) ? ERGUE : GUARDA_F;
  const mcPose = t >= ws(192) ? ERGUE : GUARDA_F;
  return {
    set: "ringue",
    cam: cam([Math.sin(a) * 5.3, 1.7, Math.cos(a) * 5.3], [0, 0.78, 0.2], 30),
    rei: rei(t, [-0.42, Y, 0.3], 0.45, { bD: ERGUE, bE: bkPose, pulo: g1.pulo, cab: [0, 0.2, 0], olhos: t >= ws(188) && t < ws(192) ? "feliz" : "normal" }),
    ronald: ronald(t, [0.42, Y, 0.3], -0.45, { bE: ERGUE, bD: mcPose, pulo: g2.pulo, cab: [0, -0.2, 0], olhos: t >= ws(192) ? "feliz" : "normal" }),
  };
}

function viradaIA(t: number, u: number): Estado {
  const e = marcacao(ws(194), 0, 1);
  const vol = smooth(ws(210) - 0.2, ws(211) - 0.05, t); // volta a ter cor no "assim?"
  const w = smooth(ws(194) - 0.05, ws(194) + 0.5, t) * (1 - vol);
  const k = clamp((t - ws(194)) / (ws(211) - ws(194)));
  return { ...e, wire: w, part: smooth(ws(194) + 0.2, ws(194) + 1.6, t) * (1 - vol), cam: { ...e.cam, pos: [Math.sin(k * 0.8) * 5.6, lerp(1.7, 2.1, k), Math.cos(k * 0.8) * 5.6 + lerp(0, 0.6, k)] } };
}

function cta(t: number, u: number): Estado {
  const e = gancho(2.0 + (t - ws(211)) * 0.2);
  return { ...e, cam: camMov(u, { pos: [0, 0.6, 5.2], alvo: [0, 0.6, 0] }, { pos: [0, 0.62, 4.9], alvo: [0, 0.62, 0] }), tremor: 0 };
}

export const PLANOS: Plano[] = [
  { nome: "gancho", t0: -9, t1: ws(4), f: (u, t) => gancho(t) },
  { nome: "encarada", t0: ws(4), t1: ws(10), f: (u, t) => encarada(t, u) },
  { nome: "r1", t0: ws(10), t1: ws(12), f: (u, t) => rodada(t, u, 1, G.R1) },
  { nome: "redacao", t0: ws(12), t1: ws(21), f: (u, t) => redacao(t, u) },
  { nome: "pagina", t0: ws(21), t1: ws(29), f: (u, t) => pagina(t, u) },
  { nome: "mcwhopper", t0: ws(29), t1: ws(36), f: (u, t) => vitrine(t, u) },
  { nome: "diadapaz", t0: ws(36), t1: ws(40), f: (u, t) => diaDaPaz(t, u) },
  { nome: "escritorio", t0: ws(40), t1: ws(53), f: (u, t) => escritorio(t, u) },
  { nome: "telefonema", t0: ws(53), t1: ws(56), f: (u, t) => telefonema(t, u) },
  { nome: "r2", t0: ws(56), t1: ws(58), f: (u, t) => rodada(t, u, 2, G.R2) },
  { nome: "aerea", t0: ws(58), t1: ws(67), f: (u, t) => estradaAerea(t, u) },
  { nome: "placa", t0: ws(67), t1: ws(76), f: (u, t) => placa(t, u) },
  { nome: "vlog", t0: ws(76), t1: ws(83), f: (u, t) => vlog(t, u) },
  { nome: "drive", t0: ws(83), t1: ws(88), f: (u, t) => drive(t, u) },
  { nome: "cafe", t0: ws(88), t1: ws(93), f: (u, t) => cafe(t, u) },
  { nome: "longa", t0: ws(93), t1: ws(98), f: (u, t) => longaEstrada(t, u) },
  { nome: "hitcafe", t0: ws(98), t1: ws(101), f: (u, t) => hitCafe(t, u) },
  { nome: "r3", t0: ws(101), t1: ws(103), f: (u, t) => rodada(t, u, 3, G.R3) },
  { nome: "brasil", t0: ws(103), t1: ws(106), f: (u, t) => brasil(t, u) },
  { nome: "eclipse", t0: ws(106), t1: ws(110), f: (u, t) => eclipse(t, u) },
  { nome: "picanha", t0: ws(110), t1: ws(117), f: (u, t) => postPicanha(t, u) },
  { nome: "grelha", t0: ws(117), t1: ws(126), f: (u, t) => grelhaRei(t, u) },
  { nome: "postbk", t0: ws(126), t1: ws(133), f: (u, t) => ({ ...postPicanha(t, u), ronald: undefined, cam: camMov(u, { pos: [-0.6, 0.6, 3.0], alvo: [0.4, 1.4, -2] }, { pos: [-0.4, 0.6, 2.8], alvo: [0.5, 1.6, -3] }, 34) }) },
  { nome: "marcagrelha", t0: ws(133), t1: G.K3, f: (u, t) => marcaGrelha(t, u) },
  { nome: "hitgrelha", t0: G.K3, t1: ws(143), f: (u, t) => hitGrelha(t, u) },
  { nome: "r4", t0: ws(143), t1: ws(147), f: (u, t) => rodada(t, u, 4, G.R4) },
  { nome: "mordidinha", t0: ws(147), t1: ws(161), f: (u, t) => mordidas(t, u, "mc") },
  { nome: "mordidona", t0: ws(161), t1: ws(176), f: (u, t) => mordidas(t, u, "bk") },
  { nome: "reacao", t0: ws(176), t1: ws(181), f: (u, t) => reacao(t, u) },
  { nome: "marca1", t0: ws(181), t1: ws(188), f: (u, t) => marcacao(t, u, 0) },
  { nome: "marca2", t0: ws(188), t1: ws(194), f: (u, t) => marcacao(t, u, 1) },
  { nome: "ia", t0: ws(194), t1: ws(211), f: (u, t) => viradaIA(t, u) },
  { nome: "cta", t0: ws(211), t1: T_LOOP, f: (u, t) => cta(t, u) },
  { nome: "loop", t0: T_LOOP, t1: 999, f: (u, t) => gancho(t - (Math.round(DURACAO * 30) - 1) / 30) },
];

export const planoEm = (t: number) => PLANOS.find((x) => t >= x.t0 && t < x.t1) ?? PLANOS[0];
export function estado(t: number, dir: Dir): Estado {
  const p = planoEm(t);
  const u = clamp((t - Math.max(0, p.t0)) / (Math.min(DURACAO, p.t1) - Math.max(0, p.t0)));
  return p.f(u, t, dir);
}
