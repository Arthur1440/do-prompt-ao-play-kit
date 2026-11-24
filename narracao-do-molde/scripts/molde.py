# Mede o molde da fala de um reel analisado (skill analisar-reel) e confere um rascunho contra ele.
# Tudo aqui é INFORMAÇÃO: nada trava, não há meta mínima de palavras nem de velocidade.
#
# Uso:
#   python molde.py extrair  <pasta_reels>/_referencias/<pasta>
#   python molde.py conferir <pasta_reels>/_referencias/<pasta> <pasta_reels>/todo/<tema>/ROTEIRO_<tema>.md
#   (python = "py -X utf8 -P" no Windows, "python3 -P" no Mac/Linux; <pasta_reels> vem do perfil)
#
# O rascunho é texto puro: uma frase por linha, linha em branco entre blocos. Linhas que começam
# com # são ignoradas. A virada do perfil ("Esse vídeo foi feito com IA..." e o "Comenta <palavra>")
# é separada e não entra na comparação com a referência.
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402

RITMO_VOZ = perfil_criador.ritmo()  # palavras/s da voz do perfil (sem tags); padrão 2,9
_PALAVRA = perfil_criador.palavra_comentario()
CONECTORES = ["então", "mas", "porque", "e", "só", "aí", "agora", "quando", "se", "na", "parabéns",
              "por", "isso", "só que", "depois", "até", "enquanto", "e aí", "olha"]
PALAVRA = re.compile(r"[0-9A-Za-zÀ-ÿ]+(?:[-'][0-9A-Za-zÀ-ÿ]+)*")
VIRADA = re.compile(r"feito com (a )?ia|feito com inteligência" + (rf"|comenta {re.escape(_PALAVRA)}\b" if _PALAVRA else ""), re.I)
TAG = re.compile(r"\[[^\]]+\]")


def palavras(t):
    return PALAVRA.findall(TAG.sub(" ", t))


def frases(texto):
    t = re.sub(r"\s+", " ", texto).strip()
    return [f.strip() for f in re.split(r"(?<=[.!?])\s+", t) if palavras(f)]


def abertura(f):
    ws = [w.lower() for w in palavras(f)]
    if not ws:
        return ""
    return ws[0]


def segunda_pessoa(ws):
    alvo = {"você", "voce", "seu", "sua", "seus", "suas", "te", "tu", "teu", "tua"}
    return sum(1 for w in ws if w.lower() in alvo)


def ler_ref(pasta):
    a = json.load(open(os.path.join(pasta, "analise.json"), encoding="utf-8"))
    texto = " ".join(f["texto"] for f in a.get("frases", []))
    fr = frases(texto)
    ws = palavras(texto)
    fala = a.get("fala", {})
    dur_fala = (fala.get("ultima_palavra_s", 0) or 0) - (fala.get("primeira_palavra_s", 0) or 0)
    return {"frases": fr, "palavras": ws, "dur_video": a["info"]["duracao_s"], "dur_fala": round(dur_fala, 1),
            "ppm": fala.get("palavras_por_min"), "planos": a.get("ritmo", {}).get("planos")}


def perfil(fr, ws):
    ab = {}
    for f in fr:
        k = abertura(f)
        if k in CONECTORES:
            ab[k] = ab.get(k, 0) + 1
    tam = [len(palavras(f)) for f in fr]
    return {
        "frases": len(fr),
        "palavras": len(ws),
        "palavras_por_frase": round(sum(tam) / max(1, len(tam)), 1),
        "frase_mais_longa": max(tam) if tam else 0,
        "aberturas": dict(sorted(ab.items(), key=lambda x: -x[1])),
        "segunda_pessoa_pct": round(100 * segunda_pessoa(ws) / max(1, len(ws)), 1),
        "perguntas": sum(1 for f in fr if f.endswith("?")),
        "exclamacoes": sum(1 for f in fr if f.endswith("!")),
    }


def ngramas(ws, n):
    ws = [w.lower() for w in ws]
    return {" ".join(ws[i:i + n]) for i in range(len(ws) - n + 1)}


