// Orquestra a cena: rua de bairro + campo do lobo + céu + personagens + reflexo no olho + virada.
// Tudo é função pura do Estado: o render pode pular e repetir quadros.
import * as THREE from "three";
import { Kit, Dir, montaMundo } from "./kit";
import { Rua } from "./rua";
import { Campo, CAMPO0 } from "./campo";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Ator, Cachorro, Dono, MotoPronta, lobo, cervo, texBola } from "./modelos";
import { Quintal, Sala } from "./cenarios";
import { Virada } from "./virada";

export type V3 = [number, number, number];
export type Cam = { pos: V3; alvo: V3; fov?: number; rolo?: number; foco?: number; forca?: number; larg?: number; olho?: boolean };
export type Anda = "galope" | "trote" | "parado" | "late" | "pula" | "baixa";
export type EstQuad = { pos: V3; rotY?: number; anda: Anda; t: number; boca?: number; cabecaY?: number; cabecaZ?: number; rabo?: number; estica?: number; orelha?: number; semSombra?: boolean; lingua?: boolean };
export type EstHum = { pos: V3; rotY?: number; pose: "ri" | "palma" | "parado" | "joga" | "corre"; t: number; u?: number };
export type Estado = {
  t: number;
  cam: Cam;
  cena?: "rua" | "campo";
  sol?: V3; // direção de onde vem o sol
  cachorro?: EstQuad | null;
  moto?: { pos: V3; rotY?: number; v: number; acel?: number; fum?: number; lean?: number; bicho?: number } | null;
  dono?: EstHum | null;
  lobo?: EstQuad | null;
  lobos?: V3[]; // matilha parada
  cervo?: EstQuad | null;
  portao?: number;
  olho?: number; // 0..1 reflexo da moto no olho do cachorro
  virada?: { k: number; k2: number };
  congela?: number; // 0..1 quadro congelado (dessatura)
  bolaBoca?: boolean; // bolinha presa na boca do cachorro
  bola?: V3 | null; // bolinha solta no mundo
  lanca?: { t0: number; dur: number; alvo: V3 }; // o dono lança a bolinha em t0 (sai da mão) e ela cai em `alvo` após `dur`
  sombraLobo?: { pos: V3; rotY?: number; t: number } | null; // lobo invisível que só projeta sombra
  luz?: { sol?: number; hemi?: number; cor?: number }; // variação de luz (dias diferentes, sala)
};

const CEU = {
  A: { topo: 0x5a6fa4, meio: 0xd08c74, hor: 0xffcf8a, sol: 0xfff0c8 },
  B: { topo: 0x3d84d6, meio: 0x8cc4ec, hor: 0xffd29c, sol: 0xfff6e0 },
  C: { topo: 0x3567b5, meio: 0xf08a4b, hor: 0xffd060, sol: 0xfff4c0 },
};

