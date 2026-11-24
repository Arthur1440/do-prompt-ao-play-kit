import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Dir, Kit, V3 } from "./kit";
import { Raposa, PoseRaposa } from "./raposa";
import { texPapel } from "./tex";
import { Recursos, SetBase, SetNome } from "./sets";
import { criaSets } from "./criaSets";
import type { Diretoria } from "./sets2";
import type { PoseDir } from "./dirigente";

export type Estado = {
  set: SetNome;
  cam: { pos: V3; alvo: V3; fov?: number; rolo?: number };
  foco?: number; // A: centro da faixa nítida (0 = base, 1 = topo)
  raposa?: PoseRaposa;
  pres?: PoseDir;
  rivais?: PoseDir[];
  p?: Record<string, number>;
};

export class Mundo {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  kit: Kit;
  sol: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  contra: THREE.DirectionalLight;
  raposa: Raposa;
  sets: Record<string, SetBase>;
  tiltH?: ShaderPass;
  tiltV?: ShaderPass;
  bloom?: UnrealBloomPass;
  final: ShaderPass;
  tinta?: ShaderPass;
  atual: SetBase | null = null;

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number, rec: Recursos) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = dir === "A" ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.localClippingEnabled = true;
    this.renderer = r;
    this.kit = new Kit(dir, W, H);
    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 400);

    if (dir === "A") {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.45;
    }
    this.sol = new THREE.DirectionalLight(0xffffff, 2.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.012;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x99887a, 1.5);
    this.contra = new THREE.DirectionalLight(0xfff2dd, 1.4);
    this.scene.add(this.sol, this.sol.target, this.hemi, this.contra);

    this.raposa = new Raposa(this.kit);
    this.scene.add(this.raposa.raiz);
    this.sets = criaSets(this.kit, rec, () => this.raposa.raiz);
    for (const s of Object.values(this.sets)) {
      s.grupo.visible = false;
      this.scene.add(s.grupo);
    }

    // pós-processamento
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    const comp = new EffectComposer(r, rt);
    comp.setPixelRatio(1);
    comp.setSize(W, H);
    comp.addPass(new RenderPass(this.scene, this.camera));
    if (dir !== "C") {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "A" ? 0.22 : 0.12, 0.6, dir === "A" ? 0.9 : 0.96);
      comp.addPass(this.bloom);
    }
    comp.addPass(new OutputPass());
    if (dir === "A") {
      this.tiltH = new ShaderPass(TILT);
      this.tiltH.uniforms.dir.value.set(1 / W, 0);
      this.tiltV = new ShaderPass(TILT);
      this.tiltV.uniforms.dir.value.set(0, 1 / H);
      comp.addPass(this.tiltH);
      comp.addPass(this.tiltV);
    }
    if (dir === "C") {
      this.tinta = new ShaderPass(TINTA);
      this.tinta.uniforms.res.value.set(W, H);
      this.tinta.uniforms.tPapel.value = texPapel(1024, [240, 232, 214], 17);
      comp.addPass(this.tinta);
    }
    this.final = new ShaderPass(FINAL);
    this.final.uniforms.res.value.set(W, H);
    this.final.uniforms.grao.value = dir === "A" ? 0.035 : dir === "C" ? 0.018 : 0;
    this.final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.3;
    this.final.uniforms.quente.value = dir === "A" ? 0.025 : 0;
    comp.addPass(this.final);
    this.composer = comp;
  }

  aplica(e: Estado, t: number) {
    const s = this.sets[e.set];
    if (this.atual !== s) {
      if (this.atual) this.atual.grupo.visible = false;
      s.grupo.visible = true;
      this.atual = s;
    }
    const cam = this.camera;
    cam.fov = e.cam.fov ?? 30;
    cam.position.set(...e.cam.pos);
    cam.up.set(Math.sin(e.cam.rolo ?? 0), Math.cos(e.cam.rolo ?? 0), 0);
    cam.lookAt(...e.cam.alvo);
    cam.updateProjectionMatrix();
    this.raposa.aplica(e.raposa ?? { vis: false }, t);
    if (e.set === "diretoria") (s as Diretoria).poses(e.pres ?? { vis: false }, e.rivais ?? [], t);
    s.luz(this, t, e);
    s.aplica(this, t, e);
    if (this.tiltH && this.tiltV) {
      this.tiltH.uniforms.centro.value = this.tiltV.uniforms.centro.value = e.foco ?? 0.45;
      this.tiltH.uniforms.forca.value = this.tiltV.uniforms.forca.value = e.p?.tilt ?? 1;
    }
    if (this.tinta) {
      this.tinta.uniforms.tempo.value = t;
      this.tinta.enabled = e.set !== "virada";
    }
    this.final.uniforms.tempo.value = t;
  }

  render() {
    this.composer.render();
  }
}

