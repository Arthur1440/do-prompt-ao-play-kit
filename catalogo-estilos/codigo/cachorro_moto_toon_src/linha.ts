// Linha do tempo: cada plano preso ao ÍNDICE das palavras da narração (fala.ts). A imagem segue o verbo.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Cam, V3 } from "./three/mundo";
import { CAMPO0, alturaCampo } from "./three/campo";
import { Q0, S0, RELOGIO } from "./three/cenarios";
import { X_ESQ } from "./three/rua";

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

const L = (a: number, b: number, x: number) => a + (b - a) * x;
const LV = (a: V3, b: V3, x: number): V3 => [L(a[0], b[0], x), L(a[1], b[1], x), L(a[2], b[2], x)];
export const lc = (a: Cam, b: Cam, x: number): Cam => {
  const e = eio(x);
  return { pos: LV(a.pos, b.pos, e), alvo: LV(a.alvo, b.alvo, e), fov: L(a.fov ?? 30, b.fov ?? 30, e), rolo: L(a.rolo ?? 0, b.rolo ?? 0, e), foco: L(a.foco ?? 0.45, b.foco ?? 0.45, e), forca: L(a.forca ?? 0.85, b.forca ?? 0.85, e), larg: L(a.larg ?? 1, b.larg ?? 1, e) };
};
/** tremida de câmera na mão (determinística) */
const treme = (t: number, a: number): V3 => [a * (Math.sin(t * 17.3) * 0.6 + Math.sin(t * 29.1) * 0.4), a * (Math.sin(t * 23.7 + 1) * 0.7 + Math.sin(t * 41.3) * 0.3), a * Math.sin(t * 13.1 + 2) * 0.5];
const soma = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------------------------------ geografia da perseguição
export const V_MOTO = 6.2; // m/s
const Z_MOTO = -1.3, Z_DOG = -0.72;
/** x da moto no tempo t (perseguição do gancho) */
const xMoto = (t: number) => -14 + V_MOTO * t;
/** posição do olho do cachorro em relação à raiz (pose "parado", cabeça reta) */
export const OLHO_DOG: V3 = [0.465, 0.71, 0.046];
export const PEITO_DOG: V3 = [0.36, 0.42, 0.0];

type Plano = { ini: number; f: (t: number) => Estado };
const PLANOS: Plano[] = [];
const plano = (ini: number, f: (t: number) => Estado) => PLANOS.push({ ini, f });

// 1. QUADRO 0 — "Seu cachorro corre atrás de MOTO": o cachorro colado na roda traseira, câmera baixa na altura dele,
//    à frente e ao lado, olhando para trás; a roda e o escapamento passam em primeiro plano.
plano(0, (t) => {
  const xm = xMoto(t), xd = xm - 1.02;
  const k = k01(t, 0, C(6));
  const cam: Cam = {
    pos: soma([xd + L(1.75, 1.45, k), L(0.34, 0.4, k), Z_DOG + L(1.75, 1.55, k)], treme(t, 0.012)),
    alvo: [xd + L(0.15, 0.2, k), 0.5, Z_DOG - 0.25],
    fov: 40, foco: 0.42, forca: 0.7, larg: 1.25,
  };
  return {
    t, cam, cena: "rua", sol: [-2.4, 1.5, 2.2],
    cachorro: { pos: [xd, 0, Z_DOG], anda: "galope", t: t + 0.13, boca: 0.55, estica: 0.6 + 0.4 * Math.sin(t * 16) },
    moto: { pos: [xm, 0, Z_MOTO], v: V_MOTO, fum: 0.5, lean: 0.015 * Math.sin(t * 3) },
    dono: null,
  };
});

// 2. "e você acha graça,": o dono sem rosto no portão, dobrado de rir, apontando a rua (câmera baixa, de baixo para cima)
plano(C(6), (t) => {
  const k = k01(t, C(6), C(10));
  const cam: Cam = { pos: [L(1.6, 1.4, k), 0.45, 2.9], alvo: [-0.75, 1.25, 5.55], fov: L(36, 33, k), foco: 0.6, forca: 0.75, larg: 1.25 };
  // ao fundo (fora de foco), a perseguição seguindo pela rua
  const xm = 6 + V_MOTO * (t - C(6));
  return {
    t, cam, cena: "rua", sol: [-2.4, 1.4, 1.6],
    dono: { pos: [-0.75, 0.15, 5.55], rotY: Math.PI / 2 - 0.55, pose: "ri", t },
    moto: { pos: [xm, 0, Z_MOTO], v: V_MOTO },
    cachorro: { pos: [xm - 1.02, 0, Z_DOG], anda: "galope", t, boca: 0.55 },
    portao: 0.8,
  };
});

