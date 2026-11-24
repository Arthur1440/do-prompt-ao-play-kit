import type { Estado } from "./three/mundo";
import type { Dir, V3 } from "./three/kit";
import type { PoseDir } from "./three/dirigente";
import { clamp, easeInOut, easeOut, lerp, quique } from "./three/rng";

// Roteiro de tomadas preso à narração editada (tempos em s; ver fala.json).
export const FIM_FALA = 72.1; // depois disso: o quadro 0 (loop)
export const CONGELA = [60.42, 61.29] as const; // pausa antes da virada: imagem parada

const r = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ri = (t: number, a: number, b: number) => easeInOut(r(t, a, b));
const L3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const cam = (t: number, a: number, b: number, p0: V3, p1: V3, a0: V3, a1: V3, fov = 30) => {
  const u = ri(t, a, b);
  return { pos: L3(p0, p1, u), alvo: L3(a0, a1, u), fov };
};

// tábua da prancheta (para enquadrar a folha): centro e normal
const PR = { y: 0.94, z: -0.35, ang: -0.36 };
const naTabua = (x: number, y: number, d: number, dy = 0): { pos: V3; alvo: V3 } => {
  const c = Math.cos(-PR.ang), s = Math.sin(-PR.ang);
  const alvo: V3 = [x, PR.y + y * c, PR.z - y * s];
  return { pos: [x, alvo[1] + s * d + dy, alvo[2] + c * d], alvo };
};

