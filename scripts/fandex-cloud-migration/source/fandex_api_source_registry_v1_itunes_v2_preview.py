import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "fandex_api_source_registry_v1"

CSV_FILE = Path("fandex_api_source_registry_v1.csv")
JSON_FILE = Path("fandex_api_source_registry_latest.json")
TXT_FILE = Path("FANDEX_API_SOURCE_REGISTRY.txt")


SOURCES = [
    {
        "sourceId": "naver_search_news",
        "displayName": "Naver Search API - News",
        "category": "media",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "NAVER_CLIENT_ID,NAVER_CLIENT_SECRET",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "high",
        "scoreUse": "news buzz / issue signal / sentiment",
        "reliability": "high",
        "difficulty": "low",
        "pipelineRisk": "low",
        "notes": "이미 네이버 뉴스 수집 파이프라인 기반 존재. v3 품질 필터와 연결 가능.",
    },
    {
        "sourceId": "naver_search_blog",
        "displayName": "Naver Search API - Blog",
        "category": "media",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "NAVER_CLIENT_ID,NAVER_CLIENT_SECRET",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "high",
        "scoreUse": "fandom buzz / public interest / topic cluster",
        "reliability": "high",
        "difficulty": "low",
        "pipelineRisk": "low",
        "notes": "이미 네이버 블로그 수집 파이프라인 기반 존재. 팬덤/대중 관심도 분리에 유용.",
    },
    {
        "sourceId": "naver_datalab_search_trend",
        "displayName": "Naver DataLab - Search Trend",
        "category": "search_trend",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "NAVER_CLIENT_ID,NAVER_CLIENT_SECRET",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "high",
        "scoreUse": "search demand / relative public interest",
        "reliability": "high",
        "difficulty": "medium",
        "pipelineRisk": "low",
        "notes": "현재 네이버 검색 트렌드 비교 기반 존재. 아티스트 확장 시 기준 키워드 관리 필요.",
    },
    {
        "sourceId": "youtube_data_api_videos",
        "displayName": "YouTube Data API - Videos",
        "category": "video",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "YOUTUBE_API_KEY",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "high",
        "scoreUse": "views / likes / comments / official content power",
        "reliability": "high",
        "difficulty": "medium",
        "pipelineRisk": "medium",
        "notes": "현재 seed 기반 수집 완료. 다음 단계에서 search API로 seed 자동 확장 가능.",
    },
    {
        "sourceId": "youtube_data_api_search",
        "displayName": "YouTube Data API - Search",
        "category": "video_discovery",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "YOUTUBE_API_KEY",
        "autoCollectPossible": "yes",
        "currentStatus": "planned",
        "priority": "high",
        "scoreUse": "auto seed discovery / content spread",
        "reliability": "medium",
        "difficulty": "medium",
        "pipelineRisk": "medium",
        "notes": "아티스트명 + 곡명 + MV/무대/쇼츠/챌린지 검색으로 후보 영상 자동 발굴.",
    },
    {
        "sourceId": "bugs_chart_web",
        "displayName": "Bugs Chart Web",
        "category": "music_chart",
        "collectionMethod": "web_parse",
        "authRequired": "no",
        "credentialEnv": "",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "high",
        "scoreUse": "domestic music chart signal",
        "reliability": "medium",
        "difficulty": "medium",
        "pipelineRisk": "medium",
        "notes": "현재 BAD 수집 성공, LEMONADE 미진입 처리 성공. daily runner에 포함됨.",
    },
    {
        "sourceId": "melon_chart_web",
        "displayName": "Melon Chart Web",
        "category": "music_chart",
        "collectionMethod": "web_parse_or_manual_seed",
        "authRequired": "no",
        "credentialEnv": "",
        "autoCollectPossible": "partial",
        "currentStatus": "planned",
        "priority": "high",
        "scoreUse": "domestic music chart signal",
        "reliability": "medium_low",
        "difficulty": "high",
        "pipelineRisk": "medium_high",
        "notes": "동적 페이지/차단 가능성 있음. 실패해도 seed 유지 방식으로 설계 필요.",
    },
    {
        "sourceId": "genie_chart_web",
        "displayName": "Genie Chart Web",
        "category": "music_chart",
        "collectionMethod": "web_parse_or_manual_seed",
        "authRequired": "no",
        "credentialEnv": "",
        "autoCollectPossible": "partial",
        "currentStatus": "planned",
        "priority": "medium_high",
        "scoreUse": "domestic music chart signal",
        "reliability": "medium_low",
        "difficulty": "high",
        "pipelineRisk": "medium_high",
        "notes": "차트 페이지 구조 변화 가능. Melon과 동일하게 fallback 구조 필요.",
    },
    {
        "sourceId": "spotify_web_api",
        "displayName": "Spotify Web API",
        "category": "global_music",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "SPOTIFY_CLIENT_ID,SPOTIFY_CLIENT_SECRET",
        "autoCollectPossible": "limited",
        "currentStatus": "deferred",
        "priority": "low_medium",
        "scoreUse": "global catalog / artist metadata / top tracks",
        "reliability": "high",
        "difficulty": "medium_high",
        "pipelineRisk": "high",
        "notes": "Client ID/Secret과 access token 발급은 성공했으나 API 호출에서 Premium subscription required 403 발생. 계정 권한 문제로 보류.",
    },
    {
        "sourceId": "lastfm_api",
        "displayName": "Last.fm API",
        "category": "global_music_interest",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "LASTFM_API_KEY",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "medium",
        "scoreUse": "listeners / playcount / tags / global interest",
        "reliability": "medium",
        "difficulty": "low_medium",
        "pipelineRisk": "medium",
        "notes": "K-pop 글로벌 관심도 보조 신호. API key 발급 필요.",
    },
    {
        "sourceId": "musicbrainz_api",
        "displayName": "MusicBrainz API",
        "category": "music_metadata",
        "collectionMethod": "official_api",
        "authRequired": "no",
        "credentialEnv": "",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "medium",
        "scoreUse": "artist identity / release metadata / ISRC support",
        "reliability": "high",
        "difficulty": "low_medium",
        "pipelineRisk": "low",
        "notes": "점수화보다는 아티스트/곡/앨범 식별자 정리에 적합. rate limit 주의.",
    },
    {
        "sourceId": "itunes_search_api",
        "displayName": "iTunes Search / Lookup API",
        "category": "music_metadata",
        "collectionMethod": "official_api",
        "authRequired": "no",
        "credentialEnv": "",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "medium",
        "scoreUse": "metadata_only_not_fandex_score",
        "reliability": "high_for_approved_id_lookup",
        "difficulty": "low",
        "pipelineRisk": "low",
        "notes": "v2 완료: 승인된 trackId 직접 조회, 10명 검증, ok=10, error=0, warning=0. FANDEX Master 점수에는 사용하지 않음.",
    },
    {
        "sourceId": "instagram_graph_api",
        "displayName": "Instagram Graph API",
        "category": "social",
        "collectionMethod": "official_api_limited",
        "authRequired": "yes",
        "credentialEnv": "META_ACCESS_TOKEN",
        "autoCollectPossible": "limited",
        "currentStatus": "deferred",
        "priority": "low",
        "scoreUse": "owned account insights only",
        "reliability": "medium",
        "difficulty": "high",
        "pipelineRisk": "high",
        "notes": "타 계정 공개 데이터 대규모 수집용으로 부적합. FANDEX 핵심 지표에서는 보류.",
    },
    {
        "sourceId": "tiktok_research_api",
        "displayName": "TikTok Research API",
        "category": "social_video",
        "collectionMethod": "official_api_approval_required",
        "authRequired": "yes",
        "credentialEnv": "TIKTOK_CLIENT_KEY,TIKTOK_CLIENT_SECRET",
        "autoCollectPossible": "limited",
        "currentStatus": "deferred",
        "priority": "low_medium",
        "scoreUse": "shortform spread if approved",
        "reliability": "medium",
        "difficulty": "very_high",
        "pipelineRisk": "high",
        "notes": "승인/권한 필요. 당장 Python-only 필수 확장 대상에서는 제외.",
    },
]


