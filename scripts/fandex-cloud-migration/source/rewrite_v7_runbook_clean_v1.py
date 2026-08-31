from pathlib import Path
from datetime import datetime
import shutil


RUNBOOK = Path("FANDEX_PYTHON_ONLY_RUNBOOK.txt")
FINAL_SUMMARY = Path("FANDEX_FINAL_OPS_SUMMARY.txt")

VERSION = "rewrite_v7_runbook_clean_v1"


CONTENT = f"""FANDEX Python-Only Runbook v7
============================================================
createdAt: {datetime.now().isoformat(timespec='seconds')}
updateScript: {VERSION}

목적
------------------------------------------------------------
이 문서는 FANDEX Python 데이터 파이프라인을 Codex/웹사이트 작업과 충돌 없이
운영하기 위한 v7 기준 문서다.

현재 운영 원칙:
- Python 작업은 C:\\Users\\김종민\\Desktop\\naver_data_collector 안에서만 진행
- Codex 작업 중에는 C:\\Users\\김종민\\Desktop\\fandex\\public\\data를 건드리지 않음
- 웹사이트 export는 보류
- Python 내부 latest JSON만 갱신


기본 작업 위치
------------------------------------------------------------
cd %USERPROFILE%\\Desktop\\naver_data_collector


현재 공식 버전
------------------------------------------------------------
masterVersion:
fandex_master_v7_youtube_v3_uncapped_cumulative

scoreMode:
uncapped_cumulative_source_points_with_youtube_v3

공식:
FANDEX v7 = Naver v3 + YouTube v3 + Music chart v1

YouTube v3:
- additive log point scaled 방식
- 영상 seed가 늘어나도 기존 영상 점수가 깎이지 않도록 설계
- raw point는 내부 감사용
- final point는 scaleFactor 0.12 적용


현재 공식 ranking
------------------------------------------------------------
1위 에스파 | FANDEX 486.06 | 네이버 279.11 | YouTube 78.70 | 음원 128.25
2위 아이유 | FANDEX 473.26 | 네이버 399.65 | YouTube 49.61 | 음원 24.00
3위 에이티즈 | FANDEX 420.11 | 네이버 318.77 | YouTube 50.34 | 음원 51.00
4위 보이넥스트도어 | FANDEX 361.35 | 네이버 302.34 | YouTube 35.01 | 음원 24.00


평소 일일 운영 명령
------------------------------------------------------------
run_fandex_daily_python_only.bat

이 명령이 하는 일:
1. Bugs 차트 자동 수집
2. Bugs 결과를 music_chart_seed_v1.csv에 반영
3. YouTube v3 점수 생성
4. Music chart v1 점수 생성
5. FANDEX master v7 생성
6. status report 생성
7. health check 생성
8. timestamp/log/audit/backup/preview 파일 archive 이동
9. 웹사이트 public/data는 건드리지 않음


최신 결과 확인
------------------------------------------------------------
notepad fandex_python_status_report_latest.txt
notepad fandex_python_health_check_latest.txt

CMD에서 한글이 깨질 경우:
powershell -NoProfile -Command "Get-Content .\\fandex_python_status_report_latest.txt -Encoding UTF8"
powershell -NoProfile -Command "Get-Content .\\fandex_python_health_check_latest.txt -Encoding UTF8"


현재 핵심 latest 파일
------------------------------------------------------------
fandex_master_ranking_latest.json
fandex_master_artist_reports_latest.json

fandex_youtube_ranking_v3_latest.json
fandex_youtube_artist_reports_v3_latest.json

fandex_music_chart_ranking_v1_latest.json
fandex_music_chart_artist_reports_v1_latest.json

fandex_naver_ranking_v3_latest.json

music_chart_seed_v1.csv
youtube_seed_videos_v1.csv
youtube_video_metrics_v1.csv


YouTube 재수집 포함 실행
------------------------------------------------------------
YouTube API를 새로 수집해야 할 때만 실행한다.

set YOUTUBE_API_KEY=진짜_YouTube_API_KEY
py fandex_daily_python_only_v1.py --refresh-youtube

주의:
- API 키를 채팅에 붙여넣지 말 것
- "실제_API_KEY" 같은 예시 문구를 그대로 입력하지 말 것


Bugs 음원만 갱신
------------------------------------------------------------
py fandex_music_refresh_bugs_python_only_v1.py

이 명령이 하는 일:
1. Bugs chart 자동 수집
2. Bugs 결과 seed 반영
3. Music chart v1 점수 생성
4. FANDEX master v7 생성
5. 웹사이트 public/data는 건드리지 않음


Bugs 갱신 없이 내부 점수만 다시 생성
------------------------------------------------------------
py fandex_daily_python_only_v1.py --skip-bugs


상태 확인
------------------------------------------------------------
py fandex_python_health_check_v1.py

정상 기준:
OK version: fandex_master_v7_youtube_v3_uncapped_cumulative
OK scoreMode: uncapped_cumulative_source_points_with_youtube_v3
OK: Python-only 운영 상태 정상


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
- fandex_python_health_check_latest.txt

archive로 이동되는 파일:
- timestamp JSON
- audit CSV
- log CSV
- raw API JSON
- backup CSV
- preview CSV
- skipped JSON
- timestamp report TXT


백업/복구/검증
------------------------------------------------------------
핵심 파일 백업:
py fandex_backup_core_files_v1.py --apply

백업 검증:
py fandex_verify_backup_v1.py

현재 v7 안정화 백업:
backup\\20260713_232245

복구 dry-run:
py fandex_restore_core_files_v1.py backup\\20260713_232245

실제 복구가 필요할 때만:
py fandex_restore_core_files_v1.py backup\\20260713_232245 --apply

복구 후 확인:
py fandex_python_health_check_v1.py
notepad fandex_python_health_check_latest.txt


절대 실행 금지: Codex 작업 중
------------------------------------------------------------
아래 명령은 웹사이트 public/data를 건드릴 수 있으므로 Codex 작업 중 실행 금지.

py fandex_export_to_site_v1.py
py fandex_publish_all_v5.py
py fandex_publish_all_v5.py --refresh-youtube


추가 API/데이터 소스 상태
------------------------------------------------------------
완료:
- MusicBrainz collector
- iTunes Search API collector
- Last.fm collector
- YouTube seed discovery
- YouTube seed expansion audit
- YouTube v3 scoring

보류:
- Spotify Web API
  Client ID/Secret과 access token 발급은 성공했으나,
  API 호출에서 Premium subscription required 403 발생.
  Premium 권한 문제 해결 전까지 보류.


현재 참고 리포트
------------------------------------------------------------
FANDEX_MASTER_V7_REPORT.txt
FANDEX_YOUTUBE_SEED_EXPANSION_AUDIT.txt
FANDEX_YOUTUBE_V3_PREVIEW_REPORT.txt
FANDEX_API_SOURCE_REGISTRY.txt
FANDEX_V7_OPERATING_STATUS.txt


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

6. v7 점수가 이상할 때
   py youtube_publish_v3.py
   py fandex_master_score_v7.py
   py fandex_python_health_check_v1.py


다음 고도화 후보
------------------------------------------------------------
1. Melon/Genie collector fallback 구조
2. artist 확장: 4팀 → 10팀
3. Last.fm / MusicBrainz / iTunes 결과를 점수 후보로 정리
4. 점수 공식 고도화
5. YouTube seed 자동 확장 승인 프로세스 개선
"""


def backup_file(path: Path):
    if not path.exists():
        return None

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = Path(f"{path.name}_backup_before_v7_clean_rewrite_{timestamp}")
    shutil.copy2(path, backup_path)
    return backup_path


def write_clean(path: Path):
    backup_path = backup_file(path)
    path.write_text(CONTENT, encoding="utf-8")

    print(f"정리 완료: {path}")
    if backup_path:
        print(f"백업: {backup_path}")
    else:
        print("기존 파일 없음. 새로 생성.")


def main():
    print()
    print("Rewrite FANDEX v7 runbook clean")
    print("=" * 70)

    write_clean(RUNBOOK)
    write_clean(FINAL_SUMMARY)

    print()
    print("=" * 70)
    print("v7 전용 운영 문서 정리 완료")
    print("=" * 70)
    print()
    print("확인:")
    print("notepad FANDEX_PYTHON_ONLY_RUNBOOK.txt")
    print("notepad FANDEX_FINAL_OPS_SUMMARY.txt")


if __name__ == "__main__":
    main()