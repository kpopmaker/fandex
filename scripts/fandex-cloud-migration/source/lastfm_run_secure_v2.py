import os
import re
import runpy
import sys
import tkinter as tk
from tkinter import messagebox, simpledialog

import requests


API_URL = "https://ws.audioscrobbler.com/2.0/"


def main():
    root = tk.Tk()
    root.withdraw()

    api_key = simpledialog.askstring(
        "Last.fm API Key",
        "Last.fm API Accounts 페이지에서\n"
        "API Key 값만 복사해 붙여넣으세요.\n\n"
        "Shared Secret은 입력하지 않습니다.",
        show="*",
        parent=root,
    )

    if api_key is None:
        root.destroy()
        print("취소되었습니다.")
        return 1

    api_key = api_key.strip()

    # 일반적인 Last.fm API Key 형식 검증
    if not re.fullmatch(r"[0-9a-fA-F]{32}", api_key):
        messagebox.showerror(
            "API Key 형식 오류",
            "API Key는 보통 영문·숫자로 된 32자리 값입니다.\n\n"
            f"현재 감지 길이: {len(api_key)}\n"
            "API Key 값만 다시 복사해 주세요.",
            parent=root,
        )
        root.destroy()
        return 1

    # 전체 수집 전에 IU 한 명으로 키 유효성 검사
    try:
        response = requests.get(
            API_URL,
            params={
                "method": "artist.getInfo",
                "api_key": api_key,
                "format": "json",
                "artist": "IU",
                "autocorrect": 1,
            },
            timeout=30,
        )

        payload = response.json()

        if response.status_code != 200 or "error" in payload:
            error_message = (
                f"HTTP {response.status_code}\n"
                f"Last.fm 오류: {payload.get('error', '')}\n"
                f"{payload.get('message', 'API Key를 확인하세요.')}"
            )

            messagebox.showerror(
                "API Key 인증 실패",
                error_message,
                parent=root,
            )
            root.destroy()
            return 1

    except Exception as exc:
        messagebox.showerror(
            "Last.fm 연결 실패",
            f"{type(exc).__name__}: {exc}",
            parent=root,
        )
        root.destroy()
        return 1

    messagebox.showinfo(
        "API Key 확인 완료",
        "API Key 인증에 성공했습니다.\n"
        "이제 10명 수집을 시작합니다.",
        parent=root,
    )

    root.destroy()

    # 이번 Python 실행에서만 환경변수로 사용
    os.environ["LASTFM_API_KEY"] = api_key

    try:
        runpy.run_path(
            "lastfm_collect_artist_interest_v2.py",
            run_name="__main__",
        )
    finally:
        os.environ.pop("LASTFM_API_KEY", None)

    return 0


if __name__ == "__main__":
    sys.exit(main())