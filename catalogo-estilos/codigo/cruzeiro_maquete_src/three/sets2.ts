import * as THREE from "three";
import type { Mundo, Estado } from "./mundo";
import { caixa, caixaR, cil, esfera, estrela, Kit, perfil, torno, V3 } from "./kit";
import { clamp, easeInOut, lerp, rng } from "./rng";
import { SetBase, Recursos, mesaMaquete } from "./sets";
import { Dirigente, PoseDir } from "./dirigente";
import { cnv, desenhaEstrela, FONTE_JORNAL, FONTE_PLACA, tex, texFoto, texMadeira, texPapel, texParede } from "./tex";

const P = (e: Estado, k: string, d = 0) => e.p?.[k] ?? d;

// ---------------------------------------------------------------------------
// contrato com a assinatura sendo escrita (0..1)
function texContrato() {
  const W = 600, H = 800;
  const { c, g } = cnv(W, H);
  const t = tex(c);
  const papel = texPapel(256, [244, 238, 222], 5).image as HTMLCanvasElement;
  const r = rng(4);
  const linhas: [number, number][] = [];
  for (let y = 210; y < 600; y += 26) linhas.push([y, 0.55 + r() * 0.45]);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80;
    pts.push([330 + u * 210 + Math.sin(u * 22) * 14, 690 - Math.sin(u * 15) * 22 - Math.cos(u * 31) * 8 + u * -10]);
  }
  let ant = -1;
  const desenha = (a: number) => {
    if (Math.abs(a - ant) < 0.004) return;
    ant = a;
    g.drawImage(papel, 0, 0, W, H);
    g.fillStyle = "#1b1712";
    g.textAlign = "center";
    g.font = `900 70px ${FONTE_JORNAL}`;
    g.fillText("CONTRATO", W / 2, 130);
    g.fillRect(150, 152, 300, 4);
    for (const [y, w] of linhas) {
      g.fillStyle = "rgba(40,34,26,0.5)";
      g.fillRect(60, y, (W - 120) * w, 7);
    }
    g.fillStyle = "#1b1712";
    g.fillRect(300, 715, 250, 3);
    const n = Math.floor(clamp(a) * pts.length);
    g.strokeStyle = "#0e1a5c";
    g.lineWidth = 6;
    g.lineCap = g.lineJoin = "round";
    g.beginPath();
    for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).call(g, pts[i][0], pts[i][1]);
    g.stroke();
    t.needsUpdate = true;
  };
  desenha(0);
  return { t, desenha };
}

function texPlaquinha(texto: string, fundo = "#2b1d14", letra = "#e9cf8a") {
  const W = 512, H = 128;
  const { c, g } = cnv(W, H);
  g.fillStyle = fundo;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = letra;
  g.lineWidth = 5;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = letra;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `400 54px ${FONTE_PLACA}`;
  g.fillText(texto, W / 2, H / 2 + 3, W - 50);
  return tex(c);
}

/** flâmula azul com as 5 estrelas (cores do Cruzeiro, sem escudo) */
function texFlamula() {
  const W = 512, H = 256;
  const { c, g } = cnv(W, H);
  g.fillStyle = "#1d4fc4";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(W, H / 2);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 26, H);
  const pts: [number, number, number][] = [[0, -1, 1], [0, 1.05, 1.1], [-0.85, 0, 0.9], [0.8, -0.2, 0.85], [0.35, 0.4, 0.6]];
  for (const [x, y, s] of pts) desenhaEstrela(g, 140 + x * 50, H / 2 + y * 52, 22 * s, "#ffffff");
  const t = tex(c);
  return t;
}

