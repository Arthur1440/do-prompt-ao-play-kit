import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gradToon, texRuidoFino } from "./tex";

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
  sheen?: number;
  transparent?: boolean;
  opacity?: number;
  semContorno?: boolean;
};

// Fábrica de materiais e contorno conforme a direção visual.
export class Kit {
  dir: Dir;
  W: number;
  H: number;
  grad = gradToon(3);
  ruido = texRuidoFino();
  todos: THREE.Material[] = [];
  contornos: THREE.ShaderMaterial[] = [];
  constructor(dir: Dir, W: number, H: number) {
    this.dir = dir;
    this.W = W;
    this.H = H;
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    if (this.dir === "A") {
      // plástico fosco de boneco colecionável
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff,
        map: o.map ?? null,
        roughness: o.rough ?? 0.5,
        metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25),
        clearcoatRoughness: 0.45,
        sheen: o.sheen ?? 0,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color(0xffffff),
        side: o.side ?? THREE.FrontSide,
        emissive: o.emissive ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        bumpMap: this.ruido,
        bumpScale: 0.15,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
      });
    } else {
      const c = new THREE.Color(o.color ?? 0xffffff);
      const tm = new THREE.MeshToonMaterial({
        color: c,
        map: o.map ?? null,
        gradientMap: this.grad,
        side: o.side ?? THREE.FrontSide,
        emissive: o.emissive ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
      });
      if ((o.metal ?? 0) > 0.5) tm.emissive = new THREE.Color(o.color ?? 0xffffff).multiplyScalar(0.18);
      m = tm;
    }
    m.userData.semContorno = !!o.semContorno;
    this.todos.push(m);
    return m;
  }

  // contorno preto (casco invertido em espaço de tela) — B e C
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir === "A") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: this.dir === "C" ? Math.max(0.9, px * 0.38) : px }, res: { value: this.dir === "C" ? new THREE.Vector2(this.W / 5, this.H / 5) : new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color(this.dir === "C" ? "#140a14" : "#1a0f0c") }, op: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float px; uniform vec2 res;
        #include <skinning_pars_vertex>
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
      fragmentShader: `uniform vec3 cor; uniform float op; void main(){ gl_FragColor = vec4(cor,op); }`,
      side: THREE.BackSide,
      transparent: false,
    });
    this.contornos.push(mat);
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    o.castShadow = false;
    o.receiveShadow = false;
    mesh.add(o);
  }

  // cria malha já com sombra e contorno
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
export const capsula = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 20);
export const cil = (rt: number, rb: number, h: number, s = 32, aberto = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, aberto);

/** Torno a partir de perfil [raio, altura]. */
export const torno = (pts: [number, number][], seg = 40, phiS = 0, phiL = Math.PI * 2) => {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)),
    seg,
    phiS,
    phiL,
  );
  g.computeVertexNormals();
  return g;
};

/** Perfil suave por Catmull-Rom. */
export const perfil = (pts: [number, number][], n = 24): [number, number][] => {
  const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getPoints(n).map((v) => [v.x, v.y]);
};

/** Tubo ao longo de pontos com raio variável. */
export const tubo = (pts: V3[], r: (u: number) => number, seg = 32, rad = 14) => {
  const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curva, seg, 1, rad, false);
  // ajusta raio por anel
  const pos = g.attributes.position as THREE.BufferAttribute;
  const fr = curva.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const c = curva.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).multiplyScalar(r(u)).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  void fr;
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
