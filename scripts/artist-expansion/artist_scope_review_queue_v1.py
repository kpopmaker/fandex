from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


VERSION = "artist_scope_review_queue_v1"


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"JSON object required: {path}")
    return payload


def build_scope_review_queue(discovery_payload: dict[str, Any]) -> dict[str, Any]:
    candidates = discovery_payload.get("candidates")
    if not isinstance(candidates, list):
        raise RuntimeError("multisource discovery candidates must be a list")

    items: list[dict[str, Any]] = []
    for row in candidates:
        if not isinstance(row, dict):
            continue
        if row.get("scopeStatus") != "review_required":
            continue

        items.append(
            {
                "displayArtist": row.get("displayArtist"),
                "normalizedArtist": row.get("normalizedArtist"),
                "identityStatus": "verified",
                "scopeStatus": "review_required",
                "reviewDecision": row.get("reviewDecision"),
                "relationResolution": row.get("relationResolution"),
                "relatedCanonicalArtistIds": list(
                    row.get("relatedCanonicalArtistIds") or []
                ),
                "sources": list(row.get("sources") or []),
                "discoveryEvidence": list(row.get("evidence") or []),
                "decisionEvidence": list(row.get("decisionEvidence") or []),
                "autoPromote": False,
            }
        )

    items.sort(key=lambda row: str(row.get("normalizedArtist") or ""))

    return {
        "version": VERSION,
        "sourceDiscoveryVersion": discovery_payload.get("version"),
        "scopeReviewCount": len(items),
        "items": items,
        "contract": {
            "identityVerificationDoesNotImplyScopeEligibility": True,
            "scopeDecisionMustBeExplicit": True,
            "autoPromote": False,
            "noPopularityThreshold": True,
            "noImplicitGenreBoundary": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("discovery")
    parser.add_argument("output")
    args = parser.parse_args()

    payload = load_json(Path(args.discovery))
    output = build_scope_review_queue(payload)
    Path(args.output).write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
