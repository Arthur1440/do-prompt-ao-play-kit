// Capa: forno aberto visto de cima com as duas pizzas, espelho brilhando, gabinetes reconhecíveis; texto sem selos por cima.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE } from "./comp/fontes";
import { COR } from "./comp/Overlay";

export const Capa: React.FC = () => (
  <AbsoluteFill style={{ background: COR.tinta }}>
    <Cena3D dir="C" e={{ plano: "capa", p: 0, t: 40, cam: { az: 10, el: 47, dist: 3.4, fov: 28, ay: 0.16, az2: -0.12, abert: 1.2 } }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,16,38,0.78) 0%, rgba(11,16,38,0.35) 26%, rgba(11,16,38,0) 40%)" }} />
    <div style={{ position: "absolute", left: 60, right: 60, top: 270, textAlign: "center", fontFamily: FONTE, fontWeight: 700, color: "#fff", letterSpacing: -2, lineHeight: 1.0, textShadow: "0 6px 0 rgba(0,0,0,0.45), 0 0 40px rgba(0,0,0,0.55)" }}>
      <div style={{ fontSize: 118 }}>PIZZA NO <span style={{ color: COR.laranja }}>SOL</span></div>
      <div style={{ fontSize: 76, marginTop: 14 }}>DENTRO DE <span style={{ color: COR.laranja }}>2</span> COMPUTADORES</div>
      <div style={{ fontSize: 76 }}>VELHOS</div>
    </div>
  </AbsoluteFill>
);
