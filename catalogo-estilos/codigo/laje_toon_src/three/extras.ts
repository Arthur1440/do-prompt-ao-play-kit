// Elementos de apoio: calendário (sem números), escada de alvenaria do fechamento, sol forte da cura, chuva,
// ferramentas extras na mão (escora, vigota no ombro, mangueira), setas da cinta (peso espalhando), migalhas.
import * as THREE from "three";
import { Kit, V3, caixa, cil, esfera } from "./kit";
import { IX, IZ, E, HP } from "./casa";
import { quique } from "./laje";

export type EstadoExtras = {
  calendario?: number; // 0..1 visível
  folhas?: number; // quantas folhas já viraram (fracionário: a de cima virando)
  escadaFinal?: number; // 0..1 degraus subindo com quique
  sol?: number; // 0..1 sol grande no céu
  chuva?: number; // 0..1
  setasCinta?: number; // 0..1
  migalhas?: number; // 0..1 caindo do topo da parede
};

export const DEGRAUS = 9;
/** degrau i (0..DEGRAUS-1): posição do topo do degrau (pés de quem sobe) */
export const degrau = (i: number): V3 => {
  const u = (i + 1) / DEGRAUS;
  return [IX + E + 0.33, u * (HP + 0.18), IZ - 0.1 - u * 1.9];
};

export class Extras {
  g = new THREE.Group();
  cal = new THREE.Group();
  folhas: THREE.Group[] = [];
  escada = new THREE.Group();
  degraus: THREE.Mesh[] = [];
  sol: THREE.Sprite;
  chuva: THREE.Points;
  setasCinta = new THREE.Group();
  migalhas: THREE.InstancedMesh;
  // itens de mão
  escora = new THREE.Group();
  vigota = new THREE.Group();
  mangueira = new THREE.Group();
  constructor(public k: Kit) {
    const d = k.dir, B = d === "B";
    // ---------------- calendário na parede do fundo (por dentro): folhas em branco com grade, cabeçalho vermelho
    const tex = (() => {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 300;
      const g = c.getContext("2d")!;
      g.fillStyle = "#FFFDF7"; g.fillRect(0, 0, 256, 300);
      g.fillStyle = "#E5352B"; g.fillRect(0, 0, 256, 70);
      g.fillStyle = "#FFFFFF"; g.fillRect(70, 26, 116, 18); // faixa no lugar do mês, sem texto
      g.strokeStyle = "#C9C2B6"; g.lineWidth = 3;
      for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(14 + i * 32.6, 88); g.lineTo(14 + i * 32.6, 286); g.stroke(); }
      for (let j = 0; j <= 5; j++) { g.beginPath(); g.moveTo(14, 88 + j * 39.6); g.lineTo(242, 88 + j * 39.6); g.stroke(); }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const papel = k.mat({ map: tex, rough: 0.9, lado: THREE.DoubleSide });
    k.m(caixa(0.36, 0.44, 0.02, 0.008), k.mat({ color: "#6B4A2E", rough: 0.7 }), 2, this.cal, [0, 0, -0.012]);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Group();
      f.position.set(0, 0.2, 0.004 + i * 0.002);
      const me = k.m(new THREE.PlaneGeometry(0.32, 0.38), papel, 1.5, f, [0, -0.19, 0], undefined, undefined, false);
      me.castShadow = false;
      this.folhas.push(f);
      this.cal.add(f);
    }
    k.m(cil(0.012, 0.012, 0.3, 8), k.mat({ color: "#8f959c", metal: 0.8, rough: 0.3, liso: true }), 1, this.cal, [0, 0.205, 0.01], [0, 0, Math.PI / 2]);
    this.cal.position.set(-0.2, 0.95, -IZ + 0.02);
    this.cal.scale.setScalar(1.25);
    this.g.add(this.cal);

    // ---------------- escada de alvenaria encostada na parede direita (fechamento)
    const reb = k.mat({ color: B ? "#E9E1D2" : "#D5CBB8", rough: 0.85 });
    for (let i = 0; i < DEGRAUS; i++) {
      const [x, y, z] = degrau(i);
      const me = k.m(caixa(0.42, y, 0.23, 0.01), reb, 2.5, this.escada, [x, y / 2, z]);
      this.degraus.push(me);
    }
    this.g.add(this.escada);

    // ---------------- sol grande (sprite com raios)
    const ts = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const g = c.getContext("2d")!;
      const gr = g.createRadialGradient(256, 256, 60, 256, 256, 256);
      gr.addColorStop(0, "rgba(255,240,170,1)"); gr.addColorStop(0.35, "rgba(255,214,90,0.9)"); gr.addColorStop(1, "rgba(255,200,80,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.fillStyle = "#FFD23F";
      for (let i = 0; i < 12; i++) { g.save(); g.translate(256, 256); g.rotate((i / 12) * Math.PI * 2); g.beginPath(); g.moveTo(-14, -130); g.lineTo(0, -230); g.lineTo(14, -130); g.fill(); g.restore(); }
      g.fillStyle = "#FFC21A"; g.beginPath(); g.arc(256, 256, 110, 0, Math.PI * 2); g.fill();
      if (B) { g.strokeStyle = "#1a0f0c"; g.lineWidth = 8; g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: ts, transparent: true, depthWrite: false, toneMapped: false }));
    this.sol.userData.semArame = true;
    this.g.add(this.sol);