FIELDNAMES = [
    "sourceId",
    "displayName",
    "category",
    "collectionMethod",
    "authRequired",
    "credentialEnv",
    "autoCollectPossible",
    "currentStatus",
    "priority",
    "scoreUse",
    "reliability",
    "difficulty",
    "pipelineRisk",
    "notes",
]


def write_csv():
    with open(CSV_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(SOURCES)


def write_json():
    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "sourceCount": len(SOURCES),
        "sources": SOURCES,
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
    }

    JSON_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_txt():
    lines = []
    lines.append("FANDEX API Source Registry")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("")
    lines.append("원칙")
    lines.append("-" * 70)
    lines.append("- Codex 연결 제외")
    lines.append("- Python-only 확장")
    lines.append("- 웹사이트 public/data 건드리지 않음")
    lines.append("- 실패해도 daily runner가 깨지지 않게 설계")
    lines.append("")
    lines.append("우선 진행 대상")
    lines.append("-" * 70)

    priority_order = {
        "high": 1,
        "medium_high": 2,
        "medium": 3,
        "low_medium": 4,
        "low": 5,
    }

    active_or_planned = [
        source for source in SOURCES
        if source["currentStatus"] in {"active", "planned"}
    ]

    active_or_planned.sort(
        key=lambda s: (
            priority_order.get(s["priority"], 99),
            s["sourceId"],
        )
    )

    for source in active_or_planned:
        lines.append(
            f"- {source['sourceId']} | {source['priority']} | "
            f"{source['currentStatus']} | {source['scoreUse']}"
        )

    lines.append("")
    lines.append("보류 대상")
    lines.append("-" * 70)

    deferred = [
        source for source in SOURCES
        if source["currentStatus"] == "deferred"
    ]

    for source in deferred:
        lines.append(
            f"- {source['sourceId']} | reason: {source['notes']}"
        )

    lines.append("")
    lines.append("다음 구현 순서")
    lines.append("-" * 70)
    lines.append("1. YouTube seed auto discovery")
    lines.append("2. Melon/Genie collector fallback 구조")
    lines.append("3. artist 확장")
    lines.append("4. Last.fm / MusicBrainz / iTunes 결과를 점수 후보로 정리")
    lines.append("5. 점수 공식 고도화")
    lines.append("6. Spotify는 Premium 권한 문제 해결 전까지 보류")

    TXT_FILE.write_text("\n".join(lines), encoding="utf-8")


def main():
    write_csv()
    write_json()
    write_txt()

    print()
    print("FANDEX API source registry v1 생성 완료")
    print("=" * 70)
    print(f"CSV: {CSV_FILE}")
    print(f"JSON latest: {JSON_FILE}")
    print(f"TXT: {TXT_FILE}")
    print(f"source count: {len(SOURCES)}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_API_SOURCE_REGISTRY.txt")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_API_SOURCE_REGISTRY.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()