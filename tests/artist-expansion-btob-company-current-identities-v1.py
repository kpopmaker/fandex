from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_btob_company_current_managed_music_identities_v1.py"
spec = importlib.util.spec_from_file_location("btob_company_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

company = "<html><body>BTOB COMPANY 현재 서은광, 이민혁, 임현식, 프니엘이 소속되어 있으며, 개인 활동 및 음반 제작, 아티스트 매니지먼트와 BTOB group activities를 합니다.</body></html>"
discography = "<html><body>BTOB 우리 다시 2026. 03. 21 OUR YOUTH TEMPERATURE IDKI</body></html>"
notice = "<html><body>서은광 (SEO EUNKWANG) SINGLE ALBUM [OUR YOUTH] 2026 SEO EUNKWANG REC : Feel Alive 이민혁 (HUTA) SINGLE ALBUM [TEMPERATURE]</body></html>"
behind = "<html><body>[임현식] 2026 FIRST MUSIC STATION 현장 비하인드</body></html>"
peniel = "<html><body>프니엘 (PENIEL) 'IDKI' Lyric Video</body></html>"

rows = module.parse_live_pages(company, discography, notice, behind, peniel)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
snapshot = module.build_snapshot(rows, "2026-09-29T21:47:00+09:00")
assert snapshot["candidateCount"] == 5
assert snapshot["managedSoloSet"] == ["SEO EUNKWANG","LEE MINHYUK (HUTA)","IM HYUNSIK","PENIEL"]
assert snapshot["currentManagedIdentities"]["BTOB"]["entityType"] == "group"
assert snapshot["currentManagedIdentities"]["SEO EUNKWANG"]["entityType"] == "solo"
assert snapshot["contract"]["managedSoloSetDoesNotDefineFullBtobGroupRoster"] is True
assert snapshot["contract"]["externalMemberAgencyDoesNotEndBtobMembership"] is True
assert snapshot["contract"]["noBtobMemberRosterMutationFromCompanyManagedSet"] is True
assert snapshot["contract"]["groupMembershipAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(company.replace("프니엘", ""), discography, notice, behind, peniel) == []
assert module.parse_live_pages(company, discography.replace("2026. 03. 21", ""), notice, behind, peniel) == []
assert module.parse_live_pages(company, discography, notice.replace("TEMPERATURE", ""), behind, peniel) == []
assert module.parse_live_pages(company, discography, notice, behind.replace("2026 FIRST MUSIC STATION", ""), peniel) == []
assert module.parse_live_pages(company, discography, notice, behind, peniel.replace("IDKI", "")) == []
print("BTOB Company current managed music identities regression: PASS")
