// Geometrias FECHADAS (o corte por estêncil exige sólidos fechados com as faces viradas para fora).
import * as THREE from "three";
import { junta } from "./kit";

export type V3 = [number, number, number];
const V = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
const Y = new THREE.Vector3(0, 1, 0);

/** cilindro fechado com eixo de a até b */
export function cilAB(a: V3, b: V3, r: number, seg = 28): THREE.BufferGeometry {
  const A = V(a), B = V(b);
  const g = new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

/** disco virado para `n`, centrado em p */
function disco(p: THREE.Vector3, n: THREE.Vector3, r: number, seg: number) {
  const d = new THREE.CircleGeometry(r, seg);
  d.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().normalize()));
  d.translate(p.x, p.y, p.z);
  return d;
}

/** tubo fechado ao longo de uma curva (com tampa nas duas pontas) */
export function tuboCurva(c: THREE.Curve<THREE.Vector3>, r: number, seg = 48, rad = 24): THREE.BufferGeometry {
  const t = new THREE.TubeGeometry(c, seg, r, rad, false);
  const d0 = disco(c.getPoint(0), c.getTangent(0).negate(), r, rad);
  const d1 = disco(c.getPoint(1), c.getTangent(1), r, rad);
  return junta([t, d0, d1]);
}

/**
 * Cano em polilinha com cotovelos arredondados: retas (cilindros fechados) + curvas (tubo fechado).
 * `ext` alonga as duas pontas (o miolo do cano sai um pouco além da parede, para a boca parecer oca).
 */
export function caminho(pts: V3[], r: number, R = 0.05, ext = 0, seg = 28): THREE.BufferGeometry {
  const P = pts.map(V);
  if (ext) {
    P[0].add(P[0].clone().sub(P[1]).normalize().multiplyScalar(ext));
    const n = P.length - 1;
    P[n].add(P[n].clone().sub(P[n - 1]).normalize().multiplyScalar(ext));
  }
  const partes: THREE.BufferGeometry[] = [];
  let ini = P[0].clone();
  for (let i = 1; i < P.length; i++) {
    const cur = P[i];
    if (i < P.length - 1) {
      const d1 = cur.clone().sub(P[i - 1]).normalize(), d2 = P[i + 1].clone().sub(cur).normalize();
      const rr = Math.min(R, cur.distanceTo(P[i - 1]) * 0.45, cur.distanceTo(P[i + 1]) * 0.45);
      const s = cur.clone().addScaledVector(d1, -rr), e = cur.clone().addScaledVector(d2, rr);
      if (ini.distanceTo(s) > 1e-4) partes.push(cilAB([ini.x, ini.y, ini.z], [s.x, s.y, s.z], r, seg));
      partes.push(tuboCurva(new THREE.QuadraticBezierCurve3(s, cur.clone(), e), r, 12, seg));
      ini = e;
    } else if (ini.distanceTo(cur) > 1e-4) partes.push(cilAB([ini.x, ini.y, ini.z], [cur.x, cur.y, cur.z], r, seg));
  }
  return junta(partes);
}

/** luva/bolsa de encaixe (anel mais largo) na posição p, eixo d */
export function luva(p: V3, d: V3, r: number, L = 0.022): THREE.BufferGeometry {
  const P = V(p), D = V(d).normalize();
  return cilAB([P.x - D.x * L / 2, P.y - D.y * L / 2, P.z - D.z * L / 2], [P.x + D.x * L / 2, P.y + D.y * L / 2, P.z + D.z * L / 2], r * 1.22);
}

/** sólido de revolução fechado a partir de um perfil FECHADO [r, y] (anti-horário: sobe por fora, desce por dentro) */
export function tornoFechado(perfil: [number, number][], seg = 48): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);
  g.computeVertexNormals();
  return g;
}

/** meia-esfera de baixo fechada (tampa em cima): o furo do buraco no quintal */
export function cuia(r: number, prof: number, seg = 40): THREE.BufferGeometry {
  const s = new THREE.SphereGeometry(r, seg, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  s.scale(1, prof / r, 1);
  const tampa = new THREE.CircleGeometry(r, seg);
  tampa.rotateX(-Math.PI / 2);
  return junta([s, tampa]);
}

export const v3 = V;
