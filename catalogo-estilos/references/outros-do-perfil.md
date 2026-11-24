# Outros estilos já usados no perfil

Receitas parciais: o código desses reels foi apagado no arquivamento. Cada ficha guarda o que se sabe (visual, decisões, erros). Ao usar um deles de novo, reconstrua a partir daqui e dos quadros, e depois complete a ficha (e copie o código que funcionou para `codigo/`).

## Fotorreal (Blender)

Reels: ar do quintal / poço canadense (07/11, dir. D), bateria do celular (10/11, dir. D). Quadros: `fotorreal_bateria.jpg`, `fotorreal_ar_quintal.jpg` (este mostra mais os trechos de motion do que o 3D).

- **Visual:** materiais reais (metal, plástico, terra em corte, água), profundidade de campo, luz de estúdio ou de fim de tarde, câmera macro.
- **Como foi feito:** Blender gera só os planos 3D (44% do tempo no ar do quintal); o resto é motion no Remotion (selos, mapas, contadores). Cada plano 3D é renderizado como sequência de imagens com **âncoras** (pontos 3D projetados para a tela) que posicionam selos e setas no Remotion.
- **Motor:** EEVEE (~6,5 a 10 s/quadro). **Cycles na CPU desta máquina é inviável para vídeo** (~2,5 min/quadro a 48 amostras, i7-1255U sem GPU dedicada): o vídeo levaria dias. Cycles só para a capa ou uma prévia.
- **Virada:** Freestyle laranja (cor do linestyle em espaço LINEAR, view transform Standard).
- **Erros conhecidos:** foco calibrado no gancho não serve para câmera mais longe (o plano todo saiu borrado: confira um quadro cru antes da fila inteira); `focus_object` vazio não desfoca, use `focus_distance`; no Blender 5.2, `ShaderNodeMix` RGBA tem vários sockets "A"/"B" (escolha por tipo); caminho de saída relativo vai para outro lugar (use absoluto); Boolean com o eixo do cilindro exatamente no plano de corte inverte (desloque 0,0007 e use número ímpar de segmentos); junção (mklink /J) dentro de `public/` quebra o bundle do Remotion; Remotion e Blender em paralelo dobram o tempo.

## Drone cinematográfico (maquete aérea)

Reel: condomínio solar (10/11, dir. C). Quadro: `drone_condominio.jpg`.

- **Visual:** a cena inteira vista do alto em sobrevoo lento, como imagem de drone: telhados com placas, ruas, deserto/terreno em volta; câmera que desce e gira; luz de dia.
- **Como foi feito:** Three.js, 15 planos presos às palavras; celular "Amigo da placa solar" em motion por cima.
- **Erros conhecidos:** depois do modo arame da virada, céu e névoa não voltavam e o último quadro ficou diferente do primeiro: restaure o estado em toda função que aplica o arame; placa "apagada" = difuso escuro e fosco; um RenderPass extra com `clearDepth` zera a profundidade.

## Documentário de aquário (fotorreal de fim de tarde)

Reel: peixe infinito (11/11, dir. C). Quadro: `documentario_aquario_peixe.jpg`.

- **Visual:** câmera na altura da água e colada no corte da caixa, como documentário de natureza: luz de fim de tarde, água translúcida, peixes paramétricos, tomates e alface reais.
- **Como foi feito:** Three.js do zero: tilápia paramétrica com dobra na CPU, caixa de 1.000 L com plano de recorte e tampas recalculadas, alface instanciada, pulsos de água por emissiveMap.

## Papel dobrado (papercraft facetado)

Reel: galinhas e ovo (11/11, dir. C). Quadro: `papel_dobrado_galinhas.jpg`.

- **Visual:** tudo de papel dobrado com facetas (low poly de papel), cores quentes de papel colorido, sombras suaves, cenário de fazendinha.
- **Erros conhecidos:** corpo de esferas parece bicho que "engoliu um ovo": faça malha contínua (seções elípticas ao longo de uma curva Catmull-Rom); pescoço enfiado no peito parece tubo: cubra a junta com uma "capa" de penas que nasce nas costas e afina dentro do pescoço; legenda fora dos personagens mirando a câmera baixo (alvo y≈0,12).

