import React from "react";
import { Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { M, projeta, tl, LOOP0, PONTA, TOPO } from "../three/cenas";
import type { Estado } from "../three/mundo";
import { PALAVRAS } from "../fala";
import { ONDA } from "../onda";
import type { Dir } from "../three/kit";

export const { fontFamily: FONTE } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });
export const { fontFamily: MONO } = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });
export const LARANJA = "#FF6B2C";
export const TINTA = "#0B1026";

const c01 = (x: number) => Math.min(1, Math.max(0, x));
const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
/** mola: 0 -> passa um pouco -> 1 */
export const mola = (x: number) => {
  const t = c01(x);
  if (t <= 0) return 0;
  return 1 - Math.exp(-t * 7) * Math.cos(t * 9);
};
const SOMBRA = "0 6px 22px rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.9)";
const vis = (t: number, a: number, b: number, fi = 0.18, fo = 0.18) => Math.min(k01(t, a, a + fi), 1 - k01(t, b - fo, b));

// ------------------------------------------------------------------ ícones
const Ico: React.FC<{ n: "raio" | "pin" | "lab" | "torre" | "relogio" | "alvo" | "predio"; s?: number; cor?: string }> = ({ n, s = 34, cor = "#fff" }) => {
  const p: Record<string, React.ReactNode> = {
    raio: <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill={cor} />,
    pin: <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill={cor} />,
    lab: <path d="M7 3h10v2h-2v5l5 9a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-9V5H7z" fill={cor} />,
    torre: <path d="M11 2h2v3l4 17h-2.2l-.8-4h-4l-.8 4H7l4-17zm.2 13h1.6l-.8-4z" fill={cor} />,
    relogio: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.6 2.1-1 1.7L11 13V6h2z" fill={cor} />,
    alvo: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill={cor} />,
    predio: <path d="M10 2h4v4h2v4h2v12H6V10h2V6h2z" fill={cor} />,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {p[n]}
    </svg>
  );
};