// Tilt-shift em 2 passadas (A)
export const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.15, 0.5, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) {
        float k = exp(-float(i*i)/24.0);
        s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k;
      }
      gl_FragColor = s / w;
    }`,
};

// Nanquim (C): papel jornal, traço preto, hachura pela luminância e cor só como tinta chapada com retícula.
export const TINTA = {
  uniforms: { tDiffuse: { value: null }, tPapel: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tPapel; uniform vec2 res; uniform float tempo; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    float linha(float v, float per, float larg){ float f = abs(fract(v/per)-0.5)*per; return 1.0 - smoothstep(larg*0.5, larg*0.5+0.9, f); }
    void main(){
      vec2 px = vUv*res;
      // "boil" do traço a 12 qps: leve tremida por blocos
      float fq = floor(tempo*12.0);
      vec2 b = floor(px/48.0);
      vec2 j = (vec2(h(b+fq), h(b+fq+3.7))-0.5)*1.1;
      vec3 c = texture2D(tDiffuse, (px+j)/res).rgb;
      float L = dot(c, vec3(0.299,0.587,0.114));
      float mx = max(c.r,max(c.g,c.b)), mn = min(c.r,min(c.g,c.b));
      float sat = (mx-mn)/(mx+0.001);
      vec3 papel = texture2D(tPapel, vUv*vec2(1.0, res.y/res.x)).rgb;
      vec3 tintaPreta = vec3(0.09,0.075,0.06);
      vec3 col = papel;
      float tinta = 0.0;
      // irregularidade do traço
      float n = h(floor(px/3.0)+fq*0.37)*0.12;
      // só azul, verde e vermelho viram tinta de cor; laranja e marrom (madeira, sépia) ficam no preto e branco
      float hue = 0.0;
      if (mx == c.r) hue = mod((c.g-c.b)/(mx-mn+1e-4), 6.0);
      else if (mx == c.g) hue = (c.b-c.r)/(mx-mn+1e-4) + 2.0;
      else hue = (c.r-c.g)/(mx-mn+1e-4) + 4.0;
      hue *= 60.0;
      bool corDeTinta = (hue > 85.0 && hue < 265.0) || ((hue > 340.0 || hue < 12.0) && sat > 0.55);
      if (sat > 0.28 && mx > 0.08 && corDeTinta) {
        // tinta de cor chapada (como impressão em 2 cores) + retícula escura na sombra
        vec3 cor = c/mx; cor = mix(vec3(dot(cor,vec3(0.333))), cor, 1.25);
        float val = clamp(mx*1.25, 0.0, 1.0);
        vec3 chapa = papel * mix(vec3(1.0), clamp(cor*0.92,0.0,1.0), 0.9);
        mat2 rot = mat2(0.707,-0.707,0.707,0.707);
        vec2 q = rot*px/7.0; vec2 f = fract(q)-0.5;
        float rr = sqrt(clamp(1.0-val,0.0,1.0))*0.7;
        float ponto = 1.0 - smoothstep(rr-0.08, rr+0.08, length(f));
        col = mix(chapa, chapa*0.32, ponto);
        if (val > 0.95) col = mix(col, papel, smoothstep(0.95,1.2,mx)); // brilho = papel
      } else {
        float l1 = linha(px.x+px.y, 8.0, 1.25);
        float l2 = linha(px.x-px.y, 8.0, 1.25);
        float l3 = linha(px.x+px.y+4.0, 8.0, 1.4);
        if (L < 0.66 + n) tinta = max(tinta, l1*0.85);
        if (L < 0.44 + n) tinta = max(tinta, l2*0.9);
        if (L < 0.26 + n) tinta = max(tinta, l3);
        if (L < 0.11) tinta = 1.0;
        col = mix(papel, tintaPreta, tinta);
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export const FINAL = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 }, grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col += vec3(quente, quente*0.35, -quente);
      vec2 cc = vUv - 0.5;
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
