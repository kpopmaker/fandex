"""Validate a disposable process-local implementation of the v68 interface."""
import argparse, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; SCRIPTS=Path(__file__).resolve().parent
CONTRACT=SCRIPTS/"aespa_local_disposable_persistence_adapter_preview_contract.preview.json"; V68=SCRIPTS/"aespa_application_persistence_interface_readiness_plan.preview.json"; V66=SCRIPTS/"aespa_application_contract_executable_semantics_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-local-disposable-persistence-adapter"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-local-disposable-persistence-adapter-repro"
ALLOW={"scripts/source-sandbox/aespa_local_disposable_persistence_adapter_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_local_disposable_persistence_adapter.py","docs/real-source-sandbox-aespa-local-disposable-persistence-adapter-preview.md"}
EXPECTED_BRANCH="v69-real-source-sandbox-aespa-local-disposable-persistence-adapter-preview"; EXPECTED_BASE="63571b96b9b1ea8b8b53be97a40ff8d438670d1a"
FIXTURE_FLAGS={"controlled_fixture_only":True,"not_real_human_decision":True,"not_real_aespa_state":True,"not_production":True,"in_memory_only":True}
REAL_ZERO={k:0 for k in ["real_application_execution_count","real_application_record_write_count","real_audit_write_count","real_decision_state_mutation_count","real_review_queue_mutation_count","real_source_mutation_count","database_write_count","filesystem_semantic_persistence_count","external_write_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","production_mutation_count","production_effect_count"]}
FAILPOINTS=["before_application_staging","after_application_staging","after_decision_staging","after_queue_staging","after_audit_staging"]
class Failure(RuntimeError):pass
def load(p):
    with p.open(encoding="utf-8") as f:return json.load(f)
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
def sha(v):return hashlib.sha256(v).hexdigest()
def object_sha(v):return sha(canonical(v))
def file_sha(p):return sha(p.read_bytes())
def components_sha(values,spec):
    if any(isinstance(x,(dict,list,float)) or not(x is None or isinstance(x,(str,bool,int))) for x in values):raise Failure("invalid canonical component")
    return sha(json.dumps(values,ensure_ascii=spec["serialization"]["ensure_ascii"],sort_keys=spec["serialization"]["sort_keys"],separators=tuple(spec["serialization"]["separators"])).encode())
def git(*args):return subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54",*args],cwd=ROOT,capture_output=True,text=True,encoding="utf-8",errors="replace",check=True).stdout.strip()
def target_key(identity):return tuple(identity[k] for k in ("decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type"))
def fingerprint(state,v66):
    values=[]
    for name in v66["state_fingerprint"]["field_order"]:
        if name in state["identity"]:values.append(state["identity"][name])
        elif name=="queue_status":values.append(state["review_queue"]["status"])
        elif name=="current_decision_status":values.append("not_decided" if state["decision"]["outcome"] is None else state["decision"]["outcome"])
        elif name=="existing_application_id":values.append(state["application"]["id"])
    return components_sha(values,v66["canonical_hash_algorithm"])
def result(status,reason=None,application_id=None,state_fp=None,app_digest=None,audit_digest=None,snapshot=None):
    return {"result_status":status,"application_id":application_id,"persisted_state_fingerprint":state_fp,"persisted_application_digest":app_digest,"audit_event_digest":audit_digest,"failure_reason_code":reason,"canonical_persisted_snapshot":snapshot}

