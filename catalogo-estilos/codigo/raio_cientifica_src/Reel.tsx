import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useRemotionEnvironment } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { useT } from "./comp/tempo";
import { Chamada, Contador26, Contador3, Cronometro, Ditado, Gancho, Legenda, MesmoPonto, Prompt, Regua, Selo, Varredura, Visor, VozRosto } from "./comp/Motion";
import { estado, M, tl } from "./three/cenas";
import type { Dir } from "./three/kit";

export const Reel: React.FC<{ dir: Dir; som?: boolean }> = ({ dir, som = true }) => {
  const { t } = useT();
  const e = useMemo(() => estado(t, dir), [t, dir]);
  const env = useRemotionEnvironment();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={tl(t)} />
      <Visor t={tl(t)} dir={dir} />
      <Regua t={t} e={e} />
      <MesmoPonto t={t} e={e} />
      <Selo t={t} ini={M.pico + 0.15} fim={M.pesq - 0.05} texto="Pico do Jaraguá" ico="pin" x={60} y={430} />
      <Selo t={t} ini={M.pesq + 0.7} fim={M.os - 0.05} texto="INPE" ico="lab" x={60} y={430} />
      <Selo t={t} ini={M.empire + 0.05} fim={M.virada - 0.1} texto="Empire State · Nova York" ico="predio" x={60} y={860} />
      <Cronometro t={t} />
      <Contador3 t={t} />
      <Ditado t={t} />
      <Contador26 t={t} />
      <VozRosto t={t} />
      <Prompt t={t} />
      <Chamada t={t} />
      <Gancho t={t} />
      <Legenda t={t} />
      <Varredura t={t} />
      {som && !env.isRendering && <Audio src={staticFile("narracao_editada.wav")} />}
    </AbsoluteFill>
  );
};
