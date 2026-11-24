import * as THREE from "three";
import { capsula, cil, esfera, Kit, V3 } from "./kit";
import { rng } from "./rng";
import { desenhaLogoBK, desenhaM, FONTE, FONTE_T } from "./tex";

// Objetos de cena feitos aqui (nada baixado).
const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
};
const tx = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// ---------------------------------------------------------------- jornal: página inteira
export function texPagina() {
  const W = 1024, H = 1400;
  const { c, g } = cv(W, H);
  g.fillStyle = "#f3eee2";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#1b1a18";
  g.textAlign = "center";
  g.font = `700 92px Georgia, 'Times New Roman', serif`;
  g.fillText("New York Times", W / 2, 118);
  g.fillRect(50, 150, W - 100, 5);
  g.fillRect(50, 162, W - 100, 2);
  // anúncio de página inteira (o conteúdo é do BK)
  g.fillStyle = "#F5EBDC";
  g.fillRect(60, 190, W - 120, H - 250);
  desenhaLogoBK(g, W / 2, 330, 110);
  g.fillStyle = "#502314";
  g.font = `400 86px ${FONTE_T}`;
  g.fillText("McWHOPPER", W / 2, 560);
  g.font = `700 46px ${FONTE}`;
  g.fillText("metade Whopper, metade Big Mac", W / 2, 630);
  // ilustração do lanche meio a meio
  const cx = W / 2, cy = 900;
  const camada = (y: number, h: number, cor: string, r: number) => {
    g.fillStyle = cor;
    g.beginPath();
    g.roundRect(cx - r, y, r * 2, h, h / 2);
    g.fill();
  };
  g.save();
  g.beginPath();
  g.rect(0, 0, cx, H);
  g.clip();
  g.fillStyle = "#E9A04C";
  g.beginPath();
  g.ellipse(cx, 820, 260, 120, 0, Math.PI, 0);
  g.fill();
  camada(820, 34, "#6CC24A", 270);
  camada(852, 30, "#E4352B", 255);
  camada(880, 52, "#5c3420", 268);
  camada(930, 46, "#E8B067", 255);
  g.restore();
  g.save();
  g.beginPath();
  g.rect(cx, 0, cx, H);
  g.clip();
  g.fillStyle = "#E9A04C";
  g.beginPath();
  g.ellipse(cx, 820, 220, 130, 0, Math.PI, 0);
  g.fill();
  camada(818, 26, "#6CC24A", 228);
  camada(842, 40, "#5c3420", 230);
  camada(880, 26, "#E8B067", 220);
  camada(904, 18, "#FFC21A", 228);
  camada(920, 40, "#5c3420", 230);
  camada(958, 34, "#E8B067", 220);
  g.restore();
  g.strokeStyle = "#502314";
  g.setLineDash([12, 10]);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(cx, 660);
  g.lineTo(cx, 1030);
  g.stroke();
  g.setLineDash([]);
  g.font = `700 50px ${FONTE}`;
  g.fillStyle = "#D62300";
  g.fillText("no Dia da Paz", W / 2, 1110);
  g.font = `500 30px Georgia, serif`;
  g.fillStyle = "#6b5a4c";
  for (let i = 0; i < 4; i++) {
    g.fillRect(140, 1170 + i * 34, W - 280, 10);
  }
  return tx(c);
}

export function jornal(k: Kit) {
  // página aberta: metade fixa + metade que gira (abre de 0 a 1)
  const g = new THREE.Group();
  const tex = texPagina();
  const W = 1.0, H = 1.37;
  const mk = (u0: number) => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(0.5, 1);
    t.offset.set(u0, 0);
    return k.mat({ map: t, rough: 0.85, side: THREE.DoubleSide, emissive: "#ffffff", ei: 0 });
  };
  const mE = mk(0), mD = mk(0.5);
  for (const m of [mE, mD]) {
    const mm = m as THREE.MeshStandardMaterial;
    mm.emissiveMap = mm.map;
    mm.emissiveIntensity = k.dir === "A" ? 0.1 : 0.35;
  }
  const dir = new THREE.Mesh(new THREE.PlaneGeometry(W / 2, H), mD);
  dir.position.x = W / 4;
  dir.castShadow = true;
  k.contorno(dir, 2.5);
  g.add(dir);
  const dob = new THREE.Group();
  const esq = new THREE.Mesh(new THREE.PlaneGeometry(W / 2, H), mE);
  esq.position.x = -W / 4;
  esq.castShadow = true;
  k.contorno(esq, 2.5);
  dob.add(esq);
  g.add(dob);
  g.userData.dob = dob;
  return g;
}

