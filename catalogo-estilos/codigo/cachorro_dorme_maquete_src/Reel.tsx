// Reel: 3D (Cena3D) + grafismos 2D + legenda de três palavras em karaokê, tudo preso às palavras da narração.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Titulo, Legenda, Pino, EtiquetaRiscada, Coracoes, Contador, RelogioGrande, Selo, BarraSono, RotuloLado, Seguir, Enquete } from "./comp/Graficos";
import { OndaRosto, CelularPlay, DoPromptAoPlay } from "./comp/Motion";
import { LEG } from "./comp/fontes";
import { COR } from "./comp/Overlay";
import { PALAVRAS } from "./fala";
import { estadoEm, k01, eio, FPS, T, T_PINO, W, TOPO, M, SPLIT, MEIO_CIMA, MEIO_BAIXO, TV, Ap } from "./linha";
import { projeta } from "./projecao";
import { POS } from "./three/casa";
import type { Dir } from "./three/kit";
import type { V3 } from "./three/mundo";

// ------------------------------------------------------------------------------------------ legenda em grupos de 3
const FIM_LEG = PALAVRAS[W("esse")].a - 0.05; // a virada tem os próprios textos
const limpa = (w: string) => w.replace(/\.\.\.|[.,!:;…]+$/g, "").toUpperCase();
type Grupo = { ini: number; fim: number; idx: number[] };
const GRUPOS: Grupo[] = (() => {
  const gs: Grupo[] = [];
  let cur: number[] = [];
  const fecha = () => { if (cur.length) gs.push({ ini: 0, fim: 0, idx: cur }); cur = []; };
  for (let i = 0; i < PALAVRAS.length && PALAVRAS[i].a < FIM_LEG; i++) {
    cur.push(i);
    const w = PALAVRAS[i].w;
    const prox = PALAVRAS[i + 1];
    const pausa = prox ? prox.a - PALAVRAS[i].b > 0.32 : true;
    if (cur.length === 3 || /[.,!?:…]$/.test(w) || pausa) fecha();
  }
  fecha();
  gs.forEach((g, k) => {
    g.ini = PALAVRAS[g.idx[0]].a - 0.06;
    const ult = PALAVRAS[g.idx[g.idx.length - 1]];
    const prox = gs[k + 1];
    g.fim = prox ? Math.min(PALAVRAS[prox.idx[0]].a - 0.06, ult.b + 0.6) : ult.b + 0.4;
  });
  return gs;
})();
function legendaEm(t: number) {
  if (t >= FIM_LEG) return null;
  const g = GRUPOS.find((x) => t >= x.ini && t < x.fim);
  if (!g) return null;
  let ativa = 0;
  g.idx.forEach((i, j) => { if (t >= PALAVRAS[i].a - 0.04) ativa = j; });
  return { palavras: g.idx.map((i) => limpa(PALAVRAS[i].w)), ativa, p: k01(t, g.ini, g.ini + 0.15) };
}

const dentro = (t: number, a: number, b: number) => t >= a && t < b;

/** frase da virada (com destaque laranja) */
const Frase: React.FC<{ partes: { t: string; laranja?: boolean }[]; p?: number; y?: number; tam?: number }> = ({ partes, p = 1, y = 1385, tam = 92 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, transform: `translateY(-50%) scale(${0.85 + 0.15 * Math.min(1, p * 1.2)})`, opacity: Math.min(1, p * 4), textAlign: "center", fontFamily: LEG, fontWeight: 900, fontSize: tam, lineHeight: 1.08, letterSpacing: -1, color: "#fff", textShadow: "0 6px 0 rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.6)" }}>
    {partes.map((q, i) => <span key={i} style={{ color: q.laranja ? COR.laranja : "#fff" }}>{q.t}{i < partes.length - 1 ? " " : ""}</span>)}
  </div>
);
/** ondinhas do ronco saindo do rosto do dono */
const Ronco: React.FC<{ x: number; y: number; t: number; op: number }> = ({ x, y, t, op }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
    {[0, 1, 2].map((i) => {
      const u = ((t * 0.9 + i / 3) % 1);
      const r = 40 + u * 170;
      return <path key={i} d={`M ${x + r * 0.2} ${y - r} A ${r} ${r} 0 0 1 ${x + r} ${y - r * 0.2}`} fill="none" stroke="#fff" strokeWidth={9 - 5 * u} strokeLinecap="round" opacity={1 - u} />;
    })}
    <text x={x + 120} y={y - 150 - 30 * Math.sin(t * 2)} fontFamily={LEG} fontWeight={900} fontSize={70} fill="#fff" stroke="#16101e" strokeWidth={10} paintOrder="stroke">z</text>
    <text x={x + 185} y={y - 225 - 30 * Math.sin(t * 2 + 1)} fontFamily={LEG} fontWeight={900} fontSize={50} fill="#fff" stroke="#16101e" strokeWidth={8} paintOrder="stroke">z</text>
  </svg>
);
/** traços de movimento (o pé mexendo embaixo do cobertor) */
const Mexe: React.FC<{ x: number; y: number; t: number; op: number }> = ({ x, y, t, op }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
    {[-1, 1].map((s) => [0, 1, 2].map((i) => {
      const a = (s * (0.5 + i * 0.35)) + Math.sin(t * 18) * 0.06, r0 = 70, r1 = 120 + 10 * Math.sin(t * 18 + i);
      return <line key={`${s}${i}`} x1={x + Math.sin(a) * r0} y1={y - Math.cos(a) * r0} x2={x + Math.sin(a) * r1} y2={y - Math.cos(a) * r1} stroke="#FFD23F" strokeWidth={10} strokeLinecap="round" />;
    }))}
  </svg>
);

