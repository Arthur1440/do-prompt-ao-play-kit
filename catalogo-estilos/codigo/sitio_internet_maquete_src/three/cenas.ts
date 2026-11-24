import * as THREE from "three";
import { DURACAO, GAPS, PALAVRAS } from "../fala";
import type { Dir, V3 } from "./kit";
import type { Estado } from "./mundo";
import { clamp, easeInOut, lerp } from "./rng";
import { P } from "./sitio";

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

export const T_LAST = (Math.round(DURACAO * 30) - 1) / 30; // último quadro (= quadro 0)
export const LOOP0 = T_LAST - 0.5;
export const tl = (t: number) => (t >= LOOP0 ? t - T_LAST : t);

const iPonta = acha("na ponta do lapis");
const iConta = acha("agora a conta");
export const M = {
  voceTem: S("voce tem um sitio"),
  comida: S("comida"),
  agua: S("agua"),
  luz: S("luz e internet"),
  internet: S("internet"),
  internetE: E("internet"),
  semConta: S("sem conta de luz"),
  sem2: S("sem caminhao-pipa"),
  pipa: S("caminhao-pipa"),
  pipaE: E("caminhao-pipa"),
  funciona: S("funciona assim"),
  assim: S("assim"),
  aComida: S("a comida vem"),
  sisteminha: S("sisteminha"),
  embrapa: S("embrapa"),
  peixe: S("peixe"),
  galinha: S("galinha"),
  horta: S("horta"),
  aAgua: S("a agua de uma"),
  cisterna: S("cisterna"),
  chuva: S("chuva"),
  telhado: S("telhado"),
  aLuz: S("a luz do sol"),
  sol: S("sol guardado"),
  guardado: S("guardado"),
  bateria: S("bateria"),
  eInternet: S("e a internet cai"),
  internet2: S("internet cai"),
  cai: S("cai do ceu"),
  ceu: S("ceu"),
  agora: S("agora a conta"),
  conta: S("conta", iConta),
  segundo: S("segundo a embrapa"),
  embrapa2: S("embrapa", iConta),
  sist2: S("sisteminha", iConta),
  quinze: S("quinze mil reais"),
  quinzeE: E("quinze mil reais"),
  trinta: S("trinta a quarenta"),
  quarentaQ: E("trinta a quarenta quilos"),
  cem: S("cem dias"),
  cemE: E("cem dias"),
  manda: S("manda para aquele"),
  sitioE: E("trabalhar de um sitio"),
  peca: S("a peca cara"),
  pecaLuz: S("luz", acha("a peca cara")),
  quatro: S("quatro placas"),
  telhado2: S("telhado", acha("quatro placas")),
  baterias: S("baterias"),
  guardam: S("guardam o sol"),
  noite: S("noite"),
  noiteE: E("noite"),
  da: S("da para lampada"),
  lampada: S("lampada geladeira"),
  lampE: PALAVRAS[acha("lampada geladeira")].e,
  embrapaE: E("da embrapa"),
  geladeira: S("geladeira"),
  celular: S("celular"),
  aInternet: S("a internet vem"),
  satelites: S("satelites"),
  quinhentos: S("quinhentos"),
  altura: S("altura"),
  eAntena: S("e a antena"),
  antena: S("antena gasta"),
  gasta: S("gasta menos"),
  lampAntiga: S("lampada antiga"),
  antiga: S("antiga"),
  antigaE: E("antiga"),
  reuniao: S("e reuniao"),
  video: S("video no meio"),
  mato: S("mato"),
  ponta: PALAVRAS[iPonta].s,
  pComida: S("comida", iPonta),
  pQuinze: S("quinze", iPonta),
  pAgua: S("agua", iPonta),
  pSete: S("sete a nove"),
  pTabela: S("tabela do governo"),
  pGovernoE: E("tabela do governo"),
  pLuz: S("luz", iPonta),
  pQuarenta: S("quarenta e cinco"),
  pMedia: S("a media"),
  pLuzTodos: S("luz para todos"),
  pIsoladaE: E("casa isolada"),
  pAntena: S("antena mil"),
  pMil: S("mil e duzentos"),
  pDuzentosE: E("mil e duzentos"),
  total: S("total"),
  perto: S("perto de setenta"),
  setenta: S("setenta mil reais", iPonta),
  setentaE: E("setenta mil reais", iPonta),
  depois: S("depois so a internet"),
  cento: S("cento e noventa"),
  mesE: E("por mes"),
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

// ------------------------------------------------------------------ câmera: tomadas com chaves (posição, alvo, fov)
type Cam = { pos: V3; alvo: V3; fov: number; rolo?: number };
type Chave = [number, Cam];
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function tomada(t: number, ch: Chave[], ease = easeInOut): Cam {
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
/** órbita em volta do alvo (ângulo em graus, ao redor de y) */
const orb = (alvo: V3, dist: number, alt: number, ang: number, fov: number): Cam => {
  const a = (ang * Math.PI) / 180;
  return { pos: [alvo[0] + Math.sin(a) * dist, alvo[1] + alt, alvo[2] + Math.cos(a) * dist], alvo, fov };
};

// ------------------------------------------------------------------ estado em função do tempo
const base = (): Estado => ({
  cam: { pos: [0, 8, 10], alvo: [0, 0, 0], fov: 40 },
  noite: 0,
  notas: 0,
  montes: 0,
  blocos: [0, 0, 0, 0],
  casa: 1, sist: 1, peixes: 1, galinhas: 1, horta: 1, cist: 1, placas: 1, bat: 1, ant: 1,
  chuva: 0, agua: 0, solFluxo: 0, carga: 0.85, caboCasa: 0, adubo: 0, feixeCeu: 0, feixeSat: 0, sats: 0,
  lampada: 0, geladeira: 0, celular: 0, corte: 0, chamada: 0, lampAntiga: 0,
});

/** ponto de foco (para o tilt-shift da maquete) por tomada */
let FOCO: V3 = [0, 0, 0];

export function estado(tt: number, dir: Dir): Estado {
  const t = tl(tt);
  const e = base();
  FOCO = [0, 0.3, 0.3];

  if (t < M.funciona) {
    // ---------------- GANCHO: terreno vazio, notas caindo, quatro montes, peças sem forma, caminhão-pipa riscado
    Object.assign(e, { casa: 0, sist: 0, peixes: 0, galinhas: 0, horta: 0, cist: 0, placas: 0, bat: 0, ant: 0, carga: 0 });
    e.notas = k01(t, -0.35, 1.5);
    e.montes = k01(t, M.voceTem - 0.1, M.comida - 0.05);
    e.blocos = [k01(t, M.comida - 0.1, M.comida + 0.45), k01(t, M.agua - 0.1, M.agua + 0.45), k01(t, M.luz - 0.1, M.luz + 0.45), k01(t, M.internet - 0.1, M.internet + 0.45)];
    const xC = t < M.pipaE + 0.15 ? lerp(4.6, 1.7, easeInOut(k01(t, M.sem2 - 0.35, M.pipa + 0.25))) : lerp(1.7, 4.8, easeInOut(k01(t, M.pipaE + 0.15, M.funciona)));
    e.caminhao = { x: xC, vis: t > M.sem2 - 0.4 ? 1 : 0 };
    e.cam = tomada(t, [
      [-0.5, { pos: [0.9, 8.6, 11.4], alvo: [0, 2.2, 0.2], fov: 40 }],
      [M.voceTem, { pos: [0.6, 8.0, 10.6], alvo: [0, 2.0, 0.2], fov: 40 }],
      [M.internetE, { pos: [-1.8, 7.0, 9.8], alvo: [0.1, 1.7, 0.2], fov: 40 }],
      [M.sem2 - 0.2, { pos: [-1.4, 6.4, 9.6], alvo: [0.4, 1.3, 0.6], fov: 40 }],
      [M.funciona, { pos: [0.6, 4.4, 7.2], alvo: [1.2, 0.3, 1.4], fov: 36 }],
    ]);
    FOCO = t < M.sem2 - 0.3 ? [0, 0.9, 0.4] : [1.6, 0.2, 2.4];
  } else if (t < M.agora) {
    // ---------------- COMO FUNCIONA: cada peça cai quando a voz diz o nome
    e.casa = k01(t, M.funciona + 0.15, M.assim + 0.75);
    e.sist = k01(t, M.embrapaE + 0.03 - 0.55 * 0.9, M.embrapaE + 0.03 + 0.45 * 0.9);
    e.peixes = k01(t, M.peixe - 0.15, M.peixe + 0.5);
    e.galinhas = k01(t, M.galinha - 0.2, M.galinha + 0.6);
    e.horta = k01(t, M.horta - 0.15, M.horta + 0.7);
    e.adubo = k01(t, M.horta + 0.3, M.horta + 1.0);
    e.cist = k01(t, M.cisterna - 0.25, M.cisterna + 0.65);
    e.chuva = k01(t, M.cisterna + 0.3, M.chuva - 0.1) * (1 - k01(t, M.aLuz - 0.35, M.aLuz - 0.15));
    e.agua = k01(t, M.chuva + 0.1, M.telhado + 0.4) * (1 - k01(t, M.aLuz - 0.3, M.aLuz - 0.15));
    e.placas = k01(t, M.aLuz + 0.1, M.aLuz + 0.85);
    e.bat = k01(t, M.guardado - 0.2, M.guardado + 0.5);
    e.solFluxo = k01(t, M.sol - 0.1, M.bateria + 0.1) * (1 - k01(t, M.eInternet - 0.3, M.eInternet));
    e.carga = k01(t, M.bateria, M.bateria + 0.8);
    e.realce = { placas: k01(t, M.sol, M.sol + 0.3) * (1 - k01(t, M.eInternet, M.eInternet + 0.4)) };
    e.ant = k01(t, M.internet2 - 0.2, M.internet2 + 0.55);
    e.feixeCeu = k01(t, M.cai - 0.05, M.ceu + 0.15);
    if (t >= M.aLuz - 0.15 && t < M.eInternet) e.solPos = [0.3, 4.4, -4.2];
    if (t < M.aAgua - 0.1) {
      e.cam = tomada(t, [
        [M.funciona, { pos: [1.2, 3.6, 6.4], alvo: [-0.4, 0.4, 0.6], fov: 38 }],
        [M.sisteminha - 0.3, { pos: [0.6, 3.0, 5.6], alvo: [-1.0, 0.3, 0.9], fov: 36 }],
        [M.aAgua - 0.1, { pos: [-0.2, 2.6, 4.8], alvo: [-1.35, 0.25, 1.2], fov: 36 }],
      ]);
      FOCO = t < M.sisteminha - 0.3 ? P.casa : [-1.4, 0.2, 1.3];
    } else if (t < M.aLuz - 0.15) {
      e.cam = tomada(t, [
        [M.aAgua - 0.1, orb([-1.0, 1.1, -0.75], 5.6, 1.6, -26, 40)],
        [M.aLuz - 0.15, orb([-0.9, 1.2, -0.75], 5.0, 1.9, -6, 40)],
      ]);
      FOCO = [-1.6, 0.6, -0.8];
    } else if (t < M.eInternet - 0.05) {
      e.cam = tomada(t, [
        [M.aLuz - 0.15, { pos: [3.6, 1.1, 3.3], alvo: [1.0, 1.9, -1.2], fov: 42 }],
        [M.eInternet - 0.05, { pos: [3.2, 1.0, 2.9], alvo: [1.0, 1.8, -1.2], fov: 40 }],
      ]);
      FOCO = [1.0, 1.0, -0.8];
    } else {
      // antena; a câmera sobe junto com o feixe que cai do céu
      e.cam = tomada(t, [
        [M.eInternet - 0.05, { pos: [3.7, 1.7, 5.6], alvo: [2.0, 0.9, 1.25], fov: 36 }],
        [M.cai, { pos: [3.6, 1.6, 5.3], alvo: [2.0, 1.0, 1.25], fov: 36 }],
        [M.agora, { pos: [3.5, 1.5, 5.1], alvo: [2.0, 1.6, 1.2], fov: 38 }],
      ]);
      FOCO = P.ant;
    }
  } else if (t < M.manda) {
    // ---------------- A CONTA: Sisteminha de perto (selo Embrapa primeiro, depois os números)
    e.carga = 1;
    e.adubo = 1;
    e.cam = tomada(t, [[M.agora, orb([-1.45, 0.2, 1.35], 3.2, 2.2, 30, 34)], [M.manda, orb([-1.45, 0.2, 1.35], 2.9, 1.9, 8, 34)]], (x) => x);
    FOCO = P.tanque;
  } else if (t < M.peca) {
    // ---------------- ENVIO: varanda com o notebook ao fundo (o celular é motion por cima)
    e.carga = 1;
    e.cam = tomada(t, [[M.manda, { pos: [0.95, 0.62, 1.9], alvo: [0.05, 0.42, 0.0], fov: 34 }], [M.peca, { pos: [0.75, 0.6, 1.7], alvo: [0.05, 0.42, 0.0], fov: 32 }]], (x) => x);
    FOCO = P.note;
  } else if (t < M.aInternet) {
    // ---------------- A LUZ: placas, bateria, dia vira noite, a casa acende
    e.realce = { placas: k01(t, M.quatro, M.quatro + 0.3) * (1 - k01(t, M.noite, M.noite + 0.4)), bat: k01(t, M.baterias, M.baterias + 0.3) };
    e.carga = lerp(0.15, 1, k01(t, M.telhado2, M.noiteE));
    e.noite = easeInOut(k01(t, M.guardam - 0.5, M.da));
    e.solPos = t < M.da ? [lerp(2.6, 4.2, k01(t, M.peca, M.da)), lerp(4.6, -0.4, easeInOut(k01(t, M.guardam - 0.5, M.da))), -4.4] : undefined;
    e.corte = k01(t, M.da - 0.2, M.lampada - 0.1);
    e.lampada = k01(t, M.lampE, M.lampE + 0.1);
    e.geladeira = easeInOut(k01(t, M.geladeira, M.geladeira + 0.5));
    e.celular = k01(t, M.celular, M.celular + 0.15);
    e.caboCasa = k01(t, M.da, M.lampada + 0.2);
    if (t < M.da - 0.2) {
      e.cam = tomada(t, [
        [M.peca, orb([0.9, 0.9, -0.75], 4.6, 2.3, 30, 38)],
        [M.baterias, orb([1.0, 0.8, -0.75], 4.1, 1.9, 42, 38)],
        [M.da - 0.2, orb([0.9, 0.9, -0.75], 4.4, 1.6, 52, 40)],
      ]);
      FOCO = t < M.baterias ? P.placas : P.bat;
    } else {
      e.cam = tomada(t, [
        [M.da - 0.2, { pos: [2.15, 0.85, 3.3], alvo: [0.7, 0.72, -0.85], fov: 46 }],
        [M.aInternet, { pos: [1.9, 0.8, 3.0], alvo: [0.7, 0.74, -0.85], fov: 46 }],
      ]);
      FOCO = [0.6, 0.5, -0.9];
    }
  } else if (t < M.reuniao - 0.05) {
    // ---------------- A INTERNET: sobe até os satélites, desce pelo feixe até a antena e a lâmpada antiga
    e.noite = 1;
    e.lampada = 1;
    e.carga = 1;
    e.sats = (t - M.aInternet) * 0.32 + 0.1;
    e.feixeSat = k01(t, M.satelites, M.satelites + 0.6);
    e.lampAntiga = k01(t, M.lampAntiga - 0.15, M.lampAntiga + 0.45);
    if (t < M.eAntena) {
      e.cam = tomada(t, [
        [M.aInternet, { pos: [3.2, 0.9, 4.0], alvo: [2.05, 0.75, 1.3], fov: 36 }],
        [M.quinhentos, { pos: [3.3, 2.1, 6.9], alvo: [0.6, 2.6, -1.0], fov: 46 }],
        [M.eAntena, { pos: [3.0, 2.3, 7.1], alvo: [0.4, 2.7, -1.1], fov: 46 }],
      ]);
      FOCO = [1.4, 3.6, -1.2];
    } else {
      e.cam = tomada(t, [
        [M.eAntena, { pos: [3.2, 2.0, 5.8], alvo: [1.6, 2.2, -0.4], fov: 44 }],
        [M.lampAntiga - 0.2, { pos: [3.2, 0.95, 3.4], alvo: [2.25, 0.5, 1.15], fov: 36 }],
        [M.reuniao, { pos: [3.1, 0.9, 3.2], alvo: [2.3, 0.5, 1.1], fov: 34 }],
      ]);
      FOCO = [2.3, 0.4, 1.1];
    }
  } else if (t < M.ponta) {
    // ---------------- REUNIÃO DE VÍDEO NO MEIO DO MATO (amanhece)
    e.noite = 1 - easeInOut(k01(t, M.reuniao - 0.05, M.reuniao + 0.6)) * 0.9;
    e.chamada = k01(t, M.video - 0.4, M.video);
    e.lampada = 1 - k01(t, M.reuniao + 0.3, M.reuniao + 0.8);
    e.galVar = k01(t, M.video - 0.2, M.ponta + 0.1);
    e.cam = tomada(t, [[M.reuniao - 0.05, { pos: [0.28, 0.72, 1.55], alvo: [0.06, 0.44, 0.0], fov: 32 }], [M.ponta, { pos: [0.2, 0.68, 1.3], alvo: [0.06, 0.45, 0.0], fov: 32 }]], (x) => x);
    FOCO = P.note;
  } else if (t < M.virada) {
    // ---------------- NA PONTA DO LÁPIS: etiqueta em cada peça no preço, soma, total e mensalidade à parte
    e.carga = 1;
    e.adubo = 1;
    const ch: Chave[] = [
      [M.ponta, { pos: [3.6, 7.6, 9.6], alvo: [0, 0.2, 0.3], fov: 40 }],
      [M.pComida - 0.1, { pos: [1.4, 4.2, 6.6], alvo: [-1.2, 0.3, 1.0], fov: 38 }],
      [M.pAgua - 0.2, { pos: [0.6, 4.0, 6.0], alvo: [-1.3, 0.4, 0.4], fov: 38 }],
      [M.pTabela, { pos: [-0.4, 3.8, 5.6], alvo: [-1.4, 0.5, -0.5], fov: 38 }],
      [M.pLuz - 0.2, { pos: [0.6, 4.2, 5.8], alvo: [0.2, 0.7, -0.6], fov: 40 }],
      [M.pIsoladaE, { pos: [1.6, 4.0, 5.8], alvo: [0.9, 0.8, -0.5], fov: 40 }],
      [M.pMil, { pos: [3.0, 3.6, 6.4], alvo: [1.6, 0.4, 0.8], fov: 40 }],
      [M.total, { pos: [3.4, 6.4, 9.0], alvo: [0.1, 0.3, 0.4], fov: 40 }],
      [M.virada, { pos: [2.6, 7.2, 9.6], alvo: [0, 0.2, 0.3], fov: 40 }],
    ];
    e.cam = tomada(t, ch);
    FOCO = [0, 0.4, 0.3];
  } else if (t < M.quer) {
    // ---------------- VIRADA: a cena congela, vira arame laranja e partículas
    e.tFix = M.virada - 0.05;
    const ch: Chave[] = [
      [M.virada, { pos: [2.6, 7.2, 9.6], alvo: [0, 0.2, 0.3], fov: 40 }],
      [M.quer, { pos: [1.2, 6.2, 8.6], alvo: [0, 0.6, 0.3], fov: 40 }],
    ];
    e.cam = tomada(t, ch);
    e.carga = 1;
    e.wire = t >= M.esse - 0.05 ? 1 : 0;
    e.part = k01(t, M.esse, M.vozE + 0.3);
  } else {
    // ---------------- PLAY: fundo azul-tinta (o 3D fica em arame ao fundo)
    e.tFix = M.virada - 0.05;
    e.cam = orb([0, 0.6, 0.3], 9.4, 5.4, 7 + (t - M.quer) * 3, 40);
    e.carga = 1;
    e.wire = 1;
    e.part = 1;
  }
  const [, y] = projeta(e, FOCO);
  e.foco = clamp(1 - y / 1920, 0.12, 0.88);
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
/** posição atual de cada satélite (igual à do mundo) */
export const posSat = (e: Estado, i: number): V3 => {
  const x = 7 - ((e.sats * 6 + i * 3.4) % 14);
  return [x, 4.6 + Math.sin(i * 2.1) * 0.45, -1.7 + i * 0.5 - Math.abs(x) * 0.06];
};
