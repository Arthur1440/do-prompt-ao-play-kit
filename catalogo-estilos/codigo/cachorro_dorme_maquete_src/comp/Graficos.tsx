// Grafismos 2D por cima do 3D (iguais nas três direções): título do gancho com faixa amarela, legenda de três
// palavras em karaokê, pinos dos móveis, etiqueta riscada, corações, contador, barra de sono, selo do estudo,
// botão SEGUIR e enquete. Área segura do Reels: nada importante nos 250 px de cima nem nos 400 px de baixo.
import React from "react";
import { LEG, FONTE, MONO } from "./fontes";

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const pop = (x: number) => { const t = c01(x); return t < 0.6 ? eo(t / 0.6) * 1.1 : 1.1 - 0.1 * eo((t - 0.6) / 0.4); };
export const AMARELO = "#FFD23F";
export const LARANJA = "#FF6B2C";

const contorno = (px: number, cor = "#16101e") => ({ WebkitTextStroke: `${px}px ${cor}`, paintOrder: "stroke fill" as const });

/** título do gancho: faixa amarela entrando por baixo das letras, no topo (abaixo dos 250 px) */
export const Titulo: React.FC<{ p: number; s: number; linhas: string[] }> = ({ p, s, linhas }) => {
  const k = eo(p);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: 1 - s, transform: `translateY(${-30 * s}px)` }}>
      {linhas.map((l, i) => {
        const ki = eo(c01(p * 1.6 - i * 0.25));
        return (
          <div key={i} style={{ position: "relative", padding: "6px 26px", transform: `scale(${0.85 + 0.15 * ki})`, opacity: c01(ki * 3) }}>
            <div style={{ position: "absolute", inset: 0, background: AMARELO, borderRadius: 10, transformOrigin: "left center", transform: `scaleX(${ki}) rotate(-1.2deg)`, boxShadow: "0 10px 0 rgba(20,14,30,0.55)" }} />
            <span style={{ position: "relative", fontFamily: LEG, fontWeight: 900, fontSize: 78, letterSpacing: -1, color: "#17111f", lineHeight: 1.08, whiteSpace: "nowrap" }}>{l}</span>
          </div>
        );
      })}
      <div style={{ height: 0, opacity: k }} />
    </div>
  );
};

/** legenda: três palavras por vez, caixa alta, branca com contorno escuro; a palavra falada em amarelo */
export const Legenda: React.FC<{ palavras: string[]; ativa: number; p: number; y?: number }> = ({ palavras, ativa, p, y = 1385 }) => (
  <div style={{ position: "absolute", left: 40, right: 40, top: y, transform: `translateY(-50%) scale(${0.92 + 0.08 * eo(p * 2)})`, textAlign: "center", lineHeight: 1.05 }}>
    {palavras.map((w, i) => (
      <span key={i} style={{ fontFamily: LEG, fontWeight: 900, fontSize: 96, letterSpacing: -1, color: i === ativa ? AMARELO : "#fff", ...contorno(17), textShadow: "0 7px 0 rgba(15,10,25,0.8)", marginRight: i < palavras.length - 1 ? 22 : 0, display: "inline-block", transform: i === ativa ? "translateY(-4px) scale(1.06)" : "none" }}>
        {w}
      </span>
    ))}
  </div>
);

