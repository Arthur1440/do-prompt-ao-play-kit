---
name: roteiro-viral
description: "Recebe um ou vários links de reels virais (Instagram, TikTok, Shorts) e devolve, para CADA um, uma narração pronta para gravar. Antes de começar, pergunta se o usuário quer COPIAR FIELMENTE a narração (mesmo assunto e mesmas frases, trocando só a conta de origem e o pedido final) ou USAR COMO MOLDE para um assunto novo (ou os dois). No modo molde: baixa e mede os vídeos (analisar-reel), lê views e o multiplicador sobre a mediana da conta, escreve a ficha do formato, acha a fórmula comum do lote, escolhe um tema novo do mesmo assunto e do dia a dia brasileiro, confere os fatos com fonte e escreve o roteiro espelhando a escada de frases, os conectores, o gancho e o fecho da referência, com o fim padrão do perfil (virada 'feito com IA' e o pedido de comentário, se o perfil usar). Entrega ROTEIRO_<tema>.md (texto para gravar, bloco a bloco, mapa de planos, fontes) em reels/todo e, se pedido, a versão do ElevenLabs. Use sempre que o usuário mandar links de reels e pedir 'cria narrações iguais', 'faz a mesma narração', 'copia a narração desse vídeo', 'faz roteiros iguais a esses', 'quero uma narração no mesmo formato de cada um', 'roteiro viral', 'copia o formato desses vídeos com outro tema', ou mandar uma leva de links de referência e quiser sair com roteiros prontos, mesmo que não diga 'skill'."
---

# Roteiro viral: de links de reels virais a narrações iguais, prontas para gravar

Esta skill liga duas que já existem e roda em lote:
- `analisar-reel` desmonta cada referência (download, medidas, views, ficha);
- `narracao-do-molde` tem as regras de espelhar o molde e o script `molde.py conferir`.

Aqui o objetivo é sair com **uma narração nova por referência** (ou quantas o usuário pedir), cada uma no molde da sua referência. Responda em português do Brasil, inclusive nas falas entre ferramentas.

## Antes de começar: o perfil

Leia `~/.claude/perfil-criador.md`. Se não existir, rode a skill `perfil-criador` e volte. Daqui saem `pasta_reels` (troque `<pasta_reels>` nos caminhos), `python` (troque `python` nos comandos), `nicho`, `virada`, `fecho`, `palavra_comentario` e as "Regras do perfil".

## Passo 0: perguntar o modo ANTES de tudo

Primeira coisa da skill, antes de baixar qualquer vídeo: pergunte com AskUserQuestion. As duas saídas são boas e a escolha é do criador:

> "Para estes reels, você quer copiar fielmente a narração (mesmo assunto, mesmas frases) ou usar como molde para um assunto novo?"

| opção | o que acontece |
|---|---|
| **Fiel: mesma narração** | mesmo assunto, mesmos fatos, mesmas frases e na mesma ordem. Mudam só o nome/@ da outra conta, o pedido final (vira a virada do perfil) e os erros de transcrição. Caminho do Passo 6F. |
| **Molde: assunto novo** | mesma escada de frases, conectores, gancho e fecho, com outro comportamento/situação do mesmo assunto e fatos novos. Passos 4 a 6. |
| **Os dois** | para cada referência, uma versão fiel e uma no molde, em pastas separadas. |

Se o usuário já disse na mensagem qual quer ("faz igualzinho", "mesma narração", "só o formato", "com outro tema"), não pergunte: siga e diga qual modo usou. Com vários links, a resposta vale para o lote todo, a menos que ele separe por reel.

Ao perguntar, ponha na descrição da opção fiel o que já foi medido: uma cópia literal em português de um reel viral, postada por outra conta, deu só ~1,2x a mediana. Assunto repetido o público já viu, e a conta original pode reclamar. A escolha é dele.

## Passo 0.1: plano e pastas

- Tire links repetidos (o usuário costuma colar o mesmo duas vezes) e os parâmetros (`?igsh=`, `?mdxt=`).
- Abra o task list: baixar, medir, views, fichas, narrações, conferir, entregar.

## Passo 1: baixar e medir em lote (segundo plano)

```bash
python ~/.claude/skills/roteiro-viral/scripts/lote.py "URL1" "URL2" "URL3"
```

Rode com `run_in_background`: 5 reels de ~65 s levam de 8 a 12 minutos (o Whisper roda um por vez). O script imprime `PASTA <caminho>` para cada reel pronto. Se o download falhar, siga "Quando o download falha" da skill `analisar-reel` (cookies só com o ok do usuário). Com pastas já baixadas: `lote.py --pastas PASTA1 PASTA2`.

Leia `~/.claude/skills/analisar-reel/references/medidas.md` na primeira vez da sessão.

