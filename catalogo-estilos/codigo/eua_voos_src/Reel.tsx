import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE, MONO, TITULO } from "./comp/fontes";
import { Escurece, Ilustracao, LAR, LARANJA, SeloUrgente, TINTA, VERM } from "./comp/Overlay";
import { c01, eio, eo, estadoEm, k01, LOOP_A, LOOP_B, M, projeta } from "./linha";
import { PALAVRAS } from "./fala";
import { ll } from "./three/geo";
import { SOM } from "./marcos_som";

const VERDE = "#2BD98A";
const SOMBRA = "0 4px 18px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.6)";
const mola = (x: number) => { const t = c01(x); return t <= 0 ? 0 : 1 - Math.exp(-t * 7) * Math.cos(t * 9); };
const vis = (t: number, a: number, b: number, fi = 0.2, fo = 0.15) => (a <= -1 ? 1 - k01(t, b - fo, b) : Math.min(k01(t, a, a + fi), 1 - k01(t, b - fo, b)));

// ------------------------------------------------------------------ título em duas cores (palavras entre * levam a cor de acento)
type Lin = { s: string; c?: string; ac?: string; z?: number };
const Linha: React.FC<{ l: Lin; tam: number }> = ({ l, tam }) => (
  <div style={{ fontFamily: TITULO, fontSize: l.z ?? tam, lineHeight: 0.93, color: l.c ?? "#fff", textShadow: SOMBRA, letterSpacing: 1 }}>
    {l.s.split(/(\*[^*]+\*)/g).filter(Boolean).map((p, i) => (p.startsWith("*") ? <span key={i} style={{ color: l.ac ?? VERM }}>{p.slice(1, -1)}</span> : <span key={i}>{p}</span>))}
  </div>
);
const Tit: React.FC<{ t: number; a: number; b: number; linhas: Lin[]; tam?: number; top?: number; sub?: string; subA?: number; subCor?: string; pulsoEm?: number }> = ({ t, a, b, linhas, tam = 150, top = 335, sub, subA, subCor, pulsoEm }) => {
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.16, 0.12);
  const ent = a <= -1 ? 1 : eo(k01(t, a, a + 0.28));
  const pulso = pulsoEm !== undefined && t >= pulsoEm ? 1 + 0.07 * Math.exp(-(t - pulsoEm) * 7) * Math.cos((t - pulsoEm) * 20) : 1;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: o, transform: `translateY(${(1 - ent) * 34}px) scale(${pulso})`, transformOrigin: "50% 30%" }}>
      {linhas.map((l, i) => <Linha key={i} l={l} tam={tam} />)}
      {sub && <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, letterSpacing: 4, color: subCor ?? "rgba(255,255,255,0.85)", marginTop: 16, textShadow: SOMBRA, opacity: subA === undefined ? 1 : k01(t, subA, subA + 0.2) }}>{sub}</div>}
    </div>
  );
};

/** selo de fonte (etiqueta arredondada, mono) */
const Selo: React.FC<{ t: number; a: number; b: number; texto: string; top: number; cor?: string; borda?: string }> = ({ t, a, b, texto, top, cor = "#fff", borda = "rgba(255,255,255,0.3)" }) => {
  if (t < a || t >= b) return null;
  const p = mola(k01(t, a, a + 0.45));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: c01(p * 1.5) * (1 - k01(t, b - 0.15, b)) }}>
      <div style={{ transform: `scale(${0.75 + 0.25 * p})`, padding: "12px 26px", borderRadius: 999, background: "rgba(8,10,16,0.86)", border: `1.5px solid ${borda}`, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", fontFamily: MONO, fontWeight: 800, fontSize: 29, letterSpacing: 2, color: cor, whiteSpace: "nowrap" }}>{texto}</div>
    </div>
  );
};

/** carimbo (INVESTIGADA, EMPRESA NEGA) */
const Carimbo: React.FC<{ t: number; a: number; b: number; texto: string; cor: string; top: number; rot: number; x?: number }> = ({ t, a, b, texto, cor, top, rot, x = 540 }) => {
  if (t < a || t >= b) return null;
  const k = k01(t, a, a + 0.12);
  const s = 1.9 - 0.9 * eo(k);
  const tremor = t - a < 0.25 ? Math.sin((t - a) * 90) * 6 * (1 - k01(t, a, a + 0.25)) : 0;
  return (
    <div style={{ position: "absolute", left: x, top, transform: `translate(-50%,0) rotate(${rot}deg) scale(${s}) translate(${tremor}px, 0)`, opacity: c01(k * 1.5) * (1 - k01(t, b - 0.15, b)) }}>
      <div style={{ fontFamily: TITULO, fontSize: 118, letterSpacing: 6, color: cor, padding: "6px 36px 0", border: `10px solid ${cor}`, borderRadius: 18, background: "rgba(5,6,10,0.55)", whiteSpace: "nowrap", boxShadow: `0 0 34px ${cor}66`, textShadow: `0 0 18px ${cor}88` }}>{texto}</div>
    </div>
  );
};

