import * as THREE from "three";
import { DURACAO, GAPS, PALAVRAS } from "../fala";
import type { Dir, V3 } from "./kit";
import type { Estado } from "./mundo";
import { clamp, easeInOut, easeOut, lerp } from "./rng";
import { H, P_CADEADO, P_FECH, P_JAN, P_SEG, P_TRAB } from "./panela";

// ------------------------------------------------------------------ marcas da fala (achadas pelo texto, não por índice)
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const PN = PALAVRAS.map((p) => norm(p.w));
export function acha(frase: string, desde = 0): number {
  const f = frase.split(" ").map(norm);
  for (let i = desde; i <= PN.length - f.length; i++) if (f.every((w, j) => PN[i + j] === w)) return i;
  throw new Error("frase não achada: " + frase);
}
const S = (frase: string, desde = 0) => PALAVRAS[acha(frase, desde)].s;
const E = (frase: string, desde = 0) => {
  const i = acha(frase, desde) + frase.split(" ").length - 1;
  return PALAVRAS[i].e;
};
export const ws = (i: number) => PALAVRAS[i].s;

export const T_LAST = (Math.round(DURACAO * 30) - 1) / 30; // último quadro (= quadro 0)
export const LOOP0 = T_LAST - 0.5; // volta ao gancho
export const tl = (t: number) => (t >= LOOP0 ? t - T_LAST : t);

const iMasAgora = acha("mas agora");
export const M = {
  defesa: S("e uma defesa"),
  comum: S("numa panela comum"),
  cem: S("100"),
  entao1: S("entao voce fecha"),
  fecha: S("fecha a tampa"),
  pressao1: S("a pressao sobe e"),
  chega: S("a agua chega"),
  cento: S("120"),
  comida: S("a comida"),
  mas1: S("mas o vapor"),
  beirada: S("beirada"),
  entao2: S("entao voce poe um anel"),
  anelSil: S("anel de silicone"),
  entreTampa: S("entre a tampa"),
  esseAnel: S("esse e o anel"),
  vedacao: S("anel de vedacao"),
  vedacaoE: E("anel de vedacao"),
  mas2: S("mas agora"),
  entao3: S("entao voce abre um furinho"),
  furinho: S("furinho na tampa"),
  peso: S("peso em cima"),
  pontoCerto: S("no ponto certo"),
  levanta: S("levanta o peso"),
  vaporSai1: S("o vapor sai", iMasAgora),
  essaTrab: S("essa e a valvula de trabalho"),
  trab: S("valvula de trabalho"),
  trabE: E("valvula de trabalho"),
  ehEla: S("e ela que chia"),
  chia: S("chia"),
  chiaE: E("chia"),
  chiado: GAPS.CHIADO,
  mas3: S("mas o feijao"),
  espuma: S("faz espuma"),
  entupir: S("entupir o furinho"),
  entupirE: E("entupir o furinho"),
  entao4: S("entao voce abre outro"),
  outroFuro: S("outro furo"),
  pino: S("com um pino"),
  sobe: S("que sobe sozinho"),
  limite: S("passar do limite"),
  limiteE: E("passar do limite"),
  essaSeg: S("essa e a valvula de seguranca"),
  seg: S("valvula de seguranca"),
  segE: E("valvula de seguranca"),
  duas: S("e se as duas"),
  duasE: E("e se as duas entupirem"),
  entao5: S("entao voce deixa"),
  janelinha: S("janelinha"),
  porOnde: S("por onde"),
  empurra: S("empurra o anel"),
  vaporSai2: S("o vapor sai", acha("empurra o anel")),
  essaLat: S("essa e a seguranca lateral"),
  lat: S("seguranca lateral"),
  latE: E("seguranca lateral"),
  mas4: S("mas alguem"),
  abrir: S("tentar abrir"),
  cheia: S("cheia de pressao"),
  entao6: S("entao voce poe uma valvula"),
  porDentro: S("valvula por dentro"),
  trava: S("trava a tampa"),
  queTrava: S("que trava a tampa"),
  enquanto: S("enquanto tiver pressao"),
  essaFech: S("essa e a valvula de fechamento"),
  fech: S("valvula de fechamento"),
  fechE: E("valvula de fechamento"),
  parabens: S("parabens"),
  construiu: S("voce construiu"),
  construiuE: E("voce construiu uma panela de pressao"),
  virada: S("e essa cozinha"),
  ia: S("ia"),
  ate: S("ate a minha voz"),
  voz: S("minha voz"),
  quer: S("quer aprender"),
  comenta: S("comenta play"),
  play: S("play"),
  link: S("link"),
  doPrompt: S("do prompt ao play"),
};

