from pathlib import Path
import py_compile
import sys


VERSION = "patch_master_v7_zero_score_presence_v2"

TARGET = Path("fandex_master_score_v7.py")

BACKUP = Path(
    "fandex_master_score_v7_before_zero_score_presence_v2.py"
)


HELPER = r'''
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
'''.strip("\n")


def main():
    apply_mode = "--apply" in sys.argv

    print()
    print("FANDEX Master v7 zero-score presence patch v2")
    print("=" * 76)
    print(f"version: {VERSION}")
    print("mode:", "APPLY" if apply_mode else "PREVIEW")
    print("masterModified:", "TRUE" if apply_mode else "FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 대상 파일 없음: {TARGET}"
        )

    original = TARGET.read_text(
        encoding="utf-8-sig",
        errors="strict",
    )

    if (
        "def has_latest_source_score(" in original
        and "score_present = has_latest_source_score(" in original
    ):
        print()
        print("ALREADY PATCHED")
        return

    lines = original.splitlines()

    # --------------------------------------------------------
    # helper 삽입 위치 찾기
    # --------------------------------------------------------
    map_def_index = None

    for i, line in enumerate(lines):
        if line.strip() == (
            "def make_latest_source_map(payload, source_type):"
        ):
            map_def_index = i
            break

    if map_def_index is None:
        raise SystemExit(
            "ERROR: make_latest_source_map 함수를 찾지 못했습니다."
        )

    # --------------------------------------------------------
    # 기존 score <= 0 블록 찾기
    # --------------------------------------------------------
    score_index = None
    if_index = None
    continue_index = None

    for i in range(
        map_def_index,
        min(len(lines), map_def_index + 100),
    ):
        if (
            lines[i].strip()
            == "score = get_latest_source_score(item, source_type)"
        ):
            score_index = i
            break

    if score_index is None:
        raise SystemExit(
            "ERROR: score 계산 라인을 찾지 못했습니다."
        )

    for i in range(
        score_index + 1,
        min(len(lines), score_index + 20),
    ):
        if lines[i].strip() == "if score <= 0:":
            if_index = i
            break

    if if_index is None:
        raise SystemExit(
            "ERROR: 기존 'if score <= 0:' 조건을 찾지 못했습니다."
        )

    for i in range(
        if_index + 1,
        min(len(lines), if_index + 10),
    ):
        if lines[i].strip() == "continue":
            continue_index = i
            break

    if continue_index is None:
        raise SystemExit(
            "ERROR: 기존 continue 라인을 찾지 못했습니다."
        )

    print()
    print("helper insert: READY")
    print("zero-score block replace: READY")
    print(
        f"target old lines: "
        f"{score_index + 1}-{continue_index + 1}"
    )

    if not apply_mode:
        print()
        print("PREVIEW ONLY - 아직 수정하지 않았습니다.")
        print()
        print("적용 명령:")
        print(
            "py patch_master_v7_zero_score_presence_v2.py --apply"
        )
        return

    # --------------------------------------------------------
    # 원본 백업
    # --------------------------------------------------------
    BACKUP.write_text(
        original,
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # 먼저 기존 block 교체
    # --------------------------------------------------------
    new_block = [
        "        score_present = "
        "has_latest_source_score(item, source_type)",
        "",
        "        if not score_present:",
        "",
        "            continue",
        "",
        "",
        "",
        "        score = "
        "get_latest_source_score(item, source_type)",
        "",
        "",
        "",
        "        # 실제 0점은 유효하다.",
        "        # 음수만 비정상 점수로 제외한다.",
        "        if score < 0:",
        "",
        "            continue",
    ]

    lines[
        score_index:continue_index + 1
    ] = new_block

    # block 변경으로 map_def 위치는 그대로이므로
    # 그 앞에 helper 삽입
    lines[
        map_def_index:map_def_index
    ] = (
        HELPER.splitlines()
        + ["", "", "", ""]
    )

    patched = "\n".join(lines) + "\n"

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # syntax 검증
    # --------------------------------------------------------
    try:
        py_compile.compile(
            str(TARGET),
            doraise=True,
        )
    except Exception as e:
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: syntax compile 실패. "
            "원본 자동 복구 완료.\n"
            + str(e)
        )

    verify = TARGET.read_text(
        encoding="utf-8-sig",
        errors="strict",
    )

    required = [
        "def has_latest_source_score(",
        "score_present = has_latest_source_score(",
        "if not score_present:",
        "if score < 0:",
    ]

    missing = [
        x for x in required
        if x not in verify
    ]

    if missing:
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: 적용 후 검증 실패. "
            "원본 자동 복구 완료.\n"
            + "\n".join(missing)
        )

    print()
    print("APPLY 완료")
    print(f"originalCopy: {BACKUP}")
    print("syntaxCompile: OK")
    print("zeroScorePreserved: TRUE")
    print("missingScoreStillSkipped: TRUE")
    print("masterModified: CODE_ONLY")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()