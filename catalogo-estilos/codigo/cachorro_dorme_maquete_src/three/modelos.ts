// Modelos prontos (CC0 / CC BY, ver CREDITOS.txt) carregados de public/modelos e repintados por direção.
//   shiba.glb (Quaternius, CC0) -> o vira-lata caramelo de orelha em pé e peito branco
//   homem.glb (Quaternius "Man", CC0) -> o dono de camiseta cinza e bermuda
//   cama, sofá, tapete, caminha, ventilador, abajur, interruptor, relógio, chinelo, janela, cortina, criado-mudo,
//   bancada, monitor, colchonete -> Poly Pizza (Quaternius, Kenney, CreativeTrio: CC0; J-Toastie, Poly by Google,
//   jeremy, Ali12: CC BY 3.0)
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSk } from "three/examples/jsm/utils/SkeletonUtils.js";
import { staticFile } from "remotion";
import { Kit, OpMat, esfera, V3 } from "./kit";

const CACHE = new Map<string, Promise<GLTF>>();
export function carrega(arq: string) {
  if (!CACHE.has(arq)) CACHE.set(arq, new GLTFLoader().loadAsync(staticFile("modelos/" + arq)));
  return CACHE.get(arq)!;
}
export const ARQS = [
  "shiba.glb", "homem.glb", "cama.glb", "sofa.glb", "tapete.glb", "caminha.glb", "ventilador.glb", "abajur.glb", "interruptor.glb",
  "relogio.glb", "chinelo.glb", "janela.glb", "cortina.glb", "criado.glb", "bancada.glb", "monitor.glb", "colchonete.glb", "travesseiro.glb",
] as const;
export type Arq = (typeof ARQS)[number];
export const carregaTodos = async () => {
  const gs = await Promise.all(ARQS.map(carrega));
  const r = {} as Record<Arq, GLTF>;
  ARQS.forEach((a, i) => (r[a] = gs[i]));
  return r;
};

/** suaviza o low poly: normal média por POSIÇÃO (mantém os vértices duplicados, que guardam pesos e cores) */
export function suaviza(g: THREE.BufferGeometry) {
  const h = g.index ? g.toNonIndexed() : g.clone();
  h.computeVertexNormals();
  const p = h.attributes.position as THREE.BufferAttribute, n = h.attributes.normal as THREE.BufferAttribute;
  const soma = new Map<string, THREE.Vector3>();
  const ch = (i: number) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const f = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    for (let j = 0; j < 3; j++) { const k = ch(i + j); const v = soma.get(k); if (v) v.add(f); else soma.set(k, f.clone()); }
  }
  for (let i = 0; i < p.count; i++) { const v = soma.get(ch(i))!.clone().normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  n.needsUpdate = true;
  return h;
}

// ------------------------------------------------------------------------------------------ peça parada (móvel/objeto)
export type OpProp = {
  tam: number; // medida-alvo em metros
  eixo?: "x" | "y" | "z" | "max"; // qual medida da caixa vira `tam`
  cores: (mat: string, no: string) => OpMat | null; // null = esconde
  px?: number;
  rotY?: number; // gira o modelo antes de medir (para a frente ficar em +Z)
  suave?: boolean;
  base?: "chao" | "centro";
};
/** peça pronta normalizada: centro em x/z = 0, base em y = 0 (ou centro), medida `tam` no eixo pedido */
export function prop(kit: Kit, g: GLTF, o: OpProp) {
  const inner = g.scene.clone(true);
  const w = new THREE.Group();
  const pivo = new THREE.Group();
  pivo.add(inner);
  pivo.rotation.y = o.rotY ?? 0;
  w.add(pivo);
  w.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(pivo);
  const sz = bb.getSize(new THREE.Vector3());
  const eixo = o.eixo ?? "max";
  const med = eixo === "max" ? Math.max(sz.x, sz.y, sz.z) : sz[eixo];
  const s = o.tam / med;
  pivo.scale.setScalar(s);
  const c = bb.getCenter(new THREE.Vector3());
  pivo.position.set(-c.x * s, o.base === "centro" ? -c.y * s : -bb.min.y * s, -c.z * s);
  const lista: THREE.Mesh[] = [];
  inner.traverse((x) => {
    const me = x as THREE.Mesh;
    if (!me.isMesh) return;
    const mats = Array.isArray(me.material) ? me.material : [me.material];
    const nm = mats[0].name;
    const op = o.cores(nm, me.name || me.parent?.name || "");
    if (!op) { me.visible = false; return; }
    me.material = kit.mat(op);
    (me.material as THREE.Material).name = nm;
    if (o.suave) me.geometry = suaviza(me.geometry);
    me.castShadow = me.receiveShadow = true;
    lista.push(me);
  });
  w.updateMatrixWorld(true);
  for (const me of lista) kit.contorno(me, o.px ?? 2.6);
  w.userData.tam = sz.clone().multiplyScalar(s);
  w.userData.malhas = lista;
  return w;
}