// ------------------------------------------------------------------ utilidades
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const DZ = 1.5; // no 9:16 a largura visível é ~0,3 x a distância
const orb = (al: V3, d0: number, az: number, el: number): V3 => {
  const d = d0 * DZ;
  return [al[0] + d * Math.sin(az) * Math.cos(el), al[1] + d * Math.sin(el), al[2] + d * Math.cos(az) * Math.cos(el)];
};
const lv = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const ROT = -0.5; // giro da panela: o cabo aponta para trás e para a esquerda
/** ponto da panela (coordenadas locais) em coordenadas de mundo */
export const mundo = (p: V3, rot = ROT): V3 => {
  const v = new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  return [v.x, v.y, v.z];
};
/** manômetro: 0 = verde, 0,62 = amarelo, 0,8+ = vermelho */
export function pressao(t: number): number {
  const x = tl(t);
  if (x < M.comum) return 0.86 + 0.04 * Math.sin(x * 9); // gancho: no vermelho
  if (t < M.pressao1) return 0;
  if (t < M.mas1) return lerp(0, 0.45, easeOut(k01(t, M.pressao1, M.cento)));
  if (t < M.mas2) return lerp(0.45, 0.2, easeOut(k01(t, M.mas1, M.beirada + 0.6))) + lerp(0, 0.25, easeOut(k01(t, M.anelSil + 0.6, M.vedacao)));
  if (t < M.levanta) return lerp(0.45, 0.93, easeInOut(k01(t, M.mas2, M.mas2 + 2.2))) + 0.03 * Math.sin(t * 12);
  if (t < M.mas3) return lerp(0.93, 0.5, easeOut(k01(t, M.levanta, M.levanta + 1.2)));
  if (t < M.sobe) return lerp(0.5, 0.92, easeInOut(k01(t, M.entupir, M.entupirE + 1.2))) + 0.03 * Math.sin(t * 12);
  if (t < M.duas) return lerp(0.92, 0.5, easeOut(k01(t, M.sobe, M.sobe + 1.2)));
  if (t < M.empurra) return lerp(0.5, 0.95, easeInOut(k01(t, M.duas, M.duasE))) + 0.025 * Math.sin(t * 14);
  if (t < M.mas4) return lerp(0.95, 0.5, easeOut(k01(t, M.empurra + 0.4, M.vaporSai2 + 0.8)));
  if (t < M.virada) return 0.5 + 0.02 * Math.sin(t * 3);
  return -1; // some
}
export function temperatura(t: number): number {
  if (t < M.chega) return 100;
  return lerp(100, 120, easeInOut(k01(t, M.chega, M.cento + 0.25)));
}
export const defesas = (t: number) => (t >= M.fech ? 4 : t >= M.lat ? 3 : t >= M.seg ? 2 : t >= M.trab ? 1 : 0);

const TODAS = { anel: 1, peso: 1, seg: 1, jan: 1, fech: 1 };
const NENHUMA = { anel: 0, peso: 0, seg: 0, jan: 0, fech: 0 };
const pisca = (t: number, i: number) => 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 7 - i * 1.5), 2);

