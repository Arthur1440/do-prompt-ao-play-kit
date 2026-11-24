---
name: prompt-do-molde
description: "Gera o PROMPT_PRODUCAO.txt de um reel feito a partir de uma referência (analisar-reel → roteiro-viral ou narracao-do-molde → narracao-elevenlabs → este), de acordo com a narração. Antes de escrever, PERGUNTA ao operador: (1) os estilos das 3 direções visuais (ele escolhe do catálogo ou deixa a skill escolher) e (2) se o vídeo leva efeitos sonoros. O prompt sempre manda usar as skills remotion-best-practices e threejs (e instalar se faltarem), sempre usar modelos 3D prontos (Poly Pizza, Quaternius, Kenney) em vez de modelar do zero, e sempre entregar antes 3 direções diferentes com os PRIMEIROS 10 SEGUNDOS animados com a voz real (o gancho) para o operador escolher, e só então o vídeo inteiro. Põe tempo em cada frase e plano (transcrição do narracao.mp3 ou estimado). Use sempre que o usuário pedir o prompt de produção, o prompt do vídeo, 'cria os prompts', 'gera o prompt dessa narração', 'monta o prompt com as 3 direções', ou quando uma narração ficar pronta, mesmo que não diga 'skill'."
---

# Prompt do molde: da narração ao PROMPT_PRODUCAO com 3 direções

Faz parte da sequência **analisar-reel → roteiro-viral (ou narracao-do-molde) → narracao-elevenlabs → prompt-do-molde → produzir-reel**. O prompt fica salvo na pasta do reel, e a skill `produzir-reel` o executa numa conversa nova (o operador não precisa colar nada). Responda em português do Brasil.

## Antes de começar: o perfil

Leia `~/.claude/perfil-criador.md`. Se não existir, rode a skill `perfil-criador` e volte. Daqui saem `pasta_reels` (troque `<pasta_reels>` nos caminhos), `python` (troque `python` nos comandos), `perfil` (@), `ritmo_voz`, `virada`, `fecho`, `palavra_comentario`, `recompensa_comentario`, `cor_destaque` e as "Regras do perfil".

## Entrada

Na pasta do reel `<pasta_reels>/todo/<tema>/`:
- `ROTEIRO_<tema>.md`: texto para gravar, bloco a bloco, mapa de planos, fontes. Diz no cabeçalho se é **Modo: FIEL** (mesma narração da referência) ou molde (assunto novo);
- `NARRACAO_ELEVENLABS.md`;
- `narracao.mp3`, se ele já gerou a voz (melhor: dá os tempos reais).

E a ficha da referência: `<pasta_reels>/_referencias/<pasta>/analise.md` (o roteiro diz qual é). Sem roteiro na pasta, rode a roteiro-viral antes.

## Passo 0: perguntar ANTES de escrever

Uma chamada de AskUserQuestion com as duas perguntas. Se forem vários reels, a resposta vale para todos, a menos que ele separe. Não pergunte o que ele já disse na mensagem.

**Pergunta 1: estilos das 3 direções.** Opções:

| opção | o que vai no prompt |
|---|---|
| **A skill escolhe** (recomendada) | você escolhe 3 estilos bem diferentes entre si no catálogo (`catalogo-estilos`, tabela "Índice"), pensando no tema, no tom e no estilo da referência, e escreve uma linha de motivo para cada. Prefira estilos com "receita completa"; no máximo um "receita parcial" ou externo. |
| **Padrão do perfil** | A maquete de brinquedo com tilt-shift, B toon 3D com contorno, C livre (a IA de produção escolhe na hora e explica em uma linha). |
| **Estilo da referência + 2** | A = o estilo da referência refeito com personagens próprios; B e C escolhidos por você, diferentes de A. |
| **Eu escolho** | faça uma segunda pergunta, multiSelect, com os 4 estilos do catálogo que mais casam com o tema (ele digita outros em "Other"). Ele escolhe 3. |

Na descrição de cada opção, já diga quais seriam os estilos para este reel (ex.: "A skill escolhe: 2D mágico texturizado, papel dobrado, toon 3D").

**Pergunta 2: efeitos sonoros.** Opções: "Sim, efeitos pontuais ligados às ações", "Não: só a voz e trilha baixa", "Não: só a voz". O prompt segue a resposta e **não pede versão extra sem efeitos** (o operador decide aqui, antes).

## Passo 1: tempos

```bash
python ~/.claude/skills/prompt-do-molde/scripts/tempos.py <pasta_reels>/todo/<tema>/ROTEIRO_<tema>.md
```

- Com `narracao*.mp3` na pasta (ou `--audio`), transcreve e alinha cada frase e cada linha do mapa de planos ao tempo real. Sem áudio, estima no `ritmo_voz` do perfil e avisa. O prompt diz qual dos dois.
- Marca `<- PRÉVIA` o que cai nos primeiros 10 s e diz em que frase a prévia termina. Grava `tempos.json` na pasta.
- Se o mapa de planos estiver fora da ordem da fala, corrija o mapa no roteiro.

## Passo 2: ler a ficha e as fichas de estilo

