import * as THREE from "three";
import type { Mundo, Estado } from "./mundo";
import { caixa, caixaR, capsula, cil, esfera, estrela, Kit, perfil, torno, tubo, V3 } from "./kit";
import { clamp, easeInOut, easeOut, lerp, rng, smooth } from "./rng";
import { CRUZ } from "./raposa";
import {
  cnv, tex, FONTE_PLACA, texPapel,
  texBrilho, texCeu, texCeuPintado, texCorte, texDesenho, texFoto, texGrama, texJornal, texMadeira, texParede,
  texPedras, texPlaca, texReboco, texRefletor, texRotulo, texTorcida,
} from "./tex";

export type Recursos = { desenho: HTMLImageElement; mangabeira: HTMLImageElement; palestra: HTMLImageElement; mascotes: HTMLImageElement; blaeu: HTMLImageElement; raposao: HTMLImageElement };
export type SetNome = "estadio" | "prancheta" | "rua" | "ceu" | "virada" | "diretoria" | "prensa" | "documento";

export abstract class SetBase {
  grupo = new THREE.Group();
  fundo: THREE.Color | THREE.Texture | null = null;
  constructor(public k: Kit) {}
  abstract luz(m: Mundo, t: number, e: Estado): void;
  aplica(m: Mundo, _t: number, _e: Estado) {
    m.scene.background = this.fundo;
    m.scene.fog = null;
  }
}

const P = (e: Estado, k: string, d = 0) => e.p?.[k] ?? d;
const aditivo = (map: THREE.Texture, cor: THREE.ColorRepresentation = 0xffffff, op = 1) =>
  new THREE.SpriteMaterial({ map, color: cor, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });

// Base da maquete (A): tábua com corte lateral de terra sobre a mesa de madeira, parede do ateliê ao fundo.
export function mesaMaquete(k: Kit, g: THREE.Group, forma: "redonda" | "quadrada", tam: number, y0 = 0) {
  const esp = 0.45;
  const topo = k.mat({ color: 0x4fa246, rough: 0.8 });
  const corte = texCorte();
  if (forma === "redonda") {
    corte.repeat.set(6, 1);
    const lado = new THREE.Mesh(cil(tam, tam, esp, 128, true), k.mat({ map: corte, rough: 0.85 }));
    lado.position.y = y0 - esp / 2;
    lado.receiveShadow = true;
    g.add(lado);
    void topo;
  } else {
    corte.repeat.set(2, 1);
    for (const [x, z, ry, w] of [[0, tam, 0, tam * 2], [tam, 0, Math.PI / 2, tam * 2], [-tam, 0, -Math.PI / 2, tam * 2]] as [number, number, number, number][]) {
      const lado = new THREE.Mesh(new THREE.PlaneGeometry(w, esp), k.mat({ map: corte, rough: 0.85 }));
      lado.position.set(x, y0 - esp / 2, z);
      lado.rotation.y = ry;
      lado.receiveShadow = true;
      g.add(lado);
    }
  }
  const mad = texMadeira();
  mad.repeat.set(3, 3);
  const mesa = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), k.mat({ map: mad, rough: 0.55, clear: 0.3 }));
  mesa.rotation.x = -Math.PI / 2;
  mesa.position.y = y0 - esp;
  mesa.receiveShadow = true;
  g.add(mesa);
  // parede do ateliê, bem desfocada pelo tilt-shift
  const pg = document.createElement("canvas");
  pg.width = 16;
  pg.height = 256;
  const c = pg.getContext("2d")!;
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#3a2a22");
  gr.addColorStop(0.6, "#7a5a44");
  gr.addColorStop(1, "#b08a68");
  c.fillStyle = gr;
  c.fillRect(0, 0, 16, 256);
  const tp = new THREE.CanvasTexture(pg);
  tp.colorSpace = THREE.SRGBColorSpace;
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ map: tp }));
  parede.position.set(0, 8, -22);
  g.add(parede);
}

