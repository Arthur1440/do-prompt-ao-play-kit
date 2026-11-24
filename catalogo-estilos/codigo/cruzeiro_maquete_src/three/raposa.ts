import * as THREE from "three";
import { capsula, cil, esfera, estrela, Kit, torno, perfil, tubo, V3 } from "./kit";
import { clamp } from "./rng";

// A raposa do Cruzeiro: simpática, esperta, camisa azul com as 5 estrelas do Cruzeiro do Sul.
// ~1,25 de altura (com as orelhas), de frente para +z. Lado esquerdo do boneco = +x.

export const COR = {
  pelo: 0xe2702d,
  peloClaro: 0xfff3e4,
  escuro: 0x2b1a14,
  azul: 0x1d4fc4,
  verde: 0x1f8a4c,
  pano: 0xf4f6fb,
  chapeu: 0x4a3f36,
};

export type Braco = { abre: number; frente: number; cot: number };
export type PoseRaposa = {
  vis?: boolean;
  pos?: V3;
  rotY?: number;
  pulo?: number;
  sq?: number; // squash & stretch (1 = normal)
  inclina?: number;
  cab?: V3; // rotação da cabeça
  bE?: Braco;
  bD?: Braco;
  palp?: number; // 0 aberto .. 1 fechado (0.25 = olhar esperto)
  olhar?: [number, number];
  cauda?: number;
  camisa?: number; // 0 verde .. 1 azul
  estrelas?: number[]; // escala de cada uma das 5 estrelas do peito (0 = ausente)
  brilho?: number; // estrelas do peito acesas
  chapeu?: number; // 0 sem .. 1 na cabeça
  base?: boolean; // base redonda de boneco colecionável (maquete)
  esc?: number;
};

// Cruzeiro do Sul: topo, base, esquerda, direita e a pequena (x, y, tamanho)
export const CRUZ: [number, number, number][] = [
  [0, 1, 1],
  [0, -1.08, 1.12],
  [-0.82, 0.08, 0.92],
  [0.78, 0.24, 0.86],
  [0.36, -0.42, 0.58],
];

function corPorVertice(g: THREE.BufferGeometry, f: (p: THREE.Vector3, i: number) => THREE.ColorRepresentation) {
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos as THREE.BufferAttribute, i);
    c.set(f(v, i));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
}