// ---------------------------------------------------------------- bandeira branca da paz
export function bandeira(k: Kit) {
  const g = new THREE.Group();
  k.m(cil(0.06, 0.06, 2.6, 10), k.mat({ color: "#8a5a35", rough: 0.6 }), 2, g, [0, 1.0, 0]);
  const geo = new THREE.PlaneGeometry(1.4, 0.95, 16, 8);
  geo.translate(0.72, 1.8, 0);
  const pano = k.m(geo, k.mat({ color: "#ffffff", rough: 0.8, side: THREE.DoubleSide }), 2, g);
  g.userData.pano = pano;
  g.userData.base = new Float32Array((geo.attributes.position as THREE.BufferAttribute).array as Float32Array);
  return g;
}
export function balancaBandeira(g: THREE.Object3D, t: number) {
  const pano = g.userData.pano as THREE.Mesh;
  if (!pano) return;
  const b = g.userData.base as Float32Array;
  const p = pano.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = b[i * 3] - 0.02;
    p.setZ(i, Math.sin(x * 4 - t * 7) * 0.12 * x);
    p.setY(i, b[i * 3 + 1] - x * x * 0.05);
  }
  p.needsUpdate = true;
  pano.geometry.computeVertexNormals();
}

// ---------------------------------------------------------------- telefone vermelho antigo
export function telefone(k: Kit) {
  const g = new THREE.Group();
  const verm = k.mat({ color: "#e0262b", rough: 0.35, clear: 0.7 });
  const corpo = new THREE.Group();
  g.add(corpo);
  k.m(cil(0.55, 0.75, 0.6, 32), verm, 3, corpo, [0, 0.3, 0]);
  k.m(cil(0.32, 0.32, 0.06, 32), k.mat({ color: "#f4f0e6", rough: 0.4 }), 2, corpo, [0, 0.55, 0.38], [Math.PI / 2 - 0.5, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.m(esfera(0.035), k.mat({ color: "#222", rough: 0.4, semContorno: true }), 1, corpo, [Math.cos(a) * 0.22, 0.55 + Math.sin(a) * 0.22 * 0.88, 0.42 + Math.sin(a) * 0.1]);
  }
  const fone = new THREE.Group();
  fone.position.set(0, 0.72, 0);
  g.add(fone);
  k.m(capsula(0.13, 0.9), verm, 3, fone, [0, 0, 0], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) k.m(esfera(0.2), verm, 3, fone, [s * 0.55, 0.06, 0], undefined, [1, 0.8, 1]);
  g.userData.fone = fone;
  return g;
}

// ---------------------------------------------------------------- celular (na mão do executivo)
export function celular(k: Kit) {
  const g = new THREE.Group();
  k.m(new THREE.BoxGeometry(0.5, 1, 0.07), k.mat({ color: "#1d1d22", rough: 0.3, clear: 0.8 }), 2, g, [0, 0.5, 0]);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.92), k.mat({ color: "#3b5998", rough: 0.3, emissive: "#6e8fe0", ei: 0.8, semContorno: true }));
  tela.position.set(0, 0.5, 0.037);
  g.add(tela);
  return g;
}

