import React from "react";
import { Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { acha, defesas, LOOP0, M, mundo, P_FECH, P_JAN, P_SEG, P_TRAB, pressao, projeta, temperatura, tl } from "../three/cenas";
import type { Estado } from "../three/mundo";
import type { V3 } from "../three/kit";
import { PALAVRAS } from "../fala";
import { ONDA } from "../onda";

export const { fontFamily: FONTE } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });
export const { fontFamily: MONO } = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });
export const LARANJA = "#FF6B2C";
export const TINTA = "#0B1026";

const c01 = (x: number) => Math.min(1, Math.max(0, x));
const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const eio = (x: number) => (c01(x) < 0.5 ? 4 * c01(x) ** 3 : 1 - Math.pow(-2 * c01(x) + 2, 3) / 2);
export const mola = (x: number) => {
  const t = c01(x);
  if (t <= 0) return 0;
  return 1 - Math.exp(-t * 7) * Math.cos(t * 9);
};
const SOMBRA = "0 6px 22px rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.9)";
const vis = (t: number, a: number, b: number, fi = 0.18, fo = 0.18) => Math.min(k01(t, a, a + fi), 1 - k01(t, b - fo, b));
const CARTAO = "rgba(11,16,38,0.84)";

// ------------------------------------------------------------------ ícones
type IcoN = "termo" | "anel" | "peso" | "pino" | "janela" | "cadeado" | "escudo" | "relogio";
const Ico: React.FC<{ n: IcoN; s?: number; cor?: string }> = ({ n, s = 34, cor = "#fff" }) => {
  const p: Record<IcoN, React.ReactNode> = {
    termo: <path d="M10 3a2 2 0 0 1 4 0v10.3a4.5 4.5 0 1 1-4 0zm1 11a3 3 0 1 0 2 0V8h-2z" fill={cor} />,
    anel: <circle cx="12" cy="12" r="7" stroke={cor} strokeWidth="3.6" fill="none" />,
    peso: <path d="M9 3h6v3h3l2 14H4L6 6h3zm2 0v3h2V3z" fill={cor} />,
    pino: <path d="M10 2h4v4h-1v9h3v2H8v-2h3V6h-1zM5 19h14v3H5z" fill={cor} />,
    janela: <path d="M3 9h18v6H3zm6 1.5v3h6v-3z" fill={cor} fillRule="evenodd" />,
    cadeado: <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" fill={cor} />,
    escudo: <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" fill={cor} />,
    relogio: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.6 2.1-1 1.7L11 13V6h2z" fill={cor} />,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {p[n]}
    </svg>
  );
};

const Pilula: React.FC<{ texto: React.ReactNode; ico: IcoN; esc?: number; destaque?: boolean }> = ({ texto, ico, esc = 1, destaque }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 * esc, padding: `${10 * esc}px ${26 * esc}px ${10 * esc}px ${10 * esc}px`, borderRadius: 999, background: CARTAO, border: `${2 * esc}px solid ${destaque ? LARANJA : "rgba(255,255,255,0.16)"}`, boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
    <div style={{ width: 54 * esc, height: 54 * esc, borderRadius: 999, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <Ico n={ico} s={32 * esc} />
    </div>
    <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40 * esc, color: "#fff", whiteSpace: "nowrap" }}>{texto}</span>
  </div>
);

// ------------------------------------------------------------------ gancho: "4 JEITOS DE / EXPLODIR" + 4 pontos piscando
const DEF: { id: "trab" | "seg" | "jan" | "fech"; p: V3; nome: string; ico: IcoN; t: () => number }[] = [
  { id: "trab", p: [P_TRAB[0], P_TRAB[1] + 0.2, P_TRAB[2]], nome: "válvula de trabalho", ico: "peso", t: () => M.trab },
  { id: "seg", p: [P_SEG[0], P_SEG[1] + 0.08, P_SEG[2]], nome: "válvula de segurança", ico: "pino", t: () => M.seg },
  { id: "jan", p: P_JAN, nome: "segurança lateral", ico: "janela", t: () => M.lat },
  { id: "fech", p: [P_FECH[0], P_FECH[1] + 0.05, P_FECH[2]], nome: "válvula de fechamento", ico: "cadeado", t: () => M.fech },
];

