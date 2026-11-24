import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Escurece, SeloUrgente, VERM } from "./comp/Overlay";
import { TITULO } from "./comp/fontes";
import { estadoEm, OVR } from "./linha";

// capa: mapa com os aviões de solo em vermelho e o título, sem selo por cima do texto
export const Capa: React.FC = () => {
  const e = { ...estadoEm(4.6), cam: { ...OVR, pos: [0, 19.0, 21.0] as [number, number, number], alvo: [-0.15, 0, -1.6] as [number, number, number] }, nuvem: 0.1 };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir="C" e={e} t={4.6} />
      <Escurece />
      <SeloUrgente />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center" }}>
        {[["OS EUA PARARAM", "#fff"], ["TODOS OS VOOS", VERM]].map(([s, c]) => (
          <div key={s} style={{ fontFamily: TITULO, fontSize: 178, lineHeight: 0.93, color: c, textShadow: "0 6px 24px rgba(0,0,0,0.9)" }}>{s}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