// ---------------------------------------------------------------- carro com o casal
export function carro(k: Kit) {
  const g = new THREE.Group();
  const lat = k.mat({ color: "#2f7fd8", rough: 0.35, clear: 0.8 });
  const vid = k.mat({ color: "#bfe3ff", rough: 0.15, clear: 1, emissive: "#9fd2ff", ei: 0.15 });
  const pneu = k.mat({ color: "#1b1b1f", rough: 0.6 });
  const roda = k.mat({ color: "#d8dbe0", rough: 0.3, metal: 0.7 });
  const corpo = new THREE.Group();
  g.add(corpo);
  k.m(new THREE.BoxGeometry(0.34, 0.12, 0.62, 2, 2, 2), lat, 2.5, corpo, [0, 0.11, 0]);
  k.m(new THREE.BoxGeometry(0.3, 0.12, 0.34), lat, 2.5, corpo, [0, 0.23, -0.04]);
  k.m(new THREE.BoxGeometry(0.31, 0.09, 0.3), vid, 1.5, corpo, [0, 0.235, -0.04]);
  // farois
  for (const s of [-1, 1]) k.m(esfera(0.025), k.mat({ color: "#fff6c8", emissive: "#fff2a0", ei: 0.8 }), 1, corpo, [s * 0.11, 0.12, 0.31]);
  const rodas: THREE.Object3D[] = [];
  for (const [x, z] of [
    [-0.17, 0.2],
    [0.17, 0.2],
    [-0.17, -0.2],
    [0.17, -0.2],
  ]) {
    const r = new THREE.Group();
    r.position.set(x, 0.06, z);
    corpo.add(r);
    k.m(cil(0.06, 0.06, 0.05, 20), pneu, 2, r, [0, 0, 0], [0, 0, Math.PI / 2]);
    k.m(cil(0.03, 0.03, 0.052, 12), roda, 1, r, [0, 0, 0], [0, 0, Math.PI / 2]);
    rodas.push(r);
  }
  // o casal (duas cabeças pelo vidro)
  const pele = [k.mat({ color: "#e9b38f", rough: 0.6 }), k.mat({ color: "#b98563", rough: 0.6 })];
  const cab = [k.mat({ color: "#3a2416", rough: 0.6 }), k.mat({ color: "#d9a441", rough: 0.6 })];
  for (const [i, x] of [
    [0, -0.07],
    [1, 0.07],
  ] as const) {
    k.m(esfera(0.045), pele[i], 1.5, corpo, [x, 0.24, -0.02]);
    k.m(esfera(0.048, 16, 10), cab[i], 1.5, corpo, [x, 0.258, -0.03], undefined, [1, 0.8, 1]);
  }
  // copo de café no painel (aparece depois)
  const copo = new THREE.Group();
  copo.position.set(0.17, 0.2, 0.02);
  copo.scale.setScalar(1.4);
  corpo.add(copo);
  k.m(cil(0.04, 0.03, 0.1, 16), k.mat({ color: "#ffffff", rough: 0.6 }), 1.5, copo, [0, 0, 0]);
  k.m(cil(0.041, 0.041, 0.03, 16), k.mat({ color: "#DA291C", rough: 0.5 }), 1, copo, [0, 0, 0]);
  k.m(cil(0.043, 0.04, 0.015, 16), k.mat({ color: "#5A3A22", rough: 0.5 }), 1, copo, [0, 0.055, 0]);
  g.userData.rodas = rodas;
  g.userData.copo = copo;
  g.userData.corpo = corpo;
  return g;
}

