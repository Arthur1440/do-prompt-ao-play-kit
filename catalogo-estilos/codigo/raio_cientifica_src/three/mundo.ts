import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { cil, Dir, esfera, junta, Kit, transf, V3 } from "./kit";
import { clamp, fbm, rng } from "./rng";
import { texAlgodao, texCarga, texCeuToon, texCorte, texJanelas, texMadeira, texPonto, texQuarto } from "./tex";
import { altura, ALT_TORRE, BASE_NUVEM, BASE_NUVEM_NY, PESSOAS, PONTA, PONTA_ES, TOPO } from "./terreno";
import { gerarRaio, geoRaio, pontas, Raio } from "./raio";

export type RaioEstado = { seed: number; p: number; brilho: number; onde?: "torre" | "es"; fade?: number };
export type Estado = {
  set: "pico" | "ny";
  cam: { pos: V3; alvo: V3; fov: number; rolo?: number };
  foco?: number; // centro do tilt-shift (A), 0 = base da tela, 1 = topo
  raios: RaioEstado[];
  flash?: number; // clarão geral do céu (0..1)
  nuvem?: number; // 0 = nuvem longe (à direita), 1 = em cima da torre
  cargasNuvem?: number; // 0..1 cargas azuis visíveis na base da nuvem
  cargasTorre?: number; // 0..1 cargas laranja se juntando na ponta
  coroa?: number; // brilho na ponta da torre
  tChuva: number; // tempo da chuva (desacelera na câmera lenta)
  chuva?: number;
  pessoas?: boolean;
  wire?: number; // virada IA: 1 = arame laranja
  part?: number; // dispersão das partículas
  sombra?: number; // tamanho da caixa de sombra
  tremor?: number;
};

const LARANJA = new THREE.Color("#FF6B2C");
const TINTA = new THREE.Color("#0B1026");

