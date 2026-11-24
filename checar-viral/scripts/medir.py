# Mede uma narração de reel: o que dá para medir sem julgamento.
# uso:
#   py -X utf8 medir.py C:/caminho/narracao.mp3   (ou .mp4/.wav/.m4a: transcreve com faster-whisper)
#   py -X utf8 medir.py C:/caminho/texto.txt      (texto para gravar; tempos estimados no ritmo do perfil)
#   py -X utf8 medir.py C:/caminho/transcricao.json  (formato {"duracao":..,"words":[{"w","s","e"}]})
# Saída: imprime as medidas e grava <arquivo>.medicao.json ao lado do scratchpad indicado em --saida
# (padrão: mesma pasta do arquivo de entrada).
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402
RITMO = perfil_criador.ritmo()  # palavras por segundo da voz do perfil (padrão 2,9)
PALAVRA_PEDIDO = (perfil_criador.palavra_comentario() or "PLAY").lower()

GANHO = re.compile(
    r"(de\s+gra[çc]a|gr[áa]tis|infinit[ao]s?|nunca\s+mais\s+(comprar|pagar|gastar)|um\s+centavo|"
    r"R\s?\$|\breais\b|\bdinheiro\b|\beconomi[zs]|compre\s+um|leve\s+\d+|\bde\s+novo\s+sem\b|"
    r"\d+\s*(quilos?|kg|litros?|ovos?|p[ée]s)\b|\bmil\b)", re.I)
ENVIO = re.compile(r"\b(manda|mande|envia|envie|compartilha|marca|marque)\b", re.I)
PARTE2 = re.compile(r"(parte\s+(2|dois)|no\s+v[íi]deo\s+anterior|muita\s+gente\s+perguntou|como\s+eu\s+mostrei)", re.I)
DESMONTE = re.compile(r"(n[ãa]o\s+faz\s+milagre|n[ãa]o\s+funciona|quase\s+n[ãa]o\s+(ajudou|funcionou)|n[ãa]o\s+[ée]\s+para\s+todo)", re.I)
VICIOS = ["tá", "pra", "cê", "né", "tipo", "olha", "basicamente"]


