import * as THREE from "three";
import type { Kit } from "./kit";
import { Ceu, Estadio, Prancheta, Recursos, Rua, SetBase, SetNome, Virada } from "./sets";
import { Diretoria, Documento, Prensa } from "./sets2";

export function criaSets(k: Kit, rec: Recursos, raposa: () => THREE.Object3D): Record<SetNome, SetBase> {
  return {
    estadio: new Estadio(k, rec),
    prancheta: new Prancheta(k, rec),
    rua: new Rua(k),
    ceu: new Ceu(k),
    virada: new Virada(k, raposa),
    diretoria: new Diretoria(k),
    prensa: new Prensa(k, rec),
    documento: new Documento(k, rec),
  };
}
