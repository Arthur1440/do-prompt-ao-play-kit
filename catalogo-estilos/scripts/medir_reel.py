"""Medidor de ritmo de um reel, contra a referência @desmontandoomundo (muro de arrimo, 19 mi).

Uso:
  py -X utf8 -I medir_reel.py VIDEO.mp4 [--palavras palavras.json] [--previa]

--previa: para os 10 s de prévia de cada direção (não mede LUFS nem o trecho final).
SÓ INFORMA, não trava a produção (regra do usuário, 16/11/2026): a narração enviada é a que vale, sem meta
de palavras por minuto nem de velocidade de fala; a fala aparece como INFO. Os itens de imagem saem como OK ou
ATENÇÃO, para a sessão de produção corrigir se fizer sentido. Sempre sai com código 0.

Mede:
- fala: palavras por minuto e pausas (a pausa planejada da virada "Esse vídeo foi feito com IA" é ignorada);
- cortes: maior trecho sem plano novo e média por plano (ffmpeg scdet), só até a virada;
- primeiro segundo: quanto a imagem muda entre o quadro 0 e 1 s (quadro 0 parado reprova);
- nitidez: borda de cima e de baixo contra o centro (tilt-shift/borrão forte reprova);
- som: LUFS integrado (só no vídeo completo).

Referência medida em 16/11/2026: muro 214 palavras/min, maior pausa 0,46 s, soma das pausas > 0,3 s = 7,1 s em 142 s;
um plano novo a cada frase (amostra de quadros). Piscina (reprovada pelo usuário): 193 palavras/min, pausa 1,4 s,
14 cortes em 153 s, maior trecho 42 s.
"""
import argparse, json, os, re, subprocess, sys, tempfile

