// Mundo 3D do reel "Os EUA pararam todos os voos". O estado é função pura do tempo.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Dir, Kit, montaMundo } from "./kit";
import { CENTROS, CIDADES, ESTADOS, USA, VIZ, dentro, ligacoes, ll, Anel } from "./geo";
import { rng } from "./rng";
import { desenhaCartao, desenhaTelaChat, texCartao, texEtiqueta, texHalo, texMadeira, texNuvem, texTelaChat, texTrilha, texCeuToon } from "./tex";

export type Cena = "gancho" | "centros" | "disquete" | "celular" | "virada";
export type Estado = {
  cena: Cena;
  apaga?: number; // 0..1 fração dos aviões de solo apagados (gancho)
  vermelho?: number; // 0..1 aviões de solo em vermelho
  caidos?: number; // 0..20 centros caídos
  rede?: number; // 0..1 rede acesa
  insere?: number; // 0..1 disquete entrando
  envio?: number; // 0..1 vídeo chegando no celular
  carimbo?: number; // 0..1 carimbo no cartão
  tFix?: number;
  // produção (direção C)
  cam?: { pos: [number, number, number]; alvo: [number, number, number]; fov?: number; foco?: number; forca?: number };
  tv?: number; // relógio dos voos (s)
  brilho?: number; // multiplicador geral dos pontos
  soloBrilho?: number; // multiplicador dos aviões em solo
  frio?: number; // 0..1 tons frios (2001)
  vazio?: number; // 0..1 aviões em voo que já desceram (2001)
  ia?: number; // 0..1 rede da IA nova
  radar?: number; // 0..1 radar visível
  radarAng?: number;
  americas?: number; // 0..1 América do Sul
  rota?: number; // 0..1 rota São Paulo -> EUA
  arame?: number; // 0..1 virada
  nuvem?: number; // opacidade das nuvens
  objetos?: boolean; // disquete e celular visíveis
};

const AMARELO = new THREE.Color("#F5D27A");
const VERMELHO = new THREE.Color("#E5322D");
const LARANJA = new THREE.Color("#FF6B2C");
const TOPO = 0.24; // altura do topo dos estados (A/B)

type Rota = { ax: number; az: number; cx: number; cz: number; bx: number; bz: number; L: number; u0: number };
type Aviao = { x: number; z: number; y: number; rot: number; solo: boolean; ordem: number; s: number; vx: number; vz: number; r?: Rota };

function forma(r: Anel) {
  const s = new THREE.Shape();
  r.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}
