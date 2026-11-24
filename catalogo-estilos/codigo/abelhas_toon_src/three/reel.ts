import * as THREE from "three";
import { Mundo } from "./mundo";
import { apontaY, cil, esfera, Kit, tubo, V3 } from "./kit";
import { clamp, easeInOut, easeOut, lerp, rng, smooth } from "./rng";
import { texCeu, texPlaca } from "./tex";
import {
  abelha, banca, bateAsas, bule, caixote, faca, florLaranjeira, florMaracuja, folha, galinha, laranja, mamangava, maracuja,
  meiaLaranja, pilhaFrutas, porquinho, ramoLaranjeira, ramoMaracuja, tabua, vapor, xicara,
} from "./objetos";
import { Mao, sdCapsula, sdUniao } from "./mao";
import FALA from "../fala.json";

// ---------------------------------------------------------------- tempos da fala
export const W = FALA as { w: string; s: number; e: number }[];
export const ws = (i: number) => W[i].s;
export const we = (i: number) => W[i].e;
export const DURACAO = 77.948;
export const N_QUADROS = Math.round(DURACAO * 30);
export const T_LOOP = (N_QUADROS - 1) / 30 - 0.3;
export const T_POP = 1.3; // a abelha some no "sumissem"

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const v3 = (a: V3) => new THREE.Vector3(...a);
const e01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

type Cam = { pos: V3; alvo: V3; fov: number };
type Tomada = { nome: string; set: string; t0: number; t1: number; cam: [Cam, Cam]; ext?: number; sol?: V3 };

// ---------------------------------------------------------------- tomadas (presas à fala)
const Z = (pos: V3, alvo: V3, fov = 30): Cam => ({ pos, alvo, fov });
export const TOMADAS: Tomada[] = [
  { nome: "gancho", set: "ramo", t0: 0, t1: 2.2, cam: [Z([0.03, 0.04, 0.27], [-0.006, 0.022, 0]), Z([0.024, 0.032, 0.215], [-0.008, 0.016, 0])] },
  { nome: "cafe", set: "cozinha", t0: 2.2, t1: 3.95, cam: [Z([-0.03, 0.22, 0.34], [-0.085, 0.085, -0.12], 44), Z([-0.05, 0.2, 0.29], [-0.09, 0.08, -0.12], 44)] },
  { nome: "laranja", set: "cozinha", t0: 3.95, t1: 5.62, cam: [Z([-0.08, 0.36, 0.2], [0.04, 0.04, -0.01], 34), Z([-0.06, 0.32, 0.17], [0.04, 0.035, -0.01], 34)] },
  { nome: "rastro", set: "cozinha", t0: 5.62, t1: 8.0, cam: [Z([0.0, 0.32, 0.46], [-0.03, 0.09, -0.06], 34), Z([0.02, 0.38, 0.56], [-0.03, 0.09, -0.06], 34)] },
  { nome: "feira2", set: "feira", t0: 10.9, t1: 13.9, ext: 5, cam: [Z([0.25, 2.3, 3.5], [0.0, 1.05, -1.0], 40), Z([0.1, 2.15, 2.9], [0.0, 1.05, -1.0], 40)] },
  { nome: "feira", set: "feira", t0: 8.0, t1: 10.9, ext: 5, cam: [Z([0.0, 2.7, 4.3], [0.0, 0.75, -1.2], 40), Z([0.0, 2.3, 3.2], [0.0, 0.8, -1.2], 40)] },
  { nome: "bichos", set: "feira", t0: 13.9, t1: 16.5, ext: 2, cam: [Z([-0.3, 1.32, -1.4], [0.62, 0.98, -2.1], 36), Z([-0.15, 1.27, -1.18], [0.62, 0.98, -2.2], 36)] },
  { nome: "principais", set: "ceu", t0: 16.5, t1: 18.95, ext: 3, cam: [Z([0, 1.5, 2.2], [0, 2.3, -1], 42), Z([0.1, 1.5, 2.0], [0.05, 2.35, -1], 42)] },
  { nome: "somem", set: "ceu", t0: 18.95, t1: 22.5, ext: 3, cam: [Z([-0.2, 1.4, 2.6], [0, 2.2, -1], 42), Z([-0.1, 1.45, 2.4], [0, 2.25, -1], 42)] },
  { nome: "dia1b", set: "pomar", t0: 25.0, t1: 26.9, cam: [Z([0.04, 0.045, 0.38], [0.0, 0.0, 0], 30), Z([0.02, 0.035, 0.33], [0.0, -0.005, 0], 30)] },
  { nome: "dia1", set: "pomar", t0: 22.5, t1: 25.0, cam: [Z([0.03, 0.03, 0.62], [0.0, -0.01, 0], 30), Z([0.0, 0.02, 0.52], [0.0, -0.01, 0], 30)] },
  { nome: "semfruto", set: "pomar", t0: 26.9, t1: 28.92, cam: [Z([-0.02, 0.02, 0.5], [0.0, -0.015, 0], 30), Z([-0.03, 0.015, 0.44], [0.0, -0.02, 0], 30)] },
  { nome: "maracuja", set: "feira", t0: 28.92, t1: 31.75, ext: 2, cam: [Z([0.3, 1.42, 0.82], [-0.66, 0.88, 0.0], 36), Z([0.2, 1.37, 0.66], [-0.66, 0.88, 0.0], 36)] },
  { nome: "mamangava", set: "mara", t0: 31.75, t1: 34.12, cam: [Z([-0.02, 0.1, 0.26], [-0.06, 0.0, 0], 34), Z([-0.04, 0.09, 0.22], [-0.06, 0.0, 0], 34)] },
  { nome: "pincel", set: "mara", t0: 34.12, t1: 37.82, cam: [Z([0.05, 0.2, 0.42], [-0.02, -0.01, -0.03], 40), Z([0.1, 0.19, 0.4], [0.03, -0.01, -0.03], 40)] },
  { nome: "colheita2", set: "feira", t0: 40.0, t1: 42.8, ext: 2, cam: [Z([-0.3, 1.35, 0.62], [0.62, 0.95, 0.0], 36), Z([-0.22, 1.3, 0.4], [0.62, 0.95, -0.05], 36)] },
  { nome: "colheita", set: "feira", t0: 37.82, t1: 40.0, ext: 5, cam: [Z([0.0, 1.5, -6.6], [0.0, 0.8, -3.8], 44), Z([0.0, 1.45, -2.2], [0.0, 0.8, 0.4], 44)] },
  { nome: "racao", set: "racao", t0: 42.8, t1: 45.95, cam: [Z([-0.3, 0.3, 0.6], [0.02, 0.07, 0], 34), Z([0.12, 0.28, 0.62], [0.02, 0.07, 0], 34)] },
  { nome: "bilhoes2", set: "mapa", t0: 48.6, t1: 51.82, cam: [Z([0.06, 0.78, 0.22], [0.0, 0.0, -0.02], 34), Z([-0.06, 0.72, 0.3], [0.0, 0.0, -0.02], 34)] },
  { nome: "bilhoes", set: "mapa", t0: 45.95, t1: 48.6, cam: [Z([0.12, 0.62, 0.62], [0.0, 0.07, -0.02], 34), Z([-0.08, 0.5, 0.55], [0.0, 0.08, -0.02], 34)] },
  { nome: "graos", set: "trigo", t0: 51.82, t1: 54.25, ext: 2, cam: [Z([-1.3, 1.0, 1.25], [-1.3, 0.15, -0.3], 40), Z([1.1, 1.05, 1.35], [1.1, 0.35, -0.3], 40)] },
  { nome: "vento", set: "trigo", t0: 54.25, t1: 56.85, ext: 2, cam: [Z([0.9, 0.35, 0.75], [1.4, 0.75, -0.6], 40), Z([1.2, 0.33, 0.7], [1.6, 0.78, -0.6], 40)] },
  { nome: "prato2", set: "prato", t0: 59.25, t1: 61.85, cam: [Z([0.03, 0.5, 0.3], [0.01, 0.0, 0.0]), Z([0.0, 0.47, 0.27], [0.01, 0.0, 0.0])] },
  { nome: "prato", set: "prato", t0: 56.85, t1: 59.25, cam: [Z([0.0, 0.66, 0.44], [0.01, 0.0, 0.0]), Z([0.0, 0.6, 0.36], [0.01, 0.0, 0.0])] },
  { nome: "comenta", set: "prato", t0: 61.85, t1: 64.42, cam: [Z([0.0, 0.6, 0.36], [0.01, 0.0, 0.0]), Z([0.0, 0.57, 0.33], [0.01, 0.0, 0.0])] },
  { nome: "virada", set: "virada", t0: 64.42, t1: 99, cam: [Z([0.03, 0.04, 0.25], [-0.006, 0.02, 0]), Z([0.11, 0.12, 0.5], [0.075, 0.085, 0])] },
];
export const tomadaEm = (t: number) => TOMADAS.find((k) => t >= k.t0 && t < k.t1) ?? TOMADAS[TOMADAS.length - 1];

