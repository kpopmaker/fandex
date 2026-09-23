import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module():
    path = ROOT / "scripts/artist-expansion/artist_catalog_review_queue_v1.py"
    spec = importlib.util.spec_from_file_location("catalog_review", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main():
    module = load_module()

    payload = {
        "version": "fixture",
        "createdAt": "2026-09-23T00:00:00Z",
        "catalogCandidates": [
            {
                "displayArtist": "도경수(D.O.)",
                "normalizedArtist": "도경수do",
                "evidenceCount": 4,
                "platforms": ["melon", "genie"],
                "sourceKeys": ["melon_top100"],
                "sampleTracks": ["A"],
            },
            {
                "displayArtist": "임영웅",
                "normalizedArtist": "임영웅",
                "evidenceCount": 16,
                "platforms": ["melon", "genie"],
                "sourceKeys": ["melon_top100"],
                "sampleTracks": ["B"],
            },
            {
                "displayArtist": "Artist A & Artist B",
                "normalizedArtist": "artistaartistb",
                "evidenceCount": 1,
                "platforms": ["genie"],
                "sourceKeys": ["genie_daily_page_1"],
                "sampleTracks": ["C"],
            },
        ],
    }

    identity_payload = {
        "artists": [
            {
                "id": "exo",
                "aliases": ["EXO", "엑소"],
                "keywords": ["D.O.", "Baekhyun"],
            },
            {
                "id": "existing-solo",
                "aliases": ["Known Alias"],
                "keywords": [],
            },
        ],
    }

    decision_payload = {
        "decisions": [
            {
                "displayArtist": "도경수(D.O.)",
                "decision": "new_canonical_solo_candidate",
                "relationResolution": "member_of_existing_artist_and_independent_solo",
                "relatedCanonicalArtistIds": ["exo"],
                "autoPromote": False,
                "evidence": [{"source": "fixture", "url": "https://example.com"}],
            }
        ]
    }

    output = module.build_review_queue(
        payload,
        identity_payload,
        decision_payload,
    )

    assert output["candidateCount"] == 3
    assert output["autoPromotionAllowed"] is False
    assert output["categoryCounts"] == {
        "alternate_identity_review": 1,
        "composite_credit_review": 1,
        "single_identity_review": 1,
    }

    by_name = {row["displayArtist"]: row for row in output["queue"]}
    assert by_name["도경수(D.O.)"]["reviewCategory"] == "alternate_identity_review"
    assert by_name["도경수(D.O.)"]["relationStatus"] == "existing_artist_keyword_relation"
    assert by_name["도경수(D.O.)"]["keywordRelationMatches"] == ["exo"]
    assert by_name["도경수(D.O.)"]["reviewDecision"] == "new_canonical_solo_candidate"
    assert by_name["도경수(D.O.)"]["relatedCanonicalArtistIds"] == ["exo"]
    assert by_name["임영웅"]["reviewCategory"] == "single_identity_review"
    assert by_name["임영웅"]["relationStatus"] == "unresolved"
    assert by_name["Artist A & Artist B"]["reviewCategory"] == "composite_credit_review"
    assert [x["displayArtist"] for x in by_name["Artist A & Artist B"]["components"]] == ["Artist A", "Artist B"]
    assert all(x["autoPromote"] is False for x in by_name["Artist A & Artist B"]["components"])
    assert all(row["autoPromote"] is False for row in output["queue"])
    assert all(row["identityStatus"] == "unverified" for row in output["queue"])
    assert all(row["scopeStatus"] == "unverified" for row in output["queue"])

    print("PASS: catalog review queue classification is deterministic and review-only")


if __name__ == "__main__":
    main()
