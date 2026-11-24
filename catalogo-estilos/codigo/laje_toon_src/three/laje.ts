// Tudo o que é montado em cima das paredes: forma de tábuas, concreto fresco, escoras, laje maciça (armadura, trinca,
// setas de força, bolhas), laje treliçada (vigotas + treliça + isopor + capa), cinta, mureta e ralo.
// Vão da laje ao longo de x (de parede lateral a parede lateral): a barriga aparece de frente para a câmera.
import * as THREE from "three";
import { Kit, V3, caixa, cil, esfera } from "./kit";
import { IX, IZ, E, HP } from "./casa";
import { texMadeira, texSeca } from "./tex";

/** barriga da laje/tábua em x (0 nos apoios, 1 no meio) */
export const barriga = (x: number) => { const u = Math.min(1, Math.abs(x) / IX); return 1 - u * u; };

/** malha deformável: guarda os vértices originais (em coordenadas do pai) e aplica y -= A·barriga(x) */
class Deform {
  base: Float32Array;
  constructor(public me: THREE.Mesh, public ox = 0) {
    const p = me.geometry.attributes.position as THREE.BufferAttribute;
    this.base = new Float32Array(p.array as Float32Array);
  }
  aplica(A: number, extra?: (x: number, y: number, z: number) => number) {
    const p = this.me.geometry.attributes.position as THREE.BufferAttribute;
    const b = this.base;
    const px = this.me.position.x + this.ox;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1], z = b[i * 3 + 2];
      p.setY(i, y - A * barriga(x + px) + (extra ? extra(x + px, y, z) : 0));
    }
    p.needsUpdate = true;
    this.me.geometry.computeVertexNormals();
    this.me.geometry.computeBoundingSphere();
  }
}

export type EstadoLaje = {
  // forma
  tabuas?: number; // quantas tábuas pregadas (fracionário: a última entrando)
  tabVerga?: number; // barriga das tábuas (0..1)
  tabQuebra?: number; // 0..1 as metades giram nos apoios e caem
  concForma?: number; // 0..1 concreto fresco em cima das tábuas
  escoras?: number; // quantas escoras em pé (fracionário: quique)
  escoraTira?: number; // 0..1 a escora do meio sendo puxada
  escorasSai?: number; // 0..1 todas as escoras saindo (fim)
  // laje maciça (corte da armadura e do vibrador)
  macica?: number; // 0..1 visível
  macEsp?: number; // espessura (1 = normal; 1,8 = laje maciça pesada)
  laVerga?: number; // barriga da laje (0..1)
  aco?: number; // 0..1 barras entrando por baixo
  trinca?: number; // 0..1 trinca abrindo de baixo para cima
  setas?: number; // 0..1 setas de força
  bolhas?: number; // 0..1 bolhas dentro do concreto
  bolhasSobe?: number; // 0..1 bolhas subindo e saindo
  // laje treliçada
  vigotas?: number; // quantas vigotas (fracionário)
  blocos?: number; // 0..1 fileiras de isopor encaixadas
  capa?: number; // 0..1 capa de concreto
  molhada?: number; // 0..1 a capa escura e lisa (cura)
  seca?: number; // 0..1 rachada de seca
  // cinta, mureta, ralo
  cinta?: number; // 0..1 corre em volta das paredes
  mureta?: number; // 0..1
  ralo?: number; // 0..1
};

const NT = 9; // tábuas
const LT = 2 * (IX + E); // comprimento da tábua
export const ESCORAS: [number, number][] = [];
for (const z of [-0.7, 0, 0.7]) for (const x of [-0.98, -0.33, 0.33, 0.98]) ESCORAS.push([x, z]);
export const VIGOTAS_Z = [-0.86, -0.43, 0, 0.43, 0.86];

