// Objetos de cena: churrasqueira (vítima que se repete), balde, escada de mão, martelo, mangueira, vibrador,
// carteira, vigota no ombro. Tudo em escala de brinquedo (pedreiro = 1 unidade).
import * as THREE from "three";
import { Kit, V3, esfera, cil, torno, perfil, caixa, tubo } from "./kit";

export type EstadoChurras = {
  vis?: boolean;
  p?: V3;
  rotY?: number;
  esmaga?: number; // 0..1 amassada
  tampa?: number; // tampa pulando (0..1)
  olhos?: number; // 0..1 (some quando enterrada)
  susto?: number; // olhos arregalados
  fumaca?: number; // churrasco no final
  carne?: number;
  incl?: number;
  aperta?: number; // olhos apertados (levou a pancada)
};

export class Churrasqueira {
  g = new THREE.Group();
  corpo = new THREE.Group();
  tampa = new THREE.Group();
  olhos = new THREE.Group();
  pupilas: THREE.Mesh[] = [];
  fumaca: THREE.Mesh[] = [];
  carne = new THREE.Group();
  constructor(public k: Kit) {
    const vermelho = k.mat({ color: "#C8322B", rough: 0.35, clear: 0.7 });
    const preto = k.mat({ color: "#26262A", rough: 0.5 });
    const metal = k.mat({ color: "#B9BEC4", rough: 0.3, metal: 0.8, liso: true });
    this.g.add(this.corpo);
    // bacia (meia esfera de baixo)
    const R = 0.21;
    k.m(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), vermelho, 3, this.corpo, [0, 0.4, 0]);
    k.m(new THREE.TorusGeometry(R, 0.012, 8, 48), metal, 2, this.corpo, [0, 0.4, 0], [Math.PI / 2, 0, 0]);
    // tampa (cúpula) com puxador
    this.corpo.add(this.tampa);
    this.tampa.position.y = 0.4;
    k.m(new THREE.SphereGeometry(R * 1.02, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), vermelho, 3, this.tampa, [0, 0.005, 0], undefined, [1, 0.92, 1]);
    k.m(caixa(0.12, 0.03, 0.04, 0.012), preto, 2, this.tampa, [0, R * 0.95, 0]);
    for (const s of [-1, 1]) k.m(cil(0.008, 0.008, 0.03, 8), metal, 1.5, this.tampa, [s * 0.04, R * 0.92 - 0.01, 0]);
    // respiro da tampa
    k.m(cil(0.03, 0.03, 0.008, 20), metal, 1.5, this.tampa, [0.06, R * 0.86, -0.07], [0.35, 0, -0.3]);
    // olhinhos na tampa (a vítima reage)
    this.tampa.add(this.olhos);
    const branco = k.mat({ color: "#ffffff", rough: 0.3, liso: true });
    const pupila = k.mat({ color: "#111111", rough: 0.3, liso: true });
    for (const s of [-1, 1]) {
      const o = k.m(esfera(0.042, 20, 14), branco, 2, this.olhos, [s * 0.055, 0.12, 0.16], undefined, [1, 1.15, 0.6]);
      const pu = k.m(esfera(0.02, 14, 10), pupila, 1, o, [0, -0.005, 0.035], undefined, [1, 1, 0.6]);
      this.pupilas.push(pu);
    }
    // alças laterais
    for (const s of [-1, 1]) k.m(caixa(0.025, 0.03, 0.08, 0.01), preto, 2, this.corpo, [s * (R + 0.02), 0.38, 0]);
    // pernas (3) + bandeja + rodinhas
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const top: V3 = [Math.sin(a) * 0.13, 0.28, Math.cos(a) * 0.13];
      const bot: V3 = [Math.sin(a) * 0.2, 0.0, Math.cos(a) * 0.2];
      k.m(tubo([top, bot], 0.011, 2, 8), metal, 1.5, this.corpo);
      if (i < 2) k.m(cil(0.035, 0.035, 0.02, 16), preto, 1.5, this.corpo, [bot[0], 0.035, bot[2]], [0, a, Math.PI / 2]);
    }
    k.m(cil(0.12, 0.12, 0.012, 24), metal, 1.5, this.corpo, [0, 0.11, 0]);
    // fumaça (algodão) e carne em cima da grelha (aparece no final com a tampa aberta)
    const fum = k.mat({ color: "#F2EEE8", rough: 1, semContorno: false });
    for (let i = 0; i < 6; i++) {
      const f = k.m(new THREE.IcosahedronGeometry(0.06, 2), fum, 1.5, this.g);
      f.castShadow = false;
      this.fumaca.push(f);
    }
    this.corpo.add(this.carne);
    const ling = k.mat({ color: "#9E3A22", rough: 0.45, clear: 0.6 });
    for (let i = 0; i < 4; i++) k.m(new THREE.CapsuleGeometry(0.022, 0.12, 6, 12), ling, 1.5, this.carne, [-0.09 + i * 0.06, 0.43, 0], [Math.PI / 2, 0, 0]);
    k.m(cil(R * 0.95, R * 0.95, 0.006, 32), metal, 1, this.carne, [0, 0.405, 0]);
  }

  aplica(e: EstadoChurras, t: number) {
    this.g.visible = e.vis !== false;
    if (!this.g.visible) return;
    const p = e.p ?? [0, 0, 0];
    this.g.position.set(...p);
    this.g.rotation.set(0, e.rotY ?? 0, e.incl ?? 0);
    const es = e.esmaga ?? 0;
    this.corpo.scale.set(1 + 0.45 * es, 1 - 0.62 * es, 1 + 0.45 * es);
    const tp = e.tampa ?? 0;
    this.tampa.position.y = 0.4 + tp * 0.18;
    this.tampa.rotation.z = tp * 0.4;
    const ab = e.carne ?? 0; // tampa aberta para o churrasco: vai para trás
    if (ab > 0) { this.tampa.position.set(0, 0.4 + 0.05 * ab, -0.22 * ab); this.tampa.rotation.x = -1.35 * ab; }
    else { this.tampa.position.x = this.tampa.position.z = 0; this.tampa.rotation.x = 0; }
    this.carne.visible = ab > 0.3;
    const ol = e.olhos ?? 1;
    this.olhos.visible = ol > 0.02;
    const su = e.susto ?? 0;
    const ap = e.aperta ?? 0;
    this.olhos.scale.set(ol * (1 + 0.35 * su), ol * (1 + 0.35 * su) * (1 - 0.75 * ap), ol * (1 + 0.35 * su));
    for (const pu of this.pupilas) pu.scale.set(1 - 0.45 * su, 1 - 0.45 * su, 0.6);
    const fm = e.fumaca ?? 0;
    this.fumaca.forEach((f, i) => {
      const c = ((t * 0.45 + i / this.fumaca.length) % 1);
      f.visible = fm > 0.01;
      f.position.set(Math.sin(i * 2.1 + t) * 0.05 + c * 0.06, 0.6 + c * 0.65, Math.cos(i * 1.7) * 0.04);
      f.scale.setScalar(fm * (0.5 + c * 1.6) * (1 - Math.pow(c, 3)));
    });
  }
}

