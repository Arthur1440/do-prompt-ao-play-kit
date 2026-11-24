---
name: checar-viral
description: "Verificação de viral de uma narração de reel do perfil do criador, antes de produzir ou de postar: mede a fala (texto, áudio do ElevenLabs ou vídeo final), dá nota de 0 a 10 em cada categoria (gancho, tema, prova, espanto, valor prático, pedido de envio, compartilhável), aplica penalidades e entrega um SCORE FINAL de 0 a 100 com veredito (deve romper / pode romper / fica no lote), os reels parecidos do placar e as correções que mais sobem a nota. A régua foi calibrada nos insights reais de 18 reels da conta de referência do curso e pode ser recalibrada com os reels do próprio criador. Use sempre que o usuário pedir para checar, avaliar, pontuar, dar nota, medir ou prever se um roteiro, narração, áudio ou reel vai viralizar, perguntar 'esse vai bombar?', 'qual a chance desse reel?', 'analisa esse reel antes de postar', ou quando um roteiro da narracao-do-molde ou da roteiro-viral ficar pronto, mesmo que não diga 'skill' nem 'score'."
---

# Checar viral: score de uma narração

Esta skill responde "esse reel tem cara de romper o lote de teste?" com números. A régua começa na conta de referência do curso e, à medida que o criador posta, passa a incluir os reels dele (ver "Depois que o reel for postado"). Responda em português do Brasil.

## Antes de começar: o perfil

Leia `~/.claude/perfil-criador.md`. Se não existir, rode a skill `perfil-criador` e volte. Daqui saem `python` (troque `python` nos comandos), `ritmo_voz`, `virada`, `fecho`, `palavra_comentario` e as "Regras do perfil".

## Por que existe

Todo reel novo ganha um lote de teste de alguns milhares de views de não seguidores. Na conta de referência, os que saíram dele (Sisteminha, alface, shiitake, milpa, pitaya, quintal 140 kg) têm um desenho em comum, e a fala sozinha já permite enxergar boa parte dele. A régua foi calibrada em 18 reels: o score acompanha os envios reais com rho +0,84 e acertou 16 de 18 na faixa. O que cada categoria mede, com que força, e os dois erros da calibração estão em `references/evidencias.md`. Leia esse arquivo na primeira vez de cada sessão: ele diz o quanto confiar em cada nota.

## Passo 1: medir a fala

Use sempre a versão mais próxima do que vai ao ar, porque o vídeo segue o áudio:

1. vídeo final (`.mp4`) ou narração gravada (`.mp3`): melhor, dá o segundo exato de cada fala;
2. só o texto para gravar (`.txt`): o tempo é estimado no `ritmo_voz` do perfil (2,9 palavras/s até medir).

Se o texto estiver só no chat, salve-o num arquivo do scratchpad. Depois rode:

```bash
python ~/.claude/skills/checar-viral/scripts/medir.py C:/caminho/arquivo.mp4 --saida C:/caminho/do/scratchpad
```

No Windows, passe caminhos no formato `C:/...`: o Python do Windows não entende `/c/...`. A transcrição de um vídeo de 80 s leva de 30 a 60 s de CPU. O script mostra o gancho dos primeiros 4 s, se há ganho concreto nele, o segundo do pedido de envio, os números ditos e as frases com o tempo de cada uma, e grava `<arquivo>.medicao.json`.

## Passo 2: dar as notas

Siga `references/rubrica.md` item a item e grave as notas num `notas.json` ao lado da medição. Cada nota precisa de um trecho da fala que a justifique: é o que torna o score auditável e evita a nota de simpatia.

**Notas às cegas quando o roteiro é seu.** Se a narração foi escrita nesta mesma conversa, quem escreveu tende a dar nota alta ao próprio texto. Nesse caso, peça as notas a um subagente que receba só a transcrição e a rubrica, sem o nome do reel nem expectativas. Foi assim que a calibração foi feita.

## Passo 3: calcular o score

