// Ficha do personagem: o pedreiro em frente, perfil e costas (e expressões), sobre fundo neutro.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { Kit, montaMundo, Dir } from "./three/kit";
import { Boneco, Olhos, Pose } from "./three/boneco";
import { Churrasqueira } from "./three/props";

export type Vista = "frente" | "perfil" | "costas" | "rostos" | "churrasqueira" | "r_normal" | "r_susto" | "r_feliz" | "r_foco" | "r_preocupado";

export const Ficha: React.FC<{ dir: Dir; vista: Vista }> = ({ dir, vista }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const h = delayRender("ficha");
    const W = 1080, H = 1920;
    const k = new Kit(dir, W, H);
    const w = montaMundo(ref.current!, dir, W, H);
    w.scene.background = new THREE.Color(dir === "B" ? "#EAF2F7" : dir === "A" ? "#E9DCCB" : "#F1E6D8");
    const chao = new THREE.Mesh(new THREE.CircleGeometry(3, 64), k.mat({ color: dir === "B" ? "#D9E4EA" : "#D8C8B4", rough: 0.9, semContorno: true }));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    w.scene.add(chao);
    const base: Pose = { pos: [0, 0, 0], bE: { abre: 0.22, frente: 0.05, cot: 0.25 }, bD: { abre: 0.22, frente: 0.05, cot: 0.25 } };
    if (vista === "rostos") {
      const ex: Olhos[] = ["normal", "susto", "feliz", "foco"];
      ex.forEach((o, i) => {
        const b = new Boneco(k, "pedreiro");
        w.scene.add(b.raiz);
        b.aplica({ ...base, pos: [((i % 2) - 0.5) * 0.44, i < 2 ? 0.0 : -0.62, 0], olhos: o, boca: o === "susto" ? "O" : "nada", bone: o === "susto" ? 0.6 : 0 });
      });
      chao.visible = false;
      w.camera.position.set(0, 0.6, 3.4);
      w.camera.lookAt(0, 0.6, 0);
    } else if (vista.startsWith("r_")) {
      const o = vista.slice(2) as Olhos;
      const b = new Boneco(k, "pedreiro");
      w.scene.add(b.raiz);
      b.aplica({ ...base, olhos: o, boca: o === "susto" ? "O" : "nada", bone: o === "susto" ? 0.5 : 0, cab: [0, 0.25, 0] });
      w.camera.position.set(0.25, 0.98, 2.1);
      w.camera.lookAt(0, 0.9, 0);
    } else if (vista === "churrasqueira") {
      const c = new Churrasqueira(k);
      w.scene.add(c.g);
      c.aplica({ olhos: 1 }, 0);
      w.camera.position.set(0.5, 0.75, 3.2);
      w.camera.lookAt(0, 0.35, 0);
    } else {
      const b = new Boneco(k, "pedreiro");
      w.scene.add(b.raiz);
      b.aplica({ ...base, rotY: vista === "frente" ? 0 : vista === "perfil" ? Math.PI / 2 : Math.PI });
      w.camera.position.set(0, 0.62, 4.1);
      w.camera.lookAt(0, 0.52, 0);
    }
    w.sol.position.set(...(w.solDir.clone().normalize().multiplyScalar(10).toArray() as [number, number, number]));
    w.sol.target.position.set(0, 0, 0);
    w.camera.updateProjectionMatrix();
    w.quadro(0, 0.45, 0);
    w.quadro(0, 0.45, 0);
    continueRender(h);
  }, [dir, vista]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
