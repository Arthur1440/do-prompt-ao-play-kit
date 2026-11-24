// Orquestra a obra: casa, laje, concreto, churrasqueira, pedreiro (+ família), ferramentas, corte em fatia e virada.
// Tudo é função pura de Estado: o render pode pular e repetir quadros sem herdar nada do anterior.
import * as THREE from "three";
import { Kit, Dir, montaMundo, V3 } from "./kit";
import { Corte, matTampa } from "./corte";
import { Casa, HP, IX, IZ, E } from "./casa";
import { Laje, EstadoLaje } from "./laje";
import { Concreto, EstadoJato, EstadoMonte, EstadoBola, EstadoRespingo } from "./concreto";
import { Churrasqueira, EstadoChurras, Balde, martelo, carteira, vibrador } from "./props";
import { Boneco, Pose } from "./boneco";
import { Virada } from "./virada";
import { texCeu } from "./tex";
import { Extras, EstadoExtras } from "./extras";

/** câmera em órbita em volta de `alvo`: az (graus, 0 = de frente, + à direita), el (graus), dist */
export type Cam = { az: number; el: number; dist: number; fov?: number; alvo?: V3; foco?: number; rolo?: number };

export type Ferramenta = "balde" | "martelo" | "carteira" | "vibrador" | "escora" | "tabua" | "vigota" | "mangueira" | null;
export type EstadoPed = Pose & { item?: Ferramenta; itemMao?: "E" | "D"; balde?: { vira: number; cheio?: number } };

export type Estado = {
  t: number;
  cam: Cam;
  corte?: number | null; // posição do corte em fatia
  corteEixo?: "z" | "x"; // z (padrão): some a frente; x: some o lado direito
  casa?: { racha?: number; frente?: boolean; escada?: boolean };
  laje?: EstadoLaje;
  conc?: { jatos?: EstadoJato[]; montes?: EstadoMonte[]; bolas?: EstadoBola[]; respingos?: EstadoRespingo };
  ch?: EstadoChurras;
  ped?: EstadoPed;
  fam?: Pose[];
  virada?: { k: number; k2: number };
  escuro?: number;
  luzSol?: number;
  agua?: { vis?: boolean; p0: V3; p1: V3; k: number }; // jato da mangueira (p0[0] = NaN: sai do bico)
  ex?: EstadoExtras;
  afunda?: number; // 0..1 paredes afundando no chão (laje pesada demais)
  quente?: number; // 0..1 sol forte da cura (tom quente no pós)
  rebobina?: boolean; // ícone de rebobinar (2D)
  preenche?: number; // luz de preenchimento de baixo (vista da laje por baixo)
  forca?: number; // 0..1 barra de força do concreto (2D)
};

