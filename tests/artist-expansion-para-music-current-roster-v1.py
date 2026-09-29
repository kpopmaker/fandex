from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_para_music_current_roster_v1.py"
spec = importlib.util.spec_from_file_location("para_music_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

index = "<html><body>ARTISTS 박우진 PARK WOO JIN 유나이트 YOUNITE</body></html>"
park_profile = "<html><body>PARK WOO JIN 박우진 2017 Wanna One 2019 AB6IX</body></html>"
park_contract = "<html><body>2026 파라뮤직 박우진 전속 계약 Cool & Hot 솔로 아티스트</body></html>"
younite_profile = "<html><body>YOUNITE 유나이트 MEMBER 우노 스티브 경문 형석 은호 시온 DEY</body></html>"
younite_activity = "<html><body>2026 유나이트 YOUNITE 파라뮤직 이적 후 첫 컴백 INYUN Part.1</body></html>"
younite_notice = "<html><body>2026 YOUNITE 은상 제외 7인 체제 활동 계속 은상 솔로 아티스트 준비</body></html>"

rows = module.parse_live_pages(
    index,
    park_profile,
    park_contract,
    younite_profile,
    younite_activity,
    younite_notice,
)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T23:55:00+09:00")
assert snapshot["candidateCount"] == 2
assert snapshot["currentRoster"]["PARK WOO JIN"]["entityType"] == "solo"
assert snapshot["currentRoster"]["PARK WOO JIN"]["agency"] == "PARA MUSIC"
assert snapshot["currentRoster"]["YOUNITE"]["members"] == module.YOUNITE_MEMBERS
assert snapshot["currentRoster"]["YOUNITE"]["memberCount"] == 7
assert snapshot["groupMembershipChanges"]["YOUNITE"]["departedFromCurrentGroupRoster"] == ["EUNSANG"]
assert snapshot["contract"]["memberNameAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["dedicatedSoloArtistProfileRequiredForNewSoloCanonical"] is True
assert snapshot["contract"]["eunsangPreparationDoesNotAutoCreateCanonical"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(
    index.replace("PARK WOO JIN", ""),
    park_profile,
    park_contract,
    younite_profile,
    younite_activity,
    younite_notice,
) == []
assert module.parse_live_pages(
    index,
    park_profile,
    park_contract.replace("전속 계약", ""),
    younite_profile,
    younite_activity,
    younite_notice,
) == []
assert module.parse_live_pages(
    index,
    park_profile,
    park_contract,
    younite_profile.replace("시온", ""),
    younite_activity,
    younite_notice,
) == []
assert module.parse_live_pages(
    index,
    park_profile,
    park_contract,
    younite_profile,
    younite_activity,
    younite_notice.replace("7인 체제", ""),
) == []
assert module.parse_live_pages(
    index,
    park_profile,
    park_contract,
    younite_profile,
    younite_activity.replace("이적 후 첫 컴백", ""),
    younite_notice,
) == []

print("PARA MUSIC current artist roster regression: PASS")
