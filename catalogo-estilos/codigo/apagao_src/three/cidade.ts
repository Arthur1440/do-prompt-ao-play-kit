// O quarteirão brasileiro (tabuleiro 13 x 13): cruzamento, prédios com janelas, mercado, açougue, posto,
// boca de metrô, semáforos, postes, carros, pessoas em silhueta, torre de celular e o túnel do metrô em corte na frente.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Kit, Janela, Dir } from "./kit";
import { rng } from "./rng";
import { texFachada, texPlaca, texRua, texTerra, texMadeira, texCone, cv, tx } from "./tex";

export type EstadoCidade = {
  luz: number; // janelas, postes e letreiros (0 apagado .. 1 aceso)
  frente?: number; // onda de apagão: x da frente (prédios com x > frente apagam); undefined = sem onda
  religa?: number; // 0..1 volta da luz prédio a prédio (72 h)
  semaforo: number; // 0 morto .. 1 funcionando
  tCarros: number; // tempo para os carros andando
  travado: number; // 0 trânsito andando, 1 travado no cruzamento
  celulares: number; // fração de celulares acesos na multidão (0..1)
  multidao: number; // 0 calçadas normais, 1 multidão na rua (hora 4)
  trem: number; // 0 luz normal, 1 emergência
  torre: number; // 1 torre com sinal (luz piscando), 0 morta
  fila?: number; // 0..1 carros vão para a fila do posto (48 h)
  filaMerc?: number; // >0,5 mostra o povo na porta do mercado (8 h)
  t: number;
};

// fila do posto (48 h): 2 carros nas bombas, o resto enfileirado na rua até virar a esquina
const FILA: ([number, number, number] | undefined)[] = [
  [2.95, 2.45, 0], [4.15, 2.45, 0], [1.65, 0.55, 0.12], [0.85, 0.5, 0], [0.05, 0.52, 0], [-0.75, 0.5, -0.05], [-1.55, 0.53, 0], [-2.35, 0.5, 0.04], [-3.15, 0.52, 0], [-3.95, 0.5, 0],
];

type Predio = { mesh: THREE.Mesh; jan: Janela; x: number; z: number; ordem: number };

export class Cidade {
  g = new THREE.Group();
  predios: Predio[] = [];
  luzesRua: { mat: THREE.MeshBasicMaterial; base: THREE.Color }[] = [];
  pontos: THREE.PointLight[] = [];
  sem: { r: THREE.MeshBasicMaterial; y: THREE.MeshBasicMaterial; gr: THREE.MeshBasicMaterial; eixo: number }[] = [];
  carros: { g: THREE.Group; lane: number; ofs: number; jam: [number, number, number]; cones: THREE.Mesh[] }[] = [];
  pessoasCalcada: THREE.Group = new THREE.Group();
  multidao: THREE.Group = new THREE.Group();
  filaMerc: THREE.Group = new THREE.Group();
  frentista!: THREE.Mesh;
  telas: THREE.MeshBasicMaterial[] = [];
  trem!: { g: THREE.Group; janelas: THREE.MeshStandardMaterial; luz: THREE.PointLight; emerg: THREE.MeshBasicMaterial[] };
  torre!: { beacon: THREE.MeshBasicMaterial; antenas: THREE.Group };
  placas: THREE.MeshBasicMaterial[] = [];
  externos = new THREE.Group();
  mesa?: THREE.Mesh;
  R = rng(21);

  constructor(public kit: Kit, public dir: Dir) {
    this.montaBase();
    this.montaPredios();
    this.montaLojas();
    this.montaRua();
    this.montaCarros();
    this.montaPessoas();
    this.montaTorre();
    this.montaTunel();
    if (dir !== "A") this.montaExternos();
    this.g.add(this.externos);
  }

  cor(c: string) {
    return c;
  }

