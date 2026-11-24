// Linha do tempo: cada plano e cada ação presos ao ÍNDICE das palavras da narração (fala.ts).
// Trocar a narração = regenerar fala.ts; os planos acompanham sozinhos.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Cam } from "./three/mundo";
import { BUR, XV, ZP, FY, ZK, XS, XI, LAV, RALO_CH, PIA, REDE, YR0 } from "./three/maquete";
import { CAM, YTOPO_RESP, XCG, XCI1, Y_COZ, R_ESG, yRamal } from "./three/canos";
import { CURVA_RETA, CURVA_SIFAO, SAIDA_VASO } from "./three/vaso";
import type { Nuvem } from "./three/algodao";
import { poseCava, poseNariz, posePe, poseAjoelha } from "./three/figura";
import type { V3 } from "./three/geo";

export const A = (i: number) => PALAVRAS[i].a;
export const B = (i: number) => PALAVRAS[i].b;
export const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
export const FPS = 30;
export const QUADROS = Math.round(DURACAO * FPS);
/** início do plano que começa na palavra i (o corte cai no vão antes dela) */
export const C = (i: number) => (i === 0 ? 0 : Math.max(B(i - 1) + 0.02, A(i) - 0.08));

export const lc = (a: Cam, b: Cam, x: number): Cam => {
  const e = eio(x);
  const L = (p: number, q: number) => p + (q - p) * e;
  return { az: L(a.az, b.az), el: L(a.el, b.el), dist: L(a.dist, b.dist), fov: L(a.fov ?? 30, b.fov ?? 30), alvo: [L(a.alvo[0], b.alvo[0]), L(a.alvo[1], b.alvo[1]), L(a.alvo[2], b.alvo[2])], foco: L(a.foco ?? 0.45, b.foco ?? 0.45), forca: L(a.forca ?? 0.85, b.forca ?? 0.85), larg: L(a.larg ?? 1, b.larg ?? 1) };
};
/** peça caindo: chega (k = 0,75) exatamente em t0 e quica até t0 + 0,12 */
export const cai = (t: number, t0: number) => (t < t0 - 0.3 ? 0 : t < t0 ? (0.75 * (t - t0 + 0.3)) / 0.3 : Math.min(1, 0.75 + 0.25 * ((t - t0) / 0.14)));

/** ponto do vaso (coordenadas locais do vaso -> mundo) */
export const pv = (x: number, y: number, z = 0): V3 => [XV + x, FY + y, ZP + z];
const retaMundo = (): V3[] => CURVA_RETA.getSpacedPoints(10).map((p) => pv(p.x, p.y));
/** caminho da descarga sem sifão: bacia -> canal reto -> descida -> trecho */
export const DESCARGA_BURACO: V3[] = [pv(0.025, 0.1), ...retaMundo(), ...CAM.descida.slice(1), ...CAM.buraco.slice(1), [BUR[0] - 0.02, -0.14, ZP]];

// ------------------------------------------------------------------------------------------ posições do pedreiro
const PED_CAVA: V3 = [BUR[0] + 0.075, 0, ZP - 0.175];
const PED_NARIZ: V3 = [BUR[0] + 0.3, 0, ZP - 0.12];
const PED_RUA: V3 = [1.3, 0, ZP - 0.24];

// ------------------------------------------------------------------------------------------ planos
type Plano = { ini: number; f: (t: number) => Estado };
const PLANOS: Plano[] = [];
const plano = (ini: number, f: (t: number) => Estado) => PLANOS.push({ ini, f });

