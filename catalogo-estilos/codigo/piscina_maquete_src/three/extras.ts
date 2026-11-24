// Peças de apoio da história: folhas boiando, pastilhas de cloro, nuvem de cheiro (algodão amarelo), nuvem de
// chuva, banhista de brinquedo, calçada, cerca com portão, luzes, respingo e gotas atravessando os poros.
import * as THREE from "three";
import type { Kit } from "./kit";
import { rng } from "./rng";
import { EXT } from "./terreno";
import { IN, COAD } from "./piscina";
import { texCalcada } from "./texp";
import { caixaEntre } from "./piscina";
import { Jato } from "./agua";

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const eob = (x: number) => { const t = c01(x); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); };

/** algodão: chumaço 3D (icosaedro com ruído) que pega luz e sombra */
function algodao(kit: Kit, cor: THREE.ColorRepresentation, seed: number, r = 0.25) {
  const g = new THREE.IcosahedronGeometry(r, 3);
  const p = g.getAttribute("position");
  const R = rng(seed);
  const f = [R.r() * 6, R.r() * 6, R.r() * 6];
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 14 + f[0]) * Math.sin(v.y * 13 + f[1]) * Math.sin(v.z * 15 + f[2]);
    v.multiplyScalar(1 + n * 0.12);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return kit.m(g, kit.mat({ color: cor, rough: 1, clear: 0 }), 2);
}

export type EstadoExtras = {
  folhas?: { n: number; modo: "espalha" | "gira" | "engole"; k?: number }; // k = progresso do modo
  cloro?: number; // 0..1 pastilhas caindo
  cheiro?: number; // 0..1 nuvem amarela
  chuva?: number; // 0..1 nuvem de chuva
  banhista?: { vis: boolean; p: [number, number, number]; olha?: number; pulo?: number; giro?: number; bracos?: number };
  calcada?: number; // 0..1 placas quicando
  cerca?: number; // 0..1
  luz?: number; // 0..1
  respingo?: { k: number; p: [number, number, number] }; // 0..1 desde o mergulho
  poros?: number; // 0..1 gotas atravessando a parede
};

export class Extras {
  g = new THREE.Group();
  folhas: THREE.InstancedMesh;
  fd: { a: number; r: number; s: number; cor: number; f: number }[] = [];
  pastilhas: THREE.InstancedMesh;
  cheiro = new THREE.Group();
  chuva = new THREE.Group();
  gotasChuva: THREE.LineSegments;
  banhista = new THREE.Group();
  cabeca = new THREE.Group();
  bracos: THREE.Group[] = [];
  calcada: THREE.InstancedMesh;
  calcM: THREE.Matrix4[] = [];
  cerca = new THREE.Group();
  cercaPecas: { o: THREE.Object3D; ordem: number; y: number }[] = [];
  luzes = new THREE.Group();
  luzMats: THREE.MeshStandardMaterial[] = [];
  respingo: Jato;
  onda: THREE.Mesh;
  poros: Jato;