// ------------------------------------------------------------------ selo (etiqueta arredondada com ícone laranja)
export const Selo: React.FC<{ t: number; ini: number; fim: number; texto: string; ico: Parameters<typeof Ico>[0]["n"]; x: number; y: number; alinha?: "esq" | "dir" | "centro" }> = ({ t, ini, fim, texto, ico, x, y, alinha = "esq" }) => {
  if (t < ini || t > fim) return null;
  const a = mola(k01(t, ini, ini + 0.45));
  const o = 1 - k01(t, fim - 0.2, fim);
  const tx = alinha === "dir" ? "translateX(-100%)" : alinha === "centro" ? "translateX(-50%)" : "";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `${tx} scale(${0.6 + 0.4 * a})`, transformOrigin: "left center", opacity: Math.min(1, a * 1.4) * o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 28px 12px 12px", borderRadius: 999, background: "rgba(11,16,38,0.82)", border: "2px solid rgba(255,255,255,0.14)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
        <div style={{ width: 58, height: 58, borderRadius: 999, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico n={ico} s={34} />
        </div>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 42, color: "#fff", whiteSpace: "nowrap" }}>{texto}</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ cronômetro (câmera lenta)
const fmt = (v: number) => v.toFixed(3).replace(".", ",") + " s";
function crono(t: number): { vis: number; run: boolean; val: number } {
  const x = tl(t);
  if (x < M.pico) {
    const con = M.chao - 0.25;
    if (x < 0) return { vis: 1, run: true, val: 0 };
    if (x < con) return { vis: 1, run: true, val: 0.14 * Math.pow(x / con, 1.2) };
    return { vis: 1 - k01(x, M.pico - 0.3, M.pico), run: false, val: 0.14 };
  }
  if (t < M.pesq) return { vis: 0, run: false, val: 0 };
  if (t < M.subiam) return { vis: k01(t, M.pesq, M.pesq + 0.3), run: false, val: 0 };
  if (t < M.quando) {
    const a = M.subiam + 0.05, b = a + 1.45;
    return { vis: 1, run: t < b, val: 0.11 * Math.pow(k01(t, a, b), 1.35) };
  }
  if (t < M.eSobe) return { vis: 1, run: false, val: t < M.quando + 0.2 ? 0.11 : 0 };
  if (t < M.em6) return { vis: 1 - k01(t, M.em6 - 0.15, M.em6), run: true, val: 0.018 * k01(t, M.eSobe, M.em6) };
  return { vis: 0, run: false, val: 0 };
}
export const Cronometro: React.FC<{ t: number }> = ({ t }) => {
  const c = crono(t);
  if (c.vis <= 0) return null;
  const lento = t >= M.eSobe - 0.05 && t < M.em6;
  return (
    <div style={{ position: "absolute", top: 262, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: c.vis }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 24, letterSpacing: 5, color: lento ? LARANJA : "rgba(255,255,255,0.75)", textShadow: SOMBRA }}>
          {lento ? "CÂMERA SUPERLENTA" : "CÂMERA LENTA"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 30px", borderRadius: 18, background: "rgba(5,8,20,0.72)", border: `2px solid ${c.run ? LARANJA : "rgba(255,255,255,0.2)"}` }}>
          {c.run ? (
            <svg width="30" height="30" viewBox="0 0 10 10"><path d="M2 1 9 5 2 9z" fill={LARANJA} /></svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 10 10"><rect x="1.5" y="1" width="2.4" height="8" fill="#fff" /><rect x="6.1" y="1" width="2.4" height="8" fill="#fff" /></svg>
          )}
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 62, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{fmt(c.val)}</span>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ gancho
export const Gancho: React.FC<{ t: number }> = ({ t }) => {
  const x = tl(t);
  if (x >= M.pico - 0.05) return null;
  const o = 1 - k01(x, M.pico - 0.4, M.pico - 0.05);
  // "CHÃO" bate quando a voz diz "chão"
  const bate = x > M.chao - 0.5 ? mola(k01(x, M.chao - 0.5, M.chao + 0.1)) : 0;
  const L: React.CSSProperties = { fontFamily: FONTE, fontWeight: 700, fontSize: 132, lineHeight: 1.0, color: "#fff", textShadow: SOMBRA, letterSpacing: -2 };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1140, textAlign: "center", opacity: o }}>
      <div style={L}>ESSE RAIO</div>
      <div style={{ ...L, marginTop: 8 }}>
        SAIU DO <span style={{ color: LARANJA, display: "inline-block", transform: `scale(${1 + 0.12 * bate * (1 - k01(x, M.chao + 0.1, M.chao + 0.5))})` }}>CHÃO</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ régua de 130 m ao lado da torre
export const Regua: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  if (t < M.os || t > M.subiam + 0.25) return null;
  const [bx, by] = projeta(e, [0, TOPO, 0]);
  const [tx, ty] = projeta(e, [0, PONTA[1] - 0.6, 0]);
  const x = Math.max(bx, tx) + 120;
  const fill = eo(k01(t, M.os + 0.15, M.metros));
  const o = vis(t, M.os, M.subiam + 0.25, 0.25, 0.25);
  const yb = Math.min(by, 1900), yt = ty;
  const yF = yb + (yt - yb) * fill;
  const ticks = Array.from({ length: 14 }, (_, i) => yb + ((yt - yb) * i) / 13);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <line x1={x} y1={yb} x2={x} y2={yt} stroke="rgba(255,255,255,0.35)" strokeWidth={4} />
      <line x1={x} y1={yb} x2={x} y2={yF} stroke={LARANJA} strokeWidth={8} strokeLinecap="round" />
      {ticks.map((y, i) => (
        <line key={i} x1={x - (i % 5 === 0 ? 26 : 14)} y1={y} x2={x} y2={y} stroke={y >= yF ? LARANJA : "rgba(255,255,255,0.5)"} strokeWidth={3} />
      ))}
      <line x1={x - 40} y1={yt} x2={x + 10} y2={yt} stroke="#fff" strokeWidth={5} />
      <g opacity={k01(fill, 0.85, 1)} transform={`translate(${Math.min(x + 26, 1080 - 290)}, ${Math.max(yt + 22, 520)})`}>
        <rect x={0} y={-58} width={250} height={96} rx={20} fill="rgba(11,16,38,0.85)" stroke={LARANJA} strokeWidth={3} />
        <text x={125} y={10} textAnchor="middle" fontFamily={FONTE} fontWeight={700} fontSize={64} fill="#fff">
          <tspan fill={LARANJA}>130</tspan> m
        </text>
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------ 3 raios em 6 minutos
export const Contador3: React.FC<{ t: number }> = ({ t }) => {
  if (t < M.em6 - 0.1 || t > M.ditado) return null;
  const o = vis(t, M.em6 - 0.1, M.ditado, 0.2, 0.25);
  const n = t >= M.r3 ? 3 : t >= M.r2 ? 2 : t >= M.r1 ? 1 : 0;
  const ultimo = n === 3 ? M.r3 : n === 2 ? M.r2 : M.r1;
  const pop = n ? mola(k01(t, ultimo, ultimo + 0.4)) : 0;
  // relógio: o anel se completa nos 6 minutos (sem marcar horário de cada raio)
  const anel = eo(k01(t, M.em6, M.r3 + 0.5));
  const R = 70, C = 2 * Math.PI * R;
  return (
    <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 46, opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 30px 16px 18px", borderRadius: 30, background: "rgba(11,16,38,0.8)" }}>
        <svg width={170} height={170} viewBox="0 0 170 170">
          <circle cx={85} cy={85} r={R} stroke="rgba(255,255,255,0.2)" strokeWidth={14} fill="none" />
          <circle cx={85} cy={85} r={R} stroke={LARANJA} strokeWidth={14} fill="none" strokeDasharray={`${C * anel} ${C}`} transform="rotate(-90 85 85)" strokeLinecap="round" />
          <text x={85} y={98} textAnchor="middle" fontFamily={FONTE} fontWeight={700} fontSize={46} fill="#fff">6 min</text>
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 34px", borderRadius: 30, background: "rgba(11,16,38,0.8)" }}>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 150, color: LARANJA, lineHeight: 1, display: "inline-block", width: 96, textAlign: "center", transform: `scale(${0.7 + 0.3 * pop})` }}>{n}</span>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 60, color: "#fff" }}>{n === 1 ? "raio" : "raios"}</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ mesmo ponto: anel na ponta da torre
export const MesmoPonto: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  if (t < M.todos - 0.05 || t > M.ditado) return null;
  const [x, y] = projeta(e, PONTA);
  const o = vis(t, M.todos - 0.05, M.ditado, 0.15, 0.2);
  const a = mola(k01(t, M.todos, M.todos + 0.5));
  const pulso = ((t - M.todos) % 0.8) / 0.8;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
        <circle cx={x} cy={y} r={44 * a} stroke={LARANJA} strokeWidth={7} fill="none" />
        <circle cx={x} cy={y} r={44 + pulso * 70} stroke={LARANJA} strokeWidth={4} fill="none" opacity={1 - pulso} />
      </svg>
      <Selo t={t} ini={M.todos + 0.15} fim={M.ditado} texto="mesmo ponto" ico="alvo" x={x} y={y + 90} alinha="centro" />
    </>
  );
};

// ------------------------------------------------------------------ o ditado escrito e riscado
const DITADO = ["RAIO NÃO CAI", "DUAS VEZES NO", "MESMO LUGAR"];
export const Ditado: React.FC<{ t: number }> = ({ t }) => {
  if (t < M.ditado + 0.2 || t > M.virada) return null;
  // palavras 91..98 entram com a voz; antes, "E aquele ditado" mostra as aspas
  const pal = "RAIO NÃO CAI DUAS VEZES NO MESMO LUGAR".split(" ");
  const nPal = pal.filter((_, i) => t >= PALAVRAS[91 + i].s - 0.05).length;
  const risco = eo(k01(t, M.risco, M.risco + 0.38));
  // no Empire State: encolhe e sobe para o topo
  const enc = eo(k01(t, M.empire - 0.15, M.empire + 0.35));
  const o = Math.min(k01(t, M.ditado + 0.2, M.ditado + 0.5), 1 - k01(t, M.virada - 0.2, M.virada));
  let k = 0;
  const esc = 1 - 0.48 * enc;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 330 - 30 * enc, display: "flex", justifyContent: "center", opacity: o, transform: `scale(${esc})`, transformOrigin: "center top" }}>
      <div style={{ position: "relative", padding: "34px 46px 40px", borderRadius: 34, background: "rgba(11,16,38,0.78)", border: "2px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 34, letterSpacing: 6, color: "rgba(255,255,255,0.7)", marginBottom: 10, textAlign: "center" }}>O DITADO</div>
        {DITADO.map((linha, li) => (
          <div key={li} style={{ position: "relative", textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 92, lineHeight: 1.08, color: "#fff", letterSpacing: -1 }}>
            {linha.split(" ").map((w, wi) => {
              const idx = k++;
              const on = idx < nPal;
              return (
                <span key={wi} style={{ opacity: on ? 1 : 0.12, marginRight: 22 }}>
                  {w}
                </span>
              );
            })}
            <div style={{ position: "absolute", left: "2%", top: "48%", height: 14, borderRadius: 8, background: LARANJA, width: `${96 * c01(risco * 3 - li)}%`, transform: `rotate(${li === 1 ? 1.5 : -1.5}deg)`, boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ contador do Empire State
export const Contador26: React.FC<{ t: number }> = ({ t }) => {
  if (t < M.empire || t > M.virada) return null;
  let n = 0;
  for (let i = 0; i < 26; i++) if (t >= M.empire + 0.12 + (i / 25) * (M.n26 - M.empire - 0.12)) n = i + 1;
  const o = vis(t, M.empire, M.virada, 0.2, 0.15);
  const pop = n === 26 ? mola(k01(t, M.n26, M.n26 + 0.45)) : 1;
  return (
    <div style={{ position: "absolute", left: 64, top: 1010, opacity: o }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "10px 34px 18px", borderRadius: 30, background: "rgba(11,16,38,0.8)" }}>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 170, color: LARANJA, lineHeight: 1, display: "inline-block", minWidth: 200, transform: `scale(${0.85 + 0.15 * pop})`, transformOrigin: "left bottom", fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 64, color: "#fff" }}>por ano</span>
      </div>
      <div style={{ marginTop: 14 }}>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#fff", textShadow: SOMBRA, padding: "6px 16px", borderRadius: 12, background: "rgba(11,16,38,0.6)" }}>em média, saindo para cima</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ virada: varredura laranja
export const Varredura: React.FC<{ t: number }> = ({ t }) => {
  const at = [M.mas, M.comenta].find((a) => t >= a - 0.02 && t < a + 0.4);
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

// ------------------------------------------------------------------ a voz vira um rosto de linhas
// altura do "rosto" (perfil frontal simples) em coordenadas normalizadas -1..1
const rosto = (x: number, y: number) => {
  const cab = Math.max(0, 1 - (x * x) / 0.42 - ((y + 0.05) * (y + 0.05)) / 0.78);
  if (cab <= 0) return 0;
  let h = Math.sqrt(cab) * 0.55;
  h += 0.32 * Math.exp(-(x * x) / 0.006 - ((y - 0.05) ** 2) / 0.05); // nariz
  h -= 0.14 * (Math.exp(-((x - 0.22) ** 2) / 0.01 - ((y + 0.22) ** 2) / 0.006) + Math.exp(-((x + 0.22) ** 2) / 0.01 - ((y + 0.22) ** 2) / 0.006)); // olhos
  h += 0.1 * Math.exp(-((y + 0.42) ** 2) / 0.012) * Math.exp(-(x * x) / 0.12); // sobrancelha
  h += 0.08 * Math.exp(-((y - 0.38) ** 2) / 0.004 - (x * x) / 0.03); // lábios
  return h;
};
export const VozRosto: React.FC<{ t: number }> = ({ t }) => {
  const a = M.voz - 0.5, b = M.quer + 0.1;
  if (t < a || t > b) return null;
  const f = Math.round(t * 30);
  const amp = (i: number) => ONDA[Math.max(0, Math.min(ONDA.length - 1, i))] ?? 0;
  const m = eo(k01(t, M.voz + 0.05, M.voz + 0.75)); // 0 = onda, 1 = rosto
  const o = vis(t, a, b, 0.25, 0.3);
  const N = 26, W = 760, X0 = 160, Y0 = 640, H = 820;
  const linhas: string[] = [];
  for (let j = 0; j < N; j++) {
    const yN = -1 + (2 * j) / (N - 1);
    const yBase = lerpN(Y0 + H / 2, Y0 + H * (j / (N - 1)), m);
    let d = "";
    for (let i = 0; i <= 80; i++) {
      const xN = -1 + (2 * i) / 80;
      const onda = amp(f - Math.round((1 - (i / 80)) * 24)) * 120 * Math.sin(i * 0.9 + t * 14 + j) * Math.exp(-xN * xN * 1.5);
      const boca = Math.exp(-((yN - 0.38) ** 2) / 0.01) * amp(f) * 60 * Math.exp(-(xN * xN) / 0.05);
      const yy = yBase - m * rosto(xN, yN) * 380 + (1 - m) * onda * (j === Math.floor(N / 2) ? 1 : 0.6) - m * boca;
      d += `${i ? "L" : "M"}${(X0 + ((xN + 1) / 2) * W).toFixed(1)} ${yy.toFixed(1)} `;
    }
    linhas.push(d);
  }
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      {linhas.map((d, j) => (
        <path key={j} d={d} stroke={LARANJA} strokeWidth={j % 5 === 0 ? 4 : 2.5} fill="none" opacity={m < 0.5 && j !== Math.floor(N / 2) ? 0.25 + m : 0.95} />
      ))}
    </svg>
  );
};
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;

// ------------------------------------------------------------------ prompt ("como isso foi feito")
export const Prompt: React.FC<{ t: number }> = ({ t }) => {
  const a = M.quer - 0.1, b = M.comenta;
  if (t < a || t > b) return null;
  const txt = "um raio que nasce na ponta da torre e sobe até a nuvem, de noite, com chuva";
  const n = Math.floor(txt.length * k01(t, a + 0.2, b - 0.35));
  const o = vis(t, a, b, 0.2, 0.15);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 520, opacity: o, transform: `translateY(${(1 - eo(k01(t, a, a + 0.3))) * 40}px)` }}>
      <div style={{ padding: "30px 36px", borderRadius: 28, background: "rgba(11,16,38,0.9)", border: `2px solid ${LARANJA}` }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LARANJA, marginBottom: 14, letterSpacing: 3 }}>PROMPT</div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 44, color: "#fff", lineHeight: 1.3, minHeight: 230 }}>
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
  const o = 1 - k01(t, LOOP0 - 0.18, LOOP0);
  const toque = M.comenta + 0.12;
  const seguiu = t >= toque + 0.1;
  const ent = eo(k01(t, a, a + 0.3));
  const dig = "PLAY".slice(0, Math.floor(4 * k01(t, M.play, M.play + 0.32)));
  const enviado = t > M.play + 0.75;
  const logo = mola(k01(t, M.doPrompt - 0.1, M.doPrompt + 0.5));
  const dedo = (cx: number, cy: number, t0: number) => {
    const k = k01(t, t0 - 0.25, t0 + 0.35);
    if (k <= 0 || k >= 1) return null;
    const desce = eo(k01(t, t0 - 0.25, t0));
    return (
      <div style={{ position: "absolute", left: cx - 45, top: cy - 45 + (1 - desce) * 60, width: 90, height: 90, borderRadius: 99, background: "rgba(255,255,255,0.35)", border: "4px solid #fff", transform: `scale(${t > t0 ? 0.85 : 1})`, opacity: 1 - k01(t, t0 + 0.15, t0 + 0.35) }} />
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {/* perfil + Seguir */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 300, transform: `translateY(${(1 - ent) * -50}px)`, opacity: ent }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 26px", borderRadius: 30, background: "rgba(11,16,38,0.88)" }}>
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
      {/* campo de comentário */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 470, opacity: eo(k01(t, M.play - 0.35, M.play - 0.05)) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 30px", borderRadius: 999, background: "rgba(255,255,255,0.95)" }}>
          <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 46, color: dig ? "#111" : "#888" }}>
            {dig || "Adicione um comentário…"}
            {!enviado && dig && <span style={{ color: LARANJA, opacity: Math.floor(t * 4) % 2 }}>|</span>}
          </div>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 36, color: dig.length === 4 ? LARANJA : "#bbb" }}>{enviado ? "Enviado ✓" : "Publicar"}</div>
        </div>
      </div>
      {dedo(1080 - 70 - 100, 470 + 55, M.play + 0.6)}
      {/* Do Prompt ao Play */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", justifyContent: "center", opacity: c01(logo * 1.5), transform: `scale(${0.75 + 0.25 * logo})` }}>
        <div style={{ padding: "26px 40px", borderRadius: 36, background: "rgba(11,16,38,0.82)" }}>
          <Img src={staticFile("logo_dpap.png")} style={{ width: 640, display: "block" }} />
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ visor da câmera científica (só direção C)
export const Visor: React.FC<{ t: number; dir: Dir }> = ({ t, dir }) => {
  if (dir !== "C") return null;
  if (t >= M.ditado) return null; // (recebe o tempo do loop: no fim volta a ser negativo)
  const c = "rgba(255,255,255,0.55)";
  const L = 70, m = 50, top = 255, bot = 1520;
  const canto = (x: number, y: number, sx: number, sy: number) => <path d={`M${x} ${y + sy * L} L${x} ${y} L${x + sx * L} ${y}`} stroke={c} strokeWidth={4} fill="none" />;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {canto(m, top, 1, 1)}
      {canto(1080 - m, top, -1, 1)}
      {canto(m, bot, 1, -1)}
      {canto(1080 - m, bot, -1, -1)}
      <circle cx={m + 30} cy={top + 110} r={11} fill="#ff3b30" opacity={Math.floor(t * 2) % 2 ? 1 : 0.25} />
      <text x={m + 52} y={top + 121} fontFamily={MONO} fontWeight={700} fontSize={30} fill={c}>REC</text>
    </svg>
  );
};

// ------------------------------------------------------------------ legenda por palavra
const GRAFIA: Record<number, string> = { 39: "130 m", 40: "", 41: "", 42: "", 77: "6", 80: "3", 113: "26" };
const OCULTA: [number, number][] = [
  [0, 10], // gancho: o texto de tela já fala
  [76, 85], // "6 min", "3 raios", "mesmo ponto" estão na tela
  [91, 98], // o ditado está escrito na tela
  [111, 115], // "26 por ano" no contador
  [153, 156], // o logo "Do Prompt ao Play"
];
const QUEBRA = new Set([43, 74]); // pausas: "... e subiam", "... e sobe"
const oculta = (i: number) => OCULTA.some(([a, b]) => i >= a && i <= b);
const txt = (i: number) => (GRAFIA[i] ?? PALAVRAS[i].w).replace(/[.,]$/g, "");
type Grupo = { ini: number; fim: number; ids: number[] };
const GRUPOS: Grupo[] = (() => {
  // 1) trechos entre pontuação (ou entre palavras ocultas); 2) trecho longo é dividido em partes equilibradas (máx. ~30 letras)
  const trechos: number[][] = [];
  let cur: number[] = [];
  const fecha = () => {
    if (cur.length) trechos.push(cur);
    cur = [];
  };
  PALAVRAS.forEach((p, i) => {
    if (oculta(i)) return fecha();
    if (!txt(i)) return;
    if (QUEBRA.has(i)) fecha();
    cur.push(i);
    if (/[.?!,]$/.test(p.w)) fecha();
  });
  fecha();
  // junta trechos curtos (ex.: "No Pico do Jaraguá," + ...) só se couberem juntos
  const unidos: number[][] = [];
  const tam = (ids: number[]) => ids.reduce((s, i) => s + txt(i).length + 1, 0);
  for (const tr of trechos) {
    const ult = unidos[unidos.length - 1];
    const fimFrase = ult && /[.?!]$/.test(PALAVRAS[ult[ult.length - 1]].w);
    if (ult && !fimFrase && !QUEBRA.has(tr[0]) && tam(ult) + tam(tr) <= 32 && tr[0] === ult[ult.length - 1] + 1) ult.push(...tr);
    else unidos.push([...tr]);
  }
  const gs: Grupo[] = [];
  for (const tr of unidos) {
    const n = Math.ceil(tam(tr) / 32);
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
export const Legenda: React.FC<{ t: number }> = ({ t }) => {
  const g = GRUPOS.find((g, i) => t >= g.ini - 0.05 && t < Math.min(g.fim + 0.45, (GRUPOS[i + 1]?.ini ?? 1e9) - 0.05));
  if (!g || t >= LOOP0) return null;
  const ent = eo(k01(t, g.ini - 0.05, g.ini + 0.12));
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 1920 - 1505, textAlign: "center", transform: `translateY(${(1 - ent) * 18}px)`, opacity: ent }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 88, lineHeight: 1.06, color: "#fff", textShadow: SOMBRA, letterSpacing: -1 }}>
        {g.ids.map((i) => {
          const w = txt(i);
          if (!w) return null;
          const num = /\d/.test(w);
          const ativa = t >= PALAVRAS[i].s - 0.03;
          return (
            <span key={i} style={{ color: num ? LARANJA : "#fff", opacity: ativa ? 1 : 0.55, marginRight: 22, display: "inline-block" }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
