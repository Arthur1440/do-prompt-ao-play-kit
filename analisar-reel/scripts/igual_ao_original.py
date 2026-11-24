# Modo IGUAL: confere se o nosso reel ficou igual ao original, SEM REMOVER NADA.
# Mede o nosso vídeo com o mesmo analisar.py e compara com a análise da referência:
# duração, planos, cada corte do original (existe um nosso a até 0,25 s?), cortes por trecho de 10 s,
# plano mais longo, cortes na batida, volume e, se houver fala, as palavras.
# Monta folhas lado a lado (em cima o original, embaixo o nosso) a cada 1,5 s e nos cortes que faltam.
#
# Uso: py -X utf8 -P igual_ao_original.py <pasta_da_referencia> <nosso.mp4> [--saida PASTA] [--ate 10]
#      --ate N: compara só os primeiros N segundos (para as prévias de 10 s)
# Saída: <saida>/igual_relatorio.md, igual_lado_NN.jpg, igual_cortes_faltando.jpg, nosso/ (análise do nosso)
import argparse, json, os, subprocess, sys, difflib

AQUI = os.path.dirname(os.path.abspath(__file__))


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")


def carrega(p):
    a = json.load(open(os.path.join(p, "analise.json"), encoding="utf-8"))
    r, au = a["ritmo"], a["audio"]
    return {
        "dur": float(a["info"]["duracao_s"]),
        "planos": int(r["planos"]),
        "cortes": [float(c) for c in a["cortes_s"]],
        "trechos": list(r["cortes_por_trecho_10s"]),
        "longo": float(r["plano_mais_longo_s"]),
        "primeiro": float(r["primeiro_corte_s"] or 0),
        "batida": float(au.get("cortes_na_batida_pct") or 0),
        "bpm": au.get("bpm_estimado"),
        "lufs": float(au["lufs_integrado"]) if au.get("lufs_integrado") is not None else None,
        "fala": a["fala"].get("tem_fala"),
        "texto": open(os.path.join(p, "transcricao.txt"), encoding="utf-8").read() if os.path.exists(os.path.join(p, "transcricao.txt")) else "",
    }


