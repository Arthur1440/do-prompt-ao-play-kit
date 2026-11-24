import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE, MONO } from "./comp/fontes";
import { COR, HUD, Pergunta, Selo, Contador } from "./comp/Overlay";
import { A, B, c01, CORTE_ENVIO, eio, eo, estadoEm, FPS, k01, LOOP_A, M, relogio, ULTIMO } from "./linha";
import { PALAVRAS } from "./fala";

const LAR = COR.laranja;
const SOMBRA = "0 4px 18px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.6)";
const mola = (x: number) => { const t = c01(x); return t <= 0 ? 0 : 1 - Math.exp(-t * 7) * Math.cos(t * 9); };
const vis = (t: number, a: number, b: number, fi = 0.2, fo = 0.15) => Math.min(k01(t, a, a + fi), 1 - k01(t, b - fo, b));
const vidro: React.CSSProperties = { background: "rgba(11,16,38,0.78)", border: "2px solid rgba(255,255,255,0.18)", borderRadius: 22, boxShadow: "0 18px 50px rgba(0,0,0,0.5)" };

// ------------------------------------------------------------------ HUD do relógio
const Relogio: React.FC<{ t: number }> = ({ t }) => {
  if (t < M.meia) {
    // contagem: parada em 0:03.000 até a voz dizer "três"; depois conta junto com a voz até o zero (disjuntor)
    const s = t < M.tres ? 3 : Math.max(0, 3 - (t - M.tres) / (M.dois - M.tres));
    return <HUD h={{ modo: "contagem", s, vivo: t * 1.6 }} />;
  }
  if (t >= M.eVoce - 0.25) return null;
  const r = relogio(t);
  const h = Math.floor(r.h + 1e-6);
  const m = Math.floor((r.h - h) * 60 + 1e-6);
  const o = 1 - k01(t, M.eVoce - 0.5, M.eVoce - 0.25);
  return (
    <div style={{ opacity: o }}>
      <HUD h={{ modo: "hora", h, m, verm: t < M.h72 ? 1 : 0, pulo: r.pulo }} />
    </div>
  );
};

