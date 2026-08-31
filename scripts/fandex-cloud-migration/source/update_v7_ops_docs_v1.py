from pathlib import Path
from datetime import datetime


VERSION = "update_v7_ops_docs_v1"

RUNBOOK = Path("FANDEX_PYTHON_ONLY_RUNBOOK.txt")
FINAL_SUMMARY = Path("FANDEX_FINAL_OPS_SUMMARY.txt")
OUTPUT_CHECK = Path("FANDEX_V7_OPERATING_STATUS.txt")


V7_SECTION = f"""
FANDEX Python-only v7 운영 기준
============================================================
updatedAt: {datetime.now().isoformat(timespec='seconds')}
updateScript: {VERSION}

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


평소 운영 명령
------------------------------------------------------------
cd %USERPROFILE%\\Desktop\\naver_data_collector
run_fandex_daily_python_only.bat

이 명령은 다음을 실행한다.
1. Bugs 차트 자동 수집
2. Bugs 결과를 music_chart_seed_v1.csv에 반영
3. YouTube v3 점수 생성
4. Music chart v1 점수 생성
5. FANDEX master v7 생성
6. status report 생성
7. health check 생성
8. archive 정리
9. 웹사이트 public/data는 건드리지 않음


YouTube 재수집이 필요한 날
------------------------------------------------------------
set YOUTUBE_API_KEY=진짜_YouTube_API_KEY
py fandex_daily_python_only_v1.py --refresh-youtube

주의:
- API 키를 채팅에 붙여넣지 말 것
- "실제_API_KEY" 같은 예시 문구를 그대로 넣지 말 것


현재 핵심 파일
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


확인용 파일
------------------------------------------------------------
fandex_python_status_report_latest.txt
fandex_python_health_check_latest.txt
FANDEX_MASTER_V7_REPORT.txt
FANDEX_YOUTUBE_SEED_EXPANSION_AUDIT.txt
FANDEX_YOUTUBE_V3_PREVIEW_REPORT.txt


상태 확인 명령
------------------------------------------------------------
py fandex_python_health_check_v1.py
notepad fandex_python_health_check_latest.txt

CMD에서 한글 깨짐 없이 확인:
powershell -NoProfile -Command "Get-Content .\\fandex_python_health_check_latest.txt -Encoding UTF8"
powershell -NoProfile -Command "Get-Content .\\fandex_python_status_report_latest.txt -Encoding UTF8"


백업
------------------------------------------------------------
현재 v7 안정화 백업:
backup\\20260713_232245

백업 검증:
py fandex_verify_backup_v1.py

복구 dry-run:
py fandex_restore_core_files_v1.py backup\\20260713_232245

실제 복구가 필요할 때만:
py fandex_restore_core_files_v1.py backup\\20260713_232245 --apply


절대 실행 금지: Codex 작업 중
------------------------------------------------------------
아래 명령은 웹사이트 public/data를 건드릴 수 있으므로 Codex 작업 중 실행 금지.

py fandex_export_to_site_v1.py
py fandex_publish_all_v5.py
py fandex_publish_all_v5.py --refresh-youtube


보류된 소스
------------------------------------------------------------
Spotify Web API:
Client ID/Secret과 access token 발급은 성공했으나,
API 호출에서 Premium subscription required 403 발생.
Premium 권한 문제 해결 전까지 보류.


다음 고도화 후보
------------------------------------------------------------
1. Melon/Genie collector fallback 구조
2. artist 확장: 4팀 → 10팀
3. Last.fm / MusicBrainz / iTunes 결과를 점수 후보로 정리
4. 점수 공식 고도화
5. YouTube seed 자동 확장 승인 프로세스 개선
"""


def update_file(path: Path):
    if not path.exists():
        print(f"SKIP 없음: {path}")
        return False

    text = path.read_text(encoding="utf-8-sig")
    marker = "FANDEX Python-only v7 운영 기준"

    if marker in text:
        before = text.split(marker)[0].rstrip()
        new_text = before + "\n\n" + V7_SECTION.strip() + "\n"
    else:
        new_text = text.rstrip() + "\n\n" + V7_SECTION.strip() + "\n"

    path.write_text(new_text, encoding="utf-8")
    print(f"업데이트 완료: {path}")
    return True


def main():
    print()
    print("FANDEX v7 ops docs update")
    print("=" * 70)

    updated = 0

    if update_file(RUNBOOK):
        updated += 1

    if update_file(FINAL_SUMMARY):
        updated += 1

    OUTPUT_CHECK.write_text(V7_SECTION.strip() + "\n", encoding="utf-8")

    print()
    print("=" * 70)
    print("v7 운영 문서 업데이트 완료")
    print("=" * 70)
    print(f"업데이트 파일 수: {updated}")
    print(f"v7 상태 요약 파일: {OUTPUT_CHECK}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_PYTHON_ONLY_RUNBOOK.txt")
    print("notepad FANDEX_FINAL_OPS_SUMMARY.txt")
    print("notepad FANDEX_V7_OPERATING_STATUS.txt")


if __name__ == "__main__":
    main()