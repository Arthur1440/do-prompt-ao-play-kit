// Modelos prontos (CC0 / CC BY) carregados do public/modelos e repintados por direção:
//   shiba.glb (Quaternius, CC0) -> o vira-lata preto de peito e patas brancas, coleira vermelha, orelha meio caída
//   lobo.glb, cervo.glb (Quaternius, CC0); homem.glb (Quaternius "Man", CC0) -> o dono sem rosto
//   base.glb (Quaternius "Animated Base Character", CC BY 3.0) -> o motoqueiro (Driving_Loop) com capacete
//   moto2.glb (Poly by Google "Motorcycle", CC BY 3.0) -> a moto
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSk } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { staticFile } from "remotion";
import { Kit, OpMat, esfera, caixa, cil } from "./kit";

const CACHE = new Map<string, Promise<GLTF>>();
export function carrega(arq: string) {
  if (!CACHE.has(arq)) CACHE.set(arq, new GLTFLoader().loadAsync(staticFile("modelos/" + arq)));
  return CACHE.get(arq)!;
}
export const ARQS = ["shiba.glb", "lobo.glb", "cervo.glb", "homem.glb", "base.glb", "moto2.glb", "sofa.glb", "varal.glb", "pote.glb"];
export const carregaTodos = () => Promise.all(ARQS.map(carrega));

/** suaviza o low poly: normal média por POSIÇÃO (mantém os vértices duplicados, que guardam pesos e cores) */
function suaviza(g: THREE.BufferGeometry) {
  const h = g.index ? g.toNonIndexed() : g.clone();
  h.computeVertexNormals();
  const p = h.attributes.position as THREE.BufferAttribute, n = h.attributes.normal as THREE.BufferAttribute;
  const soma = new Map<string, THREE.Vector3>();
  const ch = (i: number) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  // normal de face ponderada por área (toNonIndexed: 3 vértices por triângulo)
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

export class Ator {
  raiz = new THREE.Group(); // posição/rotação no mundo (frente = +X)
  inner: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  ossos = new Map<string, THREE.Bone>();
  malhas: THREE.Mesh[] = [];
  atual?: THREE.AnimationAction;
  escala = 1;
  constructor(public kit: Kit, gltf: GLTF, cores: (mat: string) => OpMat | null, opts: { altura: number; rotY?: number; suave?: boolean; px?: number }) {
    this.inner = cloneSk(gltf.scene);
    // pose de repouso (bind) de todos os ossos, guardada ANTES de qualquer animação
    this.inner.traverse((b) => { if ((b as THREE.Bone).isBone) this.repouso.push({ b, p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() }); });
    this.clips = gltf.animations;
    // altura medida JÁ com a animação (o esqueleto do Quaternius tem outra unidade que a malha em repouso)
    this.mixer = new THREE.AnimationMixer(this.inner);
    if (this.clips.length) {
      const c0 = this.clips.find((c) => /Idle/.test(c.name)) ?? this.clips[0];
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
      me.material = this.kit.mat(op);
      (me.material as THREE.Material).name = nm;
      if (opts.suave !== false) me.geometry = suaviza(me.geometry);
      me.castShadow = me.receiveShadow = true;
      me.frustumCulled = false;
      this.malhas.push(me);
      casca.push(me);
    });
    this.inner.updateMatrixWorld(true);
    for (const me of casca) this.kit.contorno(me, opts.px ?? 3);
  }
  /** gira o osso em torno de um eixo do CORPO (x frente, y cima, z lado), com o ângulo em radianos.
   *  O eixo é levado ao mundo pela rotação da raiz, então o resultado não depende de como o modelo foi rigado. */
  giraCorpo(n: string, eixo: [number, number, number], ang: number) {
    const b = this.ossos.get(n);
    if (!b || !b.parent) return;
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
  /** centros (mundo) dos vértices das malhas com material `nome`, separados pelo sinal de z do mundo */
  centros(nome: string) {
    this.raiz.updateMatrixWorld(true);
    const lados: THREE.Vector3[][] = [[], []];
    for (const me of this.malhas) {
      if ((me.material as THREE.Material).name !== nome) continue;
      const sk = me as THREE.SkinnedMesh, v = new THREE.Vector3();
      const n = me.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        if (sk.isSkinnedMesh) sk.getVertexPosition(i, v); else v.fromBufferAttribute(me.geometry.attributes.position as THREE.BufferAttribute, i);
        v.applyMatrix4(me.matrixWorld);
        lados[v.z > 0 ? 0 : 1].push(v.clone());
      }
    }
    return lados.map((l) => l.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, l.length)));
  }
  clip(nome: string) {
    return this.clips.find((c) => c.name === nome) ?? this.clips.find((c) => c.name.endsWith("|" + nome)) ?? this.clips.find((c) => c.name.includes(nome))!;
  }
  /** amostra a animação `nome` no tempo t (função pura do tempo) */
  repouso: { b: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[] = [];
  pose(nome: string, t: number) {
    // função pura do tempo: volta TODOS os nós à pose de repouso antes de aplicar a animação. Sem isso, os giros
    // de ajuste (giraCorpo/gira) se acumulam quadro a quadro nos ossos que a animação não controla e o boneco entorta.
    if (!this.repouso.length) this.inner.traverse((b) => { if ((b as THREE.Bone).isBone || b.type === "Object3D" || b.type === "Group") if (b !== this.inner) this.repouso.push({ b, p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() }); });
    for (const r of this.repouso) { r.b.position.copy(r.p); r.b.quaternion.copy(r.q); r.b.scale.copy(r.s); }
    if (this.inner.userData.y0 !== undefined) this.inner.position.y = this.inner.userData.y0;
    const c = this.clip(nome);
    this.mixer.stopAllAction();
    const a = this.mixer.clipAction(c);
    a.reset();
    a.play();
    a.time = ((t % c.duration) + c.duration) % c.duration;
    this.mixer.update(0);
    this.atual = a;
  }
  /** rotação extra num osso (por cima da animação) */
  gira(n: string, x = 0, y = 0, z = 0) {
    const b = this.ossos.get(n);
    if (!b) return;
    b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
  }
}

