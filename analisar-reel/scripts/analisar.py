# Analisa um reel: transcrição por palavra, cortes de cena, ritmo, quadros, folhas de contato,
# paleta e áudio (LUFS, música por baixo da voz, BPM, cortes no tempo da batida).
# Uso: py -X utf8 -P analisar.py C:/.../video.mp4 [--saida PASTA] [--lingua pt|en|auto]
#        [--modelo small|medium] [--sem-transcricao]
# Grava em PASTA (padrão: pasta do vídeo): analise.json, transcricao.txt, palavras.json,
#   legendas.srt, quadros/*.jpg, folha_gancho.jpg, folha_01.jpg ..., resumo.md
import argparse
import json
import math
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONTE = next((f for f in ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"] if os.path.exists(f)), None)


def fonte(t):
    return ImageFont.truetype(FONTE, t) if FONTE else ImageFont.load_default()


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def probe(v):
    r = sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
            "stream=width,height,r_frame_rate:format=duration", "-of", "json", v])
    d = json.loads(r.stdout)
    st = d["streams"][0]
    n, m = st["r_frame_rate"].split("/")
    tem_audio = "audio" in sh(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type",
                               "-of", "csv=p=0", v]).stdout
    return {"duracao_s": round(float(d["format"]["duration"]), 2), "largura": st["width"],
            "altura": st["height"], "fps": round(int(n) / max(1, int(m)), 2), "tem_audio": tem_audio}


def mmss(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"


# ---------------------------------------------------------------- transcrição
def transcrever(wav, lingua, modelo):
    from faster_whisper import WhisperModel
    try:
        m = WhisperModel(modelo, device="cpu", compute_type="int8")
    except RuntimeError as e:  # RAM cheia (mkl_malloc): cai para o modelo menor
        print(f"  sem memória para '{modelo}' ({e}); usando 'base' (transcrição menos precisa)")
        m = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=2)
    # O WAV (mono, 16 kHz) é lido aqui e entregue ao Whisper já decodificado: com o PyAV 19,
    # o decode_audio do faster-whisper 1.2.1 falha ("metadata_errors"). Com o array, o PyAV nem é usado.
    # Lido com o wave da biblioteca padrão (o soundfile nem sempre está instalado).
    import wave
    with wave.open(wav, "rb") as w:
        sr, canais, largura = w.getframerate(), w.getnchannels(), w.getsampwidth()
        dados = w.readframes(w.getnframes())
    if sr != 16000 or largura != 2:
        raise RuntimeError(f"o WAV para o Whisper precisa ser PCM 16 bits a 16 kHz (veio {sr} Hz, {8 * largura} bits)")
    audio_16k = np.frombuffer(dados, dtype=np.int16).astype(np.float32) / 32768.0
    if canais > 1:
        audio_16k = audio_16k.reshape(-1, canais).mean(axis=1)
    segs, info = m.transcribe(audio_16k, language=None if lingua == "auto" else lingua,
                              word_timestamps=True, beam_size=5, vad_filter=True)
    palavras, frases = [], []
    for s in segs:
        ws = [{"w": w.word.strip(), "a": round(w.start, 2), "b": round(w.end, 2), "p": round(w.probability, 2)}
              for w in (s.words or []) if w.word.strip()]
        palavras += ws
        frases.append({"a": round(s.start, 2), "b": round(s.end, 2), "texto": s.text.strip()})
    return palavras, frases, info.language


def srt(palavras, caminho):
    def ts(t):
        h, r = divmod(t, 3600)
        mi, se = divmod(r, 60)
        return f"{int(h):02d}:{int(mi):02d}:{int(se):02d},{int(round((se % 1) * 1000)):03d}"
    blocos, cur = [], []
    for w in palavras:
        cur.append(w)
        if len(cur) >= 4 or cur[-1]["b"] - cur[0]["a"] > 1.6 or w["w"][-1:] in ".,!?;:":
            blocos.append(cur)
            cur = []
    if cur:
        blocos.append(cur)
    with open(caminho, "w", encoding="utf-8") as f:
        for i, c in enumerate(blocos, 1):
            f.write(f"{i}\n{ts(c[0]['a'])} --> {ts(c[-1]['b'])}\n{' '.join(x['w'] for x in c)}\n\n")


