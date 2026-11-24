// Grafismos 2D por cima do 3D (linguagem da referência): onomatopeia de quadrinho, linhas de velocidade,
// balão "kkkk", palmas, medalhinha, brilho de orgulho e a legenda de uma palavra por vez.
import React from "react";
import { HQ, LEG } from "./fontes";

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const pop = (x: number) => { const t = c01(x); return t < 0.6 ? eo(t / 0.6) * 1.15 : 1.15 - 0.15 * ((t - 0.6) / 0.4); };
const hs = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export const AMARELO = "#FFD23F";

/** onomatopeia de quadrinho: letras grossas com contorno preto, estrela de impacto atrás, tremendo */
export const Onoma: React.FC<{ txt: string; x: number; y: number; p: number; s?: number; t: number; tam?: number; rot?: number; cor?: string; estrela?: boolean }> = ({ txt, x, y, p, s = 0, t, tam = 190, rot = -8, cor = AMARELO, estrela = true }) => {
  if (p <= 0 || s >= 1) return null;
  const k = pop(p) * (1 - 0.2 * s);
  const tx = Math.sin(t * 61) * 4, ty = Math.cos(t * 53) * 4;
  const N = 14, R0 = tam * 1.25, R1 = tam * 0.8;
  const pts = Array.from({ length: N * 2 }, (_, i) => {
    const a = (i / (N * 2)) * Math.PI * 2, r = i % 2 ? R1 : R0 * (0.85 + 0.3 * hs(i));
    return `${(Math.cos(a) * r * 1.5).toFixed(1)},${(Math.sin(a) * r * 0.8).toFixed(1)}`;
  }).join(" ");
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${k})`, opacity: c01(p * 6) * (1 - s) }}>
      {estrela && (
        <svg width={R0 * 3.4} height={R0 * 2} style={{ position: "absolute", left: -R0 * 1.7, top: -R0, overflow: "visible" }} viewBox={`${-R0 * 1.7} ${-R0} ${R0 * 3.4} ${R0 * 2}`}>
          <polygon points={pts} fill="#fff" stroke="#111" strokeWidth={9} strokeLinejoin="round" />
        </svg>
      )}
      <div style={{ position: "relative", transform: "translate(-50%,-50%)", left: 0, top: 0, whiteSpace: "nowrap", fontFamily: HQ, fontSize: tam, color: cor, letterSpacing: 4, WebkitTextStroke: `${Math.round(tam * 0.09)}px #111`, paintOrder: "stroke fill", textShadow: `${tam * 0.04}px ${tam * 0.05}px 0 #111` }}>{txt}</div>
    </div>
  );
};

/** linhas de velocidade (anime): traços radiais saindo das bordas, sorteados por quadro */
export const Velocidade: React.FC<{ t: number; op: number; cx?: number; cy?: number; n?: number }> = ({ t, op, cx = 540, cy = 1050, n = 46 }) => {
  if (op <= 0) return null;
  // rastros horizontais no sentido da corrida (o meio do quadro, onde está o cachorro, fica limpo)
  const f = Math.floor(t * 30);
  void cx;
  const linhas = Array.from({ length: n }, (_, i) => {
    const lado = i % 2 ? 1 : -1;
    const y = cy + lado * (330 + hs(i * 3 + 1) * 620);
    const L = 160 + hs(i * 7 + f) * 420;
    const x0 = -300 + ((hs(i * 11) * 1700 + f * 95 * (0.8 + hs(i))) % 1700);
    const w = 3 + hs(i * 5 + 2) * 7;
    return { x0, y0: y, x1: x0 - L, y1: y + L * 0.04, w };
  });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op, mixBlendMode: "screen" }}>
      {linhas.map((l, i) => (
        <line key={i} x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1} stroke="rgba(255,255,255,0.85)" strokeWidth={l.w} strokeLinecap="round" />
      ))}
    </svg>
  );
};

/** balão de fala com "kkkk" */
export const Balao: React.FC<{ txt: string; x: number; y: number; p: number; t: number; cauda?: [number, number] }> = ({ txt, x, y, p, t, cauda = [-90, 150] }) => {
  if (p <= 0) return null;
  const k = pop(p);
  const bal = Math.sin(t * 16) * 2.5;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${k}) rotate(${bal}deg)` }}>
      <svg width={520} height={420} viewBox="-260 -170 520 420" style={{ position: "absolute", left: -260, top: -170, overflow: "visible" }}>
        <path d={`M ${-40} 70 L ${cauda[0]} ${cauda[1]} L 40 66 Z`} fill="#fff" stroke="#111" strokeWidth={10} strokeLinejoin="round" />
        <ellipse cx={0} cy={0} rx={220} ry={110} fill="#fff" stroke="#111" strokeWidth={10} />
        <path d={`M ${-38} 66 L ${cauda[0] + 6} ${cauda[1] - 12} L 36 62 Z`} fill="#fff" />
      </svg>
      <div style={{ position: "relative", transform: "translate(-50%,-50%)", fontFamily: HQ, fontSize: 132, color: "#111", letterSpacing: 6, whiteSpace: "nowrap" }}>{txt}</div>
    </div>
  );
};

/** traços de impacto das palmas */
export const Impacto: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
  if (k <= 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2, r0 = 60 + 50 * (1 - k), r1 = r0 + 70 * k;
        return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke="#fff" strokeWidth={12} strokeLinecap="round" opacity={k} style={{ filter: "drop-shadow(0 0 3px #111)" }} />;
      })}
    </svg>
  );
};

/** medalhinha 2D de ouro com fita vermelha, presa ao peito */
export const Medalha: React.FC<{ x: number; y: number; p: number; t: number; tam?: number }> = ({ x, y, p, t, tam = 1 }) => {
  if (p <= 0) return null;
  const k = pop(p) * tam;
  const bal = Math.sin(t * 7) * 6;
  const brilho = (t * 0.9) % 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-20%) scale(${k}) rotate(${bal}deg)`, transformOrigin: "50% 0%" }}>
      <svg width={220} height={300} viewBox="-110 -20 220 300" style={{ overflow: "visible" }}>
        <path d="M -55 -10 L -15 110 L 15 110 L 55 -10 L 25 -10 L 0 60 L -25 -10 Z" fill="#d42a2a" stroke="#111" strokeWidth={7} strokeLinejoin="round" />
        <circle cx={0} cy={170} r={78} fill="#f2b632" stroke="#111" strokeWidth={8} />
        <circle cx={0} cy={170} r={56} fill="#ffd45c" stroke="#c98a12" strokeWidth={5} />
        <path d="M 0 132 L 11 158 L 39 160 L 17 177 L 25 204 L 0 189 L -25 204 L -17 177 L -39 160 L -11 158 Z" fill="#fff6d0" stroke="#c98a12" strokeWidth={3} />
        <rect x={-120 + 300 * brilho} y={90} width={26} height={170} fill="rgba(255,255,255,0.55)" transform="rotate(25)" clipPath="circle(78px at 0px 170px)" />
      </svg>
    </div>
  );
};

