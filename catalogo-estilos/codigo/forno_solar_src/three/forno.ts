// Gabinete de computador genérico (torre bege dos anos 2000, sem marca) e o forno solar feito com dois deles.
// Medidas em metros. Gabinete em pé: x = largura 0,19; y = altura 0,43; z = profundidade 0,45 (frente em +z).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Kit } from "./kit";
import { texFrente, texLateral, texChapa, texIsopor, texPlaca, texMDF, texEmbacado } from "./tex";
import { rng } from "./rng";

export const GW = 0.19, GH = 0.43, GD = 0.45;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** queda com quique: 0 = no alto, 1 = pousado */
export function quique(x: number) {
  x = c01(x);
  if (x < 0.6) return (x / 0.6) * (x / 0.6);
  const k = (x - 0.6) / 0.4;
  return 1 - Math.sin(k * Math.PI) * 0.12 * (1 - k);
}

function caixa(w: number, h: number, d: number, r = 0.003, seg = 2) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
}

export class Gabinete {
  g = new THREE.Group(); // origem no centro do gabinete
  tampa: THREE.Group; // painel lateral removível (x+)
  pecas: { o: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3; giro: THREE.Vector3 }[] = [];
  matDentro: THREE.MeshStandardMaterial;
  corCrua = new THREE.Color();
  corPreta = new THREE.Color(0x0e0e0f);
  constructor(public kit: Kit, seed = 1) {
    const d = kit.dir;
    const t = d === "C" ? 0.007 : 0.011;
    const fr = texFrente(d);
    const lat = texLateral(d, 51 + seed);
    const corBege = d === "B" ? 0xf0dfb4 : 0xffffff;
    const fora = kit.mat({ map: lat, color: corBege, rough: d === "C" ? 0.55 : 0.5, clear: d === "C" ? 0.08 : undefined });
    const frente = kit.mat({ map: fr, color: 0xffffff, rough: d === "C" ? 0.5 : 0.48, bump: d === "B" ? null : (fr.userData as { bump: THREE.Texture }).bump, bumpS: d === "C" ? 2.2 : 1.4 });
    const frenteLado = kit.mat({ map: lat, color: corBege, rough: 0.5 });
    this.corCrua.set(d === "B" ? 0xb7c2c8 : 0xa4abb0);
    this.matDentro = kit.mat({ map: d === "B" ? null : texChapa(d), color: this.corCrua, rough: 0.42, metal: d === "B" ? 0 : 0.55 }) as THREE.MeshStandardMaterial;
    const M = (dentro: number) => {
      const arr = [fora, fora, fora, fora, fora, fora];
      arr[dentro] = this.matDentro;
      return arr;
    };
    // faces do BoxGeometry: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, px = 3) => {
      const me = kit.m(geo, mat, px);
      me.position.set(x, y, z);
      this.g.add(me);
      return me;
    };
    add(caixa(t, GH, GD), M(0), -GW / 2 + t / 2, 0, 0); // lateral fixa (x-)
    add(caixa(GW, t, GD), M(3), 0, GH / 2 - t / 2, 0); // topo
    add(caixa(GW, t, GD), M(2), 0, -GH / 2 + t / 2, 0); // fundo
    add(caixa(GW, GH, t), M(4), 0, 0, -GD / 2 + t / 2); // traseira
    add(caixa(GW, GH, t), M(5), 0, 0, GD / 2 - t / 2 - 0.02); // chapa da frente
    // frontal de plástico com baias (a face +z leva a textura)
    const bz = 0.03;
    const geoF = caixa(GW + 0.008, GH + 0.008, bz, d === "C" ? 0.006 : 0.01, 3);
    add(geoF, [frenteLado, frenteLado, frenteLado, frenteLado, frente, frenteLado], 0, 0, GD / 2 - 0.02 + bz / 2);
    // tampa lateral removível
    this.tampa = new THREE.Group();
    const tp = kit.m(caixa(t, GH, GD), M(1), 3);
    this.tampa.add(tp);
    this.tampa.position.set(GW / 2 - t / 2, 0, 0);
    this.g.add(this.tampa);

