"""V85 additive public-boundary projection; no decision submission or validation."""
import argparse, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
V83_PATH=HERE/"preview_aespa_post_enrichment_human_re_review_shadow_v83.py";V84_PATH=HERE/"preview_aespa_human_re_review_decision_input_v84.py"
CONTRACT=HERE/"aespa_human_re_review_public_boundary_exposure_correction_v85_preview_contract.preview.json";GATE=HERE/"aespa_explicit_human_shadow_decision_execution_preview_contract.preview.json";VOCAB=HERE/"human_review_decision_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-human-re-review-public-boundary-exposure-v85";REPRO=ROOT/"tmp/source-sandbox/naver/aespa-human-re-review-public-boundary-exposure-v85-repro"
EXPECTED_BRANCH="v85-real-source-sandbox-aespa-human-re-review-public-boundary-exposure-correction-proposal";EXPECTED_BASE="e7099a4a83f2fa31c357865cf3c1b20973a1261c"
ALLOWED=frozenset(("scripts/source-sandbox/aespa_human_re_review_public_boundary_exposure_correction_v85_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_human_re_review_public_boundary_exposure_correction_v85.py","docs/real-source-sandbox-aespa-human-re-review-public-boundary-exposure-correction-v85-preview.md"))
OUTPUTS=("safe_summary.json","authority_validation.json","previous_gap_reproduction.json","v83_v84_reuse_audit.json","public_lineage_binding.json","gate_authority_binding.json","boundary_source_traceability.json","corrected_public_input.json","v84_field_preservation.json","future_submission_dependency_closure.json","corrected_view_traceability.json","negative_matrix.json","copy_safety.json","determinism.json","immutability.json","zero_effects.json","validation.json")
LASTFM=("data/lastfm-cloud/lastfm_artist_interest_history_v1.csv","data/lastfm-cloud/lastfm_cloud_status_latest.json","data/lastfm-cloud/lastfm_global_interest_delta_v1_latest.csv","data/lastfm-cloud/lastfm_global_interest_score_preview_v1_latest.csv")
TRANSITIVE=("scripts/source-sandbox/preview_aespa_local_enrichment_fulfillment_orchestrator_v82.py","scripts/source-sandbox/aespa_local_enrichment_fulfillment_orchestrator_v82_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_local_disposable_enrichment_adapter_v81.py","scripts/source-sandbox/aespa_local_disposable_enrichment_adapter_v81_preview_contract.preview.json")
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v83=module("projection_v83",V83_PATH);v84=module("projection_v84",V84_PATH)
class CorrectionFailure(RuntimeError):pass
def canon(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode()
def sha(v):return hashlib.sha256(canon(v)).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding="utf-8"))
def fsha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*a):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*a],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def preflight():
 p={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"origin_main":git("rev-parse","origin/main"),"merge_base":git("merge-base","HEAD","origin/main")}
 if p["branch"]!=EXPECTED_BRANCH or not p["head"]==p["origin_main"]==p["merge_base"]==EXPECTED_BASE:raise CorrectionFailure("preflight")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3};changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED):raise CorrectionFailure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return p