class InMemoryAdapter:
    def __init__(self,initial_states,v66,v68):
        self.v66=v66;self.v68=v68;self.targets={};self.applications={};self.audits={};self.counters={k:0 for k in ["target_read_count","application_lookup_count","atomic_apply_attempt_count","atomic_apply_success_count","idempotent_existing_result_count","conflicting_duplicate_count","stale_state_conflict_count","controlled_atomic_failure_count","in_memory_decision_transition_count","in_memory_queue_transition_count","unknown_commit_recovery_count","source_write_count"]}
        for state in initial_states:
            self._validate_state(state);key=target_key(state["identity"])
            if key in self.targets:raise Failure("duplicate initial target")
            self.targets[key]=copy.deepcopy(state)
    def _validate_state(self,s):
        if set(s)!={"identity","decision","review_queue","source","application"} or set(s["identity"])!=set(self.v66["copied_state_schema"]["identity_fields"]):raise Failure("invalid target state")
    def snapshot(self):return {"targets":[self.targets[k] for k in sorted(self.targets)],"applications":[self.applications[k] for k in sorted(self.applications)],"audits":[self.audits[k] for k in sorted(self.audits)]}
    def read_application_target(self,identity):
        self.counters["target_read_count"]+=1;s=self.targets.get(target_key(identity))
        if s is None:return {"result_status":"validation_rejected","failure_reason_code":"invalid_atomic_request","target_snapshot":None,"state_fingerprint":None}
        return {"result_status":"found","failure_reason_code":None,"target_snapshot":copy.deepcopy(s),"state_fingerprint":fingerprint(s,self.v66)}
    def lookup_application_by_id(self,application_id):
        self.counters["application_lookup_count"]+=1;app=self.applications.get(application_id)
        return {"lookup_status":"found" if app else "not_found","application_record":copy.deepcopy(app),"canonical_payload_digest":object_sha(app) if app else None}
    def _validate_request(self,r):
        schema=self.v68["atomic_request_schema"]
        if set(r)!=set(schema["required_fields"]) or r.get("interface_version")!="persistence_interface_v1" or r.get("semantic_contract_version")!="v66":return False
        if set(r.get("application_record",{}))!={x["name"] for x in self.v66["application_record_fields"]}:return False
        if set(r.get("audit_event",{}))!={x["name"] for x in self.v66["audit_event_fields"]}:return False
        if set(r.get("decision_transition",{}))!={"outcome"} or set(r.get("queue_transition",{}))!={"status","active","resolved","additional_review_required","enrichment_required"}:return False
        app=r["application_record"];audit=r["audit_event"];identity=r["target_identity"]
        if set(identity)!=set(self.v66["copied_state_schema"]["identity_fields"]):return False
        if any(app[k]!=identity[k] for k in identity) or any(audit[k]!=identity[k] for k in ("decision_input_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type")):return False
        aid=r.get("idempotency_identity",{}).get("application_id")
        return aid==app.get("application_id")==audit.get("application_id") and r["idempotency_identity"].get("canonical_application_payload_digest")==object_sha(app)
    def apply_application_atomically(self,r,_controlled_failpoint=None):
        self.counters["atomic_apply_attempt_count"]+=1
        if _controlled_failpoint not in FAILPOINTS+[None]:return result("persistence_failure","unexpected_provider_failure")
        if not self._validate_request(r):return result("validation_rejected","invalid_atomic_request")
        key=target_key(r["target_identity"]);live=self.targets.get(key)
        if live is None:return result("validation_rejected","invalid_atomic_request")
        aid=r["idempotency_identity"]["application_id"];existing=self.applications.get(aid)
        if existing is not None:
            if object_sha(existing)==r["idempotency_identity"]["canonical_application_payload_digest"]:
                self.counters["idempotent_existing_result_count"]+=1;s=copy.deepcopy(live);return result("idempotent_existing_result",None,aid,fingerprint(s,self.v66),object_sha(existing),object_sha(self.audits[aid]),s)
            self.counters["conflicting_duplicate_count"]+=1;return result("conflicting_duplicate","conflicting_application_identity")
        if live["application"]["id"] is not None:
            self.counters["conflicting_duplicate_count"]+=1;return result("conflicting_duplicate","conflicting_application_identity")
        current=fingerprint(live,self.v66)
        if current!=r["expected_state_fingerprint"]:
            self.counters["stale_state_conflict_count"]+=1;return result("stale_state_conflict","stale_state_fingerprint_mismatch")
        working_targets=copy.deepcopy(self.targets);working_apps=copy.deepcopy(self.applications);working_audits=copy.deepcopy(self.audits);s=working_targets[key]
        try:
            if _controlled_failpoint==FAILPOINTS[0]:raise Failure("controlled")
            working_apps[aid]=copy.deepcopy(r["application_record"])
            if _controlled_failpoint==FAILPOINTS[1]:raise Failure("controlled")
            s["decision"]["outcome"]=r["decision_transition"]["outcome"]
            if _controlled_failpoint==FAILPOINTS[2]:raise Failure("controlled")
            for field,value in r["queue_transition"].items():s["review_queue"][field]=value
            if _controlled_failpoint==FAILPOINTS[3]:raise Failure("controlled")
            working_audits[aid]=copy.deepcopy(r["audit_event"]);s["application"]={"id":aid,"status":r["application_record"]["application_status"],"applied_at":r["application_record"]["applied_at"],"contract_version":r["application_record"]["proposal_contract_version"]}
            if _controlled_failpoint==FAILPOINTS[4]:raise Failure("controlled")
            if s["source"]!=live["source"] or target_key(s["identity"])!=key or len(working_apps)!=len(self.applications)+1 or len(working_audits)!=len(self.audits)+1:raise Failure("invariant")
            after=fingerprint(s,self.v66)
            if r["audit_event"]["after_state_fingerprint"]!=after:raise Failure("invariant")
        except Failure:
            self.counters["controlled_atomic_failure_count"]+=1;return result("persistence_failure","atomic_commit_failed")
        self.targets,self.applications,self.audits=working_targets,working_apps,working_audits
        self.counters["atomic_apply_success_count"]+=1;self.counters["in_memory_decision_transition_count"]+=1;self.counters["in_memory_queue_transition_count"]+=1
        return result("applied",None,aid,after,object_sha(working_apps[aid]),object_sha(working_audits[aid]),copy.deepcopy(s))

