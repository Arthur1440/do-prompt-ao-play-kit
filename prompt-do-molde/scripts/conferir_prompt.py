# Confere um PROMPT_PRODUCAO.txt contra as regras fixas da skill prompt-do-molde.
# Uso: python conferir_prompt.py <pasta_reels>/todo/<tema>/PROMPT_PRODUCAO.txt
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402

PERFIL = perfil_criador.ler()

OBRIGATORIOS = [
    ("remotion-best-practices", "skill remotion-best-practices"),
    ("threejs", "skill threejs"),
    ("npx skills add remotion-dev/skills", "comando de instalação do Remotion"),
    ("cloudai-x/threejs-skills", "comando de instalação das skills threejs"),
    ("poly.pizza", "Poly Pizza como fonte de modelos prontos"),
    ("previa_A_10s.mp4", "prévia A de 10 s"),
    ("previa_B_10s.mp4", "prévia B de 10 s"),
    ("previa_C_10s.mp4", "prévia C de 10 s"),
    ("PARE", "ordem de parar antes do reel inteiro"),
    ("CREDITOS.txt", "créditos dos modelos e sons"),
]


def main():
    caminho = sys.argv[1]
    txt = open(caminho, encoding="utf-8").read()
    erros, avisos = [], []
    # virada e pedido só são cobrados se o perfil tiver (cada criador decide se usa)
    if PERFIL["virada"] and "feito com ia" not in txt.lower():
        avisos.append("o perfil tem virada 'feito com IA', mas o prompt não fala dela")
    palavra = perfil_criador.palavra_comentario()
    if palavra and palavra.lower() not in txt.lower():
        avisos.append(f"o perfil pede 'Comenta {palavra}', mas a palavra não está no prompt")

    for chave, nome in OBRIGATORIOS:
        if chave.lower() not in txt.lower():
            erros.append(f"falta: {nome} ('{chave}')")

    if re.search(r"sem[_ ]efeitos", txt, re.I):
        erros.append("pede versão 'sem efeitos': a escolha de efeitos é feita antes, com o operador")

    for m in re.finditer(r"\[[^\]\n]{3,}\]", txt):
        trecho = m.group(0)
        if re.search(r"[A-ZÇÃÕÉÍ]{4,}", trecho) or trecho.startswith(("[1.", "[2.", "[N", "[BLOCO", "[MODO", "[QUADRO")):
            linha = txt.count("\n", 0, m.start()) + 1
            erros.append(f"linha {linha}: campo do modelo sem preencher: {trecho[:70]}")

    if not re.search(r"(?i)efeitos sonoros|sem efeitos sonoros|efeitos poucos", txt):
        avisos.append("não achei a decisão sobre efeitos sonoros (SIM ou NÃO) na seção SOM")
    if "ESTIMADO" not in txt and "REAL" not in txt:
        avisos.append("o prompt não diz se os tempos são ESTIMADOS ou REAIS")

    for e in erros:
        print("ERRO ", e)
    for a in avisos:
        print("AVISO", a)
    print("OK, nada a corrigir." if not erros else f"{len(erros)} erro(s).")
    sys.exit(1 if erros else 0)


if __name__ == "__main__":
    main()