export const Gancho: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const x = tl(t);
  if (x >= M.comum) return null;
  const sai = 1 - k01(x, M.comum - 0.3, M.comum);
  const ent1 = x < 0 ? 1 : 1; // já no quadro 0
  const bate = mola(k01(x, M.defesa - 1.4, M.defesa - 0.9));
  const sh = Math.sin(x * 70) * 3 * (x < M.defesa ? 1 : 0.4);
  const L: React.CSSProperties = { fontFamily: FONTE, fontWeight: 700, lineHeight: 0.98, letterSpacing: -3, textShadow: SOMBRA, color: "#fff" };
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center", opacity: sai * ent1, transform: `translateX(${sh}px)` }}>
        <div style={{ ...L, fontSize: 128 }}>
          <span style={{ color: LARANJA }}>4</span> JEITOS DE
        </div>
        <div style={{ ...L, fontSize: 170, color: LARANJA, transform: `scale(${1 + 0.06 * bate * (1 - k01(x, M.defesa - 0.9, M.defesa - 0.4))})`, display: "inline-block" }}>EXPLODIR</div>
      </div>
      <Pontos t={x} e={e} op={sai} />
    </>
  );
};

/** 4 pontos laranja na tampa (projeção das 4 defesas) */
const Pontos: React.FC<{ t: number; e: Estado; op: number; rotulos?: boolean }> = ({ t, e, op }) => {
  const off = e.tampa;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
      {DEF.map((d, i) => {
        const pw = mundo(d.p, e.rot);
        const [x, y] = projeta(e, [pw[0], pw[1] + (off.pos ?? 0) * 2.4, pw[2]]);
        const f = 0.5 + 0.5 * Math.sin(t * 7 - i * 1.5);
        const pulso = ((t * 1.3 + i * 0.25) % 1);
        return (
          <g key={d.id}>
            <circle cx={x} cy={y} r={14 + 30 * pulso} fill="none" stroke={LARANJA} strokeWidth={4} opacity={(1 - pulso) * 0.9} />
            <circle cx={x} cy={y} r={15} fill={LARANJA} opacity={0.45 + 0.55 * f} />
            <circle cx={x} cy={y} r={6} fill="#fff" opacity={0.6 + 0.4 * f} />
          </g>
        );
      })}
    </svg>
  );
};

