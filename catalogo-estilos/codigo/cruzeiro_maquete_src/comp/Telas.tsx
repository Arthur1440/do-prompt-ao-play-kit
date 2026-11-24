import React from "react";
import { F } from "./fontes";
import { useT } from "./tempo";
import { clamp, easeOut, lerp, quique } from "../three/rng";
import { AZUL, LARANJA, TINTA } from "./Overlay";

const r = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const pop = (t: number, t0: number, d = 0.35) => Math.max(0, quique(r(t, t0, t0 + d)));

// ---------------------------------------------------------------------------
// Placar "4 × 0" (adversário não aparece)
export const Placar: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const { t } = useT();
  if (t < t0 - 0.05 || t > t1) return null;
  const s = pop(t, t0, 0.45) * (1 - r(t, t1 - 0.15, t1));
  return (
    <div style={{ position: "absolute", top: 270, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${s})`,
          background: "linear-gradient(#141c3a, #0b1026)",
          border: "6px solid #ffffff",
          outline: `6px solid ${AZUL}`,
          borderRadius: 30,
          padding: "10px 60px 18px",
          fontFamily: F.sg,
          fontWeight: 700,
          fontSize: 190,
          lineHeight: 1,
          color: LARANJA,
          letterSpacing: -4,
          textShadow: `0 0 26px rgba(255,107,44,0.65)`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        }}
      >
        4 <span style={{ color: "#ffffff", fontSize: 120, verticalAlign: "middle" }}>×</span> 0
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Campo de comentário com "@" e @ genéricos (inventados)
const ARROBAS: [string, string][] = [
  ["@cabuloso_raiz", "#1D4FC4"],
  ["@raposa_celeste", "#2a62da"],
  ["@toca_azul_bh", "#163e9c"],
  ["@estrela_no_peito", "#3b6fe0"],
];
export const Comentarios: React.FC<{ t0: number; t1: number; congela?: number; tempos: number[] }> = ({ t0, t1, congela, tempos }) => {
  const { t: t_ } = useT();
  const t = congela !== undefined && t_ > congela ? congela : t_;
  if (t_ < t0 || t_ > t1) return null;
  const sobe = easeOut(r(t, t0, t0 + 0.35));
  const digita = t > t0 + 0.3;
  const escolhido = t > 59.35;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 680,
        transform: `translateY(${(1 - sobe) * 260}px)`,
        opacity: sobe,
        background: "#ffffff",
        borderRadius: 36,
        padding: "26px 30px 30px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        fontFamily: F.sg,
      }}
    >
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 34, color: "#111", marginBottom: 18 }}>Comentários</div>
      {ARROBAS.map(([h, c], i) => {
        const ti = tempos[i];
        const k = pop(t, ti, 0.3);
        if (t < ti) return <div key={h} style={{ height: 86 }} />;
        const sel = escolhido && i === 0;
        return (
          <div key={h} style={{ display: "flex", alignItems: "center", gap: 20, height: 86, transform: `scale(${k})`, transformOrigin: "left center", background: sel ? "#eef3ff" : "transparent", borderRadius: 18, paddingLeft: 8 }}>
            <div style={{ width: 62, height: 62, borderRadius: 99, background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 28 }}>
              ★
            </div>
            <div style={{ fontWeight: 700, fontSize: 40, color: "#111" }}>{h}</div>
          </div>
        );
      })}
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16, border: "3px solid #dcdcdc", borderRadius: 99, padding: "16px 26px" }}>
        <span style={{ fontSize: 44, fontWeight: 700, color: escolhido ? AZUL : "#111" }}>
          {digita ? (escolhido ? "@cabuloso_raiz" : "@") : ""}
          <span style={{ opacity: Math.floor(t * 2.5) % 2 ? 0 : 1, color: "#111", fontWeight: 400 }}>|</span>
        </span>
        <span style={{ marginLeft: "auto", color: AZUL, fontWeight: 700, fontSize: 36 }}>Publicar</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Silhuetas de escudo vazias (nenhum clube real) acendendo em laranja, uma a uma
const ESCUDO = "M50 4 L92 16 Q94 60 76 84 Q64 98 50 104 Q36 98 24 84 Q6 60 8 16 Z";
export const Escudos: React.FC<{ t0: number; t1: number; tempos: number[] }> = ({ t0, t1, tempos }) => {
  const { t } = useT();
  if (t < t0 || t > t1) return null;
  const ent = easeOut(r(t, t0, t0 + 0.3));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "46px 56px", padding: "0 110px", opacity: ent }}>
      {tempos.map((ti, i) => {
        const on = r(t, ti, ti + 0.18);
        const k = 1 + Math.max(0, quique(r(t, ti, ti + 0.4)) - 1) * 0.6;
        return (
          <svg key={i} width={230} height={250} viewBox="0 0 100 108" style={{ transform: `scale(${k * lerp(0.9, 1, ent)})`, filter: on > 0 ? `drop-shadow(0 0 ${18 * on}px rgba(255,107,44,0.8))` : undefined }}>
            <path d={ESCUDO} fill={on > 0 ? `rgba(255,107,44,${0.18 + 0.2 * on})` : "rgba(140,150,180,0.12)"} stroke={on > 0 ? LARANJA : "#59617d"} strokeWidth={4} />
            <path d="M50 22 L78 30 Q79 58 66 74 Q58 84 50 88 Q42 84 34 74 Q21 58 22 30 Z" fill="none" stroke={on > 0 ? LARANJA : "#59617d"} strokeOpacity={0.55} strokeWidth={2} />
          </svg>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Seguir → PLAY no comentário → Do Prompt ao Play
export const ChamadaPlay: React.FC<{ t0: number; t1: number; toque: number; digita: [number, number]; marca: number; link: number }> = ({ t0, t1, toque, digita, marca, link }) => {
  const { t } = useT();
  if (t < t0 || t > t1) return null;
  const ent = easeOut(r(t, t0, t0 + 0.3));
  const seguindo = t > toque + 0.12;
  const toqueK = r(t, toque - 0.05, toque + 0.35);
  const nLetras = Math.floor(r(t, digita[0], digita[1]) * 4 + 0.001);
  const enviado = t > digita[1] + 0.25;
  const mk = pop(t, marca, 0.5);
  const lk = pop(t, link, 0.3);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: F.sg, opacity: ent }}>
      {/* perfil */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 300, background: "#ffffff", borderRadius: 36, padding: 30, display: "flex", alignItems: "center", gap: 26, boxShadow: "0 24px 60px rgba(0,0,0,0.45)", transform: `translateY(${(1 - ent) * -80}px) scale(${mk > 0 ? lerp(1, 0.92, r(t, marca - 0.2, marca)) : 1})` }}>
        <div style={{ width: 120, height: 120, borderRadius: 99, padding: 6, background: `conic-gradient(${LARANJA}, #ffb36b, ${LARANJA})` }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 99, background: TINTA, display: "flex", alignItems: "center", justifyContent: "center", color: LARANJA, fontSize: 56 }}>▶</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 40, color: "#111" }}>seu.perfil</div>
          <div style={{ fontSize: 30, color: "#666", marginTop: 4 }}>vídeos feitos com IA</div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ background: seguindo ? "#efefef" : "#0095f6", color: seguindo ? "#111" : "#fff", fontWeight: 700, fontSize: 36, padding: "18px 34px", borderRadius: 18, transform: `scale(${1 - Math.sin(Math.PI * toqueK) * 0.08})` }}>
            {seguindo ? "Seguindo" : "Seguir"}
          </div>
          {toqueK > 0 && toqueK < 1 ? (
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: 99, border: `6px solid ${LARANJA}`, opacity: 1 - toqueK, transform: `scale(${0.3 + toqueK})` }} />
          ) : null}
        </div>
      </div>
      {/* comentário PLAY */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 520, display: "flex", alignItems: "center", gap: 18, background: "#ffffff", borderRadius: 99, padding: "20px 30px", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
        <span style={{ fontSize: 50, fontWeight: 700, color: LARANJA, letterSpacing: 2 }}>
          {enviado ? "" : "PLAY".slice(0, nLetras)}
          {!enviado ? <span style={{ color: "#111", fontWeight: 400, opacity: Math.floor(t * 2.5) % 2 ? 0 : 1 }}>|</span> : <span style={{ color: "#999", fontWeight: 500, fontSize: 36 }}>Adicione um comentário…</span>}
        </span>
        <span style={{ marginLeft: "auto", color: "#0095f6", fontWeight: 700, fontSize: 36, opacity: nLetras > 0 && !enviado ? 1 : 0.35 }}>Publicar</span>
      </div>
      {enviado ? (
        <div style={{ position: "absolute", left: 70, top: 660, display: "flex", alignItems: "center", gap: 18, transform: `scale(${pop(t, digita[1] + 0.25, 0.3)})`, transformOrigin: "left center" }}>
          <div style={{ width: 70, height: 70, borderRadius: 99, background: "#2a62da" }} />
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 26, padding: "14px 26px", color: "#fff", fontSize: 40 }}>
            <b>você</b> <span style={{ color: LARANJA, fontWeight: 700 }}>PLAY</span>
          </div>
        </div>
      ) : null}
      {t > link ? (
        <div style={{ position: "absolute", left: 70, top: 770, display: "flex", alignItems: "center", gap: 16, transform: `scale(${lk})`, transformOrigin: "left center", background: "rgba(255,107,44,0.14)", border: `3px solid ${LARANJA}`, borderRadius: 99, padding: "14px 30px", color: "#fff", fontSize: 38, fontWeight: 700 }}>
          🔗 grupo de lançamento
        </div>
      ) : null}
      {/* Do Prompt ao Play */}
      {t > marca ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 930, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `scale(${mk})` }}>
          <div style={{ width: 230, height: 230, borderRadius: 999, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 70px rgba(255,107,44,0.7)` }}>
            <svg width={110} height={110} viewBox="0 0 10 10">
              <path d="M3 1.6 L8.4 5 L3 8.4 Z" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 92, letterSpacing: -3 }}>
            Do Prompt ao <span style={{ color: LARANJA }}>Play</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