// escada de cor do mundo: perde saturação a cada degrau
const DEGRAUS: [number, number][] = [
  [ws(53), 0.88], // somem
  [ws(73), 0.76], // o maracujá some
  [ws(98), 0.68], // café
  [ws(100), 0.62], // laranja
  [ws(103), 0.56], // maçã
  [ws(119), 0.5], // soja também
];
export function saturacao(t: number, set: string) {
  if (set === "trigo" || set === "prato" || set === "virada" || set === "ramo") return 1;
  let s = 1;
  for (const [t0, v] of DEGRAUS) s = lerp(s, v, smooth(t0, t0 + 0.6, t));
  return s;
}

// ---------------------------------------------------------------- mundo do reel (direção B)
export class MundoReel extends Mundo {
  constructor(canvas: HTMLCanvasElement, W = 1080, H = 1920) {
    super(canvas, "B", W, H);
  }

  quadro(t: number) {
    const tm = tomadaEm(t);
    const c = this.conf(tm.set);
    this.mostra(tm.set, t);
    const u = easeInOut(e01(t, tm.t0, tm.t1));
    const [a, b] = tm.cam;
    const pos = v3(a.pos).lerp(v3(b.pos), u);
    const alvo = v3(a.alvo).lerp(v3(b.alvo), u);
    // balanço leve de câmera de mão
    const d = pos.distanceTo(alvo);
    pos.x += Math.sin(t * 0.9) * d * 0.006;
    pos.y += Math.sin(t * 1.3 + 1) * d * 0.004;
    this.camera.position.copy(pos);
    this.camera.fov = lerp(a.fov, b.fov, u);
    this.camera.near = Math.max(0.003, d * 0.02);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(alvo);
    if (tm.ext) {
      const s = c.sol;
      this.sol.position.copy(s.alvo).add(s.dir.clone().normalize().multiplyScalar(tm.ext * 4));
      const sc = this.sol.shadow.camera;
      sc.left = sc.bottom = -tm.ext;
      sc.right = sc.top = tm.ext;
      sc.near = tm.ext * 0.5;
      sc.far = tm.ext * 10;
      sc.updateProjectionMatrix();
    }
    this.final.uniforms.sat.value = saturacao(t, tm.set);
    if (c.obj?.anima) c.obj.anima(t, tm);
    this.render();
  }

