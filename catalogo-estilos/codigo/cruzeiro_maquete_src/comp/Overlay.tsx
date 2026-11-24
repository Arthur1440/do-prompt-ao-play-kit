import React from "react";
import fala from "../fala.json";
import { F } from "./fontes";
import { useT } from "./tempo";
import type { Dir } from "../three/kit";
import { clamp, easeOut, quique, lerp } from "../three/rng";

export const LARANJA = "#FF6B2C";
export const AZUL = "#1D4FC4";
export const TINTA = "#0B1026";
const W = fala.palavras as { w: string; s: number; e: number }[];

// --------------------------------------------------------------------------
// Legenda: blocos curtos presos às palavras da fala. Texto corrigido (grafia do roteiro, números em algarismos).
export const BLOCOS: [number, number, string][] = [
  [11, 13, "Nos anos 40,"],
  [14, 16, "o cartunista Mangabeira"],
  [17, 19, "desenhou os mascotes"],
  [20, 24, "dos times de Belo Horizonte"],
  [25, 30, "para o jornal Folha de Minas."],
  [31, 36, "A do Cruzeiro foi uma homenagem"],
  [37, 40, "ao presidente do clube,"],
  [41, 42, "Mário Grosso,"],
  [43, 46, "famoso por fechar contratações"],
  [47, 49, "antes dos rivais."],
  [50, 54, "A esperteza dele virou mascote."],
  [55, 59, "Só que pouco antes disso,"],
  [60, 65, "o Cruzeiro nem se chamava Cruzeiro."],
  [66, 67, "Em 1921,"],
  [68, 70, "a colônia italiana"],
  [71, 74, "fundou em Belo Horizonte"],
  [75, 77, "o Palestra Itália,"],
  [78, 80, "de camisa verde."],
  [81, 83, "Na Segunda Guerra,"],
  [84, 87, "nomes ligados aos países"],
  [88, 91, "do Eixo foram proibidos."],
  [92, 94, "E em 1942,"],
  [95, 98, "o Palestra virou Cruzeiro."],
  [99, 103, "O nome veio da constelação"],
  [104, 107, "do Cruzeiro do Sul."],
  [108, 112, "O verde virou azul celeste,"],
  [113, 116, "e as 5 estrelas"],
  [117, 120, "foram para o peito."],
  [121, 126, "E a raposa só ganhou corpo"],
  [127, 128, "em 2003."],
  [129, 131, "O Raposão estreou"],
  [132, 137, "numa goleada de 4 × 0,"],
  [138, 142, "no ano da Tríplice Coroa."],
  [143, 145, "Eu sou cruzeirense."],
  [146, 149, "Agora marca aquele amigo"],
  [150, 156, "que torce para o maior de Minas"],
  [157, 161, "e não conhecia essa história."],
  [162, 168, "Esse vídeo foi feito com IA,"],
  [169, 172, "até a minha voz."],
  [173, 178, "Quer aprender a fazer vídeos assim,"],
  [179, 183, "do seu time do coração?"],
  [184, 185, "Comenta PLAY"],
  [186, 191, "que eu te mando o link"],
  [192, 195, "do grupo de lançamento"],
  [196, 198, "do meu curso,"],
  [199, 202, "Do Prompt ao Play."],
];

const destaque = (p: string) => /\d|×|^IA|^PLAY/.test(p);

