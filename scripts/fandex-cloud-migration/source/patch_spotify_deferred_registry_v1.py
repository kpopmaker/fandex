from pathlib import Path


TARGET = Path("fandex_api_source_registry_v1.py")


def main():
    if not TARGET.exists():
        raise SystemExit("fandex_api_source_registry_v1.py 파일이 없습니다.")

    text = TARGET.read_text(encoding="utf-8")

    old_block = '''{
        "sourceId": "spotify_web_api",
        "displayName": "Spotify Web API",
        "category": "global_music",
        "collectionMethod": "official_api",
        "authRequired": "yes",
        "credentialEnv": "SPOTIFY_CLIENT_ID,SPOTIFY_CLIENT_SECRET",
        "autoCollectPossible": "yes",
        "currentStatus": "planned",
        "priority": "medium_high",
        "scoreUse": "global catalog / artist metadata / top tracks",
        "reliability": "high",
        "difficulty": "medium",
        "pipelineRisk": "medium",
        "notes": "글로벌 음원 신호. popularity 값 사용 가능 여부는 실제 API 응답 검증 필요.",
    },'''

    new_block = '''{
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
    },'''

    if old_block not in text:
        raise SystemExit("Spotify source block을 찾지 못했습니다. 파일이 이미 수정됐을 수 있습니다.")

    text = text.replace(old_block, new_block)

    TARGET.write_text(text, encoding="utf-8")

    print("Spotify Web API 상태를 deferred로 패치 완료")
    print("다음 실행:")
    print("py fandex_api_source_registry_v1.py")


if __name__ == "__main__":
    main()