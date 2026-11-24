// Linha do tempo: cada plano preso às palavras da narração (fala.ts). A imagem segue a fala.
import { PALAVRAS, DURACAO } from "./fala";
import type { Estado, Cam, V3, EstDog } from "./three/mundo";
import type { Dir } from "./three/kit";
import { POS } from "./three/casa";

export const A = (i: number) => PALAVRAS[i].a;
export const B = (i: number) => PALAVRAS[i].b;
export const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
export const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
export const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
export const FPS = 30;
export const QUADROS = Math.round(DURACAO * FPS);
/** início do plano que começa na palavra i (o corte cai no vão antes dela) */
export const C = (i: number) => (i === 0 ? 0 : Math.max(B(i - 1) + 0.02, A(i) - 0.1));
/** índice da palavra (n-ésima ocorrência) */
export const W = (w: string, n = 1) => {
  let k = 0;
  for (let i = 0; i < PALAVRAS.length; i++) if (PALAVRAS[i].w.toLowerCase().replace(/[.,!?…:;]+$/g, "") === w.toLowerCase() && ++k === n) return i;
  throw new Error("palavra " + w);
};

const L = (a: number, b: number, x: number) => a + (b - a) * x;
const LV = (a: V3, b: V3, x: number): V3 => [L(a[0], b[0], x), L(a[1], b[1], x), L(a[2], b[2], x)];
export const lc = (a: Cam, b: Cam, x: number): Cam => {
  const e = eio(x);
  return { rel: a.rel, livre: a.livre, pos: LV(a.pos, b.pos, e), alvo: LV(a.alvo, b.alvo, e), fov: L(a.fov ?? 30, b.fov ?? 30, e), rolo: L(a.rolo ?? 0, b.rolo ?? 0, e), foco: L(a.foco ?? 0.45, b.foco ?? 0.45, e), forca: L(a.forca ?? 0.85, b.forca ?? 0.85, e), larg: L(a.larg ?? 1, b.larg ?? 1, e) };
};
const soma = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** respiro de câmera na mão (determinístico, bem leve) */
const respiro = (t: number, a: number): V3 => [a * Math.sin(t * 0.9), a * 0.6 * Math.sin(t * 1.3 + 1), a * 0.5 * Math.sin(t * 0.7 + 2)];

// ------------------------------------------------------------------------------------------ marcos da fala
export const T = {
  qualquer: A(W("qualquer")), canto: A(W("canto")), casa: A(W("casa")), mesmo: A(W("mesmo")),
  toda: C(W("toda")), escolhe: A(W("escolhe")), voce1: A(W("você")),
  nao: C(W("não")), cama: A(W("cama")),
  dormindo: C(W("dormindo")), indefeso: A(W("indefeso")), pra: C(W("pra")), ele2: C(W("ele", 3)), protege: A(W("protege")),
  mas: C(W("mas")),
  durante: C(W("durante")), acorda: A(W("acorda")), vinte: A(W("vinte")),
};

// ------------------------------------------------------------------------------------------ geografia
export const TOPO = 0.535; // topo do colchão + cobertor (aprox.; Mundo mede o real)
export const DOG_CAMA: V3 = [2.52, 0, 1.4]; // deitado ao longo da cama, cabeça perto do ombro do dono (y = topo)
const Z_PATH = 1.95;
/** x do cachorro no corredor: passa pelo sofá, tapete e caminha */
export const xDog = (t: number) => 10.3 - 1.85 * t;
export const T_PINO = { sofa: (10.3 - POS.sofa[0]) / 1.85, tapete: (10.3 - POS.tapete[0]) / 1.85, caminha: (10.3 - POS.caminha[0]) / 1.85 };

type Plano = { ini: number; f: (t: number, dir: Dir) => Estado };
const PLANOS: Plano[] = [];
const plano = (ini: number, f: (t: number, dir: Dir) => Estado) => PLANOS.push({ ini, f });

const deitadoNaCama = (t: number, extra: Partial<EstDog["pose"]> = {}, pos: V3 = DOG_CAMA): EstDog => ({
  pos: [pos[0], TOPO + pos[1], pos[2]], rotY: Math.PI / 2, pose: { olho: 1, ...extra, t, modo: extra.modo === "parado" || extra.modo === "trote" ? extra.modo : "deUmLado" },
});