function deitado(g: THREE.BufferGeometry, y = 0) {
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}
function retArred(w: number, h: number, r: number, chanfro = 0) {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  if (chanfro > 0) {
    s.lineTo(x0 + w, y0 + h - chanfro);
    s.lineTo(x0 + w - chanfro, y0 + h);
  } else {
    s.lineTo(x0 + w, y0 + h - r);
    s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  }
  s.lineTo(x0 + r, y0 + h);
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/** aviãozinho de brinquedo (frente = +X) */
function geoAviao() {
  const fus = new THREE.CapsuleGeometry(0.03, 0.17, 4, 12);
  fus.rotateZ(Math.PI / 2);
  const asa = new THREE.BoxGeometry(0.07, 0.014, 0.27);
  asa.translate(0.01, -0.004, 0);
  const prof = new THREE.BoxGeometry(0.04, 0.01, 0.11);
  prof.translate(-0.095, 0.006, 0);
  const lem = new THREE.BoxGeometry(0.05, 0.065, 0.012);
  lem.translate(-0.1, 0.04, 0);
  const mot1 = new THREE.CylinderGeometry(0.013, 0.013, 0.04, 10);
  mot1.rotateZ(Math.PI / 2);
  const mot2 = mot1.clone();
  mot1.translate(0.02, -0.022, 0.07);
  mot2.translate(0.02, -0.022, -0.07);
  const g = mergeGeometries([fus, asa, prof, lem, mot1, mot2].map((x) => x.toNonIndexed()));
  g.computeVertexNormals();
  return g;
}
/** setinha plana para os pontos de avião da direção C (frente = +X) */
function geoSeta() {
  const s = new THREE.Shape();
  s.moveTo(0.05, 0);
  s.lineTo(-0.035, 0.032);
  s.lineTo(-0.018, 0);
  s.lineTo(-0.035, -0.032);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

export class Mundo {
  w: ReturnType<typeof montaMundo>;
  kit: Kit;
  avioes: Aviao[] = [];
  imAviao!: THREE.InstancedMesh;
  imHaste?: THREE.InstancedMesh;
  imTrilha?: THREE.InstancedMesh;
  base = new THREE.Group(); // mesa, tabuleiro, aviões, torres
  mapa = new THREE.Group();
  torres: { g: THREE.Group; luz: THREE.Mesh; luzMat: THREE.Material; cab?: THREE.Mesh; halo?: THREE.Sprite }[] = [];
  fios: { mesh: THREE.Mesh; mat: THREE.Material; a: number; b: number }[] = [];
  ordemCentros: number[] = [];
  disq = new THREE.Group();
  disco = new THREE.Group();
  cel = new THREE.Group();
  telaMat!: THREE.MeshBasicMaterial;
  cartaoMat!: THREE.Material;
  arame = new THREE.Group();
  nuvens: THREE.Mesh[] = [];
  fundo: THREE.Color;
  foco = 0.5;
  t = 0;
  cor = new THREE.Color();

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number) {
    this.w = montaMundo(canvas, dir, W, H);
    this.kit = new Kit(dir, W, H);
    const { scene } = this.w;
    this.fundo = new THREE.Color(dir === "A" ? "#2b1d14" : dir === "B" ? "#8fd0ff" : "#050608");
    scene.background = this.fundo.clone();
    if (dir === "B") scene.background = texCeuToon();
    if (dir === "C") scene.fog = new THREE.Fog("#050608", 24, 60);
    scene.add(this.base, this.disq, this.cel, this.arame);
    this.base.add(this.mapa);
    this.montaMesa();
    if (dir === "C") this.montaMapaNoturno();
    else this.montaTabuleiro();
    this.montaAvioes();
    this.montaTorres();
    this.montaDisquete();
    this.montaCelular();
    this.montaArame();
    if (dir === "C") {
      this.montaNuvens();
      this.montaIA();
      this.montaRadar();
      this.montaAmericas();
    }
  }

  // ------------------------------------------------------------------ mesa
  montaMesa() {
    const k = this.kit;
    let mat: THREE.Material;
    if (this.dir === "A") {
      const t = texMadeira();
      t.repeat.set(5, 5);
      mat = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, color: 0xd8c2ae });
    } else if (this.dir === "B") mat = k.mat({ color: "#f3cf98", semContorno: true });
    else mat = new THREE.MeshStandardMaterial({ color: "#010101", roughness: 0.75, envMapIntensity: 0.0 });
    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat);
    mesa.rotation.x = -Math.PI / 2;
    mesa.receiveShadow = true;
    this.base.add(mesa);
  }

  // ------------------------------------------------------------------ tabuleiro de plástico (A/B)
  montaTabuleiro() {
    const k = this.kit, B = this.dir === "B";
    const R = rng(7);
    // bandeja (o "mar")
    const band = new THREE.ExtrudeGeometry(retArred(10.6, 7.0, 0.5), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 3 });
    deitado(band, 0);
    band.translate(-0.1, 0, -0.25);
    this.mapa.add(k.m(band, k.mat({ color: B ? "#43b0ea" : "#6f9db3", rough: 0.55 }), 3));
    // base do país (corte lateral em resina escura)
    const pal = B ? ["#8fd16a", "#b5e06b", "#f4d35e", "#6cc58a", "#a7d672", "#ffd56b"] : ["#d8c48f", "#b9cf8a", "#e2b47f", "#a9c58d", "#cfb987", "#e7cf94"];
    for (const r of USA) {
      const g = new THREE.ExtrudeGeometry(forma(r), { depth: 0.04, bevelEnabled: false });
      deitado(g, 0.12);
      this.mapa.add(k.m(g, k.mat({ color: B ? "#2f7d4a" : "#6b5a46", rough: 0.6 }), 2));
    }
    ESTADOS.forEach((r) => {
      const h = 0.06 + R.ab(0, 0.012);
      const g = new THREE.ExtrudeGeometry(forma(r), { depth: h, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelOffset: -0.024, bevelSegments: 2 });
      deitado(g, TOPO - h - 0.012);
      const me = k.m(g, k.mat({ color: R.pick(pal), rough: 0.5 }), 1.5);
      this.mapa.add(me);
    });
  }

  // ------------------------------------------------------------------ mapa noturno (C)
  montaMapaNoturno() {
    for (const r of USA) {
      const g = new THREE.ExtrudeGeometry(forma(r), { depth: 0.04, bevelEnabled: false });
      deitado(g, 0);
      const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#10131a", roughness: 0.85 }));
      me.receiveShadow = true;
      this.mapa.add(me);
    }
    const linhas = (aneis: Anel[], cor: string, y: number, op: number) => {
      const p: number[] = [];
      for (const r of aneis) for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        p.push(a[0], y, a[1], b[0], y, b[1]);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      const m = new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: op });
      this.mapa.add(new THREE.LineSegments(g, m));
    };
    linhas(ESTADOS, "#2a3140", 0.042, 0.8);
    linhas(USA, "#5a6476", 0.043, 1);
  }

  // ------------------------------------------------------------------ aviões
  montaAvioes() {
    const R = rng(21), C = this.dir === "C";
    const pesos = CIDADES.map((c) => c[2]), soma = pesos.reduce((a, b) => a + b, 0);
    const cidade = () => {
      let x = R.r() * soma;
      for (const c of CIDADES) { x -= c[2]; if (x <= 0) return c; }
      return CIDADES[0];
    };
    const voo = (y: number): Aviao => {
      let a = cidade(), b = cidade(), pa = ll(a[0], a[1]), pb = ll(b[0], b[1]);
      for (let i = 0; i < 20 && Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 1.6; i++) { b = cidade(); pb = ll(b[0], b[1]); }
      const u = R.ab(0.12, 0.88), dx = pb[0] - pa[0], dz = pb[1] - pa[1], L = Math.hypot(dx, dz) || 1;
      const cx = (pa[0] + pb[0]) / 2 - (dz / L) * 0.18 * L, cz = (pa[1] + pb[1]) / 2 + (dx / L) * 0.18 * L;
      const px = (1 - u) ** 2 * pa[0] + 2 * (1 - u) * u * cx + u * u * pb[0];
      const pz = (1 - u) ** 2 * pa[1] + 2 * (1 - u) * u * cz + u * u * pb[1];
      const tx = 2 * (1 - u) * (cx - pa[0]) + 2 * u * (pb[0] - cx), tz = 2 * (1 - u) * (cz - pa[1]) + 2 * u * (pb[1] - cz);
      const tl = Math.hypot(tx, tz) || 1;
      return { x: px, z: pz, y, rot: Math.atan2(-tz, tx), solo: false, ordem: R.r(), s: 1, vx: tx / tl, vz: tz / tl, r: { ax: pa[0], az: pa[1], cx, cz, bx: pb[0], bz: pb[1], L, u0: u } };
    };
    if (C) {
      for (let i = 0; i < 2900; i++) {
        const solo = R.r() < 0.58;
        if (solo) {
          const c = cidade(), p = ll(c[0], c[1]), sd = 0.05 + Math.sqrt(c[2]) * 0.055;
          const x = p[0] + R.gauss() * sd, z = p[1] + R.gauss() * sd;
          if (!dentro(x, z)) continue;
          this.avioes.push({ x, z, y: 0.05, rot: R.ab(0, 6.28), solo: true, ordem: Math.min(1, Math.max(0, ((4.6 - x) / 9.3) * 0.85 + R.r() * 0.15)), s: R.ab(0.75, 1.05), vx: 0, vz: 0 });
        } else {
          const a = voo(R.ab(0.09, 0.2));
          if (!dentro(a.x, a.z)) { if (R.r() < 0.7) continue; }
          a.s = R.ab(0.85, 1.1);
          this.avioes.push(a);
        }
      }
    } else {
      // pátios nos 14 aeroportos de mais tráfego
      const k = this.kit, B = this.dir === "B";
      const top = [...CIDADES].sort((a, b) => b[2] - a[2]).slice(0, 13);
      const geoPatio = new THREE.BoxGeometry(0.92, 0.025, 0.7);
      const matPatio = k.mat({ color: B ? "#c9c3d6" : "#bdb8ae", rough: 0.6 });
      const matPista = k.mat({ color: B ? "#4a4560" : "#5b5853", rough: 0.6, semContorno: true });
      for (const c of top) {
        const p = ll(c[0], c[1]), ang = R.ab(-0.5, 0.5);
        const patio = k.m(geoPatio, matPatio, 1.5);
        patio.position.set(p[0], TOPO + 0.012, p[1]);
        patio.rotation.y = ang;
        const pista = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.006, 0.09), matPista);
        pista.position.set(0, 0.015, -0.27);
        pista.receiveShadow = true;
        patio.add(pista);
        this.mapa.add(patio);
        const n = c[2] >= 8 ? 4 : c[2] >= 5 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const lx = (i % 2 === 0 ? -0.22 : 0.22) + (n === 3 && i === 2 ? 0.22 : 0), lz = i < 2 ? -0.06 : 0.22;
          const cs = Math.cos(ang), sn = Math.sin(ang);
          this.avioes.push({ x: p[0] + lx * cs + lz * sn, z: p[1] - lx * sn + lz * cs, y: TOPO + 0.075, rot: ang + Math.PI / 2 + R.ab(-0.12, 0.12), solo: true, ordem: R.r(), s: 1.45, vx: 0, vz: 0 });
        }
      }
      for (let i = 0; i < 60; i++) {
        const a = voo(B ? R.ab(0.85, 1.15) : R.ab(0.7, 1.0));
        if (!dentro(a.x, a.z)) continue;
        a.s = 1.45;
        this.avioes.push(a);
      }
    }
    const n = this.avioes.length;
    if (C) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
      this.imAviao = new THREE.InstancedMesh(geoSeta(), mat, n);
      const nv = this.avioes.filter((a) => !a.solo).length;
      const tm = new THREE.MeshBasicMaterial({ map: texTrilha(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const tg = new THREE.PlaneGeometry(1, 1);
      tg.rotateX(-Math.PI / 2);
      this.imTrilha = new THREE.InstancedMesh(tg, tm, nv);
      this.imTrilha.frustumCulled = false;
      this.mapa.add(this.imTrilha);
    } else {
      const k = this.kit;
      this.imAviao = new THREE.InstancedMesh(geoAviao(), k.mat({ color: 0xffffff, rough: 0.42, clear: 0.5 }), n);
      this.imAviao.castShadow = true;
      this.imAviao.receiveShadow = true;
      k.contorno(this.imAviao, 2);
      if (this.dir === "A") {
        const nv = this.avioes.filter((a) => !a.solo).length;
        const hm = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.08, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false });
        this.imHaste = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), hm, nv);
        this.imHaste.frustumCulled = false;
        this.mapa.add(this.imHaste);
      }
    }
    this.imAviao.frustumCulled = false;
    this.mapa.add(this.imAviao);
  }

  // ------------------------------------------------------------------ torres de controle e rede
  montaTorres() {
    const k = this.kit, C = this.dir === "C", B = this.dir === "B";
    const R = rng(33);
    this.ordemCentros = CENTROS.map((_, i) => i).sort(() => R.r() - 0.5);
    const halo = C ? texHalo() : null;
    CENTROS.forEach(([x, z]) => {
      const g = new THREE.Group();
      g.position.set(x, C ? 0.045 : TOPO, z);
      let luz: THREE.Mesh, luzMat: THREE.Material, cab: THREE.Mesh | undefined, hs: THREE.Sprite | undefined;
      if (C) {
        luzMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
        luz = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), luzMat);
        hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo!, color: 0xf2a23a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        hs.scale.set(0.55, 0.55, 1);
        g.add(luz, hs);
      } else {
        const S = 1.0;
        const fuste = k.m(new THREE.CylinderGeometry(0.028 * S, 0.042 * S, 0.36 * S, 12), k.mat({ color: B ? "#f2f2f2" : "#e9e3d6" }), 1.5);
        fuste.position.y = 0.18 * S;
        const basel = k.m(new THREE.CylinderGeometry(0.075, 0.085, 0.035, 14), k.mat({ color: B ? "#ff8a3d" : "#b9b1a2" }), 1.5);
        basel.position.y = 0.0175;
        cab = k.m(new THREE.CylinderGeometry(0.085 * S, 0.06 * S, 0.075 * S, 8), k.mat({ color: B ? "#3fd2e6" : "#5f8f9a", rough: 0.15, clear: 0.9, emis: "#000000" }), 1.5);
        cab.position.y = 0.4 * S;
        const teto = k.m(new THREE.CylinderGeometry(0.095 * S, 0.095 * S, 0.02, 8), k.mat({ color: B ? "#ffffff" : "#efe9dd" }), 1.5);
        teto.position.y = 0.448 * S;
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6), k.mat({ color: "#444", semContorno: true }));
        ant.position.y = 0.49 * S;
        luzMat = B ? k.mat({ color: "#7dff9a", emis: "#7dff9a", emisI: 0.6 }) : new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x9dffb0, emissiveIntensity: 3 });
        luz = k.m(new THREE.SphereGeometry(0.022, 12, 10), luzMat, 1.5);
        luz.position.y = 0.535 * S;
        g.add(fuste, basel, cab, teto, ant, luz);
      }
      this.mapa.add(g);
      this.torres.push({ g, luz, luzMat, cab, halo: hs });
    });
    // fios / linhas da rede
    for (const [a, b] of ligacoes()) {
      const pa = CENTROS[a], pb = CENTROS[b];
      const L = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
      const yA = C ? 0.05 : TOPO + 0.46;
      const ym = C ? 0.05 + 0.22 * L : yA - 0.1 * L;
      const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(pa[0], yA, pa[1]), new THREE.Vector3((pa[0] + pb[0]) / 2, ym, (pa[1] + pb[1]) / 2), new THREE.Vector3(pb[0], yA, pb[1]));
      const geo = new THREE.TubeGeometry(curva, 40, C ? 0.009 : B ? 0.014 : 0.011, 6, false);
      const mat = C || this.dir === "A" ? new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }) : k.mat({ color: "#ffd23f", semContorno: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !C;
      this.mapa.add(mesh);
      this.fios.push({ mesh, mat, a, b });
    }
  }

  // ------------------------------------------------------------------ disquete 3½" genérico, drive e bobina de cobre
  montaDisquete() {
    const k = this.kit, B = this.dir === "B", C = this.dir === "C";
    // drive (frente em z = 0, corpo para -z)
    const drive = new THREE.Group();
    const bege = B ? "#efe2c2" : C ? "#2a2d33" : "#d6ccb5";
    const corpo = k.m(new THREE.BoxGeometry(1.06, 0.27, 1.5), k.mat({ color: bege, rough: 0.55 }));
    corpo.position.set(0, 0.135, -0.75);
    const mold = k.m(new THREE.BoxGeometry(1.1, 0.31, 0.05), k.mat({ color: B ? "#e3d3ad" : C ? "#1f2227" : "#cbc0a6", rough: 0.5 }));
    mold.position.set(0, 0.155, 0.02);
    const fenda = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.05, 0.06), new THREE.MeshBasicMaterial({ color: "#0b0b0c" }));
    fenda.position.set(0, 0.17, 0.03);
    const botao = k.m(new THREE.BoxGeometry(0.14, 0.05, 0.03), k.mat({ color: B ? "#b8a98a" : C ? "#3a3e46" : "#bdb196" }), 1.5);
    botao.position.set(0.36, 0.07, 0.055);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color("#4dff7c").multiplyScalar(2.5) }));
    led.position.set(-0.38, 0.07, 0.05);
    drive.add(corpo, mold, fenda, botao, led);
    drive.position.set(0, 0, 0);
    this.disq.add(drive);
    // disquete (deitado; borda do obturador para -z, que entra no drive)
    const d = this.disco;
    const W = 0.9, D = 0.94, E = 0.034;
    const sh = retArred(W, D, 0.03, 0.045);
    const gc = new THREE.ExtrudeGeometry(sh, { depth: E, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    deitado(gc, 0);
    gc.rotateY(Math.PI);
    const corDisco = B ? "#2f5fd0" : C ? "#34425e" : "#2d3a4f";
    d.add(k.m(gc, k.mat({ color: corDisco, rough: 0.42, clear: 0.35 }), 2));
    // obturador de metal na borda de entrada
    const metal = k.mat({ color: B ? "#d5dbe3" : "#c9ced6", metal: B ? 0 : 1, rough: 0.28 });
    const obt = k.m(new THREE.BoxGeometry(0.4, 0.006, 0.34), metal, 1.5);
    obt.position.set(0.04, E + 0.006, -D / 2 + 0.17);
    const jan = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.2), new THREE.MeshStandardMaterial({ color: "#5a4a32", roughness: 0.4, metalness: 0.2 }));
    jan.position.set(0.04, E + 0.0105, -D / 2 + 0.16);
    // etiqueta em branco, sem marca
    const et = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.44), k.mat({ map: texEtiqueta(), rough: 0.8, semContorno: true, semBump: true }));
    et.rotation.x = -Math.PI / 2;
    et.position.set(0, E + 0.0045, D / 2 - 0.27);
    et.receiveShadow = true;
    // trava de proteção
    const trava = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.06), new THREE.MeshBasicMaterial({ color: "#0d0d0f" }));
    trava.position.set(-0.36, E + 0.003, D / 2 - 0.08);
    d.add(obt, jan, et, trava);
    this.disq.add(d);
    // bobina de cobre (carretel em pé) e fio solto até o drive
    const cobre = k.mat({ color: B ? "#e07a3a" : "#c8743a", metal: B ? 0 : 1, rough: 0.27, clear: 0.6 });
    const carretel = new THREE.Group();
    const nucleo = k.m(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 24), k.mat({ color: B ? "#ffd23f" : C ? "#30343c" : "#e2d6bc" }), 2);
    nucleo.position.y = 0.23;
    const aba1 = k.m(new THREE.CylinderGeometry(0.26, 0.26, 0.025, 32), k.mat({ color: B ? "#ff5a5f" : C ? "#23262d" : "#cfc3a6" }), 2);
    aba1.position.y = 0.0125;
    const aba2 = aba1.clone();
    aba2.position.y = 0.4475;
    const pts: THREE.Vector3[] = [];
    const voltas = 11;
    for (let i = 0; i <= voltas * 40; i++) {
      const a = (i / 40) * Math.PI * 2, y = 0.05 + (i / (voltas * 40)) * 0.36;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.15, y, Math.sin(a) * 0.15));
    }
    const hel = k.m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), voltas * 40, B ? 0.017 : 0.0135, 8, false), cobre, 1.2);
    carretel.add(nucleo, aba1, aba2, hel);
    carretel.position.set(1.05, 0, 0.55);
    this.disq.add(carretel);
    const solto = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.2, 0.41, 0.55), new THREE.Vector3(1.3, 0.25, 0.25), new THREE.Vector3(1.0, 0.015, -0.1),
      new THREE.Vector3(0.75, 0.015, -0.6), new THREE.Vector3(0.52, 0.08, -1.2),
    ]);
    this.disq.add(k.m(new THREE.TubeGeometry(solto, 80, B ? 0.017 : 0.0135, 8, false), cobre, 1.2));
    this.disq.position.set(2.2, 0, 5.0);
    this.disq.rotation.y = -0.25;
  }

  // ------------------------------------------------------------------ celular e cartão de embarque
  montaCelular() {
    const k = this.kit, B = this.dir === "B", C = this.dir === "C";
    const fone = new THREE.Group();
    const gc = new THREE.ExtrudeGeometry(retArred(0.76, 1.56, 0.11), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3 });
    gc.translate(0, 0.78, -0.03);
    fone.add(k.m(gc, k.mat({ color: B ? "#2b2f3a" : "#15171c", rough: 0.32, clear: 0.8 }), 2.5));
    this.telaMat = new THREE.MeshBasicMaterial({ map: texTelaChat(1) });
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.44), this.telaMat);
    tela.position.set(0, 0.78, 0.0465);
    fone.add(tela);
    fone.rotation.x = -0.22;
    fone.position.set(0, 0.0, 0);
    // apoio
    const apoio = k.m(new THREE.BoxGeometry(0.5, 0.5, 0.06), k.mat({ color: B ? "#ff8a3d" : "#3b3f47" }), 2);
    apoio.position.set(0, 0.24, -0.28);
    apoio.rotation.x = 0.45;
    this.cel.add(fone, apoio);
    // cartão de embarque
    this.cartaoMat = k.mat({ map: texCartao(1), rough: 0.75, semBump: true, clear: 0.05, color: C ? "#8f8a80" : "#ffffff" });
    const cg = new THREE.BoxGeometry(1.5, 0.008, 0.65);
    const cart = k.m(cg, [k.mat({ color: "#efe9dc", semBump: true }), k.mat({ color: "#efe9dc", semBump: true }), this.cartaoMat, k.mat({ color: "#efe9dc", semBump: true }), k.mat({ color: "#efe9dc", semBump: true }), k.mat({ color: "#efe9dc", semBump: true })] as unknown as THREE.Material, 2);
    cart.position.set(0.12, 0.006, 0.78);
    cart.rotation.y = 0.12;
    this.cel.add(cart);
    this.cel.position.set(-2.4, 0, 5.0);
  }

  // ------------------------------------------------------------------ virada: arame laranja e partículas
  montaArame() {
    const p: number[] = [];
    for (const r of [...ESTADOS, ...USA]) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      p.push(a[0], 0.25, a[1], b[0], 0.25, b[1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    const cor = LARANJA.clone().multiplyScalar(1.6);
    this.arame.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 0.9, fog: false })));
    const R = rng(55), q: number[] = [];
    while (q.length < 3000 * 3) {
      const x = R.ab(-4.7, 4.5), z = R.ab(-3.1, 2.6);
      if (!dentro(x, z)) continue;
      q.push(x, 0.25 + Math.abs(R.gauss()) * 0.25, z);
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.Float32BufferAttribute(q, 3));
    this.arame.add(new THREE.Points(gp, new THREE.PointsMaterial({ color: LARANJA.clone().multiplyScalar(1.3), size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false })));
    // aviões em arame
    const ga = new THREE.WireframeGeometry(geoAviao());
    const R2 = rng(8);
    for (let i = 0; i < 26; i++) {
      const x = R2.ab(-4, 4), z = R2.ab(-2.5, 2);
      if (!dentro(x, z)) continue;
      const l = new THREE.LineSegments(ga, new THREE.LineBasicMaterial({ color: cor, fog: false }));
      l.position.set(x, 0.6, z);
      l.rotation.y = R2.ab(0, 6.28);
      l.scale.setScalar(1.6);
      this.arame.add(l);
    }
    this.arame.visible = false;
  }

  montaNuvens() {
    const t = texNuvem();
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: t, color: 0xc8d4e8, transparent: true, opacity: 0.3, depthWrite: false, fog: false }));
      this.nuvens.push(m);
      this.w.scene.add(m);
    }
  }

  // ------------------------------------------------------------------ por quadro
  camera(pos: [number, number, number], alvo: [number, number, number], fov = 30) {
    const c = this.w.camera;
    c.position.set(...pos);
    c.fov = fov;
    c.updateProjectionMatrix();
    c.lookAt(...alvo);
  }
  luz(alvo: [number, number, number], ext: number) {
    const { sol, contra } = this.w;
    const A = this.dir === "A", C = this.dir === "C";
    sol.position.set(alvo[0] + (A ? -9 : -5), alvo[1] + (A ? 6.5 : 12), alvo[2] + (A ? 5 : 7));
    sol.target.position.set(...alvo);
    contra.position.set(alvo[0] + 6, alvo[1] + 5, alvo[2] - (C ? 8 : 6));
    const s = sol.shadow.camera;
    s.left = s.bottom = -ext;
    s.right = s.top = ext;
    s.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ rede da IA nova (linhas frias ligando cidades)
  ia?: THREE.LineSegments;
  iaN = 0;
  montaIA() {
    const R = rng(77), p: number[] = [];
    const tops = [...CIDADES].sort((a, b) => b[2] - a[2]).slice(0, 34).map((c) => ll(c[0], c[1]));
    const arcos = 90, seg = 24;
    for (let k = 0; k < arcos; k++) {
      const a = R.pick(tops), b = R.pick(tops);
      const L = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (L < 0.8) { k--; continue; }
      let ant: number[] | null = null;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, y = 0.08 + Math.sin(u * Math.PI) * (0.12 + 0.12 * L);
        const q = [a[0] + (b[0] - a[0]) * u, y, a[1] + (b[1] - a[1]) * u];
        if (ant) p.push(...ant, ...q);
        ant = q;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    this.iaN = p.length / 3;
    this.ia = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color("#a9dcff").multiplyScalar(1.4), transparent: true, opacity: 0.85, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ia.visible = false;
    this.mapa.add(this.ia);
  }

  // ------------------------------------------------------------------ radar verde (só no "Ataque?")
  radar?: THREE.Mesh;
  montaRadar() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { ang: { value: 0 }, op: { value: 0 }, cor: { value: new THREE.Color("#2BD98A") } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float ang, op; uniform vec3 cor; varying vec2 vP;
        void main(){
          float r = length(vP) / 5.0; if (r > 1.0) discard;
          float a = atan(vP.y, vP.x);
          float d = mod(ang - a, 6.2831853);
          float rastro = exp(-d * 2.2) * 0.55;
          float linha = smoothstep(0.035, 0.0, d) * 0.9;
          float aneis = smoothstep(0.012, 0.0, abs(fract(r * 4.0) - 0.5) - 0.488) * 0.25;
          float cruz = (smoothstep(0.02, 0.0, abs(vP.x)) + smoothstep(0.02, 0.0, abs(vP.y))) * 0.18;
          float borda = smoothstep(0.012, 0.0, abs(r - 0.995)) * 0.6;
          float v = (rastro + linha + aneis + cruz + borda) * (1.0 - r * 0.35);
          gl_FragColor = vec4(cor * v * op * 0.75, 1.0);
        }`,
    });
    this.radar = new THREE.Mesh(new THREE.CircleGeometry(5, 96), mat);
    this.radar.rotation.x = -Math.PI / 2;
    this.radar.position.set(-0.1, 0.09, -0.25);
    this.radar.visible = false;
    this.mapa.add(this.radar);
  }

  // ------------------------------------------------------------------ Américas e rota São Paulo -> EUA
  americas = new THREE.Group();
  rotaIM?: THREE.InstancedMesh;
  rotaPts: THREE.Vector3[] = [];
  aviaoRota?: THREE.Mesh;
  montaAmericas() {
    const lin: number[] = [];
    for (const [k, aneis] of Object.entries(VIZ)) {
      for (const r of aneis) {
        const g = new THREE.ExtrudeGeometry(forma(r), { depth: 0.03, bevelEnabled: false });
        deitado(g, -0.01);
        this.americas.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: k === "BRA" ? "#1a2130" : "#0e1117", roughness: 0.9 })));
        for (let i = 0; i < r.length; i++) {
          const a = r[i], b = r[(i + 1) % r.length];
          lin.push(a[0], 0.025, a[1], b[0], 0.025, b[1]);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(lin, 3));
    this.americas.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#3b4558", fog: false })));
    // rota tracejada (traços instanciados ao longo da curva)
    const sp = ll(-46.63, -23.55), mia = ll(-80.3, 25.8);
    const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sp[0], 0.05, sp[1]), new THREE.Vector3((sp[0] + mia[0]) / 2 + 2.6, 1.6, (sp[1] + mia[1]) / 2 + 1.2), new THREE.Vector3(mia[0], 0.05, mia[1]));
    const N = 70;
    this.rotaPts = curva.getSpacedPoints(N);
    const dash = new THREE.BoxGeometry(0.16, 0.035, 0.035);
    this.rotaIM = new THREE.InstancedMesh(dash, new THREE.MeshBasicMaterial({ color: new THREE.Color("#F2A23A").multiplyScalar(2.2), fog: false }), N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = this.rotaPts[i], b = this.rotaPts[i + 1];
      const d = new THREE.Vector3().subVectors(b, a).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
      m.compose(a.clone().lerp(b, 0.5), q, new THREE.Vector3(1, 1, 1));
      this.rotaIM.setMatrixAt(i, m);
    }
    this.rotaIM.frustumCulled = false;
    this.americas.add(this.rotaIM);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color("#F2A23A").multiplyScalar(2.6), fog: false }));
    pin.position.set(sp[0], 0.08, sp[1]);
    this.americas.add(pin);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo(), color: 0xf2a23a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.set(1.2, 1.2, 1);
    halo.position.copy(pin.position);
    this.americas.add(halo);
    this.aviaoRota = new THREE.Mesh(geoSeta(), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff").multiplyScalar(2), fog: false, side: THREE.DoubleSide }));
    this.aviaoRota.scale.setScalar(4);
    this.americas.add(this.aviaoRota);
    this.americas.visible = false;
    this.base.add(this.americas);
  }

  // ------------------------------------------------------------------ por quadro
  aplicaAvioes(e: Estado) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const C = this.dir === "C";
    const apaga = e.apaga ?? 0, verm = e.vermelho ?? 0, tv = e.tv ?? 0;
    const brilho = e.brilho ?? 1, soloB = e.soloBrilho ?? 1, frio = e.frio ?? 0, vazio = e.vazio ?? 0;
    const FRIO = new THREE.Color("#cfe2ff");
    let iv = 0;
    const branco = new THREE.Color(this.dir === "B" ? "#ffffff" : "#f1ede4");
    const vermB = new THREE.Color(this.dir === "B" ? "#ff3b30" : "#c92a22");
    const VEL = 0.12;
    this.avioes.forEach((a, i) => {
      let x = a.x, z = a.z, rot = a.rot, vx = a.vx, vz = a.vz, fadeRota = 1;
      if (a.r && C) {
        const r = a.r;
        let u = (r.u0 + (tv * VEL) / r.L) % 1;
        if (u < 0) u += 1;
        x = (1 - u) ** 2 * r.ax + 2 * (1 - u) * u * r.cx + u * u * r.bx;
        z = (1 - u) ** 2 * r.az + 2 * (1 - u) * u * r.cz + u * u * r.bz;
        const tx = 2 * (1 - u) * (r.cx - r.ax) + 2 * u * (r.bx - r.cx), tz = 2 * (1 - u) * (r.cz - r.az) + 2 * u * (r.bz - r.cz);
        const tl = Math.hypot(tx, tz) || 1;
        vx = tx / tl; vz = tz / tl; rot = Math.atan2(-tz, tx);
        fadeRota = Math.min(1, u / 0.06, (1 - u) / 0.06);
      }
      p.set(x, a.y, z);
      q.setFromAxisAngle(Y, rot);
      sc.setScalar(a.s * (C ? 1 : 0.95));
      m.compose(p, q, sc);
      this.imAviao.setMatrixAt(i, m);
      if (C) {
        let c = AMARELO.clone().multiplyScalar(a.solo ? 1.0 : 1.25);
        if (a.solo) {
          const f = Math.min(1, Math.max(0, (apaga - a.ordem) / 0.1));
          c.multiplyScalar(1 - 0.88 * f);
          if (verm > 0) c.lerp(VERMELHO.clone().multiplyScalar(1.15), verm);
          c.multiplyScalar(soloB);
        } else {
          c.multiplyScalar(fadeRota);
          const sai = Math.min(1, Math.max(0, (vazio - a.ordem) / 0.08));
          c.multiplyScalar(1 - sai);
        }
        if (frio > 0) {
          const lum = (c.r + c.g + c.b) / 3;
          c.lerp(FRIO.clone().multiplyScalar(lum * 1.05), frio);
        }
        if ((e.rede ?? 0) > 0 && e.cam === undefined) c.multiplyScalar(0.35);
        c.multiplyScalar(brilho);
        this.imAviao.setColorAt(i, c);
      } else {
        let c = branco.clone();
        if (a.solo && (verm > 0 || a.ordem < apaga)) c = verm > 0 ? vermB.clone() : branco.clone().multiplyScalar(0.55);
        this.imAviao.setColorAt(i, c);
      }
      if (!a.solo) {
        if (this.imHaste) {
          const h = a.y - TOPO;
          m.compose(new THREE.Vector3(x, TOPO + h / 2 - 0.02, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
          this.imHaste.setMatrixAt(iv, m);
        }
        if (this.imTrilha) {
          const L = 0.42;
          m.compose(new THREE.Vector3(x - vx * (L / 2 + 0.02), a.y - 0.002, z - vz * (L / 2 + 0.02)), new THREE.Quaternion().setFromAxisAngle(Y, rot), new THREE.Vector3(L, 1, 0.022));
          this.imTrilha.setMatrixAt(iv, m);
          const sai = Math.min(1, Math.max(0, (vazio - a.ordem) / 0.08));
          const ct = AMARELO.clone().multiplyScalar(0.45 * fadeRota * (1 - sai) * brilho);
          if (frio > 0) ct.lerp(FRIO.clone().multiplyScalar(0.4 * fadeRota * (1 - sai) * brilho), frio);
          this.imTrilha.setColorAt(iv, ct);
        }
        iv++;
      }
    });
    this.imAviao.instanceMatrix.needsUpdate = true;
    if (this.imAviao.instanceColor) this.imAviao.instanceColor.needsUpdate = true;
    if (this.imHaste) this.imHaste.instanceMatrix.needsUpdate = true;
    if (this.imTrilha) {
      this.imTrilha.instanceMatrix.needsUpdate = true;
      if (this.imTrilha.instanceColor) this.imTrilha.instanceColor.needsUpdate = true;
    }
  }

  aplicaRede(e: Estado) {
    const C = this.dir === "C", B = this.dir === "B";
    const rede = e.rede ?? 0, caidos = e.caidos ?? 0;
    const prog = (i: number) => Math.min(1, Math.max(0, caidos - this.ordemCentros.indexOf(i)));
    const ORANGE = new THREE.Color("#F2A23A");
    this.torres.forEach((t, i) => {
      const k = prog(i), c = k >= 1;
      // na C, cada centro acende em sequência conforme a rede sobe
      const aceso = C ? Math.min(1, Math.max(0, rede * 22 - this.ordemCentros.indexOf(i))) : rede;
      t.g.visible = aceso > 0.01;
      if (C) {
        const pisca = k > 0 && k < 1 ? (Math.sin(k * 40) > 0 ? 1 : 0.2) : 1;
        const cor = ORANGE.clone().lerp(VERMELHO, k > 0 ? 1 : 0);
        (t.luzMat as THREE.MeshBasicMaterial).color.copy(cor).multiplyScalar((k > 0 ? 2.2 : 2.6) * aceso * pisca);
        t.halo!.material.color.copy(cor).multiplyScalar(aceso * pisca * (k > 0 ? 1.2 : 1));
        t.g.scale.setScalar(0.4 + 0.6 * Math.min(1, aceso * 1.5));
      } else if (B) {
        const lm = t.luzMat as THREE.MeshToonMaterial;
        lm.color.set(c ? "#ff3b30" : "#7dff9a");
        lm.emissive.set(c ? "#ff3b30" : "#7dff9a");
        if (t.cab) (t.cab.material as THREE.MeshToonMaterial).color.set(c ? "#ff6b6b" : "#3fd2e6");
        t.g.scale.set(c ? 1.06 : 1, c ? 0.86 : 1, c ? 1.06 : 1);
      } else {
        const lm = t.luzMat as THREE.MeshStandardMaterial;
        lm.emissive.set(c ? "#ff2a1a" : "#9dffb0");
        lm.emissiveIntensity = c ? 4 : 3 * Math.max(0.2, rede);
        if (t.cab) (t.cab.material as THREE.MeshPhysicalMaterial).emissive.set(c ? "#5a0a06" : "#000000");
      }
    });
    for (const f of this.fios) {
      const c = prog(f.a) >= 1 || prog(f.b) >= 1;
      const aceso = C ? Math.min(1, Math.max(0, rede * 22 - Math.max(this.ordemCentros.indexOf(f.a), this.ordemCentros.indexOf(f.b)))) : rede;
      f.mesh.visible = aceso > 0.02;
      if (B) {
        (f.mat as THREE.MeshToonMaterial).color.set(c ? "#ff3b30" : "#ffd23f");
      } else {
        const cor = c ? VERMELHO.clone().multiplyScalar(C ? 1.8 : 1.4) : C ? ORANGE.clone().multiplyScalar(1.5 * aceso) : new THREE.Color("#ffd27a").multiplyScalar(1.3 * rede);
        (f.mat as THREE.MeshBasicMaterial).color.copy(cor);
      }
    }
  }

  aplica(e: Estado, t: number) {
    this.t = t;
    const C = this.dir === "C";
    const virada = e.cena === "virada";
    const arame = virada ? 1 : e.arame ?? 0;
    this.base.visible = arame < 0.999;
    const perto = e.objetos ?? (e.cena === "disquete" || e.cena === "celular");
    this.disq.visible = this.cel.visible = arame < 0.5 && perto;
    this.arame.visible = arame > 0.001;
    this.arame.children.forEach((o) => {
      const mt = (o as THREE.Line).material as THREE.Material & { opacity: number };
      if (mt.userData.op0 === undefined) mt.userData.op0 = mt.opacity;
      mt.transparent = true;
      mt.opacity = mt.userData.op0 * arame;
    });
    const fundo = this.fundo.clone().lerp(new THREE.Color("#0B1026"), arame);
    this.w.scene.background = fundo;
    this.w.scene.fog = arame > 0.5 ? null : C ? new THREE.Fog("#050608", e.americas ? 60 : 24, e.americas ? 140 : 60) : null;
    this.aplicaAvioes({ ...e, brilho: (e.brilho ?? 1) * (1 - arame) });
    this.aplicaRede(e);
    if (this.ia) {
      const k = e.ia ?? 0;
      this.ia.visible = k > 0;
      this.ia.geometry.setDrawRange(0, Math.floor((this.iaN * Math.min(1, k)) / 2) * 2);
      (this.ia.material as THREE.LineBasicMaterial).opacity = 0.85 * (k > 1 ? Math.max(0, 2 - k) : 1);
    }
    if (this.radar) {
      const op = e.radar ?? 0;
      this.radar.visible = op > 0;
      const u = (this.radar.material as THREE.ShaderMaterial).uniforms;
      u.op.value = op;
      u.ang.value = e.radarAng ?? 0;
    }
    if (this.rotaIM) {
      const am = e.americas ?? 0, ro = e.rota ?? 0;
      this.americas.visible = am > 0;
      const n = Math.floor(ro * (this.rotaPts.length - 1));
      this.rotaIM.count = Math.max(0, n);
      // tracejado: só os pares
      const m = new THREE.Matrix4();
      for (let i = 0; i < this.rotaPts.length - 1; i++) {
        const a = this.rotaPts[i], b = this.rotaPts[i + 1];
        const d = new THREE.Vector3().subVectors(b, a).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
        m.compose(a.clone().lerp(b, 0.5), q, new THREE.Vector3(i % 2 === 0 ? 1 : 0.0001, 1, 1));
        this.rotaIM.setMatrixAt(i, m);
      }
      this.rotaIM.instanceMatrix.needsUpdate = true;
      if (this.aviaoRota) {
        const i = Math.min(this.rotaPts.length - 2, Math.max(0, n));
        const a = this.rotaPts[i], b = this.rotaPts[i + 1];
        this.aviaoRota.visible = ro > 0.02;
        this.aviaoRota.position.copy(a).add(new THREE.Vector3(0, 0.05, 0));
        this.aviaoRota.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
      }
    }
    // disquete entrando: 0 = fora, 1 = dentro
    const ins = e.insere ?? 0.3;
    this.disco.position.set(0, 0.153, 0.49 - ins * 0.94);
    // celular e cartão (redesenha a textura só quando muda)
    if (e.envio !== undefined && e.envio !== this.ultEnvio && this.telaMat.map) {
      this.ultEnvio = e.envio;
      desenhaTelaChat(this.telaMat.map.image as HTMLCanvasElement, e.envio);
      this.telaMat.map.needsUpdate = true;
    }
    const cm = this.cartaoMat as THREE.MeshPhysicalMaterial;
    if (e.carimbo !== undefined && e.carimbo !== this.ultCarimbo && cm.map) {
      this.ultCarimbo = e.carimbo;
      desenhaCartao(cm.map.image as HTMLCanvasElement, e.carimbo);
      cm.map.needsUpdate = true;
    }
    let forca = C ? 0.5 : 1;
    if (e.cam) {
      this.camera(e.cam.pos, e.cam.alvo, e.cam.fov ?? 30);
      const al = e.cam.alvo;
      const perto2 = Math.hypot(e.cam.pos[0] - al[0], e.cam.pos[1] - al[1], e.cam.pos[2] - al[2]) < 12;
      this.luz(al, perto2 ? 3 : 8);
      if (C) {
        this.w.contra.intensity = perto2 ? 2.2 : 0;
        this.w.sol.intensity = perto2 ? 0.9 : 0.25;
        this.w.hemi.intensity = perto2 ? 0.35 : 0.1;
      }
      this.foco = e.cam.foco ?? 0.5;
      forca = e.cam.forca ?? 0.45;
    } else {
      switch (e.cena) {
        case "gancho":
        case "virada":
          this.camera([0.0, 20.2, 22.6], [-0.15, 0, -0.55], 30);
          this.luz([0, 0, 0], 7);
          this.foco = 0.52;
          forca = C ? 0.45 : 0.8;
          break;
        case "centros":
          this.camera([-2.6, 19.5, 21.4], [0.0, 0, -1.45], 30);
          this.luz([0, 0, 0], 7);
          this.foco = 0.5;
          forca = C ? 0.45 : 0.8;
          break;
        case "disquete": {
          const o = this.disq.position;
          this.camera([o.x - 0.75, 2.2, o.z + 4.55], [o.x + 0.18, 0.15, o.z + 0.42], 30);
          this.luz([o.x, 0, o.z], 2.6);
          this.foco = 0.47;
          forca = C ? 0.4 : 0.75;
          break;
        }
        case "celular": {
          const o = this.cel.position;
          this.camera([o.x + 0.45, 3.9, o.z + 8.1], [o.x + 0.08, 0.74, o.z + 0.55], 30);
          this.luz([o.x, 0, o.z], 2.6);
          this.foco = 0.45;
          forca = C ? 0.35 : 0.7;
          break;
        }
      }
    }
    // nuvens finas passando na frente da câmera (C)
    if (C) {
      const cam = this.w.camera;
      const dirv = new THREE.Vector3();
      cam.getWorldDirection(dirv);
      const lado = new THREE.Vector3().crossVectors(dirv, cam.up).normalize();
      const cima = new THREE.Vector3().crossVectors(lado, dirv).normalize();
      this.nuvens.forEach((n, i) => {
        const d = 3.5 + i * 2.2;
        n.position.copy(cam.position).addScaledVector(dirv, d);
        n.position.addScaledVector(lado, (((t * (0.35 + i * 0.12) + i * 3.1) % 12) - 6) * (d / 6));
        n.position.addScaledVector(cima, (i % 2 ? 1 : -1) * (0.6 + i * 0.3) * (d / 6));
        n.quaternion.copy(cam.quaternion);
        n.scale.setScalar(d / 6);
        (n.material as THREE.MeshBasicMaterial).opacity = (e.nuvem ?? 0) * (1 - arame);
        n.visible = (e.nuvem ?? 0) > 0.001;
      });
    }
    this.forca = forca;
  }
  forca = 1;
  ultEnvio = -1;
  ultCarimbo = -1;

  render() {
    this.w.quadro(this.t, this.foco, this.forca);
  }
}
