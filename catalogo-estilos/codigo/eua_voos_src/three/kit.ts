// Receita das 3 direções (base: skill catalogo-estilos, codigo/estilos_threejs.ts)
//   "A" = maquete de brinquedo com tilt-shift
//   "B" = toon 3D com contorno
//   "C" = mapa noturno de plantão (pontos de luz, bloom, profundidade de campo)
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Dir = "A" | "B" | "C";

export function gradToon(n = 3) {
  const d = new Uint8Array(n * 4);
  const vals = n === 3 ? [90, 185, 255] : [70, 140, 205, 255];
  for (let i = 0; i < n; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = vals[i];
    d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
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
  transp?: number;
  lado?: THREE.Side;
  semBump?: boolean;
};

export class Kit {
  grad = gradToon(3);
  ruido = texRuidoFino();
  constructor(public dir: Dir, public W: number, public H: number) {}

  mat(o: OpMat) {
    let m: THREE.Material;
    if (this.dir === "B") {
      m = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff),
        map: o.map ?? null,
        gradientMap: this.grad,
        emissive: new THREE.Color(o.emis ?? 0x000000),
        emissiveIntensity: o.emisI ?? 1,
      });
    } else {
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff,
        map: o.map ?? null,
        roughness: o.rough ?? 0.5,
        metalness: metal,
        clearcoat: o.clear ?? (this.dir === "A" ? (metal > 0.5 ? 0.6 : 0.25) : 0.15),
        clearcoatRoughness: 0.45,
        bumpMap: this.dir === "A" && !o.semBump ? this.ruido : null,
        bumpScale: 0.15,
        emissive: new THREE.Color(o.emis ?? 0x000000),
        emissiveIntensity: o.emisI ?? 1,
      });
    }
    if (o.transp !== undefined) {
      m.transparent = true;
      (m as THREE.MeshPhysicalMaterial).opacity = o.transp;
      m.depthWrite = false;
    }
    if (o.lado !== undefined) m.side = o.lado;
    m.userData.semContorno = !!o.semContorno;
    return m;
  }

  // contorno em espaço de tela (só na direção B)
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir !== "B") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color("#1a0f0c") } },
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
    const o =
      mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    mesh.add(o);
  }

  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3) {
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = me.receiveShadow = true;
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
  renderer.toneMapping = dir === "B" ? THREE.NeutralToneMapping : dir === "A" ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping;
  renderer.toneMappingExposure = dir === "C" ? 1.15 : 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 300);

  if (dir !== "B") {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = dir === "A" ? 0.45 : 0.18;
  }
  const solCor = dir === "A" ? 0xffcf9a : dir === "B" ? 0xffffff : 0xbfd4ff;
  const sol = new THREE.DirectionalLight(solCor, dir === "A" ? 3.4 : dir === "B" ? 2.6 : 0.9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.01;
  Object.assign(sol.shadow.camera, { left: -7, bottom: -7, right: 7, top: 7, near: 0.5, far: 60 });
  const hemi = new THREE.HemisphereLight(
    dir === "A" ? 0xcfe0ff : dir === "B" ? 0xffffff : 0x223044,
    dir === "A" ? 0x8a5a3a : dir === "B" ? 0x99887a : 0x050505,
    dir === "A" ? 0.9 : dir === "B" ? 1.5 : 0.35,
  );
  const contra = new THREE.DirectionalLight(dir === "A" ? 0xffe2b8 : dir === "B" ? 0xfff2dd : 0xffa860, dir === "A" ? 1.6 : dir === "B" ? 1.4 : 2.2);
  scene.add(sol, sol.target, hemi, contra);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  let bloom: UnrealBloomPass | undefined;
  if (dir === "A") composer.addPass((bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.22, 0.6, 0.9)));
  if (dir === "C") composer.addPass((bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.62, 0.32, 0.7)));
  composer.addPass(new OutputPass());
  let tiltH: ShaderPass | undefined, tiltV: ShaderPass | undefined;
  if (dir !== "B") {
    tiltH = new ShaderPass(TILT);
    tiltH.uniforms.dir.value.set(1 / W, 0);
    tiltV = new ShaderPass(TILT);
    tiltV.uniforms.dir.value.set(0, 1 / H);
    composer.addPass(tiltH);
    composer.addPass(tiltV);
  }
  const final = new ShaderPass(FINAL);
  final.uniforms.res.value.set(W, H);
  final.uniforms.grao.value = dir === "A" ? 0.035 : dir === "C" ? 0.028 : 0.0;
  final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.55;
  final.uniforms.quente.value = dir === "A" ? 0.025 : 0.0;
  composer.addPass(final);

  const quadro = (t: number, foco = 0.45, forca = dir === "C" ? 0.5 : 1) => {
    if (tiltH && tiltV) {
      tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
      tiltH.uniforms.forca.value = tiltV.uniforms.forca.value = forca;
    }
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, sol, hemi, contra, bloom, final, quadro };
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
      for (int i = -7; i <= 7; i++) { float k = exp(-float(i*i)/24.0); s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k; }
      gl_FragColor = s / w;
    }`,
};

export const FINAL = {
  uniforms: {
    tDiffuse: { value: null },
    res: { value: new THREE.Vector2() },
    tempo: { value: 0 },
    grao: { value: 0.03 },
    vinheta: { value: 0.4 },
    quente: { value: 0.0 },
  },
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
