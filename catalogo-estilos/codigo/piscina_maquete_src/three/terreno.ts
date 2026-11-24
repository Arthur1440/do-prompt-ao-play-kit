// Terreno do quintal: sólido FECHADO (superfície em grade + laterais + fundo), para o corte de terreno funcionar.
// A superfície tem dois modos: "buraco" (cratera de terra do gancho, com a borda desmoronando) e "obra" (cava
// retangular da piscina, com paredes verticais exatas). Grama e lama se misturam por vértice (atributo "lama").
// As camadas de terra (laterais da tábua e tampa do corte) vêm do mesmo GLSL, por posição de mundo.
import * as THREE from "three";
import type { Dir, Kit } from "./kit";
import { matTampa } from "./corte";
import { texGrama, texLama } from "./texp";
import { ruido2 } from "./tex";

export const PIS = { L: 4, W: 2.2, D: 1.4, e: 0.16 }; // interior da piscina (m) e espessura da parede
export const EXT = { x: PIS.L / 2 + PIS.e, z: PIS.W / 2 + PIS.e, y: -(PIS.D + PIS.e) }; // cava: 2,16 x 1,26 x -1,56
export const FUNDO = -2.8; // base do sólido

export type EstadoTerreno = {
  modo: "buraco" | "obra";
  colapso?: number; // 0..1 a borda da frente-direita cede
  sujeira?: number; // 0..1 anel de terra pisada em volta da cava (obra)
  lencol?: number; // y do lençol freático
  molhado?: [number, number, number, number]; // mancha úmida na tampa: cx, cy, raio, intensidade
};

/** camadas de terra por direção (corpo de vec3 corTampa(vec3 p)) */
export function glslTerra(d: Dir) {
  const camadas =
    d === "B"
      ? `vec3 c0 = vec3(0.36,0.22,0.12), c1 = vec3(0.62,0.38,0.20), c2 = vec3(0.78,0.47,0.24), c3 = vec3(0.86,0.66,0.38), c4 = vec3(0.60,0.56,0.52);`
      : d === "A"
        ? `vec3 c0 = vec3(0.30,0.19,0.11), c1 = vec3(0.50,0.31,0.17), c2 = vec3(0.64,0.38,0.20), c3 = vec3(0.72,0.55,0.33), c4 = vec3(0.50,0.47,0.44);`
        : `vec3 c0 = vec3(0.20,0.13,0.08), c1 = vec3(0.36,0.23,0.13), c2 = vec3(0.50,0.29,0.15), c3 = vec3(0.58,0.44,0.27), c4 = vec3(0.42,0.40,0.37);`;
  const detalhe =
    d === "B"
      ? `
      // contorno escuro entre as camadas (toon)
      float lin = min(min(abs(yy+0.14), abs(yy+0.85)), min(abs(yy+1.6), abs(yy+2.25)));
      c = mix(c, vec3(0.12,0.07,0.05), 1.0 - smoothstep(0.008, 0.016, lin));
      float pd = pedras(vec2(p.x, p.y + p.z) * 5.0, 0.22);
      c = mix(c, c * 0.72, 1.0 - step(1.0, pd));
      c = mix(c, vec3(0.12,0.07,0.05), (1.0 - step(1.0, pd)) * step(0.82, pd));`
      : d === "A"
        ? `
      float pd = pedras(vec2(p.x, p.y + p.z) * 6.0, 0.25);
      c = mix(c, c * 0.62 + 0.06, (1.0 - smoothstep(0.85, 1.0, pd)));
      c *= 0.94 + 0.08 * vn2(vec2(p.x + p.z, p.y) * 9.0);`
        : `
      float pd = pedras(vec2(p.x, p.y + p.z) * 9.0, 0.3);
      c = mix(c, mix(vec3(0.45,0.42,0.38), vec3(0.62,0.58,0.52), h21(floor(vec2(p.x+p.z, p.y)*9.0))), (1.0 - smoothstep(0.8, 1.0, pd)) * step(yy, -0.3));
      c *= 0.78 + 0.34 * fbm2(vec2(p.x + p.z, p.y) * 7.0);
      // raízes finas perto da grama
      float rz = abs(sin((p.x + p.z) * 23.0 + sin(p.y * 31.0) * 1.5));
      c = mix(c, vec3(0.30,0.22,0.15), (1.0 - smoothstep(0.0, 0.04, rz)) * smoothstep(-0.5, -0.12, yy) * 0.6);`;
  return /* glsl */ `
      ${camadas}
      float w = (fbm2(vec2(p.x + p.z * 0.7, 0.0) * 0.5) - 0.5) * 0.32 + sin((p.x + p.z) * 1.1) * 0.05;
      float yy = p.y - w * smoothstep(0.0, -0.3, p.y);
      vec3 c = yy > -0.14 ? c0 : yy > -0.85 ? c1 : yy > -1.6 ? c2 : yy > -2.25 ? c3 : c4;
      ${detalhe}
      // mancha úmida (água que a terra bebeu)
      float dm = length((vec2(p.x, p.y) - uMolhado.xy) / vec2(1.0, 0.75)) / max(uMolhado.z, 0.001);
      float um = uMolhado.w * (1.0 - smoothstep(0.75, 1.0 + 0.15 * vn2(p.xy * 6.0), dm));
      c = mix(c, c * vec3(0.55, 0.52, 0.55), um);
      // lençol freático: terra encharcada azul, com bolhas subindo quando empurra
      float nl = uLencol + 0.025 * sin(p.x * 3.0 + uT * 2.0) + 0.015 * sin(p.x * 7.3 - uT * 3.1);
      float lw = 1.0 - smoothstep(nl - 0.01, nl + 0.01, p.y);
      vec3 azul = ${d === "B" ? "vec3(0.20,0.55,0.95)" : d === "A" ? "vec3(0.16,0.45,0.80)" : "vec3(0.10,0.34,0.62)"};
      float bol = smoothstep(0.75, 0.95, vn2(vec2(p.x * 9.0, p.y * 9.0 - uT * 1.6 * uFluxo)));
      vec3 cl = mix(c * 0.45, azul, 0.72) + bol * 0.18 * uFluxo;
      c = mix(c, cl, lw * uLencolV);
      c = mix(c, azul * 1.5, (1.0 - smoothstep(0.0, 0.012, abs(p.y - nl))) * uLencolV * ${d === "B" ? "1.0" : "0.6"});
      return c;`;
}

