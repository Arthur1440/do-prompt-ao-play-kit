import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Rotulo, Palavra, Frase } from "./comp/Rotulos";
import { projeta } from "./projecao";
import type { Dir } from "./three/kit";
import type { Estado, Cam } from "./three/mundo";
import { IN, RALOS } from "./three/piscina";

export type Quadro = "gancho" | "racha" | "ralo" | "sobe" | "virada" | "rachaSem";

const PRONTA = { concreto: 1, imper: 1, azulejo: 1, borda: 1, ralos: 2, coadeira: 1, retornos: 1, valvula: 1, porta: 0.3 };

function quadro(q: Quadro, dir: Dir): { e: Estado; o: React.ReactNode } {
  switch (q) {
    case "gancho": {
      const cam: Cam = { az: -14, el: 36, dist: 8.4, fov: 30, alvo: [0.35, -0.35, 0.25], foco: 0.42 };
      return {
        e: {
          t: 1.2, cam, ter: { modo: "buraco", colapso: 0.62 }, lama: { nivel: -0.32 }, pis: {},
          fla: { p: [0.5, -0.47, 0.35], giro: -0.9, incl: [0.12, -0.38], lama: 0.3, olhos: 1.45, pescocoDobra: 0.1 },
        },
        o: <Palavra txt="Lamaçal" />,
      };
    }
    case "racha": {
      const cam: Cam = { az: 6, el: 15, dist: 10.5, fov: 30, alvo: [0.2, -0.75, -0.7], foco: 0.5, abert: 2.2 };
      return {
        e: {
          t: 18.9, cam, corte: 0, maq: 0, ter: { modo: "obra", sujeira: 0.8 },
          pis: { tijolo: 1, reboco: 1, estufa: 1, racha: 1, abre: 0.32, agua: 1, nivel: -0.5, cor: { lama: 0.12 }, vazaRacha: 1 },
          fla: { p: [0.78, -0.58, -0.78], giro: 0.45, incl: [-0.25, 0.42], sq: 0.78, olhos: 1.8, pescocoDobra: 0.3, esc: 0.8 },
        },
        o: <Palavra txt="Racha" />,
      };
    }
    case "ralo": {
      const cam: Cam = { az: -12, el: 13, dist: 13.5, fov: 30, alvo: [-0.15, -1.1, -0.3], foco: 0.5, abert: 2.2 };
      const yr = IN.y + 0.02;
      const [a, b] = projeta(cam, [[RALOS[0][0], yr, RALOS[0][1]], [RALOS[1][0], yr, RALOS[1][1]]]);
      return {
        e: {
          t: 80.5, cam, corte: 0, ter: { modo: "obra" },
          pis: { ...PRONTA, agua: 1, nivel: -0.12 },
          fla: { p: [RALOS[0][0], IN.y + 0.07, RALOS[0][1]], giro: 0.6, incl: [0.1, 0.05], sq: 0.62, pescoco: 1.22, pescocoDobra: 0.15, olhos: 1.6 },
        },
        o: (
          <>
            <Rotulo txt="DOIS RALOS" x={540} y={Math.max(330, a[1] - 560)} alvo={[a, b]} />
            <Palavra txt="Prende" />
          </>
        ),
      };
    }
    case "sobe": {
      const cam: Cam = { az: -14, el: 9, dist: 13, fov: 30, alvo: [0.4, 0.15, -0.2], foco: 0.5 };
      return {
        e: {
          t: 113.4, cam, corte: 0, ter: { modo: "obra", lencol: -0.62 }, lencolGap: 0.95,
          pis: { ...PRONTA, agua: 0, sobe: 0.85 },
          fla: { p: [0.75, 1.75, -0.25], giro: 0.4, incl: [2.5, 0.5], sq: 1.15, olhos: 1.7, pescocoDobra: 0.4 },
        },
        o: <Palavra txt="Sobe" />,
      };
    }
    case "virada": {
      const cam: Cam = { az: -16, el: 34, dist: 10.2, fov: 30, alvo: [0.25, -0.35, 0.15], foco: 0.4 };
      return {
        e: {
          t: 143, cam, ter: { modo: "obra" },
          pis: { ...PRONTA, agua: 1, nivel: -0.12, jatoRet: 0.6 },
          fla: { p: [0.4, -0.14, 0.2], giro: -0.5 },
          virada: { k: 0.55, k2: 0.18 },
        },
        o: <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} />,
      };
    }
  }
}

export const Previa: React.FC<{ dir: Dir; quadro: Quadro; limpo?: boolean }> = ({ dir, quadro: q, limpo }) => {
  const r = quadro(q === "rachaSem" ? "racha" : q, dir);
  const e = q === "rachaSem" ? { ...r.e, fla: { vis: false } } : r.e;
  const o = r.o;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} e={e} />
      {!limpo && o}
    </AbsoluteFill>
  );
};
