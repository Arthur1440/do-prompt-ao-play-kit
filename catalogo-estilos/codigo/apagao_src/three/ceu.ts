// Céu noturno: degradê + Via Láctea (faixa com poeira escura) + estrelas densas. "via" 0..1 abre a galáxia.
import * as THREE from "three";
import { Dir } from "./kit";
import { rng } from "./rng";

export class Ceu {
  g = new THREE.Group();
  u = { uVia: { value: 0 }, uPoluicao: { value: 1 }, uDir: { value: 0 }, uDia: { value: 0 }, uPor: { value: 0 } };
  estrelas: THREE.Points;
  constructor(public dir: Dir) {
    this.u.uDir.value = dir === "A" ? 0 : dir === "B" ? 1 : 2;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(150, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: this.u,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uVia, uPoluicao, uDir, uDia, uPor; varying vec3 vD;
          float h(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
          float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
          float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<6;i++){ s+=a*n3(p); p*=2.03; a*=0.5; } return s; }
          void main(){
            vec3 d = normalize(vD);
            float alt = clamp(d.y, -0.2, 1.0);
            vec3 base = uDir < 0.5 ? mix(vec3(0.03,0.035,0.06), vec3(0.006,0.008,0.016), alt)
                       : uDir < 1.5 ? mix(vec3(0.08,0.11,0.26), vec3(0.02,0.03,0.09), alt)
                       : mix(vec3(0.05,0.08,0.18), vec3(0.008,0.012,0.03), alt);
            // poluição luminosa laranja no horizonte enquanto a cidade está acesa
            base += vec3(0.35,0.18,0.06) * uPoluicao * pow(1.0 - clamp(alt,0.0,1.0), 5.0) * 0.6;
            // faixa da Via Láctea: grande círculo inclinado que cruza o olhar da câmera da cena "ceu" na diagonal
            vec3 nrm = normalize(vec3(0.33, -0.46, -0.80));
            float dist = dot(d, nrm);
            float faixa = exp(-dist*dist*34.0);
            float largo = exp(-dist*dist*9.0);
            vec3 cn = normalize(vec3(-0.35, 0.72, -0.58));
            float nucleo = exp(-dist*dist*70.0) * pow(max(dot(d, cn), 0.0), 6.0);
            float nuvem = fbm(d*6.0);
            float fio = fbm(d*14.0 + 1.7);
            float poeira = smoothstep(0.42, 0.68, fbm(d*10.0 + 3.1)) * exp(-dist*dist*110.0);
            float poeira2 = smoothstep(0.38, 0.62, fbm(d*7.0 + 9.3)) * exp(-dist*dist*60.0);
            vec3 via = vec3(0.42,0.50,0.80) * faixa * pow(nuvem, 2.4) * 0.75
                     + vec3(0.22,0.26,0.48) * largo * 0.10
                     + vec3(1.0,0.78,0.58) * nucleo * pow(fio, 2.0) * 0.55;
            via *= (1.0 - max(poeira, poeira2)*0.7);
            vec3 q = floor(d*1400.0);
            float r = h(q);
            float st = step(1.0 - (0.004 + 0.22*faixa*pow(nuvem,1.5)*(1.0 - max(poeira, poeira2))), r) * (0.3 + 0.7*h(q+7.0));
            // dia (azul claro) e pôr do sol (laranja e rosa no horizonte)
            vec3 dia = mix(vec3(0.78,0.86,0.95), vec3(0.32,0.55,0.88), pow(clamp(alt,0.0,1.0),0.6));
            vec3 por = mix(mix(vec3(1.0,0.55,0.25), vec3(0.85,0.42,0.52), smoothstep(0.02,0.18,alt)), vec3(0.16,0.20,0.42), smoothstep(0.12,0.6,alt));
            base = mix(base, dia, uDia);
            base = mix(base, por, uPor);
            vec3 col = base + via * uVia + vec3(0.85,0.9,1.0) * st * (0.25 + 0.75*uVia) * (1.0 - 0.85*uPoluicao) * (1.0 - uDia) * (1.0 - 0.8*uPor);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.g.add(dome);
    // estrelas brilhantes (pontos)
    const R = rng(12);
    const n = 5000, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3);
    const nrm = new THREE.Vector3(0.33, -0.46, -0.8).normalize();
    for (let i = 0; i < n; i++) {
      let v = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize();
      if (i % 3 !== 0) v = v.sub(nrm.clone().multiplyScalar(v.dot(nrm) * (1 - R.ab(0, 0.18)))).normalize();
      v.multiplyScalar(140);
      pos.set([v.x, v.y, v.z], i * 3);
      const k = R.ab(0.5, 1);
      const c = R.r() < 0.2 ? [1, 0.85, 0.7] : [0.8, 0.88, 1];
      cor.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("color", new THREE.BufferAttribute(cor, 3));
    this.estrelas = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.g.add(this.estrelas);
  }
  aplica(via: number, poluicao: number, dia = 0, por = 0) {
    this.u.uDia.value = dia;
    this.u.uPor.value = por;
    this.u.uVia.value = via;
    this.u.uPoluicao.value = poluicao;
    (this.estrelas.material as THREE.PointsMaterial).opacity = Math.min(1, via * 1.2) * 0.95;
  }
}
