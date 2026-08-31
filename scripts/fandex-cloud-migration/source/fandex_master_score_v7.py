import csv

import json

import shutil

from datetime import datetime

from pathlib import Path





VERSION = "fandex_master_v7_youtube_v3_uncapped_cumulative"

BUILD_PATCH = "latest_sources_v3_music_total_fix"



PREVIOUS_MASTER_FILE = Path("fandex_master_ranking_latest.json")

PREVIOUS_REPORTS_FILE = Path("fandex_master_artist_reports_latest.json")



NAVER_FILE = Path("fandex_naver_ranking_v3_latest.json")

YOUTUBE_V3_FILE = Path("fandex_youtube_ranking_v3_latest.json")

MUSIC_FILE = Path("fandex_music_chart_ranking_v1_latest.json")



LATEST_RANKING_JSON = Path("fandex_master_ranking_latest.json")

LATEST_REPORTS_JSON = Path("fandex_master_artist_reports_latest.json")

LATEST_AUDIT_CSV = Path("fandex_master_score_v7_audit_latest.csv")

LATEST_TXT_REPORT = Path("FANDEX_MASTER_V7_REPORT.txt")





def read_json(path):

    if not path.exists():

        raise SystemExit(f"파일이 없습니다: {path}")



    with open(path, "r", encoding="utf-8-sig") as f:

        return json.load(f)





def safe_float(value):

    try:

        if value in [None, ""]:

            return 0.0

        return float(str(value).replace(",", "").strip())

    except Exception:

        return 0.0





def extract_ranking_rows(payload):

    """

    핵심:

    - ranking 배열만 우선 사용한다.

    - entries 안의 개별 chart entry까지 재귀 탐색하지 않는다.

    - 그래야 music latest에서 fandexMusicChartFinalPoint 총점을 제대로 읽는다.

    """

    if isinstance(payload, list):

        return [row for row in payload if isinstance(row, dict)]



    if not isinstance(payload, dict):

        return []



    for key in ["ranking", "rankings", "artists", "items", "results", "data"]:

        value = payload.get(key)

        if isinstance(value, list):

            return [row for row in value if isinstance(row, dict)]



    return []





def get_artist_name(item):

    if not isinstance(item, dict):

        return ""



    for key in ["artist", "artistName", "name", "displayName"]:

        value = item.get(key)

        if value:

            return str(value).strip()



    return ""





def get_source_point_from_master_item(item, source_key):

    source_points = item.get("sourcePoints") or {}

    source = source_points.get(source_key) or {}



    for key in ["cumulativePoint", "point", "score", "totalPoint"]:

        if key in source and source.get(key) not in [None, ""]:

            return safe_float(source.get(key))



    return 0.0





def get_total_score_from_master_item(item):

    for key in [

        "fandexFinalPoint",

        "fandexPoint",

        "masterPoint",

        "totalPoint",

        "finalPoint",

        "cumulativePoint",

        "score",

    ]:

        if key in item and item.get(key) not in [None, ""]:

            return safe_float(item.get(key))



    return 0.0





def get_latest_source_score(item, source_type):

    """

    source별 latest ranking row에서 공식 총점을 읽는다.

    music은 반드시 fandexMusicChartFinalPoint를 최우선으로 읽어야 한다.

    """



    if source_type == "naver":

        keys = [

            "fandexNaverFinalPoint",

            "fandexNaverPoint",

            "fandexNaverScore",

            "naverFinalPoint",

            "naverPoint",

            "naverScore",

            "naverTotalPoint",

            "cumulativePoint",

            "totalPoint",

            "finalPoint",

            "score",

            "fandexFinalPoint",

        ]

        source_key = "naver"



    elif source_type == "youtube":

        keys = [

            "youtubePoint",

            "youtubeFinalPoint",

            "youtubeScore",

            "cumulativePoint",

            "totalPoint",

            "score",

        ]

        source_key = "youtube"



    elif source_type == "music":

        keys = [

            "fandexMusicChartFinalPoint",

            "musicChartFinalPoint",

            "musicChartPoint",

            "musicPoint",

            "musicScore",

            "chartPoint",

            "cumulativePoint",

            "totalPoint",

            "score",

        ]

        source_key = "musicChart"



    else:

        keys = ["score"]

        source_key = ""



    # 1순위: source ranking row의 직접 총점 필드

    for key in keys:

        if key in item and item.get(key) not in [None, ""]:

            return safe_float(item.get(key))



    # 2순위: sourcePoints 구조

    if source_key:

        source_points = item.get("sourcePoints") or {}

        source = source_points.get(source_key) or {}



        for key in ["cumulativePoint", "point", "score", "totalPoint"]:

            if key in source and source.get(key) not in [None, ""]:

                return safe_float(source.get(key))



    return 0.0





