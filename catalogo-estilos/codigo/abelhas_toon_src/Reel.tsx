import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MundoReel, T_LOOP, T_POP, N_QUADROS, W as PALAVRAS, ws, we } from "./three/reel";

// ----------------------------------------------------------------- tempo (com tempo forçado para amostras)
export const TempoCtx = React.createContext<number | null>(null);
const useT = () => {
  const f = useCurrentFrame();
  const o = React.useContext(TempoCtx);
  const t = o ?? f / 30;
  return { t, frame: t * 30 };
};
const c01 = (x: number) => Math.min(1, Math.max(0, x));
const useMola = (t0: number, cfg = { damping: 12, stiffness: 170, mass: 0.7 }) => {
  const { frame } = useT();
  return spring({ frame: frame - t0 * 30, fps: 30, config: cfg });
};

export const LARANJA = "#FF6B2C";
export const TINTA = "#0B1026";
const FONTE = "'Space Grotesk', sans-serif";
const PRETO = "#1a0f0c";
const CONTORNO = `0 7px 0 ${PRETO}, 5px 0 0 ${PRETO}, -5px 0 0 ${PRETO}, 0 -5px 0 ${PRETO}, 4px 4px 0 ${PRETO}, -4px 4px 0 ${PRETO}, 4px -4px 0 ${PRETO}, -4px -4px 0 ${PRETO}`;
const CAIXA = `0 0 0 6px ${PRETO}, 0 10px 0 ${PRETO}`;

// ----------------------------------------------------------------- cena 3D
const Cena3D: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<MundoReel | null>(null);
  const { t } = useT();
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    if (!ref.current) return;
    const h = delayRender("quadro 3D");
    if (!mundo.current) {
      mundo.current = new MundoReel(ref.current, width, height);
      mundo.current.quadro(Math.max(0, t)); // aquece o renderizador
    }
    mundo.current.quadro(Math.max(0, t));
    continueRender(h);
  }, [t, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

// ----------------------------------------------------------------- legenda (segue a fala gravada)
const GRAFIA: Record<number, string> = { 26: "3", 29: "4", 55: "1º", 126: "R$ 43", 127: "", 128: "", 130: "", 131: "", 173: "E se.", 197: "PLAY," };
const OCULTA: [number, number][] = [
  [0, 4], // gancho: título na tela
  [211, 214], // "Do Prompt ao Play" escrito na tela
];
const oculta = (i: number) => OCULTA.some(([a, b]) => i >= a && i <= b);
type Cartao = { ini: number; fim: number; linhas: number[][] };
const texto = (i: number) => GRAFIA[i] ?? PALAVRAS[i].w;
function cartoes(): Cartao[] {
  const out: Cartao[] = [];
  let atual: number[] = [];
  const fecha = () => {
    if (!atual.length) return;
    const linhas: number[][] = [[]];
    let n = 0;
    for (const i of atual) {
      const w = texto(i).length + 1;
      if (n + w > 19 && linhas[linhas.length - 1].length) {
        linhas.push([]);
        n = 0;
      }
      linhas[linhas.length - 1].push(i);
      n += w;
    }
    out.push({ ini: atual[0], fim: atual[atual.length - 1], linhas: linhas.slice(0, 2) });
    atual = [];
  };
  let chars = 0;
  for (let i = 0; i < PALAVRAS.length; i++) {
    const w = texto(i);
    if (!w) continue;
    if (oculta(i)) {
      fecha();
      chars = 0;
      continue;
    }
    if (chars + w.length > 32) {
      fecha();
      chars = 0;
    }
    atual.push(i);
    chars += w.length + 1;
    if (/[.?!]$/.test(PALAVRAS[i].w) || (/,$/.test(PALAVRAS[i].w) && chars > 14)) {
      fecha();
      chars = 0;
    }
  }
  fecha();
  return out;
}
const CARTOES = cartoes();
const Palavra: React.FC<{ i: number; t: number }> = ({ i, t }) => {
  let s = texto(i).replace(/[,]$/g, "");
  if (/^play$/i.test(s)) s = "PLAY";
  const dita = t >= PALAVRAS[i].s - 0.05;
  const lar = /\d/.test(s) || s === "IA" || s === "PLAY";
  return <span style={{ opacity: dita ? 1 : 0, color: lar ? LARANJA : undefined }}>{s} </span>;
};
const LegendaFala: React.FC = () => {
  const { t } = useT();
  const j = CARTOES.findIndex((k, jj) => t >= PALAVRAS[k.ini].s - 0.08 && t < (CARTOES[jj + 1] ? Math.min(PALAVRAS[CARTOES[jj + 1].ini].s - 0.08, PALAVRAS[k.fim].e + 0.6) : PALAVRAS[k.fim].e + 0.6));
  if (j < 0) return null;
  const c = CARTOES[j];
  return (
    <div style={{ position: "absolute", top: 1190, left: 40, right: 40, textAlign: "center" }}>
      {c.linhas.map((l, n) => (
        <div key={n} style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 88, lineHeight: 1.1, color: "#fff", letterSpacing: -1.5, WebkitTextStroke: `14px ${PRETO}`, paintOrder: "stroke fill", textShadow: `0 8px 0 ${PRETO}` }}>
          {l.map((i) => (
            <Palavra key={i} i={i} t={t} />
          ))}
        </div>
      ))}
    </div>
  );
};

