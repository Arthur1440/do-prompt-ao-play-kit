// Boia de flamingo rosa: anel inflável (corpo), pescoço em S, cabeça, bico branco com ponta preta, asinhas e rabo.
// Estados: posição, giro, inclinação, squash/stretch, pescoço esticado (gruda no ralo), limo verde e lama.
import * as THREE from "three";
import type { Kit } from "./kit";

export type EstadoFlamingo = {
  p?: [number, number, number];
  giro?: number; // rotação em y (rad)
  incl?: [number, number]; // inclinação x, z (rad)
  sq?: number; // squash: <1 amassa (y) e alarga; >1 estica
  pescoco?: number; // 1 normal, >1 esticado para cima (preso pelo corpo)
  pescocoDobra?: number; // inclinação extra do pescoço (rad), balança
  limo?: number; // 0..1 coberto de limo
  lama?: number; // 0..1 sujo de lama
  esc?: number; // escala geral
  vis?: boolean;
  olhos?: number; // 1 normal, >1 arregalados
};

export class Flamingo {
  g = new THREE.Group();
  corpo = new THREE.Group(); // recebe o squash
  pesc = new THREE.Group(); // pivô do pescoço
  mats: THREE.Material[] = [];
  rosa: THREE.Color;
  sujo = { limo: { value: 0 }, lama: { value: 0 } };
  olhoE: THREE.Group;
  olhoD: THREE.Group;

  constructor(public kit: Kit) {
    const d = kit.dir;
    this.rosa = new THREE.Color(d === "B" ? 0xff6fa8 : d === "A" ? 0xf2649c : 0xf05a92);
    const vinil = (cor: THREE.ColorRepresentation, rough = 0.3) => {
      const m = kit.mat({ color: cor, rough, clear: d === "C" ? 0.9 : 0.5, semBump: true });
      if (d !== "B") {
        const pm = m as THREE.MeshPhysicalMaterial;
        pm.clearcoatRoughness = d === "C" ? 0.08 : 0.25;
        pm.sheen = 0;
      }
      this.suja(m);
      this.mats.push(m);
      return m;
    };
    const mRosa = vinil(this.rosa, d === "C" ? 0.22 : 0.35);
    const mRosaClaro = vinil(new THREE.Color(this.rosa).lerp(new THREE.Color(0xffffff), 0.35), 0.35);
    const mBranco = vinil(0xfff6ee, 0.35);
    const mPreto = kit.mat({ color: 0x1b1418, rough: 0.25, semBump: true });

    // anel (corpo)
    const R = 0.3, r = 0.135;
    const anel = kit.m(new THREE.TorusGeometry(R, r, 28, 64), mRosa);
    anel.rotation.x = Math.PI / 2;
    this.corpo.add(anel);
    // costura do inflável (faixa clara no topo do anel)
    if (d !== "B") {
      const cost = new THREE.Mesh(new THREE.TorusGeometry(R, 0.004, 6, 80), mRosaClaro);
      cost.rotation.x = Math.PI / 2;
      cost.position.y = r * 0.98;
      this.corpo.add(cost);
    }
    // asinhas (elipsoides achatados nas laterais)
    for (const s of [-1, 1]) {
      const asa = kit.m(new THREE.SphereGeometry(0.13, 24, 16), mRosaClaro);
      asa.scale.set(1.25, 0.42, 0.7);
      asa.position.set(-0.03, r * 0.9, s * (R + 0.02));
      asa.rotation.set(s * 0.35, 0, -0.25);
      this.corpo.add(asa);
    }
    // rabo (atrás, -x): leque de 3 penas
    for (const k of [-1, 0, 1]) {
      const pena = kit.m(new THREE.ConeGeometry(0.06, 0.22, 16), mRosa);
      pena.position.set(-R - 0.06, r * 0.9 + 0.06, k * 0.06);
      pena.rotation.set(k * 0.35, 0, 0.9);
      this.corpo.add(pena);
    }
    // pescoço: tubo afunilado em S, nasce na frente do anel (+x)
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.05, 0.16, 0),
      new THREE.Vector3(0.0, 0.34, 0),
      new THREE.Vector3(-0.07, 0.5, 0),
      new THREE.Vector3(-0.02, 0.64, 0),
      new THREE.Vector3(0.06, 0.7, 0),
    ]);
    const tubo = tuboAfunilado(curva, 64, 18, 0.085, 0.05);
    const pesc = kit.m(tubo, mRosa);
    this.pesc.add(pesc);
    this.pesc.position.set(R - 0.02, r * 0.55, 0);
    // cabeça
    const cab = new THREE.Group();
    const cabeca = kit.m(new THREE.SphereGeometry(0.095, 32, 20), mRosa);
    cabeca.scale.set(1.22, 1, 0.95);
    cab.add(cabeca);
    // bico: base branca + ponta preta, curvado para baixo
    const bico = new THREE.Group();
    const b1 = kit.m(new THREE.CylinderGeometry(0.038, 0.05, 0.1, 20), mBranco);
    b1.rotation.z = -Math.PI / 2;
    b1.position.x = 0.05;
    const b2 = kit.m(new THREE.ConeGeometry(0.038, 0.09, 20), mPreto);
    b2.rotation.z = -Math.PI / 2 - 0.55;
    b2.position.set(0.12, -0.025, 0);
    bico.add(b1, b2);
    bico.position.set(0.08, -0.01, 0);
    bico.rotation.z = -0.35;
    cab.add(bico);
    // olhos (branco + pupila + brilho)
    const mkOlho = (s: number) => {
      const o = new THREE.Group();
      const br = kit.m(new THREE.SphereGeometry(0.03, 16, 12), mBranco, 2);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), mPreto);
      pu.position.set(0.012, 0.004, s * 0.016);
      const bri = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      bri.position.set(0.024, 0.012, s * 0.026);
      o.add(br, pu, bri);
      o.position.set(0.035, 0.03, s * 0.075);
      cab.add(o);
      return o;
    };
    this.olhoE = mkOlho(-1);
    this.olhoD = mkOlho(1);
    cab.position.set(0.1, 0.72, 0);
    this.pesc.add(cab);
    this.corpo.add(this.pesc);
    this.g.add(this.corpo);
    this.g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  /** limo verde e lama: manchas por posição local, crescem com o valor */
  private suja(m: THREE.Material) {
    const u = this.sujo;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uLimo = u.limo;
      sh.uniforms.uLamaF = u.lama;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vPL;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPL = (modelMatrix * vec4(position,1.0)).xyz - (modelMatrix * vec4(0.0,0.0,0.0,1.0)).xyz + position * 0.6;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vPL; uniform float uLimo, uLamaF;
          float hF(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
          float nF(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(hF(i),hF(i+vec3(1,0,0)),f.x), mix(hF(i+vec3(0,1,0)),hF(i+vec3(1,1,0)),f.x), f.y),
                       mix(mix(hF(i+vec3(0,0,1)),hF(i+vec3(1,0,1)),f.x), mix(hF(i+vec3(0,1,1)),hF(i+vec3(1,1,1)),f.x), f.y), f.z); }`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float nl = nF(vPL * 9.0) * 0.6 + nF(vPL * 23.0) * 0.4;
          float kl = smoothstep(1.0 - uLimo * 1.15, 1.05 - uLimo * 1.15, nl) * step(0.001, uLimo);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.20,0.42,0.10), vec3(0.42,0.62,0.16), nF(vPL*40.0)), kl);
          float na = nF(vPL * 6.0 + 3.1) * 0.7 + nF(vPL * 19.0) * 0.3;
          float ka = smoothstep(1.0 - uLamaF * 1.1, 1.04 - uLamaF * 1.1, na) * step(0.001, uLamaF);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36,0.24,0.14), ka);`);
    };
  }

  aplica(e: EstadoFlamingo) {
    this.g.visible = e.vis ?? true;
    const p = e.p ?? [0, 0, 0];
    this.g.position.set(p[0], p[1], p[2]);
    const inc = e.incl ?? [0, 0];
    this.g.rotation.set(inc[0], e.giro ?? 0, inc[1], "YXZ");
    const s = (e.esc ?? 1) * 1.35; // proporção de brinquedo: maior que o real para ler no 9:16
    this.g.scale.setScalar(s);
    const sq = e.sq ?? 1;
    this.corpo.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    const pc = e.pescoco ?? 1;
    this.pesc.scale.set(1 / Math.sqrt(pc), pc / sq, 1 / Math.sqrt(pc));
    this.pesc.rotation.z = e.pescocoDobra ?? 0;
    const ol = e.olhos ?? 1;
    this.olhoE.scale.setScalar(ol);
    this.olhoD.scale.setScalar(ol);
    this.sujo.limo.value = e.limo ?? 0;
    this.sujo.lama.value = e.lama ?? 0;
  }
}