def extrair(pasta):
    r = ler_ref(pasta)
    p = perfil(r["frases"], r["palavras"])
    print(f"REFERÊNCIA {os.path.basename(pasta)}")
    print(f"  vídeo {r['dur_video']} s | fala {r['dur_fala']} s | {p['palavras']} palavras | {r['ppm']} palavras/min"
          f" | {r['planos']} planos")
    print(f"  {p['frases']} frases | {p['palavras_por_frase']} palavras/frase (mais longa {p['frase_mais_longa']})"
          f" | 2ª pessoa {p['segunda_pessoa_pct']}% das palavras | {p['perguntas']} perguntas | {p['exclamacoes']} exclamações")
    print(f"  aberturas de frase: {p['aberturas']}")
    print()
    for i, f in enumerate(r["frases"], 1):
        print(f"  {i:2d}. ({len(palavras(f)):2d}) {f}")
    out = os.path.join(pasta, "molde.json")
    json.dump({"perfil": p, "frases": r["frases"], "dur_video": r["dur_video"], "ppm": r["ppm"]},
              open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\ngravado {out}")


def conferir(pasta, rascunho):
    r = ler_ref(pasta)
    bruto = open(rascunho, encoding="utf-8").read()
    i = bruto.find("Texto para gravar")  # ROTEIRO_*.md: só o 1º bloco ``` dessa seção
    m = re.search(r"```[^\n]*\n(.*?)```", bruto[i:] if i >= 0 else bruto, re.S)
    if m:
        bruto = m.group(1)
    linhas = [l for l in bruto.splitlines() if not l.strip().startswith("#")]
    corpo, virada = [], []
    em_virada = False
    for l in linhas:
        if VIRADA.search(l):
            em_virada = True
        (virada if em_virada else corpo).append(l)
    texto = "\n".join(corpo)
    fr = frases(texto)
    ws = palavras(texto)
    blocos = [b for b in re.split(r"\n\s*\n", texto) if palavras(b)]
    pr, pd = perfil(r["frases"], r["palavras"]), perfil(fr, ws)
    wv = palavras(" ".join(virada))

    print(f"RASCUNHO {os.path.basename(rascunho)}  x  REFERÊNCIA {os.path.basename(pasta)}\n")
    print(f"{'':28s}{'referência':>14s}{'rascunho':>14s}")
    for nome, a, b in [("frases", pr["frases"], pd["frases"]), ("palavras (sem a virada)", pr["palavras"], pd["palavras"]),
                       ("palavras por frase", pr["palavras_por_frase"], pd["palavras_por_frase"]),
                       ("frase mais longa", pr["frase_mais_longa"], pd["frase_mais_longa"]),
                       ("2ª pessoa % das palavras", pr["segunda_pessoa_pct"], pd["segunda_pessoa_pct"]),
                       ("perguntas", pr["perguntas"], pd["perguntas"]),
                       ("exclamações", pr["exclamacoes"], pd["exclamacoes"])]:
        print(f"  {nome:26s}{str(a):>14s}{str(b):>14s}")
    print(f"\n  aberturas na referência: {pr['aberturas']}")
    print(f"  aberturas no rascunho:   {pd['aberturas']}")
    print(f"  blocos no rascunho: {len(blocos)}")

    seg_ref = r["dur_fala"]
    seg_corpo = round(len(ws) / RITMO_VOZ, 1)
    seg_virada = round(len(wv) / RITMO_VOZ, 1)
    print(f"\n  duração estimada na voz do perfil ({RITMO_VOZ} pal/s): corpo {seg_corpo} s + virada {seg_virada} s"
          f" = {round(seg_corpo + seg_virada, 1)} s  (fala da referência: {seg_ref} s)")

    # gancho e fecho
    print(f"\n  1ª frase ref.:  ({len(palavras(r['frases'][0]))} pal.) {r['frases'][0]}")
    if fr:
        print(f"  1ª frase rasc.: ({len(palavras(fr[0]))} pal.) {fr[0]}")
        print(f"  última ref.:    {r['frases'][-1]}")
        print(f"  última rasc.:   {fr[-1]}")
    if virada:
        print(f"\n  virada do perfil ({len(wv)} palavras) separada da comparação")

    # cópia literal: sequências de 6 palavras iguais às da referência
    comuns = sorted(ngramas(ws, 6) & ngramas(r["palavras"], 6))
    if comuns:
        print(f"\n  INFO trechos de 6+ palavras idênticos à referência ({len(comuns)}). Moldura do formato tudo bem;"
              f" frase de conteúdo copiada não:")
        for c in comuns[:12]:
            print(f"    - {c}")
    else:
        print("\n  nenhum trecho de 6 palavras idêntico à referência")

    # frase a frase lado a lado
    print("\n  frase a frase (nº de palavras):")
    for i in range(max(len(r["frases"]), len(fr))):
        a = r["frases"][i] if i < len(r["frases"]) else ""
        b = fr[i] if i < len(fr) else ""
        print(f"  {i + 1:2d}. ref ({len(palavras(a)):2d}) {a[:70]}")
        print(f"      nova ({len(palavras(b)):2d}) {b[:70]}")
    print("\nTudo acima é informação; nenhuma medida trava o roteiro.")


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("extrair", "conferir"):
        print(__doc__ or "uso: molde.py extrair PASTA | molde.py conferir PASTA rascunho.txt")
        sys.exit(0)
    if sys.argv[1] == "extrair":
        extrair(sys.argv[2])
    else:
        conferir(sys.argv[2], sys.argv[3])


if __name__ == "__main__":
    main()
