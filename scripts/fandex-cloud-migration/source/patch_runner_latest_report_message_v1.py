from pathlib import Path


path = Path("run_fandex_daily_python_only.bat")

if not path.exists():
    raise SystemExit("run_fandex_daily_python_only.bat 파일을 찾지 못했습니다.")

text = path.read_text(encoding="utf-8-sig")
original = text

old = '''echo Latest status report is inside archive if it was generated.
echo Website public/data was NOT touched.
'''

new = '''echo Latest status report:
echo fandex_python_status_report_latest.txt
echo.
dir fandex_python_status_report_latest.txt
echo.
echo Website public/data was NOT touched.
'''

if old not in text:
    raise SystemExit("교체할 기존 문구를 찾지 못했습니다.")

text = text.replace(old, new)
path.write_text(text, encoding="utf-8")

print("run_fandex_daily_python_only.bat latest report 안내 문구 패치 완료")