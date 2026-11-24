import React from "react";
import { Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { acha, LOOP0, M, PONTOS, projeta, tl } from "../three/cenas";
import type { Estado } from "../three/mundo";
import type { V3 } from "../three/geo";
import { PALAVRAS } from "../fala";
import { ONDA } from "../onda";

export const { fontFamily: FONTE } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });
export const { fontFamily: MONO } = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });
export const LARANJA = "#FF6B2C";
export const TINTA = "#0B1026";

const c01 = (x: number) => Math.min(1, Math.max(0, x));
const k01 = (t: number, a: number, b: number) => c01((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - c01(x), 3);
const eio = (x: number) => (c01(x) < 0.5 ? 4 * c01(x) ** 3 : 1 - Math.pow(-2 * c01(x) + 2, 3) / 2);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
export const mola = (x: number) => {
  const t = c01(x);
  if (t <= 0) return 0;
  return 1 - Math.exp(-t * 7) * Math.cos(t * 9);
};
const SOMBRA = "0 6px 22px rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.9)";
const vis = (t: number, a: number, b: number, fi = 0.18, fo = 0.18) => Math.min(k01(t, a, a + fi), 1 - k01(t, b - fo, b));
const CARTAO = "rgba(11,16,38,0.86)";
const fix = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);

// ------------------------------------------------------------------ ícones
type IcoN = "arco" | "manta" | "vidro" | "tubo" | "gota" | "sol" | "lampada" | "desu" | "check" | "livro" | "regua" | "termo";
const Ico: React.FC<{ n: IcoN; s?: number; cor?: string }> = ({ n, s = 34, cor = "#fff" }) => {
  const p: Record<IcoN, React.ReactNode> = {
    arco: <path d="M3 20v-8a9 9 0 0 1 18 0v8h-4v-8a5 5 0 0 0-10 0v8z" fill={cor} />,
    manta: <path d="M3 6h14a4 4 0 0 1 0 8H7v4h12v2H5v-8h12a2 2 0 0 0 0-4H3z" fill={cor} />,
    vidro: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 2.1V11H4.1A8 8 0 0 1 11 4.1zm2 0A8 8 0 0 1 19.9 11H13zM4.1 13H11v6.9A8 8 0 0 1 4.1 13zM13 13h6.9A8 8 0 0 1 13 19.9z" fill={cor} fillRule="evenodd" />,
    tubo: <path d="M7 2h10l-2 3v13h3v2H6v-2h3V5zm4 3v13h2V5z" fill={cor} fillRule="evenodd" />,
    gota: <path d="M12 2s7 7.6 7 12.2A7 7 0 0 1 5 14.2C5 9.6 12 2 12 2z" fill={cor} />,
    sol: <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z" fill={cor} />,
    lampada: <path d="M9 21h6v1H9zm0-2h6v1H9zm3-17a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z" fill={cor} />,
    desu: <path d="M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 2v3h10V4zm0 11v5h10v-5zm5-6.5s-2 2.2-2 3.5a2 2 0 0 0 4 0c0-1.3-2-3.5-2-3.5z" fill={cor} fillRule="evenodd" />,
    check: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill={cor} />,
    livro: <path d="M4 3h7a3 3 0 0 1 1 .2A3 3 0 0 1 13 3h7v16h-7a2 2 0 0 0-1 .3 2 2 0 0 0-1-.3H4zm2 2v12h5V6a1 1 0 0 0-1-1zm12 0h-4a1 1 0 0 0-1 1v11h5z" fill={cor} fillRule="evenodd" />,
    regua: <path d="M2 7h20v10H2zm2 2v6h16V9h-1v3h-1V9h-2v2h-1V9h-2v3h-1V9H9v2H8V9H6v3H5V9z" fill={cor} fillRule="evenodd" />,
    termo: <path d="M12 2a3 3 0 0 0-3 3v9.3a5 5 0 1 0 6 0V5a3 3 0 0 0-3-3zm0 2a1 1 0 0 1 1 1v10.4l.5.3a3 3 0 1 1-3 0l.5-.3V5a1 1 0 0 1 1-1z" fill={cor} fillRule="evenodd" />,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {p[n]}
    </svg>
  );
};

