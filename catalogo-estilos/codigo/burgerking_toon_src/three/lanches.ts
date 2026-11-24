import * as THREE from "three";
import { cil, esfera, Kit, perfil, torno, transf, junta } from "./kit";
import { rng } from "./rng";
import { texCarne, texGrelhaMascara } from "./tex";

// Lanches: Whopper, Big Mac, McWhopper, copo de café. Raio-base 1 (escala no uso).
let cache: Record<string, THREE.Material> | null = null;
let cacheKit: Kit | null = null;

function mats(k: Kit) {
  if (cache && cacheKit === k) return cache;
  cacheKit = k;
  const grelha = texGrelhaMascara();
  const carneW = k.mat({ map: texCarne(1), rough: 0.75, emissive: "#ff6a1a", ei: 0 });
  if ("emissiveMap" in carneW) (carneW as THREE.MeshStandardMaterial).emissiveMap = grelha;
  cache = {
    pao: k.mat({ color: "#E9A04C", rough: 0.55, clear: 0.4 }),
    paoBaixo: k.mat({ color: "#E8B067", rough: 0.6 }),
    gergelim: k.mat({ color: "#FFF4D6", rough: 0.5, semContorno: true }),
    carneW,
    carneM: k.mat({ map: texCarne(0), rough: 0.75 }),
    alface: k.mat({ color: "#6CC24A", rough: 0.6 }),
    tomate: k.mat({ color: "#E4352B", rough: 0.4, clear: 0.6 }),
    cebola: k.mat({ color: "#F4EEF6", rough: 0.4, semContorno: true }),
    queijo: k.mat({ color: "#FFC21A", rough: 0.4 }),
    molho: k.mat({ color: "#F6A86A", rough: 0.4, semContorno: true }),
    picles: k.mat({ color: "#7D9A3A", rough: 0.5, semContorno: true }),
    copo: k.mat({ color: "#FFFFFF", rough: 0.6 }),
    tampa: k.mat({ color: "#5A3A22", rough: 0.5 }),
    luva: k.mat({ color: "#DA291C", rough: 0.6 }),
    papelBK: k.mat({ color: "#F5EBDC", rough: 0.8 }),
  };
  return cache;
}

const domo = (r: number, h: number) =>
  torno(perfil([[0.0, 0], [r * 0.97, 0], [r, h * 0.25], [r * 0.9, h * 0.62], [r * 0.55, h * 0.93], [0, h]], 18), 40);
const fatia = (r: number, h: number) => torno([[0, 0], [r * 0.96, 0], [r, h * 0.5], [r * 0.96, h], [0, h]], 40);

function gergelim(k: Kit, pai: THREE.Object3D, r: number, h: number, n: number, seed: number) {
  const g = esfera(1, 8, 6);
  const im = new THREE.InstancedMesh(g, mats(k).gergelim, n);
  const rr = rng(seed);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = rr() * Math.PI * 2;
    const d = Math.sqrt(rr()) * 0.82;
    const x = Math.cos(a) * d * r, z = Math.sin(a) * d * r;
    // altura do domo naquele raio
    const u = d;
    const y = h * (0.25 + 0.75 * Math.sqrt(Math.max(0, 1 - u * u))) - 0.005;
    const nrm = new THREE.Vector3(x / r, 0.9, z / r).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * 6));
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(r * 0.035, r * 0.014, r * 0.022));
    im.setMatrixAt(i, m);
  }
  im.castShadow = true;
  pai.add(im);
}

function alface(k: Kit, pai: THREE.Object3D, r: number, y: number, seed: number) {
  // borda ondulada
  const n = 64;
  const rr = rng(seed);
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = r * (1.08 + 0.07 * Math.sin(a * 9 + rr()) + 0.03 * rr());
    pts.push(new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad));
  }
  const sh = new THREE.Shape(pts);
  const g = new THREE.ExtrudeGeometry(sh, { depth: r * 0.05, bevelEnabled: true, bevelThickness: r * 0.02, bevelSize: r * 0.02, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  // ondula em y
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.hypot(x, z) / r;
    p.setY(i, p.getY(i) + Math.sin(Math.atan2(z, x) * 7) * r * 0.04 * d * d);
  }
  g.computeVertexNormals();
  return k.m(g, mats(k).alface, 2, pai, [0, y, 0]);
}

export type Lanche = THREE.Group & { userData: { carne?: THREE.MeshStandardMaterial; topo?: THREE.Object3D } };