// gancho (também usado no fim, para o loop): x pode ser negativo (últimos 0,5 s do vídeo)
function gancho(x: number): Estado {
  const k = clamp((x + 0.5) / (M.comum + 0.5));
  const al: V3 = [0, 1.05, 0];
  let cam;
  if (x < M.defesa) cam = { pos: orb(al, lerp(6.3, 5.6, easeInOut(k01(x, -0.5, M.defesa))), lerp(0.42, 0.3, k), 0.2), alvo: al, fov: 30 };
  else {
    const kk = easeInOut(k01(x, M.defesa, M.comum));
    const a2: V3 = [0, 1.15, 0];
    cam = { pos: orb(a2, lerp(5.0, 4.5, kk), lerp(-0.25, 0.1, kk), 0.62), alvo: a2, fov: 30 };
  }
  return {
    cam, corte: 0, rot: ROT, fogo: 1, vapor: { gancho: 0.9, beirada: 0.35 }, tampa: { pos: 0, tremor: 1, estufa: 0.4 + 0.3 * Math.sin(x * 18) },
    pecas: TODAS, peso: { sobe: 0.3, giro: x * 3 }, pino: 0, pinoFech: 1, ferv: 1,
    marcas: { trab: pisca(x, 0), seg: pisca(x, 1), jan: pisca(x, 2), fech: pisca(x, 3) },
  };
}

