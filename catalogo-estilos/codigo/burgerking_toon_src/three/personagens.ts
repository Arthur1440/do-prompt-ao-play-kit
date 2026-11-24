import * as THREE from "three";
import { capsula, cil, esfera, Kit, perfil, torno, V3 } from "./kit";
import { rng, fbm } from "./rng";
import { desenhaLogoBK, desenhaM, FONTE_T } from "./tex";
import { bigmac, cafe, whopper } from "./lanches";
import { bandeira, celular, telefone, balancaBandeira } from "./extras";

// Lutadores procedurais: o Rei (BK), o Ronald (Méqui) e os executivos de terno.
// Todos ~1 unidade de altura, de frente para +z. Lado E (esquerdo do boneco) = +x.

export type Braco = { abre: number; frente: number; cot: number; torce?: number };
export type Perna = { abre: number; frente: number };
export type Olhos = "normal" | "aperta" | "susto" | "feliz" | "fecha";
export type Boca = "sorri" | "aberta" | "O" | "mordida" | "vexame";
export type Item = "whopper" | "bigmac" | "cafe" | "lanche" | "bandeira" | "telefone" | "celular" | null;
const ESC_ITEM: Record<string, number> = { cafe: 0.09, bandeira: 0.11, telefone: 0.12, celular: 0.075, whopper: 0.085, bigmac: 0.085, lanche: 0.085 };
const OFF_ITEM: Record<string, number> = { cafe: -0.02, bandeira: -0.1, telefone: -0.04, celular: -0.03 };
export type Pose = {
  pos: V3;
  rotY?: number;
  pulo?: number;
  sq?: number; // squash & stretch (1 = normal)
  inclina?: number; // tronco para frente (+) / trás (-)
  lado?: number; // tronco para os lados
  bE?: Braco;
  bD?: Braco;
  pE?: Perna;
  pD?: Perna;
  cab?: V3;
  olhos?: Olhos;
  boca?: Boca;
  chapeu?: { y: number; rz: number; rx?: number; x?: number };
  segE?: Item;
  segD?: Item;
  escItem?: number;
  itemRx?: number;
  toca?: number; // telefone tocando 0..1
  itemRy?: number;
  naBoca?: { item: Exclude<Item, null>; z: number; esc: number; rx?: number; y?: number };
  capa?: number;
  vis?: boolean;
  esc?: number;
};

const BR0: Braco = { abre: 0.18, frente: 0, cot: 0.25 };
const PE0: Perna = { abre: 0.08, frente: 0 };

// ---------------------------------------------------------------------------
// rostos pintados (textura no crânio): frente = u 0.25 / v 0.5
const ROSTO_W = 1024, ROSTO_H = 512;
const px = (az: number) => (0.25 + az / (Math.PI * 2)) * ROSTO_W;
const py = (el: number) => ((Math.PI / 2 - el) / Math.PI) * ROSTO_H;
const RAD = ROSTO_W / (Math.PI * 2);

