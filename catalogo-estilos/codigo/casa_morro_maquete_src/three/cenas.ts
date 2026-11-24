import * as THREE from "three";
import { DURACAO, GAPS, PALAVRAS } from "../fala";
import type { Dir } from "./kit";
import type { Estado, Escav, Jato } from "./mundo";
import { LTOT, ptCaminho, RI, S_CURVA, S_QUARTO, V0, V3, XC, XF, ZF, ZQ } from "./geo";
import { clamp, easeInOut, lerp } from "./rng";
import { altura } from "./terreno";
import { P_TUBO_COR } from "./casa";

// ------------------------------------------------------------------ marcas da fala (achadas pelo texto)
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const PN = PALAVRAS.map((p) => norm(p.w));
export function acha(frase: string, desde = 0): number {
  const f = frase.split(" ").map(norm);
  for (let i = desde; i <= PN.length - f.length; i++) if (f.every((w, j) => PN[i + j] === w)) return i;
  throw new Error("frase não achada: " + frase);
}
const S = (frase: string, desde = 0) => PALAVRAS[acha(frase, desde)].s;
const E = (frase: string, desde = 0) => PALAVRAS[acha(frase, desde) + frase.split(" ").length - 1].e;

export const T_LAST = (Math.round(DURACAO * 30) - 1) / 30;
export const LOOP0 = T_LAST - 0.5;
export const tl = (t: number) => (t >= LOOP0 ? t - T_LAST : t);

export const M = {
  cavar: S("cavar"),
  porta: S("porta"),
  portaE: E("porta"),
  voceTem: S("voce tem uma casa"),
  casa: S("casa"),
  casaE: E("casa"),
  mas1: S("mas na primeira"),
  chuva: S("chuva"),
  teto: S("o teto vira lama"),
  lama: S("lama"),
  cai: S("cai na sua cama"),
  cama: S("cama"),
  camaE: E("cama"),
  entao1: S("entao voce faz"),
  curvo: S("curvo"),
  concreto: S("concreto"),
  concretoE: E("concreto"),
  joga: S("joga o peso"),
  paredes: S("paredes"),
  paredesE: E("paredes"),
  agora1: S("agora ele aguenta"),
  aguenta: S("aguenta"),
  mas2: S("mas a agua"),
  agua: S("agua", acha("mas a agua")),
  atravessa: S("atravessa"),
  concreto2: S("concreto", acha("atravessa")),
  pinga: S("pinga"),
  cabeca: S("cabeca"),
  cabecaE: E("cabeca"),
  entao2: S("entao voce embrulha"),
  embrulha: S("embrulha"),
  manta: S("manta"),
  mantaE: E("manta"),
  antes: S("antes de jogar"),
  jogar: S("jogar a terra"),
  terra: S("terra de volta"),
  volta: S("volta"),
  voltaE: E("volta"),
  agora2: S("agora esta seco"),
  seco: S("seco"),
  mas3: S("mas mesmo ao"),
  meioDia: S("meio-dia"),
  escuro: S("escuro como"),
  caverna: S("caverna"),
  cavernaE: E("caverna"),
  entao3: S("entao voce abre"),
  abre: S("abre a frente"),
  frente: S("frente do morro"),
  norte: S("norte"),
  lado: S("o lado do sol"),
  sol: S("sol no brasil"),
  brasilE: E("brasil"),
  enche: S("enche de vidro"),
  vidro: S("vidro"),
  vidroE: E("vidro"),
  mas4: S("mas o fundo"),
  fundo: S("fundo"),
  escuro2: S("escuro", acha("mas o fundo")),
  entao4: S("entao voce desce"),
  desce: S("desce tubos"),
  espelhados: S("espelhados"),
  alto: S("alto do morro"),
  morro2E: E("alto do morro"),
  luzSol: S("a luz do sol vem"),
  quicando: S("quicando"),
  dentroE: E("la dentro"),
  isso: S("isso e um tubo"),
  tubo: S("tubo de luz"),
  luzE: E("tubo de luz"),
  circulo: S("circulo"),
  brilha: S("brilha"),
  corredores: S("corredores"),
  sem: S("sem lampada"),
  lampada: S("lampada nenhuma"),
  nenhumaE: E("nenhuma"),
  manda: S("manda para aquele"),
  hobbit: S("hobbit"),
  hobbitE: E("hobbit"),
  verao: S("no verao"),
  paredes2: S("paredes frias"),
  suar: S("suar"),
  suarE: E("suar"),
  entao5: S("entao voce liga"),
  liga: S("liga um"),
  desu: S("desumidificador"),
  desuE: E("desumidificador"),
  ai: S("ai vem"),
  onda: S("onda de calor"),
  calorE: E("onda de calor"),
  vizinho: S("vizinho"),
  ar: S("ar no maximo"),
  maximoE: E("maximo"),
  sua: S("e a sua casa"),
  fresca: S("fresca"),
  frescaE: E("fresca"),
  pesq: S("pesquisadores"),
  mediramE: E("mediram"),
  solo: S("no solo do rio"),
  calor2: S("o calor do dia"),
  some: S("some antes"),
  quarenta: S("40"),
  terraE: E("40 centimetros de terra"),
  parabens: S("parabens"),
  voce2: S("voce construiu"),
  construiu: S("construiu"),
  morroE: E("dentro do morro"),
  virada: GAPS.VIRADA,
  esse: S("esse video foi"),
  ia: S("ia"),
  iaE: E("ia"),
  ate: S("ate a minha voz"),
  voz: S("voz"),
  vozE: E("voz"),
  quer: S("quer aprender"),
  assim2E: E("fazer videos assim"),
  comenta: S("comenta play"),
  play: S("play que"),
  link: S("link do grupo"),
  lancamento: S("lancamento"),
  doPrompt: S("do prompt ao play"),
};