// ------------------------------------------------------------------------------------------ ator animado
export class Ator {
  raiz = new THREE.Group(); // posição/rotação no mundo (frente = +X)
  inner: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  ossos = new Map<string, THREE.Bone>();
  malhas: THREE.Mesh[] = [];
  escala = 1;
  repouso: { b: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[] = [];
  constructor(public kit: Kit, gltf: GLTF, cores: (mat: string) => OpMat | null, opts: { altura: number; rotY?: number; suave?: boolean; px?: number; prepara?: (me: THREE.Mesh, nm: string) => void }) {
    this.inner = cloneSk(gltf.scene);
    this.inner.traverse((b) => { if (((b as THREE.Bone).isBone || b.type === "Object3D" || b.type === "Group") && b !== this.inner) this.repouso.push({ b, p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() }); });
    this.clips = gltf.animations;
    this.mixer = new THREE.AnimationMixer(this.inner);
    if (this.clips.length) {
      const c0 = this.clips.find((c) => /Idle$/.test(c.name)) ?? this.clips[0];
      this.mixer.clipAction(c0).play();
      this.mixer.update(0);
    }
    this.inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(this.inner, true);
    this.escala = opts.altura / (bb.max.y - bb.min.y);
    this.inner.scale.multiplyScalar(this.escala);
    this.inner.position.y = -bb.min.y * this.escala;
    this.inner.userData.y0 = this.inner.position.y;
    this.inner.rotation.y = opts.rotY ?? 0;
    this.raiz.add(this.inner);
    const casca: THREE.Mesh[] = [];
    this.inner.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone) this.ossos.set(b.name, b);
      const me = o as THREE.Mesh;
      if (!me.isMesh) return;
      const mats = Array.isArray(me.material) ? me.material : [me.material];
      const nm = mats[0].name;
      const op = cores(nm);
      if (!op) { me.visible = false; return; }
      if (opts.suave !== false) me.geometry = suaviza(me.geometry);
      opts.prepara?.(me, nm);
      me.material = this.kit.mat(op);
      (me.material as THREE.Material).name = nm;
      me.castShadow = me.receiveShadow = true;
      me.frustumCulled = false;
      this.malhas.push(me);
      casca.push(me);
    });
    this.inner.updateMatrixWorld(true);
    for (const me of casca) this.kit.contorno(me, opts.px ?? 3);
  }
  /** gira o osso em torno de um eixo do CORPO (x frente, y cima, z lado), ângulo em radianos */
  giraCorpo(n: string, eixo: [number, number, number], ang: number) {
    const b = this.ossos.get(n);
    if (!b || !b.parent || !ang) return;
    this.raiz.updateMatrixWorld(true);
    const qr = new THREE.Quaternion();
    this.raiz.getWorldQuaternion(qr);
    const ax = new THREE.Vector3(...eixo).normalize().applyQuaternion(qr);
    const qp = new THREE.Quaternion();
    b.parent.getWorldQuaternion(qp);
    const qw = qp.clone().multiply(b.quaternion);
    const qn = new THREE.Quaternion().setFromAxisAngle(ax, ang).multiply(qw);
    b.quaternion.copy(qp.invert().multiply(qn));
    b.updateMatrixWorld(true);
  }
  /** prende `obj` ao osso com escala de mundo 1 e, se dado, na posição/orientação de MUNDO (pose atual) */
  prende(n: string, obj: THREE.Object3D, pos?: THREE.Vector3, quat?: THREE.Quaternion) {
    const b = this.ossos.get(n)!;
    this.raiz.updateMatrixWorld(true);
    b.add(obj);
    const ws = new THREE.Vector3(), wq = new THREE.Quaternion(), wp = new THREE.Vector3();
    b.matrixWorld.decompose(wp, wq, ws);
    obj.scale.setScalar(1 / ws.x);
    if (pos) obj.position.copy(b.worldToLocal(pos.clone()));
    obj.quaternion.copy(wq.clone().invert().multiply(quat ?? new THREE.Quaternion()));
    return obj;
  }
  /** vértices (mundo) das malhas com material `nome` */
  vertices(nome: string) {
    this.raiz.updateMatrixWorld(true);
    const out: THREE.Vector3[] = [];
    for (const me of this.malhas) {
      if ((me.material as THREE.Material).name !== nome) continue;
      const sk = me as THREE.SkinnedMesh;
      const n = me.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        const v = new THREE.Vector3();
        if (sk.isSkinnedMesh) sk.getVertexPosition(i, v); else v.fromBufferAttribute(me.geometry.attributes.position as THREE.BufferAttribute, i);
        out.push(v.applyMatrix4(me.matrixWorld));
      }
    }
    return out;
  }
  clip(nome: string) {
    return this.clips.find((c) => c.name === nome) ?? this.clips.find((c) => c.name.endsWith("|" + nome)) ?? this.clips.find((c) => c.name.includes(nome))!;
  }
  /** amostra a animação `nome` no tempo t (função pura do tempo): volta TODOS os nós ao repouso antes */
  pose(nome: string, t: number, loop = true) {
    for (const r of this.repouso) { r.b.position.copy(r.p); r.b.quaternion.copy(r.q); r.b.scale.copy(r.s); }
    if (this.inner.userData.y0 !== undefined) this.inner.position.y = this.inner.userData.y0;
    const c = this.clip(nome);
    this.mixer.stopAllAction();
    const a = this.mixer.clipAction(c);
    a.reset();
    a.play();
    a.time = loop ? ((t % c.duration) + c.duration) % c.duration : Math.min(Math.max(t, 0), c.duration - 1e-4);
    this.mixer.update(0);
  }
}