/** brilhinhos de orgulho (estrelas de 4 pontas piscando) */
export const Brilhos: React.FC<{ pts: [number, number][]; t: number; op: number }> = ({ pts, t, op }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
    {pts.map(([x, y], i) => {
      const k = Math.max(0, Math.sin(t * 6 + i * 1.7));
      const r = 34 * k;
      return <path key={i} d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill="#fff7c2" stroke="#111" strokeWidth={4} />;
    })}
  </svg>
);

/** gotinhas de suor de quadrinho saltando de um ponto (a moto com medo) */
export const Gotas: React.FC<{ x: number; y: number; t: number; op?: number; tam?: number }> = ({ x, y, t, op = 1, tam = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
    {[[-1, 0], [1, 0.33], [0.2, 0.66]].map(([dx, f], i) => {
      const ph = (t * 1.6 + f) % 1;
      const gx = x + dx * (40 + 70 * ph) * tam, gy = y - 30 * tam + (-90 * ph + 160 * ph * ph) * tam;
      const s = 34 * tam * (1 - 0.3 * ph);
      return <path key={i} transform={`translate(${gx} ${gy}) rotate(${dx * 25})`} d={`M 0 ${-s} C ${s * 0.7} ${-s * 0.1} ${s * 0.6} ${s * 0.6} 0 ${s * 0.6} C ${-s * 0.6} ${s * 0.6} ${-s * 0.7} ${-s * 0.1} 0 ${-s} Z`} fill="#8fd8ff" stroke="#111" strokeWidth={5} opacity={1 - ph * 0.6} />;
    })}
  </svg>
);

/** corações subindo */
export const Coracoes: React.FC<{ x: number; y: number; t: number; t0: number; op?: number }> = ({ x, y, t, t0, op = 1 }) => {
  const tt = t - t0;
  if (tt < 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
      {Array.from({ length: 7 }, (_, i) => {
        const ph = (tt * 0.55 + hs(i) ) % 1;
        const cx = x + (hs(i * 3) - 0.5) * 520 + Math.sin(tt * 3 + i) * 20, cy = y - ph * 520;
        const s = (30 + hs(i * 7) * 26) * Math.min(1, tt * 4) * (1 - 0.3 * ph);
        return <path key={i} transform={`translate(${cx} ${cy}) scale(${s / 30})`} d="M 0 10 C -30 -12 -20 -34 0 -20 C 20 -34 30 -12 0 10 Z" fill="#ff4f7b" stroke="#111" strokeWidth={4} opacity={1 - ph * ph} />;
      })}
    </svg>
  );
};

/** carimbo do dia da semana (SEG, TER, QUA) */
export const Carimbo: React.FC<{ txt: string; p: number }> = ({ txt, p }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", transform: `scale(${pop(p) * 1.0}) rotate(-6deg)`, opacity: c01(p * 5) }}>
    <span style={{ display: "inline-block", fontFamily: HQ, fontSize: 120, color: "#fff", letterSpacing: 8, padding: "6px 34px", background: "#e2382b", border: "8px solid #111", borderRadius: 18, boxShadow: "8px 8px 0 #111" }}>{txt}</span>
  </div>
);

/** legenda: uma palavra por vez, sem serifa grossa ~100 px, branca com contorno preto, palavra-chave em amarelo */
export const Legenda: React.FC<{ txt: string; amarela: boolean; p: number; y?: number }> = ({ txt, amarela, p, y = 1330 }) => (
  <div style={{ position: "absolute", left: 20, right: 20, top: y, textAlign: "center", transform: `translateY(-50%) scale(${0.85 + 0.15 * eo(p * 1.6)})` }}>
    <span style={{ fontFamily: LEG, fontWeight: 900, fontSize: 104, color: amarela ? AMARELO : "#fff", letterSpacing: -1, lineHeight: 1, WebkitTextStroke: "16px #000", paintOrder: "stroke fill", textShadow: "0 7px 0 rgba(0,0,0,0.9)" }}>{txt}</span>
  </div>
);
