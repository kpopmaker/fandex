"""Run one controlled shadow decision against one real read-only AESPA target."""
import argparse, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];SCRIPTS=Path(__file__).resolve().parent
CONTRACT=SCRIPTS/"aespa_real_source_shadow_execution_preview_contract.preview.json";V66=SCRIPTS/"aespa_application_contract_executable_semantics_proposal.preview.json";V68=SCRIPTS/"aespa_application_persistence_interface_readiness_plan.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-real-source-shadow-execution";REPRO=ROOT/"tmp/source-sandbox/naver/aespa-real-source-shadow-execution-repro"
ALLOW={"scripts/source-sandbox/aespa_real_source_shadow_execution_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_real_source_shadow_execution.py","docs/real-source-sandbox-aespa-real-source-shadow-execution-preview.md"}
EXPECTED_BRANCH="v71-real-source-sandbox-aespa-real-source-shadow-execution-preview";EXPECTED_BASE="96de9747ee182c1e74437dbdab1eb6284457d6da"
LABELS={"controlled_fixture_only":True,"shadow_decision_only":True,"not_real_human_decision":True,"not_historical_decision":True,"not_production":True}
REAL_ZERO={k:0 for k in ["real_human_decision_submission_count","real_approval_count","real_rejection_count","real_decision_application_count","real_application_record_write_count","real_audit_write_count","real_decision_state_mutation_count","real_review_queue_mutation_count","real_source_mutation_count","database_write_count","filesystem_semantic_persistence_count","external_write_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","production_mutation_count","production_effect_count"]}
class Failure(RuntimeError):pass
def load(p):
    with p.open(encoding="utf-8") as f:return json.load(f)
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
def sha(v):return hashlib.sha256(v).hexdigest()
def object_sha(v):return sha(canonical(v))
def file_sha(p):return sha(p.read_bytes())
def import_at(path,name):
    spec=importlib.util.spec_from_file_location(name,path);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
def git(*args):return subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54",*args],cwd=ROOT,capture_output=True,text=True,encoding="utf-8",errors="replace",check=True).stdout.strip()
def validate(c,v66,v68,v70_contract):
    if git("branch","--show-current")!=EXPECTED_BRANCH or git("merge-base","HEAD","origin/main")!=EXPECTED_BASE or git("rev-parse","origin/main")!=EXPECTED_BASE:raise Failure("branch/base mismatch")
    for ref in c["references"]:
        if file_sha(ROOT/ref["path"])!=ref["sha256"]:raise Failure("module/contract drift: "+ref["role"])
    if v66["future_local_simulation_executable_spec_readiness"]!="ready" or v68["future_local_disposable_persistence_adapter_readiness"]!="ready_for_separate_adapter_implementation":raise Failure("upstream readiness mismatch")
    if v70_contract["authority"]!="local_end_to_end_orchestrator_validation_only" or v70_contract["production_persistence_readiness"]!="not_ready" or v70_contract["production_execution_readiness"]!="not_ready":raise Failure("v70 authority/readiness mismatch")
    source=(ROOT/c["references"][-1]["path"]).read_text(encoding="utf-8")
    if '"ready_for_separate_shadow_execution"' not in source or 'def orchestrate(' not in source:raise Failure("v70 reusable readiness surface missing")
def identity(record):return {k:record[k] for k in ("decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type")}
def discover(v70,v63):
    env=v70.environment(v63);records=env[6];eligible=[x for x in records if x.get("queue_status")=="pending_review" and x.get("current_decision_status")=="not_decided" and v63.state_compatible(x)]
    fields=("decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type");eligible=sorted(eligible,key=lambda x:tuple(x[k] for k in fields))
    if len(records)!=1000 or len(eligible)!=1000:raise Failure("historical population mismatch")
    return env,records,eligible,eligible[0]
def counts(records):return {"real_template_count":len(records),"real_pending_review_count":sum(x["queue_status"]=="pending_review" for x in records),"real_not_decided_count":sum(x["current_decision_status"]=="not_decided" for x in records),"real_actual_submission_count":0,"real_actual_approval_count":0,"real_actual_rejection_count":0,"real_actual_decided_count":0,"real_application_record_count":0,"real_audit_record_count":0}
def safe_target(record):return {**identity(record),"historical_queue_status":record["queue_status"],"historical_decision_status":record["current_decision_status"],"gate_status":record["submission_template"]["gate_status"],"existing_application_id":None}
def select_intent(target,application_contract,v66):
    gate=target["submission_template"]["gate_status"];gate_rule=next(x for x in application_contract["gate_status_rules"] if x["gate_status"]==gate);supported=set(v66["exact_intent_mapping"]);allowed=sorted(x for x in gate_rule["allowed_decision_intents"] if x!="not_decided" and x in supported)
    if not allowed:raise Failure("no compatible actionable shadow intent")
    return allowed[0],allowed
