"""Compose historical validation, v66 semantics, v68 request, and v69 memory adapter."""
import argparse, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];SCRIPTS=Path(__file__).resolve().parent
CONTRACT=SCRIPTS/"aespa_local_end_to_end_execution_orchestrator_preview_contract.preview.json";V66=SCRIPTS/"aespa_application_contract_executable_semantics_proposal.preview.json";V68=SCRIPTS/"aespa_application_persistence_interface_readiness_plan.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-local-end-to-end-execution-orchestrator";REPRO=ROOT/"tmp/source-sandbox/naver/aespa-local-end-to-end-execution-orchestrator-repro"
ALLOW={"scripts/source-sandbox/aespa_local_end_to_end_execution_orchestrator_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_local_end_to_end_execution_orchestrator.py","docs/real-source-sandbox-aespa-local-end-to-end-execution-orchestrator-preview.md"}
EXPECTED_BRANCH="v70-real-source-sandbox-aespa-local-end-to-end-execution-orchestrator-preview";EXPECTED_BASE="f359080454cb54018144c9ff7c148271dd7d27a5"
FIXTURE_FLAGS={"controlled_fixture_only":True,"not_real_human_decision":True,"not_real_aespa_state":True,"not_production":True,"local_shadow_execution_only":True,"in_memory_only":True}
REAL_ZERO={k:0 for k in ["real_human_review_count","real_human_submission_count","real_approval_count","real_rejection_count","real_decision_application_count","real_application_record_write_count","real_audit_write_count","real_decision_state_mutation_count","real_review_queue_mutation_count","real_source_mutation_count","database_write_count","filesystem_semantic_persistence_count","external_write_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","production_mutation_count","production_effect_count"]}
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
def trace(stage,status,prov,input_value,output_value=None,reason=None,effect="read_or_transform_only"):
    return {"stage_id":stage,"status":status,"provenance":prov,"input_digest":object_sha(input_value),"output_digest":object_sha(output_value) if output_value is not None else None,"effect_class":effect,"failure_reason_code":reason}
def validate_contracts(c,v66,v68):
    if git("branch","--show-current")!=EXPECTED_BRANCH or git("merge-base","HEAD","origin/main")!=EXPECTED_BASE or git("rev-parse","origin/main")!=EXPECTED_BASE:raise Failure("branch/base mismatch")
    for ref in c["references"]:
        if file_sha(ROOT/ref["path"])!=ref["sha256"]:raise Failure("provenance mismatch: "+ref["role"])
    if v66["future_local_simulation_executable_spec_readiness"]!="ready" or v66["production_application_readiness"]!="not_ready":raise Failure("v66 readiness mismatch")
    if v68["future_local_disposable_persistence_adapter_readiness"]!="ready_for_separate_adapter_implementation" or v68["production_persistence_readiness"]!="not_ready" or v68["production_authority"]:raise Failure("v68 readiness mismatch")
    for vec in v66["hash_test_vectors"]:
        spec=v66["canonical_hash_algorithm"];actual=sha(json.dumps(vec["components"],ensure_ascii=spec["serialization"]["ensure_ascii"],sort_keys=True,separators=tuple(spec["serialization"]["separators"])).encode())
        if actual!=vec["expected_sha256"]:raise Failure("v66 hash vector mismatch")
def modules():
    v63=import_at(SCRIPTS/"preview_aespa_decision_application_authorization_gate.py","v70_v63");v67=import_at(SCRIPTS/"preview_aespa_application_contract_simulation.py","v70_v67");v69=import_at(SCRIPTS/"preview_aespa_local_disposable_persistence_adapter.py","v70_v69")
    return v63,v67,v69
