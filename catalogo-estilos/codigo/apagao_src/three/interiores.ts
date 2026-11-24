// Interiores em maquete (casinha de bonecas em corte, sobre a mesa de madeira):
//   Cozinha (12 h: a torneira cospe ar e para), Açougue (36 h: o gelo acaba; vacinas na geladeira, Amapá 2020),
//   Freezer em corte (48 h: "abriu, perdeu") e a garrafa de água mineral do mapa (R$ 35 o litro).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Kit } from "./kit";
import { cv, tx, texMadeira } from "./tex";
import { rng } from "./rng";

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const c01 = (x: number) => Math.max(0, Math.min(1, x));

// ------------------------------------------------------------------ texturas
function texAzulejo(cor: string, rej: string, n: number, w = 512, h = 512) {
  const [c, g] = cv(w, h);
  g.fillStyle = rej;
  g.fillRect(0, 0, w, h);
  const s = w / n;
  const R = rng(n * 7);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < Math.ceil(h / s); j++) {
      const k = 0.94 + R.r() * 0.08;
      const col = new THREE.Color(cor).multiplyScalar(k);
      g.fillStyle = `#${col.getHexString()}`;
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  const t = tx(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function texXadrez(c1: string, c2: string, n = 8) {
  const [c, g] = cv(512, 512);
  const s = 512 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? c1 : c2;
      g.fillRect(i * s, j * s, s, s);
    }
  g.strokeStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke();
  }
  const t = tx(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** parede: tinta em cima, azulejo embaixo até "ate" (fração da altura), faixa de cor opcional */
function texParede(tinta: string, azulejo: string, ate: number, faixa?: string, n = 18) {
  const W = 1024, H = 1024;
  const [c, g] = cv(W, H);
  g.fillStyle = tinta;
  g.fillRect(0, 0, W, H);
  const y0 = H * (1 - ate);
  g.fillStyle = "#cfcac0";
  g.fillRect(0, y0, W, H - y0);
  const s = W / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; y0 + j * s < H; j++) {
      const col = new THREE.Color(azulejo).multiplyScalar(0.95 + ((i * 7 + j * 13) % 5) * 0.015);
      g.fillStyle = `#${col.getHexString()}`;
      g.fillRect(i * s + 2, y0 + j * s + 2, s - 4, s - 4);
    }
  if (faixa) {
    g.fillStyle = faixa;
    g.fillRect(0, y0 - 14, W, 22);
  }
  return tx(c);
}

function texRotulo(linhas: [string, string, string][], fundo: string, w = 512, h = 256) {
  const [c, g] = cv(w, h);
  g.fillStyle = fundo;
  g.fillRect(0, 0, w, h);
  g.textAlign = "center";
  g.textBaseline = "middle";
  linhas.forEach(([txt, fonte, cor], i) => {
    g.font = fonte;
    g.fillStyle = cor;
    g.fillText(txt, w / 2, (h / (linhas.length + 1)) * (i + 1));
  });
  return tx(c);
}

function texSprite() {
  const [c, g] = cv(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.45)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return tx(c);
}

function texCeuJanela(noite: boolean) {
  const [c, g] = cv(64, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (noite) {
    gr.addColorStop(0, "#0a1230");
    gr.addColorStop(1, "#1c2a55");
  } else {
    gr.addColorStop(0, "#6fa8e8");
    gr.addColorStop(1, "#e8f2ff");
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 256);
  return tx(c);
}

// ------------------------------------------------------------------ sala em corte (piso + parede do fundo com janela + parede da esquerda)
type OpSala = { w: number; d: number; h: number; piso: THREE.Texture; pisoRep: number; fundo: THREE.Texture; lado: THREE.Texture; jan: [number, number, number, number]; noite?: boolean };

function sala(k: Kit, o: OpSala) {
  const g = new THREE.Group();
  const { w, d, h } = o;
  const e = 0.12;
  // mesa de madeira e base da maquete
  const mad = texMadeira();
  mad.repeat.set(4, 4);
  const mesa = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), k.mat({ map: mad, rough: 0.55, clear: 0.3, semContorno: true }));
  mesa.rotation.x = -Math.PI / 2;
  mesa.position.y = -0.22;
  mesa.receiveShadow = true;
  g.add(mesa);
  const base = k.m(new RoundedBoxGeometry(w + 0.5, 0.2, d + 0.5, 2, 0.04), k.mat({ color: 0x2a2420, rough: 0.6 }), 2);
  base.position.set(0, -0.12, 0);
  g.add(base);
  // piso
  o.piso.repeat.set(o.pisoRep * (w / d), o.pisoRep);
  const piso = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), k.mat({ map: o.piso, rough: 0.45, clear: 0.5, semContorno: true }));
  piso.position.y = -0.02;
  piso.receiveShadow = true;
  g.add(piso);
  // parede do fundo com a janela (forma com furo)
  const [jx, jy, jw, jh] = o.jan;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - e, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2 - e, h); s.lineTo(-w / 2 - e, 0);
  const furo = new THREE.Path();
  furo.moveTo(jx - jw / 2, jy); furo.lineTo(jx + jw / 2, jy); furo.lineTo(jx + jw / 2, jy + jh); furo.lineTo(jx - jw / 2, jy + jh); furo.lineTo(jx - jw / 2, jy);
  s.holes.push(furo);
  const geoF = new THREE.ExtrudeGeometry(s, { depth: e, bevelEnabled: false });
  o.fundo.repeat.set(1 / (w + e), 1 / h);
  o.fundo.offset.set((w / 2 + e) / (w + e), 0);
  const mF = k.mat({ map: o.fundo, rough: 0.7, semContorno: true });
  const fundo = new THREE.Mesh(geoF, mF);
  fundo.position.set(0, 0, -d / 2 - e);
  fundo.castShadow = fundo.receiveShadow = true;
  g.add(fundo);
  // parede da esquerda
  o.lado.repeat.set(1, 1);
  const lado = new THREE.Mesh(new THREE.BoxGeometry(e, h, d), [k.mat({ color: 0xd8d0c4, rough: 0.8, semContorno: true }), k.mat({ map: o.lado, rough: 0.7, semContorno: true }), k.mat({ color: 0xe8e2d8, rough: 0.8 }), k.mat({ color: 0xe8e2d8 }), k.mat({ color: 0xd8d0c4 }), k.mat({ color: 0xd8d0c4 })]);
  lado.position.set(-w / 2 - e / 2, h / 2, 0);
  lado.castShadow = lado.receiveShadow = true;
  g.add(lado);
  // topo das paredes (corte: faixa clara de maquete)
  const corte = k.mat({ color: 0xf4efe6, rough: 0.9 });
  const tF = new THREE.Mesh(new THREE.BoxGeometry(w + e, 0.012, e), corte);
  tF.position.set(-e / 2, h + 0.006, -d / 2 - e / 2);
  const tL = new THREE.Mesh(new THREE.BoxGeometry(e, 0.012, d), corte);
  tL.position.set(-w / 2 - e / 2, h + 0.006, 0);
  g.add(tF, tL);
  // janela: caixilho, vidro e o céu do lado de fora
  const mCx = k.mat({ color: 0xf6f3ee, rough: 0.4 });
  const cx = (x: number, y: number, ww: number, hh: number) => {
    const b = k.m(new THREE.BoxGeometry(ww, hh, e + 0.03), mCx, 1.5);
    b.position.set(x, y, -d / 2 - e / 2);
    g.add(b);
  };
  cx(jx, jy - 0.02, jw + 0.08, 0.05);
  cx(jx, jy + jh + 0.02, jw + 0.08, 0.05);
  cx(jx - jw / 2 - 0.02, jy + jh / 2, 0.05, jh + 0.08);
  cx(jx + jw / 2 + 0.02, jy + jh / 2, 0.05, jh + 0.08);
  cx(jx, jy + jh / 2, 0.025, jh);
  const ceu = new THREE.Mesh(new THREE.PlaneGeometry(jw * 3, jh * 3), new THREE.MeshBasicMaterial({ map: texCeuJanela(!!o.noite), toneMapped: false }));
  ceu.position.set(jx, jy + jh / 2, -d / 2 - e - 0.6);
  ceu.userData.ceuJanela = true;
  g.add(ceu);
  return g;
}

