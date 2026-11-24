// Texturas procedurais (canvas). Tudo determinístico: mesmo seed, mesma imagem.
// Cada função recebe o "modo" da direção: "A" maquete (plástico, pouca textura), "B" toon (cores chapadas),
// "C" comercial fotorreal (detalhe fino, poeira, desgaste).
import * as THREE from "three";
import { rng } from "./rng";
import type { Dir } from "./kit";

const cache = new Map<string, THREE.Texture>();
function memo(k: string, f: () => THREE.Texture) {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k)!;
}

function tela(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}
function tx(c: HTMLCanvasElement, srgb = true, rep = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** ruído de valor 2D suave (para manchas), periódico em [0,1) */
function ruido2(seed: number, n = 16) {
  const R = rng(seed);
  const v = Array.from({ length: n * n }, () => R.r());
  const s = (x: number) => x * x * (3 - 2 * x);
  return (x: number, y: number) => {
    x = ((x % 1) + 1) % 1 * n;
    y = ((y % 1) + 1) % 1 * n;
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a = v[(yi % n) * n + (xi % n)], b = v[(yi % n) * n + ((xi + 1) % n)];
    const c = v[((yi + 1) % n) * n + (xi % n)], d = v[((yi + 1) % n) * n + ((xi + 1) % n)];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
function fbm(seed: number) {
  const ns = [ruido2(seed, 4), ruido2(seed + 1, 8), ruido2(seed + 2, 16), ruido2(seed + 3, 32), ruido2(seed + 4, 64)];
  return (x: number, y: number) => ns[0](x, y) * 0.4 + ns[1](x, y) * 0.25 + ns[2](x, y) * 0.17 + ns[3](x, y) * 0.11 + ns[4](x, y) * 0.07;
}

function rgb(hex: string) {
  const c = new THREE.Color(hex);
  return [c.r * 255, c.g * 255, c.b * 255];
}

/** pinta pixel a pixel com uma função (u,v) -> [r,g,b] */
function pinta(w: number, h: number, f: (u: number, v: number) => number[]) {
  const { c, g } = tela(w, h);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = f(x / w, y / h);
      const i = (y * w + x) * 4;
      img.data[i] = p[0];
      img.data[i + 1] = p[1];
      img.data[i + 2] = p[2];
      img.data[i + 3] = p[3] ?? 255;
    }
  g.putImageData(img, 0, 0);
  return { c, g };
}

// ------------------------------------------------------------------ madeira (tábuas)
export function texMadeira(d: Dir, base = "#9a6a42", escura = "#6e4526", tabuas = 5, seed = 11) {
  return memo(`mad${d}${base}${tabuas}${seed}`, () => {
    const n = fbm(seed), R = rng(seed);
    const A = rgb(base), E = rgb(escura);
    const off = Array.from({ length: tabuas }, () => R.r());
    const tons = Array.from({ length: tabuas }, () => 0.85 + R.r() * 0.3);
    const { c } = pinta(512, 512, (u, v) => {
      const k = Math.floor(v * tabuas), fv = v * tabuas - k;
      if (d === "B") {
        const t = tons[k] > 1 ? 1 : 0.93;
        const junta = fv < 0.04 ? 0.7 : 1;
        return A.map((a) => a * t * junta);
      }
      const veio = Math.sin((u * 7 + n(u * 0.5 + off[k], v * 2 + off[k]) * 6) * Math.PI * 2) * 0.5 + 0.5;
      const m = Math.pow(veio, 3) * (d === "A" ? 0.35 : 0.6) + n(u * 3, v * 9 + k) * 0.25;
      const junta = fv < 0.035 || fv > 0.985 ? 0.55 : 1;
      return A.map((a, i) => (a * (1 - m) + E[i] * m) * tons[k] * junta);
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ terra batida (barro do Nordeste)
export function texTerra(d: Dir, seed = 21) {
  return memo(`terra${d}${seed}`, () => {
    const n = fbm(seed), R = rng(seed + 5);
    const A = rgb(d === "B" ? "#ecd0a2" : d === "A" ? "#b9805a" : "#a9744c");
    const E = rgb(d === "B" ? "#e2c08e" : "#7f5236");
    const { c, g } = pinta(1024, 1024, (u, v) => {
      const m = n(u * 2, v * 2);
      if (d === "B") return m > 0.62 ? E : A;
      const k = Math.min(1, Math.max(0, (m - 0.35) * 1.8));
      const f = 0.92 + n(u * 16, v * 16) * 0.16;
      return A.map((a, i) => (a * (1 - k) + E[i] * k) * f);
    });
    if (d !== "B") {
      // pedrinhas e grãos
      for (let i = 0; i < 1400; i++) {
        const x = R.r() * 1024, y = R.r() * 1024, r = 0.6 + R.r() * (d === "C" ? 2.2 : 1.6);
        const l = 70 + R.r() * (d === "C" ? 70 : 110);
        g.fillStyle = `rgba(${l + 30},${l},${l - 25},${0.35 + R.r() * 0.4})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ reboco caiado (parede da casa)
export function texReboco(d: Dir, seed = 31) {
  return memo(`reb${d}${seed}`, () => {
    const n = fbm(seed);
    const A = rgb(d === "B" ? "#fbf1dc" : d === "A" ? "#e9dcc4" : "#ebe1cf");
    const { c } = pinta(512, 512, (u, v) => {
      if (d === "B") return A;
      const m = n(u * 3, v * 3);
      const f = 0.9 + m * 0.14 + (n(u * 20, v * 20) - 0.5) * (d === "C" ? 0.08 : 0.03);
      const sujo = d === "C" ? Math.max(0, v - 0.75) * 0.5 * n(u * 6, 0.3) : 0; // respingo de barro embaixo
      return [A[0] * (f - sujo * 0.4), A[1] * (f - sujo * 0.55), A[2] * (f - sujo * 0.7)];
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ frente do gabinete (baias, disquete, botão, grade)
// Proporção 0.20 x 0.44 (largura x altura). Gera cor e relevo (bump) a partir do mesmo desenho.
export function texFrente(d: Dir) {
  return memo(`frente${d}`, () => {
    const W = 400, H = 880;
    const desenha = (g: CanvasRenderingContext2D, relevo: boolean) => {
      const cBase = relevo ? "#808080" : d === "B" ? "#efdcb0" : d === "A" ? "#ddd1b4" : "#d2c4a2";
      const cBaia = relevo ? "#5a5a5a" : d === "B" ? "#e2cc98" : d === "A" ? "#d2c5a6" : "#c6b693";
      const cFenda = relevo ? "#202020" : "#2a241c";
      const cLinha = relevo ? "#4a4a4a" : d === "B" ? "#bfa776" : "#a8987a";
      g.fillStyle = cBase;
      g.fillRect(0, 0, W, H);
      // moldura interna
      g.strokeStyle = cLinha;
      g.lineWidth = 6;
      g.strokeRect(20, 20, W - 40, H - 40);
      // 2 baias de 5,25"
      for (let i = 0; i < 2; i++) {
        const y = 62 + i * 96;
        g.fillStyle = cBaia;
        g.fillRect(44, y, W - 88, 82);
        g.strokeStyle = cLinha;
        g.lineWidth = 4;
        g.strokeRect(44, y, W - 88, 82);
        if (i === 0) {
          // gaveta de CD: fenda e botão de ejetar
          g.fillStyle = cFenda;
          g.fillRect(60, y + 24, W - 120, 8);
          g.fillStyle = relevo ? "#a0a0a0" : "#bcae8c";
          g.fillRect(W - 120, y + 52, 52, 16);
          if (!relevo) {
            g.fillStyle = "#6fd06a";
            g.fillRect(70, y + 56, 14, 8);
          }
        }
      }
      // baia de 3,5" (disquete)
      const yd = 278;
      g.fillStyle = cBaia;
      g.fillRect(96, yd, W - 192, 64);
      g.strokeStyle = cLinha;
      g.strokeRect(96, yd, W - 192, 64);
      g.fillStyle = cFenda;
      g.fillRect(118, yd + 20, W - 236, 10);
      g.fillStyle = relevo ? "#a0a0a0" : "#bcae8c";
      g.fillRect(W - 150, yd + 40, 30, 14);
      // botão de ligar (círculo) e LEDs
      g.fillStyle = relevo ? "#c8c8c8" : d === "B" ? "#d8c08c" : "#c9b994";
      g.beginPath();
      g.arc(W / 2, 450, 40, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = cLinha;
      g.lineWidth = 5;
      g.stroke();
      g.strokeStyle = relevo ? "#3a3a3a" : "#7a6d55";
      g.lineWidth = 6;
      g.beginPath();
      g.arc(W / 2, 450, 18, -Math.PI * 0.3, Math.PI * 1.3);
      g.stroke();
      g.beginPath();
      g.moveTo(W / 2, 426);
      g.lineTo(W / 2, 448);
      g.stroke();
      g.fillStyle = relevo ? "#909090" : "#3d6b3a";
      g.fillRect(W / 2 - 44, 512, 18, 9);
      g.fillStyle = relevo ? "#909090" : "#8a5a2a";
      g.fillRect(W / 2 + 26, 512, 18, 9);
      // grade de ventilação embaixo
      g.fillStyle = cFenda;
      for (let i = 0; i < 11; i++) {
        const y = 600 + i * 22;
        g.beginPath();
        g.roundRect(70, y, W - 140, 9, 4);
        g.fill();
      }
    };
    const { c, g } = tela(W, H);
    desenha(g, false);
    if (d === "C") {
      // amarelado e poeira nas reentrâncias
      const n = fbm(41);
      const img = g.getImageData(0, 0, W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4, m = n(x / W * 2, y / H * 2);
          const f = 0.95 + (m - 0.5) * 0.12;
          img.data[i] *= f;
          img.data[i + 1] *= f * 0.985;
          img.data[i + 2] *= f * 0.94;
        }
      g.putImageData(img, 0, 0);
    }
    const r = tela(W, H);
    desenha(r.g, true);
    const cor = tx(c);
    const bump = tx(r.c, false);
    return Object.assign(cor, { userData: { bump } });
  });
}

// ------------------------------------------------------------------ chapa lateral do gabinete (bege) com poeira
export function texLateral(d: Dir, seed = 51) {
  return memo(`lat${d}${seed}`, () => {
    const n = fbm(seed);
    const A = rgb(d === "B" ? "#f0dfb4" : d === "A" ? "#ddd1b4" : "#cfc1a0");
    const { c } = pinta(512, 512, (u, v) => {
      if (d === "B") return A;
      const m = n(u * 2, v * 2);
      const f = 0.94 + (m - 0.5) * (d === "C" ? 0.16 : 0.06);
      return [A[0] * f, A[1] * f * 0.99, A[2] * f * (d === "C" ? 0.93 : 0.98)];
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ chapa metálica crua (dentro do gabinete)
export function texChapa(d: Dir, seed = 61) {
  return memo(`chapa${d}${seed}`, () => {
    const n = fbm(seed);
    const { c } = pinta(256, 256, (u, v) => {
      const l = d === "B" ? 176 : 150 + (n(u * 4, v * 4) - 0.5) * 50 + (n(u * 40, v * 2) - 0.5) * 18;
      return [l, l + 4, l + 8];
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ isopor (bolinhas)
export function texIsopor(seed = 71) {
  return memo(`iso${seed}`, () => {
    const R = rng(seed);
    const { c, g } = tela(512, 512);
    g.fillStyle = "#c8c8c8";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const x = R.r() * 512, y = R.r() * 512, r = 4 + R.r() * 6;
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.75, "#d6d6d6");
      gr.addColorStop(1, "#9a9a9a");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return tx(c, false, true);
  });
}

// ------------------------------------------------------------------ placa-mãe
export function texPlaca(d: Dir, seed = 81) {
  return memo(`placa${d}`, () => {
    const R = rng(seed);
    const { c, g } = tela(512, 640);
    g.fillStyle = d === "B" ? "#2f9e5a" : "#1f6b3e";
    g.fillRect(0, 0, 512, 640);
    g.strokeStyle = d === "B" ? "#57c27f" : "#3c8f5c";
    g.lineWidth = 2;
    for (let i = 0; i < 90; i++) {
      let x = R.r() * 512, y = R.r() * 640;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        if (R.r() < 0.5) x += (R.r() - 0.5) * 160;
        else y += (R.r() - 0.5) * 160;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    const chip = (x: number, y: number, w: number, h: number, cor: string) => {
      g.fillStyle = cor;
      g.fillRect(x, y, w, h);
      g.strokeStyle = "#999";
      g.lineWidth = 1;
      for (let i = 4; i < w - 2; i += 6) {
        g.beginPath();
        g.moveTo(x + i, y - 4);
        g.lineTo(x + i, y);
        g.moveTo(x + i, y + h);
        g.lineTo(x + i, y + h + 4);
        g.stroke();
      }
    };
    chip(170, 140, 150, 150, "#c8c8c8"); // soquete
    chip(360, 90, 30, 300, "#222");
    chip(400, 90, 30, 300, "#222"); // memórias
    for (let i = 0; i < 3; i++) chip(60, 420 + i * 60, 360, 18, "#e8e8e8"); // slots PCI
    chip(80, 120, 60, 60, "#1a1a1a");
    chip(220, 340, 80, 50, "#1a1a1a");
    for (let i = 0; i < 14; i++) {
      g.fillStyle = R.r() < 0.5 ? "#2a2a6a" : "#7a5a1a";
      g.beginPath();
      g.arc(40 + R.r() * 440, 40 + R.r() * 560, 7, 0, Math.PI * 2);
      g.fill();
    }
    return tx(c);
  });
}

// ------------------------------------------------------------------ pizza: cobertura crua (queijo ralado) e assada
export function texPizza(d: Dir, assada: boolean, seed = 91) {
  return memo(`pizza${d}${assada}`, () => {
    const R = rng(seed + (assada ? 1 : 0)), n = fbm(seed + 7);
    const S = 1024;
    const { c, g } = tela(S, S);
    // molho
    g.fillStyle = d === "B" ? "#e0472b" : "#b83a22";
    g.fillRect(0, 0, S, S);
    if (d !== "B") {
      for (let i = 0; i < 600; i++) {
        g.fillStyle = `rgba(${120 + R.r() * 60},${20 + R.r() * 20},${10},${0.25})`;
        g.beginPath();
        g.arc(R.r() * S, R.r() * S, 3 + R.r() * 10, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (!assada) {
      // queijo ralado: tirinhas claras
      for (let i = 0; i < (d === "B" ? 900 : 4200); i++) {
        const a = R.r() * Math.PI * 2, rr = Math.sqrt(R.r()) * S * 0.47;
        const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr;
        const ang = R.r() * Math.PI, L = d === "B" ? 26 : 10 + R.r() * 16;
        g.strokeStyle = d === "B" ? "#ffe39a" : `rgb(${235 + R.r() * 20},${210 + R.r() * 25},${140 + R.r() * 40})`;
        g.lineWidth = d === "B" ? 9 : 3 + R.r() * 3;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x - Math.cos(ang) * L, y - Math.sin(ang) * L);
        g.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L);
        g.stroke();
      }
    } else {
      // queijo derretido: manto contínuo com bordas onduladas, bolhas douradas e pintas tostadas
      const img = g.getImageData(0, 0, S, S);
      const Q = rgb(d === "B" ? "#ffd25e" : "#f2c25a"), T = rgb(d === "B" ? "#e09a35" : "#c07a2c"), Tq = rgb("#7a3e17");
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const u = x / S, v = y / S, rr = Math.hypot(u - 0.5, v - 0.5);
          const borda = 0.43 + (n(u * 3, v * 3) - 0.5) * 0.08;
          if (rr > borda) continue;
          const i = (y * S + x) * 4;
          const m = n(u * 6 + 3, v * 6);
          let col = Q;
          if (d === "B") col = m > 0.62 ? T : Q;
          else {
            const k = Math.min(1, Math.max(0, (m - 0.45) * 3));
            col = Q.map((q, j) => q * (1 - k) + T[j] * k);
            const pinta = n(u * 22, v * 22);
            if (pinta > 0.72) {
              const kk = Math.min(1, (pinta - 0.72) * 6);
              col = col.map((q, j) => q * (1 - kk) + Tq[j] * kk);
            }
          }
          img.data[i] = col[0];
          img.data[i + 1] = col[1];
          img.data[i + 2] = col[2];
        }
      g.putImageData(img, 0, 0);
      if (d !== "B") {
        // brilho de gordura
        for (let i = 0; i < 160; i++) {
          const a = R.r() * Math.PI * 2, rr = Math.sqrt(R.r()) * S * 0.4;
          g.fillStyle = "rgba(255,240,190,0.25)";
          g.beginPath();
          g.ellipse(S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr, 6 + R.r() * 10, 3 + R.r() * 6, R.r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // orégano
    if (d !== "B")
      for (let i = 0; i < 260; i++) {
        const a = R.r() * Math.PI * 2, rr = Math.sqrt(R.r()) * S * 0.45;
        g.fillStyle = `rgba(${50 + R.r() * 30},${70 + R.r() * 30},${25},0.85)`;
        g.fillRect(S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr, 3 + R.r() * 3, 2 + R.r() * 3);
      }
    return tx(c);
  });
}

// ------------------------------------------------------------------ vidro embaçado (gotinhas em alfa)
export function texEmbacado(seed = 101) {
  return memo(`emb${seed}`, () => {
    const R = rng(seed), n = fbm(seed);
    const { c, g } = pinta(512, 512, (u, v) => {
      const m = n(u * 2, v * 2);
      const a = Math.max(0, Math.min(1, (m - 0.25) * 1.6)) * 150;
      return [235, 238, 240, a];
    });
    for (let i = 0; i < 1800; i++) {
      const x = R.r() * 512, y = R.r() * 512, r = 0.8 + R.r() * 3.2;
      g.fillStyle = `rgba(255,255,255,${0.35 + R.r() * 0.4})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ céu (fundo de tela) por direção
export function texCeu(d: Dir) {
  return memo(`ceu${d}`, () => {
    const { c, g } = tela(256, 1024);
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    if (d === "B") {
      gr.addColorStop(0, "#2f8fe8");
      gr.addColorStop(0.7, "#7cc8ff");
      gr.addColorStop(1, "#c9ecff");
    } else if (d === "A") {
      // fundo da sala, fora de foco (madeira e parede quente)
      gr.addColorStop(0, "#3a2a20");
      gr.addColorStop(0.55, "#6a4a34");
      gr.addColorStop(1, "#8a6040");
    } else {
      gr.addColorStop(0, "#1f63c8");
      gr.addColorStop(0.55, "#4f95e2");
      gr.addColorStop(1, "#cfe6fb");
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 1024);
    const t = tx(c);
    return t;
  });
}

// ------------------------------------------------------------------ MDF (verso do espelho)
export function texMDF(seed = 111) {
  return memo(`mdf${seed}`, () => {
    const n = fbm(seed);
    const { c } = pinta(256, 256, (u, v) => {
      const f = 0.9 + (n(u * 30, v * 30) - 0.5) * 0.3;
      return [150 * f, 112 * f, 78 * f];
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ mangueira de gás (listra amarela)
export function texMangueira() {
  return memo(`mang`, () => {
    const { c, g } = tela(64, 256);
    g.fillStyle = "#f3e2a8";
    g.fillRect(0, 0, 64, 256);
    g.fillStyle = "#f2a81c";
    g.fillRect(0, 100, 64, 56);
    return tx(c, true, true);
  });
}
