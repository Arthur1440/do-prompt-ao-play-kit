import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TIPO, injeta, uniformsBase, UniformsCamada } from "./padroes";
import { fusao, kZoom, vista, alturas, camPose, FOV, RCAM, T, suave, setTema, Tema } from "../linha";

export type Dir = "A" | "B" | "C";
const ESTILO: Record<Dir, number> = { A: 0, B: 1, C: 2 };

// grade em xz mais densa no centro (o zoom sempre termina na origem)
function planoDenso(L: number, N = 320, pot = 2.6) {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [];
  const idx: number[] = [];
  const m = (i: number) => {
    const u = (i / N) * 2 - 1;
    return Math.sign(u) * L * Math.pow(Math.abs(u), pot);
  };
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pos.push(m(i), 0, m(j));
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i,
        b = a + 1,
        c = a + N + 1,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

type Camada = { grupo: THREE.Group; s: number; lado: 1 | -1; us: UniformsCamada[] };

export class Mundo {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  faixas: { cima: Camada; baixo: Camada }[] = [];
  aneis: THREE.Mesh[] = [];
  dofH: ShaderPass;
  dofV: ShaderPass;
  tiltH?: ShaderPass;
  tiltV?: ShaderPass;
  final: ShaderPass;
  todosU: UniformsCamada[] = [];
  fundo: THREE.Color;

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number, public tema: Tema = "dedo") {
    setTema(tema);
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.toneMapping = dir === "B" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = dir === "C" ? 1.05 : 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    this.camera = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 400);

    this.fundo = dir === "A" ? new THREE.Color(0.11, 0.07, 0.045) : dir === "B" ? new THREE.Color(0.035, 0.04, 0.11) : new THREE.Color(0, 0, 0);
    this.scene.background = this.fundo.clone();

    if (dir !== "B") {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = dir === "A" ? 0.4 : 0.1;
    }
    // luz: uma de frente e por baixo (acende o dedo visto de baixo), uma de cima e por trás (acende a tela e dá o brilho rasante)
    const frente = new THREE.DirectionalLight(dir === "B" ? 0xffffff : 0xffe0c4, dir === "A" ? 2.2 : dir === "B" ? 1.9 : 2.3);
    frente.position.set(-3, -1.8, 10);
    const cima = new THREE.DirectionalLight(dir === "A" ? 0xffcf9a : dir === "B" ? 0xffffff : 0xcfe0ff, dir === "A" ? 3.0 : dir === "B" ? 2.2 : 2.0);
    cima.position.set(2.5, 8, -5);
    const lado = new THREE.DirectionalLight(0xffffff, dir === "C" ? 0.7 : 0.9);
    lado.position.set(7, 1, 3);
    const hemi = new THREE.HemisphereLight(dir === "A" ? 0xfff0dd : 0xdde6ff, dir === "A" ? 0x3a2414 : 0x1a1410, dir === "B" ? 1.25 : dir === "A" ? 0.7 : 0.2);
    this.scene.add(frente, cima, lado, hemi);

    this.montaFaixas();
    this.montaAneis();
    this.montaParticulas();

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    const comp = new EffectComposer(r, rt);
    comp.setPixelRatio(1);
    comp.setSize(W, H);
    comp.addPass(new DuasCenas(this, W, H));
    this.dofH = new ShaderPass(DOF);
    this.dofH.uniforms.dir.value.set(1 / W, 0);
    this.dofV = new ShaderPass(DOF);
    this.dofV.uniforms.dir.value.set(0, 1 / H);
    for (const p of [this.dofH, this.dofV]) {
      p.uniforms.maxR.value = dir === "C" ? 34 : dir === "A" ? 10 : 18;
      p.uniforms.forca.value = dir === "B" ? 0 : 1;
    }
    comp.addPass(this.dofH);
    comp.addPass(this.dofV);
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "C" ? 0.22 : dir === "A" ? 0.18 : 0.12, 0.6, dir === "B" ? 0.95 : 0.9));
    comp.addPass(new OutputPass());
    if (dir === "A") {
      this.tiltH = new ShaderPass(TILT);
      this.tiltH.uniforms.dir.value.set(1 / W, 0);
      this.tiltV = new ShaderPass(TILT);
      this.tiltV.uniforms.dir.value.set(0, 1 / H);
      comp.addPass(this.tiltH);
      comp.addPass(this.tiltV);
    }
    this.final = new ShaderPass(FINAL);
    this.final.uniforms.res.value.set(W, H);
    this.final.uniforms.grao.value = dir === "A" ? 0.02 : dir === "C" ? 0.03 : 0;
    this.final.uniforms.nitidez.value = dir === "A" ? 0.55 : 0.25;
    this.final.uniforms.vinheta.value = dir === "A" ? 0.5 : dir === "B" ? 0.2 : 0.4;
    this.final.uniforms.quente.value = dir === "A" ? 0.025 : 0;
    comp.addPass(this.final);
    this.composer = comp;
  }

  material(u: UniformsCamada, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
    u.uEstilo.value = ESTILO[this.dir];
    u.uFogCor.value = this.fundo.clone();
    u.uDofRange.value = this.dir === "C" ? 5 : this.dir === "A" ? 24 : 1000;
    u.uNormK.value = this.dir === "A" ? 1.5 : 1;
    u.uRcam.value = RCAM;
    this.todosU.push(u);
    let m: THREE.Material;
    if (this.dir === "B") {
      m = new THREE.MeshToonMaterial({ gradientMap: gradToon(), side: THREE.DoubleSide });
    } else {
      m = new THREE.MeshPhysicalMaterial({
        roughness: 0.5,
        clearcoat: this.dir === "A" ? 0.25 : 0.08,
        clearcoatRoughness: 0.45,
        sheen: this.dir === "C" ? 0.35 : 0,
        sheenColor: new THREE.Color(1, 0.75, 0.65),
        side: THREE.DoubleSide,
        ...extra,
      });
    }
    injeta(m, u);
    return m;
  }

  /** Material de cor lisa que ainda escreve o desfoque no alfa. */
  liso(cor: number, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
    const u = uniformsBase();
    u.uTipo.value = 0;
    u.uPlano.value = 0;
    u.uFog.value.set(16, 40);
    u.uLinha.value = 0;
    const m = this.material(u, extra);
    (m as THREE.MeshPhysicalMaterial).color = new THREE.Color(cor);
    return m;
  }

  camada(
    tipo: number,
    s: number,
    vIni: number,
    lado: 1 | -1,
    amp: number,
    opts: { curv?: number; curvX?: number; seed?: number; linha?: number; tinta?: [number, number, number] } = {},
  ): Camada {
    const L = (34 * vIni) / s;
    const u = uniformsBase();
    u.uTipo.value = tipo;
    u.uAmp.value = amp;
    u.uLado.value = lado;
    u.uCurv.value = opts.curv ?? (lado === 1 ? 0.02 : 0.014);
    u.uCurvX.value = opts.curvX ?? (lado === 1 ? 3 : 1.2);
    u.uSeed.value = opts.seed ?? 0;
    u.uLinha.value = opts.linha ?? 0.12;
    if (opts.tinta) u.uTinta.value.set(...opts.tinta);
    const mesh = new THREE.Mesh(planoDenso(L), this.material(u));
    mesh.frustumCulled = false;
    const grupo = new THREE.Group();
    grupo.add(mesh);
    grupo.visible = false;
    this.scene.add(grupo);
    return { grupo, s, lado, us: [u] };
  }

  montaFaixasBeijo() {
    // 0: os dois rostos de perfil (1 unidade local = 1 mm); depois os dois lados são lábios
    this.faixas.push(this.montaMacroBeijo());
    const ini = [3e-3, 120e-6, 8e-6, 0.9e-6, 60e-9, 4e-9];
    const meu: [number, number, number] = [1.0, 0.78, 0.82];
    const dele: [number, number, number] = [0.96, 0.74, 0.8];
    const par = (tipo: number, s: number, i: number, amp: number, linha: number) => ({
      cima: this.camada(tipo, s, ini[i], 1, amp, { linha, tinta: meu, curv: 0.018, curvX: 3 }),
      baixo: this.camada(tipo, s, ini[i], -1, amp, { linha, tinta: dele, curv: 0.018, curvX: 3, seed: 7.7 }),
    });
    this.faixas.push(par(TIPO.rugas, 0.4e-3, 0, 0.24, 0.2));
    this.faixas.push(par(TIPO.escamas, 30e-6, 1, 0.16, 0.1));
    this.faixas.push(par(TIPO.celula, 3e-6, 2, 0.35, 0.2));
    this.faixas.push(par(TIPO.fibras, 0.12e-6, 3, 0.3, 0.2));
    this.faixas.push(par(TIPO.cadeias, 8e-9, 4, 0.35, 0.08));
    const at = {
      cima: this.camada(TIPO.atomos, 0.27e-9, ini[5], 1, 0.5, { linha: 0.05, curv: 0.018, curvX: 3 }),
      baixo: this.camada(TIPO.atomosB, 0.27e-9, ini[5], -1, 0.5, { seed: 11.3, linha: 0.05, curv: 0.018, curvX: 3 }),
    };
    this.faixas.push(at, at);
  }

  /** Bonequinho de perfil (maquete): eixo local X = para a frente (para o outro), Y = para cima, Z = lado visível. */
  boneco(cabelo: number, camisa: number, zVis: 1 | -1, labioU: ReturnType<typeof uniformsBase>) {
    const g = new THREE.Group();
    const pele = this.liso(0xf2c4a2, { roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.2 });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], esc: [number, number, number] = [1, 1, 1]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      m.scale.set(...esc);
      g.add(m);
      return m;
    };
    const esf = new THREE.SphereGeometry(1, 64, 48);
    // cabeça: a frente do rosto fica em x ≈ -6
    add(esf, pele, [-74, 18, 0], [68, 76, 62]);
    // mandíbula arredondada, por dentro do rosto (sem calombo)
    add(esf, pele, [-44, -20, 0], [28, 26, 40]);
    // nariz pequeno (fica atrás dos lábios)
    add(esf, pele, [-13, 22, 0], [10, 9, 8]);
    // lábios em bico, maiores (o ponto mais à frente é x = 0)
    const lab = this.material(labioU, { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    add(esf, lab, [-10, 5, 0], [10, 7.5, 15]);
    add(esf, lab, [-10.6, -7.5, 0], [10.4, 8, 15.5]);
    // olho fechado (traço) e sobrancelha do lado visível
    const escuro = this.liso(0x2a1a14, { roughness: 0.4 });
    add(new THREE.CapsuleGeometry(1.2, 9, 6, 12), escuro, [-30, 30, zVis * 47], [1, 1, 1]).rotation.set(0, 0, Math.PI / 2 + 0.25);
    add(new THREE.CapsuleGeometry(1.6, 12, 6, 12), this.liso(cabelo, { roughness: 0.6 }), [-31, 42, zVis * 46], [1, 1, 1]).rotation.set(0, 0, Math.PI / 2 - 0.15);
    // bochecha rosada
    add(esf, this.liso(0xf0a090, { roughness: 0.6 }), [-36, 6, zVis * 50], [9, 6, 3]);
    // orelha
    add(esf, pele, [-84, 14, zVis * 58], [11, 16, 6]);
    // cabelo: calota em cima e atrás
    const cab = this.liso(cabelo, { roughness: 0.55, clearcoat: 0.4 });
    add(esf, cab, [-84, 44, 0], [64, 54, 66]);
    add(esf, cab, [-40, 70, 0], [34, 18, 46]); // franja
    // pescoço e ombros com camiseta
    add(new THREE.CylinderGeometry(24, 28, 70, 40), pele, [-70, -78, 0]);
    add(esf, this.liso(camisa, { roughness: 0.7 }), [-90, -170, 0], [92, 70, 78]);
    return g;
  }

  montaMacroBeijo() {
    const uL1 = uniformsBase();
    const uL2 = uniformsBase();
    for (const u of [uL1, uL2]) {
      u.uTipo.value = TIPO.rugas;
      u.uPlano.value = 0;
      u.uEsc.value = 1 / 0.4;
      u.uFog.value.set(30, 80);
      u.uLinha.value = 0;
    }
    // você (à esquerda da tela = +y do mundo): frente → -y, cima → +x, lado visível → +z
    const cima = new THREE.Group();
    const b1 = this.boneco(0x3b2618, 0x2f8f8a, 1, uL1);
    b1.matrixAutoUpdate = false;
    b1.matrix.makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
    cima.add(b1);
    // o crush (à direita): frente → +y, cima → +x; o lado visível dele é o local -z
    const baixo = new THREE.Group();
    const b2 = this.boneco(0xd9682b, 0xe0b23a, -1, uL2);
    b2.matrixAutoUpdate = false;
    b2.matrix.makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
    baixo.add(b2);
    // luzinhas desfocadas ao fundo
    const luz = this.liso(0xffd9a0, { roughness: 1, emissive: new THREE.Color(1.0, 0.75, 0.42), emissiveIntensity: 3 });
    let s = 5;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), luz);
      m.position.set(140 + rnd() * 220, (rnd() - 0.5) * 520, -700 - rnd() * 300);
      baixo.add(m);
    }
    const parede = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), this.liso(0x3a2418, { roughness: 1 }));
    parede.position.z = -1100;
    baixo.add(parede);
    cima.visible = baixo.visible = false;
    this.scene.add(cima, baixo);
    return {
      cima: { grupo: cima, s: 1e-3, lado: 1 as const, us: [uL1] },
      baixo: { grupo: baixo, s: 1e-3, lado: -1 as const, us: [uL2] },
    };
  }

  montaFaixasCachorro() {
    // 0: a mão chegando no cachorro (1 unidade local = 1 mm); embaixo, o pelo dele
    this.faixas.push(this.montaMacroCachorro());
    const ini = [3e-3, 120e-6, 8e-6, 0.9e-6, 60e-9, 4e-9];
    const pelo: [number, number, number] = [1.0, 0.82, 0.6];
    this.faixas.push({
      cima: this.camada(TIPO.dedo, 0.45e-3, ini[0], 1, 0.22, { linha: 0.25 }),
      baixo: this.camada(TIPO.pelos, 80e-6, ini[0], -1, 0.3, { linha: 0.3 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.escamas, 35e-6, ini[1], 1, 0.16, { linha: 0.1 }),
      baixo: this.camada(TIPO.cuticula, 7e-6, ini[1], -1, 0.22, { linha: 0.3 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.celula, 3e-6, ini[2], 1, 0.35, { linha: 0.2 }),
      baixo: this.camada(TIPO.celula, 2e-6, ini[2], -1, 0.3, { linha: 0.2, tinta: pelo, seed: 4.2 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.fibras, 0.12e-6, ini[3], 1, 0.3, { linha: 0.2 }),
      baixo: this.camada(TIPO.fibras, 0.12e-6, ini[3], -1, 0.3, { linha: 0.2, tinta: pelo, seed: 2.1 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.cadeias, 8e-9, ini[4], 1, 0.35, { linha: 0.08 }),
      baixo: this.camada(TIPO.cadeias, 8e-9, ini[4], -1, 0.3, { seed: 3.7, linha: 0.08, tinta: pelo }),
    });
    const at = {
      cima: this.camada(TIPO.atomos, 0.27e-9, ini[5], 1, 0.5, { linha: 0.05 }),
      baixo: this.camada(TIPO.atomosB, 0.27e-9, ini[5], -1, 0.5, { seed: 11.3, linha: 0.05 }),
    };
    this.faixas.push(at, at);
  }

  montaMacroCachorro() {
    const esf = new THREE.SphereGeometry(1, 64, 48);
    const add = (g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], esc: [number, number, number] = [1, 1, 1], rot: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      m.scale.set(...esc);
      m.rotation.set(...rot);
      g.add(m);
      return m;
    };
    // ---- a mão, de palma para baixo; o ponto mais baixo da palma é a origem ----
    const cima = new THREE.Group();
    const uD = uniformsBase();
    uD.uTipo.value = TIPO.dedo;
    uD.uPlano.value = 0;
    uD.uEsc.value = 1 / 0.45;
    uD.uFog.value.set(60, 160);
    uD.uLinha.value = 0;
    const pele = this.material(uD, { roughness: 0.5, clearcoat: 0.15, sheen: 0.35, sheenColor: new THREE.Color(1, 0.7, 0.6) });
    type V = [number, number, number];
    const v3 = (a: V) => new THREE.Vector3(...a);
    // osso: cápsula entre dois pontos (falanges, polegar, antebraço)
    const osso = (g: THREE.Group, a: V, b: V, r: number, mat: THREE.Material, seg = 28) => {
      const A = v3(a), B = v3(b);
      const d = B.clone().sub(A);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 10, seg), mat);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      g.add(m);
      return m;
    };
    const unhaM = this.liso(0xf3c3b4, { roughness: 0.22, clearcoat: 0.9 });
    const unha = (ponta: THREE.Vector3, dir: THREE.Vector3, r: number, comp: number) => {
      const lat = new THREE.Vector3(1, 0, 0);
      const dorso = new THREE.Vector3().crossVectors(dir, lat).normalize();
      const lat2 = new THREE.Vector3().crossVectors(dorso, dir).normalize();
      const m = new THREE.Mesh(esf, unhaM);
      m.matrixAutoUpdate = false;
      m.matrix.makeBasis(lat2.multiplyScalar(r * 0.78), dorso.clone().multiplyScalar(r * 0.22), dir.clone().multiplyScalar(comp));
      m.matrix.setPosition(ponta.clone().addScaledVector(dir, -comp * 0.9).addScaledVector(dorso, r * 0.78));
      cima.add(m);
    };
    // palma e dorso da mão (o ponto mais baixo da palma é a origem)
    add(cima, esf, pele, [0, 12.5, 0], [42, 12.5, 46]);
    add(cima, esf, pele, [0, 17, -8], [40, 15, 40]);
    // dedos: 3 falanges cada, dobrando um pouco mais na ponta, com nó e unha
    const dedos: [number, number, number][] = [
      [-27, 46, 7.6],
      [-9, 56, 8.4],
      [9, 53, 8.2],
      [26, 42, 7.2],
    ];
    for (const [x, L, r] of dedos) {
      let p = new THREE.Vector3(x, 18.5, 40);
      add(cima, esf, pele, [x, 19.5, 37], [r * 1.12, r * 1.05, r * 1.15]); // nó do dedo
      const fr = [0.45, 0.3, 0.25];
      const ang = [0.06, 0.22, 0.38];
      let dir = new THREE.Vector3();
      fr.forEach((f, i) => {
        dir = new THREE.Vector3(x * 0.004, -Math.sin(ang[i]), Math.cos(ang[i])).normalize();
        const q = p.clone().addScaledVector(dir, L * f);
        const ri = r * (1 - 0.08 * i);
        osso(cima, [p.x, p.y, p.z], [q.x, q.y, q.z], ri, pele);
        p = q;
      });
      unha(p, dir, r * 0.84, L * 0.12);
    }
    // polegar: 2 falanges, abrindo para o lado
    {
      const a = new THREE.Vector3(-34, 13, 2);
      const d1 = new THREE.Vector3(-0.62, -0.08, 0.78).normalize();
      const b = a.clone().addScaledVector(d1, 26);
      const d2 = new THREE.Vector3(-0.42, -0.14, 0.9).normalize();
      const c = b.clone().addScaledVector(d2, 22);
      add(cima, esf, pele, [-30, 13, -2], [16, 11, 20]); // base do polegar
      osso(cima, [a.x, a.y, a.z], [b.x, b.y, b.z], 10, pele);
      osso(cima, [b.x, b.y, b.z], [c.x, c.y, c.z], 9, pele);
      unha(c, d2, 8.4, 6);
    }
    // punho, antebraço e manga
    osso(cima, [0, 20, -40], [0, 62, -190], 29, pele, 40);
    const manga = new THREE.Mesh(new THREE.CylinderGeometry(39, 41, 150, 40), this.liso(0x3d6fb0, { roughness: 0.85 }));
    manga.position.set(0, 82, -262);
    manga.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.27, -0.96).normalize());
    cima.add(manga);

    // ---- o cachorro, de lado; o alto das costas é a origem; pelo em 14 camadas ----
    const baixo = new THREE.Group();
    const cao = new THREE.Group();
    cao.position.x = -30; // cabeça inteira no quadro
    cao.scale.setScalar(0.86);
    baixo.add(cao);
    const CAMADAS = 14;
    const LEN = 14; // mm de pelo
    const camadasPelo: THREE.Material[] = [];
    const usPelo: UniformsCamada[] = [];
    for (let i = 0; i <= CAMADAS; i++) {
      const u = uniformsBase();
      u.uTipo.value = TIPO.pelos;
      u.uPlano.value = 0;
      u.uEsc.value = 1 / 0.08;
      u.uFog.value.set(60, 160);
      u.uLinha.value = 0;
      u.uPeloLen.value = LEN;
      u.uDens.value = 1 / 1.5;
      u.uCasca.value = i / CAMADAS;
      usPelo.push(u);
      camadasPelo.push(this.material(u, { roughness: 0.6, clearcoat: 0.1, sheen: 0.6, sheenColor: new THREE.Color(1, 0.85, 0.6) }));
    }
    // geometria com escala e rotação "assadas" (1 unidade = 1 mm para o pelo ficar igual em todo o corpo)
    const assa = (g: THREE.BufferGeometry, esc: V = [1, 1, 1], rot: V = [0, 0, 0]) =>
      g.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), v3(esc)));
    const peludo = (geo: THREE.BufferGeometry, pos: V) => {
      for (const m of camadasPelo) {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(...pos);
        cao.add(mesh);
      }
    };
    const pRot: V = [0, 0, Math.PI / 2];
    const yC = -82 - LEN * 0.7; // a ponta do pelo das costas fica perto da origem
    peludo(assa(new THREE.CapsuleGeometry(82, 160, 24, 64), [1, 1, 0.92], pRot), [0, yC, 0]); // corpo
    peludo(assa(new THREE.SphereGeometry(1, 72, 54), [80, 75, 72]), [185, yC + 70, 0]); // cabeça
    peludo(assa(new THREE.CapsuleGeometry(30, 46, 16, 40), [1, 0.9, 0.95], pRot), [268, yC + 48, 0]); // focinho
    const preto = this.liso(0x1a1210, { roughness: 0.25, clearcoat: 0.9 });
    add(cao, esf, preto, [312, yC + 58, 0], [13, 10, 14]); // nariz úmido
    for (const z of [-1, 1]) {
      add(cao, esf, preto, [232, yC + 98, z * 50], [8, 9, 6]); // olhos
      add(cao, esf, this.liso(0xffffff, { roughness: 0.1 }), [236, yC + 102, z * 54], [2.2, 2.2, 1.5]); // brilho do olho
      peludo(assa(new THREE.SphereGeometry(1, 40, 30), [24, 60, 11], [z * 0.25, 0, 0.15]), [160, yC + 72, z * 70]); // orelhas caídas
      for (const x of [-105, 100]) {
        peludo(assa(new THREE.CapsuleGeometry(24, 120, 12, 40)), [x, yC - 123, z * 48]); // pernas
        peludo(assa(new THREE.SphereGeometry(1, 36, 24), [30, 18, 26]), [x + 10, yC - 193, z * 48]); // patas
      }
    }
    peludo(assa(new THREE.CapsuleGeometry(15, 95, 10, 28), [1, 1, 1], [0, 0, 0.75]), [-196, yC + 42, 0]); // rabo
    add(cao, new THREE.TorusGeometry(56, 8, 16, 60), this.liso(0xd63a3a, { roughness: 0.5 }), [128, yC + 44, 0], [1, 1, 1], [0, Math.PI / 2, 0.2]); // coleira
    const uP = usPelo[0];
    // chão de madeira e parede ao fundo
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), this.liso(0xa4703f, { roughness: 0.7 }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = (yC - 193 - 18) * 0.86; // apoio das patas
    baixo.add(chao);
    const parede = new THREE.Mesh(new THREE.PlaneGeometry(5000, 3000), this.liso(0x8fb8a8, { roughness: 0.9 }));
    parede.position.set(0, 600, -900);
    baixo.add(parede);
    cima.visible = baixo.visible = false;
    this.scene.add(cima, baixo);
    return {
      cima: { grupo: cima, s: 1e-3, lado: 1 as const, us: [uD] },
      baixo: { grupo: baixo, s: 1e-3, lado: -1 as const, us: [uP] },
    };
  }

  montaFaixas() {
    if (this.tema === "beijo") return this.montaFaixasBeijo();
    if (this.tema === "cachorro") return this.montaFaixasCachorro();
    // 0: o dedo e o celular (1 unidade local = 1 mm)
    this.faixas.push(this.montaMacro());
    const ini = [3e-3, 120e-6, 8e-6, 0.9e-6, 60e-9, 4e-9];
    this.faixas.push({
      cima: this.camada(TIPO.dedo, 0.45e-3, ini[0], 1, 0.22, { linha: 0.25 }),
      baixo: this.camada(TIPO.vidro, 0.1e-3, ini[0], -1, 0.05, { linha: 0.5 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.escamas, 35e-6, ini[1], 1, 0.16, { linha: 0.1 }),
      baixo: this.camada(TIPO.riscos, 15e-6, ini[1], -1, 0.14, { linha: 0.42 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.celula, 3e-6, ini[2], 1, 0.35, { linha: 0.2 }),
      baixo: this.camada(TIPO.finos, 2e-6, ini[2], -1, 0.2, { linha: 0.36 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.fibras, 0.12e-6, ini[3], 1, 0.3, { linha: 0.2 }),
      baixo: this.camada(TIPO.bolinhas, 0.15e-6, ini[3], -1, 0.3, { linha: 0.24 }),
    });
    this.faixas.push({
      cima: this.camada(TIPO.cadeias, 8e-9, ini[4], 1, 0.35, { linha: 0.08 }),
      baixo: this.camada(TIPO.fluor, 8e-9, ini[4], -1, 0.3, { seed: 3.7, linha: 0.08 }),
    });
    const at = {
      cima: this.camada(TIPO.atomos, 0.27e-9, ini[5], 1, 0.5, { linha: 0.05 }),
      baixo: this.camada(TIPO.atomosB, 0.27e-9, ini[5], -1, 0.5, { seed: 11.3, linha: 0.05 }),
    };
    this.faixas.push(at, at); // átomos e nuvem de elétrons são a mesma camada
  }

  montaMacro() {
    // celular deitado: tela de 68 x 146 mm, a origem é o ponto embaixo do dedo
    const baixo = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(72, 8, 150), this.liso(this.dir === "A" ? 0x3b3f4a : this.dir === "B" ? 0x22243a : 0x0c0d10, { roughness: 0.35, metalness: this.dir === "B" ? 0 : 0.4, clearcoat: 0.6 }));
    corpo.position.set(0, -4.15, -35);
    const uT = uniformsBase();
    uT.uTipo.value = TIPO.tela;
    uT.uLado.value = -1;
    uT.uFog.value.set(16, 40);
    uT.uLinha.value = 0;
    const tela = new THREE.Mesh(planoDenso(73, 120, 1), this.material(uT, { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }));
    tela.scale.set(34 / 73, 1, 1);
    tela.position.set(0, 0, -35);
    baixo.add(corpo, tela);
    // a mesa bem atrás, fora de foco
    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), this.liso(this.dir === "A" ? 0x8a5a36 : this.dir === "B" ? 0x2b2f6a : 0x16130f, { roughness: 0.8 }));
    mesa.rotation.x = -Math.PI / 2;
    mesa.position.y = -8.3;
    baixo.add(mesa);

    const cima = new THREE.Group();
    const uD = uniformsBase();
    uD.uTipo.value = TIPO.dedo;
    uD.uPlano.value = 0;
    uD.uEsc.value = 1 / 0.45;
    uD.uLado.value = 1;
    uD.uFog.value.set(16, 40);
    uD.uLinha.value = 0;
    const pele = this.material(uD, { roughness: 0.55, clearcoat: 0.12, sheen: this.dir === "C" ? 0.6 : 0.2 });
    const eixo = new THREE.Vector3(0.48, 0.8, -0.36).normalize();
    const R = 8.2;
    const comp = 70;
    const ponta = new THREE.Vector3(0, R, 0);
    const dedo = new THREE.Mesh(new THREE.CapsuleGeometry(R, comp, 24, 64), pele);
    dedo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eixo);
    dedo.position.copy(ponta).addScaledVector(eixo, comp / 2);
    dedo.scale.set(1.06, 1, 0.94);
    // unha do lado de cima
    const up = new THREE.Vector3(0, 1, 0);
    const dorso = up.clone().sub(eixo.clone().multiplyScalar(up.dot(eixo))).normalize();
    const lateral = new THREE.Vector3().crossVectors(dorso, eixo).normalize();
    const unha = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), this.liso(this.dir === "B" ? 0xffc2b4 : 0xf0b9a8, { roughness: 0.25, clearcoat: 0.8 }));
    unha.matrixAutoUpdate = false;
    const base = new THREE.Matrix4().makeBasis(lateral.clone().multiplyScalar(7.0), dorso.clone().multiplyScalar(1.6), eixo.clone().multiplyScalar(11));
    base.setPosition(ponta.clone().addScaledVector(eixo, 9).addScaledVector(dorso, R - 0.9));
    unha.matrix.copy(base);
    // o resto da mão, desfocado, saindo pelo canto
    const mao = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), pele);
    mao.scale.set(30, 22, 34);
    mao.position.copy(ponta).addScaledVector(eixo, comp + 22).add(new THREE.Vector3(10, 4, -6));
    const dedo2 = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.95, 40, 16, 48), pele);
    const e2 = new THREE.Vector3(0.75, 0.55, -0.35).normalize();
    dedo2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e2);
    dedo2.position.copy(ponta).add(new THREE.Vector3(26, 22, -14)).addScaledVector(e2, 20);
    cima.add(dedo, unha, mao, dedo2);
    cima.visible = baixo.visible = false;
    this.scene.add(cima, baixo);
    return {
      cima: { grupo: cima, s: 1e-3, lado: 1 as const, us: [uD] },
      baixo: { grupo: baixo, s: 1e-3, lado: -1 as const, us: [uT] },
    };
  }

  montaAneis() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { forca: { value: 0 } },
      vertexShader: `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float forca; void main(){ gl_FragColor = vec4(vec3(1.6,1.65,1.9)*forca, 0.08); }`,
    });
    for (const [r, y] of [
      [2.2, 0.36],
      [4.6, 0.4],
      [3.4, -0.4],
      [7.5, -0.44],
    ]) {
      const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0065 * Math.sqrt(r), 6, 200), mat.clone());
      a.rotation.x = Math.PI / 2;
      a.position.y = y;
      a.visible = false;
      this.scene.add(a);
      this.aneis.push(a);
    }
    // faíscas nítidas da nuvem de elétrons (alfa baixo = fora do desfoque)
    const n = 900;
    const pos = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const lado = rnd() < 0.5 ? 1 : -1;
      pos[i * 3] = (rnd() - 0.5) * 9;
      pos[i * 3 + 1] = lado * (0.55 + rnd() * 3.2);
      pos[i * 3 + 2] = (rnd() - 0.5) * 14 - 2;
      fase[i] = rnd() * 6.28;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("fase", new THREE.BufferAttribute(fase, 1));
    this.faiscas = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: { forca: { value: 0 }, tempo: { value: 0 } },
        vertexShader: `attribute float fase; uniform float tempo; varying float vB;
          void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv;
            vB = 0.45 + 0.55*sin(tempo*2.3 + fase*3.0); gl_PointSize = (2.0 + 2.5*fract(fase*7.13)) * 12.0 / -mv.z; }`,
        fragmentShader: `uniform float forca; varying float vB; void main(){ float d = length(gl_PointCoord-0.5); float a = 1.0 - smoothstep(0.15, 0.5, d);
          gl_FragColor = vec4(vec3(1.0,0.97,0.95)*a*vB*forca*1.4, 0.02); }`,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    this.faiscas.visible = false;
    this.scene.add(this.faiscas);
  }
  faiscas!: THREE.Points;

  /** Deixa visível só a faixa i (as duas camadas dela). */
  mostra(i: number) {
    for (const f of this.faixas) f.cima.grupo.visible = f.baixo.grupo.visible = false;
    const f = this.faixas[i];
    f.cima.grupo.visible = f.baixo.grupo.visible = true;
  }

  aplica(t: number) {
    const v = vista(t);
    const fu = fusao(v);
    this.transicao = fu;
    const { cima, baixo } = alturas(t);
    for (const f of [this.faixas[fu.de], this.faixas[fu.para]])
      for (const c of [f.cima, f.baixo]) {
        const k = c.s / v;
        c.grupo.scale.setScalar(k);
        c.grupo.position.y = c.lado === 1 ? cima : baixo;
      }
    this.mostra(fu.mistura > 0.5 ? fu.para : fu.de);
    this.particulas(t, v);
    // nuvem de elétrons: entre 0,9 e 0,5 nm as esferas viram brilho
    const fuzz = suave(Math.log2(0.9e-9 / v) / Math.log2(0.9 / 0.5));
    for (const u of this.todosU) {
      u.uFuzz.value = u.uTipo.value === TIPO.atomos || u.uTipo.value === TIPO.atomosB ? fuzz : 0;
      u.uTempo.value = t;
    }
    const fz = this.faiscas.material as THREE.ShaderMaterial;
    fz.uniforms.forca.value = fuzz * (this.dir === "B" ? 0.6 : 1);
    fz.uniforms.tempo.value = t;
    this.faiscas.visible = fuzz > 0.01;
    // câmera
    const { pos, alvo, up } = camPose(t);
    this.camera.position.copy(pos);
    this.camera.up.copy(up);
    this.camera.lookAt(alvo);
    this.camera.updateProjectionMatrix();
    // anéis: os elétrons empurram de volta
    const ua = t - T.trava;
    this.aneis.forEach((a, i) => {
      const on = ua > 0.15 * i && t < T.saidaIni + 0.3;
      a.visible = on;
      const s = 0.85 + 0.15 * suave((ua - 0.15 * i) / 1.2);
      a.scale.setScalar(s);
      (a.material as THREE.ShaderMaterial).uniforms.forca.value = on ? suave((ua - 0.15 * i) / 0.4) * (1 - suave((t - T.saidaIni) / 0.3)) * (0.8 + 0.2 * Math.sin(ua * 6 + i)) : 0;
    });
    // desfoque: troca de faixa + saída rápida
    const saida = t > T.saidaIni && t < T.saidaFim ? Math.sin(Math.PI * (t - T.saidaIni) / (T.saidaFim - T.saidaIni)) : 0;
    const glob = saida * 0.7;
    this.dofH.uniforms.global.value = this.dofV.uniforms.global.value = glob;
    if (this.tiltH && this.tiltV) {
      // faixa nítida no vão (projetado ~ metade da tela); leve, para não borrar a pele e as células
      this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = 0.5;
      this.tiltH.uniforms.forca.value = this.tiltV.uniforms.forca.value = 0.45;
    }
    this.final.uniforms.tempo.value = t;
  }

  transicao = { de: 0, para: 0, mistura: 0 };
  parts!: THREE.InstancedMesh;
  partsBase: { p: THREE.Vector3; fase: number; tam: number }[] = [];

  montaParticulas() {
    // contas de plástico (A) / bolinhas que flutuam no vão depois das células
    const n = 420;
    const u = uniformsBase();
    u.uTipo.value = 0;
    u.uPlano.value = 0;
    u.uCurv.value = 0;
    u.uFog.value.set(10, 26);
    u.uLinha.value = 0;
    const m = this.material(u, { roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.2 });
    (m as THREE.MeshPhysicalMaterial).color = new THREE.Color(1, 1, 1);
    this.parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), m, n);
    this.parts.frustumCulled = false;
    const cores = this.dir === "B" ? [0xffd23f, 0xff6fa8, 0x5fd3ff, 0xffffff] : [0xffe2b8, 0xf6b08a, 0xbfe3e0, 0xfff6ea, 0xe7a0b8];
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 0.6 + Math.pow(rnd(), 0.7) * 5.5;
      this.partsBase.push({ p: new THREE.Vector3(Math.cos(a) * r, (rnd() - 0.5) * 0.8, Math.sin(a) * r * 1.4 - 1), fase: rnd(), tam: 0.018 + rnd() * rnd() * 0.07 });
      this.parts.setColorAt(i, new THREE.Color(cores[i % cores.length]));
    }
    this.parts.visible = false;
    this.scene.add(this.parts);
  }

  /** Partículas acompanham a aproximação: nascem perto do centro, crescem e se afastam (como estrelas num zoom). */
  particulas(t: number, v: number) {
    // aparecem depois das células (abaixo de ~1 µm) e somem na volta ao dedo
    const dens = suave(Math.log2(1.2e-6 / v) / 2.5) * (t < T.saidaIni ? 1 : 1 - suave((t - T.saidaIni) / 0.8));
    this.parts.visible = dens > 0.01;
    if (!this.parts.visible) return;
    const k = kZoom(t);
    const mt = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const n = this.partsBase.length;
    const lim = Math.floor(n * (0.35 + 0.65 * dens));
    this.partsBase.forEach((b, i) => {
      const u = (k * 0.42 + b.fase) % 1; // ciclo de 2,4 metades
      const g = Math.pow(2, u * 2.2);
      const vida = Math.sin(Math.PI * u);
      const p = new THREE.Vector3(b.p.x * g * 0.55, b.p.y * Math.min(g, 1.15), b.p.z * g * 0.55);
      p.x += Math.sin(t * 0.7 + b.fase * 20) * 0.04;
      p.y += Math.sin(t * 0.9 + b.fase * 31) * 0.03;
      // não passa por cima do contador (lado direito do vão, perto do foco)
      const noTexto = this.tema === "beijo" ? p.x > -2.8 && p.x < 0.7 && p.z > -5 && p.z < 4 : p.x > -0.2 && p.x < 4.2 && p.z > -5 && p.z < 4;
      const sc = i < lim && !noTexto ? b.tam * g * vida * dens : 0;
      mt.compose(p, q, new THREE.Vector3(sc, sc, sc));
      this.parts.setMatrixAt(i, mt);
    });
    this.parts.instanceMatrix.needsUpdate = true;
  }

  render() {
    this.composer.render();
  }
}

