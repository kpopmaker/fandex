from pathlib import Path


path = Path("naver_publish_quality_v3.py")

if not path.exists():
    raise SystemExit("naver_publish_quality_v3.py 파일을 찾지 못했습니다.")

text = path.read_text(encoding="utf-8-sig")
original = text

if "import locale" not in text:
    text = text.replace("import json\n", "import json\nimport locale\n")

old = '''def run_script(script):
    process = subprocess.run(
        [sys.executable, script],
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )

    output = (process.stdout or "") + "\\n" + (process.stderr or "")

    ok = process.returncode == 0

    for keyword in FAIL_KEYWORDS:
        if keyword in output:
            ok = False
            break

    return ok, process.returncode, output
'''

new = '''def run_script(script):
    console_encoding = locale.getpreferredencoding(False) or "utf-8"

    process = subprocess.run(
        [sys.executable, script],
        text=True,
        capture_output=True,
        encoding=console_encoding,
        errors="replace",
    )

    output = (process.stdout or "") + "\\n" + (process.stderr or "")

    ok = process.returncode == 0

    for keyword in FAIL_KEYWORDS:
        if keyword in output:
            ok = False
            break

    return ok, process.returncode, output
'''

if old not in text:
    raise SystemExit("교체할 run_script 함수를 찾지 못했습니다.")

text = text.replace(old, new)

path.write_text(text, encoding="utf-8")

if text == original:
    print("변경 없음")
else:
    print("publish 인코딩 패치 완료")