// ---------------------------------------------------------------------------- passadas de pós
const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.15, 0.5, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) { float k = exp(-float(i*i)/24.0); s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k; }
      gl_FragColor = s / w;
    }`,
};
const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, sat: { value: 1.0 }, contraste: { value: 1.0 },
    tinta: { value: new THREE.Vector3(1, 1, 1) }, aberr: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, sat, contraste, aberr; uniform vec3 tinta; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col;
      if (aberr > 0.0) {
        vec2 o = cc * aberr / res.x * 8.0;
        col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      } else col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b));
      float guarda = sat < 0.99 ? smoothstep(0.45, 0.75, (mx - mn) / max(mx, 1e-3)) * step(0.12, mx) : 0.0;
      col = mix(mix(vec3(l), col, sat) * tinta, col, guarda);
      col = (col - 0.5) * contraste + 0.5;
      col += vec3(quente, quente*0.35, -quente);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

// ---------------------------------------------------------------------------- mundo
export class Mundo {
  dir: Dir;
  k: Kit;
  W: number;
  H: number;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  final: ShaderPass;
  bloom: UnrealBloomPass;
  tiltH?: ShaderPass;
  tiltV?: ShaderPass;
  pico = new THREE.Group();
  ny = new THREE.Group();
  sol: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  luzRaio: THREE.PointLight;
  luzCidade: THREE.PointLight;
  nuvem = new THREE.Group();
  nuvemMats: THREE.Material[] = [];
  ceuC?: THREE.ShaderMaterial;
  baseC?: THREE.ShaderMaterial;
  fundo?: THREE.Mesh;
  farol!: THREE.Mesh;
  chuva!: THREE.InstancedMesh;
  chuvaMat!: THREE.MeshBasicMaterial;
  cache = new Map<string, Raio>();
  raiosObj: { core: THREE.Mesh; halo: THREE.Mesh; contorno?: THREE.Mesh; brilho: THREE.Sprite[] }[] = [];
  cargasAz: THREE.Object3D[] = [];
  cargasLa: THREE.Object3D[] = [];
  cargasLa0: THREE.Vector3[] = [];
  cargasAz0: THREE.Vector3[] = [];
  coroaSpr!: THREE.Sprite;
  pessoas = new THREE.Group();
  chaoWire!: THREE.Mesh;
  wireMat: THREE.MeshBasicMaterial;
  originais = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  wireAtivo = false;
  part!: THREE.Points;
  partBase!: Float32Array;
  fogOrig: THREE.Fog | THREE.FogExp2 | null = null;
  bgOrig: THREE.Color | THREE.Texture | null = null;
  tPonto = texPonto();

  constructor(canvas: HTMLCanvasElement, dir: Dir, W: number, H: number) {
    this.dir = dir;
    this.W = W;
    this.H = H;
    this.k = new Kit(dir, W, H);
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = dir === "B" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = dir === "C" ? 1.45 : 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.localClippingEnabled = true;
    this.renderer = r;
    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 3000);
    this.scene.add(this.camera);

    if (dir === "A") {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.18;
    }
    // Luz de noite: "lua" fria com sombra, hemisfério, luz quente da cidade e a luz do raio.
    const solCor = dir === "A" ? 0x9fb4ff : dir === "B" ? 0xd9ccff : 0x8ea2d8;
    this.sol = new THREE.DirectionalLight(solCor, dir === "A" ? 0.75 : dir === "B" ? 2.3 : 0.45);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.02;
    this.hemi = new THREE.HemisphereLight(
      dir === "A" ? 0x6f86c8 : dir === "B" ? 0x8e7fd6 : 0x3a4a78,
      dir === "A" ? 0x3a2418 : dir === "B" ? 0x2a2050 : 0x0c0c12,
      dir === "A" ? 0.28 : dir === "B" ? 1.25 : 0.55,
    );
    this.luzRaio = new THREE.PointLight(0xd8e2ff, 0, 0, 1.0);
    this.luzCidade = new THREE.PointLight(0xffa860, dir === "C" ? 30 : 60, 90, 1.0);
    this.luzCidade.position.set(0, 6, 70);
    this.scene.add(this.sol, this.sol.target, this.hemi, this.luzRaio, this.luzCidade);
    for (const [x, z] of [[-60, 30], [60, 20], [-45, -50], [50, -55]]) {
      const l = new THREE.PointLight(0xffa860, dir === "C" ? 22 : dir === "A" ? 40 : 30, 85, 1.0);
      l.position.set(x, 5, z);
      this.pico.add(l);
    }

    if (dir !== "A") {
      const fog = new THREE.FogExp2(dir === "B" ? 0x241c55 : 0x141a28, dir === "B" ? 0.0042 : 0.0026);
      this.scene.fog = fog;
    }

    this.montaFundo();
    this.montaPico();
    this.montaNY();
    this.montaNuvem();
    this.montaChuva();
    this.montaCargas();
    this.scene.add(this.pico, this.ny, this.nuvem);
    this.wireMat = new THREE.MeshBasicMaterial({ color: LARANJA, wireframe: true, transparent: true, opacity: dir === "C" ? 0.3 : 0.5, depthWrite: false });

    // pós
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(W / 2, H / 2),
      dir === "A" ? 0.38 : dir === "B" ? 0.3 : 0.7,
      dir === "A" ? 0.35 : dir === "B" ? 0.25 : 0.5,
      dir === "A" ? 0.92 : dir === "B" ? 0.97 : 0.8,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    if (dir === "A") {
      this.tiltH = new ShaderPass(TILT);
      this.tiltH.uniforms.dir.value.set(1 / W, 0);
      this.tiltV = new ShaderPass(TILT);
      this.tiltV.uniforms.dir.value.set(0, 1 / H);
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }
    this.final = new ShaderPass(FINAL);
    const u = this.final.uniforms;
    u.res.value.set(W, H);
    if (dir === "A") Object.assign(u.grao, { value: 0.035 }), (u.vinheta.value = 0.45), (u.quente.value = 0.018);
    if (dir === "B") (u.grao.value = 0), (u.vinheta.value = 0.18);
    if (dir === "C") {
      u.grao.value = 0.075;
      u.vinheta.value = 0.55;
      u.sat.value = 0.32;
      u.contraste.value = 1.12;
      u.tinta.value.set(0.9, 1.0, 1.12);
      u.aberr.value = 1.6;
    }
    this.composer.addPass(this.final);
    this.montaParticulas();
  }

  // --------------------------------------------------------------- fundo
  montaFundo() {
    const d = this.dir;
    if (d === "A") {
      // quarto escuro atrás da maquete + mesa de madeira + tábua
      const parede = new THREE.Mesh(new THREE.PlaneGeometry(1400, 900), new THREE.MeshBasicMaterial({ map: texQuarto(), fog: false }));
      parede.position.set(0, 160, -520);
      this.scene.add(parede);
      this.fundo = parede;
      const tm = texMadeira(true);
      tm.repeat.set(6, 6);
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshPhysicalMaterial({ map: tm, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, color: 0x8a7a70 }));
      mesa.rotation.x = -Math.PI / 2;
      mesa.position.y = -9.5;
      mesa.receiveShadow = true;
      this.scene.add(mesa);
      const tc = texMadeira(false);
      tc.repeat.set(2, 2);
      const taboa = new THREE.Mesh(new THREE.BoxGeometry(170, 3.5, 170), new THREE.MeshPhysicalMaterial({ map: tc, roughness: 0.5, clearcoat: 0.25, color: 0xcab8a6 }));
      taboa.position.y = -7.75;
      taboa.castShadow = taboa.receiveShadow = true;
      this.pico.add(taboa);
      this.scene.background = new THREE.Color(0x05070f);
    } else if (d === "B") {
      const ceu = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1400), new THREE.MeshBasicMaterial({ map: texCeuToon(), fog: false }));
      ceu.position.set(0, 300, -700);
      this.scene.add(ceu);
      this.fundo = ceu;
      this.scene.background = new THREE.Color(0x151a40);
    } else {
      // céu de tempestade em shader (fbm), iluminado pelo clarão
      this.ceuC = new THREE.ShaderMaterial({
        uniforms: { flash: { value: 0 }, fc: { value: new THREE.Vector2(0, 0) }, tempo: { value: 0 } },
        fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float flash, tempo; uniform vec2 fc; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.03; a*=0.5;} return s; }
          void main(){
            vec2 q = vP.xy*0.012 + vec2(tempo*0.004, 0.0);
            float c = fbm(q + fbm(q*1.7)*0.9);
            float alt = smoothstep(-100.0, 700.0, vP.y);
            vec3 base = mix(vec3(0.03,0.038,0.06), vec3(0.075,0.085,0.12), c);
            base *= 0.7 + 0.6*alt;
            float lit = flash * exp(-length(vP.xy - fc)*0.006) * (0.4 + c*1.6);
            gl_FragColor = vec4(base + vec3(0.55,0.62,0.85)*lit, 1.0);
          }`,
      });
      this.ceuC.side = THREE.BackSide;
      const ceu = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), this.ceuC);
      this.scene.add(ceu);
      this.fundo = ceu;
      this.scene.background = new THREE.Color(0x05070c);
    }
  }

  // --------------------------------------------------------------- morro, torre, cidade
  montaPico() {
    const d = this.dir;
    const K = this.k;
    const A = d === "A";
    const meio = A ? 70 : 320;
    const seg = A ? 220 : 320;
    const g = new THREE.PlaneGeometry(meio * 2, meio * 2, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const cores: number[] = [];
    const cMata = new THREE.Color(A ? 0x2f5230 : d === "B" ? 0x2f7a5a : 0x24302a);
    const cMata2 = new THREE.Color(A ? 0x44603a : d === "B" ? 0x3f9468 : 0x222e26);
    const cPedra = new THREE.Color(A ? 0x5e5a54 : d === "B" ? 0x7d7aa6 : 0x55575f);
    const cVale = new THREE.Color(A ? 0x5c5a58 : d === "B" ? 0x3b3870 : 0x16161c);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = altura(x, z);
      pos.setY(i, h);
      const rr = Math.hypot(x, z);
      const c = cMata.clone().lerp(cMata2, fbm(x * 0.08, z * 0.08, 3));
      if (h > TOPO - 4) c.lerp(cPedra, clamp((h - (TOPO - 4)) / 3));
      if (h < 3.5 && rr > 34) c.lerp(cVale, clamp((3.5 - h) / 2.5));
      cores.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
    g.computeVertexNormals();
    const mt = A
      ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.5, bumpMap: K.ruido, bumpScale: 0.6 })
      : d === "B"
        ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: K.grad })
        : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const chao = new THREE.Mesh(g, mt);
    chao.receiveShadow = true;
    chao.castShadow = true;
    chao.userData.semWire = true;
    chao.userData.someNoArame = true;
    this.pico.add(chao);
    const gw = new THREE.PlaneGeometry(150, 150, 60, 60);
    gw.rotateX(-Math.PI / 2);
    const pw = gw.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pw.count; i++) pw.setY(i, altura(pw.getX(i), pw.getZ(i)) + 0.05);
    this.chaoWire = new THREE.Mesh(gw, new THREE.MeshBasicMaterial({ color: LARANJA, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false }));
    this.chaoWire.userData.semWire = true;
    this.chaoWire.visible = false;
    this.pico.add(this.chaoWire);

    if (A) {
      // laterais em corte da maquete (terra à mostra) até a tábua
      const tCorte = texCorte();
      const mc = new THREE.MeshPhysicalMaterial({ map: tCorte, roughness: 0.8, clearcoat: 0.15 });
      const N = 160;
      for (let lado = 0; lado < 4; lado++) {
        const p: number[] = [], uv: number[] = [], id: number[] = [];
        for (let i = 0; i <= N; i++) {
          const u = -meio + (2 * meio * i) / N;
          const [x, z] = lado === 0 ? [u, meio] : lado === 1 ? [meio, -u] : lado === 2 ? [-u, -meio] : [-meio, u];
          const h = altura(x, z);
          p.push(x, h, z, x, -6, z);
          uv.push(i / N * 4, 1, i / N * 4, 0);
          if (i < N) {
            const a = i * 2;
            id.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
        const gg = new THREE.BufferGeometry();
        gg.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        gg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        gg.setIndex(id);
        gg.computeVertexNormals();
        const m = new THREE.Mesh(gg, mc);
        mc.side = THREE.DoubleSide;
        m.castShadow = m.receiveShadow = true;
        this.pico.add(m);
      }
    }

    // árvores na encosta (o Jaraguá é coberto de mata)
    const r = rng(41);
    const nArv = A ? 520 : 1300;
    // copa de bolas (árvore de maquete) + tronco curto; nada de cone facetado (cara de low poly)
    const copa = (() => {
      const r2 = rng(3);
      const gs: THREE.BufferGeometry[] = [];
      for (let i = 0; i < (d === "B" ? 1 : 4); i++) {
        const gg = new THREE.IcosahedronGeometry(d === "B" ? 0.62 : 0.42 + r2() * 0.12, d === "B" ? 2 : 2);
        gs.push(transf(gg, d === "B" ? [0, 1.0, 0] : [(r2() - 0.5) * 0.4, 0.75 + i * 0.22, (r2() - 0.5) * 0.4]));
      }
      gs.push(transf(cil(0.07, 0.09, 0.6, 6), [0, 0.3, 0]));
      return junta(gs);
    })();
    const geoArv = copa;
    const matArv = K.mat({ color: d === "A" ? 0x2f5a2c : d === "B" ? 0x2a8a5c : 0x111a14, rough: 0.7 });
    const arv = new THREE.InstancedMesh(geoArv, matArv, nArv);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let tent = 0; tent < 20000 && n < nArv; tent++) {
      const x = (r() - 0.5) * (A ? 130 : 160), z = (r() - 0.5) * (A ? 130 : 160);
      const h = altura(x, z);
      const rr = Math.hypot(x, z);
      if (h < 4 || rr < 4.5 || h > TOPO - 1.5) continue;
      if (Math.hypot(x - PESSOAS[0], z - PESSOAS[1]) < 6) continue; // clareira das silhuetas
      if (fbm(x * 0.06 + 9, z * 0.06, 3) < 0.38) continue;
      const s = 0.75 + r() * 0.7;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0));
      m4.compose(new THREE.Vector3(x, h - 0.15, z), q, new THREE.Vector3(s, s * (0.9 + r() * 0.4), s));
      arv.setMatrixAt(n++, m4);
    }
    arv.count = n;
    arv.castShadow = arv.receiveShadow = true;
    if (d === "B") {
      const cc = new THREE.Color();
      for (let i = 0; i < n; i++) arv.setColorAt(i, cc.setHSL(0.4 + r() * 0.06, 0.5, 0.32 + r() * 0.1));
    }
    K.contorno(arv, 1.5);
    this.pico.add(arv);

    this.montaCidade(this.pico, A ? 66 : 300, 36, A ? 240 : 1500, 1);
    this.montaTorre();
    this.montaPessoas();
  }

  montaCidade(pai: THREE.Group, lim: number, rMin: number, nPred: number, esc: number, ny = false) {
    const d = this.dir;
    const r = rng(ny ? 77 : 5);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const jan = texJanelas(ny ? 3 : 9, 5, 16, d === "C" ? 0.35 : 0.5);
    const mat =
      d === "A"
        ? new THREE.MeshPhysicalMaterial({ color: 0x3a3f4c, roughness: 0.5, clearcoat: 0.35, emissive: 0xffffff, emissiveMap: jan, emissiveIntensity: 2.4 })
        : d === "B"
          ? new THREE.MeshToonMaterial({ color: 0x4a4790, gradientMap: this.k.grad, emissive: 0xffffff, emissiveMap: jan, emissiveIntensity: 1.1 })
          : new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.8, emissive: 0xffffff, emissiveMap: jan, emissiveIntensity: 2.2 });
    const pr = new THREE.InstancedMesh(geo, mat, nPred);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let t = 0; t < nPred * 30 && n < nPred; t++) {
      const x = (r() - 0.5) * 2 * lim, z = (r() - 0.5) * 2 * lim;
      const rr = Math.hypot(x, z);
      if (rr < rMin) continue;
      if (ny && Math.abs(x) < 7 && Math.abs(z) < 7) continue;
      if (!ny && Math.hypot(x - PESSOAS[0], z - PESSOAS[1]) < 7) continue;
      const h0 = ny ? 0 : altura(x, z);
      if (!ny && h0 > 3.2) continue;
      const dens = ny ? 1 : clamp((rr - rMin) / 30);
      if (r() > dens) continue;
      const w = (1 + r() * 2.2) * esc, dd = (1 + r() * 2.2) * esc;
      const hh = ny ? (4 + r() ** 2 * 22) * (rr < 30 ? 1 : 0.8) : (0.8 + r() ** 3 * (rr > 120 ? 9 : 5)) * esc;
      m4.compose(new THREE.Vector3(x, h0 - 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.3, 0)), new THREE.Vector3(w, hh, dd));
      pr.setMatrixAt(n++, m4);
    }
    pr.count = n;
    pr.castShadow = pr.receiveShadow = true;
    if (d === "B") {
      const cc = new THREE.Color();
      for (let i = 0; i < n; i++) pr.setColorAt(i, cc.setHSL(0.68 + r() * 0.08, 0.35, 0.32 + r() * 0.14));
    }
    this.k.contorno(pr, 1.2);
    pai.add(pr);
    // luzes de rua: tapete laranja
    const nL = ny ? 2500 : d === "A" ? 1800 : 7000;
    const pl: number[] = [];
    for (let t = 0; t < nL * 20 && pl.length < nL * 3; t++) {
      const x = (r() - 0.5) * 2 * lim, z = (r() - 0.5) * 2 * lim;
      const rr = Math.hypot(x, z);
      if (rr < rMin - 4) continue;
      const h0 = ny ? 0 : altura(x, z);
      if (!ny && h0 > 3.5) continue;
      // ruas: concentra em linhas
      const rua = Math.abs(Math.sin(x * 0.35)) < 0.18 || Math.abs(Math.sin(z * 0.35)) < 0.18;
      if (!rua && r() > 0.25) continue;
      pl.push(x, h0 + 0.25, z);
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.Float32BufferAttribute(pl, 3));
    const pm = new THREE.PointsMaterial({
      color: d === "B" ? 0xffd27a : 0xffa24a, map: this.tPonto, size: d === "A" ? 1.3 : d === "B" ? 1.1 : 2.4,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true,
    });
    const pts = new THREE.Points(gp, pm);
    pts.userData.semWire = true;
    pai.add(pts);
  }

  montaTorre() {
    const K = this.k;
    const d = this.dir;
    const brancos: THREE.BufferGeometry[] = [];
    const verm: THREE.BufferGeometry[] = [];
    const H = ALT_TORRE - 1.2;
    const meia = (y: number) => 1.5 - (1.5 - 0.32) * (y / H);
    const viga = (a: THREE.Vector3, b: THREE.Vector3, rr: number) => {
      const L = a.distanceTo(b);
      const g = cil(rr, rr, L, 5, true);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
      return g.applyMatrix4(m);
    };
    const canto = (y: number, i: number) => {
      const s = meia(y);
      const cx = [1, -1, -1, 1][i], cz = [1, 1, -1, -1][i];
      return new THREE.Vector3(cx * s, TOPO + y, cz * s);
    };
    const nB = 12;
    for (let b = 0; b < nB; b++) {
      const y0 = (b * H) / nB, y1 = ((b + 1) * H) / nB;
      const alvo = b % 2 === 0 ? verm : brancos;
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        alvo.push(viga(canto(y0, i), canto(y1, i), 0.075));
        alvo.push(viga(canto(y1, i), canto(y1, j), 0.04));
        alvo.push(viga(canto(y0, i), canto(y1, j), 0.03));
        alvo.push(viga(canto(y0, j), canto(y1, i), 0.03));
      }
    }
    // plataforma, antenas e para-raios
    const topo = TOPO + H;
    brancos.push(transf(new THREE.BoxGeometry(0.9, 0.12, 0.9), [0, topo, 0]));
    brancos.push(viga(new THREE.Vector3(0, topo, 0), new THREE.Vector3(0, PONTA[1] - 0.05, 0), 0.05));
    verm.push(transf(cil(0.12, 0.12, 0.5, 10), [0.25, topo + 0.35, 0.2]));
    brancos.push(transf(new THREE.BoxGeometry(0.18, 0.7, 0.1), [-0.32, topo + 0.25, 0.3]));
    const mB = K.mat({ color: d === "C" ? 0x6a6e78 : 0xe8e6e0, rough: 0.45, metal: 0.2 });
    const mV = K.mat({ color: d === "C" ? 0x5a2a28 : 0xd23a2c, rough: 0.45, metal: 0.2 });
    K.m(junta(brancos), mB, 1.2, this.pico);
    K.m(junta(verm), mV, 1.2, this.pico);
    // luz de balizamento vermelha (pisca)
    this.farol = new THREE.Mesh(esfera(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.25, 0.15) }));
    this.farol.position.set(0, PONTA[1] - 0.2, 0);
    this.pico.add(this.farol);
    // brilho da ponta (coroa)
    const sm = new THREE.SpriteMaterial({ map: this.tPonto, color: d === "B" ? 0xfff2a0 : 0xcfdcff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
    this.coroaSpr = new THREE.Sprite(sm);
    this.coroaSpr.position.set(...PONTA);
    this.coroaSpr.userData.semWire = true;
    this.pico.add(this.coroaSpr);
  }

  montaPessoas() {
    // Silhuetas genéricas de pesquisadores (capa de chuva com capuz) e uma câmera num tripé.
    const K = this.k;
    const d = this.dir;
    const corP = d === "A" ? 0x23283a : d === "B" ? 0x1f2350 : 0x07080b;
    const mP = K.mat({ color: corP, rough: 0.6 });
    const mCam = K.mat({ color: d === "B" ? 0x2b2b3a : 0x15161a, rough: 0.35, metal: 0.4 });
    const pessoa = (alt: number) => {
      const gr = new THREE.Group();
      const corpo = new THREE.LatheGeometry(
        [[0.001, 0], [0.11, 0], [0.12, 0.35], [0.13, 0.95], [0.1, 1.25], [0.06, 1.33], [0.001, 1.34]].map(([a, b]) => new THREE.Vector2(a, b)),
        20,
      );
      corpo.computeVertexNormals();
      K.m(corpo, mP, 2.5, gr);
      K.m(esfera(0.115, 20, 14), mP, 2.5, gr, [0, 1.47, 0], undefined, [1, 1.1, 1]);
      K.m(cil(0.04, 0.035, 0.6, 10), mP, 2, gr, [0.15, 1.0, 0.08], [0.3, 0, -0.45]);
      K.m(cil(0.04, 0.035, 0.6, 10), mP, 2, gr, [-0.15, 1.0, 0.08], [0.3, 0, 0.45]);
      gr.scale.setScalar(alt / 1.6);
      return gr;
    };
    const tripe = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      K.m(cil(0.012, 0.012, 1.3, 6), mCam, 1.5, tripe, [Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2], [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]);
    }
    K.m(new THREE.BoxGeometry(0.2, 0.14, 0.3), mCam, 2, tripe, [0, 1.3, 0]);
    K.m(cil(0.055, 0.06, 0.18, 14), mCam, 2, tripe, [0, 1.32, -0.22], [Math.PI / 2, 0, 0]);
    const p1 = pessoa(1.75);
    p1.position.set(0.45, 0, 0.25);
    const p2 = pessoa(1.68);
    p2.position.set(-0.55, 0, 0.45);
    this.pessoas.add(tripe, p1, p2);
    // escala da cena: 1 = 10 m -> pessoa de 1,7 m = 0,17
    this.pessoas.scale.setScalar(0.1);
    const [px, pz] = PESSOAS;
    this.pessoas.position.set(px, altura(px, pz) - 0.02, pz);
    this.pessoas.lookAt(0, altura(px, pz), 0);
    this.pessoas.rotateY(Math.PI);
    this.pico.add(this.pessoas);
  }

  // --------------------------------------------------------------- Nova York (silhueta do Empire State)
  montaNY() {
    const K = this.k;
    const d = this.dir;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), K.mat({ color: d === "A" ? 0x4a4a50 : d === "B" ? 0x2c2a60 : 0x0c0c10, semContorno: true, rough: 0.8 }));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    this.ny.add(chao);
    if (d === "A") {
      const tc = texMadeira(false);
      const taboa = new THREE.Mesh(new THREE.BoxGeometry(170, 3.5, 170), new THREE.MeshPhysicalMaterial({ map: tc, roughness: 0.5, clearcoat: 0.25, color: 0xcab8a6 }));
      taboa.position.y = -1.8;
      this.ny.add(taboa);
      chao.geometry = new THREE.PlaneGeometry(166, 166);
    }
    // Empire State: degraus, torre, coroa e antena (silhueta reconhecível)
    const jan = texJanelas(21, 8, 40, 0.5);
    jan.repeat.set(1, 1);
    const mE =
      d === "A"
        ? new THREE.MeshPhysicalMaterial({ color: 0xb8b0a0, roughness: 0.5, clearcoat: 0.3, emissive: 0xffffff, emissiveMap: jan, emissiveIntensity: 1.2 })
        : d === "B"
          ? new THREE.MeshToonMaterial({ color: 0x8f86c8, gradientMap: K.grad, emissive: 0xffffff, emissiveMap: jan, emissiveIntensity: 0.9 })
          : new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.7, emissive: 0xffffff, emissiveMap: jan, emissiveIntensity: 2.0 });
    const blocos: [number, number, number, number][] = [
      // [largura x, profundidade z, y0, y1]
      [9, 8, 0, 2.4],
      [7.2, 5.6, 2.4, 8.5],
      [5.6, 4.4, 8.5, 30.5],
      [4.4, 3.5, 30.5, 32.4],
      [3.4, 2.8, 32.4, 34.6],
      [2.4, 2.0, 34.6, 37.6],
      [1.6, 1.4, 37.6, 38.6],
    ];
    const es = new THREE.Group();
    for (const [w, p, y0, y1] of blocos) K.m(transf(new THREE.BoxGeometry(w, y1 - y0, p), [0, (y0 + y1) / 2, 0]), mE, 2, es);
    // asas laterais da base (contrafortes)
    K.m(transf(new THREE.BoxGeometry(7.0, 25, 1.2), [0, 8.5 + 12.5 - 4, 2.8]), mE, 2, es);
    K.m(transf(new THREE.BoxGeometry(7.0, 25, 1.2), [0, 8.5 + 12.5 - 4, -2.8]), mE, 2, es);
    // mastro e antena
    const mM = K.mat({ color: d === "C" ? 0x2a2c33 : 0xd8d4cc, rough: 0.4, metal: 0.4 });
    K.m(cil(0.55, 0.7, 2.6, 16), mM, 2, es, [0, 39.9, 0]);
    K.m(cil(0.32, 0.45, 1.4, 16), mM, 2, es, [0, 41.9, 0]);
    K.m(cil(0.06, 0.12, 2.1, 8), mM, 1.5, es, [0, 43.6, 0]);
    this.ny.add(es);
    this.montaCidade(this.ny, d === "A" ? 78 : 240, 6, d === "A" ? 300 : 1100, 1.6, true);
    this.ny.visible = false;
  }

  // --------------------------------------------------------------- nuvem
  montaNuvem() {
    const d = this.dir;
    const K = this.k;
    const r = rng(19);
    if (d === "C") {
      // base da nuvem em shader (vista de baixo), mesma iluminação do céu
      this.baseC = new THREE.ShaderMaterial({
        uniforms: { flash: { value: 0 }, fc: { value: new THREE.Vector2() }, tempo: { value: 0 }, op: { value: 1 } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float flash, tempo, op; uniform vec2 fc; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.03; a*=0.5;} return s; }
          void main(){
            vec2 q = vP.xz*0.022 + vec2(tempo*0.01, 0.0);
            float c = fbm(q + fbm(q*1.3)*1.2);
            float a = smoothstep(0.32, 0.62, c);
            float borda = 1.0 - smoothstep(180.0, 320.0, length(vP.xz));
            vec3 base = mix(vec3(0.03,0.035,0.05), vec3(0.09,0.10,0.13), c);
            float lit = flash * exp(-length(vP.xz - fc)*0.022) * (0.6 + c*1.8);
            gl_FragColor = vec4(base + vec3(0.6,0.68,0.95)*lit, a*borda*op);
          }`,
      });
      for (let i = 0; i < 4; i++) {
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), this.baseC);
        pl.rotation.x = Math.PI / 2;
        pl.position.y = i * 3.5;
        pl.renderOrder = 2;
        this.nuvem.add(pl);
      }
      return;
    }
    // A: algodão pendurado; B: nuvem toon de bolas com contorno
    const mat =
      d === "A"
        ? new THREE.MeshPhysicalMaterial({ color: 0x6d7488, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0xdfe6ff), sheenRoughness: 0.8, bumpMap: texAlgodao(), bumpScale: 3, emissive: 0x8ea8ff, emissiveIntensity: 0 })
        : new THREE.MeshToonMaterial({ color: 0x6b5fa0, gradientMap: K.grad, emissive: 0xfff2a0, emissiveIntensity: 0 });
    this.nuvemMats.push(mat);
    const geo = new THREE.IcosahedronGeometry(1, d === "A" ? 4 : 3);
    if (d === "A") {
      // amassa a esfera para parecer chumaço de algodão
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
        const k = 1 + (fbm(v.x * 2 + 5, v.y * 2 + v.z * 1.7, 4) - 0.5) * 0.55;
        v.multiplyScalar(k);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
    }
    const nB = d === "A" ? 70 : 46;
    for (let i = 0; i < nB; i++) {
      const x = (r() - 0.5) * 150, z = -20 + (r() - 0.5) * 70;
      const s = 8 + r() * 12;
      const y = s * 0.55 + r() * 14;
      const me = K.m(geo, mat, 3, this.nuvem, [x, y, z], [r(), r(), r()], [s, s * 0.72, s]);
      me.castShadow = false;
    }
    if (d === "A") {
      // fios de náilon que seguram o algodão
      const fio = new THREE.MeshBasicMaterial({ color: 0x9aa4c0, transparent: true, opacity: 0.25 });
      for (const x of [-40, 5, 45]) {
        const f = new THREE.Mesh(cil(0.05, 0.05, 200, 4), fio);
        f.position.set(x, 120, -15);
        this.nuvem.add(f);
      }
    }
  }

  // --------------------------------------------------------------- chuva
  montaChuva() {
    const d = this.dir;
    const N = d === "B" ? 1400 : 2600;
    const g = new THREE.BoxGeometry(d === "B" ? 0.05 : 0.018, 1, d === "B" ? 0.05 : 0.018);
    this.chuvaMat = new THREE.MeshBasicMaterial({
      color: d === "B" ? 0xb8c4ff : 0xc8d4ff, transparent: true, depthWrite: false,
      opacity: d === "A" ? 0.22 : d === "B" ? 0.55 : 0.2, blending: d === "B" ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false,
    });
    this.chuva = new THREE.InstancedMesh(g, this.chuvaMat, N);
    this.chuva.frustumCulled = false;
    this.chuva.userData.semWire = true;
    this.scene.add(this.chuva);
  }

  // --------------------------------------------------------------- cargas
  montaCargas() {
    const d = this.dir;
    const K = this.k;
    const r = rng(23);
    const nLa = 26, nAz = 40;
    if (d === "B") {
      // bolinhas com carinha: laranja (+) e azuis (−)
      const face = (cor: number, mais: boolean) => {
        const g = new THREE.Group();
        K.m(esfera(1, 24, 16), K.mat({ color: cor }), 2.5, g);
        const olho = K.mat({ color: 0x1a0f0c, semContorno: true });
        const o1 = new THREE.Mesh(esfera(0.16, 10, 8), olho);
        o1.position.set(-0.32, 0.18, 0.88);
        const o2 = o1.clone();
        o2.position.x = 0.32;
        const boca = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 6, 12, Math.PI), olho);
        boca.position.set(0, -0.15, 0.9);
        boca.rotation.z = mais ? Math.PI : 0;
        const sinal = new THREE.Group();
        const ms = K.mat({ color: 0xffffff, semContorno: true });
        sinal.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.1), ms));
        if (mais) sinal.add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.1), ms));
        sinal.position.set(0, 0.62, 0.72);
        sinal.rotation.x = -0.6;
        g.add(o1, o2, boca, sinal);
        return g;
      };
      for (let i = 0; i < nLa; i++) {
        const o = face(0xff7a2c, true);
        o.scale.setScalar(0.42);
        this.cargasLa.push(o);
        this.pico.add(o);
      }
      for (let i = 0; i < nAz; i++) {
        const o = face(0x4aa8ff, false);
        o.scale.setScalar(0.9);
        this.cargasAz.push(o);
        this.scene.add(o);
      }
    } else {
      const tLa = texCarga("+", "rgb(255,120,50)");
      const tAz = texCarga("-", "rgb(70,150,255)");
      for (let i = 0; i < nLa; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tLa, transparent: true, depthWrite: false, depthTest: false, color: d === "C" ? 0x9a9a9a : 0xffffff }));
        s.renderOrder = 5;
        this.cargasLa.push(s);
        this.pico.add(s);
      }
      for (let i = 0; i < nAz; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tAz, transparent: true, depthWrite: false, depthTest: false, color: d === "C" ? 0xa0a0a0 : 0xffffff }));
        s.renderOrder = 5;
        this.cargasAz.push(s);
        this.scene.add(s);
      }
    }
    // posições de origem: laranja espalhadas pela torre e pela encosta; azuis na base da nuvem
    for (let i = 0; i < nLa; i++) {
      const a = r() * Math.PI * 2, rr = 2 + r() * 9;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const naTorre = i % 3 === 0;
      this.cargasLa0.push(naTorre ? new THREE.Vector3((r() - 0.5) * 1.5, TOPO + r() * 10, (r() - 0.5) * 1.5) : new THREE.Vector3(x, altura(x, z) + 0.6, z));
    }
    for (let i = 0; i < nAz; i++) this.cargasAz0.push(new THREE.Vector3((r() - 0.5) * 60, BASE_NUVEM - 1.5 - r() * 2, (r() - 0.5) * 22));
    [...this.cargasLa, ...this.cargasAz].forEach((o) => (o.userData.semWire = true));
  }

  montaParticulas() {
    // nuvem de pontos tirada da torre e do morro (para a virada IA)
    const r = rng(99);
    const p: number[] = [];
    for (let i = 0; i < 9000; i++) {
      const rr = Math.sqrt(r()) * 60, a = r() * Math.PI * 2;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      p.push(x, altura(x, z) + 0.1, z);
    }
    for (let i = 0; i < 2500; i++) {
      const y = r() * ALT_TORRE;
      const s = 1.5 - 1.18 * (y / ALT_TORRE);
      p.push((r() - 0.5) * 2 * s, TOPO + y, (r() - 0.5) * 2 * s);
    }
    this.partBase = new Float32Array(p);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p.slice(), 3));
    this.part = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: LARANJA, size: 0.3, map: this.tPonto, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    this.part.visible = false;
    this.part.userData.semWire = true;
    this.scene.add(this.part);
  }

  // --------------------------------------------------------------- raios
  raio(seed: number, onde: "torre" | "es") {
    const ch = `${onde}:${seed}`;
    let R = this.cache.get(ch);
    if (!R) {
      R = onde === "torre" ? gerarRaio(seed, PONTA, BASE_NUVEM + 1, { galhos: 1 }) : gerarRaio(seed, PONTA_ES, BASE_NUVEM_NY + 1, { galhos: 0.9, esc: 1.1 });
      this.cache.set(ch, R);
    }
    return R;
  }

  objRaio(i: number) {
    while (this.raiosObj.length <= i) {
      const d = this.dir;
      const core = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: d === "B" ? new THREE.Color(1.0, 0.97, 0.62) : new THREE.Color(6, 6.4, 8), fog: false }),
      );
      const halo = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: d === "B" ? 0xfff07a : 0x6f8cff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      core.userData.semWire = true;
      halo.userData.semWire = true;
      let contorno: THREE.Mesh | undefined;
      if (d === "B") {
        this.k.contorno(core, 2.2);
        contorno = core.children[0] as THREE.Mesh;
      }
      const brilho: THREE.Sprite[] = [];
      this.scene.add(core, halo);
      this.raiosObj.push({ core, halo, contorno, brilho });
    }
    return this.raiosObj[i];
  }

  aplicaRaios(e: Estado, t: number) {
    let luz = 0;
    const centro = new THREE.Vector3();
    let nAtivos = 0;
    this.raiosObj.forEach((o) => {
      o.core.visible = o.halo.visible = false;
      o.brilho.forEach((s) => (s.visible = false));
    });
    e.raios.forEach((re, i) => {
      const o = this.objRaio(i);
      const R = this.raio(re.seed, re.onde ?? "torre");
      if (re.p <= 0 || re.brilho <= 0.001) return;
      // de perto o canal afina (senão vira uma coluna de luz)
      const dcam = this.camera.position.distanceTo(R.ramos[0].nos[0].p);
      const esc = (this.dir === "B" ? 2.6 : 1) * clamp(dcam / 45, 0.35, 1);
      o.core.geometry.dispose();
      o.halo.geometry.dispose();
      o.core.geometry = geoRaio(R, re.p, esc * (0.45 + 0.35 * Math.min(1, re.brilho)));
      o.halo.geometry = geoRaio(R, re.p, esc * (this.dir === "B" ? 2.2 : this.dir === "C" ? 2.4 : 3.2), 6);
      if (o.contorno) o.contorno.geometry = o.core.geometry;
      const b = re.brilho * (re.fade ?? 1);
      const mc = o.core.material as THREE.MeshBasicMaterial;
      if (this.dir === "B") {
        // toon: sempre opaco (transparente deixava o contorno escuro aparecer e o raio virava "galho")
        const vivo = b > 0.08;
        mc.color.setRGB(1.0, 0.98, 0.7).lerp(new THREE.Color(0.55, 0.5, 0.85), vivo ? 1 - Math.min(1, b * 1.6) : 1);
        o.core.visible = true;
        if (o.contorno) o.contorno.visible = !this.wireAtivo && b > 0.25;
      } else mc.color.setRGB(3.2, 3.4, 4.4).multiplyScalar(0.3 + 0.7 * b);
      (o.halo.material as THREE.MeshBasicMaterial).opacity = (this.dir === "B" ? 0.2 : 0.07) * Math.min(1.6, b);
      o.core.visible = o.halo.visible = true;
      // brilho nas pontas que ainda crescem
      const ps = re.p < 1 ? pontas(R, re.p) : [];
      while (o.brilho.length < ps.length) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tPonto, color: this.dir === "B" ? 0xfff6c0 : 0xdfe8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
        s.userData.semWire = true;
        this.scene.add(s);
        o.brilho.push(s);
      }
      ps.forEach((p, k) => {
        const s = o.brilho[k];
        s.visible = true;
        s.position.copy(p);
        const dd = clamp(p.distanceTo(this.camera.position) / 40, 0.2, 1.5);
        s.scale.setScalar((k === 0 ? 2.0 : 1.0) * (this.dir === "B" ? 0.8 : 1) * dd);
      });
      // luz do raio: no meio do trecho já desenhado
      const L = re.p * R.comp;
      const prin = R.ramos[0].nos;
      let meio = prin[0].p;
      for (const no of prin) if (no.d <= L * 0.5) meio = no.p;
      centro.add(meio);
      nAtivos++;
      luz += b * (0.35 + 0.65 * Math.min(1, re.p));
    });
    if (nAtivos) centro.multiplyScalar(1 / nAtivos);
    else centro.set(...PONTA);
    this.luzRaio.position.copy(centro);
    const kLuz = this.dir === "A" ? 70 : this.dir === "B" ? 55 : 75;
    this.luzRaio.intensity = kLuz * Math.min(2.2, luz + (e.flash ?? 0) * 1.4);
    return { centro, luz };
  }

  // --------------------------------------------------------------- estado por quadro
  aplica(e: Estado, t: number) {
    const d = this.dir;
    const ny = e.set === "ny";
    this.pico.visible = !ny;
    this.ny.visible = ny;
    // câmera
    const c = e.cam;
    const tr = e.tremor ?? 0;
    const sx = tr * (Math.sin(t * 61) * 0.6 + Math.sin(t * 37) * 0.4), sy = tr * Math.sin(t * 53 + 1);
    this.camera.position.set(c.pos[0] + sx, c.pos[1] + sy, c.pos[2]);
    this.camera.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
    this.camera.lookAt(c.alvo[0] + sx, c.alvo[1] + sy, c.alvo[2]);
    this.camera.fov = c.fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    // "lua" e sombra em volta do alvo
    const alvo = new THREE.Vector3(...c.alvo);
    const S = e.sombra ?? 40;
    this.sol.position.copy(alvo).add(new THREE.Vector3(-0.55, 0.75, 0.45).multiplyScalar(160));
    this.sol.target.position.copy(alvo);
    Object.assign(this.sol.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 400 });
    this.sol.shadow.camera.updateProjectionMatrix();
    // nuvem: chega da direita até ficar sobre a torre
    const nv = e.nuvem ?? 1;
    const baseN = ny ? BASE_NUVEM_NY : BASE_NUVEM;
    this.nuvem.position.set((1 - nv) * 140, baseN, 0);
    // raios
    const { centro, luz } = this.aplicaRaios(e, t);
    const fl = Math.min(1.5, luz * 0.6 + (e.flash ?? 0));
    this.nuvemMats.forEach((m) => ((m as THREE.MeshPhysicalMaterial).emissiveIntensity = fl * (d === "A" ? 0.12 : 0.3)));
    const fc = new THREE.Vector2(centro.x, centro.y + 30);
    if (this.ceuC) {
      this.ceuC.uniforms.flash.value = fl;
      this.ceuC.uniforms.fc.value.copy(fc);
      this.ceuC.uniforms.tempo.value = e.tChuva;
    }
    if (this.baseC) {
      this.baseC.uniforms.flash.value = fl * 1.3;
      this.baseC.uniforms.fc.value.set(centro.x - this.nuvem.position.x, centro.z);
      this.baseC.uniforms.tempo.value = e.tChuva;
    }
    if (this.fundo && d === "B") (this.fundo.material as THREE.MeshBasicMaterial).color.setScalar(1 + fl * 0.6);
    // farol vermelho pisca (1,5 s)
    const pisca = (t % 1.5) < 0.75 ? 1 : 0.12;
    (this.farol.material as THREE.MeshBasicMaterial).color.setRGB(4 * pisca + 0.2, 0.25 * pisca, 0.15 * pisca);
    // coroa
    const co = e.coroa ?? 0;
    const cm = this.coroaSpr.material as THREE.SpriteMaterial;
    cm.opacity = Math.min(1, co);
    this.coroaSpr.scale.setScalar(0.25 + co * (d === "B" ? 1.3 : 1.0) * (1 + 0.15 * Math.sin(t * 40)));
    // cargas
    this.aplicaCargas(e, t);
    // chuva (posição é função pura de tChuva)
    this.aplicaChuva(e);
    // virada IA
    this.aplicaWire(e);
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = e.foco ?? 0.5;
    this.final.uniforms.tempo.value = t;
  }

  aplicaCargas(e: Estado, t: number) {
    const g = e.cargasTorre ?? 0;
    const B = this.dir === "B";
    const ponta = new THREE.Vector3(...PONTA);
    this.cargasLa.forEach((o, i) => {
      const atraso = (i / this.cargasLa.length) * 0.5;
      const k = clamp((g - atraso) / 0.5);
      const ke = k * k * (3 - 2 * k);
      o.visible = g > 0.01;
      // destino: aglomerado em volta da ponta (empilhadas e se empurrando)
      const a = i * 2.39996, camada = Math.floor(i / 9);
      const rr = (B ? 0.55 : 0.18) + camada * (B ? 0.4 : 0.14);
      const dest = ponta.clone().add(new THREE.Vector3(Math.cos(a) * rr, (B ? -0.2 : -0.1) - camada * (B ? 0.55 : 0.28) - (i % 3) * (B ? 0.18 : 0.09), Math.sin(a) * rr * 0.6));
      const p = this.cargasLa0[i].clone().lerp(dest, ke);
      // empurra-empurra quando juntas
      const jit = ke * (0.08 + 0.05 * Math.sin(i)) * Math.sin(t * (9 + i % 5) + i);
      p.x += jit;
      p.y += jit * 0.6 * Math.cos(t * 7 + i);
      o.position.copy(p);
      const dc = clamp(p.distanceTo(this.camera.position) / 32, 0.22, 1.4); // tamanho estável na tela
      const s = (B ? 0.42 : 0.9) * dc * clamp(g * 3) * (1 + (B ? 0.12 * ke * Math.sin(t * 11 + i * 1.7) : 0));
      if (B) {
        o.scale.set(s * (1 + 0.1 * Math.sin(t * 9 + i)), s * (1 - 0.1 * Math.sin(t * 9 + i)), s);
        o.lookAt(this.camera.position);
      } else o.scale.setScalar(s);
    });
    const ga = e.cargasNuvem ?? 0;
    const nx = this.nuvem.position.x;
    this.cargasAz.forEach((o, i) => {
      const k = clamp((ga - (i / this.cargasAz.length) * 0.4) / 0.6);
      o.visible = ga > 0.01;
      const p0 = this.cargasAz0[i];
      const ny = e.set === "ny";
      o.position.set(p0.x + nx + Math.sin(t * 1.3 + i) * 0.3, (ny ? BASE_NUVEM_NY : p0.y) - (ny ? 2 : 0), p0.z);
      const s = (B ? 0.9 : 1.9) * k;
      if (B) {
        o.scale.set(s * (1 + 0.06 * Math.sin(t * 6 + i)), s, s);
        o.lookAt(this.camera.position);
      } else o.scale.setScalar(s);
    });
  }

  aplicaChuva(e: Estado) {
    const N = this.chuva.count;
    const am = e.chuva ?? 1;
    this.chuva.visible = am > 0.01 && !(e.wire && e.wire > 0.5);
    if (!this.chuva.visible) return;
    const r = rng(5);
    const cam = this.camera.position;
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    const dist = Math.max(2, new THREE.Vector3(...e.cam.alvo).distanceTo(cam));
    const B = Math.min(60, dist * 0.9); // caixa de chuva proporcional ao enquadramento
    const centro = cam.clone().addScaledVector(fwd, B * 0.72);
    const vel = B * 1.1; // queda por segundo
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12));
    const L = Math.min(1.1, B * (this.dir === "B" ? 0.04 : 0.026));
    for (let i = 0; i < N; i++) {
      const x0 = r(), y0 = r(), z0 = r();
      const vis = r() < am;
      let y = (y0 - (e.tChuva * vel) / B) % 1;
      if (y < 0) y += 1;
      const x = ((x0 + y * 0.12) % 1) - 0.5;
      const p = new THREE.Vector3(centro.x + x * B, centro.y + (y - 0.5) * B, centro.z + (z0 - 0.5) * B);
      m4.compose(p, q, new THREE.Vector3(0.5 + B * 0.004, vis ? L : 0.0001, 0.5 + B * 0.004));
      this.chuva.setMatrixAt(i, m4);
    }
    this.chuva.instanceMatrix.needsUpdate = true;
    this.chuvaMat.opacity = (this.dir === "A" ? 0.16 : this.dir === "B" ? 0.5 : 0.16) * (1 + Math.min(1.5, (e.flash ?? 0) * 2));
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
        if (o === this.fundo) {
          o.visible = !liga;
          return;
        }
        if ((o as THREE.Points).isPoints && o !== this.part) {
          o.visible = !liga;
          return;
        }
        if ((o as THREE.Sprite).isSprite) return;
        if (o.userData.someNoArame) {
          o.visible = !liga;
          return;
        }
        if ((o as THREE.InstancedMesh).isInstancedMesh && o !== this.chuva) {
          o.visible = !liga; // árvores e prédios instanciados não entram no arame
          return;
        }
        const m = o as THREE.Mesh;
        if (!m.isMesh || o.userData.semWire) return;
        if (liga) {
          this.originais.set(m, m.material);
          m.material = this.wireMat;
        } else if (this.originais.has(m)) m.material = this.originais.get(m)!;
      });
      if (liga) {
        this.fogOrig = this.scene.fog;
        this.bgOrig = this.scene.background as THREE.Color;
        this.scene.fog = null;
        this.scene.background = TINTA.clone();
        this.renderer.shadowMap.enabled = false;
      } else {
        this.scene.fog = this.fogOrig;
        this.scene.background = this.bgOrig;
        this.renderer.shadowMap.enabled = true;
      }
    }
    if (liga) {
      this.raiosObj.forEach((o) => {
        (o.core.material as THREE.MeshBasicMaterial).color.copy(LARANJA).multiplyScalar(2.5);
        o.halo.visible = false;
        if (o.contorno) o.contorno.visible = false;
      });
      this.cargasLa.forEach((o) => (o.visible = false));
      this.cargasAz.forEach((o) => (o.visible = false));
      this.coroaSpr.visible = false;
    } else this.coroaSpr.visible = true;
    this.bloom.strength = liga ? 0.25 : this.dir === "A" ? 0.38 : this.dir === "B" ? 0.3 : 0.7;
    this.final.uniforms.sat.value = liga ? 1 : this.dir === "C" ? 0.32 : 1;
    this.final.uniforms.grao.value = liga ? 0.0 : this.dir === "A" ? 0.035 : this.dir === "C" ? 0.075 : 0;
    this.final.uniforms.tinta.value.set(...((liga || this.dir !== "C" ? [1, 1, 1] : [0.9, 1.0, 1.12]) as [number, number, number]));
    if (this.tiltH && this.tiltV) this.tiltH.uniforms.forca.value = this.tiltV.uniforms.forca.value = liga ? 0.25 : 1;
    this.chaoWire.visible = liga && e.set === "pico";
    // partículas
    const pa = e.part ?? 0;
    this.part.visible = liga;
    if (liga) {
      const at = this.part.geometry.attributes.position as THREE.BufferAttribute;
      const b = this.partBase;
      for (let i = 0; i < at.count; i++) {
        const k = pa * (0.4 + ((i * 7919) % 100) / 100);
        at.setXYZ(i, b[i * 3] + Math.sin(i * 1.7) * 4 * k, b[i * 3 + 1] + k * (3 + (i % 11)), b[i * 3 + 2] + Math.cos(i * 2.3) * 4 * k);
      }
      at.needsUpdate = true;
    }
  }

  render() {
    this.composer.render();
  }
}