// ----------------------------------------------------------------- gancho
const Gancho: React.FC = () => {
  const { t } = useT();
  const tr = t > T_POP && t < T_POP + 0.35 ? Math.sin((t - T_POP) * 70) * 10 * (1 - (t - T_POP) / 0.35) : 0;
  return (
    <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", fontFamily: FONTE, fontWeight: 700, color: "#fff" }}>
      <div style={{ fontSize: 112, lineHeight: 1.0, letterSpacing: -2, WebkitTextStroke: `16px ${PRETO}`, paintOrder: "stroke fill", textShadow: `0 10px 0 ${PRETO}` }}>E SE AS ABELHAS</div>
      <div style={{ fontSize: 150, lineHeight: 1.05, letterSpacing: -3, color: LARANJA, WebkitTextStroke: `18px ${PRETO}`, paintOrder: "stroke fill", textShadow: `0 12px 0 ${PRETO}`, transform: `translateX(${tr}px)` }}>SUMISSEM?</div>
    </div>
  );
};

// ----------------------------------------------------------------- selos
const Icone: React.FC<{ nome: string }> = ({ nome }) => {
  const p = { fill: "none", stroke: "#fff", strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const g: Record<string, React.ReactNode> = {
    doc: (
      <g {...p}>
        <rect x="6" y="3" width="16" height="22" rx="2" />
        <path d="M10 9h8M10 13h8M10 17h5" />
      </g>
    ),
    flor: (
      <g fill="#fff">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={14 + 6 * Math.cos((i / 5) * 6.283)} cy={14 + 6 * Math.sin((i / 5) * 6.283)} r={4.6} />
        ))}
        <circle cx="14" cy="14" r="3.6" fill="#ffd23a" />
      </g>
    ),
    cal: (
      <g {...p}>
        <rect x="4" y="6" width="20" height="18" rx="2" />
        <path d="M4 11h20M9 3v5M19 3v5" />
      </g>
    ),
    pincel: (
      <g {...p}>
        <path d="M6 22l9-9M15 13l4-4 3 3-4 4z" />
        <path d="M6 22c-1 1 0 3 2 2l2-2" />
      </g>
    ),
    cesta: (
      <g {...p}>
        <path d="M4 12h20l-2 11H6z" />
        <path d="M9 12l5-7 5 7" />
      </g>
    ),
    moeda: (
      <g {...p}>
        <ellipse cx="14" cy="9" rx="8" ry="3.5" />
        <path d="M6 9v5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5V9M6 14v5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5v-5" />
      </g>
    ),
    vento: (
      <g {...p}>
        <path d="M3 10h14a3 3 0 1 0-3-3M3 15h19a3 3 0 1 1-3 3M3 20h9" />
      </g>
    ),
  };
  return (
    <div style={{ width: 52, height: 52, borderRadius: 52, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `4px solid ${PRETO}` }}>
      <svg width={32} height={32} viewBox="0 0 28 28">
        {g[nome]}
      </svg>
    </div>
  );
};
const Selo: React.FC<{ texto: string; t0: number; t1: number; y?: number; icone: string }> = ({ texto, t0, t1, y = 300, icone }) => {
  const { t } = useT();
  const m = useMola(t0, { damping: 10, stiffness: 220, mass: 0.6 });
  if (t < t0 || t > t1 + 0.3) return null;
  const sai = c01((t1 + 0.25 - t) / 0.25);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: sai }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 28px 10px 12px", borderRadius: 60, background: "#fffaf2", boxShadow: CAIXA, transform: `scale(${0.4 + 0.6 * m}) rotate(${(1 - m) * -8}deg)` }}>
        <Icone nome={icone} />
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 46, color: "#14110f", letterSpacing: -0.5 }}>{texto}</span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- contador de bancas vazias (ícones, sem número fora da fala)
const IconeBanca: React.FC<{ cor: string; estado: number; pop: number }> = ({ cor, estado, pop }) => {
  // estado: 0 cheia, 0.5 meia, 1 vazia
  const cinza = "#b9b4ad";
  return (
    <svg width={96} height={86} viewBox="0 0 48 43" style={{ transform: `scale(${1 + 0.25 * pop})` }}>
      <path d="M4 14 L8 4 H40 L44 14 Z" fill={estado >= 1 ? cinza : cor} stroke={PRETO} strokeWidth={2.4} strokeLinejoin="round" />
      <rect x="6" y="24" width="36" height="15" fill={estado >= 1 ? "#ddd8d0" : "#e8b47a"} stroke={PRETO} strokeWidth={2.4} />
      <path d="M9 14v10M39 14v10" stroke={PRETO} strokeWidth={2.4} />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={11 + i * 6.5} cy={21} r={3.2} fill={cor} stroke={PRETO} strokeWidth={1.5} opacity={estado >= 1 ? 0 : estado > 0 && i % 2 ? 0 : 1} />
      ))}
      {estado >= 1 && <path d="M16 28 L32 36 M32 28 L16 36" stroke="#d63a2a" strokeWidth={3} strokeLinecap="round" />}
    </svg>
  );
};
const Contador: React.FC = () => {
  const { t } = useT();
  const t0 = 29.0, t1 = 45.95;
  const ent = useMola(t0);
  if (t < t0 || t > t1 + 0.3) return null;
  const sai = c01((t1 + 0.25 - t) / 0.25);
  const B: [string, string, number, number][] = [
    ["maracujá", "#ffd23a", ws(73) + 0.3, 1],
    ["café", "#c4161c", ws(98), 0.5],
    ["laranja", "#ff8a14", ws(100), 0.5],
    ["maçã", "#e8273a", ws(103), 0.5],
  ];
  return (
    <div style={{ position: "absolute", top: 410, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: sai, transform: `translateY(${(1 - ent) * -40}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,250,242,0.95)", borderRadius: 30, padding: "8px 20px", boxShadow: CAIXA }}>
        <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: "#14110f", marginRight: 6 }}>bancas vazias</span>
        {B.map(([n, cor, tt, est]) => {
          const p = c01((t - tt) / 0.15) * (1 - c01((t - tt - 0.15) / 0.25));
          return <IconeBanca key={n} cor={cor} estado={t >= tt ? est : 0} pop={p} />;
        })}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- "mais caro": etiqueta subindo
const Caro: React.FC = () => {
  const { t } = useT();
  const t0 = ws(161) - 0.05, t1 = 61.85;
  const m = useMola(t0, { damping: 9, stiffness: 240, mass: 0.6 });
  if (t < t0 || t > t1 + 0.25) return null;
  const sobe = Math.sin((t - t0) * 6) * 6;
  return (
    <div style={{ position: "absolute", top: 520, right: 110, transform: `scale(${m}) rotate(10deg) translateY(${sobe}px)`, opacity: c01((t1 + 0.25 - t) / 0.25) }}>
      <svg width={230} height={170} viewBox="0 0 115 85">
        <path d="M8 22 L40 6 H104 a6 6 0 0 1 6 6 V58 a6 6 0 0 1 -6 6 H40 L8 48 Z" fill="#ffd23a" stroke={PRETO} strokeWidth={4} strokeLinejoin="round" />
        <circle cx="26" cy="35" r="6" fill="#fff" stroke={PRETO} strokeWidth={3} />
        <path d="M74 52 V20 M60 33 L74 18 L88 33" stroke={LARANJA} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M74 52 V20 M60 33 L74 18 L88 33" stroke={PRETO} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.0} />
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------- campo de comentário digitando "E se…"
const ComentaEse: React.FC = () => {
  const { t } = useT();
  const t0 = ws(167) - 0.1, t1 = 64.42;
  const m = useMola(t0);
  if (t < t0 || t > t1 + 0.2) return null;
  const alvo = "E se";
  const n = Math.max(0, Math.min(alvo.length, Math.floor((t - ws(170)) / 0.11)));
  const txt = alvo.slice(0, n);
  const pts = n >= alvo.length ? ["", ".", "..", "…"][Math.floor((t - ws(170) - alvo.length * 0.11) * 3.5) % 4] : "";
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: TINTA, opacity: 0.35 * m * c01((t1 + 0.2 - t) / 0.2) }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 860, height: 124, borderRadius: 64, background: "#fff", display: "flex", alignItems: "center", padding: "0 20px", gap: 20, boxShadow: CAIXA, transform: `translateY(${(1 - m) * 260}px)`, opacity: c01((t1 + 0.2 - t) / 0.2) }}>
        <div style={{ width: 84, height: 84, borderRadius: 50, background: `linear-gradient(135deg, ${LARANJA}, #ffd23a)`, border: `4px solid ${PRETO}` }} />
        <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 60, color: txt ? "#111" : "#9a9aa2", whiteSpace: "nowrap" }}>
          {txt ? (
            <>
              {txt}
              <span style={{ color: LARANJA }}>{pts}</span>
            </>
          ) : (
            "Adicione um comentário…"
          )}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>|</span>
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#1b6cf2" }}>Publicar</div>
      </div>
    </>
  );
};

// ----------------------------------------------------------------- virada: a onda da voz vira um rosto de linhas
const VozRosto: React.FC = () => {
  const { t } = useT();
  const t0 = ws(182) - 0.1, t1 = ws(190);
  if (t < t0 || t > t1 + 0.3) return null;
  const m = easeIO(c01((t - ws(184)) / 1.3));
  const N = 110;
  const P: [number, number][] = [
    [0.0, 0.66], [0.14, 0.66], [0.24, 0.62], [0.3, 0.52], [0.32, 0.4], [0.36, 0.3], [0.42, 0.22], [0.5, 0.17], [0.58, 0.19], [0.62, 0.27],
    [0.6, 0.35], [0.67, 0.42], [0.62, 0.46], [0.64, 0.5], [0.6, 0.54], [0.62, 0.6], [0.56, 0.68], [0.48, 0.7], [0.42, 0.8], [0.42, 0.92], [1.0, 0.92],
  ];
  const perfil = (u: number) => {
    const x = u * (P.length - 1);
    const i = Math.min(P.length - 2, Math.floor(x));
    const f = x - i;
    return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
  };
  const linhas = [-14, 0, 14].map((off, k) => {
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const onda = 0.6 + Math.sin(u * 46 + t * 16 + k) * 0.075 * Math.sin(u * Math.PI) * (0.6 + 0.4 * Math.sin(t * 7 + u * 9));
      const [px, py] = perfil(u);
      const x = (1 - m) * u + m * (0.12 + px * 0.72);
      const y = (1 - m) * onda + m * py;
      pts.push(`${(x * 900 + off).toFixed(1)},${(y * 760 + off * 0.5).toFixed(1)}`);
    }
    return pts.join(" ");
  });
  const vis = c01((t - t0) / 0.3) * c01((t1 + 0.3 - t) / 0.3);
  return (
    <svg width={900} height={760} style={{ position: "absolute", left: 90, top: 420, opacity: vis, filter: "drop-shadow(0 0 16px rgba(255,107,44,0.85))" }}>
      {linhas.map((p, k) => (
        <polyline key={k} points={p} fill="none" stroke={LARANJA} strokeOpacity={k === 1 ? 1 : 0.55} strokeWidth={k === 1 ? 7 : 4} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
};
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ----------------------------------------------------------------- "Quer aprender a fazer vídeos assim?": do prompt ao vídeo
const PromptVideo: React.FC = () => {
  const { t } = useT();
  const t0 = ws(190) - 0.1, t1 = ws(196) - 0.1;
  const m = useMola(t0);
  if (t < t0 || t > t1 + 0.25) return null;
  const alvo = "E se as abelhas sumissem? Reel 9:16, 3D toon";
  const txt = alvo.slice(0, Math.floor(c01((t - t0 - 0.15) / 0.9) * alvo.length));
  const prog = c01((t - t0 - 1.1) / 0.6);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 560, opacity: c01((t1 + 0.25 - t) / 0.25), transform: `scale(${0.7 + 0.3 * m}) translateY(${(1 - m) * 80}px)` }}>
      <div style={{ background: "#141a3a", border: `4px solid ${LARANJA}`, borderRadius: 32, padding: 34, boxShadow: "0 0 60px rgba(255,107,44,0.35)" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: LARANJA, letterSpacing: 2 }}>PROMPT</div>
        <div style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 50, color: "#fff", lineHeight: 1.2, minHeight: 130, marginTop: 10 }}>
          {txt}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>|</span>
        </div>
        <div style={{ marginTop: 18, height: 22, borderRadius: 12, background: "#2a3160", overflow: "hidden" }}>
          <div style={{ width: `${prog * 100}%`, height: "100%", background: LARANJA }} />
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: "#fff", opacity: prog }}>
          <svg width={40} height={40} viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="5" fill={LARANJA} />
            <path d="M4 3 L7 5 L4 7 Z" fill="#fff" />
          </svg>
          {prog < 1 ? "gerando o vídeo…" : "vídeo pronto"}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- Seguir + PLAY + Do Prompt ao Play
