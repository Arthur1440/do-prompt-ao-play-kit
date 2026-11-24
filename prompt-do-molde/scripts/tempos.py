# Põe tempo em cada frase da narração e em cada linha do "Mapa de planos" do ROTEIRO,
# e marca o que cai nos primeiros 10 s (a prévia de cada direção).
#
# Uso:
#   python tempos.py <pasta_reels>/todo/<tema>/ROTEIRO_<tema>.md [--audio narracao.mp3] [--previa 10]
#
# Com --audio (ou se houver narracao*.mp3 na pasta do roteiro): transcreve com faster-whisper e usa os
# tempos reais. Sem áudio: estima no ritmo da voz do perfil (padrão 2,9 palavras/s) e avisa que é estimativa.
# Grava tempos.json ao lado do roteiro. Só informa; nada trava.
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402
RITMO = perfil_criador.ritmo()
PAL = re.compile(r"[0-9A-Za-zÀ-ÿ]+(?:[-'][0-9A-Za-zÀ-ÿ]+)*")


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    return "".join(c for c in w if unicodedata.category(c) != "Mn")


def texto_para_gravar(md):
    i = md.find("Texto para gravar")
    m = re.search(r"```[^\n]*\n(.*?)```", md[i:] if i >= 0 else md, re.S)
    return m.group(1) if m else ""


def mapa_de_planos(md):
    i = md.find("Mapa de planos")
    if i < 0:
        return []
    linhas = []
    for l in md[i:].splitlines()[1:]:
        if l.startswith("## "):
            break
        if l.startswith("|") and not re.match(r"\|\s*-", l):
            cel = [c.strip() for c in l.strip().strip("|").split("|")]
            if len(cel) >= 2 and cel[0].lower() not in ("frase", "trecho"):
                linhas.append((cel[0].strip('"“” '), cel[1]))
    return linhas


def transcrever(audio):
    import wave
    import numpy as np
    from faster_whisper import WhisperModel
    tmp = os.path.join(tempfile.mkdtemp(), "a.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", audio, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", tmp], check=True)
    # O Whisper recebe o áudio já decodificado: com o PyAV 19, o decode_audio do
    # faster-whisper 1.2.1 falha ("metadata_errors"). Com o array, o PyAV nem é usado.
    with wave.open(tmp, "rb") as w:
        tmp = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    try:
        m = WhisperModel("small", device="cpu", compute_type="int8")
    except RuntimeError:
        m = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=2)
    segs, _ = m.transcribe(tmp, language="pt", word_timestamps=True, vad_filter=True)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or []) if w.word.strip()]


def alinhar(palavras_texto, palavras_audio):
    """Para cada palavra do texto, o tempo da palavra correspondente no áudio (alinhamento guloso)."""
    a = [(norm(re.sub(r"[^\wÀ-ÿ-]", "", w)), s, e) for w, s, e in palavras_audio]
    tempos, j = [], 0
    for w in palavras_texto:
        alvo = norm(w)
        achou = None
        for k in range(j, min(j + 6, len(a))):
            if a[k][0] == alvo or (len(alvo) > 3 and a[k][0][:4] == alvo[:4]):
                achou = k
                break
        if achou is not None:
            tempos.append((a[achou][1], a[achou][2]))
            j = achou + 1
        else:
            ult = tempos[-1][1] if tempos else (a[j][1] if j < len(a) else 0)
            tempos.append((ult, ult + 0.3))
    return tempos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("--audio")
    ap.add_argument("--previa", type=float, default=10.0)
    a = ap.parse_args()
    pasta = os.path.dirname(os.path.abspath(a.roteiro))
    md = open(a.roteiro, encoding="utf-8").read()
    texto = texto_para_gravar(md)
    if not texto.strip():
        raise SystemExit("não achei o bloco ``` da seção 'Texto para gravar'")
    frases = [f.strip() for f in re.split(r"(?<=[.!?])\s+|\n+", texto) if PAL.search(f)]
    pal = [w for f in frases for w in PAL.findall(f)]

    audio = a.audio
    if not audio:
        achados = [f for f in glob.glob(os.path.join(pasta, "narracao*.*")) if f.lower().endswith((".mp3", ".wav", ".m4a"))]
        audio = achados[0] if achados else None
    if audio:
        print(f"áudio: {audio} (transcrevendo...)")
        tw = alinhar(pal, transcrever(audio))
        origem = "real"
    else:
        tw, t = [], 0.0
        for f in frases:
            ws = PAL.findall(f)
            for w in ws:
                tw.append((round(t, 2), round(t + 1 / RITMO, 2)))
                t += 1 / RITMO
            t += 0.25  # respiro entre frases
        origem = f"ESTIMADO a {RITMO} palavras/s (sem narracao.mp3); a produção re-sincroniza pela transcrição"

    print(f"tempos: {origem}\n")
    res_frases, k = [], 0
    for f in frases:
        n = len(PAL.findall(f))
        ini, fim = tw[k][0], tw[k + n - 1][1]
        k += n
        res_frases.append({"ini": round(ini, 1), "fim": round(fim, 1), "frase": f})
        marca = "  <- PRÉVIA" if ini < a.previa else ""
        print(f"[{ini:5.1f}-{fim:5.1f}] {f}{marca}")

    # mapa de planos: acha o trecho citado na sequência de palavras
    planos = []
    seq = [norm(w) for w in pal]
    for trecho, visual in mapa_de_planos(md):
        tp = [norm(w) for w in PAL.findall(trecho)]
        pos = None
        for i in range(len(seq) - len(tp) + 1):
            if tp and seq[i:i + len(tp)] == tp:
                pos = i
                break
        if pos is None and tp:  # tolera trecho resumido: acha a 1ª palavra longa
            chave = next((w for w in tp if len(w) > 4), tp[0])
            pos = next((i for i, w in enumerate(seq) if w == chave), None)
        t0 = round(tw[pos][0], 1) if pos is not None else None
        planos.append({"ini": t0, "trecho": trecho, "visual": visual})
    planos.sort(key=lambda p: (p["ini"] is None, p["ini"] or 0))
    if planos:
        print("\nMAPA DE PLANOS COM TEMPO (na ordem da fala)")
        for p in planos:
            t = f"{p['ini']:5.1f}" if p["ini"] is not None else "  ?  "
            marca = "  <- PRÉVIA" if p["ini"] is not None and p["ini"] < a.previa else ""
            print(f"[{t}] \"{p['trecho']}\" -> {p['visual']}{marca}")

    dur = round(tw[-1][1], 1) if tw else 0
    print(f"\nduração da fala: {dur} s | a prévia de {a.previa:.0f} s termina em: "
          f"\"{next((f['frase'] for f in reversed(res_frases) if f['ini'] < a.previa), '')}\"")
    json.dump({"origem": origem, "duracao_fala_s": dur, "frases": res_frases, "planos": planos},
              open(os.path.join(pasta, "tempos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"gravado {os.path.join(pasta, 'tempos.json')}")


if __name__ == "__main__":
    main()
