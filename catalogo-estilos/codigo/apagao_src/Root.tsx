import React from "react";
import { Composition } from "remotion";
import { Previa, Quadro } from "./Previa";
import { Reel } from "./Reel";
import { Capa } from "./Capa";
import { QUADROS } from "./linha";
import type { Dir } from "./three/kit";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={QUADROS} fps={30} width={1080} height={1920} />
    <Composition id="Capa" component={Capa} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="Previa" component={Previa} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ dir: "A" as Dir, quadro: "q0" as Quadro }} />
  </>
);