type Tipo = "rei" | "ronald" | "execMc" | "execBk";
function rosto(tipo: Tipo, olhos: Olhos, boca: Boca) {
  const c = document.createElement("canvas");
  c.width = ROSTO_W;
  c.height = ROSTO_H;
  const g = c.getContext("2d")!;
  const pele = tipo === "ronald" ? "#FBF8F2" : tipo === "rei" ? "#E9B48C" : tipo === "execMc" ? "#E6B596" : "#D9A27E";
  g.fillStyle = pele;
  g.fillRect(0, 0, ROSTO_W, ROSTO_H);
  // bochechas
  if (tipo !== "ronald") {
    g.fillStyle = "rgba(220,110,90,0.28)";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(px(s * 0.5), py(-0.12), RAD * 0.13, RAD * 0.08, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const olhoY = tipo === "ronald" ? 0.2 : 0.22;
  const olhoX = 0.34;
  for (const s of [-1, 1]) {
    const x = px(s * olhoX), y = py(olhoY);
    if (tipo === "ronald") {
      // maquiagem de palhaço: área clara em volta
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(x, y - 4, RAD * 0.16, RAD * 0.2, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.lineCap = "round";
    if (olhos === "aperta" || olhos === "fecha" || olhos === "feliz") {
      g.strokeStyle = "#1b1210";
      g.lineWidth = RAD * 0.045;
      g.beginPath();
      if (olhos === "aperta") {
        g.moveTo(x - s * RAD * 0.07, y - RAD * 0.05);
        g.lineTo(x + s * RAD * 0.05, y);
        g.lineTo(x - s * RAD * 0.07, y + RAD * 0.05);
      } else if (olhos === "feliz") {
        g.arc(x, y + RAD * 0.03, RAD * 0.065, Math.PI * 1.1, Math.PI * 1.9);
      } else {
        g.moveTo(x - RAD * 0.07, y);
        g.lineTo(x + RAD * 0.07, y);
      }
      g.stroke();
    } else {
      const k = olhos === "susto" ? 1.35 : 1;
      // esclera
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(x, y, RAD * 0.07 * k, RAD * 0.095 * k, 0, 0, Math.PI * 2);
      g.fill();
      // íris
      g.fillStyle = tipo === "rei" ? "#3a2412" : tipo === "ronald" ? "#1c1c26" : "#2b2a2e";
      g.beginPath();
      g.ellipse(x + s * -RAD * 0.008, y + RAD * 0.012, RAD * 0.05 * (olhos === "susto" ? 0.8 : 1), RAD * 0.07 * (olhos === "susto" ? 0.8 : 1), 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(x - RAD * 0.018, y - RAD * 0.025, RAD * 0.018, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#1b1210";
      g.lineWidth = RAD * 0.014;
      g.beginPath();
      g.ellipse(x, y, RAD * 0.07 * k, RAD * 0.095 * k, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // sobrancelhas
    g.strokeStyle = tipo === "ronald" ? "#D7261E" : tipo === "rei" ? "#5a3216" : tipo === "execMc" ? "#8a8a8a" : "#4a2e1c";
    g.lineWidth = RAD * (tipo === "ronald" ? 0.035 : 0.05);
    g.beginPath();
    const by = py(olhoY + (tipo === "ronald" ? 0.24 : 0.17) + (olhos === "susto" ? 0.05 : 0));
    const inc = olhos === "aperta" ? 0.05 : olhos === "susto" ? -0.02 : tipo === "rei" ? 0.015 : 0;
    if (tipo === "ronald") {
      g.arc(x, by + RAD * 0.12, RAD * 0.12, Math.PI * 1.2, Math.PI * 1.8);
    } else {
      g.moveTo(x - RAD * 0.09, by + s * inc * RAD);
      g.quadraticCurveTo(x, by - RAD * 0.03, x + RAD * 0.09, by - s * inc * RAD);
    }
    g.stroke();
  }
  // boca
  const my = py(tipo === "rei" ? -0.28 : -0.24);
  const mx = px(0);
  if (tipo === "ronald") {
    // sorriso vermelho largo do palhaço (sempre alegre)
    g.fillStyle = "#D7261E";
    g.beginPath();
    g.moveTo(mx - RAD * 0.42, my - RAD * 0.12);
    g.quadraticCurveTo(mx, my + RAD * 0.42, mx + RAD * 0.42, my - RAD * 0.12);
    g.quadraticCurveTo(mx, my + RAD * 0.1, mx - RAD * 0.42, my - RAD * 0.12);
    g.fill();
    g.beginPath();
    g.ellipse(mx, my + RAD * 0.06, RAD * 0.3, RAD * 0.14, 0, 0, Math.PI);
    g.fill();
    if (boca === "aberta" || boca === "O" || boca === "vexame") {
      g.fillStyle = "#5a0f12";
      g.beginPath();
      g.ellipse(mx, my + RAD * 0.09, RAD * (boca === "O" ? 0.1 : 0.2), RAD * (boca === "O" ? 0.12 : 0.1), 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(mx, my + RAD * 0.07, RAD * 0.2, RAD * 0.055, 0, 0, Math.PI);
      g.fill();
    }
  } else if (tipo !== "rei") {
    g.fillStyle = "#5a1a18";
    g.strokeStyle = "#5a1a18";
    g.lineWidth = RAD * 0.03;
    g.lineCap = "round";
    if (boca === "aberta" || boca === "mordida") {
      g.beginPath();
      g.ellipse(mx, my + RAD * 0.03, RAD * (boca === "mordida" ? 0.17 : 0.12), RAD * (boca === "mordida" ? 0.16 : 0.1), 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.fillRect(mx - RAD * 0.1, my - RAD * 0.1, RAD * 0.2, RAD * 0.04);
    } else if (boca === "O") {
      g.beginPath();
      g.ellipse(mx, my + RAD * 0.02, RAD * 0.035, RAD * 0.04, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.arc(mx, my - RAD * 0.08, RAD * 0.12, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// textura de roupa no torno (frente = u 0.5)
function roupa(tipo: Tipo | "rei-perna") {
  const W = 1024, H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  if (tipo === "rei") {
    g.fillStyle = "#7E1E2C";
    g.fillRect(0, 0, W, H);
    // faixa dourada central + barra
    g.fillStyle = "#E7B53C";
    g.fillRect(W * 0.5 - 70, 0, 140, H);
    g.fillStyle = "#7E1E2C";
    g.fillRect(W * 0.5 - 40, H * 0.25, 80, H);
    g.fillStyle = "#E7B53C";
    g.fillRect(0, H * 0.9, W, H * 0.1);
    // cinto
    g.fillStyle = "#4a2a17";
    g.fillRect(0, H * 0.5, W, H * 0.07);
    g.fillStyle = "#C79B3B";
    g.fillRect(W * 0.5 - 26, H * 0.49, 52, H * 0.09);
    // bordado
    g.strokeStyle = "rgba(231,181,60,0.55)";
    g.lineWidth = 4;
    for (let i = 0; i < 24; i++) {
      g.beginPath();
      g.arc(i * (W / 24) + 21, H * 0.86, 10, 0, Math.PI * 2);
      g.stroke();
    }
  } else if (tipo === "ronald") {
    g.fillStyle = "#FFC72C";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#D7261E";
    g.fillRect(W * 0.5 - 9, H * 0.03, 18, H);
    // bolsos inclinados
    g.lineWidth = 16;
    g.strokeStyle = "#D7261E";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(W * 0.5 + s * 70, H * 0.6);
      g.lineTo(W * 0.5 + s * 170, H * 0.68);
      g.stroke();
    }
    // sombra de dobra
    const gr = g.createLinearGradient(0, H, 0, H * 0.75);
    gr.addColorStop(0, "rgba(160,90,0,0.25)");
    gr.addColorStop(1, "rgba(160,90,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, H * 0.75, W, H * 0.25);
  } else if (tipo === "execMc" || tipo === "execBk") {
    const terno = tipo === "execMc" ? "#2b2f3a" : "#262a33";
    g.fillStyle = terno;
    g.fillRect(0, 0, W, H);
    // camisa + gravata (V)
    g.fillStyle = "#f4f4f2";
    g.beginPath();
    g.moveTo(W * 0.5 - 70, 0);
    g.lineTo(W * 0.5 + 70, 0);
    g.lineTo(W * 0.5, H * 0.55);
    g.closePath();
    g.fill();
    g.fillStyle = tipo === "execMc" ? "#C8202A" : "#1d4f91";
    g.beginPath();
    g.moveTo(W * 0.5 - 14, H * 0.02);
    g.lineTo(W * 0.5 + 14, H * 0.02);
    g.lineTo(W * 0.5 + 20, H * 0.45);
    g.lineTo(W * 0.5, H * 0.52);
    g.lineTo(W * 0.5 - 20, H * 0.45);
    g.closePath();
    g.fill();
    // lapelas
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.lineWidth = 6;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(W * 0.5 + s * 80, 0);
      g.lineTo(W * 0.5 + s * 8, H * 0.58);
      g.stroke();
    }
    // botões
    g.fillStyle = "#111";
    g.beginPath();
    g.arc(W * 0.5, H * 0.66, 8, 0, Math.PI * 2);
    g.fill();
    // broche da marca
    if (tipo === "execMc") {
      g.fillStyle = "#DA291C";
      g.beginPath();
      g.arc(W * 0.5 + 120, H * 0.22, 22, 0, Math.PI * 2);
      g.fill();
      desenhaM(g, W * 0.5 + 120, H * 0.225, 22);
    } else {
      g.fillStyle = "#F5EBDC";
      g.beginPath();
      g.arc(W * 0.5 + 120, H * 0.22, 24, 0, Math.PI * 2);
      g.fill();
      desenhaLogoBK(g, W * 0.5 + 120, H * 0.22, 20);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------------------
export class Boneco {
  tipo: Tipo;
  k: Kit;
  raiz = new THREE.Group();
  corpo = new THREE.Group();
  quadril = new THREE.Group();
  tronco = new THREE.Group();
  cabeca = new THREE.Group();
  chapeu = new THREE.Group();
  ombroE = new THREE.Group();
  ombroD = new THREE.Group();
  cotE = new THREE.Group();
  cotD = new THREE.Group();
  maoE = new THREE.Group();
  maoD = new THREE.Group();
  pernaE = new THREE.Group();
  pernaD = new THREE.Group();
  capa?: THREE.Mesh;
  capaBase?: Float32Array;
  matRosto: THREE.MeshToonMaterial | THREE.MeshPhysicalMaterial;
  rostos: Record<string, THREE.Texture> = {};
  itens: Record<string, THREE.Object3D> = {};
  base?: THREE.Mesh;

  constructor(k: Kit, tipo: Tipo) {
    this.k = k;
    this.tipo = tipo;
    this.raiz.add(this.corpo);
    this.corpo.add(this.quadril);
    this.quadril.position.y = 0.36;
    this.quadril.add(this.tronco, this.pernaE, this.pernaD);
    this.tronco.add(this.cabeca, this.ombroE, this.ombroD);
    this.cabeca.position.y = 0.44;
    this.cabeca.add(this.chapeu);
    this.ombroE.position.set(0.165, 0.27, 0);
    this.ombroD.position.set(-0.165, 0.27, 0);
    for (const o of [this.ombroE, this.ombroD]) o.rotation.order = "XZY";
    this.ombroE.add(this.cotE);
    this.ombroD.add(this.cotD);
    this.cotE.position.y = -0.14;
    this.cotD.position.y = -0.14;
    this.cotE.add(this.maoE);
    this.cotD.add(this.maoD);
    this.maoE.position.y = -0.14;
    this.maoD.position.y = -0.14;
    this.pernaE.position.set(0.07, 0, 0);
    this.pernaD.position.set(-0.07, 0, 0);
    for (const o of [this.pernaE, this.pernaD]) o.rotation.order = "XZY";

    const tex0 = rosto(tipo, "normal", "sorri");
    this.rostos["normal-sorri"] = tex0;
    this.matRosto = k.mat({ map: tex0, rough: 0.55 }) as THREE.MeshToonMaterial;

    if (tipo === "rei") this.montaRei();
    else if (tipo === "ronald") this.montaRonald();
    else this.montaExec();
  }

  private pele() {
    return this.k.mat({ color: this.tipo === "rei" ? "#E9B48C" : this.tipo === "ronald" ? "#FBF8F2" : "#E2AE8E", rough: 0.55 });
  }

  // braço: manga + antebraço + mão
  private bracos(corManga: THREE.Material, corAnte: THREE.Material, mao: THREE.Material, punho?: THREE.Material, r = 0.045) {
    const k = this.k;
    for (const [om, co, ma] of [
      [this.ombroE, this.cotE, this.maoE],
      [this.ombroD, this.cotD, this.maoD],
    ] as const) {
      k.m(esfera(r * 1.15), corManga, 3, om);
      k.m(capsula(r, 0.11), corManga, 3, om, [0, -0.07, 0]);
      k.m(capsula(r * 0.93, 0.1), corAnte, 3, co, [0, -0.065, 0]);
      if (punho) k.m(cil(r * 1.35, r * 1.2, 0.07, 24), punho, 3, co, [0, -0.1, 0]);
      const m = k.m(esfera(r * 1.05), mao, 3, ma, [0, 0.0, 0], undefined, [1, 1.05, 1.1]);
      // polegar
      k.m(esfera(r * 0.45), mao, 2, m, [0.0, 0.25, 0.8].map((v) => v * r) as V3);
    }
  }

  private pernas(cor: THREE.Material, bota: THREE.Material, r = 0.05, botaEsc: V3 = [0.065, 0.05, 0.1], meia?: THREE.Material) {
    const k = this.k;
    for (const p of [this.pernaE, this.pernaD]) {
      k.m(capsula(r, 0.2), cor, 3, p, [0, -0.15, 0]);
      if (meia) k.m(capsula(r * 0.82, 0.12), meia, 3, p, [0, -0.25, 0]);
      k.m(esfera(1, 28, 18), bota, 3, p, [0, -0.33, botaEsc[2] * 0.3], undefined, botaEsc);
    }
  }

  private montaRei() {
    const k = this.k;
    const t = this.tronco;
    const tunica = k.mat({ map: roupa("rei"), rough: 0.6, sheen: 0.4 });
    const ouro = k.mat({ color: "#E8B23A", rough: 0.3, metal: 0.85 });
    const azul = k.mat({ color: "#1F3A63", rough: 0.6, sheen: 0.3 });
    const preto = k.mat({ color: "#1b1716", rough: 0.4, clear: 0.6 });
    const capaM = k.mat({ color: "#C8161D", rough: 0.55, sheen: 0.5, side: THREE.DoubleSide });
    const pelo = k.mat({ color: "#F7F3EA", rough: 0.9, sheen: 1 });
    const barba = k.mat({ color: "#6E3C1B", rough: 0.7 });
    const cabelo = k.mat({ color: "#7A461F", rough: 0.6 });
    const pele = this.pele();

    // túnica (torno com frente em u 0.5)
    const prof = perfil([[0.19, -0.13], [0.17, -0.02], [0.14, 0.08], [0.155, 0.18], [0.16, 0.24], [0.13, 0.3], [0.05, 0.33]], 22);
    k.m(torno(prof, 48, -Math.PI, Math.PI * 2), tunica, 3, t, undefined, undefined, [1, 1, 0.82]);
    this.pernas(azul, preto, 0.048, [0.07, 0.055, 0.105]);
    this.bracos(azul, azul, pele, ouro, 0.046);

    // capa vermelha (malha própria para balançar)
    const NU = 28, NV = 12;
    const geo = new THREE.PlaneGeometry(1, 1, NU, NV);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j <= NV; j++) {
      for (let i = 0; i <= NU; i++) {
        const v = j / NV; // 0 em baixo
        const u = i / NU;
        const phi = Math.PI + (u - 0.5) * 3.3;
        const y = -0.33 + v * 0.63;
        const r = 0.165 + (1 - v) * 0.15 + (1 - v) * 0.012 * Math.sin(u * 30);
        const idx = j * (NU + 1) + i;
        pos.setXYZ(idx, Math.sin(phi) * r, y, Math.cos(phi) * r * 0.9 - 0.02);
      }
    }
    geo.computeVertexNormals();
    this.capa = k.m(geo, capaM, 3, t);
    this.capaBase = new Float32Array(pos.array as Float32Array);
    // gola de pele
    const gola = new THREE.TorusGeometry(0.125, 0.055, 14, 40);
    const gp = gola.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < gp.count; i++) {
      const v = new THREE.Vector3(gp.getX(i), gp.getY(i), gp.getZ(i));
      const n = 1 + 0.22 * (fbm(v.x * 40 + 3, v.y * 40 + v.z * 30, 3) - 0.5);
      const a = Math.atan2(v.y, v.x);
      const c = new THREE.Vector3(Math.cos(a) * 0.125, Math.sin(a) * 0.125, 0);
      v.sub(c).multiplyScalar(n).add(c);
      gp.setXYZ(i, v.x, v.y, v.z);
    }
    gola.computeVertexNormals();
    k.m(gola, pelo, 3, t, [0, 0.3, -0.01], [Math.PI / 2 + 0.12, 0, 0], [1.08, 1, 0.75]);
    // medalhão com o logo
    const med = new THREE.Group();
    med.position.set(0, 0.16, 0.135);
    med.rotation.x = -0.12;
    t.add(med);
    k.m(cil(0.045, 0.045, 0.014, 32), ouro, 2, med, [0, 0, 0], [Math.PI / 2, 0, 0]);
    const lg = document.createElement("canvas");
    lg.width = lg.height = 256;
    const gg = lg.getContext("2d")!;
    gg.fillStyle = "#F5EBDC";
    gg.beginPath();
    gg.arc(128, 128, 128, 0, Math.PI * 2);
    gg.fill();
    desenhaLogoBK(gg, 128, 132, 100);
    const lt = new THREE.CanvasTexture(lg);
    lt.colorSpace = THREE.SRGBColorSpace;
    const disco = new THREE.Mesh(new THREE.CircleGeometry(0.037, 32), k.mat({ map: lt, rough: 0.5, semContorno: true }));
    disco.position.z = 0.0075;
    med.add(disco);
    // corrente
    k.m(new THREE.TorusGeometry(0.11, 0.006, 6, 40, Math.PI), ouro, 1, t, [0, 0.27, 0.03], [Math.PI * 0.62, 0, Math.PI], [1, 1.25, 1]);

    // cabeça
    const c = this.cabeca;
    k.m(esfera(0.13, 48, 32), this.matRosto, 3, c, undefined, undefined, [0.96, 1.04, 0.96]);
    k.m(esfera(0.137, 32, 24), cabelo, 3, c, [0, 0.022, -0.035], undefined, [1.02, 1, 1]);
    // mechas laterais caindo nas costas
    for (const s of [-1, 1]) k.m(esfera(0.07), cabelo, 3, c, [s * 0.1, -0.05, -0.05], [0, 0, s * 0.3], [0.8, 1.4, 1]);
    // barba farta
    k.m(esfera(0.112, 40, 28), barba, 3, c, [0, -0.075, 0.035], undefined, [1.12, 0.95, 0.9]);
    k.m(new THREE.ConeGeometry(0.05, 0.08, 20), barba, 3, c, [0, -0.175, 0.06], [Math.PI + 0.25, 0, 0]);
    // bigode
    for (const s of [-1, 1]) {
      const b = k.m(capsula(0.017, 0.05), barba, 2, c, [s * 0.035, -0.035, 0.128], [0, 0, s * (Math.PI / 2 - 0.35)]);
      b.scale.set(1, 1, 0.8);
    }
    // sorriso (dentes) dentro da barba
    k.m(esfera(1, 24, 12, ), k.mat({ color: "#3d0d10", rough: 0.6, semContorno: true }), 1, c, [0, -0.07, 0.124], undefined, [0.045, 0.02, 0.02]);
    k.m(esfera(1, 24, 12), k.mat({ color: "#ffffff", rough: 0.4, semContorno: true }), 1, c, [0, -0.064, 0.132], undefined, [0.038, 0.011, 0.012]);
    // nariz
    k.m(esfera(0.026), k.mat({ color: "#E29F7A", rough: 0.5 }), 2, c, [0, -0.005, 0.13], undefined, [1, 0.9, 1]);
    // coroa
    const ch = this.chapeu;
    ch.position.y = 0.105;
    k.m(cil(0.112, 0.105, 0.06, 40, true), ouro, 3, ch, [0, 0.0, 0]);
    k.m(cil(0.107, 0.107, 0.05, 32), k.mat({ color: "#9e1520", rough: 0.7 }), 2, ch, [0, -0.002, 0]);
    k.m(new THREE.TorusGeometry(0.112, 0.008, 8, 48), ouro, 2, ch, [0, -0.03, 0], [Math.PI / 2, 0, 0]);
    k.m(new THREE.TorusGeometry(0.115, 0.008, 8, 48), ouro, 2, ch, [0, 0.03, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * 0.11, z = Math.cos(a) * 0.11;
      k.m(new THREE.ConeGeometry(0.026, 0.07, 4), ouro, 2, ch, [x, 0.065, z], [0, a, 0]);
      k.m(esfera(0.014), ouro, 1.5, ch, [x * 1.02, 0.105, z * 1.02]);
      k.m(esfera(0.013), k.mat({ color: i === 0 ? "#2d6bd8" : "#d4182a", rough: 0.15, clear: 1 }), 1, ch, [x * 1.08, 0.0, z * 1.08]);
    }
  }

  private montaRonald() {
    const k = this.k;
    const t = this.tronco;
    const macacao = k.mat({ map: roupa("ronald"), rough: 0.6, sheen: 0.3 });
    const amarelo = k.mat({ color: "#FFC72C", rough: 0.6 });
    const vermelho = k.mat({ color: "#D7261E", rough: 0.45, clear: 0.5 });
    const listras = k.mat({ map: listrasTex(), rough: 0.6 });
    const listrasMeia = k.mat({ map: listrasTex(4), rough: 0.6 });
    const branco = k.mat({ color: "#FFFFFF", rough: 0.6 });
    const peruca = k.mat({ color: "#D7261E", rough: 0.75 });

    const prof = perfil([[0.17, -0.14], [0.18, -0.04], [0.165, 0.08], [0.165, 0.2], [0.15, 0.27], [0.11, 0.31], [0.04, 0.33]], 22);
    k.m(torno(prof, 48, -Math.PI, Math.PI * 2), macacao, 3, t, undefined, undefined, [1, 1, 0.86]);
    // pernas: calça bufante amarela até o joelho, meias listradas, sapatões
    for (const p of [this.pernaE, this.pernaD]) {
      const calca = torno(perfil([[0.04, -0.21], [0.075, -0.17], [0.085, -0.09], [0.07, 0.0], [0.04, 0.02]], 14), 32);
      k.m(calca, amarelo, 3, p);
      k.m(capsula(0.04, 0.1), listrasMeia, 3, p, [0, -0.25, 0]);
      k.m(esfera(1, 28, 18), vermelho, 3, p, [0, -0.33, 0.05], undefined, [0.075, 0.055, 0.14]);
      // cadarço amarelo
      k.m(new THREE.TorusGeometry(0.018, 0.007, 8, 16), amarelo, 1.5, p, [0, -0.29, 0.07], [0.6, 0, 0]);
    }
    this.bracos(listras, listras, amarelo, amarelo, 0.046);
    // gola branca pontuda
    for (const s of [-1, 1]) {
      const gol = new THREE.ConeGeometry(0.06, 0.13, 3);
      k.m(gol, branco, 2.5, t, [s * 0.045, 0.3, 0.08], [Math.PI / 2 + 0.6, 0, s * 0.9], [1, 1, 0.35]);
    }
    // emblema do M no peito (lado esquerdo do boneco)
    const em = document.createElement("canvas");
    em.width = em.height = 256;
    const eg = em.getContext("2d")!;
    eg.fillStyle = "#D7261E";
    eg.beginPath();
    eg.arc(128, 128, 126, 0, Math.PI * 2);
    eg.fill();
    desenhaM(eg, 128, 136, 92);
    const et = new THREE.CanvasTexture(em);
    et.colorSpace = THREE.SRGBColorSpace;
    const disco = new THREE.Mesh(new THREE.CircleGeometry(0.04, 32), k.mat({ map: et, rough: 0.5, semContorno: true, transparent: true }));
    disco.position.set(0.075, 0.19, 0.134);
    disco.rotation.set(-0.1, 0.42, 0);
    t.add(disco);

    // cabeça
    const c = this.cabeca;
    k.m(esfera(0.13, 48, 32), this.matRosto, 3, c, undefined, undefined, [0.97, 1.03, 0.97]);
    k.m(esfera(0.028), vermelho, 2, c, [0, 0.0, 0.132]);
    // peruca: cachos
    const r = rng(17);
    const pg = this.chapeu;
    pg.position.y = 0;
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2;
      const el = 0.05 + r() * 1.35;
      const dir = new THREE.Vector3(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el));
      // frente do rosto livre
      if (dir.z > 0.45 && dir.y < 0.62) continue;
      const p = dir.multiplyScalar(0.13 + 0.01 * r());
      k.m(esfera(0.045 + r() * 0.025, 18, 14), peruca, 2.5, pg, [p.x * 1.08, p.y + 0.02, p.z * 1.02]);
    }
    // volume nas laterais (acima das orelhas)
    for (const s of [-1, 1]) k.m(esfera(0.07, 20, 16), peruca, 2.5, pg, [s * 0.13, 0.0, -0.01], undefined, [1, 0.9, 1.1]);
  }

  private montaExec() {
    const k = this.k;
    const t = this.tronco;
    const mc = this.tipo === "execMc";
    const terno = k.mat({ map: roupa(this.tipo), rough: 0.65 });
    const ternoLiso = k.mat({ color: mc ? "#2b2f3a" : "#262a33", rough: 0.65 });
    const sapato = k.mat({ color: "#1a1412", rough: 0.35, clear: 0.7 });
    const pele = this.pele();
    const cab = k.mat({ color: mc ? "#9a9590" : "#4a2e1c", rough: 0.7 });
    const prof = perfil([[0.14, -0.12], [0.145, -0.02], [0.14, 0.1], [0.155, 0.2], [0.15, 0.27], [0.1, 0.31], [0.04, 0.33]], 22);
    k.m(torno(prof, 48, -Math.PI, Math.PI * 2), terno, 3, t, undefined, undefined, [1.05, 1, 0.8]);
    this.pernas(ternoLiso, sapato, 0.05, [0.06, 0.04, 0.1]);
    this.bracos(ternoLiso, ternoLiso, pele, k.mat({ color: "#f4f4f2", rough: 0.6 }), 0.044);
    const c = this.cabeca;
    k.m(esfera(0.125, 48, 32), this.matRosto, 3, c, undefined, undefined, [0.95, 1.05, 0.97]);
    k.m(esfera(0.024), k.mat({ color: "#D99A78", rough: 0.5 }), 2, c, [0, 0.0, 0.124]);
    // orelhas
    for (const s of [-1, 1]) k.m(esfera(0.025), pele, 2, c, [s * 0.12, 0.0, 0], undefined, [0.5, 1, 0.8]);
    // cabelo curto (calota)
    const calota = new THREE.SphereGeometry(0.131, 40, 20, 0, Math.PI * 2, 0, Math.PI * (mc ? 0.36 : 0.42));
    k.m(calota, cab, 3, c, [0, 0.012, -0.012], [-0.35, 0, 0]);
    if (mc) {
      // óculos
      const arm = k.mat({ color: "#222", rough: 0.4 });
      for (const s of [-1, 1]) k.m(new THREE.TorusGeometry(0.026, 0.004, 8, 24), arm, 0.8, c, [s * 0.042, 0.03, 0.12]);
      k.m(capsula(0.003, 0.03), arm, 0.6, c, [0, 0.032, 0.126], [0, 0, Math.PI / 2]);
    }
  }

  // item na mão
  item(nome: Exclude<Item, null>) {
    if (this.itens[nome]) return this.itens[nome];
    let o: THREE.Object3D;
    if (nome === "whopper") o = whopper(this.k);
    else if (nome === "bigmac" || nome === "lanche") o = bigmac(this.k);
    else if (nome === "bandeira") o = bandeira(this.k);
    else if (nome === "telefone") o = telefone(this.k);
    else if (nome === "celular") o = celular(this.k);
    else o = cafe(this.k);
    const g = new THREE.Group();
    g.add(o);
    this.itens[nome] = g;
    return g;
  }

  setRosto(o: Olhos, b: Boca) {
    const kk = `${o}-${b}`;
    if (!this.rostos[kk]) this.rostos[kk] = rosto(this.tipo, o, b);
    if (this.matRosto.map !== this.rostos[kk]) {
      this.matRosto.map = this.rostos[kk];
      this.matRosto.needsUpdate = true;
    }
  }

  aplica(p: Pose, t = 0) {
    this.raiz.visible = p.vis !== false;
    if (!this.raiz.visible) return;
    this.raiz.position.set(p.pos[0], p.pos[1] + (p.pulo ?? 0), p.pos[2]);
    this.raiz.rotation.y = p.rotY ?? 0;
    this.raiz.scale.setScalar(p.esc ?? 1);
    const sq = p.sq ?? 1;
    this.corpo.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.tronco.rotation.set(p.inclina ?? 0, 0, p.lado ?? 0);
    const br = (o: THREE.Group, co: THREE.Group, b: Braco, s: number) => {
      o.rotation.set(-b.frente, b.torce ?? 0, s * b.abre);
      co.rotation.set(-b.cot, 0, 0);
    };
    br(this.ombroE, this.cotE, p.bE ?? BR0, 1);
    br(this.ombroD, this.cotD, p.bD ?? BR0, -1);
    const pe = (o: THREE.Group, b: Perna, s: number) => o.rotation.set(-b.frente, 0, s * b.abre);
    pe(this.pernaE, p.pE ?? PE0, 1);
    pe(this.pernaD, p.pD ?? PE0, -1);
    const c = p.cab ?? [0, 0, 0];
    this.cabeca.rotation.set(c[0], c[1], c[2]);
    const ch = p.chapeu ?? { y: 0, rz: 0 };
    const y0 = this.tipo === "rei" ? 0.105 : 0;
    this.chapeu.position.set(ch.x ?? 0, y0 + ch.y, 0);
    this.chapeu.rotation.set(ch.rx ?? 0, 0, ch.rz);
    this.setRosto(p.olhos ?? "normal", p.boca ?? "sorri");
    // itens
    for (const [mao, nome] of [
      [this.maoE, p.segE],
      [this.maoD, p.segD],
    ] as const) {
      for (const ch2 of [...mao.children]) if (ch2.userData.item) mao.remove(ch2);
      if (nome) {
        const it = this.item(nome);
        it.userData.item = true;
        const e = (p.escItem ?? 1) * (ESC_ITEM[nome] ?? 0.085);
        it.scale.setScalar(e);
        mao.add(it);
        this.raiz.updateMatrixWorld(true);
        const qm = new THREE.Quaternion();
        mao.getWorldQuaternion(qm);
        const inv = qm.clone().invert();
        const qRaiz = new THREE.Quaternion();
        this.raiz.getWorldQuaternion(qRaiz);
        const desejo = qRaiz.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(p.itemRx ?? 0.38, p.itemRy ?? 0, 0)));
        it.quaternion.copy(inv.multiply(desejo));
        const off = new THREE.Vector3(0, OFF_ITEM[nome] ?? 0.025, 0.035).applyQuaternion(qRaiz);
        const sw = new THREE.Vector3();
        mao.getWorldScale(sw);
        off.applyQuaternion(qm.clone().invert()).divide(sw);
        it.position.copy(off);
        if (nome === "bandeira") balancaBandeira(it.children[0], t);
        const fone = it.children[0]?.userData?.fone as THREE.Object3D | undefined;
        if (fone) fone.position.set(Math.sin(t * 70) * 0.04 * (p.toca ?? 0), 0.72 + Math.abs(Math.sin(t * 35)) * 0.12 * (p.toca ?? 0), 0);
      }
    }
    // lanche na boca (mordidas): preso à cabeça
    for (const ch3 of [...this.cabeca.children]) if (ch3.userData.boca) this.cabeca.remove(ch3);
    if (p.naBoca) {
      const it = this.item(p.naBoca.item === "whopper" ? "whopper" : "lanche").clone();
      it.userData.boca = true;
      it.scale.setScalar(p.naBoca.esc);
      it.position.set(0, p.naBoca.y ?? -0.07, p.naBoca.z);
      it.rotation.set(p.naBoca.rx ?? 1.25, 0, 0);
      this.cabeca.add(it);
    }
    // capa balança
    if (this.capa && this.capaBase) {
      const pos = this.capa.geometry.attributes.position as THREE.BufferAttribute;
      const b = this.capaBase;
      const sw = p.capa ?? 0;
      for (let i = 0; i < pos.count; i++) {
        const y = b[i * 3 + 1];
        const v = (0.3 - y) / 0.63;
        pos.setXYZ(i, b[i * 3] + Math.sin(t * 3 + b[i * 3] * 8) * 0.008 * v, y, b[i * 3 + 2] - sw * v * v * 0.12 - Math.sin(t * 2.2 + b[i * 3] * 6) * 0.01 * v);
      }
      pos.needsUpdate = true;
      this.capa.geometry.computeVertexNormals();
    }
  }
}

function listrasTex(n = 6) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 512;
  const g = c.getContext("2d")!;
  const h = 512 / (n * 2);
  for (let i = 0; i < n * 2; i++) {
    g.fillStyle = i % 2 ? "#FFFFFF" : "#D7261E";
    g.fillRect(0, i * h, 64, h + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const _f = FONTE_T;
