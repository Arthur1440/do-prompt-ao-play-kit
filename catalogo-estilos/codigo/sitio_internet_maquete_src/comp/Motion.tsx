import React from "react";
import { Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { acha, LOOP0, M, posSat, projeta, tl } from "../three/cenas";
import type { Estado } from "../three/mundo";
import type { V3 } from "../three/kit";
import { P } from "../three/sitio";
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
type IcoN = "peixe" | "gota" | "raio" | "antena" | "check" | "escudo" | "lampada" | "geladeira" | "celular" | "satelite" | "relogio" | "moeda";
const Ico: React.FC<{ n: IcoN; s?: number; cor?: string }> = ({ n, s = 34, cor = "#fff" }) => {
  const p: Record<IcoN, React.ReactNode> = {
    peixe: <path d="M3 12c3-5 9-6 13-3l4-3v12l-4-3c-4 3-10 2-13-3zm6-1.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" fill={cor} fillRule="evenodd" />,
    gota: <path d="M12 2s7 7.6 7 12.2A7 7 0 0 1 5 14.2C5 9.6 12 2 12 2z" fill={cor} />,
    raio: <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill={cor} />,
    antena: <path d="M4 6l9 9-2 2A7 7 0 0 1 4 6zm9 4a3 3 0 0 0-3-3V5a5 5 0 0 1 5 5zm4 0a7 7 0 0 0-7-7V1a9 9 0 0 1 9 9zM8 18h2l1 4H5z" fill={cor} />,
    check: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill={cor} />,
    escudo: <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5zm-1.2 13.6-3.6-3.6 1.4-1.4 2.2 2.2 4.8-4.8 1.4 1.4z" fill={cor} fillRule="evenodd" />,
    lampada: <path d="M9 21h6v1H9zm0-2h6v1H9zm3-17a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z" fill={cor} />,
    geladeira: <path d="M6 2h12v20H6zm2 2v5h8V4zm0 7v9h8v-9zm1 1h1v3H9zM9 5h1v3H9z" fill={cor} fillRule="evenodd" />,
    celular: <path d="M7 1h10a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm1 3v15h8V4zm4 16.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z" fill={cor} fillRule="evenodd" />,
    satelite: <path d="M10 10l4 4-2 2-4-4zm5-8 3 3-3 3-3-3zM5 12l3 3-3 3-3-3zm11 3a3 3 0 0 0 3-3h2a5 5 0 0 1-5 5zm0 4a7 7 0 0 0 7-7h1.5A8.5 8.5 0 0 1 16 20.5z" fill={cor} />,
    relogio: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.6 2.1-1 1.7L11 13V6h2z" fill={cor} />,
    moeda: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15.9V19h-2v-1.1c-1.6-.3-2.9-1.3-3-3h2c.1.8.8 1.4 2 1.4 1.3 0 1.8-.6 1.8-1.1 0-.7-.4-1.1-2.1-1.5-1.9-.5-3.3-1.2-3.3-2.9 0-1.4 1.1-2.4 2.6-2.7V7h2v1.1c1.6.4 2.4 1.6 2.4 2.9h-2c0-.9-.5-1.5-1.8-1.5-1.2 0-1.9.5-1.9 1.2 0 .6.5 1 2.1 1.4 1.6.4 3.3 1.1 3.3 3.1 0 1.4-1.1 2.4-2.6 2.7z" fill={cor} />,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {p[n]}
    </svg>
  );
};

/** selo flutuante: etiqueta arredondada com ícone laranja */
const Pilula: React.FC<{ texto: React.ReactNode; ico?: IcoN; esc?: number; destaque?: boolean; sub?: React.ReactNode; tracejado?: boolean }> = ({ texto, ico, esc = 1, destaque, sub, tracejado }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", gap: 14 * esc, padding: `${10 * esc}px ${26 * esc}px ${10 * esc}px ${ico ? 10 * esc : 26 * esc}px`, borderRadius: 999, background: CARTAO,
      border: `${2.5 * esc}px ${tracejado ? "dashed" : "solid"} ${destaque ? LARANJA : "rgba(255,255,255,0.22)"}`, boxShadow: "0 10px 30px rgba(0,0,0,0.45)", whiteSpace: "nowrap",
    }}
  >
    {ico && (
      <div style={{ width: 54 * esc, height: 54 * esc, borderRadius: 999, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Ico n={ico} s={32 * esc} />
      </div>
    )}
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.0 }}>
      <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 42 * esc, color: "#fff" }}>{texto}</span>
      {sub && <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 25 * esc, color: "rgba(255,255,255,0.78)", marginTop: 6 * esc }}>{sub}</span>}
    </div>
  </div>
);