// 1. GANCHO — quadro 0: o pedreiro cava o buraco no quintal (close), a casa em corte com o banheiro sem cano atrás
plano(0, (t) => {
  const k = k01(t, 0, C(4));
  return {
    t, corte: ZP,
    cam: lc({ az: 46, el: 19, dist: 2.9, alvo: [0.3, 0.06, ZP - 0.12], foco: 0.45, forca: 0.8, larg: 1.2 }, { az: 40, el: 16, dist: 2.45, alvo: [0.36, 0.05, ZP - 0.12], foco: 0.45, forca: 0.8, larg: 1.2 }, k),
    buraco: 0.55 + 0.45 * eo(k01(t, 0, A(10))),
    ped: poseCava(PED_CAVA, -0.2, t * 1.15 + 0.1, BUR),
  };
});
// 1b. "jogar tudo num buraco no quintal": plano aberto do corte; o cano sai do vaso e cai até o buraco
plano(C(4), (t) => {
  const tJ = A(7) + 0.05;
  const k = k01(t, C(4), C(13));
  return {
    t, corte: ZP,
    cam: lc({ az: 4, el: 12, dist: 4.4, alvo: [-0.1, 0.0, ZP], foco: 0.5, forca: 0.8, larg: 1.1 }, { az: 10, el: 10, dist: 4.0, alvo: [-0.06, -0.02, ZP], foco: 0.5, forca: 0.8, larg: 1.1 }, k),
    buraco: 0.55 + 0.45 * eo(k01(t, 0, A(10))),
    pecas: { descida: cai(t, tJ), buraco: cai(t, tJ + 0.12) },
    ped: t < A(12) ? poseCava(PED_CAVA, -0.2, t * 1.15 + 0.1, BUR) : posePe(PED_CAVA, -0.2, { item: "pa", alvoPa: [BUR[0] + 0.1, 0.0, ZP - 0.12], cab: [0.25, -0.3], bD: { frente: 0.5, cot: 0.6, abre: 0.1 }, bE: { frente: 0.75, cot: 0.4, abre: -0.1 } }),
  };
});
// 2. "você não vai ter um banheiro": descarga; a câmera segue a água pelo cano cortado até o buraco
plano(C(13), (t) => {
  const t0 = A(14), t1 = B(18) + 0.55;
  const u = eio(k01(t, t0, t1));
  const xs = [XV + 0.02, BUR[0] - 0.05];
  const x = xs[0] + (xs[1] - xs[0]) * eio(k01(t, t0 + 0.25, t1));
  return {
    t, corte: ZP,
    cam: { az: 6 + 6 * k01(t, C(13), C(19)), el: 9, dist: 1.75, alvo: [x, -0.02, ZP], foco: 0.5, forca: 0.75, larg: 1.25 },
    buraco: 1, pecas: { descida: 1, buraco: 1 },
    jatos: [{ pts: DESCARGA_BURACO, u, len: 0.35, r: 0.014 }],
    poca: eio(k01(t, t1 - 0.25, t1 + 0.3)),
    ped: poseCava(PED_CAVA, -0.2, 0.5, BUR),
  };
});
// 3. "vai ter um quintal FEDENDO": o algodão sobe do buraco e se espalha pelo quintal
plano(C(19), (t) => {
  const tF = A(23);
  const k = k01(t, C(19), C(24));
  return {
    t, corte: ZP,
    cam: lc({ az: 24, el: 14, dist: 2.2, alvo: [BUR[0] + 0.05, 0.06, ZP - 0.1], foco: 0.45, forca: 0.8 }, { az: 32, el: 21, dist: 2.9, alvo: [BUR[0] + 0.05, 0.2, ZP - 0.15], foco: 0.45, forca: 0.8 }, eio(k01(t, tF - 0.2, C(24)))),
    buraco: 1, poca: 1, pecas: { descida: 1, buraco: 1 },
    nuvens: [
      { pts: [[BUR[0], -0.1, ZP - 0.04]], t0: tF - 0.15, n: 64, periodo: 2.6, rCano: 0.035, esc: 0.1, alt: 0.62, abre: 0.55, seed: 3, vento: [0.18, 0, -0.16] },
      { pts: [[BUR[0] - 0.04, -0.1, ZP - 0.06]], t0: tF - 0.08, n: 30, periodo: 1.9, rCano: 0.03, esc: 0.075, alt: 0.32, abre: 0.4, seed: 9, vento: [-0.1, 0, -0.1] },
    ],
    ped: t < tF ? posePe(PED_NARIZ, -1.35, { cab: [0.35, 0], inclina: 0.12 }) : poseNariz(PED_NARIZ, -1.1),
    jatos: [],
    _k: k,
  } as Estado;
});
// 4. "Então você liga o vaso num cano que vai até o esgoto da rua": o buraco fecha, o cano até a rua cai e encaixa
plano(C(24), (t) => {
  const t0 = A(24), tL = A(26);
  const kc = eio(k01(t, A(28), B(37) + 0.4));
  return {
    t, corte: ZP,
    cam: lc({ az: 8, el: 12, dist: 4.4, alvo: [0.2, -0.02, ZP], foco: 0.5, forca: 0.85, larg: 1.1 }, { az: 22, el: 10, dist: 2.7, alvo: [1.4, -0.1, ZP - 0.03], foco: 0.5, forca: 0.85, larg: 1.1 }, kc),
    buraco: 1 - eio(k01(t, t0 + 0.05, t0 + 0.55)),
    poca: 1 - k01(t, t0, t0 + 0.3),
    pecas: { descida: 1, buraco: [1, eio(k01(t, t0 + 0.1, tL - 0.15))], rua: cai(t, tL) },
    nuvens: [{ pts: [[BUR[0], -0.1, ZP - 0.04]], t0: A(23) - 0.15, some: t0, n: 64, periodo: 2.6, rCano: 0.035, esc: 0.1, alt: 0.62, abre: 0.55, seed: 3, vento: [0.18, 0, -0.16] }],
    jatos: [{ pts: CAM.rua, u: eio(k01(t, A(32), B(37) + 0.3)), len: 0.5, r: 0.015 }],
    ped: posePe(PED_RUA, -0.5, { cab: [0.3, -0.2], bD: { frente: 1.35, abre: 0.35, cot: 0.1 } }),
  };
});

// ==========================================================================================
// RESTO DA ESCADA (a partir do 1º "Mas"): estado acumulado da obra + um plano por frase
// ==========================================================================================
const TH = 0.045; // caimento (rad) — sem número na tela
const X_SAI = SAIDA_VASO[0];
const SIF_W: V3[] = CURVA_SIFAO.getSpacedPoints(24).map((p) => pv(p.x, p.y));
const RETA_W: V3[] = CURVA_RETA.getSpacedPoints(10).map((p) => pv(p.x, p.y));
const BACIA = pv(0.025, 0.1);
/** descarga com sifão: bacia -> curva -> descida -> ramal até a rua */
const DESC_SIF: V3[] = [BACIA, ...SIF_W, ...CAM.descida.slice(1), ...CAM.rua.slice(1)];
/** cheiro que volta da rua e sai pelo vaso sem sifão */
const CHEIRO_RUA: V3[] = [[REDE.x, REDE.y + 0.03, ZP], [REDE.x, YR0, ZP], [-0.52, YR0, ZP], [X_SAI, YR0, ZP], ...[...RETA_W].reverse(), pv(0.025, 0.09)];
/** cheiro que sobe pela saída do vaso e bate na água do sifão */
const CHEIRO_SIF: V3[] = [[X_SAI + 0.22, YR0, ZP], [X_SAI, YR0, ZP], pv(-0.068, -0.004), pv(-0.068, 0.04), pv(-0.064, 0.078), pv(-0.054, 0.096), pv(-0.043, 0.092)];
/** cheiro voltando pelo sifão vazio (sifonagem) */
const CHEIRO_SIF_VAZIO: V3[] = [[X_SAI + 0.22, YR0, ZP], [X_SAI, YR0, ZP], ...[...SIF_W].reverse(), pv(0.025, 0.1)];
const CHEIRO_LAV: V3[] = [[LAV[0], YR0, ZP], [LAV[0], -0.03, ZP], [LAV[0], -0.03, LAV[2] + 0.005], [LAV[0], LAV[1] + 0.225, LAV[2] + 0.005]];
const CHEIRO_CHU: V3[] = [[RALO_CH[0], YR0, ZP], [RALO_CH[0], -0.03, ZP], [RALO_CH[0], -0.03, RALO_CH[2]], [RALO_CH[0], FY + 0.01, RALO_CH[2]]];
const CHEIRO_GRELHA: V3[] = [[XS + 0.2, YR0, ZP], [XS, YR0, ZP], [XS, FY + 0.01, ZP]];
const CHEIRO_CS_BLOQ: V3[] = [[XS + 0.2, YR0, ZP], [XS, YR0, ZP], [XS, -0.066, ZP]];
const CHEIRO_RESP: V3[] = [[X_SAI + 0.1, YR0, ZP], [XI, YR0, ZP], [XI, YTOPO_RESP, ZP]];
const nv = (pts: V3[], t0: number, x: Partial<Nuvem> = {}): Nuvem => ({ pts, t0, n: 46, periodo: 2.6, rCano: 0.011, esc: 0.034, alt: 0.22, abre: 0.1, seed: 4, ...x });
const PED_CI: V3 = [XCI1 - 0.02, 0, ZP - 0.17];
const PED_CG: V3 = [XCG - 0.01, 0, ZK - 0.17];
const PED_FIM: V3 = [BUR[0] + 0.075, 0, ZP - 0.175];
const xs = (a: number, b: number, k: number) => a + (b - a) * k;