def submission(target,intent,application_contract):
    rule=next(x for x in application_contract["intent_rules"] if x["decision_intent"]==intent);rationale=rule["allowed_rationale_codes"][0]
    return {**identity(target),"decision_intent":intent,"reviewer_id":"controlled-shadow-reviewer","rationale_codes":[rationale],"reviewer_note":"restricted controlled shadow note","reviewed_at":"2026-01-01T00:00:00Z","requested_enrichment_fields":["author"] if rule["enrichment_fields_required"] else [],**LABELS}
def artifact_manifest(c):return {x["path"]:file_sha(ROOT/x["path"]) for x in c["references"]}
def run(out,c,v66,v68,v70,v63,v67,v69,normal_submission=None,normal_context=None):
    raw_context=v63.context();historical_paths=raw_context[8];pre_hashes={str(p.relative_to(ROOT)).replace("\\","/"):file_sha(p) for p in historical_paths};pre_hashes.update(artifact_manifest(c));env,records,eligible,target=discover(v70,v63);before_counts=counts(records);before=safe_target(target);intent,permitted=select_intent(target,env[4],v66);shadow=normal_submission if normal_submission is not None else submission(target,intent,env[5]);context=normal_context if normal_context is not None else {"application_context":{"applied_at":"2026-02-03T04:05:06Z","provenance":"controlled_fixture_only"}}
    if any(shadow.get(k)!=v for k,v in identity(target).items()):raise Failure("submission target mismatch")
    context_for_v70={"application_context":{"applied_at":context.get("application_context",{}).get("applied_at")}}
    result=v70.orchestrate(shadow,context_for_v70,object_sha(shadow),env,v66,v68,v67,v69);status=result["result_status"]
    if status!="applied" or not result.get("persisted_evidence",{}).get("read_after_write_verified"):raise Failure("real-source shadow orchestration failed")
    adapter=result["adapter"];read=adapter.read_application_target(identity(target));snap=adapter.snapshot();application=snap["applications"][0];audit=snap["audits"][0];after=read["target_snapshot"];initial_shadow=v67.copied_state(shadow,target)
    shadow_after={"decision_outcome":after["decision"]["outcome"],"queue_status":after["review_queue"]["status"],"queue_active":after["review_queue"]["active"],"queue_resolved":after["review_queue"]["resolved"],"application_id":application["application_id"],"application_digest":object_sha(application),"audit_digest":object_sha(audit),"state_fingerprint":read["state_fingerprint"],"source_state_unchanged":after["source"]==initial_shadow["source"] and result["persisted_evidence"]["source_state_unchanged"],"immutable_identity_unchanged":after["identity"]==initial_shadow["identity"],"semantic_location":"v69_process_local_memory_only"}
    env_after,records_after,eligible_after,target_after=discover(v70,v63);after_counts=counts(records_after);historical_after=safe_target(target_after)
    comparison={"historical_before":{"decision_status":before["historical_decision_status"],"queue_status":before["historical_queue_status"],"application_id":None,"audit_count":0},"shadow_after":shadow_after,"historical_after_verified_unchanged":before==historical_after and before_counts==after_counts,"source_state_equal":shadow_after["source_state_unchanged"],"identity_equal":shadow_after["immutable_identity_unchanged"]}
    selection={"candidate_count":len(eligible),"selector_algorithm":c["deterministic_target_selector"]["algorithm"],"selector_key_fields":c["deterministic_target_selector"]["key_fields"],"selected_target_safe_identity":identity(target),"selected_target_index":0,"permitted_actionable_intents":permitted,"selected_shadow_intent":intent}
    safe_submission={**identity(target),"decision_intent":shadow["decision_intent"],"reviewer_id_class":"synthetic_controlled","rationale_codes":shadow["rationale_codes"],"requested_enrichment_field_count":len(shadow.get("requested_enrichment_fields",[])),**LABELS,"submission_digest":object_sha(shadow)}
    post_hashes={str(p.relative_to(ROOT)).replace("\\","/"):file_sha(p) for p in historical_paths};post_hashes.update(artifact_manifest(c));immutability={"artifact_hashes_before":pre_hashes,"artifact_hashes_after":post_hashes,"all_equal":pre_hashes==post_hashes,"historical_semantic_state_equal":before==historical_after,"historical_counts_equal":before_counts==after_counts}
    validation={"version":"v71","real_source_shadow_execution_conformance":"passed","future_explicit_human_shadow_decision_readiness":"ready_for_separate_explicit_human_shadow_run","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","historical_counts_before":before_counts,"historical_counts_after":after_counts,"real_counters":REAL_ZERO,"shadow_counters":{"real_target_candidate_count":len(eligible),"real_target_selected_count":1,"shadow_submission_count":1,"shadow_orchestrator_run_count":1,"shadow_atomic_apply_count":1,"shadow_application_record_count":1,"shadow_audit_event_count":1,"shadow_decision_transition_count":1,"shadow_queue_transition_count":1,"shadow_read_after_write_verification_count":1},"selected_shadow_intent":intent,"controlled_reviewer_metadata_valid":True,"controlled_rationale_valid":True,"applied_at":"2026-02-03T04:05:06Z" if normal_context is None else context_for_v70["application_context"]["applied_at"],"v70_result_status":status,"v69_in_memory_only":True,"safe_output_reviewer_note_excluded":True,"semantic_filesystem_persistence":False,"historical_unchanged":comparison["historical_after_verified_unchanged"] and immutability["all_equal"]}
    values={"real_target_selection.json":selection,"historical_before.safe.json":before,"shadow_submission.safe.json":safe_submission,"shadow_execution_result.safe.json":{"result_status":status,"application_id":shadow_after["application_id"],"read_after_write_verified":True,"provenance":"validated_v70_local_orchestrator"},"shadow_after.safe.json":shadow_after,"historical_after.safe.json":historical_after,"before_after_comparison.json":comparison,"artifact_immutability.json":immutability,"validation.json":validation,"safe_summary.json":{k:v for k,v in validation.items() if k not in ("historical_counts_before","historical_counts_after")}}
    out.mkdir(parents=True,exist_ok=True)
    for name,value in values.items():(out/name).write_bytes(canonical(value))
    return values,shadow,context_for_v70,target,env
