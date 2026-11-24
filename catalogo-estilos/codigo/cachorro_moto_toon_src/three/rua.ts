// Rua de bairro brasileiro: asfalto, meio-fio caiado, calçada, muros chapiscados coloridos, portões de grade,
// casas de telha, poste de concreto com fios, árvore na calçada e uma esquina. A casa do cachorro fica em x = 0, lado +Z.
// Maquete (A): tudo sobre uma tábua com corte lateral, numa mesa de madeira.
import * as THREE from "three";
import { Kit, caixa, cil, esfera, tubo, lcg } from "./kit";
import { texAsfalto, texBumpAsfalto, texChapisco, texCalcada, texTelha, texMadeira } from "./tex";

export const RUA_W = 7; // largura do asfalto
export const CALC = 2.2; // largura da calçada
export const ZM = RUA_W / 2 + CALC; // linha dos muros
export const X_ESQ = 21; // eixo da rua transversal (esquina)
export const PORTAO_X = 0; // portão da casa do cachorro
const XMIN = -46, XMAX = 46;

const CORES_MURO = [0xe7c27a, 0x9cc7c4, 0xe59b7e, 0xd8d3c4, 0xb9cf8f, 0xf0dca8, 0xc7a7c9];
const CORES_CASA = [0xf4ead7, 0xe9d6b8, 0xd7e3e8, 0xf2d2c0];

