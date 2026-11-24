// Globo noturno: terra (Natural Earth) + luzes das cidades (populated places), onda de apagão e religação.
import * as THREE from "three";
import { Kit, Dir } from "./kit";
import { GEO } from "./geo_dados";
import { rng } from "./rng";
import { cv, tx } from "./tex";

export class Globo {
  g = new THREE.Group();
  esfera: THREE.Mesh;
  u = { uFrente: { value: 1.2 }, uReacende: { value: 0 }, uBrilho: { value: 1 } };
  estrelas: THREE.Points;

  constructor(public kit: Kit, public dir: Dir) {
    const W = 4096, H = 2048;
    const [c, g] = cv(W, H);
    const [e, ge] = cv(W, H);
    const P = (lon: number, lat: number) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H] as const;
    const oceano = dir === "A" ? "#14264a" : dir === "B" ? "#1b2a63" : "#070d20";
    const terra = dir === "A" ? "#33402f" : dir === "B" ? "#2f4a4a" : "#111a33";
    g.fillStyle = oceano;
    g.fillRect(0, 0, W, H);
    g.fillStyle = terra;
    g.strokeStyle = dir === "C" ? "#2a4a8a" : "rgba(255,255,255,0.12)";
    g.lineWidth = dir === "C" ? 2 : 1.5;
    for (const anel of GEO.terra as unknown as number[][][]) {
      g.beginPath();
      let ult = 0;
      anel.forEach(([lon, lat], i) => {
        const [x, y] = P(lon, lat);
        if (i === 0 || Math.abs(lon - ult) > 180) g.moveTo(x, y);
        else g.lineTo(x, y);
        ult = lon;
      });
      g.closePath();
      g.fill();
      g.stroke();
    }
    ge.fillStyle = "#000";
    ge.fillRect(0, 0, W, H);
    ge.globalCompositeOperation = "lighter";
    const R = rng(8);
    for (const [lon, lat, pop] of GEO.luzes as unknown as [number, number, number][]) {
      const [x, y] = P(lon, lat);
      const k = Math.log10(pop / 15000 + 1);
      const r = 1.2 + k * 2.6;
      const gr = ge.createRadialGradient(x, y, 0, x, y, r * 2.2);
      gr.addColorStop(0, `rgba(255,214,150,${Math.min(1, 0.45 + k * 0.3)})`);
      gr.addColorStop(0.35, `rgba(255,170,80,${0.25 + k * 0.1})`);
      gr.addColorStop(1, "rgba(255,140,40,0)");
      ge.fillStyle = gr;
      ge.fillRect(x - r * 2.3, y - r * 2.3, r * 4.6, r * 4.6);
      // espalhamento urbano em volta das grandes
      const n = Math.min(40, Math.floor(k * 9));
      for (let i = 0; i < n; i++) {
        const dx = R.gauss() * r * 2.2, dy = R.gauss() * r * 2.2;
        ge.fillStyle = `rgba(255,190,110,${R.ab(0.15, 0.45)})`;
        ge.fillRect(x + dx, y + dy, 1.6, 1.6);
      }
    }
    const map = tx(c);
    const em = tx(e);
    const geo = dir === "C" ? new THREE.SphereGeometry(2, 96, 64) : new THREE.SphereGeometry(2, 128, 96);
    const mat = kit.mat({ map, emis: 0xffffff, emisI: dir === "C" ? 1.6 : 1.15, emisMap: em, rough: dir === "A" ? 0.45 : 0.7, clear: 0.35 }) as THREE.MeshStandardMaterial;
    const u = this.u;
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u);
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uFrente; uniform float uReacende; uniform float uBrilho;\nfloat hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}")
        .replace(
          "#include <emissivemap_fragment>",
          `#ifdef USE_EMISSIVEMAP
            vec2 uvE = vEmissiveMapUv;
            vec4 eM = texture2D( emissiveMap, uvE );
            float onda = 1.0 - smoothstep(uFrente - 0.004, uFrente + 0.004, uvE.x);
            float bloco = hsh(floor(uvE * vec2(90.0, 45.0)));
            float volta = step(bloco, uReacende * 1.05 - 0.02);
            float on = max(onda, volta);
            totalEmissiveRadiance *= eM.rgb * on * uBrilho;
            float borda = exp(-pow((uvE.x - uFrente) * 260.0, 2.0)) * step(uFrente, 1.0) * step(0.0, uFrente);
            totalEmissiveRadiance += vec3(1.0, 0.42, 0.17) * borda * 0.9 * (1.0 - uReacende);
          #endif`,
        );
    };
    mat.customProgramCacheKey = () => "globo";
    this.esfera = kit.m(geo, mat, 4);
    this.esfera.castShadow = false;
    this.g.add(this.esfera);
    // atmosfera
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(2.09, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: { cor: { value: new THREE.Color(dir === "B" ? 0x6aa0ff : 0x3f72ff) }, forca: { value: dir === "C" ? 1.6 : 1.0 } },
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 cor; uniform float forca; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.6); gl_FragColor = vec4(cor * f * forca, f); }`,
        side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    atm.scale.setScalar(1.0);
    this.g.add(atm);
    // estrelas
    const n = 3000, pos = new Float32Array(n * 3);
    const Rs = rng(3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Rs.gauss(), Rs.gauss(), Rs.gauss()).normalize().multiplyScalar(Rs.ab(60, 90));
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.estrelas = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfcfff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 }));
    this.g.add(this.estrelas);
  }

  /** rotação para pôr (lon, lat) de frente para +z */
  frente(lon: number, lat: number) {
    this.esfera.rotation.set(0, 0, 0);
    // a esfera do three tem u=0 em lon -180 olhando para -x; lon L fica no ângulo phi = (L+180)
    this.esfera.rotation.y = -THREE.MathUtils.degToRad(lon + 90);
    this.esfera.rotation.x = THREE.MathUtils.degToRad(lat);
    this.esfera.rotation.order = "XYZ";
  }

  aplica(frente: number, reacende: number, brilho = 1) {
    this.u.uFrente.value = frente;
    this.u.uReacende.value = reacende;
    this.u.uBrilho.value = brilho;
  }
}