// ------------------------------------------------------------------ alerta da FAA digitado + tradução palavra a palavra
const EN: [string, number, number][] = [
  ["ALL AIRPORTS ARE GROUND STOPPED", 12.55, 13.18],
  ["DUE TO EXTRAORDINARY CIRCUMSTANCES AND FOR REASONS OF SAFETY…", 14.42, 15.22],
  ["UNTIL FURTHER NOTICE", 16.85, 17.45],
];
const PT: [string, number, string][][] = [
  [["TODOS", M.todos, LAR], ["OS", M.os, LAR], ["AEROPORTOS", M.aeroportos, LAR], ["PARADOS", M.parados, LAR]],
  [["POR", M.por, LAR], ["CIRCUNSTÂNCIAS", M.circ, LAR], ["EXTRAORDINÁRIAS", M.extra, LAR]],
  [["ATÉ", M.ate, VERM], ["NOVO", M.novo, VERM], ["AVISO", M.aviso, VERM]],
];
const Alerta: React.FC<{ t: number }> = ({ t }) => {
  const a = M.curto + 0.05, b = M.segundo;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.2, 0.15);
  const cur = Math.floor(t * 3) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: 56, right: 56, top: 590, opacity: o, transform: `translateY(${(1 - eo(k01(t, a, a + 0.3))) * 40}px)` }}>
      <div style={{ background: "rgba(8,9,13,0.9)", border: "1.5px solid rgba(255,255,255,0.16)", borderTop: `6px solid ${VERM}`, borderRadius: 14, padding: "26px 32px 30px", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: VERM, marginBottom: 18 }}>ALERTA REAL DA FAA · TRADUÇÃO</div>
        {EN.map(([en, ia, ib], i) => {
          const n = Math.floor(en.length * k01(t, ia, ib));
          if (t < ia) return null;
          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 31, lineHeight: 1.3, color: "#e8ebf2", minHeight: 40 }}>
                {en.slice(0, n)}
                {n < en.length && cur ? <span style={{ background: "#e8ebf2", color: "#e8ebf2" }}>_</span> : null}
              </div>
              <div style={{ fontFamily: TITULO, fontSize: i === 2 ? 92 : 64, lineHeight: 1.0, marginTop: 6, display: "flex", flexWrap: "wrap", gap: "0 18px" }}>
                {PT[i].map(([w, wt, cor]) => (
                  <span key={w} style={{ color: cor, opacity: t >= wt - 0.03 ? 1 : 0.0, transform: `translateY(${(1 - eo(k01(t, wt - 0.03, wt + 0.15))) * 14}px)`, display: "inline-block", textShadow: `0 0 22px ${cor}55` }}>{w}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** riscos sobre RADAR e RÁDIO */
const Riscos: React.FC<{ t: number }> = ({ t }) => {
  const a = M.radar - 0.08, b = M.fontes;
  if (t < a || t >= b) return null;
  const item = (txt: string, x: number, ta: number) => {
    const r = eo(k01(t, ta + 0.25, ta + 0.5));
    const p = mola(k01(t, ta - 0.08, ta + 0.35));
    return (
      <div style={{ position: "absolute", left: x, top: 1140, transform: `translateX(-50%) scale(${0.7 + 0.3 * p})`, opacity: c01(p * 1.5) * (1 - k01(t, b - 0.15, b)) }}>
        <div style={{ position: "relative", fontFamily: TITULO, fontSize: 112, color: "#fff", textShadow: SOMBRA, letterSpacing: 4, padding: "0 12px" }}>
          {txt}
          <div style={{ position: "absolute", left: -8, top: "44%", height: 13, width: `${r * 106}%`, background: VERM, borderRadius: 7, transform: "rotate(-5deg)", boxShadow: "0 0 18px rgba(229,50,45,0.85)" }} />
        </div>
      </div>
    );
  };
  return (
    <>
      {item("RADAR", 320, M.radar)}
      {item("RÁDIO", 760, M.radio)}
    </>
  );
};

/** atualização 100% -> REBOOT -> o mapa apaga e volta */
const Atualizacao: React.FC<{ t: number }> = ({ t }) => {
  const a = M.uma - 0.05, b = SOM.desliga;
  const out: React.ReactNode[] = [];
  if (t >= a && t < b) {
    const p = eio(k01(t, M.atualizacao, M.reiniciar + 0.2));
    out.push(
      <div key="u" style={{ position: "absolute", left: 90, right: 90, top: 1060, opacity: k01(t, a, a + 0.2) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 800, fontSize: 34, color: "#fff", letterSpacing: 3, marginBottom: 14, textShadow: SOMBRA }}>
          <span>UPDATE</span>
          <span style={{ color: p >= 1 ? LAR : "#fff" }}>{Math.round(p * 100)}%</span>
        </div>
        <div style={{ height: 30, borderRadius: 8, border: "2px solid rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.6)", padding: 4 }}>
          <div style={{ height: "100%", width: `${p * 100}%`, borderRadius: 4, background: `repeating-linear-gradient(90deg, ${LAR} 0 26px, #c9822c 26px 32px)`, boxShadow: `0 0 20px ${LAR}88` }} />
        </div>
      </div>,
    );
  }
  // tela preta com REBOOT
  if (t >= SOM.desliga && t < M.eCair + 0.5) {
    const preto = t < M.eCair ? 1 : (1 - k01(t, M.eCair, M.eCair + 0.5)) * (Math.sin(t * 70) > 0 ? 0.9 : 0.3);
    const txt = t < M.eCair;
    const cur = Math.floor(t * 4) % 2 === 0;
    out.push(
      <div key="r" style={{ position: "absolute", inset: 0, background: "#000", opacity: preto }}>
        {txt && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", opacity: t - SOM.desliga < 0.12 ? (Math.sin(t * 90) > 0 ? 1 : 0) : 1 }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, letterSpacing: 18, color: "#fff" }}>REBOOT{cur ? "_" : " "}</div>
            <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.55)", marginTop: 18 }}>reiniciando a rede…</div>
          </div>
        )}
      </div>,
    );
  }
  return <>{out}</>;
};

// ------------------------------------------------------------------ painel de embarque (CANCELADO / ATRASADO em cascata)
const Painel: React.FC<{ t: number }> = ({ t }) => {
  const a = M.emTerra, b = M.parar;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.25, 0.15);
  const linhas = 7;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 690, opacity: o, transform: `translateY(${(1 - eo(k01(t, a, a + 0.3))) * 40}px)` }}>
      <div style={{ background: "rgba(6,7,10,0.92)", borderRadius: 16, border: "1.5px solid rgba(255,255,255,0.14)", padding: "18px 22px", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: "rgba(255,255,255,0.55)", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <span>PARTIDAS</span>
          <span>SITUAÇÃO</span>
        </div>
        {Array.from({ length: linhas }).map((_, i) => {
          const atr = i % 3 === 1;
          const ti = (atr ? M.dez : M.dois) + i * 0.09 - 0.15;
          const k = k01(t, ti, ti + 0.18);
          const virou = k >= 0.5;
          const status = virou ? (atr ? "ATRASADO" : "CANCELADO") : "PREVISTO";
          const cor = virou ? (atr ? LAR : VERM) : "#8e96a8";
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < linhas - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#dfe3ea", letterSpacing: 3 }}>VOO ••••</span>
              <span style={{ display: "inline-block", minWidth: 290, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: cor, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "4px 10px", transform: `scaleY(${Math.abs(1 - 2 * k) * 0.9 + 0.1})` }}>{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** números do estrago, um por vez, na palavra */
const Numeros: React.FC<{ t: number }> = ({ t }) => {
  const out: React.ReactNode[] = [];
  if (t >= M.mais && t < M.emTerra) {
    const p = mola(k01(t, M.tres - 0.06, M.tres + 0.4));
    out.push(
      <div key="3" style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: 1 - k01(t, M.emTerra - 0.15, M.emTerra) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: "rgba(255,255,255,0.85)", textShadow: SOMBRA, opacity: k01(t, M.mais, M.mais + 0.2) }}>MAIS DE</div>
        <div style={{ fontFamily: TITULO, fontSize: 260, lineHeight: 0.95, color: LAR, textShadow: SOMBRA, transform: `scale(${0.6 + 0.4 * p})`, opacity: c01(p * 1.6) }}>3 MIL</div>
        <div style={{ fontFamily: TITULO, fontSize: 110, lineHeight: 0.9, color: "#fff", textShadow: SOMBRA, opacity: c01(p * 1.6) }}>NO AR</div>
      </div>,
    );
  }
  if (t >= M.emTerra && t < M.parar) {
    const o = 1 - k01(t, M.parar - 0.15, M.parar);
    const p1 = mola(k01(t, M.dois - 0.06, M.dois + 0.4)), p2 = mola(k01(t, M.dez - 0.06, M.dez + 0.4));
    out.push(
      <div key="em" style={{ position: "absolute", left: 0, right: 0, top: 320, textAlign: "center", opacity: o }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: "rgba(255,255,255,0.85)", textShadow: SOMBRA }}>EM TERRA · MAIS DE</div>
        <div style={{ fontFamily: TITULO, fontSize: 132, lineHeight: 0.98, color: VERM, textShadow: SOMBRA, transform: `scale(${0.6 + 0.4 * p1})`, opacity: c01(p1 * 1.6) }}>2 MIL CANCELADOS</div>
        <div style={{ fontFamily: TITULO, fontSize: 132, lineHeight: 0.98, color: LAR, textShadow: SOMBRA, transform: `scale(${0.6 + 0.4 * p2})`, opacity: c01(p2 * 1.6) }}>10 MIL ATRASADOS</div>
      </div>,
    );
  }
  return <>{out}</>;
};

// ------------------------------------------------------------------ linha do tempo 2001 · 2023 · HOJE
const LinhaTempo: React.FC<{ t: number }> = ({ t }) => {
  const a = M.so - 0.1, b = M.em2023 + 0.35;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.2, 0.2);
  const pts: [string, number, string][] = [["2001", M.duas, "#fff"], ["2023", M.duas + 0.28, "#fff"], ["HOJE", M.vezes + 0.05, VERM]];
  const lx = 140, rx = 940;
  const linha = eo(k01(t, a, a + 0.6));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1000, height: 220, opacity: o }}>
      <div style={{ position: "absolute", left: lx, top: 60, height: 6, width: (rx - lx) * linha, background: "rgba(255,255,255,0.55)", borderRadius: 3 }} />
      {pts.map(([s, ta, cor], i) => {
        const x = lx + ((rx - lx) * i) / 2;
        const p = mola(k01(t, ta - 0.05, ta + 0.4));
        const zoom = t >= M.em2023 && i === 1 ? 1 + 0.25 * eo(k01(t, M.em2023, M.em2023 + 0.3)) : 1;
        return (
          <div key={s} style={{ position: "absolute", left: x, top: 0, transform: `translateX(-50%) scale(${(0.5 + 0.5 * p) * zoom})`, opacity: c01(p * 1.6), textAlign: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, margin: "45px auto 14px", background: cor, boxShadow: `0 0 26px ${cor}`, border: "5px solid #0b0c10" }} />
            <div style={{ fontFamily: TITULO, fontSize: 92, color: cor, textShadow: SOMBRA, lineHeight: 1 }}>{s}</div>
          </div>
        );
      })}
    </div>
  );
};

