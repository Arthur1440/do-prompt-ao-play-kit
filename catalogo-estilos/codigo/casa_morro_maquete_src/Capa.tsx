import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE, LARANJA } from "./comp/Motion";
import { estado, M } from "./three/cenas";
import type { Dir } from "./three/kit";

// Capa em duas vistas da mesma toca (montadas no ffmpeg): "frente" = porta e janelas redondas acesas;
// "corte" = o arco de vigas e o tubo de luz acendendo o quarto.
export const Capa: React.FC<{ dir: Dir; texto: boolean; vista?: "frente" | "corte" }> = ({ dir, texto, vista = "frente" }) => {
  const e = useMemo(() => {
    const s = estado(M.parabens + 0.3, dir);
    if (vista === "frente") {
      s.cam = { pos: [-0.9, 1.9, 7.9], alvo: [0.5, 0.75, 1.1], fov: 30 };
      s.foco = 0.42;
    } else {
      s.cam = { pos: [-6.4, 1.1, -0.1], alvo: [-1.3, 0.62, -0.8], fov: 30 };
      s.foco = 0.5;
    }
    s.sala = 1;
    s.luzTubo = 1;
    s.luzTubo2 = 1;
    s.luzCasa = 1;
    s.amb = 0.8;
    return s;
  }, [dir, vista]);
  const SOMBRA = "0 6px 22px rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.9)";
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={M.parabens + 0.3} />
      {texto && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center", fontFamily: FONTE, fontWeight: 700, lineHeight: 0.95, letterSpacing: -3, color: "#fff", textShadow: SOMBRA }}>
          <div style={{ fontSize: 118 }}>UMA CASA</div>
          <div style={{ fontSize: 118, color: LARANJA }}>DENTRO</div>
          <div style={{ fontSize: 118 }}>DO MORRO</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
