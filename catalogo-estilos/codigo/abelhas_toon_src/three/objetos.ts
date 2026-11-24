import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { apontaY, capsula, cil, esfera, Kit, perfil, torno, tubo, V3 } from "./kit";
import { rng } from "./rng";
import { texCascaMaracuja, texCorona, texListrasAbelha, texPao, texPlaca, texPolpa, texToldo } from "./tex";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- abelha
// Frente = +Z, costas = +Y. Comprimento ~1,6 cm na escala 1.
export function abelha(k: Kit, o: { fantasma?: boolean; asas?: number } = {}) {
  const g = new THREE.Group();
  const F = !!o.fantasma;
  const fm = new THREE.MeshBasicMaterial({ color: "#ffd56a", transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, px = 2, pos?: V3, rot?: V3, esc?: V3 | number) => {
    if (F) {
      const me = new THREE.Mesh(geo, fm);
      if (pos) me.position.set(...pos);
      if (rot) me.rotation.set(...rot);
      if (esc !== undefined) typeof esc === "number" ? me.scale.setScalar(esc) : me.scale.set(...esc);
      g.add(me);
      return me;
    }
    return k.m(geo, mat, px, g, pos, rot, esc);
  };
  const pelo = k.mat({ color: k.dir === "B" ? "#f0a32a" : "#d99a3a", rough: 0.95 });
  const escuro = k.mat({ color: "#2a1a12", rough: 0.6 });
  const olho = k.mat({ color: "#15100e", rough: 0.15, liso: true, clear: 1 });
  const brilho = k.mat({ color: "#ffffff", emissive: "#ffffff", ei: 0.6, liso: true, semContorno: true });
  // tórax peludo
  mk(esfera(0.0044, 28, 20), pelo, 2.2, [0, 0, 0]);
  // cabeça
  mk(esfera(0.0036, 28, 20), escuro, 2.2, [0, -0.0004, 0.0062]);
  // olhos grandes (carisma)
  for (const s of [-1, 1]) {
    mk(esfera(0.0021, 20, 16), olho, 1.4, [s * 0.0022, 0.0006, 0.0074], undefined, [0.8, 1.05, 0.75]);
    if (!F) mk(esfera(0.0006, 10, 8), brilho, 1, [s * 0.0024, 0.0015, 0.0089]);
    // antenas
    mk(tubo([[s * 0.001, 0.0022, 0.0083], [s * 0.0026, 0.0058, 0.0098], [s * 0.0042, 0.0074, 0.0123]], () => 0.00035, 10, 6), escuro, 1.2);
    mk(esfera(0.0006, 10, 8), escuro, 1.2, [s * 0.0042, 0.0074, 0.0123]);
  }
  // abdômen listrado (polo ao longo de Z)
  const abd = esfera(1, 32, 24);
  abd.rotateX(-Math.PI / 2);
  mk(abd, k.mat({ map: texListrasAbelha(k.dir === "B" ? "#ffc21a" : "#f2b21b"), rough: 0.9 }), 2.2, [0, -0.0008, -0.0088], [0.18, 0, 0], [0.0049, 0.0046, 0.0072]);
  // patinhas com cestinha de pólen
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = 0.0022 - i * 0.0024;
      mk(tubo([[s * 0.002, -0.003, z], [s * 0.0045, -0.0055, z - 0.0005], [s * 0.004, -0.0085, z - 0.0012]], () => 0.00045, 10, 6), escuro, 1.2);
    }
    mk(esfera(0.0011, 12, 10), k.mat({ color: "#ff9d1c", rough: 0.9 }), 1.2, [s * 0.0043, -0.0068, -0.0035]);
  }
  // asas
  const asaM = F
    ? fm
    : new THREE.MeshPhysicalMaterial({ color: "#eef6ff", transparent: true, opacity: k.dir === "B" ? 0.75 : 0.42, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false, transmission: 0, sheen: 0.4, sheenColor: new THREE.Color("#c9e6ff") });
  asaM.userData.semContorno = true;
  const abre = o.asas ?? 0.6;
  const asas: { p: THREE.Group; s: number; base: number }[] = [];
  g.userData.asas = asas;
  for (const s of [-1, 1]) {
    for (const [len, w, dz, ang] of [
      [0.0105, 0.0045, -0.0012, 0.35],
      [0.007, 0.0032, -0.0034, 0.6],
    ] as const) {
      const pivo = new THREE.Group();
      pivo.position.set(s * 0.0015, 0.0036, dz);
      pivo.rotation.set(0, s * (0.35 + ang * 0.5), s * (-0.25 - abre * 0.9));
      asas.push({ p: pivo, s, base: s * (-0.25 - abre * 0.9) });
      const asa = new THREE.Mesh(new THREE.CircleGeometry(1, 28), asaM);
      asa.scale.set(w, len, 1);
      asa.position.set(0, len * 0.95, 0);
      asa.rotation.x = -Math.PI / 2 + 0.25;
      const asaPai = new THREE.Group();
      asaPai.add(asa);
      asaPai.rotation.x = -1.15;
      pivo.add(asaPai);
      if (k.dir === "B" && !F) {
        // contorno fino da asa (anel)
        const anel = new THREE.Mesh(new THREE.RingGeometry(0.93, 1.0, 32), new THREE.MeshBasicMaterial({ color: "#1a0f0c", side: THREE.DoubleSide }));
        anel.scale.copy(asa.scale);
        anel.position.copy(asa.position);
        anel.rotation.copy(asa.rotation);
        asaPai.add(anel);
      }
      g.add(pivo);
    }
  }
  return g;
}

