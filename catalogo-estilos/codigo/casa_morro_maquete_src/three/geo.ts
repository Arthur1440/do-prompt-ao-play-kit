import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = [number, number, number];
export type V2 = [number, number];

// ------------------------------------------------------------------ medidas da toca (unidades da maquete)
export const RI = 0.5; // raio interno da abóbada
export const RO = 0.56; // raio externo do concreto
export const RM = 0.59; // raio externo da manta
export const V0 = 0.22; // altura das paredinhas antes do arco
export const XC = -1.5; // plano do corte (lado oeste)
export const ZF = 1.25; // plano da fachada (lado norte)
export const XF = 0.6; // centro da fachada em x
export const ZQ = -0.8; // eixo do quarto do fundo
const RC = 0.8; // raio da curva do corredor

// Caminho da abóbada: fachada (norte) -> sala (reta para o sul) -> corredor curvo -> quarto (reta para o oeste, até o corte)
const L1 = ZF; // reta da sala
const L2 = (Math.PI / 2) * RC; // curva
const L3 = XF - RC - XC; // reta do quarto (de x = -0.2 até o corte)
export const LTOT = L1 + L2 + L3;
export const S_CURVA = L1; // início da curva
export const S_QUARTO = L1 + L2; // início do quarto

/** posição e tangente (direção de quem entra pela porta) no comprimento s */
export function noCaminho(s: number): { p: THREE.Vector3; t: THREE.Vector3 } {
  if (s <= L1) return { p: new THREE.Vector3(XF, 0, ZF - s), t: new THREE.Vector3(0, 0, -1) };
  if (s <= L1 + L2) {
    const a = -(s - L1) / RC; // de 0 a -90°
    const cx = XF - RC, cz = 0;
    return { p: new THREE.Vector3(cx + RC * Math.cos(a), 0, cz + RC * Math.sin(a)), t: new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)) };
  }
  const u = s - L1 - L2;
  return { p: new THREE.Vector3(XF - RC - u, 0, ZQ), t: new THREE.Vector3(-1, 0, 0) };
}
/** ponto no caminho com deslocamento lateral u e altura v */
export function ptCaminho(s: number, u = 0, v = 0): V3 {
  const { p, t } = noCaminho(s);
  const L = new THREE.Vector3(t.z, 0, -t.x);
  return [p.x + L.x * u, v, p.z + L.z * u];
}