/** inclinação do ramal (caimento) no tempo */
export const inclinaEm = (t: number) => TH * eio(k01(t, A(307), A(312)));
const ramal = (x0: number, x1: number, ang: number, dy = 0): V3[] => [[x0, yRamal(x0, ang) + dy, ZP], [x1, yRamal(x1, ang) + dy, ZP]];

/** a obra acumulada: tudo o que já foi feito (e desfeito) até t */
function obra(t: number): Estado {
  const p: Record<string, number | [number, number]> = { descida: 1, rua: 1 };
  if (t >= A(110) - 0.3) p.lavD = [cai(t, A(110)), eio(k01(t, A(119) + 0.15, A(121) - 0.12))];
  if (t >= A(110) - 0.2) p.chuD = [cai(t, A(110) + 0.1), eio(k01(t, A(119) + 0.2, A(121) - 0.1))];
  if (t >= A(121) - 0.3) { p.lav = cai(t, A(121)); p.chuveiro = cai(t, A(121) + 0.1); }
  if (t >= A(124) - 0.3) p.cs = cai(t, A(124));
  if (t >= A(183)) p.respiro = eio(k01(t, A(183), A(190)));
  if (t >= C(217) + 0.1) { p.coz1 = cai(t, C(217) + 0.4); p.cozMeio = [cai(t, C(217) + 0.48), eio(k01(t, A(238), A(242) - 0.15))]; p.coz2 = cai(t, C(217) + 0.56); }
  if (t >= A(242) - 0.3) p.cg = cai(t, A(242));
  if (t >= A(344) - 0.3) { p.ci0 = cai(t, A(344)); p.ci1 = cai(t, A(344) + 0.12); p.ci2 = cai(t, A(344) + 0.24); }
  if (t >= A(375) - 0.3) p.raloQ = cai(t, A(375));
  const sifonou = eio(k01(t, A(169) - 0.1, A(169) + 0.35)) * (1 - eio(k01(t, A(194), A(196))));
  return {
    t, cam: { az: 0, el: 10, dist: 2, alvo: [0, 0, ZP] }, corte: ZP, pecas: p,
    vaso: { canal: t >= A(66) + 0.1 ? "sifao" : "reto", queda: t < A(66) + 0.2 ? Math.max(0, Math.min(1, t < A(66) ? (0.78 * (t - A(66) + 0.35)) / 0.35 : 0.78 + (0.22 * (t - A(66))) / 0.15)) : 0, nivel: 1 - 0.88 * sifonou },
    cs: eio(k01(t, A(133), A(135) + 0.25)) * (1 - 0.88 * sifonou),
    cg: { agua: eio(k01(t, A(245), A(249))), gordura: eio(k01(t, A(251), A(254) + 0.2)), tampa: eio(k01(t, A(280) - 0.2, A(280) + 0.3)) * (1 - eio(k01(t, C(287) - 0.3, C(287)))) },
    ciTampa: [0, 0, eio(k01(t, A(348) - 0.15, A(348) + 0.25)) * (1 - eio(k01(t, C(358) - 0.35, C(358) - 0.05)))],
    inclina: inclinaEm(t),
    gordura: eio(k01(t, A(226), A(231))) * (1 - eio(k01(t, A(233) + 0.05, A(233) + 0.5))),
    pia: { nivel: eio(k01(t, A(231), A(231) + 0.4)) * (1 - eio(k01(t, A(233), A(233) + 0.6))), piso: eio(k01(t, A(231) + 0.25, A(231) + 1.2)) * (1 - eio(k01(t, A(233), A(233) + 0.6))) },
    frig: eio(k01(t, A(219), A(221) + 0.1)) * (1 - eio(k01(t, A(226), A(226) + 0.4))),
    entupe: eio(k01(t, A(326), A(326) + 0.35)) * (1 - eio(k01(t, A(350), A(350) + 0.4))),
    banho: eio(k01(t, A(330) - 0.25, A(331))) * (1 - eio(k01(t, C(335), C(335) + 0.45))),
  };
}
const E = (t: number, x: Partial<Estado>): Estado => ({ ...obra(t), ...x }) as Estado;
const cam = (az: number, el: number, dist: number, alvo: V3, x: Partial<Cam> = {}): Cam => ({ az, el, dist, alvo, foco: 0.5, forca: 0.8, larg: 1.2, ...x });
const mov = (t: number, ini: number, fim: number, a: Cam, b: Cam) => lc(a, b, k01(t, ini, fim));

