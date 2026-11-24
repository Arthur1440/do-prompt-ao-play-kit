// Água: superfície por direção (A resina, B toon com faixas de espuma, C fotorreal com ondas e reflexo do céu),
// cor que mistura limpa / verde (alga) / lama, cáusticas no azulejo e jatos de partículas.
import * as THREE from "three";
import type { Dir, Kit } from "./kit";
import { texOndas } from "./texp";
import { pontoSuave } from "./props";

export const COR_AGUA = {
  limpa: new THREE.Color(0x27c3d8),
  verde: new THREE.Color(0x5a8a24),
  lama: new THREE.Color(0x7a5332),
};

export type CorAgua = { verde?: number; lama?: number };

export class SuperficieAgua {
  mesh: THREE.Mesh;
  mat: THREE.Material;
  u = { uT: { value: 0 }, uCor: { value: new THREE.Color() }, uOp: { value: 0.6 }, uEspuma: { value: 0 }, uVerde: { value: 0 }, uLamaB: { value: 0 } };
  ondas: THREE.Texture | null = null;
  constructor(public kit: Kit, larg: number, prof: number, seg = 1) {
    const d = kit.dir;
    const geo = new THREE.PlaneGeometry(larg, prof, seg, seg).rotateX(-Math.PI / 2);
    if (d === "B") {
      this.mat = new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec3 vW; #include <clipping_planes_pars_vertex>
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix * mv;
          #include <clipping_planes_vertex>
          }`.replace("varying vec3 vW; #include", "varying vec3 vW;\n#include"),
        fragmentShader: /* glsl */ `
          uniform float uT, uOp, uEspuma, uVerde, uLamaB; uniform vec3 uCor; varying vec3 vW;
          #include <clipping_planes_pars_fragment>
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
          void main(){
            #include <clipping_planes_fragment>
            vec2 p = vW.xz;
            float w = n(p*2.2 + vec2(uT*0.35, -uT*0.2)) + 0.5*n(p*4.7 - vec2(uT*0.3, uT*0.25));
            float banda = smoothstep(0.93, 0.96, fract(w*1.6));
            vec3 c = uCor;
            c = mix(c, c*0.82, step(0.62, n(p*1.3 + 7.0)));
            c = mix(c, mix(vec3(1.0), uCor * 1.45, uLamaB), banda * 0.85);
            gl_FragColor = vec4(c, uOp);
            #include <colorspace_fragment>
          }`,
      });
      (this.mat as THREE.ShaderMaterial).clipping = true;
    } else {
      this.ondas = texOndas().clone();
      this.ondas.wrapS = this.ondas.wrapT = THREE.RepeatWrapping;
      this.ondas.repeat.set(larg / (d === "C" ? 1.1 : 1.6), prof / (d === "C" ? 1.1 : 1.6));
      this.ondas.needsUpdate = true;
      const m = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transparent: true, opacity: 0.6, roughness: d === "C" ? 0.03 : 0.08, metalness: 0,
        clearcoat: 1, clearcoatRoughness: d === "C" ? 0.02 : 0.12, normalMap: this.ondas,
        normalScale: new THREE.Vector2(d === "C" ? 0.55 : 0.3, d === "C" ? 0.55 : 0.3), depthWrite: false,
        envMapIntensity: d === "C" ? 1.25 : 0.9, specularIntensity: 1, ior: 1.33,
      });
      // segunda camada de ondas cruzando a primeira (parece água viva, não chapa)
      const u = this.u;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uT = u.uT;
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform float uT;")
          .replace(
            "#include <normal_fragment_maps>",
            `vec3 mapN = texture2D( normalMap, vNormalMapUv + vec2(uT*0.021, uT*0.013) ).xyz * 2.0 - 1.0;
             vec3 mapN2 = texture2D( normalMap, vNormalMapUv * 1.7 + vec2(-uT*0.017, uT*0.026) ).xyz * 2.0 - 1.0;
             mapN = normalize(vec3(mapN.xy + mapN2.xy, mapN.z * mapN2.z));
             mapN.xy *= normalScale;
             normal = normalize( tbn * mapN );`,
          );
      };
      this.mat = m;
    }
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = d !== "B";
    this.mesh.userData.semProf = true;
    this.mesh.renderOrder = 2000;
  }

  aplica(t: number, cor: CorAgua = {}) {
    const d = this.kit.dir;
    const c = COR_AGUA.limpa.clone().lerp(COR_AGUA.verde, cor.verde ?? 0).lerp(COR_AGUA.lama, cor.lama ?? 0);
    const op = THREE.MathUtils.lerp(THREE.MathUtils.lerp(d === "B" ? 0.8 : d === "A" ? 0.62 : 0.5, 0.9, cor.verde ?? 0), 0.97, cor.lama ?? 0);
    this.u.uT.value = t;
    this.u.uCor.value.copy(c);
    this.u.uOp.value = op;
    this.u.uLamaB.value = cor.lama ?? 0;
    if (d !== "B") {
      const m = this.mat as THREE.MeshPhysicalMaterial;
      m.color.copy(c);
      m.opacity = op;
      m.roughness = THREE.MathUtils.lerp(d === "C" ? 0.03 : 0.08, 0.35, Math.max(cor.lama ?? 0, (cor.verde ?? 0) * 0.6));
      m.roughness = THREE.MathUtils.lerp(m.roughness, 0.62, cor.lama ?? 0);
      m.clearcoat = 1 - 0.85 * (cor.lama ?? 0);
      const ns = (d === "C" ? 0.55 : 0.3) * (1 - 0.6 * (cor.lama ?? 0));
      m.normalScale.set(ns, ns);
    }
  }
}

/** cáusticas no azulejo submerso: brilho que dança no fundo e nas paredes abaixo do nível */
export function causticas(m: THREE.Material, u: { uT: { value: number }; uNivel: { value: number }; uCaus: { value: number } }) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWC;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWC = (modelMatrix * vec4(transformed,1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vWC; uniform float uT, uNivel, uCaus;
         float caus(vec2 p, float t){ vec2 q = p * 2.4; float c = 0.0;
           for (int i = 0; i < 3; i++){ q += vec2(sin(q.y * 1.7 + t * 0.9 + float(i)), cos(q.x * 1.5 - t * 0.8)) * 0.42;
             c += 1.0 / (1.0 + 28.0 * abs(sin(q.x * 1.3) * sin(q.y * 1.1))); }
           return c / 3.0; }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float sub = smoothstep(uNivel + 0.01, uNivel - 0.04, vWC.y) * uCaus;
         if (sub > 0.0) {
           float cz = caus(vWC.xz + vec2(vWC.y * 0.6), uT);
           totalEmissiveRadiance += vec3(0.75, 0.95, 1.0) * pow(cz, 2.2) * 0.9 * sub;
           diffuseColor.rgb *= mix(1.0, 0.82, sub);
         }`,
      );
  };
}

