// Projeta pontos do forno (coordenadas locais) para a tela, com a mesma câmera em órbita do 3D.
import * as THREE from "three";
import { FORNO, type Cam } from "./three/mundo";

const cam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.02, 200);
export function projeta(c: Cam, pts: [number, number, number][]): [number, number][] {
  const alvo = FORNO.clone().add(new THREE.Vector3(c.ax ?? 0, c.ay ?? 0, c.az2 ?? 0));
  const a = THREE.MathUtils.degToRad(c.az), e = THREE.MathUtils.degToRad(Math.min(c.el, 89.8));
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(e) * c.dist, alvo.y + Math.sin(e) * c.dist, alvo.z + Math.cos(a) * Math.cos(e) * c.dist);
  cam.fov = c.fov ?? 30;
  cam.updateProjectionMatrix();
  cam.up.set(0, 1, 0);
  cam.lookAt(alvo);
  cam.updateMatrixWorld();
  return pts.map(([x, y, z]) => {
    const v = new THREE.Vector3(x, y, z).add(FORNO).project(cam);
    return [(v.x * 0.5 + 0.5) * 1080, (1 - (v.y * 0.5 + 0.5)) * 1920];
  });
}
