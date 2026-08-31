from pathlib import Path

path = Path("naver_apply_quality_blocklist_v3.py")
text = path.read_text(encoding="utf-8")

if "NEWS_ISSUE_GROUP_NEGATIVE_CAP" in text:
    print("이미 NEWS_ISSUE_GROUP_NEGATIVE_CAP이 있습니다.")
else:
    insert_text = '''
NEWS_ISSUE_GROUP_NEGATIVE_CAP = {
    "record_chart_award": -5.0,
    "music_release": -5.0,
    "brand_ad": -4.0,
    "brand_rank": -4.0,
    "content_drama_broadcast": -5.0,
    "concert_fan_event": -5.0,
    "donation_goodwill": -3.0,
    "award_event": -3.0,
    "controversy": -20.0,
    "relationship_mention": -1.0,
    "weak_related": -0.5,
    "general": -3.0,
    "none": 0.0,
}

'''

    marker = "BLOG_TOPIC_KEY_CAP = {"

    if marker not in text:
        raise SystemExit("BLOG_TOPIC_KEY_CAP 위치를 찾지 못했습니다.")

    text = text.replace(marker, insert_text + marker, 1)
    path.write_text(text, encoding="utf-8")
    print("NEWS_ISSUE_GROUP_NEGATIVE_CAP 추가 완료")