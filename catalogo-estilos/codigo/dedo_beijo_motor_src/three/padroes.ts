// Superfícies procedurais (GLSL) de cada escala. Coordenada local: 1 unidade = "s" metros da camada.
// Injetadas em MeshPhysicalMaterial (A, C) e MeshToonMaterial (B) via onBeforeCompile.
import * as THREE from "three";

export const TIPO = {
  dedo: 1, // pele com cristas da digital (também no dedo macro)
  escamas: 2,
  celula: 3,
  fibras: 4,
  cadeias: 5,
  atomos: 6,
  rugas: 7, // ruguinhas dos lábios
  pelos: 21, // fios de pelo deitados (cachorro)
  cuticula: 22, // escamas da cutícula de um fio
  tela: 11, // interface do celular (macro)
  vidro: 12,
  riscos: 13,
  finos: 14,
  bolinhas: 15,
  fluor: 16,
  atomosB: 17,
} as const;

const DECL = /* glsl */ `
uniform int uTipo; uniform float uEsc, uAmp, uLado, uCurv, uPlano, uFuzz, uEstilo, uTempo, uSeed, uDofRange, uRcam, uBrilho, uLinha, uNormK;
uniform vec3 uFogCor; uniform vec2 uFog; uniform vec3 uTinta; uniform float uCurvX;
uniform float uCasca, uPeloLen, uDens; // pelo em camadas (shell fur)
varying vec3 vLoc; varying vec3 vMundo;
`;

const FUNCS = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),u.x), mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s/0.9375; }
vec4 voro(vec2 p, float jit){ vec2 n=floor(p), f=fract(p); float d1=8., d2=8.; vec2 id=vec2(0.);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=hash22(n+g)*jit+(1.-jit)*.5; vec2 r=g+o-f; float d=dot(r,r);
    if(d<d1){ d2=d1; d1=d; id=n+g; } else if(d<d2){ d2=d; } }
  return vec4(sqrt(d1), sqrt(d2), id); }
