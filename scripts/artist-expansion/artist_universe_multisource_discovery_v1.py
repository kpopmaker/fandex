from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


VERSION = "artist_universe_multisource_discovery_v1"
ALLOWED_SOURCE_TYPES = {
    "music_chart",
    "agency_roster",
    "provider_catalog",
    "festival_or_event_roster",
    "broadcast_or_award_roster",
}


def compact_identity(value: Any) -> str:
    text = str(value or "").strip().casefold()
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def identity_components(value: Any) -> list[str]:
    text = str(value or "").strip()
    parts = [text]
    parts.extend(re.findall(r"\(([^()]+)\)", text))
    outside = re.sub(r"\([^()]+\)", " ", text)
    parts.extend(re.split(r"\s*[&＋+,]\s*|\s+[xX×]\s+", outside))

    result: list[str] = []
    seen = set()
    for part in parts:
        cleaned = re.sub(r"\s+", " ", str(part or "")).strip()
        key = compact_identity(cleaned)
        if cleaned and key and key not in seen:
            seen.add(key)
            result.append(cleaned)
    return result


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"JSON object required: {path}")
    return payload


def build_known_index(identity_payload: dict[str, Any]) -> dict[str, set[str]]:
    rows = identity_payload.get("artists")
    if not isinstance(rows, list):
        raise RuntimeError("identity index artists must be a list")

    index: dict[str, set[str]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        artist_id = str(row.get("id") or "").strip()
        if not artist_id:
            continue
        for alias in row.get("aliases") or []:
            key = compact_identity(alias)
            if key:
                index.setdefault(key, set()).add(artist_id)
    return index


def build_decision_index(decision_payload: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    if not decision_payload:
        return result
    rows = decision_payload.get("decisions")
    if not isinstance(rows, list):
        raise RuntimeError("decision registry decisions must be a list")
    for row in rows:
        if not isinstance(row, dict):
            continue
        key = compact_identity(row.get("displayArtist"))
        if key:
            result[key] = row
    return result


def validate_snapshot(payload: dict[str, Any], source_path: Path) -> tuple[dict[str, str], list[dict[str, Any]]]:
    source = payload.get("source")
    candidates = payload.get("candidates")
    if not isinstance(source, dict):
        raise RuntimeError(f"source object required: {source_path}")
    if not isinstance(candidates, list):
        raise RuntimeError(f"candidates list required: {source_path}")

    source_id = str(source.get("id") or "").strip()
    source_type = str(source.get("type") or "").strip()
    source_name = str(source.get("name") or "").strip()
    observed_at = str(source.get("observedAt") or "").strip()

    if not source_id or not source_name or not observed_at:
        raise RuntimeError(f"source id/name/observedAt required: {source_path}")
    if source_type not in ALLOWED_SOURCE_TYPES:
        raise RuntimeError(f"unsupported source type: {source_type}")

    normalized_source = {
        "id": source_id,
        "type": source_type,
        "name": source_name,
        "observedAt": observed_at,
    }
    return normalized_source, [row for row in candidates if isinstance(row, dict)]


def candidate_names(row: dict[str, Any]) -> list[str]:
    values = [row.get("displayArtist")]
    values.extend(row.get("aliases") or [])
    result: list[str] = []
    seen = set()

    def add(value: Any) -> None:
        name = str(value or "").strip()
        key = compact_identity(name)
        if name and key and key not in seen:
            seen.add(key)
            result.append(name)

    for value in values:
        name = str(value or "").strip()
        add(name)

        # Providers commonly emit bilingual forms such as
        # "BIGBANG (빅뱅)" or "TREASURE(트레저)". These must match the
        # canonical aliases independently instead of becoming false unknowns.
        for inner in re.findall(r"\(([^()]+)\)", name):
            add(inner)

        outside = re.sub(r"\([^()]+\)", " ", name)
        add(outside)

    return result


def find_known_matches(row: dict[str, Any], known_index: dict[str, set[str]]) -> set[str]:
    result: set[str] = set()
    for name in candidate_names(row):
        for component in identity_components(name):
            result.update(known_index.get(compact_identity(component), set()))
    return result


def build_discovery(
    identity_payload: dict[str, Any],
    snapshot_payloads: list[tuple[Path, dict[str, Any]]],
    decision_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    known_index = build_known_index(identity_payload)
    decision_index = build_decision_index(decision_payload)
    grouped: dict[str, dict[str, Any]] = {}
    suppressed_known: list[dict[str, Any]] = []
    known_coverage: dict[str, dict[str, Any]] = {}
    sources = []

    for source_path, payload in snapshot_payloads:
        source, rows = validate_snapshot(payload, source_path)
        sources.append(source)

        for row in rows:
            display_artist = str(row.get("displayArtist") or "").strip()
            key = compact_identity(display_artist)
            if not key:
                continue

            known_matches = find_known_matches(row, known_index)
            if known_matches:
                suppressed_known.append({
                    "displayArtist": display_artist,
                    "canonicalArtistIds": sorted(known_matches),
                    "sourceId": source["id"],
                    "sourceType": source["type"],
                })
                for canonical_id in known_matches:
                    coverage = known_coverage.setdefault(
                        canonical_id,
                        {
                            "canonicalArtistId": canonical_id,
                            "sources": [],
                            "observedDisplayArtists": [],
                        },
                    )
                    source_row = {
                        "sourceId": source["id"],
                        "sourceType": source["type"],
                        "sourceName": source["name"],
                        "observedAt": source["observedAt"],
                    }
                    if source_row not in coverage["sources"]:
                        coverage["sources"].append(source_row)
                    if display_artist not in coverage["observedDisplayArtists"]:
                        coverage["observedDisplayArtists"].append(display_artist)
                continue

            item = grouped.setdefault(key, {
                "displayArtist": display_artist,
                "normalizedArtist": key,
                "aliases": [],
                "status": "identity_review_required",
                "scopeStatus": "unverified",
                "autoPromote": False,
                "sources": [],
                "evidence": [],
            })

            alias_seen = {compact_identity(x) for x in item["aliases"]}
            for alias in row.get("aliases") or []:
                alias_text = str(alias or "").strip()
                alias_key = compact_identity(alias_text)
                if alias_text and alias_key and alias_key != key and alias_key not in alias_seen:
                    item["aliases"].append(alias_text)
                    alias_seen.add(alias_key)

            source_evidence = {
                "sourceId": source["id"],
                "sourceType": source["type"],
                "sourceName": source["name"],
                "observedAt": source["observedAt"],
            }
            if source_evidence not in item["sources"]:
                item["sources"].append(source_evidence)

            evidence = row.get("evidence")
            if isinstance(evidence, dict):
                evidence = [evidence]
            if isinstance(evidence, list):
                for evidence_row in evidence:
                    if isinstance(evidence_row, dict):
                        normalized = {
                            "sourceId": source["id"],
                            "label": str(evidence_row.get("label") or "").strip(),
                            "url": str(evidence_row.get("url") or "").strip(),
                        }
                        if normalized not in item["evidence"]:
                            item["evidence"].append(normalized)

    candidates = []
    resolved_count = 0
    unresolved_count = 0
    for item in sorted(grouped.values(), key=lambda row: row["normalizedArtist"]):
        decision = None
        for name in candidate_names(item):
            decision = decision_index.get(compact_identity(name))
            if decision is not None:
                break

        if decision is None:
            item["reviewStatus"] = "unresolved"
            item["reviewDecision"] = None
            item["relationResolution"] = None
            item["decisionEvidence"] = []
            unresolved_count += 1
        else:
            item["reviewStatus"] = "resolved"
            item["reviewDecision"] = decision.get("decision")
            item["relationResolution"] = decision.get("relationResolution")
            item["relatedCanonicalArtistIds"] = list(
                decision.get("relatedCanonicalArtistIds") or []
            )
            item["rejectedRelationCanonicalArtistIds"] = list(
                decision.get("rejectedRelationCanonicalArtistIds") or []
            )
            item["decisionEvidence"] = list(decision.get("evidence") or [])
            item["decisionDisplayArtist"] = decision.get("displayArtist")
            resolved_count += 1

        candidates.append(item)

    known_canonical_coverage = []
    for canonical_id in sorted(known_coverage):
        row = known_coverage[canonical_id]
        known_canonical_coverage.append(
            {
                **row,
                "sourceCount": len(row["sources"]),
            }
        )

    return {
        "version": VERSION,
        "sourceCount": len(sources),
        "sources": sources,
        "candidateCount": len(candidates),
        "candidateResolvedCount": resolved_count,
        "candidateUnresolvedCount": unresolved_count,
        "candidates": candidates,
        "knownSuppressionCount": len(suppressed_known),
        "knownSuppressions": suppressed_known,
        "knownCanonicalCount": len(known_canonical_coverage),
        "knownCanonicalCoverage": known_canonical_coverage,
        "contract": {
            "autoPromote": False,
            "identityResolutionRequired": True,
            "scopeVerificationRequired": True,
            "evidenceCountIsNotThreshold": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--identity-index", required=True)
    parser.add_argument("--snapshot", action="append", required=True)
    parser.add_argument("--decisions")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    identity_payload = load_json(Path(args.identity_index))
    snapshots = [(Path(path), load_json(Path(path))) for path in args.snapshot]
    decision_payload = load_json(Path(args.decisions)) if args.decisions else None
    output = build_discovery(identity_payload, snapshots, decision_payload)
    Path(args.output).write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
