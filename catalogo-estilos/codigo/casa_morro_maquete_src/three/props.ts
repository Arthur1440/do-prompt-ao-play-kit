import * as THREE from "three";
import { Kit } from "./kit";
import { caixaR, cil, esfera, junta, RI, transf, V0, V3, XC, XF, ZF, ZQ } from "./geo";
import { altura, BX0, BX1, BZ0, BZ1, distEixo, meiaPatio, morro, patio } from "./terreno";
import { rng } from "./rng";
import { cnv, tex } from "./tex";
import { texBrilho, texRegua } from "./tex3";

// ------------------------------------------------------------------ vegetação
export function vegetacao(kit: Kit, cena: THREE.Object3D) {
  const d = kit.dir, B = d === "B", C = d === "C";
  const r = rng(321);
  // tufo: 5 lâminas finas (cones achatados) juntas
  const laminas: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const h = 0.05 + (i % 3) * 0.012;
    laminas.push(transf(new THREE.ConeGeometry(B ? 0.009 : C ? 0.012 : 0.006, h * (C ? 1.25 : 1), C ? 6 : 4, 1), [Math.cos(a) * 0.008, h / 2, Math.sin(a) * 0.008], [Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35]));
  }
  const geoTufo = junta(laminas);
  geoTufo.computeVertexNormals();
  const matTufo = kit.mat({ color: B ? 0x6cbc44 : C ? 0x6aa65a : 0x5f9a3c, rough: 0.8, clear: 0.05, semContorno: true });
  const N = B ? 1300 : C ? 1500 : 2600;
  const tufos = new THREE.InstancedMesh(geoTufo, matTufo, N);
  tufos.castShadow = false;
  tufos.receiveShadow = true;
  const base: { x: number; z: number; s: number; ry: number }[] = [];
  let k = 0;
  while (k < N) {
    const x = BX0 + 0.02 + r() * (BX1 - BX0 - 0.04), z = BZ0 + 0.02 + r() * (BZ1 - BZ0 - 0.04);
    const h = morro(x, z) * (1 - patio(x, z));
    if (r() > 0.25 + h * 0.6) continue; // mais grama no morro do que no plano
    if (Math.abs(x - XF) < meiaPatio(z) + 0.02 && z > ZF - 0.02 && z < 2.15) continue; // pátio de pedra
    base.push({ x, z, s: 0.7 + r() * 0.9, ry: r() * 6 });
    k++;
  }
  // franja: lâminas compridas caindo por cima da frente da toca
  const geoFr = transf(new THREE.ConeGeometry(B ? 0.012 : 0.008, 0.14, 4, 1), [0, -0.07, 0]);
  const franja = new THREE.InstancedMesh(geoFr, matTufo, 120);
  franja.castShadow = true;
  const baseFr: { x: number; y: number; ang: number; s: number }[] = [];
  for (let i = 0; i < 120; i++) {
    const x = XF - 0.72 + (1.44 * i) / 119 + (r() - 0.5) * 0.01;
    baseFr.push({ x, y: altura(x, ZF - 0.03), ang: 0.15 + r() * 0.35, s: 0.55 + r() * 0.7 });
  }
  // flores do campo
  const geoFlor = esfera(B ? 0.016 : 0.012, 10, 8);
  const coresF = [0xffffff, 0xffd34d, 0xf4a6c6, 0xb79cf0, 0xff7a59];
  const flores = new THREE.InstancedMesh(geoFlor, kit.mat({ color: 0xffffff, rough: 0.6 }), 160);
  const baseFl: { x: number; z: number }[] = [];
  for (let i = 0; i < 160; i++) {
    let x = 0, z = 0;
    for (let t = 0; t < 30; t++) {
      x = XC + 0.05 + r() * 3.6;
      z = -1.9 + r() * 3.6;
      if (morro(x, z) > 0.5 && patio(x, z) < 0.1) break;
    }
    baseFl.push({ x, z });
    flores.setColorAt(i, new THREE.Color(coresF[i % 5]));
  }
  kit.contorno(flores as unknown as THREE.Mesh, 1.2);
  // arbusto e árvore no alto
  const verdeEsc = kit.mat({ color: B ? 0x3f9a3a : C ? 0x4f8a45 : 0x3f7a35, rough: 0.8 });
  const arbusto = new THREE.Group();
  const pA: V3 = [0.15, altura(0.15, -0.95), -0.95];
  arbusto.position.set(...pA);
  cena.add(arbusto);
  const ra = rng(4);
  for (let i = 0; i < 7; i++) kit.m(esfera(0.08 + ra() * 0.05, 20, 14), verdeEsc, 2.5, arbusto, [(ra() - 0.5) * 0.22, 0.05 + ra() * 0.08, (ra() - 0.5) * 0.18]);
  const arvore = new THREE.Group();
  const pT: V3 = [1.85, altura(1.85, -0.55), -0.55];
  arvore.position.set(...pT);
  cena.add(arvore);
  kit.m(cil(0.03, 0.045, 0.5, 12), kit.mat({ color: B ? 0x8a5a2b : 0x6b4a2e, rough: 0.8 }), 2.5, arvore, [0, 0.25, 0]);
  const copa = kit.mat({ color: B ? 0x58b04a : C ? 0x5f9f50 : 0x4c8a3c, rough: 0.8 });
  for (const [x, y, z, s] of [[0, 0.6, 0, 0.2], [0.13, 0.52, 0.05, 0.14], [-0.12, 0.54, -0.04, 0.15], [0.02, 0.72, -0.02, 0.14]] as [number, number, number, number][])
    kit.m(esfera(s, 24, 18), copa, 2.5, arvore, [x, y, z]);
  cena.add(tufos, franja, flores);
  return { tufos, base, franja, baseFr, flores, baseFl, arbusto, arvore };
}

