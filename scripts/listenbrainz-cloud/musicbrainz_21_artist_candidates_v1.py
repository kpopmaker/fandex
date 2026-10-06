from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUTPUT = Path("musicbrainz_21_artist_candidates_v1.json")
API = "https://musicbrainz.org/ws/2/artist/"

TARGETS = [
    ("iu", "아이유", "IU"),
    ("aespa", "에스파", "aespa"),
    ("ateez", "에이티즈", "ATEEZ"),
    ("boynextdoor", "보이넥스트도어", "BOYNEXTDOOR"),
    ("ive", "아이브", "IVE"),
    ("lesserafim", "르세라핌", "LE SSERAFIM"),
    ("newjeans", "뉴진스", "NewJeans"),
    ("seventeen", "세븐틴", "SEVENTEEN"),
    ("straykids", "스트레이키즈", "Stray Kids"),
    ("txt", "투모로우바이투게더", "TOMORROW X TOGETHER"),
    ("bts", "방탄소년단", "BTS"),
    ("blackpink", "BLACKPINK", "BLACKPINK"),
    ("twice", "트와이스", "TWICE"),
    ("enhypen", "엔하이픈", "ENHYPEN"),
    ("jungkook", "정국", "Jung Kook"),
    ("jimin", "지민", "Jimin"),
    ("v", "V", "V"),
    ("jennie", "제니 (JENNIE)", "JENNIE"),
    ("lisa", "리사(LISA)", "LISA"),
    ("rose", "로제(ROSÉ)", "ROSÉ"),
    ("riize", "RIIZE", "RIIZE"),
]

KNOWN_REVIEWED = {
    "v": "83096042-3785-481e-8843-dee69f1aad12",
    "lisa": "30aeb57f-bb16-47fa-86ca-79fc57b4d12c",
}


def norm(v):
    return "" if v is None else str(v).strip()


def search(query: str):
    params = urllib.parse.urlencode({
        "query": f'artist:"{query}"',
        "fmt": "json",
        "limit": "10",
    })
    req = urllib.request.Request(
        API + "?" + params,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-ArtistExpansion/1.0 (https://github.com/kpopmaker/fandex)",
        },
    )
    last_error = None
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_error = f"HTTP {exc.code}: {exc.reason}"
            if exc.code not in {429, 500, 502, 503, 504}:
                raise
        except Exception as exc:
            last_error = str(exc)
        time.sleep(2.0 * attempt)
    raise RuntimeError(f"MusicBrainz search failed after retries: {query}: {last_error}")


def write_output(results, complete: bool):
    output = {
        "version": "musicbrainz_21_artist_candidates_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "targetCount": len(TARGETS),
        "completedTargetCount": len(results),
        "complete": complete,
        "autoSelectionPerformed": False,
        "fuzzyAutoBindingAllowed": False,
        "targets": results,
    }
    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def slim(row):
    aliases = []
    for a in row.get("aliases") or []:
        aliases.append({
            "name": norm(a.get("name")),
            "sortName": norm(a.get("sort-name")),
            "locale": norm(a.get("locale")),
            "primary": bool(a.get("primary")),
            "type": norm(a.get("type")),
        })
    tags = [
        {"name": norm(t.get("name")), "count": t.get("count")}
        for t in (row.get("tags") or [])[:20]
    ]
    area = row.get("area") or {}
    begin_area = row.get("begin-area") or {}
    return {
        "score": row.get("score"),
        "mbid": norm(row.get("id")),
        "name": norm(row.get("name")),
        "sortName": norm(row.get("sort-name")),
        "type": norm(row.get("type")),
        "typeId": norm(row.get("type-id")),
        "gender": norm(row.get("gender")),
        "country": norm(row.get("country")),
        "disambiguation": norm(row.get("disambiguation")),
        "area": norm(area.get("name")),
        "beginArea": norm(begin_area.get("name")),
        "lifeSpan": row.get("life-span") or {},
        "aliases": aliases[:20],
        "tags": tags,
    }


def main():
    results = []
    for index, (canonical_id, artist, query) in enumerate(TARGETS):
        if index:
            time.sleep(1.1)
        payload = search(query)
        candidates = [slim(row) for row in payload.get("artists", [])]
        known = KNOWN_REVIEWED.get(canonical_id)
        results.append({
            "canonicalArtistId": canonical_id,
            "artist": artist,
            "query": query,
            "knownReviewedMbid": known,
            "knownReviewedPresentInTop10": (
                None if known is None
                else any(c["mbid"] == known for c in candidates)
            ),
            "candidates": candidates,
        })
        write_output(results, complete=False)
        print("\nTARGET", canonical_id, "|", query)
        for i, c in enumerate(candidates[:5], 1):
            print(
                i,
                c["score"],
                c["mbid"],
                repr(c["name"]),
                "type=" + c["type"],
                "country=" + c["country"],
                "disambig=" + repr(c["disambiguation"]),
                "area=" + repr(c["area"]),
            )

    write_output(results, complete=True)
    print("\nautoSelectionPerformed=FALSE")
    print("next=review-candidates")


if __name__ == "__main__":
    main()
