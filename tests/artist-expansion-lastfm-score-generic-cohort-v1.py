import csv
import importlib.util
import json
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def load(name, rel):
    spec=importlib.util.spec_from_file_location(name, ROOT/rel)
    mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

one=load("lastfm_score","scripts/fandex-cloud-migration/source/lastfm_global_interest_score_preview_v1.py")
roll=load("lastfm_roll_score","scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_score_preview_v1.py")

with tempfile.TemporaryDirectory() as tmp:
    t=Path(tmp)
    delta=t/"delta.csv"
    with delta.open("w",encoding="utf-8",newline="") as f:
        w=csv.DictWriter(f,fieldnames=["artist","previousDate","latestDate","daysBetween","listenerDeltaPerDay","playcountDeltaPerDay","status"])
        w.writeheader()
        for i in range(11):
            w.writerow({"artist":f"a{i}","previousDate":"2026-09-22","latestDate":"2026-09-23","daysBetween":1,"listenerDeltaPerDay":i+1,"playcountDeltaPerDay":(i+1)*2,"status":"delta_ready"})
    one.INPUT_CSV=delta; one.OUTPUT_CSV=t/"one.csv"; one.OUTPUT_JSON=t/"one.json"; one.REPORT=t/"one.txt"
    one.main()
    assert json.loads((t/"one.json").read_text())["artistCount"]==11

    rolling=t/"rolling.csv"
    with rolling.open("w",encoding="utf-8",newline="") as f:
        w=csv.DictWriter(f,fieldnames=roll.REQUIRED_FIELDS); w.writeheader()
        for i in range(11):
            w.writerow({"artist":f"a{i}","latestDate":"2026-09-23","snapshotDateCount":7,
            "rolling3Status":"ready","rolling3ListenerDeltaPerDay":i+1,"rolling3PlaycountDeltaPerDay":(i+1)*2,
            "rolling7Status":"ready","rolling7ListenerDeltaPerDay":i+1,"rolling7PlaycountDeltaPerDay":(i+1)*2})
    roll.INPUT_FILE=rolling; roll.OUTPUT_CSV=t/"roll.csv"; roll.OUTPUT_JSON=t/"roll.json"
    roll.main()
    payload=json.loads((t/"roll.json").read_text())
    assert payload["artistCount"]==11
    assert payload["scoreReadyCount"]==11
    assert payload["activeMode"]=="rolling3_50_rolling7_50"

print("PASS: Last.fm score layers support 11 artists")
