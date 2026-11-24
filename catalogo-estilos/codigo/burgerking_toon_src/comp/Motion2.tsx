import React from "react";
import { useT } from "./tempo";
import { BK, FONTE, LARANJA, Logo, MC, TINTA, TITULO, useMola } from "./Motion";

const c01 = (x: number) => Math.min(1, Math.max(0, x));
const SOMBRA_B = "0 9px 0 #1a0f0c, 6px 0 0 #1a0f0c, -6px 0 0 #1a0f0c, 0 -6px 0 #1a0f0c, 5px 5px 0 #1a0f0c, -5px 5px 0 #1a0f0c";

// ----------------------------------------------------------------- ROUND X / FIGHT!
export const RoundSlam: React.FC<{ n: number; t0: number; fight?: number }> = ({ n, t0, fight }) => {
  const { t } = useT();
  const m = useMola(t0, { damping: 10, stiffness: 260, mass: 0.6 });
  const mf = useMola(fight ?? 999, { damping: 9, stiffness: 300, mass: 0.5 });
  if (t < t0 || t > t0 + 2.6) return null;
  const sai = c01((t0 + 2.55 - t) / 0.2);
  const fOn = fight !== undefined && t >= fight;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 700, display: "flex", flexDirection: "column", alignItems: "center", opacity: sai }}>
      <div style={{ fontFamily: TITULO, fontSize: 168, color: "#fff", textShadow: SOMBRA_B, transform: `scale(${(2.2 - 1.2 * m) * (fOn ? 0.82 : 1)}) rotate(-4deg)`, opacity: c01(m * 3), lineHeight: 1 }}>
        ROUND <span style={{ color: LARANJA }}>{n}</span>
      </div>
      {fOn && (
        <div style={{ marginTop: 10, fontFamily: TITULO, fontSize: 210, color: MC.amar, textShadow: SOMBRA_B, transform: `scale(${2.4 - 1.4 * mf}) rotate(3deg)`, opacity: c01(mf * 3), lineHeight: 1 }}>
          FIGHT!
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------- impacto + K.O.
export const Impacto: React.FC<{ t0: number; lado: "e" | "d"; ko?: boolean }> = ({ t0, lado, ko }) => {
  const { t } = useT();
  const dt = t - t0;
  if (dt < 0 || dt > 0.9) return null;
  const s = dt < 0.12 ? dt / 0.12 : 1;
  const op = c01((0.9 - dt) / 0.25);
  const cx = lado === "e" ? 330 : 750;
  const raios = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r1 = 60, r2 = 150 + (i % 2) * 60;
    return `M${Math.cos(a) * r1},${Math.sin(a) * r1} L${Math.cos(a + 0.12) * r2},${Math.sin(a + 0.12) * r2} L${Math.cos(a - 0.12) * r2},${Math.sin(a - 0.12) * r2} Z`;
  });
  return (
    <>
      {dt < 0.07 && <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0.55 }} />}
      <svg width={500} height={500} viewBox="-250 -250 500 500" style={{ position: "absolute", left: cx - 250, top: 760, opacity: op, transform: `scale(${0.4 + 0.8 * s}) rotate(${dt * 40}deg)` }}>
        {raios.map((d, i) => (
          <path key={i} d={d} fill={i % 2 ? "#fff" : MC.amar} stroke="#1a0f0c" strokeWidth={6} />
        ))}
        <circle r={70} fill="#fff" stroke="#1a0f0c" strokeWidth={8} />
      </svg>
      {ko && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", fontFamily: TITULO, fontSize: 200, color: "#D62300", textShadow: SOMBRA_B, opacity: op, transform: `scale(${dt < 0.15 ? 2 - dt / 0.15 : 1 + (dt - 0.15) * 0.08}) rotate(-6deg)` }}>
          K.O.!
        </div>
      )}
    </>
  );
};

