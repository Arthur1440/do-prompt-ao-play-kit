// Linha do tempo do reel (direção A): plano 3D, relógio do HUD e parâmetros, tudo preso às palavras da narração editada.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Plano } from "./three/mundo";

export const A = (i: number) => PALAVRAS[i].a;
export const B = (i: number) => PALAVRAS[i].b;
export const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);

export const FPS = 30;
export const QUADROS = Math.round(DURACAO * FPS); // 3090
export const ULTIMO = QUADROS - 1;

// marcos (s)
export const M = {
  tres: A(12), dois: A(13), um: A(14),
  T0: A(14) + (A(14) - A(13)), // zero do relógio = disjuntor = corte para preto (8,321)
  meia: A(15), os: A(23), morrem: A(25), eTrans: A(26),
  h1: A(32), h4: A(48), gastam: A(54), bateria: A(57), sem: A(58), noticia: A(62),
  h8: A(74), cartao: A(81), naoPassa: A(82), pix: A(86), sai: A(88),
  agora: A(89), conta: A(91), quatorze: A(96), dezesseis: A(98), ministerio: A(105), energia: B(109),
  eLitro: A(110), r35: A(118),
  manda: A(119), dezessete: A(129), fimEnvio: B(129),
  h12: A(130), para: A(134), porque: A(139),
  h18: A(144), anoitece: A(146), eQuem: A(152), via: A(159),
  h36: A(164), gelo: A(167), amapa2: A(170), acougue: B(178),
  h48: A(179), abriu: A(189), perdeu: A(190), posto: A(191),
  h72: A(202), cidade: A(207), eMundo: A(210),
  eVoce: A(217), vela: A(222), boato: A(230),
  esse: A(231), ia: A(236), ate: A(237), voz: A(240),
  quer: A(241), comenta: A(247), play: A(248), grupo: A(256), doPrompt: A(262),
};
export const CORTE_ENVIO = 50.75; // o celular dura 3 s; a torneira já abre no respiro antes de "Hora 12"
export const T_SECA = 53.15; // a água para de cair (fim do "para de cair")
export const LOOP_A = 102.4; // volta para o quadro 0

// relógio do HUD: salta na sílaba "Hora"; entre os saltos os minutos correm e param na hora dita
const HORAS: [number, number][] = [
  [M.meia, 0], [M.h1, 1], [M.h4, 4], [M.h8, 8], [M.h12, 12], [M.h18, 18], [M.h36, 36], [M.h48, 48], [M.h72, 72],
];
export function relogio(t: number): { h: number; pulo: number; idx: number } {
  let i = 0;
  while (i + 1 < HORAS.length && t >= HORAS[i + 1][0]) i++;
  const [ta, ha] = HORAS[i];
  const pulo = t >= ta ? Math.exp(-(t - ta) * 5) : 0;
  if (i + 1 >= HORAS.length) return { h: ha, pulo, idx: i };
  const [tb, hb] = HORAS[i + 1];
  // os minutos correm nos últimos 2,2 s antes da próxima "Hora" (a cena fica na hora dita)
  const x = k01(t, Math.max(ta + 0.7, tb - 2.2), tb);
  const run = x * x * (3 - 2 * x);
  // nunca mostra a hora seguinte antes da sílaba
  const h = Math.min(ha + (hb - ha) * run, hb - 1 / 60);
  return { h, pulo, idx: i };
}

type Seg = { a: number; b: number; plano: Plano; fim?: number; k?: (t: number) => number; k2?: (t: number) => number };
const SEGS: Seg[] = [
  { a: 0, b: 3.52, plano: "globo_gancho", fim: 3.7 }, // até "Hora a hora"
  { a: 3.52, b: M.T0, plano: "rua_desce", fim: 8.7 },
  { a: M.T0, b: M.meia, plano: "preto" },
  { a: M.meia, b: M.os, plano: "globo_apaga" },
  { a: M.os, b: M.eTrans, plano: "rua_semaforo", k: (t) => (t < M.morrem ? 1 : t < M.morrem + 0.32 ? (Math.floor((t - M.morrem) * 18) % 2 ? 0.15 : 1) : 0) },
  { a: M.eTrans, b: M.h1, plano: "rua_travada" },
  { a: M.h1, b: M.h4, plano: "metro" },
  { a: M.h4, b: M.sem, plano: "torre", k: (t) => 1 - eio(k01(t, M.gastam, B(57) - 0.1)) },
  { a: M.sem, b: M.h8, plano: "multidao", k: (t) => 1 - 0.9 * k01(t, M.sem + 0.3, M.h8 - 0.3) },
  { a: M.h8, b: M.agora, plano: "mercado" },
  { a: M.agora, b: M.eLitro, plano: "mapa", fim: 42.6, k: (t) => Math.round(14 * k01(t, M.quatorze - 0.25, M.quatorze + 0.45)) },
  { a: M.eLitro, b: M.manda, plano: "garrafa", k: () => 14, k2: (t) => k01(t, M.r35 - 0.05, M.r35 + 0.9) },
  { a: M.manda, b: CORTE_ENVIO, plano: "envio" },
  { a: CORTE_ENVIO, b: M.h18, plano: "cozinha", k: (t) => eio(k01(t, CORTE_ENVIO - 0.05, CORTE_ENVIO + 0.25)), k2: () => T_SECA },
  { a: M.h18, b: M.eQuem, plano: "anoitece" },
  { a: M.eQuem, b: M.h36, plano: "ceu" },
  { a: M.h36, b: A(169), plano: "acougue_gelo", k: (t) => k01(t, M.h36 - 0.2, M.h36 + 3.4) },
  { a: A(169), b: M.h48, plano: "acougue_vacina", k: (t) => k01(t, M.h36 - 0.2, M.h36 + 3.4) },
  { a: M.h48, b: M.posto, plano: "freezer", k: (t) => eio(k01(t, B(188) + 0.03, M.abriu + 0.3)), k2: (t) => k01(t, M.abriu + 0.1, M.posto - 0.1) },
  { a: M.posto, b: M.h72, plano: "posto" },
  { a: M.h72, b: M.eMundo - 0.1, plano: "rua_volta", k: (t) => eio(k01(t, B(203) + 0.03, B(209))) },
  { a: M.eMundo - 0.1, b: M.eVoce, plano: "globo_volta" },
  { a: M.eVoce, b: M.esse, plano: "votacao" },
  { a: M.esse, b: LOOP_A, plano: "virada", fim: 99.5, k: (t) => k01(t, M.esse + 0.35, M.ate + 0.6), k2: (t) => 0.35 * k01(t, M.quer - 0.1, M.quer + 0.4) },
];

export function estadoEm(t: number): Estado {
  if (t >= LOOP_A) {
    // volta do loop: a Terra chega de longe, girando, e para exatamente no quadro 0
    const fim = ULTIMO / FPS;
    return { plano: "globo_gancho", p: -0.14 * (1 - eio(k01(t, LOOP_A, fim))), t: 0 };
  }
  const s = SEGS.find((x) => t >= x.a && t < x.b) ?? SEGS[0];
  const p = k01(t, s.a, s.fim ?? s.b);
  return { plano: s.plano, p, t, k: s.k?.(t), k2: s.k2?.(t), hh: relogio(t).h };
}
