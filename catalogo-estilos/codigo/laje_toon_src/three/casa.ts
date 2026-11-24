// A casa em obra (só paredes, sem teto), o canteiro e o cenário em volta. Escala: pedreiro = 1.
// Interior x ∈ [-IX, IX], z ∈ [-IZ, IZ]; paredes de espessura E e altura HP. A frente (porta) olha para +z.
import * as THREE from "three";
import { Kit, V3, caixa, cil, esfera, torno, perfil } from "./kit";
import { texTijolo, texChao, texRacha } from "./tex";
import { escadaMao } from "./props";

export const IX = 1.4, IZ = 1.1, E = 0.14, HP = 1.5;
export const PORTA = { x0: -0.3, x1: 0.3, y1: 1.05 };
export const JANELA = { x0: 0.75, x1: 1.15, y0: 0.55, y1: 1.05 };
export const ESCADA = { x: 0.52, zBase: IZ + E + 0.62, alt: 1.95 };

/** caixa com UV em metros (textura de tijolo repete pelo tamanho real da face) */
export function caixaUV(w: number, h: number, d: number, tile = 0.4, ox = 0, oy = 0, seg = 1) {
  const S = (v: number) => Math.max(1, Math.round(v * seg));
  const g = new THREE.BoxGeometry(w, h, d, S(w), S(h), S(d));
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // ordem das faces: +x, -x, +y, -y, +z, -z (4 vértices cada)
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  // grupos de face na ordem +x, -x, +y, -y, +z, -z
  const idx = g.index!;
  for (let f = 0; f < 6; f++) {
    const gr = g.groups[f];
    const vs = new Set<number>();
    for (let j = gr.start; j < gr.start + gr.count; j++) vs.add(idx.getX(j));
    for (const i of vs) uv.setXY(i, (uv.getX(i) * dims[f][0] + ox) / tile, (uv.getY(i) * dims[f][1] + oy) / tile);
  }
  return g;
}