/** bolinha de tênis: amarelo-limão com a costura branca */
export function texBola() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d8ef3a"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#ffffff"; g.lineWidth = 7;
  g.beginPath();
  for (let x = 0; x <= 256; x += 4) { const y = 64 + 34 * Math.sin((x / 256) * Math.PI * 4); x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------------------------------ elenco
const PRETO: Record<string, number> = { A: 0x050507, B: 0x3a3947, C: 0x2e3652 };
const BRANCO: Record<string, number> = { A: 0xeee8dc, B: 0xf3eee4, C: 0xfaf3e2 };

export class Cachorro extends Ator {
  static ORELHA: [number, number, number] = [0, 0, 1];
  coleira = new THREE.Group();
  olhoL = new THREE.Vector3(); // centro do olho em coordenadas do osso Head (medido no carregamento)
  pupilas: THREE.Mesh[] = [];
  constructor(kit: Kit, gltf: GLTF) {
    const d = kit.dir;
    super(kit, gltf, (m) => {
      if (m === "Main") return { color: PRETO[d], rough: 0.5, clear: d === "A" ? 0.08 : 0.3, brilho: 1, espec: d === "A" ? 0.12 : undefined };
      if (m === "Main_Light") return { color: BRANCO[d], rough: 0.55, clear: 0.25 };
      if (m === "Black") return { color: 0x0c0b0d, rough: 0.25, clear: 0.9, brilho: 1 };
      if (m === "Eyes_White") return { color: 0x2a1a10, rough: 0.1, clear: 1, brilho: 1 };
      if (m === "Eyes_Pupil") return { color: 0x050404, rough: 0.05, clear: 1, brilho: 1 };
      if (m === "Eyes_Black") return { color: 0x070606, rough: 0.05, clear: 1 };
      return { color: 0x888888 };
    }, { altura: 0.62, rotY: Math.PI / 2 });
    for (const me of this.malhas) {
      const n = (me.material as THREE.Material).name;
      void n;
    }
    // coleira vermelha com plaquinha, presa ao pescoço (eixo do anel = direção pescoço -> cabeça, na pose parada)
    this.raiz.updateMatrixWorld(true);
    const pA = new THREE.Vector3(), pB = new THREE.Vector3();
    (this.ossos.get("Neck1") ?? this.ossos.get("Neck2")!).getWorldPosition(pA);
    this.ossos.get("Head")!.getWorldPosition(pB);
    const eixo = pB.clone().sub(pA).normalize();
    const meio = pA.clone().lerp(pB, 0.35);
    this.prende("Neck2", this.coleira, meio, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eixo));
    const tor = new THREE.TorusGeometry(0.068, 0.013, 12, 48);
    tor.rotateX(Math.PI / 2);
    kit.m(tor, kit.mat({ color: 0xd3202a, rough: 0.4, clear: 0.5, brilho: 1 }), 2.2, this.coleira, [0, 0, 0], [0, 0, 0], [1, 1, 1.0]);
    kit.m(cil(0.02, 0.02, 0.005, 24), kit.mat({ color: 0xe8b33c, metal: 0.9, rough: 0.25 }), 1.6, this.coleira, [0.07, -0.02, 0], [0, 0, Math.PI / 2]);
    this.olhosMundo = this.centros("Eyes_Black");
  }
  olhosMundo: THREE.Vector3[] = [];
  bola = new THREE.Group(); // bolinha presa à boca
  lingua = new THREE.Group(); // língua de fora (o modelo não tem)
  /** galope, trote, parado, late, pula, deita (cabeça baixa) — com orelha (1 = meio caída, 0 = em pé de alerta),
   *  rabo (0..1 sobe e abana) e cabeça (rad, + = focinho para cima). Ajustes em eixo do CORPO (giraCorpo). */
  anda(modo: "galope" | "trote" | "parado" | "late" | "pula" | "baixa", t: number, o: { rabo?: number; cabeca?: number; orelha?: number } = {}) {
    const nome = { galope: "Gallop", trote: "Walk", late: "Attack", parado: "Idle", pula: "Gallop_Jump", baixa: "Idle_2_HeadLow" }[modo];
    this.pose(nome, modo === "trote" ? t * 1.15 : t);
    const ore = o.orelha ?? 1;
    for (const s of ["L", "R"]) { const e = Cachorro.ORELHA; this.gira("Ear2" + s, e[0] * 0.45 * ore, e[1] * 0.45 * ore, e[2] * 0.45 * ore); this.gira("Ear3" + s, e[0] * 0.9 * ore, e[1] * 0.9 * ore, e[2] * 0.9 * ore); }
    if (o.rabo) {
      this.giraCorpo("Tail1", [0, 0, 1], -0.35 * o.rabo);
      this.giraCorpo("Tail1", [0, 1, 0], 0.45 * Math.sin(t * 14) * o.rabo);
    }
    if (o.cabeca) this.giraCorpo("Head", [0, 0, 1], o.cabeca);
  }
  /** monta a bolinha de tênis na boca (chamar uma vez, na pose parada) */
  montaBola(kit: Kit) {
    this.pose("Idle", 0);
    const nar = this.centros("Black");
    const n = nar[0].clone().lerp(nar[1], 0.5);
    this.prende("Head", this.bola, n.clone().add(new THREE.Vector3(0.012, -0.045, 0)), new THREE.Quaternion()); // à frente e abaixo do nariz (o cachorro olha para +X)
    kit.m(new THREE.SphereGeometry(0.034, 28, 20), kit.mat({ map: texBola(), estampa: true, rough: 0.9, clear: 0 }), 2.2, this.bola);
    this.bola.visible = false;
    // língua: lâmina rosa saindo do canto da boca e pendendo para baixo
    this.prende("Head", this.lingua, nar[0].clone().lerp(nar[1], 0.5).add(new THREE.Vector3(-0.05, -0.05, 0.012)), new THREE.Quaternion());
    const lg = new THREE.SphereGeometry(1, 24, 16);
    kit.m(lg, kit.mat({ color: 0xe5637c, rough: 0.35, clear: 0.6 }), 1.8, this.lingua, [0.0, -0.03, 0.0], [0, 0, -1.25], [0.045, 0.02, 0.026]);
    this.lingua.visible = false;
  }

}