// ===========================================================================
// ESTÁDIO À NOITE (gancho, 2003, marcação, loop)
export class Estadio extends SetBase {
  feixes: THREE.Mesh[] = [];
  brilhos: THREE.Sprite[] = [];
  blocos: THREE.Group[] = [];
  letreiro!: THREE.Group;
  gol = new THREE.Group();
  rede: THREE.Mesh;
  redeBase: Float32Array;
  bola: THREE.Mesh;
  cartao = new THREE.Group();
  folhaCartao: THREE.Group;
  confete: THREE.InstancedMesh;
  confSem: Float32Array;
  constructor(k: Kit, rec: Recursos) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A", C = k.dir === "C";
    const esc = A ? 0.32 : 1; // na maquete o estádio é miniatura em volta do boneco
    // gramado
    const gt = texGrama(A ? 14 : 22, C ? "#cfcfcf" : "#2f8a34", C ? "#e6e6e6" : "#3fa043", A ? 0.04 : 0.05);
    if (!A) {
      gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
    }
    const raioCampo = A ? 8.6 : 60;
    const grama = new THREE.Mesh(A ? new THREE.CircleGeometry(raioCampo, 128) : new THREE.PlaneGeometry(120, 120), k.mat({ map: gt, rough: 0.85, semContorno: true, tom: 0.9 }));
    grama.rotation.x = -Math.PI / 2;
    grama.receiveShadow = true;
    g.add(grama);
    // linhas do campo: círculo central e linha do meio
    const mLinha = k.mat({ color: 0xf4f4ee, rough: 0.7, semContorno: true, tom: 0.25 });
    const anel = new THREE.Mesh(new THREE.RingGeometry(3.0 * (A ? 0.55 : 1), 3.0 * (A ? 0.55 : 1) + (A ? 0.035 : 0.09), 160), mLinha);
    anel.rotation.x = -Math.PI / 2;
    anel.position.set(0, 0.004, A ? -0.9 : -1.6);
    g.add(anel);
    const meio = new THREE.Mesh(new THREE.PlaneGeometry(A ? 10.5 : 120, A ? 0.035 : 0.09), mLinha);
    meio.rotation.x = -Math.PI / 2;
    meio.position.set(0, 0.004, A ? -0.9 : -1.6);
    g.add(meio);
    // arquibancada (anel) com torcida azul e branca
    const R0 = A ? 6.3 : 22, R1 = A ? 8.0 : 34, H1 = A ? 2.2 : 13;
    const tor = texTorcida(k.dir);
    tor.repeat.set(A ? 3 : 7, 1);
    const anelArq = torno(Array.from({ length: 14 }, (_, i) => [lerp(R0, R1, i / 13), lerp(H1 * 0.12, H1, i / 13)] as [number, number]), 160);
    const arq = new THREE.Mesh(anelArq, k.mat({ map: tor, rough: 0.9, side: THREE.DoubleSide, semContorno: true, tom: 0.7 }));
    arq.receiveShadow = true;
    g.add(arq);
    // mureta
    const mur = new THREE.Mesh(cil(R0 + 0.02, R0 + 0.02, H1 * 0.12, 160, true), k.mat({ color: 0x1d4fc4, rough: 0.6, side: THREE.DoubleSide, semContorno: true, tinta: !C, tom: 0.55 }));
    mur.position.y = H1 * 0.06;
    g.add(mur);
    // cobertura (anel do Mineirão, só a forma)
    const cob = new THREE.Mesh(torno([[R1 + 0.3, H1 + 0.2], [R1 - (R1 - R0) * 0.25, H1 + 0.9 * (A ? 0.12 : 1)], [R1 - (R1 - R0) * 0.27, H1 + 1.1 * (A ? 0.12 : 1)], [R1 + 0.4, H1 + 0.6 * (A ? 0.12 : 1)]], 160), k.mat({ color: C ? 0x9a9a9a : 0xd8dbe2, rough: 0.6, side: THREE.DoubleSide, semContorno: true, tom: 0.75 }));
    g.add(cob);
    // pilares externos (lâminas do Mineirão)
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const p = new THREE.Mesh(caixa((A ? 0.06 : 0.5), H1 + (A ? 0.15 : 1.2), A ? 0.16 : 1.4), k.mat({ color: C ? 0xb0b0b0 : 0xc9ccd4, rough: 0.7, semContorno: true, tom: 0.8 }));
      p.position.set(Math.cos(a) * (R1 + (A ? 0.12 : 1)), (H1 + (A ? 0.15 : 1.2)) / 2, Math.sin(a) * (R1 + (A ? 0.12 : 1)));
      p.rotation.y = -a;
      g.add(p);
    }
    // refletores (4 bancos) atrás do campo
    const tr = texRefletor();
    const brilho = texBrilho("255,246,220");
    for (const ang of [-120, -95, -70, -45]) {
      const a = (ang * Math.PI) / 180;
      const x = Math.cos(a) * (R1 - (A ? 0.3 : 2)), z = Math.sin(a) * (R1 - (A ? 0.3 : 2));
      const y = H1 + (A ? 0.55 : 4.2);
      const ban = new THREE.Mesh(caixa(A ? 0.5 : 4.2, A ? 0.26 : 2.0, A ? 0.06 : 0.4), new THREE.MeshBasicMaterial({ map: tr, toneMapped: false }));
      ban.position.set(x, y, z);
      ban.lookAt(0, 0.5, 0);
      g.add(ban);
      if (A) {
        // poste do refletor da maquete
        const poste = this.k.m(cil(0.025, 0.035, y, 12), k.mat({ color: 0x8a8f99, metal: 0.6, rough: 0.4 }), 0, g, [x * 1.02, y / 2, z * 1.02]);
        void poste;
      }
      const sp = new THREE.Sprite(aditivo(brilho, 0xfff2d8, C ? 0 : 0.95));
      sp.position.set(x, y, z);
      sp.scale.setScalar(A ? 2.2 : 16);
      g.add(sp);
      this.brilhos.push(sp);
      // feixe de luz até o gramado
      if (!C) {
        const alvo = new THREE.Vector3(0, 0, 0);
        const ori = new THREE.Vector3(x, y, z);
        const L = ori.distanceTo(alvo);
        const fg = new THREE.ConeGeometry(A ? 1.2 : 7, L, 32, 1, true);
        fg.translate(0, -L / 2, 0);
        const fm = new THREE.MeshBasicMaterial({ color: 0xbfd2ff, transparent: true, opacity: A ? 0.035 : 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const feixe = new THREE.Mesh(fg, fm);
        feixe.position.copy(ori);
        feixe.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), alvo.clone().sub(ori).normalize());
        g.add(feixe);
        this.feixes.push(feixe);
      }
    }
    // torcedores bonecos na maquete (miniaturas de torcida na arquibancada)
    if (A) {
      const r = rng(5);
      const N = 1700;
      const corpo = new THREE.InstancedMesh(capsula(0.028, 0.035), k.mat({ color: 0xffffff, rough: 0.5 }), N);
      const cab = new THREE.InstancedMesh(esfera(0.024, 12, 10), k.mat({ color: 0xe9b896, rough: 0.5 }), N);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
      const cores = [0x1d4fc4, 0x2a62da, 0xffffff, 0x163e9c, 0xf2f5ff];
      for (let i = 0; i < N; i++) {
        const fila = Math.floor(r() * 9);
        const u = fila / 9;
        const rr = lerp(R0 + 0.12, R1 - 0.12, u);
        const y = lerp(H1 * 0.12, H1, u) + 0.05;
        const a = r() * Math.PI * 2;
        const p = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
        m4.compose(p, q, s);
        corpo.setMatrixAt(i, m4);
        corpo.setColorAt(i, new THREE.Color(cores[Math.floor(r() * cores.length)]));
        m4.compose(p.clone().add(new THREE.Vector3(0, 0.055, 0)), q, s);
        cab.setMatrixAt(i, m4);
      }
      corpo.castShadow = cab.castShadow = true;
      g.add(corpo, cab);
      mesaMaquete(k, g, "redonda", raioCampo);
      this.fundo = null;
    } else {
      this.fundo = C ? new THREE.Color(0xf0e8d6) : texCeu(["#060b22", "#0c1a4a", "#1d3170"], 160);
    }
    // ---- blocos de brinquedo com as letras C R U Z E I R O
    const L = "CRUZEIRO".split("");
    const b = 0.15;
    const HL = 1.5; // altura do letreiro (tábua sobre dois postes, atrás da raposa)
    this.letreiro = new THREE.Group();
    this.letreiro.visible = false;
    g.add(this.letreiro);
    {
      const mMad = k.mat({ map: texMadeira(), rough: 0.5, tom: 0.5 });
      k.m(caixa(1.55, 0.04, 0.2), mMad, 2, this.letreiro, [0, HL - 0.02, -0.75]);
      for (const sx of [-0.7, 0.7]) k.m(cil(0.02, 0.025, HL, 12), mMad, 2, this.letreiro, [sx, HL / 2, -0.8]);
    }
    const mLado = k.mat({ color: 0x1d4fc4, rough: 0.45, tinta: true });
    L.forEach((ch, i) => {
      const { c, g: gg } = cnv(256, 256);
      gg.fillStyle = "#1d4fc4";
      gg.fillRect(0, 0, 256, 256);
      gg.strokeStyle = "#ffffff";
      gg.lineWidth = 12;
      gg.strokeRect(14, 14, 228, 228);
      gg.fillStyle = "#ffffff";
      gg.textAlign = "center";
      gg.textBaseline = "middle";
      gg.font = `400 190px ${FONTE_PLACA}`;
      gg.fillText(ch, 128, 140);
      const mf = k.mat({ map: tex(c), rough: 0.45, tinta: true });
      const piv = new THREE.Group();
      const x = (i - (L.length - 1) / 2) * (b + 0.022);
      piv.position.set(x, HL, -0.75 + b / 2);
      piv.userData.h = HL;
      piv.userData.x0 = x;
      g.add(piv);
      const m = new THREE.Mesh(caixa(b, b, b), [mLado, mLado, mLado, mLado, mf, mLado]);
      m.position.set(0, b / 2, -b / 2);
      m.castShadow = m.receiveShadow = true;
      k.contorno(m as unknown as THREE.Mesh, 2);
      piv.add(m);
      piv.visible = false;
      this.blocos.push(piv);
    });
    // ---- gol com rede
    const mTrave = k.mat({ color: 0xffffff, rough: 0.35, tom: 1 });
    const GW = 1.7, GH = 0.62, GD = 0.45;
    this.gol.position.set(0, 0, -2.5);
    g.add(this.gol);
    for (const sx of [-1, 1]) k.m(cil(0.028, 0.028, GH, 16), mTrave, 2, this.gol, [(sx * GW) / 2, GH / 2, 0]);
    k.m(cil(0.028, 0.028, GW + 0.056, 16), mTrave, 2, this.gol, [0, GH, 0], [0, 0, Math.PI / 2]);
    const { c: rc, g: rg } = cnv(256, 256);
    rg.strokeStyle = "rgba(255,255,255,0.95)";
    rg.lineWidth = 5;
    for (let i = 0; i <= 256; i += 32) {
      rg.beginPath();
      rg.moveTo(i, 0);
      rg.lineTo(i, 256);
      rg.stroke();
      rg.beginPath();
      rg.moveTo(0, i);
      rg.lineTo(256, i);
      rg.stroke();
    }
    const rt = tex(rc);
    rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
    rt.repeat.set(10, 4);
    const geoR = new THREE.PlaneGeometry(GW, GH, 24, 10);
    const mRede = k.mat({ map: rt, transparent: true, side: THREE.DoubleSide, rough: 0.8, semContorno: true, tom: 1 });
    mRede.alphaTest = 0.3;
    this.rede = new THREE.Mesh(geoR, mRede);
    this.rede.position.set(0, GH / 2, -GD);
    this.redeBase = Float32Array.from(geoR.attributes.position.array as Float32Array);
    this.gol.add(this.rede);
    for (const sx of [-1, 1]) {
      const lado = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), mRede);
      lado.position.set((sx * GW) / 2, GH / 2, -GD / 2);
      lado.rotation.y = Math.PI / 2;
      this.gol.add(lado);
    }
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), mRede);
    teto.position.set(0, GH, -GD / 2);
    teto.rotation.x = Math.PI / 2;
    this.gol.add(teto);
    this.gol.visible = false;
    // bola
    const { c: bc, g: bg } = cnv(256, 128);
    bg.fillStyle = "#ffffff";
    bg.fillRect(0, 0, 256, 128);
    bg.fillStyle = "#1a1a1a";
    for (const [x, y] of [[40, 30], [120, 64], [200, 30], [80, 105], [170, 105], [250, 70], [0, 70]]) {
      bg.beginPath();
      for (let q = 0; q < 5; q++) bg.lineTo(x + Math.cos(q * 1.2566) * 16, y + Math.sin(q * 1.2566) * 16);
      bg.fill();
    }
    this.bola = k.m(esfera(0.065, 32, 24), k.mat({ map: tex(bc), rough: 0.4, tom: 1 }), 2, g);
    this.bola.visible = false;
    // ---- cartão de pé com o desenho original (a Rapôsa sai do papel)
    const fc = document.createElement("canvas");
    fc.width = 700;
    fc.height = 940;
    const fg = fc.getContext("2d")!;
    fg.fillStyle = "#f6f1e4";
    fg.fillRect(0, 0, 700, 940);
    fg.globalCompositeOperation = "multiply";
    fg.drawImage(rec.desenho, 0, 0, 700, 940);
    this.folhaCartao = new THREE.Group();
    this.cartao.add(this.folhaCartao);
    k.m(caixa(0.8, 1.07, 0.012), k.mat({ color: 0xefe6d2, rough: 0.9, tom: 1 }), 2, this.folhaCartao, [0, 0.535, -0.007]);
    k.m(new THREE.PlaneGeometry(0.76, 1.02), k.mat({ map: tex(fc), color: A ? 0xb0aaa0 : 0xffffff, rough: 0.95, semContorno: true, tom: 1 }), 0, this.folhaCartao, [0, 0.535, 0.0]);
    k.m(caixa(0.5, 0.06, 0.18), k.mat({ map: texMadeira(), rough: 0.5, tom: 0.5 }), 2, this.cartao, [0, 0.03, -0.04]);
    this.cartao.position.set(0, 0, -0.35);
    this.cartao.visible = false;
    g.add(this.cartao);
    // ---- confete azul e branco
    const NC = 260;
    this.confete = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.035, 0.022), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.6 }), NC);
    const rr = rng(77);
    this.confSem = new Float32Array(NC * 4);
    for (let i = 0; i < NC; i++) {
      this.confSem.set([rr() * 2.6 - 1.3, rr() * 1.6 - 1.3, rr(), rr()], i * 4);
      this.confete.setColorAt(i, new THREE.Color(rr() < 0.55 ? 0x1d4fc4 : 0xffffff));
    }
    this.confete.visible = false;
    this.confete.frustumCulled = false;
    g.add(this.confete);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    // blocos: em pé, balançam e desmoronam
    const bl = P(e, "blocos", -1);
    this.letreiro.visible = bl >= 0;
    this.blocos.forEach((pv, i) => {
      pv.visible = bl >= 0;
      if (bl < 0) return;
      const r = rng(i * 13 + 5);
      const u = clamp(bl * 1.7 - i * 0.09);
      const bal = P(e, "balanca", 0) * Math.sin(t * 22 + i) * 0.06;
      // tomba da tábua e cai até o gramado (queda com gravidade) e quica
      const h = pv.userData.h as number;
      const lado = r() < 0.5 ? -1 : 1;
      const r1 = r(), r2 = r();
      const uq = clamp(u / 0.7);
      const quica = u > 0.7 ? Math.sin(clamp((u - 0.7) / 0.3) * Math.PI) * 0.08 * (1 - clamp((u - 0.7) / 0.3)) : 0;
      pv.rotation.set(uq * (Math.PI * (1 + r1)), lado * u * r2 * 1.2, bal + lado * uq * 0.6);
      pv.position.set((pv.userData.x0 as number) + lado * uq * (0.1 + r2 * 0.25), Math.max(0, h * (1 - uq * uq)) + quica, -0.75 + 0.075 + uq * (0.25 + r1 * 0.3));
    });
    // gol, bola e rede
    const gl = P(e, "gol", -1);
    this.gol.visible = gl >= 0;
    this.bola.visible = gl >= 0 && gl <= 1.6;
    if (gl >= 0) {
      const ub = clamp(gl);
      const de = new THREE.Vector3(0.55, 0.065, -0.7), ate = new THREE.Vector3(-0.2, 0.32, -2.5 - 0.4);
      const p = de.clone().lerp(ate, ub);
      p.y += Math.sin(ub * Math.PI) * 0.18;
      if (gl > 1) {
        const d = clamp(gl - 1);
        p.set(ate.x, lerp(ate.y, 0.065, d), ate.z + 0.1 * d);
      }
      this.bola.position.copy(p);
      this.bola.rotation.set(t * 9, t * 5, 0);
      const imp = gl > 0.92 ? Math.exp(-(gl - 0.92) * 4) * Math.sin((gl - 0.92) * 18) * 0.5 + Math.exp(-(gl - 0.92) * 3) * 0.18 : 0;
      const pos = this.rede.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = this.redeBase[i * 3], y = this.redeBase[i * 3 + 1];
        const d2 = (x + 0.2) ** 2 + (y - 0.01) ** 2;
        pos.setZ(i, -imp * Math.exp(-d2 / 0.12));
      }
      pos.needsUpdate = true;
    }
    // cartão com o desenho
    const ca = P(e, "cartao", -1);
    this.cartao.visible = ca >= 0;
    if (ca >= 0) this.folhaCartao.rotation.x = -easeInOut(clamp(ca)) * (Math.PI / 2 - 0.02);
    // confete
    const cf = P(e, "confete", -1);
    this.confete.visible = cf >= 0;
    if (cf >= 0) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), s3 = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
      for (let i = 0; i < this.confete.count; i++) {
        const [x, z, a, b2] = this.confSem.subarray(i * 4, i * 4 + 4);
        const y = 2.2 + a * 1.4 - cf * (0.55 + b2 * 0.5) * 1.6;
        v.set(x + Math.sin(cf * 3 + i) * 0.08, ((y % 2.6) + 2.6) % 2.6, z);
        e3.set(cf * (4 + a * 6) + i, cf * (3 + b2 * 5), i);
        q.setFromEuler(e3);
        m4.compose(v, q, s3);
        this.confete.setMatrixAt(i, m4);
      }
      this.confete.instanceMatrix.needsUpdate = true;
    }
  }

  luz(m: Mundo, t: number, e: Estado) {
    const A = this.k.dir === "A", C = this.k.dir === "C";
    const sol = m.sol;
    if (A) {
      // fim de tarde: sol baixo e quente vindo de trás à esquerda
      sol.color.set(0xffc58a);
      sol.intensity = 3.4;
      sol.position.set(-5, 3.2, -4);
      m.hemi.color.set(0xcfe0ff);
      m.hemi.groundColor.set(0x8a5a3a);
      m.hemi.intensity = 0.9;
      m.contra.color.set(0xffe2b8);
      m.contra.intensity = 1.6;
      m.contra.position.set(4, 3, 6);
    } else {
      // noite com refletores: luz fria de cima/trás + chave na frente
      sol.color.set(0xffffff);
      sol.intensity = C ? 2.4 : 2.7;
      sol.position.set(-3, 9, 6);
      m.hemi.color.set(C ? 0xffffff : 0xaec4ff);
      m.hemi.groundColor.set(C ? 0x999999 : 0x24304a);
      m.hemi.intensity = C ? 1.4 : 1.05;
      m.contra.color.set(0xcfe0ff);
      m.contra.intensity = C ? 0.8 : 2.2;
      m.contra.position.set(3, 6, -8);
    }
    sol.target.position.set(0, 0.5, 0);
    const sc = sol.shadow.camera;
    Object.assign(sc, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 40 });
    sc.updateProjectionMatrix();
    // refletores piscando de leve ao acender
    const ac = clamp(P(e, "acende", 1));
    this.brilhos.forEach((b, i) => ((b.material as THREE.SpriteMaterial).opacity = (C ? 0 : 0.95) * clamp(ac * 1.4 - i * 0.12)));
    this.feixes.forEach((f, i) => ((f.material as THREE.MeshBasicMaterial).opacity = (A ? 0.035 : 0.05) * clamp(ac * 1.4 - i * 0.12) * (0.85 + 0.15 * Math.sin(t * 3 + i))));
  }
}

