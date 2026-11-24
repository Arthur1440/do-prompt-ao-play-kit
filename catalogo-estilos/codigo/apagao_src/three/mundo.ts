// Orquestra os cenários 3D. Cada PLANO define o que aparece, a luz, a câmera em função de p (0..1) e o estado.
// Tudo é função pura de (plano, p, t, k, k2): o render pode pular quadros e repetir sem herdar nada do quadro anterior.
import * as THREE from "three";
import { Kit, Dir, montaMundo } from "./kit";
import { Cidade, EstadoCidade } from "./cidade";
import { Globo } from "./globo";
import { Ceu } from "./ceu";
import { Mapa, mp } from "./mapa";
import { Virada } from "./virada";
import { Cozinha, Acougue, Freezer, Garrafa } from "./interiores";
import { GEO } from "./geo_dados";

export type Plano =
  | "globo_gancho" | "rua_desce" | "preto" | "globo_apaga" | "rua_semaforo" | "rua_travada" | "metro" | "torre" | "multidao"
  | "mercado" | "mapa" | "garrafa" | "envio" | "cozinha" | "anoitece" | "ceu" | "acougue_gelo" | "acougue_vacina" | "freezer" | "posto"
  | "rua_volta" | "globo_volta" | "votacao" | "virada" | "rua_capa";

export type Estado = {
  plano: Plano;
  p: number; // progresso do plano 0..1 (no globo_gancho aceita negativo: a volta do loop)
  t: number; // tempo absoluto (s)
  k?: number; // parâmetro extra do plano
  k2?: number;
  hh?: number; // hora do HUD (ponteiros do relógio da cozinha)
};

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const v3 = (a: number[], b: number[], x: number) => new THREE.Vector3(lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x));

const COZ = new THREE.Vector3(100, 0, 0);
const ACG = new THREE.Vector3(200, 0, 0);
const FRZ = new THREE.Vector3(300, 0, 0);
const GARRAFA = mp(-49.35, 0.75);

export class Mundo {
  kit: Kit;
  w: ReturnType<typeof montaMundo>;
  cidade: Cidade;
  globo: Globo;
  ceu: Ceu;
  mapa: Mapa;
  virada: Virada;
  coz: Cozinha;
  acg: Acougue;
  frz: Freezer;
  garrafa: Garrafa;
  fundo: THREE.Color;
  foco = 0.45;
  forca = 1;
  base: { lua: number; luaCor: THREE.Color; hemi: number; hemiCor: THREE.Color; hemiChao: THREE.Color; cid: number; limiar: number; env: number };

  constructor(canvas: HTMLCanvasElement, public dir: Dir, W: number, H: number) {
    this.kit = new Kit(dir, W, H);
    this.w = montaMundo(canvas, dir, W, H);
    this.cidade = new Cidade(this.kit, dir);
    this.globo = new Globo(this.kit, dir);
    this.ceu = new Ceu(dir);
    this.mapa = new Mapa(this.kit, dir);
    this.virada = new Virada(this.cidade.g);
    this.coz = new Cozinha(this.kit);
    this.acg = new Acougue(this.kit);
    this.frz = new Freezer(this.kit);
    this.garrafa = new Garrafa(this.kit, 1);
    const suporte = new THREE.Group();
    suporte.position.copy(GARRAFA).setY(0);
    suporte.add(this.garrafa.g);
    this.mapa.g.add(suporte);
    this.coz.g.position.copy(COZ);
    this.acg.g.position.copy(ACG);
    this.frz.g.position.copy(FRZ);
    this.fundo = new THREE.Color(dir === "A" ? 0x06070c : 0x0b1026);
    this.w.scene.background = this.fundo.clone();
    this.w.scene.add(this.cidade.g, this.globo.g, this.ceu.g, this.mapa.g, this.virada.g, this.coz.g, this.acg.g, this.frz.g);
    const { lua, hemi, cidade, bloom } = this.w;
    this.base = {
      lua: lua.intensity, luaCor: lua.color.clone(), hemi: hemi.intensity, hemiCor: hemi.color.clone(), hemiChao: hemi.groundColor.clone(),
      cid: cidade.intensity, limiar: bloom.threshold, env: this.w.scene.environmentIntensity,
    };
  }

  cam(pos: THREE.Vector3, alvo: THREE.Vector3, fov = 30) {
    const c = this.w.camera;
    c.position.copy(pos);
    c.fov = fov;
    c.updateProjectionMatrix();
    c.lookAt(alvo);
  }

