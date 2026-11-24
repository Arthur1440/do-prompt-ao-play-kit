import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE, LARANJA } from "./comp/Motion";
import { estadoCapa, mundo, P_FECH, P_JAN, P_SEG, P_TRAB, projeta } from "./three/cenas";
import type { Dir, V3 } from "./three/kit";

// Capa 1080x1920: texto no alto, panela em corte no meio, 4 defesas marcadas em laranja (sem selo sobre o texto).
export const Capa: React.FC<{ dir: Dir }> = ({ dir }) => {
  const e = useMemo(() => estadoCapa(), []);
  const pts: V3[] = [[P_TRAB[0], P_TRAB[1] + 0.2, P_TRAB[2]], [P_SEG[0], P_SEG[1] + 0.08, P_SEG[2]], P_JAN, [P_FECH[0], P_FECH[1] + 0.05, P_FECH[2]]];
  const L: React.CSSProperties = { fontFamily: FONTE, fontWeight: 700, lineHeight: 0.96, letterSpacing: -4, color: "#fff", textShadow: "0 8px 28px rgba(0,0,0,0.75), 0 3px 0 rgba(0,0,0,0.6)" };
  return (
    <AbsoluteFill>
      <Cena3D dir={dir} e={e} t={0.37} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(20,12,6,0.55), rgba(20,12,6,0) 38%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center" }}>
        <div style={{ ...L, fontSize: 150 }}>
          <span style={{ color: LARANJA }}>4</span> JEITOS DE
        </div>
        <div style={{ ...L, fontSize: 200, color: LARANJA }}>EXPLODIR</div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {pts.map((p, i) => {
          const [x, y] = projeta(e, mundo(p, e.rot));
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={34} fill="none" stroke={LARANJA} strokeWidth={6} />
              <circle cx={x} cy={y} r={15} fill={LARANJA} />
              <circle cx={x} cy={y} r={6} fill="#fff" />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