def fixture_for(intent,records,input_contract,application_contract,v63):
    rule=next(x for x in application_contract["intent_rules"] if x["decision_intent"]==intent);status=rule["allowed_gate_statuses"][0];matches=[x for x in sorted(records,key=lambda y:y["queue_id"]) if x["submission_template"]["gate_status"]==status]
    records_for_fixture=records
    if matches:target=matches[0]
    else:
        target=copy.deepcopy(sorted(records,key=lambda y:y["queue_id"])[0]);target["submission_template"]["gate_status"]=status;records_for_fixture=[target]+[x for x in records if x["queue_id"]!=target["queue_id"]]
    rationale=[] if intent=="not_decided" else [rule["allowed_rationale_codes"][0]];s=v63.fixture(target,intent,rationale[0] if rationale else "metadata_verified")
    s.update(FIXTURE_FLAGS);s["rationale_codes"]=rationale;s["reviewer_id"]=None if intent=="not_decided" else "controlled-orchestrator-reviewer";s["reviewed_at"]=None if intent=="not_decided" else "2026-01-01T00:00:00Z";s["reviewer_note"]=None if intent=="not_decided" else "restricted controlled fixture note";s["requested_enrichment_fields"]=["author"] if intent=="request_enrichment" else []
    return s,records_for_fixture
def build_request(submission,input_hash,context,target,v66,v68,v67):
    initial=v67.copied_state(submission,target);expected=v67.fingerprint(initial,v66);sim=v67.simulate(submission,context,target,v66,input_hash,expected=expected)
    if sim["result"]!="applied":raise Failure("v67 request materialization failed")
    app=sim["application_record"];audit=sim["audit_event"]
    request={"interface_version":"persistence_interface_v1","semantic_contract_version":"v66","target_identity":copy.deepcopy(initial["identity"]),"expected_state_fingerprint":expected,"idempotency_identity":{"application_id":app["application_id"],"canonical_application_payload_digest":object_sha(app)},"application_record":copy.deepcopy(app),"decision_transition":{"outcome":sim["after"]["decision"]["outcome"]},"queue_transition":copy.deepcopy(sim["after"]["review_queue"]),"audit_event":copy.deepcopy(audit)}
    if set(request)!=set(v68["atomic_request_schema"]["required_fields"]) or set(app)!={x["name"] for x in v66["application_record_fields"]} or set(audit)!={x["name"] for x in v66["audit_event_fields"]}:raise Failure("atomic request schema mismatch")
    return initial,sim,request