// ---------------------------------------------------------------- flor de laranjeira
// Eixo da flor = +Y local; diâmetro ~3,6 cm.
export function florLaranjeira(k: Kit, abre = 1) {
  const g = new THREE.Group();
  const petM = k.mat({ color: k.dir === "B" ? "#ffffff" : "#fffaf0", rough: 0.55 });
  const verde = k.mat({ color: k.dir === "B" ? "#5fb83a" : "#6a9a3a", rough: 0.7 });
  const amarelo = k.mat({ color: "#ffd23a", rough: 0.7 });
  const ang = 1.25 - 0.55 * abre;
  const petalas: THREE.Group[] = [];
  g.userData.petalas = petalas;
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Group();
    p.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
    const q = new THREE.Group();
    q.rotation.x = ang;
    petalas.push(q);
    p.add(q);
    const pet = esfera(1, 20, 14);
    pet.translate(0, 1, 0);
    k.m(pet, petM, 2, q, [0, 0.001, 0], [0.12, 0, 0], [0.0062, 0.0085, 0.0019]);
    g.add(p);
  }
  // cálice
  k.m(esfera(0.0042, 16, 10), verde, 1.6, g, [0, -0.001, 0], undefined, [1, 0.6, 1]);
  // estames
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const dir = V(Math.cos(a) * 0.32, 1, Math.sin(a) * 0.32).normalize();
    const fio = new THREE.Mesh();
    void fio;
    const grupo = new THREE.Group();
    apontaY(grupo, dir);
    k.m(cil(0.00045, 0.00055, 0.009, 6), k.mat({ color: "#fff4cf", rough: 0.6 }), 1, grupo, [0, 0.0045, 0]);
    k.m(esfera(0.0011, 10, 8), amarelo, 1, grupo, [0, 0.0095, 0], undefined, [1, 0.7, 1.3]);
    g.add(grupo);
  }
  // pistilo
  k.m(cil(0.0011, 0.0013, 0.011, 10), verde, 1.2, g, [0, 0.0055, 0]);
  k.m(esfera(0.0019, 14, 10), k.mat({ color: "#d9d23a", rough: 0.7 }), 1.2, g, [0, 0.0115, 0]);
  return g;
}

export function botao(k: Kit) {
  const g = new THREE.Group();
  k.m(esfera(0.004, 18, 14), k.mat({ color: "#fffaf0", rough: 0.5 }), 1.6, g, [0, 0.006, 0], undefined, [1, 1.7, 1]);
  k.m(esfera(0.0035, 14, 10), k.mat({ color: k.dir === "B" ? "#5fb83a" : "#6a9a3a", rough: 0.7 }), 1.4, g, [0, 0.0, 0], undefined, [1, 0.7, 1]);
  return g;
}

export function folha(k: Kit, comp = 0.05, cor?: string) {
  const g = new THREE.Group();
  const m = k.mat({ color: cor ?? (k.dir === "B" ? "#2f9a3e" : k.dir === "C" ? "#3f8a3a" : "#2f6b2c"), rough: 0.5 });
  const geo = esfera(1, 24, 12);
  // ponta fina: afina as extremidades em Y
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const s = Math.pow(1 - Math.abs(y), 0.35) * (y > 0 ? 1 - 0.35 * y : 1);
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s + 0.25 * (1 - y * y)); // curvatura
  }
  geo.computeVertexNormals();
  geo.translate(0, 1, 0);
  k.m(geo, m, 2, g, [0, 0, 0], undefined, [comp * 0.38, comp * 0.5, comp * 0.06]);
  return g;
}

