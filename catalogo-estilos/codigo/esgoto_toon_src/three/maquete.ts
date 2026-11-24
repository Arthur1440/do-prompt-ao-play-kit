// Cenário fixo da maquete: mesa de madeira, tábua, bloco de terra em camadas, casa em corte (cozinha + banheiro),
// quintal com grama, calçada, rua e a rede de esgoto da rua. Canos, vaso, boneco, barata e algodão ficam em outros módulos.
import * as THREE from "three";
import { Kit, caixa, cil, esfera, junta, transf } from "./kit";
import { Corte, matTampa } from "./corte";
import { cilAB, cuia, V3 } from "./geo";
import { texAsfalto, texAzulejo, texCalcada, texCompensado, texConcreto, texGrama, texGramaBump, texGrelha, texMesa, texPiso, texReboco, texTelha } from "./tex";
import { rng } from "./rng";

// ------------------------------------------------------------------------------------------------ medidas (unidades da maquete)
export const FY = 0.05; // piso acabado da casa
export const WH = 0.7; // pé-direito
export const WT = 0.05; // espessura da parede
export const XA = -1.75, XB = 0.15, ZA = -1.0, ZB = 0.42, XI = -0.75; // casa e parede hidráulica (cozinha | banheiro)
export const ZM = (ZA + ZB) / 2; // cumeeira
export const RY = FY + WH + 0.3; // altura da cumeeira
export const ZP = -0.35; // linha do vaso e do ramal (plano do corte principal)
export const ZK = -0.72; // linha da cozinha
export const XV = -0.62; // vaso (origem no piso, frente para +x)
export const XS = -0.24; // caixa sifonada
export const BX = 1.95, BZ = 1.15, SOLO = 0.45; // meia-largura e meia-profundidade da tábua; espessura da terra
export const BUR: V3 = [0.46, 0, ZP]; // buraco do gancho
export const BUR_R = 0.165, BUR_P = 0.175;
export const REDE = { x: 1.84, y: -0.3, r: 0.068 }; // rede coletora da rua (ao longo de z)
export const YR0 = -0.13; // altura do ramal (eixo) quando está reto
export const LAV: V3 = [-0.36, FY, ZA + WT / 2 + 0.07]; // lavatório
export const PIA: V3 = [-1.12, FY + 0.215, -0.885]; // cuba da cozinha (topo da bancada)
export const RALO_CH: V3 = [0.04, FY, -0.84]; // ralo do chuveiro

/** altura do telhado (face de cima) num z qualquer */
export const yTelhado = (z: number) => RY - Math.abs(z - ZM) * (0.3 / (ZM - (ZA - 0.09)));

// GLSL das camadas de terra (lateral do bloco e tampa do corte usam o mesmo)
export const GLSL_TERRA = `
  float y = p.y;
  float ond = 0.012 * sin(p.x * 17.0 + p.z * 9.0) + 0.008 * sin(p.x * 41.0);
  vec3 humus = vec3(0.15, 0.095, 0.06), argila = vec3(0.38, 0.19, 0.095), areia = vec3(0.50, 0.36, 0.21), base = vec3(0.32, 0.24, 0.17);
  vec3 c = mix(argila, humus, smoothstep(-0.075, -0.045, y + ond));
  c = mix(areia, c, smoothstep(-0.25, -0.21, y + ond * 2.0));
  c = mix(base, c, smoothstep(-0.38, -0.35, y - ond));
  float n = vn2(vec2(p.x + p.z, p.y) * 34.0) * 0.6 + vn2(vec2(p.x - p.z, p.y) * 120.0) * 0.4;
  c *= 0.84 + 0.26 * n;
  float pd = pedras(vec2(p.x + p.z * 0.7, p.y) * 46.0, 0.22);
  c = mix(c * 0.55 + vec3(0.10, 0.09, 0.08), c, smoothstep(0.75, 1.0, pd));
  return c;`;

