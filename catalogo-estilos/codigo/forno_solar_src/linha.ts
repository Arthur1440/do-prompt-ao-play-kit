// Linha do tempo do reel (direção C): plano 3D, câmera e estado do forno, tudo preso às palavras da narração editada.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Cam } from "./three/mundo";
import type { EstadoForno } from "./three/forno";

export const A = (i: number) => PALAVRAS[i].a;
export const B = (i: number) => PALAVRAS[i].b;
export const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
export const ei = (x: number) => Math.pow(c01(x), 3);

export const FPS = 30;
export const QUADROS = Math.round(DURACAO * FPS); // 2310
export const T_ULTIMO = (QUADROS - 1) / FPS; // o último quadro repete o primeiro

// cortes (s)
export const S = {
  mangueira: 1.95, mesa: 2.95, planta: 7.25, abre: 11.4, tinta: 15.85, isopor: 18.65, vidro: 21.4, corte: 23.35,
  espelho: 25.45, mergulho: 28.45, conta: 29.95, pizzas: 34.95, envio: 37.6, serviu: 41.6, custo: 42.5,
  sucata: 48.05, balanca: 50.62, nuvem: 51.95, relogios: 54.2, sergipe: 57.45, cozinha: 59.6, virada: 65.6,
  rosto: 68.1, prompt: 69.6, play: 70.95, volta: 76.4,
};

const lc = (a: Cam, b: Cam, x: number): Cam => {
  const e = eio(x);
  const L = (p?: number, q?: number) => (p ?? 0) + ((q ?? 0) - (p ?? 0)) * e;
  return {
    az: L(a.az, b.az), el: L(a.el, b.el), dist: L(a.dist, b.dist), fov: L(a.fov ?? 30, b.fov ?? 30),
    ax: L(a.ax, b.ax), ay: L(a.ay, b.ay), az2: L(a.az2, b.az2), abert: L(a.abert ?? 2.5, b.abert ?? 2.5),
  };
};

/** estado do forno em t (uma história só, contínua entre os planos) */
export function fornoEm(t: number): EstadoForno {
  const aceso = t < 27.8 ? 0 : t < 28.3 ? eio(k01(t, 27.8, 28.3)) : t < 35 ? 1 : 0.55;
  const tampa = t >= 34.85 && t < 36.05 ? (t < 35.15 ? eio(k01(t, 34.85, 35.15)) : t < 35.75 ? 1 : 1 - eio(k01(t, 35.75, 36.05))) : t >= 41.45 && t < 42.6 ? eio(k01(t, 41.45, 41.65)) : 0;
  const comPizza = (t >= 35.1 && t < 42.6) || (t >= S.nuvem && t < S.relogios + 3.3);
  return {
    pe: t < 6.35 ? 1 : 1 - eio(k01(t, 6.35, 6.95)),
    junta: eio(k01(t, 14.15, 14.75)),
    abre: eio(k01(t, 12.95, 13.35)),
    pecas: k01(t, 13.05, 13.95),
    pizzaMesa: t < S.abre ? k01(t, 3.05, 3.45) : 0,
    rebites: t < 15.5 ? 6 * k01(t, 14.85, 15.42) : 6 + 3 * k01(t, 15.5, 15.84), // os 3 últimos estalam no vão depois de "outro"
    rolo: t > 16.3 && t < 17.65 ? k01(t, 16.3, 17.65) : 0,
    pintura: k01(t, 16.3, 17.65),
    isopor: k01(t, 19.45, 20.75),
    vidro: k01(t, 22.3, 23.05),
    raios: t < 23.45 ? 0 : 1.3 * k01(t, 23.45, 24.3),
    calor: k01(t, 24.3, 25.0) * (t > S.virada ? 0 : 1),
    espelho: k01(t, 26.25, 27.0),
    raiosEsp: 1.3 * k01(t, 26.95, 27.75),
    aceso,
    tampaAberta: tampa,
    pizzas: comPizza ? (t < 35.8 ? k01(t, 35.15, 35.8) : 1) : 0,
    asado: t >= S.nuvem ? 0.55 : k01(t, 35.9, 37.35),
    embacado: t >= S.nuvem ? 0.6 : 0.75 * k01(t, 36.0, 37.0),
    pizzaSai: t >= S.serviu && t < 42.6 ? eio(k01(t, 41.62, 42.15)) : 0,
    fatia: t >= S.serviu && t < 42.6 ? k01(t, 41.95, 42.5) : 0,
  };
}

