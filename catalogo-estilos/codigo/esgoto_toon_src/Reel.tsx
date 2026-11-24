// Reel: maquete 3D + palavra-chave da fala (uma por vez) + selo laranja preso à peça + virada e PLAY.
// Tudo preso ao índice das palavras da narração (fala.ts).
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { COR, Selo, Icone } from "./comp/Overlay";
import { Palavra, Frase } from "./comp/Rotulos";
import { OndaRosto, CelularPlay, DoPromptAoPlay } from "./comp/Motion";
import { FONTE } from "./comp/fontes";
import { estadoEm, inclinaEm, A, B, C, k01, eio, FPS, pv } from "./linha";
import { projeta } from "./projecao";
import { XS, XI, ZP, ZK } from "./three/maquete";
import { XCG, XCI1, YTOPO_RESP, yRamal } from "./three/canos";
import type { Dir } from "./three/kit";
import type { V3 } from "./three/geo";

// palavra-chave da frase: [índice da palavra, texto] (some quando o selo já escreve a mesma coisa)
export const CHAVES: [number, string][] = [
  [4, "Vaso"], [10, "Buraco"], [18, "Banheiro"], [23, "Fedendo"], [30, "Cano"], [37, "Rua"],
  [40, "Cheiro"], [45, "Volta"], [53, "Banheiro"], [56, "Barata"], [66, "Curva"], [69, "Água"], [77, "Parada"], [80, "Tampa"], [95, "Água"], [98, "Fundo"],
  [103, "Ralo"], [105, "Chuveiro"], [108, "Pia"], [116, "Cheiro"], [118, "Subindo"], [121, "Junta"], [124, "Caixa"], [126, "Chão"], [135, "Água"], [137, "Fechar"], [150, "Ralo"], [154, "Água"], [157, "Grelha"],
  [162, "Descarga"], [166, "Descendo"], [167, "Puxa"], [171, "Sifões"], [176, "Volta"], [181, "Cano"], [183, "Sobe"], [190, "Telhado"], [194, "Ar"], [199, "Cima"], [210, "Cano"], [213, "Telhado"],
  [219, "Gordura"], [223, "Pia"], [226, "Esfria"], [229, "Endurece"], [231, "Entope"], [237, "Pia"], [242, "Caixa"], [249, "Parada"], [252, "Boia"], [254, "Presa"], [261, "Água"], [262, "Continua"], [280, "Abrir"], [286, "Pasta"],
  [290, "Deitado"], [291, "Reto"], [295, "Parada"], [303, "Parado"], [307, "Deita"], [312, "Inclinado"], [313, "Descendo"], [318, "Rua"],
  [326, "Entope"], [331, "Quintal"], [333, "Ninguém"], [334, "Alcança"], [338, "Curva"], [344, "Caixa"], [346, "Tampa"], [348, "Abrir"], [350, "Desentupir"], [364, "Tampas"], [366, "Concreto"],
  [369, "Ligue"], [374, "Rua"], [377, "Ralo"], [381, "Pronto"], [386, "Descarga"], [390, "Pensar"],
];

// selo flutuante preso à peça: [nome, palavra "Esse/Essa", palavra do plano seguinte, ponto 3D, ícone]
const SELOS: [string, number, number, () => V3, Icone][] = [
  ["SIFÃO", 85, 89, () => pv(-0.035, 0.04), "curva"],
  ["CAIXA SIFONADA", 140, 145, () => [XS, -0.01, ZP], "gota"],
  ["RESPIRO", 200, 204, () => [XI, YTOPO_RESP - 0.06, ZP], "seta"],
  ["CAIXA DE GORDURA", 263, 269, () => [XCG, -0.06, ZK], "gordura"],
  ["CAIMENTO", 319, 323, () => [0.75, yRamal(0.75, inclinaEm(999)), ZP], "nivel"],
  ["CAIXA DE INSPEÇÃO", 352, 358, () => [XCI1, -0.02, ZP], "tampa"],
];

function chaveEm(t: number) {
  if (t >= A(392) - 0.06) return null;
  for (let n = CHAVES.length - 1; n >= 0; n--) {
    const [i, txt] = CHAVES[n];
    const ini = A(i) - 0.05;
    if (t < ini) continue;
    const prox = n + 1 < CHAVES.length ? A(CHAVES[n + 1][0]) - 0.05 : 999;
    const fim = Math.min(prox, B(i) + 1.0);
    if (t >= fim) return null;
    return { txt, p: k01(t, ini, ini + 0.22), s: prox - t < 0.06 ? 1 : k01(t, fim - 0.12, fim) };
  }
  return null;
}

/** ◀◀ rebobinar */
const Rebobina: React.FC<{ op: number }> = ({ op }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", opacity: op }}>
    <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 92, color: "#fff", background: "rgba(11,16,38,0.6)", borderRadius: 30, padding: "6px 34px", letterSpacing: -10, textShadow: "0 4px 0 rgba(0,0,0,0.5)" }}>◀◀</div>
  </div>
);

