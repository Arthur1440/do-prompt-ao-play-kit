// Motion gráfico do reel da piscina: setas de pressão, lupa com bactérias, régua de pH, X da chuva, rebobinar.
import React from "react";
import { FONTE } from "./fontes";
import { COR } from "./Overlay";

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const pop = (x: number) => { const t = c01(x); return t < 0.7 ? eo(t / 0.7) * 1.08 : 1.08 - 0.08 * ((t - 0.7) / 0.3); };

/** setas de força (empurra): cada seta em (x,y) apontando no ângulo a (graus, 0 = direita), pulsando */
export const Setas: React.FC<{ t: number; t0: number; t1: number; setas: { x: number; y: number; a: number; s?: number }[]; cor?: string }> = ({ t, t0, t1, setas, cor = "#fff" }) => {
  const op = eio(k01(t, t0, t0 + 0.25)) * (1 - eio(k01(t, t1 - 0.25, t1)));
  if (op <= 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
      {setas.map((q, i) => {
        const pulso = ((t * 1.6 + i * 0.23) % 1);
        const L = 90 * (q.s ?? 1), dx = 26 * pulso * (q.s ?? 1);
        return (
          <g key={i} transform={`translate(${q.x},${q.y}) rotate(${q.a}) translate(${dx},0)`} opacity={0.35 + 0.65 * Math.sin(Math.PI * pulso)}>
            <path d={`M${-L / 2},0 L${L / 2 - 26},0`} stroke="rgba(0,0,0,0.35)" strokeWidth={22} strokeLinecap="round" />
            <path d={`M${L / 2},0 L${L / 2 - 34},-26 L${L / 2 - 34},26 Z`} fill="rgba(0,0,0,0.35)" transform="translate(3,3)" />
            <path d={`M${-L / 2},0 L${L / 2 - 26},0`} stroke={cor} strokeWidth={14} strokeLinecap="round" />
            <path d={`M${L / 2},0 L${L / 2 - 34},-26 L${L / 2 - 34},26 Z`} fill={cor} />
          </g>
        );
      })}
    </svg>
  );
};

/** lupa sobre a água "limpa": bactérias dançando lá dentro */
export const Lupa: React.FC<{ t: number; t0: number; t1: number; x?: number; y?: number; kB: number }> = ({ t, t0, t1, x = 540, y = 820, kB }) => {
  const e = pop(k01(t, t0, t0 + 0.4)), sai = 1 - eio(k01(t, t1 - 0.25, t1));
  if (e <= 0 || sai <= 0) return null;
  const R = 230;
  const bact = Array.from({ length: 11 }, (_, i) => {
    const a = i * 2.3 + t * (0.6 + (i % 3) * 0.25), r = 40 + ((i * 53) % 150);
    return { x: Math.cos(a) * r, y: Math.sin(a * 1.2) * r * 0.8, s: 0.7 + (i % 4) * 0.15, cor: ["#8fd36b", "#f0c94a", "#b28ad8", "#6cc7b8"][i % 4], rot: (a * 57) % 360, k: c01(kB * 2.2 - i * 0.1) };
  });
  return (
    <div style={{ position: "absolute", left: x - R - 20, top: y - R - 20, opacity: sai, transform: `scale(${e})`, transformOrigin: "50% 50%" }}>
      <svg width={2 * R + 260} height={2 * R + 260}>
        <defs>
          <clipPath id="lente"><circle cx={R + 20} cy={R + 20} r={R} /></clipPath>
          <radialGradient id="vidro" cx="35%" cy="30%"><stop offset="0" stopColor="rgba(255,255,255,0.35)" /><stop offset="0.5" stopColor="rgba(160,230,240,0.12)" /><stop offset="1" stopColor="rgba(40,120,140,0.25)" /></radialGradient>
        </defs>
        <g transform={`translate(${R + 20 + R * 0.72},${R + 20 + R * 0.72}) rotate(45)`}>
          <rect x={0} y={-24} width={190} height={48} rx={24} fill="#2b2f36" />
          <rect x={0} y={-24} width={46} height={48} rx={10} fill="#c9ccd2" />
        </g>
        <g clipPath="url(#lente)">
          <circle cx={R + 20} cy={R + 20} r={R} fill="rgba(70,190,210,0.45)" />
          {bact.map((b, i) => (
            <g key={i} transform={`translate(${R + 20 + b.x},${R + 20 + b.y}) rotate(${b.rot}) scale(${b.s * b.k})`}>
              <ellipse rx={34} ry={20} fill={b.cor} stroke="#22313a" strokeWidth={4} />
              {[-1, 0, 1].map((p) => (<path key={p} d={`M${-30},${p * 9} q-14,${4 + 3 * Math.sin(t * 9 + i)} -24,0`} stroke="#22313a" strokeWidth={3} fill="none" />))}
              <circle cx={14} cy={-5} r={6} fill="#fff" stroke="#22313a" strokeWidth={2} /><circle cx={16} cy={-5} r={3} fill="#22313a" />
              <circle cx={24} cy={-2} r={5} fill="#fff" stroke="#22313a" strokeWidth={2} /><circle cx={25.5} cy={-2} r={2.5} fill="#22313a" />
            </g>
          ))}
          <circle cx={R + 20} cy={R + 20} r={R} fill="url(#vidro)" />
        </g>
        <circle cx={R + 20} cy={R + 20} r={R} fill="none" stroke="#2b2f36" strokeWidth={22} />
        <circle cx={R + 20} cy={R + 20} r={R - 11} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
      </svg>
    </div>
  );
};