export class Balde {
  g = new THREE.Group();
  massa: THREE.Mesh;
  constructor(k: Kit, cor = "#3A3D42") {
    const b = k.mat({ color: cor, rough: 0.45, clear: 0.4 });
    const pr = perfil([[0.085, 0], [0.09, 0.02], [0.1, 0.1], [0.11, 0.17], [0.115, 0.18]], 10);
    const ext = torno(pr, 32);
    ext.computeVertexNormals();
    const balde = k.m(ext, b, 2.5, this.g);
    (balde.material as THREE.Material).side = THREE.DoubleSide;
    k.m(cil(0.085, 0.085, 0.01, 32), b, 1.5, this.g, [0, 0.005, 0]);
    k.m(new THREE.TorusGeometry(0.115, 0.009, 8, 32), b, 1.5, this.g, [0, 0.18, 0], [Math.PI / 2, 0, 0]);
    k.m(new THREE.TorusGeometry(0.11, 0.006, 6, 24, Math.PI), k.mat({ color: "#9aa0a6", metal: 0.8, rough: 0.3, liso: true }), 1.5, this.g, [0, 0.18, 0], [0, 0, 0]);
    this.massa = k.m(cil(0.105, 0.105, 0.02, 24), k.mat({ color: "#9C9A94", rough: 0.9 }), 1.5, this.g, [0, 0.15, 0]);
  }
}

