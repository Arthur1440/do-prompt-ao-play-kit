import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Dir, Kit } from "./kit";
import { LTOT, ptCaminho, RI, RM, V0, V3, XC, XF, ZF, ZQ } from "./geo";
import { clamp, lerp, quique, rng } from "./rng";
import { texMadeira } from "./tex";
import { texCeuMorro } from "./tex3";
import { altura, BX0, BX1, BY0, BZ0, BZ1, Cortes, pedras, tampaSombra, Terreno } from "./terreno";
import { Casa, montaCasa, P_CAMA, P_PESSOA } from "./casa";
import { bussola, calorOndas, ceuObjs, chuva, desumidificador, escavadeira, fumaca, gotas, lama, naParede, poeVegetacao, poseEscavadeira, regua, torroes, vegetacao, vizinhos } from "./props";

export type Escav = { vis: number; x: number; z: number; ry: number; giro: number; aL: number; aB: number; aC: number; cheia: number };
export type Jato = { t: number; de: V3; para: V3; n: number; dur: number; seed: number }; // torrões em voo
export type Estado = {
  cam: { pos: V3; alvo: V3; fov: number; rolo?: number };
  foco?: number;
  terra: number;
  buraco: number;
  moveis: number;
  luzCasa: number;
  amb: number;
  chuva: number;
  ceuChuva: number;
  lamaTeto: number;
  lamaCai: number;
  conc: number;
  setas: number;
  vigas: number;
  pessoa: number;
  agua: number;
  pingo: number;
  manta: number;
  franja: number;
  cresce: number;
  escav?: Escav;
  jatos: Jato[];
  porta: number;
  tunel?: number;
  fech?: number;
  frente: number;
  vidro: number;
  sala: number;
  extras: number;
  fumaca: number;
  sol?: V3;
  solEsc?: number;
  solArco: number;
  bussola: number;
  tubos: number;
  raio: number;
  luzTubo: number;
  luzTubo2: number;
  suor: number;
  seca: number;
  arUmido: number;
  desu: number;
  desuLiga: number;
  vizinhos: number;
  calor: number;
  calorSolo: number;
  frio: number;
  regua: number;
  tempoQ?: number;
  wire?: number;
  part?: number;
  tFix?: number;
};

export const LARANJA = new THREE.Color("#FF6B2C");
const TINTA = new THREE.Color("#0B1026");
export const P_DESU: V3 = [XC + 0.22, 0.025, ZQ + 0.3];

