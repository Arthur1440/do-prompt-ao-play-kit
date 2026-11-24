# Baixa reels (Instagram, TikTok, Shorts) com yt-dlp, um por pasta.
# Cada pasta: video.mp4, video.info.json, capa.jpg, meta.json
# Uso: py -X utf8 -P baixar.py URL [URL ...] [--saida <pasta_reels>/_referencias]
#        [--cookies-navegador firefox|chrome|edge]   (só com o ok do usuário)
import argparse
import datetime as dt
import glob
import json
import os
import re
import shutil
import subprocess
import sys

import yt_dlp

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402
BASE = perfil_criador.pasta_reels() + "/_referencias"


def limpo(s):
    s = re.sub(r"[^\w.-]+", "_", str(s or "sem_conta"), flags=re.UNICODE).strip("_")
    return s[:40] or "sem_conta"


def duracao(v):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", v], capture_output=True, text=True).stdout
        return round(float(out.strip()), 2)
    except Exception:
        return None


def baixar(url, base, cookies):
    hoje = dt.date.today().strftime("%Y%m%d")
    tmp = os.path.join(base, "_baixando")
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp, exist_ok=True)
    opts = {
        "outtmpl": os.path.join(tmp, "%(id)s.%(ext)s"),
        "noplaylist": False,
        "writeinfojson": True,
        "writethumbnail": True,
        "merge_output_format": "mp4",
        "format": "bv*+ba/b",
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    if cookies:
        opts["cookiesfrombrowser"] = (cookies,)
    with yt_dlp.YoutubeDL(opts) as y:
        info = y.extract_info(url, download=True)

    itens = info.get("entries") or [info]
    pastas = []
    for i, it in enumerate([x for x in itens if x], 1):
        conta = it.get("channel") or it.get("uploader_id") or it.get("uploader")
        vid = it.get("id")
        nome = f"{hoje}_{limpo(conta)}_{limpo(vid)}"
        destino = os.path.join(base, nome)
        os.makedirs(destino, exist_ok=True)
        for f in glob.glob(os.path.join(tmp, f"{glob.escape(vid)}.*")):
            ext = f[len(os.path.join(tmp, vid)):]
            alvo = {".mp4": "video.mp4", ".info.json": "video.info.json"}.get(ext)
            if not alvo and ext.lower() in (".jpg", ".jpeg", ".webp", ".png"):
                alvo = "capa" + ext.lower()
            if alvo:
                shutil.move(f, os.path.join(destino, alvo))
        v = os.path.join(destino, "video.mp4")
        comentarios = [{"texto": c.get("text"), "curtidas": c.get("like_count"), "autor": c.get("author")}
                       for c in (it.get("comments") or [])]
        ts = it.get("timestamp")
        meta = {
            "url": it.get("webpage_url") or url,
            "plataforma": it.get("extractor_key"),
            "conta": conta,
            "nome_exibido": it.get("uploader"),
            "id": vid,
            "legenda": it.get("description"),
            "postado_em": dt.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M") if ts else it.get("upload_date"),
            "views": it.get("view_count"),
            "curtidas": it.get("like_count"),
            "comentarios": it.get("comment_count"),
            "duracao_s": duracao(v) if os.path.exists(v) else it.get("duration"),
            "resolucao": f"{it.get('width')}x{it.get('height')}",
            "musica": " - ".join(x for x in [it.get("artist"), it.get("track")] if x) or None,
            "amostra_comentarios": comentarios[:15],
            "baixado_em": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
        with open(os.path.join(destino, "meta.json"), "w", encoding="utf-8") as fh:
            json.dump(meta, fh, ensure_ascii=False, indent=2)
        pastas.append(destino)
        print(f"OK  {destino}")
        print(f"    @{conta} | {meta['duracao_s']} s | curtidas {meta['curtidas']} | coment. {meta['comentarios']}"
              f" | views {meta['views'] if meta['views'] is not None else 'n/d (ler no navegador)'}")
    shutil.rmtree(tmp, ignore_errors=True)
    return pastas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="+")
    ap.add_argument("--saida", default=BASE)
    ap.add_argument("--cookies-navegador", default=None)
    a = ap.parse_args()
    os.makedirs(a.saida, exist_ok=True)
    falhas = 0
    for u in a.urls:
        try:
            baixar(u, a.saida, a.cookies_navegador)
        except Exception as e:
            falhas += 1
            msg = str(e)
            print(f"ERRO {u}\n    {msg[:400]}")
            if re.search(r"login|logged|rate.?limit|cookies|private|401|403", msg, re.I):
                print("    -> o Instagram pediu login. Ver 'Quando o download falha' no SKILL.md.")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