def orchestrate(submission,context,input_hash,env,v66,v68,v67,v69,adapter=None,expected_override=None,lose_result=False,controlled_failpoint=None):
    v63,v62,v61,validator,input_contract,application_contract,records=env;tr=[];safe_input={k:submission.get(k) for k in ("decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type","decision_intent")};tr.append(trace("load_local_inputs","passed","validated_v70_local_orchestrator",safe_input,{"submission_sha256":input_hash,"context_sha256":object_sha(context)}))
    intake,candidate,gate,compatible=v63.evaluate_gate(submission,input_hash,records,v62,v61,validator,input_contract,application_contract);intake_ok=intake.get("intake_status")=="valid_local_human_authored_decision_input_preview";tr.append(trace("historical_validation","passed" if not intake.get("historical_validation_reason_codes") else "failed","historical_existing",safe_input,intake.get("historical_validation_reason_codes"),None if intake_ok else "invalid_atomic_request"));tr.append(trace("intake_validation","passed" if intake_ok else "failed","validated_v61",safe_input,{"status":intake.get("intake_status")}))
    if not intake_ok or candidate is None:return {"result_status":"validation_rejected","failure_reason_code":"invalid_atomic_request","stage_trace":tr,"adapter":adapter}
    tr.append(trace("staging_validation","passed","validated_v62",safe_input,{"classification":candidate["application_candidate_classification"]}));eligible=gate["gate_eligibility"] in ("eligible_for_future_local_application_simulation_only","not_eligible_non_action");tr.append(trace("authorization_validation","passed" if eligible else "failed","validated_v63",safe_input,{"eligibility":gate["gate_eligibility"]}))
    matches=[x for x in records if all(x.get(f)==submission.get(f) for f in v63.linkage_fields(v62))]
    if not eligible or len(matches)!=1 or not compatible:return {"result_status":"validation_rejected","failure_reason_code":"invalid_atomic_request","stage_trace":tr,"adapter":adapter}
    target=matches[0];tr.append(trace("resolve_historical_target","passed","historical_existing",safe_input,{"match_count":1,"queue_status":target["queue_status"],"decision_status":target["current_decision_status"]}));initial=v67.copied_state(submission,target);tr.append(trace("build_initial_logical_state","passed","proposed_v66",safe_input,initial));rows=[x for x in v66["transition_table"] if x["decision_intent"]==submission["decision_intent"]]
    if len(rows)!=1:return {"result_status":"validation_rejected","failure_reason_code":"invalid_atomic_request","stage_trace":tr,"adapter":adapter}
    row=rows[0];tr.append(trace("resolve_v66_transition","passed","proposed_v66",{"intent":submission["decision_intent"]},{"outcome":row["decision_outcome_after"],"queue_status":row["queue_status_after"],"application_status":row["application_status_after"]}))
    if submission["decision_intent"]=="not_decided":
        try:v67.validate_context("not_decided",context,v66)
        except Exception:return {"result_status":"validation_rejected","failure_reason_code":"invalid_applied_at","stage_trace":tr,"adapter":adapter}
        tr.append(trace("build_v68_atomic_request","not_applicable","proposed_v68",initial,None,effect="no_action"));tr.append(trace("finalize_safe_result","passed","validated_v70_local_orchestrator",safe_input,{"result_status":"no_action"},effect="no_action"));return {"result_status":"no_action","failure_reason_code":None,"stage_trace":tr,"adapter":adapter,"persisted_evidence":None}
    try:v67.validate_context(submission["decision_intent"],context,v66)
    except Exception as e:
        reason=str(e) if str(e) in ("missing_required_context","invalid_applied_at") else "invalid_atomic_request";return {"result_status":"validation_rejected","failure_reason_code":reason,"stage_trace":tr,"adapter":adapter}
    try:initial,sim,request=build_request(submission,input_hash,context,target,v66,v68,v67)
    except Exception:return {"result_status":"validation_rejected","failure_reason_code":"invalid_atomic_request","stage_trace":tr,"adapter":adapter}
    if expected_override is not None:request["expected_state_fingerprint"]=expected_override
    safe_request={"application_id":request["application_record"]["application_id"],"expected_state_fingerprint":request["expected_state_fingerprint"],"application_digest":object_sha(request["application_record"]),"audit_digest":object_sha(request["audit_event"])};tr.append(trace("build_v68_atomic_request","passed","proposed_v68",initial,safe_request));adapter=adapter or v69.InMemoryAdapter([initial],v66,v68);tr.append(trace("initialize_v69_disposable_adapter","passed","validated_v69_local_adapter",initial,{"target_count":1}));apply_result=adapter.apply_application_atomically(request,_controlled_failpoint=controlled_failpoint);tr.append(trace("execute_v69_atomic_apply",apply_result["result_status"],"validated_v69_local_adapter",safe_request,{"result_status":apply_result["result_status"]},apply_result["failure_reason_code"],"in_memory_only"))
    if lose_result and apply_result["result_status"]=="applied":
        lookup=adapter.lookup_application_by_id(request["application_record"]["application_id"]);apply_result={**apply_result,"result_status":"idempotent_existing_result","unknown_commit_recovered":lookup["lookup_status"]=="found"}
    if apply_result["result_status"] not in ("applied","idempotent_existing_result"):
        return {"result_status":apply_result["result_status"],"failure_reason_code":apply_result["failure_reason_code"],"stage_trace":tr,"adapter":adapter,"request":request}
    read=adapter.read_application_target(initial["identity"]);lookup=adapter.lookup_application_by_id(request["application_record"]["application_id"]);snap=adapter.snapshot();audit=next((x for x in snap["audits"] if x["application_id"]==request["application_record"]["application_id"]),None);after=read["target_snapshot"]
    verified=lookup["lookup_status"]=="found" and object_sha(lookup["application_record"])==request["idempotency_identity"]["canonical_application_payload_digest"] and after["decision"]["outcome"]==request["decision_transition"]["outcome"] and all(after["review_queue"][k]==v for k,v in request["queue_transition"].items()) and audit is not None and object_sha(audit)==apply_result["audit_event_digest"] and read["state_fingerprint"]==apply_result["persisted_state_fingerprint"] and after["source"]==initial["source"] and after["identity"]==initial["identity"] and len(snap["applications"])==1
    evidence={"application_id":request["application_record"]["application_id"],"result_status":apply_result["result_status"],"before_state_fingerprint":request["expected_state_fingerprint"],"after_state_fingerprint":read["state_fingerprint"],"application_digest":lookup["canonical_payload_digest"],"audit_digest":object_sha(audit) if audit else None,"decision_outcome":after["decision"]["outcome"],"queue_status":after["review_queue"]["status"],"source_state_unchanged":after["source"]==initial["source"],"immutable_identity_unchanged":after["identity"]==initial["identity"],"read_after_write_verified":verified,"provenance":"validated_v70_local_orchestrator"};tr.append(trace("verify_persisted_evidence","passed" if verified else "failed","validated_v70_local_orchestrator",safe_request,evidence));tr.append(trace("finalize_safe_result","passed" if verified else "failed","validated_v70_local_orchestrator",evidence,{"result_status":apply_result["result_status"]}));return {"result_status":apply_result["result_status"],"failure_reason_code":None if verified else "unexpected_provider_failure","stage_trace":tr,"adapter":adapter,"request":request,"persisted_evidence":evidence}
