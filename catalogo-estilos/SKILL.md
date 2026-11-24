---
name: catalogo-estilos
description: "Catálogo de estilos visuais dos reels da conta de referência do curso Do Prompt ao Play, com a receita técnica de cada um (material, luz, câmera, contorno, pós-processamento), os erros já cometidos e quadros de referência de reels entregues: maquete de brinquedo com tilt-shift, toon 3D com contorno, fliperama/pixel art, fotorreal, drone, documentário, papel dobrado, papel e tinta, tabuleiro, reclame antigo, sprites, editorial escuro, além de estilos de referência externa (low poly, clay, kinetic type, chalkboard, collage, interface, blueprint, aquarela, gravura, nanquim, xilogravura, neon, câmera térmica). Use SEMPRE que for escrever as direções de um PROMPT_PRODUCAO, gerar as 3 direções de prévia de um reel, produzir um vídeo num estilo escolhido, refazer ou corrigir uma prévia que saiu feia, ou quando o usuário perguntar quais estilos existem, pedir 'toon', 'maquete', 'tilt-shift', 'pixel art', 'estilo X' ou disser que um estilo 'saiu ruim', mesmo que não diga 'catálogo' nem 'skill'."
---

# Catálogo de estilos dos reels

Responda sempre em português do Brasil.

Os quadros e o código vêm de reels reais da conta de referência do curso. Use-os como padrão de qualidade e ponto de partida, mas o vídeo do criador leva o perfil dele: leia `~/.claude/perfil-criador.md` (se não existir, rode a skill `perfil-criador`) para o @, a `cor_destaque`, a `virada`, o `fecho` e a `palavra_comentario`. Onde o código de exemplo escreve "seu.perfil", "Comenta PLAY" ou "Do Prompt ao Play" (o pedido da conta de referência), troque pelo que está no perfil.

## Por que existe

Cada reel nascia com três direções escritas em uma frase ("toon 3D com contorno preto…") e a sessão de produção reinventava o estilo do zero. A receita que funcionou ficava no código do reel, e o código era apagado no arquivamento. Resultado: em 11/11/2026 o toon das abelhas saiu chapado, sem contorno e sem volume (`quadros/erro_abelhas_toon_sem_contorno.jpg`), enquanto o toon do Burger King, feito no mesmo dia, saiu certo (`quadros/bk_previa_B.jpg`). A diferença era só a receita.

Esta skill guarda a receita, os erros e o padrão visual de cada estilo. Leia a ficha do estilo antes de escrever o prompt e antes de produzir.

## Índice

| Estilo | Ficha | Situação | Quadros |
|---|---|---|---|
| **Maquete de brinquedo com tilt-shift** | `references/maquete-tiltshift.md` | receita completa, código pronto | maquete_sisteminha, maquete_pitaya, maquete_trump_lula, maquete_biodigestor, bk_previa_A |
| **Toon 3D com contorno** | `references/toon-3d.md` | receita completa, código pronto | toon_milpa, toon_quintal, toon_hiratake, toon_ueno_bank, bk_previa_B; erro: erro_abelhas_toon_sem_contorno |
| **Fliperama 16 bits (pixel art sobre 3D)** | `references/pixel-fliperama.md` | receita completa, código pronto | bk_previa_C, fliperama_demon_slayer |
| Fotorreal (Blender) | `references/outros-do-perfil.md` | receita parcial | fotorreal_bateria, fotorreal_ar_quintal |
| Drone / maquete aérea | `references/outros-do-perfil.md` | receita parcial | drone_condominio |
| Documentário de aquário | `references/outros-do-perfil.md` | receita parcial | documentario_aquario_peixe |
| Papel dobrado (papercraft) | `references/outros-do-perfil.md` | receita parcial | papel_dobrado_galinhas |
| Papel e tinta (sépia, gravura) | `references/outros-do-perfil.md` | receita parcial | papel_e_tinta_manuscrito |
| Tabuleiro / mapa em relevo | `references/outros-do-perfil.md` | receita parcial | tabuleiro_cpf |
| Reclame antigo (cartaz) | `references/outros-do-perfil.md` | receita parcial | reclame_fordlandia |
| Sprites 2D (anime em pixel) | `references/outros-do-perfil.md` | receita parcial | sprites_goku |
| Comercial fotorreal ao sol (Three.js) | `references/outros-do-perfil.md` | receita completa, código no reel do forno solar | comercial_fotorreal_forno_solar |
| Editorial escuro (motion) | `references/outros-do-perfil.md` | receita parcial | joalheria_jr2, mesa_de_luz_jr3 |
| POV em massinha (mãos de quem assiste) | `references/outros-do-perfil.md` | receita completa, código no reel das abelhas | — |
| Estilos externos (low poly, clay, kinetic type, chalkboard, collage, interface, blueprint, aquarela, gravura, nanquim, xilogravura, neon, câmera térmica, ASCII, blocos, desenho de criança, holograma) | `references/estilos-externos.md` | só referência visual | ref_externa_butter_12_estilos, dez_estilos_viralata |
| Motion 2D editorial (E1 a E6) | `references/motion-2d-editorial.md` | receita visual, sem código | — |
| **Personagem: o pedreiro** (série escada de falhas) | `references/personagem-pedreiro.md` | ficha completa, código em `codigo/pedreiro/` | pedreiro_frente, pedreiro_perfil, pedreiro_costas, pedreiro_expressoes |

