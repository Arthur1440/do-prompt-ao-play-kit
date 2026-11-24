import * as THREE from "three";
import { gradToon, texRuidoFino } from "./tex";
import { texDigital } from "./tex3";
import type { V3 } from "./geo";

// A = maquete de brinquedo com tilt-shift; B = toon 3D com contorno; C = massinha de stop-motion
export type Dir = "A" | "B" | "C";
export type { V3 };

export type OpMat = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  rough?: number;
  metal?: number;
  side?: THREE.Side;
  emissive?: THREE.ColorRepresentation;
  ei?: number;
  clear?: number;
  transparent?: boolean;
  opacity?: number;
  semContorno?: boolean;
  basico?: boolean; // sem luz (brilho)
  aditivo?: boolean;
  vidro?: boolean;
  dentro?: boolean; // luz ambiente controlada (interior da toca)
  semBoil?: boolean;
  bump?: number;
};

type Hook = { nome: string; f: (sh: THREE.WebGLProgramParametersWithUniforms) => void };

export class Kit {
  dir: Dir;
  W: number;
  H: number;
  grad = gradToon(3);
  ruido = texRuidoFino();
  digital = texDigital();
  todos: THREE.Material[] = [];
  uAmb = { value: 1 }; // multiplica a luz indireta dos materiais de dentro
  uBoil = { value: 0 }; // semente do "boil" da massinha (muda a cada passo de 1/12 s)
  constructor(dir: Dir, W: number, H: number) {
    this.dir = dir;
    this.W = W;
    this.H = H;
  }

  /** acrescenta um trecho de shader ao material (com chave de cache própria) */
  hook(m: THREE.Material, h: Hook) {
    const hs: Hook[] = (m.userData.hooks ??= []);
    hs.push(h);
    m.onBeforeCompile = (sh) => hs.forEach((x) => x.f(sh));
    m.customProgramCacheKey = () => hs.map((x) => x.nome).join("|");
    m.needsUpdate = true;
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const metal = o.metal ?? 0;
    const comum = { side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, opacity: o.opacity ?? 1 };
    const A = this.dir === "A", B = this.dir === "B";
    if (o.basico) {
      m = new THREE.MeshBasicMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null, transparent: !!o.transparent || !!o.aditivo, opacity: o.opacity ?? 1,
        blending: o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.aditivo && !o.transparent, side: o.side ?? THREE.FrontSide, toneMapped: !o.aditivo,
      });
    } else if (o.vidro) {
      m = B
        ? new THREE.MeshToonMaterial({ color: o.color ?? 0xbfe6ff, gradientMap: this.grad, transparent: true, opacity: o.opacity ?? 0.35, emissive: o.emissive ?? 0x000000, depthWrite: false })
        : new THREE.MeshPhysicalMaterial({
            color: o.color ?? 0xdff2ff, roughness: A ? 0.05 : 0.2, metalness: 0, transmission: 0, transparent: true, opacity: o.opacity ?? 0.28,
            clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2, emissive: o.emissive ?? 0x000000, depthWrite: false, side: THREE.DoubleSide,
          });
    } else if (A) {
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: o.rough ?? 0.5, metalness: metal * 0.55,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        bumpMap: this.ruido, bumpScale: o.bump ?? 0.15, ...comum,
      });
    } else if (B) {
      m = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, gradientMap: this.grad,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, ...comum,
      });
    } else {
      // massinha: fosca, com digitais no bump e um brilho macio na borda (sheen)
      const mp = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: metal > 0.5 ? 0.45 : Math.max(0.78, o.rough ?? 0.86), metalness: metal * 0.35,
        sheen: 0.55, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xfff1e0),
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        bumpMap: this.digital, bumpScale: o.bump ?? 2.2, ...comum,
      });
      m = mp;
    }
    m.userData.semContorno = !!o.semContorno;
    m.userData.dentro = !!o.dentro;
    if (o.dentro && !o.basico) {
      this.hook(m, {
        nome: "amb",
        f: (sh) => {
          sh.uniforms.uAmb = this.uAmb;
          sh.fragmentShader = sh.fragmentShader
            .replace("void main() {", "uniform float uAmb;\nvoid main() {")
            .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= uAmb; reflectedLight.indirectSpecular *= uAmb;");
        },
      });
    }
    if (this.dir === "C" && !o.basico && !o.vidro && !o.semBoil) {
      this.hook(m, {
        nome: "boil",
        f: (sh) => {
          sh.uniforms.uBoil = this.uBoil;
          sh.vertexShader = sh.vertexShader
            .replace("void main() {", "uniform float uBoil;\nfloat hB(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)) + uBoil*7.31)*43758.5453); }\nvoid main() {")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += objectNormal * (hB(floor(position*18.0)) - 0.5) * 0.0035;");
        },
      });
    }
    this.todos.push(m);
    return m;
  }

  // contorno preto (casco invertido em espaço de tela): só B
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir !== "B") return;
    const mm = mesh.material as THREE.Material;
    if (mm.userData?.semContorno || (mm as THREE.MeshBasicMaterial).isMeshBasicMaterial || mm.transparent) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color("#1a0f0c") } },
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
      clipping: true,
    });
    if ((mm as any).clippingPlanes) mat.clippingPlanes = (mm as any).clippingPlanes;
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    o.castShadow = false;
    o.receiveShadow = false;
    mesh.add(o);
  }

  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3, pai?: THREE.Object3D, pos?: V3, rot?: V3, esc?: V3 | number) {
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = true;
    me.receiveShadow = true;
    if (pos) me.position.set(...pos);
    if (rot) me.rotation.set(...rot);
    if (esc !== undefined) typeof esc === "number" ? me.scale.setScalar(esc) : me.scale.set(...esc);
    this.contorno(me, px);
    if (pai) pai.add(me);
    return me;
  }
}
