import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cil, esfera, Kit, transf, tubo, V3 } from "./kit";
import { fbm, rng } from "./rng";
import { texCelular, texChamada, texCorte, texGrama, texNota, texRotuloBateria, texTelha } from "./tex2";

// ----------------------------------------------------------------------------------------------
// Planta do sítio (tabuleiro 6,4 x 6,4, topo em y = 0; +z = frente, para a câmera)
export const TAB = 6.4;
export const P = {
  casa: [0.2, 0, -1.0] as V3,
  varanda: [0.2, 0, 0.0] as V3,
  note: [0.05, 0.36, 0.06] as V3, // notebook na mesinha da varanda
  bat: [1.62, 0, -0.72] as V3,
  cist: [-1.78, 0, -0.85] as V3,
  tanque: [-1.5, 0, 1.4] as V3,
  horta: [-0.12, 0, 1.55] as V3,
  galinheiro: [-2.55, 0, 0.18] as V3,
  ant: [2.05, 0, 1.3] as V3,
  lampada: [2.55, 0, 0.9] as V3,
  placas: [0.72, 1.3, -0.62] as V3, // centro das 4 placas no telhado
  centro: [0, 0, 0.3] as V3,
};
const CW = 2.0, CD = 1.3, CH = 1.0, RISE = 0.55, BEIRAL = 0.15;
export const ANG_TELHADO = Math.atan2(RISE, CD / 2 + BEIRAL);

export type Sitio = {
  raiz: THREE.Group;
  tab: THREE.Group;
  casa: THREE.Group;
  paredeFrente: THREE.Group;
  varCob: THREE.Group;
  caminho: THREE.Group;
  cabos: THREE.Group;
  interior: THREE.Group;
  portaGel: THREE.Group;
  luzGel: THREE.PointLight;
  matLuzGel: THREE.MeshBasicMaterial;
  lampVaranda: { mat: THREE.Material; luz: THREE.PointLight };
  lampSala: { mat: THREE.Material; luz: THREE.PointLight };
  janelas: THREE.Material[];
  paredes: THREE.Material[];
  celular: { mat: THREE.MeshBasicMaterial };
  note: { g: THREE.Group; tela: THREE.MeshBasicMaterial; texDesl: THREE.Texture; texCham: THREE.Texture };
  placas: THREE.Group[];
  placasMat: THREE.Material[];
  bat: THREE.Group;
  barra: THREE.Mesh[];
  barraMat: THREE.MeshBasicMaterial[];
  luzBat: THREE.PointLight;
  cist: THREE.Group;
  calha: THREE.Group;
  sist: THREE.Group;
  agua: THREE.Mesh;
  peixes: THREE.InstancedMesh;
  galinhas: THREE.Group[];
  galinheiro: THREE.Group;
  horta: THREE.Group;
  plantas: THREE.InstancedMesh;
  plantasBase: THREE.Matrix4[];
  ant: THREE.Group;
  lampAntiga: THREE.Group;
  lampAntigaMat: THREE.Material;
  notas: THREE.InstancedMesh[];
  blocos: THREE.Group[];
  caminhao: THREE.Group;
  deco: THREE.Group;
  nuvem: THREE.Group;
  chuva: THREE.InstancedMesh;
  sats: THREE.Group[];
  sol: THREE.Group;
  lua: THREE.Group;
};

// ----------------------------------------------------------------------------------------------
const cor = (d: string, a: number, b: number, c: number) => (d === "A" ? a : d === "B" ? b : c);

