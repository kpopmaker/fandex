# FANDEX Cloud v10 migration status

This file marks the validated PC-independent cloud migration branch.

- Base: main
- Cloud schedule target: 09:00 KST (`0 0 * * *`)
- Production formula: Naver v3 + YouTube v3 + Music v2 x0.25 + Last.fm Rolling x0.25
- Website `public/data`: not part of the cloud runner
- Initial GitHub Actions validation: PASS
- Health v3: PASS, failCount 0, warnCount 0

The clean production branch contains only the minimum runtime files required for the cloud daily runner rather than the full local migration archive.
