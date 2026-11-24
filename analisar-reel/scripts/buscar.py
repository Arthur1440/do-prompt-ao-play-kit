# Busca por tema e mede cada achado contra a mediana da PRÓPRIA conta (o "100x" do usuário).
#
#   YouTube Shorts: o navegador faz a busca com o filtro Shorts (a busca do yt-dlp não traz Shorts,
#                   só vídeos comuns) e salva os links com views -> --links. Ou, sem navegador,
#                   --hashtag-youtube TAG (página /hashtag/TAG/shorts, direto pelo yt-dlp).
#   TikTok:         a busca do site pede CAPTCHA; o navegador coleta os links da página da hashtag
#                   (tiktok.com/tag/X) -> --links.
#   Instagram:      a busca não mostra views; use catalogo.py conta a conta.
# Raspagens: references/catalogo_no_navegador.md. Busque o tema em pt, en e es (um JSON por língua).
#
# Uso:
#   py -X utf8 -P buscar.py --links <pasta>/yt_motor_v8_pt.json <pasta>/tt_v8engine.json
#   py -X utf8 -P buscar.py --hashtag-youtube v8engine motorv8
#   opções: --contas 12 --catalogo 40 --viral 100 --resultados 60 --saida PASTA
import argparse
import datetime as dt
import json
import os
import re
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # pasta da skill (confiável)
from catalogo import (SAIDA, BASE_MINIMA, conta_da_url, e_viral, fmt, fmt_x, ler_views,  # noqa: E402
                      limpo, plataforma_de, varrer, video_avulso, yt_flat)


FUNDO = 300  # até onde descer no catálogo para achar um vídeo antigo


def vid_id(url):
    m = re.search(r"(?:shorts/|[?&]v=|/video/|/reel/|youtu\.be/)([\w-]+)", url or "")
    return m.group(1) if m else url


def canal_de(plat, conta, canal_url=None):
    if plat == "tiktok":
        return f"https://www.tiktok.com/{conta}"
    base = canal_url or f"https://www.youtube.com/{conta}"
    return base.rstrip("/") + "/shorts"


def do_hashtag_yt(tag, n):
    tag = tag.lstrip("#")
    info = yt_flat(f"https://www.youtube.com/hashtag/{quote(tag)}/shorts", n)
    return [{"url": e.get("url"), "titulo": (e.get("title") or "")[:100], "views": ler_views(e.get("view_count")),
             "conta": None, "plataforma": "youtube", "termo": "#" + tag}
            for e in (info.get("entries") or []) if e]