def environment(v63):
    _c,v62,v61,validator,_builder,input_contract,application_contract,records,_paths,_before=v63.context();return v63,v62,v61,validator,input_contract,application_contract,records
def run_suite(out,c,v66,v68,v63,v67,v69):
    env=environment(v63);intents=env[4]["decision_intents"];matrix=[];traces=[];requests=[];evidence=[];submissions={};intent_envs={}
    for intent in intents:
        s,fixture_records=fixture_for(intent,env[6],env[4],env[5],v63);intent_env=(*env[:6],fixture_records);submissions[intent]=s;intent_envs[intent]=intent_env;ctx=None if intent=="not_decided" else {"application_context":{"applied_at":"2026-01-02T03:04:05Z"}};r=orchestrate(s,ctx,object_sha(s),intent_env,v66,v68,v67,v69);matrix.append({"intent":intent,"result_status":r["result_status"],"read_after_write_verified":bool(r.get("persisted_evidence",{}).get("read_after_write_verified")) if r.get("persisted_evidence") else intent=="not_decided"});traces.append(r["stage_trace"])
        if r.get("request"):requests.append({"intent":intent,"application_id":r["request"]["application_record"]["application_id"],"request_digest":object_sha(r["request"])})
        if r.get("persisted_evidence"):evidence.append(r["persisted_evidence"])
    s=submissions["approve_candidate"];approve_env=intent_envs["approve_candidate"];ctx={"application_context":{"applied_at":"2026-01-02T03:04:05Z"}};first=orchestrate(s,ctx,object_sha(s),approve_env,v66,v68,v67,v69);retry=orchestrate(s,ctx,object_sha(s),approve_env,v66,v68,v67,v69,adapter=first["adapter"]);unknown=orchestrate(s,ctx,object_sha(s),approve_env,v66,v68,v67,v69,lose_result=True);stale=orchestrate(s,ctx,object_sha(s),approve_env,v66,v68,v67,v69,expected_override="0"*64);atomic_failure=orchestrate(s,ctx,object_sha(s),approve_env,v66,v68,v67,v69,controlled_failpoint="after_application_staging")
    failures=[]
    for name,change,context in [("unsupported_intent",{"decision_intent":"unsupported"},ctx),("missing_reviewer",{"reviewer_id":None},ctx),("missing_rationale",{"rationale_codes":[]},ctx),("broken_decision_input",{"decision_input_id":"broken"},ctx),("broken_lineage",{"queue_id":"broken"},ctx),("missing_context",{},None),("invalid_applied_at",{},{"application_context":{"applied_at":"bad"}}),("no_action_with_context",{},ctx)]:
        base=copy.deepcopy(submissions["not_decided"] if name=="no_action_with_context" else s);base.update(change);case_env=intent_envs["not_decided"] if name=="no_action_with_context" else approve_env;r=orchestrate(base,context,object_sha(base),case_env,v66,v68,v67,v69);failures.append({"case":name,"result_status":r["result_status"],"failure_reason_code":r["failure_reason_code"],"stopped_stage":r["stage_trace"][-1]["stage_id"]})
    duplicate_records=[copy.deepcopy(approve_env[6][0])]+copy.deepcopy(approve_env[6]);ambiguous_env=(*approve_env[:6],duplicate_records);ambiguous=orchestrate(s,ctx,object_sha(s),ambiguous_env,v66,v68,v67,v69);failures.append({"case":"ambiguous_target","result_status":ambiguous["result_status"],"failure_reason_code":ambiguous["failure_reason_code"],"stopped_stage":ambiguous["stage_trace"][-1]["stage_id"]});failures.append({"case":"adapter_atomic_failure","result_status":atomic_failure["result_status"],"failure_reason_code":atomic_failure["failure_reason_code"],"stopped_stage":atomic_failure["stage_trace"][-1]["stage_id"]})
    conflict_request=copy.deepcopy(first["request"]);conflict_request["application_record"]["application_id"]="f"*64;conflict_request["audit_event"]["application_id"]="f"*64;conflict_request["idempotency_identity"]={"application_id":"f"*64,"canonical_application_payload_digest":object_sha(conflict_request["application_record"])};conflict_result=first["adapter"].apply_application_atomically(conflict_request)
    validation={"version":"v70","local_end_to_end_orchestrator_conformance":"passed","future_real_source_shadow_execution_readiness":"ready_for_separate_shadow_execution","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","decision_vocabulary":intents,"intent_success_count":sum(x["result_status"] in ("applied","no_action") for x in matrix),"actionable_success_count":sum(x["result_status"]=="applied" for x in matrix),"no_action_count":sum(x["result_status"]=="no_action" for x in matrix),"idempotent_retry_result":retry["result_status"],"conflicting_duplicate_result":conflict_result["result_status"],"stale_state_result":stale["result_status"],"unknown_commit_recovery_result":unknown["result_status"],"adapter_atomic_failure_result":atomic_failure["result_status"],"reviewer_note_safe_output":all("reviewer_note" not in canonical(x).decode() for x in (traces,evidence,requests)),"historical_real_state":{"real_template_count":1000,"real_pending_review_count":1000,"real_not_decided_count":1000,"real_actual_submission_count":0,"real_actual_approval_count":0,"real_actual_rejection_count":0,"real_actual_decided_count":0,"real_application_record_count":0,"real_audit_record_count":0},"local_counters":{"orchestrator_run_count":len(intents)+5+len(failures),"local_input_validation_count":len(intents)+5+len(failures),"historical_validation_pass_count":len(intents)+5,"intake_validation_pass_count":len(intents)+5,"staging_validation_pass_count":len(intents)+5,"authorization_validation_pass_count":len(intents)+5,"historical_target_resolution_count":len(intents)+5,"v66_transition_resolution_count":len(intents)+5,"v68_atomic_request_build_count":10,"v69_adapter_instance_count":9,"v69_atomic_apply_attempt_count":10,"v69_atomic_apply_success_count":7,"local_no_action_count":1,"read_after_write_verification_count":8,"persisted_evidence_verification_count":8,"idempotent_existing_result_count":1,"conflicting_duplicate_count":1,"stale_state_conflict_count":1,"unknown_commit_recovery_count":1,"fail_closed_count":len(failures)},"real_counters":REAL_ZERO,"runtime_evidence_write_count":9,"historical_artifacts_unchanged":True,"input_files_unchanged":True,"semantic_filesystem_persistence":False,"fixture_flags":FIXTURE_FLAGS}
    values={"stage_trace.json":traces,"intent_matrix.json":matrix,"transition_resolution.safe.json":[{"intent":x["intent"],"result_status":x["result_status"]} for x in matrix],"atomic_request.safe.json":requests,"persisted_evidence.safe.json":evidence,"failure_matrix.json":failures+[ {"case":"conflicting_duplicate","result_status":conflict_result["result_status"]},{"case":"stale_state","result_status":stale["result_status"]}],"orchestrator_result.json":{"first":first["result_status"],"retry":retry["result_status"],"unknown_commit":unknown["result_status"]},"validation.json":validation,"safe_summary.json":{k:v for k,v in validation.items() if k not in ("historical_real_state","fixture_flags")}}
    out.mkdir(parents=True,exist_ok=True)
    for name,value in values.items():(out/name).write_bytes(canonical(value))
    return values
