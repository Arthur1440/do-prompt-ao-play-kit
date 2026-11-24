import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Dir, Kit, tubo, V3 } from "./kit";
import { clamp, lerp, quique, rng } from "./rng";
import { texMadeira } from "./tex";
import { texCeu } from "./tex2";
import { montaSitio, P, Sitio, TAB } from "./sitio";

export type Estado = {
  cam: { pos: V3; alvo: V3; fov: number; rolo?: number };
  foco?: number; // tilt-shift (A): 0 = base da tela, 1 = topo
  noite: number; // 0 = fim de tarde, 1 = noite
  solPos?: V3; // posição do sol de brinquedo (some se não houver)
  notas: number; // 0..1 queda das notas
  montes: number; // 0..1 a pilha se divide em quatro
  blocos: [number, number, number, number]; // peças "sem forma" subindo (0..1); viram a peça quando ela entra
  casa: number;
  sist: number;
  peixes: number;
  galinhas: number;
  horta: number;
  cist: number;
  placas: number;
  bat: number;
  ant: number;
  chuva: number;
  agua: number; // água correndo da calha para a cisterna
  solFluxo: number; // sol escorrendo para as placas e a bateria
  carga: number; // barra da bateria 0..1
  caboCasa: number; // bateria -> casa (à noite)
  adubo: number; // tanque -> horta
  feixeCeu: number; // feixe que "cai do céu" na antena
  feixeSat: number; // satélite -> antena
  sats: number; // 0 = fora; >0 passam (fase)
  lampada: number;
  geladeira: number;
  celular: number;
  corte: number; // casa em corte (parede da frente some)
  chamada: number; // tela do notebook com a chamada
  lampAntiga: number;
  galVar?: number; // galinha atravessando a varanda atrás do notebook
  caminhao?: { x: number; vis: number };
  realce?: { placas?: number; bat?: number; sist?: number; cist?: number; ant?: number };
  wire?: number;
  part?: number;
  tFix?: number;
};

const LARANJA = new THREE.Color("#FF6B2C");
const TINTA = new THREE.Color("#0B1026");

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
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, contraste: { value: 1.0 }, sat: { value: 1.0 }, fibra: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, contraste, sat, fibra; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    float hs(vec2 p){ return fract(sin(dot(p, vec2(41.31,17.17)))*43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hs(i),hs(i+vec2(1,0)),f.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x), f.y); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat);
      col = (col - 0.5) * contraste + 0.5;
      col += vec3(quente, quente*0.35, -quente);
      // fibra de papel parada (direção C)
      vec2 px = vUv * res;
      float fb = vn(px * vec2(0.012, 0.05)) * 0.6 + vn(px * 0.09) * 0.4;
      col *= 1.0 + (fb - 0.5) * fibra;
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

