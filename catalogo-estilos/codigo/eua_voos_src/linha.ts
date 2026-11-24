// Linha do tempo do reel (direção C): câmera e estado 3D em função do tempo, presos às palavras da fala.
import * as THREE from "three";
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado } from "./three/mundo";
import { SOM } from "./marcos_som";

export const W = (i: number) => PALAVRAS[i].a;
export const WE = (i: number) => PALAVRAS[i].b;

// marcos (s), pelo índice da palavra em fala.ts
export const M = {
  nenhum2: W(8), em: W(9), nesta: W(14), treze: W(16), faa: W(18), mandou: W(24), curto: W(27), todos: W(28), os: W(29), aeroportos: W(30), parados: W(31),
  por: W(32), circ: W(33), extra: W(34), ate: W(35), novo: W(36), aviso: W(37), segundo: W(38), secretario: W(40), sean: W(43), caiu: W(45), vinte2: W(49), centros: W(50), que: W(51),
  radar: W(58), radio: W(60), fontes: W(61), cbs: W(64), uma: W(67), atualizacao: W(68), reiniciar: W(72), eCair: W(73), cair: W(74), detalhe: W(75), terca: W(79), ligado: W(84),
  intel: W(86), organizar: W(89), ela: W(93), investigada: W(96), empresa: W(97), nega: W(99), ataque: W(101), governo: W(103), nenhumSinal: W(108), quem: W(110),
  mais: W(117), tres: W(119), emTerra: W(122), dois: W(128), dez: W(133), segFA: W(136), parar: W(139), so: W(143), duas: W(145), vezes: W(146), em2023: W(148),
  terceirizada: W(152), apagou: W(153), e11: W(157), faa2: W(164), descer: W(166), q4500: W(168), emDuas: W(170), vazio: W(178), espanta: W(179), ate2: W(183),
  esse: W(186), com: W(190), disquete: W(191), eFio: W(192), fio: W(193), voos: W(196), brasil: W(200), decididos: W(202), se: W(206), viajar: W(212), manda: W(219),
  confere: W(225), companhia: W(231), casaFim: WE(236), esseVideo: W(237), feito: W(240), ia: W(242), ate3: W(243), voz: W(246), quer: W(247), comenta: W(253), play: W(254),
  grupo: W(262), doPrompt: W(268),
  fim: DURACAO,
};
export const LOOP_A = DURACAO - 0.55; // começa a volta para o quadro 0
export const LOOP_B = DURACAO - 0.22; // daqui em diante é o quadro 0

export const c01 = (x: number) => Math.min(1, Math.max(0, x));
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
type V3 = [number, number, number];
const l3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export type Cam = { pos: V3; alvo: V3; fov?: number; foco?: number; forca?: number };
const cam = (pos: V3, alvo: V3, foco = 0.5, forca = 0.45, fov = 30): Cam => ({ pos, alvo, foco, forca, fov });
const lc = (a: Cam, b: Cam, k: number): Cam => ({ pos: l3(a.pos, b.pos, k), alvo: l3(a.alvo, b.alvo, k), fov: lerp(a.fov ?? 30, b.fov ?? 30, k), foco: lerp(a.foco ?? 0.5, b.foco ?? 0.5, k), forca: lerp(a.forca ?? 0.45, b.forca ?? 0.45, k) });

