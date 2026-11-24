// Kit das 3 direções do forno solar (ficha catalogo-estilos). Material, luz e pós mudam JUNTOS:
//   A = maquete de brinquedo com tilt-shift: plástico Physical fosco com verniz e bump de vinil, RoomEnvironment,
//       sol quente e baixo de fim de tarde, bloom leve, tilt-shift com foco por plano, grão, vinheta, toque quente.
//   B = toon 3D com contorno: MeshToon de 3 faixas (Nearest), casco em espaço de tela (3 px), sol branco forte,
//       hemisfério neutro, SEM environment, NeutralToneMapping, vinheta leve, sem grão.
//   C = comercial fotorreal ao sol: Physical com texturas de desgaste, environment de céu (reflexo no vidro e no
//       espelho), sol de fim de manhã alto, ACES, profundidade de campo real (por profundidade, não faixa),
//       bloom nos brilhos, aberração cromática leve, grão fino de filme.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Dir = "A" | "B" | "C";

export function gradToon() {
  const d = new Uint8Array([95, 95, 95, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export function texRuidoFino(seed = 3) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export type OpMat = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  rough?: number;
  metal?: number;
  clear?: number;
  bump?: THREE.Texture | null;
  bumpS?: number;
  semBump?: boolean;
  semContorno?: boolean;
  emis?: THREE.ColorRepresentation;
  emisI?: number;
  transp?: number;
  lado?: THREE.Side;
  basico?: boolean; // luz própria, não recebe luz
  aditivo?: boolean;
  vidro?: boolean;
  espelho?: boolean;
};

export class Kit {
  grad = gradToon();
  ruido = texRuidoFino();
  /** cor de contorno compartilhada por tudo o que for criado enquanto estiver definida (o forno acende em laranja no toon) */
  grupo?: { value: THREE.Color };
  /** ambiente de céu só para espelho e vidro (a maquete reflete a sala no resto) */
  envReflexo: THREE.Texture | null = null;
  constructor(public dir: Dir, public W: number, public H: number) {}

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const emis = new THREE.Color(o.emis ?? 0x000000);
    const d = this.dir;
    if (o.basico || o.aditivo) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, toneMapped: false });
      if (o.aditivo) {
        m.blending = THREE.AdditiveBlending;
        m.transparent = true;
        m.depthWrite = false;
      }
    } else if (o.vidro) {
      // vidro: reflexo do ambiente; no toon, faixas brancas pintadas (ver forno.ts)
      m = d === "B"
        ? new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22, depthWrite: false })
        : new THREE.MeshPhysicalMaterial({
            color: 0xffffff, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
            transparent: true, opacity: d === "A" ? 0.1 : 0.1, depthWrite: false, envMapIntensity: d === "C" ? 1.3 : 0.9,
            specularIntensity: 1, ior: 1.5,
          });
    } else if (o.espelho) {
      m = d === "B"
        ? new THREE.MeshToonMaterial({ color: 0xcfe9ff, gradientMap: this.grad, emissive: 0x6aa8d8, emissiveIntensity: 0.25 })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 1, envMapIntensity: d === "C" ? 1.5 : 1.2 });
    } else if (d === "B") {
      m = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, gradientMap: this.grad,
        emissive: emis, emissiveIntensity: o.emisI ?? 1,
      });
    } else if (d === "A") {
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null, roughness: o.rough ?? 0.5, metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        bumpMap: o.semBump ? null : o.bump ?? this.ruido, bumpScale: o.bump ? o.bumpS ?? 1 : 0.15,
        emissive: emis, emissiveIntensity: o.emisI ?? 1,
      });
    } else {
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0,
        clearcoat: o.clear ?? 0, clearcoatRoughness: 0.3,
        bumpMap: o.bump ?? null, bumpScale: o.bumpS ?? 1,
        emissive: emis, emissiveIntensity: o.emisI ?? 1,
      });
    }
    if ((o.vidro || o.espelho) && this.envReflexo && d === "A") (m as THREE.MeshStandardMaterial).envMap = this.envReflexo;
    if (o.transp !== undefined) {
      m.transparent = true;
      (m as THREE.MeshStandardMaterial).opacity = o.transp;
      m.depthWrite = false;
    }
    if (o.lado !== undefined) m.side = o.lado;
    m.userData.semContorno = !!o.semContorno || !!o.basico || !!o.aditivo || !!o.vidro;
    if (o.aditivo || o.vidro) m.userData.semProf = true;
    return m;
  }

  /** contorno escuro em espaço de tela (só B). Cor trocável depois por uniforms.cor (o forno "acende" em laranja). */
  matContorno = (() => {
    const u = { px: { value: 3 }, res: { value: new THREE.Vector2(1080, 1920) }, cor: { value: new THREE.Color("#1a0f0c") } };
    return u;
  })();
  contorno(mesh: THREE.Mesh, px = 3, grupo?: { value: THREE.Color }) {
    if (this.dir !== "B") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: grupo ?? this.grupo ?? { value: new THREE.Color("#1a0f0c") } },
      vertexShader: /* glsl */ `
        uniform float px; uniform vec2 res;
        #include <clipping_planes_pars_vertex>
        void main(){
          vec4 p = vec4(position,1.0); vec3 n = normal;
          #ifdef USE_INSTANCING
            p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
          #endif
          vec4 mvPosition = modelViewMatrix * p;
          vec4 c = projectionMatrix * mvPosition;
          vec3 vn = normalize(mat3(modelViewMatrix) * n);
          vec2 d = normalize((projectionMatrix * vec4(vn,0.0)).xy + 1e-5);
          c.xy += d * px * 2.0 / res * c.w;
          gl_Position = c;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: `uniform vec3 cor;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          gl_FragColor = vec4(cor,1.0); }`,
      side: THREE.BackSide,
    });
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    mesh.add(o);
  }

  m(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], px = 3, grupo?: { value: THREE.Color }) {
    const me = new THREE.Mesh(geo, mat);
    const m0 = Array.isArray(mat) ? mat[0] : mat;
    me.castShadow = me.receiveShadow = !(m0 as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    if (m0.userData.semProf) me.userData.semProf = true;
    this.contorno(me, px, grupo);
    return me;
  }
}

// ---------------------------------------------------------------------------------------------- ambiente de céu (C)
function ambienteCeu(renderer: THREE.WebGLRenderer, solDir: THREE.Vector3) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { sol: { value: solDir.clone().normalize() } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sol; varying vec3 vD;
      void main(){
        float y = vD.y;
        vec3 zen = vec3(0.10,0.30,0.85), hor = vec3(0.75,0.88,1.0), chao = vec3(0.32,0.20,0.12);
        vec3 c = y > 0.0 ? mix(hor, zen, pow(y, 0.55)) : mix(hor*0.7, chao, pow(-y, 0.4));
        float s = max(dot(vD, sol), 0.0);
        c += vec3(1.0,0.92,0.75) * (pow(s, 900.0) * 60.0 + pow(s, 12.0) * 0.6);
        gl_FragColor = vec4(c*1.2, 1.0);
      }`,
  });
  s.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(s, 0.02).texture;
}

