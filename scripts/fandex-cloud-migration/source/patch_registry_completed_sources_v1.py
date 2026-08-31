from pathlib import Path


TARGET = Path("fandex_api_source_registry_v1.py")


REPLACEMENTS = [
    (
        '"sourceId": "spotify_web_api",\n'
        '        "displayName": "Spotify Web API",\n'
        '        "category": "global_music",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "yes",\n'
        '        "credentialEnv": "SPOTIFY_CLIENT_ID,SPOTIFY_CLIENT_SECRET",\n'
        '        "autoCollectPossible": "limited",\n'
        '        "currentStatus": "deferred",',
        '"sourceId": "spotify_web_api",\n'
        '        "displayName": "Spotify Web API",\n'
        '        "category": "global_music",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "yes",\n'
        '        "credentialEnv": "SPOTIFY_CLIENT_ID,SPOTIFY_CLIENT_SECRET",\n'
        '        "autoCollectPossible": "limited",\n'
        '        "currentStatus": "deferred",'
    ),
    (
        '"sourceId": "lastfm_api",\n'
        '        "displayName": "Last.fm API",\n'
        '        "category": "global_music_interest",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "yes",\n'
        '        "credentialEnv": "LASTFM_API_KEY",\n'
        '        "autoCollectPossible": "yes",\n'
        '        "currentStatus": "planned",',
        '"sourceId": "lastfm_api",\n'
        '        "displayName": "Last.fm API",\n'
        '        "category": "global_music_interest",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "yes",\n'
        '        "credentialEnv": "LASTFM_API_KEY",\n'
        '        "autoCollectPossible": "yes",\n'
        '        "currentStatus": "active",'
    ),
    (
        '"sourceId": "musicbrainz_api",\n'
        '        "displayName": "MusicBrainz API",\n'
        '        "category": "music_metadata",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "no",\n'
        '        "credentialEnv": "",\n'
        '        "autoCollectPossible": "yes",\n'
        '        "currentStatus": "planned",',
        '"sourceId": "musicbrainz_api",\n'
        '        "displayName": "MusicBrainz API",\n'
        '        "category": "music_metadata",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "no",\n'
        '        "credentialEnv": "",\n'
        '        "autoCollectPossible": "yes",\n'
        '        "currentStatus": "active",'
    ),
    (
        '"sourceId": "itunes_search_api",\n'
        '        "displayName": "iTunes Search API",\n'
        '        "category": "music_metadata",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "no",\n'
        '        "credentialEnv": "",\n'
        '        "autoCollectPossible": "yes",\n'
        '        "currentStatus": "planned",',
        '"sourceId": "itunes_search_api",\n'
        '        "displayName": "iTunes Search API",\n'
        '        "category": "music_metadata",\n'
        '        "collectionMethod": "official_api",\n'
        '        "authRequired": "no",\n'
        '        "credentialEnv": "",\n'
        '        "autoCollectPossible": "yes",\n'
        '        "currentStatus": "active",'
    ),
]


def main():
    if not TARGET.exists():
        raise SystemExit("fandex_api_source_registry_v1.py 파일이 없습니다.")

    text = TARGET.read_text(encoding="utf-8")

    changed = 0

    for old, new in REPLACEMENTS:
        if old in text:
            text = text.replace(old, new)
            changed += 1

    text = text.replace(
        '    lines.append("1. MusicBrainz collector")\n'
        '    lines.append("2. iTunes Search API collector")\n'
        '    lines.append("3. Last.fm collector")\n'
        '    lines.append("4. Spotify collector")\n'
        '    lines.append("5. YouTube seed auto discovery")\n'
        '    lines.append("6. Melon/Genie collector fallback 구조")\n'
        '    lines.append("7. artist 확장")',
        '    lines.append("1. YouTube seed auto discovery")\n'
        '    lines.append("2. Melon/Genie collector fallback 구조")\n'
        '    lines.append("3. artist 확장")\n'
        '    lines.append("4. Last.fm / MusicBrainz / iTunes 결과를 점수 후보로 정리")\n'
        '    lines.append("5. 점수 공식 고도화")\n'
        '    lines.append("6. Spotify는 Premium 권한 문제 해결 전까지 보류")'
    )

    TARGET.write_text(text, encoding="utf-8")

    print("Registry completed sources patch 완료")
    print(f"status 변경 시도 수: {changed}")
    print()
    print("다음 실행:")
    print("py fandex_api_source_registry_v1.py")


if __name__ == "__main__":
    main()