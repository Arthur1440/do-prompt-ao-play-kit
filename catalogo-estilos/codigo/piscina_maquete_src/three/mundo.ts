// Orquestra o quintal, a piscina, a boia de flamingo, o corte de terreno e a virada.
// Tudo é função pura de Estado: o render pode pular e repetir quadros sem herdar nada do anterior.
import * as THREE from "three";
import { Kit, Dir, montaMundo } from "./kit";
import { Corte, matTampa } from "./corte";
import { Terreno, EstadoTerreno, glslTerra, EXT } from "./terreno";
import { Piscina, EstadoPiscina } from "./piscina";
import { Cenario } from "./cenario";
import { Flamingo, EstadoFlamingo } from "./flamingo";
import { Virada } from "./virada";
import { texCeuP, texLama } from "./texp";
import { SuperficieAgua } from "./agua";
import { rng } from "./rng";
import { Extras, EstadoExtras } from "./extras";

/** câmera em órbita em volta de `alvo`: az (graus, 0 = de frente, + à direita), el (graus), dist (m) */
export type Cam = { az: number; el: number; dist: number; fov?: number; alvo?: [number, number, number]; foco?: number; focoC?: number; abert?: number; abertC?: number; rolo?: number };

export type Estado = {
  t: number;
  cam: Cam;
  corte?: number | null; // z do corte de terreno
  ter?: EstadoTerreno;
  pis?: EstadoPiscina;
  fla?: EstadoFlamingo;
  fla2?: EstadoFlamingo[]; // reservado
  lencolGap?: number; // altura da água do terreno embaixo da caixa que subiu
  fluxo?: number; // 0..1 o caminho da água acende em laranja
  escuro?: number;
  desf?: number;
  virada?: { k: number; k2: number }; // varredura sólido -> arame, desmonte em partículas
  maq?: number; // 0..1 a casa de máquinas aparece
  semCasa?: boolean;
  lama?: { nivel: number; vis?: number }; // água barrenta da cratera do gancho
  ex?: EstadoExtras;
  luzSol?: number;
};

