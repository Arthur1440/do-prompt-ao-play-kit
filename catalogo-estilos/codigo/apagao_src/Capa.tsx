import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE } from "./comp/fontes";
import { COR } from "./comp/Overlay";

// Capa: o quarteirão metade aceso, metade apagado, com a pergunta
export const Capa: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Cena3D dir="A" e={{ plano: "rua_capa", p: 1, t: 3 }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,7,12,0.85) 0%, rgba(6,7,12,0.0) 38%, rgba(6,7,12,0) 70%, rgba(6,7,12,0.6) 100%)" }} />
    <div style={{ position: "absolute", left: 60, right: 60, top: 290, textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 128, lineHeight: 0.98, letterSpacing: -3, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.9), 0 2px 0 #000" }}>
      E SE O APAGÃO DO <span style={{ color: COR.amarelo }}>DIA 17</span> FOR VERDADE?
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1330, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 46, letterSpacing: 6, color: "#fff", background: "rgba(40,6,6,0.78)", border: `3px solid ${COR.verm}`, borderRadius: 16, padding: "12px 30px" }}>
        <span style={{ color: COR.verm }}>●</span> HORA A HORA · SIMULAÇÃO
      </div>
    </div>
  </AbsoluteFill>
);
