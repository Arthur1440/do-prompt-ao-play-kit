import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useVideoConfig } from "remotion";
import { Mundo, Estado } from "../three/mundo";
import { fontesProntas } from "./fontes";
import { carregaTodos, Arq } from "../three/modelos";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Dir } from "../three/kit";

// Canvas 3D imperativo: o estado é função pura do tempo (render fora de ordem ok).
// Tela dividida: com `e2`, o mesmo mundo renderiza `e` (metade de cima: faixa central do quadro copiada para um
// canvas 2D) e depois `e2` (metade de baixo: faixa central do canvas WebGL).
export const Cena3D: React.FC<{ e: Estado; dir?: Dir; e2?: Estado | null }> = ({ e, dir = "A", e2 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const cima = useRef<HTMLCanvasElement>(null);
  const mundo = useRef<Mundo | null>(null);
  const { width, height } = useVideoConfig();
  const [pronto, setPronto] = useState(false);
  const [hF] = useState(() => delayRender("fontes"));
  const gl = useRef<Record<Arq, GLTF> | null>(null);
  useLayoutEffect(() => {
    Promise.all([fontesProntas(), carregaTodos()]).then(([, g]) => {
      gl.current = g;
      setPronto(true);
      continueRender(hF);
    });
  }, [hF]);
  useLayoutEffect(() => {
    if (!ref.current || !pronto) return;
    const h = delayRender("quadro 3D");
    let novo = false;
    if (!mundo.current) {
      mundo.current = new Mundo(ref.current, dir, width, height, gl.current!);
      novo = true;
    }
    const m = mundo.current;
    m.aplica(e);
    if (novo) m.render(e.t); // aquece o renderizador (o 1º quadro saía diferente)
    m.render(e.t);
    if (e2 && cima.current) {
      const c = cima.current.getContext("2d")!;
      c.drawImage(ref.current, 0, height / 4, width, height / 2, 0, 0, width, height / 2);
      m.aplica(e2);
      m.render(e2.t);
    }
    continueRender(h);
  }, [e, e2, width, height, pronto]);
  // a MESMA árvore sempre (o canvas WebGL não pode ser recriado: o mundo está preso a ele); só os estilos mudam
  const sp = !!e2;
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: sp ? height / 2 : 0, width, height: sp ? height / 2 : height, overflow: "hidden" }}>
        <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: sp ? -height / 4 : 0, width, height }} />
      </div>
      <canvas ref={cima} width={width} height={height / 2} style={{ position: "absolute", left: 0, top: 0, width, height: height / 2, display: sp ? "block" : "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: height / 2 - 6, height: 12, background: "#111", display: sp ? "block" : "none" }} />
    </>
  );
};
