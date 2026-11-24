import * as THREE from "three";
import type { Dir, V3 } from "./kit";
import type { Estado, RaioEstado } from "./mundo";
import { clamp, easeInOut, lerp, smooth } from "./rng";
import { altura, BASE_NUVEM, BASE_NUVEM_NY, PESSOAS, PONTA, PONTA_ES, TOPO } from "./terreno";
import { DURACAO, GAPS, PALAVRAS } from "../fala";

// ------------------------------------------------------------------ tempos da fala
export const ws = (i: number) => PALAVRAS[i].s;
export const we = (i: number) => PALAVRAS[i].e;
export const T_LAST = (Math.round(DURACAO * 30) - 1) / 30; // último quadro (= quadro 0)
export const LOOP0 = T_LAST - 0.5; // volta ao gancho
/** tempo "de loop": no fim, volta a contar a partir de -0,5 s até 0 (último quadro = primeiro). */
export const tl = (t: number) => (t >= LOOP0 ? t - T_LAST : t);

// marcos
export const M = {
  ceu: we(6),
  chao: we(10),
  trovao: GAPS.TROVAO + 0.12,
  pico: ws(11),
  pesq: ws(22),
  os: ws(30),
  metros: we(42),
  subiam: ws(43),
  quando: ws(48),
  aTorre: ws(54),
  carga: ws(57),
  base: ws(62),
  ate: ws(65),
  ponta: ws(71),
  eSobe: ws(74),
  em6: ws(76),
  // os raios começam um pouco antes e CONECTAM (clarão + estalo) fora das palavras "seis" e "três"
  r1: ws(76) - 0.25,
  r2: ws(79) - 0.33,
  r3: ws(80) + 0.19,
  todos: ws(82),
  ditado: ws(86),
  raioNao: ws(91),
  risco: GAPS.RISCO + 0.05,
  esse: ws(99),
  empire: ws(105),
  n26: ws(113),
  virada: GAPS.VIRADA,
  verdade: ws(116),
  mas: ws(121),
  voz: ws(128),
  quer: ws(132),
  comenta: ws(138),
  play: ws(139),
  doPrompt: ws(153),
  fim: we(156),
};

// ------------------------------------------------------------------ chuva: tempo desacelerado
// velocidade da chuva por trecho (câmera lenta no instante, congelada em "de verdade")
const velChuva = (t: number) => {
  if (t < M.ceu + 0.6) return 0.3;
  if (t >= M.eSobe - 0.1 && t < M.em6) return 0.12;
  if (t >= M.virada && t < M.mas) return 0;
  return 1;
};
const TAB: number[] = (() => {
  const a = [0];
  for (let i = 1; i <= Math.round(DURACAO * 30) + 2; i++) a.push(a[i - 1] + velChuva((i - 0.5) / 30) / 30);
  return a;
})();
export const tChuva = (t: number) => {
  const x = tl(t);
  if (x < 0) return x * 0.3;
  const f = x * 30, i = Math.floor(f);
  return lerp(TAB[Math.min(i, TAB.length - 1)], TAB[Math.min(i + 1, TAB.length - 1)], f - i);
};

// ------------------------------------------------------------------ ajudas de câmera
const P = PONTA;
const v = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const cam = (pos: V3, alvo: V3, fov = 30, rolo = 0) => ({ pos, alvo, fov, rolo });
const orb = (alvo: V3, dist: number, az: number, el: number): V3 => [
  alvo[0] + dist * Math.cos(el) * Math.sin(az),
  alvo[1] + dist * Math.sin(el),
  alvo[2] + dist * Math.cos(el) * Math.cos(az),
];
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// relâmpago dentro da nuvem (piscadas de fundo, determinísticas)
const PISCAS = [5.9, 6.9, 7.9, 9.3, 10.2, 11.2, 13.1, 17.9, 18.6, 19.25, 20.9, 33.4, 34.3, 35.3];
const piscas = (t: number) => {
  let f = 0;
  for (const p of PISCAS) {
    const d = t - p;
    if (d >= 0 && d < 0.5) f = Math.max(f, (d < 0.06 ? 1 : 0.55) * Math.exp(-d * 7) + (d > 0.12 && d < 0.18 ? 0.5 : 0));
  }
  return f * 0.55;
};