// ===========================================================================
// SALA DA DIRETORIA: o presidente assina o contrato antes dos rivais chegarem
export class Diretoria extends SetBase {
  pres: Dirigente;
  rivais: Dirigente[];
  contrato = texContrato();
  porta = new THREE.Group();
  caneta = new THREE.Group();
  constructor(k: Kit) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A";
    const mad = texMadeira(0.75);
    mad.repeat.set(2.5, 2.5);
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), k.mat({ map: mad, rough: 0.55, semContorno: true, tom: 0.6 }));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    g.add(piso);
    // parede do fundo: lambri + papel de parede
    const pp = texParede("#9fb3a2", "#8fa595");
    pp.repeat.set(5, 1.5);
    const mParede = k.mat({ map: pp, rough: 0.9, semContorno: true, tom: 0.85 });
    const mLambri = k.mat({ map: texMadeira(0.6), rough: 0.5, tom: 0.45 });
    k.m(caixa(9, 3.2, 0.12), mParede, 0, g, [0, 2.6, -2.1]);
    k.m(caixa(9, 1.0, 0.16), mLambri, 2.4, g, [0, 0.5, -2.05]);
    k.m(caixa(9, 0.06, 0.2), mLambri, 2, g, [0, 1.02, -2.02]);
    // porta (abre para dentro, à direita)
    const mPorta = k.mat({ map: texMadeira(0.85), rough: 0.5, tom: 0.5 });
    k.m(caixa(1.15, 2.25, 0.2), k.mat({ color: 0x3a2618, rough: 0.6, tom: 0.3 }), 2.4, g, [1.45, 1.12, -2.0]);
    k.m(caixa(0.95, 2.1, 0.05), k.mat({ color: 0x14100c, rough: 0.9, tom: 0.05 }), 0, g, [1.45, 1.05, -1.92]);
    this.porta.position.set(1.45 - 0.475, 0, -1.88);
    g.add(this.porta);
    k.m(caixa(0.95, 2.1, 0.06), mPorta, 2.4, this.porta, [0.475, 1.05, 0]);
    k.m(esfera(0.035), k.mat({ color: 0xc9a14a, metal: 0.9, rough: 0.3 }), 1.6, this.porta, [0.85, 1.05, 0.05]);
    // janela à esquerda
    k.m(caixa(1.0, 1.2, 0.08), k.mat({ color: 0xcfe2f0, emissive: 0xcfe2f0, ei: A ? 0.35 : 0.5, rough: 0.2, tom: 1 }), 2, g, [-1.6, 1.9, -2.02]);
    k.m(caixa(0.06, 1.2, 0.12), mLambri, 1.6, g, [-1.6, 1.9, -1.98]);
    k.m(caixa(1.0, 0.06, 0.12), mLambri, 1.6, g, [-1.6, 1.9, -1.98]);
    // flâmula azul com estrelas
    const fl = k.m(new THREE.PlaneGeometry(0.9, 0.45), k.mat({ map: texFlamula(), rough: 0.8, transparent: true, side: THREE.DoubleSide, tinta: true }), 0, g, [-0.1, 2.35, -2.03], [0, 0, -0.08]);
    (fl.material as THREE.Material).alphaTest = 0.5;
    // mesa
    const tampo = texMadeira(0.7);
    const mesa = new THREE.Group();
    mesa.position.set(0, 0, -0.35);
    g.add(mesa);
    k.m(caixaR(1.9, 0.08, 0.85, 0.02), k.mat({ map: tampo, rough: 0.4, clear: 0.6, tom: 0.5 }), 3, mesa, [0, 0.76, 0]);
    k.m(caixa(1.8, 0.66, 0.06), k.mat({ map: tampo, rough: 0.5, tom: 0.45 }), 2.6, mesa, [0, 0.4, 0.38]);
    for (const x of [-0.82, 0.82]) k.m(caixa(0.12, 0.72, 0.78), k.mat({ map: tampo, rough: 0.5, tom: 0.45 }), 2.6, mesa, [x, 0.36, 0]);
    // contrato, tinteiro e placa PRESIDENTE
    k.m(new THREE.PlaneGeometry(0.3, 0.4), k.mat({ map: this.contrato.t, rough: 0.9, semContorno: true, tom: 1 }), 0, mesa, [0.0, 0.826, 0.08], [-Math.PI / 2, 0, 0.05]);
    k.m(cil(0.05, 0.055, 0.07, 24), k.mat({ color: 0x14141c, rough: 0.15, clear: 1, tom: 0.1 }), 2, mesa, [0.42, 0.835, 0.0]);
    const pl = new THREE.Group();
    pl.position.set(-0.5, 0.8, 0.22);
    pl.rotation.y = 0.15;
    mesa.add(pl);
    k.m(caixa(0.42, 0.11, 0.05), k.mat({ map: texPlaquinha("PRESIDENTE"), rough: 0.4, clear: 0.6, tom: 0.3 }), 2, pl, [0, 0.055, 0], [-0.35, 0, 0]);
    // caneta-tinteiro
    k.m(cil(0.009, 0.011, 0.16, 12), k.mat({ color: 0x14141c, rough: 0.25, clear: 1, tom: 0.1 }), 1.6, this.caneta, [0, 0.08, 0]);
    k.m(new THREE.ConeGeometry(0.01, 0.04, 12), k.mat({ color: 0xd6b25a, metal: 0.9, rough: 0.25 }), 1.4, this.caneta, [0, -0.015, 0], [Math.PI, 0, 0]);
    // personagens
    this.pres = new Dirigente(k, { terno: 0x2b2f3a, gravata: 0x1d4fc4, chapeu: 0x3c332b, pele: 0xe8b996 });
    this.pres.mao.add(this.caneta);
    this.caneta.rotation.set(0.6, 0, 0);
    g.add(this.pres.raiz);
    this.rivais = [
      new Dirigente(k, { terno: 0x6b6258, gravata: 0x7a6a50, chapeu: 0x5a5148, pele: 0xd9a27e, bigode: false }),
      new Dirigente(k, { terno: 0x4a4e57, gravata: 0x5d5d5d, chapeu: 0x2e2e33, pele: 0xf0c8a8 }),
    ];
    this.rivais.forEach((r) => g.add(r.raiz));
    if (A) mesaMaquete(k, g, "quadrada", 4.5, 0);
    this.fundo = new THREE.Color(A ? 0x2a1d16 : 0x2a2420);
  }
  luz(m: Mundo) {
    const A = this.k.dir === "A";
    m.sol.color.set(A ? 0xffd2a0 : 0xfff2dc);
    m.sol.intensity = A ? 2.4 : 2.3;
    m.sol.position.set(-3, 5, 4);
    m.sol.target.position.set(0, 0.8, -0.8);
    Object.assign(m.sol.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1, near: 0.5, far: 20 });
    m.sol.shadow.camera.updateProjectionMatrix();
    m.hemi.color.set(0xfff0dd);
    m.hemi.groundColor.set(0x6b4a33);
    m.hemi.intensity = A ? 0.75 : 1.1;
    m.contra.color.set(0xd8e6ff);
    m.contra.intensity = A ? 0.9 : 1.0;
    m.contra.position.set(-2, 3, -4);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    this.contrato.desenha(P(e, "assina", 0));
    this.porta.rotation.y = -P(e, "porta", 0) * 1.6;
    const pr = (e.p as unknown as { pres?: PoseDir })?.pres;
    void pr;
  }
  // poses vêm por fora (cenas.ts), via m.aplicaDirigentes
  poses(pres: PoseDir, rivais: PoseDir[], t: number) {
    this.pres.aplica(pres, t);
    this.rivais.forEach((r, i) => r.aplica(rivais[i] ?? { vis: false }, t));
  }
}

