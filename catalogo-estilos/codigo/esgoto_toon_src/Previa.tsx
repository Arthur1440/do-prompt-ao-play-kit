// Quadros da prévia (direção maquete): o pedreiro cavando no quadro 0, o algodão saindo do vaso com a barata,
// o corte do vaso com a curva de água barrando o algodão, a gordura fechando o cano por dentro; mais a virada para IA.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Palavra, Frase } from "./comp/Rotulos";
import type { Estado } from "./three/mundo";
import type { Dir } from "./three/kit";
import { estadoEm, pv } from "./linha";
import { ZP, ZK, YR0, PIA } from "./three/maquete";
import { SAIDA_VASO } from "./three/vaso";

export type Quadro = "gancho" | "barata" | "sifao" | "gordura" | "virada";
const XS0 = SAIDA_VASO[0];
const TODAS = { descida: 1, rua: 1, coz1: 1, coz2: 1, respiro: 1, lav: 1, chuveiro: 1, cs: 1, cg: 1, ci0: 1, ci1: 1, ci2: 1 };

function quadro(q: Quadro): { e: Estado; o: React.ReactNode } {
  switch (q) {
    case "gancho":
      return { e: estadoEm(0), o: null };
    case "barata":
      return {
        e: {
          t: 16.6, corte: ZP + 0.2,
          cam: { az: 38, el: 22, dist: 0.95, alvo: pv(0.05, 0.13, 0.0), foco: 0.5, forca: 0.75, larg: 1.25 },
          pecas: { descida: 1, rua: 1 }, vaso: { canal: "reto" },
          nuvens: [{ pts: [pv(0.025, 0.07), pv(0.025, 0.125)], t0: 12, n: 34, periodo: 2.1, rCano: 0.012, esc: 0.032, alt: 0.26, abre: 0.12, seed: 5, vento: [0.03, 0, 0.02] }],
          barata: { pos: pv(0.098, 0.134, 0.018), rotY: Math.PI / 2 - 0.25, incl: 0.45, anda: 0.3 },
        },
        o: <Palavra txt="Barata" y={1385} tam={104} />,
      };
    case "sifao":
      return {
        e: {
          t: 24.2, corte: ZP,
          cam: { az: 0, el: 5, dist: 0.72, alvo: pv(-0.025, 0.06, 0), foco: 0.5, forca: 0.6, larg: 1.6 },
          pecas: { descida: 1, rua: 1 }, vaso: { canal: "sifao", nivel: 1 },
          nuvens: [{ pts: [[XS0 + 0.08, YR0, ZP], [XS0, YR0, ZP], pv(-0.068, -0.004), pv(-0.068, 0.04), pv(-0.064, 0.078), pv(-0.054, 0.096), pv(-0.043, 0.092)], t0: 20, n: 26, periodo: 2.6, rCano: 0.0085, fim: "bate", seed: 2 }],
        },
        o: <Palavra txt="Água" y={1385} tam={104} />,
      };
    case "gordura":
      return {
        e: {
          t: 69.5, corte: ZK,
          cam: { az: 2, el: 3, dist: 0.5, alvo: [-0.6, -0.07, ZK], foco: 0.5, forca: 0.6, larg: 1.4 },
          pecas: { descida: 1, rua: 1, coz1: 1, cozMeio: 1, coz2: 1 }, vaso: { canal: "sifao" }, gordura: 0.82,
          pia: { nivel: 0.3 },
        },
        o: <Palavra txt="Endurece" y={1385} tam={104} />,
      };
    case "virada":
      return {
        e: {
          t: 124.5, corte: ZP,
          cam: { az: 28, el: 24, dist: 7.0, alvo: [0.0, 0.15, ZP], foco: 0.5, forca: 0.5 },
          pecas: TODAS, vaso: { canal: "sifao" },
          ped: { pos: [1.25, 0, ZP - 0.25], rotY: -0.6, item: "nada" },
          virada: { k: 0.6, k2: 0.2 },
        },
        o: <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} />,
      };
  }
}

export const Previa: React.FC<{ quadro: Quadro; limpo?: boolean; dir?: Dir }> = ({ quadro: q, limpo, dir = "A" }) => {
  const r = quadro(q);
  void PIA;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D e={r.e} dir={dir} />
      {!limpo && r.o}
    </AbsoluteFill>
  );
};
