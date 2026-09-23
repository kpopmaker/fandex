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


## Realtime identity remediation validation

The 16 realtime blockers were given validation-branch-only canonical Korean aliases and explicit NAVER queries, then added to the multi-artist regression fixture.

Post-remediation validation-branch coverage:

- total artists: 100
- identity-ready: 82
- identity-metadata-required: 18
- readiness rate: 82%
- realtime artists: 28
- realtime ready: 28
- realtime blocked: 0
- ready artists missing explicit NAVER query: 0

Realtime mappings validated:

- aespa -> 에스파 / `에스파 aespa`
- ive -> 아이브 / `아이브 IVE`
- riize -> 라이즈 / `라이즈 RIIZE`
- illit -> 아일릿 / `아일릿 ILLIT`
- lesserafim -> 르세라핌 / `르세라핌 LE SSERAFIM`
- newjeans -> 뉴진스 / `뉴진스 NewJeans`
- babymonster -> 베이비몬스터 / `베이비몬스터 BABYMONSTER`
- straykids -> 스트레이 키즈 / `스트레이 키즈 Stray Kids`
- seventeen -> 세븐틴 / `세븐틴 SEVENTEEN`
- bts -> 방탄소년단 / `방탄소년단 BTS`
- blackpink -> 블랙핑크 / `블랙핑크 BLACKPINK`
- twice -> 트와이스 / `트와이스 TWICE`
- enhypen -> 엔하이픈 / `엔하이픈 ENHYPEN`
- ateez -> 에이티즈 / `에이티즈 ATEEZ`
- zerobaseone -> 제로베이스원 / `제로베이스원 ZEROBASEONE`
- jimin -> 지민, 박지민 / `지민 BTS`

These edits are validation-only and do not authorize Production integration.

Remaining identity-metadata-required artists:

- tws
- nmixx
- boynextdoor
- itzy
- meovv
- izna
- treasure
- monstax
- exo
- mamamoo
- akmu
- taeyeon
- suga
- baekhyun
- zico
- bibi
- day6
- qwer