// ===========================================================================
// PRANCHETA DO MANGABEIRA (anos 40)
export class Prancheta extends SetBase {
  desenho: ReturnType<typeof texDesenho>;
  pena = new THREE.Group();
  mao = new THREE.Group();
  luzLuminaria: THREE.SpotLight;
  folhaR!: THREE.Object3D;
  folhaM!: THREE.Object3D;
  constructor(k: Kit, rec: Recursos) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A", C = k.dir === "C";
    // piso de tábuas e paredes
    const mad = texMadeira(0.8);
    mad.repeat.set(2, 2);
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), k.mat({ map: mad, rough: 0.6, semContorno: true, tom: 0.6 }));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    g.add(piso);
    const pt = texParede();
    pt.repeat.set(4, 2);
    const parede = new THREE.Mesh(A ? caixa(8, 4.2, 0.12) : new THREE.PlaneGeometry(8, 4.2), k.mat({ map: pt, rough: 0.9, semContorno: true, tom: 0.85 }));
    parede.position.set(0, 2.1, -1.7);
    parede.receiveShadow = true;
    g.add(parede);
    // rodapé
    k.m(caixa(8, 0.16, 0.05), k.mat({ color: 0x5a3a24, rough: 0.6 }), 2, g, [0, 0.08, -1.62]);
    // jornal pregado na parede
    const jornal = k.m(new THREE.PlaneGeometry(0.75, 1.0), k.mat({ map: texJornal(3), rough: 0.9, semContorno: false }), 2, g, [-0.62, 2.62, -1.63], [0, 0, 0.04]);
    void jornal;
    k.m(new THREE.PlaneGeometry(0.6, 0.8), k.mat({ map: texJornal(8), rough: 0.9 }), 2, g, [0.72, 2.75, -1.635], [0, 0, -0.06]);
    // mesa
    const tampo = texMadeira(0.9);
    k.m(caixa(2.4, 0.07, 1.4), k.mat({ map: tampo, rough: 0.5, clear: 0.4 }), 3, g, [0, 0.9, -0.55]);
    for (const [x, z] of [[-1.1, 0.05], [1.1, 0.05], [-1.1, -1.15], [1.1, -1.15]]) k.m(caixa(0.07, 0.88, 0.07), k.mat({ map: tampo, rough: 0.5 }), 2.4, g, [x, 0.44, z]);
    // prancheta inclinada
    const pr = new THREE.Group();
    pr.position.set(0, 0.94, -0.35);
    pr.rotation.x = -0.36;
    g.add(pr);
    k.m(caixa(1.02, 1.3, 0.035), k.mat({ map: texMadeira(1.1), rough: 0.45, clear: 0.4 }), 3, pr, [0, 0.66, 0]);
    // folha com o desenho original da Rapôsa
    this.desenho = texDesenho(rec.desenho);
    const folha = k.m(new THREE.PlaneGeometry(0.76, 1.02), k.mat({ map: this.desenho.t, color: A ? 0xa8a29a : 0xffffff, rough: 0.95, semContorno: true, tom: 1 }), 0, pr, [0, 0.68, 0.019]);
    folha.receiveShadow = true;
    this.folhaR = folha;
    // a folha original com os 3 mascotes (paisagem), aparece por no máximo 1,5 s
    const asp = rec.mascotes.width / rec.mascotes.height;
    const fm = document.createElement("canvas");
    fm.width = rec.mascotes.width;
    fm.height = rec.mascotes.height;
    fm.getContext("2d")!.drawImage(rec.mascotes, 0, 0);
    this.folhaM = k.m(new THREE.PlaneGeometry(0.96, 0.96 / asp), k.mat({ map: tex(fm), color: A ? 0xa8a29a : 0xffffff, rough: 0.95, semContorno: true, tom: 1 }), 0, pr, [0, 0.68, 0.02]);
    this.folhaM.visible = false;
    // prendedores
    for (const x of [-0.3, 0.3]) k.m(caixaR(0.12, 0.05, 0.03, 0.01), k.mat({ color: 0x9aa0a8, metal: 0.8, rough: 0.3 }), 2, pr, [x, 1.2, 0.03]);
    // régua T
    k.m(caixa(0.98, 0.04, 0.012), k.mat({ color: 0xd8c08a, rough: 0.5 }), 2, pr, [0, 0.12, 0.03]);
    // porta-retrato com a foto do Mangabeira (foto de época, sem animar)
    const foto = texFoto(rec.mangabeira, 0.9);
    const pf = new THREE.Group();
    pf.position.set(-0.25, 1.03, 0.03);
    pf.rotation.set(0, 0, 0.07);
    pr.add(pf);
    const fw = 0.25, fh = fw / foto.asp;
    k.m(new THREE.PlaneGeometry(fw, fh), k.mat({ map: foto.t, color: A ? 0x9c968e : 0xffffff, rough: 0.6, tom: 1 }), 1.6, pf, [0, 0, 0]);
    k.m(caixaR(0.07, 0.04, 0.02, 0.006), k.mat({ color: 0x9aa0a8, metal: 0.8, rough: 0.3 }), 1.6, pf, [0, fh / 2 - 0.01, 0.012]);
    // vidro de nanquim
    const vid = new THREE.Group();
    vid.position.set(-0.42, 0.935, 0.2);
    g.add(vid);
    k.m(torno(perfil([[0.0001, 0], [0.075, 0.0], [0.08, 0.02], [0.08, 0.1], [0.05, 0.13], [0.035, 0.14]], 10)), k.mat({ color: 0x1a1a22, rough: 0.15, clear: 1, tom: 0.1 }), 2.6, vid);
    k.m(cil(0.04, 0.04, 0.04), k.mat({ color: 0x111111, rough: 0.3, tom: 0.1 }), 2.2, vid, [0, 0.16, 0]);
    k.m(cil(0.0815, 0.0815, 0.05, 40, true), k.mat({ map: texRotulo("NANQUIM", "#efe3c4", "#1b1712", 512, 160), rough: 0.8, side: THREE.DoubleSide, semContorno: true, tom: 1 }), 0, vid, [0, 0.06, 0], [0, 0.4, 0]);
    // mão genérica do cartunista com a pena (manga de camisa e paletó)
    const mMao = k.mat({ color: 0xe8b996, rough: 0.6, tom: 0.95 });
    this.mao.add(this.pena);
    k.m(esfera(0.06), mMao, 2.6, this.mao, [0, 0, 0], [0, 0, 0], [1.1, 0.8, 1.25]);
    for (let i = 0; i < 3; i++) k.m(capsula(0.017, 0.05), mMao, 2, this.mao, [-0.03 + i * 0.03, -0.035, 0.07], [1.2, 0, 0]);
    k.m(capsula(0.019, 0.05), mMao, 2, this.mao, [-0.06, 0.0, 0.04], [0.6, 0, 0.9]);
    const dirB = new THREE.Vector3(0.85, -0.42, 0.32).normalize();
    const qB = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirB);
    const punho = k.m(cil(0.062, 0.066, 0.06), k.mat({ color: 0xf2f2ee, rough: 0.7 }), 2.4, this.mao, dirB.clone().multiplyScalar(0.09).toArray() as V3);
    punho.quaternion.copy(qB);
    const manga = k.m(cil(0.08, 0.095, 0.8), k.mat({ color: 0x55565c, rough: 0.8, tom: 0.45 }), 3, this.mao, dirB.clone().multiplyScalar(0.52).toArray() as V3);
    manga.quaternion.copy(qB);
    // pena: cabo + bico
    k.m(cil(0.009, 0.011, 0.24), k.mat({ color: 0x1b1b1b, rough: 0.3, tom: 0.1 }), 2, this.pena, [0, 0.12, 0]);
    k.m(new THREE.ConeGeometry(0.009, 0.05, 12), k.mat({ color: 0xc8c8c8, metal: 0.9, rough: 0.25 }), 1.6, this.pena, [0, -0.02, 0], [Math.PI, 0, 0]);
    this.pena.position.set(-0.02, -0.03, 0.09);
    this.pena.rotation.set(0.5, 0, -0.35);
    pr.add(this.mao);
    // luminária de mesa
    const lum = new THREE.Group();
    lum.position.set(1.0, 0.935, -1.05);
    g.add(lum);
    const mLum = k.mat({ color: 0x2f5a3f, rough: 0.35, clear: 0.8, tom: 0.4 });
    k.m(cil(0.12, 0.14, 0.04), mLum, 2.4, lum, [0, 0.02, 0]);
    k.m(cil(0.015, 0.015, 0.7), k.mat({ color: 0x8c8c8c, metal: 0.8, rough: 0.3 }), 2, lum, [0, 0.36, 0], [0, 0, 0.25]);
    k.m(cil(0.015, 0.015, 0.55), k.mat({ color: 0x8c8c8c, metal: 0.8, rough: 0.3 }), 2, lum, [-0.2, 0.86, 0.06], [0.2, 0, 1.1]);
    const cup = k.m(torno(perfil([[0.02, 0.18], [0.07, 0.15], [0.16, 0.0]], 8)), k.mat({ color: 0x2f5a3f, rough: 0.35, side: THREE.DoubleSide, clear: 0.8, tom: 0.4 }), 2.4, lum, [-0.45, 0.98, 0.2], [0.5, 0, 0.75]);
    void cup;
    const bulbo = new THREE.Mesh(esfera(0.05), new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false }));
    bulbo.position.set(-0.45, 0.95, 0.24);
    lum.add(bulbo);
    if (!C) {
      const sp = new THREE.Sprite(aditivo(texBrilho("255,226,170"), 0xffd9a0, 0.6));
      sp.position.set(-0.47, 0.93, 0.26);
      sp.scale.setScalar(0.6);
      lum.add(sp);
    }
    this.luzLuminaria = new THREE.SpotLight(0xffd59a, A ? 5 : 3.5, 6, 0.85, 0.9, 1.2);
    this.luzLuminaria.position.set(0.5, 1.9, -0.6);
    this.luzLuminaria.target.position.set(0, 1.45, -0.55);
    this.luzLuminaria.castShadow = false;
    g.add(this.luzLuminaria, this.luzLuminaria.target);
    if (A) {
      // a sala é um cômodo de casinha de boneca sobre a mesa
      mesaMaquete(k, g, "quadrada", 4, 0);
    }
    this.fundo = new THREE.Color(A ? 0x2a1d16 : C ? 0xf0e8d6 : 0x3b2a20);
  }
  luz(m: Mundo) {
    const C = this.k.dir === "C", A = this.k.dir === "A";
    m.sol.color.set(A ? 0xffcf9a : 0xfff0d8);
    m.sol.intensity = A ? 1.7 : C ? 2.2 : 2.1;
    m.sol.position.set(-2.5, 4.5, 3.5);
    m.sol.target.position.set(0, 1.2, -0.5);
    Object.assign(m.sol.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -1, near: 0.5, far: 20 });
    m.sol.shadow.camera.updateProjectionMatrix();
    m.hemi.color.set(C ? 0xffffff : 0xffe9cc);
    m.hemi.groundColor.set(C ? 0x999999 : 0x6b4a33);
    m.hemi.intensity = A ? 0.55 : C ? 1.3 : 1.1;
    m.contra.color.set(0xffe2b8);
    m.contra.intensity = A ? 0.4 : 0.7;
    m.contra.position.set(2, 3, -3);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    const fm = P(e, "folhaM", 0) > 0.5;
    this.folhaM.visible = fm;
    this.folhaR.visible = !fm;
    // desenho surgindo de cima para baixo e a pena acompanhando a frente do traço
    const p = clamp(P(e, "desenho", 1));
    this.desenho.desenha(p);
    const y = 0.68 + 0.51 - p * 1.02;
    const x = Math.sin(t * 9) * 0.12 + Math.sin(t * 3.7) * 0.08;
    this.mao.visible = P(e, "mao", 1) > 0.5 && !fm;
    this.mao.scale.setScalar(0.9);
    this.mao.position.set(x + 0.05, y - 0.02, 0.08);
    this.mao.rotation.set(0, 0, 0.15);
  }
}

