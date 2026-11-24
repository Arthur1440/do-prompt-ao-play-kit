# De onde vem cada categoria (e quanto confiar)

Calibração de 12/11/2026: 18 reels da conta de referência do curso (perfil de curiosidades e sistemas de sítio feitos com IA) com 24 h ou mais no ar, fala transcrita e notas dadas às cegas por um subagente que não sabia os resultados. Dados em `../data/`; refaça com `python scripts/pontuar.py --calibrar`.

## Como o score se saiu na calibração

- Score × envios por visualizador: rho +0,84. Score × views: +0,62.
- Separação entre os que passaram de 10 mil views (6) e os que travaram (12): AUC 0,95.
- Acertou a faixa em 16 de 18. Os dois erros:
  - **Milpa** (score 48, rompeu com 27 mil): sem número que se conta na mão ("um hectare e um terço") e sem pedido de envio, mas com gancho de R$ 0 e tema de sítio. O score é exigente com a prova.
  - **Biodigestor** (score 76, travou em 3,9 mil): tinha tudo na fala, mas o sistema só servia a quem tem curral, e 41% das interações vieram de seguidores. O score não vê quem recebe o envio.
- Limite: com 6 casos que romperam, o score separa "rompe" de "trava", mas não prevê se vão ser 12 mil ou 400 mil (alface, pitaya e quintal 140 kg tiveram notas iguais).

## Cada categoria

| categoria | peso | rho com envios (18 reels) | fonte externa | confiança |
|---|---|---|---|---|
| Gancho: ganho concreto nos primeiros 4 s, frase curta, surpresa no 0 | 20 | **+0,89** | skip rate nos 3 primeiros segundos (Instagram, desde ago/2025); tempo assistido é um dos 3 sinais (Mosseri, jan/2025) | alta na conta; o skip rate em si ainda não foi medido (só aparece no app) |
| Tema (comida em casa > sítio > ciência e tecnologia > resto) | 20 | +0,74 | valor prático e gatilho (Berger, STEPPS) | alta: 5 de 5 reels de comida em casa passaram de 12 mil |
| Prova: quem mediu + número que se conta na mão | 20 | +0,67 | moeda social e credibilidade para repassar (Berger) | alta |
| Pedido de envio (sonho > queixa > nenhum) | 15 | +0,58 | envios por alcance (Mosseri) | alta; a posição no tempo NÃO foi comprovada (os três maiores pediram aos 56–66 s) |
| Espanto | 10 | +0,52 | alta ativação positiva (Berger & Milkman, 2012) | média |
| Compartilhável: moeda social + gatilho do dia a dia | 10 | +0,46 | STEPPS | média (p ≈ 0,1) |
| Valor prático | 5 | +0,18 | STEPPS | baixa isoladamente: quase todo reel útil também está no tema certo |

## Penalidades

| penalidade | pontos | base |
|---|---|---|
| Raiva ou alarme | −5 por ponto da nota | na conta, média de 0,75% de envios contra 2,4% (p 0,13); os que tiveram raiva viraram comentário, não seguidor (condomínio: 0,13% de seguidores) |
| Tristeza forte | −5 | Berger & Milkman: baixa ativação espalha menos |
| Continuação ("parte 2") | −10 | peixe (parte 2 da alface): 6,5 mil contra 404 mil; hiratake (parte 2 do shiitake): 2,3 mil contra 310 mil. São só dois casos, então ainda é hipótese |
| A fala desmonta a promessa ("não faz milagre") | −5 cada | ar do quintal |

## Tamanho, palavras e ritmo (testados em 12/11, não entram no score)

Medido na fala real dos 18 reels (transcrição com o tempo de cada palavra):

| medida | rho com envios | rho com views | média de quem rompeu | média de quem travou | leitura |
|---|---|---|---|---|---|
| duração total | +0,04 | +0,02 | 75 s | 81 s | sem efeito dentro da faixa testada |
| palavras | +0,20 | +0,19 | 218 | 229 | sem efeito |
| palavras antes da virada de IA | +0,04 | +0,01 | 188 | 204 | sem efeito |
| palavras por frase | +0,31 | −0,04 | 10,8 | 10,5 | sem efeito |
| pausas por minuto | +0,02 | +0,07 | 9,2 | 9,0 | sem efeito |
| palavras nos 3 primeiros s | −0,01 | +0,02 | 7,8 | 8,6 | sem efeito |
| **ritmo (palavras por segundo)** | **+0,50** (p 0,04) | **+0,67** (p 0,003) | 2,9 | 2,8 | o único que aparece |

Por que a duração não pontua:
- Os 6 que romperam têm entre 67 e 81 s, mas os que travaram também estão quase todos nessa faixa (65 a 92 s). Dentro dela, o tamanho não separa nada: o tema e o gancho decidem.
- Só 3 reels ficaram fora da faixa: Fordlândia (44 s), Ueno Bank (109 s) e Trump × Lula (126 s). Os três travaram, mas também tinham tema fraco, então não dá para culpar a duração.
- Por isso o relatório só avisa "fora da faixa testada" abaixo de 60 s ou acima de 95 s: é território sem prova, não um erro comprovado.

Por que o ritmo é só um alerta:
- Todos os 6 que romperam falam entre 2,82 e 3,05 palavras/s, e 5 dos 12 que travaram ficaram abaixo de 2,80. Mesmo descontando o score, o ritmo ainda explica parte dos envios (rho +0,47, p 0,053, no limite).
- A diferença é pequena (0,1 a 0,2 palavra/s) e depende da velocidade do ElevenLabs e da contagem do Whisper. Com 18 casos, dar pontos a ela seria ajustar a régua ao acaso.
- Por isso o relatório avisa abaixo de 2,80, e o ritmo vira categoria se o padrão continuar quando o placar crescer.
- Com texto (sem áudio), o ritmo é estimado e não vale como alerta.

## O que a pesquisa diz e a conta não confirmou (não entra no score)

- "Envio vale mais que curtida e salvamento": na conta, o salvamento separou tão bem quanto o envio (AUC 1,00 contra 0,94). Isso serve para ler o resultado, não para pontuar a fala.
- "Envios ÷ salvamentos > 1": rho −0,10, sem relação.
- "Pedido de envio até 40 s": não comprovado (rho −0,30, p 0,35).
- Comentário não distribui: 160 comentários no Estúdio e 2,7 mil views.

## Como atualizar

Depois de cada auditoria com o reel já com 24 h ou mais no ar:

1. Acrescente a linha em `data/placar.csv` (views, visualizadores, envios, salvamentos, curtidas, comentários, seguidores, % das interações de não seguidores, se foi reel de teste, horas no ar).
2. Copie a transcrição para `data/transcricoes/<pasta>.json`.
3. Acrescente as notas em `data/notas_calibracao.csv`, de preferência dadas por um subagente que não sabe o resultado.
4. Rode `--calibrar` e, se a separação piorar, revise pesos e faixas no topo de `pontuar.py`.