export class Rua {
  g = new THREE.Group();
  portaoFolha!: THREE.Group; // folha que abre (dobradiça em x = PORTAO_X - 1.5)
  postes: THREE.Vector3[] = [];
  constructor(kit: Kit) {
    const k = kit, g = this.g, r = lcg(7);
    const dir = k.dir;
    const asf = texAsfalto(); asf.repeat.set((XMAX - XMIN) / 6, RUA_W / 6);
    const mAsf = k.mat({ color: dir === "A" ? 0x8a8a8e : 0xffffff, map: asf, chapada: dir === "C" ? 0x6c6f7a : 0x5e616b, rough: 0.9, clear: 0.05, bump: texBumpAsfalto(), bumpS: 0.4, brilho: 0.2 });
    k.m(new THREE.PlaneGeometry(XMAX - XMIN, RUA_W, 1, 1), mAsf, 0, g, [(XMIN + XMAX) / 2, 0, 0], [-Math.PI / 2, 0, 0]);
    // rua transversal (a esquina)
    const asf2 = texAsfalto(); asf2.repeat.set(RUA_W / 6, 40 / 6);
    k.m(new THREE.PlaneGeometry(RUA_W, 60), k.mat({ color: dir === "A" ? 0x8a8a8e : 0xffffff, map: asf2, chapada: dir === "C" ? 0x6c6f7a : 0x5e616b, rough: 0.9, clear: 0.05, brilho: 0.2 }), 0, g, [X_ESQ, 0.002, 0], [-Math.PI / 2, 0, 0]);
    // faixa amarela apagada no meio
    const mFaixa = k.mat({ color: 0xd8b13a, rough: 0.8, clear: 0, brilho: 0.3 });
    for (let x = XMIN; x < XMAX; x += 4) if (Math.abs(x - X_ESQ) > RUA_W / 2 + 1) k.m(new THREE.PlaneGeometry(2, 0.12), mFaixa, 0, g, [x, 0.004, 0], [-Math.PI / 2, 0, 0]);
    const calc = texCalcada();
    const mCalc = k.mat({ map: calc, chapada: dir === "C" ? 0xd8cfbd : 0xc9c1b2, color: 0xd9d2c6, rough: 0.8, clear: 0.05, brilho: 0.4 });
    const mFio = k.mat({ color: 0xf2efe6, rough: 0.7, clear: 0.1, brilho: 0.6 }); // meio-fio caiado
    const mMuroTopo = k.mat({ color: 0xece6da, rough: 0.6 });
    const bumpCh = texChapisco();
    const mGrade = k.mat({ color: 0x2f5a46, rough: 0.45, clear: 0.6, brilho: 1 });
    const mTelha = k.mat({ map: texTelha(), chapada: 0xc9643a, color: 0xffffff, rough: 0.55, clear: 0.2 });
    const mJanela = k.mat({ color: 0x2b3440, rough: 0.2, clear: 0.9, metal: 0.2 });
    const mPreto = k.mat({ color: 0x24262b, rough: 0.5 });
    for (const lado of [1, -1]) {
      // segmentos de quarteirão, interrompidos na esquina
      const trechos: [number, number][] = [[XMIN, X_ESQ - RUA_W / 2], [X_ESQ + RUA_W / 2, XMAX]];
      for (const [a, b] of trechos) {
        const L = b - a, cx = (a + b) / 2;
        const tc = calc.clone(); tc.repeat.set(L / 2, CALC / 2); tc.needsUpdate = true;
        k.m(caixa(L, 0.15, CALC, 0), k.mat({ map: tc, chapada: dir === "C" ? 0xd8cfbd : 0xc9c1b2, color: 0xd9d2c6, rough: 0.8, clear: 0.05, brilho: 0.4 }), 2, g, [cx, 0.075, lado * (RUA_W / 2 + CALC / 2)]);
        k.m(caixa(L, 0.17, 0.16, 0.025), mFio, 2.2, g, [cx, 0.085, lado * (RUA_W / 2 + 0.08)]);
        // terrenos: muro + portão + casa
        let x = a + 0.2;
        let i = 0;
        while (x < b - 3) {
          const w = Math.min(b - 0.2 - x, 7 + Math.floor(r() * 4));
          if (w < 3) break;
          const casaCachorro = lado === 1 && x <= PORTAO_X - 1.8 && x + w >= PORTAO_X + 1.8;
          const cor = casaCachorro ? 0xe8b866 : CORES_MURO[(i * 3 + (lado > 0 ? 0 : 2)) % CORES_MURO.length];
          const mMuro = k.mat({ color: cor, rough: 0.85, clear: 0.05, bump: bumpCh, bumpS: 1.2, brilho: 0.4 });
          const hM = 2.0 + (casaCachorro ? 0 : r() * 0.4);
          const zM = lado * (ZM + 0.1);
          // vão do portão
          const pX = casaCachorro ? PORTAO_X : x + 1.2 + r() * (w - 4.4) + 1.5;
          const pW = 3.0;
          const seg = (x0: number, x1: number) => {
            if (x1 - x0 < 0.05) return;
            k.m(caixa(x1 - x0, hM, 0.2, 0.02), mMuro, 2.6, g, [(x0 + x1) / 2, hM / 2 + 0.15, zM]);
            k.m(caixa(x1 - x0 + 0.04, 0.08, 0.28, 0.02), mMuroTopo, 2, g, [(x0 + x1) / 2, hM + 0.19, zM]);
          };
          seg(x, pX - pW / 2);
          seg(pX + pW / 2, x + w);
          // pilares do portão
          for (const px of [pX - pW / 2 - 0.12, pX + pW / 2 + 0.12]) k.m(caixa(0.26, hM + 0.25, 0.3, 0.02), mMuro, 2.6, g, [px, (hM + 0.25) / 2 + 0.15, zM]);
          // portão de grade em duas folhas
          const folha = (dobX: number, larg: number, sinal: number) => {
            const f = new THREE.Group();
            f.position.set(dobX, 0.18, zM);
            g.add(f);
            const h = hM - 0.1;
            k.m(caixa(larg, 0.05, 0.05, 0.01), mGrade, 2, f, [sinal * larg / 2, 0.03, 0]);
            k.m(caixa(larg, 0.05, 0.05, 0.01), mGrade, 2, f, [sinal * larg / 2, h, 0]);
            k.m(caixa(larg, 0.04, 0.04, 0.01), mGrade, 1.6, f, [sinal * larg / 2, h * 0.35, 0]);
            for (const ex of [0.03, larg - 0.03]) k.m(caixa(0.05, h, 0.05, 0.01), mGrade, 2, f, [sinal * ex, h / 2, 0]);
            for (let b2 = 0.15; b2 < larg - 0.08; b2 += 0.12) {
              k.m(cil(0.012, 0.012, h, 8), mGrade, 1.5, f, [sinal * b2, h / 2, 0]);
              k.m(new THREE.ConeGeometry(0.028, 0.08, 4), mGrade, 1.5, f, [sinal * b2, h + 0.06, 0]);
            }
            return f;
          };
          const fe = folha(pX - pW / 2, pW / 2, 1);
          folha(pX + pW / 2, pW / 2, -1);
          if (casaCachorro) this.portaoFolha = fe;
          // casa atrás do muro
          const prof = 6, hC = 3.0;
          const cc = CORES_CASA[(i + (lado > 0 ? 1 : 0)) % CORES_CASA.length];
          const zc = lado * (ZM + 2.0 + prof / 2);
          k.m(caixa(w - 0.6, hC, prof, 0.03), k.mat({ color: cc, rough: 0.8, clear: 0.05, bump: bumpCh, bumpS: 0.6, brilho: 0.4 }), 2.6, g, [x + w / 2, hC / 2, zc]);
          // telhado de duas águas (caimento para a rua)
          const tel = new THREE.CylinderGeometry(0.01, prof * 0.62, w - 0.2, 4, 1);
          const tm = k.m(tel, mTelha, 2.6, g, [x + w / 2, hC + 0.55, zc], [0, 0, Math.PI / 2], [1, 1, 0.6]);
          tm.rotation.x = Math.PI / 4;
          // janelas com grade na fachada
          for (const jx of [x + w * 0.3, x + w * 0.72]) {
            const zf = zc - lado * (prof / 2 + 0.02);
            k.m(caixa(1.2, 1.0, 0.06, 0.02), mJanela, 2, g, [jx, 1.75, zf]);
            k.m(caixa(1.36, 0.08, 0.14, 0.02), mMuroTopo, 1.6, g, [jx, 1.21, zf - lado * 0.04]);
            for (let gx = -0.45; gx <= 0.46; gx += 0.3) k.m(caixa(0.025, 1.0, 0.025, 0), mPreto, 1.2, g, [jx + gx, 1.75, zf - lado * 0.06]);
          }
          // árvore na calçada às vezes
          if (r() > 0.45 && !casaCachorro) {
            const ax = x + 1 + r() * (w - 2), az = lado * (RUA_W / 2 + CALC - 0.6);
            k.m(cil(0.09, 0.13, 2.4, 12), k.mat({ color: 0x6b4a32, rough: 0.9 }), 2.4, g, [ax, 1.35, az]);
            const mFol = k.mat({ color: [0x4f8a3a, 0x5d9640, 0x3f7a35][i % 3], rough: 0.9, clear: 0, brilho: 0.4 });
            for (let q = 0; q < 4; q++) k.m(esfera(0.75 + r() * 0.35, 20, 14), mFol, 3, g, [ax + (r() - 0.5) * 1.0, 2.9 + r() * 0.7, az + (r() - 0.5) * 0.8]);
          }
          x += w;
          i++;
        }
        // postes de concreto a cada ~16 m
        for (let px = a + 4; px < b - 2; px += 16) {
          const pz = lado * (RUA_W / 2 + 0.45);
          this.postes.push(new THREE.Vector3(px, 0, pz));
          const mCon = k.mat({ color: 0xbdb8ae, rough: 0.8, bump: bumpCh, bumpS: 0.3, brilho: 0.4 });
          k.m(cil(0.09, 0.16, 9, 10), mCon, 2.4, g, [px, 4.5, pz]);
          k.m(caixa(0.12, 0.12, 1.6, 0.01), mCon, 2, g, [px, 8.2, pz]);
          // braço da luminária para a rua
          k.m(tubo([[px, 7.4, pz], [px, 7.7, pz - lado * 0.8], [px, 7.6, pz - lado * 1.5]], 0.035, 12, 8), mPreto, 1.6, g);
          k.m(caixa(0.25, 0.1, 0.5, 0.04), k.mat({ color: 0x9aa0a6, rough: 0.4, metal: 0.5 }), 1.6, g, [px, 7.55, pz - lado * 1.6]);
        }
      }
    }
    // fios entre os postes (catenária)
    const mCabo = k.mat({ color: 0x1b1b1d, rough: 0.6, brilho: 0.2 });
    const ps = [...this.postes].sort((p, q) => p.z - q.z || p.x - q.x);
    for (let i = 1; i < ps.length; i++) {
      const p0 = ps[i - 1], p1 = ps[i];
      if (Math.sign(p0.z) !== Math.sign(p1.z) || Math.abs(p1.x - p0.x) > 20) continue;
      for (const [dy, dz] of [[8.2, 0.6], [8.2, -0.6], [7.0, 0]] as [number, number][]) {
        const pts: [number, number, number][] = [];
        for (let s = 0; s <= 10; s++) {
          const u = s / 10;
          pts.push([p0.x + (p1.x - p0.x) * u, dy - 0.45 * Math.sin(Math.PI * u), p0.z + dz]);
        }
        k.m(tubo(pts, 0.012, 20, 5), mCabo, 1.2, g);
      }
    }
    if (!this.portaoFolha) this.portaoFolha = new THREE.Group();
    // maquete: tábua com corte lateral (terra/resina) sobre a mesa de madeira
    if (dir === "A") {
      const W0 = XMAX - XMIN, D0 = 2 * (ZM + 9);
      k.m(caixa(W0, 0.6, D0, 0.05), k.mat({ color: 0x6b4b33, rough: 0.7, clear: 0.2 }), 0, g, [0, -0.3, 0]);
      const mesa = texMadeira(); mesa.repeat.set(4, 4);
      k.m(new THREE.PlaneGeometry(400, 400), k.mat({ map: mesa, rough: 0.55, clear: 0.3 }), 0, g, [0, -0.6, 0], [-Math.PI / 2, 0, 0]);
    }
  }
  /** abertura do portão (0 fechado .. 1 aberto ~70°) */
  portao(a: number) {
    this.portaoFolha.rotation.y = -a * 1.2;
  }
}