// ---------------------------------------------------------------- SIFÃO
// 5. "Mas o cheiro do esgoto da rua volta pelo mesmo cano": a câmera acompanha o algodão da rua até o vaso
plano(C(38), (t) => E(t, {
  cam: lc(cam(16, 9, 2.2, [1.45, -0.12, ZP]), cam(6, 9, 1.9, [-0.42, -0.02, ZP]), eio(k01(t, C(38) + 0.3, C(49)))),
  nuvens: [nv(CHEIRO_RUA, A(40), { n: 70, periodo: 2.8, alt: 0.26 })],
}));
// 6. "e sai no seu banheiro": o algodão brota do vaso
plano(C(49), (t) => E(t, {
  corte: ZP + 0.2,
  cam: mov(t, C(49), C(54), cam(30, 18, 1.45, pv(0.0, 0.16)), cam(36, 20, 1.15, pv(0.02, 0.16))),
  nuvens: [nv(CHEIRO_RUA, A(40), { n: 70, periodo: 2.8, alt: 0.26 })],
}));
// 7. "E a BARATA sobe junto": ela sobe pela parede da bacia e passa pela borda
plano(C(54), (t) => {
  const k1 = eio(k01(t, C(54) + 0.05, A(57))), k2 = eio(k01(t, A(57), A(57) + 0.9));
  const a = pv(0.035, 0.07, 0.01), b = pv(0.098, 0.134, 0.018), c = pv(0.118, 0.085, 0.02);
  const pos: V3 = k2 > 0 ? [xs(b[0], c[0], k2), xs(b[1], c[1], k2), xs(b[2], c[2], k2)] : [xs(a[0], b[0], k1), xs(a[1], b[1], k1), xs(a[2], b[2], k1)];
  return E(t, {
    corte: ZP + 0.2,
    cam: mov(t, C(54), C(59), cam(38, 22, 0.95, pv(0.05, 0.13)), cam(44, 20, 0.8, pv(0.06, 0.13))),
    nuvens: [nv(CHEIRO_RUA, A(40), { n: 70, periodo: 2.8, alt: 0.26 })],
    barata: { pos, rotY: Math.PI / 2 - 0.25, incl: k2 > 0 ? 0.45 + 0.6 * k2 : -1.0 + 0.6 * k1, anda: t * 7 },
  });
});
// 8. "Então você faz o cano dar uma curva cheia de água logo embaixo do vaso": a curva cai e encaixa na louça cortada
plano(C(59), (t) => E(t, {
  cam: mov(t, C(59), C(74), cam(4, 5, 0.85, pv(-0.02, 0.05), { larg: 1.5, forca: 0.6 }), cam(-4, 6, 0.7, pv(-0.025, 0.05), { larg: 1.5, forca: 0.6 })),
  nuvens: [nv(CHEIRO_RUA, A(40), { n: 70, periodo: 2.8, alt: 0.2, some: A(66) + 0.05 }), nv(CHEIRO_SIF, A(66) + 0.1, { n: 26, periodo: 2.6, rCano: 0.0085, fim: "bate", seed: 2 })],
}));
// 9. "A água fica parada ali e tampa a passagem do cheiro": macro do sifão; a barata sobe pela saída, bate na água e escorrega
plano(C(74), (t) => {
  const sb = eio(k01(t, C(74), A(80))), dc = eio(k01(t, A(80) + 0.25, A(84) + 0.2));
  const p0 = pv(-0.068, 0.0, 0.004), p1 = pv(-0.06, 0.088, 0.004);
  const k = sb * (1 - dc);
  return E(t, {
    cam: mov(t, C(74), C(85), cam(0, 4, 0.5, pv(-0.045, 0.06), { larg: 1.7, forca: 0.55 }), cam(6, 5, 0.44, pv(-0.045, 0.065), { larg: 1.7, forca: 0.55 })),
    nuvens: [nv(CHEIRO_SIF, A(66) + 0.1, { n: 26, periodo: 2.6, rCano: 0.0085, fim: "bate", seed: 2 })],
    barata: { pos: [xs(p0[0], p1[0], k), xs(p0[1], p1[1], k), p0[2]], rotY: Math.PI, incl: -Math.PI / 2, rolo: dc > 0 ? 0.4 * Math.sin(t * 9) : 0, anda: dc > 0 ? 0 : t * 8, esc: 0.34 },
  });
});
// 10. "Esse é o sifão": a louça cortada inteira, com o selo
plano(C(85), (t) => E(t, {
  cam: mov(t, C(85), C(89), cam(4, 6, 0.95, pv(-0.01, 0.08), { larg: 1.5, forca: 0.6 }), cam(14, 8, 1.0, pv(-0.01, 0.08), { larg: 1.5, forca: 0.6 })),
  nuvens: [nv(CHEIRO_SIF, A(66) + 0.1, { n: 26, periodo: 2.6, rCano: 0.0085, fim: "bate", seed: 2 })],
}));
// 11. "É por isso que sempre tem água parada no fundo do vaso": macro de cima, dentro da bacia
plano(C(89), (t) => E(t, {
  corte: ZP + 0.25,
  cam: mov(t, C(89), C(101), cam(50, 60, 0.6, pv(0.03, 0.09), { larg: 1.4, forca: 0.7 }), cam(72, 66, 0.44, pv(0.03, 0.085), { larg: 1.4, forca: 0.7 })),
}));