/** nível de bolha em miniatura, sem número: a bolha corre para o lado alto quando o cano inclina */
const Nivel: React.FC<{ ang: number; op: number; x: number; y: number }> = ({ ang, op, x, y }) => {
  const d = Math.max(-1, Math.min(1, -ang / 0.045));
  return (
    <div style={{ position: "absolute", left: x - 210, top: y, width: 420, height: 92, opacity: op, transform: `rotate(${(ang * 180) / Math.PI * 3}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "#FFD23F", border: "5px solid #1a0f0c", boxShadow: "0 12px 30px rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", left: 120, top: 20, width: 180, height: 52, borderRadius: 26, background: "#BFF0C2", border: "4px solid #1a0f0c", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 70, top: 0, bottom: 0, width: 4, background: "#1a0f0c" }} />
        <div style={{ position: "absolute", left: 106, top: 0, bottom: 0, width: 4, background: "#1a0f0c" }} />
        <div style={{ position: "absolute", left: 72 + d * 62, top: 9, width: 36, height: 26, borderRadius: 13, background: "#fff", border: "3px solid #1a0f0c" }} />
      </div>
    </div>
  );
};

export const Reel: React.FC<{ som?: boolean; dir?: Dir }> = ({ som = true, dir = "A" }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = estadoEm(t);
  const ch = chaveEm(t);
  const selo = SELOS.find(([, i, j]) => t >= A(i) - 0.08 && t < C(j) - 0.06);
  const tV = A(400) - 0.06, tQuer = C(410);
  const tinta = t >= tQuer;
  return (
    <AbsoluteFill style={{ background: COR.tinta }}>
      {som && <Audio src={staticFile("narracao.wav")} />}
      <Cena3D e={e} dir={dir} />
      {tinta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(30,40,90,${0.92 * eio(k01(t, tQuer, tQuer + 0.4))}), rgba(11,16,38,${eio(k01(t, tQuer, tQuer + 0.4))}) 70%)` }} />}

      {t >= C(335) && t < C(335) + 0.75 && <Rebobina op={k01(t, C(335), C(335) + 0.1) * (1 - k01(t, C(335) + 0.6, C(335) + 0.75))} />}
      {t >= C(287) + 0.2 && t < C(323) - 0.05 && <Nivel ang={inclinaEm(t)} op={k01(t, C(287) + 0.2, C(287) + 0.45) * (1 - k01(t, C(323) - 0.25, C(323) - 0.05))} x={540} y={430} />}

      {selo && (() => {
        const [txt, i, j, pt, ic] = selo;
        const [[px, py]] = projeta(e.cam, [pt()]);
        const p = k01(t, A(i) - 0.08, A(i) + 0.3), s = k01(t, C(j) - 0.3, C(j) - 0.06);
        const grande = true;
        const alto = 156;
        return <Selo i={ic} x={Math.max(440, Math.min(640, px))} y={Math.max(270, Math.min(1180, py - alto))} op={Math.min(1, p * 4) * (1 - s)} esc={(p < 0.7 ? 0.6 + 0.55 * eio(p / 0.7) : 1.15 - 0.15 * eio((p - 0.7) / 0.3)) * (1 - 0.1 * s)} grande={grande}>{txt}</Selo>;
      })()}

      {ch && <Palavra txt={ch.txt} p={ch.p} s={ch.s} y={1385} tam={104} />}
      {t >= A(392) - 0.06 && t < tV && <Frase partes={[{ t: "Parabéns!", laranja: true }, { t: "Você construiu" }, { t: "o esgoto de uma casa." }]} p={k01(t, A(392) - 0.06, A(392) + 0.25)} y={1330} tam={88} />}

      {/* virada */}
      {t >= tV && t < A(406) - 0.1 && <Frase partes={[{ t: "Esse vídeo foi" }, { t: "feito com" }, { t: "IA", laranja: true }]} p={k01(t, tV, tV + 0.25)} />}
      {t >= A(406) - 0.15 && t < tQuer + 0.25 && (
        <>
          <OndaRosto t={t} t0={A(406) - 0.15} tMorf={A(408)} tSai={tQuer - 0.05} />
          <Frase partes={[{ t: "até a minha" }, { t: "voz", laranja: true }]} p={k01(t, A(406) - 0.1, A(406) + 0.2)} y={1460} tam={84} />
        </>
      )}
      {t >= tQuer && t < A(416) - 0.1 && <Frase partes={[{ t: "Quer aprender a fazer" }, { t: "vídeos assim?" }]} p={k01(t, A(410) - 0.06, A(410) + 0.25)} y={1470} tam={78} />}
      {t >= tQuer - 0.1 && t < A(431) - 0.05 && <CelularPlay t={t} tSeguir={A(415)} tPlay={A(417)} tPlayFim={B(417) + 0.15} tLink={A(423) - 0.05} tSai={A(431) - 0.45} img="thumb_final.jpg" />}
      {t >= A(416) - 0.1 && t < A(431) - 0.2 && <Frase partes={[{ t: "Comenta" }, { t: "PLAY", laranja: true }]} p={k01(t, A(416) - 0.1, A(416) + 0.2)} y={1470} tam={84} />}
      {t >= A(431) - 0.15 && <DoPromptAoPlay t={t} t0={A(431) - 0.15} />}
    </AbsoluteFill>
  );
};