def make_previous_master_map(payload):

    result = {}



    for item in extract_ranking_rows(payload):

        artist = get_artist_name(item)



        if not artist:

            continue



        result[artist] = {

            "artist": artist,

            "previousMasterPoint": round(get_total_score_from_master_item(item), 4),

            "naverPoint": round(get_source_point_from_master_item(item, "naver"), 4),

            "youtubePoint": round(get_source_point_from_master_item(item, "youtube"), 4),

            "musicChartPoint": round(get_source_point_from_master_item(item, "musicChart"), 4),

        }



    return result





def has_latest_source_score(item, source_type):
    """
    latest source row에 실제 점수 필드가 존재하는지 확인한다.

    핵심:
    - 실제 0점은 유효한 latest 값이다.
    - 점수 필드 자체가 없는 row와 0점을 구분한다.
    """

    if source_type == "naver":
        keys = [
            "fandexNaverFinalPoint",
            "fandexNaverPoint",
            "fandexNaverScore",
            "naverFinalPoint",
            "naverPoint",
            "naverScore",
            "naverTotalPoint",
            "cumulativePoint",
            "totalPoint",
            "finalPoint",
            "score",
            "fandexFinalPoint",
        ]
        source_key = "naver"

    elif source_type == "youtube":
        keys = [
            "youtubePoint",
            "youtubeFinalPoint",
            "youtubeScore",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]
        source_key = "youtube"

    elif source_type == "music":
        keys = [
            "fandexMusicChartFinalPoint",
            "musicChartFinalPoint",
            "musicChartPoint",
            "musicPoint",
            "musicScore",
            "chartPoint",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]
        source_key = "musicChart"

    else:
        keys = ["score"]
        source_key = ""

    # 1순위: ranking row 직접 점수 필드
    for key in keys:
        if key in item and item.get(key) not in [None, ""]:
            return True

    # 2순위: sourcePoints 내부 점수 필드
    if source_key:
        source_points = item.get("sourcePoints") or {}
        source = source_points.get(source_key) or {}

        for key in [
            "cumulativePoint",
            "point",
            "score",
            "totalPoint",
        ]:
            if key in source and source.get(key) not in [None, ""]:
                return True

    return False




def make_latest_source_map(payload, source_type):

    result = {}



    for item in extract_ranking_rows(payload):

        artist = get_artist_name(item)



        if not artist:

            continue



        score_present = has_latest_source_score(item, source_type)

        if not score_present:

            continue



        score = get_latest_source_score(item, source_type)



        # 실제 0점은 유효하다.
        # 음수만 비정상 점수로 제외한다.
        if score < 0:

            continue



        result[artist] = {

            "artist": artist,

            "score": round(score, 4),

        }



    return result





def backup_existing_latest(timestamp):

    backup_dir = Path(f"master_v7_backup_before_music_total_fix_v3_{timestamp}")

    backup_dir.mkdir(exist_ok=True)



    for target in [PREVIOUS_MASTER_FILE, PREVIOUS_REPORTS_FILE]:

        if target.exists():

            shutil.copy2(target, backup_dir / target.name)



    return backup_dir