/** Renderiza a faixa de saída e a de entrada e funde as duas (zoom contínuo, sem corte). */
class DuasCenas extends Pass {
  rtA: THREE.WebGLRenderTarget;
  rtB: THREE.WebGLRenderTarget;
  quad: FullScreenQuad;
  constructor(public m: Mundo, W: number, H: number) {
    super();
    this.needsSwap = false;
    const op = { type: THREE.HalfFloatType, samples: 4 } as const;
    this.rtA = new THREE.WebGLRenderTarget(W, H, op);
    this.rtB = new THREE.WebGLRenderTarget(W, H, op);
    this.quad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { a: { value: null }, b: { value: null }, mistura: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `uniform sampler2D a, b; uniform float mistura; varying vec2 vUv;
          void main(){ gl_FragColor = mix(texture2D(a, vUv), texture2D(b, vUv), mistura); }`,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }
  render(renderer: THREE.WebGLRenderer, _w: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const { de, para, mistura } = this.m.transicao;
    const { scene, camera } = this.m;
    this.m.mostra(de);
    renderer.setRenderTarget(this.rtA);
    renderer.clear();
    renderer.render(scene, camera);
    const mt = this.quad.material as THREE.ShaderMaterial;
    mt.uniforms.a.value = this.rtA.texture;
    mt.uniforms.mistura.value = 0;
    if (mistura > 0.001 && para !== de) {
      this.m.mostra(para);
      renderer.setRenderTarget(this.rtB);
      renderer.clear();
      renderer.render(scene, camera);
      mt.uniforms.b.value = this.rtB.texture;
      mt.uniforms.mistura.value = mistura;
    } else mt.uniforms.b.value = this.rtA.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    this.quad.render(renderer);
  }
}

function gradToon() {
  const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// profundidade de campo: o alfa da cena guarda o tamanho do borrão (0..1)
const DOF = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, maxR: { value: 20 }, forca: { value: 1 }, global: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float maxR, forca, global; varying vec2 vUv;
    void main(){
      vec4 c0 = texture2D(tDiffuse, vUv);
      float coc = clamp(c0.a*forca + global, 0.0, 1.0);
      float r = coc*maxR;
      if (r < 0.5) { gl_FragColor = c0; return; }
      vec3 s = vec3(0.0); float w = 0.0;
      for (int i = -8; i <= 8; i++) {
        float fi = float(i)/8.0;
        vec4 c = texture2D(tDiffuse, vUv + dir*fi*r);
        float cc = clamp(c.a*forca + global, 0.0, 1.0);
        // amostra nítida não espalha sobre a borrada
        float k = exp(-fi*fi*2.0) * mix(0.25, 1.0, smoothstep(0.0, 0.5, cc + 0.15));
        s += c.rgb*k; w += k;
      }
      gl_FragColor = vec4(s/w, c0.a);
    }`,
};

const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.2, 0.5, d) * 4.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) {
        float k = exp(-float(i*i)/24.0);
        s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k;
      }
      gl_FragColor = s / w;
    }`,
};

const FINAL = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 }, grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0 }, nitidez: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, nitidez; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // máscara de nitidez (unsharp) leve
      vec2 px = 1.0/res;
      vec3 bl = (texture2D(tDiffuse, vUv+vec2(px.x,0.)).rgb + texture2D(tDiffuse, vUv-vec2(px.x,0.)).rgb
               + texture2D(tDiffuse, vUv+vec2(0.,px.y)).rgb + texture2D(tDiffuse, vUv-vec2(0.,px.y)).rgb)*0.25;
      col = max(vec3(0.0), col + (col - bl)*nitidez);
      col += vec3(quente, quente*0.35, -quente);
      vec2 cc = vUv - 0.5;
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
