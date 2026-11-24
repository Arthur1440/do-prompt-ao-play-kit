// Rótulo da peça (etiqueta branca arredondada, nome em maiúsculas, linha fina até a peça) e
// a palavra-chave da legenda (uma por vez, grande, no terço de baixo).
import React from "react";
import { FONTE } from "./fontes";
import { COR } from "./Overlay";

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const pop = (x: number) => { const t = c01(x); return t < 0.7 ? eo(t / 0.7) * 1.08 : 1.08 - 0.08 * ((t - 0.7) / 0.3); };

/** etiqueta: (x,y) = centro da etiqueta; alvo = ponto da peça na tela; p = entrada 0..1; s = saída 0..1 */
export const Rotulo: React.FC<{ txt: string; x: number; y: number; alvo: [number, number] | [number, number][]; p?: number; s?: number; tam?: number }> = ({ txt, x, y, alvo, p = 1, s = 0, tam = 60 }) => {
  const alvos = (Array.isArray(alvo[0]) ? alvo : [alvo]) as [number, number][];
  const kl = eo(c01((p - 0.15) / 0.6));
  const op = c01(p * 4) * (1 - s);
  const esc = pop(p) * (1 - 0.15 * s);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {alvos.map(([ax, ay], i) => {
          const lx = x + (ax - x) * kl, ly = y + (ay - y) * kl;
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={lx} y2={ly} stroke="rgba(0,0,0,0.35)" strokeWidth={7} strokeLinecap="round" />
              <line x1={x} y1={y} x2={lx} y2={ly} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
              <circle cx={lx} cy={ly} r={11 * kl} fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth={3} />
              <circle cx={lx} cy={ly} r={5 * kl} fill={COR.laranja} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${esc})` }}>
        <div style={{ background: "#FFFDF8", borderRadius: 999, padding: `${tam * 0.3}px ${tam * 0.62}px`, boxShadow: "0 14px 34px rgba(10,14,30,0.38), 0 2px 0 rgba(255,255,255,0.9) inset", fontFamily: FONTE, fontWeight: 700, fontSize: tam, color: COR.tinta, letterSpacing: 1.5, whiteSpace: "nowrap", lineHeight: 1 }}>
          {txt}
        </div>
      </div>
    </div>
  );
};

/** palavra-chave da fala: uma por vez, Space Grotesk Bold ~110 px, branca com contorno preto grosso, no terço de baixo */
export const Palavra: React.FC<{ txt: string; p?: number; s?: number; y?: number; cor?: string; tam?: number }> = ({ txt, p = 1, s = 0, y = 1360, cor = "#fff", tam = 112 }) => (
  <div style={{ position: "absolute", left: 30, right: 30, top: y, transform: `translateY(-50%) scale(${pop(p) * (1 - 0.1 * s)})`, opacity: c01(p * 5) * (1 - s), textAlign: "center" }}>
    <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: tam, color: cor, letterSpacing: -1.5, lineHeight: 1.05, WebkitTextStroke: `${Math.round(tam * 0.15)}px #000`, paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.85), 0 0 30px rgba(0,0,0,0.45)" }}>
      {txt}
    </span>
  </div>
);

/** frase da virada (mais de uma palavra, com destaque laranja) */
export const Frase: React.FC<{ partes: { t: string; laranja?: boolean }[]; p?: number; y?: number; tam?: number }> = ({ partes, p = 1, y = 1385, tam = 92 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, transform: `translateY(-50%) scale(${pop(p)})`, opacity: c01(p * 5), textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: tam, lineHeight: 1.08, letterSpacing: -1.5, color: "#fff", textShadow: "0 6px 0 rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.6)" }}>
    {partes.map((q, i) => (
      <span key={i} style={{ color: q.laranja ? COR.laranja : "#fff" }}>{q.t}{i < partes.length - 1 ? " " : ""}</span>
    ))}
  </div>
);