def carregar(caminho):
    ext = os.path.splitext(caminho)[1].lower()
    if ext == ".json":
        t = json.load(open(caminho, encoding="utf8"))
        return t["words"], t["duracao"], "transcrição pronta"
    if ext in (".txt", ".md"):
        txt = open(caminho, encoding="utf8").read()
        txt = re.sub(r"\[[^\]]*\]", " ", txt)  # tags do ElevenLabs
        ws, t = [], 0.0
        for p in re.findall(r"\S+", txt):
            ws.append({"w": p, "s": round(t, 2), "e": round(t + 1 / RITMO, 2)})
            t += 1 / RITMO
        return ws, round(t, 1), f"texto (tempo estimado a {RITMO} palavras/s)"
    import subprocess, tempfile, wave
    import numpy as np
    from faster_whisper import WhisperModel
    # O Whisper recebe o áudio já decodificado: com o PyAV 19, o decode_audio do
    # faster-whisper 1.2.1 falha ("metadata_errors"). Com o array, o PyAV nem é usado.
    tmp = os.path.join(tempfile.mkdtemp(), "a16k.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", caminho, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", tmp], check=True)
    with wave.open(tmp, "rb") as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    m = WhisperModel("small", device="cpu", compute_type="int8")
    segs, info = m.transcribe(audio, language="pt", word_timestamps=True, vad_filter=True, beam_size=5)
    ws = [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for s in segs for w in s.words]
    return ws, round(info.duration, 1), "áudio transcrito (faster-whisper small)"


def frases(ws):
    out, cur, t0 = [], [], None
    for w in ws:
        if t0 is None:
            t0 = w["s"]
        cur.append(w["w"])
        if re.search(r"[.?!]$", w["w"]) and not w["w"].endswith(".."):  # reticências são pausa, não fim de frase
            out.append((t0, " ".join(cur))); cur, t0 = [], None
    if cur:
        out.append((t0, " ".join(cur)))
    return out


def medir(ws, dur):
    texto = " ".join(w["w"] for w in ws)
    fr = frases(ws)
    gancho = " ".join(w["w"] for w in ws if w["s"] < 4.0)
    primeira = fr[0][1] if fr else ""
    t_envio = None
    for i, w in enumerate(ws):
        if ENVIO.search(w["w"]):
            prox = " ".join(x["w"].lower() for x in ws[i + 1:i + 4])
            if re.search(r"\b(para|pra|pro|aquel[ea]|quem|um|uma|ess[ea])\b", prox):
                t_envio = w["s"]; break
    t_play = next((w["s"] for w in ws if re.sub(r"\W", "", w["w"]).lower() == PALAVRA_PEDIDO), None)
    t_ia = next((w["s"] for i, w in enumerate(ws) if re.sub(r"\W", "", w["w"]).lower() in ("ia", "iá")), None)
    numeros = re.findall(r"\b\d[\d.,]*\b|\b(dois|três|quatro|cinco|seis|sete|oito|nove|dez|vinte|trinta|quarenta|cinquenta|cem|cento|mil|milh[õo]es)\b", texto, re.I)
    return {
        "duracao_s": dur,
        "palavras": len(ws),
        "gancho_4s": gancho,
        "primeira_frase": primeira,
        "primeira_frase_palavras": len(primeira.split()),
        "ganho_no_gancho": bool(GANHO.search(gancho)),
        "ganho_achado": (GANHO.search(gancho).group(0) if GANHO.search(gancho) else None),
        "pedido_envio_s": t_envio,
        "pedido_envio_pct": round(100 * t_envio / dur) if t_envio is not None and dur else None,
        "play_s": t_play,
        "virada_ia_s": t_ia,
        "menciona_continuacao": bool(PARTE2.search(texto)),
        "desmonta_promessa": [m.group(0) for m in DESMONTE.finditer(texto)],
        "numeros_ditos": len(numeros),
        "vicios": [v for v in VICIOS if re.search(rf"(?<![\wÀ-ÿ]){re.escape(v)}(?![\wÀ-ÿ])", texto, re.I)],
        "frases": [{"s": t, "texto": f} for t, f in fr],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("uso: medir.py arquivo(.mp3/.mp4/.txt/.json) [--saida pasta]")
    src = sys.argv[1]
    saida = sys.argv[sys.argv.index("--saida") + 1] if "--saida" in sys.argv else os.path.dirname(os.path.abspath(src))
    ws, dur, origem = carregar(src)
    m = medir(ws, dur)
    m["origem"] = origem
    m["arquivo"] = os.path.abspath(src)
    dst = os.path.join(saida, os.path.splitext(os.path.basename(src))[0] + ".medicao.json")
    json.dump({"medicao": m, "words": ws}, open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"origem: {origem}\nduração: {m['duracao_s']} s · {m['palavras']} palavras")
    print(f"gancho (0–4 s): {m['gancho_4s']}")
    print(f"  ganho concreto no gancho: {'SIM (' + m['ganho_achado'] + ')' if m['ganho_no_gancho'] else 'NÃO'}"
          f" · 1ª frase com {m['primeira_frase_palavras']} palavras")
    pe = m["pedido_envio_s"]
    if pe is not None:
        print(f"pedido de envio: {pe:.1f} s ({m['pedido_envio_pct']}% do vídeo)")
    else:
        print("pedido de envio: NÃO TEM")
    print(f"virada IA: {m['virada_ia_s']} s · pedido {PALAVRA_PEDIDO.upper()}: {m['play_s']} s · números ditos: {m['numeros_ditos']}")
    if m["menciona_continuacao"]: print("ATENÇÃO: a fala se apresenta como continuação ('parte 2')")
    if m["desmonta_promessa"]: print(f"ATENÇÃO: a fala desmonta a promessa: {m['desmonta_promessa']}")
    if m["vicios"]: print(f"vícios na fala: {m['vicios']}")
    print("\nfrases com o segundo em que começam:")
    for f in m["frases"]:
        print(f"  {f['s']:5.1f}  {f['texto']}")
    print(f"\ngravado em {dst}")