/** 2023: pasta com arquivos sumindo, cursor clica em EXCLUIR */
const Pasta: React.FC<{ t: number }> = ({ t }) => {
  const a = M.em2023 + 0.2, b = M.e11;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.25, 0.15);
  const clique = M.apagou;
  const cx = 760 - 300 * (1 - eio(k01(t, clique - 0.9, clique - 0.1))), cy = 1215 - 260 * (1 - eio(k01(t, clique - 0.9, clique - 0.1)));
  const apertado = t >= clique && t < clique + 0.12;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 640, transform: `translateY(${(1 - eo(k01(t, a, a + 0.3))) * 40}px)`, background: "rgba(14,16,22,0.95)", border: "1.5px solid rgba(255,255,255,0.16)", borderRadius: 18, boxShadow: "0 26px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", background: "rgba(255,255,255,0.05)", fontFamily: MONO, fontWeight: 700, fontSize: 26, color: "rgba(255,255,255,0.75)", letterSpacing: 2 }}>
          <span style={{ width: 16, height: 16, borderRadius: 99, background: "#e5534b" }} />
          <span style={{ width: 16, height: 16, borderRadius: 99, background: "#e0b13c" }} />
          <span style={{ width: 16, height: 16, borderRadius: 99, background: "#4dbb5f" }} />
          <span style={{ marginLeft: 14 }}>ARQUIVOS DO SISTEMA</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26, padding: "34px 40px 30px" }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const s = 1 - eio(k01(t, clique + 0.12 + i * 0.1, clique + 0.32 + i * 0.1));
            return (
              <div key={i} style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})`, opacity: s }}>
                <svg width={84} height={108} viewBox="0 0 84 108">
                  <path d="M6 4h50l22 22v76a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="#d9dde6" />
                  <path d="M56 4v22h22" fill="#aab1bf" />
                  {[44, 58, 72, 86].map((y) => <rect key={y} x={14} y={y} width={52} height={6} rx={3} fill="#9aa3b3" />)}
                </svg>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 40px 30px" }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, letterSpacing: 3, color: "#fff", background: apertado ? "#a51f1a" : VERM, padding: "14px 34px", borderRadius: 10, transform: `scale(${apertado ? 0.94 : 1})` }}>EXCLUIR</div>
        </div>
      </div>
      <svg width={60} height={70} viewBox="0 0 24 28" style={{ position: "absolute", left: cx, top: cy, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}>
        <path d="M2 1l18 13-8 1.5 4.5 9-3.5 1.7-4.5-9L2 22z" fill="#fff" stroke="#111" strokeWidth={1.4} />
      </svg>
    </div>
  );
};

/** 11 de setembro: relógio 9h45 -> 12h15 e VAZIO */
const Relogio: React.FC<{ t: number }> = ({ t }) => {
  const a = M.emDuas - 0.05, b = M.espanta;
  if (t < a || t >= b) return null;
  const min = Math.round(585 + 150 * eio(k01(t, M.emDuas, M.vazio - 0.2)));
  const h = Math.floor(min / 60), mm = String(min % 60).padStart(2, "0");
  const o = vis(t, a, b, 0.15, 0.15);
  const vz = mola(k01(t, M.vazio - 0.04, M.vazio + 0.45));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: o }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: "#cfe2ff", textShadow: SOMBRA }}>11 SET 2001</div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 170, letterSpacing: 4, color: "#fff", textShadow: "0 0 30px rgba(160,200,255,0.45)", lineHeight: 1.05 }}>{`${h}h${mm}`}</div>
      <div style={{ fontFamily: TITULO, fontSize: 230, letterSpacing: 26, color: "#fff", lineHeight: 0.95, marginTop: 380, opacity: c01(vz * 1.6), transform: `scale(${0.7 + 0.3 * vz})`, textShadow: "0 0 40px rgba(0,0,0,0.9)" }}>VAZIO</div>
    </div>
  );
};

/** rótulo de São Paulo preso ao ponto 3D */
const RotuloSP: React.FC<{ t: number }> = ({ t }) => {
  const a = M.brasil - 0.1, b = M.se;
  if (t < a || t >= b) return null;
  const e = estadoEm(t);
  const sp = ll(-46.63, -23.55);
  const [x, y] = projeta(e.cam!, [sp[0], 0.1, sp[1]]);
  const p = mola(k01(t, a, a + 0.4));
  return (
    <div style={{ position: "absolute", left: x, top: Math.min(y + 40, 1270), transform: `translateX(-50%) scale(${0.6 + 0.4 * p})`, opacity: c01(p * 1.5) * (1 - k01(t, b - 0.15, b)), fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${LAR}` }}>SÃO PAULO</div>
  );
};

