---
name: perfil-criador
description: "Cria ou atualiza o perfil do criador em ~/.claude/perfil-criador.md: @ do Instagram, nicho, pasta dos reels, nome da voz no ElevenLabs, ritmo da voz, palavra do 'Comenta ___', o que a pessoa recebe ao comentar, a virada 'feito com IA' e a cor de destaque. Todas as skills do kit Do Prompt ao Play (analisar-reel, roteiro-viral, narracao-do-molde, narracao-elevenlabs, checar-viral, prompt-do-molde, catalogo-estilos) leem esse arquivo. Use quando o usuário pedir para configurar, criar ou mudar o perfil, trocar a voz, a palavra do comentário, o @, o nicho ou a pasta dos reels, ou quando outra skill do kit não achar o arquivo do perfil."
---

# Perfil do criador

O kit do curso não sabe quem é o aluno. Este arquivo diz: `~/.claude/perfil-criador.md` (no Windows, `C:\Users\<seu usuário>\.claude\perfil-criador.md`). Responda em português do Brasil.

## Quando rodar

- O usuário pediu para configurar ou mudar o perfil.
- Outra skill do kit procurou o arquivo e não achou. Nesse caso, rode esta skill, salve o perfil e volte para a skill que chamou.

## Passo 1: ver se já existe

Leia `~/.claude/perfil-criador.md`. Se existir e o usuário só quer mudar um campo, mude só esse campo e mostre o arquivo final.

## Passo 2: perguntar

Use AskUserQuestion, no máximo 4 perguntas por vez, e dê sempre uma opção pronta para quem ainda não decidiu:

1. **@ do Instagram** e **nicho** (ex.: "@ana.cozinha, receitas baratas"). Perfil novo pode deixar o @ em branco.
2. **Voz no ElevenLabs**: o nome da voz exatamente como aparece em "Minhas vozes" e se é **clone da própria voz** (sim/não). Quem ainda não tem pode escolher uma voz da biblioteca e trocar depois.
3. **Pedido do fim do vídeo**: a palavra do "Comenta ___" e o que a pessoa recebe (link, material, grupo). Pode ser "nenhum" se o perfil prefere só pedir para seguir ou compartilhar.
4. **Virada "feito com IA"**: usar ou não. Se usar, a frase padrão é "Esse vídeo foi feito com IA... até a minha voz." (só diga "até a minha voz" se a voz for clone da pessoa; senão, "Esse vídeo foi feito com IA, do roteiro à voz.").

O resto tem padrão e só muda se o usuário quiser:
- `pasta_reels`: `~/reels` (com `todo/`, `done/` e `_referencias/` dentro);
- `ritmo_voz`: `2.9` palavras por segundo até medir o primeiro áudio (Passo 4);
- `cor_destaque`: `#FF6B2C`;
- `python`: `py -X utf8` no Windows, `python3` no Mac e no Linux.

## Passo 3: salvar

Grave exatamente neste formato (as skills leem as linhas `- chave: valor`):

```markdown
# Perfil do criador

- perfil: @seu.perfil
- nicho: <assunto do perfil, em poucas palavras>
- pasta_reels: ~/reels
- voz_elevenlabs: <nome da voz>
- voz_clonada: sim
- ritmo_voz: 2.9
- palavra_comentario: <PALAVRA, ou vazio>
- recompensa_comentario: <o que a pessoa recebe ao comentar>
- virada: Esse vídeo foi feito com IA... até a minha voz.
- fecho: Comenta <PALAVRA> que eu te mando <recompensa>.
- cor_destaque: #FF6B2C
- python: py -X utf8

## Regras do perfil

<regras que o criador for dando ao longo do uso: tom, palavras proibidas, temas que não quer, etc.>
```

Campo sem resposta fica vazio (`- palavra_comentario:`). Crie também as pastas `todo`, `done` e `_referencias` dentro de `pasta_reels`.

## Passo 4: medir o ritmo da voz (depois do primeiro áudio)

Quando existir a primeira `narracao.mp3`, conte as palavras do texto falado (sem as tags) e divida pela duração do áudio em segundos. Grave o resultado com uma casa decimal em `ritmo_voz`. As durações estimadas das outras skills passam a usar esse número.

## Regras novas

Quando o usuário corrigir algo que vale para todos os vídeos dele ("nunca use gíria", "meu público é de Portugal"), ofereça anotar em "Regras do perfil". As outras skills leem essa seção.
