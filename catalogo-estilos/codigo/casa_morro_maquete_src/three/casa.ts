import * as THREE from "three";
import { Kit } from "./kit";
import { caixaR, cil, esfera, junta, LTOT, noCaminho, perfilArco, perfilTunel, ptCaminho, RI, RM, RO, S_CURVA, S_QUARTO, transf, V0, V3, varre, XC, XF, ZF, ZQ } from "./geo";
import { altura, morro } from "./terreno";
import { rng } from "./rng";
import { texMadeira } from "./tex";
import { texBrilho, texColcha, texConcreto, texPedra, texPorta, texTabuas, texTapete } from "./tex3";

export type Casa = ReturnType<typeof montaCasa>;

const S_TUBO_COR = S_CURVA + (S_QUARTO - S_CURVA) / 2; // tubo de luz do corredor
export const P_TUBO_COR = ptCaminho(S_TUBO_COR);
export const P_TUBO_QUA: V3 = [XC, 0, ZQ];
export const P_CHAMINE: V3 = [XF + 0.32, 0, 0.62];
export const P_PESSOA: V3 = [-0.98, 0.025, ZQ + 0.14];
export const P_CAMA: V3 = [-0.92, 0.025, ZQ - 0.28];

export function montaCasa(kit: Kit, cena: THREE.Object3D) {
  const d = kit.dir, A = d === "A", B = d === "B";
  const g = new THREE.Group();
  cena.add(g);
  const madeira = texMadeira(false, false);
  madeira.repeat.set(1, 3);

  // ---------------- túnel de terra (antes do concreto)
  const matTerra = kit.mat({ color: B ? 0x9a5a33 : A ? 0x7a5233 : 0x8a5c3f, rough: 0.95, clear: 0.02, dentro: true, side: THREE.DoubleSide });
  const tunel = kit.m(varre(perfilTunel(RI + 0.004), 0, LTOT + 0.002, { fechado: false }), matTerra, 2, g);
  // lama: a terra do teto escurece (uniform na cor) e um bolo de lama cai
  const corTerra = (matTerra as THREE.MeshStandardMaterial).color.clone();

  // ---------------- abóbada de concreto (cai pela vala e assenta)
  const tc = texConcreto(d);
  tc.repeat.set(3, 3);
  const matConc = kit.mat({ color: B ? 0xcfc9bf : 0xdcd7cf, map: tc, rough: 0.8, clear: 0.05, dentro: true });
  const concreto = new THREE.Group();
  kit.m(varre(perfilArco(RI, RO), 0, LTOT, { uvEsc: 1.2 }), matConc, 2.5, concreto);
  g.add(concreto);

  // ---------------- manta (por fora do concreto): desenrola do começo ao fim do caminho
  const uManta = { value: 1 };
  const matManta = kit.mat({ color: B ? 0x34343f : 0x2a2a2f, rough: B ? 0.6 : 0.32, clear: 0.6 });
  const geoManta = varre(perfilArco(RO + 0.003, RM, V0, 28), 0, LTOT);
  // atributo com o "s" de cada vértice (para revelar ao longo do caminho)
  {
    const p = geoManta.attributes.position as THREE.BufferAttribute;
    const aS = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      // projeta no caminho: mais perto do eixo
      let best = 1e9, bs = 0;
      for (let k = 0; k <= 80; k++) {
        const s = (LTOT * k) / 80;
        const q = noCaminho(s).p;
        const dd = (q.x - p.getX(i)) ** 2 + (q.z - p.getZ(i)) ** 2;
        if (dd < best) (best = dd), (bs = s);
      }
      aS[i] = bs / LTOT;
    }
    geoManta.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
  }
  kit.hook(matManta, {
    nome: "manta",
    f: (sh) => {
      sh.uniforms.uManta = uManta;
      sh.vertexShader = sh.vertexShader.replace("void main() {", "attribute float aS; varying float vS;\nvoid main() { vS = aS;");
      sh.fragmentShader = sh.fragmentShader.replace("void main() {", "uniform float uManta; varying float vS;\nvoid main() { if (vS > uManta + 0.001) discard;");
    },
  });
  const manta = kit.m(geoManta, matManta, 2, g);
  // rolo da manta na ponta que está desenrolando
  const rolo = kit.m(cil(0.05, 0.05, 2 * RM + 0.08, 24).rotateZ(Math.PI / 2), matManta, 2, g);

  // ---------------- vigas de madeira em arco (forram o concreto por dentro)
  const matViga = kit.mat({ color: B ? 0xb8763d : 0xffffff, map: B ? null : madeira, rough: 0.6, dentro: true });
  const vigas: THREE.Mesh[] = [];
  const nV = Math.floor(LTOT / 0.24);
  for (let i = 0; i <= nV; i++) {
    const s = Math.min(LTOT - 0.03, 0.06 + i * 0.24);
    const v = kit.m(varre(perfilArco(RI - 0.032, RI - 0.002, V0, 24), s - 0.022, s + 0.022, { passos: 1 }), matViga, 2, g);
    v.userData.s = s;
    vigas.push(v);
  }
  // cumeeira (viga ao longo do topo)
  const cumeeira = kit.m(varre([[-0.025, RI + V0 - 0.04], [0.025, RI + V0 - 0.04], [0.025, RI + V0 - 0.005], [-0.025, RI + V0 - 0.005]].reverse() as [number, number][], 0.02, LTOT - 0.01), matViga, 2, g);

  // ---------------- piso de tábuas
  const tt = texTabuas(d);
  tt.repeat.set(1, 4);
  const matPiso = kit.mat({ map: tt, rough: 0.6, dentro: true });
  kit.m(varre([[-RI, 0], [RI, 0], [RI, 0.025], [-RI, 0.025]], 0, LTOT, { uvEsc: 1.0 }), matPiso, 2, g);

  // ---------------- móveis do quarto (perto do corte)
  const moveis = new THREE.Group();
  g.add(moveis);
  const mm = (o: Parameters<Kit["mat"]>[0]) => kit.mat({ ...o, dentro: true });
  const madeiraEsc = kit.mat({ color: B ? 0x8a4f22 : 0x6b4325, rough: 0.55, dentro: true });
  // cama com colcha de retalhos
  const cama = new THREE.Group();
  cama.position.set(...P_CAMA);
  moveis.add(cama);
  kit.m(caixaR(0.66, 0.08, 0.34, 0.015), madeiraEsc, 2, cama, [0, 0.06, 0]);
  kit.m(caixaR(0.62, 0.07, 0.31, 0.03), mm({ color: 0xf3eee4, rough: 0.8 }), 2, cama, [0, 0.13, 0]);
  const colcha = kit.m(caixaR(0.46, 0.035, 0.33, 0.015), mm({ map: texColcha(d), rough: 0.85 }), 2, cama, [-0.09, 0.175, 0]);
  kit.m(caixaR(0.12, 0.05, 0.24, 0.025), mm({ color: 0xffffff, rough: 0.85 }), 2, cama, [0.24, 0.185, 0]);
  kit.m(caixaR(0.04, 0.22, 0.34, 0.012), madeiraEsc, 2, cama, [0.33, 0.11, 0]); // cabeceira
  // mesinha redonda, cadeira e o morador (boneco genérico, de costas para a câmera)
  const mesa = new THREE.Group();
  mesa.position.set(P_PESSOA[0] + 0.3, 0.025, P_PESSOA[2]);
  moveis.add(mesa);
  kit.m(cil(0.13, 0.13, 0.025, 32), madeiraEsc, 2, mesa, [0, 0.19, 0]);
  kit.m(cil(0.018, 0.026, 0.18, 12), madeiraEsc, 2, mesa, [0, 0.09, 0]);
  kit.m(cil(0.07, 0.07, 0.012, 20), madeiraEsc, 2, mesa, [0, 0.006, 0]);
  kit.m(cil(0.025, 0.02, 0.05, 16), mm({ color: 0xe9e2d0 }), 2, mesa, [0.03, 0.228, 0.04]); // caneca
  const cadeira = new THREE.Group();
  cadeira.position.set(P_PESSOA[0] - 0.02, 0.025, P_PESSOA[2]);
  moveis.add(cadeira);
  kit.m(caixaR(0.13, 0.025, 0.13, 0.008), madeiraEsc, 2, cadeira, [0, 0.11, 0]);
  kit.m(caixaR(0.025, 0.16, 0.13, 0.008), madeiraEsc, 2, cadeira, [-0.065, 0.2, 0]);
  for (const [x, z] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) kit.m(cil(0.009, 0.009, 0.11, 8), madeiraEsc, 1.5, cadeira, [x, 0.055, z]);
  const pessoa = boneco(kit, mm);
  pessoa.position.set(P_PESSOA[0], P_PESSOA[1], P_PESSOA[2]);
  pessoa.rotation.y = -Math.PI / 2; // olha para +x (de costas para quem olha o corte)
  moveis.add(pessoa);
  // tapete redondo
  const tapete = kit.m(cil(0.24, 0.24, 0.008, 40), mm({ map: texTapete(d), rough: 0.9 }), 1.5, moveis, [-0.85, 0.03, ZQ]);
  tapete.castShadow = false;
  // abajur de pé (luz quente)
  const abajur = new THREE.Group();
  abajur.position.set(-1.32, 0.025, ZQ + 0.36);
  moveis.add(abajur);
  kit.m(cil(0.006, 0.006, 0.36, 8), mm({ color: 0x3a2a1c, metal: 0.5 }), 1.5, abajur, [0, 0.18, 0]);
  kit.m(cil(0.04, 0.04, 0.01, 16), mm({ color: 0x3a2a1c }), 1.5, abajur, [0, 0.005, 0]);
  const cupula = kit.m(cil(0.045, 0.07, 0.07, 24, true), kit.mat({ color: 0xf5dfb0, emissive: 0xffb45a, ei: 0, side: THREE.DoubleSide, dentro: true }), 1.5, abajur, [0, 0.37, 0]);
  const luzAbajur = new THREE.PointLight(0xffb066, 0, 1.6, 1.6);
  luzAbajur.position.set(0, 0.34, 0);
  abajur.add(luzAbajur);
  // estante com potes na parede norte do quarto
  const estante = new THREE.Group();
  estante.position.set(-0.62, 0.0, ZQ + 0.43);
  moveis.add(estante);
  for (const y of [0.18, 0.3]) kit.m(caixaR(0.34, 0.015, 0.07, 0.005), madeiraEsc, 1.5, estante, [0, y, 0]);
  const coresPote = [0xd97b3d, 0x7fb069, 0xe9c46a, 0xb5655c, 0x6d9dc5];
  const rp = rng(5);
  for (let i = 0; i < 7; i++) {
    const y = i < 4 ? 0.19 : 0.31, x = -0.13 + (i % 4) * 0.085 + rp() * 0.02;
    const h = 0.04 + rp() * 0.03;
    kit.m(cil(0.017, 0.019, h, 14), mm({ color: coresPote[i % 5], rough: 0.4, clear: 0.6 }), 1.5, estante, [x, y + h / 2, 0]);
  }

  // ---------------- sala (perto da fachada): poltrona, lareira, tapete
  const sala = new THREE.Group();
  g.add(sala);
  const poltrona = new THREE.Group();
  poltrona.position.set(XF - 0.2, 0.025, 0.55);
  poltrona.rotation.y = 0.5;
  sala.add(poltrona);
  const verde = mm({ color: B ? 0x6f9a4a : 0x5f7f4f, rough: 0.85 });
  kit.m(caixaR(0.2, 0.08, 0.19, 0.03), verde, 2, poltrona, [0, 0.07, 0]);
  kit.m(caixaR(0.2, 0.2, 0.05, 0.025), verde, 2, poltrona, [0, 0.16, -0.08]);
  kit.m(caixaR(0.04, 0.12, 0.19, 0.02), verde, 2, poltrona, [-0.1, 0.12, 0]);
  kit.m(caixaR(0.04, 0.12, 0.19, 0.02), verde, 2, poltrona, [0.1, 0.12, 0]);
  const pedraMat = kit.mat({ map: texPedra(d), color: 0xffffff, rough: 0.8, dentro: true });
  (pedraMat as THREE.MeshStandardMaterial).map!.repeat.set(0.6, 0.6);
  const lareira = new THREE.Group();
  lareira.position.set(XF + 0.36, 0.025, 0.62);
  lareira.rotation.y = -Math.PI / 2;
  sala.add(lareira);
  kit.m(caixaR(0.3, 0.28, 0.12, 0.02), pedraMat, 2, lareira, [0, 0.14, 0]);
  kit.m(caixaR(0.16, 0.12, 0.02, 0.01), mm({ color: 0x1a1210 }), 1.5, lareira, [0, 0.09, 0.055]);
  const fogo = kit.m(esfera(0.045, 16, 12), kit.mat({ basico: true, color: 0xff9a3c }), 0, lareira, [0, 0.07, 0.06], undefined, [1, 0.8, 0.5]);
  const luzFogo = new THREE.PointLight(0xff8a3a, 0, 1.4, 1.6);
  luzFogo.position.set(XF + 0.24, 0.14, 0.62);
  sala.add(luzFogo);
  kit.m(cil(0.18, 0.18, 0.008, 36), mm({ map: texTapete(d), rough: 0.9 }), 1.5, sala, [XF, 0.03, 0.55]).castShadow = false;
  // cano da lareira até a chaminé no meio da grama
  const hCh = altura(P_CHAMINE[0], P_CHAMINE[2]);
  const matPedraFora = kit.mat({ map: texPedra(d), rough: 0.8 });
  (matPedraFora as THREE.MeshStandardMaterial).map!.repeat.set(0.5, 0.5);
  const chamine = kit.m(caixaR(0.12, 0.26, 0.12, 0.02), matPedraFora, 2.5, g, [P_CHAMINE[0], hCh + 0.06, P_CHAMINE[2]]);
  kit.m(caixaR(0.15, 0.03, 0.15, 0.01), matPedraFora, 2, chamine, [0, 0.13, 0]);

  // ---------------- tubos de luz (cogumelos de metal na grama)
  const metal = kit.mat({ color: B ? 0xd9dee3 : 0xd5d9de, metal: 1, rough: B ? 0.5 : 0.18, clear: 0.8 });
  const espelho = kit.mat({ color: 0xf2f4f6, metal: 1, rough: 0.08, clear: 1, side: THREE.DoubleSide, semContorno: true });
  const domo = kit.mat({ color: 0xe8f4ff, rough: 0.05, clear: 1, emissive: 0xfff3c4, ei: 0, transparent: !B, opacity: B ? 1 : 0.85 });
  const tubos: { g: THREE.Group; topo: number; disco: THREE.Mesh; cone: THREE.Mesh; raio?: THREE.Mesh }[] = [];
  const brilho = texBrilho();
  for (const [i, P] of [P_TUBO_QUA, P_TUBO_COR].entries()) {
    const tg = new THREE.Group();
    const topo = altura(P[0], P[2]);
    tg.position.set(P[0], 0, P[2]);
    g.add(tg);
    const y0 = V0 + RI - 0.01, y1 = topo + 0.02;
    const H = y1 - y0;
    if (i === 0) {
      // tubo do quarto: cortado ao meio pelo plano do corte (mostra o espelho por dentro)
      const meio = new THREE.CylinderGeometry(0.07, 0.07, H, 28, 1, true, 0, Math.PI);
      meio.rotateY(Math.PI / 2); // metade voltada para +x (para dentro do morro)
      kit.m(meio, espelho, 2, tg, [0, y0 + H / 2, 0]);
      const borda = new THREE.CylinderGeometry(0.078, 0.078, H, 28, 1, true, 0, Math.PI);
      borda.rotateY(Math.PI / 2);
      kit.m(borda, metal, 2, tg, [0, y0 + H / 2, 0]);
    } else {
      kit.m(cil(0.075, 0.075, H, 24, true), metal, 2, tg, [0, y0 + H / 2, 0]);
    }
    // chapéu de cogumelo (domo de captação)
    const chapeu = kit.m(new THREE.SphereGeometry(0.12, 28, 14, 0, i === 0 ? Math.PI : Math.PI * 2, 0, Math.PI / 2), domo, 2.5, tg, [0, y1 + 0.02, 0]);
    if (i === 0) chapeu.rotation.y = -Math.PI / 2;
    kit.m(cil(0.12, 0.13, 0.03, 28), metal, 2, tg, [0, y1 + 0.005, 0]);
    // disco difusor no teto (brilha sem lâmpada)
    const disco = kit.m(cil(0.075, 0.075, 0.012, 32), kit.mat({ basico: true, color: 0xfff6dc }), 0, tg, [0, y0 - 0.006, 0]);
    // cone de luz no ar (aditivo)
    const coneG = new THREE.ConeGeometry(0.34, 0.68, 40, 1, true);
    coneG.translate(0, -0.34, 0);
    const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, alphaMap: brilho }));
    cone.position.set(0, y0 - 0.01, 0);
    cone.userData.semWire = true;
    tg.add(cone);
    tubos.push({ g: tg, topo: y1, disco, cone });
  }
  // raio de sol quicando dentro do tubo do quarto (zigue-zague)
  const zig: V3[] = [];
  {
    const y0 = V0 + RI, y1 = tubos[0].topo;
    const n = 7;
    for (let i = 0; i <= n; i++) zig.push([0.03, y1 - ((y1 - y0) * i) / n, i % 2 ? -0.055 : 0.055]);
  }
  const raioG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zig.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0), 120, 0.009, 8, false);
  const uRaio = { value: 0 };
  const raioMat = new THREE.ShaderMaterial({
    uniforms: { uK: uRaio, uT: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uK, uT; varying vec2 vUv; void main(){ if (vUv.x > uK) discard; float f = 0.6 + 0.4*sin(vUv.x*60.0 - uT*14.0); gl_FragColor = vec4(vec3(1.0,0.93,0.65)*(2.2+f), 1.0); }`,
    toneMapped: false,
  });
  const raio = new THREE.Mesh(raioG, raioMat);
  raio.userData.semWire = true;
  tubos[0].g.add(raio);
  tubos[0].raio = raio;
  const luzTubo = new THREE.SpotLight(0xfff0d0, 0, 2.4, 0.75, 0.6, 1.4);
  luzTubo.position.set(XC + 0.12, V0 + RI - 0.02, ZQ);
  luzTubo.target.position.set(XC + 0.2, 0, ZQ);
  g.add(luzTubo, luzTubo.target);
  const luzTubo2 = new THREE.SpotLight(0xfff0d0, 0, 2.4, 0.8, 0.6, 1.4);
  luzTubo2.position.set(P_TUBO_COR[0], V0 + RI - 0.02, P_TUBO_COR[2]);
  luzTubo2.target.position.set(P_TUBO_COR[0], 0, P_TUBO_COR[2]);
  g.add(luzTubo2, luzTubo2.target);
  // respiro (outro cogumelo de metal)
  const pResp: V3 = [1.05, 0, -0.2];
  const hR = altura(pResp[0], pResp[2]);
  const respiro = new THREE.Group();
  respiro.position.set(pResp[0], hR, pResp[2]);
  g.add(respiro);
  kit.m(cil(0.03, 0.03, 0.12, 16), metal, 2, respiro, [0, 0.05, 0]);
  kit.m(new THREE.SphereGeometry(0.07, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal, 2, respiro, [0, 0.11, 0]);

  // ---------------- frente: muro de pedra com a boca do arco
  const frente = fachada(kit, g);

  return { g, tunel, matTerra, corTerra, concreto, manta, uManta, rolo, vigas, cumeeira, moveis, cama, colcha, mesa, pessoa, abajur, cupula, luzAbajur, sala, fogo, luzFogo, chamine, tubos, uRaio, raioMat, luzTubo, luzTubo2, respiro, frente, matViga };
}

// ------------------------------------------------------------------ boneco genérico sentado (de costas)
function boneco(kit: Kit, mm: (o: Parameters<Kit["mat"]>[0]) => THREE.Material) {
  const g = new THREE.Group();
  const camisa = mm({ color: kit.dir === "B" ? 0x3f7fb5 : 0x3c6e91, rough: 0.8 });
  const calca = mm({ color: 0x5a4a3a, rough: 0.85 });
  const pele = mm({ color: 0xe2b48c, rough: 0.7 });
  const cabelo = mm({ color: 0x4a3020, rough: 0.8 });
  // quadril e coxas (sentado), pernas para baixo
  kit.m(caixaR(0.09, 0.05, 0.11, 0.02), calca, 2, g, [0, 0.14, 0]);
  for (const z of [-0.028, 0.028]) {
    kit.m(caixaR(0.11, 0.04, 0.042, 0.018), calca, 2, g, [0.05, 0.145, z]);
    kit.m(caixaR(0.04, 0.12, 0.04, 0.016), calca, 2, g, [0.1, 0.08, z]);
    kit.m(caixaR(0.06, 0.025, 0.045, 0.01), mm({ color: 0x2c1e14 }), 1.5, g, [0.115, 0.015, z]);
  }
  // tronco
  const tronco = kit.m(caixaR(0.085, 0.14, 0.12, 0.035), camisa, 2, g, [-0.005, 0.235, 0]);
  void tronco;
  // braços apoiados na mesa
  for (const z of [-0.07, 0.07]) {
    kit.m(caixaR(0.035, 0.1, 0.035, 0.015), camisa, 2, g, [0.0, 0.25, z], [0, 0, 0.5]);
    kit.m(caixaR(0.1, 0.03, 0.032, 0.014), camisa, 2, g, [0.06, 0.205, z * 0.85]);
  }
  const cabeca = new THREE.Group();
  cabeca.position.set(0, 0.355, 0);
  g.add(cabeca);
  kit.m(esfera(0.052, 28, 20), pele, 2, cabeca, [0, 0, 0]);
  kit.m(new THREE.SphereGeometry(0.055, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), cabelo, 2, cabeca, [-0.004, 0.006, 0], [0, 0, 0.35]);
  g.userData.cabeca = cabeca;
  return g;
}

// ------------------------------------------------------------------ fachada da toca (norte)
function fachada(kit: Kit, pai: THREE.Group) {
  const d = kit.dir, B = d === "B";
  const g = new THREE.Group();
  pai.add(g);
  const hF = (x: number) => altura(x, ZF - 0.02);
  // muro da frente (pedra) com a boca do arco
  const w = 0.74;
  const sh = new THREE.Shape();
  sh.moveTo(XF - w, 0);
  sh.lineTo(XF + w, 0);
  for (let i = 0; i <= 24; i++) {
    const x = XF + w - (2 * w * i) / 24;
    sh.lineTo(x, hF(x) - 0.01);
  }
  sh.lineTo(XF - w, 0);
  const boca = new THREE.Path();
  boca.moveTo(XF - RM, 0);
  boca.lineTo(XF - RM, V0);
  boca.absarc(XF, V0, RM, Math.PI, 0, true);
  boca.lineTo(XF + RM, 0);
  boca.lineTo(XF - RM, 0);
  sh.holes.push(boca);
  const tp = texPedra(d);
  tp.repeat.set(1.6, 1.6);
  const matPedra = kit.mat({ map: tp, rough: 0.75, clear: 0.1 });
  const geoMuro = new THREE.ShapeGeometry(sh, 24);
  // uv em metros
  {
    const p = geoMuro.attributes.position as THREE.BufferAttribute, uv = geoMuro.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
  }
  const muro = kit.m(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false, curveSegments: 24 }), matPedra, 2.5, g, [0, 0, ZF - 0.06]);
  void geoMuro;
  // muros laterais curvos (pedra), do muro da frente até o pé do morro
  const lados: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const pts: number[] = [], uv: number[] = [], idx: number[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const z = ZF + (0.95 * i) / n;
      const x = XF + sx * (0.72 + 0.42 * Math.pow(Math.min(1, Math.max(0, (z - ZF) / 0.9)), 1.6) - 0.02);
      const h = Math.max(0.02, morro(x, z) - 0.005);
      pts.push(x, 0, z, x, h, z);
      uv.push(z * 1.6, 0, z * 1.6, h * 1.6);
      if (i < n) {
        const a = i * 2;
        if (sx > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const me = kit.m(geo, kit.mat({ map: tp, rough: 0.75, clear: 0.1, side: THREE.DoubleSide, semContorno: true }), 2, g);
    lados.push(me);
  }

  // fechamento provisório (terra e pedra) com só a porta: até a frente abrir
  const fechSh = new THREE.Shape();
  fechSh.moveTo(XF - RI, 0);
  fechSh.lineTo(XF - RI, V0);
  fechSh.absarc(XF, V0, RI, Math.PI, 0, true);
  fechSh.lineTo(XF + RI, 0);
  fechSh.lineTo(XF - RI, 0);
  const furoPorta = new THREE.Path();
  furoPorta.absarc(XF, 0.235, 0.215, 0, Math.PI * 2, false);
  fechSh.holes.push(furoPorta);
  const tf = texPedra(d);
  tf.repeat.set(2.2, 2.2);
  const fech = kit.m(new THREE.ExtrudeGeometry(fechSh, { depth: 0.08, bevelEnabled: false, curveSegments: 32 }), kit.mat({ map: tf, color: B ? 0xc9b9a2 : 0xb0a08a, rough: 0.85 }), 2.5, g, [0, 0, ZF - 0.1]);
  // pedaços do fechamento que caem quando a frente abre
  const cacos: THREE.Mesh[] = [];
  {
    const r = rng(17);
    const geo = new THREE.DodecahedronGeometry(0.05, 0);
    const mat = kit.mat({ color: B ? 0xb9a58c : 0x9c8a74, rough: 0.85 });
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI, rr = 0.24 + r() * 0.24;
      const c = kit.m(geo, mat, 2, g, [XF + Math.cos(a) * rr, V0 + Math.sin(a) * rr * 0.9, ZF - 0.04], [r() * 3, r() * 3, r() * 3], 0.7 + r() * 0.7);
      c.userData.v = [(r() - 0.5) * 0.8, 0.4 + r() * 0.8, 0.6 + r() * 0.8];
      c.userData.p0 = c.position.clone();
      c.visible = false;
      cacos.push(c);
    }
  }

  // fachada de vidro (depois que a frente abre): painel de madeira, janelas redondas e bandeira em leque
  const vidroG = new THREE.Group();
  g.add(vidroG);
  const painel = new THREE.Shape();
  painel.moveTo(XF - RI, 0);
  painel.lineTo(XF - RI, V0);
  painel.absarc(XF, V0, RI, Math.PI, 0, true);
  painel.lineTo(XF + RI, 0);
  painel.lineTo(XF - RI, 0);
  const J = [XF - 0.33, XF + 0.33], YJ = 0.31, RJ = 0.12;
  painel.holes.push(Object.assign(new THREE.Path(), {}).absarc(XF, 0.235, 0.215, 0, Math.PI * 2, false) as THREE.Path);
  for (const x of J) painel.holes.push(new THREE.Path().absarc(x, YJ, RJ, 0, Math.PI * 2, false) as THREE.Path);
  const leque = new THREE.Path();
  leque.moveTo(XF - 0.2, 0.5);
  leque.absarc(XF, 0.5, 0.2, Math.PI, 0, true);
  leque.lineTo(XF - 0.2, 0.5);
  painel.holes.push(leque);
  const tmadeira = texMadeira(true, true);
  tmadeira.repeat.set(2.5, 2.5);
  const matPainel = kit.mat({ color: B ? 0x9b6232 : 0xffffff, map: B ? null : tmadeira, rough: 0.55 });
  const pecasVidro: THREE.Object3D[] = [];
  const pn = kit.m(new THREE.ExtrudeGeometry(painel, { depth: 0.05, bevelEnabled: false, curveSegments: 40 }), matPainel, 2.5, vidroG, [0, 0, ZF - 0.075]);
  pecasVidro.push(pn);
  const matVidro = kit.mat({ vidro: true, color: 0xcfe9ff, emissive: 0xffb866, opacity: B ? 0.55 : 0.35 });
  const matCaixilho = kit.mat({ color: B ? 0x7a4a26 : 0x5c3a20, rough: 0.5 });
  const janelas: THREE.Group[] = [];
  for (const x of J) {
    const jg = new THREE.Group();
    jg.position.set(x, YJ, ZF - 0.03);
    vidroG.add(jg);
    const vd = kit.m(cil(RJ, RJ, 0.01, 40).rotateX(Math.PI / 2), matVidro, 0, jg, [0, 0, -0.02]);
    vd.castShadow = false;
    kit.m(new THREE.TorusGeometry(RJ, 0.018, 12, 48), matCaixilho, 2, jg);
    kit.m(caixaR(2 * RJ, 0.016, 0.02, 0.005), matCaixilho, 1.5, jg);
    kit.m(caixaR(0.016, 2 * RJ, 0.02, 0.005), matCaixilho, 1.5, jg);
    janelas.push(jg);
    pecasVidro.push(jg);
  }
  // bandeira em leque acima da porta
  const lq = new THREE.Group();
  lq.position.set(XF, 0.5, ZF - 0.03);
  vidroG.add(lq);
  const lqv = kit.m(new THREE.CircleGeometry(0.2, 40, 0, Math.PI), matVidro, 0, lq, [0, 0, -0.02]);
  lqv.castShadow = false;
  for (let i = 1; i < 5; i++) {
    const a = (i / 5) * Math.PI;
    kit.m(caixaR(0.2, 0.014, 0.018, 0.004), matCaixilho, 1.5, lq, [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0], [0, 0, a]);
  }
  kit.m(new THREE.TorusGeometry(0.2, 0.016, 10, 40, Math.PI), matCaixilho, 1.5, lq);
  pecasVidro.push(lq);
  // floreiras embaixo das janelas
  const floreiras: THREE.Group[] = [];
  const coresFlor = [0xe63946, 0xffd166, 0xf28482, 0xffffff, 0xb388eb];
  for (const x of J) {
    const fg = new THREE.Group();
    fg.position.set(x, 0.155, ZF + 0.02);
    vidroG.add(fg);
    kit.m(caixaR(0.24, 0.05, 0.06, 0.008), kit.mat({ color: B ? 0x8a5a2f : 0x6e4a2c, rough: 0.6 }), 2, fg);
    const rf = rng(Math.round(x * 100));
    for (let i = 0; i < 9; i++) {
      kit.m(esfera(0.016 + rf() * 0.008, 12, 8), kit.mat({ color: coresFlor[i % 5], rough: 0.6 }), 1.5, fg, [-0.1 + i * 0.025, 0.035 + rf() * 0.02, (rf() - 0.5) * 0.03]);
      kit.m(esfera(0.014, 10, 8), kit.mat({ color: 0x4f8a3a, rough: 0.7 }), 1, fg, [-0.09 + i * 0.025, 0.03, (rf() - 0.5) * 0.04]);
    }
    floreiras.push(fg);
  }

  // porta redonda com maçaneta de latão no centro, batente de pedra em arco
  const porta = new THREE.Group();
  porta.position.set(XF, 0.235, ZF - 0.02);
  g.add(porta);
  const tPorta = texPorta(d);
  const matPorta = kit.mat({ map: tPorta, rough: 0.45, clear: 0.5 });
  kit.m(cil(0.205, 0.205, 0.035, 64).rotateX(Math.PI / 2), matPorta, 2.5, porta);
  const latao = kit.mat({ color: 0xd9a441, metal: 1, rough: 0.25, clear: 0.9 });
  kit.m(esfera(0.026, 24, 16), latao, 2, porta, [0, 0, 0.03]);
  kit.m(cil(0.016, 0.016, 0.012, 20).rotateX(Math.PI / 2), latao, 1.5, porta, [0, 0, 0.02]);
  const batente = kit.m(new THREE.TorusGeometry(0.225, 0.028, 14, 64), kit.mat({ map: tp, color: B ? 0xd8cbb8 : 0xc9b9a2, rough: 0.7 }), 2.5, porta, [0, 0, 0.012]);
  void batente;
  // degraus de pedra e caminho de lajotas
  const matLaje = kit.mat({ color: B ? 0xb8ada0 : 0x9d958b, rough: 0.75 });
  const degraus = new THREE.Group();
  g.add(degraus);
  kit.m(caixaR(0.36, 0.03, 0.12, 0.012), matLaje, 2, degraus, [XF, 0.015, ZF + 0.07]);
  kit.m(caixaR(0.44, 0.022, 0.12, 0.01), matLaje, 2, degraus, [XF, 0.011, ZF + 0.18]);
  const caminho = new THREE.Group();
  g.add(caminho);
  {
    const r = rng(23);
    for (let i = 0; i < 9; i++) {
      const z = ZF + 0.32 + i * 0.17, x = XF + Math.sin(i * 0.7) * 0.12 + (r() - 0.5) * 0.04;
      kit.m(cil(0.07 + r() * 0.02, 0.07 + r() * 0.02, 0.012, 12), matLaje, 1.5, caminho, [x, 0.008, z], [0, r() * 3, 0], [1, 1, 0.8 + r() * 0.3]);
    }
  }
  // cerquinha baixa e caixa de correio
  const cerca = new THREE.Group();
  g.add(cerca);
  const matCerca = kit.mat({ color: B ? 0xf0e3c8 : 0xe8dcc2, rough: 0.6 });
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = XF + sx * (0.24 + i * 0.13);
      kit.m(caixaR(0.025, 0.14, 0.025, 0.006), matCerca, 1.5, cerca, [x, 0.07, 2.12]);
    }
    kit.m(caixaR(0.42, 0.02, 0.016, 0.005), matCerca, 1.5, cerca, [XF + sx * 0.435, 0.1, 2.12]);
    kit.m(caixaR(0.42, 0.02, 0.016, 0.005), matCerca, 1.5, cerca, [XF + sx * 0.435, 0.05, 2.12]);
  }
  const correio = new THREE.Group();
  correio.position.set(XF + 0.36, 0, 2.3);
  g.add(correio);
  kit.m(caixaR(0.025, 0.2, 0.025, 0.006), matCerca, 1.5, correio, [0, 0.1, 0]);
  kit.m(caixaR(0.07, 0.06, 0.1, 0.02), kit.mat({ color: B ? 0x3d7a4f : 0x2f6b46, rough: 0.5 }), 2, correio, [0, 0.22, 0]);
  kit.m(caixaR(0.006, 0.05, 0.012, 0.002), kit.mat({ color: 0xd94a3a }), 1, correio, [0.04, 0.25, 0.02]);

  // luz da sala que sai pelas janelas
  const luzSala = new THREE.PointLight(0xffb36b, 0, 2.2, 1.4);
  luzSala.position.set(XF, 0.4, ZF - 0.4);
  g.add(luzSala);
  return { g, muro, lados, fech, cacos, vidroG, pecasVidro, janelas, lq, floreiras, porta, degraus, caminho, cerca, correio, luzSala, matVidro };
}
export { XC };
export const S_FIM = LTOT;
void RO;
