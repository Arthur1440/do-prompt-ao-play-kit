// Concreto em movimento: jato saindo do balde (tubo reconstruído por quadro), monte que cresce no chão,
// "bolas" que caem e achatam em cima do que estiver embaixo, respingos balísticos.
import * as THREE from "three";
import { Kit, V3, esfera } from "./kit";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm } from "./kit";

export type EstadoJato = { vis?: boolean; p0: V3; p1: V3; cabeca: number; cauda: number; larg?: number };
export type EstadoMonte = { vis?: boolean; p: V3; r: number; h: number };
export type EstadoBola = { vis?: boolean; p: V3; r: number; achata?: number; giro?: number };
export type EstadoRespingo = { vis?: boolean; p: V3; k: number; forca?: number };

/** malha de "gosma": esfera com relevo de fbm (pré-calculado) */
function gosma(r: number, seed: number) {
  const g0 = new THREE.IcosahedronGeometry(r, 5);
  g0.deleteAttribute("normal"); g0.deleteAttribute("uv");
  const g = mergeVertices(g0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const n = fbm(v.x * 3 + seed, v.z * 3 + v.y * 2 + seed * 2, 3);
    v.multiplyScalar(1 + (n - 0.5) * 0.28);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export class Concreto {
  g = new THREE.Group();
  jatos: { me: THREE.Mesh; contorno?: THREE.Mesh }[] = [];
  montes: THREE.Mesh[] = [];
  bolas: THREE.Mesh[] = [];
  respingos: THREE.InstancedMesh;
  resDados: { v: THREE.Vector3; s: number }[] = [];
  mat: THREE.Material;
  constructor(public k: Kit) {
    const d = k.dir;
    this.mat = k.mat({ color: d === "B" ? "#A3A19B" : "#86847E", rough: d === "A" ? 0.22 : 0.5, clear: d === "A" ? 0.85 : 0.2 });
    for (let i = 0; i < 2; i++) {
      const me = k.m(new THREE.BufferGeometry(), this.mat, 3, this.g, undefined, undefined, undefined, false);
      me.frustumCulled = false;
      const c = me.children.find((o) => o.userData.contorno) as THREE.Mesh | undefined;
      this.jatos.push({ me, contorno: c });
    }
    for (let i = 0; i < 3; i++) {
      // monte: meia gosma achatada
      const geo = gosma(1, i * 3.3);
      const me = k.m(geo, this.mat, 3, this.g, undefined, undefined, undefined, false);
      this.montes.push(me);
    }
    for (let i = 0; i < 4; i++) this.bolas.push(k.m(gosma(1, 10 + i * 2.1), this.mat, 3, this.g, undefined, undefined, undefined, false));
    const nR = 26;
    this.respingos = new THREE.InstancedMesh(esfera(1, 10, 8), this.mat, nR);
    this.respingos.castShadow = true;
    this.respingos.frustumCulled = false;
    k.contorno(this.respingos, 2);
    for (let i = 0; i < nR; i++) {
      const a = (i / nR) * Math.PI * 2 + Math.sin(i * 3.1) * 0.3;
      const el = 0.6 + ((i * 37) % 10) / 10 * 0.7;
      this.resDados.push({ v: new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el) * 1.3, Math.sin(a) * Math.cos(el)), s: 0.02 + ((i * 13) % 7) * 0.006 });
    }
    this.g.add(this.respingos);
  }

  aplica(o: { jatos?: EstadoJato[]; montes?: EstadoMonte[]; bolas?: EstadoBola[]; respingos?: EstadoRespingo }, t: number) {
    const js = o.jatos ?? [];
    this.jatos.forEach((j, i) => {
      const e = js[i];
      j.me.visible = !!e && e.vis !== false && e.cabeca > e.cauda + 0.01;
      if (!j.me.visible || !e) return;
      const geo = jatoGeo(e, t);
      j.me.geometry.dispose();
      j.me.geometry = geo;
      if (j.contorno) j.contorno.geometry = geo;
    });
    const ms = o.montes ?? [];
    this.montes.forEach((m, i) => {
      const e = ms[i];
      m.visible = !!e && e.vis !== false && e.r > 0.005;
      if (!m.visible || !e) return;
      m.position.set(e.p[0], e.p[1], e.p[2]);
      m.scale.set(e.r, e.h, e.r * 0.9);
      m.rotation.y = i * 1.3;
    });
    const bs = o.bolas ?? [];
    this.bolas.forEach((b, i) => {
      const e = bs[i];
      b.visible = !!e && e.vis !== false && e.r > 0.005;
      if (!b.visible || !e) return;
      const a = e.achata ?? 0;
      b.position.set(e.p[0], e.p[1], e.p[2]);
      b.scale.set(e.r * (1 + 0.7 * a), e.r * (1 - 0.6 * a) * (1 + 0.1 * Math.sin(t * 20) * (1 - a)), e.r * (1 + 0.7 * a));
      b.rotation.y = (e.giro ?? 0) + i;
    });
    const r = o.respingos;
    this.respingos.visible = !!r && r.vis !== false && r.k > 0.001 && r.k < 0.999;
    if (this.respingos.visible && r) {
      const ob = new THREE.Object3D();
      const f = r.forca ?? 1;
      this.resDados.forEach((q, i) => {
        const tt = r.k * 0.9;
        ob.position.set(r.p[0] + q.v.x * tt * 0.9 * f, r.p[1] + (q.v.y * tt - 2.4 * tt * tt) * f, r.p[2] + q.v.z * tt * 0.9 * f);
        ob.scale.setScalar(q.s * (1 - r.k * 0.5));
        ob.updateMatrix();
        this.respingos.setMatrixAt(i, ob.matrix);
      });
      this.respingos.instanceMatrix.needsUpdate = true;
    }
  }
}

/** jato: curva do bico do balde (p0) caindo até p1; cabeca/cauda = trecho existente (0..1); gotas engrossam na ponta */
function jatoGeo(e: EstadoJato, t: number) {
  const [x0, y0, z0] = e.p0, [x1, y1, z1] = e.p1;
  const pts: THREE.Vector3[] = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const u = e.cauda + (e.cabeca - e.cauda) * (i / N);
    // parábola: sai para a frente e cai
    const x = x0 + (x1 - x0) * Math.sqrt(u), z = z0 + (z1 - z0) * Math.sqrt(u);
    const y = y0 + (y1 - y0) * u * u * 0.6 + (y1 - y0) * u * 0.4;
    const w = Math.sin(u * 14 - t * 9) * 0.012;
    pts.push(new THREE.Vector3(x + w, y, z + w * 0.7));
  }
  const curva = new THREE.CatmullRomCurve3(pts);
  const seg = 40, rad = 12;
  const g = new THREE.TubeGeometry(curva, seg, 1, rad, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const L = e.larg ?? 1;
  for (let i = 0; i <= seg; i++) {
    const s = i / seg;
    const c = curva.getPointAt(s);
    const u = e.cauda + (e.cabeca - e.cauda) * s;
    let r = (0.05 + 0.025 * u) * L * (1 + 0.18 * Math.sin(u * 22 - t * 14));
    if (s < 0.06) r *= s / 0.06 * 0.7 + 0.3; // afina na cauda
    if (s > 0.92) r *= 1.15; // ponta gorda
    for (let j = 0; j <= rad; j++) {
      const kk = i * (rad + 1) + j;
      const v = new THREE.Vector3(pos.getX(kk), pos.getY(kk), pos.getZ(kk)).sub(c);
      v.normalize().multiplyScalar(r).add(c);
      pos.setXYZ(kk, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}
