import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cil, Dir, esfera, junta, Kit, torno, transf, V3 } from "./kit";
import { rng } from "./rng";

// Panela de pressão genérica de alumínio (sem marca). 1 unidade = 10 cm.
export const R = 1.1; // raio do corpo
export const H = 1.25; // altura do corpo
export const AGUA = 0.62; // nível da água (pouco abaixo da metade: grão nunca acima da metade)

/** Altura do topo da tampa no raio r (domo). */
export const yTampa = (r: number) => {
  const k = Math.min(1, r / (R + 0.08));
  return H + 0.2 - 0.17 * k * k;
};

// onde ficam as defesas (em coordenadas da panela; o grupo da panela pode girar)
const ANG_SEG = -0.62; // válvula de segurança: atrás e à direita
const ANG_FECH = Math.PI + 0.55; // válvula de fechamento: perto do cabo, atrás
const ANG_JAN = -0.8; // janelinha lateral na saia da tampa
export const P_TRAB: V3 = [0, H + 0.2, 0];
export const P_SEG: V3 = [Math.cos(ANG_SEG) * 0.5, yTampa(0.5), Math.sin(ANG_SEG) * 0.5];
export const P_FECH: V3 = [Math.cos(ANG_FECH) * 0.62, yTampa(0.62), Math.sin(ANG_FECH) * 0.62];
export const P_JAN: V3 = [Math.cos(ANG_JAN) * (R + 0.09), H - 0.04, Math.sin(ANG_JAN) * (R + 0.09)];
export const P_CADEADO: V3 = [P_FECH[0] * 0.95, H - 0.22, P_FECH[2] * 0.95];

const corte = (p: [number, number][]) => p;

export type Panela = {
  g: THREE.Group; // tudo
  corpo: THREE.Group;
  tampa: THREE.Group; // tampa + válvulas (sobe/gira para abrir)
  anel: THREE.Mesh;
  peso: THREE.Group;
  furo: THREE.Mesh; // pino oco da válvula de trabalho (o furinho)
  pino: THREE.Mesh;
  pinoFech: THREE.Mesh;
  janela: THREE.Mesh;
  lingua: THREE.Mesh; // pedaço do anel que sai pela janelinha
  cadeado: THREE.Group;
  agua: THREE.Mesh;
  superficie: THREE.Mesh;
  feijao: THREE.InstancedMesh;
  espuma: THREE.InstancedMesh;
  carinhas: THREE.Group; // olhos nas bolhas maiores (só no toon)
  bolhas: THREE.InstancedMesh;
  marcas: Record<"trab" | "seg" | "jan" | "fech", THREE.Mesh>; // brilho laranja de cada defesa
  matAnel: THREE.Material;
};

