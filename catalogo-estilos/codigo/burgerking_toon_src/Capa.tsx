import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { TempoCtx } from "./comp/tempo";
import { Hud, TITULO, LARANJA } from "./comp/Motion";
import type { Estado } from "./three/mundo";

const SOMBRA = "0 12px 0 #1a0f0c, 8px 0 0 #1a0f0c, -8px 0 0 #1a0f0c, 0 -8px 0 #1a0f0c, 7px 7px 0 #1a0f0c, -7px 7px 0 #1a0f0c";

// Capa: o Rei e o Ronald frente a frente na arena, cada um com o seu lanche, barras de vida no topo.
const capa = (): Estado => ({
  set: "ringue",
  cam: { pos: [0, 0.95, 4.7], alvo: [0, 0.5, 0], fov: 30 },
  rei: {
    pos: [-0.34, 0.12, 0.25], rotY: 0.55, inclina: 0.1, sq: 1,
    bD: { abre: 2.85, frente: 0.3, cot: 0.35 }, bE: { abre: 0.5, frente: 0.95, cot: 1.95 },
    pE: { abre: 0.16, frente: 0.15 }, pD: { abre: 0.2, frente: -0.12 },
    segD: "whopper", escItem: 1.25, cab: [0.02, 0.1, 0], olhos: "normal", boca: "sorri", capa: 0.35,
  },
  ronald: {
    pos: [0.34, 0.12, 0.25], rotY: -0.55, inclina: 0.1, sq: 1,
    bE: { abre: 2.85, frente: 0.3, cot: 0.35 }, bD: { abre: 0.5, frente: 0.95, cot: 1.95 },
    pE: { abre: 0.2, frente: -0.12 }, pD: { abre: 0.16, frente: 0.15 },
    segE: "bigmac", escItem: 1.25, cab: [0.02, -0.1, 0], olhos: "normal", boca: "sorri",
  },
});

export const Capa: React.FC = () => (
  <TempoCtx.Provider value={20}>
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir="B" muda={capa} />
      <Hud dir="B" h={{ bk: 1, mc: 1, round: 1, placar: [0, 0] }} />
      <div style={{ position: "absolute", top: 1360, left: 0, right: 0, textAlign: "center", fontFamily: TITULO, color: "#fff", textShadow: SOMBRA, lineHeight: 1.02 }}>
        <div style={{ fontSize: 150 }}>
          <span style={{ color: "#FF8732" }}>BK</span> <span style={{ color: LARANJA, fontSize: 110 }}>VS</span> <span style={{ color: "#FFC72C" }}>MÉQUI:</span>
        </div>
        <div style={{ fontSize: 132, marginTop: 10 }}>QUEM GANHA?</div>
      </div>
    </AbsoluteFill>
  </TempoCtx.Provider>
);