// ------------------------------------------------------------------ camada IA: virada, prompt + voz -> rosto, Seguir, PLAY, logo
const ViradaCartela: React.FC<{ t: number }> = ({ t }) => {
  const a = M.esseVideo, b = M.ate3 - 0.05;
  if (t < a || t >= b) return null;
  const pal: [string, number][] = [["Esse", M.esseVideo], ["vídeo", PALAVRAS[238].a], ["foi", PALAVRAS[239].a]];
  const pal2: [string, number][] = [["feito", M.feito], ["com", PALAVRAS[241].a]];
  const w = (s: string, ta: number) => <span key={s} style={{ opacity: k01(t, ta - 0.04, ta + 0.1), display: "inline-block", transform: `translateY(${(1 - eo(k01(t, ta - 0.04, ta + 0.2))) * 20}px)`, marginRight: 24 }}>{s}</span>;
  const pia = mola(k01(t, M.ia - 0.04, M.ia + 0.4));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", opacity: 1 - k01(t, b - 0.15, b) }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 112, lineHeight: 1.04, color: "#fff", letterSpacing: -2, textShadow: "0 0 40px rgba(11,16,38,0.95)" }}>
        <div>{pal.map(([s, ta]) => w(s, ta))}</div>
        <div>
          {pal2.map(([s, ta]) => w(s, ta))}
          <span style={{ color: LARANJA, display: "inline-block", transform: `scale(${0.5 + 0.5 * pia})`, opacity: c01(pia * 1.6), textShadow: `0 0 30px ${LARANJA}88` }}>IA</span>
        </div>
      </div>
    </div>
  );
};

