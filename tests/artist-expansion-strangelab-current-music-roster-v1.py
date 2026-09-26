from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_strangelab_current_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("strangelab_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

home = "<html><body><a>XLOV</a><a>LU</a><a>OH MY GIRL</a></body></html>"
lu = "<html><body><h1>LU</h1><div>UNFOLD</div><div>2026.03.28</div></body></html>"
notice = "<html><body><div>StrangeLab</div><div>XLOV</div><div>LU</div></body></html>"

rows = module.parse_live_pages(home, lu, notice)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[1]["aliases"] == ["강하윤"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 2
assert snapshot["contract"]["homepageDirectoryAloneIsNotLifecycleTruth"] is True
assert snapshot["contract"]["transferredArtistExcluded"] == ["OH MY GIRL"]
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(home.replace("<a>LU</a>", ""), lu, notice) == []
assert module.parse_live_pages(home, lu.replace("UNFOLD", ""), notice) == []
assert module.parse_live_pages(home, lu, notice.replace("LU", "")) == []

print("StrangeLab current verified music roster adapter regression: PASS")