  so(...vis: THREE.Object3D[]) {
    for (const o of [this.cidade.g, this.globo.g, this.ceu.g, this.mapa.g, this.virada.g, this.coz.g, this.acg.g, this.frz.g]) o.visible = vis.includes(o);
  }

  /** luz: lua 0..1 (noite), cid 0..1 (reflexo quente da cidade), dia 0..1 (sol), cor e força do sol */
  luz(lua: number, cid: number, dia = 0, corSol = 0xfff0dc, sol = 3.0) {
    const { lua: L, cidade: C, hemi, bloom, scene } = this.w;
    const b = this.base;
    L.color.copy(b.luaCor).lerp(new THREE.Color(corSol), dia);
    L.intensity = lerp(b.lua * lua, sol, dia);
    C.intensity = b.cid * cid * (1 - dia);
    hemi.color.copy(b.hemiCor).lerp(new THREE.Color(0xcfe0ff), dia);
    hemi.groundColor.copy(b.hemiChao).lerp(new THREE.Color(0x7a6450), dia);
    hemi.intensity = lerp(b.hemi * (0.6 + 0.4 * lua), 1.25, dia);
    scene.environmentIntensity = lerp(b.env, 0.45, dia);
    bloom.threshold = lerp(b.limiar, 2.6, dia);
  }

  /** posiciona o sol/lua (direcional com sombra) olhando para o alvo */
  sol(alvo: THREE.Vector3, rel: number[]) {
    const { lua } = this.w;
    lua.target.position.copy(alvo);
    lua.position.set(alvo.x + rel[0], alvo.y + rel[1], alvo.z + rel[2]);
    lua.target.updateMatrixWorld();
  }

  estadoCidade(o: Partial<EstadoCidade>, t: number): EstadoCidade {
    return { luz: 1, semaforo: 1, tCarros: t, travado: 0, celulares: 1, multidao: 0, trem: 0, torre: 1, fila: 0, filaMerc: 0, t, ...o };
  }