/** Ramo de laranjeira com flores (centro da flor principal na origem). */
export function ramoLaranjeira(k: Kit) {
  const g = new THREE.Group();
  const casca = k.mat({ color: k.dir === "B" ? "#7a5534" : "#6e5236", rough: 0.9 });
  const verdeR = k.mat({ color: k.dir === "B" ? "#5fae3a" : "#5c8a34", rough: 0.8 });
  k.m(tubo([[0.05, -0.3, 0.04], [0.03, -0.15, 0.02], [0.008, -0.04, 0.0], [0.0, -0.008, 0.0]], (u) => 0.0042 - 0.0018 * u, 40, 12), casca, 2.4, g);
  // galhinhos
  k.m(tubo([[0.012, -0.06, 0.003], [-0.02, -0.0, -0.01], [-0.036, 0.034, -0.016]], (u) => 0.0016 - 0.0005 * u, 24, 10), verdeR, 1.6, g);
  k.m(tubo([[0.016, -0.08, 0.004], [0.035, -0.02, -0.004], [0.04, 0.035, -0.012]], (u) => 0.0015 - 0.0005 * u, 24, 10), verdeR, 1.6, g);
  const f1 = florLaranjeira(k, 1);
  apontaY(f1, V(0.05, 0.6, 0.8));
  g.add(f1);
  const f2 = florLaranjeira(k, 0.85);
  f2.position.set(-0.038, 0.036, -0.017);
  apontaY(f2, V(-0.6, 0.6, 0.5));
  f2.scale.setScalar(0.9);
  g.add(f2);
  const b1 = botao(k);
  b1.position.set(0.04, 0.036, -0.012);
  apontaY(b1, V(0.3, 1, 0.1));
  g.add(b1);
  const b2 = botao(k);
  b2.position.set(-0.012, 0.045, -0.02);
  apontaY(b2, V(-0.2, 1, 0.2));
  b2.scale.setScalar(0.8);
  g.add(b2);
  const fol: [V3, V3, number][] = [
    [[0.014, -0.05, -0.008], [0.9, 0.35, -0.2], 0.052],
    [[0.006, -0.03, -0.012], [-0.9, 0.4, -0.3], 0.05],
    [[0.03, -0.11, 0.0], [-0.8, 0.5, 0.1], 0.058],
    [[0.034, 0.012, -0.018], [0.7, 0.5, -0.5], 0.046],
    [[-0.022, 0.006, -0.022], [-0.6, 0.7, -0.6], 0.044],
    [[0.042, -0.16, 0.015], [0.9, 0.25, 0.2], 0.06],
  ];
  for (const [p, d, c] of fol) {
    const f = folha(k, c);
    f.position.set(...p);
    apontaY(f, V(...d));
    f.rotateY(0.6);
    g.add(f);
  }
  g.userData.flor1 = f1;
  return g;
}

// ---------------------------------------------------------------- laranja e corte
export function laranja(k: Kit, r = 0.04) {
  const g = new THREE.Group();
  k.m(esfera(r, 40, 30), k.mat({ color: k.dir === "B" ? "#ff8a14" : "#f58a1f", rough: 0.6 }), 3, g, [0, 0, 0], undefined, [1, 0.94, 1]);
  k.m(esfera(r * 0.12, 10, 8), k.mat({ color: "#4f7a2a", rough: 0.8 }), 1.5, g, [0, r * 0.93, 0], undefined, [1, 0.4, 1]);
  return g;
}

/** Meia laranja com a face cortada para +Y. */
export function meiaLaranja(k: Kit, r = 0.04) {
  const g = new THREE.Group();
  const casca = new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  k.m(casca, k.mat({ color: k.dir === "B" ? "#ff8a14" : "#f58a1f", rough: 0.6, side: THREE.DoubleSide }), 3, g);
  const tampa = new THREE.CircleGeometry(r * 0.995, 48);
  tampa.rotateX(-Math.PI / 2);
  const me = k.m(tampa, k.mat({ map: texPolpa("laranja"), rough: 0.35, liso: k.dir === "C" ? false : undefined, semContorno: true }), 2, g, [0, 0.0005, 0]);
  me.castShadow = false;
  return g;
}

export function fatiaLaranja(k: Kit, r = 0.034, h = 0.006) {
  const g = new THREE.Group();
  const polpa = k.mat({ map: texPolpa("laranja"), rough: 0.4 });
  const casca = k.mat({ color: k.dir === "B" ? "#ff8a14" : "#f58a1f", rough: 0.6 });
  const geo = new THREE.CylinderGeometry(r, r, h, 48);
  const me = new THREE.Mesh(geo, [casca, polpa, polpa]);
  me.castShadow = me.receiveShadow = true;
  k.contorno(me as unknown as THREE.Mesh, 2);
  g.add(me);
  return g;
}

