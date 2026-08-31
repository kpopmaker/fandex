import os
import re
import winreg
from tkinter import Tk, simpledialog, messagebox


VERSION = "lastfm_save_api_key_secure_v1"
ENV_NAME = "LASTFM_API_KEY"


def save_user_environment(name, value):
    with winreg.OpenKey(
        winreg.HKEY_CURRENT_USER,
        r"Environment",
        0,
        winreg.KEY_SET_VALUE,
    ) as key:
        winreg.SetValueEx(
            key,
            name,
            0,
            winreg.REG_SZ,
            value,
        )


def main():
    root = Tk()
    root.withdraw()

    api_key = simpledialog.askstring(
        "Last.fm API Key 저장",
        "Last.fm API Key를 입력하세요.\n\n"
        "• API Key만 입력\n"
        "• Shared Secret은 입력하지 않음\n"
        "• 입력값은 화면에 출력하지 않음",
        show="*",
        parent=root,
    )

    if api_key is None:
        print("CANCELLED")
        root.destroy()
        return

    api_key = api_key.strip()

    if not re.fullmatch(
        r"[0-9a-fA-F]{32}",
        api_key,
    ):
        messagebox.showerror(
            "API Key 형식 오류",
            "32자리 Last.fm API Key 형식이 아닙니다.\n\n"
            f"감지 길이: {len(api_key)}",
            parent=root,
        )

        print("INVALID")
        root.destroy()
        return

    save_user_environment(
        ENV_NAME,
        api_key,
    )

    # 현재 Python 프로세스에도 설정
    os.environ[ENV_NAME] = api_key

    messagebox.showinfo(
        "저장 완료",
        "Last.fm API Key를 Windows 사용자 "
        "환경변수에 저장했습니다.\n\n"
        "새 CMD부터 자동으로 사용할 수 있습니다.",
        parent=root,
    )

    print(
        "LASTFM_API_KEY saved: TRUE"
    )
    print(
        f"length: {len(api_key)}"
    )
    print(
        "keyValueDisplayed: FALSE"
    )
    print(
        "sharedSecretStored: FALSE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )

    root.destroy()


if __name__ == "__main__":
    main()