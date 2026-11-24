// Reel completo (direção A, maquete com tilt-shift): 3D + palavra-chave + rótulos + motion, tudo preso à fala.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { COR } from "./comp/Overlay";
import { Rotulo, Palavra, Frase } from "./comp/Rotulos";
import { Setas, Lupa, ReguaPH, XChuva, Rebobina } from "./comp/Piscina2D";
import { OndaRosto, Prompt, CelularPlay, DoPromptAoPlay, Flash } from "./comp/Motion";
import { estadoEm, S, A, B, k01, eio, FPS, T_ULTIMO } from "./linha";
import { projeta } from "./projecao";
import { IN, RALOS, COAD } from "./three/piscina";
import { FILTRO } from "./three/cenario";

// palavra-chave da fala: [índice da palavra, texto]. Some quando entra a próxima (ou 1,3 s depois do fim).
const CHAVES: [number, string][] = [
  [4, "Buraco"], [10, "Água"], [20, "Lamaçal"], [24, "Bebe"], [33, "Desmorona"],
  [42, "Tijolo"], [44, "Reboca"], [48, "Empurra"], [60, "Racha"], [71, "Concreto"], [75, "Aço"], [82, "Peça só"],
  [94, "Poros"], [101, "Baixando"], [106, "Azulejo"], [114, "Camada"],
  [132, "Verde"], [140, "Alga"], [145, "Bomba"], [156, "Areia"], [163, "Limpa"],
  [175, "Buraquinhos"], [183, "Voltando"], [189, "Boia"], [196, "Fundo"], [200, "Rodando"], [207, "Janela"], [216, "Engole"],
  [231, "Portinha"], [242, "Puxa"], [247, "Prende"], [260, "Mesmo cano"], [267, "Tampar"], [278, "Ninguém"],
  [302, "Vivo"], [310, "Bactéria"], [314, "Cloro"], [330, "Cheiro forte"], [340, "Cloro demais? Não"], [346, "Suor"], [348, "Suor e xixi"],
  [353, "Esvazia"], [360, "Sobe"], [371, "Empurra"], [379, "Sem peso"], [388, "Válvula"], [390, "Abre"], [400, "Entra"], [404, "Iguala"],
  [429, "Chuva"], [432, "Calçada"], [437, "Cerca"], [443, "Luz"], [447, "Pular!"], [448, "Parabéns!"],
];

/** rótulos das peças: [nome, início, fim, ponto(s) 3D da peça] */
const ROTULOS: [string, number, number, [number, number, number][]][] = [
  ["ESTRUTURA", A(84) - 0.05, S.poros - 0.15, [[0.6, -0.55, -IN.z - 0.05]]],
  ["IMPERMEABILIZAÇÃO", A(121) - 0.05, 39.35, [[0.3, -0.75, -IN.z - 0.01]]],
  ["FILTRO", A(164) - 0.05, S.buraquinhos - 0.12, [[FILTRO.x, 0.42, 0]]],
  ["COADEIRA", A(220) - 0.05, S.portinha - 0.12, [[COAD.x, COAD.y, -IN.z]]],
  ["DOIS RALOS", A(287) - 0.1, S.vivo - 0.12, RALOS.map(([x, z]) => [x, IN.y + 0.02, z] as [number, number, number])],
  ["VÁLVULA DE ALÍVIO", A(411) - 0.05, S.chuva - 0.12, [[0, IN.y + 0.03, 0]]],
];

const PROMPT_TXT = "Crie em 3D uma piscina construída do jeito errado, que falha e é refeita até ficar pronta, com uma boia de flamingo se dando mal em cada falha.";
const THUMBS = ["thumb_1.jpg", "thumb_2.jpg", "thumb_3.jpg", "thumb_4.jpg"];

function chaveEm(t: number) {
  for (let n = CHAVES.length - 1; n >= 0; n--) {
    const [i, txt] = CHAVES[n];
    const ini = A(i) - 0.06;
    if (t < ini) continue;
    const prox = n + 1 < CHAVES.length ? A(CHAVES[n + 1][0]) - 0.06 : 999;
    const fim = Math.min(prox, B(i) + 1.3);
    if (t >= fim) return null;
    return { txt, p: k01(t, ini, ini + 0.28), s: prox - t < 0.08 ? 1 : k01(t, fim - 0.15, fim) };
  }
  return null;
}

