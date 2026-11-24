// Orquestra o quintal, o forno, a cozinha de Sergipe e a virada. Tudo é função pura de Estado:
// o render pode pular quadros e repetir sem herdar nada do quadro anterior.
import * as THREE from "three";
import { Kit, Dir, montaMundo } from "./kit";
import { Forno, EstadoForno } from "./forno";
import { Fogao, Botijao, Mesa, Quintal, Feixe, Poeira } from "./props";
import { Cozinha } from "./cozinha";
import { Virada } from "./virada";
import { texPizza, texCeu } from "./tex";

export type Plano = "gancho" | "mangueira" | "mesa" | "orbita" | "cozinha" | "virada" | "nada"
  | "rebite" | "pronto" | "sai" | "capa"; // os quatro últimos: prévias

/** câmera em órbita: az (graus, 0 = de frente, + à direita), el (graus), dist (m), fov; ax/ay/az2 = deslocamento do alvo */
export type Cam = { az: number; el: number; dist: number; fov?: number; ax?: number; ay?: number; az2?: number; foco?: number; abert?: number };

export type Estado = {
  plano: Plano;
  p: number; // progresso do plano 0..1
  t: number; // tempo absoluto (s)
  k?: number;
  k2?: number;
  f?: EstadoForno;
  cam?: Cam;
  escuro?: number; // escurece a imagem (fundo de motion)
  desf?: number; // 0..1 desfoque de fundo (motion por cima)
  nuvem?: number; // 0..1 a sombra da nuvem atravessa
  poeira?: number; // 0..1 desde o tombo dos gabinetes
  dbg?: Partial<EstadoForno>;
};

export const MESA = new THREE.Vector3(0.25, 0, -0.45);
export const TOPO = 0.76;
export const FORNO = new THREE.Vector3(MESA.x, TOPO + 0.04, MESA.z);
const FOGAO = new THREE.Vector3(-0.45, 0, 0.4);
const BOTIJAO = new THREE.Vector3(-0.98, 0, 0.42);
const COZ = new THREE.Vector3(100, 0, 0);

function orbita(cam: THREE.PerspectiveCamera, alvo: THREE.Vector3, az: number, el: number, dist: number, fov: number) {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(Math.min(el, 89.8));
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(e) * dist, alvo.y + Math.sin(e) * dist, alvo.z + Math.cos(a) * Math.cos(e) * dist);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.up.set(0, 1, 0);
  cam.lookAt(alvo);
  return cam.position.distanceTo(alvo);
}

