import { fbm } from "./rng";
import type { V3 } from "./kit";

// Unidade da cena: 1 = 10 m. O morro tem ~340 m acima da cidade; a torre, 130 m.
const g = (x: number, z: number, cx: number, cz: number, s: number) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));

export const PESSOAS: [number, number] = [5, 12.5];
let H_PESSOAS = 0;
export function altura(x: number, z: number) {
  const r2 = x * x + (z * 1.15) ** 2;
  let h = 33 * Math.exp(-r2 / (2 * 26 * 26));
  h += 11 * g(x, z, -24, -12, 17) + 8 * g(x, z, 28, -26, 22) + 5 * g(x, z, 18, 14, 12);
  const queda = Math.exp(-r2 / (2 * 55 * 55));
  h += (fbm(x * 0.045 + 3, z * 0.045 + 7, 4) - 0.5) * 12 * queda;
  // cristas que descem do pico (encosta com vincos, não um cone liso)
  const ang = Math.atan2(z, x);
  h += Math.abs(Math.sin(ang * 3.0 + fbm(x * 0.05, z * 0.05) * 3)) * 3.2 * Math.exp(-r2 / (2 * 30 * 30)) * (1 - Math.exp(-r2 / 40));
  // pico rochoso: pequenas saliências perto do topo
  h += (fbm(x * 0.35, z * 0.35, 3) - 0.5) * 3.2 * Math.exp(-r2 / 180);
  // clareira plana das silhuetas (a malha é uma grade: sem isso elas afundam no chão)
  const dp = Math.hypot(x - PESSOAS[0], z - PESSOAS[1]);
  if (dp < 3.5) {
    const k = dp < 2.2 ? 1 : 1 - (dp - 2.2) / 1.3;
    h = h * (1 - k) + H_PESSOAS * k;
  }
  // plataforma da torre
  const r = Math.sqrt(r2);
  if (r < 3.2) {
    const k = r < 2.2 ? 1 : 1 - (r - 2.2) / 1.0;
    h = h * (1 - k) + TOPO_BASE * k;
  }
  return h;
}
// altura aproximada do pico (sem a plataforma), calculada uma vez
const TOPO_BASE = (() => {
  const x = 0, z = 0;
  return 33 + 11 * g(x, z, -24, -12, 17) + 8 * g(x, z, 28, -26, 22) + 5 * g(x, z, 18, 14, 12) + (fbm(3, 7, 4) - 0.5) * 12;
})();

export const TOPO = TOPO_BASE;
export const ALT_TORRE = 13; // 130 m
export const PONTA: V3 = [0, TOPO + ALT_TORRE + 0.6, 0]; // ponta do para-raios
export const BASE_NUVEM = PONTA[1] + 34;
// Empire State (set de Nova York): 443 m com a antena
export const PONTA_ES: V3 = [0, 44.6, 0];
export const BASE_NUVEM_NY = 84;

// onde ficam as silhuetas dos pesquisadores (na base do morro, de frente para a torre)
// (no alto, num afloramento perto da torre: assim a torre inteira cabe atrás delas)
H_PESSOAS = altura(PESSOAS[0] + 40, PESSOAS[1]) * 0 + (() => {
  // altura sem achatamento no ponto das silhuetas
  const x = PESSOAS[0], z = PESSOAS[1];
  const salva = PESSOAS[0];
  PESSOAS[0] = 1e6;
  const h = altura(x, z);
  PESSOAS[0] = salva;
  return h;
})();
