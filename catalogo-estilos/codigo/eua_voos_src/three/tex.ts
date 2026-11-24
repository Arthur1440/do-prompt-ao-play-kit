// Texturas procedurais (canvas): madeira, céu, halo, nuvem, tela do celular, cartão de embarque, etiqueta do disquete.
import * as THREE from "three";
import { rng } from "./rng";
import { USA } from "./geo";

const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};
const tx = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

export function texMadeira() {
  const [c, g] = cv(1024, 1024);
  const R = rng(11);
  g.fillStyle = "#7a4a2a";
  g.fillRect(0, 0, 1024, 1024);
  // tábuas
  for (let p = 0; p < 4; p++) {
    const y0 = p * 256;
    const base = ["#7d4b2b", "#734326", "#86532f", "#6f4024"][p];
    g.fillStyle = base;
    g.fillRect(0, y0, 1024, 256);
    for (let i = 0; i < 70; i++) {
      const y = y0 + R.ab(4, 252);
      g.strokeStyle = `rgba(${R.r() < 0.5 ? "40,20,8" : "160,110,70"},${R.ab(0.05, 0.22)})`;
      g.lineWidth = R.ab(0.6, 3);
      g.beginPath();
      const a = R.ab(0, 6), f = R.ab(0.004, 0.012), amp = R.ab(1, 6);
      for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x * f + a) * amp);
      g.stroke();
    }
    g.fillStyle = "rgba(20,10,4,0.55)";
    g.fillRect(0, y0, 1024, 3);
  }
  const t = tx(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function texCeuToon() {
  const [c, g] = cv(16, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#3d8fe0");
  gr.addColorStop(0.55, "#8fd0ff");
  gr.addColorStop(1, "#ffe7b8");
  g.fillStyle = gr;
  g.fillRect(0, 0, 16, 512);
  return tx(c);
}

export function texHalo() {
  const [c, g] = cv(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,0.45)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return tx(c);
}

export function texNuvem(seed = 5) {
  const [c, g] = cv(1024, 512);
  const R = rng(seed);
  // poucas faixas alongadas e finas; o resto transparente
  for (let i = 0; i < 9; i++) {
    const x = R.ab(150, 874), y = R.ab(120, 392), rx = R.ab(140, 320), ry = R.ab(14, 40);
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(255,255,255,${R.ab(0.25, 0.5)})`);
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(-rx, -rx, rx * 2, rx * 2);
    g.restore();
  }
  return tx(c);
}

/** trilha de luz (gradiente horizontal) para os aviões em voo da direção C */
export function texTrilha() {
  const [c, g] = cv(256, 16);
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 16);
  return tx(c);
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** miniatura do próprio reel (mapa escuro com pontos e o título) */
function miniatura(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
  g.save();
  rr(g, x0, y0, w, h, 22);
  g.clip();
  g.fillStyle = "#07080b";
  g.fillRect(x0, y0, w, h);
  const R = rng(4);
  const sx = w / 10.5, cx = x0 + w / 2, cy = y0 + h * 0.6;
  g.fillStyle = "#14171f";
  g.beginPath();
  for (const r of USA) {
    r.forEach(([x, z], i) => (i ? g.lineTo(cx + x * sx, cy + z * sx) : g.moveTo(cx + x * sx, cy + z * sx)));
    g.closePath();
  }
  g.fill();
  for (let i = 0; i < 420; i++) {
    const x = R.ab(-4.6, 4.5), z = R.ab(-3.1, 2.6);
    g.fillStyle = R.r() < 0.55 ? "#E5322D" : "#F5D27A";
    g.fillRect(cx + x * sx, cy + z * sx, 3, 3);
  }
  g.fillStyle = "#E5322D";
  rr(g, x0 + 22, y0 + 26, 230, 34, 6);
  g.fill();
  g.fillStyle = "#fff";
  g.font = "700 20px 'JetBrains Mono', monospace";
  g.fillText("URGENTE · EUA · 13 NOV", x0 + 32, y0 + 49);
  g.textAlign = "center";
  g.font = "64px 'Bebas Neue', Oswald, sans-serif";
  g.fillStyle = "#fff";
  g.fillText("NENHUM AVIÃO", x0 + w / 2, y0 + 140);
  g.fillStyle = "#E5322D";
  g.fillText("DECOLA", x0 + w / 2, y0 + 200);
  g.textAlign = "left";
  // botão de play
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.arc(x0 + w / 2, y0 + h * 0.62, 56, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(x0 + w / 2 - 18, y0 + h * 0.62 - 28);
  g.lineTo(x0 + w / 2 + 30, y0 + h * 0.62);
  g.lineTo(x0 + w / 2 - 18, y0 + h * 0.62 + 28);
  g.fill();
  g.restore();
}

/** tela do celular: conversa com a mãe, vídeo enviado. k = progresso do envio (0..1) */
export function desenhaTelaChat(c: HTMLCanvasElement, k: number) {
  const g = c.getContext("2d")!;
  const W = c.width, H = c.height;
  g.fillStyle = "#0f1115";
  g.fillRect(0, 0, W, H);
  // barra de status
  g.fillStyle = "#e9ecf2";
  g.font = "600 30px 'Space Grotesk', sans-serif";
  g.fillText("9:41", 48, 58);
  g.fillRect(W - 120, 36, 62, 26);
  // cabeçalho
  g.fillStyle = "#171a21";
  g.fillRect(0, 86, W, 132);
  g.fillStyle = "#e9ecf2";
  g.font = "600 46px 'Space Grotesk', sans-serif";
  g.fillText("‹", 30, 168);
  g.fillStyle = "#f3a9c0";
  g.beginPath();
  g.arc(122, 152, 42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#5a1f33";
  g.font = "700 40px 'Space Grotesk', sans-serif";
  g.textAlign = "center";
  g.fillText("M", 122, 166);
  g.textAlign = "left";
  g.fillStyle = "#ffffff";
  g.font = "700 40px 'Space Grotesk', sans-serif";
  g.fillText("Mãe", 182, 148);
  g.fillStyle = "#8a93a6";
  g.font = "500 26px 'Space Grotesk', sans-serif";
  g.fillText("online", 182, 186);
  // mensagem da mãe
  let y = 270;
  g.fillStyle = "#232731";
  rr(g, 36, y, 520, 150, 30);
  g.fill();
  g.fillStyle = "#f1f3f7";
  g.font = "500 34px 'Space Grotesk', sans-serif";
  g.fillText("Semana que vem eu", 66, y + 60);
  g.fillText("embarco pros EUA!", 66, y + 108);
  y += 190;
  // vídeo enviado (entra deslizando)
  const e = Math.min(1, k * 1.6);
  const dx = (1 - e) * 120;
  g.globalAlpha = Math.min(1, e * 1.5);
  const bx = W - 36 - 470 + dx, bw = 470, bh = 640;
  g.fillStyle = "#c2551f";
  rr(g, bx, y, bw, bh + 128, 30);
  g.fill();
  miniatura(g, bx + 14, y + 14, bw - 28, bh - 28);
  g.fillStyle = "#fff";
  g.font = "500 31px 'Space Grotesk', sans-serif";
  g.fillText("Confere o voo com a", bx + 26, y + bh + 44);
  g.fillText("companhia antes de sair!", bx + 26, y + bh + 88);
  g.fillStyle = "#ffd9c4";
  g.font = "500 24px 'Space Grotesk', sans-serif";
  g.fillText("agora  ✓✓", bx + bw - 140, y + bh + 120);
  g.globalAlpha = 1;
  // campo de digitar
  g.fillStyle = "#171a21";
  g.fillRect(0, H - 130, W, 130);
  g.fillStyle = "#232731";
  rr(g, 30, H - 106, W - 150, 80, 40);
  g.fill();
  g.fillStyle = "#FF6B2C";
  g.beginPath();
  g.arc(W - 70, H - 66, 40, 0, Math.PI * 2);
  g.fill();
}

export function texTelaChat(k = 1) {
  const [c] = cv(720, 1480);
  desenhaTelaChat(c, k);
  return tx(c);
}

/** cartão de embarque genérico (sem companhia, sem aeroporto) com o carimbo */
export function desenhaCartao(c: HTMLCanvasElement, carimbo: number) {
  const g = c.getContext("2d")!;
  const W = c.width, H = c.height;
  g.fillStyle = "#f7f3ea";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#2f4a6b";
  g.fillRect(0, 0, W, 110);
  g.fillStyle = "#fff";
  g.font = "700 50px 'Space Grotesk', sans-serif";
  g.fillText("CARTÃO DE EMBARQUE", 44, 74);
  // picote
  g.strokeStyle = "#b9b2a2";
  g.setLineDash([10, 10]);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(W * 0.72, 120);
  g.lineTo(W * 0.72, H - 10);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "#6b6456";
  g.font = "600 30px 'JetBrains Mono', monospace";
  g.fillText("DE", 50, 180);
  g.fillText("PARA", 560, 180);
  g.fillStyle = "#1e1b16";
  g.font = "700 74px 'Space Grotesk', sans-serif";
  g.fillText("SÃO PAULO", 50, 262);
  g.fillText("EUA", 560, 262);
  g.font = "700 60px 'Space Grotesk', sans-serif";
  g.fillText("→", 470, 258);
  // código de barras
  const R = rng(9);
  let x = W * 0.76;
  while (x < W - 40) {
    const w = R.ab(3, 11);
    g.fillStyle = "#1e1b16";
    g.fillRect(x, 160, w, 280);
    x += w + R.ab(3, 9);
  }
  // carimbo
  if (carimbo > 0) {
    const s = 1 + (1 - Math.min(1, carimbo)) * 0.6;
    g.save();
    g.globalAlpha = Math.min(1, carimbo * 1.4) * 0.92;
    g.translate(W * 0.37, H * 0.735);
    g.rotate(-0.07);
    g.scale(s, s);
    g.strokeStyle = "#d4271f";
    g.lineWidth = 12;
    rr(g, -330, -62, 660, 124, 16);
    g.stroke();
    g.lineWidth = 4;
    rr(g, -316, -48, 632, 96, 10);
    g.stroke();
    g.fillStyle = "#d4271f";
    g.textAlign = "center";
    g.font = "80px 'Bebas Neue', Oswald, sans-serif";
    g.fillText("CONFIRA COM A COMPANHIA", 0, 28);
    g.restore();
  }
}
export function texCartao(carimbo = 1) {
  const [c] = cv(1200, 520);
  desenhaCartao(c, carimbo);
  return tx(c);
}

/** etiqueta em branco do disquete (linhas pautadas, sem marca) */
export function texEtiqueta() {
  const [c, g] = cv(512, 400);
  g.fillStyle = "#f4f1e8";
  g.fillRect(0, 0, 512, 400);
  g.fillStyle = "#e4dccb";
  g.fillRect(0, 0, 512, 46);
  g.strokeStyle = "#c9c0ae";
  g.lineWidth = 3;
  for (let y = 120; y < 400; y += 62) {
    g.beginPath();
    g.moveTo(24, y);
    g.lineTo(488, y);
    g.stroke();
  }
  return tx(c);
}
