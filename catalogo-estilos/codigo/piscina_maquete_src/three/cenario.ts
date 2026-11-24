// Quintal: casa ao fundo, casa de máquinas ao lado da piscina (bomba + filtro de areia), encanamento no plano do
// corte (ralo -> bomba -> filtro -> retorno), árvores e a base de cada direção (A mesa de madeira, B ilha
// flutuante, C quintal amplo com muro).
import * as THREE from "three";
import type { Kit } from "./kit";
import { texMadeira, texReboco } from "./tex";
import { texTelha, texRebocoCinza, texConcreto } from "./texp";
import { caixaEntre } from "./piscina";
import { rng } from "./rng";
import { PIS, EXT } from "./terreno";

export const CM = { x0: 3.2, x1: 4.4, z0: -0.6, z1: 0.6, h: 1.05 }; // casa de máquinas
export const FILTRO = new THREE.Vector3(4.03, 0, 0);
export const BOMBA = new THREE.Vector3(3.53, 0, -0.22);
const R_CANO = 0.065, R_AGUA = 0.046;

/** caminho poligonal com cantos arredondados */
function caminho(pts: [number, number, number][], raio = 0.12) {
  const v = pts.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath<THREE.Vector3>();
  let ini = v[0].clone();
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i].clone().sub(v[i - 1]).normalize(), b = v[i + 1].clone().sub(v[i]).normalize();
    const r = Math.min(raio, v[i].distanceTo(v[i - 1]) / 2, v[i].distanceTo(v[i + 1]) / 2);
    const p0 = v[i].clone().addScaledVector(a, -r), p1 = v[i].clone().addScaledVector(b, r);
    path.add(new THREE.LineCurve3(ini, p0));
    path.add(new THREE.QuadraticBezierCurve3(p0, v[i].clone(), p1));
    ini = p1;
  }
  path.add(new THREE.LineCurve3(ini, v[v.length - 1]));
  return path;
}

export class Cenario {
  g = new THREE.Group();
  casa = new THREE.Group();
  maq = new THREE.Group(); // casa de máquinas (paredes)
  maqTeto = new THREE.Group();
  filtro = new THREE.Group();
  bomba = new THREE.Group();
  canos = new THREE.Group();
  aguaRalo = new THREE.Group();
  aguaRet = new THREE.Group();
  arvores = new THREE.Group();
  base = new THREE.Group();
  caminhos: { ralo: THREE.CurvePath<THREE.Vector3>[]; ret: THREE.CurvePath<THREE.Vector3>[] } = { ralo: [], ret: [] };
  mesa?: THREE.Mesh;

