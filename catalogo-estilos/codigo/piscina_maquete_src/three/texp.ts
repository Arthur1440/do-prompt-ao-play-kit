// Texturas da piscina (canvas, determinísticas). "A" maquete (plástico, pouca textura), "B" toon (chapado),
// "C" comercial fotorreal (detalhe fino). Cada textura cobre 1 m x 1 m de mundo (repeat = tamanho em metros).
import * as THREE from "three";
import { rng } from "./rng";
import type { Dir } from "./kit";
import { memo, tela, tx, fbm, rgb, pinta } from "./tex";

const mix3 = (a: number[], b: number[], k: number) => a.map((x, i) => x * (1 - k) + b[i] * k);
const cl = (x: number) => Math.max(0, Math.min(1, x));

// ------------------------------------------------------------------ grama
export function texGrama(d: Dir) {
  return memo(`grama${d}`, () => {
    if (d === "B") {
      const n = fbm(5);
      const A = rgb("#79c653"), E = rgb("#72bf4d");
      const { c } = pinta(256, 256, (u, v) => (n(u * 0.6, v * 0.6) > 0.62 ? E : A));
      return tx(c, true, true);
    }
    if (d === "A") {
      // grama de maquete: feltro/flocado verde, grão fino
      const n = fbm(7);
      const A = rgb("#5f9e45"), E = rgb("#4f8a3a");
      const { c } = pinta(512, 512, (u, v) => {
        const k = cl((n(u * 2, v * 2) - 0.35) * 1.6);
        const g = 0.9 + (Math.random() * 0.0 + n(u * 40, v * 40)) * 0.2;
        return mix3(A, E, k).map((x) => x * g);
      });
      return tx(c, true, true);
    }
    // C: folhas curtas em tons de verde, manchas mais secas
    const { c, g } = tela(1024, 1024);
    const n = fbm(9), R = rng(19);
    const base = pinta(1024, 1024, (u, v) => {
      const m = n(u * 3, v * 3), s = cl((n(u * 1.2 + 3, v * 1.2) - 0.55) * 3);
      return mix3(mix3(rgb("#3f7a2a"), rgb("#56923a"), m), rgb("#8f9a4a"), s * 0.5);
    });
    g.drawImage(base.c, 0, 0);
    for (let i = 0; i < 26000; i++) {
      const x = R.r() * 1024, y = R.r() * 1024, a = -Math.PI / 2 + (R.r() - 0.5) * 1.2, L = 5 + R.r() * 9;
      const tom = R.r();
      const cor = tom < 0.4 ? [70, 128, 44] : tom < 0.75 ? [96, 150, 58] : tom < 0.92 ? [130, 170, 70] : [160, 160, 90];
      const f = 0.75 + R.r() * 0.45;
      g.strokeStyle = `rgba(${cor[0] * f},${cor[1] * f},${cor[2] * f},0.9)`;
      g.lineWidth = 1 + R.r() * 1.3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.stroke();
    }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ lama (barro molhado)
export function texLama(d: Dir) {
  return memo(`lama${d}`, () => {
    const n = fbm(23), R = rng(29);
    const A = rgb(d === "B" ? "#a0683e" : d === "A" ? "#8c5a3a" : "#6e4a30");
    const E = rgb(d === "B" ? "#8a5632" : d === "A" ? "#704630" : "#4e3220");
    const { c, g } = pinta(512, 512, (u, v) => {
      const m = n(u * 2.5, v * 2.5);
      if (d === "B") return m > 0.55 ? E : A;
      const k = cl((m - 0.3) * 1.7);
      const f = 0.9 + n(u * 18, v * 18) * 0.2;
      return mix3(A, E, k).map((x) => x * f);
    });
    if (d !== "B") {
      for (let i = 0; i < (d === "C" ? 900 : 300); i++) {
        const x = R.r() * 512, y = R.r() * 512, r = 0.8 + R.r() * (d === "C" ? 3 : 2);
        const l = 60 + R.r() * 60;
        g.fillStyle = `rgba(${l + 35},${l + 10},${l - 10},${0.35 + R.r() * 0.35})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ tijolo (cobre 0,88 x 0,87 m: 4 tijolos x 10 fiadas)
export const TIJ = { w: 0.88, h: 0.87 };
export function texTijolo(d: Dir) {
  return memo(`tij${d}`, () => {
    const W = 512, H = 512, R = rng(31), n = fbm(37);
    const { c, g } = tela(W, H);
    const arg = d === "B" ? "#f1d6ad" : d === "A" ? "#d9c3a0" : "#b8a88e";
    g.fillStyle = arg;
    g.fillRect(0, 0, W, H);
    const fil = 10, col = 4, hh = H / fil, ww = W / col, m = d === "C" ? 5 : 6;
    for (let r = 0; r < fil; r++)
      for (let k = -1; k <= col; k++) {
        const x0 = k * ww + (r % 2 ? ww / 2 : 0), y0 = r * hh;
        const tom = R.r();
        const base = d === "B" ? (tom > 0.5 ? [226, 112, 62] : [214, 100, 54]) : d === "A" ? [200 + tom * 18, 98 + tom * 16, 58 + tom * 8] : [150 + tom * 50, 70 + tom * 28, 44 + tom * 16];
        g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        g.fillRect(x0 + m / 2, y0 + m / 2, ww - m, hh - m);
        if (d === "C") {
          // poros e manchas do barro cozido
          const img = g.getImageData(Math.max(0, x0 + m / 2), y0 + m / 2, Math.min(ww - m, W - Math.max(0, x0 + m / 2)), hh - m);
          for (let i = 0; i < img.data.length; i += 4) {
            const px = (i / 4) % img.width, py = Math.floor(i / 4 / img.width);
            const f = 0.82 + n((x0 + px) / W * 3, (y0 + py) / H * 3) * 0.3 + (R.r() - 0.5) * 0.08;
            img.data[i] *= f;
            img.data[i + 1] *= f;
            img.data[i + 2] *= f;
          }
          g.putImageData(img, Math.max(0, x0 + m / 2), y0 + m / 2);
        }
      }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ reboco cinza (massa de cimento)
export function texRebocoCinza(d: Dir) {
  return memo(`rebc${d}`, () => {
    const n = fbm(41);
    const A = rgb(d === "B" ? "#d8d2c6" : d === "A" ? "#c9c2b4" : "#b9b2a5");
    const { c } = pinta(512, 512, (u, v) => {
      if (d === "B") return A;
      const f = 0.9 + n(u * 3, v * 3) * 0.14 + (n(u * 30, v * 30) - 0.5) * (d === "C" ? 0.12 : 0.04);
      return A.map((x) => x * f);
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ concreto (poros e marcas de fôrma)
export function texConcreto(d: Dir) {
  return memo(`conc${d}`, () => {
    const n = fbm(43), R = rng(47);
    const A = rgb(d === "B" ? "#b9bdc2" : d === "A" ? "#a9aaa6" : "#9d9e9a");
    const { c, g } = pinta(512, 512, (u, v) => {
      if (d === "B") return A;
      const f = 0.88 + n(u * 2, v * 2) * 0.16 + (n(u * 25, v * 25) - 0.5) * (d === "C" ? 0.14 : 0.05);
      const forma = d === "C" && (v * 4) % 1 < 0.012 ? 0.85 : 1; // junta da tábua da fôrma
      return A.map((x) => x * f * forma);
    });
    for (let i = 0; i < (d === "B" ? 0 : d === "A" ? 120 : 600); i++) {
      const x = R.r() * 512, y = R.r() * 512, r = 0.7 + R.r() * 2.2;
      g.fillStyle = `rgba(40,40,40,${0.25 + R.r() * 0.35})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ azulejo da piscina (7 x 7 por metro)
export function texAzulejo(d: Dir) {
  return memo(`azu${d}`, () => {
    const S = 7, W = 512, R = rng(53);
    const { c, g } = tela(W, W);
    g.fillStyle = d === "B" ? "#ffffff" : "#e8f4f4";
    g.fillRect(0, 0, W, W);
    const p = W / S, m = d === "C" ? 3 : 4;
    for (let i = 0; i < S; i++)
      for (let j = 0; j < S; j++) {
        const t = R.r();
        const cor = d === "B" ? [110, 205, 236] : d === "A" ? [120 + t * 14, 200 + t * 10, 226 + t * 8] : [96 + t * 26, 186 + t * 18, 214 + t * 14];
        g.fillStyle = `rgb(${cor[0]},${cor[1]},${cor[2]})`;
        g.fillRect(i * p + m / 2, j * p + m / 2, p - m, p - m);
        if (d === "C") {
          const gr = g.createLinearGradient(i * p, j * p, i * p + p, j * p + p);
          gr.addColorStop(0, "rgba(255,255,255,0.10)");
          gr.addColorStop(1, "rgba(0,0,0,0.06)");
          g.fillStyle = gr;
          g.fillRect(i * p + m / 2, j * p + m / 2, p - m, p - m);
        }
      }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ calçada áspera (placas de 0,5 m, pedra clara)
export function texCalcada(d: Dir) {
  return memo(`calc${d}`, () => {
    const n = fbm(59), R = rng(61);
    const A = rgb(d === "B" ? "#f0dcb0" : d === "A" ? "#d8c49e" : "#cdb995");
    const { c, g } = pinta(512, 512, (u, v) => {
      const ju = (u * 2) % 1 < 0.015 || (v * 2) % 1 < 0.015;
      if (d === "B") return ju ? A.map((x) => x * 0.86) : A;
      const f = 0.88 + n(u * 4, v * 4) * 0.16 + (n(u * 60, v * 60) - 0.5) * (d === "C" ? 0.22 : 0.08);
      return A.map((x) => x * f * (ju ? 0.72 : 1));
    });
    if (d !== "B")
      for (let i = 0; i < (d === "C" ? 5000 : 1200); i++) {
        const x = R.r() * 512, y = R.r() * 512;
        const l = R.r() < 0.5 ? 90 : 235;
        g.fillStyle = `rgba(${l},${l - 10},${l - 25},${0.25 + R.r() * 0.3})`;
        g.fillRect(x, y, 1 + R.r() * 1.5, 1 + R.r() * 1.5);
      }
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ telha (fiadas de telha colonial)
export function texTelha(d: Dir) {
  return memo(`telha${d}`, () => {
    const W = 256, n = fbm(67);
    const { c } = pinta(W, W, (u, v) => {
      const fil = (v * 8) % 1, col = (u * 10 + (Math.floor(v * 8) % 2) * 0.5) % 1;
      const onda = 0.75 + 0.25 * Math.sin(col * Math.PI);
      const sombra = fil > 0.82 ? 0.7 : 1;
      const base = d === "B" ? [214, 92, 58] : d === "A" ? [196, 92, 60] : [170, 78, 50];
      const f = d === "B" ? (fil > 0.82 ? 0.82 : 1) : onda * sombra * (0.9 + n(u * 4, v * 4) * 0.2);
      return base.map((x) => x * f);
    });
    return tx(c, true, true);
  });
}

// ------------------------------------------------------------------ olho do flamingo (pupila + brilho), cara da boia
export function texRuidoNormal(seed = 71) {
  return memo(`rn${seed}`, () => {
    const n = fbm(seed);
    const { c } = pinta(256, 256, (u, v) => {
      const e = 1 / 256;
      const dx = (n(u + e, v) - n(u - e, v)) * 40, dy = (n(u, v + e) - n(u, v - e)) * 40;
      return [128 + dx * 127, 128 + dy * 127, 255];
    });
    const t = tx(c, false, true);
    return t;
  });
}

/** normal de água (ondulação fina, periódica) */
export function texOndas(seed = 73) {
  return memo(`ondas${seed}`, () => {
    const W = 256;
    const R = rng(seed);
    const ond = Array.from({ length: 14 }, () => ({ kx: Math.round((R.r() - 0.5) * 12), ky: Math.round((R.r() - 0.5) * 12), f: R.r() * 6.28, a: 0.4 + R.r() }));
    const h = (u: number, v: number) => ond.reduce((s, o) => s + Math.sin((o.kx * u + o.ky * v) * Math.PI * 2 + o.f) * o.a, 0);
    const { c } = pinta(W, W, (u, v) => {
      const e = 1 / W;
      const dx = (h(u + e, v) - h(u - e, v)) * 3.2, dy = (h(u, v + e) - h(u, v - e)) * 3.2;
      const l = Math.hypot(dx, dy, 1);
      return [128 + (-dx / l) * 127, 128 + (-dy / l) * 127, 128 + (1 / l) * 127];
    });
    return tx(c, false, true);
  });
}

export function texCeuP(d: Dir) {
  return memo(`ceuP${d}`, () => {
    const { c, g } = tela(256, 1024);
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    if (d === "B") {
      gr.addColorStop(0, "#3d9cf0");
      gr.addColorStop(0.65, "#8fd2ff");
      gr.addColorStop(1, "#d8f2ff");
    } else if (d === "A") {
      // sala ao fundo, fora de foco: parede quente
      gr.addColorStop(0, "#4a3426");
      gr.addColorStop(0.5, "#7a5a40");
      gr.addColorStop(1, "#a07a56");
    } else {
      gr.addColorStop(0, "#2b6fd0");
      gr.addColorStop(0.6, "#6aa8ea");
      gr.addColorStop(1, "#d6ebfb");
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 1024);
    return tx(c);
  });
}

export { THREE };