// ------------------------------------------------------------------ COZINHA (12 h)
export class Cozinha {
  g = new THREE.Group();
  agua: THREE.Mesh[] = [];
  gota: THREE.Mesh;
  espuma: THREE.Mesh;
  alavanca: THREE.Mesh;
  ponteiroH: THREE.Mesh;
  ponteiroM: THREE.Mesh;
  ponteiroS: THREE.Mesh;
  boca = new THREE.Vector3();
  fundoPia = 0.87;
  constructor(public kit: Kit) {
    const k = kit;
    const W = 3.2, D = 2.4, H = 2.2;
    this.g.add(sala(k, { w: W, d: D, h: H, piso: texXadrez("#c8643c", "#e9d9bf", 10), pisoRep: 1, fundo: texParede("#f1e3c6", "#ffffff", 0.66, "#2f9e6e", 22), lado: texParede("#f1e3c6", "#ffffff", 0.66, "#2f9e6e", 16), jan: [0.45, 1.12, 0.92, 0.7] }));
    // bancada
    const bx = 0.55, bz = -D / 2 + 0.31;
    const armario = k.m(new RoundedBoxGeometry(2.1, 0.8, 0.6, 2, 0.02), k.mat({ color: 0x9fd3c7, rough: 0.5 }), 2);
    armario.position.set(bx, 0.4, bz);
    this.g.add(armario);
    for (let i = 0; i < 4; i++) {
      const porta = k.m(new THREE.BoxGeometry(0.48, 0.62, 0.02), k.mat({ color: 0xb3e0d6, rough: 0.45 }), 1);
      porta.position.set(bx - 0.78 + i * 0.52, 0.38, bz + 0.305);
      const pux = k.m(new THREE.BoxGeometry(0.12, 0.02, 0.02), k.mat({ color: 0xd0d0d0, metal: 0.9, rough: 0.2 }), 1);
      pux.position.set(bx - 0.78 + i * 0.52, 0.62, bz + 0.32);
      this.g.add(porta, pux);
    }
    const tampo = k.m(new THREE.BoxGeometry(2.16, 0.05, 0.64), k.mat({ color: 0x3a3a40, rough: 0.25, clear: 0.8 }), 2);
    tampo.position.set(bx, 0.825, bz);
    this.g.add(tampo);
    // pia
    const px = 0.45;
    const inox = k.mat({ color: 0xc9ced4, metal: 0.95, rough: 0.22 });
    const borda = k.m(new RoundedBoxGeometry(0.66, 0.05, 0.44, 2, 0.015), inox, 1.5);
    borda.position.set(px, 0.865, bz + 0.02);
    this.g.add(borda);
    const cuba = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), k.mat({ color: 0x5c6168, metal: 0.9, rough: 0.35, semContorno: true }));
    cuba.rotation.x = -Math.PI / 2;
    cuba.position.set(px, 0.892, bz + 0.02);
    this.g.add(cuba);
    this.fundoPia = 0.893;
    // torneira (tubo cromado) e alavanca
    const cromo = k.mat({ color: 0xe8ecf0, metal: 1, rough: 0.12 });
    (cromo as THREE.MeshPhysicalMaterial).envMapIntensity = 6;
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.24, 0), new THREE.Vector3(0, 0.36, 0.07), new THREE.Vector3(0, 0.34, 0.17), new THREE.Vector3(0, 0.29, 0.2),
    ]);
    const tz = bz - 0.2;
    const tubo = k.m(new THREE.TubeGeometry(curva, 40, 0.017, 12), cromo, 2);
    tubo.position.set(px, 0.85, tz);
    const pe = k.m(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 16), cromo, 2);
    pe.position.set(px, 0.865, tz);
    this.alavanca = k.m(new RoundedBoxGeometry(0.11, 0.016, 0.022, 1, 0.006), cromo, 1.5);
    this.alavanca.geometry.translate(0.055, 0, 0);
    this.alavanca.position.set(px + 0.02, 1.05, tz);
    this.g.add(tubo, pe, this.alavanca);
    this.boca.set(px, 0.85 + 0.285, tz + 0.2);
    // água: gomos que caem da boca até a cuba (presença = vazão no instante em que saiu da boca)
    const mAgua = new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.04, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.62, emissive: 0x2a6080, emissiveIntensity: 0.35 });
    mAgua.userData.semContorno = true;
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.012, 4, 10), mAgua);
      this.agua.push(s);
      this.g.add(s);
    }
    this.gota = new THREE.Mesh(new THREE.SphereGeometry(0.011, 14, 10), mAgua);
    this.espuma = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8), new THREE.MeshPhysicalMaterial({ color: 0xf2fbff, roughness: 0.2, transparent: true, opacity: 0.55 }));
    this.espuma.scale.set(1, 0.18, 1);
    this.espuma.position.set(this.boca.x, this.fundoPia + 0.004, this.boca.z);
    this.g.add(this.gota, this.espuma);
    // geladeira desligada (canto esquerdo)
    const gel = k.m(new RoundedBoxGeometry(0.72, 1.78, 0.66, 3, 0.05), k.mat({ color: 0xf2f0ea, rough: 0.35, clear: 0.6 }), 2);
    gel.position.set(-W / 2 + 0.44, 0.89, -D / 2 + 0.38);
    const friso = k.m(new THREE.BoxGeometry(0.7, 0.012, 0.01), k.mat({ color: 0x9a9890 }), 1);
    friso.position.set(-W / 2 + 0.44, 1.22, -D / 2 + 0.715);
    const pux = k.m(new RoundedBoxGeometry(0.03, 0.42, 0.04, 1, 0.01), k.mat({ color: 0xc0c4c8, metal: 0.9, rough: 0.25 }), 1);
    pux.position.set(-W / 2 + 0.72, 0.95, -D / 2 + 0.735);
    const pux2 = pux.clone();
    pux2.position.y = 1.45;
    pux2.scale.y = 0.6;
    this.g.add(gel, friso, pux, pux2);
    // relógio de parede (os ponteiros seguem o relógio do HUD)
    const rel = new THREE.Group();
    const aro = k.m(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40), k.mat({ color: 0xff6b2c, rough: 0.4 }), 1.5);
    const mostr = new THREE.Mesh(new THREE.CircleGeometry(0.175, 40), k.mat({ map: texMostrador(), rough: 0.5, semContorno: true }));
    aro.rotation.x = Math.PI / 2;
    mostr.position.z = 0.021;
    rel.add(aro, mostr);
    const mP = k.mat({ color: 0x1a1a1a, rough: 0.5 });
    const ponteiro = (comp: number, larg: number, z: number, m = mP) => {
      const geo = new THREE.BoxGeometry(larg, comp, 0.006);
      geo.translate(0, comp / 2 - 0.02, 0);
      const p = new THREE.Mesh(geo, m);
      p.position.z = z;
      rel.add(p);
      return p;
    };
    this.ponteiroH = ponteiro(0.1, 0.018, 0.027);
    this.ponteiroM = ponteiro(0.145, 0.012, 0.031);
    this.ponteiroS = ponteiro(0.155, 0.005, 0.035, k.mat({ color: 0xd8322b }));
    rel.rotation.y = Math.PI / 2;
    rel.position.set(-W / 2 + 0.03, 1.62, 0.15);
    this.g.add(rel);
    // mesa com galão de água vazio e fruteira
    const mesaM = k.mat({ color: 0xe9c48f, rough: 0.5 });
    const tampoM = k.m(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 32), mesaM, 2);
    tampoM.position.set(-0.75, 0.72, 0.62);
    const peM = k.m(new THREE.CylinderGeometry(0.04, 0.06, 0.7, 12), mesaM, 2);
    peM.position.set(-0.75, 0.36, 0.62);
    this.g.add(tampoM, peM);
    const gal = k.m(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 24), k.mat({ color: 0x9fd0ff, rough: 0.05, transp: 0.5, clear: 1 }), 1.5);
    gal.position.set(-0.3, 0.17, -0.1);
    const galT = k.m(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), k.mat({ color: 0x2a6fd6 }), 1);
    galT.position.set(-0.3, 0.37, -0.1);
    this.g.add(gal, galT);
    const R = rng(3);
    for (let i = 0; i < 5; i++) {
      const f = k.m(new THREE.SphereGeometry(0.05, 14, 10), k.mat({ color: [0xf5c518, 0xd8322b, 0xff8c1a, 0x7bc043, 0xd8322b][i], rough: 0.35, clear: 0.6 }), 1.5);
      f.position.set(-0.75 + R.ab(-0.1, 0.1), 0.79, 0.62 + R.ab(-0.1, 0.1));
      this.g.add(f);
    }
    // vaso de planta no parapeito
    const vaso = k.m(new THREE.CylinderGeometry(0.06, 0.045, 0.1, 16), k.mat({ color: 0xc8643c }), 1.5);
    vaso.position.set(0.05, 1.18, -D / 2 + 0.05);
    const folha = k.m(new THREE.IcosahedronGeometry(0.09, 1), k.mat({ color: 0x3f9b4a, rough: 0.6 }), 1.5);
    folha.position.set(0.05, 1.29, -D / 2 + 0.05);
    this.g.add(vaso, folha);
  }

  /** vazão na boca no instante tau (1 corre, 0 seco) — corre, tosse ar e para */
  vazao(tau: number, tSeca: number) {
    if (tau < tSeca - 1.0) return 1;
    if (tau >= tSeca) return 0;
    const x = (tau - (tSeca - 1.0)) / 1.0;
    // engasgos: blocos cada vez mais curtos
    const fase = Math.floor(x * 7);
    return fase % 2 === 0 && Math.sin(fase * 12.9) > -0.4 ? 1 - x * 0.5 : 0;
  }

  /** t = tempo absoluto; tSeca = quando a água para; hora = hora do HUD (ponteiros) */
  aplica(t: number, tSeca: number, hora: number, abre: number) {
    const L = this.boca.y - this.fundoPia;
    const v = 2.4; // velocidade da queda (unidades/s)
    this.agua.forEach((s, i) => {
      const y = this.boca.y - ((i + 0.5) / this.agua.length) * L;
      const tau = t - (this.boca.y - y) / v;
      const q = this.vazao(tau, tSeca) * abre;
      s.visible = q > 0.05;
      s.position.set(this.boca.x + Math.sin(t * 31 + i) * 0.0015, y, this.boca.z);
      s.scale.set(0.6 + 0.6 * q, 1.25, 0.6 + 0.6 * q);
    });
    const q0 = this.vazao(t - L / v, tSeca) * abre;
    this.espuma.visible = q0 > 0.05;
    this.espuma.scale.set(0.6 + 0.5 * q0 + 0.08 * Math.sin(t * 40), 0.18, 0.6 + 0.5 * q0);
    // gotas depois de secar: uma a cada 1,1 s
    const dt = t - tSeca - 0.2;
    if (dt > 0) {
      const ciclo = dt % 1.1;
      this.gota.visible = true;
      if (ciclo < 0.8) {
        const s = 0.4 + ciclo * 0.9;
        this.gota.scale.setScalar(s);
        this.gota.position.set(this.boca.x, this.boca.y - 0.008 * s, this.boca.z);
      } else {
        const q = ciclo - 0.8;
        this.gota.scale.setScalar(1.1);
        this.gota.position.set(this.boca.x, Math.max(this.fundoPia, this.boca.y - 0.01 - 4.9 * q * q), this.boca.z);
        if (this.boca.y - 0.01 - 4.9 * q * q < this.fundoPia) this.gota.visible = false;
      }
    } else this.gota.visible = false;
    this.alavanca.rotation.z = 0.5 * abre;
    // ponteiros
    const h = hora % 12;
    this.ponteiroH.rotation.z = -(h / 12) * Math.PI * 2;
    this.ponteiroM.rotation.z = -((hora * 60) % 60) / 60 * Math.PI * 2;
    this.ponteiroS.rotation.z = -Math.floor(t) / 60 * Math.PI * 2 * 1;
  }
}