export class Maquete {
  g = new THREE.Group();
  telhado = new THREE.Group();
  mesa!: THREE.Mesh;
  buraco = new THREE.Group();
  burNeg: THREE.Mesh;
  burCrat: THREE.Mesh;
  monte: THREE.Mesh;
  uBur = { value: new THREE.Vector4(BUR[0], BUR[2], 0, 0) };
  uCaixa = { value: new THREE.Vector4(0, 0, 0, 0) };
  uCaixa2 = { value: new THREE.Vector4(0, 0, 0, 0) };
  grelhaCS: THREE.Group;
  frigideira: THREE.Group;
  pia: { agua: THREE.Mesh; aguaPiso: THREE.Mesh };
  aguaBanho!: THREE.Mesh;
  uRalo = { value: new THREE.Vector4(XS, ZP, 0.036, 0) };
  constructor(public kit: Kit, public corte: Corte) {
    const k = kit, C = corte, g = this.g;
    const M = (o: Parameters<Kit["mat"]>[0]) => k.mat(o);
    // ---------------------------------------------------------------- grupos do corte (tampas)
    const T = (glsl: string, dq = false) => matTampa(k.dir, glsl, {}, { destaque: dq });
    C.grupo("terra", T(GLSL_TERRA));
    C.grupo("madeira", T(`return vec3(0.72,0.55,0.34) * (0.86 + 0.2 * step(0.5, fract(p.y * 90.0)));`));
    C.grupo("tijolo", T(`
      float fy = fract(p.y / 0.045); float lin = floor(p.y / 0.045);
      float u = (abs(p.x) > 0.0 ? p.x : 0.0) + p.z;
      float fx = fract(u / 0.09 + mod(lin, 2.0) * 0.5);
      vec3 tij = vec3(0.70,0.34,0.19) * (0.9 + 0.18 * h21(vec2(lin, floor(u / 0.09 + mod(lin, 2.0) * 0.5))));
      vec3 arg = vec3(0.80,0.76,0.68);
      vec2 q = vec2(fract(u / 0.022), fract(p.y / 0.022));
      float furo = step(0.25, q.x) * step(q.x, 0.75) * step(0.25, q.y) * step(q.y, 0.75) * step(0.2, fy) * step(fy, 0.88);
      return (fy < 0.14 || fx < 0.06) ? arg : mix(tij, tij * 0.38, furo * 0.8);`));
    C.grupo("concreto", T(`vec3 c = vec3(0.60,0.59,0.56); float pd = pedras(vec2(p.x + p.z, p.y) * 170.0, 0.45); c = mix(c * 0.78, c, smoothstep(0.8, 1.0, pd)); c *= 0.92 + 0.12 * vn2(vec2(p.x + p.z, p.y) * 80.0); return c;`), false, 1);
    C.grupo("telha", T(`return vec3(0.62,0.27,0.14) * (0.9 + 0.12 * vn2(vec2(p.x, p.y) * 60.0));`));
    C.grupo("louca", T(`return vec3(0.93,0.93,0.91);`), false, 1);
    C.grupo("esgoto", T(`return vec3(0.60,0.33,0.17) * (0.95 + 0.06 * vn2(vec2(p.x, p.y) * 90.0));`), false, 1);
    C.grupo("pvc", T(`return vec3(0.90,0.90,0.88);`), false, 1);
    C.grupo("oco", T(`float g = 0.85 + 0.15 * vn2(vec2(p.x, p.y) * 40.0); return vec3(0.028,0.025,0.024) * g;`), false, 2);
    C.grupo("agua", T(`float r = 0.5 + 0.5 * sin(p.x * 70.0 - uT * 7.0 + sin(p.y * 90.0) * 1.5); return mix(vec3(0.13,0.44,0.78), vec3(0.34,0.66,0.92), r * 0.5);`, true), false, 3);
    C.grupo("entupe", T(`float n = vn2(vec2(p.x, p.y) * 200.0); return vec3(0.30,0.19,0.10) * (0.85 + 0.25 * n);`), false, 5);
    C.grupo("gordura", T(`float n = vn2(vec2(p.x, p.y) * 160.0); return vec3(0.93,0.83,0.52) * (0.9 + 0.14 * n);`, true), false, 4);

    // ---------------------------------------------------------------- mesa e tábua
    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), M({ map: texMesa(), chapada: 0x7c4a28, rough: 0.55, clear: 0.3, liso: true }));
    mesa.rotation.x = -Math.PI / 2;
    mesa.position.y = -SOLO - 0.05;
    mesa.receiveShadow = true;
    mesa.userData.semArame = true;
    this.mesa = mesa;
    g.add(mesa);
    const comp = texCompensado();
    const tabua = k.m(caixa(BX * 2 + 0.06, 0.05, BZ * 2 + 0.06, 0.008), M({ map: comp, color: 0xc89a64, rough: 0.6, liso: true }), 0, g, [0, -SOLO - 0.025, 0]);
    C.registra(tabua, "madeira");

    // ---------------------------------------------------------------- bloco de terra (lados em camadas, topo de grama com o buraco)
    const lado = matTampa(k.dir, GLSL_TERRA);
    const grama = M({ map: texGrama(), chapada: 0x6fa548, bump: texGramaBump(), bumpS: 1.2, rough: 0.62, clear: 0.05 }) as THREE.MeshPhysicalMaterial;
    grama.roughness = 0.95;
    const uBur = this.uBur;
    grama.customProgramCacheKey = () => "grama-buraco";
    grama.onBeforeCompile = (sh) => {
      sh.uniforms.uBur = uBur;
      sh.uniforms.uCaixa = this.uCaixa;
      sh.uniforms.uCaixa2 = this.uCaixa2;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWG;").replace("#include <project_vertex>", "#include <project_vertex>\nvWG = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWG;\nuniform vec4 uBur;\nuniform vec4 uCaixa;\nuniform vec4 uCaixa2;").replace("void main() {", "void main() {\n  if (uBur.w > 0.5 && length((vWG.xz - uBur.xy) / vec2(1.0, 1.0)) < uBur.z) discard;\n  if (uCaixa.w > 0.5 && max(abs(vWG.x - uCaixa.x), abs(vWG.z - uCaixa.y)) < uCaixa.z) discard;\n  if (uCaixa2.w > 0.5 && max(abs(vWG.x - uCaixa2.x), abs(vWG.z - uCaixa2.y)) < uCaixa2.z) discard;");
    };
    const fundoT = M({ color: 0x3a2a1c, rough: 0.9, liso: true });
    const solo = new THREE.Mesh(new THREE.BoxGeometry(BX * 2, SOLO, BZ * 2), [lado, lado, grama, fundoT, lado, lado]);
    solo.position.y = -SOLO / 2;
    solo.castShadow = solo.receiveShadow = true;
    g.add(solo);
    C.registra(solo, "terra");

    // buraco: furo (negativo da terra) + cratera vista por dentro + monte de terra ao lado
    this.burNeg = new THREE.Mesh(cuia(BUR_R, BUR_P), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.burNeg.position.set(BUR[0], 0.004, BUR[2]);
    this.buraco.add(this.burNeg);
    C.registra(this.burNeg, "terra", true);
    const crat = new THREE.SphereGeometry(BUR_R, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    crat.scale(1, BUR_P / BUR_R, 1);
    this.burCrat = new THREE.Mesh(crat, matTampa(k.dir, `return vec3(0.17, 0.11, 0.07) * (0.75 + 0.45 * vn2(p.xz * 140.0 + p.y * 60.0));`));
    (this.burCrat.material as THREE.Material).side = THREE.BackSide;
    this.burCrat.receiveShadow = true;
    this.burCrat.position.set(BUR[0], 0.001, BUR[2]);
    this.buraco.add(this.burCrat);
    C.recorta(this.burCrat);
    const mg = new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const mp = mg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i); const n = 0.8 + 0.4 * Math.sin(x * 60 + z * 40) * Math.sin(z * 50); mp.setXYZ(i, x * (1 + 0.1 * Math.sin(z * 30)), y * n, z); }
    mg.computeVertexNormals();
    this.monte = k.m(mg, matTampa(k.dir, `return vec3(0.40,0.22,0.12) * (0.8 + 0.3 * vn2(p.xz * 90.0));`), 0, this.buraco, [BUR[0] + 0.2, 0, BUR[2] - 0.34], [0, 0, 0], [1, 0.55, 0.8]);
    g.add(this.buraco);

    // ---------------------------------------------------------------- casa: laje do piso, pisos, paredes, oitões e telhado
    const laje = k.m(caixa(XB - XA, FY + 0.03, ZB - ZA, 0.003), M({ color: 0x9a968e, rough: 0.8, liso: true, semContorno: true }), 0, g, [(XA + XB) / 2, (FY - 0.03) / 2, (ZA + ZB) / 2]);
    C.registra(laje, "concreto");
    // furo do ralo no piso (aparece com a caixa sifonada: dá para ver a água pela grelha)
    const uRalo = this.uRalo;
    const furo = (mm: THREE.Material, chave: string) => {
      mm.customProgramCacheKey = () => chave;
      mm.onBeforeCompile = (sh) => {
        sh.uniforms.uRalo = uRalo;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWR;").replace("#include <project_vertex>", "#include <project_vertex>\nvWR = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWR;\nuniform vec4 uRalo;").replace("void main() {", "void main() {\n  if (uRalo.w > 0.5 && vWR.y > 0.0 && length(vWR.xz - uRalo.xy) < uRalo.z) discard;");
      };
    };
    furo(laje.material as THREE.Material, "laje-ralo");
    const pisoB = k.m(caixa(XB - XI, 0.004, ZB - ZA, 0), M({ map: texPiso([214, 214, 210], [160, 160, 156], 9, 8), estampa: true, semContorno: true, rough: 0.35, clear: 0.6, liso: true }), 0, g, [(XI + XB) / 2, FY + 0.002, (ZA + ZB) / 2]);
    const pisoC = k.m(caixa(XI - XA, 0.004, ZB - ZA, 0), M({ map: texPiso([176, 98, 66], [120, 80, 60], 10, 14), estampa: true, semContorno: true, rough: 0.45, clear: 0.5, liso: true }), 0, g, [(XA + XI) / 2, FY + 0.002, (ZA + ZB) / 2]);
    furo(pisoB.material as THREE.Material, "piso-ralo");
    C.recorta(pisoB); C.recorta(pisoC);

    const reb = texReboco([233, 224, 205]);
    const matParede = M({ map: reb, chapada: 0xf0e6d0, rough: 0.8, liso: true, clear: 0.05 });
    const paredes = new THREE.Group();
    g.add(paredes);
    /** parede ao longo de x (eixo "x") ou z (eixo "z"), com aberturas [u0,u1,v0,v1] (u no eixo da parede, v em y) */
    const parede = (eixo: "x" | "z", u0: number, u1: number, c: number, abert: [number, number, number, number][] = []) => {
      const y0 = FY, y1 = FY + WH;
      const caixas: [number, number, number, number][] = []; // u0,u1,v0,v1
      const cortes = [u0, ...abert.flatMap((a) => [a[0], a[1]]), u1].sort((a, b) => a - b);
      for (let i = 0; i < cortes.length - 1; i++) {
        const a = cortes[i], b = cortes[i + 1];
        if (b - a < 1e-4) continue;
        const ab = abert.find((o) => o[0] <= a + 1e-6 && o[1] >= b - 1e-6);
        if (!ab) caixas.push([a, b, y0, y1]);
        else { if (ab[2] > y0 + 1e-4) caixas.push([a, b, y0, ab[2]]); if (ab[3] < y1 - 1e-4) caixas.push([a, b, ab[3], y1]); }
      }
      for (const [a, b, v0, v1] of caixas) {
        const L = b - a, H = v1 - v0, m = (a + b) / 2;
        const geo = new THREE.BoxGeometry(eixo === "x" ? L : WT, H, eixo === "x" ? WT : L);
        const me = k.m(geo, matParede, 0, paredes, eixo === "x" ? [m, v0 + H / 2, c] : [c, v0 + H / 2, m]);
        C.registra(me, "tijolo");
      }
      // batentes e vidro nas aberturas de janela
      for (const a of abert) {
        if (a[2] <= FY + 0.01) continue;
        const m = (a[0] + a[1]) / 2, L = a[1] - a[0], H = a[3] - a[2];
        const vidro = k.m(new THREE.BoxGeometry(eixo === "x" ? L : 0.006, H, eixo === "x" ? 0.006 : L), M({ color: 0xbfd8e6, rough: 0.05, metal: 0.1, transp: 0.35, liso: true }), 0, paredes, eixo === "x" ? [m, a[2] + H / 2, c] : [c, a[2] + H / 2, m]);
        vidro.castShadow = false;
        C.recorta(vidro);
        const mb = M({ color: 0x5a3a24, rough: 0.5, liso: true });
        for (const [du, dv, lu, lv] of [[0, -H / 2, L, 0.012], [0, H / 2, L, 0.012], [-L / 2, 0, 0.012, H], [L / 2, 0, 0.012, H], [0, 0, 0.008, H]] as [number, number, number, number][]) {
          const b = k.m(new THREE.BoxGeometry(eixo === "x" ? lu : WT + 0.008, lv, eixo === "x" ? WT + 0.008 : lu), mb, 0, paredes, eixo === "x" ? [m + du, a[2] + H / 2 + dv, c] : [c, a[2] + H / 2 + dv, m + du]);
          C.recorta(b);
        }
      }
    };
    parede("x", XA - WT / 2, XB + WT / 2, ZA, [[-1.36, -1.04, FY + 0.33, FY + 0.58], [-0.44, -0.24, FY + 0.46, FY + 0.62]]);
    parede("x", XA - WT / 2, XB + WT / 2, ZB, [[-1.25, -0.98, FY, FY + 0.52], [-0.45, -0.15, FY + 0.3, FY + 0.58]]);
    parede("z", ZA, ZB, XA, [[-0.55, -0.25, FY + 0.3, FY + 0.58]]);
    parede("z", ZA, ZB, XB, [[0.06, 0.3, FY, FY + 0.52], [-0.62, -0.46, FY + 0.46, FY + 0.62]]);
    parede("z", ZA + WT / 2, ZB - WT / 2, XI, [[0.04, 0.3, FY, FY + 0.52]]);
    // portas (folhas de madeira) — a da frente e a do quintal
    const porta = M({ color: 0x7a4a2a, rough: 0.5, liso: true });
    C.recorta(k.m(new THREE.BoxGeometry(0.012, 0.52, 0.24), porta, 0, paredes, [XB + 0.03, FY + 0.26, 0.18], [0, 0.9, 0]));
    // oitões (triângulos) nas pontas
    for (const x of [XA, XB]) {
      const s = new THREE.Shape();
      s.moveTo(ZA - WT / 2, 0); s.lineTo(ZB + WT / 2, 0); s.lineTo(ZM, RY - FY - WH); s.lineTo(ZA - WT / 2, 0);
      const eg = new THREE.ExtrudeGeometry(s, { depth: WT, bevelEnabled: false });
      eg.rotateY(-Math.PI / 2);
      const me = k.m(eg, matParede, 0, paredes, [x + WT / 2, FY + WH, 0]);
      C.registra(me, "tijolo");
    }
    // telhado: duas águas de telha colonial, beiral de 9 cm
    const telha = texTelha();
    const zE0 = ZA - 0.09, zE1 = ZB + 0.09, yE = FY + WH - 0.06 * 0;
    const slopeDz = ZM - zE0, slopeDy = RY - yE;
    const Ls = Math.hypot(slopeDz, slopeDy), ang = Math.atan2(slopeDy, slopeDz);
    const larg = XB - XA + 0.2;
    const matTel = M({ map: telha, estampa: true, rough: 0.55, clear: 0.15, liso: true });
    const matForro = M({ color: 0x8a5a36, rough: 0.7, liso: true });
    const matBorda = M({ color: 0x9a4424, rough: 0.6, liso: true });
    for (const lado of [-1, 1]) {
      const geo = new THREE.BoxGeometry(larg, 0.03, Ls + 0.02);
      telha.repeat.set(9, 5);
      const me = new THREE.Mesh(geo, [matBorda, matBorda, matTel, matForro, matBorda, matBorda]);
      me.castShadow = me.receiveShadow = true;
      me.position.set((XA + XB) / 2, (yE + RY) / 2 + 0.015, (lado < 0 ? (zE0 + ZM) / 2 : (zE1 + ZM) / 2));
      me.rotation.x = lado < 0 ? -ang : ang;
      this.telhado.add(me);
      C.registra(me, "telha");
    }
    const cumeeira = k.m(cil(0.022, 0.022, larg, 20), matBorda, 0, this.telhado, [(XA + XB) / 2, RY + 0.03, ZM], [0, 0, Math.PI / 2]);
    C.registra(cumeeira, "telha");
    g.add(this.telhado);

    // ---------------------------------------------------------------- acabamento interno: azulejos
    const az = texAzulejo([150, 178, 156], 5, 7, false);
    az.repeat.set(3, 1);
    const azB = M({ map: az, estampa: true, rough: 0.25, clear: 0.7, liso: true });
    const hAz = 0.44;
    const painel = (w: number, pos: V3, ry: number, mat: THREE.Material, h = hAz) => { const p = k.m(new THREE.BoxGeometry(w, h, 0.004), mat, 0, g, pos, [0, ry, 0]); C.recorta(p); return p; };
    painel(XB - XI - WT, [(XI + XB) / 2, FY + hAz / 2, ZA + WT / 2 + 0.003], 0, azB);
    painel(ZB - ZA - WT, [XI + WT / 2 + 0.003, FY + hAz / 2, (ZA + ZB) / 2], Math.PI / 2, azB);
    painel(ZB - ZA - WT, [XB - WT / 2 - 0.003, FY + hAz / 2, (ZA + ZB) / 2], Math.PI / 2, azB);
    const azC = texAzulejo([236, 236, 230], 8, 8, true);
    azC.repeat.set(2, 1);
    painel(0.66, [-1.12, FY + 0.31, ZA + WT / 2 + 0.003], 0, M({ map: azC, estampa: true, rough: 0.2, clear: 0.7, liso: true }), 0.2);

    // ---------------------------------------------------------------- banheiro: lavatório, espelho, chuveiro, toalha, grelha do ralo
    const louca = M({ color: 0xf4f3ef, rough: 0.18, clear: 0.9, liso: true });
    const cromo = M({ color: 0xd8dadc, rough: 0.12, metal: 1, liso: true });
    const lav = new THREE.Group();
    lav.position.set(...LAV);
    g.add(lav);
    k.m(cil(0.022, 0.03, 0.2, 28), louca, 0, lav, [0, 0.1, 0]);
    const cuba = k.m(caixa(0.14, 0.04, 0.1, 0.018), louca, 0, lav, [0, 0.215, 0.005]);
    void cuba;
    k.m(new THREE.CircleGeometry(0.045, 32), M({ color: 0xd9dcdc, rough: 0.2, liso: true }), 0, lav, [0, 0.2355, 0.01], [-Math.PI / 2, 0, 0], [1.25, 0.8, 1]);
    k.m(cil(0.005, 0.005, 0.04, 12), cromo, 0, lav, [0, 0.25, -0.035]);
    k.m(cil(0.004, 0.004, 0.03, 12), cromo, 0, lav, [0, 0.268, -0.022], [Math.PI / 2, 0, 0]);
    const esp = k.m(caixa(0.13, 0.15, 0.006, 0.004), M({ color: 0xc9d4da, rough: 0.04, metal: 1, liso: true }), 0, lav, [0, 0.39, -0.068]);
    void esp;
    const chu = new THREE.Group();
    chu.position.set(RALO_CH[0], FY, ZA + WT / 2);
    g.add(chu);
    k.m(cil(0.004, 0.004, 0.06, 12), cromo, 0, chu, [0, 0.56, 0.03], [Math.PI / 2, 0, 0]);
    k.m(cil(0.024, 0.016, 0.01, 28), cromo, 0, chu, [0, 0.55, 0.062], [0.35, 0, 0]);
    k.m(cil(0.006, 0.006, 0.02, 12), cromo, 0, chu, [0.05, 0.36, 0.012], [Math.PI / 2, 0, 0]);
    k.m(caixa(0.05, 0.004, 0.05, 0.002), cromo, 0, g, [RALO_CH[0], FY + 0.004, RALO_CH[2]]);
    // toalha laranja na parede do quintal
    const toalha = k.m(caixa(0.012, 0.16, 0.12, 0.004), M({ color: 0xd8743a, rough: 0.9, clear: 0, liso: true }), 0, g, [XB - WT / 2 - 0.014, FY + 0.38, -0.12]);
    k.m(cil(0.003, 0.003, 0.15, 8), cromo, 0, g, [XB - WT / 2 - 0.012, FY + 0.46, -0.12], [Math.PI / 2, 0, 0]);
    C.recorta(toalha);
    // grelha do ralo (fica sempre no piso; a caixa sifonada aparece embaixo dela no capítulo dela)
    this.grelhaCS = new THREE.Group();
    const gtx = texGrelha();
    const gm = M({ color: 0xd0d2d4, rough: 0.18, metal: 1, liso: true, semContorno: true }) as THREE.MeshPhysicalMaterial;
    gm.alphaMap = gtx; gm.alphaTest = 0.5;
    k.m(cil(0.04, 0.04, 0.004, 32), gm, 0, this.grelhaCS, [0, 0.003, 0]);
    k.m(new THREE.TorusGeometry(0.04, 0.004, 8, 32), cromo, 0, this.grelhaCS, [0, 0.004, 0], [Math.PI / 2, 0, 0]);
    this.grelhaCS.position.set(XS, FY, ZP);
    g.add(this.grelhaCS);
    C.recorta(this.grelhaCS);

    // ---------------------------------------------------------------- cozinha: geladeira, bancada com cuba, cooktop e frigideira
    const branco = M({ color: 0xeeeae2, rough: 0.35, clear: 0.5, liso: true });
    const gel = k.m(caixa(0.2, 0.46, 0.18, 0.02), branco, 0, g, [-1.61, FY + 0.23, -0.87]);
    C.recorta(gel);
    C.recorta(k.m(caixa(0.008, 0.12, 0.008, 0.003), cromo, 0, g, [-1.53, FY + 0.3, -0.775]));
    const zB0 = ZA + WT / 2, zB1 = -0.79;
    const banc = k.m(caixa(0.66, 0.2, zB1 - zB0, 0.006), branco, 0, g, [-1.12, FY + 0.1, (zB0 + zB1) / 2]);
    C.recorta(banc);
    for (const x of [-1.34, -1.12, -0.9]) C.recorta(k.m(caixa(0.004, 0.17, 0.004, 0), M({ color: 0x9a948a, liso: true }), 0, g, [x + 0.105, FY + 0.1, zB1 + 0.002]));
    const tampo = k.m(caixa(0.68, 0.016, zB1 - zB0 + 0.02, 0.004), M({ color: 0x2c2a2a, rough: 0.25, clear: 0.8, liso: true }), 0, g, [-1.12, FY + 0.207, (zB0 + zB1) / 2 + 0.01]);
    C.recorta(tampo);
    // cuba inox (borda + fundo escuro) e torneira
    C.recorta(k.m(caixa(0.16, 0.004, 0.1, 0.008), M({ color: 0xc9ccce, rough: 0.25, metal: 1, liso: true }), 0, g, [PIA[0], PIA[1] + 0.002, PIA[2]]));
    C.recorta(k.m(caixa(0.13, 0.002, 0.075, 0.01), M({ color: 0x6c7074, rough: 0.35, metal: 1, liso: true }), 0, g, [PIA[0], PIA[1] + 0.0045, PIA[2]]));
    C.recorta(k.m(cil(0.005, 0.005, 0.07, 12), cromo, 0, g, [PIA[0], PIA[1] + 0.035, PIA[2] - 0.055]));
    C.recorta(k.m(new THREE.TorusGeometry(0.025, 0.004, 8, 24, Math.PI), cromo, 0, g, [PIA[0], PIA[1] + 0.07, PIA[2] - 0.03], [0, Math.PI / 2, 0]));
    // água na cuba (sobe quando entope) e lâmina no piso (transborda)
    const aguaMat = M({ color: 0x7fb8da, tipo: "agua", rough: 0.05, clear: 1, transp: 0.82, liso: true });
    const aguaCuba = k.m(caixa(0.13, 0.03, 0.075, 0.01), aguaMat, 0, g, [PIA[0], PIA[1] - 0.01, PIA[2]]);
    aguaCuba.visible = false;
    const aguaPiso = k.m(new THREE.CircleGeometry(0.3, 48), aguaMat, 0, g, [PIA[0] + 0.05, FY + 0.006, -0.55], [-Math.PI / 2, 0, 0]);
    aguaPiso.visible = false;
    C.recorta(aguaCuba); C.recorta(aguaPiso);
    this.pia = { agua: aguaCuba, aguaPiso };
    this.aguaBanho = k.m(new THREE.CircleGeometry(0.42, 56), aguaMat, 0, g, [-0.3, FY + 0.007, -0.32], [-Math.PI / 2, 0, 0]);
    this.aguaBanho.visible = false;
    C.recorta(this.aguaBanho);
    // cooktop + frigideira
    C.recorta(k.m(caixa(0.16, 0.004, 0.12, 0.004), M({ color: 0x111214, rough: 0.08, clear: 1, liso: true }), 0, g, [-1.36, PIA[1] + 0.002, -0.885]));
    this.frigideira = new THREE.Group();
    const panela = M({ color: 0x2a2b2e, rough: 0.35, metal: 0.6, liso: true });
    k.m(cil(0.038, 0.032, 0.014, 32), panela, 0, this.frigideira, [0, 0.007, 0]);
    k.m(caixa(0.07, 0.006, 0.01, 0.003), M({ color: 0x1a1210, rough: 0.6, liso: true }), 0, this.frigideira, [0.07, 0.012, 0]);
    k.m(cil(0.033, 0.033, 0.002, 32), M({ color: 0xe7c25a, tipo: "gordura", rough: 0.1, clear: 1, liso: true }), 0, this.frigideira, [0, 0.012, 0]);
    this.frigideira.position.set(-1.38, PIA[1] + 0.004, -0.89);
    g.add(this.frigideira);
    C.recorta(this.frigideira);

    // ---------------------------------------------------------------- quintal: cerca, árvore, arbustos
    const R = rng(9);
    const folha = M({ color: 0x4f7a3a, rough: 0.9, clear: 0, bump: texGramaBump(), bumpS: 2 });
    const tronco = M({ color: 0x5a3c26, rough: 0.8, liso: true });
    const arvore = (x: number, z: number, h: number, s: number) => {
      k.m(cil(0.012 * s, 0.018 * s, h, 12), tronco, 0, g, [x, h / 2, z]);
      for (let i = 0; i < 7; i++) {
        const a = R.r() * Math.PI * 2, d = R.r() * 0.07 * s;
        k.m(esfera(0.06 * s * (0.75 + R.r() * 0.5), 20, 14), folha, 0, g, [x + Math.cos(a) * d, h + 0.02 + R.r() * 0.09 * s, z + Math.sin(a) * d]);
      }
    };
    arvore(1.3, -0.92, 0.36, 1.6);
    arvore(-1.86 + 0.0, -1.02, 0.22, 1.0);
    for (const [x, z, s] of [[0.32, -1.02, 0.9], [1.52, -0.42, 0.8], [0.42, 0.95, 0.85], [-1.85, 0.6, 0.8]] as [number, number, number][])
      for (let i = 0; i < 4; i++) k.m(esfera(0.04 * s * (0.8 + R.r() * 0.4), 16, 12), folha, 0, g, [x + (R.r() - 0.5) * 0.08, 0.03 * s, z + (R.r() - 0.5) * 0.08]);
    const madeiraCerca = M({ color: 0xe8e2d4, rough: 0.6, liso: true });
    for (let x = 0.24; x <= 1.46; x += 0.07) k.m(caixa(0.018, 0.12, 0.012, 0.003), madeiraCerca, 0, g, [x, 0.06, -BZ + 0.03]);
    for (const y of [0.04, 0.095]) k.m(caixa(1.26, 0.014, 0.006, 0.002), madeiraCerca, 0, g, [0.85, y, -BZ + 0.022]);

    // ---------------------------------------------------------------- calçada, meio-fio, rua e a rede de esgoto
    const calc = k.m(new THREE.BoxGeometry(0.25, 0.03, BZ * 2), M({ map: texCalcada(), chapada: 0xb3aea4, rough: 0.85, liso: true }), 0, g, [1.575, 0.015 - 0.002, 0]);
    C.registra(calc, "concreto");
    const mf = k.m(new THREE.BoxGeometry(0.025, 0.035, BZ * 2), M({ color: 0xbdb8ad, rough: 0.8, liso: true }), 0, g, [1.7125, 0.0155, 0]);
    C.registra(mf, "concreto");
    const asf = k.m(new THREE.BoxGeometry(BX - 1.725, 0.012, BZ * 2), M({ map: texAsfalto(), chapada: 0x4c4d52, rough: 0.9, liso: true }), 0, g, [(BX + 1.725) / 2, 0.004, 0]);
    C.registra(asf, "concreto");
    const pv = k.m(cil(0.05, 0.05, 0.004, 32), M({ color: 0x3a3836, rough: 0.5, metal: 0.6, liso: true }), 0, g, [REDE.x, 0.012, 0.62]);
    void pv;
    const concMat = M({ map: texConcreto(3), chapada: 0xa5a199, rough: 0.85, liso: true });
    const rede = k.m(cilAB([REDE.x, REDE.y, -BZ], [REDE.x, REDE.y, BZ], REDE.r, 40), concMat, 0, g);
    C.registra(rede, "concreto");
    const redeOco = new THREE.Mesh(cilAB([REDE.x, REDE.y, -BZ - 0.002], [REDE.x, REDE.y, BZ + 0.002], REDE.r * 0.8, 40), M({ color: 0x1c1a18, rough: 0.9, liso: true }));
    g.add(redeOco);
    C.registra(redeOco, "oco");
    const redeAgua = new THREE.Mesh(cilAB([REDE.x, REDE.y - REDE.r * 0.42, -BZ - 0.001], [REDE.x, REDE.y - REDE.r * 0.42, BZ + 0.001], REDE.r * 0.4, 32), M({ color: 0x5a6a62, tipo: "agua", rough: 0.2, liso: true }));
    g.add(redeAgua);
    C.registra(redeAgua, "agua");
    void junta; void transf;
    // tudo da maquete que fica na frente do corte some com ele (árvores, cerca, louças); a mesa não
    C.recorta(g);
    (mesa.material as THREE.Material).clippingPlanes = [];
  }

  /** k: 0 = sem buraco, 1 = buraco cavado inteiro */
  setBuraco(k: number) {
    const on = k > 0.02;
    this.buraco.visible = on;
    this.uBur.value.set(BUR[0], BUR[2], BUR_R * k, on ? 1 : 0);
    this.burNeg.scale.set(k, Math.max(0.05, k), k);
    this.burCrat.scale.set(k, Math.max(0.05, k), k);
    this.monte.scale.set(Math.max(0.01, k), 0.55 * Math.max(0.01, k), 0.8 * Math.max(0.01, k));
  }
}