// 1. QUADRO 0 — corredor escuro, o cachorro trotando em direção à câmera, passando direto por SOFÁ, TAPETE, CAMINHA
//    e entrando pela porta do quarto (luz quente lá dentro).
plano(0, (t, dir) => {
  const xd = xDog(t);
  // no fim do corredor ele vira para a porta do quarto (z da porta ~2.8)
  const kz = k01(xd, 5.0, 4.0);
  const zd = L(Z_PATH, 2.55, eio(kz));
  const rot = Math.PI + 0.55 * Math.sin(Math.PI * kz) * 0.6;
  const k = k01(t, 0, 3.3), k2 = k01(t, 3.0, T.toda);
  const alvoA: V3 = [L(xd + 0.25, 4.0, eio(k2)), 0.34, L(L(1.55, zd, eio(k)), 2.55, eio(k2))];
  const cam: Cam = dir === "B"
    ? { pos: [xd - 1.4, 3.1, 5.4], alvo: [xd + 0.15, 0.25, 1.75], fov: 30, foco: 0.42, forca: 0.85, larg: 1.15 }
    : { pos: soma([L(5.7, 5.25, eio(k)), L(1.5, 1.35, eio(k)), 3.5], respiro(t, 0.01)), alvo: alvoA, fov: L(40, 46, eio(k2)) };
  return {
    t, cam, cena: "noite",
    dog: { pos: [xd, 0, zd], rotY: rot, pose: { modo: "trote", t, rabo: 0.6 } },
    // a luz quente do quarto vaza pela porta e puxa o cachorro pelo corredor
    dono: { t }, luz: { lua: 1.2, abajur: 1.2, abajurPos: [3.0, 1.3, 2.55], hemi: 1.35 },
  };
});

// 1b. "e mesmo assim" — contraplano de dentro do quarto: ele entra pela porta, na luz quente do abajur
const J0: V3 = [3.55, 0, 2.45];
plano(T.mesmo - 0.15, (t, dir) => {
  const t0 = T.mesmo - 0.15;
  const u = k01(t, t0, T.toda + 0.1);
  const pos: V3 = LV([4.3, 0, 2.55], J0, eo(u));
  const cam: Cam = dir === "B"
    ? lc({ pos: [2.2, 2.6, 4.6], alvo: [3.9, 0.35, 2.6], fov: 32, foco: 0.42, forca: 0.8, larg: 1.2 }, { pos: [2.4, 2.5, 4.4], alvo: [3.7, 0.35, 2.5], fov: 30, foco: 0.42, forca: 0.8, larg: 1.2 }, u)
    : lc({ pos: [1.75, 0.85, 3.45], alvo: [3.9, 0.4, 2.75], fov: 44 }, { pos: [1.9, 0.8, 3.35], alvo: [3.65, 0.42, 2.5], fov: 40 }, u);
  return { t, cam, cena: "noite", dog: { pos, rotY: Math.PI + 0.55 * u, pose: { modo: "trote", t, rabo: 0.9 } }, dono: { t }, luz: { lua: 1, abajur: 1, hemi: 1.2 } };
});