function texMostrador() {
  const [c, g] = cv(256, 256);
  g.fillStyle = "#fbf7ef";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#1a1a1a";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = i % 3 === 0 ? 92 : 100, r2 = 112;
    g.lineWidth = i % 3 === 0 ? 9 : 4;
    g.strokeStyle = "#1a1a1a";
    g.beginPath();
    g.moveTo(128 + Math.sin(a) * r1, 128 - Math.cos(a) * r1);
    g.lineTo(128 + Math.sin(a) * r2, 128 - Math.cos(a) * r2);
    g.stroke();
  }
  return tx(c);
}

// ------------------------------------------------------------------ AÇOUGUE (36 h): gelo derretendo e vacinas na geladeira
export class Acougue {
  g = new THREE.Group();
  gelo: THREE.Mesh[] = [];
  poca: THREE.Mesh;
  pingos: THREE.Mesh[] = [];
  luzGel: THREE.PointLight;
  painel: THREE.MeshBasicMaterial;
  geloBase: THREE.Vector3[] = [];
  constructor(public kit: Kit) {
    const k = kit;
    const W = 3.4, D = 2.6, H = 2.3;
    this.g.add(sala(k, { w: W, d: D, h: H, piso: texAzulejo("#b8483a", "#7a2c24", 8), pisoRep: 4, fundo: texParede("#a9c7b4", "#ffffff", 0.62, "#c0392b", 24), lado: texParede("#a9c7b4", "#ffffff", 0.62, "#c0392b", 18), jan: [-0.75, 1.2, 0.8, 0.7] }));
    const inox = k.mat({ color: 0xc9ced4, metal: 0.9, rough: 0.28 });
    const branco = k.mat({ color: 0xf4f2ee, rough: 0.4, clear: 0.5 });
    // balcão refrigerado (vitrine) de frente para a câmera
    const vx = -0.35, vz = 0.25;
    const corpo = k.m(new RoundedBoxGeometry(2.0, 0.62, 0.7, 2, 0.03), branco, 2);
    corpo.position.set(vx, 0.31, vz);
    const faixa = k.m(new THREE.BoxGeometry(2.01, 0.08, 0.71), k.mat({ color: 0xc0392b }), 1);
    faixa.position.set(vx, 0.5, vz);
    const bandeja = k.m(new THREE.BoxGeometry(1.9, 0.03, 0.6), inox, 1.5);
    bandeja.position.set(vx, 0.635, vz);
    this.g.add(corpo, faixa, bandeja);
    // carnes na vitrine
    const R = rng(9);
    for (let i = 0; i < 7; i++) {
      const c = k.m(new RoundedBoxGeometry(R.ab(0.16, 0.24), 0.06, R.ab(0.12, 0.18), 2, 0.025), k.mat({ color: [0xb3262e, 0xa52a2a, 0xc0473a][i % 3], rough: 0.45, clear: 0.6 }), 1.5);
      c.position.set(vx - 0.8 + i * 0.26, 0.68, vz + R.ab(-0.08, 0.1));
      c.rotation.y = R.ab(-0.3, 0.3);
      const gord = k.m(new RoundedBoxGeometry(0.05, 0.062, 0.1, 1, 0.02), k.mat({ color: 0xf3e6d6, rough: 0.5 }), 1);
      gord.position.set(c.position.x - 0.07, 0.681, c.position.z);
      this.g.add(c, gord);
    }
    // vidro inclinado
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.42), new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.05, transparent: true, opacity: 0.18, clearcoat: 1, side: THREE.DoubleSide }));
    vidro.material.userData.semContorno = true;
    vidro.position.set(vx, 0.82, vz + 0.27);
    vidro.rotation.x = -0.55;
    this.g.add(vidro);
    const topo = k.m(new THREE.BoxGeometry(2.0, 0.035, 0.32), inox, 1.5);
    topo.position.set(vx, 1.0, vz - 0.17);
    this.g.add(topo);
    // gelo numa bandeja em cima do balcão
    const tb = k.m(new THREE.BoxGeometry(0.62, 0.025, 0.3), inox, 1.5);
    tb.position.set(vx - 0.35, 1.03, vz - 0.17);
    this.g.add(tb);
    const mGelo = new THREE.MeshPhysicalMaterial({ color: 0xa9dcff, roughness: 0.04, transparent: true, opacity: 0.62, clearcoat: 1, emissive: 0x2f6f99, emissiveIntensity: 0.3 });
    mGelo.userData.semContorno = true;
    for (let i = 0; i < 6; i++) {
      const gm = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.1, 0.11, 2, 0.02), mGelo);
      const p = new THREE.Vector3(vx - 0.55 + (i % 3) * 0.17 + R.ab(-0.02, 0.02), 1.092, vz - 0.24 + Math.floor(i / 3) * 0.14);
      gm.position.copy(p);
      gm.rotation.y = R.ab(-0.3, 0.3);
      gm.castShadow = true;
      this.gelo.push(gm);
      this.geloBase.push(p);
      this.g.add(gm);
    }
    this.poca = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1 }));
    this.poca.rotation.x = -Math.PI / 2;
    this.poca.position.set(vx - 0.35, 1.044, vz - 0.15);
    this.g.add(this.poca);
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), mGelo);
      this.pingos.push(p);
      this.g.add(p);
    }
    // ganchos com carne pendurada na parede da esquerda
    const trilho = k.m(new THREE.CylinderGeometry(0.012, 0.012, 1.6, 8), inox, 1.5);
    trilho.rotation.x = Math.PI / 2;
    trilho.position.set(-W / 2 + 0.18, 1.75, -0.2);
    this.g.add(trilho);
    for (let i = 0; i < 3; i++) {
      const z = -0.75 + i * 0.5;
      const gancho = k.m(new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI * 1.4), inox, 1);
      gancho.position.set(-W / 2 + 0.18, 1.71, z);
      gancho.rotation.y = Math.PI / 2;
      const carne = k.m(new THREE.CapsuleGeometry(0.09, 0.28, 6, 12), k.mat({ color: 0xa8302e, rough: 0.45, clear: 0.6 }), 1.5);
      carne.position.set(-W / 2 + 0.18, 1.43, z);
      carne.scale.set(1, 1, 0.75);
      this.g.add(gancho, carne);
    }
    // geladeira vertical de porta de vidro, ligada no gerador: vacinas nas prateleiras
    const gx = 1.15, gz = -D / 2 + 0.36;
    const caixa = new THREE.Group();
    const mCorpo = k.mat({ color: 0xe9ecef, rough: 0.35, clear: 0.6 });
    const parede = (w: number, h: number, d: number, x: number, y: number, z: number, m = mCorpo) => {
      const b = k.m(new THREE.BoxGeometry(w, h, d), m, 2);
      b.position.set(x, y, z);
      caixa.add(b);
    };
    parede(0.86, 0.06, 0.62, 0, 1.92, 0);
    parede(0.86, 0.16, 0.62, 0, 0.08, 0);
    parede(0.05, 1.9, 0.62, -0.405, 1.0, 0);
    parede(0.05, 1.9, 0.62, 0.405, 1.0, 0);
    this.painel = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xcfe6ff).multiplyScalar(0.95), toneMapped: false });
    const fundoG = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.74), this.painel);
    fundoG.position.set(0, 1.0, -0.3);
    caixa.add(fundoG);
    const mVac = k.mat({ map: texRotulo([["VACINA", "800 64px 'Space Grotesk'", "#1f4fa8"], ["", "400 20px sans-serif", "#000"]], "#ffffff", 256, 128), rough: 0.5, semContorno: true });
    const mVac2 = k.mat({ color: 0xffffff, rough: 0.5 });
    for (let s = 0; s < 4; s++) {
      const y = 0.4 + s * 0.42;
      parede(0.76, 0.02, 0.56, 0, y, 0.0, k.mat({ color: 0xbfd6e6, transp: 0.7, rough: 0.2 }));
      if (s >= 1) {
        for (let i = 0; i < 4; i++) {
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.12), [mVac2, mVac2, mVac2, mVac2, mVac, mVac2]);
          v.castShadow = v.receiveShadow = true;
          v.position.set(-0.27 + i * 0.18, y + 0.066, 0.12 - (i % 2) * 0.03);
          caixa.add(v);
          if (s === 2) {
            const v2 = v.clone();
            v2.position.y += 0.115;
            v2.position.x += 0.02;
            caixa.add(v2);
          }
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const c = k.m(new RoundedBoxGeometry(0.2, 0.07, 0.16, 2, 0.02), k.mat({ color: 0xb3262e, rough: 0.45, clear: 0.6 }), 1);
          c.position.set(-0.23 + i * 0.23, y + 0.05, 0.05);
          caixa.add(c);
        }
      }
    }
    const porta = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.76), new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.04, transparent: true, opacity: 0.16, clearcoat: 1 }));
    porta.material.userData.semContorno = true;
    porta.position.set(0, 1.0, 0.315);
    const pux = k.m(new RoundedBoxGeometry(0.03, 0.5, 0.04, 1, 0.01), inox, 1);
    pux.position.set(0.33, 1.05, 0.34);
    caixa.add(porta, pux);
    this.luzGel = new THREE.PointLight(0xd8ecff, 2.2, 2.4, 1.5);
    this.luzGel.position.set(0, 1.1, 0.5);
    caixa.add(this.luzGel);
    caixa.position.set(gx, 0, gz);
    this.g.add(caixa);
    // balança em cima do balcão
    const bal = k.m(new RoundedBoxGeometry(0.26, 0.08, 0.2, 2, 0.02), k.mat({ color: 0xf4f2ee }), 1.5);
    bal.position.set(vx + 0.62, 1.06, vz - 0.17);
    const prato = k.m(new THREE.BoxGeometry(0.24, 0.01, 0.18), inox, 1);
    prato.position.set(vx + 0.62, 1.105, vz - 0.17);
    this.g.add(bal, prato);
  }

  /** derrete 0..1 (o gelo acaba), t = tempo */
  aplica(derrete: number, t: number) {
    this.gelo.forEach((g, i) => {
      const d = c01(derrete * 1.15 - (i % 3) * 0.05);
      const sy = 1 - 0.82 * d, sx = 1 - 0.45 * d;
      g.scale.set(sx, sy, sx);
      g.position.set(this.geloBase[i].x, 1.042 + 0.05 * sy, this.geloBase[i].z);
      g.visible = sy > 0.2;
    });
    const s = 0.4 + 1.2 * ease(derrete);
    this.poca.scale.set(s * 1.4, s, 1);
    this.pingos.forEach((p, i) => {
      const per = 0.7 + i * 0.23;
      const q = ((t + i * 0.37) % per) / per;
      p.position.set(this.poca.position.x - 0.28 + i * 0.25, 1.03 - 0.95 * q * q, this.poca.position.z + 0.16);
      p.visible = derrete > 0.25 && q < 0.98;
    });
    this.luzGel.intensity = 1.3;
  }
}

