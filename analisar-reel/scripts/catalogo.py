# Varre o catálogo de uma conta e ranqueia cada vídeo contra a mediana da própria conta.
# Instagram (raspagem do navegador em JSON), TikTok e YouTube (yt-dlp direto).
# Números de views em português, inglês e espanhol ("354 mil", "1.2M", "15,7 M", "2.108", "2,108").
#
# Uso:
#   py -X utf8 -P catalogo.py FONTE [FONTE ...] [--limite 60] [--abas shorts|videos|shorts,videos]
#                              [--viral 100] [--forcar] [--saida PASTA]
# FONTE:
#   https://www.youtube.com/@canal            (sem aba = Shorts; --abas muda)
#   https://www.youtube.com/@canal/videos     (aba explícita)
#   https://www.tiktok.com/@conta
#   <pasta>/grade.json                             (raspagem do navegador: Instagram ou TikTok)
#
# Base de cada vídeo = mediana dos 12 vídeos publicados ANTES dele (sem fixados), ou seja, o que a
# conta fazia quando ele saiu. Os mais antigos do catálogo completam a base com os seguintes.
# Grava catalogo_<plataforma>_<conta>_<aba>_<AAAAMMDD>.json/.md em _referencias/_catalogos.
# Reaproveita uma varredura da mesma conta feita há 3 dias ou menos (--forcar busca de novo).
import argparse
import datetime as dt
import glob
import json
import os
import re
import statistics
import sys
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402
SAIDA = perfil_criador.pasta_reels() + "/_referencias/_catalogos"
VIZINHOS = 12
CACHE_DIAS = 3
BASE_MINIMA = 1000  # conta com base menor que isso: o "x" é ruído (3 views -> 1.800 = 600x)


def e_viral(x, viral, base_minima=BASE_MINIMA):
    return (x.get("x") or 0) >= viral and (x.get("base") or 0) >= base_minima

# ---------------------------------------------------------------- números de views (PT / EN / ES)

_PALAVRAS = re.compile(
    r"\b(views?|visualiza[cç](?:ões|oes|ão|ao)|visualizaciones|reproducciones|reproduções|"
    r"vistas|plays?|visto|vezes|de|seguidores|followers|abonnés)\b", re.I)
_MULT = {
    "": 1,
    "k": 1e3, "mil": 1e3, "mill": 1e6,
    "m": 1e6, "mi": 1e6, "mn": 1e6, "mm": 1e6, "mio": 1e6,
    "million": 1e6, "millions": 1e6, "millon": 1e6, "millón": 1e6, "millones": 1e6,
    "milhão": 1e6, "milhao": 1e6, "milhões": 1e6, "milhoes": 1e6,
    "b": 1e9, "bi": 1e9, "bn": 1e9, "billion": 1e9, "billions": 1e9,
    "bilhão": 1e9, "bilhao": 1e9, "bilhões": 1e9, "bilhoes": 1e9,
    "milm": 1e9, "milmillones": 1e9,  # espanhol: "1,2 mil M" = mil milhões
}