const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// ------------------------------------------------------------------ câmera: tomadas com chaves
type Cam = { pos: V3; alvo: V3; fov: number; rolo?: number };
type Chave = [number, Cam];
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export function tomada(t: number, ch: Chave[], ease = easeInOut): Cam {
  if (t <= ch[0][0]) return ch[0][1];
  for (let i = 0; i < ch.length - 1; i++) {
    const [t0, c0] = ch[i], [t1, c1] = ch[i + 1];
    if (t <= t1) {
      const k = ease(k01(t, t0, t1));
      return { pos: lerpV(c0.pos, c1.pos, k), alvo: lerpV(c0.alvo, c1.alvo, k), fov: lerp(c0.fov, c1.fov, k), rolo: lerp(c0.rolo ?? 0, c1.rolo ?? 0, k) };
    }
  }
  return ch[ch.length - 1][1];
}
export const orb = (alvo: V3, dist: number, alt: number, ang: number, fov: number): Cam => {
  const a = (ang * Math.PI) / 180;
  return { pos: [alvo[0] + Math.sin(a) * dist, alvo[1] + alt, alvo[2] + Math.cos(a) * dist], alvo, fov };
};

// ------------------------------------------------------------------ escavadeira (cinemática direta igual à do modelo)
const LL = 0.62, LB = 0.46;
const POSE = {
  cava: { aL: 0.43, aB: -0.88, aC: -0.5 },
  ergue: { aL: 0.95, aB: -1.35, aC: 0.75 },
  alto: { aL: 1.05, aB: -0.55, aC: 0.4 },
  despeja: { aL: 0.95, aB: -0.5, aC: -1.3 },
};
type Pose = { aL: number; aB: number; aC: number };
const mixP = (a: Pose, b: Pose, k: number): Pose => ({ aL: lerp(a.aL, b.aL, k), aB: lerp(a.aB, b.aB, k), aC: lerp(a.aC, b.aC, k) });
function pontaCacamba(es: Escav): V3 {
  // pivô da lança no mundo
  const ry = es.ry + es.giro;
  const fwd = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry));
  const piv = new THREE.Vector3(es.x, 0.29, es.z).addScaledVector(fwd, 0.17);
  const a1 = es.aL, a2 = es.aL + es.aB;
  const h = LL * Math.cos(a1) + LB * Math.cos(a2);
  const y = 0.29 + LL * Math.sin(a1) + LB * Math.sin(a2) - 0.08;
  const p = piv.addScaledVector(fwd, h);
  return [p.x, y, p.z];
}

