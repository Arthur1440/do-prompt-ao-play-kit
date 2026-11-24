#!/usr/bin/env python3
"""
verificar.py - confere um texto de narração antes de colar no ElevenLabs (v3/v4).

Uso:
  py -X utf8 -I verificar.py NARRACAO_ELEVENLABS.md
  py -X utf8 -I verificar.py texto.txt --ritmo 2.9 --siglas CPF,IA,RG

Lê o primeiro bloco ``` depois de "Texto para colar"; sem isso, o primeiro
bloco ```; sem bloco nenhum, o arquivo inteiro.

ERRO  = vai sair errado no áudio, corrija.
AVISO = pode sair errado, avalie.
"""

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402

SIGLAS_PADRAO = {"CPF", "IA", "RG", "CNPJ", "PIX", "NASA", "EUA", "ONU", "CBF",
                 "MEI", "SP", "RJ", "TV", "DJ", "PIB", "INSS", "SUS", "ENEM", "UF"}

TAGS_DE_SOM = {"suspense", "drumroll", "applause", "music", "whoosh", "explosion",
               "footsteps", "door", "thunder", "rain", "wind", "crowd", "gunshot",
               "clapping", "bell", "beep"}
TAGS_PROIBIDAS_CLONE = {"laughs", "laugh", "laughing", "sighs", "sigh", "whispers",
                        "whisper", "giggles", "chuckles", "crying", "cries"}

TAGS_EM_PORTUGUES = {"risos", "risada", "rindo", "suspiro", "suspira", "sussurro", "sussurrando",
                     "pausa", "animado", "curioso", "sério", "serio", "feliz", "triste", "irônico",
                     "ironico", "empolgado", "calmo", "grito", "gritando", "tom", "voz", "baixo"}

TAG_RE = re.compile(r"\[([^\]]+)\]")
SSML_RE = re.compile(r"<[^>]+>")
PALAVRA_RE = re.compile(r"[0-9A-Za-zÀ-ÿ]+(?:[-'][0-9A-Za-zÀ-ÿ]+)*")


def extrair_texto(conteudo: str) -> str:
    i = conteudo.find("Texto para colar")
    trecho = conteudo[i:] if i >= 0 else conteudo
    m = re.search(r"```[^\n]*\n(.*?)```", trecho, re.S)
    if m:
        return m.group(1)
    m = re.search(r"```[^\n]*\n(.*?)```", conteudo, re.S)
    return m.group(1) if m else conteudo


def verificar(texto: str, ritmo: float, siglas: set):
    erros, avisos = [], []
    linhas = texto.splitlines()

    for n, linha in enumerate(linhas, 1):
        s = linha.strip()
        if not s:
            continue
        tags = TAG_RE.findall(s)

        if re.search(r"<\s*break|<\s*/?\s*(speak|prosody|emphasis|say-as)", s, re.I):
            erros.append(f"linha {n}: <break>/SSML não funciona no v3/v4; use '...' e quebra de linha")

        for t in tags:
            base = t.strip().lower()
            if re.search(r"[À-ÿ]", t) or set(re.findall(r"[a-zà-ÿ]+", base)) & TAGS_EM_PORTUGUES:
                erros.append(f"linha {n}: tag [{t}] parece em português; escreva em inglês")
            if any(w in base for w in TAGS_DE_SOM):
                erros.append(f"linha {n}: tag [{t}] parece efeito sonoro; o modelo pode gerar o som")
            if any(re.search(rf"\b{w}\b", base) for w in TAGS_PROIBIDAS_CLONE):
                erros.append(f"linha {n}: tag [{t}] soa falsa na voz clonada")

        if len(tags) > 1:
            avisos.append(f"linha {n}: {len(tags)} tags na mesma linha; prefira uma por frase")
        if tags and not s.startswith("["):
            avisos.append(f"linha {n}: tag no meio da linha; coloque no início da frase")

        if re.search(r"\d", SSML_RE.sub("", TAG_RE.sub("", s))):
            erros.append(f"linha {n}: tem algarismo ({s[:60]}...); escreva o número por extenso")

        if "—" in s or "–" in s:
            avisos.append(f"linha {n}: travessão; troque por vírgula, ponto ou '...'")
        if re.search(r"[\U0001F300-\U0001FAFF☀-➿]", s):
            erros.append(f"linha {n}: emoji não é lido de forma previsível")
        if re.search(r"(\*\*|__|^#|^- )", s):
            avisos.append(f"linha {n}: marcação de markdown no texto")
        if s.count("...") > 2:
            avisos.append(f"linha {n}: {s.count('...')} reticências na mesma linha; pode soar gaguejado")

        if re.search(r"s[óo] a voz [ée] minha|a narra[çc][ãa]o [ée] minha", s, re.I):
            erros.append(f"linha {n}: 'só a voz é minha' não é verdade com voz clonada; use 'a IA clonou a minha voz'")

    corpo = SSML_RE.sub("", TAG_RE.sub("", texto))
    palavras = PALAVRA_RE.findall(corpo)

    # ênfases: palavras seguidas em maiúsculas contam como uma só ("NA HORA", "UM TERÇO")
    maiusculas, atual = [], []
    for p in palavras:
        if len(p) > 1 and p.isupper() and p not in siglas and not p.isdigit():
            atual.append(p)
        else:
            if atual:
                maiusculas.append(" ".join(atual))
            atual = []
    if atual:
        maiusculas.append(" ".join(atual))

    if len(maiusculas) > 5:
        avisos.append(f"{len(maiusculas)} ênfases em MAIÚSCULAS ({', '.join(maiusculas)}); o ideal é de 2 a 5")
    elif len(maiusculas) == 0:
        avisos.append("nenhuma palavra em MAIÚSCULAS; marque de 2 a 5 palavras da surpresa")

    ultima = next((l.strip() for l in reversed(linhas) if l.strip()), "")
    if ultima.endswith("...") or ultima.endswith("…"):
        avisos.append("a última frase termina em reticências; termine com ponto para fechar para baixo")

    total_tags = len(TAG_RE.findall(texto))
    segundos = len(palavras) / ritmo if ritmo else 0
    return erros, avisos, len(palavras), total_tags, segundos, maiusculas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivo", help="NARRACAO_ELEVENLABS.md ou .txt ('-' para stdin)")
    ap.add_argument("--ritmo", type=float, default=perfil_criador.ritmo(), help="palavras por segundo (padrão: o do perfil, ou 2,9)")
    ap.add_argument("--siglas", default="", help="siglas extras separadas por vírgula")
    a = ap.parse_args()

    conteudo = sys.stdin.read() if a.arquivo == "-" else open(a.arquivo, encoding="utf-8").read()
    siglas = SIGLAS_PADRAO | {s.strip().upper() for s in a.siglas.split(",") if s.strip()}
    texto = extrair_texto(conteudo)
    erros, avisos, n_pal, n_tags, seg, caps = verificar(texto, a.ritmo, siglas)

    print(f"Palavras faladas: {n_pal}  |  tags: {n_tags}  |  duração estimada: {seg:.0f} s "
          f"(meta {seg*0.95:.0f}-{seg*1.05:.0f} s, ritmo {a.ritmo})")
    print(f"Ênfase em maiúsculas: {', '.join(caps) if caps else '(nenhuma)'}")
    for e in erros:
        print(f"ERRO  {e}")
    for w in avisos:
        print(f"AVISO {w}")
    if not erros and not avisos:
        print("OK, nada a corrigir.")
    sys.exit(1 if erros else 0)


if __name__ == "__main__":
    main()
