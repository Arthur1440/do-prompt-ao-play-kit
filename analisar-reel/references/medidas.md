# Como ler as medidas do analisar.py (e onde elas erram)

## Fala
- `palavras_por_min`: conta entre a 1ª e a última palavra. Referências: 150 = calmo, 180-200 = narração de reel comum, 210+ = acelerado (o @desmontandoomundo fica em ~214).
- `primeira_palavra_s`: acima de 0,5 s, o vídeo abre com imagem ou som antes da voz. Vale anotar o que segura esse silêncio.
- `gancho_0a3s`: as palavras que caem nos 3 primeiros segundos. É o gancho falado.
- `fala_cobre_pct`: abaixo de ~60% o vídeo respira (pausas, música, efeitos); acima de 85% é fala o tempo todo.
- `palavras_baixa_confianca`: o Whisper erra nomes próprios, marcas e gírias. Confira essas palavras na folha de contato (a legenda na tela costuma mostrar a grafia certa) antes de citar.

## Ritmo
- Corte detectado por salto de histograma de cor + salto de pixels entre quadros. Pega cortes secos muito bem.
- **Erra**: dissolve e fade (pode não marcar ou marcar no meio), whip pan e flash branco (pode marcar corte a mais), troca de cena com a mesma cor (pode não marcar). Ao ler a folha, se dois planos seguidos forem o mesmo enquadramento, foi corte falso; se um plano mostrar duas cenas, faltou corte.
- `tipo_mov` (diferença média entre quadros): parado < 0,15%, lento < 0,8% (push-in, câmera respirando), médio < 2,5% (personagem agindo, câmera andando), intenso acima (sacudida, whip, partículas).
- `cortes_por_trecho_10s`: mostra onde o vídeo acelera. Comum: rápido no gancho, mais lento na explicação, rápido de novo no clímax.

## Áudio
- `lufs_integrado`: Reels costuma ficar entre -16 e -12. Abaixo de -18 o vídeo é baixo.
- `fundo`: compara o volume dos intervalos sem fala. "silêncio nos intervalos" = sem trilha contínua (só voz e efeitos). Com fala o tempo todo não dá para medir: ouça um trecho com `ffplay` ou olhe `db_por_segundo`.
- `bpm_estimado` e `cortes_na_batida_pct`: só fazem sentido se houver trilha. Sem trilha, o BPM sai da cadência da fala e o número não quer dizer nada. Com trilha, acima de ~60% de cortes na batida = montagem feita no tempo da música.
- `picos_de_som_s`: segundos com ataque forte (impacto, whoosh, batida). Cruze com a folha para achar os efeitos sonoros.

## Paleta
K-means em 24 quadros espalhados. Os 2-3 primeiros hex são as cores de fundo; cores com 2-5% costumam ser o destaque (legenda, personagem).

## Meta
- `curtidas` e `comentarios` vêm do yt-dlp. A razão comentários/curtidas alta (acima de ~2%) sugere que o vídeo provoca conversa.
- `amostra_comentarios`: só ~10-15 comentários, sem ordem de relevância. Para o motor de comentário, abra o post no navegador e leia os mais curtidos.