// ------------------------------------------------------------------ legenda (no máximo 2 linhas; topo nunca abaixo de y=1330)
const CHUNKS: [number, number][] = [
  [9, 11], [12, 14], [15, 15], [16, 22], [23, 25], [26, 31], [32, 33], [34, 40], [41, 47], [48, 49], [50, 53], [54, 57], [58, 62], [63, 68], [69, 73],
  [74, 75], [76, 78], [79, 83], [84, 88], [89, 91], [92, 95], [96, 102], [103, 109], [110, 115], [116, 118], [119, 122], [123, 129],
  [130, 131], [132, 138], [139, 143], [144, 145], [146, 151], [152, 157], [158, 163], [164, 165], [166, 168], [169, 173], [174, 178],
  [179, 180], [181, 184], [185, 188], [189, 190], [191, 194], [195, 199], [200, 201], [202, 203], [204, 206], [207, 209], [210, 213], [214, 216],
  [217, 218], [219, 223], [224, 226], [227, 230], [237, 240],
];
const PEDACOS = CHUNKS.map(([i, j], n) => {
  const nx = CHUNKS[n + 1];
  const a = A(i) - 0.06;
  const b = Math.min(B(j) + 0.45, nx ? A(nx[0]) - 0.06 : 1e9);
  return { a, b, ws: PALAVRAS.slice(i, j + 1).map((w) => ({ s: w.w, a: w.a })) };
});
const LARANJAS = /\d|^IA$|^PLAY$/;
const Legenda: React.FC<{ t: number }> = ({ t }) => {
  const p = PEDACOS.find((x) => t >= x.a && t < x.b);
  if (!p) return null;
  const ent = eo(k01(t, p.a, p.a + 0.14));
  const txt = p.ws.map((w) => w.s).join(" ");
  const tam = txt.length > 30 ? 80 : 88;
  return (
    <div style={{ position: "absolute", left: 56, right: 56, bottom: 1920 - 1330, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: tam, lineHeight: 1.05, textAlign: "center", letterSpacing: -1, transform: `translateY(${(1 - ent) * 12}px)`, opacity: 0.5 + 0.5 * ent }}>
        {p.ws.map((w, i) => {
          const s = w.s;
          const limpo = s.replace(/[.,:?!…]+$/g, "");
          const cor = LARANJAS.test(limpo) ? LAR : "#fff";
          return (
            <span key={i} style={{ color: cor, opacity: t >= w.a - 0.04 ? 1 : 0.4, textShadow: "0 3px 0 #000, 0 0 18px rgba(0,0,0,0.9), 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000" }}>
              {s}
              {i < p.ws.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 04:00 — bateria da torre e "sem serviço"
const Bateria: React.FC<{ t: number }> = ({ t }) => {
  const a = M.h4 + 0.25, b = M.sem - 0.05;
  if (t < a || t >= b) return null;
  const nivel = 1 - eio(k01(t, M.gastam, B(57) - 0.1));
  const barras = Math.ceil(nivel * 4 - 0.001);
  const cor = barras >= 3 ? "#3ddc84" : barras === 2 ? COR.amarelo : COR.verm;
  const pisca = barras === 0 ? (Math.floor(t * 4) % 2 ? 0.35 : 1) : 1;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: vis(t, a, b) }}>
      <div style={{ ...vidro, display: "flex", alignItems: "center", gap: 22, padding: "18px 30px" }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: "#cfd6ff" }}>BATERIA DA TORRE</span>
        <div style={{ position: "relative", width: 150, height: 66, border: `5px solid ${barras === 0 ? COR.verm : "#fff"}`, borderRadius: 12, padding: 6, display: "flex", gap: 6, opacity: pisca }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ flex: 1, borderRadius: 4, background: i < barras ? cor : "rgba(255,255,255,0.08)" }} />)}
          <div style={{ position: "absolute", right: -16, top: 16, width: 9, height: 24, borderRadius: 3, background: barras === 0 ? COR.verm : "#fff" }} />
        </div>
      </div>
    </div>
  );
};

const SemServico: React.FC<{ t: number }> = ({ t }) => {
  const a = M.sem - 0.05, b = M.h8 - 0.05;
  if (t < a || t >= b) return null;
  const e = mola(k01(t, a, a + 0.45));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: vis(t, a, b, 0.12) }}>
      <div style={{ ...vidro, display: "flex", alignItems: "center", gap: 20, padding: "18px 32px", transform: `scale(${0.85 + 0.15 * e})` }}>
        <svg width={64} height={52} viewBox="0 0 64 52">
          {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 15} y={40 - i * 12} width={11} height={12 + i * 12} rx={2} fill="rgba(255,255,255,0.25)" />)}
          <path d="M40 4 L60 24 M60 4 L40 24" stroke={COR.verm} strokeWidth={6} strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 3, color: "#fff" }}>SEM SERVIÇO</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 08:00 — maquininha: RECUSADO e o Pix girando sem sair