LIM = {
    "wpm_min": 205,
    "pausa_max": 0.50,
    "trecho_max": 5.0,
    "plano_medio_max": 3.5,
    # calibrado em 16/11: Sisteminha 19,4 e milpa 18,9 (romperam), BK 22,6, pitaya 13,6; quintal 7,1 e piscina 4,7
    "mov1s_min": 10.0,
    # calibrado em 16/11: tilt-shift 0,01-0,07 (Sisteminha, pitaya, piscina); toon 0,21-0,87 (quintal, milpa, BK)
    "nitidez_min": 0.15,
    # centro: piscina 168 (macia demais); os outros 855-2752
    "centro_min": 400,
    "lufs": (-15.0, -13.0),
}


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def duracao(v):
    r = sh(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", v])
    return float(r.stdout.strip())


def carregar_palavras(path):
    d = json.load(open(path, encoding="utf-8"))
    if isinstance(d, dict):
        d = d.get("words") or d.get("palavras") or next(iter(d.values()))
    out = []
    for x in d:
        if isinstance(x, dict) and "words" in x:
            for a in x["words"]:
                out.append((a[0], a[1], a[2]) if isinstance(a, list) else (a["start"], a["end"], a["word"]))
        elif isinstance(x, dict):
            out.append((x.get("start", x.get("a")), x.get("end", x.get("b")), x.get("word", x.get("w"))))
        else:
            out.append(tuple(x[:3]))
    return [(float(a), float(b), str(c).strip()) for a, b, c in out]


def transcrever(v):
    from faster_whisper import WhisperModel
    tmp = os.path.join(tempfile.gettempdir(), "medir_reel_audio.wav")
    sh(["ffmpeg", "-v", "error", "-y", "-i", v, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", tmp])
    # O Whisper recebe o áudio já decodificado: com o PyAV 19, o decode_audio do
    # faster-whisper 1.2.1 falha ("metadata_errors"). Com o array, o PyAV nem é usado.
    import wave
    import numpy as np
    with wave.open(tmp, "rb") as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    m = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(audio, language="pt", word_timestamps=True)
    return [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]


def norm(t):
    return re.sub(r"[^\wà-ú]", "", t.lower())


def achar_virada(w):
    """Índice da 1ª palavra da virada ("Esse vídeo foi feito com IA") e índice do "Quer" seguinte."""
    ws = [norm(x[2]) for x in w]
    for i in range(len(ws) - 2):
        if ws[i] == "feito" and ws[i + 1] == "com":
            ini = max(0, i - 3)
            fim = next((j for j in range(i, len(ws)) if ws[j] == "quer"), len(ws) - 1)
            return ini, fim
    return None, None


def medir_fala(w):
    ini, fim = achar_virada(w)
    corpo = w[:ini] if ini else w
    dur = corpo[-1][1] - corpo[0][0]
    wpm = len(corpo) / dur * 60
    pausas = []
    for i in range(len(w) - 1):
        if ini is not None and ini - 1 <= i <= fim:
            continue
        g = w[i + 1][0] - w[i][1]
        pausas.append((g, w[i][1], f"{w[i][2]} | {w[i+1][2]}"))
    pausas.sort(reverse=True)
    t_virada = w[ini][0] if ini else None
    return wpm, pausas, t_virada, sum(p[0] for p in pausas if p[0] > 0.3)


def medir_cortes(v, ate):
    r = sh(["ffmpeg", "-hide_banner", "-i", v, "-vf", "scale=270:-1,scdet=threshold=12", "-an", "-f", "null", "-"])
    ts = [float(x) for x in re.findall(r"lavfi\.scd\.time: ([0-9.]+)", r.stderr)]
    ts = [t for t in ts if t < ate]
    marcos = [0.0] + ts + [ate]
    trechos = [(marcos[i + 1] - marcos[i], marcos[i]) for i in range(len(marcos) - 1)]
    maior = max(trechos)
    return len(ts), maior, ate / max(1, len(trechos))


def quadros(v, tempos, larg=270):
    import cv2
    cap = cv2.VideoCapture(v)
    out = []
    for t in tempos:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, f = cap.read()
        if not ok:
            continue
        h = int(f.shape[0] * larg / f.shape[1])
        out.append(cv2.cvtColor(cv2.resize(f, (larg, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY))
    cap.release()
    return out


def medir_mov1s(v):
    import numpy as np
    fs = quadros(v, [0.0, 0.25, 0.5, 0.75, 1.0])
    return max(float(np.mean(np.abs(fs[0].astype(int) - f.astype(int)))) for f in fs[1:])


def medir_nitidez(v, ate):
    import cv2, numpy as np
    tempos = [ate * (i + 0.5) / 10 for i in range(10)]
    razoes = []
    centros = []
    # 180 px de largura com INTER_AREA: tira o grão, que enganava o Laplaciano em 540 px
    for g in quadros(v, tempos, larg=180):
        h = g.shape[0]
        faixa = lambda a, b: cv2.Laplacian(g[int(a * h):int(b * h)], cv2.CV_64F).var()
        centro = faixa(0.40, 0.60)
        bordas = (faixa(0.04, 0.18) + faixa(0.80, 0.94)) / 2
        if centro > 1:
            razoes.append(min(bordas / centro, 2.0))
            centros.append(centro)
    if not razoes:
        return 0.0, 0.0
    return float(np.median(razoes)), float(np.median(centros))


def medir_lufs(v):
    r = sh(["ffmpeg", "-hide_banner", "-i", v, "-af", "ebur128", "-f", "null", "-"])
    m = re.findall(r"I:\s+(-?[0-9.]+) LUFS", r.stderr)
    return float(m[-1]) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--palavras")
    ap.add_argument("--previa", action="store_true")
    a = ap.parse_args()
    v = a.video
    eh_video = not v.lower().endswith((".wav", ".mp3", ".m4a"))
    dur = duracao(v)
    w = carregar_palavras(a.palavras) if a.palavras else transcrever(v)
    linhas = []

    def item(nome, valor, meta, ok):
        linhas.append((nome, valor, meta, "OK" if ok else "ATENÇÃO"))

    def info(nome, valor, ref):
        linhas.append((nome, valor, ref, "INFO"))

    wpm, pausas, t_virada, soma = medir_fala(w)
    # sem meta de fala: a voz enviada pelo usuário é a que vale (16/11/2026)
    info("Fala (palavras/min, sem a virada)", f"{wpm:.0f}", "muro 214")
    pmax = pausas[0] if pausas else (0, 0, "")
    info("Maior pausa (fora a da virada)", f"{pmax[0]:.2f} s em {pmax[1]:.1f} s ({pmax[2]})", "muro 0,46 s")
    longas = [p for p in pausas if p[0] > LIM["pausa_max"]]
    ate = t_virada if (t_virada and not a.previa) else dur

    if eh_video:
        n, (maior, inicio), medio = medir_cortes(v, ate)
        item("Maior trecho sem corte", f"{maior:.1f} s (começa em {inicio:.1f} s)", f"<= {LIM['trecho_max']:.1f} s",
             maior <= LIM["trecho_max"])
        item("Duração média de plano", f"{medio:.1f} s ({n} cortes até {ate:.0f} s)",
             f"<= {LIM['plano_medio_max']:.1f} s", medio <= LIM["plano_medio_max"])
        mov = medir_mov1s(v)
        item("Movimento no 1º segundo", f"{mov:.1f}", f">= {LIM['mov1s_min']:.1f}", mov >= LIM["mov1s_min"])
        nit, centro = medir_nitidez(v, ate)
        item("Nitidez das bordas / centro", f"{nit:.2f}", f">= {LIM['nitidez_min']:.2f}", nit >= LIM["nitidez_min"])
        item("Nitidez do centro", f"{centro:.0f}", f">= {LIM['centro_min']}", centro >= LIM["centro_min"])
        if not a.previa:
            lufs = medir_lufs(v)
            ok = lufs is not None and LIM["lufs"][0] <= lufs <= LIM["lufs"][1]
            item("Volume integrado (LUFS)", f"{lufs}", "-14 ± 1", ok)

    print(f"\nMEDIDOR DE REEL  ·  {os.path.basename(v)}  ·  {dur:.1f} s  ·  {len(w)} palavras\n")
    larg = max(len(x[0]) for x in linhas)
    for nome, valor, meta, st in linhas:
        print(f"  {st:<10} {nome:<{larg}}  {valor}   ({meta})")
    if longas:
        print(f"\n  Pausas acima de {LIM['pausa_max']:.2f} s ({len(longas)}, soma das pausas > 0,3 s = {soma:.1f} s):")
        for g, t, txt in longas[:10]:
            print(f"    {g:.2f} s em {t:.1f} s  ·  {txt}")
    atencao = [x for x in linhas if x[3] == "ATENÇÃO"]
    print("\n  RESULTADO (informativo, não trava):",
          "tudo OK" if not atencao else f"{len(atencao)} item(ns) de imagem para olhar")
    sys.exit(0)


if __name__ == "__main__":
    main()