export function montaSitio(k: Kit, cena: THREE.Scene): Sitio {
  const d = k.dir;
  const A = d === "A", B = d === "B", C = d === "C";
  const raiz = new THREE.Group();
  cena.add(raiz);
  const s = (n: number) => k.s(n);

  // ---------------------------------------------------------------- tabuleiro (grama em cima, corte de terra)
  const tab = new THREE.Group();
  raiz.add(tab);
  const gt = texGrama(d);
  gt.repeat.set(2, 2);
  const espTab = 0.5;
  const topoGeo = C ? (() => {
    // papel dobrado: triângulos grandes, cada um com um tom (dobra pegando luz)
    const g0 = new THREE.PlaneGeometry(TAB, TAB, 12, 12).rotateX(-Math.PI / 2);
    const pp0 = g0.attributes.position as THREE.BufferAttribute;
    const r = rng(91);
    for (let i = 0; i < pp0.count; i++) {
      const x = pp0.getX(i), z = pp0.getZ(i);
      const borda = Math.abs(x) > TAB / 2 - 0.01 || Math.abs(z) > TAB / 2 - 0.01;
      pp0.setY(i, borda ? 0.004 : 0.012 + r() * 0.07);
      if (!borda) pp0.setXYZ(i, x + (r() - 0.5) * 0.18, pp0.getY(i), z + (r() - 0.5) * 0.18);
    }
    const g = g0.toNonIndexed();
    const n = g.attributes.position.count;
    const cols = new Float32Array(n * 3);
    for (let f = 0; f < n / 3; f++) {
      const v = 0.86 + r() * 0.2;
      for (let j = 0; j < 3; j++) cols.set([v, v, v * 0.98], (f * 3 + j) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  })() : new RoundedBoxGeometry(TAB, 0.08, TAB, 2, 0.03);
  const matTopo = k.mat({ color: 0xffffff, map: gt, rough: 0.95, clear: 0, semContorno: true });
  if (C) (matTopo as THREE.MeshStandardMaterial).vertexColors = true;
  const topo = k.m(topoGeo, matTopo, 0, tab, [0, C ? 0.0 : -0.04, 0]);
  topo.castShadow = false;
  const tc = texCorte(d);
  tc.repeat.set(3, 1);
  const lado = k.m(new RoundedBoxGeometry(TAB + 0.02, espTab, TAB + 0.02, 3, A ? 0.06 : 0.03), k.mat({ color: 0xffffff, map: tc, rough: 0.9 }), 3, tab, [0, -espTab / 2 - 0.005, 0]);
  lado.castShadow = false;
  // a lateral do RoundedBox usa a textura em todas as faces; em cima ela fica escondida pela grama
  void lado;

  // caminho de terra até a varanda
  const terra = k.mat({ color: cor(d, 0xa87a52, 0xd99a5b, 0xc79b6c), rough: 0.95, semContorno: true });
  const caminho = new THREE.Group();
  raiz.add(caminho);
  for (let i = 0; i < 7; i++) {
    const r = rng(40 + i);
    const pd = k.m(new THREE.CylinderGeometry(0.17, 0.19, 0.03, s(18)), terra, 0, caminho, [1.05 + (r() - 0.5) * 0.1, 0.005, 0.55 + i * 0.4]);
    pd.scale.set(1.2, 1, 0.85);
    pd.castShadow = false;
  }

  // ---------------------------------------------------------------- casa
  const casa = new THREE.Group();
  casa.position.set(...P.casa);
  raiz.add(casa);
  const parede = k.mat({ color: cor(d, 0xf3e6cf, 0xfff0d6, 0xf1e4cc), rough: 0.7 });
  const paredeInt = k.mat({ color: cor(d, 0xe9d2b0, 0xffd9a6, 0xe6cfae), rough: 0.8, side: THREE.DoubleSide });
  const barrado = k.mat({ color: cor(d, 0x6b8f71, 0x4fb08a, 0x7fa58a), rough: 0.7 });
  const madeira = k.mat({ color: cor(d, 0x8a5a36, 0xb5733f, 0xa0703f), rough: 0.7 });
  const tw = 0.06; // espessura da parede
  // paredes: fundo, laterais (com empena), frente (removível = casa em corte)
  k.m(new THREE.BoxGeometry(CW, CH, tw), parede, 3, casa, [0, CH / 2, -CD / 2 + tw / 2]);
  const empena = (x: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(-CD / 2, 0);
    sh.lineTo(CD / 2, 0);
    sh.lineTo(CD / 2, CH);
    sh.lineTo(0, CH + RISE - 0.04);
    sh.lineTo(-CD / 2, CH);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: tw, bevelEnabled: false });
    g.translate(0, 0, -tw / 2);
    g.rotateY(Math.PI / 2);
    k.m(g, parede, 3, casa, [x, 0, 0]);
  };
  empena(-CW / 2 + tw / 2);
  empena(CW / 2 - tw / 2);
  // barrado verde embaixo
  k.m(new THREE.BoxGeometry(CW + 0.02, 0.16, CD + 0.02), barrado, 2, casa, [0, 0.08, 0]);
  // piso interno
  k.m(new THREE.BoxGeometry(CW - 0.1, 0.03, CD - 0.1), k.mat({ color: cor(d, 0xb88d63, 0xe0a86a, 0xc49a6e), rough: 0.6 }), 0, casa, [0, 0.165, 0]);
  // parede interna de fundo (cor quente: aparece no corte)
  k.m(new THREE.PlaneGeometry(CW - 0.14, CH - 0.2), paredeInt, 0, casa, [0, CH / 2 + 0.08, -CD / 2 + tw + 0.002]);

  // frente (removível)
  const paredeFrente = new THREE.Group();
  casa.add(paredeFrente);
  const janelas: THREE.Material[] = [];
  {
    const zf = CD / 2 - tw / 2;
    // parede com porta e janela: 4 blocos
    const blocos: [number, number, number, number][] = [
      // x0, x1, y0, y1
      [-CW / 2, -0.62, 0, CH],
      [-0.22, 0.02, 0, CH],
      [0.38, CW / 2, 0, CH],
      [-0.62, -0.22, 0, 0.42],
      [-0.62, -0.22, 0.78, CH],
      [0.02, 0.38, 0.78, CH],
    ];
    for (const [x0, x1, y0, y1] of blocos) k.m(new THREE.BoxGeometry(x1 - x0, y1 - y0, tw), parede, 2.5, paredeFrente, [(x0 + x1) / 2, (y0 + y1) / 2, zf]);
    k.m(new THREE.BoxGeometry(CW + 0.02, 0.16, tw + 0.02), barrado, 2, paredeFrente, [0, 0.08, zf]);
    // porta de madeira (entreaberta) e janela com vidro que acende à noite
    k.m(new RoundedBoxGeometry(0.34, 0.76, 0.04, 2, 0.01), madeira, 2.5, paredeFrente, [0.2, 0.39, zf + 0.03]);
    const jm = k.mat({ color: cor(d, 0x2a3540, 0x3b4b66, 0x3a4250), emissive: 0xffb45a, ei: 0, rough: 0.2, liso: true });
    janelas.push(jm);
    k.m(new THREE.BoxGeometry(0.38, 0.34, 0.02), jm, 2, paredeFrente, [-0.42, 0.6, zf + 0.005]);
    k.m(new THREE.BoxGeometry(0.46, 0.05, 0.08), madeira, 2, paredeFrente, [-0.42, 0.41, zf + 0.03]);
    k.m(new THREE.BoxGeometry(0.02, 0.34, 0.03), madeira, 1.5, paredeFrente, [-0.42, 0.6, zf + 0.02]);
  }
  // janela lateral (direita) acende
  {
    const jm = k.mat({ color: cor(d, 0x2a3540, 0x3b4b66, 0x3a4250), emissive: 0xffb45a, ei: 0, rough: 0.2, liso: true });
    janelas.push(jm);
    k.m(new THREE.BoxGeometry(0.02, 0.32, 0.36), jm, 2, casa, [CW / 2 + 0.002, 0.6, -0.15]);
  }

  // telhado de barro (duas águas) + cumeeira
  const tt = texTelha(d);
  tt.repeat.set(2.2, 1.6);
  const telha = k.mat({ color: 0xffffff, map: tt, rough: 0.6 });
  const L = Math.hypot(CD / 2 + BEIRAL, RISE);
  for (const sgn of [1, -1]) {
    const tel = k.m(new RoundedBoxGeometry(CW + 0.34, 0.07, L + 0.02, 2, 0.025), telha, 3, casa);
    tel.position.set(0, CH + RISE / 2 + 0.03, (sgn * (CD / 2 + BEIRAL)) / 2);
    tel.rotation.x = sgn * ANG_TELHADO;
  }
  k.m(cil(0.055, 0.055, CW + 0.36, s(16)), k.mat({ color: cor(d, 0x9c4426, 0xc54d2c, 0xb35a37), rough: 0.6 }), 2.5, casa, [0, CH + RISE + 0.035, 0], [0, 0, Math.PI / 2]);

  // varanda: piso, esteios e cobertura baixa
  const varanda = new THREE.Group();
  varanda.position.set(0, 0, CD / 2);
  casa.add(varanda);
  k.m(new RoundedBoxGeometry(CW + 0.1, 0.07, 0.78, 2, 0.02), k.mat({ color: cor(d, 0xc79566, 0xe7b07a, 0xcfa173), rough: 0.6 }), 2, varanda, [0, 0.035, 0.39]);
  const varCob = new THREE.Group();
  varanda.add(varCob);
  for (const x of [-CW / 2 + 0.06, CW / 2 - 0.06]) k.m(new THREE.BoxGeometry(0.07, 0.74, 0.07), madeira, 2.5, varCob, [x, 0.41, 0.72]);
  {
    const ang = Math.atan2(0.16, 0.8);
    const cob = k.m(new RoundedBoxGeometry(CW + 0.22, 0.05, 0.86, 2, 0.02), telha, 2.5, varCob);
    cob.position.set(0, 0.86, 0.38);
    cob.rotation.x = ang;
  }
  // mesinha, cadeira e notebook
  const mesa = new THREE.Group();
  mesa.position.set(P.note[0] - P.casa[0], 0.07, 0.42);
  varanda.add(mesa);
  k.m(new RoundedBoxGeometry(0.42, 0.03, 0.26, 2, 0.01), madeira, 2, mesa, [0, 0.26, 0]);
  for (const [x, z] of [[-0.18, -0.1], [0.18, -0.1], [-0.18, 0.1], [0.18, 0.1]]) k.m(new THREE.BoxGeometry(0.025, 0.26, 0.025), madeira, 1.5, mesa, [x, 0.13, z]);
  const note = new THREE.Group();
  note.position.set(0, 0.275, 0);
  mesa.add(note);
  const alum = k.mat({ color: cor(d, 0xb9bec6, 0xcfd6e2, 0xc2c6cc), rough: 0.35, metal: 0.6 });
  k.m(new RoundedBoxGeometry(0.3, 0.012, 0.2, 2, 0.004), alum, 1.5, note, [0, 0.006, 0.02]);
  const tampa = new THREE.Group();
  tampa.position.set(0, 0.012, -0.08);
  tampa.rotation.x = -0.32;
  note.add(tampa);
  k.m(new RoundedBoxGeometry(0.3, 0.2, 0.01, 2, 0.004), alum, 1.5, tampa, [0, 0.1, 0]);
  const texDesl = texCelular();
  const texCham = texChamada();
  const telaMat = new THREE.MeshBasicMaterial({ color: 0x111111, map: texCham, toneMapped: false });
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.17), telaMat);
  tela.position.set(0, 0.1, 0.006);
  tampa.add(tela);
  // a tela olha para a frente (+z): o notebook fica de frente para a câmera
  // a tela olha para a frente (+z): a câmera vê a chamada por cima do ombro de quem senta
  const cad = new THREE.Group();
  cad.position.set(P.note[0] - P.casa[0] + 0.05, 0.07, 0.7);
  varanda.add(cad);
  k.m(new RoundedBoxGeometry(0.2, 0.025, 0.2, 2, 0.008), madeira, 1.5, cad, [0, 0.17, 0]);
  k.m(new RoundedBoxGeometry(0.2, 0.22, 0.025, 2, 0.008), madeira, 1.5, cad, [0, 0.29, -0.09]);
  for (const [x, z] of [[-0.085, -0.085], [0.085, -0.085], [-0.085, 0.085], [0.085, 0.085]]) k.m(new THREE.BoxGeometry(0.02, 0.17, 0.02), madeira, 1, cad, [x, 0.085, z]);
  cad.rotation.y = Math.PI + 0.2;
  // lâmpada da varanda (acende à noite)
  const lvMat = k.mat({ color: 0xfff1d0, emissive: 0xffb45a, ei: 0, rough: 0.3, liso: true });
  k.m(esfera(0.045, s(16), s(12)), lvMat, 1.5, varanda, [-0.35, 0.74, 0.08]);
  k.m(cil(0.006, 0.006, 0.08, 6), madeira, 0, varanda, [-0.35, 0.8, 0.08]);
  const lvLuz = new THREE.PointLight(0xffb45a, 0, 3.2, 1.6);
  lvLuz.position.set(-0.35, 0.68, 0.12);
  varanda.add(lvLuz);

  // interior (aparece com a casa em corte): geladeira, mesa com celular, lâmpada do teto
  const interior = new THREE.Group();
  casa.add(interior);
  const gel = new THREE.Group();
  gel.position.set(0.66, 0.18, -0.36);
  interior.add(gel);
  const branco = k.mat({ color: cor(d, 0xf4f4f0, 0xffffff, 0xf2efe8), rough: 0.3 });
  k.m(new RoundedBoxGeometry(0.34, 0.66, 0.3, 2, 0.03), branco, 2.5, gel, [0, 0.33, 0]);
  const matLuzGel = new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false });
  matLuzGel.color.setScalar(0);
  const interiorGel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.58), matLuzGel);
  interiorGel.position.set(0, 0.33, 0.151);
  gel.add(interiorGel);
  // prateleiras e potes dentro
  for (let i = 0; i < 3; i++) k.m(new THREE.BoxGeometry(0.28, 0.01, 0.02), branco, 0, gel, [0, 0.14 + i * 0.17, 0.155]);
  ;[[0xe25b45, -0.07, 0.2], [0x6aa86b, 0.06, 0.2], [0xf2b84b, -0.02, 0.37]].forEach(([c, x, y]) => k.m(cil(0.03, 0.03, 0.08, s(12)), k.mat({ color: c, rough: 0.5 }), 1, gel, [x, y, 0.155]));
  const portaGel = new THREE.Group();
  portaGel.position.set(0.17, 0, 0.152);
  gel.add(portaGel);
  k.m(new RoundedBoxGeometry(0.34, 0.64, 0.03, 2, 0.012), branco, 2.5, portaGel, [-0.17, 0.33, 0.015]);
  k.m(new THREE.BoxGeometry(0.015, 0.16, 0.02), alum, 1, portaGel, [-0.3, 0.42, 0.04]);
  const luzGel = new THREE.PointLight(0xdff2ff, 0, 1.4, 1.5);
  luzGel.position.set(0, 0.33, 0.3);
  gel.add(luzGel);
  // mesa com celular carregando
  const mesaI = new THREE.Group();
  mesaI.position.set(-0.45, 0.18, -0.25);
  interior.add(mesaI);
  k.m(new RoundedBoxGeometry(0.46, 0.03, 0.3, 2, 0.01), madeira, 2, mesaI, [0, 0.32, 0]);
  for (const [x, z] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]]) k.m(new THREE.BoxGeometry(0.025, 0.32, 0.025), madeira, 1, mesaI, [x, 0.16, z]);
  const celMat = new THREE.MeshBasicMaterial({ color: 0x000000, map: texDesl, toneMapped: false });
  const cel = new THREE.Group();
  cel.position.set(0.05, 0.335, 0.05);
  cel.rotation.x = -0.28;
  mesaI.add(cel);
  k.m(new RoundedBoxGeometry(0.1, 0.19, 0.014, 2, 0.008), k.mat({ color: 0x1a1d24, rough: 0.3 }), 1.2, cel, [0, 0.095, 0]);
  const celTela = new THREE.Mesh(new THREE.PlaneGeometry(0.086, 0.17), celMat);
  celTela.position.set(0, 0.095, 0.0075);
  cel.add(celTela);
  k.m(new RoundedBoxGeometry(0.09, 0.02, 0.06, 2, 0.006), k.mat({ color: 0xf2f2f2, rough: 0.4 }), 1, mesaI, [0.05, 0.345, 0.07]);
  k.m(tubo([[0.05, 0.345, 0.1], [0.12, 0.34, 0.14], [0.2, 0.2, 0.15], [0.22, 0.0, 0.14]], 0.005, 20, 5), k.mat({ color: 0xf2f2f2, rough: 0.5 }), 0, mesaI);
  // lâmpada do teto
  const lsMat = k.mat({ color: 0xfff1d0, emissive: 0xffc070, ei: 0, rough: 0.3, liso: true });
  k.m(esfera(0.05, s(16), s(12)), lsMat, 1.5, interior, [0.05, CH - 0.12, -0.15]);
  k.m(cil(0.005, 0.005, 0.1, 6), madeira, 0, interior, [0.05, CH - 0.05, -0.15]);
  const lsLuz = new THREE.PointLight(0xffc070, 0, 2.6, 1.4);
  lsLuz.position.set(0.05, CH - 0.2, -0.1);
  interior.add(lsLuz);

  // ---------------------------------------------------------------- placas solares (4, no telhado da frente)
  const placas: THREE.Group[] = [];
  const placasMat: THREE.Material[] = [];
  const celula = k.mat({ color: cor(d, 0x1d2f5c, 0x2a56c6, 0x2e4a7a), rough: 0.18, clear: 0.9, emissive: 0xff8a3a, ei: 0, liso: true });
  placasMat.push(celula);
  const moldura = k.mat({ color: cor(d, 0xc9ccd2, 0xe6ebf2, 0xd8d8d8), rough: 0.35, metal: 0.7 });
  const grade = (() => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 1; i < 4; i++) gs.push(transf(new THREE.BoxGeometry(0.006, 0.004, 0.27), [-0.19 + i * 0.095, 0.012, 0]));
    for (let j = 1; j < 3; j++) gs.push(transf(new THREE.BoxGeometry(0.38, 0.004, 0.006), [0, 0.012, -0.135 + j * 0.09]));
    return gs;
  })();
  for (let i = 0; i < 4; i++) {
    const pg = new THREE.Group();
    const col = i % 2, lin = Math.floor(i / 2);
    // coordenadas no plano do telhado da frente
    const u = 0.25 + col * 0.44, v = 0.2 + lin * 0.33; // v: distância da cumeeira ao longo da água
    const y = CH + RISE + 0.035 + 0.045 - v * Math.sin(ANG_TELHADO);
    const z = v * Math.cos(ANG_TELHADO);
    pg.position.set(P.casa[0] + u, y, P.casa[2] + z);
    pg.rotation.x = ANG_TELHADO;
    const base = new THREE.Group();
    pg.add(base);
    k.m(new RoundedBoxGeometry(0.42, 0.025, 0.31, 1, 0.006), moldura, 1.5, base, [0, 0, 0]);
    k.m(new THREE.BoxGeometry(0.39, 0.012, 0.28), celula, 0, base, [0, 0.009, 0]);
    for (const gg of grade) {
      const me = new THREE.Mesh(gg, moldura);
      base.add(me);
    }
    raiz.add(pg);
    placas.push(pg);
  }

  // ---------------------------------------------------------------- bateria (ao lado da casa) + cabos
  const bat = new THREE.Group();
  bat.position.set(...P.bat);
  raiz.add(bat);
  const rot = texRotuloBateria();
  k.m(new RoundedBoxGeometry(0.42, 0.06, 0.36, 2, 0.02), k.mat({ color: cor(d, 0x9a9a9a, 0xb7b7c7, 0xa9a49a), rough: 0.8 }), 2, bat, [0, 0.03, 0]);
  const caixa = k.m(new RoundedBoxGeometry(0.34, 0.58, 0.28, 3, 0.04), k.mat({ color: cor(d, 0x2f343f, 0x3b4256, 0x3b3f48), rough: 0.45 }), 3, bat, [0, 0.35, 0]);
  void caixa;
  const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshBasicMaterial({ map: rot, toneMapped: true }));
  rotulo.position.set(0.171, 0.38, 0);
  rotulo.rotation.y = Math.PI / 2;
  bat.add(rotulo);
  k.m(cil(0.03, 0.03, 0.04, s(14)), k.mat({ color: 0xd94b3a, rough: 0.4 }), 1, bat, [-0.07, 0.66, 0]);
  k.m(cil(0.03, 0.03, 0.04, s(14)), k.mat({ color: 0x2d2d2d, rough: 0.4 }), 1, bat, [0.07, 0.66, 0]);
  // barra de carga (5 gomos na frente)
  const barra: THREE.Mesh[] = [], barraMat: THREE.MeshBasicMaterial[] = [];
  k.m(new RoundedBoxGeometry(0.16, 0.44, 0.02, 2, 0.01), k.mat({ color: 0x14161c, rough: 0.5, liso: true }), 1.5, bat, [0, 0.35, 0.142]);
  for (let i = 0; i < 5; i++) {
    const mm = new THREE.MeshBasicMaterial({ color: 0x2a2d35, toneMapped: false });
    const me = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.068, 0.012), mm);
    me.position.set(0, 0.17 + i * 0.083, 0.152);
    bat.add(me);
    barra.push(me);
    barraMat.push(mm);
  }
  const luzBat = new THREE.PointLight(0xff7a30, 0, 1.6, 1.6);
  luzBat.position.set(0, 0.4, 0.4);
  bat.add(luzBat);
  // cabo: telhado -> bateria -> casa
  const caboMat = k.mat({ color: 0x23252b, rough: 0.6 });
  const cabos = new THREE.Group();
  raiz.add(cabos);
  k.m(tubo([[P.casa[0] + CW / 2 + 0.17, CH + 0.08, P.casa[2] + 0.45], [P.bat[0] - 0.05, 0.9, P.bat[2] + 0.05], [P.bat[0] - 0.05, 0.66, P.bat[2]]], 0.014, 24, 6), caboMat, 1.2, cabos);
  k.m(tubo([[P.bat[0] - 0.17, 0.3, P.bat[2]], [P.casa[0] + CW / 2 + 0.02, 0.3, P.bat[2]]], 0.014, 8, 6), caboMat, 1.2, cabos);

  // ---------------------------------------------------------------- cisterna de placas + calha
  const cist = new THREE.Group();
  cist.position.set(...P.cist);
  raiz.add(cist);
  const cimento = k.mat({ color: cor(d, 0xe7e1d6, 0xf4f0e8, 0xe8e1d4), rough: 0.85 });
  const corpo = k.m(cil(0.56, 0.6, 0.72, s(48)), cimento, 3, cist, [0, 0.36, 0]);
  void corpo;
  // juntas das placas (anéis)
  for (let i = 1; i < 4; i++) k.m(new THREE.TorusGeometry(0.565 + (0.04 * (4 - i)) / 4, 0.008, 6, s(48)), k.mat({ color: cor(d, 0xc7beb0, 0xd8d0c4, 0xcfc5b6), rough: 0.9 }), 0, cist, [0, i * 0.18, 0], [Math.PI / 2, 0, 0]);
  k.m(new THREE.ConeGeometry(0.62, 0.22, s(48)), cimento, 3, cist, [0, 0.83, 0]);
  k.m(cil(0.1, 0.1, 0.06, s(20)), k.mat({ color: cor(d, 0x5a7fa8, 0x3c8de0, 0x6e8fb0), rough: 0.5 }), 2, cist, [0.18, 0.92, 0.1]);
  // bomba manual (cano e alavanca) na frente
  k.m(cil(0.025, 0.025, 0.35, s(10)), k.mat({ color: 0x5f6b78, rough: 0.4, metal: 0.6 }), 1.5, cist, [0.4, 0.55, 0.42]);
  // calha ao longo do beiral da frente e cano até a cisterna
  const calha = new THREE.Group();
  raiz.add(calha);
  const pvc = k.mat({ color: cor(d, 0xe8e8e2, 0xffffff, 0xeeeae2), rough: 0.5 });
  const zB = P.casa[2] + CD / 2 + BEIRAL + 0.02, yB = CH + 0.02;
  const calhaGeo = new THREE.CylinderGeometry(0.04, 0.04, CW + 0.3, s(16), 1, true, 0, Math.PI);
  calhaGeo.rotateZ(Math.PI / 2);
  calhaGeo.rotateX(Math.PI / 2);
  const calhaM = k.m(calhaGeo, k.mat({ color: cor(d, 0xe8e8e2, 0xffffff, 0xeeeae2), rough: 0.5, side: THREE.DoubleSide }), 2, calha, [P.casa[0] - 0.05, yB, zB]);
  calhaM.rotation.z = -0.03;
  const xCano = P.casa[0] - CW / 2 - 0.18;
  k.m(tubo([[xCano, yB, zB], [xCano - 0.05, yB - 0.25, zB - 0.08], [P.cist[0] + 0.32, 0.95, P.cist[2] + 0.25], [P.cist[0] + 0.12, 0.93, P.cist[2] + 0.08]], 0.032, 32, 10), pvc, 2, calha);

  // ---------------------------------------------------------------- Sisteminha: tanque de tilápia, peixes, cano para a horta
  const sist = new THREE.Group();
  sist.position.set(...P.tanque);
  raiz.add(sist);
  const RT = 0.64, HT = 0.36;
  const lona = k.mat({ color: cor(d, 0x2f6f9f, 0x2f8fe0, 0x4a7ea8), rough: 0.5, side: THREE.DoubleSide });
  k.m(cil(RT, RT, HT, s(56), true), lona, 3, sist, [0, HT / 2, 0]);
  k.m(new THREE.TorusGeometry(RT, 0.035, s(10), s(56)), k.mat({ color: cor(d, 0x24577c, 0x1f6fc0, 0x3c6a90), rough: 0.4 }), 2, sist, [0, HT, 0], [Math.PI / 2, 0, 0]);
  // estacas da cerca do tanque
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.m(new THREE.BoxGeometry(0.035, HT + 0.05, 0.035), madeira, 1.5, sist, [Math.cos(a) * (RT + 0.04), (HT + 0.05) / 2, Math.sin(a) * (RT + 0.04)]);
  }
  // fundo escuro
  k.m(new THREE.CircleGeometry(RT - 0.01, s(48)).rotateX(-Math.PI / 2), k.mat({ color: cor(d, 0x163848, 0x1a6a9a, 0x2c5268), rough: 0.9, semContorno: true }), 0, sist, [0, 0.02, 0]);
  const aguaGeo = new THREE.CircleGeometry(RT - 0.005, 64, 0).rotateX(-Math.PI / 2);
  const agua = k.m(aguaGeo, k.mat({ agua: true, color: cor(d, 0x2b6e6a, 0x47c6e0, 0x5f9ea8) }), 0, sist, [0, HT - 0.06, 0]);
  agua.castShadow = false;
  agua.renderOrder = 2;
  // tilápias
  const peixeGeo = (() => {
    const corpoG = mergeVertices(new THREE.SphereGeometry(0.06, s(14), s(10)));
    const p = corpoG.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setXYZ(i, x * 1.6, p.getY(i) * (1 - Math.max(0, -x) * 4) * 1.0, p.getZ(i) * 0.38);
    }
    corpoG.computeVertexNormals();
    const cauda = new THREE.ConeGeometry(0.04, 0.06, 4).rotateZ(Math.PI / 2).scale(1, 1, 0.25);
    cauda.translate(-0.12, 0, 0);
    const n1 = corpoG.toNonIndexed();
    n1.deleteAttribute("uv");
    cauda.deleteAttribute("uv");
    const g = new THREE.BufferGeometry();
    const a1 = n1.attributes.position.array as Float32Array, a2 = cauda.toNonIndexed().attributes.position.array as Float32Array;
    const pos = new Float32Array(a1.length + a2.length);
    pos.set(a1);
    pos.set(a2, a1.length);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  })();
  const peixes = new THREE.InstancedMesh(peixeGeo, k.mat({ color: cor(d, 0x8d9aa3, 0xb0c4d0, 0x9aa7ae), rough: 0.35, clear: 0.7 }), 9);
  peixes.castShadow = false;
  k.contorno(peixes, 1.5);
  sist.add(peixes);
  // cano da água adubada: tanque -> horta
  k.m(tubo([[RT * 0.9, HT - 0.12, 0.05], [RT + 0.2, 0.12, 0.08], [P.horta[0] - P.tanque[0] - 0.62, 0.08, 0.12]], 0.028, 20, 8), k.mat({ color: cor(d, 0x6b7f63, 0x5bbf6a, 0x86a079), rough: 0.5 }), 2, sist);

  // galinheiro + galinhas
  const galinheiro = new THREE.Group();
  galinheiro.position.set(...P.galinheiro);
  raiz.add(galinheiro);
  k.m(new RoundedBoxGeometry(0.52, 0.34, 0.44, 2, 0.02), madeira, 2.5, galinheiro, [0, 0.27, 0]);
  for (const [x, z] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) k.m(new THREE.BoxGeometry(0.04, 0.12, 0.04), madeira, 1.5, galinheiro, [x, 0.06, z]);
  {
    const tg = new THREE.ConeGeometry(0.42, 0.22, 4);
    tg.rotateY(Math.PI / 4);
    k.m(tg, telha, 2.5, galinheiro, [0, 0.55, 0], undefined, [1.0, 1, 0.85]);
  }
  k.m(new THREE.PlaneGeometry(0.14, 0.16), k.mat({ color: 0x2a1a10, rough: 1, liso: true, semContorno: true }), 0, galinheiro, [0.08, 0.26, 0.223]);
  k.m(new THREE.BoxGeometry(0.12, 0.02, 0.34).rotateX(0.5), madeira, 1, galinheiro, [0.08, 0.1, 0.36]);
  const galinhas: THREE.Group[] = [];
  const posG: [number, number, number][] = [[-2.15, 0.62, 0.5], [-2.72, 0.75, 1.9], [-1.95, 0.05, -0.6]];
  for (let i = 0; i < 3; i++) {
    const gal = galinha(k, i);
    gal.position.set(posG[i][0], 0, posG[i][1]);
    gal.rotation.y = posG[i][2];
    raiz.add(gal);
    galinhas.push(gal);
  }

  // horta: 3 canteiros com verduras
  const horta = new THREE.Group();
  horta.position.set(...P.horta);
  raiz.add(horta);
  const cant = k.mat({ color: cor(d, 0x6d4a30, 0xa0653b, 0x8a6446), rough: 0.95 });
  const borda = k.mat({ color: cor(d, 0x9a6b44, 0xc98a4f, 0xb08356), rough: 0.7 });
  const xs = [-0.45, 0.0, 0.45];
  for (const x of xs) {
    k.m(new RoundedBoxGeometry(0.38, 0.1, 1.1, 2, 0.02), borda, 2, horta, [x, 0.05, 0]);
    k.m(new THREE.BoxGeometry(0.32, 0.02, 1.04), cant, 0, horta, [x, 0.1, 0]);
  }
  const folhaGeo = B ? new THREE.SphereGeometry(0.07, 12, 8) : C ? new THREE.IcosahedronGeometry(0.075, 0) : new THREE.IcosahedronGeometry(0.07, 1);
  const NP = 3 * 2 * 6;
  const plantas = new THREE.InstancedMesh(folhaGeo, k.mat({ color: 0xffffff, rough: 0.6 }), NP);
  plantas.castShadow = true;
  plantas.receiveShadow = true;
  const plantasBase: THREE.Matrix4[] = [];
  const verdes = [new THREE.Color(cor(d, 0x6fae4a, 0x63d14a, 0x7fb35a)), new THREE.Color(cor(d, 0x4f8f3a, 0x3fae3a, 0x5f9a48)), new THREE.Color(cor(d, 0x9ac24f, 0xa8e05a, 0xa5c46a))];
  let ip = 0;
  for (let ci = 0; ci < 3; ci++)
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 6; b++) {
        const r = rng(300 + ip);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(xs[ci] + (a - 0.5) * 0.15, 0.13, -0.43 + b * 0.172),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 0.5, r() * 6, r() * 0.5)),
          new THREE.Vector3(1, 0.75 + r() * 0.3, 1).multiplyScalar(0.85 + r() * 0.3),
        );
        plantasBase.push(m);
        plantas.setMatrixAt(ip, m);
        plantas.setColorAt(ip, verdes[(ci + b) % 3]);
        ip++;
      }
  k.contorno(plantas, 1.5);
  horta.add(plantas);

  // ---------------------------------------------------------------- antena de satélite genérica (placa retangular num mastro)
  const ant = new THREE.Group();
  ant.position.set(...P.ant);
  raiz.add(ant);
  const cinza = k.mat({ color: cor(d, 0x8c929a, 0xa9b4c4, 0x9aa0a6), rough: 0.4, metal: 0.5 });
  k.m(new RoundedBoxGeometry(0.26, 0.04, 0.26, 2, 0.01), cinza, 2, ant, [0, 0.02, 0]);
  k.m(cil(0.022, 0.026, 0.62, s(14)), cinza, 2, ant, [0, 0.33, 0]);
  const prato = new THREE.Group();
  prato.position.set(0, 0.66, 0);
  prato.rotation.set(-1.0, 0.4, 0);
  ant.add(prato);
  k.m(new RoundedBoxGeometry(0.46, 0.04, 0.32, 3, 0.02), k.mat({ color: cor(d, 0xf2f2ee, 0xffffff, 0xf4f1ea), rough: 0.35 }), 3, prato, [0, 0, 0]);
  k.m(cil(0.03, 0.03, 0.06, s(12)), cinza, 1.5, prato, [0, -0.04, 0]);
  ant.userData.prato = prato;
  k.m(tubo([[0, 0.05, 0], [-0.3, 0.02, -0.4], [P.casa[0] + CW / 2 - P.ant[0] + 0.1, 0.02, P.casa[2] + CD / 2 + 0.6 - P.ant[2]]], 0.01, 24, 5), caboMat, 1, ant);

  // lâmpada incandescente antiga (de brinquedo, grande) para a comparação
  const lampAntiga = new THREE.Group();
  lampAntiga.position.set(...P.lampada);
  raiz.add(lampAntiga);
  const vidro = k.mat({ color: 0xfff4d8, emissive: 0xffb050, ei: 0.25, rough: 0.15, transparent: true, opacity: 0.8, liso: true });
  const bulbo = new THREE.LatheGeometry(
    [[0.001, 0.62], [0.12, 0.6], [0.2, 0.52], [0.22, 0.42], [0.17, 0.3], [0.1, 0.22], [0.085, 0.16]].map(([r, y]) => new THREE.Vector2(r, y)),
    s(40),
  );
  k.m(bulbo, vidro, 2.5, lampAntiga);
  k.m(cil(0.085, 0.07, 0.16, s(20)), k.mat({ color: cor(d, 0xc9a34a, 0xe8c05a, 0xc8a85a), rough: 0.3, metal: 0.8 }), 2.5, lampAntiga, [0, 0.08, 0]);
  k.m(tubo([[-0.05, 0.22, 0], [-0.03, 0.38, 0], [0, 0.44, 0], [0.03, 0.38, 0], [0.05, 0.22, 0]], 0.006, 20, 5), k.mat({ basico: true, color: 0xffd080 }), 0, lampAntiga);
  const lampAntigaMat = vidro;

  // ---------------------------------------------------------------- notas (gancho) e blocos "sem forma"
  const notas: THREE.InstancedMesh[] = [];
  const corNotas = ["#3f8f6b", "#4a7fb0", "#c07a3a"];
  for (let i = 0; i < 3; i++) {
    const nt = texNota(corNotas[i]);
    const mat = k.mat({ color: 0xffffff, map: nt, rough: 0.6, side: THREE.DoubleSide, liso: true });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.006, 0.16), mat, 60);
    im.castShadow = true;
    im.receiveShadow = true;
    k.contorno(im, 1.2);
    raiz.add(im);
    notas.push(im);
  }
  const blocos: THREE.Group[] = [];
  const argila = k.mat({ color: cor(d, 0xd8d2c8, 0xeae6ff, 0xe3dccf), rough: 0.8 });
  for (let i = 0; i < 4; i++) {
    const bg = new THREE.Group();
    const geo = mergeVertices(new THREE.IcosahedronGeometry(0.36, C ? 1 : 3));
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < p.count; j++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, j);
      const n = fbm(v.x * 3 + i * 7, v.y * 3 + v.z * 2, 3);
      v.multiplyScalar(0.8 + (n - 0.5) * 0.6);
      v.y = Math.max(v.y, -0.05) * 1.15;
      p.setXYZ(j, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    k.m(geo, argila, 2.5, bg, [0, 0.24, 0]);
    raiz.add(bg);
    blocos.push(bg);
  }

  // ---------------------------------------------------------------- caminhão-pipa de brinquedo
  const caminhao = new THREE.Group();
  raiz.add(caminhao);
  {
    const lar = k.mat({ color: cor(d, 0xd9562e, 0xff5a3c, 0xd96a46), rough: 0.45 });
    const tanqueM = k.mat({ color: cor(d, 0xcfd6dc, 0xe8f0ff, 0xd8dcdf), rough: 0.3, metal: 0.5 });
    k.m(new RoundedBoxGeometry(0.32, 0.26, 0.3, 3, 0.05), lar, 3, caminhao, [0.42, 0.22, 0]);
    k.m(new THREE.BoxGeometry(0.02, 0.1, 0.24), k.mat({ color: 0x24313f, rough: 0.2, liso: true }), 1, caminhao, [0.58, 0.28, 0]);
    k.m(new RoundedBoxGeometry(0.85, 0.06, 0.3, 2, 0.02), k.mat({ color: 0x3a3a3a, rough: 0.6 }), 2, caminhao, [0.05, 0.09, 0]);
    const tq = k.m(cil(0.16, 0.16, 0.6, s(28)), tanqueM, 3, caminhao, [-0.12, 0.27, 0], [0, 0, Math.PI / 2]);
    void tq;
    const roda = k.mat({ color: 0x1e1e22, rough: 0.8 });
    for (const [x, z] of [[0.42, 0.15], [0.42, -0.15], [-0.25, 0.15], [-0.25, -0.15]]) k.m(cil(0.07, 0.07, 0.05, s(18)), roda, 2, caminhao, [x, 0.07, z], [Math.PI / 2, 0, 0]);
    caminhao.scale.setScalar(1.25);
  }

  // ---------------------------------------------------------------- decoração: árvores, cerca, pedras, moitas
  const deco = new THREE.Group();
  raiz.add(deco);
  const folha = k.mat({ color: cor(d, 0x4f9a45, 0x4cc85a, 0x6aa85a), rough: 0.7 });
  const folha2 = k.mat({ color: cor(d, 0x3f8a3c, 0x36ad4c, 0x5a9a4e), rough: 0.7 });
  const tronco = k.mat({ color: cor(d, 0x7a4f30, 0x9a5c32, 0x8a6040), rough: 0.8 });
  const arvore = (x: number, z: number, e: number, seed: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(e);
    k.m(cil(0.05, 0.07, 0.6, s(12)), tronco, 2, g, [0, 0.3, 0]);
    const r = rng(seed);
    if (C) {
      k.m(new THREE.IcosahedronGeometry(0.34, 0), folha, 0, g, [0, 0.82, 0]);
      k.m(new THREE.IcosahedronGeometry(0.24, 0), folha2, 0, g, [0.16, 0.66, 0.08]);
    } else {
      for (let i = 0; i < (B ? 3 : 4); i++) k.m(esfera(0.22 + r() * 0.1, 24, 18), i % 2 ? folha2 : folha, 3, g, [(r() - 0.5) * 0.3, 0.75 + r() * 0.25, (r() - 0.5) * 0.3]);
    }
    deco.add(g);
  };
  arvore(-2.6, -2.5, 1.25, 1);
  arvore(2.65, -2.45, 1.1, 2);
  arvore(-0.9, -2.6, 0.9, 3);
  arvore(-2.85, 2.75, 0.8, 5);
  // cerca na frente
  for (let i = 0; i < 17; i++) {
    const x = -3.0 + i * 0.375;
    if (x > 0.75 && x < 1.4) continue; // porteira
    k.m(new THREE.BoxGeometry(0.05, 0.26, 0.05), madeira, 1.5, deco, [x, 0.13, 3.05]);
  }
  for (const [x0, x1] of [[-3.0, 0.75], [1.4, 3.0]]) {
    k.m(new THREE.BoxGeometry(x1 - x0, 0.035, 0.03), madeira, 1.2, deco, [(x0 + x1) / 2, 0.19, 3.05]);
    k.m(new THREE.BoxGeometry(x1 - x0, 0.035, 0.03), madeira, 1.2, deco, [(x0 + x1) / 2, 0.09, 3.05]);
  }
  const pedra = k.mat({ color: cor(d, 0x9a948a, 0xb9b3c8, 0xa8a196), rough: 0.9 });
  for (let i = 0; i < 9; i++) {
    const r = rng(600 + i);
    const x = (r() - 0.5) * 6, z = (r() - 0.5) * 6;
    if (Math.abs(x) < 2.3 && Math.abs(z) < 2.3) continue;
    k.m(new THREE.IcosahedronGeometry(0.06 + r() * 0.06, C ? 0 : 1), pedra, 1.5, deco, [x, 0.02, z], [r(), r(), r()], [1, 0.6, 1]);
  }
  for (let i = 0; i < 10; i++) {
    const r = rng(700 + i);
    const x = (r() - 0.5) * 6, z = (r() - 0.5) * 6;
    if (Math.abs(x) < 2.4 && Math.abs(z) < 2.3) continue;
    k.m(C ? new THREE.IcosahedronGeometry(0.12, 0) : esfera(0.12, 16, 12), i % 2 ? folha : folha2, 2, deco, [x, 0.06, z], undefined, [1, 0.7, 1]);
  }

  // ---------------------------------------------------------------- nuvem de chuva, gotas
  const nuvem = new THREE.Group();
  raiz.add(nuvem);
  const nuvemMat = k.mat({ color: cor(d, 0xdfe6ee, 0xffffff, 0xeef0f2), rough: 0.95 });
  for (let i = 0; i < 7; i++) {
    const r = rng(800 + i);
    const g = C ? new THREE.IcosahedronGeometry(0.3 + r() * 0.15, 0) : nuvemGeo(0.3 + r() * 0.15, i);
    k.m(g, nuvemMat, 3, nuvem, [(i - 3) * 0.28, (r() - 0.5) * 0.12 + (i % 2) * 0.08, (r() - 0.5) * 0.3]);
  }
  const chuva = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 5), k.mat({ basico: true, color: cor(d, 0xa9d4ff, 0x7fc8ff, 0xb9d8f0), transparent: true, opacity: 0.85 }), 80);
  chuva.castShadow = false;
  chuva.frustumCulled = false;
  raiz.add(chuva);

  // ---------------------------------------------------------------- satélites (A e C: pendurados por fio, como num set de miniatura)
  const sats: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const sg = new THREE.Group();
    const corpoS = k.mat({ color: cor(d, 0xd9dde3, 0xf2f6ff, 0xe8e6e0), rough: 0.35, metal: 0.5 });
    const painel = k.mat({ color: cor(d, 0x23407a, 0x2f6ae0, 0x3c5e90), rough: 0.2, clear: 0.9, liso: true });
    k.m(new RoundedBoxGeometry(0.28, 0.06, 0.16, 2, 0.015), corpoS, 2.5, sg);
    for (const sx of [1, -1]) {
      k.m(new THREE.BoxGeometry(0.62, 0.014, 0.24), painel, 2, sg, [sx * 0.52, 0, 0]);
      k.m(new THREE.BoxGeometry(0.1, 0.01, 0.014), corpoS, 0, sg, [sx * 0.17, 0, 0]);
    }
    k.m(esfera(0.025, 10, 8), k.mat({ basico: true, color: 0xff6b2c }), 0, sg, [0, 0.05, 0]);
    if (!B) {
      const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 8, 4), new THREE.MeshBasicMaterial({ color: 0xcfd8e8, transparent: true, opacity: 0.45 }));
      fio.position.set(0.1, 4.0, 0);
      fio.userData.semWire = true;
      sg.add(fio);
    }
    sg.scale.setScalar(1.5);
    raiz.add(sg);
    sats.push(sg);
  }

  // ---------------------------------------------------------------- sol e lua (de brinquedo)
  const sol = new THREE.Group();
  raiz.add(sol);
  k.m(esfera(0.5, s(40), s(30)), k.mat({ color: 0xffd24a, emissive: 0xffa21f, ei: B ? 0.7 : 1.4, rough: 0.4 }), 3, sol);
  if (B || C) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const raio = k.m(new THREE.ConeGeometry(0.1, 0.28, C ? 3 : 8), k.mat({ color: 0xffc23a, emissive: 0xff9a1f, ei: 0.6 }), 2, sol, [Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0], [0, 0, a - Math.PI / 2]);
      void raio;
    }
  }
  if (!B) {
    const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 10, 4), new THREE.MeshBasicMaterial({ color: 0xcfd8e8, transparent: true, opacity: 0.4 }));
    fio.position.y = 5.3;
    fio.userData.semWire = true;
    sol.add(fio);
  }
  const lua = new THREE.Group();
  raiz.add(lua);
  k.m(esfera(0.32, s(32), s(24)), k.mat({ color: 0xf2efe2, emissive: 0xbfc8ff, ei: 0.35, rough: 0.8 }), 2.5, lua);

  return {
    raiz, tab, casa, paredeFrente, varCob, caminho, cabos, interior, portaGel, luzGel, matLuzGel,
    lampVaranda: { mat: lvMat, luz: lvLuz }, lampSala: { mat: lsMat, luz: lsLuz }, janelas, paredes: [parede, paredeInt],
    celular: { mat: celMat }, note: { g: note, tela: telaMat, texDesl, texCham },
    placas, placasMat, bat, barra, barraMat, luzBat, cist, calha, sist, agua, peixes, galinhas, galinheiro, horta, plantas, plantasBase,
    ant, lampAntiga, lampAntigaMat, notas, blocos, caminhao, deco, nuvem, chuva, sats, sol, lua,
  };
}