export const Reel: React.FC<{ som?: boolean; dir?: Dir; audio?: string; tFixo?: number }> = ({ som = true, dir = "A", audio = "narracao.wav", tFixo }) => {
  const f = useCurrentFrame();
  const t = tFixo ?? f / FPS;
  const [s0, s1] = SPLIT();
  const split = dentro(t, s0, s1);
  const e = split ? MEIO_CIMA(t, dir) : estadoEm(t, dir);
  const e2 = split ? MEIO_BAIXO(t, dir) : null;
  const tV = TV(), tQuer = M.quer;
  const tinta = t >= tQuer;
  const proj = (p: V3) => projeta(e.cam, [p])[0];
  const leg = legendaEm(t);
  return (
    <AbsoluteFill style={{ background: "#0B1026" }}>
      {som && <Audio src={staticFile(audio)} />}
      <Cena3D e={e} e2={e2} dir={dir} />
      {tinta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(30,40,90,${0.92 * eio(k01(t, tQuer, tQuer + 0.4))}), rgba(11,16,38,${eio(k01(t, tQuer, tQuer + 0.4))}) 70%)` }} />}

      {/* 1. pinos SOFÁ / TAPETE / CAMINHA acendem quando ele passa */}
      {t < T.mesmo - 0.15 && (() => {
        const pinos: [string, V3, number, [number, number]][] = [
          ["SOFÁ", [POS.sofa[0], 0.75, POS.sofa[2]], T_PINO.sofa, [-60, -330]],
          ["TAPETE", [POS.tapete[0], 0.02, POS.tapete[2]], T_PINO.tapete, [-20, -300]],
          ["CAMINHA", [POS.caminha[0], 0.25, POS.caminha[2]], T_PINO.caminha, [40, -330]],
        ];
        return pinos.map(([txt, p3, tp, off]) => {
          const [x, y] = proj(p3);
          if (t < tp - 0.45) return null;
          const lx = Math.min(860, Math.max(220, x + off[0])), ly = Math.max(560, Math.min(1240, y + off[1]));
          return <Pino key={txt} txt={txt} x={lx} y={ly} alvo={[x, y]} p={k01(t, tp - 0.45, tp - 0.15)} brilho={Math.exp(-Math.max(0, t - (tp - 0.15)) * 2.2)} apaga={k01(t, tp + 0.5, tp + 0.9)} />;
        });
      })()}
      {t < 3.6 && <Titulo p={k01(t, 0.15, 0.6)} s={k01(t, 3.2, 3.5)} linhas={["POR QUE ELE", "DORME COM VOCÊ?"]} />}

      {/* 2. corações em "ele escolhe você" */}
      {dentro(t, T.escolhe - 0.2, T.nao) && (() => {
        const [x, y] = proj([2.2, TOPO + 0.3, 0.75]);
        return <Coracoes x={x} y={y} t={t} t0={T.escolhe - 0.1} n={6} />;
      })()}

      {/* 3. etiqueta A CAMA riscada */}
      {dentro(t, T.nao, T.dormindo) && (() => {
        const [x, y] = proj([2.0, TOPO, 1.75]);
        return <EtiquetaRiscada txt="A CAMA" x={x} y={Math.min(1120, Math.max(600, y - 40))} p={k01(t, T.nao + 0.05, T.nao + 0.35)} r={k01(t, T.cama, T.cama + 0.3)} />;
      })()}

      {/* 7-8. relógio correndo e contador fixo 20+ (o selo do estudo da Austrália) */}
      {dentro(t, M.durante, M.ele4) && (() => {
        const rel = t < M.seu2 + 0.15 ? "23:33" : t < M.acorda + 0.55 ? "02:10" : "04:47";
        return (
          <>
            <RelogioGrande txt={rel} p={k01(t, M.durante, M.durante + 0.25)} y={t < M.seu2 ? 560 : 660} />
            {t >= M.vinte - 0.1 && <Contador p={k01(t, M.vinte - 0.1, M.vinte + 0.2)} y={360} />}
            {t >= M.vinte + 0.2 && <Selo txt="ESTUDO · AUSTRÁLIA · 1993" p={k01(t, M.vinte + 0.2, M.vinte + 0.45)} y={880} />}
          </>
        );
      })()}
      {/* 11. ondinhas do ronco do dono */}
      {dentro(t, M.ouve, M.eVolta) && (() => { const [x, y] = proj([1.62, 0.7, 0.3]); return <Ronco x={x} y={y} t={t} op={k01(t, M.ouve, M.ouve + 0.2)} />; })()}
      {dentro(t, M.eVolta, M.por) && (() => { const [x, y] = proj([1.62, 0.7, 0.3]); return <Ronco x={x} y={y} t={t} op={0.8 * k01(t, M.tranquilo - 0.2, M.tranquilo + 0.2)} />; })()}
      {/* 15. o pé mexendo */}
      {dentro(t, M.assim2, M.ate) && (() => { const [x, y] = proj([1.66, 0.66, 2.02]); return <Mexe x={x} y={y} t={t} op={k01(t, M.assim2 + 0.2, M.assim2 + 0.4)} />; })()}
      {/* 17. laboratório: selo do estudo */}
      {dentro(t, M.eUns, M.os) && <Selo txt="ESTUDO · HUNGRIA · 2017" p={k01(t, M.cientistas - 0.1, M.cientistas + 0.2)} y={330} />}
      {/* 20. tela dividida: quente × fria e a barra +20 min só do lado quente */}
      {split && (
        <>
          <RotuloLado txt="CARINHO E BRINCADEIRA" cor="#FFD23F" x={540} y={300} p={k01(t, s0, s0 + 0.3)} />
          <RotuloLado txt="SOZINHO, REJEITADO" cor="#9fc2ff" x={540} y={1030} p={k01(t, M.rejeitados - 1.0, M.rejeitados - 0.7)} />
          <BarraSono k={k01(t, M.vinte2 - 0.1, M.vinte2 + 1.4)} p={k01(t, M.tiveram - 0.1, M.tiveram + 0.25)} y={700} />
          <Selo txt="ESTUDO · HUNGRIA · 2017" p={k01(t, s0 + 0.2, s0 + 0.5)} y={1210} />
        </>
      )}
      {/* 22. corações em "carinho nele" */}
      {dentro(t, M.carinho2 - 0.2, M.porque) && (() => { const [x, y] = proj([2.15, TOPO + 0.3, 0.75]); return <Coracoes x={x} y={y} t={t} t0={M.carinho2 - 0.1} n={6} />; })()}
      {/* 25. SEGUIR + enquete */}
      {dentro(t, M.me, tV) && (
        <>
          <Seguir p={k01(t, M.me, M.me + 0.25)} toque={k01(t, PALAVRAS[Ap("conta", 61.2)].b + 0.03, PALAVRAS[Ap("conta", 61.2)].b + 0.3)} y={430} />
          <Enquete p={k01(t, M.conta - 0.1, M.conta + 0.25)} t={t} t0={M.conta} y={640} />
        </>
      )}

      {leg && <Legenda palavras={leg.palavras} ativa={leg.ativa} p={leg.p} />}
      {/* virada para IA */}
      {t >= tV + 0.05 && t < M.ate2 - 0.12 && <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} p={k01(t, tV + 0.05, tV + 0.3)} />}
      {t >= M.ate2 - 0.15 && t < tQuer + 0.25 && (
        <>
          <OndaRosto t={t} t0={M.ate2 - 0.15} tMorf={M.minha} tSai={tQuer - 0.05} />
          <Frase partes={[{ t: "até a minha" }, { t: "voz", laranja: true }]} p={k01(t, M.ate2 - 0.1, M.ate2 + 0.2)} y={1460} tam={84} />
        </>
      )}
      {t >= tQuer && t < M.comenta - 0.1 && <Frase partes={[{ t: "Quer aprender a fazer" }, { t: "vídeos assim?" }]} p={k01(t, tQuer, tQuer + 0.25)} y={1470} tam={78} />}
      {t >= tQuer - 0.1 && t < M.doPrompt - 0.05 && <CelularPlay t={t} tSeguir={M.videos} tPlay={PALAVRAS[M.play].a} tPlayFim={PALAVRAS[M.play].b + 0.15} tLink={M.link - 0.05} tSai={M.doPrompt - 0.45} img="thumb_final.jpg" />}
      {t >= M.comenta - 0.1 && t < M.doPrompt - 0.2 && <Frase partes={[{ t: "Comenta" }, { t: "PLAY", laranja: true }]} p={k01(t, M.comenta - 0.1, M.comenta + 0.2)} y={1470} tam={84} />}
      {t >= M.doPrompt - 0.15 && <DoPromptAoPlay t={t} t0={M.doPrompt - 0.15} />}
    </AbsoluteFill>
  );
};