const QR = (() => {
  const c: [number, number][] = [];
  let s = 7;
  for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) {
    s = (s * 16807) % 2147483647;
    const canto = (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13);
    if (!canto && s % 2) c.push([i, j]);
  }
  return c;
})();
const Maquininha: React.FC<{ t: number }> = ({ t }) => {
  const a = M.h8 + 0.55, b = M.agora - 0.05;
  if (t < a || t >= b) return null;
  const ent = eo(k01(t, a, a + 0.4));
  const recusado = t >= M.naoPassa && t < M.pix - 0.08;
  const pix = t >= M.pix - 0.08;
  const semCon = t >= M.sai;
  // treme quando aparece e de novo no bipe de erro (vão depois de "passa")
  const tr = (t0: number) => (t >= t0 && t < t0 + 0.35 ? Math.sin((t - t0) * 70) * 12 * (1 - k01(t, t0, t0 + 0.35)) : 0);
  const treme = recusado ? tr(M.naoPassa) + tr(ERRO) : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "flex-end", paddingRight: 70, opacity: vis(t, a, b, 0.2, 0.12) }}>
      <div style={{ transform: `translateY(${(1 - ent) * 220}px) translateX(${treme}px) rotate(5deg)`, width: 400, height: 640, borderRadius: 46, background: "linear-gradient(160deg,#3a3f4b,#191c23)", boxShadow: "0 30px 70px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.15)", padding: 34, boxSizing: "border-box" }}>
        <div style={{ height: 300, borderRadius: 18, background: recusado ? "#2a0d0d" : "#0f1a14", border: "3px solid #0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: FONTE, color: "#fff", overflow: "hidden" }}>
          {!recusado && !pix && (
            <>
              <svg width={90} height={70} viewBox="0 0 90 70"><rect x={4} y={8} width={82} height={54} rx={8} fill="none" stroke="#cfe" strokeWidth={5} /><rect x={4} y={20} width={82} height={10} fill="#cfe" /></svg>
              <div style={{ fontSize: 30, fontWeight: 700, textAlign: "center", lineHeight: 1.1 }}>APROXIME<br />O CARTÃO</div>
            </>
          )}
          {recusado && (
            <>
              <svg width={90} height={90} viewBox="0 0 90 90"><circle cx={45} cy={45} r={38} fill="none" stroke={COR.verm} strokeWidth={8} /><path d="M28 28 L62 62 M62 28 L28 62" stroke={COR.verm} strokeWidth={9} strokeLinecap="round" /></svg>
              <div style={{ fontSize: 50, fontWeight: 700, color: COR.verm, letterSpacing: 2 }}>RECUSADO</div>
            </>
          )}
          {pix && (
            <>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4 }}>PIX</div>
              <div style={{ position: "relative", width: 150, height: 150, background: "#fff", borderRadius: 8, padding: 8, boxSizing: "border-box" }}>
                <svg width={134} height={134} viewBox="0 0 21 21" style={{ opacity: 0.35 }}>
                  {QR.map(([i, j]) => <rect key={`${i}-${j}`} x={i} y={j} width={1} height={1} fill="#111" />)}
                  {[[0, 0], [14, 0], [0, 14]].map(([x, y]) => <rect key={`${x}${y}`} x={x + 0.5} y={y + 0.5} width={6} height={6} fill="none" stroke="#111" strokeWidth={1} />)}
                </svg>
                <svg width={84} height={84} viewBox="0 0 84 84" style={{ position: "absolute", left: 33, top: 33, transform: `rotate(${t * 400}deg)` }}>
                  <circle cx={42} cy={42} r={32} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={10} />
                  <path d="M42 10 A32 32 0 0 1 74 42" fill="none" stroke={LAR} strokeWidth={10} strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, color: semCon ? COR.verm : "rgba(255,255,255,0.75)" }}>{semCon ? "SEM CONEXÃO" : "aguardando…"}</div>
            </>
          )}
        </div>
        <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: 52, borderRadius: 12, background: i === 9 ? "#c0392b" : i === 11 ? "#2e9e5b" : i === 10 ? "#e0b13a" : "#2b2f38", boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.35)" }} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ conta: selo do MME, contador 14/16, selo Amapá 2020
const Conta: React.FC<{ t: number }> = ({ t }) => {
  const sA = M.conta, sB = M.eLitro - 0.1;
  const cA = M.quatorze - 0.3, cB = M.eLitro - 0.1;
  const n = Math.round(14 * k01(t, M.quatorze - 0.25, M.quatorze + 0.45));
  return (
    <>
      {t >= sA && t < sB && <div style={{ transform: `translateY(${(1 - eo(k01(t, sA, sA + 0.3))) * -20}px)` }}><Selo y={300} op={vis(t, sA, sB)} /></div>}
      {t >= cA && t < cB && <Contador n={n} op={vis(t, cA, cB)} />}
    </>
  );
};
const SeloAmapa: React.FC<{ t: number }> = ({ t }) => {
  const a = M.amapa2 - 0.05, b = M.h48 - 0.1;
  if (t < a || t >= b) return null;
  const e = mola(k01(t, a, a + 0.4));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: vis(t, a, b, 0.1) }}>
      <div style={{ transform: `scale(${0.8 + 0.2 * e})`, fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: "#fff", background: "rgba(11,16,38,0.82)", border: `3px solid ${LAR}`, borderRadius: 14, padding: "12px 30px" }}>
        Amapá, <span style={{ color: LAR }}>2020</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ envio: o celular com a lanterna acesa recebe o vídeo
