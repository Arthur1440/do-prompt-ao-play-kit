// Geografia: projeção Albers (a mesma do prep_mapa.mjs), cidades e centros de controle.
import { MAPA } from "./mapa_dados";
const R = 6371,
  rad = Math.PI / 180,
  l0 = -96 * rad;
const { n, Cc, r0 } = MAPA.proj;
/** lon/lat -> [x, z] da cena (1 unidade = 500 km; z positivo = sul) */
export function ll(lon: number, lat: number): [number, number] {
  const r = (R * Math.sqrt(Cc - 2 * n * Math.sin(lat * rad))) / n,
    th = n * (lon * rad - l0);
  return [(r * Math.sin(th)) / 500, -(r0 - r * Math.cos(th)) / 500];
}
export type Anel = readonly (readonly [number, number])[];
export const USA = MAPA.usa as unknown as Anel[];
export const ESTADOS = MAPA.estados as unknown as Anel[];
export const VIZ = MAPA.viz as unknown as Record<string, Anel[]>;

export function dentro(x: number, z: number, aneis: Anel[] = USA) {
  let d = false;
  for (const r of aneis) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, zi] = r[i],
        [xj, zj] = r[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
    }
  }
  return d;
}

// cidades (lon, lat, peso de tráfego): só posição de ilustração; nenhum nome vai para a tela além de Chicago
export const CIDADES: [number, number, number][] = [
  [-73.9, 40.7, 10], [-118.3, 33.95, 9], [-87.85, 41.95, 9], [-84.4, 33.65, 9], [-97.0, 32.9, 8], [-104.7, 39.8, 7],
  [-122.4, 37.65, 6], [-122.3, 47.45, 6], [-80.3, 25.8, 6], [-81.3, 28.45, 5], [-95.3, 29.95, 6], [-112.0, 33.45, 6],
  [-115.15, 36.1, 5], [-71.0, 42.35, 5], [-77.4, 38.95, 6], [-75.2, 39.9, 4], [-80.9, 35.2, 5], [-93.2, 44.9, 4],
  [-83.35, 42.2, 4], [-111.95, 40.8, 4], [-117.2, 32.75, 3], [-122.6, 45.6, 3], [-90.35, 38.75, 3], [-86.7, 36.1, 3],
  [-94.7, 39.3, 2], [-97.7, 30.2, 3], [-90.25, 30.0, 2], [-82.5, 28.0, 3], [-80.2, 40.5, 2], [-81.85, 41.4, 2],
  [-86.3, 39.7, 2], [-82.9, 40.0, 2], [-78.8, 35.9, 2], [-98.5, 29.5, 2], [-106.6, 35.05, 1], [-90.0, 35.05, 2],
  [-85.7, 38.2, 1], [-95.9, 41.3, 1], [-97.6, 35.4, 1], [-121.6, 38.7, 2], [-116.2, 43.6, 1], [-117.5, 47.6, 1],
  [-81.7, 30.5, 1], [-78.7, 42.9, 1], [-87.9, 42.95, 1], [-84.65, 39.05, 2], [-108.5, 45.8, 0.5], [-96.8, 46.9, 0.5],
  [-106.4, 31.8, 1], [-110.9, 32.1, 1], [-100.8, 46.8, 0.4], [-101.7, 35.2, 0.5], [-103.2, 44.05, 0.4], [-89.6, 39.8, 0.6],
  [-92.3, 34.75, 0.6], [-76.6, 39.2, 2], [-72.7, 41.9, 1], [-70.3, 43.65, 0.5], [-73.8, 42.75, 0.6],
];
export const NY = ll(-73.9, 40.7);
export const CHICAGO = ll(-87.85, 41.95);
export const SAO_PAULO = ll(-46.63, -23.55);

// 20 centros de controle de rota nos 48 estados (posição aproximada; a tela diz "ILUSTRAÇÃO")
export const CENTROS: [number, number][] = [
  [-122.23, 47.29], [-121.98, 37.55], [-118.1, 34.6], [-111.95, 40.79], [-105.1, 40.19], [-106.62, 35.17],
  [-93.15, 44.64], [-94.79, 38.88], [-97.06, 32.83], [-95.34, 29.96], [-88.33, 41.78], [-86.28, 39.74],
  [-89.97, 35.07], [-82.22, 41.29], [-84.3, 33.38], [-81.9, 30.69], [-80.32, 25.82], [-77.53, 39.1],
  [-73.1, 40.78], [-71.49, 42.74],
].map(([a, b]) => ll(a, b));

/** ligações da rede: cada centro com os 3 mais próximos (sem repetir) */
export function ligacoes(): [number, number][] {
  const s = new Set<string>(),
    out: [number, number][] = [];
  CENTROS.forEach((p, i) => {
    const d = CENTROS.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])] as [number, number])
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);
    for (const [j] of d) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!s.has(k)) {
        s.add(k);
        out.push(i < j ? [i, j] : [j, i]);
      }
    }
  });
  return out;
}
