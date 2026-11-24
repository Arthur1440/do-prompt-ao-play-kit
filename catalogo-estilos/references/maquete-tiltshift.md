# Maquete de brinquedo com tilt-shift

Reels: Sisteminha (04/11, o maior: 406 mil views), Pinzón (29/10), Trump × Lula (06/11), teletransporte (06/11), aquaponia (10/11), morango (10/11), pitaya (10/11), biodigestor (05/11). Melhor exemplo atual: prévia A do Burger King (`quadros/bk_previa_A.jpg`). Quadros: `maquete_panela.jpg` (panela de pressão em corte, 12/11), `maquete_sisteminha.jpg`, `maquete_pitaya.jpg`, `maquete_trump_lula.jpg`, `maquete_biodigestor.jpg`.

## Como reconhecer (checklist da prévia)

1. **Faixa nítida horizontal e borrão crescendo para cima e para baixo** (tilt-shift): parece foto macro de uma miniatura.
2. **Plástico fosco de brinquedo**: superfícies lisas com leve verniz e microtextura de vinil; nada de textura fotográfica de material real em tamanho real.
3. **Base física**: a maquete está sobre uma tábua ou base com corte lateral (terra, resina) apoiada numa **mesa de madeira**; às vezes aparece a borda da mesa.
4. **Luz de fim de tarde**: sol quente e baixo, sombras longas e macias, reflexo de estúdio no plástico.
5. **Grão leve, vinheta forte e um toque quente** no pós.
6. **Bonecos colecionáveis** (com base preta redonda) quando há personagens; bonecos de cabeça de mola no Trump × Lula.

## Receita (Three.js, testada no Burger King, Sisteminha, pitaya, aquaponia)

Código pronto em `codigo/estilos_threejs.ts` (direção "A").

- **Material:** `MeshPhysicalMaterial`, `roughness` ~0,5, `clearcoat` 0,25 (0,6 em metal), `clearcoatRoughness` 0,45, `bumpMap` de ruído fino com `bumpScale` 0,15. Areia e superfícies claras com albedo abaixo de 0,6 (acima disso estoura).
- **Ambiente:** `RoomEnvironment` pelo `PMREMGenerator`, `environmentIntensity` 0,45 (reflexo de estúdio, não de céu).
- **Luz:** sol direcional quente `0xffcf9a` em 3,4 com sombra suave (PCFSoft, mapa 2048), hemisfério azul/terra (0,9), contraluz quente (1,6).
- **Tone mapping:** `ACESFilmicToneMapping`.
- **Pós, nesta ordem:** render → bloom leve (0,22 / 0,6 / 0,9) → OutputPass → tilt-shift horizontal → tilt-shift vertical → final (grão 0,035, vinheta 0,45, quente 0,025).
- **Tilt-shift:** shader de 2 passadas com faixa nítida em volta de `centro` (0 = base, 1 = topo) e borrão de `smoothstep(0.17, 0.52, distância)`. **Mova o `centro` para o objeto de cada cena** (mapa de foco por plano); só borre tudo quando a cena for um cartão/fundo (foco.borrao > 1,3).
- **Mesa:** plano de madeira 14 x 14 com textura de madeira repetida 3x, `roughness` 0,55, `clearcoat` 0,3.
- **Corte da maquete:** plano de recorte (`localClippingEnabled`) + tampa de perfil com a terra/resina à mostra (pitaya, Pinzón).

## Bloco para o prompt (colar na direção)

```
A. Maquete de brinquedo com tilt-shift (a direção do Sisteminha), siga a ficha maquete-tiltshift da skill catalogo-estilos: [o cenário do tema] em miniatura de plástico fosco sobre uma tábua com corte lateral numa mesa de madeira, luz quente de fim de tarde com sombras longas, faixa nítida no objeto de cada cena e borrão para cima e para baixo, reflexo de estúdio no plástico, grão leve e vinheta. [Personagens como bonecos colecionáveis com base redonda, se houver.] Referência de qualidade: quadros/bk_previa_A.jpg e maquete_sisteminha.jpg da skill.
```

## Erros conhecidos

- **Vapor em sprite some contra parede clara** (panela de pressão, 12/11): fumaça branca macia sobre azulejo creme não aparece. Na maquete, faça o vapor de **algodão**: chumaços 3D (icosaedro com ruído, `MeshStandardMaterial` rough 1 + bump) que pegam luz e sombra; crescem e encolhem em vez de só esmaecer. Código em `codigo/panela_maquete_src/three/mundo.ts` (`algodao()`). Parede de azulejo verde-sálvia dá mais contraste que creme.
- **Peças pequenas somem no 9:16** (panela): válvulas e pinos em escala real ficam ilegíveis; aumente 1,3-1,4x (proporção de brinquedo).

