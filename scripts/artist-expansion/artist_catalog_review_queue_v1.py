from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


VERSION = "artist_catalog_review_queue_v1"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def classify_display_artist(display_artist: str) -> tuple[str, list[str]]:
    value = normalize_spaces(display_artist)
    reasons: list[str] = []

    if not value:
        return "invalid_identity", ["empty_display_artist"]

    composite_patterns = [
        r"\s[&＋+]\s",
        r"\s/[ ]*",
        r"\s[xX×]\s",
        r",",
        r"\s(?:and|with)\s",
    ]
    if any(re.search(pattern, value, flags=re.IGNORECASE) for pattern in composite_patterns):
        reasons.append("multi_credit_delimiter")
        return "composite_credit_review", reasons

    if "(" in value and ")" in value:
        reasons.append("parenthetical_identity_form")
        return "alternate_identity_review", reasons

    if re.search(r"[A-Za-z]", value) and re.search(r"[가-힣]", value):
        reasons.append("mixed_korean_latin_identity")
        return "alternate_identity_review", reasons

    reasons.append("single_display_identity")
    return "single_identity_review", reasons


def build_review_queue(payload: dict[str, Any]) -> dict[str, Any]:
    candidates = payload.get("catalogCandidates")
    if not isinstance(candidates, list):
        raise RuntimeError("catalogCandidates must be a list")

    queue = []
    counts: dict[str, int] = {}

    for row in candidates:
        if not isinstance(row, dict):
            continue

        display_artist = normalize_spaces(row.get("displayArtist", ""))
        category, reasons = classify_display_artist(display_artist)
        counts[category] = counts.get(category, 0) + 1

        queue.append(
            {
                "displayArtist": display_artist,
                "normalizedArtist": row.get("normalizedArtist", ""),
                "reviewCategory": category,
                "reviewReasons": reasons,
                "identityStatus": "unverified",
                "scopeStatus": "unverified",
                "autoPromote": False,
                "evidenceCount": int(row.get("evidenceCount") or 0),
                "platforms": list(row.get("platforms") or []),
                "sourceKeys": list(row.get("sourceKeys") or []),
                "sampleTracks": list(row.get("sampleTracks") or []),
            }
        )

    queue.sort(
        key=lambda row: (
            {
                "alternate_identity_review": 0,
                "single_identity_review": 1,
                "composite_credit_review": 2,
                "invalid_identity": 3,
            }.get(row["reviewCategory"], 9),
            -row["evidenceCount"],
            row["displayArtist"].casefold(),
        )
    )

    return {
        "version": VERSION,
        "sourceVersion": payload.get("version"),
        "sourceCreatedAt": payload.get("createdAt"),
        "candidateCount": len(queue),
        "categoryCounts": dict(sorted(counts.items())),
        "autoPromotionAllowed": False,
        "queue": queue,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_json", type=Path)
    parser.add_argument("output_json", type=Path)
    args = parser.parse_args()

    payload = json.loads(args.input_json.read_text(encoding="utf-8"))
    output = build_review_queue(payload)
    args.output_json.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "candidateCount": output["candidateCount"],
                "categoryCounts": output["categoryCounts"],
                "autoPromotionAllowed": output["autoPromotionAllowed"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
