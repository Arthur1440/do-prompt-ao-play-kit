// Texturas da maquete do esgoto (todas em canvas, geradas uma vez, fora de qualquer laço por quadro).
import * as THREE from "three";
import { fbm, vn } from "./kit";

function cnv(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { c, g: c.getContext("2d")! };
}
function tex(c: HTMLCanvasElement, rep: [number, number] = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  return t;
}
const lcg = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

/** tampo da mesa: tábuas largas de madeira castanha com veio */
export function texMesa() {
  const W = 1024, H = 1024;
  const { c, g } = cnv(W, H);
  const img = g.createImageData(W, H);
  const tabuas = 5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tb = Math.floor((x / W) * tabuas);
    const xl = (x / W) * tabuas - tb;
    const off = tb * 137.1;
    const veio = Math.sin((y * 0.012 + fbm(x * 0.01 + off, y * 0.002, 3) * 6) * 9) * 0.5 + 0.5;
    const n = fbm(x * 0.004 + off, y * 0.03, 3);
    const tom = 0.82 + 0.18 * Math.sin(tb * 2.3);
    let r = (128 + veio * 26 + (n - 0.5) * 30) * tom, gg = (78 + veio * 16 + (n - 0.5) * 18) * tom, b = (44 + veio * 8 + (n - 0.5) * 10) * tom;
    if (xl < 0.006 || xl > 0.994) { r *= 0.45; gg *= 0.45; b *= 0.45; }
    const i = (y * W + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, [3, 3]);
}

/** compensado da base (borda da tábua) */
export function texCompensado() {
  const W = 512, H = 64;
  const { c, g } = cnv(W, H);
  for (let y = 0; y < H; y++) {
    const camada = Math.floor(y / 9);
    const v = camada % 2 ? 196 : 176;
    g.fillStyle = `rgb(${v},${v * 0.78},${v * 0.52})`;
    g.fillRect(0, y, W, 1);
  }
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) { const n = (vn((i / 4) % W * 0.05, Math.floor(i / 4 / W) * 0.5) - 0.5) * 20; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.6; }
  g.putImageData(img, 0, 0);
  return tex(c);
}

/** grama de maquete (pó de grama / flock): verde com manchas mais secas, grão fino */
export function texGrama() {
  const N = 1024;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = lcg(11);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const m = fbm(x * 0.006, y * 0.006, 4);
    const s = fbm(x * 0.03 + 9, y * 0.03, 2);
    const gr = r();
    const seco = Math.max(0, m - 0.55) * 2.2;
    const base = [78 + seco * 70, 112 + seco * 34, 48 + seco * 10];
    const k = 0.78 + s * 0.3 + (gr - 0.5) * 0.35;
    const i = (y * N + x) * 4;
    img.data[i] = base[0] * k; img.data[i + 1] = base[1] * k; img.data[i + 2] = base[2] * k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, [2, 2]);
}

/** relevo do flock (bump) */
export function texGramaBump() {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = lcg(5);
  for (let i = 0; i < img.data.length; i += 4) { const v = 100 + r() * 155; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return tex(c, [6, 6], false);
}

/** piso cerâmico: placas quadradas com rejunte */
export function texPiso(cor: [number, number, number], rejunte: [number, number, number], n = 8, variacao = 10) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const L = N / n;
  const r = lcg(3 + cor[0]);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const d = (r() - 0.5) * variacao;
    g.fillStyle = `rgb(${cor[0] + d},${cor[1] + d},${cor[2] + d})`;
    g.fillRect(i * L, j * L, L, L);
    // leve brilho no canto da placa
    const gr = g.createLinearGradient(i * L, j * L, (i + 1) * L, (j + 1) * L);
    gr.addColorStop(0, "rgba(255,255,255,0.06)"); gr.addColorStop(1, "rgba(0,0,0,0.05)");
    g.fillStyle = gr; g.fillRect(i * L, j * L, L, L);
  }
  g.strokeStyle = `rgb(${rejunte[0]},${rejunte[1]},${rejunte[2]})`;
  g.lineWidth = Math.max(2, L * 0.05);
  for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * L, 0); g.lineTo(k * L, N); g.stroke(); g.beginPath(); g.moveTo(0, k * L); g.lineTo(N, k * L); g.stroke(); }
  return tex(c);
}

/** azulejo de parede (retangular, assentado em fiadas) */
export function texAzulejo(cor: [number, number, number], nx = 6, ny = 10, desloca = false) {
  const W = 512, H = 512;
  const { c, g } = cnv(W, H);
  const lx = W / nx, ly = H / ny;
  const r = lcg(7 + cor[1]);
  for (let j = 0; j < ny; j++) for (let i = -1; i < nx; i++) {
    const ox = desloca && j % 2 ? lx / 2 : 0;
    const d = (r() - 0.5) * 8;
    g.fillStyle = `rgb(${cor[0] + d},${cor[1] + d},${cor[2] + d})`;
    g.fillRect(i * lx + ox, j * ly, lx, ly);
    g.strokeStyle = "rgba(255,255,255,0.65)";
    g.lineWidth = 3;
    g.strokeRect(i * lx + ox + 2, j * ly + 2, lx - 4, ly - 4);
  }
  g.strokeStyle = "rgba(120,120,115,0.85)";
  g.lineWidth = 2.5;
  for (let j = 0; j <= ny; j++) { g.beginPath(); g.moveTo(0, j * ly); g.lineTo(W, j * ly); g.stroke(); }
  for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) { const ox = desloca && j % 2 ? lx / 2 : 0; g.beginPath(); g.moveTo(i * lx + ox, j * ly); g.lineTo(i * lx + ox, (j + 1) * ly); g.stroke(); }
  return tex(c);
}