export const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const t = f === Math.round(T_ULTIMO * FPS) ? T_ULTIMO : f / FPS;
  const e = estadoEm(t);
  const ch = t < A(449) - 0.06 ? chaveEm(t) : null;
  const tinta = t >= S.quer && t < S.volta;
  const rotulo = ROTULOS.find(([, a, b]) => t >= a && t < b);
  const pr = (p: [number, number, number][]) => projeta(e.cam, p);

  return (
    <AbsoluteFill style={{ background: COR.tinta }}>
      <Cena3D dir="A" e={e} />
      {tinta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(30,40,90,${t < S.quer + 0.4 ? 0.5 * k01(t, S.quer, S.quer + 0.4) : 0.92}), rgba(11,16,38,${t < S.quer + 0.4 ? 0.6 * k01(t, S.quer, S.quer + 0.4) : 1}) 70%)` }} />}

      {/* setas: a água empurra a parede para fora */}
      {t >= S.empurra && t < A(60) && (() => {
        const [l, r, b] = pr([[-IN.x + 0.3, -0.75, 0], [IN.x - 0.3, -0.75, 0], [0.2, -0.75, -IN.z + 0.3]]);
        return <Setas t={t} t0={A(48) - 0.1} t1={A(60)} setas={[{ x: l[0] + 60, y: l[1], a: 180, s: 1.7 }, { x: r[0] - 60, y: r[1], a: 0, s: 1.7 }, { x: b[0], y: b[1] - 40, a: -90, s: 1.3 }]} />;
      })()}
      {/* setas: a água do terreno empurra a caixa vazia para cima */}
      {t >= S.empurraCima && t < S.valvula && (() => {
        const pts = pr([[-1.3, -1.75, 0.02], [0, -1.75, 0.02], [1.3, -1.75, 0.02]]);
        return <Setas t={t} t0={A(371) - 0.4} t1={S.valvula} setas={pts.map(([x, y]) => ({ x, y, a: -90, s: 1.7 }))} />;
      })()}
      {t >= A(396) - 0.1 && t < A(401) && (() => {
        const [v] = pr([[0, -1.85, 0.02]]);
        return <Setas t={t} t0={A(396) - 0.1} t1={A(401)} setas={[{ x: v[0], y: v[1], a: -90, s: 1.4 }]} cor="#bfe9ff" />;
      })()}
      {/* lupa: bactérias na água limpa */}
      {t >= A(303) - 0.2 && t < S.cloro && <Lupa t={t} t0={A(303) - 0.2} t1={S.cloro} kB={k01(t, A(308) - 0.2, A(310) + 0.3)} />}
      {/* régua de pH */}
      {t >= A(316) - 0.1 && t < S.cheiro && <ReguaPH t={t} t0={A(316) - 0.1} t1={S.cheiro} />}
      {/* chuva: X discreto */}
      {t >= S.chuva && t < S.calcada && <XChuva t={t} t0={A(427) - 0.1} t1={S.calcada} x={820} y={420} />}
      {/* rebobinar antes da válvula */}
      <Rebobina t={t} t0={S.valvula - 0.02} t1={S.valvula + 0.6} />

      {/* rótulo da peça */}
      {rotulo && (() => {
        const [txt, a, b, pts] = rotulo;
        const alvos = pr(pts);
        const yMed = alvos.reduce((s, p) => s + p[1], 0) / alvos.length;
        const yR = Math.max(330, Math.min(1150, yMed - 420));
        const xMed = alvos.reduce((s, p) => s + p[0], 0) / alvos.length;
        const xR = Math.max(300, Math.min(780, xMed));
        return <Rotulo txt={txt} x={txt.length > 12 ? 540 : xR} y={yR} alvo={alvos.length > 1 ? alvos : alvos[0]} p={k01(t, a, a + 0.45)} s={k01(t, b - 0.18, b)} tam={txt.length > 12 ? 52 : 60} />;
      })()}

      {/* palavra-chave */}
      {ch && <Palavra txt={ch.txt} p={ch.p} s={ch.s} />}
      {t >= A(449) - 0.06 && t < S.virada && <Frase partes={[{ t: "Você construiu" }, { t: "uma piscina!" }]} p={k01(t, A(449) - 0.06, A(449) + 0.25)} />}

      {/* virada */}
      {t >= A(453) - 0.06 && t < A(459) - 0.1 && <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} p={k01(t, A(453) - 0.06, A(453) + 0.25)} />}
      {t >= A(459) - 0.15 && t < S.quer + 0.25 && (
        <>
          <OndaRosto t={t} t0={A(459) - 0.15} tMorf={A(461)} tSai={S.quer - 0.05} />
          <Frase partes={[{ t: "Até a voz é um" }, { t: "clone", laranja: true }, { t: "da minha." }]} p={k01(t, A(459) - 0.1, A(459) + 0.2)} y={1460} tam={80} />
        </>
      )}
      {t >= S.quer && t < A(473) + 0.1 && (
        <>
          <Prompt t={t} t0={S.quer} tSai={A(473) - 0.3} txt={PROMPT_TXT} thumbs={THUMBS} />
          <Frase partes={[{ t: "Quer aprender a fazer" }, { t: "vídeos assim?" }]} p={k01(t, A(467) - 0.06, A(467) + 0.25)} y={1470} tam={78} />
        </>
      )}
      {t >= A(473) - 0.55 && t < A(488) - 0.05 && <CelularPlay t={t} tSeguir={A(473) - 0.15} tPlay={A(474)} tPlayFim={B(474) + 0.15} tLink={A(480) - 0.05} tSai={A(488) - 0.4} img="thumb_final.jpg" />}
      {t >= A(473) - 0.1 && t < A(488) - 0.2 && <Frase partes={[{ t: "Comenta" }, { t: "PLAY", laranja: true }]} p={k01(t, A(473) - 0.1, A(473) + 0.2)} y={1470} tam={84} />}
      {t >= A(488) - 0.15 && t < S.volta && <DoPromptAoPlay t={t} t0={A(488) - 0.15} />}

      {/* costuras de luz entre planos */}
      {[S.tijolo, S.caixa, S.camada, S.verde, S.buraquinhos, S.folha, S.ralo, S.vivo, S.esvazia, S.chuva, S.calcada, S.volta].map((c) => <Flash key={c} t={t} t0={c} />)}
    </AbsoluteFill>
  );
};

export { eio };
