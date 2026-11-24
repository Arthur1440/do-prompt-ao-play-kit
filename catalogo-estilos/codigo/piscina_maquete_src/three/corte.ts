// Corte de terreno ("fatia de bolo"): um plano z = zc remove tudo o que está na frente (z > zc).
// Cada grupo de sólidos FECHADOS ganha uma tampa no plano, desenhada só onde o plano está dentro do sólido.
// Dentro/fora por contagem de estêncil: faces de trás +1, faces da frente -1, sem teste de profundidade
// (sólidos sobrepostos somam e continuam "dentro"). A tampa testa estêncil != 0 e zera o estêncil depois.
import * as THREE from "three";
import type { Dir } from "./kit";

type Grupo = { ordem: number; tampa: THREE.Mesh; transp: boolean; prio: number };

export class Corte {
  plano = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000); // mantém z <= constant
  planos = [this.plano];
  z = 1000;
  ativo = false;
  private prox = 10;
  private grupos = new Map<string, Grupo>();
  private inst: { o: THREE.InstancedMesh; src: THREE.InstancedMesh }[] = [];
  private estenceis: THREE.Mesh[] = [];
  /** materiais de tampa (para atualizar o tempo uT) */
  mats: THREE.Material[] = [];
  constructor(public scene: THREE.Scene) {}

  /** cria o grupo e a tampa dele. prio > 0 puxa a tampa para a frente (cano dentro da terra ganha da terra). */
  grupo(nome: string, matTampa: THREE.Material, transp = false, prio = 0) {
    const ordem = (transp ? 1000 : 0) + this.prox;
    this.prox += 2;
    const m = matTampa;
    m.stencilWrite = true;
    m.stencilRef = 0;
    m.stencilFunc = THREE.NotEqualStencilFunc;
    m.stencilFail = THREE.ReplaceStencilOp;
    m.stencilZFail = THREE.ReplaceStencilOp;
    m.stencilZPass = THREE.ReplaceStencilOp;
    m.clippingPlanes = null;
    if (transp) m.transparent = true;
    const tampa = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), m);
    tampa.renderOrder = ordem + 1;
    tampa.receiveShadow = false;
    tampa.castShadow = false;
    tampa.frustumCulled = false;
    tampa.visible = false;
    tampa.userData.tampa = true;
    this.scene.add(tampa);
    this.grupos.set(nome, { ordem, tampa, transp, prio });
    this.mats.push(m);
    return tampa;
  }

  private matsEstencil(transp: boolean) {
    const mk = (lado: THREE.Side, op: THREE.StencilOp) =>
      new THREE.MeshBasicMaterial({
        colorWrite: false, depthWrite: false, depthTest: false, side: lado, clippingPlanes: this.planos,
        stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op,
        transparent: transp,
      });
    return [mk(THREE.BackSide, THREE.IncrementWrapStencilOp), mk(THREE.FrontSide, THREE.DecrementWrapStencilOp)];
  }

  /** registra os meshes de obj (sólidos fechados) no grupo: recortados pelo plano + contados no estêncil */
  registra(obj: THREE.Object3D, nome: string) {
    const g = this.grupos.get(nome)!;
    const [mb, mf] = this.matsEstencil(g.transp);
    const lista: THREE.Mesh[] = [];
    obj.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh && o.userData.contorno) this.recortaMat(me.material);
      if (me.isMesh && !o.userData.contorno && !o.userData.estencil && !o.userData.tampa && !o.userData.semCorte) lista.push(me);
    });
    for (const me of lista) {
      this.recortaMat(me.material);
      for (const mat of [mb, mf]) {
        let s: THREE.Mesh;
        if ((me as THREE.InstancedMesh).isInstancedMesh) {
          const src = me as THREE.InstancedMesh;
          const im = new THREE.InstancedMesh(me.geometry, mat, src.instanceMatrix.count);
          im.instanceMatrix = src.instanceMatrix;
          this.inst.push({ o: im, src });
          s = im;
        } else s = new THREE.Mesh(me.geometry, mat);
        s.renderOrder = g.ordem;
        s.userData.estencil = true;
        this.estenceis.push(s);
        s.castShadow = s.receiveShadow = false;
        s.frustumCulled = false;
        me.add(s);
      }
    }
  }

  /** só recorta (sem tampa): objetos abertos (folhas, planos, partículas) */
  recorta(obj: THREE.Object3D) {
    obj.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.material && !o.userData.estencil && !o.userData.tampa) this.recortaMat(me.material);
    });
  }

  private recortaMat(m: THREE.Material | THREE.Material[]) {
    for (const mm of Array.isArray(m) ? m : [m]) {
      mm.clippingPlanes = this.planos;
      if ((mm as THREE.ShaderMaterial).isShaderMaterial) (mm as THREE.ShaderMaterial).clipping = true;
    }
  }

  /** z do corte (null = sem corte) */
  set(z: number | null) {
    this.ativo = z !== null;
    this.z = z ?? 1000;
    this.plano.constant = this.z;
    for (const g of this.grupos.values()) {
      g.tampa.visible = this.ativo;
      g.tampa.position.set(0, 0, this.z + 0.0004 + g.prio * 0.0015);
    }
    for (const s of this.estenceis) s.visible = this.ativo; // sem corte, não gasta passadas de estêncil
    for (const { o, src } of this.inst) o.count = src.count;
  }

  tempo(t: number) {
    for (const m of this.mats) if (m.userData.u) m.userData.u.uT.value = t;
  }
}