float fino(float px, float escala){ return 1.0 - smoothstep(0.08, 0.5, px*escala); } // some o detalhe menor que o pixel
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// ---------- alturas (0..1, 1 = ponta voltada para o vão) ----------
float hDedo(vec2 p, float px, out float aux){
  vec2 w = vec2(fbm(p*0.06), fbm(p*0.06+5.2));
  vec2 q = p + (w-0.5)*5.0;
  float ph = length(q*vec2(0.85,1.0) - vec2(6.0, 34.0)) + 0.2*sin(q.x*0.3);
  float r = 0.5+0.5*cos(6.2832*ph);
  float h = pow(r, 1.3)*fino(px, 1.2) + 0.5*(1.0-fino(px,1.2));
  float row = floor(ph+0.5);
  float cx = floor(q.x/0.6); float fx = fract(q.x/0.6)-0.5;
  float tem = step(0.4, hash12(vec2(cx,row)+uSeed));
  float dp = length(vec2(fx*0.6, ph-row))/0.1;
  h -= tem*0.6*(1.0-smoothstep(0.55,1.0,dp))*fino(px, 6.0);
  // células mortas da superfície (já anunciam a próxima escala) com borda nítida
  vec4 v = voro(p*13.0, 0.9);
  float e13 = v.y - v.x;
  h += (0.09*smoothstep(0.0,0.06, e13) + 0.04*hash12(v.zw))*fino(px, 13.0);
  h -= 0.05*(1.0 - smoothstep(0.0, 0.03 + px*6.0, e13))*fino(px, 13.0);
  // poros finos da pele entre as cristas
  h += 0.03*(vnoise(p*40.0)-0.5)*fino(px, 40.0);
  aux = r;
  return clamp(h, 0.0, 1.0);
}
float hRugas(vec2 p, float px, out float aux){
  // sulcos paralelos e ondulados dos lábios, com células finas por cima
  vec2 q = p + (vec2(fbm(p*0.08), fbm(p*0.08+7.3))-0.5)*vec2(2.0, 4.0);
  float ph = q.y + 0.35*sin(q.x*0.25 + fbm(q*0.15)*4.0);
  float r = 0.5+0.5*cos(6.2832*ph);
  float h = 0.25 + 0.75*pow(r, 0.7);
  // sulco fundo e escuro entre as dobras
  float f = abs(fract(ph)-0.5);
  h -= 0.35*(1.0 - smoothstep(0.0, 0.06 + px*0.5, 0.5 - f))*fino(px, 1.0);
  // dobrinhas menores atravessando
  h -= 0.08*(1.0 - smoothstep(0.0, 0.3, abs(sin(q.x*2.2 + q.y*0.4))))*fino(px, 2.2);
  vec4 v = voro(p*11.0, 0.9);
  h += (0.07*smoothstep(0.0,0.06, v.y-v.x) + 0.03*hash12(v.zw))*fino(px, 11.0);
  h += 0.03*(vnoise(p*34.0)-0.5)*fino(px, 34.0);
  aux = r;
  return clamp(h, 0.0, 1.0);
}
float hPelos(vec2 p, float px, out float aux){
  // fios deitados no mesmo sentido, em duas camadas, cada um com a sua cor
  float ang = 0.25 + 0.5*(fbm(p*0.03)-0.5);
  vec2 q = rot(ang)*p;
  q.y += 1.2*(fbm(q*vec2(0.02,0.08))-0.5);
  float id = floor(q.y);
  float f = fract(q.y)-0.5;
  float fio = sqrt(max(0.0, 1.0 - pow(2.0*f, 2.0)));
  vec2 q2 = q + vec2(17.0, 0.5);
  float id2 = floor(q2.y*1.3);
  float f2 = fract(q2.y*1.3)-0.5;
  float fio2 = sqrt(max(0.0, 1.0 - pow(2.0*f2, 2.0)))*0.75;
  float h = max(fio*(0.75+0.25*hash12(vec2(id,1.0))), fio2*step(0.45, hash12(vec2(id2,3.0))));
  // escamas da cutícula visíveis de perto
  h -= 0.06*(1.0 - smoothstep(0.0, 0.25, fract(q.x*1.2 + 0.3*sin(q.y*3.0))))*fino(px, 1.2);
  float vis = fino(px, 1.0);
  aux = hash12(vec2(id, 7.0));
  return clamp(mix(0.3, h, vis), 0.0, 1.0);
}
float hCuticula(vec2 p, float px, out float aux){
  // escamas sobrepostas como telhas, com borda irregular, ao longo do fio
  vec2 q = p + (vec2(fbm(p*0.2), fbm(p*0.2+3.0))-0.5)*0.8;
  // as bordas correm atravessadas na tela (fileiras de telha que se afastam)
  float ph = q.y + 0.22*sin(q.x*0.45 + floor(q.y)*1.9) + 0.2*(fbm(q*vec2(0.3,0.8))-0.5);
  float s = fract(ph);
  float h = 0.25 + 0.65*s;                                   // sobe até a borda
  h *= smoothstep(0.0, 0.04 + px*0.6, 1.0 - s) * 0.85 + 0.15; // borda viva
  h += 0.06*(vnoise(p*7.0)-0.5)*fino(px, 7.0);
  h += 0.03*(vnoise(p*22.0)-0.5)*fino(px, 22.0);
  aux = hash12(vec2(floor(ph), 2.0));
  return clamp(h, 0.0, 1.0);
}
float hEscamas(vec2 p, float px, out float aux){
  // duas camadas de células sobrepostas (como telhas): a de cima com borda levantada e fenda escura
  vec2 pw = p + (vec2(fbm(p*0.35), fbm(p*0.35+4.))-0.5)*0.7;
  vec4 v = voro(pw, 0.85);
  vec4 v2 = voro(pw*1.0 + vec2(0.5, 0.37), 0.85);
  float e = v.y - v.x;
  float e2 = v2.y - v2.x;
  float placa = 0.52 + 0.36*hash12(v.zw+uSeed);
  float fenda = smoothstep(0.0, 0.035 + px*0.8, e);
  float borda = (1.0 - smoothstep(0.0, 0.22, e))*0.26*hash12(v.zw+3.1);
  float baixo = 0.3 + 0.2*hash12(v2.zw);
  float h = mix(baixo*smoothstep(0.0, 0.05+px, e2), placa + borda, fenda);
  // rugas finas sobre cada placa
  float ruga = abs(sin(dot(p, vec2(5.0, 9.0)) + fbm(p*1.3)*5.0));
  h -= 0.05*(1.0 - smoothstep(0.0, 0.25, ruga))*fino(px, 9.0);
  h += 0.05*(fbm(p*7.0)-0.5)*fino(px, 7.0) + 0.025*(vnoise(p*24.0)-0.5)*fino(px, 24.0);
  aux = hash12(v.zw);
  return clamp(h, 0.0, 1.0);
}
float hCelula(vec2 p, float px, out float aux){
  vec2 q = p + (vec2(fbm(p*0.28), fbm(p*0.28+3.))-0.5)*2.6;
  float r = 1.0 - abs(vnoise(q*0.75)*2.0-1.0);
  float h = 0.3 + 0.45*pow(r, 2.2) + 0.15*fbm(p*1.7)*fino(px, 1.7);
  float dobra = abs(sin(q.x*0.8 + q.y*0.35 + fbm(q*0.2)*3.0));
  h -= 0.22*(1.0 - smoothstep(0.0, 0.1 + px, dobra));
  // microvilosidades: pequenas cúpulas nítidas espalhadas na superfície
  vec4 mv = voro(p*3.2, 0.9);
  float rr = 0.24 + 0.12*hash12(mv.zw);
  float cup = sqrt(max(0.0, 1.0 - pow(mv.x/rr, 2.0)));
  h += 0.16*cup*step(0.25, hash12(mv.zw+5.0))*fino(px, 3.2);
  h += 0.03*(vnoise(p*14.0)-0.5)*fino(px, 14.0);
  aux = r;
  return clamp(h, 0.0, 1.0);
}
float hFibras(vec2 p, float px, out float aux){
  float ang = 0.35 + 0.5*(fbm(p*0.06)-0.5);
  vec2 q = rot(ang)*p;
  q.y += 0.7*(fbm(q*vec2(0.07,0.25))-0.5);
  float f = abs(sin(3.1416*q.y));
  float h = 0.15 + 0.7*sqrt(f);
  h += 0.12*sin(q.x*3.6 + floor(q.y)*1.7)*f;
  h += 0.1*sqrt(abs(sin(3.1416*q.y*6.0)))*fino(px, 6.0) - 0.05;
  aux = hash12(vec2(floor(q.y), 1.0));
  return clamp(h, 0.0, 1.0);
}
float hCadeias(vec2 p, float px, out float aux){
  vec2 q = p + (vec2(fbm(p*0.22+uSeed), fbm(p*0.22+9.))-0.5)*3.2;
  float n = vnoise(q*0.85);
  float w = 1.0 - abs(n*2.0-1.0);
  float h = pow(w, 2.6);
  vec4 v = voro(p*3.2, 0.7);
  h += 0.18*(1.0 - smoothstep(0.0, 0.5, v.x))*h*fino(px, 3.2);
  aux = n;
  return clamp(h, 0.0, 1.0);
}
float hAtomos(vec2 p, float px, out float aux){
  vec4 v = voro(p + uSeed, 0.35);
  float r = 0.5;
  float d = v.x/r;
  float cap = sqrt(max(0.0, 1.0 - d*d));
  aux = hash12(v.zw + uSeed);
  return cap;
}
float hTela(vec2 p, float px, out float aux){ aux = 0.0; return 0.5; }
float hVidro(vec2 p, float px, out float aux){
  float h = 0.35;
  vec4 v = voro(p*0.7, 1.0);
  float rr = 0.12 + 0.35*hash12(v.zw);
  float gota = step(0.3, hash12(v.zw+1.0)) * sqrt(max(0.0, 1.0 - pow(v.x/rr, 2.0)));
  h += 0.4*gota;
  // a marca da digital deixada na tela: arcos de gordura
  float arco = 0.5+0.5*sin(length(p - vec2(3.0,-8.0))*6.2832/4.5);
  h += 0.08*smoothstep(0.6,1.0,arco)*fino(px, 1.5);
  vec2 c = floor(p*0.12); float a = hash12(c)*3.1416; vec2 dd = vec2(cos(a), sin(a));
  float dl = abs(dot(p - (c+0.5)/0.12, vec2(-dd.y, dd.x)));
  h -= 0.3*(1.0 - smoothstep(0.0, 0.05+px, dl))*step(0.45, hash12(c+7.0));
  aux = gota;
  return clamp(h, 0.0, 1.0);
}
float sulcos(vec2 p, float px, float k, float larg){
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = rot(0.4 + fi*1.13 + k)*p;
    float lane = q.y*(0.55 + fi*0.2) + 0.4*fbm(q*0.05+fi);
    float f = fract(lane)-0.5;
    float fundo = hash12(vec2(floor(lane), fi+k));
    s += (1.0 - smoothstep(0.0, larg + px*0.6, abs(f)))*step(0.5, fundo)*(0.5+0.5*fundo);
  }
  return s;
}
float hRiscos(vec2 p, float px, out float aux){
  float h = 0.62 + 0.1*(fbm(p*0.45)-0.5);
  float s = sulcos(p, px, 0.0, 0.05);
  h -= 0.35*s;
  vec4 v = voro(p*2.4, 1.0);
  h += 0.12*(1.0 - smoothstep(0.0, 0.3, v.x))*step(0.7, hash12(v.zw))*fino(px, 2.4);
  aux = s;
  return clamp(h, 0.0, 1.0);
}
float hFinos(vec2 p, float px, out float aux){
  float h = 0.45 + 0.18*(fbm(p*0.35)-0.5);
  h -= 0.18*sulcos(p*0.6, px, 2.0, 0.09);
  vec4 v = voro(p*1.3, 1.0);
  float rr = 0.18 + 0.15*hash12(v.zw);
  h += 0.35*step(0.35, hash12(v.zw+2.0))*sqrt(max(0.0, 1.0 - pow(v.x/rr,2.0)));
  aux = 0.0;
  return clamp(h, 0.0, 1.0);
}
float hBolinhas(vec2 p, float px, out float aux){
  vec4 v = voro(p, 0.9);
  float rr = 0.28 + 0.2*hash12(v.zw);
  float domo = sqrt(max(0.0, 1.0 - pow(v.x/rr, 2.0)));
  vec4 v2 = voro(p*3.1+5.0, 0.9);
  float domo2 = sqrt(max(0.0, 1.0 - pow(v2.x/0.32, 2.0)));
  float h = 0.2 + 0.65*domo + 0.12*domo2*fino(px, 3.1);
  aux = domo;
  return clamp(h, 0.0, 1.0);
}

