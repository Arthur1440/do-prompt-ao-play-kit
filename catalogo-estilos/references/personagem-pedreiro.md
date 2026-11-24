# Personagem: o pedreiro (série "escada de falhas")

Criado em 16/11/2026 para o reel da laje (`codigo/laje_toon_src`). Volta no reel do esgoto e em qualquer obra da série. Ele faz o "você" da narração: carrega, prega, joga, leva o susto em cada falha e comemora em cada acerto. Personagem próprio do perfil, sem relação com mascote de outra conta.

Imagens (toon, direção B): `quadros/pedreiro_frente.png`, `quadros/pedreiro_perfil.png`, `quadros/pedreiro_costas.png`, `quadros/pedreiro_expressoes.png` (normal, susto, feliz, foco, preocupado) e `quadros/pedreiro_vitima_churrasqueira.png` (a vítima do reel da laje).

Código: `codigo/pedreiro/boneco.ts` (classe `Boneco`, variante `"pedreiro"`; também `"mulher"` e `"menino"` para a família), `codigo/pedreiro/props.ts` (churrasqueira, balde, escada de mão, martelo, carteira, vibrador), `codigo/pedreiro/kit.ts` (kit das 3 direções A/B/C) e `codigo/pedreiro/Ficha.tsx` (composição que gera as vistas). Copie para `src/three/` do projeto novo.

## Como reconhecer

1. **Boné vermelho** com aba curta para a frente e botão no topo. No susto, o boné pula da cabeça (`bone: 0..1`).
2. **Bigode preto grosso** no lugar da boca. Não tem boca falando; só aparece um "O" pequeno no susto e nada nas outras expressões.
3. **Olhos grandes** pintados (esclera branca, íris escura, brilho), sobrancelhas grossas que mudam com a expressão.
4. **Camiseta cinza** de manga curta (barra e gola um tom mais escuro), **bermuda jeans** até o joelho com barra dobrada, **meia branca curta** e **botina marrom** com sola escura.
5. **Corpo de brinquedo**: tronco largo com barriguinha, cabeça grande (~1/3 da altura), mãos redondas grandes, pernas curtas. Altura total = 1 unidade (cabeça e boné incluídos).

## Cores (hex)

| Peça | Cor |
|---|---|
| Boné (copa) | `#D62A24` |
| Boné (aba) | `#B81F1B` |
| Camiseta | `#9EA4AB` (barra/gola `#7E848B`) |
| Bermuda jeans | `#3F6EA8` |
| Pele | `#C98B5E` (nariz `#BC7A4E`, bochecha `#D9786A` a 30%) |
| Bigode, cabelo, sobrancelha, olho | `#2A1A12` / `#1B1210` |
| Botina | `#7A4A26` (sola `#2B1D14`) |
| Meia | `#EDEAE4` |

## Proporções e esqueleto

- Quadril a 0,40; ombros a 0,665; centro da cabeça a 0,90 (raio 0,17); topo do boné ~1,10.
- Articulações: `ombroE/D` (frente, abre, torce) → `cotE/D` (cot) → `maoE/D`; `pernaE/D` (frente, abre) → `joelhoE/D` (joelho); `tronco` (inclina, lado); `cabeca` (x = olhar para baixo, y = virar).
- Lado E do boneco = +x. Ele olha para +z com `rotY = 0`.
- Pose: `Pose` em `boneco.ts` (`pos`, `rotY`, `pulo`, `sq` para squash and stretch, `inclina`, `bE/bD`, `pE/pD`, `cab`, `olhos`, `boca`, `bone`, `tremor`).
- Ferramenta na mão: `Mundo.naMao(boneco, "D", objeto, deslocamento, rotação)`, chamado a cada quadro.

## Expressões (`olhos`)

| Valor | Quando usar |
|---|---|
| `normal` | trabalhando |
| `foco` | pregando, despejando, mirando (pálpebra de cima reta) |
| `susto` | cada falha (olho arregalado, íris pequena, boné pula, `boca: "O"`) |
| `preocupado` | antes da falha, coçando a cabeça, olhando a carteira vazia |
| `feliz` | cada acerto e o churrasco final (olhos em arco) |
| `fecha` | piscada |

## Nas 3 direções

O mesmo código serve às três: o `Kit` troca o material (A: plástico com verniz; B: toon de 3 faixas + contorno de 3 px; C: massinha com digital e malha amassada). Não mude as cores entre as direções: o personagem tem de ser reconhecido em qualquer estilo.

## Erros já cometidos

- Boné baixo demais cobria os olhos: a faixa do boné tem de ficar acima de y = +0,07 da cabeça.
- Cabelo da nuca em casca de esfera aparecia como um bloco retangular; use um elipsoide escuro atrás (`esfera(0,15)` escala `[1,08; 0,72; 0,95]`).
- Sobrancelha do `preocupado` saía brava quando a inclinação era invertida: confira a folha de expressões depois de mexer.
- Na escada, os dois braços para a frente seguravam o balde na frente do rosto: braços com `frente ≈ 1,0` deixam o balde abaixo do queixo e o rosto à mostra.