  constructor(public kit: Kit) {
    const d = kit.dir;
    const R = rng(301);
    // ------------------------------------------------ folhas
    const fs = new THREE.Shape();
    fs.moveTo(0, -0.07);
    fs.quadraticCurveTo(0.055, 0, 0, 0.07);
    fs.quadraticCurveTo(-0.055, 0, 0, -0.07);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.006, bevelEnabled: false }).rotateX(-Math.PI / 2);
    this.folhas = new THREE.InstancedMesh(fg, kit.mat({ color: 0xffffff, rough: 0.7 }), 40);
    const cores = [0x6aa33a, 0xc9a23a, 0x9a6a2e, 0x7fb043];
    for (let i = 0; i < 40; i++) {
      this.fd.push({ a: R.r() * Math.PI * 2, r: 0.35 + R.r() * 1.0, s: 0.9 + R.r() * 0.7, cor: i % 4, f: R.r() });
      this.folhas.setColorAt(i, new THREE.Color(cores[i % 4]));
    }
    this.folhas.castShadow = true;
    kit.contorno(this.folhas, 1.5);
    // ------------------------------------------------ pastilhas de cloro
    this.pastilhas = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), kit.mat({ color: 0xf6f7f2, rough: 0.6 }), 5);
    this.pastilhas.castShadow = true;
    kit.contorno(this.pastilhas, 1.5);
    // ------------------------------------------------ nuvem de cheiro (amarela) e de chuva (cinza)
    for (let i = 0; i < 6; i++) {
      const a = algodao(kit, d === "B" ? 0xffe14d : 0xf2d24a, 400 + i, 0.18 + R.r() * 0.12);
      a.position.set((i - 2.5) * 0.2, (i % 2) * 0.1, (R.r() - 0.5) * 0.15);
      this.cheiro.add(a);
    }
    for (let i = 0; i < 8; i++) {
      const a = algodao(kit, 0x8c96a3, 500 + i, 0.32 + R.r() * 0.18);
      a.position.set((i - 3.5) * 0.36, (i % 2) * 0.16 + R.r() * 0.08, (R.r() - 0.5) * 0.3);
      this.chuva.add(a);
    }
    const nl = 160, lp = new Float32Array(nl * 6);
    this.gotasChuva = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(lp, 3)), new THREE.LineBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.8 }));
    this.gotasChuva.frustumCulled = false;
    this.chuva.add(this.gotasChuva);
    // ------------------------------------------------ banhista de brinquedo (boneco colecionável genérico)
    const pele = kit.mat({ color: 0xd9a27a, rough: 0.5 });
    const maio = kit.mat({ color: d === "B" ? 0x2f7de0 : 0x2a68b8, rough: 0.45 });
    const cab = kit.m(new THREE.SphereGeometry(0.13, 28, 20), pele);
    const cabelo = kit.m(new THREE.SphereGeometry(0.135, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), kit.mat({ color: 0x3a2618, rough: 0.7 }));
    cabelo.rotation.x = -0.25;
    const olhoM = kit.mat({ color: 0x1a1414, rough: 0.3, semBump: true });
    for (const s of [-1, 1]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), olhoM);
      o.position.set(s * 0.045, 0.02, 0.118);
      this.cabeca.add(o);
    }
    this.cabeca.add(cab, cabelo);
    this.cabeca.position.y = 0.52;
    const tronco = kit.m(new THREE.CapsuleGeometry(0.11, 0.2, 8, 16), maio);
    tronco.position.y = 0.27;
    const pernas = kit.m(new THREE.CapsuleGeometry(0.09, 0.16, 8, 16), pele);
    pernas.position.y = 0.06;
    for (const s of [-1, 1]) {
      const b = new THREE.Group();
      const br = kit.m(new THREE.CapsuleGeometry(0.035, 0.2, 6, 10), pele);
      br.position.y = -0.12;
      b.add(br);
      b.position.set(s * 0.14, 0.38, 0);
      this.bracos.push(b);
      this.banhista.add(b);
    }
    this.banhista.add(this.cabeca, tronco, pernas);
    this.banhista.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
    // ------------------------------------------------ calçada áspera (placas instanciadas em volta da borda)
    const tex = texCalcada(d);
    const pg = new THREE.BoxGeometry(0.48, 0.05, 0.48);
    const uv = pg.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
    const X0 = EXT.x + 0.2, Z0 = EXT.z + 0.2, larg = 0.55;
    const pos: [number, number][] = [];
    for (let x = -X0 - larg + 0.25; x <= X0 + larg - 0.2; x += 0.5) for (const z of [Z0 + 0.25, -Z0 - 0.25]) pos.push([x, z]);
    for (let z = -Z0 + 0.25; z <= Z0 - 0.2; z += 0.5) for (const x of [X0 + 0.25, -X0 - 0.25]) pos.push([x, z]);
    pos.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    this.calcada = new THREE.InstancedMesh(pg, kit.mat({ map: tex, rough: 0.9, bump: d === "C" ? tex : null, bumpS: 1.6 }), pos.length);
    const o = new THREE.Object3D();
    pos.forEach(([x, z], i) => {
      o.position.set(x, 0.025, z);
      o.updateMatrix();
      this.calcM.push(o.matrix.clone());
      this.calcada.setMatrixAt(i, o.matrix);
    });
    this.calcada.receiveShadow = this.calcada.castShadow = true;
    kit.contorno(this.calcada, 1.5);
    // ------------------------------------------------ cerca com portão (pras crianças)
    const mCerca = kit.mat({ color: 0xf4f1ea, rough: 0.5 });
    const mPortao = kit.mat({ color: d === "B" ? 0xff7a3d : 0xe0703a, rough: 0.5 });
    const CX = X0 + larg + 0.12, CZ = Z0 + larg + 0.12, hC = 0.55;
    let ord = 0;
    const poste = (x: number, z: number, m = mCerca) => {
      const p = kit.m(new THREE.BoxGeometry(0.045, hC, 0.045), m, 1.5);
      p.position.set(x, hC / 2, z);
      this.cerca.add(p);
      this.cercaPecas.push({ o: p, ordem: ord++, y: hC / 2 });
    };
    const trilho = (a: [number, number], b: [number, number], y: number, m = mCerca) => {
      const g = caixaEntre([Math.min(a[0], b[0]) - 0.012, y - 0.018, Math.min(a[1], b[1]) - 0.012], [Math.max(a[0], b[0]) + 0.012, y + 0.018, Math.max(a[1], b[1]) + 0.012]);
      const t = kit.m(g, m, 1.5);
      this.cerca.add(t);
      this.cercaPecas.push({ o: t, ordem: ord + 0.5, y: 0 });
    };
    // contorno da cerca, deixando o portão na frente (z+), no meio
    const cantos: [number, number][] = [[-CX, CZ], [-CX, -CZ], [CX, -CZ], [CX, CZ]];
    for (let s = 0; s < 3; s++) {
      const [a, b] = [cantos[s], cantos[s + 1]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 0.42);
      for (let i = 0; i <= n; i++) poste(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
      trilho(a, b, hC - 0.05);
      trilho(a, b, 0.12);
    }
    // frente: dois trechos e o portão
    const gp = 0.42;
    for (const [a, b] of [[[CX, CZ], [gp, CZ]], [[-gp, CZ], [-CX, CZ]]] as [number, number][][]) {
      const L = Math.abs(b[0] - a[0]), n = Math.round(L / 0.42);
      for (let i = 0; i <= n; i++) poste(a[0] + ((b[0] - a[0]) * i) / n, CZ);
      trilho(a, b, hC - 0.05);
      trilho(a, b, 0.12);
    }
    for (let i = 0; i < 6; i++) poste(-gp + 0.08 + i * 0.136, CZ, mPortao);
    trilho([-gp, CZ], [gp, CZ], hC - 0.05, mPortao);
    trilho([-gp, CZ], [gp, CZ], 0.12, mPortao);
    // ------------------------------------------------ luzes: postes de jardim + luzes dentro da piscina
    const mPoste = kit.mat({ color: 0x2b2f33, rough: 0.5, metal: d === "B" ? 0 : 0.5 });
    for (const [x, z] of [[-CX + 0.2, -CZ + 0.2], [CX - 0.2, -CZ + 0.2], [-CX + 0.2, CZ - 0.2], [CX - 0.2, CZ - 0.2]]) {
      const pg2 = new THREE.Group();
      const haste = kit.m(new THREE.CylinderGeometry(0.02, 0.025, 0.6, 10), mPoste, 1.5);
      haste.position.y = 0.3;
      const lm = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc46b, emissiveIntensity: 0, roughness: 0.3 });
      this.luzMats.push(lm);
      const bulbo = kit.m(new THREE.SphereGeometry(0.06, 16, 12), lm, 1.5);
      bulbo.position.y = 0.64;
      pg2.add(haste, bulbo);
      pg2.position.set(x, 0, z);
      this.luzes.add(pg2);
    }
    for (const x of [-1.0, 1.0]) {
      const lm = new THREE.MeshStandardMaterial({ color: 0xeaffff, emissive: 0x9ff4ff, emissiveIntensity: 0, roughness: 0.2 });
      this.luzMats.push(lm);
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), lm);
      l.position.set(x, -0.5, -IN.z + 0.004);
      this.luzes.add(l);
    }
    // ------------------------------------------------ respingo do mergulho e gotas dos poros
    this.respingo = new Jato(kit, 260, 0xf2fdff, d === "B" ? 8 : 7);
    this.onda = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    this.poros = new Jato(kit, 160, 0x3fb2ff, 13);
    this.g.add(this.folhas, this.pastilhas, this.cheiro, this.chuva, this.banhista, this.calcada, this.cerca, this.luzes, this.respingo.pts, this.onda, this.poros.pts);
  }

  aplica(e: EstadoExtras, t: number, nivel: number) {
    const o = new THREE.Object3D();
    // folhas
    const f = e.folhas;
    this.folhas.visible = !!f && f.n > 0;
    if (f) {
      const n = Math.min(40, Math.round(f.n));
      this.folhas.count = n;
      this.fd.slice(0, n).forEach((q, i) => {
        let x: number, z: number, rot: number, y = nivel + 0.006, s = q.s;
        const ang = q.a + (f.modo === "espalha" ? t * 0.05 : t * (0.35 + 0.25 / q.r));
        x = Math.cos(ang) * q.r * 1.55;
        z = Math.sin(ang) * q.r * 0.85;
        rot = ang * 1.3 + q.f * 6;
        if (f.modo === "engole") {
          // cada folha corre para a coadeira e some dentro dela
          const k = c01((f.k ?? 0) * 1.8 - q.f * 0.8);
          const kk = k * k * (3 - 2 * k);
          x = x + (COAD.x - x) * kk;
          z = z + (-IN.z + 0.05 - z) * kk;
          s *= 1 - c01((k - 0.85) / 0.15);
        }
        o.position.set(x, y + Math.sin(t * 2 + q.f * 9) * 0.004, z);
        o.rotation.set(Math.sin(t * 1.3 + q.f * 5) * 0.08, rot, 0);
        o.scale.setScalar(Math.max(0.001, s));
        o.updateMatrix();
        this.folhas.setMatrixAt(i, o.matrix);
      });
      this.folhas.instanceMatrix.needsUpdate = true;
      this.folhas.children.forEach((c) => ((c as THREE.InstancedMesh).count = n));
    }
    // pastilhas de cloro caem, batem na água e afundam
    const cl = e.cloro ?? 0;
    this.pastilhas.visible = cl > 0 && cl < 1;
    for (let i = 0; i < 5; i++) {
      const k = c01(cl * 1.6 - i * 0.12);
      const yQueda = 1.6 - 1.6 * Math.min(1, k * 2.2) * Math.min(1, k * 2.2);
      const y = k < 0.45 ? nivel + yQueda : nivel - (k - 0.45) * 1.6;
      o.position.set(-1.2 + i * 0.6, Math.max(y, IN.y + 0.02), -0.3 + (i % 2) * 0.35);
      o.rotation.set(k * 4 + i, i, k * 3);
      o.scale.setScalar(k <= 0 ? 0.001 : 1 - c01((k - 0.75) / 0.25) * 0.9);
      o.updateMatrix();
      this.pastilhas.setMatrixAt(i, o.matrix);
    }
    this.pastilhas.instanceMatrix.needsUpdate = true;
    // nuvem de cheiro
    const ch = e.cheiro ?? 0;
    this.cheiro.visible = ch > 0.001;
    this.cheiro.position.set(0.3, nivel + 0.55 + ch * 0.2 + Math.sin(t * 1.5) * 0.04, 0.1);
    this.cheiro.scale.setScalar(0.72);
    this.cheiro.children.forEach((c, i) => c.scale.setScalar(Math.max(0.001, eob(c01(ch * 1.6 - i * 0.08)) * (1 + Math.sin(t * 2.2 + i) * 0.06))));
    // nuvem de chuva
    const cv = e.chuva ?? 0;
    this.chuva.visible = cv > 0.001;
    this.chuva.position.set(0, 1.75, -0.2);
    this.chuva.children.forEach((c, i) => {
      if (c !== this.gotasChuva) c.scale.setScalar(Math.max(0.001, eob(c01(cv * 1.5 - i * 0.05))));
    });
    const lp = this.gotasChuva.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < lp.count / 2; i++) {
      const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 2.6 - 1.3, z = ((Math.sin(i * 78.233) * 43758.5453) % 1) * 1.2 - 0.6;
      const y = -(((t * 3 + (i * 0.137) % 1) % 1) * 2.6) - 0.1;
      lp.setXYZ(i * 2, x, y, z);
      lp.setXYZ(i * 2 + 1, x - 0.02, y - 0.16, z);
    }
    lp.needsUpdate = true;
    this.gotasChuva.visible = cv > 0.4;
    // banhista
    const b = e.banhista;
    this.banhista.visible = !!b?.vis;
    if (b) {
      this.banhista.position.set(...b.p);
      this.banhista.rotation.y = b.giro ?? 0;
      this.cabeca.rotation.y = b.olha ?? 0;
      const br = b.bracos ?? 0;
      this.bracos.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.2 + br * 2.6)));
      this.banhista.scale.setScalar(1.3);
    }
    // calçada: placas caem quicando, em volta
    const ca = e.calcada ?? 0;
    this.calcada.visible = ca > 0;
    const nC = this.calcM.length;
    for (let i = 0; i < nC; i++) {
      const k = c01(ca * 1.7 - (i / nC) * 0.7);
      const m = this.calcM[i].clone();
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      o.position.set(p.x, p.y + (1 - eob(k)) * 0.6, p.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(k <= 0 ? 0.001 : 1);
      o.updateMatrix();
      this.calcada.setMatrixAt(i, o.matrix);
    }
    this.calcada.instanceMatrix.needsUpdate = true;
    // cerca: postes brotam em sequência
    const ce = e.cerca ?? 0;
    this.cerca.visible = ce > 0;
    const nP = this.cercaPecas.length;
    this.cercaPecas.forEach((q, i) => {
      const k = c01(ce * 1.6 - (i / nP) * 0.6);
      q.o.scale.set(1, Math.max(0.001, eob(k)), 1);
      q.o.visible = k > 0;
    });
    // luzes
    const lz = e.luz ?? 0;
    this.luzes.visible = lz > 0 || ce > 0;
    this.luzMats.forEach((m, i) => (m.emissiveIntensity = (i < 4 ? 3.2 : 4) * c01(lz * 1.5 - i * 0.08)));
    // respingo
    const r = e.respingo;
    if (r && r.k > 0 && r.k < 1) {
      const k = r.k;
      this.respingo.aplica(k * 1.2, new THREE.Vector3(r.p[0], nivel, r.p[2]), new THREE.Vector3(0, 2.6, 0), -7.5, 0.9, 1.2, 1 - k);
      this.onda.visible = true;
      this.onda.position.set(r.p[0], nivel + 0.01, r.p[2]);
      this.onda.scale.setScalar(0.15 + k * 1.2);
      (this.onda.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
    } else {
      this.respingo.aplica(0, new THREE.Vector3(), new THREE.Vector3(), 0, 0, 1, 0);
      this.onda.visible = false;
    }
    // gotas atravessando a parede da esquerda (poros) no plano do corte
    const pr = e.poros ?? 0;
    this.poros.aplica(t, new THREE.Vector3(-IN.x + 0.02, -0.75, 0.03), new THREE.Vector3(-0.32, -0.04, 0), 0, 0.22, 1.4, pr);
  }
}
