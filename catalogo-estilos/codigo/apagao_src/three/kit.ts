// Kit das 3 direções do apagão (ficha catalogo-estilos):
//   A = maquete de brinquedo à noite com tilt-shift (plástico Physical + LEDs + grão)
//   B = toon 3D com contorno (MeshToon 3 faixas + casco em espaço de tela, luar forte)
//   C = low poly noturno com bloom (flat shading, neblina azul, janelas brilhando: a cidade do @badger)
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Dir = "A" | "B" | "C";

export function gradToon() {
  const d = new Uint8Array([90, 90, 90, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
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
  semContorno?: boolean;
  emis?: THREE.ColorRepresentation;
  emisI?: number;
  emisMap?: THREE.Texture | null;
  transp?: number;
  lado?: THREE.Side;
  semBump?: boolean;
  basico?: boolean; // luz própria (LED, tela): não recebe luz
};

/** Uniformes de "luz ligada" injetados no emissivo: R = máscara, G = sorteio (acende quem tem G < uLuz*0,78). */
export type Janela = { uLuz: { value: number }; uT: { value: number }; uCor: { value: THREE.Color } };

export class Kit {
  grad = gradToon();
  ruido = texRuidoFino();
  constructor(public dir: Dir, public W: number, public H: number) {}

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const emis = new THREE.Color(o.emis ?? 0x000000);
    if (o.basico) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, toneMapped: false });
    } else if (this.dir === "B") {
      m = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, gradientMap: this.grad,
        emissive: emis, emissiveIntensity: o.emisI ?? 1, emissiveMap: o.emisMap ?? null,
      });
    } else if (this.dir === "C") {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, flatShading: true,
        roughness: o.rough ?? 0.8, metalness: o.metal ?? 0,
        emissive: emis, emissiveIntensity: o.emisI ?? 1, emissiveMap: o.emisMap ?? null,
      });
    } else {
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null, roughness: o.rough ?? 0.5, metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        bumpMap: o.semBump ? null : this.ruido, bumpScale: 0.15,
        emissive: emis, emissiveIntensity: o.emisI ?? 1, emissiveMap: o.emisMap ?? null,
      });
    }
    if (o.transp !== undefined) {
      m.transparent = true;
      (m as THREE.MeshStandardMaterial).opacity = o.transp;
      m.depthWrite = false;
    }
    if (o.lado !== undefined) m.side = o.lado;
    m.userData.semContorno = !!o.semContorno || !!o.basico;
    return m;
  }

  /** material de fachada com janelas que acendem e apagam (uLuz 0..1) */
  matJanelas(map: THREE.Texture, emisMap: THREE.Texture, cor = 0xffb347, intens = 1.35) {
    const m = this.mat({ map, emis: cor, emisI: intens, emisMap, rough: 0.6 }) as THREE.MeshStandardMaterial;
    const u: Janela = { uLuz: { value: 1 }, uT: { value: 0 }, uCor: { value: new THREE.Color(cor) } };
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u);
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uLuz; uniform float uT;")
        .replace(
          "#include <emissivemap_fragment>",
          `#ifdef USE_EMISSIVEMAP
            vec4 eM = texture2D( emissiveMap, vEmissiveMapUv );
            float sorte = eM.g;
            float pisca = fract(sorte * 17.31 + floor(uT * 0.35 + sorte * 9.0) * 0.618);
            float liga = step(mix(sorte, pisca, 0.35), uLuz * 0.78);
            totalEmissiveRadiance *= eM.r * liga * (0.75 + 0.5 * eM.b);
          #endif`,
        );
    };
    m.customProgramCacheKey = () => "janelas";
    m.userData.janela = u;
    return m;
  }

  // contorno em espaço de tela (só na direção B)
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir !== "B") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color("#0a0814") } },
      vertexShader: /* glsl */ `
        uniform float px; uniform vec2 res;
        void main(){
          vec4 p = vec4(position,1.0); vec3 n = normal;
          #ifdef USE_INSTANCING
            p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
          #endif
          vec4 c = projectionMatrix * modelViewMatrix * p;
          vec3 vn = normalize(mat3(modelViewMatrix) * n);
          vec2 d = normalize((projectionMatrix * vec4(vn,0.0)).xy + 1e-5);
          c.xy += d * px * 2.0 / res * c.w;
          gl_Position = c;
        }`,
      fragmentShader: `uniform vec3 cor; void main(){ gl_FragColor = vec4(cor,1.0); }`,
      side: THREE.BackSide,
    });
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    mesh.add(o);
  }

  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3) {
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = me.receiveShadow = !mat.userData.semContorno || this.dir !== "B" ? true : true;
    if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) me.castShadow = me.receiveShadow = false;
    this.contorno(me, px);
    return me;
  }
}

export function montaMundo(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = dir === "B" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dir === "A" ? 1.1 : 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 400);

  if (dir === "A") {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.12;
  }
  if (dir === "C") scene.fog = new THREE.FogExp2(0x0b1026, 0.022);

  // luar (luz principal da noite), hemisfério e a "luz da cidade" (quente, de baixo) que some no apagão
  const lua = new THREE.DirectionalLight(dir === "A" ? 0x9db4ff : dir === "B" ? 0xc8d6ff : 0x7d93ff, dir === "A" ? 1.25 : dir === "B" ? 2.1 : 0.9);
  lua.castShadow = true;
  lua.shadow.mapSize.set(2048, 2048);
  lua.shadow.bias = -0.0004;
  lua.shadow.normalBias = 0.02;
  Object.assign(lua.shadow.camera, { left: -9, bottom: -9, right: 9, top: 9, near: 0.5, far: 60 });
  const hemi = new THREE.HemisphereLight(dir === "B" ? 0x5a6cb0 : 0x2c3d78, dir === "B" ? 0x2a2038 : 0x16110c, dir === "A" ? 0.55 : dir === "B" ? 0.9 : 0.7);
  const cidade = new THREE.DirectionalLight(0xffb066, dir === "B" ? 0.45 : 0.35); // reflexo quente das ruas
  scene.add(lua, lua.target, hemi, cidade, cidade.target);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), dir === "C" ? 0.85 : dir === "A" ? 0.42 : 0.4, dir === "C" ? 0.6 : 0.45, dir === "C" ? 0.7 : 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let tiltH: ShaderPass | undefined, tiltV: ShaderPass | undefined;
  if (dir === "A") {
    tiltH = new ShaderPass(TILT); tiltH.uniforms.dir.value.set(1 / W, 0);
    tiltV = new ShaderPass(TILT); tiltV.uniforms.dir.value.set(0, 1 / H);
    composer.addPass(tiltH); composer.addPass(tiltV);
  }
  const final = new ShaderPass(FINAL);
  final.uniforms.res.value.set(W, H);
  final.uniforms.grao.value = dir === "A" ? 0.035 : dir === "C" ? 0.012 : 0.0;
  final.uniforms.vinheta.value = dir === "A" ? 0.5 : dir === "B" ? 0.18 : 0.38;
  final.uniforms.quente.value = dir === "A" ? 0.02 : 0.0;
  composer.addPass(final);

  const quadro = (t: number, foco = 0.45, forca = 1) => {
    if (tiltH && tiltV) {
      tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
      tiltH.uniforms.forca.value = tiltV.uniforms.forca.value = forca;
    }
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, lua, hemi, cidade, bloom, final, quadro };
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

export const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 }, escuro: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, escuro; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col += vec3(quente, quente*0.35, -quente);
      vec2 cc = vUv - 0.5;
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col *= 1.0 - escuro;
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
