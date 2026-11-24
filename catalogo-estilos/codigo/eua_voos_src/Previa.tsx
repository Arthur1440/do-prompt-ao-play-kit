import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { AMAR, Escurece, Etiqueta, Ilustracao, Legenda, Riscado, SeloFonte, SeloUrgente, Titulo, VERM, LAR, Virada } from "./comp/Overlay";
import type { Dir } from "./three/kit";
import type { Cena, Estado } from "./three/mundo";

const ESTADOS: Record<Cena, Estado> = {
  gancho: { cena: "gancho", apaga: 1, vermelho: 1, rede: 0, tFix: 2.4 },
  centros: { cena: "centros", rede: 1, caidos: 12, tFix: 26.4 },
  disquete: { cena: "disquete", insere: 0.12, rede: 0, tFix: 75 },
  celular: { cena: "celular", envio: 1, carimbo: 1, rede: 0, tFix: 84 },
  virada: { cena: "virada", tFix: 89 },
};

export const Previa: React.FC<{ dir: Dir; cena: Cena }> = ({ dir, cena }) => {
  const e = ESTADOS[cena];
  const claro = dir !== "C";
  void AMAR;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} e={e} t={e.tFix ?? 0} />
      {cena !== "virada" && <Escurece />}
      {cena !== "virada" && <SeloUrgente />}
      {(cena === "gancho" || cena === "centros") && <Ilustracao claro={claro && dir === "B"} />}
      {cena === "gancho" && (
        <>
          <Titulo linhas={[["NENHUM AVIÃO", "#fff"], ["DECOLA", VERM]]} tam={168} top={352} />
          <Legenda texto="nenhum avião *decola*" />
        </>
      )}
      {cena === "centros" && (
        <>
          <Titulo linhas={[["CAIU A COMUNICAÇÃO", "#fff"], ["DOS 22 CENTROS", LAR]]} tam={120} top={340} />
          <SeloFonte texto="SEAN DUFFY · SECRETÁRIO DE TRANSPORTES" top={590} />
          <Riscado texto="RADAR" r={1} x={330} top={1190} />
          <Riscado texto="RÁDIO" r={0.7} x={750} top={1190} />
          <Legenda texto="*radar* e *rádio*" />
        </>
      )}
      {cena === "disquete" && (
        <>
          <Titulo linhas={[["AINDA RODAVA COM", "#fff"], ["DISQUETE", LAR]]} tam={140} />
          <SeloFonte texto="ATÉ POUCO TEMPO" top={636} />
          <Legenda texto="com *disquete*" />
        </>
      )}
      {cena === "celular" && (
        <>
          <Titulo linhas={[["MANDA PRA QUEM VAI VIAJAR", "#fff"]]} tam={92} top={340} />
          <Legenda texto="manda esse vídeo para essa pessoa" top={1395} />
        </>
      )}
      {cena === "virada" && <Virada />}
    </AbsoluteFill>
  );
};
