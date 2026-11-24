// Linha do tempo do reel "dedo na tela" (versão muda). Tudo é função pura de t (segundos).
// Os tempos seguem o áudio da referência: uma batida por metade (período 1,0435 s a partir de 1,07 s),
// a 26ª metade em 27,91 s, sopro até o impacto em 30,63 s, sopro da volta 35,1 → 37,25 s e digitação a partir de 40 s.
import * as THREE from "three";

export const FPS = 30;
export const DUR = 49.1;

export const D0 = 0.022; // 2,2 cm: distância inicial dedo → tela
export const DMIN = 0.322e-9; // onde os elétrons travam

export const T = {
  batida1: 1.07,
  periodo: 1.0435,
  ult: 27.91, // 26ª metade
  aperto: 30.3, // menor distância (0,300 nm)
  trava: 30.63, // impacto: os elétrons empurram (anéis)
  frase1: 30.75, // "Eles nunca se tocam."
  saidaIni: 35.1,
  saidaFim: 37.25,
  frase2: 37.55, // "Você nunca encostou no seu celular."
  cta: 40.0,
};

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const suave = (x: number) => {
  const u = cl(x);
  return u * u * (3 - 2 * u);
};
export const ease = (x: number) => {
  const u = cl(x);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Tempo (s) da n-ésima metade, na batida da referência. */
export const tMetade = (n: number) => (n <= 25 ? T.batida1 + (n - 1) * T.periodo : T.ult);

/** k contínuo: passa por n exatamente na batida n. */
function kDe(t: number) {
  if (t <= 0.3) return 0;
  if (t < T.batida1) return suave((t - 0.3) / (T.batida1 - 0.3)) * 1; // 1ª metade sai devagar
  if (t >= T.ult) return 26;
  const t25 = tMetade(25);
  if (t >= t25) return 25 + (t - t25) / (T.ult - t25);
  return 1 + (t - T.batida1) / T.periodo;
}

const D26 = D0 * Math.pow(2, -26); // 0,328 nm

/** Distância física entre o dedo e a tela (m). */
export function gap(t: number) {
  if (t < T.ult) return D0 * Math.pow(2, -kDe(t));
  if (t < T.aperto) return lerp(D26, 0.3e-9, ease((t - T.ult) / (T.aperto - T.ult)));
  if (t < T.trava) return lerp(0.3e-9, 0.32e-9, ease((t - T.aperto) / (T.trava - T.aperto)));
  return lerp(0.32e-9, DMIN, suave((t - T.trava) / 0.6));
}

/** Metros por unidade de tela (o "zoom"). Na ida acompanha a distância; para em 0,322 nm; na volta sobe até 2,2 cm. */
export function vista(t: number) {
  // beijo: abre em plano aberto (os dois rostos inteiros) e alcança o zoom da distância em ~3,5 s
  // cachorro: abre mostrando o cachorro inteiro e a mão chegando
  const aberto =
    TEMA === "beijo" ? 1 + 2.7 * (1 - ease((t - 0.4) / 3.2)) : TEMA === "cachorro" ? 1 + 5.5 * (1 - ease((t - 0.3) / 3.6)) : 1;
  if (t < T.saidaIni) return Math.max(gap(t), DMIN) * aberto;
  const u = ease((t - T.saidaIni) / (T.saidaFim - T.saidaIni));
  const fim = TEMA === "beijo" ? D0 * 3.2 : TEMA === "cachorro" ? D0 * 7 : D0; // na volta, termina no plano aberto
  return DMIN * Math.pow(fim / DMIN, u);
}

/** Metades exibidas no contador (para em 26). */
export const metades = (d: number) => Math.max(0, Math.min(26, Math.floor(Math.log2(D0 / d) + 1e-6)));

/** Contador no formato brasileiro, 3 algarismos significativos. */
export function fmt(d: number) {
  const un: [number, string][] = [
    [1e-2, "cm"],
    [1e-3, "mm"],
    [1e-6, "µm"],
    [1e-9, "nm"],
  ];
  let [f, s] = un[un.length - 1];
  for (const [ff, ss] of un) {
    if (d >= ff * 0.9995) {
      [f, s] = [ff, ss];
      break;
    }
  }
  const v = d / f;
  const dec = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  const casas = v < 1 ? 3 : dec;
  return `${v.toFixed(casas).replace(".", ",")} ${s}`;
}

// ---------- faixas de escala (iguais em cima e embaixo) ----------
export type Faixa = { ate: number; cima: string; baixo: string; unica?: string };
// "ate" = vista (m/unidade) em que a faixa termina
export const FAIXAS: Faixa[] = [
  { ate: 3e-3, cima: "a ponta do seu dedo", baixo: "a tela do celular" },
  { ate: 120e-6, cima: "as linhas da sua digital", baixo: "gordura e pixels sob o vidro" },
  { ate: 8e-6, cima: "células mortas da pele", baixo: "riscos que você não vê" },
  { ate: 0.9e-6, cima: "a superfície de uma célula", baixo: "riscos que você não sente" },
  { ate: 60e-9, cima: "fios de queratina", baixo: "a capa antigordura da tela" },
  { ate: 4e-9, cima: "moléculas de queratina", baixo: "moléculas de flúor da capa" },
  { ate: 0.62e-9, cima: "átomos do seu dedo", baixo: "átomos da tela" },
  { ate: 0, cima: "", baixo: "", unica: "nuvens de elétrons" },
];

// Beijo: os dois lados são lábios; uma etiqueta só por escala (como na referência), régua na horizontal.
export const FAIXAS_BEIJO: Faixa[] = [
  { ate: 3e-3, cima: "seus lábios", baixo: "os lábios do crush" },
  { ate: 120e-6, cima: "", baixo: "", unica: "as ruguinhas dos lábios" },
  { ate: 8e-6, cima: "", baixo: "", unica: "células da pele do lábio" },
  { ate: 0.9e-6, cima: "", baixo: "", unica: "a superfície de uma célula" },
  { ate: 60e-9, cima: "", baixo: "", unica: "fios de queratina" },
  { ate: 4e-9, cima: "", baixo: "", unica: "moléculas do hidratante labial" },
  { ate: 0.62e-9, cima: "", baixo: "", unica: "átomos" },
  { ate: 0, cima: "", baixo: "", unica: "nuvens de elétrons" },
];

// Cachorro: a mão (em cima) desce no pelo (embaixo); régua vertical como no dedo.
export const FAIXAS_CACHORRO: Faixa[] = [
  { ate: 3e-3, cima: "a sua mão", baixo: "o pelo do seu cachorro" },
  { ate: 120e-6, cima: "as linhas da sua mão", baixo: "os pelos dele" },
  { ate: 8e-6, cima: "células mortas da pele", baixo: "as escamas de um fio de pelo" },
  { ate: 0.9e-6, cima: "a superfície de uma célula", baixo: "as camadas do pelo" },
  { ate: 60e-9, cima: "fios de queratina", baixo: "fios de queratina dele" },
  { ate: 4e-9, cima: "moléculas de queratina", baixo: "moléculas de queratina dele" },
  { ate: 0.62e-9, cima: "átomos da sua mão", baixo: "átomos do pelo" },
  { ate: 0, cima: "", baixo: "", unica: "nuvens de elétrons" },
];

export type Tema = "dedo" | "beijo" | "cachorro";
let TEMA: Tema = "dedo";
/** O tema vale para todo o módulo (cada render usa uma composição só). */
export const setTema = (x: Tema) => {
  TEMA = x;
};
export const tema = () => TEMA;
export const faixas = () => (TEMA === "beijo" ? FAIXAS_BEIJO : TEMA === "cachorro" ? FAIXAS_CACHORRO : FAIXAS);

export function faixaDe(v: number) {
  for (let i = 0; i < FAIXAS.length; i++) if (v > FAIXAS[i].ate) return i;
  return FAIXAS.length - 1;
}

/** Fusão contínua entre faixas vizinhas: { de, para, mistura 0..1 }. Sem corte: as duas escalas aparecem juntas. */
export function fusao(v: number) {
  const L = 0.7; // meia largura da fusão, em metades
  for (let i = 0; i < FAIXAS.length - 2; i++) {
    const z = Math.log2(v / FAIXAS[i].ate); // >0 antes da fronteira
    if (Math.abs(z) < L) return { de: i, para: i + 1, mistura: suave((L - z) / (2 * L)) };
  }
  return { de: faixaDe(v), para: faixaDe(v), mistura: 0 };
}

// ---------- câmera ----------
export const RCAM = 12.4; // distância da câmera à origem (unidades)
export const FOV = 30;

/** Pose da câmera: alta no começo (vê a tela de cima), rasante no micro. */
export function camPose(t: number) {
  const v = vista(t);
  const k = Math.log2(D0 / v);
  if (TEMA === "beijo") {
    // de perfil: câmera girada 90° (o "cima" do mundo fica à esquerda da tela), quase sem inclinação
    const giro = THREE.MathUtils.degToRad(4 * Math.sin(t * 0.21) + 3 * (1 - suave(k / 3)));
    const fi = THREE.MathUtils.degToRad(2.5);
    const pos = new THREE.Vector3(Math.sin(fi), 0, Math.cos(fi)).applyAxisAngle(new THREE.Vector3(1, 0, 0), giro).multiplyScalar(RCAM);
    return { pos, alvo: new THREE.Vector3(0, 0, 0), up: new THREE.Vector3(1, 0, 0) };
  }
  const fi = THREE.MathUtils.degToRad(4 + 20 * (1 - suave(k / 3.2)));
  const giro = THREE.MathUtils.degToRad(5 * Math.sin(t * 0.21) + (t > T.saidaFim ? 2 * Math.sin(t * 0.5) : 0));
  const pos = new THREE.Vector3(Math.sin(giro) * Math.cos(fi), Math.sin(fi), Math.cos(giro) * Math.cos(fi)).multiplyScalar(RCAM);
  return { pos, alvo: new THREE.Vector3(0, 0, 0), up: new THREE.Vector3(0, 1, 0) };
}

/** Altura (unidades) da superfície de cima e de baixo no centro. */
export function alturas(t: number) {
  const v = vista(t);
  const g = gap(t);
  if (TEMA === "beijo") return { baixo: (-0.5 * g) / v, cima: (0.5 * g) / v };
  const baixo = -0.5;
  return { baixo, cima: baixo + g / v };
}

/** "Metades" contínuas do zoom (para as partículas acompanharem a aproximação). */
export const kZoom = (t: number) => Math.log2(D0 / vista(t));

const _cam = new THREE.PerspectiveCamera(FOV, 1080 / 1920, 0.01, 1000);
/** Projeta um ponto do mundo em px (1080 x 1920). */
export function projeta(t: number, p: THREE.Vector3) {
  const { pos, alvo, up } = camPose(t);
  _cam.position.copy(pos);
  _cam.up.copy(up);
  _cam.lookAt(alvo);
  _cam.updateMatrixWorld();
  const q = p.clone().project(_cam);
  return { x: (q.x * 0.5 + 0.5) * 1080, y: (1 - (q.y * 0.5 + 0.5)) * 1920 };
}
