# Rubrica de notas (0 a 2 por item)

Dê as notas lendo a fala real (a transcrição, quando houver áudio), não o roteiro: o vídeo segue o áudio. Para cada nota, guarde o trecho da fala que a justifica; sem trecho, a nota é 0. Ignore a virada final ("feito com IA…") e o pedido de comentário ("Comenta …") ao classificar o tema e o espanto.

A escala é a mesma da classificação cega dos 18 reels do placar (`data/notas_calibracao.csv`): na dúvida entre duas notas, compare com um reel de lá que você conheça.

| item | 0 | 1 | 2 | âncoras do placar |
|---|---|---|---|---|
| `gancho_ganho` (opcional; o script já detecta) | nenhum ganho concreto nos primeiros 4 s | ganho vago ("economizar", "renda") | ganho concreto: R$, "de graça", "infinito", "nunca mais comprar", "compre um, leve 37", quilos | Sisteminha 2, milpa 2, ar do quintal 0 |
| `gancho_surpresa` | abre com contexto, data ou nome ("Nos anos 40…") | curiosidade morna | a maior surpresa do vídeo está no segundo 0 | shiitake 2, Fordlândia 0 |
| `valor_pratico` | curiosidade sem uso | uso possível, mas distante | quem assiste sai com algo que pode fazer ou usar | shiitake 2, Goku 1, Fordlândia 0 |
| `serve_quem_recebe` | exige o que quase ninguém tem (curral, terra grande, cargo, região) ou é curiosidade sem uso | serve a parte de quem recebe | um amigo comum que mora na cidade consegue aproveitar | shiitake 2, alface 1, biodigestor 0 |
| `espanto` | sem surpresa | curiosidade morna | "isso existe?!" (surpresa positiva forte) | Sisteminha 2, ar do quintal 1 |
| `raiva_ou_ansiedade` | nenhuma | leve | indignação, medo ou alarme | condomínio 2, Trump × Lula 2 |
| `tristeza` | nenhuma | leve | tom de perda, melancólico | condomínio 2 |
| `gatilho_cotidiano` | assunto fora da rotina | aparece às vezes | aparece toda semana (café, ovo, fruta do mercado, celular) | shiitake 2, CPF 2, Fordlândia 0 |
| `moeda_social` | mandar pode soar como indireta, polêmica ou constrangimento | neutro | quem manda parece esperto, generoso ou bem informado | alface 2, Trump × Lula 0 |
| `autoridade_nomeada` | ninguém | cita fonte sem medição (um autor, um jornal) | quem mediu ou comprovou, com nome (Embrapa, UFPR, "pesquisadores do México") | pitaya 2, Cruzeiro 1 |
| `numero_tangivel` | sem número, ou só área técnica e percentual | anos, placares, número solto | número que se conta na mão: reais, quilos, dias, unidades | Sisteminha 2, milpa 0 |
| `pedido_envio` | não pede para mandar ou marcar | pede por queixa ou hábito ("o amigo que reclama do gás") | pede por sonho ou afeto ("que sonha em plantar a própria comida", "que torce para o maior de Minas") | Sisteminha 2, biodigestor 1 |
| `continuacao` (0/1) | — | a fala se apresenta como continuação ("parte 2", "muita gente perguntou") | — | — |
| `tema` (texto) | uma destas: `comida_casa` (comida, plantio ou criação no espaço da casa ou do quintal), `sitio_renda` (sistema rural, renda no campo), `ciencia`, `tecnologia`, `historia`, `cultura_pop` (inclui futebol), `noticia_politica`, `outro` | | | |

Grave as notas em JSON, por exemplo:

```json
{"gancho_surpresa": 1, "valor_pratico": 0, "serve_quem_recebe": 1, "espanto": 1, "raiva_ou_ansiedade": 0,
 "tristeza": 0, "gatilho_cotidiano": 1, "moeda_social": 1, "autoridade_nomeada": 1, "numero_tangivel": 1,
 "pedido_envio": 2, "continuacao": 0, "tema": "cultura_pop"}
```