  // ------------------------------------------------------------ 1 · ramo (gancho)
  p_ramo() {
    const k = this.k;
    const g = new THREE.Group();
    const ramo = ramoLaranjeira(k);
    g.add(ramo);
    const f1 = ramo.userData.flor1 as THREE.Object3D;
    const copa = k.mat({ color: "#49b84a", rough: 0.9 });
    const r = rng(3);
    for (let i = 0; i < 6; i++) {
      const p = V(-0.3 + i * 0.12 + r() * 0.04, -0.42 + r() * 0.1, -1.4 - r() * 0.3);
      k.m(esfera(0.12 + r() * 0.05, 28, 18), copa, 3, g, [p.x, p.y, p.z]);
      for (let j = 0; j < 3; j++) k.m(esfera(0.022, 16, 12), k.mat({ color: "#ff8a14" }), 2, g, [p.x + (r() - 0.5) * 0.14, p.y + r() * 0.08, p.z + 0.11]);
    }
    const ab = abelha(k, { asas: 0.95 });
    ab.scale.setScalar(1.4);
    g.add(ab);
    const fa = faiscas(30, "#ffd84a", 0.0022);
    g.add(fa);
    const L = V(-0.013, 0.017, 0.008);
    const anima = (t: number) => {
      // voo até a flor (quadro 0 já com ação), pouso, estalo no "sumissem"
      const uv = easeOut(e01(t, 0, 0.75));
      const P0 = V(-0.026, 0.011, 0.034);
      const p = P0.clone().lerp(L, uv);
      p.y += Math.sin(uv * Math.PI) * 0.012 + (t > 0.75 ? Math.sin((t - 0.75) * 9) * 0.0012 : 0);
      const pop = e01(t, T_POP, T_POP + 0.12);
      const s = t < T_POP ? 1 : pop < 0.4 ? 1 + pop * 0.6 : Math.max(0, 1.24 * (1 - (pop - 0.4) / 0.6));
      ab.visible = s > 0.001;
      this.pousa(ab, p, V(0.35, 1, 0.15), V(1, -0.45 + (1 - uv) * 0.3, 0.55), 0);
      ab.scale.setScalar(1.4 * s);
      bateAsas(ab, t);
      // a flor balança no pouso
      const q = e01(t, 0.72, 1.3);
      f1.scale.setScalar(1 - 0.08 * Math.sin(q * Math.PI * 3) * (1 - q));
      animaFaiscas(fa, L, t - T_POP, 0.035);
    };
    return { g, cam: { pos: V(0, 0, 1), alvo: V(0, 0, 0), fov: 30 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 0.25, alvo: V(0, 0, 0) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 2 · cozinha (café, laranja, rastro)
  p_cozinha() {
    const k = this.k;
    const g = new THREE.Group();
    this.mesa(g, 0, 4, "massa", "#ffd27a");
    k.m(new THREE.BoxGeometry(2, 1, 0.02), k.mat({ color: "#7fd3c4", rough: 0.9, semContorno: true }), 3, g, [0, 0.5, -0.3]);
    k.m(new THREE.BoxGeometry(0.42, 0.3, 0.02), k.mat({ color: "#bfeaff", emissive: "#bfeaff", ei: 0.4 }), 3, g, [0.12, 0.33, -0.285]);
    const tb = tabua(k);
    tb.position.set(0.04, 0, 0);
    g.add(tb);
    const R = 0.04;
    const O = V(0.04, 0.022 + R, 0.0);
    const lar = laranja(k, R);
    lar.position.copy(O);
    lar.rotation.z = 0.3;
    g.add(lar);
    const mL = meiaLaranja(k, R), mR = meiaLaranja(k, R);
    g.add(mL, mR);
    const cup = xicara(k, "#ff6f6f");
    const C = V(-0.13, 0.012, -0.12);
    cup.position.copy(C);
    g.add(cup);
    const cafe = cup.userData.cafe as THREE.Mesh;
    const vp = vapor(3);
    vp.position.copy(C).add(V(0, 0.065, 0));
    g.add(vp);
    // bule
    const bOut = new THREE.Group();
    bOut.position.copy(C).add(V(0.105, 0.08, 0.0));
    bOut.rotation.y = Math.PI;
    const bIn = new THREE.Group();
    bOut.add(bIn);
    const bl = bule(k);
    bl.scale.setScalar(0.72);
    bl.position.y = -0.03;
    bIn.add(bl);
    g.add(bOut);
    const jato = new THREE.Mesh(cil(0.0042, 0.005, 1, 10), k.mat({ color: "#4a2410", rough: 0.2 }));
    k.contorno(jato, 1.5);
    g.add(jato);
    // faca + mão (toon) segurando o cabo
    const kOut = new THREE.Group();
    kOut.rotation.y = -Math.PI / 2;
    const fi = faca(k);
    fi.rotation.z = 0.1;
    kOut.add(fi);
    g.add(kOut);
    const posFaca = (y: number) => kOut.position.set(O.x + 0.002, y, O.z + 0.05);
    posFaca(0.0235);
    kOut.updateWorldMatrix(true, true);
    const h0 = fi.localToWorld(V(0.012, 0.017, 0)), h1 = fi.localToWorld(V(0.11, 0.017, 0));
    const mao = new Mao(k, "R").addTo(g);
    const sd = sdCapsula(h0, h1, 0.0095);
    this.pegaBastao(mao, h1.clone().sub(h0).normalize().negate(), fi.localToWorld(V(0.068, 0.017, 0)), V(1, 0.9, 0.3), 0.0095);
    mao.fecha(sdUniao(sd));
    mao.fechaPolegar(sd);
    this.bracoPara(mao, V(0.35, 0.2, 0.42));
    kOut.attach(mao.raiz);
    kOut.attach(mao.braco);
    const gotas: THREE.Mesh[] = [];
    const suco = new THREE.MeshToonMaterial({ color: "#ffb02e", gradientMap: k.grad });
    for (const [x, z, s] of [[-0.03, 0.03, 1], [0.035, 0.035, 0.7], [-0.012, 0.05, 0.6], [0.05, -0.03, 0.8]] as V3[]) {
      const go = new THREE.Mesh(esfera(0.004 * s, 14, 10), suco);
      go.position.set(O.x + x, 0.0225, O.z + z);
      gotas.push(go);
      g.add(go);
    }
    // rastro da abelha: do café, por cima da laranja
    const pts = [C.clone().add(V(0, 0.08, 0)), V(-0.09, 0.17, -0.08), V(-0.02, 0.15, -0.02), V(0.04, 0.12, 0.0), V(0.11, 0.15, -0.05)];
    const curva = new THREE.CatmullRomCurve3(pts);
    const tg = new THREE.TubeGeometry(curva, 120, 0.0018, 8);
    const rastro = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: "#ffd56a", transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(rastro);
    const nIdx = tg.index!.count;
    const pg = new THREE.BufferGeometry();
    const pp: number[] = [];
    const rr = rng(6);
    const us: number[] = [];
    for (let i = 0; i < 110; i++) {
      const uu = rr();
      us.push(uu);
      const c = curva.getPointAt(uu);
      pp.push(c.x + (rr() - 0.5) * 0.014, c.y + (rr() - 0.5) * 0.014, c.z + (rr() - 0.5) * 0.014);
    }
    // ordena por u para o drawRange revelar junto
    const ord = us.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const pp2: number[] = [];
    for (const i of ord) pp2.push(pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2]);
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pp2, 3));
    const brilho = new THREE.Points(pg, new THREE.PointsMaterial({ color: "#fff2b0", size: 0.0024, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(brilho);
    const fant = abelha(k, { fantasma: true, asas: 0.9 });
    fant.scale.setScalar(2.2);
    g.add(fant);

    const anima = (t: number) => {
      // café: o bule inclina e despeja, a xícara enche
      const inc = easeInOut(e01(t, 2.3, 2.75)) * (1 - easeInOut(e01(t, 3.75, 4.05)));
      bIn.rotation.z = -0.62 * inc;
      bOut.updateWorldMatrix(true, true);
      const bico = bl.localToWorld((bl.userData.bico as THREE.Vector3).clone());
      const nivel = t < 2.2 ? 1 : 0.15 + 0.85 * smooth(2.7, 3.85, t);
      const yc = C.y + lerp(0.012, 0.052, nivel);
      cafe.position.y = lerp(0.012, 0.052, nivel);
      cafe.scale.setScalar(lerp(0.78, 1, nivel));
      const despeja = t > 2.62 && t < 3.9 && t < 6;
      jato.visible = despeja;
      if (despeja) {
        const fim = V(C.x + 0.008, yc, C.z);
        const dd = fim.clone().sub(bico);
        jato.scale.set(1, dd.length(), 1);
        jato.position.copy(bico).add(dd.clone().multiplyScalar(0.5));
        apontaY(jato, dd.clone().negate());
      }
      vp.visible = nivel > 0.6;
      bOut.visible = t < 4.0;
      // faca: antecipa, desce cortando, sobe
      const yTopo = O.y + R + 0.008;
      let yk = yTopo + 0.01;
      if (t >= 3.95) yk = yTopo + 0.01 + 0.012 * Math.sin(Math.PI * e01(t, 4.0, 4.32));
      const corte = e01(t, 4.33, 4.78);
      if (t >= 4.33) yk = lerp(yTopo, 0.0235, corte * corte);
      if (t >= 4.95) yk = lerp(0.0235, 0.06, easeOut(e01(t, 4.95, 5.4)));
      if (t < 3.9 || t > 5.62) yk = t > 5.62 ? 0.06 : yTopo + 0.01;
      posFaca(yk);
      kOut.visible = t >= 3.9 && t < 5.62;
      mao.raiz.visible = mao.braco.visible = kOut.visible;
      // laranja inteira até a lâmina passar do meio; depois as metades abrem
      const abriu = t >= 4.6 && t < 60;
      lar.visible = !abriu;
      mL.visible = mR.visible = abriu;
      const ua = easeOut(e01(t, 4.6, 5.05));
      const quica = 1 - 0.14 * Math.sin(e01(t, 5.0, 5.35) * Math.PI) ;
      for (const [m, s] of [[mL, -1], [mR, 1]] as [THREE.Object3D, number][]) {
        m.position.set(O.x + s * 0.042 * ua, O.y + 0.016 * Math.sin(ua * Math.PI), O.z + s * 0.01 * ua);
        m.rotation.set(0, s * 0.3 * ua, -s * (Math.PI / 2) * (1 - ua));
        m.scale.set(1 / Math.sqrt(quica), quica, 1 / Math.sqrt(quica));
      }
      gotas.forEach((go, i) => go.scale.setScalar(easeOut(e01(t, 4.7 + i * 0.05, 4.9 + i * 0.05))));
      // rastro
      const ur = easeInOut(e01(t, 5.75, 7.5));
      const vis = t >= 5.7;
      rastro.visible = brilho.visible = fant.visible = vis;
      tg.setDrawRange(0, Math.floor(nIdx * ur / 3) * 3);
      pg.setDrawRange(0, Math.floor(110 * ur));
      const pa = curva.getPointAt(Math.max(0.001, ur));
      const pb = curva.getPointAt(Math.min(1, ur + 0.02));
      fant.position.copy(pa);
      fant.lookAt(pb.clone().add(pb.clone().sub(pa).multiplyScalar(5)));
      bateAsas(fant, t);
    };
    return { g, cam: { pos: V(0, 0, 1), alvo: V(0, 0, 0), fov: 30 }, ceu: ["#ffe6a8", "#ffd27a"], sol: { dir: V(-1, 1.6, 1.1), ext: 0.4, alvo: V(-0.03, 0.05, -0.05) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 3 · feira (rua com bancas dos dois lados)
  p_feira() {
    const k = this.k;
    const g = new THREE.Group();
    this.mesa(g, 0, 40, "massa", "#f1dfb0");
    // calçada mais escura no meio
    const rua = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 30), k.mat({ color: "#d9c393", semContorno: true }));
    rua.rotation.x = -Math.PI / 2;
    rua.position.set(0, 0.001, -5);
    rua.receiveShadow = true;
    g.add(rua);
    type Banca = { g: THREE.Group; frutas: THREE.Object3D[]; halo: THREE.Sprite; nome: string };
    const bancas: Record<string, Banca> = {};
    const def: [string, number, number, [string, string], string][] = [
      ["maracuja", -1, 0, ["#ffcf3a", "#ffffff"], "#3fae6a"],
      ["laranja", 1, -2.1, ["#e8473a", "#ffffff"], "#2f6fb8"],
      ["milho", -1, -2.1, ["#8bc34a", "#ffffff"], "#c9853f"],
      ["maca", 1, 0, ["#3f8ee8", "#ffffff"], "#e8473a"],
      ["cafe", -1, -4.2, ["#9b59b6", "#ffffff"], "#ffb21a"],
      ["arroz", 1, -4.2, ["#ff8a14", "#ffffff"], "#3fae6a"],
    ];
    const placa: Record<string, string> = { maracuja: "MARACUJÁ", laranja: "LARANJA", milho: "MILHO", maca: "MAÇÃ", cafe: "CAFÉ", arroz: "ARROZ" };
    for (const [nome, lado, z, toldo, saia] of def) {
      const b = banca(k, { toldo, saia, placa: placa[nome] });
      b.position.set(lado * 0.78, 0, z);
      b.rotation.y = lado < 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(b);
      const topo = b.userData.topo as number;
      const frutas: THREE.Object3D[] = [];
      for (const x of [-0.38, 0, 0.38]) {
        const cx = caixote(k);
        cx.position.set(x, topo, 0.02);
        b.add(cx);
        let pf: THREE.Group;
        const sd = Math.round(x * 10 + 5 + z * 3 + lado * 7);
        if (nome === "maracuja") pf = pilhaFrutas(k, 9, 0.045, "#ffd84a", 0.3, 0.22, sd, () => maracuja(k, 0.042));
        else if (nome === "laranja") pf = pilhaFrutas(k, 14, 0.04, "#ff8a14", 0.3, 0.22, sd);
        else if (nome === "maca") pf = pilhaFrutas(k, 14, 0.038, "#e8273a", 0.3, 0.22, sd);
        else if (nome === "cafe") pf = pilhaFrutas(k, 40, 0.02, "#c4161c", 0.3, 0.22, sd);
        else if (nome === "milho") pf = pilhaFrutas(k, 8, 0.03, "#ffd23a", 0.3, 0.22, sd, () => espiga(k));
        else pf = pilhaFrutas(k, 30, 0.022, "#f6f1e2", 0.3, 0.22, sd);
        pf.position.set(x, topo, 0.02);
        b.add(pf);
        frutas.push(...pf.children);
      }
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO(), color: "#ffe680", transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending }));
      halo.scale.set(1.3, 1.3, 1);
      halo.position.set(0, 1.05, 0.1);
      b.add(halo);
      const selo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_SELO(nome === "milho" ? "vento" : "flor"), transparent: true, opacity: 0, depthWrite: false }));
      selo.position.set(0, 1.45, 0.42);
      selo.scale.set(0.3, 0.3, 1);
      b.add(selo);
      b.userData.selo = selo;
      bancas[nome] = { g: b, frutas, halo, nome };
    }
    // abelhas visitando a banca de laranja
    const abs: THREE.Object3D[] = [];
    for (let i = 0; i < 4; i++) {
      const ab = abelha(k, { asas: 0.9 });
      ab.scale.setScalar(4.5);
      g.add(ab);
      abs.push(ab);
    }
    const r = rng(12);
    const ordem = (n: number, seed: number) => {
      const rr = rng(seed);
      return Array.from({ length: n }, (_, i) => [rr(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    };
    void r;
    const some = (b: Banca, t0: number, frac: number, dur = 0.7) => {
      const o = ordem(b.frutas.length, b.nome.length * 7 + 3);
      const n = Math.round(b.frutas.length * frac);
      o.forEach((idx, j) => {
        const f = b.frutas[idx];
        if (f.userData.s0 === undefined) f.userData.s0 = f.scale.x;
        if (j >= n) return;
        f.userData.t = t0 + (j / Math.max(1, n)) * dur;
      });
    };
    some(bancas.maracuja, ws(73) - 0.1, 1.0, 0.75);
    some(bancas.cafe, ws(98), 0.5, 0.5);
    some(bancas.laranja, ws(100), 0.5, 0.45);
    some(bancas.maca, ws(103), 0.5, 0.45);
    const acende: [string, number][] = [["maracuja", ws(26)], ["laranja", ws(28)], ["maca", ws(29)]];
    const anima = (t: number) => {
      for (const b of Object.values(bancas)) {
        for (const f of b.frutas) {
          const s0 = f.userData.s0 ?? f.scale.x;
          const tt = f.userData.t as number | undefined;
          if (tt === undefined) {
            f.scale.setScalar(s0);
            f.visible = true;
            continue;
          }
          const u = e01(t, tt, tt + 0.22);
          const s = u < 0.35 ? 1 + u * 0.6 : 1.2 * (1 - (u - 0.35) / 0.65);
          f.scale.setScalar(s0 * Math.max(0, s));
          f.visible = s > 0.01;
        }
        (b.halo.material as THREE.SpriteMaterial).opacity = 0;
      }
      for (const [n, t0] of acende) {
        const u = e01(t, t0, t0 + 0.3);
        const fim = 1 - e01(t, 13.6, 13.9);
        const h = bancas[n].halo;
        (h.material as THREE.SpriteMaterial).opacity = (0.6 + 0.3 * Math.sin(u * Math.PI)) * u * fim * (t < 14 ? 1 : 0);
        const sc = 1.3 * (0.6 + 0.4 * easeOut(u) + 0.15 * Math.sin(u * Math.PI));
        h.scale.set(sc, sc, 1);
      }
      // selos 3D: flor nas 3 bancas que dependem de polinizador, vento no milho
      for (const b of Object.values(bancas)) {
        const sp = b.g.userData.selo as THREE.Sprite;
        const ac = acende.find(([n]) => n === b.nome);
        const t0 = ac ? ac[1] : b.nome === "milho" ? ws(29) + 0.25 : 99;
        const u = e01(t, t0, t0 + 0.25);
        const fim = 1 - e01(t, 13.6, 13.9);
        (sp.material as THREE.SpriteMaterial).opacity = u * fim * (t < 14 ? 1 : 0);
        const k = 0.3 * (u < 1 ? easeOut(u) * (1 + 0.35 * Math.sin(u * Math.PI)) : 1);
        sp.scale.set(k, k, 1);
      }
      // abelhas rodeando a banca de laranja (só antes de sumirem)
      abs.forEach((ab, i) => {
        ab.visible = t < 17;
        const a = t * (1.2 + i * 0.25) + i * 1.6;
        const c = V(0.62, 1.0 + 0.08 * Math.sin(t * 2 + i), -2.1);
        const p = c.clone().add(V(-0.12 + 0.18 * Math.cos(a), 0.12 * Math.sin(a * 1.3), 0.32 * Math.sin(a)));
        ab.position.copy(p);
        const tg = c.clone().add(V(-0.12 + 0.18 * Math.cos(a + 0.1), 0.12 * Math.sin((a + 0.1) * 1.3), 0.32 * Math.sin(a + 0.1)));
        ab.lookAt(tg);
        bateAsas(ab, t + i);
      });
    };
    return { g, cam: { pos: V(0, 1.8, 3), alvo: V(0, 0.9, -1), fov: 40 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 0.8), ext: 5, alvo: V(0, 0.5, -1.5) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 4 · céu com abelhas (e elas somem)
  p_ceu() {
    const k = this.k;
    const g = new THREE.Group();
    // toldos e copa nas bordas, de baixo para cima
    for (const [x, z, c] of [[-1.0, -0.3, "#ffcf3a"], [1.1, -0.6, "#e8473a"]] as [number, number, string][]) {
      const b = banca(k, { toldo: [c, "#ffffff"], saia: "#3fae6a" });
      b.position.set(x, 0, z);
      b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(b);
    }
    const copa = k.mat({ color: "#49b84a", rough: 0.9 });
    for (const [x, y, z, r] of [[-1.3, 2.6, -1.8, 0.7], [-0.8, 3.1, -2.2, 0.6], [1.5, 2.9, -2.0, 0.75]] as [number, number, number, number][]) k.m(esfera(r, 32, 20), copa, 3, g, [x, y, z]);
    const abs: { ab: THREE.Object3D; c: THREE.Vector3; r: number; w: number; f: number; tp: number }[] = [];
    const rr = rng(21);
    const N = 14;
    const tA = ws(50), tB = ws(53) + 0.45;
    const ord = Array.from({ length: N }, (_, i) => [rr(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (let i = 0; i < N; i++) {
      const ab = abelha(k, { asas: 0.9 });
      ab.scale.setScalar(3.6 + rr() * 1.2);
      g.add(ab);
      const c = V(-0.7 + rr() * 1.4, 1.9 + rr() * 1.0, -0.6 - rr() * 1.0);
      abs.push({ ab, c, r: 0.08 + rr() * 0.15, w: 1.2 + rr() * 1.5, f: rr() * 6, tp: tA + (ord.indexOf(i) / (N - 1)) * (tB - tA) });
    }
    const fa = abs.map(() => {
      const f = faiscas(14, "#ffe27a", 0.004);
      g.add(f);
      return f;
    });
    const anima = (t: number) => {
      abs.forEach((b, i) => {
        const a = t * b.w + b.f;
        const p = b.c.clone().add(V(Math.cos(a) * b.r * 1.6, Math.sin(a * 1.7) * b.r * 0.5, Math.sin(a) * b.r));
        const pn = b.c.clone().add(V(Math.cos(a + 0.1) * b.r * 1.6, Math.sin((a + 0.1) * 1.7) * b.r * 0.5, Math.sin(a + 0.1) * b.r));
        b.ab.position.copy(p);
        b.ab.lookAt(pn.clone().add(pn.clone().sub(p).multiplyScalar(4)));
        const u = e01(t, b.tp, b.tp + 0.12);
        const s = t < b.tp ? 1 : u < 0.4 ? 1 + u * 0.6 : Math.max(0, 1.24 * (1 - (u - 0.4) / 0.6));
        b.ab.scale.setScalar((b.ab.userData.s0 ??= b.ab.scale.x) * s);
        b.ab.visible = s > 0.001;
        bateAsas(b.ab, t + i);
        animaFaiscas(fa[i], p, t - b.tp, 0.09);
      });
    };
    return { g, cam: { pos: V(0, 1.5, 2), alvo: V(0, 2.3, -1), fov: 42 }, ceu: ["#3aa6ff", "#8fd3ff", "#e8f7ff"], sol: { dir: V(-1, 1.6, 1.0), ext: 3, alvo: V(0, 1.5, -1) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 5 · pomar: flores abrem; muitas não viram fruto
  p_pomar() {
    const k = this.k;
    const g = new THREE.Group();
    const casca = k.mat({ color: "#7a5534", rough: 0.9 });
    k.m(tubo([[0.03, -0.4, 0.0], [0.0, -0.15, 0.005], [0.012, 0.05, -0.005], [-0.01, 0.2, 0.0]], (u) => 0.006 - 0.003 * u, 80, 12), casca, 2.4, g);
    const copa = k.mat({ color: "#49b84a", rough: 0.9 });
    const r = rng(5);
    for (let i = 0; i < 7; i++) k.m(esfera(0.13 + r() * 0.05, 28, 18), copa, 3, g, [-0.5 + i * 0.17, -0.25 + r() * 0.1, -1.2 - r() * 0.3]);
    const flores: { f: THREE.Group; x: number; murcha: boolean; fruto: THREE.Mesh; t0: number }[] = [];
    const xs = [-0.11, -0.065, -0.02, 0.025, 0.07, 0.115];
    xs.forEach((x, i) => {
      const f = florLaranjeira(k, 0.3);
      const lado = i % 2 ? 1 : -1;
      f.position.set(lado * 0.026 + 0.005, x, 0.006);
      f.scale.setScalar(1.25);
      apontaY(f, V(lado * 0.55, 0.45, 0.75));
      g.add(f);
      const fr = k.m(esfera(0.007, 16, 12), k.mat({ color: "#5fb83a", rough: 0.6 }), 2, f, [0, 0.004, 0]);
      fr.visible = false;
      flores.push({ f, x, murcha: [0, 2, 3, 5].includes(i), fruto: fr, t0: ws(60) + i * 0.17 });
      const fo = folha(k, 0.05);
      fo.position.set(-lado * 0.012, x + 0.015, -0.008);
      apontaY(fo, V(-lado * 0.8, 0.3, -0.4));
      g.add(fo);
    });
    const marrom = new THREE.Color("#b58b4c");
    const anima = (t: number) => {
      for (const fl of flores) {
        const pets = fl.f.userData.petalas as THREE.Group[];
        const abre = 0.3 + 0.7 * easeOut(e01(t, fl.t0, fl.t0 + 0.6));
        let ang = 1.25 - 0.55 * abre;
        const tm = ws(63) + 0.25 + (fl.x + 0.12) * 3;
        const um = e01(t, tm, tm + 0.5);
        const cai = e01(t, tm + 0.4, tm + 1.2);
        pets.forEach((q, j) => {
          if (fl.murcha) {
            q.rotation.x = ang + 1.4 * easeInOut(um);
            q.position.y = -0.06 * cai * cai * (0.7 + 0.3 * ((j * 37) % 5) / 5);
            q.scale.setScalar(1 - 0.5 * cai);
            q.visible = cai < 0.98;
            const m = (q.children[0] as THREE.Mesh)?.material as THREE.MeshToonMaterial;
            if (m && m.color) {
              m.userData.c0 ??= m.color.clone();
              m.color.copy(m.userData.c0).lerp(marrom, um * 0.8);
            }
          } else q.rotation.x = ang;
        });
        if (!fl.murcha) {
          const ufr = easeOut(e01(t, ws(66), ws(68) + 0.3));
          fl.fruto.visible = ufr > 0.01;
          fl.fruto.scale.setScalar(0.3 + 1.6 * ufr);
          fl.fruto.position.y = 0.004 + 0.004 * ufr;
        }
      }
    };
    return { g, cam: { pos: V(0, 0.06, 0.3), alvo: V(0, 0, 0), fov: 30 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 0.6, alvo: V(0, 0, 0) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 6 · maracujazeiro: mamangava some, pincel à mão
  p_mara() {
    const k = this.k;
    const g = new THREE.Group();
    const Y0 = -1.24;
    this.mesa(g, Y0, 30, "massa", "#f1dfb0");
    const b1 = banca(k, { toldo: ["#ffcf3a", "#ffffff"], saia: "#3fae6a", placa: "MARACUJÁ" });
    b1.position.set(0.1, Y0, -1.15);
    g.add(b1);
    for (const x of [-0.38, 0, 0.38]) {
      const cx = caixote(k);
      cx.position.set(x, b1.userData.topo, 0.02);
      b1.add(cx);
    }
    const rm = ramoMaracuja(k);
    rm.position.set(0.0, -0.02, -0.03);
    g.add(rm);
    const F1 = V(-0.06, 0.0, 0.0), F2 = V(0.1, 0.012, -0.035);
    const f1 = florMaracuja(k), f2 = florMaracuja(k);
    f1.position.copy(F1);
    apontaY(f1, V(0.1, 0.75, 0.65));
    f2.position.copy(F2);
    apontaY(f2, V(-0.15, 0.75, 0.6));
    g.add(f1, f2);
    const mam = mamangava(k);
    g.add(mam);
    const fa = faiscas(24, "#ffe27a", 0.0028);
    g.add(fa);
    g.updateWorldMatrix(true, true);
    const ant = (f: THREE.Object3D, i: number) => (f.userData.anteras as THREE.Object3D[])[i].getWorldPosition(V(0, 0, 0));
    const A1 = ant(f1, 1), A2 = ant(f2, 4);
    const mao = new Mao(k, "R").addTo(g);
    const pin = this.seguraPincel(mao, A1, V(-0.6, -0.3, -0.72).normalize(), V(0.3, 1, 0.35));
    g.add(pin);
    this.bracoPara(mao, A1.clone().add(V(0.42, -0.12, 0.38)));
    mao.raiz.attach(pin);
    mao.raiz.attach(mao.braco);
    const W1 = mao.raiz.position.clone();
    const tMam = ws(77) + 0.25;
    const anima = (t: number) => {
      // mamangava pairando na flor 1 e sumindo
      const mp = F1.clone().add(V(-0.03 + 0.004 * Math.sin(t * 5), 0.035 + 0.003 * Math.sin(t * 7), 0.03));
      const u = e01(t, tMam, tMam + 0.14);
      const s = t < tMam ? 1 : u < 0.4 ? 1 + u * 0.6 : Math.max(0, 1.24 * (1 - (u - 0.4) / 0.6));
      mam.position.copy(mp);
      mam.lookAt(F1.clone().add(V(0, 0.02, 0)));
      mam.scale.setScalar(1.5 * 1.4 * s);
      mam.visible = s > 0.001 && t < 34.12;
      bateAsas(mam, t);
      animaFaiscas(fa, mp, t - tMam, 0.04);
      // flor 1 não vinga: pétalas caem um pouco
      const nv = easeInOut(e01(t, ws(81), ws(81) + 0.5)) * (1 - e01(t, 34.0, 34.12));
      (f1.userData.petalas as THREE.Group[]).forEach((q, j) => (q.rotation.x = 1.38 - (j % 2) * 0.08 + 0.45 * nv));
      // mão com o pincel: entra, poliniza, vai para a próxima flor
      mao.raiz.visible = mao.braco.visible = t >= 34.12;
      const ent = easeOut(e01(t, 34.12, 34.55));
      const passa = easeInOut(e01(t, ws(92) - 0.1, ws(94)));
      const W = W1.clone().add(A2.clone().sub(A1).multiplyScalar(passa));
      W.y += Math.sin(passa * Math.PI) * 0.03;
      W.add(V(0.08, -0.03, 0.06).multiplyScalar(1 - ent));
      // pinceladas curtas na antera
      W.add(V(Math.sin(t * 9) * 0.003, Math.sin(t * 13) * 0.0015, 0).multiplyScalar(t > 34.6 ? 1 : 0));
      mao.raiz.position.copy(W);
    };
    return { g, cam: { pos: V(0, 0.2, 0.4), alvo: V(0, 0, 0), fov: 40 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 1.3, alvo: V(0, -0.3, -0.4) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 7 · ração: soja que vira comida de frango e porco
  p_racao() {
    const k = this.k;
    const g = new THREE.Group();
    this.mesa(g, 0, 6, "massa", "#bfe39a");
    const mad = k.mat({ color: "#b07a48", rough: 0.8 });
    // cocho
    k.m(new THREE.BoxGeometry(0.42, 0.012, 0.11), mad, 2.5, g, [0.04, 0.03, 0]);
    for (const s of [-1, 1]) {
      k.m(new THREE.BoxGeometry(0.42, 0.05, 0.012), mad, 2.5, g, [0.04, 0.05, s * 0.055]);
      k.m(new THREE.BoxGeometry(0.012, 0.05, 0.11), mad, 2.5, g, [0.04 + s * 0.205, 0.05, 0]);
      k.m(new THREE.BoxGeometry(0.02, 0.03, 0.1), mad, 2, g, [0.04 + s * 0.17, 0.012, 0]);
    }
    // grãos de soja (instanciados)
    const n = 260;
    const grao = new THREE.InstancedMesh(esfera(0.0065, 10, 8), k.mat({ color: "#f0d060", rough: 0.6 }), n);
    const rr = rng(17);
    const m4 = new THREE.Matrix4();
    const base: THREE.Matrix4[] = [];
    for (let i = 0; i < n; i++) {
      const x = 0.04 + (rr() - 0.5) * 0.38, z = (rr() - 0.5) * 0.085;
      const h = 0.04 + 0.022 * (1 - Math.abs(x - 0.04) / 0.2) * rr();
      m4.compose(V(x, h, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, 0)), V(1, 0.8, 1));
      grao.setMatrixAt(i, m4);
      base.push(m4.clone());
    }
    grao.castShadow = grao.receiveShadow = true;
    k.contorno(grao, 1.2);
    g.add(grao);
    // saco de ração
    const saco = new THREE.Group();
    saco.position.set(-0.25, 0, 0.02);
    saco.rotation.set(0, 0.6, 0.15);
    g.add(saco);
    const sg = esfera(1, 32, 20);
    k.m(sg, k.mat({ color: "#e8d3a0", rough: 0.9 }), 3, saco, [0, 0.13, 0], undefined, [0.1, 0.14, 0.065]);
    const rot = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), k.mat({ map: texPlaca("RAÇÃO", "#3a7a3a"), rough: 0.9, semContorno: true }));
    rot.position.set(0, 0.13, 0.066);
    saco.add(rot);
    const gal = galinha(k);
    gal.position.set(-0.02, 0, -0.12);
    gal.rotation.y = 0;
    g.add(gal);
    const por = porquinho(k);
    por.position.set(0.16, 0, -0.14);
    por.rotation.y = -0.2;
    g.add(por);
    const anima = (t: number) => {
      // bicadas e focinhadas
      gal.rotation.x = 0.25 * Math.max(0, Math.sin(t * 7));
      por.rotation.x = 0.12 * Math.max(0, Math.sin(t * 4 + 1));
      // "também": metade dos grãos some
      const t0 = ws(119);
      for (let i = 0; i < n; i++) {
        const ti = t0 + (i % 2 ? 9 : (i * 7) % 13 / 13) * 0.6;
        const u = i % 2 ? 0 : e01(t, ti, ti + 0.2);
        const s = u < 0.35 ? 1 + u * 0.6 : 1.2 * (1 - (u - 0.35) / 0.65);
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
        base[i].decompose(p, q, e);
        m4.compose(p, q, e.multiplyScalar(Math.max(0.0001, s)));
        grao.setMatrixAt(i, m4);
      }
      grao.instanceMatrix.needsUpdate = true;
    };
    return { g, cam: { pos: V(0, 0.3, 0.6), alvo: V(0, 0.07, 0), fov: 34 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 0.5, alvo: V(0, 0, 0) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 8 · mapa do Brasil com a pilha de moedas
  p_mapa() {
    const k = this.k;
    const g = new THREE.Group();
    this.mesa(g, 0, 4, "massa", "#e9b26a");
    const s = 0.0115;
    const pts = BRASIL.map(([lo, la]) => new THREE.Vector2((lo + 52) * s, (la + 14) * s));
    const sh = new THREE.Shape(pts);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    k.m(geo, k.mat({ color: "#3fae5a", rough: 0.6 }), 3, g);
    const moeda = cil(0.028, 0.028, 0.0075, 32);
    const ouro = k.mat({ color: "#ffc61a", rough: 0.3 });
    const moedas: THREE.Mesh[] = [];
    const rr = rng(4);
    const NM = 15;
    for (let i = 0; i < NM; i++) {
      const m = k.m(moeda, ouro, 2.2, g);
      m.userData.alvo = V(0.012 + (rr() - 0.5) * 0.004, 0.026 + i * 0.0078, 0.01 + (rr() - 0.5) * 0.004);
      m.userData.rot = (rr() - 0.5) * 0.2;
      moedas.push(m);
    }
    // segunda pilha menor e maços de notas
    const nota = k.mat({ color: "#7fd18a", rough: 0.7 });
    const macos: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const m = k.m(new THREE.BoxGeometry(0.075, 0.012, 0.038), nota, 2, g);
      m.userData.alvo = V(-0.06, 0.028 + i * 0.013, 0.05 + i * 0.002);
      macos.push(m);
    }
    const t0 = ws(121), dt = (ws(126) - 0.15 - t0) / NM;
    const anima = (t: number) => {
      moedas.forEach((m, i) => {
        const ti = t0 + i * dt;
        const u = e01(t, ti, ti + 0.18);
        const a = m.userData.alvo as THREE.Vector3;
        m.visible = t >= ti;
        m.position.copy(a).add(V(0, 0.25 * (1 - u) * (1 - u), 0));
        const q = e01(t, ti + 0.18, ti + 0.32);
        m.scale.set(1 + 0.15 * Math.sin(q * Math.PI), 1 - 0.3 * Math.sin(q * Math.PI), 1 + 0.15 * Math.sin(q * Math.PI));
        m.rotation.set(0, m.userData.rot + (1 - u) * 3, 0);
      });
      macos.forEach((m, i) => {
        const ti = t0 + 0.5 + i * 0.25;
        const u = easeOut(e01(t, ti, ti + 0.25));
        m.visible = t >= ti;
        m.position.copy(m.userData.alvo).add(V(0, 0.15 * (1 - u), 0));
      });
    };
    return { g, cam: { pos: V(0, 0.6, 0.6), alvo: V(0, 0.07, 0), fov: 34 }, ceu: ["#ffe6a8", "#ffd27a"], sol: { dir: V(-1, 1.6, 1.0), ext: 0.5, alvo: V(0, 0, 0) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 9 · arroz, milho e trigo ao vento
  p_trigo() {
    const k = this.k;
    const g = new THREE.Group();
    this.mesa(g, 0, 30, "massa", "#a5d46a");
    const rr = rng(8);
    // trigo (instanciado): caule + espiga
    const NT = 420;
    const caule = new THREE.CylinderGeometry(0.0035, 0.005, 1, 6);
    caule.translate(0, 0.5, 0);
    const espigaG = esfera(1, 12, 10);
    const cauleM = new THREE.InstancedMesh(caule, k.mat({ color: "#e8c25a", rough: 0.8 }), NT);
    const espM = new THREE.InstancedMesh(espigaG, k.mat({ color: "#f2b632", rough: 0.8 }), NT);
    const trigo: { x: number; z: number; h: number; f: number }[] = [];
    for (let i = 0; i < NT; i++) trigo.push({ x: 0.6 + rr() * 1.6, z: -1.2 + rr() * 1.4, h: 0.62 + rr() * 0.18, f: rr() * 6 });
    k.contorno(cauleM, 1.2);
    k.contorno(espM, 1.6);
    cauleM.castShadow = espM.castShadow = true;
    g.add(cauleM, espM);
    // milho (grupos)
    const milhos: THREE.Group[] = [];
    const verde = k.mat({ color: "#4fae3a", rough: 0.7 });
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Group();
      m.position.set(-0.45 + rr() * 0.9, 0, -1.0 + rr() * 1.1);
      k.m(cil(0.008, 0.012, 1.1, 8), verde, 2, m, [0, 0.55, 0]);
      for (let j = 0; j < 4; j++) {
        const f = folha(k, 0.32, "#4fae3a");
        f.position.set(0, 0.25 + j * 0.2, 0);
        apontaY(f, V(Math.cos(j * 2.3), 0.5, Math.sin(j * 2.3)));
        m.add(f);
      }
      k.m(esfera(1, 14, 10), k.mat({ color: "#ffd23a", rough: 0.6 }), 2, m, [0.03, 0.6, 0], [0, 0, -0.3], [0.022, 0.07, 0.022]);
      k.m(esfera(1, 14, 10), verde, 2, m, [0.032, 0.57, 0.004], [0, 0, -0.3], [0.024, 0.06, 0.02]);
      g.add(m);
      milhos.push(m);
    }
    // arroz (touceiras instanciadas)
    const NA = 70 * 7;
    const folhaA = new THREE.ConeGeometry(0.006, 1, 4);
    folhaA.translate(0, 0.5, 0);
    const arrozM = new THREE.InstancedMesh(folhaA, k.mat({ color: "#7cc94a", rough: 0.7 }), NA);
    const arroz: { x: number; z: number; h: number; ax: number; az: number }[] = [];
    for (let i = 0; i < 70; i++) {
      const x = -2.0 + rr() * 1.3, z = -1.0 + rr() * 1.2;
      for (let j = 0; j < 7; j++) arroz.push({ x, z, h: 0.28 + rr() * 0.12, ax: (rr() - 0.5) * 0.6, az: (rr() - 0.5) * 0.6 });
    }
    k.contorno(arrozM, 1);
    arrozM.castShadow = true;
    g.add(arrozM);
    // água rasa do arrozal
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), k.mat({ color: "#8fd3ff", semContorno: true, rough: 0.2 }));
    agua.rotation.x = -Math.PI / 2;
    agua.position.set(-1.35, 0.003, -0.3);
    g.add(agua);
    // linhas de vento
    const ventoM = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.0, depthWrite: false });
    const ventos: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const pts: V3[] = [];
      for (let j = 0; j < 12; j++) pts.push([j * 0.06, Math.sin(j * 0.7 + i) * 0.03, 0]);
      const m = new THREE.Mesh(tubo(pts, (u) => 0.004 * Math.sin(u * Math.PI), 30, 6), ventoM);
      m.position.set(0, 0.7 + (i % 3) * 0.12, -0.6 + i * 0.12);
      g.add(m);
      ventos.push(m);
    }
    const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), e = new THREE.Euler();
    const anima = (t: number) => {
      const forte = 0.25 + 0.75 * smooth(54.2, 54.8, t);
      const vento = (x: number, f: number) => (0.06 + 0.12 * forte) * Math.sin(t * 3.2 - x * 3 + f) + 0.08 * forte;
      trigo.forEach((p, i) => {
        const a = vento(p.x, p.f * 0.3);
        e.set(0, 0, -a);
        q.setFromEuler(e);
        m4.compose(V(p.x, 0, p.z), q, V(1, p.h, 1));
        cauleM.setMatrixAt(i, m4);
        const tip = V(0, p.h, 0).applyQuaternion(q).add(V(p.x, 0, p.z));
        m4.compose(tip, q, V(0.009, 0.035, 0.009));
        espM.setMatrixAt(i, m4);
      });
      cauleM.instanceMatrix.needsUpdate = espM.instanceMatrix.needsUpdate = true;
      milhos.forEach((m, i) => (m.rotation.z = -vento(m.position.x, i) * 0.4));
      arroz.forEach((p, i) => {
        const a = vento(p.x, i * 0.01) * 0.6;
        e.set(p.ax, 0, p.az - a);
        q.setFromEuler(e);
        m4.compose(V(p.x, 0, p.z), q, V(1, p.h, 1));
        arrozM.setMatrixAt(i, m4);
      });
      arrozM.instanceMatrix.needsUpdate = true;
      ventos.forEach((v, i) => {
        const u = ((t - 54.2) * 0.45 + i * 0.13) % 1;
        v.position.x = 0.2 + u * 2.2;
        ventoM.opacity = 0.75 * smooth(54.2, 54.6, t);
        v.visible = t > 54.2;
      });
    };
    return { g, cam: { pos: V(0, 0.5, 1.3), alvo: V(0, 0.4, 0), fov: 38 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.4, 1.0), ext: 2, alvo: V(0, 0.3, -0.3) }, obj: { anima } };
  }

  // ------------------------------------------------------------ 10 · prato: metade sem cor
  p_prato() {
    const c = super.p_prato();
    const anima = (t: number) => {
      const u = easeInOut(e01(t, ws(164) - 0.05, we(166) + 0.1));
      this.final.uniforms.corte.value = t < ws(164) - 0.05 ? -1 : lerp(1.02, 0.5, u);
    };
    c.obj = { anima };
    return c;
  }

  // ------------------------------------------------------------ 11 · virada: o ramo vira arame
  p_virada() {
    const k = this.k;
    const g = new THREE.Group();
    const solido = ramoLaranjeira(k);
    const arame = ramoLaranjeira(k);
    g.add(solido, arame);
    const pS = new THREE.Plane(V(0, 1, 0), 0), pA = new THREE.Plane(V(0, -1, 0), 0);
    const wm = new THREE.MeshBasicMaterial({ color: "#FF6B2C", wireframe: true, transparent: true, opacity: 0.9, clippingPlanes: [pA] });
    arame.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (o.userData.contorno) o.visible = false;
      else m.material = wm;
      m.castShadow = false;
    });
    solido.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mt of mats) mt.clippingPlanes = [pS];
    });
    // linha de varredura
    const linha = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.5, 64), new THREE.MeshBasicMaterial({ color: "#ffb36b", transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    linha.rotation.x = -Math.PI / 2;
    linha.scale.set(1, 1, 1);
    g.add(linha);
    const fundoTinta = new THREE.Color("#0B1026");
    const anima = (t: number) => {
      // congela, depois a varredura sobe e o ramo vira arame
      const u = easeInOut(e01(t, ws(176) - 0.1, ws(181) + 0.2));
      const h = lerp(-0.32, 0.09, u);
      pS.constant = -h;
      pA.constant = h;
      solido.visible = u < 0.999;
      arame.visible = u > 0.001;
      linha.position.y = h;
      (linha.material as THREE.MeshBasicMaterial).opacity = u > 0 && u < 1 ? 0.22 : 0;
      const nav = smooth(ws(178), ws(181) + 0.4, t);
      const fm = this.fundo.material as THREE.MeshBasicMaterial;
      fm.color.setRGB(1, 1, 1).lerp(fundoTinta.clone().multiplyScalar(4.2), nav);
      this.part.visible = nav > 0.05;
      (this.part.material as THREE.PointsMaterial).opacity = 0.85 * nav;
      this.part.position.set(0.04, 0.05, 0);
      this.part.rotation.y = t * 0.12;
      this.renderer.shadowMap.enabled = nav < 0.5;
      this.hemi.intensity = 1.5 * (1 - nav);
      this.sol.intensity = 2.6 * (1 - nav);
    };
    return { g, cam: { pos: V(0, 0, 1), alvo: V(0, 0, 0), fov: 30 }, ceu: ["#58b8ff", "#a8deff", "#fff1c4"], sol: { dir: V(-1, 1.6, 1.2), ext: 0.25, alvo: V(0, 0, 0) }, obj: { anima } };
  }

  // reaplica a luz padrão ao trocar de cenário (a virada mexe nela)
  mostra(p: string, t: number) {
    super.mostra(p, t);
    if (p !== "virada") {
      this.hemi.intensity = 1.5;
      this.sol.intensity = 2.6;
      (this.fundo.material as THREE.MeshBasicMaterial).color.setRGB(1, 1, 1);
      this.renderer.shadowMap.enabled = true;
      this.part.visible = false;
    }
    if (p !== "prato") this.final.uniforms.corte.value = -1;
  }
}

// ---------------------------------------------------------------- utilidades
function faiscas(n: number, cor: string, tam: number) {
  const geo = new THREE.BufferGeometry();
  const r = rng(n * 13 + 1);
  const dir: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = V(r() - 0.5, r() - 0.3, r() - 0.5).normalize().multiplyScalar(0.5 + r() * 0.5);
    dir.push(v.x, v.y, v.z);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Array(n * 3).fill(0), 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: cor, size: tam, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.userData.dir = dir;
  p.frustumCulled = false;
  return p;
}
function animaFaiscas(p: THREE.Points, c: THREE.Vector3, dt: number, raio: number) {
  const m = p.material as THREE.PointsMaterial;
  if (dt < 0 || dt > 0.7) {
    m.opacity = 0;
    return;
  }
  const u = easeOut(dt / 0.7);
  const pos = p.geometry.attributes.position as THREE.BufferAttribute;
  const d = p.userData.dir as number[];
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, c.x + d[i * 3] * raio * u, c.y + d[i * 3 + 1] * raio * u - 0.2 * raio * u * u, c.z + d[i * 3 + 2] * raio * u);
  pos.needsUpdate = true;
  m.opacity = 1 - u;
}

function espiga(k: Kit) {
  const g = new THREE.Group();
  k.m(esfera(1, 14, 10), k.mat({ color: "#ffd23a", rough: 0.6 }), 2, g, [0, 0, 0], [0, 0, Math.PI / 2], [0.022, 0.07, 0.022]);
  k.m(esfera(1, 14, 10), k.mat({ color: "#7cc94a", rough: 0.7 }), 2, g, [0.03, 0, 0.005], [0, 0, Math.PI / 2], [0.02, 0.05, 0.02]);
  return g;
}

// contorno simplificado do Brasil (longitude, latitude)
const BRASIL: [number, number][] = [
  [-60.0, 5.2], [-59.8, 2.5], [-56.5, 1.9], [-54.0, 2.2], [-51.6, 4.2], [-50.0, 1.8], [-49.3, -0.2], [-48.4, -1.0], [-47.0, -0.7],
  [-44.5, -2.5], [-41.8, -2.9], [-38.5, -3.7], [-35.2, -5.4], [-34.8, -7.2], [-35.1, -9.0], [-37.0, -11.0], [-38.6, -13.0],
  [-39.0, -15.5], [-39.3, -18.0], [-40.3, -20.3], [-41.0, -22.0], [-43.2, -23.0], [-45.5, -23.8], [-48.0, -25.5], [-48.6, -27.5],
  [-49.5, -29.0], [-51.0, -31.0], [-53.4, -33.7], [-55.5, -31.0], [-57.6, -30.2], [-55.8, -28.0], [-54.6, -25.6], [-54.3, -24.0],
  [-55.6, -22.5], [-57.8, -22.1], [-58.2, -20.0], [-57.6, -17.5], [-58.4, -16.3], [-60.2, -15.1], [-60.5, -13.7], [-62.2, -13.0],
  [-65.0, -11.8], [-65.3, -10.0], [-66.6, -9.9], [-70.5, -11.0], [-73.0, -9.4], [-73.9, -7.4], [-72.9, -5.2], [-70.0, -4.3],
  [-69.4, -1.1], [-69.8, 1.0], [-67.0, 1.9], [-66.9, 1.2], [-64.0, 2.0], [-63.4, 3.9], [-61.0, 4.5],
];
void cil;
void laranja;

let _halo: THREE.Texture | null = null;
function TEX_HALO() {
  if (_halo) return _halo;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,240,160,0.7)");
  gr.addColorStop(1, "rgba(255,220,100,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  _halo = new THREE.CanvasTexture(c);
  return _halo;
}

const _selos: Record<string, THREE.Texture> = {};
function TEX_SELO(tipo: "flor" | "vento") {
  if (_selos[tipo]) return _selos[tipo];
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1a0f0c";
  g.beginPath();
  g.arc(128, 128, 122, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = tipo === "flor" ? "#FF6B2C" : "#9a9aa2";
  g.beginPath();
  g.arc(128, 128, 104, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  if (tipo === "flor") {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.arc(128 + 38 * Math.cos(a), 128 + 38 * Math.sin(a), 30, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#ffd23a";
    g.beginPath();
    g.arc(128, 128, 24, 0, Math.PI * 2);
    g.fill();
  } else {
    g.lineWidth = 14;
    g.lineCap = "round";
    for (const [y, w] of [[96, 120], [130, 150], [164, 90]]) {
      g.beginPath();
      g.moveTo(58, y);
      g.lineTo(58 + w, y);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _selos[tipo] = t;
  return t;
}