## Passo 2: views e multiplicador (enquanto o Whisper roda)

Siga `~/.claude/skills/analisar-reel/references/views_no_navegador.md`. O que funciona:
- Logo depois do `navigate`, um `screenshot` com `scale: 0.1` faz o painel desenhar a grade.
- Se o reel não aparece entre os 12 primeiros, `window.scrollBy` dentro do script às vezes não carrega mais. Use `computer` → `scroll` (10 ticks, duas vezes) e leia os links de novo.
- Fixados ficam fora da mediana. Conta que explodiu na semana: dê o multiplicador pela regra e, ao lado, contra os reels de antes da explosão.

Grave `views`, `mediana_conta`, `multiplicador`, `seguidores` (e `mediana_antes_da_explosao` quando houver) no `meta.json` de cada pasta. Abaixo de 100x, avise que é "dia bom" e não viral, mas siga: o usuário mandou o link porque quer o formato.

## Passo 3: olhar e escrever a ficha de cada reel

Para cada pasta, assim que ficar pronta (não espere o lote inteiro):
1. `transcricao.txt`, `resumo.md`, `meta.json` (legenda e `amostra_comentarios`).
2. Read em `folha_gancho.jpg` e `folha_01.jpg` (e `folha_02/03` se o reel tiver muitos planos).
3. Escreva `analise.md` no modelo de `~/.claude/skills/analisar-reel/references/ficha.md`. A parte que esta skill usa é a **Estrutura frase a frase** com a frase-molde de cada bloco e a lista de **conectores**. Capriche nela.

Com 3 ou mais reels, rode o `comparar.py` da analisar-reel (`--md <pasta_reels>/_referencias/<AAAAMMDD>_lote<N>_comparativo.md`) e escreva no fim a **fórmula comum** e a variável que parece separar os maiores multiplicadores.

## Passo 4: tema de cada narração (modo molde)

No modo fiel, pule os Passos 4 a 6 e vá para o 6F.

Regras (aprendidas na prática, não negocie):
- **Mesmo assunto da referência.** Reel de cachorro → narração de cachorro; reel de casal → narração de casal. Só saia do assunto se ele pedir.
- **Cena do dia a dia do público** (por padrão, o brasileiro). Pergunte-se: uma pessoa comum daqui já viu isso em casa ou na rua? (vira-lata no portão, osso no sofá, cachorro atrás de moto; carteiro não).
- **Não repita tema já feito.** Antes de escolher, liste `<pasta_reels>/todo` e `<pasta_reels>/done` e fuja dos temas que já estão lá.
- Os temas sugeridos na ficha (seção "5 temas no mesmo molde") são o ponto de partida.

Se o usuário pediu as narrações direto ("cria as narrações"), **escolha você** o tema mais forte de cada ficha e diga qual escolheu. Só pergunte (AskUserQuestion, 3-4 opções com gancho preenchido) se ele não pediu narração ainda ou se nenhum tema tiver fato firme.

## Passo 5: conferir os fatos

Cada narração precisa de **uma prova real** no lugar da prova da referência (estudo, número, "na natureza, os lobos..."). Pesquise (WebSearch, várias buscas na mesma mensagem) e anote a força:
- **forte**: artigo científico, universidade, instituto (com o link);
- **média**: fonte secundária ou detalhe que não deu para ver no artigo;
- **interpretação narrativa**: a licença do formato ("na cabeça dele", "dizem que", "muita gente acredita"). Pode, desde que não contradiga o fato.

Não invente número, país ou ano. Se o número exato não foi achado, escreva sem ele ("a maioria dos que chegaram perto"). Reels de crença (missões, destino) só podem dizer a crença com "dizem que" / "muita gente acredita", e o dado de "a ciência confirma um pedaço" tem de ser real.

## Passo 6: escrever espelhando o molde

Siga as regras do Passo 3 da skill `narracao-do-molde` (`~/.claude/skills/narracao-do-molde/SKILL.md`). Em resumo:
1. Mesmos blocos, na mesma ordem, com a mesma função.
2. Moldura repetida quase igual (a frase de abertura, os conectores, o fecho: "Parabéns! Você acabou de desvendar...", "E a terceira é a mais bonita", "Agora a parte que ninguém te conta").
3. Mesma pessoa (você / seu cachorro) e mesmos conectores no começo das frases.
4. Conteúdo 100% novo: nenhuma frase de conteúdo, personagem, nome ou situação da referência.
5. Cada frase com um verbo que vira imagem.
6. Tamanho parecido com a referência, como guia. O usuário não quer mínimo de palavras nem velocidade fixa.