export const Legenda: React.FC<{ dir: Dir; esconde?: (t: number) => boolean; y?: number }> = ({ dir, esconde, y = 1290 }) => {
  const { t } = useT();
  if (esconde?.(t)) return null;
  const idx = BLOCOS.findIndex(([a, b], i) => {
    const s = W[a].s - 0.08;
    const prox = BLOCOS[i + 1];
    const e = prox ? Math.min(W[b].e + 0.5, W[prox[0]].s - 0.08) : W[b].e + 0.6;
    return t >= s && t < e;
  });
  if (idx < 0) return null;
  const [a, , texto] = BLOCOS[idx];
  const k = easeOut(clamp((t - (W[a].s - 0.08)) / 0.14));
  const C = dir === "C";
  const palavras = texto.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: y,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 22,
        rowGap: 0,
        transform: `translateY(${(1 - k) * 18}px) scale(${lerp(0.94, 1, k)})`,
        opacity: k,
      }}
    >
      {palavras.map((p, i) => (
        <span
          key={i}
          style={{
            fontFamily: F.sg,
            fontWeight: 700,
            fontSize: 84,
            lineHeight: 1.12,
            letterSpacing: -1,
            color: destaque(p) ? LARANJA : C ? "#17120e" : "#ffffff",
            textShadow: C
              ? "0 0 2px #f2ead8, 0 0 10px #f2ead8, 0 0 18px #f2ead8, 0 0 26px #f2ead8"
              : "0 4px 0 rgba(0,0,0,0.55), 0 0 18px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.9)",
            WebkitTextStroke: C ? undefined : "2px rgba(0,0,0,0.35)",
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
};

// --------------------------------------------------------------------------
// Texto do gancho: 2 faixas (azul e branca), presentes desde o quadro 0
export const Gancho: React.FC<{ dir: Dir; t0?: number; t1?: number }> = ({ dir, t0 = 0, t1 = 3.3 }) => {
  const { t } = useT();
  if (t < t0 || t > t1) return null;
  const sai = clamp((t - (t1 - 0.2)) / 0.2);
  const C = dir === "C";
  const faixa = (txt: React.ReactNode, fundo: string, cor: string, rot: number, d: number) => {
    const k = t0 === 0 ? 1 : easeOut(clamp((t - t0 - d) / 0.25));
    return (
      <div
        style={{
          alignSelf: "center",
          background: fundo,
          color: cor,
          fontFamily: C ? F.jornal : F.sg,
          fontWeight: C ? 900 : 700,
          fontSize: C ? 74 : 86,
          lineHeight: 1,
          letterSpacing: C ? 0 : -2,
          padding: C ? "14px 26px 18px" : "16px 30px 20px",
          borderRadius: C ? 4 : 18,
          transform: `rotate(${rot}deg) scale(${k}) translateX(${sai * (rot > 0 ? 1200 : -1200)}px)`,
          boxShadow: C ? "6px 6px 0 #17120e" : "0 10px 0 rgba(0,0,0,0.28), 0 18px 40px rgba(0,0,0,0.35)",
          border: C ? "5px solid #17120e" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        {txt}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 18 }}>
      {faixa("O QUE O CRUZEIRO TEM", C ? "#f2ead8" : AZUL, C ? "#17120e" : "#ffffff", -2.5, 0)}
      {faixa(
        <>
          A VER COM <span style={{ color: C ? AZUL : AZUL }}>RAPOSA?</span>
        </>,
        C ? "#f2ead8" : "#ffffff",
        C ? "#17120e" : "#0d1d45",
        2,
        0.08,
      )}
    </div>
  );
};

// --------------------------------------------------------------------------
// Plaquinha do ano: placa esmaltada azul (como as placas de rua de BH) que bate e quica
export const Ano: React.FC<{ dir: Dir; texto: string; t0: number; t1: number; top?: number }> = ({ dir, texto, t0, t1, top = 285 }) => {
  const { t } = useT();
  if (t < t0 - 0.05 || t > t1) return null;
  const q = quique(clamp((t - t0) / 0.5));
  const sai = clamp((t - (t1 - 0.18)) / 0.18);
  const C = dir === "C";
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${Math.max(0, q) * (1 - sai)}) rotate(${(1 - clamp((t - t0) / 0.5)) * -8 - 2}deg)`,
          background: C ? "#f2ead8" : AZUL,
          color: C ? "#17120e" : "#ffffff",
          fontFamily: C ? F.jornal : F.sg,
          fontWeight: C ? 900 : 700,
          fontSize: 150,
          lineHeight: 1,
          letterSpacing: C ? 2 : -4,
          padding: "22px 54px 28px",
          borderRadius: C ? 6 : 28,
          border: C ? "8px double #17120e" : "8px solid #ffffff",
          outline: C ? undefined : `6px solid ${AZUL}`,
          boxShadow: C ? "10px 10px 0 #17120e" : "0 14px 0 rgba(0,0,0,0.3), 0 24px 50px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        {texto}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Selo: etiqueta arredondada com ícone laranja
export const Selo: React.FC<{ dir: Dir; texto: string; t0: number; t1: number; x: number; y: number; icone?: string }> = ({ dir, texto, t0, t1, x, y, icone = "★" }) => {
  const { t } = useT();
  if (t < t0 || t > t1) return null;
  const k = easeOut(clamp((t - t0) / 0.22));
  const sai = clamp((t - (t1 - 0.15)) / 0.15);
  const C = dir === "C";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 26px 12px 12px",
        borderRadius: 999,
        background: C ? "#f2ead8" : "rgba(255,255,255,0.96)",
        border: C ? "3px solid #17120e" : undefined,
        boxShadow: C ? "4px 4px 0 #17120e" : "0 8px 24px rgba(0,0,0,0.35)",
        transform: `scale(${k * (1 - sai)})`,
        transformOrigin: "left center",
        fontFamily: F.sg,
        fontWeight: 700,
        fontSize: 40,
        color: "#0d1d45",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 52, height: 52, borderRadius: 999, background: LARANJA, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{icone}</span>
      {texto}
    </div>
  );
};

// --------------------------------------------------------------------------
// Virada: a onda da voz vira um rosto de linhas (perfil) + "Esse vídeo foi feito com IA"
const PERFIL: [number, number][] = [
  [0.3, 0.0], [0.37, 0.05], [0.415, 0.13], [0.43, 0.22], [0.43, 0.29], [0.465, 0.35], [0.53, 0.43], [0.535, 0.455], [0.49, 0.47],
  [0.475, 0.5], [0.5, 0.53], [0.475, 0.555], [0.495, 0.585], [0.47, 0.615], [0.455, 0.66], [0.43, 0.7], [0.37, 0.73], [0.33, 0.78], [0.32, 0.9], [0.33, 1.0],
];
const perfilX = (y: number) => {
  for (let i = 0; i < PERFIL.length - 1; i++) {
    const [x0, y0] = PERFIL[i], [x1, y1] = PERFIL[i + 1];
    if (y >= y0 && y <= y1) return lerp(x0, x1, (y - y0) / (y1 - y0 + 1e-6));
  }
  return 0.3;
};
export const Virada: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const { t } = useT();
  if (t < t0 || t > t1) return null;
  // m: 0 = uma onda só (a voz) .. 1 = as linhas abrem e desenham um perfil de rosto
  const m = easeOut(clamp((t - t0 - 0.25) / 1.1));
  const linhas = 34;
  const x0 = 70, x1 = 1010, y0 = 1090, y1 = 1540;
  const dentro: string[] = [], fora: string[] = [];
  for (let k = 0; k < linhas; k++) {
    const v = k / (linhas - 1);
    const yb = lerp(1340, lerp(y0, y1, v), m);
    // rosto de perfil olhando para a esquerda, do lado direito do quadro
    const bx = lerp(x1 + 40, 1060 - perfilX(v) * 760, m);
    let d1 = "", d2 = "";
    for (let i = 0; i <= 140; i++) {
      const u = i / 140;
      const x = lerp(x0, x1, u);
      const env = Math.sin(Math.PI * u) ** 0.6;
      const amp = (Math.sin(u * 46 + t * 11 + k * 0.9) * 0.55 + Math.sin(u * 17 - t * 6 + k * 0.4) * 0.45) * 26 * env;
      const y = yb + amp * (x >= bx ? 1 : lerp(1, 0.12, m));
      const seg = `${x.toFixed(1)},${y.toFixed(1)} `;
      if (x >= bx) d1 += (d1 ? "L" : "M") + seg;
      else d2 += (d2 ? "L" : "M") + seg;
    }
    dentro.push(d1);
    fora.push(d2);
  }
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {fora.map((d, k) => (d ? <path key={"f" + k} d={d} fill="none" stroke={LARANJA} strokeWidth={2} strokeOpacity={0.16 + 0.5 * (1 - m)} /> : null))}
        {dentro.map((d, k) => (d ? <path key={"d" + k} d={d} fill="none" stroke={LARANJA} strokeWidth={3} strokeOpacity={0.95} /> : null))}
        <path
          d={Array.from({ length: 61 }, (_, i) => {
            const v = i / 60;
            return `${i ? "L" : "M"}${(1060 - perfilX(v) * 760).toFixed(1)},${lerp(y0, y1, v).toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="#ffd2b8"
          strokeWidth={5}
          strokeLinecap="round"
          strokeOpacity={m}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - m}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: F.sg,
          fontWeight: 700,
          fontSize: 100,
          lineHeight: 1.05,
          letterSpacing: -3,
          color: "#ffffff",
          opacity: easeOut(clamp((t - t0) / 0.3)),
        }}
      >
        Esse vídeo foi
        <br />
        feito com <span style={{ color: LARANJA }}>IA</span>
      </div>
    </div>
  );
};
