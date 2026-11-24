# Confere se a pasta de um reel está pronta para a produção (skill produzir-reel).
# Uso:
#   python verificar_pasta.py <tema>            (procura em <pasta_reels>/todo/<tema>)
#   python verificar_pasta.py <caminho da pasta>
#   python verificar_pasta.py                   (lista os reels da todo que já têm PROMPT_PRODUCAO.txt)
# Saída: linhas OK / AVISO / ERRO e a etapa em que o reel está. Código 1 se houver ERRO.
import glob
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import perfil as perfil_criador  # noqa: E402

SKILLS = os.path.expanduser("~/.claude/skills")
TODO = os.path.normpath(os.path.join(perfil_criador.pasta_reels(), "todo"))


def duracao(arq):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except (OSError, subprocess.CalledProcessError, ValueError):
        return None


def memoria_gb():
    """Memória total do computador em GB (Windows, Linux ou Mac); None se não der para ler."""
    try:
        if sys.platform == "win32":
            import ctypes

            class M(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong), ("ullTotalPhys", ctypes.c_ulonglong),
                            ("ullAvailPhys", ctypes.c_ulonglong), ("ullTotalPageFile", ctypes.c_ulonglong),
                            ("ullAvailPageFile", ctypes.c_ulonglong), ("ullTotalVirtual", ctypes.c_ulonglong),
                            ("ullAvailVirtual", ctypes.c_ulonglong), ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
            m = M()
            m.dwLength = ctypes.sizeof(M)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            return m.ullTotalPhys / 1024 ** 3
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024 ** 3
    except (OSError, ValueError, AttributeError):
        return None


def listar():
    prontos = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(TODO, "*", "PROMPT_PRODUCAO.txt")))
    if not prontos:
        print(f"Nenhum reel em {TODO} tem PROMPT_PRODUCAO.txt. Rode a skill prompt-do-molde antes.")
        return 1
    print("Reels com prompt de produção pronto:")
    for t in prontos:
        print(f"  - {t}")
    return 0


def main():
    if len(sys.argv) < 2:
        return listar()
    alvo = sys.argv[1]
    pasta = alvo if os.path.isdir(alvo) else os.path.join(TODO, alvo)
    if not os.path.isdir(pasta):
        print(f"ERRO: a pasta {pasta} não existe.")
        listar()
        return 1
    erros = 0
    print(f"Pasta: {pasta}")

    prompt = os.path.join(pasta, "PROMPT_PRODUCAO.txt")
    if os.path.exists(prompt):
        texto = open(prompt, encoding="utf-8").read()
        print(f"OK    PROMPT_PRODUCAO.txt ({len(texto.splitlines())} linhas)")
        if "[" in texto and any(m in texto for m in ("[TÍTULO", "[tema]", "[DURAÇÃO", "[BLOCO A")):
            print("ERRO  o prompt ainda tem campos do modelo sem preencher: rode a prompt-do-molde de novo")
            erros += 1
        if "ESTIMADO" in texto.upper() and "REAL" not in texto.upper():
            print("AVISO os tempos do prompt são estimados: com o narracao.mp3 na pasta, a prompt-do-molde dá os tempos reais")
    else:
        print("ERRO  falta o PROMPT_PRODUCAO.txt: rode a skill prompt-do-molde com este reel")
        erros += 1
        texto = ""

    voz = os.path.join(pasta, "narracao.mp3")
    if not os.path.exists(voz):
        outras = glob.glob(os.path.join(pasta, "narracao*.mp3"))
        voz = outras[0] if outras else None
    if voz:
        d = duracao(voz)
        print(f"OK    {os.path.basename(voz)}" + (f" ({d:.1f} s)" if d else ""))
        if os.path.exists(prompt) and os.path.getmtime(voz) > os.path.getmtime(prompt) + 60:
            print("AVISO a voz foi salva depois do prompt: os tempos podem estar velhos. Rode a prompt-do-molde de novo (só o passo dos tempos)")
    else:
        print("ERRO  falta o narracao.mp3 na raiz da pasta: gere a voz (aula 7) ou grave no celular")
        erros += 1

    for nome in ("ROTEIRO_*.md", "NARRACAO_ELEVENLABS.md", "tempos.json"):
        achou = glob.glob(os.path.join(pasta, nome))
        print(("OK    " if achou else "AVISO falta ") + (os.path.basename(achou[0]) if achou else nome))

    for skill in ("remotion-best-practices", "threejs", "catalogo-estilos"):
        # Three.js: vale a skill geral "threejs" ou o pacote "threejs-*" (threejs-fundamentals etc.)
        achadas = [skill] if os.path.isdir(os.path.join(SKILLS, skill)) else []
        if not achadas and skill == "threejs":
            achadas = sorted(os.path.basename(p) for p in glob.glob(os.path.join(SKILLS, "threejs-*")) if os.path.isdir(p))
        if achadas:
            print(f"OK    skill {skill}" + (f" ({len(achadas)} skills threejs-*)" if achadas != [skill] else ""))
        else:
            print(f"AVISO skill {skill} não instalada: instale antes de começar (os comandos estão no prompt)")

    mem = memoria_gb()
    if mem:
        conc = 1 if mem <= 8 else 2 if mem <= 16 else 4
        print(f"INFO  memória: {mem:.0f} GB → render com --concurrency={conc} e --gl=angle (placa de vídeo); se o angle falhar, sem ele")
    for prog in ("node", "npx", "ffmpeg"):
        if not shutil.which(prog):
            print(f"ERRO  {prog} não encontrado no computador")
            erros += 1

    saida = os.path.join(pasta, "saida")
    previas = sorted(glob.glob(os.path.join(saida, "previa_*_10s.mp4")))
    finais = glob.glob(os.path.join(saida, "reel_*.mp4"))
    if finais:
        print(f"ETAPA vídeo final já existe ({os.path.basename(finais[0])}): falta só o ok para mover para a done")
    elif previas:
        print(f"ETAPA {len(previas)} prévia(s) prontas: espere a escolha da direção antes do vídeo inteiro")
    else:
        print("ETAPA nada produzido ainda: começar pela primeira entrega (3 direções e 10 s de cada)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
