# Catálogo de estilos

Os 4 primeiros foram extraídos quadro a quadro de reels de referência (out/2026). Os 2 últimos
completam o leque para narrações que não encaixam nos 4. Cada estilo traz: quando usar, a gramática
visual (o que torna o estilo reconhecível), tokens exatos, a cena-tipo, áudio e o que é proibido.

Canvas sempre 1080×1920, 30 fps. Coordenadas abaixo em px desse canvas.

---

## E1 · Dossiê Editorial (ref. @wrknstudio — "Cursor valeu US$ 60 bi", 92 s)

**Quando usar:** caso de empresa/pessoa, negócio, tecnologia, história com números e fontes.
Narração analítica, tom de jornalista. Funciona de 45 a 95 s.

**Gramática visual**
- Fundo quase preto chapado `#111214`, sem gradiente. Um único objeto de **arte de linha branca**
  no centro (globo em wireframe, órbitas, partículas, fluxo entre dois nós) que *evolui* ao longo
  do vídeo — o mesmo objeto, cada vez mais denso. É a metáfora visual da tese (ex.: globo vazio →
  globo cheio de pontos = "dados do usuário").
- **Barra de capítulos** no topo (y≈150): 3 segmentos lado a lado com rótulo mono minúsculo
  (`01 WRAPPER · 02 USO · 03 DADOS`). O capítulo ativo enche de vermelho `#C8372D` como barra de
  progresso; os já vistos ficam vermelhos cheios. O espectador sabe onde está e quanto falta.
- **Manchete** grande à esquerda (x=96, y≈260), sans grotesca branca, 2 linhas no máximo,
  **frase-tese curta** que resume o trecho, *não* a transcrição ("Usava IA dos outros. Valeu US$ 60 bi.").
  Troca a cada ideia (4–8 s).
- **Rótulos técnicos** apontando para o objeto: caixa com borda 1px + texto mono caixa-alta
  (`O APP`, `WRAPPER`, `O LUGAR DO TRABALHO`) ligada por linha fina.
- **Linha de fonte** mono minúscula cinza (y≈1490): `FONTE: BLOOMBERG, 14/08/2026`. Credibilidade.
- **Números grandes** em mono (`US$ 100 mi` + legenda `RECEITA ANUAL · JAN. 2025`) entram à esquerda
  sobre o objeto quando a narração cita valor.
- **Legenda falada** pequena, mono, centralizada embaixo (y≈1600), 2 linhas, ~34 px. Discreta:
  quem lê a manchete não precisa dela.
- **Abertura:** o 1º frame é o frame-tese do fim (capítulo 3 já cheio + frase final) — funciona como
  capa e promete o desfecho; em 0,3 s corta para o início da história.
- **Fecho:** "Nos siga." no lugar da manchete, objeto pequeno no centro, barra toda vermelha.

**Tokens:** fundo `#111214` · texto `#F2F2F0` · secundário `#8A8D91` · acento `#C8372D` ·
manchete Inter Tight / Neue Haas 600, 92 px, entrelinha 1.02, tracking −1.5% ·
mono JetBrains Mono / IBM Plex Mono 400, 22–34 px, caixa-alta com tracking +8%.

**Movimento:** câmera orbita o objeto devagar (360° em ~40 s), partículas derivam. Troca de manchete
= corte seco ou fade 6 frames. Nada salta. Ritmo calmo e denso.

**Áudio:** bed `drone`; `tick` a cada troca de manchete; `beep` quando um rótulo aparece;
`hit` só na revelação do número principal; `sub_drop` na frase final.

**Motor:** HyperFrames + Three.js (adapter) para o objeto em linha; ou SVG/canvas 2D com projeção
simples se for globo/órbitas.

**Proibido:** foto, emoji, gradiente, glow, cor além do vermelho, texto animado letra a letra.

---

## E2 · Holograma Neon (ref. @dougsan — "Os vícios explicados · Ep. 1: As bets", 72 s, 40 mil curtidas)

**Quando usar:** explicação de ciência, comportamento, corpo, psicologia, "como X funciona".
Narração didática com uma virada contraintuitiva. Ideal para **série**.

**Gramática visual**
- Fundo **roxo-vinho escuro** com vinheta: centro `#3A1A3F` → bordas `#0B0610`, poeira de estrelas
  esparsa.
- **Um objeto 3D em wireframe neon por ideia**, centralizado (y≈820), girando devagar sobre um
  **pedestal holográfico** (anéis concêntricos elípticos que brilham, y≈1180). Objetos literais e
  simples: ficha de cassino, celular, cabeça/cérebro, neurônio, pilha de moedas.
