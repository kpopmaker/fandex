import csv



import json



from datetime import datetime



from pathlib import Path











VERSION = "fandex_python_health_check_v1"







REQUIRED_FILES = [



    "run_fandex_daily_python_only.bat",



    "fandex_daily_python_only_v1.py",



        "music_chart_apply_stale_decay_v1.py",



        "music_chart_seed_freshness_audit_v1.py",



        "fandex_daily_python_only_v2.py",



    "fandex_python_status_report_v1.py",



    "fandex_python_status_report_latest.txt",



    "fandex_archive_generated_files_v1.py",



    "fandex_master_ranking_latest.json",



    "fandex_master_artist_reports_latest.json",



    "fandex_youtube_ranking_v3_latest.json",



    "fandex_youtube_artist_reports_v3_latest.json",



    "fandex_music_chart_ranking_v1_latest.json",



    "fandex_music_chart_artist_reports_v1_latest.json",



    "fandex_naver_ranking_v3_latest.json",



    "music_chart_seed_v1.csv",



    "youtube_video_metrics_v1.csv",



    "itunes_track_seed_v2.csv",



    "itunes_track_metadata_v2_latest.csv",



    "fandex_itunes_track_metadata_v2_latest.json",



    "FANDEX_ITUNES_COLLECTOR_V2_REPORT.txt",



    "lastfm_artist_seed_v2.csv",

    "lastfm_artist_interest_v2_latest.csv",

    "fandex_lastfm_artist_interest_v2_latest.json",

    "FANDEX_LASTFM_COLLECTOR_V2_REPORT.txt",

]







EXPECTED_MASTER_VERSION = "fandex_master_v7_youtube_v3_uncapped_cumulative"



EXPECTED_SCORE_MODE = "uncapped_cumulative_source_points_with_youtube_v3"











def read_json(path):



    with open(path, "r", encoding="utf-8-sig") as f:



        return json.load(f)











def read_csv(path):



    with open(path, "r", encoding="utf-8-sig", newline="") as f:



        return list(csv.DictReader(f))











def clean(value):



    return (value or "").strip()











def check_required_files(lines):



    ok = True







    lines.append("필수 파일 확인")



    lines.append("-" * 70)







    for file_name in REQUIRED_FILES:



        path = Path(file_name)







        if path.exists():



            lines.append(f"OK   {file_name}")



        else:



            lines.append(f"MISS {file_name}")



            ok = False







    lines.append("")



    return ok











def check_master(lines):



    path = Path("fandex_master_ranking_latest.json")







    if not path.exists():



        lines.append("master 확인 불가: fandex_master_ranking_latest.json 없음")



        lines.append("")



        return False







    ok = True



    data = read_json(path)







    version = data.get("version")



    score_mode = data.get("scoreMode")



    ranking = data.get("ranking", [])







    lines.append("master JSON 확인")



    lines.append("-" * 70)







    if version == EXPECTED_MASTER_VERSION:



        lines.append(f"OK version: {version}")



    else:



        lines.append(f"WARN version: {version}")



        ok = False







    if score_mode == EXPECTED_SCORE_MODE:



        lines.append(f"OK scoreMode: {score_mode}")



    else:



        lines.append(f"WARN scoreMode: {score_mode}")



        ok = False







    if ranking:



        lines.append(f"OK ranking count: {len(ranking)}")



    else:



        lines.append("MISS ranking 데이터 없음")



        ok = False







    lines.append("")



    lines.append("현재 FANDEX ranking")



    lines.append("-" * 70)







    for item in ranking:



        source_points = item.get("sourcePoints", {})



        naver = source_points.get("naver", {})



        youtube = source_points.get("youtube", {})



        music = source_points.get("musicChart", {})







        lines.append(



            f"{item.get('rank')}위 {item.get('artist')} | "



            f"FANDEX {item.get('fandexFinalPoint')} | "



            f"네이버 {naver.get('cumulativePoint', 0)} | "



            f"유튜브 {youtube.get('cumulativePoint', 0)} | "



            f"음원 {music.get('cumulativePoint', 0)}"



        )







    lines.append("")



    return ok