    // ---------------- chuva
    const n = 500;
    const gp = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.sin(i * 12.9) * 0.5 + 0.5) * 4.4 - 2.2, (i * 0.618) % 1, (Math.cos(i * 7.7) * 0.5 + 0.5) * 3.6 - 1.8], i * 3);
    gp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    gp.setAttribute("base", new THREE.BufferAttribute(pos.slice(), 3));
    this.chuva = new THREE.Points(gp, new THREE.PointsMaterial({ color: 0x9fd8ff, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false }));
    this.chuva.frustumCulled = false;
    this.chuva.userData.semArame = true;
    this.g.add(this.chuva);

    // ---------------- setas da cinta: o peso descendo espalhado por igual
    const verm = k.mat({ color: "#E5352B", rough: 0.4, emis: "#E5352B", emisI: 0.2 });
    const sh = new THREE.Shape();
    sh.moveTo(-0.035, 0); sh.lineTo(0.035, 0); sh.lineTo(0.035, -0.1); sh.lineTo(0.07, -0.1); sh.lineTo(0, -0.18); sh.lineTo(-0.07, -0.1); sh.lineTo(-0.035, -0.1); sh.lineTo(-0.035, 0);
    const geoS = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false });
    const pts: [number, number, number][] = [];
    for (const x of [-1.1, -0.55, 0, 0.55, 1.1]) pts.push([x, 0, IZ + E + 0.03]);
    for (const z of [-0.8, -0.27, 0.27, 0.8]) pts.push([-IX - E - 0.03, 0, z]);
    for (const [x, , z] of pts) {
      const me = k.m(geoS, verm, 2, this.setasCinta, [x, HP + 0.3, z], [0, Math.abs(x) > IX ? -Math.PI / 2 : 0, 0]);
      me.castShadow = false;
      me.userData.y0 = HP + 0.3;
    }
    this.setasCinta.userData.semArame = true;
    this.g.add(this.setasCinta);

    // ---------------- migalhas de tijolo caindo do topo da parede amassada
    const nm = 30;
    this.migalhas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), k.mat({ color: B ? "#D9774A" : "#B85A34", rough: 0.8 }), nm);
    k.contorno(this.migalhas, 1.5);
    this.migalhas.frustumCulled = false;
    this.migalhas.userData.semArame = true;
    this.g.add(this.migalhas);

    // ---------------- itens de mão
    k.m(cil(0.034, 0.04, 1.2, 12), k.mat({ color: B ? "#C99A62" : "#A87B4C", rough: 0.85 }), 2.5, this.escora, [0, 0, 0]);
    const vig = k.mat({ color: B ? "#C2BFB8" : "#A9A69F", rough: 0.85 });
    k.m(caixa(1.6, 0.04, 0.12, 0.01), vig, 2.5, this.vigota, [0, 0, 0]);
    const aco = k.mat({ color: "#9A9EA4", rough: 0.4, metal: 0.8, liso: true });
    k.m(cil(0.008, 0.008, 1.6, 6), aco, 1, this.vigota, [0, 0.1, 0], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 10; i++) k.m(cil(0.006, 0.006, 0.12, 5), aco, 0.8, this.vigota, [-0.75 + i * 0.165, 0.05, 0], [0, 0, i % 2 ? 0.6 : -0.6]);
    const verde = k.mat({ color: B ? "#2FA36B" : "#2D8A5C", rough: 0.5, clear: 0.4 });
    k.m(cil(0.022, 0.022, 0.16, 12), verde, 2, this.mangueira, [0, 0.0, 0], [Math.PI / 2, 0, 0]);
    k.m(cil(0.014, 0.02, 0.06, 12), k.mat({ color: "#F2B32F", rough: 0.4 }), 1.5, this.mangueira, [0, 0, 0.1], [Math.PI / 2, 0, 0]);
    k.m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.07), new THREE.Vector3(0, -0.2, -0.15), new THREE.Vector3(0.1, -0.6, -0.1), new THREE.Vector3(0.2, -1.0, 0.1)]), 20, 0.018, 8), verde, 2, this.mangueira);
    this.g.add(this.escora, this.vigota, this.mangueira);
  }

  aplica(e: EstadoExtras, t: number, cam: THREE.Camera) {
    const c = e.calendario ?? 0;
    this.cal.visible = c > 0.001;
    const nf = e.folhas ?? 0;
    this.folhas.forEach((f, i) => {
      // folhas de cima (índice alto) viram primeiro
      const j = this.folhas.length - 1 - i;
      const k = Math.max(0, Math.min(1, nf - j));
      f.rotation.x = -k * Math.PI * 0.95;
      f.visible = k < 0.999;
    });
    const ef = e.escadaFinal ?? 0;
    this.escada.visible = ef > 0.001;
    this.degraus.forEach((dg, i) => { const k = Math.max(0, Math.min(1, ef * (DEGRAUS + 3) / 1 - i) / 1); dg.visible = k > 0.001; dg.scale.set(1, Math.max(0.001, quique(Math.min(1, k))), 1); dg.position.y = degrau(i)[1] / 2 * dg.scale.y; });
    const s = e.sol ?? 0;
    this.sol.visible = s > 0.001;
    if (this.sol.visible) {
      // sempre no alto da tela, atrás da cena
      const dir = new THREE.Vector3(-0.1, 0.2, -1).applyQuaternion(cam.quaternion).normalize();
      this.sol.position.copy(cam.position).addScaledVector(dir, 12);
      this.sol.scale.setScalar(2.4 * s * (1 + 0.04 * Math.sin(t * 6)));
      this.sol.material.rotation = t * 0.3;
    }
    const ch = e.chuva ?? 0;
    this.chuva.visible = ch > 0.001;
    if (this.chuva.visible) {
      const p = this.chuva.geometry.getAttribute("position") as THREE.BufferAttribute;
      const b = this.chuva.geometry.getAttribute("base") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, b.getX(i), ((b.getY(i) - t * 1.6) % 1 + 1) % 1 * 4.2 + HP - 0.1, b.getZ(i));
      p.needsUpdate = true;
      (this.chuva.material as THREE.PointsMaterial).opacity = 0.85 * ch;
    }
    const sc = e.setasCinta ?? 0;
    this.setasCinta.visible = sc > 0.001;
    this.setasCinta.children.forEach((m, i) => {
      const k = Math.max(0, Math.min(1, sc * 1.8 - i * 0.06));
      m.scale.setScalar(quique(k) * 1.3);
      m.position.y = (m.userData.y0 as number) + 0.04 * Math.sin(t * 8 + i);
    });
    const mg = e.migalhas ?? 0;
    this.migalhas.visible = mg > 0.001 && mg < 0.999;
    if (this.migalhas.visible) {
      const o = new THREE.Object3D();
      for (let i = 0; i < this.migalhas.count; i++) {
        const u = ((i * 0.618) % 1);
        const lado = i % 3;
        const x = lado === 2 ? -IX - E - 0.02 : -1.3 + u * 2.6;
        const z = lado === 2 ? -0.9 + u * 1.8 : IZ + E + 0.02;
        const tt = Math.max(0, mg * 1.6 - u * 0.6);
        o.position.set(x + (lado === 2 ? -tt * 0.2 : 0), HP - 0.02 - tt * tt * 1.5, z + (lado === 2 ? 0 : tt * 0.2));
        o.scale.setScalar(tt > 0 && tt < 1 ? 0.018 + (i % 4) * 0.006 : 0.0001);
        o.rotation.set(i, tt * 6, i * 2);
        o.updateMatrix();
        this.migalhas.setMatrixAt(i, o.matrix);
      }
      this.migalhas.instanceMatrix.needsUpdate = true;
    }
  }
}

export const _e = esfera;
