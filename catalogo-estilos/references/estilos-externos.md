# Estilos de referência externa

Estilos que ainda não usamos num reel, com a referência visual de onde vieram. Servem como opção para a direção C (livre) ou para um formato "1 cena, N estilos". Não copie quadros, cenas nem identidade visual das referências.

## Os 12 do Butter Motion

Fonte: vídeo "12 animation styles (GTA VI edition)" do Butter Motion (plugin de Premiere), 25 s, analisado em 11/11/2026. Folha com todos: `quadros/ref_externa_butter_12_estilos.jpg`.

Formato do vídeo (vale para um reel nosso de "N estilos"): a mesma cena em cada estilo por ~1,1 s, num cartão vertical; à esquerda a lista numerada de 1 a 12 com o estilo da vez aceso em amarelo (a pessoa vê que faltam estilos e fica até o fim); final com grade de vários estilos e pedido de comentário com palavra-chave.

| # | Estilo | Como reconhecer | Caminho provável |
|---|---|---|---|
| 1 | **Low Poly 3D** | facetas visíveis, nuvens de poliedros, cor chapada por face, sem textura | Three.js com `flatShading: true` e geometria de poucos polígonos |
| 2 | **Kinetic Type** | a cena vira tipografia: palavras grandes ("RUN", "FLIP") e linhas de palavra repetida ("water water") formando o mar, fundo papel creme | motion 2D (HTML/SVG), sem 3D |
| 3 | **Pixel Art** | pixels grandes, paleta curta, HUD de jogo (SCORE) | `pixel-fliperama.md` |
| 4 | **Clay 3D** | massinha fosca, formas arredondadas e levemente irregulares, nuvens fofas, luz suave | Three.js, `MeshStandardMaterial` rough ~0,9, bump de impressão digital, sombra suave; ou Blender (ver skill blender-claymation) |
| 5 | **Chalkboard** | quadro verde-escuro, giz branco, fórmulas e setas desenhadas ("v = 9 m/s"), boneco palito | SVG com traço de giz (ruído na borda), animação de desenho do traço |
| 6 | **Collage** | recortes de foto/papel com borda branca, sobrepostos, etiquetas | camadas 2D com sombra curta |
| 7 | **Interface** | a cena dentro de telas de app/sistema (janelas, notificações, barra de progresso, recorte com xadrez de transparência) | HTML/CSS de interface |
| 8 | **Toon 3D** | contorno fino em tudo, 2 faixas de luz duras, nuvens de bolas com faixa cinza | `toon-3d.md` |
| 9 | **Blueprint** | azul-marinho com grade, linhas brancas técnicas, cotas, "FIG. 1", boneco de traço | SVG de linhas + texto técnico |
| 10 | **Watercolor** | manchas de aquarela, bordas que vazam, papel creme, sol simples | SVG/canvas com borda irregular e textura de papel |
| 11 | **Engraving** | gravura/água-forte: hachuras, tons de papel antigo, nuvens volumosas | shader de hachura em espaço de TELA (em espaço de mundo vira listras, lição do Manuscrito) |
| 12 | **Ink** | nanquim de quadrinho: contorno preto e cores chapadas claras, hachura leve no céu | traço 2D com contorno grosso |

## Os 10 do reel do vira-lata (08/11)

Reel "1 prompt, 10 estilos" (entregue 08/11, 21,6 s, sem voz). Quadro: `quadros/dez_estilos_viralata.jpg`. Cada estilo saiu de um subagente com o mesmo prompt trocando só o nome do estilo (prompt em `reels/done/estilos_claude/prompt.md`). No swipe de 08/11, contas pequenas fizeram 144x e 162x a mediana com esse formato.

1. Massinha
2. Neon cyberpunk
3. Xilogravura de cordel
4. Câmera térmica
5. Pixel art
6. Aquarela
7. Terminal ASCII
8. Blocos de montar
9. Desenho de criança
10. Holograma

## Motion 2D editorial

O catálogo E1 a E6 em `references/motion-2d-editorial.md`: Dossiê Editorial, Holograma Neon, Documento HUD / Metáfora, Split Editorial, Manchete Cinética, Arquivo / Colagem Documental. Para reels de narração sem 3D.