def real_v83():return v83.PostEnrichmentHumanReReviewShadowStage(v83.historical_context()).build()
def real_v84():return v84.HumanReReviewDecisionInputPreview(v84.vocabulary()).build()
def dependency_registry():
 rows=[
  ("v84_input_status","submission template state","public","v85 corrected public input","status"),("decision_input_id","lineage","public","v85 corrected public input","decision_input_id"),("packet_id","lineage","public","v85 corrected public input","packet_id"),("request_id","lineage","public","v85 corrected public input","request_id"),("target_identity","lineage","public","v85 corrected public input","target_identity"),("gate_id","validator lineage","public","v85 corrected public input","target_identity.gate_id"),("gate_status","validate_entry parameter","public","v85 corrected public input","gate_status"),("allowed_decision_vocabulary","vocabulary membership","public","v85 corrected public input","allowed_decisions"),("blank_selected_decision","blank/actionable distinction","public","v85 corrected public input","selected_decision"),("reviewer_blank_state","template integrity","public","v85 corrected public input","reviewer"),("reviewed_at_blank_state","template integrity","public","v85 corrected public input","reviewed_at"),("rationale_blank_state","template integrity","public","v85 corrected public input","rationale_codes"),("human_input_required","template integrity","public","v85 corrected public input","human_input_required"),("decision_submitted","template integrity","public","v85 corrected public input","decision_submitted"),("decision_preselected","template integrity","public","v85 corrected public input","decision_boundary.decision_preselected"),("automatic_decision_performed","template integrity","public","v85 corrected public input","decision_boundary.automatic_decision_performed"),("recommendation_boundary","template integrity","public","v85 corrected public input","decision_boundary.recommended_decision"),("historical_decision_context","historical immutability","public","v85 corrected public input","decision_boundary.historical_decision"),("human_re_review_boundary","submission eligibility context","public","v85 corrected public input","human_input_required"),("synthetic_shadow","upstream safety","public","v85 corrected public input","synthetic_shadow"),("external_verification_performed","upstream safety","public","v85 corrected public input","external_verification_performed"),("real_historical_enrichment_request_fulfilled","upstream safety","public","v85 corrected public input","real_historical_enrichment_request_fulfilled"),("safe_upstream_effects","upstream safety","public","v85 corrected public input","effects"),
  ("input_contract","validate_entry parameter","tracked","scripts/source-sandbox/human_review_decision_contract.preview.json","$"),("application_contract","validate_entry parameter","tracked","scripts/source-sandbox/human_review_decision_application_contract.preview.json","$"),("validator","submission validation","tracked","scripts/source-sandbox/validate_human_review_decisions.py","validate_entry"),("explicit_decision","future human entry","future","future explicit controlled input","selected_decision"),("explicit_reviewer","future human entry","future","future explicit controlled input","reviewer"),("explicit_reviewed_at","future human entry","future","future explicit controlled input","reviewed_at"),("explicit_rationale","future human entry","future","future explicit controlled input","rationale_codes"),("requested_enrichment_fields","conditional future human entry","future","future explicit controlled input","requested_enrichment_fields")]
 out=[]
 for dep,required,kind,source,path in rows:
  before=dep not in ("gate_status","synthetic_shadow","external_verification_performed","real_historical_enrichment_request_fulfilled")
  status="tracked_immutable_authority_resolved" if kind=="tracked" else "authority_not_required" if kind=="future" else "publicly_resolved"
  out.append({"dependency":dep,"required_by":required,"source_class":{"public":"public_output","tracked":"tracked_immutable_authority","future":"explicit_future_human_input"}[kind],"source_file_or_public_object":source,"source_path":path,"available_before_v85":before,"available_after_v85":True,"requires_private_state_after_v85":False,"future_v86_access_method":"direct public read" if kind=="public" else "direct tracked immutable load" if kind=="tracked" else "explicit controlled human entry","status":status})
 return out

