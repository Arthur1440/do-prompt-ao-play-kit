import React from "react";
import { useCurrentFrame } from "remotion";
import { Reel } from "./Reel";
import { TempoCtx } from "./comp/tempo";
import type { Dir } from "./three/kit";

// Cada quadro desta composição é um momento (dir, t) do reel.
export const Amostras: React.FC<{ dir: Dir; ts: number[] }> = ({ dir, ts }) => {
  const f = useCurrentFrame();
  const t = ts[Math.min(f, ts.length - 1)];
  return (
    <TempoCtx.Provider value={t}>
      <Reel dir={dir} />
    </TempoCtx.Provider>
  );
};