// ---------------------------------------------------------------- CAIXA SIFONADA
// 12. "Mas o ralo do chuveiro e a pia também têm cano": os canos do lavatório e do ralo do chuveiro caem direto no ramal
plano(C(101), (t) => E(t, {
  cam: mov(t, C(101), C(112), cam(24, 16, 2.0, [-0.2, 0.12, ZP - 0.22]), cam(14, 12, 1.75, [-0.18, 0.08, ZP - 0.22])),
}));
// 13. "e por eles o cheiro continua subindo": o algodão sai pela pia e pelo ralo
plano(C(112), (t) => E(t, {
  cam: mov(t, C(112), C(119), cam(12, 15, 1.95, [-0.16, 0.16, -0.78]), cam(18, 17, 1.8, [-0.16, 0.18, -0.78])),
  nuvens: [nv(CHEIRO_LAV, A(110) + 0.1, { n: 40, periodo: 1.6, rCano: 0.009, esc: 0.03, alt: 0.28, seed: 6 }), nv(CHEIRO_CHU, A(110) + 0.2, { n: 40, periodo: 1.6, rCano: 0.009, esc: 0.032, alt: 0.3, seed: 8 })],
}));
// 14. "Então você junta todos numa caixa no chão do banheiro, que também guarda um pouco de água pra fechar a passagem"
plano(C(119), (t) => E(t, {
  cam: mov(t, C(119), C(140), cam(6, 10, 1.05, [XS - 0.02, -0.01, ZP], { larg: 1.35 }), cam(12, 12, 0.9, [XS, 0.0, ZP], { larg: 1.35 })),
  nuvens: [
    nv(CHEIRO_LAV, A(110) + 0.1, { n: 40, periodo: 1.6, rCano: 0.009, esc: 0.03, alt: 0.28, seed: 6, some: A(119) + 0.1 }),
    nv(CHEIRO_CHU, A(110) + 0.2, { n: 40, periodo: 1.6, rCano: 0.009, esc: 0.032, alt: 0.3, seed: 8, some: A(119) + 0.1 }),
    nv(CHEIRO_GRELHA, A(124) + 0.25, { n: 30, periodo: 1.8, rCano: 0.01, esc: 0.03, alt: 0.25, seed: 11, some: A(135) }),
    nv(CHEIRO_CS_BLOQ, A(135) + 0.1, { n: 18, periodo: 2.0, rCano: 0.01, fim: "bate", seed: 12 }),
  ],
}));
// 14b. "que também guarda um pouco de água pra fechar a passagem": close da caixa enchendo e o cheiro batendo na água
plano(C(129), (t) => E(t, {
  cam: mov(t, C(129), C(140), cam(-6, 5, 0.62, [XS, -0.015, ZP], { larg: 1.5, forca: 0.6 }), cam(2, 5, 0.55, [XS, -0.02, ZP], { larg: 1.5, forca: 0.6 })),
  nuvens: [
    nv(CHEIRO_GRELHA, A(124) + 0.25, { n: 30, periodo: 1.8, rCano: 0.01, esc: 0.03, alt: 0.25, seed: 11, some: A(135) }),
    nv(CHEIRO_CS_BLOQ, A(135) + 0.1, { n: 18, periodo: 2.0, rCano: 0.01, fim: "bate", seed: 12 }),
  ],
}));
// 15. "Essa é a caixa sifonada"
plano(C(140), (t) => E(t, {
  cam: mov(t, C(140), C(145), cam(14, 12, 0.95, [XS, -0.005, ZP], { larg: 1.35 }), cam(24, 14, 1.0, [XS, -0.005, ZP], { larg: 1.35 })),
  nuvens: [nv(CHEIRO_CS_BLOQ, A(135) + 0.1, { n: 18, periodo: 2.0, rCano: 0.01, fim: "bate", seed: 12 })],
}));
// 16. "É por isso que o ralo do banheiro tem água embaixo da grelha": macro de cima na grelha
plano(C(145), (t) => E(t, {
  corte: ZP + 0.15,
  cam: mov(t, C(145), C(158), cam(30, 66, 0.36, [XS, FY, ZP], { larg: 1.5, forca: 0.7 }), cam(48, 72, 0.29, [XS, FY, ZP], { larg: 1.5, forca: 0.7 })),
}));