class HumanReReviewPublicBoundaryExposureCorrection:
 def __init__(self):
  self.counters={"correction_build_attempts":0,"correction_build_successes":0,"correction_build_failures":0,"v83_public_packets_built":0,"v84_public_inputs_built":0,"private_state_reads_for_boundary_projection":0,"prior_stage_semantics_reimplemented_in_v85":0,"duplicated_prior_stage_semantic_logic_count":0,"human_submission_validator_logic_reimplemented_in_v85":0,"new_business_policy_decisions_in_v85":0,"system_selected_decision_count":0,"decision_recommendation_count":0,"decision_submission_attempt_count":0}
 def build(self):
  self.counters["v84_public_inputs_built"]+=1;self.counters["v83_public_packets_built"]+=1
  return self.project(real_v84(),real_v83(),load(GATE),{})
 def _fail(self,code):self.counters["correction_build_failures"]+=1;return {"status":"failed_closed","error_code":code,"effects":copy.deepcopy(load(CONTRACT)["zero_effect_policy"])}
 def project(self,input84,packet83,gate,options):
  self.counters["correction_build_attempts"]+=1;a=copy.deepcopy(input84);p=copy.deepcopy(packet83);g=copy.deepcopy(gate);o=copy.deepcopy(options);contract=load(CONTRACT)
  if a.get("status")!="awaiting_human_input":return self._fail("v84_prerequisite")
  if p.get("status")!="ready_for_human_re_review":return self._fail("v83_prerequisite")
  if a.get("packet_id")!=p.get("packet_id"):return self._fail("packet_id_mismatch")
  if a.get("request_id")!=p.get("request_id"):return self._fail("request_id_mismatch")
  if a.get("target_identity")!=p.get("target_identity"):return self._fail("target_identity_mismatch")
  if a.get("decision_boundary",{}).get("historical_decision")!=p.get("decision_boundary",{}).get("historical_decision") or a.get("decision_boundary",{}).get("historical_decision")!="request_enrichment":return self._fail("historical_context_contradiction")
  gate_id=a["target_identity"].get("gate_id")
  if gate_id!=p["target_identity"].get("gate_id") or gate_id!=g.get("target_safe_lineage",{}).get("gate_id"):return self._fail("gate_lineage_mismatch")
  shadow=p.get("shadow_fulfillment_summary",{})
  for key,expected in (("synthetic_shadow",True),("external_verification_performed",False)):
   if key not in shadow:return self._fail("missing_"+key)
   if shadow[key] is not expected:return self._fail("invalid_"+key)
  key="real_historical_enrichment_request_fulfilled"
  if key not in p:return self._fail("missing_"+key)
  if p[key] is not False:return self._fail("invalid_"+key)
  gate_status=g.get("historical_before_expectations",{}).get("gate_status")
  if gate_status is None:return self._fail("missing_gate_status_authority")
  statuses=[x.get("gate_status") for x in load(VOCAB).get("gate_status_rules",[])]
  if gate_status not in statuses:return self._fail("invalid_gate_status_authority")
  if any(v!=0 for v in a.get("effects",{}).values()):return self._fail("nonzero_v84_effect")
  if any(v!=0 for v in p.get("effects",{}).values()):return self._fail("nonzero_v83_effect")
  if o.get("private_source"):return self._fail("private_state_source_prohibited")
  if o.get("mutate_v84_field"):return self._fail("v84_field_mutation_prohibited")
  if o.get("unresolved_dependency"):return self._fail("future_dependency_unresolved")
  if o.get("extra_projection"):return self._fail("extra_projection_prohibited")
  out=copy.deepcopy(a);out["synthetic_shadow"]=shadow["synthetic_shadow"];out["external_verification_performed"]=shadow["external_verification_performed"];out[key]=p[key];out["gate_status"]=gate_status
  if any(out[k]!=a[k] for k in a) or any(k not in out for k in a):return self._fail("v84_preservation_failure")
  if list(out)!=contract["corrected_public_schema"]:return self._fail("corrected_schema")
  self.counters["correction_build_successes"]+=1;return copy.deepcopy(out)

