import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gradToon, texRuidoFino } from "./tex";
import { texPapel } from "./tex2";

// A = maquete de brinquedo com tilt-shift; B = toon 3D com contorno; C = papel dobrado (papercraft facetado)
export type Dir = "A" | "B" | "C";
export type V3 = [number, number, number];

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
  basico?: boolean; // sem luz (brilho, tela)
  aditivo?: boolean;
  agua?: boolean; // água com reflexo
  liso?: boolean; // C: sem facetas (telas, etiquetas)
};

export class Kit {
  dir: Dir;
  W: number;
  H: number;
  grad = gradToon(3);
  ruido = texRuidoFino();
  papel = texPapel();
  todos: THREE.Material[] = [];
  constructor(dir: Dir, W: number, H: number) {
    this.dir = dir;
    this.W = W;
    this.H = H;
  }

  /** segmentos: o papel é facetado (poucos lados), os outros são lisos */
  s(n: number) {
    return this.dir === "C" ? Math.max(6, Math.round(n / 4)) : n;
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const metal = o.metal ?? 0;
    const comum = {
      side: o.side ?? THREE.FrontSide,
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
    };
    if (o.basico) {
      m = new THREE.MeshBasicMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null, transparent: !!o.transparent || !!o.aditivo, opacity: o.opacity ?? 1,
        blending: o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.aditivo && !o.transparent, side: o.side ?? THREE.FrontSide, toneMapped: !o.aditivo,
      });
    } else if (o.agua) {
      // água: espelho escuro com verniz (reflete o ambiente e o céu)
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0x1f5a63, roughness: this.dir === "B" ? 0.35 : 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05,
        transparent: true, opacity: o.opacity ?? 0.86, side: THREE.DoubleSide, envMapIntensity: 1.6,
        flatShading: this.dir === "C",
      });
      if (this.dir === "B") m = new THREE.MeshToonMaterial({ color: o.color ?? 0x3fb7d6, gradientMap: this.grad, transparent: true, opacity: 0.92 });
    } else if (this.dir === "A") {
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: o.rough ?? 0.5, metalness: metal * 0.55,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        bumpMap: this.ruido, bumpScale: 0.15, ...comum,
      });
    } else if (this.dir === "C") {
      // papel: fosco, facetado (flatShading) e com fibra no bump
      m = new THREE.MeshStandardMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: o.rough !== undefined ? Math.max(0.75, o.rough) : 0.92, metalness: 0,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        bumpMap: o.liso ? null : this.papel, bumpScale: 1.2, flatShading: !o.liso, ...comum,
      });
    } else {
      m = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, gradientMap: this.grad,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, ...comum,
      });
    }
    m.userData.semContorno = !!o.semContorno;
    this.todos.push(m);
    return m;
  }

  // contorno preto (casco invertido em espaço de tela): só B
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir === "A") return;
    const papel = this.dir === "C";
    const mm = mesh.material as THREE.Material;
    if (mm.userData?.semContorno || (mm as THREE.MeshBasicMaterial).isMeshBasicMaterial) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: papel ? Math.min(2.2, px * 0.75) : px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color(papel ? "#fff4e2" : "#1a0f0c") } },
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

// ---------------------------------------------------------------------------
// geometrias
export const esfera = (r: number, ws = 32, hs = 24) => new THREE.SphereGeometry(r, ws, hs);
export const cil = (rt: number, rb: number, h: number, s = 40, aberto = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, aberto);

export const torno = (pts: [number, number][], seg = 96) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
};

export const junta = (gs: THREE.BufferGeometry[]) => {
  const n = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  n.forEach((g) => {
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
  });
  return mergeGeometries(n, false)!;
};

export const transf = (g: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], esc: V3 | number = 1) => {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    typeof esc === "number" ? new THREE.Vector3(esc, esc, esc) : new THREE.Vector3(...esc),
  );
  return g.clone().applyMatrix4(m);
};

/** tubo por pontos (cano, cabo, calha) */
export const tubo = (pts: V3[], r: number, seg = 48, rs = 10) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.05), seg, r, rs, false);
