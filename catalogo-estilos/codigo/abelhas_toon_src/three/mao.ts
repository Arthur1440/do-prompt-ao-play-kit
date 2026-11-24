import * as THREE from "three";
import { esfera, Kit } from "./kit";

// Mão e antebraço de quem assiste (POV). Referencial da mão (mão direita):
// origem no punho, +Y = para os dedos, +Z = dorso, polegar em -X. A esquerda é espelhada.
// 5 dedos: 4 com 3 falanges e o polegar com 2 falanges + metacarpo; flexão só para a palma.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export type SDF = (p: THREE.Vector3) => number;
export const sdEsfera = (c: THREE.Vector3, r: number, esc = V(1, 1, 1)): SDF => (p) => {
  const d = p.clone().sub(c).divide(esc);
  return (d.length() - r) * Math.min(esc.x, esc.y, esc.z);
};
export const sdCapsula = (a: THREE.Vector3, b: THREE.Vector3, r: number): SDF => (p) => {
  const pa = p.clone().sub(a), ba = b.clone().sub(a);
  const h = Math.min(1, Math.max(0, pa.dot(ba) / ba.dot(ba)));
  return pa.sub(ba.multiplyScalar(h)).length() - r;
};
/** Cilindro com tampas (disco do prato, cabo). */
export const sdCilindro = (c: THREE.Vector3, eixo: THREE.Vector3, r: number, meiaAltura: number): SDF => {
  const e = eixo.clone().normalize();
  return (p) => {
    const d = p.clone().sub(c);
    const y = d.dot(e);
    const x = d.sub(e.clone().multiplyScalar(y)).length();
    const qx = x - r, qy = Math.abs(y) - meiaAltura;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  };
};
export const sdUniao = (...f: SDF[]): SDF => (p) => Math.min(...f.map((g) => g(p)));

type Dedo = { j: THREE.Group[]; L: number[]; r: number[] };

export type PoseMao = {
  W: THREE.Vector3; // punho
  F: THREE.Vector3; // direção punho -> dedos
  N: THREE.Vector3; // direção do dorso
  D: THREE.Vector3; // direção punho -> cotovelo
  curl?: number[]; // 4 dedos (rad na 1ª falange; as outras seguem)
  abre?: number; // abertura extra dos dedos
  pol?: { abd?: number; roll?: number; opp?: number; f1?: number; f2?: number };
};

export class Mao {
  raiz = new THREE.Group();
  esp = new THREE.Group();
  braco = new THREE.Group();
  dedos: Dedo[] = [];
  pol: { tz: THREE.Group; ty: THREE.Group; tx: THREE.Group; j1: THREE.Group; j2: THREE.Group; L: number[]; r: number[] };
  lado: "R" | "L";
  splay = [0.07, 0.0, -0.06, -0.13];

