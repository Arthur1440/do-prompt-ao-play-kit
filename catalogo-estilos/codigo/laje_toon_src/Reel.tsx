// Reel completo (direção por propriedade): 3D + palavra-chave + etiquetas + motion, tudo preso à fala.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { COR } from "./comp/Overlay";
import { Palavra, Frase, Rotulo } from "./comp/Rotulos";
import { OndaRosto, Prompt, CelularPlay, DoPromptAoPlay } from "./comp/Motion";
import { FONTE } from "./comp/fontes";
import { estadoEm, A, B, C, k01, eio, FPS, YL } from "./linha";
import { projeta } from "./projecao";
import { HP, IZ, E } from "./three/casa";
import { barriga } from "./three/laje";
import type { Dir } from "./three/kit";
import type { Cam } from "./three/mundo";

// palavra-chave da frase: [índice da palavra, texto]
export const CHAVES: [number, string][] = [
  [3, "Concreto"], [11, "Teto"], [22, "Cabeça"], [25, "Molhado"], [31, "Escorre"], [42, "Embaixo"],
  [45, "Monta"], [49, "Tábua"], [53, "Segurar"], [65, "Pesado"], [69, "Verga"], [73, "Despenca"], [76, "Paus"], [88, "Metro"], [92, "Chão"],
  [103, "Obra"], [105, "Semanas"],
  [119, "Apertado"], [121, "Esticado"], [126, "Peso"], [131, "Estica"], [133, "Trinca"], [140, "Barras"], [142, "Aço"], [152, "Estica"],
  [164, "Pesada"], [169, "Cara"], [173, "Bolso"], [177, "Vigas"], [183, "Treliça"], [193, "Blocos"], [195, "Isopor"], [203, "Capa"], [218, "Laje"], [225, "Fileiras"],
  [235, "Amassa"], [242, "Racha"], [254, "Viga"], [262, "Paredes"], [264, "Espalha"], [268, "Igual"],
  [280, "Bolhas"], [290, "Buraco"], [297, "Enfia"], [303, "Treme"], [307, "Sobem"],
  [316, "Sol"], [328, "Racha"], [333, "Seca"], [336, "Molha"], [343, "Dias"], [355, "Água"],
  [367, "Tira"], [373, "Enverga"], [380, "Forte"], [387, "Força"], [390, "Tempo"], [394, "Semanas"], [399, "Último"],
  [403, "Mureta"], [407, "Ralo"], [409, "Chuva"], [413, "Escada"], [419, "Família"], [421, "Churrasco"],
];

const yM = (lv: number, x: number, y: number) => HP + y * 2.2 - lv * 0.22 * barriga(x);
/** etiquetas: [nome, palavra em que aparece, palavra do plano seguinte, pontos 3D] */
const ROTULOS: [string, number, number, [number, number, number][]][] = [
  ["ESCORAS", 94, 97, [[-0.98, 0.95, 0.7], [-0.33, 0.95, 0.7], [0.33, 0.95, 0.7]]],
  ["ARMADURA", 155, 157, [[-0.45, yM(0.2, -0.45, 0.035), 0], [0.35, yM(0.2, 0.35, 0.035), 0]]],
  ["LAJE TRELIÇADA", 209, 212, [[0.2, HP + 0.05, 0.0], [0.2, HP + 0.09, 0.215]]],
  ["CINTA", 271, 273, [[0.95, HP - 0.06, IZ + E], [-0.3, HP - 0.06, IZ + E]]],
  ["VIBRADOR", 312, 314, [[0.3, yM(0, 0.2, 0.16) + 0.08, 0.15]]],
  ["CURA", 346, 348, [[-0.3, YL, -0.2], [0.25, YL, 0.1]]],
];
const TIMELAPSE: [number, number][] = [[45, 51], [76, 92], [192, 198], [339, 343], [392, 394]];

const PROMPT_TXT = "Crie em 3D um pedreiro batendo uma laje do jeito errado, que falha e é refeita até ficar pronta, com uma churrasqueira se dando mal em cada falha.";
const THUMBS = ["thumb_1.jpg", "thumb_2.jpg", "thumb_3.jpg", "thumb_4.jpg"];

function chaveEm(t: number) {
  if (t >= A(424) - 0.06) return null;
  for (let n = CHAVES.length - 1; n >= 0; n--) {
    const [i, txt] = CHAVES[n];
    const ini = A(i) - 0.05;
    if (t < ini) continue;
    const prox = n + 1 < CHAVES.length ? A(CHAVES[n + 1][0]) - 0.05 : 999;
    const fim = Math.min(prox, B(i) + 1.2);
    if (t >= fim) return null;
    return { txt, p: k01(t, ini, ini + 0.22), s: prox - t < 0.06 ? 1 : k01(t, fim - 0.12, fim) };
  }
  return null;
}

const Icone: React.FC<{ txt: string; op: number }> = ({ txt, op }) => (
  <div style={{ position: "absolute", right: 70, top: 300, opacity: op, fontFamily: FONTE, fontWeight: 700, fontSize: 64, color: "#fff", background: "rgba(11,16,38,0.55)", borderRadius: 22, padding: "4px 22px", letterSpacing: -6, textShadow: "0 3px 0 rgba(0,0,0,0.5)" }}>{txt}</div>
);