// ----------------------------------------------------------------- post (rede social genérica)
export const Post: React.FC<{
  t0: number; t1: number; top?: number; escala?: number;
  autor: "bk" | "mc" | "exec"; nome: string; texto: string; revela?: number; carimbo?: string; tCarimbo?: number; imagem?: React.ReactNode;
}> = ({ t0, t1, top = 480, escala = 1, autor, nome, texto, revela = 1, carimbo, tCarimbo = 0, imagem }) => {
  const { t } = useT();
  const m = useMola(t0);
  const mc = useMola(tCarimbo, { damping: 8, stiffness: 320, mass: 0.6 });
  if (t < t0 || t > t1 + 0.25) return null;
  const sai = c01((t1 + 0.25 - t) / 0.25);
  const txt = texto.slice(0, Math.round(texto.length * c01(revela)));
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, opacity: sai, transform: `scale(${(0.7 + 0.3 * m) * escala}) translateY(${(1 - m) * 120}px)`, transformOrigin: "50% 0%" }}>
      <div style={{ background: "#fff", borderRadius: 34, padding: 30, boxShadow: "0 0 0 6px #1a0f0c, 0 12px 0 #1a0f0c", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {autor === "exec" ? (
            <div style={{ width: 76, height: 76, borderRadius: 40, background: "#c9ccd6", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
              <div style={{ width: 34, height: 34, borderRadius: 20, background: "#7d8291", marginBottom: 6, boxShadow: "0 30px 0 12px #7d8291" }} />
            </div>
          ) : (
            <Logo m={autor} s={76} />
          )}
          <div>
            <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: "#111" }}>{nome}</div>
            <div style={{ fontFamily: FONTE, fontWeight: 500, fontSize: 28, color: "#7a7a85" }}>agora mesmo</div>
          </div>
        </div>
        {imagem && <div style={{ marginTop: 20, borderRadius: 20, overflow: "hidden" }}>{imagem}</div>}
        <div style={{ marginTop: 20, fontFamily: FONTE, fontWeight: 700, fontSize: 46, lineHeight: 1.18, color: "#111", minHeight: 54 }}>
          {txt}
          {revela < 1 && <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>|</span>}
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 34, fontFamily: FONTE, fontWeight: 700, fontSize: 30, color: "#7a7a85" }}>
          <span>♥ Curtir</span>
          <span>Comentar</span>
          <span>Compartilhar</span>
        </div>
        {carimbo && t >= tCarimbo && (
          <div style={{ position: "absolute", right: 30, top: 24, border: "8px solid #D62300", color: "#D62300", fontFamily: TITULO, fontSize: 62, padding: "4px 18px", borderRadius: 14, transform: `rotate(-12deg) scale(${2 - mc})`, opacity: c01(mc * 2), background: "rgba(255,255,255,0.85)" }}>
            {carimbo}
          </div>
        )}
      </div>
    </div>
  );
};