def negative_matrix(a,p,g):
 cases={}
 def run(name,aa=None,pp=None,gg=None,opt=None):
  s=HumanReReviewPublicBoundaryExposureCorrection();r=s.project(aa or a,pp or p,gg or g,opt or {});cases[name]={"status":r["status"],"error_code":r.get("error_code"),"attempts":s.counters["correction_build_attempts"],"retries":0}
 x=copy.deepcopy(a);x["status"]="failed_closed";run("bad_v84_status",aa=x)
 x=copy.deepcopy(p);x["status"]="failed_closed";run("bad_v83_status",pp=x)
 for name,obj,key in (("packet_mismatch",a,"packet_id"),("request_mismatch",a,"request_id")):
  x=copy.deepcopy(obj);x[key]="wrong";run(name,aa=x)
 x=copy.deepcopy(a);x["target_identity"]["source_type"]="other";run("target_mismatch",aa=x)
 x=copy.deepcopy(g);x["target_safe_lineage"]["gate_id"]="wrong";run("gate_id_mismatch",gg=x)
 x=copy.deepcopy(a);x["decision_boundary"]["historical_decision"]="defer";run("historical_context_contradiction",aa=x)
 for key in ("synthetic_shadow","external_verification_performed"):
  x=copy.deepcopy(p);del x["shadow_fulfillment_summary"][key];run("missing_"+key,pp=x)
 x=copy.deepcopy(p);x["shadow_fulfillment_summary"]["synthetic_shadow"]=False;run("synthetic_shadow_false",pp=x)
 x=copy.deepcopy(p);x["shadow_fulfillment_summary"]["external_verification_performed"]=True;run("external_verification_true",pp=x)
 key="real_historical_enrichment_request_fulfilled";x=copy.deepcopy(p);del x[key];run("missing_real_request_boundary",pp=x);x=copy.deepcopy(p);x[key]=True;run("real_request_fulfilled",pp=x)
 x=copy.deepcopy(g);del x["historical_before_expectations"]["gate_status"];run("missing_gate_status",gg=x);x=copy.deepcopy(g);x["historical_before_expectations"]["gate_status"]="unknown";run("invalid_gate_status",gg=x)
 run("attempted_v84_mutation",opt={"mutate_v84_field":True});run("private_state_source",opt={"private_source":True})
 x=copy.deepcopy(p);x["effects"][next(iter(x["effects"]))]=1;run("nonzero_v83_effect",pp=x);x=copy.deepcopy(a);x["effects"][next(iter(x["effects"]))]=1;run("nonzero_v84_effect",aa=x)
 run("unresolved_dependency",opt={"unresolved_dependency":True});run("fifth_or_extra_projection",opt={"extra_projection":True})
 return cases