export function faca(k: Kit) {
  // origem na junção lâmina/cabo; lâmina para -X, fio em y=0, dorso em y=+0.03; cabo para +X
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(-0.13, 0.0);
  s.quadraticCurveTo(-0.152, 0.004, -0.158, 0.016);
  s.lineTo(-0.12, 0.028);
  s.lineTo(0, 0.031);
  s.lineTo(0, 0);
  const lam = new THREE.ExtrudeGeometry(s, { depth: 0.0016, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0005, bevelSegments: 2 });
  lam.translate(0, 0, -0.0008);
  k.m(lam, k.mat({ color: "#d9dde3", rough: 0.25, metal: 0.9, liso: true }), 2, g);
  const cabo = new RoundedBoxGeometry(0.115, 0.022, 0.016, 4, 0.007);
  k.m(cabo, k.mat({ color: k.dir === "B" ? "#3a2418" : "#4a2e1e", rough: 0.6 }), 2.6, g, [0.06, 0.017, 0]);
  return g;
}

export function tabua(k: Kit, w = 0.36, d = 0.24, h = 0.022) {
  const g = new THREE.Group();
  k.m(new RoundedBoxGeometry(w, h, d, 3, 0.008), k.mat({ color: k.dir === "B" ? "#d9a066" : "#c89058", rough: 0.75 }), 3, g, [0, h / 2, 0]);
  return g;
}

export function xicara(k: Kit, cor = "#ffffff") {
  const g = new THREE.Group();
  const cer = k.mat({ color: cor, rough: 0.3, liso: k.dir === "C" ? false : true });
  const pr = perfil([[0.0001, 0.0], [0.026, 0.0], [0.034, 0.012], [0.039, 0.04], [0.041, 0.062], [0.0375, 0.062], [0.035, 0.04], [0.03, 0.014], [0.0001, 0.008]], 40);
  k.m(torno(pr, 48), cer, 3, g);
  const cafe = new THREE.CircleGeometry(0.0368, 40);
  cafe.rotateX(-Math.PI / 2);
  g.userData.cafe = k.m(cafe, k.mat({ color: "#3b1f10", rough: 0.15, liso: true, semContorno: true }), 1, g, [0, 0.052, 0]);
  k.m(new THREE.TorusGeometry(0.014, 0.0042, 12, 28, Math.PI * 1.25), cer, 2.4, g, [0.043, 0.034, 0], [0, 0, -Math.PI * 0.62]);
  // pires
  const pp = perfil([[0.0001, 0.0], [0.05, 0.0], [0.066, 0.008], [0.072, 0.012], [0.068, 0.013], [0.05, 0.006], [0.0001, 0.005]], 30);
  k.m(torno(pp, 48), cer, 3, g, [0, -0.012, 0]);
  return g;
}

export function vapor(n = 3, cor = "#ffffff") {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.28, depthWrite: false });
  for (let i = 0; i < n; i++) {
    const pts: V3[] = [];
    for (let j = 0; j < 8; j++) pts.push([Math.sin(j * 1.2 + i * 2) * 0.008 + (i - 1) * 0.01, j * 0.012, Math.cos(j * 1.1 + i) * 0.004]);
    g.add(new THREE.Mesh(tubo(pts, (u) => 0.0035 * (1 - u * 0.7), 40, 8), m));
  }
  return g;
}