// ===========================================================================
// RUA DE BELO HORIZONTE (1921 / 1942): fachada com a placa de lâminas giratórias
export class Rua extends SetBase {
  laminas: THREE.Mesh[] = [];
  palestra: ReturnType<typeof texPlaca>;
  cruzeiro: ReturnType<typeof texPlaca>;
  fatias: THREE.Texture[] = [];
  carimbo = new THREE.Group();
  caAnt = -1;
  placa!: THREE.Group;
  decreto = new THREE.Group();
  ano1942!: THREE.Mesh;
  constructor(k: Kit) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A", C = k.dir === "C";
    const ped = texPedras([118, 116, 110]);
    ped.repeat.set(8, 8);
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), k.mat({ map: ped, rough: 0.8, semContorno: true, tom: 0.62 }));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    g.add(chao);
    // calçada
    k.m(caixa(14, 0.14, 1.3), k.mat({ color: 0xa8a49a, rough: 0.8, tom: 0.85 }), 2.4, g, [0, 0.07, 0.65]);
    // fachada principal
    const reb = texReboco([214, 206, 188]);
    reb.repeat.set(2, 2);
    const mParede = k.mat({ map: reb, rough: 0.9, tom: 0.93 });
    const fach = new THREE.Group();
    g.add(fach);
    k.m(caixa(4.4, 6.0, 0.6), mParede, 3, fach, [0, 3.0, -0.3]);
    // embasamento, cornija, frisos, pilastras
    const mFriso = k.mat({ color: 0xe9e3d4, rough: 0.8, tom: 1 });
    k.m(caixa(4.5, 0.5, 0.7), k.mat({ color: 0x8f8a80, rough: 0.8, tom: 0.6 }), 2.6, fach, [0, 0.25, -0.27]);
    k.m(caixa(4.7, 0.22, 0.85), mFriso, 2.6, fach, [0, 5.95, -0.2]);
    k.m(caixa(4.55, 0.12, 0.72), mFriso, 2.2, fach, [0, 3.85, -0.26]);
    k.m(caixa(2.2, 0.5, 0.5), mFriso, 2.6, fach, [0, 6.3, -0.35]);
    for (const x of [-2.05, 2.05]) k.m(caixa(0.3, 5.9, 0.72), mFriso, 2.4, fach, [x, 2.95, -0.26]);
    // porta em arco
    const mEsc = k.mat({ color: 0x2b2420, rough: 0.7, tom: 0.2 });
    const mMad = k.mat({ color: 0x5d3b24, rough: 0.6, tom: 0.4 });
    k.m(caixa(1.15, 1.9, 0.1), mMad, 2.6, fach, [0, 1.45, 0.02]);
    k.m(cil(0.575, 0.575, 0.1, 40, false), mMad, 2.6, fach, [0, 2.4, 0.02], [Math.PI / 2, 0, 0]);
    k.m(caixa(0.04, 1.9, 0.12), mEsc, 1.6, fach, [0, 1.45, 0.03]);
    for (const x of [-0.75, 0.75]) k.m(caixa(0.16, 2.6, 0.2), mFriso, 2.2, fach, [x, 1.55, 0.03]);
    // janelas do andar de cima com venezianas
    const mVid = k.mat({ color: 0x2a3446, rough: 0.2, clear: 1, tom: 0.25 });
    const mVen = k.mat({ color: 0x5e7a86, rough: 0.6, tom: 0.55 });
    for (const x of [-1.35, 0, 1.35]) {
      k.m(caixa(0.78, 1.15, 0.08), mVid, 2, fach, [x, 4.75, 0.0]);
      k.m(caixa(0.92, 0.1, 0.2), mFriso, 2, fach, [x, 4.15, 0.06]);
      k.m(caixa(0.92, 0.14, 0.16), mFriso, 2, fach, [x, 5.38, 0.04]);
      for (const s of [-1, 1]) k.m(caixa(0.36, 1.1, 0.04), mVen, 2, fach, [x + s * 0.62, 4.75, 0.05], [0, s * 0.35, 0]);
    }
    // placa de lâminas: frente PALESTRA ITÁLIA (verde), verso CRUZEIRO (azul, 5 estrelas)
    this.palestra = texPlaca("PALESTRA|ITÁLIA", "#1f7a45", "#f4efe2", { W: 1600, H: 900 });
    this.cruzeiro = texPlaca("CRUZEIRO", "#1d4fc4", "#ffffff", { W: 1600, H: 900, estrelas: true });
    const N = 8, LW = 2.5, LH = 1.15;
    const placa = new THREE.Group();
    placa.position.set(0, 3.12, 0.32);
    g.add(placa);
    this.placa = placa;
    // placa DECRETO pendurada por correntes
    const { c: dc, g: dg } = cnv(800, 400);
    const pap = texPapel(256, [232, 222, 196], 8).image as HTMLCanvasElement;
    dg.drawImage(pap, 0, 0, 800, 400);
    dg.strokeStyle = "#1b1712";
    dg.lineWidth = 14;
    dg.strokeRect(20, 20, 760, 360);
    dg.fillStyle = "#1b1712";
    dg.textAlign = "center";
    dg.textBaseline = "middle";
    dg.font = `400 170px ${FONTE_PLACA}`;
    dg.fillText("DECRETO", 400, 215, 700);
    k.m(caixa(1.9, 0.95, 0.06), k.mat({ map: tex(dc), rough: 0.7, tom: 1 }), 2.6, this.decreto, [0, -1.2, 0]);
    const mCor = k.mat({ color: 0x55575c, metal: 0.8, rough: 0.35, tom: 0.3 });
    for (const sx of [-0.75, 0.75]) k.m(cil(0.012, 0.012, 1.0, 8), mCor, 1.4, this.decreto, [sx, -0.25, 0]);
    this.decreto.position.set(0, 9, 0.75);
    g.add(this.decreto);
    // placa esmaltada "1942" (só na capa)
    {
      const { c: ac, g: ag } = cnv(1024, 512);
      ag.fillStyle = "#1d4fc4";
      ag.beginPath();
      ag.roundRect(0, 0, 1024, 512, 70);
      ag.fill();
      ag.strokeStyle = "#ffffff";
      ag.lineWidth = 30;
      ag.beginPath();
      ag.roundRect(40, 40, 944, 432, 50);
      ag.stroke();
      ag.fillStyle = "#ffffff";
      ag.textAlign = "center";
      ag.textBaseline = "middle";
      ag.font = `400 300px ${FONTE_PLACA}`;
      ag.fillText("1942", 512, 275);
      const ma = k.mat({ map: tex(ac), rough: 0.3, clear: 0.9, transparent: true, tinta: true });
      ma.alphaTest = 0.5;
      this.ano1942 = k.m(new THREE.PlaneGeometry(1.2, 0.6), ma, 0, g, [0.55, 2.64, 0.55]);
      this.ano1942.visible = false;
    }
    const mLado = k.mat({ color: 0x3a2a1e, rough: 0.6, tom: 0.25 });
    for (let i = 0; i < N; i++) {
      const fr = this.palestra.t.clone();
      fr.repeat.set(1 / N, 1);
      fr.offset.set(i / N, 0);
      fr.needsUpdate = true;
      const vs = this.cruzeiro.t.clone();
      vs.repeat.set(1 / N, 1);
      vs.offset.set(i / N, 0);
      vs.needsUpdate = true;
      this.fatias.push(fr);
      const mf = k.mat({ map: fr, rough: 0.55, tinta: true });
      const mv = k.mat({ map: vs, rough: 0.55, tinta: true });
      const lam = new THREE.Mesh(caixa(LW / N - 0.006, LH, 0.07), [mLado, mLado, mLado, mLado, mf, mv]);
      lam.position.set(-LW / 2 + (i + 0.5) * (LW / N), 0, 0);
      lam.castShadow = lam.receiveShadow = true;
      k.contorno(lam as unknown as THREE.Mesh, 1.6);
      placa.add(lam);
      this.laminas.push(lam);
    }
    // moldura da placa
    const mMol = k.mat({ color: 0x2c2018, rough: 0.5, tom: 0.2 });
    k.m(caixa(LW + 0.16, 0.08, 0.14), mMol, 2.4, placa, [0, LH / 2 + 0.04, 0]);
    k.m(caixa(LW + 0.16, 0.08, 0.14), mMol, 2.4, placa, [0, -LH / 2 - 0.04, 0]);
    for (const s of [-1, 1]) k.m(caixa(0.08, LH + 0.16, 0.14), mMol, 2.4, placa, [s * (LW / 2 + 0.04), 0, 0]);
    // carimbo de borracha gigante (o governo é só um carimbo)
    const mCabo = k.mat({ color: 0x7a4a2a, rough: 0.45, clear: 0.6, tom: 0.45 });
    k.m(torno(perfil([[0.0001, 0.62], [0.16, 0.6], [0.2, 0.52], [0.1, 0.42], [0.08, 0.2], [0.14, 0.12]], 16)), mCabo, 2.6, this.carimbo);
    k.m(caixaR(1.5, 0.14, 0.5, 0.03), mCabo, 2.6, this.carimbo, [0, 0.07, 0]);
    k.m(caixa(1.42, 0.05, 0.44), k.mat({ color: 0xc8161d, rough: 0.6, tinta: true }), 1.6, this.carimbo, [0, -0.02, 0]);
    this.carimbo.rotation.x = Math.PI / 2;
    g.add(this.carimbo);
    // poste de luz antigo
    const mFerro = k.mat({ color: 0x2a2d33, rough: 0.4, metal: 0.6, tom: 0.2 });
    const pos = new THREE.Group();
    pos.position.set(-2.55, 0, 1.0);
    g.add(pos);
    k.m(cil(0.05, 0.08, 3.6, 16), mFerro, 2.4, pos, [0, 1.8, 0]);
    k.m(torno(perfil([[0.0001, 0.5], [0.18, 0.42], [0.2, 0.36], [0.14, 0.0]], 8), 6), mFerro, 2.4, pos, [0, 3.6, 0]);
    const lamp = new THREE.Mesh(cil(0.12, 0.08, 0.32, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a6, toneMapped: false }));
    lamp.position.set(0, 3.78, 0);
    pos.add(lamp);
    // prédios vizinhos
    for (const [x, h, cor] of [[-4.6, 5.0, [176, 184, 190]], [4.6, 5.6, [190, 182, 168]]] as [number, number, number[]][]) {
      const t2 = texReboco(cor as [number, number, number], x);
      k.m(caixa(4.6, h, 0.6), k.mat({ map: t2, rough: 0.9, tom: 0.8 }), 3, g, [x, h / 2, -0.5]);
      for (const xx of [-1.2, 0, 1.2]) k.m(caixa(0.7, 1.0, 0.08), mVid, 2, g, [x + xx, h - 1.1, -0.17]);
    }
    if (A) mesaMaquete(k, g, "quadrada", 7, 0);
    this.fundo = A ? null : C ? new THREE.Color(0xf0e8d6) : texCeu(["#8b9bb4", "#aab6c8", "#c7ced8"], 0);
  }
  luz(m: Mundo, _t: number, e: Estado) {
    const A = this.k.dir === "A", C = this.k.dir === "C";
    const fr = clamp(P(e, "frio", 1));
    // 1921: tarde quente (sépia) -> 1942: luz fria de guerra
    m.sol.color.set(0xffc98e).lerp(new THREE.Color(A ? 0xc8d6f2 : 0xdfe6ff), fr);
    m.sol.intensity = lerp(A ? 2.0 : 2.6, A ? 2.3 : C ? 2.4 : 2.2, fr);
    m.sol.position.set(lerp(-6, -5, fr), lerp(4.5, 8, fr), 7);
    m.sol.target.position.set(0, 2, 0);
    Object.assign(m.sol.shadow.camera, { left: -6, right: 6, top: 7, bottom: -2, near: 0.5, far: 40 });
    m.sol.shadow.camera.updateProjectionMatrix();
    m.hemi.color.set(0xffe2c0).lerp(new THREE.Color(A ? 0xaabbdd : C ? 0xffffff : 0xb9c6dc), fr);
    m.hemi.groundColor.set(A ? 0x8a5a3a : C ? 0x999999 : 0x4a4f5a);
    m.hemi.intensity = A ? lerp(0.6, 0.9, fr) : C ? 1.4 : 1.25;
    m.contra.color.set(0xffd9a8).lerp(new THREE.Color(0xc9d6f0), fr);
    m.contra.intensity = 1.0;
    m.contra.position.set(4, 5, -6);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    if (this.k.dir === "B") {
      m.scene.fog = new THREE.Fog(0xb8c2d2, 14, 40);
    }
    // carimbo PROIBIDO na placa
    const ca = clamp(P(e, "carimbo", 0));
    if (Math.abs(ca - this.caAnt) > 0.001) {
      this.caAnt = ca;
      this.palestra.desenha(ca);
      this.fatias.forEach((f) => (f.needsUpdate = true));
    }
    // lâminas girando da esquerda para a direita
    const vira = P(e, "vira", 0);
    this.laminas.forEach((l, i) => {
      const u = clamp((vira * (1 + 0.9) - (i / (this.laminas.length - 1)) * 0.9) / 1);
      const a = easeInOut(u) * Math.PI;
      l.rotation.y = a + Math.sin(u * Math.PI) * 0.0;
      l.position.z = Math.sin(u * Math.PI) * 0.12;
    });
    // placa descendo até o lugar (1921) e o DECRETO pendurado (2ª Guerra)
    const py = P(e, "placaY", 0);
    this.placa.position.y = 3.12 + py;
    this.ano1942.visible = P(e, "ano1942", 0) > 0.5;
    const dz = P(e, "decreto", 0);
    this.decreto.position.y = lerp(9.5, 6.05, dz);
    this.decreto.rotation.z = Math.sin(t * 2.6) * 0.04 * dz;
    this.decreto.visible = dz > 0.01;
    // carimbo: desce, bate, sobe
    const cy = P(e, "carimboY", 6);
    this.carimbo.position.set(0.25, 3.12 + cy * 1.4, 0.48 + cy * 0.5);
    this.carimbo.visible = cy < 5.5;
  }
}

