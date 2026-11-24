// Quintal do Nordeste: fogão de 4 bocas, botijão com mangueira, mesa, casa (reboco caiado, barrado, porta,
// janela, beiral de telha), mandacaru, chão de terra; feixe de sol com poeira; base da maquete (direção A).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Kit } from "./kit";
import { texMadeira, texTerra, texReboco, texMangueira } from "./tex";
import { rng } from "./rng";

const caixa = (w: number, h: number, d: number, r = 0.004, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => { const t = c01(x); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------------------------------------ fogão
export class Fogao {
  g = new THREE.Group();
  botoes: THREE.Group[] = [];
  constructor(kit: Kit) {
    const d = kit.dir;
    const branco = kit.mat({ color: d === "B" ? 0xffffff : d === "A" ? 0xe8e6e0 : 0xeeece6, rough: 0.28, clear: d === "C" ? 0.6 : undefined });
    const inox = kit.mat({ color: d === "B" ? 0xc9d0d6 : 0xb9bec2, metal: d === "B" ? 0 : 0.85, rough: 0.32 });
    const preto = kit.mat({ color: d === "B" ? 0x2a2a30 : 0x18181a, rough: d === "C" ? 0.55 : 0.5, metal: d === "B" ? 0 : 0.3 });
    const cromo = kit.mat({ color: 0xdfe3e6, metal: d === "B" ? 0 : 1, rough: 0.12 });
    const corpo = kit.m(caixa(0.54, 0.78, 0.56, 0.012, 3), branco);
    corpo.position.y = 0.41;
    const tampo = kit.m(caixa(0.55, 0.014, 0.57, 0.004), inox);
    tampo.position.y = 0.807;
    this.g.add(corpo, tampo);
    // bocas e grades
    for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.12], [0.13, 0.12]]) {
      const base = kit.m(new THREE.CylinderGeometry(0.05, 0.054, 0.014, 28), kit.mat({ color: d === "B" ? 0x9aa3ab : 0x7d8389, metal: d === "B" ? 0 : 0.6, rough: 0.45 }), 2);
      base.position.set(x, 0.82, z);
      const cap = kit.m(new THREE.CylinderGeometry(0.037, 0.039, 0.01, 28), preto, 2);
      cap.position.set(x, 0.832, z);
      this.g.add(base, cap);
      const gr = new THREE.Group();
      const s = 0.12, bw = 0.009;
      for (const [w, dd, px, pz] of [[2 * s, bw, 0, s], [2 * s, bw, 0, -s], [bw, 2 * s, s, 0], [bw, 2 * s, -s, 0], [s * 0.7, bw, s * 0.62, 0], [s * 0.7, bw, -s * 0.62, 0], [bw, s * 0.7, 0, s * 0.62], [bw, s * 0.7, 0, -s * 0.62]]) {
        const b = kit.m(caixa(w, 0.012, dd, 0.003), preto, 2);
        b.position.set(px, 0, pz);
        gr.add(b);
      }
      gr.position.set(x, 0.85, z);
      this.g.add(gr);
    }
    // painel de botões na frente (acima do forno)
    const painel = kit.m(caixa(0.54, 0.09, 0.012, 0.004), branco, 2);
    painel.position.set(0, 0.745, 0.282);
    this.g.add(painel);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group();
      const saia = kit.m(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 32), cromo, 1.5);
      saia.rotation.x = Math.PI / 2;
      const corpoB = kit.m(new THREE.CylinderGeometry(0.023, 0.025, 0.03, 32), preto, 2);
      corpoB.rotation.x = Math.PI / 2;
      corpoB.position.z = 0.016;
      const aleta = kit.m(caixa(0.044, 0.011, 0.016, 0.004), preto, 2);
      aleta.position.z = 0.036;
      const marca = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.002), kit.mat({ basico: true, color: 0xff6b2c }));
      marca.position.set(0.012, 0, 0.045);
      b.add(saia, corpoB, aleta, marca);
      b.position.set(-0.18 + i * 0.12, 0.745, 0.29);
      this.botoes.push(b);
      this.g.add(b);
      // marcação de chama no painel (traços em volta do botão)
      for (let k = 0; k < 5; k++) {
        const a = Math.PI / 2 + (k - 2) * 0.5;
        const tr = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.008, 0.001), kit.mat({ basico: true, color: d === "B" ? 0x3a3a44 : 0x55555a }));
        tr.position.set(-0.18 + i * 0.12 + Math.cos(a) * 0.038, 0.745 + Math.sin(a) * 0.038, 0.289);
        tr.rotation.z = a - Math.PI / 2;
        this.g.add(tr);
      }
    }
    // porta do forno do fogão
    const porta = kit.m(caixa(0.48, 0.5, 0.014, 0.008), branco, 2);
    porta.position.set(0, 0.38, 0.284);
    const visor = kit.m(caixa(0.36, 0.2, 0.004, 0.004), kit.mat({ color: 0x14161a, rough: 0.08, metal: 0.2, clear: 1 }), 1.5);
    visor.position.set(0, 0.36, 0.292);
    const puxador = kit.m(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 12), cromo, 2);
    puxador.rotation.z = Math.PI / 2;
    puxador.position.set(0, 0.6, 0.31);
    this.g.add(porta, visor, puxador);
    for (const sx of [-0.2, 0.2]) {
      const sup = kit.m(new THREE.BoxGeometry(0.012, 0.012, 0.03), cromo, 1.5);
      sup.position.set(sx, 0.6, 0.297);
      this.g.add(sup);
    }
    for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) {
      const pe = kit.m(new THREE.CylinderGeometry(0.018, 0.02, 0.025, 12), preto, 1.5);
      pe.position.set(x, 0.012, z);
      this.g.add(pe);
    }
  }
  /** gira o botão i (rad) */
  gira(i: number, a: number) {
    this.botoes[i].rotation.z = -a;
  }
}