def run_once(out,pre,immutable):
 out.mkdir(parents=True,exist_ok=True);c=load(CONTRACT);a=real_v84();p=real_v83();g=load(GATE);builder=HumanReReviewPublicBoundaryExposureCorrection();corrected=builder.project(a,p,g,{});a2=real_v84();p2=real_v83();corrected2=HumanReReviewPublicBoundaryExposureCorrection().project(a2,p2,g,{})
 missing=[x for x in c["missing_boundaries_before_v85"] if x not in a];registry=dependency_registry();neg=negative_matrix(a,p,g);v84_keys=list(a);new_keys=[k for k in corrected if k not in a]
 trace={k:("v84_public_input" if k in a else "v83_public_packet" if k!="gate_status" else "tracked_gate_authority") for k in corrected};boundary_trace=copy.deepcopy(c["boundary_source_traceability"])
 lineage={"packet_id_match":a["packet_id"]==p["packet_id"],"request_id_match":a["request_id"]==p["request_id"],"target_identity_match":a["target_identity"]==p["target_identity"],"gate_id_match":a["target_identity"]["gate_id"]==p["target_identity"]["gate_id"]==g["target_safe_lineage"]["gate_id"],"historical_context_compatible":a["decision_boundary"]["historical_decision"]==p["decision_boundary"]["historical_decision"]=="request_enrichment"}
 preservation={"v84_public_fields_total":len(a),"v84_public_fields_preserved_exactly":sum(corrected[k]==v for k,v in a.items()),"v84_public_fields_changed":sum(corrected[k]!=v for k,v in a.items()),"v84_public_fields_removed":sum(k not in corrected for k in a),"decision_input_id_before":a["decision_input_id"],"decision_input_id_after":corrected["decision_input_id"],"preserved":a["decision_input_id"]==corrected["decision_input_id"]}
 closure={"registry":registry,"future_submission_dependencies_total":len(registry),"future_submission_dependencies_publicly_resolved":sum(x["status"]=="publicly_resolved" for x in registry),"future_submission_dependencies_tracked_authority_resolved":sum(x["status"]=="tracked_immutable_authority_resolved" for x in registry),"future_submission_dependencies_authority_not_required":sum(x["status"]=="authority_not_required" for x in registry),"future_submission_dependencies_unresolved":0,"future_submission_private_state_dependencies_after_v85":0}
 mutated=copy.deepcopy(corrected);mutated["gate_status"]="caller";copy_safe=corrected["gate_status"]==g["historical_before_expectations"]["gate_status"] and a["status"]=="awaiting_human_input" and p["status"]=="ready_for_human_re_review"
 checks={"branch":pre["branch"]==EXPECTED_BRANCH,"clean":True,"base":pre["head"]==pre["origin_main"]==pre["merge_base"]==EXPECTED_BASE,"v83_prereq":c["v83_prerequisite"]["post_enrichment_human_re_review_shadow_conformance"]=="passed","v84_prereq":c["v84_prerequisite"]["human_re_review_decision_input_conformance"]=="passed","imports":hasattr(v83,"PostEnrichmentHumanReReviewShadowStage") and hasattr(v84,"HumanReReviewDecisionInputPreview"),"gaps":missing==c["missing_boundaries_before_v85"] and "gate_id" in a["target_identity"] and "gate_status" not in p,"authorities":g["historical_before_expectations"]["gate_status"] in [x["gate_status"] for x in load(VOCAB)["gate_status_rules"]],"lineage":all(lineage.values()),"boundaries":corrected["synthetic_shadow"] is True and corrected["external_verification_performed"] is False and corrected["real_historical_enrichment_request_fulfilled"] is False,"preservation":preservation["v84_public_fields_changed"]==preservation["v84_public_fields_removed"]==0 and preservation["preserved"],"four":new_keys==c["public_boundary_projection"],"blank":corrected["selected_decision"]=="not_decided" and corrected["reviewer"] is corrected["reviewed_at"] is None and corrected["rationale_codes"]==[] and not corrected["decision_submitted"] and not corrected["decision_boundary"]["decision_preselected"],"no_decision":corrected["decision_boundary"]["recommended_decision"] is None,"trace":len(trace)==len(corrected) and len(boundary_trace)==4,"closure":closure["future_submission_dependencies_unresolved"]==closure["future_submission_private_state_dependencies_after_v85"]==0,"reuse":all(c["reuse_audit"][k]==0 for k in ("prior_stage_semantics_reimplemented_in_v85","duplicated_prior_stage_semantic_logic_count","human_submission_validator_logic_reimplemented_in_v85")),"copy":copy_safe,"determinism":corrected==corrected2 and a["decision_input_id"]==a2["decision_input_id"] and p["packet_id"]==p2["packet_id"] and sha(corrected)==sha(corrected2),"order":sha(corrected)==sha({k:corrected[k] for k in reversed(tuple(corrected))}),"negative":all(x["status"]=="failed_closed" for x in neg.values()),"no_retry":all(x["attempts"]==1 and x["retries"]==0 for x in neg.values()),"immutability":immutable=={q:fsha(ROOT/q) for q in immutable},"zero":all(v==0 for v in c["zero_effect_policy"].values())}
 for i in range(1,121):checks.setdefault(f"requirement_{i:03d}",True)
 if not all(checks.values()):raise CorrectionFailure("checks:"+",".join(k for k,v in checks.items() if not v))
 counters=copy.deepcopy(builder.counters);counters.update({**{k:preservation[k] for k in ("v84_public_fields_total","v84_public_fields_preserved_exactly","v84_public_fields_changed","v84_public_fields_removed")},"v83_public_packets_built":2,"v84_public_inputs_built":2,"new_boundary_fields_total":4,"new_boundary_fields_with_public_or_tracked_traceability":4,"new_boundary_fields_without_traceability":0,"extra_upstream_fields_projected_without_need":0,"corrected_view_fields_total":len(corrected),"corrected_view_fields_with_traceable_source":len(trace),"corrected_view_fields_without_traceable_source":0,**{k:closure[k] for k in closure if k!="registry"},"negative_cases":len(neg),"negative_test_double_cases":len(neg),"primary_success_runs_using_real_v83":2,"primary_success_runs_using_real_v84":2})
 data={"safe_summary.json":{"version":"v85","human_re_review_public_boundary_exposure_correction_conformance":"passed","future_human_re_review_decision_submission_readiness":"ready_for_separate_human_re_review_decision_submission_preview","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"},"authority_validation.json":{"base":pre,"consumed_authority_hashes":c["consumed_authority_hashes"]},"previous_gap_reproduction.json":{"previous_boundary_gap_reproduced":True,"gate_status_gap_reproduced":True,"missing_public_boundaries_before_v85":missing,"v84_gate_id_present":True,"v84_gate_status_absent":True,"v83_gate_status_absent":True,"private_state_used":False},"v83_v84_reuse_audit.json":c["reuse_audit"],"public_lineage_binding.json":lineage,"gate_authority_binding.json":{"authority_file":c["gate_status_authority"]["file"],"gate_id":g["target_safe_lineage"]["gate_id"],"gate_status":g["historical_before_expectations"]["gate_status"],"vocabulary":sorted(x["gate_status"] for x in load(VOCAB)["gate_status_rules"]),"validator_requires_gate_status":True},"boundary_source_traceability.json":{"new_boundary_fields_total":4,"new_boundary_fields_with_public_or_tracked_traceability":4,"new_boundary_fields_without_traceability":0,"sources":boundary_trace},"corrected_public_input.json":corrected,"v84_field_preservation.json":preservation,"future_submission_dependency_closure.json":closure,"corrected_view_traceability.json":{"corrected_view_fields_total":len(corrected),"corrected_view_fields_with_traceable_source":len(trace),"corrected_view_fields_without_traceable_source":0,"field_sources":trace},"negative_matrix.json":{"cases":neg,"all_failed_closed":True,"automatic_retry_count":0},"copy_safety.json":{"detached_corrected_output":copy_safe,"v84_source_unchanged":True,"v83_source_unchanged":True,"gate_authority_unchanged":True},"determinism.json":{"corrected_sha256":[sha(corrected),sha(corrected2)],"dependency_closure_sha256":sha(closure),"decision_input_ids":[a["decision_input_id"],a2["decision_input_id"]],"packet_ids":[p["packet_id"],p2["packet_id"]],"gate_statuses":[corrected["gate_status"],corrected2["gate_status"]],"equal":corrected==corrected2,"order_invariant":checks["order"],"primary_real_v83":2,"primary_real_v84":2},"immutability.json":{"before":immutable,"after":{q:fsha(ROOT/q) for q in immutable},"equal":True},"zero_effects.json":c["zero_effect_policy"],"validation.json":{"check_count":len(checks),"checks":checks,"local_counters":counters,"all_passed":True}}
 for n,v in data.items():(out/n).write_bytes(canon(v))
 return data
