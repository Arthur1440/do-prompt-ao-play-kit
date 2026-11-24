import React from "react";
import { Composition } from "remotion";
import { Reel, Amostras } from "./Reel";
import { DUR, FPS } from "./linha";
import type { Dir } from "./three/mundo";

export const AMOSTRAS_T = [0.6, 3.0, 5.5, 9.5, 12.0, 14.5, 19.5, 24.0, 30.0, 31.5, 38.5, 44.5];

export const RemotionRoot: React.FC = () => (
  <>
    {(["A", "B", "C"] as Dir[]).map((d) => (
      <Composition key={d} id={`Reel${d}`} component={Reel} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{ dir: d }} />
    ))}
    {(["A", "B", "C"] as Dir[]).map((d) => (
      <Composition
        key={"am" + d}
        id={`Amostras${d}`}
        component={Amostras}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={AMOSTRAS_T.length}
        defaultProps={{ dir: d, ts: AMOSTRAS_T }}
      />
    ))}
    <Composition id="BeijoA" component={Reel} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{ dir: "A" as Dir, assunto: "beijo" as const }} />
    <Composition id="CachorroA" component={Reel} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{ dir: "A" as Dir, assunto: "cachorro" as const }} />
    <Composition
      id="AmostrasCachorroA"
      component={Amostras}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={AMOSTRAS_T.length}
      defaultProps={{ dir: "A" as Dir, ts: AMOSTRAS_T, assunto: "cachorro" as const }}
    />
    <Composition
      id="AmostrasBeijoA"
      component={Amostras}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={AMOSTRAS_T.length}
      defaultProps={{ dir: "A" as Dir, ts: AMOSTRAS_T, assunto: "beijo" as const }}
    />
  </>
);
