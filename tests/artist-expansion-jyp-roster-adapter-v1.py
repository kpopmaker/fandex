from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_jyp_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("jyp_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <a href="https://jyp.jype.com/">J.Y. Park</a>
  <a href="https://2pm.jype.com/">2PM</a>
  <a href="https://day6.jype.com/">DAY6</a>
  <a href="https://boystory.jype.com/">BOY STORY</a>
  <a href="https://niziu.com/">NiziU</a>
  <a href="https://www.kick-flip.com/">KickFlip</a>
  <a href="https://www.instagram.com/jypentertainment/">instagram</a>
  <a href="https://audition.jype.com/">AUDITION</a>
  <a href="https://recruit.jype.com/">RECRUIT</a>
  <a href="https://privacy.jype.com/">개인정보처리방침</a>
  <a href="/ko/Artist/Album">ALBUM</a>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "J.Y. Park",
    "2PM",
    "DAY6",
    "BOY STORY",
    "NiziU",
    "KickFlip",
]
assert rows[0]["evidence"][0]["url"] == "https://jyp.jype.com/"
assert rows[4]["evidence"][0]["url"] == "https://niziu.com/"

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-25T00:00:00+00:00",
)
assert snapshot["source"]["id"] == "jyp-entertainment-official-artist-roster"
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["candidateCount"] == 6
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["contract"]["identityReviewRequired"] is True
assert snapshot["contract"]["scopeVerificationRequired"] is True

assert module.is_artist_profile_url("https://www.instagram.com/jypentertainment/") is False
assert module.is_artist_profile_url("https://www.jype.com/ko/Artist/Album") is False
assert module.is_artist_profile_url("https://audition.jype.com/") is False
assert module.is_artist_profile_url("https://recruit.jype.com/") is False
assert module.is_artist_profile_url("https://privacy.jype.com/") is False
assert module.is_artist_profile_url("https://ciiu.jype.com/") is True

print("JYP agency roster adapter regression: PASS")