// ------------------------------------------------------------------ perfis (u lateral, v altura)
export function perfilArco(ri: number, ro: number, v0 = V0, n = 28, comPiso = true): V2[] {
  // polígono fechado anti-horário: base direita -> parede externa -> arco externo -> parede esquerda -> arco interno de volta
  const P: V2[] = [];
  P.push([ri, 0], [ro, 0], [ro, v0]);
  for (let i = 1; i < n; i++) {
    const a = (i / n) * Math.PI;
    P.push([ro * Math.cos(a), v0 + ro * Math.sin(a)]);
  }
  P.push([-ro, v0], [-ro, 0], [-ri, 0], [-ri, v0]);
  for (let i = n - 1; i >= 1; i--) {
    const a = (i / n) * Math.PI;
    P.push([ri * Math.cos(a), v0 + ri * Math.sin(a)]);
  }
  P.push([ri, v0]);
  void comPiso;
  return P;
}
/** arco aberto (superfície interna do túnel, normal para dentro) */
export function perfilTunel(r: number, v0 = V0, n = 32): V2[] {
  const P: V2[] = [[-r, 0], [-r, v0]];
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    P.push([r * Math.cos(a), v0 + r * Math.sin(a)]);
  }
  P.push([r, v0], [r, 0]);
  return P;
}
export const area2 = (P: V2[]) => {
  let a = 0;
  for (let i = 0; i < P.length; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};

// ------------------------------------------------------------------ varredura do perfil ao longo do caminho
export function varre(perfil: V2[], s0: number, s1: number, opts: { fechado?: boolean; tampas?: boolean; passos?: number; uvEsc?: number } = {}) {
  const fechado = opts.fechado ?? true;
  const n = opts.passos ?? Math.max(4, Math.ceil((s1 - s0) * 40));
  const K = perfil.length;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  // comprimento acumulado do perfil (para o uv)
  const acum = [0];
  for (let k = 1; k < K + (fechado ? 1 : 0); k++) {
    const a = perfil[k - 1], b = perfil[k % K];
    acum.push(acum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const kk = fechado ? K + 1 : K;
  const esc = opts.uvEsc ?? 1;
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const { p, t } = noCaminho(s);
    const L = new THREE.Vector3(t.z, 0, -t.x);
    for (let k = 0; k < kk; k++) {
      const [u, v] = perfil[k % K];
      pos.push(p.x + L.x * u, v, p.z + L.z * u);
      uv.push(acum[k] * esc, s * esc);
    }
  }
  const segK = fechado ? K : K - 1;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < segK; k++) {
      const a = i * kk + k, b = i * kk + k + 1, c = (i + 1) * kk + k, d = (i + 1) * kk + k + 1;
      idx.push(a, b, c, b, d, c);
    }
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (fechado && (opts.tampas ?? true)) {
    const caps = [tampa(perfil, s0, false), tampa(perfil, s1, true)];
    g = mergeGeometries([g.toNonIndexed(), ...caps.map((c) => c.toNonIndexed())], false)!;
  }
  return g;
}
/** tampa plana do perfil no ponto s (fim: normal na direção do caminho) */
export function tampa(perfil: V2[], s: number, fim: boolean) {
  const { p, t } = noCaminho(s);
  const L = new THREE.Vector3(t.z, 0, -t.x);
  const cont = perfil.map(([u, v]) => new THREE.Vector2(u, v));
  const tri = THREE.ShapeUtils.triangulateShape(cont, []);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const nn = fim ? t.clone() : t.clone().negate();
  for (const f of tri) {
    let [a, b, c] = f;
    const A = perfil[a], B = perfil[b], C = perfil[c];
    const ar = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]);
    if ((ar > 0) !== fim) [b, c] = [c, b];
    for (const k of [a, b, c]) {
      const [u, v] = perfil[k];
      pos.push(p.x + L.x * u, v, p.z + L.z * u);
      nor.push(nn.x, nn.y, nn.z);
      uv.push(u, v);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// ------------------------------------------------------------------ utilidades
export const junta = (gs: THREE.BufferGeometry[]) => {
  const n = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  n.forEach((g) => {
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
  });
  return mergeGeometries(n, false)!;
};
export const transf = (g: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], esc: V3 | number = 1) => {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    typeof esc === "number" ? new THREE.Vector3(esc, esc, esc) : new THREE.Vector3(...esc),
  );
  return g.clone().applyMatrix4(m);
};
/** caixa com cantos arredondados (brinquedo) */
export function caixaR(w: number, h: number, d: number, r = 0.02, seg = 3) {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
  s.moveTo(x, -h / 2);
  s.lineTo(x + W, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, y);
  s.lineTo(w / 2, y + H);
  s.quadraticCurveTo(w / 2, h / 2, x + W, h / 2);
  s.lineTo(x, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y + H);
  s.lineTo(-w / 2, y);
  s.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: seg, curveSegments: seg * 2 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  g.computeVertexNormals();
  return g;
}
export const esfera = (r: number, ws = 32, hs = 24) => new THREE.SphereGeometry(r, ws, hs);
export const cil = (rt: number, rb: number, h: number, s = 40, aberto = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, aberto);
export const tubo = (pts: V3[], r: number, seg = 48, rs = 10) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.05), seg, r, rs, false);
export function torno(pts: [number, number][], seg = 64) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
  g.computeVertexNormals();
  return g;
}