// 3. "na cabeça dele...": close do olho (câmera presa ao olho); a moto se afastando aparece refletida na pupila
plano(C(10), (t) => {
  const k = k01(t, C(10), C(13));
  const cam: Cam = { olho: true, pos: [L(0.16, 0.1, k), L(0.02, 0.01, k), L(0.17, 0.11, k)], alvo: [0.0, -0.002, 0.0], fov: 30, foco: 0.5, forca: 0.45, larg: 1.6 };
  return {
    t, cam, cena: "rua", sol: [2.5, 1.6, 2.0],
    cachorro: { pos: [3, 0, Z_DOG], anda: "parado", t },
    moto: { pos: [8.5 + 3 * k, 0, Z_DOG + 0.2], v: V_MOTO, fum: 0.4 },
    olho: 1,
  };
});

// 4. "você acabou de aplaudir uma": as mãos do dono batendo palma (sem rosto: o quadro corta no queixo)
plano(C(13), (t) => {
  const k = k01(t, C(13), C(18));
  const cam: Cam = { pos: [L(0.55, 0.45, k), L(1.05, 1.1, k), 3.65], alvo: [-0.75, 1.6, 5.55], fov: L(40, 37, k), foco: 0.55, forca: 0.7, larg: 1.3 };
  return {
    t, cam, cena: "rua", sol: [-2.0, 1.4, 2.4],
    dono: { pos: [-0.75, 0.15, 5.55], rotY: Math.PI / 2 - 0.25, pose: "palma", t },
    portao: 0.8,
  };
});

// 5. "CAÇADA que ele acha que vence todo dia.": volta de peito estufado, trotando para a câmera; a moto some ao fundo
plano(C(18), (t) => {
  const k = k01(t, C(18), C(26));
  const xd = 12.5 - 1.25 * (t - C(18));
  const cam: Cam = { pos: [xd - L(2.2, 1.7, k), 0.3, Z_DOG + L(0.9, 0.75, k)], alvo: [xd, 0.55, Z_DOG], fov: 36, foco: 0.45, forca: 0.75, larg: 1.25 };
  return {
    t, cam, cena: "rua", sol: [2.6, 1.5, 1.6],
    cachorro: { pos: [xd, 0, Z_DOG], rotY: Math.PI, anda: "trote", t, boca: 0.35, cabecaZ: 0.12, rabo: 1 },
    moto: { pos: [26 + V_MOTO * (t - C(18)), 0, Z_MOTO], v: V_MOTO, fum: 0.6 },
  };
});

// 6. "Na natureza, o LOBO persegue tudo o que corre,": de frente e baixo: o cervo vem na direção da câmera, o lobo colado atrás
plano(C(26), (t) => {
  const tt = t - C(26);
  const v = 8.5;
  const xc = -6 + v * tt, xl = xc - 3.0;
  const zc = -6;
  const y = (x: number, z: number) => alturaCampo(x, z) + CAMPO0.y;
  const P = (x: number, z: number): V3 => [x, y(x, z), z + CAMPO0.z];
  const k = k01(t, C(26), C(35));
  const cam: Cam = { pos: soma(P(xc + L(5.5, 4.0, k), zc + 1.6), soma([0, 0.45, 0], treme(t, 0.015))), alvo: soma(P(xc - 0.4, zc - 0.3), [0, 0.8, 0]), fov: 38, foco: 0.45, forca: 0.8, larg: 1.35 };
  return {
    t, cam, cena: "campo", sol: [-1.0, 0.18, -0.4],
    lobo: { pos: P(xl, zc + 0.25), anda: "galope", t: t * 0.95, estica: 0.5 + 0.5 * Math.sin(t * 15) },
    cervo: { pos: P(xc, zc - 0.3), anda: "galope", t: t * 0.85 + 0.3 },
  };
});

// ------------------------------------------------------------------------------------------ campo: utilidades
const yC = (x: number, z: number) => alturaCampo(x, z) + CAMPO0.y;
const PC = (x: number, z: number): V3 => [x, yC(x, z), z + CAMPO0.z];
/** posição que desacelera até parar em T */
const freia = (x0: number, v: number, T: number, tt: number) => (tt < T ? x0 + v * tt * (1 - tt / (2 * T)) : x0 + (v * T) / 2);

// 7. "e quando o bicho foge para longe,": o lobo freia e para; o cervo some ao longe
plano(C(35), (t) => {
  const tt = t - C(35);
  const xl = freia(4, 8.5, 1.4, tt), xc = 9 + 9 * tt;
  const k = k01(t, C(35), C(42));
  return {
    t, cena: "campo", sol: [1.0, 0.16, -0.5],
    cam: { pos: soma(PC(xl - 2.6, -4.6), [0, 0.55, 0]), alvo: soma(PC(xl + 6, -6.2), [0, L(0.9, 1.3, k), 0]), fov: 34, foco: 0.48, forca: 0.8, larg: 1.3 },
    lobo: { pos: PC(xl, -6), anda: tt < 1.2 ? "galope" : "parado", t },
    cervo: { pos: PC(xc, -6.6), anda: "galope", t: t * 0.85 },
  };
});