def quadro(v, t, out, larg=200):
    sh(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{max(0, t):.2f}", "-i", v, "-frames:v", "1", "-vf", f"scale={larg}:-1", out])
    return os.path.exists(out)


def folha(ref_v, nos_v, tempos, out, tmp):
    rs, ns = [], []
    for i, t in enumerate(tempos):
        a, b = os.path.join(tmp, f"r{i}.png"), os.path.join(tmp, f"n{i}.png")
        if quadro(ref_v, t, a) and quadro(nos_v, t, b):
            rs.append(a); ns.append(b)
    if not rs:
        return False
    n = len(rs)
    ins = sum((["-i", x] for x in rs + ns), [])
    f = "".join(f"[{i}]" for i in range(n)) + f"hstack={n}[a];" + "".join(f"[{n + i}]" for i in range(n)) + f"hstack={n}[b];[a][b]vstack" if n > 1 else "[0][1]vstack"
    sh(["ffmpeg", "-loglevel", "error", "-y", *ins, "-filter_complex", f, "-q:v", "3", out])
    for x in rs + ns:
        os.remove(x)
    return os.path.exists(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("referencia")
    ap.add_argument("nosso")
    ap.add_argument("--saida")
    ap.add_argument("--ate", type=float)
    a = ap.parse_args()
    ref_p = os.path.abspath(a.referencia)
    nos_v = os.path.abspath(a.nosso)
    out = os.path.abspath(a.saida or os.path.join(os.path.dirname(nos_v), "igual"))
    os.makedirs(out, exist_ok=True)
    ref_v = os.path.join(ref_p, "video.mp4")
    R = carrega(ref_p)

    # mede o nosso com o mesmo script (com fala só se a referência tem fala)
    nos_p = os.path.join(out, "nosso")
    os.makedirs(nos_p, exist_ok=True)
    cmd = [sys.executable, "-X", "utf8", "-P", os.path.join(AQUI, "analisar.py"), nos_v, "--saida", nos_p]
    if str(R["fala"]) != "True":
        cmd.append("--sem-transcricao")
    print("medindo o nosso vídeo...", flush=True)
    r = sh(cmd)
    if not os.path.exists(os.path.join(nos_p, "analise.json")):
        print(r.stdout[-2000:], r.stderr[-2000:])
        sys.exit("falhou a medição do nosso vídeo")
    N = carrega(nos_p)
    if a.ate:
        # só o trecho da prévia: refaz planos, trechos e plano mais longo a partir dos cortes
        for X in (R, N):
            cs = [c for c in X["cortes"] if c < a.ate]
            marcos = [0.0] + cs + [min(a.ate, X["dur"])]
            X["cortes"] = cs
            X["planos"] = len(cs) + 1
            X["longo"] = max(marcos[i + 1] - marcos[i] for i in range(len(marcos) - 1))
            X["trechos"] = [sum(1 for c in cs if k * 10 <= c < (k + 1) * 10) for k in range(int((a.ate + 9.99) // 10))]
            X["dur"] = min(a.ate, X["dur"])
            X["primeiro"] = cs[0] if cs else None

    linhas, faltas = [], []

    def item(nome, ref, nos, ok, dica=""):
        linhas.append(f"| {nome} | {ref} | {nos} | {'OK' if ok else '**FALTA**'} |")
        if not ok:
            faltas.append(f"- {nome}: original {ref}, nosso {nos}. {dica}".rstrip())

    item("Duração", f"{R['dur']:.1f} s", f"{N['dur']:.1f} s", abs(R["dur"] - N["dur"]) <= 1.0, "Mesma duração (±1 s).")
    item("Planos", R["planos"], N["planos"], N["planos"] >= 0.85 * R["planos"], "Cada plano do original tem de existir, inclusive os de 0,3 s (piscadas de velocidade, trancos na batida).")
    # cada corte do original precisa de um nosso perto
    sem = [c for c in R["cortes"] if not any(abs(c - d) <= 0.25 for d in N["cortes"])]
    pct = 100 * (1 - len(sem) / max(1, len(R["cortes"])))
    item("Cortes do original que o nosso também tem (±0,25 s)", len(R["cortes"]), f"{len(R['cortes']) - len(sem)} ({pct:.0f}%)", pct >= 85,
         "Cortes que faltam: " + ", ".join(f"{c:.2f} s" for c in sem[:40]) + ("" if len(sem) <= 40 else " …"))
    for i, (x, y) in enumerate(zip(R["trechos"], N["trechos"] + [0] * 10)):
        item(f"Cortes de {i * 10} a {i * 10 + 10} s", x, y, y >= x - 2)
    item("Plano mais longo", f"{R['longo']:.1f} s", f"{N['longo']:.1f} s", N["longo"] <= R["longo"] + 1.0, "Quebre o plano longo como o original.")
    fmt = lambda v: "sem corte" if v is None else f"{v:.1f} s"
    item("1º corte", fmt(R["primeiro"]), fmt(N["primeiro"]), (R["primeiro"] is None and N["primeiro"] is None) or (R["primeiro"] is not None and N["primeiro"] is not None and abs(R["primeiro"] - N["primeiro"]) <= 0.3))
    item("Cortes na batida" + (" (vídeo inteiro)" if a.ate else ""), f"{R['batida']:.0f}%", f"{N['batida']:.0f}%", N["batida"] >= R["batida"] - 10 or bool(a.ate), "Ponha os cortes nas batidas da trilha.")
    item("BPM da trilha", R["bpm"], N["bpm"], str(R["bpm"]) == str(N["bpm"]) or R["bpm"] is None or abs(float(R["bpm"] or 0) - float(N["bpm"] or 0)) <= 4)
    if R["lufs"] is not None and N["lufs"] is not None:
        item("Volume (mesmo medidor)", R["lufs"], N["lufs"], abs(R["lufs"] - N["lufs"]) <= 2.0)
    if str(R["fala"]) == "True":
        sim = difflib.SequenceMatcher(None, R["texto"].lower().split(), N["texto"].lower().split()).ratio()
        item("Fala igual (palavras na mesma ordem)", f"{len(R['texto'].split())} palavras", f"{len(N['texto'].split())} palavras ({sim * 100:.0f}% igual)", sim >= 0.8 or len(N["texto"].split()) >= 0.9 * len(R["texto"].split()),
             "Se a fala foi traduzida, confira frase a frase à mão.")

    # folhas lado a lado
    tempos = [round(x * 1.5, 2) for x in range(int(min(R["dur"], N["dur"]) / 1.5) + 1)]
    folhas = []
    for k in range(0, len(tempos), 8):
        nome = os.path.join(out, f"igual_lado_{k // 8 + 1:02d}.jpg")
        if folha(ref_v, nos_v, tempos[k:k + 8], nome, out):
            folhas.append(os.path.basename(nome))
    if sem:
        nome = os.path.join(out, "igual_cortes_faltando.jpg")
        if folha(ref_v, nos_v, [c + 0.05 for c in sem[:10]], nome, out):
            folhas.append(os.path.basename(nome))

    # espectrograma lado a lado (em cima o original, embaixo o nosso): mostra se o TIPO de som é o mesmo
    esp = os.path.join(out, "igual_espectro.png")
    dur_e = a.ate or min(R["dur"], N["dur"])
    for src, nome in ((ref_v, "er.png"), (nos_v, "en.png")):
        sh(["ffmpeg", "-loglevel", "error", "-y", "-t", f"{dur_e:.2f}", "-i", src, "-lavfi", "showspectrumpic=s=1200x260:legend=0:fscale=lin:stop=3000", os.path.join(out, nome)])
    sh(["ffmpeg", "-loglevel", "error", "-y", "-i", os.path.join(out, "er.png"), "-i", os.path.join(out, "en.png"), "-filter_complex", "vstack", esp])
    for nome in ("er.png", "en.png"):
        if os.path.exists(os.path.join(out, nome)):
            os.remove(os.path.join(out, nome))
    if os.path.exists(esp):
        folhas.append(os.path.basename(esp))

    md = [
        "# Igual ao original?",
        "",
        f"Original: `{ref_v}`  ",
        f"Nosso: `{nos_v}`",
        "",
        "| item | original | nosso | |",
        "|---|---|---|---|",
        *linhas,
        "",
        "## O que falta" if faltas else "## Nada falta nos números",
        *faltas,
        "",
        "## Conferência que o script não faz (abra as folhas e confira cada uma)",
        "Em cima o original, embaixo o nosso, no mesmo segundo: " + ", ".join(f"`{f}`" for f in folhas),
        "- Cada cartela/legenda do original existe no nosso, no mesmo tempo, traduzida e sem cortar palavra.",
        "- Cada passo numerado, etiqueta, seta, onomatopeia, contador e selo do original existe no nosso.",
        "- Mesmo enquadramento e mesma câmera em cada plano (de onde olha, o que preenche o quadro).",
        "- Mesmo estilo (tamanho do pixel, textura, contorno, luz, paleta) e mesmo desenho das placas.",
        "- Mesmo fundo (o que aparece atrás, desfocado ou não).",
        "- Mesmo fecho e mesmo loop (último quadro igual ao primeiro, se o original faz isso).",
        "- **Mesmo SOM** (`igual_espectro.png`, em cima o original): se o original é só motor/efeito, o nosso não pode ter trilha (linhas horizontais = notas musicais). Mesmo tipo de som, mesmos estouros nos mesmos instantes, mesma faixa de frequência.",
        "- Única troca permitida: nome/@/marca da outra conta vira o @/marca do usuário no mesmo lugar.",
    ]
    rel = os.path.join(out, "igual_relatorio.md")
    open(rel, "w", encoding="utf-8").write("\n".join(md) + "\n")
    print("\n".join(md))
    print("\nrelatório:", rel)


if __name__ == "__main__":
    main()