/** selo flutuante: etiqueta arredondada com ícone laranja */
const Pilula: React.FC<{ texto: React.ReactNode; ico?: IcoN; esc?: number; destaque?: boolean; sub?: React.ReactNode }> = ({ texto, ico, esc = 1, destaque, sub }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", gap: 14 * esc, padding: `${10 * esc}px ${26 * esc}px ${10 * esc}px ${ico ? 10 * esc : 26 * esc}px`, borderRadius: 999, background: CARTAO,
      border: `${2.5 * esc}px solid ${destaque ? LARANJA : "rgba(255,255,255,0.22)"}`, boxShadow: "0 10px 30px rgba(0,0,0,0.45)", whiteSpace: "nowrap",
    }}
  >
    {ico && (
      <div style={{ width: 54 * esc, height: 54 * esc, borderRadius: 999, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Ico n={ico} s={32 * esc} />
      </div>
    )}
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.0 }}>
      <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 42 * esc, color: "#fff" }}>{texto}</span>
      {sub && <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 25 * esc, color: "rgba(255,255,255,0.8)", marginTop: 6 * esc }}>{sub}</span>}
    </div>
  </div>
);

/** selo ancorado a um ponto 3D, com fio pontilhado até o objeto */
const Ancora: React.FC<{ e: Estado; p: V3; t: number; a: number; b: number; dx?: number; dy?: number; children: React.ReactNode; w?: number; yMin?: number; yMax?: number }> = ({ e, p, t, a, b, dx = 0, dy = -110, children, w = 380, yMin = 270, yMax = 1130 }) => {
  if (t < a - 0.05 || t > b) return null;
  const [x, y] = projeta(e, p);
  const pop = mola(k01(t, a, a + 0.5));
  const o = c01(pop * 1.6) * (1 - k01(t, b - 0.2, b));
  const X = fix(x + dx, 50 + w / 2, 1030 - w / 2), Y = fix(y + dy, yMin + 40, yMax);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
        <line x1={x} y1={y} x2={X} y2={Y + (Y < y ? 30 : -30)} stroke="rgba(255,255,255,0.85)" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
        <circle cx={x} cy={y} r={8} fill={LARANJA} stroke="#fff" strokeWidth={3} />
      </svg>
      <div style={{ position: "absolute", left: X, top: Y, transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * pop})`, opacity: o }}>{children}</div>
    </>
  );
};

// ------------------------------------------------------------------ gancho: "UMA PORTA NO MORRO / = UMA CASA?"
export const Gancho: React.FC<{ t: number }> = ({ t }) => {
  const x = tl(t);
  const fim = M.mas1 - 0.05;
  if (x >= fim) return null;
  const sai = 1 - k01(x, fim - 0.3, fim);
  const pulso = 1 + 0.03 * Math.sin(Math.max(0, x) * 5.5);
  const L: React.CSSProperties = { fontFamily: FONTE, fontWeight: 700, lineHeight: 0.95, letterSpacing: -3, textShadow: SOMBRA, color: "#fff" };
  const casa = mola(k01(x, M.casa - 0.1, M.casa + 0.4));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 280, textAlign: "center", opacity: sai }}>
      <div style={{ ...L, fontSize: 100, transform: `scale(${pulso})`, display: "inline-block" }}>
        UMA <span style={{ color: LARANJA }}>PORTA</span> NO MORRO
      </div>
      <div style={{ ...L, fontSize: 112, marginTop: 14, display: "inline-block", transform: `scale(${1 + 0.12 * casa * (1 - k01(x, M.casa + 0.4, M.casa + 0.8))})` }}>= UMA CASA?</div>
    </div>
  );
};

// ------------------------------------------------------------------ selos das peças (na hora em que cada uma encaixa)
export const Selos: React.FC<{ t: number; e: Estado }> = ({ t, e }) => (
  <>
    <Ancora e={e} p={PONTOS.teto} t={t} a={M.concreto + 0.3} b={M.agora1 + 0.4} dy={-260} dx={-30}>
      <Pilula texto="teto curvo de concreto" ico="arco" destaque />
    </Ancora>
    <Ancora e={e} p={[0.0, 0.84, -0.4]} t={t} a={M.manta + 0.05} b={M.agora2} dy={-250} dx={40}>
      <Pilula texto="manta" ico="manta" destaque sub="por fora do concreto" />
    </Ancora>
    <Ancora e={e} p={PONTOS.vidro} t={t} a={M.vidroE - 0.1} b={M.mas4 + 0.2} dy={-330} dx={60}>
      <Pilula texto="vidro para o norte" ico="vidro" destaque />
    </Ancora>
    <Ancora e={e} p={[-1.04, 0.72, -0.45]} t={t} a={M.tubo - 0.05} b={M.manda - 0.1} dy={-60} dx={0} yMin={330}>
      <Pilula texto="tubo de luz" ico="tubo" destaque />
    </Ancora>
    <Ancora e={e} p={PONTOS.desu} t={t} a={M.desu} b={M.ai + 0.2} dy={-330} dx={60}>
      <Pilula texto="desumidificador" ico="desu" destaque />
    </Ancora>
  </>
);

/** chips curtos: meio-dia, umidade, lâmpada riscada */
export const Chips: React.FC<{ t: number }> = ({ t }) => {
  const chip = (a: number, b: number, el: React.ReactNode, top = 300) => {
    if (t < a - 0.05 || t > b) return null;
    const p = mola(k01(t, a, a + 0.45));
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: c01(p * 1.6) * (1 - k01(t, b - 0.2, b)), transform: `scale(${0.7 + 0.3 * p})` }}>
        {el}
      </div>
    );
  };
  const risco = k01(t, M.sem, M.lampada + 0.2);
  return (
    <>
      {chip(M.meioDia - 0.05, M.escuro - 0.1, <Pilula texto="meio-dia" ico="sol" destaque />)}
      {chip(M.suar - 0.05, M.liga, <Pilula texto="parede fria + ar úmido" ico="gota" destaque />)}
      {chip(
        M.sem - 0.1,
        M.manda - 0.05,
        <div style={{ position: "relative", width: 170, height: 170, borderRadius: 999, background: CARTAO, border: `3px solid ${LARANJA}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico n="lampada" s={100} />
          <div style={{ position: "absolute", width: 150 * risco, height: 12, borderRadius: 9, background: LARANJA, transform: "rotate(-45deg)", left: 10, top: 79, transformOrigin: "left center" }} />
        </div>,
        330,
      )}
    </>
  );
};

