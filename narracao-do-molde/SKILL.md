---
name: narracao-do-molde
description: "Transforma a análise de um reel de referência (feita pela skill analisar-reel) numa narração NOVA igual ao formato: mesma escada de frases, mesmos conectores, mesmo gancho e mesmo fecho, com outro tema e fatos conferidos. Entrega o ROTEIRO com o texto para gravar, a tabela bloco a bloco (molde → nova), o mapa de planos (o que mostrar em cada frase) e as fontes, e, como opção, a versão pronta para colar no ElevenLabs com a voz clonada (seguindo a skill narracao-elevenlabs). Use sempre que o usuário pedir para transformar uma análise de reel em narração, 'fazer uma narração igual', 'escrever no mesmo molde', 'usar essa estrutura com outro tema', 'roteiriza o tema X igual àquele reel', ou escolher um dos temas sugeridos numa ficha da analisar-reel, mesmo que não diga 'skill' nem 'molde'."
---

# Narração do molde: da ficha da referência a uma narração nova

A analisar-reel desmonta o formato. Esta skill monta um reel novo com a mesma engrenagem: **a forma vem da referência, o conteúdo é novo e verdadeiro**. Responda em português do Brasil.

## Antes de começar: o perfil

Leia `~/.claude/perfil-criador.md`. Se não existir, rode a skill `perfil-criador` e volte. Daqui saem `pasta_reels` (troque `<pasta_reels>` nos caminhos), `python` (troque `python` nos comandos), `nicho`, `virada`, `fecho`, `palavra_comentario` e as "Regras do perfil".

## Entrada

- A pasta da referência em `<pasta_reels>/_referencias/<pasta>/`, com `analise.md` e `analise.json`. Se não houver, rode a skill `analisar-reel` antes. Se houver várias referências recentes e o usuário não disser qual, use a última analisada e diga qual usou.
- O tema. **Por padrão, fica no mesmo assunto da referência**: mesmo bicho, objeto ou universo, com outro comportamento ou situação (referência de cachorro → narração de cachorro). Não puxe para o nicho do perfil por conta própria: quem manda um reel de cachorro quer um reel de cachorro. Só saia do assunto se o usuário pedir ou escolher um tema de outro universo.
- **A cena tem de ser do dia a dia do público** (por padrão, o brasileiro). Antes de escrever, pergunte-se: uma pessoa comum daqui já viu isso na rua ou em casa? Clichê importado não cola: "cachorro que odeia o carteiro" é cena americana; "cachorro que corre atrás de moto" é brasileira.
- Se ele não disser o tema, **pergunte** (AskUserQuestion) com 3-4 opções do mesmo assunto e do dia a dia brasileiro, cada uma com o gancho já preenchido, e espere a escolha.

## Passo 1: medir o molde

```bash
python ~/.claude/skills/narracao-do-molde/scripts/molde.py extrair <pasta_reels>/_referencias/<pasta>
```

Mostra as frases da referência numeradas, com o tamanho de cada uma, as palavras de abertura ("Então" 4x, "Mas"...), o uso de segunda pessoa e a duração da fala. Leia junto a seção "Estrutura frase a frase" e "Receita" do `analise.md`: ali está a função de cada bloco (acusação, lei da natureza, cena, escada, virada, fecho).

## Passo 2: conferir os fatos do tema

Antes de escrever, pesquise (WebSearch) a afirmação central do tema: o comportamento, a regra, o número. Para cada afirmação, anote a força:
- **forte**: fonte técnica ou científica (Embrapa, universidade, manual técnico);
- **média**: prática conhecida ou evidência fraca;
- **interpretação narrativa**: a licença que o formato pede ("na cabeça do seu cachorro..."). Pode entrar, mas não pode contradizer o fato.

Se a afirmação central for falsa ou não tiver nenhuma base, diga isso e proponha outro tema. Não invente número nem estudo.

## Passo 3: escrever espelhando o molde

