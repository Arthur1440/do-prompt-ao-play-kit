import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
// Tempo forçado (amostras): se houver, substitui o quadro atual.
export const TempoCtx = React.createContext<number | null>(null);
export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = React.useContext(TempoCtx);
  const t = o ?? f / fps;
  return { t, frame: t * fps, fps };
};
