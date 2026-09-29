from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_modhaus_current_artist_roster_v1.py"

spec = importlib.util.spec_from_file_location("modhaus_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

company = "<html><body>Modhaus is an unprecedented open architecture K-Pop agency.</body></html>"
shop = "<html><body><div>ARTMS</div><div>tripleS</div></body></html>"
triples_profile = "<html><body>" + " ".join(module.TRIPLES_MEMBERS) + "</body></html>"
triples_debut = "<html><body>ASSEMBLE tripleS February 13, 2023 ℗ 2023 MODHAUS</body></html>"
artms_member = "<html><body>" + " ".join(module.ARTMS_MEMBERS) + "</body></html>"
artms_debut = "<html><body>&lt;Dall&gt; ARTMS May 31, 2024 ℗ 2024 MODHAUS</body></html>"

rows = module.parse_live_pages(
    company,
    shop,
    triples_profile,
    triples_debut,
    artms_member,
    artms_debut,
)
assert [row["displayArtist"] for row in rows] == ["ARTMS", "tripleS"]

snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 2
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["currentAgencyRosterRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["ARTMS"]["members"] == module.ARTMS_MEMBERS
assert snapshot["currentRoster"]["ARTMS"]["memberCount"] == 5
assert snapshot["currentRoster"]["ARTMS"]["debutDate"] == "2024-05-31"
assert snapshot["currentRoster"]["tripleS"]["members"] == module.TRIPLES_MEMBERS
assert snapshot["currentRoster"]["tripleS"]["memberCount"] == 24
assert snapshot["currentRoster"]["tripleS"]["debutDate"] == "2023-02-13"

assert module.parse_live_pages(
    company.replace("K-Pop agency", "technology company"),
    shop,
    triples_profile,
    triples_debut,
    artms_member,
    artms_debut,
) == []
assert module.parse_live_pages(
    company,
    shop.replace("ARTMS", "OTHER"),
    triples_profile,
    triples_debut,
    artms_member,
    artms_debut,
) == []
assert module.parse_live_pages(
    company,
    shop,
    triples_profile.replace("JiYeon", ""),
    triples_debut,
    artms_member,
    artms_debut,
) == []
assert module.parse_live_pages(
    company,
    shop,
    triples_profile,
    triples_debut,
    artms_member.replace("Choerry", ""),
    artms_debut,
) == []
assert module.parse_live_pages(
    company,
    shop,
    triples_profile,
    triples_debut.replace("February 13, 2023", "February 14, 2023"),
    artms_member,
    artms_debut,
) == []
assert module.parse_live_pages(
    company,
    shop,
    triples_profile,
    triples_debut,
    artms_member,
    artms_debut.replace("May 31, 2024", "June 1, 2024"),
) == []

print("MODHAUS current artist roster adapter regression: PASS")
