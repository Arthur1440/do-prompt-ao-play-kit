// Capa: a piscina vista de cima saindo do chão, o flamingo no ar, texto de capa sem rótulos por cima.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE } from "./comp/fontes";
import { COR } from "./comp/Overlay";
import type { Estado } from "./three/mundo";

const E: Estado = {
  t: 113.2,
  cam: { az: -24, el: 44, dist: 14.2, fov: 30, alvo: [0.1, 0.45, 0.1], foco: 0.56 },
  ter: { modo: "obra" }, maq: 1,
  pis: { concreto: 1, imper: 1, azulejo: 1, borda: 1, ralos: 2, coadeira: 1, retornos: 1, porta: 0.3, agua: 0, sobe: 0.95 },
  fla: { p: [-0.35, 2.35, 0.55], giro: 0.9, incl: [2.6, 0.5], sq: 1.12, olhos: 1.9, pescocoDobra: 0.35, esc: 1.15 },
};

const sombra = "0 8px 0 rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.55), 4px 0 0 #000, -4px 0 0 #000, 0 -4px 0 #000, 0 4px 0 #000";
export const Capa: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Cena3D dir="A" e={E} />
    <div style={{ position: "absolute", left: 50, right: 50, top: 1270, textAlign: "center", fontFamily: FONTE, fontWeight: 700, lineHeight: 1.0, letterSpacing: -3 }}>
      <div style={{ fontSize: 118, color: "#fff", textShadow: sombra }}>SUA PISCINA</div>
      <div style={{ fontSize: 118, color: "#fff", textShadow: sombra }}>VAI SUBIR</div>
      <div style={{ fontSize: 118, color: COR.amarelo, textShadow: sombra }}>DO CHÃO</div>
    </div>
  </AbsoluteFill>
);
