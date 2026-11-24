// Mapa do Brasil em relevo (27 UFs do IBGE) com o Amapá em destaque e os 16 municípios;
// 14 acendem em vermelho de emergência (contagem do MME). Oiapoque e Laranjal do Jari ficam de fora.
import * as THREE from "three";
import { Kit, Dir } from "./kit";
import { GEO } from "./geo_dados";
import { cv, tx, texMadeira } from "./tex";

export const LON0 = -52, LAT0 = -14, K = 0.1;
export const mp = (lon: number, lat: number) => new THREE.Vector3((lon - LON0) * K, 0, -(lat - LAT0) * K);

function forma(anel: readonly (readonly number[])[]) {
  const s = new THREE.Shape();
  anel.forEach(([lon, lat], i) => {
    const x = (lon - LON0) * K, y = (lat - LAT0) * K;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  });
  return s;
}

export class Mapa {
  g = new THREE.Group();
  brasil = new THREE.Group();
  ap: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; fora: boolean; ordem: number; borda?: THREE.LineSegments }[] = [];
  pino: THREE.Group;
  matsUF: THREE.MeshStandardMaterial[] = [];

  constructor(public kit: Kit, public dir: Dir) {
    const coresA = [0xe8d6b0, 0xd9c49a, 0xcfdcb8, 0xe2c9a6, 0xd4cfa8];
    const corUF = (i: number) => (dir === "A" ? coresA[i % coresA.length] : dir === "B" ? [0x5b6fb0, 0x6a7fc0, 0x5468a8][i % 3] : 0x141c3a);
    let i = 0;
    for (const [cod, aneis] of Object.entries(GEO.brasil as unknown as Record<string, number[][][]>)) {
      if (cod === "16") continue; // o Amapá é desenhado pelos municípios
      const m = kit.mat({ color: corUF(i++), rough: 0.6 }) as THREE.MeshStandardMaterial;
      this.matsUF.push(m);
      for (const a of aneis) {
        const geo = new THREE.ExtrudeGeometry(forma(a), { depth: 0.06, bevelEnabled: dir === "A", bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 });
        geo.rotateX(-Math.PI / 2);
        const me = kit.m(geo, m, 1.6);
        this.brasil.add(me);
        if (dir === "C") this.brasil.add(this.borda(geo, 0x3a64c8, 0.061));
      }
    }
    const munis = GEO.amapa as unknown as { id: string; fora: boolean; a: number[][][] }[];
    // ordem de acender: de Macapá para fora
    const mac = mp(GEO.macapa[0], GEO.macapa[1]);
    munis.forEach((mu) => {
      const m = kit.mat({ color: dir === "C" ? 0x1a2448 : dir === "B" ? 0x8a93b8 : 0xc9c2b0, rough: 0.55, emis: 0x000000 }) as THREE.MeshStandardMaterial;
      const grupo = new THREE.Group();
      let cx = 0, cz = 0, nn = 0;
      for (const a of mu.a) {
        const geo = new THREE.ExtrudeGeometry(forma(a), { depth: 0.07, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const me = kit.m(geo, m, 1.2);
        grupo.add(me);
        for (const [lon, lat] of a) { const p = mp(lon, lat); cx += p.x; cz += p.z; nn++; }
        grupo.add(this.borda(geo, dir === "C" ? 0xff6b2c : 0x2a1a10, 0.071));
      }
      this.brasil.add(grupo);
      const d = Math.hypot(cx / nn - mac.x, cz / nn - mac.z);
      this.ap.push({ mesh: grupo as unknown as THREE.Mesh, mat: m, fora: mu.fora, ordem: d });
    });
    const dentro = this.ap.filter((x) => !x.fora).sort((a, b) => a.ordem - b.ordem);
    dentro.forEach((x, k) => (x.ordem = k));
    this.ap.filter((x) => x.fora).forEach((x) => (x.ordem = 99));
    // pino de Macapá (foz do Amazonas)
    this.pino = new THREE.Group();
    const haste = kit.m(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8), kit.mat({ color: 0xffffff }), 1);
    haste.position.y = 0.06;
    const cab = kit.m(new THREE.SphereGeometry(0.016, 16, 12), kit.mat({ color: 0xff6b2c, emis: 0xff6b2c, emisI: 0.6 }), 1.5);
    cab.position.y = 0.125;
    const [c, g] = cv(256, 72);
    g.font = "700 46px 'Space Grotesk'";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 8;
    g.strokeStyle = "rgba(11,16,38,0.9)";
    g.strokeText("Macapá", 128, 38);
    g.fillStyle = "#ffffff";
    g.fillText("Macapá", 128, 38);
    const rot = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx(c), depthTest: false, toneMapped: false }));
    rot.scale.set(0.16, 0.045, 1);
    rot.position.set(0.1, 0.13, 0);
    this.pino.add(haste, cab, rot);
    this.pino.position.copy(mac).setY(0.07);
    this.brasil.add(this.pino);
    this.g.add(this.brasil);
    // base: mesa (A), oceano escuro (B, C)
    if (dir === "A") {
      const mad = texMadeira();
      mad.repeat.set(3, 3);
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), kit.mat({ map: mad, rough: 0.55, semContorno: true }));
      mesa.rotation.x = -Math.PI / 2;
      mesa.position.y = -0.005;
      mesa.receiveShadow = true;
      this.g.add(mesa);
    } else {
      const [oc, og] = cv(1024, 1024);
      og.fillStyle = dir === "B" ? "#1a2557" : "#070c1e";
      og.fillRect(0, 0, 1024, 1024);
      og.strokeStyle = dir === "B" ? "rgba(255,255,255,0.06)" : "rgba(80,120,255,0.12)";
      for (let k = 0; k < 1024; k += 32) {
        og.beginPath(); og.moveTo(k, 0); og.lineTo(k, 1024); og.stroke();
        og.beginPath(); og.moveTo(0, k); og.lineTo(1024, k); og.stroke();
      }
      const t = tx(oc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 4);
      const mar = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), kit.mat({ map: t, rough: 0.9, semContorno: true }));
      mar.rotation.x = -Math.PI / 2;
      mar.position.y = -0.005;
      mar.receiveShadow = true;
      this.g.add(mar);
    }
  }

  borda(geo: THREE.BufferGeometry, cor: number, y: number) {
    const e = new THREE.EdgesGeometry(geo, 40);
    // só as arestas de cima
    const p = e.getAttribute("position") as THREE.BufferAttribute;
    const keep: number[] = [];
    for (let i = 0; i < p.count; i += 2) {
      if (p.getY(i) > y - 0.01 && p.getY(i + 1) > y - 0.01) keep.push(p.getX(i), p.getY(i) + 0.001, p.getZ(i), p.getX(i + 1), p.getY(i + 1) + 0.001, p.getZ(i + 1));
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
    const l = new THREE.LineSegments(g2, new THREE.LineBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(this.dir === "C" ? 2.5 : 1), toneMapped: this.dir !== "C", transparent: true, opacity: this.dir === "C" ? 1 : 0.55 }));
    return l;
  }

  /** destaque 0..1 do Amapá (o resto escurece), n = municípios acesos (0..14) */
  aplica(destaque: number, n: number, t: number) {
    const esc = 1 - 0.55 * destaque;
    for (const m of this.matsUF) {
      const base = (m.userData.base ??= m.color.clone()) as THREE.Color;
      m.color.copy(base).multiplyScalar(esc);
    }
    for (const a of this.ap) {
      const base = (a.mat.userData.base ??= a.mat.color.clone()) as THREE.Color;
      const aceso = !a.fora && a.ordem < n ? THREE.MathUtils.clamp(n - a.ordem, 0, 1) : 0;
      const laranja = new THREE.Color(0xff6b2c);
      a.mat.color.copy(base).lerp(laranja, destaque * 0.5).lerp(new THREE.Color(0xff3b30), aceso);
      a.mat.emissive.setRGB(1, 0.23, 0.19).multiplyScalar(aceso * (1.1 + 0.25 * Math.sin(t * 6 + a.ordem)));
      a.mesh.position.y = destaque * 0.03 + aceso * 0.03;
    }
    this.pino.visible = destaque > 0.3;
    this.pino.position.y = 0.07 + destaque * 0.03;
  }
}