// ------------------------------------------------------------------ termômetro (100 °C -> ~120 °C) e relógio rápido
export const Termometro: React.FC<{ t: number }> = ({ t }) => {
  const a = M.cem - 0.35, b = M.mas1;
  if (t < a || t > b) return null;
  const o = vis(t, a, b, 0.25, 0.25);
  const v = temperatura(t);
  const k = (v - 60) / 70; // escala de 60 a 130
  const H = 400, X = 70, Y = 300;
  const yv = Y + H - k * H;
  const y100 = Y + H - ((100 - 60) / 70) * H;
  const y120 = Y + H - ((120 - 60) / 70) * H;
  const subiu = t >= M.cento;
  const pop = mola(k01(t, subiu ? M.cento : M.cem, (subiu ? M.cento : M.cem) + 0.45));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect x={X - 6} y={Y - 30} width={92} height={H + 150} rx={46} fill={CARTAO} />
        <rect x={X + 24} y={Y} width={32} height={H + 10} rx={16} fill="rgba(255,255,255,0.15)" />
        <rect x={X + 24} y={yv} width={32} height={Y + H + 10 - yv} rx={16} fill={LARANJA} />
        <circle cx={X + 40} cy={Y + H + 52} r={36} fill={LARANJA} />
        {[y100, y120].map((y, i) => (
          <line key={i} x1={X + 62} y1={y} x2={X + 84} y2={y} stroke="#fff" strokeWidth={4} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: X + 104, top: yv - 37, transform: `scale(${0.7 + 0.3 * pop})`, transformOrigin: "left center" }}>
        <Pilula ico="termo" texto={<span style={{ color: "#fff" }}>{subiu ? "~120 °C" : t >= M.chega ? `${Math.round(v)} °C` : "100 °C"}</span>} destaque={subiu} />
      </div>
      {t >= M.comida - 0.1 && (
        <div style={{ position: "absolute", left: X + 104, top: Y + H - 10, opacity: vis(t, M.comida - 0.1, b, 0.2, 0.25) }}>
          <Cronometro t={t} />
        </div>
      )}
    </div>
  );
};
const Cronometro: React.FC<{ t: number }> = ({ t }) => {
  const a = (t - M.comida) * 1400; // ponteiro correndo (time-lapse)
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={70} r={52} fill={CARTAO} stroke="#fff" strokeWidth={6} />
      <rect x={57} y={6} width={16} height={12} rx={3} fill="#fff" />
      <path d={`M65 70 L${65 + 40 * Math.sin((a * Math.PI) / 180)} ${70 - 40 * Math.cos((a * Math.PI) / 180)}`} stroke={LARANJA} strokeWidth={7} strokeLinecap="round" />
      <path d={`M65 70 L${65 + 26 * Math.sin((a * Math.PI) / 2160)} ${70 - 26 * Math.cos((a * Math.PI) / 2160)}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
      <circle cx={65} cy={70} r={7} fill="#fff" />
      <path d="M104 22 l10 0 l-5 8z M114 22 l10 0 l-5 8z" fill={LARANJA} transform="rotate(90 114 26)" />
    </svg>
  );
};

// ------------------------------------------------------------------ manômetro (sobe a cada perigo, volta quando a defesa entra)
export const Manometro: React.FC<{ t: number }> = ({ t }) => {
  const a = M.pressao1 - 0.2, b = M.virada;
  if (t < a || t > b) return null;
  const v = pressao(t);
  if (v < 0) return null;
  const o = vis(t, a, b, 0.25, 0.2);
  const R = 92, cx = 1080 - 56 - 110, cy = 270 + 116;
  const ang = (x: number) => ((-120 + 240 * x) * Math.PI) / 180;
  const arco = (x0: number, x1: number) => {
    const p0 = [cx + R * Math.sin(ang(x0)), cy - R * Math.cos(ang(x0))], p1 = [cx + R * Math.sin(ang(x1)), cy - R * Math.cos(ang(x1))];
    return `M${p0[0]} ${p0[1]} A${R} ${R} 0 ${x1 - x0 > 0.75 ? 1 : 0} 1 ${p1[0]} ${p1[1]}`;
  };
  const verm = v > 0.8;
  const pul = verm ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <circle cx={cx} cy={cy} r={R + 22} fill={CARTAO} stroke={verm ? `rgba(255,59,48,${0.5 + 0.5 * pul})` : "rgba(255,255,255,0.16)"} strokeWidth={verm ? 6 : 2} />
      <path d={arco(0, 0.6)} stroke="#3ecf6e" strokeWidth={14} fill="none" />
      <path d={arco(0.6, 0.8)} stroke="#ffc43d" strokeWidth={14} fill="none" />
      <path d={arco(0.8, 1)} stroke="#ff3b30" strokeWidth={14} fill="none" />
      <line x1={cx} y1={cy} x2={cx + (R - 18) * Math.sin(ang(v))} y2={cy - (R - 18) * Math.cos(ang(v))} stroke="#fff" strokeWidth={8} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={12} fill={LARANJA} />
      <text x={cx} y={cy + 62} textAnchor="middle" fontFamily={FONTE} fontWeight={700} fontSize={26} letterSpacing={3} fill="rgba(255,255,255,0.8)">PRESSÃO</text>
    </svg>
  );
};

// ------------------------------------------------------------------ lista "4 DEFESAS" no canto + selo que voa até ela
const LX = 40, LY = 268, LW = 470, ROW = 66;
const slot = (i: number): [number, number] => [LX + 18, LY + 78 + i * ROW];
export const Lista: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.mas2, b = M.parabens;
  if (t < a || t > b) return null;
  const o = vis(t, a, b, 0.3, 0.3);
  const n = defesas(t);
  return (
    <>
      <div style={{ position: "absolute", left: LX, top: LY, width: LW, opacity: o, padding: "16px 18px 12px", borderRadius: 26, background: "rgba(11,16,38,0.72)", border: "2px solid rgba(255,255,255,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONTE, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "rgba(255,255,255,0.85)", height: 44 }}>
          <Ico n="escudo" s={30} cor={LARANJA} /> DEFESAS <span style={{ color: LARANJA, marginLeft: "auto", fontSize: 34 }}>{n}/4</span>
        </div>
        {DEF.map((d, i) => {
          const chega = d.t() + 1.15;
          const cheio = t >= chega;
          const pop = mola(k01(t, chega, chega + 0.4));
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, height: ROW }}>
              <div style={{ width: 46, height: 46, borderRadius: 99, flex: "none", background: cheio ? LARANJA : "transparent", border: cheio ? "none" : "3px dashed rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${cheio ? 0.8 + 0.2 * pop : 1})` }}>
                {cheio ? <Ico n={d.ico} s={28} /> : <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 24, color: "rgba(255,255,255,0.45)" }}>{i + 1}</span>}
              </div>
              <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: cheio ? "#fff" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{cheio ? d.nome : "?"}</span>
            </div>
          );
        })}
      </div>
      {DEF.map((d, i) => {
        // selo aparece junto da peça no nome e voa para o canto
        const t0 = d.t();
        if (t < t0 - 0.05 || t > t0 + 1.2) return null;
        const pw = mundo(d.p, e.rot);
        const [px, py] = projeta(e, pw);
        const ax = Math.min(Math.max(px - 230, 40), 1080 - 40 - 520);
        const ay = Math.min(Math.max(py + 70, 300), 1360);
        const voa = eio(k01(t, t0 + 0.8, t0 + 1.2));
        const [sx, sy] = slot(i);
        const x = ax + (sx - ax) * voa, y = ay + (sy - ay) * voa;
        const pop = mola(k01(t, t0 - 0.05, t0 + 0.4));
        return (
          <div key={d.id} style={{ position: "absolute", left: x, top: y, transform: `scale(${(0.6 + 0.4 * pop) * (1 - 0.4 * voa)})`, transformOrigin: "left top", opacity: c01(pop * 1.5) * (1 - k01(t, t0 + 1.12, t0 + 1.2)) }}>
            <Pilula ico={d.ico} texto={d.nome} destaque />
            <div style={{ position: "absolute", right: -16, top: -22, padding: "4px 14px", borderRadius: 99, background: LARANJA, fontFamily: FONTE, fontWeight: 700, fontSize: 28, color: "#fff" }}>{i + 1}/4</div>
          </div>
        );
      })}
    </>
  );
};