"Receita completa" = tem material, luz, câmera, pós e código testado. "Parcial" = tem o visual, as decisões e os erros, mas o código foi apagado; reconstrua a partir da ficha e dos quadros, e depois complete a ficha.

O código que veio no kit está em `codigo/<reel>_src/` (as fichas apontam para ele). Caminhos `reels/...` que sobraram nas fichas são das pastas de trabalho da conta de referência e não vêm no kit: use a ficha e os quadros.

Os quadros estão em `quadros/` (3 quadros de cada reel, a 22%, 50% e 70% do vídeo). Abra-os com a ferramenta de leitura de imagem antes de produzir: eles são o padrão de qualidade.

## Como usar

### 1. Ao escrever as direções de um PROMPT_PRODUCAO

- Quem escolhe os estilos é o criador (a skill `prompt-do-molde` pergunta antes). O "padrão do perfil" é A maquete, B toon e C livre, escolhida pela IA de produção, exceto quando o formato é em primeira pessoa: aí a C é POV obrigatória, com o bloco "MÃOS E BRAÇOS" (modelo em `codigo/abelhas_toon_src/PROMPT_PRODUCAO_exemplo_pov.txt`).
- Cole na direção o **bloco para o prompt** da ficha do estilo (cada ficha tem um, pronto para copiar), adaptando o cenário ao tema.
- Inclua no prompt a linha: "Antes de produzir, leia a skill catalogo-estilos e siga a ficha de cada direção."

### 2. Ao produzir as prévias

1. Leia a ficha de cada uma das 3 direções e abra os quadros de referência.
2. **Monte cada direção com material, luz e pós próprios.** Pode ser a mesma cena e a mesma câmera, mas as três coisas mudam juntas. Trocar só o material foi o erro das abelhas.
3. Para os estilos 3D, parta de `codigo/estilos_threejs.ts` (Three.js com Remotion). Ele já tem as 3 direções testadas.
4. Renderize os 4 quadros de cada direção e compare lado a lado com os quadros de referência antes de entregar. Se a prévia não tiver a assinatura do estilo (a lista de "como reconhecer" de cada ficha), corrija antes de mostrar ao criador.
5. **Renderize também os primeiros 10 s de cada direção, animados e com a voz real** (`previa_A_10s.mp4`, `previa_B_10s.mp4`, `previa_C_10s.mp4`). O criador avalia as 3 direções e os 10 s de cada uma, numa entrega só. Quadro parado mostra se está bonito; os 10 s mostram se prende. Uma direção por processo, como nos quadros.
6. **Passe cada prévia de 10 s no medidor antes de mostrar** e entregue o resultado junto:
   ```bash
   python ~/.claude/skills/catalogo-estilos/scripts/medir_reel.py previa_A_10s.mp4 --previa
   ```
   O medidor **só informa, nunca trava**. Se um item de imagem sair ATENÇÃO, corrija quando fizer sentido; se for da natureza do estilo (a borda borrada do tilt-shift), diga isso ao lado da prévia. A fala aparece como INFO: não existe meta de palavras por minuto nem de velocidade, e nunca se pede voz nova por causa dela.

