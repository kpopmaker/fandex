from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_sm_identity_directory_gap_catalog_v1.py"

spec = importlib.util.spec_from_file_location("sm_gap_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

html = "<html><body>" + "".join(
    f"<div>{value}</div>"
    for value in ["KANGTA", "TVXQ!", "2Spade", "A-NA", "KAI", "NCT U", "TAEYEON", "YUTA"]
) + "</body></html>"
rows = module.parse_directory(html)
assert [row["displayArtist"] for row in rows] == ["TAEYEON", "KAI", "NCT U"]

snapshot = module.build_snapshot(rows, "2026-09-29T17:37:00+09:00")
assert snapshot["candidateCount"] == 3
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["existingCanonicalCoverageGapOnly"] is True
assert snapshot["contract"]["directoryPresenceDoesNotInferExclusiveManagementContract"] is True
assert snapshot["contract"]["directoryPresenceDoesNotInferCurrentReleaseActivity"] is True
assert snapshot["contract"]["rotationalUnitMembershipNotMaterialized"] is True
assert snapshot["contract"]["noNewCanonicalFromDirectoryOnly"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_directory(html.replace("TAEYEON", "")) == []
assert module.parse_directory(html.replace("KAI", "")) == []
assert module.parse_directory(html.replace("NCT U", "")) == []
assert module.parse_directory(html.replace("2Spade", "OTHER")) == []

print("SM official identity directory gap catalog regression: PASS")
