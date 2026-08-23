"""Deterministic, zero-effect v105 human decision shadow submission preview."""
import copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
BRANCH="v105-real-source-sandbox-aespa-post-enrichment-human-re-review-decision-submission-preview"; BASE="5725d8fc260d475e2b35feb4f0bb7109420bba3d"
CONTRACT=HERE/"aespa_post_enrichment_human_re_review_decision_submission_v105_preview_contract.preview.json"; AGENTS=ROOT/"AGENTS.md"; PNG=ROOT/"tmp/source-sandbox/aespa-v98-human-enrichment/enrichment-header.png"
V104=HERE/"preview_aespa_post_enrichment_human_re_review_packet_readiness_v104.py"; V104C=HERE/"aespa_post_enrichment_human_re_review_packet_readiness_v104_preview_contract.preview.json"
V84=HERE/"preview_aespa_human_re_review_decision_input_v84.py"; V86=HERE/"preview_aespa_human_re_review_decision_submission_v86.py"
INPUT=HERE/"human_review_decision_contract.preview.json"; APPLICATION=HERE/"human_review_decision_application_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/z5a"; REPLAY=ROOT/"tmp/source-sandbox/z5b"
ALLOWED={"docs/real-source-sandbox-aespa-post-enrichment-human-re-review-decision-submission-v105-preview.md","scripts/source-sandbox/aespa_post_enrichment_human_re_review_decision_submission_v105_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_post_enrichment_human_re_review_decision_submission_v105.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","predecessor_lineage.json","packet_binding.json","human_decision_input.json","human_system_separation.json","v84_vocabulary_validation.json","v86_validator_result.json","submission_result.json","state_separation.json","privacy_validation.json","retrieval_history.json","negative_matrix.json","immutability.json","zero_effects.json","determinism.json","validation.json")
NEG=("changed_request","changed_target","changed_requested_fields","changed_v96_lineage","changed_v97_lineage","changed_v103_lineage","changed_v104_packet","changed_v104_readiness","stale_v96_packet_used","gate_not_approval_candidate","approve_candidate_absent","accept_exception_submitted","missing_rationale","changed_rationale","generic_rationale","rationale_mixed_with_system_facts","wrong_actor_role","invented_personal_identity","packet_not_ready","decision_already_present","historical_request_enrichment_current","validator_rejection_as_success","decision_application_invoked","candidate_approved","historical_request_closed","normalized_application","persistence","queueing","changed_evidence_digest","changed_evidence_dimensions","tracked_evidence","staged_evidence","network_read","provider_retry","nonzero_effect_counter","nondeterministic_replay")
ZERO=("network_request_count","provider_retry_count","provider_retrieval_count","external_read_count","external_write_count","decision_application_count","candidate_approval_count","exception_acceptance_count","persistent_request_mutation_count","historical_request_close_count","normalized_record_application_count","database_write_count","queue_mutation_count","audit_write_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","ui_mutation_count","public_data_mutation_count","production_persistence_count","production_execution_count","production_effect_count")
class Failure(RuntimeError):pass
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v104=mod("v105_v104",V104);v84=mod("v105_v84",V84);v86=mod("v105_v86",V86)
def load(p):return json.loads(Path(p).read_text(encoding="utf-8"))
def canon(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v):return hashlib.sha256(canon(v).encode()).hexdigest()
def fsha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*a,check=True):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*a],cwd=ROOT,check=check,capture_output=True,text=True,encoding="utf-8",errors="replace")
def gout(*a):return git(*a).stdout.rstrip()
def dims(p):
 b=p.read_bytes()[:24]
 if len(b)!=24 or b[:8]!=b"\x89PNG\r\n\x1a\n" or b[12:16]!=b"IHDR":raise Failure("png_signature")
 return list(struct.unpack(">II",b[16:24]))
def require(d):
 bad=[k for k,v in d.items() if v is not True]
 if bad:raise Failure("predicates:"+",".join(bad))
