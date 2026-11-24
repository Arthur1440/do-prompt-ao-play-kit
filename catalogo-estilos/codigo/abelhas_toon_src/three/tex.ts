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
export const FONTE = "'Space Grotesk', sans-serif";

// Rampa do toon: 3 faixas duras.
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

// Vinil fosco (maquete).
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

// Massinha: marcas de dedo (arcos concêntricos de digital) + amassados largos.
export function texDigital(seed = 7) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = rng(seed);
  const centros: [number, number, number, number][] = [];
  for (let i = 0; i < 9; i++) centros.push([r() * N, r() * N, 50 + r() * 70, r() * 6]);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = 0.5 + (fbm(x * 0.012, y * 0.012, 3) - 0.5) * 0.55; // amassado largo
      for (const [cx, cy, R, f] of centros) {
        // distância com repetição (textura contínua)
        let dx = Math.abs(x - cx), dy = Math.abs(y - cy);
        dx = Math.min(dx, N - dx);
        dy = Math.min(dy, N - dy);
        const d = Math.hypot(dx, dy * 1.25);
        if (d < R) {
          const k = 1 - d / R;
          v += Math.sin(d * 0.9 + f) * 0.09 * k * k;
        }
      }
      v += (r() - 0.5) * 0.04;
      const i = (y * N + x) * 4;
      const b = Math.max(0, Math.min(255, v * 255));
      img.data[i] = img.data[i + 1] = img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Madeira da mesa (maquete).
export function texMadeira(clara = false) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.008, y * 0.12, 4);
      const veio = 0.5 + 0.5 * Math.sin((y * 0.1 + n * 9 + fbm(x * 0.02, y * 0.02) * 4) * 2.2);
      const tab = Math.floor(y / 128);
      const k = 0.55 + 0.25 * veio + 0.15 * n + (tab % 2) * 0.05;
      const i = (y * N + x) * 4;
      const base = clara ? [196, 150, 100] : [168, 108, 62];
      img.data[i] = base[0] * k + 30;
      img.data[i + 1] = base[1] * k + 18;
      img.data[i + 2] = base[2] * k + 10;
      img.data[i + 3] = 255;
      if (y % 128 < 2) {
        img.data[i] *= 0.5;
        img.data[i + 1] *= 0.5;
        img.data[i + 2] *= 0.5;
      }
    }
  }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Céu / fundo em degradê vertical (de cima para baixo).
export function texCeu(cores: string[]) {
  const { c, g } = cnv(4, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  cores.forEach((cor, i) => gr.addColorStop(i / Math.max(1, cores.length - 1), cor));
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 256);
  return tex(c);
}

// Listras do abdômen da abelha (ao longo de v).
export function texListrasAbelha(a = "#F2B21B", b = "#2a1a10") {
  const { c, g } = cnv(8, 256);
  g.fillStyle = a;
  g.fillRect(0, 0, 8, 256);
  g.fillStyle = b;
  // da ponta (v=0, fundo) até a cintura (v=1, topo do canvas = v alto)
  const faixas = [
    [0, 30],
    [62, 98],
    [130, 162],
  ];
  for (const [y0, y1] of faixas) g.fillRect(0, y0, 8, y1 - y0);
  return tex(c);
}