// 8. "o bando entende que expulsou o perigo.": a matilha parada no alto do morro, contra o sol
plano(C(42), (t) => {
  const k = k01(t, C(42), C(49));
  const lobos: V3[] = [PC(15.6, -27.4), PC(17.2, -28.6), PC(18.6, -27.2), PC(20.2, -28.2)];
  return {
    t, cena: "campo", sol: [-0.2, 0.12, -1.0],
    cam: { pos: soma(PC(L(13.5, 14.5, k), -16.5), [0, 0.6, 0]), alvo: soma(PC(18, -28), [0, 1.0, 0]), fov: L(30, 27, k), foco: 0.55, forca: 0.6, larg: 1.4 },
    lobos,
    lobo: { pos: PC(17.9, -27.8), rotY: 2.6, anda: "parado", t },
    cervo: { pos: PC(26 + 4 * (t - C(42)), -60), rotY: 0.4, anda: "galope", t },
  };
});

// 9. "Então, dá seis da tarde,": o relógio digital da sala marcando 18:00
plano(C(49), (t) => {
  const k = k01(t, C(49), C(54));
  const r: V3 = [RELOGIO.x, RELOGIO.y, RELOGIO.z];
  return {
    t, cena: "rua", sol: [1.2, 0.35, -2.0], luz: { sol: 0.8, hemi: 0.8, cor: 0xffb070 },
    cam: { pos: soma(r, [L(1.45, 1.05, k), 0.08, L(0.12, 0.05, k)]), alvo: r, fov: 30, foco: 0.5, forca: 0.5, larg: 1.6 },
  };
});

// 10. "você deixa o portão aberto,": o portão de grade abrindo; o cachorro lá dentro olhando a rua
plano(C(54), (t) => {
  const k = k01(t, C(54), C(59));
  const ab = eio(k01(t, A(55), A(58) + 0.3));
  return {
    t, cena: "rua", sol: [-2.6, 0.75, -1.6],
    cam: { pos: [L(-0.45, -0.6, k), 0.5, 7.65], alvo: [-0.85, 0.42, 3.4], fov: 38, foco: 0.45, forca: 0.7, larg: 1.3 },
    portao: 0.05 + 0.85 * ab,
    cachorro: { pos: [-0.75, 0, 6.45], rotY: Math.PI / 2, anda: "parado", t, rabo: 0.5 },
  };
});

// ------------------------------------------------------------------------------------------ a moto da esquina
const R_CURVA = 3, XL = X_ESQ - 1.3, ZL = -1.3, Z_ANT = ZL - R_CURVA, L1 = 25.7, L2 = (Math.PI / 2) * R_CURVA;
/** caminho: sobe a rua transversal (+Z), faz a curva à direita e segue pela rua principal (-X) */
function caminho(s: number): { pos: V3; rotY: number; lean: number } {
  if (s < L1) return { pos: [XL, 0, -30 + s], rotY: -Math.PI / 2, lean: 0 };
  if (s < L1 + L2) {
    const f = (s - L1) / R_CURVA;
    const tx = -Math.sin(f), tz = Math.cos(f);
    return { pos: [XL - R_CURVA + R_CURVA * Math.cos(f), 0, Z_ANT + R_CURVA * Math.sin(f)], rotY: Math.atan2(-tz, tx), lean: 0.32 * Math.sin((Math.PI * (s - L1)) / L2) };
  }
  return { pos: [XL - R_CURVA - (s - L1 - L2), 0, ZL], rotY: Math.PI, lean: 0 };
}
const V_ESQ = 7.5;
const sMoto = (t: number) => 22.5 + V_ESQ * (t - C(59));

// 11. "e lá na esquina vem uma MOTO,": do portão, teleobjetiva na esquina: a moto dobra e vem
plano(C(59), (t) => {
  const c = caminho(sMoto(t));
  return {
    t, cena: "rua", sol: [-2.6, 0.75, -1.6],
    cam: { pos: [0.4, 0.5, 4.6], alvo: [L(17, 12, eio(k01(t, C(59), C(66)))), 0.75, -1.6], fov: 20, foco: 0.47, forca: 0.6, larg: 1.3 },
    moto: { pos: c.pos, rotY: c.rotY, lean: c.lean, v: V_ESQ, fum: 0.4 },
    portao: 0.9,
  };
});