// crescimento do raio: p sobe com aceleração; ao tocar a nuvem, clarão de retorno e depois apaga devagar
const raioEm = (seed: number, t: number, t0: number, dur: number, o: { pico?: number; resto?: number; onde?: "torre" | "es"; vida?: number } = {}): RaioEstado => {
  const x = t - t0;
  if (x < 0) return { seed, p: 0, brilho: 0, onde: o.onde };
  const p = clamp(x / dur);
  const pe = Math.pow(p, 1.35);
  const pos = x - dur; // depois de conectar
  let b = 0.75;
  if (pos >= 0) {
    const vida = o.vida ?? 1.4;
    const resto = o.resto ?? 0.18;
    b = (o.pico ?? 1.8) * Math.exp(-pos * 9) + (pos < vida ? lerp(1.0, resto, pos / vida) : resto);
  }
  return { seed, p: pe, brilho: b, onde: o.onde };
};

// ------------------------------------------------------------------ o gancho (também o fim do loop)
// x = tempo do gancho (0 = primeiro quadro; negativo = instantes antes, usados no fim do vídeo)
const gancho = (x: number, t: number): Estado => {
  const nasce = -1.1; // a faísca começa a se formar antes do quadro 0
  // plano 1: perto da ponta, câmera sobe acompanhando
  if (x < M.ceu + 0.4) {
    const k = easeInOut(clamp(x / (M.ceu + 0.4)));
    const pr = clamp((x - nasce) / 6.9); // câmera lenta: sobe devagar
    return {
      set: "pico",
      cam: cam(v([9, P[1] - 5, 30], [15, P[1] - 2.5, 42], k), v([0, P[1] + 1, 0], [0, P[1] + 2.5, 0], k), 32),
      foco: lerp(0.45, 0.42, k),
      raios: [{ seed: 1, p: Math.max(0, Math.pow(pr, 1.25)), brilho: x < nasce ? 0 : 0.85 }],
      coroa: 0.6,
      nuvem: 1,
      cargasTorre: 0,
      flash: 0.08,
      tChuva: tChuva(t),
      sombra: 20,
    };
  }
  // plano 2: aberto, o raio inteiro sobe até a nuvem e conecta
  const k = easeInOut(k01(x, M.ceu + 0.4, M.trovao + 0.6));
  const conecta = M.chao - 0.25;
  const pr = clamp(lerp(0.42, 1, k01(x, M.ceu + 0.4, conecta)));
  const pos = x - conecta;
  const b = pos < 0 ? 0.9 : 0.6 + 1.8 * Math.exp(-pos * 6) + (pos > 0.55 && pos < 0.75 ? 1.4 : 0) * Math.exp(-(pos - 0.55) * 8);
  const fl = pos < 0 ? 0.1 : Math.exp(-pos * 3) * 0.9 + (x > M.trovao && x < M.trovao + 0.5 ? 0.7 * Math.exp(-(x - M.trovao) * 6) : 0);
  return {
    set: "pico",
    cam: cam(v([26, P[1] - 12, 92], [30, P[1] - 10, 84], k), [0, P[1] + 6, 0], 44),
    foco: 0.5,
    raios: [{ seed: 1, p: pr, brilho: x > M.trovao + 1.0 ? b * Math.max(0.15, 1 - (x - M.trovao - 1.0) / 0.6) : b }],
    coroa: 0.3,
    nuvem: 1,
    flash: fl,
    tChuva: tChuva(t),
    sombra: 60,
    tremor: x > M.trovao && x < M.trovao + 0.7 ? 0.25 * Math.exp(-(x - M.trovao) * 5) : 0,
  };
};

