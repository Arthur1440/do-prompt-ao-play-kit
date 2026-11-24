// Quintal (corrida e bolinha) e sala (o "doce dentro de casa"), longe da rua. Peças prontas: sofá (Quaternius, CC0),
// varal (J-Toastie, CC BY 3.0), pote (Poly by Google, CC BY 3.0). Muro, piso, grama e relógio digital: em código.
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Kit, caixa, cil, esfera } from "./kit";
import { texChapisco, texGrama, texMadeira } from "./tex";

export const Q0 = new THREE.Vector3(0, 0, 300); // quintal
export const S0 = new THREE.Vector3(0, 0, 400); // sala

/** coloca um GLB estático com a altura pedida, repintado no estilo da direção */
export function estatico(kit: Kit, g: GLTF, alturaOuComp: { altura?: number; comp?: number }, pai: THREE.Object3D, pos: [number, number, number], rotY = 0, cor?: (nome: string, c: THREE.Color) => THREE.ColorRepresentation) {
  const o = g.scene.clone(true);
  const bb = new THREE.Box3().setFromObject(o);
  const sz = bb.getSize(new THREE.Vector3());
  const s = alturaOuComp.altura ? alturaOuComp.altura / sz.y : alturaOuComp.comp! / Math.max(sz.x, sz.z);
  const w = new THREE.Group();
  o.scale.setScalar(s);
  o.position.set(-(bb.min.x + sz.x / 2) * s, -bb.min.y * s, -(bb.min.z + sz.z / 2) * s);
  w.add(o);
  w.position.set(...pos);
  w.rotation.y = rotY;
  pai.add(w);
  const lista: THREE.Mesh[] = [];
  o.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) lista.push(me); });
  for (const me of lista) {
    const m0 = me.material as THREE.MeshStandardMaterial;
    const c0 = m0.color ? m0.color.clone() : new THREE.Color(0x999999);
    const nm = m0.name ?? "";
    me.material = m0.map ? kit.mat({ map: m0.map, estampa: true, rough: 0.7 }) : kit.mat({ color: cor ? cor(nm, c0) : c0, rough: 0.7 });
    me.castShadow = me.receiveShadow = true;
    kit.contorno(me, 2.4);
  }
  return w;
}

