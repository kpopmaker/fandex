# FANDEX Artist Expansion — NAVER Identity Coverage Audit v1

Validation branch: `validation/artist-expansion-generic-naver-pipeline-v1`

Scope: read-only / validation-only. No Production merge, Product Operations approval, public cutover, or Vercel Preview.

## Result

- total artists: 100
- identity-ready: 66
- identity-metadata-required: 34
- readiness rate: 66%
- realtime artists: 28
- realtime ready: 12
- realtime blocked: 16

Identity-ready means the current canonical artist profile contains at least one Korean alias of length >= 2, which is the current acceptance evidence used by `verifyNaverNewsArtistRelevance`.

Identity-metadata-required is not interpreted as zero, stable, or negative evidence. It means the current identity contract cannot accept NAVER evidence for that artist.

## Realtime blockers

- aespa
- ive
- riize
- illit
- lesserafim
- newjeans
- babymonster
- straykids
- seventeen
- bts
- blackpink
- twice
- enhypen
- ateez
- zerobaseone
- jimin

## All identity-metadata-required artists

- aespa
- ive
- riize
- illit
- tws
- lesserafim
- newjeans
- nmixx
- babymonster
- boynextdoor
- straykids
- seventeen
- bts
- blackpink
- twice
- enhypen
- ateez
- zerobaseone
- itzy
- meovv
- izna
- treasure
- monstax
- exo
- mamamoo
- akmu
- taeyeon
- jimin
- suga
- baekhyun
- zico
- bibi
- day6
- qwer

## Current conclusion

The NAVER artist pipeline is structurally generic after canonical identity is present. The main expansion blocker is canonical identity metadata coverage, not IU-specific logic in the read adapter.

Next validation target: resolve/verify Korean aliases and query mappings for the 16 realtime blockers, then rerun multi-artist regression before any integration handoff.
