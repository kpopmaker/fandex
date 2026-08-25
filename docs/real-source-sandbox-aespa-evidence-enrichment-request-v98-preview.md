# aespa evidence-enrichment request v98 preview

This version creates a deterministic, sandbox-only request specification from the exact public v97 `request_enrichment` submission. It creates no evidence artifact, performs no retrieval, and writes to no queue or persistent request state.

## Public boundaries and lineage

The implementation consumes the public v97 decision-submission output, validates the two requested fields through the public v72 field contract, and derives the new-evidence plan through the public pure v79 deterministic planner. The request and readiness result bind the exact historical request and target to every pinned v91-v97 digest. The project-owner rationale is represented only by its verified NFC provenance, classification, code-point length, and digest; its text is not copied into v98 output.

## Bounded collection routes

Route A requires one genuinely new target-bound human artifact showing, together, a visible address bar with one allowed exact target URL, the exact headline, explicit journalist/byline text, explicit publisher or press outlet, and publication time. Journalist identity may not be inferred.

Route B applies only to the exact MyDaily direct-source URL. It requires the visible address bar, exact headline, explicit publisher text, publication time, and a visible NFC-normalized summary or first-paragraph excerpt bounded to at most 1000 Unicode code points. It forbids requesting or retaining the full article body.

No route is preselected. Search results, another article, reposts, inferred attribution, logo-only attribution, screenshots without an address bar, edited evidence, the unchanged v91 screenshot, full-body captures, unrelated content, and private account material are rejected.

## State separation

The preview request is ready for future human collection, but evidence is neither received nor validated. The suggested future ignored location is `tmp/source-sandbox/aespa-v98-human-enrichment/enrichment-header.png`; v98 creates neither that file nor its directory and invents no future digest. The prior screenshot remains ignored and unchanged.

The request is not queued or persisted. Candidate approval, exception acceptance, decision application, normalized-record application, historical-request mutation or closure, production readiness, provider retry, and all external effects remain absent.
