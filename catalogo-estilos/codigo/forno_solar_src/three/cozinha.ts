// Cozinha comunitária ao sol (reconstituição ilustrativa): fogões solares GENÉRICOS de vários tipos
// (parabólico, de painéis e de caixa de madeira), panelas pretas com vapor. Nenhum é o forno de gabinete.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Kit } from "./kit";
import { texTerra, texReboco, texMadeira } from "./tex";
import { pontoSuave } from "./props";
import { rng } from "./rng";

const caixa = (w: number, h: number, d: number, r = 0.006) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));

export class Cozinha {
  g = new THREE.Group();
  vapor: THREE.Points;
  vb: Float32Array;
  constructor(kit: Kit, solDir: THREE.Vector3) {
    const d = kit.dir;
    const tt = texTerra(d, 23);
    tt.repeat.set(6, 6);
    const chao = kit.m(new THREE.PlaneGeometry(26, 26), kit.mat({ map: tt, rough: 0.95, semContorno: true }));
    chao.rotation.x = -Math.PI / 2;
    this.g.add(chao);
    // piso de cimento queimado onde ficam os fogões
    const piso = kit.m(caixa(4.6, 0.05, 2.4, 0.01), kit.mat({ color: d === "B" ? 0xd9d2c6 : 0xb9b2a6, rough: 0.8 }), 2);
    piso.position.set(0, 0.025, 0.2);
    this.g.add(piso);
    // prédio da cozinha: parede caiada, barrado amarelo, porta e janela com cobogó
    const reb = texReboco(d, 37);
    reb.repeat.set(4, 2);
    const parede = kit.m(caixa(6, 2.6, 0.2, 0.01), kit.mat({ map: reb, rough: 0.9 }));
    parede.position.set(0, 1.3, -1.3);
    this.g.add(parede);
    const barrado = kit.m(caixa(6.004, 0.7, 0.012, 0.003), kit.mat({ color: d === "B" ? 0xf3b33d : 0xd99a2b, rough: 0.7 }), 2);
    barrado.position.set(0, 0.35, -1.194);
    this.g.add(barrado);
    const porta = kit.m(caixa(0.9, 2.0, 0.05, 0.006), kit.mat({ color: d === "B" ? 0x2a9a6a : 0x2a7a5a, rough: 0.6 }), 2.5);
    porta.position.set(-1.6, 1.0, -1.18);
    this.g.add(porta);
    // cobogó: grade de blocos vazados
    const cob = kit.mat({ color: d === "B" ? 0xfdf7ea : 0xe6dccb, rough: 0.85 });
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 4; j++) {
        const b = kit.m(new THREE.TorusGeometry(0.07, 0.025, 6, 4), cob, 1.5);
        b.rotation.z = Math.PI / 4;
        b.position.set(0.9 + i * 0.2, 1.1 + j * 0.2, -1.17);
        this.g.add(b);
      }
    // mesa comprida com pratos e panos
    const mt = texMadeira(d, d === "B" ? "#a8673a" : "#9a6a42", "#6b4527", 4, 29);
    const mesa = new THREE.Group();
    const tampo = kit.m(caixa(2.4, 0.05, 0.7, 0.008), kit.mat({ map: mt, rough: 0.7 }));
    tampo.position.y = 0.76;
    mesa.add(tampo);
    for (const [x, z] of [[-1.1, -0.28], [1.1, -0.28], [-1.1, 0.28], [1.1, 0.28]]) {
      const p = kit.m(caixa(0.06, 0.74, 0.06), kit.mat({ color: d === "B" ? 0x8e532c : 0x7a5236, rough: 0.8 }));
      p.position.set(x, 0.37, z);
      mesa.add(p);
    }
    const prato = kit.mat({ color: 0xf4f1ea, rough: 0.25, clear: d === "C" ? 0.6 : undefined });
    for (let i = 0; i < 8; i++) {
      const pr = kit.m(new THREE.CylinderGeometry(0.11, 0.08, 0.02, 28), prato, 1.5);
      pr.position.set(-1.0 + i * 0.285, 0.795, 0.12);
      mesa.add(pr);
    }
    mesa.position.set(0.2, 0, -0.75);
    this.g.add(mesa);