const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** pinta um mapa (laranja x branco) a partir de uma função 0..1 (1 = branco) no espaço da UV */
function texPelo(W: number, H: number, branco: (u: number, v: number) => number) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  const a = new THREE.Color(COR.pelo), b = new THREE.Color(COR.peloClaro);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = branco((x + 0.5) / W, (y + 0.5) / H);
      const i = (y * W + x) * 4;
      img.data[i] = 255 * (a.r + (b.r - a.r) * k) ** (1 / 2.2);
      img.data[i + 1] = 255 * (a.g + (b.g - a.g) * k) ** (1 / 2.2);
      img.data[i + 2] = 255 * (a.b + (b.b - a.b) * k) ** (1 / 2.2);
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class Raposa {
  raiz = new THREE.Group();
  corpo = new THREE.Group();
  cabeca = new THREE.Group();
  ombroE = new THREE.Group();
  ombroD = new THREE.Group();
  cotE = new THREE.Group();
  cotD = new THREE.Group();
  cauda = new THREE.Group();
  palps: THREE.Object3D[] = [];
  pupilas: THREE.Object3D[] = [];
  estrelasPeito: THREE.Mesh[] = [];
  chapeu = new THREE.Group();
  base: THREE.Object3D | null = null;
  matCamisa: THREE.Material;
  matEstrela: THREE.Material;

  constructor(public k: Kit) {
    const C = k.dir === "C";
    const vc = !C; // pelo laranja/branco pintado em textura (fora do nanquim)
    // crânio: máscara branca na parte de baixo da frente (bochechas sobem dos lados)
    const mCranio = vc
      ? k.mat({
          map: texPelo(1024, 512, (u, v) => {
            const ph = u * Math.PI * 2, th = v * Math.PI;
            const x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th);
            const ax = Math.abs(x);
            const lim = -0.2 + 0.36 * sm(0.08, 0.75, ax);
            return sm(0.03, -0.03, y - lim) * sm(-0.25, -0.05, z);
          }),
          rough: 0.6,
        })
      : k.mat({ color: COR.pelo, tom: 0.97 });
    const mFocinho = vc ? k.mat({ map: texPelo(512, 256, (u) => sm(0.42, 0.62, Math.cos(u * Math.PI * 2))), rough: 0.6 }) : k.mat({ color: COR.pelo, tom: 0.97 });
    const mCauda = vc ? k.mat({ map: texPelo(512, 64, (u) => sm(0.72, 0.8, u)), rough: 0.6 }) : k.mat({ color: COR.pelo, tom: 0.97 });
    const mPelo = k.mat({ color: COR.pelo, rough: 0.6, tom: 0.95 });
    const mClaro = k.mat({ color: COR.peloClaro, rough: 0.6, tom: 1 });
    const mEsc = k.mat({ color: COR.escuro, rough: 0.35, tom: 0.12 });
    const mBranco = k.mat({ color: 0xffffff, rough: 0.3, tom: 1 });
    this.matCamisa = k.mat({ color: COR.azul, rough: 0.55, tinta: true });
    const mPano = k.mat({ color: COR.pano, rough: 0.6, tom: 0.98 });
    this.matEstrela = k.mat({ color: 0xffffff, rough: 0.3, emissive: 0xffffff, ei: 0, tom: 1 });
    const R = this.raiz;
    R.add(this.corpo);

    // ---------- pernas, meias, chuteiras
    for (const s of [-1, 1]) {
      const x = s * 0.095;
      k.m(capsula(0.05, 0.12), mPelo, 2.4, this.corpo, [x, 0.25, 0]);
      k.m(cil(0.056, 0.052, 0.17), mPano, 2.4, this.corpo, [x, 0.145, 0]);
      k.m(cil(0.058, 0.058, 0.03), this.matCamisa, 1.6, this.corpo, [x, 0.22, 0]);
      const bota = k.m(capsula(0.052, 0.07), mEsc, 2.6, this.corpo, [x, 0.05, 0.035], [Math.PI / 2, 0, 0], [1, 1, 0.78]);
      bota.scale.set(1, 1, 0.8);
    }
    // ---------- calção
    k.m(torno(perfil([[0.168, 0.51], [0.19, 0.46], [0.195, 0.39], [0.18, 0.335]], 12)), mPano, 3, this.corpo);
    for (const s of [-1, 1]) k.m(cil(0.088, 0.092, 0.08), mPano, 2.6, this.corpo, [s * 0.098, 0.31, 0]);
    // ---------- camisa (tronco)
    const tronco = torno(perfil([[0.0001, 0.47], [0.172, 0.475], [0.208, 0.54], [0.214, 0.62], [0.2, 0.72], [0.182, 0.8], [0.152, 0.86], [0.1, 0.9], [0.06, 0.915]], 30));
    k.m(tronco, this.matCamisa, 3, this.corpo);
    // gola branca
    k.m(new THREE.TorusGeometry(0.075, 0.017, 12, 40), mPano, 2, this.corpo, [0, 0.9, 0.006], [Math.PI / 2 + 0.25, 0, 0]);
    // pescoço
    k.m(cil(0.07, 0.08, 0.1), mClaro, 2, this.corpo, [0, 0.93, 0.01]);
    // 5 estrelas do peito (lado esquerdo do boneco), sobre a superfície
    const cx = 0.085, cy = 0.715, esp = 0.05;
    for (const [u, v, s] of CRUZ) {
      const x = cx + u * esp, y = cy + v * esp;
      const r = 0.212 - Math.abs(y - 0.68) * 0.25;
      const z = Math.sqrt(Math.max(0, r * r - x * x)) + 0.004;
      const st = k.m(estrela(0.019 * s, 0.008), this.matEstrela, 1.4, this.corpo, [x, y, z], [-(y - 0.68) * 0.9, Math.atan2(x, z), 0]);
      st.userData.esc = 1;
      this.estrelasPeito.push(st);
    }

    // ---------- braços
    for (const [s, ombro, cot] of [[1, this.ombroE, this.cotE], [-1, this.ombroD, this.cotD]] as const) {
      ombro.position.set(s * 0.2, 0.83, 0);
      this.corpo.add(ombro);
      k.m(capsula(0.064, 0.05), this.matCamisa, 2.6, ombro, [0, -0.045, 0]);
      k.m(capsula(0.042, 0.09), mPelo, 2.4, ombro, [0, -0.14, 0]);
      cot.position.set(0, -0.2, 0);
      ombro.add(cot);
      k.m(capsula(0.04, 0.08), mPelo, 2.4, cot, [0, -0.055, 0]);
      const mao = k.m(esfera(0.052), mEsc, 2.4, cot, [0, -0.13, 0.005]);
      mao.scale.set(1, 1.05, 0.85);
      // polegar
      k.m(esfera(0.022), mEsc, 1.6, cot, [-s * 0.03, -0.1, 0.035]);
    }

    // ---------- cauda (laranja com ponta branca)
    this.cauda.position.set(0, 0.42, -0.16);
    this.corpo.add(this.cauda);
    const seg = 44, rad = 18;
    const gC = tubo(
      [[0, 0, 0], [0.05, -0.05, -0.13], [0.15, 0.01, -0.27], [0.25, 0.16, -0.33], [0.31, 0.34, -0.3], [0.31, 0.46, -0.24]],
      (u) => 0.03 + 0.105 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92)), 0.75) + (u > 0.97 ? -0.02 : 0),
      seg,
      rad,
    );
    k.m(gC, mCauda, 3, this.cauda);
    // tampa da ponta
    const ponta = k.m(esfera(0.035), mClaro, 2.4, this.cauda, [0.31, 0.46, -0.24]);
    void ponta;

    // ---------- cabeça
    this.cabeca.position.set(0, 1.0, 0.0);
    this.corpo.add(this.cabeca);
    const H = this.cabeca;
    const gCr = esfera(0.2, 64, 48);
    k.m(gCr, mCranio, 3.2, H, [0, 0, 0], [0, 0, 0], [1.08, 0.94, 0.98]);
    // tufos das bochechas
    for (const s of [-1, 1]) {
      const tufo = k.m(torno(perfil([[0.0001, 0], [0.05, 0.03], [0.055, 0.07], [0.03, 0.11], [0.0001, 0.13]], 14), 32), mClaro, 2.6, H, [s * 0.16, -0.1, 0.03], [0, 0, s * (Math.PI / 2 + 0.75)]);
      tufo.scale.set(1, 1, 0.75);
    }
    // focinho (ponte laranja em cima, branco embaixo)
    const gF = torno(perfil([[0.112, 0], [0.104, 0.07], [0.082, 0.15], [0.05, 0.225], [0.024, 0.258], [0.0001, 0.266]], 16), 64);
    k.m(gF, mFocinho, 3, H, [0, -0.05, 0.1], [Math.PI / 2, 0, 0], [1, 1, 0.8]);
    // nariz
    k.m(esfera(0.04), mEsc, 2.4, H, [0, -0.045, 0.368], [0, 0, 0], [1.3, 0.85, 0.9]);
    k.m(esfera(0.011), mBranco, 0, H, [0.013, -0.031, 0.402]);
    // boca: sorriso em "w"
    const gB = tubo([[-0.07, -0.072, 0.232], [-0.045, -0.1, 0.268], [0, -0.112, 0.287], [0.045, -0.1, 0.268], [0.075, -0.068, 0.228]], () => 0.0075, 30, 8);
    k.m(gB, mEsc, 0, H);
    k.m(tubo([[0, -0.075, 0.35], [0, -0.095, 0.322], [0, -0.111, 0.288]], () => 0.006, 8, 8), mEsc, 0, H);
    // olhos
    for (const s of [-1, 1]) {
      const o = new THREE.Group();
      const n = new THREE.Vector3(s * 0.4, 0.2, 0.9).normalize();
      o.position.copy(n.clone().multiplyScalar(0.185)).add(new THREE.Vector3(0, 0.02, 0));
      o.lookAt(o.position.clone().add(n));
      H.add(o);
      k.m(esfera(0.052), mBranco, 2.2, o, [0, 0, 0], [0, 0, 0], [0.82, 1.08, 0.42]);
      const pup = new THREE.Group();
      o.add(pup);
      k.m(esfera(0.034), mEsc, 0, pup, [0, -0.004, 0.012], [0, 0, 0], [0.8, 1.05, 0.5]);
      k.m(esfera(0.0105), mBranco, 0, pup, [0.011, 0.014, 0.03]);
      this.pupilas.push(pup);
      // pálpebra (meia esfera de pelo que desce)
      const pg = new THREE.Group();
      o.add(pg);
      const lid = k.m(new THREE.SphereGeometry(0.056, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), mPelo, 2.2, pg, [0, 0, 0], [0, 0, 0], [0.86, 1.1, 0.5]);
      void lid;
      this.palps.push(pg);
      // sobrancelha
      k.m(capsula(0.0105, 0.05), mEsc, 0, H, [s * 0.09, s > 0 ? 0.132 : 0.124, 0.163], [0.25, 0, s * (Math.PI / 2 - 0.1)]);
    }
    // orelhas
    for (const s of [-1, 1]) {
      const og = new THREE.Group();
      og.position.set(s * 0.115, 0.165, -0.03);
      og.rotation.set(-0.1, s * 0.15, -s * 0.3);
      H.add(og);
      k.m(new THREE.ConeGeometry(0.09, 0.25, 32), mPelo, 3, og, [0, 0.11, 0], [0, 0, 0], [1, 1, 0.42]);
      k.m(new THREE.ConeGeometry(0.058, 0.17, 32), mClaro, 0, og, [0, 0.085, 0.022], [0, 0, 0], [1, 1, 0.3]);
      k.m(new THREE.ConeGeometry(0.042, 0.075, 24), mEsc, 2, og, [0, 0.205, 0.003], [0, 0, 0], [1, 1, 0.48]);
    }
    // chapéu de dirigente (fedora)
    const mCh = k.m(torno(perfil([[0.0001, 0.17], [0.1, 0.165], [0.15, 0.13], [0.155, 0.04], [0.158, 0.0]], 12)), k.mat({ color: COR.chapeu, rough: 0.7 }), 2.6, this.chapeu);
    void mCh;
    k.m(cil(0.27, 0.27, 0.014, 48), k.mat({ color: COR.chapeu, rough: 0.7 }), 2.6, this.chapeu, [0, 0.0, 0]);
    k.m(cil(0.16, 0.16, 0.035, 48), k.mat({ color: 0x1e1915, rough: 0.6 }), 1.6, this.chapeu, [0, 0.03, 0]);
    this.chapeu.position.set(0, 0.17, -0.01);
    this.chapeu.rotation.set(-0.12, 0, 0.1);
    H.add(this.chapeu);

    // base de boneco colecionável (maquete)
    if (k.dir === "A") {
      this.base = k.m(cil(0.34, 0.36, 0.06, 64), k.mat({ color: 0x141414, rough: 0.35, clear: 0.6 }), 0, R, [0, 0.03, 0]);
      this.corpo.position.y = 0.06;
    }
    R.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.contorno) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  /** posição no mundo de cada estrela do peito (para as estrelas que descem do céu) */
  alvoEstrela(i: number) {
    this.raiz.updateMatrixWorld(true);
    return this.estrelasPeito[i].getWorldPosition(new THREE.Vector3());
  }

  aplica(p: PoseRaposa, t: number) {
    const R = this.raiz;
    R.visible = p.vis ?? true;
    if (!R.visible) return;
    R.position.set(...(p.pos ?? [0, 0, 0]));
    R.rotation.y = p.rotY ?? 0;
    R.scale.setScalar(p.esc ?? 1);
    const sq = p.sq ?? 1;
    this.corpo.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.corpo.position.y = (this.base ? 0.06 : 0) + (p.pulo ?? 0);
    this.corpo.rotation.x = p.inclina ?? 0;
    const cab = p.cab ?? [0, 0, 0];
    // respiração/idle leve
    this.cabeca.rotation.set(cab[0] + Math.sin(t * 2.1) * 0.02, cab[1], cab[2] + Math.sin(t * 1.3) * 0.02);
    const bE = p.bE ?? { abre: 0.2, frente: 0, cot: 0.15 };
    const bD = p.bD ?? { abre: 0.2, frente: 0, cot: 0.15 };
    this.ombroE.rotation.set(-bE.frente, 0, bE.abre);
    this.ombroD.rotation.set(-bD.frente, 0, -bD.abre);
    this.cotE.rotation.set(-bE.cot, 0, 0);
    this.cotD.rotation.set(-bD.cot, 0, 0);
    // pálpebras: 0 = aberta (corta só o topo) .. 1 = fechada
    const pl = clamp(p.palp ?? 0.22);
    for (const pg of this.palps) pg.rotation.x = -1.3 + pl * 2.75;
    const [ox, oy] = p.olhar ?? [0, 0];
    for (const pu of this.pupilas) pu.position.set(ox * 0.012, oy * 0.012, 0);
    this.cauda.rotation.set(0, Math.sin(t * 2.4) * 0.18 + (p.cauda ?? 0), Math.sin(t * 1.7) * 0.05);
    // camisa verde → azul
    const cm = this.matCamisa as THREE.MeshToonMaterial;
    cm.color.set(COR.verde).lerp(new THREE.Color(COR.azul), clamp(p.camisa ?? 1));
    const est = p.estrelas ?? [1, 1, 1, 1, 1];
    this.estrelasPeito.forEach((s, i) => {
      const e = est[i] ?? 1;
      s.visible = e > 0.01;
      s.scale.setScalar(Math.max(0.001, e));
    });
    const me = this.matEstrela as THREE.MeshToonMaterial;
    if ("emissiveIntensity" in me) me.emissiveIntensity = (p.brilho ?? 0) * 0.9;
    this.chapeu.visible = (p.chapeu ?? 0) > 0.01;
    if (this.chapeu.visible) {
      const c = clamp(p.chapeu ?? 0);
      this.chapeu.position.y = 0.17 + (1 - c) * 0.5;
      this.chapeu.scale.setScalar(Math.max(0.01, c));
    }
  }
}
