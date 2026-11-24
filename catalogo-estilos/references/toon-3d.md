# Toon 3D com contorno (cel shading)

Reels: milpa (08/11), cogumelo na borra (09/11), quintal produtivo (10/11), hiratake e enoki (11/11), Ueno Bank (07/11, dir. C). Melhor exemplo atual: prévia B do Burger King (`quadros/bk_previa_B.jpg`). Erro de referência: `quadros/erro_abelhas_toon_sem_contorno.jpg`.

## Como reconhecer (checklist da prévia)

Se faltar qualquer item, não é toon: corrija antes de mostrar.

1. **Contorno escuro em todo objeto**, com espessura constante na tela (3 px a 1080 de largura nos objetos principais, 1,5 a 2 px nos detalhes). O chão e os fundos grandes ficam sem contorno.
2. **Duas ou três faixas de luz com borda dura** em cada objeto: luz, meio-tom e sombra. Dá para ver o volume de uma esfera pela faixa de sombra.
3. **Cores chapadas e saturadas**, sem textura de foto (sem veio de madeira, sem poro de pele, sem azulejo fotográfico).
4. **Sombra projetada** no chão, também dura.
5. **Formas simples e grossas**, de brinquedo: poucas peças, bordas arredondadas, proporção exagerada (cabeça grande, mão grande).
6. **Movimento com squash and stretch**: o que pula estica, o que cai amassa e volta.

Referência externa: o "Toon 3D" do vídeo do Butter Motion (`quadros/ref_externa_butter_12_estilos.jpg`, linha 3) mostra os itens 1, 2 e 5 com clareza: nuvens de bolas brancas com uma faixa cinza dura e contorno fino em tudo.

## Receita (Three.js, testada no Burger King e no Ueno Bank)

Código pronto em `codigo/estilos_threejs.ts` (direção "B").

- **Material:** `MeshToonMaterial` com `gradientMap` de 3 faixas (90, 185, 255) e `NearestFilter`. O filtro "nearest" é o que deixa a borda entre as faixas dura.
- **Contorno:** casco invertido **em espaço de tela**: um segundo mesh com a mesma geometria, `side: BackSide`, e um vertex shader que empurra cada vértice N pixels para fora na direção da normal projetada. Por ser em pixels, o traço tem a mesma espessura perto e longe. Cor `#1a0f0c` (quase preto, levemente quente).
- **Luz:** sol direcional branco forte (2,6) com sombra (mapa 2048, `bias -0.0004`, `normalBias 0.01`), hemisfério neutro (1,5) e contraluz (1,4). **Sem HDRI e sem `scene.environment`**: luz ambiente demais joga tudo na faixa clara e o toon fica chapado.
- **Tone mapping:** `NeutralToneMapping` (ACES lava as cores chapadas).
- **Pós:** sem tilt-shift, sem grão. Vinheta leve (0,18). Antialias com MSAA 4.
- **Fundo:** céu em gradiente ou cor chapada com raios/listras (tela de seleção). Chão grande sem contorno.

## Receita em Blender (se o vídeo precisar de Blender, ex.: mãos MPFB2)

O toon das abelhas falhou em Blender por três motivos. Para dar certo:

- **Contorno:** casco invertido com modificador Solidify, `offset 1`, normais invertidas, material escuro **e o descarte de faces traseiras coerente com a mistura**: com backface culling ligado, as faces que aparecem são as frontais do casco; o material delas tem de ser o escuro (nas abelhas a mistura por "Backfacing" mandava essas faces para o transparente e o contorno sumia). Alternativa mais segura: **Line Art** (Grease Pencil) ou **Freestyle** com espessura em pixels.
- **Espessura do Solidify em metros proporcional à distância da câmera**, não um valor fixo de 1 mm: alvo de 3 px a 1080 de largura. Com objetos a ~1 m de uma lente de 30 mm, isso é na ordem de 3 a 5 mm, não 0,1 mm.
- **Luz:** EEVEE, um Sun forte e um preenchimento fraco, **sem HDRI de céu**. A rampa (Shader to RGB → ColorRamp constante) precisa ter os limites onde a luz real cai: meça a luminância dos objetos principais e ponha os limites entre a sombra e a luz deles (nas abelhas os limites eram 0,12 e 0,45 e quase tudo passava de 0,45).
- **Cena própria para o toon:** câmera mais perto, paleta saturada e formas simplificadas. Não reaproveite a cena fotorreal só trocando o material: o que dava riqueza (textura) some e a imagem fica vazia.

## Bloco para o prompt (colar na direção)