export function lobo(kit: Kit, g: GLTF) {
  const c = kit.dir === "C" ? { m: 0x6f6a72, l: 0xd9d2c8 } : { m: 0x6e6862, l: 0xd2c8ba };
  return new Ator(kit, g, (m) => (m === "Main" ? { color: c.m, rough: 0.7 } : m === "Main_Light" ? { color: c.l, rough: 0.7 } : m === "Nose" || m === "Eyes_Black" ? { color: 0x0b0a0b, rough: 0.2, clear: 1 } : { color: 0x222222 }), { altura: 1.0, rotY: Math.PI / 2 });
}
export function cervo(kit: Kit, g: GLTF) {
  return new Ator(kit, g, (m) => {
    if (m === "Main") return { color: 0x9a5f34, rough: 0.7 };
    if (m === "Main_Light") return { color: 0xe3cfb0, rough: 0.7 };
    if (m === "Main_Dark") return { color: 0x5d3a22, rough: 0.7 };
    if (m === "Hooves" || m.startsWith("Eye")) return { color: 0x1a1412, rough: 0.3, clear: 0.8 };
    return { color: 0x8a6040 };
  }, { altura: 1.55, rotY: Math.PI / 2 });
}

/** dono sem rosto: o "Man" do Quaternius com os olhos escondidos (cabeça lisa) */
export class Dono extends Ator {
  constructor(kit: Kit, g: GLTF) {
    super(kit, g, (m) => {
      if (m === "Eyes") return { color: 0xa8714c, rough: 0.6, semContorno: true }; // tapa o olho: rosto liso
      if (m === "Shirt") return { color: 0xe2b63c, rough: 0.7 };
      if (m === "Skin") return { color: 0xa8714c, rough: 0.6 };
      if (m === "Pants") return { color: 0x2b3a5a, rough: 0.8 };
      if (m === "Socks") return { color: 0x2a62b8, rough: 0.6 }; // chinelo azul
      if (m === "Hair") return { color: 0x231811, rough: 0.8 };
      return { color: 0x777777 };
    }, { altura: 1.74, rotY: Math.PI / 2, px: 2.6 });
    // rosto liso: a malha do "Man" tem nariz, olhos e boca esculpidos. Cobre a cabeça com um ovo de manequim
    // (cor da pele, um pouco maior que a cabeça) e põe uma calota de cabelo por cima; o cabelo original some.
    this.raiz.updateMatrixWorld(true);
    const cab = new THREE.Vector3();
    this.ossos.get("Head")!.getWorldPosition(cab);
    const bb = new THREE.Box3();
    for (const me of this.malhas) {
      const nm = (me.material as THREE.Material).name;
      if (nm !== "Skin" && nm !== "Hair") continue;
      const sk = me as THREE.SkinnedMesh, v = new THREE.Vector3();
      for (let i = 0; i < me.geometry.attributes.position.count; i++) {
        sk.getVertexPosition(i, v); v.applyMatrix4(me.matrixWorld);
        if (v.y > cab.y - 0.02 && Math.hypot(v.x - cab.x, v.z - cab.z) < 0.16) bb.expandByPoint(v);
      }
      if (nm === "Hair") me.visible = false;
    }
    const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
    const ovo = new THREE.Group();
    this.prende("Head", ovo, c, new THREE.Quaternion());
    kit.m(new THREE.SphereGeometry(1, 40, 28), kit.mat({ color: 0xa8714c, rough: 0.6 }), 2.6, ovo, [0.006, -0.004, 0], [0, 0, 0], [sz.x / 2 + 0.012, sz.y / 2 + 0.006, sz.z / 2 + 0.01]);
    const capa = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, 1.25);
    capa.rotateZ(0.5); // a calota pende para trás (+X é a frente)
    kit.m(capa, kit.mat({ color: 0x231811, rough: 0.85 }), 2.6, ovo, [-0.004, 0.012, 0], [0, 0, 0], [sz.x / 2 + 0.02, sz.y / 2 + 0.016, sz.z / 2 + 0.02]);
  }
  faz(p: "ri" | "palma" | "parado" | "joga" | "corre", t: number) {
    if (p === "palma") { this.pose("Man_Clapping", t); return; }
    if (p === "joga") { this.pose("Man_SwordSlash", t); return; }
    if (p === "corre") { this.pose("Man_Run", t); return; } // golpe por cima = arremesso por cima do ombro
    this.pose("Man_Idle", t);
    if (p === "ri") {
      // rindo de verdade: o tronco joga um pouco para trás em soquinhos, a cabeça vai junto,
      // e as duas mãos seguram a barriga (braço para a frente, cotovelo dobrado para a frente)
      const k = 0.5 + 0.5 * Math.sin(t * 15), k2 = 0.5 + 0.5 * Math.sin(t * 15 + 0.6);
      this.giraCorpo("Abdomen", [0, 0, 1], 0.05 + 0.04 * k);
      this.giraCorpo("Torso", [0, 0, 1], 0.04 + 0.04 * k);
      this.giraCorpo("Head", [0, 0, 1], 0.08 + 0.07 * k2);
      for (const s of ["L", "R"]) {
        // olhando para +X, o lado direito do corpo é +Z; o braço esquerdo (-Z) vira para +Z e vice-versa
        const lado = s === "L" ? -1 : 1;
        this.giraCorpo("UpperArm" + s, [0, 0, 1], 0.14);
        this.giraCorpo("LowerArm" + s, [0, 0, 1], (s === "L" ? 0.78 : 0.9) + 0.05 * k);
        this.giraCorpo("LowerArm" + s, [0, 1, 0], lado * 0.3);
      }
      this.inner.position.y = this.inner.userData.y0 - 0.012 * k;
    }
  }
}