def check_music_seed(lines):



    path = Path("music_chart_seed_v1.csv")







    if not path.exists():



        lines.append("music seed 확인 불가: music_chart_seed_v1.csv 없음")



        lines.append("")



        return False







    rows = read_csv(path)



    ok = True







    lines.append("music_chart_seed_v1.csv 확인")



    lines.append("-" * 70)







    if rows:



        lines.append(f"OK seed row count: {len(rows)}")



    else:



        lines.append("MISS seed row 없음")



        ok = False







    for row in rows:



        rank = clean(row.get("rank")) or "미진입/스킵"







        lines.append(



            f"{clean(row.get('artist'))} | "



            f"{clean(row.get('platform'))} | "



            f"{clean(row.get('chartName'))} | "



            f"{clean(row.get('trackTitle'))} | "



            f"rank={rank} | "



            f"date={clean(row.get('chartDate'))}"



        )







    lines.append("")



    return ok











def check_itunes(lines):



    seed_path = Path("itunes_track_seed_v2.csv")



    csv_path = Path("itunes_track_metadata_v2_latest.csv")



    json_path = Path(



        "fandex_itunes_track_metadata_v2_latest.json"



    )



    report_path = Path(



        "FANDEX_ITUNES_COLLECTOR_V2_REPORT.txt"



    )







    lines.append("")



    lines.append("iTunes metadata v2 확인")



    lines.append("-" * 70)







    required_paths = [



        seed_path,



        csv_path,



        json_path,



        report_path,



    ]







    missing = [



        str(path)



        for path in required_paths



        if not path.exists()



    ]







    if missing:



        for file_name in missing:



            lines.append(



                f"WARN 파일 없음: {file_name}"



            )



        return False







    try:



        seed_rows = read_csv(seed_path)



        metadata_rows = read_csv(csv_path)



        payload = read_json(json_path)







    except Exception as exc:



        lines.append(



            "WARN iTunes 파일 읽기 실패: "



            f"{type(exc).__name__}: {exc}"



        )



        return False







    seed_ok = len(seed_rows) == 10



    metadata_count_ok = len(metadata_rows) == 10







    invalid_rows = []







    for row in metadata_rows:



        artist = str(



            row.get("artist") or "(artist 없음)"



        ).strip()







        checks = {



            "validationStatus": (



                str(



                    row.get("validationStatus") or ""



                ).strip().lower()



                == "ok"



            ),



            "trackIdMatch": (



                str(



                    row.get("trackIdMatch") or ""



                ).strip().upper()



                == "TRUE"



            ),



            "artistIdMatch": (



                str(



                    row.get("artistIdMatch") or ""



                ).strip().upper()



                == "TRUE"



            ),



            "artistNameMatch": (



                str(



                    row.get("artistNameMatch") or ""



                ).strip().upper()



                == "TRUE"



            ),



            "trackNameMatch": (



                str(



                    row.get("trackNameMatch") or ""



                ).strip().upper()



                == "TRUE"



            ),



        }







        failed = [



            key



            for key, passed in checks.items()



            if not passed



        ]







        if failed:



            invalid_rows.append(



                f"{artist}: {', '.join(failed)}"



            )







    metadata_ok = (



        metadata_count_ok



        and not invalid_rows



    )







    json_ok = (



        isinstance(payload, dict)



        and payload.get("rowCount") == 10



        and payload.get("okCount") == 10



        and payload.get("errorCount") == 0



        and payload.get("warningCount") == 0



        and payload.get("scoreUsage")



        == "metadata_only_not_fandex_score"



        and payload.get("masterModified") is False



        and payload.get("websiteModified") is False



    )







    lines.append(



        f"{'OK' if seed_ok else 'WARN'} "



        f"iTunes seed row count: {len(seed_rows)}"



    )







    lines.append(



        f"{'OK' if metadata_count_ok else 'WARN'} "



        "iTunes metadata row count: "



        f"{len(metadata_rows)}"



    )







    lines.append(



        f"{'OK' if metadata_ok else 'WARN'} "



        "iTunes ID·이름 검증"



    )







    lines.append(



        f"{'OK' if json_ok else 'WARN'} "



        "iTunes JSON 요약 검증"



    )







    for item in invalid_rows:



        lines.append(f"WARN {item}")







    lines.append(



        "INFO scoreUsage: "



        "metadata_only_not_fandex_score"



    )



    lines.append("INFO masterModified: FALSE")



    lines.append("INFO websiteModified: FALSE")







    overall_ok = (



        seed_ok



        and metadata_ok



        and json_ok



    )







    if overall_ok:



        lines.append(



            "OK: iTunes v2 10명 메타데이터 정상"



        )



    else:



        lines.append(



            "WARN: iTunes v2 확인 필요"



        )







    return overall_ok