// ---------------------------------------------------------------- maracujá
export function florMaracuja(k: Kit) {
  // eixo +Y; raio ~4,5 cm
  const g = new THREE.Group();
  const branco = k.mat({ color: k.dir === "B" ? "#ffffff" : "#f6f3ec", rough: 0.55 });
  const verdeB = k.mat({ color: k.dir === "B" ? "#d9efc6" : "#dfe9cf", rough: 0.6 });
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Group();
    p.rotation.y = (i / 10) * Math.PI * 2;
    const q = new THREE.Group();
    q.rotation.x = 1.38 - (i % 2) * 0.08;
    (g.userData.petalas ??= []).push(q);
    p.add(q);
    const pet = esfera(1, 20, 12);
    pet.translate(0, 1, 0);
    k.m(pet, i % 2 ? verdeB : branco, 2, q, [0, 0.003, (i % 2) * -0.001], undefined, [0.0085, 0.021, 0.0018]);
    g.add(p);
  }
  // corona (filamentos listrados)
  const n = 90;
  const fil = new THREE.CylinderGeometry(0.0006, 0.0008, 1, 5);
  fil.translate(0, 0.5, 0);
  const corM = k.mat({ map: texCorona(), rough: 0.6 });
  const inst = new THREE.InstancedMesh(fil, corM, n * 2);
  const r = rng(4);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n * 2; i++) {
    const anel = i < n ? 0 : 1;
    const a = ((i % n) / n) * Math.PI * 2 + anel * 0.03;
    const comp = anel === 0 ? 0.034 + r() * 0.004 : 0.022 + r() * 0.003;
    const incl = anel === 0 ? 1.38 + r() * 0.06 : 1.0;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(incl, a, 0, "YXZ"));
    m4.compose(V(0, 0.003 + anel * 0.0015, 0), q, V(1, comp, 1));
    inst.setMatrixAt(i, m4);
  }
  inst.castShadow = true;
  inst.receiveShadow = true;
  k.contorno(inst, 0.8);
  g.add(inst);
  // coluna (androginóforo)
  const verde = k.mat({ color: k.dir === "B" ? "#8ccf5a" : "#9cc06a", rough: 0.6 });
  k.m(cil(0.0028, 0.0034, 0.022, 14), verde, 1.6, g, [0, 0.013, 0]);
  // ovário
  k.m(esfera(0.0042, 16, 12), verde, 1.6, g, [0, 0.026, 0], undefined, [1, 1.2, 1]);
  // 5 estames com anteras amarelas cheias de pólen
  const anteras: THREE.Object3D[] = [];
  const amar = k.mat({ color: "#ffc928", rough: 0.85 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const ca = Math.cos(a), sa = Math.sin(a);
    k.m(tubo([[0, 0.022, 0], [ca * 0.008, 0.024, sa * 0.008], [ca * 0.013, 0.019, sa * 0.013]], () => 0.0008, 10, 6), verde, 1.2, g);
    const an = k.m(esfera(1, 16, 10), amar, 1.4, g, [ca * 0.014, 0.0175, sa * 0.014], [0, -a, 0], [0.0028, 0.0018, 0.0062]);
    anteras.push(an);
  }
  // 3 estigmas
  const roxo = k.mat({ color: "#6b3a5a", rough: 0.6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.9;
    const ca = Math.cos(a), sa = Math.sin(a);
    k.m(tubo([[0, 0.029, 0], [ca * 0.005, 0.036, sa * 0.005], [ca * 0.009, 0.038, sa * 0.009]], () => 0.0008, 10, 6), roxo, 1.2, g);
    k.m(esfera(0.0019, 12, 10), roxo, 1.2, g, [ca * 0.0095, 0.0385, sa * 0.0095], undefined, [1, 0.8, 1]);
  }
  g.userData.anteras = anteras;
  return g;
}

export function maracuja(k: Kit, r = 0.04) {
  const g = new THREE.Group();
  k.m(esfera(r, 36, 28), k.mat({ map: texCascaMaracuja(), color: k.dir === "B" ? "#ffd84a" : "#ffffff", rough: 0.55 }), 3, g, [0, 0, 0], undefined, [1, 1.12, 1]);
  k.m(cil(0.0022, 0.003, 0.012, 8), k.mat({ color: "#6a7a3a", rough: 0.8 }), 1.5, g, [0, r * 1.15, 0]);
  return g;
}

export function meioMaracuja(k: Kit, r = 0.04) {
  const g = new THREE.Group();
  const casca = new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  k.m(casca, k.mat({ map: texCascaMaracuja(), color: k.dir === "B" ? "#ffd84a" : "#ffffff", rough: 0.55, side: THREE.DoubleSide }), 3, g, [0, 0, 0], undefined, [1, 1.1, 1]);
  const tampa = new THREE.CircleGeometry(r * 0.995, 48);
  tampa.rotateX(-Math.PI / 2);
  k.m(tampa, k.mat({ map: texPolpa("maracuja"), rough: 0.2, semContorno: true }), 2, g, [0, 0.0005, 0]);
  return g;
}

export function pincel(k: Kit) {
  // eixo +Y: do fim do cabo (0) à ponta das cerdas (~0,19)
  const g = new THREE.Group();
  k.m(torno(perfil([[0.0001, 0], [0.0032, 0.002], [0.0042, 0.06], [0.0048, 0.14], [0.0001, 0.142]], 20), 20), k.mat({ color: k.dir === "B" ? "#e0552b" : "#c8502e", rough: 0.5 }), 2.2, g);
  k.m(cil(0.0052, 0.0049, 0.02, 18), k.mat({ color: "#c9ccd2", rough: 0.25, metal: 0.9, liso: true }), 2, g, [0, 0.15, 0]);
  k.m(torno(perfil([[0.0001, 0], [0.0052, 0.0], [0.0058, 0.008], [0.004, 0.018], [0.0006, 0.026], [0.0001, 0.0262]], 16), 18), k.mat({ color: "#e8d6a8", rough: 0.9 }), 2, g, [0, 0.16, 0]);
  k.m(esfera(0.0028, 14, 10), k.mat({ color: "#ffc21a", rough: 0.95 }), 1.4, g, [0, 0.183, 0], undefined, [1, 1.3, 1]);
  return g;
}

/** Galho de maracujá com folhas e gavinhas. */
export function ramoMaracuja(k: Kit) {
  const g = new THREE.Group();
  const verde = k.mat({ color: k.dir === "B" ? "#4fae3a" : "#5c8a34", rough: 0.7 });
  k.m(tubo([[-0.2, 0.08, -0.05], [-0.08, 0.06, -0.02], [0.0, 0.02, 0.0], [0.1, 0.05, -0.03], [0.22, 0.03, -0.06]], () => 0.0035, 60, 10), verde, 2.2, g);
  // gavinha
  const pts: V3[] = [];
  for (let i = 0; i < 40; i++) {
    const t = i / 39;
    pts.push([0.1 + t * 0.03 + Math.cos(t * 14) * 0.008 * t, 0.05 + t * 0.05, -0.03 + Math.sin(t * 14) * 0.008 * t]);
  }
  k.m(tubo(pts, () => 0.0012, 80, 6), verde, 1.4, g);
  for (const [p, d, c] of [
    [[-0.1, 0.065, -0.02], [-0.6, 0.6, 0.5], 0.09],
    [[0.12, 0.05, -0.035], [0.7, 0.5, 0.5], 0.085],
    [[-0.04, 0.045, -0.01], [-0.2, 0.9, -0.4], 0.08],
  ] as [V3, V3, number][]) {
    const f = folha(k, c);
    f.position.set(...p);
    apontaY(f, V(...d));
    g.add(f);
  }
  return g;
}

// ---------------------------------------------------------------- feira
export function caixote(k: Kit, w = 0.34, d = 0.26, h = 0.13, cor = "#c9955a") {
  const g = new THREE.Group();
  const mad = k.mat({ color: cor, rough: 0.8 });
  const e = 0.012;
  k.m(new THREE.BoxGeometry(w, e, d), mad, 2, g, [0, e / 2, 0]);
  for (const s of [-1, 1]) {
    for (const y of [0.03, 0.09]) {
      k.m(new THREE.BoxGeometry(w, 0.04, e), mad, 2, g, [0, y, s * (d / 2 - e / 2)]);
      k.m(new THREE.BoxGeometry(e, 0.04, d), mad, 2, g, [s * (w / 2 - e / 2), y, 0]);
    }
    k.m(new THREE.BoxGeometry(0.02, h, 0.02), mad, 2, g, [s * (w / 2 - 0.01), h / 2, d / 2 - 0.01]);
    k.m(new THREE.BoxGeometry(0.02, h, 0.02), mad, 2, g, [s * (w / 2 - 0.01), h / 2, -d / 2 + 0.01]);
  }
  return g;
}

export function pilhaFrutas(k: Kit, n: number, r: number, cor: string, w = 0.3, d = 0.22, seed = 1, fazer?: () => THREE.Object3D) {
  const g = new THREE.Group();
  const rr = rng(seed);
  const m = k.mat({ color: cor, rough: 0.5 });
  let i = 0;
  for (let camada = 0; camada < 3 && i < n; camada++) {
    const nx = Math.max(1, Math.floor((w - camada * r) / (r * 2.05)));
    const nz = Math.max(1, Math.floor((d - camada * r) / (r * 2.05)));
    for (let a = 0; a < nx && i < n; a++) {
      for (let b = 0; b < nz && i < n; b++) {
        const x = -((nx - 1) * r * 2.05) / 2 + a * r * 2.05 + (rr() - 0.5) * r * 0.2;
        const z = -((nz - 1) * r * 2.05) / 2 + b * r * 2.05 + (rr() - 0.5) * r * 0.2;
        const y = 0.012 + r + camada * r * 1.45;
        if (fazer) {
          const o = fazer();
          o.position.set(x, y, z);
          o.rotation.set(rr() * 3, rr() * 3, 0);
          g.add(o);
        } else k.m(esfera(r, 20, 14), m, 2, g, [x, y, z]);
        i++;
      }
    }
  }
  return g;
}

/** Banca de feira: mesa, saia, toldo listrado e plaquinha. Frente para +Z. */
export function banca(k: Kit, o: { toldo: [string, string]; saia: string; placa?: string; w?: number }) {
  const g = new THREE.Group();
  const w = o.w ?? 1.2, d = 0.62, h = 0.78;
  const mad = k.mat({ color: k.dir === "B" ? "#b07a48" : "#9c6c42", rough: 0.8 });
  k.m(new THREE.BoxGeometry(w, 0.035, d), mad, 3, g, [0, h, 0]);
  const saia = k.mat({ color: o.saia, rough: 0.9 });
  k.m(new THREE.BoxGeometry(w, 0.5, 0.01), saia, 3, g, [0, h - 0.27, d / 2 + 0.005]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      k.m(cil(0.018, 0.018, h, 10), mad, 2.4, g, [sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.03)]);
      k.m(cil(0.012, 0.012, 1.1, 10), k.mat({ color: "#8a8f96", rough: 0.4, metal: 0.8 }), 2, g, [sx * (w / 2 - 0.03), h + 0.55, sz * (d / 2 - 0.03)]);
    }
  const toldo = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, d + 0.35), k.mat({ map: texToldo(o.toldo[0], o.toldo[1]), rough: 0.9, side: THREE.DoubleSide }));
  toldo.position.set(0, h + 1.12, 0.05);
  toldo.rotation.x = -Math.PI / 2 + 0.22;
  toldo.castShadow = true;
  toldo.receiveShadow = true;
  k.contorno(toldo, 3);
  g.add(toldo);
  // franja do toldo
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, 0.09), k.mat({ map: texToldo(o.toldo[0], o.toldo[1]), rough: 0.9, side: THREE.DoubleSide }));
  fr.position.set(0, h + 1.0, 0.05 + (d + 0.35) / 2 * Math.cos(0.22) + 0.01);
  k.contorno(fr, 2);
  g.add(fr);
  if (o.placa) {
    const pl = new THREE.Group();
    pl.position.set(0.22, h + 0.32, d / 2 - 0.08);
    k.m(cil(0.006, 0.006, 0.3, 8), mad, 2, pl, [0, -0.15, 0]);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.012), [mad, mad, mad, mad, k.mat({ map: texPlaca(o.placa), rough: 0.9, emissive: "#ffffff", ei: 0 }), mad]);
    const tm = (tab.material as THREE.Material[])[4] as THREE.MeshStandardMaterial;
    tm.emissiveMap = tm.map;
    tm.emissiveIntensity = k.dir === "B" ? 0.35 : 0.15;
    tab.castShadow = true;
    k.contorno(tab, 2.5);
    pl.add(tab);
    g.add(pl);
  }
  g.userData.topo = h + 0.018;
  return g;
}