  constructor(public k: Kit, lado: "R" | "L", o: { pele?: string; manga?: string; unha?: string } = {}) {
    this.lado = lado;
    this.raiz.add(this.esp);
    this.esp.scale.x = lado === "R" ? 1 : -1;
    const pele = k.mat({ color: o.pele ?? (k.dir === "B" ? "#f4b48c" : "#e59a74"), rough: 0.7 });
    const unha = k.mat({ color: o.unha ?? (k.dir === "B" ? "#ffd9cc" : "#f3c6b6"), rough: 0.35 });
    const P = this.esp;

    // palma: superelipsoide (canto arredondado, sem cara de caixa), afinando no punho
    const pg = new THREE.SphereGeometry(1, 40, 30);
    const pp = pg.attributes.position as THREE.BufferAttribute;
    const sp = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (let i = 0; i < pp.count; i++) {
      let x = sp(pp.getX(i), 0.55) * 0.04, y = sp(pp.getY(i), 0.6) * 0.048, z = sp(pp.getZ(i), 0.75) * 0.0135;
      const yy = (y + 0.048) / 0.096;
      x *= 0.84 + 0.16 * yy;
      if (yy > 0.6) y -= (Math.max(0, x) / 0.04) * 0.008 * ((yy - 0.6) / 0.4);
      if (z < 0) z *= 1 + 0.2 * Math.sin(Math.PI * yy);
      else z *= 1 - 0.25 * Math.pow(Math.abs(x) / 0.04, 2);
      pp.setXYZ(i, x, y, z);
    }
    pg.computeVertexNormals();
    k.m(pg, pele, 3, P, [0.001, 0.047, 0]);
    // eminências da palma e punho
    k.m(esfera(1, 24, 16), pele, 2.5, P, [-0.026, 0.03, -0.006], [0, 0, 0.5], [0.02, 0.031, 0.0145]);
    k.m(esfera(1, 24, 16), pele, 2.5, P, [0.03, 0.038, -0.004], [0, 0, -0.1], [0.0145, 0.034, 0.012]);
    k.m(esfera(1, 24, 16), pele, 2.5, P, [0, 0.004, 0], undefined, [0.03, 0.022, 0.0175]);

    // dedos
    const defs = [
      { x: -0.0285, y: 0.091, L: [0.043, 0.026, 0.021], r: 0.0093 },
      { x: -0.0093, y: 0.096, L: [0.047, 0.029, 0.022], r: 0.0096 },
      { x: 0.0103, y: 0.093, L: [0.044, 0.027, 0.021], r: 0.0091 },
      { x: 0.0282, y: 0.084, L: [0.034, 0.02, 0.019], r: 0.008 },
    ];
    for (const d of defs) {
      const j: THREE.Group[] = [];
      const rs = [d.r, d.r * 0.92, d.r * 0.86];
      let pai: THREE.Object3D = P;
      for (let i = 0; i < 3; i++) {
        const jg = new THREE.Group();
        jg.rotation.order = "ZXY";
        jg.position.set(i === 0 ? d.x : 0, i === 0 ? d.y : d.L[i - 1], 0);
        pai.add(jg);
        const cg = new THREE.CapsuleGeometry(rs[i], d.L[i], 6, 16);
        cg.translate(0, d.L[i] / 2, 0);
        k.m(cg, pele, i === 2 ? 2 : 2.4, jg, undefined, undefined, [1, 1, 0.86]);
        j.push(jg);
        pai = jg;
      }
      // unha curta com cutícula (no dorso da falange distal)
      k.m(esfera(1, 16, 10), unha, 1, j[2], [0, d.L[2] * 0.68, rs[2] * 0.74], [0.12, 0, 0], [rs[2] * 0.7, d.L[2] * 0.42, rs[2] * 0.28]);
      this.dedos.push({ j, L: d.L, r: rs });
    }

    // polegar
    const t0 = new THREE.Group();
    t0.position.set(-0.027, 0.024, -0.008);
    P.add(t0);
    const tz = new THREE.Group(), ty = new THREE.Group(), tx = new THREE.Group();
    t0.add(tz);
    tz.add(ty);
    ty.add(tx);
    const L = [0.042, 0.031, 0.026], r = [0.0118, 0.0106, 0.0099];
    const cap = (i: number, pai: THREE.Object3D) => {
      const cg = new THREE.CapsuleGeometry(r[i], L[i], 6, 16);
      cg.translate(0, L[i] / 2, 0);
      k.m(cg, pele, 2.4, pai, undefined, undefined, [1, 1, 0.88]);
    };
    cap(0, tx);
    const j1 = new THREE.Group();
    j1.position.y = L[0];
    tx.add(j1);
    cap(1, j1);
    const j2 = new THREE.Group();
    j2.position.y = L[1];
    j1.add(j2);
    cap(2, j2);
    k.m(esfera(1, 16, 10), unha, 1, j2, [0, L[2] * 0.66, r[2] * 0.76], [0.12, 0, 0], [r[2] * 0.72, L[2] * 0.44, r[2] * 0.28]);
    this.pol = { tz, ty, tx, j1, j2, L, r };

    // antebraço + manga (fora da raiz: orientado pela direção do cotovelo)
    const ab = new THREE.CylinderGeometry(0.031, 0.0235, 0.3, 32, 8);
    ab.translate(0, 0.15, 0);
    k.m(ab, pele, 3, this.braco, undefined, undefined, [1, 1, 0.74]);
    const manga = k.mat({ color: o.manga ?? (k.dir === "B" ? "#6f86b8" : k.dir === "C" ? "#8e9cab" : "#7f8c99"), rough: 0.95, side: THREE.DoubleSide });
    const mg = new THREE.CylinderGeometry(0.056, 0.047, 0.6, 32, 6, true);
    mg.translate(0, 0.40, 0);
    k.m(mg, manga, 3, this.braco, undefined, undefined, [1, 1, 0.86]);
    const pun = new THREE.TorusGeometry(0.046, 0.0095, 12, 40);
    pun.rotateX(Math.PI / 2);
    k.m(pun, manga, 3, this.braco, [0, 0.105, 0], undefined, [1, 1, 0.86]);
  }