// 2. "toda noite, ele escolhe você" — no quarto: ele pula na cama (squash ao cair), vira para o dono e deita
const J1: V3 = [DOG_CAMA[0] + 0.1, 0, DOG_CAMA[2] + 0.3];
plano(T.toda, (t, dir) => {
  const t0 = T.toda, tPulo = t0 + 0.2, tCai = tPulo + 0.6;
  const u = k01(t, tPulo, tCai);
  let pos: V3, pose: EstDog["pose"], rotY = 2.35, esc: [number, number] = [0, 0];
  if (t < tPulo) {
    const a = k01(t, t0 - 0.25, tPulo);
    pos = [...J0]; pose = { modo: "parado", t, rabo: 0.8 };
    esc = [0.04 * a, -0.08 * a]; // agacha antes do pulo
  } else if (t < tCai) {
    pos = LV(J0, J1, u); pos[1] = TOPO * u + Math.sin(Math.PI * u) * 0.42;
    pose = { modo: "pula", t: 0.15 + u * 0.7 };
    esc = [-0.06 * Math.sin(Math.PI * u), 0.1 * Math.sin(Math.PI * u)]; // estica no ar
  } else {
    const a = k01(t, tCai, tCai + 0.4);
    pos = [L(J1[0], DOG_CAMA[0], eio(a)), TOPO, L(J1[2], DOG_CAMA[2], eio(a))];
    rotY = L(2.35, Math.PI / 2, eio(a));
    pose = a < 0.6 ? { modo: "parado", t, rabo: 1 } : { modo: "deitado", t, olho: 1, rabo: 0.6 };
    const sq = Math.exp(-(t - tCai) * 9) * Math.cos((t - tCai) * 22);
    esc = [0.08 * sq, -0.12 * sq]; // amassa ao cair e volta
  }
  const k = k01(t, t0, tCai + 0.4);
  const cam: Cam = dir === "B"
    ? lc({ pos: [3.45, 2.75, 4.35], alvo: [2.7, 0.45, 1.45], fov: 34, foco: 0.42, forca: 0.8, larg: 1.2 }, { pos: [3.3, 2.6, 4.1], alvo: [2.55, 0.45, 1.3], fov: 32, foco: 0.42, forca: 0.8, larg: 1.2 }, k)
    : lc({ pos: [3.35, 1.75, 4.75], alvo: [3.05, 0.48, 1.85], fov: 44 }, { pos: [3.2, 1.65, 4.45], alvo: [2.75, 0.5, 1.5], fov: 42 }, k);
  return { t, cam, cena: "noite", dog: { pos, rotY, pose, esc }, dono: { t }, luz: { lua: 1, abajur: 1 } };
});
plano(T.escolhe - 0.42, (t, dir) => {
  const t0 = T.escolhe - 0.42;
  const k = k01(t, t0, T.nao);
  // 3/4 de cima, do pé da cama: o cachorro ao longo do dono, cabeça no ombro dele (cabe na vertical)
  const cam: Cam = dir === "B"
    ? lc({ pos: [2.2, 3.3, 1.75], alvo: [2.15, 0.5, 0.95], fov: 40, foco: 0.5, forca: 0.6 }, { pos: [2.2, 3.1, 1.6], alvo: [2.15, 0.5, 0.92], fov: 38, foco: 0.5, forca: 0.6 }, k)
    : lc({ pos: [2.2, 3.0, 1.6], alvo: [2.15, 0.5, 0.92], fov: 46 }, { pos: [2.2, 2.75, 1.45], alvo: [2.15, 0.5, 0.88], fov: 44 }, k);
  return { t, cam, cena: "noite", dog: deitadoNaCama(t, { modo: "enrolado", olho: k > 0.5 ? 0 : 1, rabo: 0.4 * (1 - k) }), dono: { t }, luz: { lua: 1, abajur: 1 } };
});

// 3. "Não é a cama." — de cima: a etiqueta A CAMA sobre o colchão, riscada em "cama"
plano(T.nao, (t, dir) => {
  const k = k01(t, T.nao, T.dormindo);
  const cam: Cam = dir === "B"
    ? lc({ pos: [2.0, 4.6, 2.3], alvo: [2.0, 0.45, 1.15], fov: 40, foco: 0.5, forca: 0.6, larg: 1.3 }, { pos: [2.0, 4.4, 2.2], alvo: [2.0, 0.45, 1.15], fov: 40, foco: 0.5, forca: 0.6, larg: 1.3 }, k)
    : lc({ pos: [2.0, 3.75, 2.05], alvo: [2.0, 0.45, 1.12], fov: 52 }, { pos: [2.0, 3.6, 1.95], alvo: [2.0, 0.45, 1.1], fov: 52 }, k);
  return { t, cam, cena: "noite", dog: deitadoNaCama(t, { modo: "enrolado", olho: 0 }), dono: { t }, luz: { lua: 1, abajur: 1 } };
});

// 4. "Dormindo, um cachorro fica indefeso" — (a) o rosto dele de olhos fechados, de frente, no canto da cabeceira;
//    (b) em "indefeso": por trás dele, a luz baixa do pé da cama joga uma sombra grande na parede da cabeceira
plano(T.dormindo, (t, dir) => {
  const k = k01(t, T.dormindo, T.indefeso - 0.1);
  const cam: Cam = lc({ pos: [2.05, 2.3, 1.3], alvo: [2.02, 0.5, 0.78], fov: 38, foco: 0.5, forca: 0.5, larg: 1.4 }, { pos: [2.05, 2.1, 1.22], alvo: [2.02, 0.5, 0.76], fov: 36, foco: 0.5, forca: 0.5, larg: 1.4 }, k);
  void dir;
  return { t, cam, cena: "noite", dog: deitadoNaCama(t, { modo: "deitado", olho: 0, cabeca: 0.0 }), dono: { t }, luz: { lua: 0.6, abajur: 1.1, hemi: 0.85 } };
});
plano(T.indefeso - 0.1, (t, dir) => {
  const k = k01(t, T.indefeso - 0.1, T.pra);
  const cam: Cam = dir === "B"
    ? lc({ pos: [3.05, 1.5, 3.1], alvo: [2.15, 1.05, 0.1], fov: 40, foco: 0.55, forca: 0.5, larg: 1.4 }, { pos: [2.98, 1.45, 2.95], alvo: [2.15, 1.05, 0.1], fov: 38, foco: 0.55, forca: 0.5, larg: 1.4 }, k)
    : lc({ pos: [2.42, 1.12, 3.05], alvo: [2.1, 1.05, 0.1], fov: 44 }, { pos: [2.4, 1.1, 2.9], alvo: [2.1, 1.05, 0.1], fov: 42 }, k);
  return {
    t, cam, cena: "noite",
    dog: deitadoNaCama(t, { modo: "deitado", olho: 0, cabeca: 0.1 }),
    dono: { t }, luz: { lua: 0.3, abajur: 0.32, abajurPos: [2.4, 0.64, 1.62], hemi: 0.45, decai: 0 },
  };
});

