import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Direções: A = maquete com tilt-shift, B = toon com contorno, C = nanquim do Mangabeira (charge de jornal, 2 tintas)
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
  /** C: cor que vira tinta de impressão (azul, verde, vermelho). O resto vira papel + hachura. */
  tinta?: boolean;
  /** C: tom do papel/cinza (0 escuro .. 1 papel). Padrão: luminância da cor. */
  tom?: number;
};

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
// rampa do nanquim: 4 níveis suaves (a hachura sai da luminância)
function gradTinta() {
  const vals = [40, 110, 185, 255];
  const d = new Uint8Array(4 * 4);
  vals.forEach((v, i) => {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
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

export class Kit {
  grad = gradToon(3);
  gradT = gradTinta();
  ruido = texRuidoFino();
  todos: THREE.Material[] = [];
  contornos: THREE.ShaderMaterial[] = [];
  constructor(public dir: Dir, public W: number, public H: number) {}

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
        bumpMap: this.ruido,
        bumpScale: 0.15,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
      });
    } else {
      let c = new THREE.Color(o.color ?? 0xffffff);
      if (this.dir === "C" && !o.tinta) {
        // papel e nanquim: tudo o que não é tinta vira tom de cinza (hachura no pós)
        const l = o.tom ?? Math.min(1, 0.35 + 0.75 * (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) ** 0.6);
        c = new THREE.Color(l, l, l);
      }
      const tm = new THREE.MeshToonMaterial({
        color: c,
        map: this.dir === "C" && !o.tinta ? null : o.map ?? null,
        gradientMap: this.dir === "C" ? this.gradT : this.grad,
        side: o.side ?? THREE.FrontSide,
        emissive: o.emissive ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
      });
      if (this.dir === "C" && o.map && !o.tinta) {
        // mapas com desenho (placas, papel) entram como estão: o pós decide tinta x papel
        tm.map = o.map;
        tm.color = new THREE.Color(1, 1, 1);
      }
      if ((o.metal ?? 0) > 0.5) tm.emissive = new THREE.Color(o.color ?? 0xffffff).multiplyScalar(0.18);
      m = tm;
    }
    m.userData.semContorno = !!o.semContorno;
    this.todos.push(m);
    return m;
  }

  // contorno (casco invertido em espaço de tela) — B e C
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir === "A") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const C = this.dir === "C";
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        px: { value: C ? px * 1.05 : px },
        res: { value: new THREE.Vector2(this.W, this.H) },
        cor: { value: new THREE.Color(C ? "#17120e" : "#1a0f0c") },
        op: { value: 1 },
      },
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
      fragmentShader: `uniform vec3 cor; uniform float op; void main(){ gl_FragColor = vec4(cor,op); }`,
      side: THREE.BackSide,
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
export const esfera = (r: number, ws = 40, hs = 28) => new THREE.SphereGeometry(r, ws, hs);
export const capsula = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 10, 24);
export const cil = (rt: number, rb: number, h: number, s = 40, aberto = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, aberto);
export const caixa = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
/** caixa de cantos arredondados */
export const caixaR = (w: number, h: number, d: number, r = 0.02, seg = 4) => {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * Math.min(r, d / 2.2)), bevelEnabled: true, bevelThickness: Math.min(r, d / 2.2), bevelSize: Math.min(r, d / 2.2) * 0.9, bevelSegments: seg, curveSegments: seg });
  g.translate(0, 0, -(d - 2 * Math.min(r, d / 2.2)) / 2);
  g.computeVertexNormals();
  return g;
};

export const torno = (pts0: [number, number][], seg = 48, phiS = 0, phiL = Math.PI * 2) => {
  // perfil sempre de baixo para cima: assim as normais ficam para fora (calção preto era isso)
  const pts = pts0[0][1] > pts0[pts0.length - 1][1] ? [...pts0].reverse() : pts0;
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg, phiS, phiL);
  g.computeVertexNormals();
  return g;
};
export const perfil = (pts: [number, number][], n = 24): [number, number][] => {
  const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getPoints(n).map((v) => [v.x, v.y]);
};
export const tubo = (pts: V3[], r: (u: number) => number, seg = 40, rad = 16) => {
  const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curva, seg, 1, rad, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i <= seg; i++) {
    const c = curva.getPointAt(i / seg);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).multiplyScalar(r(i / seg)).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
};
export const estrela = (r = 0.05, prof = 0.012, ri = 0.42) => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * ri : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: true, bevelThickness: prof * 0.4, bevelSize: r * 0.08, bevelSegments: 2 });
  g.translate(0, 0, -prof / 2);
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
