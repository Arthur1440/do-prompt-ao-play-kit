// Linha do tempo do reel (direção A): cada degrau da escada de falhas preso às palavras da narração editada.
// estadoEm(t) é função pura do tempo: plano, câmera, corte, terreno, piscina, flamingo e extras.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Cam } from "./three/mundo";
import type { EstadoPiscina } from "./three/piscina";
import type { EstadoFlamingo } from "./three/flamingo";
import { IN, RALOS, COAD, Y_PISO } from "./three/piscina";

export const A = (i: number) => PALAVRAS[i].a;
export const B = (i: number) => PALAVRAS[i].b;
export const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
export const ei = (x: number) => Math.pow(c01(x), 3);
const eob = (x: number) => { const t = c01(x); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); };

export const FPS = 30;
export const QUADROS = Math.round(DURACAO * FPS);
export const T_ULTIMO = (QUADROS - 1) / FPS;

// cortes (s) — início de cada plano
export const S = {
  terraBebe: 6.68, tijolo: 11.45, empurra: 14.58, caixa: 20.28, estrutura: 25.94, poros: 27.46, baixando: 29.56, camada: 31.9,
  verde: 39.62, bomba: 45.4, filtro: 52.12, buraquinhos: 53.66, voltando: 57.2, folha: 59.06, puxaFundo: 60.33, rodando: 62.35,
  janela: 64.28, coadeira: 69.33, portinha: 70.97, ralo: 74.76, doisRalos: 78.93, porIsso2: 87.07, vivo: 90.52, cloro: 96.46,
  cheiro: 99.92, esvazia: 108.36, empurraCima: 113.7, valvula: 119.28, alivio: 127.25, chuva: 129.25, calcada: 132.75,
  pular: 138.03, parabens: 139.55, virada: 142.83, quer: 147.1, volta: 153.2,
};

export const CAM_GANCHO: Cam = { az: -14, el: 36, dist: 8.4, fov: 30, alvo: [0.35, -0.35, 0.25], foco: 0.42 };
const CAM_CORTE: Cam = { az: -10, el: 13, dist: 12.8, fov: 30, alvo: [0, -0.85, -0.3], foco: 0.5 };

/** interpola câmeras (com alvo) */
export const lc = (a: Cam, b: Cam, x: number): Cam => {
  const e = eio(x);
  const L = (p = 0, q = 0) => p + (q - p) * e;
  const aa = a.alvo ?? [0, -0.4, 0], bb = b.alvo ?? [0, -0.4, 0];
  return {
    az: L(a.az, b.az), el: L(a.el, b.el), dist: L(a.dist, b.dist), fov: L(a.fov ?? 30, b.fov ?? 30),
    alvo: [L(aa[0], bb[0]), L(aa[1], bb[1]), L(aa[2], bb[2])], foco: L(a.foco ?? 0.45, b.foco ?? 0.45),
  };
};
/** câmera que deriva devagar (nada parado mais de 2,5 s) */
const deriva = (c: Cam, t: number, t0: number, daz = 4, ddist = -0.4): Cam => ({ ...c, az: c.az + daz * (t - t0) / 3, dist: c.dist + ddist * (t - t0) / 3 });
/** corte que entra fatiando: z de 3,3 (fora da tábua) até 0 */
const fatia = (t: number, t0: number, dur = 0.55) => 3.3 * (1 - eio(k01(t, t0, t0 + dur)));

const PRONTA: EstadoPiscina = { concreto: 1, imper: 1, azulejo: 1, borda: 1, ralos: 2, coadeira: 1, retornos: 1, porta: 0.3 };
const NIVEL = -0.12;
/** flamingo boiando */
const boia = (t: number, x: number, z: number, nivel = NIVEL, extra: EstadoFlamingo = {}): EstadoFlamingo => ({
  p: [x + Math.sin(t * 0.6) * 0.04, nivel - 0.075 + Math.sin(t * 1.7) * 0.012, z + Math.cos(t * 0.5) * 0.04],
  giro: -0.6 + Math.sin(t * 0.3) * 0.3, incl: [Math.sin(t * 1.3) * 0.04, Math.cos(t * 1.1) * 0.04], ...extra,
});
/** flamingo sentado na grama, de lado (sujo de lama nas etapas de obra) */
const naGrama = (t: number, lama = 0.45): EstadoFlamingo => ({ p: [-3.3, 0.08, 1.35], giro: 0.9, incl: [0.0, 0.18 + Math.sin(t * 2) * 0.02], lama, sq: 0.96 });