def medir_fala(palavras, dur):
    if not palavras:
        return {"tem_fala": False}
    a0, b1 = palavras[0]["a"], palavras[-1]["b"]
    pausas = [(palavras[i]["b"], palavras[i + 1]["a"]) for i in range(len(palavras) - 1)
              if palavras[i + 1]["a"] - palavras[i]["b"] >= 0.6]
    tempo_falando = sum(w["b"] - w["a"] for w in palavras)
    return {
        "tem_fala": True,
        "palavras": len(palavras),
        "primeira_palavra_s": a0,
        "ultima_palavra_s": b1,
        "palavras_por_min": round(len(palavras) / max(0.1, (b1 - a0)) * 60),
        "palavras_por_min_video_todo": round(len(palavras) / dur * 60),
        "gancho_0a3s": " ".join(w["w"] for w in palavras if w["a"] < 3.0),
        "gancho_0a5s": " ".join(w["w"] for w in palavras if w["a"] < 5.0),
        "pausas_ge_0_6s": [{"de": round(x, 2), "ate": round(y, 2), "dur": round(y - x, 2)} for x, y in pausas],
        "fala_cobre_pct": round(100 * tempo_falando / dur),
        "palavras_baixa_confianca": [w["w"] for w in palavras if w["p"] < 0.5][:30],
    }


# ---------------------------------------------------------------- cortes
def cortes(v, fps):
    cap = cv2.VideoCapture(v)
    hist_ant, peq_ant = None, None
    difs, movs = [], []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        peq = cv2.resize(fr, (72, 128), interpolation=cv2.INTER_AREA)
        hsv = cv2.cvtColor(peq, cv2.COLOR_BGR2HSV)
        h = cv2.calcHist([hsv], [0, 1, 2], None, [16, 8, 8], [0, 180, 0, 256, 0, 256])
        cv2.normalize(h, h)
        if hist_ant is None:
            difs.append(0.0)
            movs.append(0.0)
        else:
            difs.append(float(cv2.compareHist(hist_ant, h, cv2.HISTCMP_BHATTACHARYYA)))
            movs.append(float(np.mean(cv2.absdiff(peq, peq_ant))) / 255.0)
        hist_ant, peq_ant = h, peq
    cap.release()
    d = np.array(difs)
    mv = np.array(movs)
    if len(d) < 3:
        return [], mv, len(d)
    med = float(np.median(d))
    mad = float(np.median(np.abs(d - med))) + 1e-6
    limiar = max(0.28, med + 8 * mad)
    minimo = int(max(1, round(0.25 * fps)))
    idx, ult = [], -minimo
    for i in range(1, len(d)):
        pico_local = d[i] >= d[max(0, i - 2):i + 3].max()
        salto_pixel = mv[i] > 0.12 and mv[i] > 3 * (np.median(mv[max(0, i - 15):i]) + 1e-3)
        if ((d[i] > limiar and pico_local) or (salto_pixel and d[i] > 0.18)) and i - ult >= minimo:
            idx.append(i)
            ult = i
    return idx, mv, len(d)


# ---------------------------------------------------------------- quadros e folhas
def ler_quadro(cap, t, fps):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * fps)))
    ok, fr = cap.read()
    return cv2.cvtColor(fr, cv2.COLOR_BGR2RGB) if ok else None


