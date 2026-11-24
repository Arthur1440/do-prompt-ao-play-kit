// Texturas procedurais (canvas): fachadas com janelas, placas, rua, madeira, céu, globo noturno.
import * as THREE from "three";
import { rng } from "./rng";

export const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};
export const tx = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** fachada: mapa (parede + vidro escuro) e emissivo (R máscara, G sorteio, B variação de tom) */
export function texFachada(cols: number, andares: number, parede: string, seed: number, terreo = false) {
  const cw = 40, ch = 56;
  const W = cols * cw, H = andares * ch;
  const [c, g] = cv(W, H);
  const [e, ge] = cv(W, H);
  const R = rng(seed);
  g.fillStyle = parede;
  g.fillRect(0, 0, W, H);
  ge.fillStyle = "#000";
  ge.fillRect(0, 0, W, H);
  // faixa entre andares
  for (let a = 0; a < andares; a++) {
    g.fillStyle = "rgba(0,0,0,0.10)";
    g.fillRect(0, a * ch + ch - 5, W, 5);
  }
  for (let a = 0; a < andares; a++) {
    for (let k = 0; k < cols; k++) {
      const x = k * cw + 9, y = a * ch + 12, w = cw - 18, h = ch - 26;
      if (terreo && a === andares - 1) continue;
      g.fillStyle = "#1c2236";
      g.fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle = "#2a3350";
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(255,255,255,0.10)";
      g.fillRect(x, y, w * 0.35, h);
      const sorte = Math.floor(R.r() * 255), tom = Math.floor(R.r() * 255);
      ge.fillStyle = `rgb(255,${sorte},${tom})`;
      ge.fillRect(x, y, w, h);
      // cortina: metade da janela um pouco mais escura no emissivo
      if (R.r() < 0.4) {
        ge.fillStyle = `rgb(150,${sorte},${tom})`;
        ge.fillRect(x, y, w * 0.5, h);
      }
    }
  }
  const map = tx(c);
  const em = tx(e, false);
  em.minFilter = THREE.LinearFilter;
  return { map, em };
}

export function texPlaca(txt: string, fundo: string, cor: string, w = 512, h = 128, fonte = "700 84px 'Space Grotesk'") {
  const [c, g] = cv(w, h);
  g.fillStyle = fundo;
  g.fillRect(0, 0, w, h);
  g.fillStyle = cor;
  g.font = fonte;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(txt, w / 2, h / 2 + 4);
  return tx(c);
}