// 5. "e pra fechar os olhos, ele procura quem mais o protege" — ele baixa a cabeça encostado no dono (de cima, 3/4)
plano(T.pra, (t, dir) => {
  const k = k01(t, T.pra, T.mas);
  const cam: Cam = dir === "B"
    ? lc({ pos: [2.1, 3.6, 1.9], alvo: [2.05, 0.5, 0.95], fov: 40, foco: 0.5, forca: 0.6 }, { pos: [2.1, 3.9, 2.0], alvo: [2.05, 0.5, 0.95], fov: 42, foco: 0.5, forca: 0.6 }, k)
    : lc({ pos: [2.1, 2.9, 1.6], alvo: [2.05, 0.5, 0.92], fov: 46 }, { pos: [2.1, 3.25, 1.75], alvo: [2.05, 0.5, 0.95], fov: 48 }, k);
  return { t, cam, cena: "noite", dog: deitadoNaCama(t, { modo: "enrolado", olho: 0 }), dono: { t }, luz: { lua: 1, abajur: 1 } };
});

// ------------------------------------------------------------------------------------------ do "Mas o mais bonito" ao fim
/** início (a) da palavra `w` mais perto de `perto` segundos */
export const Ap = (w: string, perto: number) => {
  let best = -1, d = 1e9;
  PALAVRAS.forEach((p, i) => {
    if (p.w.toLowerCase().replace(/[.,!?…:;]+$/g, "") !== w.toLowerCase()) return;
    const dd = Math.abs(p.a - perto);
    if (dd < d) { d = dd; best = i; }
  });
  if (best < 0) throw new Error("palavra " + w);
  return best;
};
export const Ta = (w: string, perto: number) => A(Ap(w, perto));
export const Tc = (w: string, perto: number) => C(Ap(w, perto));
export const M = {
  sono: Ta("sono", 16.9), durante: Tc("durante", 17.6), seu2: Tc("seu", 18.5), acorda: Ta("acorda", 19.0), vinte: Ta("vinte", 19.9),
  ele4: Tc("ele", 21.3), abre: Ta("abre", 21.5), levanta: Tc("levanta", 22.6), ouve: Tc("ouve", 24.2), eVolta: Tc("e", 25.7), tranquilo: Ta("tranquilo", 26.5),
  por: Tc("por", 27.5), pernas: Ta("pernas", 29.2), ou: Tc("ou", 29.8), costas: Ta("costas", 30.3),
  assim2: Tc("assim", 31.1), ate: Tc("até", 32.4), menor: Ta("menor", 32.8),
  eUns: Tc("e", 34.6), cientistas: Ta("cientistas", 34.9), oJeito: Tc("o", 38.4), muda: Tc("muda", 41.6), dorme1: Ta("dorme", 42.7),
  os: Tc("os", 43.4), tiveram: Tc("tiveram", 45.9), vinte2: Ta("vinte", 46.5), rejeitados: Ta("rejeitados", 49.8),
  entao: Tc("então", 50.9), apagar: Ta("apagar", 52.9), luz: Ta("luz", 53.3), faca: Tc("faça", 54.0), carinho2: Ta("carinho", 54.8),
  porque: Tc("porque", 55.7), ele5: Tc("ele", 57.9), conferir: Ta("conferir", 58.7), continua: Ta("continua", 59.6),
  me: Tc("me", 60.6), segue: Ta("segue", 60.8), conta: Ta("conta", 61.2), onde: Ta("onde", 62.0),
  esse: Tc("esse", 63.4), ate2: Ta("até", 65.3), minha: Ta("minha", 65.7), quer: Tc("quer", 66.7), videos: Ta("vídeos", 67.5),
  comenta: Ta("comenta", 68.4), play: Ap("play", 68.9), link: Ta("link", 70.0), doPrompt: Ta("do", 72.2),
};
const ESCURO = { lua: 0.55, abajur: 0, hemi: 0.4 };
const DONO_CAB: V3 = [1.64, 0.64, 0.32];
const DOG_PERNAS: V3 = [2.36, 0, 1.78];
const relogioEm = (t: number) => (t < M.seu2 + 0.15 ? "23:33" : t < M.acorda + 0.55 ? "02:10" : "04:47");

