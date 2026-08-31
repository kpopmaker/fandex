import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "patch_master_v7_zero_score_fallback_v1"

TARGET = Path("fandex_master_score_v7.py")
PREVIEW = Path(
    "fandex_master_score_v7_zero_score_fallback_preview.py"
)


OLD_BLOCK = '''        naver_latest = safe_float(naver_map.get(artist, {}).get("score"))
        youtube_latest = safe_float(youtube_map.get(artist, {}).get("score"))
        music_latest = safe_float(music_map.get(artist, {}).get("score"))

        naver_point = naver_latest if naver_latest > 0 else previous_naver_point
        youtube_point = youtube_latest if youtube_latest > 0 else previous_youtube_point
        music_point = music_latest if music_latest > 0 else previous_music_point

        naver_source = "latest_naver_v3" if naver_latest > 0 else "fallback_previous_master"
        youtube_source = "latest_youtube_v3" if youtube_latest > 0 else "fallback_previous_master"
        music_source = "latest_music_chart_v1" if music_latest > 0 else "fallback_previous_master"
'''


NEW_BLOCK = '''        naver_present = artist in naver_map
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
'''


def read_target():
    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {TARGET}"
        )

    raw = TARGET.read_bytes()

    has_bom = raw.startswith(
        b"\xef\xbb\xbf"
    )

    text = raw.decode("utf-8-sig")

    newline = "\r\n" if "\r\n" in text else "\n"

    return text, has_bom, newline


def write_file(path, text, has_bom):
    encoding = (
        "utf-8-sig"
        if has_bom
        else "utf-8"
    )

    path.write_text(
        text,
        encoding=encoding,
    )


def main():
    apply_mode = "--apply" in sys.argv

    text, has_bom, newline = read_target()

    old = OLD_BLOCK.replace("\n", newline)
    new = NEW_BLOCK.replace("\n", newline)

    old_count = text.count(old)

    print()
    print(
        "FANDEX Master v7 zero-score fallback patch"
    )
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + ("APPLY" if apply_mode else "DRY-RUN")
    )
    print(f"target: {TARGET}")
    print(f"oldBlockMatchCount: {old_count}")

    if old_count == 0:
        if (
            "naver_present = artist in naver_map"
            in text
            and "youtube_present = artist in youtube_map"
            in text
            and "music_present = artist in music_map"
            in text
        ):
            print("status: ALREADY_PATCHED")
            print("masterExecuted: FALSE")
            print("websiteModified: FALSE")
            return

        raise SystemExit(
            "ERROR: 교체 대상 코드 블록을 찾지 못했습니다."
        )

    if old_count != 1:
        raise SystemExit(
            "ERROR: 교체 대상 블록이 "
            f"{old_count}개입니다. 자동 적용 중단."
        )

    patched = text.replace(
        old,
        new,
        1,
    )

    # 기존의 잘못된 fallback 조건이 남아 있지 않아야 한다.
    forbidden = [
        'naver_latest if naver_latest > 0',
        'youtube_latest if youtube_latest > 0',
        'music_latest if music_latest > 0',
        '"latest_naver_v3" if naver_latest > 0',
        '"latest_youtube_v3" if youtube_latest > 0',
        '"latest_music_chart_v1" if music_latest > 0',
    ]

    remaining = [
        item
        for item in forbidden
        if item in patched
    ]

    if remaining:
        print()
        print("ERROR: 이전 fallback 조건 잔존")
        for item in remaining:
            print(f"- {item}")
        raise SystemExit(1)

    required = [
        "naver_present = artist in naver_map",
        "youtube_present = artist in youtube_map",
        "music_present = artist in music_map",
        "naver_latest if naver_present",
        "youtube_latest if youtube_present",
        "music_latest if music_present",
    ]

    missing = [
        item
        for item in required
        if item not in patched
    ]

    if missing:
        print()
        print("ERROR: 새 조건 누락")
        for item in missing:
            print(f"- {item}")
        raise SystemExit(1)

    try:
        compile(
            patched,
            str(TARGET),
            "exec",
        )
    except SyntaxError as exc:
        raise SystemExit(
            "ERROR: Python 문법 검증 실패\n"
            f"{exc}"
        )

    print("syntaxCheck: OK")
    print("zeroScoreFallbackLogic: FIXED")
    print(
        "fallbackRule: "
        "latest source에 artist가 없을 때만 previous 사용"
    )
    print("masterExecuted: FALSE")
    print("websiteModified: FALSE")

    if not apply_mode:
        write_file(
            PREVIEW,
            patched,
            has_bom,
        )

        print()
        print("DRY-RUN 완료")
        print(f"preview: {PREVIEW}")
        print()
        print("실제 적용 명령:")
        print(
            "py "
            "patch_master_v7_zero_score_fallback_v1.py "
            "--apply"
        )
        return

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup_dir = Path(
        "patch_backup_before_"
        "master_v7_zero_score_fallback_"
        f"{timestamp}"
    )

    backup_dir.mkdir(
        parents=True,
        exist_ok=False,
    )

    shutil.copy2(
        TARGET,
        backup_dir / TARGET.name,
    )

    write_file(
        TARGET,
        patched,
        has_bom,
    )

    print()
    print("=" * 76)
    print("패치 적용 완료")
    print("=" * 76)
    print(f"backupDir: {backup_dir}")
    print(f"updated: {TARGET}")
    print("masterExecuted: FALSE")
    print("websiteModified: FALSE")
    print()
    print(
        "주의: 아직 fandex_master_score_v7.py는 "
        "실행하지 않았습니다."
    )


if __name__ == "__main__":
    main()