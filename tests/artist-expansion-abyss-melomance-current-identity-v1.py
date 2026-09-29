from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_abyss_melomance_current_identity_catalog_v1.py"

spec = importlib.util.spec_from_file_location("abyss_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

contents = """
<html><body>
멜로망스(MeloMance) 2026 서울신문 봄날음악회 좋은 날 LIVE CLIP
2026 김민석 소극장 콘서트 성하록 : 여름사이
여름집 상 여름집 하 김민석
정동환의 어쿠스틱 룸
</body></html>
"""
event = """
<html><body>
안녕하세요. 어비스컴퍼니입니다.
멜로망스 8th EP Romance Express 발매 기념 스트리밍 이벤트
</body></html>
"""

rows = module.parse_live_pages(contents, event)
assert [row["displayArtist"] for row in rows] == ["MeloMance", "Kim Min-seok"]

snapshot = module.build_snapshot(rows, "2026-09-29T20:35:00+09:00")
assert snapshot["candidateCount"] == 2
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["currentIdentity"]["MeloMance"]["agency"] == "ABYSS COMPANY"
assert snapshot["currentIdentity"]["MeloMance"]["lifecycleStatus"] == "active"
assert snapshot["currentIdentity"]["Kim Min-seok"]["entityType"] == "solo"
assert snapshot["currentIdentity"]["Kim Min-seok"]["lifecycleStatus"] == "active"
assert snapshot["contract"]["groupMembershipAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["soloIdentityDoesNotDetachMemberFromGroup"] is True
assert snapshot["contract"]["noMemberRosterMutationFromContentIndex"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(contents.replace("2026 서울신문 봄날음악회", "2025 event"), event) == []
assert module.parse_live_pages(contents.replace("김민석", "OTHER"), event) == []
assert module.parse_live_pages(contents.replace("정동환", "OTHER"), event) == []
assert module.parse_live_pages(contents, event.replace("어비스컴퍼니", "OTHER")) == []
assert module.parse_live_pages(contents, event.replace("Romance Express", "OTHER").replace("멜로망스 8th EP", "OTHER")) == []

print("ABYSS MeloMance current identity catalog regression: PASS")