export function estado(t0: number, dir: Dir): Estado {
  let t = t0;
  if (t >= CONGELA[0] && t < CONGELA[1]) t = CONGELA[0];
  // ================= GANCHO (0 – 3,45)
  if (t < 3.45) {
    const v = easeOut(clamp(t / 0.55));
    const hop = Math.sin(Math.PI * clamp(t / 0.5)) * 0.07;
    const sq = 1 + Math.sin(Math.PI * clamp((t - 0.45) / 0.25)) * -0.06 * (t > 0.45 ? 1 : 0);
    const push = clamp(t / 3.3);
    return {
      set: "estadio",
      cam: { pos: [0.12, lerp(2.15, 2.0, push), lerp(5.6, 5.1, push)], alvo: [0, 0.98, 0] },
      foco: 0.36,
      raposa: {
        pos: [0, 0, 0],
        rotY: lerp(-1.25, -0.22, v),
        pulo: hop,
        sq,
        cab: [0.02, lerp(-0.4, 0.1, v), 0.14 * v],
        palp: 0.24,
        olhar: [lerp(-1, 0, v), 0.2],
        bE: { abre: 0.28, frente: 0.1, cot: 0.4 },
        bD: { abre: 0.25, frente: 0.0, cot: 0.2 },
      },
      p: { acende: clamp(t / 0.35 + 0.35) },
    };
  }
  // ================= ANOS 40: prancheta (3,45 – 8,5)
  if (t < 5.25) {
    const a = naTabua(0, 0.62, 2.9, 0.12), b = naTabua(0.02, 0.62, 2.45, 0.1);
    return { set: "prancheta", cam: cam(t, 3.45, 5.25, a.pos, b.pos, a.alvo, b.alvo), foco: 0.5, p: { desenho: lerp(0.12, 0.62, r(t, 3.5, 5.25)), mao: 1 } };
  }
  if (t < 6.05) {
    // foto do Mangabeira presa no canto da tábua
    const a = naTabua(-0.25, 0.98, 1.45), b = naTabua(-0.25, 0.98, 1.2);
    return { set: "prancheta", cam: cam(t, 5.25, 6.05, a.pos, b.pos, a.alvo, b.alvo), foco: 0.52, p: { desenho: lerp(0.62, 0.7, r(t, 5.25, 6.05)), mao: 1 } };
  }
  if (t < 8.5) {
    // a folha com os 3 mascotes inteira por 1,4 s, depois a câmera vai direto para a Rapôsa
    const a = naTabua(0, 0.68, 3.55), b = naTabua(0.3, 0.7, 1.15);
    return { set: "prancheta", cam: cam(t, 7.45, 8.15, a.pos, b.pos, a.alvo, b.alvo), foco: 0.5, p: { folhaM: 1, desenho: 1, mao: 0 } };
  }
  // ================= PRENSA: Folha de Minas (8,5 – 10,45)
  if (t < 10.45) {
    return {
      set: "prensa",
      cam: cam(t, 8.5, 9.6, [1.3, 1.9, 2.6], [0.0, 3.9, 2.45], [0, 1.0, -0.2], [0, 0.9, 0.78]),
      foco: lerp(0.5, 0.62, r(t, 9.0, 9.6)),
      p: { sai: r(t, 8.5, 9.3), tilt: lerp(1, 0.45, r(t, 9.0, 9.6)) },
    };
  }
  // ================= DIRETORIA: o presidente (10,45 – 20,25)
  if (t < 20.25) return diretoria(t);
  // ================= "nem se chamava Cruzeiro": blocos (20,25 – 24,62)
  if (t < 24.62) {
    const fase2 = t >= 22.4;
    const surpresa = r(t, 23.4, 23.65);
    return {
      set: "estadio",
      cam: fase2 ? cam(t, 22.4, 24.6, [0.25, 1.15, 3.6], [0.2, 1.1, 3.3], [0, 1.2, -0.6], [0, 1.15, -0.6]) : cam(t, 20.25, 22.4, [0.25, 1.05, 4.6], [0.2, 1.0, 4.3], [0, 1.15, -0.4], [0, 1.15, -0.4]),
      foco: fase2 ? 0.45 : 0.42,
      raposa: {
        pos: [0, 0, 0.1],
        rotY: fase2 ? lerp(0, 0.5, ri(t, 22.45, 22.9)) : 0,
        olhar: fase2 ? [0.6, 1] : [0, 0],
        cab: [0.05, fase2 ? 0 : 0.1, fase2 ? 0 : 0.12],
        palp: surpresa > 0 ? 0 : 0.2,
        pulo: Math.sin(Math.PI * surpresa) * 0.1,
        bE: { abre: 0.3 + surpresa * 0.9, frente: 0.1, cot: 0.4 },
        bD: { abre: 0.3 + surpresa * 0.9, frente: 0.1, cot: 0.4 },
      },
      p: { blocos: r(t, 23.35, 24.0), balanca: r(t, 22.66, 22.95) * (1 - r(t, 23.3, 23.4)) },
    };
  }
  // ================= 1921: rua de BH, placa PALESTRA ITÁLIA (24,62 – 29,75)
  if (t < 27.4) {
    return { set: "rua", cam: cam(t, 24.62, 27.4, [-3.6, 2.4, 19.5], [-2.3, 2.6, 18.0], [-0.3, 2.7, 0], [0, 2.8, 0]), foco: 0.5, p: { frio: 0, placaY: 6, carimboY: 6 } };
  }
  if (t < 29.75) {
    const cai = r(t, 28.55, 29.1);
    const q = cai < 1 ? lerp(6, 0, easeInOut(cai) ** 1.6) : -Math.sin(r(t, 29.1, 29.4) * Math.PI) * 0.12 * (1 - r(t, 29.1, 29.5));
    return { set: "rua", cam: cam(t, 27.4, 29.75, [0.9, 2.2, 14.0], [0.45, 2.4, 12.2], [0, 3.0, 0], [0, 3.1, 0]), foco: 0.55, p: { frio: 0, placaY: q, carimboY: 6 } };
  }
  // ================= foto de 1922 em sépia; as camisas ganham o verde (29,75 – 31,42)
  if (t < 31.42) {
    return { set: "documento", cam: cam(t, 29.75, 31.42, [0, 3.5, 1.5], [0.02, 2.9, 1.2], [0, 0, 0.08], [0, 0, 0.06]), foco: 0.5, p: { doc: 0, verde: ri(t, 30.38, 30.95), giro: 0.04, tilt: 0.4 } };
  }
  // ================= 2ª Guerra: luz fria, DECRETO desce (31,42 – 35,8)
  if (t < 35.8) {
    const fase2 = t >= 33.9;
    return {
      set: "rua",
      cam: fase2 ? cam(t, 33.9, 35.8, [0.2, 3.3, 9.6], [0.1, 3.5, 9.0], [0, 4.0, 0], [0, 4.1, 0]) : cam(t, 31.42, 33.9, [1.6, 2.4, 12.0], [0.8, 2.6, 11.2], [0, 3.3, 0], [0, 3.5, 0]),
      foco: fase2 ? 0.6 : 0.55,
      p: { frio: ri(t, 31.42, 32.3), decreto: easeOut(r(t, 32.45, 33.25)), carimboY: 6 },
    };
  }
  // ================= 1942: carimbo PROIBIDO e a placa vira CRUZEIRO (35,8 – 39,75)
  if (t < 39.75) {
    const bate = 37.6;
    const cy = t < bate ? lerp(3, 0, easeInOut(r(t, bate - 0.45, bate))) : lerp(0, 3.4, easeOut(r(t, bate + 0.12, bate + 0.7)));
    const fase2 = t >= 37.9;
    return {
      set: "rua",
      cam: fase2 ? cam(t, 37.9, 39.75, [0.3, 2.6, 8.4], [0.2, 2.7, 7.6], [0, 3.15, 0], [0, 3.15, 0]) : cam(t, 35.8, 37.9, [-0.4, 2.3, 10.4], [0.2, 2.3, 9.6], [0, 3.25, 0], [0, 3.2, 0]),
      foco: 0.56,
      p: { frio: 1, decreto: 1 - easeInOut(r(t, 35.8, 36.3)), carimbo: t >= bate ? 1 : 0, carimboY: t < 36.9 ? 6 : cy, vira: ri(t, 38.34, 39.32) },
    };
  }
  // ================= mapa celeste de 1602 (39,75 – 41,35)
  if (t < 40.9) {
    return { set: "documento", cam: cam(t, 39.75, 40.9, [0, 3.3, 1.4], [0.1, 1.6, 0.55], [0, 0, 0], [0.1, 0, -0.08]), foco: 0.5, p: { doc: 1, giro: -0.03, tilt: 0.45 } };
  }
  // ================= Cruzeiro do Sul, camisa verde → azul, 5 estrelas no peito (41,35 – 46,9)
  if (t < 46.9) return ceu(t);
  // ================= 2003: a Rapôsa sai do papel (46,9 – 49,8)
  if (t < 49.8) {
    const sai = r(t, 48.95, 49.45);
    const vis = t >= 48.95;
    return {
      set: "estadio",
      cam: cam(t, 46.9, 49.8, [0.2, 1.55, 4.6], [0.1, 1.35, 3.9], [0, 0.72, -0.3], [0, 0.9, -0.2]),
      foco: 0.42,
      raposa: {
        vis,
        pos: [0, 0, lerp(-0.3, 0.15, easeOut(sai))],
        esc: Math.max(0.01, lerp(0.35, 1, easeOut(sai))),
        pulo: Math.sin(Math.PI * sai) * 0.35,
        sq: 1 + Math.sin(Math.PI * r(t, 49.4, 49.65)) * -0.1,
        palp: 0.15,
        bE: { abre: 1.2, frente: 0.2, cot: 0.3 },
        bD: { abre: 1.2, frente: 0.2, cot: 0.3 },
      },
      p: { cartao: r(t, 49.0, 49.6), acende: 1 },
    };
  }
  // ================= Raposão, 4 × 0, Tríplice Coroa (49,8 – 54,32)
  if (t < 51.25) {
    // foto oficial da estreia do Raposão sobre a mesa, a câmera aproxima devagar
    return { set: "documento", cam: cam(t, 49.8, 51.25, [0.05, 5.2, 1.95], [0.0, 4.55, 1.7], [0, 0, 0.32], [0, 0, 0.3]), foco: 0.6, p: { doc: 2, giro: -0.035, tilt: 0.4 } };
  }
  if (t < 51.25) {
    const pulo = Math.abs(Math.sin((t - 49.8) * 6.5)) * 0.18;
    return {
      set: "estadio",
      cam: cam(t, 49.8, 51.25, [0.6, 0.75, 4.9], [0.4, 0.8, 4.4], [0, 1.05, 0], [0, 1.05, 0]),
      foco: 0.42,
      raposa: { pos: [0, 0, 0], esc: 1.12, pulo, sq: 1 + (pulo < 0.03 ? -0.05 : 0.03), palp: 0.1, bE: { abre: 2.5, frente: 0.1, cot: 0.2 }, bD: { abre: 2.5, frente: 0.1, cot: 0.2 }, cab: [-0.15, 0, 0] },
      p: { confete: t - 49.8 },
    };
  }
  if (t < 52.7) {
    return {
      set: "estadio",
      cam: cam(t, 51.25, 52.7, [0.9, 0.85, 1.6], [0.75, 0.8, 1.0], [-0.15, 0.3, -2.6], [-0.2, 0.32, -2.7]),
      foco: 0.48,
      raposa: { pos: [-1.0, 0, -1.3], rotY: 0.6, esc: 1.12, bE: { abre: 2.4, frente: 0, cot: 0.2 }, bD: { abre: 2.4, frente: 0, cot: 0.2 }, pulo: t > 51.7 ? Math.abs(Math.sin((t - 51.7) * 7)) * 0.15 : 0 },
      p: { gol: r(t, 51.2, 51.62) + (t > 51.62 ? r(t, 51.62, 52.3) * 0.6 : 0), acende: 1 },
    };
  }
  if (t < 54.32) {
    const pulo = Math.abs(Math.sin((t - 52.7) * 6)) * 0.14;
    return {
      set: "estadio",
      cam: cam(t, 52.7, 54.32, [-0.3, 1.25, 4.6], [-0.1, 1.15, 4.0], [0, 0.95, 0], [0, 0.95, 0]),
      foco: 0.4,
      raposa: { pos: [0, 0, 0], esc: 1.12, pulo, palp: 0.1, bE: { abre: 2.6, frente: 0.2, cot: 0.15 }, bD: { abre: 2.6, frente: 0.2, cot: 0.15 }, cab: [-0.12, 0.1, 0.1] },
      p: { confete: t - 50.6 },
    };
  }
  // ================= "Eu sou cruzeirense": bate no peito (54,32 – 56,05)
  if (t < 56.05) {
    const b1 = Math.exp(-Math.max(0, t - 54.8) * 9) * (t > 54.8 ? 1 : 0), b2 = Math.exp(-Math.max(0, t - 55.25) * 9) * (t > 55.25 ? 1 : 0);
    const bate = clamp(b1 + b2);
    return {
      set: "estadio",
      cam: cam(t, 54.32, 56.05, [0.15, 1.2, 2.9], [0.1, 1.15, 2.5], [0, 0.98, 0], [0, 0.98, 0]),
      foco: 0.45,
      raposa: {
        pos: [0, 0, 0],
        palp: 0.18,
        cab: [-0.05, 0, 0.08],
        bD: { abre: 0.35, frente: 1.25 - bate * 0.1, cot: 2.05 - bate * 0.25 },
        bE: { abre: 0.3, frente: 0.1, cot: 0.3 },
        sq: 1 - bate * 0.04,
        brilho: clamp(r(t, 54.8, 55.0) * 1.2 - r(t, 55.6, 56.0) * 0.4),
      },
      p: { acende: 1 },
    };
  }
  // ================= marca aquele amigo (56,05 – 61,29; congela em 60,42)
  if (t < 61.29) {
    return {
      set: "estadio",
      cam: cam(t, 56.05, 60.42, [0.1, 0.95, 3.7], [0.0, 0.92, 3.4], [0, 0.48, 0], [0, 0.5, 0]),
      foco: 0.72,
      raposa: { pos: [0, 0, 0], rotY: 0.15, palp: 0.25, cab: [0.05, 0, 0.1], bD: { abre: 0.2, frente: 1.45, cot: 0.25 }, bE: { abre: 0.3, frente: 0, cot: 0.4 }, brilho: 0.25 },
      p: { acende: 1 },
    };
  }
  // ================= VIRADA (61,29 – 64,2) e telas de IA (64,2 – 72,1)
  if (t < FIM_FALA) {
    const vir = t < 64.2;
    return {
      set: "virada",
      cam: vir ? cam(t, 61.29, 64.2, [0.6, 0.9, 6.3], [0.3, 0.95, 5.6], [0, 0.55, 0], [0, 0.6, 0]) : { pos: [0, 1.4, 7], alvo: [0, 0.6, 0] },
      raposa: { pos: [0, 0, 0], rotY: 0.15, palp: 0.25, bD: { abre: 0.2, frente: 1.45, cot: 0.25 }, bE: { abre: 0.3, frente: 0, cot: 0.4 } },
      p: { dissolve: vir ? r(t, 61.6, 63.9) : 1, arame: vir ? 1 : 0 },
    };
  }
  // ================= loop: o quadro 0
  return estado(0, dir);
}

