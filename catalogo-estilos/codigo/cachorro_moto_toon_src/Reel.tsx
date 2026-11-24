// Reel: 3D (Cena3D) + grafismos de quadrinho + legenda de uma palavra por vez, tudo preso às palavras da narração.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Onoma, Velocidade, Balao, Impacto, Medalha, Brilhos, Legenda, Gotas, Coracoes, Carimbo } from "./comp/Gibi";
import { Frase } from "./comp/Rotulos";
import { OndaRosto, CelularPlay, DoPromptAoPlay } from "./comp/Motion";
import { Sobrancelhas } from "./Previa";
import { PALAVRAS } from "./fala";
import { estadoEm, A, B, C, k01, eio, FPS, T_SPLIT, MEIO_CIMA, MEIO_BAIXO, tDias } from "./linha";
import { projeta } from "./projecao";
import type { Dir } from "./three/kit";
import type { V3, Estado } from "./three/mundo";

const CHAVES = ["MOTO", "CAÇADA", "LOBO", "PRESA", "DEMAIS", "BOLINHA", "PARABÉNS"];
export const tela = (w: string) => {
  const s = w.replace(/[.,!?…:;]+$/g, "");
  if (s === s.toUpperCase() && s.length > 1) return s; // CAÇADA, IA, PLAY
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const FIM_LEG = () => A(227) - 0.06;
function palavraEm(t: number) {
  if (t >= FIM_LEG()) return null;
  for (let i = PALAVRAS.length - 1; i >= 0; i--) {
    const ini = PALAVRAS[i].a - 0.04;
    if (t < ini) continue;
    const fim = i + 1 < PALAVRAS.length ? Math.min(PALAVRAS[i + 1].a - 0.04, PALAVRAS[i].b + 0.45) : PALAVRAS[i].b + 0.5;
    if (t >= fim) return null;
    const txt = tela(PALAVRAS[i].w);
    return { txt, amarela: CHAVES.includes(txt), p: k01(t, ini, ini + 0.12) };
  }
  return null;
}
const dentro = (t: number, a: number, b: number) => t >= a && t < b;

export const Reel: React.FC<{ som?: boolean; dir?: Dir; audio?: string }> = ({ som = true, dir = "B", audio = "narracao.wav" }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const [s0, s1] = T_SPLIT();
  const split = dentro(t, s0, s1);
  const e: Estado = split ? MEIO_CIMA(t) : estadoEm(t);
  const e2 = split ? MEIO_BAIXO(t) : null;
  const pal = palavraEm(t);
  const proj = (p: V3, c = e.cam) => projeta(c, [p])[0];
  const tV = A(227) - 0.06, tQuer = C(237);
  const tinta = t >= tQuer;
  return (
    <AbsoluteFill style={{ background: "#0B1026" }}>
      {som && <Audio src={staticFile(audio)} />}
      <Cena3D e={e} e2={e2} dir={dir} />
      {tinta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(30,40,90,${0.92 * eio(k01(t, tQuer, tQuer + 0.4))}), rgba(11,16,38,${eio(k01(t, tQuer, tQuer + 0.4))}) 70%)` }} />}

      {/* 1. disparada: VRUUM + linhas de velocidade */}
      {t < C(6) && <Velocidade t={t} op={0.5} cx={430} cy={1060} />}
      {t < C(6) && <Onoma txt="VRUUM!" x={640} y={520} p={k01(t, 0.0, 0.22)} s={k01(t, 1.25, 1.55)} t={t} tam={170} rot={-9} />}
      {/* 2. o dono rindo no portão: kkkk */}
      {dentro(t, C(6), C(10)) && e.dono && (() => {
        const [x, y] = proj([e.dono.pos[0], 1.95, e.dono.pos[2]]);
        return <Balao txt="kkkk" x={Math.min(760, Math.max(330, x + 150))} y={Math.max(380, y - 180)} p={k01(t, C(6) + 0.1, C(6) + 0.35)} t={t} />;
      })()}
      {/* 4. palmas */}
      {dentro(t, C(13), C(18)) && e.dono && (() => {
        const [x, y] = proj([e.dono.pos[0] + 0.2, 1.95, e.dono.pos[2] - 0.15]);
        const ph = ((t - C(13)) * 2.2) % 1;
        return <Impacto x={x} y={Math.max(320, y)} k={ph < 0.35 ? 1 - ph / 0.35 : 0} />;
      })()}
      {/* 5. medalhinha no peito em "CAÇADA" e brilho de orgulho em "vence" */}
      {dentro(t, C(18), C(26)) && e.cachorro && (() => {
        const [x, y] = proj([e.cachorro.pos[0] - 0.36, 0.42, e.cachorro.pos[2]]);
        const [hx, hy] = proj([e.cachorro.pos[0] - 0.3, 0.75, e.cachorro.pos[2]]);
        return (
          <>
            <Medalha x={x} y={y} p={k01(t, A(18) - 0.05, A(18) + 0.3)} t={t} tam={0.9} />
            <Brilhos pts={[[hx - 220, hy - 60], [hx + 210, hy - 120], [hx + 150, hy + 140], [hx - 170, hy + 220]]} t={t} op={k01(t, A(23) - 0.1, A(23) + 0.2)} />
          </>
        );
      })()}
      {/* 11/12. a moto da esquina: VRUUM em "MOTO" e no "barulhenta" */}
      {dentro(t, C(59), C(68)) && e.moto && (() => {
        const [x, y] = proj([e.moto.pos[0], 1.5, e.moto.pos[2]]);
        const tm = A(65) - 0.05;
        return (
          <>
            {t >= C(66) && <Velocidade t={t} op={0.45} cx={540} cy={1100} />}
            <Onoma txt="VRUUM!" x={Math.min(780, Math.max(300, x))} y={Math.max(400, Math.min(900, y - 120))} p={k01(t, tm, tm + 0.2)} s={k01(t, C(68) - 0.25, C(68))} t={t} tam={t >= C(66) ? 190 : 120} rot={-7} />
          </>
        );
      })()}
      {/* 15. a moto vira bicho: sobrancelhas bravas sobre os faróis */}
      {dentro(t, C(79), C(88)) && e.moto && <Sobrancelhas c={e.cam} moto={e.moto.pos} op={eio(k01(t, A(85) - 0.3, A(85) + 0.2))} />}
      {/* 18. late no pneu: AU! AU! */}
      {dentro(t, C(101), C(104)) && e.cachorro && (() => {
        const [x, y] = proj([e.cachorro.pos[0] - 0.45, 0.75, e.cachorro.pos[2]]);
        return (
          <>
            <Onoma txt="AU!" x={Math.max(250, x - 90)} y={Math.max(380, y - 230)} p={k01(t, A(101) - 0.05, A(101) + 0.15)} t={t} tam={150} rot={-12} />
            <Onoma txt="AU!" x={Math.min(800, x + 170)} y={Math.max(420, y - 120)} p={k01(t, A(103) - 0.05, A(103) + 0.15)} t={t} tam={130} rot={9} />
          </>
        );
      })()}
      {/* 19. acelera: VRUUUM */}
      {dentro(t, C(104), C(108)) && <Onoma txt="VRUUUM!" x={560} y={560} p={k01(t, A(107) - 0.05, A(107) + 0.18)} s={k01(t, C(108) - 0.2, C(108))} t={t} tam={150} rot={-6} />}
      {/* 20/21. a "presa" foge morrendo de medo: gotinhas de suor */}
      {dentro(t, C(108), C(120)) && e.moto && (() => {
        const [x, y] = proj([e.moto.pos[0] + 0.15, 1.7, e.moto.pos[2]]);
        const grande = t >= C(116);
        return <Gotas x={x} y={y} t={t} tam={grande ? 1.9 : 1.2} op={k01(t, A(115) - 0.1, A(115) + 0.2) || (grande ? 1 : 0)} />;
      })()}
      {/* 24. herói da rua: brilhos */}
      {dentro(t, C(137), C(144)) && e.cachorro && (() => {
        const [hx, hy] = proj([e.cachorro.pos[0], 0.7, e.cachorro.pos[2]]);
        return <Brilhos pts={[[hx - 260, hy - 120], [hx + 240, hy - 200], [hx + 200, hy + 160], [hx - 200, hy + 240], [hx, hy - 330]]} t={t} op={k01(t, C(137), C(137) + 0.3)} />;
      })()}
      {/* 25. dia, dia, dia */}
      {dentro(t, C(144), C(151)) && (() => {
        const td = tDias();
        const i = t < td[1] ? 0 : t < td[2] ? 1 : 2;
        return <Carimbo txt={["SEG", "TER", "QUA"][i]} p={k01(t, td[i], td[i] + 0.18)} />;
      })()}
      {/* 27. as medalhas se empilhando no peito */}
      {dentro(t, C(158), C(167)) && e.cachorro && (() => {
        const [x, y] = proj([e.cachorro.pos[0] + 0.32, 0.4, e.cachorro.pos[2] - 0.08]);
        return [0, 1, 2].map((i) => <Medalha key={i} x={x + (i - 1) * 120} y={y + Math.abs(i - 1) * 18} p={k01(t, [A(161), A(164), A(166)][i] - 0.05, [A(161), A(164), A(166)][i] + 0.25)} t={t + i} tam={0.85} />);
      })()}
      {/* 29. perto DEMAIS: congelado, clarão e "!" */}
      {dentro(t, C(175), C(177)) && (
        <>
          <AbsoluteFill style={{ background: "#fff", opacity: 0.85 * (1 - k01(t, C(175), C(175) + 0.18)) }} />
          <Onoma txt="!" x={430} y={620} p={k01(t, C(175) + 0.05, C(175) + 0.2)} t={0} tam={150} rot={6} />
        </>
      )}
      {/* 35. PARABÉNS: corações e estrelinhas */}
      {dentro(t, C(203), C(213)) && e.cachorro && (() => {
        const [x, y] = proj([e.cachorro.pos[0], 0.7, e.cachorro.pos[2]]);
        return (
          <>
            <Coracoes x={x} y={y} t={t} t0={A(203)} />
            <Brilhos pts={[[x - 300, y - 300], [x + 280, y - 360], [x + 330, y + 60], [x - 320, y + 120]]} t={t} op={k01(t, A(203), A(203) + 0.25)} />
          </>
        );
      })()}

      {pal && !(dentro(t, C(175), C(177)) && pal.txt === "DEMAIS" && false) && <Legenda txt={pal.txt} amarela={pal.amarela} p={pal.p} />}

      {/* virada */}
      {t >= tV && t < A(233) - 0.1 && <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} p={k01(t, tV, tV + 0.25)} />}
      {t >= A(233) - 0.15 && t < tQuer + 0.25 && (
        <>
          <OndaRosto t={t} t0={A(233) - 0.15} tMorf={A(235)} tSai={tQuer - 0.05} />
          <Frase partes={[{ t: "até a minha" }, { t: "voz", laranja: true }]} p={k01(t, A(233) - 0.1, A(233) + 0.2)} y={1460} tam={84} />
        </>
      )}
      {t >= tQuer && t < A(243) - 0.1 && <Frase partes={[{ t: "Quer aprender a fazer" }, { t: "vídeos assim?" }]} p={k01(t, A(237) - 0.06, A(237) + 0.25)} y={1470} tam={78} />}
      {t >= tQuer - 0.1 && t < A(258) - 0.05 && <CelularPlay t={t} tSeguir={A(241)} tPlay={A(244)} tPlayFim={B(244) + 0.15} tLink={A(250) - 0.05} tSai={A(258) - 0.45} img="thumb_final.jpg" />}
      {t >= A(243) - 0.1 && t < A(258) - 0.2 && <Frase partes={[{ t: "Comenta" }, { t: "PLAY", laranja: true }]} p={k01(t, A(243) - 0.1, A(243) + 0.2)} y={1470} tam={84} />}
      {t >= A(258) - 0.15 && <DoPromptAoPlay t={t} t0={A(258) - 0.15} />}
    </AbsoluteFill>
  );
};