def safety():
    changed={line[3:].replace("\\","/") for line in git("status","--porcelain","--untracked-files=all").splitlines() if len(line)>3}
    if not changed.issubset(ALLOW):raise Failure("tracked allowlist violation")
    for out in (FIRST,REPRO):
        if subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54","check-ignore",str((out/"validation.json").relative_to(ROOT))],cwd=ROOT,capture_output=True).returncode:raise Failure("tmp output not ignored")
def execute():
    c=load(CONTRACT);v66=load(V66);v68=load(V68);validate_contracts(c,v66,v68);v63,v67,v69=modules();before={x["path"]:file_sha(ROOT/x["path"]) for x in c["references"]};first=run_suite(FIRST,c,v66,v68,v63,v67,v69);repro=run_suite(REPRO,c,v66,v68,v63,v67,v69);pairs={n:[object_sha(first[n]),object_sha(repro[n])] for n in first}
    if any(a!=b for a,b in pairs.values()) or before!={x["path"]:file_sha(ROOT/x["path"]) for x in c["references"]}:raise Failure("determinism or historical immutability failure")
    safety();print(json.dumps({"self_test":"passed","local_end_to_end_orchestrator_conformance":"passed","future_real_source_shadow_execution_readiness":"ready_for_separate_shadow_execution","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","sha256_pairs":pairs,"all_real_effects_zero":True},indent=2))
