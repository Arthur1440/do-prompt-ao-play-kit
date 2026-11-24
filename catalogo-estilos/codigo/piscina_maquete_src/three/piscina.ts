// A piscina por etapas (escada de falhas): tijolo + reboco (racha) -> caixa de concreto com aço (estrutura) ->
// impermeabilização -> azulejo -> ralos, coadeira, retornos, válvula de alívio. A água é um volume (para o corte)
// + uma superfície. Tudo dentro de `caixa` sobe e entorta junto no espanto.
import * as THREE from "three";
import type { Kit } from "./kit";
import { PIS, EXT } from "./terreno";
import { texTijolo, TIJ, texRebocoCinza, texConcreto, texAzulejo, texCalcada } from "./texp";
import { SuperficieAgua, causticas, Jato, CorAgua } from "./agua";
import { rng } from "./rng";

export type EstadoPiscina = {
  tijolo?: number; // 0..1 fiadas subindo (1 = paredes prontas)
  reboco?: number; // 0..1 o reboco cobre as paredes
  estufa?: number; // 0..1 a parede de trás estufa
  racha?: number; // 0..1 a rachadura desce de cima a baixo
  abre?: number; // 0..1 a fenda abre
  armadura?: number; // 0..1 a malha de aço se trama
  concreto?: number; // 0..1 o concreto preenche
  imper?: number; // 0..1 a camada se espalha
  azulejo?: number; // 0..1 fiadas de azulejo
  borda?: number; // 0..1
  nivel?: number; // y da água
  agua?: number; // 0..1 (0 = sem água)
  cor?: CorAgua;
  ralos?: number; // 0, 1 ou 2 (fração = o segundo surgindo)
  coadeira?: number; // 0..1
  porta?: number; // ângulo da portinha (rad)
  retornos?: number; // 0..1
  jatoRet?: number; // 0..1
  valvula?: number; // 0..1
  valvAbre?: number; // 0..1
  sobe?: number; // 0..1 a caixa sobe e entorta
  vazaRacha?: number; // 0..1 água entrando na fenda
};

export const Y_PISO = -PIS.D; // -1,4 (topo da laje do fundo)
export const Y_TOPO = 0.02; // topo das paredes
const ESP = 0.012; // espessura da impermeabilização e do azulejo
export const IN = { x: PIS.L / 2 - 2 * ESP, z: PIS.W / 2 - 2 * ESP, y: Y_PISO + 2 * ESP }; // face do azulejo
export const RALOS: [number, number][] = [[-1.3, -0.32], [1.3, -0.32]];
export const COAD = { x: 1.35, y: -0.16 };
export const RETORNOS = [-1.45, -0.45, 0.55];
export const Y_RET = -0.55;

/** UV em metros por projeção de caixa (pela normal) */
export function uvCaixa(geo: THREE.BufferGeometry, sx = 1, sy = 1) {
  const p = geo.getAttribute("position"), n = geo.getAttribute("normal");
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) [u, v] = [p.getX(i), p.getZ(i)];
    else if (ax >= az) [u, v] = [p.getZ(i), p.getY(i)];
    else [u, v] = [p.getX(i), p.getY(i)];
    uv[i * 2] = u / sx;
    uv[i * 2 + 1] = v / sy;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** caixa entre dois cantos (mundo) com UV em metros */
export function caixaEntre(a: [number, number, number], b: [number, number, number], sx = 1, sy = 1) {
  const g = new THREE.BoxGeometry(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return uvCaixa(g, sx, sy);
}

/** descarta fragmentos por uma condição em posição de mundo (revelar por varredura). cond usa vWR (vec3) e os uniforms. */
export function revela(m: THREE.Material, cond: string, u: Record<string, THREE.IUniform>) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, u);
    const decl = Object.keys(u).map((k) => `uniform float ${k};`).join("\n");
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWR;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWR = (modelMatrix * vec4(transformed,1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vWR;\n${decl}\nfloat hR(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }\nfloat nR(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hR(i),hR(i+vec2(1,0)),f.x),mix(hR(i+vec2(0,1)),hR(i+vec2(1,1)),f.x),f.y); }`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\nif (${cond}) discard;`);
  };
  m.customProgramCacheKey = () => cond;
}

