// Reel completo (direção C): 3D + motion + legenda, tudo preso às palavras.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cena3D } from "./comp/Cena3D";
import { Legenda, Selo, TextoGancho, Laranja, COR } from "./comp/Overlay";
import {
  Planta, TituloForno, Mapa, SeloUFRN, Termometro, Relogio, CelularEnvio, Etiqueta93, Sucata, Balanca, Pratos,
  OndaRosto, Prompt, CelularPlay, DoPromptAoPlay, RotuloCorte, Flash,
} from "./comp/Motion";
import { estadoEm, S, A, B, k01, eio, eo, FPS, T_ULTIMO, camPlanta } from "./linha";
import { projeta } from "./projecao";
import { PALAVRAS } from "./fala";
import { BLOCOS } from "./legendas";

const janela = (t: number, a: number, b: number, fi = 0.18, fo = 0.18) => (t < a || t > b ? 0 : Math.min(1, (t - a) / fi, (b - t) / fo));
const popE = (t: number, a: number) => { const x = k01(t, a, a + 0.32); return x < 0.7 ? eo(x / 0.7) * 1.08 : 1.08 - 0.08 * eio((x - 0.7) / 0.3); };

/** legenda palavra a palavra: o bloco aparece no início da 1ª palavra e some no início do próximo bloco */
function legendaEm(t: number) {
  for (let n = 0; n < BLOCOS.length; n++) {
    const b = BLOCOS[n];
    const ini = A(b.i) - 0.06;
    const prox = n + 1 < BLOCOS.length ? A(BLOCOS[n + 1].i) - 0.06 : 999;
    const fim = Math.min(prox, B(b.j) + 0.7);
    if (t >= ini && t < fim) {
      if (b.oculta) return null;
      const pal = b.txt.split(" ");
      // palavra de tela k aparece proporcionalmente às palavras faladas do bloco
      const nf = b.j - b.i + 1;
      let ativa = -1;
      pal.forEach((_, k) => {
        const idx = b.i + Math.min(nf - 1, Math.floor((k / pal.length) * nf));
        if (t >= PALAVRAS[idx].a - 0.06) ativa = k;
      });
      return { txt: b.txt, ativa, destaque: b.destaque, op: Math.min(1, (fim - t) / 0.08) };
    }
  }
  return null;
}

