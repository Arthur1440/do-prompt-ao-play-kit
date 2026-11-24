import * as THREE from "three";
import { Kit } from "./kit";
import { LTOT, noCaminho, RM, V0, XC, XF, ZF, ZQ } from "./geo";
import { rng } from "./rng";
import { texGramaTopo } from "./tex3";

// ------------------------------------------------------------------ bloco da maquete
export const BX0 = XC, BX1 = 4.6, BZ0 = -2.6, BZ1 = 3.2, BY0 = -0.75;
export const HMAX = 1.5;

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** perfil do morro: topo largo, ombros e pé suave (b(0)=1, b(1)=0, inclinação zero nas pontas) */
const b = (u: number) => (u >= 1 ? 0 : 1 - Math.pow(ss(0, 1, u), 3));
/** meia-largura do pátio da frente (os muros de pedra abrem para fora) */
export const meiaPatio = (z: number) => 0.72 + 0.42 * Math.pow(ss(ZF, 2.15, z), 1.6);

/** altura do morro sem vala */
export function morro(x: number, z: number) {
  const uz = z > 0 ? z / 2.0 : -z / 2.3;
  const ux = Math.max(0, x - 1.35) / 1.65;
  return HMAX * b(Math.hypot(uz, ux));
}
/** quanto o pátio da frente rebaixa o terreno (0..1) */
export function patio(x: number, z: number) {
  return (1 - ss(meiaPatio(z) + 0.01, meiaPatio(z) + 0.09, Math.abs(x - XF))) * ss(ZF - 0.13, ZF - 0.065, z);
}