// ---------------------------------------------------------------------------
function diretoria(t: number): Estado {
  const P0: V3 = [0, 0, -0.95];
  const base: Estado = { set: "diretoria", cam: { pos: [0, 1.3, 3], alvo: [0, 1, -0.6] }, foco: 0.5 };
  const rivais: PoseDir[] = [{ vis: false }, { vis: false }];
  let pres: PoseDir;
  let assina = 0, porta = 0;
  if (t < 13.6) {
    const ab = ri(t, 10.6, 11.2);
    pres = { pos: P0, bE: { abre: lerp(0.2, 0.9, ab), frente: 0.3, cot: 0.5 }, bD: { abre: lerp(0.2, 0.9, ab), frente: 0.3, cot: 0.5 }, cab: [0, 0, Math.sin(t * 2) * 0.04] };
    base.cam = cam(t, 10.45, 13.6, [0.5, 1.5, 3.0], [0.25, 1.45, 2.5], [0, 1.12, -0.8], [0, 1.12, -0.85]);
    base.foco = 0.55;
  } else if (t < 16.5) {
    assina = ri(t, 15.35, 16.4);
    const esc = Math.sin(t * 18) * 0.04 * (assina > 0 && assina < 1 ? 1 : 0);
    pres = { pos: P0, inclina: 0.32, cab: [0.35, 0, 0], bD: { abre: 0.1, frente: 1.25 + esc, cot: 0.75 }, bE: { abre: 0.2, frente: 0.8, cot: 1.0 } };
    base.cam = cam(t, 13.6, 16.5, [0.95, 1.4, 1.05], [0.8, 1.32, 0.8], [0, 0.88, -0.38], [0, 0.86, -0.36]);
    base.foco = 0.45;
  } else if (t < 17.95) {
    assina = 1;
    porta = ri(t, 16.5, 16.75);
    const u = r(t, 16.6, 17.55);
    rivais[0] = u > 0 ? { pos: L3([1.45, 0, -1.95], [0.95, 0, -1.25], easeOut(u)), rotY: -0.5, corre: u < 1 ? t * 16 : undefined, boca: u >= 1 ? "O" : "sorri", sobr: u >= 1 ? 1 : 0 } : { vis: false };
    const u2 = r(t, 16.8, 17.7);
    rivais[1] = u2 > 0 ? { pos: L3([1.45, 0, -1.95], [1.5, 0, -1.4], easeOut(u2)), rotY: -0.7, corre: u2 < 1 ? t * 16 + 1 : undefined, boca: u2 >= 1 ? "O" : "sorri", sobr: u2 >= 1 ? 1 : 0 } : { vis: false };
    pres = { pos: P0, rotY: 0.25, bE: { abre: 0.2, frente: 1.9, cot: 0.4 }, bD: { abre: 0.2, frente: 0.2, cot: 0.3 }, pisca: Math.sin(Math.PI * r(t, 17.4, 17.75)) };
    base.cam = cam(t, 16.5, 17.95, [-0.9, 1.65, 4.3], [-0.7, 1.6, 4.0], [0.45, 0.9, -1.0], [0.45, 0.9, -1.0]);
    base.foco = 0.48;
  } else {
    assina = 1;
    porta = 1;
    const g = r(t, 18.85, 19.3);
    const v = g < 0.5;
    rivais[0] = { pos: [0.95, 0, -1.25], rotY: -0.5, boca: "O", sobr: 1 };
    rivais[1] = { pos: [1.5, 0, -1.4], rotY: -0.7, boca: "O", sobr: 1 };
    pres = v
      ? { pos: P0, pisca: Math.sin(Math.PI * r(t, 18.3, 18.7)), giro: easeInOut(g * 2) * Math.PI * 2, esc: 1 - easeInOut(g * 2) * 0.9, bE: { abre: 0.2, frente: 0.3, cot: 0.5 }, bD: { abre: 0.2, frente: 0.3, cot: 0.5 } }
      : { vis: false };
    base.cam = cam(t, 17.95, 20.25, [0.1, 1.3, 2.6], [0.05, 1.25, 2.2], [0.1, 1.0, -0.9], [0, 1.02, -0.9]);
    base.foco = 0.5;
    if (!v) {
      const k = easeOut(clamp((g - 0.5) * 2));
      const tira = r(t, 19.95, 20.25);
      base.raposa = {
        pos: P0,
        rotY: (1 - k) * Math.PI * 2,
        esc: Math.max(0.05, k),
        palp: 0.3,
        cab: [0, 0.1, 0.1],
        chapeu: 1 - tira,
        bD: { abre: 0.3 + tira * 0.2, frente: 0.6 + tira * 1.6, cot: 1.0 + tira * 0.6 },
        bE: { abre: 0.3, frente: 0.3, cot: 0.4 },
      };
    }
  }
  base.pres = pres;
  base.rivais = rivais;
  base.p = { assina, porta };
  return base;
}

