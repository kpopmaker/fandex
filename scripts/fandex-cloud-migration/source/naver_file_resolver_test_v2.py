from naver_file_resolver_v2 import debug_artist_files


def main():
    artist = input("파일 선택을 확인할 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    debug_artist_files(artist)


if __name__ == "__main__":
    main()