**Fecho**: o da referência e, depois, o fim padrão do perfil: a `virada` e o `fecho` (ex.: `Esse vídeo foi feito com IA... até a minha voz.` e `Quer aprender a fazer vídeos assim? Comenta <PALAVRA> que eu te mando <recompensa>.`). Se o perfil não tem virada nem fecho, termine no fecho da referência.
- Se a referência pede para **seguir** a conta dela, troque esse pedido pela virada (não peça duas coisas).
- Se a referência termina em **loop** ("Porque..."), ponha o "Porque..." depois da virada, para emendar no gancho.
- Se a referência termina em **pergunta/enquete** ou em **marcação**, mantenha a pergunta ou a marcação e ponha a virada depois.
- **Formato puro** (sem a virada) só se o usuário pedir; diga que tirou.

## Passo 6F: modo fiel (mesma narração)

Parta da `transcricao.txt` e da `palavras.json` da referência. Confira cada frase com a legenda queimada nas folhas de contato, porque o Whisper erra (exemplos reais: "o citocina" = ocitocina, "em defeso" = indefeso, "Pizar" = Pisar, "cava ao tecido" = cava o tecido, "sobre mesa" = sobremesa).

O que fica igual: o assunto, os fatos, a ordem, as frases, o gancho e o fecho.

O que muda, e só isso:
1. **Erros de transcrição**, corrigidos pela legenda da tela.
2. **Nome, @ ou mascote da outra conta** ("Segue o @modofundadorbr", "segue a Mundo Explicado", "Siga o Indiozinho") sai. No lugar dele entra a virada padrão do perfil (Passo 6). Se o fecho tinha loop ("Porque..."), o loop vai depois da virada; se tinha pergunta ou marcação, ela fica e a virada vem depois.
3. **Fato errado ou sem base**: pesquise (Passo 5) só as afirmações com número, estudo, país ou ano. Se uma estiver errada, corrija o mínimo (o número, o país) e avise. Se não achar fonte, mantenha e marque "sem fonte achada" na tabela de fontes.
4. **Frase de fala estrangeira ou sotaque de outro país** vira o jeito brasileiro de falar, sem mudar o sentido.

Não melhore o texto, não encurte e não troque exemplos. O usuário escolheu o fiel porque aquele texto já provou que funciona.

Salve em `<pasta_reels>/todo/<assunto>_fiel/ROTEIRO_<assunto>_fiel.md`, com o mesmo formato do Passo 7. No cabeçalho, ponha `Modo: FIEL`, a referência e a lista do que foi trocado. Na tabela "Bloco a bloco", a coluna "nova" mostra só o que mudou ("igual" quando não mudou). O mapa de planos usa o estilo da referência com **personagens e cenário próprios**: o texto é o mesmo, mas a imagem é nossa, sem o mascote e o cenário da outra conta.

No `molde.py conferir`, o modo fiel vai acusar quase todos os trechos iguais. É esperado; use só para ver a duração.

## Passo 7: salvar e conferir

Uma pasta por narração: `<pasta_reels>/todo/<tema>/ROTEIRO_<tema>.md`, com:
1. Cabeçalho: referência (caminho do `analise.md`, views e multiplicador), por que o tema fica no mesmo assunto, a moldura repetida e o fecho usado.
2. `## Texto para gravar`: bloco de código, uma frase por linha, linha em branco entre blocos, números como se fala, sem tags. A `narracao-elevenlabs` lê esta seção.
3. `## Bloco a bloco (molde → nova)`: bloco | referência | nova.
4. `## Mapa de planos`: o estilo da referência com **personagens e cenário próprios** (outro cachorro, casa brasileira) e a tabela frase → o que mostrar.
5. `## Fontes e força de cada afirmação`: afirmação | força | fonte com link.

Depois rode, para cada uma:

```bash
python ~/.claude/skills/narracao-do-molde/scripts/molde.py conferir <pasta_reels>/_referencias/<pasta> <pasta_reels>/todo/<tema>/ROTEIRO_<tema>.md
```

Trecho de 6 palavras igual à referência: moldura pode; frase de conteúdo, reescreva. A duração estimada só informa.

## Passo 8: entregar

No chat, para cada narração: referência e multiplicador, tema escolhido e por quê, o **texto para gravar** inteiro, a duração estimada e as afirmações de força média ou interpretativa. Antes, uma tabela curta do lote (conta, views, multiplicador, molde em uma linha) e a fórmula comum em 3-5 itens.

Se o usuário pediu a voz, carregue `narracao-elevenlabs` e gere `NARRACAO_ELEVENLABS.md` em cada pasta (tags pela tabela da `narracao-do-molde`, frase de teste e o que ouvir). Se não pediu, ofereça.

## Depois

Ofereça a nota de viral (`checar-viral`) de cada roteiro e a produção (`prompt-do-molde`, com o estilo da ficha). Quando o áudio existir, o vídeo segue o que a voz falou.