// 12. "barulhenta, rápida,": travelling baixo ao lado da moto
plano(C(66), (t) => {
  const c = caminho(sMoto(t));
  return {
    t, cena: "rua", sol: [-2.6, 0.9, -1.6],
    cam: { pos: soma([c.pos[0] - 1.2, 0.55, c.pos[2] + 2.1], treme(t, 0.02)), alvo: [c.pos[0] - 0.2, 0.75, c.pos[2]], fov: 38, foco: 0.45, forca: 0.6, larg: 1.3 },
    moto: { pos: c.pos, rotY: c.rotY, lean: c.lean, v: V_ESQ, fum: 0.9 },
  };
});

// 13. "passando colada no meio-fio.": câmera na altura do meio-fio; a roda passa rente à guia
plano(C(68), (t) => {
  const tt = t - C(68);
  return {
    t, cena: "rua", sol: [-2.6, 0.9, -1.6],
    cam: { pos: [-1.6, 0.2, 3.3], alvo: [3.5, 0.28, 3.0], fov: 34, foco: 0.42, forca: 0.6, larg: 1.3 },
    moto: { pos: [9 - V_ESQ * tt, 0, 2.78], rotY: Math.PI, v: V_ESQ, fum: 0.6 },
    portao: 0.9,
  };
});

// 14. "Mas para o cérebro do seu cachorro,": close da cabeça no portão; as orelhas levantam em alerta
plano(C(72), (t) => {
  const k = k01(t, C(72), C(79));
  const ore = 1 - eio(k01(t, A(75) - 0.1, A(75) + 0.35));
  return {
    t, cena: "rua", sol: [-2.6, 0.8, -1.6],
    cam: { olho: true, pos: [L(0.42, 0.34, k), L(0.04, 0.02, k), L(-0.38, -0.3, k)], alvo: [-0.04, 0.02, 0.02], fov: 32, foco: 0.5, forca: 0.5, larg: 1.5 },
    cachorro: { pos: [-0.75, 0, 5.4], rotY: Math.PI / 2, anda: "parado", t, orelha: ore, cabecaZ: 0.1 * (1 - ore) },
    portao: 0.9,
  };
});

// 15. "aquele ronco de motor é um bicho grande correndo...": o que ele vê: a moto vem como bicho de olhos de farol
plano(C(79), (t) => {
  const k = k01(t, C(79), C(88));
  return {
    t, cena: "rua", sol: [1, 0.12, 0.05],
    cam: { pos: soma([-3.2, 0.28, -0.7], treme(t, 0.006)), alvo: [3, L(1.05, 1.15, k), -1.1], fov: L(34, 30, k), foco: 0.55, forca: 0.6, larg: 1.3 },
    moto: { pos: [L(16, 5.5, k), 0, -1.2], rotY: Math.PI, v: 6, fum: 0.8, bicho: eio(k01(t, A(85) - 0.3, A(85) + 0.3)), lean: 0.03 * Math.sin(t * 2) },
  };
});

// 16. "e bicho que corre é para ser perseguido.": por trás do cachorro, agachado no portão; a moto cruza a rua
plano(C(88), (t) => {
  const tt = t - C(88);
  return {
    t, cena: "rua", sol: [-2.6, 0.8, -1.6],
    cam: { pos: [-0.35, 0.42, 7.6], alvo: [-0.9, 0.45, 2.5], fov: 34, foco: 0.42, forca: 0.6, larg: 1.3 },
    cachorro: { pos: [-0.8, 0, 5.75], rotY: Math.PI / 2, anda: "baixa", t, orelha: 0, rabo: 0.2 },
    moto: { pos: [9 - 6.5 * tt, 0, -1.0], rotY: Math.PI, v: 6.5, fum: 0.6 },
    portao: 0.9,
  };
});

// 17. "Então, ele dispara pela rua,": câmera rente ao asfalto: as patas batendo no chão
plano(C(96), (t) => {
  const xd = 2 - 6.2 * (t - C(96));
  return {
    t, cena: "rua", sol: [-2.6, 0.8, -1.6],
    cam: { pos: soma([xd - 0.6, 0.12, 1.55], treme(t, 0.01)), alvo: [xd - 0.15, 0.2, 0.9], fov: 40, foco: 0.4, forca: 0.6, larg: 1.3 },
    cachorro: { pos: [xd, 0, 0.9], rotY: Math.PI, anda: "galope", t, orelha: 0.3, estica: 0.6 + 0.4 * Math.sin(t * 16) },
  };
});

