from pathlib import Path
from datetime import datetime


RUNBOOK_FILE = Path("FANDEX_PYTHON_ONLY_RUNBOOK.txt")

append_text = f"""

백업/복구/검증 운영
============================================================
updatedAt: {datetime.now().isoformat(timespec='seconds')}

핵심 파일 백업
------------------------------------------------------------
운영 파일, seed, latest JSON, runbook, report를 backup 폴더에 복사한다.

실행:
py fandex_backup_core_files_v1.py --apply

백업 위치:
backup\\YYYYMMDD_HHMMSS

백업 결과 확인:
dir backup

특정 백업 폴더 확인 예시:
dir backup\\20260711_162439


백업 검증
------------------------------------------------------------
backup_manifest.json과 실제 파일 개수/용량이 맞는지 검사한다.

최신 백업 검증:
py fandex_verify_backup_v1.py

특정 백업 검증:
py fandex_verify_backup_v1.py backup\\20260711_162439

정상 메시지:
OK: 백업 manifest와 실제 파일이 일치합니다.


복구 dry-run
------------------------------------------------------------
복구 전에 어떤 파일이 복구될지 확인한다.
실제 파일은 덮어쓰지 않는다.

최신 백업 dry-run:
py fandex_restore_core_files_v1.py

특정 백업 dry-run:
py fandex_restore_core_files_v1.py backup\\20260711_162439


실제 복구
------------------------------------------------------------
파일이 꼬였을 때만 사용한다.
실제 복구 시 현재 파일은 restore_safety_backup 폴더에 먼저 백업된다.

최신 백업에서 복구:
py fandex_restore_core_files_v1.py --apply

특정 백업에서 복구:
py fandex_restore_core_files_v1.py backup\\20260711_162439 --apply

복구 후 확인:
py fandex_python_health_check_v1.py
notepad fandex_python_health_check_latest.txt


현재 백업/복구 관련 파일
------------------------------------------------------------
fandex_backup_core_files_v1.py
fandex_restore_core_files_v1.py
fandex_verify_backup_v1.py

backup\\
restore_safety_backup\\


주의
------------------------------------------------------------
- 복구는 평소에 실행하지 않는다.
- 복구 전에는 항상 dry-run을 먼저 본다.
- Codex 작업 중에도 backup/restore는 naver_data_collector 안에서만 동작한다.
- 웹사이트 public/data는 건드리지 않는다.
"""


def main():
    if not RUNBOOK_FILE.exists():
        raise SystemExit("FANDEX_PYTHON_ONLY_RUNBOOK.txt 파일이 없습니다.")

    text = RUNBOOK_FILE.read_text(encoding="utf-8-sig")

    marker = "백업/복구/검증 운영"

    if marker in text:
        before = text.split(marker)[0].rstrip()
        text = before + "\n\n" + append_text.lstrip()
    else:
        text = text.rstrip() + "\n\n" + append_text.lstrip()

    RUNBOOK_FILE.write_text(text, encoding="utf-8")

    print("FANDEX_PYTHON_ONLY_RUNBOOK.txt 백업/복구/검증 섹션 업데이트 완료")
    print(f"파일: {RUNBOOK_FILE}")


if __name__ == "__main__":
    main()