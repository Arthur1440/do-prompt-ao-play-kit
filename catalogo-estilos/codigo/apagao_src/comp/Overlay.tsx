// Camada 2D: HUD do relógio, pergunta do gancho, legenda, selo da fonte, contador e votação.
import React from "react";
import { FONTE, MONO, SERIF } from "./fontes";

export const COR = { tinta: "#0B1026", quente: "#FFB347", verm: "#FF3B30", laranja: "#FF6B2C", amarelo: "#FFD23F" };

// ---------------------------------------------------------------- HUD (embaixo à esquerda, dentro da área segura)
export type Hud =
  | { modo: "contagem"; s: number; vivo?: number } // segundos restantes
  | { modo: "hora"; h: number; m: number; verm: number; pulo?: number; selo?: boolean };

const pad = (n: number, k = 2) => String(Math.floor(n)).padStart(k, "0");

export const HUD: React.FC<{ h: Hud }> = ({ h }) => {
  const base: React.CSSProperties = {
    position: "absolute", left: 64, top: 1366, fontFamily: MONO, color: "#fff", display: "flex", alignItems: "center", gap: 16,
    textShadow: "0 2px 10px rgba(0,0,0,0.85)",
  };
  if (h.modo === "contagem") {
    const s = Math.max(0, h.s);
    const txt = `0:${pad(s)}.${pad(Math.round((s % 1) * 1000) % 1000, 3)}`;
    const ponto = (h.vivo ?? 0) % 1 < 0.5;
    return (
      <div style={{ ...base, background: "rgba(11,16,38,0.72)", padding: "16px 26px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.18)" }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: ponto ? COR.verm : "rgba(255,59,48,0.3)", boxShadow: ponto ? `0 0 14px ${COR.verm}` : "none" }} />
        <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>
          17/11 · O MUNDO APAGA EM <span style={{ fontSize: 44, fontWeight: 800, color: COR.amarelo }}>{txt}</span>
        </span>
      </div>
    );
  }
  const cor = h.verm > 0.5 ? COR.verm : "#ffffff";
  const esc = 1 + 0.12 * (h.pulo ?? 0);
  return (
    <div style={{ ...base, background: h.verm > 0.5 ? "rgba(40,6,6,0.72)" : "rgba(11,16,38,0.72)", padding: "14px 26px 14px 24px", borderRadius: 14, border: `2px solid ${h.verm > 0.5 ? "rgba(255,59,48,0.55)" : "rgba(255,255,255,0.2)"}` }}>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: h.verm > 0.5 ? "#ffb0aa" : "#cfd6ff" }}>{h.verm > 0.5 ? "APAGÃO · HORA" : "HORA"}</span>
        <span style={{ fontSize: 76, fontWeight: 800, color: cor, transform: `scale(${esc})`, transformOrigin: "left center", textShadow: `0 0 ${18 * (h.pulo ?? 0) + 6}px ${cor}88, 0 2px 10px rgba(0,0,0,0.9)` }}>
          {pad(h.h)}:{pad(h.m)}
        </span>
      </div>
      {h.selo !== false && (
        <span style={{ alignSelf: "flex-start", fontFamily: FONTE, fontSize: 20, fontWeight: 700, letterSpacing: 2, padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }}>
          SIMULAÇÃO
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- pergunta do gancho (centro)
export const Pergunta: React.FC<{ op?: number; esc?: number }> = ({ op = 1, esc = 1 }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top: 640, textAlign: "center", opacity: op, transform: `scale(${esc})` }}>
    <div style={{ fontFamily: SERIF, fontSize: 112, lineHeight: 1.04, color: "#fff", textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 0 2px #000" }}>
      E se o apagão do <span style={{ color: COR.amarelo }}>dia 17</span> for verdade?
    </div>
  </div>
);

// ---------------------------------------------------------------- legenda (base em y=1400, no máximo 2 linhas)
export const Legenda: React.FC<{ txt: string; ativa?: number; op?: number }> = ({ txt, ativa = -1, op = 1 }) => {
  const pal = txt.split(" ");
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 1920 - 1400, textAlign: "center", opacity: op }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 88, lineHeight: 1.06, color: "#fff", textShadow: "0 3px 0 #000, 0 0 18px rgba(0,0,0,0.85), 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000" }}>
        {pal.map((w, i) => {
          const num = /\d/.test(w);
          return (
            <span key={i} style={{ color: num ? COR.laranja : "#fff", opacity: ativa >= 0 && i > ativa ? 0.0 : 1 }}>
              {w}
              {i < pal.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- selo da fonte (texto, sem brasão)
export const Selo: React.FC<{ op?: number; y?: number }> = ({ op = 1, y = 300 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: op }}>
    <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 36, color: "#fff", background: "rgba(11,16,38,0.82)", border: `2px solid ${COR.laranja}`, borderRadius: 12, padding: "12px 24px", letterSpacing: 0.5 }}>
      Ministério de Minas e Energia · Amapá, 2020
    </div>
  </div>
);

export const Contador: React.FC<{ n: number; op?: number }> = ({ n, op = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", opacity: op, fontFamily: FONTE }}>
    <div style={{ fontSize: 150, fontWeight: 700, color: COR.verm, lineHeight: 1, textShadow: "0 0 30px rgba(255,59,48,0.6), 0 4px 16px rgba(0,0,0,0.9)" }}>
      {n}
      <span style={{ color: "#fff" }}>/16</span>
    </div>
    <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,0.9)" }}>cidades sem luz</div>
  </div>
);

// ---------------------------------------------------------------- caixa de prompt da virada
export const Prompt: React.FC<{ txt: string; cursor: boolean; op?: number }> = ({ txt, cursor, op = 1 }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top: 560, opacity: op }}>
    <div style={{ fontFamily: MONO, fontSize: 40, color: "#fff", background: "rgba(11,16,38,0.86)", border: `3px solid ${COR.laranja}`, borderRadius: 22, padding: "30px 34px", boxShadow: `0 0 60px rgba(255,107,44,0.35)` }}>
      <div style={{ fontSize: 22, color: COR.laranja, letterSpacing: 3, marginBottom: 14, fontWeight: 700 }}>PROMPT</div>
      {txt}
      <span style={{ display: "inline-block", width: 18, height: 42, marginLeft: 6, verticalAlign: "-6px", background: cursor ? COR.laranja : "transparent" }} />
    </div>
  </div>
);