// ===========================================================================
// CÉU DO CRUZEIRO DO SUL: as 5 estrelas descem e pousam no peito
export class Ceu extends SetBase {
  estrelasCeu: THREE.Object3D[] = [];
  voadoras: THREE.Mesh[] = [];
  rastros: THREE.Points[] = [];
  linhas: THREE.Mesh[] = [];
  brilhos: THREE.Sprite[] = [];
  centro = new THREE.Vector3(0.25, 2.3, -3.5);
  esp = 0.5;
  constructor(k: Kit) {
    super(k);
    const g = this.grupo;
    const A = k.dir === "A", C = k.dir === "C";
    // chão de grama à noite
    const gt = texGrama(16, C ? "#bdbdbd" : "#1f5a2a", C ? "#d0d0d0" : "#276a31", 0.05);
    const grama = new THREE.Mesh(A ? new THREE.CircleGeometry(3.2, 96) : new THREE.PlaneGeometry(80, 80), k.mat({ map: gt, rough: 0.85, semContorno: true, tom: 0.75 }));
    grama.rotation.x = -Math.PI / 2;
    grama.receiveShadow = true;
    g.add(grama);
    const mEst = new THREE.MeshBasicMaterial({ color: C ? 0xfffdf6 : 0xffffff, toneMapped: false });
    const brilho = texBrilho(C ? "255,255,255" : "220,232,255");
    const pts = CRUZ.map(([x, y]) => this.centro.clone().add(new THREE.Vector3(x * this.esp, y * this.esp, 0)));
    // linhas da constelação (cruz): topo-base e esquerda-direita
    const mLin = new THREE.MeshBasicMaterial({ color: C ? 0xfffdf6 : 0xbcd2ff, transparent: true, opacity: 0.8, toneMapped: false });
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const pa = pts[a], pb = pts[b];
      const L = pa.distanceTo(pb);
      const lin = new THREE.Mesh(cil(0.008, 0.008, 1, 8), mLin.clone());
      lin.position.copy(pa.clone().add(pb).multiplyScalar(0.5));
      lin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
      lin.userData.L = L;
      lin.scale.set(1, L, 1);
      g.add(lin);
      this.linhas.push(lin);
    }
    CRUZ.forEach(([, , s], i) => {
      const st = new THREE.Mesh(estrela((C ? 0.085 : 0.05) * s, 0.01), mEst);
      st.position.copy(pts[i]);
      g.add(st);
      this.estrelasCeu.push(st);
      const sp = new THREE.Sprite(aditivo(brilho, 0xffffff, C ? 0 : 0.9));
      sp.scale.setScalar(0.55 * s);
      sp.position.copy(pts[i]);
      g.add(sp);
      this.brilhos.push(sp);
      // estrela que voa até o peito
      const v = new THREE.Mesh(estrela((C ? 0.085 : 0.05) * s, 0.012), new THREE.MeshBasicMaterial({ color: C ? 0xfffdf6 : 0xffffff, toneMapped: false }));
      g.add(v);
      this.voadoras.push(v);
      const sv = new THREE.Sprite(aditivo(brilho, 0xffffff, C ? 0 : 0.9));
      sv.scale.setScalar(0.5 * s);
      v.add(sv);
      // rastro
      const n = 40;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const al = new Float32Array(n);
      for (let j = 0; j < n; j++) al[j] = 1 - j / n;
      geo.setAttribute("alfa", new THREE.BufferAttribute(al, 1));
      const pm = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: C ? THREE.NormalBlending : THREE.AdditiveBlending,
        uniforms: { cor: { value: new THREE.Color(C ? 0xf2ead8 : 0xcfe0ff) } },
        vertexShader: `attribute float alfa; varying float va; void main(){ va = alfa; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = (C_SIZE)*alfa/(-mv.z); gl_Position = projectionMatrix*mv; }`.replace("C_SIZE", C ? "34.0" : "90.0"),
        fragmentShader: `uniform vec3 cor; varying float va; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(cor, va*(1.0-d*2.0)*0.8); }`,
      });
      const pp = new THREE.Points(geo, pm);
      pp.frustumCulled = false;
      g.add(pp);
      this.rastros.push(pp);
    });
    // estrelas de fundo
    if (A) {
      // fundo de papelão pintado da maquete, com as estrelas
      const cart = new THREE.Mesh(new THREE.PlaneGeometry(7, 10.5), k.mat({ map: texCeuPintado(), rough: 0.9, semContorno: true }));
      cart.position.set(0, 4.2, -4.4);
      g.add(cart);
      mesaMaquete(k, g, "redonda", 3.2);
      this.fundo = null;
    } else {
      this.fundo = C ? new THREE.Color(0x101010) : texCeu(["#040817", "#0a1640", "#1a2c66"], 380, 9);
    }
  }
  luz(m: Mundo) {
    const A = this.k.dir === "A", C = this.k.dir === "C";
    m.sol.color.set(A ? 0xffd4a8 : 0xdfe8ff);
    m.sol.intensity = A ? 2.4 : C ? 2.6 : 2.0;
    m.sol.position.set(-2, 6, 5);
    m.sol.target.position.set(0, 1, 0);
    Object.assign(m.sol.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -1, near: 0.5, far: 20 });
    m.sol.shadow.camera.updateProjectionMatrix();
    m.hemi.color.set(A ? 0xcfe0ff : C ? 0xffffff : 0x8fa8e8);
    m.hemi.groundColor.set(A ? 0x8a5a3a : C ? 0x999999 : 0x1a2440);
    m.hemi.intensity = A ? 0.9 : C ? 1.5 : 1.0;
    m.contra.color.set(0xbcd2ff);
    m.contra.intensity = C ? 0.6 : 2.4;
    m.contra.position.set(2, 4, -5);
  }
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    const C = this.k.dir === "C";
    // estrelas acendendo e ligações da constelação
    const ac = clamp(P(e, "acende", 1));
    this.estrelasCeu.forEach((s, i) => s.scale.setScalar(Math.max(0.001, clamp(ac * 1.8 - i * 0.2))));
    const lg = clamp(P(e, "linhas", 1));
    this.linhas.forEach((l, i) => {
      const u = clamp(lg * 2 - i);
      l.visible = u > 0.01;
      (l.material as THREE.MeshBasicMaterial).opacity = 0.85 * u * (1 - clamp(P(e, "voo", 0) * 1.25));
    });
    // voo: cada estrela sai do céu (em sequência) e pousa no peito
    const voo = P(e, "voo", 0);
    CRUZ.forEach((_, i) => {
      const u = clamp(voo * 2.2 - i * 0.3);
      const ue = easeInOut(u);
      const de = this.estrelasCeu[i].position;
      const ate = m.raposa.alvoEstrela(i);
      const meio = de.clone().lerp(ate, 0.5).add(new THREE.Vector3((i - 2) * 0.35, 0.5, 0.6));
      const pos = (k: number) => {
        const a = de.clone().lerp(meio, k), b = meio.clone().lerp(ate, k);
        return a.lerp(b, k);
      };
      const v = this.voadoras[i];
      const voando = u > 0.001 && u < 0.999;
      this.estrelasCeu[i].visible = u <= 0.001;
      (this.brilhos[i].material as THREE.SpriteMaterial).opacity = (C ? 0 : 0.9) * (u <= 0.001 ? 1 : 0) * (0.85 + 0.15 * Math.sin(t * 5 + i * 2)) * clamp(ac * 1.8 - i * 0.2);
      v.visible = voando;
      v.position.copy(pos(ue));
      v.rotation.z = u * 8;
      v.scale.setScalar(lerp(1, 0.45, ue));
      // rastro
      const arr = (this.rastros[i].geometry.attributes.position as THREE.BufferAttribute);
      for (let j = 0; j < arr.count; j++) {
        const p = pos(easeInOut(clamp(u - j * 0.012)));
        arr.setXYZ(j, p.x, p.y, p.z);
      }
      arr.needsUpdate = true;
      this.rastros[i].visible = voando;
    });
  }
}

