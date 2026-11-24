---
name: narracao-elevenlabs
description: Converte um roteiro ou narração em português para o formato do editor de fala expressiva do ElevenLabs (v3/v4) com a voz do perfil do criador (clonada ou da biblioteca), e entrega o texto pronto para colar, com tags de interpretação, pausas, números por extenso, frase de teste, tabela de pronúncia e configurações. Use sempre que o usuário pedir para formatar, converter, adaptar ou preparar um roteiro, narração ou locução para o ElevenLabs, para a voz clonada, para "fala expressiva", "tags de áudio" ou "gerar a narração", ou quando ele aprovar um roteiro de reel (por exemplo da skill narracao-do-molde ou roteiro-viral) e for gerar o áudio, mesmo que não diga "ElevenLabs".
---

# Narração para o ElevenLabs

Transforma um roteiro aprovado no texto que o criador cola no editor de fala expressiva do ElevenLabs, com a voz dele. O objetivo é sair um áudio bom no primeiro ou segundo take, sem gastar créditos com leitura errada de número, sigla ou palavra parecida com outra.

Responda sempre em português do Brasil.

## Antes de começar: o perfil

Leia `~/.claude/perfil-criador.md`. Se não existir, rode a skill `perfil-criador` e volte. Daqui saem:
- `voz_elevenlabs` e `voz_clonada`: o nome da voz e se ela é clone da voz do criador;
- `ritmo_voz`: palavras por segundo, para estimar a duração (2,9 até medir);
- `virada` e `fecho`: o fim padrão dos vídeos do perfil (podem estar vazios);
- `pasta_reels`: onde ficam as pastas dos reels (`<pasta_reels>/todo/<tema>/`);
- `python`: o comando Python (`py -X utf8` no Windows, `python3` no Mac/Linux). Nos comandos abaixo, troque `python` por ele;
- "Regras do perfil": siga todas.

Exemplo completo de entrega: `references/exemplo_sisteminha.md`. Leia antes da primeira conversão da sessão: o formato é esse.

## Entrada

- Um texto colado no chat, ou o `ROTEIRO_*.md` da pasta do reel (`<pasta_reels>/todo/<tema>/`; reels novos ficam em `todo` e vão para `done` quando finalizados). No roteiro, use só a seção "Texto para gravar"; tabelas, legenda e fontes não entram na narração.
- Se houver mais de uma versão do texto no chat, use a última que o usuário aprovou e diga qual usou.

## O que pode e o que não pode mudar

A conversão muda a **forma**, não o conteúdo. Os fatos já foram conferidos na etapa do roteiro; trocar uma palavra pode mudar o alcance de uma afirmação ("até 40 quilos" não pode virar "40 quilos").

Mudanças permitidas, sempre listadas na entrega em "O que mudou":
- números, datas, valores e porcentagens por extenso;
- pontuação e quebras de linha para pausar;
- troca de uma palavra que o modelo lê errado por uma equivalente (ex.: "em 3D" sai, porque vira "três D");
- **a virada de honestidade**: se o texto diz "só a voz é minha" ou "a narração é minha" e a voz é clone (`voz_clonada: sim`), troque por uma frase que diga que a voz é um clone feito com IA. Se a voz não é clone do criador, nunca escreva "a minha voz": diga "do roteiro à voz". Avise o usuário dessa troca.
- **o fim padrão do perfil**: se o perfil tem `virada` e `fecho`, o texto termina com `[warm, confiding tone] <virada>` seguido de `[friendly] <fecho>`. Se o roteiro trouxer outro fim, troque pelo do perfil e avise. Se o perfil não tem virada nem fecho, mantenha o fim do roteiro.

Qualquer outra mudança de texto (cortar frase, trocar gancho) é sugestão: proponha, não aplique.

## Regras do formato

Elas vêm do guia oficial de prompting do Eleven v3 e v4 e do que funcionou em dezenas de narrações do curso.

1. **Tags de interpretação em inglês, uma por frase, no início da linha.** O modelo entende melhor em inglês, e a tag vale para o trecho que vem depois. Tag demais deixa a voz instável. Use tags de emoção ou de tom de fala:
   `[curious]`, `[intrigued]`, `[conspiratorial]`, `[matter-of-fact]`, `[serious]`, `[warm]`, `[impressed]`, `[amazed]`, `[playful]`, `[amused]`, `[satisfied]`, `[excited]`, `[friendly]`, `[softly]`, `[warm, confiding tone]`.
   Escolha a tag pelo papel da frase: gancho e pergunta → curious/intrigued; revelação → conspiratorial; números → matter-of-fact; virada para a IA → warm, confiding tone; pedido final → friendly.
