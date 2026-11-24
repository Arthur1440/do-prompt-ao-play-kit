# Baixa e mede um lote de reels de referência, um por vez (dois Whispers juntos estouram a RAM).
# Reaproveita os scripts da skill analisar-reel.
# Uso: py -X utf8 -P lote.py URL [URL ...] [--modelo small|base] [--cookies-navegador firefox|edge|chrome]
#      py -X utf8 -P lote.py --pastas PASTA [PASTA ...]     (só mede pastas já baixadas)
# Saída: a lista de pastas prontas, uma por linha, com "PASTA <caminho>" (o resto é log).
import argparse
import os
import re
import subprocess
import sys

AR = os.path.expanduser("~/.claude/skills/analisar-reel/scripts").replace("\\", "/")
PY = [sys.executable, "-X", "utf8", "-P"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="*")
    ap.add_argument("--pastas", nargs="*", default=[])
    ap.add_argument("--modelo", default=None)
    ap.add_argument("--cookies-navegador", default=None)
    a = ap.parse_args()

    pastas = [p.replace("\\", "/") for p in a.pastas]
    if a.urls:
        # links repetidos no pedido são comuns (o usuário colou o mesmo duas vezes)
        urls = list(dict.fromkeys(u.split("?")[0].rstrip("/") + "/" for u in a.urls))
        cmd = PY + [f"{AR}/baixar.py", *urls]
        if a.cookies_navegador:
            cmd += ["--cookies-navegador", a.cookies_navegador]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(r.stdout)
        if r.returncode != 0:
            print(r.stderr[-2000:], file=sys.stderr)
        for linha in r.stdout.splitlines():
            m = re.match(r"OK\s+(.+)$", linha.strip())
            if m:
                pastas.append(m.group(1).strip().replace("\\", "/"))
        falhas = [l for l in r.stdout.splitlines() if l.strip().startswith(("ERRO", "FALHOU"))]
        for f in falhas:
            print("FALHA", f)

    for p in pastas:
        video = os.path.join(p, "video.mp4")
        if not os.path.exists(video):
            print("SEM VIDEO", p)
            continue
        if os.path.exists(os.path.join(p, "analise.json")):
            print("JA MEDIDO", p)
            print("PASTA", p)
            continue
        cmd = PY + [f"{AR}/analisar.py", video]
        if a.modelo:
            cmd += ["--modelo", a.modelo]
        print("medindo", p, flush=True)
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("\n".join(r.stdout.splitlines()[-4:]))
        if r.returncode != 0:
            print("ERRO AO MEDIR", p, r.stderr[-1500:])
            continue
        print("PASTA", p, flush=True)


if __name__ == "__main__":
    main()
