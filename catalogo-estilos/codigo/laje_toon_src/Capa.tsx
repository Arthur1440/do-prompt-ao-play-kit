// Capa (1080x1920): a laje despencando, o pedreiro pulando para trás, a churrasqueira embaixo; "SUA LAJE VAI CAIR".
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { FONTE } from "./comp/fontes";
import { COR } from "./comp/Overlay";
import type { Estado } from "./three/mundo";
import { HP, IZ } from "./three/casa";

const e: Estado = {
  t: 20, cam: { az: -4, el: 3, dist: 6.6, fov: 30, alvo: [0.24, 1.0, 0.3] }, corte: IZ - 0.03,
  casa: { escada: false }, laje: { tabuas: 9, tabVerga: 1, tabQuebra: 0.5, concForma: 1 },
  ch: { p: [0.02, 0.03, 0.12], rotY: -0.3, susto: 1 },
  conc: { bolas: [{ p: [-0.1, 0.95, 0.15], r: 0.15 }, { p: [0.22, 0.72, -0.2], r: 0.11 }, { p: [-0.4, 1.15, -0.1], r: 0.09 }], respingos: { p: [0, HP - 0.3, 0], k: 0.0 } },
  ped: { pos: [0.68, 0.0, 1.45], rotY: -0.35, pulo: 0.2, inclina: -0.38, olhos: "susto", boca: "O", bone: 0.9, bE: { abre: 1.2, frente: 0.9, cot: 0.5 }, bD: { abre: 1.2, frente: 0.9, cot: 0.5 }, pE: { frente: 0.7, joelho: 0.9 }, pD: { frente: -0.3, joelho: 0.3 } },
};

export const Capa: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Cena3D dir="B" e={e} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", fontFamily: FONTE, fontWeight: 700, lineHeight: 0.98, letterSpacing: -4 }}>
      {[["SUA LAJE", "#fff"], ["VAI CAIR", COR.laranja]].map(([txt, cor]) => (
        <div key={txt} style={{ fontSize: 168, color: cor, WebkitTextStroke: "22px #000", paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(0,0,0,0.85)" }}>{txt}</div>
      ))}
    </div>
  </AbsoluteFill>
);