// ------------------------------------------------------------------ estado em função do tempo
const base = (): Estado => ({
  cam: { pos: [-4, 2, 5], alvo: [0, 0.5, 0], fov: 32 },
  terra: 1, buraco: 1, moveis: 1, luzCasa: 1, amb: 1, chuva: 0, ceuChuva: 0, lamaTeto: 0, lamaCai: 0,
  conc: 1, setas: 0, vigas: 1, pessoa: 0, agua: 0, pingo: 0, manta: 1, franja: 1, cresce: 1, jatos: [],
  porta: 1, frente: 1, vidro: 1, sala: 1, extras: 1, fumaca: 1, solArco: 0, bussola: 0,
  tubos: 1, raio: 1, luzTubo: 1, luzTubo2: 1, suor: 0, seca: 0, arUmido: 0, desu: 1, desuLiga: 1,
  vizinhos: 0, calor: 0, calorSolo: 0, frio: 0, regua: 0,
});
/** antes da obra (estado das cenas 1 e 2) */
const obraZero = (e: Estado) =>
  Object.assign(e, { conc: 0, vigas: 0, manta: 0, frente: 0, vidro: 0, sala: 0, extras: 0, fumaca: 0, tubos: 0, raio: 0, luzTubo: 0, luzTubo2: 0, desu: 0, desuLiga: 0, franja: 0 });

let FOCO: V3 = [0, 0, 0];
const P_ESC: [number, number] = [XF, 2.5];