def do_json(caminho):
    raw = json.load(open(caminho, encoding="utf-8"))
    termo = os.path.splitext(os.path.basename(caminho))[0]
    if isinstance(raw, dict):
        termo = raw.get("termo") or termo
        raw = next((raw[k] for k in ("itens", "links", "videos", "entries") if isinstance(raw.get(k), list)), [])
    out, ig = [], 0
    for e in raw:
        e = {"url": e} if isinstance(e, str) else e
        url = e.get("url") or e.get("href") or ""
        if url and not url.startswith("http"):
            url = ("https://www.youtube.com/shorts/" + url) if re.fullmatch(r"[\w-]{11}", url) else url
        plat = plataforma_de(url)
        if plat == "instagram":
            ig += 1
            continue
        out.append({"url": url, "titulo": (e.get("titulo") or e.get("title") or "")[:100],
                    "views": ler_views(e.get("views")), "conta": e.get("conta") or conta_da_url(url),
                    "plataforma": plat, "termo": e.get("termo") or termo})
    if ig:
        print(f"({ig} links do Instagram ficaram de fora: use catalogo.py conta a conta)", file=sys.stderr)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--links", nargs="*", default=[])
    ap.add_argument("--hashtag-youtube", nargs="*", default=[])
    ap.add_argument("--resultados", type=int, default=60, help="itens por hashtag do YouTube")
    ap.add_argument("--contas", type=int, default=12)
    ap.add_argument("--catalogo", type=int, default=40)
    ap.add_argument("--viral", type=float, default=100.0)
    ap.add_argument("--saida", default=SAIDA)
    a = ap.parse_args()
    if not a.links and not a.hashtag_youtube:
        sys.exit("passe --links ARQUIVO.json [...] e/ou --hashtag-youtube TAG [...]")

    achados = []
    for f in a.links:
        achados += do_json(f)
    for t in a.hashtag_youtube:
        try:
            achados += do_hashtag_yt(t, a.resultados)
        except Exception as e:
            print(f"hashtag '{t}' falhou: {str(e).splitlines()[0][:200]}", file=sys.stderr)

    # uma linha por vídeo (o mesmo vídeo pode vir de duas buscas)
    unicos = {}
    for x in achados:
        k = vid_id(x["url"])
        if k in unicos:
            if x["termo"] not in unicos[k]["termo"]:
                unicos[k]["termo"] += " / " + x["termo"]
            unicos[k]["views"] = unicos[k]["views"] or x["views"]
        else:
            unicos[k] = x
    achados = sorted(unicos.values(), key=lambda x: -(x["views"] or 0))

    # YouTube não diz o autor na URL: descobre só dos maiores, até juntar `contas` contas diferentes
    vistas = {x["conta"] for x in achados if x["conta"]}
    for x in achados:
        if x["conta"] or len(vistas) >= a.contas * 2:
            continue
        try:
            v = video_avulso(x["url"])
            x.update(conta=v["conta"], canal_url=v.get("canal_url"), titulo=x["titulo"] or v["titulo"],
                     views=x["views"] or v["views"])
            vistas.add(x["conta"])
        except Exception:
            pass
    achados = [x for x in achados if x["conta"]]

    contas = {}
    for x in achados:
        contas.setdefault(canal_de(x["plataforma"], x["conta"], x.get("canal_url")), []).append(x)
    ordem = sorted(contas, key=lambda c: -max((v["views"] or 0) for v in contas[c]))[: a.contas]
    print(f"{len(achados)} vídeos de {len(contas)} contas; medindo as {len(ordem)} com o maior vídeo...",
          file=sys.stderr)

    medidos, outros, falhas, resumo = [], [], [], []
    for canal in ordem:
        try:
            cat = varrer(canal, limite=a.catalogo, viral=a.viral, saida=a.saida, avisar=False)[0]
            porid = {vid_id(v["url"]): v for v in (cat.get("validos") or [])}
            # vídeo antigo fora do catálogo recente: desce até 300 para medir contra a base da época dele
            if any(vid_id(x["url"]) not in porid for x in contas[canal]) and len(porid) >= a.catalogo * 0.8:
                cat = varrer(canal, limite=FUNDO, viral=a.viral, saida=a.saida, avisar=False)[0]
                porid = {vid_id(v["url"]): v for v in (cat.get("validos") or [])}
        except Exception as e:
            falhas.append(f"{canal}: {str(e).splitlines()[0][:160]}")
            continue
        resumo.append({"conta": cat["conta"], "plataforma": cat["plataforma"], "mediana": cat.get("mediana_recente"),
                       "virais": cat.get("virais", 0), "seguidores": cat.get("seguidores"),
                       "arquivo": cat.get("arquivo")})
        for x in contas[canal]:
            v = porid.get(vid_id(x["url"]))
            if v:
                x.update(views=v["views"], base=v["base"], x=v["x"], data=v.get("data"), nota="",
                         titulo=x["titulo"] or v["titulo"])
            else:
                if x["views"] is None:
                    try:
                        x["views"] = video_avulso(x["url"])["views"]
                    except Exception:
                        pass
                x["base"] = cat.get("mediana_recente")
                x["x"] = round(x["views"] / x["base"], 2) if (x["views"] and x["base"]) else None
                x["nota"] = f"fora dos {len(porid)} mais recentes: base = mediana atual"
            x["conta"] = cat["conta"]
            medidos.append(x)
        ids = {vid_id(x["url"]) for x in contas[canal]}
        outros += [dict(v, conta=cat["conta"]) for v in cat.get("validos") or []
                   if e_viral(v, a.viral) and vid_id(v["url"]) not in ids]

    medidos.sort(key=lambda x: x.get("x") or 0, reverse=True)
    outros.sort(key=lambda x: x.get("x") or 0, reverse=True)
    termos = ([os.path.splitext(os.path.basename(f))[0] for f in a.links]
              + ["#" + t.lstrip("#") for t in a.hashtag_youtube])
    L = [f"# Busca: {' | '.join(termos)}", "",
         f"- {len(medidos)} vídeos medidos em {len(resumo)} contas | régua: {a.viral:g}x a base da conta "
         f"(base de {fmt(BASE_MINIMA)} views ou mais)",
         f"- Virais na busca: **{sum(1 for x in medidos if e_viral(x, a.viral) and not x.get('nota'))}**"
         f" (+ {sum(1 for x in medidos if e_viral(x, a.viral) and x.get('nota'))} VIRAL? sem a base da época) | "
         f"outros virais dessas contas: **{len(outros)}**", "",
         "## Achados da busca, do que mais rompeu a curva para o que menos", "",
         "| # | x base | views | base | conta | título | link | busca |", "|---|---|---|---|---|---|---|---|"]
    for n, x in enumerate(medidos, 1):
        marca = ((" VIRAL?" if x.get("nota") else " VIRAL") if e_viral(x, a.viral)
                 else (" (conta pequena)" if x.get("x") and (x.get("base") or 0) < BASE_MINIMA else ""))
        nota = f" ({x['nota']})" if x.get("nota") else ""
        L.append(f"| {n} | {fmt_x(x.get('x'))}{marca} | {fmt(x.get('views'))} | {fmt(x.get('base'))} | {x['conta']} "
                 f"| {(x.get('titulo') or '').replace('|', '/')[:60]}{nota} | {x['url']} | {x['termo']} |")
    if outros:
        L += ["", "## Outros virais dessas contas (não vieram na busca)", "",
              "| x base | views | base | conta | título | link |", "|---|---|---|---|---|---|"]
        for x in outros[:25]:
            L.append(f"| {fmt_x(x['x'])} | {fmt(x['views'])} | {fmt(x['base'])} | {x['conta']} "
                     f"| {(x.get('titulo') or '').replace('|', '/')[:60]} | {x['url']} |")
    L += ["", "## Contas", "", "| conta | plataforma | mediana recente | virais no catálogo | seguidores |",
          "|---|---|---|---|---|"]
    for c in sorted(resumo, key=lambda c: -c["virais"]):
        L.append(f"| {c['conta']} | {c['plataforma']} | {fmt(c['mediana'])} | {c['virais']} "
                 f"| {fmt(c['seguidores']) if c['seguidores'] else ''} |")
    if falhas:
        L += ["", "Contas que não deu para varrer: " + "; ".join(falhas)]
    md = "\n".join(L) + "\n"

    os.makedirs(a.saida, exist_ok=True)
    nome = f"{a.saida.rstrip('/')}/busca_{limpo('_'.join(termos))[:50]}_{dt.date.today():%Y%m%d}"
    open(nome + ".md", "w", encoding="utf-8").write(md)
    json.dump({"termos": termos, "viral": a.viral, "achados": medidos, "outros_virais": outros,
               "contas": resumo, "falhas": falhas},
              open(nome + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
    print(md)
    print(f"arquivo: {nome}.md / .json")


if __name__ == "__main__":
    main()
