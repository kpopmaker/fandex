from pathlib import Path


path = Path("youtube_collect_video_metrics_v1.py")

if not path.exists():
    raise SystemExit("youtube_collect_video_metrics_v1.py 파일을 찾지 못했습니다.")

text = path.read_text(encoding="utf-8-sig")
original = text

old = '''    print("다음 실행:")
    print("py youtube_publish_v1.py")
    print("py fandex_master_score_v2.py")
'''

new = '''    print("다음 실행:")
    print("py youtube_publish_v2.py")
    print("py music_chart_publish_v1.py")
    print("py fandex_master_score_v6.py")
    print()
    print("또는 전체 publish:")
    print("py fandex_publish_all_v5.py")
    print("py fandex_publish_all_v5.py --refresh-youtube")
'''

if old not in text:
    raise SystemExit("교체할 안내 문구를 찾지 못했습니다. 파일 내용을 확인해야 합니다.")

text = text.replace(old, new)

path.write_text(text, encoding="utf-8")

if text == original:
    print("변경 없음")
else:
    print("youtube_collect_video_metrics_v1.py 다음 실행 안내 문구 패치 완료")