// ------------------------------------------------------------------ estado por tempo
export function estado(t0: number, _dir: Dir): Estado {
  const t = t0;
  const x = tl(t);
  if (x < M.comum) {
    const e = gancho(x);
    e.tFix = x; // nos últimos 0,5 s o relógio da cena volta ao do começo: o último quadro é o quadro 0
    return withFoco(e, [0, 1.3, 0]);
  }
  const base: Estado = { cam: { pos: [0, 2, 8], alvo: [0, 0.8, 0], fov: 30 }, corte: 0, rot: ROT, fogo: 1, vapor: {}, tampa: { pos: 0 }, pecas: TODAS, ferv: 1 };

  // 2. panela comum aberta fervendo (corte), termômetro em 100 °C
  if (t < M.entao1) {
    const k = easeInOut(k01(t, M.comum, M.entao1));
    const al: V3 = [0, 0.35, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(7.2, 6.4, k), lerp(-0.2, 0.05, k), 0.3), alvo: al, fov: 30 }, corte: easeOut(k01(t, M.comum, M.comum + 0.6)), tampa: { pos: 1 }, pecas: NENHUMA, vapor: { aberta: 1 } }, [0, 0.6, 0]);
  }
  // 3. fecha a tampa; a pressão sobe; 120
  if (t < M.comida) {
    const fecha = easeOut(k01(t, M.fecha - 0.1, M.fecha + 0.45));
    const vap = k01(t, M.pressao1, M.cento);
    if (t < M.chega) {
      const k = easeInOut(k01(t, M.entao1, M.chega));
      const al: V3 = [0, 0.55, 0];
      return withFoco({ ...base, cam: { pos: orb(al, lerp(6.6, 6.0, k), lerp(0.18, 0.05, k), 0.3), alvo: al, fov: 30 }, corte: 1, tampa: { pos: 1 - fecha }, pecas: NENHUMA, vapor: { aberta: 1 - fecha, interno: vap } }, [0, 0.9, 0]);
    }
    const k = easeInOut(k01(t, M.chega, M.comida));
    const al: V3 = [0, 0.75, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(4.8, 4.2, k), lerp(-0.12, -0.02, k), 0.16), alvo: al, fov: 30 }, corte: 1, tampa: { pos: 0, tremor: 0.15 }, pecas: NENHUMA, vapor: { interno: 0.5 + vap * 0.5 } }, [0, 0.9, 0]);
  }
  // 3b. a comida fica pronta bem mais rápido (feijão em corte)
  if (t < M.mas1) {
    const k = easeInOut(k01(t, M.comida, M.mas1));
    const al: V3 = [0, 0.38, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(3.3, 2.8, k), lerp(0.3, 0.18, k), 0.12), alvo: al, fov: 30 }, corte: 1, pecas: NENHUMA, vapor: { interno: 1 }, ferv: 1.4 }, [0, 0.35, 0]);
  }
  // 4a. o vapor escapa pela beirada (panela inteira)
  if (t < M.entao2) {
    const k = easeInOut(k01(t, M.mas1, M.entao2));
    const al: V3 = [0.2, 1.1, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(4.6, 4.0, k), lerp(0.55, 0.4, k), 0.22), alvo: al, fov: 30 }, corte: 0, pecas: NENHUMA, vapor: { beirada: easeOut(k01(t, M.mas1, M.beirada)) }, tampa: { pos: 0, tremor: 0.2 } }, [0.9, 1.2, 0]);
  }
  // 4b. a tampa sobe, o anel de silicone desce para o lugar, a tampa fecha -> anel de vedação
  if (t < M.mas2) {
    const anel = easeInOut(k01(t, M.anelSil - 0.1, M.anelSil + 0.75));
    if (t < M.esseAnel) {
      const k = easeInOut(k01(t, M.entao2, M.esseAnel));
      const lift = easeOut(k01(t, M.entao2 - 0.1, M.entao2 + 0.5)) * (1 - easeInOut(k01(t, M.entreTampa + 0.45, M.entreTampa + 1.0)));
      const al: V3 = [0.1, 1.5, 0];
      return withFoco({ ...base, cam: { pos: orb(al, lerp(5.0, 4.5, k), lerp(-0.18, 0.08, k), 0.36), alvo: al, fov: 30 }, corte: 1, pecas: { ...NENHUMA, anel }, tampa: { pos: lift * 0.32 }, vapor: { beirada: (1 - lift) * (1 - anel) * 0.8, aberta: lift * 0.18, interno: 0.25 } }, [0.9, 1.4, 0]);
    }
    const k = easeInOut(k01(t, M.esseAnel, M.mas2));
    const al: V3 = [0, 1.0, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(5.6, 5.1, k), lerp(-0.25, -0.1, k), 0.38), alvo: al, fov: 30 }, corte: 1, pecas: { ...NENHUMA, anel: 1 }, vapor: { interno: 0.8 }, brilhoAnel: k01(t, M.vedacao - 0.1, M.vedacao + 0.2) * (1 - k01(t, M.mas2 - 0.3, M.mas2)) }, [0, 1.2, 0]);
  }
  // 5. a pressão sobe sem parar: tampa estufa e treme
  if (t < M.entao3) {
    const k = easeInOut(k01(t, M.mas2, M.entao3));
    const al: V3 = [0, 1.0, 0];
    const est = k01(t, M.mas2 + 0.4, M.entao3);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(5.6, 4.5, k), lerp(0.3, 0.2, k), lerp(0.22, 0.3, k)), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1 }, tampa: { pos: 0, tremor: 0.4 + est, estufa: est * (0.7 + 0.3 * Math.sin(t * 20)) }, vapor: {} }, [0, 1.3, 0]);
  }
  // 6a. furinho + peso (de cima)
  if (t < M.pontoCerto) {
    const k = easeInOut(k01(t, M.entao3, M.pontoCerto));
    const al: V3 = [0, 1.4, 0];
    const furo = easeOut(k01(t, M.furinho, M.furinho + 0.35));
    const peso = k01(t, M.peso, M.peso + 0.55);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(3.4, 2.9, k), lerp(0.4, 0.15, k), 0.62), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 0 }, furo, pesoCai: peso, tampa: { pos: 0, tremor: 1 - peso, estufa: 0.8 * (1 - peso) } as Estado["tampa"], vapor: { trab: furo * (1 - peso) * 0.7 } } as Estado, [0, 1.45, 0]);
  }
  // 6b. a pressão levanta o peso e o vapor sai
  if (t < M.essaTrab) {
    const k = easeInOut(k01(t, M.pontoCerto, M.essaTrab));
    const al: V3 = [0, 1.48, 0];
    const sobe = easeOut(k01(t, M.levanta, M.levanta + 0.4));
    return withFoco({ ...base, cam: { pos: orb(al, lerp(2.6, 2.2, k), lerp(-0.35, -0.15, k), lerp(0.1, 0.16, k)), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1 }, peso: { sobe, giro: sobe * (t - M.levanta) * 6 }, vapor: { trab: k01(t, M.vaporSai1 - 0.2, M.vaporSai1 + 0.2) }, tampa: { pos: 0, tremor: 0.3 * (1 - sobe) } }, al);
  }
  // 6c. essa é a válvula de trabalho / é ela que chia
  if (t < M.chiaE) {
    const k = easeInOut(k01(t, M.essaTrab, M.chiaE));
    const al: V3 = [0, 1.3, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(4.0, 3.4, k), lerp(0.55, 0.25, k), 0.36), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1 }, peso: { sobe: 1, giro: (t - M.levanta) * 6 }, vapor: { trab: 1 }, marcas: { trab: k01(t, M.trab, M.trab + 0.3), seg: 0, jan: 0, fech: 0 } }, [0, 1.45, 0]);
  }
  // 6d. o chiado (espaço sem fala): close no peso girando
  if (t < M.mas3) {
    const k = easeInOut(k01(t, M.chiaE, M.mas3));
    const al: V3 = [0, 1.7, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(2.7, 2.4, k), lerp(-0.25, 0.1, k), 0.03), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1 }, peso: { sobe: 1.15, giro: (t - M.levanta) * 6 + (t - M.chiaE) * 9 }, vapor: { trab: 1.3 }, marcas: { trab: 0.6, seg: 0, jan: 0, fech: 0 } }, al);
  }
  // 7. a espuma do feijão sobe e entope o furinho (corte)
  if (t < M.entao4) {
    const k = easeInOut(k01(t, M.mas3, M.entao4));
    const al: V3 = lv([0, 0.75, 0], [0, 1.0, 0], k);
    const esp = easeInOut(k01(t, M.espuma, M.entupirE));
    const ent = k01(t, M.entupir + 0.1, M.entupirE + 0.1);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(5.4, 4.6, k), lerp(0.12, 0.0, k), lerp(0.18, 0.26, k)), alvo: al, fov: 30 }, corte: easeOut(k01(t, M.mas3, M.mas3 + 0.5)), pecas: { ...NENHUMA, anel: 1, peso: 1 }, peso: { sobe: 1 - ent, giro: (t - M.levanta) * 6 * (1 - ent) }, espuma: esp, entupido: { trab: ent, seg: 0 }, vapor: { trab: 1 - ent, interno: 0.6 }, ferv: 1.2, tampa: { pos: 0, tremor: ent * 0.5 } }, [0, 1.1, 0]);
  }
  // 8a. outro furo: a válvula de segurança aparece na tampa (de cima)
  if (t < M.pino) {
    const k = easeInOut(k01(t, M.entao4, M.pino));
    const ps = mundo(P_SEG);
    const al: V3 = [ps[0] * 0.6, 1.42, ps[2] * 0.6];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(2.9, 2.6, k), lerp(0.5, 0.25, k), 0.55), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: easeOut(k01(t, M.outroFuro, M.outroFuro + 0.4)) }, espuma: 1, entupido: { trab: 1, seg: 0 }, tampa: { pos: 0, tremor: 0.5 }, vapor: {} }, ps);
  }
  // 8. o pino que sobe sozinho (corte: a espuma tampou o furinho do peso)
  if (t < M.essaSeg) {
    const k = easeInOut(k01(t, M.pino, M.essaSeg));
    const al: V3 = [0.15, 1.12, 0];
    const pino = clamp(easeOut(k01(t, M.sobe, M.sobe + 0.3)) * 1.1);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(4.6, 4.1, k), lerp(-0.18, 0.06, k), 0.3), alvo: al, fov: 30 }, corte: 1, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1 }, espuma: 1, entupido: { trab: 1, seg: 0 }, pino, vapor: { seg: k01(t, M.sobe + 0.1, M.sobe + 0.4), interno: 0.7 }, tampa: { pos: 0, tremor: 0.5 * (1 - pino) } }, [0.3, 1.3, 0]);
  }
  // 8b. essa é a válvula de segurança (close)
  if (t < M.duas) {
    const k = easeInOut(k01(t, M.essaSeg, M.duas));
    const al = mundo([P_SEG[0], P_SEG[1] + 0.06, P_SEG[2]]);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(2.3, 1.9, k), lerp(0.75, 0.5, k), 0.42), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1 }, espuma: 1, entupido: { trab: 1, seg: 0 }, pino: 1, vapor: { seg: 1 }, marcas: { trab: 0.6, seg: k01(t, M.seg, M.seg + 0.3), jan: 0, fech: 0 } }, al);
  }
  // 9a. e se as duas entupirem? (corte, as duas tampadas, ponteiro no vermelho)
  if (t < M.entao5) {
    const k = easeInOut(k01(t, M.duas, M.entao5));
    const al: V3 = [0.1, 1.15, 0];
    const ent2 = k01(t, M.duas + 0.2, M.duasE - 0.2);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(3.9, 3.3, k), lerp(0.1, -0.05, k), 0.28), alvo: al, fov: 30 }, corte: 1, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1 }, espuma: 1, entupido: { trab: 1, seg: ent2 }, pino: 1 - ent2, vapor: { seg: 1 - ent2, interno: 1 }, tampa: { pos: 0, tremor: 0.4 + 0.6 * ent2, estufa: 0.5 * ent2 }, marcas: { trab: 0.6, seg: 0.6, jan: 0, fech: 0 } }, [0.1, 1.3, 0]);
  }
  // 9b. janelinha na lateral; a pressão empurra o anel e o vapor sai
  if (t < M.essaLat) {
    const jan = mundo(P_JAN);
    const pressa = 1 - k01(t, M.vaporSai2, M.vaporSai2 + 0.8);
    const li = easeOut(k01(t, M.empurra, M.empurra + 0.45));
    const st = { ...base, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1, jan: easeOut(k01(t, M.janelinha, M.janelinha + 0.4)) }, espuma: 1, entupido: { trab: 1, seg: 1 }, lingua: li, vapor: { jan: k01(t, M.vaporSai2 - 0.15, M.vaporSai2 + 0.2) }, tampa: { pos: 0, tremor: 0.8 * pressa, estufa: 0.4 * pressa } } as Estado;
    const azJ = Math.atan2(jan[0], jan[2]);
    if (t < M.porOnde) {
      const k = easeInOut(k01(t, M.entao5, M.porOnde));
      const al: V3 = [jan[0] * 0.9, jan[1] + 0.05, jan[2] * 0.9];
      return withFoco({ ...st, cam: { pos: orb(al, lerp(2.4, 1.9, k), azJ + lerp(-0.45, -0.2, k), 0.18), alvo: al, fov: 30 } }, al);
    }
    const k = easeInOut(k01(t, M.porOnde, M.essaLat));
    const al: V3 = [jan[0] * 0.75, jan[1] + 0.05, jan[2] * 0.75];
    return withFoco({ ...st, cam: { pos: orb(al, lerp(3.2, 3.0, k), azJ + lerp(0.05, 0.25, k), 0.22), alvo: al, fov: 30 } }, jan);
  }
  // 9c. essa é a segurança lateral (abre o plano)
  if (t < M.mas4) {
    const k = easeInOut(k01(t, M.essaLat, M.mas4));
    const al: V3 = [0.4, 0.95, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(4.4, 5.0, k), lerp(1.05, 0.8, k), 0.3), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1, jan: 1 }, espuma: 1, entupido: { trab: 1, seg: 1 }, lingua: 1, vapor: { jan: 1 - 0.5 * k }, marcas: { trab: 0.6, seg: 0.6, jan: k01(t, M.lat, M.lat + 0.3), fech: 0 } }, mundo(P_JAN));
  }
  // 10a. alguém tenta abrir: a mão gira o cabo e a tampa não cede
  if (t < M.entao6) {
    const k = easeInOut(k01(t, M.mas4, M.entao6));
    const al = mundo([-(1.1 + 0.75), 1.5, 0]);
    const mao = easeOut(k01(t, M.mas4 + 0.2, M.abrir + 0.1));
    const forca = k01(t, M.abrir, M.abrir + 0.3) * (1 - k01(t, M.entao6 - 0.4, M.entao6));
    const giro = forca * 0.035 * Math.sin((t - M.abrir) * 26);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(3.4, 3.0, k), lerp(-0.25, -0.05, k), 0.38), alvo: al, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1, jan: 1 }, mao: { k: mao, giro }, tampa: { pos: 0, giro, tremor: 0.3 + forca * 0.6 }, peso: { sobe: 1, giro: t * 5 }, vapor: { trab: 0.5 } }, al);
  }
  // 10b. a válvula de fechamento aparece por fora (perto do cabo) e o pino sobe
  if (t < M.queTrava) {
    const k = easeInOut(k01(t, M.entao6, M.queTrava));
    const pf = mundo([P_FECH[0], P_FECH[1] + 0.05, P_FECH[2]]);
    const fech = easeOut(k01(t, M.porDentro, M.porDentro + 0.4));
    return withFoco({ ...base, cam: { pos: orb(pf, lerp(2.7, 2.3, k), lerp(-0.2, -0.45, k), 0.5), alvo: pf, fov: 30 }, corte: 0, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1, jan: 1, fech }, pinoFech: easeOut(k01(t, M.porDentro + 0.3, M.porDentro + 0.6)), mao: { k: 1, giro: 0 }, tampa: { pos: 0, tremor: 0.2 }, peso: { sobe: 1, giro: t * 5 }, vapor: { trab: 0.5 } }, pf);
  }
  // 10c. que trava a tampa (corte, cadeado de vapor acende; a mão força e nada)
  if (t < M.essaFech) {
    const k = easeInOut(k01(t, M.queTrava, M.essaFech));
    const pc = mundo(P_CADEADO);
    const al: V3 = [pc[0] * 0.6, 1.05, 0];
    const fech = easeOut(k01(t, M.porDentro, M.porDentro + 0.4));
    const cad = easeOut(k01(t, M.trava, M.trava + 0.35));
    const forca = k01(t, M.enquanto, M.enquanto + 0.25) * (1 - k01(t, M.essaFech - 0.3, M.essaFech));
    const giro = forca * 0.025 * Math.sin((t - M.enquanto) * 30);
    return withFoco({ ...base, cam: { pos: orb(al, lerp(3.7, 3.2, k), lerp(-0.32, -0.12, k), 0.26), alvo: al, fov: 30 }, corte: 1, pecas: { ...NENHUMA, anel: 1, peso: 1, seg: 1, jan: 1, fech: 1 }, pinoFech: 1, cadeado: cad, mao: { k: 1, giro }, tampa: { pos: 0, giro, tremor: forca * 0.6 }, peso: { sobe: 1, giro: t * 5 }, vapor: { trab: 0.5, interno: 0.8 } }, pc);
  }
  // 10c. essa é a válvula de fechamento
  if (t < M.parabens) {
    const k = easeInOut(k01(t, M.essaFech, M.parabens));
    const pf = mundo([P_FECH[0], P_FECH[1] + 0.05, P_FECH[2]]);
    return withFoco({ ...base, cam: { pos: orb(pf, lerp(2.4, 2.0, k), lerp(-0.85, -0.6, k), 0.5), alvo: pf, fov: 30 }, corte: 0, pecas: TODAS, pinoFech: 1, cadeado: 1, mao: { k: 1 - easeInOut(k01(t, M.fech + 0.2, M.parabens)), giro: 0 }, peso: { sobe: 1, giro: t * 5 }, vapor: { trab: 0.5 }, marcas: { trab: 0.6, seg: 0.6, jan: 0.6, fech: k01(t, M.fech, M.fech + 0.3) } }, pf);
  }
  // 11. Parabéns! A panela inteira em corte, câmera girando, 4 defesas acesas
  if (t < M.virada) {
    const k = k01(t, M.parabens, M.virada);
    const al: V3 = [0, 0.75, 0];
    return withFoco({ ...base, cam: { pos: orb(al, lerp(7.4, 6.6, k), lerp(-0.75, 0.75, easeInOut(k)), lerp(0.42, 0.3, k)), alvo: al, fov: 30 }, corte: 1, pecas: TODAS, pinoFech: 1, cadeado: 1, espuma: 0, peso: { sobe: 1, giro: t * 5 }, pino: 0.15, vapor: { trab: 0.7, interno: 0.7 }, marcas: { trab: 1, seg: 1, jan: 1, fech: 1 } }, [0, 0.9, 0]);
  }
  // 12. virada: congela em M.virada e vira arame laranja + partículas
  if (t < M.comenta) {
    const kf = k01(M.virada - 0.001, M.parabens, M.virada);
    const k = easeInOut(k01(t, M.virada, M.comenta));
    const al: V3 = [0, 0.75, 0];
    return { ...base, cam: { pos: orb(al, lerp(6.6, 8.2, k), lerp(0.75, 1.4, k), lerp(0.3, 0.42, k)), alvo: al, fov: 30 }, corte: 1, pecas: TODAS, pinoFech: 1, cadeado: 0, peso: { sobe: 1, giro: M.virada * 5 }, vapor: {}, fogo: 1, wire: t >= M.virada + 0.05 ? 1 : 0, part: easeInOut(k01(t, M.virada + 0.5, M.comenta)) * 0.6, foco: 0.5, congelado: kf } as Estado;
  }
  // 13. PLAY: a panela inteira de volta ao fogo; a câmera vai para o enquadramento do gancho
  const k = easeInOut(k01(t, M.comenta, LOOP0));
  const g = gancho(-0.5);
  const al: V3 = [0, 0.55, 0];
  const cam = { pos: lv(orb(al, 9.5, 0.9, 0.5), g.cam.pos, k), alvo: lv([0, 0.6, 0], g.cam.alvo, k), fov: 30 };
  return withFoco({ ...g, cam, tampa: { pos: 0, tremor: k, estufa: 0.3 * k }, marcas: { trab: k * pisca(t, 0), seg: k * pisca(t, 1), jan: k * pisca(t, 2), fech: k * pisca(t, 3) }, vapor: { gancho: 0.4 + 0.5 * k, beirada: 0.35 * k } }, [0, 1.0, 0]);
}

