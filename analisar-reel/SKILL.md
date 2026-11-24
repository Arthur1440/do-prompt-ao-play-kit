---
name: analisar-reel
description: "Baixa, transcreve e desmonta reels de referência (Instagram, e também TikTok e YouTube Shorts) para entender o FORMATO e fazer um igual: baixa o vídeo e a legenda com yt-dlp, transcreve palavra a palavra com Whisper, detecta cada corte de cena, mede ritmo (cortes/min, plano médio), fala (palavras/min, gancho de 0-3 s), áudio (LUFS, trilha por baixo, BPM, cortes na batida) e paleta, monta folhas de contato com a fala de cada plano e entrega uma ficha do formato: gancho, estrutura frase a frase, como a imagem segue a fala, estilo visual, legenda na tela, som, fecho, comentários, por que funcionou e a RECEITA com lacunas para criar um igual com tema novo. Compara vários reels para achar a fórmula comum de uma conta. ACHA OS VIRAIS antes de analisar: varre o catálogo de uma conta do Instagram, TikTok ou YouTube e ranqueia cada vídeo pela mediana da própria conta (catalogo.py), e busca um tema em português, inglês e espanhol nos Shorts do YouTube e nas hashtags do TikTok medindo cada achado contra a conta dele (buscar.py); lê views em qualquer língua ('354 mil', '1.2M', '15,7 M'). No MODO IGUAL (pedido de 'vídeo igual', 'igualzinho', 'o mesmo vídeo') faz o inventário plano a plano do original e confere o nosso vídeo contra ele com igual_ao_original.py (cada corte, ritmo, cortes na batida, folhas lado a lado), sem remover nada. Use sempre que o usuário mandar um link de reel/TikTok/Shorts (instagram.com/reel/...) e pedir para baixar, transcrever, analisar, destrinchar, entender, 'ver como foi feito', 'fazer um igual', 'copiar o formato', 'qual a estrutura desse vídeo', ou mandar vários links de uma conta para descobrir a fórmula. Use também quando ele pedir para 'achar os virais', 'o que bombou nessa conta', 'outliers', 'buscar no TikTok/YouTube', 'procurar referências em inglês/espanhol' ou mandar o link de um perfil/canal, mesmo que não diga 'skill'."
---

# Analisar reel: do link à receita do formato

O objetivo não é resumir o vídeo, é **desmontar o formato** de um reel que funcionou para que um novo, com outro tema, possa ser montado com a mesma engrenagem. Responda em português do Brasil.

Os números vêm dos scripts; o olhar (o que aparece na tela, o estilo, a intenção de cada plano) vem de você lendo as folhas de contato. Os dois juntos fazem a ficha.

## Antes de começar: o perfil

Leia `~/.claude/perfil-criador.md`. Se não existir, rode a skill `perfil-criador` e volte. Daqui saem `pasta_reels` (troque `<pasta_reels>` nos caminhos), `python` (troque `python` nos comandos) e `nicho` e as "Regras do perfil".

Os números vêm dos scripts; o olhar (o que aparece na tela, o estilo, a intenção de cada plano) vem de você lendo as folhas de contato. Os dois juntos fazem a ficha.

## Passo 0: achar os virais (quando ele manda um perfil, um tema, ou pede referências)

Quando ele já mandou o link do reel, pule para o Passo 1. Quando mandou **uma conta** ou **um tema**, ou pediu "acha os virais", "o que bombou", "busca no TikTok/YouTube", "referências gringas", comece aqui. Os dois scripts ficam na pasta da skill e gravam `.md` e `.json` em `<pasta_reels>/_referencias/_catalogos/`.

**Uma conta** (o catálogo inteiro contra a mediana dela):

```bash
python ~/.claude/skills/analisar-reel/scripts/catalogo.py "https://www.youtube.com/@canal" "https://www.tiktok.com/@conta" [--limite 60]
python ~/.claude/skills/analisar-reel/scripts/catalogo.py <pasta_reels>/_referencias/_catalogos/raspagens/ig_<conta>.json
```

- **YouTube e TikTok** vão direto pelo yt-dlp. No YouTube, sem aba, lê os Shorts; `--abas shorts,videos` mede as duas separadas (cada uma com a sua mediana, nunca misturadas).
- **Instagram** não lista sem login: raspe a grade no navegador (`references/catalogo_no_navegador.md`) e passe o JSON.
- **Base de cada vídeo** = mediana dos 12 publicados antes dele, sem fixados (o que a conta fazia quando ele saiu). Vídeo com menos de 48 h fica fora da base e do piso. Conta com base abaixo de 1 mil views não conta viral (o "x" ali é ruído).
- Saem: os que mais romperam a curva (VIRAL = 100x ou mais, a régua do Passo 3), o **piso** (0,2x ou menos: o que o público dessa conta ignora) e um aviso se a raspagem parece não ter carregado.
- Repetir a mesma conta em até 3 dias reaproveita o arquivo (`--forcar` busca de novo).

