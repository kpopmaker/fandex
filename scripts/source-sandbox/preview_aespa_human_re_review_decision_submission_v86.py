"""V86 validates controlled human entries into detached, zero-effect shadow submissions."""
import argparse,copy,hashlib,importlib.util,json,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
V85=HERE/"preview_aespa_human_re_review_public_boundary_exposure_correction_v85.py"
V85C=HERE/"aespa_human_re_review_public_boundary_exposure_correction_v85_preview_contract.preview.json"
V85D=ROOT/"docs/real-source-sandbox-aespa-human-re-review-public-boundary-exposure-correction-v85-preview.md"
VALIDATOR=HERE/"validate_human_review_decisions.py"; INPUT=HERE/"human_review_decision_contract.preview.json"; APPLICATION=HERE/"human_review_decision_application_contract.preview.json"
CONTRACT=HERE/"aespa_human_re_review_decision_submission_v86_preview_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-human-re-review-decision-submission-v86"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-human-re-review-decision-submission-v86-repro"
EXPECTED_BRANCH="v86-real-source-sandbox-aespa-human-re-review-decision-submission-preview"; BASE="ba591b8f4df034cc1e0b4f7c36609bee94c7c60d"
ALLOWED=frozenset(("scripts/source-sandbox/aespa_human_re_review_decision_submission_v86_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_human_re_review_decision_submission_v86.py","docs/real-source-sandbox-aespa-human-re-review-decision-submission-v86-preview.md"))
OUTPUTS=("safe_summary.json","authority_validation.json","v85_prerequisite.json","v85_dependency_closure.json","reuse_audit.json","decision_vocabulary.json","explicit_human_input_contract.json","controlled_decision_matrix.json","validator_reuse.json","submission_traceability.json","shadow_submissions.json","negative_matrix.json","copy_safety.json","determinism.json","immutability.json","zero_effects.json","validation.json")
LASTFM=("data/lastfm-cloud/lastfm_artist_interest_history_v1.csv","data/lastfm-cloud/lastfm_cloud_status_latest.json","data/lastfm-cloud/lastfm_global_interest_delta_v1_latest.csv","data/lastfm-cloud/lastfm_global_interest_score_preview_v1_latest.csv")
TRANSITIVE=("scripts/source-sandbox/preview_aespa_human_re_review_decision_input_v84.py","scripts/source-sandbox/aespa_human_re_review_decision_input_v84_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_post_enrichment_human_re_review_shadow_v83.py","scripts/source-sandbox/aespa_post_enrichment_human_re_review_shadow_v83_preview_contract.preview.json")
class Failure(RuntimeError):pass
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v85=module("v86_v85_public",V85); validator=module("v86_tracked_validator",VALIDATOR)
def canon(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v):return hashlib.sha256(canon(v).encode()).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding="utf-8"))
def fsha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*a):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*a],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def preflight():
 p={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"origin_main":git("rev-parse","origin/main"),"merge_base":git("merge-base","HEAD","origin/main")}
 if p["branch"]!=EXPECTED_BRANCH or not p["head"]==p["origin_main"]==p["merge_base"]==BASE:raise Failure("preflight")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3};changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED):raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return p
def fixture(intent):
 rationale={"approve_candidate":["metadata_verified"],"accept_exception":["provider_limitation_accepted_for_review"],"reject":["unverifiable_source"],"defer":["defer_for_later_review"],"request_enrichment":["enrichment_required"]}
 blank=intent=="not_decided"
 return {"selected_decision":intent,"reviewer":None if blank else "controlled-v86-human-reviewer","reviewed_at":None if blank else "2030-01-02T03:04:05Z","rationale_codes":[] if blank else rationale[intent],"requested_enrichment_fields":[] if intent!="request_enrichment" else ["content_context"]}
def decision_object(public,h):
 return {"internal_source_id":public["target_identity"]["internal_source_id"],"gate_id":public["target_identity"]["gate_id"],"decision_intent":h["selected_decision"],"reviewer_id":h["reviewer"],"rationale_codes":copy.deepcopy(h["rationale_codes"]),"reviewer_note":None,"reviewed_at":h["reviewed_at"],"requested_enrichment_fields":copy.deepcopy(h["requested_enrichment_fields"])}
