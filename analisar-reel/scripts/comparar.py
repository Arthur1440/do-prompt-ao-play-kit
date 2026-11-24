# Compara vários reels já analisados (analise.json) numa tabela, com a mediana de cada medida.
# Uso: py -X utf8 -P comparar.py PASTA1 PASTA2 ... [--md C:/.../comparativo.md]
#      (cada PASTA é a de um reel, com analise.json; aceita também o caminho do analise.json)
import argparse
import json
import os
import statistics as st

COLS = [
    ("conta", lambda d: "@" + str((d.get("meta") or {}).get("conta") or "?")),
    ("dur s", lambda d: d["info"]["duracao_s"]),
    ("views", lambda d: (d.get("meta") or {}).get("views")),
    ("x mediana", lambda d: (d.get("meta") or {}).get("multiplicador")),
    ("curtidas", lambda d: (d.get("meta") or {}).get("curtidas")),
    ("1ª fala s", lambda d: d["fala"].get("primeira_palavra_s")),
    ("pal/min", lambda d: d["fala"].get("palavras_por_min")),
    ("fala %", lambda d: d["fala"].get("fala_cobre_pct")),
    ("planos", lambda d: d["ritmo"]["planos"]),
    ("cortes/min", lambda d: d["ritmo"]["cortes_por_min"]),
    ("plano méd s", lambda d: d["ritmo"]["plano_medio_s"]),
    ("cortes 0-3s", lambda d: d["ritmo"]["cortes_nos_3_primeiros_s"]),
    ("LUFS", lambda d: (d.get("audio") or {}).get("lufs_integrado")),
    ("BPM", lambda d: (d.get("audio") or {}).get("bpm_estimado")),
    ("corte na batida %", lambda d: (d.get("audio") or {}).get("cortes_na_batida_pct")),
    ("fundo", lambda d: (d.get("audio") or {}).get("fundo", "")[:28]),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pastas", nargs="+")
    ap.add_argument("--md")
    a = ap.parse_args()
    linhas = []
    for p in a.pastas:
        f = p if p.endswith(".json") else os.path.join(p, "analise.json")
        d = json.load(open(f, encoding="utf-8"))
        mp = os.path.join(os.path.dirname(os.path.abspath(f)), "meta.json")
        if os.path.exists(mp):  # meta.json é a fonte mais nova (views entram depois da análise)
            d["meta"] = json.load(open(mp, encoding="utf-8"))
        nome = os.path.basename(os.path.dirname(os.path.abspath(f)))
        lin = [nome]
        for _, fn in COLS:
            try:
                lin.append(fn(d))
            except Exception:
                lin.append(None)
        lin.append(d["fala"].get("gancho_0a3s", ""))
        linhas.append(lin)
    cab = ["reel"] + [c for c, _ in COLS] + ["gancho 0-3 s"]
    med = ["MEDIANA"]
    for j in range(1, len(cab)):
        nums = [l[j] for l in linhas if isinstance(l[j], (int, float)) and not isinstance(l[j], bool)]
        med.append(round(st.median(nums), 1) if len(nums) == len(linhas) and nums else "")
    out = ["| " + " | ".join(cab) + " |", "|" + "---|" * len(cab)]
    for l in linhas + [med]:
        out.append("| " + " | ".join("" if x is None else str(x) for x in l) + " |")
    txt = "\n".join(out)
    print(txt)
    if a.md:
        open(a.md, "w", encoding="utf-8").write(txt + "\n")
        print(f"\ngravado em {a.md}")


if __name__ == "__main__":
    main()