export function estado(tt: number, dir: Dir): Estado {
  const t = tl(tt);
  const e = base();
  FOCO = [-1.2, 0.5, -0.8];

  if (t < M.mas1) {
    // ---------------- GANCHO: a escavadeira crava a pá no morro, a porta redonda cai, o corte abre e mostra a casa
    obraZero(e);
    e.buraco = k01(t, M.voceTem - 0.15, M.casa + 0.2);
    e.moveis = k01(t, M.voceTem, M.casa + 0.45);
    e.luzCasa = k01(t, M.casa - 0.1, M.casa + 0.3);
    // a porta já paira sobre o buraco desde o 1º quadro e cai na palavra "porta"
    e.porta = lerp(0.015, 1, k01(t, M.porta - 0.42, M.portaE + 0.1));
    e.tunel = 1;
    e.fech = 1;
    // ciclo da escavadeira: cava (terra voando) -> ergue -> gira e despeja ao lado
    const es: Escav = { vis: 1, x: P_ESC[0], z: P_ESC[1], ry: 0, giro: 0, ...POSE.cava, cheia: 0 };
    let pose: Pose;
    if (t < 0.6) {
      const k = easeInOut(k01(t, -0.05, 0.6));
      pose = mixP(POSE.cava, POSE.ergue, k);
      es.cheia = k;
    } else if (t < 1.25) {
      const k = easeInOut(k01(t, 0.6, 1.25));
      pose = mixP(POSE.ergue, POSE.despeja, k);
      es.giro = lerp(0, 1.15, k);
      es.cheia = 1 - k01(t, 1.05, 1.25);
    } else {
      const k = easeInOut(k01(t, 1.25, 2.4));
      pose = mixP(POSE.despeja, POSE.alto, k);
      es.giro = lerp(1.15, 1.35, k);
    }
    Object.assign(es, pose);
    e.escav = es;
    const pc = pontaCacamba({ ...es, ...POSE.cava, giro: 0 });
    // terra voando da pá desde o primeiro quadro
    e.jatos = [
      { t: -0.55, de: pc, para: [pc[0] - 0.25, 0.05, pc[2] + 0.55], n: 26, dur: 0.75, seed: 11 },
      { t: -0.15, de: pc, para: [pc[0] + 0.3, 0.05, pc[2] + 0.5], n: 22, dur: 0.75, seed: 12 },
    ];
    const pd = pontaCacamba(es);
    if (t > 0.95) e.jatos.push({ t: 1.08, de: pd, para: [pd[0] + 0.15, 0.04, pd[2] + 0.05], n: 20, dur: 0.55, seed: 13 });
    e.cam = tomada(t, [
      [-0.5, { pos: [-1.9, 2.3, 7.0], alvo: [0.3, 0.55, 1.45], fov: 31 }],
      [M.voceTem - 0.06, { pos: [-1.55, 2.0, 6.3], alvo: [0.4, 0.5, 1.4], fov: 31 }],
      // corte seco para o corte do morro: a casa aparece
      [M.voceTem - 0.05, { pos: [-6.4, 1.55, 0.55], alvo: [-1.2, 0.68, -0.72], fov: 30 }],
      [M.mas1, { pos: [-5.9, 1.42, 0.3], alvo: [-1.2, 0.66, -0.74], fov: 30 }],
    ], (x) => x);
    FOCO = t < M.voceTem ? [XF, 0.3, ZF] : [XC, 0.35, ZQ];
  } else if (t < M.entao1) {
    // ---------------- A CHUVA: o teto de terra vira lama e cai na cama
    obraZero(e);
    e.escav = undefined;
    e.ceuChuva = k01(t, M.mas1, M.chuva + 0.2);
    e.chuva = k01(t, M.mas1 + 0.2, M.chuva) * (1 - k01(t, M.camaE + 0.2, M.entao1));
    e.lamaTeto = k01(t, M.teto - 0.1, M.lama + 0.3);
    e.lamaCai = k01(t, M.cai - 0.05, M.camaE + 0.05);
    e.amb = lerp(1, 0.6, e.ceuChuva);
    e.cam = tomada(t, [
      [M.mas1, { pos: [-6.3, 2.5, 0.9], alvo: [-1.0, 1.2, -0.5], fov: 31 }],
      [M.chuva + 0.3, { pos: [-6.2, 2.3, 0.7], alvo: [-1.0, 1.1, -0.55], fov: 31 }],
      [M.teto - 0.1, { pos: [-5.2, 1.05, -0.25], alvo: [-1.1, 0.55, -0.8], fov: 30 }],
      [M.entao1, { pos: [-4.4, 0.9, -0.45], alvo: [-1.05, 0.45, -0.82], fov: 30 }],
    ]);
    FOCO = [XC, 0.3, ZQ];
  } else if (t < M.agora1) {
    // ---------------- TETO CURVO DE CONCRETO: a vala abre, o arco desce e assenta; setas do peso; vigas por dentro
    obraZero(e);
    e.ceuChuva = 1 - k01(t, M.entao1, M.entao1 + 0.8);
    e.terra = 1 - k01(t, M.entao1 + 0.05, M.curvo - 0.05) * (1 - k01(t, M.paredesE - 0.1, M.agora1 + 0.15));
    e.conc = k01(t, M.concreto - 0.6, M.concreto + 0.45);
    e.setas = k01(t, M.joga - 0.1, M.paredesE + 0.15);
    e.vigas = k01(t, M.paredesE - 0.2, M.agora1 + 0.3);
    e.cresce = 0;
    // terra saindo da vala
    e.jatos = [
      { t: M.entao1 + 0.05, de: [-0.6, 0.6, -0.8], para: [-0.6, 0.05, -2.2], n: 24, dur: 0.6, seed: 21 },
      { t: M.entao1 + 0.25, de: [0.5, 0.6, 0.2], para: [1.6, 0.4, 0.6], n: 24, dur: 0.6, seed: 22 },
    ];
    if (t < M.joga - 0.15) {
      e.cam = tomada(t, [
        [M.entao1, { pos: [-5.4, 4.1, 3.0], alvo: [-0.4, 0.6, -0.3], fov: 32 }],
        [M.joga - 0.15, { pos: [-5.3, 3.4, 2.1], alvo: [-0.6, 0.6, -0.5], fov: 32 }],
      ]);
      FOCO = [-0.8, 0.6, -0.7];
    } else {
      e.cam = tomada(t, [
        [M.joga - 0.15, { pos: [-6.1, 1.0, -0.62], alvo: [-1.5, 0.62, -0.8], fov: 31 }],
        [M.agora1, { pos: [-5.5, 0.92, -0.66], alvo: [-1.4, 0.55, -0.8], fov: 31 }],
      ]);
      FOCO = [XC, 0.5, ZQ];
    }
  } else if (t < M.entao2) {
    // ---------------- A ÁGUA ATRAVESSA O CONCRETO E PINGA NA CABEÇA
    obraZero(e);
    e.conc = 1;
    e.vigas = 1;
    e.pessoa = k01(t, M.agora1, M.aguenta + 0.3);
    e.ceuChuva = k01(t, M.mas2 - 0.3, M.mas2 + 0.4);
    e.chuva = k01(t, M.mas2 - 0.2, M.agua) * (1 - k01(t, M.pinga - 0.2, M.pinga));
    e.agua = Math.max(0, t - M.mas2) * 0.55;
    e.pingo = k01(t, M.concreto2, M.cabeca + 0.15);
    e.amb = lerp(1, 0.7, e.ceuChuva);
    e.cam = tomada(t, [
      [M.agora1, { pos: [-5.5, 0.92, -0.66], alvo: [-1.4, 0.55, -0.8], fov: 31 }],
      [M.mas2, { pos: [-5.6, 1.35, -0.5], alvo: [-1.4, 0.88, -0.78], fov: 31 }],
      [M.pinga - 0.3, { pos: [-4.4, 0.95, -0.55], alvo: [-1.1, 0.55, -0.72], fov: 30 }],
      [M.entao2, { pos: [-3.5, 0.7, -0.6], alvo: [-1.0, 0.45, -0.68], fov: 30 }],
    ]);
    FOCO = t < M.pinga - 0.3 ? [XC, 0.85, ZQ] : [P_TUBO_COR[0] * 0 - 0.98, 0.4, -0.66];
  } else if (t < M.agora2) {
    // ---------------- MANTA: a vala abre, a manta desenrola por fora do arco, a escavadeira joga a terra de volta
    obraZero(e);
    e.conc = 1;
    e.vigas = 1;
    e.pessoa = 1;
    e.terra = 1 - k01(t, M.entao2, M.embrulha + 0.1) * (1 - k01(t, M.terra - 0.15, M.voltaE + 0.1));
    e.manta = k01(t, M.embrulha - 0.05, M.manta + 0.25);
    e.cresce = k01(t, M.voltaE - 0.2, M.agora2 + 0.3);
    e.franja = k01(t, M.voltaE - 0.1, M.agora2 + 0.5);
    const es: Escav = { vis: 1, x: XF + 0.95, z: 2.55, ry: 0.55, giro: 0, ...POSE.alto, cheia: 1 };
    const kd = easeInOut(k01(t, M.jogar - 0.3, M.terra + 0.1));
    Object.assign(es, mixP(POSE.alto, POSE.despeja, kd));
    es.cheia = 1 - k01(t, M.terra - 0.05, M.voltaE);
    e.escav = es;
    const pc = pontaCacamba(es);
    e.jatos = [
      { t: M.entao2 + 0.05, de: [-0.5, 0.6, -0.8], para: [-0.4, 0.05, -2.2], n: 20, dur: 0.55, seed: 31 },
      { t: M.terra - 0.1, de: pc, para: [0.3, 1.2, -0.2], n: 30, dur: 0.7, seed: 32 },
      { t: M.terra + 0.15, de: pc, para: [-0.7, 1.2, -0.75], n: 30, dur: 0.75, seed: 33 },
    ];
    e.cam = tomada(t, [
      [M.entao2, { pos: [-3.9, 5.0, 5.6], alvo: [-0.1, 0.5, -0.05], fov: 33 }],
      [M.antes, { pos: [-3.5, 4.7, 5.4], alvo: [0.0, 0.5, 0.0], fov: 33 }],
      [M.voltaE, { pos: [-2.0, 1.75, 5.6], alvo: [0.45, 0.6, 1.1], fov: 32 }],
      [M.agora2, { pos: [-1.7, 1.35, 5.2], alvo: [0.55, 0.52, 1.25], fov: 31 }],
    ]);
    FOCO = t < M.antes ? [0, 0.6, 0] : [XF, 0.5, ZF];
  } else if (t < M.entao3) {
    // ---------------- SECO, MAS ESCURO COMO UMA CAVERNA
    obraZero(e);
    Object.assign(e, { conc: 1, vigas: 1, manta: 1, franja: 1, pessoa: 1 });
    if (t < M.mas3) {
      e.cam = tomada(t, [[M.agora2, { pos: [-5.3, 0.95, -0.5], alvo: [-1.2, 0.52, -0.8], fov: 31 }], [M.mas3, { pos: [-5.0, 0.9, -0.55], alvo: [-1.2, 0.5, -0.8], fov: 31 }]], (x) => x);
      FOCO = [XC, 0.4, ZQ];
    } else if (t < M.escuro - 0.1) {
      // meio-dia: o sol a pino em cima do morro
      e.sol = [0.4, lerp(2.4, 3.25, easeInOut(k01(t, M.mas3, M.meioDia + 0.3))), 0.3];
      e.cam = tomada(t, [[M.mas3, { pos: [-5.0, 1.8, 6.2], alvo: [0.2, 1.3, 0.1], fov: 34 }], [M.escuro - 0.1, { pos: [-4.8, 1.7, 5.9], alvo: [0.2, 1.6, 0.1], fov: 34 }]]);
      FOCO = [0.3, 1.3, 0.2];
    } else {
      // dentro: breu, só o abajur
      e.amb = lerp(1, 0.05, k01(t, M.escuro - 0.1, M.escuro + 0.25));
      e.luzCasa = 1;
      e.cam = tomada(t, [[M.escuro - 0.1, { pos: [-5.0, 0.9, -0.5], alvo: [-1.2, 0.48, -0.8], fov: 31 }], [M.entao3, { pos: [-4.4, 0.8, -0.58], alvo: [-1.15, 0.45, -0.8], fov: 30 }]]);
      FOCO = [XC, 0.4, ZQ];
    }
  } else if (t < M.mas4) {
    // ---------------- FRENTE PARA O NORTE, CHEIA DE VIDRO
    obraZero(e);
    Object.assign(e, { conc: 1, vigas: 1, manta: 1, franja: 1, pessoa: 1 });
    e.frente = k01(t, M.abre - 0.05, M.morro2E * 0 + M.norte);
    e.bussola = k01(t, M.norte - 0.15, M.norte + 0.45);
    e.solArco = 0;
    const ks = easeInOut(k01(t, M.lado - 0.1, M.vidroE + 0.6));
    const ip = Math.min(60, Math.floor(lerp(8, 34, ks)));
    const pS = (dir === "A" ? 1 : 1) && ptsArco(ip);
    e.sol = undefined;
    void pS;
    e.solEsc = 0.4;
    e.vidro = k01(t, M.enche - 0.15, M.vidroE + 0.25);
    e.sala = k01(t, M.vidroE - 0.05, M.vidroE + 0.6);
    e.extras = k01(t, M.vidroE, M.vidroE + 0.5);
    e.amb = lerp(0.35, 1, e.sala);
    e.cam = tomada(t, [
      [M.entao3, { pos: [-2.6, 1.6, 5.9], alvo: [0.5, 0.55, 1.2], fov: 32 }],
      [M.norte, { pos: [-5.3, 2.4, 6.4], alvo: [0.2, 0.85, 1.6], fov: 34 }],
      [M.enche - 0.2, { pos: [-4.6, 2.1, 6.3], alvo: [0.35, 0.75, 1.5], fov: 34 }],
      [M.mas4, { pos: [-1.9, 1.15, 5.3], alvo: [0.6, 0.45, 1.25], fov: 31 }],
    ]);
    FOCO = [XF, 0.4, ZF];
  } else if (t < M.isso) {
    // ---------------- O FUNDO CONTINUA ESCURO: tubos espelhados do alto do morro, a luz quica e acende o quarto
    Object.assign(e, { tubos: 0, raio: 0, luzTubo: 0, luzTubo2: 0, desu: 0, desuLiga: 0, extras: 1, fumaca: 0 });
    e.pessoa = 1;
    e.luzCasa = 0;
    e.tubos = k01(t, M.desce - 0.1, M.alto + 0.2);
    e.raio = k01(t, M.luzSol - 0.05, M.quicando + 0.35);
    e.luzTubo = k01(t, M.quicando + 0.1, M.dentroE);
    e.luzTubo2 = e.luzTubo;
    e.amb = lerp(0.07, 0.75, e.luzTubo);
    if (t < M.entao4) {
      e.cam = tomada(t, [[M.mas4, { pos: [-5.3, 1.0, -0.35], alvo: [-1.2, 0.55, -0.8], fov: 31 }], [M.entao4, { pos: [-5.0, 0.95, -0.45], alvo: [-1.2, 0.55, -0.8], fov: 31 }]], (x) => x);
      FOCO = [XC, 0.45, ZQ];
    } else if (t < M.luzSol - 0.1) {
      e.cam = tomada(t, [[M.entao4, { pos: [-5.6, 3.5, 1.5], alvo: [-0.7, 1.3, -0.6], fov: 33 }], [M.luzSol - 0.1, { pos: [-5.3, 3.0, 1.1], alvo: [-0.9, 1.2, -0.7], fov: 33 }]]);
      FOCO = [-1.0, 1.3, -0.7];
    } else {
      e.cam = tomada(t, [[M.luzSol - 0.1, { pos: [-5.5, 1.15, -0.3], alvo: [-1.5, 0.9, -0.8], fov: 31 }], [M.isso, { pos: [-5.0, 0.95, -0.42], alvo: [-1.3, 0.62, -0.8], fov: 31 }]]);
      FOCO = [XC, 0.8, ZQ];
    }
  } else if (t < M.manda) {
    // ---------------- O CÍRCULO NO TETO DO CORREDOR, SEM LÂMPADA
    Object.assign(e, { desu: 0, desuLiga: 0, extras: 1 });
    e.pessoa = 1;
    e.luzCasa = 0;
    e.amb = 0.45;
    const sC = S_CURVA + (S_QUARTO - S_CURVA) / 2;
    const p0 = ptCaminho(sC + 0.5, 0.12, 0.09);
    const p1 = ptCaminho(sC + 0.32, 0.08, 0.08);
    const alvo: V3 = [P_TUBO_COR[0], V0 + RI, P_TUBO_COR[2]];
    const k = easeInOut(k01(t, M.isso, M.manda));
    e.cam = { pos: lerpV(p0, p1, k), alvo: lerpV([alvo[0] - 0.05, alvo[1], alvo[2] - 0.05], alvo, k), fov: 58, rolo: lerp(-0.25, 0.2, k) };
    FOCO = alvo;
  } else if (t < M.verao) {
    // ---------------- ENVIO: a porta redonda ao fundo (o celular é motion por cima)
    Object.assign(e, { desu: 0, desuLiga: 0, extras: 1 });
    e.pessoa = 1;
    const k = k01(t, M.manda, M.verao);
    e.cam = { pos: lerpV([-1.5, 0.8, 5.1], [-1.25, 0.72, 4.8], k), alvo: [XF, 0.4, ZF], fov: 30 };
    FOCO = [XF, 0.35, ZF];
  } else if (t < M.ai) {
    // ---------------- PAREDES SUANDO E O DESUMIDIFICADOR
    e.pessoa = 0;
    e.desu = k01(t, M.desu - 0.45, M.desu + 0.3);
    e.desuLiga = k01(t, M.desu + 0.25, M.desu + 0.45);
    e.suor = k01(t, M.paredes2 - 0.2, M.suarE + 0.2);
    e.seca = k01(t, M.desu + 0.4, M.ai);
    e.arUmido = k01(t, M.verao, M.paredes2) * (1 - k01(t, M.desuE + 0.4, M.ai));
    e.luzCasa = 1;
    e.amb = 0.85;
    e.luzTubo = 0.35;
    e.luzTubo2 = 0.35;
    e.cam = tomada(t, [
      [M.verao, { pos: [-4.0, 0.75, -1.15], alvo: [-1.3, 0.4, -0.5], fov: 30 }],
      [M.suarE, { pos: [-3.5, 0.62, -1.05], alvo: [-1.3, 0.38, -0.48], fov: 30 }],
      [M.ai, { pos: [-3.8, 0.66, -1.1], alvo: [-1.3, 0.3, -0.52], fov: 30 }],
    ]);
    FOCO = [-1.3, 0.35, -0.45];
  } else if (t < M.pesq) {
    // ---------------- ONDA DE CALOR: os vizinhos no ar-condicionado no máximo
    e.pessoa = 1;
    e.vizinhos = k01(t, M.vizinho - 0.35, M.vizinho + 0.4);
    e.calor = k01(t, M.onda - 0.1, M.calorE + 0.3);
    e.sol = [1.8, 3.6, 2.4];
    e.frio = k01(t, M.sua, M.fresca);
    e.cam = tomada(t, [
      [M.ai, { pos: [9.6, 5.0, 8.4], alvo: [2.2, 0.45, 0.35], fov: 33 }],
      [M.pesq, { pos: [9.0, 4.4, 9.0], alvo: [2.0, 0.45, 0.4], fov: 33 }],
    ]);
    FOCO = [2.6, 0.4, 0.6];
  } else if (t < M.parabens) {
    // ---------------- A PROVA: régua no corte, o calor do dia some antes dos 40 cm
    e.pessoa = 1;
    e.regua = k01(t, M.pesq - 0.2, M.pesq + 0.35);
    e.calorSolo = k01(t, M.solo, M.calor2 + 0.4);
    e.sol = [-2.2, 3.4, 2.2];
    e.cam = tomada(t, [
      [M.pesq, { pos: [-4.7, 1.6, 1.15], alvo: [-1.5, 1.15, 0.48], fov: 31 }],
      [M.parabens, { pos: [-4.3, 1.42, 0.85], alvo: [-1.5, 1.12, 0.5], fov: 31 }],
    ]);
    FOCO = [XC, 1.2, 0.5];
  } else if (t < M.virada) {
    // ---------------- PARABÉNS: a toca completa, a câmera gira em volta do morro em corte
    e.pessoa = 1;
    e.luzCasa = 1;
    const k = k01(t, M.parabens, M.virada);
    const kk = easeInOut(k);
    e.cam = orb([lerp(-0.7, -0.35, kk), 0.45, lerp(-0.15, 0.7, kk)], 9.2, 2.9, lerp(-92, -14, kk), 33);
    FOCO = [0.0, 0.5, 0.2];
  } else if (t < M.quer) {
    // ---------------- VIRADA: congela e vira arame laranja e partículas
    e.pessoa = 1;
    e.tFix = M.virada - 0.05;
    const c0 = orb([-0.35, 0.45, 0.7], 9.2, 2.9, -14, 33);
    const c1 = orb([-0.2, 0.7, 0.2], 11.0, 3.8, -16, 33);
    e.cam = tomada(t, [[M.virada, c0], [M.quer, c1]]);
    e.wire = t >= M.esse - 0.05 ? 1 : 0;
    e.part = k01(t, M.esse, M.vozE + 0.3);
  } else {
    e.pessoa = 1;
    e.tFix = M.virada - 0.05;
    e.cam = orb([-0.2, 0.7, 0.2], 11.0, 3.8, -16 + (t - M.quer) * 3, 33);
    e.wire = 1;
    e.part = 1;
  }
  const [, y] = projeta(e, FOCO);
  e.foco = clamp(1 - y / 1920, 0.12, 0.88);
  return e;
}

/** ponto do arco do sol (no céu do norte) */
function ptsArco(i: number): V3 {
  const a = (i / 60) * Math.PI;
  return [XF - Math.cos(a) * 2.1, 0.3 + Math.sin(a) * 1.75, 2.5 + Math.sin(a) * 0.5];
}

// ------------------------------------------------------------------ projeção (para ancorar textos na cena)
const camTmp = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.03, 400);
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
export const PONTOS = {
  teto: [XC, V0 + 0.53, ZQ] as V3,
  manta: [XC, V0 + 0.575, ZQ - 0.4] as V3,
  vidro: [XF - 0.33, 0.31, ZF] as V3,
  tubo: [P_TUBO_COR[0], altura(P_TUBO_COR[0], P_TUBO_COR[2]) + 0.1, P_TUBO_COR[2]] as V3,
  tuboQ: [XC, altura(XC, ZQ) + 0.08, ZQ] as V3,
  desu: [XC + 0.22, 0.2, ZQ + 0.3] as V3,
  porta: [XF, 0.24, ZF] as V3,
  regua0: [XC, altura(XC, 0.5), 0.5] as V3,
};
void LTOT;
void ZF;
