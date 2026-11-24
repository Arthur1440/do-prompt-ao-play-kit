import React from "react";
import { AbsoluteFill } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { TempoCtx, useT } from "./comp/tempo";
import { Gancho, Hud, HudEstado, Legenda, Marcacao, Selo, VozRosto, LARANJA, TINTA, FONTE, TITULO, useMola } from "./comp/Motion";
import { Chamada, Impacto, LanchePicanha, Memes, MolduraVideo, Post, PromptCard, RotulosMcw, RoundSlam } from "./comp/Motion2";
import { G, planoEm, T_LOOP, ws, we } from "./three/cenas";
import { DURACAO, PALAVRAS } from "./fala";
import type { Dir } from "./three/kit";

const c01 = (x: number) => Math.min(1, Math.max(0, x));
const SOMBRA_B = "0 8px 0 #1a0f0c, 5px 0 0 #1a0f0c, -5px 0 0 #1a0f0c, 0 -5px 0 #1a0f0c, 4px 4px 0 #1a0f0c, -4px 4px 0 #1a0f0c";

// momentos de golpe (ver HUD)
export const HITS = {
  r1: G.K1 + 0.25, // telefonema -> BK apanha
  r2: G.K2 + 0.1, // café -> Méqui apanha
  r3: G.K3 + 0.08, // marca de grelha -> Méqui apanha
  meme: we(160) + 0.04, // mordidinha vira meme -> ponto do Méqui
  r4: G.K4 + 0.12, // mordida enorme -> Méqui apanha, barras empatam
};
// tempos do locutor (o "FIGHT!" chega ~1 s depois do início da fala do locutor)
export const LOCUTOR = { r1: G.R1 + 0.32, r2: G.R2 + 0.3, r3: G.R3 + 0.32 };
export const FIGHT_DT = { r1: 1.36, r2: 1.2, r3: 1.32 };

// ----------------------------------------------------------------- legenda por palavra
const GRAFIA: Record<number, string> = {
  188: "@burgerkingbr", 189: "", 190: "", 192: "@mcdonalds_br", 193: "",
  70: "km", 75: "km", 199: "", 227: "Do", 228: "Prompt",
};
const OCULTA: [number, number][] = [
  [0, 9], // gancho: título na tela
  [10, 11], [56, 57], [101, 102], [143, 144], // "Rodada X": o ROUND bate na tela
  [48, 55], // o post do presidente escreve a frase
  [67, 75], // a placa já diz McDonald's 5 km / Burger King 258 km
  [126, 142], // o post do BK escreve a resposta
  [188, 193], // os @ aparecem digitados
];
const oculta = (i: number) => OCULTA.some(([a, b]) => i >= a && i <= b);
const LIMPA = (s: string) => s.replace(/[.,?]$/g, "");
type Cartao = { ini: number; fim: number; linhas: number[][] };
function cartoes(): Cartao[] {
  const out: Cartao[] = [];
  let atual: number[] = [];
  const fecha = () => {
    if (!atual.length) return;
    const linhas: number[][] = [[]];
    let n = 0;
    for (const i of atual) {
      const w = (GRAFIA[i] ?? PALAVRAS[i].w).length + 1;
      if (n + w > 18 && linhas[linhas.length - 1].length) {
        linhas.push([]);
        n = 0;
      }
      linhas[linhas.length - 1].push(i);
      n += w;
    }
    out.push({ ini: atual[0], fim: atual[atual.length - 1], linhas });
    atual = [];
  };
  let chars = 0;
  for (let i = 0; i < PALAVRAS.length; i++) {
    const w = GRAFIA[i] ?? PALAVRAS[i].w;
    if (!w) continue;
    if (oculta(i)) {
      fecha();
      chars = 0;
      continue;
    }
    if (chars + w.length > 30) {
      fecha();
      chars = 0;
    }
    atual.push(i);
    chars += w.length + 1;
    if (/[.?!]$/.test(PALAVRAS[i].w) || (/,$/.test(PALAVRAS[i].w) && chars > 12)) {
      fecha();
      chars = 0;
    }
  }
  fecha();
  return out;
}
const CARTOES = cartoes();

const Palavra: React.FC<{ i: number; t: number }> = ({ i, t }) => {
  let s = LIMPA(GRAFIA[i] ?? PALAVRAS[i].w);
  if (/^play$/i.test(s)) s = "PLAY";
  if (i === 230) s = "Play";
  const dita = t >= PALAVRAS[i].s - 0.05;
  const num = /\d/.test(s) || s === "IA" || s === "PLAY" || s === "km";
  return <span style={{ opacity: dita ? 1 : 0, color: num ? LARANJA : undefined }}>{s} </span>;
};