  constructor(public kit: Kit, larg: { x: [number, number]; z: [number, number] }) {
    const d = kit.dir;
    const C = d === "C";
    // ------------------------------------------------ casa ao fundo
    const reb = texReboco(d);
    const mParede = kit.mat({ map: reb, rough: 0.85, bump: C ? reb : null, bumpS: 0.6 });
    const telha = texTelha(d);
    const mTelha = kit.mat({ map: telha, rough: 0.7, bump: C ? telha : null, bumpS: 1.2 });
    const mJanela = kit.mat({ color: d === "B" ? 0x7ec8f0 : 0x9fc4d8, rough: 0.08, metal: d === "B" ? 0 : 0.2, clear: 1 });
    const mBatente = kit.mat({ color: 0xf4efe6, rough: 0.5 });
    const mPorta = kit.mat({ color: d === "B" ? 0x3d8fd0 : 0x2f6f9a, rough: 0.55 });
    const cx = -0.6, cz = -3.55, cw = 4.6, cp = 1.8, ch = 2.35;
    const corpo = kit.m(caixaEntre([cx - cw / 2, 0, cz - cp / 2], [cx + cw / 2, ch, cz + cp / 2], 1.2, 1.2), mParede);
    this.casa.add(corpo);
    // telhado de duas águas (ao longo de x)
    const rr = new THREE.Shape();
    rr.moveTo(-cp / 2 - 0.35, 0);
    rr.lineTo(cp / 2 + 0.35, 0);
    rr.lineTo(0, 1.05);
    rr.lineTo(-cp / 2 - 0.35, 0);
    const tg = new THREE.ExtrudeGeometry(rr, { depth: cw + 0.5, bevelEnabled: false });
    tg.translate(0, 0, -(cw + 0.5) / 2);
    tg.rotateY(Math.PI / 2);
    const tel = kit.m(tg, mTelha);
    tel.position.set(cx, ch, cz);
    this.casa.add(tel);
    const zf = cz + cp / 2 + 0.005;
    for (const xj of [cx - 1.5, cx + 1.2]) {
      const j = kit.m(new THREE.BoxGeometry(0.9, 0.75, 0.04), mJanela, 2);
      j.position.set(xj, 1.35, zf);
      const bt = kit.m(new THREE.BoxGeometry(1.02, 0.08, 0.08), mBatente, 2);
      bt.position.set(xj, 0.94, zf + 0.02);
      const cruz = kit.m(new THREE.BoxGeometry(0.04, 0.75, 0.05), mBatente, 1.5);
      cruz.position.set(xj, 1.35, zf + 0.01);
      this.casa.add(j, bt, cruz);
    }
    const porta = kit.m(new THREE.BoxGeometry(0.8, 1.75, 0.05), mPorta, 2);
    porta.position.set(cx - 0.15, 0.875, zf);
    const degrau = kit.m(caixaEntre([cx - 0.65, 0, zf - 0.02], [cx + 0.35, 0.12, zf + 0.35]), kit.mat({ color: 0xc9bfae, rough: 0.8 }));
    this.casa.add(porta, degrau);

    // ------------------------------------------------ casa de máquinas (paredes fechadas para o corte)
    const rc = texRebocoCinza(d);
    const mMaq = kit.mat({ map: rc, rough: 0.9, bump: C ? rc : null, bumpS: 0.6 });
    const e = 0.08;
    const { x0, x1, z0, z1, h } = CM;
    for (const [a, b] of [
      [[x0, -0.12, z0], [x1, 0.0, z1]], // piso
      [[x0, 0, z0], [x1, h, z0 + e]], // fundo
      [[x0, 0, z1 - e], [x1, h, z1]], // frente
      [[x0, 0, z0 + e], [x0 + e, h, z1 - e]], // lado esq.
      [[x1 - e, 0, z0 + e], [x1, h, z1 - e]], // lado dir.
    ] as [number, number, number][][])
      this.maq.add(kit.m(caixaEntre(a as [number, number, number], b as [number, number, number], 1, 1), mMaq));
    const teto = kit.m(caixaEntre([x0 - 0.08, h, z0 - 0.08], [x1 + 0.08, h + 0.08, z1 + 0.08], 1, 1), kit.mat({ map: texConcreto(d), rough: 0.85 }));
    this.maqTeto.add(teto);
    const portaM = kit.m(new THREE.BoxGeometry(0.5, 0.78, 0.03), kit.mat({ color: d === "B" ? 0x6bbf59 : 0x5a8f4c, rough: 0.6 }), 2);
    portaM.position.set((x0 + x1) / 2 + 0.15, 0.4, z1 + 0.016);
    this.maq.add(portaM);

    // filtro de areia (tanque azul com tampa e válvula em cima)
    const mTanque = kit.mat({ color: d === "B" ? 0x2f86d6 : 0x2a6fb0, rough: 0.35, clear: 0.6 });
    const mCinza = kit.mat({ color: 0x5f666d, rough: 0.45, metal: d === "B" ? 0 : 0.5 });
    const tq = kit.m(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 40), mTanque);
    tq.position.y = 0.38;
    const domo = kit.m(new THREE.SphereGeometry(0.22, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), mTanque);
    domo.position.y = 0.68;
    const pe = kit.m(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 40), mCinza);
    pe.position.y = 0.04;
    const valv = kit.m(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 24), mCinza, 2);
    valv.position.y = 0.93;
    this.filtro.add(tq, domo, pe, valv);
    this.filtro.position.copy(FILTRO);
    // bomba (motor deitado + caracol)
    const mBomba = kit.mat({ color: d === "B" ? 0xe8e4dc : 0xd9d6cf, rough: 0.4, clear: 0.4 });
    const motor = kit.m(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 32), mCinza);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(-0.05, 0.2, 0);
    const caracol = kit.m(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 32), mBomba);
    caracol.rotation.z = Math.PI / 2;
    caracol.position.set(0.17, 0.2, 0);
    const base = kit.m(new THREE.BoxGeometry(0.46, 0.06, 0.22), mCinza);
    base.position.y = 0.03;
    this.bomba.add(motor, caracol, base);
    this.bomba.position.copy(BOMBA);

    // ------------------------------------------------ encanamento (no plano z = 0, para aparecer no corte)
    const yRalo = -1.86, yRet = -0.55;
    const ralo = [
      caminho([[-1.3, -1.62, -0.32], [-1.3, yRalo, -0.32], [-1.3, yRalo, 0], [BOMBA.x - 0.22, yRalo, 0], [BOMBA.x - 0.22, 0.2, 0], [BOMBA.x - 0.22, 0.2, -0.12]]),
      caminho([[1.3, -1.62, -0.32], [1.3, yRalo, -0.32], [1.3, yRalo, 0.0]]),
    ];
    const ret = [caminho([[FILTRO.x, 0.1, 0], [FILTRO.x, yRet, 0], [PIS.L / 2 - 0.02, yRet, 0]])];
    const pump2filtro = caminho([[BOMBA.x + 0.24, 0.2, -0.22], [BOMBA.x + 0.24, 0.98, -0.22], [FILTRO.x, 0.98, -0.22], [FILTRO.x, 0.98, 0]]);
    this.caminhos = { ralo: [...ralo], ret: [...ret, pump2filtro] };
    const mPvc = kit.mat({ color: d === "B" ? 0xf2f2ee : 0xe9e7e0, rough: 0.4, clear: 0.3 });
    const invis = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (const p of [...ralo, ...ret, pump2filtro]) this.canos.add(kit.m(new THREE.TubeGeometry(p, 160, R_CANO, 18, false), mPvc, 2));
    for (const p of ralo) this.aguaRalo.add(new THREE.Mesh(new THREE.TubeGeometry(p, 160, R_AGUA, 14, false), invis));
    for (const p of [...ret, pump2filtro]) this.aguaRet.add(new THREE.Mesh(new THREE.TubeGeometry(p, 160, R_AGUA, 14, false), invis));
    // tampas nas pontas dos tubos (para fechar o sólido do corte)
    for (const [grp, r, m] of [[this.canos, R_CANO, mPvc], [this.aguaRalo, R_AGUA, invis], [this.aguaRet, R_AGUA, invis]] as const)
      for (const p of grp === this.canos ? [...ralo, ...ret, pump2filtro] : grp === this.aguaRalo ? ralo : [...ret, pump2filtro])
        for (const u of [0, 1]) {
          const c = new THREE.Mesh(new THREE.SphereGeometry(r as number, 12, 8), m as THREE.Material);
          c.position.copy(p.getPointAt(u));
          (grp as THREE.Group).add(c);
        }

    // ------------------------------------------------ árvores e arbustos
    const R = rng(13);
    const mTronco = kit.mat({ color: d === "B" ? 0x8a5a36 : 0x6e4a30, rough: 0.9 });
    const verdes = d === "B" ? [0x55b544, 0x4aa63c, 0x66c24f] : [0x4f8f3a, 0x5c9c42, 0x447f33];
    const arvore = (x: number, z: number, s: number) => {
      const a = new THREE.Group();
      const tr = kit.m(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 1.2 * s, 12), mTronco);
      tr.position.y = 0.6 * s;
      a.add(tr);
      const nb = d === "C" ? 7 : 3;
      for (let i = 0; i < nb; i++) {
        const r = (d === "C" ? 0.42 : 0.55) * s * (0.8 + R.r() * 0.4);
        const geo = d === "C" ? folhagem(r, i + 3) : new THREE.SphereGeometry(r, 28, 18);
        const f = kit.m(geo, kit.mat({ color: verdes[i % 3], rough: 0.85 }));
        f.position.set((R.r() - 0.5) * 0.6 * s, 1.35 * s + (R.r() - 0.2) * 0.45 * s, (R.r() - 0.5) * 0.5 * s);
        a.add(f);
      }
      a.position.set(x, 0, z);
      this.arvores.add(a);
    };
    arvore(-3.75, -2.6, 1.15);
    arvore(3.55, -3.3, 1.0);
    arvore(-4.0, 1.9, 0.75);
    if (d === "C") {
      arvore(6.2, -5.5, 1.5);
      arvore(-7.0, -6.2, 1.7);
      arvore(-6.5, 3.0, 1.3);
    }
    // arbustos na frente da casa
    for (const [x, z, s] of [[-2.6, -2.45, 0.32], [1.3, -2.5, 0.28], [2.0, -2.45, 0.24], [-4.0, -0.6, 0.3]] as [number, number, number][]) {
      const b = kit.m(d === "C" ? folhagem(s, Math.round(x * 10)) : new THREE.SphereGeometry(s, 24, 14), kit.mat({ color: verdes[1], rough: 0.85 }));
      b.position.set(x, s * 0.7, z);
      b.scale.y = 0.8;
      this.arvores.add(b);
    }

    // ------------------------------------------------ base por direção
    if (d === "A") {
      // tábua sob o terreno + mesa de madeira
      const mad = texMadeira("A", "#a8754a", "#7a4e2e", 4, 17);
      const mTab = kit.mat({ map: mad, rough: 0.55, clear: 0.3 });
      const tab = kit.m(caixaEntre([larg.x[0] - 0.12, -2.98, larg.z[0] - 0.12], [larg.x[1] + 0.12, -2.8, larg.z[1] + 0.12], 2.2, 2.2), mTab);
      const madM = texMadeira("A", "#7a5034", "#4f3020", 6, 23);
      madM.repeat.set(4, 4);
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(70, 70).rotateX(-Math.PI / 2), kit.mat({ map: madM, rough: 0.5, clear: 0.35 }));
      mesa.position.y = -2.98;
      mesa.receiveShadow = true;
      this.mesa = mesa;
      this.base.add(tab, mesa);
    } else if (d === "C") {
      // muro do quintal e gramado em volta (o terreno do corte é largo nesta direção)
      const mMuro = kit.mat({ map: texReboco("C"), rough: 0.9, bump: texReboco("C"), bumpS: 0.5 });
      for (const [a, b] of [
        [[-8, 0, -7.2], [8, 2.0, -7.0]],
        [[-8, 0, -7.0], [-7.8, 2.0, 6]],
        [[7.8, 0, -7.0], [8, 2.0, 6]],
      ] as [number, number, number][][])
        this.base.add(kit.m(caixaEntre(a as [number, number, number], b as [number, number, number], 2, 2), mMuro));
    }
    this.g.add(this.casa, this.maq, this.maqTeto, this.filtro, this.bomba, this.canos, this.aguaRalo, this.aguaRet, this.arvores, this.base);
  }
}

/** folhagem: icosaedro com ruído (copa orgânica) */
function folhagem(r: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(r, 4);
  const p = g.getAttribute("position");
  const R = rng(seed + 100);
  const f = [R.r() * 6, R.r() * 6, R.r() * 6];
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9 + f[0]) * Math.sin(v.y * 8 + f[1]) * Math.sin(v.z * 10 + f[2]);
    const n2 = Math.sin(v.x * 23 + f[1]) * Math.sin(v.y * 21 + f[2]) * Math.sin(v.z * 25 + f[0]);
    v.multiplyScalar(1 + n * 0.16 + n2 * 0.06);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export { EXT };