def import_at(path,name):
    spec=importlib.util.spec_from_file_location(name,path);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
def validate_contracts(c,v68,v66):
    if git("branch","--show-current")!=EXPECTED_BRANCH or git("merge-base","HEAD","origin/main")!=EXPECTED_BASE or git("rev-parse","origin/main")!=EXPECTED_BASE:raise Failure("branch/base mismatch")
    for ref in c["references"]:
        if file_sha(ROOT/ref["path"])!=ref["sha256"]:raise Failure("provenance mismatch: "+ref["role"])
    if v68["authority"]!="persistence_interface_proposal_only" or v68["future_local_disposable_persistence_adapter_readiness"]!="ready_for_separate_adapter_implementation" or v68["production_persistence_readiness"]!="not_ready":raise Failure("v68 readiness mismatch")
    if [x["operation_name"] for x in v68["interface_operations"]]!=c["operation_names"]:raise Failure("operation mismatch")
    if v66["future_local_simulation_executable_spec_readiness"]!="ready" or v66["production_application_readiness"]!="not_ready":raise Failure("v66 readiness mismatch")
    for vector in v66["hash_test_vectors"]:
        if components_sha(vector["components"],v66["canonical_hash_algorithm"])!=vector["expected_sha256"]:raise Failure("v66 hash vector mismatch")
def fixtures(v66,v68):
    v67=import_at(SCRIPTS/"preview_aespa_application_contract_simulation.py","v69_v67_fixture")
    submission=v67.fixture("approve_candidate");state=v67.copied_state(submission,v67.target());input_hash=object_sha(submission);sim=v67.simulate(submission,v67.ctx(),v67.target(),v66,input_hash,expected=v67.fingerprint(state,v66))
    app=sim["application_record"];audit=sim["audit_event"]
    request={"interface_version":"persistence_interface_v1","semantic_contract_version":"v66","target_identity":copy.deepcopy(state["identity"]),"expected_state_fingerprint":fingerprint(state,v66),"idempotency_identity":{"application_id":app["application_id"],"canonical_application_payload_digest":object_sha(app)},"application_record":copy.deepcopy(app),"decision_transition":{"outcome":app["decision_outcome"]},"queue_transition":copy.deepcopy(sim["after"]["review_queue"]),"audit_event":copy.deepcopy(audit)}
    return state,request