const PERFIL = "M300 70c-60 0-104 40-112 98-4 26 4 44-8 62l-28 40c-6 10 0 18 12 20l18 4-2 30c0 14 10 24 24 24h30c10 0 16 8 16 18v40";
const VozRosto: React.FC<{ t: number }> = ({ t }) => {
  const a = M.ate3 - 0.05, b = M.quer;
  if (t < a || t >= b) return null;
  const o = vis(t, a, b, 0.15, 0.15);
  const prompt = "um reel de plantão sobre os voos parados nos EUA";
  const n = Math.floor(prompt.length * k01(t, a + 0.05, a + 0.85));
  const morf = eio(k01(t, M.voz - 0.1, M.voz + 0.45));
  const pts = Array.from({ length: 80 }, (_, i) => {
    const x = 90 + i * 11.4;
    const env = Math.sin((i / 79) * Math.PI);
    const y = 150 + Math.sin(i * 0.55 + t * 18) * 60 * env * (0.6 + 0.4 * Math.sin(i * 0.17 + t * 7));
    return `${x},${y}`;
  }).join(" ");
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 560, padding: "30px 34px", borderRadius: 28, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.25)", backdropFilter: "blur(14px)", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: 4, color: "rgba(255,255,255,0.55)", marginBottom: 12 }}>PROMPT</div>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, lineHeight: 1.2, color: "#fff" }}>
          {prompt.slice(0, n)}
          <span style={{ display: "inline-block", width: 22, height: 50, marginLeft: 4, verticalAlign: "-8px", background: LARANJA, opacity: Math.floor(t * 4) % 2 ? 1 : 0.3 }} />
        </div>
      </div>
      <svg width={1080} height={420} style={{ position: "absolute", left: 0, top: 860 }}>
        <polyline points={pts} fill="none" stroke={LARANJA} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={1 - morf} style={{ filter: `drop-shadow(0 0 10px ${LARANJA})` }} />
        <g transform="translate(240 -40) scale(1.25)" opacity={morf}>
          <path d={PERFIL} fill="none" stroke={LARANJA} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - morf} style={{ filter: `drop-shadow(0 0 10px ${LARANJA})` }} />
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${330 + i * 22} ${150 - i * 8}c30 30 30 90 0 ${120 + i * 16}`} fill="none" stroke={LARANJA} strokeWidth={4} opacity={0.65 - i * 0.12} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - morf} />)}
        </g>
      </svg>
    </div>
  );
};

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
  const toque = SOM.toque;
  const seguiu = t >= toque + 0.06;
  const k = k01(t, toque, toque + 0.35);
  const dx = 760 + 120 * (1 - eio(k01(t, toque - 0.5, toque))), dy = 900 + 160 * (1 - eio(k01(t, toque - 0.5, toque)));
  const playN = Math.floor(4 * k01(t, M.play - 0.08, M.play + 0.3));
  const enviado = t >= M.play + 0.55;
  const grupo = mola(k01(t, M.grupo - 0.1, M.grupo + 0.35));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center" }}>
        {t < M.comenta ? (
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 84, lineHeight: 1.05, color: "#fff", letterSpacing: -1 }}>
            Quer aprender a fazer
            <br />
            vídeos assim?
          </div>
        ) : (
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 110, color: "#fff", letterSpacing: -2 }}>
            Comenta <span style={{ color: LARANJA }}>PLAY</span>
          </div>
        )}
      </div>
      {/* cartão do perfil */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 780, padding: "30px 34px", borderRadius: 30, background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ width: 120, height: 120, borderRadius: 99, background: `linear-gradient(135deg, ${LARANJA}, #ffb347)`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <svg width={60} height={60} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: "#fff" }}>seu.perfil</div>
          <div style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 26, color: "rgba(255,255,255,0.65)" }}>vídeos feitos com IA</div>
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: "#fff", padding: "16px 30px", borderRadius: 16, background: seguiu ? "rgba(255,255,255,0.18)" : "#2f7bf6", transform: `scale(${t >= toque && t < toque + 0.12 ? 0.93 : 1})` }}>{seguiu ? "Seguindo" : "Seguir"}</div>
      </div>
      {/* comentário */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 1030, opacity: k01(t, M.comenta - 0.2, M.comenta + 0.1), display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: `2px solid ${playN > 0 ? LARANJA : "rgba(255,255,255,0.22)"}` }}>
        <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: playN > 0 ? "#fff" : "rgba(255,255,255,0.45)" }}>
          {playN > 0 ? "PLAY".slice(0, playN) : "Adicione um comentário…"}
          {playN > 0 && !enviado && <span style={{ display: "inline-block", width: 5, height: 46, background: LARANJA, marginLeft: 6, verticalAlign: "-6px" }} />}
        </div>
        <div style={{ width: 70, height: 70, borderRadius: 99, background: enviado || playN === 4 ? LARANJA : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={36} height={36} viewBox="0 0 24 24"><path d="M3 20l18-8L3 4v6l12 2-12 2z" fill="#fff" /></svg>
        </div>
      </div>
      {/* link do grupo */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1180, display: "flex", justifyContent: "center", opacity: c01(grupo * 1.5) }}>
        <div style={{ transform: `scale(${0.7 + 0.3 * grupo})`, fontFamily: MONO, fontWeight: 800, fontSize: 28, letterSpacing: 2, color: "#fff", padding: "14px 26px", borderRadius: 999, background: "rgba(255,107,44,0.18)", border: `2px solid ${LARANJA}` }}>LINK DO GRUPO DE LANÇAMENTO</div>
      </div>
      {t < toque + 0.6 && <Dedo x={dx} y={dy} k={k} o={k01(t, toque - 0.6, toque - 0.4) * (1 - k01(t, toque + 0.4, toque + 0.6))} />}
    </div>
  );
};