export const OVR = cam([0, 20.2, 22.6], [-0.15, 0, -0.55], 0.52, 0.45);
const OVR2 = cam([0, 18.4, 20.4], [-0.1, 0, -0.6], 0.52, 0.45);
const NY1 = cam([2.45, 4.4, 3.4], [3.55, 0, -0.95], 0.5, 0.65);
const NY2 = cam([2.95, 2.7, 1.8], [3.66, 0, -1.08], 0.5, 0.7);
const DISQ_LONGE = cam([1.6, 2.7, 10.4], [2.45, 0.15, 5.42], 0.47, 0.4);
const DISQ1 = cam([1.45, 2.2, 9.55], [2.38, 0.15, 5.42], 0.47, 0.4);
const DISQ2 = cam([1.8, 1.55, 8.25], [2.36, 0.14, 5.4], 0.47, 0.45);
const BOB1 = cam([2.35, 1.35, 7.7], [3.02, 0.25, 5.8], 0.5, 0.5);
const BOB2 = cam([2.7, 1.0, 7.15], [3.06, 0.24, 5.8], 0.5, 0.55);
const CEL1 = cam([-1.95, 3.9, 13.1], [-2.32, 0.74, 5.55], 0.45, 0.35);
const CEL2 = cam([-2.0, 3.45, 12.0], [-2.33, 0.76, 5.5], 0.45, 0.35);
const CEL3 = cam([-2.1, 2.75, 9.9], [-2.35, 1.02, 5.2], 0.5, 0.35);
const CEL4 = cam([-2.2, 2.5, 9.3], [-2.36, 1.04, 5.2], 0.5, 0.35);
const CART1 = cam([-2.2, 4.7, 9.7], [-2.28, 0.0, 5.62], 0.5, 0.42);
const CART2 = cam([-2.22, 4.3, 9.2], [-2.28, 0.0, 5.62], 0.5, 0.42);
const AMER1 = cam([1, 22, 22], [0, 0, -0.4], 0.52, 0.45);
const AMER2 = cam([25, 17, 15.5], [12.4, 0, 7.5], 0.5, 0.35);
const AMER3 = cam([23.5, 15.5, 14.8], [12.0, 0, 7.3], 0.5, 0.35);

// tomadas: [início, fim, câmera A, câmera B, curva]
type Tom = [number, number, Cam, Cam, (x: number) => number];
const lin = (x: number) => c01(x);
export const TOMADAS: Tom[] = [
  [0, M.nenhum2, OVR, OVR2, lin],
  [M.nenhum2, 5.05, OVR2, OVR2, lin],
  [5.05, 5.95, OVR2, NY1, eio],
  [5.95, M.nesta, NY1, NY2, lin],
  [M.nesta, M.faa, cam([7, 13.5, 17], [0, 0, -0.45]), cam([5.2, 12.5, 16.6], [0.2, 0, -0.5]), lin],
  [M.faa, M.mandou, cam([-8, 11.5, 15], [-0.4, 0, -0.35]), cam([-6.2, 10.5, 15.4], [0, 0, -0.35]), lin],
  [M.mandou, M.segundo, cam([0.4, 25, 9.5], [0, 0, -0.35], 0.5, 0.6), cam([-0.4, 21.5, 8.3], [0, 0, -0.35], 0.5, 0.6), lin],
  [M.segundo, M.que, cam([-2.6, 19.5, 21.4], [0, 0, -1.45]), cam([-1.6, 17.2, 18.6], [0, 0, -1.3]), lin],
  [M.que, M.radar - 0.05, cam([-1.6, 17.2, 18.6], [0, 0, -1.3]), cam([0.2, 7.8, 8.8], [0.6, 0, -0.95], 0.5, 0.5), eio],
  [M.radar - 0.05, M.fontes, cam([0.3, 9.6, 10.9], [0.4, 0, -1.25]), cam([0.3, 11.2, 12.6], [0.3, 0, -1.3]), lin],
  [M.fontes, M.eCair, cam([9, 6.6, 7], [0.8, 0, -0.5], 0.5, 0.55), cam([7.4, 5.6, 8.6], [0.6, 0, -0.4], 0.5, 0.55), lin],
  [M.eCair, M.detalhe, OVR, OVR2, lin],
  [M.detalhe, M.terca, cam([-9, 9, 12], [0, 0, -0.4]), cam([-10, 8, 9], [0, 0, -0.4]), lin],
  [M.terca, M.ela, cam([6, 14, 15], [0, 0, -0.5]), cam([-4, 15, 15], [0, 0, -0.5]), lin],
  [M.ela, M.ataque - 0.42, cam([-4, 15, 15], [0, 0, -0.5]), cam([-2, 12, 11.5], [0, 0, -0.6]), lin],
  [M.ataque - 0.42, M.quem, cam([0, 25, 4], [-0.1, 0, -0.35], 0.5, 0.4), cam([0, 22, 3.6], [-0.1, 0, -0.35], 0.5, 0.4), lin],
  [M.quem, M.mais, cam([-3.3, 1.45, 1.5], [-1.7, 0.1, -0.6], 0.5, 0.65), cam([-0.9, 1.45, 1.05], [0.7, 0.1, -0.95], 0.5, 0.65), lin],
  [M.mais, M.emTerra, cam([-0.9, 1.45, 1.05], [0.7, 0.1, -0.95], 0.5, 0.65), cam([0, 14, 13.5], [0, 0, -0.5]), eio],
  [M.emTerra, M.parar, cam([3, 16, 15], [0, 0, -0.5], 0.5, 0.7), cam([-2, 15, 15], [0, 0, -0.5], 0.5, 0.7), lin],
  [M.parar, M.em2023, OVR, OVR2, lin],
  [M.em2023, M.e11, cam([0, 22, 12], [0, 0, -0.4], 0.5, 1.0), cam([0.5, 20, 11], [0, 0, -0.4], 0.5, 1.0), lin],
  [M.e11, M.emDuas, cam([5, 17, 17], [0, 0, -0.5]), cam([2, 18, 18], [0, 0, -0.5]), lin],
  [M.emDuas, M.espanta, cam([0, 24, 10.5], [0, 0, -0.45]), cam([-0.5, 21, 9.4], [0, 0, -0.45]), lin],
  [M.espanta, M.esse, cam([0.3, 13, 16], [0.5, 0, 0.6]), DISQ_LONGE, eio],
  [M.esse, M.eFio, DISQ1, DISQ2, lin],
  [M.eFio, M.voos, BOB1, BOB2, lin],
  [M.voos, M.brasil + 0.3, AMER1, AMER2, eio],
  [M.brasil + 0.3, M.se, AMER2, AMER3, lin],
  [M.se, 83.3, CEL1, CEL2, lin],
  [83.3, M.confere, CEL3, CEL4, lin],
  [M.confere, M.casaFim, CART1, CART2, lin],
  [M.casaFim, M.fim + 1, OVR, OVR, lin],
];

