import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gradToon, texDigital, texRuidoFino } from "./tex";

// A = maquete de brinquedo com tilt-shift · B = toon 3D com contorno · C = POV em massinha (clay 3D)
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
  liso?: boolean; // sem marcas de dedo (vidro, metal, olhos)
};

// ruído 3D de valor (amassado da massinha)
const h3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const n3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => h3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
};

/** Deforma a malha com um campo de ruído (só depende da posição: sem rachar costuras). */
export function amassa(geo: THREE.BufferGeometry, amp: number, freq: number) {
  const g = geo.clone();
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = freq;
    p.setXYZ(
      i,
      x + (n3(x * f, y * f, z * f) - 0.5) * amp,
      y + (n3(x * f + 31, y * f + 7, z * f) - 0.5) * amp,
      z + (n3(x * f, y * f + 17, z * f + 53) - 0.5) * amp,
    );
  }
  g.computeVertexNormals();
  return g;
}

export class Kit {
  dir: Dir;
  W: number;
  H: number;
  grad = gradToon(3);
  ruido = texRuidoFino();
  digital: THREE.Texture | null = null;
  todos: THREE.Material[] = [];
  amassar = 1; // escala do amassado (0 desliga)
  constructor(dir: Dir, W: number, H: number) {
    this.dir = dir;
    this.W = W;
    this.H = H;
    if (dir === "C") this.digital = texDigital();
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    if (this.dir === "A") {
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff,
        map: o.map ?? null,
        roughness: o.rough ?? 0.5,
        metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25),
        clearcoatRoughness: 0.45,
        side: o.side ?? THREE.FrontSide,
        emissive: o.emissive ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        bumpMap: o.liso ? null : this.ruido,
        bumpScale: 0.15,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
      });
    } else if (this.dir === "C") {
      // massinha: fosca, com marcas de dedo, borda aveludada
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff,
        map: o.map ?? null,
        roughness: o.liso ? (o.rough ?? 0.3) : Math.max(0.78, o.rough ?? 0.86),
        metalness: metal * 0.6,
        sheen: o.liso ? 0 : 0.45,
        sheenRoughness: 0.75,
        sheenColor: new THREE.Color(0xfff1e6),
        clearcoat: o.liso ? 0.5 : 0.04,
        clearcoatRoughness: 0.6,
        side: o.side ?? THREE.FrontSide,
        emissive: o.emissive ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        bumpMap: o.liso ? null : this.digital,
        bumpScale: 1.4,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
      });
    } else {
      const tm = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff),
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
    m.userData.liso = !!o.liso;
    this.todos.push(m);
    return m;
  }

  // contorno em espaço de tela (só B)
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir !== "B") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
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
          #include <clipping_planes_vertex>
          vec4 c = projectionMatrix * mvPosition;
          vec3 vn = normalize(mat3(modelViewMatrix) * n);
          vec2 d = normalize((projectionMatrix * vec4(vn,0.0)).xy + 1e-5);
          c.xy += d * px * 2.0 / res * c.w;
          gl_Position = c;
        }`,
      fragmentShader: `uniform vec3 cor;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          gl_FragColor = vec4(cor,1.0); }`,
      side: THREE.BackSide,
      clipping: true,
    });
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    o.castShadow = false;
    o.receiveShadow = false;
    mesh.add(o);
  }

  /** malha com sombra, contorno (B) e amassado (C) */
  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3, pai?: THREE.Object3D, pos?: V3, rot?: V3, esc?: V3 | number) {
    let g = geo;
    if (this.dir === "C" && this.amassar > 0 && !mat.userData.liso) {
      g.computeBoundingSphere();
      const R = g.boundingSphere!.radius;
      g = amassa(g, R * 0.035 * this.amassar, 2.2 / R);
    }
    const me = new THREE.Mesh(g, mat);
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

export const torno = (pts: [number, number][], seg = 48, phiS = 0, phiL = Math.PI * 2) => {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.00001), y)),
    seg,
    phiS,
    phiL,
  );
  g.computeVertexNormals();
  return g;
};

export const perfil = (pts: [number, number][], n = 24): [number, number][] => {
  const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getPoints(n).map((v) => [v.x, v.y]);
};

/** Tubo ao longo de pontos com raio variável. */
export const tubo = (pts: V3[], r: (u: number) => number, seg = 32, rad = 12) => {
  const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curva, seg, 1, rad, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const c = curva.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).multiplyScalar(r(u)).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
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

/** Orienta um objeto: o eixo +Y local passa a apontar para `dir`. */
export const apontaY = (o: THREE.Object3D, dir: THREE.Vector3) => {
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
};
