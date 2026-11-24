import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useRemotionEnvironment } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { useT } from "./comp/tempo";
import { Chamada, Gancho, Legenda, Lista, Manometro, Prompt, SeloAnel, SelosParabens, Termometro, Varredura, VozRosto } from "./comp/Motion";
import { estado } from "./three/cenas";
import type { Dir } from "./three/kit";

export const Reel: React.FC<{ dir: Dir; som?: boolean }> = ({ dir, som = true }) => {
  const { t } = useT();
  const e = useMemo(() => estado(t, dir), [t, dir]);
  const env = useRemotionEnvironment();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={t} />
      <Termometro t={t} />
      <Manometro t={t} />
      <Lista t={t} e={e} />
      <SeloAnel t={t} e={e} />
      <SelosParabens t={t} e={e} />
      <VozRosto t={t} />
      <Prompt t={t} />
      <Chamada t={t} />
      <Gancho t={t} e={e} />
      <Legenda t={t} />
      <Varredura t={t} />
      {som && !env.isRendering && <Audio src={staticFile("narracao_editada.wav")} />}
    </AbsoluteFill>
  );
};