    // peças internas (saem voando pelo lado aberto, +x)
    const R = rng(seed * 7 + 3);
    const peca = (o: THREE.Object3D, dir: number[]) => {
      this.g.add(o);
      this.pecas.push({ o, base: o.position.clone(), dir: new THREE.Vector3(...dir), giro: new THREE.Vector3(R.ab(-6, 6), R.ab(-6, 6), R.ab(-6, 6)) });
    };
    const placa = kit.m(new THREE.BoxGeometry(0.004, 0.3, 0.25), [kit.mat({ map: texPlaca(d), rough: 0.5 }), kit.mat({ color: 0x1f6b3e }), kit.mat({ color: 0x1f6b3e }), kit.mat({ color: 0x1f6b3e }), kit.mat({ color: 0x1f6b3e }), kit.mat({ color: 0x1f6b3e })], 2);
    placa.position.set(-GW / 2 + t + 0.012, -0.02, -0.03);
    peca(placa, [1.6, 0.9, 0.5]);
    const cooler = new THREE.Group();
    cooler.add(kit.m(new THREE.BoxGeometry(0.03, 0.07, 0.07), kit.mat({ color: 0x9aa0a6, metal: d === "B" ? 0 : 0.7, rough: 0.35 }), 2));
    const helice = kit.m(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20), kit.mat({ color: 0x1c1c1e, rough: 0.6 }), 2);
    helice.rotation.z = Math.PI / 2;
    helice.position.x = 0.02;
    cooler.add(helice);
    cooler.position.set(-GW / 2 + t + 0.03, 0.02, -0.02);
    peca(cooler, [1.4, 1.4, -0.3]);
    const fonte = kit.m(caixa(0.15, 0.086, 0.14, 0.004), kit.mat({ color: d === "B" ? 0xb8bec4 : 0x8d9399, metal: d === "B" ? 0 : 0.6, rough: 0.4 }), 2);
    fonte.position.set(0.005, GH / 2 - t - 0.045, -GD / 2 + t + 0.075);
    peca(fonte, [1.2, 1.8, -0.9]);
    const drive = kit.m(caixa(0.146, 0.042, 0.17, 0.003), kit.mat({ color: d === "B" ? 0xe6d6ae : 0xc9bea2, rough: 0.5 }), 2);
    drive.position.set(0, GH / 2 - 0.075, GD / 2 - 0.12);
    peca(drive, [1.5, 0.6, 1.4]);
    const cores = [0xd8322a, 0xf2c21c, 0x1a1a1a, 0xd8322a];
    for (let i = 0; i < 4; i++) {
      const cv = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.04, 0.03),
        new THREE.Vector3(0.03, 0.02 + i * 0.01, 0.0),
        new THREE.Vector3(0.0, 0.08, -0.06),
        new THREE.Vector3(-0.02, 0.14, -0.1),
      ]);
      const cabo = kit.m(new THREE.TubeGeometry(cv, 24, d === "C" ? 0.0035 : 0.005, 8), kit.mat({ color: cores[i], rough: 0.45 }), 1.5);
      cabo.position.set(-0.01 + i * 0.008, 0.0, 0.0);
      peca(cabo, [1.3, R.ab(-0.6, 1.4), R.ab(-1, 1)]);
    }
    const fita = kit.m(new THREE.BoxGeometry(0.002, 0.05, 0.18), kit.mat({ color: 0xb8b8b8, rough: 0.6 }), 1.5);
    fita.position.set(0.02, 0.1, 0.06);
    fita.rotation.x = 0.4;
    peca(fita, [1.2, 1.2, 1.1]);
  }

  /** abre: tampa sai (0..1); pecas: as peças saem voando (0..1) */
  abre(tampa: number, pecas: number) {
    const k = ease(tampa);
    this.tampa.position.set(GW / 2 - 0.005 + k * 0.5, k * 0.18, k * 0.05);
    this.tampa.rotation.set(0, 0, -k * 0.7);
    this.tampa.visible = tampa < 0.999;
    for (const p of this.pecas) {
      const x = c01(pecas);
      const s = x * x; // acelera saindo
      p.o.position.copy(p.base).addScaledVector(p.dir, s * 0.9);
      p.o.position.x += s * 0.25;
      p.o.rotation.set(p.giro.x * s, p.giro.y * s, p.giro.z * s);
      p.o.visible = pecas < 0.999;
    }
  }
  pinta(k: number) {
    this.matDentro.color.copy(this.corCrua).lerp(this.corPreta, ease(k));
    this.matDentro.roughness = THREE.MathUtils.lerp(0.42, 0.95, ease(k));
    this.matDentro.metalness = THREE.MathUtils.lerp(this.kit.dir === "B" ? 0 : 0.55, 0, ease(k));
    if (this.matDentro.map && k > 0.5) this.matDentro.map = null, (this.matDentro.needsUpdate = true);
  }
}