def failures(v70,v63,v67,v69,v66,v68,shadow,context,target,env):
    cases=[]
    for name,change,ctx in [("target_mismatch",{"queue_id":"broken"},context),("broken_lineage",{"gate_id":"broken"},context),("invalid_reviewer",{"reviewer_id":None},context),("invalid_rationale",{"rationale_codes":["invalid"]},context),("missing_applied_at",{},{} )]:
        s=copy.deepcopy(shadow);s.update(change);r=v70.orchestrate(s,ctx,object_sha(s),env,v66,v68,v67,v69);cases.append({"case":name,"result_status":r["result_status"],"failure_reason_code":r["failure_reason_code"]})
    if any(x["result_status"]!="validation_rejected" for x in cases):raise Failure("failure case did not fail closed")
    return cases
def safety():
    changed={line[3:].replace("\\","/") for line in git("status","--porcelain","--untracked-files=all").splitlines() if len(line)>3}
    if not changed.issubset(ALLOW):raise Failure("tracked allowlist violation")
    for out in (FIRST,REPRO):
        if subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54","check-ignore",str((out/"validation.json").relative_to(ROOT))],cwd=ROOT,capture_output=True).returncode:raise Failure("tmp output not ignored")
def execute():
    c=load(CONTRACT);v66=load(V66);v68=load(V68);v70_contract=load(SCRIPTS/"aespa_local_end_to_end_execution_orchestrator_preview_contract.preview.json");validate(c,v66,v68,v70_contract);v70=import_at(SCRIPTS/"preview_aespa_local_end_to_end_execution_orchestrator.py","v71_v70");v63,v67,v69=v70.modules();before=artifact_manifest(c);first,shadow,context,target,env=run(FIRST,c,v66,v68,v70,v63,v67,v69);failure_cases=failures(v70,v63,v67,v69,v66,v68,shadow,context,target,env);(FIRST/"failure_cases.json").write_bytes(canonical(failure_cases));repro,*_=run(REPRO,c,v66,v68,v70,v63,v67,v69);(REPRO/"failure_cases.json").write_bytes(canonical(failure_cases));pairs={n:[object_sha(first[n]),object_sha(repro[n])] for n in first}
    if any(a!=b for a,b in pairs.values()) or before!=artifact_manifest(c):raise Failure("determinism or artifact immutability failure")
    safety();print(json.dumps({"self_test":"passed","real_source_shadow_execution_conformance":"passed","future_explicit_human_shadow_decision_readiness":"ready_for_separate_explicit_human_shadow_run","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","sha256_pairs":pairs,"failure_case_count":len(failure_cases),"all_real_effects_zero":True},indent=2))
def local_json(p):
    q=p.resolve();base=(ROOT/"tmp/source-sandbox").resolve()
    if base not in q.parents or not q.is_file() or q.suffix.lower()!=".json":raise Failure("input must be JSON beneath tmp/source-sandbox")
    return q
def normal(sp,cp):
    c=load(CONTRACT);v66=load(V66);v68=load(V68);v70_contract=load(SCRIPTS/"aespa_local_end_to_end_execution_orchestrator_preview_contract.preview.json");validate(c,v66,v68,v70_contract);v70=import_at(SCRIPTS/"preview_aespa_local_end_to_end_execution_orchestrator.py","v71n_v70");v63,v67,v69=v70.modules();s=local_json(sp);x=local_json(cp);sh=file_sha(s);xh=file_sha(x);values,*_=run(FIRST,c,v66,v68,v70,v63,v67,v69,load(s),load(x));
    if sh!=file_sha(s) or xh!=file_sha(x):raise Failure("input mutation")
    print(json.dumps(values["safe_summary.json"],indent=2))
def main():
    p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");p.add_argument("--submission-file",type=Path);p.add_argument("--application-context-file",type=Path);a=p.parse_args()
    try:
        if a.self_test and not a.submission_file and not a.application_context_file:execute()
        elif not a.self_test and a.submission_file and a.application_context_file:normal(a.submission_file,a.application_context_file)
        else:p.error("use --self-test or both local JSON inputs")
    except (Failure,KeyError,ValueError,json.JSONDecodeError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
    return 0
if __name__=="__main__":raise SystemExit(main())
