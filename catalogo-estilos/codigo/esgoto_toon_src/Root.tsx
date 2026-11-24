import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { Previa, Quadro } from "./Previa";
import { Capa } from "./Capa";
import { QUADROS } from "./linha";
import type { Dir } from "./three/kit";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={QUADROS} fps={30} width={1080} height={1920} defaultProps={{ som: true, dir: "B" as Dir }} />
    <Composition id="Previa10" component={Reel} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{ som: true, dir: "B" as Dir }} />
    <Composition id="Previa" component={Previa} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ quadro: "gancho" as Quadro, dir: "B" as Dir }} />
    <Composition id="Capa" component={Capa} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