export class Casa {
  g = new THREE.Group();
  paredes = new THREE.Group(); // sólidos fechados (corte)
  frente = new THREE.Group(); // parede da frente (some no corte)
  piso: THREE.Mesh;
  chao: THREE.Mesh;
  escada: THREE.Group;
  rachas: THREE.Mesh[] = [];
  planoRacha = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10);
  cenario = new THREE.Group();
  matTij: THREE.Material;
  constructor(public k: Kit) {
    const d = k.dir;
    const tij = texTijolo(d);
    this.matTij = k.mat({ map: tij, rough: 0.8 });
    const P = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, pai: THREE.Object3D) => {
      const w = x1 - x0, h = y1 - y0, dd = z1 - z0;
      const me = k.m(caixaUV(w, h, dd, 0.4, x0, y0, d === "C" ? 10 : 1), this.matTij, 3, pai, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], undefined, undefined, d === "C");
      return me;
    };
    const zf0 = IZ, zf1 = IZ + E;
    // frente: porta e janela
    P(-IX - E, PORTA.x0, 0, HP, zf0, zf1, this.frente);
    P(PORTA.x0, PORTA.x1, PORTA.y1, HP, zf0, zf1, this.frente);
    P(PORTA.x1, JANELA.x0, 0, HP, zf0, zf1, this.frente);
    P(JANELA.x0, JANELA.x1, 0, JANELA.y0, zf0, zf1, this.frente);
    P(JANELA.x0, JANELA.x1, JANELA.y1, HP, zf0, zf1, this.frente);
    P(JANELA.x1, IX + E, 0, HP, zf0, zf1, this.frente);
    // fundos e laterais
    P(-IX - E, IX + E, 0, HP, -IZ - E, -IZ, this.paredes);
    P(-IX - E, -IX, 0, HP, -IZ, IZ, this.paredes);
    P(IX, IX + E, 0, HP, -IZ, IZ, this.paredes);
    this.paredes.add(this.frente);
    this.g.add(this.paredes);
    // contrapiso
    this.piso = k.m(caixa(2 * IX, 0.03, 2 * IZ, 0), k.mat({ color: d === "B" ? "#B9B6AF" : "#9C998F", rough: 0.9 }), 2, this.g, [0, 0.015, 0]);
    // chão do canteiro (terra e grama)
    const R = d === "A" ? 6.5 : 14;
    const geoChao = d === "A" ? caixa(2 * R, 0.4, 2 * R, 0.08) : new THREE.PlaneGeometry(2 * R, 2 * R, 1, 1);
    const tc = texChao(d);
    const matChao = k.mat({ map: tc, rough: 0.95, semContorno: true });
    this.chao = k.m(geoChao, matChao, 0, this.g, d === "A" ? [0, -0.2, 0] : [0, 0, 0], d === "A" ? undefined : [-Math.PI / 2, 0, 0], undefined, false);
    if (d === "A") {
      // a maquete apoiada numa mesa de madeira (aparece só no plano aéreo)
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), k.mat({ color: "#7A5434", rough: 0.55, semContorno: true }));
      mesa.rotation.x = -Math.PI / 2;
      mesa.position.y = -0.4;
      mesa.receiveShadow = true;
      this.g.add(mesa);
    }
    // escada de mão apoiada na frente, entre a porta e a janela
    this.escada = escadaMao(k, ESCADA.alt, 0.42, 7);
    const incl = Math.atan2(ESCADA.zBase - (IZ + E + 0.03), ESCADA.alt);
    this.escada.position.set(ESCADA.x, 0, ESCADA.zBase);
    this.escada.rotation.x = -incl;
    this.g.add(this.escada);
    // rachaduras (frente e lateral esquerda, por fora), reveladas de cima para baixo
    const rmat = (seed: number) => {
      const m = new THREE.MeshBasicMaterial({ map: texRacha(seed), transparent: true, depthWrite: false, color: 0xffffff, clippingPlanes: [this.planoRacha] });
      m.polygonOffset = true; m.polygonOffsetFactor = -2;
      return m;
    };
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), rmat(3));
    r1.position.set(-0.85, HP - 0.55, IZ + E + 0.003);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), rmat(8));
    r2.position.set(1.55 - 0.2, HP - 0.55, IZ + E + 0.003);
    const r3 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), rmat(5));
    r3.position.set(-IX - E - 0.003, HP - 0.55, 0.2);
    r3.rotation.y = -Math.PI / 2;
    for (const r of [r1, r2, r3]) { r.userData.semArame = true; this.rachas.push(r); this.g.add(r); }
    this.montaCenario();
  }

  private montaCenario() {
    const k = this.k, d = k.dir;
    const c = this.cenario;
    this.g.add(c);
    // monte de areia
    const areia = k.mat({ color: d === "B" ? "#F2CD7E" : "#D9B272", rough: 0.95 });
    const am = k.m(torno(perfil([[0.0, 0.55], [0.35, 0.42], [0.7, 0.18], [0.85, 0.0]], 12), 40), areia, 3, c, [-2.5, 0, 1.9]);
    am.scale.set(1, 1, 0.8);
    // pilha de tijolos
    const tij = k.mat({ color: d === "B" ? "#DE7648" : "#C4623A", rough: 0.8 });
    for (let y = 0; y < 4; y++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++)
      k.m(caixa(0.2, 0.09, 0.1, 0.012), tij, 1.5, c, [2.35 + (y % 2 ? j : i) * 0.0 + i * 0.205, 0.045 + y * 0.095, 1.7 + j * 0.105 + (y % 2) * 0.03]);
    // saco de cimento (sem marca)
    const saco = k.mat({ color: d === "B" ? "#ECE6D6" : "#D8D0BC", rough: 0.9 });
    k.m(caixa(0.36, 0.12, 0.24, 0.05), saco, 2, c, [-1.35, 0.06, 1.75], [0, 0.4, 0]);
    k.m(caixa(0.36, 0.12, 0.24, 0.05), saco, 2, c, [-1.3, 0.18, 1.78], [0, 0.1, 0]);
    // carrinho de mão
    const carr = new THREE.Group();
    const verde = k.mat({ color: d === "B" ? "#2E9E6B" : "#2D7D58", rough: 0.45, clear: 0.5 });
    k.m(torno(perfil([[0.0, 0.0], [0.22, 0.02], [0.3, 0.16], [0.32, 0.2]], 8), 24), verde, 2.5, carr, [0, 0.22, 0], undefined, [1, 1, 0.75]);
    k.m(cil(0.09, 0.09, 0.05, 20), k.mat({ color: "#26262a", rough: 0.6 }), 2, carr, [0, 0.09, 0.32], [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) k.m(cil(0.012, 0.012, 0.7, 8), k.mat({ color: "#555", rough: 0.4, metal: 0.7 }), 1.5, carr, [s * 0.14, 0.2, -0.15], [Math.PI / 2 - 0.25, 0, 0]);
    carr.position.set(2.3, 0, -0.4);
    carr.rotation.y = 0.6;
    c.add(carr);
    // árvores e cerca ao fundo
    const folha = k.mat({ color: d === "B" ? "#57B04A" : d === "C" ? "#73B85A" : "#4E8A3A", rough: 0.8 });
    const tronco = k.mat({ color: "#7A5232", rough: 0.8 });
    for (const [x, z, s] of [[-3.2, -2.6, 1.2], [3.4, -2.2, 1.0], [-4.6, 0.8, 0.9], [4.4, 1.6, 1.1]] as V3[]) {
      k.m(cil(0.07 * s, 0.09 * s, 0.9 * s, 12), tronco, 2.5, c, [x, 0.45 * s, z]);
      k.m(esfera(0.55 * s, 24, 18), folha, 3, c, [x, 1.2 * s, z]);
      k.m(esfera(0.4 * s, 20, 14), folha, 3, c, [x + 0.35 * s, 1.0 * s, z + 0.2 * s]);
      k.m(esfera(0.38 * s, 20, 14), folha, 3, c, [x - 0.3 * s, 1.05 * s, z - 0.15 * s]);
    }
    const cerca = k.mat({ color: d === "B" ? "#E8D3A8" : "#C9A877", rough: 0.75 });
    for (let i = -10; i <= 10; i++) k.m(caixa(0.07, 0.6, 0.04, 0.015), cerca, 2, c, [i * 0.42, 0.3, -3.6]);
    for (const y of [0.18, 0.45]) k.m(caixa(8.6, 0.06, 0.03, 0.01), cerca, 2, c, [0, y, -3.62]);
    // nuvens (B: bolas toon; C: recortes de papel; A: algodão)
    const nuvem = k.mat({ color: "#FFFFFF", rough: 1 });
    for (const [x, y, z, s] of [[-5, 5.4, -10, 1.4], [4, 6.2, -11, 1.1], [9, 4.6, -6, 1.2], [-9, 4.8, -4, 1.0], [0, 6.8, 9, 1.3], [-7, 5.5, 7, 1.0]]) {
      const n = new THREE.Group();
      for (const [dx, dy, r] of [[0, 0, 0.7], [0.75, -0.15, 0.5], [-0.7, -0.18, 0.55], [0.3, 0.35, 0.5]]) {
        const geo = d === "C" ? new THREE.CircleGeometry(r, 28) : esfera(r, 20, 14);
        const me = k.m(geo, nuvem, 3, n, [dx, dy, 0]);
        me.castShadow = me.receiveShadow = false;
      }
      n.position.set(x, y, z);
      n.scale.setScalar(s);
      n.lookAt(0, y, 0);
      n.userData.semArame = true;
      c.add(n);
    }
  }

  /** racha: 0..1 (rachaduras descendo do topo); frente: false = parede da frente some (fora do corte também) */
  aplica(o: { racha?: number; frente?: boolean; escada?: boolean }) {
    const r = o.racha ?? 0;
    for (const m of this.rachas) m.visible = r > 0.001;
    this.planoRacha.constant = -(HP + 0.05 - r * 1.15); // mantém y >= HP - r*1.1
    this.frente.visible = o.frente !== false;
    this.escada.visible = o.escada !== false;
  }
}
