import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Ano, Gancho, Legenda, Selo, Virada, LARANJA } from "./comp/Overlay";
import { ChamadaPlay, Comentarios, Escudos, Placar } from "./comp/Telas";
import { TempoCtx, useT } from "./comp/tempo";
import { F } from "./comp/fontes";
import { FIM_FALA } from "./cenas";
import { clamp } from "./three/rng";
import type { Dir } from "./three/kit";

const AteVoz: React.FC = () => {
  const { t } = useT();
  if (t < 63.19 || t > 64.2) return null;
  const k = clamp((t - 63.19) / 0.2);
  return (
    <div style={{ position: "absolute", top: 545, left: 0, right: 0, textAlign: "center", fontFamily: F.sg, fontWeight: 500, fontSize: 64, color: "#ffd2b8", opacity: k }}>
      até a minha <span style={{ color: LARANJA, fontWeight: 700 }}>voz</span>.
    </div>
  );
};

const Camadas: React.FC<{ dir: Dir }> = ({ dir }) => (
  <>
    <Cena3D dir={dir} />
    <Gancho dir={dir} />
    <Ano dir={dir} texto="ANOS 40" t0={3.68} t1={5.25} />
    <Selo dir={dir} texto="Mangabeira" t0={5.3} t1={6.05} x={300} y={1120} icone="✎" />
    <Selo dir={dir} texto="Folha de Minas, anos 40" t0={9.26} t1={10.45} x={70} y={1150} icone="✎" />
    <Selo dir={dir} texto="homenagem a Mário Grosso" t0={13.72} t1={16.5} x={70} y={1150} icone="★" />
    <Ano dir={dir} texto="1921" t0={25.16} t1={27.4} />
    <Selo dir={dir} texto="Palestra Itália, 1921" t0={25.5} t1={27.4} x={70} y={520} icone="★" />
    <Ano dir={dir} texto="2ª GUERRA" t0={31.54} t1={33.9} />
    <Selo dir={dir} texto="decreto: nomes do Eixo proibidos" t0={34.06} t1={35.8} x={60} y={1150} icone="!" />
    <Ano dir={dir} texto="1942" t0={36.18} t1={37.9} />
    <Selo dir={dir} texto="Cruzeiro do Sul" t0={41.42} t1={42.75} x={70} y={520} icone="★" />
    <Ano dir={dir} texto="2003" t0={48.76} t1={50.05} />
    <Selo dir={dir} texto="2003: o Raposão" t0={50.08} t1={51.25} x={70} y={290} icone="★" />
    <Placar t0={52.02} t1={54.32} />
    <Selo dir={dir} texto="Tríplice Coroa" t0={53.56} t1={54.32} x={70} y={500} icone="♛" />
    <Comentarios t0={56.05} t1={61.29} congela={60.42} tempos={[56.75, 57.3, 57.85, 59.0]} />
    <Virada t0={61.29} t1={64.2} />
    <AteVoz />
    <Escudos t0={64.2} t1={67.2} tempos={[64.45, 64.85, 65.25, 65.65, 66.05, 66.45]} />
    <ChamadaPlay t0={67.2} t1={FIM_FALA} toque={67.35} digita={[67.62, 68.15]} link={69.05} marca={71.11} />
    <Legenda dir={dir} esconde={(t) => t < 3.45 || (t > 61.2 && t < 64.2) || t > 71.05} />
  </>
);

export const Reel: React.FC<{ dir: Dir; som?: boolean }> = ({ dir, som = false }) => {
  const { t } = useT();
  const loop = t >= FIM_FALA; // os últimos quadros repetem o quadro 0
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {loop ? (
        <TempoCtx.Provider value={0}>
          <Camadas dir={dir} />
        </TempoCtx.Provider>
      ) : (
        <Camadas dir={dir} />
      )}
      {som ? <Audio src={staticFile("narracao.m4a")} /> : null}
    </AbsoluteFill>
  );
};