/** reposiciona a vegetação conforme a vala (terra) e a franja da porta */
export function poeVegetacao(v: ReturnType<typeof vegetacao>, terra: number, franja: number, cresce: number) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  v.base.forEach((b, i) => {
    const h = altura(b.x, b.z, terra);
    let s = b.s;
    if (terra < 0.999 || cresce < 1) {
      const dd = distEixo(b.x, b.z);
      const naVala = dd < 0.95 ? 1 : 0;
      if (naVala) s *= terra < 0.999 ? 0 : cresce;
    }
    e.set(0, b.ry, 0);
    m.compose(new THREE.Vector3(b.x, h - 0.004, b.z), q.setFromEuler(e), new THREE.Vector3(s, s * (0.8 + 0.4 * (i % 3) / 2), s));
    v.tufos.setMatrixAt(i, m);
  });
  v.tufos.instanceMatrix.needsUpdate = true;
  v.baseFr.forEach((b, i) => {
    const s = b.s * franja;
    e.set(b.ang + Math.PI * 0.15, 0, (i % 7 - 3) * 0.06);
    m.compose(new THREE.Vector3(b.x, b.y - 0.01, ZF - 0.01), q.setFromEuler(e), new THREE.Vector3(1, Math.max(0.001, s), 1));
    v.franja.setMatrixAt(i, m);
  });
  v.franja.instanceMatrix.needsUpdate = true;
  v.franja.visible = franja > 0.01;
  v.baseFl.forEach((b, i) => {
    const h = altura(b.x, b.z, terra);
    const dd = distEixo(b.x, b.z);
    const s = dd < 0.95 ? (terra < 0.999 ? 0 : cresce) : 1;
    m.compose(new THREE.Vector3(b.x, h + 0.035, b.z), q.identity(), new THREE.Vector3(1, 1, 1).multiplyScalar(Math.max(0.0001, s)));
    v.flores.setMatrixAt(i, m);
  });
  v.flores.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ escavadeira genérica (sem marca)