  addTo(o: THREE.Object3D) {
    o.add(this.raiz, this.braco);
    return this;
  }

  pose(p: PoseMao) {
    const F = p.F.clone().normalize();
    const N = p.N.clone().sub(F.clone().multiplyScalar(p.N.dot(F))).normalize();
    const X = new THREE.Vector3().crossVectors(F, N);
    this.raiz.matrix.makeBasis(X, F, N);
    this.raiz.quaternion.setFromRotationMatrix(this.raiz.matrix);
    this.raiz.position.copy(p.W);
    // antebraço: Y = cotovelo, Z = dorso
    const D = p.D.clone().normalize();
    const Nb = N.clone().sub(D.clone().multiplyScalar(N.dot(D))).normalize();
    const Xb = new THREE.Vector3().crossVectors(D, Nb);
    const mb = new THREE.Matrix4().makeBasis(Xb, D, Nb);
    this.braco.quaternion.setFromRotationMatrix(mb);
    this.braco.position.copy(p.W).add(D.clone().multiplyScalar(0.006));
    const c = p.curl ?? [0.2, 0.2, 0.25, 0.3];
    this.dedos.forEach((d, i) => this.curva(i, c[i], c[i] * 1.1, c[i] * 0.75, p.abre ?? 0));
    const t = p.pol ?? {};
    this.polegar(t.abd ?? 0.75, t.roll ?? -1.0, t.opp ?? 0.3, t.f1 ?? 0.15, t.f2 ?? 0.15);
    this.raiz.updateWorldMatrix(true, true);
    return this;
  }

  curva(i: number, a0: number, a1: number, a2: number, abre = 0) {
    const d = this.dedos[i];
    d.j[0].rotation.set(-a0, 0, this.splay[i] * (1 + abre));
    d.j[1].rotation.set(-a1, 0, 0);
    d.j[2].rotation.set(-a2, 0, 0);
  }

  polegar(abd: number, roll: number, opp: number, f1: number, f2: number) {
    this.pol.tz.rotation.z = abd;
    this.pol.ty.rotation.y = roll;
    this.pol.tx.rotation.x = -opp;
    this.pol.j1.rotation.x = -f1;
    this.pol.j2.rotation.x = -f2;
  }

  /** Menor distância (pele -> objeto) de uma falange; negativo = atravessa. */
  private folgaFalange(jg: THREE.Group, L: number, r: number, f: SDF, ponta = false) {
    let m = Infinity;
    const ts = ponta ? [0.3, 0.6, 0.9, 1.0, 1.0 + (0.6 * r) / L] : [0.25, 0.5, 0.75, 1.0];
    for (const t of ts) {
      const w = jg.localToWorld(V(0, t * L, 0));
      m = Math.min(m, f(w) - r * 0.92);
    }
    return m;
  }