## Papel e tinta (sépia, livro pop-up)

Reel: Manuscrito 512 (05/11, dir. A, mesclada com os pontos da C). Quadro: `papel_e_tinta_manuscrito.jpg`.

- **Visual:** papel envelhecido, tinta sépia, livro pop-up (arcos e prédios que se levantam da página), recortes de personagens, carta com lupa, relevo de curvas de nível; à noite, pontos dourados (sino de pontos laranja).
- **Erros conhecidos:** no vertical só há ~17° de campo horizontal; ondulação da página abaixo da mesa vira faixa preta; hachura em espaço de mundo vira listras em superfícies grandes (use curvas de nível); documentos e mapas passaram de 2 s cada (meta ≤ 2 s seguidos e ≤ 25% no total).

## Tabuleiro (mapa em relevo com peças)

Reel: CPF (03/11, dir. B). Quadro: `tabuleiro_cpf.jpg`.

- **Visual:** mapa do Brasil em relevo sobre uma mesa, como jogo de tabuleiro; estados que se levantam; números grandes em peças; peões de torcida; cartões de jogo.
- **Como foi feito:** Three.js numa mesa só; a câmera atravessa a mesa entre estações; `<ThreeCanvas>` com `autoClear=false`, desenho em `useLayoutEffect` (~0,35 s/quadro).
- **Erros conhecidos:** SpotLight na parede satura fácil (paleta azul-tinta pede intensidade baixa).

## Reclame antigo (cartaz de época)

Reel: Fordlândia (03/11, dir. C). Quadro: `reclame_fordlandia.jpg`.

- **Visual:** cartaz publicitário dos anos 1920-30: raios de sol no fundo, papel com mofo, tipografia de reclame, mapas pintados, versão 1 × versão 2 lado a lado.
- **Erros conhecidos:** com ACES e exposição 1,2, o azul-tinta da saída exige `0x1b2032` na entrada: meça o pixel.

## Sprites 2D (anime em pixel) e fliperama de sprites

Reels: Goku (08/11, dir. B), Demon Slayer (09/11, dir. B). Quadros: `sprites_goku.jpg`, `fliperama_demon_slayer.jpg`. Ver também `pixel-fliperama.md`.

- **Lição principal (Goku):** boneco procedural em código não alcança pixel art desenhada; o usuário rejeitou o rig 2D e o 3D. **Personagem = sprite gerado por modelo de imagem** (folha de teste primeiro), cenário em pixel por código.
- **Como foi feito:** folhas de sprites do ChatGPT com fundo magenta → recorte por grade → chave de cor (desfazer a mistura; tirar fio rosa no cabelo onde min(R,B)−G>28) → paleta única de 96 cores → canvas 540x960 com 2 px por pixel da arte e zoom só inteiro.
- **Fonte:** Press Start 2P não tem "Í" (vira ±): rótulos acentuados em Pixelify peso 400.
- **Variações testadas no Demon Slayer:** gravura Taishō (paleta de xilogravura a 74% sobre a cor original, tinta só em borda forte, papel com veios) e HD-2D (brilho, tilt-shift, feixes de luz, granulação).

## Editorial escuro (motion com objeto 3D)

Reels: caderno JR2 (23/10, "Joalheria"), álbum JR3 (28/10, "Mesa de luz"). Quadros: `joalheria_jr2.jpg`, `mesa_de_luz_jr3.jpg`.

