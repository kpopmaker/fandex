# v105 post-enrichment human re-review decision submission preview

This sandbox-only stage binds the project owner's exact `approve_candidate` input to the fresh, ready v104 `approval_candidate` packet. It preserves the supplied 22-code-point NFC rationale separately from system-derived packet facts and identifies the actor only by the `project_owner` role.

The implementation reuses the public v84 vocabulary and public v86 validator. A successful result is a validated shadow submission only: decision application, candidate approval, exception acceptance, historical-request mutation or closure, normalized-record application, persistence, queueing, retrieval, and production effects remain absent.

The historical v97 `request_enrichment` decision remains immutable lineage and is neither current, resubmitted, nor reapplied. The ignored enrichment PNG and every predecessor input remain unchanged and are not committed.