    const preto = kit.mat({ color: 0x151515, rough: 0.45, metal: d === "B" ? 0 : 0.3 });
    const espelho = kit.mat({ espelho: true });
    const metal = kit.mat({ color: d === "B" ? 0x9aa3ab : 0x7d858c, metal: d === "B" ? 0 : 0.7, rough: 0.4 });
    const panela = (r = 0.12, h = 0.12) => {
      const g = new THREE.Group();
      const c = kit.m(new THREE.CylinderGeometry(r, r * 0.95, h, 24), preto, 2);
      c.position.y = h / 2;
      const tampa = kit.m(new THREE.SphereGeometry(r * 1.02, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.18), preto, 2);
      tampa.scale.y = 0.6;
      tampa.position.y = h - r * 0.02;
      const pega = kit.m(new THREE.SphereGeometry(0.018, 10, 8), preto, 1.5);
      pega.position.y = h + r * 0.15;
      g.add(c, tampa, pega);
      return g;
    };
    const sd = solDir.clone().normalize();
    const pontosVapor: THREE.Vector3[] = [];
    // 1) parabólicos: prato espelhado virado para o sol, panela no foco
    const parab = (x: number, z: number) => {
      const g = new THREE.Group();
      const R = 0.62, prof = 0.22;
      const perfil: THREE.Vector2[] = [];
      for (let i = 0; i <= 16; i++) {
        const r = (i / 16) * R;
        perfil.push(new THREE.Vector2(r, (r * r) / (R * R) * prof));
      }
      const disco = kit.m(new THREE.LatheGeometry(perfil, 40), espelho, 0);
      (disco.material as THREE.Material).side = THREE.DoubleSide;
      const costas = kit.m(new THREE.LatheGeometry(perfil.map((p) => new THREE.Vector2(p.x * 1.01, p.y - 0.008)), 40), metal, 2);
      const prato = new THREE.Group();
      prato.add(disco, costas);
      // aponta o eixo do prato (y local) para o sol
      prato.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sd);
      prato.position.set(0, 0.55, 0);
      g.add(prato);
      const pe = kit.m(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 8), metal, 2);
      pe.position.y = 0.275;
      g.add(pe);
      for (const a of [0, 2.1, 4.2]) {
        const perna = kit.m(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), metal, 1.5);
        perna.position.set(Math.cos(a) * 0.16, 0.2, Math.sin(a) * 0.16);
        perna.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        g.add(perna);
      }
      const foco = new THREE.Vector3(0, 0.55, 0).addScaledVector(sd, (R * R) / (4 * prof));
      const p = panela(0.1, 0.1);
      p.position.copy(foco).add(new THREE.Vector3(0, -0.05, 0));
      g.add(p);
      const haste = kit.m(new THREE.CylinderGeometry(0.01, 0.01, foco.distanceTo(new THREE.Vector3(0, 0.55, 0)), 6), metal, 1.2);
      haste.position.copy(foco).add(new THREE.Vector3(0, 0.55, 0)).multiplyScalar(0.5);
      haste.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sd);
      g.add(haste);
      g.position.set(x, 0.05, z);
      this.g.add(g);
      pontosVapor.push(p.position.clone().add(g.position).add(new THREE.Vector3(0, 0.14, 0)));
    };
    // 2) de painéis: funil de abas refletoras em volta da panela
    const paineis = (x: number, z: number, giro: number) => {
      const g = new THREE.Group();
      const base = kit.m(caixa(0.5, 0.03, 0.5), kit.mat({ color: d === "B" ? 0xc99a5a : 0xa98a5a, rough: 0.8 }), 2);
      base.position.y = 0.015;
      g.add(base);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const pn = kit.m(new THREE.BoxGeometry(0.46, 0.006, 0.42), espelho, 2);
        const piv = new THREE.Group();
        pn.position.set(0, 0, 0.21);
        piv.add(pn);
        piv.position.set(Math.sin(a) * 0.25, 0.03, Math.cos(a) * 0.25);
        piv.rotation.set(0, a, 0);
        pn.rotation.x = 0;
        piv.rotateX(-0.95);
        g.add(piv);
      }
      const p = panela(0.09, 0.1);
      p.position.y = 0.03;
      g.add(p);
      g.rotation.y = giro;
      g.position.set(x, 0.05, z);
      this.g.add(g);
      pontosVapor.push(new THREE.Vector3(x, 0.05 + 0.2, z));
    };
    // 3) de caixa de madeira: caixa com tampa de vidro e um refletor
    const caixaMadeira = (x: number, z: number, giro: number) => {
      const g = new THREE.Group();
      const mad = kit.mat({ map: texMadeira(d, d === "B" ? "#c48a50" : "#a8774a", "#6b4527", 3, 41), rough: 0.75 });
      const cx = kit.m(caixa(0.6, 0.26, 0.5, 0.01), mad);
      cx.position.y = 0.13;
      const vid = kit.m(new THREE.BoxGeometry(0.54, 0.006, 0.44), kit.mat({ vidro: true }), 0);
      vid.position.y = 0.265;
      const ref = kit.m(new THREE.BoxGeometry(0.6, 0.45, 0.008), espelho, 2);
      ref.position.set(0, 0.48, -0.31);
      ref.rotation.x = -0.35;
      g.add(cx, vid, ref);
      g.rotation.y = giro;
      g.position.set(x, 0.05, z);
      this.g.add(g);
    };
    parab(-1.55, 0.35);
    parab(1.7, 0.2);
    paineis(-0.55, 0.75, 0.3);
    paineis(0.65, 0.85, -0.2);
    caixaMadeira(0.05, 0.25, 0.1);
    caixaMadeira(-1.1, -0.15, -0.15);
    // vapor das panelas
    const R = rng(77);
    const n = 160;
    this.vb = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const p = pontosVapor[i % pontosVapor.length];
      this.vb.set([p.x, p.y, p.z, R.r()], i * 4);
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.vapor = new THREE.Points(gp, new THREE.PointsMaterial({ map: pontoSuave(), color: 0xffffff, size: 0.09, transparent: true, opacity: 0.35, depthWrite: false }));
    this.vapor.frustumCulled = false;
    this.vapor.userData.semProf = true;
    this.g.add(this.vapor);
  }
  aplica(t: number) {
    const p = this.vapor.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const s = this.vb[i * 4 + 3];
      const f = (t * 0.35 + s) % 1;
      p.setXYZ(i, this.vb[i * 4] + Math.sin(f * 6 + s * 9) * 0.04 * f, this.vb[i * 4 + 1] + f * 0.55, this.vb[i * 4 + 2] + Math.cos(f * 5 + s * 7) * 0.04 * f);
    }
    p.needsUpdate = true;
  }
}