  /** Fecha cada dedo em volta do objeto até a pele encostar (sem atravessar). */
  fecha(f: SDF, dedos = [0, 1, 2, 3], o: { ini?: number[]; max?: number; aperto?: number } = {}) {
    const ap = o.aperto ?? 0.0006;
    const res: number[] = [];
    for (const i of dedos) {
      const d = this.dedos[i];
      const s0 = o.ini?.[i] ?? 0.1;
      const toca = (k: number) => {
        d.j[0].updateWorldMatrix(true, true);
        for (let q = k; q < 3; q++) if (this.folgaFalange(d.j[q], d.L[q], d.r[q], f, q === 2) < ap) return true;
        return false;
      };
      const ab = d.j[0].rotation.z;
      const busca = (aplica: (s: number) => void, lo: number, hi: number, k: number) => {
        let s = lo;
        for (; s <= hi; s += 0.03) {
          aplica(s);
          if (toca(k)) break;
        }
        if (s > hi) {
          aplica(hi);
          return hi;
        }
        let a = Math.max(lo, s - 0.03), b = s;
        for (let it = 0; it < 8; it++) {
          const mm = (a + b) / 2;
          aplica(mm);
          if (toca(k)) b = mm;
          else a = mm;
        }
        aplica(a);
        return a;
      };
      const mx = o.max ?? 1.55;
      const s = busca((x) => {
        d.j[0].rotation.set(-x, 0, ab);
        d.j[1].rotation.set(-x * 1.1, 0, 0);
        d.j[2].rotation.set(-x * 0.75, 0, 0);
      }, s0, mx, 0);
      const a1 = s * 1.1, a2 = s * 0.75;
      const dd = busca((x) => {
        d.j[1].rotation.set(-(a1 + x), 0, 0);
        d.j[2].rotation.set(-(a2 + x * 0.8), 0, 0);
      }, 0, Math.max(0, 1.75 - a1), 1);
      const a2b = a2 + dd * 0.8;
      busca((x) => d.j[2].rotation.set(-(a2b + x), 0, 0), 0, Math.max(0, 1.35 - a2b), 2);
      res.push(s);
    }
    this.raiz.updateWorldMatrix(true, true);
    return res;
  }

  /** Fecha o polegar (f1/f2) até encostar. */
  fechaPolegar(f: SDF, max = 1.2, ap = 0.0006) {
    const P = this.pol;
    const toca = () => {
      P.tz.updateWorldMatrix(true, true);
      return this.folgaFalange(P.j1, P.L[1], P.r[1], f) < ap || this.folgaFalange(P.j2, P.L[2], P.r[2], f, true) < ap;
    };
    const f10 = -P.j1.rotation.x, f20 = -P.j2.rotation.x;
    let s = 0;
    for (; s <= max; s += 0.03) {
      P.j1.rotation.x = -(f10 + s * 0.6);
      P.j2.rotation.x = -(f20 + s);
      if (toca()) break;
    }
    P.j1.rotation.x = -(f10 + Math.max(0, s - 0.03) * 0.6);
    P.j2.rotation.x = -(f20 + Math.max(0, s - 0.03));
    this.raiz.updateWorldMatrix(true, true);
  }

  /** Pior folga de toda a mão (palma e dedos) — para conferir que nada atravessa. */
  folgaMin(f: SDF) {
    this.raiz.updateWorldMatrix(true, true);
    let m = Infinity;
    for (const d of this.dedos) for (let q = 0; q < 3; q++) m = Math.min(m, this.folgaFalange(d.j[q], d.L[q], d.r[q], f, q === 2));
    m = Math.min(m, this.folgaFalange(this.pol.j1, this.pol.L[1], this.pol.r[1], f), this.folgaFalange(this.pol.j2, this.pol.L[2], this.pol.r[2], f, true));
    // pontos da palma (lado da palma)
    for (const [x, y] of [
      [-0.025, 0.07], [0, 0.075], [0.025, 0.07], [-0.02, 0.04], [0.02, 0.04], [0, 0.02],
    ]) {
      const w = this.esp.localToWorld(V(x, y, -0.012));
      m = Math.min(m, f(w));
    }
    return m;
  }

  /** Polpa do polegar (lado da palma da falange distal), no mundo. */
  polpaPolegar() {
    const P = this.pol;
    return P.j2.localToWorld(V(0, P.L[2] * 0.7, -P.r[2] * 0.9));
  }