export class Terreno {
  g = new THREE.Group();
  topo: THREE.Mesh;
  saia: THREE.Mesh;
  xs: number[];
  zs: number[];
  pos: Float32Array;
  lama: Float32Array;
  tampaU: Record<string, THREE.IUniform>;
  matTerra: THREE.Material;
  bx: [number, number];
  bz: [number, number];
  private chave = "";
  private nR = ruido2(201, 12);
  private nB = ruido2(203, 8);

  constructor(public kit: Kit, larg: { x: [number, number]; z: [number, number] }) {
    const d = kit.dir;
    this.bx = larg.x;
    this.bz = larg.z;
    // grade não uniforme: fina no meio, linhas duplicadas na borda exata da cava (parede vertical)
    const linhas = (a: number, b: number, borda: number) => {
      const v: number[] = [];
      for (let x = a; x <= b + 1e-6; ) {
        v.push(x);
        x += Math.abs(x) < 4.8 ? 0.06 : 0.45;
      }
      for (const s of [-1, 1]) v.push(s * (borda - 0.0006), s * (borda + 0.0006));
      return [...new Set(v.map((x) => +x.toFixed(4)))].sort((p, q) => p - q);
    };
    this.xs = linhas(larg.x[0], larg.x[1], EXT.x);
    this.zs = linhas(larg.z[0], larg.z[1], EXT.z);
    const nx = this.xs.length, nz = this.zs.length;
    this.pos = new Float32Array(nx * nz * 3);
    this.lama = new Float32Array(nx * nz);
    const uv = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        this.pos[k * 3] = this.xs[i];
        this.pos[k * 3 + 2] = this.zs[j];
        uv[k * 2] = this.xs[i];
        uv[k * 2 + 1] = -this.zs[j];
      }
    const idx: number[] = [];
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1;
        idx.push(a, c, b, b, c, e);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("lama", new THREE.BufferAttribute(this.lama, 1));
    geo.setIndex(idx);

