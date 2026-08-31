from pathlib import Path


path = Path("fandex_archive_generated_files_v1.py")

if not path.exists():
    raise SystemExit("fandex_archive_generated_files_v1.py 파일을 찾지 못했습니다.")

text = path.read_text(encoding="utf-8-sig")

if '"fandex_python_status_report_latest.txt",' in text:
    print("이미 latest report 보호 설정이 있습니다.")
    raise SystemExit(0)

target = '''    "music_chart_targets_v1.csv",
'''

if target not in text:
    raise SystemExit("KEEP_EXACT 삽입 위치를 찾지 못했습니다.")

replacement = '''    "music_chart_targets_v1.csv",
    "fandex_python_status_report_latest.txt",
'''

text = text.replace(target, replacement)

path.write_text(text, encoding="utf-8")
print("archive latest report 보호 패치 완료")