/** tubo com raio variando ao longo da curva (r0 na base, r1 no topo), tampado nas pontas */
export function tuboAfunilado(curva: THREE.Curve<THREE.Vector3>, nSeg: number, nRad: number, r0: number, r1: number) {
  const fr = curva.computeFrenetFrames(nSeg, false);
  const P: number[] = [], N: number[] = [], UV: number[] = [], I: number[] = [];
  for (let i = 0; i <= nSeg; i++) {
    const u = i / nSeg;
    const c = curva.getPointAt(u);
    const r = r0 + (r1 - r0) * u;
    for (let j = 0; j <= nRad; j++) {
      const a = (j / nRad) * Math.PI * 2;
      const n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr.binormals[i].clone().multiplyScalar(Math.sin(a)));
      P.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
      N.push(n.x, n.y, n.z);
      UV.push(u, j / nRad);
    }
  }
  for (let i = 0; i < nSeg; i++)
    for (let j = 0; j < nRad; j++) {
      const a = i * (nRad + 1) + j, b = a + nRad + 1;
      I.push(a, a + 1, b, b, a + 1, b + 1);
    }
  // tampas
  for (const [i, s] of [[0, -1], [nSeg, 1]] as const) {
    const c = curva.getPointAt(i / nSeg);
    const t = fr.tangents[i].clone().multiplyScalar(s);
    const ci = P.length / 3;
    P.push(c.x, c.y, c.z);
    N.push(t.x, t.y, t.z);
    UV.push(0, 0);
    const r = r0 + (r1 - r0) * (i / nSeg);
    for (let j = 0; j <= nRad; j++) {
      const a = (j / nRad) * Math.PI * 2;
      const n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr.binormals[i].clone().multiplyScalar(Math.sin(a)));
      P.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
      N.push(t.x, t.y, t.z);
      UV.push(0, 0);
    }
    for (let j = 0; j < nRad; j++) {
      if (s < 0) I.push(ci, ci + 1 + j, ci + 2 + j);
      else I.push(ci, ci + 2 + j, ci + 1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(I);
  return g;
}