def main():

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")



    print()

    print("FANDEX master score v7 생성 시작")

    print("=" * 70)

    print(f"version: {VERSION}")

    print(f"buildPatch: {BUILD_PATCH}")

    print("공식: Naver latest + YouTube v3 latest + Music chart latest")

    print("주의: 웹사이트 public/data는 건드리지 않습니다.")

    print()



    previous_payload = read_json(PREVIOUS_MASTER_FILE)

    naver_payload = read_json(NAVER_FILE)

    youtube_payload = read_json(YOUTUBE_V3_FILE)

    music_payload = read_json(MUSIC_FILE)



    backup_dir = backup_existing_latest(timestamp)



    previous_map = make_previous_master_map(previous_payload)

    naver_map = make_latest_source_map(naver_payload, "naver")

    youtube_map = make_latest_source_map(youtube_payload, "youtube")

    music_map = make_latest_source_map(music_payload, "music")



    all_artists = sorted(

        set(previous_map)

        | set(naver_map)

        | set(youtube_map)

        | set(music_map)

    )



    ranking = []

    reports = {}

    audit_rows = []



    for artist in all_artists:

        previous = previous_map.get(artist, {})



        previous_master_point = safe_float(previous.get("previousMasterPoint"))

        previous_naver_point = safe_float(previous.get("naverPoint"))

        previous_youtube_point = safe_float(previous.get("youtubePoint"))

        previous_music_point = safe_float(previous.get("musicChartPoint"))



        naver_present = artist in naver_map

        youtube_present = artist in youtube_map

        music_present = artist in music_map



        naver_latest = safe_float(naver_map.get(artist, {}).get("score"))

        youtube_latest = safe_float(youtube_map.get(artist, {}).get("score"))

        music_latest = safe_float(music_map.get(artist, {}).get("score"))



        # 최신 source ranking에 artist가 존재하면 0점도 유효한 최신값으로 사용한다.

        # 이전 Master fallback은 최신 source에서 artist 자체가 없을 때만 허용한다.

        naver_point = naver_latest if naver_present else previous_naver_point

        youtube_point = youtube_latest if youtube_present else previous_youtube_point

        music_point = music_latest if music_present else previous_music_point



        naver_source = "latest_naver_v3" if naver_present else "fallback_previous_master"

        youtube_source = "latest_youtube_v3" if youtube_present else "fallback_previous_master"

        music_source = "latest_music_chart_v1" if music_present else "fallback_previous_master"



        total = naver_point + youtube_point + music_point

        delta = total - previous_master_point



        item = {

            "artist": artist,

            "fandexFinalPoint": round(total, 2),

            "score": round(total, 2),

            "previousMasterPoint": round(previous_master_point, 2),

            "deltaFromPreviousMaster": round(delta, 2),

            "sourcePoints": {

                "naver": {

                    "cumulativePoint": round(naver_point, 2),

                    "sourceVersion": "naver_v3",

                    "sourceReadMode": naver_source,

                },

                "youtube": {

                    "cumulativePoint": round(youtube_point, 2),

                    "previousPoint": round(previous_youtube_point, 2),

                    "sourceVersion": "youtube_v3",

                    "sourceReadMode": youtube_source,

                    "scoreMode": "uncapped_additive_log_points_scaled",

                },

                "musicChart": {

                    "cumulativePoint": round(music_point, 2),

                    "previousPoint": round(previous_music_point, 2),

                    "sourceVersion": "music_chart_v1",

                    "sourceReadMode": music_source,

                },

            },

            "sourceTotalCheck": round(total, 2),

        }



        ranking.append(item)



    ranking.sort(key=lambda row: row["fandexFinalPoint"], reverse=True)



    for index, item in enumerate(ranking, start=1):

        item["rank"] = index



        artist = item["artist"]



        reports[artist] = {

            "artist": artist,

            "rank": index,

            "version": VERSION,

            "buildPatch": BUILD_PATCH,

            "fandexFinalPoint": item["fandexFinalPoint"],

            "previousMasterPoint": item["previousMasterPoint"],

            "deltaFromPreviousMaster": item["deltaFromPreviousMaster"],

            "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",

            "sourcePoints": item["sourcePoints"],

        }



        audit_rows.append({

            "rank": index,

            "artist": artist,

            "fandexFinalPoint": item["fandexFinalPoint"],

            "previousMasterPoint": item["previousMasterPoint"],

            "deltaFromPreviousMaster": item["deltaFromPreviousMaster"],

            "naverPoint": item["sourcePoints"]["naver"]["cumulativePoint"],

            "naverSource": item["sourcePoints"]["naver"]["sourceReadMode"],

            "youtubePoint": item["sourcePoints"]["youtube"]["cumulativePoint"],

            "youtubeSource": item["sourcePoints"]["youtube"]["sourceReadMode"],

            "musicChartPoint": item["sourcePoints"]["musicChart"]["cumulativePoint"],

            "musicChartPreviousPoint": item["sourcePoints"]["musicChart"]["previousPoint"],

            "musicChartSource": item["sourcePoints"]["musicChart"]["sourceReadMode"],

        })



    ranking_payload = {

        "version": VERSION,

        "buildPatch": BUILD_PATCH,

        "createdAt": datetime.now().isoformat(timespec="seconds"),

        "pythonOnly": True,

        "touchesWebsitePublicData": False,

        "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",

        "sourceFiles": {

            "naver": str(NAVER_FILE),

            "youtube": str(YOUTUBE_V3_FILE),

            "musicChart": str(MUSIC_FILE),

            "previousMaster": str(PREVIOUS_MASTER_FILE),

        },

        "ranking": ranking,

    }



    reports_payload = {

        "version": VERSION,

        "buildPatch": BUILD_PATCH,

        "createdAt": datetime.now().isoformat(timespec="seconds"),

        "pythonOnly": True,

        "touchesWebsitePublicData": False,

        "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",

        "reports": reports,

    }



    timestamp_ranking_json = Path(f"fandex_master_ranking_v7_{timestamp}.json")

    timestamp_reports_json = Path(f"fandex_master_artist_reports_v7_{timestamp}.json")

    timestamp_audit_csv = Path(f"fandex_master_score_v7_audit_{timestamp}.csv")



    for path in [timestamp_ranking_json, LATEST_RANKING_JSON]:

        path.write_text(

            json.dumps(ranking_payload, ensure_ascii=False, indent=2),

            encoding="utf-8",

        )



    for path in [timestamp_reports_json, LATEST_REPORTS_JSON]:

        path.write_text(

            json.dumps(reports_payload, ensure_ascii=False, indent=2),

            encoding="utf-8",

        )



    fieldnames = [

        "rank",

        "artist",

        "fandexFinalPoint",

        "previousMasterPoint",

        "deltaFromPreviousMaster",

        "naverPoint",

        "naverSource",

        "youtubePoint",

        "youtubeSource",

        "musicChartPoint",

        "musicChartPreviousPoint",

        "musicChartSource",

    ]



    for path in [timestamp_audit_csv, LATEST_AUDIT_CSV]:

        with open(path, "w", encoding="utf-8-sig", newline="") as f:

            writer = csv.DictWriter(f, fieldnames=fieldnames)

            writer.writeheader()

            writer.writerows(audit_rows)



    lines = []

    lines.append("FANDEX Master v7 Report")

    lines.append("=" * 70)

    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")

    lines.append(f"version: {VERSION}")

    lines.append(f"buildPatch: {BUILD_PATCH}")

    lines.append("scope: Python-only / no website public-data export")

    lines.append("")

    lines.append("공식")

    lines.append("-" * 70)

    lines.append("FANDEX v7 = Naver v3 latest + YouTube v3 latest + Music chart v1 latest")

    lines.append("YouTube v3는 additive log point scaled 방식")

    lines.append("")

    lines.append("Ranking")

    lines.append("-" * 70)



    for item in ranking:

        lines.append(

            f"{item['rank']}위 {item['artist']} | "

            f"FANDEX {item['fandexFinalPoint']} | "

            f"네이버 {item['sourcePoints']['naver']['cumulativePoint']} "

            f"({item['sourcePoints']['naver']['sourceReadMode']}) | "

            f"YouTube {item['sourcePoints']['youtube']['cumulativePoint']} "

            f"({item['sourcePoints']['youtube']['sourceReadMode']}) | "

            f"음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "

            f"({item['sourcePoints']['musicChart']['sourceReadMode']}) | "

            f"이전 대비 {item['deltaFromPreviousMaster']}"

        )



    lines.append("")

    lines.append("백업")

    lines.append("-" * 70)

    lines.append(f"기존 latest 백업 폴더: {backup_dir}")

    lines.append("")

    lines.append("주의")

    lines.append("- 웹사이트 public/data는 건드리지 않았다.")

    lines.append("- master v7은 Music chart latest의 artist 총점을 직접 읽는다.")

    lines.append("- entries 안의 개별 차트 점수만 읽는 문제를 수정했다.")



    timestamp_txt_report = Path(f"FANDEX_MASTER_V7_REPORT_{timestamp}.txt")



    for path in [timestamp_txt_report, LATEST_TXT_REPORT]:

        path.write_text("\n".join(lines), encoding="utf-8")



    print()

    print("FANDEX master v7 ranking")

    print("-" * 70)



    for item in ranking:

        print(

            f"{item['rank']}위. {item['artist']} - FANDEX {item['fandexFinalPoint']}점 "

            f"/ 네이버 {item['sourcePoints']['naver']['cumulativePoint']} "

            f"/ YouTube {item['sourcePoints']['youtube']['cumulativePoint']} "

            f"/ 음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "

            f"/ 이전 대비 {item['deltaFromPreviousMaster']}"

        )



    print()

    print("=" * 70)

    print("FANDEX master score v7 생성 완료")

    print("=" * 70)

    print(f"기존 latest 백업 폴더: {backup_dir}")

    print(f"최신 ranking JSON: {LATEST_RANKING_JSON}")

    print(f"최신 report JSON: {LATEST_REPORTS_JSON}")

    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")

    print(f"리포트: {LATEST_TXT_REPORT}")

    print()

    print("확인:")

    print("notepad FANDEX_MASTER_V7_REPORT.txt")





if __name__ == "__main__":

    main()
