// Motion graphics do reel (camada 2D por cima do 3D). Cada componente recebe o tempo local já calculado.
import React from "react";
import { Img, staticFile } from "remotion";
import { FONTE, MONO } from "./fontes";
import { COR, Ico } from "./Overlay";
import { MAPA } from "./mapas";

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
const eio = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
/** entrada com quique (escala 0 -> 1,08 -> 1) */
const pop = (x: number) => { const t = c01(x); return t < 0.7 ? eo(t / 0.7) * 1.08 : 1.08 - 0.08 * eio((t - 0.7) / 0.3); };
const SOMBRA = "0 18px 50px rgba(5,8,25,0.45)";
const CARD: React.CSSProperties = { background: "rgba(11,16,38,0.86)", border: "2px solid rgba(255,255,255,0.12)", borderRadius: 34, boxShadow: SOMBRA, backdropFilter: "blur(6px)" };

// ------------------------------------------------------------------------------------------------ planta + título
type P2 = [number, number];
const poli = (pts: P2[]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
const comp = (pts: P2[]) => pts.reduce((a, p, i) => a + Math.hypot(p[0] - pts[(i + 1) % pts.length][0], p[1] - pts[(i + 1) % pts.length][1]), 0);
/** planta do forno desenhada em linhas EXATAMENTE sobre a vista de cima do 3D (pontos já projetados) */
export const Planta: React.FC<{ p: number; op?: number; a: P2[]; b: P2[]; pizza: P2[]; frenteA: P2[]; frenteB: P2[] }> = ({ p, op = 1, a, b, pizza, frenteA, frenteB }) => {
  const d1 = eio(k01(p, 0.0, 0.35)), d2 = eio(k01(p, 0.12, 0.47)), d3 = eio(k01(p, 0.3, 0.6)), d4 = eio(k01(p, 0.45, 0.8));
  const linha = { fill: "none", stroke: COR.laranja, strokeWidth: 6, strokeLinejoin: "round" as const };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
      <defs>
        <filter id="brilho"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g filter="url(#brilho)">
        {[a, b].map((r, i) => (
          <path key={i} d={poli(r)} {...linha} strokeDasharray={comp(r)} strokeDashoffset={comp(r) * (1 - (i ? d2 : d1))} />
        ))}
        <path d={poli(pizza)} {...linha} stroke="#fff" strokeWidth={4} strokeDasharray={comp(pizza)} strokeDashoffset={comp(pizza) * (1 - d3)} />
        <g opacity={d4}>
          {[frenteA, frenteB].map((f, i) => <path key={i} d={"M" + f.map(([x, y]) => `${x},${y}`).join("L")} fill="none" stroke="#fff" strokeWidth={5} strokeDasharray="14 10" />)}
        </g>
      </g>
    </svg>
  );
};

export const TituloForno: React.FC<{ p: number; op?: number }> = ({ p, op = 1 }) => {
  const w = eio(p);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 270, textAlign: "center", opacity: op }}>
      <div style={{ display: "inline-block", position: "relative", fontFamily: FONTE, fontWeight: 700, fontSize: 150, letterSpacing: -4, lineHeight: 1, color: COR.laranja, clipPath: `inset(0 ${100 - w * 100}% 0 0)`, textShadow: "0 6px 0 rgba(0,0,0,0.35), 0 0 40px rgba(255,107,44,0.45)" }}>
        Forno solar
      </div>
      <div style={{ width: 640 * w, height: 8, background: COR.laranja, margin: "10px auto 0", borderRadius: 4, boxShadow: "0 0 18px rgba(255,107,44,0.7)" }} />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ mapas
type Box = readonly [number, number, number, number];
const vb = (b: Box, m = 0.12) => { const w = b[2] - b[0], h = b[3] - b[1]; return [b[0] - w * m, b[1] - h * m, w * (1 + 2 * m), h * (1 + 2 * m)]; };

