# Fliperama 16 bits (pixel art)

Duas variantes no perfil:
- **Pixel sobre 3D** (prévia C do Burger King, 11/11, `quadros/bk_previa_C.jpg`): a cena 3D toon é renderizada em baixa resolução e reduzida a uma paleta curta com pontilhado. Mesma cena, câmera e animação das outras direções.
- **Sprites 2D de fliperama** (Demon Slayer, 09/11, `quadros/fliperama_demon_slayer.jpg`): personagens desenhados como sprites, cenário em pixel, letreiros de jogo ("ROUND 2", "FAZ COMIGO"). Ver também os sprites do Goku em `outros-do-perfil.md`.

## Como reconhecer

1. **Pixels grandes e visíveis** (5 px de 1080 = blocos de ~5 x 5).
2. **Paleta curta** (6 níveis por canal) com **pontilhado ordenado** nas transições, sem degradê liso.
3. **Linhas de varredura** discretas.
4. **Contorno de 1 pixel** escuro nos personagens.
5. Tipografia de jogo (fonte pixel) nos letreiros e no HUD.

## Receita (pixel sobre 3D, Three.js)

Código pronto em `codigo/estilos_threejs.ts` (direção "C").

- Material e contorno do toon (`MeshToonMaterial` + casco em tela), com o contorno mais fino (`px * 0,38`, mínimo 0,9) calculado na resolução reduzida (W/5, H/5).
- `RenderPixelatedPass(5, cena, câmera, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.5 })` no lugar do RenderPass; sem antialias e sem MSAA.
- Passada final com `pix = 5`: amostra no centro de cada bloco, paleta de 6 níveis com matriz de Bayer 4x4, linha de varredura a 0,86.
- Mesma luz do toon (sol branco + hemisfério neutro), `NeutralToneMapping`.

## Bloco para o prompt

```
C. Fliperama 16 bits, siga a ficha pixel-fliperama da skill catalogo-estilos: a cena em pixels grandes (~5 px a 1080 de largura), paleta curta com pontilhado ordenado, linhas de varredura discretas, contorno de 1 pixel nos personagens, letreiros e HUD em fonte de jogo. Nada copiado de jogo existente (personagens, HUD e telas são recriados com identidade própria). Referência: quadros/bk_previa_C.jpg da skill.
```

## Erros conhecidos

- Antialias ligado borra os blocos: desligue no renderizador e no render target.
- Texto pequeno em pixel fica ilegível: legenda e selos continuam em fonte normal, só os letreiros de jogo vão em pixel.
- Sprites gerados no ChatGPT (Goku, Demon Slayer) vieram com fundo magenta para recorte; confira as bordas depois de tirar o fundo.