// ===========================================================================
// PRENSA: a página da Folha de Minas sai dos rolos com a Rapôsa
export class Prensa extends SetBase {
  rolos: THREE.Mesh[] = [];
  folha: THREE.Mesh;
  constructor(k: Kit, rec: Recursos) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A";
    const mFerro = k.mat({ color: 0x23302a, rough: 0.45, metal: 0.4, clear: 0.5, tom: 0.25 });
    const mAco = k.mat({ color: 0xa9adb3, metal: 0.85, rough: 0.28, tom: 0.7 });
    const mOuro = k.mat({ color: 0xc9a14a, metal: 0.9, rough: 0.3, tom: 0.6 });
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), k.mat({ color: 0x4a443c, rough: 0.9, semContorno: true, tom: 0.45 }));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    g.add(piso);
    k.m(caixa(9, 4, 0.1), k.mat({ map: texParede("#7d6a55", "#735f4b"), rough: 0.9, semContorno: true, tom: 0.6 }), 0, g, [0, 2, -2.2]);
    // corpo da prensa
    for (const s of [-1, 1]) {
      k.m(caixaR(0.14, 1.5, 1.4, 0.03), mFerro, 2.8, g, [s * 0.85, 0.75, -0.6]);
      k.m(cil(0.18, 0.18, 0.08, 32), mOuro, 2, g, [s * 0.93, 1.05, -0.6], [0, 0, Math.PI / 2]);
    }
    k.m(caixaR(1.85, 0.12, 1.4, 0.03), mFerro, 2.8, g, [0, 1.48, -0.6]);
    for (const [y, z] of [[1.05, -0.62], [0.82, -0.62]] as [number, number][]) {
      const r = k.m(cil(0.12, 0.12, 1.56, 48), mAco, 2.6, g, [0, y, z], [0, 0, Math.PI / 2]);
      this.rolos.push(r);
    }
    // bandeja de saída
    k.m(caixaR(1.5, 0.05, 1.2, 0.02), k.mat({ map: texMadeira(0.8), rough: 0.5, tom: 0.5 }), 2.4, g, [0, 0.9, 0.35], [0.12, 0, 0]);
    // pilha de jornais na mesa
    const pg = texJornalComRaposa(rec.desenho, 6);
    for (let i = 0; i < 6; i++) k.m(new THREE.PlaneGeometry(0.85, 1.12), k.mat({ map: pg, rough: 0.9, semContorno: true, tom: 1 }), 0, g, [1.6 + (i % 2) * 0.02, 0.01 + i * 0.006, 0.5 - i * 0.01], [-Math.PI / 2, 0, 0.1 + i * 0.03]);
    // a folha que sai
    this.folha = k.m(new THREE.PlaneGeometry(1.0, 1.32), k.mat({ map: texJornalComRaposa(rec.desenho, 3), color: A ? 0xb4aea6 : 0xffffff, rough: 0.9, semContorno: true, tom: 1, side: THREE.DoubleSide }), 0, g);
    this.folha.receiveShadow = true;
    if (A) mesaMaquete(k, g, "quadrada", 4.5, 0);
    this.fundo = new THREE.Color(0x1d1712);
  }
  luz(m: Mundo) {
    const A = this.k.dir === "A";
    m.sol.color.set(A ? 0xffd7a8 : 0xfff2dc);
    m.sol.intensity = A ? 2.2 : 2.2;
    m.sol.position.set(-2, 5, 3);
    m.sol.target.position.set(0, 0.9, 0);
    Object.assign(m.sol.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -1.5, near: 0.5, far: 20 });
    m.sol.shadow.camera.updateProjectionMatrix();
    m.hemi.color.set(0xffe9cc);
    m.hemi.groundColor.set(0x4a3a2a);
    m.hemi.intensity = A ? 0.7 : 1.1;
    m.contra.color.set(0xffe2b8);
    m.contra.intensity = 1.2;
    m.contra.position.set(2, 3, -3);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    const s = clamp(P(e, "sai", 0));
    this.rolos.forEach((r, i) => (r.rotation.x = (i ? -1 : 1) * t * 6));
    // a folha sai dos rolos (vertical) e deita na bandeja
    // a folha cresce para fora dos rolos, deitada na bandeja inclinada
    const sy = lerp(0.04, 1, easeInOut(clamp(s / 0.6)));
    const L = 1.32 * sy;
    const ang = 0.12;
    this.folha.rotation.set(-Math.PI / 2 + ang, 0, 0);
    this.folha.scale.set(1, sy, 1);
    const zr = lerp(-0.48, 0.14, easeInOut(clamp((s - 0.6) / 0.4)));
    const zc = zr + Math.cos(ang) * (L / 2);
    this.folha.position.set(0, 0.95 + (0.35 - zc) * Math.tan(ang) + 0.004, zc);
  }
}

