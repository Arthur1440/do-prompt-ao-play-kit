// Camada 2D: texto do gancho, legenda, selos flutuantes (etiqueta com ícone laranja).
import React from "react";
import { FONTE } from "./fontes";

export const COR = { tinta: "#0B1026", laranja: "#FF6B2C", amarelo: "#FFD23F", creme: "#FFF6EA" };

// ---------------------------------------------------------------- texto do gancho (2 linhas, alto, fora dos 250 px de cima)
export const TextoGancho: React.FC<{ op?: number; l2?: number; dy?: number }> = ({ op = 1, l2 = 1, dy = 0 }) => (
  <div style={{ position: "absolute", left: 50, right: 50, top: 290 + dy, textAlign: "center", opacity: op, fontFamily: FONTE }}>
    <div style={{ fontWeight: 700, fontSize: 124, lineHeight: 1.0, color: "#fff", letterSpacing: -2, textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.55), 0 0 4px #000" }}>
      Forno sem fogo
    </div>
    <div style={{ fontWeight: 700, fontSize: 124, lineHeight: 1.08, color: COR.laranja, letterSpacing: -2, opacity: l2, transform: `translateY(${(1 - l2) * 24}px)`, textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.5), 0 0 4px #000" }}>
      e sem gás?
    </div>
  </div>
);

// ---------------------------------------------------------------- legenda (base em y = 1400; máx. 2 linhas; números em laranja)
const ehNumero = (w: string) => /\d/.test(w) || /^(°C|min|R\$)[.,:]?$/.test(w);
export const Legenda: React.FC<{ txt: string; op?: number; destaque?: string[]; ativa?: number; y?: number }> = ({ txt, op = 1, destaque = [], ativa = 999, y = 1400 }) => {
  const pal = txt.split(" ");
  return (
    <div style={{ position: "absolute", left: 64, right: 64, bottom: 1920 - y, textAlign: "center", opacity: op }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 84, lineHeight: 1.08, color: "#fff", letterSpacing: -0.5, textShadow: "0 4px 0 rgba(0,0,0,0.75), 0 0 22px rgba(0,0,0,0.8), 3px 0 0 #000, -3px 0 0 #000, 0 -2px 0 #000" }}>
        {pal.map((w, i) => (
          <span key={i} style={{ color: ehNumero(w) || destaque.includes(w.replace(/[.,!?…:]/g, "")) ? COR.laranja : "#fff", opacity: i <= ativa ? 1 : 0 }}>
            {w}
            {i < pal.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- ícones (traço branco sobre o círculo laranja)
export type Icone = "pc" | "termo" | "relogio" | "pizza" | "moeda" | "botijao" | "sol" | "prato" | "pino" | "gota" | "seta" | "nivel" | "tampa" | "curva" | "gordura";
export const Ico: React.FC<{ i: Icone; s?: number }> = ({ i, s = 44 }) => {
  const p = { fill: "none", stroke: "#fff", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {i === "pc" && (<><rect x="4" y="3" width="7" height="18" rx="1.2" {...p} /><rect x="13" y="3" width="7" height="18" rx="1.2" {...p} /><path d="M6 7h3M15 7h3M6 10h3M15 10h3" {...p} /></>)}
      {i === "termo" && (<><path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" {...p} /><path d="M12 9v7" {...p} /></>)}
      {i === "relogio" && (<><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 7v5l3.5 2" {...p} /></>)}
      {i === "pizza" && (<><path d="M12 3 3.5 19.5a17 17 0 0 0 17 0z" {...p} /><circle cx="11" cy="12" r="1.2" fill="#fff" /><circle cx="14" cy="16" r="1.2" fill="#fff" /></>)}
      {i === "moeda" && (<><circle cx="12" cy="12" r="8.5" {...p} /><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.6-1.2-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.7.8 2.7 2.1-1.2 2-2.7 2c-1.2 0-2.2-.5-2.8-1.3M12 6.5V8M12 16v1.5" {...p} /></>)}
      {i === "botijao" && (<><path d="M7 9a5 5 0 0 1 10 0v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" {...p} /><path d="M9.5 4h5v3h-5z" {...p} /></>)}
      {i === "sol" && (<><circle cx="12" cy="12" r="4" {...p} /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" {...p} /></>)}
      {i === "prato" && (<><circle cx="12" cy="12" r="8.5" {...p} /><circle cx="12" cy="12" r="4.5" {...p} /></>)}
      {i === "gota" && (<><path d="M12 3.5c3.2 4.2 5.5 7.4 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.8 2.3-6 5.5-10.2z" {...p} /></>)}
      {i === "curva" && (<><path d="M5 4v6a4 4 0 0 0 8 0V8a3 3 0 0 1 6 0v12" {...p} /><path d="M5 12a4 4 0 0 0 8 0" {...p} /></>)}
      {i === "seta" && (<><path d="M12 21V4M6 9.5 12 3.5l6 6" {...p} /></>)}
      {i === "nivel" && (<><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" {...p} /><circle cx="15" cy="12" r="1.8" {...p} /><path d="M10 9v6M14 9v6" {...p} /></>)}
      {i === "tampa" && (<><rect x="4" y="6" width="16" height="12" rx="1.5" {...p} /><path d="M9.5 10.5a2.5 2.5 0 0 1 5 0" {...p} /></>)}
      {i === "gordura" && (<><path d="M4 9h16M4 9v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" {...p} /><path d="M6 12.5c2 1 4-1 6 0s4-1 6 0" {...p} /></>)}
      {i === "pino" && (<><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" {...p} /><circle cx="12" cy="10" r="2.3" {...p} /></>)}
    </svg>
  );
};

// ---------------------------------------------------------------- selo flutuante: etiqueta arredondada com ícone laranja
export const Selo: React.FC<{ i: Icone; children: React.ReactNode; x?: number; y: number; op?: number; esc?: number; grande?: boolean }> = ({ i, children, x = 540, y, op = 1, esc = 1, grande }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, 0) scale(${esc})`, transformOrigin: "50% 100%", opacity: op }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(255,250,242,0.97)", borderRadius: 999, padding: grande ? "16px 40px 16px 16px" : "12px 32px 12px 12px", boxShadow: "0 18px 40px rgba(20,10,0,0.35), 0 2px 0 rgba(255,255,255,0.8) inset" }}>
      <div style={{ width: grande ? 84 : 68, height: grande ? 84 : 68, borderRadius: 999, background: COR.laranja, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(255,107,44,0.45)" }}>
        <Ico i={i} s={grande ? 50 : 42} />
      </div>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: grande ? 64 : 50, color: COR.tinta, letterSpacing: -0.5, whiteSpace: "nowrap", lineHeight: 1 }}>{children}</div>
    </div>
    {/* pino da etiqueta */}
    <div style={{ width: 4, height: 34, background: "rgba(255,250,242,0.9)", margin: "0 auto", borderRadius: 2 }} />
    <div style={{ width: 14, height: 14, borderRadius: 7, background: COR.laranja, margin: "-4px auto 0", boxShadow: "0 0 12px rgba(255,107,44,0.8)" }} />
  </div>
);

export const Laranja: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: COR.laranja }}>{children}</span>;
