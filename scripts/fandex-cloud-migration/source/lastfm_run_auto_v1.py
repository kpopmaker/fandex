import os
import re
import subprocess
import sys
import winreg
from pathlib import Path


VERSION = "lastfm_run_auto_v1"

ENV_NAME = "LASTFM_API_KEY"

COLLECTOR = Path(
    "lastfm_collect_artist_interest_v2.py"
)

SECURE_FALLBACK = Path(
    "lastfm_run_secure_v2.py"
)


def valid_key(value):
    return bool(
        re.fullmatch(
            r"[0-9a-fA-F]{32}",
            value or "",
        )
    )


def get_registry_key():
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Environment",
        ) as h:
            value = winreg.QueryValueEx(
                h,
                ENV_NAME,
            )[0]

        value = str(value).strip()

        if valid_key(value):
            return value

    except (
        FileNotFoundError,
        OSError,
    ):
        pass

    return ""


def run_script(path, env=None):
    result = subprocess.run(
        [
            sys.executable,
            str(path),
        ],
        env=env,
    )

    return result.returncode


def main():
    print()
    print("FANDEX Last.fm auto runner v1")
    print("=" * 72)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    if not COLLECTOR.exists():
        raise SystemExit(
            f"ERROR: collector 없음: {COLLECTOR}"
        )

    key = (
        os.getenv(
            ENV_NAME,
            "",
        ).strip()
    )

    source = ""

    if valid_key(key):
        source = "process_environment"

    else:
        key = get_registry_key()

        if valid_key(key):
            source = (
                "windows_user_registry"
            )

    if not valid_key(key):
        print()
        print(
            "savedApiKey: NOT FOUND"
        )

        print(
            "fallback: "
            "lastfm_run_secure_v2.py"
        )

        if not SECURE_FALLBACK.exists():
            raise SystemExit(
                "ERROR: secure fallback 없음"
            )

        code = run_script(
            SECURE_FALLBACK
        )

        raise SystemExit(code)

    print()
    print("savedApiKey: FOUND")
    print(f"keySource: {source}")
    print("keyLength: 32")
    print("keyValueDisplayed: FALSE")
    print("sharedSecretRequired: FALSE")

    child_env = os.environ.copy()

    child_env[ENV_NAME] = key

    code = run_script(
        COLLECTOR,
        env=child_env,
    )

    # 이 Python 프로세스에서도
    # 실제 key 변수 참조 제거
    key = ""
    child_env.pop(
        ENV_NAME,
        None,
    )

    print()
    print("=" * 72)

    if code == 0:
        print(
            "Last.fm auto collection: OK"
        )
    else:
        print(
            "Last.fm auto collection: FAILED"
        )

    print(
        "keyValueDisplayed: FALSE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )

    raise SystemExit(code)


if __name__ == "__main__":
    main()