// 6. "Mas o mais bonito acontece depois que você pega no sono." — a maquete do quarto inteira; o abajur se apaga em "sono"
plano(T.mas, (t) => {
  const k = k01(t, T.mas, M.durante);
  const ab = 1 - k01(t, M.sono - 0.15, M.sono + 0.45);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.0, 3.9, 4.6], alvo: [2.0, 0.35, 1.35], fov: 46 }, { pos: [2.05, 2.9, 3.6], alvo: [2.05, 0.45, 1.05], fov: 42 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t }, luz: { lua: L(1, 0.65, 1 - ab), abajur: ab, hemi: L(1, 0.45, 1 - ab) }, escuro: 0.12 * (1 - ab),
  };
});
// 7. "Durante a noite" — o relógio digital no criado-mudo correndo
plano(M.durante, (t) => {
  const k = k01(t, M.durante, M.seu2);
  return {
    t, cena: "noite", relogio: relogioEm(t),
    cam: lc({ pos: [3.6, 1.15, 1.25], alvo: [3.18, 0.6, 0.42], fov: 30 }, { pos: [3.5, 1.05, 1.1], alvo: [3.18, 0.6, 0.42], fov: 27 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t }, luz: ESCURO, escuro: 0.08,
  };
});
// 8. "seu cachorro acorda mais de vinte vezes" — de cima: ele ergue a cabeça; o relógio corre; contador fixo 20+
plano(M.seu2, (t) => {
  const k = k01(t, M.seu2, M.ele4);
  const up = eio(k01(t, M.acorda - 0.1, M.acorda + 0.35));
  return {
    t, cena: "noite", relogio: relogioEm(t),
    cam: lc({ pos: [2.05, 2.55, 1.5], alvo: [2.02, 0.5, 0.85], fov: 40 }, { pos: [2.05, 2.35, 1.4], alvo: [2.02, 0.5, 0.82], fov: 38 }, k),
    dog: deitadoNaCama(t, { olho: up > 0.3 ? 1 : 0, cabeca: 0.7 * up }), dono: { t }, luz: ESCURO, escuro: 0.06,
  };
});
// 9. "Ele abre os olhos," — perto da cabeça: o olho abre
plano(M.ele4, (t) => {
  const k = k01(t, M.ele4, M.levanta);
  return {
    t, cena: "noite",
    cam: lc({ pos: [1.92, 2.2, 1.28], alvo: [1.92, 0.5, 0.76], fov: 36 }, { pos: [1.92, 2.05, 1.2], alvo: [1.92, 0.5, 0.74], fov: 34 }, k),
    dog: deitadoNaCama(t, { olho: t > M.abre + 0.05 ? 1 : 0 }), dono: { t }, luz: ESCURO, escuro: 0.05,
  };
});
// 10. "levanta a cabeça," — plano médio: a cabeça sobe
plano(M.levanta, (t) => {
  const k = k01(t, M.levanta, M.ouve);
  const up = eio(k01(t, M.levanta + 0.05, M.levanta + 0.55));
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.4, 2.2, 2.0], alvo: [2.1, 0.5, 0.85], fov: 40 }, { pos: [2.35, 2.05, 1.85], alvo: [2.1, 0.5, 0.82], fov: 38 }, k),
    dog: deitadoNaCama(t, { olho: 1, cabeca: 0.75 * up }), dono: { t }, luz: ESCURO, escuro: 0.05,
  };
});
// 11. "ouve você respirando" — o rosto do dono dormindo (ondinhas do ronco) e a cabeça erguida dele ao lado
plano(M.ouve, (t) => {
  const k = k01(t, M.ouve, M.eVolta);
  return {
    t, cena: "noite",
    cam: lc({ pos: [1.95, 1.75, 1.25], alvo: [1.85, 0.55, 0.45], fov: 36 }, { pos: [1.93, 1.6, 1.15], alvo: [1.85, 0.55, 0.45], fov: 34 }, k),
    dog: deitadoNaCama(t, { olho: 1, cabeca: 0.75 }), dono: { t }, luz: ESCURO, escuro: 0.05,
  };
});
// 12. "e volta a dormir tranquilo." — a cabeça desce, os olhos fecham
plano(M.eVolta, (t) => {
  const k = k01(t, M.eVolta, M.por);
  const dn = eio(k01(t, M.eVolta + 0.1, M.tranquilo));
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.1, 2.6, 1.65], alvo: [2.05, 0.5, 0.9], fov: 42 }, { pos: [2.1, 2.9, 1.8], alvo: [2.05, 0.5, 0.95], fov: 44 }, k),
    dog: deitadoNaCama(t, { olho: dn > 0.6 ? 0 : 1, cabeca: 0.75 * (1 - dn) }), dono: { t }, luz: ESCURO, escuro: 0.05,
  };
});
// 13. "Por isso, ele se encosta nas suas pernas" — de cima: colado nas pernas
plano(M.por, (t) => {
  const k = k01(t, M.por, M.ou);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.0, 3.1, 2.45], alvo: [2.0, 0.5, 1.5], fov: 44 }, { pos: [2.0, 2.85, 2.35], alvo: [2.0, 0.5, 1.55], fov: 42 }, k),
    dog: deitadoNaCama(t, { olho: 0 }, DOG_PERNAS), dono: { t }, luz: ESCURO, escuro: 0.04,
  };
});
// 14. "ou nas suas costas." — colado nas costas
plano(M.ou, (t) => {
  const k = k01(t, M.ou, M.assim2);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.0, 2.85, 1.75], alvo: [2.0, 0.5, 0.95], fov: 42 }, { pos: [2.0, 2.65, 1.65], alvo: [2.0, 0.5, 0.92], fov: 40 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t }, luz: ESCURO, escuro: 0.04,
  };
});
// 15. "Assim, ele percebe até" — os pés do dono mexem embaixo do cobertor (traços de movimento)
plano(M.assim2, (t) => {
  const k = k01(t, M.assim2, M.ate);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.0, 2.3, 3.1], alvo: [1.85, 0.5, 1.75], fov: 40 }, { pos: [2.0, 2.15, 2.95], alvo: [1.85, 0.5, 1.75], fov: 38 }, k),
    dog: deitadoNaCama(t, { olho: 0 }, DOG_PERNAS), dono: { t, pe: 0.4 * Math.sin(t * 9) }, luz: ESCURO, escuro: 0.04,
  };
});
// 16. "o menor dos seus movimentos." — a orelha dele gira na direção do movimento
plano(M.ate, (t) => {
  const k = k01(t, M.ate, M.eUns);
  const gira = eio(k01(t, M.menor, M.menor + 0.3)) - 0.6 * eio(k01(t, M.menor + 1.0, M.menor + 1.4));
  return {
    t, cena: "noite",
    cam: lc({ pos: [1.98, 2.2, 2.05], alvo: [1.98, 0.5, 1.33], fov: 36 }, { pos: [1.98, 2.05, 1.95], alvo: [1.98, 0.5, 1.31], fov: 34 }, k),
    dog: deitadoNaCama(t, { olho: 1, orelha: 0.9 * gira }, DOG_PERNAS), dono: { t }, luz: ESCURO, escuro: 0.04,
  };
});
// 17. "E uns cientistas descobriram algo..." — corte para o laboratório claro, verde-água
const LAB_DOG: V3 = [22.2, 0.09, 1.2];
plano(M.eUns, (t) => {
  const k = k01(t, M.eUns, M.oJeito);
  return {
    t, cena: "lab", monitor: { t, profundo: 0.2 },
    cam: lc({ pos: [22.3, 2.6, 3.7], alvo: [22.4, 0.3, 1.0], fov: 46 }, { pos: [22.3, 2.35, 3.4], alvo: [22.4, 0.3, 1.0], fov: 44 }, k),
    dog: { pos: LAB_DOG, rotY: Math.PI / 2, pose: { modo: "deUmLado", t, olho: 0 } }, eletrodos: true, dono: null,
  };
});
// 18. "O jeito como você trata seu cachorro antes de dormir" — ele deitado tranquilo, adesivos e fios macios
plano(M.oJeito, (t) => {
  const k = k01(t, M.oJeito, M.muda);
  return {
    t, cena: "lab", monitor: { t, profundo: 0.3 },
    cam: lc({ pos: [22.6, 1.95, 2.75], alvo: [21.95, 0.15, 1.1], fov: 40 }, { pos: [22.55, 1.8, 2.55], alvo: [21.95, 0.15, 1.1], fov: 38 }, k),
    dog: { pos: LAB_DOG, rotY: Math.PI / 2, pose: { modo: "deUmLado", t, olho: 0 } }, eletrodos: true, dono: null,
  };
});
// 19. "muda o jeito como ele dorme." — a tela de ondas: as ondas ficam lentas e grandes
plano(M.muda, (t) => {
  const k = k01(t, M.muda, M.os);
  return {
    t, cena: "lab", monitor: { t, profundo: eio(k01(t, M.muda, M.dorme1 + 0.2)) },
    cam: lc({ pos: [22.95, 2.0, 2.55], alvo: [22.85, 0.55, 0.65], fov: 40 }, { pos: [22.95, 1.85, 2.35], alvo: [22.9, 0.6, 0.6], fov: 36 }, k),
    dog: { pos: LAB_DOG, rotY: Math.PI / 2, pose: { modo: "deUmLado", t, olho: 0 } }, eletrodos: true, dono: null,
  };
});
// 20. TELA DIVIDIDA (Reel usa MEIO_CIMA/MEIO_BAIXO entre M.os e M.entao)
plano(M.os, (t, dir) => splitQuente(dir, t));
// 21. "Então, hoje à noite, antes de apagar a luz," — o quarto e o interruptor; clique em "apagar" e o quarto escurece em "luz"
plano(M.entao, (t) => {
  const k = k01(t, M.entao, M.faca);
  const ab = 1 - k01(t, M.luz - 0.05, M.luz + 0.15);
  return {
    t, cena: "noite",
    cam: lc({ livre: true, pos: [2.55, 1.75, 3.45], alvo: [3.9, 1.1, 2.15], fov: 40, foco: 0.55, forca: 0.75 }, { livre: true, pos: [2.95, 1.55, 3.05], alvo: [3.95, 1.2, 2.15], fov: 34, foco: 0.55, forca: 0.75 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t }, luz: { lua: L(0.55, 1, ab), abajur: ab, hemi: L(0.4, 1, ab) }, escuro: 0.15 * (1 - ab),
  };
});
// 22. "faça mais um carinho nele." — a mão do dono no pelo; corações
plano(M.faca, (t) => {
  const k = k01(t, M.faca, M.porque);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.05, 2.25, 1.35], alvo: [2.0, 0.5, 0.8], fov: 38 }, { pos: [2.05, 2.1, 1.28], alvo: [2.0, 0.5, 0.8], fov: 36 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t, braco: 0.25 * Math.sin(t * 5) }, luz: ESCURO, escuro: 0.1,
  };
});
// 23. "Porque, enquanto você dorme," — o quarto escuro, os dois dormindo
plano(M.porque, (t) => {
  const k = k01(t, M.porque, M.ele5);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.0, 3.4, 3.4], alvo: [2.0, 0.4, 1.2], fov: 44 }, { pos: [2.0, 3.0, 2.9], alvo: [2.0, 0.45, 1.05], fov: 42 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t }, luz: { lua: 0.5, abajur: 0, hemi: 0.35 }, escuro: 0.18,
  };
});
// 24. "ele acorda pra conferir se você continua aí." — só os olhos dele abertos olhando o dono, depois fechando
plano(M.ele5, (t) => {
  const k = k01(t, M.ele5, M.me);
  const abre = t > M.ele5 + 0.15 && t < M.continua + 0.55;
  const up = eio(k01(t, M.ele5 + 0.1, M.ele5 + 0.6)) * (1 - eio(k01(t, M.continua + 0.35, M.continua + 0.9)));
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.03, 2.2, 1.3], alvo: [2.0, 0.5, 0.75], fov: 38 }, { pos: [2.02, 2.0, 1.2], alvo: [2.0, 0.5, 0.72], fov: 35 }, k),
    dog: deitadoNaCama(t, { olho: abre ? 1 : 0, cabeca: 0.55 * up, brilhoOlho: 1 }), dono: { t }, luz: { lua: 0.45, abajur: 0, hemi: 0.3 }, escuro: 0.25,
  };
});
// 25. "Me segue e me conta: onde o seu dorme?" — o quarto de cima, escurecido, com o botão SEGUIR e a enquete por cima
plano(M.me, (t) => {
  const k = k01(t, M.me, M.esse);
  return {
    t, cena: "noite",
    cam: lc({ pos: [2.0, 3.6, 3.2], alvo: [2.0, 0.4, 1.15], fov: 46 }, { pos: [2.0, 3.8, 3.4], alvo: [2.0, 0.4, 1.15], fov: 48 }, k),
    dog: deitadoNaCama(t, { olho: 0 }), dono: { t }, luz: { lua: 0.7, abajur: 0.6, hemi: 0.6 }, escuro: 0.3,
  };
});