export class Laje {
  g = new THREE.Group();
  // forma
  tabuas: { g: THREE.Group; meias: [THREE.Group, THREE.Group]; d: Deform[] }[] = [];
  concForma: { g: THREE.Group; d: Deform }[] = [];
  escoras: THREE.Group[] = [];
  guias: THREE.Mesh[] = [];
  // maciça
  macica = new THREE.Group();
  macMesh: THREE.Mesh;
  macD: Deform;
  aco = new THREE.Group();
  acoBarras: THREE.Mesh[] = [];
  trinca: THREE.Mesh;
  setas = new THREE.Group();
  bolhas: THREE.Mesh[] = [];
  bolhaDados: { x: number; y: number; r: number; f: number }[] = [];
  // treliçada
  trelica = new THREE.Group();
  vigotas: THREE.Group[] = [];
  vigD: Deform[] = [];
  blocos: THREE.Mesh[] = [];
  blocoD: Deform[] = [];
  capa: THREE.Mesh;
  capaD: Deform;
  matCapa: THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
  corCapa = new THREE.Color();
  corMolhada = new THREE.Color();
  seca: THREE.Mesh;
  // cinta, mureta, ralo
  cinta: THREE.Mesh[] = [];
  mureta = new THREE.Group();
  ralo = new THREE.Group();
  zCorte = 0.0; // z onde ficam a barra de aço e as bolhas visíveis no corte
  matConcreto: THREE.Material;
  matConcretoMole: THREE.Material;