float H(vec2 p, float px, out float aux){
  if (uTipo == 1) return hDedo(p, px, aux);
  if (uTipo == 2) return hEscamas(p, px, aux);
  if (uTipo == 3) return hCelula(p, px, aux);
  if (uTipo == 4) return hFibras(p, px, aux);
  if (uTipo == 5 || uTipo == 16) return hCadeias(p, px, aux);
  if (uTipo == 6 || uTipo == 17) return hAtomos(p, px, aux);
  if (uTipo == 7) return hRugas(p, px, aux);
  if (uTipo == 21) return hPelos(p, px, aux);
  if (uTipo == 22) return hCuticula(p, px, aux);
  if (uTipo == 11) return hTela(p, px, aux);
  if (uTipo == 12) return hVidro(p, px, aux);
  if (uTipo == 13) return hRiscos(p, px, aux);
  if (uTipo == 14) return hFinos(p, px, aux);
  if (uTipo == 15) return hBolinhas(p, px, aux);
  aux = 0.0; return 0.5;
}

vec3 L(vec3 s){ return pow(s, vec3(2.2)); }
vec3 paleta(float x, bool cima){
  // teal, rosa, azul, amarelo, branco (em cima); teal, branco, azul (embaixo)
  if (cima) {
    if (x < 0.32) return L(vec3(0.16,0.76,0.71));
    if (x < 0.52) return L(vec3(0.90,0.32,0.57));
    if (x < 0.70) return L(vec3(0.38,0.45,0.88));
    if (x < 0.82) return L(vec3(0.96,0.83,0.30));
    return L(vec3(0.93,0.93,0.95));
  }
  if (x < 0.55) return L(vec3(0.16,0.76,0.71));
  if (x < 0.82) return L(vec3(0.93,0.93,0.95));
  return L(vec3(0.38,0.45,0.88));
}