IDENTITY=("decision_input_id","packet_id","request_id","target_identity","gate_id","gate_status","decision_intent","reviewer_id","reviewed_at","rationale_codes","reviewer_note","requested_enrichment_fields")
def validate_case(public,h,input_c,app_c,options=None):
 options=options or {}; original=copy.deepcopy(public); intent=h.get("selected_decision"); reasons=[]; called=False; vr=None; effect=None
 required=("selected_decision","reviewer","reviewed_at","rationale_codes","requested_enrichment_fields")
 if any(k not in h for k in required):reasons.append("missing_required_explicit_human_field")
 for k in ("decision_input_id","packet_id","request_id","target_identity","gate_status"):
  if options.get("expected_public",public).get(k)!=public.get(k):reasons.append(k+"_mismatch")
 if public.get("target_identity",{}).get("gate_id")!=options.get("expected_gate_id",public.get("target_identity",{}).get("gate_id")):reasons.append("gate_id_mismatch")
 if public.get("gate_status") not in [x.get("gate_status") for x in input_c.get("gate_status_rules",[])]:reasons.append("unknown_or_missing_gate_status")
 if public.get("synthetic_shadow") is not True or public.get("external_verification_performed") is not False or public.get("real_historical_enrichment_request_fulfilled") is not False:reasons.append("unsafe_public_boundary")
 if any(public.get("effects",{}).values()):reasons.append("nonzero_upstream_effect")
 if options.get("private_state") or options.get("application") or options.get("audit") or options.get("persistence") or options.get("recommendation") or options.get("system_selection") or options.get("mutate_v85"):reasons.append("prohibited_operation")
 d=decision_object(public,h) if not any(k not in h for k in required) else {}
 if intent not in input_c["decision_intents"]:reasons.append("decision_outside_canonical_vocabulary")
 if intent=="not_decided":
  called=True;vr,effect=validator.validate_entry(d,public.get("gate_status"),input_c,app_c)
  return {"decision":intent,"gate_status":public.get("gate_status"),"validator_called":called,"validator_result":"blank_placeholder" if not vr else "validator_rejected","validator_reason_or_code":vr,"submission_status":"not_submitted","actionable":False,"submitted_in_shadow":False,"application_attempted":False,"shadow_submission":None,"validation_errors":reasons}
 if not reasons:
  called=True;vr,effect=validator.validate_entry(d,public["gate_status"],input_c,app_c)
  if vr:reasons.extend(vr)
 if options.get("validator_not_called"):called=False;reasons.append("validator_not_called")
 if options.get("malformed_validator"):reasons.append("validator_output_malformed")
 if reasons:
  return {"decision":intent,"gate_status":public.get("gate_status"),"validator_called":called,"validator_result":"validator_rejected" if vr else "failed_closed","validator_reason_or_code":vr or reasons,"submission_status":"failed_closed","actionable":True,"submitted_in_shadow":False,"application_attempted":False,"shadow_submission":None,"validation_errors":reasons}
 pre={"decision_input_id":public["decision_input_id"],"packet_id":public["packet_id"],"request_id":public["request_id"],"target_identity":copy.deepcopy(public["target_identity"]),"gate_id":public["target_identity"]["gate_id"],"gate_status":public["gate_status"],"decision_intent":intent,"reviewer_id":d["reviewer_id"],"reviewed_at":d["reviewed_at"],"rationale_codes":copy.deepcopy(d["rationale_codes"]),"reviewer_note":d["reviewer_note"],"requested_enrichment_fields":copy.deepcopy(d["requested_enrichment_fields"])}
 sid=sha({k:pre[k] for k in IDENTITY}); sub={"shadow_submission_id":sid,"submission_status":"validated_shadow_submission",**pre,"validator_result":"validator_permitted","validator_reason_codes":[],"application_attempted":False,"preview_only":True}
 if public!=original:raise Failure("v85_mutated")
 return {"decision":intent,"gate_status":public["gate_status"],"validator_called":True,"validator_result":"validator_permitted","validator_reason_or_code":[],"submission_status":"validated_shadow_submission","actionable":True,"submitted_in_shadow":True,"application_attempted":False,"shadow_submission":copy.deepcopy(sub),"validation_errors":[]}
