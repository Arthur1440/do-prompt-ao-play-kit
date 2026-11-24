// Boneco toy (~1 unidade de altura, de frente para +z; lado E do boneco = +x).
// Variantes: "pedreiro" (o protagonista: boné vermelho, camiseta cinza, bermuda jeans, botina, bigode, olhos grandes),
// "mulher", "menino" (a família do final). Rosto pintado em textura; olhos trocam por expressão; sem boca falando.
import * as THREE from "three";
import { Kit, V3, esfera, capsula, cil, torno, perfil, caixa } from "./kit";

export const COR_PEDREIRO = {
  bone: "#D62A24", aba: "#B81F1B", camiseta: "#9EA4AB", camisetaSombra: "#7E848B", jeans: "#3F6EA8", costura: "#F2B33D",
  pele: "#C98B5E", bochecha: "#D9786A", botina: "#7A4A26", sola: "#2B1D14", bigode: "#2A1A12", olho: "#1B1210", meia: "#EDEAE4",
};

export type Olhos = "normal" | "susto" | "feliz" | "foco" | "preocupado" | "fecha";
export type Braco = { abre: number; frente: number; cot: number; torce?: number };
export type Perna = { frente: number; abre?: number; joelho?: number };
export type Pose = {
  pos: V3;
  rotY?: number;
  pulo?: number;
  sq?: number; // squash & stretch
  inclina?: number;
  lado?: number;
  bE?: Braco;
  bD?: Braco;
  pE?: Perna;
  pD?: Perna;
  cab?: V3;
  olhos?: Olhos;
  boca?: "nada" | "O" | "sorriso";
  bone?: number; // boné pulando (susto): 0..1
  tremor?: number; // tremer (vibrador)
  vis?: boolean;
  esc?: number;
};

const BR0: Braco = { abre: 0.16, frente: 0, cot: 0.2 };
const PE0: Perna = { frente: 0, abre: 0.04, joelho: 0 };
export type Tipo = "pedreiro" | "mulher" | "menino";

const RW = 1024, RH = 512, RAD = RW / (Math.PI * 2);
const px = (az: number) => (0.25 + az / (Math.PI * 2)) * RW;
const py = (el: number) => ((Math.PI / 2 - el) / Math.PI) * RH;