// interface do celular: papel de parede + grade de ícones + dock (coordenadas em mm, centro da tela)
vec3 telaUI(vec2 p, float px){
  float g = clamp((p.y + 73.0)/146.0, 0.0, 1.0);
  vec3 fundo = mix(L(vec3(0.33,0.16,0.62)), L(vec3(0.10,0.38,0.85)), g);
  fundo += L(vec3(0.95,0.45,0.55))*0.35*exp(-pow(length(p - vec2(18.0,-30.0))/22.0, 2.0));
  vec3 c = fundo;
  vec2 cel = vec2(16.0, 19.0);
  vec2 q = p - vec2(-24.0, -62.0);
  vec2 id = floor(q/cel + 0.5);
  vec2 f = q - id*cel;
  bool dentro = id.x >= 0.0 && id.x <= 3.0 && id.y >= 0.0 && id.y <= 5.0;
  if (dentro) {
    vec2 d = abs(f) - vec2(4.0);
    float sdf = length(max(d, 0.0)) - 2.6;
    float icone = 1.0 - smoothstep(-px, px, sdf);
    float hh = hash12(id + 3.0);
    vec3 ci = hh < 0.2 ? L(vec3(0.20,0.80,0.40)) : hh < 0.4 ? L(vec3(1.0,0.55,0.15)) : hh < 0.6 ? L(vec3(0.95,0.95,0.97)) : hh < 0.8 ? L(vec3(0.15,0.55,1.0)) : L(vec3(1.0,0.25,0.35));
    c = mix(c, ci, icone);
  }
  // dock
  if (p.y > 52.0 && p.y < 70.0 && abs(p.x) < 31.0) c = mix(c, vec3(0.6), 0.25);
  return c;
}

