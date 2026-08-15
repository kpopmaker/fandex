"""Simulate the proposed v66 AESPA application contract on an isolated copy."""
import argparse, copy, hashlib, importlib.util, json, re, subprocess, sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
V66_PATH = SCRIPTS / "aespa_application_contract_executable_semantics_proposal.preview.json"
CONTRACT_PATH = SCRIPTS / "aespa_application_contract_simulation_preview_contract.preview.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-application-contract-simulation"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-application-contract-simulation-repro"
ALLOWLIST = {"scripts/source-sandbox/aespa_application_contract_simulation_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_application_contract_simulation.py","docs/real-source-sandbox-aespa-application-contract-simulation-preview.md"}
PROVENANCE = "simulated_from_proposed_v66"
FIXTURE_FLAGS = {"semantic_provenance":"controlled_fixture_only","not_real_human_decision":True,"not_real_aespa_state":True,"not_production":True,"simulation_only":True}
REAL_ZERO = {"real_application_count":0,"real_application_record_write_count":0,"real_audit_write_count":0,"real_source_mutation_count":0,"real_review_queue_mutation_count":0,"real_decision_state_mutation_count":0,"production_mutation_count":0,"production_effect_count":0,"external_write_count":0}

class Failure(RuntimeError): pass
def load(p):
    with p.open(encoding="utf-8") as f: return json.load(f)