  aplica(e: Estado) {
    const { p, t } = e;
    const d = this.dir;
    const { cidade } = this.w;
    this.sol(new THREE.Vector3(0, 0, 0), [7, 14, 9]);
    cidade.position.set(-4, 2, 6);
    cidade.target.position.set(0, 0, 0);
    this.w.final.uniforms.escuro.value = 0;
    this.foco = 0.45;
    this.forca = 1;
    this.w.scene.background = this.fundo;
    this.virada.arame.visible = this.virada.part.visible = false;
    this.ceu.aplica(0, 1, 0, 0);
    this.luz(1, 1, 0);
    this.garrafa.aplica(0, 0);
    this.cidade.trem.g.position.x = -0.6;
    const C = this.cidade;
    const noiteApagada = (o: Partial<EstadoCidade> = {}) => C.aplica(this.estadoCidade({ luz: 0, semaforo: 0, travado: 1, tCarros: 3, ...o }, t));

    switch (e.plano) {
      case "globo_gancho":
      case "globo_apaga":
      case "globo_volta": {
        this.so(this.globo.g);
        this.sol(new THREE.Vector3(0, 0, 0), [-6, 3, 4]);
        this.luz(d === "B" ? 0.55 : 0.35, 0);
        let lon = -48, lat = -12, dist = 7.2;
        if (e.plano === "globo_gancho") {
          // quadro 0 e loop: a Terra com as Américas acesas; p < 0 = chegando de longe girando (fim do vídeo)
          // começa já em movimento (meio linear, meio suave) para o quadro 0 não parecer parado
          const x = p <= 0 ? 0 : 0.55 * Math.min(1, p) + 0.45 * ease(p);
          const pre = Math.min(0, p);
          lon = lerp(-62, -49, x) + pre * 55;
          lat = lerp(2, -16, x) - pre * 6;
          dist = lerp(14.2, 10.5, x) + pre * pre * 30;
          this.globo.aplica(1.2, 0);
        } else if (e.plano === "globo_apaga") {
          lon = lerp(-20, -55, ease(p));
          lat = -5;
          dist = lerp(13.6, 12.6, p);
          this.globo.aplica(lerp(1.03, -0.03, ease(p * 1.15)), 0);
        } else {
          lon = lerp(-80, -46, ease(p));
          lat = lerp(8, -12, ease(p));
          dist = lerp(17, 13.2, ease(p));
          this.globo.aplica(-0.1, ease(p * 1.1));
        }
        this.globo.frente(lon, lat);
        this.cam(new THREE.Vector3(0, -0.6, dist), new THREE.Vector3(0, -0.6, 0), 30);
        this.foco = 0.5;
        this.forca = 0.55;
        break;
      }

      case "rua_desce":
      case "rua_capa":
      case "votacao": {
        this.so(this.cidade.g, this.ceu.g);
        const x = ease(p);
        if (e.plano === "rua_desce") {
          this.ceu.aplica(0, 1);
          const pos = v3([0.5, 36, 5], [14.5, 10.5, 20.5], x);
          pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.6, 0, x) + t * 0.01);
          this.cam(pos, v3([0, 0, 0], [0, 0.4, -0.6], x), 32);
          C.aplica(this.estadoCidade({}, t));
          this.foco = lerp(0.5, 0.42, x);
        } else {
          // metade acesa, metade apagada (capa e votação)
          this.ceu.aplica(0.25, 0.5);
          const pos = new THREE.Vector3(15.5, 11, 22);
          if (e.plano === "votacao") pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.18, -0.12, p));
          this.cam(pos, new THREE.Vector3(0, 1.2, -0.5), 32);
          C.aplica(this.estadoCidade({ frente: 0.2, travado: 0.6, tCarros: 3 + t * 0.2 }, t));
          if (e.plano === "votacao") this.w.final.uniforms.escuro.value = 0.5;
        }
        break;
      }

      case "preto": {
        this.so();
        this.w.final.uniforms.escuro.value = 1;
        break;
      }

      case "rua_semaforo": {
        // e.k = semáforo (1 vivo -> 0 morto)
        this.so(this.cidade.g, this.ceu.g);
        this.luz(1, 0);
        this.ceu.aplica(0.15, 0);
        this.cam(v3([2.6, 0.55, 3.0], [2.3, 0.75, 2.6], ease(p)), new THREE.Vector3(1.0, 1.15, 0.6), 34);
        C.aplica(this.estadoCidade({ luz: 0, semaforo: e.k ?? 1, travado: 0.35 + 0.65 * ease(p), tCarros: 3 }, t));
        this.foco = 0.62;
        break;
      }

      case "rua_travada":
      case "envio": {
        this.so(this.cidade.g, this.ceu.g);
        this.luz(1, 0);
        this.ceu.aplica(0.15, 0);
        const ang = e.plano === "envio" ? lerp(0.6, 0.85, p) : lerp(-0.5, 0.15, p);
        const r = e.plano === "envio" ? 4.6 : 6.5;
        this.cam(new THREE.Vector3(Math.sin(ang) * r, e.plano === "envio" ? 3.2 : 5.0, Math.cos(ang) * r), new THREE.Vector3(0, 0, 0), 30);
        noiteApagada();
        this.foco = 0.48;
        if (e.plano === "envio") {
          this.w.final.uniforms.escuro.value = 0.55;
          this.forca = 2.2;
        }
        break;
      }

      case "metro": {
        this.so(this.cidade.g, this.ceu.g);
        this.luz(0.35, 0);
        this.ceu.aplica(0.1, 0);
        this.cam(v3([2.4, -0.55, 9.6], [-1.6, -0.7, 8.6], ease(p)), new THREE.Vector3(-0.6, -0.8, 5.2), 30);
        const freia = ease(p * 3);
        noiteApagada({ trem: freia });
        C.trem.g.position.x = lerp(1.6, -0.6, 1 - Math.pow(1 - Math.min(1, p * 3), 2));
        this.foco = 0.5;
        break;
      }

      case "torre": {
        // e.k = sinal da torre 1 -> 0
        this.so(this.cidade.g, this.ceu.g);
        this.luz(1, 0);
        this.ceu.aplica(0.25, 0);
        this.cam(v3([5.4, 6.6, 1.2], [4.6, 6.9, 0.2], ease(p)), new THREE.Vector3(2.6, 6.3, -2.7), 32);
        noiteApagada({ torre: e.k ?? 1, tCarros: t });
        this.foco = 0.55;
        break;
      }

      case "multidao": {
        // e.k = fração de celulares acesos
        this.so(this.cidade.g, this.ceu.g);
        this.luz(0.8, 0);
        this.ceu.aplica(0.2, 0);
        this.cam(v3([4.6, 2.5, -0.35], [3.5, 2.0, 0.05], ease(p)), new THREE.Vector3(0.2, 0.15, 0.1), 30);
        noiteApagada({ multidao: 1, celulares: e.k ?? 1, tCarros: t });
        this.foco = 0.45;
        break;
      }

      case "mercado": {
        // 8 h: manhã, sol baixo e quente; o povo na porta do mercado, sem luz
        this.so(this.cidade.g, this.ceu.g);
        this.luz(0, 0, 1, 0xffd9a8, 2.6);
        this.sol(new THREE.Vector3(-2.5, 0, 0.5), [5, 5.5, -9]);
        this.ceu.aplica(0, 0, 1, 0.15);
        const x = ease(p);
        this.cam(v3([0.45, 3.7, -4.7], [-0.15, 3.0, -3.7], x), v3([-3.0, 0.75, 1.2], [-3.1, 0.65, 1.3], x), 32);
        noiteApagada({ filaMerc: 1 });
        this.foco = 0.55;
        this.forca = 0.8;
        break;
      }

      case "mapa":
      case "garrafa": {
        // e.k = municípios acesos (0..14); p controla a câmera Brasil -> Amapá; na garrafa, k2 = etiqueta
        this.so(this.mapa.g);
        this.luz(d === "B" ? 0.9 : 1.2, 0.3);
        this.sol(new THREE.Vector3(0, 0, 0), [-3, 8, 5]);
        this.mapa.aplica(e.plano === "garrafa" ? 1 : ease(p * 2), e.k ?? 0, t);
        this.w.scene.background = new THREE.Color(d === "A" ? 0x1a120c : 0x0b1026);
        if (e.plano === "mapa") {
          const ap = mp(-51.6, 1.3);
          const x = ease(p);
          const alvo = v3([0, 0, 0], [ap.x, 0, ap.z], x);
          const pos = v3([0.6, 11, 8.5], [ap.x + 0.35, 1.9, ap.z + 1.75], x);
          pos.sub(alvo).applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.5, -0.15, x)).add(alvo);
          this.cam(pos, alvo, 30);
          this.foco = 0.52;
          this.forca = 0.6;
        } else {
          this.garrafa.aplica(Math.min(1, p * 4), e.k2 ?? 0);
          const alvo = new THREE.Vector3(GARRAFA.x - 0.05, 0.22, GARRAFA.z);
          const ang = lerp(-0.3, 0.12, ease(p));
          const pos = new THREE.Vector3(Math.sin(ang) * 1.55, 0.5, Math.cos(ang) * 1.55).add(alvo);
          this.cam(pos, alvo, 30);
          this.foco = 0.6;
          this.forca = 0.45;
        }
        break;
      }

      case "cozinha": {
        // 12 h: a torneira cospe ar e para. k = abre (alavanca), k2 = instante em que seca, hh = hora do HUD
        this.so(this.coz.g);
        this.luz(0, 0, 1, 0xfff2de, 3.4);
        this.sol(COZ.clone().add(new THREE.Vector3(0.4, 0.8, -0.6)), [-1.2, 6, -6.5]);
        this.coz.aplica(t, e.k2 ?? 1e9, e.hh ?? 12, e.k ?? 1);
        const x = ease(p);
        const boca = this.coz.boca.clone().add(COZ);
        const alvo = v3([boca.x, boca.y - 0.08, boca.z], [COZ.x + 0.1, 0.95, COZ.z - 0.35], x);
        const pos = v3([boca.x + 0.42, boca.y + 0.14, boca.z + 0.95], [COZ.x + 2.3, 1.95, COZ.z + 2.7], Math.pow(x, 1.6));
        this.cam(pos, alvo, 30);
        this.foco = lerp(0.5, 0.48, x);
        this.forca = lerp(1.2, 0.85, x);
        break;
      }

      case "anoitece": {
        // 18 h: o sol se põe e nenhuma janela acende
        this.so(this.cidade.g, this.ceu.g);
        const x = ease(p);
        const por = 1 - ease(p * 1.15);
        this.luz(0.6 * x, 0, 0.55 * por, 0xff9a5a, 2.2);
        this.sol(new THREE.Vector3(0, 0, 0), [-12, lerp(3, 1, x), -2]);
        this.ceu.aplica(0.25 * x, 0, 0.15 * por, por);
        this.cam(v3([5.6, 1.1, 1.25], [4.9, 1.0, 0.75], x), v3([-6, 2.6, -0.9], [-6, 3.2, -0.6], x), 40);
        noiteApagada();
        this.foco = 0.5;
        this.forca = 0.5;
        break;
      }

      case "ceu": {
        // Via Láctea: câmera no chão olhando para cima entre os prédios
        this.so(this.cidade.g, this.ceu.g);
        this.luz(0.45, 0);
        const x = ease(p);
        this.ceu.aplica(ease(p * 1.4 + 0.15), 0);
        const pos = new THREE.Vector3(0.3, 0.35, 1.1);
        const olhar = new THREE.Vector3(lerp(-0.3, -0.9, x), lerp(0.9, 4.2, x), lerp(-3.5, -2.8, x));
        this.cam(pos, olhar.add(pos), 52);
        noiteApagada();
        this.foco = 0.5;
        this.forca = 0.35;
        break;
      }

      case "acougue_gelo":
      case "acougue_vacina": {
        // 36 h (meio-dia): o gelo acaba; vacinas na geladeira do açougue (Amapá, 2020). k = derrete
        this.so(this.acg.g);
        this.luz(0, 0, 1, 0xfff0dc, 2.1);
        this.sol(ACG.clone().add(new THREE.Vector3(-0.4, 0.6, -0.2)), [-2.0, 6, -6.5]);
        this.acg.aplica(e.k ?? 0, t);
        const x = ease(p);
        if (e.plano === "acougue_gelo") {
          const alvo = new THREE.Vector3(ACG.x - 0.72, 1.08, ACG.z + 0.08);
          this.cam(v3([ACG.x - 0.12, 1.55, ACG.z + 1.35], [ACG.x - 0.3, 1.45, ACG.z + 1.1], x), alvo, 30);
          this.foco = 0.5;
          this.forca = 0.6;
        } else {
          const alvo = v3([ACG.x + 0.7, 1.0, ACG.z - 0.6], [ACG.x + 1.15, 1.08, ACG.z - 0.94], x);
          this.cam(v3([ACG.x - 0.6, 1.55, ACG.z + 2.3], [ACG.x + 0.55, 1.28, ACG.z + 0.95], x), alvo, 32);
          this.luz(0, 0, 0.75, 0xfff0dc, 1.5);
          this.foco = 0.5;
          this.forca = 0.45;
        }
        break;
      }

      case "freezer": {
        // 48 h (meia-noite): o freezer em corte; k = abre a tampa, k2 = o frio escapa
        this.so(this.frz.g);
        this.luz(0.55, 0);
        this.sol(FRZ.clone().add(new THREE.Vector3(-0.5, 0.5, -0.4)), [-2.5, 5, -6]);
        this.frz.aplica(e.k ?? 0, e.k2 ?? 0, t);
        const x = ease(p);
        const alvo = new THREE.Vector3(FRZ.x + 0.25, lerp(0.55, 0.7, x), FRZ.z - 0.5);
        this.cam(v3([FRZ.x + 2.7, 2.1, FRZ.z + 3.1], [FRZ.x + 2.1, 2.0, FRZ.z + 2.55], x), alvo, 32);
        this.foco = 0.5;
        this.forca = 0.9;
        break;
      }

      case "posto": {
        // 48 h: fila no posto com a bomba apagada (os faróis são a única luz)
        this.so(this.cidade.g, this.ceu.g);
        this.luz(0.9, 0);
        this.ceu.aplica(0.2, 0);
        const x = ease(p);
        this.cam(v3([-0.7, 4.3, -3.5], [0.15, 3.9, -3.1], x), v3([2.0, 0.4, 1.8], [2.5, 0.4, 2.1], x), 34);
        noiteApagada({ fila: 1 });
        this.foco = 0.5;
        break;
      }

      case "rua_volta": {
        this.so(this.cidade.g, this.ceu.g);
        // k = a luz voltando (0..1), começa no estalo do disjuntor
        const r = e.k ?? ease(p);
        this.luz(1, r);
        this.ceu.aplica(lerp(0.8, 0, r), r);
        this.cam(v3([6.2, 3.2, 8.8], [9, 13, 13], ease(p)), new THREE.Vector3(0, 1, -0.5), 32);
        C.aplica(this.estadoCidade({ luz: 0, religa: r, semaforo: ease(r * 2 - 0.6), travado: 1, tCarros: 3 }, t));
        break;
      }

      case "virada": {
        // e.k = desmonte 0..1; k2 = escurece o fundo (PLAY)
        this.so(this.virada.g);
        this.virada.arame.visible = this.virada.part.visible = true;
        this.w.scene.background = new THREE.Color(0x0b1026);
        const ang = lerp(0.15, 0.45, p);
        this.cam(new THREE.Vector3(Math.sin(ang) * 13, 7.5, Math.cos(ang) * 13), new THREE.Vector3(0, 1.4, 0), 34);
        this.virada.aplica(e.k ?? 0, t);
        this.forca = 0;
        this.w.final.uniforms.escuro.value = e.k2 ?? 0;
        break;
      }
    }
  }

  render(t = 0) {
    this.w.quadro(t, this.foco, this.forca);
  }
}

export { GEO };