def check_lastfm(lines):

    seed_path = Path("lastfm_artist_seed_v2.csv")

    csv_path = Path(

        "lastfm_artist_interest_v2_latest.csv"

    )

    json_path = Path(

        "fandex_lastfm_artist_interest_v2_latest.json"

    )

    report_path = Path(

        "FANDEX_LASTFM_COLLECTOR_V2_REPORT.txt"

    )



    lines.append("")

    lines.append("Last.fm metadata v2 확인")

    lines.append("-" * 70)



    required_paths = [

        seed_path,

        csv_path,

        json_path,

        report_path,

    ]



    missing = [

        str(path)

        for path in required_paths

        if not path.exists()

    ]



    if missing:

        for file_name in missing:

            lines.append(

                f"WARN 파일 없음: {file_name}"

            )

        return False



    try:

        seed_rows = read_csv(seed_path)

        metadata_rows = read_csv(csv_path)

        payload = read_json(json_path)



    except Exception as exc:

        lines.append(

            "WARN Last.fm 파일 읽기 실패: "

            f"{type(exc).__name__}: {exc}"

        )

        return False



    seed_ok = len(seed_rows) == 10

    metadata_count_ok = len(metadata_rows) == 10



    invalid_rows = []



    for row in metadata_rows:

        artist = str(

            row.get("artist") or "(artist 없음)"

        ).strip()



        status_ok = (

            str(

                row.get("validationStatus") or ""

            ).strip().lower()

            == "ok"

        )



        name_match_ok = (

            str(

                row.get("lastfmNameMatch") or ""

            ).strip().upper()

            == "TRUE"

        )



        listeners_value = str(

            row.get("listeners") or "0"

        ).replace(",", "").strip()



        playcount_value = str(

            row.get("playcount") or "0"

        ).replace(",", "").strip()



        try:

            listeners_ok = int(

                float(listeners_value)

            ) > 0

        except (TypeError, ValueError):

            listeners_ok = False



        try:

            playcount_ok = int(

                float(playcount_value)

            ) > 0

        except (TypeError, ValueError):

            playcount_ok = False



        failed = []



        if not status_ok:

            failed.append("validationStatus")



        if not name_match_ok:

            failed.append("lastfmNameMatch")



        if not listeners_ok:

            failed.append("listeners")



        if not playcount_ok:

            failed.append("playcount")



        if failed:

            invalid_rows.append(

                f"{artist}: {', '.join(failed)}"

            )



    metadata_ok = (

        metadata_count_ok

        and not invalid_rows

    )



    json_ok = (

        isinstance(payload, dict)

        and payload.get("artistCount") == 10

        and payload.get("okCount") == 10

        and payload.get("errorCount") == 0

        and payload.get("warningCount") == 0

        and payload.get("scoreUsage")

        == "metadata_only_not_fandex_score"

        and payload.get("masterModified") is False

        and payload.get("websiteModified") is False

    )



    lines.append(

        f"{'OK' if seed_ok else 'WARN'} "

        f"Last.fm seed row count: {len(seed_rows)}"

    )



    lines.append(

        f"{'OK' if metadata_count_ok else 'WARN'} "

        "Last.fm metadata row count: "

        f"{len(metadata_rows)}"

    )



    lines.append(

        f"{'OK' if metadata_ok else 'WARN'} "

        "Last.fm 이름·통계 검증"

    )



    lines.append(

        f"{'OK' if json_ok else 'WARN'} "

        "Last.fm JSON 요약 검증"

    )



    for item in invalid_rows:

        lines.append(f"WARN {item}")



    lines.append(

        "INFO scoreUsage: "

        "metadata_only_not_fandex_score"

    )

    lines.append("INFO masterModified: FALSE")

    lines.append("INFO websiteModified: FALSE")



    overall_ok = (

        seed_ok

        and metadata_ok

        and json_ok

    )



    if overall_ok:

        lines.append(

            "OK: Last.fm v2 10명 메타데이터 정상"

        )

    else:

        lines.append(

            "WARN: Last.fm v2 확인 필요"

        )



    return overall_ok





