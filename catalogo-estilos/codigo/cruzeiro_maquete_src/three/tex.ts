import * as THREE from "three";
import { fbm, rng } from "./rng";

// Texturas desenhadas em canvas: tudo criado aqui. As únicas imagens externas são as de assets/.
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
export const FONTE_PLACA = "'Alfa Slab One', serif";
export const FONTE_JORNAL = "'Playfair Display', serif";

export const carrega = (src: string) =>
  new Promise<HTMLImageElement>((ok, erro) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = erro;
    i.src = src;
  });

export function texMadeira(escuro = 1) {
  const { c, g } = cnv(1024, 1024);
  const img = g.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const n = fbm(x * 0.004, y * 0.06, 5);
      const veio = 0.5 + 0.5 * Math.sin((y * 0.05 + n * 9 + fbm(x * 0.01, y * 0.01) * 4) * 2.2);
      const tab = Math.floor(y / 256);
      const k = (0.55 + 0.25 * veio + 0.15 * n + (tab % 2) * 0.05) * escuro;
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
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** gramado com faixas de corte (listras) e a linha do círculo central */
export function texGrama(faixas = 10, a = "#3f9a3a", b = "#4fae45", ruido = 0.06) {
  const N = 1024;
  const { c, g } = cnv(N, N);
  for (let i = 0; i < faixas; i++) {
    g.fillStyle = i % 2 ? a : b;
    g.fillRect(0, (i * N) / faixas, N, N / faixas + 1);
  }
  if (ruido > 0) {
    const img = g.getImageData(0, 0, N, N);
    for (let y = 0; y < N; y += 1)
      for (let x = 0; x < N; x += 1) {
        const k = 1 + (fbm(x * 0.05, y * 0.05, 3) - 0.5) * ruido * 2;
        const i = (y * N + x) * 4;
        img.data[i] *= k;
        img.data[i + 1] *= k;
        img.data[i + 2] *= k;
      }
    g.putImageData(img, 0, 0);
  }
  const t = tex(c);
  return t;
}

/** arquibancada lotada: torcida em azul e branco (genérica, sem rostos) */
export function texTorcida(estilo: "A" | "B" | "C", seed = 7) {
  const W = 2048, H = 512;
  const { c, g } = cnv(W, H);
  const r = rng(seed);
  g.fillStyle = estilo === "C" ? "#bdb6a8" : "#18306b";
  g.fillRect(0, 0, W, H);
  const cores = estilo === "C" ? ["#d8d2c4", "#9a948a", "#efe9dc"] : ["#1f57c3", "#2e6be0", "#ffffff", "#163f99", "#f2f5ff", "#2a5fcf"];
  for (let fila = 0; fila < 18; fila++) {
    const y = H - fila * (H / 18) - 10;
    g.fillStyle = estilo === "C" ? "#8e877b" : "#0d1d45";
    g.fillRect(0, y + 6, W, 5);
    for (let x = 6; x < W; x += 14 + r() * 6) {
      const cor = cores[Math.floor(r() * cores.length)];
      const yy = y - r() * 4;
      g.fillStyle = cor;
      g.beginPath();
      g.ellipse(x, yy, 6, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(x, yy - 11, 4.4, 0, Math.PI * 2);
      g.fillStyle = estilo === "C" ? "#cfc8ba" : ["#e8b48f", "#c98e68", "#8a5a3c", "#f0c8a8"][Math.floor(r() * 4)];
      g.fill();
      if (r() < 0.05) {
        // braço erguido / bandeirinha
        g.fillStyle = r() < 0.5 ? "#ffffff" : "#1f57c3";
        g.fillRect(x + 3, yy - 26, 2, 16);
        g.fillRect(x + 5, yy - 26, 10, 7);
      }
    }
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function texCeu(cores: string[], estrelas = 0, seed = 5) {
  const W = 512, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  cores.forEach((k, i) => gr.addColorStop(i / (cores.length - 1), k));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  const r = rng(seed);
  for (let i = 0; i < estrelas; i++) {
    const x = r() * W, y = r() * H * 0.85;
    const s = r() ** 3 * 2.2 + 0.4;
    g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.6})`;
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

/** papel jornal envelhecido (fundo do nanquim e das folhas) */
export function texPapel(N = 1024, base = [242, 234, 216], seed = 11) {
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.012, y * 0.012, 4) - 0.5;
      const f = (fbm(x * 0.3, y * 0.02, 2) - 0.5) * 0.5;
      const k = 1 + n * 0.08 + f * 0.05 + (r() - 0.5) * 0.04;
      const i = (y * N + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** folha da prancheta: o desenho original da Rapôsa aparecendo de cima para baixo (progresso 0..1) */
export function texDesenho(img: HTMLImageElement) {
  const W = 700, H = 940;
  const { c, g } = cnv(W, H);
  const papel = texPapel(256, [246, 241, 228], 4).image as HTMLCanvasElement;
  const t = tex(c);
  let ultimo = -1;
  const desenha = (p: number) => {
    if (Math.abs(p - ultimo) < 0.002) return;
    ultimo = p;
    g.drawImage(papel, 0, 0, W, H);
    // o desenho original multiplicado sobre o papel, revelado até a altura p
    g.save();
    g.beginPath();
    g.rect(0, 0, W, H * p);
    g.clip();
    g.globalCompositeOperation = "multiply";
    g.drawImage(img, 0, 0, W, H);
    g.restore();
    t.needsUpdate = true;
  };
  desenha(1);
  return { t, desenha, W, H };
}

/** foto de época (sépia) com borda branca de papel fotográfico */
export function texFoto(img: HTMLImageElement, sepia = 0.85, borda = 0.06) {
  const W = 800, H = Math.round((800 * img.height) / img.width);
  const { c, g } = cnv(W, H);
  g.fillStyle = "#efe6d2";
  g.fillRect(0, 0, W, H);
  const b = W * borda;
  g.filter = `sepia(${sepia}) contrast(1.05) brightness(0.98)`;
  g.drawImage(img, b, b, W - 2 * b, H - 2 * b);
  g.filter = "none";
  return { t: tex(c), asp: W / H, c };
}

/** página de jornal com o cabeçalho FOLHA DE MINAS */
export function texJornal(seed = 2) {
  const W = 900, H = 1200;
  const { c, g } = cnv(W, H);
  const papel = texPapel(256, [236, 228, 208], seed).image as HTMLCanvasElement;
  g.drawImage(papel, 0, 0, W, H);
  g.fillStyle = "#1b1712";
  g.textAlign = "center";
  g.font = `900 112px ${FONTE_JORNAL}`;
  g.fillText("FOLHA DE MINAS", W / 2, 150, W - 60);
  g.fillRect(30, 178, W - 60, 6);
  g.fillRect(30, 190, W - 60, 2);
  g.font = `italic 600 26px ${FONTE_JORNAL}`;
  g.fillText("Belo Horizonte", W / 2, 228);
  g.fillRect(30, 244, W - 60, 2);
  const r = rng(seed);
  // colunas de texto (linhas cinzas) e um quadro de charge
  const col = 3, cw = (W - 60 - 40) / col;
  for (let k = 0; k < col; k++) {
    const x0 = 30 + k * (cw + 20);
    let y = 280;
    if (k === 1) {
      g.strokeStyle = "#1b1712";
      g.lineWidth = 3;
      g.strokeRect(x0, y, cw, 300);
      y += 330;
    }
    g.font = `800 30px ${FONTE_JORNAL}`;
    g.textAlign = "left";
    while (y < H - 40) {
      if (r() < 0.12) {
        g.fillStyle = "#1b1712";
        g.fillRect(x0, y, cw * (0.6 + r() * 0.4), 12);
        y += 26;
      } else {
        g.fillStyle = "rgba(40,34,26,0.55)";
        g.fillRect(x0, y, cw * (r() < 0.15 ? 0.5 + r() * 0.4 : 1), 5);
        y += 13;
      }
    }
  }
  return tex(c);
}

/** placa pintada (PALESTRA ITÁLIA / CRUZEIRO), com carimbo opcional */
export function texPlaca(texto: string, fundo: string, letra: string, opts: { carimbo?: number; estrelas?: boolean; W?: number; H?: number } = {}) {
  const W = opts.W ?? 1600, H = opts.H ?? 360;
  const { c, g } = cnv(W, H);
  const t = tex(c);
  const desenha = (carimbo: number) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = fundo;
    g.fillRect(0, 0, W, H);
    // filetes
    g.strokeStyle = letra;
    g.globalAlpha = 0.9;
    g.lineWidth = 10;
    g.strokeRect(26, 26, W - 52, H - 52);
    g.lineWidth = 3;
    g.strokeRect(46, 46, W - 92, H - 92);
    g.globalAlpha = 1;
    // pátina
    const rp = rng(21);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(0,0,0,${rp() * 0.04})`;
      g.fillRect(rp() * W, rp() * H, 3, 3);
    }
    g.fillStyle = letra;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const linhas = texto.split("|");
    const larg = W * (opts.estrelas ? 0.62 : 0.82);
    let fs = (H * 0.62) / linhas.length;
    const maior = () => Math.max(...linhas.map((l) => g.measureText(l).width));
    g.font = `400 ${fs}px ${FONTE_PLACA}`;
    while (maior() > larg) {
      fs -= 4;
      g.font = `400 ${fs}px ${FONTE_PLACA}`;
    }
    const passo = fs * 1.08;
    linhas.forEach((l, i) => g.fillText(l, opts.estrelas ? W * 0.6 : W / 2, H / 2 + (i - (linhas.length - 1) / 2) * passo + fs * 0.04));
    if (opts.estrelas) {
      // as 5 estrelas do Cruzeiro do Sul (desenho genérico, não o escudo)
      const pts: [number, number, number][] = [[0, -1, 1], [0, 1.05, 1.1], [-0.85, -0.05, 0.9], [0.8, -0.25, 0.85], [0.3, 0.35, 0.6]];
      for (const [x, y, s] of pts) desenhaEstrela(g, W * 0.16 + x * W * 0.06, H / 2 + y * H * 0.2, Math.min(H * 0.07, W * 0.03) * s, letra);
    }
    if (carimbo > 0) carimboProibido(g, W * 0.62, H * 0.76, H * 0.27, carimbo);
    t.needsUpdate = true;
  };
  desenha(opts.carimbo ?? 0);
  return { t, desenha, W, H };
}

export function desenhaEstrela(g: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string) {
  g.fillStyle = cor;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

/** carimbo vermelho PROIBIDO, com falhas de tinta */
export function carimboProibido(g: CanvasRenderingContext2D, x: number, y: number, h: number, op = 1) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.13);
  g.globalAlpha = op;
  const w = h * 3.3;
  g.strokeStyle = "#c8161d";
  g.fillStyle = "#c8161d";
  g.lineWidth = h * 0.09;
  g.strokeRect(-w / 2, -h / 2, w, h);
  g.lineWidth = h * 0.035;
  g.strokeRect(-w / 2 + h * 0.11, -h / 2 + h * 0.11, w - h * 0.22, h - h * 0.22);
  g.font = `400 ${h * 0.56}px ${FONTE_PLACA}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("PROIBIDO", 0, h * 0.03, w * 0.86);
  // falhas
  g.globalCompositeOperation = "destination-out";
  const r = rng(9);
  for (let i = 0; i < 260; i++) {
    g.globalAlpha = r() * 0.7;
    g.beginPath();
    g.arc((r() - 0.5) * w, (r() - 0.5) * h, r() * h * 0.04 + 1, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** reboco de fachada antiga */
export function texReboco(base: [number, number, number], seed = 3) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.02, y * 0.02, 5) - 0.5;
      const m = Math.max(0, fbm(x * 0.008 + seed, y * 0.008, 3) - 0.62) * 1.6;
      const k = 1 + n * 0.16 - m * 0.4;
      const i = (y * N + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** calçamento de paralelepípedos */
export function texPedras(base = [120, 118, 112], seed = 4) {
  const N = 1024;
  const { c, g } = cnv(N, N);
  g.fillStyle = `rgb(${base.map((v) => v * 0.45).join(",")})`;
  g.fillRect(0, 0, N, N);
  const r = rng(seed);
  const s = 64;
  for (let y = 0; y < N / (s * 0.62); y++)
    for (let x = -1; x < N / s + 1; x++) {
      const ox = (y % 2) * s * 0.5;
      const k = 0.8 + r() * 0.4;
      g.fillStyle = `rgb(${base.map((v) => v * k).join(",")})`;
      const px = x * s + ox + 3, py = y * s * 0.62 + 3;
      g.beginPath();
      g.roundRect(px, py, s - 6, s * 0.62 - 6, 9);
      g.fill();
    }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** papel de parede listrado da redação */
export function texParede(a = "#d9c7a3", b = "#cdb88f") {
  const { c, g } = cnv(512, 512);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? a : b;
    g.fillRect(i * 32, 0, 32, 512);
  }
  g.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 16; i++) g.fillRect(i * 32 + 14, 0, 3, 512);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** corte lateral da tábua da maquete: terra em camadas */
export function texCorte() {
  const W = 1024, H = 128;
  const { c, g } = cnv(W, H);
  const cam = ["#3e8a33", "#5b3d24", "#6e4b2d", "#835c38", "#5f4128"];
  const hs = [10, 30, 30, 30, 28];
  let y = 0;
  cam.forEach((k, i) => {
    g.fillStyle = k;
    g.fillRect(0, y, W, hs[i] + 1);
    y += hs[i];
  });
  const r = rng(3);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? "255,240,220" : "30,20,10"},${r() * 0.25})`;
    g.beginPath();
    g.arc(r() * W, 14 + r() * (H - 14), r() * 3 + 0.5, 0, Math.PI * 2);
    g.fill();
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** rótulo de texto simples (vidro de nanquim, contrato etc.) */
export function texRotulo(texto: string, fundo = "#efe3c4", letra = "#1b1712", W = 512, H = 256, fonte = FONTE_JORNAL) {
  const { c, g } = cnv(W, H);
  g.fillStyle = fundo;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = letra;
  g.lineWidth = 6;
  g.strokeRect(12, 12, W - 24, H - 24);
  g.fillStyle = letra;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${H * 0.36}px ${fonte}`;
  g.fillText(texto, W / 2, H / 2, W - 60);
  return tex(c);
}

/** cartaz de fundo de céu pintado (maquete) */
export function texCeuPintado() {
  const W = 1024, H = 1536;
  const { c, g } = cnv(W, H);
  const rr = rng(31);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#0a1440");
  gr.addColorStop(0.6, "#1b2f78");
  gr.addColorStop(1, "#3a4f9c");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  // via láctea pintada a pincel
  for (let i = 0; i < 3000; i++) {
    const u = rr();
    const x = u * W, y = H * 0.15 + u * H * 0.5 + (rr() - 0.5) * 260 * Math.sin(u * 3);
    g.fillStyle = `rgba(200,210,255,${rr() * 0.05})`;
    g.beginPath();
    g.arc(x, y, rr() * 30 + 6, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 420; i++) {
    g.fillStyle = `rgba(255,250,235,${0.4 + rr() * 0.6})`;
    g.beginPath();
    g.arc(rr() * W, rr() * H * 0.8, rr() ** 3 * 3 + 0.8, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

/** brilho radial para sprites (estrelas, lâmpadas) */
export function texBrilho(cor = "255,255,255") {
  const { c, g } = cnv(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(${cor},1)`);
  gr.addColorStop(0.18, `rgba(${cor},0.65)`);
  gr.addColorStop(0.45, `rgba(${cor},0.15)`);
  gr.addColorStop(1, `rgba(${cor},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return tex(c);
}

/** grade de lâmpadas do refletor */
export function texRefletor() {
  const { c, g } = cnv(256, 128);
  g.fillStyle = "#2a2f3a";
  g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 6; x++) {
      const cx = 22 + x * 42, cy = 22 + y * 42;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 19);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.6, "#fff6dc");
      gr.addColorStop(1, "#c9c2ad");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(cx, cy, 17, 0, Math.PI * 2);
      g.fill();
    }
  return tex(c);
}