/** nuvem de algodão (maquete) ou de bolhas (toon) */
function nuvemGeo(r: number, seed: number) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(r, 3));
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 4 + seed * 3.1, v.y * 4 + v.z * 3 - seed, 3);
    v.multiplyScalar(0.85 + (n - 0.5) * 0.35);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** galinha de brinquedo: corpo contínuo (esfera deformada) com cauda subindo e cabeça que nasce do peito */
function galinha(k: Kit, seed: number) {
  const d = k.dir;
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);
  g.userData.corpo = corpo;
  const geo = mergeVertices(new THREE.SphereGeometry(0.1, k.s(28), k.s(20)));
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    x *= 1.25;
    z *= 0.85;
    // cauda: traseira sobe e afina
    if (x < -0.02) {
      const t = Math.min(1, (-x - 0.02) / 0.1);
      y += t * t * 0.09 * (y > -0.02 ? 1 : 0.4);
      z *= 1 - t * 0.45;
      x -= t * 0.03;
    }
    // peito cheio na frente
    if (x > 0.04) y += (x - 0.04) * 0.4;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const pena = k.mat({ color: d === "B" ? 0xc0683a : d === "C" ? 0xc0753f : 0xb8693c, rough: 0.7 });
  k.m(geo, pena, 2.5, corpo, [0, 0.14, 0]);
  // pescoço/cabeça: esfera esticada para cima que entra no peito (sem junta à mostra)
  const cab = mergeVertices(new THREE.SphereGeometry(0.06, k.s(20), k.s(14)));
  const pc = cab.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pc.count; i++) {
    const y = pc.getY(i);
    if (y < 0) pc.setXYZ(i, pc.getX(i) * (1 + -y * 4), y * 2.2, pc.getZ(i) * (1 + -y * 2));
  }
  cab.computeVertexNormals();
  const cabeca = k.m(cab, pena, 2.5, corpo, [0.1, 0.26, 0]);
  void cabeca;
  const crista = k.mat({ color: 0xd8262b, rough: 0.5 });
  k.m(esfera(0.022, 12, 8), crista, 1.5, corpo, [0.1, 0.33, 0], undefined, [1.4, 1, 0.5]);
  k.m(esfera(0.018, 12, 8), crista, 1.5, corpo, [0.075, 0.325, 0], undefined, [1.2, 1, 0.5]);
  k.m(esfera(0.014, 10, 8), crista, 1, corpo, [0.14, 0.235, 0], undefined, [0.8, 1.4, 0.6]);
  k.m(new THREE.ConeGeometry(0.018, 0.04, 6).rotateZ(-Math.PI / 2), k.mat({ color: 0xf2a33a, rough: 0.5 }), 1.5, corpo, [0.165, 0.27, 0]);
  const olho = k.mat({ color: 0x111111, rough: 0.3 });
  k.m(esfera(0.009, 8, 6), olho, 0, corpo, [0.13, 0.285, 0.035]);
  k.m(esfera(0.009, 8, 6), olho, 0, corpo, [0.13, 0.285, -0.035]);
  const perna = k.mat({ color: 0xf2a33a, rough: 0.5 });
  for (const z of [-0.03, 0.03]) k.m(cil(0.008, 0.008, 0.07, 6), perna, 1, g, [0, 0.035, z]);
  g.userData.seed = seed;
  return g;
}