Regras, em ordem de importância:
1. **Mesmos blocos e na mesma ordem.** Cada bloco da referência ganha um bloco novo com a mesma função.
2. **Mesma moldura**: a frase-molde de abertura e de fecho pode ser repetida quase igual ("na cabeça do seu...", "Parabéns! Você acabou de descobrir por que..."). É ela que dá o formato.
3. **Mesmos conectores** no começo das frases ("Então", "Mas", "porque") e a mesma pessoa (se a referência fala com "você", a nova também).
4. **Conteúdo 100% novo**: nenhuma frase de conteúdo da referência, nenhum personagem, mascote ou situação dela.
5. **Cada frase precisa virar imagem**: um verbo concreto que dá para mostrar (pegar, fugir, botar), porque a imagem segue o verbo.
6. Tamanho de frase parecido com o da referência. É guia, não meta: o usuário não quer mínimo de palavras nem velocidade de fala fixada.

**Fecho:** use o fecho da referência e, depois dele, o fim padrão do perfil: a `virada` e o `fecho` (por exemplo, `Esse vídeo foi feito com IA... até a minha voz.` e `Quer aprender a fazer vídeos assim? Comenta <PALAVRA> que eu te mando <recompensa>.`). Se o perfil não tem virada nem fecho, termine no fecho da referência.
Se o usuário pedir **formato puro** (teste limpo, igual à referência), entregue sem a virada e diga que tirou.

## Passo 4: comparar com a referência

Salve o roteiro (Passo 5) e rode:

```bash
python ~/.claude/skills/narracao-do-molde/scripts/molde.py conferir <pasta_reels>/_referencias/<pasta> <pasta_reels>/todo/<tema>/ROTEIRO_<tema>.md
```

Ele lê o bloco de "Texto para gravar", separa a virada do perfil e mostra lado a lado: frases, palavras, aberturas, segunda pessoa, duração estimada no ritmo da voz do perfil (`ritmo_voz`, 2,9 palavras/s até medir) e **trechos de 6 palavras iguais aos da referência**. Moldura repetida é esperado; frase de conteúdo repetida, reescreva. Tudo é informação, nada trava.

## Passo 5: entregar o roteiro

Pasta: `<pasta_reels>/todo/<tema>/` (reel novo nasce em `todo`). Arquivo `ROTEIRO_<tema>.md` com:
1. **Texto para gravar**: num bloco de código, uma frase por linha, linha em branco entre blocos, números como se fala, sem tags. A skill narracao-elevenlabs lê esta seção.
2. **Bloco a bloco**: tabela função | referência | nova.
3. **Mapa de planos**: frase | o que mostrar (um plano por verbo), no estilo visual da ficha.
4. **Fontes e força de cada afirmação**, com links.

No chat, mostre o texto para gravar, a duração estimada, os trechos iguais à referência (se houver) e as afirmações de força média ou interpretativa.

## Passo 6 (opção): versão para o ElevenLabs

Ofereça sempre; faça direto se o usuário já pediu. Carregue a skill `narracao-elevenlabs` e siga as regras dela à risca: tags em inglês uma por frase, pausa com "...", números por extenso, maiúsculas só em 2 a 5 palavras de surpresa, `IA` escrito IA, verificador `verificar.py`, frase de teste e tabela "O que ouvir". Salve `NARRACAO_ELEVENLABS.md` na mesma pasta.

Escolha das tags pelo papel do bloco no molde:

| bloco do molde | tag |
|---|---|
| acusação / gancho | `[serious]` ou `[intrigued]` |
| lei da natureza | `[matter-of-fact]` |
| a cena na sua casa | `[conspiratorial]` |
| escada de tensão (pena, culpa) | `[softly]` / `[serious]` |
| virada (alívio) | `[warm]` |
| "Parabéns!" | `[playful]` |
| fecho de reinterpretação | `[satisfied]` ou `[amused]` |
| virada do perfil | `[warm, confiding tone]` e o pedido (`Comenta ...`) em `[friendly]` |

## Depois

Ofereça a nota de viral (`checar-viral`) e o prompt de produção do vídeo (`prompt-do-molde`, com o estilo e o mapa de planos do roteiro). Quando o áudio existir, ele manda: o vídeo segue o que a voz falou.
