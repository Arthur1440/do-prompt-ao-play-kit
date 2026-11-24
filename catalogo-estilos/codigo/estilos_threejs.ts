// Receita de referência dos estilos 3D em Three.js (Remotion + @remotion/three ou canvas próprio).
// Extraída do reel Burger King x McDonald's (11/11/2026), cujas prévias A, B e C saíram certas
// (ver quadros/bk_previa_A.jpg, _B.jpg, _C.jpg). Original: reels/burgerking_x_mcdonalds/saida/projeto/src/three/
// (kit.ts, mundo.ts, tex.ts). Copie o que precisar; os nomes das direções são:
//   "A" = maquete de brinquedo com tilt-shift
//   "B" = toon 3D com contorno
//   "C" = fliperama 16 bits (pixel art sobre 3D)
//
// Cada direção é a MESMA cena com outro material, outra luz e outro pós-processamento,
// e mesmo assim cada uma fica nítida, porque as três coisas mudam juntas.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Dir = "A" | "B" | "C";
export const PIX = 5; // tamanho do "pixel" da direção C, em px de 1080

// ---------------------------------------------------------------------------
// Rampa do toon: 3 faixas duras (sombra 90, meio-tom 185, luz 255).
// NearestFilter é o que deixa a borda entre as faixas dura.
export function gradToon(n = 3) {
  const d = new Uint8Array(n * 4);
  const vals = n === 3 ? [90, 185, 255] : [70, 140, 205, 255];
  for (let i = 0; i < n; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = vals[i];
    d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// Ruído fino em tons de cinza para o bump do plástico da maquete (vinil fosco).
export function texRuidoFino(seed = 3) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------------------
// Fábrica de materiais e contorno conforme a direção.
export class Kit {
  grad = gradToon(3);
  ruido = texRuidoFino();
  constructor(public dir: Dir, public W: number, public H: number) {}

  mat(o: { color?: THREE.ColorRepresentation; map?: THREE.Texture | null; rough?: number; metal?: number; clear?: number; semContorno?: boolean }) {
    let m: THREE.Material;
    if (this.dir === "A") {
      // plástico fosco de boneco colecionável: Physical com verniz leve e bump de ruído
      const metal = o.metal ?? 0;
      m = new THREE.MeshPhysicalMaterial({
        color: o.color ?? 0xffffff, map: o.map ?? null,
        roughness: o.rough ?? 0.5, metalness: metal,
        clearcoat: o.clear ?? (metal > 0.5 ? 0.6 : 0.25), clearcoatRoughness: 0.45,
        bumpMap: this.ruido, bumpScale: 0.15,
      });
    } else {
      // B e C: toon com a rampa de 3 faixas
      m = new THREE.MeshToonMaterial({ color: new THREE.Color(o.color ?? 0xffffff), map: o.map ?? null, gradientMap: this.grad });
    }
    m.userData.semContorno = !!o.semContorno; // fundos e chão grandes ficam sem contorno
    return m;
  }

  // Contorno preto por casco invertido EM ESPAÇO DE TELA: a espessura é em PIXELS,
  // então fica igual perto e longe da câmera. É isto que o toon das abelhas (Blender) não tinha:
  // lá o casco tinha 0,1 a 3 mm em metros e sumia (menor que um pixel).
  contorno(mesh: THREE.Mesh, px = 3) {
    if (this.dir === "A") return;
    if ((mesh.material as THREE.Material).userData?.semContorno) return;
    const C = this.dir === "C";
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        px: { value: C ? Math.max(0.9, px * 0.38) : px },
        res: { value: C ? new THREE.Vector2(this.W / 5, this.H / 5) : new THREE.Vector2(this.W, this.H) },
        cor: { value: new THREE.Color(C ? "#140a14" : "#1a0f0c") },
      },
      vertexShader: /* glsl */ `
        uniform float px; uniform vec2 res;
        void main(){
          vec4 p = vec4(position,1.0); vec3 n = normal;
          #ifdef USE_INSTANCING
            p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
          #endif
          vec4 c = projectionMatrix * modelViewMatrix * p;
          vec3 vn = normalize(mat3(modelViewMatrix) * n);
          vec2 d = normalize((projectionMatrix * vec4(vn,0.0)).xy + 1e-5);
          c.xy += d * px * 2.0 / res * c.w;   // empurra o vértice px pixels para fora
          gl_Position = c;
        }`,
      fragmentShader: `uniform vec3 cor; void main(){ gl_FragColor = vec4(cor,1.0); }`,
      side: THREE.BackSide, // só as faces de trás: o casco aparece como borda
    });
    const o = mesh instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, mesh.count) : new THREE.Mesh(mesh.geometry, mat);
    if (o instanceof THREE.InstancedMesh) o.instanceMatrix = (mesh as THREE.InstancedMesh).instanceMatrix;
    o.userData.contorno = true;
    o.frustumCulled = false;
    mesh.add(o);
  }

  // malha com sombra e contorno numa chamada
  m(geo: THREE.BufferGeometry, mat: THREE.Material, px = 3) {
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = me.receiveShadow = true;
    this.contorno(me, px);
    return me;
  }
}