// Corte de fruta (CircleGeometry: uv radial).
export function texPolpa(tipo: "laranja" | "maracuja" | "morango") {
  const N = 512;
  const { c, g } = cnv(N, N);
  const C = N / 2;
  const r = rng(tipo === "laranja" ? 11 : 23);
  if (tipo === "laranja") {
    g.fillStyle = "#f07f12";
    g.beginPath();
    g.arc(C, C, C, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff1d6";
    g.beginPath();
    g.arc(C, C, C * 0.93, 0, Math.PI * 2);
    g.fill();
    const n = 10;
    for (let s = 0; s < n; s++) {
      const a0 = (s / n) * Math.PI * 2 + 0.03, a1 = ((s + 1) / n) * Math.PI * 2 - 0.03;
      g.fillStyle = s % 2 ? "#ff9a1f" : "#ffa52e";
      g.beginPath();
      g.moveTo(C + Math.cos((a0 + a1) / 2) * C * 0.1, C + Math.sin((a0 + a1) / 2) * C * 0.1);
      g.arc(C, C, C * 0.86, a0, a1);
      g.closePath();
      g.fill();
      // vesículas
      for (let k = 0; k < 40; k++) {
        const a = a0 + r() * (a1 - a0), rr = C * (0.2 + r() * 0.62);
        g.strokeStyle = `rgba(255,${200 + r() * 40},120,0.55)`;
        g.lineWidth = 2 + r() * 3;
        g.beginPath();
        g.moveTo(C + Math.cos(a) * rr, C + Math.sin(a) * rr);
        g.lineTo(C + Math.cos(a) * (rr + 14), C + Math.sin(a) * (rr + 14));
        g.stroke();
      }
    }
    g.fillStyle = "#fff1d6";
    g.beginPath();
    g.arc(C, C, C * 0.1, 0, Math.PI * 2);
    g.fill();
  } else if (tipo === "maracuja") {
    g.fillStyle = "#e3c21e";
    g.beginPath();
    g.arc(C, C, C, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fbf3df";
    g.beginPath();
    g.arc(C, C, C * 0.95, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f6b417";
    g.beginPath();
    g.arc(C, C, C * 0.8, 0, Math.PI * 2);
    g.fill();
    for (let k = 0; k < 70; k++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * C * 0.72;
      const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
      g.fillStyle = "#ffcf3a";
      g.beginPath();
      g.ellipse(x, y, 16, 12, a, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#1b120c";
      g.beginPath();
      g.ellipse(x, y, 8, 6, a, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.fillStyle = "#e3263a";
    g.fillRect(0, 0, N, N);
    for (let k = 0; k < 140; k++) {
      g.fillStyle = "#ffd75a";
      g.beginPath();
      g.ellipse(r() * N, r() * N, 5, 7, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c);
}

// Faixas (corona do maracujá) ao longo de v (0 base, 1 ponta).
export function texCorona() {
  const { c, g } = cnv(4, 256);
  const faixas: [number, number, string][] = [
    [0, 0.28, "#5a1f6e"],
    [0.28, 0.55, "#fbf7ff"],
    [0.55, 0.72, "#7b3aa0"],
    [0.72, 1.0, "#f4ecff"],
  ];
  for (const [a, b, cor] of faixas) {
    g.fillStyle = cor;
    g.fillRect(0, 256 - b * 256, 4, (b - a) * 256 + 1);
  }
  return tex(c);
}

// Toldo listrado.
export function texToldo(a: string, b: string, n = 8) {
  const { c, g } = cnv(256, 16);
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.fillRect((i * 256) / n, 0, 256 / n + 1, 16);
  }
  const t = tex(c);
  return t;
}

// Toalha xadrez (toon).
export function texXadrez(a: string, b: string, n = 8) {
  const { c, g } = cnv(256, 256);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 256);
  const s = 256 / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = a;
    g.globalAlpha = 0.55;
    if (i % 2 === 0) {
      g.fillRect(i * s, 0, s, 256);
      g.fillRect(0, i * s, 256, s);
    }
  }
  g.globalAlpha = 1;
  void b;
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Plaquinha de feira em giz.
export function texPlaca(texto: string, fundo = "#24392c", cor = "#fff8e8") {
  const { c, g } = cnv(512, 256);
  g.fillStyle = fundo;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#c79a5a";
  g.lineWidth = 18;
  g.strokeRect(9, 9, 494, 238);
  g.fillStyle = cor;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let tam = 110;
  g.font = `700 ${tam}px ${FONTE}`;
  while (g.measureText(texto).width > 440) {
    tam -= 4;
    g.font = `700 ${tam}px ${FONTE}`;
  }
  g.fillText(texto, 256, 134);
  return tex(c);
}

// Casca de maracujá (pintinhas).
export function texCascaMaracuja() {
  const { c, g } = cnv(256, 128);
  g.fillStyle = "#e9c62a";
  g.fillRect(0, 0, 256, 128);
  const r = rng(5);
  for (let k = 0; k < 160; k++) {
    g.fillStyle = r() < 0.5 ? "#d2ad1c" : "#f4dc5c";
    g.beginPath();
    g.arc(r() * 256, r() * 128, 1 + r() * 2, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

// Miolo do pão (fatia).
export function texPao() {
  const { c, g } = cnv(256, 256);
  g.fillStyle = "#f1d9a6";
  g.fillRect(0, 0, 256, 256);
  const r = rng(9);
  for (let k = 0; k < 220; k++) {
    g.fillStyle = r() < 0.5 ? "rgba(214,176,112,0.6)" : "rgba(255,240,210,0.6)";
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}