  /** IK do polegar: procura abdução, oposição, rotação e flexões para a polpa chegar em T (mundo). */
  polegarIK(T: THREE.Vector3, fixo: { roll?: number } = {}) {
    const P = this.pol;
    let x = [P.tz.rotation.z, P.ty.rotation.y, -P.tx.rotation.x, -P.j1.rotation.x, -P.j2.rotation.x];
    const lim = [[0.0, 1.7], [-1.7, -0.3], [-0.4, 1.7], [0.0, 1.0], [0.0, 1.3]];
    if (fixo.roll !== undefined) x[1] = fixo.roll;
    const custo = (v: number[]) => {
      this.polegar(v[0], v[1], v[2], v[3], v[4]);
      P.tz.updateWorldMatrix(true, true);
      const e = this.polpaPolegar().distanceTo(T);
      // preferência por flexões moderadas (pose natural)
      return e + 0.002 * (Math.abs(v[3] - 0.3) + Math.abs(v[4] - 0.3));
    };
    let best = custo(x);
    let passo = 0.25;
    for (let it = 0; it < 60 && passo > 0.002; it++) {
      let melhorou = false;
      for (let i = 0; i < 5; i++) {
        if (i === 1 && fixo.roll !== undefined) continue;
        for (const s of [1, -1]) {
          const y = x.slice();
          y[i] = Math.min(lim[i][1], Math.max(lim[i][0], y[i] + s * passo));
          const c = custo(y);
          if (c < best) {
            best = c;
            x = y;
            melhorou = true;
          }
        }
      }
      if (!melhorou) passo *= 0.5;
    }
    custo(x);
    this.raiz.updateWorldMatrix(true, true);
    return this.polpaPolegar().distanceTo(T);
  }

  /** Pegada de caneta (tripé): o cabo fica entre a polpa do polegar e a do indicador, apoiado no médio. */
  pegadaCaneta(rCabo = 0.0048) {
    this.raiz.position.set(0, 0, 0);
    this.raiz.quaternion.identity();
    this.curva(0, 0.5, 0.75, 0.2);
    this.curva(1, 0.62, 0.95, 0.45);
    this.curva(2, 1.0, 1.25, 0.7);
    this.curva(3, 1.15, 1.3, 0.75);
    this.raiz.updateWorldMatrix(true, true);
    const d0 = this.dedos[0], d1 = this.dedos[1];
    // centro do cabo: abaixo da polpa do indicador
    const pInd = d0.j[2].localToWorld(V(0, d0.L[2] * 0.62, -(d0.r[2] * 0.86 + rCabo)));
    // o cabo sai pela membrana entre polegar e indicador
    const P0 = this.esp.localToWorld(V(-0.037, 0.075, 0.004));
    const dir = pInd.clone().sub(P0).normalize();
    // polegar encosta do outro lado do cabo (lado radial / da palma)
    const lado = V(-1, 0, -0.5).normalize();
    const lateral = lado.sub(dir.clone().multiplyScalar(lado.dot(dir))).normalize();
    const T = pInd.clone().add(lateral.multiplyScalar(rCabo + this.pol.r[2] * 0.9)).add(dir.clone().multiplyScalar(-0.004));
    const erro = this.polegarIK(T);
    // médio apoia por baixo
    const sd = sdCapsula(P0.clone().sub(dir.clone().multiplyScalar(0.08)), pInd.clone().add(dir.clone().multiplyScalar(0.05)), rCabo);
    this.fecha(sd, [1], { ini: [0, 0.4, 0, 0], max: 0.9 });
    return { P0, P1: pInd, dir, sep: erro };
  }

  /** Coloca a mão por rotação explícita + posição do punho. */
  orienta(q: THREE.Quaternion, W: THREE.Vector3) {
    this.raiz.quaternion.copy(q);
    this.raiz.position.copy(W);
    this.raiz.userData.N = V(0, 0, 1).applyQuaternion(q);
    this.raiz.updateWorldMatrix(true, true);
  }

  /** Ponto da mão em coordenadas do mundo (referencial da mão direita). */
  ponto(x: number, y: number, z: number) {
    this.raiz.updateWorldMatrix(true, true);
    return this.esp.localToWorld(V(x, y, z));
  }
}