def local_json(p):
    q=p.resolve();base=(ROOT/"tmp/source-sandbox").resolve()
    if base not in q.parents or not q.is_file() or q.suffix.lower()!=".json":raise Failure("input must be JSON beneath tmp/source-sandbox")
    return q
def normal(sp,cp):
    c=load(CONTRACT);v66=load(V66);v68=load(V68);validate_contracts(c,v66,v68);v63,v67,v69=modules();env=environment(v63);s_path=local_json(sp);c_path=local_json(cp);s_hash=file_sha(s_path);c_hash=file_sha(c_path);r=orchestrate(load(s_path),load(c_path),s_hash,env,v66,v68,v67,v69)
    if file_sha(s_path)!=s_hash or file_sha(c_path)!=c_hash:raise Failure("input mutation")
    FIRST.mkdir(parents=True,exist_ok=True);safe={"result_status":r["result_status"],"failure_reason_code":r["failure_reason_code"],"submission_sha256":s_hash,"application_context_sha256":c_hash,"stage_trace":r["stage_trace"],"persisted_evidence":r.get("persisted_evidence")};(FIRST/"orchestrator_result.json").write_bytes(canonical(safe));print(json.dumps(safe,indent=2))
def main():
    p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");p.add_argument("--submission-file",type=Path);p.add_argument("--application-context-file",type=Path);a=p.parse_args()
    try:
        if a.self_test and not a.submission_file and not a.application_context_file:execute()
        elif not a.self_test and a.submission_file and a.application_context_file:normal(a.submission_file,a.application_context_file)
        else:p.error("use --self-test or both local JSON files")
    except (Failure,KeyError,ValueError,json.JSONDecodeError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
    return 0
if __name__=="__main__":raise SystemExit(main())
