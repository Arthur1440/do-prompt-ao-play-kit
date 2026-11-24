import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Legenda, Selo, TextoGancho, Laranja } from "./comp/Overlay";
import type { Dir } from "./three/kit";
import type { Estado } from "./three/mundo";

export type Quadro = "gancho" | "rebite" | "pronto" | "sai" | "virada" | "capa" | "vteste";

const Q: Record<Quadro, { e: Estado; o: React.ReactNode }> = {
  gancho: { e: { plano: "gancho", p: 0.15, t: 0.5 }, o: <TextoGancho /> },
  rebite: {
    e: { plano: "rebite", p: 0.42, t: 14.6 },
    o: (<><Selo i="pc" y={330}><Laranja>2</Laranja> gabinetes velhos</Selo><Legenda txt="rebitados um no outro." /></>),
  },
  pronto: {
    e: { plano: "pronto", p: 0.5, t: 34 },
    o: (<><Selo i="termo" y={300} grande><Laranja>105 °C</Laranja> forno vazio</Selo><Legenda txt="o forno vazio chegou a 105 °C." /></>),
  },
  sai: {
    e: { plano: "sai", p: 0.6, t: 37 },
    o: (<><Selo i="relogio" y={300} grande><Laranja>2</Laranja> pizzas · <Laranja>30 min</Laranja></Selo><Legenda txt="E 2 pizzas assaram em 30 min." /></>),
  },
  virada: { e: { plano: "virada", p: 0.4, t: 67, k: 0.58, k2: 0.18 }, o: <Legenda txt="Esse vídeo foi feito com IA…" destaque={["IA"]} /> },
  capa: { e: { plano: "capa", p: 0, t: 40 }, o: null },
  vteste: { e: { plano: "virada", p: 0.4, t: 67, k: 1, k2: 0 }, o: null },
};

export const Previa: React.FC<{ dir: Dir; quadro: Quadro; dbg?: Record<string, number>; limpo?: boolean }> = ({ dir, quadro, dbg, limpo }) => {
  const q0 = Q[quadro];
  const q = dbg ? { ...q0, e: { ...q0.e, dbg } } : q0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} e={q.e} />
      {!limpo && q.o}
    </AbsoluteFill>
  );
};
