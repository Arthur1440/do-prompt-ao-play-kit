import React, { useLayoutEffect, useRef } from "react";
import { continueRender, delayRender, useVideoConfig } from "remotion";
import { Mundo, Estado } from "../three/mundo";
import type { Dir } from "../three/kit";

// Canvas 3D imperativo: o estado é função pura do tempo (render fora de ordem ok).
export const Cena3D: React.FC<{ dir: Dir; e: Estado; t: number }> = ({ dir, e, t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    if (!ref.current) return;
    const h = delayRender("quadro 3D");
    let novo = false;
    if (!mundo.current) {
      mundo.current = new Mundo(ref.current, dir, width, height);
      novo = true;
    }
    const m = mundo.current;
    m.aplica(e, t);
    if (novo) m.render(); // aquece o renderizador (o 1º quadro saía diferente)
    m.render();
    continueRender(h);
  }, [t, dir, e, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