// ---------------------------------------------------------------------------
// Renderizador, luz e pós-processamento por direção.
export function montaMundo(canvas: HTMLCanvasElement, dir: Dir, W = 1080, H = 1920) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dir !== "C", preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = dir === "A" ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // fov 30 no 9:16: a largura visível é só ~0,3 x a distância (ver SKILL.md, "Câmera no 9:16")
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 200);

  if (dir === "A") {
    // reflexo suave de estúdio no plástico (sem HDRI de céu)
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
  }

  // Luz: um sol direcional forte com sombra + hemisfério + contraluz.
  // A: sol quente de fim de tarde (0xffcf9a, 3.4), hemisfério azul/terra 0.9.
  // B/C: sol branco 2.6, hemisfério neutro 1.5. Sem HDRI no toon: luz ambiente demais
  //      joga tudo na faixa mais clara da rampa e o toon fica chapado (erro das abelhas).
  const sol = new THREE.DirectionalLight(dir === "A" ? 0xffcf9a : 0xffffff, dir === "A" ? 3.4 : 2.6);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.01;
  Object.assign(sol.shadow.camera, { left: -3, bottom: -3, right: 3, top: 3, near: 0.5, far: 30 });
  const hemi = new THREE.HemisphereLight(dir === "A" ? 0xcfe0ff : 0xffffff, dir === "A" ? 0x8a5a3a : 0x99887a, dir === "A" ? 0.9 : 1.5);
  const contra = new THREE.DirectionalLight(dir === "A" ? 0xffe2b8 : 0xfff2dd, dir === "A" ? 1.6 : 1.4);
  scene.add(sol, sol.target, hemi, contra);

  // Pós
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: dir === "C" ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  if (dir === "C") composer.addPass(new RenderPixelatedPass(PIX, scene, camera, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.5 }));
  else composer.addPass(new RenderPass(scene, camera));
  if (dir === "A") composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.22, 0.6, 0.9));
  composer.addPass(new OutputPass());
  let tiltH: ShaderPass | undefined, tiltV: ShaderPass | undefined;
  if (dir === "A") {
    tiltH = new ShaderPass(TILT); tiltH.uniforms.dir.value.set(1 / W, 0);
    tiltV = new ShaderPass(TILT); tiltV.uniforms.dir.value.set(0, 1 / H);
    composer.addPass(tiltH); composer.addPass(tiltV);
  }
  const final = new ShaderPass(FINAL);
  final.uniforms.res.value.set(W, H);
  final.uniforms.pix.value = dir === "C" ? PIX : 0;
  final.uniforms.grao.value = dir === "A" ? 0.035 : 0.0;          // grão só na maquete
  final.uniforms.vinheta.value = dir === "A" ? 0.45 : dir === "B" ? 0.18 : 0.25;
  final.uniforms.quente.value = dir === "A" ? 0.025 : 0.0;
  composer.addPass(final);

  // por quadro: foco do tilt-shift (0 = base da tela, 1 = topo) e tempo do grão
  const quadro = (t: number, foco = 0.45) => {
    if (tiltH && tiltV) tiltH.uniforms.centro.value = tiltV.uniforms.centro.value = foco;
    final.uniforms.tempo.value = t;
    composer.render();
  };
  return { renderer, scene, camera, composer, sol, hemi, contra, quadro };
}

// Tilt-shift em 2 passadas (horizontal + vertical): faixa nítida em volta de "centro",
// borrão crescendo para cima e para baixo. Mova "centro" para o objeto de cada cena.
export const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, centro: { value: 0.5 }, forca: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float centro; uniform float forca; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - centro);
      float r = smoothstep(0.17, 0.52, d) * 6.0 * forca;
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -7; i <= 7; i++) {
        float k = exp(-float(i*i)/24.0);
        s += texture2D(tDiffuse, vUv + dir * float(i) * r) * k; w += k;
      }
      gl_FragColor = s / w;
    }`,
};

// Passada final: pixelização com paleta de 6 níveis e pontilhado Bayer (C), aquecimento,
// vinheta e grão animado (A).
export const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, tempo: { value: 0 }, pix: { value: 0 },
    grao: { value: 0.03 }, vinheta: { value: 0.4 }, quente: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float tempo, grao, vinheta, quente, pix; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tempo*13.17)*43758.5453); }
    float bayer(vec2 p){
      int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)); int i = x + y*4;
      float m[16];
      m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for (int k=0;k<16;k++){ if (k==i) return m[k]/16.0; }
      return 0.0;
    }
    void main(){
      vec2 uv = vUv; vec3 col;
      if (pix > 0.5) {
        vec2 g = floor(uv * res / pix);
        col = texture2D(tDiffuse, (g + 0.5) * pix / res).rgb;
        col = floor(col * 5.0 + 0.5 + (bayer(g) - 0.5) * 0.55) / 5.0; // 6 níveis por canal
        col *= mod(floor(uv.y * res.y), pix) < 1.0 ? 0.86 : 1.0;      // linhas de varredura
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      col += vec3(quente, quente*0.35, -quente);
      vec2 cc = vUv - 0.5;
      col *= 1.0 - vinheta * smoothstep(0.35, 0.95, length(cc*vec2(1.0, 0.75))*1.35);
      col += (h(vUv*res) - 0.5) * grao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