// ------------------------------------------------------------------------------------------------ botijão + mangueira
export class Botijao {
  g = new THREE.Group();
  mangueira: THREE.Mesh;
  matM: THREE.Material;
  bico = new THREE.Vector3(0.0, 0.53, 0.02);
  constructor(public kit: Kit) {
    const d = kit.dir;
    const azul = kit.mat({ color: d === "B" ? 0x3f7fd0 : d === "A" ? 0x3d6fae : 0x34619a, rough: d === "C" ? 0.45 : 0.4, clear: d === "C" ? 0.3 : undefined, metal: d === "C" ? 0.25 : 0 });
    const cinza = kit.mat({ color: d === "B" ? 0x9ba6b0 : 0x6d7680, rough: 0.5, metal: d === "B" ? 0 : 0.5 });
    const perfil = [[0.001, 0.045], [0.12, 0.046], [0.165, 0.07], [0.178, 0.11], [0.18, 0.2], [0.18, 0.35], [0.172, 0.4], [0.14, 0.44], [0.08, 0.465], [0.001, 0.47]].map(([r, y]) => new THREE.Vector2(r, y));
    const corpo = kit.m(new THREE.LatheGeometry(perfil, 48), azul);
    const pe = kit.m(new THREE.CylinderGeometry(0.15, 0.155, 0.05, 40, 1, true), cinza);
    pe.position.y = 0.025;
    (pe.material as THREE.Material).side = THREE.DoubleSide;
    const alca = kit.m(new THREE.CylinderGeometry(0.105, 0.11, 0.09, 40, 1, true), cinza);
    alca.position.y = 0.5;
    const aro = kit.m(new THREE.TorusGeometry(0.107, 0.008, 8, 40), cinza);
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.545;
    const valv = kit.m(new THREE.CylinderGeometry(0.016, 0.018, 0.04, 16), kit.mat({ color: 0xc9a248, metal: d === "B" ? 0 : 0.9, rough: 0.3 }), 1.5);
    valv.position.y = 0.49;
    const reg = kit.m(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 20), kit.mat({ color: d === "B" ? 0xe0e4e8 : 0xbfc4c8, metal: d === "B" ? 0 : 0.5, rough: 0.35 }), 2);
    reg.position.y = 0.525;
    this.g.add(corpo, pe, alca, aro, valv, reg);
    this.matM = kit.mat({ map: texMangueira(), color: 0xffffff, rough: 0.35, clear: d === "C" ? 0.5 : undefined });
    this.mangueira = kit.m(new THREE.BufferGeometry(), this.matM, 2);
    this.g.add(this.mangueira);
  }
  /** ponta solta: 0 = ligada no fogão (alvo local), 1 = caída no chão */
  mangueiraAte(alvoLocal: THREE.Vector3, solta: number) {
    const k = c01(solta);
    const chao = new THREE.Vector3(alvoLocal.x * 0.55, 0.02, alvoLocal.z + 0.2);
    const fim = alvoLocal.clone().lerp(chao, k * k);
    const meio = this.bico.clone().lerp(fim, 0.5);
    meio.y = Math.min(this.bico.y, fim.y) - 0.18 - k * 0.1;
    const cv = new THREE.CatmullRomCurve3([this.bico.clone(), this.bico.clone().add(new THREE.Vector3(0.05, -0.02, 0.02)), meio, fim]);
    this.mangueira.geometry.dispose();
    this.mangueira.geometry = new THREE.TubeGeometry(cv, 40, 0.012, 12);
    for (const c of this.mangueira.children) (c as THREE.Mesh).geometry = this.mangueira.geometry;
  }
}

