// Quadros de prévia das 3 direções: o concreto caindo no gancho, a tábua despencando com a churrasqueira,
// o corte da laje com as setas e a trinca, a laje envergando; mais a virada para IA (comum às três).
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Palavra, Frase, Rotulo } from "./comp/Rotulos";
import { projeta } from "./projecao";
import type { Dir } from "./three/kit";
import type { Estado } from "./three/mundo";
import { estadoEm as gancho, A, CH0 } from "./linha";
import { HP, IZ } from "./three/casa";
import { barriga } from "./three/laje";

export type Quadro = "gancho" | "despenca" | "trinca" | "enverga" | "virada";

const FINAL_LAJE = { vigotas: 5, blocos: 1, capa: 1, cinta: 1 };

function quadro(q: Quadro): { e: Estado; o: React.ReactNode } {
  switch (q) {
    case "gancho": {
      const e = gancho(A(21) + 0.12);
      return {
        e: {
          ...e,
          cam: { az: 84, el: 9, dist: 6.0, fov: 30, alvo: [0.55, 1.08, 0.98], foco: 0.5 },
          casa: {}, corte: 0.95, corteEixo: "x",
          ch: { ...e.ch, susto: 1, olhos: 1, esmaga: 0 },
          ped: { ...e.ped!, vis: true, inclina: 0.42, bE: { abre: 0.05, frente: 1.45, cot: 0.35 }, bD: { abre: 0.05, frente: 1.4, cot: 0.3 }, cab: [0.6, 0, 0], olhos: "susto", item: "balde", itemMao: "D", balde: { vira: 1 } },
        },
        o: <Palavra txt="Cabeça" />,
      };
    }
    case "despenca": {
      return {
        e: {
          t: 20, cam: { az: -4, el: 5, dist: 6.7, fov: 30, alvo: [0.2, 0.95, 0.1], foco: 0.5 }, corte: IZ - 0.03,
          casa: { escada: false }, laje: { tabuas: 9, tabVerga: 1, tabQuebra: 0.42, concForma: 1 },
          ch: { p: [0.0, 0.03, 0.1], rotY: -0.3, susto: 1 },
          conc: { bolas: [{ p: [-0.12, 0.98, 0.15], r: 0.13 }, { p: [0.2, 0.78, -0.25], r: 0.1 }] },
          ped: { pos: [0.86, 0.0, 0.85], rotY: -0.45, sq: 0.84, inclina: 0.12, olhos: "susto", boca: "O", bone: 0.9, cab: [-0.35, 0, 0], bE: { abre: 0.5, frente: 2.7, cot: 1.3 }, bD: { abre: 0.5, frente: 2.7, cot: 1.3 }, pE: { frente: 0.6, joelho: 1.1 }, pD: { frente: 0.6, joelho: 1.1 } },
        },
        o: <Palavra txt="Despenca" />,
      };
    }
    case "trinca": {
      const lv = 0.55;
      const yTopo = (x: number) => HP + 0.16 * 2.2 - lv * 0.22 * barriga(x);
      return {
        e: {
          t: 40, cam: { az: 0, el: 3, dist: 5.4, fov: 30, alvo: [0, HP + 0.12, 0], foco: 0.55 }, corte: 0.0, casa: { escada: false },
          laje: { macica: 1, macEsp: 2.2, laVerga: lv, trinca: 0.85, setas: 1 },
          ch: { p: [-0.32, yTopo(-0.32), -0.35], rotY: 0.2, susto: 0.6 },
          ped: { pos: [0.3, yTopo(0.3), -0.3], rotY: -0.25, olhos: "preocupado", cab: [0.45, 0, 0], bE: { abre: 0.3, frente: 0.2, cot: 0.4 }, bD: { abre: 0.3, frente: 0.2, cot: 0.4 } },
        },
        o: (
          <>
            <Palavra txt="Trinca" />
          </>
        ),
      };
    }
    case "enverga": {
      return {
        e: {
          t: 120, cam: { az: 4, el: 6, dist: 7.6, fov: 30, alvo: [-0.38, 0.85, 0], foco: 0.5 }, corte: IZ - 0.03,
          casa: { escada: false }, laje: { ...FINAL_LAJE, laVerga: 4.0, escoras: 12, escorasSai: 1 },
          ch: { p: [0.0, 0.03, 0.0], rotY: -0.2, esmaga: 0.12, susto: 1, tampa: 0.0 },
          ped: { pos: [-1.08, 0.0, 0.62], rotY: 0.45, sq: 0.92, inclina: -0.18, olhos: "susto", boca: "O", bone: 0.7, bE: { abre: 1.1, frente: 0.7, cot: 0.7 }, bD: { abre: 1.1, frente: 0.7, cot: 0.7 }, pE: { frente: 0.4, joelho: 0.6 }, pD: { frente: -0.25, joelho: 0.2 } },
        },
        o: <Palavra txt="Enverga" />,
      };
    }
    case "virada": {
      const yL = HP + 0.18;
      return {
        e: {
          t: 143, cam: { az: -24, el: 16, dist: 7.4, fov: 30, alvo: [-0.1, 1.45, 0.3], foco: 0.5 }, casa: { escada: false },
          laje: { ...FINAL_LAJE, mureta: 1, ralo: 1 },
          ch: { p: [0.35, yL, 0.2], carne: 1, fumaca: 1 },
          ped: { pos: [0.75, yL, 0.35], rotY: -0.6, olhos: "feliz", bE: { abre: 0.4, frente: 1.0, cot: 0.9 }, bD: { abre: 0.3, frente: 0.2, cot: 0.3 } },
          fam: [{ pos: [-0.2, yL, 0.1], rotY: 0.6, olhos: "feliz", boca: "sorriso" }, { pos: [0.1, yL, 0.6], rotY: 0.2, esc: 0.72, olhos: "feliz", boca: "sorriso" }],
          virada: { k: 0.62, k2: 0.22 },
        },
        o: <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} />,
      };
    }
  }
}

export const Previa: React.FC<{ dir: Dir; quadro: Quadro; limpo?: boolean }> = ({ dir, quadro: q, limpo }) => {
  const r = quadro(q);
  void CH0; void projeta; void Rotulo;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} e={r.e} />
      {!limpo && r.o}
    </AbsoluteFill>
  );
};