// 18. "late no pneu,": colado na roda traseira, latindo (AU! AU!)
plano(C(101), (t) => {
  const xm = -6 - 6.4 * (t - C(101)), xd = xm + 1.0;
  return {
    t, cena: "rua", sol: [2.4, 1.0, 2.0],
    cam: { pos: soma([xd - 1.5, 0.4, 2.3], treme(t, 0.012)), alvo: [xd - 0.2, 0.5, 1.0], fov: 40, foco: 0.42, forca: 0.6, larg: 1.3 },
    cachorro: { pos: [xd, 0, 1.15], rotY: Math.PI, anda: "galope", t, orelha: 0.3, estica: 0.6 + 0.4 * Math.sin(t * 16) },
    moto: { pos: [xm, 0, 0.55], rotY: Math.PI, v: 6.4, fum: 0.5 },
  };
});

// 19. "e o motoqueiro acelera,": por trás da moto, baixo: o tranco e a fumacinha do escapamento
plano(C(104), (t) => {
  const tt = t - C(104);
  const ac = eio(k01(t, A(107) - 0.15, A(107) + 0.25));
  const xm = -12 - 6.4 * tt - 5 * ac * Math.max(0, t - A(107));
  return {
    t, cena: "rua", sol: [2.4, 1.0, 2.0],
    cam: { pos: soma([-10.2 - 6.4 * tt, 0.45, 1.3], treme(t, 0.015)), alvo: [xm, 0.55, 0.55], fov: 38, foco: 0.42, forca: 0.6, larg: 1.3 },
    moto: { pos: [xm, 0, 0.55], rotY: Math.PI, v: 6.4 + 5 * ac, fum: 0.6 + 0.8 * ac, acel: ac * (1 - k01(t, A(107) + 0.4, A(107) + 0.9)) },
    cachorro: { pos: [-10.9 - 6.4 * tt, 0, 1.15], rotY: Math.PI, anda: "galope", t, orelha: 0.3 },
  };
});

// 20. "mas para ele quem fugiu foi a PRESA,": por cima do ombro do cachorro, que freia; a moto-bicho foge
plano(C(108), (t) => {
  const tt = t - C(108);
  const xd = freia(-16, 6, 0.9, tt), xm = -19 - 9 * tt;
  return {
    t, cena: "rua", sol: [2.4, 0.9, 2.0],
    cam: { pos: [xd + 1.3, 0.62, 1.55], alvo: [xd - 4, 0.6, 0.7], fov: 34, foco: 0.48, forca: 0.6, larg: 1.3 },
    cachorro: { pos: [xd, 0, 1.15], rotY: Math.PI, anda: tt < 0.8 ? "galope" : "parado", t, orelha: 0, rabo: 0.8, lingua: tt > 0.9 },
    moto: { pos: [xm, 0, 0.55], rotY: Math.PI, v: 9, fum: 0.7, lean: 0.04 * Math.sin(t * 9) },
  };
});

// 21. "morrendo de medo dele.": a traseira da moto fugindo, tremendo, com gotas de suor
plano(C(116), (t) => {
  const xm = -40 - 7 * (t - C(116));
  return {
    t, cena: "rua", sol: [2.4, 0.9, 2.0],
    cam: { pos: soma([xm + 3.2, 0.9, 1.6], treme(t, 0.01)), alvo: [xm, 0.85, 0.55], fov: 34, foco: 0.48, forca: 0.6, larg: 1.3 },
    moto: { pos: [xm, 0, 0.55], rotY: Math.PI, v: 7, fum: 0.9, lean: 0.06 * Math.sin(t * 23) },
  };
});

// 22. "Então, ele volta para o portão com a língua de fora": trotando de volta, de frente para a câmera
plano(C(120), (t) => {
  const xd = -6 + 1.35 * (t - C(120));
  return {
    t, cena: "rua", sol: [-2.4, 1.1, 1.8],
    cam: { pos: [xd + L(2.4, 1.8, k01(t, C(120), C(131))), 0.32, 2.6], alvo: [xd, 0.5, 2.1], fov: 36, foco: 0.45, forca: 0.7, larg: 1.3 },
    cachorro: { pos: [xd, 0, 2.1], rotY: 0, anda: "trote", t, orelha: 1, rabo: 1, lingua: true },
    portao: 0.9,
  };
});

// 23. "e o rabo lá em cima,": por trás e baixo: o rabo erguido abanando
plano(C(131), (t) => {
  const xd = -1.6 + 0.9 * (t - C(131));
  return {
    t, cena: "rua", sol: [-2.4, 1.1, 1.8],
    cam: { pos: [xd - 1.7, 0.42, 3.3], alvo: [xd + 0.2, 0.62, 2.4], fov: 36, foco: 0.45, forca: 0.7, larg: 1.3 },
    cachorro: { pos: [xd, 0, 2.4], rotY: 0.25, anda: "trote", t, orelha: 1, rabo: 1, lingua: true },
    portao: 0.9,
  };
});

