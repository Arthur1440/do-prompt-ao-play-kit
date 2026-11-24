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

export function texMadeira(escura = false, tabuas = true) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.008, y * 0.12, 5);
      const veio = 0.5 + 0.5 * Math.sin((y * 0.1 + n * 9 + fbm(x * 0.02, y * 0.02) * 4) * 2.2);
      const tab = Math.floor(y / 128);
      const k = 0.55 + 0.25 * veio + 0.15 * n + (tabuas ? (tab % 2) * 0.05 : 0);
      const i = (y * N + x) * 4;
      const m = escura ? 0.55 : 1;
      img.data[i] = (168 * k + 30) * m;
      img.data[i + 1] = (108 * k + 18) * m;
      img.data[i + 2] = (62 * k + 10) * m;
      img.data[i + 3] = 255;
      if (tabuas && y % 128 < 2) {
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

export function texQuarto() {
  const W = 1024, H = 512;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#3b2e26");
  gr.addColorStop(1, "#6d5546");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  // janela com luz de fim de tarde
  const jw = g.createRadialGradient(W * 0.78, H * 0.35, 10, W * 0.78, H * 0.35, 300);
  jw.addColorStop(0, "rgba(255,214,150,0.9)");
  jw.addColorStop(0.5, "rgba(255,170,90,0.35)");
  jw.addColorStop(1, "rgba(255,170,90,0)");
  g.fillStyle = jw;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,226,180,0.55)";
  g.fillRect(W * 0.7, H * 0.12, W * 0.16, H * 0.46);
  g.fillStyle = "rgba(60,40,30,0.8)";
  g.fillRect(W * 0.776, H * 0.12, 8, H * 0.46);
  g.fillRect(W * 0.7, H * 0.34, W * 0.16, 8);
  return tex(c);
}