export function escavadeira(kit: Kit, cena: THREE.Object3D) {
  const B = kit.dir === "B";
  const amarelo = kit.mat({ color: B ? 0xffc21a : 0xf2b51b, rough: 0.45, clear: 0.5 });
  const escuro = kit.mat({ color: 0x2e2e33, rough: 0.7 });
  const vidro = kit.mat({ color: B ? 0x9fd8ff : 0x2b3a44, rough: 0.1, clear: 1, metal: 0.2 });
  const g = new THREE.Group();
  cena.add(g);
  // esteiras
  for (const x of [-0.2, 0.2]) {
    kit.m(caixaR(0.12, 0.1, 0.62, 0.045), escuro, 2.5, g, [x, 0.05, 0]);
    for (let i = 0; i < 4; i++) kit.m(cil(0.03, 0.03, 0.125, 12).rotateZ(Math.PI / 2), kit.mat({ color: 0x55555c, metal: 0.6, rough: 0.4 }), 1.5, g, [x, 0.05, -0.21 + i * 0.14]);
  }
  kit.m(caixaR(0.3, 0.06, 0.4, 0.02), escuro, 2, g, [0, 0.1, 0]);
  // corpo giratório
  const corpo = new THREE.Group();
  corpo.position.set(0, 0.13, 0);
  g.add(corpo);
  kit.m(caixaR(0.46, 0.14, 0.5, 0.04), amarelo, 2.5, corpo, [0, 0.08, 0.03]);
  kit.m(caixaR(0.42, 0.12, 0.14, 0.04), amarelo, 2.5, corpo, [0, 0.13, 0.23]); // contrapeso
  const cab = kit.m(caixaR(0.2, 0.22, 0.2, 0.035), amarelo, 2.5, corpo, [-0.11, 0.26, -0.06]);
  kit.m(caixaR(0.19, 0.13, 0.205, 0.02), vidro, 1.5, cab, [0, 0.03, 0]);
  kit.m(caixaR(0.205, 0.13, 0.19, 0.02), vidro, 1.5, cab, [0, 0.03, 0]);
  kit.m(cil(0.015, 0.015, 0.1, 8), escuro, 1.5, corpo, [0.15, 0.25, 0.2]); // escapamento
  // lança, braço e caçamba (cinemática direta)
  const lanca = new THREE.Group();
  lanca.position.set(0.1, 0.16, -0.17);
  corpo.add(lanca);
  const LL = 0.62, LB = 0.46;
  kit.m(caixaR(0.07, 0.08, LL, 0.025), amarelo, 2.5, lanca, [0, 0, -LL / 2]);
  kit.m(cil(0.018, 0.018, 0.3, 10).rotateX(Math.PI / 2), kit.mat({ color: 0xcfd3d8, metal: 1, rough: 0.2 }), 1.5, lanca, [0, -0.06, -0.2]);
  const braco = new THREE.Group();
  braco.position.set(0, 0, -LL);
  lanca.add(braco);
  kit.m(caixaR(0.06, 0.07, LB, 0.022), amarelo, 2.5, braco, [0, 0, -LB / 2]);
  const cacamba = new THREE.Group();
  cacamba.position.set(0, 0, -LB);
  braco.add(cacamba);
  const cg = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 20, 1, true, 0, Math.PI * 1.15);
  cg.rotateZ(Math.PI / 2);
  kit.m(cg, kit.mat({ color: B ? 0xffc21a : 0xe0a516, rough: 0.5, side: THREE.DoubleSide }), 2.5, cacamba, [0, -0.06, -0.05]);
  for (let i = 0; i < 4; i++) kit.m(new THREE.ConeGeometry(0.014, 0.05, 6).rotateX(-Math.PI / 2), escuro, 1.5, cacamba, [-0.06 + i * 0.04, -0.15, -0.09]);
  const terraNa = kit.m(esfera(0.085, 14, 10), kit.mat({ color: B ? 0x9a5a33 : 0x6b4428, rough: 0.95 }), 2, cacamba, [0, -0.05, -0.05], undefined, [1, 0.6, 0.8]);
  return { g, corpo, lanca, braco, cacamba, terraNa };
}
/** pose: giro do corpo, ângulos (rad) da lança, do braço e da caçamba */
export function poseEscavadeira(e: ReturnType<typeof escavadeira>, giro: number, aL: number, aB: number, aC: number, cheia: number) {
  e.corpo.rotation.y = giro;
  e.lanca.rotation.x = aL;
  e.braco.rotation.x = aB;
  e.cacamba.rotation.x = aC;
  e.terraNa.visible = cheia > 0.05;
  e.terraNa.scale.set(cheia, 0.6 * cheia, 0.8 * cheia);
}