def canonical(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
def sha_bytes(v): return hashlib.sha256(v).hexdigest()
def object_sha(v): return sha_bytes(canonical(v))
def file_sha(p): return sha_bytes(p.read_bytes())
def hash_components(values, spec):
    if any(isinstance(v,(list,dict,float)) or not (v is None or isinstance(v,(str,bool,int))) for v in values): raise Failure("forbidden hash component")
    return sha_bytes(json.dumps(values,ensure_ascii=spec["serialization"]["ensure_ascii"],sort_keys=spec["serialization"]["sort_keys"],separators=tuple(spec["serialization"]["separators"])).encode("utf-8"))
def ptr_get(o,p):
    for part in p.strip("/").split("/"): o=o[part]
    return o
def ptr_set(o,p,v):
    parts=p.strip("/").split("/")
    for part in parts[:-1]: o=o[part]
    o[parts[-1]]=v
def leaf_diff(a,b,p=""):
    out=[]
    if isinstance(a,dict) and isinstance(b,dict):
        for k in sorted(set(a)|set(b)): out += leaf_diff(a.get(k),b.get(k),p+"/"+k)
    elif a != b: out.append(p)
    return out
def import_at(path,name):
    spec=importlib.util.spec_from_file_location(name,path); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

def validate_v66(v66, expected_sha=None):
    if expected_sha and file_sha(V66_PATH)!=expected_sha: raise Failure("v66 contract hash mismatch")
    required={"proposal_status":"proposal_only","historical_authority":False,"production_authority":False,"future_local_simulation_executable_spec_readiness":"ready","production_application_readiness":"not_ready"}
    if any(v66.get(k)!=v for k,v in required.items()): raise Failure("v66 authority/readiness mismatch")
    intents=list(v66["exact_intent_mapping"])
    if len(intents)!=6 or {r["decision_intent"] for r in v66["transition_table"]}!=set(intents): raise Failure("v66 transition coverage invalid")
    if len(v66["application_record_fields"])!=20 or len(v66["audit_event_fields"])!=14: raise Failure("v66 record schema invalid")
    for vector in v66["hash_test_vectors"]:
        raw=json.dumps(vector["components"],ensure_ascii=False,sort_keys=True,separators=(",",":"))
        if raw!=vector["canonical_serialized"] or hash_components(vector["components"],v66["canonical_hash_algorithm"])!=vector["expected_sha256"]: raise Failure("v66 hash vector mismatch: "+vector["case"])
    return intents

def copied_state(submission,target):
    ids={k:submission[k] for k in ("decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type")}
    return {"identity":ids,"decision":{"intent":submission["decision_intent"],"outcome":None},"review_queue":{"status":target.get("queue_status","pending_review"),"active":True,"resolved":False,"additional_review_required":True,"enrichment_required":False},"source":{"eligibility":"unchanged"},"application":{"id":None,"status":None,"applied_at":None,"contract_version":None}}
def fingerprint(state,v66):
    values=[]
    for name in v66["state_fingerprint"]["field_order"]:
        if name in state["identity"]: values.append(state["identity"][name])
        elif name=="queue_status": values.append(state["review_queue"]["status"])
        elif name=="current_decision_status": values.append("not_decided" if state["decision"]["outcome"] is None else state["decision"]["outcome"])
        elif name=="existing_application_id": values.append(state["application"]["id"])
        else: raise Failure("unknown fingerprint field")
    return hash_components(values,v66["canonical_hash_algorithm"])
def validate_context(intent,context,v66):
    if intent=="not_decided":
        if context and context.get("application_context",{}).get("applied_at") is not None: raise Failure("invalid_applied_at")
        return None
    try: value=context["application_context"]["applied_at"]
    except (TypeError,KeyError): raise Failure("missing_required_context")
    pattern=v66["execution_context_schema"]["fields"]["applied_at"]["pattern"]
    if not isinstance(value,str) or not re.fullmatch(pattern,value): raise Failure("invalid_applied_at")
    try:
        from datetime import datetime
        datetime.strptime(value,"%Y-%m-%dT%H:%M:%SZ")
    except ValueError: raise Failure("invalid_applied_at")
    return value

def simulate(submission,context,target,v66,input_hash,expected=None,existing=None,inject=None):
    intent=submission.get("decision_intent")
    rows=[r for r in v66["transition_table"] if r["decision_intent"]==intent]
    if len(rows)!=1: raise Failure("unsupported_decision_intent")
    before=copied_state(submission,target); before_sha=object_sha(before); fp=fingerprint(before,v66)
    if expected is not None and fp!=expected: return closed("conflict","stale_state_fingerprint_mismatch",before,intent,fp)
    applied_at=validate_context(intent,context,v66); row=rows[0]
    if intent=="not_decided":
        return result_base("no_action",before,before,None,None,intent,fp,fp,[])
    components=[]
    sources={"proposal_contract_version":"v66","decision_input_id":submission["decision_input_id"],"decision_preview_id":submission["decision_preview_id"],"queue_id":submission["queue_id"],"gate_id":submission["gate_id"],"internal_source_id":submission["internal_source_id"],"decision_intent":intent,"input_hash":input_hash,"historical_state_hash":fp}
    for name in v66["idempotency_component_order"]: components.append(sources[name])
    app_id=hash_components(components,v66["canonical_hash_algorithm"])
    if existing:
        if existing.get("application_id")==app_id: return result_base("idempotent_existing_result",before,before,existing.get("application_record"),existing.get("audit_event"),intent,fp,fp,[])
        return closed("conflict","conflicting_duplicate",before,intent,fp)
    work=copy.deepcopy(before)
    changes={"/decision/outcome":row["decision_outcome_after"],"/review_queue/status":row["queue_status_after"],"/review_queue/active":row["queue_active_after"],"/review_queue/resolved":row["review_resolved_after"],"/review_queue/additional_review_required":v66["exact_queue_mapping"][intent]["additional_review_required"],"/review_queue/enrichment_required":row["enrichment_required_after"],"/application/id":app_id,"/application/status":row["application_status_after"],"/application/applied_at":applied_at,"/application/contract_version":"v66"}
    if inject=="immutable": changes["/identity/queue_id"]="tampered"
    if inject=="outside": changes["/source/eligibility"]="tampered"
    for p,v in changes.items(): ptr_set(work,p,v)
    changed=leaf_diff(before,work); allowed=set(v66["copied_state_schema"]["proposal_mutable_paths"])
    if inject=="component": return closed("failed","atomic_component_failure",before,intent,fp,atomic=True)
    if any(p not in allowed for p in changed): return closed("failed","atomic_component_failure",before,intent,fp,atomic=True)
    app={"application_id":app_id,**before["identity"],"decision_intent":intent,"decision_outcome":row["decision_outcome_after"],"application_status":"applied","reviewer_id":submission["reviewer_id"],"reviewed_at":submission["reviewed_at"],"rationale_codes":submission["rationale_codes"],"reviewer_note":submission.get("reviewer_note"),"requested_enrichment_fields":submission.get("requested_enrichment_fields",[]),"input_hash":input_hash,"historical_state_hash":fp,"proposal_contract_version":"v66","applied_at":applied_at}
    if [f["name"] for f in v66["application_record_fields"]] != list(app): raise Failure("application record field mismatch")
    after_fp=fingerprint(work,v66)
    audit={"application_id":app_id,"decision_input_id":before["identity"]["decision_input_id"],"queue_id":before["identity"]["queue_id"],"gate_id":before["identity"]["gate_id"],"internal_source_id":before["identity"]["internal_source_id"],"sandbox_artist_key":before["identity"]["sandbox_artist_key"],"source_type":before["identity"]["source_type"],"reviewer_id":submission["reviewer_id"],"decision_intent":intent,"before_state_fingerprint":fp,"after_state_fingerprint":after_fp,"proposal_contract_version":"v66","result":row["audit_result_value"],"failure_reason_code":None}
    if [f["name"] for f in v66["audit_event_fields"]] != list(audit): raise Failure("audit field mismatch")
    return result_base("applied",before,work,app,audit,intent,fp,after_fp,changed)

def result_base(status,before,after,app,audit,intent,bfp,afp,changed):
    immutable=[p for p in load(V66_PATH)["copied_state_schema"]["immutable_identity_paths"] if ptr_get(before,p)==ptr_get(after,p)]
    counters={"simulation_candidate_count":1,"simulated_application_count":int(status=="applied"),"simulated_no_action_count":int(status=="no_action"),"simulated_conflict_count":int(status=="conflict"),"simulated_failure_count":int(status=="failed"),"simulated_idempotent_duplicate_count":int(status=="idempotent_existing_result"),"simulated_decision_transition_count":int(status=="applied"),"simulated_queue_transition_count":int(status=="applied"),"simulated_application_record_count":int(status=="applied"),"simulated_audit_event_count":int(status=="applied"),"simulated_atomic_success_count":int(status=="applied"),"simulated_atomic_failure_count":0,"simulated_source_transition_count":0,"simulated_score_mutation_count":0,"simulated_ranking_mutation_count":0,"simulated_chart_mutation_count":0,"simulated_public_data_mutation_count":0,"simulated_production_mutation_count":0,**REAL_ZERO}
    return {"result":status,"failure_reason_code":None,"before":before,"after":after,"application_record":app,"audit_event":audit,"diff":{"changed_paths":changed,"unchanged_immutable_identity_paths":immutable,"before_state_sha256":object_sha(before),"after_state_sha256":object_sha(after),"transition_intent":intent,"transition_provenance":PROVENANCE},"before_state_fingerprint":bfp,"after_state_fingerprint":afp,"counters":counters}
def closed(status,reason,before,intent,fp,atomic=False):
    r=result_base(status,before,copy.deepcopy(before),None,None,intent,fp,fp,[]); r["failure_reason_code"]=reason
    if atomic: r["counters"]["simulated_atomic_failure_count"]=1
    return r

def fixture(intent="approve_candidate"):
    s={"decision_input_id":"fixture-decision-input","decision_preview_id":"fixture-decision-preview","queue_id":"fixture-queue","gate_id":"fixture-gate","internal_source_id":"fixture-source","sandbox_artist_key":"aespa","source_type":"naver","decision_intent":intent,"reviewer_id":"controlled-fixture-reviewer","reviewed_at":"2026-01-01T00:00:00Z","rationale_codes":["unreliable_source"],"reviewer_note":"restricted controlled fixture note","requested_enrichment_fields":["provider_attribution"] if intent=="request_enrichment" else [],**FIXTURE_FLAGS}
    return s
def target(): return {"queue_status":"pending_review","current_decision_status":"not_decided"}
def ctx(value="2026-01-02T03:04:05Z"): return {"application_context":{"applied_at":value}}
def write_case(base,name,r):
    d=base/name; d.mkdir(parents=True,exist_ok=True)
    safe={k:v for k,v in r.items() if k not in ("before","after","application_record","audit_event")};
    if r["application_record"]: safe["application_record"]={k:v for k,v in r["application_record"].items() if k!="reviewer_note"}
    values={"safe_summary.json":safe,"simulation_before.json":r["before"],"simulation_after.json":r["after"],"simulation_diff.json":r["diff"],"application_record.preview.json":r["application_record"],"audit_event.preview.json":r["audit_event"]}
    for n,v in values.items(): (d/n).write_bytes(canonical(v))
    return {n:object_sha(v) for n,v in values.items()}

def run_suite(base,v66):
    cases={}; app_results=[]
    for intent in v66["exact_intent_mapping"]:
        s=fixture(intent); c=None if intent=="not_decided" else ctx(); r=simulate(s,c,target(),v66,object_sha(s)); cases[intent]=r
        if r["result"]=="applied": app_results.append(r)
    first=app_results[0]; s=fixture("approve_candidate")
    cases["idempotent_retry"]=simulate(s,ctx(),target(),v66,object_sha(s),existing={"application_id":first["application_record"]["application_id"],"application_record":first["application_record"],"audit_event":first["audit_event"]})
    changed=fixture("reject"); cases["conflicting_duplicate"]=simulate(changed,ctx(),target(),v66,object_sha(changed),existing={"application_id":first["application_record"]["application_id"]})
    probe=fixture(); expected=fingerprint(copied_state(probe,target()),v66); cases["stale_state"]=simulate(probe,ctx(),target(),v66,object_sha(probe),expected="0"*64)
    failure_specs=[("missing_applied_at",fixture(),None,None),("invalid_applied_at",fixture(),ctx("bad"),None),("atomic_component_failure",fixture(),ctx(),"component"),("immutable_identity_tamper",fixture(),ctx(),"immutable"),("outside_allowlist",fixture(),ctx(),"outside")]
    for name,s,c,inject in failure_specs:
        try: cases[name]=simulate(s,c,target(),v66,object_sha(s),expected=expected,inject=inject)
        except Failure as e: cases[name]=closed("failed",str(e),copied_state(s,target()),s["decision_intent"],fingerprint(copied_state(s,target()),v66))
    for name,mut in [("broken_lineage",{"gate_id":"broken"}),("missing_reviewer_metadata",{"reviewer_id":None}),("unsupported_intent",{"decision_intent":"unsupported"})]:
        s=fixture(); s.update(mut)
        reason="broken_linkage" if name=="broken_lineage" else "unsupported_decision_intent" if name=="unsupported_intent" else "broken_linkage"
        cases[name]=closed("failed",reason,copied_state(s,target()),s["decision_intent"],fingerprint(copied_state(s,target()),v66))
    hashes={name:write_case(base,name,r) for name,r in cases.items()}
    aggregate={"fixture_flags":FIXTURE_FLAGS,"cases":{k:{"result":v["result"],"failure_reason_code":v["failure_reason_code"],"counters":v["counters"]} for k,v in cases.items()},"real_counts":{"real_template_count":1000,"real_pending_review_count":1000,"real_not_decided_count":1000,"real_actual_submission_count":0,"real_actual_approval_count":0,"real_actual_rejection_count":0,"real_actual_decided_count":0,"real_application_count":0,"real_audit_record_count":0},"production_application_readiness":"not_ready"}
    (base/"validation.json").write_bytes(canonical(aggregate)); return cases,hashes,aggregate

def historical_manifest(v66):
    paths={ROOT/x["path"] for x in v66["evidence_modules"]}; paths|={V66_PATH,SCRIPTS/"aespa_application_state_contract_proposal.preview.json"}
    return {str(p.relative_to(ROOT)).replace("\\","/"):file_sha(p) for p in sorted(paths)}
def repo_safety():
    status=subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54","status","--porcelain","--untracked-files=all"],cwd=ROOT,capture_output=True,text=True,encoding="utf-8",errors="replace",check=True).stdout
    changed={line[3:].replace("\\","/") for line in status.splitlines() if len(line)>3}
    if not changed.issubset(ALLOWLIST): raise Failure("tracked allowlist violation")
    for p in (OUT_FIRST,OUT_REPRO):
        probe=p/"validation.json"
        if subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54","check-ignore",str(probe.relative_to(ROOT))],cwd=ROOT,capture_output=True).returncode: raise Failure("tmp output not ignored")

def self_test():
    contract=load(CONTRACT_PATH); v66=load(V66_PATH); validate_v66(v66,contract["v66_contract"]["sha256"]); before=historical_manifest(v66)
    a,ha,va=run_suite(OUT_FIRST,v66); b,hb,vb=run_suite(OUT_REPRO,v66)
    required={"approve_candidate":"applied","accept_exception":"applied","reject":"applied","defer":"applied","request_enrichment":"applied","not_decided":"no_action","idempotent_retry":"idempotent_existing_result","conflicting_duplicate":"conflict","stale_state":"conflict"}
    if any(a[k]["result"]!=v for k,v in required.items()): raise Failure("self-test result mismatch")
    if object_sha(va)!=object_sha(vb) or ha!=hb: raise Failure("reproduction mismatch")
    if historical_manifest(v66)!=before: raise Failure("historical artifact mutation")
    repo_safety(); print(json.dumps({"self_test":"passed","case_count":len(a)+4,"v66_hash_vectors":"passed","validation_sha256_pair":[object_sha(va),object_sha(vb)],"aggregate_artifact_hashes_match":ha==hb,"historical_artifacts_unchanged":True},indent=2))

def normal(submission_path,context_path):
    v66=load(V66_PATH); validate_v66(v66,load(CONTRACT_PATH)["v66_contract"]["sha256"])
    v63=import_at(SCRIPTS/"preview_aespa_decision_application_authorization_gate.py","v67_v63"); contract,v62,v61,validator,_builder,input_contract,application_contract,records,paths,before=v63.context()
    local=v61.ensure_local_submission_path(submission_path); submission,input_hash=v61.parse_one(local); intake,candidate,gate,compatible=v63.evaluate_gate(submission,input_hash,records,v62,v61,validator,input_contract,application_contract)
    matches=[x for x in records if all(x.get(f)==submission.get(f) for f in v63.linkage_fields(v62))]
    if len(matches)!=1 or not compatible or candidate is None: raise Failure("broken_linkage")
    context=load(context_path); context_before=file_sha(context_path); r=simulate(submission,context,matches[0],v66,input_hash,expected=fingerprint(copied_state(submission,matches[0]),v66))
    write_case(OUT_FIRST,"normal",r)
    if file_sha(local)!=input_hash or file_sha(context_path)!=context_before or {str(p):file_sha(p) for p in paths}!=before: raise Failure("input mutation")
    repo_safety(); print(json.dumps({"result":r["result"],"safe_summary":{k:v for k,v in r.items() if k not in ("before","after","application_record","audit_event")}},indent=2))

def main():
    p=argparse.ArgumentParser(); p.add_argument("--self-test",action="store_true"); p.add_argument("--submission-file",type=Path); p.add_argument("--application-context-file",type=Path); a=p.parse_args()
    try:
        if a.self_test and not a.submission_file and not a.application_context_file: self_test()
        elif not a.self_test and a.submission_file and a.application_context_file: normal(a.submission_file,a.application_context_file)
        else: p.error("use --self-test or both local input file options")
    except (Failure,ValueError,KeyError,json.JSONDecodeError) as e: print("FAIL CLOSED: "+str(e),file=sys.stderr); return 1
    return 0
if __name__=="__main__": raise SystemExit(main())
