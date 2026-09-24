from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_bugs_yg_provider_catalog_v1.py"

spec = importlib.util.spec_from_file_location("bugs_yg_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div class="album-list">
    <a href="https://music.bugs.co.kr/artist/20022492">BIGBANG (빅뱅)</a>
    <a href="/artist/80395276">BABYMONSTER</a>
    <a href="/artist/80221612">TREASURE(트레저)</a>
    <a href="/artist/80077695">BLACKPINK</a>
    <a href="/artist/80120239">강승윤</a>
    <a href="/artist/80262511">이찬혁</a>
  </div>
  <a href="/album/4123456">album</a>
  <a href="/label/3897">YG 엔터테인먼트</a>
</body></html>
"""

rows = module.parse_catalog(html)
assert [row["displayArtist"] for row in rows] == [
    "BIGBANG (빅뱅)",
    "BABYMONSTER",
    "TREASURE(트레저)",
    "BLACKPINK",
    "강승윤",
    "이찬혁",
]
assert rows[-1]["evidence"][0]["url"] == "https://music.bugs.co.kr/artist/80262511"

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-24T00:00:00+00:00",
)
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["candidateCount"] == 6
assert snapshot["contract"]["providerCatalogIsNotAgencyRoster"] is True
assert snapshot["contract"]["autoPromote"] is False

print("Bugs YG provider catalog adapter regression: PASS")
