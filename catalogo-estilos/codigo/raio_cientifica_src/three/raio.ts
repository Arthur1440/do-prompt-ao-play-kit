import * as THREE from "three";
import { rng } from "./rng";
import type { V3 } from "./kit";

// Raio ASCENDENTE: nasce na ponta (origem) e sobe; os galhos abrem PARA CIMA, em direção à nuvem.
// Cada nó guarda "d" = distância percorrida desde a origem; o crescimento revela os nós com d <= p * comp.
export type No = { p: THREE.Vector3; d: number; r: number };
export type Ramo = { nos: No[]; nivel: number };
export type Raio = { ramos: Ramo[]; comp: number; topo: THREE.Vector3 };

export function gerarRaio(seed: number, origem: V3, yFim: number, o: { desvioX?: number; galhos?: number; esc?: number } = {}): Raio {
  const r = rng(seed * 7919 + 13);
  const esc = o.esc ?? 1;
  const ramos: Ramo[] = [];
  const alvoX = (o.desvioX ?? (r() - 0.5) * 16) + origem[0];
  const alvoZ = (r() - 0.5) * 8 + origem[2];
  // canal principal
  const prin: No[] = [{ p: new THREE.Vector3(...origem), d: 0, r: 0.13 * esc }];
  let p = prin[0].p.clone();
  let d = 0;
  let lat = new THREE.Vector3((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6);
  while (p.y < yFim) {
    const falta = yFim - p.y;
    const passo = (0.7 + r() * 1.1) * esc;
    lat.x = lat.x * 0.55 + (r() - 0.5) * 1.3;
    lat.z = lat.z * 0.55 + (r() - 0.5) * 1.0;
    const puxa = new THREE.Vector3((alvoX - p.x) / Math.max(falta, 4), 0, (alvoZ - p.z) / Math.max(falta, 4));
    const dir = new THREE.Vector3(lat.x * 0.75 + puxa.x * 1.5, 1, lat.z * 0.75 + puxa.z * 1.5).normalize();
    const q = p.clone().addScaledVector(dir, passo);
    d += passo;
    prin.push({ p: q, d, r: 0.13 * esc });
    p = q;
  }
  const comp = d;
  ramos.push({ nos: prin, nivel: 0 });
  // galhos: saem do canal e sobem abrindo para os lados
  const nG = o.galhos ?? 1;
  const galho = (pai: No[], i0: number, nivel: number) => {
    const base = pai[i0];
    const lado = r() < 0.5 ? -1 : 1;
    const ang = r() * Math.PI * 2;
    const ab = 0.55 + r() * 0.75; // quanto abre para o lado
    const nos: No[] = [{ p: base.p.clone(), d: base.d, r: base.r * 0.55 }];
    let q = base.p.clone();
    let dd = base.d;
    const passos = Math.floor((nivel === 1 ? 5 : 3) + r() * (nivel === 1 ? 10 : 5));
    let lx = Math.cos(ang) * ab * lado, lz = Math.sin(ang) * ab * 0.6;
    for (let k = 0; k < passos; k++) {
      const passo = (0.6 + r() * 0.9) * esc * (nivel === 1 ? 1 : 0.8);
      lx += (r() - 0.5) * 0.6;
      lz += (r() - 0.5) * 0.4;
      const dir = new THREE.Vector3(lx, 0.8 + r() * 0.5, lz).normalize();
      q = q.clone().addScaledVector(dir, passo);
      if (q.y > yFim + 1) break;
      dd += passo * 1.05; // o galho cresce um pouco mais devagar que o canal
      nos.push({ p: q, d: dd, r: 0 });
    }
    if (nos.length < 2) return;
    // afina até a ponta
    const n = nos.length;
    nos.forEach((no, k) => (no.r = (nivel === 1 ? 0.065 : 0.038) * esc * (1 - (k / n) * 0.75)));
    ramos.push({ nos, nivel });
    if (nivel < 2)
      for (let k = 2; k < nos.length - 1; k++) if (r() < 0.3 * nG) galho(nos, k, nivel + 1);
  };
  for (let i = 2; i < prin.length - 2; i++) if (r() < 0.42 * nG) galho(prin, i, 1);
  // afina o canal principal no fim (encontra a nuvem)
  prin.forEach((no, k) => (no.r = 0.13 * esc * (1 - (k / prin.length) * 0.35)));
  return { ramos, comp, topo: prin[prin.length - 1].p.clone() };
}

// Pontas que estão crescendo agora (para o brilho do líder).
export function pontas(R: Raio, p: number): THREE.Vector3[] {
  const L = p * R.comp;
  const out: THREE.Vector3[] = [];
  for (const ramo of R.ramos) {
    const nos = ramo.nos;
    if (nos[0].d > L) continue;
    if (nos[nos.length - 1].d <= L) continue; // já terminou
    for (let k = 1; k < nos.length; k++)
      if (nos[k].d > L) {
        const a = nos[k - 1], b = nos[k];
        out.push(a.p.clone().lerp(b.p, (L - a.d) / (b.d - a.d)));
        break;
      }
  }
  return out;
}

// Geometria do raio até o progresso p (0..1): um tubo contínuo por ramo (6 lados),
// anéis com tangente média nos nós (sem buracos nas dobras). mult engrossa (halo).
export function geoRaio(R: Raio, p: number, mult = 1, lados = 6): THREE.BufferGeometry {
  const L = p * R.comp;
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const tmp = new THREE.Vector3(), up = new THREE.Vector3(), a1 = new THREE.Vector3(), a2 = new THREE.Vector3();
  for (const ramo of R.ramos) {
    const nos = ramo.nos;
    if (nos[0].d >= L) continue;
    const pts: { p: THREE.Vector3; r: number }[] = [];
    for (let k = 0; k < nos.length; k++) {
      if (nos[k].d <= L) pts.push({ p: nos[k].p, r: nos[k].r });
      else {
        const a = nos[k - 1], b = nos[k];
        const f = (L - a.d) / (b.d - a.d);
        pts.push({ p: a.p.clone().lerp(b.p, f), r: 0.0 });
        break;
      }
    }
    if (pts.length < 2) continue;
    // ponta do líder afina até zero; ramo completo fecha fino
    const v0 = pos.length / 3;
    for (let k = 0; k < pts.length; k++) {
      const prev = pts[Math.max(0, k - 1)].p, next = pts[Math.min(pts.length - 1, k + 1)].p;
      const t = tmp.copy(next).sub(prev).normalize();
      up.set(0, 0, 1);
      if (Math.abs(t.z) > 0.9) up.set(1, 0, 0);
      a1.crossVectors(t, up).normalize();
      a2.crossVectors(t, a1).normalize();
      const rr = Math.max(pts[k].r, 0.004) * mult;
      for (let j = 0; j < lados; j++) {
        const ang = (j / lados) * Math.PI * 2;
        const nx = a1.x * Math.cos(ang) + a2.x * Math.sin(ang);
        const ny = a1.y * Math.cos(ang) + a2.y * Math.sin(ang);
        const nz = a1.z * Math.cos(ang) + a2.z * Math.sin(ang);
        pos.push(pts[k].p.x + nx * rr, pts[k].p.y + ny * rr, pts[k].p.z + nz * rr);
        nor.push(nx, ny, nz);
      }
    }
    for (let k = 0; k < pts.length - 1; k++)
      for (let j = 0; j < lados; j++) {
        const a = v0 + k * lados + j, b = v0 + k * lados + ((j + 1) % lados);
        const c = a + lados, d = b + lados;
        idx.push(a, b, c, b, d, c); // faces para fora (o contorno usa o lado de trás)
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