```
B. Toon 3D com contorno (cel shading), siga a ficha toon-3d da skill catalogo-estilos: contorno escuro em todo objeto com espessura constante na tela (~3 px a 1080 de largura), 2 a 3 faixas de luz com borda dura (dá para ver o volume pela faixa de sombra), cores chapadas e saturadas sem textura de foto, sombra projetada dura, formas simples e grossas de brinquedo, squash and stretch ([o que pula/cai/bate neste tema]). Luz: um sol direcional forte e hemisfério neutro, sem céu HDRI. Referência de qualidade: quadros/bk_previa_B.jpg da skill.
```

## Erros conhecidos

- **Contorno invisível** (abelhas, 11/11): casco fino demais em metros e material do casco transparente nas faces visíveis. Ver "Receita em Blender".
- **Toon chapado, sem volume** (abelhas): HDRI + sol + preenchimento deixaram tudo na faixa clara.
- **Mesma cena do realista com material trocado** (abelhas): a imagem fica vazia; o toon precisa de cena, câmera e paleta próprias.
- **Faces invertidas** (pitaya, galho do cacto): o contorno cobre o objeto. Confira as normais (`computeVertexNormals`, DoubleSide só onde precisa).
- **Chão grosso tampando buraco** (milpa): o chão cobria a cova e as sementes sumiam; fure o índice do chão no ponto do buraco.
- **Galinha "que engoliu um ovo"** (galinhas, papel dobrado, mas vale para o toon): corpo de esferas soltas parece errado; use malha contínua (seções ao longo de uma curva) e uma "capa" que cubra a junta do pescoço.
- **Câmera atravessando objetos** (cogumelo, armário): esconda a peça no trecho ou mude o plano.

## Aprendido no reel das abelhas (11/11/2026, entregue em toon)

- Vídeo inteiro em Three.js + Remotion (21 tomadas, 2.338 quadros) renderiza em ~6 min nesta máquina com `--concurrency=4 --gl=angle`. Código: `codigo/abelhas_toon_src/three/reel.ts` (tomadas presas à fala, cada cenário com `anima(t)`).
- Destaque em 3D que precisa ser visto de qualquer ângulo (banca "acendendo"): use `THREE.Sprite` (sempre de frente para a câmera). Disco plano visto de lado some.
- Brilho aditivo grande com `depthTest: false` perto da câmera lava o quadro inteiro.
- Varredura sólido → arame (virada): dois ramos, `clippingPlanes` opostos; o contorno precisa de `clipping: true` e dos chunks `clipping_planes_*` no shader.

## Aprendido no reel das galinhas de Bill Gates (12/11/2026, entregue em toon)

Quadros: `quadros/toon_galinhas_bill_gates.jpg`. Código: `reels/todo/galinhas_bill_gates/saida/projeto/src/three/` (vai para `reels/done/` depois do ok).

- **Bicho como uma malha só:** galinha e pintinho por campo de distância (elipses + cones com união suave) → `MarchingCubes` do Three (preencher `field` com `-sdf`, `isolation = 0`) → `mergeVertices`. Cor por vértice misturada pela distância a cada primitiva (crista, bico, cauda), UV cilíndrico gerado à mão (sem UV o bump não aparece). O contorno em tela funciona direto nessa malha. Código em `bicho.ts`.
- **Bicar sem quebrar a malha:** dobra do pescoço no vertex shader (`onBeforeCompile`), com peso suave a partir de um pivô; o casco do contorno usa a mesma dobra.
- **Elipse girada:** `rx > 0` inclina o eixo Y para a frente; a cauda precisa de `rx` negativo, senão vira uma bola nas costas.
- **Anel no chão sumia** na terra laranja: tubo laranja + borda escura mais larga POR BAIXO (o topo da borda abaixo do topo do tubo, senão a vista de cima fica preta).
- **Virada sólido → arame:** NÃO faça uma 2ª passada de render no mesmo alvo com MSAA (o Three descarta o conteúdo multiamostrado a cada `render()` e o sólido some). Ponha uma cópia em arame de cada malha na mesma cena e corte por material (`material.clippingPlanes`), sólido embaixo do plano, arame em cima.
- **Luz da virada:** só apague as luzes depois que a varredura passa; apagar junto com o fundo deixa a tela preta.
- Render: 2227 quadros em ~7 min em 4 blocos (`--concurrency=3 --gl=angle`); blocos permitem refazer só um trecho e poupam disco.

## Aprendido no reel da laje (16/11/2026, escada de falhas, entregue em toon)

- **Encode do toon:** sem grão, ele comprime muito. Use `-crf 23 -maxrate 6M -bufsize 12M -preset slow` (≈ 70 MB em 146 s, SSIM 0,997 contra a matriz). Taxa fixa de 12 Mbps, herdada da maquete com grão, deu 210 MB e ele reclamou do tamanho.
- **Render pesado:** 146 s com corte por estêncil, contorno e ~45 planos levou ~80 min nesta máquina (`--concurrency=4`). Faça a revisão por quadros parados (um por plano) antes do render completo.
- **Corte que o detector não vê:** dois planos seguidos com o mesmo enquadramento (mesma câmera de corte frontal) não contam como corte; troque ângulo E escala a cada frase.
- Personagem fixo da série: `references/personagem-pedreiro.md`.

