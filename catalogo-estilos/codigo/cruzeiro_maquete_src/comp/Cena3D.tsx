import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { useT } from "./tempo";
import { Mundo, Estado } from "../three/mundo";
import { estado } from "../cenas";
import { carrega } from "../three/tex";
import type { Recursos } from "../three/sets";
import type { Dir } from "../three/kit";
import { FONTES_PRONTAS } from "./fontes";

let recursos: Promise<Recursos> | null = null;
const carregaRecursos = () =>
  (recursos ??= Promise.all([
    carrega(staticFile("raposa_desenho.png")),
    carrega(staticFile("mangabeira.png")),
    carrega(staticFile("palestra_1922.jpg")),
    carrega(staticFile("mascotes.png")),
    carrega(staticFile("cruzeiro_do_sul_mapa_blaeu_1602.png")),
    carrega(staticFile("raposao_2003.png")),
  ]).then(([desenho, mangabeira, palestra, mascotes, blaeu, raposao]) => ({ desenho, mangabeira, palestra, mascotes, blaeu, raposao })));

// Canvas 3D imperativo: o estado é função pura do tempo (render fora de ordem ok).
export const Cena3D: React.FC<{ dir: Dir; est?: Estado }> = ({ dir, est }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const { t } = useT();
  const { width, height } = useVideoConfig();
  const [rec, setRec] = useState<Recursos | null>(null);
  const [h0] = useState(() => delayRender("recursos e fontes"));
  useEffect(() => {
    Promise.all([carregaRecursos(), FONTES_PRONTAS()]).then(([r]) => {
      setRec(r);
      continueRender(h0);
    });
  }, [h0]);
  useLayoutEffect(() => {
    if (!rec || !ref.current) return;
    const h = delayRender("quadro 3D");
    let novo = false;
    if (!mundo.current) {
      mundo.current = new Mundo(ref.current, dir, width, height, rec);
      novo = true;
    }
    const m = mundo.current;
    m.aplica(est ?? estado(t, dir), t);
    if (novo) m.render();
    m.render();
    continueRender(h);
  }, [t, dir, width, height, rec, est]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