// 24. "como se tivesse salvado a rua inteira.": no portão, peito estufado, câmera baixa de herói
plano(C(137), (t) => {
  const k = k01(t, C(137), C(144));
  return {
    t, cena: "rua", sol: [-2.4, 1.0, 1.8],
    cam: { pos: [L(1.0, 1.2, k), 0.18, L(3.0, 2.7, k)], alvo: [-0.75, L(0.55, 0.7, k), 4.6], fov: 34, foco: 0.48, forca: 0.6, larg: 1.3 },
    cachorro: { pos: [-0.75, 0, 4.7], rotY: Math.PI / 2 - 0.35, anda: "parado", t, orelha: 1, rabo: 1, cabecaZ: 0.18, lingua: true },
    portao: 0.9,
  };
});

// 25. "E todo dia é a mesma coisa,": três cortes rápidos, a mesma perseguição em dias diferentes
export const tDias = () => [C(144), A(146) - 0.05, A(149) - 0.05];
plano(C(144), (t) => {
  const td = tDias();
  const i = t < td[1] ? 0 : t < td[2] ? 1 : 2;
  const tt = t - td[i];
  const xm = -14 + 6.2 * (tt + 0.6), xd = xm - 1.02;
  const ang: V3[] = [[1.75, 0.34, 1.75], [-2.4, 0.5, 1.6], [0.6, 2.6, 2.2]];
  const sol: V3[] = [[-2.4, 1.5, 2.2], [-2.0, 2.4, -1.2], [-2.6, 0.7, 1.6]];
  return {
    t, cena: "rua", sol: sol[i], luz: { sol: [1, 1.15, 0.85][i], cor: [0xfff1dc, 0xffffff, 0xffc890][i] },
    cam: { pos: soma([xd + ang[i][0], ang[i][1], Z_DOG + ang[i][2]], treme(t, 0.012)), alvo: [xd + 0.3, 0.5, Z_DOG - 0.25], fov: 40, foco: 0.42, forca: 0.7, larg: 1.25 },
    cachorro: { pos: [xd, 0, Z_DOG], anda: "galope", t: t + 0.13, estica: 0.6 + 0.4 * Math.sin(t * 16) },
    moto: { pos: [xm, 0, Z_MOTO], v: V_MOTO, fum: 0.5 },
  };
});

// 26. "porque cada moto que some na curva": a moto dobra a esquina e some; o cachorro para
plano(C(151), (t) => {
  const tt = t - C(151);
  const c = caminho(Math.max(0, L1 + L2 + 1.5 - 7 * tt));
  const xd = freia(X_ESQ - 11.5, 6, 1.4, tt);
  return {
    t, cena: "rua", sol: [-2.6, 0.8, 1.6],
    cam: { pos: [xd - 2.2, 0.5, 0.2], alvo: [X_ESQ - 1, 0.8, -3.5], fov: 30, foco: 0.48, forca: 0.6, larg: 1.3 },
    moto: { pos: c.pos, rotY: c.rotY + Math.PI, lean: -c.lean, v: 7, fum: 0.6 },
    cachorro: { pos: [xd, 0, -0.6], rotY: 0, anda: tt < 1.2 ? "galope" : "parado", t, orelha: 0.2, lingua: tt > 1.3 },
  };
});

// 27. "é mais uma caçada que ele acha que ganhou...": na esquina, de frente, orgulhoso; as medalhas se empilham
plano(C(158), (t) => {
  const k = k01(t, C(158), C(167));
  const xd = X_ESQ - 6.2;
  return {
    t, cena: "rua", sol: [-2.6, 0.9, 1.6],
    cam: { pos: [xd + L(1.9, 1.5, k), 0.22, -0.5], alvo: [xd, 0.3, -0.6], fov: 36, foco: 0.46, forca: 0.6, larg: 1.3 },
    cachorro: { pos: [xd, 0, -0.6], rotY: -0.25, anda: "parado", t, orelha: 1, rabo: 1, cabecaZ: 0.15, lingua: true },
  };
});

// 28. "até o dia em que o pneu passa": correndo ao lado da roda dianteira, cada vez mais perto
plano(C(167), (t) => {
  const xm = -6 + 6.8 * (t - C(167));
  const gap = L(0.9, 0.42, eio(k01(t, C(167), C(175))));
  return {
    t, cena: "rua", sol: [-2.4, 1.3, 2.0], luz: { sol: 0.95 },
    cam: { pos: soma([xm + 1.9, 0.38, 2.0], treme(t, 0.015)), alvo: [xm + 0.4, 0.45, 0.2], fov: 40, foco: 0.45, forca: 0.6, larg: 1.3 },
    moto: { pos: [xm, 0, -0.6], v: 6.8, fum: 0.5 },
    cachorro: { pos: [xm + 0.45, 0, -0.6 + 0.35 + gap], anda: "galope", t, orelha: 0.2, estica: 0.6 + 0.4 * Math.sin(t * 16) },
  };
});

