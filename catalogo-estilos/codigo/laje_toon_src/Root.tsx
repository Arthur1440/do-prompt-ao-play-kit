import React from "react";
import { Composition } from "remotion";
import { Ficha, Vista } from "./Ficha";
import { Capa } from "./Capa";
import { Reel } from "./Reel";
import { Previa, Quadro } from "./Previa";
import { QUADROS } from "./linha";
import type { Dir } from "./three/kit";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={QUADROS} fps={30} width={1080} height={1920} defaultProps={{ dir: "B" as Dir, som: true }} />
    <Composition id="Previa10" component={Reel} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{ dir: "B" as Dir }} />
    <Composition id="Previa" component={Previa} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ dir: "B" as Dir, quadro: "gancho" as Quadro }} />
    <Composition id="Capa" component={Capa} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="Ficha" component={Ficha} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ dir: "B" as Dir, vista: "frente" as Vista }} />
  </>
);
