from pathlib import Path
import re

path = Path("naver_apply_quality_blocklist_v3.py")
text = path.read_text(encoding="utf-8-sig")

negative_cap_block = '''
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

# 1. 변수 정의가 실제로 없으면 추가
if "NEWS_ISSUE_GROUP_NEGATIVE_CAP =" not in text:
    marker = "BLOG_TOPIC_KEY_CAP = {"

    if marker not in text:
        raise SystemExit("BLOG_TOPIC_KEY_CAP 위치를 찾지 못했습니다.")

    text = text.replace(marker, negative_cap_block + marker, 1)
    print("NEWS_ISSUE_GROUP_NEGATIVE_CAP 변수 정의 추가 완료")
else:
    print("NEWS_ISSUE_GROUP_NEGATIVE_CAP 변수 정의가 이미 있습니다.")

# 2. apply_news_cap 함수도 안전하게 교체
new_func = '''def apply_news_cap(issue_group, raw_point):
    positive_cap = NEWS_ISSUE_GROUP_CAP.get(issue_group, 3.0)
    negative_cap = NEWS_ISSUE_GROUP_NEGATIVE_CAP.get(issue_group, -3.0)

    if raw_point >= 0:
        return round(min(raw_point, positive_cap), 2)

    return round(max(raw_point, negative_cap), 2)
'''

pattern = r"def apply_news_cap\(issue_group, raw_point\):\n(?:    .+\n)+?(?=\n\ndef |\n\ndef rebuild_news_cluster|\n\ndef apply_blog_caps)"

match = re.search(pattern, text)

if match:
    text = text[:match.start()] + new_func + text[match.end():]
    print("apply_news_cap 함수 교체 완료")
else:
    print("apply_news_cap 함수를 자동으로 찾지 못했습니다. 변수 정의만 추가했습니다.")

path.write_text(text, encoding="utf-8")
print("패치 완료")