/** rachadura em zigue-zague, de cima (y topo) a baixo (y piso), em x */
function linhaRacha(): [number, number][] {
  const R = rng(77);
  const pts: [number, number][] = [];
  const n = 15;
  for (let i = 0; i <= n; i++) {
    const v = i / n;
    const y = Y_TOPO + (Y_PISO - Y_TOPO) * v + (i === 0 || i === n ? 0 : (R.r() - 0.5) * 0.05);
    const x = 0.12 + 0.22 * v + (i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * (0.1 + R.r() * 0.12));
    pts.push([x, y]);
  }
  return pts;
}

export class Piscina {
  g = new THREE.Group(); // fixo no mundo
  caixa = new THREE.Group(); // sobe e entorta
  // tijolo
  tijolos: THREE.InstancedMesh;
  nTij = 0;
  parTij = new THREE.Group();
  metadeE: THREE.Mesh;
  metadeD: THREE.Mesh;
  pivE = new THREE.Group();
  pivD = new THREE.Group();
  rebocoG = new THREE.Group();
  rebocoTras: THREE.Mesh[] = [];
  risco: THREE.Mesh;
  pisoTij: THREE.Mesh;
  // concreto
  concreto = new THREE.Group();
  paredesConc: THREE.Mesh[] = [];
  aco: THREE.InstancedMesh;
  nAco = 0;
  // revestimento
  imper = new THREE.Group();
  azulejo = new THREE.Group();
  borda = new THREE.Group();
  // peças
  ralos: THREE.Group[] = [];
  coadeira = new THREE.Group();
  porta = new THREE.Group();
  retornos = new THREE.Group();
  valvula = new THREE.Group();
  tampaValv = new THREE.Group();
  // água
  vol: THREE.Mesh;
  sup: SuperficieAgua;
  jatos: Jato[] = [];
  jatoValv: Jato;
  jatoRacha: Jato;
  vazio: THREE.Mesh; // água que entra na fenda (fita)
  uRev = { uReb: { value: 0 }, uImp: { value: 0 }, uAzu: { value: 0 } };
  uCaus = { uT: { value: 0 }, uNivel: { value: -0.12 }, uCaus: { value: 1 } };
  matTijolo: THREE.Material;