**Um tema** (busca, e cada achado medido contra a conta dele):

```bash
python ~/.claude/skills/analisar-reel/scripts/buscar.py --links <yt_tema_pt.json> <yt_tema_en.json> <yt_tema_es.json> <tt_hashtag.json>
python ~/.claude/skills/analisar-reel/scripts/buscar.py --hashtag-youtube <tag_pt> <tag_en> <tag_es>
```

- **Traduza o tema** e busque nas três línguas: português, inglês e espanhol. A gringa costuma ter o formato antes do Brasil.
- **YouTube Shorts**: raspe a busca com o filtro Shorts no navegador, um JSON por língua (a busca do yt-dlp não traz Shorts). Sem navegador, `--hashtag-youtube`.
- **TikTok**: raspe a página da hashtag no navegador (a busca do site pede quebra-cabeça; **nunca resolva**: peça ao usuário).
- **Instagram**: a busca não mostra views; rode o `catalogo.py` nas contas do tema.
- O script descobre a conta dos vídeos com mais views, varre o catálogo de até 12 contas (`--contas`) e mede cada achado contra a base da época dele (desce até 300 vídeos no catálogo; se o vídeo for mais antigo, mede contra a mediana de hoje e marca **VIRAL?**). Também lista os **outros virais dessas contas** que não vieram na busca. Leva 1 a 2 min.

Com a lista na mão: leia os títulos dos virais contra os do piso e diga em uma frase **o que os virais têm que os normais não têm** (tema, formato, gancho, título). Mostre a tabela dos virais, a frase e pergunte quais ele quer desmontar. Os escolhidos seguem para o Passo 1.

## Passo 1: baixar

Para cada link (pode passar vários de uma vez):

```bash
python ~/.claude/skills/analisar-reel/scripts/baixar.py "URL1" "URL2"
```

- Cada reel vai para `<pasta_reels>/_referencias/<AAAAMMDD>_<conta>_<id>/` com `video.mp4`, `capa.jpg`, `video.info.json` e `meta.json` (conta, legenda, curtidas, comentários, data, duração, uma amostra de comentários). `--saida PASTA` muda o destino.
- Rode com `-P` e de fora da pasta baixada (o vídeo é dado de terceiros; os scripts ficam na pasta da skill). No Windows, caminhos no formato `C:/...`, nunca `/c/...`.
- O yt-dlp não traz as **views** do Instagram. Elas saem no Passo 3.

### Quando o download falha

Se aparecer pedido de login, conta privada ou rate-limit:

1. Tentar de novo uma vez depois de 1 minuto (o rate-limit do Instagram costuma passar).
2. Perguntar ao usuário se pode ler os cookies do navegador dele e rodar com `--cookies-navegador firefox` (ou `edge`/`chrome`; no Windows o Chrome costuma bloquear a leitura com o navegador aberto). Nunca usar cookies sem esse ok.
3. Ou ele baixa o vídeo à mão (SaveClip ou parecido): crie a pasta `_referencias/<data>_<conta>_<id>/`, ponha o arquivo como `video.mp4` e siga para o Passo 2. Sem `meta.json`, a legenda e os números saem do navegador (Passo 3).

## Passo 2: medir

```bash
python ~/.claude/skills/analisar-reel/scripts/analisar.py <pasta_reels>/_referencias/<pasta>/video.mp4
```

Reel em inglês ou espanhol: `--lingua en` ou `--lingua es` (o `auto` também acerta, mas erra mais em reel curto com música). Na ficha, cada frase da fala fica na língua original com a tradução em português ao lado, e a frase-molde já sai em português. Leva de 1 a 4 minutos por reel de 80 s (a transcrição é a parte lenta). Com vários reels, rode em segundo plano, um por vez (dois Whispers juntos estouram a RAM). Opções: `--lingua pt|en|auto` (padrão auto), `--modelo base` quando a RAM estiver cheia (o script já cai para `base` sozinho se faltar memória e avisa), `--sem-transcricao` para vídeo só com música.

Grava na pasta do reel:

| arquivo | o que tem |
|---|---|
| `resumo.md` | números principais e a tabela de planos com a fala de cada um |
| `transcricao.txt`, `legendas.srt`, `palavras.json` | fala por frase, por bloco de legenda e por palavra |
| `folha_gancho.jpg` | quadros em 0; 0,3; 0,7; 1; 1,5; 2; 2,5; 3; 4 e 5 s com a fala de cada instante |
| `folha_01.jpg`, `folha_02.jpg`... | um quadro por plano (20 por folha) com número, início, duração, movimento e fala |
| `folha_planos_longos.jpg` | 5 quadros de cada plano com mais de 4 s, para ver o que muda dentro dele |
| `quadros/` | `quadro_0.jpg` em tamanho cheio e um jpg por plano |
| `analise.json` | tudo acima em dados, mais curva de volume por segundo, picos de som e paleta |