/** chão do quarteirão: asfalto com faixas, calçadas (o tabuleiro tem 13 x 13) */
export function texRua(estilo: "A" | "B" | "C") {
  const S = 2048;
  const [c, g] = cv(S, S);
  const R = rng(4);
  const px = (u: number) => ((u + 6.5) / 13) * S;
  const asf = estilo === "B" ? "#3a3f55" : estilo === "C" ? "#1b2035" : "#3b3d44";
  const calc = estilo === "B" ? "#a9a2b8" : estilo === "C" ? "#2d3350" : "#8c8a86";
  g.fillStyle = calc;
  g.fillRect(0, 0, S, S);
  g.fillStyle = asf;
  g.fillRect(0, px(-1.05), S, px(1.05) - px(-1.05));
  g.fillRect(px(-1.05), 0, px(1.05) - px(-1.05), S);
  if (estilo === "A") {
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${R.r() < 0.5 ? "255,255,255" : "0,0,0"},${R.ab(0.02, 0.07)})`;
      g.fillRect(R.ab(0, S), R.ab(0, S), 3, 3);
    }
  }
  // faixa central tracejada amarela e faixa de pedestre
  g.fillStyle = "#e8b83a";
  for (let u = -6.5; u < 6.5; u += 0.6) {
    if (Math.abs(u + 0.15) < 1.6) continue;
    g.fillRect(px(u), px(-0.025), px(0.3) - px(0), px(0.025) - px(-0.025));
    g.fillRect(px(-0.025), px(u), px(0.025) - px(-0.025), px(0.3) - px(0));
  }
  g.fillStyle = "#e9e6dc";
  for (const s of [-1, 1]) {
    for (let u = -0.9; u <= 0.9; u += 0.25) {
      g.fillRect(px(u), px(s * 1.25 - 0.17), px(0.13) - px(0), px(0.34) - px(0)); // faixa atravessando a rua x
      g.fillRect(px(s * 1.25 - 0.17), px(u), px(0.34) - px(0), px(0.13) - px(0));
    }
  }
  // juntas da calçada
  g.strokeStyle = "rgba(0,0,0,0.12)";
  g.lineWidth = 2;
  for (let u = -6.5; u < 6.5; u += 0.5) {
    g.beginPath(); g.moveTo(px(u), 0); g.lineTo(px(u), S); g.stroke();
    g.beginPath(); g.moveTo(0, px(u)); g.lineTo(S, px(u)); g.stroke();
  }
  g.fillStyle = asf;
  g.fillRect(0, px(-1.05), S, px(1.05) - px(-1.05));
  g.fillRect(px(-1.05), 0, px(1.05) - px(-1.05), S);
  g.fillStyle = "#e8b83a";
  for (let u = -6.5; u < 6.5; u += 0.6) {
    if (Math.abs(u + 0.15) < 1.6) continue;
    g.fillRect(px(u), px(-0.025), px(0.3) - px(0), px(0.025) - px(-0.025));
    g.fillRect(px(-0.025), px(u), px(0.025) - px(-0.025), px(0.3) - px(0));
  }
  g.fillStyle = "#e9e6dc";
  for (const s of [-1, 1]) {
    for (let u = -0.9; u <= 0.9; u += 0.25) {
      g.fillRect(px(u), px(s * 1.3 - 0.17), px(0.13) - px(0), px(0.34) - px(0));
      g.fillRect(px(s * 1.3 - 0.17), px(u), px(0.34) - px(0), px(0.13) - px(0));
    }
  }
  return tx(c);
}

export function texTerra() {
  const [c, g] = cv(512, 256);
  const R = rng(9);
  const cam = ["#5a3a22", "#6b4528", "#4d321f", "#7a5232"];
  let y = 0;
  for (let i = 0; y < 256; i++) {
    const h = R.ab(22, 60);
    g.fillStyle = cam[i % cam.length];
    g.fillRect(0, y, 512, h);
    y += h;
  }
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(${R.r() < 0.5 ? "30,18,8" : "170,130,90"},${R.ab(0.1, 0.35)})`;
    g.beginPath();
    g.arc(R.ab(0, 512), R.ab(0, 256), R.ab(0.6, 3), 0, 7);
    g.fill();
  }
  const t = tx(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function texMadeira() {
  const [c, g] = cv(1024, 1024);
  const R = rng(11);
  for (let p = 0; p < 4; p++) {
    const y0 = p * 256;
    g.fillStyle = ["#5d3a22", "#56341d", "#654027", "#52311b"][p];
    g.fillRect(0, y0, 1024, 256);
    for (let i = 0; i < 70; i++) {
      const y = y0 + R.ab(4, 252);
      g.strokeStyle = `rgba(${R.r() < 0.5 ? "30,15,6" : "140,95,60"},${R.ab(0.05, 0.2)})`;
      g.lineWidth = R.ab(0.6, 3);
      g.beginPath();
      const a = R.ab(0, 6), f = R.ab(0.004, 0.012), amp = R.ab(1, 6);
      for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x * f + a) * amp);
      g.stroke();
    }
    g.fillStyle = "rgba(15,8,3,0.55)";
    g.fillRect(0, y0, 1024, 3);
  }
  const t = tx(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function texHalo(cor = "255,200,140") {
  const [c, g] = cv(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${cor},1)`);
  gr.addColorStop(0.25, `rgba(${cor},0.45)`);
  gr.addColorStop(1, `rgba(${cor},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return tx(c);
}

/** cone de luz (farol, poste): degradê ao longo do comprimento */
export function texCone() {
  const [c, g] = cv(8, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 8, 256);
  return tx(c, false);
}

export function texCeuNoite(dir: "A" | "B" | "C") {
  const [c, g] = cv(16, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  if (dir === "A") {
    gr.addColorStop(0, "#07080f");
    gr.addColorStop(1, "#141a2c");
  } else if (dir === "B") {
    gr.addColorStop(0, "#0b1026");
    gr.addColorStop(0.6, "#1a2557");
    gr.addColorStop(1, "#33407a");
  } else {
    gr.addColorStop(0, "#04050d");
    gr.addColorStop(1, "#0f1a3a");
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 16, 512);
  return tx(c);
}