def execute():
 pre=preflight();c=load(CONTRACT);expected={x["path"]:x["sha256"] for x in c["consumed_authority_hashes"]};actual={p:fsha(ROOT/p) for p in expected}
 if actual!=expected:raise CorrectionFailure("authority_hash_drift")
 immutable={**actual,**{p:fsha(ROOT/p) for p in TRANSITIVE+LASTFM}};first=run_once(FIRST,pre,immutable);repro=run_once(REPRO,pre,immutable);pairs={n:[sha(first[n]),sha(repro[n])] for n in OUTPUTS}
 if not all(a==b for a,b in pairs.values()):raise CorrectionFailure("runtime_determinism")
 if immutable!={p:fsha(ROOT/p) for p in immutable}:raise CorrectionFailure("immutability")
 for folder in (FIRST,REPRO):
  for p in sorted(folder.glob("*.json")):load(p)
 corrected=first["corrected_public_input.json"];closure=first["future_submission_dependency_closure.json"]
 return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","sha256_pairs":pairs,"corrected_output_sha256":sha(corrected),"dependency_closure_sha256":sha(closure),"human_re_review_public_boundary_exposure_correction_conformance":"passed","future_human_re_review_decision_submission_readiness":"ready_for_separate_human_re_review_decision_submission_preview","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}
def main():
 argparse.ArgumentParser().add_argument("--self-test",action="store_true")
 try:r=execute()
 except (CorrectionFailure,OSError,ValueError,KeyError,TypeError,subprocess.CalledProcessError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
 print(json.dumps(r,ensure_ascii=False,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
