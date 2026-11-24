// Quadros parados da prévia: (1) quadro 0 no corredor com os pinos; (2) "acorda mais de vinte vezes";
// (3) tela dividida do estudo quente × fria com a barra +20 min; (4) "ele acorda pra conferir se você continua aí";
// (5) a virada para IA (comum às três direções).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Legenda, Contador, RelogioGrande, Selo, BarraSono, RotuloLado } from "./comp/Graficos";
import { OndaRosto } from "./comp/Motion";
import { quadroAcorda, quadroConfere, splitQuente, splitFrio, estadoEm, T_PINO, paraDir } from "./linha";
import { Reel } from "./Reel";
import type { Dir } from "./three/kit";
import type { Estado } from "./three/mundo";
import { LEG } from "./comp/fontes";
import { COR } from "./comp/Overlay";

export type Quadro = "zero" | "acorda" | "split" | "confere" | "virada" | "mapa";

const Frase: React.FC<{ partes: { t: string; laranja?: boolean }[]; y?: number; tam?: number }> = ({ partes, y = 1385, tam = 96 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, transform: "translateY(-50%)", textAlign: "center", fontFamily: LEG, fontWeight: 900, fontSize: tam, lineHeight: 1.08, letterSpacing: -1, color: "#fff", textShadow: "0 6px 0 rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.6)" }}>
    {partes.map((q, i) => <span key={i} style={{ color: q.laranja ? COR.laranja : "#fff" }}>{q.t}{i < partes.length - 1 ? " " : ""}</span>)}
  </div>
);

export const Previa: React.FC<{ quadro: Quadro; dir?: Dir; tm?: number; cm?: number[] }> = ({ quadro: q, dir = "A", tm = 6, cm }) => {
  useCurrentFrame();
  if (q === "zero") return <ReelEm t={T_PINO.tapete - 0.05} dir={dir} />;
  let e: Estado, e2: Estado | null = null, o: React.ReactNode = null;
  if (q === "acorda") {
    e = paraDir(quadroAcorda(dir), dir);
    o = <><RelogioGrande txt="02:10" p={1} y={640} /><Contador p={1} y={330} /><Legenda palavras={["MAIS", "DE", "VINTE"]} ativa={2} p={1} /></>;
  } else if (q === "confere") {
    e = paraDir(quadroConfere(dir), dir);
    o = <Legenda palavras={["CONFERIR", "SE", "VOCÊ"]} ativa={0} p={1} />;
  } else if (q === "split") {
    e = paraDir(splitQuente(dir), dir); e2 = paraDir(splitFrio(dir), dir);
    o = (
      <>
        <RotuloLado txt="CARINHO E BRINCADEIRA" cor="#FFD23F" x={540} y={300} p={1} />
        <BarraSono k={1} p={1} y={720} />
        <RotuloLado txt="SOZINHO, REJEITADO" cor="#9fc2ff" x={540} y={1050} p={1} />
        <Selo txt="ESTUDO · HUNGRIA · 2017" p={1} y={1225} />
        <Legenda palavras={["VINTE", "MINUTOS", "A MAIS"]} ativa={1} p={1} y={1440} />
      </>
    );
  } else if (q === "mapa") {
    e = { ...estadoEm(tm, dir), semTeto: true, cam: cm ? { pos: [cm[0], cm[1], cm[2]], alvo: [cm[3], cm[4], cm[5]], fov: 40 } : { pos: [2.0, 7.5, 1.9], alvo: [2.0, 0, 1.6], fov: 50 } };
  } else {
    e = { ...estadoEm(5.9, dir), virada: { k: 1, k2: 0.3 } };
    o = <><OndaRosto t={1} t0={0} tMorf={99} tSai={99} /><Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} /></>;
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D e={e} e2={e2} dir={dir} />
      {o}
    </AbsoluteFill>
  );
};

/** um quadro do Reel num instante (para o quadro 0 com os pinos) */
const ReelEm: React.FC<{ t: number; dir: Dir }> = ({ t, dir }) => <Reel som={false} dir={dir} tFixo={t} />;