// ---------------------------------------------------------------- RESPIRO
// 17. "Mas quando você dá descarga, aquela água toda descendo"
plano(C(158), (t) => E(t, {
  cam: mov(t, C(158), C(167), cam(4, 8, 1.45, [-0.42, 0.0, ZP]), cam(8, 8, 1.3, [-0.4, 0.0, ZP])),
  jatos: [{ pts: DESC_SIF, u: eio(k01(t, A(161) + 0.1, A(167) + 0.4)), len: 0.45, r: 0.013 }],
}));
// 18. "puxa a água dos sifões junto": a água do vaso e da caixa é sugada
plano(C(167), (t) => E(t, {
  cam: mov(t, C(167), C(173), cam(6, 7, 1.15, [-0.44, 0.01, ZP], { larg: 1.3 }), cam(2, 7, 1.05, [-0.44, 0.01, ZP], { larg: 1.3 })),
  jatos: [{ pts: DESC_SIF, u: eio(k01(t, A(161) + 0.1, A(167) + 0.4)), len: 0.45, r: 0.013 }],
}));
// 19. "e o cheiro volta"
plano(C(173), (t) => E(t, {
  cam: mov(t, C(173), C(177), cam(20, 15, 1.6, [-0.42, 0.14, ZP - 0.1]), cam(26, 17, 1.75, [-0.42, 0.16, ZP - 0.1])),
  nuvens: [nv(CHEIRO_SIF_VAZIO, A(173) - 0.6, { n: 36, periodo: 2.0, rCano: 0.009, esc: 0.032, alt: 0.25, seed: 14 }), nv(CHEIRO_GRELHA, A(173) - 0.5, { n: 30, periodo: 1.8, rCano: 0.01, esc: 0.03, alt: 0.25, seed: 15 })],
}));
// 20. "Então você põe um cano que sobe lá da tubulação até acima do telhado, pra deixar o ar entrar e sair por cima"
plano(C(177), (t) => {
  const k = eio(k01(t, A(183), A(190)));
  const topo = YTOPO_RESP - (1 - k * (2 - k)) * 1.35;
  const sobe = eio(k01(t, A(183), A(190) + 0.2));
  return E(t, {
    cam: lc(cam(28, 8, 1.55, [XI, 0.0, ZP]), cam(36, 14, 1.75, [XI, 0.98, ZP]), sobe),
    nuvens: [
      nv(CHEIRO_SIF_VAZIO, A(173) - 0.6, { n: 36, periodo: 2.0, rCano: 0.009, esc: 0.032, alt: 0.25, seed: 14, some: A(183) }),
      nv(CHEIRO_GRELHA, A(173) - 0.5, { n: 30, periodo: 1.8, rCano: 0.01, esc: 0.03, alt: 0.25, seed: 15, some: A(183) }),
      nv(CHEIRO_RESP, A(192) - 1.2, { n: 34, periodo: 2.2, rCano: 0.01, esc: 0.04, alt: 0.35, abre: 0.16, seed: 16, vento: [0.1, 0, 0.0] }),
    ],
    _topo: topo,
  } as Partial<Estado>);
});
// 20b. "pra deixar o ar entrar e sair por cima": o topo do respiro em cima do telhado, o cheiro indo embora pelo alto
plano(C(191), (t) => E(t, {
  cam: mov(t, C(191), C(200), cam(56, 18, 1.35, [XI, 1.12, ZP]), cam(44, 15, 1.5, [XI, 1.06, ZP])),
  nuvens: [nv(CHEIRO_RESP, A(192) - 1.2, { n: 34, periodo: 2.2, rCano: 0.01, esc: 0.04, alt: 0.35, abre: 0.16, seed: 16, vento: [0.1, 0, 0.0] })],
}));
// 21. "Esse é o respiro"
plano(C(200), (t) => E(t, {
  cam: mov(t, C(200), C(204), cam(38, 14, 1.45, [XI, 0.98, ZP]), cam(50, 16, 1.4, [XI, 1.0, ZP])),
  nuvens: [nv(CHEIRO_RESP, A(192) - 1.2, { n: 34, periodo: 2.2, rCano: 0.01, esc: 0.04, alt: 0.35, abre: 0.16, seed: 16, vento: [0.1, 0, 0.0] })],
}));
// 22. "É por isso que tem aquele cano saindo do telhado de muita casa": macro do lado de fora, casa inteira
plano(C(204), (t) => E(t, {
  corte: null,
  cam: mov(t, C(204), C(217), cam(58, 9, 0.8, [XI, 1.12, ZP], { larg: 1.4, forca: 0.7 }), cam(80, 13, 0.68, [XI, 1.12, ZP], { larg: 1.4, forca: 0.7 })),
}));

// ---------------------------------------------------------------- CAIXA DE GORDURA
const OLEO_PIA: V3[] = [[PIA[0] - 0.01, PIA[1] + 0.05, PIA[2]], [PIA[0], PIA[1] - 0.005, PIA[2]], ...CAM.coz1.slice(1)];
// 23. "Mas a gordura que desce da pia da cozinha": a frigideira vira na cuba, o óleo desce
plano(C(217), (t) => E(t, {
  corte: ZK,
  cam: mov(t, C(217), C(226), cam(20, 18, 1.35, [-1.18, 0.2, -0.86]), cam(12, 14, 1.1, [-1.16, 0.16, -0.86])),
  oleo: [{ pts: OLEO_PIA, u: eio(k01(t, A(221), A(225) + 0.8)), len: 0.35, r: 0.006 }],
}));
// 24. "esfria no cano, endurece..." : o cano cortado fecha por dentro
plano(C(226), (t) => E(t, {
  corte: ZK,
  cam: mov(t, C(226), C(231), cam(2, 4, 0.78, [-0.62, -0.06, ZK], { larg: 1.4, forca: 0.6 }), cam(4, 4, 0.6, [-0.6, -0.07, ZK], { larg: 1.4, forca: 0.6 })),
}));
// 25. "e ENTOPE tudo": a pia transborda e a água espalha no piso
plano(C(231), (t) => E(t, {
  corte: -0.2,
  cam: mov(t, C(231), C(233), cam(22, 24, 1.25, [-1.1, 0.13, -0.78]), cam(26, 28, 1.4, [-1.06, 0.1, -0.74])),
}));
// 26. "Então você faz a pia passar antes por uma caixa onde a água fica um tempo parada": a caixa cai no quintal
plano(C(233), (t) => E(t, {
  corte: ZK,
  cam: mov(t, C(233), C(250), cam(6, 11, 2.3, [0.0, -0.04, ZK]), cam(10, 12, 1.5, [0.45, -0.06, ZK])),
}));
// 27. "A gordura boia, fica presa lá em cima, e só a água continua"
plano(C(250), (t) => E(t, {
  corte: ZK,
  cam: mov(t, C(250), C(263), cam(3, 5, 0.72, [XCG + 0.03, -0.1, ZK], { larg: 1.4, forca: 0.6 }), cam(8, 6, 0.66, [XCG + 0.04, -0.1, ZK], { larg: 1.4, forca: 0.6 })),
  oleo: [{ pts: [[XCG - 0.075, Y_COZ, ZK], [XCG - 0.035, Y_COZ, ZK], [XCG - 0.035, -0.05, ZK]], u: eio(k01(t, A(250), A(252) + 0.4)), len: 0.08, r: 0.007 }],
  jatos: [{ pts: [[XCG + 0.04, -0.17, ZK], [XCG + 0.04, Y_COZ, ZK], [XCG + 0.12, Y_COZ, ZK], [XCI1, Y_COZ, ZK]], u: eio(k01(t, A(259), A(262) + 0.6)), len: 0.22, r: 0.011 }],
}));
// 28. "Essa é a caixa de gordura"
plano(C(263), (t) => E(t, {
  corte: ZK,
  cam: mov(t, C(263), C(269), cam(10, 8, 0.95, [XCG + 0.02, -0.08, ZK], { larg: 1.4 }), cam(20, 10, 1.0, [XCG + 0.02, -0.08, ZK], { larg: 1.4 })),
}));
// 29. "É por isso que, de tempos em tempos, alguém tem que abrir essa caixa e tirar aquela pasta"
plano(C(269), (t) => E(t, {
  corte: null,
  cam: mov(t, C(269), C(287), cam(24, 30, 1.55, [XCG, 0.1, ZK - 0.12], { larg: 1.4, forca: 0.7 }), cam(36, 36, 1.4, [XCG, 0.08, ZK - 0.1], { larg: 1.4, forca: 0.7 })),
  ped: t < A(284) ? poseAjoelha(PED_CG, 0.15) : { ...poseAjoelha(PED_CG, 0.15), item: "pa", alvoPa: [XCG - 0.02, -0.05 + 0.04 * Math.sin(t * 6), ZK - 0.02], terraPa: 0 },
}));