/** pino de móvel: etiqueta com linha até o objeto; "acende" (brilho amarelo) quando o cachorro passa */
export const Pino: React.FC<{ txt: string; x: number; y: number; alvo: [number, number]; p: number; brilho: number; apaga?: number }> = ({ txt, x, y, alvo, p, brilho, apaga = 0 }) => {
  const k = eo(p);
  const lx = x + (alvo[0] - x) * k, ly = y + (alvo[1] - y) * k;
  const op = c01(p * 4);
  const esc = pop(p) * (1 - 0.12 * apaga);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op * (1 - 0.45 * apaga) }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={x} y1={y} x2={lx} y2={ly} stroke="rgba(10,8,20,0.5)" strokeWidth={8} strokeLinecap="round" />
        <line x1={x} y1={y} x2={lx} y2={ly} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        <circle cx={lx} cy={ly} r={14 * k} fill={AMARELO} stroke="#16101e" strokeWidth={4} />
        <circle cx={lx} cy={ly} r={(26 + 30 * brilho) * k} fill="none" stroke={AMARELO} strokeWidth={5} opacity={0.8 * brilho} />
      </svg>
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${esc})` }}>
        <div style={{ background: brilho > 0.05 ? AMARELO : "#FFFDF6", borderRadius: 999, padding: "14px 34px", border: "5px solid #16101e", boxShadow: `0 10px 0 rgba(15,10,25,0.6), 0 0 ${60 * brilho}px rgba(255,210,63,${0.9 * brilho})`, fontFamily: LEG, fontWeight: 900, fontSize: 54, color: "#17111f", letterSpacing: 1, whiteSpace: "nowrap", lineHeight: 1 }}>
          {txt}
        </div>
      </div>
    </div>
  );
};

/** etiqueta "A CAMA" presa ao colchão, riscada em vermelho (r = progresso do risco) */
export const EtiquetaRiscada: React.FC<{ txt: string; x: number; y: number; p: number; r: number }> = ({ txt, x, y, p, r }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(p)}) rotate(-4deg)`, opacity: c01(p * 4) }}>
    <div style={{ position: "relative", background: "#FFFDF6", border: "6px solid #16101e", borderRadius: 16, padding: "18px 40px", boxShadow: "0 12px 0 rgba(15,10,25,0.6)", fontFamily: LEG, fontWeight: 900, fontSize: 86, color: "#17111f", whiteSpace: "nowrap", lineHeight: 1 }}>
      {txt}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={-6} y1={62} x2={-6 + 112 * eo(r)} y2={62 - 26 * eo(r)} stroke="#E8322B" strokeWidth={9} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 16 }} />
      </svg>
    </div>
  </div>
);

/** coraçõezinhos subindo de um ponto */
export const Coracoes: React.FC<{ x: number; y: number; t: number; t0: number; n?: number }> = ({ x, y, t, t0, n = 5 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {Array.from({ length: n }).map((_, i) => {
      const ti = t - t0 - i * 0.16;
      if (ti < 0) return null;
      const u = c01(ti / 1.6);
      const cx = x + Math.sin(i * 2.3) * 130 + Math.sin(ti * 3 + i) * 18;
      const cy = y - 40 - u * 300 - i * 12;
      const s = (0.55 + 0.25 * Math.sin(i * 1.7) + 0.2) * pop(ti * 2.5) * (1 - 0.3 * u);
      const op = 1 - c01((u - 0.7) / 0.3);
      return (
        <g key={i} transform={`translate(${cx},${cy}) scale(${s * 2.2}) rotate(${Math.sin(i) * 14})`} opacity={op}>
          <path d="M0 8 C -14 -2, -10 -16, 0 -8 C 10 -16, 14 -2, 0 8 Z" fill="#FF5C7A" stroke="#16101e" strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M-5 -6 C -7 -8, -9 -6, -8 -3" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.8} />
        </g>
      );
    })}
  </svg>
);

/** contador fixo "20+" com o rótulo (o relógio corre na cena; o número na tela fica fixo) */
export const Contador: React.FC<{ p: number; x?: number; y?: number }> = ({ p, x = 540, y = 470 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(p)})`, opacity: c01(p * 4), textAlign: "center" }}>
    <div style={{ fontFamily: LEG, fontWeight: 900, fontSize: 210, color: AMARELO, lineHeight: 0.9, ...contorno(22), textShadow: "0 12px 0 rgba(15,10,25,0.75)" }}>20+</div>
    <div style={{ marginTop: 6, fontFamily: LEG, fontWeight: 900, fontSize: 50, color: "#fff", ...contorno(12), textShadow: "0 6px 0 rgba(15,10,25,0.7)" }}>DESPERTADAS POR NOITE</div>
  </div>
);

/** relógio digital grande (overlay) correndo de hora em hora */
export const RelogioGrande: React.FC<{ txt: string; p: number; x?: number; y?: number }> = ({ txt, p, x = 540, y = 760 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(p)})`, opacity: c01(p * 4) }}>
    <div style={{ background: "#140a0a", border: "6px solid #2b2b33", borderRadius: 22, padding: "8px 30px", boxShadow: "0 12px 0 rgba(0,0,0,0.6), 0 0 50px rgba(255,60,40,0.35)" }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 120, color: "#ff3b2a", textShadow: "0 0 22px rgba(255,50,30,0.9)", letterSpacing: 4 }}>{txt}</span>
    </div>
  </div>
);