// foco do tilt-shift (A) no ponto que importa do plano
function withFoco(e: Estado, p: V3): Estado {
  const [, y] = projeta(e, p);
  e.foco = clamp(1 - y / 1920, 0.15, 0.85);
  return e;
}

// ------------------------------------------------------------------ projeção (para ancorar textos na cena)
const camTmp = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.05, 400);
export function projeta(e: Estado, p: V3): [number, number, boolean] {
  const c = e.cam;
  camTmp.position.set(...c.pos);
  camTmp.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
  camTmp.lookAt(...c.alvo);
  camTmp.fov = c.fov;
  camTmp.updateProjectionMatrix();
  camTmp.updateMatrixWorld();
  const v3 = new THREE.Vector3(...p).project(camTmp);
  return [(v3.x * 0.5 + 0.5) * 1080, (1 - (v3.y * 0.5 + 0.5)) * 1920, v3.z < 1];
}
export { H, P_TRAB, P_SEG, P_JAN, P_FECH, P_CADEADO };

// ------------------------------------------------------------------ capa: a panela em corte com as 4 defesas acesas
export function estadoCapa(): Estado {
  const al: V3 = [0, 1.15, 0];
  const e: Estado = {
    cam: { pos: orb(al, 5.6, 0.18, 0.36), alvo: al, fov: 30 }, corte: 1, rot: ROT, fogo: 1, ferv: 1,
    vapor: { trab: 0.8, interno: 0.6 }, tampa: { pos: 0 }, pecas: TODAS, pinoFech: 1, cadeado: 1, pino: 0.6, lingua: 0.6,
    peso: { sobe: 1, giro: 0.6 }, marcas: { trab: 1, seg: 1, jan: 1, fech: 1 },
  };
  return withFoco(e, [0, 1.2, 0]);
}
