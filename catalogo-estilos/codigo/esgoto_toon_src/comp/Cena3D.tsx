import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useVideoConfig } from "remotion";
import { Mundo, Estado } from "../three/mundo";
import { fontesProntas } from "./fontes";
import type { Dir } from "../three/kit";

// Canvas 3D imperativo: o estado é função pura do tempo (render fora de ordem ok).
export const Cena3D: React.FC<{ e: Estado; dir?: Dir }> = ({ e, dir = "A" }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const { width, height } = useVideoConfig();
  const [pronto, setPronto] = useState(false);
  const [hF] = useState(() => delayRender("fontes"));
  useLayoutEffect(() => {
    fontesProntas().then(() => {
      setPronto(true);
      continueRender(hF);
    });
  }, [hF]);
  useLayoutEffect(() => {
    if (!ref.current || !pronto) return;
    const h = delayRender("quadro 3D");
    let novo = false;
    if (!mundo.current) {
      mundo.current = new Mundo(ref.current, dir, width, height);
      novo = true;
    }
    const m = mundo.current;
    m.aplica(e);
    if (novo) m.render(e.t); // aquece o renderizador (o 1º quadro saía diferente)
    m.render(e.t);
    continueRender(h);
  }, [e, width, height, pronto]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