/** selo do estudo */
export const Selo: React.FC<{ txt: string; p: number; x?: number; y?: number }> = ({ txt, p, x = 540, y = 330 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(p)}) rotate(-2deg)`, opacity: c01(p * 4) }}>
    <div style={{ background: "#0F2F36", border: "5px solid #5ff2c8", borderRadius: 14, padding: "12px 30px", fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: "#E8FFF8", letterSpacing: 3, whiteSpace: "nowrap", boxShadow: "0 10px 0 rgba(0,0,0,0.5)" }}>{txt}</div>
  </div>
);

/** barra de sono profundo crescendo + "+20 min" (só no lado quente) */
export const BarraSono: React.FC<{ k: number; p: number; x?: number; y?: number; w?: number; rotulo?: string }> = ({ k, p, x = 120, y = 760, w = 840, rotulo = "SONO PROFUNDO" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, opacity: c01(p * 4), transform: `scale(${0.9 + 0.1 * eo(p)})`, transformOrigin: "left center" }}>
    <div style={{ fontFamily: LEG, fontWeight: 900, fontSize: 40, color: "#fff", ...contorno(9), marginBottom: 10 }}>{rotulo}</div>
    <div style={{ position: "relative", height: 70, background: "rgba(20,14,40,0.75)", border: "5px solid #16101e", borderRadius: 40, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${38 + 52 * eo(k)}%`, background: "linear-gradient(90deg, #6f7cff, #b47bff)", borderRadius: 40 }} />
      <div style={{ position: "absolute", left: `${38}%`, top: 0, bottom: 0, width: 4, background: "rgba(255,255,255,0.7)" }} />
    </div>
    <div style={{ position: "absolute", right: -10, top: 30, transform: `translateY(-50%) scale(${pop(c01((k - 0.55) * 2.4))})`, opacity: c01((k - 0.55) * 6), fontFamily: LEG, fontWeight: 900, fontSize: 96, color: AMARELO, ...contorno(16), textShadow: "0 8px 0 rgba(15,10,25,0.75)" }}>+20 min</div>
  </div>
);

/** rótulo de canto da tela dividida */
export const RotuloLado: React.FC<{ txt: string; cor: string; x: number; y: number; p: number }> = ({ txt, cor, x, y, p }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(p)})`, opacity: c01(p * 4) }}>
    <div style={{ background: cor, border: "5px solid #16101e", borderRadius: 999, padding: "10px 30px", fontFamily: LEG, fontWeight: 900, fontSize: 46, color: "#17111f", whiteSpace: "nowrap", boxShadow: "0 8px 0 rgba(15,10,25,0.6)" }}>{txt}</div>
  </div>
);

/** botão SEGUIR (o dedo toca em `toque`) */
export const Seguir: React.FC<{ p: number; toque: number; x?: number; y?: number }> = ({ p, toque, x = 540, y = 560 }) => {
  const ok = toque > 0.5;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(p) * (1 - 0.08 * Math.sin(Math.PI * c01(toque * 2)))})`, opacity: c01(p * 4) }}>
      <div style={{ background: ok ? "#2a2a33" : "#3F7CFF", border: "5px solid #16101e", borderRadius: 24, padding: "22px 80px", fontFamily: FONTE, fontWeight: 700, fontSize: 64, color: "#fff", boxShadow: "0 10px 0 rgba(15,10,25,0.6)", whiteSpace: "nowrap" }}>{ok ? "Seguindo ✓" : "SEGUIR"}</div>
    </div>
  );
};

/** enquete A/B/C */
export const Enquete: React.FC<{ p: number; t: number; t0: number; y?: number }> = ({ p, t, t0, y = 780 }) => {
  const ops = [["A", "na cama"], ["B", "no sofá"], ["C", "na caminha"]];
  return (
    <div style={{ position: "absolute", left: 110, right: 110, top: y, opacity: c01(p * 4), transform: `scale(${0.9 + 0.1 * eo(p)})` }}>
      <div style={{ background: "#FFFDF6", border: "6px solid #16101e", borderRadius: 30, padding: "30px 34px", boxShadow: "0 14px 0 rgba(15,10,25,0.6)" }}>
        <div style={{ fontFamily: LEG, fontWeight: 900, fontSize: 58, color: "#17111f", marginBottom: 22, textAlign: "center" }}>ONDE O SEU DORME?</div>
        {ops.map(([l, txt], i) => {
          const k = eo(c01((t - t0 - 0.12 * i) / 0.3));
          return (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 22, background: i === 0 ? "#FFE58A" : "#F1ECFF", border: "4px solid #16101e", borderRadius: 999, padding: "14px 24px", marginTop: i ? 16 : 0, transform: `translateX(${(1 - k) * -60}px)`, opacity: k }}>
              <div style={{ width: 62, height: 62, borderRadius: 999, background: "#16101e", color: "#fff", fontFamily: LEG, fontWeight: 900, fontSize: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>{l}</div>
              <div style={{ fontFamily: LEG, fontWeight: 800, fontSize: 52, color: "#17111f" }}>{txt}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