// ---------------------------------------------------------------- drive-thru (genérico, com o M)
export function driveThru(k: Kit) {
  const g = new THREE.Group();
  const parede = k.mat({ color: "#f4efe6", rough: 0.8 });
  const verm = k.mat({ color: "#DA291C", rough: 0.6 });
  k.m(new THREE.BoxGeometry(0.7, 0.36, 0.5), parede, 2.5, g, [0, 0.18, 0]);
  k.m(new THREE.BoxGeometry(0.76, 0.06, 0.56), verm, 2, g, [0, 0.39, 0]);
  k.m(new THREE.BoxGeometry(0.72, 0.05, 0.08), k.mat({ color: "#FFC72C", rough: 0.5 }), 1.5, g, [0, 0.33, 0.28]);
  // janela do drive (lado da estrada, -x)
  k.m(new THREE.BoxGeometry(0.02, 0.14, 0.18), k.mat({ color: "#ffe9a8", emissive: "#ffd56a", ei: 0.7 }), 1, g, [-0.36, 0.2, 0.05]);
  // poste com o M
  k.m(cil(0.015, 0.015, 0.6, 8), k.mat({ color: "#9a9ca3", metal: 0.7, rough: 0.4 }), 1.5, g, [-0.25, 0.3, 0.35]);
  const { c, g: gg } = cv(256, 256);
  gg.fillStyle = "#DA291C";
  gg.fillRect(0, 0, 256, 256);
  desenhaM(gg, 128, 140, 96);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.03), [
    verm, verm, verm, verm,
    k.mat({ map: tx(c), rough: 0.4, emissive: "#ffffff", ei: 0 }),
    k.mat({ map: tx(c), rough: 0.4 }),
  ]);
  const pm = (placa.material as THREE.Material[])[4] as THREE.MeshStandardMaterial;
  pm.emissiveMap = pm.map;
  pm.emissiveIntensity = 0.4;
  placa.position.set(-0.25, 0.66, 0.35);
  placa.rotation.y = -0.6;
  k.contorno(placa, 2);
  g.add(placa);
  return g;
}

// ---------------------------------------------------------------- cidade brasileira (prédios + morros + palmeiras)
export function cidade(k: Kit) {
  const g = new THREE.Group();
  const r = rng(41);
  const { c, g: gg } = cv(128, 256);
  gg.fillStyle = "#ffffff";
  gg.fillRect(0, 0, 128, 256);
  gg.fillStyle = "#9fb3c8";
  for (let y = 14; y < 256; y += 26) for (let x = 12; x < 128; x += 28) gg.fillRect(x, y, 16, 14);
  const jan = tx(c);
  jan.wrapS = jan.wrapT = THREE.RepeatWrapping;
  const cores = ["#f4d6a0", "#f6a95e", "#e9e2d0", "#8ccbd3", "#f2c5c0", "#c9e3a6"];
  for (let i = 0; i < 26; i++) {
    const w = 0.35 + r() * 0.35, h = 0.6 + r() * 1.8, d = 0.35 + r() * 0.3;
    const x = -3.2 + (i % 13) * 0.52 + r() * 0.1, z = -1.2 - Math.floor(i / 13) * 0.9 - r() * 0.3;
    const t = jan.clone();
    t.repeat.set(w * 3, h * 2);
    t.needsUpdate = true;
    const m = k.m(new THREE.BoxGeometry(w, h, d), k.mat({ color: cores[i % cores.length], map: t, rough: 0.8, emissive: "#ffd27a", ei: 0 }), 2.5, g, [x, h / 2, z]);
    m.userData.janela = true;
  }
  // morros ao fundo (morro com pão de açúcar estilizado)
  const verde = k.mat({ color: "#4fa35a", rough: 0.9 });
  for (let i = 0; i < 6; i++) k.m(esfera(1.2 + r() * 1.2, 24, 12), verde, 3, g, [-4 + i * 1.7, -0.4, -4.2 - r()], undefined, [1, 0.9 + r() * 0.6, 0.7]);
  k.m(esfera(0.9, 24, 16), k.mat({ color: "#6c8f63", rough: 0.9 }), 3, g, [2.6, 0.6, -3.4], undefined, [0.75, 1.7, 0.75]);
  // calçadão + palmeiras
  const calc = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), k.mat({ color: "#efe3c8", rough: 0.9, semContorno: true }));
  calc.rotation.x = -Math.PI / 2;
  calc.position.set(0, 0.001, 0.2);
  calc.receiveShadow = true;
  g.add(calc);
  const tronco = k.mat({ color: "#8a6a45", rough: 0.8 });
  const folha = k.mat({ color: "#3e9b48", rough: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Group();
    p.position.set(-3 + i * 1.0, 0, 0.6 + (i % 2) * 0.3);
    g.add(p);
    k.m(cil(0.025, 0.04, 0.9, 8), tronco, 1.5, p, [0, 0.45, 0], [0, 0, 0.08]);
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * Math.PI * 2;
      const f = k.m(new THREE.ConeGeometry(0.06, 0.45, 4), folha, 1.5, p, [Math.cos(a) * 0.18 + 0.03, 0.88, Math.sin(a) * 0.18]);
      f.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    }
  }
  return g;
}