/** vista de cima da planta (o eixo x do forno fica na vertical da tela) */
export const camPlanta = (p: number): Cam => ({ az: 90, el: 89.8, dist: 4.3 - p * 0.15, fov: 30, ax: 0.12, abert: 2 });

export function estadoEm(t0: number): Estado {
  let t = t0;
  // volta do loop: o último quadro é o quadro 0
  if (t >= S.volta) {
    const tv = t - T_ULTIMO; // <= 0
    return { plano: "gancho", p: tv / S.mangueira, t: tv, k: 0.4 + tv * 1.2, f: { pe: 1, abre: 0, pecas: 0, pizzaMesa: 0 } };
  }
  const f = fornoEm(t);
  if (t < S.mangueira) return { plano: "gancho", p: t / S.mangueira, t, k: 0.4 + t * 1.2, f: { ...f, pizzaMesa: 0 } };
  if (t < S.mesa) return { plano: "mangueira", p: k01(t, S.mangueira, S.mesa), t, k: eio(k01(t, 2.1, 2.5)), k2: 0.4 + t * 1.2, f: { ...f, pizzaMesa: 0 } };
  if (t < S.planta) {
    const p = k01(t, S.mesa, S.planta);
    const c1: Cam = { az: 16, el: 12, dist: 4.1, fov: 24, ay: 0.02, abert: 3 };
    const c2: Cam = { az: 26, el: 17, dist: 3.4, fov: 24, ay: -0.04, abert: 3 };
    const c3: Cam = { az: 60, el: 70, dist: 3.2, fov: 28, ay: 0.0, abert: 2 };
    const cam = t < 6.95 ? lc(c1, c2, k01(t, S.mesa, 6.95)) : lc(c2, c3, k01(t, 6.95, S.planta + 0.35));
    return { plano: "mesa", p, t, cam, f, k: eio(k01(t, 3.95, 4.75)), k2: eio(k01(t, 3.85, 4.1)), poeira: t > 6.9 ? k01(t, 6.92, 8.2) : 0 };
  }
  if (t < S.abre) {
    // vista de cima (vira a planta desenhada em linhas): eixo x do forno na vertical da tela
    const p = k01(t, S.planta, S.abre);
    const ent = k01(t, S.planta, S.planta + 0.35);
    const c3: Cam = { az: 60, el: 70, dist: 3.2, fov: 28, abert: 2 };
    const c4 = camPlanta(p);
    return { plano: "orbita", p, t, cam: ent < 1 ? lc(c3, c4, ent) : c4, f, desf: 0.55 * eio(k01(t, 7.5, 8.2)), escuro: 0.42 * eio(k01(t, 7.4, 8.0)) };
  }
  if (t < S.tinta) {
    const p = k01(t, S.abre, S.tinta);
    return { plano: "orbita", p, t, f, cam: lc({ az: 34, el: 26, dist: 5.6, fov: 24, ay: -0.12, abert: 4 }, { az: 44, el: 30, dist: 4.8, fov: 24, ay: -0.12, abert: 4 }, p) };
  }
  if (t < S.isopor) {
    const p = k01(t, S.tinta, S.isopor);
    return { plano: "orbita", p, t, f, cam: lc({ az: 6, el: 52, dist: 4.4, fov: 24, ay: -0.1, az2: 0.18, abert: 3 }, { az: 16, el: 48, dist: 4.1, fov: 24, ay: -0.1, az2: 0.18, abert: 3 }, p) };
  }
  if (t < S.vidro) {
    const p = k01(t, S.isopor, S.vidro);
    return { plano: "orbita", p, t, f, cam: lc({ az: 62, el: 26, dist: 5.0, fov: 24, ay: -0.12, abert: 4 }, { az: 48, el: 30, dist: 4.7, fov: 24, ay: -0.12, abert: 4 }, p) };
  }
  if (t < S.corte) {
    const p = k01(t, S.vidro, S.corte);
    return { plano: "orbita", p, t, f, cam: lc({ az: 18, el: 30, dist: 4.8, fov: 24, ay: -0.04, abert: 4 }, { az: 10, el: 27, dist: 4.4, fov: 24, ay: -0.04, abert: 4 }, p) };
  }
  if (t < S.espelho) {
    // corte em X: a metade da frente some; luz amarela entra, calor laranja preso
    const p = k01(t, S.corte, S.espelho);
    return { plano: "orbita", p, t, f: { ...f, corte: true }, cam: lc({ az: 0, el: 13, dist: 2.9, fov: 28, ay: 0.02, abert: 2 }, { az: 4, el: 15, dist: 2.7, fov: 28, ay: 0.02, abert: 2 }, p) };
  }
  if (t < S.mergulho) {
    const p = k01(t, S.espelho, S.mergulho);
    return { plano: "orbita", p, t, f, k2: 0.5 * eio(k01(t, 26.9, 27.6)), cam: lc({ az: 46, el: 16, dist: 6.6, fov: 22, ay: 0.12, abert: 5 }, { az: 26, el: 20, dist: 5.9, fov: 22, ay: 0.1, abert: 5 }, p) };
  }
  if (t < S.conta) {
    // mergulho pelo vidro até virar o fundo da conta
    const p = k01(t, S.mergulho, S.conta);
    return { plano: "orbita", p, t, f, k2: 0.5, cam: lc({ az: 26, el: 20, dist: 5.6, fov: 22, ay: 0.2, abert: 5 }, { az: 8, el: 62, dist: 1.4, fov: 30, ay: 0.05, abert: 3 }, ei(p)), desf: eio(k01(t, 29.3, 29.95)), escuro: 0.45 * eio(k01(t, 29.4, 29.95)) };
  }
  if (t < S.pizzas) {
    const p = k01(t, S.conta, S.pizzas);
    // fundo da conta: o forno VAZIO aceso, desfocado, câmera girando devagar
    return { plano: "orbita", p, t, f, k2: 0.5, cam: { az: 20 + p * 14, el: 26, dist: 4.6, fov: 24, ay: 0.12, abert: 4 }, desf: t < 31.95 ? 1 : 1 - 0.35 * eio(k01(t, 31.95, 32.4)), escuro: t < 31.95 ? 0.45 : 0.3 };
  }
  if (t < S.envio) {
    const p = k01(t, S.pizzas, S.envio);
    return { plano: "orbita", p, t, f, cam: lc({ az: 14, el: 40, dist: 3.0, fov: 26, ay: -0.06, abert: 3 }, { az: 22, el: 36, dist: 2.8, fov: 26, ay: -0.06, abert: 3 }, p) };
  }
  if (t < S.serviu) {
    const p = k01(t, S.envio, S.serviu);
    return { plano: "orbita", p, t, f, k2: 0.4, cam: { az: 30 + p * 10, el: 24, dist: 4.4, fov: 24, ay: 0.1, abert: 4 }, desf: 0.8, escuro: 0.25 };
  }
  if (t < S.custo) {
    const p = k01(t, S.serviu, S.custo);
    return { plano: "orbita", p, t, f, cam: lc({ az: 6, el: 22, dist: 2.5, fov: 24, ax: -0.1, ay: 0.16, az2: 0.4, abert: 3 }, { az: 12, el: 20, dist: 2.25, fov: 24, ax: -0.12, ay: 0.2, az2: 0.42, abert: 3 }, p) };
  }
  if (t < S.sucata) {
    const p = k01(t, S.custo, S.sucata);
    return { plano: "orbita", p, t, f, k2: 0.4, cam: { az: -10 + p * 20, el: 24, dist: 4.8, fov: 24, ay: 0.1, abert: 4 }, desf: 0.95, escuro: 0.42 };
  }
  if (t < S.balanca) {
    // os gabinetes e o vidro aparecem nítidos para levar o carimbo "sucata"
    const p = k01(t, S.sucata, S.balanca);
    return { plano: "orbita", p, t, f, cam: { az: 6 + p * 6, el: 24, dist: 3.9, fov: 24, ay: -0.04, abert: 3 }, desf: 0.95 * (1 - eio(k01(t, S.sucata, S.sucata + 0.3))), escuro: 0.15 };
  }
  if (t < S.nuvem) {
    const p = k01(t, S.balanca, S.nuvem);
    return { plano: "orbita", p, t, f, cam: { az: 12 + p * 6, el: 24, dist: 3.8, fov: 24, ay: 0.06, abert: 4 }, desf: 0.95, escuro: 0.42 };
  }
  if (t < S.relogios) {
    const p = k01(t, S.nuvem, S.relogios);
    return { plano: "orbita", p, t, f, k2: 0.35, nuvem: k01(t, 52.2, 54.1), cam: lc({ az: 30, el: 18, dist: 6.6, fov: 22, ay: 0.1, abert: 5 }, { az: 22, el: 20, dist: 6.0, fov: 22, ay: 0.08, abert: 5 }, p) };
  }
  if (t < S.sergipe) {
    const p = k01(t, S.relogios, S.sergipe);
    return { plano: "orbita", p, t, f, k2: 0.35, cam: { az: 22 - p * 12, el: 18, dist: 5.4, fov: 22, ay: 0.2, abert: 5 }, desf: 0.95, escuro: 0.45 };
  }
  if (t < S.cozinha) {
    const p = k01(t, S.sergipe, S.cozinha);
    return { plano: "cozinha", p, t, cam: { az: -30 + p * 6, el: 24, dist: 9.5, fov: 32, abert: 4 }, desf: 1 - eio(k01(t, 59.2, 59.6)), escuro: 0.5 * (1 - eio(k01(t, 59.2, 59.6))) };
  }
  if (t < S.virada) {
    const p = k01(t, S.cozinha, S.virada);
    return { plano: "cozinha", p, t, cam: lc({ az: -24, el: 20, dist: 9.0, fov: 32, ay: -0.2, abert: 4 }, { az: 16, el: 26, dist: 8.0, fov: 32, ay: -0.3, abert: 4 }, p), escuro: 0.12 * eio(k01(t, 62.0, 62.5)) };
  }
  if (t >= S.play) return { plano: "nada", p: 0, t };
  // virada: o forno congela (tempo parado em S.virada) e vira arame + partículas
  const tc = S.virada + Math.max(0, t - S.virada) * 0.05;
  const fv: EstadoForno = { ...fornoEm(28.6), calor: 0.9, raios: 1.3, raiosEsp: 1.3, aceso: 1 };
  const v = eio(k01(t, A(186) - 0.05, B(191)));
  const d = k01(t, B(191) - 0.1, S.prompt + 0.6);
  return { plano: "virada", p: k01(t, S.virada, S.prompt), t: tc + d * 3, k: v, k2: d, f: fv, cam: { az: 30 + k01(t, S.virada, S.prompt) * 8, el: 24, dist: 5.6 + d * 0.6, fov: 24, ay: 0.12, abert: 3 }, escuro: t > S.prompt ? 0.4 : 0 };
}