def check_archive(lines):



    archive = Path("archive")







    lines.append("archive 확인")



    lines.append("-" * 70)







    if not archive.exists():



        lines.append("WARN archive 폴더 없음")



        lines.append("")



        return False







    archive_dirs = [p for p in archive.iterdir() if p.is_dir()]



    archive_dirs = sorted(archive_dirs, key=lambda p: p.name, reverse=True)







    lines.append(f"OK archive folder count: {len(archive_dirs)}")







    if archive_dirs:



        lines.append(f"latest archive: {archive_dirs[0]}")







    lines.append("")



    return True











def main():



    now = datetime.now().strftime("%Y%m%d_%H%M%S")



    report_file = Path(f"fandex_python_health_check_v1_{now}.txt")



    latest_file = Path("fandex_python_health_check_latest.txt")







    lines = []







    lines.append("FANDEX Python Health Check v1")



    lines.append("=" * 70)



    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")



    lines.append(f"version: {VERSION}")



    lines.append("scope: Python-only / no website public-data export")



    lines.append("")







    results = []



    results.append(check_required_files(lines))



    results.append(check_master(lines))



    results.append(check_music_seed(lines))



    results.append(check_itunes(lines))

    results.append(check_lastfm(lines))



    results.append(check_archive(lines))







    overall_ok = all(results)







    lines.append("최종 결과")



    lines.append("-" * 70)







    if overall_ok:



        lines.append("OK: Python-only v7.1 stale decay 운영 상태 정상")



    else:



        lines.append("WARN: 확인 필요한 항목 있음")







    lines.append("")



    lines.append("기본 운영 명령")



    lines.append("-" * 70)



    lines.append("run_fandex_daily_python_only.bat")



    lines.append("")



    lines.append("주의")



    lines.append("-" * 70)



    lines.append("Codex 작업 중에는 아래 명령 실행 금지:")



    lines.append("py fandex_export_to_site_v1.py")



    lines.append("py fandex_publish_all_v5.py")



    lines.append("py fandex_publish_all_v5.py --refresh-youtube")







    text = "\n".join(lines)







    report_file.write_text(text, encoding="utf-8")



    latest_file.write_text(text, encoding="utf-8")







    print()



    print(text)



    print()



    print("=" * 70)



    print("health check 파일 생성 완료")



    print("=" * 70)



    print(f"리포트 파일: {report_file}")



    print(f"최신 리포트 파일: {latest_file}")







    if not overall_ok:



        raise SystemExit(1)











if __name__ == "__main__":



    main()