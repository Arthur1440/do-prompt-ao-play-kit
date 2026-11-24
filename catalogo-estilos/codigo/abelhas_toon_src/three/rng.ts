// Aleatório determinístico (mesma cena em todo quadro do render).
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** Quique: cresce, passa do ponto, assenta (0..1 → escala). */
export const quique = (t: number) => {
  const x = clamp(t);
  if (x <= 0) return 0;
  return 1 + Math.sin(x * Math.PI * 2.5) * Math.exp(-x * 5) * 0.35 - Math.exp(-x * 9) * 1;
};

// Ruído de valor 2D simples (para terra e texturas).
const h2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise2 = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};
export const fbm = (x: number, y: number, o = 4) => {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < o; i++) {
    s += a * noise2(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
};
