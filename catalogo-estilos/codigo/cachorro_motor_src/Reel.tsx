import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D, TempoCtx, useT } from "./comp/base";
import { Overlay } from "./comp/Overlay";
import { T, suave, Tema } from "./linha";
import type { Dir } from "./three/mundo";

const Quadro: React.FC<{ dir: Dir; assunto?: Tema }> = ({ dir, assunto = "dedo" }) => {
  const t = useT();
  const c = suave((t - T.cta) / 0.6);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} assunto={assunto} estilo={c > 0 ? { filter: `blur(${c * 16}px) brightness(${1 - c * 0.62})`, transform: `scale(${1 + c * 0.06})` } : undefined} />
      <Overlay dir={dir} assunto={assunto} />
    </AbsoluteFill>
  );
};

export const Reel: React.FC<{ dir: Dir; assunto?: Tema }> = ({ dir, assunto }) => <Quadro dir={dir} assunto={assunto} />;

/** Várias amostras (uma por quadro): ts[i] é o tempo do quadro i. */
export const Amostras: React.FC<{ dir: Dir; ts: number[]; assunto?: Tema }> = ({ dir, ts, assunto }) => {
  const t = useT();
  const i = Math.min(ts.length - 1, Math.round(t * 30));
  return (
    <TempoCtx.Provider value={ts[i]}>
      <Quadro dir={dir} assunto={assunto} />
    </TempoCtx.Provider>
  );
};