/** Whopper: largo e baixo, carne grelhada, tomate, alface, cebola. */
export function whopper(k: Kit): Lanche {
  const M = mats(k);
  const g = new THREE.Group() as Lanche;
  const r = 1;
  let y = 0;
  k.m(fatia(r * 0.97, 0.16), M.paoBaixo, 2.5, g, [0, y, 0]);
  y += 0.16;
  k.m(fatia(r * 1.06, 0.16), M.carneW, 2.5, g, [0, y, 0]);
  g.userData.carne = M.carneW as THREE.MeshStandardMaterial;
  y += 0.16;
  // picles e cebola
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    k.m(cil(0.18, 0.18, 0.03, 16), M.picles, 1, g, [Math.cos(a) * 0.6, y + 0.01, Math.sin(a) * 0.6]);
  }
  y += 0.03;
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.4;
    k.m(cil(0.42, 0.42, 0.06, 24), M.tomate, 2, g, [Math.cos(a) * 0.45, y + 0.03, Math.sin(a) * 0.45]);
  }
  y += 0.07;
  alface(k, g, r * 0.98, y, 3);
  y += 0.1;
  const tg = new THREE.Group();
  tg.position.y = y;
  g.add(tg);
  k.m(domo(r, 0.55), M.pao, 3, tg);
  gergelim(k, tg, r, 0.55, 70, 11);
  g.userData.topo = tg;
  return g;
}

/** Big Mac: três pães, duas carnes, queijo, alface picada, molho. */
export function bigmac(k: Kit): Lanche {
  const M = mats(k);
  const g = new THREE.Group() as Lanche;
  const r = 0.82;
  let y = 0;
  k.m(fatia(r, 0.16), M.paoBaixo, 2.5, g, [0, y, 0]);
  y += 0.16;
  k.m(fatia(r * 0.98, 0.04), M.molho, 1, g, [0, y, 0]);
  y += 0.03;
  alface(k, g, r * 0.95, y, 5);
  y += 0.07;
  const queijo = new THREE.BoxGeometry(r * 1.55, 0.03, r * 1.55, 8, 1, 8);
  const qp = queijo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < qp.count; i++) {
    const d = Math.max(Math.abs(qp.getX(i)), Math.abs(qp.getZ(i))) / (r * 0.78);
    qp.setY(i, qp.getY(i) - Math.max(0, d - 0.75) * 0.25);
  }
  queijo.computeVertexNormals();
  k.m(queijo, M.queijo, 2, g, [0, y + 0.015, 0], [0, 0.6, 0]);
  y += 0.03;
  k.m(fatia(r * 1.02, 0.13), M.carneM, 2.5, g, [0, y, 0]);
  y += 0.13;
  k.m(fatia(r * 0.97, 0.15), M.paoBaixo, 2.5, g, [0, y, 0]); // pão do meio
  y += 0.15;
  k.m(fatia(r * 0.98, 0.04), M.molho, 1, g, [0, y, 0]);
  y += 0.03;
  alface(k, g, r * 0.95, y, 9);
  y += 0.07;
  k.m(fatia(r * 1.02, 0.13), M.carneM, 2.5, g, [0, y, 0]);
  y += 0.13;
  const tg = new THREE.Group();
  tg.position.y = y;
  g.add(tg);
  k.m(domo(r, 0.62), M.pao, 3, tg);
  gergelim(k, tg, r, 0.62, 60, 21);
  g.userData.topo = tg;
  return g;
}

/** McWhopper: metade Whopper, metade Big Mac (montagem por camada: 0..1). */
export function mcwhopper(k: Kit) {
  const g = new THREE.Group();
  const a = whopper(k);
  const b = bigmac(k);
  const corte = (grp: THREE.Object3D, lado: number) => {
    const plano = new THREE.Plane(new THREE.Vector3(lado, 0, 0), 0);
    grp.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh && !o.userData.contorno) {
        const m = (me.material as THREE.Material).clone();
        m.clippingPlanes = [plano];
        m.side = THREE.DoubleSide;
        me.material = m;
      }
      if (o.userData.contorno) o.visible = false;
    });
  };
  corte(a, -1);
  corte(b, 1);
  b.scale.setScalar(1.2);
  g.add(a, b);
  return g;
}

/** Copo de café grande (para viagem). */
export function cafe(k: Kit) {
  const M = mats(k);
  const g = new THREE.Group();
  k.m(cil(0.34, 0.26, 1, 32), M.copo, 2.5, g, [0, 0.5, 0]);
  k.m(cil(0.35, 0.35, 0.3, 32), M.luva, 2, g, [0, 0.5, 0]);
  k.m(cil(0.37, 0.36, 0.08, 32), M.tampa, 2, g, [0, 1.04, 0]);
  k.m(cil(0.3, 0.34, 0.06, 32), M.tampa, 2, g, [0, 1.1, 0]);
  return g;
}

export const _transf = transf;
export const _junta = junta;
