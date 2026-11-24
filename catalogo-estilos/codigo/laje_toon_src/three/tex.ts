// Texturas procedurais (canvas). Criadas uma vez no construtor, nunca por quadro.
import * as THREE from "three";
import type { Dir } from "./kit";
import { fbm, vn } from "./kit";

function cnv(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { c, g: c.getContext("2d")! };
}
function tex(c: HTMLCanvasElement, cor = true) {
  const t = new THREE.CanvasTexture(c);
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
let sem = 1;
const rr = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647; };

/** tijolo cerâmico laranja com argamassa: 1 repetição = 0,4 x 0,4 un (4 fiadas, 2 tijolos por fiada) */
export function texTijolo(d: Dir) {
  const N = 512;
  const { c, g } = cnv(N, N);
  sem = 11;
  const arg = d === "B" ? "#F0D9B8" : d === "A" ? "#D9C4A6" : "#E8D2B6";
  g.fillStyle = arg;
  g.fillRect(0, 0, N, N);
  const fi = 4, porFi = 2, h = N / fi, w = N / porFi, m = d === "B" ? 10 : d === "C" ? 22 : 12;
  for (let r = 0; r < fi; r++) for (let i = -1; i <= porFi; i++) {
    const x = i * w + (r % 2) * w * 0.5;
    const base = d === "B" ? [222, 118, 72] : d === "A" ? [196, 98, 58] : [226, 132, 92];
    const v = d === "B" ? (rr() < 0.5 ? 0 : 10) : (rr() - 0.5) * 26;
    g.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.6},${base[2] + v * 0.4})`;
    const rx = x + m / 2, ry = r * h + m / 2, rw = w - m, rh = h - m;
    g.beginPath();
    g.roundRect(rx, ry, rw, rh, d === "C" ? 14 : 6);
    g.fill();
    if (d === "A") { // furinhos do tijolo baiano na face? não: leve variação de queima
      g.fillStyle = "rgba(90,30,10,0.10)";
      g.fillRect(rx, ry + rh * 0.7, rw, rh * 0.3);
    }
  }
  return tex(c);
}

/** madeira de forma (tábua de pinus) */
export function texMadeira(d: Dir, escura = false) {
  const W = 128, H = 512;
  const { c, g } = cnv(W, H);
  const base = escura ? [150, 96, 52] : [214, 160, 98];
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const veio = d === "B" ? (Math.sin((x + fbm(x * 0.02, y * 0.004, 2) * 60) * 0.25) > 0.85 ? -18 : 0) : (Math.sin((x + fbm(x * 0.03, y * 0.006, 3) * 80) * 0.22) * 10 + (vn(x * 0.1, y * 0.01) - 0.5) * 12);
    const i = (y * W + x) * 4;
    img.data[i] = base[0] + veio; img.data[i + 1] = base[1] + veio * 0.8; img.data[i + 2] = base[2] + veio * 0.6; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

/** terra batida do canteiro com manchas de grama nas bordas */
export function texChao(d: Dir) {
  const N = 1024;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const terra = d === "B" ? [222, 172, 112] : d === "A" ? [176, 128, 84] : [205, 160, 112];
  const grama = d === "B" ? [128, 196, 86] : d === "A" ? [104, 140, 66] : [140, 186, 104];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N - 0.5, v = y / N - 0.5;
    const r = Math.hypot(u * 1.0, v * 1.15);
    const n = fbm(x * 0.008, y * 0.008, 4);
    let k = r * 2.6 + (n - 0.5) * 0.9 - 0.55; // 0 dentro (terra) -> 1 fora (grama)
    k = d === "B" ? (k > 0.35 ? 1 : 0) : Math.min(1, Math.max(0, k * 2));
    const det = d === "B" ? 0 : (vn(x * 0.25, y * 0.25) - 0.5) * 16;
    const i = (y * N + x) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[i + ch] = terra[ch] * (1 - k) + grama[ch] * k + det;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** céu de fundo: B gradiente com nuvens de bolas, A pôr do sol quente, C cartolina pintada */
export function texCeu(d: Dir) {
  const W = 512, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (d === "B") { gr.addColorStop(0, "#58B7F0"); gr.addColorStop(0.65, "#A9DDF7"); gr.addColorStop(1, "#E4F5FB"); }
  else if (d === "A") { gr.addColorStop(0, "#B9A9C4"); gr.addColorStop(0.4, "#F4C08E"); gr.addColorStop(0.75, "#FFAE6E"); gr.addColorStop(1, "#F08A55"); }
  else { gr.addColorStop(0, "#8FC3E2"); gr.addColorStop(1, "#CFE7F0"); }
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  if (d === "A") { // sol baixo e brilho do poente
    const s = g.createRadialGradient(W * 0.15, H * 0.66, 10, W * 0.15, H * 0.66, W * 0.9);
    s.addColorStop(0, "rgba(255,240,200,0.95)"); s.addColorStop(0.15, "rgba(255,200,130,0.55)"); s.addColorStop(1, "rgba(255,170,100,0)");
    g.fillStyle = s; g.fillRect(0, 0, W, H);
  }
  if (d === "C") { // nuvens de papel recortado com sombrinha
    const P: [number, number, number][] = [[0, 0, 46], [52, 10, 36], [-50, 12, 38], [22, -26, 34]];
    const nuvem = (x: number, y: number, k: number) => {
      for (const [dx, dy, r] of P) { g.fillStyle = "rgba(60,90,110,0.18)"; g.beginPath(); g.arc(x + dx * k + 5, y + dy * k + 7, r * k, 0, Math.PI * 2); g.fill(); }
      for (const [dx, dy, r] of P) { g.fillStyle = "#FBFAF5"; g.beginPath(); g.arc(x + dx * k, y + dy * k, r * k, 0, Math.PI * 2); g.fill(); }
    };
    nuvem(110, 170, 1.1); nuvem(390, 300, 0.9); nuvem(230, 470, 0.7);
  }
  if (d === "C") { // fibra do papel
    const img = g.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 8; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** rachaduras (alfa) para as paredes: galhos que descem do topo. Revelação por recorte de cima para baixo. */
export function texRacha(seed = 3) {
  const W = 512, H = 512;
  const { c, g } = cnv(W, H);
  sem = seed * 7 + 1;
  g.strokeStyle = "#2a160c";
  g.lineCap = "round";
  g.lineJoin = "round";
  const galho = (x: number, y: number, ang: number, larg: number, n: number) => {
    g.lineWidth = larg;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      ang += (rr() - 0.5) * 0.9;
      x += Math.sin(ang) * 22; y += Math.cos(ang) * 26;
      g.lineTo(x, y);
      if (rr() < 0.18 && larg > 3) { g.stroke(); galho(x, y, ang + (rr() < 0.5 ? -0.8 : 0.8), larg * 0.6, Math.floor(n * 0.5)); g.lineWidth = larg; g.beginPath(); g.moveTo(x, y); }
      larg *= 0.95; g.lineWidth = larg;
    }
    g.stroke();
  };
  galho(W * 0.35, 0, 0.2, 11, 18);
  galho(W * 0.72, 0, -0.25, 9, 14);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** chão rachado de seca (placas) para a cura: alfa das rachaduras */
export function texSeca(seed = 5) {
  const N = 512;
  const { c, g } = cnv(N, N);
  sem = seed;
  // Voronoi grosseiro: pontos e bordas entre células
  const pts: [number, number][] = [];
  for (let i = 0; i < 34; i++) pts.push([rr() * N, rr() * N]);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) {
      let dx = Math.abs(x - px), dy = Math.abs(y - py);
      dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy);
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const borda = Math.sqrt(d2) - Math.sqrt(d1);
    const a = borda < 3.5 ? 255 : borda < 6 ? 120 : 0;
    const i = (y * N + x) * 4;
    img.data[i] = 50; img.data[i + 1] = 38; img.data[i + 2] = 30; img.data[i + 3] = a;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}