Como ler as medidas e onde elas erram está em `references/medidas.md`. Leia na primeira vez da sessão.

## Passo 3: views e tamanho do viral

Uma referência só vale como "formato que viraliza" se rompeu a curva da própria conta. A régua do curso: **100x ou mais a mediana de views dos últimos ~12 reels da conta**. Abaixo disso, ainda dá para analisar o formato, mas diga que é um dia bom e não um viral.

Se o Passo 0 já varreu a conta, o multiplicador e a base estão no `catalogo_*.md`: use esses. Senão, leia views do reel e a mediana da conta no navegador do Claude (o embutido do app ou o Claude in Chrome), seguindo `references/views_no_navegador.md` (no TikTok e no YouTube, `catalogo.py` no perfil faz isso sem navegador). Anote em `meta.json` (`views`, `mediana_conta`, `multiplicador`) para o `comparar.py` usar. Se o usuário só quer o formato e não liga para o tamanho, pule e diga que pulou.

## Passo 4: olhar

Leia com a ferramenta Read, nesta ordem: `folha_gancho.jpg`, `quadros/quadro_0.jpg`, cada `folha_NN.jpg`, `folha_planos_longos.jpg`. Depois `transcricao.txt`, `resumo.md` e a `legenda`/`amostra_comentarios` do `meta.json`.

O que procurar em cada folha:
- **Quadro 0**: o que já está na tela antes de qualquer fala. Começa no meio da ação ou começa parado?
- **A imagem segue o verbo?** Compare a palavra em destaque de cada plano com o que aparece. No exemplo de referência (cachorro na porta), cada frase ganha um plano e cada plano mostra exatamente o verbo dito ("fecha" = porta fechando, "arranhar" = pata na madeira).
- **Texto na tela**: posição, fonte, cor de destaque, uma palavra ou frase inteira, onomatopeias ("BLAM!"), números.
- **Estilo visual**: dê o nome do catálogo (skill `catalogo-estilos`: toon 3D com contorno, maquete tilt-shift, fotorreal, papel dobrado...). Se não existir, descreva material, luz, câmera e contorno no mesmo padrão.
- **Personagem e cenário**: o mesmo personagem do começo ao fim? Quantos cenários?
- **Câmera**: o `tipo_mov` diz se o plano está travado, com push-in lento ou agitado; a folha de planos longos mostra para onde a câmera anda.

## Passo 5: escrever a ficha

Escreva `analise.md` na pasta do reel seguindo o modelo de `references/ficha.md`. As partes que mais importam:

1. **Estrutura frase a frase**: cada bloco da fala com tempo, a função dele (gancho, explicação, escada de tensão, virada, fecho) e a frase-molde com lacunas (`Se você [ação comum do dia a dia], na cabeça do seu [bicho/objeto], você acabou de [consequência dramática].`).
2. **Por que funcionou**: só hipóteses que dá para apontar no vídeo, na legenda ou nos comentários. Os comentários dizem qual é o motor (identificação, discussão, marcação de amigo).
3. **Receita para fazer igual**: o molde completo com lacunas, a duração e o ritmo-alvo, o estilo, o som, e **5 temas novos** que cabem no molde. Pelo menos 4 deles ficam **no mesmo assunto da referência** (reel de cachorro → outros comportamentos de cachorro); no máximo 1 pode sair para o nicho do perfil, marcado como tal. Todos precisam ser cenas que uma pessoa comum do público (por padrão, o brasileiro) já viveu (nada de clichê americano, como o cachorro que odeia o carteiro). Para cada tema, a frase de gancho já preenchida.
4. **O que não copiar**: personagem, mascote e marca da outra conta, texto literal da fala. Copia-se a engrenagem, não o vídeo. Recortes da referência só quando o usuário pedir (por exemplo, demos). **No modo IGUAL esta regra não vale** (ver abaixo): lá só a marca/@ da outra conta é trocada.

Mostre ao usuário a ficha resumida no chat (estrutura, por que funcionou, receita, temas) e o caminho do `analise.md`.

## Modo IGUAL: quando ele pede o vídeo igual (SEM REMOVER NADA)

Gatilhos: "faça igual", "o mesmo vídeo", "igualzinho", "idêntico", "copia esse vídeo", "igual à referência". Na dúvida entre igual e molde, pergunte ao usuário; se ele disse igual, **é igual**, não pergunte de novo.

