---
name: produzir-reel
description: "Produz o reel a partir do PROMPT_PRODUCAO.txt que já está na pasta do vídeo, sem o operador precisar colar o prompt: confere a pasta (prompt, narracao.mp3, tempos, skills de produção), instala o que faltar, segue o prompt até as 3 direções com os primeiros 10 s animados de cada, PARA para a escolha e, depois do ok, faz o vídeo inteiro. Use sempre que o usuário digitar /produzir-reel <tema>, pedir para 'produzir o reel', 'fazer o vídeo', 'rodar o prompt de produção', 'começar a produção do <tema>' ou 'fazer as 3 direções', mesmo que não diga 'skill'."
---

# Produzir o reel: do PROMPT_PRODUCAO.txt ao vídeo

Último passo da sequência **analisar-reel → roteiro-viral (ou narracao-do-molde) → narracao-elevenlabs → prompt-do-molde → produzir-reel**. O prompt de produção já está salvo na pasta do vídeo; esta skill lê e executa, para o operador não precisar copiar e colar uma página e meia. Responda em português do Brasil.

## Passo 0: o perfil e a pasta

Leia `~/.claude/perfil-criador.md` (sem ele, rode a skill `perfil-criador` e volte). Dele sai `pasta_reels`. O tema vem no pedido (`/produzir-reel pau-a-pique`) e a pasta é `<pasta_reels>/todo/<tema>/`. Sem tema, rode o verificador sem argumento: ele lista os reels que já têm prompt, e você pergunta qual.

```bash
python ~/.claude/skills/produzir-reel/scripts/verificar_pasta.py <tema>
```

- **ERRO**: pare e diga o que fazer. Sem `PROMPT_PRODUCAO.txt`: rodar a `prompt-do-molde`. Sem `narracao.mp3`: gerar a voz (aula 7) ou gravar no celular e salvar com esse nome. Nunca gere voz.
- **AVISO "a voz foi salva depois do prompt"**: os tempos do roteiro visual podem estar velhos. Ofereça rodar a `prompt-do-molde` de novo antes; se o operador quiser seguir, siga (o prompt manda transcrever a narração de qualquer jeito).
- **ETAPA**: diz onde o reel está. Prévias prontas e sem escolha: mostre as prévias e espere. Vídeo final pronto: só falta o ok para mover para a `done`.

## Passo 1: antes de começar, em uma linha

Diga ao operador, sem esperar resposta:
- **Conversa nova**: a produção é longa; ela vai melhor numa conversa só dela. Se esta conversa já tem muita coisa (por exemplo, a prompt-do-molde acabou de rodar aqui), sugira abrir uma nova e digitar `/produzir-reel <tema>` lá. Se ele quiser seguir aqui, siga.
- **Modelo e esforço**: a recomendação do curso é Opus 5.5 no esforço Alto (seletor abaixo da caixa de mensagem; no app, Ctrl+Shift+E), e o modo Automático, para a produção não parar a cada comando pedindo permissão. O Alto gasta mais do limite do plano. Você não troca o modelo sozinho: só avisa.

## Passo 2: as skills de produção

O prompt exige `remotion-best-practices` e `threejs` (e as `threejs-*` que precisar). Se o verificador apontou alguma faltando, instale com os comandos que estão no bloco FERRAMENTAS do prompt e leia o `SKILL.md` de cada uma antes de escrever código. A `catalogo-estilos` vem no kit do curso: se faltar, peça para reinstalar o kit.

## Passo 3: executar o prompt

Leia o `PROMPT_PRODUCAO.txt` **inteiro** e trate-o como o pedido do operador, palavra por palavra, como se ele tivesse colado na conversa. Não resuma, não reescreva e não pule regra. Os pontos que mais dão errado:

1. **Primeira entrega e PARE.** As 3 direções, cada uma com 4 quadros e os primeiros 10 s animados com a voz real, uma direção por processo (3 cenas 3D ao mesmo tempo estouram a placa de vídeo), e a saída do medidor ao lado. Mostre as 3 lado a lado e espere a escolha. Mesmo que uma direção pareça óbvia, não produza o vídeo inteiro antes.
2. **O áudio manda.** Legenda e cenas seguem o que a voz falou, não o roteiro. Não existe meta de velocidade: nunca peça voz nova.
3. **Modelos 3D prontos** (Poly Pizza, Quaternius, Kenney, Sketchfab), só CC0 ou CC BY, com crédito no `CREDITOS.txt`.
4. **Render retomável**: um arquivo por quadro, para continuar de onde parou se o computador travar.
5. **Placa de vídeo e memória.** O Remotion, sozinho, desenha o 3D no processador (SwiftShader). Renderize as cenas 3D com `--gl=angle`, que usa a placa de vídeo, mesmo a integrada: num notebook com Intel Iris Xe, um cubo caiu de ~206 para ~134 ms por quadro. Se o `angle` der erro ou tela preta, volte ao padrão. A concorrência segue a linha `INFO memória` do verificador: até 8 GB de RAM, `--concurrency=1`. Com pouca memória, feche outros programas e renderize uma direção de cada vez.

## Passo 4: depois da escolha

Quando o operador escolher ("vamos de A", "A com a legenda da C", "na B o contorno está fino"), produza o vídeo inteiro só na direção escolhida, com os ajustes que ele pediu, e entregue o que a ENTREGA do prompt manda: o vídeo, a capa, os créditos e a saída do medidor. Antes de entregar, passe pela CONFERÊNCIA do prompt e informe o relatório de som e de clareza da voz.

Mova a pasta de `todo` para `done` só depois do ok dele no vídeo final (antes, tire qualquer junção de `node_modules` de dentro da pasta).