// ------------------------------------------------------------------------------------------ o cachorro
const CARAMELO: Record<string, number> = { A: 0xd9832e, B: 0xc97a34, C: 0xe29a52 };
const CREME: Record<string, number> = { A: 0xfbf3e4, B: 0xf1e7d4, C: 0xfdf3e3 };

export type PoseDog = {
  modo: "trote" | "galope" | "parado" | "pula" | "deitado" | "enrolado" | "deUmLado" | "baixa";
  t: number;
  cabeca?: number; // + = levanta o focinho (rad)
  cabecaY?: number; // + = vira a cabeça para a esquerda dele
  olho?: number; // 1 aberto .. 0 fechado
  orelha?: number; // giro da orelha (rad, em torno do eixo vertical): a orelha "gira"
  rabo?: number;
  brilhoOlho?: number; // reflexo dos olhos no escuro
  respira?: number;
};

export class Cachorro extends Ator {
  palpebras: THREE.Group[] = [];
  descLado?: number;
  brilhos: THREE.Sprite[] = [];
  olhoC: THREE.Vector3[] = [];
  constructor(kit: Kit, gltf: GLTF) {
    const d = kit.dir;
    super(kit, gltf, (m) => {
      if (m === "Main") return { color: CARAMELO[d], rough: 0.6, clear: 0.1, pelo: true };
      if (m === "Main_Light") return { color: CREME[d], rough: 0.6, clear: 0.1, pelo: true };
      if (m === "Black") return { color: 0x1c1310, rough: 0.25, clear: 0.9 };
      if (m === "Eyes_White") return { color: 0x2a1a10, rough: 0.1, clear: 1, semOndula: true };
      if (m === "Eyes_Pupil") return { color: 0x050404, rough: 0.05, clear: 1, semOndula: true };
      if (m === "Eyes_Black") return { color: 0x070606, rough: 0.05, clear: 1, semOndula: true };
      return { color: 0x888888 };
    }, { altura: 0.66, rotY: Math.PI / 2 });
    // pálpebras: casca de pelo sobre cada olho (fechada = cobre o olho; o contorno desenha a linha do olho fechado)
    this.pose("Idle", 0);
    const vs = this.vertices("Eyes_White").concat(this.vertices("Eyes_Black"));
    const lados = [vs.filter((v) => v.z > 0), vs.filter((v) => v.z <= 0)];
    for (const l of lados) {
      const c = l.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, l.length));
      let r = 0;
      for (const v of l) r = Math.max(r, v.distanceTo(c));
      this.olhoC.push(c);
      const g = new THREE.Group();
      this.prende("Head", g, c, new THREE.Quaternion());
      // olho fechado: os olhos somem e fica um arco escuro "‿" rente ao pelo (olho fechado de desenho)
      const lado = Math.sign(c.z) || 1;
      const arco = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, r * 0.16, 8, 28, Math.PI * 0.8), kit.mat({ color: 0x1a0f0c, basico: true }));
      arco.rotation.set(0, 0, Math.PI * 1.1);
      arco.position.set(0, r * 0.25, lado * r * 0.15);
      g.add(arco);
      g.userData = { arco };
      this.palpebras.push(g);
      // reflexo dos olhos no escuro (tapetum): brilho verde-dourado
      const cv = document.createElement("canvas");
      cv.width = cv.height = 64;
      const gx = cv.getContext("2d")!;
      const gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(0.25, "rgba(220,255,170,0.9)"); gr.addColorStop(0.6, "rgba(120,220,140,0.25)"); gr.addColorStop(1, "rgba(80,200,120,0)");
      gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, transparent: true }));
      sp.userData.semArame = true;
      sp.visible = false;
      const gs = new THREE.Group();
      this.prende("Head", gs, c.clone().add(new THREE.Vector3(r * 0.6, 0, 0)), new THREE.Quaternion());
      gs.add(sp);
      sp.scale.setScalar(r * 2.6);
      this.brilhos.push(sp);
    }
  }

  /** aplica a pose: animação do pacote + ajustes em eixo do CORPO (x frente, y cima, z lado esquerdo do bicho) */
  faz(p: PoseDog) {
    const { modo, t } = p;
    const deitado = modo === "deitado" || modo === "enrolado";
    const nome = { trote: "Walk", galope: "Gallop", parado: "Idle", pula: "Gallop_Jump", baixa: "Idle_2_HeadLow", deitado: "Idle", enrolado: "Idle", deUmLado: "Death" }[modo];
    if (modo === "deUmLado") {
      this.pose("Death", 9, false);
      // apoia no chão (mede uma vez a caixa da pose deitada de lado)
      if (this.descLado === undefined) { this.raiz.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(this.inner, true); this.descLado = bb.min.y - this.raiz.position.y; }
      this.inner.position.y = (this.inner.userData.y0 as number) - this.descLado;
      const r = Math.sin(t * 2.2) * 0.02 * (p.respira ?? 1);
      this.giraCorpo("Torso", [0, 0, 1], r);
      if (p.cabeca) { this.giraCorpo("Neck1", [1, 0, 0], LADO_CABECA * p.cabeca * 0.8); this.giraCorpo("Head", [1, 0, 0], LADO_CABECA * p.cabeca * 0.5); }
      if (p.cabecaY) this.giraCorpo("Head", [0, 0, 1], p.cabecaY * 0.5);
    }
    else if (deitado) this.pose("Idle", 0, false);
    else if (modo === "pula") this.pose("Gallop_Jump", Math.min(0.999, Math.max(0, t)) * this.clip("Gallop_Jump").duration, false);
    else this.pose(nome, modo === "trote" ? t * 1.7 : t);
    if (deitado) this.deita(modo === "enrolado", t, p.respira ?? 1);
    if (modo !== "deUmLado" && p.cabeca) { this.giraCorpo("Neck1", [0, 0, 1], p.cabeca * 0.45); this.giraCorpo("Head", [0, 0, 1], p.cabeca * 0.55); }
    if (modo !== "deUmLado" && p.cabecaY) { this.giraCorpo("Neck2", [0, 1, 0], p.cabecaY * 0.5); this.giraCorpo("Head", [0, 1, 0], p.cabecaY * 0.5); }
    if (p.orelha) for (const s of ["L", "R"]) this.giraCorpo("Ear1" + s, [0, 1, 0], p.orelha * (s === "L" ? 1 : 1));
    if (p.rabo) this.giraCorpo("Tail1", [0, 1, 0], 0.5 * Math.sin(t * 13) * p.rabo);
    // olhos
    const ab = p.olho ?? 1;
    const fechado = ab < 0.5;
    for (const me of this.malhas) if ((me.material as THREE.Material).name.startsWith("Eyes")) { me.visible = !fechado; if (me.userData.casco) me.userData.casco.visible = !fechado; }
    for (const g of this.palpebras) (g.userData.arco as THREE.Mesh).visible = fechado;
    this.brilhos.forEach((s) => { s.visible = (p.brilhoOlho ?? 0) > 0.01 && ab > 0.3; (s.material as THREE.SpriteMaterial).opacity = (p.brilhoOlho ?? 0) * ab; });
  }

  /** deitado de esfinge (patas da frente esticadas, de trás dobradas); enrolado = cabeça baixa sobre as patas e
   *  o corpo curvado de lado. Feito girando ossos do Idle em eixo do corpo. */
  deita(enrolado: boolean, t: number, respira: number) {
    const L = (n: string, e: [number, number, number], a: number) => this.giraCorpo(n, e, a);
    // os pés são filhos dos alvos de IK (IKFrontLeg/IKBackLeg), não da perna: guarda o encaixe pé-perna antes
    this.raiz.updateMatrixWorld(true);
    const pares: [string, string][] = [];
    for (const s of ["L", "R"]) pares.push(["IKFrontLeg" + s, "FrontLowerLeg" + s], ["IKBackLeg" + s, "BackLowerLeg" + s]);
    const enc = pares.map(([ik, perna]) => {
      const bi = this.ossos.get(ik)!, bp = this.ossos.get(perna)!;
      const qi = bi.getWorldQuaternion(new THREE.Quaternion()), qp = bp.getWorldQuaternion(new THREE.Quaternion());
      const pi = bi.getWorldPosition(new THREE.Vector3());
      return { bi, bp, off: qp.clone().invert().multiply(qi), loc: bp.worldToLocal(pi.clone()) };
    });
    for (const s of ["L", "R"]) {
      L("FrontUpperLeg" + s, [0, 0, 1], DOG_P.fu);
      L("FrontLowerLeg" + s, [0, 0, 1], DOG_P.fl);
      L("BackLeg" + s, [0, 0, 1], DOG_P.bl);
      L("BackUpperLeg" + s, [0, 0, 1], DOG_P.bu);
      L("BackLowerLeg" + s, [0, 0, 1], DOG_P.bw);
    }
    L("Body", [0, 0, 1], -0.1);
    const resp = Math.sin(t * 2.2) * 0.012 * respira;
    L("Torso", [1, 0, 0], resp);
    if (enrolado) {
      // cabeça baixa, apoiada (queixo quase nas patas) e rabo enrolado ao lado do corpo
      L("Neck1", [0, 0, 1], -0.32);
      L("Head", [0, 0, 1], -0.28);
      L("Tail1", [0, 1, 0], -1.1);
      L("Tail1", [0, 0, 1], -0.8);
    }
    this.raiz.updateMatrixWorld(true);
    for (const e of enc) {
      const qp = e.bp.getWorldQuaternion(new THREE.Quaternion());
      const p = e.bp.localToWorld(e.loc.clone());
      const qPai = e.bi.parent!.getWorldQuaternion(new THREE.Quaternion());
      e.bi.position.copy(e.bi.parent!.worldToLocal(p));
      e.bi.quaternion.copy(qPai.invert().multiply(qp.multiply(e.off)));
      e.bi.updateMatrixWorld(true);
    }
    // abaixa o corpo até a barriga encostar
    this.inner.position.y = (this.inner.userData.y0 as number) - DESCE_DEITADO;
  }
}
export const DESCE_DEITADO = 0.2;
export let LADO_CABECA = 1;
export const DOG_P = { fu: 1.35, fl: 0.1, bl: 0.95, bu: -1.9, bw: 1.2 };