export const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const t = f === Math.round(T_ULTIMO * FPS) ? T_ULTIMO : f / FPS;
  const e = estadoEm(t);
  const lg = legendaEm(t);
  const fundoTinta = t >= S.prompt && t < S.volta;
  // a legenda desce um pouco quando o celular do PLAY ocupa o centro
  const yLeg = t >= S.play && t < S.volta ? 1505 : 1400;

  return (
    <AbsoluteFill style={{ background: COR.tinta }}>
      <Cena3D dir="C" e={e} />
      {fundoTinta && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(30,40,90,${t < S.play ? 0.35 : 0.9}), rgba(11,16,38,${t < S.play ? 0.45 : 1}) 70%)` }} />}

      {/* gancho (e a volta do loop: o último quadro é igual ao primeiro) */}
      {t < S.mesa && <TextoGancho op={1 - eio(k01(t, 2.7, S.mesa))} />}
      {t >= S.volta && <TextoGancho op={eio(k01(t, S.volta + 0.05, S.volta + 0.3))} />}

      {/* É um forno solar da UFRN, em Natal: planta + título + mapa */}
      {t >= S.planta && t < S.abre && (
        <>
          {(() => {
            const c = camPlanta(k01(t, S.planta, S.abre));
            const yT = 0.19, ret = (x0: number, x1: number): [number, number, number][] => [[x0, yT, -0.225], [x1, yT, -0.225], [x1, yT, 0.255], [x0, yT, 0.255]];
            const piz: [number, number, number][] = Array.from({ length: 24 }, (_, i) => [Math.cos((i / 24) * Math.PI * 2) * 0.12, -0.02, Math.sin((i / 24) * Math.PI * 2) * 0.12]);
            const fr = (x0: number, x1: number): [number, number, number][] => [[x0 + 0.03, yT, 0.27], [x1 - 0.03, yT, 0.27]];
            return <Planta p={k01(t, 7.4, 9.1)} op={janela(t, 7.35, 11.3, 0.25, 0.2) * (t > 9.1 ? 0.3 : 1)} a={projeta(c, ret(-0.55, -0.12))} b={projeta(c, ret(0.12, 0.55))} pizza={projeta(c, piz)} frenteA={projeta(c, fr(-0.55, -0.12))} frenteB={projeta(c, fr(0.12, 0.55))} />;
          })()}
          <TituloForno p={k01(t, A(20) - 0.05, B(21))} op={1 - eio(k01(t, 9.0, 9.25))} />
        </>
      )}
      {t >= 9.2 && t < 11.25 && <Mapa uf="rn" p={k01(t, 9.2, 11.2)} y={520} titulo="Natal (RN)" />}

      {/* 2 gabinetes velhos */}
      {t >= 11.55 && t < S.tinta && <Selo i="pc" y={290} esc={popE(t, 11.6)} op={janela(t, 11.55, S.tinta - 0.05)}><Laranja>2</Laranja> gabinetes velhos</Selo>}
      {t >= 17.6 && t < S.isopor && <Selo i="termo" y={290} esc={popE(t, A(50) - 0.1)} op={janela(t, 17.6, S.isopor - 0.05)}>preto = segura o calor</Selo>}
      {t >= 19.5 && t < S.vidro && <Selo i="termo" y={290} esc={popE(t, A(55))} op={janela(t, 19.5, S.vidro - 0.05)}>isopor = o calor não foge</Selo>}
      {t >= S.corte && t < S.espelho && <RotuloCorte t={t} tLuz={A(67) - 0.05} tCalor={A(71) - 0.08} tSai={S.espelho - 0.2} />}

      {/* a conta: prova em até 2 s, depois o termômetro */}
      {t >= S.conta && t < 31.95 && <SeloUFRN p={k01(t, S.conta, 31.95)} />}
      {t >= 31.95 && t < S.pizzas && (() => {
        const kv = k01(t, 32.25, 34.0);
        const v = 25 + 80 * (1 - Math.pow(1 - kv, 2));
        return <Termometro v={kv >= 1 ? 105 : v} p={k01(t, 31.95, S.pizzas)} ok={eio(k01(t, 34.0, 34.25))} />;
      })()}
      {t >= B(99) + 0.02 && t < S.pizzas && <Selo i="termo" y={260} esc={popE(t, B(99) + 0.02)} op={janela(t, B(99) + 0.02, S.pizzas - 0.02)}><Laranja>105 °C</Laranja> · forno vazio</Selo>}

      {/* 2 pizzas em 30 min */}
      {t >= 36.25 && t < S.envio && <Relogio min={30 * eio(k01(t, 36.35, 36.95))} x={830} y={600} r={115} op={janela(t, 36.25, S.envio - 0.02)} destaque={Math.sin(Math.PI * k01(t, 37.4, 37.7))} />}
      {t >= 36.55 && t < S.envio && <Selo i="relogio" y={260} grande esc={popE(t, 36.6)} op={janela(t, 36.55, S.envio - 0.02)}><Laranja>2</Laranja> pizzas · <Laranja>30 min</Laranja></Selo>}

      {/* envio: o celular recebe o vídeo; o selo 105 °C aparece ao fundo */}
      {t >= S.envio && t < S.serviu && (
        <>
          <Selo i="termo" y={262} esc={popE(t, S.envio + 0.1)} op={janela(t, S.envio, S.serviu - 0.02)}><Laranja>105 °C</Laranja> só com o sol</Selo>
          <CelularEnvio t={t} t0={S.envio} enviado={A(107) + 0.18} digitando={39.7} />
        </>
      )}

      {/* custo */}
      {t >= S.custo && t < S.sucata + 0.3 && <Etiqueta93 t={t} t0={S.custo + 0.1} tNum={A(125)} tNumFim={44.55} tSplit={45.4} tItens={[A(128), A(129), A(130), A(132)]} tSai={S.sucata - 0.1} />}
      {t >= S.sucata && t < S.balanca + 0.1 && <Sucata t={t} tG={A(134)} tV={A(137)} tCarimbo={B(139) + 0.03} tSai={S.balanca - 0.15} />}
      {t >= S.balanca && t < S.nuvem && <Balanca t={t} t0={S.balanca} tPende={A(144)} tSai={B(144) + 0.4} />}

      {/* só com sol direto */}
      {t >= 52.4 && t < S.relogios && <Selo i="sol" y={290} esc={popE(t, A(148))} op={janela(t, 52.4, S.relogios - 0.05)}>precisa de <Laranja>sol direto</Laranja></Selo>}
      {t >= S.relogios && t < S.sergipe && (() => {
        const op = janela(t, S.relogios, S.sergipe - 0.05, 0.25, 0.2);
        const gas = 14 * eio(k01(t, 54.55, 56.6));
        const sol = 30 * eio(k01(t, 54.55, 57.25));
        return (
          <>
            <Relogio min={gas} x={290} y={820} r={170} rot={gas >= 13.99 ? "14 min" : " "} icone="chama" cor="#4da3ff" op={op} destaque={Math.sin(Math.PI * k01(t, 56.6, 56.95))} />
            <Relogio min={sol} x={790} y={820} r={170} rot={sol >= 29.99 ? "30 min" : " "} icone="sol" op={op} destaque={Math.sin(Math.PI * k01(t, 57.2, 57.45))} />
            <Selo i="relogio" y={290} esc={popE(t, 56.75)} op={janela(t, 56.75, S.sergipe - 0.05)}>Gás: <Laranja>14 min</Laranja> · Sol: <Laranja>30 min</Laranja></Selo>
          </>
        );
      })()}

      {/* Sergipe */}
      {t >= S.sergipe && t < S.cozinha + 0.05 && <Mapa uf="se" p={k01(t, S.sergipe, S.cozinha)} y={430} titulo="Universidade Federal de Sergipe" sub="Nossa Senhora do Socorro (SE)" />}
      {t >= 62.0 && t < S.virada && (
        <>
          <Pratos t={t} t0={62.0} tAcende={[A(176) - 0.05, A(179) + 0.1]} tSai={S.virada - 0.3} />
          {t >= 63.55 && <Selo i="prato" y={300} grande esc={popE(t, 63.6)} op={janela(t, 63.55, S.virada - 0.1)}><Laranja>8</Laranja> de cada <Laranja>10</Laranja> refeições</Selo>}
        </>
      )}

      {/* virada */}
      {t >= S.rosto - 0.05 && t < S.prompt + 0.2 && <OndaRosto t={t} t0={A(192) - 0.1} tMorf={A(194)} tSai={S.prompt} />}
      {t >= S.prompt && t < S.play + 0.2 && <Prompt t={t} t0={S.prompt} tSai={S.play - 0.1} />}
      {t >= S.play - 0.5 && t < 75.2 && <CelularPlay t={t} tSeguir={B(201) + 0.06} tPlay={A(203)} tPlayFim={B(203) + 0.1} tLink={A(209) - 0.05} tSai={A(217) - 0.25} />}
      {t >= A(217) - 0.1 && t < S.volta && <DoPromptAoPlay t={t} t0={A(217) - 0.1} />}

      {/* costuras de luz entre planos */}
      {[S.mesa, S.abre, S.serviu, S.cozinha, S.virada, S.volta].map((c) => <Flash key={c} t={t} t0={c} />)}

      {lg && <Legenda txt={lg.txt} ativa={lg.ativa} destaque={lg.destaque} op={lg.op} y={yLeg} />}
    </AbsoluteFill>
  );
};