```bash
python ~/.claude/skills/checar-viral/scripts/pontuar.py C:/caminho/arquivo.medicao.json C:/caminho/notas.json
```

O script aplica os pesos e as penalidades, dá o score final, a faixa e os três reels mais parecidos do placar com o resultado real de cada um. O cálculo fica no script, e não de cabeça, para o mesmo texto sempre dar o mesmo número.

## Passo 4: entregar (sempre neste formato)

```
SCORE FINAL: 62/100 · PODE ROMPER

| Categoria | Nota (0–10) | Peso | Pontos | Por quê (trecho da fala) |
|---|---|---|---|---|
| Gancho (0–4 s) | … | 20 | … | "…" |
| Tema | … | 20 | … | … |
| Prova (quem mediu + número) | … | 20 | … | "…" |
| Pedido de envio | … | 15 | … | "…" aos 55,9 s |
| Espanto | … | 10 | … | … |
| Compartilhável | … | 10 | … | … |
| Valor prático | … | 5 | … | … |
| Penalidades | | | −… | … |

Parecidos no placar: … (score, envios, views)

Formato (não entra no score): duração … s · … palavras · … palavras/s
```

O bloco de formato sai do script e sempre aparece, porque o criador quer ver tamanho, palavras e ritmo explicados. Diga em uma linha o que cada número significa para este reel, de acordo com `references/evidencias.md` ("Tamanho, palavras e ritmo"):
- a duração e o número de palavras não separaram quem rompeu de quem travou entre 65 e 92 s;
- fora de 60–95 s, avise que é território sem prova;
- o ritmo abaixo de 2,80 palavras/s é o dos que travaram (alerta, não pontos). Com áudio, a correção é subir a velocidade no ElevenLabs ou cortar as pausas longas.

Depois da tabela:

1. **As 3 correções que mais sobem o score**, em ordem de pontos ganhos, cada uma já reescrita na voz do criador ("troque X por Y: +12 pontos"). Comece pelas categorias de peso alto com nota baixa. Respeite o perfil e as regras fixas: a virada e o fecho do perfil não mudam, o pedido de comentário fica no fim, a conta vem com quem mediu e nenhum número sai da fonte.
2. **O que o score não vê**, em uma ou duas linhas, quando se aplicar ao caso:
   - se o sistema serve a quem recebe o envio (o erro do biodigestor);
   - se o ganho é palpável: o insumo é resto ou se multiplica sozinho (borra, rama, muda que rebrota), ou a pessoa precisa comprar de novo a cada colheita (o broto de feijão: score 90-98 e descartado porque cada quilo de broto consome a semente); e se uma pessoa comum, que nunca plantou nada, quer aquilo e consegue imaginar na casa dela (batata-doce e mel de abelha nativa: score 89 e 82, descartados como "pouco palpáveis para pessoas comuns");
   - se o tema já viralizou em outra conta (o teste do "já vi");
   - um motor que a conta nunca testou, como a identidade de torcida;
   - o visual e o quadro 0.
3. **Recomendação de postagem**: com score abaixo de 55 ou tema fora do nicho, postar como reel de teste, que não custa nada ao perfil. Diga em que hora reler, porque o reel de teste rompe tarde: reler com 24 h, não com 2,5 h.

Para comparar versões (dois ganchos, dois fechos), rode o Passo 3 para cada uma e mostre os scores lado a lado.

## Depois que o reel for postado

Com 24 h ou mais no ar, leia os insights (no app do Instagram, ou no navegador como em `~/.claude/skills/analisar-reel/references/views_no_navegador.md`), acrescente o reel ao placar (`data/placar.csv`, uma linha por reel) e recalibre seguindo o fim de `references/evidencias.md`. Um score que errou é o dado mais valioso: diga ao criador em uma linha se a previsão bateu. Com 10 ou mais reels do próprio perfil no placar, a régua passa a refletir o público dele, e não só o da conta de referência.