  constructor(public kit: Kit) {
    const d = kit.dir;
    const C = d === "C";
    // ------------------------------------------------ materiais
    const tij = texTijolo(d), reb = texRebocoCinza(d), conc = texConcreto(d), azu = texAzulejo(d), calc = texCalcada(d);
    this.matTijolo = kit.mat({ map: tij, rough: 0.85, bump: C ? tij : null, bumpS: 1.2 });
    const mReb = kit.mat({ map: reb, rough: 0.9, bump: C ? reb : null, bumpS: 0.8 });
    const mConc = kit.mat({ map: conc, rough: 0.88, bump: C ? conc : null, bumpS: 1.0 });
    const mImp = kit.mat({ color: d === "B" ? 0x7f9db8 : 0x6f8396, rough: d === "C" ? 0.45 : 0.5, clear: 0.4 });
    const mAzu = kit.mat({ map: azu, rough: d === "C" ? 0.18 : 0.3, clear: d === "C" ? 0.8 : 0.4, bump: C ? azu : null, bumpS: 0.4 });
    const mBorda = kit.mat({ map: calc, rough: 0.8, bump: C ? calc : null, bumpS: 1.4 });
    const mAco = kit.mat({ color: d === "B" ? 0xb5582e : 0x7a4026, rough: 0.6, metal: d === "B" ? 0 : 0.6 });
    const mPlast = kit.mat({ color: 0xf2f0ea, rough: 0.35, clear: 0.4 });
    const mEscuro = kit.mat({ color: 0x1d2226, rough: 0.6 });
    causticas(mAzu, this.uCaus);
    revela(mReb, "vWR.x > -2.25 + uReb * 4.6", { uReb: this.uRev.uReb });
    revela(mImp, "length(vWR.xz - vec2(-2.2, -1.3)) + (nR(vWR.xz * 3.0 + vWR.y * 2.0) - 0.5) * 0.9 > uImp * 6.2", { uImp: this.uRev.uImp });
    revela(mAzu, "vWR.y > -1.42 + uAzu * 1.5 + floor(vWR.x * 7.0 + 0.5) * 0.0", { uAzu: this.uRev.uAzu });

    // ------------------------------------------------ tijolos subindo (fiadas instanciadas)
    const fiadas = Math.round((Y_TOPO - Y_PISO) / 0.087);
    const bg = new THREE.BoxGeometry(0.205, 0.078, PIS.e - 0.01);
    const tmp = new THREE.Object3D();
    const R = rng(5);
    const mats: THREE.Matrix4[] = [];
    const cores: THREE.Color[] = [];
    for (let f = 0; f < fiadas; f++) {
      const y = Y_PISO + 0.087 * f + 0.043;
      const off = f % 2 ? 0.11 : 0;
      // frente e trás (ao longo de x), laterais (ao longo de z)
      for (const zs of [-1, 1])
        for (let x = -EXT.x + 0.105 + off; x < EXT.x - 0.1; x += 0.22) {
          tmp.position.set(x, y, zs * (PIS.W / 2 + PIS.e / 2));
          tmp.rotation.set(0, 0, 0);
          tmp.updateMatrix();
          mats.push(tmp.matrix.clone());
        }
      for (const xs of [-1, 1])
        for (let z = -PIS.W / 2 + 0.105 + off; z < PIS.W / 2 - 0.1; z += 0.22) {
          tmp.position.set(xs * (PIS.L / 2 + PIS.e / 2), y, z);
          tmp.rotation.set(0, Math.PI / 2, 0);
          tmp.updateMatrix();
          mats.push(tmp.matrix.clone());
        }
    }
    this.tijolos = new THREE.InstancedMesh(bg, kit.mat({ color: 0xffffff, rough: 0.85 }), mats.length);
    mats.forEach((m, i) => {
      this.tijolos.setMatrixAt(i, m);
      const t = R.r();
      cores.push(d === "B" ? new THREE.Color(t > 0.5 ? 0xe2703e : 0xd66436) : new THREE.Color().setRGB(0.62 + t * 0.12, 0.27 + t * 0.07, 0.15 + t * 0.04, THREE.SRGBColorSpace));
      this.tijolos.setColorAt(i, cores[i]);
    });
    this.nTij = mats.length;
    this.tijolos.castShadow = this.tijolos.receiveShadow = true;
    kit.contorno(this.tijolos, 2);

    // ------------------------------------------------ paredes de tijolo prontas (frente, laterais) + metades de trás
    const sx = TIJ.w, sy = TIJ.h;
    const parede = (a: [number, number, number], b: [number, number, number]) => kit.m(caixaEntre(a, b, sx, sy), this.matTijolo);
    this.pisoTij = kit.m(caixaEntre([-EXT.x, EXT.y, -EXT.z], [EXT.x, Y_PISO, EXT.z], 1, 1), mConc);
    this.parTij.add(
      parede([-EXT.x, Y_PISO, PIS.W / 2], [EXT.x, Y_TOPO, EXT.z]),
      parede([-EXT.x, Y_PISO, -PIS.W / 2], [-PIS.L / 2, Y_TOPO, PIS.W / 2]),
      parede([PIS.L / 2, Y_PISO, -PIS.W / 2], [EXT.x, Y_TOPO, PIS.W / 2]),
    );
    // parede de trás em duas metades, cortadas pela linha da rachadura
    const lr = linhaRacha();
    const shE = new THREE.Shape(), shD = new THREE.Shape();
    shE.moveTo(-EXT.x, Y_PISO);
    shE.lineTo(lr[lr.length - 1][0], Y_PISO);
    for (let i = lr.length - 1; i >= 0; i--) shE.lineTo(lr[i][0], lr[i][1]);
    shE.lineTo(-EXT.x, Y_TOPO);
    shD.moveTo(lr[lr.length - 1][0], Y_PISO);
    shD.lineTo(EXT.x, Y_PISO);
    shD.lineTo(EXT.x, Y_TOPO);
    for (let i = 0; i < lr.length; i++) shD.lineTo(lr[i][0], lr[i][1]);
    const ext = (sh: THREE.Shape, prof: number) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth: prof, bevelEnabled: false });
      g.computeVertexNormals();
      return uvCaixa(g, sx, sy);
    };
    // as metades giram em torno da quina de fora (pivôs), a fenda abre no meio
    this.metadeE = kit.m(ext(shE, PIS.e), this.matTijolo);
    this.metadeD = kit.m(ext(shD, PIS.e), this.matTijolo);
    this.pivE.position.set(-EXT.x, 0, -EXT.z);
    this.pivD.position.set(EXT.x, 0, -EXT.z);
    this.metadeE.position.set(EXT.x, 0, 0);
    this.metadeD.position.set(-EXT.x, 0, 0);
    this.pivE.add(this.metadeE);
    this.pivD.add(this.metadeD);
    this.parTij.add(this.pivE, this.pivD);
    // reboco: faces internas (frente, laterais) + metades de trás
    const rb = (a: [number, number, number], b: [number, number, number]) => kit.m(caixaEntre(a, b, 1, 1), mReb, 2);
    this.rebocoG.add(
      rb([-PIS.L / 2, Y_PISO, PIS.W / 2 - 0.015], [PIS.L / 2, Y_TOPO - 0.005, PIS.W / 2]),
      rb([-PIS.L / 2, Y_PISO, -PIS.W / 2], [-PIS.L / 2 + 0.015, Y_TOPO - 0.005, PIS.W / 2]),
      rb([PIS.L / 2 - 0.015, Y_PISO, -PIS.W / 2], [PIS.L / 2, Y_TOPO - 0.005, PIS.W / 2]),
      rb([-PIS.L / 2, Y_PISO, -PIS.W / 2], [PIS.L / 2, Y_PISO + 0.015, PIS.W / 2]),
    );
    for (const [sh, piv, dx] of [[shE, this.pivE, EXT.x], [shD, this.pivD, -EXT.x]] as const) {
      const r = kit.m(ext(sh as THREE.Shape, 0.015), mReb, 2);
      r.position.set(dx as number, 0, PIS.e);
      (piv as THREE.Group).add(r);
      this.rebocoTras.push(r);
    }
    this.parTij.add(this.rebocoG);
    // risco escuro da rachadura (fita que desce)
    const P: number[] = [];
    for (let i = 0; i < lr.length - 1; i++) {
      const [x0, y0] = lr[i], [x1, y1] = lr[i + 1];
      const w = 0.032;
      P.push(x0 - w, y0, 0, x0 + w, y0, 0, x1 - w, y1, 0, x0 + w, y0, 0, x1 + w, y1, 0, x1 - w, y1, 0);
    }
    const gr = new THREE.BufferGeometry();
    gr.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    this.risco = new THREE.Mesh(gr, new THREE.MeshBasicMaterial({ color: 0x140c08, side: THREE.DoubleSide }));
    this.risco.position.set(EXT.x, 0, PIS.e + 0.017);
    this.risco.userData.semCorte = true;
    this.pivE.add(this.risco);

    // ------------------------------------------------ caixa de concreto + aço
    const pc = (a: [number, number, number], b: [number, number, number]) => kit.m(caixaEntre(a, b, 1, 1), mConc);
    const pisoC = pc([-EXT.x, EXT.y, -EXT.z], [EXT.x, Y_PISO, EXT.z]);
    this.concreto.add(pisoC);
    for (const [a, b] of [
      [[-EXT.x, 0, PIS.W / 2], [EXT.x, 1, EXT.z]],
      [[-EXT.x, 0, -EXT.z], [EXT.x, 1, -PIS.W / 2]],
      [[-EXT.x, 0, -PIS.W / 2], [-PIS.L / 2, 1, PIS.W / 2]],
      [[PIS.L / 2, 0, -PIS.W / 2], [EXT.x, 1, PIS.W / 2]],
    ] as [number, number, number][][]) {
      const m = pc(a as [number, number, number], b as [number, number, number]);
      m.position.y = Y_PISO;
      this.paredesConc.push(m);
      this.concreto.add(m);
    }
    // malha de aço: piso, depois verticais, depois anéis horizontais
    const am: THREE.Matrix4[] = [];
    const cil = new THREE.CylinderGeometry(0.016, 0.016, 1, 6);
    const barra = (a: THREE.Vector3, b: THREE.Vector3) => {
      const o = new THREE.Object3D();
      o.position.copy(a).add(b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      o.scale.set(1, a.distanceTo(b), 1);
      o.updateMatrix();
      am.push(o.matrix.clone());
    };
    const yA = (EXT.y + Y_PISO) / 2;
    for (let x = -EXT.x + 0.1; x <= EXT.x - 0.05; x += 0.24) barra(new THREE.Vector3(x, yA, -EXT.z + 0.05), new THREE.Vector3(x, yA, EXT.z - 0.05));
    for (let z = -EXT.z + 0.1; z <= EXT.z - 0.05; z += 0.24) barra(new THREE.Vector3(-EXT.x + 0.05, yA, z), new THREE.Vector3(EXT.x - 0.05, yA, z));
    const mz = PIS.W / 2 + PIS.e / 2, mx = PIS.L / 2 + PIS.e / 2;
    for (let x = -mx; x <= mx + 0.01; x += 0.24) for (const s of [-1, 1]) barra(new THREE.Vector3(x, EXT.y + 0.04, s * mz), new THREE.Vector3(x, Y_TOPO - 0.04, s * mz));
    for (let z = -mz + 0.24; z <= mz - 0.1; z += 0.24) for (const s of [-1, 1]) barra(new THREE.Vector3(s * mx, EXT.y + 0.04, z), new THREE.Vector3(s * mx, Y_TOPO - 0.04, z));
    for (let y = Y_PISO + 0.1; y < Y_TOPO - 0.05; y += 0.24) {
      barra(new THREE.Vector3(-mx, y, mz), new THREE.Vector3(mx, y, mz));
      barra(new THREE.Vector3(-mx, y, -mz), new THREE.Vector3(mx, y, -mz));
      barra(new THREE.Vector3(-mx, y, -mz), new THREE.Vector3(-mx, y, mz));
      barra(new THREE.Vector3(mx, y, -mz), new THREE.Vector3(mx, y, mz));
    }
    this.aco = new THREE.InstancedMesh(cil, mAco, am.length);
    am.forEach((m, i) => this.aco.setMatrixAt(i, m));
    this.nAco = am.length;
    this.aco.castShadow = true;
    kit.contorno(this.aco, 1.5);

    // ------------------------------------------------ impermeabilização e azulejo (cascas internas finas)
    const casca = (gr: THREE.Group, m: THREE.Material, d0: number, px: number) => {
      const a = PIS.L / 2 - d0, b = PIS.W / 2 - d0, y0 = Y_PISO + d0, e = ESP;
      for (const [p, q] of [
        [[-a, y0 - e, -b], [a, y0, b]],
        [[-a, y0, b - e], [a, Y_TOPO - 0.004, b]],
        [[-a, y0, -b], [a, Y_TOPO - 0.004, -b + e]],
        [[-a, y0, -b + e], [-a + e, Y_TOPO - 0.004, b - e]],
        [[a - e, y0, -b + e], [a, Y_TOPO - 0.004, b - e]],
      ] as [number, number, number][][])
        gr.add(kit.m(caixaEntre(p as [number, number, number], q as [number, number, number], 1, 1), m, px));
    };
    casca(this.imper, mImp, 0, 2);
    casca(this.azulejo, mAzu, ESP, 2);
    // faixa de pastilha escura na linha d'água
    const mFaixa = kit.mat({ color: d === "B" ? 0x1f6fb8 : 0x1d5f99, rough: 0.25, clear: 0.6 });
    const yf0 = -0.2, yf1 = -0.04, a2 = IN.x - 0.001, b2 = IN.z - 0.001;
    for (const [p, q] of [
      [[-a2, yf0, b2 - 0.003], [a2, yf1, b2]],
      [[-a2, yf0, -b2], [a2, yf1, -b2 + 0.003]],
      [[-a2, yf0, -b2], [-a2 + 0.003, yf1, b2]],
      [[a2 - 0.003, yf0, -b2], [a2, yf1, b2]],
    ] as [number, number, number][][])
      this.azulejo.add(kit.m(caixaEntre(p as [number, number, number], q as [number, number, number]), mFaixa, 1.5));

    // ------------------------------------------------ borda (pedra) sobre as paredes
    const bo = 0.2, bi = 0.06, yb0 = Y_TOPO, yb1 = Y_TOPO + 0.055;
    const X1 = EXT.x + bo, Z1 = EXT.z + bo, X0 = PIS.L / 2 - bi, Z0 = PIS.W / 2 - bi;
    for (const [p, q] of [
      [[-X1, yb0, Z0], [X1, yb1, Z1]],
      [[-X1, yb0, -Z1], [X1, yb1, -Z0]],
      [[-X1, yb0, -Z0], [-X0, yb1, Z0]],
      [[X0, yb0, -Z0], [X1, yb1, Z0]],
    ] as [number, number, number][][])
      this.borda.add(kit.m(caixaEntre(p as [number, number, number], q as [number, number, number], 1, 1), mBorda));

    // ------------------------------------------------ ralos de fundo (grelha + poço)
    const texGrelha = grelha();
    const mGrelha = kit.mat({ color: 0xffffff, map: texGrelha, rough: 0.4, metal: d === "B" ? 0 : 0.3 });
    for (const [x, z] of RALOS) {
      const r = new THREE.Group();
      const gt = kit.m(new THREE.CylinderGeometry(0.15, 0.16, 0.022, 40), [mPlast, mGrelha, mPlast], 2);
      gt.position.y = IN.y + 0.011;
      const poco = kit.m(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 24), mPlast, 1.5);
      poco.position.y = IN.y - 0.18;
      r.add(gt, poco);
      r.position.set(x, 0, z);
      this.ralos.push(r);
      this.caixa.add(r);
    }

    // ------------------------------------------------ coadeira (janela na borda + portinha)
    const yC = COAD.y, zC = -IN.z + 0.002;
    const boca = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.22), mEscuro);
    boca.position.set(COAD.x, yC, zC + 0.001);
    const moldura = new THREE.Group();
    for (const [w, h, x, y] of [[0.46, 0.04, 0, 0.13], [0.46, 0.04, 0, -0.13], [0.04, 0.3, 0.21, 0], [0.04, 0.3, -0.21, 0]])
      moldura.add(kit.m(new THREE.BoxGeometry(w, h, 0.02), mPlast, 1.5).translateX(x).translateY(y));
    moldura.position.set(COAD.x, yC, zC + 0.01);
    const folha = kit.m(new THREE.BoxGeometry(0.36, 0.19, 0.012), mPlast, 1.5);
    folha.position.y = 0.095;
    this.porta.add(folha);
    this.porta.position.set(COAD.x, yC - 0.11, zC + 0.012);
    this.coadeira.add(boca, moldura, this.porta);

    // ------------------------------------------------ bocais de retorno (os "buraquinhos")
    for (const x of RETORNOS) {
      const b = new THREE.Group();
      const anel = kit.m(new THREE.TorusGeometry(0.045, 0.018, 12, 28), mPlast, 1.5);
      const furo = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), mEscuro);
      furo.position.z = 0.004;
      const bico = kit.m(new THREE.CylinderGeometry(0.03, 0.04, 0.04, 20), mPlast, 1.5);
      bico.rotation.x = Math.PI / 2;
      bico.position.z = -0.01;
      b.add(bico, anel, furo);
      b.position.set(x, Y_RET, -IN.z + 0.02);
      this.retornos.add(b);
      const j = new Jato(kit, 220, 0xffffff, 11);
      this.jatos.push(j);
      this.g.add(j.pts);
    }

    // ------------------------------------------------ válvula de alívio (no fundo, no plano do corte)
    const corpoV = kit.m(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 28), mPlast, 1.5);
    corpoV.position.y = IN.y - 0.2;
    const aro = kit.m(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32), mPlast, 1.5);
    aro.position.y = IN.y + 0.01;
    const tampa = kit.m(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 32), kit.mat({ color: 0xff8a3d, rough: 0.4 }), 1.5);
    tampa.position.set(0.12, 0.012, 0);
    this.tampaValv.add(tampa);
    this.tampaValv.position.set(-0.12, IN.y + 0.02, 0);
    this.valvula.add(corpoV, aro, this.tampaValv);
    this.valvula.position.set(0, 0, 0);
    this.jatoValv = new Jato(kit, 320, 0xffffff, 16);
    this.g.add(this.jatoValv.pts);

    // ------------------------------------------------ água (volume para o corte + superfície)
    this.vol = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.vol.scale.set(2 * IN.x - 0.004, 1, 2 * IN.z - 0.004);
    this.vol.renderOrder = -1;
    this.sup = new SuperficieAgua(kit, 2 * IN.x - 0.002, 2 * IN.z - 0.002, 1);
    this.jatoRacha = new Jato(kit, 260, 0xe8f8ff, d === "B" ? 7 : 6);
    this.g.add(this.jatoRacha.pts);
    // fita de água entrando na fenda
    this.vazio = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.1, 1, 8), new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
    this.vazio.userData.semCorte = true;

    this.caixa.add(this.tijolos, this.pisoTij, this.parTij, this.concreto, this.aco, this.imper, this.azulejo, this.borda, this.coadeira, this.retornos, this.valvula, this.vol, this.sup.mesh, this.vazio);
    this.g.add(this.caixa);
  }

  aplica(e: EstadoPiscina, t: number) {
    const d = this.kit.dir;
    // sobe e entorta (espanto): primeiro, para os jatos usarem a posição certa
    const sb = e.sobe ?? 0;
    this.caixa.position.y = 1.15 * sb;
    this.caixa.rotation.set(0.04 * sb, 0, 0.13 * sb);
    this.g.updateMatrixWorld(true);
    const tijolo = e.tijolo ?? 0;
    const conc = e.concreto ?? 0, arm = e.armadura ?? 0;
    const temConc = conc > 0 || arm > 0;
    // tijolo
    this.tijolos.visible = tijolo > 0 && tijolo < 1 && !temConc;
    this.tijolos.count = Math.round(this.nTij * tijolo);
    this.parTij.visible = tijolo >= 1 && !temConc;
    this.pisoTij.visible = !temConc && (tijolo > 0 || (e.reboco ?? 0) > 0);
    this.uRev.uReb.value = e.reboco ?? 0;
    this.rebocoG.visible = this.parTij.visible && (e.reboco ?? 0) > 0;
    this.rebocoTras.forEach((r) => (r.visible = this.rebocoG.visible));
    // a parede de trás estufa (gira de leve) e depois a fenda abre
    const ang = 0.012 * (e.estufa ?? 0) + 0.16 * Math.pow(e.abre ?? 0, 0.8);
    this.pivE.rotation.y = ang;
    this.pivD.rotation.y = -ang;
    const rc = e.racha ?? 0;
    this.risco.visible = this.parTij.visible && rc > 0;
    if (rc > 0) {
      const n = this.risco.geometry.getAttribute("position").count;
      this.risco.geometry.setDrawRange(0, Math.ceil((n / 6) * rc) * 6);
    }
    // concreto
    this.concreto.visible = temConc;
    this.paredesConc.forEach((m) => {
      m.scale.y = Math.max(0.001, conc) * (Y_TOPO - Y_PISO);
      m.visible = conc > 0.001;
    });
    this.aco.visible = arm > 0 && conc < 1;
    this.aco.count = Math.round(this.nAco * arm);
    // revestimento
    const imp = e.imper ?? 0, azu = e.azulejo ?? 0;
    this.uRev.uImp.value = imp;
    this.uRev.uAzu.value = azu;
    this.imper.visible = imp > 0;
    this.azulejo.visible = azu > 0;
    this.borda.visible = (e.borda ?? 0) > 0;
    this.borda.scale.setScalar(1);
    this.borda.position.y = (1 - eob(e.borda ?? 0)) * 0.4;
    // peças
    const nr = e.ralos ?? 0;
    this.ralos[0].visible = nr > 0;
    this.ralos[1].visible = nr > 1;
    const s2 = Math.min(1, Math.max(0.001, nr - 1));
    this.ralos[1].scale.set(eob(s2), 1, eob(s2));
    this.coadeira.visible = (e.coadeira ?? 0) > 0;
    this.coadeira.scale.setScalar(Math.max(0.001, eob(e.coadeira ?? 0)));
    this.porta.rotation.x = e.porta ?? 0.25;
    this.retornos.visible = (e.retornos ?? 0) > 0;
    this.valvula.visible = (e.valvula ?? 0) > 0;
    this.tampaValv.rotation.z = 1.1 * (e.valvAbre ?? 0);
    // água
    const ag = e.agua ?? 0;
    const nivel = e.nivel ?? -0.12;
    const fundo = this.azulejo.visible ? IN.y : temConc ? Y_PISO : this.parTij.visible || this.tijolos.visible ? Y_PISO + 0.015 : Y_PISO;
    this.vol.visible = this.sup.mesh.visible = ag > 0.001 && nivel > fundo + 0.01;
    this.vol.position.y = fundo + 0.002;
    this.vol.scale.y = Math.max(0.001, nivel - fundo - 0.004);
    this.sup.mesh.position.y = nivel;
    this.sup.aplica(t, e.cor);
    this.uCaus.uT.value = t;
    this.uCaus.uNivel.value = this.vol.visible ? nivel : -99;
    this.uCaus.uCaus.value = d === "B" ? 0 : 1 - Math.max(e.cor?.lama ?? 0, e.cor?.verde ?? 0);
    // jatos
    const jr = e.jatoRet ?? 0;
    this.jatos.forEach((j, i) => {
      const o = new THREE.Vector3(RETORNOS[i], Y_RET, -IN.z + 0.05);
      j.aplica(t + i * 0.37, o.applyMatrix4(this.caixa.matrixWorld), new THREE.Vector3(0, 0.05, 0.9), 0.15, 0.08, 1.2, jr);
    });
    const va = e.valvAbre ?? 0;
    this.jatoValv.aplica(t, new THREE.Vector3(0, IN.y - 0.2, 0.02).applyMatrix4(this.caixa.matrixWorld), new THREE.Vector3(0, 1.1, 0), -0.2, 0.12, 0.9, va > 0.2 ? va : 0);
    // água entrando na fenda (fita + respingo)
    const vr = e.vazaRacha ?? 0;
    const xr = 0.22;
    this.vazio.visible = false; // a fita retangular ficou artificial: a água entrando na fenda é só partícula
    (this.vazio.material as THREE.MeshBasicMaterial).opacity = 0.75 * vr;
    this.vazio.position.set(xr, (nivel + Y_PISO) / 2 + 0.1, -PIS.W / 2 - 0.02);
    this.vazio.scale.set(0.6 + 0.4 * vr, Math.max(0.01, (nivel - Y_PISO) / 1.1), 1);
    this.jatoRacha.aplica(t, new THREE.Vector3(xr, nivel - 0.02, -PIS.W / 2 + 0.08), new THREE.Vector3(0, -0.4, -0.9), -1.5, 0.25, 0.5, vr);
    // contornos instanciados acompanham a contagem
    for (const im of [this.tijolos, this.aco])
      im.children.forEach((c) => {
        if ((c as THREE.InstancedMesh).isInstancedMesh) (c as THREE.InstancedMesh).count = im.count;
      });
  }
}

const eob = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
};

/** grelha do ralo: círculo com fendas radiais */
function grelha() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e8e6e0";
  g.fillRect(0, 0, 256, 256);
  g.translate(128, 128);
  g.fillStyle = "#1a1e22";
  for (let i = 0; i < 16; i++) {
    g.save();
    g.rotate((i / 16) * Math.PI * 2);
    g.fillRect(30, -5, 80, 10);
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, 18, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
