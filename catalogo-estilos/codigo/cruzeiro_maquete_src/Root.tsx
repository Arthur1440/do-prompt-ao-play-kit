import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { Amostras } from "./Amostras";
import { Capa } from "./Capa";
import fala from "./fala.json";
import type { Dir } from "./three/kit";

export const DURACAO = fala.dur;

export const RemotionRoot: React.FC = () => (
  <>
    {(["A", "B", "C"] as Dir[]).map((d) => (
      <Composition key={d} id={`Reel${d}`} component={Reel} durationInFrames={Math.round(DURACAO * 30)} fps={30} width={1080} height={1920} defaultProps={{ dir: d, som: true }} />
    ))}
    <Composition id="Capa" component={Capa} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition
      id="Amostras"
      component={Amostras}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{ dir: "B" as Dir, ts: [0.6, 8.6, 38.95, 46.0, 62.6] }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.ts.length })}
    />
  </>
);