/** selo ancorado a um ponto 3D; ponta para baixo apontando o objeto */
const Ancora: React.FC<{ e: Estado; p: V3; t: number; a: number; b: number; dx?: number; dy?: number; children: React.ReactNode; w?: number; yMin?: number }> = ({ e, p, t, a, b, dx = 0, dy = -110, children, w = 360, yMin = 270 }) => {
  if (t < a - 0.05 || t > b) return null;
  const [x, y] = projeta(e, p);
  const pop = mola(k01(t, a, a + 0.5));
  const o = c01(pop * 1.6) * (1 - k01(t, b - 0.2, b));
  const X = fix(x + dx, 50 + w / 2, 1030 - w / 2), Y = fix(y + dy, yMin + 40, 1130);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
        <line x1={x} y1={y} x2={X} y2={Y + 30} stroke="rgba(255,255,255,0.85)" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
        <circle cx={x} cy={y} r={8} fill={LARANJA} stroke="#fff" strokeWidth={3} />
      </svg>
      <div style={{ position: "absolute", left: X, top: Y, transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * pop})`, opacity: o }}>{children}</div>
    </>
  );
};

// ------------------------------------------------------------------ gancho: "R$ 70 MIL / = UM SÍTIO COM TUDO?"
export const Gancho: React.FC<{ t: number }> = ({ t }) => {
  const x = tl(t);
  const fim = M.semConta - 0.05;
  if (x >= fim) return null;
  const sai = 1 - k01(x, fim - 0.3, fim);
  const pulso = 1 + 0.035 * Math.sin(Math.max(0, x) * 5.5);
  const L: React.CSSProperties = { fontFamily: FONTE, fontWeight: 700, lineHeight: 0.95, letterSpacing: -3, textShadow: SOMBRA, color: "#fff" };
  // ícones das 4 coisas acendem quando a voz diz cada uma
  const itens: [IcoN, number, string][] = [["peixe", M.comida, "comida"], ["gota", M.agua, "água"], ["raio", M.luz, "luz"], ["antena", M.internet, "internet"]];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 285, textAlign: "center", opacity: sai }}>
      <div style={{ ...L, fontSize: 176, color: LARANJA, transform: `scale(${pulso})`, display: "inline-block" }}>R$ 70 MIL</div>
      <div style={{ ...L, fontSize: 84, marginTop: 10 }}>= UM SÍTIO COM TUDO?</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 26 }}>
        {itens.map(([ico, ta, nome]) => {
          const on = x >= ta - 0.05;
          const pop = mola(k01(x, ta - 0.05, ta + 0.4));
          return (
            <div key={nome} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px 8px 8px", borderRadius: 999, background: on ? CARTAO : "rgba(11,16,38,0.45)", border: `2px solid ${on ? LARANJA : "rgba(255,255,255,0.18)"}`, transform: `scale(${on ? 0.85 + 0.15 * pop : 0.85})` }}>
              <div style={{ width: 46, height: 46, borderRadius: 99, background: on ? LARANJA : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico n={ico} s={28} />
              </div>
              <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: on ? "#fff" : "rgba(255,255,255,0.55)" }}>{nome}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** "Sem conta de luz": a conta aparece e é riscada */
export const RiscoConta: React.FC<{ t: number }> = ({ t }) => {
  const a = M.semConta - 0.05, b = M.pipa + 0.3;
  if (t < a || t > b) return null;
  const pop = mola(k01(t, a, a + 0.4));
  const tLuz = M.sem2 - 0.35; // "luz" de "conta de luz"
  const r = eo(k01(t, tLuz, tLuz + 0.22));
  const o = c01(pop * 1.6) * (1 - k01(t, b - 0.25, b));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ position: "relative", transform: `scale(${0.6 + 0.4 * pop}) rotate(-3deg)`, width: 420, padding: "22px 28px", borderRadius: 14, background: "#fbf6ea", boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 99, background: "#f2b84b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico n="raio" s={34} cor="#3a2a10" />
          </div>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: "#2a2418" }}>conta de luz</div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 10, borderRadius: 5, background: "#e2d9c4", marginTop: 14, width: `${90 - i * 22}%` }} />
        ))}
        <svg width={420} height={200} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={20} y1={170} x2={20 + 380 * r} y2={170 - 150 * r} stroke={LARANJA} strokeWidth={16} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

/** caminhão-pipa riscado em "sem caminhão-pipa" */
export const RiscoPipa: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.pipaE - 0.02, b = M.funciona + 0.35;
  if (t < a || t > b || !e.caminhao) return null;
  const [x, y] = projeta(e, [e.caminhao.x, 0.3, 2.55]);
  const k1 = eo(k01(t, a, a + 0.18)), k2 = eo(k01(t, a + 0.12, a + 0.3));
  const R = 120;
  const o = 1 - k01(t, b - 0.25, b);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <circle cx={x} cy={y} r={R + 20} fill="none" stroke={LARANJA} strokeWidth={12} strokeDasharray={`${k1 * 900} 900`} transform={`rotate(-90 ${x} ${y})`} />
      <line x1={x - R * 0.75} y1={y - R * 0.75} x2={x - R * 0.75 + R * 1.5 * k2} y2={y - R * 0.75 + R * 1.5 * k2} stroke={LARANJA} strokeWidth={16} strokeLinecap="round" />
    </svg>
  );
};

// ------------------------------------------------------------------ como funciona: "16 mil litros" na cisterna, "4 placas"
export const SelosComo: React.FC<{ t: number; e: Estado }> = ({ t, e }) => (
  <>
    <Ancora e={e} t={t} p={[P.cist[0], 1.0, P.cist[2]]} a={M.cisterna + 0.5} b={M.aLuz - 0.15} dy={-150} dx={60} w={440}>
      <Pilula ico="gota" texto="16 mil litros" sub="cisterna de placas" />
    </Ancora>
  </>
);

// ------------------------------------------------------------------ A CONTA: selo Embrapa (prova) -> R$ 15 mil -> 30 a 40 kg a cada 100 dias
export const Conta: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.agora, b = M.manda;
  if (t < a - 0.05 || t > b) return null;
  const o = 1 - k01(t, b - 0.2, b);
  const pSelo = mola(k01(t, a + 0.6, a + 1.1));
  const [tx, ty] = projeta(e, [P.tanque[0], 0.5, P.tanque[2]]);
  // contador de peixe: 0 -> 30, depois "a 40 kg"
  const nK = Math.round(30 * eio(k01(t, M.trinta - 0.25, M.trinta + 0.3)));
  const mostraKg = t >= M.trinta - 0.25;
  const ate40 = t >= M.quarentaQ - 0.45;
  const anel = k01(t, M.cem - 0.1, M.cemE + 0.2);
  const pTag = mola(k01(t, M.quinze - 0.05, M.quinze + 0.45));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {/* selo da prova: Embrapa, em cima do tanque */}
      <div style={{ position: "absolute", left: fix(tx, 300, 780), top: fix(ty - 330, 290, 900), transform: `translate(-50%,0) scale(${0.6 + 0.4 * pSelo})`, opacity: c01(pSelo * 1.6) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 30px 14px 14px", borderRadius: 26, background: "rgba(255,255,255,0.96)", boxShadow: "0 12px 34px rgba(0,0,0,0.45)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#1f7a46", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico n="escudo" s={40} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 26, color: "#4a5160", letterSpacing: 1 }}>segundo a</span>
            <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 52, color: "#13202c" }}>Embrapa</span>
          </div>
        </div>
      </div>
      {/* preço */}
      {t >= M.quinze - 0.05 && (
        <div style={{ position: "absolute", left: fix(tx, 300, 780), top: fix(ty - 175, 420, 1040), transform: `translate(-50%,0) scale(${0.6 + 0.4 * pTag})`, opacity: c01(pTag * 1.6) }}>
          <Pilula ico="moeda" texto={<span style={{ color: LARANJA, fontSize: 56 }}>~R$ 15 mil</span>} sub="Sisteminha" destaque esc={1.05} />
        </div>
      )}
      {/* contador de peixe + 100 dias */}
      {mostraKg && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1000, display: "flex", justifyContent: "center", opacity: k01(t, M.trinta - 0.25, M.trinta) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 30px 16px 16px", borderRadius: 34, background: CARTAO, border: `2.5px solid ${LARANJA}` }}>
            <svg width={110} height={110} viewBox="0 0 110 110">
              <circle cx={55} cy={55} r={46} stroke="rgba(255,255,255,0.16)" strokeWidth={10} fill="none" />
              <circle cx={55} cy={55} r={46} stroke={LARANJA} strokeWidth={10} fill="none" strokeDasharray={`${anel * 289} 289`} transform="rotate(-90 55 55)" strokeLinecap="round" />
              <g transform="translate(31 31) scale(2)"><Ico n="peixe" s={24} /></g>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 70, color: "#fff", letterSpacing: -1 }}>
                <span style={{ color: LARANJA }}>{nK}</span>
                {ate40 ? <span style={{ color: LARANJA }}> a 40</span> : null} kg
              </span>
              <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 32, color: "rgba(255,255,255,0.85)", marginTop: 8, opacity: k01(t, M.cem - 0.1, M.cem + 0.15) }}>
                de peixe a cada <b style={{ color: LARANJA }}>100 dias</b>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ ENVIO: celular recebe o vídeo numa conversa
export const Envio: React.FC<{ t: number }> = ({ t }) => {
  const a = M.cemE - 0.15, b = M.peca + 0.05;
  if (t < a || t > b) return null;
  const ent = eo(k01(t, a, a + 0.35));
  const sai = eio(k01(t, b - 0.3, b));
  const chega = M.cemE + 0.08;
  const bolha = mola(k01(t, chega, chega + 0.45));
  const resp = mola(k01(t, M.sitioE - 0.35, M.sitioE + 0.1));
  const digitando = t > chega + 0.6 && t < M.sitioE - 0.35;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", transform: `translateY(${(1 - ent) * 900 + sai * 1100}px) rotate(${(1 - ent) * 8 - 3}deg)` }}>
      <div style={{ width: 560, height: 920, borderRadius: 64, background: "#111318", padding: 16, boxShadow: "0 40px 90px rgba(0,0,0,0.55)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 50, overflow: "hidden", background: "#ece5dc", position: "relative" }}>
          <div style={{ height: 120, background: "#1f6f5c", display: "flex", alignItems: "center", gap: 16, padding: "30px 24px 0" }}>
            <div style={{ width: 62, height: 62, borderRadius: 99, background: "#9cd3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🌱</div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: "#fff" }}>Amigo do sítio</span>
              <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 22, color: "rgba(255,255,255,0.8)" }}>{digitando ? "digitando…" : "online"}</span>
            </div>
          </div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ alignSelf: "flex-start", maxWidth: 400, padding: "14px 20px", borderRadius: 22, background: "#fff", fontFamily: FONTE, fontSize: 28, color: "#222" }}>um dia eu largo tudo e vou trabalhar de um sítio 🏡💻</div>
            <div style={{ alignSelf: "flex-end", transform: `scale(${bolha})`, transformOrigin: "right top", opacity: c01(bolha * 2) }}>
              <div style={{ width: 300, padding: 10, borderRadius: 22, background: "#d6f5c4" }}>
                <div style={{ height: 380, borderRadius: 16, overflow: "hidden", position: "relative", background: "linear-gradient(#f2b77a, #6f9a4f)" }}>
                  <Img src={staticFile("miniatura.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: 26, textAlign: "center", fontFamily: FONTE, fontWeight: 700, color: "#fff", textShadow: SOMBRA, lineHeight: 1 }}>
                    <div style={{ fontSize: 50, color: LARANJA }}>R$ 70 MIL</div>
                    <div style={{ fontSize: 22, marginTop: 4 }}>= UM SÍTIO COM TUDO?</div>
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "55%", width: 86, height: 86, marginLeft: -43, marginTop: -43, borderRadius: 99, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="40" height="40" viewBox="0 0 10 10"><path d="M3 2 8 5 3 8z" fill="#fff" /></svg>
                  </div>
                </div>
                <div style={{ fontFamily: FONTE, fontSize: 26, color: "#222", padding: "10px 6px 2px" }}>olha o seu sítio 👀</div>
              </div>
            </div>
            <div style={{ alignSelf: "flex-start", transform: `scale(${resp})`, transformOrigin: "left top", opacity: c01(resp * 2), padding: "14px 20px", borderRadius: 22, background: "#fff", fontFamily: FONTE, fontSize: 30, color: "#222" }}>
              CARACA 😱 quanto custa??
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ A LUZ: 4 placas contadas, bateria, e o que acende
export const Luz: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  if (t < M.quatro - 0.1 || t > M.aInternet) return null;
  const pl: V3[] = [0, 1, 2, 3].map((i) => {
    const col = i % 2, lin = Math.floor(i / 2);
    const u = 0.25 + col * 0.44, v = 0.2 + lin * 0.33;
    const ang = Math.atan2(0.55, 0.8);
    return [P.casa[0] + u, 1.0 + 0.55 + 0.08 - v * Math.sin(ang) + 0.06, P.casa[2] + v * Math.cos(ang)] as V3;
  });
  const fimPl = M.baterias + 0.6;
  return (
    <>
      {t < fimPl &&
        pl.map((p, i) => {
          const ti = M.quatro + i * 0.12;
          if (t < ti) return null;
          const [x, y] = projeta(e, p);
          const pop = mola(k01(t, ti, ti + 0.35));
          return (
            <div key={i} style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 99, background: LARANJA, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: "#fff", transform: `scale(${pop})`, opacity: 1 - k01(t, fimPl - 0.2, fimPl) }}>
              {i + 1}
            </div>
          );
        })}
      <Ancora e={e} t={t} p={[P.casa[0] + 0.5, 1.75, P.casa[2] - 0.2]} a={M.quatro + 0.4} b={M.baterias + 0.9} dy={-170} dx={-120} w={540}>
        <Pilula ico="raio" texto={<><span style={{ color: LARANJA }}>4</span> placas no telhado</>} />
      </Ancora>
      <Ancora e={e} t={t} p={[P.bat[0], 0.75, P.bat[2]]} a={M.baterias} b={M.da - 0.25} dy={-200} dx={-60} w={470}>
        <Pilula ico="raio" texto="baterias" sub="guardam o sol para a noite" destaque />
      </Ancora>
      {/* o que acende, um a um */}
      <Ancora e={e} t={t} p={[P.casa[0] - 0.35, 0.74, P.casa[2] + 0.73]} a={M.lampE} b={M.aInternet} dy={-250} dx={-90}>
        <Pilula ico="lampada" texto="lâmpada" esc={0.85} destaque />
      </Ancora>
      <Ancora e={e} t={t} p={[P.casa[0] + 0.66, 0.75, P.casa[2] - 0.2]} a={M.geladeira} b={M.aInternet} dy={-330} dx={80}>
        <Pilula ico="geladeira" texto="geladeira" esc={0.85} destaque />
      </Ancora>
      <Ancora e={e} t={t} p={[P.casa[0] - 0.4, 0.53, P.casa[2] - 0.22]} a={M.celular} b={M.aInternet} dy={-190} dx={-60}>
        <Pilula ico="celular" texto="celular" esc={0.85} destaque />
      </Ancora>
    </>
  );
};

// ------------------------------------------------------------------ A INTERNET: ~500 km de altura; antena x lâmpada antiga
export const Internet: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  if (t < M.satelites || t > M.reuniao) return null;
  const out: React.ReactNode[] = [];
  const a = M.quinhentos - 0.1, b = M.eAntena + 0.3;
  if (t >= a && t <= b && e.sats > 0) {
    const [ax, ay] = projeta(e, [P.ant[0], 0.7, P.ant[2]]);
    // satélite mais perto da antena (o do feixe)
    let best: V3 = posSat(e, 0), bd = 1e9;
    for (let i = 0; i < 4; i++) {
      const p = posSat(e, i);
      const dd = Math.abs(p[0] - P.ant[0]);
      if (dd < bd) (bd = dd), (best = p);
    }
    const [sx, sy] = projeta(e, best);
    const pop = mola(k01(t, a, a + 0.45));
    const o = c01(pop * 1.5) * (1 - k01(t, b - 0.25, b));
    const mx = fix((ax + sx) / 2 + 150, 230, 850), my = (ay + sy) / 2;
    out.push(
      <div key="km" style={{ position: "absolute", inset: 0, opacity: o }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line x1={sx + 40} y1={sy} x2={sx + 40} y2={ay} stroke="#fff" strokeWidth={4} strokeDasharray="14 12" />
          <path d={`M${sx + 22} ${sy + 22} L${sx + 40} ${sy} L${sx + 58} ${sy + 22}`} stroke="#fff" strokeWidth={4} fill="none" />
          <path d={`M${sx + 22} ${ay - 22} L${sx + 40} ${ay} L${sx + 58} ${ay - 22}`} stroke="#fff" strokeWidth={4} fill="none" />
        </svg>
        <div style={{ position: "absolute", left: mx, top: my, transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * pop})` }}>
          <Pilula ico="satelite" texto={<span style={{ color: LARANJA, fontSize: 60 }}>~500 km</span>} sub="de altura" destaque esc={1.05} />
        </div>
      </div>,
    );
  }
  const c = M.lampAntiga - 0.1, d = M.reuniao;
  if (t >= c && t <= d) {
    const pop = mola(k01(t, c, c + 0.45));
    const o = c01(pop * 1.5) * (1 - k01(t, d - 0.2, d));
    const bar = eo(k01(t, M.antiga - 0.1, M.antiga + 0.4));
    out.push(
      <div key="lamp" style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: o, transform: `scale(${0.7 + 0.3 * pop})` }}>
        <div style={{ padding: "22px 30px", borderRadius: 30, background: CARTAO, border: "2px solid rgba(255,255,255,0.2)", width: 640 }}>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: "#fff", marginBottom: 16 }}>
            a antena gasta <span style={{ color: LARANJA }}>menos</span> que uma lâmpada antiga
          </div>
          {[["antena", 0.55, "antena"], ["lâmpada antiga", 1, "lampada"]].map(([nome, w, ico]) => (
            <div key={nome as string} style={{ display: "flex", alignItems: "center", gap: 14, height: 54 }}>
              <div style={{ width: 44, height: 44, borderRadius: 99, background: nome === "antena" ? LARANJA : "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico n={ico as IcoN} s={26} />
              </div>
              <div style={{ width: 210, fontFamily: FONTE, fontWeight: 500, fontSize: 28, color: "rgba(255,255,255,0.9)" }}>{nome as string}</div>
              <div style={{ height: 22, width: 300 * (w as number) * bar, borderRadius: 11, background: nome === "antena" ? LARANJA : "#ffd27a" }} />
            </div>
          ))}
        </div>
      </div>,
    );
  }
  return <>{out}</>;
};