// ------------------------------------------------------------------ FREEZER em corte (48 h, noite)
export class Freezer {
  g = new THREE.Group();
  tampa = new THREE.Group();
  nevoa: THREE.Points;
  nevoaBase: Float32Array;
  luzFrio: THREE.PointLight;
  geada: THREE.MeshStandardMaterial[] = [];
  lanterna: THREE.SpotLight;
  constructor(public kit: Kit) {
    const k = kit;
    const W = 3.0, D = 2.4, H = 2.2;
    this.g.add(sala(k, { w: W, d: D, h: H, piso: texAzulejo("#9aa3ad", "#5d646c", 8), pisoRep: 4, fundo: texParede("#c9d6cf", "#e8eef0", 0.55, "#3a64c8", 20), lado: texParede("#c9d6cf", "#e8eef0", 0.55, "#3a64c8", 16), jan: [-0.6, 1.15, 0.75, 0.65], noite: true }));
    // freezer horizontal: 4 paredes + fundo (a frente foi cortada para mostrar o recheio)
    const fx = 0.3, fz = -0.55, fw = 1.5, fh = 0.86, fd = 0.78, e = 0.08;
    const casca = k.mat({ color: 0xf4f4f2, rough: 0.35, clear: 0.7 });
    const espuma = k.mat({ color: 0xf2d77a, rough: 0.9 }); // poliuretano no corte
    const frio = k.mat({ color: 0xe4f1ff, rough: 0.85 }) as THREE.MeshStandardMaterial;
    this.geada.push(frio);
    // faces: +x, -x, +y, -y, +z, -z (o corte da frente mostra a espuma de poliuretano)
    const bloco = (w: number, h: number, d: number, x: number, y: number, z: number, dentro: number) => {
      const mats = [casca, casca, casca, casca, espuma, casca];
      mats[dentro] = frio;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      b.castShadow = b.receiveShadow = true;
      b.position.set(fx + x, y, fz + z);
      this.g.add(b);
      return b;
    };
    bloco(fw, e, fd, 0, e / 2 + 0.05, 0, 2); // fundo
    bloco(e, fh, fd, -fw / 2 + e / 2, fh / 2 + 0.05, 0, 0); // esquerda
    bloco(e, fh, fd, fw / 2 - e / 2, fh / 2 + 0.05, 0, 1); // direita
    bloco(fw, fh, e, 0, fh / 2 + 0.05, -fd / 2 + e / 2, 4); // trás
    // pés
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = k.m(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), k.mat({ color: 0x333333 }), 1);
      p.position.set(fx + sx * (fw / 2 - 0.08), 0.025, fz + sz * (fd / 2 - 0.08));
      this.g.add(p);
    }
    // recheio: pacotes congelados com geada
    const R = rng(14);
    const cores = [0x2e8b57, 0xb3262e, 0xf5c518, 0xf2a0b8, 0x2c6fd1, 0xffffff, 0xff8c1a];
    for (let cam = 0; cam < 4; cam++)
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 3; j++) {
          if (cam === 3 && R.r() < 0.4) continue;
          const w = R.ab(0.15, 0.21), h = R.ab(0.1, 0.15), d = R.ab(0.14, 0.18);
          const c = k.m(new RoundedBoxGeometry(w, h, d, 2, 0.03), k.mat({ color: R.pick(cores), rough: 0.5, clear: 0.4 }), 1);
          c.position.set(fx - fw / 2 + e + 0.12 + i * 0.215 + R.ab(-0.02, 0.02), 0.05 + e + h / 2 + cam * 0.155, fz - fd / 2 + e + 0.1 + j * 0.2 + R.ab(-0.02, 0.02));
          c.rotation.y = R.ab(-0.2, 0.2);
          this.g.add(c);
        }
    // tampa articulada atrás
    const tampa = k.m(new RoundedBoxGeometry(fw, 0.08, fd, 2, 0.02), casca, 2);
    tampa.position.set(0, 0.04, fd / 2);
    const alca = k.m(new RoundedBoxGeometry(0.4, 0.03, 0.04, 1, 0.01), k.mat({ color: 0x8a8f96, metal: 0.6, rough: 0.3 }), 1);
    alca.position.set(0, 0.0, fd + 0.02);
    this.tampa.add(tampa, alca);
    this.tampa.position.set(fx, fh + 0.05, fz - fd / 2);
    this.g.add(this.tampa);
    // luz do frio (visualização do frio no corte)
    this.luzFrio = new THREE.PointLight(0x7fb8ff, 2.5, 1.6, 1.5);
    this.luzFrio.position.set(fx, 0.55, fz + 0.2);
    this.g.add(this.luzFrio);
    // névoa fria (sobe e escapa quando abre)
    const n = 520;
    const pos = new Float32Array(n * 3);
    this.nevoaBase = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = fx + R.ab(-fw / 2 + 0.1, fw / 2 - 0.1), y = R.ab(0.25, 0.85), z = fz + R.ab(-fd / 2 + 0.1, fd / 2 - 0.05);
      this.nevoaBase.set([x, y, z, R.r()], i * 4);
      pos.set([x, y, z], i * 3);
    }
    const gN = new THREE.BufferGeometry();
    gN.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.nevoa = new THREE.Points(gN, new THREE.PointsMaterial({ map: texSprite(), color: 0xdff0ff, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.g.add(this.nevoa);
    // máquina de lavar ao lado
    const maq = k.m(new RoundedBoxGeometry(0.68, 0.86, 0.62, 2, 0.04), k.mat({ color: 0xf2f2f0, rough: 0.4, clear: 0.6 }), 2);
    maq.position.set(-1.0, 0.43, -0.75);
    const aro = k.m(new THREE.TorusGeometry(0.17, 0.03, 10, 32), k.mat({ color: 0xc0c4c8, metal: 0.8, rough: 0.25 }), 1);
    aro.position.set(-1.0, 0.42, -0.43);
    const vid = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), k.mat({ color: 0x1c2234, rough: 0.1, clear: 1, semContorno: true }));
    vid.position.set(-1.0, 0.42, -0.435);
    this.g.add(maq, aro, vid);
    // lanterna de alguém fora de quadro
    this.lanterna = new THREE.SpotLight(0xfff1d6, 4, 7, 0.5, 0.6, 1.4);
    this.lanterna.position.set(1.4, 1.9, 1.5);
    this.lanterna.target.position.set(fx, 0.5, fz);
    this.lanterna.castShadow = true;
    this.lanterna.shadow.mapSize.set(1024, 1024);
    this.g.add(this.lanterna, this.lanterna.target);
  }

  /** abre 0..1 (tampa), perde 0..1 (o frio escapa), t = tempo */
  aplica(abre: number, perde: number, t: number) {
    this.tampa.rotation.x = -1.2 * ease(abre);
    this.luzFrio.intensity = 2.5 * (1 - perde);
    this.geada.forEach((m) => m.color.setRGB(0.89, 0.94, 1).lerp(new THREE.Color(0xf3ecdf), perde));
    const pos = this.nevoa.geometry.getAttribute("position") as THREE.BufferAttribute;
    const b = this.nevoaBase;
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 4], y = b[i * 4 + 1], z = b[i * 4 + 2], s = b[i * 4 + 3];
      const sobe = Math.max(0, abre * 1.6 - s * 0.6);
      pos.setXYZ(i, x + Math.sin(t * 0.7 + s * 30) * 0.03 + sobe * (s - 0.5) * 0.6, y + Math.sin(t * 0.9 + s * 17) * 0.02 + sobe * (0.5 + s) * 0.9, z + Math.cos(t * 0.6 + s * 11) * 0.03 + sobe * 0.5);
    }
    pos.needsUpdate = true;
    (this.nevoa.material as THREE.PointsMaterial).opacity = 0.22 * (1 - c01(perde * 1.2 - 0.2));
  }
}

