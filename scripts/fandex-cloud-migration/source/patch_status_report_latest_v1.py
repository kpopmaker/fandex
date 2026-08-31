from pathlib import Path


path = Path("fandex_python_status_report_v1.py")

if not path.exists():
    raise SystemExit("fandex_python_status_report_v1.py 파일을 찾지 못했습니다.")

text = path.read_text(encoding="utf-8-sig")
original = text

old = '''    report_file = Path(f"fandex_python_status_report_v1_{now}.txt")
'''

new = '''    report_file = Path(f"fandex_python_status_report_v1_{now}.txt")
    latest_report_file = Path("fandex_python_status_report_latest.txt")
'''

text = text.replace(old, new)

old = '''    report_file.write_text(report_text, encoding="utf-8")

    print()
    print("FANDEX Python status report 생성 완료")
'''

new = '''    report_file.write_text(report_text, encoding="utf-8")
    latest_report_file.write_text(report_text, encoding="utf-8")

    print()
    print("FANDEX Python status report 생성 완료")
'''

text = text.replace(old, new)

old = '''    print(f"리포트 파일: {report_file}")
'''

new = '''    print(f"리포트 파일: {report_file}")
    print(f"최신 리포트 파일: {latest_report_file}")
'''

text = text.replace(old, new)

if text == original:
    raise SystemExit("변경된 내용이 없습니다. 이미 패치됐을 수 있습니다.")

path.write_text(text, encoding="utf-8")
print("fandex_python_status_report_v1.py latest report 패치 완료")