import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useVideoConfig } from "remotion";
import { useT } from "./tempo";
import { Mundo, Estado } from "../three/mundo";
import { estado } from "../three/cenas";
import type { Dir } from "../three/kit";

// Canvas 3D imperativo: o estado é função pura do tempo (render fora de ordem ok).
export const Cena3D: React.FC<{ dir: Dir; muda?: (e: Estado, t: number) => Estado }> = ({ dir, muda }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const { t } = useT();
  const { width, height } = useVideoConfig();
  const [fonte, setFonte] = useState(false);
  const [hFonte] = useState(() => delayRender("fontes"));
  useEffect(() => {
    Promise.all([document.fonts.load("700 100px 'Space Grotesk'"), document.fonts.load("400 100px 'Bungee'")]).then(() => {
      setFonte(true);
      continueRender(hFonte);
    });
  }, [hFonte]);
  useLayoutEffect(() => {
    if (!fonte || !ref.current) return;
    const h = delayRender("quadro 3D");
    let novo = false;
    if (!mundo.current) {
      mundo.current = new Mundo(ref.current, dir, width, height);
      novo = true;
    }
    const m = mundo.current;
    let e = estado(t, dir);
    if (muda) e = muda(e, t);
    m.aplica(e, t);
    if (novo) m.render();
    m.render();
    continueRender(h);
  }, [t, dir, muda, width, height, fonte]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
