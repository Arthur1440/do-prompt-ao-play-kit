import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useRemotionEnvironment } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { useT } from "./comp/tempo";
import { SolNorte, Chamada, Chips, Comparacao, Envio, Gancho, Legenda, Parabens, Prompt, Prova, Selos, VozRosto } from "./comp/Motion";
import { estado, tl } from "./three/cenas";
import type { Dir } from "./three/kit";

export const Reel: React.FC<{ dir: Dir; som?: boolean; semTexto?: boolean }> = ({ dir, som = true, semTexto = false }) => {
  const { t } = useT();
  const e = useMemo(() => estado(t, dir), [t, dir]);
  const env = useRemotionEnvironment();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={tl(t)} />
      {!semTexto && (
        <>
          <Selos t={t} e={e} />
          <Chips t={t} />
          <SolNorte t={t} />
          <Comparacao t={t} />
          <Prova t={t} e={e} />
          <Parabens t={t} e={e} />
          <Envio t={t} />
          <VozRosto t={t} />
          <Prompt t={t} />
          <Chamada t={t} />
          <Gancho t={t} />
          <Legenda t={t} />
        </>
      )}
      {som && !env.isRendering && <Audio src={staticFile("narracao_editada.wav")} />}
    </AbsoluteFill>
  );
};