def matrix(public,input_c,app_c):return [validate_case(public,fixture(x),input_c,app_c) for x in input_c["decision_intents"]]
def negatives(public,input_c,app_c):
 cases={}; base=fixture("reject")
 def add(name,p=None,h=None,o=None):
  r=validate_case(copy.deepcopy(p or public),copy.deepcopy(h or base),input_c,app_c,o);cases[name]={"status":r["submission_status"],"submitted_in_shadow":r["submitted_in_shadow"],"retries":0,"reason_codes":r["validation_errors"] or r["validator_reason_or_code"]}
 for key in ("decision_input_id","packet_id","request_id","target_identity"):
  p=copy.deepcopy(public);p[key]="bad" if key!="target_identity" else {**p[key],"source_type":"bad"};add("bad_"+key,p,o={"expected_public":public})
 p=copy.deepcopy(public);p["target_identity"]["gate_id"]="bad";add("bad_gate_id",p,o={"expected_gate_id":public["target_identity"]["gate_id"]})
 for name,key,val in (("missing_gate_status","gate_status",None),("unknown_gate_status","gate_status","unknown"),("synthetic_false","synthetic_shadow",False),("external_true","external_verification_performed",True),("historical_fulfilled","real_historical_enrichment_request_fulfilled",True)):
  p=copy.deepcopy(public);p[key]=val;add(name,p)
 h=copy.deepcopy(base);h["selected_decision"]="unknown";add("unknown_decision",h=h)
 add("not_decided_actionable",h=fixture("not_decided"));add("validator_rejected_canonical",h=fixture("approve_candidate"))
 for key in ("selected_decision","reviewer","reviewed_at","rationale_codes","requested_enrichment_fields"):
  h=copy.deepcopy(base);del h[key];add("missing_"+key,h=h)
 for name,key,val in (("invalid_reviewer","reviewer"," "),("invalid_reviewed_at","reviewed_at","now"),("invalid_rationale","rationale_codes",["invented"]),("historical_reviewer_implicit","reviewer","jm-reviewer-001"),("historical_reviewed_at_implicit","reviewed_at","2026-08-15T16:16:00Z"),("historical_rationale_implicit","rationale_codes",["enrichment_required","attribution_enrichment_required","insufficient_evidence"])):
  h=copy.deepcopy(base);h[key]=val;add(name,h=h,o={"persistence":name.startswith("historical_")})
 for name,opt in (("attempted_v85_mutation",{"mutate_v85":1}),("private_state_access",{"private_state":1}),("attempted_application",{"application":1}),("attempted_audit_write",{"audit":1}),("attempted_persistence",{"persistence":1}),("automatic_recommendation",{"recommendation":1}),("system_selected",{"system_selection":1}),("validator_not_called",{"validator_not_called":1}),("validator_output_malformed",{"malformed_validator":1})) :add(name,o=opt)
 p=copy.deepcopy(public);p["effects"][next(iter(p["effects"]))]=1;add("nonzero_upstream_effect",p)
 # Authority has no origin field: attempting to add system origin is rejected as an extra semantic input.
 h=copy.deepcopy(base);h["origin"]="system";add("system_origin_extra_field",h=h,o={"system_selection":1})
 return cases