  constructor(public k: Kit) {
    const d = k.dir;
    const B = d === "B";
    const mad = k.mat({ map: texMadeira(d), rough: 0.7 });
    const madEsc = k.mat({ map: texMadeira(d, true), rough: 0.7 });
    this.matConcreto = k.mat({ color: B ? "#C2BFB8" : "#A9A69F", rough: 0.85 });
    this.matConcretoMole = k.mat({ color: B ? "#A3A19B" : "#86847E", rough: d === "A" ? 0.22 : 0.5, clear: d === "A" ? 0.85 : 0.2 });
    const espT = 0.035, larT = 2 * IZ / NT - 0.012;

    // ---------------------------------------------------------------- tábuas (duas metades por tábua, pivô no apoio)
    for (let i = 0; i < NT; i++) {
      const z = -IZ + (i + 0.5) * (2 * IZ / NT);
      const g = new THREE.Group();
      g.position.set(0, HP + espT / 2, z);
      const metades: THREE.Group[] = [];
      const ds: Deform[] = [];
      for (const s of [-1, 1]) {
        const piv = new THREE.Group(); // pivô na ponta de dentro do apoio
        piv.position.set(s * IX, 0, 0);
        const geo = new THREE.BoxGeometry(LT / 2, espT, larT, 18, 1, 1);
        // a metade vai do apoio (x = s·IX) até o meio (x = 0) e além do apoio até a face externa
        geo.translate(-s * (LT / 4 - E), 0, 0);
        const me = k.m(geo, i % 3 === 1 ? madEsc : mad, 2.5, piv, undefined, undefined, undefined, false);
        ds.push(new Deform(me, s * IX));
        g.add(piv);
        metades.push(piv);
      }
      this.g.add(g);
      this.tabuas.push({ g, meias: metades as [THREE.Group, THREE.Group], d: ds });
    }
    // concreto fresco em cima da forma (duas metades que acompanham as tábuas)
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * IX, HP + espT, 0);
      const geo = new THREE.BoxGeometry(LT / 2, 0.12, 2 * IZ + 2 * E, 18, 1, 6);
      geo.translate(-s * (LT / 4 - E), 0.06, 0);
      const me = k.m(geo, this.matConcretoMole, 3, g, undefined, undefined, undefined, false);
      this.concForma.push({ g, d: new Deform(me, s * IX) });
      this.g.add(g);
    }

    // ---------------------------------------------------------------- escoras (pau roliço) + guias (vigas de madeira sob a forma)
    const pau = k.mat({ color: B ? "#C99A62" : "#A87B4C", rough: 0.85 });
    for (const [x, z] of ESCORAS) {
      const e = new THREE.Group();
      e.position.set(x, 0.03, z);
      k.m(cil(0.034, 0.04, HP - 0.1, 12), pau, 2.5, e, [0, (HP - 0.1) / 2, 0]);
      k.m(caixa(0.16, 0.025, 0.12, 0.008), madEsc, 1.5, e, [0, 0.012, 0]); // calço no chão
      this.escoras.push(e);
      this.g.add(e);
    }
    for (const z of [-0.7, 0, 0.7]) this.guias.push(k.m(caixa(2 * IX - 0.04, 0.06, 0.08, 0.01), madEsc, 2, this.g, [0, HP - 0.035, z]));

    // ---------------------------------------------------------------- laje maciça (sólido fechado para o corte)
    const geoM = new THREE.BoxGeometry(2 * (IX + E), 0.16, 2 * (IZ + E), 28, 1, 4);
    geoM.translate(0, 0.08, 0);
    this.macMesh = k.m(geoM, this.matConcreto, 3, this.macica, undefined, undefined, undefined, false);
    this.macD = new Deform(this.macMesh);
    this.macica.position.y = HP;
    this.g.add(this.macica);
    // barras de aço (embaixo; uma fileira passa exatamente no plano do corte)
    const ferro = k.mat({ color: B ? "#B5562E" : "#7E3F22", rough: 0.6, metal: 0.4 });
    for (const z of [-0.9, -0.45, 0, 0.45, 0.9]) {
      const b = k.m(cil(0.016, 0.016, 2 * IX + 0.2, 10), ferro, 2, this.aco, [0, 0.035, z + this.zCorte], [0, 0, Math.PI / 2], undefined, false);
      this.acoBarras.push(b);
    }
    this.macica.add(this.aco);
    // trinca: cunha escura na frente da tampa do corte (abre de baixo para cima)
    const sh = new THREE.Shape();
    sh.moveTo(-0.5, 0); sh.lineTo(-0.12, 0.35); sh.lineTo(0.08, 0.62); sh.lineTo(-0.05, 1.0); sh.lineTo(0.05, 0.6); sh.lineTo(0.14, 0.32); sh.lineTo(0.5, 0); sh.lineTo(-0.5, 0);
    this.trinca = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0x1a0f0c, side: THREE.DoubleSide }));
    this.trinca.userData.semArame = true;
    this.trinca.renderOrder = 3000;
    (this.trinca.material as THREE.Material).depthTest = false;
    this.g.add(this.trinca);
    // setas de força (vermelhas): em cima apertando (para o meio), embaixo esticando (para fora)
    const verm = k.mat({ color: "#E5352B", rough: 0.4, emis: "#E5352B", emisI: 0.25 });
    const seta = () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0.05); s.lineTo(0.22, 0.05); s.lineTo(0.22, 0.11); s.lineTo(0.36, 0); s.lineTo(0.22, -0.11); s.lineTo(0.22, -0.05); s.lineTo(0, -0.05); s.lineTo(0, 0.05);
      return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
    };
    for (const [x, y, ang] of [[-0.62, 0.36, 0], [0.62, 0.36, Math.PI], [-0.2, -0.13, Math.PI], [0.2, -0.13, 0]] as V3[]) {
      const g = new THREE.Group();
      g.position.set(x, HP + y, 0);
      g.rotation.z = ang;
      const me = k.m(seta(), verm, 3, g, [0, 0, 0]);
      me.castShadow = false;
      g.userData.base = [x, y, ang];
      this.setas.add(g);
    }
    this.setas.userData.semArame = true;
    this.g.add(this.setas);
    // bolhas de ar dentro do concreto (só aparecem no corte)
    const ar = k.mat({ color: "#2B2F36", rough: 0.4, liso: true });
    for (let i = 0; i < 16; i++) {
      const x = -1.3 + (i / 15) * 2.6 + Math.sin(i * 7.1) * 0.06;
      const r = 0.018 + ((i * 37) % 7) * 0.004;
      const y = 0.035 + ((i * 53) % 9) / 9 * 0.09;
      const b = k.m(esfera(r, 14, 10), ar, 1.5, this.macica, [x, y, this.zCorte], undefined, undefined, false);
      this.bolhas.push(b);
      this.bolhaDados.push({ x, y, r, f: ((i * 29) % 11) / 11 });
    }

    // ---------------------------------------------------------------- laje treliçada: vigotas (concreto + treliça) e isopor
    this.g.add(this.trelica);
    this.trelica.position.y = HP;
    const aco2 = k.mat({ color: B ? "#9A9EA4" : "#7d8188", rough: 0.4, metal: 0.8, liso: true });
    for (const z of VIGOTAS_Z) {
      const v = new THREE.Group();
      v.position.set(0, 0, z);
      const sapata = k.m(new THREE.BoxGeometry(2 * IX + 2 * E, 0.04, 0.12, 24, 1, 1).translate(0, 0.02, 0), this.matConcreto, 2.5, v, undefined, undefined, undefined, false);
      this.vigD.push(new Deform(sapata));
      // treliça: banzo de cima + diagonais em zigue-zague
      const tre = new THREE.Group();
      k.m(cil(0.008, 0.008, 2 * IX + 0.2, 6), aco2, 1, tre, [0, 0.12, 0], [0, 0, Math.PI / 2]);
      for (let i = 0; i < 18; i++) {
        const x0 = -IX - 0.1 + (i / 18) * (2 * IX + 0.2), x1 = x0 + (2 * IX + 0.2) / 18;
        for (const s of [-1, 1]) {
          const a = new THREE.Vector3(i % 2 ? x1 : x0, 0.04, s * 0.035), b = new THREE.Vector3(i % 2 ? x0 : x1, 0.12, 0);
          const len = a.distanceTo(b);
          const m = k.m(cil(0.006, 0.006, len, 5), aco2, 0.8, tre);
          m.position.copy(a).add(b).multiplyScalar(0.5);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        }
      }
      tre.name = "trelica";
      v.add(tre);
      this.vigotas.push(v);
      this.trelica.add(v);
    }
    // blocos de isopor entre as vigotas (fileiras em x)
    const eps = k.mat({ color: "#F4F4F0", rough: 0.9 });
    for (let r = 0; r < VIGOTAS_Z.length - 1; r++) {
      const z = (VIGOTAS_Z[r] + VIGOTAS_Z[r + 1]) / 2;
      const nB = 9;
      for (let i = 0; i < nB; i++) {
        const x = -IX + (i + 0.5) * (2 * IX / nB);
        const me = k.m(new THREE.BoxGeometry(2 * IX / nB - 0.015, 0.1, 0.42 - 0.13, 3, 1, 1).translate(0, 0.07, 0), eps, 2, this.trelica, [x, 0, z], undefined, undefined, false);
        me.userData.ordem = r * nB + i;
        this.blocos.push(me);
        this.blocoD.push(new Deform(me));
      }
    }
    // capa de concreto
    this.matCapa = this.k.mat({ color: B ? "#C2BFB8" : "#A9A69F", rough: 0.85 }) as THREE.MeshStandardMaterial;
    this.corCapa.copy((this.matCapa as THREE.MeshStandardMaterial).color);
    this.corMolhada.set(B ? "#7E7B76" : "#5E5C58");
    this.capa = k.m(new THREE.BoxGeometry(2 * (IX + E), 0.06, 2 * (IZ + E), 28, 1, 4).translate(0, 0.15, 0), this.matCapa as THREE.Material, 3, this.trelica, undefined, undefined, undefined, false);
    this.capaD = new Deform(this.capa);
    // chão de seca (placas) sobre a capa
    this.seca = new THREE.Mesh(new THREE.PlaneGeometry(2 * (IX + E), 2 * (IZ + E)), new THREE.MeshBasicMaterial({ map: texSeca(), transparent: true, depthWrite: false, color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.seca.rotation.x = -Math.PI / 2;
    this.seca.position.y = 0.186;
    this.seca.userData.semArame = true;
    this.trelica.add(this.seca);

    // ---------------------------------------------------------------- cinta (viga de concreto no topo das paredes), 4 trechos em sequência
    const cint = k.mat({ color: B ? "#B8B5AE" : "#9C998F", rough: 0.85 });
    const hC = 0.13, o = 0.006;
    const tr: [number, number, number, number][] = [ // x0, x1, z0, z1 (percurso em volta)
      [-IX - E - o, IX + E + o, IZ - o, IZ + E + o],
      [IX - o, IX + E + o, -IZ - E - o, IZ + E + o],
      [-IX - E - o, IX + E + o, -IZ - E - o, -IZ + o],
      [-IX - E - o, -IX + o, -IZ - E - o, IZ + E + o],
    ];
    for (const [x0, x1, z0, z1] of tr) {
      const me = k.m(caixa(x1 - x0, hC, z1 - z0, 0.01), cint, 2.5, this.g, [(x0 + x1) / 2, HP - hC / 2 + 0.001, (z0 + z1) / 2]);
      me.userData.dim = [x0, x1, z0, z1];
      this.cinta.push(me);
    }
    // mureta e ralo (fechamento)
    const mur = k.mat({ color: B ? "#F2EBDD" : "#DCD3C2", rough: 0.85 });
    const yM = HP + 0.18;
    for (const [x0, x1, z0, z1] of tr) k.m(caixa(x1 - x0, 0.22, z1 - z0, 0.012), mur, 2.5, this.mureta, [(x0 + x1) / 2, yM + 0.11, (z0 + z1) / 2]);
    this.g.add(this.mureta);
    const grelha = k.mat({ color: "#6E737A", rough: 0.4, metal: 0.8, liso: true });
    k.m(cil(0.07, 0.07, 0.012, 24), grelha, 1.5, this.ralo, [0, 0, 0]);
    for (let i = -2; i <= 2; i++) k.m(caixa(0.012, 0.016, 0.11, 0), k.mat({ color: "#2b2b2e", rough: 0.6 }), 0, this.ralo, [i * 0.024, 0.004, 0]);
    this.ralo.position.set(IX - 0.25, yM + 0.002, IZ - 0.25);
    this.g.add(this.ralo);
  }

  aplica(e: EstadoLaje, t: number) {
    const d = this.k.dir;
    // ---------------- tábuas
    const nt = e.tabuas ?? 0;
    const vg = e.tabVerga ?? 0, qb = e.tabQuebra ?? 0;
    this.tabuas.forEach((tb, i) => {
      const k = Math.max(0, Math.min(1, nt - i));
      tb.g.visible = k > 0.001;
      if (!tb.g.visible) return;
      // a tábua entra deslizando de cima e assenta (time-lapse)
      tb.g.position.y = HP + 0.0175 + (1 - easeOut(k)) * 0.35;
      tb.g.rotation.x = (1 - easeOut(k)) * 0.5;
      const A = vg * 0.32 * (0.85 + 0.3 * Math.sin(i * 1.7));
      tb.d.forEach((df) => df.aplica(A));
      const q = Math.max(0, Math.min(1, qb * 1.25 - (i % 3) * 0.1));
      tb.meias.forEach((m, j) => {
        const s = j === 0 ? -1 : 1;
        m.rotation.z = s * q * q * 1.25; // a ponta do meio despenca
        m.position.y = -q * q * q * 1.1;
      });
    });
    // concreto fresco na forma
    const cf = e.concForma ?? 0;
    this.concForma.forEach((c, j) => {
      c.g.visible = cf > 0.001;
      if (!c.g.visible) return;
      const s = j === 0 ? -1 : 1;
      c.g.scale.set(1, Math.max(0.05, cf), 1);
      const A = vg * 0.32 / Math.max(0.05, cf);
      c.d.aplica(A);
      const q = Math.min(1, qb * 1.2);
      c.g.rotation.z = s * q * q * 1.3;
      c.g.position.y = HP + 0.035 - q * q * q * 1.3;
    });
    // ---------------- escoras
    const ne = e.escoras ?? 0;
    const sai = e.escorasSai ?? 0;
    this.escoras.forEach((es, i) => {
      const k = Math.max(0, Math.min(1, ne - i));
      const ks = Math.max(0, Math.min(1, sai * 1.6 - (i / this.escoras.length) * 0.6));
      es.visible = k > 0.001 && ks < 0.999;
      es.scale.set(1, quique(k), 1);
      es.position.x = ESCORAS[i][0] + (e.escoraTira && i === 5 ? -(e.escoraTira) * 0.0 : 0);
      if (e.escoraTira && i === 5) {
        // a escora do meio é arrancada: tomba para a frente
        es.rotation.x = e.escoraTira * 1.1;
        es.position.z = ESCORAS[i][1] + e.escoraTira * 0.25;
      } else { es.rotation.x = 0; es.position.z = ESCORAS[i][1]; }
      es.position.y = 0.03 + ks * 0.0;
      if (ks > 0) { es.rotation.z = ks * 1.4 * (i % 2 ? 1 : -1); es.position.y = 0.03 - ks * 0.02; }
      else es.rotation.z = 0;
    });
    this.guias.forEach((gu) => (gu.visible = ne > 0.5 && sai < 0.9));
    // ---------------- laje maciça
    const mc = e.macica ?? 0;
    this.macica.visible = mc > 0.001;
    const lv = e.laVerga ?? 0;
    if (this.macica.visible) {
      this.macica.scale.y = e.macEsp ?? 1;
      this.macD.aplica(lv * 0.22);
      const a = e.aco ?? 0;
      this.aco.visible = a > 0.001;
      this.acoBarras.forEach((b, i) => { b.position.x = (1 - easeOut(Math.min(1, a * 1.3 - i * 0.06))) * 3.4; b.position.y = 0.035 - lv * 0.22; });
      const nb = e.bolhas ?? 0, sb = e.bolhasSobe ?? 0;
      this.bolhas.forEach((b, i) => {
        const q = this.bolhaDados[i];
        const subida = Math.max(0, Math.min(1, sb * 1.5 - q.f * 0.5));
        b.visible = nb > 0.01 && subida < 0.98;
        b.position.y = q.y + subida * (0.17 - q.y) - lv * 0.22 * barriga(q.x);
        b.scale.setScalar(nb * (subida > 0.85 ? (1 - subida) / 0.15 : 1) * (1 + 0.15 * Math.sin(t * 9 + i)));
      });
    }
    // trinca (no plano do corte, de baixo para cima no meio)
    const tc = e.trinca ?? 0;
    this.trinca.visible = tc > 0.001 && mc > 0.001;
    this.trinca.position.set(0, HP - lv * 0.22 - 0.002, this.zCorte + 0.004);
    this.trinca.scale.set(0.24 * (0.4 + 0.6 * tc), 0.16 * (e.macEsp ?? 1) * tc * 1.02, 1);
    // setas
    const st = e.setas ?? 0;
    this.setas.visible = st > 0.001;
    this.setas.children.forEach((s, i) => {
      const [x, y, ang] = s.userData.base as V3;
      const pul = 1 + 0.08 * Math.sin(t * 8 + i);
      const k = Math.max(0, Math.min(1, st * 1.6 - (i < 2 ? 0 : 0.5)));
      const esp = 0.16 * (e.macEsp ?? 1);
      const yy = (y > 0 ? 0.74 : 0.26) * esp;
      s.scale.setScalar(easeOutBack(k) * pul * Math.min(0.9, esp * 2.1));
      s.position.set(x, HP + yy - lv * 0.22 * barriga(x), this.zCorte + 0.06);
      s.rotation.z = ang;
    });
    // ---------------- treliçada
    const nv = e.vigotas ?? 0, bl = e.blocos ?? 0, cp = e.capa ?? 0;
    this.trelica.visible = nv > 0.001;
    if (this.trelica.visible) {
      this.vigotas.forEach((v, i) => {
        const k = Math.max(0, Math.min(1, nv - i));
        v.visible = k > 0.001;
        v.position.y = (1 - easeOut(k)) * 0.5;
        // a treliça fica dentro da capa: com a capa pronta ela some (não acompanha a barriga)
        const tr = v.getObjectByName("trelica");
        if (tr) tr.visible = cp < 0.95 && lv < 0.05;
      });
      this.vigD.forEach((df) => df.aplica(lv * 0.22));
      const nbl = this.blocos.length;
      this.blocos.forEach((b, i) => {
        const k = Math.max(0, Math.min(1, bl * (nbl + 4) - (b.userData.ordem as number)) / 1);
        b.visible = k > 0.001;
        this.blocoD[i].aplica(lv * 0.22);
        b.scale.setScalar(k > 0 ? quique(Math.min(1, k)) : 0.001);
      });
      this.capa.visible = cp > 0.001;
      this.capa.scale.y = Math.max(0.05, cp);
      this.capaD.aplica(lv * 0.22 / Math.max(0.05, cp));
      const mo = e.molhada ?? 0;
      const mat = this.matCapa as THREE.MeshStandardMaterial;
      mat.color.copy(this.corCapa).lerp(this.corMolhada, mo);
      if ((mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
        mat.roughness = d === "A" ? 0.85 - 0.7 * mo : 0.86 - 0.08 * mo;
        (mat as THREE.MeshPhysicalMaterial).clearcoat = mo * 0.9;
      }
      const sc = e.seca ?? 0;
      this.seca.visible = sc > 0.01 && cp > 0.5;
      (this.seca.material as THREE.MeshBasicMaterial).opacity = sc * (1 - mo);
    }
    // ---------------- cinta: corre em volta (4 trechos em sequência)
    const ci = e.cinta ?? 0;
    this.cinta.forEach((c, i) => {
      const k = Math.max(0, Math.min(1, ci * 4 - i));
      c.visible = k > 0.001;
      const [x0, x1, z0, z1] = c.userData.dim as number[];
      const longoX = x1 - x0 > z1 - z0;
      // cresce a partir de uma ponta (como um cinto passando)
      if (longoX) { c.scale.set(k, 1, 1); c.position.x = (i === 2 ? x1 - (x1 - x0) * k / 2 : x0 + (x1 - x0) * k / 2); }
      else { c.scale.set(1, 1, k); c.position.z = (i === 1 ? z1 - (z1 - z0) * k / 2 : z0 + (z1 - z0) * k / 2); }
    });
    const mu = e.mureta ?? 0;
    this.mureta.visible = mu > 0.001;
    this.mureta.scale.set(1, quique(mu), 1);
    this.mureta.position.y = (1 - quique(mu)) * (HP + 0.18) * 0;
    const ra = e.ralo ?? 0;
    this.ralo.visible = ra > 0.001;
    this.ralo.scale.setScalar(quique(ra));
  }
}

export const easeOut = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
export const easeOutBack = (x: number) => { const c = 1.9, t = Math.max(0, Math.min(1, x)) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
/** entrada com quique: 0 -> 1,12 -> 0,96 -> 1 */
export const quique = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  if (t < 0.55) return easeOut(t / 0.55) * 1.12;
  if (t < 0.8) return 1.12 - 0.16 * Math.sin(((t - 0.55) / 0.25) * Math.PI / 2);
  return 0.96 + 0.04 * Math.sin(((t - 0.8) / 0.2) * Math.PI / 2);
};
