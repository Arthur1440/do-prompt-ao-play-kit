# Score de viral de uma narração: nota de 0 a 10 por categoria e score final de 0 a 100.
# uso:
#   py -X utf8 pontuar.py MEDICAO.json NOTAS.json      -> relatório da narração
#   py -X utf8 pontuar.py --calibrar                    -> recalcula os reels do placar e mede o acerto
# NOTAS.json: notas de 0 a 2 dadas pela rubrica (references/rubrica.md), mais "tema" e "continuacao".
import csv, json, math, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
DADOS = os.path.join(AQUI, "..", "data")
sys.path.insert(0, AQUI)
from medir import medir  # noqa: E402

# pesos ajustados na calibração de 12/11/2026 (18 reels): o gancho foi a categoria que mais acompanhou
# os envios (rho +0,89) e o valor prático a que menos (+0,18)
PESOS = {"gancho": 20, "tema": 20, "prova": 20, "espanto": 10, "valor": 5, "envio": 15, "compartilhavel": 10}
NOMES = {"gancho": "Gancho (0–4 s)", "tema": "Tema", "prova": "Prova (quem mediu + número)",
         "espanto": "Espanto", "valor": "Valor prático", "envio": "Pedido de envio",
         "compartilhavel": "Compartilhável (moeda social + gatilho)"}
TEMA = {"comida_casa": 10, "sitio_renda": 7, "ciencia": 3, "tecnologia": 3, "outro": 2,
        "historia": 1, "cultura_pop": 1, "noticia_politica": 1}
# faixas calibradas em 18 reels (ver references/evidencias.md); revisar quando o placar crescer
FAIXAS = [(75, "DEVE ROMPER", "perfil dos que passaram de 12 mil views"),
          (55, "PODE ROMPER", "faixa mista: a conta tem casos dos dois lados"),
          (0, "FICA NO LOTE", "perfil dos que pararam em 0,8–5 mil views")]


def n(notas, k, padrao=0):
    v = notas.get(k, padrao)
    return float(v) if str(v).strip() != "" else float(padrao)


def categorias(med, notas):
    ganho = n(notas, "gancho_ganho", 2 if med["ganho_no_gancho"] else 0)
    curta = 2 if med["primeira_frase_palavras"] <= 15 else (1 if med["primeira_frase_palavras"] <= 22 else 0)
    c = {
        "gancho": ganho * 3 + curta * 1 + n(notas, "gancho_surpresa", 1) * 1,
        "tema": TEMA.get(str(notas.get("tema", "outro")).strip(), 2),
        "prova": (n(notas, "autoridade_nomeada") + n(notas, "numero_tangivel")) * 2.5,
        "espanto": n(notas, "espanto") * 5,
        "valor": n(notas, "valor_pratico") * 3 + n(notas, "serve_quem_recebe") * 2,
        "envio": n(notas, "pedido_envio") * 5,
        "compartilhavel": (n(notas, "moeda_social") + n(notas, "gatilho_cotidiano")) * 2.5,
    }
    c = {k: max(0.0, min(10.0, v)) for k, v in c.items()}
    pen = []
    r = n(notas, "raiva_ou_ansiedade")
    if r >= 1: pen.append((5 * r, f"raiva ou alarme (nota {int(r)})"))
    if n(notas, "tristeza") >= 2: pen.append((5, "tom triste"))
    if n(notas, "continuacao") >= 1 or med.get("menciona_continuacao"): pen.append((10, "se apresenta como continuação/parte 2"))
    if med.get("desmonta_promessa"): pen.append((min(10, 5 * len(med["desmonta_promessa"])), "a fala desmonta a promessa"))
    final = sum(c[k] * PESOS[k] / 10 for k in PESOS) - sum(p for p, _ in pen)
    return c, pen, round(max(0, min(100, final)))


def faixa(score):
    return next(f for f in FAIXAS if score >= f[0])


def carregar_placar():
    placar = {r["pasta"]: r for r in csv.DictReader(open(os.path.join(DADOS, "placar.csv"), encoding="utf8"))}
    notas = {r["pasta"]: r for r in csv.DictReader(open(os.path.join(DADOS, "notas_calibracao.csv"), encoding="utf8"))}
    base = []
    for p, nt in notas.items():
        tr = os.path.join(DADOS, "transcricoes", p + ".json")
        if p not in placar or not os.path.exists(tr):
            continue
        r = placar[p]
        if float(r["horas_no_ar"]) < 24:
            continue
        t = json.load(open(tr, encoding="utf8"))
        med = medir(t["words"], t["duracao"])
        c, pen, s = categorias(med, nt)
        base.append(dict(pasta=p, nome=r["nome"], views=int(r["views"]),
                         env=float(r["envios"]) / float(r["visualizadores"]) * 100,
                         sal=float(r["salv"]) / float(r["visualizadores"]) * 100, cat=c, score=s))
    return base


