# Raspagens no navegador embutido (Instagram, YouTube, TikTok)

O que o yt-dlp não lista, o navegador do Claude lê (o navegador embutido do app, ferramentas `mcp__Claude_Browser__*`, ou o Claude in Chrome, `mcp__claude-in-chrome__*`). Cada trecho roda no `javascript_tool` e devolve um JSON numa linha: grave-o com a ferramenta Write num arquivo dentro de `<pasta_reels>/_referencias/_catalogos/raspagens/` (`ig_<conta>.json`, `yt_<tema>_<lingua>.json`, `tt_<hashtag>.json`) e passe o arquivo para `catalogo.py` (uma conta) ou `buscar.py` (uma busca).

Os números podem vir em qualquer língua da interface ("607 mil", "2,6 mi", "1.2M", "354K", "15,7 M", "2,108"): o `catalogo.py` lê todas. Não precisa trocar a língua do site.

Regras de sempre: é só leitura. Não clique em seguir, curtir, comentar, enviar mensagem nem aceitar nada. **Nunca resolva CAPTCHA, quebra-cabeça ou "arraste o controle"**: se aparecer, pare e peça ao usuário que resolva ele mesmo no painel (ou que faça login lá) e só depois continue. Nunca digite senha.

## Instagram: grade de reels de uma conta

1. `navigate` para `https://www.instagram.com/<conta>/reels/`.
2. Logo depois, `computer {action: "screenshot", scale: 0.1}` (painel escondido não desenha a grade) e outro em 0.4 depois de 3 s.
3. Rode (testado em 24/11/2026 com @8bit_sciences: 39 reels em 10 voltas):

```js
const acc = {};
for (let i = 0; i < 10; i++) {
  [...document.querySelectorAll('a[href*="/reel/"]')].forEach(a => {
    const code = a.getAttribute('href').split('/reel/')[1].split('/')[0];
    if (acc[code]?.views) return;
    acc[code] = {url: 'https://www.instagram.com/reel/' + code + '/',
      views: a.innerText.trim().split('\n')[0],
      // fixado em pt ("Fixado"), en ("Pinned") e es ("Fijado")
      fixado: !!a.querySelector('svg[aria-label*="ixad"], svg[aria-label*="inned"], svg[aria-label*="ijad"]'),
      ordem: acc[code]?.ordem ?? Object.keys(acc).length};
  });
  window.scrollBy(0, 700); await new Promise(r => setTimeout(r, 1500));
}
const conta = location.pathname.split('/')[1];
const seg = (document.querySelector('meta[name=description]')?.content || '').split(/[,·]/)[0];
JSON.stringify({plataforma: 'instagram', conta, seguidores: seg,
  itens: Object.values(acc).sort((a, b) => a.ordem - b.ordem).map(({url, views, fixado}) => ({url, views, fixado}))})
```

Mais voltas (`i < 20`) trazem mais reels. Se o laço parar sempre nos mesmos 12, o `window.scrollBy` não está movendo a grade: use `computer` → `scroll` para baixo (10 ticks, duas vezes) entre as leituras.

Busca por tema no Instagram não mostra views: para achar virais de um tema no Instagram, liste as contas do tema (ou peça ao usuário) e rode o catálogo de cada uma.

## YouTube: busca de Shorts por tema

A busca do yt-dlp (`ytsearch`) não traz Shorts, só vídeos comuns. Use o filtro Shorts do site:

1. `navigate` para `https://www.youtube.com/results?search_query=<termo com +>&sp=EgIQCQ%253D%253D`.
2. Se a página abrir em "Tudo", clique no chip **Shorts** do topo.
3. Rode (testado em 24/11/2026 com "como funciona motor v8": ~270 Shorts em 8 voltas). Ele devolve só o ID e as views para não pesar; o título e o canal o `buscar.py` busca depois:

```js
const acc = {};
for (let i = 0; i < 6; i++) {
  document.querySelectorAll('a[href*="/shorts/"]').forEach(a => {
    const id = (a.getAttribute('href').split('/shorts/')[1] || '').split(/[?&/]/)[0];
    if (!id || acc[id]?.views) return;
    let el = a, txt = '';
    for (let k = 0; k < 6 && el; k++) { el = el.parentElement; txt = el ? el.innerText : '';
      if (/\d/.test(txt) && txt.split('\n').length >= 2) break; }
    const l = txt.split('\n').map(s => s.trim()).filter(Boolean);
    acc[id] = {url: id, views: l.find((s, j) => j > 0 && /\d/.test(s)) || ''};
  });
  window.scrollBy(0, 1500); await new Promise(r => setTimeout(r, 1500));
}
JSON.stringify({termo: new URLSearchParams(location.search).get('search_query'), itens: Object.values(acc)})
```

Faça uma busca por língua (o mesmo tema escrito em pt, en e es) e grave um JSON para cada. Sem navegador: `buscar.py --hashtag-youtube <tag>` lê a página `/hashtag/<tag>/shorts` direto.

## TikTok

**Perfil de uma conta**: não precisa de navegador, o `catalogo.py https://www.tiktok.com/@conta` lê pelo yt-dlp (traz data de cada vídeo). Se falhar, primeiro `python -m pip install -U yt-dlp` (o TikTok quebra o yt-dlp com frequência; a versão de 26/10/2026 falhava e a de 23/11/2026 funcionou).

**Busca por tema**: a busca do site (`/search/video?q=`) pede quebra-cabeça para quem não está logado. A página da hashtag abre sem ele na primeira visita e traz o link e o autor de cada vídeo (sem views; o `buscar.py` mede pelo perfil de cada autor):

1. `navigate` para `https://www.tiktok.com/tag/<hashtag sem #>` e espere 4 s.
2. Se aparecer "Entrar no TikTok" com quebra-cabeça, pare e peça ao usuário para resolver ou fazer login no painel.
3. Rode (testado em 24/11/2026 com #v8engine: 60 links):

```js
const acc = {};
for (let i = 0; i < 5; i++) {
  document.querySelectorAll('a[href*="/video/"]').forEach(a => {
    const url = a.href.split('?')[0];
    acc[url] = {url};
  });
  window.scrollBy(0, 1500); await new Promise(r => setTimeout(r, 2000));
}
JSON.stringify({termo: '#' + location.pathname.split('/tag/')[1] + ' (TikTok)', itens: Object.values(acc)})
```

Raspe uma hashtag por língua (por exemplo #motorv8 para pt e es, #v8engine para en) e grave um JSON para cada.