// ------------------------------------------------------------------------------------------------ mesa do quintal
export class Mesa {
  g = new THREE.Group();
  constructor(kit: Kit, w = 1.3, dd = 0.8, h = 0.76) {
    const d = kit.dir;
    const mt = texMadeira(d, d === "B" ? "#a8673a" : "#a5754a", "#6b4527", 5, 13);
    mt.repeat.set(1, 1);
    const mat = kit.mat({ map: mt, rough: d === "C" ? 0.75 : 0.6, clear: d === "C" ? 0 : undefined });
    const matP = kit.mat({ color: d === "B" ? 0x8e532c : 0x8a5e3a, rough: 0.75 });
    const tampo = kit.m(caixa(w, 0.045, dd, 0.008), mat);
    tampo.position.y = h - 0.0225;
    this.g.add(tampo);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = kit.m(caixa(0.06, h - 0.045, 0.06, 0.006), matP);
      p.position.set(x * (w / 2 - 0.07), (h - 0.045) / 2, z * (dd / 2 - 0.07));
      this.g.add(p);
    }
    for (const z of [-1, 1]) {
      const a = kit.m(caixa(w - 0.16, 0.08, 0.025, 0.004), matP);
      a.position.set(0, h - 0.085, z * (dd / 2 - 0.07));
      this.g.add(a);
    }
  }
}