const Logo: React.FC<{ t: number }> = ({ t }) => {
  const a = M.doPrompt - 0.15, b = LOOP_B;
  if (t < a || t >= b) return null;
  const p = mola(k01(t, a, a + 0.5));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 700, display: "flex", justifyContent: "center", opacity: c01(p * 1.5) * (1 - k01(t, LOOP_A, LOOP_A + 0.2)) }}>
      <Img src={staticFile("logo_dpp.png")} style={{ width: 860, transform: `scale(${0.8 + 0.2 * p})`, filter: "drop-shadow(0 10px 40px rgba(255,107,44,0.35))" }} />
    </div>
  );
};

// ------------------------------------------------------------------ legenda palavra a palavra
type Pedaco = { a: number; b: number; ws: { s: string; a: number }[] };
const FUNC = new Set(["a", "o", "os", "as", "de", "do", "da", "e", "que", "um", "uma", "em", "no", "nos", "com", "para", "por", "se", "só", "não", "há", "esse", "essa", "à"]);
const PEDACOS: Pedaco[] = (() => {
  const P = PALAVRAS.map((w, i) => ({ s: w.w, a: w.a, b: w.b, i }));
  // "duas horas e meia," -> "2h30"
  const k = P.findIndex((w) => w.s === "duas" && P[w.i + 1]?.s === "horas");
  if (k >= 0) P.splice(k, 4, { s: "2h30,", a: P[k].a, b: P[k + 3].b, i: P[k].i });
  const out: Pedaco[] = [];
  let cur: typeof P = [];
  const fecha = () => { if (cur.length) out.push({ a: cur[0].a, b: cur[cur.length - 1].b, ws: cur.map((w) => ({ s: w.s, a: w.a })) }); cur = []; };
  for (const w of P) {
    cur.push(w);
    const txt = cur.map((x) => x.s).join(" ");
    const pont = /[.,?!:]$/.test(w.s);
    const func = FUNC.has(w.s.toLowerCase());
    if (pont || (!func && (cur.length >= 3 || txt.length >= 15)) || cur.length >= 4) fecha();
  }
  fecha();
  for (let i = 0; i < out.length; i++) out[i].b = Math.min(out[i].b + 0.45, out[i + 1]?.a ?? 1e9);
  return out;
})();
const LARANJAS = /\d|^mil$|^IA$|^PLAY$|^disquete$|^vazio$|^2h30$/i;
const Legenda: React.FC<{ t: number }> = ({ t }) => {
  if ((t >= M.esseVideo - 0.08 && t < M.ate3) || (t >= M.quer - 0.05 && t < M.comenta - 0.05) || (t >= M.doPrompt - 0.1 && t < LOOP_B) || (t >= SOM.desliga && t < M.eCair)) return null;
  const p = PEDACOS.find((x) => t >= x.a - 0.05 && t < x.b);
  if (!p) return null;
  const ent = eo(k01(t, p.a - 0.05, p.a + 0.1));
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1345, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 76, lineHeight: 1.06, textAlign: "center", padding: "8px 26px 14px", background: "rgba(5,6,10,0.6)", borderRadius: 22, letterSpacing: -1, transform: `translateY(${(1 - ent) * 10}px)`, opacity: 0.4 + 0.6 * ent }}>
        {p.ws.map((w, i) => {
          const s = w.s.replace(/[.,:]$/g, "");
          const cor = LARANJAS.test(s.replace(/[?!]/g, "")) ? LAR : "#fff";
          return (
            <span key={i} style={{ color: cor, opacity: t >= w.a - 0.04 ? 1 : 0.45, textShadow: SOMBRA }}>
              {s}
              {i < p.ws.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ títulos do plantão
const Titulos: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Tit t={t} a={-1} b={M.em - 0.02} linhas={[{ s: "NENHUM AVIÃO" }, { s: "DECOLA", c: VERM }]} tam={168} top={352} pulsoEm={M.nenhum2} />
    <Tit t={t} a={M.em - 0.02} b={M.nesta} linhas={[{ s: "EM AEROPORTO" }, { s: "NENHUM", c: VERM }]} tam={168} top={352} />
    <Tit t={t} a={M.nesta} b={M.treze - 0.05} linhas={[{ s: "NESTA SEXTA" }]} tam={170} top={360} />
    <Tit t={t} a={M.treze - 0.05} b={M.faa} linhas={[{ s: "13 NOV", c: LAR, z: 250 }]} top={330} sub="SEXTA-FEIRA" />
    <Tit t={t} a={M.faa - 0.03} b={M.mandou} linhas={[{ s: "A *FAA* CONTROLA", ac: LAR }, { s: "O CÉU AMERICANO" }]} tam={124} top={340} />
    <Tit t={t} a={M.mandou} b={M.segundo} linhas={[{ s: "UM ALERTA *CURTO*" }]} tam={124} top={380} />
    <Tit t={t} a={M.segundo} b={M.caiu} linhas={[{ s: "SEGUNDO O SECRETÁRIO" }, { s: "DE *TRANSPORTES*", ac: LAR }]} tam={112} top={340} />
    <Tit t={t} a={M.caiu} b={M.fontes} linhas={[{ s: "CAIU A COMUNICAÇÃO" }, { s: "DOS *22* CENTROS", ac: LAR }]} tam={120} top={340} pulsoEm={M.vinte2} />
    <Tit t={t} a={M.uma - 0.05} b={SOM.desliga} linhas={[{ s: "UMA *ATUALIZAÇÃO*", ac: LAR }]} tam={130} top={380} />
    <Tit t={t} a={M.eCair} b={M.detalhe} linhas={[{ s: "E *CAIR*" }]} tam={200} top={360} />
    <Tit t={t} a={M.detalhe} b={M.terca} linhas={[{ s: "E TEM UM" }, { s: "*DETALHE*", ac: LAR }]} tam={150} top={340} />
    <Tit t={t} a={M.terca} b={M.intel - 0.05} linhas={[{ s: "NA *TERÇA*", ac: LAR }]} tam={180} top={360} sub="A FAA LIGOU…" subA={M.ligado - 0.4} />
    <Tit t={t} a={M.intel - 0.05} b={M.ataque - 0.42} linhas={[{ s: "UMA *IA* NOVA", ac: "#a9dcff" }]} tam={170} top={350} sub="PARA ORGANIZAR O TRÁFEGO" subA={M.organizar - 0.3} />
    <Tit t={t} a={M.ataque - 0.05} b={M.nenhumSinal - 0.03} linhas={[{ s: "ATAQUE?" }]} tam={200} top={350} />
    <Tit t={t} a={M.nenhumSinal - 0.03} b={M.quem} linhas={[{ s: "NENHUM" }, { s: "SINAL", c: VERDE }]} tam={180} top={340} sub="SEGUNDO O GOVERNO" />
    <Tit t={t} a={M.quem} b={M.mais} linhas={[{ s: "QUEM JÁ ESTAVA NO AR" }, { s: "*SEGUE VIAGEM*", ac: LAR }]} tam={118} top={340} />
    <Tit t={t} a={M.parar} b={M.so} linhas={[{ s: "PARAR O PAÍS" }, { s: "*INTEIRO*" }]} tam={150} top={340} />
    <Tit t={t} a={M.so} b={M.em2023} linhas={[{ s: "SÓ *2 VEZES*", ac: LAR }, { s: "ANTES" }]} tam={150} top={340} />
    <Tit t={t} a={M.em2023} b={M.e11} linhas={[{ s: "2023", c: LAR, z: 230 }]} top={330} sub="TERCEIRIZADA APAGOU ARQUIVOS" subA={M.terceirizada} />
    <Tit t={t} a={M.e11} b={M.q4500 - 0.05} linhas={[{ s: "*11 SET* 2001" }]} tam={190} top={350} sub="A FAA MANDOU DESCER" subA={M.faa2 - 0.1} subCor="#cfe2ff" />
    <Tit t={t} a={M.q4500 - 0.05} b={M.emDuas - 0.05} linhas={[{ s: "UNS" , z: 90 }, { s: "4.500 AVIÕES", c: "#fff", z: 150 }]} top={340} sub="11 SET 2001" subCor="#cfe2ff" />
    <Tit t={t} a={M.espanta} b={M.ate2} linhas={[{ s: "E O QUE" }, { s: "*ESPANTA*", ac: LAR }]} tam={160} top={340} />
    <Tit t={t} a={M.ate2} b={M.eFio} linhas={[{ s: "AINDA RODAVA COM" }, ...(t >= M.disquete - 0.05 ? [{ s: "DISQUETE", c: LAR, z: 170 }] : [])]} tam={120} top={340} pulsoEm={M.disquete} />
    <Tit t={t} a={M.eFio} b={M.voos} linhas={[{ s: "E FIO DE" }, { s: "*COBRE*", ac: "#e8935a" }]} tam={160} top={340} />
    <Tit t={t} a={M.voos} b={M.se} linhas={[{ s: "VOOS QUE SAEM" }, { s: "DO *BRASIL*", ac: LAR }]} tam={140} top={340} />
    <Tit t={t} a={M.se} b={83.3} linhas={[{ s: "ALGUÉM QUE VOCÊ AMA" }, { s: "VAI *VIAJAR*?", ac: LAR }]} tam={112} top={330} />
    <Tit t={t} a={83.3} b={M.confere} linhas={[{ s: "MANDA ESSE *VÍDEO*", ac: LAR }]} tam={112} top={340} />
    <Tit t={t} a={M.confere} b={M.casaFim} linhas={[{ s: "CONFERE O VOO" }, { s: "COM A *COMPANHIA*", ac: LAR }]} tam={118} top={340} />
  </>
);

const Selos: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Selo t={t} a={M.faa} b={M.mandou} texto="FAA · AGÊNCIA DE AVIAÇÃO DOS EUA" top={600} />
    <Selo t={t} a={M.sean - 0.05} b={M.que} texto="SEAN DUFFY · SECRETÁRIO DE TRANSPORTES" top={600} />
    <Selo t={t} a={M.centros} b={M.radar - 0.1} texto="20 NO MAPA · + ALASCA E HAVAÍ" top={1170} cor="rgba(255,255,255,0.85)" />
    <Selo t={t} a={M.fontes + 0.1} b={SOM.desliga} texto="SEGUNDO FONTES DA CBS" top={600} cor={LAR} borda={LAR} />
    <Selo t={t} a={M.segFA - 0.05} b={M.parar} texto="FLIGHTAWARE" top={1250} cor={LAR} borda={LAR} />
    <Selo t={t} a={M.ate2} b={M.eFio} texto="ATÉ POUCO TEMPO" top={t >= M.disquete - 0.05 ? 640 : 600} />
    <Selo t={t} a={M.decididos - 0.05} b={M.se} texto="CASO A CASO" top={620} cor={LAR} borda={LAR} />
  </>
);

const Camada: React.FC<{ t: number }> = ({ t }) => {
  const plantao = t < M.esseVideo - 0.1;
  const mapa = t < 59.08 || (t >= M.e11 && t < M.espanta) || (t >= M.voos && t < M.se) || (t >= M.casaFim && t < M.esseVideo);
  return (
    <>
      {plantao && <Escurece />}
      {t >= M.esseVideo && t < LOOP_B && <div style={{ position: "absolute", inset: 0, background: TINTA, opacity: 0.35 + 0.35 * k01(t, M.ate3 - 0.1, M.ate3 + 0.3) }} />}
      <Alerta t={t} />
      <Painel t={t} />
      <LinhaTempo t={t} />
      <Pasta t={t} />
      <RotuloSP t={t} />
      <Titulos t={t} />
      <Numeros t={t} />
      <Relogio t={t} />
      <Selos t={t} />
      <Riscos t={t} />
      <Carimbo t={t} a={SOM.carimbo1} b={M.ataque - 0.42} texto="INVESTIGADA" cor={VERM} top={760} rot={-8} />
      <Carimbo t={t} a={M.nega} b={M.ataque - 0.42} texto="EMPRESA NEGA" cor="#f4f1e8" top={1010} rot={5} />
      <Atualizacao t={t} />
      {plantao && <SeloUrgente pisca={Math.sin(t * 6) > -0.3 ? 1 : 0.25} />}
      {plantao && mapa && <Ilustracao />}
      <ViradaCartela t={t} />
      <VozRosto t={t} />
      <Seguir t={t} />
      <Logo t={t} />
      <Legenda t={t} />
    </>
  );
};

export const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const e = estadoEm(t);
  const volta = t >= LOOP_A && t < LOOP_B ? eio(k01(t, LOOP_A, LOOP_B)) : 0;
  const tt = t >= LOOP_B ? 0 : t;
  // "NENHUM": clarão vermelho rápido
  const clarao = t >= M.nenhum2 && t < M.nenhum2 + 0.25 ? 0.35 * (1 - k01(t, M.nenhum2, M.nenhum2 + 0.25)) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir="C" e={e} t={tt} />
      {clarao > 0 && <div style={{ position: "absolute", inset: 0, background: VERM, opacity: clarao, mixBlendMode: "screen" }} />}
      {volta > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - volta }}><Camada t={t} /></div>
          <div style={{ position: "absolute", inset: 0, opacity: volta }}><Camada t={0} /></div>
        </>
      ) : (
        <Camada t={tt} />
      )}
    </AbsoluteFill>
  );
};