// ---------------------------------------------------------------------------------------------- renderizador
export function montaMundo(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, stencil: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = dir === "C" ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = dir === "B" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dir === "A" ? 1.05 : dir === "C" ? 1.0 : 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 200);

  // sol: A fim de tarde (baixo, quente), B meio-dia (branco), C fim de manhã (alto, levemente quente)
  const solDir = dir === "A" ? new THREE.Vector3(-3.6, 2.5, 2.6) : dir === "B" ? new THREE.Vector3(-2.0, 4.6, 3.6) : new THREE.Vector3(-1.8, 4.4, 3.4);
  const envCeu = dir === "B" ? null : ambienteCeu(renderer, solDir);
  if (dir === "A") {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
  } else if (dir === "C") {
    scene.environment = envCeu;
    scene.environmentIntensity = 0.55;
  }

  const sol = new THREE.DirectionalLight(dir === "A" ? 0xffcf9a : dir === "B" ? 0xffffff : 0xfff0da, dir === "A" ? 3.4 : dir === "B" ? 2.6 : 4.2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(4096, 4096);
  sol.shadow.bias = dir === "C" ? -0.0002 : -0.0004;
  sol.shadow.normalBias = 0.02;
  if (dir === "C") (sol.shadow as THREE.DirectionalLightShadow).radius = 5;
  if (dir === "C") (sol.shadow as unknown as { blurSamples: number }).blurSamples = 16;
  Object.assign(sol.shadow.camera, { left: -6.5, bottom: -6.5, right: 6.5, top: 6.5, near: 0.5, far: 40 });
  const hemi = new THREE.HemisphereLight(dir === "A" ? 0xcfe0ff : dir === "B" ? 0xffffff : 0xbcd6ff, dir === "A" ? 0x8a5a3a : dir === "B" ? 0x9a8a78 : 0x7a5236, dir === "A" ? 0.9 : dir === "B" ? 1.5 : 0.55);
  const contra = new THREE.DirectionalLight(dir === "A" ? 0xffe2b8 : 0xfff2dd, dir === "A" ? 1.6 : dir === "B" ? 1.2 : 0.9);
  contra.position.set(2.5, 2.2, -4);
  scene.add(sol, sol.target, hemi, contra);

  // estêncil: as tampas do corte de terreno (corte.ts) contam faces por estêncil
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true });
  if (dir === "C") {
    // profundidade real da cena (inclui as tampas do corte) para o desfoque de lente
    const dt = new THREE.DepthTexture(W, H);
    dt.format = THREE.DepthStencilFormat;
    dt.type = THREE.UnsignedInt248Type;
    rt.depthTexture = dt;
  }
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));

  // profundidade de campo real (C): lê a profundidade do próprio render (sem feixes nem partículas, que não gravam profundidade)
  let dof: ShaderPass | undefined;
  if (dir === "C") {
    dof = new ShaderPass(DOF);
    dof.uniforms.res.value.set(W, H);
    composer.addPass(dof);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "A" ? 0.22 : dir === "B" ? 0.18 : 0.32, dir === "A" ? 0.6 : 0.5, dir === "A" ? 0.9 : dir === "B" ? 0.97 : 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let tiltH: ShaderPass | undefined, tiltV: ShaderPass | undefined;
  if (dir === "A") {
    tiltH = new ShaderPass(TILT);
    tiltH.uniforms.dir.value.set(1 / W, 0);
    tiltV = new ShaderPass(TILT);
    tiltV.uniforms.dir.value.set(0, 1 / H);
    composer.addPass(tiltH);
    composer.addPass(tiltV);
  }
  const final = new ShaderPass(FINAL);
  final.uniforms.res.value.set(W, H);
  final.uniforms.grao.value = dir === "A" ? 0.035 : dir === "C" ? 0.022 : 0.0;
  final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.34;
  final.uniforms.quente.value = dir === "A" ? 0.025 : dir === "C" ? 0.012 : 0.0;
  final.uniforms.ca.value = dir === "C" ? 1.6 : 0.0;
  final.uniforms.sat.value = dir === "C" ? 1.06 : dir === "B" ? 1.05 : 1.0;
  composer.addPass(final);

  /** foco: A = centro da faixa nítida (0 base .. 1 topo); C = distância de foco (m). forca: A = força do tilt; C = abertura */
  const quadro = (t: number, foco = 0.45, forca = 1) => {
    if (tiltH && tiltV) {
      tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
      tiltH.uniforms.forca.value = tiltV.uniforms.forca.value = forca;
    }
    if (dof) {
      // o RenderPass desenha no readBuffer atual: a profundidade dele é a desta imagem
      dof.uniforms.tProf.value = composer.readBuffer.depthTexture;
      dof.uniforms.foco.value = foco;
      dof.uniforms.abertura.value = forca;
      dof.uniforms.lente.value = Math.pow(30 / camera.fov, 2);
      dof.uniforms.near.value = camera.near;
      dof.uniforms.far.value = camera.far;
    }
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, sol, solDir, hemi, contra, bloom, final, quadro, envCeu };
}

