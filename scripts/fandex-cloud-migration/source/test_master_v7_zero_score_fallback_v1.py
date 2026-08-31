VERSION = "test_master_v7_zero_score_fallback_v1"


def resolve_point(artist, latest_map, previous_point):
    present = artist in latest_map

    latest = float(
        latest_map.get(
            artist,
            {},
        ).get(
            "score",
            0,
        )
        or 0
    )

    point = latest if present else previous_point

    source = (
        "latest"
        if present
        else "fallback_previous_master"
    )

    return point, source


def run_test(
    name,
    artist,
    latest_map,
    previous_point,
    expected_point,
    expected_source,
):
    point, source = resolve_point(
        artist,
        latest_map,
        previous_point,
    )

    passed = (
        point == expected_point
        and source == expected_source
    )

    print(
        f"{'OK' if passed else 'FAIL'} "
        f"{name} | "
        f"point={point} | "
        f"source={source}"
    )

    return passed


def main():
    print()
    print(
        "FANDEX Master v7 "
        "zero-score fallback self-test"
    )
    print("=" * 72)

    results = []

    results.append(
        run_test(
            "latest positive",
            "아이유",
            {"아이유": {"score": 24.0}},
            50.0,
            24.0,
            "latest",
        )
    )

    results.append(
        run_test(
            "latest zero",
            "세븐틴",
            {"세븐틴": {"score": 0.0}},
            40.0,
            0.0,
            "latest",
        )
    )

    results.append(
        run_test(
            "latest string zero",
            "스트레이키즈",
            {"스트레이키즈": {"score": "0"}},
            35.0,
            0.0,
            "latest",
        )
    )

    results.append(
        run_test(
            "artist missing",
            "투모로우바이투게더",
            {"아이유": {"score": 24.0}},
            28.0,
            28.0,
            "fallback_previous_master",
        )
    )

    results.append(
        run_test(
            "artist present empty score",
            "에스파",
            {"에스파": {}},
            60.0,
            0.0,
            "latest",
        )
    )

    results.append(
        run_test(
            "zero to zero",
            "뉴진스",
            {"뉴진스": {"score": 0}},
            0.0,
            0.0,
            "latest",
        )
    )

    print()
    print("=" * 72)

    passed = sum(results)

    print(f"passed: {passed}/{len(results)}")

    if all(results):
        print(
            "OK: zero-score fallback logic 정상"
        )
        print(
            "OK: 최신 0점이 이전 점수로 부활하지 않음"
        )
        print("masterExecuted: FALSE")
        print("websiteModified: FALSE")
        return

    raise SystemExit(
        "FAIL: zero-score fallback logic 확인 필요"
    )


if __name__ == "__main__":
    main()