// ------------------------------------------------------------------ torrões de terra voando
export function torroes(kit: Kit, cena: THREE.Object3D, n = 70) {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const im = new THREE.InstancedMesh(g, kit.mat({ color: kit.dir === "B" ? 0x9a5a33 : 0x6b4428, rough: 0.95 }), n);
  im.castShadow = true;
  im.frustumCulled = false;
  kit.contorno(im as unknown as THREE.Mesh, 1.5);
  cena.add(im);
  return im;
}

// ------------------------------------------------------------------ chuva
export function chuva(kit: Kit, cena: THREE.Object3D, n = 900) {
  const g = new THREE.CylinderGeometry(0.008, 0.008, 0.24, 5, 1, true);
  const im = new THREE.InstancedMesh(g, kit.mat({ basico: true, color: 0xcfe2ff, transparent: true, opacity: kit.dir === "B" ? 0.9 : 0.55 }), n);
  im.frustumCulled = false;
  im.castShadow = false;
  im.userData.semWire = true;
  cena.add(im);
  return im;
}

// ------------------------------------------------------------------ lama: bolo de terra molhada que desce do teto e espirra na cama
export function lama(kit: Kit, cena: THREE.Object3D) {
  const mat = kit.mat({ color: kit.dir === "B" ? 0x5a3320 : 0x3d2616, rough: kit.dir === "B" ? 0.6 : 0.25, clear: 0.9, dentro: true });
  const g = new THREE.Group();
  cena.add(g);
  const r = rng(66);
  // massa orgânica: esfera com ondulações (lama, não bolinhas)
  const bolha = (raio: number, seed: number, achata = 1) => {
    const geo = new THREE.IcosahedronGeometry(raio, 4);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const a = 3 + seed * 1.7, b = 2.3 + seed * 0.9;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize();
      const n = 1 + 0.16 * Math.sin(v.x * a + seed) * Math.cos(v.z * b) + 0.09 * Math.sin(v.y * 7 + v.x * 5 + seed * 2);
      p.setXYZ(i, v.x * raio * n, v.y * raio * n * achata, v.z * raio * n);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const bolos: THREE.Mesh[] = [];
  bolos.push(kit.m(bolha(0.11, 1), mat, 2.5, g)); // a massa que despenca
  for (let i = 0; i < 7; i++) {
    const me = kit.m(bolha(0.022 + r() * 0.018, i + 3), mat, 1.5, g);
    me.userData.o = [(r() - 0.5) * 0.5, r() * 0.25, (r() - 0.5) * 0.35];
    bolos.push(me);
  }
  // barriga de lama vergando no teto e o espirro sobre a colcha
  const teto = kit.m(bolha(0.16, 5, 0.55), mat, 2.5, g);
  const espirro = kit.m(bolha(0.17, 8, 0.22), mat, 2.5, g);
  return { g, mat, bolos, teto, espirro };
}

// ------------------------------------------------------------------ gotas (pingo no teto, suor na parede, ar úmido)
export function gotas(kit: Kit, cena: THREE.Object3D) {
  const B = kit.dir === "B";
  const matAgua = kit.mat({ color: B ? 0x5fb8ff : 0x9fd2ff, rough: 0.05, clear: 1, transparent: !B, opacity: 0.85, dentro: true });
  const pingo = kit.m(esfera(0.022, 20, 14), matAgua, 2, cena);
  pingo.scale.set(1, 1.35, 1);
  const respingo = new THREE.Group();
  cena.add(respingo);
  for (let i = 0; i < 6; i++) kit.m(esfera(0.009, 10, 8), matAgua, 1.2, respingo);
  // suor na parede do quarto (gotas na face interna do concreto, lado norte, perto do corte)
  const N = 60;
  const suor = new THREE.InstancedMesh(esfera(0.011, 10, 8), matAgua, N);
  suor.castShadow = false;
  kit.contorno(suor as unknown as THREE.Mesh, 1.2);
  cena.add(suor);
  const r = rng(5);
  const baseSuor: { x: number; a: number; s: number; v: number }[] = [];
  for (let i = 0; i < N; i++) baseSuor.push({ x: XC + 0.04 + r() * 0.55, a: 0.12 + r() * 1.25, s: 0.6 + r() * 0.8, v: r() });
  // ar quente e úmido (bolhas laranja translúcidas)
  const ar = new THREE.InstancedMesh(esfera(0.03, 14, 10), kit.mat({ basico: true, color: 0xffa060, transparent: true, opacity: 0.35 }), 18);
  ar.userData.semWire = true;
  ar.frustumCulled = false;
  cena.add(ar);
  return { pingo, respingo, suor, baseSuor, ar, matAgua };
}
/** ponto na face interna do arco do quarto (ângulo a a partir do topo, lado norte) */
export function naParede(x: number, a: number, r = RI - 0.034): V3 {
  return [x, V0 + Math.cos(a) * r, ZQ + Math.sin(a) * r];
}

// ------------------------------------------------------------------ desumidificador genérico
export function desumidificador(kit: Kit, cena: THREE.Object3D) {
  const B = kit.dir === "B";
  const g = new THREE.Group();
  cena.add(g);
  kit.m(caixaR(0.12, 0.19, 0.1, 0.025), kit.mat({ color: 0xf4f5f2, rough: 0.35, clear: 0.6, dentro: true }), 2, g, [0, 0.095, 0]);
  for (let i = 0; i < 5; i++) kit.m(caixaR(0.09, 0.008, 0.012, 0.003), kit.mat({ color: 0x9aa3ab, dentro: true }), 1, g, [0, 0.14 + i * 0.012, 0.05]);
  const tanque = kit.m(caixaR(0.1, 0.06, 0.012, 0.004), kit.mat({ color: B ? 0x9fd6ff : 0xbfe3ff, rough: 0.1, clear: 1, transparent: true, opacity: 0.7, dentro: true }), 1, g, [0, 0.05, 0.05]);
  const agua = kit.m(caixaR(0.09, 0.05, 0.014, 0.004), kit.mat({ color: 0x3f9ae0, rough: 0.1, emissive: 0x1f6ab0, ei: 0.3, dentro: true }), 0, g, [0, 0.03, 0.052]);
  const led = kit.m(esfera(0.008, 10, 8), kit.mat({ basico: true, color: 0x55c8ff }), 0, g, [0.035, 0.175, 0.052]);
  void tanque;
  return { g, agua, led };
}

// ------------------------------------------------------------------ casas vizinhas com ar-condicionado
export function vizinhos(kit: Kit, cena: THREE.Object3D) {
  const B = kit.dir === "B";
  const casas: { g: THREE.Group; helice: THREE.Mesh }[] = [];
  const P: [number, number, number, number][] = [[3.55, 1.55, 0xefe4d2, 0.15], [3.75, -0.7, 0xe7cfa6, -0.1]];
  for (const [x, z, cor, ry] of P) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    cena.add(g);
    kit.m(caixaR(0.7, 0.42, 0.6, 0.02), kit.mat({ color: cor, rough: 0.7 }), 2.5, g, [0, 0.21, 0]);
    const tel = new THREE.Shape();
    tel.moveTo(-0.4, 0);
    tel.lineTo(0, 0.28);
    tel.lineTo(0.4, 0);
    tel.lineTo(-0.4, 0);
    kit.m(new THREE.ExtrudeGeometry(tel, { depth: 0.7, bevelEnabled: false }), kit.mat({ color: B ? 0xd9643a : 0xb5553a, rough: 0.6 }), 2.5, g, [0, 0.42, -0.35]);
    kit.m(caixaR(0.12, 0.2, 0.02, 0.006), kit.mat({ color: 0x6b4a33 }), 1.5, g, [-0.15, 0.1, 0.305]);
    kit.m(caixaR(0.14, 0.12, 0.02, 0.006), kit.mat({ color: 0x9fcbe8, rough: 0.1, clear: 1 }), 1.5, g, [0.15, 0.24, 0.305]);
    // ar-condicionado na parede (caixa com hélice)
    const ac = new THREE.Group();
    ac.position.set(0.37, 0.14, 0.05);
    ac.rotation.y = Math.PI / 2;
    g.add(ac);
    kit.m(caixaR(0.2, 0.15, 0.08, 0.012), kit.mat({ color: 0xe9eef2, rough: 0.4, clear: 0.5 }), 2, ac, [0, 0, 0.04]);
    kit.m(new THREE.TorusGeometry(0.05, 0.006, 8, 24), kit.mat({ color: 0x8a939b }), 1.2, ac, [0.04, 0, 0.085]);
    const helice = kit.m(junta([0, 1, 2].map((i) => transf(caixaR(0.08, 0.018, 0.004, 0.002), [0, 0, 0], [0, 0, (i * 2 * Math.PI) / 3]))), kit.mat({ color: 0x5f6870 }), 1, ac, [0.04, 0, 0.085]);
    casas.push({ g, helice });
  }
  return casas;
}

