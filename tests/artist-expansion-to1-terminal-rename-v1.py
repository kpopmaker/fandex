from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_to1_wakeone_terminal_rename_catalog_v1.py"
spec=importlib.util.spec_from_file_location("to1_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal="<html><body>안녕하세요. 웨이크원입니다. TO1 멤버 동건, 찬, 지수, 재윤, 제이유, 경호, 다이고, 여정은 2023년 12월 31일자로 당사와의 전속 계약을 종료하기로 상호 합의하였습니다. TO1이 아닌 새로운 길을 걷게 될 멤버들의 이후 행보도 지켜봐주시기 바랍니다.</body></html>"
terminal_en="<html><body>Hello. This is WAKEONE. TO1 members Donggeon, Chan, Jisu, Jaeyun, J.You, Kyungho, Daigo, and Yeojeong reached a mutual agreement to terminate our exclusive contract as of December 31, 2023.</body></html>"
rename="<html><body>TOO Changes Their Group Name To TO1. TOO announced an official name change to TO1 on March 28.</body></html>"
chihoon="<html><body>TO1's Chi Hoon left both the group and agency. Chi Hoon has left the team as his exclusive contract ended.</body></html>"
reorg="<html><body>Min Su, Jerome, and Woong Gi decided to leave TO1. New members Daigo, Renta, and Yeo Jeong will join TO1.</body></html>"
renta="<html><body>Renta: we decided to end my activities as TO1's Renta and cheer for each other's futures.</body></html>"
debut="<html><body>REASON FOR BEING : Benevolence - EP TOO April 1, 2020 ℗ 2020 Stone Music Entertainment, n.CH Entertainment</body></html>"

rows=module.parse_live_pages(terminal,terminal_en,rename,chihoon,reorg,renta,debut)
assert [row["displayArtist"] for row in rows]==["TO1"]
snapshot=module.build_snapshot(rows,"2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"]==1
assert snapshot["contract"]["renameContinuityRequired"] is True
assert snapshot["contract"]["renameDoesNotCreateNewCanonical"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["explicitNonTO1FutureEvidenceRequired"] is True
assert snapshot["contract"]["priorExitedMembersExcludedFromTerminalRoster"] is True
assert snapshot["contract"]["legalDisbandmentNotIndependentlyAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"]=="2023-12-31"
assert snapshot["terminalLifecycle"]["lifecycleStatus"]=="inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"]=="historical"
assert snapshot["terminalLifecycle"]["terminalMembers"]==module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"]==8
assert snapshot["terminalLifecycle"]["allTerminalExclusiveContractsEnded"] is True
assert snapshot["terminalLifecycle"]["renameContinuity"][0]["from"]=="TOO"
assert snapshot["terminalLifecycle"]["renameContinuity"][0]["to"]=="TO1"
assert snapshot["terminalLifecycle"]["legalDisbandmentAsserted"] is False
assert snapshot["terminalLifecycle"]["debutDate"]=="2020-04-01"
assert module.parse_live_pages(terminal.replace("TO1이 아닌 새로운 길","TO1으로 계속 활동"),terminal_en,rename,chihoon,reorg,renta,debut)==[]
assert module.parse_live_pages(terminal.replace("여정",""),terminal_en,rename,chihoon,reorg,renta,debut)==[]
assert module.parse_live_pages(terminal,terminal_en,rename.replace("TOO","OLDGROUP"),chihoon,reorg,renta,debut)==[]
assert module.parse_live_pages(terminal,terminal_en,rename,chihoon.replace("left the team","remains in the team").replace("left both the group and agency","remains with group"),reorg,renta,debut)==[]
assert module.parse_live_pages(terminal,terminal_en,rename,chihoon,reorg.replace("Woong Gi",""),renta,debut)==[]
assert module.parse_live_pages(terminal,terminal_en,rename,chihoon,reorg,renta.replace("end my activities as TO1","continue my activities as TO1"),debut)==[]
assert module.parse_live_pages(terminal,terminal_en,rename,chihoon,reorg,renta,debut.replace("April 1, 2020","April 2, 2020"))==[]
print("TO1 WAKEONE terminal rename catalog adapter regression: PASS")