// ---------------------------------------------------------------- CAIMENTO
const aguaParada = (t: number, ang: number, u: number) => ({ pts: ramal(-0.42, 1.78, ang, -R_ESG * 0.42), u, len: 2.2, r: 0.0105 });
// 30. "Mas o cano deitado reto deixa a água parada lá dentro, e tudo que desce fica parado junto"
plano(C(287), (t) => {
  const bx = xs(-0.3, 0.32, eio(k01(t, A(299), A(302))));
  return E(t, {
    cam: mov(t, C(287), C(305), cam(3, 5, 1.3, [0.32, -0.12, ZP]), cam(8, 6, 1.15, [0.3, -0.12, ZP])),
    jatos: [aguaParada(t, 0, 0.5)],
    bolinha: t >= A(299) - 0.1 ? [bx, yRamal(bx, 0) - R_ESG * 0.38, ZP + 0.004] : null,
  });
});
// 30b. "e tudo que desce fica parado junto": close na bolinha parada no cano reto
plano(C(298), (t) => {
  const bx = xs(-0.3, 0.32, eio(k01(t, A(299), A(302))));
  return E(t, {
    cam: mov(t, C(298), C(305), cam(-2, 4, 0.62, [0.18, -0.13, ZP], { larg: 1.5, forca: 0.6 }), cam(4, 4, 0.55, [0.28, -0.13, ZP], { larg: 1.5, forca: 0.6 })),
    jatos: [aguaParada(t, 0, 0.5)],
    bolinha: [bx, yRamal(bx, 0) - R_ESG * 0.38, ZP + 0.004],
  });
});
// 31. "Então você deita o cano um pouquinho inclinado, descendo sempre na direção da rua"
plano(C(305), (t) => {
  const ang = inclinaEm(t), k = eio(k01(t, A(313), A(318)));
  const bx = xs(0.32, 1.84, k);
  return E(t, {
    cam: mov(t, C(305), C(319), cam(32, 20, 2.2, [0.5, -0.06, ZP - 0.06]), cam(18, 12, 2.7, [0.78, -0.14, ZP])),
    jatos: [aguaParada(t, ang, 0.5 + 0.5 * k)],
    bolinha: k < 0.98 ? [bx, yRamal(bx, ang) - R_ESG * 0.38, ZP + 0.004] : null,
  });
});
// 32. "Esse é o caimento"
plano(C(319), (t) => E(t, { cam: mov(t, C(319), C(323), cam(-14, 5, 1.25, [0.72, -0.17, ZP], { larg: 1.3 }), cam(-8, 6, 1.15, [0.75, -0.17, ZP], { larg: 1.3 })) }));

