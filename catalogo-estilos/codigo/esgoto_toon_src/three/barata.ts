// Barata em miniatura realista (marrom brilhante, do tamanho de uma peça da maquete). Sem rosto: o humor vem do andar.
import * as THREE from "three";
import { Kit, esfera, cil } from "./kit";
import type { V3 } from "./geo";

export type EstadoBarata = { vis?: boolean; pos: V3; rotY?: number; incl?: number; rolo?: number; anda?: number; esc?: number; antena?: number };

export class Barata {
  g = new THREE.Group();
  corpo = new THREE.Group();
  pernas: { g: THREE.Group; tib: THREE.Group; lado: number; i: number }[] = [];
  antenas: THREE.Group[] = [];
  constructor(k: Kit) {
    const casca = k.mat({ color: 0x5e2a10, rough: 0.22, clear: 1, liso: true, tipo: "praga" });
    const asa = k.mat({ color: 0x7a3a18, rough: 0.18, clear: 1, liso: true, tipo: "praga" });
    const escura = k.mat({ color: 0x2a1308, rough: 0.3, clear: 0.9, liso: true, tipo: "praga" });
    const borda = k.mat({ color: 0xa8743e, rough: 0.3, clear: 0.8, liso: true, tipo: "praga" });
    const perna = k.mat({ color: 0x4a2410, rough: 0.35, clear: 0.6, liso: true, tipo: "praga" });
    const pxAnt = k.pxPadrao;
    k.pxPadrao = 1.1;
    const c = this.corpo;
    this.g.add(c);
    c.position.y = 0.0075;
    k.m(esfera(1, 28, 16), casca, 0, c, [0, 0.0, -0.006], [0, 0, 0], [0.0165, 0.0058, 0.024]); // abdômen
    for (const s of [1, -1]) k.m(esfera(1, 24, 14), asa, 0, c, [s * 0.0052, 0.0034, -0.006], [0, s * 0.06, s * -0.08], [0.0098, 0.0028, 0.0245]); // asas
    k.m(esfera(1, 24, 14), borda, 0, c, [0, 0.0028, 0.0165], [0, 0, 0], [0.0152, 0.0032, 0.0112]); // pronoto (borda clara)
    k.m(esfera(1, 24, 14), escura, 0, c, [0, 0.0042, 0.0158], [0, 0, 0], [0.0108, 0.0028, 0.0082]); // mancha escura do pronoto
    k.m(esfera(1, 16, 12), escura, 0, c, [0, -0.0012, 0.0255], [0.3, 0, 0], [0.0058, 0.0045, 0.0052]); // cabeça (embaixo do pronoto)
    for (const s of [1, -1]) k.m(cil(0.0012, 0.0002, 0.008, 6), perna, 0, c, [s * 0.003, -0.0005, -0.031], [-1.35, 0, s * 0.25]); // cercos
    // antenas: longas, finas, curvas
    for (const s of [1, -1]) {
      const a = new THREE.Group();
      a.position.set(s * 0.0022, 0.0004, 0.029);
      c.add(a);
      const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(s * 0.006, 0.004, 0.018), new THREE.Vector3(s * 0.016, 0.006, 0.038), new THREE.Vector3(s * 0.028, 0.003, 0.054)]);
      k.m(new THREE.TubeGeometry(curva, 24, 0.00055, 5, false), perna, 0, a);
      this.antenas.push(a);
    }
    // patas: 3 pares (fêmur + tíbia com espinhos)
    const zs = [0.012, 0.0, -0.011];
    for (let i = 0; i < 3; i++) for (const s of [1, -1]) {
      const p = new THREE.Group();
      p.position.set(s * 0.0065, -0.0015, zs[i]);
      c.add(p);
      const femur = new THREE.Group();
      femur.rotation.set(0, s * (i === 0 ? -0.5 : i === 1 ? 0.0 : 0.55), s * -0.35);
      p.add(femur);
      const Lf = i === 2 ? 0.016 : 0.012;
      k.m(cil(0.0013, 0.001, Lf, 6), perna, 0, femur, [s * Lf / 2, 0, 0], [0, 0, Math.PI / 2]);
      const tib = new THREE.Group();
      tib.position.set(s * Lf, 0, 0);
      tib.rotation.set(0, 0, s * -0.9);
      femur.add(tib);
      const Lt = i === 2 ? 0.022 : 0.016;
      k.m(cil(0.0009, 0.0005, Lt, 6), perna, 0, tib, [s * Lt / 2, 0, 0], [0, 0, Math.PI / 2]);
      for (let e = 1; e <= 3; e++) k.m(cil(0.0003, 0.0001, 0.0025, 4), perna, 0, tib, [s * Lt * e / 4, -0.0008, 0], [0, 0, s * 0.6]);
      this.pernas.push({ g: femur, tib, lado: s, i });
    }
    this.g.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.receiveShadow = true; } });
    k.pxPadrao = pxAnt;
  }

  aplica(e: EstadoBarata | undefined, t: number) {
    this.g.visible = !!e && e.vis !== false;
    if (!e || !this.g.visible) return;
    this.g.position.set(...e.pos);
    this.g.rotation.set(e.incl ?? 0, e.rotY ?? 0, e.rolo ?? 0, "YXZ");
    this.g.scale.setScalar(e.esc ?? 1);
    const f = e.anda ?? 0;
    // marcha em tripé: (frente E, meio D, trás E) alterna com o outro trio
    for (const p of this.pernas) {
      const grupo = (p.i === 1 ? -p.lado : p.lado) > 0 ? 0 : Math.PI;
      const ph = f * Math.PI * 2 + grupo;
      const base = p.lado * (p.i === 0 ? -0.5 : p.i === 1 ? 0.0 : 0.55);
      p.g.rotation.y = base + Math.sin(ph) * 0.38 * p.lado;
      p.g.rotation.z = p.lado * (-0.35 - Math.max(0, Math.cos(ph)) * 0.25);
    }
    this.corpo.position.y = 0.0075 + Math.abs(Math.sin(f * Math.PI * 2)) * 0.0006;
    const an = e.antena ?? 1;
    this.antenas.forEach((a, i) => { a.rotation.set(Math.sin(t * 5.3 + i * 2) * 0.15 * an, Math.sin(t * 3.7 + i) * 0.25 * an, 0); });
  }
}