/** jato/esguicho de partículas (bolhas na água ou espirro no ar). Tudo função do tempo. */
export class Jato {
  pts: THREE.Points;
  sem: Float32Array;
  constructor(kit: Kit, public n = 220, cor: THREE.ColorRepresentation = 0xe8fbff, tam = 7) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.sem = new Float32Array(n);
    for (let i = 0; i < n; i++) this.sem[i] = (Math.sin(i * 91.7) * 43758.5453) % 1;
    const m = new THREE.PointsMaterial({
      color: cor, size: kit.dir === "B" ? tam * 1.2 : tam, sizeAttenuation: false, map: pontoSuave(), transparent: true,
      depthWrite: false, opacity: kit.dir === "B" ? 1 : 0.85,
    });
    this.pts = new THREE.Points(geo, m);
    this.pts.frustumCulled = false;
    this.pts.renderOrder = 2100;
  }
  /** origem o, direção v (m/s), gravidade gy, espalhamento, vida (s), intensidade k */
  aplica(t: number, o: THREE.Vector3, v: THREE.Vector3, gy: number, esp: number, vida: number, k: number) {
    const pos = this.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const n = Math.floor(this.n * Math.max(0, Math.min(1, k)));
    for (let i = 0; i < this.n; i++) {
      if (i >= n) {
        pos.setXYZ(i, 0, -999, 0);
        continue;
      }
      const s = Math.abs(this.sem[i]);
      const a = ((t / vida + s) % 1) * vida;
      const j1 = Math.sin(i * 12.9898) * esp, j2 = Math.sin(i * 78.233) * esp, j3 = Math.sin(i * 37.719) * esp;
      pos.setXYZ(i, o.x + (v.x + j1) * a, o.y + (v.y + j2) * a + 0.5 * gy * a * a, o.z + (v.z + j3) * a);
    }
    pos.needsUpdate = true;
    this.pts.visible = k > 0.001;
  }
}
