import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE, LARANJA } from "./comp/Motion";
import { estado, M } from "./three/cenas";
import type { Dir } from "./three/kit";

// Capa: a torre no alto do morro de noite, o raio subindo da ponta até a nuvem; texto sem selos por cima.
export const Capa: React.FC<{ dir: Dir }> = ({ dir }) => {
  const t = M.chao + 0.35;
  const e0 = estado(t, dir);
  const e = { ...e0, raios: e0.raios.map((r) => ({ ...r, p: 1, brilho: 1.05 })), flash: 0.45, tremor: 0 };
  const L: React.CSSProperties = { fontFamily: FONTE, fontWeight: 700, fontSize: 150, lineHeight: 0.98, color: "#fff", letterSpacing: -3, textShadow: "0 8px 30px rgba(0,0,0,0.9), 0 3px 0 rgba(0,0,0,0.9)" };
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={t} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center" }}>
        <div style={L}>ESSE RAIO</div>
        <div style={{ ...L, marginTop: 6 }}>
          SAIU DO <span style={{ color: LARANJA }}>CHÃO</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
