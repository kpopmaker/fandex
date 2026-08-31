from pathlib import Path
from datetime import datetime


OUTPUT_FILE = Path("FANDEX_FINAL_OPS_SUMMARY.txt")


content = f"""FANDEX Final Ops Summary
============================================================
createdAt: {datetime.now().isoformat(timespec='seconds')}

현재 운영 원칙
------------------------------------------------------------
FANDEX Python 데이터 파이프라인은 Codex/웹사이트 작업과 충돌하지 않도록
Python-only 방식으로 운영한다.

Python 작업 위치:
C:\\Users\\김종민\\Desktop\\naver_data_collector

웹사이트 작업 위치:
C:\\Users\\김종민\\Desktop\\fandex

중요:
Codex 작업 중에는 웹사이트 public/data를 건드리지 않는다.


평소 실행 명령
------------------------------------------------------------
cd %USERPROFILE%\\Desktop\\naver_data_collector
run_fandex_daily_python_only.bat


이 명령이 하는 일
------------------------------------------------------------
1. Bugs 차트 자동 수집
2. Bugs 결과를 music_chart_seed_v1.csv에 반영
3. YouTube v2 점수 생성
4. Music chart v1 점수 생성
5. FANDEX master v6 생성
6. status report 생성
7. health check 생성
8. timestamp/log/audit/backup/preview 파일 archive 이동
9. latest report와 latest health check는 루트에 유지
10. 웹사이트 public/data는 건드리지 않음


현재 핵심 결과 파일
------------------------------------------------------------
fandex_master_ranking_latest.json
fandex_master_artist_reports_latest.json
fandex_youtube_ranking_v2_latest.json
fandex_youtube_artist_reports_v2_latest.json
fandex_music_chart_ranking_v1_latest.json
fandex_music_chart_artist_reports_v1_latest.json
fandex_naver_ranking_v3_latest.json
music_chart_seed_v1.csv
youtube_video_metrics_v1.csv


현재 확인용 파일
------------------------------------------------------------
fandex_python_status_report_latest.txt
fandex_python_health_check_latest.txt


결과 확인 명령
------------------------------------------------------------
notepad fandex_python_status_report_latest.txt
notepad fandex_python_health_check_latest.txt

CMD에서 한글 깨짐 없이 확인:
powershell -NoProfile -Command "Get-Content .\\fandex_python_status_report_latest.txt -Encoding UTF8"
powershell -NoProfile -Command "Get-Content .\\fandex_python_health_check_latest.txt -Encoding UTF8"


YouTube 재수집이 필요한 날
------------------------------------------------------------
set YOUTUBE_API_KEY=진짜_키
py fandex_daily_python_only_v1.py --refresh-youtube

주의:
- API 키를 채팅에 붙여넣지 말 것
- 실제 YouTube API 키는 보통 AIza로 시작
- "실제_API_KEY" 같은 예시 문구를 그대로 넣지 말 것


Bugs만 갱신
------------------------------------------------------------
py fandex_music_refresh_bugs_python_only_v1.py


Bugs 갱신 없이 내부 점수만 다시 생성
------------------------------------------------------------
py fandex_daily_python_only_v1.py --skip-bugs


폴더 정리
------------------------------------------------------------
py fandex_archive_generated_files_v1.py --apply

archive로 이동되는 것:
- timestamp JSON
- audit CSV
- log CSV
- raw API JSON
- backup CSV
- preview CSV
- skipped JSON
- timestamp report TXT

루트에 유지되는 것:
- latest JSON
- seed CSV
- youtube_video_metrics_v1.csv
- 실행용 .py 파일
- fandex_python_status_report_latest.txt
- fandex_python_health_check_latest.txt


백업
------------------------------------------------------------
py fandex_backup_core_files_v1.py --apply

백업 위치:
backup\\YYYYMMDD_HHMMSS

백업 검증:
py fandex_verify_backup_v1.py


복구
------------------------------------------------------------
복구는 파일이 꼬였을 때만 사용한다.

복구 dry-run:
py fandex_restore_core_files_v1.py

특정 백업 dry-run:
py fandex_restore_core_files_v1.py backup\\YYYYMMDD_HHMMSS

실제 복구:
py fandex_restore_core_files_v1.py backup\\YYYYMMDD_HHMMSS --apply

복구 후 확인:
py fandex_python_health_check_v1.py


절대 실행 금지: Codex 작업 중
------------------------------------------------------------
아래 명령은 웹사이트 public/data를 건드릴 수 있으므로 Codex 작업 중 실행 금지.

py fandex_export_to_site_v1.py
py fandex_publish_all_v5.py
py fandex_publish_all_v5.py --refresh-youtube


현재 점수 체계
------------------------------------------------------------
FANDEX master v6:
네이버 누적점수 + YouTube 누적점수 + 음원/차트 누적점수

version:
fandex_master_v6_music_chart_uncapped_cumulative

scoreMode:
uncapped_cumulative_source_points


현재 Python-only 운영 상태
------------------------------------------------------------
정상 운영 기준:
- run_fandex_daily_python_only.bat 성공
- health check에서 OK: Python-only 운영 상태 정상
- latest report 생성
- latest health check 생성
- Website public/data was NOT touched 출력


최종 운영 명령 3개
------------------------------------------------------------
평소:
run_fandex_daily_python_only.bat

상태 확인:
notepad fandex_python_status_report_latest.txt

백업:
py fandex_backup_core_files_v1.py --apply
"""


OUTPUT_FILE.write_text(content, encoding="utf-8")

print("FANDEX final ops summary 생성 완료")
print(f"파일: {OUTPUT_FILE}")