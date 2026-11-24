import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gradToon, texEscovado, texRuidoFino } from "./tex";

// A = maquete de brinquedo com tilt-shift; B = toon 3D com contorno; C = comercial de estúdio (alumínio e vapor contra a luz)
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
  corte?: boolean; // recebe o plano de corte (metade da panela)
  escovado?: boolean; // alumínio escovado (C)
  basico?: boolean; // sem luz (chama, brilho)
  aditivo?: boolean;
};

export class Kit {
  dir: Dir;
  W: number;
  H: number;
  grad = gradToon(3);
  ruido = texRuidoFino();
  escov = texEscovado();
  todos: THREE.Material[] = [];
  contornos: THREE.ShaderMaterial[] = [];
  /** plano de corte: descarta z > constante (em mundo). constante grande = panela inteira. */
  plano = new THREE.Plane(new THREE.Vector3(0, 0, -1), 50);
  constructor(dir: Dir, W: number, H: number) {
    this.dir = dir;
    this.W = W;
    this.H = H;
  }

  mat(o: OpMat): THREE.Material {
    let m: THREE.Material;
    const metal = o.metal ?? 0;
    if (o.basico) {
      m = new THREE.MeshBasicMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null, transparent: !!o.transparent || !!o.aditivo, opacity: o.opacity ?? 1,
        blending: o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.aditivo && !o.transparent, side: o.side ?? THREE.FrontSide, toneMapped: !o.aditivo,
      });
    } else if (this.dir === "A") {
      // plástico fosco de brinquedo: Physical com verniz leve e bump de ruído
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: o.rough ?? 0.5, metalness: metal * 0.55,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        bumpMap: this.ruido, bumpScale: 0.15, transparent: !!o.transparent, opacity: o.opacity ?? 1,
      });
    } else if (this.dir === "C") {
      // comercial: metal de verdade (escovado, anisotrópico), baquelite com verniz
      const pm = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: o.rough ?? 0.4, metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.0 : 0.5), clearcoatRoughness: 0.12,
        side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        transparent: !!o.transparent, opacity: o.opacity ?? 1,
      });
      if (o.escovado) {
        pm.anisotropy = 0.45;
        pm.roughnessMap = this.escov;
      }
      m = pm;
    } else {
      const tm = new THREE.MeshToonMaterial({
        color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, gradientMap: this.grad,
        side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
        transparent: !!o.transparent, opacity: o.opacity ?? 1,
      });
      m = tm;
    }
    if (o.corte) {
      m.clippingPlanes = [this.plano];
      m.clipShadows = true;
    }
    m.userData.semContorno = !!o.semContorno;
    m.userData.corte = !!o.corte;
    this.todos.push(m);
    return m;
  }

  /** face do corte: as faces de trás de um sólido fechado, pintadas de uma cor só. */
  tampaCorte(mesh: THREE.Mesh, cor: THREE.ColorRepresentation, opacity = 1) {
    const m = new THREE.MeshBasicMaterial({
      color: cor, side: THREE.BackSide, clippingPlanes: [this.plano], transparent: opacity < 1, opacity,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    });
    m.userData.ehTampa = true;
    const o = new THREE.Mesh(mesh.geometry, m);
    o.userData.tampa = true;
    o.renderOrder = 1;
    mesh.add(o);
    return o;
  }

  // contorno preto (casco invertido em espaço de tela) — só B. Respeita o plano de corte.
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir !== "B") return;
    const mm = mesh.material as THREE.Material;
    if (mm.userData?.semContorno) return;
    const mat = new THREE.ShaderMaterial({
      uniforms: { px: { value: px }, res: { value: new THREE.Vector2(this.W, this.H) }, cor: { value: new THREE.Color("#1a0f0c") }, op: { value: 1 } },
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
      fragmentShader: /* glsl */ `
        uniform vec3 cor; uniform float op;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          gl_FragColor = vec4(cor,op);
        }`,
      side: THREE.BackSide,
      clipping: true,
    });
    if (mm.clippingPlanes) mat.clippingPlanes = mm.clippingPlanes;
    this.contornos.push(mat);
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

/** Torno a partir de perfil fechado [raio, altura]. Pontos repetidos viram quina viva. */
export const torno = (pts: [number, number][], seg = 96) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
};

/** Perfil suave por Catmull-Rom. */
export const perfil = (pts: [number, number][], n = 24): [number, number][] => {
  const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getPoints(n).map((v) => [v.x, v.y]);
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