- Cor do objeto conforme o sentido: **vermelho-magenta `#FF2D6F`** = perigo/vício/tema;
  **branco-lavanda `#E9E4FF`** = neutro/ciência. O tema volta em vermelho no fecho (circularidade).
- **Selo de dado** no topo (y≈260): número em caixa com borda neon fina (`2003`, `R$ 10`, `+R$ 500`
  dentro da tela do celular). Ano do estudo, valor, porcentagem.
- **Legenda** frase inteira, sans clean branca 40 px, centralizada logo abaixo do pedestal (y≈1330),
  sentence case, sem caixa de fundo. Cada frase fica até a próxima.
- **Abertura-série:** grade 2×4 de ícones neon com títulos ("Bets, Álcool, Cigarro, Vape, Açúcar,
  Celular, Pornografia, Compras"), o do episódio aceso em vermelho, título "Os vícios explicados /
  Parte 1". Depois zoom no ícone → "Parte 1: Bets".
- **Fecho:** volta ao objeto do início, só uma frase curta ("É a dúvida.").

**Tokens:** fundo `#3A1A3F→#0B0610` · neon vermelho `#FF2D6F` · neon branco `#E9E4FF` ·
legenda Inter/SF Pro 500, 40 px, `#FFFFFF` · selo: Inter 600 64 px, caixa com borda 2px `#E9E4FF`
e brilho externo leve (é o único estilo em que brilho é permitido — é a linguagem do holograma).

**Movimento:** rotação contínua lenta (≈20°/s), pulso do pedestal a cada 2 s, troca de objeto por
dissolve 10–12 frames com o objeto novo "materializando" (linhas desenhando-se, 0,5 s).

**Áudio:** bed `pad` (menor, calmo); `shimmer` na materialização de cada objeto; `beep` no selo de
dado; `sub_drop` na virada contraintuitiva; silêncio de bed nos 1,5 s finais.

**Motor:** HyperFrames + Three.js (EdgesGeometry/LineSegments + bloom leve) — ver adapter three.

**Proibido:** foto, texto em caixa-alta gritando, mais de um objeto em cena, cores fora das duas.

---

## E3 · Documento HUD / Metáfora (ref. @_da.vii_d — "Héstia: cientistas descobrem como voltar no tempo com um iceberg")

**Quando usar:** tese de negócio/serviço explicada por **uma metáfora visual** (iceberg, raio-x,
camadas, mapa). Narração que diz "a maioria olha só X, mas existe Y escondido".

**Gramática visual**
- Fundo gradiente vertical azul-noite `#1B2838 → #0A0F18`, estrelas finas.
- **Moldura de visor**: cantoneiras 1px nos 4 cantos (inset 40 px), rótulo superior esquerdo
  mono espaçado `HÉSTIA · ESTUDO REAL`, contador inferior direito `FRAME 0007` que avança.
  Dá cara de "arquivo de pesquisa".
- **Manchete** pesada (sans black, 84 px) em 3 linhas no terço superior, com **uma palavra-chave
  na cor de acento** ciano `#4FC3E8` ("iceberg"). Gancho de curiosidade, quase clickbait científico.
- **Metáfora low-poly** grande no centro-baixo: polígonos facetados com vértices marcados por pontos
  e arestas finas brancas. A câmera desce do que está acima da linha (o óbvio: "leads, faturamento,
  CAC, churn" como rótulos) para o que está abaixo (a camada escondida), revelando rótulos novos.
- Rótulos de dados presos aos vértices (mono 22 px + linha).

**Tokens:** fundo `#1B2838→#0A0F18` · texto `#F4F6F8` · secundário `#8FA3B8` · acento `#4FC3E8` ·
manchete Inter Black / Archivo Black 84 px · mono Space Mono 20–24 px tracking +20%.

**Movimento:** tilt/descida de câmera lenta (2–3 s por movimento, ease-in-out), contador de frame
correndo, partículas/bolhas subindo debaixo d'água.

**Áudio:** bed `drone` mais grave + ruído de água/sub filtrado quando a câmera mergulha;
`whoosh_down` no mergulho; `beep` por rótulo revelado; `hit` na frase "é ali que está o dinheiro".

**Motor:** HyperFrames + Three.js (geometria facetada com flatShading) ou SVG low-poly.

**Lição do original (23 curtidas):** o visual é forte, o roteiro não. Ao usar E3, **o gancho precisa
de promessa concreta nos 2 s** e o meio precisa de 1 exemplo com número. Se a narração não tiver,
diga isso ao usuário na proposta.

---

## E4 · Split Editorial (ref. @obrunookamoto / Pixel — "O Paulo colocou agentes de IA na pizzaria e economizou R$ 1,2 milhão", 84 s)

**Quando usar:** case de cliente, prova social, anúncio de evento/oferta, "pessoa X fez Y e ganhou Z".
Narração pessoal, conversada, primeira pessoa.

**Gramática visual**
- Tela dividida: **metade de cima** = rosto/apresentador (aqui não temos vídeo do narrador →
  usar B-roll vertical do ambiente do case, ou retrato estático com push-in lento);
  **metade de baixo** = B-roll do caso (forno, cozinha, telas) ou **cartões de UI** escuros.
- **Manchete-case** na costura (y≈940), sobre faixa preta, branca bold 52 px, 2 linhas, com o
  número de resultado ("economizou R$ 1,2 milhão"). Abaixo, linha mono laranja de evento
  (`27/10 · 20H · GRATUITO`).
- **Cartão de pessoa**: avatar + "Paulo / Dono da pizzaria" + pílula laranja `AGENTES DE IA NA PIZZARIA`,
  com checklist que vai marcando itens conforme a narração lista.
- Legendas palavra-a-palavra brancas bold sobre faixa preta, colada na costura.
- **Fecho/CTA**: tela preta, logo pequeno, frase com **uma palavra em serifa itálica laranja**
  ("*Revolucione* a forma com que você usa IA…"), linha do evento, "Toque em Saiba mais", seta ↓
  animada.

**Tokens:** fundo `#0E0E0E` · texto `#FFFFFF` · acento laranja `#FF5A1F` · manchete Inter 700 ·
acento serifado Instrument Serif Italic · mono Space Mono 20 px.

**Movimento:** corte a cada 1,5–3 s, push-in 3% nos B-rolls, checklist marcando no ritmo da fala.

**Áudio:** bed `pulse` (energético, 100–110 BPM) bem baixo; `pop` por item marcado; `whoosh` nos
cortes de cena; `hit` no número do resultado.

**Motor:** HyperFrames (vídeo + HTML). B-roll: Pexels/Pixabay vertical (licença livre) via
`/media-use` ou busca manual; gerar imagem só se não houver stock adequado.

---

## E5 · Manchete Cinética (complementar)

**Quando usar:** opinião forte, lista, "3 erros que…", frases de impacto, narração rápida (>170 ppm).
Quando a força está nas **palavras**, não numa imagem.

**Gramática:** fundo sólido que muda de cor por bloco (2 cores alternadas + 1 de acento),
**palavras-chave gigantes** (180–260 px) ocupando a largura, entrando no ritmo exato da fala
(word timestamps), palavra de ênfase em cor de acento ou sublinhada à mão. Números contam
(count-up) até o valor dito. Corte a cada frase.

**Tokens sugeridos:** creme `#F3EEE4` / tinta `#141414` / acento `#E8432E`, Archivo Black ou
Druk-like condensada. **Áudio:** `pulse`, `tick` por palavra-chave, `hit` nos números.
**Proibido:** mais de 6 palavras na tela ao mesmo tempo; animação letra a letra; bounce.

---

## E6 · Arquivo / Colagem Documental (complementar)

**Quando usar:** história, biografia, "como tudo começou", fatos de época, true crime leve.

**Gramática:** papel envelhecido / preto com grão, recortes de foto P&B (domínio público ou
geradas) com sombra dura, fita adesiva, datas carimbadas, marca-texto amarelo animado sobre
trechos de "documentos", Ken Burns lento nas fotos, mapa com linha traçada.

**Tokens:** papel `#E9E1D0`, tinta `#1C1A17`, marca-texto `#F5D547`, vermelho carimbo `#B3261E`,
serifa Libre Caslon + máquina de escrever Courier Prime. **Áudio:** `drone` + ruído de projetor/
papel, `tick` de máquina de escrever, `hit` de carimbo.

---

## Como escolher as 3 direções

Cruze o **tipo de narração** com os estilos e escolha 3 que sejam *realmente diferentes* entre si
(não três variações do mesmo):

| Narração | 1ª escolha | 2ª | 3ª (contraste) |
|---|---|---|---|
| Case de empresa / negócio com números | E1 | E4 | E5 |
| Ciência, comportamento, "como funciona" | E2 | E1 | E3 |
| Tese "o que ninguém vê" / serviço B2B | E3 | E1 | E5 |
| Prova social, cliente, oferta, evento | E4 | E5 | E1 |
| Opinião, lista, frases de impacto | E5 | E4 | E2 |
| História, origem, biografia | E6 | E1 | E2 |

Pode misturar (ex.: E1 com objeto neon do E2), mas diga explicitamente o que vem de onde.
