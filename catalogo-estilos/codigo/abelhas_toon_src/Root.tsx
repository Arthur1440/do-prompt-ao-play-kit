import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composition, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Mundo, Plano } from "./three/mundo";
import type { Dir } from "./three/kit";
import { Reel, Amostras, Capa } from "./Reel";
import { N_QUADROS } from "./three/reel";

type Item = { plano: Plano };
const Previa: React.FC<{ dir: Dir; lista: Item[] }> = ({ dir, lista }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [pronto, setPronto] = useState(false);
  const [h0] = useState(() => delayRender("fonte"));
  useEffect(() => {
    const ff = new FontFace("Space Grotesk", `url(${staticFile("SpaceGrotesk.ttf")})`, { weight: "300 700" });
    ff.load().then((x) => {
      document.fonts.add(x);
      setPronto(true);
      continueRender(h0);
    });
  }, [h0]);
  useLayoutEffect(() => {
    if (!pronto || !ref.current) return;
    const h = delayRender("quadro");
    if (!mundo.current) mundo.current = new Mundo(ref.current, dir, width, height);
    const m = mundo.current;
    const it = lista[Math.min(f, lista.length - 1)];
    m.mostra(it.plano, f / 30);
    m.render();
    m.render();
    if (m.log.length) {
      console.log("LOG " + m.log.join(" | "));
      m.log = [];
    }
    continueRender(h);
  }, [f, pronto, dir, lista, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Capa" component={Capa} fps={30} width={1080} height={1920} durationInFrames={1} />
    <Composition id="Reel" component={Reel} fps={30} width={1080} height={1920} durationInFrames={N_QUADROS} />
    <Composition
      id="Amostras"
      component={Amostras}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{ lista: [0.5] as number[] }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.lista.length })}
    />
    <Composition
      id="Previa"
      component={Previa}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{ dir: "B" as Dir, lista: [{ plano: "gancho" as Plano }] }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.lista.length })}
    />
  </>
);