// ---------------------------------------------------------------- prato do café da manhã
export function prato(k: Kit, R = 0.13) {
  const g = new THREE.Group();
  const pr = perfil([[0.0001, 0], [R * 0.6, 0], [R * 0.68, 0.003], [R * 0.95, 0.014], [R, 0.017], [R * 0.985, 0.019], [R * 0.93, 0.0165], [R * 0.66, 0.006], [0.0001, 0.005]], 40);
  k.m(torno(pr, 64), k.mat({ color: k.dir === "C" ? "#f6efe2" : "#fbf8f2", rough: 0.3, liso: k.dir !== "C" }), 3, g);
  return g;
}

export function morango(k: Kit, s = 1) {
  const g = new THREE.Group();
  const pr = perfil([[0.0001, -0.0], [0.006, 0.003], [0.012, 0.014], [0.0135, 0.024], [0.008, 0.031], [0.0001, 0.032]], 20);
  k.m(torno(pr, 28), k.mat({ map: texPolpa("morango"), rough: 0.4 }), 2, g, [0, 0, 0], undefined, s);
  const verde = k.mat({ color: k.dir === "B" ? "#3fae3a" : "#4a8a34", rough: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.m(esfera(1, 10, 8), verde, 1.2, g, [Math.cos(a) * 0.006 * s, 0.031 * s, Math.sin(a) * 0.006 * s], [0, -a, 0.35], [0.0065 * s, 0.0012 * s, 0.003 * s]);
  }
  return g;
}

export function fatiaPao(k: Kit) {
  const g = new THREE.Group();
  const casca = k.mat({ color: k.dir === "B" ? "#c9853f" : "#b9773a", rough: 0.8 });
  const miolo = k.mat({ map: texPao(), rough: 0.9 });
  const geo = new RoundedBoxGeometry(0.085, 0.014, 0.075, 3, 0.005);
  const me = new THREE.Mesh(geo, casca);
  me.castShadow = me.receiveShadow = true;
  k.contorno(me, 2.4);
  g.add(me);
  const topo = new THREE.Mesh(new THREE.PlaneGeometry(0.077, 0.067), miolo);
  topo.rotation.x = -Math.PI / 2;
  topo.position.y = 0.0072;
  topo.receiveShadow = true;
  g.add(topo);
  return g;
}

/** Bate as asas da abelha (rápido) — t em segundos. */
export function bateAsas(ab: THREE.Object3D, t: number, amp = 0.55, hz = 22) {
  const a = ab.userData.asas as { p: THREE.Group; s: number; base: number }[] | undefined;
  if (!a) return;
  for (const w of a) w.p.rotation.z = w.base + w.s * amp * Math.sin(t * hz * Math.PI * 2);
}

/** Mamangava: abelha grande, preta e peluda (Xylocopa). */
export function mamangava(k: Kit) {
  const g = abelha(k, { asas: 0.9 });
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.userData.contorno) return;
    const mt = m.material as THREE.MeshToonMaterial;
    if (mt.map && mt.map.image && (mt.map.image as HTMLCanvasElement).height === 256 && (mt.map.image as HTMLCanvasElement).width === 8) {
      mt.map = null;
      mt.color = new THREE.Color("#1d1820");
    } else if (mt.color && mt.color.getHexString() === new THREE.Color("#f0a32a").getHexString()) {
      mt.color = new THREE.Color("#ffd23a");
    }
  });
  g.scale.setScalar(1.5);
  return g;
}

