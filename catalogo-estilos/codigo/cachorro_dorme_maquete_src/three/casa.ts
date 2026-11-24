// A casa térrea (quarto + sala/corredor), o laboratório, o canto frio e, na maquete, a tábua com corte numa mesa.
// Paredes, piso e teto são caixas feitas aqui (estrutura); tudo o que mobília a cena é modelo pronto (modelos.ts).
//   Quarto: x 0..4, z 0..3.6 (cabeceira na parede do fundo z = 0; janela na parede esquerda x = 0; porta em x = 4)
//   Sala/corredor: x 4..10.4 (sofá, tapete e caminha ao longo do caminho do cachorro em z ~ 2.85)
//   Laboratório: x 20..24.4 · canto frio: x 30..33
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Kit, Dir, caixa, cil, esfera } from "./kit";
import { prop, Arq } from "./modelos";

export const ALT = 2.7; // pé-direito
export const TOPO_COLCHAO = 0.505;
export const PORTA = { x: 4, z0: 2.35, z1: 3.3 };
export const JANELA_Q = { z: 1.75, y0: 0.95, y1: 2.15, larg: 1.25 }; // janela do quarto (parede x = 0)
export const JANELA_S = { x: 7.6, y0: 0.95, y1: 2.15, larg: 1.3 }; // janela da sala (parede z = 0)
export const CAMA = { x: 2.0, z: 1.12, comp: 2.1 }; // centro da cama (cabeceira em z ~ 0.07)
export const POS = {
  sofa: [7.95, 0, 0.6] as [number, number, number],
  tapete: [6.45, 0, 1.75] as [number, number, number],
  caminha: [5.2, 0, 0.95] as [number, number, number],
  criado: [3.35, 0, 0.32] as [number, number, number],
  abajur: [3.42, 0, 0.3] as [number, number, number],
  relogio: [3.18, 0, 0.42] as [number, number, number],
  chinelo: [3.15, 0, 1.75] as [number, number, number],
  ventilador: [2.0, ALT, 1.5] as [number, number, number],
  interruptor: [3.97, 1.25, 2.15] as [number, number, number],
  lab: [22.2, 0, 1.2] as [number, number, number],
};

const PAL: Record<Dir, Record<string, number>> = {
  A: { pQ: 0xa9a3d8, pS: 0xd9c7a8, piso: 0x8a5a3a, teto: 0x8f88c0, rodape: 0xf2ece0, cob: 0x2f9aa6, cobB: 0x6cc3cb, lencol: 0xf3efe6, sofa: 0x3f7cc0, tap: 0xd1544a, tapB: 0xf3c35b, caminha: 0x6a4c9c, caminhaB: 0xf0e2c8, madeira: 0x9a6338, madeiraE: 0x5f3b22, lab: 0x8fe0cf, labPiso: 0xf1f4f2 },
  B: { pQ: 0x9d97c8, pS: 0xd2bf9f, piso: 0x8b5d3d, teto: 0x8f88c0, rodape: 0xeee6d8, cob: 0x2f8f9a, cobB: 0x69b9c2, lencol: 0xece6da, sofa: 0x3a72b0, tap: 0xc54d44, tapB: 0xeebd55, caminha: 0x63478f, caminhaB: 0xeadcc2, madeira: 0x9a6338, madeiraE: 0x5f3b22, lab: 0x86d6c6, labPiso: 0xeef1ef },
  C: { pQ: 0xb7b0e0, pS: 0xe8d6b8, piso: 0xb27d58, teto: 0xa49cd0, rodape: 0xf6f0e6, cob: 0x5fb7bf, cobB: 0x9ad6da, lencol: 0xf7f2ea, sofa: 0x6f9fd6, tap: 0xe0776e, tapB: 0xf6cf7a, caminha: 0x8e74c0, caminhaB: 0xf5e9d4, madeira: 0xb98258, madeiraE: 0x86603f, lab: 0xa6e6d8, labPiso: 0xf6f8f6 },
};

