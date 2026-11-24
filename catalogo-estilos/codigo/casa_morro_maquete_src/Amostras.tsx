import React from "react";
import { useCurrentFrame } from "remotion";
import { Reel } from "./Reel";
import { TempoCtx } from "./comp/tempo";
import type { Dir } from "./three/kit";

// Cada quadro desta composição é um momento (dir, t) do reel.
export const Amostras: React.FC<{ lista: { dir: Dir; t: number }[] }> = ({ lista }) => {
  const f = useCurrentFrame();
  const it = lista[Math.min(f, lista.length - 1)];
  return (
    <TempoCtx.Provider value={it.t}>
      <Reel key={it.dir} dir={it.dir} som={false} />
    </TempoCtx.Provider>
  );
};