// ------------------------------------------------------------------ garrafa de água mineral com etiqueta de preço (no mapa)
export class Garrafa {
  g = new THREE.Group();
  etiqueta: THREE.Sprite;
  constructor(public kit: Kit, escala = 1) {
    const k = kit;
    const perfil = [[0, 0], [0.042, 0], [0.05, 0.012], [0.05, 0.2], [0.046, 0.225], [0.022, 0.27], [0.016, 0.285], [0.016, 0.3]].map(([r, y]) => new THREE.Vector2(r, y));
    const casca = new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), new THREE.MeshPhysicalMaterial({ color: 0xe6f6ff, roughness: 0.05, transparent: true, opacity: 0.32, clearcoat: 1, side: THREE.DoubleSide }));
    casca.material.userData.semContorno = true;
    const pa = [[0, 0.004], [0.046, 0.004], [0.046, 0.2], [0.042, 0.22], [0.02, 0.255], [0, 0.255]].map(([r, y]) => new THREE.Vector2(r, y));
    const agua = new THREE.Mesh(new THREE.LatheGeometry(pa, 40), new THREE.MeshPhysicalMaterial({ color: 0x8fd0ff, roughness: 0.02, transparent: true, opacity: 0.42, emissive: 0x1d4f73, emissiveIntensity: 0.4 }));
    const tampa = k.m(new THREE.CylinderGeometry(0.019, 0.019, 0.022, 20), k.mat({ color: 0x2a6fd6, rough: 0.4 }), 1);
    tampa.position.y = 0.31;
    const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.0505, 0.0505, 0.075, 40, 1, true), k.mat({ map: texRotulo([["ÁGUA", "800 70px 'Space Grotesk'", "#ffffff"], ["MINERAL", "700 44px 'Space Grotesk'", "#cfe6ff"]], "#2a6fd6", 512, 160), rough: 0.5, semContorno: true }));
    rot.position.y = 0.11;
    this.g.add(casca, agua, tampa, rot);
    // etiqueta de preço (sempre de frente para a câmera)
    const [c, g] = cv(512, 300);
    g.fillStyle = "#fff8e6";
    g.beginPath();
    g.roundRect(8, 8, 496, 284, 36);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = "#FF3B30";
    g.stroke();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#FF3B30";
    g.font = "800 150px 'Space Grotesk'";
    g.fillText("R$ 35", 256, 130);
    g.fillStyle = "#1a1a1a";
    g.font = "700 54px 'Space Grotesk'";
    g.fillText("o litro", 256, 238);
    this.etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx(c), color: 0xbdbdbd, toneMapped: true, depthTest: false }));
    this.etiqueta.scale.set(0.24, 0.14, 1);
    this.etiqueta.position.set(0.0, 0.43, 0.0);
    this.g.add(this.etiqueta);
    this.g.scale.setScalar(escala);
    this.g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  }
  /** cai 0..1 (entra de cima), etq 0..1 (a etiqueta aparece) */
  aplica(cai: number, etq: number) {
    const q = c01(cai);
    const quique = q < 1 ? (1 - q) * (1 - q) * 0.8 : 0;
    this.g.visible = q > 0;
    this.g.position.y = quique;
    const s = etq <= 0 ? 0 : 1 - Math.exp(-etq * 7) * Math.cos(etq * 9);
    this.etiqueta.visible = etq > 0;
    this.etiqueta.scale.set(0.24 * s, 0.14 * s, 1);
  }
}