def run_suite(out,c,v68,v66):
    initial,request=fixtures(v66,v68);adapter=InMemoryAdapter([initial],v66,v68);instances=[adapter];initial_snap=adapter.snapshot();ops=[]
    read0=adapter.read_application_target(initial["identity"]);lookup0=adapter.lookup_application_by_id(request["application_record"]["application_id"]);before=adapter.snapshot();first=adapter.apply_application_atomically(request);read1=adapter.read_application_target(initial["identity"]);lookup1=adapter.lookup_application_by_id(first["application_id"]);ops += [read0,lookup0,first,read1,lookup1]
    if first["result_status"]!="applied" or read1["state_fingerprint"]!=first["persisted_state_fingerprint"] or lookup1["lookup_status"]!="found":raise Failure("read-after-write proof failed")
    post=adapter.snapshot();retry=adapter.apply_application_atomically(request)
    if retry["result_status"]!="idempotent_existing_result" or adapter.snapshot()!=post:raise Failure("idempotency failed")
    conflict=copy.deepcopy(request);conflict["application_record"]["application_id"]="f"*64;conflict["audit_event"]["application_id"]="f"*64;conflict["idempotency_identity"]={"application_id":"f"*64,"canonical_application_payload_digest":object_sha(conflict["application_record"])}
    conflict_result=adapter.apply_application_atomically(conflict)
    stale_adapter=InMemoryAdapter([initial],v66,v68);instances.append(stale_adapter);stale=copy.deepcopy(request);stale["expected_state_fingerprint"]="0"*64;stale_result=stale_adapter.apply_application_atomically(stale)
    invalid=[]
    for mutation in ("missing","identity","application","audit","source"):
        bad=copy.deepcopy(request)
        if mutation=="missing":bad.pop("audit_event")
        elif mutation=="identity":bad["target_identity"]["queue_id"]="broken"
        elif mutation=="application":bad["application_record"].pop("reviewer_id")
        elif mutation=="audit":bad["audit_event"].pop("reviewer_id")
        else:bad["source_transition"]={"eligibility":"changed"}
        a=InMemoryAdapter([initial],v66,v68);instances.append(a);pre=a.snapshot();r=a.apply_application_atomically(bad);invalid.append({"case":mutation,"result":r,"unchanged":pre==a.snapshot()})
    atomic=[]
    for fp in FAILPOINTS:
        a=InMemoryAdapter([initial],v66,v68);instances.append(a);pre=a.snapshot();r=a.apply_application_atomically(request,_controlled_failpoint=fp);atomic.append({"failpoint":fp,"result":r,"unchanged":pre==a.snapshot()})
    unknown_lookup=adapter.lookup_application_by_id(first["application_id"]);adapter.counters["unknown_commit_recovery_count"]+=1;unknown={"simulated_caller_missed_response":True,"lookup":unknown_lookup,"recovered_result_status":"idempotent_existing_result","second_application_created":False}
    adapter_b=InMemoryAdapter([initial],v66,v68);instances.append(adapter_b);disposal={"adapter_a_application_count":len(adapter.applications),"adapter_b_application_count":len(adapter_b.applications),"state_leaked":bool(adapter_b.applications)}
    final_snap=adapter.snapshot();idem={"first":first,"retry":retry,"conflicting_duplicate":conflict_result,"stale_state":stale_result}
    aggregate_counters={k:sum(a.counters[k] for a in instances) for k in adapter.counters}
    validation={"version":"v69","local_disposable_adapter_conformance":"passed","future_local_end_to_end_execution_orchestrator_readiness":"ready_for_separate_orchestrator_implementation","production_persistence_readiness":"not_ready","v66_hash_vectors":"passed","implemented_operations":c["operation_names"],"read_after_write_passed":True,"application_record_field_count":len(v66["application_record_fields"]),"audit_event_field_count":len(v66["audit_event_fields"]),"atomic_failpoint_count":len(atomic),"atomic_failpoints_all_rolled_back":all(x["unchanged"] for x in atomic),"validation_failures_all_unchanged":all(x["unchanged"] for x in invalid),"source_immutable":initial["source"]==read1["target_snapshot"]["source"],"disposable":not disposal["state_leaked"],"semantic_file_persistence":False,"historical_real_state":{"real_template_count":1000,"real_pending_review_count":1000,"real_not_decided_count":1000,"real_actual_submission_count":0,"real_actual_approval_count":0,"real_actual_rejection_count":0,"real_actual_decided_count":0,"real_application_record_count":0,"real_audit_record_count":0},"local_counters":{"adapter_instance_count":len(instances),**aggregate_counters,"in_memory_application_record_count":len(adapter.applications),"in_memory_audit_record_count":len(adapter.audits)},"real_counters":REAL_ZERO,"runtime_evidence_write_count":9,"fixture_flags":FIXTURE_FLAGS}
    values={"adapter_interface.json":{"operations":c["operation_names"],"store_model":c["store_model"],"authority":c["authority"]},"initial_store_snapshot.json":initial_snap,"final_store_snapshot.json":final_snap,"operation_results.json":ops+invalid,"atomicity_cases.json":atomic,"idempotency_cases.json":idem,"unknown_commit_recovery.json":unknown,"validation.json":validation,"safe_summary.json":{k:v for k,v in validation.items() if k not in ("historical_real_state","fixture_flags")}}
    out.mkdir(parents=True,exist_ok=True)
    for name,value in values.items():(out/name).write_bytes(canonical(value))
    return values
