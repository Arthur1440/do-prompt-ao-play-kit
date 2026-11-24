import React from "react";
import { Composition } from "remotion";
import { Previa } from "./Previa";
import { Reel } from "./Reel";
import { Capa } from "./Capa";
import { DURACAO } from "./fala";
import type { Dir } from "./three/kit";
import type { Cena } from "./three/mundo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={Math.round(DURACAO * 30)} fps={30} width={1080} height={1920} />
    <Composition id="Capa" component={Capa} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="Previa" component={Previa} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ dir: "C" as Dir, cena: "gancho" as Cena }} />
  </>
);