/** Bule de café (toon). Bico para +X. */
export function bule(k: Kit, cor = "#3fae9a") {
  const g = new THREE.Group();
  const m = k.mat({ color: cor, rough: 0.4 });
  const pr = perfil([[0.0001, 0], [0.05, 0], [0.062, 0.03], [0.058, 0.07], [0.04, 0.095], [0.022, 0.1], [0.0001, 0.1]], 30);
  k.m(torno(pr, 40), m, 3, g);
  k.m(esfera(0.012, 16, 12), k.mat({ color: "#2a2a2a", rough: 0.4 }), 2, g, [0, 0.108, 0]);
  k.m(tubo([[0.05, 0.03, 0], [0.085, 0.06, 0], [0.105, 0.1, 0]], (u) => 0.011 - 0.005 * u, 20, 10), m, 2.5, g);
  k.m(new THREE.TorusGeometry(0.03, 0.007, 10, 24, Math.PI * 1.2), m, 2.5, g, [-0.058, 0.055, 0], [0, 0, Math.PI * 0.4]);
  g.userData.bico = new THREE.Vector3(0.105, 0.1, 0);
  return g;
}

/** Galinha e porquinho de brinquedo (toon). */
export function galinha(k: Kit) {
  const g = new THREE.Group();
  const b = k.mat({ color: "#ffffff", rough: 0.6 });
  k.m(esfera(0.04, 24, 18), b, 3, g, [0, 0.045, 0], undefined, [1, 0.9, 1.2]);
  k.m(esfera(0.024, 20, 14), b, 3, g, [0, 0.09, 0.035]);
  k.m(esfera(0.009, 12, 8), k.mat({ color: "#e8473a" }), 2, g, [0, 0.117, 0.033], undefined, [0.6, 1, 1.4]);
  k.m(new THREE.ConeGeometry(0.008, 0.016, 10), k.mat({ color: "#ffb21a" }), 2, g, [0, 0.088, 0.064], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) k.m(esfera(0.004, 8, 6), k.mat({ color: "#1a1410" }), 1, g, [s * 0.012, 0.096, 0.052]);
  k.m(esfera(0.022, 14, 10), b, 2.5, g, [0, 0.06, -0.05], undefined, [0.7, 1.2, 0.6]);
  for (const s of [-1, 1]) k.m(cil(0.004, 0.004, 0.03, 8), k.mat({ color: "#ffb21a" }), 1.6, g, [s * 0.015, 0.012, 0]);
  return g;
}
export function porquinho(k: Kit) {
  const g = new THREE.Group();
  const r = k.mat({ color: "#ff9fb2", rough: 0.6 });
  k.m(esfera(0.05, 24, 18), r, 3, g, [0, 0.055, 0], undefined, [1, 0.85, 1.25]);
  k.m(cil(0.016, 0.018, 0.014, 18), r, 2, g, [0, 0.06, 0.066], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    k.m(esfera(0.005, 8, 6), k.mat({ color: "#1a1410" }), 1, g, [s * 0.018, 0.08, 0.052]);
    k.m(new THREE.ConeGeometry(0.012, 0.02, 10), r, 2, g, [s * 0.025, 0.1, 0.03], [0.3, 0, s * -0.4]);
    for (const z of [-0.03, 0.03]) k.m(cil(0.009, 0.009, 0.025, 10), r, 2, g, [s * 0.025, 0.012, z]);
  }
  return g;
}
