import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { HUD, Legenda, Pergunta, Selo, Contador, Prompt } from "./comp/Overlay";
import type { Dir } from "./three/kit";
import type { Estado } from "./three/mundo";

export type Quadro = "q0" | "gancho" | "meianoite" | "conta" | "via" | "virada" | "capa";

const Q: Record<Quadro, { e: Estado; o: React.ReactNode }> = {
  q0: {
    e: { plano: "globo_gancho", p: 0, t: 0 },
    o: (<><Pergunta /><HUD h={{ modo: "contagem", s: 3, vivo: 0 }} /></>),
  },
  gancho: {
    e: { plano: "rua_desce", p: 0.72, t: 6.3 },
    o: (<><Legenda txt="3… 2…" /><HUD h={{ modo: "contagem", s: 1.62, vivo: 0.2 }} /></>),
  },
  meianoite: {
    e: { plano: "globo_apaga", p: 0.5, t: 9.6 },
    o: (<><Legenda txt="O planeta inteiro apaga de uma vez." /><HUD h={{ modo: "hora", h: 0, m: 0, verm: 1 }} /></>),
  },
  conta: {
    e: { plano: "mapa", p: 0.9, t: 40, k: 14 },
    o: (<><Selo y={300} /><Contador n={14} /><Legenda txt="14 das 16 cidades ficaram sem luz," /><HUD h={{ modo: "hora", h: 8, m: 0, verm: 1 }} /></>),
  },
  via: {
    e: { plano: "ceu", p: 0.8, t: 61 },
    o: (<><Legenda txt="vê a Via Láctea pela primeira vez." /><HUD h={{ modo: "hora", h: 18, m: 0, verm: 1 }} /></>),
  },
  virada: {
    e: { plano: "virada", p: 0.3, t: 92, k: 0.35 },
    o: (<><Prompt txt="E se o apagão do dia 17 for verdade? Hora a hora, em 3D" cursor /><Legenda txt="Esse vídeo foi feito com IA…" /></>),
  },
  capa: {
    e: { plano: "rua_capa", p: 1, t: 3 },
    o: null,
  },
};

export const Previa: React.FC<{ dir: Dir; quadro: Quadro }> = ({ dir, quadro }) => {
  const q = Q[quadro];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} e={q.e} />
      {q.o}
    </AbsoluteFill>
  );
};
