from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_mystic_story_verified_music_profiles_v1.py"

spec = importlib.util.spec_from_file_location("mystic_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

bill = "<html><body>Billlie @MYSTIC STORY 2021 " + " ".join(module.BILL_MEMBER_TOKENS) + "</body></html>"
lucy = "<html><body>LUCY @MYSTIC STORY 2020 " + " ".join(module.LUCY_MEMBER_TOKENS) + "</body></html>"
son = "<html><body>SON TAEJIN 손태진 @MYSTIC STORY 솔로 정규 1집 SHINE</body></html>"

rows = module.parse_live_pages(bill, lucy, son)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T21:47:00+09:00")
assert snapshot["candidateCount"] == 3
assert snapshot["verifiedProfiles"]["Billlie"]["members"] == module.BILL_MEMBERS
assert snapshot["verifiedProfiles"]["LUCY"]["members"] == module.LUCY_MEMBERS
assert snapshot["verifiedProfiles"]["SON TAEJIN"]["entityType"] == "solo"
assert snapshot["contract"]["thisIsNotClaimedAsCompleteMysticRoster"] is True
assert snapshot["contract"]["actorProfilesExcluded"] is True
assert snapshot["contract"]["creatorProfilesExcluded"] is True
assert snapshot["contract"]["groupMembershipAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(bill.replace("HARUNA", "HARUNA"), lucy, son) != []
assert module.parse_live_pages(bill.replace("하루나", ""), lucy, son) == []
assert module.parse_live_pages(bill, lucy.replace("신광일", ""), son) == []
assert module.parse_live_pages(bill, lucy, son.replace("SHINE", "")) == []
assert module.parse_live_pages(bill, lucy, son.replace("MYSTIC STORY", "OTHER")) == []

print("MYSTIC STORY verified music profile regression: PASS")