/** régua de pH: o marcador desliza até o verde */
export const ReguaPH: React.FC<{ t: number; t0: number; t1: number; y?: number }> = ({ t, t0, t1, y = 330 }) => {
  const e = eo(k01(t, t0, t0 + 0.35)), sai = 1 - eio(k01(t, t1 - 0.25, t1));
  if (e <= 0 || sai <= 0) return null;
  const m = eio(k01(t, t0 + 0.3, t0 + 1.2));
  const pos = 0.05 + 0.45 * m + 0.03 * Math.sin(Math.PI * k01(t, t0 + 1.2, t0 + 1.5));
  const ok = k01(t, t0 + 1.3, t0 + 1.55);
  const W = 760, x0 = (1080 - W) / 2;
  return (
    <div style={{ position: "absolute", left: x0 - 40, top: y, width: W + 80, opacity: e * sai, transform: `translateY(${(1 - e) * -40}px)` }}>
      <div style={{ background: "rgba(255,253,248,0.97)", borderRadius: 40, padding: "26px 40px 34px", boxShadow: "0 18px 40px rgba(10,14,30,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: FONTE, fontWeight: 700, fontSize: 56, color: COR.tinta, marginBottom: 18 }}>
          pH
          <div style={{ marginLeft: "auto", width: 62, height: 62, borderRadius: 31, background: "#36b24a", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(ok)})`, opacity: c01(ok * 3) }}>
            <svg width={38} height={38} viewBox="0 0 24 24"><path d="M5 12.5 10 17 19 7" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div style={{ position: "relative", height: 46, borderRadius: 23, background: "linear-gradient(90deg, #e2382f, #f08a2c, #f2cf32, #49b648, #2f86d6, #6b4cc4)" }}>
          <div style={{ position: "absolute", left: `${pos * 100}%`, top: -16, width: 30, height: 78, marginLeft: -15, borderRadius: 15, background: "#fff", border: `6px solid ${COR.tinta}`, boxShadow: "0 6px 14px rgba(0,0,0,0.35)" }} />
        </div>
      </div>
    </div>
  );
};

/** X discreto (não esvaziar em época de chuva) */
export const XChuva: React.FC<{ t: number; t0: number; t1: number; x: number; y: number }> = ({ t, t0, t1, x, y }) => {
  const e = pop(k01(t, t0, t0 + 0.35)), sai = 1 - eio(k01(t, t1 - 0.2, t1));
  if (e <= 0 || sai <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: 70, background: "rgba(255,253,248,0.95)", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${e})`, opacity: sai }}>
      <svg width={80} height={80} viewBox="0 0 24 24"><path d="M5 5 19 19M19 5 5 19" stroke="#e2382f" strokeWidth={3.6} strokeLinecap="round" /></svg>
    </div>
  );
};

/** rebobinar: ícone e linhas de fita por cima */
export const Rebobina: React.FC<{ t: number; t0: number; t1: number }> = ({ t, t0, t1 }) => {
  const op = eio(k01(t, t0, t0 + 0.1)) * (1 - eio(k01(t, t1 - 0.15, t1)));
  if (op <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 3px, rgba(0,0,0,0) 3px 9px)", transform: `translateY(${(t * 400) % 9}px)` }} />
      <div style={{ position: "absolute", left: 540 - 110, top: 300, width: 220, height: 120, borderRadius: 60, background: "rgba(11,16,38,0.75)", display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
        <svg width={130} height={70} viewBox="0 0 26 14"><path d="M12 1 2 7l10 6zM24 1 14 7l10 6z" fill="#fff" /></svg>
      </div>
    </div>
  );
};