/** mapa animado: contorno do Brasil desenha -> estado acende em laranja -> zoom no estado -> pino cai */
export const Mapa: React.FC<{ uf: "rn" | "se"; p: number; y?: number; titulo?: string; sub?: string }> = ({ uf, p, y = 470, titulo, sub }) => {
  const est = MAPA[uf], box = (uf === "rn" ? MAPA.rnBox : MAPA.seBox) as Box;
  const pino = (uf === "rn" ? MAPA.natal : MAPA.socorro) as readonly [number, number];
  const vBr = vb(MAPA.brasilBox as Box, 0.04), vEs = vb(box, uf === "rn" ? 0.18 : 0.35);
  const z = eio(k01(p, 0.28, 0.62));
  const v = vBr.map((a, i) => a + (vEs[i] - a) * z);
  const W = 900, H = 620;
  const esc = Math.min(W / v[2], H / v[3]);
  const desenho = eio(k01(p, 0.0, 0.3));
  const acende = eio(k01(p, 0.18, 0.35));
  const kp = k01(p, 0.62, 0.8);
  const queda = kp < 1 ? -60 * (1 - eo(kp)) : 0;
  const entra = eio(k01(p, 0, 0.1)), sai = 1 - eio(k01(p, 0.94, 1));
  return (
    <div style={{ position: "absolute", left: 90, top: y, width: W, height: H + (titulo ? (sub ? 160 : 100) : 0), opacity: entra * sai, transform: `scale(${0.92 + 0.08 * entra})`, ...CARD, overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`${v[0]} ${v[1]} ${v[2]} ${v[3]}`}>
        <path d={MAPA.brasil} fill="rgba(255,255,255,0.06)" stroke="#fff" strokeWidth={2.4 / esc} strokeDasharray={4000} strokeDashoffset={4000 * (1 - desenho)} opacity={1 - z * 0.55} />
        <path d={est} fill={`rgba(255,107,44,${0.25 + 0.35 * acende})`} stroke={COR.laranja} strokeWidth={4 / esc} opacity={acende} />
        {kp > 0 && (
          <g transform={`translate(${pino[0]},${pino[1] + queda / esc})`} opacity={c01(kp * 3)}>
            <circle r={26 / esc} fill="none" stroke={COR.laranja} strokeWidth={4 / esc} opacity={1 - c01((p - 0.8) * 3)} transform={`scale(${1 + (p - 0.8) * 3})`} />
            <path d={`M0,0 C${-14 / esc},${-22 / esc} ${-22 / esc},${-34 / esc} ${-22 / esc},${-48 / esc} A${22 / esc},${22 / esc} 0 1 1 ${22 / esc},${-48 / esc} C${22 / esc},${-34 / esc} ${14 / esc},${-22 / esc} 0,0Z`} fill={COR.laranja} stroke="#fff" strokeWidth={3 / esc} />
            <circle cy={-48 / esc} r={8 / esc} fill="#fff" />
          </g>
        )}
      </svg>
      {titulo && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H - 10, textAlign: "center", fontFamily: FONTE, opacity: eio(k01(p, 0.62, 0.78)) }}>
          <div style={{ fontSize: 52, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>{titulo}</div>
          {sub && <div style={{ fontSize: 36, fontWeight: 600, color: COR.laranja, marginTop: 6 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
};

/** selo da prova: mini mapa do RN com pino em Natal + "UFRN · Natal (RN)" */
export const SeloUFRN: React.FC<{ p: number }> = ({ p }) => {
  const box = vb(MAPA.rnBox as Box, 0.15);
  const e = pop(k01(p, 0, 0.25)), sai = 1 - eio(k01(p, 0.9, 1));
  const kp = eo(k01(p, 0.2, 0.45));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", opacity: sai }}>
      <div style={{ ...CARD, transform: `scale(${e})`, padding: "34px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, border: `3px solid ${COR.laranja}` }}>
        <svg width={520} height={300} viewBox={box.join(" ")}>
          <path d={MAPA.rn} fill="rgba(255,107,44,0.35)" stroke={COR.laranja} strokeWidth={0.05} />
          <g transform={`translate(${MAPA.natal[0]},${MAPA.natal[1] - (1 - kp) * 0.6})`} opacity={kp}>
            <path d="M0,0 C-0.14,-0.22 -0.22,-0.34 -0.22,-0.48 A0.22,0.22 0 1 1 0.22,-0.48 C0.22,-0.34 0.14,-0.22 0,0Z" fill={COR.laranja} stroke="#fff" strokeWidth={0.03} />
            <circle cy={-0.48} r={0.08} fill="#fff" />
          </g>
        </svg>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 72, color: "#fff", letterSpacing: -1 }}>
          UFRN <span style={{ color: COR.laranja }}>·</span> Natal (RN)
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 34, color: "rgba(255,255,255,0.7)" }}>teste com o forno vazio</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ termômetro
export const Termometro: React.FC<{ v: number; p: number; ok: number }> = ({ v, p, ok }) => {
  const e = eio(k01(p, 0, 0.12)), sai = 1 - eio(k01(p, 0.93, 1));
  const H = 820, max = 120;
  const h = (v / max) * H;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", gap: 46, alignItems: "flex-end", opacity: e * sai, transform: `translateY(${(1 - e) * 60}px)` }}>
      <div style={{ position: "relative", width: 150, height: H + 150 }}>
        {/* tubo */}
        <div style={{ position: "absolute", left: 45, top: 0, width: 60, height: H + 40, borderRadius: 30, background: "rgba(255,255,255,0.14)", border: "4px solid rgba(255,255,255,0.85)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h + 40, background: `linear-gradient(0deg, #ff3b1f, ${COR.laranja} 60%, #ffb347)`, boxShadow: `0 0 40px ${COR.laranja}` }} />
        </div>
        <div style={{ position: "absolute", left: 10, top: H - 10, width: 130, height: 130, borderRadius: 65, background: "#ff3b1f", border: "4px solid rgba(255,255,255,0.85)", boxShadow: `0 0 50px rgba(255,80,30,0.8)` }} />
        {[0, 20, 40, 60, 80, 100, 120].map((m) => (
          <div key={m} style={{ position: "absolute", left: -66, top: H + 20 - (m / max) * H - 14, width: 100, textAlign: "right", fontFamily: MONO, fontSize: 26, color: "rgba(255,255,255,0.75)" }}>
            {m}
          </div>
        ))}
        <div style={{ position: "absolute", left: 105, top: H + 20 - (105 / max) * H - 2, width: 46, height: 5, background: "#fff", opacity: ok }} />
      </div>
      <div style={{ fontFamily: FONTE, marginBottom: 300 }}>
        <div style={{ fontSize: 210, fontWeight: 700, color: ok > 0.5 ? COR.laranja : "#fff", lineHeight: 0.9, letterSpacing: -6, textShadow: ok > 0.5 ? "0 0 50px rgba(255,107,44,0.6)" : "0 6px 30px rgba(0,0,0,0.6)", transform: `scale(${1 + 0.08 * Math.sin(Math.PI * c01(ok))})`, transformOrigin: "left bottom" }}>
          {Math.round(v)}
          <span style={{ fontSize: 110, letterSpacing: 0 }}> °C</span>
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", marginTop: 14, opacity: 0.9 }}>ar dentro do forno vazio</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ relógio (pizzas)
export const Relogio: React.FC<{ min: number; total?: number; x: number; y: number; r?: number; rot?: string; icone?: "sol" | "chama"; op?: number; cor?: string; destaque?: number }> = ({ min, total = 60, x, y, r = 150, rot, icone, op = 1, cor = COR.laranja, destaque = 0 }) => {
  const a = (min / total) * Math.PI * 2;
  const large = a > Math.PI ? 1 : 0;
  const px = Math.sin(a) * r, py = -Math.cos(a) * r;
  return (
    <div style={{ position: "absolute", left: x - r - 20, top: y - r - 20, width: 2 * r + 40, opacity: op }}>
      <svg width={2 * r + 40} height={2 * r + 40} viewBox={`${-r - 20} ${-r - 20} ${2 * r + 40} ${2 * r + 40}`}>
        <circle r={r + 12} fill="rgba(11,16,38,0.85)" stroke="rgba(255,255,255,0.85)" strokeWidth={6} />
        {min > 0.01 && <path d={`M0,0 L0,${-r} A${r},${r} 0 ${large} 1 ${px},${py} Z`} fill={cor} opacity={0.9} />}
        {Array.from({ length: 12 }, (_, i) => {
          const b = (i / 12) * Math.PI * 2;
          return <line key={i} x1={Math.sin(b) * (r - 4)} y1={-Math.cos(b) * (r - 4)} x2={Math.sin(b) * (r - (i % 3 ? 14 : 26))} y2={-Math.cos(b) * (r - (i % 3 ? 14 : 26))} stroke="#fff" strokeWidth={i % 3 ? 3 : 6} />;
        })}
        <line x1={0} y1={0} x2={px * 0.88} y2={py * 0.88} stroke="#fff" strokeWidth={10} strokeLinecap="round" />
        <circle r={14} fill="#fff" />
        {destaque > 0 && <circle r={r + 12} fill="none" stroke={cor} strokeWidth={10} opacity={destaque} transform={`scale(${1 + 0.15 * destaque})`} />}
      </svg>
      {rot && (
        <div style={{ textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 64, color: "#fff", marginTop: 4, textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
          {icone === "chama" && <span style={{ color: "#6fb7ff" }}>Gás: </span>}
          {icone === "sol" && <span style={{ color: COR.amarelo }}>Sol: </span>}
          <span style={{ color: COR.laranja }}>{rot}</span>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ celular: conversa com o amigo
/** foto de perfil do amigo: gabinete bege empoeirado num armário cheio de cabos (ilustração) */
const AvatarAmigo: React.FC<{ s?: number }> = ({ s = 96 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    <clipPath id="cav"><circle cx="50" cy="50" r="50" /></clipPath>
    <g clipPath="url(#cav)">
      <rect width="100" height="100" fill="#5a3f2a" />
      <rect x="6" y="4" width="88" height="96" fill="#3d2a1c" />
      <rect x="10" y="62" width="80" height="4" fill="#6b4a32" />
      <path d="M14 14 C30 40, 20 50, 40 58 M24 10 C40 30, 60 20, 70 50 M60 8 C70 30, 85 25, 88 56 M18 30 C35 35, 45 20, 60 40" stroke="#1d1d1d" strokeWidth="3" fill="none" />
      <path d="M30 12 C35 28, 55 30, 52 52" stroke="#c23a2a" strokeWidth="2.5" fill="none" />
      <path d="M70 12 C60 30, 78 40, 66 56" stroke="#e8c23a" strokeWidth="2.5" fill="none" />
      <rect x="34" y="68" width="30" height="32" rx="2" fill="#d6c8a4" stroke="#9e8e6c" strokeWidth="1.5" />
      <rect x="38" y="72" width="22" height="4" fill="#c2b28e" />
      <rect x="38" y="78" width="22" height="4" fill="#c2b28e" />
      <circle cx="49" cy="90" r="2.5" fill="#9e8e6c" />
      <rect x="34" y="66" width="30" height="3" fill="#e9e1cc" opacity="0.6" />
    </g>
  </svg>
);

export const CelularEnvio: React.FC<{ t: number; t0: number; enviado: number; digitando: number }> = ({ t, t0, enviado, digitando }) => {
  const e = eo(k01(t, t0, t0 + 0.4));
  const kE = pop(k01(t, enviado, enviado + 0.35));
  const lido = t > enviado + 0.9;
  const dots = t > digitando;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", transform: `translateY(${(1 - e) * 900}px) rotate(${(1 - e) * -8}deg)` }}>
      <div style={{ width: 720, height: 900, borderRadius: 70, background: "#0d0d10", padding: 16, boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 3px #2a2a30" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 56, overflow: "hidden", background: "#0b141a", position: "relative", fontFamily: FONTE }}>
          <div style={{ height: 150, background: "#1f2c34", display: "flex", alignItems: "center", gap: 20, padding: "40px 26px 0" }}>
            <span style={{ color: "#aebac1", fontSize: 44 }}>‹</span>
            <AvatarAmigo s={92} />
            <div>
              <div style={{ color: "#e9edef", fontSize: 38, fontWeight: 700 }}>Amigo do PC velho</div>
              <div style={{ color: "#8696a0", fontSize: 26 }}>{dots ? "digitando…" : "online"}</div>
            </div>
          </div>
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18, background: "repeating-linear-gradient(45deg, #0b141a 0 22px, #0d1a20 22px 44px)", height: 720 }}>
            <div style={{ alignSelf: "flex-start", background: "#202c33", color: "#e9edef", fontSize: 32, padding: "14px 20px", borderRadius: 20, maxWidth: 480 }}>esse PC ainda vai servir pra alguma coisa 😅</div>
            {t > enviado && (
              <div style={{ alignSelf: "flex-end", transform: `scale(${kE})`, transformOrigin: "100% 100%", background: "#005c4b", padding: 10, borderRadius: 20, width: 440 }}>
                <div style={{ position: "relative", width: 420, height: 300, borderRadius: 14, overflow: "hidden" }}>
                  <Img src={staticFile("thumb_4.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 84, height: 84, borderRadius: 42, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 0, height: 0, borderLeft: "30px solid #fff", borderTop: "18px solid transparent", borderBottom: "18px solid transparent", marginLeft: 8 }} />
                    </div>
                  </div>
                </div>
                <div style={{ color: "#e9edef", fontSize: 30, padding: "10px 8px 4px" }}>olha o seu PC velho virando forno 👀</div>
                <div style={{ textAlign: "right", fontSize: 22, color: lido ? "#53bdeb" : "#8696a0", paddingRight: 6 }}>✓✓</div>
              </div>
            )}
            {dots && (
              <div style={{ alignSelf: "flex-start", background: "#202c33", padding: "16px 24px", borderRadius: 20, display: "flex", gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#8696a0", opacity: 0.4 + 0.6 * Math.abs(Math.sin((t - digitando) * 5 - i * 0.7)) }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ custo
const IconeMaterial: React.FC<{ tipo: "tinta" | "isopor" | "cola" | "rebite"; s?: number }> = ({ tipo, s = 120 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    {tipo === "tinta" && (<><rect x="22" y="30" width="56" height="58" rx="6" fill="#1a1a1a" stroke="#fff" strokeWidth="4" /><ellipse cx="50" cy="30" rx="28" ry="8" fill="#333" stroke="#fff" strokeWidth="4" /><path d="M22 34 Q50 18 78 34" stroke="#fff" strokeWidth="3" fill="none" /><rect x="30" y="50" width="40" height="18" rx="3" fill={COR.laranja} /></>)}
    {tipo === "isopor" && (<><path d="M18 40 L60 26 L84 40 L84 76 L42 90 L18 76 Z" fill="#f4f4f0" stroke="#fff" strokeWidth="3" /><path d="M18 40 L42 54 L84 40 M42 54 L42 90" stroke="#b9b9b2" strokeWidth="3" fill="none" />{[[30, 60], [55, 62], [68, 52], [30, 74], [62, 76], [50, 44]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#d0d0c8" />)}</>)}
    {tipo === "cola" && (<><path d="M30 80 L30 36 Q30 28 38 28 L62 28 Q70 28 70 36 L70 80 Q70 88 62 88 L38 88 Q30 88 30 80Z" fill="#f1f1f1" stroke="#fff" strokeWidth="3" /><rect x="42" y="12" width="16" height="16" rx="3" fill={COR.laranja} /><rect x="36" y="46" width="28" height="20" rx="3" fill={COR.laranja} /></>)}
    {tipo === "rebite" && (<><ellipse cx="50" cy="32" rx="26" ry="10" fill="#c9ced3" stroke="#fff" strokeWidth="3" /><rect x="42" y="32" width="16" height="50" rx="3" fill="#aab1b7" stroke="#fff" strokeWidth="3" /><rect x="47" y="70" width="6" height="22" fill="#e1e5e8" /></>)}
  </svg>
);

export const Etiqueta93: React.FC<{ t: number; t0: number; tNum: number; tNumFim: number; tSplit: number; tItens: number[]; tSai: number }> = ({ t, t0, tNum, tNumFim, tSplit, tItens, tSai }) => {
  const q = k01(t, t0, t0 + 0.45);
  const y = q < 1 ? -500 * (1 - eo(q)) : 0;
  const bal = Math.sin((t - t0) * 6) * 6 * Math.exp(-(t - t0) * 2.5);
  const n = Math.round(93 * eo(k01(t, tNum, tNumFim)));
  const sp = eio(k01(t, tSplit, tSplit + 0.3));
  const sai = 1 - eio(k01(t, tSai, tSai + 0.3));
  const nomes = ["tinta", "isopor", "cola", "rebite"] as const;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: sai }}>
      <div style={{ position: "absolute", left: 540 - 250, top: 330 + y, width: 500, transform: `rotate(${bal}deg) scale(${1 - sp * 0.28})`, transformOrigin: "50% 0" }}>
        <div style={{ width: 4, height: 70, background: "rgba(255,255,255,0.8)", margin: "0 auto" }} />
        <div style={{ position: "relative", background: COR.creme, borderRadius: 28, padding: "40px 30px 34px", textAlign: "center", boxShadow: SOMBRA, clipPath: "polygon(50% 0, 100% 16%, 100% 100%, 0 100%, 0 16%)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: "#0b1026", margin: "0 auto 10px" }} />
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 170, color: COR.laranja, lineHeight: 0.95, letterSpacing: -6 }}>
            <span style={{ fontSize: 90, letterSpacing: 0 }}>R$ </span>{n}
          </div>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 48, color: COR.tinta }}>de material</div>
        </div>
      </div>
      {nomes.map((nm, i) => {
        const k = pop(k01(t, tItens[i], tItens[i] + 0.3));
        const col = i % 2, lin = Math.floor(i / 2);
        return (
          <div key={nm} style={{ position: "absolute", left: 150 + col * 420, top: 820 + lin * 230, width: 360, display: "flex", alignItems: "center", gap: 18, transform: `scale(${k})`, opacity: c01(k * 2), ...CARD, padding: "18px 26px", borderRadius: 28 }}>
            <IconeMaterial tipo={nm} s={110} />
            <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 54, color: "#fff" }}>{nm}</div>
          </div>
        );
      })}
    </div>
  );
};

/** carimbo "sucata" batendo em cima dos gabinetes e do vidro (posições na tela do plano nítido) */
export const Sucata: React.FC<{ t: number; tG: number; tV: number; tCarimbo: number; tSai: number }> = ({ t, tG, tV, tCarimbo, tSai }) => {
  const sai = 1 - eio(k01(t, tSai, tSai + 0.25));
  const rot = (txt: string, x: number, y: number, t1: number) => (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${pop(k01(t, t1, t1 + 0.3))})`, opacity: c01(k01(t, t1, t1 + 0.15)), ...CARD, padding: "14px 30px", borderRadius: 999, fontFamily: FONTE, fontWeight: 700, fontSize: 52, color: "#fff" }}>
      {txt}
    </div>
  );
  const kc = k01(t, tCarimbo, tCarimbo + 0.22);
  const esc = kc < 1 ? 2.2 - 1.2 * eo(kc) : 1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: sai }}>
      {rot("gabinetes", 360, 1110, tG)}
      {rot("vidro", 700, 640, tV)}
      {kc > 0 && (
        <div style={{ position: "absolute", left: 540, top: 860, transform: `translate(-50%,-50%) rotate(-12deg) scale(${esc})`, opacity: c01(kc * 3), border: `12px solid ${COR.laranja}`, borderRadius: 26, padding: "8px 44px", fontFamily: FONTE, fontWeight: 700, fontSize: 150, letterSpacing: 6, color: COR.laranja, background: "rgba(11,16,38,0.35)", textShadow: "0 0 30px rgba(255,107,44,0.5)" }}>
          SUCATA
        </div>
      )}
    </div>
  );
};

/** balança: R$ 93 de um lado, o botijão do outro; pende para o botijão (que custa mais) */
export const Balanca: React.FC<{ t: number; t0: number; tPende: number; tSai: number }> = ({ t, t0, tPende, tSai }) => {
  const e = eo(k01(t, t0, t0 + 0.35)), sai = 1 - eio(k01(t, tSai, tSai + 0.25));
  const k = k01(t, tPende, tPende + 0.5);
  const ang = (k < 1 ? eo(k) : 1) * 14 + Math.sin(k * Math.PI * 3) * 3 * (1 - k);
  const L = 330;
  const dy = Math.sin((ang * Math.PI) / 180) * L;
  const prato = (x: number, y: number, conteudo: React.ReactNode) => (
    <div style={{ position: "absolute", left: x - 170, top: y, width: 340, textAlign: "center" }}>
      <div style={{ height: 210, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>{conteudo}</div>
      <div style={{ width: 340, height: 26, borderRadius: "0 0 170px 170px", background: "#d9dde2", boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }} />
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: e * sai, transform: `translateY(${(1 - e) * 80}px)` }}>
      <div style={{ position: "absolute", left: 540 - 14, top: 620, width: 28, height: 520, background: "#cfd4d9", borderRadius: 10 }} />
      <div style={{ position: "absolute", left: 540 - 140, top: 1120, width: 280, height: 40, background: "#cfd4d9", borderRadius: 20 }} />
      <div style={{ position: "absolute", left: 540 - L, top: 610, width: 2 * L, height: 20, background: "#eef1f4", borderRadius: 10, transform: `rotate(${ang}deg)` }} />
      <div style={{ position: "absolute", left: 540 - 22, top: 598, width: 44, height: 44, borderRadius: 22, background: COR.laranja }} />
      {prato(540 - L, 400 - dy, (
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 120, color: COR.laranja, letterSpacing: -3, textShadow: "0 6px 26px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize: 64 }}>R$ </span>93
        </div>
      ))}
      {prato(540 + L, 400 + dy, (
        <svg width={170} height={200} viewBox="0 0 100 118">
          <rect x="30" y="2" width="40" height="18" rx="4" fill="#9ba6b0" />
          <path d="M14 40 Q14 20 50 20 Q86 20 86 40 L86 98 Q86 108 74 108 L26 108 Q14 108 14 98 Z" fill="#3f73b5" stroke="#fff" strokeWidth="3" />
          <rect x="24" y="106" width="52" height="10" rx="3" fill="#9ba6b0" />
          <path d="M26 50 L74 50" stroke="#ffffff55" strokeWidth="4" />
        </svg>
      ))}
      <div style={{ position: "absolute", left: 540 + L - 170, top: 400 + dy + 250, width: 340, textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: "#fff", opacity: e }}>botijão de gás</div>
      <div style={{ position: "absolute", left: 540 - L - 170, top: 400 - dy + 250, width: 340, textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: "#fff", opacity: e }}>material do forno</div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ Sergipe: pratos
export const Pratos: React.FC<{ t: number; t0: number; tAcende: [number, number]; tSai: number }> = ({ t, t0, tAcende, tSai }) => {
  const e = eio(k01(t, t0, t0 + 0.35)), sai = 1 - eio(k01(t, tSai, tSai + 0.3));
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 760, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", rowGap: 30, opacity: e * sai, ...CARD, padding: "36px 24px" }}>
      {Array.from({ length: 10 }, (_, i) => {
        const ka = i < 8 ? k01(t, tAcende[0] + (i / 8) * (tAcende[1] - tAcende[0]), tAcende[0] + (i / 8) * (tAcende[1] - tAcende[0]) + 0.18) : 0;
        return (
          <div key={i} style={{ display: "flex", justifyContent: "center", transform: `scale(${pop(k01(t, t0 + i * 0.04, t0 + i * 0.04 + 0.3)) * (1 + 0.1 * Math.sin(Math.PI * ka))})` }}>
            <svg width={140} height={140} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill={ka > 0 ? `rgba(255,107,44,${0.25 + 0.75 * ka})` : "rgba(255,255,255,0.12)"} stroke={ka > 0 ? COR.laranja : "rgba(255,255,255,0.55)"} strokeWidth="5" />
              <circle cx="50" cy="50" r="27" fill="none" stroke={ka > 0 ? "#fff" : "rgba(255,255,255,0.35)"} strokeWidth="4" />
              {ka > 0.5 && <g stroke="#fff" strokeWidth="5" strokeLinecap="round"><line x1="50" y1="14" x2="50" y2="4" /><line x1="76" y1="24" x2="83" y2="17" /><line x1="24" y1="24" x2="17" y2="17" /></g>}
            </svg>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ virada: onda -> rosto de linhas
const N = 96;
function pontosOnda(t: number) {
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const env = Math.sin(Math.PI * u);
    const y = (Math.sin(u * 40 + t * 9) * 0.5 + Math.sin(u * 17 - t * 6) * 0.35 + Math.sin(u * 71 + t * 13) * 0.15) * env * 120;
    out.push([90 + u * 900, 960 + y]);
  }
  return out;
}
// perfil genérico de rosto (testa, nariz, boca, queixo, pescoço), virado para a direita
const PERFIL: [number, number][] = [
  [380, 520], [440, 470], [520, 450], [600, 470], [650, 520], [670, 580], [668, 640], [690, 700], [740, 780], [700, 800], [690, 830],
  [705, 860], [690, 880], [700, 905], [685, 930], [680, 960], [660, 1000], [610, 1030], [560, 1040], [540, 1100], [535, 1180], [520, 1260],
];
function pontosRosto() {
  // reamostra o perfil em N pontos ao longo do comprimento
  const L: number[] = [0];
  for (let i = 1; i < PERFIL.length; i++) L.push(L[i - 1] + Math.hypot(PERFIL[i][0] - PERFIL[i - 1][0], PERFIL[i][1] - PERFIL[i - 1][1]));
  const tot = L[L.length - 1];
  const out: [number, number][] = [];
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = (i / (N - 1)) * tot;
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const u = (s - L[j]) / (L[j + 1] - L[j]);
    out.push([PERFIL[j][0] + (PERFIL[j + 1][0] - PERFIL[j][0]) * u, PERFIL[j][1] + (PERFIL[j + 1][1] - PERFIL[j][1]) * u]);
  }
  return out;
}
const ROSTO = pontosRosto();
export const OndaRosto: React.FC<{ t: number; t0: number; tMorf: number; tSai: number }> = ({ t, t0, tMorf, tSai }) => {
  const e = eio(k01(t, t0, t0 + 0.25)), sai = 1 - eio(k01(t, tSai, tSai + 0.3));
  const m = eio(k01(t, tMorf, tMorf + 0.7));
  const onda = pontosOnda(t);
  const pts = onda.map(([x, y], i) => [x + (ROSTO[i][0] - x) * m, y + (ROSTO[i][1] - y) * m]);
  const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: e * sai }}>
      <defs><filter id="gl"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      <path d={d} fill="none" stroke={COR.laranja} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" filter="url(#gl)" />
      {/* linhas de contorno internas do rosto (aparecem com o morfo) */}
      <g opacity={m} stroke="#ffb88f" strokeWidth={3} fill="none" filter="url(#gl)">
        <path d="M600 600 Q620 590 640 600" />
        <path d="M560 700 Q600 760 650 720" />
        <path d="M470 560 Q440 700 480 820 Q520 900 600 960" strokeDasharray="8 10" />
        <path d="M430 620 Q420 700 450 760" strokeDasharray="6 10" />
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ caixa de prompt
export const Prompt: React.FC<{ t: number; t0: number; tSai: number; txt: string; thumbs: string[] }> = ({ t, t0, tSai, txt, thumbs }) => {
  const n = Math.floor(txt.length * eio(k01(t, t0 + 0.15, t0 + 1.25)));
  const e = eo(k01(t, t0, t0 + 0.3)), sai = 1 - eio(k01(t, tSai, tSai + 0.25));
  const ks = eio(k01(t, t0 + 0.9, tSai));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: sai }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 520, transform: `scale(${0.9 + 0.1 * e})`, opacity: e, background: "rgba(255,255,255,0.08)", border: `3px solid ${COR.laranja}`, borderRadius: 34, padding: "34px 38px", boxShadow: `0 0 70px rgba(255,107,44,0.35), inset 0 1px 0 rgba(255,255,255,0.3)`, backdropFilter: "blur(10px)" }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: COR.laranja, letterSpacing: 4, fontWeight: 700, marginBottom: 16 }}>PROMPT</div>
        <div style={{ fontFamily: MONO, fontSize: 42, color: "#fff", lineHeight: 1.3, minHeight: 220 }}>
          {txt.slice(0, n)}
          <span style={{ display: "inline-block", width: 20, height: 44, marginLeft: 4, verticalAlign: "-6px", background: Math.floor(t * 3) % 2 ? COR.laranja : "transparent" }} />
        </div>
      </div>
      {thumbs.map((th, i) => {
        const k = eio(k01(ks, i * 0.12, 0.6 + i * 0.12));
        const x0 = 540, y0 = 700, x1 = 260 + i * 187, y1 = 1180;
        return (
          <div key={th} style={{ position: "absolute", left: x0 + (x1 - x0) * k - 80, top: y0 + (y1 - y0) * k - 142, width: 160, height: 284, borderRadius: 18, overflow: "hidden", opacity: c01(k * 4), transform: `scale(${0.4 + 0.6 * k}) rotate(${(i - 1.5) * 4 * k}deg)`, boxShadow: SOMBRA, border: "3px solid rgba(255,255,255,0.8)" }}>
            <Img src={staticFile(th)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ PLAY: seguir, comentar, link, Do Prompt ao Play
const Dedo: React.FC<{ x: number; y: number; toque: number; op: number }> = ({ x, y, toque, op }) => (
  <div style={{ position: "absolute", left: x - 40, top: y - 20, opacity: op, transform: `scale(${1 - 0.08 * Math.sin(Math.PI * c01(toque))})` }}>
    {toque > 0 && toque < 1 && <div style={{ position: "absolute", left: 40 - 60 * (0.5 + toque), top: 20 - 60 * (0.5 + toque), width: 120 * (0.5 + toque), height: 120 * (0.5 + toque), borderRadius: "50%", border: `5px solid ${COR.laranja}`, opacity: 1 - toque }} />}
    <svg width={150} height={220} viewBox="0 0 60 88">
      <path d="M16 10 Q16 2 23 2 Q30 2 30 10 L30 40 L34 38 Q40 36 42 42 L46 40 Q52 38 54 44 L56 44 Q60 46 60 52 L60 66 Q60 80 48 86 L28 86 Q18 82 12 70 L4 52 Q2 46 8 45 Q12 44 16 50 Z" fill="#f2c9a5" stroke="#3a2a20" strokeWidth="2" />
      <path d="M30 40 L30 52 M42 42 L42 54 M54 44 L54 56" stroke="#c99d7a" strokeWidth="1.6" />
    </svg>
  </div>
);

export const CelularPlay: React.FC<{ t: number; tSeguir: number; tPlay: number; tPlayFim: number; tLink: number; tSai: number; img: string }> = ({ t, tSeguir, tPlay, tPlayFim, tLink, tSai, img }) => {
  const e = eo(k01(t, tSeguir - 0.45, tSeguir - 0.1));
  const sai = 1 - eio(k01(t, tSai, tSai + 0.35));
  const seguindo = t > tSeguir + 0.12;
  const toque = k01(t, tSeguir, tSeguir + 0.45);
  const nPlay = Math.floor(4 * k01(t, tPlay, tPlayFim));
  const enviado = t > tPlayFim + 0.15;
  const kl = eo(k01(t, tLink, tLink + 0.35));
  const dedoY = t < tSeguir + 0.5 ? 640 : 1130;
  const dedoOp = t < tPlayFim + 0.3 ? 1 : 1 - k01(t, tPlayFim + 0.3, tPlayFim + 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: sai, transform: `translateY(${(1 - e) * 900 + (1 - sai) * -120}px) scale(${1 - (1 - sai) * 0.1})` }}>
      <div style={{ position: "absolute", left: 180, top: 300, width: 720, height: 1080, borderRadius: 80, background: "#0d0d10", padding: 16, boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 3px #2a2a30" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 66, overflow: "hidden", background: "#000", fontFamily: FONTE }}>
          <Img src={staticFile(img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.8)" }} />
          <div style={{ position: "absolute", left: 30, right: 30, top: 300, display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 84, height: 84, borderRadius: 42, background: `linear-gradient(135deg, ${COR.laranja}, #ffb347)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 0, height: 0, borderLeft: "26px solid #fff", borderTop: "16px solid transparent", borderBottom: "16px solid transparent", marginLeft: 6 }} />
            </div>
            <div style={{ color: "#fff", fontSize: 36, fontWeight: 700, textShadow: "0 2px 8px #000" }}>seu.perfil</div>
            <div style={{ marginLeft: "auto", padding: "12px 30px", borderRadius: 16, fontSize: 34, fontWeight: 700, color: "#fff", background: seguindo ? "rgba(255,255,255,0.18)" : COR.laranja, border: seguindo ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent", transform: `scale(${1 - 0.1 * Math.sin(Math.PI * toque)})` }}>
              {seguindo ? "Seguindo" : "Seguir"}
            </div>
          </div>
          {/* campo de comentário */}
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 34, height: 96, borderRadius: 48, background: "rgba(20,20,24,0.92)", border: "2px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", padding: "0 30px", gap: 16 }}>
            <div style={{ fontSize: 40, color: nPlay > 0 && !enviado ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: 2 }}>
              {enviado ? "Adicione um comentário…" : nPlay > 0 ? "PLAY".slice(0, nPlay) : "Adicione um comentário…"}
              {!enviado && nPlay > 0 && <span style={{ display: "inline-block", width: 4, height: 40, background: COR.laranja, marginLeft: 4, verticalAlign: "-6px" }} />}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 34, fontWeight: 700, color: nPlay >= 4 ? COR.laranja : "rgba(255,255,255,0.3)" }}>Publicar</div>
          </div>
          {enviado && (
            <div style={{ position: "absolute", left: 30, right: 120, bottom: 160, display: "flex", gap: 16, alignItems: "center", transform: `scale(${pop(k01(t, tPlayFim + 0.15, tPlayFim + 0.45))})`, transformOrigin: "0 100%" }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: "#7a8cff" }} />
              <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 18, padding: "10px 20px", color: "#fff", fontSize: 32 }}>
                <b>você</b> <span style={{ color: COR.laranja, fontWeight: 700 }}>PLAY</span>
              </div>
            </div>
          )}
          {/* aviso com o link do grupo */}
          {kl > 0 && (
            <div style={{ position: "absolute", left: 22, right: 22, top: 40 - (1 - kl) * 200, background: "rgba(245,245,247,0.97)", borderRadius: 34, padding: "22px 26px", display: "flex", gap: 20, alignItems: "center", boxShadow: SOMBRA }}>
              <div style={{ width: 76, height: 76, borderRadius: 20, background: COR.laranja, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "24px solid #fff", borderTop: "15px solid transparent", borderBottom: "15px solid transparent", marginLeft: 6 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, color: "#555", fontWeight: 600 }}>Mensagem · agora</div>
                <div style={{ fontSize: 36, color: "#111", fontWeight: 700, lineHeight: 1.15 }}>Aqui está o link do grupo de lançamento 🔗</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Dedo x={t < tSeguir + 0.5 ? 840 : 300} y={dedoY} toque={t < tSeguir + 0.5 ? toque : k01(t, tPlay - 0.1, tPlay + 0.3)} op={dedoOp * e} />
    </div>
  );
};

export const DoPromptAoPlay: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const kb = pop(k01(t, t0, t0 + 0.4));
  const kt = eio(k01(t, t0 + 0.15, t0 + 0.6));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <div style={{ width: 230, height: 230, borderRadius: 115, background: `radial-gradient(circle at 35% 30%, #ffa070, ${COR.laranja} 55%, #d9481a)`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${kb})`, boxShadow: `0 0 80px rgba(255,107,44,0.7)` }}>
        <div style={{ width: 0, height: 0, borderLeft: "84px solid #fff", borderTop: "52px solid transparent", borderBottom: "52px solid transparent", marginLeft: 22 }} />
      </div>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 92, color: "#fff", letterSpacing: -2, lineHeight: 1.3, paddingBottom: 14, clipPath: kt >= 0.999 ? "none" : `inset(-40px ${100 - kt * 100}% -40px -40px)`, whiteSpace: "nowrap", textShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
        Do Prompt ao <span style={{ color: COR.laranja }}>Play</span>
      </div>
      <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, color: "rgba(255,255,255,0.8)", opacity: eio(k01(t, t0 + 0.6, t0 + 0.9)) }}>
        comenta <span style={{ color: COR.laranja, fontWeight: 700 }}>PLAY</span> e entra no grupo
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ rótulos do corte em X
export const RotuloCorte: React.FC<{ t: number; tLuz: number; tCalor: number; tSai: number }> = ({ t, tLuz, tCalor, tSai }) => {
  const sai = 1 - eio(k01(t, tSai, tSai + 0.2));
  const r = (txt: string, cor: string, x: number, y: number, t1: number, i: "sol" | "termo") => (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${pop(k01(t, t1, t1 + 0.3))})`, opacity: c01(k01(t, t1, t1 + 0.12)) * sai, display: "flex", alignItems: "center", gap: 14, background: "rgba(255,250,242,0.96)", borderRadius: 999, padding: "10px 28px 10px 10px", boxShadow: SOMBRA }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: cor, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico i={i} s={40} /></div>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 48, color: COR.tinta }}>{txt}</div>
    </div>
  );
  return (
    <>
      {r("luz entra", "#f2b300", 120, 330, tLuz, "sol")}
      {r("calor fica preso", COR.laranja, 330, 1090, tCalor, "termo")}
    </>
  );
};

/** brilho curto que costura dois planos (luz quente) */
export const Flash: React.FC<{ t: number; t0: number; dur?: number }> = ({ t, t0, dur = 0.22 }) => {
  const k = k01(t, t0 - dur / 2, t0 + dur / 2);
  if (k <= 0 || k >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, rgba(255,236,200,0.9), rgba(255,140,60,0.35) 60%, rgba(255,107,44,0) 100%)", opacity: Math.sin(Math.PI * k) * 0.75, mixBlendMode: "screen" }} />;
};