// ilustração do lanche de picanha (para o post do Méqui)
export const LanchePicanha: React.FC = () => (
  <div style={{ height: 300, background: "linear-gradient(180deg,#ffd14a,#ff9f2e)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
    <svg width={360} height={250} viewBox="0 0 360 250">
      <path d="M40 120 Q40 30 180 30 Q320 30 320 120 Z" fill="#E9A04C" stroke="#1a0f0c" strokeWidth={7} />
      {[70, 120, 170, 220, 270, 150, 200, 100, 250].map((x, i) => (
        <ellipse key={i} cx={x} cy={i < 5 ? 70 : 52} rx={7} ry={4} fill="#fff4d6" />
      ))}
      <rect x={34} y={118} width={292} height={22} rx={11} fill="#6CC24A" stroke="#1a0f0c" strokeWidth={6} />
      <path d="M40 140 L320 140 L300 160 L60 160 Z" fill="#FFC21A" stroke="#1a0f0c" strokeWidth={6} />
      <rect x={36} y={156} width={288} height={40} rx={18} fill="#6b3a1f" stroke="#1a0f0c" strokeWidth={7} />
      <rect x={44} y={194} width={272} height={34} rx={16} fill="#E8B067" stroke="#1a0f0c" strokeWidth={7} />
    </svg>
    <div style={{ position: "absolute", left: 22, bottom: 16, background: "#DA291C", color: "#fff", fontFamily: TITULO, fontSize: 30, padding: "6px 16px", borderRadius: 12 }}>lanche de picanha</div>
  </div>
);

// ----------------------------------------------------------------- moldura de gravação (resposta em vídeo)
export const MolduraVideo: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const { t } = useT();
  const m = useMola(t0);
  if (t < t0 || t > t1) return null;
  const canto = (s: React.CSSProperties) => <div style={{ position: "absolute", width: 110, height: 110, borderColor: "#fff", borderStyle: "solid", ...s }} />;
  const seg = Math.floor(t - t0);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 520, height: 860, opacity: m, transform: `scale(${1.15 - 0.15 * m})` }}>
      {canto({ left: 0, top: 0, borderWidth: "12px 0 0 12px" })}
      {canto({ right: 0, top: 0, borderWidth: "12px 12px 0 0" })}
      {canto({ left: 0, bottom: 0, borderWidth: "0 0 12px 12px" })}
      {canto({ right: 0, bottom: 0, borderWidth: "0 12px 12px 0" })}
      <div style={{ position: "absolute", left: 40, top: 36, display: "flex", alignItems: "center", gap: 12, fontFamily: FONTE, fontWeight: 700, fontSize: 44, color: "#fff", textShadow: "0 3px 10px rgba(0,0,0,0.6)" }}>
        <span style={{ width: 30, height: 30, borderRadius: 15, background: "#ff3b30", opacity: Math.floor(t * 2) % 2 ? 1 : 0.35 }} /> REC
      </div>
      <div style={{ position: "absolute", right: 40, top: 40, fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#fff", textShadow: "0 3px 10px rgba(0,0,0,0.6)" }}>00:0{seg}</div>
      <div style={{ position: "absolute", right: 36, bottom: 36, width: 96, height: 96, borderRadius: 50, background: BK.verm, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 6px #1a0f0c" }}>
        <svg width={44} height={44} viewBox="0 0 10 10">
          <path d="M3 2 L8 5 L3 8 Z" fill="#fff" />
        </svg>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- rótulos das metades do McWhopper
export const RotulosMcw: React.FC<{ tW: number; tB: number; t1: number }> = ({ tW, tB, t1 }) => {
  const { t } = useT();
  const mw = useMola(tW);
  const mb = useMola(tB);
  if (t > t1) return null;
  const chip = (txt: string, cor: string, m: number, lado: "e" | "d") => (
    <div style={{ position: "absolute", top: 1010, [lado === "e" ? "left" : "right"]: 60, transform: `scale(${m})`, transformOrigin: lado === "e" ? "left center" : "right center", background: cor, color: "#fff", fontFamily: TITULO, fontSize: 56, padding: "10px 26px", borderRadius: 18, boxShadow: "0 0 0 6px #1a0f0c, 0 9px 0 #1a0f0c" }}>
      {txt}
    </div>
  );
  return (
    <>
      {t >= tW && chip("WHOPPER", BK.verm, mw, "e")}
      {t >= tB && chip("BIG MAC", MC.verm, mb, "d")}
    </>
  );
};

// ----------------------------------------------------------------- reações de meme
export const Memes: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const { t } = useT();
  if (t < t0 || t > t1) return null;
  const P = [
    [180, 620, 0], [880, 580, 0.08], [300, 780, 0.16], [760, 820, 0.12], [140, 900, 0.22], [930, 940, 0.28], [520, 560, 0.05],
  ];
  return (
    <>
      {P.map(([x, y, d], i) => {
        const dt = t - t0 - d;
        if (dt < 0) return null;
        const s = Math.min(1, dt / 0.15) * (1 + Math.sin(dt * 12) * 0.05);
        return (
          <svg key={i} width={130} height={130} viewBox="0 0 100 100" style={{ position: "absolute", left: x - 65, top: y - 65 - dt * 60, transform: `scale(${s}) rotate(${Math.sin(dt * 6 + i) * 12}deg)` }}>
            <circle cx={50} cy={50} r={44} fill="#FFC72C" stroke="#1a0f0c" strokeWidth={6} />
            <path d="M28 40 Q34 30 40 40 M60 40 Q66 30 72 40" stroke="#1a0f0c" strokeWidth={6} fill="none" strokeLinecap="round" />
            <path d="M26 56 Q50 86 74 56 Z" fill="#7a1d12" stroke="#1a0f0c" strokeWidth={5} />
            <ellipse cx={22} cy={52} rx={7} ry={11} fill="#5fc3ff" />
            <ellipse cx={78} cy={52} rx={7} ry={11} fill="#5fc3ff" />
          </svg>
        );
      })}
    </>
  );
};

// ----------------------------------------------------------------- prompt da virada
export const PromptCard: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const { t } = useT();
  const m = useMola(t0);
  if (t < t0 || t > t1) return null;
  const txt = "Luta de videogame: o Rei contra o Ronald, 4 rodadas, estilo desenho 3D.";
  const n = Math.floor(c01((t - t0) / (t1 - t0 - 0.4)) * txt.length);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 560, transform: `translateY(${(1 - m) * 80}px)`, opacity: m }}>
      <div style={{ background: "rgba(11,16,38,0.92)", border: `3px solid ${LARANJA}`, borderRadius: 28, padding: "28px 32px", boxShadow: "0 0 40px rgba(255,107,44,0.35)" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 30, color: LARANJA, letterSpacing: 2 }}>PROMPT</div>
        <div style={{ marginTop: 12, fontFamily: FONTE, fontWeight: 500, fontSize: 44, lineHeight: 1.25, color: "#fff" }}>
          {txt.slice(0, n)}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>▍</span>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- chamada final: Seguir, PLAY, Do Prompt ao Play
export const Chamada: React.FC<{ tSeguir: number; tPlay: number; tCurso: number; t1: number }> = ({ tSeguir, tPlay, tCurso, t1 }) => {
  const { t } = useT();
  const ent = useMola(tSeguir - 0.15);
  const toque = useMola(tSeguir + 0.35, { damping: 8, stiffness: 300, mass: 0.5 });
  const mc = useMola(tCurso, { damping: 10, stiffness: 200, mass: 0.7 });
  if (t > t1) return null;
  const seguindo = t >= tSeguir + 0.35;
  const play = "PLAY".slice(0, Math.max(0, Math.min(4, Math.floor((t - tPlay) / 0.07))));
  const sai = c01((t1 - t) / 0.2);
  const dTap = t - (tSeguir + 0.25);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: sai }}>
      <div style={{ position: "absolute", inset: 0, background: TINTA, opacity: 0.55 * ent }} />
      {/* perfil + Seguir */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 500, display: "flex", alignItems: "center", gap: 26, background: "#fff", borderRadius: 34, padding: "24px 28px", boxShadow: "0 0 0 6px #1a0f0c, 0 10px 0 #1a0f0c", transform: `translateY(${(1 - ent) * -80}px)`, opacity: ent }}>
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
      {/* comentário PLAY */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 690, height: 112, borderRadius: 60, background: "#fff", display: "flex", alignItems: "center", padding: "0 18px", gap: 18, boxShadow: "0 0 0 6px #1a0f0c, 0 9px 0 #1a0f0c", opacity: c01((t - tPlay + 0.4) / 0.3) }}>
        <div style={{ width: 76, height: 76, borderRadius: 50, background: `linear-gradient(135deg, ${LARANJA}, #ffb36b)` }} />
        <div style={{ flex: 1, fontFamily: FONTE, fontWeight: 700, fontSize: 52, color: play ? "#111" : "#9a9aa2" }}>
          {play || "Adicione um comentário…"}
          <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: LARANJA }}>|</span>
        </div>
        <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#1b6cf2" }}>Publicar</div>
      </div>
      {/* Do Prompt ao Play */}
      {t >= tCurso && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center", transform: `scale(${mc})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, background: TINTA, border: `4px solid ${LARANJA}`, borderRadius: 30, padding: "18px 34px 18px 18px", boxShadow: "0 0 50px rgba(255,107,44,0.5)" }}>
            <div style={{ width: 112, height: 112, borderRadius: 60, background: LARANJA, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={54} height={54} viewBox="0 0 10 10">
                <path d="M3 1.8 L8.4 5 L3 8.2 Z" fill="#fff" />
              </svg>
            </div>
            <div style={{ fontFamily: TITULO, fontSize: 64, color: "#fff", lineHeight: 1 }}>
              Do Prompt <span style={{ color: LARANJA }}>ao Play</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