// ------------------------------------------------------------------------------------------------ casa, chão, mandacaru
export class Quintal {
  g = new THREE.Group();
  constructor(kit: Kit) {
    const d = kit.dir;
    // chão
    if (d === "A") {
      // tábua com corte lateral (camadas de terra) sobre uma mesa de madeira
      const topo = texTerra(d);
      topo.repeat.set(2.5, 2.2);
      const corte = corteTerra();
      const mT = kit.mat({ map: topo, rough: 0.85, clear: 0.1 });
      const mC = kit.mat({ map: corte, rough: 0.8, clear: 0.15 });
      const base = kit.m(caixa(3.8, 0.24, 3.3, 0.02, 3), [mC, mC, mT, mC, mC, mC]);
      base.position.set(0, -0.12, -0.3);
      this.g.add(base);
      const mesaM = texMadeira("A", "#8a5a36", "#5a361e", 6, 17);
      mesaM.repeat.set(3, 3);
      const mesa = kit.m(new THREE.PlaneGeometry(30, 30), kit.mat({ map: mesaM, rough: 0.55, clear: 0.3, semContorno: true }));
      mesa.rotation.x = -Math.PI / 2;
      mesa.position.y = -0.24;
      this.g.add(mesa);
    } else {
      const tt = texTerra(d);
      tt.repeat.set(d === "B" ? 3 : 7, d === "B" ? 3 : 7);
      const chao = kit.m(new THREE.PlaneGeometry(24, 24), kit.mat({ map: tt, rough: 0.95, semContorno: true }));
      chao.rotation.x = -Math.PI / 2;
      this.g.add(chao);
    }
    // casa: parede caiada com barrado, porta, janela e beiral de telha
    const zP = -1.75, L = 3.6, H = 2.3;
    const reb = texReboco(d);
    reb.repeat.set(3, 2);
    const parede = kit.m(caixa(L, H, 0.18, 0.01), kit.mat({ map: reb, rough: 0.9, semContorno: false }));
    parede.position.set(0, H / 2, zP - 0.09);
    this.g.add(parede);
    const barrado = kit.m(caixa(L + 0.004, 0.62, 0.012, 0.003), kit.mat({ color: d === "B" ? 0x2aa3b3 : 0x2b8798, rough: 0.7 }), 2);
    barrado.position.set(0, 0.31, zP + 0.006);
    this.g.add(barrado);
    const azul = kit.mat({ color: d === "B" ? 0x2f6fd0 : 0x2c5d9e, rough: 0.6 });
    const porta = kit.m(caixa(0.82, 1.95, 0.04, 0.006), azul, 2.5);
    porta.position.set(-0.95, 0.975, zP + 0.02);
    this.g.add(porta);
    for (let i = 1; i < 5; i++) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1.9, 0.006), kit.mat({ basico: true, color: d === "B" ? 0x1d4a90 : 0x1d3e6a }));
      fr.position.set(-0.95 - 0.41 + i * 0.164, 0.975, zP + 0.042);
      this.g.add(fr);
    }
    const mold = kit.mat({ color: d === "B" ? 0xf6efe0 : 0xd9cdb6, rough: 0.8 });
    const jan = kit.m(caixa(0.92, 0.92, 0.05, 0.006), mold, 2.5);
    jan.position.set(0.95, 1.45, zP + 0.02);
    this.g.add(jan);
    const amarelo = kit.mat({ color: d === "B" ? 0xffc93a : 0xd9a43a, rough: 0.6 });
    for (const s of [-1, 1]) {
      const fol = kit.m(caixa(0.4, 0.82, 0.03, 0.005), amarelo, 2.5);
      fol.position.set(0.95 + s * 0.21, 1.45, zP + 0.06);
      this.g.add(fol);
    }
    // beiral de telha colonial (capa e canal)
    const telha = kit.mat({ color: d === "B" ? 0xd8643a : 0xb3552f, rough: 0.75 });
    const geoT = new THREE.CylinderGeometry(0.075, 0.068, 0.5, 14, 1, true, 0, Math.PI);
    geoT.rotateX(Math.PI / 2);
    const n = Math.floor(L / 0.15);
    for (const capa of [0, 1]) {
      const im = new THREE.InstancedMesh(geoT, telha, n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + 0.075 + i * 0.15 + (capa ? 0.075 : 0);
        q.setFromEuler(new THREE.Euler(0.42, 0, capa ? 0 : Math.PI));
        m4.compose(new THREE.Vector3(x, H + 0.08 + (capa ? 0.03 : 0), zP + 0.12), q, new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(i, m4);
      }
      im.castShadow = im.receiveShadow = true;
      (im.material as THREE.Material).side = THREE.DoubleSide;
      kit.contorno(im as unknown as THREE.Mesh, 2);
      this.g.add(im);
    }
    // mandacaru
    const verde = kit.mat({ color: d === "B" ? 0x3faa5a : 0x3e7a4c, rough: 0.7 });
    const coluna = (h: number, r: number) => {
      const geo = new THREE.CylinderGeometry(r, r, h, 20, 12);
      const p = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
        const k = 1 + 0.12 * Math.cos(a * 8);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
      geo.computeVertexNormals();
      const g = new THREE.Group();
      const me = kit.m(geo, verde, 2);
      me.position.y = h / 2;
      const topo = kit.m(new THREE.SphereGeometry(r * 1.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), verde, 2);
      topo.position.y = h;
      g.add(me, topo);
      return g;
    };
    const mand = new THREE.Group();
    mand.add(coluna(1.7, 0.09));
    const braco = (s: number, y: number, h: number) => {
      const lig = kit.m(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 16), verde, 2);
      lig.rotation.z = Math.PI / 2;
      lig.position.set(s * 0.12, y, 0);
      const c = coluna(h, 0.065);
      c.position.set(s * 0.24, y - 0.03, 0);
      mand.add(lig, c);
    };
    braco(1, 0.75, 0.6);
    braco(-1, 1.0, 0.45);
    mand.position.set(1.45, 0, -1.25);
    this.g.add(mand);
    // vaso de barro com planta perto da porta
    const barro = kit.mat({ color: d === "B" ? 0xd4703e : 0xa85a34, rough: 0.85 });
    const vaso = kit.m(new THREE.LatheGeometry([[0.001, 0], [0.12, 0.0], [0.16, 0.12], [0.17, 0.26], [0.15, 0.3], [0.001, 0.29]].map(([r, y]) => new THREE.Vector2(r, y)), 28), barro, 2.5);
    vaso.position.set(-0.25, 0, -1.5);
    this.g.add(vaso);
  }
}