2. **Nada de tag que pareça efeito sonoro** (`[suspense]`, `[drumroll]`, `[applause]`, `[music]`, `[whoosh]`): o modelo pode gerar o som em vez de mudar a voz. Com voz clonada, **não use `[laughs]`, `[sighs]` nem `[whispers]`**: risada e suspiro de clone soam falsos.
3. **Pausa com reticências e quebra de linha.** O v3 e o v4 ignoram `<break>` e SSML. Uma linha em branco separa blocos do roteiro (gancho, história, conta, virada). Reticências dentro da frase marcam onde a pessoa precisa absorver uma informação; mais de duas por frase vira gagueira.
4. **MAIÚSCULAS só nas palavras da surpresa**, de 2 a 5 no texto todo. Ênfase em excesso vira grito. Siglas (CPF, IA) não contam.
5. **Números por extenso**: "quinze mil reais", "cinco mil e quinhentos", "mil novecentos e cinquenta e nove", "dez por cento". Algarismo pode ser lido como dígitos soltos ou com outra flexão ("1" vira "primeiro").
6. **Siglas e palavras de risco**: mantenha a sigla no texto e anote na tabela "O que ouvir" a pronúncia certa e a troca se sair errado (ex.: "CPF" → `cê pê éfe`). **"IA" entra escrito `IA` no texto para colar, nunca `i-á`.** Na tabela "O que ouvir", anote que deve soar "i-á"; se o take sair "aiei" (o A.I. em inglês), regenere só aquela linha e, se insistir, troque por `inteligência artificial` naquela linha. Procure também homógrafos e palavras parecidas com outras ("cocô" × "coco"), nomes próprios pouco comuns e estrangeirismos.
7. **Texto limpo**: sem travessão, sem emoji, sem markdown, sem aspas decorativas. Pergunta termina em "?"; a última frase termina em ponto, nunca em reticências, para fechar para baixo.

## Duração

Use o `ritmo_voz` do perfil (2,9 palavras por segundo, sem contar as tags, até medir a voz). Calcule a duração estimada, dê a meta em faixa (±5 %) e diga quando subir ou descer a velocidade (1,05 se passar da meta, 0,95 se ficar corrido; a faixa do ElevenLabs vai de 0,7 a 1,2, e nos extremos a qualidade cai). A duração só informa: não corte texto para caber numa meta sem o usuário pedir.

## Verificador

Depois de montar o texto, salve-o e rode o verificador, que aponta algarismos, `<break>`, tags fora do lugar, tags de som, excesso de maiúsculas, travessões, "só a voz é minha" e a duração estimada (no ritmo do perfil):

```bash
python ~/.claude/skills/narracao-elevenlabs/scripts/verificar.py <pasta_reels>/todo/<tema>/NARRACAO_ELEVENLABS.md
```

Ele lê o primeiro bloco de código depois de "Texto para colar" (ou o arquivo inteiro, se não houver bloco). Corrija os ERROS antes de entregar; os AVISOS você avalia (uma sigla em maiúsculas é normal).

## Entrega

Salve `NARRACAO_ELEVENLABS.md` na pasta do reel (`<pasta_reels>/todo/<tema>/`) com estas seções, nesta ordem:

1. **Texto para colar** — num bloco de código, pronto para copiar.
2. **O que mudou em relação ao roteiro** — cada troca e o motivo.
3. **Configurações** — a voz do perfil; modelo Eleven v4, que é o padrão do site desde novembro de 2026 (o v3 continua no menu e aceita o mesmo texto: as tags, as pausas e os números por extenso valem nos dois; se a voz for Professional Voice Clone, fique no v4, porque PVC não é otimizado no v3); estabilidade Natural (Creative se sair monótona; Robust quase ignora as tags; não trocar no meio); velocidade 1,0 e a meta de duração.
4. **Frase de teste** — uma linha só, juntando as palavras de maior risco de pronúncia, a pausa mais importante e a virada. É para gerar antes de gastar créditos no texto inteiro: se ela sair certa, o resto sai.
5. **O que ouvir em cada take** — tabela: trecho, como precisa soar, o que trocar se sair errado.
6. **Como gerar** — cada clique em "Gerar fala" faz duas versões (Geração 1 e Geração 2), então a frase de teste e o texto inteiro já chegam com duas opções: ouvir as duas e escolher; se nenhuma servir, gerar de novo. Regenerar só o parágrafo ruim com as mesmas configurações. Baixar a versão escolhida em MP3 (o padrão do site, 44,1 kHz 128 kbps, serve para reel; 192 kbps ou WAV se o plano oferecer) e salvar como `<pasta_reels>/todo/<tema>/narracao.mp3`, nome que o prompt de produção procura.

No chat, mostre o bloco do texto para colar, as mudanças em tópicos curtos, a configuração em uma linha e a frase de teste com o que ouvir nela. O resto fica no arquivo.

Se não houver pasta do reel (texto avulso), entregue tudo no chat e pergunte onde salvar.

## Depois do áudio

O áudio gerado manda: legenda, cenas e pedido final do vídeo seguem o que a voz falou, não o roteiro. Se o take escolhido trocou ou cortou uma palavra, avise que o prompt de produção vai transcrever o áudio e seguir a fala.

Se for o primeiro áudio do perfil, ofereça medir o ritmo da voz (skill `perfil-criador`, Passo 4): as estimativas de duração ficam certas daí em diante.