// cor, aspereza e emissão de cada tipo
void corDe(vec2 p, float h, float aux, float px, out vec3 c, out float rough, out vec3 emis){
  emis = vec3(0.0); rough = 0.5;
  float hq = uEstilo > 0.5 && uEstilo < 1.5 ? floor(h*3.0 + 0.5)/3.0 : h; // toon: cor em faixas
  if (uTipo == 1) {
    c = mix(L(vec3(0.62,0.30,0.21)), L(vec3(0.96,0.66,0.50)), hq);
    rough = 0.55;
  } else if (uTipo == 2) {
    c = mix(L(vec3(0.80,0.52,0.38)), L(vec3(0.97,0.79,0.62)), 0.35 + 0.65*hq) * (0.9 + 0.2*aux);
    rough = 0.6;
  } else if (uTipo == 3) {
    c = mix(L(vec3(0.83,0.60,0.46)), L(vec3(0.98,0.85,0.71)), hq);
    rough = 0.5;
  } else if (uTipo == 4) {
    c = mix(L(vec3(0.86,0.66,0.52)), L(vec3(1.0,0.92,0.82)), hq) * (0.94 + 0.12*aux);
    rough = 0.45;
  } else if (uTipo == 5) {
    c = mix(L(vec3(0.82,0.70,0.62)), L(vec3(0.99,0.95,0.90)), hq);
    rough = 0.4;
  } else if (uTipo == 6 || uTipo == 17) {
    c = paleta(aux, uTipo == 6) * mix(0.06, 1.0, smoothstep(0.0, 0.5, h));
    rough = 0.3;
    // nuvem de elétrons: a esfera vira brilho difuso com faíscas
    float glow = exp(-pow((1.0 - h)*1.5, 2.0));
    vec2 g = floor(p*22.0); float sp = step(0.985, hash12(g + floor(uTempo*6.0)*0.0));
    float faisca = sp * (1.0 - smoothstep(0.0, 0.35, length(fract(p*22.0)-0.5)));
    emis = uFuzz * (pow(paleta(aux, uTipo == 6), vec3(1.25)) * glow * 0.55 + vec3(faisca)*3.0);
    c *= (1.0 - 0.95*uFuzz);
  } else if (uTipo == 21) {
    // caramelo: fios claros e escuros
    vec3 escuro = L(vec3(0.42,0.24,0.10)), claro = L(vec3(0.88,0.60,0.30));
    c = mix(escuro, claro, 0.25 + 0.75*hq) * (0.8 + 0.4*aux);
    rough = 0.35;
  } else if (uTipo == 22) {
    c = mix(L(vec3(0.55,0.36,0.18)), L(vec3(0.96,0.82,0.60)), hq) * (0.92 + 0.16*aux);
    rough = 0.3;
  } else if (uTipo == 7) {
    c = mix(L(vec3(0.50,0.13,0.18)), L(vec3(0.93,0.50,0.54)), hq);
    rough = 0.32; // lábio tem brilho úmido
  } else if (uTipo == 11) {
    c = L(vec3(0.02,0.025,0.03));
    rough = 0.08;
    emis = telaUI(p, px) * 1.15;
  } else if (uTipo == 12) {
    c = L(vec3(0.11,0.14,0.19)) + L(vec3(0.20,0.22,0.24))*aux;
    rough = mix(0.12, 0.35, aux);
    // pixels da tela debaixo do vidro (subpixels RGB a 0,06 mm; aqui 1 unidade = 0,1 mm)
    vec2 sp = p/0.6;
    float col3 = mod(floor(sp.x*3.0), 3.0);
    vec3 rgb = col3 < 0.5 ? vec3(1.0,0.12,0.1) : col3 < 1.5 ? vec3(0.1,1.0,0.25) : vec3(0.15,0.25,1.0);
    float cel = (1.0 - smoothstep(0.30, 0.45, abs(fract(sp.y)-0.5))) * (1.0 - smoothstep(0.25, 0.42, abs(fract(sp.x*3.0)-0.5)));
    float vis = fino(px, 1.0/0.6*3.0);
    vec3 base = mix(L(vec3(0.33,0.16,0.62)), L(vec3(0.10,0.38,0.85)), 0.5);
    emis = mix(base*0.5, rgb*cel*1.2*base.b*2.5, vis) * 0.55;
  } else if (uTipo == 13) {
    c = mix(L(vec3(0.15,0.18,0.24)), L(vec3(0.44,0.50,0.60)), hq);
    rough = 0.38;
  } else if (uTipo == 14) {
    c = mix(L(vec3(0.24,0.28,0.36)), L(vec3(0.56,0.62,0.72)), hq);
    rough = 0.42;
  } else if (uTipo == 15) {
    c = mix(L(vec3(0.30,0.35,0.44)), L(vec3(0.70,0.75,0.84)), hq);
    rough = 0.45;
  } else if (uTipo == 16) {
    c = mix(L(vec3(0.30,0.36,0.46)), L(vec3(0.74,0.79,0.88)), hq);
    rough = 0.4;
  } else {
    c = vec3(0.5);
  }
  if (uTipo >= 1 && uTipo <= 5) c *= uTinta; // lábios: puxa a pele para o rosado
  // saturação por estilo (A maquete +, B toon ++)
  float sat = uEstilo < 0.5 ? 1.25 : uEstilo < 1.5 ? 1.5 : 1.0;
  float lum = dot(c, vec3(0.2126,0.7152,0.0722));
  c = max(vec3(0.0), mix(vec3(lum), c, sat)) * uBrilho;
}
`;

export type UniformsCamada = Record<string, THREE.IUniform>;

export function uniformsBase(): UniformsCamada {
  return {
    uTipo: { value: 0 },
    uEsc: { value: 1 },
    uAmp: { value: 0 },
    uLado: { value: 1 },
    uCurv: { value: 0 },
    uPlano: { value: 1 },
    uFuzz: { value: 0 },
    uEstilo: { value: 2 },
    uTempo: { value: 0 },
    uSeed: { value: 0 },
    uDofRange: { value: 6 },
    uRcam: { value: 12.4 },
    uBrilho: { value: 1 },
    uLinha: { value: 0.12 },
    uNormK: { value: 1 },
    uFogCor: { value: new THREE.Color(0, 0, 0) },
    uFog: { value: new THREE.Vector2(8, 26) },
    uTinta: { value: new THREE.Vector3(1, 1, 1) },
    uCurvX: { value: 3 },
    uCasca: { value: 0 },
    uPeloLen: { value: 0 },
    uDens: { value: 1 },
  };
}

/** Injeta a superfície procedural num material padrão do three. */
export function injeta(mat: THREE.Material, u: UniformsCamada) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\n" + DECL + FUNCS)
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vLoc = transformed;
        if (uCasca > 0.0) {
          // cada camada sai da pele ao longo da normal e cai um pouco com o peso
          transformed += objectNormal * uCasca * uPeloLen;
          transformed.y -= uCasca * uCasca * uPeloLen * 0.45;
        }
        if (uPlano > 0.5 && uAmp > 0.0) {
          float auxv; float hv = H(transformed.xz*uEsc, 0.35, auxv);
          transformed.y += uLado * uAmp * (1.0 - hv);
        }`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `
        vec4 lp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp;
        #endif
        vec4 wp = modelMatrix * lp;
        wp.y += uLado * uCurv * (wp.x*wp.x*uCurvX + wp.z*wp.z);
        vMundo = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + DECL + FUNCS)
      .replace(
        "#include <clipping_planes_fragment>",
        /* glsl */ `#include <clipping_planes_fragment>
        vec2 pp = vLoc.xz*uEsc;
        if (uPlano < 0.5) pp = vec2(vLoc.x + vLoc.y*0.35, vLoc.z - vLoc.y*0.2)*uEsc;
        float pxL = max(length(fwidth(pp)), 1e-5);
        float auxF; float hF = H(pp, pxL, auxF); if (uPlano < 0.5) hF = mix(0.62, hF, 0.3);
        float eps = max(0.006, pxL*0.6);
        float a1, a2;
        float hX = H(pp + vec2(eps, 0.0), pxL, a1);
        float hZ = H(pp + vec2(0.0, eps), pxL, a2);
        vec2 grad = vec2(hX - hF, hZ - hF)/eps;
        vec3 corP; float roughP; vec3 emisP;
        corDe(pp, hF, auxF, pxL, corP, roughP, emisP);
        if (uPeloLen > 0.0) {
          // fios: uma célula 3D por fio, mais fino perto da ponta; fios de tamanhos diferentes
          vec3 cp = vLoc * uDens;
          vec3 ci = floor(cp);
          vec3 cf = fract(cp) - 0.5;
          float rnd = hash12(ci.xy + ci.z*7.13);
          vec3 jit = (vec3(hash12(ci.yz+1.7), hash12(ci.zx+3.1), hash12(ci.xy+5.3)) - 0.5)*0.5;
          float d = length(cf - jit);
          float raio = (1.0 - uCasca) * (0.46 + 0.12*rnd);
          if (uCasca > 0.0 && (d > raio || uCasca > 0.55 + 0.45*rnd)) discard;
          // raiz escura, ponta clara, cada fio com o seu tom
          corP *= mix(0.42, 1.18, uCasca) * (0.85 + 0.3*rnd);
          roughP = mix(0.7, 0.4, uCasca);
        }`,
      )
      .replace("#include <color_fragment>", "#include <color_fragment>\n if (uTipo != 0) diffuseColor.rgb = corP;")
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\n if (uTipo != 0) roughnessFactor = roughP;",
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        if (uPlano > 0.5) {
          // normal voltada para o vão (a escala do grupo cancela na inclinação)
          vec2 G = uAmp * uEsc * uNormK * grad;
          vec3 nW = normalize(vec3(-G.x + 2.0*uCurv*vMundo.x*uCurvX, -uLado, -G.y + 2.0*uCurv*vMundo.z));
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
        }`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n if (uTipo != 0) totalEmissiveRadiance += emisP;")
      .replace(
        "#include <dithering_fragment>",
        /* glsl */ `#include <dithering_fragment>
        if (uEstilo > 0.5 && uEstilo < 1.5 && uPlano > 0.5 && uLinha > 0.0) {
          // toon: contorno na base de cada saliência, com espessura constante na tela
          float w = fwidth(hF)*1.6 + 1e-4;
          float tinta = 1.0 - smoothstep(0.0, w, abs(hF - uLinha));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.06,0.04,0.05), tinta*0.92);
        }
        float nevoa = smoothstep(uFog.x, uFog.y, length(vMundo.xz));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogCor, nevoa);
        float dist = length(vMundo - cameraPosition);
        gl_FragColor.a = clamp(abs(dist - uRcam)/uDofRange + uFuzz*0.85, 0.0, 1.0);`,
      );
  };
  mat.customProgramCacheKey = () => "dedo-" + mat.type;
}
