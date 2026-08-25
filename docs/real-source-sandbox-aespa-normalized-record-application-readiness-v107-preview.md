# v107 normalized-record application readiness preview

This sandbox-only stage constructs one deterministic v36 normalized-record candidate and one two-field write-set plan from the exact approved v106 derived state. It reuses the public Naver normalizer and normalized-source schema validator, plus the existing canonical copied-state planning conventions, without invoking an application or persistence boundary.

The normalized record stores the publisher in the supported `author_or_publisher` field. The accepted journalist/byline remains separate accepted provenance because v36 has no dedicated journalist field; no private schema extension is introduced. The two timestamps remain independent and the full article body and professional email remain absent.

Readiness is `ready`, but normalized application, persistent candidate approval, historical-request fulfillment or closure, queueing, network access, and production effects remain absent. The ignored PNG and all predecessor artifacts remain unchanged and uncommitted.