// ------------------------------------------------------------------ régua e bússola, sol e nuvens
export function regua(kit: Kit, cena: THREE.Object3D) {
  const h0 = altura(XC, 0.5);
  const g = new THREE.Group();
  g.position.set(XC - 0.012, h0, 0.5);
  cena.add(g);
  const geo = new THREE.PlaneGeometry(0.1, 0.62);
  geo.rotateY(-Math.PI / 2);
  // a régua de 0 a 40 cm ocupa 0,5 de altura (o 0 na superfície)
  const me = kit.m(geo, kit.mat({ map: texRegua(), rough: 0.5, side: THREE.DoubleSide }), 1.5, g, [0, -0.31 + 0.04, 0]);
  void me;
  return g;
}
export const REGUA_40 = 0.5 * ((1024 - 60 - 40) / 1024) * (0.62 / 0.62); // distância do 0 ao 40 na régua

export function bussola(kit: Kit, cena: THREE.Object3D) {
  const { c, g } = cnv(512, 512);
  g.fillStyle = "rgba(255,248,235,0.96)";
  g.beginPath();
  g.arc(256, 256, 250, 0, 7);
  g.fill();
  g.strokeStyle = "#2b2118";
  g.lineWidth = 10;
  g.stroke();
  const ponta = (a: number, cor: string, L: number) => {
    g.save();
    g.translate(256, 256);
    g.rotate(a);
    g.fillStyle = cor;
    g.beginPath();
    g.moveTo(0, -L);
    g.lineTo(34, 0);
    g.lineTo(0, 30);
    g.lineTo(-34, 0);
    g.closePath();
    g.fill();
    g.restore();
  };
  for (let i = 1; i < 4; i++) ponta((i * Math.PI) / 2, "#5b5047", 150);
  ponta(0, "#FF6B2C", 200);
  g.fillStyle = "#FF6B2C";
  g.font = "bold 120px Arial";
  g.textAlign = "center";
  g.fillText("N", 256, 130);
  const t = tex(c);
  const geo = new THREE.CircleGeometry(0.3, 48);
  geo.rotateX(-Math.PI / 2);
  // o "N" do desenho (topo da textura) aponta para +z (norte)
  geo.rotateY(Math.PI);
  const me = kit.m(geo, kit.mat({ map: t, rough: 0.5, transparent: true, semContorno: true }), 0, cena);
  me.castShadow = false;
  return me;
}

