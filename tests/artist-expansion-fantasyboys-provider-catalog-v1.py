from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_fantasyboys_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("fantasyboys_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>Kang Minseo Lee Hanbin Hikari Ling Qi Hikaru Kim Wooseok Hong Sungmin Oh Hyeontae Kim Gyurae Kaedan</body></html>"
fancon = "<html><body>2025 FANTASY BOYS FAN-CON organizer POCKETDOL STUDIO</body></html>"
discography = "<html><body>2023.09.21 NEW TOMORROW 2025.03.20 UNDENIABLE</body></html>"
columbia = "<html><body>FANTASY BOYS カン・ミンソ イ・ハンビン ヒカリ リンチ ヒカル キム・ウソク ホン・ソンミン オ・ヒョンテ キム・ギュレ ケイダン</body></html>"
news = "<html><body>2026. 08.27 [重要] system maintenance</body></html>"

rows = module.parse_live_pages(profile, fancon, discography, columbia, news)
assert [row["displayArtist"] for row in rows] == ["FANTASY BOYS"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["currentManagementEvidenceRequired"] is True
assert snapshot["contract"]["exactCurrentProfileRosterRequired"] is True
assert snapshot["contract"]["currentOfficialProfileControlsRoster"] is True
assert snapshot["contract"]["staleKoreanArtistPageDoesNotOverrideCurrentProfile"] is True
assert snapshot["contract"]["historicalHiatusNoticeDoesNotOverrideCurrentProfile"] is True
assert snapshot["contract"]["absenceOfScheduleDoesNotImplyInactiveLifecycle"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(profile + " K-SOUL", fancon, discography, columbia, news) == []
assert module.parse_live_pages(profile.replace("Kaedan", ""), fancon, discography, columbia, news) == []
assert module.parse_live_pages(profile, fancon.replace("POCKETDOL STUDIO", "Other"), discography, columbia, news) == []
assert module.parse_live_pages(profile, fancon, discography.replace("2023.09.21", ""), columbia, news) == []
assert module.parse_live_pages(profile, fancon, discography, columbia.replace("ケイダン", ""), news) == []
assert module.parse_live_pages(profile, fancon, discography, columbia, news.replace("2026. 08.27", "2025. 08.27")) == []
print("FANTASY BOYS official current provider catalog adapter regression: PASS")
