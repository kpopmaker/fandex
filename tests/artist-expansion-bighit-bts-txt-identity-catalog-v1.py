from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_bighit_bts_txt_identity_catalog_v1.py"

spec = importlib.util.spec_from_file_location("bighit_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

bts_notice = "<html><body>BIGHIT MUSIC BTS The 5th Album World Tour</body></html>"
txt_notice = "<html><body>BIGHIT MUSIC TOMORROW X TOGETHER re-signed " + " ".join(module.TXT_MEMBERS) + "</body></html>"
bts_group = "<html><body>BTS " + " ".join(module.BTS_MEMBERS) + "</body></html>"
rm = "<html><head><title>Right Place, Wrong Person | RM | BIGHIT MUSIC</title></head><body>RM</body></html>"
jin = "<html><head><title>Echo | Jin | BIGHIT MUSIC</title></head><body>Jin Echo</body></html>"
suga = "<html><head><title>D-DAY | SUGA | BIGHIT MUSIC</title></head><body>SUGA Agust D D-DAY</body></html>"
jhope = "<html><head><title>DISCOGRAPHY | j-hope | BIGHIT MUSIC</title></head><body>j-hope HOPE ON THE STREET</body></html>"
jimin = "<html><head><title>MUSE | Jimin | BIGHIT MUSIC</title></head><body>Jimin MUSE</body></html>"
v = "<html><head><title>Winter Ahead | V | BIGHIT MUSIC</title></head><body>V Winter Ahead</body></html>"
jungkook = "<html><head><title>GOLDEN | Jung Kook | BIGHIT MUSIC</title></head><body>Jung Kook GOLDEN</body></html>"

rows = module.parse_live_pages(
    bts_notice,
    txt_notice,
    bts_group,
    rm,
    jin,
    suga,
    jhope,
    jimin,
    v,
    jungkook,
)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 9
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["currentRoster"]["BTS"]["members"] == module.BTS_MEMBERS
assert snapshot["currentRoster"]["BTS"]["memberCount"] == 7
assert snapshot["currentRoster"]["TOMORROW X TOGETHER"]["members"] == module.TXT_MEMBERS
assert snapshot["currentRoster"]["TOMORROW X TOGETHER"]["memberCount"] == 5
assert snapshot["contract"]["groupMembershipAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["soloCatalogEvidenceRequired"] is True
assert snapshot["contract"]["agustDAliasMustResolveToSugaCanonical"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(
    bts_notice.replace("BIGHIT MUSIC", "OTHER"),
    txt_notice,
    bts_group,
    rm,
    jin,
    suga,
    jhope,
    jimin,
    v,
    jungkook,
) == []

assert module.parse_live_pages(
    bts_notice,
    txt_notice.replace("HUENINGKAI", ""),
    bts_group,
    rm,
    jin,
    suga,
    jhope,
    jimin,
    v,
    jungkook,
) == []

assert module.parse_live_pages(
    bts_notice,
    txt_notice,
    bts_group.replace("Jung Kook", ""),
    rm,
    jin,
    suga,
    jhope,
    jimin,
    v,
    jungkook,
) == []

assert module.parse_live_pages(
    bts_notice,
    txt_notice,
    bts_group,
    rm,
    jin,
    suga.replace("Agust D", ""),
    jhope,
    jimin,
    v,
    jungkook,
) == []

assert module.parse_live_pages(
    bts_notice,
    txt_notice,
    bts_group,
    rm,
    jin,
    suga,
    jhope,
    jimin,
    v,
    jungkook.replace("BIGHIT MUSIC", "OTHER"),
) == []

print("BIGHIT BTS/TXT official music identity catalog adapter regression: PASS")
