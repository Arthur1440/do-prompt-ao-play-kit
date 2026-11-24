import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { F } from "./comp/fontes";
import { AZUL } from "./comp/Overlay";
import type { Estado } from "./three/mundo";

// Capa: a raposa de camisa azul com as 5 estrelas, 1942 ao fundo (fachada com a placa CRUZEIRO)
const EST: Estado = {
  set: "rua",
  cam: { pos: [0.0, 2.32, 8.65], alvo: [0, 2.32, 0], fov: 30 },
  foco: 0.45,
  raposa: {
    pos: [-0.2, 0, 3.0],
    esc: 1.8,
    rotY: 0.1,
    palp: 0.22,
    cab: [0.02, 0.12, 0.1],
    olhar: [0.2, 0.1],
    bE: { abre: 0.75, frente: -0.15, cot: 1.9 },
    bD: { abre: 0.75, frente: -0.15, cot: 1.9 },
    brilho: 0.7,
  },
  p: { frio: 1, vira: 1, carimbo: 1, carimboY: 6, ano1942: 1, tilt: 0.8 },
};

const Faixa: React.FC<{ children: React.ReactNode; fundo: string; cor: string; rot: number }> = ({ children, fundo, cor, rot }) => (
  <div style={{ alignSelf: "center", background: fundo, color: cor, fontFamily: F.sg, fontWeight: 700, fontSize: 112, lineHeight: 1, letterSpacing: -3, padding: "18px 40px 24px", borderRadius: 22, transform: `rotate(${rot}deg)`, boxShadow: "0 12px 0 rgba(0,0,0,0.28), 0 22px 50px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
    {children}
  </div>
);

export const Capa: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Cena3D dir="A" est={EST} />
    <div style={{ position: "absolute", top: 280, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 20 }}>
      <Faixa fundo={AZUL} cor="#fff" rot={-2.5}>O QUE O CRUZEIRO</Faixa>
      <Faixa fundo="#fff" cor="#0d1d45" rot={1.5}>TEM A VER COM</Faixa>
      <Faixa fundo={AZUL} cor="#fff" rot={-1.5}>RAPOSA?</Faixa>
    </div>
  </AbsoluteFill>
);