// 29. "perto DEMAIS.": o quadro congela com o pneu a um palmo do focinho
plano(C(175), () => ({
  t: C(175), cena: "rua", sol: [-2.0, 1.2, 2.2], congela: 1,
  cam: { pos: [1.75, 0.4, 0.12], alvo: [0.2, 0.4, 0.06], fov: 40, foco: 0.5, forca: 0.5, larg: 1.6 },
  cachorro: { pos: [0.16, 0, 0.66], rotY: 1.42, anda: "late", t: 0.12 },
  moto: { pos: [-0.45, 0, -0.22], v: 7, fum: 0.6 },
}));

// ------------------------------------------------------------------------------------------ quintal
const PQ = (x: number, z: number): V3 => [Q0.x + x, Q0.y, Q0.z + z];

// 30. "Então, quando você troca a risada": no quintal, o dono com a bolinha na mão; o cachorro inteiro, abanando
plano(C(177), (t) => {
  const k = k01(t, C(177), C(183));
  return {
    t, cena: "rua", sol: [-2.6, 1.1, 1.4],
    cam: { pos: soma(PQ(L(2.2, 1.9, k), 3.4), [0, 0.45, 0]), alvo: soma(PQ(-0.2, 1.0), [0, 0.8, 0]), fov: 36, foco: 0.45, forca: 0.6, larg: 1.3 },
    dono: { pos: PQ(-0.9, 0.6), rotY: -0.5, pose: "parado", t },
    cachorro: { pos: PQ(0.4, 1.5), rotY: Math.PI - 0.6, anda: "parado", t, orelha: 1, rabo: 1, cabecaZ: 0.2 },
    lanca: { t0: t + 1, dur: 1, alvo: PQ(0, 0) },
  };
});

// 31. "por uma corrida no quintal": o dono e o cachorro correndo juntos pela grama
plano(C(183), (t) => {
  const x = -4 + 3.2 * (t - C(183));
  return {
    t, cena: "rua", sol: [-2.6, 1.1, 1.4],
    cam: { pos: soma(PQ(x + 1.6, 3.6), soma([0, 0.6, 0], treme(t, 0.01))), alvo: soma(PQ(x + 0.4, 0.9), [0, 0.7, 0]), fov: 38, foco: 0.45, forca: 0.6, larg: 1.3 },
    dono: { pos: PQ(x - 0.3, 0.2), rotY: 0, pose: "corre", t },
    cachorro: { pos: PQ(x + 0.6, 1.3), rotY: 0, anda: "galope", t: t * 0.9, orelha: 1, lingua: true },
  };
});

// 32. "e uma BOLINHA para ele caçar,": o dono lança a bolinha por cima do ombro; o cachorro dispara atrás
export const T_LANCA = () => A(190) - 0.05;
const ALVO_BOLA = (): V3 => PQ(4.2, -2.0);
plano(C(188), (t) => {
  const tl = T_LANCA();
  const tt = Math.max(0, t - tl);
  const d = 6.0 * tt;
  return {
    t, cena: "rua", sol: [-2.6, 1.1, 1.4],
    cam: { pos: soma(PQ(-2.6, 3.4), [0, 0.7, 0]), alvo: soma(PQ(1.0, -0.5), [0, 0.9, 0]), fov: 40, foco: 0.47, forca: 0.6, larg: 1.3 },
    dono: { pos: PQ(-0.6, 0.6), rotY: -0.35, pose: "joga", t: 0.35 + (t - (tl - 0.55)) },
    lanca: { t0: tl, dur: 1.15, alvo: ALVO_BOLA() },
    cachorro: { pos: PQ(0.9 + d * 0.8, 1.0 - d * 0.6), rotY: 0.64, anda: t > tl ? "galope" : "parado", t, orelha: 0, rabo: 1 },
  };
});

// 33. "aquela vontade de perseguir": o salto e a bolinha na boca
plano(C(194), (t) => {
  const tt = t - C(194);
  const xd = 2.6 + 1.4 * Math.min(tt, 1.0);
  const temBola = tt > 0.55;
  return {
    t, cena: "rua", sol: [-2.6, 1.1, 1.4],
    cam: { pos: soma(PQ(xd + 1.2, 1.4), [0, 0.35, 0]), alvo: soma(PQ(xd - 0.2, -1.7), [0, 0.55, 0]), fov: 38, foco: 0.45, forca: 0.6, larg: 1.3 },
    cachorro: { pos: PQ(xd, -1.4 - 0.4 * Math.min(tt, 1)), rotY: 0.64, anda: tt < 1.1 ? "pula" : "parado", t: tt < 1.1 ? tt * 1.05 : t, orelha: 0.6, rabo: 1 },
    bolaBoca: temBola,
    bola: temBola ? null : soma(ALVO_BOLA(), [0, 0.034 + 0.25 * Math.abs(Math.sin(tt * 8)) * (1 - tt), 0]),
  };
});