/** selo do anel de vedação (não é defesa: é o que faz a pressão existir) */
export const SeloAnel: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.vedacao - 0.05, b = M.mas2 - 0.05;
  if (t < a || t > b) return null;
  const pw = mundo([1.12, 1.29, 0], e.rot);
  const [px, py] = projeta(e, [pw[0], pw[1], 0]);
  const pop = mola(k01(t, a, a + 0.45));
  return (
    <div style={{ position: "absolute", left: Math.min(Math.max(px - 300, 40), 520), top: Math.min(Math.max(py + 90, 300), 1300), transform: `scale(${0.6 + 0.4 * pop})`, opacity: c01(pop * 1.5) * (1 - k01(t, b - 0.2, b)) }}>
      <Pilula ico="anel" texto="anel de vedação" destaque />
    </div>
  );
};

// ------------------------------------------------------------------ Parabéns: os 4 selos à volta da panela
export const SelosParabens: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.parabens - 0.05, b = M.virada - 0.02;
  if (t < a || t > b) return null;
  const o = 1 - k01(t, b - 0.15, b);
  // grade 2x2 no alto: esquerda = fechamento, trabalho; direita = segurança, lateral
  const POS: Record<string, [number, number, "e" | "d"]> = { fech: [40, 292, "e"], trab: [40, 392, "e"], seg: [1040, 292, "d"], jan: [1040, 392, "d"] };
  const W = 430;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {DEF.map((d, i) => {
          const pw = mundo(d.p, e.rot);
          const [px, py] = projeta(e, pw);
          const ent = eo(k01(t, a + i * 0.12, a + i * 0.12 + 0.4));
          const [lx, ly, lado] = POS[d.id];
          const ax = lado === "e" ? lx + W * 0.5 : lx - W * 0.5, ay = ly + 70;
          return (
            <g key={d.id} opacity={c01(ent * 1.4)}>
              <path d={`M${ax} ${ay} L${ax + (px - ax) * ent} ${ay + (py - ay) * ent}`} stroke={LARANJA} strokeWidth={4} fill="none" />
              <circle cx={px} cy={py} r={13 * ent} fill={LARANJA} />
              <circle cx={px} cy={py} r={5 * ent} fill="#fff" />
            </g>
          );
        })}
      </svg>
      {DEF.map((d, i) => {
        const ent = mola(k01(t, a + i * 0.12, a + i * 0.12 + 0.45));
        const [lx, ly, lado] = POS[d.id];
        return (
          <div key={d.id} style={{ position: "absolute", top: ly, ...(lado === "e" ? { left: lx } : { right: 1080 - lx }), opacity: c01(ent * 1.4), transform: `scale(${0.8 * (0.7 + 0.3 * ent)})`, transformOrigin: lado === "e" ? "left top" : "right top" }}>
            <Pilula ico={d.ico} texto={d.nome} destaque />
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ virada: varredura laranja, rosto de linhas, prompt
export const Varredura: React.FC<{ t: number }> = ({ t }) => {
  const at = [M.virada, M.comenta].find((a) => t >= a - 0.02 && t < a + 0.4);
  if (at === undefined) return null;
  const k = k01(t, at - 0.02, at + 0.4);
  const y = k * 1920;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 6, height: 12, background: LARANJA, boxShadow: `0 0 60px 20px ${LARANJA}` }} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: (1 - k) * 0.25 }} />
    </div>
  );
};