function orbita(cam: THREE.PerspectiveCamera, alvo: THREE.Vector3, c: Cam) {
  const a = THREE.MathUtils.degToRad(c.az), e = THREE.MathUtils.degToRad(Math.max(-89.8, Math.min(c.el, 89.8)));
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(e) * c.dist, alvo.y + Math.sin(e) * c.dist, alvo.z + Math.cos(a) * Math.cos(e) * c.dist);
  cam.fov = c.fov ?? 30;
  cam.updateProjectionMatrix();
  cam.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
  cam.lookAt(alvo);
}

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  corte: Corte;
  casa: Casa;
  laje: Laje;
  conc: Concreto;
  ch: Churrasqueira;
  ped: Boneco;
  fam: Boneco[] = [];
  balde: Balde;
  itens: Record<string, THREE.Object3D> = {};
  virada?: Virada;
  planoVirada = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1000);
  fundo: THREE.Texture | THREE.Color;
  tinta = new THREE.Color(0x0b1026);
  foco = 0.45;
  base: { sol: number; hemi: number };
  agua: THREE.Points;
  ex: Extras;

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number) {
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    const k = this.kit, sc = this.w.scene, d = dir, B = d === "B";
    this.corte = new Corte(sc);
    this.corte.planos.push(this.planoVirada);
    this.casa = new Casa(k);
    this.laje = new Laje(k);
    this.conc = new Concreto(k);
    this.ch = new Churrasqueira(k);
    this.ped = new Boneco(k, "pedreiro");
    this.fam = [new Boneco(k, "mulher"), new Boneco(k, "menino")];
    this.balde = new Balde(k, B ? "#3C3F45" : "#2F3237");
    this.balde.g.scale.setScalar(1.35);
    this.itens.martelo = martelo(k);
    this.itens.carteira = carteira(k);
    this.itens.vibrador = vibrador(k);
    sc.add(this.casa.g, this.laje.g, this.conc.g, this.ch.g, this.ped.raiz, this.balde.g, ...this.fam.map((f) => f.raiz), ...Object.values(this.itens));
    // água da mangueira (gotas)
    const n = 220;
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.agua = new THREE.Points(gp, new THREE.PointsMaterial({ color: B ? 0x8fd6ff : 0xbfe6ff, size: 9, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false }));
    this.agua.frustumCulled = false;
    sc.add(this.agua);
    this.ex = new Extras(k);
    sc.add(this.ex.g);

    // ------------------------------------------------ corte em fatia: grupos com tampa
    const T = (glsl: string, u: Record<string, THREE.IUniform> = {}, op = {}) => matTampa(d, glsl, u, op);
    const c = this.corte;
    c.grupo("tijolo", T(`
      float fy = fract(p.y / 0.1); float lin = floor(p.y / 0.1);
      float fx = fract((p.x + p.z) / 0.2 + mod(lin, 2.0) * 0.5);
      vec3 tij = vec3(${B ? "0.87,0.46,0.28" : "0.72,0.36,0.2"}) * (0.92 + 0.16 * h21(vec2(lin, floor((p.x + p.z) / 0.2 + mod(lin, 2.0) * 0.5))));
      vec3 arg = vec3(${B ? "0.94,0.85,0.70" : "0.82,0.76,0.65"});
      // furos do tijolo baiano no corte
      vec2 q = vec2(fract((p.x + p.z) / 0.05), fract(p.y / 0.05));
      float furo = step(0.25, q.x) * step(q.x, 0.75) * step(0.25, q.y) * step(q.y, 0.75) * step(0.18, fy) * step(fy, 0.9);
      vec3 c = (fy < 0.12 || fx < 0.05) ? arg : mix(tij, tij * 0.35, furo * 0.8);
      return c;`));
    c.registra(this.casa.paredes, "tijolo");
    c.grupo("concreto", T(`
      vec3 c = vec3(${B ? "0.76,0.75,0.72" : "0.62,0.61,0.58"});
      float pd = pedras(p.xy * 30.0, 0.55);
      c = mix(c * 0.72, c, smoothstep(0.85, 1.0, pd));
      ${B ? "" : "c *= 0.93 + 0.1 * vn2(p.xy * 50.0);"}
      return c;`));
    c.registra(this.laje.macica, "concreto");
    for (const v of this.laje.vigotas) c.registra(v, "concreto");
    c.registra(this.laje.capa, "concreto");
    for (const ci of this.laje.cinta) c.registra(ci, "concreto");
    c.registra(this.laje.mureta, "concreto");
    c.grupo("mole", T(`vec3 c = vec3(${B ? "0.64,0.63,0.60" : "0.52,0.51,0.49"}); c *= 0.94 + 0.08 * vn2(p.xy * 18.0); return c;`));
    for (const cf of this.laje.concForma) c.registra(cf.g, "mole");
    for (const b of this.conc.bolas) c.registra(b, "mole");
    for (const m of this.conc.montes) c.registra(m, "mole");
    c.grupo("aco", T(`return vec3(${B ? "0.72,0.34,0.18" : "0.5,0.26,0.15"});`), false, 2);
    c.registra(this.laje.aco, "aco");
    c.grupo("ar", T(`return vec3(0.12,0.13,0.16);`), false, 3);
    for (const b of this.laje.bolhas) c.registra(b, "ar");
    c.grupo("eps", T(`return vec3(0.97,0.97,0.95) * (0.94 + 0.08 * h21(floor(p.xy * 90.0)));`), false, 1);
    for (const b of this.laje.blocos) c.registra(b, "eps");
    c.grupo("madeira", T(`return vec3(${B ? "0.85,0.62,0.38" : "0.66,0.46,0.28"}) * (0.9 + 0.12 * vn2(vec2(p.x * 3.0, p.y * 90.0)));`), false, 1);
    for (const tb of this.laje.tabuas) c.registra(tb.g, "madeira");
    for (const es of this.laje.escoras) c.registra(es, "madeira");
    for (const gu of this.laje.guias) c.registra(gu, "madeira");
    // só recortados (sem tampa)
    for (const o of [this.ex.cal, this.ex.escada, this.ex.chuva, this.ex.setasCinta, this.ex.migalhas, this.casa.cenario, this.conc.jatos[0].me, this.conc.jatos[1].me, this.conc.respingos, this.laje.seca, this.laje.ralo, this.agua]) c.recorta(o);
    // a escada, as setas e a trinca ficam fora do corte (na frente da tampa); só a virada as recorta
    for (const o of [this.casa.escada, this.laje.setas, this.laje.trinca]) o.traverse((m) => { const me = m as THREE.Mesh; if (me.material) for (const mm of Array.isArray(me.material) ? me.material : [me.material]) { mm.clippingPlanes = [this.planoVirada]; if ((mm as THREE.ShaderMaterial).isShaderMaterial) (mm as THREE.ShaderMaterial).clipping = true; } });
    for (const r of this.casa.rachas) (r.material as THREE.Material).clippingPlanes = [this.casa.planoRacha, ...c.planos];
    c.recorta(this.casa.piso);
    // o chão do canteiro (e a mesa da maquete) somem na varredura da virada
    this.casa.g.children.forEach((o) => { if (o === this.casa.chao || (o as THREE.Mesh).isMesh && !(o as THREE.Mesh).userData.contorno && o !== this.casa.piso) { const me = o as THREE.Mesh; if (me.material && !(me.material as THREE.Material).clippingPlanes) (me.material as THREE.Material).clippingPlanes = [this.planoVirada]; } });
    c.set(null);
    // personagens, churrasqueira e ferramentas: só a varredura da virada (o corte não pode cortar o pedreiro)
    for (const o of [this.ped.raiz, this.ch.g, this.balde.g, ...this.fam.map((f) => f.raiz), ...Object.values(this.itens), this.ex.escora, this.ex.vigota, this.ex.mangueira])
      o.traverse((m) => { const me = m as THREE.Mesh; if (me.material) for (const mm of Array.isArray(me.material) ? me.material : [me.material]) { mm.clippingPlanes = [this.planoVirada]; if ((mm as THREE.ShaderMaterial).isShaderMaterial) (mm as THREE.ShaderMaterial).clipping = true; } });

    this.fundo = texCeu(d);
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

  /** prende um objeto à mão do boneco (posição de mundo + rotação do corpo + extra) */
  naMao(b: Boneco, lado: "E" | "D", o: THREE.Object3D, off: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) {
    b.raiz.updateMatrixWorld(true);
    const m = lado === "E" ? b.maoE : b.maoD;
    const p = m.getWorldPosition(new THREE.Vector3());
    const q = b.raiz.getWorldQuaternion(new THREE.Quaternion());
    o.position.copy(p).add(new THREE.Vector3(...off).applyQuaternion(q));
    o.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)));
    o.visible = true;
  }

  /** boca do balde em coordenadas de mundo (para o jato nascer dali) */
  bocaBalde() {
    this.balde.g.updateMatrixWorld(true);
    return new THREE.Vector3(0, 0.17, 0.12).applyMatrix4(this.balde.g.matrixWorld);
  }

  aplica(e: Estado) {
    const t = e.t;
    const cam = this.w.camera;
    const sc = this.w.scene;
    sc.background = this.fundo;
    this.w.final.uniforms.escuro.value = e.escuro ?? 0;
    this.w.hemi.intensity = this.base.hemi * (1 + 1.2 * (e.preenche ?? 0));
    this.w.hemi.groundColor.set(e.preenche ? 0xffffff : this.dir === "A" ? 0x8a4a2a : this.dir === "B" ? 0x9a8a78 : 0xc9b29c);
    this.casa.aplica(e.casa ?? {});
    this.laje.aplica(e.laje ?? {}, t);
    this.ch.aplica(e.ch ?? { vis: false }, t);
    // pedreiro e ferramenta
    const pe = e.ped;
    if (pe) this.ped.aplica(pe, t); else this.ped.raiz.visible = false;
    this.balde.g.visible = false;
    for (const it of Object.values(this.itens)) it.visible = false;
    for (const it of [this.ex.escora, this.ex.vigota, this.ex.mangueira]) it.visible = false;
    if (pe && pe.vis !== false && pe.item) {
      const lado = pe.itemMao ?? "D";
      if (pe.item === "balde") {
        // balde nas duas mãos, à frente do peito; "vira" inclina a boca para a frente (despeja)
        const v = pe.balde?.vira ?? 0;
        this.naMao(this.ped, lado, this.balde.g, [0.09, -0.06, 0.07], [v * 1.9, 0, 0]);
        this.balde.massa.visible = (pe.balde?.cheio ?? 1) > 0.05;
        this.balde.massa.scale.y = 1;
      } else if (pe.item === "martelo") this.naMao(this.ped, lado, this.itens.martelo, [0, -0.02, 0.05], [Math.PI / 2, 0, 0]);
      else if (pe.item === "carteira") this.naMao(this.ped, lado, this.itens.carteira, [0, 0.02, 0.07], [-0.3, 0, 0]);
      else if (pe.item === "vibrador") this.naMao(this.ped, lado, this.itens.vibrador, [0, -0.02, 0.06], [0, 0, 0]);
      else if (pe.item === "escora") this.naMao(this.ped, lado, this.ex.escora, [0, 0, 0.06], [0.25, 0, 0]);
      else if (pe.item === "vigota") this.naMao(this.ped, lado, this.ex.vigota, [-0.1, 0.12, -0.02], [0, Math.PI / 2, 0]);
      else if (pe.item === "mangueira") this.naMao(this.ped, lado, this.ex.mangueira, [0, 0, 0.04], [-0.35, 0, 0]);
    }
    // família
    const fm = e.fam ?? [];
    this.fam.forEach((f, i) => { if (fm[i]) f.aplica(fm[i], t); else f.raiz.visible = false; });
    // concreto: jatos podem nascer da boca do balde (p0 = [NaN,..] => boca)
    const co = e.conc ?? {};
    if (co.jatos) for (const j of co.jatos) if (Number.isNaN(j.p0[0])) { const b = this.bocaBalde(); j.p0 = [b.x, b.y, b.z]; }
    this.conc.aplica(co, t);
    // água da mangueira
    const ag = e.agua;
    if (ag && Number.isNaN(ag.p0[0])) { this.ex.mangueira.updateMatrixWorld(true); const b = new THREE.Vector3(0, 0, 0.14).applyMatrix4(this.ex.mangueira.matrixWorld); ag.p0 = [b.x, b.y, b.z]; }
    this.agua.visible = !!ag && ag.vis !== false && ag.k > 0.001;
    if (ag && this.agua.visible) {
      const pos = this.agua.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const u = ((i / pos.count) + t * 1.7) % 1;
        const sp = Math.sin(i * 12.9898) * 0.5;
        const x = ag.p0[0] + (ag.p1[0] - ag.p0[0]) * u + sp * 0.06 * u;
        const z = ag.p0[2] + (ag.p1[2] - ag.p0[2]) * u + Math.cos(i * 7.3) * 0.06 * u;
        const y = ag.p0[1] + (ag.p1[1] - ag.p0[1]) * u + Math.sin(u * Math.PI) * 0.25;
        pos.setXYZ(i, x, u < ag.k ? y : -50, z);
      }
      pos.needsUpdate = true;
    }

    const af = e.afunda ?? 0;
    this.casa.paredes.position.y = -af * 0.22;
    this.laje.g.position.y = -af * 0.22;
    this.w.final.uniforms.quente.value = (this.dir === "A" ? 0.045 : this.dir === "C" ? 0.01 : 0) + (e.quente ?? 0) * 0.07;
    this.corte.set(e.corte ?? null, e.corteEixo ?? "z");
    this.corte.tempo(t);
    // câmera
    const alvo = new THREE.Vector3(...(e.cam.alvo ?? [0, 0.8, 0]));
    orbita(cam, alvo, e.cam);
    cam.updateMatrixWorld();
    this.ex.aplica(e.ex ?? {}, t, cam);
    this.foco = e.cam.foco ?? 0.45;
    this.sol(new THREE.Vector3(alvo.x * 0.5, 0, alvo.z * 0.5), e.luzSol ?? 1);

    // virada: congela em arame laranja + partículas
    const v = e.virada;
    if (this.virada) this.virada.g.visible = false;
    this.planoVirada.constant = 1000;
    this.planoVirada.normal.set(1, 0, 0);
    if (v && v.k > 0.001) {
      if (!this.virada) {
        sc.updateMatrixWorld(true);
        this.virada = new Virada([this.casa.paredes, this.laje.g, this.ch.g, this.ped.raiz, ...this.fam.map((f) => f.raiz)], new THREE.Vector3(0, HP, 0), this.kit.W, this.kit.H);
        sc.add(this.virada.g);
      }
      this.virada.g.visible = true;
      this.virada.aplica(v.k, v.k2, t);
      this.planoVirada.normal.copy(this.virada.planoSolido.normal);
      this.planoVirada.constant = this.virada.planoSolido.constant;
      sc.background = this.tinta;
      this.w.hemi.intensity = this.base.hemi * (1 - 0.4 * Math.min(1, v.k * 2));
    }
  }

  render(t: number) {
    this.w.quadro(t, this.foco, this.dir === "A" ? 0.35 : 0);
  }
}

export const _u = { IX, IZ, E };