function rosto(tipo: Tipo, olhos: Olhos, boca: Pose["boca"]) {
  const c = document.createElement("canvas");
  c.width = RW; c.height = RH;
  const g = c.getContext("2d")!;
  const pele = tipo === "pedreiro" ? COR_PEDREIRO.pele : tipo === "mulher" ? "#E2A97E" : "#B97A50";
  g.fillStyle = pele;
  g.fillRect(0, 0, RW, RH);
  g.fillStyle = "rgba(214,110,95,0.30)";
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(px(s * 0.52), py(-0.1), RAD * 0.12, RAD * 0.075, 0, 0, Math.PI * 2); g.fill(); }
  const oy = 0.1, ox = 0.31;
  const big = tipo === "pedreiro" ? 1.8 : 1.35;
  for (const s of [-1, 1]) {
    const x = px(s * ox), y = py(oy);
    g.lineCap = "round";
    g.strokeStyle = COR_PEDREIRO.olho;
    if (olhos === "feliz" || olhos === "fecha") {
      g.lineWidth = RAD * 0.05;
      g.beginPath();
      if (olhos === "feliz") g.arc(x, y + RAD * 0.05, RAD * 0.08 * big, Math.PI * 1.12, Math.PI * 1.88);
      else { g.moveTo(x - RAD * 0.08, y); g.lineTo(x + RAD * 0.08, y); }
      g.stroke();
    } else {
      const k = (olhos === "susto" ? 1.28 : olhos === "foco" ? 0.9 : 1) * big;
      const ky = olhos === "foco" ? 0.62 : 1;
      g.fillStyle = "#ffffff";
      g.beginPath(); g.ellipse(x, y, RAD * 0.085 * k, RAD * 0.115 * k * ky, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = RAD * 0.016; g.beginPath(); g.ellipse(x, y, RAD * 0.085 * k, RAD * 0.115 * k * ky, 0, 0, Math.PI * 2); g.stroke();
      // íris: menor no susto (olhar arregalado)
      const ki = olhos === "susto" ? 0.55 : 1;
      g.fillStyle = COR_PEDREIRO.olho;
      g.beginPath(); g.ellipse(x - s * RAD * 0.012, y + RAD * 0.018, RAD * 0.052 * ki * big, RAD * 0.07 * ki * big * Math.min(1, ky + 0.2), 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath(); g.arc(x - RAD * 0.02 - s * RAD * 0.012, y - RAD * 0.022, RAD * 0.02 * big, 0, Math.PI * 2); g.fill();
      if (olhos === "foco") { // pálpebra de cima reta
        g.fillStyle = pele;
        g.fillRect(x - RAD * 0.11 * k, y - RAD * 0.16 * k, RAD * 0.22 * k, RAD * 0.1 * k);
        g.lineWidth = RAD * 0.03; g.beginPath(); g.moveTo(x - RAD * 0.09 * k, y - RAD * 0.06 * k); g.lineTo(x + RAD * 0.09 * k, y - RAD * 0.06 * k); g.stroke();
      }
    }
    // sobrancelha grossa
    g.strokeStyle = tipo === "mulher" ? "#4a2a18" : COR_PEDREIRO.bigode;
    g.lineWidth = RAD * (tipo === "pedreiro" ? 0.055 : 0.04);
    const by = py(oy + 0.25 + (olhos === "susto" ? 0.07 : 0) + (olhos === "preocupado" ? 0.02 : 0));
    const inc = olhos === "foco" ? 0.06 : olhos === "preocupado" ? 0.08 : olhos === "susto" ? -0.02 : 0;
    g.beginPath();
    const si = s;
    g.moveTo(x - RAD * 0.12, by - si * inc * RAD);
    g.quadraticCurveTo(x, by - RAD * 0.04, x + RAD * 0.12, by + si * inc * RAD);
    g.stroke();
  }
  // boca: só aparece no susto (O) ou sorriso da família
  const mx = px(0), my = py(-0.33);
  if (boca === "O") {
    g.fillStyle = "#4a1412";
    g.beginPath(); g.ellipse(mx, my, RAD * 0.05, RAD * 0.065, 0, 0, Math.PI * 2); g.fill();
  } else if (boca === "sorriso") {
    g.strokeStyle = "#5a1a18"; g.lineWidth = RAD * 0.03;
    g.beginPath(); g.arc(mx, my - RAD * 0.09, RAD * 0.1, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** camiseta: cinza com gola e uma faixa de costura; frente = u 0.5 */
function texCamiseta(cor: string, escura: string) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = cor; g.fillRect(0, 0, 512, 256);
  g.fillStyle = escura; g.fillRect(0, 0, 512, 16); // barra
  g.fillRect(0, 238, 512, 18); // gola
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Boneco {
  raiz = new THREE.Group();
  corpo = new THREE.Group();
  tronco = new THREE.Group();
  cabeca = new THREE.Group();
  bone = new THREE.Group();
  ombroE = new THREE.Group(); ombroD = new THREE.Group();
  cotE = new THREE.Group(); cotD = new THREE.Group();
  maoE = new THREE.Group(); maoD = new THREE.Group();
  pernaE = new THREE.Group(); pernaD = new THREE.Group();
  joelhoE = new THREE.Group(); joelhoD = new THREE.Group();
  matRosto: THREE.Material & { map: THREE.Texture | null };
  rostos: Record<string, THREE.Texture> = {};
  constructor(public k: Kit, public tipo: Tipo = "pedreiro") {
    const C = COR_PEDREIRO;
    const pele = k.mat({ color: tipo === "pedreiro" ? C.pele : tipo === "mulher" ? "#E2A97E" : "#B97A50", rough: 0.55 });
    const camisa = tipo === "pedreiro" ? k.mat({ map: texCamiseta(C.camiseta, C.camisetaSombra), rough: 0.75 }) : k.mat({ color: tipo === "mulher" ? "#F2C14E" : "#2FA36B", rough: 0.7 });
    const manga = k.mat({ color: tipo === "pedreiro" ? C.camiseta : tipo === "mulher" ? "#F2C14E" : "#2FA36B", rough: 0.75 });
    const short = k.mat({ color: tipo === "pedreiro" ? C.jeans : tipo === "mulher" ? "#3A4C8C" : "#E2563B", rough: 0.7 });
    const bota = k.mat({ color: tipo === "pedreiro" ? C.botina : tipo === "mulher" ? "#F4F1EA" : "#F4F1EA", rough: 0.55, clear: 0.4 });
    const sola = k.mat({ color: C.sola, rough: 0.7 });

    this.raiz.add(this.corpo);
    this.corpo.add(this.tronco);
    this.tronco.position.y = 0.4; // quadril
    // tronco grosso de brinquedo (barriguinha)
    const prof = perfil([[0.15, -0.04], [0.175, 0.04], [0.18, 0.13], [0.17, 0.22], [0.155, 0.28], [0.11, 0.32], [0.04, 0.34]], 22);
    k.m(torno(prof, 48), camisa, 3, this.tronco, undefined, [0, Math.PI, 0], [1, 1, 0.84]);
    // bermuda: quadril
    k.m(torno(perfil([[0.13, -0.08], [0.165, -0.04], [0.17, 0.02], [0.155, 0.06]], 12), 40), short, 3, this.tronco, [0, 0, 0], undefined, [1, 1, 0.84]);
    // pescoço + cabeça
    this.tronco.add(this.cabeca);
    this.cabeca.position.y = 0.5;
    k.m(cil(0.055, 0.06, 0.08, 20), pele, 2, this.tronco, [0, 0.355, 0]);
    const tex0 = rosto(tipo, "normal", "nada");
    this.rostos["normal-nada"] = tex0;
    this.matRosto = k.mat({ map: tex0, rough: 0.55 }) as THREE.Material & { map: THREE.Texture | null };
    k.m(esfera(0.17, 48, 32), this.matRosto, 3, this.cabeca, undefined, undefined, [0.98, 1.0, 0.95]);
    // orelhas e nariz
    for (const s of [-1, 1]) k.m(esfera(0.034, 16, 12), pele, 2, this.cabeca, [s * 0.163, -0.015, -0.005], undefined, [0.55, 1, 0.8]);
    k.m(esfera(0.036, 20, 14), k.mat({ color: tipo === "pedreiro" ? "#BC7A4E" : "#D69570", rough: 0.5 }), 2, this.cabeca, [0, -0.035, 0.165], undefined, [1, 0.85, 0.9]);

    if (tipo === "pedreiro") {
      // bigode grosso (no lugar da boca)
      const big = k.mat({ color: C.bigode, rough: 0.8 });
      for (const s of [-1, 1]) k.m(capsula(0.026, 0.05), big, 2, this.cabeca, [s * 0.038, -0.085, 0.15], [0, s * 0.3, s * (Math.PI / 2 - 0.25)], [1, 1, 0.75]);
      // cabelo curto aparecendo na nuca e costeletas
      const cab = k.mat({ color: "#2A1A12", rough: 0.8 });
      k.m(esfera(0.15, 32, 20), cab, 2, this.cabeca, [0, 0.03, -0.045], [0.35, 0, 0], [1.08, 0.72, 0.95]);
      // boné: copa + aba + botão
      this.cabeca.add(this.bone);
      this.bone.position.set(0, 0.085, 0);
      const vermelho = k.mat({ color: C.bone, rough: 0.6 });
      k.m(new THREE.SphereGeometry(0.168, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), vermelho, 3, this.bone, [0, 0.0, -0.01], [-0.1, 0, 0], [1, 0.8, 1.02]);
      k.m(cil(0.171, 0.171, 0.026, 40), vermelho, 3, this.bone, [0, -0.004, -0.01], [-0.1, 0, 0]);
      const aba = caixa(0.24, 0.022, 0.16, 0.01);
      k.m(aba, k.mat({ color: C.aba, rough: 0.6 }), 3, this.bone, [0, 0.006, 0.185], [0.06, 0, 0], [1, 1, 1]);
      k.m(esfera(0.02, 12, 8), vermelho, 1.5, this.bone, [0, 0.134, -0.025]);
    } else if (tipo === "mulher") {
      const cab = k.mat({ color: "#3B2214", rough: 0.75 });
      k.m(esfera(0.165, 32, 24), cab, 3, this.cabeca, [0, 0.03, -0.035], undefined, [1.04, 1, 1]);
      k.m(esfera(0.085, 20, 16), cab, 3, this.cabeca, [0, 0.07, -0.16]); // coque
    } else {
      const cab = k.mat({ color: "#1E140E", rough: 0.75 });
      k.m(new THREE.SphereGeometry(0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), cab, 3, this.cabeca, [0, 0.01, -0.01], [-0.3, 0, 0]);
    }

    // braços (ombro -> cotovelo -> mão)
    this.ombroE.position.set(0.18, 0.265, 0);
    this.ombroD.position.set(-0.18, 0.265, 0);
    for (const [om, co, ma] of [[this.ombroE, this.cotE, this.maoE], [this.ombroD, this.cotD, this.maoD]] as const) {
      om.rotation.order = "XZY";
      this.tronco.add(om);
      om.add(co); co.position.y = -0.15;
      co.add(ma); ma.position.y = -0.14;
      k.m(esfera(0.058, 20, 16), manga, 3, om, [-0.0, -0.01, 0]);
      k.m(cil(0.06, 0.056, 0.1, 20), manga, 3, om, [0, -0.06, 0]); // manga curta
      k.m(capsula(0.047, 0.11), pele, 3, om, [0, -0.11, 0]);
      k.m(capsula(0.046, 0.1), pele, 3, co, [0, -0.06, 0]);
      const m = k.m(esfera(0.062, 24, 16), pele, 3, ma, [0, 0, 0.0], undefined, [1, 1.05, 1.05]);
      k.m(esfera(0.026, 12, 10), pele, 2, m, [0.0, 0.03, 0.05]);
    }
    // pernas (quadril -> joelho), bermuda até o joelho, canela, botina
    this.pernaE.position.set(0.085, 0.4, 0);
    this.pernaD.position.set(-0.085, 0.4, 0);
    for (const [pe, jo] of [[this.pernaE, this.joelhoE], [this.pernaD, this.joelhoD]] as const) {
      pe.rotation.order = "XZY";
      this.corpo.add(pe);
      pe.add(jo); jo.position.y = -0.2;
      k.m(capsula(0.078, 0.12), short, 3, pe, [0, -0.09, 0]);
      k.m(cil(0.083, 0.083, 0.03, 24), short, 2, pe, [0, -0.165, 0]); // barra dobrada
      k.m(capsula(0.05, 0.09), pele, 3, jo, [0, -0.06, 0]);
      if (tipo === "pedreiro") k.m(cil(0.06, 0.06, 0.04, 20), k.mat({ color: C.meia, rough: 0.8 }), 2, jo, [0, -0.115, 0]);
      k.m(esfera(1, 28, 18), bota, 3, jo, [0, -0.15, 0.035], undefined, [0.075, 0.06, 0.115]);
      k.m(caixa(0.15, 0.025, 0.24, 0.012), sola, 2, jo, [0, -0.195, 0.035]);
    }
  }

  setRosto(o: Olhos, b: Pose["boca"]) {
    const kk = `${o}-${b}`;
    if (!this.rostos[kk]) this.rostos[kk] = rosto(this.tipo, o, b);
    if (this.matRosto.map !== this.rostos[kk]) { this.matRosto.map = this.rostos[kk]; this.matRosto.needsUpdate = true; }
  }

  aplica(p: Pose, t = 0) {
    this.raiz.visible = p.vis !== false;
    if (!this.raiz.visible) return;
    const tr = p.tremor ?? 0;
    const jx = tr ? Math.sin(t * 91) * 0.012 * tr : 0, jz = tr ? Math.cos(t * 77) * 0.01 * tr : 0;
    this.raiz.position.set(p.pos[0] + jx, p.pos[1] + (p.pulo ?? 0), p.pos[2] + jz);
    this.raiz.rotation.y = p.rotY ?? 0;
    this.raiz.scale.setScalar(p.esc ?? 1);
    const sq = p.sq ?? 1;
    this.corpo.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.tronco.rotation.set(p.inclina ?? 0, 0, (p.lado ?? 0) + (tr ? Math.sin(t * 63) * 0.04 * tr : 0));
    const br = (o: THREE.Group, co: THREE.Group, b: Braco, s: number) => { o.rotation.set(-b.frente, b.torce ?? 0, s * b.abre); co.rotation.set(-b.cot, 0, 0); };
    br(this.ombroE, this.cotE, p.bE ?? BR0, 1);
    br(this.ombroD, this.cotD, p.bD ?? BR0, -1);
    const pe = (o: THREE.Group, j: THREE.Group, b: Perna, s: number) => { o.rotation.set(-b.frente, 0, s * (b.abre ?? 0.04)); j.rotation.set(b.joelho ?? 0, 0, 0); };
    pe(this.pernaE, this.joelhoE, p.pE ?? PE0, 1);
    pe(this.pernaD, this.joelhoD, p.pD ?? PE0, -1);
    const c = p.cab ?? [0, 0, 0];
    this.cabeca.rotation.set(c[0] + (tr ? Math.sin(t * 83) * 0.05 * tr : 0), c[1], c[2]);
    const bo = p.bone ?? 0;
    this.bone.position.set(0, 0.085 + bo * 0.14, -bo * 0.02);
    this.bone.rotation.set(-bo * 0.35, 0, bo * 0.12);
    this.setRosto(p.olhos ?? "normal", p.boca ?? "nada");
  }

  /** posição de mundo da mão (para encaixar ferramenta) */
  mao(lado: "E" | "D", alvo = new THREE.Vector3()) {
    this.raiz.updateMatrixWorld(true);
    return (lado === "E" ? this.maoE : this.maoD).getWorldPosition(alvo);
  }
}
