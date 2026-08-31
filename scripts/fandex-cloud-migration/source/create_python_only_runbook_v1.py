from pathlib import Path
from datetime import datetime


RUNBOOK_FILE = Path("FANDEX_PYTHON_ONLY_RUNBOOK.txt")


content = f"""FANDEX Python-Only Runbook
============================================================
createdAt: {datetime.now().isoformat(timespec='seconds')}

목적
------------------------------------------------------------
이 문서는 FANDEX Python 데이터 파이프라인을 Codex/웹사이트 작업과 충돌 없이
운영하기 위한 기준 문서다.

현재 운영 원칙:
- Python 작업은 C:\\Users\\김종민\\Desktop\\naver_data_collector 안에서만 진행
- Codex 작업 중에는 C:\\Users\\김종민\\Desktop\\fandex\\public\\data를 건드리지 않음
- 웹사이트 export는 보류
- Python 내부 latest JSON만 갱신


기본 작업 위치
------------------------------------------------------------
cd %USERPROFILE%\\Desktop\\naver_data_collector


평소 일일 운영 명령
------------------------------------------------------------
run_fandex_daily_python_only.bat

이 명령이 하는 일:
1. Bugs 차트 자동 수집
2. Bugs 결과를 music_chart_seed_v1.csv에 반영
3. YouTube v2 점수 생성
4. Music chart v1 점수 생성
5. FANDEX master v6 생성
6. 최신 상태 리포트 생성
7. timestamp/log/audit/backup 파일 archive 이동
8. 웹사이트 public/data는 건드리지 않음


최신 결과 확인
------------------------------------------------------------
notepad fandex_python_status_report_latest.txt

또는 CMD에서:
type fandex_python_status_report_latest.txt

한글이 깨질 경우:
powershell -NoProfile -Command "Get-Content .\\fandex_python_status_report_latest.txt -Encoding UTF8"


현재 핵심 latest 파일
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


YouTube 재수집 포함 실행
------------------------------------------------------------
YouTube API를 새로 수집해야 할 때만 실행한다.

set YOUTUBE_API_KEY=진짜_키
py fandex_daily_python_only_v1.py --refresh-youtube

주의:
- 진짜 API 키를 채팅에 붙여넣지 말 것
- 실제 키는 보통 AIza로 시작
- "실제_API_KEY" 같은 예시 문구를 그대로 입력하면 실패함


Bugs 음원만 갱신
------------------------------------------------------------
py fandex_music_refresh_bugs_python_only_v1.py

이 명령이 하는 일:
1. Bugs chart 자동 수집
2. Bugs 결과 seed 반영
3. Music chart v1 점수 생성
4. FANDEX master v6 생성
5. 웹사이트 public/data는 건드리지 않음


Bugs 갱신 없이 내부 점수만 다시 생성
------------------------------------------------------------
py fandex_daily_python_only_v1.py --skip-bugs


절대 실행 금지: Codex 작업 중
------------------------------------------------------------
아래 명령은 웹사이트 public/data를 건드릴 수 있으므로 Codex 작업 중 실행 금지.

py fandex_export_to_site_v1.py
py fandex_publish_all_v5.py
py fandex_publish_all_v5.py --refresh-youtube


archive 정리
------------------------------------------------------------
생성 파일이 쌓이면 아래 명령으로 정리한다.

py fandex_archive_generated_files_v1.py --apply

보존되는 파일:
- latest JSON
- seed CSV
- youtube_video_metrics_v1.csv
- 실행용 .py 파일
- fandex_python_status_report_latest.txt

archive로 이동되는 파일:
- timestamp JSON
- audit CSV
- log CSV
- raw API JSON
- backup CSV
- preview CSV
- skipped JSON
- timestamp status report TXT


현재 공식 운영 명령 요약
------------------------------------------------------------
평소:
run_fandex_daily_python_only.bat

YouTube 새로 수집:
set YOUTUBE_API_KEY=진짜_키
py fandex_daily_python_only_v1.py --refresh-youtube

최신 리포트 확인:
notepad fandex_python_status_report_latest.txt

폴더 정리:
py fandex_archive_generated_files_v1.py --apply


현재 점수 체계
------------------------------------------------------------
FANDEX master v6:
네이버 누적점수 + YouTube 누적점수 + 음원/차트 누적점수

scoreMode:
uncapped_cumulative_source_points

현재 핵심 버전:
fandex_master_v6_music_chart_uncapped_cumulative


문제 발생 시
------------------------------------------------------------
1. 한글이 깨져 보일 때
   CMD의 type 대신 PowerShell Get-Content -Encoding UTF8 사용

2. YouTube API key not valid
   - YOUTUBE_API_KEY가 실제 키인지 확인
   - 예시 문구를 그대로 넣지 않았는지 확인
   - Google Cloud에서 YouTube Data API v3 활성화 확인
   - API restrictions에서 YouTube Data API v3 허용 확인

3. Bugs에서 MISS 발생
   - 해당 곡이 Bugs TOP100에 없을 수 있음
   - rank는 비워지고 Music chart 점수에서 스킵됨
   - skipped JSON이 archive에 저장됨

4. Codex와 충돌 우려
   - export 명령 실행 금지
   - Python-only 명령만 사용

5. 최신 리포트가 사라졌을 때
   py fandex_python_status_report_v1.py
"""


RUNBOOK_FILE.write_text(content, encoding="utf-8")

print("FANDEX Python-only runbook 생성 완료")
print(f"파일: {RUNBOOK_FILE}")