const Chamada: React.FC = () => {
  const { t } = useT();
  const tSeguir = ws(196) - 0.1, tPlay = ws(197), tCurso = ws(211) - 0.1, t1 = T_LOOP;
  const ent = useMola(tSeguir - 0.1);
  const toque = useMola(tSeguir + 0.35, { damping: 8, stiffness: 300, mass: 0.5 });
  const mc = useMola(tCurso, { damping: 10, stiffness: 200, mass: 0.7 });
  if (t < tSeguir - 0.15 || t > t1) return null;
  const seguindo = t >= tSeguir + 0.35;
  const play = "PLAY".slice(0, Math.max(0, Math.min(4, Math.floor((t - tPlay) / 0.07))));
  const sai = c01((t1 - t) / 0.2);
  const dTap = t - (tSeguir + 0.25);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: sai }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 470, display: "flex", alignItems: "center", gap: 26, background: "#fff", borderRadius: 34, padding: "24px 28px", boxShadow: CAIXA, transform: `translateY(${(1 - ent) * -80}px)`, opacity: ent }}>
        <div style={{ width: 104, height: 104, borderRadius: 60, background: `conic-gradient(${LARANJA}, #ffd14a, ${LARANJA})`, padding: 6 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 60, background: TINTA, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={44} height={44} viewBox="0 0 10 10">
              <path d="M3 2 L8 5 L3 8 Z" fill={LARANJA} />
            </svg>
          </div>
        </div>
        <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#111" }}>Vídeos feitos com IA</div>
        <div style={{ position: "relative", background: seguindo ? "#e9e9ee" : "#1b6cf2", color: seguindo ? "#111" : "#fff", fontFamily: FONTE, fontWeight: 700, fontSize: 40, padding: "16px 30px", borderRadius: 18, transform: `scale(${seguindo ? 0.92 + 0.08 * toque : 1})` }}>
          {seguindo ? "Seguindo" : "Seguir"}
          {dTap > -0.2 && dTap < 0.6 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 90, height: 90, marginLeft: -45, marginTop: -45, borderRadius: 50, border: "6px solid rgba(255,107,44,0.9)", transform: `scale(${0.4 + Math.max(0, dTap) * 2})`, opacity: c01(1 - Math.max(0, dTap) / 0.6) }} />}
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 670, height: 116, borderRadius: 60, background: "#fff", display: "flex", alignItems: "center", padding: "0 18px", gap: 18, boxShadow: CAIXA, opacity: c01((t - tPlay + 0.4) / 0.3) }}>
        <div style={{ width: 78, height: 78, borderRadius: 50, background: `linear-gradient(135deg, ${LARANJA}, #ffd23a)`, border: `4px solid ${PRETO}` }} />
        <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 56, color: play ? LARANJA : "#9a9aa2" }}>
          {play || "Adicione um comentário…"}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: "#111" }}>|</span>
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#1b6cf2" }}>Publicar</div>
      </div>
      {t >= tCurso && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 850, display: "flex", justifyContent: "center", transform: `scale(${mc})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, background: TINTA, border: `4px solid ${LARANJA}`, borderRadius: 30, padding: "18px 34px 18px 18px", boxShadow: "0 0 50px rgba(255,107,44,0.5)" }}>
            <div style={{ width: 112, height: 112, borderRadius: 60, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={54} height={54} viewBox="0 0 10 10">
                <path d="M3 1.8 L8.4 5 L3 8.2 Z" fill="#fff" />
              </svg>
            </div>
            <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 70, color: "#fff", lineHeight: 1, letterSpacing: -1 }}>
              Do Prompt <span style={{ color: LARANJA }}>ao Play</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------- composição
const Nucleo: React.FC = () => {
  const { t } = useT();
  const ia = c01((t - ws(182) + 0.3) / 0.4);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D />
      {ia > 0 && <AbsoluteFill style={{ background: TINTA, opacity: ia * 0.35 }} />}
      {t < 2.2 && <Gancho />}
      <Selo texto="relatório BPBES" icone="doc" t0={ws(22)} t1={13.85} />
      <Selo texto="3 em cada 4" icone="flor" t0={ws(26)} t1={13.85} y={420} />
      <Selo texto="1º dia" icone="cal" t0={ws(55)} t1={26.85} />
      <Selo texto="polinização à mão" icone="pincel" t0={ws(84)} t1={37.75} y={300} />
      <Selo texto="parte da colheita" icone="cesta" t0={ws(106)} t1={42.75} y={300} />
      <Selo texto="R$ 43 bi/ano" icone="moeda" t0={ws(129)} t1={51.75} />
      <Selo texto="polinizado pelo vento" icone="vento" t0={ws(148)} t1={56.8} />
      <Contador />
      <Caro />
      <ComentaEse />
      <VozRosto />
      <PromptVideo />
      <Chamada />
      {t >= 2.2 && <LegendaFala />}
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => {
  const { t } = useT();
  const [fonte] = useState(() => delayRender("fonte"));
  useEffect(() => {
    const ff = new FontFace("Space Grotesk", `url(${staticFile("SpaceGrotesk.ttf")})`, { weight: "300 700" });
    ff.load().then((x) => {
      document.fonts.add(x);
      continueRender(fonte);
    });
  }, [fonte]);
  if (t >= T_LOOP) {
    // o último quadro é igual ao primeiro (loop)
    const tl = Math.max(0, t - (N_QUADROS - 1) / 30);
    return (
      <AbsoluteFill>
        <TempoCtx.Provider value={tl}>
          <Nucleo />
        </TempoCtx.Provider>
        {t - T_LOOP < 0.15 && <AbsoluteFill style={{ background: "#fff", opacity: 1 - (t - T_LOOP) / 0.15 }} />}
      </AbsoluteFill>
    );
  }
  return <Nucleo />;
};

// cada quadro desta composição é um instante t do reel (para conferência)
export const Amostras: React.FC<{ lista: number[] }> = ({ lista }) => {
  const f = useCurrentFrame();
  return (
    <TempoCtx.Provider value={lista[Math.min(f, lista.length - 1)]}>
      <Reel />
    </TempoCtx.Provider>
  );
};
void we;

// capa: o prato dividido (metade colorida, metade cinza) e o título, sem selos
export const Capa: React.FC = () => {
  const [fonte] = useState(() => delayRender("fonte capa"));
  useEffect(() => {
    const ff = new FontFace("Space Grotesk", `url(${staticFile("SpaceGrotesk.ttf")})`, { weight: "300 700" });
    ff.load().then((x) => {
      document.fonts.add(x);
      continueRender(fonte);
    });
  }, [fonte]);
  return (
    <TempoCtx.Provider value={61.75}>
      <AbsoluteFill style={{ background: "#000" }}>
        <Cena3D />
        <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", fontFamily: FONTE, fontWeight: 700, color: "#fff" }}>
          <div style={{ fontSize: 112, lineHeight: 1.0, letterSpacing: -2, WebkitTextStroke: `16px ${PRETO}`, paintOrder: "stroke fill", textShadow: `0 10px 0 ${PRETO}` }}>E SE AS ABELHAS</div>
          <div style={{ fontSize: 150, lineHeight: 1.05, letterSpacing: -3, color: LARANJA, WebkitTextStroke: `18px ${PRETO}`, paintOrder: "stroke fill", textShadow: `0 12px 0 ${PRETO}` }}>SUMISSEM?</div>
        </div>
      </AbsoluteFill>
    </TempoCtx.Provider>
  );
};