/** régua sem números entre dois pontos da tela */
const Regua: React.FC<{ a: [number, number]; b: [number, number]; p: number }> = ({ a, b, p }) => {
  const [x0, y0] = a, [x1, y1] = b;
  const L = Math.hypot(x1 - x0, y1 - y0) * eio(p), ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
  return (
    <div style={{ position: "absolute", left: x0, top: y0, width: L, height: 34, transformOrigin: "0 50%", transform: `translateY(-50%) rotate(${ang}deg)`, background: "#FFD23F", border: "3px solid #1a0f0c", borderRadius: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.35)", overflow: "hidden" }}>
      {Array.from({ length: 24 }).map((_, i) => <div key={i} style={{ position: "absolute", left: `${(i / 24) * 100}%`, top: 0, width: 3, height: i % 4 === 0 ? 18 : 10, background: "#1a0f0c" }} />)}
    </div>
  );
};

/** barra de força do concreto (sem número) */
const BarraForca: React.FC<{ v: number; op: number }> = ({ v, op }) => (
  <div style={{ position: "absolute", left: 90, top: 520, opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#fff", WebkitTextStroke: "6px #000", paintOrder: "stroke fill" }}>FORÇA</div>
    <div style={{ width: 70, height: 560, borderRadius: 35, background: "rgba(255,255,255,0.85)", border: "5px solid #1a0f0c", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${8 + 92 * v}%`, background: `linear-gradient(0deg, ${COR.laranja}, #FFD23F)` }} />
    </div>
  </div>
);

export const Reel: React.FC<{ dir: Dir; som?: boolean }> = ({ dir, som = true }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ta = dir === "C" ? Math.floor(t * 15) / 15 : t;
  const e = estadoEm(ta);
  const ch = chaveEm(t);
  const pr = (c: Cam, p: [number, number, number][]) => projeta(c, p);
  const rot = ROTULOS.find(([, i, j]) => t >= A(i) - 0.1 && t < C(j) - 0.08);
  const tl = TIMELAPSE.find(([a, b]) => t >= A(a) - 0.1 && t < B(b) + 0.2);
  const tV = A(429) - 0.06, tQuer = C(439);
  const tinta = t >= tQuer;
  return (
    <AbsoluteFill style={{ background: COR.tinta }}>
      {som && <Audio src={staticFile("narracao.wav")} />}
      <Cena3D dir={dir} e={e} />
      {tinta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(30,40,90,${0.92 * eio(k01(t, tQuer, tQuer + 0.4))}), rgba(11,16,38,${eio(k01(t, tQuer, tQuer + 0.4))}) 70%)` }} />}

      {tl && <Icone txt="▶▶" op={k01(t, A(tl[0]) - 0.1, A(tl[0]) + 0.1) * (1 - k01(t, B(tl[1]), B(tl[1]) + 0.2)) * 0.9} />}
      {e.rebobina && <Icone txt="◀◀" op={1} />}
      {t >= A(86) - 0.1 && t < C(89) && (() => { const [a, b] = pr(e.cam, [[-0.98, 0.06, 0.0], [-0.33, 0.06, 0.0]]); return <Regua a={a} b={b} p={k01(t, A(86) - 0.1, A(88))} />; })()}
      {e.forca !== undefined && <BarraForca v={e.forca} op={k01(t, C(384), C(384) + 0.25)} />}

      {rot && (() => {
        const [txt, i, j, pts] = rot;
        const alvos = pr(e.cam, pts);
        const yMed = alvos.reduce((s, p) => s + p[1], 0) / alvos.length;
        const yR = Math.max(360, Math.min(1180, yMed - 380));
        const tam = txt.length > 10 ? 58 : 66;
        return <Rotulo txt={txt} x={540} y={yR} alvo={alvos.length > 1 ? alvos : alvos[0]} p={k01(t, A(i) - 0.1, A(i) + 0.35)} s={k01(t, C(j) - 0.25, C(j) - 0.08)} tam={tam} />;
      })()}

      {ch && <Palavra txt={ch.txt} p={ch.p} s={ch.s} />}
      {t >= A(424) - 0.06 && t < tV && <Frase partes={[{ t: "Parabéns!" }, { t: "Você bateu" }, { t: "uma laje." }]} p={k01(t, A(424) - 0.06, A(424) + 0.25)} y={1320} tam={96} />}

      {/* virada */}
      {t >= tV && t < A(435) - 0.1 && <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} p={k01(t, tV, tV + 0.25)} />}
      {t >= A(435) - 0.15 && t < tQuer + 0.25 && (
        <>
          <OndaRosto t={t} t0={A(435) - 0.15} tMorf={A(437)} tSai={tQuer - 0.05} />
          <Frase partes={[{ t: "até a minha" }, { t: "voz", laranja: true }]} p={k01(t, A(435) - 0.1, A(435) + 0.2)} y={1460} tam={84} />
        </>
      )}
      {t >= tQuer && t < A(445) + 0.1 && (
        <>
          <Prompt t={t} t0={tQuer} tSai={A(445) - 0.3} txt={PROMPT_TXT} thumbs={THUMBS} />
          <Frase partes={[{ t: "Quer aprender a fazer" }, { t: "vídeos assim?" }]} p={k01(t, A(439) - 0.06, A(439) + 0.25)} y={1470} tam={78} />
        </>
      )}
      {t >= A(445) - 0.55 && t < A(460) - 0.05 && <CelularPlay t={t} tSeguir={A(445) - 0.15} tPlay={A(446)} tPlayFim={B(446) + 0.15} tLink={A(452) - 0.05} tSai={A(460) - 0.4} img="thumb_final.jpg" />}
      {t >= A(445) - 0.1 && t < A(460) - 0.2 && <Frase partes={[{ t: "Comenta" }, { t: "PLAY", laranja: true }]} p={k01(t, A(445) - 0.1, A(445) + 0.2)} y={1470} tam={84} />}
      {t >= A(460) - 0.15 && <DoPromptAoPlay t={t} t0={A(460) - 0.15} />}
    </AbsoluteFill>
  );
};