const Celular: React.FC<{ t: number }> = ({ t }) => {
  const a = M.manda - 0.02, b = CORTE_ENVIO;
  if (t < a || t >= b) return null;
  const ent = eo(k01(t, a, a + 0.35));
  const chega = mola(k01(t, A(121) - 0.05, A(121) + 0.45)); // "aquele"
  const digitando = t >= a + 0.15 && t < A(121) - 0.05;
  const notif = M.fimEnvio + 0.04;
  const vibra = t >= notif && t < notif + 0.3 ? Math.sin((t - notif) * 90) * 7 : 0;
  const reacao = mola(k01(t, notif, notif + 0.35));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* luz da lanterna espalhada no quarto */}
      <div style={{ position: "absolute", left: 140, top: -260, width: 800, height: 800, borderRadius: 999, background: "radial-gradient(circle, rgba(255,246,225,0.55), rgba(255,236,200,0.12) 45%, rgba(255,236,200,0) 70%)", opacity: ent }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 215, display: "flex", justifyContent: "center", transform: `translateY(${(1 - ent) * 500}px) translateX(${vibra}px) rotate(${-3 + vibra * 0.3}deg)` }}>
        <div style={{ width: 580, height: 900, borderRadius: 70, background: "#0b0d12", padding: 18, boxSizing: "border-box", boxShadow: "0 40px 90px rgba(0,0,0,0.75), 0 0 0 3px #2a2e38" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 54, overflow: "hidden", background: "#10141f", display: "flex", flexDirection: "column", fontFamily: FONTE }}>
            {/* barra do topo */}
            <div style={{ height: 120, background: "#1a2033", display: "flex", alignItems: "flex-end", padding: "0 26px 18px", gap: 18 }}>
              <svg width={30} height={30} viewBox="0 0 24 24"><path d="M15 4 L7 12 L15 20" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" /></svg>
              <div style={{ width: 60, height: 60, borderRadius: 99, background: "#3a4466", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={36} height={36} viewBox="0 0 24 24"><circle cx={12} cy={9} r={4.2} fill="#9aa6c8" /><path d="M3.5 21c1.4-4.2 5-6 8.5-6s7.1 1.8 8.5 6" fill="#9aa6c8" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>Família</div>
                <div style={{ fontSize: 22, color: digitando ? "#7fe0a8" : "rgba(255,255,255,0.55)" }}>{digitando ? "digitando…" : "online"}</div>
              </div>
            </div>
            {/* conversa */}
            <div style={{ flex: 1, padding: "26px 22px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 14 }}>
              {digitando && (
                <div style={{ alignSelf: "flex-start", background: "#232a3d", borderRadius: 26, padding: "18px 24px", display: "flex", gap: 10 }}>
                  {[0, 1, 2].map((i) => <div key={i} style={{ width: 14, height: 14, borderRadius: 9, background: "#c8d0ea", opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 12 - i * 1.2)) }} />)}
                </div>
              )}
              {chega > 0 && (
                <div style={{ position: "relative", alignSelf: "flex-start", width: 440, background: "#232a3d", borderRadius: 26, padding: 10, transform: `scale(${0.6 + 0.4 * chega})`, transformOrigin: "left bottom", opacity: c01(chega * 2) }}>
                  <div style={{ position: "relative", height: 440, borderRadius: 18, overflow: "hidden" }}>
                    <Img src={staticFile("miniatura.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", left: "50%", top: "50%", width: 96, height: 96, marginLeft: -48, marginTop: -48, borderRadius: 99, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width={44} height={44} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg>
                    </div>
                  </div>
                  <div style={{ padding: "14px 10px 6px", fontSize: 34, fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>
                    pra quem tá com medo do <span style={{ color: COR.amarelo }}>dia 17</span>
                  </div>
                  {reacao > 0 && (
                    <div style={{ position: "absolute", right: -16, bottom: -22, fontSize: 40, background: "#2d3550", borderRadius: 99, padding: "4px 12px", transform: `scale(${reacao})` }}>😱</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ votação: 🕯️ VELA × BOATO
const Vela: React.FC<{ acesa: number; t: number }> = ({ acesa, t }) => (
  <div style={{ position: "relative", width: 90, height: 230, margin: "0 auto" }}>
    {acesa > 0 && (
      <>
        <div style={{ position: "absolute", left: -110, top: -150, width: 310, height: 310, borderRadius: 999, background: "radial-gradient(circle, rgba(255,190,90,0.55), rgba(255,170,60,0) 65%)", opacity: acesa }} />
        <div style={{ position: "absolute", left: 27, top: -58, width: 36, height: 64, borderRadius: "50% 50% 45% 45% / 70% 70% 30% 30%", background: "radial-gradient(ellipse at 50% 75%, #fff8d8, #ffcf5a 45%, #ff8a1a 80%)", transform: `scale(${acesa * (1 + 0.06 * Math.sin(t * 23))}, ${acesa * (1 + 0.1 * Math.sin(t * 17 + 1))})`, transformOrigin: "50% 100%", boxShadow: "0 0 40px #ffb347" }} />
      </>
    )}
    <div style={{ position: "absolute", left: 43, top: 0, width: 4, height: 14, background: "#222" }} />
    <div style={{ position: "absolute", left: 10, top: 12, width: 70, height: 200, borderRadius: "10px 10px 6px 6px", background: "linear-gradient(90deg,#e9e2d0,#fffaf0 45%,#d9d0ba)" }} />
    <div style={{ position: "absolute", left: -10, top: 205, width: 110, height: 22, borderRadius: 99, background: "#8a6a3a" }} />
  </div>
);
const Votacao: React.FC<{ t: number }> = ({ t }) => {
  const a = M.eVoce - 0.05, b = M.esse - 0.05;
  if (t < a || t >= b) return null;
  const e1 = mola(k01(t, a, a + 0.45)), e2 = mola(k01(t, a + 0.12, a + 0.57));
  const velaOn = k01(t, FOSFORO + 0.08, FOSFORO + 0.35); // o fósforo acende no vão depois de "dia 17,"
  const luzV = Math.max(k01(t, M.vela - 0.05, M.vela + 0.2), velaOn) * (1 - 0.5 * k01(t, M.boato - 0.1, M.boato + 0.1));
  const luzB = k01(t, M.boato - 0.05, M.boato + 0.2);
  const col = (lado: number, e: number, luz: number, conteudo: React.ReactNode, titulo: React.ReactNode, cor: string) => (
    <div style={{ width: 455, height: 800, borderRadius: 34, background: `rgba(11,16,38,${0.7 + 0.15 * luz})`, border: `4px solid ${luz > 0.5 ? cor : "rgba(255,255,255,0.22)"}`, boxShadow: luz > 0.5 ? `0 0 60px ${cor}66` : "0 20px 50px rgba(0,0,0,0.5)", transform: `translateX(${(1 - e) * lado * 600}px) scale(${1 + 0.04 * luz})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "70px 20px 50px", boxSizing: "border-box" }}>
      <div style={{ height: 330, display: "flex", alignItems: "flex-end" }}>{conteudo}</div>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 92, color: "#fff", letterSpacing: 1 }}>{titulo}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", justifyContent: "center", alignItems: "center", gap: 0, opacity: vis(t, a, b, 0.15, 0.12) }}>
      {col(-1, e1, luzV, <Vela acesa={velaOn} t={t} />, <span>🕯️ VELA</span>, COR.quente)}
      <div style={{ width: 90, textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 130, color: LAR, zIndex: 2, textShadow: SOMBRA }}>×</div>
      {col(1, e2, luzB, (
        <svg width={230} height={230} viewBox="0 0 230 230">
          <path d="M30 40 h170 a22 22 0 0 1 22 22 v90 a22 22 0 0 1 -22 22 h-90 l-50 40 v-40 h-30 a22 22 0 0 1 -22 -22 v-90 a22 22 0 0 1 22 -22z" fill="none" stroke="#fff" strokeWidth={10} strokeLinejoin="round" />
          {[0, 1, 2].map((i) => <circle key={i} cx={78 + i * 37} cy={107} r={11} fill="#fff" opacity={0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 8 - i))} />)}
        </svg>
      ), <span>BOATO</span>, "#9fb4ff")}
    </div>
  );
};

// ------------------------------------------------------------------ virada, prompt + voz -> rosto, Seguir, PLAY, logo
const ViradaCartela: React.FC<{ t: number }> = ({ t }) => {
  const a = M.esse - 0.05, b = M.ate - 0.08;
  if (t < a || t >= b) return null;
  const w = (s: string, ta: number) => <span key={s} style={{ opacity: k01(t, ta - 0.04, ta + 0.1), display: "inline-block", transform: `translateY(${(1 - eo(k01(t, ta - 0.04, ta + 0.2))) * 20}px)`, marginRight: 24 }}>{s}</span>;
  const pia = mola(k01(t, M.ia - 0.04, M.ia + 0.4));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 960, textAlign: "center", opacity: 1 - k01(t, b - 0.12, b) }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 112, lineHeight: 1.04, color: "#fff", letterSpacing: -2, textShadow: "0 0 40px rgba(11,16,38,0.95)" }}>
        <div>{w("Esse", A(231))}{w("vídeo", A(232))}{w("foi", A(233))}</div>
        <div>
          {w("feito", A(234))}{w("com", A(235))}
          <span style={{ color: LAR, display: "inline-block", transform: `scale(${0.5 + 0.5 * pia})`, opacity: c01(pia * 1.6), textShadow: `0 0 30px ${LAR}88` }}>IA</span>
        </div>
      </div>
    </div>
  );
};

const PERFIL = "M300 70c-60 0-104 40-112 98-4 26 4 44-8 62l-28 40c-6 10 0 18 12 20l18 4-2 30c0 14 10 24 24 24h30c10 0 16 8 16 18v40";
const VozRosto: React.FC<{ t: number }> = ({ t }) => {
  const a = M.ate - 0.08, b = M.quer - 0.05;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.15, 0.15);
  const prompt = "E se o apagão do dia 17 for verdade? Hora a hora, em 3D";
  const n = Math.floor(prompt.length * k01(t, a + 0.05, a + 0.8));
  const morf = eio(k01(t, M.voz - 0.12, M.voz + 0.4));
  const pts = Array.from({ length: 80 }, (_, i) => {
    const x = 90 + i * 11.4;
    const env = Math.sin((i / 79) * Math.PI);
    const y = 150 + Math.sin(i * 0.55 + t * 18) * 60 * env * (0.6 + 0.4 * Math.sin(i * 0.17 + t * 7));
    return `${x},${y}`;
  }).join(" ");
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 330, padding: "30px 34px", borderRadius: 28, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: 4, color: "rgba(255,255,255,0.55)", marginBottom: 12 }}>PROMPT</div>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, lineHeight: 1.2, color: "#fff" }}>
          {prompt.slice(0, n)}
          <span style={{ display: "inline-block", width: 22, height: 50, marginLeft: 4, verticalAlign: "-8px", background: LAR, opacity: Math.floor(t * 4) % 2 ? 1 : 0.3 }} />
        </div>
      </div>
      <svg width={1080} height={420} style={{ position: "absolute", left: 0, top: 690 }}>
        <polyline points={pts} fill="none" stroke={LAR} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={1 - morf} style={{ filter: `drop-shadow(0 0 10px ${LAR})` }} />
        <g transform="translate(240 -40) scale(1.25)" opacity={morf}>
          <path d={PERFIL} fill="none" stroke={LAR} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - morf} style={{ filter: `drop-shadow(0 0 10px ${LAR})` }} />
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${330 + i * 22} ${150 - i * 8}c30 30 30 90 0 ${120 + i * 16}`} fill="none" stroke={LAR} strokeWidth={4} opacity={0.65 - i * 0.12} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - morf} />)}
        </g>
      </svg>
    </div>
  );
};

export const TOQUE = B(246) + 0.06; // toque no "Seguir" no vão depois de "assim?"
export const TECLAS = B(247) + 0.005; // 4 teclas no vão entre "Comenta" e "PLAY"
export const ERRO = B(83) + 0.02; // bipe de erro da maquininha
export const FOSFORO = B(226) + 0.02; // fósforo
export const ENVIA = B(261) + 0.04; // envia o comentário no vão depois de "curso,"
const Dedo: React.FC<{ x: number; y: number; k: number; o: number }> = ({ x, y, k, o }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
    <div style={{ position: "absolute", left: -46, top: -46, width: 92, height: 92, borderRadius: 99, background: "rgba(255,255,255,0.85)", transform: `scale(${1 - 0.18 * Math.sin(Math.PI * k)})`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }} />
    <div style={{ position: "absolute", left: -46, top: -46, width: 92, height: 92, borderRadius: 99, border: "4px solid #fff", transform: `scale(${1 + 1.4 * k})`, opacity: k > 0 ? 1 - k : 0 }} />
  </div>
);
const Seguir: React.FC<{ t: number }> = ({ t }) => {
  const a = M.quer - 0.05, b = M.doPrompt - 0.1;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.2, 0.15);
  const seguiu = t >= TOQUE + 0.06;
  const k = k01(t, TOQUE, TOQUE + 0.35);
  const dx = 760 + 120 * (1 - eio(k01(t, TOQUE - 0.5, TOQUE))), dy = 900 + 160 * (1 - eio(k01(t, TOQUE - 0.5, TOQUE)));
  const playN = Math.floor(4 * k01(t, TECLAS - 0.01, TECLAS + 0.1)); // digitado no vão antes de "PLAY"
  const enviado = t >= ENVIA;
  const grupo = mola(k01(t, M.grupo - 0.1, M.grupo + 0.35));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center" }}>
        {t < M.comenta - 0.05 ? (
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 84, lineHeight: 1.05, color: "#fff", letterSpacing: -1 }}>
            Quer aprender a fazer
            <br />
            vídeos assim?
          </div>
        ) : (
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 110, color: "#fff", letterSpacing: -2 }}>
            Comenta <span style={{ color: LAR }}>PLAY</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 780, padding: "30px 34px", borderRadius: 30, background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ width: 120, height: 120, borderRadius: 99, background: `linear-gradient(135deg, ${LAR}, #ffb347)`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <svg width={60} height={60} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: "#fff" }}>seu.perfil</div>
          <div style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 26, color: "rgba(255,255,255,0.65)" }}>vídeos feitos com IA</div>
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: "#fff", padding: "16px 30px", borderRadius: 16, background: seguiu ? "rgba(255,255,255,0.18)" : "#2f7bf6", transform: `scale(${t >= TOQUE && t < TOQUE + 0.12 ? 0.93 : 1})` }}>{seguiu ? "Seguindo" : "Seguir"}</div>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1030, opacity: k01(t, M.comenta - 0.2, M.comenta + 0.1), display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: `2px solid ${playN > 0 ? LAR : "rgba(255,255,255,0.22)"}` }}>
        <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: playN > 0 ? "#fff" : "rgba(255,255,255,0.45)" }}>
          {playN > 0 ? "PLAY".slice(0, playN) : "Adicione um comentário…"}
          {playN > 0 && !enviado && <span style={{ display: "inline-block", width: 5, height: 46, background: LAR, marginLeft: 6, verticalAlign: "-6px", opacity: Math.floor(t * 4) % 2 ? 1 : 0.2 }} />}
        </div>
        <div style={{ width: 70, height: 70, borderRadius: 99, background: enviado || playN === 4 ? LAR : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${t >= ENVIA && t < ENVIA + 0.12 ? 0.88 : 1})` }}>
          <svg width={36} height={36} viewBox="0 0 24 24"><path d="M3 20l18-8L3 4v6l12 2-12 2z" fill="#fff" /></svg>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1180, display: "flex", justifyContent: "center", opacity: c01(grupo * 1.5) }}>
        <div style={{ transform: `scale(${0.7 + 0.3 * grupo})`, fontFamily: MONO, fontWeight: 800, fontSize: 28, letterSpacing: 2, color: "#fff", padding: "14px 26px", borderRadius: 999, background: "rgba(255,107,44,0.18)", border: `2px solid ${LAR}` }}>LINK DO GRUPO DE LANÇAMENTO</div>
      </div>
      {t < TOQUE + 0.6 && <Dedo x={dx} y={dy} k={k} o={k01(t, TOQUE - 0.6, TOQUE - 0.4) * (1 - k01(t, TOQUE + 0.4, TOQUE + 0.6))} />}
      {t >= ENVIA - 0.6 && t < ENVIA + 0.6 && <Dedo x={918 - 20 * (1 - eio(k01(t, ENVIA - 0.5, ENVIA)))} y={1068 + 60 * (1 - eio(k01(t, ENVIA - 0.5, ENVIA)))} k={k01(t, ENVIA, ENVIA + 0.35)} o={k01(t, ENVIA - 0.6, ENVIA - 0.4) * (1 - k01(t, ENVIA + 0.4, ENVIA + 0.6))} />}
    </div>
  );
};

const Logo: React.FC<{ t: number }> = ({ t }) => {
  const a = M.doPrompt - 0.15, b = LOOP_A + 0.12;
  if (t < a || t >= b) return null;
  const p = mola(k01(t, a, a + 0.5));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 700, display: "flex", justifyContent: "center", opacity: c01(p * 1.5) * (1 - k01(t, LOOP_A - 0.1, LOOP_A + 0.12)) }}>
      <Img src={staticFile("logo_dpp.png")} style={{ width: 860, transform: `scale(${0.8 + 0.2 * p})`, filter: "drop-shadow(0 10px 40px rgba(255,107,44,0.35))" }} />
    </div>
  );
};

// ------------------------------------------------------------------ gancho
const Gancho: React.FC<{ t: number }> = ({ t }) => {
  if (t >= A(9)) return null;
  // já entra viva: leve aproximação desde o quadro 0
  const esc = 1.0 + 0.035 * (1 - eo(k01(t, 0, 1.2)));
  return <Pergunta op={1 - k01(t, A(9) - 0.2, A(9) - 0.02)} esc={esc} />;
};

const Camada: React.FC<{ t: number }> = ({ t }) => (
  <>
    {t >= M.esse - 0.05 && t < LOOP_A && <div style={{ position: "absolute", inset: 0, background: COR.tinta, opacity: 0.25 + 0.3 * k01(t, M.ate - 0.1, M.ate + 0.3) }} />}
    <Gancho t={t} />
    <Bateria t={t} />
    <SemServico t={t} />
    <Maquininha t={t} />
    <Conta t={t} />
    <SeloAmapa t={t} />
    <Celular t={t} />
    <Votacao t={t} />
    <ViradaCartela t={t} />
    <VozRosto t={t} />
    <Seguir t={t} />
    <Logo t={t} />
    <Legenda t={t} />
    <Relogio t={t} />
  </>
);

export const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const fim = f >= ULTIMO;
  const t = fim ? 0 : f / FPS;
  const e = estadoEm(t);
  // volta do loop: a pergunta e o relógio do quadro 0 reaparecem sobre a Terra chegando
  const volta = !fim && t >= LOOP_A ? eio(k01(t, LOOP_A, ULTIMO / FPS)) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir="A" e={e} />
      {volta > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - volta }}><Camada t={t} /></div>
          <div style={{ position: "absolute", inset: 0, opacity: volta }}><Camada t={0} /></div>
        </>
      ) : (
        <Camada t={t} />
      )}
    </AbsoluteFill>
  );
};
