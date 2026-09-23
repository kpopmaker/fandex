from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


VERSION = "artist_catalog_review_queue_v1"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact_identity(value: str) -> str:
    text = normalize_spaces(value).casefold()
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def identity_components(display_artist: str) -> list[str]:
    value = normalize_spaces(display_artist)
    parts = [value]
    parts.extend(re.findall(r"\(([^()]+)\)", value))
    outside = re.sub(r"\([^()]+\)", " ", value)
    parts.extend(re.split(r"\s*[\/&＋+,]\s*|\s+[xX×]\s+", outside))
    result = []
    seen = set()
    for part in parts:
        cleaned = normalize_spaces(part)
        key = compact_identity(cleaned)
        if cleaned and key and key not in seen:
            seen.add(key)
            result.append(cleaned)
    return result


def build_relation_index(identity_payload: dict[str, Any] | None):
    alias_index: dict[str, set[str]] = {}
    keyword_index: dict[str, set[str]] = {}
    if not identity_payload:
        return alias_index, keyword_index

    rows = identity_payload.get("artists")
    if not isinstance(rows, list):
        return alias_index, keyword_index

    for row in rows:
        if not isinstance(row, dict):
            continue
        artist_id = str(row.get("id") or "").strip()
        if not artist_id:
            continue
        for alias in row.get("aliases") or []:
            key = compact_identity(alias)
            if key:
                alias_index.setdefault(key, set()).add(artist_id)
        for keyword in row.get("keywords") or []:
            key = compact_identity(keyword)
            if key:
                keyword_index.setdefault(key, set()).add(artist_id)

    return alias_index, keyword_index


def relation_hints(
    display_artist: str,
    identity_payload: dict[str, Any] | None,
) -> dict[str, Any]:
    alias_index, keyword_index = build_relation_index(identity_payload)
    alias_matches = set()
    keyword_matches = set()

    for component in identity_components(display_artist):
        key = compact_identity(component)
        alias_matches.update(alias_index.get(key, set()))
        keyword_matches.update(keyword_index.get(key, set()))

    keyword_matches.difference_update(alias_matches)

    if alias_matches:
        status = "existing_canonical_alias_match"
    elif keyword_matches:
        status = "existing_artist_keyword_relation"
    else:
        status = "unresolved"

    return {
        "relationStatus": status,
        "canonicalAliasMatches": sorted(alias_matches),
        "keywordRelationMatches": sorted(keyword_matches),
    }


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


def build_review_queue(
    payload: dict[str, Any],
    identity_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
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

        relation = relation_hints(display_artist, identity_payload)

        queue.append(
            {
                "displayArtist": display_artist,
                "normalizedArtist": row.get("normalizedArtist", ""),
                "reviewCategory": category,
                "reviewReasons": reasons,
                "identityStatus": "unverified",
                "scopeStatus": "unverified",
                "autoPromote": False,
                **relation,
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
    parser.add_argument("--identity-index", type=Path)
    args = parser.parse_args()

    payload = json.loads(args.input_json.read_text(encoding="utf-8"))
    identity_payload = None
    if args.identity_index is not None:
        identity_payload = json.loads(
            args.identity_index.read_text(encoding="utf-8")
        )
    output = build_review_queue(payload, identity_payload)
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