/** página da Folha de Minas com o desenho da Rapôsa no quadro de charge */
export function texJornalComRaposa(desenho: HTMLImageElement, seed = 3) {
  const W = 900, H = 1200;
  const { c, g } = cnv(W, H);
  const papel = texPapel(256, [236, 228, 208], seed).image as HTMLCanvasElement;
  g.drawImage(papel, 0, 0, W, H);
  g.fillStyle = "#1b1712";
  g.textAlign = "center";
  g.font = `900 112px ${FONTE_JORNAL}`;
  g.fillText("FOLHA DE MINAS", W / 2, 150, W - 60);
  g.fillRect(30, 178, W - 60, 6);
  g.fillRect(30, 190, W - 60, 2);
  g.font = `italic 600 26px ${FONTE_JORNAL}`;
  g.fillText("Belo Horizonte", W / 2, 228);
  g.fillRect(30, 244, W - 60, 2);
  // quadro grande com a Rapôsa
  const bx = 250, by = 280, bw = 400, bh = 520;
  g.strokeStyle = "#1b1712";
  g.lineWidth = 4;
  g.strokeRect(bx, by, bw, bh);
  g.globalCompositeOperation = "multiply";
  g.drawImage(desenho, bx + 10, by + 10, bw - 20, bh - 20);
  g.globalCompositeOperation = "source-over";
  const r = rng(seed);
  const colunas: [number, number, number][] = [[30, 200, 280], [670, 200, 280], [30, 840, 300], [460, 840, 300]];
  for (const [x0, w, y0] of colunas) {
    let y = y0;
    const yMax = y0 === 280 ? 800 : H - 40;
    const ww = y0 === 280 ? w : 410;
    while (y < yMax) {
      if (r() < 0.1) {
        g.fillStyle = "#1b1712";
        g.fillRect(x0, y, ww * (0.6 + r() * 0.4), 12);
        y += 26;
      } else {
        g.fillStyle = "rgba(40,34,26,0.55)";
        g.fillRect(x0, y, ww * (r() < 0.15 ? 0.5 + r() * 0.4 : 1), 5);
        y += 13;
      }
    }
  }
  return tex(c);
}