// ------------------------------------------------------------------ o sol passa pelo norte (hemisfério sul)
export const SolNorte: React.FC<{ t: number }> = ({ t }) => {
  const a = M.lado - 0.2, b = M.vidro - 0.15;
  if (t < a - 0.05 || t > b) return null;
  const p = mola(k01(t, a, a + 0.45));
  const o = c01(p * 1.6) * (1 - k01(t, b - 0.25, b));
  const k = eio(k01(t, a + 0.2, b - 0.2));
  const ang = Math.PI * (1 - k); // do leste (direita) ao oeste (esquerda), passando pelo norte (alto)
  const cx = 210, cy = 240, R = 150;
  const sx = cx + Math.cos(ang) * R, sy = cy - Math.sin(ang) * R * 0.85;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", justifyContent: "center", opacity: o, transform: `scale(${0.75 + 0.25 * p})` }}>
      <div style={{ width: 420, height: 330, borderRadius: 40, background: CARTAO, border: `3px solid ${LARANJA}`, position: "relative", boxShadow: "0 12px 34px rgba(0,0,0,0.45)" }}>
        <svg width={420} height={330} style={{ position: "absolute", inset: 0 }}>
          <path d={`M ${cx - R} ${cy} A ${R} ${R * 0.85} 0 0 1 ${cx + R} ${cy}`} stroke="rgba(255,200,90,0.85)" strokeWidth={5} strokeDasharray="4 12" strokeLinecap="round" fill="none" />
          <line x1={cx - R - 20} y1={cy} x2={cx + R + 20} y2={cy} stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
          <text x={cx} y={cy + 62} textAnchor="middle" fill={LARANJA} style={{ font: `700 64px ${FONTE}` }}>N</text>
          <text x={cx + R + 4} y={cy + 44} textAnchor="middle" fill="rgba(255,255,255,0.75)" style={{ font: `700 30px ${FONTE}` }}>L</text>
          <text x={cx - R - 4} y={cy + 44} textAnchor="middle" fill="rgba(255,255,255,0.75)" style={{ font: `700 30px ${FONTE}` }}>O</text>
          <polygon points={`${cx},${cy - 6} ${cx - 16},${cy + 18} ${cx + 16},${cy + 18}`} fill={LARANJA} />
          <circle cx={sx} cy={sy} r={30} fill="#ffc94a" />
          <circle cx={sx} cy={sy} r={44} fill="rgba(255,201,74,0.25)" />
        </svg>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ envio: celular com a conversa e a toca ao fundo
export const Envio: React.FC<{ t: number }> = ({ t }) => {
  const a = M.manda - 0.2, b = M.verao + 0.05;
  if (t < a || t > b) return null;
  const ent = eo(k01(t, a, a + 0.35));
  const sai = eio(k01(t, b - 0.3, b));
  const chega = M.manda + 0.15;
  const bolha = mola(k01(t, chega, chega + 0.45));
  const resp = mola(k01(t, M.hobbitE - 0.25, M.hobbitE + 0.2));
  const digitando = t > chega + 0.6 && t < M.hobbitE - 0.25;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", justifyContent: "center", transform: `translateY(${(1 - ent) * 900 + sai * 1100}px) rotate(${(1 - ent) * 8 - 3}deg)` }}>
      <div style={{ width: 560, height: 900, borderRadius: 64, background: "#111318", padding: 16, boxShadow: "0 40px 90px rgba(0,0,0,0.55)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 50, overflow: "hidden", background: "#ece5dc", position: "relative" }}>
          <div style={{ height: 120, background: "#1f6f5c", display: "flex", alignItems: "center", gap: 16, padding: "30px 24px 0" }}>
            <div style={{ width: 62, height: 62, borderRadius: 99, background: "#c9e7a8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🌿</div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: "#fff" }}>Amigo sonhador</span>
              <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 22, color: "rgba(255,255,255,0.8)" }}>{digitando ? "digitando…" : "online"}</span>
            </div>
          </div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ alignSelf: "flex-start", maxWidth: 420, padding: "14px 20px", borderRadius: 22, background: "#fff", fontFamily: FONTE, fontSize: 28, color: "#222" }}>meu sonho é morar numa casa de hobbit 🌱🚪</div>
            <div style={{ alignSelf: "flex-end", transform: `scale(${bolha})`, transformOrigin: "right top", opacity: c01(bolha * 2) }}>
              <div style={{ width: 300, padding: 10, borderRadius: 22, background: "#d6f5c4" }}>
                <div style={{ height: 380, borderRadius: 16, overflow: "hidden", position: "relative", background: "linear-gradient(#9cc6e8, #6f9a4f)" }}>
                  <Img src={staticFile("miniatura.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontFamily: FONTE, fontWeight: 700, color: "#fff", textShadow: SOMBRA, lineHeight: 1 }}>
                    <div style={{ fontSize: 26 }}>UMA CASA</div>
                    <div style={{ fontSize: 26, color: LARANJA }}>DENTRO DO MORRO</div>
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "58%", width: 86, height: 86, marginLeft: -43, marginTop: -43, borderRadius: 99, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="40" height="40" viewBox="0 0 10 10"><path d="M3 2 8 5 3 8z" fill="#fff" /></svg>
                  </div>
                </div>
                <div style={{ fontFamily: FONTE, fontSize: 26, color: "#222", padding: "10px 6px 2px" }}>olha a sua casa 👀</div>
              </div>
            </div>
            <div style={{ alignSelf: "flex-start", transform: `scale(${resp})`, transformOrigin: "left top", opacity: c01(resp * 2), padding: "14px 20px", borderRadius: 22, background: "#fff", fontFamily: FONTE, fontSize: 30, color: "#222" }}>
              QUE SONHO 😍 bora fazer??
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ onda de calor: vizinho (calor) × dentro do morro (fresco)
export const Comparacao: React.FC<{ t: number }> = ({ t }) => {
  const card = (a: number, b: number, titulo: string, palavra: string, cor: string, nivel: number, lado: -1 | 1) => {
    if (t < a - 0.05 || t > b) return null;
    const p = mola(k01(t, a, a + 0.45));
    const o = c01(p * 1.6) * (1 - k01(t, b - 0.25, b));
    const sobe = eo(k01(t, a + 0.1, a + 0.9)) * nivel;
    const treme = lado < 0 ? Math.sin(t * 40) * 3 * c01(sobe) : 0;
    return (
      <div style={{ position: "absolute", top: 300, left: lado < 0 ? 60 : 560, width: 460, opacity: o, transform: `translateY(${(1 - p) * -40}px) translateX(${treme}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "22px 26px", borderRadius: 34, background: CARTAO, border: `3px solid ${cor}`, boxShadow: "0 12px 34px rgba(0,0,0,0.45)" }}>
          <svg width={70} height={170} viewBox="0 0 70 170">
            <rect x={22} y={6} width={26} height={124} rx={13} fill="rgba(255,255,255,0.18)" />
            <rect x={28} y={12 + 112 * (1 - sobe)} width={14} height={112 * sobe + 10} rx={7} fill={cor} />
            <circle cx={35} cy={140} r={24} fill={cor} />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>{titulo}</span>
            <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 64, color: cor }}>{palavra}</span>
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      {card(M.vizinho + 0.1, M.sua + 1.9, "vizinho", "calor", "#ff5a3c", 0.95, -1)}
      {card(M.sua, M.pesq - 0.05, "dentro do morro", "fresco", "#4fb6ff", 0.32, 1)}
    </>
  );
};

// ------------------------------------------------------------------ a prova: selo da pesquisa e a marca dos 40 cm
export const Prova: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.pesq - 0.1, b = M.solo + 0.9;
  const out: React.ReactNode[] = [];
  if (t >= a - 0.05 && t <= b) {
    const p = mola(k01(t, a, a + 0.45));
    out.push(
      <div key="selo" style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: c01(p * 1.6) * (1 - k01(t, b - 0.25, b)), transform: `scale(${0.75 + 0.25 * p})` }}>
        <Pilula texto="Pesquisa Agropecuária Brasileira" ico="livro" destaque sub="medições no RJ" esc={0.95} />
      </div>,
    );
  }
  // marca dos 40 cm na régua (ancorada na cena)
  if (t >= M.quarenta - 0.1 && t < M.parabens) {
    const [x0, y0] = projeta(e, PONTOS.regua0);
    const [, y40] = projeta(e, [PONTOS.regua0[0], PONTOS.regua0[1] - 0.5436, PONTOS.regua0[2]]);
    void y0;
    const p = mola(k01(t, M.quarenta - 0.1, M.quarenta + 0.4));
    const o = c01(p * 1.6) * (1 - k01(t, M.parabens - 0.2, M.parabens));
    out.push(
      <div key="m40" style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
        <div style={{ position: "absolute", left: x0 + 40, top: y40 - 4, width: 230 * p, height: 8, borderRadius: 6, background: LARANJA }} />
        <div style={{ position: "absolute", left: x0 + 60 + 230 * p - 30, top: y40 - 40, transform: `scale(${p})`, transformOrigin: "left center" }}>
          <Pilula texto="40 cm" ico="regua" destaque esc={0.9} />
        </div>
      </div>,
    );
  }
  return <>{out}</>;
};

// ------------------------------------------------------------------ parabéns: o nome de cada peça acende em sequência
export const Parabens: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  if (t < M.parabens || t >= M.virada) return null;
  const itens: [string, IcoN, V3, number, number][] = [
    ["teto curvo", "arco", [-1.5, 0.78, -0.95], -150, -60],
    ["manta", "manta", [-1.5, 0.8, -0.25], 60, -200],
    ["desumidificador", "desu", PONTOS.desu, 40, 230],
    ["tubo de luz", "tubo", PONTOS.tubo, 0, -150],
    ["vidro para o norte", "vidro", [0.27, 0.31, 1.25], 40, 170],
  ];
  const t0 = M.parabens + 0.45, passo = (M.morroE - 0.3 - t0) / 4;
  return (
    <>
      {itens.map(([nome, ico, p, dx, dy], i) => {
        const a = t0 + i * passo;
        if (t < a - 0.05) return null;
        const [x, y] = projeta(e, p);
        const pop = mola(k01(t, a, a + 0.45));
        const o = c01(pop * 1.6) * (1 - k01(t, M.virada - 0.15, M.virada));
        const X = fix(x + dx, 200, 880), Y = fix(y + dy, 330, 1150);
        return (
          <React.Fragment key={nome}>
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
              <line x1={x} y1={y} x2={X} y2={Y} stroke="rgba(255,255,255,0.85)" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
              <circle cx={x} cy={y} r={7} fill={LARANJA} stroke="#fff" strokeWidth={3} />
            </svg>
            <div style={{ position: "absolute", left: X, top: Y, transform: `translate(-50%, -50%) scale(${(0.6 + 0.4 * pop) * 0.82})`, opacity: o }}>
              <Pilula texto={nome} ico={ico} destaque={t < a + 0.6} />
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------------ virada: onda da voz vira rosto de linhas; prompt digitando
const rosto = (x: number, y: number) => {
  const r = Math.sqrt(x * x * 1.2 + y * y * 0.8);
  let z = Math.max(0, 1 - r) ** 0.6;
  z += 0.45 * Math.exp(-((x * x) / 0.006 + ((y + 0.05) ** 2) / 0.04));
  z -= 0.25 * Math.exp(-(((Math.abs(x) - 0.28) ** 2) / 0.01 + ((y - 0.18) ** 2) / 0.006));
  z += 0.12 * Math.exp(-((x * x) / 0.05 + ((y + 0.42) ** 2) / 0.004));
  return z;
};
export const VozRosto: React.FC<{ t: number }> = ({ t }) => {
  const a = M.ate - 0.2, b = M.quer + 0.1;
  if (t < a || t > b) return null;
  const f = Math.round(t * 30);
  const amp = (i: number) => ONDA[Math.max(0, Math.min(ONDA.length - 1, i))] ?? 0;
  const m = eo(k01(t, M.voz - 0.1, M.voz + 0.6));
  const o = vis(t, a, b, 0.25, 0.3);
  const N = 26, W = 700, X0 = 190, Y0 = 430, Hh = 760;
  const linhas: string[] = [];
  for (let j = 0; j < N; j++) {
    const yN = -1 + (2 * j) / (N - 1);
    const yBase = lerpN(Y0 + Hh / 2, Y0 + Hh * (j / (N - 1)), m);
    let d = "";
    for (let i = 0; i <= 80; i++) {
      const xN = -1 + (2 * i) / 80;
      const onda = amp(f - Math.round((1 - i / 80) * 24)) * 130 * Math.sin(i * 0.9 + t * 14 + j) * Math.exp(-xN * xN * 1.5);
      const boca = Math.exp(-((yN - 0.38) ** 2) / 0.01) * amp(f) * 60 * Math.exp(-(xN * xN) / 0.05);
      const yy = yBase - m * rosto(xN, yN) * 360 + (1 - m) * onda * (j === Math.floor(N / 2) ? 1 : 0.6) - m * boca;
      d += `${i ? "L" : "M"}${(X0 + ((xN + 1) / 2) * W).toFixed(1)} ${yy.toFixed(1)} `;
    }
    linhas.push(d);
  }
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <rect x={0} y={0} width={1080} height={1920} fill={TINTA} opacity={0.5 * m} />
      {linhas.map((d, j) => (
        <path key={j} d={d} stroke={LARANJA} strokeWidth={j % 5 === 0 ? 4 : 2.5} fill="none" opacity={m < 0.5 && j !== Math.floor(N / 2) ? 0.25 + m : 0.95} />
      ))}
    </svg>
  );
};

export const Prompt: React.FC<{ t: number }> = ({ t }) => {
  const a = M.quer - 0.15, b = M.assim2E + 0.1;
  if (t < a || t > b) return null;
  const txt = "toca de hobbit num morro em corte: teto curvo de concreto, manta, vidro para o norte e tubos de luz";
  const n = Math.floor(txt.length * k01(t, a + 0.1, b - 0.3));
  const o = vis(t, a, b, 0.2, 0.15);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 470, opacity: o, transform: `translateY(${(1 - eo(k01(t, a, a + 0.3))) * 40}px)` }}>
      <div style={{ padding: "30px 36px", borderRadius: 28, background: "rgba(255,255,255,0.08)", border: `2px solid ${LARANJA}`, backdropFilter: "blur(8px)", boxShadow: "0 0 60px rgba(255,107,44,0.25)" }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LARANJA, marginBottom: 14, letterSpacing: 3 }}>PROMPT</div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 42, color: "#fff", lineHeight: 1.3, minHeight: 330 }}>
          {txt.slice(0, n)}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>▍</span>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ chamada: Seguir, comentário PLAY, aviso do link, Do Prompt ao Play
export const Chamada: React.FC<{ t: number }> = ({ t }) => {
  const a = M.assim2E - 0.05;
  if (t < a || t >= LOOP0) return null;
  const o = 1 - k01(t, LOOP0 - 0.25, LOOP0);
  const toque = Math.min(M.comenta - 0.12, M.assim2E + 0.32);
  const seguiu = t >= toque + 0.1;
  const ent = eo(k01(t, a, a + 0.3));
  const dig = "PLAY".slice(0, Math.floor(4 * k01(t, M.play + 0.15, M.play + 0.5)));
  const enviado = t > M.play + 0.9;
  const aviso = mola(k01(t, M.link - 0.1, M.link + 0.4));
  const logo = mola(k01(t, M.doPrompt - 0.15, M.doPrompt + 0.45));
  const dedo = (cx: number, cy: number, t0: number) => {
    const k = k01(t, t0 - 0.25, t0 + 0.35);
    if (k <= 0 || k >= 1) return null;
    const desce = eo(k01(t, t0 - 0.25, t0));
    return <div style={{ position: "absolute", left: cx - 45, top: cy - 45 + (1 - desce) * 60, width: 90, height: 90, borderRadius: 99, background: "rgba(255,255,255,0.35)", border: "4px solid #fff", transform: `scale(${t > t0 ? 0.85 : 1})`, opacity: 1 - k01(t, t0 + 0.15, t0 + 0.35) }} />;
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: 290, transform: `translateY(${(1 - ent) * -50}px)`, opacity: ent }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 26px", borderRadius: 30, background: "rgba(11,16,38,0.92)", border: "2px solid rgba(255,255,255,0.12)" }}>
          <div style={{ width: 96, height: 96, borderRadius: 99, background: `conic-gradient(${LARANJA}, #ffb36b, ${LARANJA})`, padding: 5 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 99, background: TINTA, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 10 10"><path d="M3 2 8 5 3 8z" fill={LARANJA} /></svg>
            </div>
          </div>
          <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: "#fff" }}>seu.perfil</div>
          <div style={{ padding: "16px 34px", borderRadius: 18, background: seguiu ? "rgba(255,255,255,0.16)" : LARANJA, fontFamily: FONTE, fontWeight: 700, fontSize: 36, color: "#fff", transform: `scale(${t > toque && t < toque + 0.15 ? 0.92 : 1})` }}>
            {seguiu ? "Seguindo" : "Seguir"}
          </div>
        </div>
      </div>
      {dedo(1080 - 70 - 110, 290 + 70, toque)}
      <div style={{ position: "absolute", left: 70, right: 70, top: 460, opacity: eo(k01(t, M.play - 0.35, M.play - 0.05)) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 30px", borderRadius: 999, background: "rgba(255,255,255,0.96)" }}>
          <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 46, color: dig ? "#111" : "#888" }}>
            {dig || "Adicione um comentário…"}
            {!enviado && dig && <span style={{ color: LARANJA, opacity: Math.floor(t * 4) % 2 }}>|</span>}
          </div>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: dig.length === 4 ? LARANJA : "#bbb" }}>{enviado ? "Enviado ✓" : "Publicar"}</div>
        </div>
      </div>
      {dedo(1080 - 70 - 100, 460 + 55, M.play + 0.75)}
      <div style={{ position: "absolute", left: 70, right: 70, top: 600, display: "flex", justifyContent: "center", opacity: c01(aviso * 1.5), transform: `scale(${0.8 + 0.2 * aviso})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 26px", borderRadius: 22, background: "rgba(11,16,38,0.92)", border: `2px solid ${LARANJA}` }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>💬</div>
          <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: "#fff" }}>link do grupo de lançamento no seu direct</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", justifyContent: "center", opacity: c01(logo * 1.5), transform: `scale(${0.75 + 0.25 * logo})` }}>
        <div style={{ padding: "26px 40px", borderRadius: 36, background: "rgba(11,16,38,0.85)" }}>
          <Img src={staticFile("logo_dpap.png")} style={{ width: 600, display: "block" }} />
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ legenda por grupo de palavras
const W = PALAVRAS;
const I = {
  gancho: acha("se voce cavar"),
  casaG: acha("casa"),
  quarenta: acha("40 centimetros"),
};
const GRAFIA: Record<number, string> = {
  [I.quarenta]: "40",
  [I.quarenta + 1]: "cm",
};
const OCULTA: [number, number][] = [[I.gancho, I.casaG]]; // o texto de tela do gancho diz o mesmo
const oculta = (i: number) => OCULTA.some(([a, b]) => i >= a && i <= b);
const bruto = (i: number) => (GRAFIA[i] !== undefined ? GRAFIA[i] : W[i].w);
const txt = (i: number) => bruto(i).replace(/[.,:]$/g, "");
type Grupo = { ini: number; fim: number; ids: number[] };
const MAXC = 26;
const fimFrase = (i: number) => /[.?!]$/.test(W[i].w);
const GRUPOS: Grupo[] = (() => {
  const trechos: number[][] = [];
  let cur: number[] = [];
  const fecha = () => {
    if (cur.length) trechos.push(cur);
    cur = [];
  };
  W.forEach((p, i) => {
    if (oculta(i)) return fecha();
    cur.push(i);
    if (/[.?!,:]$/.test(p.w)) fecha();
  });
  fecha();
  const tam = (ids: number[]) => ids.reduce((s, i) => s + txt(i).length + 1, 0);
  const unidos: number[][] = [];
  for (const tr of trechos) {
    const ult = unidos[unidos.length - 1];
    if (ult && !fimFrase(ult[ult.length - 1]) && tam(ult) + tam(tr) <= MAXC && tr[0] <= ult[ult.length - 1] + 4) ult.push(...tr);
    else unidos.push([...tr]);
  }
  const gs: Grupo[] = [];
  for (const tr of unidos) {
    const n = Math.ceil(tam(tr) / MAXC);
    const alvo = tam(tr) / n;
    let parte: number[] = [];
    let acc = 0, k = 1;
    tr.forEach((i, j) => {
      parte.push(i);
      acc += txt(i).length + 1;
      const unidade = j < tr.length - 1 && /^(cm)$/.test(txt(tr[j + 1]));
      if (k < n && acc >= alvo * k - 3 && j < tr.length - 1 && !unidade) {
        gs.push({ ini: W[parte[0]].s, fim: W[parte[parte.length - 1]].e, ids: parte });
        parte = [];
        k++;
      }
    });
    if (parte.length) gs.push({ ini: W[parte[0]].s, fim: W[parte[parte.length - 1]].e, ids: parte });
  }
  return gs;
})();
export const GRUPOS_DEBUG = () => GRUPOS.map((g) => g.ids.map(txt).join(" "));
const MAIUSC = new Set(["ia", "play"]);
const I_PLAY_FINAL = acha("ao play") + 1;
export const Legenda: React.FC<{ t: number }> = ({ t }) => {
  const g = GRUPOS.find((g, i) => t >= g.ini - 0.05 && t < Math.min(g.fim + 0.45, (GRUPOS[i + 1]?.ini ?? 1e9) - 0.05));
  if (!g || t >= LOOP0) return null;
  const ent = eo(k01(t, g.ini - 0.05, g.ini + 0.12));
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1190, height: 400, background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.34) 45%, rgba(0,0,0,0.34) 70%, rgba(0,0,0,0))", opacity: ent }} />
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 1920 - 1505, textAlign: "center", transform: `translateY(${(1 - ent) * 18}px)`, opacity: ent }}>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 88, lineHeight: 1.06, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,0.9), 0 2px 3px rgba(0,0,0,0.95)", letterSpacing: -1, textWrap: "balance" } as React.CSSProperties}>
          {g.ids.map((i, j) => {
            let w = txt(i);
            if (MAIUSC.has(w.toLowerCase()) && i !== I_PLAY_FINAL) w = w.toUpperCase();
            if (j === 0 && /^[a-zà-ú]/.test(w) && i > 0 && /[.?!]$/.test(W[i - 1].w)) w = w[0].toUpperCase() + w.slice(1);
            const num = /\d/.test(w) || (w === "cm" && /\d/.test(txt(g.ids[j - 1] ?? 0)));
            const ativa = t >= W[i].s - 0.03;
            return (
              <span key={i} style={{ color: num ? LARANJA : "#fff", opacity: ativa ? 1 : 0.72, marginRight: 22, display: "inline-block" }}>
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