function ceu(t: number): Estado {
  const voo = r(t, 44.5, 46.5);
  const estrelas = [0, 1, 2, 3, 4].map((i) => {
    const u = voo * 2.2 - i * 0.3;
    return u < 1 ? 0 : quique(clamp((u - 1) / 0.25));
  });
  const camisa = ri(t, 43.35, 43.8);
  const raposa = {
    pos: [0, 0, 0] as V3,
    cab: [t < 44.45 ? -0.35 : 0.3, 0, -0.06] as V3,
    palp: 0.08,
    olhar: [0, t < 44.45 ? 1 : -1] as [number, number],
    bE: { abre: 0.55, frente: 0.15, cot: 0.5 },
    bD: { abre: 0.55, frente: 0.15, cot: 0.5 },
    camisa,
    estrelas,
    brilho: 0.5 + 0.5 * Math.sin(Math.PI * r(t, 43.35, 43.9)),
  };
  if (t < 42.75) {
    return { set: "ceu", cam: cam(t, 40.9, 42.75, [0, 1.0, 4.6], [0, 1.05, 4.3], [0.2, 2.25, -3.5], [0.2, 2.1, -3.5]), foco: 0.62, raposa, p: { acende: r(t, 40.95, 41.4), linhas: r(t, 41.2, 41.9), voo: 0 } };
  }
  if (t < 44.45) {
    return { set: "ceu", cam: cam(t, 42.75, 44.45, [0.25, 1.15, 3.1], [0.1, 1.1, 2.7], [0, 0.85, -0.5], [0, 0.85, -0.5]), foco: 0.45, raposa, p: { acende: 1, linhas: 1, voo: 0 } };
  }
  return { set: "ceu", cam: cam(t, 44.45, 46.6, [0, 1.15, 4.4], [0, 1.15, 3.9], [0.1, 1.9, -2.0], [0, 1.0, -0.8]), foco: lerp(0.62, 0.42, ri(t, 44.45, 46.3)), raposa, p: { acende: 1, linhas: 1, voo } };
}
