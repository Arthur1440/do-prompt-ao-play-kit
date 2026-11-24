// Projeta pontos do mundo 3D para a tela (1080x1920) com a mesma câmera em órbita do Mundo.
import * as THREE from "three";
import type { Cam } from "./three/mundo";

const cam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.02, 200);
export function projeta(c: Cam, pts: [number, number, number][]): [number, number][] {
  const alvo = new THREE.Vector3(...(c.alvo ?? [0, -0.4, 0]));
  const a = THREE.MathUtils.degToRad(c.az), e = THREE.MathUtils.degToRad(Math.min(c.el, 89.8));
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(e) * c.dist, alvo.y + Math.sin(e) * c.dist, alvo.z + Math.cos(a) * Math.cos(e) * c.dist);
  cam.fov = c.fov ?? 30;
  cam.updateProjectionMatrix();
  cam.up.set(Math.sin(c.rolo ?? 0), Math.cos(c.rolo ?? 0), 0);
  cam.lookAt(alvo);
  cam.updateMatrixWorld();
  return pts.map(([x, y, z]) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return [(v.x * 0.5 + 0.5) * 1080, (1 - (v.y * 0.5 + 0.5)) * 1920];
  });
}