/** escada de mão de madeira (apoiada: base em y=0, topo em y = alt, inclinada para -z) */
export function escadaMao(k: Kit, alt = 1.9, larg = 0.42, degraus = 7) {
  const g = new THREE.Group();
  const mad = k.mat({ color: "#C98B4A", rough: 0.7 });
  for (const s of [-1, 1]) k.m(caixa(0.045, alt, 0.05, 0.012), mad, 2.5, g, [s * larg / 2, alt / 2, 0]);
  for (let i = 1; i <= degraus; i++) k.m(cil(0.018, 0.018, larg, 10), mad, 2, g, [0, (i / (degraus + 1)) * alt, 0], [0, 0, Math.PI / 2]);
  return g;
}

export function martelo(k: Kit) {
  const g = new THREE.Group();
  k.m(caixa(0.03, 0.2, 0.03, 0.01), k.mat({ color: "#C98B4A", rough: 0.7 }), 2, g, [0, 0.0, 0]);
  k.m(caixa(0.11, 0.045, 0.045, 0.01), k.mat({ color: "#5d6168", metal: 0.8, rough: 0.35 }), 2, g, [0.02, 0.11, 0]);
  return g;
}

/** carteira aberta e vazia (com uma mariposa saindo) */
export function carteira(k: Kit) {
  const g = new THREE.Group();
  const couro = k.mat({ color: "#6B3E22", rough: 0.6 });
  k.m(caixa(0.13, 0.09, 0.012, 0.01), couro, 2, g, [-0.065, 0, 0], [0, 0.35, 0]);
  k.m(caixa(0.13, 0.09, 0.012, 0.01), couro, 2, g, [0.065, 0, 0], [0, -0.35, 0]);
  const asa = k.mat({ color: "#D8D2C2", rough: 0.9, lado: THREE.DoubleSide });
  const mar = new THREE.Group();
  for (const s of [-1, 1]) k.m(new THREE.CircleGeometry(0.03, 10), asa, 1, mar, [s * 0.025, 0, 0], [0, s * 0.6, 0], [1.2, 0.8, 1]);
  k.m(new THREE.CapsuleGeometry(0.006, 0.03, 4, 8), k.mat({ color: "#7a6a58", rough: 0.9 }), 1, mar);
  mar.name = "mariposa";
  g.add(mar);
  return g;
}

/** vibrador de concreto: motor + mangote + agulha */
export function vibrador(k: Kit) {
  const g = new THREE.Group();
  const amarelo = k.mat({ color: "#F2B32F", rough: 0.45, clear: 0.4 });
  const preto = k.mat({ color: "#26262A", rough: 0.6 });
  const motor = new THREE.Group();
  motor.name = "motor";
  k.m(caixa(0.22, 0.16, 0.16, 0.03), amarelo, 2.5, motor, [0, 0.08, 0]);
  k.m(cil(0.05, 0.05, 0.17, 20), preto, 2, motor, [0, 0.09, 0], [0, 0, Math.PI / 2]);
  k.m(caixa(0.26, 0.02, 0.2, 0.01), preto, 2, motor, [0, 0.01, 0]);
  g.add(motor);
  const agulha = new THREE.Group();
  agulha.name = "agulha";
  k.m(cil(0.022, 0.022, 0.3, 14), k.mat({ color: "#8f959c", metal: 0.8, rough: 0.35, liso: true }), 2, agulha, [0, -0.15, 0]);
  k.m(cil(0.03, 0.03, 0.08, 14), preto, 2, agulha, [0, 0.02, 0]);
  g.add(agulha);
  return g;
}