const LegendaFala: React.FC<{ dir: Dir }> = ({ dir }) => {
  const { t } = useT();
  const j = CARTOES.findIndex((k, jj) => t >= PALAVRAS[k.ini].s - 0.08 && t < (CARTOES[jj + 1] ? Math.min(PALAVRAS[CARTOES[jj + 1].ini].s - 0.08, PALAVRAS[k.fim].e + 0.5) : PALAVRAS[k.fim].e + 0.5));
  if (j < 0) return null;
  const c = CARTOES[j];
  const pl = planoEm(t).nome;
  const top = pl === "mordidinha" || pl === "mordidona" ? 1330 : 1150;
  return <Legenda dir={dir} top={top} linhas={c.linhas.map((l) => l.map((i) => <Palavra key={i} i={i} t={t} />))} />;
};

// ----------------------------------------------------------------- HUD ao longo do tempo
function hud(t: number): HudEstado & { vis: boolean } {
  const R = [ws(10), ws(56), ws(101), ws(143)];
  const round = t >= R[3] ? 4 : t >= R[2] ? 3 : t >= R[1] ? 2 : 1;
  const g = (t0: number) => c01((t - t0) / 0.35);
  const bk = 1 - 0.3 * g(HITS.r1) - 0.25 * g(HITS.meme);
  const mc = 1 - 0.25 * g(HITS.r2) - 0.2 * g(HITS.r3) - 0.1 * g(HITS.r4);
  const placar: [number, number] = [(t >= HITS.r2 ? 1 : 0) + (t >= HITS.r3 ? 1 : 0), (t >= HITS.r1 ? 1 : 0) + (t >= HITS.meme ? 1 : 0)];
  const treme = (t0: number) => Math.max(0, 1 - Math.abs(t - t0 - 0.15) / 0.3);
  return {
    vis: t >= ws(10) && t < ws(194),
    bk, mc, round, placar,
    tremeBk: treme(HITS.r1) + treme(HITS.meme),
    tremeMc: treme(HITS.r2) + treme(HITS.r3) + treme(HITS.r4),
    pisca: t >= HITS.r4 + 0.3 ? 1 : 0,
  };
}

const Titulo2: React.FC = () => {
  const { t } = useT();
  const m = useMola(ws(4) - 0.05);
  const m2 = useMola(ws(7) - 0.05, { damping: 9, stiffness: 260, mass: 0.6 });
  return (
    <div style={{ position: "absolute", top: 292, left: 0, right: 0, textAlign: "center", fontFamily: TITULO, color: "#fff", textShadow: SOMBRA_B }}>
      <div style={{ fontSize: 96, lineHeight: 1.08, transform: `scale(${0.6 + 0.4 * m})`, opacity: m }}>A BRIGA MAIS</div>
      <div style={{ fontSize: 132, lineHeight: 1.0, color: LARANJA, transform: `scale(${t >= ws(7) - 0.05 ? 2 - m2 : 0}) rotate(-3deg)` }}>ZUEIRA</div>
      <div style={{ fontSize: 72, lineHeight: 1.15, opacity: c01((t - ws(8) + 0.1) / 0.15) }}>DA PUBLICIDADE</div>
    </div>
  );
};