/** corte da tábua da maquete: camadas de terra, cascalho e argila */
function corteTerra() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const camadas: [number, string][] = [[0, "#8a5a36"], [0.18, "#a86a3e"], [0.45, "#7a4a2c"], [0.7, "#5e3a24"], [1, "#5e3a24"]];
  for (let i = 0; i < camadas.length - 1; i++) {
    g.fillStyle = camadas[i][1];
    g.fillRect(0, camadas[i][0] * 256, 256, (camadas[i + 1][0] - camadas[i][0]) * 256 + 1);
  }
  const R = rng(7);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(${150 + R.r() * 60},${120 + R.r() * 40},${90 + R.r() * 30},0.6)`;
    g.beginPath();
    g.arc(R.r() * 256, 0.2 * 256 + R.r() * 180, 1 + R.r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ------------------------------------------------------------------------------------------------ feixe de sol + poeira
export class Feixe {
  g = new THREE.Group();
  m: THREE.ShaderMaterial;
  pts: THREE.Points;
  base: Float32Array;
  constructor(kit: Kit, public alvo: THREE.Vector3, public dir: THREE.Vector3, raio = 0.32, comp = 5, ganho = 1) {
    const d = kit.dir;
    this.m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
      uniforms: { ganho: { value: ganho }, op: { value: 0 }, prog: { value: 1 }, t: { value: 0 }, cor: { value: new THREE.Color(d === "B" ? 0xfff2b0 : 0xffe2a8) }, toon: { value: d === "B" ? 1 : 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform float op, prog, t, toon, ganho; uniform vec3 cor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        float h(float x){ return fract(sin(x*91.7)*43758.5); }
        void main(){
          float borda = abs(dot(vN, vV));               // 1 no meio do cone visto, 0 na silhueta
          float corpo = toon > 0.5 ? step(0.35, borda)*0.55 + step(0.75, borda)*0.25 : pow(borda, 1.6);
          float riscos = 0.75 + 0.25*sin(vUv.x*60.0 + sin(vUv.x*13.0)*3.0 + t*0.3);
          float y = 1.0 - vUv.y;                        // 0 no alto, 1 no alvo
          float vis = smoothstep(prog, prog - 0.08, y);  // cresce do céu até o alvo
          float pe = smoothstep(1.0, 0.85, y) * 0.6 + 0.4;
          gl_FragColor = vec4(cor * corpo * riscos * vis * pe * op * (toon > 0.5 ? 0.55 : 0.75) * ganho, 1.0);
        }`,
    });
    const geo = new THREE.CylinderGeometry(raio * 1.15, raio, comp, 40, 1, true);
    geo.translate(0, comp / 2, 0);
    const me = new THREE.Mesh(geo, this.m);
    me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    me.position.copy(alvo);
    me.userData.semProf = true;
    me.renderOrder = 6;
    me.frustumCulled = false;
    this.g.add(me);
    // poeira em suspensão dentro do feixe
    const R = rng(33);
    const n = d === "C" ? 900 : 380;
    this.base = new Float32Array(n * 3);
    const eixo = dir.clone().normalize();
    const u = new THREE.Vector3(1, 0, 0).cross(eixo).normalize(), v = eixo.clone().cross(u).normalize();
    for (let i = 0; i < n; i++) {
      const s = R.r() * comp * 0.5, a = R.r() * Math.PI * 2, r = Math.sqrt(R.r()) * raio;
      const p = alvo.clone().addScaledVector(eixo, s).addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r);
      this.base.set([p.x, p.y, p.z], i * 3);
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(this.base.slice(), 3));
    this.pts = new THREE.Points(gp, new THREE.PointsMaterial({ map: pontoSuave(), color: new THREE.Color(0xfff0c8).multiplyScalar(d === "B" ? 1 : 1.6), size: d === "C" ? 0.006 : 0.012, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.pts.frustumCulled = false;
    this.g.add(this.pts);
  }
  aplica(op: number, prog: number, t: number) {
    this.g.visible = op > 0.001;
    this.m.uniforms.op.value = op;
    this.m.uniforms.prog.value = prog;
    this.m.uniforms.t.value = t;
    (this.pts.material as THREE.PointsMaterial).opacity = op * c01(prog * 1.2 - 0.2);
    const p = this.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const f = i * 0.37;
      p.setXYZ(i, this.base[i * 3] + Math.sin(t * 0.3 + f) * 0.02, this.base[i * 3 + 1] + Math.sin(t * 0.21 + f * 1.3) * 0.015, this.base[i * 3 + 2] + Math.cos(t * 0.25 + f) * 0.02);
    }
    p.needsUpdate = true;
  }
}