// ---------------------------------------------------------------------------- pós
const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.17, 0.52, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) { float k = exp(-float(i*i)/24.0); s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k; }
      gl_FragColor = s / w;
    }`,
};
const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, contraste: { value: 1.0 }, sat: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, contraste, sat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat);
      col = (col - 0.5) * contraste + 0.5;
      col += vec3(quente, quente*0.35, -quente);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export class Mundo {
  dir: Dir;
  kit: Kit;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  bokeh?: BokehPass;
  tiltH?: ShaderPass;
  tiltV?: ShaderPass;
  final: ShaderPass;
  sol: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  contra: THREE.DirectionalLight;
  envInt = 0;
  ceu!: THREE.Mesh;
  ceuEsc!: THREE.Mesh;
  fundo: THREE.Object3D[] = [];
  terreno: Terreno;
  cortes: Cortes;
  casa: Casa;
  veg: ReturnType<typeof vegetacao>;
  esc: ReturnType<typeof escavadeira>;
  torr: THREE.InstancedMesh;
  chuvaIm: THREE.InstancedMesh;
  lamaO: ReturnType<typeof lama>;
  got: ReturnType<typeof gotas>;
  desu: ReturnType<typeof desumidificador>;
  viz: ReturnType<typeof vizinhos>;
  reg: THREE.Group;
  bus: THREE.Mesh;
  ceuO: ReturnType<typeof ceuObjs>;
  fum: THREE.Mesh[];
  ondas: THREE.Sprite[];
  setas: THREE.Mesh[] = [];
  terrenoWire!: THREE.LineSegments;
  part!: THREE.Points;
  partBase!: Float32Array;
  wireAtivo = false;
  originais = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  invis!: THREE.MeshBasicMaterial;
  linha!: THREE.LineBasicMaterial;
  bgOrig: THREE.Color | THREE.Texture | null = null;
  pedrasIm: THREE.InstancedMesh;
  lastVeg = "";

  constructor(canvas: HTMLCanvasElement, dir: Dir, W: number, H_: number) {
    this.dir = dir;
    const A = dir === "A", B = dir === "B", C = dir === "C";
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H_, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = C ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = B ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = C ? 1.05 : 1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    this.kit = new Kit(dir, W, H_);
    this.camera = new THREE.PerspectiveCamera(30, W / H_, 0.03, 200);

    if (A || C) {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.envInt = A ? 0.45 : 0.3;
      this.scene.environmentIntensity = this.envInt;
    }
    // sol do noroeste (no hemisfério sul o sol passa pelo norte): ilumina a fachada (norte) e o corte (oeste)
    this.sol = new THREE.DirectionalLight(A ? 0xffcf9a : C ? 0xffe2c0 : 0xffffff, A ? 3.3 : C ? 2.7 : 2.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(4096, 4096);
    this.sol.shadow.bias = C ? -0.0008 : -0.0004;
    this.sol.shadow.normalBias = 0.015;
    if (C) (this.sol.shadow.radius = 7), (this.sol.shadow.blurSamples = 16);
    Object.assign(this.sol.shadow.camera, { left: -4.6, bottom: -4.6, right: 4.6, top: 4.6, near: 0.5, far: 40 });
    this.hemi = new THREE.HemisphereLight(A ? 0xcfe0ff : B ? 0xffffff : 0xdfe8f5, A ? 0x8a5a3a : B ? 0x99887a : 0x9c7a58, A ? 0.85 : B ? 1.45 : 0.8);
    this.contra = new THREE.DirectionalLight(A ? 0xffe2b8 : C ? 0xcfdcff : 0xfff2dd, A ? 1.2 : C ? 0.9 : 1.2);
    this.contra.position.set(5, 4, -6);
    this.scene.add(this.sol, this.sol.target, this.hemi, this.contra);

    this.montaFundo();
    this.terreno = new Terreno(this.kit, this.scene);
    this.cortes = new Cortes(this.kit, this.scene);
    this.pedrasIm = pedras(this.kit, this.scene);
    tampaSombra(this.scene);
    this.casa = montaCasa(this.kit, this.scene);
    this.veg = vegetacao(this.kit, this.scene);
    this.esc = escavadeira(this.kit, this.scene);
    this.torr = torroes(this.kit, this.scene);
    this.chuvaIm = chuva(this.kit, this.scene);
    this.lamaO = lama(this.kit, this.scene);
    this.got = gotas(this.kit, this.scene);
    this.desu = desumidificador(this.kit, this.scene);
    this.viz = vizinhos(this.kit, this.scene);
    this.reg = regua(this.kit, this.scene);
    this.bus = bussola(this.kit, this.scene);
    this.bus.position.set(XF + 0.5, 0.012, 1.9);
    this.bus.scale.setScalar(0.8);
    this.ceuO = ceuObjs(this.kit, this.scene);
    this.fum = fumaca(this.kit, this.scene);
    this.ondas = calorOndas(this.scene);
    this.montaSetas();
    this.invis = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.linha = new THREE.LineBasicMaterial({ color: LARANJA.clone().multiplyScalar(1.7), toneMapped: false });

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H_, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H_);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (C) {
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 8, aperture: 0.002, maxblur: 0.008 });
      this.composer.addPass(this.bokeh);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H_ / 2), A ? 0.22 : B ? 0.25 : 0.2, A ? 0.6 : B ? 0.25 : 0.5, A ? 0.9 : B ? 0.97 : 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    if (A) {
      this.tiltH = new ShaderPass(TILT);
      this.tiltH.uniforms.dir.value.set(1 / W, 0);
      this.tiltV = new ShaderPass(TILT);
      this.tiltV.uniforms.dir.value.set(0, 1 / H_);
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }
    this.final = new ShaderPass(FINAL);
    const u = this.final.uniforms;
    u.res.value.set(W, H_);
    if (A) (u.grao.value = 0.035), (u.vinheta.value = 0.45), (u.quente.value = 0.025);
    if (B) (u.grao.value = 0), (u.vinheta.value = 0.18), (u.sat.value = 1.05);
    if (C) (u.grao.value = 0.014), (u.vinheta.value = 0.34), (u.quente.value = 0.03), (u.sat.value = 1.12), (u.contraste.value = 1.05);
    this.composer.addPass(this.final);
    this.montaParticulas();
  }

  // --------------------------------------------------------------- céu e mesa
  montaFundo() {
    const d = this.dir, k = this.kit;
    const A = d === "A", B = d === "B";
    const add = (o: THREE.Object3D) => (this.scene.add(o), this.fundo.push(o), o);
    const dome = (chuva: boolean) => {
      const m = new THREE.MeshBasicMaterial({ map: texCeuMorro(d, chuva), side: THREE.BackSide, transparent: chuva, opacity: chuva ? 0 : 1, depthWrite: false, fog: false });
      const me = new THREE.Mesh(new THREE.SphereGeometry(45, 48, 32), m);
      me.renderOrder = chuva ? -9 : -10;
      me.userData.semWire = true;
      return add(me) as THREE.Mesh;
    };
    this.ceu = dome(false);
    this.ceuEsc = dome(true);
    if (A) {
      // a maquete fica numa tábua de base sobre uma mesa de madeira
      const mt = texMadeira(true);
      mt.repeat.set(5, 5);
      const mesa = k.m(new THREE.PlaneGeometry(70, 70).rotateX(-Math.PI / 2), k.mat({ color: 0xffffff, map: mt, rough: 0.55, clear: 0.3 }), 0, undefined, [0, BY0 - 0.06, 0]);
      mesa.castShadow = false;
      add(mesa);
      const tb = texMadeira(false, false);
      tb.repeat.set(2, 1);
      const base = k.m(new THREE.BoxGeometry(BX1 - BX0 + 0.16, 0.06, BZ1 - BZ0 + 0.16), k.mat({ color: 0x8a5a36, map: tb, rough: 0.5, clear: 0.4 }), 0, undefined, [(BX0 + BX1) / 2, BY0 - 0.03, (BZ0 + BZ1) / 2]);
      add(base);
    } else if (B) {
      const ch = k.m(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), k.mat({ color: 0xf6dfa6, semContorno: true }), 0, undefined, [0, BY0 - 0.001, 0]);
      ch.castShadow = false;
      add(ch);
    } else {
      // feltro no chão do estúdio de stop-motion
      const ch = k.m(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), k.mat({ color: 0x8aa37a, rough: 1, bump: 0.6 }), 0, undefined, [0, BY0 - 0.001, 0]);
      ch.castShadow = false;
      add(ch);
    }
  }

  // setas laranja: o peso do morro desce pelo arco até as paredes e o chão (na face do corte)
  montaSetas() {
    const mat = new THREE.MeshBasicMaterial({ color: LARANJA.clone().multiplyScalar(1.25), toneMapped: false, transparent: true, depthTest: false });
    for (const lado of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      // do alto do arco, descendo pela curva, pela parede, até o chão
      for (let i = 0; i <= 30; i++) {
        const a = Math.PI / 2 - lado * (i / 30) * (Math.PI / 2) * 0.98;
        const r = (RI + RM) / 2 + 0.06;
        pts.push(new THREE.Vector3(XC - 0.03, V0 + Math.sin(a) * r + 0.1 * (1 - i / 30), ZQ + Math.cos(a) * r));
      }
      pts.push(new THREE.Vector3(XC - 0.03, -0.12, ZQ + lado * ((RI + RM) / 2 + 0.06)));
      const curva = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curva, 80, 0.018, 8, false);
      const me = new THREE.Mesh(g, mat.clone());
      me.renderOrder = 20;
      me.userData.semWire = true;
      me.userData.curva = curva;
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 16), (me.material as THREE.Material));
      ponta.renderOrder = 20;
      me.add(ponta);
      me.userData.ponta = ponta;
      this.scene.add(me);
      this.setas.push(me);
    }
    // carga do morro em cima (três setas descendo)
    for (let i = 0; i < 3; i++) {
      const z = ZQ + (i - 1) * 0.28;
      const g = new THREE.CylinderGeometry(0.016, 0.016, 0.3, 8);
      const me = new THREE.Mesh(g, mat.clone());
      me.position.set(XC - 0.03, 1.12, z);
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 16), me.material as THREE.Material);
      ponta.position.y = -0.19;
      ponta.rotation.x = Math.PI;
      me.add(ponta);
      me.renderOrder = 20;
      me.userData.semWire = true;
      me.userData.carga = true;
      this.scene.add(me);
      this.setas.push(me);
    }
  }

  montaParticulas() {
    const N = 3200;
    const pos = new Float32Array(N * 3);
    const r = rng(77);
    for (let i = 0; i < N; i++) {
      let x: number, z: number, y: number;
      if (i % 3 === 0) {
        const s = r() * LTOT;
        const [px, , pz] = ptCaminho(s, (r() - 0.5) * 2 * RI);
        x = px;
        z = pz;
        y = r() * (V0 + RI);
      } else {
        x = XC + r() * 4.2;
        z = -2.2 + r() * 4.4;
        y = altura(x, z) * (0.7 + 0.3 * r());
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    this.partBase = pos.slice();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: LARANJA.clone().multiplyScalar(2), size: 0.03, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.part = new THREE.Points(g, m);
    this.part.visible = false;
    this.part.frustumCulled = false;
    this.scene.add(this.part);
    // grade de arame do morro (para a virada)
    const lp: number[] = [];
    const NX = 36, NZ = 30;
    const P = (i: number, j: number): V3 => {
      const x = BX0 + ((BX1 - BX0) * i) / NX, z = BZ0 + ((BZ1 - BZ0) * j) / NZ;
      return [x, altura(x, z) + 0.004, z];
    };
    for (let i = 0; i <= NX; i++)
      for (let j = 0; j <= NZ; j++) {
        if (i < NX) lp.push(...P(i, j), ...P(i + 1, j));
        if (j < NZ) lp.push(...P(i, j), ...P(i, j + 1));
      }
    const gw = new THREE.BufferGeometry();
    gw.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    this.terrenoWire = new THREE.LineSegments(gw, new THREE.LineBasicMaterial({ color: LARANJA.clone().multiplyScalar(1.1), toneMapped: false, transparent: true, opacity: 0.55 }));
    this.terrenoWire.visible = false;
    this.terrenoWire.userData.semWire = true;
    this.scene.add(this.terrenoWire);
  }

  // --------------------------------------------------------------- aplica o estado
  aplica(e: Estado, tReal: number) {
    const d = this.dir, c = this.casa, k = this.kit;
    const A = d === "A", B = d === "B", C = d === "C";
    // stop-motion: a massinha anda "em dois" (12 poses por segundo) e treme a cada pose
    const t = C ? Math.floor(tReal * 12) / 12 : tReal;
    k.uBoil.value = C ? Math.floor(tReal * 12) % 64 : 0;
    const cm = e.cam;
    this.camera.position.set(...cm.pos);
    this.camera.up.set(Math.sin(cm.rolo ?? 0), Math.cos(cm.rolo ?? 0), 0);
    this.camera.lookAt(...cm.alvo);
    this.camera.fov = cm.fov;
    this.camera.updateProjectionMatrix();

    // ---- luz: sol do noroeste; na chuva o céu fecha
    const ch = clamp(e.ceuChuva);
    const centro = new THREE.Vector3(0.9, 0.3, 0.2);
    const dirSol = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
    this.sol.position.copy(centro).addScaledVector(dirSol, 12);
    this.sol.target.position.copy(centro);
    this.sol.intensity = lerp(A ? 3.3 : C ? 2.7 : 2.6, A ? 0.7 : 0.9, ch);
    this.hemi.intensity = lerp(A ? 0.85 : B ? 1.45 : 0.8, A ? 0.55 : B ? 0.95 : 0.55, ch);
    (this.ceuEsc.material as THREE.MeshBasicMaterial).opacity = ch;
    if (this.scene.environment) this.scene.environmentIntensity = this.envInt * (1 - 0.5 * ch);
    k.uAmb.value = clamp(e.amb, 0.04, 1);

    // ---- terreno, cortes, vegetação
    const terra = clamp(e.terra);
    const mudou = this.terreno.atualiza(terra);
    if (mudou) this.cortes.atualiza(terra);
    const chaveVeg = `${terra.toFixed(4)}|${e.franja.toFixed(3)}|${e.cresce.toFixed(3)}`;
    if (chaveVeg !== this.lastVeg) {
      this.lastVeg = chaveVeg;
      poeVegetacao(this.veg, terra, clamp(e.franja), clamp(e.cresce));
    }
    const U = this.cortes.uniforms;
    U.uBuraco.value = e.buraco > 0.01 ? lerp(0.08, e.conc > 0.5 ? RM : RI + 0.004, clamp(e.buraco)) * (e.buraco < 1 ? clamp(e.buraco * 1.5) : 1) : 0;
    if (e.conc > 0.5) U.uBuraco.value = RM;
    U.uTubo.value = e.tubos > 0.6 ? 1 : 0;
    U.uLama.value = clamp(e.lamaTeto);
    U.uAgua.value = e.agua;
    U.uCalor.value = clamp(e.calorSolo);
    U.uTempo.value = t;
    U.uFrio.value = clamp(e.frio);

    // ---- túnel de terra e lama
    c.tunel.visible = ((e.tunel ?? 0) > 0.5 || e.buraco > 0.01) && e.conc < 0.5;
    (c.matTerra as THREE.MeshStandardMaterial).color.copy(c.corTerra).lerp(new THREE.Color(0x2e1d12), clamp(e.lamaTeto) * 0.8);
    const lm = this.lamaO;
    lm.g.visible = e.lamaTeto > 0.01 && e.conc < 0.5;
    if (lm.g.visible) {
      const xC = P_CAMA[0], zC = P_CAMA[2];
      const yTeto = V0 + RI - 0.02;
      const cai = clamp(e.lamaCai);
      // barriga de lama: verga do teto, estica e despenca inteira
      const sag = clamp(e.lamaTeto);
      const yCama = 0.215;
      const zL = zC + 0.04;
      const solta = clamp(cai * 4);
      lm.teto.visible = solta < 1;
      lm.teto.position.set(xC, yTeto - 0.01 - 0.03 * sag, zL);
      lm.teto.scale.set(Math.max(0.001, sag), Math.max(0.001, sag * (1 + 0.8 * sag) * (1 - solta)), Math.max(0.001, sag));
      const q0 = clamp(cai / 0.62);
      const massa = lm.bolos[0];
      massa.visible = cai > 0.001 && q0 < 1;
      massa.position.set(xC, lerp(yTeto - 0.09, yCama + 0.05, q0 * q0), zL);
      massa.scale.set(1 - 0.15 * q0, 1 + 0.45 * q0, 1 - 0.15 * q0);
      // respingos que saltam quando bate
      const qb = clamp((cai - 0.6) / 0.4);
      lm.bolos.slice(1).forEach((b) => {
        const o = b.userData.o as V3;
        b.visible = qb > 0.001 && qb < 1;
        b.position.set(xC + o[0] * qb, yCama + 0.04 + Math.sin(qb * Math.PI) * (0.08 + o[1] * 0.3), zL + o[2] * qb);
      });
      lm.espirro.visible = cai > 0.6;
      lm.espirro.position.set(xC, yCama + 0.01, zL);
      lm.espirro.scale.setScalar(Math.max(0.001, quique(clamp((cai - 0.6) / 0.4))));
    }

    // ---- concreto, setas e vigas
    const cq = clamp(e.conc);
    c.concreto.visible = cq > 0.001;
    if (c.concreto.visible) {
      const q = clamp(cq / 0.6);
      const queda = Math.pow(1 - q, 2) * 2.2;
      const sq = cq < 0.6 ? 1 : 1 + Math.sin(((cq - 0.6) / 0.4) * Math.PI * 2.5) * Math.exp(-(cq - 0.6) * 8) * 0.06;
      c.concreto.position.y = queda;
      c.concreto.scale.set(1, sq, 1);
    }
    c.cumeeira.visible = e.vigas > 0.95;
    c.vigas.forEach((v, i) => {
      const s = v.userData.s as number;
      const kk = clamp(e.vigas * 1.6 - (1 - s / LTOT) * 0.6 - 0.0 * i);
      v.visible = kk > 0.01;
      v.scale.setScalar(1);
      v.position.y = (1 - quique(kk)) * 0.05;
    });
    const st = clamp(e.setas);
    this.setas.forEach((s, i) => {
      s.visible = st > 0.01;
      const m = s.material as THREE.MeshBasicMaterial;
      m.opacity = clamp(st * 3) * (1 - clamp((st - 0.92) / 0.08));
      if (s.userData.carga) {
        const q = clamp(st * 2.2 - (i - 2) * 0.12);
        s.position.y = 1.32 - q * 0.2;
        s.scale.setScalar(Math.max(0.001, q));
      } else {
        const g = s.geometry as THREE.TubeGeometry;
        const q = clamp((st - 0.2) / 0.55);
        g.setDrawRange(0, Math.floor(q * (g.index ? g.index.count : 0) / 6) * 6);
        const curva = s.userData.curva as THREE.CatmullRomCurve3;
        const p = curva.getPointAt(Math.max(0.001, q));
        const tg = curva.getTangentAt(Math.max(0.001, q));
        const pt = s.userData.ponta as THREE.Mesh;
        pt.position.copy(p);
        pt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg);
        pt.visible = q > 0.02;
      }
    });

    // ---- manta: desenrola ao longo do caminho (com o rolo na ponta)
    c.manta.visible = e.manta > 0.001;
    c.uManta.value = clamp(e.manta);
    c.rolo.visible = e.manta > 0.001 && e.manta < 0.995;
    if (c.rolo.visible) {
      const s = clamp(e.manta) * LTOT;
      const [x, , z] = ptCaminho(s);
      const [x2, , z2] = ptCaminho(Math.min(LTOT, s + 0.01));
      c.rolo.position.set(x, V0 + RM + 0.05, z);
      c.rolo.rotation.set(0, Math.atan2(x2 - x, z2 - z) + Math.PI / 2, 0);
      c.rolo.rotateZ(Math.PI / 2);
    }

    // ---- móveis, pessoa, luzes de dentro
    const mv = clamp(e.moveis);
    c.moveis.visible = mv > 0.01;
    c.moveis.scale.setScalar(1);
    c.cama.scale.setScalar(Math.max(0.001, quique(mv)));
    c.pessoa.visible = e.pessoa > 0.01;
    c.pessoa.scale.setScalar(Math.max(0.001, quique(clamp(e.pessoa))));
    const casaLuz = clamp(e.luzCasa);
    c.luzAbajur.intensity = casaLuz * (A ? 1.6 : B ? 1.2 : 1.5);
    (c.cupula.material as THREE.MeshStandardMaterial).emissiveIntensity = casaLuz * 1.6;
    c.sala.visible = mv > 0.01;
    c.luzFogo.intensity = clamp(e.sala) * (A ? 1.3 : 1.0) * (0.85 + 0.15 * Math.sin(t * 13));
    c.fogo.visible = e.sala > 0.05;
    c.fogo.scale.set(1, 0.8 + 0.15 * Math.sin(t * 17), 0.5);

    // ---- porta, frente, vidro, extras
    const fr = c.frente;
    const pq = clamp(e.porta);
    fr.porta.visible = pq > 0.001;
    fr.porta.position.y = 0.235 + Math.pow(1 - clamp(pq / 0.6), 2) * 0.95 + Math.sin(t * 4) * 0.02 * (1 - clamp(pq / 0.3));
    const sqp = pq < 0.6 ? 1 : 1 + Math.sin(((pq - 0.6) / 0.4) * Math.PI * 2.5) * Math.exp(-(pq - 0.6) * 8) * 0.18;
    fr.porta.scale.set(2 - sqp, sqp, 1);
    fr.degraus.visible = pq > 0.6;
    const fq = clamp(e.frente);
    fr.fech.visible = fq < 0.05 && ((e.fech ?? 0) > 0.5 || e.buraco > 0.01);
    fr.cacos.forEach((cc) => {
      cc.visible = fq > 0.001 && fq < 0.999;
      const v = cc.userData.v as V3, p0 = cc.userData.p0 as THREE.Vector3;
      const tt = fq * 1.1;
      cc.position.set(p0.x + v[0] * tt * 0.5, Math.max(0.03, p0.y + v[1] * tt * 0.6 - 4.9 * tt * tt * 0.5), p0.z + v[2] * tt * 0.6);
      cc.rotation.x = tt * 6;
    });
    const vq = clamp(e.vidro);
    fr.vidroG.visible = vq > 0.001;
    fr.pecasVidro.forEach((p, i) => {
      const q = clamp(vq * 1.8 - i * 0.2);
      p.visible = q > 0.001;
      const base = (p.userData.y0 ??= p.position.y) as number;
      p.position.y = base + Math.pow(1 - clamp(q / 0.6), 2) * 1.2;
      const s = q < 0.6 ? 1 : 1 + Math.sin(((q - 0.6) / 0.4) * Math.PI * 2.5) * Math.exp(-(q - 0.6) * 8) * 0.12;
      p.scale.set(2 - s, s, 1);
    });
    fr.floreiras.forEach((f) => (f.visible = vq > 0.8 && e.extras > 0.01, f.scale.setScalar(Math.max(0.001, quique(clamp(e.extras * 2))))));
    const sala = clamp(e.sala);
    fr.luzSala.intensity = sala * (A ? 1.4 : 1.1);
    (fr.matVidro as THREE.MeshStandardMaterial).emissiveIntensity = sala * 0.55;
    const ex = clamp(e.extras);
    for (const o of [fr.cerca, fr.correio, fr.caminho]) {
      o.visible = ex > 0.01;
      o.scale.setScalar(Math.max(0.001, quique(clamp(ex * 1.5))));
    }
    // fumaça da chaminé (algodão subindo)
    c.chamine.visible = e.fumaca > 0.001 || e.extras > 0.01;
    const hc = c.chamine.position.y + 0.17;
    this.fum.forEach((b, i) => {
      b.visible = e.fumaca > 0.01;
      const f = ((t * 0.32 + (b.userData.f as number) + i / this.fum.length) % 1);
      b.position.set(c.chamine.position.x + Math.sin(f * 5 + i) * 0.04 + f * 0.25, hc + f * 0.9, c.chamine.position.z - f * 0.12);
      b.scale.setScalar(Math.max(0.001, (0.6 + f * 1.6) * Math.sin(Math.min(1, f * 1.2) * Math.PI) * clamp(e.fumaca)));
    });

    // ---- tubos de luz
    const tq = clamp(e.tubos);
    c.tubos.forEach((tb, i) => {
      const q = clamp(tq * 1.5 - i * 0.35);
      tb.g.visible = q > 0.001;
      tb.g.position.y = Math.pow(1 - clamp(q / 0.6), 2) * 1.6;
      const s = q < 0.6 ? 1 : 1 + Math.sin(((q - 0.6) / 0.4) * Math.PI * 2.5) * Math.exp(-(q - 0.6) * 8) * 0.1;
      tb.g.scale.set(2 - s, s, 2 - s);
      const L = i === 0 ? clamp(e.luzTubo) : clamp(e.luzTubo2);
      (tb.disco.material as THREE.MeshBasicMaterial).color.setRGB(0.55 + 1.6 * L, 0.52 + 1.5 * L, 0.45 + 1.2 * L);
      (tb.cone.material as THREE.MeshBasicMaterial).opacity = L * (B ? 0.14 : 0.18);
    });
    c.uRaio.value = clamp(e.raio);
    (c.raioMat as THREE.ShaderMaterial).uniforms.uT.value = t;
    if (c.tubos[0].raio) c.tubos[0].raio.visible = e.raio > 0.001;
    c.luzTubo.intensity = clamp(e.luzTubo) * (A ? 2.6 : B ? 2.0 : 2.4);
    c.luzTubo2.intensity = clamp(e.luzTubo2) * (A ? 2.6 : B ? 2.0 : 2.4);

    // ---- escavadeira e torrões
    const es = e.escav;
    this.esc.g.visible = !!es && es.vis > 0.01;
    if (es) {
      this.esc.g.position.set(es.x, 0, es.z);
      this.esc.g.rotation.y = es.ry;
      poseEscavadeira(this.esc, es.giro, es.aL, es.aB, es.aC, es.cheia);
    }
    {
      const mt = new THREE.Matrix4();
      let n = 0;
      for (const j of e.jatos) {
        const r = rng(j.seed);
        for (let i = 0; i < j.n && n < this.torr.count; i++) {
          const atraso = r() * 0.25;
          const q = (t - j.t - atraso) / j.dur;
          const sx = (r() - 0.5) * 0.5, sz = (r() - 0.5) * 0.5, up = 0.4 + r() * 0.6, s = 0.012 + r() * 0.022;
          if (q < 0 || q > 1.15) continue;
          const qq = Math.min(1, q);
          const x = lerp(j.de[0], j.para[0] + sx, qq), z = lerp(j.de[2], j.para[2] + sz, qq);
          const y = lerp(j.de[1], j.para[1], qq) + Math.sin(qq * Math.PI) * up;
          mt.compose(new THREE.Vector3(x, Math.max(y, 0.0), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(q * 8 + i, q * 5, i)), new THREE.Vector3(s, s * 0.8, s));
          this.torr.setMatrixAt(n++, mt);
        }
      }
      for (let i = n; i < this.torr.count; i++) this.torr.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      this.torr.instanceMatrix.needsUpdate = true;
      this.torr.visible = n > 0;
    }

    // ---- chuva
    const cv = clamp(e.chuva);
    this.chuvaIm.visible = cv > 0.02;
    if (this.chuvaIm.visible) {
      const mt = new THREE.Matrix4();
      for (let i = 0; i < this.chuvaIm.count; i++) {
        const r = rng(2000 + i);
        const per = 0.4 + r() * 0.2;
        const ph = (t / per + r()) % 1;
        const x = XC + 0.2 + r() * 4.4, z = -2.4 + r() * 5.4;
        const chao = altura(x, z, clamp(e.terra));
        const y = lerp(3.6, chao, ph);
        const on = r() < cv ? 1 : 0;
        mt.compose(new THREE.Vector3(x - ph * 0.15, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.09)), new THREE.Vector3(1, 1, 1).multiplyScalar(on));
        this.chuvaIm.setMatrixAt(i, mt);
      }
      this.chuvaIm.instanceMatrix.needsUpdate = true;
    }

    // ---- pingo na cabeça
    const g = this.got;
    const pg = clamp(e.pingo);
    const cab = new THREE.Vector3(P_PESSOA[0], P_PESSOA[1] + 0.41, P_PESSOA[2]);
    const yT = V0 + RI - 0.03;
    g.pingo.visible = pg > 0.001 && pg < 0.82;
    if (g.pingo.visible) {
      const forma = clamp(pg / 0.35);
      const q = clamp((pg - 0.35) / 0.45);
      g.pingo.position.set(cab.x, lerp(yT - 0.01 * forma, cab.y + 0.02, q * q), cab.z);
      g.pingo.scale.set(forma, forma * (1.3 + 0.4 * q), forma);
    }
    g.respingo.visible = pg >= 0.8 && pg < 1;
    g.respingo.children.forEach((s, i) => {
      const q = clamp((pg - 0.8) / 0.2);
      const a = (i / 6) * Math.PI * 2;
      s.position.set(cab.x + Math.cos(a) * q * 0.09, cab.y + 0.03 + Math.sin(q * Math.PI) * 0.06, cab.z + Math.sin(a) * q * 0.09);
    });
    // suor da parede e ar úmido
    const su = clamp(e.suor) * (1 - clamp(e.seca));
    g.suor.visible = su > 0.01;
    if (g.suor.visible) {
      const mt = new THREE.Matrix4();
      g.baseSuor.forEach((b, i) => {
        const escorre = clamp(e.suor * 1.4 - 0.4) * ((t * 0.08 + b.v) % 1) * 0.5;
        const [x, y, z] = naParede(b.x, b.a + escorre);
        const s = Math.max(0.0001, su * b.s * clamp(e.suor * 2 - b.v * 0.6));
        mt.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.4, s));
        g.suor.setMatrixAt(i, mt);
      });
      g.suor.instanceMatrix.needsUpdate = true;
    }
    const au = clamp(e.arUmido);
    g.ar.visible = au > 0.01;
    if (g.ar.visible) {
      const mt = new THREE.Matrix4();
      for (let i = 0; i < g.ar.count; i++) {
        const r = rng(400 + i);
        const f = (t * 0.25 + r()) % 1;
        // entra pelo meio do quarto e encosta na parede fria (lado norte)
        const suga = clamp(e.desuLiga);
        const de = new THREE.Vector3(-0.4 - r() * 0.5, 0.2 + r() * 0.3, ZQ - 0.2 + r() * 0.2);
        const para = suga > 0.5 ? new THREE.Vector3(P_DESU[0], 0.12, P_DESU[2]) : new THREE.Vector3(XC + 0.1 + r() * 0.5, 0.45 + r() * 0.15, ZQ + 0.38);
        const p = de.lerp(para, f);
        p.y += Math.sin(f * 9 + i) * 0.02;
        mt.compose(p, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(au * Math.sin(f * Math.PI) * (0.7 + r() * 0.8)));
        g.ar.setMatrixAt(i, mt);
      }
      g.ar.instanceMatrix.needsUpdate = true;
    }
    // desumidificador
    const dq = clamp(e.desu);
    this.desu.g.visible = dq > 0.001;
    this.desu.g.position.set(P_DESU[0], P_DESU[1] + Math.pow(1 - clamp(dq / 0.6), 2) * 0.9, P_DESU[2]);
    const sd = dq < 0.6 ? 1 : 1 + Math.sin(((dq - 0.6) / 0.4) * Math.PI * 2.5) * Math.exp(-(dq - 0.6) * 8) * 0.2;
    this.desu.g.scale.set(2 - sd, sd, 2 - sd);
    this.desu.g.rotation.y = Math.PI / 2;
    (this.desu.led.material as THREE.MeshBasicMaterial).color.setRGB(0.2 + 0.4 * e.desuLiga, 0.4 + 0.6 * e.desuLiga, 0.6 + 0.9 * e.desuLiga);
    this.desu.agua.scale.set(1, Math.max(0.05, clamp(e.seca)), 1);
    this.desu.agua.position.y = 0.006 + 0.025 * clamp(e.seca);

    // ---- vizinhos, calor, ar no máximo
    const vz = clamp(e.vizinhos);
    this.viz.forEach((v, i) => {
      const q = clamp(vz * 1.6 - i * 0.3);
      v.g.visible = q > 0.001;
      v.g.scale.setScalar(Math.max(0.001, quique(q)));
      v.helice.rotation.z = t * 40 * clamp(e.calor * 2);
    });
    const cl = clamp(e.calor);
    this.ondas.forEach((s, i) => {
      const r = rng(900 + i);
      const f = (t * 0.35 + r()) % 1;
      const casa = this.viz[i % 2].g.position;
      s.visible = cl > 0.01;
      s.position.set(casa.x + (r() - 0.5) * 0.7, 0.55 + f * 0.9, casa.z + (r() - 0.5) * 0.6);
      s.scale.set(0.35, 0.55, 1);
      (s.material as THREE.SpriteMaterial).opacity = cl * Math.sin(f * Math.PI) * 0.5;
    });

    // ---- régua, bússola, sol e arco
    this.reg.visible = e.regua > 0.01;
    this.reg.scale.set(1, Math.max(0.001, quique(clamp(e.regua))), 1);
    this.bus.visible = e.bussola > 0.01;
    this.bus.scale.setScalar(0.8 * Math.max(0.001, quique(clamp(e.bussola))));
    this.bus.rotation.y = (1 - clamp(e.bussola)) * 1.5;
    const so = this.ceuO;
    so.sol.visible = !!e.sol;
    if (e.sol) so.sol.position.set(...e.sol);
    so.sol.scale.setScalar(e.solEsc ?? 1);
    so.halo.material.opacity = 0.6 + 0.4 * Math.sin(t * 3) * 0.3;
    (so.arco.material as THREE.MeshBasicMaterial).opacity = clamp(e.solArco);
    so.arco.visible = e.solArco > 0.01;
    so.nuvens.forEach((n, i) => {
      n.position.x += 0;
      n.children.forEach((m) => ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).color?.setScalar(1 - ch * 0.55));
      n.position.y = [3.1, 3.5, 2.9, 3.9, 3.3][i] - ch * 0.5;
    });

    this.aplicaWire(e);
    this.final.uniforms.tempo.value = t;
    if (this.bokeh) {
      const dist = new THREE.Vector3(...cm.pos).distanceTo(new THREE.Vector3(...cm.alvo));
      (this.bokeh.uniforms as any).focus.value = dist;
      (this.bokeh.uniforms as any).aperture.value = 0.0024 * (6 / dist);
    }
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = e.foco ?? 0.5;
  }

  aplicaWire(e: Estado) {
    const w = e.wire ?? 0;
    const liga = w > 0.5;
    if (liga !== this.wireAtivo) {
      this.wireAtivo = liga;
      this.scene.traverse((o) => {
        if (o.userData.contorno) return void (o.visible = !liga);
        if (this.fundo.includes(o) || o.userData.corte) return void (o.visible = !liga);
        if (o === this.terreno.mesh) return void (o.visible = !liga);
        if ((o as THREE.Sprite).isSprite || o === this.part || o.userData.semWire || (o as THREE.LineSegments).isLineSegments || (o as THREE.Line).isLine) return;
        if ((o as THREE.InstancedMesh).isInstancedMesh) return void (o.visible = !liga);
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (liga) {
          this.originais.set(m, m.material);
          m.material = this.invis;
          let l = m.userData.linhas as THREE.LineSegments | undefined;
          if (!l) {
            l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), this.linha);
            l.userData.semWire = true;
            m.add(l);
            m.userData.linhas = l;
          }
          l.visible = true;
        } else if (this.originais.has(m)) {
          m.material = this.originais.get(m)!;
          if (m.userData.linhas) (m.userData.linhas as THREE.LineSegments).visible = false;
        }
      });
      this.terrenoWire.visible = liga;
      if (liga) {
        this.bgOrig = this.scene.background as THREE.Color;
        this.scene.background = TINTA.clone();
        this.renderer.shadowMap.enabled = false;
      } else {
        this.scene.background = this.bgOrig;
        this.renderer.shadowMap.enabled = true;
      }
    }
    if (liga) {
      this.setas.forEach((s) => (s.visible = false));
      this.ondas.forEach((s) => (s.visible = false));
      this.ceuO.sol.visible = false;
      this.ceuO.arco.visible = false;
      this.casa.tubos.forEach((tb) => ((tb.cone.visible = false), tb.raio && (tb.raio.visible = false)));
    } else this.casa.tubos.forEach((tb) => (tb.cone.visible = true));
    this.bloom.threshold = liga ? 0.5 : this.dir === "A" ? 0.9 : this.dir === "B" ? 0.97 : 0.92;
    this.bloom.strength = liga ? 0.8 : this.dir === "A" ? 0.22 : this.dir === "B" ? 0.25 : 0.2;
    this.final.uniforms.grao.value = liga ? 0 : this.dir === "A" ? 0.035 : this.dir === "C" ? 0.014 : 0;
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.forca.value = this.tiltV.uniforms.forca.value = liga ? 0.2 : 1;
    if (this.bokeh) (this.bokeh as any).enabled = !liga;
    const pa = e.part ?? 0;
    this.part.visible = liga && pa > 0.01;
    if (this.part.visible) {
      const at = this.part.geometry.attributes.position as THREE.BufferAttribute;
      const b = this.partBase;
      for (let i = 0; i < at.count; i++) {
        const k = pa * (0.3 + ((i * 7919) % 100) / 100);
        at.setXYZ(i, b[i * 3] + Math.sin(i * 1.7) * 0.9 * k, b[i * 3 + 1] + k * (0.6 + (i % 11) * 0.18), b[i * 3 + 2] + Math.cos(i * 2.3) * 0.9 * k);
      }
      at.needsUpdate = true;
    }
  }

  render() {
    this.composer.render();
  }
}
export { ZF, XF };
