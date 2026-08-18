# AESPA real enrichment evidence intake boundary preview v90

v90 consumes a fresh v89 public build. v89 conformance passes, its evidence-intake entry is `ready_for_read_only_input_boundary_preview`, and its authority-backed DAG remains external verification → real historical fulfillment → new explicit human decision. v90 resolves none of those gaps.

The bound historical request is `4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283`, with historical decision `request_enrichment`, reviewer `jm-reviewer-001`, and requested fields `content_context` and `source_attribution`.

The closed intake envelope separates metadata—exact request and target binding, requested field, candidate source class, supplied provenance, controlled-fixture and synthetic-test labels—from payload content represented by v75 evidence component envelopes. v90 delegates component validation to the public v81 `validate_enrichment_evidence` method. It never invokes v81 acceptance or completion evaluation.

`content_context` requires title plus summary or title plus bounded excerpt. Excerpts must already be NFC-normalized and contain at most 1000 Unicode code points. Durable full-article-body retention is prohibited. `source_attribution` requires a non-empty `author_or_publisher`; provider key, domain, or URL alone is insufficient. The controlled matrix covers both content alternatives, author, publisher, combined author/publisher, and malformed or incomplete variants.

The real intake source classes are existing normalized local evidence and separately authorized provider or direct-source evidence. `controlled_fixture_input` is test-only. Supplied actor, locator, collection, and provenance metadata is checked structurally but is not asserted truthful.

A structurally valid result is only an intake candidate. It is not externally verified, accepted, field-satisfying, historically fulfilled, human-re-review-ready, historical authority, or production authority. Candidate IDs are preview-only canonical SHA-256 identifiers and are not evidence, acceptance, fulfillment, audit, or historical record IDs.

The readiness matrix leaves every downstream stage blocked. The next boundary is awaiting authorized external evidence input matching the v90 envelope. The system must not fabricate that input.

v90 does not retrieve evidence. v90 does not verify evidence. v90 does not accept evidence. v90 does not mark any requested field satisfied. v90 does not mark the historical enrichment request fulfilled. v90 does not create a human re-review packet. v90 does not select or submit a human decision. v90 does not apply a decision. v90 only defines and tests the read-only intake boundary using controlled local fixtures. No network, persistence, historical mutation, or production effect occurs.