const Nucleo: React.FC<{ dir: Dir }> = ({ dir }) => {
  const { t } = useT();
  const h = hud(t);
  const ia = c01((t - ws(194) + 0.05) / 0.4) * (1 - c01((t - ws(210) + 0.1) / 0.4));
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cena3D dir={dir} />
      {ia > 0 && <AbsoluteFill style={{ background: TINTA, opacity: ia * 0.5 }} />}
      {t < ws(4) && <Gancho dir={dir} />}
      {t >= ws(4) && t < ws(10) && <Titulo2 />}
      {h.vis && <Hud h={h} dir={dir} ent={c01((t - ws(10)) / 0.3)} />}
      {/* rodadas */}
      <RoundSlam n={1} t0={G.R1 + 0.02} fight={LOCUTOR.r1 + FIGHT_DT.r1} />
      <RoundSlam n={2} t0={G.R2 + 0.02} fight={LOCUTOR.r2 + FIGHT_DT.r2} />
      <RoundSlam n={3} t0={G.R3 + 0.02} fight={LOCUTOR.r3 + FIGHT_DT.r3} />
      <RoundSlam n={4} t0={G.R4 + 0.02} />
      {/* selos */}
      <Selo dir={dir} texto="EUA, 2015" t0={ws(13)} t1={ws(17)} />
      <Selo dir={dir} texto="página inteira no New York Times" t0={ws(19)} t1={ws(24)} icone="jornal" />
      <Selo dir={dir} texto="França, 2016" t0={ws(59)} t1={ws(66)} />
      <Selo dir={dir} texto="Brasil, 2019" t0={ws(104)} t1={ws(109)} />
      <Selo dir={dir} texto="EUA, 2026" t0={ws(145)} t1={ws(152)} />
      {/* rodada 1 */}
      <RotulosMcw tW={ws(32)} tB={ws(34)} t1={ws(36)} />
      <Post t0={ws(43)} t1={ws(53) - 0.05} top={470} autor="exec" nome="Presidente do McDonald's" texto="Da próxima vez, basta um telefonema." revela={c01((t - ws(48)) / (we(52) - ws(48)))} carimbo="RECUSADO" tCarimbo={ws(44)} />
      {/* rodada 2 */}
      <MolduraVideo t0={ws(79)} t1={ws(83)} />
      {/* rodada 3 */}
      <Post t0={ws(111)} t1={ws(117) - 0.05} top={470} escala={0.86} autor="mc" nome="Méqui" texto="" imagem={<LanchePicanha />} />
      <Post
        t0={ws(125)}
        t1={G.K3}
        top={470}
        escala={t >= ws(133) ? 0.78 : 0.95}
        autor="bk"
        nome="Burger King"
        texto="Em dias de eclipse coisas estranhas acontecem. Até o hambúrguer na chapa aparece com marca de grelha."
        revela={c01((t - ws(126)) / (we(142) - ws(126)))}
      />
      {/* rodada 4 */}
      {t >= ws(147) && t < ws(176) && <RotulosMordida fase={t < ws(161) ? "mc" : "bk"} />}
      <Memes t0={ws(159)} t1={ws(161)} />
      {/* golpes */}
      <Impacto t0={HITS.r1} lado="e" ko />
      <Impacto t0={HITS.r2} lado="d" ko />
      <Impacto t0={HITS.r3} lado="d" ko />
      <Impacto t0={HITS.meme} lado="e" />
      <Impacto t0={HITS.r4} lado="d" ko />
      {/* marcação */}
      {t >= ws(176) && t < ws(194) && <PlacarEmpate />}
      {t >= ws(181) && t < ws(194) && <Marcacao dir={dir} tIni={ws(181)} tBk={ws(188)} tMc={ws(192)} popBk={ws(191)} popMc={we(193) + 0.02} />}
      {/* virada IA */}
      {ia > 0 && t < ws(205) && <VozRosto m={c01((t - ws(201)) / 1.2)} t0={ws(194)} />}
      <PromptCard t0={ws(205)} t1={ws(211)} />
      <Chamada tSeguir={ws(211)} tPlay={ws(212)} tCurso={ws(226)} t1={T_LOOP} />
      <LegendaFala dir={dir} />
    </AbsoluteFill>
  );
};

export const Reel: React.FC<{ dir: Dir }> = ({ dir }) => {
  const { t } = useT();
  if (t >= T_LOOP) {
    // volta ao quadro 0 (o último quadro é igual ao primeiro)
    const tl = t - (Math.round(DURACAO * 30) - 1) / 30;
    return (
      <AbsoluteFill>
        <TempoCtx.Provider value={tl}>
          <Nucleo dir={dir} />
        </TempoCtx.Provider>
        {t - T_LOOP < 0.12 && <AbsoluteFill style={{ background: "#fff", opacity: 1 - (t - T_LOOP) / 0.12 }} />}
      </AbsoluteFill>
    );
  }
  return <Nucleo dir={dir} />;
};

const PlacarEmpate: React.FC = () => {
  const { t } = useT();
  const m = useMola(ws(176));
  const pisca = Math.floor(t * 5) % 2 === 0 ? 1 : 0.55;
  if (t >= ws(181)) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 455, display: "flex", justifyContent: "center", transform: `scale(${m})` }}>
      <div style={{ fontFamily: TITULO, fontSize: 190, color: "#fff", textShadow: SOMBRA_B, opacity: pisca }}>
        <span style={{ color: "#FF8732" }}>2</span> × <span style={{ color: "#FFC72C" }}>2</span>
      </div>
    </div>
  );
};

const RotulosMordida: React.FC<{ fase: "mc" | "bk" }> = ({ fase }) => {
  const chip = (txt: string, top: number, cor: string, aceso: boolean) => (
    <div style={{ position: "absolute", left: 40, top, padding: "8px 20px", background: cor, color: "#fff", fontFamily: FONTE, fontWeight: 700, fontSize: 34, borderRadius: 30, border: "4px solid #1a0f0c", boxShadow: "0 5px 0 #1a0f0c", opacity: aceso ? 1 : 0.55 }}>
      {txt}
    </div>
  );
  return (
    <>
      {chip("MÉQUI · a mordidinha", 470, "#DA291C", fase === "mc")}
      {chip("BURGER KING · a mordida enorme", fase === "mc" ? 1000 : 960, "#1E57C8", fase === "bk")}
      <div style={{ position: "absolute", right: 40, top: 470, padding: "8px 16px", background: "rgba(0,0,0,0.6)", color: "#fff", fontFamily: FONTE, fontWeight: 700, fontSize: 28, borderRadius: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 16, height: 16, borderRadius: 8, background: "#ff3b30", display: "inline-block" }} /> CÂMERA LENTA
      </div>
    </>
  );
};