export const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.17, 0.52, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) {
        float k = exp(-float(i*i)/24.0);
        s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k;
      }
      gl_FragColor = s / w;
    }`,
};

// Profundidade de campo por profundidade (círculo de confusão), amostragem em espiral dourada.
export const DOF = {
  uniforms: {
    tDiffuse: { value: null }, tProf: { value: null }, res: { value: new THREE.Vector2() },
    foco: { value: 1.5 }, abertura: { value: 1 }, lente: { value: 1 }, near: { value: 0.02 }, far: { value: 200 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tProf; uniform vec2 res; uniform float foco, abertura, lente, near, far; varying vec2 vUv;
    float vz(vec2 uv){ float d = texture2D(tProf, uv).x; return -perspectiveDepthToViewZ(d, near, far); }
    float coc(float z){ return clamp(abertura * lente * 26.0 * abs(z - foco) / max(z, 0.05) / max(foco, 0.05), 0.0, 22.0); }
    void main(){
      float z0 = vz(vUv); float c0 = coc(z0);
      vec3 acc = texture2D(tDiffuse, vUv).rgb; float wsum = 1.0;
      const int N = 48; float ga = 2.39996;
      for (int i = 1; i < N; i++) {
        float r = sqrt(float(i) / float(N)) * 22.0; float a = float(i) * ga;
        vec2 off = vec2(cos(a), sin(a)) * r / res;
        vec2 uv = vUv + off;
        float z = vz(uv); float c = coc(z);
        // a amostra entra se o desfoque dela alcança este pixel (frente) ou se este pixel está desfocado o bastante (fundo)
        float alc = (z < z0) ? c : min(c, c0);
        float w = smoothstep(r - 1.5, r, alc);
        acc += texture2D(tDiffuse, uv).rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.0);
    }`,
};

export const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, escuro: { value: 0.0 }, ca: { value: 0 }, sat: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, escuro, ca, sat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5;
      vec3 col;
      if (ca > 0.0) {
        vec2 o = cc * ca / res * 2.0 * length(cc) * 2.0;
        col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      } else col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, sat);
      col += vec3(quente, quente*0.35, -quente);
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col *= 1.0 - escuro;
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