/** B (maquete): eleva a câmera a pelo menos ~48° e afasta 1,55x, fechando a lente na mesma proporção (miniatura) */
export function camB(c: Cam): Cam {
  if (c.rel || c.livre) return { ...c, forca: c.forca ?? 0.9 };
  const d: V3 = [c.pos[0] - c.alvo[0], c.pos[1] - c.alvo[1], c.pos[2] - c.alvo[2]];
  const dist = Math.hypot(...d), hor = Math.hypot(d[0], d[2]);
  const el = Math.max(Math.atan2(d[1], hor), 0.84), az = Math.atan2(d[2], d[0]);
  const nd = dist * 1.55;
  return { ...c, pos: [c.alvo[0] + Math.cos(el) * Math.cos(az) * nd, c.alvo[1] + Math.sin(el) * nd, c.alvo[2] + Math.cos(el) * Math.sin(az) * nd], fov: (c.fov ?? 30) / 1.45, foco: 0.5, forca: 1.0, larg: 0.95 };
}
export const paraDir = (e: Estado, dir: Dir): Estado => (dir === "B" ? { ...e, cam: camB(e.cam) } : e);
function planoEm(t: number, dir: Dir): Estado {
  let p = PLANOS[0];
  for (const q of PLANOS) if (t >= q.ini) p = q;
  return p.f(t, dir);
}
/** a virada: a cena congela no último quadro antes de "Esse vídeo" e vira arame laranja + partículas */
export const TV = () => M.esse;
export function estadoEm(t: number, dir: Dir): Estado {
  if (t >= TV()) {
    const e0 = planoEm(TV() - 0.02, dir);
    return paraDir({ ...e0, escuro: (e0.escuro ?? 0) * (1 - k01(t, TV(), TV() + 0.5)), virada: { k: eio(k01(t, TV() + 0.05, TV() + 1.15)), k2: k01(t, TV() + 0.6, TV() + 3.2), t } }, dir);
  }
  return paraDir(planoEm(t, dir), dir);
}
/** tela dividida entre "Os cachorros" e "Então" */
export const SPLIT = () => [M.os, M.entao] as const;
export const MEIO_CIMA = (t: number, dir: Dir) => paraDir(splitQuente(dir, t), dir);
export const MEIO_BAIXO = (t: number, dir: Dir) => paraDir(splitFrio(dir, t), dir);
/** instantes de corte (para o medidor e a conferência) */
export const CORTES = () => PLANOS.map((p) => p.ini);