- **Visual:** fundo verde-escuro, paleta "Verde e Ouro" (#0F2A22, #08190F, marfim #EFE6D2, sálvia #8FA89A, ouro #C9A44C→#E6C878), tipografia Cormorant + Inter + JetBrains Mono + Caveat, objeto 3D único (caderno) ou fotos reais com lupa e película de filme.
- **Erros conhecidos:** material com `map` precisa de cor #ffffff (senão marfim×marfim vira bege); cantoneira com chanfro gera reflexo branco puro (extrude sem bevel); algarismos da Cormorant são de estilo antigo (use `lining-nums`).

## Outros pontuais

- **Prensa** (Cacareco, 27/10): retícula de jornal, colagem, legenda em etiquetas; virada em viewport 3D visto de cima.
- **Cordel em relevo** (preparo/renda, 01/11): chapas de xilogravura geradas por código, página que cai como transição, varal.
- **Saga entalhada** (Bluetooth, 30/10): madeira entalhada, fogo, runas, partículas (brasas, faíscas, cinzas, bokeh). Erros: `fbm2` dentro do laço de pixels custou 55 s/quadro; flare anamórfico gera "pente" de riscos em bordas douradas (deixe flare 0); emissivo forte vira branco no ACES.
- **Low poly flutuando** e **massinha em estúdio escuro** (prévias B e C do ar do quintal, não escolhidas): mesma geometria da maquete, mudando material, luz e fundo.
- **Vetor chapado** e **nanquim + aquarela em SVG** (prévias E e F do ar do quintal, não escolhidas).

## POV em massinha (clay 3D, mãos de quem assiste)

Reel: abelhas "E se" (prévia C refeita em 11/11/2026, Three.js). Código: `codigo/abelhas_toon_src/three/` (`kit.ts` direção "C", `mao.ts`, `mundo.ts`). Copie `mao.ts` antes de arquivar o reel.

- **Visual:** primeira pessoa; mãos e antebraços de massinha com manga de moletom entrando pelas bordas de baixo; objetos de massinha; luz suave de janela; cores pastel.
- **Material:** `MeshPhysicalMaterial` roughness ≥0,78, sheen 0,45, bump de "digital" (arcos concêntricos + amassado, `texDigital`) com bumpScale 1,4; amassado da malha com ruído 3D só da posição (não racha costura) com amplitude de 3,5% do raio. Metal, olhos e vidro com `liso: true`.
- **Luz:** sol 3,1 com `VSMShadowMap` (radius 9, blurSamples 20) para sombra macia; hemisfério 0,5; RoomEnvironment 0,32 (mais que isso lava a massinha); ACES.
- **Mãos (`Mao`):** 4 dedos com 3 falanges + polegar (metacarpo + 2), palma em superelipsoide (caixa arredondada parece bloco); pegadas por contato analítico (SDF de esfera, cápsula, cilindro): `pegaBastao` (punho), `fecha` (curva cada dedo até encostar), `polegarIK` (descida por coordenadas), `pegadaCaneta` (tripé do pincel). Teste numa bancada (`p_maos` + closes) antes das cenas: a vista de lado engana, confira na vista de quem assiste.
- **Erros conhecidos:** câmera POV perto demais (fov 56 a 0,3 m) enche o quadro de antebraço; use fov 44-50 a ~0,7 m. Faca com a lâmina apontando para longe some atrás da laranja e da mão: atravesse a faca entre as mãos. Prato segurado pelas bordas pede prato menor (R ~0,12) ou as mãos saem do quadro.

## Toon das abelhas refeito (11/11/2026)

O toon que falhou em Blender saiu certo em Three.js seguindo a ficha `toon-3d.md` (casco em tela, rampa de 3 faixas, sem environment, NeutralToneMapping). Quadro: prévia B em `reels/abelhas_e_se/saida/previas_v2/folha_B.jpg`.

## Câmera científica de alta velocidade (filmagem de pesquisa)

Reel: raio que sai do chão (11/11, dir. C, livre). Prévia: `reels/raio_sobe_do_chao/saida/previas/direcoes_raio.jpg`.

- **Visual:** imita o vídeo de câmera rápida de um laboratório: noite quase preto e branco, azul frio, grão forte (0,075), vinheta 0,55, aberração cromática leve, bloom forte no raio; visor com cantos e "● REC". Só o que é muito saturado guarda a cor (cargas laranja/azuis, farol vermelho, luzes da cidade): "cor seletiva" no shader final.
- **Receita (Three.js):** ACES com exposição 1,45; materiais Standard escuros sem contorno; céu de tempestade em shader fbm numa ESFERA (plano mostra a borda quando a câmera olha para cima), iluminado por um uniform de clarão; base da nuvem = 4 planos horizontais com fbm e alfa; névoa exp2 0,0026 (mais que isso o plano aberto fica preto). Shader final: `guarda = smoothstep(0.45, 0.75, (max-min)/max) * step(0.12, max)`; `col = mix(cinza_frio, original, guarda)`.
- **Erros conhecidos:** sprites de carga estouram para branco (multiplique a cor do sprite por ~0,6); luz pontual do raio forte demais faz o topo do morro parecer neve; perto da câmera o raio vira coluna de luz (afinar pelo raio da distância).
- Código em `codigo/raio_cientifica_src/three/mundo.ts` (copiar para `codigo/` antes de arquivar).

## Mapa noturno de plantão (notícia ao vivo)

Reel: EUA param todos os voos (13/11/2026, dir. C). Quadros: `quadros/noturno_eua_voos.jpg`. Código: `codigo/eua_voos_src/` (vai para `reels/done/` depois do ok; copiar para `codigo/` antes de apagar o projeto).

- **Como reconhecer:** fundo quase preto; o país feito de milhares de setinhas de avião instanciadas (amarelo #F5D27A) com bloom; alertas em vermelho #E5322D e laranja #F2A23A; selo vermelho "URGENTE · …" fixo logo abaixo dos 250 px; títulos Bebas Neue em duas cores, selos e terminal em JetBrains Mono; câmera 3D que mergulha nas cidades.
- **Receita:** `MeshBasicMaterial` nas setas (cor por instância > 1 para o bloom pegar), `UnrealBloomPass(0.62, 0.32, 0.7)`, AgX com exposição 1,15, tilt-shift com força 0,45 como profundidade de campo, grão 0,028, vinheta 0,55. Mapa = extrusão escura do contorno (Natural Earth, projeção Albers) + divisas em `LineSegments` finas. Aviões em voo andam numa Bézier entre cidades e levam trilha (quad com gradiente, aditivo). Rede de centros = tubos finos emissivos + halo em sprite. Radar = disco com shader de varredura (verde #2BD98A só no "Ataque?").
- **Erros conhecidos:** nuvem em plano grande na frente da câmera vira névoa cinza na tela toda (use faixas finas e opacidade baixa); chão PBR escuro com luz de contorno fica marrom nas tomadas do mapa (desligue a contraluz quando a câmera está longe); **render com `--concurrency=3` perdeu trilhas e bloom** em boa parte do vídeo: renderize com 1 aba e confira quadros do MP4 contra `renderStill` isolado (SSIM).

## Comercial fotorreal ao sol (Three.js, lente longa)

Reel: forno solar de gabinete (14/11/2026, dir. C escolhida). Quadros: `quadros/comercial_fotorreal_forno_solar.jpg`. Código: `codigo/forno_solar_src/three/` (kit.ts direção "C"; vai para `reels/done/` depois do ok; copiar para `codigo/` antes de apagar).

- **Como reconhecer:** parece filme publicitário de produto: teleobjetiva (fov 22-24 a 4-7 m), fundo com desfoque de lente de verdade (por profundidade, não faixa), sol de fim de manhã alto e levemente quente, vidro e espelho refletindo um céu azul, poeira no feixe, grão fino e aberração cromática leve.
- **Receita:** MeshPhysical com texturas de desgaste (amarelado, poeira); `scene.environment` = PMREM de uma esfera de céu em shader (zênite azul, horizonte claro, disco de sol forte) com intensidade 0,55; sol 4,2 com VSMShadowMap (radius 6); ACES; pós: DOF próprio (passada de profundidade com MeshDepthMaterial RGBA, sem feixes nem partículas; círculo de confusão × (30/fov)² — sem esse fator a teleobjetiva quase não desfoca) → bloom (0,32/0,5/0,86) → Output → final (grão 0,022, vinheta 0,34, CA 1,6, sat 1,06).
- **Fundo de motion:** a mesma cena com foco a 0,25 m e abertura 8 (tudo desfocado) + escurecer 0,4.
- **Erros conhecidos:** `EdgesGeometry` não tira arestas de `RoundedBoxGeometry` (devolve 4 segmentos nulos): na virada em arame use a caixa equivalente; `pow()` de valor levemente negativo num shader aditivo gera NaN e o bloom pinta a tela inteira de preto (use clamp); feixe aditivo some contra parede clara: faça-o atravessar o quadro de lado e com ganho ~2; a máscara `clip-path: inset(0 …)` corta descendentes ("y"): dê folga negativa e solte no fim.
