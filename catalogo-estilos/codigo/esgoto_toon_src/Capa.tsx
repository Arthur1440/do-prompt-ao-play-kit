// Capa 1080x1920: a maquete em corte vista de cima (sem telhado), algodão verde saindo do ralo e do vaso, barata na borda.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { COR } from "./comp/Overlay";
import { FONTE } from "./comp/fontes";
import { estadoEm, pv } from "./linha";
import { XS, ZP, FY } from "./three/maquete";
import type { Estado } from "./three/mundo";

const e0 = estadoEm(52.4);
const E: Estado = {
  ...e0,
  t: 52.4, corte: ZP + 0.26, telhado: 0,
  cam: { az: 16, el: 60, dist: 2.25, alvo: [-0.42, 0.02, -0.5], foco: 0.5, forca: 0, larg: 1 },
  nuvens: [
    { pts: [[XS, -0.05, ZP], [XS, FY + 0.01, ZP]], t0: 49, n: 34, periodo: 2.2, rCano: 0.012, esc: 0.04, alt: 0.3, abre: 0.12, seed: 21 },
    { pts: [pv(0.025, 0.07), pv(0.025, 0.12)], t0: 49, n: 30, periodo: 2.2, rCano: 0.012, esc: 0.036, alt: 0.28, abre: 0.1, seed: 22 },
  ],
  barata: { pos: pv(0.098, 0.134, 0.018), rotY: Math.PI / 2 - 0.25, incl: 0.45, anda: 0.3, esc: 1.15 },
  jatos: [],
};

export const Capa: React.FC = () => (
  <AbsoluteFill style={{ background: COR.tinta }}>
    <Cena3D e={E} dir="B" />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,16,38,0.55) 0%, rgba(11,16,38,0.0) 38%)" }} />
    <div style={{ position: "absolute", left: 60, right: 60, top: 320, textAlign: "center", fontFamily: FONTE, fontWeight: 700, fontSize: 118, lineHeight: 1.02, letterSpacing: -2, color: "#fff", WebkitTextStroke: "14px #0B1026", paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(0,0,0,0.55)" }}>
      POR QUE TEM <span style={{ color: COR.laranja }}>ÁGUA</span> NO FUNDO DO VASO?
    </div>
  </AbsoluteFill>
);