// ------------------------------------------------------------------------------------------ quadros parados da prévia
export function quadroAcorda(dir: Dir, rel = "02:10"): Estado {
  const t = 19.6;
  return {
    t, cena: "noite", relogio: rel,
    cam: { pos: [2.05, 2.45, 1.45], alvo: [2.02, 0.5, 0.82], fov: 40, foco: 0.55, forca: 0.6, larg: 1.3 },
    dog: deitadoNaCama(t, { olho: 1, cabeca: 0.7 }),
    dono: { t }, luz: { lua: 0.9, abajur: 0.0 }, escuro: 0.05,
  };
}
export function quadroConfere(dir: Dir): Estado {
  const t = 58.6;
  return {
    t, cena: "noite",
    cam: { pos: [2.02, 2.25, 1.3], alvo: [2.0, 0.5, 0.78], fov: 38, foco: 0.5, forca: 0.6, larg: 1.3 },
    dog: deitadoNaCama(t, { olho: 1, cabeca: 0.6, brilhoOlho: 1 }),
    dono: { t }, luz: { lua: 0.6, abajur: 0.0, hemi: 0.5 }, escuro: 0.12,
  };
}
export function splitQuente(dir: Dir, t = 47.0): Estado {
  const kk = eio(k01(t, M.tiveram - 0.1, M.tiveram + 0.5));
  return {
    t, cena: "noite", quente: 0.06, bola: [2.72, TOPO + 0.05, 1.75],
    cam: lc({ pos: [2.25, 3.0, 1.75], alvo: [2.2, 0.5, 1.0], fov: 48 }, { pos: [2.22, 2.5, 1.5], alvo: [2.18, 0.5, 0.9], fov: 42 }, kk),
    dog: deitadoNaCama(t, { olho: 0 }), eletrodos: true,
    dono: { t }, luz: { lua: 0.7, abajur: 1.35 },
  };
}
export function splitFrio(dir: Dir, t = 47.0): Estado {
  const kk = eio(k01(t, M.tiveram - 0.1, M.tiveram + 0.5));
  return {
    t, cena: "frio", frio: 0.08,
    cam: lc({ pos: [32.3, 1.4, 2.7], alvo: [30.6, 0.38, 0.7], fov: 42 }, { pos: [31.8, 1.1, 2.1], alvo: [30.6, 0.4, 0.7], fov: 38 }, kk),
    dog: { pos: [30.55, 0, 0.62], rotY: -0.6, pose: { modo: "baixa", t, olho: 1 } }, eletrodos: true,
    dono: null, luz: { lua: 0.9, abajur: 0, hemi: 0.5 },
  };
}
