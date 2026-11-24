# Narração do Sisteminha no ElevenLabs (exemplo completo)

## Texto para colar

Cole o bloco inteiro de uma vez. As tags ficam em inglês (é como o modelo as entende melhor) e não são lidas em voz alta.

```
[curious] Com quinze mil reais, dá para NUNCA mais comprar peixe nem ovo?
[intrigued] E ainda sobrar para vender?

[matter-of-fact] Existe um quintal no Brasil feito para isso... e ele se chama Sisteminha.
[warm] Quem inventou foi um zootecnista da Embrapa, na tese de doutorado, para uma família pobre comer o ano inteiro num quintal pequeno.

[curious] No centro fica um tanque de dez mil litros, cheio de tilápia.
[conspiratorial] O cocô dos peixes vira amônia... as bactérias transformam isso em nitrato... e essa água aduba a horta.
[matter-of-fact] Em volta, galinhas e minhocas aproveitam os resíduos do tanque.

[serious] Agora... a conta.
[matter-of-fact] Em Esperantina, no Piauí, um agricultor tira até quarenta quilos de tilápia a cada cem dias.
[impressed] Com vinte galinhas, são cinco mil e quinhentos ovos por ano... mais de QUINZE por dia. E o que sobra, ele vende para os amigos.

[intrigued] E os quinze mil reais?
[conspiratorial] É o custo quando o governo implanta... e só UM TERÇO disso é obra.
[matter-of-fact] O resto é ração e técnico acompanhando o primeiro ano.
[warm] Em seis ou sete meses, a família começa a produzir a própria comida.

[amazed] E esse quintal brasileiro já foi parar em SETE países da África.

[playful] Manda para aquele amigo que um dia vai largar tudo e morar no sítio.

[warm, confiding tone] E repara: tudo o que você viu foi feito com IA... até a narração. A IA clonou a minha voz.
[friendly] E vídeo assim também vira renda. Me segue que eu te mostro como.
```

## O que mudou em relação ao roteiro do chat

- **Números por extenso** ("quinze mil", "cinco mil e quinhentos"), para o modelo não ler "15" como "um cinco" nem "5.500" como "cinco ponto quinhentos".
- **"Só a voz é minha" virou "a IA clonou a minha voz"**, porque a narração sai do clone. "Em 3D" saiu da virada ("tudo o que você viu"), para não arriscar a leitura "três D".
- **Pausas com reticências e quebra de linha**, porque o v3 e o v4 não aceitam `<break>`. As reticências marcam onde a pessoa precisa respirar com a informação: o ciclo amônia → nitrato, "Agora... a conta" e "UM TERÇO".
- **MAIÚSCULAS só nas quatro palavras da surpresa:** NUNCA, QUINZE, UM TERÇO e SETE.
- **Uma tag de interpretação por frase, nenhuma que pareça som** (nada de [suspense] ou [laughs]).

## Configurações

- **Modelo:** Eleven v4 (o padrão do site). O v3 aceita o mesmo texto, se preferir.
- **Estabilidade:** Natural. Só passe para Creative se sair monótona; não troque no meio.
- **Velocidade:** comece em 1,0. A meta é de 75 a 82 s. Se passar de 85 s, suba para 1,05; se ficar corrido, desça para 0,95.

## Frase de teste (gere antes do texto inteiro)

```
[curious] Com quinze mil reais, dá para NUNCA mais comprar peixe nem ovo? [conspiratorial] O cocô dos peixes vira amônia... e essa água aduba a horta. [warm, confiding tone] A IA clonou a minha voz.
```

Se "cocô", "IA" e a pausa saírem certos aqui, saem certos no resto.

## O que ouvir em cada take

| Trecho | Precisa soar assim | Se sair errado |
|---|---|---|
| "cocô" | co-CÔ, com o acento no fim | Se sair "coco" (a fruta), troque por `as fezes` |
| "IA" | i-á | Se sair "aiei" (inglês), regenere só a linha; se insistir, troque por `inteligência artificial` |
| "Sisteminha" | sis-te-MI-nha | Escreva `Sistemínha` só no ElevenLabs |
| "Esperantina" | es-pe-ran-TI-na | Separe com hífen: `Esperan-tina` |
| A pergunta de abertura | Sobe no fim, como pergunta de verdade | Troque [curious] por [intrigued] |
| "só UM TERÇO" | Ênfase, sem gritar | Tire as maiúsculas e deixe o [conspiratorial] |
| "Me segue que eu te mostro como." | Fecha para baixo | Termine com ponto, nunca com reticências |

## Como gerar

1. Gere o texto inteiro. Cada clique em "Gerar fala" faz **duas versões** (Geração 1 e 2): ouça as duas e escolha. Se nenhuma servir, gere de novo.
2. Se só um trecho sair ruim, regenere **só aquele parágrafo**, com as mesmas configurações.
3. Baixe a versão escolhida em MP3 (o padrão do site, 44,1 kHz e 128 kbps, serve) e salve como `<pasta_reels>/todo/sisteminha/narracao.mp3`. O prompt de produção procura esse nome.
