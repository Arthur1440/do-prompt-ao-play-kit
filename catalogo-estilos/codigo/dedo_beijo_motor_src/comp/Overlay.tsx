import React from "react";
import * as THREE from "three";
import { FONTE, useT } from "./base";
import { T, FAIXAS, FAIXAS_BEIJO, FAIXAS_CACHORRO, faixaDe, fmt, gap, metades, vista, alturas, projeta, suave, setTema, Tema as Assunto } from "../linha";
import type { Dir } from "../three/mundo";

type Tema = { texto: string; cima: string; baixo: string; sombra: string; peso: number; contorno?: string; destaque: string };
const TEMAS: Record<Dir, Tema> = {
  A: { texto: "#fff3e2", cima: "#ffc394", baixo: "#bcd3ff", sombra: "0 3px 14px rgba(40,18,4,0.75)", peso: 800, destaque: "#ffb35c" },
  B: { texto: "#ffffff", cima: "#ffb28c", baixo: "#9fc2ff", sombra: "0 4px 0 rgba(10,6,20,0.9)", peso: 900, contorno: "6px #120c18", destaque: "#ffd23f" },
  C: { texto: "#ffffff", cima: "#f6b38f", baixo: "#a9c3ff", sombra: "0 2px 12px rgba(0,0,0,0.6)", peso: 800, destaque: "#ff6b2c" },
};

const fade = (t: number, a: number, b: number, d = 0.35) => suave((t - a) / d) * (1 - suave((t - b) / d));