// ------------------------------------------------------------------------------------------------ pizza
export class Pizza {
  g = new THREE.Group();
  crua: THREE.Mesh;
  assada: THREE.Mesh;
  borda: THREE.Mesh;
  bolhas: THREE.InstancedMesh;
  calab: THREE.InstancedMesh;
  matCrua: THREE.MeshStandardMaterial;
  matAssada: THREE.MeshStandardMaterial;
  matBorda: THREE.MeshStandardMaterial;
  bolhaDados: { x: number; z: number; f: number; r: number }[] = [];
  R0 = 0.125;
  fat!: THREE.Group;
  fios: THREE.Mesh[] = [];
  inteiros: THREE.Mesh[] = [];
  restos: THREE.Mesh[] = [];
  massa!: THREE.Mesh;
  constructor(public kit: Kit, texCrua: THREE.Texture, texAssada: THREE.Texture, seed = 2) {
    const d = kit.dir;
    const R0 = this.R0;
    const massa = kit.m(new THREE.CylinderGeometry(R0, R0 * 0.98, 0.01, 48), kit.mat({ color: d === "B" ? 0xf2d79a : 0xe9cf9c, rough: 0.8 }), 2);
    massa.position.y = 0.005;
    this.massa = massa;
    this.g.add(massa);
    this.matBorda = kit.mat({ color: 0xe8d0a0, rough: 0.75 }) as THREE.MeshStandardMaterial;
    this.borda = kit.m(new THREE.TorusGeometry(R0 - 0.012, 0.014, 14, 56), this.matBorda, 2.5);
    this.borda.rotation.x = Math.PI / 2;
    this.borda.scale.set(1, 1, 0.75);
    this.borda.position.y = 0.012;
    this.g.add(this.borda);
    this.matCrua = kit.mat({ map: texCrua, rough: 0.7 }) as THREE.MeshStandardMaterial;
    this.matAssada = kit.mat({ map: texAssada, rough: d === "C" ? 0.32 : 0.45, clear: d === "C" ? 0.35 : undefined }) as THREE.MeshStandardMaterial;
    this.matAssada.transparent = true;
    const disco = new THREE.CircleGeometry(R0 - 0.014, 64);
    disco.rotateX(-Math.PI / 2);
    this.crua = kit.m(disco, this.matCrua, 0);
    this.crua.position.y = 0.0115;
    this.assada = kit.m(disco, this.matAssada, 0);
    this.assada.position.y = 0.0125;
    this.crua.castShadow = this.assada.castShadow = false;
    this.g.add(this.crua, this.assada);
    // calabresa
    const R = rng(seed);
    const n = 8;
    this.calab = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.019, 0.019, 0.004, 20), kit.mat({ color: d === "B" ? 0xc23a2a : 0x9c2b1e, rough: 0.45 }), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R.ab(-0.3, 0.3), r = i === 0 ? 0 : R.ab(0.045, 0.085);
      m4.makeTranslation(Math.cos(a) * r, 0.0145, Math.sin(a) * r);
      this.calab.setMatrixAt(i, m4);
    }
    this.calab.castShadow = true;
    kit.contorno(this.calab as unknown as THREE.Mesh, 1.5);
    this.g.add(this.calab);
    // bolhas do queijo
    const nb = 26;
    this.bolhas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat({ color: d === "B" ? 0xffe08a : 0xf6d27a, rough: 0.25, clear: 0.6 }), nb);
    for (let i = 0; i < nb; i++) {
      const a = R.r() * Math.PI * 2, r = Math.sqrt(R.r()) * 0.095;
      this.bolhaDados.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, f: R.ab(0, 6.28), r: R.ab(0.005, 0.011) });
    }
    kit.contorno(this.bolhas as unknown as THREE.Mesh, 1.2);
    this.g.add(this.bolhas);
    // fatia (1/8) voltada para +z; no CircleGeometry deitado, o ângulo da frente (+z) é -PI/2
    const W8 = Math.PI / 4;
    const cF = -Math.PI / 2 - W8 / 2; // início da fatia no disco (CircleGeometry deitado: theta -> (cos, -sin))
    this.inteiros = [this.massa, this.crua, this.assada];
    const discoR = new THREE.CircleGeometry(R0 - 0.014, 64, cF + W8, Math.PI * 2 - W8);
    discoR.rotateX(-Math.PI / 2);
    const topoR = kit.m(discoR, this.matAssada, 0);
    topoR.position.y = 0.0125;
    // massa: no CylinderGeometry, theta 0 aponta para +z
    const massaR = kit.m(new THREE.CylinderGeometry(R0, R0 * 0.98, 0.01, 48, 1, false, W8 / 2, Math.PI * 2 - W8), this.massa.material as THREE.Material, 2);
    massaR.position.y = 0.005;
    this.restos = [massaR, topoR];
    for (const r of this.restos) { r.visible = false; this.g.add(r); }
    this.fat = new THREE.Group();
    const fm = kit.m(new THREE.CylinderGeometry(R0, R0 * 0.98, 0.01, 12, 1, false, -W8 / 2, W8), this.massa.material as THREE.Material, 2);
    fm.position.y = 0.005;
    const fd = new THREE.CircleGeometry(R0 - 0.014, 12, cF, W8);
    fd.rotateX(-Math.PI / 2);
    const ft = kit.m(fd, this.matAssada, 0);
    ft.position.y = 0.0125;
    this.fat.add(fm, ft);
    this.fat.visible = false;
    this.g.add(this.fat);
    const matFio = kit.mat({ color: d === "B" ? 0xffd25e : 0xf3cf6e, rough: 0.35, clear: 0.4 });
    for (let i = 0; i < 6; i++) {
      const f = kit.m(new THREE.CylinderGeometry(0.0032, 0.0032, 1, 6), matFio, 1);
      f.visible = false;
      this.fios.push(f);
      this.g.add(f);
    }
  }
  /** fatia levanta (0..1) e o queijo estica em fios entre a fatia e a pizza */
  fatia(k: number, t: number) {
    const on = k > 0.001;
    this.massa.visible = !on;
    this.crua.visible = !on;
    this.assada.visible = !on && this.matAssada.opacity > 0.001;
    for (const m of this.restos) m.visible = on;
    this.fat.visible = on;
    if (!on) { this.fios.forEach((f) => (f.visible = false)); return; }
    const kk = ease(k);
    this.fat.position.set(0, 0.015 + kk * 0.12, kk * 0.08);
    this.fat.rotation.set(-0.4 * kk, 0, 0);
    this.fat.updateMatrix();
    const R = this.R0 - 0.03;
    this.fios.forEach((f, i) => {
      const u = (i + 0.5) / this.fios.length;
      const ang = -Math.PI / 8 + u * (Math.PI / 4);
      const rr = R * (0.3 + 0.65 * (((i * 37) % 10) / 10));
      const base = new THREE.Vector3(Math.sin(ang) * rr, 0.013, Math.cos(ang) * rr);
      const top = base.clone().applyMatrix4(this.fat.matrix);
      const v = top.clone().sub(base);
      const L = v.length();
      const quebra = kk > 0.8 + (i % 3) * 0.06;
      f.visible = L > 0.004 && !quebra;
      f.position.copy(base).addScaledVector(v, 0.5);
      f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      const fino = 1 - kk * 0.55;
      f.scale.set(fino, L, fino);
    });
  }
  /** asado 0..1 (cru -> assado), t para as bolhas */
  aplica(asado: number, t: number) {
    const k = ease(asado);
    this.matAssada.opacity = k;
    this.assada.visible = k > 0.001;
    this.matBorda.color.set(0xe8d0a0).lerp(new THREE.Color(this.kit.dir === "B" ? 0xe0a050 : 0xc58a45), k);
    const m4 = new THREE.Matrix4();
    const ferve = c01((asado - 0.45) / 0.4);
    this.bolhaDados.forEach((b, i) => {
      const ph = Math.max(0, Math.sin(t * 2.2 + b.f));
      const s = b.r * ferve * (0.35 + 0.65 * ph);
      m4.compose(new THREE.Vector3(b.x, 0.013, b.z), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.8, s));
      this.bolhas.setMatrixAt(i, m4);
    });
    this.bolhas.instanceMatrix.needsUpdate = true;
    this.bolhas.visible = ferve > 0.01;
  }
}

