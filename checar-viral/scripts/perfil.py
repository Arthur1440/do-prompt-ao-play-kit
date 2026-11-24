# Lê o perfil do criador (~/.claude/perfil-criador.md), criado pela skill perfil-criador.
# Formato: linhas "- chave: valor". Chave que faltar usa o padrão abaixo.
# Este arquivo é igual em todas as skills do kit; se mudar um, copie para os outros.
import os
import re

ARQUIVO = os.path.expanduser("~/.claude/perfil-criador.md")
PADRAO = {
    "perfil": "@seu.perfil",
    "pasta_reels": "~/reels",
    "voz_elevenlabs": "",
    "ritmo_voz": "2.9",
    "palavra_comentario": "",
    "virada": "",
}


def ler():
    p = dict(PADRAO)
    if os.path.exists(ARQUIVO):
        for linha in open(ARQUIVO, encoding="utf-8"):
            m = re.match(r"^\s*-\s*([a-z_]+)\s*:\s*(.*?)\s*$", linha)
            if m and m.group(2) and not m.group(2).startswith("<"):
                p[m.group(1)] = m.group(2).strip().strip('"').strip("`")
    return p


def existe():
    return os.path.exists(ARQUIVO)


def pasta_reels():
    return os.path.expanduser(ler()["pasta_reels"]).replace("\\", "/").rstrip("/")


def ritmo():
    try:
        return float(ler()["ritmo_voz"].replace(",", "."))
    except ValueError:
        return 2.9


def palavra_comentario():
    return ler()["palavra_comentario"].strip().upper()