const rosto = (x: number, y: number) => {
  const cab = Math.max(0, 1 - (x * x) / 0.42 - ((y + 0.05) * (y + 0.05)) / 0.78);
  if (cab <= 0) return 0;
  let h = Math.sqrt(cab) * 0.55;
  h += 0.32 * Math.exp(-(x * x) / 0.006 - ((y - 0.05) ** 2) / 0.05);
  h -= 0.14 * (Math.exp(-((x - 0.22) ** 2) / 0.01 - ((y + 0.22) ** 2) / 0.006) + Math.exp(-((x + 0.22) ** 2) / 0.01 - ((y + 0.22) ** 2) / 0.006));
  h += 0.1 * Math.exp(-((y + 0.42) ** 2) / 0.012) * Math.exp(-(x * x) / 0.12);
  h += 0.08 * Math.exp(-((y - 0.38) ** 2) / 0.004 - (x * x) / 0.03);
  return h;
};
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
export const VozRosto: React.FC<{ t: number }> = ({ t }) => {
  const a = M.ia - 0.2, b = M.quer + 0.05;
  if (t < a || t > b) return null;
  const f = Math.round(t * 30);
  const amp = (i: number) => ONDA[Math.max(0, Math.min(ONDA.length - 1, i))] ?? 0;
  const m = eo(k01(t, M.voz - 0.1, M.voz + 0.6));
  const o = vis(t, a, b, 0.25, 0.3);
  const N = 26, W = 700, X0 = 190, Y0 = 470, Hh = 760;
  const linhas: string[] = [];
  for (let j = 0; j < N; j++) {
    const yN = -1 + (2 * j) / (N - 1);
    const yBase = lerpN(Y0 + Hh / 2, Y0 + Hh * (j / (N - 1)), m);
    let d = "";
    for (let i = 0; i <= 80; i++) {
      const xN = -1 + (2 * i) / 80;
      const onda = amp(f - Math.round((1 - i / 80) * 24)) * 130 * Math.sin(i * 0.9 + t * 14 + j) * Math.exp(-xN * xN * 1.5);
      const boca = Math.exp(-((yN - 0.38) ** 2) / 0.01) * amp(f) * 60 * Math.exp(-(xN * xN) / 0.05);
      const yy = yBase - m * rosto(xN, yN) * 360 + (1 - m) * onda * (j === Math.floor(N / 2) ? 1 : 0.6) - m * boca;
      d += `${i ? "L" : "M"}${(X0 + ((xN + 1) / 2) * W).toFixed(1)} ${yy.toFixed(1)} `;
    }
    linhas.push(d);
  }
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <rect x={0} y={0} width={1080} height={1920} fill={TINTA} opacity={0.45 * m} />
      {linhas.map((d, j) => (
        <path key={j} d={d} stroke={LARANJA} strokeWidth={j % 5 === 0 ? 4 : 2.5} fill="none" opacity={m < 0.5 && j !== Math.floor(N / 2) ? 0.25 + m : 0.95} />
      ))}
    </svg>
  );
};

export const Prompt: React.FC<{ t: number }> = ({ t }) => {
  const a = M.quer - 0.15, b = M.comenta;
  if (t < a || t > b) return null;
  const txt = "panela de pressão de alumínio em corte, no fogo, com as 4 defesas acendendo em laranja";
  const n = Math.floor(txt.length * k01(t, a + 0.15, b - 0.25));
  const o = vis(t, a, b, 0.2, 0.15);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 470, opacity: o, transform: `translateY(${(1 - eo(k01(t, a, a + 0.3))) * 40}px)` }}>
      <div style={{ padding: "30px 36px", borderRadius: 28, background: "rgba(11,16,38,0.92)", border: `2px solid ${LARANJA}` }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LARANJA, marginBottom: 14, letterSpacing: 3 }}>PROMPT</div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 44, color: "#fff", lineHeight: 1.3, minHeight: 290 }}>
          {txt.slice(0, n)}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>▍</span>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ chamada: Seguir, comentário PLAY, Do Prompt ao Play
