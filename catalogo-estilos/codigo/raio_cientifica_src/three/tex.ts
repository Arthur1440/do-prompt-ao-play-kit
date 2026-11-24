import * as THREE from "three";
import { fbm, rng } from "./rng";

// Texturas desenhadas em canvas (tudo gerado aqui, nada baixado).
export const cnv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
};
export const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

export function gradToon(n = 3) {
  const d = new Uint8Array(n * 4);
  const vals = n === 3 ? [90, 185, 255] : [70, 140, 205, 255];
  for (let i = 0; i < n; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = vals[i];
    d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export function texRuidoFino(seed = 3) {
  const { c, g } = cnv(256, 256);
  const img = g.createImageData(256, 256);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function texMadeira(escura = false) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.008, y * 0.12, 5);
      const veio = 0.5 + 0.5 * Math.sin((y * 0.1 + n * 9 + fbm(x * 0.02, y * 0.02) * 4) * 2.2);
      const tab = Math.floor(y / 128);
      const k = 0.55 + 0.25 * veio + 0.15 * n + (tab % 2) * 0.05;
      const i = (y * N + x) * 4;
      const m = escura ? 0.55 : 1;
      img.data[i] = (168 * k + 30) * m;
      img.data[i + 1] = (108 * k + 18) * m;
      img.data[i + 2] = (62 * k + 10) * m;
      img.data[i + 3] = 255;
      if (y % 128 < 2) {
        img.data[i] *= 0.45;
        img.data[i + 1] *= 0.45;
        img.data[i + 2] *= 0.45;
      }
    }
  }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Janelas de prédio: grade de janelas, parte acesa (quente), parte apagada.
export function texJanelas(seed = 7, colunas = 6, linhas = 14, acesas = 0.45) {
  const W = 128, H = 256;
  const { c, g } = cnv(W, H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  const r = rng(seed);
  const cw = W / colunas, ch = H / linhas;
  for (let j = 0; j < linhas; j++)
    for (let i = 0; i < colunas; i++) {
      if (r() > acesas) continue;
      const q = r();
      g.fillStyle = q < 0.7 ? "#ffcf8a" : q < 0.9 ? "#fff1d6" : "#9fd4ff";
      g.globalAlpha = 0.55 + r() * 0.45;
      g.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.25, cw * 0.56, ch * 0.5);
    }
  g.globalAlpha = 1;
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Ponto de luz macio (para luzes da cidade e cargas sem sinal).
export function texPonto() {
  const { c, g } = cnv(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,0.85)");
  gr.addColorStop(0.6, "rgba(255,255,255,0.18)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return tex(c);
}

// Carga elétrica: bolinha com brilho e o sinal (+ ou −) no meio.
export function texCarga(sinal: "+" | "-", cor: string) {
  const S = 128;
  const { c, g } = cnv(S, S);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, cor);
  gr.addColorStop(0.42, cor);
  gr.addColorStop(0.5, "rgba(255,255,255,0.35)");
  gr.addColorStop(0.62, cor.replace(")", ",0.35)").replace("rgb", "rgba"));
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  g.fillStyle = "#ffffff";
  const L = 34, E = 9;
  g.fillRect(64 - L / 2, 64 - E / 2, L, E);
  if (sinal === "+") g.fillRect(64 - E / 2, 64 - L / 2, E, L);
  return tex(c);
}

// Fundo do quarto escuro da maquete: parede azul-escura com bokeh de luzes.
export function texQuarto() {
  const W = 512, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#05070f");
  gr.addColorStop(0.55, "#0b1124");
  gr.addColorStop(1, "#140f12");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  const r = rng(11);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = H * (0.35 + r() * 0.45), rad = 14 + r() * 40;
    const q = r();
    const cor = q < 0.6 ? "255,190,120" : q < 0.85 ? "150,190,255" : "255,240,220";
    const b = g.createRadialGradient(x, y, 0, x, y, rad);
    b.addColorStop(0, `rgba(${cor},${0.1 + r() * 0.14})`);
    b.addColorStop(0.8, `rgba(${cor},${0.06 + r() * 0.06})`);
    b.addColorStop(1, `rgba(${cor},0)`);
    g.fillStyle = b;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return tex(c);
}

// Céu chapado do toon: roxo em cima, azul-marinho embaixo, com faixas duras.
export function texCeuToon() {
  const W = 64, H = 1024;
  const { c, g } = cnv(W, H);
  const faixas = ["#2a1450", "#331a63", "#3b2170", "#2c2466", "#22225a", "#1a1d4c", "#151a40"];
  const n = faixas.length;
  faixas.forEach((f, i) => {
    g.fillStyle = f;
    g.fillRect(0, (i * H) / n, W, H / n + 1);
  });
  const t = tex(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

// Terra em corte (lateral da maquete): camadas de terra, pedra e resina.
export function texCorte() {
  const W = 512, H = 256;
  const { c, g } = cnv(W, H);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = fbm(x * 0.03, y * 0.08, 4);
      const camada = y / H + (n - 0.5) * 0.25;
      let col: [number, number, number];
      if (camada < 0.12) col = [58, 70, 40];
      else if (camada < 0.45) col = [92, 62, 40];
      else if (camada < 0.75) col = [120, 98, 76];
      else col = [70, 58, 50];
      const k = 0.75 + n * 0.5;
      const i = (y * W + x) * 4;
      img.data[i] = col[0] * k;
      img.data[i + 1] = col[1] * k;
      img.data[i + 2] = col[2] * k;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Algodão (nuvem da maquete): ruído alto para o bump.
export function texAlgodao() {
  const N = 256;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const v = fbm(x * 0.09, y * 0.09, 5) * 255;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