export function montaPanela(kit: Kit): Panela {
  const d: Dir = kit.dir;
  const B = d === "B", C = d === "C";
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  const tampa = new THREE.Group();
  g.add(corpo, tampa);

  const corAl = B ? 0xc9d3dd : C ? 0xd7d9dc : 0xc4c8cc;
  const al = kit.mat({ color: corAl, metal: 1, rough: C ? 0.32 : B ? 0.5 : 0.42, corte: true, escovado: true });
  const alTampa = kit.mat({ color: B ? 0xd6dee6 : corAl, metal: 1, rough: C ? 0.3 : B ? 0.5 : 0.4, corte: true });
  const baq = kit.mat({ color: B ? 0x2b2b33 : 0x17171a, rough: C ? 0.32 : 0.55, clear: C ? 0.7 : 0.3 });
  const metEsc = kit.mat({ color: B ? 0x6d7480 : 0x55595f, metal: 1, rough: C ? 0.3 : 0.45 });
  const corteCor = B ? 0xeef2f6 : C ? 0xf1f2f3 : 0xdcdfe2;

  // ---------------- corpo (perfil fechado: parede com espessura)
  const perfCorpo: [number, number][] = corte([
    [0, 0], [R - 0.2, 0], [R - 0.2, 0], [R - 0.08, 0.012], [R - 0.02, 0.05], [R, 0.12], [R, 0.12],
    [R, H - 0.1], [R + 0.012, H - 0.05], [R + 0.03, H - 0.02], [R + 0.04, H], [R + 0.02, H + 0.018], [R - 0.02, H + 0.012], [R - 0.045, H - 0.02],
    [R - 0.055, H - 0.08], [R - 0.055, H - 0.08], [R - 0.055, 0.17], [R - 0.07, 0.1], [R - 0.13, 0.068], [R - 0.2, 0.062], [0, 0.062],
  ]);
  const gCorpo = torno(perfCorpo, 128);
  const mCorpo = kit.m(gCorpo, al, 3, corpo);
  kit.tampaCorte(mCorpo, corteCor);
  // fundo triplo (disco escuro por baixo)
  kit.m(cil(R - 0.16, R - 0.16, 0.02, 64), metEsc, 1.5, corpo, [0, -0.008, 0]);

  // cabo do corpo (baquelite) + suporte
  const cabo = new THREE.Group();
  kit.m(new RoundedBoxGeometry(1.25, 0.15, 0.24, 4, 0.07), baq, 3, cabo, [-(R + 0.72), H - 0.06, 0]);
  kit.m(new RoundedBoxGeometry(0.22, 0.2, 0.2, 3, 0.04), metEsc, 2, cabo, [-(R + 0.06), H - 0.08, 0]);
  corpo.add(cabo);
  // alça auxiliar do outro lado
  kit.m(new RoundedBoxGeometry(0.34, 0.09, 0.26, 3, 0.045), baq, 3, corpo, [R + 0.2, H - 0.08, 0]);

  // ---------------- anel de vedação (silicone)
  const matAnel = kit.mat({ color: B ? 0x3b3f4a : C ? 0x2b2e35 : 0x353a45, rough: 0.75, corte: true });
  const anel = kit.m(new THREE.TorusGeometry(R + 0.012, 0.034, 20, 160), matAnel, 2, undefined, [0, H + 0.03, 0], [Math.PI / 2, 0, 0]);
  kit.tampaCorte(anel, B ? 0x4a505c : 0x434957);
  g.add(anel); // o anel fica no corpo: entra com a tampa levantada

  // ---------------- tampa (perfil fechado; vai de baixo para cima para as normais saírem certas)
  const perfTampa: [number, number][] = [
    [0, H + 0.15], [0.3, H + 0.142], [0.7, H + 0.108], [R - 0.06, H + 0.06], [R + 0.02, H + 0.04], [R + 0.05, H + 0.01],
    [R + 0.05, H - 0.1], [R + 0.05, H - 0.1], [R + 0.058, H - 0.118], [R + 0.075, H - 0.118], [R + 0.075, H - 0.118], [R + 0.088, H - 0.1],
    [R + 0.088, H - 0.1], [R + 0.088, H + 0.0], [R + 0.075, H + 0.045], [R + 0.03, H + 0.075], [R - 0.06, H + 0.1], [0.7, yTampa(0.7)], [0.3, yTampa(0.3)], [0, H + 0.2],
  ];
  const gTampa = torno(perfTampa, 128);
  const mTampa = kit.m(gTampa, alTampa, 3, tampa);
  kit.tampaCorte(mTampa, corteCor);
  // abas da baioneta (por baixo da saia)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const aba = kit.m(new THREE.BoxGeometry(0.34, 0.03, 0.06), alTampa, 1.5, tampa, [Math.cos(a) * (R + 0.04), H - 0.12, Math.sin(a) * (R + 0.04)], [0, -a, 0]);
    aba.userData.corte = true;
  }

  // cabo da tampa: sobre o cabo do corpo quando fechada
  const yCT = H + 0.13;
  kit.m(new RoundedBoxGeometry(1.5, 0.14, 0.22, 4, 0.065), baq, 3, tampa, [-(R + 0.5), yCT, 0]);
  kit.m(new RoundedBoxGeometry(0.62, 0.12, 0.2, 3, 0.05), baq, 3, tampa, [-(0.52), yTampa(0.55) + 0.06, 0]);

  // ---------------- válvula de trabalho: pino oco no centro + peso
  const furo = kit.m(cil(0.032, 0.04, 0.12, 24), metEsc, 1.5, tampa, [0, H + 0.24, 0]);
  const peso = new THREE.Group();
  const corPeso = B ? 0x8e98a6 : C ? 0xa9adb2 : 0x9aa0a8;
  const mPeso = kit.mat({ color: corPeso, metal: 1, rough: C ? 0.38 : 0.4 });
  const perfPeso: [number, number][] = [
    [0.03, 0], [0.12, 0], [0.135, 0.015], [0.135, 0.07], [0.115, 0.095], [0.06, 0.11], [0.05, 0.14], [0.05, 0.19], [0.075, 0.205], [0.075, 0.23], [0.04, 0.25], [0, 0.252],
  ];
  kit.m(torno(perfPeso, 48), mPeso, 2.5, peso);
  // ranhuras do peso (para ver o giro)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    kit.m(new THREE.BoxGeometry(0.03, 0.05, 0.05), metEsc, 1, peso, [Math.cos(a) * 0.13, 0.045, Math.sin(a) * 0.13], [0, -a, 0]);
  }
  peso.position.set(0, H + 0.205, 0);
  tampa.add(peso);

  // ---------------- válvula de segurança: anel + corpo + pino que sobe
  const seg = new THREE.Group();
  kit.m(new THREE.TorusGeometry(0.07, 0.018, 12, 32), metEsc, 1.5, seg, [0, 0.01, 0], [Math.PI / 2, 0, 0]);
  kit.m(cil(0.055, 0.06, 0.05, 32), metEsc, 1.5, seg, [0, 0.03, 0]);
  const corPino = B ? 0xe8443a : 0xc8372d;
  const pino = kit.m(junta([cil(0.024, 0.024, 0.1, 24), transf(esfera(0.032, 20, 12), [0, 0.05, 0])]), kit.mat({ color: corPino, rough: 0.45, metal: C ? 0.2 : 0 }), 1.8, seg, [0, 0.04, 0]);
  seg.position.set(...P_SEG);
  tampa.add(seg);

  // ---------------- válvula de fechamento: capuz + pino
  const fech = new THREE.Group();
  kit.m(cil(0.06, 0.07, 0.05, 32), metEsc, 1.5, fech, [0, 0.02, 0]);
  const pinoFech = kit.m(junta([cil(0.022, 0.022, 0.08, 20), transf(cil(0.036, 0.036, 0.016, 24), [0, 0.04, 0])]), kit.mat({ color: B ? 0x3c3f46 : 0x2a2c30, metal: 0.6, rough: 0.4 }), 1.5, fech, [0, 0.02, 0]);
  fech.position.set(...P_FECH);
  tampa.add(fech);

  // ---------------- janelinha lateral (recorte escuro na saia) + língua do anel
  const gJan = new THREE.CylinderGeometry(R + 0.092, R + 0.092, 0.05, 24, 1, true, Math.PI / 2 - ANG_JAN - 0.075, 0.15);
  const janela = kit.m(gJan, kit.mat({ color: 0x15161a, rough: 0.9, semContorno: true, side: THREE.DoubleSide }), 0, tampa, [0, H - 0.04, 0]);
  const lingua = kit.m(new THREE.CapsuleGeometry(0.026, 0.14, 6, 14), matAnel, 1.5, tampa, [P_JAN[0], P_JAN[1], P_JAN[2]], [Math.PI / 2, 0, -ANG_JAN + Math.PI / 2]);
  lingua.rotation.set(0, -ANG_JAN, Math.PI / 2);
  lingua.visible = false;

  // ---------------- cadeado de vapor (por dentro, acende quando trava)
  const cadeado = new THREE.Group();
  const mCad = kit.mat({ basico: true, color: 0xff6b2c, aditivo: d === "C", transparent: true, opacity: 0 });
  const corpoCad = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.16, 0.06, 3, 0.025), mCad);
  const arco = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.017, 10, 24, Math.PI), mCad);
  arco.position.y = 0.08;
  const furoCad = new THREE.Mesh(cil(0.018, 0.018, 0.07, 12), kit.mat({ basico: true, color: 0x401000, transparent: true, opacity: 0 }));
  furoCad.rotation.x = Math.PI / 2;
  cadeado.add(corpoCad, arco, furoCad);
  cadeado.position.set(...P_CADEADO);
  cadeado.userData.semWire = true;
  tampa.add(cadeado);

  // ---------------- marcas laranja (anéis de brilho em cada defesa)
  const mkMarca = () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 40), kit.mat({ basico: true, color: 0xff6b2c, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.userData.semWire = true;
    m.renderOrder = 5;
    (m.material as THREE.Material).depthTest = false;
    return m;
  };
  const marcas = { trab: mkMarca(), seg: mkMarca(), jan: mkMarca(), fech: mkMarca() };
  marcas.trab.position.set(P_TRAB[0], P_TRAB[1] + 0.01, P_TRAB[2]);
  marcas.seg.position.set(P_SEG[0], P_SEG[1] + 0.01, P_SEG[2]);
  marcas.fech.position.set(P_FECH[0], P_FECH[1] + 0.01, P_FECH[2]);
  marcas.jan.position.set(...P_JAN);
  marcas.jan.rotation.set(0, Math.PI / 2 - ANG_JAN, 0);
  Object.values(marcas).forEach((m) => tampa.add(m));

  // ---------------- água (sólido fechado, cortado) + superfície + feijão + bolhas + espuma
  const rA = R - 0.058;
  const agua = new THREE.Mesh(cil(rA, rA, AGUA - 0.065, 96), kit.mat({ color: B ? 0x8a5a3c : 0x6e4a32, rough: 0.15, corte: true, transparent: true, opacity: B ? 1 : 0.88, semContorno: true }));
  agua.position.y = 0.065 + (AGUA - 0.065) / 2;
  kit.tampaCorte(agua, B ? 0xa86f48 : 0x8a5c3c, B ? 1 : 0.9);
  corpo.add(agua);
  const gSup = new THREE.CircleGeometry(rA, 72, 0, Math.PI * 2);
  gSup.rotateX(-Math.PI / 2);
  const superficie = new THREE.Mesh(gSup, kit.mat({ color: B ? 0xb07a52 : 0x8c6244, rough: 0.12, metal: 0.1, corte: true, semContorno: true }));
  superficie.position.y = AGUA;
  superficie.userData.base = (gSup.attributes.position as THREE.BufferAttribute).array.slice();
  corpo.add(superficie);

  const r = rng(17);
  const NF = 260;
  const feijao = new THREE.InstancedMesh(esfera(0.045, 12, 8), kit.mat({ color: B ? 0x6b2a1c : 0x4a1a12, rough: 0.35, corte: true }), NF);
  const mt = new THREE.Matrix4();
  for (let i = 0; i < NF; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (rA - 0.07);
    const y = 0.09 + Math.pow(r(), 1.6) * 0.3;
    mt.compose(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(1.35, 0.85, 0.85));
    feijao.setMatrixAt(i, mt);
  }
  feijao.castShadow = false;
  feijao.userData.base = NF;
  corpo.add(feijao);

  const NB = 60;
  const bolhas = new THREE.InstancedMesh(esfera(0.03, 10, 8), kit.mat({ color: 0xf3e6d6, rough: 0.2, transparent: true, opacity: 0.75, corte: true, semContorno: true }), NB);
  bolhas.frustumCulled = false;
  corpo.add(bolhas);

  const NE = 420;
  const espuma = new THREE.InstancedMesh(esfera(1, 18, 12), kit.mat({ color: B ? 0xfff6e6 : 0xf1e4cf, rough: 0.6, corte: true, semContorno: true }), NE);
  espuma.frustumCulled = false;
  espuma.castShadow = false;
  corpo.add(espuma);
  const carinhas = new THREE.Group();
  if (B) {
    const olho = kit.mat({ basico: true, color: 0x1a0f0c });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Group();
      c.add(new THREE.Mesh(esfera(0.11, 10, 8), olho).translateX(-0.28).translateZ(0.92));
      c.add(new THREE.Mesh(esfera(0.11, 10, 8), olho).translateX(0.28).translateZ(0.92));
      c.children.forEach((o) => o.scale.set(1, 1.5, 0.4));
      c.visible = false;
      carinhas.add(c);
    }
  }
  corpo.add(carinhas);

  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as THREE.Mesh).userData.contorno) {
      m.castShadow = m.castShadow !== false;
      m.receiveShadow = true;
    }
  });
  return { g, corpo, tampa, anel, peso, furo, pino, pinoFech, janela, lingua, cadeado, agua, superficie, feijao, espuma, carinhas, bolhas, marcas, matAnel };
}

/** Distribuição da espuma: sobe da água até tampar o furinho do peso (k 0..1). Função pura. */
export function posEspuma(i: number, k: number, t: number): { p: THREE.Vector3; s: number } {
  const r = rng(1000 + i);
  const a = r() * Math.PI * 2, u = r(), v = r();
  // camada sobre a água (espalhada) + coluna fina que sobe até o furinho do peso
  const coluna = u < 0.5;
  const topo = AGUA + (H + 0.12 - AGUA) * k;
  const alt = coluna ? AGUA + v * (topo - AGUA) : AGUA + 0.015 + v * 0.13 * Math.min(1, k * 2.2);
  const rmax = coluna ? 0.05 + (1 - v) * 0.2 + 0.05 * k : (R - 0.1) * Math.sqrt(r());
  const rr = coluna ? rmax * Math.sqrt(r()) : rmax;
  const bob = Math.sin(t * (3 + u * 4) + i) * 0.01;
  const p = new THREE.Vector3(Math.cos(a) * rr, alt + bob, Math.sin(a) * rr);
  const s = (0.022 + r() * 0.04) * Math.min(1, k * 4) * (1 + 0.15 * Math.sin(t * 6 + i * 1.3));
  return { p, s };
}
