import * as THREE from "three";
import { fbm, rng } from "./rng";
import { cnv, tex } from "./tex";

type D = "A" | "B" | "C";

/** Fibra de papel (bump do papercraft): manchas longas e finas. */
export function texPapel(seed = 21) {
  const N = 512;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const v = 128 + (fbm(x * 0.05, y * 0.012, 3) - 0.5) * 60 + (fbm(x * 0.4, y * 0.4, 2) - 0.5) * 30 + (r() - 0.5) * 14;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/** Grama do tabuleiro: A = flocado de maquete; B = chapada; C = papel verde. */
export function texGrama(d: D) {
  const N = 1024;
  const { c, g } = cnv(N, N);
  const img = g.createImageData(N, N);
  const r = rng(77);
  const base = d === "A" ? [92, 150, 62] : d === "B" ? [118, 196, 74] : [112, 178, 84];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const n = fbm(x * 0.006, y * 0.006, 4);
      const f = d === "A" ? 0.78 + (n - 0.5) * 0.5 + (r() - 0.5) * 0.22 : d === "B" ? (n > 0.56 ? 0.9 : 1.0) : 0.92 + (n - 0.5) * 0.18 + (r() - 0.5) * 0.04;
      const i = (y * N + x) * 4;
      img.data[i] = base[0] * f;
      img.data[i + 1] = base[1] * f;
      img.data[i + 2] = base[2] * f;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Corte lateral do tabuleiro: camadas de terra com a grama em cima. */
export function texCorte(d: D) {
  const W = 1024, H = 256;
  const { c, g } = cnv(W, H);
  const cores = d === "B" ? ["#7ac74f", "#a8643a", "#8a4f2c", "#6b3b20"] : d === "C" ? ["#86ad5f", "#b07a4f", "#9a6542", "#7d5034"] : ["#5d8f3e", "#8a5a36", "#74482a", "#5a361f"];
  const lim = [0, 0.13, 0.42, 0.72, 1];
  for (let k = 0; k < 4; k++) {
    g.fillStyle = cores[k];
    g.beginPath();
    g.moveTo(0, lim[k] * H);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, lim[k] * H + (k ? Math.sin(x * 0.02 + k) * 6 + (fbm(x * 0.01, k) - 0.5) * 12 : 0));
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
  }
  if (d !== "B") {
    const r = rng(5);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(40,25,15,${0.15 + r() * 0.2})` : `rgba(200,170,130,${0.15 + r() * 0.2})`;
      g.beginPath();
      g.arc(r() * W, H * (0.2 + r() * 0.8), 1 + r() * 4, 0, 7);
      g.fill();
    }
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Telhado de barro: fileiras de telhas. */
export function texTelha(d: D) {
  const N = 512;
  const { c, g } = cnv(N, N);
  g.fillStyle = d === "B" ? "#e0623a" : d === "C" ? "#c8673f" : "#b9532f";
  g.fillRect(0, 0, N, N);
  const linhas = 8, cols = 10;
  const k = d === "B" ? 0.6 : 1;
  for (let j = 0; j < linhas; j++)
    for (let i = 0; i < cols; i++) {
      const x = i * (N / cols), y = j * (N / linhas);
      const gr = g.createLinearGradient(x, 0, x + N / cols, 0);
      gr.addColorStop(0, `rgba(0,0,0,${0.18 * k})`);
      gr.addColorStop(0.5, `rgba(255,220,180,${d === "B" ? 0 : 0.18})`);
      gr.addColorStop(1, `rgba(0,0,0,${0.22 * k})`);
      g.fillStyle = gr;
      g.fillRect(x, y, N / cols, N / linhas);
      g.fillStyle = "rgba(60,20,10,0.35)";
      g.fillRect(x, y + N / linhas - 5, N / cols, 5);
    }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Nota de dinheiro genérica (não reproduz cédula real): moldura, círculo e "R$". */
export function texNota(cor = "#3f8f6b") {
  const W = 512, H = 240;
  const { c, g } = cnv(W, H);
  g.fillStyle = cor;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 8;
  g.strokeRect(14, 14, W - 28, H - 28);
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath();
  g.arc(W * 0.7, H / 2, 70, 0, 7);
  g.fill();
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `rgba(255,255,255,${0.08 + (i % 2) * 0.06})`;
    g.fillRect(40, 40 + i * 18, 170, 6);
  }
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = "bold 80px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("R$", W * 0.7, H / 2 + 4);
  return tex(c);
}

/** Céu do fundo (A: tela pintada; B: chapado; C: papel). */
export function texCeu(d: D, noite: boolean) {
  const W = 1024, H = 1024;
  const { c, g } = cnv(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (!noite) {
    if (d === "B") (gr.addColorStop(0, "#5ec8ff"), gr.addColorStop(0.7, "#bfeaff"), gr.addColorStop(1, "#fff4d6"));
    else if (d === "C") (gr.addColorStop(0, "#8fbfdc"), gr.addColorStop(0.7, "#d6e6e8"), gr.addColorStop(1, "#f3e3c6"));
    else (gr.addColorStop(0, "#7fa9d8"), gr.addColorStop(0.62, "#f2c58f"), gr.addColorStop(1, "#ffb072"));
  } else {
    gr.addColorStop(0, d === "B" ? "#141a4d" : "#070b22");
    gr.addColorStop(0.75, d === "B" ? "#2c3a8f" : "#16204a");
    gr.addColorStop(1, d === "B" ? "#5a4f9e" : "#2c2c5a");
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  if (noite) {
    const r = rng(31);
    for (let i = 0; i < 420; i++) {
      const x = r() * W, y = r() * H * 0.8, s = r() < 0.08 ? 2.6 : 1 + r();
      g.fillStyle = `rgba(255,${Math.round(240 + r() * 15)},${Math.round(210 + r() * 40)},${0.5 + r() * 0.5})`;
      if (d !== "A" && s > 2) {
        // estrela recortada (papel) ou de desenho (toon)
        g.save();
        g.translate(x, y);
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2, rr = k % 2 ? 4 : 10;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.fill();
        g.restore();
      } else {
        g.beginPath();
        g.arc(x, y, s, 0, 7);
        g.fill();
      }
    }
  }
  if (d === "A") {
    const img = g.getImageData(0, 0, W, H);
    const r = rng(9);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (r() - 0.5) * 10;
      img.data[i] += v;
      img.data[i + 1] += v;
      img.data[i + 2] += v;
    }
    g.putImageData(img, 0, 0);
  }
  return tex(c);
}

/** Tela do notebook: chamada de vídeo com quadradinhos (pessoas genéricas, sem rosto). */
export function texChamada() {
  const W = 640, H = 400;
  const { c, g } = cnv(W, H);
  g.fillStyle = "#1b1f2e";
  g.fillRect(0, 0, W, H);
  const cores = ["#3d6fd6", "#e07a4f", "#4fbf8f", "#c65fb0", "#e8b43a", "#5ab3d6"];
  const cw = (W - 40) / 3, ch = (H - 70) / 2;
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 3; i++) {
      const x = 10 + i * (cw + 10), y = 10 + j * (ch + 10);
      g.fillStyle = cores[(i + j * 3) % 6];
      g.fillRect(x, y, cw, ch);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x, y + ch * 0.55, cw, ch * 0.45);
      g.fillStyle = "rgba(20,20,30,0.55)";
      g.beginPath();
      g.arc(x + cw / 2, y + ch * 0.42, ch * 0.17, 0, 7);
      g.fill();
      g.beginPath();
      g.ellipse(x + cw / 2, y + ch * 0.98, ch * 0.32, ch * 0.3, 0, Math.PI, 0);
      g.fill();
    }
  g.fillStyle = "#2a3045";
  g.fillRect(0, H - 50, W, 50);
  g.fillStyle = "#ff4b3e";
  g.beginPath();
  g.arc(W / 2, H - 25, 15, 0, 7);
  g.fill();
  return tex(c);
}

/** Tela do celular carregando (raio e barra). */
export function texCelular() {
  const W = 200, H = 400;
  const { c, g } = cnv(W, H);
  g.fillStyle = "#0e1424";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "#3ee07a";
  g.lineWidth = 10;
  g.strokeRect(55, 120, 90, 160);
  g.fillStyle = "#3ee07a";
  g.fillRect(85, 106, 30, 14);
  g.fillRect(67, 200, 66, 68);
  g.fillStyle = "#0e1424";
  g.beginPath();
  g.moveTo(108, 205);
  g.lineTo(84, 240);
  g.lineTo(100, 240);
  g.lineTo(92, 265);
  g.lineTo(118, 228);
  g.lineTo(102, 228);
  g.fill();
  return tex(c);
}

/** Bateria: rótulo lateral com o raio laranja. */
export function texRotuloBateria() {
  const W = 256, H = 384;
  const { c, g } = cnv(W, H);
  g.fillStyle = "#2b2f38";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#3a3f4b";
  g.fillRect(16, 16, W - 32, H - 32);
  g.fillStyle = "#FF6B2C";
  g.beginPath();
  g.moveTo(150, 60);
  g.lineTo(80, 200);
  g.lineTo(130, 200);
  g.lineTo(105, 320);
  g.lineTo(185, 165);
  g.lineTo(135, 165);
  g.closePath();
  g.fill();
  return tex(c);
}