- `analise.md` da referência: "Imagem × fala", "Estilo visual", "Legenda na tela", "Som", "Ritmo" e "O que não copiar". Viram as REGRAS DO FORMATO do prompt.
- Skill `catalogo-estilos`: para cada um dos 3 estilos escolhidos, o "Bloco para o prompt" da ficha (em `references/`). Cole e adapte o cenário ao tema. Estilo sem ficha completa: descreva material, luz, câmera, contorno e pós no mesmo padrão e cite o quadro de referência do catálogo.

## Passo 3: escrever o prompt

Copie `assets/prompt_modelo.txt` e preencha todos os `[ ]`. **Regras fixas que o modelo já traz e não podem sair:**

1. **Skills de produção**: a produção usa as skills `remotion-best-practices` e `threejs` (e as `threejs-*` que precisar). Se não estiverem instaladas, instala antes de começar: `npx skills add remotion-dev/skills` e `npx -y skills add cloudai-x/threejs-skills --agent claude-code`; se a `threejs` (geral) faltar, `npx -y skills add secondsky/claude-skills --skill threejs --agent claude-code`. Depois de instalar, ler o SKILL.md.
2. **Modelos 3D prontos, sempre**: personagem, bicho, casa, móvel, rua, árvore vêm de fonte pronta, começando pelo **Poly Pizza** (https://poly.pizza), depois Quaternius, Kenney e Sketchfab (filtro CC0/CC BY). Só CC0 ou CC BY, com autor e licença no CREDITOS.txt. Modelar em código só o que não existir pronto, e mesmo aí preferir adaptar ou repintar uma peça pronta. Cada modelo passa pelo teste de 2 minutos (escala, frente, rosto, pose) antes de entrar.
3. **Prévia antes do vídeo**: 3 direções diferentes, cada uma com 4 quadros + **os primeiros 10 s animados com a voz real** (o gancho): `previa_A_10s.mp4`, `previa_B_10s.mp4`, `previa_C_10s.mp4`, uma direção por processo, mais a saída do `medir_reel.py --previa`. A produção **PARA** até o operador escolher.
4. Medidor só informa: sem meta de palavras por minuto nem de velocidade; nunca pedir voz nova.
5. O vídeo segue o áudio: legenda e cenas seguem a fala gravada.
6. Efeitos sonoros conforme a resposta da Pergunta 2. **Nunca** pedir `reel_<tema>_sem_efeitos.mp4`.
7. Virada e fecho do perfil (se o perfil tiver) com o visual padrão: arame na `cor_destaque` sobre azul-tinta #0B1026, onda que vira rosto, "Seguir" no @ do perfil e o campo de comentário digitando a `palavra_comentario`. Perfil sem virada: o vídeo termina no fecho da referência.
8. Personagem e cenário **próprios**, mesmo no modo fiel: o texto pode ser o da referência, a imagem não.
9. Pasta `todo` → `done` só depois do ok dele.

O que preencher com cuidado:
- **Modo**: molde ("copia o FORMATO; o assunto é outro") ou fiel ("usa a MESMA NARRAÇÃO da referência, só trocando o pedido final; a imagem é toda nossa").
- **Os 10 s da prévia**: a fala de 0 a 10 s e os planos desse trecho, do `tempos.json`. Tem de ter o gancho completo e pelo menos 3 planos.
- **Quadro 0**: o que já se mexe antes da primeira palavra.
- **As 3 direções**: um bloco por estilo, cada um com material, luz, câmera e pós próprios, cenário adaptado ao tema e o quadro de referência do catálogo. Se a skill escolheu, uma linha de motivo em cada.
- **Os 4 quadros por direção**: quadro 0, o plano que explica o gancho, o plano mais forte da história e o fecho.
- **Personagem próprio**: raça, cor, marca; e o que não copiar da referência.
- **Cuidados do tema** e **roteiro visual** (uma linha por frase com tempo, fala e planos).

Salve como `<pasta_reels>/todo/<tema>/PROMPT_PRODUCAO.txt`. Texto puro.

## Passo 4: conferir e entregar

```bash
python ~/.claude/skills/prompt-do-molde/scripts/conferir_prompt.py <pasta_reels>/todo/<tema>/PROMPT_PRODUCAO.txt
```

Ele aponta `[` de modelo sem preencher, a falta de: remotion-best-practices, threejs, Poly Pizza, as 3 prévias de 10 s, a ordem de PARAR; avisa se o perfil tem virada ou palavra de comentário e o prompt não traz; e acusa se sobrou pedido de versão "sem efeitos". Corrija os ERROS. Confira também à mão que os números e fatos na tela batem com as fontes do roteiro.

No chat, mostre: o caminho do prompt, se os tempos são reais ou estimados, o que entra nos 10 s de prévia, as 3 direções em uma linha cada e a escolha de efeitos. Se a narração ainda não existe, lembre que ela precisa estar na pasta como `narracao.mp3` antes de produzir.

Termine com o próximo passo, sem colar o prompt em lugar nenhum: **abrir uma conversa nova na pasta reels e digitar `/produzir-reel <tema>`**. A skill `produzir-reel` lê o `PROMPT_PRODUCAO.txt` da pasta e faz a produção. Lembre em uma linha da recomendação do curso: Opus 5.5 no esforço Alto e o modo Automático (o Alto gasta mais do limite do plano).