/** relógio digital de mesa marcando 18:00 (vermelho de sete segmentos) */
function texRelogio() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 220;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, 512, 220);
  g.font = "bold 170px 'JetBrains Mono', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#3a0d0d"; g.fillText("88:88", 256, 118);
  g.fillStyle = "#ff3b2f"; g.shadowColor = "#ff2a1a"; g.shadowBlur = 18; g.fillText("18:00", 256, 118);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Quintal {
  g = new THREE.Group();
  constructor(kit: Kit, varal: GLTF, pote: GLTF) {
    const k = kit, g = this.g;
    g.position.copy(Q0);
    const tg = texGrama(); tg.repeat.set(10, 10);
    k.m(new THREE.PlaneGeometry(30, 30), k.mat({ map: tg, chapada: 0x6fae45, color: 0x9fd070, rough: 0.95, clear: 0 }), 0, g, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    const bump = texChapisco();
    const mMuro = k.mat({ color: 0xe8b866, rough: 0.85, bump, bumpS: 1.2 });
    const mTopo = k.mat({ color: 0xece6da, rough: 0.6 });
    // muros do quintal (fundo e laterais) e a parede dos fundos da casa
    for (const [x, z, w, rot] of [[0, -7, 14, 0], [-7, 0, 14, Math.PI / 2], [7, 0, 14, Math.PI / 2]] as [number, number, number, number][]) {
      k.m(caixa(w, 2.0, 0.2, 0.02), mMuro, 2.6, g, [x, 1.0, z], [0, rot, 0]);
      k.m(caixa(w + 0.04, 0.08, 0.28, 0.02), mTopo, 2, g, [x, 2.04, z], [0, rot, 0]);
    }
    const mCasa = k.mat({ color: 0xf4ead7, rough: 0.8, bump, bumpS: 0.6 });
    k.m(caixa(14, 3.2, 0.3, 0.02), mCasa, 2.6, g, [0, 1.6, 7]);
    k.m(caixa(1.0, 2.1, 0.08, 0.02), k.mat({ color: 0x6b4a32, rough: 0.6 }), 2.4, g, [-2.2, 1.05, 6.82]);
    k.m(caixa(1.4, 1.0, 0.06, 0.02), k.mat({ color: 0x2b3440, rough: 0.2, clear: 0.9 }), 2.4, g, [1.6, 1.7, 6.82]);
    // calçadinha de cimento junto da casa
    k.m(caixa(14, 0.06, 1.4, 0), k.mat({ color: 0xc9c1b2, rough: 0.8 }), 2, g, [0, 0.03, 6.1]);
    estatico(k, varal, { comp: 3.2 }, g, [3.5, 0, 2.5], Math.PI / 2);
    estatico(k, pote, { comp: 0.32 }, g, [-1.0, 0.06, 5.9], 0, () => 0xc8202c);
    // árvore no canto
    k.m(cil(0.12, 0.16, 2.6, 12), k.mat({ color: 0x6b4a32, rough: 0.9 }), 2.4, g, [-5.6, 1.3, -5.6]);
    const mFol = k.mat({ color: 0x4f8a3a, rough: 0.9, clear: 0 });
    for (const [dx, dy, dz, r] of [[0, 3.1, 0, 1.2], [0.7, 2.8, 0.3, 0.9], [-0.6, 2.9, -0.4, 0.95], [0.1, 3.7, 0.2, 0.8]]) k.m(esfera(r, 20, 14), mFol, 3, g, [-5.6 + dx, dy, -5.6 + dz]);
  }
}

export class Sala {
  g = new THREE.Group();
  constructor(kit: Kit, sofa: GLTF) {
    const k = kit, g = this.g;
    g.position.copy(S0);
    const mad = texMadeira(); mad.repeat.set(3, 3);
    k.m(new THREE.PlaneGeometry(10, 10), k.mat({ map: mad, chapada: 0xb07a4a, color: 0xffffff, rough: 0.6, estampa: k.dir === "B" ? false : undefined }), 0, g, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    const mPar = k.mat({ color: 0xcfe0d8, rough: 0.85 });
    k.m(caixa(10, 3, 0.2, 0), mPar, 0, g, [0, 1.5, -2.5]);
    k.m(caixa(0.2, 3, 10, 0), mPar, 0, g, [-3.2, 1.5, 0]);
    // janela com o fim de tarde
    k.m(caixa(1.6, 1.2, 0.05, 0.01), k.mat({ color: 0xffb070, emis: 0xff9a50, emisI: 0.9 }), 0, g, [1.4, 1.65, -2.38]);
    k.m(caixa(1.75, 1.35, 0.06, 0.02), k.mat({ color: 0xf2efe6, rough: 0.6 }), 2, g, [1.4, 1.65, -2.42]);
    k.m(caixa(0.06, 1.2, 0.08, 0.01), k.mat({ color: 0xf2efe6, rough: 0.6 }), 1.6, g, [1.4, 1.65, -2.34]);
    // tapete e sofá
    k.m(caixa(2.6, 0.02, 1.7, 0.01), k.mat({ color: 0xc0583c, rough: 0.95, clear: 0 }), 1.6, g, [-0.4, 0.01, 0.4]);
    estatico(k, sofa, { comp: 2.1 }, g, [-0.4, 0, -1.6], 0, () => 0x3f6fa8);
    // estante baixa com o relógio digital 18:00
    k.m(caixa(1.2, 0.6, 0.4, 0.03), k.mat({ color: 0x8a5a36, rough: 0.6 }), 2.4, g, [-2.6, 0.3, 1.2], [0, Math.PI / 2, 0]);
    const rel = new THREE.Group();
    rel.position.set(-2.62, 0.69, 1.2);
    rel.rotation.y = Math.PI / 2;
    g.add(rel);
    k.m(caixa(0.36, 0.16, 0.12, 0.03), k.mat({ color: 0x1c1c20, rough: 0.4, clear: 0.6 }), 2.2, rel);
    k.m(new THREE.PlaneGeometry(0.31, 0.12), new THREE.MeshBasicMaterial({ map: texRelogio(), toneMapped: false }), 0, rel, [0, 0, 0.061]);
  }
}
/** posição do relógio digital (mundo), para enquadrar o "dá seis da tarde" */
export const RELOGIO = new THREE.Vector3(-2.62 + S0.x, 0.69 + S0.y, 1.2 + S0.z);