function ceu(dir: Dir) {
  const c = CEU[dir];
  const m = new THREE.ShaderMaterial({
    uniforms: { topo: { value: new THREE.Color(c.topo) }, meio: { value: new THREE.Color(c.meio) }, hor: { value: new THREE.Color(c.hor) }, solC: { value: new THREE.Color(c.sol) }, solD: { value: new THREE.Vector3(-1, 0.1, 0) }, gibi: { value: dir === "C" ? 1 : 0 }, escuro: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 topo, meio, hor, solC, solD; uniform float gibi, escuro; varying vec3 vD;
      void main(){
        float y = vD.y;
        vec3 c = mix(hor, meio, smoothstep(0.0, 0.18, y));
        c = mix(c, topo, smoothstep(0.15, 0.6, y));
        c = mix(c, hor * 0.85, smoothstep(0.0, -0.1, y));
        float s = max(dot(normalize(vD), normalize(solD)), 0.0);
        c += solC * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.35);
        if (gibi > 0.5) {
          float yy = smoothstep(-0.02, 0.55, y) * 4.0;
          float q = floor(yy) / 4.0;
          vec3 b0 = mix(hor, topo, q), b1 = mix(hor, topo, min(1.0, q + 0.25));
          float f = fract(yy);
          vec2 g = mat2(0.7071,-0.7071,0.7071,0.7071) * gl_FragCoord.xy / 9.0;
          float d = length(fract(g) - 0.5);
          float pt = 1.0 - smoothstep(0.6 * f - 0.05, 0.6 * f + 0.05, d);
          c = mix(b0, b1, pt) + solC * step(0.9985, s) * 1.2;
        }
        gl_FragColor = vec4(c * (1.0 - escuro), 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const me = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), m);
  me.renderOrder = -10;
  me.frustumCulled = false;
  me.userData.semArame = true;
  return me;
}

/** córnea: espelho convexo com a imagem do que o cachorro vê (render target), mapeada como matcap */
function cornea(rt: THREE.WebGLRenderTarget, r: number) {
  const m = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rt.texture }, k: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tex; uniform float k; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 n = normalize(vN);
        vec2 uv = vec2(0.5 - n.x * 0.62, 0.5 + n.y * 0.62);
        vec3 refl = texture2D(tex, uv).rgb;
        // íris castanho-escura com pupila grande + reflexo do que ele vê + brilho de estúdio
        float rr = length(n.xy);
        vec3 iris = mix(vec3(0.015, 0.01, 0.008), vec3(0.22, 0.11, 0.04), smoothstep(0.32, 0.62, rr));
        iris = mix(iris, vec3(0.03, 0.02, 0.015), smoothstep(0.8, 0.95, rr));
        float fr = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.0);
        vec3 c = iris + refl * (0.42 + 0.35 * fr);
        float sp = smoothstep(0.035, 0.0, length(n.xy - vec2(-0.32, 0.38)));
        c += vec3(1.0) * sp * 1.4;
        gl_FragColor = vec4(c, k);
      }`,
    transparent: true, depthWrite: false,
  });
  const me = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m);
  me.userData.semArame = true;
  return me;
}

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  rua: Rua;
  campo: Campo;
  dog: Cachorro;
  moto: MotoPronta;
  dono: Dono;
  lobo: Ator;
  matilha: Ator[] = [];
  cervo: Ator;
  ceu: THREE.Mesh;
  rt = new THREE.WebGLRenderTarget(512, 512, { samples: 4 });
  camOlho = new THREE.PerspectiveCamera(100, 1, 0.05, 300);
  corneas: THREE.Mesh[] = [];
  virada?: Virada;
  planoVirada = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e5);
  tinta = new THREE.Color(0x0b1026);
  foco = 0.45; forca = 0.85; larg = 1;
  olhoK = 0;
  bolaSolta: THREE.Mesh;
  loboSombra: Ator;
  base: { sol: number; hemi: number };
  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number, gl: GLTF[]) {
    const [gShiba, gLobo, gCervo, gHomem, gBase, gMoto, gSofa, gVaral, gPote] = gl;
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    const k = this.kit, sc = this.w.scene;
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.ceu = ceu(dir);
    sc.add(this.ceu);
    sc.fog = new THREE.Fog(new THREE.Color(CEU[dir].hor).lerp(new THREE.Color(CEU[dir].meio), 0.3), 40, 220);
    this.rua = new Rua(k);
    sc.add(this.rua.g);
    this.campo = new Campo(k);
    sc.add(this.campo.g);
    this.dog = new Cachorro(k, gShiba);
    sc.add(this.dog.raiz);
    this.moto = new MotoPronta(k, gMoto, gBase);
    sc.add(this.moto.g);
    this.dono = new Dono(k, gHomem);
    sc.add(this.dono.raiz);
    this.lobo = lobo(k, gLobo);
    sc.add(this.lobo.raiz);
    for (let i = 0; i < 4; i++) { const b = lobo(k, gLobo); sc.add(b.raiz); this.matilha.push(b); }
    this.cervo = cervo(k, gCervo);
    sc.add(this.cervo.raiz);
    sc.add(new Quintal(k, gVaral, gPote).g, new Sala(k, gSofa).g);
    this.dog.montaBola(k);
    this.bolaSolta = k.m(new THREE.SphereGeometry(0.034, 28, 20), k.mat({ map: texBola(), estampa: true, rough: 0.9, clear: 0 }), 2.2, sc);
    this.bolaSolta.visible = false;
    // lobo-sombra: não aparece, só projeta a sombra no asfalto
    this.loboSombra = lobo(k, gLobo);
    sc.add(this.loboSombra.raiz);
    this.loboSombra.raiz.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh) return;
      if (o.userData.contorno) { o.visible = false; return; }
      const m = (me.material as THREE.Material).clone();
      m.colorWrite = false; m.depthWrite = false;
      me.material = m;
      me.castShadow = true; me.receiveShadow = false;
    });
    // córnea com o reflexo da moto: esferas presas à cabeça, na posição dos olhos
    for (const c0 of this.dog.olhosMundo) {
      const c = cornea(this.rt, 0.0115);
      // metade enterrada: só a calota aparece, como um olho de verdade
      this.dog.prende("Head", c, c0.clone().add(new THREE.Vector3(-0.004, 0, -Math.sign(c0.z) * 0.002)));
      c.visible = false;
      this.corneas.push(c);
    }
    sc.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.material || o === this.ceu) return;
      for (const mm of Array.isArray(me.material) ? me.material : [me.material]) if (!mm.clippingPlanes || mm.clippingPlanes.length === 0) mm.clippingPlanes = [this.planoVirada];
    });
    this.base = { sol: this.w.sol.intensity, hemi: this.w.hemi.intensity };
  }

  quad(b: Ator, e: EstQuad | null | undefined, cachorro = false) {
    if (!e) { b.raiz.visible = false; return; }
    b.raiz.visible = true;
    b.raiz.position.set(...e.pos);
    b.raiz.rotation.set(0, e.rotY ?? 0, 0);
    if (cachorro) {
      (b as Cachorro).anda(e.anda, e.t, { rabo: e.rabo, cabeca: e.cabecaZ, orelha: e.orelha });
      const sem = !!e.semSombra;
      for (const me of (b as Cachorro).malhas) me.castShadow = !sem;
    }
    else b.pose(e.anda === "galope" ? "Gallop" : e.anda === "trote" ? "Walk" : "Idle", e.t);
    const s = this.dir === "B" ? e.estica ?? 0 : 0; // squash and stretch só no toon
    b.raiz.scale.set(1 + 0.08 * s, 1 - 0.05 * s, 1);
  }

  aplica(e: Estado) {
    const t = e.t, sc = this.w.scene;
    sc.background = null;
    this.ceu.visible = true;
    this.w.hemi.intensity = this.base.hemi * (e.luz?.hemi ?? 1);
    this.w.sol.intensity = this.base.sol * (e.luz?.sol ?? 1);
    this.w.sol.color.set(e.luz?.cor ?? (this.dir === "B" ? 0xfff1dc : this.dir === "A" ? 0xffa45c : 0xfff0d8));
    // personagens
    this.quad(this.dog, e.cachorro, true);
    this.dog.bola.visible = !!e.bolaBoca && !!e.cachorro;
    this.dog.lingua.visible = !!e.cachorro?.lingua && !e.bolaBoca;
    this.quad(this.loboSombra, e.sombraLobo ? { pos: e.sombraLobo.pos, rotY: e.sombraLobo.rotY, anda: "parado", t: e.sombraLobo.t } : null);
    if (e.sombraLobo) this.loboSombra.raiz.scale.setScalar(1.35);
    if (e.moto) this.moto.aplica({ ...e.moto, t }); else this.moto.g.visible = false;
    if (e.dono) {
      this.dono.raiz.visible = true;
      this.dono.raiz.position.set(...e.dono.pos);
      this.dono.raiz.rotation.set(0, e.dono.rotY ?? 0, 0);
      this.dono.faz(e.dono.pose, e.dono.t);
    } else this.dono.raiz.visible = false;
    // bolinha: solta, ou lançada pela mão direita do dono (parábola até o alvo)
    this.bolaSolta.visible = false;
    if (e.bola) { this.bolaSolta.visible = true; this.bolaSolta.position.set(...e.bola); }
    if (e.lanca && e.dono && t >= e.lanca.t0 - 1.2) {
      const mao = this.dono.ossos.get("PalmR") ?? this.dono.ossos.get("LowerArmR")!;
      const p0 = new THREE.Vector3();
      if (t < e.lanca.t0) { this.dono.raiz.updateMatrixWorld(true); mao.getWorldPosition(p0); this.bolaSolta.position.copy(p0); this.bolaSolta.visible = true; }
      else if (t < e.lanca.t0 + e.lanca.dur) {
        // posição da mão no instante do lançamento
        this.dono.faz("joga", e.lanca.t0);
        this.dono.raiz.updateMatrixWorld(true);
        mao.getWorldPosition(p0);
        this.dono.faz("joga", e.dono.t);
        const u = (t - e.lanca.t0) / e.lanca.dur, a = new THREE.Vector3(...e.lanca.alvo);
        this.bolaSolta.position.copy(p0).lerp(a, u);
        this.bolaSolta.position.y += Math.sin(Math.PI * u) * 1.6;
        this.bolaSolta.rotation.set(t * 9, t * 5, 0);
        this.bolaSolta.visible = true;
      }
    }
    this.quad(this.lobo, e.lobo);
    this.quad(this.cervo, e.cervo);
    this.matilha.forEach((b, i) => {
      const p = e.lobos?.[i];
      if (!p) { b.raiz.visible = false; return; }
      this.quad(b, { pos: p, rotY: Math.PI * 0.85 + i * 0.2, anda: "parado", t: t + i * 1.3 });
    });
    this.rua.portao(e.portao ?? 0.75);
    // câmera (olho: pos e alvo são relativos ao olho esquerdo do cachorro)
    const cam = this.w.camera;
    let cp = new THREE.Vector3(...e.cam.pos), ca = new THREE.Vector3(...e.cam.alvo);
    if (e.cam.olho && this.corneas[0]) {
      this.dog.raiz.updateMatrixWorld(true);
      const o = new THREE.Vector3();
      this.corneas[0].getWorldPosition(o);
      cp = o.clone().add(cp);
      ca = o.clone().add(ca);
    }
    cam.position.copy(cp);
    cam.fov = e.cam.fov ?? 30;
    cam.near = 0.01;
    cam.far = 400;
    cam.updateProjectionMatrix();
    const al = ca;
    const fw = al.clone().sub(cam.position).normalize();
    cam.up.copy(new THREE.Vector3(0, 1, 0).applyAxisAngle(fw, e.cam.rolo ?? 0));
    cam.lookAt(al);
    cam.updateMatrixWorld();
    this.ceu.position.copy(cam.position);
    this.foco = e.cam.foco ?? 0.45;
    this.forca = e.cam.forca ?? 0.85;
    this.larg = e.cam.larg ?? 1;
    // sol (vem do poente)
    const sd = new THREE.Vector3(...(e.sol ?? [-3, this.dir === "A" ? 1.25 : 1.9, -1.6])).normalize();
    const foco = new THREE.Vector3(al.x, e.cena === "campo" ? CAMPO0.y : 0, al.z);
    this.w.sol.position.copy(foco).addScaledVector(sd, 30);
    this.w.sol.target.position.copy(foco);
    this.w.sol.target.updateMatrixWorld();
    (this.ceu.material as THREE.ShaderMaterial).uniforms.solD.value.copy(sd);
    // reflexo no olho
    this.olhoK = e.olho ?? 0;
    this.corneas.forEach((c) => { c.visible = this.olhoK > 0.01; (c.material as THREE.ShaderMaterial).uniforms.k.value = this.olhoK; });
    // quadro congelado
    this.w.final.uniforms.dessat.value = 0.5 * (e.congela ?? 0);
    // virada: congela em arame laranja + partículas sobre azul-tinta
    const v = e.virada;
    if (this.virada) this.virada.g.visible = false;
    this.planoVirada.constant = 1e5;
    this.planoVirada.normal.set(1, 0, 0);
    if (v && v.k > 0.001) {
      if (!this.virada) {
        sc.updateMatrixWorld(true);
        const perto = new THREE.Box3().setFromCenterAndSize(al.clone(), new THREE.Vector3(14, 10, 14));
        this.virada = new Virada([this.dog.raiz, this.moto.g, this.dono.raiz, this.rua.g], al.clone(), this.kit.W, this.kit.H, perto);
        sc.add(this.virada.g);
      }
      this.virada.g.visible = true;
      this.virada.aplica(v.k, v.k2, t);
      this.planoVirada.normal.copy(this.virada.planoSolido.normal);
      this.planoVirada.constant = this.virada.planoSolido.constant;
      if (v.k > 0.98) this.ceu.visible = false;
      sc.background = this.tinta;
      this.w.hemi.intensity = this.base.hemi * (1 - 0.4 * Math.min(1, v.k * 2));
    }
  }

  render(t: number) {
    if (this.olhoK > 0.01) {
      // o que o cachorro vê: da cabeça para a frente
      const cab = this.dog.ossos.get("Head")!;
      const p = new THREE.Vector3(), q = new THREE.Quaternion();
      cab.getWorldPosition(p);
      this.dog.raiz.getWorldQuaternion(q);
      const fw = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      this.camOlho.position.copy(p).addScaledVector(fw, 0.15);
      this.camOlho.lookAt(p.clone().addScaledVector(fw, 10).add(new THREE.Vector3(0, 0.3, 0)));
      this.camOlho.updateMatrixWorld();
      this.ceu.position.copy(this.camOlho.position);
      this.corneas.forEach((c) => (c.visible = false));
      this.dog.raiz.visible = false;
      const r = this.w.renderer;
      r.setRenderTarget(this.rt);
      r.render(this.w.scene, this.camOlho);
      r.setRenderTarget(null);
      this.dog.raiz.visible = true;
      this.corneas.forEach((c) => (c.visible = true));
      this.ceu.position.copy(this.w.camera.position);
    }
    this.w.quadro(t, this.foco, this.forca, this.larg);
  }
}