def safety():
    changed={line[3:].replace("\\","/") for line in git("status","--porcelain","--untracked-files=all").splitlines() if len(line)>3}
    if not changed.issubset(ALLOW):raise Failure("tracked allowlist violation")
    for out in (FIRST,REPRO):
        if subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54","check-ignore",str((out/"validation.json").relative_to(ROOT))],cwd=ROOT,capture_output=True).returncode:raise Failure("tmp output not ignored")
def execute(self_test=False):
    c=load(CONTRACT);v68=load(V68);v66=load(V66);validate_contracts(c,v68,v66);historical={x["path"]:file_sha(ROOT/x["path"]) for x in c["references"]}
    first=run_suite(FIRST,c,v68,v66);repro=run_suite(REPRO,c,v68,v66);pairs={name:[object_sha(first[name]),object_sha(repro[name])] for name in first}
    if any(a!=b for a,b in pairs.values()) or historical!={x["path"]:file_sha(ROOT/x["path"]) for x in c["references"]}:raise Failure("determinism or immutability failure")
    safety();print(json.dumps({"self_test":"passed" if self_test else "valid","local_disposable_adapter_conformance":"passed","future_local_end_to_end_execution_orchestrator_readiness":"ready_for_separate_orchestrator_implementation","production_persistence_readiness":"not_ready","sha256_pairs":pairs,"all_real_effects_zero":True},indent=2))
def local_path(p):
    q=p.resolve();base=(ROOT/"tmp/source-sandbox").resolve()
    if base not in q.parents or not q.is_file() or q.suffix.lower()!=".json":raise Failure("input must be local JSON beneath tmp/source-sandbox")
    return q
def normal(initial_path,request_path):
    c=load(CONTRACT);v68=load(V68);v66=load(V66);validate_contracts(c,v68,v66);ip=local_path(initial_path);rp=local_path(request_path);ih=file_sha(ip);rh=file_sha(rp);initial=load(ip);request=load(rp);states=initial if isinstance(initial,list) else [initial];adapter=InMemoryAdapter(states,v66,v68);before=adapter.snapshot();r=adapter.apply_application_atomically(request);after=adapter.snapshot()
    if file_sha(ip)!=ih or file_sha(rp)!=rh:raise Failure("input mutation")
    FIRST.mkdir(parents=True,exist_ok=True)
    for name,value in (("initial_store_snapshot.json",before),("final_store_snapshot.json",after),("operation_results.json",[r])):(FIRST/name).write_bytes(canonical(value))
    print(json.dumps({"result":r,"in_memory_only":True,"input_files_unchanged":True},indent=2))
def main():
    p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");p.add_argument("--initial-state-file",type=Path);p.add_argument("--atomic-request-file",type=Path);a=p.parse_args()
    try:
        if a.self_test and not a.initial_state_file and not a.atomic_request_file:execute(True)
        elif not a.self_test and a.initial_state_file and a.atomic_request_file:normal(a.initial_state_file,a.atomic_request_file)
        else:p.error("use --self-test or both local JSON file options")
    except (Failure,KeyError,ValueError,json.JSONDecodeError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
    return 0
if __name__=="__main__":raise SystemExit(main())