// 34. "finalmente tem para onde ir.": voltando com a bolinha na boca, o rabo abanando
plano(C(198), (t) => {
  const tt = t - C(198);
  const xd = 4.6 - 1.1 * tt;
  return {
    t, cena: "rua", sol: [-2.6, 1.1, 1.4],
    cam: { pos: soma(PQ(xd - 1.2, 1.4), [0, 2.0, 0]), alvo: soma(PQ(xd, -0.9), [0, 0.3, 0]), fov: 40, foco: 0.45, forca: 0.6, larg: 1.3 },
    cachorro: { pos: PQ(xd, -1.0 + 0.25 * tt), rotY: Math.PI - 0.35, anda: "trote", t, orelha: 1, rabo: 1 },
    bolaBoca: true,
  };
});

// 35. "PARABÉNS! Você acabou de descobrir por que o seu cachorro,": de frente, com a bolinha, corações e estrelinhas
plano(C(203), (t) => {
  const k = k01(t, C(203), C(213));
  return {
    t, cena: "rua", sol: [-2.6, 1.0, 1.4],
    cam: { pos: soma(PQ(L(1.25, 0.95, k), 0.6), [0, 0.38, 0]), alvo: soma(PQ(0.2, 0.0), [0, 0.5, 0]), fov: 34, foco: 0.45, forca: 0.6, larg: 1.3 },
    cachorro: { pos: PQ(0.0, -0.2), rotY: -0.6, anda: "parado", t, orelha: 1, rabo: 1, cabecaZ: 0.15 },
    bolaBoca: true,
  };
});

// 36/37. "que é um doce dentro de casa... vira um LOBO quando escuta uma moto.": tela dividida (o Reel monta as metades)
const PS = (x: number, z: number): V3 => [S0.x + x, S0.y, S0.z + z];
export const SOFA_Y = 0.4; // altura do assento do sofá
export const MEIO_CIMA = (t: number): Estado => ({
  t, cena: "rua", sol: [1.6, 0.6, -2.0], luz: { sol: 0.9, hemi: 0.9, cor: 0xffc890 },
  cam: { pos: soma(PS(1.3, 1.7), [0, 1.0, 0]), alvo: soma(PS(-0.45, -1.45), [0, 0.62, 0]), fov: 32, foco: 0.5, forca: 0.5, larg: 1.5 },
  cachorro: { pos: soma(PS(-0.45, -1.48), [0, SOFA_Y, 0]), rotY: -0.5, anda: "baixa", t, orelha: 1, rabo: 0.5 },
});
export const MEIO_BAIXO = (t: number): Estado => {
  const lobo = t >= A(222) - 0.05;
  return {
    t, cena: "rua", sol: [0.12, 0.62, 1.0], luz: { sol: 1.35, cor: 0xffb070 },
    cam: { pos: [0.1, 7.6, 0.2], alvo: [0.1, 0.0, -0.55], fov: 40, foco: 0.5, forca: 0.5, larg: 1.5 },
    cachorro: { pos: [0.2, 0, 0.5], rotY: Math.PI, anda: "parado", t, orelha: lobo ? 0 : 1, semSombra: lobo },
    sombraLobo: lobo ? { pos: [0.25, 0, 0.5], rotY: Math.PI, t } : null,
  };
};
export const T_SPLIT = (): [number, number] => [C(213), C(227)];
plano(C(213), (t) => MEIO_CIMA(t));

// 38. virada: "Esse vídeo foi feito com IA" — a rua congela e vira arame laranja sobre azul-tinta
plano(C(227), (t) => {
  const tf = C(227) - 0.2;
  const b = MEIO_BAIXO(tf);
  const v = eio(k01(t, C(227), C(227) + 0.9)), d = eio(k01(t, C(227) + 0.7, A(233)));
  return { ...b, t, cam: { pos: [-3.6, 1.6, 2.4], alvo: [-0.5, 0.4, 0.6], fov: 40, forca: 0.3 }, sombraLobo: null, cachorro: { ...b.cachorro!, semSombra: false, orelha: 1 }, virada: { k: v, k2: d } };
});

export function estadoEm(t: number): Estado {
  let p = PLANOS[0];
  for (const q of PLANOS) if (t >= q.ini) p = q;
  return p.f(t);
}
/** início de cada plano (para o medidor e para os grafismos) */
export const CORTES = () => PLANOS.map((p) => p.ini);