// ------------------------------------------------------------------ NA PONTA DO LÁPIS: etiquetas, coluna de soma, total e mensalidade
type Item = { id: string; nome: string; valor: string; sub?: string; t: number; p: V3; esc: number; ico: IcoN; prova?: { t: number; texto: string } };
const ITENS = (): Item[] => [
  { id: "comida", nome: "comida", valor: "~R$ 15 mil", sub: "Sisteminha", t: M.pQuinze, p: [P.tanque[0], 0.45, P.tanque[2]], esc: 0.95, ico: "peixe", prova: undefined },
  { id: "agua", nome: "água", valor: "R$ 7 a 9 mil", sub: "tabela do governo", t: M.pSete, p: [P.cist[0], 1.0, P.cist[2]], esc: 0.95, ico: "gota", prova: { t: M.pTabela, texto: "Governo federal · Cisternas" } },
  { id: "luz", nome: "luz", valor: "~R$ 45 mil", sub: "Luz para Todos", t: M.pQuarenta, p: [P.placas[0], 1.45, P.placas[2]], esc: 1.32, ico: "raio", prova: { t: M.pLuzTodos, texto: "Luz para Todos" } },
  { id: "antena", nome: "antena", valor: "~R$ 1.200", sub: "antena", t: M.pMil, p: [P.ant[0], 0.8, P.ant[2]], esc: 0.95, ico: "antena" },
];
const TOTAL_Y = 800;
export const PontaDoLapis: React.FC<{ t: number; e: Estado }> = ({ t, e }) => {
  const a = M.ponta - 0.1, b = M.virada + 0.02;
  if (t < a || t > b) return null;
  const o = 1 - k01(t, b - 0.15, b);
  const voa = eio(k01(t, M.perto, M.setentaE - 0.05));
  const pTot = mola(k01(t, M.setentaE - 0.08, M.setentaE + 0.4));
  const pMes = mola(k01(t, M.cento - 0.05, M.cento + 0.45));
  const itens = ITENS();
  // coluna de soma (papel no canto)
  const colEnt = eo(k01(t, M.ponta, M.ponta + 0.4));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 40, top: 280, width: 420, padding: "18px 26px 16px", borderRadius: 14, background: "#fbf6ea", boxShadow: "0 18px 40px rgba(0,0,0,0.45)", transform: `translateX(${(1 - colEnt) * -480}px) rotate(-2deg)`, backgroundImage: "repeating-linear-gradient(#fbf6ea 0 52px, #d7e3f2 52px 54px)" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: "#8a7f6a", marginBottom: 6 }}>NA PONTA DO LÁPIS</div>
        {itens.map((it) => {
          const k = k01(t, it.t - 0.05, it.t + 0.25);
          return (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", height: 54, opacity: k, transform: `translateX(${(1 - k) * 20}px)` }}>
              <span style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 32, color: "#3a3428" }}>{it.nome}</span>
              <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: "#1e1a12" }}>{it.valor.replace("~", "")}</span>
            </div>
          );
        })}
        <div style={{ height: 4, background: "#1e1a12", margin: "6px 0 4px", transformOrigin: "left", transform: `scaleX(${eo(k01(t, M.total - 0.1, M.total + 0.3))})` }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", height: 52, opacity: k01(t, M.setenta - 0.05, M.setenta + 0.2) }}>
          <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: "#3a3428" }}>total</span>
          <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 36, color: LARANJA }}>≈ R$ 70 mil</span>
        </div>
      </div>
      {/* etiquetas em cada peça (aparecem no preço) e voam para o total */}
      {itens.map((it, idx) => {
        if (t < it.t - 0.05) return null;
        const [px, py] = projeta(e, it.p);
        const prox = idx < itens.length - 1 ? itens[idx + 1].t - 0.2 : M.total - 0.2;
        // fase: ativa (grande, com linha e prova) -> chip pequeno (ou some fora do quadro) -> reaparece no "Total" e voa
        const ativa = t < prox;
        const volta = k01(t, M.total - 0.25, M.total + 0.2);
        const dentro = px > 150 && px < 930 && py > 820 && py < 1180;
        const ax = fix(px, 230, 850);
        let ay = fix(py - 120 * it.esc, 330, 1120);
        if (ax < 560 && ay < 800) ay = 800; // não encosta no papel da conta
        const tx = 540, ty = TOTAL_Y + 60;
        const x = ax + (tx - ax) * voa, y = ay + (ty - ay) * voa;
        const pop = mola(k01(t, it.t - 0.05, it.t + 0.4));
        const pv = it.prova ? mola(k01(t, it.prova.t - 0.05, it.prova.t + 0.4)) : 0;
        const encolhe = eo(k01(t, prox, prox + 0.25)) * (1 - volta);
        const visChip = ativa ? 1 : volta > 0 ? volta : dentro ? 1 : 1 - k01(t, prox, prox + 0.2);
        const esc = (0.6 + 0.4 * pop) * (1 - 0.4 * encolhe) * (1 - 0.55 * voa);
        return (
          <React.Fragment key={it.id}>
            {voa < 0.05 && ativa && (
              <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: c01(pop * 1.5) * (1 - k01(t, prox - 0.15, prox)) }}>
                <line x1={px} y1={py} x2={ax} y2={ay} stroke="rgba(255,255,255,0.85)" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
                <circle cx={px} cy={py} r={8} fill={LARANJA} stroke="#fff" strokeWidth={3} />
              </svg>
            )}
            <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${esc})`, opacity: c01(pop * 1.6) * visChip * (1 - k01(voa, 0.85, 1)) }}>
              <Pilula ico={it.ico} texto={<span style={{ color: it.id === "luz" ? LARANJA : "#fff" }}>{it.valor}</span>} destaque={it.id === "luz"} esc={it.esc} />
              {it.prova && (
                <div style={{ position: "absolute", left: "50%", top: "100%", marginTop: 10, transform: `translateX(-50%) scale(${pv})`, opacity: c01(pv * 1.6) * (ativa ? 1 - k01(t, prox - 0.15, prox) : 0), whiteSpace: "nowrap", padding: "8px 18px", borderRadius: 999, background: "rgba(255,255,255,0.95)", fontFamily: FONTE, fontWeight: 700, fontSize: 26 * it.esc, color: "#13202c", display: "flex", alignItems: "center", gap: 8 }}>
                  <Ico n="check" s={26 * it.esc} cor="#1f7a46" />
                  {it.prova.texto}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
      {/* total sobre o sítio */}
      {t >= M.setentaE - 0.08 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: TOTAL_Y, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${0.6 + 0.4 * pTot})`, opacity: c01(pTot * 1.6) }}>
          <div style={{ padding: "18px 46px 22px", borderRadius: 40, background: CARTAO, border: `4px solid ${LARANJA}`, boxShadow: "0 20px 50px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.75)" }}>COMIDA + ÁGUA + LUZ + ANTENA</div>
            <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 132, color: LARANJA, letterSpacing: -3, lineHeight: 1.0, marginTop: 4 }}>≈ R$ 70 mil</div>
          </div>
        </div>
      )}
      {t >= M.cento - 0.05 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: TOTAL_Y + 300, display: "flex", justifyContent: "center", transform: `scale(${0.6 + 0.4 * pMes})`, opacity: c01(pMes * 1.6) }}>
          <Pilula ico="antena" texto={<>+ <span style={{ color: LARANJA }}>R$ 190/mês</span> · internet</>} esc={0.82} tracejado />
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ virada: onda da voz vira rosto de linhas; caixa de prompt
const rosto = (x: number, y: number) => {
  const cab = Math.max(0, 1 - (x * x) / 0.42 - ((y + 0.05) * (y + 0.05)) / 0.78);
  if (cab <= 0) return 0;
  let h = Math.sqrt(cab) * 0.55;
  h += 0.32 * Math.exp(-(x * x) / 0.006 - ((y - 0.05) ** 2) / 0.05);
  h -= 0.14 * (Math.exp(-((x - 0.22) ** 2) / 0.01 - ((y + 0.22) ** 2) / 0.006) + Math.exp(-((x + 0.22) ** 2) / 0.01 - ((y + 0.22) ** 2) / 0.006));
  h += 0.1 * Math.exp(-((y + 0.42) ** 2) / 0.012) * Math.exp(-(x * x) / 0.12);
  h += 0.08 * Math.exp(-((y - 0.38) ** 2) / 0.004 - (x * x) / 0.03);
  return h;
};
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
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
  const txt = "maquete de um sítio que se monta peça a peça: tanque de tilápia, cisterna, placas solares e antena";
  const n = Math.floor(txt.length * k01(t, a + 0.1, b - 0.35));
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
  const dig = "PLAY".slice(0, Math.floor(4 * k01(t, M.play + 0.3, M.play + 0.62)));
  const enviado = t > M.play + 1.0;
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
      {dedo(1080 - 70 - 100, 460 + 55, M.play + 0.85)}
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
  gancho: acha("com setenta mil reais"),
  internetQ: acha("internet"),
  quinze1: acha("quinze mil reais"),
  trinta: acha("trinta a quarenta quilos"),
  cem: acha("cem dias"),
  quatro: acha("quatro placas"),
  quinhentos: acha("quinhentos quilometros"),
  pQuinze: acha("quinze mil", acha("na ponta do lapis")),
  sete: acha("sete a nove mil"),
  quarenta: acha("quarenta e cinco mil"),
  mil12: acha("mil e duzentos"),
  setenta: acha("setenta mil reais", acha("total")),
  cento: acha("cento e noventa por mes"),
};
const GRAFIA: Record<number, string> = {
  [I.quinze1]: "R$ 15", [I.quinze1 + 1]: "mil", [I.quinze1 + 2]: "",
  [I.trinta]: "30", [I.trinta + 2]: "40", [I.trinta + 3]: "kg",
  [I.cem]: "100",
  [I.quatro]: "4",
  [I.quinhentos]: "500", [I.quinhentos + 1]: "km",
  [I.pQuinze]: "R$ 15",
  [I.sete]: "R$ 7",
  [I.sete + 2]: "9",
  [I.quarenta]: "R$ 45", [I.quarenta + 1]: "", [I.quarenta + 2]: "",
  [I.mil12]: "R$ 1.200.", [I.mil12 + 1]: "", [I.mil12 + 2]: "",
  [I.setenta]: "R$ 70", [I.setenta + 1]: "mil.", [I.setenta + 2]: "",
  [I.cento]: "R$ 190", [I.cento + 1]: "", [I.cento + 2]: "",
};
const OCULTA: [number, number][] = [
  [I.gancho, I.internetQ], // o texto de tela do gancho diz o mesmo
];
const oculta = (i: number) => OCULTA.some(([a, b]) => i >= a && i <= b);
const bruto = (i: number) => (GRAFIA[i] !== undefined ? GRAFIA[i] : W[i].w);
const txt = (i: number) => bruto(i).replace(/[.,]$/g, "");
type Grupo = { ini: number; fim: number; ids: number[] };
const MAXC = 28;
const fimFrase = (i: number) => /[.?!]$/.test(W[i].w) || /[.?!]$/.test(bruto(i));
const GRUPOS: Grupo[] = (() => {
  const trechos: number[][] = [];
  let cur: number[] = [];
  const fecha = () => {
    if (cur.length) trechos.push(cur);
    cur = [];
  };
  W.forEach((p, i) => {
    if (oculta(i)) return fecha();
    if (!txt(i)) {
      if (/[.?!,]$/.test(p.w)) fecha();
      return;
    }
    cur.push(i);
    if (/[.?!,]$/.test(p.w)) fecha();
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
      const unidade = j < tr.length - 1 && /^(kg|km|mil|mil\.|dias)$/.test(txt(tr[j + 1]));
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
const MAIUSC = new Set(["ia"]);
const I_PLAY = acha("comenta play") + 1;
const PROPRIOS: Record<string, string> = { sisteminha: "Sisteminha", embrapa: "Embrapa" };
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
            if (MAIUSC.has(w.toLowerCase()) || i === I_PLAY) w = w.toUpperCase();
            if (PROPRIOS[w.toLowerCase()]) w = PROPRIOS[w.toLowerCase()];
            if (j === 0 && /^[a-zà-ú]/.test(w) && i > 0 && /[.?!]$/.test(W[i - 1].w)) w = w[0].toUpperCase() + w.slice(1);
            const num = /\d/.test(w) || (w === "mil" && /\d/.test(txt(g.ids[j - 1] ?? 0))) || ((w === "kg" || w === "km") && /\d/.test(txt(g.ids[j - 1] ?? 0)));
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