def ler_views(v):
    """22400, '22,400', '2.108', '22.4K', '354 mil', '15,7mi', '1,2 M', '3 mil M' -> int, senão None."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v) if v > 0 else None
    s = _PALAVRAS.sub("", str(v)).lower()
    s = s.replace("\u00a0", " ").replace("\u202f", " ").replace("\u2009", " ").strip()
    m = re.match(r"^(\d(?:[\d.,\s]*\d)?)\s*([a-zçãõóé.\s]*)$", s)
    if not m:
        return None
    num, suf = m.group(1), re.sub(r"[\s.]", "", m.group(2))
    if suf not in _MULT:
        return None
    mult = _MULT[suf]
    if mult == 1:
        # sem sufixo: separador é de milhar ("2.108", "2,108", "1 234 567") ou número puro
        if re.fullmatch(r"\d{1,3}(?:[.,\s]\d{3})+", num) or num.isdigit():
            n = int(re.sub(r"\D", "", num))
            return n or None
        return None
    # com sufixo: o último separador é a vírgula/ponto decimal ("1.2M", "15,7 mi")
    num = re.sub(r"\s", "", num)
    pos = max(num.rfind(","), num.rfind("."))
    if pos >= 0:
        num = re.sub(r"[.,]", "", num[:pos]) + "." + num[pos + 1:]
    try:
        n = int(round(float(num) * mult))
    except ValueError:
        return None
    return n or None


def fmt(n):
    if n is None:
        return "n/d"
    for corte, suf in ((1e9, " bi"), (1e6, " mi"), (1e3, " mil")):
        if n >= corte:
            x = n / corte
            return (f"{x:.1f}".rstrip("0").rstrip(".") if x < 100 else f"{x:.0f}").replace(".", ",") + suf
    return str(int(n))


def fmt_x(x):
    if x is None:
        return "n/d"
    return (f"{x:.1f}" if x < 10 else f"{x:.0f}").replace(".", ",") + "x"


# ---------------------------------------------------------------- de onde vem a lista

def plataforma_de(url):
    h = (urlparse(url).netloc or "").lower()
    if "tiktok" in h:
        return "tiktok"
    if "youtu" in h:
        return "youtube"
    if "instagram" in h:
        return "instagram"
    return "outra"


def conta_da_url(url):
    p = urlparse(url).path.strip("/").split("/")
    for parte in p:
        if parte.startswith("@"):
            return parte
    if "instagram" in url and p and p[0] not in ("reel", "p", "reels"):
        return "@" + p[0]
    return None


def limpo(s):
    s = re.sub(r"[^\w.-]+", "_", str(s or "sem_conta"), flags=re.UNICODE).strip("_")
    return s[:40] or "sem_conta"


class _Mudo:  # o erro volta na exceção; sem isto o yt-dlp também imprime "ERROR:" no terminal
    def debug(self, m): pass
    def info(self, m): pass
    def warning(self, m): pass
    def error(self, m): pass


def yt_flat(url, limite):
    import yt_dlp
    opts = {"extract_flat": "in_playlist", "playlistend": limite, "quiet": True,
            "no_warnings": True, "skip_download": True, "logger": _Mudo()}
    with yt_dlp.YoutubeDL(opts) as y:
        return y.extract_info(url, download=False)


def video_avulso(url):
    """Views e dados de um vídeo só (quando ele não está no catálogo recente)."""
    import yt_dlp
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as y:
        i = y.extract_info(url, download=False)
    return {"url": url, "titulo": (i.get("title") or "")[:100], "views": ler_views(i.get("view_count")),
            "ts": i.get("timestamp"), "duracao": i.get("duration"),
            "conta": "@" + (i.get("uploader_id") or i.get("uploader") or "").lstrip("@"),
            "canal_url": i.get("uploader_url") or i.get("channel_url")}


def abas_youtube(url, abas):
    path = urlparse(url).path.rstrip("/")
    if re.search(r"/(shorts|videos|streams)$", path):
        return [url]
    base = url.rstrip("/")
    return [f"{base}/{a}" for a in abas]


def listar_url(url, limite):
    """Uma fonte -> lista de catálogos (um por aba no YouTube)."""
    plat = plataforma_de(url)
    if plat == "instagram":
        sys.exit("Instagram não lista sem login: raspe a grade no navegador (references/catalogo_no_navegador.md)"
                 " e passe o JSON.")
    try:
        info = yt_flat(url, limite)
    except Exception as e:
        msg = str(e).splitlines()[0].replace("ERROR: ", "")[:300]
        if "does not have a" in msg:
            raise RuntimeError(f"o canal não tem a aba {url.rstrip('/').rsplit('/', 1)[-1]}")
        dica = (" | TikTok: atualize com `python -m pip install -U yt-dlp`; se continuar, raspe o perfil no navegador"
                if plat == "tiktok" else " | atualize com `python -m pip install -U yt-dlp`")
        raise RuntimeError(msg + dica)
    itens = []
    for i, e in enumerate([x for x in (info.get("entries") or []) if x]):
        itens.append({
            "url": e.get("url") or e.get("webpage_url") or "",
            "titulo": (e.get("title") or "")[:100],
            "views": ler_views(e.get("view_count")),
            "ts": e.get("timestamp"),
            "duracao": e.get("duration"),
            "fixado": False,
            "ordem": i,
        })
    conta = (info.get("uploader_id") or info.get("channel") or info.get("uploader") or conta_da_url(url) or "")
    conta = "@" + conta.lstrip("@") if conta else conta_da_url(url)
    if plat == "tiktok" and itens and not conta:
        conta = conta_da_url(itens[0]["url"])
    return {
        "plataforma": plat, "conta": conta, "fonte": url,
        "aba": (urlparse(url).path.rstrip("/").rsplit("/", 1)[-1] if plat == "youtube" else "videos"),
        "seguidores": info.get("channel_follower_count"),
        "itens": itens,
    }


def listar_json(caminho):
    raw = json.load(open(caminho, encoding="utf-8"))
    meta = {}
    if isinstance(raw, dict):
        meta = raw
        for k in ("itens", "entries", "reels", "videos", "links", "items"):
            if isinstance(raw.get(k), list):
                raw = raw[k]
                break
    itens = []
    for i, e in enumerate(raw):
        if isinstance(e, str):
            e = {"url": e}
        url = e.get("url") or e.get("href") or ""
        if url.startswith("/"):
            url = "https://www.instagram.com" + url
        itens.append({
            "url": url,
            "titulo": (e.get("titulo") or e.get("title") or e.get("legenda") or "")[:100],
            "views": ler_views(e.get("views")),
            "views_bruto": e.get("views"),
            "ts": e.get("ts"),
            "duracao": e.get("duracao"),
            "fixado": bool(e.get("fixado") or e.get("pinned")),
            "ordem": e.get("ordem", i),
        })
    url0 = next((x["url"] for x in itens if x["url"]), "")
    plat = meta.get("plataforma") or plataforma_de(url0)
    conta = meta.get("conta") or conta_da_url(url0) or os.path.splitext(os.path.basename(caminho))[0]
    return {"plataforma": plat, "conta": "@" + conta.lstrip("@"), "fonte": caminho, "aba": "reels"
            if plat == "instagram" else "videos", "seguidores": ler_views(meta.get("seguidores")), "itens": itens}


# ---------------------------------------------------------------- conta

def calcular(cat, viral):
    itens = cat["itens"]
    if any(x.get("ts") for x in itens):
        itens.sort(key=lambda x: (x.get("ts") or 0), reverse=True)  # mais novo primeiro
    else:
        itens.sort(key=lambda x: x["ordem"])
    validos = [x for x in itens if x["views"]]
    sem = [x for x in itens if not x["views"]]
    cat["descartados"] = [{"url": x["url"], "motivo": f"sem views ({x.get('views_bruto')!r})"} for x in sem]
    if len(validos) < 5:
        cat.update(validos=[], mediana_recente=None, mediana_catalogo=None,
                   aviso=f"só {len(validos)} vídeos com views: pouco para uma base")
        return cat

    agora = dt.datetime.now().timestamp()
    for x in validos:  # com menos de 48 h o vídeo ainda está subindo: fica fora da base e do piso
        x["novo"] = bool(x.get("ts") and agora - x["ts"] < 48 * 3600)
    base_pool = [i for i, x in enumerate(validos) if not x["fixado"] and not x["novo"]]
    for i, x in enumerate(validos):
        antes = [j for j in base_pool if j > i][:VIZINHOS]            # publicados antes dele
        if len(antes) < VIZINHOS:
            depois = [j for j in reversed(base_pool) if j < i][: VIZINHOS - len(antes)]
            antes += depois
        vals = [validos[j]["views"] for j in antes]
        x["base"] = statistics.median(vals) if vals else None
        x["x"] = round(x["views"] / x["base"], 2) if x["base"] else None
        x["data"] = dt.datetime.fromtimestamp(x["ts"]).strftime("%d/%m/%Y") if x.get("ts") else None

    recentes = [validos[j]["views"] for j in base_pool][:VIZINHOS]
    cat["mediana_recente"] = statistics.median(recentes)
    cat["mediana_catalogo"] = statistics.median(x["views"] for x in validos)
    cat["validos"] = validos
    cat["virais"] = sum(1 for x in validos if e_viral(x, viral))

    # grade que não carregou: números minúsculos (curtidas, rótulo vazio) puxam a mediana para baixo
    lixo = [x for x in validos if x["views"] < cat["mediana_catalogo"] / 100]
    cat["aviso"] = (f"{len(lixo)} de {len(validos)} vídeos com menos de 1% da mediana: a grade pode não ter "
                    f"carregado; role e raspe de novo antes de confiar" if len(lixo) >= max(3, len(validos) // 5)
                    else None)
    return cat


def markdown(cat, viral, top=15):
    v = cat.get("validos") or []
    L = [f"# Catálogo {cat['conta']} ({cat['plataforma']}, {cat['aba']})", "",
         f"- Fonte: {cat['fonte']} | varrido em {cat.get('varrido_em')}",
         f"- {len(v)} vídeos com views, {len(cat.get('descartados') or [])} descartados"
         + (f" | {fmt(cat['seguidores'])} seguidores" if cat.get("seguidores") else ""),
         f"- Mediana dos {VIZINHOS} mais recentes (sem fixados): **{fmt(cat.get('mediana_recente'))}**"
         f" | mediana do catálogo: {fmt(cat.get('mediana_catalogo'))}",
         f"- Virais (>= {viral:g}x a base, base de {fmt(BASE_MINIMA)} views ou mais): **{cat.get('virais', 0)}**"]
    if cat.get("mediana_recente") is not None and cat["mediana_recente"] < BASE_MINIMA:
        L.append(f"- Conta pequena (mediana abaixo de {fmt(BASE_MINIMA)}): o multiplicador aqui é ruído")
    if cat.get("aviso"):
        L.append(f"- ATENÇÃO: {cat['aviso']}")
    if not v:
        return "\n".join(L) + "\n"
    rank = sorted(v, key=lambda x: x["x"] or 0, reverse=True)
    mostrar = [x for x in rank if e_viral(x, viral)]
    mostrar += [x for x in rank if x not in mostrar][: max(0, top - len(mostrar))]
    L += ["", "## Os que mais romperam a curva da conta", "",
          "| # | views | x base | base | data | dur. | título | link |", "|---|---|---|---|---|---|---|---|"]
    for n, x in enumerate(mostrar, 1):
        marca = " VIRAL" if e_viral(x, viral) else ""
        tit = (x["titulo"] or "").replace("|", "/")[:70] + (" (fixado)" if x["fixado"] else "")
        L.append(f"| {n} | {fmt(x['views'])} | {fmt_x(x['x'])}{marca} | {fmt(x['base'])} | {x.get('data') or ''} "
                 f"| {x['duracao'] or ''} | {tit} | {x['url']} |")
    novos = [x for x in v if x.get("novo")]
    if novos:
        L += ["", f"Postados há menos de 48 h (ainda subindo, fora da base e do piso): "
              + ", ".join(f"{fmt(x['views'])} {x['url']}" for x in novos)]
    piso = sorted([x for x in v if (x["x"] or 9) <= 0.2 and not x.get("novo")], key=lambda x: x["x"])
    if piso:
        L += ["", f"## Piso: {len(piso)} vídeos a 0,2x da base ou menos (o que o público ignora)", "",
              "| views | x base | título | link |", "|---|---|---|---|"]
        for x in piso[:8]:
            L.append(f"| {fmt(x['views'])} | {fmt_x(x['x'])} | {(x['titulo'] or '').replace('|', '/')[:70]} "
                     f"| {x['url']} |")
    if cat.get("descartados"):
        L += ["", "Descartados: " + "; ".join(f"{d['url'] or '?'} ({d['motivo']})"
                                              for d in cat["descartados"][:10])]
    return "\n".join(L) + "\n"


def nome_arquivo(cat):
    return f"catalogo_{cat['plataforma']}_{limpo(cat['conta'])}_{limpo(cat['aba'])}"


def cache(plat, conta, aba, limite, saida):
    if not conta:
        return None
    pad = os.path.join(saida, f"catalogo_{plat}_{limpo(conta)}_{limpo(aba)}_*.json")
    for f in sorted(glob.glob(pad), reverse=True):
        d = json.load(open(f, encoding="utf-8"))
        quando = dt.datetime.strptime(d.get("varrido_em", "20000101")[:8], "%Y%m%d")
        if (dt.datetime.now() - quando).days <= CACHE_DIAS and d.get("limite", 0) >= limite:
            d["_cache"] = f.replace("\\", "/")
            return d
    return None


def gravar(cat, saida):
    os.makedirs(saida, exist_ok=True)
    base = f"{saida.rstrip('/')}/{nome_arquivo(cat)}_{cat['varrido_em'][:8]}"
    json.dump(cat, open(base + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(base + ".md", "w", encoding="utf-8").write(markdown(cat, cat["viral"]))
    return base


def varrer(fonte, limite=60, abas=("shorts",), viral=100.0, forcar=False, saida=SAIDA, avisar=True):
    """Devolve a lista de catálogos calculados (um por aba). Usada também pelo buscar.py."""
    out = []
    if fonte.lower().endswith(".json") and os.path.exists(fonte):
        cats = [listar_json(fonte)]
    else:
        urls = abas_youtube(fonte, abas) if plataforma_de(fonte) == "youtube" else [fonte]
        cats = []
        for u in urls:
            plat = plataforma_de(u)
            aba = urlparse(u).path.rstrip("/").rsplit("/", 1)[-1] if plat == "youtube" else "videos"
            c = None if forcar else cache(plat, conta_da_url(u), aba, limite, saida)
            if c:
                c["viral"] = viral
                calcular(c, viral)
                if avisar:
                    print(f"(usando a varredura de {c['varrido_em'][:8]}: {c['_cache']}; --forcar busca de novo)",
                          file=sys.stderr)
                out.append(c)
                continue
            cats.append(listar_url(u, limite))
    for c in cats:
        c["varrido_em"] = dt.datetime.now().strftime("%Y%m%d_%H%M")
        c["limite"] = limite
        c["viral"] = viral
        calcular(c, viral)
        c["arquivo"] = gravar(c, saida)
        out.append(c)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fontes", nargs="+")
    ap.add_argument("--limite", type=int, default=60)
    ap.add_argument("--abas", default="shorts")
    ap.add_argument("--viral", type=float, default=100.0)
    ap.add_argument("--forcar", action="store_true")
    ap.add_argument("--saida", default=SAIDA)
    a = ap.parse_args()
    erro = False
    for f in a.fontes:
        try:
            for c in varrer(f, a.limite, tuple(a.abas.split(",")), a.viral, a.forcar, a.saida):
                print(markdown(c, a.viral))
                if c.get("arquivo"):
                    print(f"arquivo: {c['arquivo']}.md / .json\n")
        except Exception as e:
            erro = True
            print(f"# {f}\nERRO: {e}\n")
    sys.exit(1 if erro else 0)


if __name__ == "__main__":
    main()