function texNuvem() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 256, 256);
  for (const [x, y, r] of [[90, 130, 60], [140, 110, 70], [185, 135, 55], [120, 150, 55], [165, 155, 50]]) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "#fff");
    gr.addColorStop(0.7, "#fff");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return new THREE.CanvasTexture(c);
}

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  quintal: Quintal;
  mesa: Mesa;
  fogao: Fogao;
  botijao: Botijao;
  forno: Forno;
  feixe: Feixe;
  feixeG: Feixe; // feixe do gancho: atravessa o quadro de lado até a mesa
  poeira: Poeira;
  cozinha: Cozinha;
  nuvem: THREE.Mesh;
  virada?: Virada;
  cena = new THREE.Group(); // quintal + forno
  ceu: THREE.Texture;
  tinta = new THREE.Color(0x0b1026);
  foco = 0.45;
  forca = 1;
  base: { sol: number; hemi: number };

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number) {
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    const k = this.kit;
    k.envReflexo = this.w.envCeu;
    this.quintal = new Quintal(k);
    this.mesa = new Mesa(k);
    this.mesa.g.position.copy(MESA);
    this.fogao = new Fogao(k);
    this.fogao.g.position.copy(FOGAO);
    this.botijao = new Botijao(k);
    this.botijao.g.position.copy(BOTIJAO);
    this.botijao.g.rotation.y = 0.5;
    this.forno = new Forno(k, texPizza(dir, false), texPizza(dir, true), this.w.solDir);
    this.forno.g.position.copy(FORNO);
    this.feixe = new Feixe(k, new THREE.Vector3(MESA.x, TOPO, MESA.z), this.w.solDir, 0.42, 6);
    this.poeira = new Poeira(k, new THREE.Vector3(MESA.x, TOPO + 0.02, MESA.z));
    this.feixeG = new Feixe(k, new THREE.Vector3(MESA.x, TOPO, MESA.z), new THREE.Vector3(-2.8, 3.4, 0.4), 0.36, 6, 2.2);
    this.cena.add(this.quintal.g, this.mesa.g, this.fogao.g, this.botijao.g, this.forno.g, this.feixe.g, this.feixeG.g, this.poeira.g);
    this.cozinha = new Cozinha(k, this.w.solDir);
    this.cozinha.g.position.copy(COZ);
    // nuvem: só projeta sombra (invisível para a câmera)
    const tn = texNuvem();
    this.nuvem = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 }));
    this.nuvem.castShadow = true;
    this.nuvem.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tn, alphaTest: 0.5 });
    this.nuvem.userData.semProf = true;
    this.nuvem.visible = false;
    this.w.scene.add(this.cena, this.cozinha.g, this.nuvem);
    this.ceu = texCeu(dir);
    this.w.scene.background = this.ceu;
    this.ligaMangueira(0);
    this.base = { sol: this.w.sol.intensity, hemi: this.w.hemi.intensity };
  }

  ligaMangueira(solta: number) {
    const alvoMundo = FOGAO.clone().add(new THREE.Vector3(-0.27, 0.32, 0.05));
    this.botijao.g.updateMatrixWorld(true);
    const local = this.botijao.g.worldToLocal(alvoMundo.clone());
    this.botijao.mangueiraAte(local, solta);
  }

  sol(alvo: THREE.Vector3, intens = 1) {
    const { sol } = this.w;
    sol.position.copy(alvo).addScaledVector(this.w.solDir.clone().normalize(), 8);
    sol.target.position.copy(alvo);
    sol.target.updateMatrixWorld();
    sol.intensity = this.base.sol * intens;
  }

  private camOrbita(c: Cam, centro: THREE.Vector3) {
    const alvo = centro.clone().add(new THREE.Vector3(c.ax ?? 0, c.ay ?? 0, c.az2 ?? 0));
    const d = orbita(this.w.camera, alvo, c.az, c.el, c.dist, c.fov ?? 30);
    this.foco = c.foco ?? d;
    this.forca = c.abert ?? 2.5;
    return d;
  }

  private cortado: THREE.Plane[] | null = null;
  cortaCena(planos: THREE.Plane[] | null) {
    if (this.cortado === planos) return;
    this.cortado = planos;
    this.cena.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      for (const mm of Array.isArray(m) ? m : [m]) {
        mm.clippingPlanes = planos;
        if ((mm as THREE.ShaderMaterial).isShaderMaterial) (mm as THREE.ShaderMaterial).clipping = !!planos;
        mm.needsUpdate = true;
      }
    });
  }

  aplica(e: Estado) {
    const cam = this.w.camera;
    const t = e.t;
    const f = this.forno;
    let ef: EstadoForno = e.f ?? {};
    this.cena.visible = true;
    this.cozinha.g.visible = false;
    this.w.scene.background = this.ceu;
    this.feixe.aplica(0, 1, t);
    this.feixeG.aplica(0, 1, t);
    this.poeira.aplica(e.poeira ?? 0);
    if (this.virada) this.virada.g.visible = false;
    if (e.plano !== "virada") this.cortaCena(null);
    this.sol(new THREE.Vector3(MESA.x, TOPO, MESA.z), 1);
    this.w.hemi.intensity = this.base.hemi;
    this.w.final.uniforms.escuro.value = e.escuro ?? 0;
    this.fogao.botoes.forEach((_, i) => this.fogao.gira(i, 0));
    this.nuvem.visible = false;
    this.ligaMangueira(0);

    switch (e.plano) {
      case "nada": {
        this.cena.visible = false;
        this.w.scene.background = this.tinta;
        orbita(cam, FORNO, 0, 10, 3, 30);
        return;
      }
      case "gancho": {
        // close no botão girando, sem chama; ao fundo os dois gabinetes velhos na mesa, no feixe de sol
        this.fogao.gira(1, e.k ?? 0.4);
        ef = { pe: 1, abre: 0, pecas: 0, junta: 0, ...ef };
        this.feixeG.aplica(1, 1, t);
        const botao = FOGAO.clone().add(new THREE.Vector3(-0.06, 0.745, 0.33));
        const fundo = new THREE.Vector3(MESA.x, 1.0, MESA.z);
        const tras = botao.clone().sub(fundo).setY(0).normalize();
        const camP = botao.clone().addScaledVector(tras, 0.78 + e.p * 0.04).add(new THREE.Vector3(-0.02, 0.2, 0));
        cam.position.copy(camP);
        cam.up.set(0, 1, 0);
        cam.fov = 30;
        cam.updateProjectionMatrix();
        cam.lookAt(botao.clone().lerp(fundo, 0.16));
        this.foco = camP.distanceTo(botao);
        this.forca = 1.3;
        break;
      }
      case "mangueira": {
        // a mangueira se solta do fogão e cai; o botijão em primeiro plano
        this.fogao.gira(1, e.k2 ?? 2.6);
        this.ligaMangueira(e.k ?? 0);
        ef = { pe: 1, abre: 0, pecas: 0, junta: 0, ...ef };
        const alvo = FOGAO.clone().add(new THREE.Vector3(-0.36, 0.3 - e.p * 0.06, 0.12));
        const d = orbita(cam, alvo, -12 + e.p * 6, 18 + e.p * 4, 2.0 - e.p * 0.15, 30);
        this.foco = d;
        this.forca = 2.2;
        break;
      }
      case "mesa": {
        // mesa do quintal: gabinetes em pé, pizza crua, feixe de sol descendo; tombam com poeira
        this.feixeG.aplica(e.k2 ?? 1, e.k ?? 1, t);
        this.camOrbita(e.cam ?? { az: 24, el: 16, dist: 3.4, fov: 26 }, FORNO);
        break;
      }
      case "orbita": {
        this.camOrbita(e.cam ?? { az: 30, el: 28, dist: 4.5, fov: 26 }, FORNO);
        if (e.k2) this.feixe.aplica(e.k2, 1, t);
        const nv = e.nuvem ?? 0;
        if (nv > 0 && nv < 1) {
          // a sombra da nuvem atravessa a mesa (plano entre o sol e a mesa)
          const luz = 1 - 0.72 * Math.sin(Math.PI * Math.min(1, Math.max(0, (nv - 0.2) / 0.6)));
          const sd = this.w.solDir.clone().normalize();
          const lado = new THREE.Vector3(0, 1, 0).cross(sd).normalize();
          this.nuvem.position.copy(new THREE.Vector3(MESA.x, TOPO, MESA.z)).addScaledVector(sd, 2.4).addScaledVector(lado, (nv - 0.5) * 5.5);
          this.nuvem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sd);
          this.nuvem.visible = true;
          this.w.hemi.intensity = this.base.hemi * (0.8 + 0.2 * luz);
          ef = { ...ef, luzSol: luz };
        }
        break;
      }
      case "cozinha": {
        this.cena.visible = false;
        this.cozinha.g.visible = true;
        this.cozinha.aplica(t);
        this.sol(COZ.clone().add(new THREE.Vector3(0, 0.5, 0)), 1);
        this.camOrbita(e.cam ?? { az: 20, el: 18, dist: 6, fov: 26 }, COZ.clone().add(new THREE.Vector3(0, 0.55, 0)));
        this.ajusteDesf(e);
        return;
      }
      case "virada": {
        ef = { junta: 1, abre: 1, pecas: 1, rebites: 9, pintura: 1, isopor: 1, vidro: 1, espelho: 1, ...ef };
        f.aplica(ef, t, cam);
        if (!this.virada) {
          this.cena.updateMatrixWorld(true);
          this.virada = new Virada(f.g, FORNO, this.kit.W, this.kit.H);
          this.w.scene.add(this.virada.g);
        }
        const v = e.k ?? 0;
        this.virada.g.visible = v > 0.001;
        this.virada.aplica(v, e.k2 ?? 0, t);
        this.cortaCena(v > 0.001 ? [this.virada.planoSolido] : null);
        if (v > 0.001) this.w.scene.background = this.tinta;
        this.w.hemi.intensity = this.base.hemi * (1 - 0.4 * Math.min(1, v * 2));
        this.camOrbita(e.cam ?? { az: 30, el: 28, dist: 4.6, fov: 30 }, FORNO);
        f.aplica(ef, t, cam);
        this.ajusteDesf(e);
        return;
      }
      // ---------------- prévias
      case "rebite": case "pronto": case "sai": case "capa": {
        const est: Record<string, EstadoForno> = {
          rebite: { junta: 1, abre: 1, pecas: 1, rebites: 6.3 + e.p * 2.7 },
          pronto: { junta: 1, abre: 1, pecas: 1, rebites: 9, pintura: 1, isopor: 1, vidro: 1, espelho: 1, aceso: 1, raios: 1.2, raiosEsp: 1.2, calor: 0.9 },
          sai: { junta: 1, abre: 1, pecas: 1, rebites: 9, pintura: 1, isopor: 1, vidro: 1, espelho: 1, pizzas: 1, asado: 1, embacado: 0.7, tampaAberta: 1, pizzaSai: 0.85 + e.p * 0.15 },
          capa: { junta: 1, abre: 1, pecas: 1, rebites: 9, pintura: 1, isopor: 1, vidro: 1, espelho: 1, pizzas: 1, asado: 1, tampaAberta: 1, aceso: 0.5, raiosEsp: 1.3 },
        };
        ef = est[e.plano];
        const cams: Record<string, Cam> = {
          rebite: { az: 36 + e.p * 4, el: 21, dist: 6.2, fov: 22, ay: -0.1, az2: 0.05, abert: 5.5 },
          pronto: { az: 32 + e.p * 4, el: 25, dist: 6.6, fov: 22, ay: 0.08, az2: -0.02, abert: 5.5 },
          sai: { az: 10, el: 20, dist: 3.6, fov: 22, ax: -0.08, ay: 0.12, az2: 0.28, abert: 3.5 },
          capa: e.cam ?? { az: 0, el: 62, dist: 3.4, fov: 26, ay: 0.1, az2: -0.05, abert: 1.5 },
        };
        if (e.plano === "pronto") this.feixe.aplica(0.6, 1, t);
        this.camOrbita(cams[e.plano], FORNO);
        break;
      }
    }
    f.aplica({ ...ef, ...(e.dbg ?? {}) }, t, cam);
    this.ajusteDesf(e);
  }

  /** fundo de motion: desfoca tudo (foco bem perto) */
  private ajusteDesf(e: Estado) {
    const k = e.desf ?? 0;
    if (k > 0) {
      this.foco = THREE.MathUtils.lerp(this.foco, 0.25, k);
      this.forca = THREE.MathUtils.lerp(this.forca, 8, k);
    }
  }

  render(t: number) {
    this.w.quadro(t, this.foco, this.forca);
  }
}
