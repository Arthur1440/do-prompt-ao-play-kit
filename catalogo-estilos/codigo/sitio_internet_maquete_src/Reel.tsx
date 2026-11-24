import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useRemotionEnvironment } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { useT } from "./comp/tempo";
import { Chamada, Conta, Envio, Gancho, Internet, Legenda, Luz, PontaDoLapis, Prompt, RiscoConta, RiscoPipa, SelosComo, VozRosto } from "./comp/Motion";
import { estado, tl } from "./three/cenas";
import type { Dir } from "./three/kit";

export const Reel: React.FC<{ dir: Dir; som?: boolean }> = ({ dir, som = true }) => {
  const { t } = useT();
  const e = useMemo(() => estado(t, dir), [t, dir]);
  const env = useRemotionEnvironment();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Cena3D dir={dir} e={e} t={tl(t)} />
      <RiscoConta t={t} />
      <RiscoPipa t={t} e={e} />
      <SelosComo t={t} e={e} />
      <Conta t={t} e={e} />
      <Luz t={t} e={e} />
      <Internet t={t} e={e} />
      <PontaDoLapis t={t} e={e} />
      <Envio t={t} />
      <VozRosto t={t} />
      <Prompt t={t} />
      <Chamada t={t} />
      <Gancho t={t} />
      <Legenda t={t} />
      {som && !env.isRendering && <Audio src={staticFile("narracao_editada.wav")} />}
    </AbsoluteFill>
  );
};