def rank(x):
    o = sorted(range(len(x)), key=lambda i: x[i]); r = [0] * len(x); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and x[o[j + 1]] == x[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2
        i = j + 1
    return r


def spearman(a, b):
    ra, rb = rank(a), rank(b); m = len(a); ma, mb = sum(ra) / m, sum(rb) / m
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return cov / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))


def calibrar():
    base = carregar_placar()
    print(f"{len(base)} reels do placar com 24 h ou mais, fala transcrita e notas cegas\n")
    print(f"{'reel':20} {'score':>5}  {'faixa':13} {'envios':>7} {'views':>9}   " + " ".join(f"{k[:5]:>5}" for k in PESOS))
    for b in sorted(base, key=lambda b: -b["score"]):
        print(f"{b['nome']:20} {b['score']:5}  {faixa(b['score'])[1]:13} {b['env']:6.2f}% {b['views']:>9,}   "
              + " ".join(f"{b['cat'][k]:5.1f}" for k in PESOS))
    s = [b["score"] for b in base]
    print(f"\nscore x envios por visualizador: rho {spearman(s, [b['env'] for b in base]):+.2f}")
    print(f"score x views:                   rho {spearman(s, [b['views'] for b in base]):+.2f}")
    for k in PESOS:
        print(f"  {NOMES[k]:40} x envios: rho {spearman([b['cat'][k] for b in base], [b['env'] for b in base]):+.2f}")
    romp = [b for b in base if b["views"] >= 10000]; trav = [b for b in base if b["views"] < 10000]
    auc = sum(1 if p["score"] > q["score"] else 0.5 if p["score"] == q["score"] else 0 for p in romp for q in trav) / (len(romp) * len(trav))
    print(f"\nseparação rompeu (>=10 mil, n={len(romp)}) x travou (n={len(trav)}): AUC {auc:.2f}"
          f" · menor score que rompeu {min(b['score'] for b in romp)} · maior score que travou {max(b['score'] for b in trav)}")


def relatorio(med_path, notas_path):
    med = json.load(open(med_path, encoding="utf8"))["medicao"]
    notas = json.load(open(notas_path, encoding="utf8"))
    c, pen, s = categorias(med, notas)
    f = faixa(s)
    print(f"SCORE FINAL: {s}/100 · {f[1]} ({f[2]})\n")
    print(f"{'categoria':42} {'nota':>5}  {'peso':>4}  {'pontos':>6}")
    for k in PESOS:
        print(f"{NOMES[k]:42} {c[k]:5.1f}  {PESOS[k]:4}  {c[k] * PESOS[k] / 10:6.1f}")
    for p, motivo in pen:
        print(f"{'penalidade: ' + motivo:42} {'':5}  {'':4}  {-p:6.1f}")
    base = carregar_placar()
    viz = sorted(base, key=lambda b: sum((b["cat"][k] - c[k]) ** 2 * PESOS[k] for k in PESOS))[:3]
    print("\nreels mais parecidos no placar:")
    for b in viz:
        print(f"  {b['nome']:20} score {b['score']:3} · envios {b['env']:.2f}% · {b['views']:,} views")
    pe = med.get("pedido_envio_s")
    print(f"\npedido de envio aos {pe:.1f} s ({med['pedido_envio_pct']}% do vídeo)" if pe is not None else "\nsem pedido de envio na fala")
    # formato: não pontua (ver references/evidencias.md, "Tamanho, palavras e ritmo"), só situa
    dur, pal = med["duracao_s"], med["palavras"]; wps = pal / dur if dur else 0
    print("\nformato (não entra no score):")
    print(f"  duração {dur:.1f} s · faixa dos que romperam 67–81 s"
          + (" · FORA da faixa testada" if dur < 60 or dur > 95 else ""))
    print(f"  palavras {pal} · faixa dos que romperam 194–234")
    alerta = " · ABAIXO de 2,80: ritmo dos que travaram" if wps < 2.80 else ""
    print(f"  ritmo {wps:.2f} palavras/s · todos os que romperam ficaram entre 2,82 e 3,05{alerta}"
          + ("" if med.get("origem", "").startswith("áudio") or med.get("origem", "").startswith("transcrição") else " (estimado: o texto não tem ritmo real)"))
    json.dump({"score": s, "faixa": f[1], "categorias": c, "penalidades": pen,
               "parecidos": [b["nome"] for b in viz]},
              open(os.path.splitext(notas_path)[0] + ".score.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--calibrar":
        calibrar()
    elif len(sys.argv) == 3:
        relatorio(sys.argv[1], sys.argv[2])
    else:
        sys.exit("uso: pontuar.py MEDICAO.json NOTAS.json  |  pontuar.py --calibrar")
