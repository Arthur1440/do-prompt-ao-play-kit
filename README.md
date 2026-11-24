# Kit de skills do curso Do Prompt ao Play

As skills que o curso usa para sair de um reel de referência até o prompt de produção do vídeo. Uso exclusivo dos alunos do curso.

| Skill | O que faz |
|---|---|
| `perfil-criador` | Cria o seu perfil (`~/.claude/perfil-criador.md`): @, nicho, voz do ElevenLabs, palavra do "Comenta ___", virada "feito com IA", pasta dos reels. **Todas as outras leem esse arquivo.** |
| `analisar-reel` | Acha os virais (varre uma conta do Instagram, TikTok ou YouTube e busca um tema em português, inglês e espanhol, medindo cada vídeo contra a média da própria conta); baixa, transcreve e desmonta o reel de referência e entrega a ficha do formato e a receita para fazer igual. |
| `roteiro-viral` | Vários links de uma vez → uma narração nova (ou fiel) para cada um. |
| `narracao-do-molde` | Uma ficha de referência → uma narração nova no mesmo molde, com fatos conferidos. |
| `narracao-elevenlabs` | Roteiro → texto pronto para colar no ElevenLabs, com tags, pausas, frase de teste e o que ouvir. |
| `checar-viral` | Nota de 0 a 100 da narração antes de produzir ou postar. |
| `prompt-do-molde` | Narração → `PROMPT_PRODUCAO.txt` com 3 direções visuais e prévia de 10 s de cada. |
| `produzir-reel` | `/produzir-reel <tema>`: lê o `PROMPT_PRODUCAO.txt` da pasta (sem colar nada), confere a pasta, faz as 3 prévias, espera a escolha e produz o vídeo. |
| `catalogo-estilos` | Receitas, quadros e código dos estilos visuais (maquete tilt-shift, toon 3D, fliperama, fotorreal...). |

## Instalar

Cada pasta é uma skill e vai inteira para `~/.claude/skills/` (no Windows, `C:\Users\<seu usuário>\.claude\skills\`). Na aula 3, o prompt de instalação faz isso por você. Para fazer à mão:

```bash
git clone https://github.com/Arthur1440/do-prompt-ao-play-kit.git
cp -r do-prompt-ao-play-kit/*/ ~/.claude/skills/
```

Depois, abra o Claude Code e peça: **"configura meu perfil de criador"**. A skill `perfil-criador` faz as perguntas e salva o arquivo.

O que as skills precisam no computador (o prompt 1 da aula 3 instala): Python 3.11+, `ffmpeg`, `yt-dlp`, `faster-whisper`, `opencv-python`, `numpy`, `Pillow`, Node.js 20+ (para Remotion e Three.js).

## Atualizar

```bash
cd do-prompt-ao-play-kit && git pull && cp -r */ ~/.claude/skills/
```

O seu perfil fica fora das pastas das skills, então atualizar não apaga nada seu.

## Montar o zip do kit (para a área de downloads da plataforma)

```bash
git archive --format=zip -o kit-skills-do-prompt-ao-play.zip HEAD -- perfil-criador analisar-reel roteiro-viral narracao-do-molde narracao-elevenlabs checar-viral prompt-do-molde produzir-reel catalogo-estilos
```

O zip abre uma pasta por skill, pronta para ir para `~/.claude/skills/`.

## De onde vêm os exemplos

Os quadros, o código em `catalogo-estilos/codigo/` e o placar do `checar-viral` vêm de reels reais da conta de referência do curso. Neles aparece o pedido dessa conta ("Comenta PLAY", "Do Prompt ao Play") e `seu.perfil` no lugar do @. No seu vídeo, as skills usam o que está no seu perfil.

## Para quem mantém o kit

- Os scripts em Python leem o perfil por `scripts/perfil.py`. O arquivo é igual em todas as skills: mudou um, copie para os outros.
- Nada pessoal entra aqui: nenhum caminho `C:\Users\<nome>`, e-mail, chave, nome de voz ou @ de pessoa real. Antes de cada commit:

```bash
grep -rnE "C:[/\\\\]Users[/\\\\][A-Za-z]|@[a-z0-9_.]+\.(ia|br)\b|sk-[A-Za-z0-9]{10}" --exclude-dir=.git .
```
