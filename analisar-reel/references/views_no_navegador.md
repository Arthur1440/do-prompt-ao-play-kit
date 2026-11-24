# Views do reel e mediana da conta no navegador embutido

O yt-dlp não traz views do Instagram. O navegador embutido (ferramentas `mcp__Claude_Browser__*`) costuma estar logado na conta do usuário. Caminho testado:

1. `navigate` para `https://www.instagram.com/<conta>/reels/`.
2. **Painel escondido não desenha a grade**: faça `computer {action: "screenshot", scale: 0.1}` logo depois de abrir. Sem isso o DOM fica vazio.
3. Se a primeira leitura vier vazia, tire outro screenshot (escala 0.5) e só então rode no `javascript_tool`. A grade é virtualizada: o laço rola e acumula (testado em 16/11/2026, trouxe 15 reels):

```js
const acc = {};
for (let i = 0; i < 8; i++) {
  [...document.querySelectorAll('a[href*="/reel/"]')].forEach(a => {
    const code = a.getAttribute('href').split('/reel/')[1].split('/')[0];
    acc[code] = {views: a.innerText.trim().split('\n')[0],
      fixado: !!a.querySelector('svg[aria-label*="ixad"], svg[aria-label*="inned"]'),
      ordem: acc[code]?.ordem ?? Object.keys(acc).length};
  });
  window.scrollBy(0, 500); await new Promise(r => setTimeout(r, 1500));
}
Object.entries(acc).sort((a,b)=>a[1].ordem-b[1].ordem)
  .map(([c,v])=>`${v.ordem} ${c} ${v.views}${v.fixado?' FIXADO':''}`).join('\n')
```

   Se o reel procurado não aparecer e o laço parar sempre nos mesmos 12 (aconteceu em 17/11/2026 com @omundaoensina e @mundoexplicadobr), o `window.scrollBy` não está movendo a grade: use `computer` → `scroll` para baixo (10 ticks, duas vezes) e leia os `a[href*="/reel/"]` de novo.
4. Converta "15,7mi" = 15.700.000, "354mil" = 354.000, "2.108" = 2108.
5. Mediana: os ~12 reels mais recentes, **tirando os fixados** (os 3 primeiros podem ser) e os collabs de outra conta. Multiplicador = views do reel ÷ mediana. Conta nova que explodiu na última semana (vários reels recentes em milhões e os antigos em dezenas de mil) puxa a mediana para cima: dê o multiplicador pela regra e, ao lado, contra a mediana dos reels de antes da explosão, dizendo qual é qual.
6. Seguidores: `meta[name=description]` da página do perfil.

Grave no `meta.json` do reel: `"views"`, `"mediana_conta"`, `"multiplicador"`, `"seguidores"`.

Se o reel analisado não aparecer na grade (muito antigo), abra `https://www.instagram.com/reel/<code>/` e procure as views no texto da página; se não houver, diga que ficou sem o número.

Não clique em nada que siga, curta, comente ou envie mensagem. É só leitura.
