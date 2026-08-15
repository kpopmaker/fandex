"""Validate and render the provider-neutral v68 persistence-interface plan."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; SCRIPTS=Path(__file__).resolve().parent
CONTRACT=SCRIPTS/"aespa_application_persistence_interface_readiness_plan.preview.json"
V66=SCRIPTS/"aespa_application_contract_executable_semantics_proposal.preview.json"
V67=SCRIPTS/"aespa_application_contract_simulation_preview_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-application-persistence-interface-readiness"
REPRO=ROOT/"tmp/source-sandbox/naver/aespa-application-persistence-interface-readiness-repro"
ALLOW={"scripts/source-sandbox/aespa_application_persistence_interface_readiness_plan.preview.json","scripts/source-sandbox/preview_aespa_application_persistence_interface_readiness.py","docs/real-source-sandbox-aespa-application-persistence-interface-readiness-plan.md"}
EXPECTED_BRANCH="v68-real-source-sandbox-aespa-application-persistence-interface-readiness-plan"; EXPECTED_BASE="c116e976ca480b143e7f5a161eb183ed5cc2ce75"
ZERO_KEYS=["application_execution_count","application_simulation_count","persistence_adapter_execution_count","application_record_write_count","audit_write_count","decision_state_mutation_count","review_queue_mutation_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","production_mutation_count","production_effect_count","external_write_count"]
class Failure(RuntimeError): pass
def load(p):
    with p.open(encoding="utf-8") as f:return json.load(f)
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
def sha(v):return hashlib.sha256(v).hexdigest()
def object_sha(v):return sha(canonical(v))
def file_sha(p):return sha(p.read_bytes())
def git(*args):
    return subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54",*args],cwd=ROOT,capture_output=True,text=True,encoding="utf-8",errors="replace",check=True).stdout.strip()
def validate(c,v66,v67):
    if git("branch","--show-current")!=EXPECTED_BRANCH or git("merge-base","HEAD","origin/main")!=EXPECTED_BASE or git("rev-parse","origin/main")!=EXPECTED_BASE:raise Failure("branch/base preflight mismatch")
    expected={"authority":"persistence_interface_proposal_only","historical_authority":False,"production_authority":False,"plan_only":True,"application_execution":False,"application_simulation":False,"persistence_adapter_implementation":False,"production_persistence_readiness":"not_ready"}
    if any(c.get(k)!=v for k,v in expected.items()):raise Failure("contract authority/safety mismatch")
    for ref in c["references"]:
        p=ROOT/ref["path"]
        if not p.is_file() or file_sha(p)!=ref["sha256"]:raise Failure("provenance mismatch: "+ref["role"])
    if v66.get("future_local_simulation_executable_spec_readiness")!="ready" or v66.get("production_application_readiness")!="not_ready":raise Failure("v66 readiness mismatch")
    if v67.get("simulation_specification")!="v66_executable_semantics_contract" or not v67.get("copied_state_only") or v67.get("production_authorization"):raise Failure("v67 proof authority mismatch")
    proof=c["v67_proof"]
    if proof["self_test_status"]!="passed" or proof["case_count"]!=21 or not all(proof[k] for k in ("all_six_intents_covered","atomicity_proved","idempotency_proved","stale_state_proved","historical_immutability_proved")):raise Failure("v67 proof incomplete")
    if len(v66["exact_intent_mapping"])!=6 or len(v66["application_record_fields"])!=proof["application_record_field_count"] or len(v66["audit_event_fields"])!=proof["audit_event_field_count"]:raise Failure("v66/v67 schema proof mismatch")
    ops={x["operation_name"] for x in c["interface_operations"]}
    if ops!={"read_application_target","lookup_application_by_id","apply_application_atomically"}:raise Failure("operation boundary mismatch")
    req=c["atomic_request_schema"]; result=c["atomic_result_schema"]
    if len(req["required_fields"])!=9 or set(req["required_fields"])!=set(req["fields"]):raise Failure("atomic request incomplete")
    if len(result["required_fields"])!=7 or set(result["required_fields"])!=set(result["fields"]):raise Failure("atomic result incomplete")
    if req["adapter_may_rederive_transition"] or "infer_decision_outcome_from_intent" not in c["forbidden_capabilities"]:raise Failure("adapter business-logic leak")
    if c["source_downstream_boundary"]["source_write_requirement"] or not all(x in c["forbidden_capabilities"] for x in ("mutate_score","mutate_ranking","mutate_chart","mutate_public_data")):raise Failure("downstream boundary mismatch")
    if not c["atomicity_invariant"]["all_or_nothing"] or c["atomicity_invariant"]["partial_success_allowed"] or len(c["atomicity_invariant"]["atomic_set"])!=4:raise Failure("atomicity incomplete")
    errors=c["error_vocabulary"]
    if len(errors)!=7 or len({x["error_code"] for x in errors})!=7 or any(not x.get("retry_class") for x in errors):raise Failure("error/retry vocabulary incomplete")
    if len(c["interface_completeness_matrix"])!=12 or any(not row[1] for row in c["interface_completeness_matrix"]):raise Failure("interface completeness gap")
    if c["future_local_disposable_persistence_adapter_readiness"]!="ready_for_separate_adapter_implementation" or c["readiness_dimensions"]["production_persistence_readiness"]!="not_ready":raise Failure("readiness conflation")
    if len(c["production_blockers"])<10 or any(provider in canonical(c).decode() for provider in ('"Supabase"','"Postgres"','"SQLite"','"Redis"')):raise Failure("provider neutrality failure")
def matrix(c):
    keys=["requirement","defined","interface_operation","required","blocks_local_adapter","blocks_production","provenance"]
    return [dict(zip(keys,row)) for row in c["interface_completeness_matrix"]]
def build(c,v66):
    interface={k:c[k] for k in ("interface_version","semantic_contract","required_capabilities","forbidden_capabilities","interface_operations","target_state_read_model","idempotency_behavior","stale_state_behavior","atomicity_invariant","read_result_model","restricted_metadata_policy","source_downstream_boundary","v67_to_persistence_mapping")}
    request={**c["atomic_request_schema"],"application_record_field_names":[x["name"] for x in v66["application_record_fields"]],"audit_event_field_names":[x["name"] for x in v66["audit_event_fields"]]}
    result=c["atomic_result_schema"]
    errors={"error_vocabulary":c["error_vocabulary"],"retry_policy":c["retry_policy"]}
    readiness={"dimensions":c["readiness_dimensions"],"future_local_disposable_persistence_adapter_readiness":c["future_local_disposable_persistence_adapter_readiness"],"production_persistence_readiness":c["production_persistence_readiness"],"production_blockers":c["production_blockers"],"interface_completeness_matrix":matrix(c)}
    return interface,request,result,errors,readiness
def historical_manifest(c):return {x["path"]:file_sha(ROOT/x["path"]) for x in c["references"]}
def run(out,c,v66):
    interface,request,result,errors,readiness=build(c,v66)
    counters={k:0 for k in ZERO_KEYS}; real={"real_template_count":1000,"real_pending_review_count":1000,"real_not_decided_count":1000,"real_actual_submission_count":0,"real_actual_approval_count":0,"real_actual_rejection_count":0,"real_actual_decided_count":0,"real_application_count":0,"real_application_record_count":0,"real_audit_record_count":0}
    validation={"version":"v68","status":"valid_provider_neutral_persistence_interface_readiness_plan","v66_readiness":"ready","v67_proof_status":"passed","supported_intent_count":6,"application_record_field_count":20,"audit_event_field_count":14,"required_capability_count":len(c["required_capabilities"]),"forbidden_capability_count":len(c["forbidden_capabilities"]),"interface_operation_count":len(c["interface_operations"]),"interface_completeness_count":len(c["interface_completeness_matrix"]),"provider_selected":False,"future_local_disposable_persistence_adapter_readiness":c["future_local_disposable_persistence_adapter_readiness"],"production_persistence_readiness":"not_ready","real_state":real,"counters":counters,"persistence_interface_sha256":object_sha(interface),"atomic_request_schema_sha256":object_sha(request),"atomic_result_schema_sha256":object_sha(result),"error_retry_matrix_sha256":object_sha(errors),"readiness_matrix_sha256":object_sha(readiness)}
    validation["deterministic_validation_sha256"]=object_sha(validation)
    values={"persistence_interface.json":interface,"atomic_request_schema.json":request,"atomic_result_schema.json":result,"error_retry_matrix.json":errors,"readiness_matrix.json":readiness,"validation.json":validation,"safe_summary.json":{k:v for k,v in validation.items() if k not in ("real_state","counters")}}
    out.mkdir(parents=True,exist_ok=True)
    for name,value in values.items():(out/name).write_bytes(canonical(value))
    return values
def safety():
    changed={line[3:].replace("\\","/") for line in git("status","--porcelain","--untracked-files=all").splitlines() if len(line)>3}
    if not changed.issubset(ALLOW):raise Failure("tracked-file allowlist violation: "+str(sorted(changed-ALLOW)))
    for out in (FIRST,REPRO):
        if subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54","check-ignore",str((out/"validation.json").relative_to(ROOT))],cwd=ROOT,capture_output=True).returncode:raise Failure("tmp output not ignored")
def execute(self_test=False):
    c=load(CONTRACT);v66=load(V66);v67=load(V67);validate(c,v66,v67);before=historical_manifest(c)
    first=run(FIRST,c,v66);repro=run(REPRO,c,v66)
    pairs={name:[object_sha(first[name]),object_sha(repro[name])] for name in ("persistence_interface.json","atomic_request_schema.json","atomic_result_schema.json","error_retry_matrix.json","readiness_matrix.json","validation.json")}
    if any(a!=b for a,b in pairs.values()):raise Failure("determinism mismatch")
    if historical_manifest(c)!=before:raise Failure("historical/provenance artifact mutation")
    safety();summary={"status":"passed" if self_test else "valid","provider_neutral":True,"local_adapter_readiness":c["future_local_disposable_persistence_adapter_readiness"],"production_persistence_readiness":"not_ready","sha256_pairs":pairs,"all_effect_counters_zero":True,"historical_artifacts_unchanged":True};print(json.dumps(summary,indent=2))
def main():
    p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");a=p.parse_args()
    try:execute(a.self_test)
    except (Failure,KeyError,ValueError,json.JSONDecodeError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
    return 0
if __name__=="__main__":raise SystemExit(main())