export function camEm(t: number): Cam {
  for (const [a, b, A, B, f] of TOMADAS) if (t >= a && t < b) return lc(A, B, f((t - a) / (b - a)));
  return OVR;
}

/** relógio dos voos: para no "NENHUM", acelera no "segue viagem", congela na virada */
export function tvEm(t: number) {
  const trechos: [number, number, number][] = [[4.22, 5.05, 0], [M.quem, M.mais, 3], [M.casaFim, 1e9, 0]];
  let tv = t;
  for (const [a, b, r] of trechos) tv += (r - 1) * Math.max(0, Math.min(t, b) - a);
  return tv;
}

export function estadoEm(t0: number): Estado {
  const t = t0 >= LOOP_B ? 0 : t0;
  const volta = t0 >= LOOP_A && t0 < LOOP_B ? k01(t0, LOOP_A, LOOP_B) : 0;
  let c = camEm(t);
  const e: Estado = { cena: "gancho", tv: tvEm(t), objetos: false, nuvem: 0 };
  // aviões em solo: apagam um a um (desde o quadro 0) e ficam vermelhos no "NENHUM"
  e.apaga = 0.1 + (t / M.nenhum2) * 1.0;
  e.vermelho = t >= M.nenhum2 ? 1 : 0;
  if (t < 7.44 || (t >= M.segundo && t < M.que) || (t >= M.e11 && t < M.emDuas)) e.nuvem = 0.16;
  // brilho do mapa por trecho
  e.brilho = 1;
  if (t >= M.mandou && t < M.segundo) e.brilho = 0.5;
  if (t >= M.segundo && t < M.fontes) e.brilho = 0.55;
  if (t >= M.fontes && t < M.detalhe) e.brilho = 0.45;
  if (t >= M.terca && t < M.ataque - 0.42) e.brilho = 0.55;
  if (t >= M.ataque - 0.42 && t < M.quem) e.brilho = 0.32;
  if (t >= M.mais && t < M.emTerra) e.soloBrilho = 0.3;
  if (t >= M.emTerra && t < M.parar) e.brilho = 0.45;
  if (t >= M.em2023 && t < M.e11) e.brilho = 0.3;
  // rede dos 22 centros
  if (t >= M.segundo && t < M.terca) {
    e.rede = k01(t, M.segundo + 0.05, M.sean + 0.6);
    e.caidos = 20 * k01(t, M.que, M.radar - 0.15);
    if (t >= M.detalhe) e.rede *= 1 - k01(t, M.detalhe, M.detalhe + 0.6);
  }
  // atualização / reboot: rede inteira vermelha
  if (t >= M.fontes && t < M.detalhe) { e.rede = 1; e.caidos = 20; }
  // IA nova
  if (t >= M.ligado && t < M.ataque - 0.42) e.ia = k01(t, M.ligado, M.organizar + 0.5);
  // radar
  if (t >= M.ataque - 0.42 && t < M.quem) { e.radar = k01(t, SOM.ping - 0.05, SOM.ping + 0.15) * (1 - k01(t, M.quem - 0.3, M.quem)); e.radarAng = (t - M.ataque + 0.42) * 2.6 + 1.2; }
  // 11 de setembro: tons frios, o céu esvazia
  if (t >= M.e11 && t < M.espanta) {
    e.vermelho = 0; e.apaga = 0; e.frio = k01(t, M.e11, M.e11 + 0.45); e.soloBrilho = 0.75;
    e.vazio = k01(t, M.descer, M.vazio);
  }
  // objetos na mesa
  if (t >= M.espanta && t < M.voos) e.objetos = true;
  e.insere = 0.02 + 0.84 * eio(k01(t, SOM.disquete - 0.85, SOM.disquete)) - 0.03 * Math.sin(k01(t, SOM.disquete, SOM.disquete + 0.3) * Math.PI);
  // Brasil
  if (t >= M.voos && t < M.se) { e.americas = k01(t, M.voos, M.voos + 0.6) + 0.001; e.rota = eio(k01(t, M.brasil, M.decididos + 0.9)); }
  // celular e cartão
  if (t >= M.se && t < M.casaFim) { e.objetos = true; e.envio = eio(k01(t, SOM.notif - 0.12, SOM.notif + 0.35)); e.carimbo = k01(t, M.companhia, M.companhia + 0.14); }
  // virada
  if (t >= M.esseVideo - 0.1) e.arame = eio(k01(t, M.esseVideo - 0.1, M.esseVideo + 0.75));
  if (t >= M.esseVideo) c = lc(OVR, cam([2.5, 17, 21], [0, 0, -0.5], 0.52, 0.3), eio(k01(t, M.esseVideo, M.fim)));
  // volta ao quadro 0 (loop)
  if (volta > 0) {
    const e0 = estadoEm(0);
    const k = eio(volta);
    e0.arame = 1 - k;
    e0.cam = lc(c, OVR, k);
    e0.nuvem = (e0.nuvem ?? 0) * k;
    return e0;
  }
  e.cam = c;
  return e;
}

/** projeta um ponto 3D para a tela (px) com a câmera do quadro */
const _cam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.05, 300);
export function projeta(c: Cam, p: V3): [number, number, boolean] {
  _cam.fov = c.fov ?? 30;
  _cam.position.set(...c.pos);
  _cam.updateProjectionMatrix();
  _cam.lookAt(...c.alvo);
  _cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(_cam);
  return [(v.x * 0.5 + 0.5) * 1080, (-v.y * 0.5 + 0.5) * 1920, v.z < 1];
}