/** telha colonial vista de cima: fileiras de canais com sombra entre as peças */
export function texTelha() {
  const W = 512, H = 512;
  const { c, g } = cnv(W, H);
  const nx = 10, ny = 12;
  const lx = W / nx, ly = H / ny;
  const r = lcg(21);
  g.fillStyle = "#6b2f1a"; g.fillRect(0, 0, W, H);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const d = (r() - 0.5) * 30;
    const gr = g.createLinearGradient(i * lx, 0, (i + 1) * lx, 0);
    gr.addColorStop(0, `rgb(${120 + d},${52 + d * 0.4},${30})`);
    gr.addColorStop(0.45, `rgb(${196 + d},${100 + d * 0.5},${62 + d * 0.3})`);
    gr.addColorStop(1, `rgb(${110 + d},${48 + d * 0.4},${28})`);
    g.fillStyle = gr;
    g.fillRect(i * lx + 1, j * ly, lx - 2, ly - 3);
    g.fillStyle = "rgba(40,12,4,0.45)";
    g.fillRect(i * lx, (j + 1) * ly - 4, lx, 4);
  }
  return tex(c);
}

/** reboco externo: massa clara com leve variação */
export function texReboco(cor: [number, number, number]) {
  const N = 256;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 14 + (vn(x * 0.4, y * 0.4) - 0.5) * 6;
    const i = (y * N + x) * 4;
    img.data[i] = cor[0] + n; img.data[i + 1] = cor[1] + n; img.data[i + 2] = cor[2] + n; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, [3, 3]);
}

/** calçada de concreto com juntas */
export function texCalcada() {
  const N = 256;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 22 + (vn(x * 0.7, y * 0.7) - 0.5) * 10;
    const i = (y * N + x) * 4;
    const v = 168 + n;
    img.data[i] = v; img.data[i + 1] = v * 0.98; img.data[i + 2] = v * 0.94; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = "rgba(80,78,74,0.55)"; g.lineWidth = 2;
  for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, (k * N) / 4); g.lineTo(N, (k * N) / 4); g.stroke(); }
  return tex(c, [1, 4]);
}

/** asfalto: cinza escuro com agregado */
export function texAsfalto() {
  const N = 256;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = lcg(77);
  for (let i = 0; i < img.data.length; i += 4) { const v = 54 + r() * 26 + (r() > 0.97 ? 40 : 0); img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v * 1.04; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return tex(c, [1, 4]);
}

/** concreto pré-moldado (tampas, caixas) */
export function texConcreto(seed = 1) {
  const N = 256;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = lcg(seed * 31 + 7);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = (fbm(x * 0.04 + seed, y * 0.04, 3) - 0.5) * 26;
    const poro = r() > 0.985 ? -35 : 0;
    const i = (y * N + x) * 4;
    const v = 150 + n + poro;
    img.data[i] = v; img.data[i + 1] = v * 0.99; img.data[i + 2] = v * 0.95; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

/** fundo do estúdio: parede quente desfocada, mais clara atrás da maquete (janela de fim de tarde) */
export function texFundo() {
  const W = 512, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#2a1c16");
  gr.addColorStop(0.45, "#5a3a26");
  gr.addColorStop(0.7, "#8a5a36");
  gr.addColorStop(1, "#6a4228");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const s = g.createRadialGradient(W * 0.2, H * 0.42, 10, W * 0.2, H * 0.42, W * 1.1);
  s.addColorStop(0, "rgba(255,206,150,0.55)"); s.addColorStop(0.35, "rgba(255,170,110,0.18)"); s.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = s; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** grelha do ralo (alfa): grade de furos */
export function texGrelha() {
  const N = 128;
  const { c, g } = cnv(N, N);
  g.fillStyle = "#fff"; g.fillRect(0, 0, N, N);
  g.fillStyle = "#000";
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(14 + i * 20, 14 + j * 20, 5.5, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** toon: céu de meio-dia em gradiente chapado */
export function texFundoToon() {
  const W = 256, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#4FAEEB"); gr.addColorStop(0.55, "#9FD8F6"); gr.addColorStop(1, "#E6F6FC");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** planta: papel azul de arquiteto com grade fina e grade grossa */
export function texPlanta() {
  const W = 1080, H = 1920;
  const { c, g } = cnv(W, H);
  const gr = g.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, H * 0.8);
  gr.addColorStop(0, "#17417a"); gr.addColorStop(1, "#0b2148");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let x = 0; x <= W; x += 27) { g.strokeStyle = x % 135 === 0 ? "rgba(200,225,255,0.22)" : "rgba(200,225,255,0.08)"; g.lineWidth = x % 135 === 0 ? 2 : 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 27) { g.strokeStyle = y % 135 === 0 ? "rgba(200,225,255,0.22)" : "rgba(200,225,255,0.08)"; g.lineWidth = y % 135 === 0 ? 2 : 1; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** planta: papel quadriculado da prancha (repetível, para a mesa) */
export function texGradeMesa() {
  const N = 512;
  const { c, g } = cnv(N, N);
  g.fillStyle = "#0e2a57"; g.fillRect(0, 0, N, N);
  for (let i = 0; i <= 20; i++) {
    const p = (i * N) / 20;
    g.strokeStyle = i % 5 === 0 ? "rgba(190,215,255,0.35)" : "rgba(190,215,255,0.13)";
    g.lineWidth = i % 5 === 0 ? 2.5 : 1.2;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, N); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(N, p); g.stroke();
  }
  return tex(c, [12, 12]);
}