    // material da superfície: grama x lama por vértice
    const grama = texGrama(d), lama = texLama(d);
    const base: THREE.Material =
      d === "B"
        ? new THREE.MeshToonMaterial({ color: 0xffffff, map: grama, gradientMap: kit.grad })
        : d === "A"
          ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: grama, roughness: 0.78, clearcoat: 0.08, clearcoatRoughness: 0.6, bumpMap: kit.ruido, bumpScale: 0.25 })
          : new THREE.MeshStandardMaterial({ color: 0xffffff, map: grama, roughness: 0.95, bumpMap: grama, bumpScale: 1.6 });
    grama.repeat.set(d === "C" ? 0.5 : 0.4, d === "C" ? 0.5 : 0.4);
    const uL = { tLama: { value: lama }, rLama: { value: d === "C" ? 0.7 : 0.5 } };
    base.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uL);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float lama; varying float vLama; varying vec2 vUvM;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvLama = lama; vUvM = uv;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vLama; varying vec2 vUvM; uniform sampler2D tLama; uniform float rLama;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
           vec3 cl = texture2D(tLama, vUvM * rLama).rgb;
           float km = clamp(vLama, 0.0, 1.0);
           diffuseColor.rgb = mix(diffuseColor.rgb, cl, km) * (1.0 - 0.35 * clamp(vLama - 1.0, 0.0, 1.0));`,
        );
    };
    base.userData.semContorno = true; // chão sem contorno (ficha toon)
    this.topo = kit.m(geo, base, 0);
    this.topo.castShadow = true;
    this.topo.receiveShadow = true;

    // laterais + fundo com as camadas de terra (as mesmas da tampa do corte)
    this.tampaU = { uLencol: { value: -2.45 }, uLencolV: { value: 1 }, uFluxo: { value: 0 }, uMolhado: { value: new THREE.Vector4(0, 0, 0, 0) } };
    this.matTerra = matTampa(d, glslTerra(d), this.tampaU);
    this.saia = new THREE.Mesh(new THREE.BufferGeometry(), this.matTerra);
    this.saia.receiveShadow = true;
    this.g.add(this.topo, this.saia);
    this.aplica({ modo: "obra" });
  }

  /** altura da superfície no modo atual */
  private h(x: number, z: number, e: EstadoTerreno) {
    const borda = Math.min(x - this.bx[0], this.bx[1] - x, z - this.bz[0], this.bz[1] - z);
    const ond = this.kit.dir === "B" ? 0 : (this.nB(x * 0.05 + 0.5, z * 0.05 + 0.5) - 0.5) * 0.05 * Math.min(1, borda / 0.6);
    if (e.modo === "obra") {
      if (Math.abs(x) < EXT.x && Math.abs(z) < EXT.z) return { y: EXT.y, l: 1 };
      const dx = Math.max(0, Math.abs(x) - EXT.x), dz = Math.max(0, Math.abs(z) - EXT.z);
      const dd = Math.hypot(dx, dz);
      const suj = (e.sujeira ?? 0) * (1 - THREE.MathUtils.smoothstep(dd, 0.35, 0.75 + this.nR(x * 0.3 + 0.5, z * 0.3) * 0.3));
      return { y: ond - suj * 0.015, l: suj * 0.95 };
    }
    // cratera do gancho
    const a = Math.atan2(z, x);
    const nr = this.nR((Math.cos(a) * 0.5 + 0.5) * 0.9, (Math.sin(a) * 0.5 + 0.5) * 0.9);
    let rx = 2.05 + (nr - 0.5) * 0.5, rz = 1.22 + (nr - 0.5) * 0.3;
    // desmoronamento: setor da frente-direita (z+, x+) recua
    const col = e.colapso ?? 0;
    const setor = Math.max(0, Math.cos(a - 0.75)); // 0,75 rad: frente-direita
    const sk = Math.pow(setor, 3) * col;
    rx += sk * 0.55;
    rz += sk * 0.4;
    const r = Math.hypot(x / rx, z / rz);
    if (r > 1.0) {
      // grama com respingos de lama perto da borda
      const resp = Math.max(0, 1 - (r - 1) / 0.25) * (0.6 + 0.4 * this.nR(x * 2 + 0.3, z * 2 + 0.7));
      return { y: ond, l: resp > 0.5 ? 0.9 : resp * 0.8 };
    }
    // barranco íngreme na borda + fundo em bacia
    const prof = 0.95;
    let y = -prof * (1 - Math.pow(r, 6)) - 0.06 * (1 - r);
    y = Math.min(y, -0.02);
    // lóbulo de terra que escorregou para dentro (o barranco "derrete" para a água)
    const lob = sk * Math.exp(-Math.pow((r - 0.78) / 0.16, 2)) * 0.32;
    y += lob;
    return { y, l: 1.0 + (r < 0.97 ? 0.6 : 0) };
  }

  aplica(e: EstadoTerreno) {
    const k = JSON.stringify([e.modo, +(e.colapso ?? 0).toFixed(3), +(e.sujeira ?? 0).toFixed(3)]);
    if (e.lencol !== undefined) this.tampaU.uLencol.value = e.lencol;
    else this.tampaU.uLencol.value = -2.45;
    const m = e.molhado ?? [0, 0, 0, 0];
    (this.tampaU.uMolhado.value as THREE.Vector4).set(m[0], m[1], m[2], m[3]);
    if (k === this.chave) return;
    this.chave = k;
    const nx = this.xs.length, nz = this.zs.length;
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const q = j * nx + i;
        const r = this.h(this.xs[i], this.zs[j], e);
        this.pos[q * 3 + 1] = r.y;
        this.lama[q] = r.l;
      }
    const geo = this.topo.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.lama.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    this.montaSaia();
  }

  /** laterais e fundo, colados na borda da grade (sólido fechado) */
  private montaSaia() {
    const nx = this.xs.length, nz = this.zs.length;
    const P: number[] = [], I: number[] = [];
    const yb = FUNDO;
    const lado = (pts: [number, number, number][], fora: THREE.Vector3) => {
      const b = P.length / 3;
      for (const p of pts) P.push(p[0], p[1], p[2], p[0], yb, p[2]);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = b + i * 2, c = a + 2;
        // orienta para fora
        const v1 = new THREE.Vector3(pts[i + 1][0] - pts[i][0], 0, pts[i + 1][2] - pts[i][2]);
        const n = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, -1, 0));
        if (n.dot(fora) < 0) I.push(a, a + 1, c, c, a + 1, c + 1);
        else I.push(a, c, a + 1, c, c + 1, a + 1);
      }
    };
    const pt = (i: number, j: number): [number, number, number] => {
      const q = j * nx + i;
      return [this.pos[q * 3], this.pos[q * 3 + 1], this.pos[q * 3 + 2]];
    };
    lado(Array.from({ length: nx }, (_, i) => pt(i, nz - 1)), new THREE.Vector3(0, 0, 1));
    lado(Array.from({ length: nx }, (_, i) => pt(i, 0)), new THREE.Vector3(0, 0, -1));
    lado(Array.from({ length: nz }, (_, j) => pt(0, j)), new THREE.Vector3(-1, 0, 0));
    lado(Array.from({ length: nz }, (_, j) => pt(nx - 1, j)), new THREE.Vector3(1, 0, 0));
    const b = P.length / 3;
    P.push(this.bx[0], yb, this.bz[0], this.bx[1], yb, this.bz[0], this.bx[1], yb, this.bz[1], this.bx[0], yb, this.bz[1]);
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    geo.setIndex(I);
    geo.computeVertexNormals();
    this.saia.geometry.dispose();
    this.saia.geometry = geo;
    // a saia precisa ser registrada de novo no corte se trocar de geometria: os filhos de estêncil usam a geometria antiga
    this.saia.children.forEach((c) => ((c as THREE.Mesh).geometry = geo));
  }

  /** altura do terreno (modo obra) num ponto, sem a cava: para assentar coisas na grama */
  alturaGrama(x: number, z: number) {
    return this.kit.dir === "B" ? 0 : (this.nB(x * 0.05 + 0.5, z * 0.05 + 0.5) - 0.5) * 0.05;
  }
}
