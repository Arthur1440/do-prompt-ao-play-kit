// Virada "feito com IA": o forno congela e vira arame laranja (#FF6B2C) + partículas sobre azul-tinta.
// Varredura: o plano de corte anda da esquerda para a direita; o sólido fica de um lado, o arame do outro.
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { rng } from "./rng";

export class Virada {
  g = new THREE.Group();
  part: THREE.Points;
  base: Float32Array;
  sem: Float32Array;
  matL: LineMaterial;
  centro = new THREE.Vector3();
  planoArame = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); // mantém x < c
  planoSolido = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0); // mantém x > c
  xMin = 0;
  xMax = 0;
  constructor(alvos: THREE.Object3D[], centro: THREE.Vector3, W: number, H: number) {
    this.centro.copy(centro);
    const seg: number[] = [];
    for (const alvo of alvos) {
    alvo.updateMatrixWorld(true);
    alvo.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || o.userData.contorno || o.userData.semProf || o.userData.estencil || o.userData.semArame) return;
      const mat0 = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
      if (mat0 && (mat0 as THREE.MeshBasicMaterial).colorWrite === false) return;
      let vis = true;
      o.traverseAncestors((a) => { if (!a.visible) vis = false; });
      if (!vis || !o.visible) return;
      const geo = m.geometry as THREE.BufferGeometry;
      if (!geo.getAttribute("position")) return;
      let e = new THREE.EdgesGeometry(geo, 25);
      // superfície curva lisa (esfera, cápsula): poucas arestas duras -> usa as linhas da malha (latitude/longitude)
      if (e.getAttribute("position").count < 24) e = new THREE.EdgesGeometry(geo, 4);
      if (e.getAttribute("position").count < 12) {
        // RoundedBoxGeometry não gera arestas: usa a caixa equivalente
        geo.computeBoundingBox();
        const bb = geo.boundingBox!, sz = new THREE.Vector3(), c = new THREE.Vector3();
        bb.getSize(sz);
        bb.getCenter(c);
        e = new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x, sz.y, sz.z).translate(c.x, c.y, c.z));
      }
      e.applyMatrix4(m.matrixWorld);
      const p = e.getAttribute("position");
      for (let i = 0; i < p.count; i++) seg.push(p.getX(i), p.getY(i), p.getZ(i));
    });
    }
    const lg = new LineSegmentsGeometry();
    lg.setPositions(seg);
    this.matL = new LineMaterial({ color: new THREE.Color(0xff6b2c).multiplyScalar(1.7).getHex(), linewidth: 2.4, worldUnits: false, transparent: true, toneMapped: false });
    this.matL.color = new THREE.Color(0xff6b2c).multiplyScalar(1.7);
    this.matL.resolution.set(W, H);
    this.matL.clippingPlanes = [this.planoArame];
    const ls = new LineSegments2(lg, this.matL);
    ls.computeLineDistances();
    ls.frustumCulled = false;
    this.g.add(ls);
    // partículas nascem nas arestas
    const R = rng(4);
    const n = 9000;
    this.base = new Float32Array(n * 3);
    this.sem = new Float32Array(n);
    let xmin = 1e9, xmax = -1e9;
    const nSeg = seg.length / 6;
    for (let i = 0; i < n; i++) {
      const k = Math.floor(R.r() * nSeg) * 6, u = R.r();
      const x = seg[k] + (seg[k + 3] - seg[k]) * u, y = seg[k + 1] + (seg[k + 4] - seg[k + 1]) * u, z = seg[k + 2] + (seg[k + 5] - seg[k + 2]) * u;
      this.base.set([x, y, z], i * 3);
      this.sem[i] = R.r();
      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);
    }
    this.xMin = xmin - 0.05;
    this.xMax = xmax + 0.05;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.base.slice(), 3));
    this.part = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: new THREE.Color(0xffa060).multiplyScalar(1.5), size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.part.frustumCulled = false;
    (this.part.material as THREE.PointsMaterial).clippingPlanes = [this.planoArame];
    this.g.add(this.part);
  }
  /** x do corte (mundo) para a varredura v (0..1) */
  corte(v: number) {
    return this.xMin + (this.xMax - this.xMin) * v;
  }
  /** v = varredura sólido -> arame (0..1); d = desmonte em partículas (0..1); t = tempo */
  aplica(v: number, d: number, t: number) {
    const c = this.corte(v);
    this.planoArame.constant = c; // -x + c >= 0  -> x <= c
    this.planoSolido.constant = -c; // x - c >= 0 -> x >= c
    const pos = this.part.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const s = this.sem[i];
      const x = this.base[i * 3], y = this.base[i * 3 + 1], z = this.base[i * 3 + 2];
      // a partícula só se solta depois que o arame passou por ela
      const k = THREE.MathUtils.smoothstep(d * 1.45 - s * 0.45, 0, 1) * (x < c ? 1 : 0);
      const a = t * (0.6 + s) + s * 20;
      const cx = this.centro.x, cz = this.centro.z;
      pos.setXYZ(i, x + (cx + Math.cos(a) * (0.5 + s * 0.8) - x) * k * 0.8, y + k * (0.35 + s * 1.1), z + (cz + Math.sin(a) * (0.5 + s * 0.8) - z) * k * 0.8);
    }
    pos.needsUpdate = true;
    (this.part.material as THREE.PointsMaterial).opacity = 0.95;
    this.part.visible = v > 0.01 && d > 0.001;
    this.matL.opacity = 1 - THREE.MathUtils.smoothstep(d, 0.55, 1.0);
  }
}
