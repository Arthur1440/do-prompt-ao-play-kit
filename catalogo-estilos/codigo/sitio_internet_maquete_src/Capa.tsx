import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE, LARANJA } from "./comp/Motion";
import { estado, M } from "./three/cenas";
import type { Dir } from "./three/kit";

// Capa: o sítio visto de cima, com as quatro peças, fim de tarde; texto de capa no alto (sem selos por cima)
export const Capa: React.FC<{ dir: Dir; texto?: boolean }> = ({ dir, texto = true }) => {
  const e = useMemo(() => {
    const x = estado(M.setenta, dir);
    x.cam = { pos: [0.7, 13.6, 3.9], alvo: [-0.1, 0, -1.5], fov: 40 };
    x.foco = 0.36;
    x.adubo = 0;
    x.tFix = 12.0;
    return x;
  }, [dir]);
  const SOMBRA = "0 6px 22px rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.9)";
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={12} />
      {texto && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 270, textAlign: "center", fontFamily: FONTE, fontWeight: 700, color: "#fff", textShadow: SOMBRA, lineHeight: 0.98, letterSpacing: -2 }}>
          <div style={{ fontSize: 100, whiteSpace: "nowrap" }}>UM SÍTIO COM TUDO</div>
          <div style={{ fontSize: 128, color: LARANJA, marginTop: 10, whiteSpace: "nowrap" }}>POR R$ 70 MIL?</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