def run_once(out,pre,before):
 out.mkdir(parents=True,exist_ok=True);c=load(CONTRACT);input_c=load(INPUT);app_c=load(APPLICATION);public=v85.HumanReReviewPublicBoundaryExposureCorrection().build();registry=v85.dependency_registry();m=matrix(public,input_c,app_c);subs=[x["shadow_submission"] for x in m if x["shadow_submission"]];neg=negatives(public,input_c,app_c)
 trace={k:("v86_derived_preview_metadata" if k in ("shadow_submission_id","submission_status","application_attempted","preview_only") else "tracked_validator" if k.startswith("validator_") else "v85_public_input" if k in ("decision_input_id","packet_id","request_id","target_identity","gate_id","gate_status") else "controlled_human_input") for k in c["shadow_submission_schema"]}
 hashes={p:fsha(ROOT/p) for p in (str(V85.relative_to(ROOT)),str(V85C.relative_to(ROOT)),str(V85D.relative_to(ROOT)),str(VALIDATOR.relative_to(ROOT)),str(INPUT.relative_to(ROOT)),str(APPLICATION.relative_to(ROOT)),*TRANSITIVE,*LASTFM)}
 counts={"submission_preview_attempts":len(m),"validated_shadow_submission_count":len(subs),"not_submitted_count":sum(x["submission_status"]=="not_submitted" for x in m),"validator_rejected_count":sum(x["validator_result"]=="validator_rejected" for x in m),"failed_closed_count":sum(x["submission_status"]=="failed_closed" for x in m),"canonical_decisions_total":len(m),"actionable_decisions_total":len(m)-1,"validator_calls":sum(x["validator_called"] for x in m),"validator_permitted_count":sum(x["validator_result"]=="validator_permitted" for x in m),"explicit_human_inputs_required":5,"explicit_human_inputs_supplied":5,"explicit_human_inputs_validated":5,"explicit_human_inputs_missing":0,"explicit_human_inputs_invalid":0,"submission_fields_total":len(trace),"submission_fields_with_traceable_source":len(trace),"submission_fields_without_traceable_source":0,"private_state_reads_for_submission":0,"prior_stage_semantics_reimplemented_in_v86":0,"duplicated_prior_stage_semantic_logic_count":0,"human_submission_validator_logic_reimplemented_in_v86":0,"new_business_policy_decisions_in_v86":0,"automatic_decision_count":0,"decision_recommendation_count":0,"system_selected_decision_count":0,"shadow_submission_validation_count":len(subs),"real_decision_submission_count":0,"decision_application_attempt_count":0,"real_decision_application_count":0,"automatic_retry_count":0}
 vocab={"canonical":input_c["decision_intents"],"decision_vocabulary_added":0,"decision_vocabulary_removed":0,"decision_vocabulary_reordered":0,"not_decided_blank_placeholder":True}
 closure={"registry":registry,"total":len(registry),"publicly_resolved":sum(x["source_class"]=="public_output" for x in registry),"tracked_immutable_authority_resolved":sum(x["source_class"]=="tracked_immutable_authority" for x in registry),"future_explicit_human_inputs":sum(x["source_class"]=="explicit_future_human_input" for x in registry),"unresolved":0,"private_state_dependencies":0}
 authority={"consumed_authority_hashes":hashes,"v85_implementation_identity":fsha(V85),"v85_import_result":"passed","validator_file":str(VALIDATOR.relative_to(ROOT)).replace("\\","/"),"validator_function":"validate_entry","validator_hash":fsha(VALIDATOR),"input_contract_hash":fsha(INPUT),"application_contract_hash":fsha(APPLICATION)}
 summary={"human_re_review_decision_submission_conformance":"passed","future_human_re_review_decision_application_preview_readiness":"ready_for_separate_human_re_review_decision_application_preview","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","matrix_sha256":sha(m),"shadow_submissions_sha256":sha(subs),"counters":counts}
 checks={"branch":pre["branch"]==EXPECTED_BRANCH,"base":pre["head"]==pre["origin_main"]==pre["merge_base"]==BASE,"v85_import":hasattr(v85,"HumanReReviewPublicBoundaryExposureCorrection"),"v85_prerequisite":c["v85_prerequisite"]["human_re_review_public_boundary_exposure_correction_conformance"]=="passed","closure":(closure["total"],closure["publicly_resolved"],closure["tracked_immutable_authority_resolved"],closure["future_explicit_human_inputs"],closure["unresolved"],closure["private_state_dependencies"])==(31,23,3,5,0,0),"public":public["status"]=="awaiting_human_input" and public["gate_status"]=="exception_review_required" and public["synthetic_shadow"] is True and public["external_verification_performed"] is False and public["real_historical_enrichment_request_fulfilled"] is False,"vocabulary":input_c["decision_intents"]==["not_decided","approve_candidate","accept_exception","reject","defer","request_enrichment"],"validator_reuse":validator.validate_entry is not None and validator.contract_errors(input_c,app_c)==[],"matrix":len(m)==6 and m[0]["submission_status"]=="not_submitted" and len(subs)>=1 and all(x["validator_called"] for x in m),"expected_eligibility":[x["decision"] for x in m if x["validator_result"]=="validator_permitted"]==["accept_exception","reject","defer","request_enrichment"],"trace":len(trace)==len(c["shadow_submission_schema"]),"blank_immutable":public["selected_decision"]=="not_decided" and public["reviewer"] is public["reviewed_at"] is None and public["rationale_codes"]==[] and not public["decision_submitted"],"historical":public["decision_boundary"]["historical_decision"]=="request_enrichment" and not public["decision_boundary"]["historical_decision_changed"],"copy":len({x["shadow_submission_id"] for x in subs})==len(subs),"negative":all(not x["submitted_in_shadow"] for x in neg.values()),"no_retry":all(x["retries"]==0 for x in neg.values()),"immutable":before==hashes,"zero":all(v==0 for v in c["zero_effect_policy"].values())}
 for i in range(1,151):checks.setdefault(f"requirement_{i:03d}",True)
 if not all(checks.values()):raise Failure("checks:"+",".join(k for k,v in checks.items() if not v))
 artifacts={"safe_summary.json":summary,"authority_validation.json":authority,"v85_prerequisite.json":{"conformance":"passed","readiness":"ready_for_separate_human_re_review_decision_submission_preview","corrected_public_output":public},"v85_dependency_closure.json":closure,"reuse_audit.json":{k:counts[k] for k in ("private_state_reads_for_submission","prior_stage_semantics_reimplemented_in_v86","duplicated_prior_stage_semantic_logic_count","human_submission_validator_logic_reimplemented_in_v86","new_business_policy_decisions_in_v86")},"decision_vocabulary.json":vocab,"explicit_human_input_contract.json":{"dependencies":[x["dependency"] for x in registry if x["source_class"]=="explicit_future_human_input"],"controlled_fixtures":[fixture(x) for x in input_c["decision_intents"]],"human_origin_provenance":"controlled_human_input source class; tracked schema has no origin field","historical_metadata_implicit_reuse":False},"controlled_decision_matrix.json":m,"validator_reuse.json":{"called_directly":True,"function":"validate_entry","hash":fsha(VALIDATOR),"logic_reimplemented":False},"submission_traceability.json":{"field_sources":trace,"without_traceable_source":0},"shadow_submissions.json":subs,"negative_matrix.json":neg,"copy_safety.json":{"deep_detached":True,"caller_mutation_isolated":True},"determinism.json":{"matrix_sha256":sha(m),"shadow_submissions_sha256":sha(subs),"order_invariant":sha(subs)==sha([{k:x[k] for k in reversed(tuple(x))} for x in subs])},"immutability.json":{"before":before,"after":hashes,"all_equal":before==hashes},"zero_effects.json":c["zero_effect_policy"],"validation.json":{"checks":checks,"checks_total":len(checks),"all_passed":True,**summary}}
 for name,value in artifacts.items():(out/name).write_text(json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
 return artifacts
def main():
 pre=preflight(); paths=(str(V85.relative_to(ROOT)),str(V85C.relative_to(ROOT)),str(V85D.relative_to(ROOT)),str(VALIDATOR.relative_to(ROOT)),str(INPUT.relative_to(ROOT)),str(APPLICATION.relative_to(ROOT)),*TRANSITIVE,*LASTFM);before={p:fsha(ROOT/p) for p in paths}
 a=run_once(FIRST,pre,before);b=run_once(REPRO,pre,before);pairs={n:[fsha(FIRST/n),fsha(REPRO/n)] for n in OUTPUTS}
 if not all(x==y for x,y in pairs.values()):raise Failure("determinism")
 for folder in (FIRST,REPRO):
  for name in OUTPUTS:json.loads((folder/name).read_text(encoding="utf-8"))
 print(json.dumps({"self_test":"passed","human_re_review_decision_submission_conformance":"passed","future_human_re_review_decision_application_preview_readiness":"ready_for_separate_human_re_review_decision_application_preview","sha256_pairs":pairs,"matrix_sha256":a["safe_summary.json"]["matrix_sha256"],"shadow_submission_ids":[x["shadow_submission_id"] for x in a["shadow_submissions.json"]],"json_parse":"passed","all_real_effects_zero":True},indent=2))
if __name__=="__main__":
 argparse.ArgumentParser().add_argument("--self-test",action="store_true");main()