/** textura de madeira desenhada (tábuas): mantida nas três direções como "estampa" */
function texTabuas(dir: Dir, base: number, rep: [number, number]) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const g = c.getContext("2d")!;
  const b = new THREE.Color(base);
  for (let i = 0; i < 8; i++) {
    const k = 0.9 + ((i * 37) % 7) * 0.03;
    g.fillStyle = `rgb(${(b.r * 255 * k) | 0},${(b.g * 255 * k) | 0},${(b.b * 255 * k) | 0})`;
    g.fillRect(0, i * 64, 512, 64);
    g.fillStyle = "rgba(40,20,10,0.55)";
    g.fillRect(0, i * 64, 512, dir === "A" ? 4 : 3);
    const off = (i * 173) % 512;
    g.fillRect(off, i * 64, 3, 64);
    if (dir !== "A") {
      g.strokeStyle = "rgba(60,30,15,0.12)";
      for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(0, i * 64 + 10 + j * 11); g.bezierCurveTo(170, i * 64 + 4 + j * 12, 340, i * 64 + 20 + j * 9, 512, i * 64 + 12 + j * 11); g.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** caixa com UV em metros (para a textura repetir igual em qualquer tamanho) */
function caixaUV(x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(x, y, z);
  const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const u = ax > 0.5 ? p.getZ(i) : p.getX(i), v = ay > 0.5 ? p.getZ(i) : p.getY(i);
    uv.setXY(i, u, v);
  }
  return g;
}

export class Casa {
  g = new THREE.Group();
  quarto = new THREE.Group();
  sala = new THREE.Group();
  lab = new THREE.Group();
  canto = new THREE.Group();
  tetos: THREE.Object3D[] = [];
  paredesFrente: THREE.Object3D[] = [];
  base?: THREE.Group;
  pal: Record<string, number>;
  cama!: THREE.Group;
  camaTopo = 0.55;
  camaX: [number, number] = [1.2, 2.8];
  camaZ: [number, number] = [0.2, 2.1];
  ventilador!: THREE.Group;
  abajurPos = new THREE.Vector3();
  abajurCupula!: THREE.Mesh;
  relogio!: THREE.Group;
  relogioTela!: THREE.Mesh;
  relogioCv = document.createElement("canvas");
  relogioTex: THREE.CanvasTexture;
  monitorTela!: THREE.Mesh;
  monitorCv = document.createElement("canvas");
  monitorTex: THREE.CanvasTexture;
  sofa!: THREE.Group; tapete!: THREE.Group; caminha!: THREE.Group; interruptor!: THREE.Group; chinelo!: THREE.Group;
  janelasLuz: THREE.Mesh[] = [];
  luaDisco!: THREE.Mesh;
  ceu!: THREE.Mesh;
  bola!: THREE.Mesh;
  constructor(public kit: Kit, gl: Record<Arq, GLTF>) {
    const k = kit, d = kit.dir, P = (this.pal = PAL[d]);
    this.g.add(this.quarto, this.sala, this.lab, this.canto);
    this.relogioCv.width = 256; this.relogioCv.height = 96;
    this.relogioTex = new THREE.CanvasTexture(this.relogioCv);
    this.relogioTex.colorSpace = THREE.SRGBColorSpace;
    this.monitorCv.width = 512; this.monitorCv.height = 320;
    this.monitorTex = new THREE.CanvasTexture(this.monitorCv);
    this.monitorTex.colorSpace = THREE.SRGBColorSpace;

    const mPQ = k.mat({ color: P.pQ, rough: 0.85, relevo: 0.6 });
    const mPS = k.mat({ color: P.pS, rough: 0.85, relevo: 0.6 });
    const mTeto = k.mat({ color: P.teto, rough: 0.9, relevo: 0.5 });
    const mRod = k.mat({ color: P.rodape, rough: 0.6 });
    const piso = k.mat({ map: texTabuas(d, P.piso, [0.6, 1.4]), estampa: true, rough: 0.55, clear: 0.3, relevo: 0.5 });
    const HB = 1.55; // altura do corte das paredes na maquete
    const parede = (pai: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      if (d === "B") {
        const lo = y - sy / 2, hi = Math.min(y + sy / 2, HB);
        if (hi - lo < 0.01) return null;
        sy = hi - lo; y = (hi + lo) / 2;
      }
      return k.m(caixa(sx, sy, sz, 0.004), m, 2.2, pai, [x, y, z]);
    };

    // ---------------------------------------------------------------- QUARTO
    const Q = this.quarto, E = 0.12;
    k.m(caixaUV(4.0, 0.08, 6.6), piso, 0, Q, [2.0, -0.04, 3.3]);
    // fundo (z = 0)
    parede(Q, mPQ, 2.0, ALT / 2, -E / 2, 4.0 + 2 * E, ALT, E);
    // esquerda (x = 0) com o vão da janela
    const jz0 = JANELA_Q.z - JANELA_Q.larg / 2, jz1 = JANELA_Q.z + JANELA_Q.larg / 2;
    parede(Q, mPQ, -E / 2, ALT / 2, jz0 / 2, E, ALT, jz0);
    parede(Q, mPQ, -E / 2, ALT / 2, (jz1 + 3.6) / 2, E, ALT, 3.6 - jz1);
    parede(Q, mPQ, -E / 2, JANELA_Q.y0 / 2, JANELA_Q.z, E, JANELA_Q.y0, JANELA_Q.larg);
    parede(Q, mPQ, -E / 2, (JANELA_Q.y1 + ALT) / 2, JANELA_Q.z, E, ALT - JANELA_Q.y1, JANELA_Q.larg);
    // direita (x = 4) com a porta para a sala
    parede(Q, mPQ, 4 + E / 2 - 0.0, ALT / 2, PORTA.z0 / 2, E, ALT, PORTA.z0);
    parede(Q, mPQ, 4 + E / 2, ALT / 2, (PORTA.z1 + 3.6) / 2, E, ALT, 3.6 - PORTA.z1);
    parede(Q, mPQ, 4 + E / 2, (2.1 + ALT) / 2, (PORTA.z0 + PORTA.z1) / 2, E, ALT - 2.1, PORTA.z1 - PORTA.z0);
    // rodapé
    k.m(caixa(4.0, 0.1, 0.03, 0.005), mRod, 1.5, Q, [2.0, 0.05, 0.015]);
    const tq = k.m(caixa(4.0 + 2 * E, 0.1, 3.6 + E, 0.004), mTeto, 0, Q, [2.0, ALT + 0.05, 1.8]);
    this.tetos.push(tq);

    // cama de casal (Quaternius, CC0): o edredom do modelo sai; entra o cobertor que cobre o dono (mundo.ts)
    this.cama = prop(k, gl["cama.glb"], {
      tam: CAMA.comp, eixo: "max", rotY: 0,
      cores: (m, no) => {
        if (no.startsWith("Comforter") || m.startsWith("Comforter")) return null;
        if (m === "PillowCover") return { color: 0xf4f1ea, rough: 0.8, relevo: 1.2 };
        if (m === "Mattress") return { color: P.lencol, rough: 0.8, relevo: 1.2 };
        if (m === "DarkWood") return { color: P.madeiraE, rough: 0.5, clear: 0.35 };
        if (m === "Wood") return { color: P.madeira, rough: 0.5, clear: 0.35 };
        return { color: 0xdddddd };
      },
    });
    // a cama pronta é mais comprida em z ou em x? deixa a cabeceira em z = 0
    const tc = this.cama.userData.tam as THREE.Vector3;
    if (tc.x > tc.z) this.cama.rotation.y = Math.PI / 2;
    Q.add(this.cama);
    this.cama.position.set(CAMA.x, 0, CAMA.z);
    this.cama.updateMatrixWorld(true);
    // mede o colchão (topo e extensão) e confere de que lado fica a cabeceira (travesseiros)
    const bbM = new THREE.Box3(), bbT = new THREE.Box3();
    this.cama.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh || !me.visible || o.userData.contorno) return;
      const nm = (me.material as THREE.Material).name;
      if (nm === "Mattress") bbM.expandByObject(me);
      if (nm === "PillowCover") bbT.expandByObject(me);
    });
    const travCentro = bbT.getCenter(new THREE.Vector3());
    if (travCentro.z > CAMA.z) { this.cama.rotation.y += Math.PI; this.cama.updateMatrixWorld(true); bbM.makeEmpty(); this.cama.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh && !o.userData.contorno && (me.material as THREE.Material).name === "Mattress") bbM.expandByObject(me); }); }
    // deixa o topo do colchão sempre na mesma altura (a linha do tempo conta com ela): escala só em y
    const sy = TOPO_COLCHAO / bbM.max.y;
    this.cama.scale.y *= sy;
    this.cama.updateMatrixWorld(true);
    bbM.min.y *= sy; bbM.max.y *= sy;
    this.camaTopo = bbM.max.y;
    this.camaX = [bbM.min.x, bbM.max.x];
    this.camaZ = [bbM.min.z, bbM.max.z];

    // criado-mudo + abajur + relógio digital
    const criado = prop(k, gl["criado.glb"], { tam: 0.55, eixo: "y", cores: (m) => ({ color: m === "DarkWood" ? P.madeiraE : P.madeira, rough: 0.5, clear: 0.3 }) });
    criado.position.set(...POS.criado);
    Q.add(criado);
    const hC = (criado.userData.tam as THREE.Vector3).y;
    const abaj = prop(k, gl["abajur.glb"], { tam: 0.5, eixo: "y", cores: () => ({ color: 0xf2dcb0, rough: 0.7 }) });
    abaj.position.set(POS.abajur[0], hC, POS.abajur[2]);
    Q.add(abaj);
    // a cúpula acende: emissivo quente nas malhas de cima
    const tA = abaj.userData.tam as THREE.Vector3;
    this.abajurPos.set(POS.abajur[0], hC + tA.y * 0.72, POS.abajur[2]);
    for (const me of abaj.userData.malhas as THREE.Mesh[]) {
      const m = me.material as THREE.MeshStandardMaterial;
      if (m.emissive) { m.emissive = new THREE.Color(0xffb35c); m.emissiveIntensity = 0.0; }
      this.abajurCupula = me;
    }
    // cúpula brilhando por dentro (um disco quente)
    const brilho = k.m(esfera(0.06, 16, 12), k.mat({ color: 0xffd9a0, basico: true }), 0, Q, [this.abajurPos.x, this.abajurPos.y, this.abajurPos.z]);
    brilho.userData.semArame = true;
    this.relogio = prop(k, gl["relogio.glb"], { tam: 0.17, eixo: "max", rotY: 0, cores: (m) => ({ color: m === "F44336" ? 0xff4b3e : m === "1A1A1A" ? 0x1a1a1a : m === "455A64" ? 0x455a64 : 0x78909c, rough: 0.5, clear: 0.4 }) });
    this.relogio.position.set(POS.relogio[0], hC, POS.relogio[2]);
    this.relogio.rotation.y = -0.35;
    Q.add(this.relogio);
    const tR = this.relogio.userData.tam as THREE.Vector3;
    // visor com os números (textura desenhada a cada quadro)
    this.relogioTela = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.05), new THREE.MeshBasicMaterial({ map: this.relogioTex, toneMapped: false }));
    this.relogioTela.position.set(0, tR.y * 0.52, tR.z / 2 + 0.004);
    this.relogioTela.userData.semArame = true;
    this.relogio.add(this.relogioTela);
    this.desenhaRelogio("23:33");

    // chinelo de dedo do lado da cama
    this.chinelo = prop(k, gl["chinelo.glb"], { tam: 0.27, eixo: "max", cores: (m) => ({ color: m === "02___Default" ? 0x2a6fd6 : m === "03___Default" ? 0xf2c230 : 0x2a6fd6, rough: 0.6, clear: 0.3 }) });
    this.chinelo.position.set(...POS.chinelo);
    this.chinelo.rotation.y = 0.4;
    Q.add(this.chinelo);

    // janela + cortina estampada (bolinhas)
    const jan = prop(k, gl["janela.glb"], { tam: JANELA_Q.larg + 0.08, eixo: "max", cores: () => ({ color: 0xf4f1ea, rough: 0.5, clear: 0.3 }) });
    const tJ = jan.userData.tam as THREE.Vector3;
    if (tJ.x > tJ.z) jan.rotation.y = Math.PI / 2;
    jan.position.set(0.0, JANELA_Q.y0 - 0.04, JANELA_Q.z);
    Q.add(jan);
    if (d === "B") jan.visible = false;
    for (const lado of [-1, 1]) {
      const cort = prop(k, gl["cortina.glb"], { tam: 1.75, eixo: "y", cores: (m) => (m === "LightMetal" ? { color: 0x9a8f80, metal: 0.8, rough: 0.3 } : { color: 0xd88a5a, rough: 0.9, bolinhas: 0xfff1d6, lado: THREE.DoubleSide }) });
      const tC = cort.userData.tam as THREE.Vector3;
      if (tC.x > tC.z) cort.rotation.y = Math.PI / 2;
      cort.scale.set(1, 1, 0.5);
      cort.position.set(0.12, JANELA_Q.y1 + 0.3 - 1.75, JANELA_Q.z + lado * (JANELA_Q.larg / 2 + 0.12));
      Q.add(cort);
      if (d === "B") cort.visible = false;
    }
    // ventilador de teto (gira)
    this.ventilador = prop(k, gl["ventilador.glb"], { tam: 1.15, eixo: "max", cores: (m) => (m === "wood" ? { color: P.madeira, rough: 0.5, clear: 0.3 } : m === "lamp" ? { color: 0xf3ead8, rough: 0.4 } : { color: 0xdad6cf, metal: 0.7, rough: 0.3 }) });
    const tV = this.ventilador.userData.tam as THREE.Vector3;
    this.ventilador.position.set(POS.ventilador[0], ALT - tV.y, POS.ventilador[2]);
    Q.add(this.ventilador);
    // interruptor ao lado da porta (parede x = 4, face de dentro)
    this.interruptor = prop(k, gl["interruptor.glb"], { tam: 0.12, eixo: "max", cores: () => ({ color: 0xf5f2ea, rough: 0.4, clear: 0.5 }) });
    const tI = this.interruptor.userData.tam as THREE.Vector3;
    if (tI.z < tI.x) this.interruptor.rotation.y = -Math.PI / 2;
    this.interruptor.position.set(POS.interruptor[0], POS.interruptor[1], POS.interruptor[2]);
    Q.add(this.interruptor);

    // ---------------------------------------------------------------- SALA / CORREDOR
    const S = this.sala, X0 = 4, X1 = 10.4;
    k.m(caixaUV(X1 - X0, 0.08, 6.6), piso, 0, S, [(X0 + X1) / 2, -0.04, 3.3]);
    const jx0 = JANELA_S.x - JANELA_S.larg / 2, jx1 = JANELA_S.x + JANELA_S.larg / 2;
    parede(S, mPS, (X0 + jx0) / 2 + E / 2, ALT / 2, -E / 2, jx0 - X0 + E, ALT, E);
    parede(S, mPS, (jx1 + X1) / 2, ALT / 2, -E / 2, X1 - jx1, ALT, E);
    parede(S, mPS, JANELA_S.x, JANELA_S.y0 / 2, -E / 2, JANELA_S.larg, JANELA_S.y0, E);
    parede(S, mPS, JANELA_S.x, (JANELA_S.y1 + ALT) / 2, -E / 2, JANELA_S.larg, ALT - JANELA_S.y1, E);
    parede(S, mPS, X1 + E / 2, ALT / 2, 1.8, E, ALT, 3.6 + 2 * E);
    k.m(caixa(X1 - X0, 0.1, 0.03, 0.005), mRod, 1.5, S, [(X0 + X1) / 2, 0.05, 0.015]);
    const ts = k.m(caixa(X1 - X0 + E, 0.1, 3.6 + E, 0.004), mTeto, 0, S, [(X0 + X1) / 2, ALT + 0.05, 1.8]);
    this.tetos.push(ts);
    const janS = prop(k, gl["janela.glb"], { tam: JANELA_S.larg + 0.08, eixo: "max", cores: () => ({ color: 0xf4f1ea, rough: 0.5, clear: 0.3 }) });
    const tJS = janS.userData.tam as THREE.Vector3;
    if (tJS.z > tJS.x) janS.rotation.y = Math.PI / 2;
    janS.position.set(JANELA_S.x, JANELA_S.y0 - 0.04, 0.0);
    S.add(janS);
    if (d === "B") janS.visible = false;
    this.sofa = prop(k, gl["sofa.glb"], { tam: 2.0, eixo: "max", cores: (m) => (m === "Black" ? { color: 0x2a2626, rough: 0.5 } : { color: P.sofa, rough: 0.85, relevo: 1.4 }) });
    S.add(this.sofa);
    this.sofa.position.set(...POS.sofa);
    this.tapete = prop(k, gl["tapete.glb"], { tam: 2.0, eixo: "max", cores: (m) => ({ color: m === "carpetDarker" ? P.tapB : P.tap, rough: 0.95, relevo: 1.6 }) });
    this.tapete.position.set(...POS.tapete);
    S.add(this.tapete);
    this.caminha = prop(k, gl["caminha.glb"], { tam: 0.95, eixo: "max", cores: (m) => ({ color: m === "Material2" ? P.caminhaB : P.caminha, rough: 0.9, relevo: 1.4 }) });
    this.caminha.position.set(...POS.caminha);
    this.caminha.rotation.y = 0.25;
    S.add(this.caminha);

    // ---------------------------------------------------------------- LABORATÓRIO (claro, verde-água)
    const L = this.lab, LX = 20;
    const mLab = k.mat({ color: P.lab, rough: 0.8, relevo: 0.5 });
    k.m(caixa(4.4, 0.08, 3.6, 0.004), k.mat({ color: P.labPiso, rough: 0.6, clear: 0.3 }), 0, L, [LX + 2.2, -0.04, 1.8]);
    parede(L, mLab, LX + 2.2, ALT / 2, -E / 2, 4.4 + 2 * E, ALT, E);
    parede(L, mLab, LX - E / 2, ALT / 2, 1.8, E, ALT, 3.6);
    parede(L, mLab, LX + 4.4 + E / 2, ALT / 2, 1.8, E, ALT, 3.6);
    const tl = k.m(caixa(4.4 + 2 * E, 0.1, 3.6, 0.004), k.mat({ color: 0xf4f6f5 }), 0, L, [LX + 2.2, ALT + 0.05, 1.8]);
    this.tetos.push(tl);
    const banc = prop(k, gl["bancada.glb"], { tam: 1.6, eixo: "max", cores: (m) => ({ color: m.includes("001") || m === "Material" ? 0xf2f4f3 : m.includes("005") ? 0x2c3236 : 0xe6eaea, rough: 0.5, clear: 0.4 }) });
    const tB = banc.userData.tam as THREE.Vector3;
    if (tB.z > tB.x) banc.rotation.y = Math.PI / 2;
    banc.position.set(LX + 3.1, 0, 0.45);
    L.add(banc);
    const mon = prop(k, gl["monitor.glb"], { tam: 0.62, eixo: "max", cores: () => ({ color: 0x23272b, rough: 0.4, clear: 0.6 }) });
    const tM = mon.userData.tam as THREE.Vector3;
    const hB = (banc.userData.tam as THREE.Vector3).y;
    mon.position.set(LX + 3.0, hB, 0.42);
    mon.rotation.y = -0.35;
    L.add(mon);
    this.monitorTela = new THREE.Mesh(new THREE.PlaneGeometry(tM.x * 0.88, tM.y * 0.62), new THREE.MeshBasicMaterial({ map: this.monitorTex, toneMapped: false }));
    this.monitorTela.position.set(0, tM.y * 0.6, tM.z / 2 + 0.012);
    this.monitorTela.userData.semArame = true;
    mon.add(this.monitorTela);
    const colch = prop(k, gl["colchonete.glb"], { tam: 1.3, eixo: "max", cores: (m) => ({ color: m === "rock" ? 0xf0f3f2 : 0x7fc4e8, rough: 0.9, relevo: 1.4 }) });
    const tCo = colch.userData.tam as THREE.Vector3;
    if (tCo.z > tCo.x) colch.rotation.y = Math.PI / 2;
    colch.position.set(...POS.lab);
    L.add(colch);
    this.desenhaMonitor(0, 0);

    // ---------------------------------------------------------------- CANTO FRIO
    const C = this.canto, CX = 30;
    const mFrio = k.mat({ color: 0x9aa4b4, rough: 0.9, relevo: 0.6 });
    k.m(caixa(3, 0.08, 3, 0.004), k.mat({ color: 0x8e96a0, rough: 0.8 }), 0, C, [CX + 1.5, -0.04, 1.5]);
    parede(C, mFrio, CX + 1.5, ALT / 2, -E / 2, 3 + E, ALT, E);
    parede(C, mFrio, CX - E / 2, ALT / 2, 1.5, E, ALT, 3);

    // bolinha de tênis (lado quente do estudo)
    this.bola = k.m(new THREE.SphereGeometry(0.034 * 1.4, 24, 18), k.mat({ color: 0xd8ef3a, rough: 0.9, relevo: 1.5 }), 2.2, this.g);
    this.bola.visible = false;

    // ---------------------------------------------------------------- céu noturno, lua e estrelas (A e C)
    this.ceu = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), new THREE.ShaderMaterial({
      uniforms: { topo: { value: new THREE.Color(d === "C" ? 0x2d2b63 : 0x15143f) }, hor: { value: new THREE.Color(d === "C" ? 0x6a4f8f : 0x4a2f6e) }, k: { value: 1 } },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: /* glsl */ `uniform vec3 topo, hor; uniform float k; varying vec3 vD;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
        void main(){
          vec3 c = mix(hor, topo, smoothstep(-0.05, 0.6, vD.y));
          vec3 q = floor(vD * 220.0);
          float e = step(0.9965, h(q)) * smoothstep(0.0, 0.25, vD.y);
          c += vec3(e) * 0.9;
          gl_FragColor = vec4(c * k, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false,
    }));
    this.ceu.renderOrder = -10;
    this.ceu.frustumCulled = false;
    this.ceu.userData.semArame = true;
    this.g.add(this.ceu);
    this.luaDisco = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false }));
    this.luaDisco.userData.semArame = true;
    this.g.add(this.luaDisco);

    // ---------------------------------------------------------------- B: a casa vira maquete sobre uma tábua numa mesa
    if (d === "B") {
      for (const t of this.tetos) t.visible = false;
      this.ceu.visible = false;
      this.luaDisco.visible = false;
      const base = (this.base = new THREE.Group());
      // tábua com corte lateral (camadas: madeira clara em cima, compensado à mostra)
      const tab = k.mat({ map: texTabuas(d, 0xc9a06c, [0.5, 2]), estampa: true, rough: 0.55, clear: 0.3 });
      k.m(caixaUV(10.9, 0.34, 4.3), tab, 0, base, [5.2, -0.25, 1.8]);
      // tábuas também sob o laboratório e o canto frio (cenários soltos sobre a mesma mesa)
      k.m(caixaUV(5.2, 0.34, 4.3), tab, 0, base, [22.2, -0.25, 1.8]);
      k.m(caixaUV(3.8, 0.34, 3.8), tab, 0, base, [31.4, -0.25, 1.4]);
      for (let i = 0; i < 4; i++) k.m(caixa(10.92, 0.012, 4.32, 0), k.mat({ color: i % 2 ? 0x8a6a46 : 0xb18a5c, rough: 0.7 }), 0, base, [5.2, -0.13 - i * 0.07, 1.8]);
      // mesa de madeira escura
      k.m(caixaUV(40, 0.4, 24), k.mat({ map: texTabuas(d, 0x6e4528, [0.15, 0.45]), estampa: true, rough: 0.5, clear: 0.35 }), 0, base, [6, -0.62, 3]);
      // fundo do estúdio (parede escura distante)
      k.m(new THREE.PlaneGeometry(80, 30), k.mat({ color: 0x1d1b2e, rough: 1 }), 0, base, [6, 10, -12]);
      this.g.add(base);
      // janelas da maquete com luz quente por dentro (vidro emissivo)
      for (const [x, y, z, ry, w] of [[0.02, (JANELA_Q.y0 + JANELA_Q.y1) / 2, JANELA_Q.z, Math.PI / 2, JANELA_Q.larg], [JANELA_S.x, (JANELA_S.y0 + JANELA_S.y1) / 2, 0.02, 0, JANELA_S.larg]] as [number, number, number, number, number][]) {
        const v = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.55), new THREE.MeshBasicMaterial({ color: 0x29306e, toneMapped: false, side: THREE.DoubleSide }));
        v.position.set(x, 1.24, z); v.rotation.y = ry; void y;
        this.g.add(v);
        this.janelasLuz.push(v);
      }
    }
  }

  desenhaRelogio(txt: string) {
    const g = this.relogioCv.getContext("2d")!;
    g.fillStyle = "#120806"; g.fillRect(0, 0, 256, 96);
    g.fillStyle = "#ff3b2a";
    g.shadowColor = "#ff2a1a"; g.shadowBlur = 14;
    g.font = "bold 78px 'Courier New', monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(txt, 128, 52);
    this.relogioTex.needsUpdate = true;
  }

  /** tela de ondas cerebrais (EEG): ondas lentas e grandes = sono profundo */
  desenhaMonitor(t: number, profundo: number) {
    const g = this.monitorCv.getContext("2d")!;
    g.fillStyle = "#0d1f24"; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = "rgba(120,220,200,0.15)"; g.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 320); g.stroke(); }
    for (let y = 0; y < 320; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    const cores = ["#5ff2c8", "#ffd23f", "#7fb6ff", "#ff8fa3"];
    for (let c = 0; c < 4; c++) {
      g.strokeStyle = cores[c]; g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= 512; x += 3) {
        const u = x / 512 * 6 + t * 1.2;
        const rapida = Math.sin(u * 9 + c) * 0.35 + Math.sin(u * 23 + c * 2) * 0.2;
        const lenta = Math.sin(u * 1.6 + c * 0.7) * 1.1;
        const y = 50 + c * 72 + 22 * (lenta * profundo + rapida * (1 - profundo * 0.7));
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    this.monitorTex.needsUpdate = true;
  }
}

export { cil };