// ===========================================================================
// VIRADA: a cena vira arame laranja e partículas sobre azul-tinta
export class Virada extends SetBase {
  arame = new THREE.Group();
  particulas: THREE.Points;
  base: Float32Array;
  constructor(k: Kit, private raposaRef: () => THREE.Object3D) {
    super(k);
    const g = this.grupo;
    this.fundo = new THREE.Color(0x0b1026);
    const lar = 0xff6b2c;
    // piso em grade
    const grid = new THREE.GridHelper(40, 60, lar, lar);
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity = 0.22;
    g.add(grid);
    // arquibancada em arame
    const arq = new THREE.LineSegments(new THREE.EdgesGeometry(torno([[22, 0], [22, 1.6], [34, 13]], 48), 1), new THREE.LineBasicMaterial({ color: lar, transparent: true, opacity: 0.35 }));
    g.add(arq);
    g.add(this.arame);
    // partículas (preenchidas a partir da raposa no primeiro uso)
    const N = 2600;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.base = new Float32Array(N * 3);
    const rr = rng(3);
    const sd = new Float32Array(N);
    for (let i = 0; i < N; i++) sd[i] = rr();
    geo.setAttribute("sd", new THREE.BufferAttribute(sd, 1));
    this.particulas = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `attribute float sd; varying float v; void main(){ v = sd; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = (6.0+sd*10.0)/(-mv.z); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying float v; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(1.0,0.42+v*0.3,0.17, (1.0-d*2.0)*0.9); }`,
      }),
    );
    this.particulas.frustumCulled = false;
    g.add(this.particulas);
  }
  montado = false;
  monta(m: Mundo) {
    this.montado = true;
    const raiz = this.raposaRef();
    raiz.updateMatrixWorld(true);
    const lar = new THREE.LineBasicMaterial({ color: 0xff6b2c, transparent: true, opacity: 0.85 });
    const amostras: THREE.Vector3[] = [];
    raiz.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh || o.userData.contorno) return;
      for (let q: THREE.Object3D | null = o; q && q !== raiz; q = q.parent) if (!q.visible) return;
      const geo = me.geometry;
      const ls = new THREE.LineSegments(new THREE.WireframeGeometry(geo), lar);
      ls.applyMatrix4(me.matrixWorld);
      this.arame.add(ls);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i += 7) amostras.push(new THREE.Vector3().fromBufferAttribute(p as THREE.BufferAttribute, i).applyMatrix4(me.matrixWorld));
    });
    const r = rng(8);
    for (let i = 0; i < this.base.length / 3; i++) {
      const a = amostras[Math.floor(r() * amostras.length)];
      this.base.set([a.x, a.y, a.z], i * 3);
    }
    void m;
  }
  luz() {}
  aplica(m: Mundo, t: number, e: Estado) {
    super.aplica(m, t, e);
    if (!this.montado) {
      m.raposa.raiz.visible = true;
      this.monta(m);
    }
    m.raposa.raiz.visible = false;
    const dis = P(e, "dissolve", 0.5);
    const pos = this.particulas.geometry.attributes.position as THREE.BufferAttribute;
    const sd = this.particulas.geometry.attributes.sd as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const s = sd.getX(i);
      const u = clamp(dis * 1.6 - s * 0.6);
      const bx = this.base[i * 3], by = this.base[i * 3 + 1], bz = this.base[i * 3 + 2];
      pos.setXYZ(i, bx + u * (0.6 + s) * 1.4 + Math.sin(t * 2 + s * 40) * 0.02 * u, by + u * (s - 0.3) * 0.9, bz + u * Math.cos(s * 30) * 0.5);
    }
    pos.needsUpdate = true;
    const ar = P(e, "arame", 1);
    this.arame.visible = ar > 0.01;
    this.particulas.visible = ar > 0.01;
    this.arame.children.forEach((c) => (((c as THREE.LineSegments).material as THREE.LineBasicMaterial).opacity = 0.85 * (1 - dis * 0.6) * ar));
  }
}

void smooth;
void easeOut;
void tubo;
void ({} as V3);