let _ponto: THREE.Texture | null = null;
export function pontoSuave() {
  if (_ponto) return _ponto;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _ponto = new THREE.CanvasTexture(c);
  return _ponto;
}

/** nuvem de poeira que levanta quando algo cai (k = 0..1 desde o impacto) */
export class Poeira {
  g = new THREE.Group();
  pts: THREE.Points;
  dados: { v: THREE.Vector3; s: number }[] = [];
  constructor(kit: Kit, public centro: THREE.Vector3, larg = 0.9, n = 160) {
    const R = rng(55);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R.r() * Math.PI * 2;
      this.dados.push({ v: new THREE.Vector3(Math.cos(a) * R.ab(0.3, 1) * larg, R.ab(0.05, 0.35), Math.sin(a) * R.ab(0.3, 1) * larg * 0.6), s: R.r() });
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.pts = new THREE.Points(gp, new THREE.PointsMaterial({ map: pontoSuave(), color: kit.dir === "B" ? 0xf3dcc0 : 0xd8b896, size: kit.dir === "C" ? 0.05 : 0.06, transparent: true, opacity: 0, depthWrite: false }));
    this.pts.frustumCulled = false;
    this.g.add(this.pts);
  }
  aplica(k: number) {
    this.g.visible = k > 0 && k < 1;
    const p = this.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const e = 1 - Math.pow(1 - c01(k), 3);
    this.dados.forEach((d, i) => {
      p.setXYZ(i, this.centro.x + d.v.x * e, this.centro.y + d.v.y * e * (0.6 + d.s), this.centro.z + d.v.z * e);
    });
    p.needsUpdate = true;
    (this.pts.material as THREE.PointsMaterial).opacity = 0.55 * Math.sin(Math.PI * c01(k)) * (1 - ease(k) * 0.3);
  }
}