- **Faixa nítida fixa no meio da tela:** o objeto da cena fica borrado. Use foco por plano.
- **Gerador de ruído dentro do laço** (Sisteminha): travou a página; crie os geradores fora.
- **Clarão em cartão com verniz** (teletransporte): clearcoat atrás do personagem refletiu o sol; tire o verniz do que fica atrás.
- **Parede de caixa sumindo** (aquaponia): `LatheGeometry` com FrontSide; use DoubleSide. Mancha clara dentro da caixa era sol na parede interna: escureça o interior.
- **Anel aditivo sobre PVC branco vira branco** (aquaponia): brilho opaco + bloom.
- **Câmera dentro de fileira de palmeiras** (Pinzón): fica tapada.
- **Areia estourada** (Pinzón): albedo > 0,6.
- **Primeiro quadro diferente dos seguintes**: aqueça o renderizador (renderize um quadro descartável antes).
- **Encode:** o grão por quadro não comprime; taxa fixa em 2 passadas (~6 Mbps).

## Aprendido no reel do mascote do Cruzeiro (12/11/2026, entregue em maquete)

Quadros: `quadros/maquete_cruzeiro_mascote.jpg`. Código: `codigo/cruzeiro_maquete_src/three/` (Remotion + Three.js, 8 cenários, render de 2181 quadros em 10,5 min com `--concurrency=3 --gl=angle --timeout=240000`).

- **Timeout no 1º quadro da maquete:** muitos shaders físicos compilando de uma vez estouram os 30 s padrão; use `--timeout=240000`.
- **Objeto "enterrado" na mesa:** `caixaR` (extrusão com chanfro) cresce o chanfro para fora; papel/contrato apoiado no tampo precisa de +0,02 a +0,03 de altura.
- **Câmera dentro da arquibancada:** em estádio de maquete, o anel precisa ficar fora do raio de todas as câmeras baixas (aqui R0 = 6,3 com câmeras até 5,9).
- **Papel, foto e fachada creme estouram** com sol 2,9: escureça o `color` do material (0xa8a29a) e baixe o sol para ~2,0 nas cenas claras.
- **Documento visto de cima:** tilt-shift com `forca` 0,4 a 0,45 (o padrão borra a legenda da foto).
- **Pelo laranja/branco por cor de vértice serrilha**; pinte a máscara numa textura por UV (`texPelo` em raposa.ts).
- **`torno()` com perfil de cima para baixo inverte as normais** (calção saiu preto); a função agora inverte sozinha.

## Aprendido no reel da piscina (15/11/2026, escada de falhas, entregue em maquete)

Código: `codigo/piscina_maquete_src/three/` (vai para `reels/done/` depois do ok; copiar `corte.ts` para `codigo/` antes de apagar).

- **Corte de terreno animado ("fatia de bolo") com tampa exata:** `corte.ts`. Um plano z = zc recorta tudo; cada GRUPO de sólidos fechados (terra, concreto, água, cano, areia do filtro...) conta faces por estêncil (trás +1, frente −1, sem teste de profundidade) e desenha uma tampa onde o estêncil != 0. Precisa `stencil: true` no renderer e `stencilBuffer: true` no alvo. Funciona igual nas 3 direções; a tampa da terra tem camadas e o lençol freático por GLSL de posição.
- **Erro: todas as tampas com a cor da 1ª** — o cache de programas do three usa `onBeforeCompile.toString()`; materiais com o mesmo código e GLSL diferente na closure reaproveitam o 1º programa. Use `customProgramCacheKey` por material.
- **Erro: buraco cheio de terra no corte** — as laterais do sólido estavam com a ordem dos triângulos invertida; a contagem do estêncil ficava != 0 também no ar.
- **Erro: pescoço preto no toon** — malha própria (tubo afunilado) com triângulos invertidos: o casco do contorno cobre o objeto. Confira a ordem dos índices.
- **Câmera no 9:16:** uma piscina de 4,3 m inteira pede ~13-14 m de distância com lente 30. Planos de obra a 9-10 m mostraram só um canto.
- **Disco:** o render de 2,5 min encheu o C: e falhou no "faststart"; o vídeo completo ficou em `%TEMP%\remotion-v4.0.538-assets*\remotion-stitch-temp-dir\fast-start-intermediate...` e foi recuperado renomeando. Limpe `%TEMP%\remotion-*` antes de renders longos.