export function estadoEm(t0: number): Estado {
  const t = t0;
  // ---------------------------------------------------------------- 1. gancho: o buraco vira lamaçal
  if (t < S.terraBebe) {
    const k = k01(t, 0, S.terraBebe);
    return {
      t, cam: lc(CAM_GANCHO, { ...CAM_GANCHO, az: -6, dist: 7.4, alvo: [0.45, -0.4, 0.3] }, k),
      ter: { modo: "buraco", colapso: 0.32 + 0.4 * eio(k01(t, 0.2, 6.4)) }, lama: { nivel: -0.32 }, pis: {}, maq: 0,
      fla: { p: [0.5, -0.4 - 0.1 * eio(k), 0.35], giro: -0.9 + k * 0.25, incl: [0.08 + 0.12 * k, -0.3 - 0.25 * k], lama: 0.2 + 0.35 * k, olhos: 1.3 + 0.3 * eio(k01(t, A(20) - 0.1, A(20) + 0.2)), pescocoDobra: 0.1 + 0.05 * Math.sin(t * 3) },
    };
  }
  if (t < S.tijolo) {
    // corte do terreno: a água some na terra, a parede de terra molhada desmorona
    const nivel = -0.32 - 0.48 * eio(k01(t, A(24) - 0.1, A(33)));
    const col = 0.72 + 0.28 * eio(k01(t, A(33) - 0.15, A(35)));
    const cam = lc({ ...CAM_GANCHO, az: -6, dist: 7.4, alvo: [0.45, -0.4, 0.3] }, { az: -4, el: 13, dist: 11.4, fov: 30, alvo: [0.2, -0.7, 0], foco: 0.5 }, k01(t, S.terraBebe, S.terraBebe + 0.7));
    return {
      t, cam: deriva(cam, t, S.terraBebe + 0.7, 2.5, -0.3), corte: fatia(t, S.terraBebe + 0.05), ter: { modo: "buraco", colapso: col, molhado: [0.1, -0.55, 0.25 + 2.1 * eio(k01(t, A(24) - 0.2, A(35))), 0.9] },
      lama: { nivel }, pis: {}, maq: 0,
      fla: { p: [0.45, nivel - 0.1 - 0.06 * k01(t, A(33), A(35)), -0.2], giro: -0.6, incl: [0.2, -0.55], lama: 0.65, olhos: 1.6 },
    };
  }
  // ---------------------------------------------------------------- 2. estrutura: tijolo racha, caixa de concreto
  if (t < S.empurra) {
    const cam = { az: 18 + 10 * k01(t, S.tijolo, S.empurra), el: 52, dist: 14.2 - 1.0 * k01(t, S.tijolo, S.empurra), fov: 30, alvo: [0, -0.6, 0] as [number, number, number], foco: 0.52 };
    return {
      t, cam, ter: { modo: "obra", sujeira: 0.9 }, maq: 0,
      pis: { tijolo: eio(k01(t, A(38), B(42) + 0.1)), reboco: eio(k01(t, A(44) - 0.05, A(45))) },
      fla: naGrama(t),
    };
  }
  if (t < S.caixa) {
    const nivel = t < 19.2 ? NIVEL : NIVEL - 0.38 * eio(k01(t, 19.2, 20.3));
    const cheio = eio(k01(t, S.empurra, S.empurra + 0.45));
    const cam = lc({ az: 10, el: 15, dist: 12.6, fov: 30, alvo: [0.1, -0.75, -0.4], foco: 0.5 }, { az: 6, el: 15, dist: 10.5, fov: 30, alvo: [0.2, -0.75, -0.7], foco: 0.5 }, k01(t, A(56), A(60) + 0.3));
    const puxa = eio(k01(t, A(60), S.caixa));
    return {
      t, cam: deriva(cam, t, S.empurra, -2, -0.2), corte: fatia(t, S.empurra), ter: { modo: "obra", sujeira: 0.9 }, maq: 0,
      pis: {
        tijolo: 1, reboco: 1, estufa: eio(k01(t, A(48), A(55) + 0.4)), racha: eio(k01(t, A(60) - 0.05, B(64))), abre: 0.32 * eio(k01(t, A(64), S.caixa)),
        agua: 1, nivel: Y_PISO + 0.05 + (nivel - Y_PISO - 0.05) * cheio, cor: { lama: 0.12 }, vazaRacha: k01(t, A(61), A(62)),
      },
      fla: t < A(60)
        ? boia(t, 0.9, -0.5, NIVEL, { olhos: 1.1 })
        : { p: [0.9 - 0.12 * puxa, nivel - 0.08, -0.5 - 0.28 * puxa], giro: 0.45 * puxa - 0.6 * (1 - puxa), incl: [-0.25 * puxa, 0.42 * puxa], sq: 1 - 0.22 * puxa, olhos: 1.8, pescocoDobra: 0.3 * puxa, esc: 1 - 0.2 * puxa },
    };
  }
  if (t < S.poros) {
    const k = k01(t, S.caixa, S.poros);
    const rot = t >= S.estrutura;
    return {
      t, cam: lc({ az: -22, el: 50, dist: 14.4, fov: 30, alvo: [0, -0.7, 0], foco: 0.52 }, { az: 6, el: 44, dist: 13.0, fov: 30, alvo: [0, -0.7, -0.1], foco: 0.52 }, k),
      ter: { modo: "obra", sujeira: 0.9 }, maq: 0,
      pis: { armadura: eio(k01(t, A(69), B(75) + 0.2)), concreto: eio(k01(t, A(76) - 0.1, B(83))) + (rot ? 0 : 0) },
      fla: naGrama(t),
    };
  }
  // ---------------------------------------------------------------- 3. impermeabilização: poros, nível baixa
  if (t < S.baixando) {
    const cam = { az: -24 + 6 * k01(t, S.poros, S.baixando), el: 8, dist: 4.4 - 0.4 * k01(t, S.poros, S.baixando), fov: 30, alvo: [-2.15, -0.7, 0] as [number, number, number], foco: 0.5 };
    return {
      t, cam, corte: fatia(t, S.poros, 0.45), ter: { modo: "obra", sujeira: 0.9, molhado: [-2.4, -0.75, 0.3 + 0.9 * eio(k01(t, A(92), S.baixando)), 0.8] }, maq: 0,
      pis: { concreto: 1, agua: 1, nivel: NIVEL }, ex: { poros: k01(t, A(90), A(92)) },
      fla: boia(t, -0.8, -0.4),
    };
  }
  if (t < S.camada) {
    const nivel = NIVEL - (NIVEL - Y_PISO - 0.06) * eio(k01(t, A(97), B(102)));
    const enc = nivel < Y_PISO + 0.2;
    return {
      t, cam: deriva(CAM_CORTE, t, S.baixando, 3, -0.3), corte: 0, ter: { modo: "obra", sujeira: 0.9, molhado: [-2.4, -0.75, 1.2, 0.8] }, maq: 0,
      pis: { concreto: 1, agua: 1, nivel }, ex: { poros: 1 },
      fla: enc ? { p: [-0.6, Y_PISO + 0.09, -0.3], giro: -0.4, incl: [0.18, -0.32], sq: 0.9, olhos: 1.6 } : boia(t, -0.6, -0.3, nivel),
    };
  }
  if (t < S.verde) {
    const k = k01(t, S.camada, S.verde);
    const imp = eio(k01(t, A(107), B(120) - 0.3));
    return {
      t, cam: lc({ az: 24, el: 54, dist: 13.8, fov: 30, alvo: [0, -0.8, 0], foco: 0.52 }, { az: 6, el: 48, dist: 12.4, fov: 30, alvo: [0, -0.8, -0.1], foco: 0.52 }, k),
      ter: { modo: "obra", sujeira: 0.9 }, maq: 0,
      pis: { concreto: 1, imper: imp, azulejo: eio(k01(t, 38.95, 39.6)) },
      fla: naGrama(t, 0.2),
    };
  }
  // ---------------------------------------------------------------- 4. filtro: água verde, bomba + areia, retornos
  const base = { ter: { modo: "obra" as const, sujeira: 0.6 }, pis: { ...PRONTA, ralos: 1, coadeira: 0, agua: 1, nivel: NIVEL } };
  if (t < S.bomba) {
    const verde = eio(k01(t, A(128), B(132)));
    const enche = eio(k01(t, S.verde, S.verde + 0.5));
    // time-lapse: o sol pisca como dias passando
    const dias = t > A(128) && t < B(132) ? 0.75 + 0.25 * Math.cos((t - A(128)) * 14) : 1;
    return {
      t, cam: deriva({ az: -10, el: 38, dist: 9.2, fov: 30, alvo: [0, -0.3, 0], foco: 0.45 }, t, S.verde, 3, -0.45), ...base, maq: 0, luzSol: dias,
      pis: { ...base.pis, nivel: Y_PISO + 0.05 + (NIVEL - Y_PISO - 0.05) * enche, cor: { verde } },
      fla: boia(t, 0.3, 0.1, NIVEL, { limo: verde }),
      ex: { folhas: { n: 18 * eio(k01(t, A(133) - 0.1, A(134) + 0.3)), modo: "espalha" } },
    };
  }
  if (t < S.filtro) {
    const limpa = 1 - eio(k01(t, A(162), B(163) + 0.3));
    const px = t < A(150) ? -0.6 : t < A(161) ? -0.6 + 4.2 * eio(k01(t, A(150) - 0.2, A(156) + 0.3)) : 3.6 - 2.4 * eio(k01(t, A(161), S.filtro));
    return {
      t, cam: { az: -6, el: 12, dist: 11.5, fov: 30, alvo: [px, -0.85, -0.2], foco: 0.48 }, corte: fatia(t, S.bomba), ...base, maq: 1,
      pis: { ...base.pis, cor: { verde: limpa } }, fluxo: eio(k01(t, A(147) - 0.1, A(147) + 0.4)),
      fla: boia(t, -0.9, -0.4, NIVEL, { limo: limpa }),
    };
  }
  if (t < S.buraquinhos) {
    return {
      t, cam: deriva({ az: -12, el: 12, dist: 7.2, fov: 30, alvo: [3.75, 0.25, 0], foco: 0.5 }, t, S.filtro, 3, -0.3), corte: 0, ...base, maq: 1, fluxo: 1,
      fla: boia(t, -0.9, -0.4),
    };
  }
  if (t < S.voltando) {
    // close nos buraquinhos de retorno soltando água
    return {
      t, cam: deriva({ az: 6, el: 8, dist: 6.2, fov: 30, alvo: [-0.45, -0.55, -0.9], foco: 0.5 }, t, S.buraquinhos, -3, -0.25), corte: fatia(t, S.buraquinhos, 0.4), ...base, maq: 1,
      pis: { ...base.pis, jatoRet: 1 }, fla: boia(t, 0.9, 0.3),
    };
  }
  if (t < S.folha) {
    return {
      t, cam: deriva({ az: -8, el: 11, dist: 10, fov: 30, alvo: [2.2, -0.4, -0.1], foco: 0.5 }, t, S.voltando, 3, -0.3), corte: fatia(t, S.voltando, 0.45), ...base, maq: 1, fluxo: 1,
      pis: { ...base.pis, jatoRet: 1 }, fla: boia(t, -0.9, -0.4),
    };
  }
  // ---------------------------------------------------------------- 5. coadeira: folhas rodando, janela engole
  const comFolhas = (n: number, modo: "espalha" | "gira" | "engole", k = 0) => ({ folhas: { n, modo, k } });
  if (t < S.puxaFundo) {
    return {
      t, cam: { az: 6 * Math.sin(t * 0.3), el: 72 - 4 * k01(t, S.folha, S.puxaFundo), dist: 7.6, fov: 30, alvo: [0, -0.1, 0], foco: 0.5, rolo: -0.2 * k01(t, S.folha, S.puxaFundo) },
      ...base, maq: 1, ex: comFolhas(24, "gira"), fla: boia(t, 0.1, 0.05, NIVEL, { giro: t * 0.6 }),
    };
  }
  if (t < S.rodando) {
    return {
      t, cam: deriva(CAM_CORTE, t, S.puxaFundo, 3, -0.3), corte: fatia(t, S.puxaFundo, 0.45), ...base, maq: 1, fluxo: 1, ex: comFolhas(24, "gira"),
      fla: boia(t, 0.1, -0.3, NIVEL, { giro: t * 0.6 }),
    };
  }
  if (t < S.janela) {
    return {
      t, cam: { az: 0, el: 80, dist: 7.0 - 0.6 * k01(t, S.rodando, S.janela), fov: 30, alvo: [0, -0.1, 0], foco: 0.5, rolo: 0.4 * k01(t, S.rodando, S.janela) },
      ...base, maq: 1, ex: comFolhas(24, "gira"), fla: boia(t, 0.1, 0.05, NIVEL, { giro: t * 0.6 }),
    };
  }
  if (t < S.portinha) {
    const eng = k01(t, A(216) - 0.1, S.coadeira + 0.9);
    return {
      t, cam: deriva({ az: 18, el: 32, dist: 6.4, fov: 30, alvo: [1.1, -0.25, -0.8], foco: 0.5 }, t, S.janela, -2.5, -0.25), ...base, maq: 1,
      pis: { ...base.pis, coadeira: eio(k01(t, A(207) - 0.1, A(207) + 0.4)), porta: 0.3 + 0.35 * Math.max(0, Math.sin((t - A(216)) * 5)) * c01(eng * 4) },
      ex: comFolhas(24, t < A(216) - 0.1 ? "gira" : "engole", eng), fla: boia(t, -0.2, 0.15),
    };
  }
  if (t < S.ralo) {
    // close da portinha balançando
    return {
      t, cam: deriva({ az: -6, el: 14, dist: 1.9, fov: 30, alvo: [COAD.x, -0.14, -IN.z], foco: 0.5 }, t, S.portinha, 3, -0.15), ...base, maq: 1,
      pis: { ...base.pis, coadeira: 1, porta: 0.28 + 0.22 * Math.sin(t * 3.4) + 0.06 * Math.sin(t * 7.1) }, fla: { vis: false },
    };
  }
  // ---------------------------------------------------------------- 6. dois ralos
  const pronta = { ...PRONTA, agua: 1, nivel: NIVEL };
  if (t < S.doisRalos) {
    const suga = eio(k01(t, A(245), B(251) + 0.12)); // gruda no vão depois de "perto" (o tchup cabe ali)
    const xr = RALOS[0][0], zr = RALOS[0][1];
    return {
      t, cam: deriva({ az: -12, el: 13, dist: 11, fov: 30, alvo: [-0.6, -0.9, -0.3], foco: 0.5 }, t, S.ralo, 3, -0.3), corte: fatia(t, S.ralo, 0.45), ter: base.ter, maq: 1, fluxo: 1,
      pis: { ...pronta, ralos: 1 },
      fla: t < A(245) ? boia(t, xr + 0.5, zr, NIVEL, { olhos: 1.2 }) : { p: [xr + 0.5 * (1 - suga), NIVEL - 0.08 + (IN.y + 0.07 - NIVEL + 0.08) * suga, zr], giro: 0.6, incl: [0.1 * suga, 0.05], sq: 1 - 0.4 * suga, pescoco: 1 + 0.25 * suga, pescocoDobra: 0.15 * suga + 0.08 * Math.sin(t * 6) * suga, olhos: 1.3 + 0.4 * suga },
    };
  }
  if (t < S.porIsso2) {
    const solta = eio(k01(t, A(276), B(278) + 0.3));
    const xr = RALOS[0][0], zr = RALOS[0][1];
    return {
      t, cam: deriva({ ...CAM_CORTE, alvo: [-0.15, -1.1, -0.3] }, t, S.doisRalos, 2.5, -0.25), corte: 0, ter: base.ter, maq: 1, fluxo: 1,
      pis: { ...pronta, ralos: 1 + eio(k01(t, A(255) - 0.1, A(256) + 0.2)) },
      fla: { p: [xr, IN.y + 0.07 + (NIVEL - 0.08 - IN.y - 0.07) * solta, zr], giro: 0.6, incl: [0.1 * (1 - solta), 0.05], sq: 0.6 + 0.4 * eob(solta), pescoco: 1.25 - 0.25 * solta, pescocoDobra: 0.15 + 0.08 * Math.sin(t * 6) * (1 - solta), olhos: 1.6 - 0.5 * solta },
    };
  }
  if (t < S.vivo) {
    // close de cima: os dois ralos no fundo
    return {
      t, cam: deriva({ az: 0, el: 66, dist: 10.2, fov: 30, alvo: [0, -1.3, -0.25], foco: 0.5 }, t, S.porIsso2, 3, -0.4), ter: base.ter, maq: 1,
      pis: pronta, fla: boia(t, 0.15, 0.78),
    };
  }
  // ---------------------------------------------------------------- 7. cloro e pH, cheiro de xixi
  if (t < S.cloro) {
    return { t, cam: deriva({ az: -16, el: 42, dist: 9.0, fov: 30, alvo: [0, -0.3, 0], foco: 0.45 }, t, S.vivo, 2.5, -0.4), ter: base.ter, maq: 1, pis: pronta, fla: boia(t, 0.6, 0.2) };
  }
  if (t < S.cheiro) {
    return {
      t, cam: deriva({ az: 14, el: 36, dist: 8.6, fov: 30, alvo: [0, -0.2, 0], foco: 0.45 }, t, S.cloro, -2.5, -0.4), ter: base.ter, maq: 1, pis: pronta,
      ex: { cloro: k01(t, A(314) - 0.25, A(314) + 1.6) }, fla: boia(t, 0.6, 0.35),
    };
  }
  if (t < S.esvazia) {
    const olha = t > A(346) - 0.2 ? Math.sin((t - A(346)) * 4.5) * 0.9 : 0;
    return {
      t, cam: deriva({ az: -10, el: 28, dist: 6.4, fov: 30, alvo: [0.4, -0.05, 0.2], foco: 0.46 }, t, S.cheiro, 3, -0.3), ter: base.ter, maq: 1, pis: pronta,
      ex: { banhista: { vis: true, p: [0.55, -0.62 + Math.sin(t * 1.5) * 0.015, 0.15], olha, giro: 0.15 }, cheiro: eio(k01(t, A(329) - 0.1, A(330) + 0.3)) },
      fla: boia(t, -0.9, 0.3),
    };
  }
  // ---------------------------------------------------------------- 8. válvula de alívio (o espanto)
  const camSobe: Cam = { az: -14, el: 9, dist: 13, fov: 30, alvo: [0.4, 0.15, -0.2], foco: 0.5 };
  if (t < S.empurraCima) {
    const nivel = NIVEL - (NIVEL - IN.y) * eio(k01(t, A(353), B(355) + 0.2));
    const lencol = -2.45 + 1.83 * eio(k01(t, A(356), A(360)));
    const sobeT = A(360) - 0.05;
    // tranco: sobe em degraus, com um balanço no fim
    const sb = t < sobeT ? 0 : Math.min(1, eob(k01(t, sobeT, sobeT + 0.9))) + 0.03 * Math.sin((t - sobeT) * 9) * Math.exp(-(t - sobeT) * 1.5);
    // o flamingo é arremessado pelo tranco e cai do alto na grama
    const kf = k01(t, sobeT, sobeT + 1.75);
    const fla: EstadoFlamingo = t < sobeT
      ? (nivel > IN.y + 0.15 ? boia(t, 0.6, -0.2, nivel) : { p: [0.6, IN.y + 0.09, -0.2], giro: -0.4, incl: [0.15, -0.2], sq: 0.92, olhos: 1.4 })
      : { p: [0.6 + 1.9 * kf, IN.y + 0.09 + sb * 1.15 + 3.6 * kf - 3.9 * kf * kf, -0.2], giro: -0.4 + kf * 3, incl: [kf * 5.5, kf * 2], sq: kf > 0.95 ? 0.75 : 1.12, olhos: 1.8 };
    const shake = t > sobeT && t < sobeT + 1.2 ? Math.sin(t * 60) * 0.03 * (1 - k01(t, sobeT, sobeT + 1.2)) : 0;
    const cam = lc({ az: -6, el: 30, dist: 9.6, fov: 30, alvo: [0, -0.3, 0], foco: 0.45 }, camSobe, k01(t, A(356) - 0.4, A(356) + 0.3));
    return {
      t, cam: { ...cam, alvo: [cam.alvo![0], cam.alvo![1] + shake, cam.alvo![2]] }, corte: fatia(t, A(356) - 0.4, 0.5), ter: { modo: "obra", lencol }, maq: 1, lencolGap: sb * 1.12,
      pis: { ...PRONTA, agua: 1, nivel, sobe: sb }, fla,
    };
  }
  if (t < S.valvula) {
    const sb = 1 + 0.035 * Math.sin((t - S.empurraCima) * 2.4);
    return {
      t, cam: deriva(camSobe, t, S.empurraCima, 2.5, -0.35), corte: 0, ter: { modo: "obra", lencol: -0.62 }, maq: 1, lencolGap: sb * 1.12,
      pis: { ...PRONTA, agua: 0, sobe: sb }, fla: { p: [2.5, 0.08, -0.2], giro: 2.6, incl: [Math.PI, 0.3], sq: 0.85, olhos: 1.5 },
    };
  }
  if (t < S.alivio) {
    const rebob = 1 - eio(k01(t, S.valvula, S.valvula + 0.6));
    const nivel = IN.y + 0.02 + (-0.62 - IN.y - 0.02) * eio(k01(t, A(398), B(404) + 0.3));
    const cam = lc(camSobe, { az: -8, el: 10, dist: 7.2, fov: 30, alvo: [0, -1.35, -0.1], foco: 0.5 }, k01(t, S.valvula + 0.4, A(388) + 0.2));
    return {
      t, cam: deriva(cam, t, A(388), 2, -0.2), corte: 0, ter: { modo: "obra", lencol: -0.62 }, maq: 1, lencolGap: rebob * 1.12,
      pis: { ...PRONTA, agua: t > A(398) ? 1 : 0, nivel, sobe: rebob, valvula: eob(k01(t, A(387), A(388) + 0.25)), valvAbre: eio(k01(t, A(390) - 0.05, A(390) + 0.35)) * (1 - 0.6 * k01(t, A(408), B(410))) },
      fla: { p: [2.5, 0.08, -0.2], giro: 2.6, incl: [Math.PI, 0.3], sq: 0.85, olhos: 1.2 },
    };
  }
  if (t < S.chuva) {
    return {
      t, cam: deriva({ az: -8, el: 10, dist: 7.0, fov: 30, alvo: [0, -1.35, -0.1], foco: 0.5 }, t, S.alivio, 3, -0.3), corte: 0, ter: { modo: "obra", lencol: -0.62 }, maq: 1,
      pis: { ...PRONTA, agua: 1, nivel: -0.62, valvula: 1, valvAbre: 0.4 }, fla: { vis: false },
    };
  }
  if (t < S.calcada) {
    return {
      t, cam: deriva({ az: -10, el: 26, dist: 11.2, fov: 30, alvo: [0, 0.55, -0.1], foco: 0.5 }, t, S.chuva, 3, -0.4), ter: base.ter, maq: 1,
      pis: { ...PRONTA, valvula: 1, agua: 0 }, ex: { chuva: eio(k01(t, S.chuva, S.chuva + 0.6)) }, fla: { p: [2.6, 0.08, 1.6], giro: 2.2, incl: [0, 0.1], sq: 0.95, olhos: 1.3 },
    };
  }
  // ---------------------------------------------------------------- 9. fechamento: calçada, cerca, luz, pular
  const fim = { ...PRONTA, valvula: 1, agua: 1, nivel: NIVEL };
  const extrasFim = (t2: number) => ({ calcada: eio(k01(t2, A(432) - 0.1, A(435) + 0.3)), cerca: k01(t2, A(437) - 0.1, B(441) + 0.2), luz: k01(t2, A(443) - 0.05, A(443) + 0.5) });
  if (t < S.pular) {
    const k = k01(t, S.calcada, S.pular);
    return {
      t, cam: lc({ az: 34, el: 42, dist: 11.4, fov: 30, alvo: [0, -0.2, 0.2], foco: 0.45 }, { az: -4, el: 38, dist: 10.4, fov: 30, alvo: [0, -0.2, 0.3], foco: 0.45 }, k),
      ter: { modo: "obra" }, maq: 1, pis: { ...fim, nivel: Y_PISO + (NIVEL - Y_PISO) * eio(k01(t, S.calcada, S.calcada + 0.5)) }, ex: extrasFim(t), fla: boia(t, 0.5, 0.35),
    };
  }
  if (t < S.virada) {
    const kp = k01(t, A(446), B(447) + 0.15);
    const pulo: [number, number, number] = [-1.1 + 0.6 * kp, 0.08 + 1.1 * kp - 1.6 * kp * kp, 1.85 - 1.2 * kp];
    const cam = t < S.parabens ? deriva({ az: -14, el: 32, dist: 8.8, fov: 30, alvo: [-0.3, -0.2, 0.6], foco: 0.44 }, t, S.pular, 2, -0.3) : lc({ az: -12, el: 33, dist: 8.6, fov: 30, alvo: [-0.2, -0.25, 0.45], foco: 0.44 }, CAM_GANCHO, k01(t, S.parabens, S.parabens + 1.6));
    return {
      t, cam, ter: { modo: "obra" }, maq: 1, pis: fim,
      ex: { ...extrasFim(t), calcada: 1, cerca: 1, luz: 1, banhista: { vis: kp < 1, p: pulo, giro: 0.4, bracos: kp > 0 ? 1 : 0.2 }, respingo: { k: k01(t, B(447) + 0.1, B(447) + 1.3), p: [-0.5, 0, 0.65] } },
      fla: boia(t, 0.5, 0.35, NIVEL, { olhos: 1.0 + 0.2 * Math.sin(Math.PI * k01(t, B(447), B(447) + 0.6)) }),
    };
  }
  // ---------------------------------------------------------------- 10. virada: congela e vira arame laranja + partículas
  const final: Estado = { t: S.virada, cam: CAM_GANCHO, ter: { modo: "obra" }, maq: 1, pis: fim, ex: { calcada: 1, cerca: 1, luz: 1 }, fla: boia(S.virada, 0.5, 0.35) };
  if (t >= S.volta) {
    // volta do loop: o mesmo quintal do gancho, agora com a piscina pronta e o flamingo boiando, enquadrado igual
    return { ...final, t, fla: boia(t, 0.5, 0.35) };
  }
  const v = eio(k01(t, A(453) - 0.05, B(458) + 0.1));
  const d = k01(t, B(458), S.quer + 0.8);
  return {
    ...final, t: S.virada + d * 3, cam: { ...CAM_GANCHO, az: CAM_GANCHO.az + 10 * k01(t, S.virada, S.quer), dist: CAM_GANCHO.dist + 1.4 * d },
    virada: { k: v, k2: d }, escuro: t > S.quer ? 0.35 : 0,
  };
}
