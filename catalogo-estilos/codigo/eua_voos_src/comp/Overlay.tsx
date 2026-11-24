import React from "react";
import { FONTE, MONO, TITULO } from "./fontes";

export const VERM = "#E5322D";
export const LAR = "#F2A23A"; // laranja do plantão
export const LARANJA = "#FF6B2C"; // laranja da camada IA
export const TINTA = "#0B1026";
export const AMAR = "#F5D27A";
const SOMBRA = "0 4px 18px rgba(0,0,0,0.85), 0 2px 0 rgba(0,0,0,0.6)";

/** selo vermelho fixo do plantão, logo abaixo dos 250 px de cima */
export const SeloUrgente: React.FC<{ o?: number; pisca?: number }> = ({ o = 1, pisca = 1 }) => (
  <div style={{ position: "absolute", left: 48, top: 262, opacity: o, display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", background: VERM, borderRadius: 8, boxShadow: "0 6px 24px rgba(229,50,45,0.45)" }}>
    <div style={{ width: 14, height: 14, borderRadius: 99, background: "#fff", opacity: pisca }} />
    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28, color: "#fff", letterSpacing: 2 }}>URGENTE · EUA · 13 NOV</span>
  </div>
);

export const Ilustracao: React.FC<{ o?: number; claro?: boolean }> = ({ o = 1, claro }) => (
  <div style={{ position: "absolute", right: 48, top: 270, opacity: o, fontFamily: MONO, fontWeight: 700, fontSize: 20, letterSpacing: 3, color: claro ? "rgba(40,30,20,0.75)" : "rgba(255,255,255,0.6)", padding: "6px 12px", border: `1.5px solid ${claro ? "rgba(40,30,20,0.4)" : "rgba(255,255,255,0.3)"}`, borderRadius: 6, background: claro ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.35)" }}>
    ILUSTRAÇÃO
  </div>
);

/** título grande em duas cores (Bebas Neue) */
export const Titulo: React.FC<{ linhas: [string, string][]; top?: number; tam?: number; sub?: string; o?: number; esc?: number }> = ({ linhas, top = 330, tam = 150, sub, o = 1, esc = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: o, transform: `scale(${esc})`, transformOrigin: "50% 0%" }}>
    {linhas.map(([txt, cor], i) => (
      <div key={i} style={{ fontFamily: TITULO, fontSize: tam, lineHeight: 0.92, color: cor, textShadow: SOMBRA, letterSpacing: 1 }}>
        {txt}
      </div>
    ))}
    {sub && <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: "rgba(255,255,255,0.82)", marginTop: 14, textShadow: SOMBRA }}>{sub}</div>}
  </div>
);

/** legenda única, terço inferior; palavras entre * ficam em laranja */
export const Legenda: React.FC<{ texto: string; top?: number; o?: number }> = ({ texto, top = 1352, o = 1 }) => {
  const partes = texto.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 80, lineHeight: 1.05, color: "#fff", textAlign: "center", textShadow: SOMBRA, padding: "10px 26px 14px", background: "rgba(5,6,10,0.55)", borderRadius: 22, letterSpacing: -1 }}>
        {partes.map((p, i) => (p.startsWith("*") ? <span key={i} style={{ color: LAR }}>{p.slice(1, -1)}</span> : <span key={i}>{p}</span>))}
      </div>
    </div>
  );
};

/** selo de fonte: etiqueta arredondada, texto pequeno monoespaçado */
export const SeloFonte: React.FC<{ texto: string; sub?: string; top: number; o?: number; cor?: string }> = ({ texto, sub, top, o = 1, cor = "#fff" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: o }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 26px", borderRadius: 999, background: "rgba(8,10,16,0.82)", border: "1.5px solid rgba(255,255,255,0.28)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 2, color: cor, whiteSpace: "nowrap" }}>{texto}</span>
      {sub && <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 21, letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{sub}</span>}
    </div>
  </div>
);

/** palavra riscada em vermelho (RADAR / RÁDIO) */
export const Riscado: React.FC<{ texto: string; r: number; x: number; top: number; o?: number }> = ({ texto, r, x, top, o = 1 }) => (
  <div style={{ position: "absolute", left: x, top, transform: "translateX(-50%)", opacity: o }}>
    <div style={{ position: "relative", fontFamily: TITULO, fontSize: 104, color: "#fff", textShadow: SOMBRA, letterSpacing: 3, padding: "0 10px" }}>
      {texto}
      <div style={{ position: "absolute", left: -6, top: "46%", height: 12, width: `${Math.max(0, Math.min(1, r)) * 104}%`, background: VERM, borderRadius: 6, transform: "rotate(-4deg)", boxShadow: "0 0 18px rgba(229,50,45,0.8)" }} />
    </div>
  </div>
);

/** cartela da virada: "Esse vídeo foi feito com IA" */
export const Virada: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 1240, textAlign: "center", opacity: o }}>
    <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 104, lineHeight: 1.0, color: "#fff", letterSpacing: -2, textShadow: "0 0 40px rgba(11,16,38,0.9)" }}>
      Esse vídeo foi
      <br />
      feito com <span style={{ color: LARANJA }}>IA</span>
    </div>
  </div>
);

/** degradê escuro atrás dos títulos (topo) e da legenda (base): dá contraste sem caixa */
export const Escurece: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 720, opacity: o, background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0) 100%)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 760, opacity: o, background: "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 100%)" }} />
  </>
);

/** etiqueta pequena monoespaçada solta na tela */
export const Etiqueta: React.FC<{ texto: string; x: number; top: number; o?: number; cor?: string }> = ({ texto, x, top, o = 1, cor = "rgba(255,255,255,0.85)" }) => (
  <div style={{ position: "absolute", left: x, top, opacity: o, fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: cor, padding: "6px 14px", borderRadius: 8, background: "rgba(0,0,0,0.5)", border: "1.5px dashed rgba(255,255,255,0.45)" }}>{texto}</div>
);