// ---------------------------------------------------------------- CAIXA DE INSPEÇÃO
// 33. "Mas um dia entope lá no meio do quintal": o bolo entope o cano e a água volta
plano(C(323), (t) => E(t, {
  cam: mov(t, C(323), C(330), cam(4, 6, 1.3, [0.72, -0.15, ZP]), cam(-4, 6, 1.5, [0.5, -0.14, ZP])),
  jatos: [{ pts: [[0.72, yRamal(0.72, TH) - R_ESG * 0.3, ZP], [-0.52, YR0 - R_ESG * 0.3, ZP]], u: eio(k01(t, A(327), A(331))), len: 0.6, r: 0.012 }],
}));
// 33b. "do quintal" -> a água volta pelo ralo e alaga o banheiro
plano(C(330), (t) => E(t, {
  cam: mov(t, C(330), C(332), cam(24, 28, 1.45, [-0.3, 0.05, -0.42]), cam(28, 30, 1.35, [-0.3, 0.05, -0.42])),
  jatos: [{ pts: [[XS, -0.04, ZP], [XS, FY + 0.03, ZP]], u: 0.5 + 0.5 * k01(t, C(330), C(332)), len: 0.1, r: 0.012 }],
}));
// 34. "e ninguém alcança": o pedreiro cava longe do entupimento
plano(C(332), (t) => E(t, {
  cam: mov(t, C(332), C(335), cam(38, 18, 2.1, [0.62, 0.0, ZP - 0.1]), cam(42, 20, 2.2, [0.62, 0.02, ZP - 0.1])),
  buraco: 0.4 + 0.4 * eio(k01(t, C(332), C(335))),
  ped: poseCava(PED_CAVA, -0.2, t * 1.15, BUR),
}));
// 35. ◀◀ "Então, em cada curva do caminho, você faz uma caixa com tampa": as caixas caem nas curvas e junções
plano(C(335), (t) => E(t, {
  cam: mov(t, C(335), C(347), cam(18, 24, 2.7, [0.62, -0.05, ZP - 0.18]), cam(26, 26, 2.4, [0.7, -0.05, ZP - 0.18])),
  buraco: 0.8 * (1 - eio(k01(t, C(335), C(335) + 0.5))),
  ped: posePe([1.32, 0, ZP - 0.36], -0.7, { cab: [0.25, 0] }),
}));
// 35b. "pra abrir e desentupir dali": ele abre a tampa e desentope
plano(C(347), (t) => E(t, {
  cam: mov(t, C(347), C(352), cam(24, 20, 1.6, [XCI1, 0.1, ZP - 0.14]), cam(30, 22, 1.5, [XCI1, 0.09, ZP - 0.14])),
  ped: { ...poseAjoelha(PED_CI, 0.05), bD: { frente: 1.4, abre: 0.15, cot: 0.2 } },
  jatos: [{ pts: ramal(-0.52, 1.8, TH, -R_ESG * 0.3), u: eio(k01(t, A(350) + 0.2, A(352) + 0.8)), len: 0.7, r: 0.012 }],
}));
// 36. "Essa é a caixa de inspeção"
plano(C(352), (t) => E(t, {
  cam: mov(t, C(352), C(358), cam(16, 15, 1.4, [XCI1, 0.04, ZP - 0.06]), cam(24, 17, 1.35, [XCI1, 0.04, ZP - 0.06])),
  ped: posePe([XCI1 + 0.06, 0, ZP - 0.22], -0.3, { cab: [0.3, 0], bD: { frente: 1.2, abre: 0.3, cot: 0.1 } }),
}));
// 37. "É por isso que tem aquelas tampas de concreto no quintal": macro rasante no quintal, casa inteira
plano(C(358), (t) => E(t, {
  corte: null,
  cam: mov(t, C(358), C(369), cam(68, 15, 1.35, [0.8, 0.0, -0.52], { larg: 1.3, forca: 0.75 }), cam(86, 13, 1.15, [0.8, 0.0, -0.52], { larg: 1.3, forca: 0.75 })),
}));

// ---------------------------------------------------------------- FECHAMENTO
// 38. "Ligue tudo no esgoto da rua, coloque um ralo no quintal, e pronto."
plano(C(369), (t) => E(t, {
  cam: mov(t, C(369), C(382), cam(8, 13, 4.6, [0.25, -0.02, ZP]), cam(14, 12, 4.2, [0.3, -0.03, ZP])),
  jatos: [{ pts: ramal(-0.52, 1.8, TH, -R_ESG * 0.3), u: eio(k01(t, A(369), A(374) + 0.4)), len: 0.8, r: 0.012 }],
  ped: posePe([1.32, 0, ZP - 0.36], -0.7, { cab: [0.25, 0] }),
}));
// 39. "Agora é só dar descarga e nunca mais pensar nisso": tudo desce; a barata bate na água do sifão e desiste
plano(C(382), (t) => {
  const sb = eio(k01(t, C(382), A(388))), dc = eio(k01(t, A(388) + 0.25, A(391)));
  const p0 = pv(-0.068, 0.0, 0.004), p1 = pv(-0.06, 0.088, 0.004);
  const k = sb * (1 - dc);
  return E(t, {
    cam: mov(t, C(382), C(392), cam(0, 5, 0.75, pv(-0.025, 0.05), { larg: 1.6, forca: 0.6 }), cam(6, 6, 0.62, pv(-0.03, 0.055), { larg: 1.6, forca: 0.6 })),
    jatos: [{ pts: DESC_SIF, u: eio(k01(t, A(385), A(388) + 0.3)), len: 0.45, r: 0.013 }],
    barata: { pos: [xs(p0[0], p1[0], k), xs(p0[1], p1[1], k), p0[2]], rotY: Math.PI, incl: -Math.PI / 2, rolo: dc > 0 ? 0.4 * Math.sin(t * 9) : 0, anda: dc > 0 ? 0 : t * 8, esc: 0.34 },
  });
});
// 40. "Parabéns! Você construiu o esgoto de uma casa.": o enquadramento do quadro 0, agora com tudo pronto
const FIM_A = cam(46, 19, 2.9, [0.3, 0.06, ZP - 0.12], { foco: 0.45, forca: 0.8, larg: 1.2 });
const FIM_B = cam(40, 17, 2.6, [0.34, 0.05, ZP - 0.12], { foco: 0.45, forca: 0.8, larg: 1.2 });
const pedFim = posePe(PED_FIM, -0.2, { item: "pa", alvoPa: [PED_FIM[0] + 0.08, 0.0, PED_FIM[2] + 0.1], cab: [0.1, 0.2], bD: { frente: 0.55, cot: 0.5, abre: 0.15 }, bE: { frente: 0.2, cot: 1.6, abre: 0.5 } });
plano(C(392), (t) => E(t, { cam: mov(t, C(392), C(400), FIM_A, FIM_B), ped: pedFim }));
// 41. VIRADA "Esse vídeo foi feito com IA... até a minha voz": a maquete congela e vira arame laranja e partículas
plano(C(400), (t) => E(Math.min(t, C(400)), {
  t,
  cam: mov(t, C(400), C(410), FIM_B, cam(52, 22, 3.1, [0.3, 0.1, ZP - 0.12], { foco: 0.5, forca: 0.5, larg: 1.2 })),
  ped: pedFim,
  virada: { k: eio(k01(t, A(400), A(405) + 0.4)), k2: eio(k01(t, A(406), A(409) + 0.6)) },
}));

export function estadoEm(t: number): Estado {
  let p = PLANOS[0];
  for (const q of PLANOS) if (t >= q.ini) p = q;
  return p.f(t);
}
/** início de cada plano (para medir cortes) */
export const INICIOS = () => PLANOS.map((p) => p.ini);
