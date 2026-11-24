import * as THREE from "three";
import { fbm, rng } from "./rng";

// Texturas desenhadas em canvas (tudo gerado aqui, nada baixado).
const cnv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
};
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

export const FONTE = "'Space Grotesk', sans-serif";
export const FONTE_T = "'Bungee', 'Space Grotesk', sans-serif";

// Logo do Burger King (pão + nome), desenhado.
export function desenhaLogoBK(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.save();
  g.translate(cx, cy);
  // pão de cima
  g.fillStyle = "#FF8732";
  g.beginPath();
  g.ellipse(0, -r * 0.18, r * 0.92, r * 0.62, 0, Math.PI, 0);
  g.closePath();
  g.fill();
  // pão de baixo
  g.beginPath();
  g.moveTo(-r * 0.86, r * 0.3);
  g.quadraticCurveTo(-r * 0.86, r * 0.62, -r * 0.4, r * 0.66);
  g.lineTo(r * 0.4, r * 0.66);
  g.quadraticCurveTo(r * 0.86, r * 0.62, r * 0.86, r * 0.3);
  g.closePath();
  g.fill();
  // nome
  g.fillStyle = "#D62300";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${r * 0.42}px ${FONTE_T}`;
  g.fillText("BURGER", 0, -r * 0.08);
  g.fillText("KING", 0, r * 0.3);
  g.restore();
}

// Arcos do "M", desenhados.
export function desenhaM(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, cor = "#FFC72C") {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = cor;
  g.lineWidth = s * 0.2;
  g.lineCap = "butt";
  g.beginPath();
  // arco esquerdo e direito (parábolas)
  const arco = (x0: number) => {
    g.moveTo(x0 - s * 0.42, s * 0.5);
    g.bezierCurveTo(x0 - s * 0.42, -s * 0.75, x0 + s * 0.02, -s * 0.75, x0 + s * 0.02, s * 0.1);
  };
  g.moveTo(-s * 0.84, s * 0.5);
  g.bezierCurveTo(-s * 0.84, -s * 0.8, -s * 0.08, -s * 0.8, -s * 0.03, s * 0.12);
  g.moveTo(s * 0.84, s * 0.5);
  g.bezierCurveTo(s * 0.84, -s * 0.8, s * 0.08, -s * 0.8, s * 0.03, s * 0.12);
  void arco;
  g.stroke();
  g.restore();
}

export function texLogoBK(fundo = "#F5EBDC") {
  const { c, g } = cnv(512, 512);
  g.fillStyle = fundo;
  g.fillRect(0, 0, 512, 512);
  desenhaLogoBK(g, 256, 256, 200);
  return tex(c);
}

export function texEmblemaM() {
  const { c, g } = cnv(512, 512);
  g.fillStyle = "#DA291C";
  g.fillRect(0, 0, 512, 512);
  desenhaM(g, 256, 270, 210);
  return tex(c);
}

// Listras (mangas e meias do Ronald)
export function texListras(n = 6, a = "#D7261E", b = "#FFFFFF") {
  const { c, g } = cnv(64, 512);
  const h = 512 / (n * 2);
  for (let i = 0; i < n * 2; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.fillRect(0, i * h, 64, h + 1);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Madeira da mesa (A)
export function texMadeira() {
  const { c, g } = cnv(1024, 1024);
  const img = g.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const n = fbm(x * 0.004, y * 0.06, 5);
      const veio = 0.5 + 0.5 * Math.sin((y * 0.05 + n * 9 + fbm(x * 0.01, y * 0.01) * 4) * 2.2);
      const tab = Math.floor(y / 256);
      const k = 0.55 + 0.25 * veio + 0.15 * n + (tab % 2) * 0.05;
      const i = (y * 1024 + x) * 4;
      img.data[i] = 168 * k + 30;
      img.data[i + 1] = 108 * k + 18;
      img.data[i + 2] = 62 * k + 10;
      img.data[i + 3] = 255;
      if (y % 256 < 2) {
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

// Carne grelhada com marcas de grelha (o Whopper)
export function texCarne(grelha = 1) {
  const { c, g } = cnv(512, 512);
  const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const n = fbm(x * 0.03, y * 0.03, 4);
      const i = (y * 512 + x) * 4;
      img.data[i] = 92 + n * 50;
      img.data[i + 1] = 52 + n * 28;
      img.data[i + 2] = 30 + n * 16;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (grelha > 0) {
    g.globalAlpha = 0.85 * grelha;
    g.strokeStyle = "#1e0f08";
    g.lineWidth = 22;
    for (let i = -6; i < 8; i++) {
      g.beginPath();
      g.moveTo(i * 80, 0);
      g.lineTo(i * 80 + 300, 512);
      g.stroke();
    }
  }
  return tex(c);
}

// Máscara das marcas de grelha (para brilhar na rodada 3)
export function texGrelhaMascara() {
  const { c, g } = cnv(512, 512);
  g.fillStyle = "#000";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#fff";
  g.lineWidth = 18;
  for (let i = -6; i < 8; i++) {
    g.beginPath();
    g.moveTo(i * 80, 0);
    g.lineTo(i * 80 + 300, 512);
    g.stroke();
  }
  return tex(c, false);
}

// Placa de estrada da França: "McDonald's 5 km" / "Burger King 258 km"
export function texPlaca() {
  const { c, g } = cnv(1024, 640);
  g.fillStyle = "#1f4fa8";
  g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = "#ffffff";
  g.lineWidth = 16;
  g.strokeRect(22, 22, 980, 596);
  const linha = (y: number, nome: string, km: string, logo: "M" | "BK", seta: number) => {
    g.fillStyle = "#ffffff";
    // seta
    g.save();
    g.translate(95, y);
    g.scale(0.8, 0.8);
    g.rotate(seta);
    g.beginPath();
    g.moveTo(-50, -18);
    g.lineTo(10, -18);
    g.lineTo(10, -46);
    g.lineTo(62, 0);
    g.lineTo(10, 46);
    g.lineTo(10, 18);
    g.lineTo(-50, 18);
    g.closePath();
    g.fill();
    g.restore();
    // logo
    if (logo === "M") {
      g.fillStyle = "#DA291C";
      g.beginPath();
      g.roundRect(170, y - 55, 110, 110, 18);
      g.fill();
      desenhaM(g, 225, y + 4, 84);
    } else {
      g.fillStyle = "#F5EBDC";
      g.beginPath();
      g.roundRect(170, y - 55, 110, 110, 18);
      g.fill();
      desenhaLogoBK(g, 225, y + 2, 50);
    }
    g.fillStyle = "#ffffff";
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.font = `700 62px ${FONTE}`;
    g.fillText(nome, 300, y + 4);
    g.textAlign = "right";
    g.font = `700 84px ${FONTE}`;
    g.fillText(km, 980, y + 4);
  };
  linha(190, "McDonald's", "5 km", "M", 0);
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.fillRect(70, 318, 884, 6);
  linha(460, "Burger King", "258 km", "BK", 0);
  return tex(c);
}

// Céu em degradê (fundo)
export function texCeu(cores: string[]) {
  const { c, g } = cnv(16, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  cores.forEach((k, i) => gr.addColorStop(i / (cores.length - 1), k));
  g.fillStyle = gr;
  g.fillRect(0, 0, 16, 512);
  return tex(c);
}

// Fundo da tela de seleção: metade BK, metade Méqui
export function texSelecao(estilo: "A" | "B" | "C") {
  const W = 1024, H = 1024;
  const { c, g } = cnv(W, H);
  // lado BK (laranja e azul)
  const gl = g.createLinearGradient(0, 0, W * 0.5, H);
  gl.addColorStop(0, estilo === "A" ? "#c9561f" : "#FF8732");
  gl.addColorStop(1, estilo === "A" ? "#7a1d10" : "#D62300");
  g.fillStyle = gl;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(W * 0.58, 0);
  g.lineTo(W * 0.42, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  const gr = g.createLinearGradient(W, 0, W * 0.5, H);
  gr.addColorStop(0, estilo === "A" ? "#e5a823" : "#FFC72C");
  gr.addColorStop(1, estilo === "A" ? "#a3201a" : "#DA291C");
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(W * 0.58, 0);
  g.lineTo(W, 0);
  g.lineTo(W, H);
  g.lineTo(W * 0.42, H);
  g.closePath();
  g.fill();
  // raios de velocidade
  const r = rng(7);
  g.globalAlpha = estilo === "A" ? 0.08 : 0.16;
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const w = 0.01 + r() * 0.03;
    g.beginPath();
    g.moveTo(W / 2, H / 2);
    g.lineTo(W / 2 + Math.cos(a) * 1500, H / 2 + Math.sin(a) * 1500);
    g.lineTo(W / 2 + Math.cos(a + w) * 1500, H / 2 + Math.sin(a + w) * 1500);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
  // faixa branca da divisão
  g.strokeStyle = "#ffffff";
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(W * 0.58, 0);
  g.lineTo(W * 0.42, H);
  g.stroke();
  return tex(c);
}

// Lona do ringue
export function texLona(estilo: "A" | "B" | "C") {
  const { c, g } = cnv(1024, 1024);
  g.fillStyle = estilo === "A" ? "#d9d2c3" : "#f3ead8";
  g.fillRect(0, 0, 1024, 1024);
  if (estilo === "A") {
    const img = g.getImageData(0, 0, 1024, 1024);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }
  // logos no centro: metade BK, metade M
  g.globalAlpha = 0.9;
  g.fillStyle = "#D62300";
  g.beginPath();
  g.arc(512, 512, 300, Math.PI / 2, (Math.PI * 3) / 2);
  g.fill();
  g.fillStyle = "#FFC72C";
  g.beginPath();
  g.arc(512, 512, 300, -Math.PI / 2, Math.PI / 2);
  g.fill();
  g.globalAlpha = 1;
  g.fillStyle = "#ffffff";
  g.font = `900 150px ${FONTE_T}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("VS", 512, 520);
  g.strokeStyle = "#ffffff";
  g.lineWidth = 12;
  g.strokeRect(40, 40, 944, 944);
  return tex(c);
}

// Tela vertical do palco (2026): moldura com "REC"
export function texTelaVideo(cor: string, rotulo: string) {
  const { c, g } = cnv(512, 900);
  const gr = g.createLinearGradient(0, 0, 0, 900);
  gr.addColorStop(0, cor);
  gr.addColorStop(1, "#140d0a");
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 900);
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = `700 40px ${FONTE}`;
  g.fillText(rotulo, 30, 70);
  return tex(c);
}

// Gradiente de 3 tons do toon
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

// Pele (leve rugosidade de vinil para a maquete)
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
