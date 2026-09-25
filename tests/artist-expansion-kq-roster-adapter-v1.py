from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_kq_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("kq_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


ent_html = """
<html><body>
  <a href="https://ateez.kqent.com/">ATEEZ</a>
  <a href="/artist/1551">xikers</a>
  <a href="/about">ABOUT</a>
</body></html>
"""

pd_html = """
<html><body>
  <a href="/producer/520">BABYLON 한국 힙합 신의 R&amp;B 아티스트 VIEW DETAIL</a>
  <a href="/producer/519">EDEN 송라이팅 능력과 매력적인 보컬 VIEW DETAIL</a>
  <a href="/producer/1660">MADDOX 독보적인 가성과 탄탄한 가창력 VIEW DETAIL</a>
  <a href="/kq-artist">KQ Ent.</a>
</body></html>
"""

rows = module.merge_rows(
    module.parse_kq_ent(ent_html),
    module.parse_kq_pd(pd_html),
)
assert [row["displayArtist"] for row in rows] == [
    "ATEEZ",
    "xikers",
    "BABYLON",
    "EDEN",
    "MADDOX",
]
assert rows[2]["evidence"][0]["url"] == "https://kqent.com/producer/520"
assert rows[4]["evidence"][0]["url"] == "https://kqent.com/producer/1660"

snapshot = module.build_snapshot(rows, "2026-09-25T00:00:00+00:00")
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["candidateCount"] == 5
assert snapshot["contract"]["kqEntAndKqPdSectionsCombined"] is True
assert snapshot["contract"]["autoPromote"] is False

print("KQ agency roster adapter regression: PASS")
