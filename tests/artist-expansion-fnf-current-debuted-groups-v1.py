from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_fnf_current_debuted_groups_v1.py"
spec = importlib.util.spec_from_file_location("fnf_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

unis_profile = "<html><body>UNIS 유니스 MEMBER HYEONJU NANA GEHLEE KOTOKO YUNHA ELISIA YOONA SEOWON</body></html>"
unis_activity = "<html><body>2026 유니스 UNIS 하늘땅 별땅 F&F엔터테인먼트</body></html>"
ahof_discography = "<html><body>WHO WE ARE AHOF 아홉 스티븐 서정우 차웅기 장슈아이보 박한 제이엘 박주원 즈언 다이스케</body></html>"
ahof_activity = "<html><body>2026 AHOF 아홉 RUN TO YOU F&F엔터테인먼트</body></html>"
universe_ticket = "<html><body>UNIVERSE TICKET 유니버스 티켓 글로벌 걸그룹 데뷔 프로젝트</body></html>"
universe_league = "<html><body>UNIVERSE LEAGUE 유니버스 리그 소년들의 데뷔 프로젝트</body></html>"

rows = module.parse_live_pages(
    unis_profile,
    unis_activity,
    ahof_discography,
    ahof_activity,
    universe_ticket,
    universe_league,
)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T23:18:00+09:00")
assert snapshot["candidateCount"] == 2
assert snapshot["currentRoster"]["UNIS"]["members"] == module.UNIS_MEMBERS
assert snapshot["currentRoster"]["UNIS"]["memberCount"] == 8
assert snapshot["currentRoster"]["AHOF"]["members"] == module.AHOF_MEMBERS
assert snapshot["currentRoster"]["AHOF"]["memberCount"] == 9
assert [row["displayArtist"] for row in snapshot["excludedProjectIdentities"]] == ["UNIVERSE TICKET", "UNIVERSE LEAGUE"]
assert snapshot["contract"]["survivalProgramProjectIdentityExcluded"] is True
assert snapshot["contract"]["programParticipantDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(
    unis_profile.replace("SEOWON", ""),
    unis_activity,
    ahof_discography,
    ahof_activity,
    universe_ticket,
    universe_league,
) == []
assert module.parse_live_pages(
    unis_profile,
    unis_activity,
    ahof_discography.replace("다이스케", ""),
    ahof_activity,
    universe_ticket,
    universe_league,
) == []
assert module.parse_live_pages(
    unis_profile,
    unis_activity.replace("2026", "2025"),
    ahof_discography,
    ahof_activity,
    universe_ticket,
    universe_league,
) == []
assert module.parse_live_pages(
    unis_profile,
    unis_activity,
    ahof_discography,
    ahof_activity.replace("RUN TO YOU", "OTHER"),
    universe_ticket,
    universe_league,
) == []
assert module.parse_live_pages(
    unis_profile,
    unis_activity,
    ahof_discography,
    ahof_activity,
    universe_ticket.replace("UNIVERSE TICKET", "OTHER"),
    universe_league,
) == []

print("F&F current debuted groups regression: PASS")