/** tubo com faixas que correm (fluxo de água, energia, sinal) */
function matFluxo(cor: THREE.ColorRepresentation, faixas = 6) {
  return new THREE.ShaderMaterial({
    uniforms: { cor: { value: new THREE.Color(cor) }, tempo: { value: 0 }, k: { value: 0 }, n: { value: faixas }, op: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 cor; uniform float tempo, k, n, op; varying vec2 vUv;
      void main(){
        if (vUv.x > k) discard;
        float b = fract(vUv.x * n - tempo * 1.6);
        float faixa = smoothstep(0.0, 0.25, b) * (1.0 - smoothstep(0.55, 0.9, b));
        float ponta = smoothstep(k - 0.06, k, vUv.x);
        float a = (0.45 + 0.55 * faixa + ponta * 0.8) * op;
        gl_FragColor = vec4(cor * (1.2 + faixa * 1.6 + ponta * 2.0), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

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
  s: Sitio;
  ceuDia!: THREE.Mesh;
  ceuNoite!: THREE.Mesh;
  fundo: THREE.Object3D[] = [];
  fluxos: Record<string, THREE.Mesh> = {};
  feixeSat!: THREE.Mesh;
  feixeCeu!: THREE.Mesh;
  part!: THREE.Points;
  partBase!: Float32Array;
  wireAtivo = false;
  originais = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  invis!: THREE.MeshBasicMaterial;
  linha!: THREE.LineBasicMaterial;
  bgOrig: THREE.Color | THREE.Texture | null = null;
  envInt = 0;

  constructor(canvas: HTMLCanvasElement, dir: Dir, W: number, H_: number) {
    this.dir = dir;
    const A = dir === "A", B = dir === "B", C = dir === "C";
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H_, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = C ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = B ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    this.kit = new Kit(dir, W, H_);
    this.camera = new THREE.PerspectiveCamera(30, W / H_, 0.05, 200);

    if (A || C) {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.envInt = A ? 0.45 : 0.22;
      this.scene.environmentIntensity = this.envInt;
    }

    // luz: sol quente (A), sol branco forte (B), luz macia de estúdio de papel (C)
    this.sol = new THREE.DirectionalLight(A ? 0xffcf9a : C ? 0xffe6c8 : 0xffffff, A ? 3.4 : C ? 3.0 : 2.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = C ? -0.0006 : -0.0004;
    this.sol.shadow.normalBias = 0.02;
    if (C) (this.sol.shadow.radius = 10), (this.sol.shadow.blurSamples = 16);
    Object.assign(this.sol.shadow.camera, { left: -5, bottom: -5, right: 5, top: 5, near: 0.5, far: 40 });
    this.hemi = new THREE.HemisphereLight(A ? 0xcfe0ff : B ? 0xffffff : 0xdfe6f2, A ? 0x8a5a3a : B ? 0x99887a : 0x9c7a58, A ? 0.9 : B ? 1.5 : 0.75);
    this.contra = new THREE.DirectionalLight(A ? 0xffe2b8 : C ? 0xdfe8ff : 0xfff2dd, A ? 1.6 : C ? 1.0 : 1.4);
    this.contra.position.set(-5, 4, -6);
    this.scene.add(this.sol, this.sol.target, this.hemi, this.contra);

    this.montaFundo();
    this.s = montaSitio(this.kit, this.scene);
    this.montaFluxos();
    this.invis = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.linha = new THREE.LineBasicMaterial({ color: LARANJA.clone().multiplyScalar(1.7), toneMapped: false });

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H_, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H_);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (C) {
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 8, aperture: 0.0016, maxblur: 0.009 });
      this.composer.addPass(this.bokeh);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H_ / 2), A ? 0.22 : B ? 0.25 : 0.3, A ? 0.6 : B ? 0.25 : 0.6, A ? 0.9 : B ? 0.97 : 0.9);
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
    if (C) (u.grao.value = 0.012), (u.vinheta.value = 0.34), (u.quente.value = 0.015), (u.fibra.value = 0.11), (u.sat.value = 1.08), (u.contraste.value = 1.06);
    this.composer.addPass(this.final);
    this.montaParticulas();
  }

  // --------------------------------------------------------------- céu, mesa, base
  montaFundo() {
    const d = this.dir, k = this.kit;
    const A = d === "A", B = d === "B", C = d === "C";
    const add = (o: THREE.Object3D) => (this.scene.add(o), this.fundo.push(o), o);
    const dome = (noite: boolean) => {
      const m = new THREE.MeshBasicMaterial({ map: texCeu(d, noite), side: THREE.BackSide, transparent: noite, opacity: noite ? 0 : 1, depthWrite: false, fog: false });
      const me = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 32), m);
      me.renderOrder = noite ? -9 : -10;
      me.userData.semWire = true;
      return add(me) as THREE.Mesh;
    };
    this.ceuDia = dome(false);
    this.ceuNoite = dome(true);
    const yBase = -0.505;
    if (A) {
      const mt = texMadeira(true);
      mt.repeat.set(4, 4);
      const mesa = k.m(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), k.mat({ color: 0xffffff, map: mt, rough: 0.55, clear: 0.3 }), 0, undefined, [0, yBase, 0]);
      mesa.castShadow = false;
      add(mesa);
    } else if (B) {
      const ch = k.m(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), k.mat({ color: 0xf6d58a, semContorno: true }), 0, undefined, [0, yBase, 0]);
      ch.castShadow = false;
      add(ch);
    } else {
      // mesa de papel kraft e morros recortados em camadas ao fundo
      const ch = k.m(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), k.mat({ color: 0xd8c3a0, rough: 1 }), 0, undefined, [0, yBase, 0]);
      ch.castShadow = false;
      add(ch);
      const morros = [
        { z: -7, y: yBase, cor: 0x8fb87a, h: 2.6, seed: 1 },
        { z: -10, y: yBase, cor: 0x76a26a, h: 3.6, seed: 2 },
        { z: -13, y: yBase, cor: 0x5f8a5e, h: 4.6, seed: 3 },
      ];
      for (const mo of morros) {
        const sh = new THREE.Shape();
        const r = rng(mo.seed * 17);
        sh.moveTo(-26, 0);
        for (let x = -26; x <= 26; x += 2) sh.lineTo(x, mo.h * (0.55 + 0.45 * Math.sin(x * 0.18 + mo.seed) * Math.cos(x * 0.07 + mo.seed * 2)) + r() * 0.25);
        sh.lineTo(26, 0);
        sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
        const me = k.m(g, k.mat({ color: mo.cor, rough: 1 }), 0, undefined, [0, mo.y, mo.z]);
        me.castShadow = true;
        add(me);
      }
    }
  }

  montaFluxos() {
    const sc = this.scene;
    const add = (nome: string, pts: V3[], r: number, cor: THREE.ColorRepresentation, n = 6) => {
      const me = new THREE.Mesh(tubo(pts, r, 64, 8), matFluxo(cor, n));
      me.renderOrder = 5;
      me.userData.semWire = true;
      me.frustumCulled = false;
      sc.add(me);
      this.fluxos[nome] = me;
      return me;
    };
    const pc = P.placas;
    // sol -> placas -> bateria (direção certa do ciclo de luz)
    add("sol", [[0.3, 4.0, -3.9], [0.5, 3.0, -2.4], [pc[0] + 0.1, pc[1] + 0.9, pc[2] - 0.4], [pc[0], pc[1] + 0.08, pc[2] + 0.05]], 0.05, 0xffb340, 8);
    add("placasBat", [[pc[0] + 0.35, pc[1] + 0.02, pc[2] + 0.2], [1.38, 1.06, -0.47], [P.bat[0] - 0.05, 0.9, P.bat[2] + 0.05], [P.bat[0] - 0.05, 0.68, P.bat[2]]], 0.03, 0xff8a3a, 5);
    add("batCasa", [[P.bat[0] - 0.05, 0.62, P.bat[2]], [P.bat[0] - 0.12, 0.42, P.bat[2]], [P.bat[0] - 0.2, 0.3, P.bat[2]], [P.casa[0] + 1.03, 0.3, P.bat[2]]], 0.03, 0xff8a3a, 4);
    // chuva do telhado -> calha -> cisterna
    const zB = P.casa[2] + 0.65 + 0.17, yB = 1.02, xCano = P.casa[0] - 1.18;
    add("agua", [[P.casa[0] + 1.0, yB, zB], [P.casa[0] - 0.2, yB - 0.01, zB], [xCano, yB, zB], [xCano - 0.05, yB - 0.25, zB - 0.08], [P.cist[0] + 0.32, 0.95, P.cist[2] + 0.25], [P.cist[0] + 0.12, 0.93, P.cist[2] + 0.08]], 0.045, 0x5fb8ff, 7);
    // tanque de tilápia -> horta (água adubada)
    add("adubo", [[P.tanque[0], 0.3, P.tanque[2]], [P.tanque[0] + 0.6, 0.3, P.tanque[2] + 0.05], [P.tanque[0] + 0.84, 0.12, P.tanque[2] + 0.08], [P.horta[0] - 0.62, 0.1, P.horta[2] + 0.12], [P.horta[0], 0.16, P.horta[2] + 0.12]], 0.035, 0x5fe0a0, 6);
    // feixes (cilindros orientados a cada quadro)
    const feixe = (cor: number) => {
      const g = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
      g.translate(0, 0.5, 0);
      const m = matFluxo(cor, 10);
      const me = new THREE.Mesh(g, m);
      // a geometria do cilindro tem uv.x em volta; troca para uv ao longo da altura
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
      me.renderOrder = 5;
      me.userData.semWire = true;
      me.frustumCulled = false;
      sc.add(me);
      return me;
    };
    this.feixeSat = feixe(0xbfe0ff);
    this.feixeCeu = feixe(0xcfe6ff);
  }

  orienta(me: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) {
    const d = b.clone().sub(a);
    me.position.copy(a);
    me.scale.set(r, d.length(), r);
    me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }

  montaParticulas() {
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const r = rng(77);
    // amostras sobre as peças (para a virada)
    const alvos: [V3, number][] = [[P.casa, 1.1], [P.cist, 0.6], [P.tanque, 0.7], [P.bat, 0.4], [P.ant, 0.4], [P.horta, 0.6]];
    for (let i = 0; i < N; i++) {
      const [c, rr] = alvos[i % alvos.length];
      pos[i * 3] = c[0] + (r() - 0.5) * 2 * rr;
      pos[i * 3 + 1] = r() * rr * 1.4;
      pos[i * 3 + 2] = c[2] + (r() - 0.5) * 2 * rr;
    }
    this.partBase = pos.slice();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: LARANJA.clone().multiplyScalar(2), size: 0.035, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.part = new THREE.Points(g, m);
    this.part.visible = false;
    this.part.frustumCulled = false;
    this.scene.add(this.part);
  }

  // --------------------------------------------------------------- aplica o estado
  aplica(e: Estado, t: number) {
    const d = this.dir, s = this.s;
    const A = d === "A", B = d === "B", C = d === "C";
    const c = e.cam;
    this.camera.position.set(...c.pos);
    this.camera.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
    this.camera.lookAt(...c.alvo);
    this.camera.fov = c.fov;
    this.camera.updateProjectionMatrix();

    // ---- dia -> noite
    const n = clamp(e.noite);
    const solCor = new THREE.Color(A ? 0xffcf9a : C ? 0xfff0dc : 0xffffff).lerp(new THREE.Color(A ? 0x6f8cff : C ? 0x8fa6e8 : 0x7f8fff), n);
    this.sol.color.copy(solCor);
    this.sol.intensity = lerp(A ? 3.4 : C ? 3.0 : 2.6, A ? 0.55 : C ? 0.45 : 0.9, n);
    // sol da tarde vem da frente-direita; a lua, de trás-esquerda
    const ps = (C ? new THREE.Vector3(7, 4.6, 4) : new THREE.Vector3(6, 6.5, 5)).lerp(new THREE.Vector3(-5, 7, -2), n);
    this.sol.position.copy(ps);
    this.hemi.intensity = lerp(A ? 0.9 : B ? 1.5 : 0.75, A ? 0.18 : B ? 0.55 : 0.16, n);
    this.hemi.color.set(A ? 0xcfe0ff : B ? 0xffffff : 0xdfe6f2).lerp(new THREE.Color(0x4a5cff), n * 0.6);
    this.contra.intensity = lerp(A ? 1.6 : C ? 1.0 : 1.4, A ? 0.5 : 0.35, n);
    this.contra.color.set(A ? 0xffe2b8 : C ? 0xdfe8ff : 0xfff2dd).lerp(new THREE.Color(0x6d86ff), n);
    if (this.scene.environment) this.scene.environmentIntensity = this.envInt * (1 - 0.75 * n);
    (this.ceuNoite.material as THREE.MeshBasicMaterial).opacity = n;
    (this.ceuDia.material as THREE.MeshBasicMaterial).color.setScalar(1 - 0.5 * n);
    this.renderer.toneMappingExposure = 1 + 0.15 * n;
    if (C) s.paredes.forEach((m) => {
      const ms = m as THREE.MeshStandardMaterial;
      ms.emissive.set(0xffa04a);
      ms.emissiveIntensity = clamp(e.lampada) * n * 0.55;
    });

    // sol e lua de brinquedo
    s.sol.visible = !!e.solPos;
    if (e.solPos) s.sol.position.set(...e.solPos);
    s.lua.visible = n > 0.3;
    s.lua.position.set(-3.2, 5.6 - (1 - n) * 2, -4.5);

    // ---- notas e montes
    const ALVOS: V3[] = [P.tanque, P.cist, P.bat, P.ant];
    s.notas.forEach((im, j) => {
      const mt = new THREE.Matrix4();
      for (let i = 0; i < im.count; i++) {
        const r = rng(1000 + j * 97 + i);
        const atraso = r() * 0.45;
        const q = clamp((e.notas - atraso) / 0.55);
        const monte = (i + j * 60) % 4;
        const alvoM = ALVOS[monte];
        // posição na pilha central
        const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.32;
        const altura = 0.004 + Math.floor(r() * 9) * 0.009;
        const p0 = new THREE.Vector3(P.centro[0] + Math.cos(ang) * rad, altura, P.centro[2] + Math.sin(ang) * rad);
        const pm = new THREE.Vector3(alvoM[0] + Math.cos(ang) * rad * 0.6, altura * 0.6, alvoM[2] + Math.sin(ang) * rad * 0.6);
        // queda: do alto, girando como folha
        const yQ = lerp(2.0 + r() * 1.4, 0, q * q);
        const sw = (1 - q) * 0.5;
        const leque = (1 - q) * (0.6 + r() * 1.1);
        const pq = new THREE.Vector3(p0.x + Math.cos(ang) * leque + Math.sin(t * 2.2 + i) * sw, p0.y + yQ, p0.z + Math.sin(ang) * leque * 0.7 + Math.cos(t * 1.7 + i) * sw);
        const mo = clamp((e.montes - r() * 0.3) / 0.7);
        const salto = Math.sin(mo * Math.PI) * 0.5;
        const p = pq.clone().lerp(pm, mo);
        p.y += salto;
        const gi = (1 - q) * (t * 3 + i);
        const rot = new THREE.Euler(Math.sin(gi) * 1.2 * (1 - q), r() * 6 + (1 - q) * t, Math.cos(gi) * 0.9 * (1 - q) + mo * Math.sin(mo * Math.PI) * 2);
        const esc = e.notas <= 0 ? 0.0001 : 1;
        const sumir = clamp(1 - (e.blocos[monte] - 0.6) / 0.4);
        mt.compose(p, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(esc, esc, esc).multiplyScalar(Math.max(0.0001, sumir)));
        im.setMatrixAt(i, mt);
      }
      im.instanceMatrix.needsUpdate = true;
      im.visible = e.notas > 0;
    });
    // blocos sem forma: sobem do monte e somem quando a peça de verdade cai
    const pecasK = [e.sist, e.cist, Math.max(e.bat, e.placas), e.ant];
    s.blocos.forEach((b, i) => {
      const v = e.blocos[i] * (1 - clamp(pecasK[i] * 3));
      b.visible = v > 0.01;
      const a = ALVOS[i];
      b.position.set(a[0], 0, a[2]);
      const q = quique(v);
      b.scale.set(q * (1 + 0.04 * Math.sin(t * 5 + i)), q * (1 - 0.04 * Math.sin(t * 5 + i)), q);
      b.rotation.y = t * 0.6 + i;
    });

    // ---- peças que caem e quicam
    const cai = (g: THREE.Object3D, v: number, base: V3, alt = 1.6) => {
      g.visible = v > 0.001;
      if (!g.visible) return;
      const q = clamp(v);
      const queda = Math.pow(1 - clamp(q / 0.55), 2) * alt;
      const sq = q < 0.55 ? 1 : 1 + Math.sin((q - 0.55) / 0.45 * Math.PI * 2.5) * Math.exp(-(q - 0.55) * 7) * 0.22;
      g.position.set(base[0], base[1] + queda, base[2]);
      g.scale.set(2 - sq, sq, 2 - sq);
    };
    cai(s.casa, e.casa, P.casa, 2.2);
    cai(s.sist, e.sist, P.tanque);
    cai(s.cist, e.cist, P.cist);
    cai(s.bat, e.bat, P.bat);
    cai(s.ant, e.ant, P.ant);
    s.calha.visible = e.cist > 0.5 && e.casa > 0.5;
    s.caminho.visible = e.casa > 0.5;
    s.cabos.visible = e.bat > 0.5 && e.casa > 0.5;
    s.galinheiro.visible = e.galinhas > 0.01;
    if (s.galinheiro.visible) cai(s.galinheiro, clamp(e.galinhas * 1.4), P.galinheiro, 1.2);
    s.galinhas.forEach((g, i) => {
      if (i === 0 && e.galVar !== undefined) {
        g.visible = true;
        g.scale.setScalar(1);
        g.position.set(lerp(P.note[0] + 0.55, P.note[0] - 0.55, e.galVar), 0.07, P.casa[2] + 0.65 + 0.16);
        g.rotation.y = Math.PI;
        (g.userData.corpo as THREE.Group).position.y = Math.abs(Math.sin(t * 9)) * 0.015;
        return;
      }
      const v = clamp(e.galinhas * 1.6 - i * 0.25);
      g.visible = v > 0.01;
      const corpo = g.userData.corpo as THREE.Group;
      const pulo = Math.max(0, Math.sin(t * 6 + i * 2)) * 0.04 * (1 - clamp(v * 1.5 - 0.5));
      g.scale.setScalar(quique(v));
      corpo.rotation.z = Math.sin(t * 3 + i * 1.7) > 0.7 ? -0.35 : 0.0; // bica o chão
      corpo.position.y = pulo;
    });
    // horta brota
    {
      const mt = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      for (let i = 0; i < s.plantas.count; i++) {
        s.plantasBase[i].decompose(p, q, sc);
        const v = quique(clamp(e.horta * 1.8 - (i % 12) * 0.06));
        mt.compose(p, q, sc.multiplyScalar(Math.max(0.0001, v)));
        s.plantas.setMatrixAt(i, mt);
      }
      s.plantas.instanceMatrix.needsUpdate = true;
      s.horta.visible = e.horta > 0.001;
      s.horta.scale.setScalar(Math.min(1, 0.6 + e.horta * 4));
    }
    // peixes nadando em roda
    {
      const mt = new THREE.Matrix4();
      for (let i = 0; i < s.peixes.count; i++) {
        const r = rng(50 + i);
        const rr = 0.18 + r() * 0.36, w = (0.5 + r() * 0.5) * (i % 2 ? 1 : -1), a = r() * 6 + t * w;
        const v = clamp(e.peixes * 2 - i * 0.08);
        const pos = new THREE.Vector3(Math.cos(a) * rr, 0.13 + r() * 0.12 + Math.sin(t * 2 + i) * 0.015, Math.sin(a) * rr);
        const yaw = -a - (w > 0 ? Math.PI / 2 : -Math.PI / 2);
        mt.compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + Math.sin(t * 9 + i) * 0.15, 0)), new THREE.Vector3(1, 1, 1).multiplyScalar(Math.max(0.0001, quique(v)) * 1.25));
        s.peixes.setMatrixAt(i, mt);
      }
      s.peixes.instanceMatrix.needsUpdate = true;
    }
    // água ondula
    s.agua.rotation.y = t * 0.1;

    // placas caem uma a uma sobre o telhado
    s.placas.forEach((pg, i) => {
      const v = clamp(e.placas * 1.6 - i * 0.2);
      pg.visible = v > 0.01;
      const b = pg.children[0] as THREE.Group;
      b.position.y = Math.pow(1 - clamp(v / 0.6), 2) * 1.2;
      const sq = v < 0.6 ? 1 : 1 + Math.sin(((v - 0.6) / 0.4) * Math.PI * 2.5) * Math.exp(-(v - 0.6) * 8) * 0.25;
      b.scale.set(2 - sq, sq, 2 - sq);
    });
    // brilho das células (carregando)
    const rc = e.realce ?? {};
    (s.placasMat[0] as THREE.MeshStandardMaterial).emissiveIntensity = (rc.placas ?? 0) * (0.35 + 0.15 * Math.sin(t * 6));
    // bateria: barra de carga
    const carga = clamp(e.carga);
    s.barraMat.forEach((m, i) => {
      const cheio = carga * 5 - i;
      const k = clamp(cheio);
      m.color.set(0x2a2d35).lerp(new THREE.Color(1.0, 0.42, 0.17).multiplyScalar(1.6), k);
      if (k > 0 && k < 1) m.color.multiplyScalar(0.75 + 0.25 * Math.sin(t * 12));
    });
    s.luzBat.intensity = carga * (0.4 + 1.6 * n);

    // casa em corte, luzes da noite
    const corte = clamp(e.corte);
    s.paredeFrente.visible = corte < 0.5;
    s.varCob.visible = corte < 0.5;
    s.paredeFrente.position.z = corte * 0.9;
    s.paredeFrente.position.y = corte * 0.3;
    const lv = clamp(e.lampada);
    (s.lampVaranda.mat as THREE.MeshStandardMaterial).emissiveIntensity = lv * 6;
    s.lampVaranda.luz.intensity = lv * (A ? 2.2 : 1.6);
    (s.lampSala.mat as THREE.MeshStandardMaterial).emissiveIntensity = lv * 6;
    s.lampSala.luz.intensity = lv * (A ? 1.8 : 1.3);
    s.janelas.forEach((m) => ((m as THREE.MeshStandardMaterial).emissiveIntensity = lv * 2.4));
    const gl = clamp(e.geladeira);
    s.portaGel.rotation.y = -gl * 1.9;
    s.matLuzGel.color.setRGB(1, 0.97, 0.88).multiplyScalar(gl * 1.6);
    s.luzGel.intensity = gl * 1.6;
    const ce = clamp(e.celular);
    s.celular.mat.color.setScalar(ce * 1.3);
    s.note.tela.map = s.note.texCham;
    s.note.tela.color.setScalar(e.chamada > 0.01 ? 0.25 + 1.0 * clamp(e.chamada) : 0.05);

    // lâmpada antiga
    s.lampAntiga.visible = e.lampAntiga > 0.01;
    s.lampAntiga.scale.setScalar(quique(clamp(e.lampAntiga)) * 1.0);
    (s.lampAntigaMat as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + 2.2 * clamp(e.lampAntiga) * (0.85 + 0.15 * Math.sin(t * 20));

    // caminhão-pipa
    const cm = e.caminhao;
    s.caminhao.visible = !!cm && cm.vis > 0.01;
    if (cm) {
      s.caminhao.position.set(cm.x, 0.0 + Math.abs(Math.sin(t * 18)) * 0.01, 2.55);
      s.caminhao.rotation.y = Math.PI;
    }

    // chuva
    s.nuvem.visible = e.chuva > 0.01;
    s.nuvem.position.set(P.casa[0] - 0.1, 2.6 + (1 - clamp(e.chuva * 2)) * 1.5, P.casa[2] + 0.1);
    s.nuvem.scale.setScalar(Math.min(1, e.chuva * 2.5));
    s.chuva.visible = e.chuva > 0.25;
    {
      const mt = new THREE.Matrix4();
      for (let i = 0; i < s.chuva.count; i++) {
        const r = rng(2000 + i);
        const per = 0.45 + r() * 0.2;
        const ph = (t / per + r()) % 1;
        const x = P.casa[0] - 1.0 + r() * 2.0, z = P.casa[2] - 0.5 + r() * 1.1;
        const y = lerp(2.4, 1.25, ph);
        mt.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(clamp(e.chuva * 2 - 0.5)));
        s.chuva.setMatrixAt(i, mt);
      }
      s.chuva.instanceMatrix.needsUpdate = true;
    }

    // fluxos
    const fl = (nome: string, k: number, op = 1) => {
      const me = this.fluxos[nome];
      me.visible = k > 0.001;
      const m = me.material as THREE.ShaderMaterial;
      m.uniforms.k.value = clamp(k);
      m.uniforms.tempo.value = t;
      m.uniforms.op.value = op * (B ? 0.9 : 1);
    };
    fl("sol", e.solFluxo);
    fl("placasBat", Math.max(clamp(e.solFluxo * 2 - 1), clamp(e.realce?.bat ?? 0)));
    fl("batCasa", e.caboCasa);
    fl("agua", e.agua);
    fl("adubo", e.adubo);

    // satélites passando (em fila, da direita para a esquerda) e feixe até a antena
    const satAlt = 4.6;
    s.sats.forEach((sg, i) => {
      sg.visible = e.sats > 0.001;
      const x = 7 - ((e.sats * 6 + i * 3.4) % 14);
      sg.position.set(x, satAlt + Math.sin(i * 2.1) * 0.45, -1.7 + i * 0.5 - Math.abs(x) * 0.06);
      sg.rotation.set(1.15 + 0.1 * Math.sin(i), 0.25 * Math.sin(i * 1.7), 0.18 * Math.cos(i));
    });
    const antTopo = new THREE.Vector3(P.ant[0], 0.7, P.ant[2]);
    this.feixeSat.visible = e.feixeSat > 0.01 && e.sats > 0;
    if (this.feixeSat.visible) {
      // liga o satélite mais perto do alto da antena
      let alvo = s.sats[0].position, best = 1e9;
      for (const sg of s.sats) {
        const dd = Math.abs(sg.position.x - antTopo.x);
        if (dd < best) (best = dd), (alvo = sg.position);
      }
      this.orienta(this.feixeSat, antTopo, alvo, 0.018);
      const m = this.feixeSat.material as THREE.ShaderMaterial;
      m.uniforms.k.value = clamp(e.feixeSat);
      m.uniforms.tempo.value = -t * 1.2; // o sinal desce até a antena e sobe
      m.uniforms.op.value = 0.9;
    }
    this.feixeCeu.visible = e.feixeCeu > 0.01;
    if (this.feixeCeu.visible) {
      this.orienta(this.feixeCeu, new THREE.Vector3(antTopo.x, 9, antTopo.z), antTopo, 0.02 + 0.01 * Math.sin(t * 20));
      const m = this.feixeCeu.material as THREE.ShaderMaterial;
      m.uniforms.k.value = clamp(e.feixeCeu);
      m.uniforms.tempo.value = t;
      m.uniforms.op.value = 1;
    }
    // a antena acende quando o sinal chega
    const prato = s.ant.userData.prato as THREE.Group;
    prato.rotation.z = Math.sin(t * 2) * 0.02;

    this.aplicaWire(e);
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = e.foco ?? 0.5;
    if (this.bokeh) {
      const dist = new THREE.Vector3(...c.pos).distanceTo(new THREE.Vector3(...c.alvo));
      (this.bokeh.uniforms as any).focus.value = dist;
      (this.bokeh.uniforms as any).aperture.value = 0.0006 * (8 / dist);
    }
    this.final.uniforms.tempo.value = t;
  }

  aplicaWire(e: Estado) {
    const w = e.wire ?? 0;
    const liga = w > 0.5;
    if (liga !== this.wireAtivo) {
      this.wireAtivo = liga;
      this.scene.traverse((o) => {
        if (o.userData.contorno) {
          o.visible = !liga;
          return;
        }
        if (this.fundo.includes(o)) {
          o.visible = !liga;
          return;
        }
        if ((o as THREE.Sprite).isSprite || o === this.part || o.userData.semWire || (o as THREE.LineSegments).isLineSegments) return;
        if ((o as THREE.InstancedMesh).isInstancedMesh) {
          o.visible = !liga;
          return;
        }
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (liga) {
          this.originais.set(m, m.material);
          m.material = this.invis;
          let l = m.userData.linhas as THREE.LineSegments | undefined;
          if (!l) {
            l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 20), this.linha);
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
      if (liga) {
        this.bgOrig = this.scene.background as THREE.Color;
        this.scene.background = TINTA.clone();
        this.renderer.shadowMap.enabled = false;
      } else {
        this.scene.background = this.bgOrig;
        this.renderer.shadowMap.enabled = true;
      }
    }
    if (liga) Object.values(this.fluxos).forEach((f) => (f.visible = false));
    if (liga) (this.feixeCeu.visible = false), (this.feixeSat.visible = false);
    this.bloom.threshold = liga ? 0.5 : this.dir === "A" ? 0.9 : this.dir === "B" ? 0.97 : 0.9;
    this.bloom.strength = liga ? 0.8 : this.dir === "A" ? 0.22 : this.dir === "B" ? 0.25 : 0.3;
    this.final.uniforms.grao.value = liga ? 0 : this.dir === "A" ? 0.035 : this.dir === "C" ? 0.012 : 0;
    this.final.uniforms.fibra.value = liga ? 0 : this.dir === "C" ? 0.09 : 0;
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
export { TAB };
