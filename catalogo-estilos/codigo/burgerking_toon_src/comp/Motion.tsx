import React from "react";
import { spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBungee } from "@remotion/google-fonts/Bungee";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";
import { useT } from "./tempo";
import type { Dir } from "../three/kit";

export const { fontFamily: FONTE } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });
export const { fontFamily: TITULO } = loadBungee("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
export const { fontFamily: PIXEL } = loadPixel("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
export const LARANJA = "#FF6B2C";
export const TINTA = "#0B1026";
export const BK = { verm: "#D62300", lar: "#FF8732", marrom: "#502314", creme: "#F5EBDC", azul: "#1E57C8" };
export const MC = { verm: "#DA291C", amar: "#FFC72C" };

const c01 = (x: number) => Math.min(1, Math.max(0, x));
export const fonteTit = (d: Dir) => (d === "C" ? PIXEL : TITULO);

export const useMola = (t0: number, cfg = { damping: 12, stiffness: 170, mass: 0.7 }) => {
  const { frame, fps } = useT();
  return spring({ frame: frame - t0 * fps, fps, config: cfg });
};

// ----------------------------------------------------------------- ícones
const LogoBK: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill={BK.creme} />
    <path d="M12 44 Q12 14 50 14 Q88 14 88 44 Z" fill={BK.lar} />
    <path d="M14 62 Q14 84 40 85 L60 85 Q86 84 86 62 Z" fill={BK.lar} />
    <text x="50" y="59" textAnchor="middle" fontFamily={TITULO} fontSize="21" fill={BK.verm}>
      BURGER
    </text>
    <text x="50" y="76" textAnchor="middle" fontFamily={TITULO} fontSize="17" fill={BK.verm} opacity={0}>
      KING
    </text>
  </svg>
);
const LogoM: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    <rect x="2" y="2" width="96" height="96" rx="22" fill={MC.verm} />
    <path d="M16 78 C16 10 47 10 48 56 M84 78 C84 10 53 10 52 56" stroke={MC.amar} strokeWidth="13" fill="none" />
  </svg>
);
export const Logo: React.FC<{ m: "bk" | "mc"; s?: number }> = ({ m, s = 60 }) => (m === "bk" ? <LogoBK s={s} /> : <LogoM s={s} />);