// ------------------------------------------------------------------------------------------ o dono
/** bermuda: na malha da calça, abaixo do joelho vira pele (cor por vértice, pela altura na pose de repouso) */
function bermuda(me: THREE.Mesh, calca: THREE.Color, pele: THREE.Color) {
  const g = me.geometry;
  const p = g.attributes.position as THREE.BufferAttribute;
  // eixo vertical do modelo em repouso: a maior extensão da calça
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const sz = bb.getSize(new THREE.Vector3());
  const ax = sz.x > sz.y && sz.x > sz.z ? 0 : sz.y > sz.z ? 1 : 2;
  const lo = bb.min.getComponent(ax), hi = bb.max.getComponent(ax);
  const cor = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = (p.getComponent(i, ax) - lo) / (hi - lo);
    const c = v < 0.5 ? pele : calca; // a calça vai do pé (0) à cintura (1): metade de baixo é perna nua
    cor.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(cor, 3));
}

export class Dono extends Ator {
  constructor(kit: Kit, g: GLTF) {
    const d = kit.dir;
    const pele = d === "C" ? 0xd9a07a : 0xc68a5e;
    const calca = new THREE.Color(d === "C" ? 0x6f8db4 : 0x34507a);
    super(kit, g, (m) => {
      if (m === "Eyes") return { color: pele, rough: 0.6, semContorno: true };
      if (m === "Shirt") return { color: d === "A" ? 0x9aa0aa : 0xa3a6ad, rough: 0.8 };
      if (m === "Skin") return { color: pele, rough: 0.6 };
      if (m === "Pants") return { vc: true, rough: 0.8 };
      if (m === "Socks") return { color: pele, rough: 0.6 };
      if (m === "Hair") return { color: 0x2b1c14, rough: 0.85 };
      return { color: 0x777777 };
    }, {
      altura: 1.76, rotY: Math.PI / 2, px: 2.6,
      prepara: (me, nm) => { if (nm === "Pants") bermuda(me, calca, kit.cor(pele)); },
    });
  }
  /** deitado de costas/lado na cama: último quadro do Man_Death (cai de costas), com ajustes */
  faz(p: { modo: "deitado" | "parado" | "senta"; t: number; pe?: number; braco?: number; respira?: number }) {
    if (p.modo === "deitado") {
      this.pose("Man_Death", 99, false);
      const r = Math.sin(p.t * 1.6) * 0.02 * (p.respira ?? 1);
      this.giraCorpo("Torso", [0, 0, 1], r);
      if (p.pe) this.giraCorpo("FootR", [0, 0, 1], p.pe);
      if (p.braco) { this.giraCorpo("UpperArmR", [0, 0, 1], p.braco); }
    } else if (p.modo === "senta") this.pose("Man_Sitting", p.t);
    else this.pose("Man_Idle", p.t);
  }
}

export { esfera };
export type { V3 };
