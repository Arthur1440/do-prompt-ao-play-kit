// Cheiro do esgoto = fumaça de ALGODÃO verde-acinzentado (chumaços 3D que pegam luz e sombra).
// Cada "nuvem" é um fluxo contínuo: os chumaços andam pelo cano (pequenos, cabem no miolo) e, na saída, sobem e incham.
// Onde a água fecha a passagem (fim = "bate"), o chumaço amassa contra a água e se desfaz.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Kit, fbm } from "./kit";
import type { V3 } from "./geo";

export type Nuvem = {
  pts: V3[]; // caminho dentro do cano (pode ser um ponto só: sai direto)
  t0: number; // começa a sair
  some?: number; // começa a se desfazer (desfaz o erro)
  n?: number; // chumaços no fluxo
  periodo?: number; // tempo de cada chumaço do início ao fim
  rCano?: number; // tamanho dentro do cano
  esc?: number; // tamanho ao sair
  alt?: number; // quanto sobe depois de sair
  abre?: number; // quanto espalha para os lados
  fim?: "sai" | "bate";
  seed?: number;
  vento?: V3; // deriva lateral
};

function chumaco(seed: number) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(0.5, 4));
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 2.4 + seed * 3.1, v.y * 2.4 + v.z * 1.9 - seed, 4);
    const lobo = 0.18 * Math.sin(v.x * 7 + seed) * Math.sin(v.y * 6 - seed) * Math.sin(v.z * 5 + seed * 2);
    v.multiplyScalar(0.78 + (n - 0.5) * 0.7 + lobo);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const h = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export class Algodao {
  g = new THREE.Group();
  pool: THREE.Mesh[] = [];
  constructor(k: Kit, N = 220) {
    const geos = [1, 2, 3].map((s) => chumaco(s));
    const cores = [0x8c9f80, 0x98a98b, 0x7d9173, 0xa3b096];
    const mats = cores.map((c) => { const m = k.mat({ color: c, rough: 1, clear: 0, bumpS: 0.4, tipo: "cheiro" }) as THREE.MeshPhysicalMaterial; m.roughness = 1; m.clearcoat = 0; m.sheen = 0.5; m.sheenColor = new THREE.Color(0xe8f2dc); m.sheenRoughness = 0.8; return m; });
    for (let i = 0; i < N; i++) {
      const me = new THREE.Mesh(geos[i % 3], mats[i % 4]);
      me.castShadow = true;
      me.receiveShadow = true;
      me.visible = false;
      me.rotation.set(h(i, 1) * 6, h(i, 2) * 6, h(i, 3) * 6);
      k.contorno(me, 2);
      this.g.add(me);
      this.pool.push(me);
    }
  }

  aplica(nuvens: Nuvem[] | undefined, t: number) {
    let j = 0;
    for (const nv of nuvens ?? []) {
      if (t < nv.t0) continue;
      const n = nv.n ?? 24, per = nv.periodo ?? 2.2, rC = nv.rCano ?? 0.012, esc = nv.esc ?? 0.06, alt = nv.alt ?? 0.35, abre = nv.abre ?? 0.12, seed = nv.seed ?? 1;
      const vento = nv.vento ?? [0, 0, 0];
      const pts = nv.pts.map((p) => new THREE.Vector3(...p));
      // comprimento do caminho
      const segs: number[] = [];
      let L = 0;
      for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); segs.push(d); L += d; }
      const fCano = nv.fim === "bate" ? 1 : L / (L + alt * 0.8 + 1e-6);
      const desf = nv.some !== undefined ? Math.min(1, Math.max(0, (t - nv.some) / 0.5)) : 0;
      if (desf >= 1) continue;
      for (let i = 0; i < n && j < this.pool.length; i++) {
        const atraso = (i / n) * per;
        if (t - nv.t0 < atraso) continue;
        const ph = ((t - nv.t0 - atraso) / per) % 1; // 0..1 vida do chumaço
        const me = this.pool[j++];
        const r1 = h(i, seed), r2 = h(i, seed + 7), r3 = h(i, seed + 13);
        let pos: THREE.Vector3, s: number;
        if (ph < fCano && L > 0) {
          // dentro do cano
          let d = (ph / fCano) * L, k = 0;
          while (k < segs.length - 1 && d > segs[k]) { d -= segs[k]; k++; }
          pos = pts[k].clone().lerp(pts[k + 1], Math.min(1, d / segs[k]));
          s = rC * (0.7 + 0.5 * r1);
          if (nv.fim === "bate") {
            const fim = Math.max(0, (ph - 0.9) / 0.1); // amassa contra a água e some
            s *= 1 - fim;
            pos.addScaledVector(pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize(), -fim * rC * 0.6);
          }
        } else {
          // saiu: sobe, incha e espalha
          const u = L > 0 ? (ph - fCano) / (1 - fCano) : ph;
          const a = r2 * Math.PI * 2;
          const sp = abre * Math.sqrt(u) * (0.4 + 0.6 * r3);
          pos = pts[pts.length - 1].clone().add(new THREE.Vector3(Math.cos(a) * sp + vento[0] * u, alt * (1 - Math.pow(1 - u, 1.6)) + vento[1] * u, Math.sin(a) * sp + vento[2] * u));
          pos.x += Math.sin(t * 1.3 + i) * 0.006 * u;
          const cresce = Math.min(1, u * 3);
          const sai = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
          s = (rC + (esc - rC) * cresce) * (0.75 + 0.5 * r1) * sai;
        }
        s *= 1 - desf * desf;
        me.visible = s > 0.0006;
        me.position.copy(pos);
        me.scale.setScalar(Math.max(s, 0.0001) * 2);
        me.rotation.y = h(i, 4) * 6 + t * 0.3 * (r2 - 0.5);
      }
    }
    for (; j < this.pool.length; j++) this.pool[j].visible = false;
  }
}
