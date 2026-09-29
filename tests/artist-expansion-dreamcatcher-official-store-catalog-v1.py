from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_dreamcatcher_official_store_catalog_v1.py"
spec = importlib.util.spec_from_file_location("dreamcatcher_store_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

member = "<html><body>MEMBER JIU SUA SIYEON HANDONG YOOHYEON DAMI GAHYEON</body></html>"
uau_debut = "<html><body>UAU Playlist #You Are You DREAMCATCHER COMPANY 2025.05.28</body></html>"
uau_2026_merch = "<html><body>UAU 2026 THE NIGHT BLOOM DREAMCATCHER COMPANY</body></html>"
uau_2026_album = "<html><body>UAU 2nd Mini Album Playlist #Your Youth</body></html>"
chrocktikal = "<html><body>ChRocktikal 크록티칼 Manufacturer LEEGEUM ENT</body></html>"

rows = module.parse_live_pages(member, uau_debut, uau_2026_merch, uau_2026_album, chrocktikal)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T00:24:00+09:00")
assert snapshot["candidateCount"] == 2
assert snapshot["currentIdentityState"]["Dreamcatcher"]["members"] == module.DREAMCATCHER_MEMBERS
assert snapshot["currentIdentityState"]["Dreamcatcher"]["memberCount"] == 7
assert snapshot["currentIdentityState"]["UAU"]["agency"] == "Dreamcatcher Company"
assert snapshot["currentIdentityState"]["UAU"]["entityType"] == "unit"
assert snapshot["currentIdentityState"]["UAU"]["debutDate"] == "2025-05-28"
assert [row["displayArtist"] for row in snapshot["excludedExternalProviderIdentities"]] == ["ChRocktikal"]
assert snapshot["contract"]["externalProviderProductMustNotBeAutoPromotedAsDreamcatcherCompanyIdentity"] is True
assert snapshot["contract"]["secondaryClassificationMustRemainDistinctFromFirstPartyIdentityEvidence"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(
    member.replace("GAHYEON", ""),
    uau_debut,
    uau_2026_merch,
    uau_2026_album,
    chrocktikal,
) == []
assert module.parse_live_pages(
    member,
    uau_debut.replace("DREAMCATCHER COMPANY", ""),
    uau_2026_merch,
    uau_2026_album,
    chrocktikal,
) == []
assert module.parse_live_pages(
    member,
    uau_debut,
    uau_2026_merch.replace("2026", "2025"),
    uau_2026_album,
    chrocktikal,
) == []
assert module.parse_live_pages(
    member,
    uau_debut,
    uau_2026_merch,
    uau_2026_album.replace("Playlist #Your Youth", "OTHER"),
    chrocktikal,
) == []
assert module.parse_live_pages(
    member,
    uau_debut,
    uau_2026_merch,
    uau_2026_album,
    chrocktikal.replace("LEEGEUM ENT", "DREAMCATCHER COMPANY"),
) == []

print("Dreamcatcher official store music identity catalog regression: PASS")
