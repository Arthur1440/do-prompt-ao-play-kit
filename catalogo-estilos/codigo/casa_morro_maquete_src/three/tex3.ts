import * as THREE from "three";
import { fbm, rng } from "./rng";
import { cnv, tex } from "./tex";

type D = "A" | "B" | "C";

/** Digitais e marcas de dedo da massinha (bump em tons de cinza). */
export function texDigital() {
  const N = 512;
  const { c, g } = cnv(N, N);
  g.fillStyle = "rgb(128,128,128)";
  g.fillRect(0, 0, N, N);
  const r = rng(404);
  // manchas de pressão macias
  for (let i = 0; i < 70; i++) {
    const x = r() * N, y = r() * N, R = 20 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    const v = r() < 0.5 ? 150 : 108;
    gr.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
    gr.addColorStop(1, "rgba(128,128,128,0)");
    g.fillStyle = gr;
    g.fillRect(x - R, y - R, R * 2, R * 2);
  }
  // digitais: arcos concêntricos finos
  for (let k = 0; k < 9; k++) {
    const cx = r() * N, cy = r() * N, rx = 26 + r() * 30, ry = rx * (0.6 + r() * 0.3), rot = r() * Math.PI;
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    for (let j = 0; j < 12; j++) {
      g.strokeStyle = `rgba(${j % 2 ? 160 : 100},${j % 2 ? 160 : 100},${j % 2 ? 160 : 100},0.5)`;
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(0, 0, rx * (0.2 + j * 0.08), ry * (0.2 + j * 0.08), 0, 0.3, Math.PI * 1.75);
      g.stroke();
    }
    g.restore();
  }
  const img = g.getImageData(0, 0, N, N);
  for (let i = 0; i < img.data.length; i += 4) {
    const p = i / 4, x = p % N, y = Math.floor(p / N);
    const v = (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 30;
    img.data[i] += v;
    img.data[i + 1] += v;
    img.data[i + 2] += v;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/** Grama vista de cima (topo do morro). */
export function texGramaTopo(d: D) {
  const N = 1024;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = rng(77);
  const base = d === "A" ? [96, 150, 58] : d === "B" ? [112, 196, 72] : [104, 168, 74];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.008, y * 0.008, 4);
      const f = d === "A" ? 0.8 + (n - 0.5) * 0.5 + (r() - 0.5) * 0.25 : d === "B" ? (n > 0.58 ? 0.88 : 1.0) : 0.92 + (n - 0.5) * 0.22 + (r() - 0.5) * 0.04;
      const i = (y * N + x) * 4;
      img.data[i] = base[0] * f;
      img.data[i + 1] = base[1] * f;
      img.data[i + 2] = base[2] * f;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** Colcha de retalhos. */
export function texColcha(d: D) {
  const N = 512, M = 6;
  const { c, g } = cnv(N, N);
  const cores = ["#c8553d", "#f2a541", "#3c7a89", "#e9d8a6", "#7a9e5c", "#9b5de5", "#d97b66", "#4f6d7a"];
  const r = rng(12);
  const s = N / M;
  for (let i = 0; i < M; i++)
    for (let j = 0; j < M; j++) {
      g.fillStyle = cores[Math.floor(r() * cores.length)];
      g.fillRect(i * s, j * s, s, s);
      if (d !== "B" && r() < 0.5) {
        g.fillStyle = "rgba(255,255,255,0.25)";
        for (let k = 0; k < 6; k++) g.fillRect(i * s + 6 + k * 13, j * s + 6, 5, s - 12);
      }
      g.strokeStyle = d === "B" ? "rgba(40,20,10,0.7)" : "rgba(255,240,220,0.7)";
      g.setLineDash(d === "B" ? [] : [6, 5]);
      g.lineWidth = d === "B" ? 3 : 2;
      g.strokeRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
  return tex(c);
}

/** Porta redonda: tábuas verticais pintadas (vermelho-tijolo). */
export function texPorta(d: D) {
  const N = 512;
  const { c, g } = cnv(N, N);
  g.fillStyle = d === "B" ? "#c4452f" : "#a8402e";
  g.fillRect(0, 0, N, N);
  const r = rng(3);
  for (let i = 0; i < 7; i++) {
    const x = (i * N) / 7;
    if (d !== "B") {
      const gr = g.createLinearGradient(x, 0, x + N / 7, 0);
      gr.addColorStop(0, "rgba(0,0,0,0.12)");
      gr.addColorStop(0.5, `rgba(255,255,255,${0.04 + r() * 0.05})`);
      gr.addColorStop(1, "rgba(0,0,0,0.1)");
      g.fillStyle = gr;
      g.fillRect(x, 0, N / 7, N);
    }
    g.fillStyle = d === "B" ? "#7a2414" : "rgba(50,15,8,0.6)";
    g.fillRect(x - 2, 0, 4, N);
  }
  if (d === "A") {
    const img = g.getImageData(0, 0, N, N);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4, x = p % N, y = Math.floor(p / N);
      const v = (fbm(x * 0.02, y * 0.15, 3) - 0.5) * 26;
      img.data[i] += v;
      img.data[i + 1] += v * 0.5;
      img.data[i + 2] += v * 0.4;
    }
    g.putImageData(img, 0, 0);
  }
  return tex(c);
}

/** Pedras arredondadas de muro (frente e muros da toca). */
export function texPedra(d: D) {
  const N = 512;
  const { c, g } = cnv(N, N);
  g.fillStyle = d === "B" ? "#5e5246" : "#4a4038";
  g.fillRect(0, 0, N, N);
  const r = rng(8);
  // pedras de rio: elipses tortas de tamanhos variados, assentadas em fiadas irregulares
  const linhas = 6;
  const tons = d === "B" ? [[196, 186, 168], [176, 160, 140], [206, 196, 178], [166, 150, 128]] : [[168, 158, 142], [150, 136, 118], [182, 170, 150], [138, 126, 112], [160, 146, 120]];
  for (let l = 0; l <= linhas; l++) {
    let x = -r() * 60;
    const yb = (l * N) / linhas + (r() - 0.5) * 10;
    while (x < N + 40) {
      const w = 46 + r() * 70, h = (N / linhas) * (0.72 + r() * 0.3);
      const cx = x + w / 2, cy = yb + (r() - 0.5) * 12;
      const tom = tons[Math.floor(r() * tons.length)];
      const k = 0.88 + r() * 0.2;
      g.save();
      g.translate(cx, cy);
      g.rotate((r() - 0.5) * 0.35);
      g.beginPath();
      const pts = 14;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const rr = 1 + (r() - 0.5) * 0.14;
        const px = Math.cos(a) * (w / 2 - 4) * rr, py = Math.sin(a) * (h / 2 - 4) * rr;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillStyle = `rgb(${tom[0] * k},${tom[1] * k},${tom[2] * k})`;
      g.fill();
      if (d !== "B") {
        const gr = g.createRadialGradient(-w * 0.12, -h * 0.18, 2, 0, 0, w / 2);
        gr.addColorStop(0, "rgba(255,255,255,0.22)");
        gr.addColorStop(0.6, "rgba(255,255,255,0.0)");
        gr.addColorStop(1, "rgba(0,0,0,0.28)");
        g.fillStyle = gr;
        g.fill();
      } else {
        g.strokeStyle = "rgba(40,28,20,0.9)";
        g.lineWidth = 4;
        g.stroke();
      }
      g.restore();
      x += w * (0.92 + r() * 0.12);
    }
  }
  if (d === "A") {
    const img = g.getImageData(0, 0, N, N);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4, x = p % N, y = Math.floor(p / N);
      const v = (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 30;
      img.data[i] += v;
      img.data[i + 1] += v;
      img.data[i + 2] += v;
    }
    g.putImageData(img, 0, 0);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Tapete redondo de anéis. */
export function texTapete(d: D) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const cores = d === "B" ? ["#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#e76f51"] : ["#8c3b2a", "#c8823c", "#e3c18b", "#5f7f6a", "#8c3b2a"];
  for (let i = 0; i < 10; i++) {
    g.fillStyle = cores[i % cores.length];
    g.beginPath();
    g.arc(N / 2, N / 2, (N / 2) * (1 - i / 10), 0, 7);
    g.fill();
  }
  return tex(c);
}

/** Concreto de fôrma (tábuas marcadas). */
export function texConcreto(d: D) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const base = d === "B" ? 196 : d === "C" ? 190 : 176;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const n = d === "B" ? 0 : (fbm(x * 0.02, y * 0.02, 4) - 0.5) * 34 + (fbm(x * 0.3, y * 0.3, 2) - 0.5) * 16;
      const tab = d === "A" && y % 64 < 2 ? -22 : 0;
      const v = base + n + tab;
      const i = (y * N + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v * 0.99;
      img.data[i + 2] = v * 0.95;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Céu da maquete: degradê e nuvens macias pintadas. */
export function texCeuMorro(d: D, chuva = false) {
  const W = 1024, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (chuva) (gr.addColorStop(0, "#4a5260"), gr.addColorStop(0.7, "#7d8590"), gr.addColorStop(1, "#9aa0a6"));
  else if (d === "B") (gr.addColorStop(0, "#4fb8ff"), gr.addColorStop(0.62, "#a9e2ff"), gr.addColorStop(1, "#fff1cf"));
  else if (d === "C") (gr.addColorStop(0, "#86b8e0"), gr.addColorStop(0.6, "#cfe3ec"), gr.addColorStop(1, "#f6e2c4"));
  else (gr.addColorStop(0, "#79a6d6"), gr.addColorStop(0.58, "#c9d9e6"), gr.addColorStop(1, "#ffcf9a"));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  if (d === "A" && !chuva) {
    const img = g.getImageData(0, 0, W, H);
    const r = rng(9);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (r() - 0.5) * 8;
      img.data[i] += v;
      img.data[i + 1] += v;
      img.data[i + 2] += v;
    }
    g.putImageData(img, 0, 0);
  }
  return tex(c);
}

/** Tábuas do piso. */
export function texTabuas(d: D) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const r = rng(31);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const tom = d === "B" ? 0.95 + (i % 2) * 0.08 : 0.82 + r() * 0.3;
    g.fillStyle = `rgb(${Math.round(176 * tom)},${Math.round(118 * tom)},${Math.round(70 * tom)})`;
    g.fillRect(0, (i * N) / n, N, N / n);
    g.fillStyle = d === "B" ? "#5a3215" : "rgba(40,20,8,0.55)";
    g.fillRect(0, (i * N) / n, N, 3);
  }
  if (d !== "B") {
    const img = g.getImageData(0, 0, N, N);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4, x = p % N, y = Math.floor(p / N);
      const v = (fbm(x * 0.01, y * 0.2, 3) - 0.5) * 30;
      img.data[i] += v;
      img.data[i + 1] += v * 0.7;
      img.data[i + 2] += v * 0.5;
    }
    g.putImageData(img, 0, 0);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Régua de 0 a 40 cm (vista de frente, 0 no alto). */
export function texRegua() {
  const W = 160, H = 1024;
  const { c, g } = cnv(W, H);
  g.fillStyle = "#f3e2b3";
  g.fillRect(0, 0, W, H);
  const y0 = 40, y1 = H - 60;
  g.fillStyle = "#2b2118";
  g.font = "bold 44px Arial";
  g.textAlign = "right";
  for (let cm = 0; cm <= 40; cm++) {
    const y = y0 + ((y1 - y0) * cm) / 40;
    const L = cm % 10 === 0 ? 70 : cm % 5 === 0 ? 46 : 28;
    g.fillRect(0, y - 2, L, cm % 10 === 0 ? 5 : 3);
    if (cm % 10 === 0) {
      g.fillStyle = cm === 40 ? "#FF6B2C" : "#2b2118";
      g.fillText(String(cm), W - 10, y + 16);
      g.fillStyle = "#2b2118";
    }
  }
  return tex(c);
}

/** Fumaça e brilho redondo macio (sprite). */
export function texBrilho() {
  const N = 128;
  const { c, g } = cnv(N, N);
  const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, N, N);
  return tex(c);
}