export const Icone: React.FC<{ nome: string; s?: number }> = ({ nome, s = 44 }) => {
  const p = { fill: "none", stroke: "#fff", strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const g: Record<string, React.ReactNode> = {
    pin: (
      <g {...p}>
        <path d="M14 25s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z" />
        <circle cx="14" cy="12" r="2.6" />
      </g>
    ),
    jornal: (
      <g {...p}>
        <rect x="4" y="5" width="20" height="18" rx="2" />
        <path d="M8 10h12M8 14h12M8 18h7" />
      </g>
    ),
    estrada: (
      <g {...p}>
        <path d="M9 24L12 4M19 24L16 4M14 7v3M14 14v3M14 21v2" />
      </g>
    ),
  };
  return (
    <div style={{ width: s, height: s, borderRadius: s, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={s * 0.66} height={s * 0.66} viewBox="0 0 28 28">
        {g[nome] ?? g.pin}
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------- selo
export const Selo: React.FC<{ texto: string; t0: number; t1: number; y?: number; icone?: string; dir: Dir }> = ({ texto, t0, t1, y = 452, icone = "pin", dir }) => {
  const { t } = useT();
  const m = useMola(t0);
  if (t < t0 || t > t1 + 0.3) return null;
  const sai = c01((t1 + 0.25 - t) / 0.25);
  const C = dir === "C";
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: sai }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 26px 10px 12px",
          borderRadius: C ? 0 : 60,
          background: "rgba(255,255,255,0.96)",
          boxShadow: C ? "6px 6px 0 #140a14" : dir === "B" ? "0 0 0 5px #1a0f0c, 0 8px 0 #1a0f0c" : "0 10px 30px rgba(0,0,0,0.35)",
          transform: `scale(${0.6 + 0.4 * m}) translateY(${(1 - m) * -20}px)`,
        }}
      >
        <Icone nome={icone} s={46} />
        <span style={{ fontFamily: C ? PIXEL : FONTE, fontWeight: 700, fontSize: C ? 30 : 42, color: "#14110f", letterSpacing: C ? 0 : -0.5 }}>{texto}</span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- HUD de luta
export type HudEstado = { bk: number; mc: number; round: number; placar: [number, number]; tremeBk?: number; tremeMc?: number; pisca?: number };
const Barra: React.FC<{ v: number; lado: "e" | "d"; dir: Dir; treme: number; cor: string; cor2: string }> = ({ v, lado, dir, treme, cor, cor2 }) => {
  const { t } = useT();
  const W = 380, H = dir === "C" ? 40 : 44;
  const dx = Math.sin(t * 90) * treme * 10;
  const C = dir === "C", B = dir === "B";
  const fill = Math.max(0, Math.min(1, v));
  return (
    <div style={{ position: "relative", width: W, height: H, transform: `translateX(${dx}px) skewX(${lado === "e" ? -14 : 14}deg)` }}>
      <div style={{ position: "absolute", inset: 0, background: C ? "#2a1430" : "rgba(10,8,20,0.75)", border: C ? "4px solid #fff" : B ? "5px solid #1a0f0c" : "3px solid rgba(255,255,255,0.9)", borderRadius: C ? 0 : 6, boxShadow: B ? "0 6px 0 #1a0f0c" : C ? "4px 4px 0 #140a14" : "0 6px 18px rgba(0,0,0,0.45)" }} />
      {/* rastro do dano */}
      <div style={{ position: "absolute", top: C ? 4 : 5, bottom: C ? 4 : 5, [lado === "e" ? "right" : "left"]: C ? 4 : 5, width: `calc(${Math.min(1, fill + treme * 0.25) * 100}% - 10px)`, background: "#ffffff", opacity: 0.85 }} />
      <div
        style={{
          position: "absolute",
          top: C ? 4 : 5,
          bottom: C ? 4 : 5,
          [lado === "e" ? "right" : "left"]: C ? 4 : 5,
          width: `calc(${fill * 100}% - 10px)`,
          background: C ? cor : `linear-gradient(180deg, ${cor2} 0%, ${cor} 55%, ${cor} 100%)`,
          borderRadius: C ? 0 : 3,
        }}
      />
      {!C && <div style={{ position: "absolute", left: 8, right: 8, top: 7, height: 8, background: "rgba(255,255,255,0.35)", borderRadius: 4 }} />}
    </div>
  );
};

export const Hud: React.FC<{ h: HudEstado; dir: Dir; ent?: number }> = ({ h, dir, ent = 1 }) => {
  const { t } = useT();
  const C = dir === "C", B = dir === "B";
  const piscar = h.pisca ? (Math.floor(t * 6) % 2 === 0 ? 1 : 0.35) : 1;
  const nome = (s: string, al: "left" | "right") => (
    <div style={{ fontFamily: C ? PIXEL : TITULO, fontSize: C ? 24 : 34, color: "#fff", textAlign: al, textShadow: C ? "3px 3px 0 #140a14" : B ? "0 4px 0 #1a0f0c, 3px 0 0 #1a0f0c, -3px 0 0 #1a0f0c, 0 -3px 0 #1a0f0c" : "0 3px 10px rgba(0,0,0,0.6)", marginTop: 8 }}>{s}</div>
  );
  return (
    <div style={{ position: "absolute", top: 262, left: 0, right: 0, height: 200, opacity: ent, transform: `translateY(${(1 - ent) * -60}px)` }}>
      <div style={{ position: "absolute", left: 34, top: 12, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo m="bk" s={62} />
          <Barra v={h.bk} lado="e" dir={dir} treme={h.tremeBk ?? 0} cor={BK.lar} cor2="#ffd27a" />
        </div>
        {nome("BURGER KING", "left")}
      </div>
      <div style={{ position: "absolute", right: 34, top: 12, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Barra v={h.mc} lado="d" dir={dir} treme={h.tremeMc ?? 0} cor={MC.amar} cor2="#fff1a8" />
          <Logo m="mc" s={62} />
        </div>
        {nome("MÉQUI", "right")}
      </div>
      {/* medalhão central: rodada e placar */}
      <div style={{ position: "absolute", left: 540 - 62, top: 0, width: 124, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: C ? 0 : 60,
            background: C ? "#140a14" : `conic-gradient(${BK.lar} 0 50%, ${MC.amar} 50% 100%)`,
            border: C ? "4px solid #fff" : B ? "6px solid #1a0f0c" : "4px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: B ? "0 6px 0 #1a0f0c" : "0 6px 20px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ width: C ? 92 : 78, height: C ? 92 : 78, borderRadius: C ? 0 : 50, background: TINTA, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ fontFamily: C ? PIXEL : FONTE, fontWeight: 700, fontSize: C ? 13 : 16, color: "#ffffffaa", letterSpacing: 1 }}>ROUND</div>
            <div style={{ fontFamily: C ? PIXEL : TITULO, fontSize: C ? 34 : 44, color: "#fff", lineHeight: 1 }}>{h.round}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, opacity: piscar, fontFamily: C ? PIXEL : TITULO, fontSize: C ? 26 : 38, color: "#fff", whiteSpace: "nowrap", textShadow: C ? "3px 3px 0 #140a14" : B ? "0 4px 0 #1a0f0c, 3px 0 0 #1a0f0c, -3px 0 0 #1a0f0c" : "0 3px 10px rgba(0,0,0,0.6)" }}>
          <span style={{ color: BK.lar }}>{h.placar[0]}</span>
          <span style={{ margin: "0 10px" }}>×</span>
          <span style={{ color: MC.amar }}>{h.placar[1]}</span>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- gancho: VS + título
export const Gancho: React.FC<{ dir: Dir }> = ({ dir }) => {
  const { t } = useT();
  const C = dir === "C", B = dir === "B";
  const vs = useMola(-0.12, { damping: 9, stiffness: 220, mass: 0.6 });
  const l1 = useMola(-0.2);
  const l2 = useMola(-0.15);
  const pulso = 1 + Math.max(0, Math.sin(t * 3.2)) * 0.04;
  const contorno = C ? "5px 5px 0 #140a14" : B ? "0 7px 0 #1a0f0c, 5px 0 0 #1a0f0c, -5px 0 0 #1a0f0c, 0 -5px 0 #1a0f0c, 4px 4px 0 #1a0f0c, -4px 4px 0 #1a0f0c" : "0 6px 24px rgba(0,0,0,0.55), 0 2px 0 rgba(0,0,0,0.4)";
  const f = fonteTit(dir);
  return (
    <>
      <div style={{ position: "absolute", top: 282, left: 0, right: 0, textAlign: "center", fontFamily: f }}>
        <div style={{ fontSize: C ? 70 : 118, lineHeight: 1.05, color: "#fff", textShadow: contorno, transform: `translateX(${(1 - l1) * -700}px)`, letterSpacing: C ? 2 : 1 }}>
          <span style={{ color: C ? BK.lar : "#fff" }}>BURGER KING</span>
        </div>
        <div style={{ fontSize: C ? 58 : 96, lineHeight: 1.12, color: "#fff", textShadow: contorno, transform: `translateX(${(1 - l2) * 700}px)`, marginTop: C ? 18 : 2 }}>
          <span style={{ color: LARANJA }}>VS </span>
          <span style={{ color: C ? MC.amar : "#fff" }}>MCDONALD'S</span>
        </div>
      </div>
      {/* VS batendo no meio */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: f,
            fontSize: C ? 150 : 230,
            color: LARANJA,
            transform: `scale(${(2.6 - 1.6 * vs) * pulso}) rotate(${-8 + (1 - vs) * 20}deg)`,
            opacity: c01(vs * 3),
            textShadow: C ? "8px 8px 0 #140a14" : B ? "0 10px 0 #1a0f0c, 7px 0 0 #1a0f0c, -7px 0 0 #1a0f0c, 0 -7px 0 #1a0f0c, 6px 6px 0 #1a0f0c, -6px 6px 0 #1a0f0c" : "0 0 40px rgba(255,107,44,0.7), 0 10px 30px rgba(0,0,0,0.6)",
            WebkitTextStroke: B || C ? undefined : "4px #fff",
          }}
        >
          VS
        </div>
      </div>
      {/* placas de jogador */}
      {(["P1 · O REI", "P2 · RONALD"] as const).map((s, i) => (
        <div key={s} style={{ position: "absolute", top: 1438, [i === 0 ? "left" : "right"]: 70, padding: C ? "10px 16px" : "10px 22px", background: i === 0 ? BK.verm : MC.verm, color: "#fff", fontFamily: C ? PIXEL : FONTE, fontWeight: 700, fontSize: C ? 22 : 34, borderRadius: C ? 0 : 12, border: B ? "5px solid #1a0f0c" : C ? "4px solid #fff" : "none", boxShadow: B ? "0 6px 0 #1a0f0c" : C ? "4px 4px 0 #140a14" : "0 8px 24px rgba(0,0,0,0.4)" }}>
          {s}
        </div>
      ))}
    </>
  );
};

// ----------------------------------------------------------------- legenda
export const Legenda: React.FC<{ linhas: React.ReactNode[]; dir: Dir; top?: number }> = ({ linhas, dir, top = 1150 }) => {
  const C = dir === "C";
  return (
    <div style={{ position: "absolute", top, left: 50, right: 50, textAlign: "center" }}>
      {linhas.map((l, i) => (
        <div key={i} style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 88, lineHeight: 1.08, color: "#fff", letterSpacing: -1.5, textShadow: C ? "6px 6px 0 #140a14" : "0 5px 0 rgba(0,0,0,0.55), 0 0 26px rgba(0,0,0,0.65)", WebkitTextStroke: dir === "B" ? "3px #1a0f0c" : undefined, paintOrder: "stroke fill" }}>
          {l}
        </div>
      ))}
    </div>
  );
};
export const Lar: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: LARANJA }}>{children}</span>;

// ----------------------------------------------------------------- tela de marcação
export const Marcacao: React.FC<{ dir: Dir; tBk: number; tMc: number; tIni: number; popBk: number; popMc: number }> = ({ dir, tBk, tMc, tIni, popBk: tpBk, popMc: tpMc }) => {
  const { t } = useT();
  const C = dir === "C", B = dir === "B";
  const ent = useMola(tIni);
  const digita = (s: string, t0: number) => s.slice(0, Math.max(0, Math.min(s.length, Math.floor((t - t0) / 0.045))));
  const bkTxt = digita("@burgerkingbr", tBk);
  const mcTxt = digita("@mcdonalds_br", tMc);
  const atual = t >= tMc ? mcTxt : bkTxt;
  const popBk = useMola(tpBk, { damping: 9, stiffness: 240, mass: 0.5 });
  const popMc = useMola(tpMc, { damping: 9, stiffness: 240, mass: 0.5 });
  const conta = (t0: number, alvo: number) => Math.floor(alvo * (1 - Math.exp(-Math.max(0, t - t0) * 0.9)));
  const vBk = conta(tIni, 9800) + Math.floor(Math.max(0, t - tIni) * 37);
  const vMc = conta(tIni, 9750) + Math.floor(Math.max(0, t - tIni) * 39);
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const caixa = (lado: "e" | "d", txt: string, v: number, pop: number, cor: string, m: "bk" | "mc") => (
    <div style={{ position: "absolute", top: 600, [lado === "e" ? "left" : "right"]: 40, width: 470, display: "flex", flexDirection: "column", alignItems: lado === "e" ? "flex-start" : "flex-end", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(10,8,20,0.82)", padding: "10px 18px 10px 10px", borderRadius: C ? 0 : 40, border: B ? "5px solid #1a0f0c" : C ? "4px solid #fff" : "2px solid rgba(255,255,255,0.4)" }}>
        <Logo m={m} s={54} />
        <span style={{ fontFamily: C ? PIXEL : TITULO, fontSize: C ? 30 : 44, color: cor }}>{fmt(v)}</span>
      </div>
      {pop > 0.01 && (
        <div style={{ transform: `scale(${pop})`, transformOrigin: lado === "e" ? "left center" : "right center", background: "#fff", color: "#111", fontFamily: FONTE, fontWeight: 700, fontSize: 40, padding: "10px 20px", borderRadius: C ? 0 : 22, boxShadow: B ? "0 0 0 5px #1a0f0c, 0 7px 0 #1a0f0c" : C ? "5px 5px 0 #140a14" : "0 10px 26px rgba(0,0,0,0.4)" }}>
          {txt}
        </div>
      )}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: ent }}>
      {caixa("e", "@burgerkingbr", vBk, popBk, BK.lar, "bk")}
      {caixa("d", "@mcdonalds_br", vMc, popMc, MC.amar, "mc")}
      {/* campo de comentário */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 1352, height: 116, borderRadius: C ? 0 : 60, background: "#ffffff", display: "flex", alignItems: "center", padding: "0 18px", gap: 18, boxShadow: B ? "0 0 0 6px #1a0f0c, 0 9px 0 #1a0f0c" : C ? "6px 6px 0 #140a14" : "0 14px 40px rgba(0,0,0,0.45)", transform: `translateY(${(1 - ent) * 200}px)` }}>
        <div style={{ width: 78, height: 78, borderRadius: 50, background: `linear-gradient(135deg, ${LARANJA}, #ffb36b)`, flexShrink: 0 }} />
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 46, color: atual ? "#1b6cf2" : "#9a9aa2", flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>
          {atual || "Adicione um comentário…"}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: "#111" }}>|</span>
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#1b6cf2" }}>Publicar</div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- virada IA: voz que vira rosto de linhas
export const VozRosto: React.FC<{ m: number; t0: number }> = ({ m, t0 }) => {
  const { t } = useT();
  const N = 90;
  // perfil de rosto (de lado), em coordenadas 0..1
  const perfil = (u: number) => {
    const P: [number, number][] = [
      [0.0, 0.62], [0.12, 0.62], [0.2, 0.6], [0.26, 0.52], [0.3, 0.4], [0.34, 0.3], [0.4, 0.22], [0.48, 0.18], [0.56, 0.2], [0.6, 0.28],
      [0.58, 0.36], [0.64, 0.42], [0.6, 0.46], [0.62, 0.5], [0.58, 0.54], [0.6, 0.6], [0.54, 0.68], [0.46, 0.7], [0.4, 0.8], [0.4, 0.9], [1.0, 0.9],
    ];
    const x = u * (P.length - 1);
    const i = Math.min(P.length - 2, Math.floor(x));
    const f = x - i;
    return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
  };
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const onda = 0.55 + Math.sin(u * 40 + t * 18) * 0.08 * Math.sin(u * Math.PI) * (0.6 + 0.4 * Math.sin(t * 7 + u * 9));
    const [px, py] = perfil(u);
    const x = (1 - m) * u + m * (0.18 + px * 0.66);
    const y = (1 - m) * onda + m * py;
    pts.push(`${(x * 900).toFixed(1)},${(y * 700).toFixed(1)}`);
  }
  const vis = c01((t - t0) / 0.3);
  return (
    <svg width={900} height={700} style={{ position: "absolute", left: 90, top: 420, opacity: vis, filter: "drop-shadow(0 0 14px rgba(255,107,44,0.9))" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={LARANJA} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      {m > 0.6 && <circle cx={(0.18 + 0.47 * 0.66) * 900} cy={0.3 * 700} r={10 * (m - 0.6) * 2.5} fill={LARANJA} />}
    </svg>
  );
};
