from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_wei_oui_current_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("wei_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

roster = "<html><body>SINGERS 장대현 JANG DAE HYEON 김동한 KIM DONG HAN 유용하 YOO YONG HA 김요한 KIM YO HAN 강석화 KANG SEOK HWA 김준서 KIM JUN SEO</body></html>"
schedule = "<html><body>위아이 I 윤가이 I 우민규 스케줄은 매주 월요일 업데이트 됩니다.</body></html>"
notice = "<html><body>2026-05-06 안녕하세요. 위엔터테인먼트입니다. WEi 멤버 강석화가 참여했습니다.</body></html>"
profile = "<html><body>2025.10.29 위아이(WEi) 8th Mini Album [Wonderland] (WEi) 2020.10.05. 1st MINI ALBUM ‘IDENTITY : First Sight’ (WEi)</body></html>"

rows = module.parse_live_pages(roster, schedule, notice, profile)
assert [row["displayArtist"] for row in rows] == ["WEi"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["currentAgencySingerDirectoryRequired"] is True
assert snapshot["contract"]["currentGroupSurfaceRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["explicitTerminalDepartureEvidenceRequiredForMemberRemoval"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["agency"] == "OUI Entertainment"
assert snapshot["currentRoster"]["agencyStatus"] == "verified"
assert snapshot["currentRoster"]["currentMemberCount"] == 6
assert snapshot["currentRoster"]["lifecycleStatus"] == "active"
assert snapshot["currentRoster"]["debutDate"] == "2020-10-05"
assert snapshot["currentRoster"]["members"] == ["JANG DAE HYEON", "KIM DONG HAN", "YOO YONG HA", "KIM YO HAN", "KANG SEOK HWA", "KIM JUN SEO"]
assert module.parse_live_pages(roster.replace("김준서 KIM JUN SEO", ""), schedule, notice, profile) == []
assert module.parse_live_pages(roster, schedule.replace("매주 월요일", "비정기"), notice, profile) == []
assert module.parse_live_pages(roster, schedule, notice.replace("WEi 멤버 강석화", "강석화"), profile) == []
assert module.parse_live_pages(roster, schedule, notice, profile.replace("2020.10.05", "2020.10.04")) == []
assert module.parse_live_pages(roster, schedule, notice, profile.replace("Wonderland", "OTHER")) == []
print("WEi OUI current provider catalog adapter regression: PASS")