### 2b. Antes de entregar o vídeo final

Rode o medidor no MP4 final, com as palavras já transcritas se houver (`--palavras palavras.json`), e entregue a saída junto com o vídeo. Ele mede contra a referência @desmontandoomundo (muro, 19 mi) e os reels que romperam na conta de referência:

| Item | Referência | De onde veio |
|---|---|---|
| Fala | só informa (sem meta) | muro 214; piscina 192; laje 191 |
| Maior pausa (fora a da virada) | só informa (sem meta) | muro 0,46 s; piscina 1,4 s |
| Maior trecho sem corte | ≤ 5 s | piscina 42 s |
| Duração média de plano | ≤ 3,5 s | piscina 10,2 s |
| Movimento no 1º segundo | ≥ 10 | Sisteminha 19,4, milpa 18,9; piscina 4,7 |
| Nitidez bordas/centro | ≥ 0,15 | toon 0,21 a 0,87; tilt-shift 0,01 a 0,07 |
| Nitidez do centro | ≥ 400 | piscina 193; os outros 855 a 2.752 |
| Volume | −14 ± 1 LUFS | regra do perfil |

Use a narração que o criador enviou: corte só silêncios longos e erros de leitura, sem mexer no timbre nem na velocidade, e nunca pare a produção esperando voz nova. O medidor não mede se o visual ficou infantil: a laje (toon, 16/11) passou em tudo e o 3D ficou infantil demais.

### 3. Depois de entregar um reel

Se aprendeu algo novo (um erro, um ajuste de luz, um parâmetro), acrescente na ficha do estilo, em "Erros conhecidos" ou "Receita". Se o reel usou um estilo novo, crie a ficha em `references/outros-do-perfil.md` e tire 3 quadros do MP4 final para `quadros/`:

```bash
v=caminho/do/reel.mp4; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
for p in 0.22 0.5 0.7; do t=$(python -I -c "print(round($d*$p,2))"); ffmpeg -loglevel error -y -ss $t -i "$v" -frames:v 1 -vf scale=300:-1 "q_$p.png"; done
ffmpeg -loglevel error -y -i q_0.22.png -i q_0.5.png -i q_0.7.png -filter_complex hstack=inputs=3 -q:v 4 "~/.claude/skills/catalogo-estilos/quadros/<estilo>_<reel>.jpg"
```

E antes de arquivar o reel (apagar a pasta de trabalho), copie para esta skill o trecho de código do estilo que funcionou.

## Regras comuns a todos os estilos 3D

Valem para qualquer direção; vieram de vários reels.

- **Câmera no 9:16.** Com fov 30 a largura visível é só ~0,3 x a distância. Uma caixa de 1,5 m pede ~7 m de câmera; objetos lado a lado saem do quadro: enfileire em profundidade. Lente de 30 é o padrão; macro de fruta ou flor pede câmera de lado.
- **Uma direção por processo** nas prévias: 4 cenas 3D na mesma aba estouram a GPU.
- **Números na tela só os da fala.** Contador correndo mostra números que não estão na fala; prefira valor fixo, barra ou calendário parado.
- **Gerador fora do laço.** Criar o gerador de ruído dentro do callback de textura travou a página (Sisteminha).
- **Fundo é objeto separado.** `scene.background` compartilhado com uma cor que é multiplicada por quadro escurece aos poucos: use `clone()`.
- **Virada para a IA** (comum a todas as direções, se o perfil usar virada): a cena congela e vira arame na `cor_destaque` do perfil (padrão laranja #FF6B2C) e partículas sobre azul-tinta (#0B1026); a onda da voz vira um rosto de linhas. Objetos instanciados (folhas, verduras) não entram no arame: marque-os para irem só para as partículas.
- **Loop:** o último quadro é igual ao primeiro.
- **Encode:** grão por quadro é incompressível; use taxa fixa em 2 passadas (CRF deu 466 a 755 MB na pitaya).