// ------------------------------------------------------------------------------------------------ material de tampa
/**
 * Material de tampa com cor calculada por GLSL a partir da posição de mundo (camadas de terra, tijolo, água...).
 * glsl: corpo de `vec3 corTampa(vec3 p)` (pode usar uT = tempo e os uniforms extras).
 */
export function matTampa(dir: Dir, glsl: string, uniforms: Record<string, THREE.IUniform> = {}, op: { opacidade?: number; brilho?: number } = {}) {
  const m: THREE.Material =
    dir === "B"
      ? new THREE.MeshToonMaterial({ color: 0xffffff })
      : dir === "A"
        ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });
  if (dir === "B") (m as THREE.MeshToonMaterial).gradientMap = gradTampa();
  if (op.opacidade !== undefined) {
    m.transparent = true;
    (m as THREE.MeshStandardMaterial).opacity = op.opacidade;
    m.depthWrite = false;
  }
  const u = { uT: { value: 0 }, ...uniforms };
  m.userData.u = u;
  // cada tampa tem o seu GLSL: sem isto o cache do three reaproveita o programa da primeira tampa
  const chave = "tampa:" + glsl + JSON.stringify(op) + Object.keys(uniforms).join(",");
  m.customProgramCacheKey = () => chave;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMT;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvMT = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    const decl = Object.keys(uniforms).map((k) => {
      const v = uniforms[k].value;
      const tipo = typeof v === "number" ? "float" : v?.isColor ? "vec3" : v?.isVector3 ? "vec3" : v?.isVector2 ? "vec2" : v?.isVector4 ? "vec4" : "float";
      return `uniform ${tipo} ${k};`;
    }).join("\n");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vMT;\nuniform float uT;\n${decl}\n${GLSL_RUIDO}\nvec3 corTampa(vec3 p){\n${glsl}\n}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\ndiffuseColor.rgb = corTampa(vMT) * ${(op.brilho ?? 1).toFixed(3)};`);
  };
  return m;
}

let _gt: THREE.DataTexture | null = null;
function gradTampa() {
  if (_gt) return _gt;
  const d = new Uint8Array([200, 200, 200, 255, 255, 255, 255, 255]);
  _gt = new THREE.DataTexture(d, 2, 1, THREE.RGBAFormat);
  _gt.minFilter = _gt.magFilter = THREE.NearestFilter;
  _gt.needsUpdate = true;
  return _gt;
}

export const GLSL_RUIDO = /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vn2(p); p *= 2.07; a *= 0.5; } return s; }
// pedrinhas: distância à pedra mais próxima numa grade (célula de Voronoi simples)
float pedras(vec2 p, float dens){ vec2 i = floor(p), f = fract(p); float d = 9.0;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g = vec2(float(x),float(y)); vec2 o = vec2(h21(i+g), h21(i+g+7.3));
    float r = 0.18 + 0.22*h21(i+g+3.1); float on = step(1.0-dens, h21(i+g+11.7));
    d = min(d, mix(9.0, length(g+o-f)/r, on)); } return d; }
`;