## Aprendido no reel do cachorro × moto (17/11/2026, entregue em toon, com elenco PRONTO)

Código: `codigo/cachorro_moto_toon_src/three/modelos.ts` (vai para `reels/done/` depois do ok). Elenco do Poly Pizza: Shiba/lobo/cervo/homem do Quaternius (CC0), boneco-base do Quaternius e moto do Poly by Google (CC BY 3.0).

- **Busque o modelo pronto antes de modelar** (regra do usuário): o pacote animado do Quaternius traz cachorro, lobo e cervo com Gallop, Walk, Idle, Attack e Gallop_Jump; o "Man" tem Clapping, Run e SwordSlash (serve de arremesso por cima do ombro); o "Animated Base Character" tem Driving_Loop (motoqueiro).
- **Escala do Quaternius:** a caixa da malha em repouso sai ~100x menor que o boneco animado (o esqueleto tem outra unidade). Meça a altura com a animação já aplicada (`Box3.setFromObject(obj, true)`).
- **Low poly → toon limpo:** normal média por POSIÇÃO (sem fundir vértices, que guardam peso e cor); `mergeVertices` não funde por causa dos atributos de pele.
- **ERRO GRAVE: giros que se acumulam.** Ajuste de pose por cima de uma animação (girar osso) vira acúmulo quadro a quadro nos ossos que o clip não controla: no render longo o dono foi se dobrando ao meio. Antes de aplicar a animação, volte TODOS os ossos à pose de repouso guardada no carregamento.
- **Gire ossos em eixo do CORPO, nunca no eixo local do rig** (`giraCorpo`: o eixo x frente / y cima / z lado vai para o mundo pela rotação da raiz). Girar no eixo local fez o "rindo" jogar os braços para as costas. Confira o sinal: com +X à frente, girar em +Z por um ângulo positivo leva o que aponta para baixo para a FRENTE.
- **Confira a frente do modelo pronto** com um quadro de teste de lado (farol, garfo, para onde o piloto olha) antes de montar os planos: a moto estava de ré em todos os planos, e duas "correções" se anulavam.
- **Rosto esculpido:** o "Man" tem nariz, olhos e boca na malha (só aparecem de frente). Para humano sem rosto, cubra a cabeça com um ovo de manequim da cor da pele, com calota de cabelo.
- **Sombra de lobo no lugar da do cachorro:** um lobo com `colorWrite=false` (não aparece e projeta sombra) e o cachorro sem `castShadow`. O sol precisa vir de LADO (perpendicular ao bicho) e a câmera de cima, senão a sombra vira um borrão.
- **Tela dividida com um mundo só:** renderize a metade de cima, copie a faixa central para um canvas 2D e renderize a de baixo. A árvore React precisa ser a mesma sempre (o canvas WebGL não pode ser recriado).

## Aprendido no reel "seu cachorro não veio por acaso" (17/11/2026, entregue em toon noturno)

Código: `reels/todo/cachorro_nao_veio_por_acaso_fiel/saida/projeto/src/` (vai para `reels/done/` depois do ok). Noite roxa com a luz quente da casa (#E08455), estrela cadente em sprites, escudo de luz em cúpula com fresnel, legenda fina (Outfit) no terço de cima.

- **Shiba do Quaternius sentado:** o pacote não tem animação de sentar. Pose por giros em eixo do corpo (`SIT` em modelos.ts: body 1.0, fu -0.9, bl 1.6, bu -2.6, bw 0.55, apoio pela caixa). Com `bw` alto (2.2) a pata traseira fica apontando para cima, e o usuário reprovou.
- **Retângulo preto no quadro = pixel NaN espalhado pelo bloom em blocos.** Passe `SANEIA` logo depois do RenderPass e guarda no `perturba` do relevo (det ~ 0 em superfícies longe da câmera).
- **Quadro parado rápido:** `node quadros.mjs <pasta> A:zero A:t:{"tm":12.5}` empacota UMA vez e renderiza vários quadros (5-40 s cada, contra ~2,5 min por `remotion still`).
- **Personagem preto de costas na rua à noite some.** Use câmera de lado com o poste recortando o perfil.
- **Sentada vista de frente parece em pé.** Ponha a câmera em 3/4 para a coxa aparecer.
- **O medidor não acha os cortes do toon** quando os planos têm a mesma paleta (deu "0 cortes" com cortes em 3,6 e 7,0 s). Confira por quadros antes de mexer.
- Render completo de 61 s (1.847 quadros, 4 cenários) em ~6 min com `--concurrency=4`.