function orbita(cam: THREE.PerspectiveCamera, alvo: THREE.Vector3, c: Cam) {
  const a = THREE.MathUtils.degToRad(c.az), e = THREE.MathUtils.degToRad(Math.min(c.el, 89.8));
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(e) * c.dist, alvo.y + Math.sin(e) * c.dist, alvo.z + Math.cos(a) * Math.cos(e) * c.dist);
  cam.fov = c.fov ?? 30;
  cam.updateProjectionMatrix();
  cam.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
  cam.lookAt(alvo);
  return cam.position.distanceTo(alvo);
}

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  corte: Corte;
  ter: Terreno;
  pis: Piscina;
  cen: Cenario;
  fla: Flamingo;
  gap: THREE.Mesh;
  lamaVol: THREE.Mesh;
  lamaSup: SuperficieAgua;
  torroes: THREE.InstancedMesh;
  ex: Extras;
  torroesDados: { a: number; r0: number; s: number; f: number }[] = [];
  virada?: Virada;
  planoVirada = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1000);
  fundo: THREE.Texture;
  tinta = new THREE.Color(0x0b1026);
  foco = 0.45;
  forca = 1;
  base: { sol: number; hemi: number };
  uAgua = { uCorA: { value: new THREE.Color(0x27c3d8) } };
  uFluxo = { uFluxo: { value: 0 } };

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number) {
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    const k = this.kit, d = dir, sc = this.w.scene;
    k.envReflexo = this.w.envCeu;
    this.corte = new Corte(sc);
    this.corte.planos.push(this.planoVirada);
    const larg = d === "C" ? { x: [-13, 13] as [number, number], z: [-14, 8] as [number, number] } : { x: [-4.6, 4.6] as [number, number], z: [-4.4, 3.2] as [number, number] };
    this.ter = new Terreno(k, larg);
    this.pis = new Piscina(k);
    this.cen = new Cenario(k, larg);
    this.fla = new Flamingo(k);
    // água do terreno que ocupa o vão embaixo da caixa quando ela sobe
    this.gap = new THREE.Mesh(new THREE.BoxGeometry(2 * EXT.x - 0.01, 1, 2 * EXT.z - 0.01).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.gap.position.y = EXT.y - 0.3;
    // cratera do gancho: água barrenta (volume para o corte + superfície) e torrões que escorregam
    this.lamaVol = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1, 4.6).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.lamaVol.position.y = -1.0;
    this.lamaSup = new SuperficieAgua(k, 6.6, 4.6, 1);
    const R = rng(91);
    const nT = 14;
    this.torroes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 1), k.mat({ map: texLama(d), rough: 0.95 }), nT);
    for (let i = 0; i < nT; i++) this.torroesDados.push({ a: 0.75 + (R.r() - 0.5) * 1.3, r0: 1.05 + R.r() * 0.12, s: 0.6 + R.r() * 0.9, f: R.r() });
    this.torroes.castShadow = true;
    k.contorno(this.torroes, 2);
    this.ex = new Extras(k);
    sc.add(this.ter.g, this.pis.g, this.cen.g, this.fla.g, this.gap, this.lamaVol, this.lamaSup.mesh, this.torroes, this.ex.g);

    // ------------------------------------------------ grupos do corte (cada um com a cor da sua tampa)
    const T = (glsl: string, u: Record<string, THREE.IUniform> = {}, op = {}) => matTampa(d, glsl, u, op);
    const B = d === "B";
    const c = this.corte;
    c.grupo("terra", T(glslTerra(d), this.ter.tampaU));
    c.registra(this.ter.g, "terra");
    c.mats.push(this.ter.matTerra);
    c.grupo("concreto", T(`
      vec3 c = vec3(${B ? "0.74,0.75,0.77" : "0.60,0.60,0.58"});
      float pd = pedras(p.xy * 26.0, 0.5);
      c = mix(c * 0.78, c, smoothstep(0.85, 1.0, pd));
      ${B ? "" : "c *= 0.92 + 0.12 * vn2(p.xy * 40.0);"}
      return c;`));
    c.registra(this.pis.concreto, "concreto");
    c.registra(this.pis.pisoTij, "concreto");
    c.grupo("tijolo", T(`
      float fy = fract(p.y / 0.087); float lin = floor(p.y / 0.087);
      float fx = fract((p.x + p.z) / 0.22 + mod(lin, 2.0) * 0.5);
      vec3 tij = vec3(${B ? "0.88,0.44,0.24" : "0.70,0.32,0.18"}) * (0.9 + 0.2 * h21(vec2(lin, floor((p.x + p.z) / 0.22 + mod(lin, 2.0) * 0.5))));
      vec3 arg = vec3(${B ? "0.95,0.84,0.68" : "0.80,0.74,0.64"});
      return (fy < 0.11 || fx < 0.05) ? arg : tij;`));
    c.registra(this.pis.parTij, "tijolo");
    c.registra(this.pis.tijolos, "tijolo");
    c.grupo("reboco", T(`return vec3(${B ? "0.86,0.83,0.78" : "0.74,0.72,0.68"});`), false, 1);
    c.registra(this.pis.rebocoG, "reboco");
    this.pis.rebocoTras.forEach((r) => c.registra(r, "reboco"));
    c.grupo("aco", T(`return vec3(${B ? "0.75,0.35,0.18" : "0.48,0.25,0.15"});`), false, 2);
    c.registra(this.pis.aco, "aco");
    c.grupo("imper", T(`return vec3(${B ? "0.50,0.62,0.74" : "0.42,0.52,0.60"});`));
    c.registra(this.pis.imper, "imper");
    c.grupo("azulejo", T(`return mix(vec3(0.95,0.97,0.97), vec3(${B ? "0.45,0.80,0.93" : "0.42,0.74,0.86"}), step(0.5, fract(p.x * 7.0)));`));
    c.registra(this.pis.azulejo, "azulejo");
    c.grupo("borda", T(`return vec3(${B ? "0.94,0.86,0.69" : "0.82,0.75,0.62"}) * (0.92 + 0.1 * vn2(p.xy * 30.0));`));
    c.registra(this.pis.borda, "borda");
    c.grupo("cano", T(`return vec3(${B ? "0.95,0.95,0.93" : "0.88,0.87,0.84"});`), false, 1);
    c.registra(this.cen.canos, "cano");
    this.pis.ralos.forEach((r) => c.registra(r, "cano"));
    c.registra(this.pis.valvula, "cano");
    c.registra(this.cen.bomba, "cano");
    const fluxo = (sinal: string) => `
      vec3 az = uCorA * ${B ? "0.95" : "0.8"};
      float tr = fract((${sinal}) * 3.2 - uT * 1.6);
      vec3 lar = mix(vec3(1.0,0.42,0.17), vec3(1.0,0.75,0.45), smoothstep(0.55, 0.7, tr) * (1.0 - smoothstep(0.85, 1.0, tr)));
      return mix(az, lar * 1.3, uFluxo);`;
    c.grupo("aguaRalo", T(fluxo("p.x + p.y"), { ...this.uAgua, ...this.uFluxo }), false, 2);
    c.registra(this.cen.aguaRalo, "aguaRalo");
    c.grupo("aguaRet", T(fluxo("-p.x - p.y"), { ...this.uAgua, ...this.uFluxo }), false, 2);
    c.registra(this.cen.aguaRet, "aguaRet");
    c.grupo("casa", T(`return vec3(${B ? "0.82,0.80,0.76" : "0.66,0.64,0.60"}) * (0.95 + 0.08 * vn2(p.xy * 20.0));`));
    c.registra(this.cen.maq, "casa");
    c.registra(this.cen.maqTeto, "casa");
    c.grupo("filtro", T(`
      float y = p.y;
      vec3 areia = vec3(${B ? "0.93,0.80,0.52" : "0.80,0.68,0.45"}) * (0.85 + 0.25 * h21(floor(p.xy * 90.0)));
      vec3 brita = vec3(0.55,0.53,0.5) * (0.7 + 0.5 * step(0.5, h21(floor(p.xy * 30.0))));
      vec3 ag = uCorA * 0.9;
      return y < 0.2 ? brita : y < 0.62 ? areia : ag;`, this.uAgua), false, 1);
    c.registra(this.cen.filtro, "filtro");
    c.grupo("lencol", T(`
      float b = smoothstep(0.75, 0.95, vn2(vec2(p.x * 9.0, p.y * 9.0 - uT * 1.6)));
      return vec3(${B ? "0.24,0.6,0.98" : "0.14,0.44,0.78"}) + b * 0.15;`));
    c.registra(this.gap, "lencol");
    c.grupo("agua", T(`
      float prof = clamp((uNivelA - p.y) / 1.4, 0.0, 1.0);
      vec3 c = uCorA * mix(1.05, 0.62, prof);
      float b = smoothstep(0.8, 0.97, vn2(vec2(p.x * 7.0 + uT * 0.3, p.y * 7.0 - uT * 0.9)));
      c += b * 0.08;
      c = mix(c, vec3(0.9, 0.98, 1.0), (1.0 - smoothstep(0.0, 0.018, abs(p.y - uNivelA))) * 0.8);
      return c;`, { ...this.uAgua, uNivelA: { value: -0.12 } }, { opacidade: B ? 0.6 : d === "A" ? 0.55 : 0.5 }), true);
    c.registra(this.pis.vol, "agua");
    c.grupo("lama", T(`
      float prof = clamp((uNivelL - p.y) / 1.0, 0.0, 1.0);
      vec3 c = vec3(${B ? "0.55,0.37,0.2" : "0.42,0.28,0.16"}) * mix(1.0, 0.55, prof);
      c += smoothstep(0.8, 0.97, vn2(vec2(p.x * 8.0, p.y * 8.0 - uT * 0.5))) * 0.06;
      return c;`, { uNivelL: { value: -0.3 } }, { opacidade: 0.93 }), true, -1);
    c.registra(this.lamaVol, "lama");
    c.recorta(this.lamaSup.mesh);
    c.registra(this.ex.calcada, "borda");
    for (const o of [this.ex.folhas, this.ex.pastilhas, this.ex.cheiro, this.ex.chuva, this.ex.banhista, this.ex.cerca, this.ex.luzes, this.ex.respingo.pts, this.ex.onda]) c.recorta(o);
    c.recorta(this.torroes);
    // só recortados (sem tampa): peças finas, superfícies, árvores, boia, casa
    for (const o of [this.pis.coadeira, this.pis.retornos, this.pis.sup.mesh, this.pis.vazio, this.pis.risco, this.cen.arvores, this.cen.casa, this.fla.g, ...this.pis.jatos.map((j) => j.pts), this.pis.jatoValv.pts, this.pis.jatoRacha.pts])
      c.recorta(o);
    if (d === "A") {
      // a tábua é cortada com tampa de madeira; a mesa (mundo real) não
      c.grupo("tabua", T(`return vec3(0.55,0.36,0.22) * (0.85 + 0.2 * vn2(vec2(p.x * 2.0, p.y * 60.0)));`));
      c.registra(this.cen.base.children[0], "tabua");
    } else c.recorta(this.cen.base);
    c.set(null);

    this.fundo = texCeuP(d);
    sc.background = this.fundo;
    this.base = { sol: this.w.sol.intensity, hemi: this.w.hemi.intensity };
  }

  sol(alvo: THREE.Vector3, intens = 1) {
    const { sol } = this.w;
    sol.position.copy(alvo).addScaledVector(this.w.solDir.clone().normalize(), 14);
    sol.target.position.copy(alvo);
    sol.target.updateMatrixWorld();
    sol.intensity = this.base.sol * intens;
  }

  aplica(e: Estado) {
    const t = e.t;
    const cam = this.w.camera;
    const sc = this.w.scene;
    sc.background = this.fundo;
    this.w.final.uniforms.escuro.value = e.escuro ?? 0;
    this.w.hemi.intensity = this.base.hemi;
    this.ter.aplica(e.ter ?? { modo: "obra" });
    this.pis.aplica(e.pis ?? {}, t);
    this.fla.aplica(e.fla ?? { vis: false });
    // lama do gancho
    const lm = e.lama;
    const vl = !!lm && (lm.vis ?? 1) > 0.001;
    this.lamaVol.visible = this.lamaSup.mesh.visible = vl;
    if (lm) {
      this.lamaVol.scale.y = Math.max(0.01, lm.nivel + 1.0);
      this.lamaSup.mesh.position.y = lm.nivel;
      this.lamaSup.aplica(t, { lama: 1 });
      const ul = this.corte.mats.find((m) => m.userData.u?.uNivelL);
      if (ul) ul.userData.u.uNivelL.value = lm.nivel;
    }
    const col = e.ter?.modo === "buraco" ? e.ter.colapso ?? 0 : 0;
    this.torroes.visible = vl && col > 0.01;
    if (this.torroes.visible) {
      const o = new THREE.Object3D();
      this.torroesDados.forEach((q, i) => {
        const k = Math.max(0, Math.min(1, col * 1.6 - q.f * 0.6));
        const r = q.r0 * (1 - 0.32 * k * k);
        const rx = 2.6 * r, rz = 1.65 * r;
        o.position.set(Math.cos(q.a) * rx, 0.04 - k * k * (0.04 - lm!.nivel + 0.06) , Math.sin(q.a) * rz);
        o.rotation.set(q.f * 6 + k * 3, q.a, k * 2);
        o.scale.setScalar(q.s * (k > 0.98 ? 0.7 : 1));
        o.updateMatrix();
        this.torroes.setMatrixAt(i, o.matrix);
      });
      this.torroes.instanceMatrix.needsUpdate = true;
    }
    this.ex.aplica(e.ex ?? {}, t, this.pis.sup.mesh.position.y);
    const gp = e.lencolGap ?? 0;
    this.gap.visible = gp > 0.01;
    this.gap.scale.y = Math.max(0.01, gp + 0.3);
    this.uFluxo.uFluxo.value = e.fluxo ?? 0;
    this.uAgua.uCorA.value.copy(this.pis.sup.u.uCor.value);
    const ua = this.corte.mats.find((m) => m.userData.u?.uNivelA);
    if (ua) ua.userData.u.uNivelA.value = this.pis.sup.mesh.position.y;
    this.cen.casa.visible = !e.semCasa;
    const mq = e.maq ?? 1;
    for (const o of [this.cen.maq, this.cen.maqTeto, this.cen.filtro, this.cen.bomba, this.cen.canos, this.cen.aguaRalo, this.cen.aguaRet]) o.visible = mq > 0.001;
    this.cen.maqTeto.visible = mq > 0.001 && e.corte == null;
    this.corte.set(e.corte ?? null);
    this.corte.tempo(t);

    // câmera
    const alvo = new THREE.Vector3(...(e.cam.alvo ?? [0, -0.4, 0]));
    const dist = orbita(cam, alvo, e.cam);
    // A: foco = altura da faixa nítida (0..1 da tela); C: distância de foco (focoC) ou a do alvo
    this.foco = this.dir === "A" ? (e.cam.foco ?? 0.45) : (e.cam.focoC ?? dist);
    this.forca = this.dir === "A" ? 1 : (e.cam.abertC ?? 7);
    this.sol(new THREE.Vector3(alvo.x, 0, alvo.z), e.luzSol ?? 1);

    // virada: congela em arame laranja + partículas
    const v = e.virada;
    if (this.virada) this.virada.g.visible = false;
    this.planoVirada.constant = 1000;
    this.planoVirada.normal.set(1, 0, 0);
    if (v && v.k > 0.001) {
      if (!this.virada) {
        sc.updateMatrixWorld(true);
        this.virada = new Virada([this.pis.caixa, this.cen.casa, this.cen.maq, this.cen.maqTeto, this.fla.g, this.cen.arvores], new THREE.Vector3(0, 0.3, -0.5), this.kit.W, this.kit.H);
        sc.add(this.virada.g);
      }
      this.virada.g.visible = true;
      this.virada.aplica(v.k, v.k2, t);
      this.planoVirada.normal.copy(this.virada.planoSolido.normal);
      this.planoVirada.constant = this.virada.planoSolido.constant;
      sc.background = this.tinta;
      this.w.hemi.intensity = this.base.hemi * (1 - 0.4 * Math.min(1, v.k * 2));
    }
    // fundo de motion: desfoca tudo
    const kd = e.desf ?? 0;
    if (kd > 0) {
      if (this.dir === "A") this.forca = THREE.MathUtils.lerp(this.forca, 3, kd);
      else {
        this.foco = THREE.MathUtils.lerp(this.foco, 0.25, kd);
        this.forca = THREE.MathUtils.lerp(this.forca, 8, kd);
      }
    }
  }

  render(t: number) {
    this.w.quadro(t, this.foco, this.forca);
  }
}