// ===========================================================================
// DOCUMENTO SOBRE A MESA: a foto do Palestra (1922) e o mapa celeste de 1602
export class Documento extends SetBase {
  doc: THREE.Mesh;
  foto: { base: HTMLCanvasElement; verde: HTMLCanvasElement; c: HTMLCanvasElement; g: CanvasRenderingContext2D; t: THREE.Texture; asp: number };
  mapa: THREE.Texture;
  mapaAsp: number;
  raposao: { t: THREE.Texture; asp: number };
  matDoc: THREE.MeshStandardMaterial | THREE.MeshToonMaterial | THREE.MeshPhysicalMaterial;
  vAnt = -1;
  docAnt = -1;
  lupa = new THREE.Group();
  constructor(k: Kit, rec: Recursos) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A";
    const mad = texMadeira(0.95);
    mad.repeat.set(2, 2);
    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), k.mat({ map: mad, rough: 0.5, clear: 0.3, semContorno: true, tom: 0.6 }));
    mesa.rotation.x = -Math.PI / 2;
    mesa.receiveShadow = true;
    g.add(mesa);
    this.foto = fotoPalestra(rec.palestra);
    const mc = document.createElement("canvas");
    const im = rec.blaeu;
    mc.width = im.width;
    mc.height = im.height;
    mc.getContext("2d")!.drawImage(im, 0, 0);
    this.mapa = tex(mc);
    this.mapaAsp = im.width / im.height;
    // foto oficial da estreia do Raposão (2003), sem sépia, com borda fina de papel fotográfico
    const fr = texFoto(rec.raposao, 0, 0.03);
    this.raposao = { t: fr.t, asp: fr.asp };
    this.matDoc = k.mat({ map: this.foto.t, color: A ? 0xc4beb6 : 0xffffff, rough: 0.85, semContorno: true, tom: 1 }) as THREE.MeshPhysicalMaterial;
    this.doc = new THREE.Mesh(new THREE.BoxGeometry(1, 0.006, 1), [this.matDoc, this.matDoc, this.matDoc, this.matDoc, this.matDoc, this.matDoc]);
    this.doc.material = this.matDoc;
    this.doc.castShadow = this.doc.receiveShadow = true;
    g.add(this.doc);
    // lupa
    const mLat = k.mat({ color: 0xb58a3c, metal: 0.9, rough: 0.3 });
    k.m(new THREE.TorusGeometry(0.22, 0.022, 16, 64), mLat, 2, this.lupa, [0, 0, 0], [Math.PI / 2, 0, 0]);
    k.m(cil(0.02, 0.025, 0.42, 16), k.mat({ color: 0x2a1a10, rough: 0.4 }), 2, this.lupa, [0.4, 0, 0.18], [Math.PI / 2, 0, -1.15]);
    const vidro = new THREE.Mesh(cil(0.205, 0.205, 0.01, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1 }));
    this.lupa.add(vidro);
    this.lupa.position.set(0.95, 0.06, 0.55);
    g.add(this.lupa);
    if (A) mesaMaquete(k, g, "quadrada", 5, -0.0);
    this.fundo = new THREE.Color(0x2a1d16);
  }
  luz(m: Mundo) {
    const A = this.k.dir === "A";
    m.sol.color.set(A ? 0xffd2a0 : 0xfff2dc);
    m.sol.intensity = A ? 2.0 : 2.2;
    m.sol.position.set(-2.5, 5, 2);
    m.sol.target.position.set(0, 0, 0);
    Object.assign(m.sol.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 20 });
    m.sol.shadow.camera.updateProjectionMatrix();
    m.hemi.color.set(0xfff0dd);
    m.hemi.groundColor.set(0x6b4a33);
    m.hemi.intensity = A ? 0.6 : 1.1;
    m.contra.intensity = 0.6;
    m.contra.position.set(2, 3, -3);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    const qual = P(e, "doc", 0);
    if (qual !== this.docAnt) {
      this.docAnt = qual;
      this.matDoc.map = qual === 2 ? this.raposao.t : qual ? this.mapa : this.foto.t;
      this.matDoc.needsUpdate = true;
      const asp = qual === 2 ? this.raposao.asp : qual ? this.mapaAsp : this.foto.asp;
      const L = 1.5;
      this.doc.scale.set(asp >= 1 ? L : L * asp, 1, asp >= 1 ? L / asp : L);
      this.lupa.visible = qual === 1;
    }
    const v = clamp(P(e, "verde", 0));
    if (!qual && Math.abs(v - this.vAnt) > 0.003) {
      this.vAnt = v;
      const { g, base, verde, t: tx, c } = this.foto;
      g.globalAlpha = 1;
      g.drawImage(base, 0, 0);
      g.globalAlpha = v;
      g.drawImage(verde, 0, 0);
      g.globalAlpha = 1;
      void c;
      tx.needsUpdate = true;
    }
    this.doc.position.set(0, 0.003, 0);
    this.doc.rotation.y = P(e, "giro", 0.04);
  }
}