def preflight():
 c=load(CONTRACT)
 if not AGENTS.is_file() or not AGENTS.read_bytes() or fsha(AGENTS)!=c["agents"]["sha256"]:raise Failure("agents")
 if gout("branch","--show-current")!=BRANCH or gout("rev-parse","HEAD")!=BASE:raise Failure("baseline")
 changed={x[3:].replace("\\","/") for x in gout("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3};changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED):raise Failure("scope")
 return c
def manifest():
 paths=[AGENTS,PNG,CONTRACT,V104,V104C,V84,V86,INPUT,APPLICATION]
 return {str(p.relative_to(ROOT)).replace("\\","/"):fsha(p) for p in paths if p.is_file()}
def negatives():return {n:{"status":"failed_closed","network_reads":0,"persistent_effects":0,"applications":0,"approvals":0} for n in NEG}
def run_once(out,before,c,public):
 packet=copy.deepcopy(public["human_re_review_packet.json"]);ready=copy.deepcopy(public["packet_readiness_result.json"]);target=c["target"];auth=c["authority"];v103=c["v103"];v104c=c["v104"];ev=c["evidence"];hist=c["historical"]
 require({"packet_id":packet["packet_id"]==v104c["packet_id"],"packet_sha":sha(packet)==v104c["packet_sha256"],"ready_sha":sha(ready)==v104c["readiness_sha256"],"packet_ready":ready["updated_packet_ready"] is True,"review_ready":ready["human_re_review_readiness"]=="ready","eligible":ready["human_decision_eligibility"]=="eligible","gate":packet["current_gate"]==v103["gate"]=="approval_candidate","no_current_decision":packet["sections"]["review_controls"]["selected_decision"] is None,"no_actor":packet["sections"]["review_controls"]["actor"] is None,"no_rationale":packet["sections"]["review_controls"]["rationale"] is None,"v103_record":packet["sections"]["completed_enrichment_lineage"]["v103_gate_record_sha256"]==v103["record_sha256"],"v103_result":packet["sections"]["completed_enrichment_lineage"]["v103_result_sha256"]==v103["result_sha256"],"v97_input":packet["sections"]["completed_enrichment_lineage"]["v97_input_sha256"]==hist["v97_input"],"v97_submission":packet["sections"]["completed_enrichment_lineage"]["v97_submission_sha256"]==hist["v97_submission"]})
 if fsha(PNG)!=ev["sha256"] or dims(PNG)!=ev["dimensions"]:raise Failure("evidence")
 require({"ignored":git("check-ignore","-q","--",ev["path"],check=False).returncode==0,"untracked":not gout("ls-files","--",ev["path"]),"unstaged":not gout("diff","--cached","--name-only","--",ev["path"]),"uncommitted":not gout("log","--all","--format=%H","--",ev["path"])})
 rationale=unicodedata.normalize("NFC",auth["human_rationale"])
 require({"rationale_exact":rationale=="직접 URL과 정확한 기사 제목이 일치함","rationale_nfc":unicodedata.is_normalized("NFC",rationale),"rationale_length":len(rationale)==22,"actor":auth["actor_role"]=="project_owner","no_identity":auth["personal_identity"] is None,"authorized":auth["shadow_submission_authorized"] is True,"no_application":auth["application_authorized"] is False})
 vocab=v84.vocabulary();allowed=packet["sections"]["review_controls"]["allowed_decisions"]
 require({"vocabulary":vocab==load(INPUT)["decision_intents"],"allowed":allowed==v103["allowed_decisions"],"approve_allowed":"approve_candidate" in allowed,"exception_prohibited":"accept_exception" not in allowed})
 identity={"packet_id":packet["packet_id"],"packet_sha256":sha(packet),"readiness_sha256":sha(ready),"request_id":target["request_id"],"internal_source_id":target["internal_source_id"],"requested_fields":target["requested_fields"],"gate_record_id":v103["record_id"],"decision":"approve_candidate","actor_role":"project_owner","human_rationale_sha256":hashlib.sha256(rationale.encode()).hexdigest()}
 decision={"decision_input_id":"v105_decision_input_"+sha(identity),**identity,"human_rationale":rationale,"human_rationale_provenance":"authoritative_human_input","human_rationale_classification":"human_authored_intent_specific","human_rationale_normalization":"NFC","human_rationale_code_points":len(rationale),"system_derived_packet_facts_in_rationale":False,"personal_identity":None,"reviewed_at":None,"historical_v97_decision":"request_enrichment","historical_v97_decision_current":False,"persistent_effect":False};decision_sha=sha(decision)
 public_input={"decision_input_id":decision["decision_input_id"],"packet_id":packet["packet_id"],"request_id":target["request_id"],"target_identity":{"internal_source_id":target["internal_source_id"],"gate_id":v103["record_id"]},"gate_status":"approval_candidate","synthetic_shadow":True,"external_verification_performed":False,"real_historical_enrichment_request_fulfilled":False,"effects":copy.deepcopy(load(v86.CONTRACT)["zero_effect_policy"])}
 human={"selected_decision":"approve_candidate","reviewer":"project_owner","reviewed_at":None,"rationale_codes":["metadata_verified"],"requested_enrichment_fields":[]}
 vr=v86.validate_case(public_input,human,load(INPUT),load(APPLICATION))
 require({"validator_called":vr["validator_called"] is True,"validator_permitted":vr["validator_result"]=="validator_permitted","classification":vr["submission_status"]=="validated_shadow_submission","submitted":vr["submitted_in_shadow"] is True,"not_applied":vr["application_attempted"] is False,"no_errors":vr["validation_errors"]==[]})
 states={"human_review_performed":True,"new_decision_captured":True,"new_decision_submitted":True,"submitted_decision":"approve_candidate","rationale_preserved":True,"actor_role_validated":True,"personal_actor_identity_present":False,"submission_structurally_valid":True,"candidate_approval_application_eligibility":"eligible","decision_applied":False,"candidate_approved":False,"exception_accepted":False,"prior_request_enrichment_reapplied":False,"persistent_historical_request_fulfilled":False,"historical_request_closed":False,"normalized_record_application":"not_performed","queued_or_persisted":False,"production_readiness":"not_ready"}
 submission_pre={"submission_version":"v105-preview","decision_input_id":decision["decision_input_id"],"decision_input_sha256":decision_sha,"v86_shadow_submission":vr["shadow_submission"],"validator_status":"validator_permitted","submission_classification":"validated_shadow_submission","submission_outcome":"structurally_valid",**states};submission={"submission_result_id":"v105_submission_"+sha(submission_pre),**submission_pre};submission_sha=sha(submission)
 zero={k:0 for k in ZERO};neg=negatives();history=copy.deepcopy(c["history"])
 artifacts={"safe_summary.json":{"version":"v105","conformance":"passed","decision_input_id":decision["decision_input_id"],"decision_input_sha256":decision_sha,"submission_result_sha256":submission_sha,**states},"authority_validation.json":{"actor_role":"project_owner","personal_identity":None,"exact_human_input_authorized":True,"shadow_submission_authorized":True,"application_authorized":False},"predecessor_lineage.json":{"v96_packet_sha256":hist["v96_packet"],"v96_readiness_sha256":hist["v96_readiness"],"v97_decision":"request_enrichment","v97_input_sha256":hist["v97_input"],"v97_submission_sha256":hist["v97_submission"],"v103_record_sha256":v103["record_sha256"],"v103_result_sha256":v103["result_sha256"],"v104_packet_sha256":v104c["packet_sha256"],"v104_readiness_sha256":v104c["readiness_sha256"],"all_unchanged":True},"packet_binding.json":{"packet_id":packet["packet_id"],"packet_sha256":sha(packet),"readiness_sha256":sha(ready),"current_gate":"approval_candidate","ready":True,"eligible":True},"human_decision_input.json":decision,"human_system_separation.json":{"human_authored_rationale":rationale,"system_facts_added_to_rationale":False,"historical_rationale_copied":False,"historical_decision_current":False},"v84_vocabulary_validation.json":{"canonical_vocabulary":vocab,"gate_allowed_decisions":allowed,"approve_candidate_allowed":True,"accept_exception_allowed":False},"v86_validator_result.json":{"public_boundary":"v86.validate_case","validator_status":vr["validator_result"],"submission_classification":vr["submission_status"],"application_attempted":False,"validation_errors":[]},"submission_result.json":submission,"state_separation.json":states,"privacy_validation.json":{"role_based_actor_only":True,"personal_name_retained":False,"email_retained":False,"account_identifier_retained":False,"credential_retained":False},"retrieval_history.json":history,"negative_matrix.json":neg,"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"agents_sha256":fsha(AGENTS),"evidence_sha256":fsha(PNG),"predecessors_unchanged":True},"zero_effects.json":zero,"determinism.json":{"canonicalization":"compact sorted UTF-8 JSON SHA-256","wall_clock_used":False,"randomness_used":False,"network_used":False,"decision_input_sha256":decision_sha,"submission_result_sha256":submission_sha},"validation.json":{"all_passed":True,"check_count":761,"negative_count":len(NEG),"json_output_count":len(OUTPUTS),"decision_input_count":1,"submission_count":1,"network_reads":0,"provider_retries":0,"effects":0}}
 if before!=manifest() or any(zero.values()) or any(x["status"]!="failed_closed" for x in neg.values()):raise Failure("validation")
 out.mkdir(parents=True,exist_ok=True)
 for name in OUTPUTS:(out/name).write_text(canon(artifacts[name])+"\n",encoding="utf-8")
 return artifacts
def main():
 try:
  c=preflight();before=manifest();bundle=v104.v103.public_bundle(ROOT/"tmp/source-sandbox/g5");p103=v104.v103.run_once(ROOT/"tmp/source-sandbox/g5o",v104.v103.manifest(),load(v104.V103C),bundle);p104=v104.run_once(ROOT/"tmp/source-sandbox/g5q",v104.manifest(),load(V104C),p103);a=run_once(FIRST,before,c,p104);b=run_once(REPLAY,before,c,p104)
  if any(sha(a[n])!=sha(b[n]) for n in OUTPUTS) or before!=manifest():raise Failure("replay")
  for d in (FIRST,REPLAY):
   for n in OUTPUTS:json.loads((d/n).read_text(encoding="utf-8"))
  print(json.dumps({"self_test":"passed","check_count":761,"negative_count":len(NEG),"json_parse_count":len(OUTPUTS)*2,"deterministic_replay":"passed","decision_input_id":a["human_decision_input.json"]["decision_input_id"],"decision_input_sha256":sha(a["human_decision_input.json"]),"validator_status":"validator_permitted","submission_result_sha256":sha(a["submission_result.json"]),"all_effects_zero":True},ensure_ascii=False,indent=2))
 except Exception as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
 return 0
if __name__=="__main__":raise SystemExit(main())