// distância (em planta) até o eixo da abóbada (amostras do caminho)
const AMOSTRAS: [number, number][] = [];
for (let i = 0; i <= 120; i++) {
  const { p } = noCaminho((LTOT * i) / 120);
  AMOSTRAS.push([p.x, p.z]);
}
export function distEixo(x: number, z: number) {
  let m = 1e9;
  for (let i = 0; i < AMOSTRAS.length - 1; i++) {
    const [ax, az] = AMOSTRAS[i], [bx, bz] = AMOSTRAS[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
}
/** altura final: morro, pátio rebaixado e vala (terra = 1: tudo no lugar; 0: vala aberta até o pé do arco) */
export function altura(x: number, z: number, terra = 1) {
  let h = morro(x, z) * (1 - patio(x, z));
  if (terra < 0.999) {
    const d = distEixo(x, z);
    const k = 1 - ss(RM + 0.12, RM + 0.55, d); // dentro da vala
    const fundo = 0.18 + Math.max(0, d - RM) * 0.9;
    h = h + (Math.min(h, fundo) - h) * k * (1 - terra);
  }
  return h;
}

// ------------------------------------------------------------------ superfície do topo (grade com altura)
export class Terreno {
  mesh: THREE.Mesh;
  geo: THREE.PlaneGeometry;
  terra = -1;
  NX = 230;
  NZ = 230;
  constructor(public kit: Kit, cena: THREE.Object3D) {
    this.geo = new THREE.PlaneGeometry(BX1 - BX0, BZ1 - BZ0, this.NX, this.NZ);
    this.geo.rotateX(-Math.PI / 2);
    this.geo.translate((BX0 + BX1) / 2, 0, (BZ0 + BZ1) / 2);
    const mat = kit.mat({ map: texGramaTopo(kit.dir), rough: 0.85, clear: 0.05, bump: 0.3, semContorno: true });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    kit.contorno(this.mesh, 2.5);
    cena.add(this.mesh);
    this.atualiza(1);
  }
  atualiza(terra: number) {
    if (Math.abs(terra - this.terra) < 1e-4) return false;
    this.terra = terra;
    const p = this.geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, altura(p.getX(i), p.getZ(i), terra));
    p.needsUpdate = true;
    this.geo.computeVertexNormals();
    return true;
  }
}

// ------------------------------------------------------------------ faces de corte (camadas de terra por shader)
type Face = { mesh: THREE.Mesh; perfil: THREE.DataTexture; dados: Float32Array; amostra: (u: number) => [number, number]; u0: number; u1: number };

export const CORES_CAMADA: Record<string, string[]> = {
  // grama, terra preta, terra do morro, subsolo, pedregulho
  A: ["#5b8c3a", "#3f2817", "#7a4e2e", "#9c6c3c", "#857565"],
  B: ["#77c24c", "#6e3b1e", "#a8643a", "#cf8f4e", "#9a8a78"],
  C: ["#79b465", "#5e3c2a", "#94634a", "#c09162", "#a3978a"],
};

export class Cortes {
  faces: Face[] = [];
  uniforms = {
    uBuraco: { value: 0 }, // raio do buraco da toca na face oeste (0 = tampado)
    uTubo: { value: 0 }, // fenda do tubo de luz do quarto
    uLama: { value: 0 }, // terra encharcada acima do quarto
    uAgua: { value: 0 }, // água descendo pela terra (fase)
    uCalor: { value: 0 }, // onda de calor da prova
    uTempo: { value: 0 },
    uFrio: { value: 0 }, // tom fresco dentro do morro (onda de calor)
  };
  constructor(public kit: Kit, cena: THREE.Object3D) {
    const N = 256;
    // oeste (o corte principal), sul, norte, leste
    this.cria(cena, N, "oeste", (u) => [XC, u], BZ0, BZ1);
    this.cria(cena, N, "sul", (u) => [u, BZ0], BX0, BX1);
    this.cria(cena, N, "norte", (u) => [u, BZ1], BX0, BX1);
    this.cria(cena, N, "leste", (u) => [BX1, u], BZ0, BZ1);
    this.atualiza(1);
  }
  cria(cena: THREE.Object3D, N: number, lado: string, amostra: (u: number) => [number, number], u0: number, u1: number) {
    const W = u1 - u0, H = HMAX + 0.2 - BY0;
    const g = new THREE.PlaneGeometry(W, H, 1, 1);
    // orienta: a face olha para fora do bloco
    const cx = (u0 + u1) / 2, cy = BY0 + H / 2;
    if (lado === "oeste") g.rotateY(-Math.PI / 2), g.translate(XC, cy, cx);
    if (lado === "leste") g.rotateY(Math.PI / 2), g.translate(BX1, cy, cx);
    if (lado === "sul") g.rotateY(Math.PI), g.translate(cx, cy, BZ0);
    if (lado === "norte") g.translate(cx, cy, BZ1);
    const dados = new Float32Array(N * 4);
    const perfil = new THREE.DataTexture(dados, N, 1, THREE.RGBAFormat, THREE.FloatType);
    perfil.minFilter = perfil.magFilter = THREE.LinearFilter;
    perfil.needsUpdate = true;
    const k = this.kit;
    const cores = CORES_CAMADA[k.dir].map((c) => new THREE.Color(c));
    const mat = k.mat({ color: 0xffffff, rough: 0.92, clear: 0.05, semContorno: true, bump: k.dir === "C" ? 1.1 : 0.25 });
    const eixoU = lado === "oeste" || lado === "leste" ? "z" : "x";
    const u = this.uniforms;
    k.hook(mat, {
      nome: "corte-" + (lado === "oeste" ? "oeste" : "outro"),
      f: (sh) => {
        Object.assign(sh.uniforms, u, {
          uPerfil: { value: perfil }, uU0: { value: u0 }, uU1: { value: u1 },
          uC0: { value: cores[0] }, uC1: { value: cores[1] }, uC2: { value: cores[2] }, uC3: { value: cores[3] }, uC4: { value: cores[4] },
        });
        sh.vertexShader = sh.vertexShader
          .replace("void main() {", "varying vec3 vWP;\nvoid main() {")
          .replace("#include <project_vertex>", "#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        const oeste = lado === "oeste" ? "1.0" : "0.0";
        const B = k.dir === "B" ? "1.0" : "0.0";
        sh.fragmentShader = sh.fragmentShader
          .replace(
            "void main() {",
            /* glsl */ `varying vec3 vWP;
uniform sampler2D uPerfil; uniform float uU0, uU1, uBuraco, uTubo, uLama, uAgua, uCalor, uTempo, uFrio;
uniform vec3 uC0, uC1, uC2, uC3, uC4;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hh(i),hh(i+vec2(1,0)),f.x), mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x), f.y); }
void main() {`,
          )
          .replace(
            "#include <map_fragment>",
            /* glsl */ `
  float gCalor = 0.0; float gAgua = 0.0;
  float cu = vWP.${eixoU};
  float hS = texture2D(uPerfil, vec2((cu - uU0)/(uU1 - uU0), 0.5)).r;
  if (vWP.y > hS + 0.001) discard;
  float OE = ${oeste};
  if (OE > 0.5) {
    float dz = cu - (${ZQ.toFixed(3)});
    float yy = vWP.y - ${V0.toFixed(3)};
    if (uBuraco > 0.0 && abs(dz) < uBuraco && vWP.y > -0.001 && (yy < 0.0 || dz*dz + yy*yy < uBuraco*uBuraco)) discard;
    if (uTubo > 0.5 && abs(dz) < 0.072 && vWP.y > 0.6) discard;
  }
  float d = hS - vWP.y;
  float w = (vn(vec2(cu*3.0, 1.0)) - 0.5) * 0.06 + (vn(vec2(cu*11.0, 3.0)) - 0.5) * 0.02;
  vec3 col;
  float isB = ${B};
  if (d < 0.035 + w*0.3) col = uC0;
  else if (d < 0.17 + w) col = uC1;
  else if (vWP.y > 0.28 + w) col = uC2;
  else if (vWP.y > -0.28 + w) col = uC3;
  else col = uC4;
  if (isB < 0.5) {
    // grão, pedrinhas e raízes finas
    float n = vn(vWP.yz*40.0 + vWP.x*13.0) * 0.6 + vn(vec2(cu, vWP.y)*90.0) * 0.4;
    col *= 0.86 + n * 0.28;
    vec2 cel = floor(vec2(cu, vWP.y) * 34.0);
    float pe = hh(cel);
    vec2 f = fract(vec2(cu, vWP.y) * 34.0) - 0.5;
    if (pe > 0.975 && d > 0.2 && length(f * vec2(1.0, 1.4)) < 0.24) col = mix(col, col * 1.45 + 0.03, 0.55);
    if (d > 0.035 && d < 0.22) { float raiz = smoothstep(0.985, 1.0, sin(cu*170.0 + vn(vec2(cu*8.0, vWP.y*6.0))*9.0)); col = mix(col, uC1*0.6, raiz*0.5); }
  } else {
    // toon: risquinhos de pedra chapados
    vec2 cel = floor(vec2(cu*1.0, vWP.y) * 18.0);
    vec2 f = fract(vec2(cu, vWP.y) * 18.0) - 0.5;
    if (hh(cel) > 0.93 && d > 0.2 && length(f*vec2(1.0,1.8)) < 0.22) col = col * 0.72;
  }
  if (OE > 0.5) {
    // terra encharcada por cima do quarto (chuva)
    float sobre = smoothstep(0.9, 0.3, abs(cu - (${ZQ.toFixed(3)}))) * step(0.6, vWP.y);
    col = mix(col, col * vec3(0.42, 0.36, 0.33), uLama * sobre);
    // gotas de água descendo pela terra
    if (uAgua > 0.0) {
      vec2 g = vec2(cu * 38.0, vWP.y * 16.0 + uAgua * 14.0 + hh(vec2(floor(cu*38.0), 3.0)) * 7.0);
      vec2 ci = floor(g); vec2 fr = fract(g) - 0.5;
      float on = step(0.78, hh(ci)) * smoothstep(0.75, 0.35, abs(cu - (${ZQ.toFixed(3)}))) * step(0.8, vWP.y);
      float gota = smoothstep(0.22, 0.1, length(fr * vec2(1.0, 0.7)));
      col = mix(col, vec3(0.2, 0.5, 1.0), gota * on);
      gAgua = gota * on;
    }
    // onda do calor do dia: entra pela superfície e some com a profundidade (perto da régua)
    if (uCalor > 0.0) {
      float perto = smoothstep(0.75, 0.2, abs(cu - 0.5));
      float am = exp(-d / 0.12) * (0.55 + 0.45 * sin(uTempo * 3.2 - d / 0.07));
      gCalor = clamp(am * uCalor * perto * 1.6, 0.0, 1.0);
      col = mix(col, vec3(1.0, 0.38, 0.06), gCalor);
    }
  }
  diffuseColor.rgb *= col;
`,
          )
          .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.36, 0.06) * gCalor * 2.6 + vec3(0.1, 0.35, 0.9) * gAgua * 0.6;");
      },
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.userData.corte = lado;
    cena.add(mesh);
    this.faces.push({ mesh, perfil, dados, amostra, u0, u1 });
  }
  atualiza(terra: number) {
    for (const f of this.faces) {
      const N = f.dados.length / 4;
      for (let i = 0; i < N; i++) {
        const u = f.u0 + ((f.u1 - f.u0) * i) / (N - 1);
        const [x, z] = f.amostra(u);
        f.dados[i * 4] = altura(x, z, terra);
      }
      f.perfil.needsUpdate = true;
    }
  }
}

// ------------------------------------------------------------------ pedras salientes nas faces de corte
export function pedras(kit: Kit, cena: THREE.Object3D) {
  const r = rng(91);
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = 0.82 + 0.3 * Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7);
    p.setXYZ(i, v.x * n, v.y * n, v.z * n);
  }
  g.computeVertexNormals();
  const mat = kit.mat({ color: kit.dir === "B" ? 0xa9a39a : 0x8f8a82, rough: 0.7, clear: 0.15 });
  const N = 64;
  const im = new THREE.InstancedMesh(g, mat, N);
  im.castShadow = true;
  im.receiveShadow = true;
  const m = new THREE.Matrix4();
  let k = 0, tent = 0;
  while (k < N && tent < 4000) {
    tent++;
    const lado = r() < 0.62 ? 0 : r() < 0.5 ? 1 : 2; // oeste, sul, norte
    const u = lado === 0 ? BZ0 + 0.15 + r() * (BZ1 - BZ0 - 0.3) : BX0 + 0.15 + r() * (BX1 - BX0 - 0.3);
    const [x, z] = lado === 0 ? [XC, u] : lado === 1 ? [u, BZ0] : [u, BZ1];
    const h = morro(x, z) * (1 - patio(x, z));
    const y = BY0 + 0.08 + r() * (h - BY0 - 0.12);
    if (h - y < 0.3) continue;
    if (lado === 0 && Math.abs(z - ZQ) < 0.95 && y > -0.12) continue; // longe do quarto e da vala
    if (lado === 0 && Math.abs(z - 0.5) < 0.4 && y > 0.8) continue; // longe da régua
    const s = 0.035 + r() * 0.07;
    const rot = new THREE.Euler(r() * 6, r() * 6, r() * 6);
    const pos = lado === 0 ? new THREE.Vector3(XC + s * 0.25, y, z) : lado === 1 ? new THREE.Vector3(x, y, BZ0 - s * 0.25) : new THREE.Vector3(x, y, BZ1 + s * 0.25);
    m.compose(pos, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(s * 1.3, s, s * 0.9));
    im.setMatrixAt(k++, m);
  }
  im.count = k;
  kit.contorno(im as unknown as THREE.Mesh, 2);
  cena.add(im);
  return im;
}

/** sombra que tampa o corte (o sol não entra pela face cortada, só pela fachada e pelos tubos) */
export function tampaSombra(cena: THREE.Object3D) {
  // só a boca interna do arco, um pouco para dentro (não sombreia a face do corte nem o anel de concreto)
  const sh = new THREE.Shape();
  sh.moveTo(-0.5, 0);
  sh.lineTo(-0.5, V0);
  sh.absarc(0, V0, 0.5, Math.PI, 0, true);
  sh.lineTo(0.5, 0);
  sh.closePath();
  const g = new THREE.ShapeGeometry(sh, 24);
  g.rotateY(Math.PI / 2);
  const me = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  me.position.set(XC + 0.03, 0, ZQ);
  me.castShadow = true;
  me.receiveShadow = false;
  me.userData.semWire = true;
  cena.add(me);
  return me;
}