def folha(itens, caminho, colunas=5, larg=216):
    """itens: lista de (np_rgb, titulo, texto)."""
    alt = int(larg * 16 / 9)
    faixa = 70
    linhas = math.ceil(len(itens) / colunas)
    img = Image.new("RGB", (colunas * larg + (colunas + 1) * 6, linhas * (alt + faixa) + (linhas + 1) * 6), (18, 18, 18))
    dr = ImageDraw.Draw(img)
    f1, f2 = fonte(15), fonte(12)
    for k, (fr, tit, txt) in enumerate(itens):
        x = 6 + (k % colunas) * (larg + 6)
        y = 6 + (k // colunas) * (alt + faixa + 6)
        if fr is not None:
            im = Image.fromarray(fr)
            im.thumbnail((larg, alt))
            img.paste(im, (x + (larg - im.width) // 2, y + (alt - im.height) // 2))
        dr.text((x + 3, y + alt + 3), tit, fill=(255, 210, 60), font=f1)
        linhas_txt, cur = [], ""
        for p in (txt or "").split():
            if len(cur) + len(p) + 1 > 30:
                linhas_txt.append(cur)
                cur = p
            else:
                cur = (cur + " " + p).strip()
        if cur:
            linhas_txt.append(cur)
        for j, l in enumerate(linhas_txt[:3]):
            dr.text((x + 3, y + alt + 22 + j * 15), l, fill=(230, 230, 230), font=f2)
    img.save(caminho, quality=88)


def paleta(cap, dur, fps, n=6):
    px = []
    for t in np.linspace(0.2, max(0.3, dur - 0.2), 24):
        fr = ler_quadro(cap, float(t), fps)
        if fr is not None:
            px.append(cv2.resize(fr, (36, 64)).reshape(-1, 3))
    if not px:
        return []
    z = np.float32(np.concatenate(px))
    _, lab, cen = cv2.kmeans(z, n, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0), 3,
                             cv2.KMEANS_PP_CENTERS)
    cont = np.bincount(lab.flatten(), minlength=n)
    ordem = np.argsort(-cont)
    return [{"hex": "#%02x%02x%02x" % tuple(int(c) for c in cen[i]), "pct": round(100 * cont[i] / cont.sum())}
            for i in ordem]


# ---------------------------------------------------------------- áudio
def audio(wav_48, palavras, cortes_s, dur):
    import soundfile as sf
    res = {}
    y, sr = sf.read(wav_48, always_2d=False)
    if y.ndim > 1:
        y = y.mean(axis=1)
    try:
        import pyloudnorm as pyln
        res["lufs_integrado"] = round(float(pyln.Meter(sr).integrated_loudness(y)), 1)
    except Exception as e:
        res["lufs_integrado"] = f"erro: {e}"
    # energia por janela de 0,1 s
    jan = int(sr * 0.1)
    n = len(y) // jan
    rms = np.sqrt(np.mean(y[:n * jan].reshape(n, jan) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    t = np.arange(n) * 0.1 + 0.05
    fala = np.zeros(n, bool)
    for w in palavras:
        fala[(t >= w["a"] - 0.15) & (t <= w["b"] + 0.15)] = True
    sem_fala = db[~fala]
    com_fala = db[fala]
    res["db_medio_com_fala"] = round(float(np.median(com_fala)), 1) if com_fala.size else None
    res["db_medio_sem_fala"] = round(float(np.median(sem_fala)), 1) if sem_fala.size else None
    silencio = float(np.mean(sem_fala < -50)) if sem_fala.size else 0
    if sem_fala.size < 5:
        res["fundo"] = "fala o tempo todo: não dá para medir o fundo nos intervalos"
    elif res["db_medio_sem_fala"] > -38:
        res["fundo"] = "trilha ou som ambiente forte nos intervalos da fala"
    elif res["db_medio_sem_fala"] > -52:
        res["fundo"] = "trilha baixa por baixo da voz"
    else:
        res["fundo"] = "silêncio nos intervalos (sem trilha contínua)"
    res["silencio_nos_intervalos_pct"] = round(100 * silencio)
    # curva por segundo
    por_s = [round(float(np.median(db[(t >= s) & (t < s + 1)])), 1) for s in range(int(math.ceil(dur)))
             if np.any((t >= s) & (t < s + 1))]
    res["db_por_segundo"] = por_s
    try:
        import librosa
        y22 = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=22050)
        tempo, batidas = librosa.beat.beat_track(y=y22, sr=22050)
        bt = librosa.frames_to_time(batidas, sr=22050)
        res["bpm_estimado"] = round(float(np.atleast_1d(tempo)[0]))
        if len(bt) and cortes_s:
            perto = [min(abs(bt - c)) <= 0.08 for c in cortes_s]
            res["cortes_na_batida_pct"] = round(100 * sum(perto) / len(perto))
        onset = librosa.onset.onset_strength(y=y22, sr=22050)
        res["picos_de_som_s"] = [round(float(x), 2) for x in
                                  librosa.frames_to_time(librosa.onset.onset_detect(onset_envelope=onset, sr=22050,
                                                                                    delta=0.5), sr=22050)][:80]
    except Exception as e:
        res["bpm_estimado"] = f"erro: {e}"
    return res


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--saida")
    ap.add_argument("--lingua", default="auto")
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--sem-transcricao", action="store_true")
    a = ap.parse_args()
    v = os.path.abspath(a.video)
    out = os.path.abspath(a.saida or os.path.dirname(v))
    os.makedirs(os.path.join(out, "quadros"), exist_ok=True)

    info = probe(v)
    dur, fps = info["duracao_s"], info["fps"]
    print(f"vídeo {info['largura']}x{info['altura']} {fps} fps {dur} s")

    tmp = tempfile.mkdtemp(prefix="analisar_reel_")
    wav16 = os.path.join(tmp, "a16.wav")
    wav48 = os.path.join(tmp, "a48.wav")
    palavras, frases, lingua = [], [], None
    if info["tem_audio"]:
        sh(["ffmpeg", "-v", "error", "-y", "-i", v, "-ac", "1", "-ar", "16000", wav16])
        sh(["ffmpeg", "-v", "error", "-y", "-i", v, "-ac", "1", "-ar", "48000", wav48])
        if not a.sem_transcricao:
            print("transcrevendo (faster-whisper %s)..." % a.modelo)
            palavras, frases, lingua = transcrever(wav16, a.lingua, a.modelo)

    print("detectando cortes...")
    idx, mov, nq = cortes(v, fps)
    fps_real = nq / dur if dur else fps
    cortes_s = [round(i / fps_real, 2) for i in idx]
    limites = [0.0] + cortes_s + [dur]
    planos = []
    for k in range(len(limites) - 1):
        ini, fim = limites[k], limites[k + 1]
        fi, ff = int(ini * fps_real) + 1, max(int(ini * fps_real) + 2, int(fim * fps_real) - 1)
        m = float(np.mean(mov[fi:ff])) if ff > fi and fi < len(mov) else 0.0
        fala = " ".join(w["w"] for w in palavras if ini <= (w["a"] + w["b"]) / 2 < fim)
        planos.append({"n": k + 1, "ini": round(ini, 2), "fim": round(fim, 2), "dur": round(fim - ini, 2),
                       "movimento": round(m * 100, 1),
                       # % de diferença média entre quadros: <0,15 travado; <0,8 câmera lenta (push-in,
                       # respiração); <2,5 ação/câmera andando; acima disso agitado (whip, sacudida, partícula)
                       "tipo_mov": ("parado" if m < 0.0015 else "lento" if m < 0.008
                                    else "médio" if m < 0.025 else "intenso"),
                       "fala": fala})
    durs = np.array([p["dur"] for p in planos])
    ritmo = {
        "planos": len(planos),
        "cortes_por_min": round(len(cortes_s) / dur * 60, 1),
        "plano_medio_s": round(float(durs.mean()), 2),
        "plano_mediano_s": round(float(np.median(durs)), 2),
        "plano_mais_longo_s": round(float(durs.max()), 2),
        "cortes_nos_3_primeiros_s": sum(1 for c in cortes_s if c < 3),
        "primeiro_corte_s": cortes_s[0] if cortes_s else None,
        "movimento_medio": round(float(mov.mean() * 100), 1),
    }
    # ritmo por trecho de 10 s
    ritmo["cortes_por_trecho_10s"] = [sum(1 for c in cortes_s if s <= c < s + 10) for s in range(0, int(dur) + 1, 10)]

    print("salvando quadros e folhas de contato...")
    cap = cv2.VideoCapture(v)
    gancho = []
    for t in [0.0, 0.3, 0.7, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]:
        if t < dur:
            fr = ler_quadro(cap, t, fps_real)
            if fr is not None and t == 0.0:
                Image.fromarray(fr).save(os.path.join(out, "quadros", "quadro_0.jpg"), quality=92)
            fala = " ".join(w["w"] for w in palavras if t - 0.5 <= w["a"] < t + 0.5)
            gancho.append((fr, f"{t:.1f} s", fala))
    folha(gancho, os.path.join(out, "folha_gancho.jpg"), colunas=5, larg=260)

    itens = []
    for p in planos:
        t = min(p["fim"] - 0.05, p["ini"] + min(0.4, p["dur"] / 2))
        fr = ler_quadro(cap, t, fps_real)
        if fr is not None:
            Image.fromarray(fr).save(os.path.join(out, "quadros", f"plano_{p['n']:03d}_{p['ini']:06.2f}s.jpg"), quality=85)
        itens.append((fr, f"#{p['n']} {mmss(p['ini'])} ({p['dur']:.1f}s) {p['tipo_mov']}", p["fala"]))
    # planos longos (> 4 s) ganham mais quadros na folha, para ver o que muda dentro deles
    folhas = []
    por_folha = 20
    for k in range(0, len(itens), por_folha):
        c = os.path.join(out, f"folha_{k // por_folha + 1:02d}.jpg")
        folha(itens[k:k + por_folha], c)
        folhas.append(os.path.basename(c))
    longos = [p for p in planos if p["dur"] > 4]
    if longos:
        extra = []
        for p in longos[:8]:
            for t in np.linspace(p["ini"] + 0.2, p["fim"] - 0.2, 5):
                fala = " ".join(w["w"] for w in palavras if t - 0.6 <= w["a"] < t + 0.6)
                extra.append((ler_quadro(cap, float(t), fps_real), f"#{p['n']} {mmss(float(t))}", fala))
        folha(extra, os.path.join(out, "folha_planos_longos.jpg"), colunas=5)
        folhas.append("folha_planos_longos.jpg")
    pal = paleta(cap, dur, fps_real)
    cap.release()

    aud = {}
    if info["tem_audio"]:
        print("medindo áudio...")
        aud = audio(wav48, palavras, cortes_s, dur)

    fala = medir_fala(palavras, dur)
    fala["lingua"] = lingua
    res = {"video": v, "info": info, "fala": fala, "ritmo": ritmo, "audio": aud, "paleta": pal,
           "cortes_s": cortes_s, "planos": planos, "frases": frases,
           "folhas": ["folha_gancho.jpg"] + folhas}
    meta_p = os.path.join(os.path.dirname(v), "meta.json")
    if os.path.exists(meta_p):
        res["meta"] = json.load(open(meta_p, encoding="utf-8"))
    json.dump(res, open(os.path.join(out, "analise.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(palavras, open(os.path.join(out, "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False)
    if palavras:
        srt(palavras, os.path.join(out, "legendas.srt"))
    with open(os.path.join(out, "transcricao.txt"), "w", encoding="utf-8") as f:
        for fr_ in frases:
            f.write(f"[{mmss(fr_['a'])}] {fr_['texto']}\n")

    # resumo.md
    L = [f"# Medição automática: {os.path.basename(os.path.dirname(v))}", ""]
    m = res.get("meta") or {}
    if m:
        L += [f"- Conta: @{m.get('conta')} | postado {m.get('postado_em')} | curtidas {m.get('curtidas')} | "
              f"comentários {m.get('comentarios')} | views {m.get('views') or 'n/d'}",
              f"- Legenda: {(m.get('legenda') or '').strip()[:300]}"]
    L += [f"- Duração {dur} s | {info['largura']}x{info['altura']} | {fps} fps", ""]
    if fala.get("tem_fala"):
        L += ["## Fala", f"- Língua: {lingua} | {fala['palavras']} palavras | {fala['palavras_por_min']} palavras/min "
              f"(entre 1ª e última palavra) | 1ª palavra em {fala['primeira_palavra_s']} s | fala cobre {fala['fala_cobre_pct']}% do vídeo",
              f"- Gancho falado 0-3 s: \"{fala['gancho_0a3s']}\"",
              f"- Pausas >= 0,6 s: {len(fala['pausas_ge_0_6s'])}", ""]
    else:
        L += ["## Fala", "- Sem fala detectada (vídeo só com música/texto ou --sem-transcricao).", ""]
    L += ["## Ritmo", f"- {ritmo['planos']} planos | {ritmo['cortes_por_min']} cortes/min | plano médio {ritmo['plano_medio_s']} s "
          f"(mediana {ritmo['plano_mediano_s']} s, mais longo {ritmo['plano_mais_longo_s']} s)",
          f"- Cortes nos 3 primeiros s: {ritmo['cortes_nos_3_primeiros_s']} | 1º corte em {ritmo['primeiro_corte_s']} s",
          f"- Cortes por trecho de 10 s: {ritmo['cortes_por_trecho_10s']}", ""]
    if aud:
        L += ["## Áudio", f"- {aud.get('lufs_integrado')} LUFS | fundo: {aud.get('fundo')} | BPM ~{aud.get('bpm_estimado')} | "
              f"cortes na batida: {aud.get('cortes_na_batida_pct', 'n/d')}%", ""]
    L += ["## Paleta", " ".join(f"{c['hex']} ({c['pct']}%)" for c in pal), "",
          "## Planos", "", "| # | início | dur | mov. | fala |", "|---|---|---|---|---|"]
    for p in planos:
        L.append(f"| {p['n']} | {mmss(p['ini'])} | {p['dur']:.1f} | {p['tipo_mov']} | {p['fala'][:90]} |")
    L += ["", "Folhas de contato: " + ", ".join(res["folhas"])]
    open(os.path.join(out, "resumo.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")

    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    print(f"pronto: {out}")
    print(f"  {ritmo['planos']} planos, {ritmo['cortes_por_min']} cortes/min, "
          f"{fala.get('palavras', 0)} palavras, {aud.get('lufs_integrado', 'n/d')} LUFS")
    print("  folhas: " + ", ".join(res["folhas"]))


if __name__ == "__main__":
    main()