// ---------------------------------------------------------------- sol, lua e coroa do eclipse
export function eclipse() {
  const g = new THREE.Group();
  const disco = (r: number, cor: string, op = 1) =>
    new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false, fog: false, toneMapped: false }));
  const { c, g: gg } = cv(256, 256);
  const gr = gg.createRadialGradient(128, 128, 30, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,240,200,1)");
  gr.addColorStop(0.35, "rgba(255,190,90,0.55)");
  gr.addColorStop(1, "rgba(255,150,60,0)");
  gg.fillStyle = gr;
  gg.fillRect(0, 0, 256, 256);
  const coroa = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const sol = disco(0.6, "#fff4cf");
  const lua = disco(0.62, "#1a1430");
  lua.position.z = 0.01;
  coroa.position.z = -0.01;
  g.add(coroa, sol, lua);
  g.userData = { sol, lua, coroa };
  return g;
}

// ---------------------------------------------------------------- grelha com chamas
export function grelha(k: Kit, carne: THREE.Material) {
  const g = new THREE.Group();
  const metal = k.mat({ color: "#2b2b30", rough: 0.4, metal: 0.8 });
  k.m(new THREE.BoxGeometry(0.9, 0.35, 0.6), metal, 2.5, g, [0, 0.175, 0]);
  for (let i = 0; i < 9; i++) k.m(new THREE.BoxGeometry(0.02, 0.02, 0.58), k.mat({ color: "#555", rough: 0.4, metal: 0.8 }), 0.8, g, [-0.4 + i * 0.1, 0.36, 0]);
  const chamas: THREE.Mesh[] = [];
  const fogo = k.mat({ color: "#ff8a1e", emissive: "#ff5a00", ei: 1.6, rough: 1, semContorno: true });
  const fogo2 = k.mat({ color: "#ffd23a", emissive: "#ffb000", ei: 1.6, rough: 1, semContorno: true });
  const r = rng(77);
  for (let i = 0; i < 12; i++) {
    const f = k.m(new THREE.ConeGeometry(0.05, 0.16, 8), i % 2 ? fogo : fogo2, 1.2, g, [-0.38 + r() * 0.76, 0.38, -0.25 + r() * 0.5]);
    chamas.push(f);
  }
  const carneM = k.m(cil(0.2, 0.2, 0.06, 32), carne, 2.5, g, [0, 0.4, 0]);
  g.userData = { chamas, carneM };
  return g;
}
export function animaGrelha(g: THREE.Object3D, t: number, forca = 1) {
  const ch = g.userData.chamas as THREE.Mesh[];
  ch?.forEach((f, i) => {
    const s = (0.6 + 0.5 * Math.abs(Math.sin(t * 9 + i * 1.7))) * forca;
    f.scale.set(1, s, 1);
    f.position.y = 0.38 + 0.08 * s * 0.5;
  });
}

// ---------------------------------------------------------------- pedestal giratório (McWhopper)
export function pedestal(k: Kit) {
  const g = new THREE.Group();
  k.m(cil(0.32, 0.36, 0.12, 48), k.mat({ color: "#ffffff", rough: 0.3, clear: 0.8 }), 2.5, g, [0, 0.06, 0]);
  k.m(cil(0.33, 0.33, 0.02, 48), k.mat({ color: "#FF6B2C", emissive: "#FF6B2C", ei: 0.5 }), 1.2, g, [0, 0.125, 0]);
  return g;
}

export const _v: V3 = [0, 0, 0];
