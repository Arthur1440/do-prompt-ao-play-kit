// Orquestra a cena: casa + cachorro + dono (deitado sob o cobertor) + luzes da noite/laboratório + virada.
// Tudo é função pura do Estado: o render pode pular e repetir quadros.
import * as THREE from "three";
import { Kit, Dir, montaMundo, V3 } from "./kit";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Cachorro, Dono, PoseDog, Arq } from "./modelos";
import { Casa, JANELA_Q, JANELA_S } from "./casa";
import { Virada } from "./virada";

export type { V3 };
export type Cam = { pos: V3; alvo: V3; fov?: number; rolo?: number; foco?: number; forca?: number; larg?: number; rel?: "cabeca"; livre?: boolean };
export type EstDog = { pos: V3; rotY?: number; pose: PoseDog; esc?: [number, number] };
export type Estado = {
  t: number;
  cam: Cam;
  cena?: "noite" | "lab" | "frio";
  dog?: EstDog | null;
  dono?: { modo?: "deitado" | "parado"; t: number; pe?: number; braco?: number } | null;
  luz?: { lua?: number; abajur?: number; abajurPos?: V3; hemi?: number; dia?: number; decai?: number };
  relogio?: string;
  monitor?: { t: number; profundo: number };
  ventilador?: number; // ângulo das pás
  bola?: V3 | null;
  eletrodos?: boolean;
  escuro?: number; // escurece o quadro (pós)
  frio?: number; quente?: number;
  virada?: { k: number; k2: number; t?: number };
  semTeto?: boolean;
};

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  casa: Casa;
  dog: Cachorro;
  dono: Dono;
  cobertor: THREE.Mesh;
  eletrodos = new THREE.Group();
  virada?: Virada;
  planoVirada = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e5);
  tinta = new THREE.Color(0x0b1026);
  foco = 0.45; forca = 0.85; larg = 1;
  base: { lua: number; hemi: number; abajur: number; contra: number };
  donoPos = new THREE.Vector3();
  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number, gl: Record<Arq, GLTF>) {
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    const k = this.kit, sc = this.w.scene;
    this.casa = new Casa(k, gl);
    sc.add(this.casa.g);
    this.dog = new Cachorro(k, gl["shiba.glb"]);
    sc.add(this.dog.raiz);
    this.dono = new Dono(k, gl["homem.glb"]);
    sc.add(this.dono.raiz);
    // o dono deitado de barriga para cima, cabeça no travesseiro (cabeceira em z ~ 0), na metade direita da cama
    this.dono.faz({ modo: "deitado", t: 0 });
    this.dono.raiz.rotation.y = Math.PI / 2;
    this.dono.raiz.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(this.dono.raiz, true);
    const c = this.casa;
    const xm = (c.camaX[0] + c.camaX[1]) / 2;
    this.dono.raiz.position.set(xm - 0.36 - (bb.min.x + bb.max.x) / 2, c.camaTopo - 0.05 - bb.min.y, c.camaZ[0] + 0.12 - bb.min.z);
    this.dono.raiz.updateMatrixWorld(true);
    this.donoPos.copy(this.dono.raiz.position);
    this.cobertor = this.fazCobertor();
    sc.add(this.cobertor);
    // eletrodos (adesivos coloridos + fios macios) presos à cabeça do cachorro
    this.dog.pose("Idle", 0);
    this.dog.raiz.updateMatrixWorld(true);
    const cab = new THREE.Vector3();
    this.dog.ossos.get("Head")!.getWorldPosition(cab);
    this.dog.prende("Head", this.eletrodos, cab, new THREE.Quaternion());
    const cores = [0x3fa9f5, 0xffd23f, 0xff6b8a, 0x5ff2c8];
    const pts: V3[] = [[0.02, 0.085, 0.03], [0.02, 0.085, -0.03], [-0.03, 0.075, 0.045], [-0.03, 0.075, -0.045]];
    pts.forEach((p, i) => {
      k.m(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 20), k.mat({ color: cores[i], rough: 0.4, clear: 0.6, semOndula: true }), 1.4, this.eletrodos, p, [0, 0, 0]);
      const fio = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(...p), new THREE.Vector3(p[0] - 0.12, p[1] + 0.06, p[2] * 1.5), new THREE.Vector3(p[0] - 0.3, p[1] + 0.02, p[2] * 2.2), new THREE.Vector3(-0.55, -0.1, p[2] * 2.6)]), 24, 0.0035, 6);
      k.m(fio, k.mat({ color: cores[i], rough: 0.5, semOndula: true }), 1.0, this.eletrodos);
    });
    this.eletrodos.visible = false;
    // corte da virada em todos os materiais
    sc.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.material || o === this.casa.ceu) return;
      for (const mm of Array.isArray(me.material) ? me.material : [me.material]) if (!mm.clippingPlanes || mm.clippingPlanes.length === 0) mm.clippingPlanes = [this.planoVirada];
    });
    this.base = { lua: this.w.lua.intensity, hemi: this.w.hemi.intensity, abajur: this.w.abajur.intensity, contra: this.w.contra.intensity };
  }

  /** cobertor que cobre o dono dos ombros aos tornozelos: altura = corpo + folga, borrada, caindo pelas bordas */
  fazCobertor() {
    const c = this.casa;
    const [x0, x1] = c.camaX, [z0, z1] = c.camaZ;
    const ov = 0.28;
    const NX = 56, NZ = 70;
    const zIni = this.donoPos.z + 0.0; // calculado abaixo pelos ombros
    const verts = this.dono.vertices("Shirt").concat(this.dono.vertices("Pants"), this.dono.vertices("Skin"), this.dono.vertices("Socks"));
    // ombros: o vértice de camisa mais perto da cabeceira + um pouco
    let zOmbro = 1e9, xc = 0, nC = 0;
    for (const v of this.dono.vertices("Shirt")) { zOmbro = Math.min(zOmbro, v.z); xc += v.x; nC++; }
    xc /= Math.max(1, nC);
    void zIni;
    const zA = zOmbro + 0.16, zB = z1 + ov;
    const xA = x0 - ov, xB = x1 + ov;
    const H = new Float32Array((NX + 1) * (NZ + 1)).fill(c.camaTopo + 0.03);
    const ix = (x: number) => Math.round(((x - xA) / (xB - xA)) * NX), iz = (z: number) => Math.round(((z - zA) / (zB - zA)) * NZ);
    for (const v of verts) {
      if (Math.abs(v.x - xc) > 0.27) continue; // braços abertos ficam por cima do cobertor
      const i = ix(v.x), j = iz(v.z);
      if (i < 0 || i > NX || j < 0 || j > NZ) continue;
      const id = j * (NX + 1) + i;
      H[id] = Math.max(H[id], v.y + 0.045);
    }
    // dilata e borra (pano macio)
    const tmp = new Float32Array(H.length);
    for (let it = 0; it < 6; it++) {
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
        let s = 0, n = 0, m = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const a = i + di, b = j + dj;
          if (a < 0 || a > NX || b < 0 || b > NZ) continue;
          const h = H[b * (NX + 1) + a]; s += h; n++; m = Math.max(m, h);
        }
        tmp[j * (NX + 1) + i] = it < 2 ? m : s / n;
      }
      H.set(tmp);
    }
    const g = new THREE.PlaneGeometry(1, 1, NX, NZ);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const id = j * (NX + 1) + i;
      const x = xA + (i / NX) * (xB - xA), z = zA + (j / NZ) * (zB - zA);
      let y = H[id];
      // cai pelas bordas do colchão (dobra macia)
      const dx = Math.max(0, x0 - x, x - x1), dz = Math.max(0, z - z1);
      const dd = Math.max(dx, dz);
      if (dd > 0) y = c.camaTopo + 0.03 - Math.pow(dd / ov, 1.3) * 0.34 + Math.sin((x + z) * 30) * 0.008 * (dd / ov);
      // barra dobrada perto dos ombros
      const dzA = z - zA;
      if (dzA < 0.12) y += 0.02 * (1 - dzA / 0.12);
      p.setXYZ(id, x, y, z);
    }
    g.computeVertexNormals();
    const d = this.kit.dir;
    const mat = this.kit.mat({ color: c.pal.cob, rough: 0.9, relevo: 1.6, bolinhas: c.pal.cobB, lado: THREE.DoubleSide, semOndula: d !== "C" });
    const me = this.kit.m(g, mat, 2.4);
    return me;
  }

  aplicaDog(e: EstDog | null | undefined) {
    const b = this.dog;
    if (!e) { b.raiz.visible = false; return; }
    b.raiz.visible = true;
    b.raiz.position.set(...e.pos);
    b.raiz.rotation.set(0, e.rotY ?? 0, 0);
    // C: personagens a 12 fps (stop motion)
    const p = this.dir === "C" ? { ...e.pose, t: Math.floor(e.pose.t * 12) / 12 } : e.pose;
    b.faz(p);
    const s = this.dir === "A" && e.esc ? e.esc : [0, 0];
    b.raiz.scale.set(1 + s[0], 1 + s[1], 1 + s[0] * 0.5);
  }

  aplica(e: Estado) {
    const t = e.t, sc = this.w.scene, c = this.casa;
    sc.background = null;
    const cena = e.cena ?? "noite";
    const L = e.luz ?? {};
    this.w.lua.intensity = this.base.lua * (L.lua ?? (cena === "noite" ? 1 : cena === "frio" ? 1.1 : 0));
    this.w.abajur.intensity = this.base.abajur * (L.abajur ?? (cena === "noite" ? 1 : 0));
    this.w.hemi.intensity = this.base.hemi * (L.hemi ?? (cena === "lab" ? (this.dir === "B" ? 1.05 : 2.2) : 1));
    this.w.dia.intensity = L.dia ?? (cena === "lab" ? (this.dir === "B" ? 0.95 : 2.4) : 0);
    this.w.contra.intensity = this.base.contra * (cena === "lab" ? 0.4 : 1);
    this.w.hemi.color.set(cena === "lab" ? 0xf3fbff : this.dir === "A" ? 0x6c6fd0 : this.dir === "B" ? 0x5b6cb8 : 0x9b95d8);
    this.w.hemi.groundColor.set(cena === "lab" ? 0xbfe8dc : this.dir === "A" ? 0x3a2440 : this.dir === "B" ? 0x3a2a24 : 0x6a5060);
    this.w.lua.color.set(cena === "frio" ? 0x7fa6ff : this.dir === "A" ? 0x8f8cff : this.dir === "B" ? 0x7f9cff : 0xa9a4f0);
    const ap = L.abajurPos ? new THREE.Vector3(...L.abajurPos) : c.abajurPos;
    this.w.abajur.position.copy(ap);
    this.w.abajur.decay = L.decai ?? 2;
    // lua: entra pela janela do quarto (de -X, alta) ou pela da sala; na maquete vem de cima
    // na sala a lua entra pela janela do fundo (de -Z); no quarto, pela janela da esquerda (de -X)
    const naSala = e.cam.alvo[0] > 4.3 && e.cam.alvo[0] < 11;
    const lx = this.dir === "B" ? new THREE.Vector3(-2.5, 9, 4.5) : naSala ? new THREE.Vector3(-1.2, 4.5, -6) : new THREE.Vector3(-6, 4.2, 2.6);
    const alvoLua = cena === "lab" ? new THREE.Vector3(22, 0, 1.5) : cena === "frio" ? new THREE.Vector3(31, 0, 1.2) : new THREE.Vector3(e.cam.alvo[0], 0, Math.min(2.4, e.cam.alvo[2]));
    this.w.lua.position.copy(alvoLua).add(cena === "frio" ? new THREE.Vector3(4, 6, 6) : lx);
    this.w.lua.target.position.copy(alvoLua);
    this.w.lua.target.updateMatrixWorld();
    this.w.dia.position.set(25, 8, 7);
    this.w.dia.target.position.set(22, 0, 1.2);
    this.w.dia.target.updateMatrixWorld();
    // lua e céu: a lua aparece pela janela que a câmera enxerga
    const olhaSala = e.cam.alvo[0] > 4.2 && e.cam.alvo[0] < 11;
    if (olhaSala) c.luaDisco.position.set(JANELA_S.x + 1.2, 3.6, -9); else c.luaDisco.position.set(-9, 3.4, JANELA_Q.z - 1.2);
    c.luaDisco.lookAt(e.cam.pos[0], e.cam.pos[1], e.cam.pos[2]);
    c.luaDisco.scale.setScalar(0.75);
    c.luaDisco.visible = this.dir !== "B" && cena === "noite";
    c.ceu.visible = this.dir !== "B";
    (c.ceu.material as THREE.ShaderMaterial).uniforms.k.value = cena === "lab" ? 2.5 : 1;
    // janelas quentes da maquete (luz acesa por dentro)
    for (const v of c.janelasLuz) (v.material as THREE.MeshBasicMaterial).color.set((L.abajur ?? 1) > 0.3 ? 0x2b3477 : 0x14183a);
    // abajur aceso/apagado: cúpula emissiva
    const ab = L.abajur ?? (cena === "noite" ? 1 : 0);
    const cm = c.abajurCupula?.material as THREE.MeshStandardMaterial;
    if (cm?.emissive) cm.emissiveIntensity = 0.9 * ab;
    // personagens
    this.aplicaDog(e.dog);
    this.eletrodos.visible = !!e.eletrodos && !!e.dog;
    if (e.dono === null) { this.dono.raiz.visible = false; this.cobertor.visible = cena === "noite"; }
    else {
      this.dono.raiz.visible = cena === "noite";
      const dt = e.dono?.t ?? t;
      this.dono.faz({ modo: "deitado", t: this.dir === "C" ? Math.floor(dt * 12) / 12 : dt, pe: e.dono?.pe, braco: e.dono?.braco });
      this.cobertor.visible = cena === "noite";
    }
    const teto = this.dir !== "B" && !e.semTeto && e.cam.pos[1] < 2.5 && e.cam.pos[2] < 3.7;
    for (const tt of c.tetos) tt.visible = teto;
    c.ventilador.visible = teto || (this.dir === "B" && e.cam.pos[1] < 2.2); // na maquete (sem teto) a câmera de cima passaria rente às pás
    // objetos
    c.desenhaRelogio(e.relogio ?? "23:33");
    if (e.monitor) c.desenhaMonitor(e.monitor.t, e.monitor.profundo);
    c.ventilador.rotation.y = e.ventilador ?? t * 1.6;
    c.bola.visible = !!e.bola;
    if (e.bola) c.bola.position.set(...e.bola);
    // câmera
    const cam = this.w.camera;
    // câmera presa à cabeça do cachorro (pos e alvo relativos à posição real do osso Head)
    let cp = new THREE.Vector3(...e.cam.pos), ca = new THREE.Vector3(...e.cam.alvo);
    if (e.cam.rel === "cabeca" && e.dog) {
      this.dog.raiz.updateMatrixWorld(true);
      const h = this.dog.ossos.get("Head")!.getWorldPosition(new THREE.Vector3());
      cp.add(h); ca.add(h);
    }
    cam.position.copy(cp);
    cam.fov = e.cam.fov ?? 30;
    cam.near = 0.02;
    cam.far = 300;
    cam.updateProjectionMatrix();
    const al = ca;
    const fw = al.clone().sub(cam.position).normalize();
    cam.up.copy(new THREE.Vector3(0, 1, 0).applyAxisAngle(fw, e.cam.rolo ?? 0));
    cam.lookAt(al);
    cam.updateMatrixWorld();
    c.ceu.position.copy(cam.position);
    this.foco = e.cam.foco ?? 0.45;
    this.forca = e.cam.forca ?? 0.85;
    this.larg = e.cam.larg ?? 1;
    // pós
    this.w.final.uniforms.escuro.value = e.escuro ?? 0;
    this.w.final.uniforms.frio.value = e.frio ?? 0;
    this.w.final.uniforms.quente.value = (this.dir === "B" ? 0.02 : this.dir === "C" ? 0.015 : 0) + (e.quente ?? 0);
    // virada: congela em arame laranja + partículas sobre azul-tinta
    const v = e.virada;
    if (this.virada) this.virada.g.visible = false;
    this.planoVirada.constant = 1e5;
    this.planoVirada.normal.set(1, 0, 0);
    if (v && v.k > 0.001) {
      if (!this.virada) {
        sc.updateMatrixWorld(true);
        const perto = new THREE.Box3().setFromCenterAndSize(al.clone(), new THREE.Vector3(7, 6, 7));
        this.virada = new Virada([this.dog.raiz, this.dono.raiz, this.cobertor, c.quarto], al.clone(), this.kit.W, this.kit.H, perto);
        sc.add(this.virada.g);
      }
      this.virada.g.visible = true;
      this.virada.aplica(v.k, v.k2, v.t ?? t);
      this.planoVirada.normal.copy(this.virada.planoSolido.normal);
      this.planoVirada.constant = this.virada.planoSolido.constant;
      if (v.k > 0.98) { c.ceu.visible = false; c.luaDisco.visible = false; }
      sc.background = this.tinta;
      this.w.hemi.intensity *= 1 - 0.4 * Math.min(1, v.k * 2);
    }
  }

  render(t: number) {
    this.w.quadro(t, this.foco, this.forca, this.larg);
  }
}