export const Chamada: React.FC<{ t: number }> = ({ t }) => {
  const a = M.comenta - 0.05;
  if (t < a || t >= LOOP0) return null;
  const o = 1 - k01(t, LOOP0 - 0.25, LOOP0);
  const toque = M.comenta + 0.15;
  const seguiu = t >= toque + 0.1;
  const ent = eo(k01(t, a, a + 0.3));
  const dig = "PLAY".slice(0, Math.floor(4 * k01(t, M.play, M.play + 0.32)));
  const enviado = t > M.play + 0.8;
  const logo = mola(k01(t, M.doPrompt - 0.15, M.doPrompt + 0.45));
  const dedo = (cx: number, cy: number, t0: number) => {
    const k = k01(t, t0 - 0.25, t0 + 0.35);
    if (k <= 0 || k >= 1) return null;
    const desce = eo(k01(t, t0 - 0.25, t0));
    return <div style={{ position: "absolute", left: cx - 45, top: cy - 45 + (1 - desce) * 60, width: 90, height: 90, borderRadius: 99, background: "rgba(255,255,255,0.35)", border: "4px solid #fff", transform: `scale(${t > t0 ? 0.85 : 1})`, opacity: 1 - k01(t, t0 + 0.15, t0 + 0.35) }} />;
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: 300, transform: `translateY(${(1 - ent) * -50}px)`, opacity: ent }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 26px", borderRadius: 30, background: "rgba(11,16,38,0.9)" }}>
          <div style={{ width: 96, height: 96, borderRadius: 99, background: `conic-gradient(${LARANJA}, #ffb36b, ${LARANJA})`, padding: 5 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 99, background: TINTA, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 10 10"><path d="M3 2 8 5 3 8z" fill={LARANJA} /></svg>
            </div>
          </div>
          <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#fff" }}>seu.perfil</div>
          <div style={{ padding: "16px 34px", borderRadius: 18, background: seguiu ? "rgba(255,255,255,0.16)" : LARANJA, fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: "#fff", transform: `scale(${t > toque && t < toque + 0.15 ? 0.92 : 1})` }}>
            {seguiu ? "Seguindo" : "Seguir"}
          </div>
        </div>
      </div>
      {dedo(1080 - 70 - 110, 300 + 70, toque)}
      <div style={{ position: "absolute", left: 70, right: 70, top: 470, opacity: eo(k01(t, M.play - 0.35, M.play - 0.05)) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 30px", borderRadius: 999, background: "rgba(255,255,255,0.96)" }}>
          <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 46, color: dig ? "#111" : "#888" }}>
            {dig || "Adicione um comentário…"}
            {!enviado && dig && <span style={{ color: LARANJA, opacity: Math.floor(t * 4) % 2 }}>|</span>}
          </div>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 36, color: dig.length === 4 ? LARANJA : "#bbb" }}>{enviado ? "Enviado ✓" : "Publicar"}</div>
        </div>
      </div>
      {dedo(1080 - 70 - 100, 470 + 55, M.play + 0.65)}
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, display: "flex", justifyContent: "center", opacity: c01(logo * 1.5), transform: `scale(${0.75 + 0.25 * logo})` }}>
        <div style={{ padding: "26px 40px", borderRadius: 36, background: "rgba(11,16,38,0.85)" }}>
          <Img src={staticFile("logo_dpap.png")} style={{ width: 620, display: "block" }} />
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ legenda por grupo de palavras
const I = {
  gancho1: acha("a panela de pressao tem"),
  cem: acha("100"),
  graus: acha("graus"),
  cento: acha("120"),
  esseAnel: acha("esse e o anel de vedacao"),
  essaTrab: acha("essa e a valvula de trabalho"),
  essaSeg: acha("essa e a valvula de seguranca"),
  essaLat: acha("essa e a seguranca lateral"),
  essaFech: acha("essa e a valvula de fechamento"),
  doPrompt: acha("do prompt ao play"),
};
const GRAFIA: Record<number, string> = { [I.cem]: "100\u00a0°C", [I.graus]: "", [I.cento]: "120\u00a0°C." };
const OCULTA: [number, number][] = [
  [I.gancho1, I.gancho1 + 8], // gancho: "4 JEITOS DE EXPLODIR" está na tela
  [I.esseAnel, I.esseAnel + 5], // o selo "anel de vedação"
  [I.essaTrab, I.essaTrab + 5], // os selos das defesas
  [I.essaSeg, I.essaSeg + 5],
  [I.essaLat, I.essaLat + 4],
  [I.essaFech, I.essaFech + 5],
  [I.doPrompt, I.doPrompt + 3], // o logo
];
const oculta = (i: number) => OCULTA.some(([a, b]) => i >= a && i <= b);
const txt = (i: number) => (GRAFIA[i] ?? PALAVRAS[i].w).replace(/[.,]$/g, "");
type Grupo = { ini: number; fim: number; ids: number[] };
const MAXC = 30;
const GRUPOS: Grupo[] = (() => {
  const trechos: number[][] = [];
  let cur: number[] = [];
  const fecha = () => {
    if (cur.length) trechos.push(cur);
    cur = [];
  };
  PALAVRAS.forEach((p, i) => {
    if (oculta(i)) return fecha();
    if (!txt(i)) {
      if (/[.?!,]$/.test(p.w)) fecha();
      return;
    }
    cur.push(i);
    if (/[.?!,]$/.test(GRAFIA[i] ?? p.w)) fecha();
  });
  fecha();
  const tam = (ids: number[]) => ids.reduce((s, i) => s + txt(i).length + 1, 0);
  const unidos: number[][] = [];
  for (const tr of trechos) {
    const ult = unidos[unidos.length - 1];
    const fimFrase = ult && /[.?!]$/.test(GRAFIA[ult[ult.length - 1]] ?? PALAVRAS[ult[ult.length - 1]].w);
    if (ult && !fimFrase && tam(ult) + tam(tr) <= MAXC && tr[0] === ult[ult.length - 1] + 1) ult.push(...tr);
    else unidos.push([...tr]);
  }
  const gs: Grupo[] = [];
  for (const tr of unidos) {
    const n = Math.ceil(tam(tr) / MAXC);
    const alvo = tam(tr) / n;
    let parte: number[] = [];
    let acc = 0, k = 1;
    tr.forEach((i, j) => {
      parte.push(i);
      acc += txt(i).length + 1;
      if (k < n && acc >= alvo * k - 3 && j < tr.length - 1) {
        gs.push({ ini: PALAVRAS[parte[0]].s, fim: PALAVRAS[parte[parte.length - 1]].e, ids: parte });
        parte = [];
        k++;
      }
    });
    if (parte.length) gs.push({ ini: PALAVRAS[parte[0]].s, fim: PALAVRAS[parte[parte.length - 1]].e, ids: parte });
  }
  return gs;
})();
export const GRUPOS_DEBUG = () => GRUPOS.map((g) => g.ids.map(txt).join(" "));
const MAIUSC = new Set(["ia", "play", "cozinheiro", "aprendiz"]);
export const Legenda: React.FC<{ t: number }> = ({ t }) => {
  const g = GRUPOS.find((g, i) => t >= g.ini - 0.05 && t < Math.min(g.fim + 0.45, (GRUPOS[i + 1]?.ini ?? 1e9) - 0.05));
  if (!g || t >= LOOP0) return null;
  const ent = eo(k01(t, g.ini - 0.05, g.ini + 0.12));
  return (
    <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1170, height: 420, background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.38) 70%, rgba(0,0,0,0))", opacity: ent }} />
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 1920 - 1500, textAlign: "center", transform: `translateY(${(1 - ent) * 18}px)`, opacity: ent }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 88, lineHeight: 1.06, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,0.9), 0 2px 3px rgba(0,0,0,0.95)", letterSpacing: -1, textWrap: "balance" } as React.CSSProperties}>
        {g.ids.map((i) => {
          let w = txt(i);
          if (MAIUSC.has(w.toLowerCase())) w = w.toUpperCase();
          const num = /\d/.test(w) || w === "°C";
          const ativa = t >= PALAVRAS[i].s - 0.03;
          return (
            <span key={i} style={{ color: num ? LARANJA : "#fff", opacity: ativa ? 1 : 0.72, marginRight: 22, display: "inline-block" }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
    </>
  );
};