// ------------------------------------------------------------------------------------------------ raios e calor
/** feixe fino com pulsos andando de a -> b (mostra o sentido da luz) */
function matFeixe(cor: THREE.Color, largura = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, op: { value: 1 }, cor: { value: cor }, larg: { value: largura } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float t, op, larg; uniform vec3 cor; varying vec2 vUv;
      void main(){
        float across = clamp(1.0 - abs(vUv.x*2.0-1.0), 0.0, 1.0);
        float nucleo = pow(across, 6.0) + pow(across, 1.5)*0.25;
        float pulso = 0.55 + 0.45*smoothstep(0.65, 1.0, fract(vUv.y*5.0 - t*1.4));
        float pontas = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        gl_FragColor = vec4(cor * nucleo * pulso * pontas * op, 1.0);
      }`,
  });
}
/** fita voltada para a câmera ao longo de a->b (atualizada por quadro) */
class Fita {
  me: THREE.Mesh;
  constructor(public a: THREE.Vector3, public b: THREE.Vector3, public larg: number, mat: THREE.ShaderMaterial) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    this.me = new THREE.Mesh(g, mat);
    this.me.frustumCulled = false;
    this.me.userData.semProf = true;
    this.me.renderOrder = 5;
  }
  atualiza(cam: THREE.Camera, mundo: THREE.Matrix4, k = 1) {
    const A = this.a.clone().applyMatrix4(mundo), B = this.a.clone().lerp(this.b, k).applyMatrix4(mundo);
    const inv = new THREE.Matrix4().copy(mundo).invert();
    const eixo = B.clone().sub(A).normalize();
    const vc = cam.position.clone().sub(A).normalize();
    const lado = eixo.clone().cross(vc).normalize().multiplyScalar(this.larg / 2);
    const p = this.me.geometry.getAttribute("position") as THREE.BufferAttribute;
    const pts = [A.clone().sub(lado), A.clone().add(lado), B.clone().sub(lado), B.clone().add(lado)].map((v) => v.applyMatrix4(inv));
    pts.forEach((v, i) => p.setXYZ(i, v.x, v.y, v.z));
    p.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------------ forno
export type EstadoForno = {
  pe?: number; // 1 = os dois gabinetes em pé, fechados (gancho); 0 = deitados
  cai?: number; // queda dos gabinetes em pé sobre a mesa (0 = no alto, 1 = pousados)
  junta?: number; // 0 = gabinetes separados; 1 = lado a lado encostados
  rebites?: number; // quantos rebites (0..N, fracionário = estalando)
  pintura?: number;
  isopor?: number;
  vidro?: number;
  espelho?: number;
  aceso?: number;
  raios?: number; // raios diretos (atravessam o vidro)
  raiosEsp?: number; // raios rebatidos pelo espelho
  rolo?: number; // rolo de tinta (0..1; a tinta acompanha)
  pizzaMesa?: number; // pizza crua na mesa (gancho)
  fatia?: number; // fatia esticando o queijo
  corte?: boolean; // corte em X (metade da frente some)
  luzSol?: number; // 1 = sol direto; menos = nuvem
  calor?: number;
  embacado?: number;
  pizzas?: number;
  asado?: number;
  tampaAberta?: number;
  pizzaSai?: number;
  abre?: number; // tampas e peças (gancho / cena 3)
  pecas?: number;
};

export class Forno {
  g = new THREE.Group();
  A: Gabinete;
  B: Gabinete;
  rebites: THREE.Mesh[] = [];
  flashes: THREE.Mesh[] = [];
  isopor: { me: THREE.Group; base: THREE.Vector3; de: THREE.Vector3 }[] = [];
  vidro: THREE.Group;
  matEmb: THREE.MeshBasicMaterial;
  espelho: THREE.Group;
  pizzas: Pizza[] = [];
  pa: THREE.Group;
  rolo!: THREE.Group;
  pizzaMesa!: Pizza;
  planoCorte = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private cortado = false;
  contornoLaranja: THREE.Group;
  matLaranja: THREE.MeshBasicMaterial;
  luzDentro: THREE.PointLight;
  raios: { f: Fita; m: THREE.ShaderMaterial; atraso: number; esp: boolean }[] = [];
  calor: { f: THREE.Mesh; m: THREE.ShaderMaterial }[] = [];
  gRaios = new THREE.Group();
  corOutline = { value: new THREE.Color("#1a0f0c") };
  H = 0.19; // altura do forno (gabinete deitado)
  constructor(public kit: Kit, texCrua: THREE.Texture, texAssada: THREE.Texture, public solDir: THREE.Vector3) {
    const d = kit.dir;
    kit.grupo = this.corOutline;
    this.A = new Gabinete(kit, 1);
    this.B = new Gabinete(kit, 2);
    this.g.add(this.A.g, this.B.g);
    // rebites ao longo da emenda (x = 0): no topo das duas bordas e na traseira
    const geoR = new THREE.SphereGeometry(d === "C" ? 0.008 : 0.012, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const matR = kit.mat({ color: d === "B" ? 0xd9e2ea : 0xc9ced3, metal: d === "B" ? 0 : 0.9, rough: 0.3 });
    const geoF = new THREE.SphereGeometry(0.035, 16, 10);
    const pos: [number, number, number, number][] = [];
    for (let i = 0; i < 6; i++) pos.push([0, this.H + 0.0005, -0.19 + i * 0.075, 0]); // topo da emenda
    for (let i = 0; i < 3; i++) pos.push([0, 0.04 + i * 0.055, -GD / 2 - 0.001, 1]); // traseira
    for (const [x, y, z, lado] of pos) {
      const r = kit.m(geoR, matR, 1.5);
      r.position.set(x, y, z);
      if (lado === 1) r.rotation.x = -Math.PI / 2;
      this.rebites.push(r);
      this.g.add(r);
      const f = new THREE.Mesh(geoF, kit.mat({ aditivo: true, color: new THREE.Color(0xffd9a0).multiplyScalar(2) }));
      f.position.copy(r.position);
      f.userData.semProf = true;
      this.flashes.push(f);
      this.g.add(f);
    }
    // isopor: placas nas pontas, atrás e embaixo, presas com espetos de churrasco
    const iso = texIsopor();
    const matIso = kit.mat({ color: d === "B" ? 0xffffff : d === "A" ? 0xeceae4 : 0xf2f2ee, map: null, bump: d === "B" ? null : iso, bumpS: d === "C" ? 3 : 1.5, rough: 0.92, clear: 0 });
    const e = 0.04;
    const L = 0.86 + 2 * e;
    const placa = (w: number, h: number, dd: number, pos: number[], de: number[]) => {
      const gg = new THREE.Group();
      const me = kit.m(caixa(w, h, dd, 0.004), matIso, 2.5);
      gg.add(me);
      // espetos: palitos com ponta saindo para fora
      const geoE = new THREE.CylinderGeometry(d === "C" ? 0.0022 : 0.0035, d === "C" ? 0.0022 : 0.0035, 0.09, 6);
      const matE = kit.mat({ color: d === "B" ? 0xe9c58a : 0xd9b98a, rough: 0.8 });
      const nrm = new THREE.Vector3(...de).normalize();
      const cantos = w > dd ? [[-w / 2 + 0.05, h / 2 - 0.04], [w / 2 - 0.05, h / 2 - 0.04], [-w / 2 + 0.05, -h / 2 + 0.04], [w / 2 - 0.05, -h / 2 + 0.04]] : [[-dd / 2 + 0.05, h / 2 - 0.04], [dd / 2 - 0.05, h / 2 - 0.04], [-dd / 2 + 0.05, -h / 2 + 0.04], [dd / 2 - 0.05, -h / 2 + 0.04]];
      if (h > 0.1)
        for (const [a, b] of cantos) {
          const es = kit.m(geoE, matE, 1.2);
          if (w > dd) es.position.set(a, b, nrm.z * 0.03), (es.rotation.x = Math.PI / 2);
          else es.position.set(nrm.x * 0.03, b, a), (es.rotation.z = Math.PI / 2);
          gg.add(es);
        }
      gg.position.set(pos[0], pos[1], pos[2]);
      this.g.add(gg);
      this.isopor.push({ me: gg, base: gg.position.clone(), de: new THREE.Vector3(...de) });
    };
    placa(e, this.H + e, GD, [-0.43 - e / 2, (this.H - e) / 2 + 0.0, 0], [-1, 0, 0]);
    placa(e, this.H + e, GD, [0.43 + e / 2, (this.H - e) / 2 + 0.0, 0], [1, 0, 0]);
    placa(L, this.H + e, e, [0, (this.H - e) / 2, -GD / 2 - e / 2], [0, 0, -1]);
    placa(L, e, GD + e, [0, -e / 2, -e / 2], [0, -1, 0]);

    // tampa de vidro com moldura
    this.vidro = new THREE.Group();
    const vid = kit.m(new THREE.BoxGeometry(0.9, 0.005, GD + 0.03), kit.mat({ vidro: true }), 0);
    vid.renderOrder = 4;
    this.vidro.add(vid);
    this.matEmb = new THREE.MeshBasicMaterial({ map: texEmbacado(), transparent: true, opacity: 0, depthWrite: false, color: d === "B" ? 0xffffff : 0xe8edf0 });
    const emb = new THREE.Mesh(new THREE.PlaneGeometry(0.88, GD + 0.02), this.matEmb);
    emb.rotation.x = -Math.PI / 2;
    emb.position.y = -0.003;
    emb.renderOrder = 3;
    emb.userData.semProf = true;
    this.vidro.add(emb);
    const matMold = kit.mat({ color: d === "B" ? 0xb9c4cc : 0xb5bcc2, metal: d === "B" ? 0 : 0.85, rough: 0.35 });
    const mw = 0.014;
    for (const [w, dd, x, z] of [[0.9 + mw, mw, 0, (GD + 0.03) / 2], [0.9 + mw, mw, 0, -(GD + 0.03) / 2], [mw, GD + 0.03, 0.45, 0], [mw, GD + 0.03, -0.45, 0]]) {
      const mm = kit.m(caixa(w, 0.012, dd, 0.002), matMold, 2);
      mm.position.set(x, 0.002, z);
      this.vidro.add(mm);
    }
    if (d === "B") {
      // brilho pintado do toon: duas faixas brancas diagonais
      for (const [x, w] of [[-0.18, 0.05], [-0.08, 0.02]]) {
        const fx = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
        fx.rotation.set(-Math.PI / 2, 0, 0.6);
        fx.position.set(x, 0.004, 0);
        fx.userData.semProf = true;
        this.vidro.add(fx);
      }
    }
    this.g.add(this.vidro);

    // espelho articulado na borda de trás (verso de MDF), com 2 escoras
    this.espelho = new THREE.Group();
    const ew = 0.9, eh = 0.56;
    const espM = kit.m(new THREE.BoxGeometry(ew - 0.03, eh - 0.03, 0.004), kit.mat({ espelho: true }), 0);
    espM.position.set(0, eh / 2, 0.006);
    espM.castShadow = false;
    const verso = kit.m(caixa(ew, eh, 0.012, 0.003), kit.mat({ map: d === "B" ? null : texMDF(), color: d === "B" ? 0xb98a5a : 0xffffff, rough: 0.85 }), 2.5);
    verso.position.set(0, eh / 2, -0.004);
    this.espelho.add(espM, verso);
    this.espelho.position.set(0, this.H + 0.04, -GD / 2 - 0.04);
    this.g.add(this.espelho);

    // pizzas, uma em cada gabinete
    for (let i = 0; i < 2; i++) {
      const p = new Pizza(kit, texCrua, texAssada, 5 + i);
      p.g.position.set(i === 0 ? -0.215 : 0.215, 0.012, -0.005);
      this.pizzas.push(p);
      this.g.add(p.g);
    }
    // pá de pizza (sai com a pizza da esquerda)
    this.pa = new THREE.Group();
    const matPa = kit.mat({ color: d === "B" ? 0xdcae6e : 0xc79a62, rough: 0.7 });
    const lam = kit.m(caixa(0.3, 0.008, 0.32, 0.004), matPa, 2.5);
    const cabo = kit.m(new THREE.CylinderGeometry(0.014, 0.016, 0.5, 12), matPa, 2.5);
    cabo.rotation.x = Math.PI / 2;
    cabo.position.set(0, 0.005, 0.4);
    this.pa.add(lam, cabo);
    this.pa.visible = false;
    this.g.add(this.pa);
    // rolo de tinta (cabo + rolo de lã preta)
    this.rolo = new THREE.Group();
    const la = kit.m(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 20), kit.mat({ color: 0x141414, rough: 1 }), 2);
    la.rotation.x = Math.PI / 2;
    const arame = kit.m(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), kit.mat({ color: 0xb0b6bb, metal: d === "B" ? 0 : 0.9, rough: 0.3 }), 1.5);
    arame.position.set(0, 0.1, 0.14);
    const caboR = kit.m(new THREE.CylinderGeometry(0.012, 0.014, 0.22, 10), kit.mat({ color: d === "B" ? 0xd6402a : 0xb8352a, rough: 0.5 }), 2);
    caboR.position.set(0, 0.29, 0.16);
    caboR.rotation.x = 0.35;
    this.rolo.add(la, arame, caboR);
    this.rolo.visible = false;
    this.g.add(this.rolo);
    // pizza crua na mesa, entre os dois gabinetes em pé (gancho)
    this.pizzaMesa = new Pizza(kit, texCrua, texAssada, 11);
    this.pizzaMesa.g.visible = false;
    this.g.add(this.pizzaMesa.g);
    kit.grupo = undefined;

    // contorno laranja (o forno "acende"): tubos nas arestas da caixa externa
    this.matLaranja = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6b2c).multiplyScalar(d === "B" ? 1.0 : 2.4), toneMapped: false, transparent: true, depthWrite: false, blending: d === "B" ? THREE.NormalBlending : THREE.AdditiveBlending });
    this.contornoLaranja = new THREE.Group();
    const bx = 0.43 + e + 0.003, by0 = -e - 0.003, by1 = this.H + 0.012, bz0 = -GD / 2 - e - 0.003, bz1 = GD / 2 + 0.02;
    const cantos = [
      [-bx, by0, bz0], [bx, by0, bz0], [bx, by0, bz1], [-bx, by0, bz1],
      [-bx, by1, bz0], [bx, by1, bz0], [bx, by1, bz1], [-bx, by1, bz1],
    ].map((v) => new THREE.Vector3(...v));
    const ar = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [a, b] of ar) {
      const v = cantos[b].clone().sub(cantos[a]);
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, v.length(), 8), this.matLaranja);
      tb.position.copy(cantos[a]).addScaledVector(v, 0.5);
      tb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
      tb.userData.semProf = true;
      this.contornoLaranja.add(tb);
    }
    this.g.add(this.contornoLaranja);
    this.luzDentro = new THREE.PointLight(0xff7a30, 0, 0.9, 1.5);
    this.luzDentro.position.set(0, 0.1, 0);
    this.g.add(this.luzDentro);

    // raios de sol: diretos (atravessam o vidro) e rebatidos pelo espelho -> chapa preta do fundo
    const sd = solDir.clone().normalize();
    const amarelo = new THREE.Color(0xffd23f).multiplyScalar(d === "B" ? 1.0 : 1.8);
    const R = rng(9);
    for (let i = 0; i < 7; i++) {
      const alvo = new THREE.Vector3(R.ab(-0.36, 0.36), 0.015, R.ab(-0.14, 0.17));
      const m = matFeixe(amarelo);
      const f = new Fita(alvo.clone().addScaledVector(sd, 1.6), alvo, d === "C" ? 0.018 : 0.024, m);
      this.raios.push({ f, m, atraso: i * 0.06, esp: false });
      this.gRaios.add(f.me);
    }
    // rebatidos: sol -> ponto no espelho -> fundo
    for (let i = 0; i < 5; i++) {
      const pe = new THREE.Vector3(R.ab(-0.32, 0.32), this.H + 0.04 + 0.33, -GD / 2 - 0.04 - 0.1);
      const alvo = new THREE.Vector3(pe.x * 0.9 + R.ab(-0.04, 0.04), 0.015, R.ab(0.0, 0.18));
      const m1 = matFeixe(amarelo), m2 = matFeixe(amarelo);
      const f1 = new Fita(pe.clone().addScaledVector(sd, 1.6), pe, d === "C" ? 0.016 : 0.022, m1);
      const f2 = new Fita(pe, alvo, d === "C" ? 0.016 : 0.022, m2);
      this.raios.push({ f: f1, m: m1, atraso: i * 0.05, esp: true }, { f: f2, m: m2, atraso: 0.3 + i * 0.05, esp: true });
      this.gRaios.add(f1.me, f2.me);
    }
    this.g.add(this.gRaios);
    // calor preso: ondas laranja que sobem do fundo, batem no vidro e voltam (nunca passam do vidro)
    for (let i = 0; i < 4; i++) {
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
        uniforms: { t: { value: 0 }, op: { value: 0 }, fase: { value: i * 1.7 }, cor: { value: new THREE.Color(0xff5a1e).multiplyScalar(d === "B" ? 1 : 1.6) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float t, op, fase; uniform vec3 cor; varying vec2 vUv;
          void main(){
            float y = clamp(vUv.y, 0.0, 1.0); // 0 = fundo, 1 = vidro
            float x = vUv.x*2.0-1.0;
            float s = 0.0;
            for (int k=0;k<2;k++){
              float fk = float(k);
              float onda = sin(y*6.5 - t*2.4 + fase + fk*2.6)*0.16 + (fk-0.5)*0.7;
              s += smoothstep(0.16, 0.0, abs(x - onda)) * (0.5 + 0.5*sin(y*9.0 - t*5.0 + fk));
            }
            // reflexo no vidro: brilho no topo que volta para baixo
            float topo = smoothstep(0.82, 1.0, y) * (0.6 + 0.4*sin(vUv.x*20.0 + t*4.0));
            float a = (s * (0.35 + 0.65*y) + topo*0.6) * smoothstep(0.0, 0.1, y) * smoothstep(1.0, 0.96, y);
            gl_FragColor = vec4(cor * a * op, 1.0);
          }`,
      });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.36, this.H - 0.02), m);
      pl.position.set(i < 2 ? -0.215 : 0.215, (this.H - 0.02) / 2 + 0.01, -0.08 + (i % 2) * 0.15);
      pl.userData.semProf = true;
      pl.renderOrder = 2;
      this.calor.push({ f: pl, m });
      this.g.add(pl);
    }
  }

  /** gabinetes deitados (lado aberto para cima) e encostados; junta 0 = afastados; pe 1 = em pé lado a lado */
  posiciona(junta: number, pe = 0, cai = 1) {
    const k = ease(junta);
    const kp = ease(pe);
    const q = quique(cai);
    for (const [gab, s] of [[this.A, -1], [this.B, 1]] as [Gabinete, number][]) {
      const qL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      const qS = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s < 0 ? 0.32 : -0.12, 0));
      gab.g.quaternion.copy(qL).slerp(qS, kp);
      const pL = new THREE.Vector3(s * (0.215 + (1 - k) * 0.12), GW / 2, 0);
      const pS = new THREE.Vector3(s * 0.27 + (s < 0 ? -0.01 : 0.02), GH / 2 - 0.04, s < 0 ? 0.02 : -0.05);
      gab.g.position.copy(pL).lerp(pS, kp);
      gab.g.position.y += Math.sin(Math.PI * kp) * 0.22 + (1 - q) * 1.4 * (s < 0 ? 1 : 1.15);
    }
  }

  /** corte em X: o que estiver à frente do meio do forno some */
  corta(on: boolean) {
    this.g.updateMatrixWorld(true);
    const zc = new THREE.Vector3(0, 0, 0).applyMatrix4(this.g.matrixWorld).z;
    this.planoCorte.set(new THREE.Vector3(0, 0, -1), zc);
    if (on === this.cortado) return;
    this.cortado = on;
    this.g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m || o.userData.semProf) return; // raios e calor ficam inteiros
      for (const mm of Array.isArray(m) ? m : [m]) {
        mm.clippingPlanes = on ? [this.planoCorte] : null;
        if ((mm as THREE.ShaderMaterial).isShaderMaterial) (mm as THREE.ShaderMaterial).clipping = on;
        if (mm.userData.ladoOrig === undefined) mm.userData.ladoOrig = mm.side;
        if (!(mm as THREE.ShaderMaterial).isShaderMaterial) mm.side = on ? THREE.DoubleSide : mm.userData.ladoOrig;
        mm.needsUpdate = true;
      }
    });
  }

  aplica(e: EstadoForno, t: number, cam: THREE.Camera) {
    this.posiciona(e.junta ?? 1, e.pe ?? 0, e.cai ?? 1);
    const ab = e.abre ?? 1;
    this.A.abre(ab, e.pecas ?? 1);
    this.B.abre(ab, e.pecas ?? 1);
    const pt = e.pintura ?? 0;
    this.A.pinta(c01(pt * 2));
    this.B.pinta(c01(pt * 2 - 1));
    const kro = e.rolo ?? 0;
    this.rolo.visible = kro > 0 && kro < 1;
    if (this.rolo.visible) {
      const lado = kro < 0.5 ? -1 : 1, u = (kro < 0.5 ? kro : kro - 0.5) * 2;
      this.rolo.position.set(lado * 0.215 + Math.sin(u * Math.PI * 3) * 0.13, 0.045, -0.02 + (u - 0.5) * 0.16);
    }
    const kpm = e.pizzaMesa ?? 0;
    this.pizzaMesa.g.visible = kpm > 0;
    if (kpm > 0) {
      this.pizzaMesa.aplica(0, t);
      this.pizzaMesa.g.position.set(0.0, -0.04 + 0.002 + (1 - quique(kpm)) * 0.5, 0.0);
    }
    this.corta(!!e.corte);
    // rebites: o i-ésimo estala quando rebites passa de i
    const nr = e.rebites ?? 0;
    this.rebites.forEach((r, i) => {
      const k = c01(nr - i);
      r.visible = k > 0;
      const s = k < 1 ? 0.4 + 0.9 * Math.sin(k * Math.PI * 0.5) : 1;
      r.scale.setScalar(Math.min(s, 1.25 - 0.25 * k));
      const fl = this.flashes[i];
      const kf = nr - i;
      fl.visible = kf > 0 && kf < 0.6;
      fl.scale.setScalar(0.3 + kf * 1.2);
      (fl.material as THREE.MeshBasicMaterial).opacity = 1 - kf / 0.6;
      (fl.material as THREE.MeshBasicMaterial).transparent = true;
    });
    // isopor cai e encaixa
    const ki = e.isopor ?? 0;
    this.isopor.forEach((p, i) => {
      const x = c01(ki * 1.6 - i * 0.2);
      const q = quique(x);
      p.me.visible = x > 0;
      p.me.position.copy(p.base).addScaledVector(p.de, (1 - q) * 0.05);
      p.me.position.y += (1 - q) * 0.6;
    });
    // vidro desce
    const kv = e.vidro ?? 0;
    const ta = ease(e.tampaAberta ?? 0);
    this.vidro.visible = kv > 0;
    this.vidro.position.set(0, this.H + 0.004 + (1 - quique(kv)) * 0.35 + ta * 0.27, -ta * 0.27);
    this.vidro.rotation.x = -ta * 1.05;
    this.matEmb.opacity = (e.embacado ?? 0) * (1 - ta * 0.6) * 0.85;
    // espelho levanta
    const ke = e.espelho ?? 0;
    this.espelho.visible = ke > 0;
    this.espelho.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - 0.02, -0.32, ease(ke));
    // aceso: contorno laranja + brilho dentro
    const ka = e.aceso ?? 0;
    this.contornoLaranja.visible = ka > 0.01 && this.kit.dir !== "B";
    this.matLaranja.opacity = ka * (0.35 + 0.65 * (e.luzSol ?? 1));
    this.corOutline.value.set("#1a0f0c").lerp(new THREE.Color("#ff6b2c"), ka);
    this.luzDentro.intensity = ka * (this.kit.dir === "B" ? 0.6 : 1.4) + (e.calor ?? 0) * 0.6;
    for (const gab of [this.A, this.B]) {
      gab.matDentro.emissive.set(0xff4a10);
      gab.matDentro.emissiveIntensity = (e.calor ?? 0) * (this.kit.dir === "B" ? 0.18 : 0.12);
    }
    // raios
    const kr = e.raios ?? 0, ke2 = e.raiosEsp ?? 0;
    this.gRaios.visible = kr > 0.001 || ke2 > 0.001;
    this.g.updateMatrixWorld(true);
    for (const r of this.raios) {
      const k = c01(((r.esp ? ke2 : kr) - r.atraso) / 0.35);
      r.f.me.visible = k > 0;
      r.f.atualiza(cam, this.g.matrixWorld, ease(k));
      r.m.uniforms.t.value = t;
      r.m.uniforms.op.value = Math.min(1, k * 1.5) * (e.luzSol ?? 1);
    }
    const kc = e.calor ?? 0;
    for (const c of this.calor) {
      c.f.visible = kc > 0.001;
      c.m.uniforms.t.value = t;
      c.m.uniforms.op.value = kc * (0.4 + 0.6 * (e.luzSol ?? 1));
      c.f.quaternion.copy((cam as THREE.PerspectiveCamera).quaternion);
      // só gira em torno do eixo vertical (fica de pé dentro da caixa)
      const e2 = new THREE.Euler().setFromQuaternion(c.f.quaternion, "YXZ");
      c.f.rotation.set(0, e2.y, 0);
    }
    // pizzas
    const kp = e.pizzas ?? 0;
    this.pizzas.forEach((p, i) => {
      const x = c01(kp * 1.5 - i * 0.5);
      p.g.visible = x > 0;
      p.aplica(e.asado ?? 0, t + i);
      p.g.position.y = 0.012 + (1 - quique(x)) * 0.4;
    });
    // pizza saindo na pá
    const ks = e.pizzaSai ?? 0;
    this.pa.visible = ks > 0;
    if (ks > 0) {
      const p = this.pizzas[0];
      const k = ease(ks);
      const pos = new THREE.Vector3(-0.215, 0.02, -0.005).lerp(new THREE.Vector3(-0.12, 0.34, 0.5), k);
      this.pa.position.copy(pos);
      this.pa.rotation.set(0.12 * k, 0.75 * k, -0.04 * k);
      p.g.position.copy(pos).add(new THREE.Vector3(0, 0.006, 0).applyEuler(this.pa.rotation));
      p.g.rotation.copy(this.pa.rotation);
    }
    this.pizzas[0].fatia(e.fatia ?? 0, t);
  }
}