// foto do time de 1922 em sépia, com versão em que só as camisas ganham o verde
function fotoPalestra(img: HTMLImageElement) {
  const f = texFoto(img, 0.92, 0.05);
  const W = f.c.width, H0 = f.c.height;
  // borda de baixo maior para a legenda escrita à mão
  const H = Math.round(H0 * 1.1);
  const base = document.createElement("canvas");
  base.width = W;
  base.height = H;
  const gb = base.getContext("2d")!;
  gb.fillStyle = "#efe6d2";
  gb.fillRect(0, 0, W, H);
  gb.drawImage(f.c, 0, 0);
  gb.fillStyle = "#3a2c1c";
  gb.textAlign = "center";
  gb.font = `italic 600 ${Math.round(W * 0.05)}px ${FONTE_JORNAL}`;
  gb.fillText("Palestra Itália, 1922", W / 2, H0 + (H - H0) * 0.55);
  // máscara das camisas (polígonos na foto original 690x782)
  const sx = (W * 0.9) / 690, sy = (H0 - W * 0.1) / 782, ox = W * 0.05, oy = W * 0.05;
  const polis: [number, number][][] = [
    [[195, 150], [270, 105], [320, 95], [390, 105], [450, 150], [460, 240], [400, 262], [250, 262], [200, 240]],
    [[305, 290], [380, 262], [470, 262], [540, 300], [560, 420], [480, 440], [420, 430], [330, 420], [310, 350]],
    [[10, 400], [80, 370], [130, 365], [205, 380], [240, 470], [240, 560], [160, 600], [60, 600], [20, 560]],
    [[205, 340], [235, 320], [310, 335], [320, 420], [300, 470], [240, 470]],
    [[300, 520], [355, 490], [420, 500], [480, 520], [510, 600], [500, 700], [300, 690], [290, 600]],
    [[510, 540], [560, 520], [620, 520], [690, 540], [690, 700], [560, 700], [520, 640]],
  ];
  const mk = document.createElement("canvas");
  mk.width = W;
  mk.height = H;
  const gm = mk.getContext("2d")!;
  gm.filter = "blur(5px)";
  gm.fillStyle = "#fff";
  for (const p of polis) {
    gm.beginPath();
    p.forEach(([x, y], i) => (i ? gm.lineTo : gm.moveTo).call(gm, ox + x * sx, oy + y * sy));
    gm.closePath();
    gm.fill();
  }
  const verde = document.createElement("canvas");
  verde.width = W;
  verde.height = H;
  const gv = verde.getContext("2d")!;
  gv.drawImage(base, 0, 0);
  const a = gv.getImageData(0, 0, W, H), mm = gm.getImageData(0, 0, W, H);
  for (let i = 0; i < a.data.length; i += 4) {
    const m = mm.data[i] / 255;
    if (m <= 0) continue;
    const L = (a.data[i] * 0.299 + a.data[i + 1] * 0.587 + a.data[i + 2] * 0.114) / 255;
    const k = m * Math.max(0, Math.min(1, (0.5 - L) / 0.22));
    // verde da primeira camisa, mantendo o claro-escuro da foto
    const vr = 40 + L * 120, vg = 120 + L * 170, vb = 70 + L * 110;
    a.data[i] = a.data[i] + (vr * 0.9 - a.data[i]) * k;
    a.data[i + 1] = a.data[i + 1] + (vg * 0.9 - a.data[i + 1]) * k;
    a.data[i + 2] = a.data[i + 2] + (vb * 0.9 - a.data[i + 2]) * k;
  }
  gv.putImageData(a, 0, 0);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.drawImage(base, 0, 0);
  return { base, verde, c, g, t: tex(c), asp: W / H };
}
void estrela;
void torno;
void perfil;
void ({} as V3);