// ------------------------------------------------------------------ roteiro 3D
export function estado(t0: number, _dir: Dir): Estado {
  const t = t0;
  const x = tl(t);
  if (x < M.pico || t >= LOOP0) return gancho(x, t);
  const base = { nuvem: 1, tChuva: tChuva(t), flash: piscas(t), raios: [] as RaioEstado[] };

  // 2. Pico do Jaraguá: o morro com a torre e a cidade iluminada embaixo
  if (t < M.pesq) {
    const k = easeInOut(k01(t, M.pico, M.pesq));
    const al: V3 = [0, lerp(TOPO - 6, TOPO - 1, k), 0];
    return { ...base, set: "pico", cam: cam(orb(al, lerp(140, 115, k), lerp(0.55, 0.4, k), lerp(0.14, 0.12, k)), al, 34), foco: 0.45, nuvem: 0.75, sombra: 90 };
  }
  // 3. pesquisadores (silhuetas) com a câmera no tripé, a torre lá no alto
  if (t < M.os) {
    const k = easeInOut(k01(t, M.pesq, M.os));
    const [px, pz] = PESSOAS;
    const y0 = altura(px, pz);
    const u = new THREE.Vector2(px, pz).normalize();
    const s = new THREE.Vector2(-u.y, u.x);
    const d = lerp(0.48, 0.4, k);
    const pos: V3 = [px + u.x * d + s.x * lerp(0.14, 0.07, k), y0 + 0.035, pz + u.y * d + s.y * lerp(0.14, 0.07, k)];
    const alvo: V3 = [0, lerp(TOPO + 1.5, TOPO + 2.5, k), 0];
    return { ...base, set: "pico", cam: cam(pos, alvo, 66), foco: 0.4, pessoas: true, nuvem: 0.8, sombra: 4 };
  }
  // 4. a torre de 130 m: câmera sobe ao lado dela
  if (t < M.subiam) {
    const k = easeInOut(k01(t, M.os, M.subiam + 0.2));
    const al: V3 = [0, lerp(TOPO + 3.5, TOPO + 9.5, k), 0];
    return { ...base, set: "pico", cam: cam(orb(al, lerp(30, 27, k), 0.9, lerp(0.02, 0.1, k)), al, 34), foco: lerp(0.45, 0.62, k), nuvem: 0.85, sombra: 14 };
  }
  // 5. "e subiam até a nuvem": um raio sobe da ponta e a câmera vai junto
  if (t < M.quando) {
    const k = easeInOut(k01(t, M.subiam, M.quando));
    const r = raioEm(2, t, M.subiam + 0.05, 1.45, { pico: 2, resto: 0.25, vida: 0.8 });
    const al: V3 = [0, lerp(P[1] + 2, P[1] + 10, k), 0];
    return { ...base, set: "pico", cam: cam(orb(al, lerp(56, 70, k), 0.55, -0.06), al, 46), foco: 0.5, raios: [r], coroa: 0.4 * (1 - k), sombra: 40, flash: base.flash + (t > M.subiam + 1.5 ? 0.6 * Math.exp(-(t - M.subiam - 1.5) * 4) : 0) };
  }
  // 6. a tempestade passa por cima (a nuvem chega)
  if (t < M.aTorre) {
    const k = easeInOut(k01(t, M.quando, M.aTorre));
    const al: V3 = [0, lerp(P[1] + 6, P[1] + 12, k), 0];
    return { ...base, flash: base.flash * 3 + 0.12, set: "pico", cam: cam(orb(al, lerp(118, 108, k), 0.2, -0.02), al, 40), foco: 0.6, nuvem: lerp(0.0, 1, easeInOut(k01(t, M.quando - 0.3, M.aTorre + 0.2))), sombra: 80 };
  }
  // 7. a torre acumula carga contrária: laranja sobe pela torre e se junta na ponta
  if (t < M.base - 0.55) {
    const k = easeInOut(k01(t, M.aTorre, M.base - 0.55));
    const al: V3 = [0, lerp(P[1] - 5, P[1] - 2, k), 0];
    return { ...base, set: "pico", cam: cam(orb(al, lerp(26, 21, k), -0.35, 0.05), al, 36), foco: 0.6, cargasTorre: lerp(0.05, 0.62, k01(t, M.aTorre, M.ate)), sombra: 16 };
  }
  // 8. ... "à da base da nuvem": abre e mostra as azuis na base da nuvem
  if (t < M.ate) {
    const k = easeInOut(k01(t, M.base - 0.55, M.ate));
    const al: V3 = [0, lerp(P[1] + 15, P[1] + 17, k), 0];
    return {
      ...base, set: "pico", cam: cam(orb(al, lerp(62, 68, k), -0.15, -0.05), al, 36), foco: 0.5,
      cargasTorre: lerp(0.62, 0.8, k), cargasNuvem: easeInOut(k01(t, M.base - 0.2, M.base + 0.6)), sombra: 40,
    };
  }
  // 9. "até que uma descarga começa na ponta da torre...": de baixo, a ponta brilhando
  if (t < M.ponta) {
    const k = easeInOut(k01(t, M.ate, M.ponta));
    return {
      ...base, set: "pico", cam: cam(v([6.5, P[1] - 6.5, 9.5], [5.6, P[1] - 5.8, 8.2], k), [0, P[1] + 3, 0], 56), foco: 0.6,
      cargasTorre: 0.85, cargasNuvem: 1, coroa: lerp(0.15, 0.45, k), sombra: 10,
    };
  }
  // 10. close na ponta (a pausa): o brilho cresce até "e sobe"
  if (t < M.eSobe) {
    const k = easeInOut(k01(t, M.ponta, M.eSobe));
    const al: V3 = [0, P[1] - 0.3, 0];
    return { ...base, set: "pico", cam: cam(orb(al, lerp(10, 7.5, k), 0.5, 0.06), al, 36), foco: 0.5, cargasTorre: 1, cargasNuvem: 1, coroa: lerp(0.3, 0.8, k), sombra: 5 };
  }
  // 11. "e sobe": a faísca dispara para cima em câmera lenta
  if (t < M.em6) {
    const k = easeInOut(k01(t, M.eSobe, M.em6));
    const pr = clamp((t - M.eSobe + 0.05) / 9) ; // bem devagar
    const al: V3 = [0, P[1] + lerp(-1.0, 1.5, k), 0];
    return {
      ...base, set: "pico", cam: cam(orb(al, lerp(13, 19, k), lerp(0.5, 0.62, k), -0.04), al, 38), foco: 0.5,
      raios: [{ seed: 3, p: Math.pow(pr, 1.1), brilho: 0.55 }], cargasTorre: lerp(1, 0.25, k01(t, M.eSobe, M.eSobe + 0.8)), cargasNuvem: 1,
      coroa: lerp(0.7, 0.25, k), sombra: 8, flash: 0.12,
    };
  }
  // 12. "em 6 minutos, foram 3 raios": três descargas do mesmo ponto
  if (t < M.todos) {
    const k = easeInOut(k01(t, M.em6, M.todos));
    const r1 = raioEm(4, t, M.r1, 0.32, { resto: 0.08, vida: 0.6 });
    const r2 = raioEm(5, t, M.r2, 0.3, { resto: 0.08, vida: 0.6 });
    const r3 = raioEm(6, t, M.r3, 0.3, { resto: 0.1, vida: 0.6 });
    const al: V3 = [0, P[1] + 10, 0];
    const fl = [M.r1, M.r2, M.r3].reduce((f, a) => f + (t > a + 0.3 ? 0.45 * Math.exp(-(t - a - 0.3) * 6) : 0), 0);
    return { ...base, set: "pico", cam: cam(orb(al, lerp(74, 68, k), lerp(-0.25, -0.05, k), -0.04), al, 46), foco: 0.5, raios: [r1, r2, r3], flash: base.flash + fl, sombra: 40 };
  }
  // 13. "todos do mesmo ponto": os três rastros saindo da mesma ponta
  if (t < M.ditado) {
    const k = easeInOut(k01(t, M.todos, M.ditado));
    const al: V3 = [0, P[1] + 2.5, 0];
    const rs = [4, 5, 6].map((s) => ({ seed: s, p: 1, brilho: 0.18 + 0.05 * Math.sin(t * 9 + s) }));
    return { ...base, set: "pico", cam: cam(orb(al, lerp(30, 24, k), lerp(0.1, 0.25, k), -0.04), al, 44), foco: 0.4, raios: rs, coroa: 0.35, sombra: 20 };
  }
  // 14. o ditado: torre no escuro, chuva, piscadas na nuvem
  if (t < M.risco) {
    const meio = (M.ditado + M.risco) / 2;
    if (t < meio) {
      const k = easeInOut(k01(t, M.ditado, meio));
      const al: V3 = [0, P[1] - 4, 0];
      return { ...base, set: "pico", cam: cam(orb(al, lerp(46, 40, k), lerp(-0.9, -0.7, k), 0.05), al, 36), foco: 0.4, sombra: 30 };
    }
    const k = easeInOut(k01(t, meio, M.risco));
    const al: V3 = [0, P[1] - 1, 0];
    return { ...base, set: "pico", cam: cam(orb(al, lerp(22, 19, k), lerp(1.1, 1.25, k), -0.25), al, 38), foco: 0.4, coroa: 0.2, sombra: 16 };
  }
  // 15. "esse sai sempre do mesmo lugar": de novo e de novo da mesma ponta
  if (t < M.empire) {
    const k = easeInOut(k01(t, M.risco, M.empire));
    const al: V3 = [0, P[1] + 7, 0];
    const rs = [raioEm(7, t, M.esse + 0.05, 0.3, { resto: 0, vida: 0.6 }), raioEm(8, t, M.esse + 1.15, 0.3, { resto: 0, vida: 0.6 }), raioEm(1, t, M.esse + 2.05, 0.28, { resto: 0, vida: 0.6 })];
    const fl = rs.reduce((f, r) => f + (r.brilho > 1 ? 0.5 : 0), 0);
    return { ...base, set: "pico", cam: cam(orb(al, lerp(70, 62, k), lerp(0.75, 0.6, k), -0.04), al, 46), foco: 0.5, raios: rs, flash: base.flash + fl, sombra: 40 };
  }
  // 16. Empire State: descargas para cima, o contador corre até 26
  if (t < M.virada) {
    const k = easeInOut(k01(t, M.empire, M.virada));
    const al: V3 = [-9, lerp(40, 47, k), 0];
    const rs: RaioEstado[] = [];
    let fl = 0;
    for (let i = 0; i < 26; i++) {
      const a = M.empire + 0.12 + (i / 25) * (M.n26 - M.empire - 0.12);
      if (t < a || t > a + 0.9) continue;
      const r = raioEm(100 + i, t, a, 0.11, { resto: 0, vida: 0.35, onde: "es", pico: 1.4 });
      rs.push(r);
      if (t > a + 0.11) fl += 0.35 * Math.exp(-(t - a - 0.11) * 8);
    }
    // depois do 26: um último raio cheio que fica no ar
    if (t > M.n26) rs.push(raioEm(126, t, M.n26 + 0.02, 0.18, { resto: 0.5, vida: 0.9, onde: "es" }));
    return {
      ...base, set: "ny", cam: cam(orb(al, lerp(104, 92, k), lerp(-0.45, -0.3, k), -0.1), al, 40), foco: 0.55,
      raios: rs.slice(-5), flash: base.flash + Math.min(1, fl), sombra: 60,
    };
  }
  // 17. "Os raios são de verdade": silêncio, tudo congela (chuva parada no ar)
  if (t < M.mas) {
    const k = easeInOut(k01(t, M.virada, M.mas));
    const al: V3 = [0, P[1] + 7, 0];
    return {
      ...base, set: "pico", cam: cam(orb(al, lerp(66, 60, k), 0.3, -0.04), al, 46), foco: 0.5,
      raios: [{ seed: 1, p: 1, brilho: 1.1 }], flash: 0.35, sombra: 40,
    };
  }
  // 18. virada IA: a cena congelada vira arame laranja e partículas
  if (t < M.comenta) {
    const k = easeInOut(k01(t, M.mas, M.comenta));
    const al: V3 = [0, TOPO + 8, 0];
    return {
      ...base, set: "pico", cam: cam(orb(al, lerp(70, 54, k), lerp(0.3, 1.2, k), lerp(-0.05, 0.12, k)), al, 40), foco: 0.5,
      raios: [{ seed: 1, p: 1, brilho: 1 }], wire: 1, part: easeInOut(k01(t, M.mas + 0.6, M.comenta)), flash: 0, sombra: 40,
    };
  }
  // 19. chamada (PLAY): a torre de noite, câmera se aproximando da ponta (prepara o loop)
  const k = easeInOut(k01(t, M.comenta, LOOP0));
  const al: V3 = [0, lerp(P[1] - 3, P[1] + 1, k), 0];
  return { ...base, set: "pico", cam: cam(orb(al, lerp(46, 30, k), lerp(0.05, 0.3, k), lerp(-0.05, -0.08, k)), al, 34), foco: 0.5, coroa: lerp(0, 0.7, k), sombra: 30 };
}


// ------------------------------------------------------------------ projeção (para ancorar textos na cena)
const camTmp = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.02, 3000);
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
export { PONTA, PONTA_ES, BASE_NUVEM, BASE_NUVEM_NY, TOPO };
