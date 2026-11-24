import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { Mundo, Dir } from "../three/mundo";
import { setTema, Tema } from "../linha";

const fi = inter("normal", { weights: ["500", "700", "800", "900"], subsets: ["latin", "latin-ext"] });
export const FONTE = fi.fontFamily;
let pronto: Promise<unknown> | null = null;
export const FONTES_PRONTAS = () =>
  (pronto ??= fi.waitUntilDone().then(() => Promise.all([document.fonts.load(`800 100px ${FONTE}`), document.fonts.load(`500 40px ${FONTE}`)])));

// Tempo forçado (amostras): se houver, substitui o quadro atual.
export const TempoCtx = React.createContext<number | null>(null);
export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = React.useContext(TempoCtx);
  return o ?? f / fps;
};

// Canvas 3D imperativo: o estado é função pura do tempo (render fora de ordem ok).
export const Cena3D: React.FC<{ dir: Dir; assunto?: Tema; estilo?: React.CSSProperties }> = ({ dir, assunto = "dedo", estilo }) => {
  setTema(assunto);
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const t = useT();
  const { width, height } = useVideoConfig();
  const [ok, setOk] = useState(false);
  const [h0] = useState(() => delayRender("fontes"));
  useEffect(() => {
    FONTES_PRONTAS().then(() => {
      setOk(true);
      continueRender(h0);
    });
  }, [h0]);
  useLayoutEffect(() => {
    if (!ok || !ref.current) return;
    const h = delayRender("quadro 3D");
    let novo = false;
    if (!mundo.current) {
      mundo.current = new Mundo(ref.current, dir, width, height, assunto);
      novo = true;
    }
    const m = mundo.current;
    (window as unknown as { __mundo?: Mundo }).__mundo = m;
    m.aplica(t);
    if (novo) m.render(); // aquece shaders
    m.render();
    continueRender(h);
  }, [t, dir, width, height, ok]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...estilo }} />;
};