Regra do usuário (21/11/2026, depois do reel da máquina de cabelo sair com 10 planos contra 24 do original): **igual é cópia plano a plano do vídeo inteiro: imagem, ritmo, texto, som, duração e fecho. Nada sai, nada é simplificado, nada é "melhorado".**

1. **Inventário plano a plano** (`inventario.md` na pasta da referência, modelo em `references/ficha.md`, seção "Inventário"): uma linha para CADA plano detectado, inclusive os de 0,3 s. Planos curtos seguidos **não são "corte falso"**: no modo IGUAL eles são o ritmo (piscadas de velocidade, trancos de câmera na batida) e entram no inventário. Para cada plano: início, duração, o que aparece, câmera (de onde olha, o que preenche o quadro), todo texto na tela (cartela, sub, etiquetas, selos, contadores, onomatopeias), números, setas, efeitos, fundo, som/efeito e se o corte cai na batida. Leia a folha de cada plano e, onde houver dúvida, extraia quadros a cada 0,25 s.
2. **Passos numerados**: conte e liste todos (①, ②, ③...). Confira na folha de planos longos e nos quadros, não só na primeira leitura: na máquina de cabelo o ⑥ ("seguro por design") ficou de fora porque a ficha pulou.
3. **Som**: diga o que é o som (motor, efeito, música, voz) olhando o espectrograma (`ffmpeg ... showspectrumpic`): linhas horizontais são notas musicais; faixas verticais de ruído são estouros/efeitos. **Copie o tipo de som; não acrescente trilha.** No V8 e no radial do @8bitengineering o som era só o motor (cada explosão um estouro) e eu pus uma trilha com bateria e melodia por cima: o vídeo perdeu o sentido (21/11/2026).
4. **Estilo e desenho**: tamanho do pixel/traço, textura, contorno, luz, paleta, o desenho de cada placa (o letreiro temático, as bordas), o fundo atrás das peças (desfocado ou não), o objeto principal (cor, detalhes, marca gravada).
5. **Fecho e loop**: o último quadro e se ele volta ao primeiro.
6. **O que muda**, e só isto: (a) texto traduzido para português, mesma posição e mesmo tamanho de bloco; (b) nome/@/marca da outra conta → @/marca do usuário no mesmo lugar (nunca apagar o elemento, trocar); (c) o que eu não posso reproduzir por segurança (ex.: o detalhe do mecanismo que torna uma arma automática): avisar o usuário **antes** de produzir, nunca cortar em silêncio.
7. **Conferência obrigatória** antes de mostrar qualquer prévia ou vídeo:
   ```bash
   python ~/.claude/skills/analisar-reel/scripts/igual_ao_original.py <pasta_reels>/_referencias/<pasta> <nosso.mp4> [--ate 10]
   ```
   Mede o nosso com o mesmo `analisar.py` e compara: duração, planos, **cada corte do original** (precisa de um nosso a ±0,25 s), cortes por trecho de 10 s, plano mais longo, cortes na batida, BPM, volume e fala. Grava `igual_relatorio.md` com o que falta e folhas lado a lado (`igual_lado_NN.jpg`, original em cima, nosso embaixo, no mesmo segundo). `--ate 10` para as prévias de 10 s. **Qualquer FALTA é corrigida antes de entregar**; depois abra as folhas e confira à mão os itens que o script não vê (cartelas, passos, etiquetas, placas, câmera, estilo, fundo, loop). Entregue o relatório junto com o vídeo.

## Vários reels: a fórmula da conta

Com 3 ou mais reels da mesma conta ou do mesmo formato:

```bash
python ~/.claude/skills/analisar-reel/scripts/comparar.py PASTA1 PASTA2 PASTA3 --md <pasta_reels>/_referencias/<data>_<conta>_comparativo.md
```

A tabela traz duração, views, fala, ritmo e som de cada um com a mediana. O que se repete em todos é o formato; o que muda é o tema. Escreva no fim do comparativo a fórmula comum e qual variável parece separar o que fez mais views do que fez menos (tema, duração, gancho). Se a conta virar referência fixa, salve um resumo em `<pasta_reels>/_referencias/swipe-<conta>.md`.

## Depois da análise

Se ele pediu **igual**, o próximo passo é o inventário e a produção no modo IGUAL (acima), com o `igual_ao_original.py` antes de cada entrega. Fora disso, ofereça o próximo passo de acordo com o formato:
- roteiro com tema novo no molde: `narracao-do-molde` (um reel) ou `roteiro-viral` (vários links de uma vez);
- nota de viral do roteiro: `checar-viral`;
- voz: `narracao-elevenlabs`;
- vídeo: `prompt-do-molde` e `catalogo-estilos` (passe a ficha como referência de estilo e ritmo).