  montaBase() {
    const k = this.kit;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), k.mat({ map: texRua(this.dir), rough: 0.85, semContorno: true }));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    this.g.add(chao);
    // lotes (calçada elevada)
    const corCalc = this.dir === "B" ? 0xb4adc4 : this.dir === "C" ? 0x2f3552 : 0x96938e;
    const mCalc = k.mat({ color: corCalc, rough: 0.8, semContorno: true });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const lote = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.07, 5.35), mCalc);
        lote.position.set(sx * 3.825, 0.035, sz * 3.825);
        lote.receiveShadow = lote.castShadow = true;
        this.g.add(lote);
      }
    // corpo do tabuleiro com o túnel aberto na frente (z 4,4..6,5 ; y -1,15..-0,35)
    const terra = texTerra();
    const mTerra = k.mat({ map: terra, rough: 0.95, semContorno: this.dir !== "B" });
    const mBorda = k.mat({ color: this.dir === "A" ? 0x2a2420 : 0x161a2c, rough: 0.7, semContorno: true });
    const caixa = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material) => {
      const b = k.m(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m, 2);
      b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      this.g.add(b);
      return b;
    };
    terra.repeat.set(3, 1);
    caixa(-6.5, 6.5, -1.6, -0.001, -6.5, 4.4, mTerra);
    caixa(-6.5, 6.5, -1.6, -1.15, 4.4, 6.5, mTerra);
    caixa(-6.5, 6.5, -0.35, -0.001, 4.4, 6.5, mTerra);
    // borda escura (moldura da maquete)
    caixa(-6.56, 6.56, -1.72, -1.6, -6.56, 6.56, mBorda);
    // forro de concreto do túnel
    const mConc = k.mat({ color: this.dir === "C" ? 0x2a2f45 : 0x8e8a84, rough: 0.9, semContorno: true });
    const forro = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.8), mConc);
    forro.position.set(0, -0.75, 4.41);
    forro.receiveShadow = true;
    this.g.add(forro);
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.1), mConc);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, -1.149, 5.45);
    piso.receiveShadow = true;
    this.g.add(piso);
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.1), mConc);
    teto.rotation.x = Math.PI / 2;
    teto.position.set(0, -0.351, 5.45);
    this.g.add(teto);
    // trilhos
    const mTr = k.mat({ color: 0x55575c, metal: 0.8, rough: 0.35, semContorno: true });
    for (const z of [5.12, 5.48]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(13, 0.03, 0.03), mTr);
      tr.position.set(0, -1.13, z);
      this.g.add(tr);
    }
    if (this.dir === "A") {
      const mad = texMadeira();
      mad.repeat.set(4, 4);
      this.mesa = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), k.mat({ map: mad, rough: 0.55, clear: 0.3, semContorno: true }));
      this.mesa.rotation.x = -Math.PI / 2;
      this.mesa.position.y = -1.72;
      this.mesa.receiveShadow = true;
      this.g.add(this.mesa);
    }
  }

  predio(x: number, z: number, w: number, d: number, h: number, parede: string, seed: number, ordem: number, pai: THREE.Group = this.g) {
    const k = this.kit;
    const andares = Math.max(2, Math.round(h / 0.42));
    const cols = Math.max(2, Math.round(w / 0.36));
    const f = texFachada(cols, andares, parede, seed);
    const colsD = Math.max(2, Math.round(d / 0.36));
    const fd = colsD === cols ? f : texFachada(colsD, andares, parede, seed + 50);
    const mx = k.matJanelas(f.map, f.em);
    const mz = colsD === cols ? mx : k.matJanelas(fd.map, fd.em);
    const teto = k.mat({ color: new THREE.Color(parede).multiplyScalar(0.7), rough: 0.8 });
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, [mz, mz, teto, teto, mx, mx]);
    mesh.position.set(x, h / 2 + 0.07, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this.kit.contorno(mesh, 3);
    // platibanda
    const plat = k.m(new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06), teto, 2);
    plat.position.set(x, h + 0.07 + 0.04, z);
    pai.add(mesh, plat);
    const p: Predio = { mesh, jan: mx.userData.janela, x, z, ordem };
    this.predios.push(p);
    if (mz !== mx) this.predios.push({ ...p, jan: mz.userData.janela });
    return mesh;
  }

  montaPredios() {
    const L: [number, number, number, number, number, string][] = [
      [2.6, -2.7, 2.1, 2.1, 5.4, "#d9c7a7"],
      [5.1, -2.5, 1.7, 1.9, 3.3, "#c98b6b"],
      [3.4, -5.2, 2.3, 1.7, 4.1, "#8fb3c4"],
      [5.6, -5.3, 1.3, 1.6, 2.6, "#e3a9a0"],
      [-2.6, -2.7, 2.1, 2.0, 4.5, "#a9c4a0"],
      [-5.0, -2.5, 1.7, 1.9, 6.2, "#c7c3d6"],
      [-3.3, -5.3, 2.5, 1.7, 2.9, "#e0b872"],
      [-5.7, -5.4, 1.2, 1.5, 2.1, "#b77f6a"],
      [-3.4, 5.4, 2.8, 1.5, 2.6, "#f0d9b5"],
      [-5.75, 5.3, 1.2, 1.6, 3.5, "#9fb7d8"],
      [3.3, 5.5, 2.5, 1.3, 2.2, "#d7a3b8"],
      [5.75, 2.2, 1.2, 1.6, 2.9, "#c4d4a8"],
    ];
    L.forEach(([x, z, w, d, h, c], i) => this.predio(x, z, w, d, h, c, 100 + i * 7, Math.hypot(x, z) + this.R.ab(0, 2)));
  }

  montaLojas() {
    const k = this.kit;
    const placa = (txt: string, fundo: string, cor: string, w: number, h: number) => {
      const m = new THREE.MeshBasicMaterial({ map: texPlaca(txt, fundo, cor), toneMapped: false });
      m.userData.semContorno = true;
      this.placas.push(m);
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    };
    // MERCADO (frente para a rua x, em z = 1,05)
    const mMerc = k.mat({ color: 0xe9e2d0, rough: 0.7 });
    const merc = k.m(new THREE.BoxGeometry(3.3, 1.25, 2.2), mMerc);
    merc.position.set(-3.1, 0.7, 2.4);
    this.g.add(merc);
    // vitrine (emissiva fria) + toldo listrado
    const vit = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, toneMapped: false });
    this.luzesRua.push({ mat: vit, base: new THREE.Color(0xcfe6ff).multiplyScalar(1.4) });
    const vitrine = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), vit);
    vitrine.position.set(-3.1, 0.48, 1.29);
    vitrine.rotation.y = Math.PI;
    this.g.add(vitrine);
    const [tc, tg] = cv(256, 32);
    for (let i = 0; i < 16; i++) {
      tg.fillStyle = i % 2 ? "#f2efe6" : "#2f9e6e";
      tg.fillRect(i * 16, 0, 16, 32);
    }
    const toldo = k.m(new THREE.BoxGeometry(3.3, 0.04, 0.55), k.mat({ map: tx(tc), rough: 0.7 }), 2);
    toldo.position.set(-3.1, 0.98, 1.1);
    toldo.rotation.x = -0.35;
    this.g.add(toldo);
    const pm = placa("MERCADO", "#2f9e6e", "#ffffff", 2.0, 0.42);
    pm.position.set(-3.1, 1.15, 1.285);
    pm.rotation.y = Math.PI;
    this.g.add(pm);
    // AÇOUGUE
    const ac = k.m(new THREE.BoxGeometry(1.5, 1.1, 1.6), k.mat({ color: 0xf3f0ea, rough: 0.7 }));
    ac.position.set(-5.6, 0.62, 2.2);
    this.g.add(ac);
    const pa = placa("AÇOUGUE", "#c0392b", "#ffffff", 1.3, 0.3);
    pa.position.set(-5.6, 0.95, 1.395);
    pa.rotation.y = Math.PI;
    this.g.add(pa);
    // POSTO: cobertura em 4 pilares, 2 bombas, lojinha
    const mPil = k.mat({ color: 0xdcdcdc, rough: 0.5 });
    for (const [x, z] of [[2.2, 2.0], [5.0, 2.0], [2.2, 4.0], [5.0, 4.0]]) {
      const p = k.m(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12), mPil, 2);
      p.position.set(x, 0.72, z);
      this.g.add(p);
    }
    const cob = k.m(new RoundedBoxGeometry(3.3, 0.18, 2.5, 2, 0.04), k.mat({ color: this.dir === "B" ? 0xa9adbd : 0xe6e6e6, rough: 0.5 }));
    cob.position.set(3.6, 1.44, 3.0);
    this.g.add(cob);
    const faixa = new THREE.MeshBasicMaterial({ color: 0xff6b2c, toneMapped: false });
    this.luzesRua.push({ mat: faixa, base: new THREE.Color(0xff6b2c).multiplyScalar(1.6) });
    const fx = new THREE.Mesh(new THREE.BoxGeometry(3.32, 0.07, 2.52), faixa);
    fx.position.set(3.6, 1.44, 3.0);
    this.g.add(fx);
    const pp = placa("POSTO", "#ff6b2c", "#ffffff", 1.1, 0.3);
    pp.position.set(3.6, 1.44, 1.74);
    pp.rotation.y = Math.PI;
    this.g.add(pp);
    // lâmpadas sob a cobertura
    const lampP = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.luzesRua.push({ mat: lampP, base: new THREE.Color(0xfff4e0).multiplyScalar(2.2) });
    for (const x of [2.8, 4.4]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.5), lampP);
      l.position.set(x, 1.34, 3.0);
      this.g.add(l);
    }
    const pl = new THREE.PointLight(0xfff0d8, 3.5, 4, 1.6);
    pl.position.set(3.6, 1.2, 3.0);
    this.pontos.push(pl);
    this.g.add(pl);
    const mBomba = k.mat({ color: 0xe8e8e8, rough: 0.45 });
    const visor = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, toneMapped: false });
    this.luzesRua.push({ mat: visor, base: new THREE.Color(0x9fe8ff).multiplyScalar(1.5) });
    for (const x of [3.0, 4.2]) {
      const b = k.m(new RoundedBoxGeometry(0.3, 0.62, 0.22, 2, 0.04), mBomba);
      b.position.set(x, 0.38, 3.0);
      this.g.add(b);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), visor);
      v.position.set(x, 0.5, 2.885);
      v.rotation.y = Math.PI;
      this.g.add(v);
      const tarja = k.m(new THREE.BoxGeometry(0.31, 0.08, 0.23), k.mat({ color: 0xff6b2c }), 1.5);
      tarja.position.set(x, 0.18, 3.0);
      this.g.add(tarja);
    }
    const loja = k.m(new THREE.BoxGeometry(1.3, 0.95, 1.2), k.mat({ color: 0xf2e6d0, rough: 0.7 }));
    loja.position.set(5.6, 0.55, 4.6);
    this.g.add(loja);
    // BOCA DE METRÔ na calçada (escada que desce + guarda-corpo + totem)
    const mGuarda = k.mat({ color: 0x3a4a6a, metal: 0.4, rough: 0.4 });
    const buraco = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.1), new THREE.MeshBasicMaterial({ color: 0x050608 }));
    buraco.rotation.x = -Math.PI / 2;
    buraco.position.set(-1.75, 0.072, 2.6);
    this.g.add(buraco);
    for (let i = 0; i < 6; i++) {
      const d = k.m(new THREE.BoxGeometry(0.6, 0.02, 0.12), k.mat({ color: 0x777 }), 1);
      d.position.set(-1.75, 0.06 - i * 0.045, 2.15 + i * 0.16);
      this.g.add(d);
    }
    for (const sx of [-1, 1]) {
      const gc = k.m(new THREE.BoxGeometry(0.03, 0.3, 1.14), mGuarda, 1.5);
      gc.position.set(-1.75 + sx * 0.33, 0.22, 2.6);
      this.g.add(gc);
    }
    const tot = k.m(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), mGuarda, 1.5);
    tot.position.set(-1.4, 0.5, 2.05);
    this.g.add(tot);
    const pmet = placa("METRÔ", "#1f4fa8", "#ffffff", 0.62, 0.2);
    pmet.position.set(-1.4, 0.98, 2.03);
    pmet.rotation.y = Math.PI;
    const pmet2 = pmet.clone();
    pmet2.rotation.y = 0;
    pmet2.position.z = 2.07;
    this.g.add(pmet, pmet2);
  }

  montaRua() {
    const k = this.kit;
    const mPoste = k.mat({ color: 0x4a4e58, metal: 0.5, rough: 0.4 });
    const mCabeca = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
    this.luzesRua.push({ mat: mCabeca, base: new THREE.Color(0xffc477).multiplyScalar(2.6) });
    const halo = new THREE.MeshBasicMaterial({
      map: texCone(), color: 0xffb347, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.luzesRua.push({ mat: halo, base: new THREE.Color(0xffb347) });
    const pos: [number, number, number][] = [
      [1.35, 3.6, 1], [-1.35, -3.6, -1], [3.6, -1.35, 1], [-3.6, 1.35, -1],
      [1.35, -5.6, 1], [-1.35, 5.6, -1], [5.6, 1.35, 1], [-5.6, -1.35, -1],
    ];
    pos.forEach(([x, z], i) => {
      const p = k.m(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 8), mPoste, 1.5);
      p.position.set(x, 0.87, z);
      const braco = k.m(new THREE.BoxGeometry(0.4, 0.03, 0.03), mPoste, 1.5);
      const dx = Math.abs(x) < 2 ? -Math.sign(x) : 0, dz = Math.abs(z) < 2 ? -Math.sign(z) : 0;
      braco.position.set(x + dx * 0.18, 1.66, z + dz * 0.18);
      braco.rotation.y = dz !== 0 ? Math.PI / 2 : 0;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.09), mCabeca);
      cab.position.set(x + dx * 0.36, 1.64, z + dz * 0.36);
      if (dz !== 0) cab.rotation.y = Math.PI / 2;
      // cone de luz até o chão
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 20, 1, true), halo);
      cone.position.set(x + dx * 0.36, 0.84, z + dz * 0.36);
      this.g.add(p, braco, cab, cone);
      if (i < 4) {
        const l = new THREE.PointLight(0xffb066, 2.2, 3.2, 1.4);
        l.position.set(x + dx * 0.36, 1.45, z + dz * 0.36);
        this.pontos.push(l);
        this.g.add(l);
      }
    });
    // semáforos nas 4 esquinas (eixo 0 controla a rua x, eixo 1 a rua z)
    const mCx = k.mat({ color: 0x23262e, rough: 0.5 });
    const cs: [number, number, number][] = [[1.25, 1.25, 0], [-1.25, -1.25, 0], [1.25, -1.25, 1], [-1.25, 1.25, 1]];
    for (const [x, z, eixo] of cs) {
      const r = new THREE.MeshBasicMaterial({ color: 0x220000, toneMapped: false });
      const y = new THREE.MeshBasicMaterial({ color: 0x221a00, toneMapped: false });
      const gr = new THREE.MeshBasicMaterial({ color: 0x002208, toneMapped: false });
      this.sem.push({ r, y, gr, eixo });
      const p = k.m(new THREE.CylinderGeometry(0.03, 0.03, 1.15, 8), mPoste, 1.5);
      p.position.set(x, 0.65, z);
      const cx = k.m(new RoundedBoxGeometry(0.14, 0.4, 0.14, 2, 0.03), mCx, 2);
      cx.position.set(x, 1.38, z);
      this.g.add(p, cx);
      [r, y, gr].forEach((m, i) => {
        for (const lado of [-1, 1]) {
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), m);
          if (eixo === 0) l.position.set(x + lado * 0.07, 1.5 - i * 0.12, z);
          else l.position.set(x, 1.5 - i * 0.12, z + lado * 0.07);
          this.g.add(l);
        }
      });
    }
  }

  carro(cor: number) {
    const k = this.kit;
    const g = new THREE.Group();
    const corpo = k.m(new RoundedBoxGeometry(0.66, 0.16, 0.32, 2, 0.05), k.mat({ color: cor, rough: 0.35, clear: 0.6 }), 2);
    corpo.position.y = 0.13;
    const cab = k.m(new RoundedBoxGeometry(0.36, 0.14, 0.28, 2, 0.05), k.mat({ color: 0x1c2234, rough: 0.2, clear: 0.8 }), 2);
    cab.position.set(-0.03, 0.26, 0);
    g.add(corpo, cab);
    const mRoda = k.mat({ color: 0x15161a, rough: 0.8 });
    for (const [x, z] of [[0.21, 0.15], [-0.21, 0.15], [0.21, -0.15], [-0.21, -0.15]]) {
      const r = k.m(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 14), mRoda, 1.5);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, 0.065, z);
      g.add(r);
    }
    const farol = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e0).multiplyScalar(3), toneMapped: false });
    const lanterna = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a20).multiplyScalar(2.2), toneMapped: false });
    for (const z of [-0.1, 0.1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.07), farol);
      f.position.set(0.335, 0.15, z);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.07), lanterna);
      l.position.set(-0.335, 0.15, z);
      g.add(f, l);
    }
    // cones dos faróis (só aparecem quando a cidade apaga)
    const cones: THREE.Mesh[] = [];
    const mc = new THREE.MeshBasicMaterial({ map: texCone(), color: 0xfff1d0, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 18, 1, true), mc);
    cone.rotation.z = Math.PI / 2;
    cone.position.set(0.335 + 0.75, 0.13, 0);
    cone.scale.set(1, 1, 0.55);
    g.add(cone);
    cones.push(cone);
    return { g, cones };
  }

  montaCarros() {
    const cores = [0xd8322b, 0xf2f2f0, 0xf5c518, 0x2c6fd1, 0xaab0b8, 0x2e8b57, 0xff6b2c, 0x23252b, 0xf2f2f0, 0x7a3fd1];
    // lane: 0 rua x sentido +x (z=-0,5) | 1 rua x sentido -x (z=0,5) | 2 rua z sentido +z (x=0,5) | 3 rua z sentido -z (x=-0,5)
    const jam: [number, number, number][] = [
      [-0.9, -0.5, 0.15], [0.25, -0.45, -0.35], [-2.1, -0.5, 0], [0.9, 0.5, Math.PI - 0.1], [2.0, 0.55, Math.PI],
      [0.5, 1.0, Math.PI / 2 + 0.3], [0.45, -1.9, Math.PI / 2], [-0.5, 0.9, -Math.PI / 2 - 0.5], [-0.5, 2.2, -Math.PI / 2], [-3.3, -0.5, 0],
    ];
    cores.forEach((c, i) => {
      const { g, cones } = this.carro(c);
      this.g.add(g);
      this.carros.push({ g, lane: i % 4, ofs: (i * 3.7) % 13, jam: jam[i], cones });
    });
  }

  pessoa(cor: number) {
    const corpo = new THREE.CapsuleGeometry(0.055, 0.14, 4, 10);
    corpo.translate(0, 0.13, 0);
    const cab = new THREE.SphereGeometry(0.045, 12, 10);
    cab.translate(0, 0.29, 0);
    const geo = mergeGeometries([corpo, cab]);
    return this.kit.m(geo, this.kit.mat({ color: cor, rough: 0.8 }), 1.5);
  }

  montaPessoas() {
    const cores = [0x2b2f3d, 0x3d2b2b, 0x24323a, 0x3a3a44, 0x30283a, 0x2a3a30];
    const R = rng(77);
    // calçadas
    for (let i = 0; i < 18; i++) {
      const p = this.pessoa(cores[i % cores.length]);
      const lado = R.pick([[1, 1], [1, -1], [-1, 1], [-1, -1]] as [number, number][]);
      const ao = R.r() < 0.5;
      p.position.set(ao ? lado[0] * R.ab(1.2, 1.4) : lado[0] * R.ab(1.4, 5.8), 0.07, ao ? lado[1] * R.ab(1.4, 5.8) : lado[1] * R.ab(1.2, 1.4));
      p.rotation.y = R.ab(0, 6.28);
      this.pessoasCalcada.add(p);
    }
    // multidão na rua (hora 4), cada um com o celular aceso na mão
    for (let i = 0; i < 34; i++) {
      const p = this.pessoa(cores[i % cores.length]);
      const a = R.ab(0, 6.28), r = Math.sqrt(R.r()) * 1.5;
      p.position.set(Math.cos(a) * r + 0.2, 0, Math.sin(a) * r * 0.9 + 0.1);
      p.rotation.y = R.ab(0, 6.28);
      const tela = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbcd8ff).multiplyScalar(2.4), toneMapped: false });
      const cel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.008), tela);
      cel.position.set(0, 0.22, 0.07);
      cel.rotation.x = -0.6;
      p.add(cel);
      tela.userData.ordem = R.r();
      this.telas.push(tela);
      this.multidao.add(p);
    }
    // povo na porta do mercado (8 h), de costas para a câmera
    for (let i = 0; i < 11; i++) {
      const p = this.pessoa(cores[(i + 2) % cores.length]);
      p.position.set(-4.35 + i * 0.25 + R.ab(-0.05, 0.05), 0.0, 0.92 + R.ab(-0.16, 0.18));
      p.rotation.y = R.ab(-0.5, 0.5);
      this.filaMerc.add(p);
    }
    this.frentista = this.pessoa(0x2b2f3d);
    this.frentista.position.set(3.6, 0.07, 3.3);
    this.g.add(this.pessoasCalcada, this.multidao, this.filaMerc, this.frentista);
  }

  montaTorre() {
    const k = this.kit;
    const g = new THREE.Group();
    const m = k.mat({ color: 0xc9ccd4, metal: 0.6, rough: 0.35 });
    const H = 1.6;
    for (const [x, z] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) {
      const l = k.m(new THREE.CylinderGeometry(0.012, 0.018, H, 6), m, 1.2);
      l.position.set(x * 0.6, H / 2, z * 0.6);
      l.rotation.z = -x * 0.12;
      l.rotation.x = z * 0.12;
      g.add(l);
    }
    for (let i = 1; i < 6; i++) {
      const y = (i / 6) * H, s = 0.24 * (1 - y / H * 0.55);
      const anel = k.m(new THREE.TorusGeometry(s, 0.008, 4, 4), m, 1);
      anel.rotation.x = Math.PI / 2;
      anel.rotation.z = Math.PI / 4;
      anel.position.y = y;
      g.add(anel);
    }
    const antenas = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const a = k.m(new RoundedBoxGeometry(0.08, 0.32, 0.03, 1, 0.01), k.mat({ color: 0xeeeeee }), 1.5);
      const ang = (i / 3) * Math.PI * 2;
      a.position.set(Math.cos(ang) * 0.14, H - 0.15, Math.sin(ang) * 0.14);
      a.rotation.y = -ang + Math.PI / 2;
      antenas.add(a);
    }
    g.add(antenas);
    const beacon = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2020).multiplyScalar(3), toneMapped: false });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), beacon);
    b.position.y = H + 0.05;
    g.add(b);
    g.position.set(2.6, 5.4 + 0.15, -2.7);
    this.g.add(g);
    this.torre = { beacon, antenas };
  }

  montaTunel() {
    const k = this.kit;
    const g = new THREE.Group();
    const [c, gg] = cv(1024, 128);
    gg.fillStyle = "#000";
    gg.fillRect(0, 0, 1024, 128);
    const R = rng(5);
    for (let i = 0; i < 8; i++) {
      const x0 = 30 + i * 124;
      gg.fillStyle = "#fff";
      gg.fillRect(x0, 24, 96, 70);
      // silhuetas (cabeça e ombros) contra a luz
      const n = 1 + Math.floor(R.r() * 3);
      for (let j = 0; j < n; j++) {
        const cx = x0 + 16 + R.r() * 64, cy = 60 + R.r() * 10;
        gg.fillStyle = "#0a0a0a";
        gg.beginPath();
        gg.arc(cx, cy, 9, 0, 7);
        gg.fill();
        gg.beginPath();
        gg.ellipse(cx, cy + 34, 18, 22, 0, 0, 7);
        gg.fill();
      }
    }
    const tex = tx(c);
    const corpo = k.mat({ color: 0xc8ccd2, metal: 0.3, rough: 0.4 });
    const janelas = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.6, map: tex });
    janelas.userData.semContorno = true;
    const vag = k.m(new RoundedBoxGeometry(4.2, 0.58, 0.6, 2, 0.08), corpo, 2);
    vag.position.y = -0.82;
    const lado = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.5), janelas);
    lado.position.set(0, -0.8, 0.305);
    const faixa = k.m(new THREE.BoxGeometry(4.21, 0.05, 0.61), k.mat({ color: 0x1f4fa8 }), 1);
    faixa.position.y = -1.04;
    g.add(vag, lado, faixa);
    g.position.set(-0.6, 0, 5.25);
    // luzes de emergência no túnel
    const emerg: THREE.MeshBasicMaterial[] = [];
    for (let i = -5; i <= 5; i += 2.5) {
      const m = new THREE.MeshBasicMaterial({ color: 0x330000, toneMapped: false });
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.02), m);
      l.position.set(i, -0.45, 4.42);
      this.g.add(l);
      emerg.push(m);
    }
    const luz = new THREE.PointLight(0xff2a1a, 0, 5, 1.2);
    luz.position.set(-0.6, -0.5, 5.9);
    this.g.add(g, luz);
    this.trem = { g, janelas, luz, emerg };
  }

  montaExternos() {
    const k = this.kit;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), k.mat({ color: this.dir === "B" ? 0x2a3050 : 0x10142a, rough: 0.9, semContorno: true }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.set(0, 0.0, -28.5);
    chao.receiveShadow = true;
    const chaoL = new THREE.Mesh(new THREE.PlaneGeometry(40, 13), chao.material as THREE.Material);
    chaoL.rotation.x = -Math.PI / 2;
    const chaoR = chaoL.clone();
    chaoL.position.set(-26.5, -0.002, 0);
    chaoR.position.set(26.5, -0.002, 0);
    this.externos.add(chao, chaoL, chaoR);
    const R = rng(33);
    const paredes = ["#8a90a8", "#a5927a", "#7d9a94", "#9a8aa8", "#b0a28a"];
    let n = 0;
    for (let x = -22; x <= 22; x += 2.6) {
      for (let z = -24; z <= 5; z += 2.8) {
        if (Math.abs(x) < 7.6 && z > -8) continue;
        if (R.r() < 0.25) continue;
        const h = R.ab(2, 9) * (Math.abs(x) < 10 && z < -8 ? 1.2 : 1);
        const w = R.ab(1.4, 2.2);
        this.predio(x + R.ab(-0.3, 0.3), z, w, w, h, paredes[n % 5], 900 + n, Math.hypot(x, z) + R.ab(0, 3), this.externos);
        n++;
      }
    }
  }

  aplica(e: EstadoCidade) {
    const t = e.t;
    // janelas: onda de apagão / religação prédio a prédio
    for (const p of this.predios) {
      let l = e.luz;
      if (e.frente !== undefined) l = p.x + p.z * 0.35 < e.frente ? e.luz : 0;
      if (e.religa !== undefined) {
        const lim = e.religa * 30;
        l = Math.max(l, THREE.MathUtils.clamp((lim - p.ordem) / 1.5, 0, 1));
      }
      p.jan.uLuz.value = l;
      p.jan.uT.value = t;
    }
    let lr = e.luz;
    if (e.religa !== undefined) lr = Math.max(lr, THREE.MathUtils.clamp(e.religa * 2 - 0.6, 0, 1));
    for (const { mat, base } of this.luzesRua) {
      if (mat.blending === THREE.AdditiveBlending) mat.opacity = 0.16 * lr;
      else mat.color.copy(base).multiplyScalar(Math.max(lr, 0.0)).addScalar(lr < 0.05 ? 0.02 : 0);
    }
    for (const p of this.placas) p.color.setScalar(0.12 + 0.88 * lr);
    for (const l of this.pontos) l.intensity = (l.userData.base ??= l.intensity) * lr;
    // semáforos: ciclo de 6 s
    const fase = (t % 6) / 6;
    for (const s of this.sem) {
      const verdeAqui = s.eixo === 0 ? fase < 0.45 : fase >= 0.5 && fase < 0.95;
      const amarelo = s.eixo === 0 ? fase >= 0.45 && fase < 0.5 : fase >= 0.95;
      const k = e.semaforo;
      s.r.color.setRGB(0.13, 0.0, 0.0).lerp(new THREE.Color(3.2, 0.25, 0.15), !verdeAqui && !amarelo ? k : 0);
      s.y.color.setRGB(0.12, 0.09, 0.0).lerp(new THREE.Color(3.0, 2.0, 0.2), amarelo ? k : 0);
      s.gr.color.setRGB(0.0, 0.1, 0.03).lerp(new THREE.Color(0.3, 3.0, 0.9), verdeAqui ? k : 0);
    }
    // carros
    for (const c of this.carros) {
      const L = 13.6;
      const s = ((c.ofs + e.tCarros * 1.1) % L) - L / 2;
      let x = 0, z = 0, ry = 0;
      if (c.lane === 0) { x = s; z = -0.5; ry = 0; }
      if (c.lane === 1) { x = -s; z = 0.5; ry = Math.PI; }
      if (c.lane === 2) { x = 0.5; z = s; ry = -Math.PI / 2; }
      if (c.lane === 3) { x = -0.5; z = -s; ry = Math.PI / 2; }
      const k = e.travado;
      let jx = c.jam[0], jz = c.jam[1], jr = c.jam[2];
      const fi = FILA[this.carros.indexOf(c)];
      if (fi && e.fila) {
        jx += (fi[0] - jx) * e.fila; jz += (fi[1] - jz) * e.fila; jr += (fi[2] - jr) * e.fila;
      }
      c.g.position.set(x + (jx - x) * k, 0, z + (jz - z) * k);
      c.g.rotation.y = ry + (jr - ry) * k;
      for (const cn of c.cones) (cn.material as THREE.MeshBasicMaterial).opacity = 0.05 + 0.2 * (1 - lr);
    }
    this.pessoasCalcada.visible = e.multidao < 0.5;
    this.filaMerc.visible = (e.filaMerc ?? 0) > 0.5;
    this.frentista.visible = (e.fila ?? 0) > 0.5;
    this.multidao.visible = e.multidao >= 0.5;
    for (const tl of this.telas) {
      const on = tl.userData.ordem < e.celulares;
      tl.color.setRGB(0.74, 0.85, 1).multiplyScalar(on ? 2.4 : 0.03);
    }
    // metrô
    const em = e.trem;
    this.trem.janelas.emissive.setRGB(1 - em * 0.0, 1 - em * 0.85, 1 - em * 0.88);
    this.trem.janelas.emissiveIntensity = 1.5 * (1 - em) + 0.9 * em;
    const pisca = 0.75 + 0.25 * Math.sin(t * 2.2);
    this.trem.emerg.forEach((m) => m.color.setRGB(0.2 + 3 * em * pisca, 0.0, 0.0));
    this.trem.luz.intensity = 4 * em * pisca;
    // torre: luz piscando
    const bl = e.torre > 0 ? (Math.sin(t * 4) > 0 ? 3 : 0.3) * e.torre : 0.05;
    this.torre.beacon.color.setRGB(bl, 0.06 * bl, 0.06 * bl);
  }
}
