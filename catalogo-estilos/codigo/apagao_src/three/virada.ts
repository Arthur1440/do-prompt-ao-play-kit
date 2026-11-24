// Virada "feito com IA": a cidade congela e vira arame laranja (#FF6B2C) + partículas sobre azul-tinta.
import * as THREE from "three";
import { rng } from "./rng";

export class Virada {
  g = new THREE.Group();
  arame = new THREE.Group();
  part: THREE.Points;
  base: Float32Array;
  matL: THREE.LineBasicMaterial;
  constructor(alvo: THREE.Object3D) {
    this.matL = new THREE.LineBasicMaterial({ color: new THREE.Color(0xff6b2c).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 1 });
    alvo.updateMatrixWorld(true);
    const pts: number[] = [];
    alvo.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || o.userData.contorno) return;
      const mat = m.material as THREE.Material;
      if (Array.isArray(m.material)) { /* prédio: ok */ } else if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial && (mat as THREE.MeshBasicMaterial).blending === THREE.AdditiveBlending) return;
      const geo = m.geometry as THREE.BufferGeometry;
      geo.computeBoundingBox();
      const s = new THREE.Vector3();
      geo.boundingBox!.getSize(s);
      if (Math.max(s.x, s.y, s.z) > 12) return; // chão e mesa
      const e = new THREE.EdgesGeometry(geo, 30);
      e.applyMatrix4(m.matrixWorld);
      const l = new THREE.LineSegments(e, this.matL);
      this.arame.add(l);
      const p = e.getAttribute("position");
      for (let i = 0; i < p.count; i += 3) pts.push(p.getX(i), p.getY(i), p.getZ(i));
    });
    const R = rng(4);
    const n = 9000;
    this.base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = Math.floor(R.r() * (pts.length / 3)) * 3;
      this.base.set([pts[k] + R.gauss() * 0.05, pts[k + 1] + R.gauss() * 0.05, pts[k + 2] + R.gauss() * 0.05], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.base.slice(), 3));
    const sem = new Float32Array(n);
    for (let i = 0; i < n; i++) sem[i] = R.r();
    g.setAttribute("sem", new THREE.BufferAttribute(sem, 1));
    this.part = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: new THREE.Color(0xffa060).multiplyScalar(1.4), size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.g.add(this.arame, this.part);
  }
  /** d = desmonte 0..1 (partículas sobem e espiralam para o centro da tela), t = tempo */
  aplica(d: number, t: number) {
    const pos = this.part.geometry.getAttribute("position") as THREE.BufferAttribute;
    const sem = this.part.geometry.getAttribute("sem") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const s = sem.getX(i);
      const k = THREE.MathUtils.smoothstep(d * 1.4 - s * 0.4, 0, 1);
      const x = this.base[i * 3], y = this.base[i * 3 + 1], z = this.base[i * 3 + 2];
      const a = t * (0.6 + s) + s * 20;
      pos.setXYZ(i, x + (Math.cos(a) * (1.5 + s * 2) - x) * k * 0.8, y + k * (2 + s * 5), z + (Math.sin(a) * (1.5 + s * 2) - z) * k * 0.8);
    }
    pos.needsUpdate = true;
    this.matL.opacity = 1 - THREE.MathUtils.smoothstep(d, 0.2, 0.9);
  }
}