export function ceuObjs(kit: Kit, cena: THREE.Object3D) {
  const B = kit.dir === "B";
  const sol = new THREE.Group();
  cena.add(sol);
  kit.m(esfera(0.22, 32, 24), kit.mat({ basico: true, color: 0xffd35a }), 3, sol);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho(), color: 0xffc04a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(1.3);
  sol.add(halo);
  // nuvens fofas (algodão na maquete, bolas no toon, massinha na C)
  const nuvens: THREE.Group[] = [];
  const matN = kit.mat({ color: 0xffffff, rough: 0.95, clear: 0, bump: kit.dir === "A" ? 0.6 : undefined });
  const r = rng(12);
  const P: V3[] = [[-2.2, 3.1, -3.5], [1.4, 3.5, -4.2], [3.8, 2.9, -2.8], [-0.4, 3.9, -5.2], [2.6, 3.3, 2.4]];
  for (const p of P) {
    const ng = new THREE.Group();
    ng.position.set(...p);
    cena.add(ng);
    const n = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const s = 0.18 + r() * 0.2;
      const m = kit.m(B ? esfera(s, 20, 14) : new THREE.IcosahedronGeometry(s, 3), matN, 2.5, ng, [(i - n / 2) * 0.2 + (r() - 0.5) * 0.1, (r() - 0.3) * 0.12, (r() - 0.5) * 0.15]);
      m.castShadow = false;
    }
    nuvens.push(ng);
  }
  // arco do caminho do sol (pontilhado) no céu do norte
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI;
    pts.push(new THREE.Vector3(XF - Math.cos(a) * 2.1, 0.3 + Math.sin(a) * 1.75, 2.5 + Math.sin(a) * 0.5));
  }
  const arco = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0, toneMapped: false }), 31);
  for (let i = 0; i <= 30; i++) arco.setMatrixAt(i, new THREE.Matrix4().makeTranslation(pts[i * 2].x, pts[i * 2].y, pts[i * 2].z));
  arco.userData.semWire = true;
  cena.add(arco);
  return { sol, halo, nuvens, arco, arcoPts: pts };
}

// ------------------------------------------------------------------ fumaça da chaminé (algodão) e calor tremendo
export function fumaca(kit: Kit, cena: THREE.Object3D, n = 9) {
  const mat = kit.mat({ color: 0xf2efe9, rough: 1, clear: 0, transparent: true, opacity: 0.92 });
  const r = rng(8);
  const g = new THREE.IcosahedronGeometry(0.05, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const k = 1 + 0.18 * Math.sin(v.x * 70) * Math.cos(v.y * 60 + v.z * 40);
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  const bolas: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const me = kit.m(g, mat, 2, cena);
    me.castShadow = false;
    me.userData.f = r();
    bolas.push(me);
  }
  return bolas;
}
export function calorOndas(cena: THREE.Object3D) {
  const t = texBrilho();
  const sps: THREE.Sprite[] = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: 0xff7a3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.userData.semWire = true;
    cena.add(s);
    sps.push(s);
  }
  return sps;
}
export { XC };
void BX1;
void BZ1;
void BZ0;