const Txt: React.FC<{ tema: Tema; size: number; peso?: number; cor?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ tema, size, peso, cor, style, children }) => (
  <div
    style={{
      fontFamily: FONTE,
      fontWeight: peso ?? tema.peso,
      fontSize: size,
      color: cor ?? tema.texto,
      textShadow: tema.sombra,
      lineHeight: 1.12,
      letterSpacing: -0.5,
      WebkitTextStroke: tema.contorno ? `${tema.contorno}` : undefined,
      paintOrder: "stroke fill",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Overlay: React.FC<{ dir: Dir; assunto?: Assunto }> = ({ dir, assunto = "dedo" }) => {
  setTema(assunto);
  const t = useT();
  const tema = TEMAS[dir];
  const { cima, baixo } = alturas(t);
  const pa = projeta(t, new THREE.Vector3(0, cima, 0));
  const pb = projeta(t, new THREE.Vector3(0, baixo, 0));
  const d = gap(t);
  const fx = faixaDe(vista(t));
  const beijo = assunto === "beijo";
  const F = (beijo ? FAIXAS_BEIJO : assunto === "cachorro" ? FAIXAS_CACHORRO : FAIXAS)[fx];
  const hud = suave(t / 0.4) * (1 - suave((t - T.saidaIni) / 0.25));
  const n = metades(d);
  const xr = pa.x;
  const meio = (pa.y + pb.y) / 2;
  const branco = "rgba(255,255,255,0.88)";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* gancho */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", opacity: fade(t, -1, 2.9, 0.45) }}>
        {beijo ? (
          <Txt tema={tema} size={66}>
            Quão perto <span style={{ color: tema.destaque }}>seus lábios</span>
            <br />
            chegam num beijo?
          </Txt>
        ) : assunto === "cachorro" ? (
          <Txt tema={tema} size={64}>
            Quão perto sua mão chega
            <br />
            quando faz <span style={{ color: tema.destaque }}>carinho</span>?
          </Txt>
        ) : (
          <Txt tema={tema} size={64}>
            Quão perto seu dedo
            <br />
            chega da tela?
          </Txt>
        )}
      </div>

      {/* régua horizontal (beijo de perfil) */}
      {beijo && hud > 0.01 && (() => {
        const x0 = Math.min(pa.x, pb.x);
        const x1 = Math.max(pa.x, pb.x);
        const y = (pa.y + pb.y) / 2;
        const cx = (x0 + x1) / 2;
        return (
          <div style={{ opacity: hud }}>
            <div style={{ position: "absolute", left: x0, top: y - 1.5, width: Math.max(0, x1 - x0), height: 3, background: branco, boxShadow: "0 0 6px rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", left: x0 - 1.5, top: y - 11, width: 3, height: 22, background: branco }} />
            <div style={{ position: "absolute", left: x1 - 1.5, top: y - 11, width: 3, height: 22, background: branco }} />
            {F.unica ? (
              <div style={{ position: "absolute", left: 0, width: 1080, top: y - 64, textAlign: "center" }}>
                <Txt tema={tema} size={33} peso={700}>
                  {F.unica}
                </Txt>
              </div>
            ) : (
              <>
                <div style={{ position: "absolute", right: 1080 - cx + 14, top: y - 62, textAlign: "right" }}>
                  <Txt tema={tema} size={31} peso={700} cor={tema.cima}>
                    ◀ {F.cima}
                  </Txt>
                </div>
                <div style={{ position: "absolute", left: cx + 14, top: y - 62 }}>
                  <Txt tema={tema} size={31} peso={700} cor={tema.baixo}>
                    {F.baixo} ▶
                  </Txt>
                </div>
              </>
            )}
            <div style={{ position: "absolute", left: 0, width: 1080, top: y + 26, textAlign: "center" }}>
              <Txt tema={tema} size={84} style={{ letterSpacing: -1 }}>
                {fmt(d)}
              </Txt>
              <Txt tema={tema} size={31} peso={600} style={{ marginTop: 4 }}>
                cortada ao meio {n} {n === 1 ? "vez" : "vezes"}
              </Txt>
            </div>
          </div>
        );
      })()}

      {/* régua */}
      {!beijo && hud > 0.01 && (
        <div style={{ opacity: hud }}>
          <div style={{ position: "absolute", left: xr - 1.5, top: pa.y, width: 3, height: Math.max(0, pb.y - pa.y), background: "rgba(255,255,255,0.85)", boxShadow: "0 0 6px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", left: xr - 11, top: pa.y - 1.5, width: 22, height: 3, background: "rgba(255,255,255,0.85)" }} />
          <div style={{ position: "absolute", left: xr - 11, top: pb.y - 1.5, width: 22, height: 3, background: "rgba(255,255,255,0.85)" }} />
          <div style={{ position: "absolute", left: xr + 26, top: meio - 62 }}>
            <Txt tema={tema} size={78} style={{ letterSpacing: -1 }}>
              {fmt(d)}
            </Txt>
            <Txt tema={tema} size={31} peso={600} style={{ marginTop: 4 }}>
              cortada ao meio {n} {n === 1 ? "vez" : "vezes"}
            </Txt>
            {F.unica ? (
              <Txt tema={tema} size={31} peso={600}>
                {F.unica}
              </Txt>
            ) : (
              <>
                <Txt tema={tema} size={31} peso={600} cor={tema.cima}>
                  ▲ {F.cima}
                </Txt>
                <Txt tema={tema} size={31} peso={600} cor={tema.baixo}>
                  ▼ {F.baixo}
                </Txt>
              </>
            )}
          </div>
        </div>
      )}

      {/* revelação */}
      <div style={{ position: "absolute", top: 1180, width: "100%", textAlign: "center", opacity: fade(t, T.frase1, T.saidaIni - 0.1, 0.4) }}>
        <Txt tema={tema} size={58}>
          Eles nunca se tocam.
          <br />
          Os elétrons empurram de volta.
        </Txt>
      </div>

      {/* volta ao dedo */}
      <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center", opacity: fade(t, T.frase2, T.cta - 0.1, 0.4) }}>
        {beijo ? (
          <Txt tema={tema} size={70}>
            Tecnicamente, você
            <br />
            nunca beijou ninguém.
          </Txt>
        ) : assunto === "cachorro" ? (
          <Txt tema={tema} size={70}>
            Você nunca fez carinho
            <br />
            no seu cachorro.
          </Txt>
        ) : (
          <Txt tema={tema} size={70}>
            Você nunca encostou
            <br />
            no seu celular.
          </Txt>
        )}
      </div>
      {(() => {
        const o = fade(t, T.saidaFim - 0.05, T.cta - 0.1, 0.25);
        if (o < 0.01) return null;
        const c = projeta(t, new THREE.Vector3(0, baixo, 0));
        const ang = beijo ? 62 : 18;
        const dx = 120 * Math.cos((ang * Math.PI) / 180);
        const dy = 120 * Math.sin((ang * Math.PI) / 180);
        return (
          <div style={{ opacity: o }}>
            <div style={{ position: "absolute", left: c.x, top: c.y, width: 120, height: 2, background: "rgba(255,255,255,0.85)", transformOrigin: "0 0", transform: `rotate(${ang}deg)` }} />
            <div style={{ position: "absolute", left: beijo ? c.x + dx - 40 : c.x + 118, top: beijo ? c.y + dy + 4 : c.y + 24 }}>
              <Txt tema={tema} size={40} peso={800}>
                ainda {fmt(gap(t))}
              </Txt>
            </div>
          </div>
        );
      })()}

      {/* chamada para o grupo */}
      <Cta tema={tema} t={t} />
    </div>
  );
};

// A chamada é digitada no ritmo das teclas do áudio da referência (40 s em diante).
const BLOCOS: { txt: string; ini: number; fim: number }[] = [
  { txt: "Quer aprender a criar\nvídeos assim com IA?", ini: 40.0, fim: 42.3 },
  { txt: "Comenta", ini: 42.5, fim: 43.0 },
  { txt: "PLAY", ini: 43.1, fim: 43.75 },
  { txt: "e entra no grupo do\nDo Prompt ao Play", ini: 44.0, fim: 46.6 },
  { txt: "lançamento dia 23/11", ini: 46.8, fim: 48.0 },
];

const Digitado: React.FC<{ b: number; t: number; tema: Tema; size: number; peso?: number; cor?: string; style?: React.CSSProperties }> = ({ b, t, tema, size, peso, cor, style }) => {
  const { txt, ini, fim } = BLOCOS[b];
  const n = Math.floor(txt.length * Math.min(1, Math.max(0, (t - ini) / (fim - ini))));
  const atual = t >= ini && (t < BLOCOS[b + 1]?.ini || b === BLOCOS.length - 1);
  const pisca = atual && Math.floor(t * 2.6) % 2 === 0;
  const linhas = txt.slice(0, n).split("\n");
  return (
    <Txt tema={tema} size={size} peso={peso} cor={cor} style={{ minHeight: size * 1.12 * txt.split("\n").length, ...style }}>
      {linhas.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {l}
        </React.Fragment>
      ))}
      <span style={{ opacity: pisca ? 1 : 0, fontWeight: 400 }}>|</span>
    </Txt>
  );
};

const Cta: React.FC<{ tema: Tema; t: number }> = ({ tema, t }) => {
  if (t < T.cta) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 18, paddingBottom: 120 }}>
      <Digitado b={0} t={t} tema={tema} size={62} />
      <div style={{ marginTop: 30 }}>
        <Digitado b={1} t={t} tema={tema} size={54} peso={700} />
        <Digitado b={2} t={t} tema={tema} size={190} peso={900} cor={tema.destaque} style={{ letterSpacing: -4, lineHeight: 1, minHeight: 190 }} />
      </div>
      <Digitado b={3} t={t} tema={tema} size={44} peso={700} />
      <Digitado b={4} t={t} tema={tema} size={32} peso={600} style={{ opacity: 0.85 }} />
    </div>
  );
};
