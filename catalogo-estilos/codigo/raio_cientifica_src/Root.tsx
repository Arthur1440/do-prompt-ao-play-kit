import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { Amostras } from "./Amostras";
import { Capa } from "./Capa";
import { DURACAO } from "./fala";
import type { Dir } from "./three/kit";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={Math.round(DURACAO * 30)} fps={30} width={1080} height={1920} defaultProps={{ dir: "A" as Dir, som: true }} />
    <Composition id="Capa" component={Capa} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ dir: "C" as Dir }} />
    <Composition
      id="Amostras"
      component={Amostras}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{ lista: [{ dir: "A" as Dir, t: 0 }] as { dir: Dir; t: number }[] }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.lista.length })}
    />
  </>
);
