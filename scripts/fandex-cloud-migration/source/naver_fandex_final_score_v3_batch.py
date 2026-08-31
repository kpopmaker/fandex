import subprocess
import sys
import os


ARTIST_LIST_FILE = "artist_list.txt"


def read_artist_list():
    if not os.path.exists(ARTIST_LIST_FILE):
        return []

    artists = []

    with open(ARTIST_LIST_FILE, "r", encoding="utf-8-sig") as f:
        for line in f:
            name = line.strip()
            if name:
                artists.append(name)

    return artists


def run_final_v3_for_artist(artist):
    process = subprocess.run(
        [sys.executable, "naver_fandex_final_score_v3.py"],
        input=artist + "\n",
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )

    output = (process.stdout or "") + "\n" + (process.stderr or "")

    if process.returncode != 0:
        print(f"[{artist}] final v3 실패")
        print(output)
        return False

    fail_keywords = [
        "필요한 파일이 부족합니다",
        "데이터가 없습니다",
        "오류",
        "실패",
        "Traceback",
        "Error",
        "Exception",
    ]

    if any(keyword in output for keyword in fail_keywords):
        print(f"[{artist}] final v3 실패 감지")
        print(output)
        return False

    print(f"[{artist}] final v3 생성 성공")
    return True


def main():
    artists = read_artist_list()

    if not artists:
        print("artist_list.txt에 아티스트명이 없습니다.")
        return

    print()
    print("네이버 FANDEX final v3 일괄 생성 시작")
    print(f"대상 아티스트: {', '.join(artists)}")
    print()

    success_count = 0
    fail_count = 0

    for artist in artists:
        ok = run_final_v3_for_artist(artist)

        if ok:
            success_count += 1
        else:
            fail_count += 1

    print()
    print("final v3 일괄 생성 종료")
    print(f"성공: {success_count}명")
    print(f"실패: {fail_count}명")

    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()