/** moto de rua (repintada de vermelho, placa sem letras) + motoqueiro de capacete fechado */
export const PILOTO: [number, number] = [-0.1, 0.12];
export class MotoPronta {
  g = new THREE.Group();
  corpo: THREE.Object3D;
  piloto: Ator;
  rodas: THREE.Object3D[] = [];
  farol?: THREE.Mesh;
  fumaca: THREE.Mesh[] = [];
  escape = new THREE.Vector3(-0.78, 0.36, -0.2);
  olhos: THREE.Sprite[] = []; // faróis acesos como olhos (plano do "bicho grande correndo")
  constructor(public kit: Kit, gm: GLTF, gb: GLTF) {
    const k = kit;
    const m = gm.scene.clone(true);
    const bb = new THREE.Box3().setFromObject(m);
    const sz = bb.getSize(new THREE.Vector3());
    // comprimento real ~2 m; o eixo mais longo vira +X
    const longoX = sz.x >= sz.z;
    const s = 2.0 / Math.max(sz.x, sz.z);
    const w = new THREE.Group();
    w.add(m);
    m.scale.setScalar(s);
    // o modelo olha para -X: meia-volta para a frente ficar em +X
    w.rotation.y = longoX ? 0 : Math.PI / 2;
    const c = bb.getCenter(new THREE.Vector3());
    m.position.set(-c.x * s, -bb.min.y * s, -c.z * s);
    this.corpo = w;
    this.g.add(w);
    const cor = (o: THREE.Mesh) => {
      const mt = o.material as THREE.MeshStandardMaterial;
      const c0 = mt.color ? mt.color.clone() : new THREE.Color(0x888888);
      return { c0, mapa: mt.map };
    };
    m.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh) return;
      const { mapa } = cor(me);
      // a moto vem com atlas de cores: mantém o atlas na maquete e no toon (estampa), e troca o azul pelo vermelho
      if (mapa) {
        const im = mapa.image as HTMLImageElement | ImageBitmap;
        const cv = document.createElement("canvas");
        cv.width = im.width; cv.height = im.height;
        const g = cv.getContext("2d")!;
        g.drawImage(im as CanvasImageSource, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const r = d.data[i], gg = d.data[i + 1], b = d.data[i + 2];
          if (b > r + 25 && b > gg + 10) { const l = (r + gg + b) / 3; d.data[i] = Math.min(255, 90 + l * 1.6); d.data[i + 1] = l * 0.25; d.data[i + 2] = l * 0.3; }
        }
        g.putImageData(d, 0, 0);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = false;
        me.material = k.mat({ map: t, estampa: true, rough: 0.35, clear: 0.7, brilho: 0.8 });
      } else me.material = k.mat({ color: 0x777777 });
      me.castShadow = me.receiveShadow = true;
    });
    m.updateMatrixWorld(true);
    const lista: THREE.Mesh[] = [];
    m.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) lista.push(me); });
    for (const me of lista) k.contorno(me, 2.6);
    // motoqueiro (boneco base sem rosto) na pose de pilotar
    this.piloto = new Ator(k, gb, (mt) => (mt === "M_Main" ? { color: 0x2f3440, rough: 0.6, clear: 0.2 } : { color: 0x1d2a44, rough: 0.6 }), { altura: 1.25, rotY: -Math.PI / 2, px: 2.6 });
    this.piloto.raiz.position.set(PILOTO[0], PILOTO[1], 0);
    this.g.add(this.piloto.raiz);
    const cab = this.piloto.ossos.get("DEF-head");
    if (cab) {
      const hg = new THREE.Group();
      this.piloto.pose("Driving_Loop", 0);
      this.piloto.raiz.updateMatrixWorld(true);
      const pc = new THREE.Vector3();
      cab.getWorldPosition(pc);
      this.piloto.prende("DEF-head", hg, pc.add(new THREE.Vector3(0.01, 0.1, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)));
      kit.m(esfera(0.15, 40, 28), kit.mat({ color: 0x2b2e33, rough: 0.35, clear: 0.8, brilho: 1 }), 2.6, hg, [0, 0, 0], [0, 0, 0], [0.98, 1.0, 1.08]);
      const vis = new THREE.SphereGeometry(0.153, 40, 20, -0.95, 1.9, 1.05, 0.62);
      vis.rotateY(Math.PI / 2);
      kit.m(vis, kit.dir === "A" ? new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, roughness: 0.05, metalness: 0.4, clearcoat: 1 }) : kit.mat({ color: 0x1a2030, metal: 0.9 }), 2, hg, [0, -0.005, 0.012], [0, 0, 0], [0.99, 1.0, 1.08]);
      kit.m(caixa(0.2, 0.07, 0.07, 0.03), kit.mat({ color: 0x2b2e33, rough: 0.4, clear: 0.6 }), 2, hg, [0, -0.11, 0.12], [0.2, 0, 0]);
    }
    const cvO = document.createElement("canvas");
    cvO.width = cvO.height = 128;
    const go = cvO.getContext("2d")!;
    const gr = go.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.18, "rgba(255,240,170,1)"); gr.addColorStop(0.45, "rgba(255,190,80,0.45)"); gr.addColorStop(1, "rgba(255,150,40,0)");
    go.fillStyle = gr; go.fillRect(0, 0, 128, 128);
    const tO = new THREE.CanvasTexture(cvO);
    for (const z of [0.21, -0.21]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tO, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
      sp.position.set(0.86, 1.0, z);
      sp.scale.setScalar(0.5);
      sp.userData.semArame = true;
      sp.visible = false;
      this.g.add(sp);
      this.olhos.push(sp);
    }
    const mF = k.mat({ color: 0xd9d6d0, rough: 1, clear: 0, brilho: 0.4 });
    for (let i = 0; i < 9; i++) {
      const f = k.m(new THREE.IcosahedronGeometry(1, 2), mF, 2, this.g);
      f.visible = false;
      this.fumaca.push(f);
    }
  }
  aplica(o: { pos: [number, number, number]; rotY?: number; t: number; v: number; acel?: number; fum?: number; lean?: number; bicho?: number }) {
    this.g.visible = true;
    const bi = o.bicho ?? 0;
    this.olhos.forEach((sp, i) => { sp.visible = bi > 0.01; sp.material.opacity = bi; sp.scale.setScalar(0.4 + 0.45 * bi + 0.04 * Math.sin(o.t * 20 + i)); });
    this.g.position.set(...o.pos);
    this.g.rotation.order = "YXZ"; // vira (Y) e depois deita na curva (X = eixo da moto)
    this.g.rotation.set(o.lean ?? 0, o.rotY ?? 0, 0);
    const a = o.acel ?? 0;
    this.corpo.rotation.z = 0.05 * a + 0.004 * Math.sin(o.t * 23);
    this.corpo.position.y = 0.005 * Math.sin(o.t * 31);
    if (this.kit.dir === "B") this.corpo.scale.set(1 + 0.06 * a, 1 - 0.05 * a, 1);
    this.piloto.pose("Driving_Loop", o.t);
    // inclina o tronco e baixa os braços até o guidão (eixo do corpo: -Z = tomba para a frente)
    this.piloto.giraCorpo("DEF-spine001", [0, 0, 1], -0.5 - 0.1 * a);
    this.piloto.giraCorpo("DEF-spine003", [0, 0, 1], -0.12);
    this.piloto.giraCorpo("DEF-head", [0, 0, 1], 0.4);
    for (const s of ["L", "R"]) { this.piloto.giraCorpo("DEF-upper_arm" + s, [0, 0, 1], 0.55); this.piloto.giraCorpo("DEF-forearm" + s, [0, 0, 1], -0.15); }
    this.piloto.raiz.rotation.z = this.corpo.rotation.z;
    const fum = o.fum ?? 0;
    this.fumaca.forEach((f, i) => {
      const ph = (o.t * 2.2 + i / this.fumaca.length) % 1;
      f.visible = fum > 0.01;
      f.scale.setScalar(Math.max(0.001, (0.05 + 0.16 * ph) * fum * (1 - ph * 0.35)));
      f.position.set(this.escape.x - ph * (0.6 + o.v * 0.12), this.escape.y + ph * 0.18 + 0.03 * Math.sin(i * 7), this.escape.z - ph * 0.1 + 0.04 * Math.cos(i * 5));
    });
  }
}
