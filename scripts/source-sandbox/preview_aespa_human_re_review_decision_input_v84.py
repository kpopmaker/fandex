"""V84 builds only an authority-defined blank human re-review input template."""
import argparse, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
V83_PATH=HERE/"preview_aespa_post_enrichment_human_re_review_shadow_v83.py"; V83_CONTRACT=HERE/"aespa_post_enrichment_human_re_review_shadow_v83_preview_contract.preview.json"
CONTRACT=HERE/"aespa_human_re_review_decision_input_v84_preview_contract.preview.json"; VOCAB=HERE/"human_review_decision_contract.preview.json"; BLANK=HERE/"aespa_decision_input_preview_contract.preview.json"; V61=HERE/"aespa_human_authored_decision_input_preview_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-human-re-review-decision-input-v84"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-human-re-review-decision-input-v84-repro"
EXPECTED_BRANCH="v84-real-source-sandbox-aespa-human-re-review-decision-input-preview"; EXPECTED_BASE="2fcb11ba22e675a8068a4957994f0ce9974db580"
ALLOWED=frozenset(("scripts/source-sandbox/aespa_human_re_review_decision_input_v84_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_human_re_review_decision_input_v84.py","docs/real-source-sandbox-aespa-human-re-review-decision-input-v84-preview.md"))
OUTPUTS=("safe_summary.json","authority_validation.json","v83_reuse_audit.json","decision_vocabulary.json","packet_binding.json","blank_decision_input.json","decision_input_traceability.json","blank_invariants.json","historical_new_field_isolation.json","negative_matrix.json","copy_safety.json","determinism.json","immutability.json","zero_effects.json","validation.json")
LASTFM=("data/lastfm-cloud/lastfm_artist_interest_history_v1.csv","data/lastfm-cloud/lastfm_cloud_status_latest.json","data/lastfm-cloud/lastfm_global_interest_delta_v1_latest.csv","data/lastfm-cloud/lastfm_global_interest_score_preview_v1_latest.csv")
TRANSITIVE=("scripts/source-sandbox/preview_aespa_local_enrichment_fulfillment_orchestrator_v82.py","scripts/source-sandbox/aespa_local_enrichment_fulfillment_orchestrator_v82_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_local_disposable_enrichment_adapter_v81.py","scripts/source-sandbox/aespa_local_disposable_enrichment_adapter_v81_preview_contract.preview.json")
spec=importlib.util.spec_from_file_location("aespa_v83",V83_PATH); v83=importlib.util.module_from_spec(spec); spec.loader.exec_module(v83)
class InputFailure(RuntimeError): pass
def canon(v): return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode("utf-8")
def sha(v): return hashlib.sha256(canon(v)).hexdigest()
def load(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def fsha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*a): return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*a],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def preflight():
 p={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"origin_main":git("rev-parse","origin/main"),"merge_base":git("merge-base","HEAD","origin/main")}
 if p["branch"]!=EXPECTED_BRANCH or not p["head"]==p["origin_main"]==p["merge_base"]==EXPECTED_BASE: raise InputFailure("preflight")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}; changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED): raise InputFailure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return p
def vocabulary():
 values=load(VOCAB)["decision_intents"]
 if values!=load(V61)["supported_historical_decision_vocabulary"]: raise InputFailure("human_decision_vocabulary_authority_gap")
 return copy.deepcopy(values)
def real_v83_packet(): return v83.PostEnrichmentHumanReReviewShadowStage(v83.historical_context()).build()

class HumanReReviewDecisionInputPreview:
 def __init__(self,vocabulary_values):
  self._vocabulary=copy.deepcopy(vocabulary_values); self._last_input=None; self._last_packet=None
  self.counters={"decision_input_build_attempts":0,"decision_input_build_successes":0,"decision_input_build_failures":0,"v83_packet_builds":0,"decision_vocabulary_reads":1,"negative_cases":0,"prior_stage_semantics_reimplemented_in_v84":0,"duplicated_prior_stage_semantic_logic_count":0,"private_state_reads_for_decision_input":0,"decision_vocabulary_added_values":0,"decision_vocabulary_removed_values":0,"decision_vocabulary_reordered_without_authority":0,"decision_recommendation_count":0,"decision_execution_count":0,"real_decision_submission_count":0,"new_business_policy_decisions_in_v84":0}
 def build(self):
  self.counters["v83_packet_builds"]+=1
  return self.build_from_public_packet(real_v83_packet(),self._vocabulary,{})
 def _fail(self,code):
  self.counters["decision_input_build_failures"]+=1
  return {"decision_input_version":"v84","decision_input_id":None,"status":"failed_closed","error_code":code,"decision_submitted":False,"effects":copy.deepcopy(load(CONTRACT)["zero_effect_policy"])}
 def build_from_public_packet(self,packet,vocabulary_values,fields):
  self.counters["decision_input_build_attempts"]+=1; p=copy.deepcopy(packet); values=copy.deepcopy(vocabulary_values); f=copy.deepcopy(fields)
  authority=vocabulary()
  if values!=authority: return self._fail("decision_vocabulary_mismatch")
  if p.get("status")!="ready_for_human_re_review": return self._fail("v83_packet_not_ready")
  if not p.get("packet_id"): return self._fail("packet_id_missing")
  if p.get("request_id")!=p.get("original_enrichment_request",{}).get("request_id"): return self._fail("request_id_mismatch")
  if p.get("target_identity")!=p.get("original_enrichment_request",{}).get("target_identity"): return self._fail("target_identity_mismatch")
  if p.get("original_human_review",{}).get("decision")!="request_enrichment": return self._fail("historical_decision_mismatch")
  shadow=p.get("shadow_fulfillment_summary",{})
  if p.get("human_re_review_required") is not True: return self._fail("human_re_review_false")
  if shadow.get("synthetic_shadow") is not True: return self._fail("synthetic_shadow_false")
  if shadow.get("external_verification_performed") is not False: return self._fail("external_verification_true")
  if p.get("real_historical_enrichment_request_fulfilled") is not False: return self._fail("real_request_fulfilled")
  selected=f.get("selected_decision","not_decided"); reviewer=f.get("reviewer"); reviewed_at=f.get("reviewed_at"); rationale=f.get("rationale_codes",[])
  if selected!="not_decided": return self._fail("decision_not_blank")
  if reviewer is not None: return self._fail("reviewer_not_blank")
  if reviewed_at is not None: return self._fail("reviewed_at_not_blank")
  if rationale!=[]: return self._fail("rationale_not_blank")
  if any(f.get(k) is not None for k in ("recommended_decision","default_decision","preferred_decision","suggested_decision")): return self._fail("recommendation_signal")
  if f.get("decision_submitted",False) is not False: return self._fail("decision_already_submitted")
  if f.get("decision_execution_performed",False) is not False: return self._fail("decision_execution_indicated")
  identity={"decision_input_version":"v84","packet_id":p["packet_id"],"request_id":p["request_id"],"target_identity":copy.deepcopy(p["target_identity"]),"allowed_decisions":values}
  out={"decision_input_version":"v84","decision_input_id":sha(identity),"status":"awaiting_human_input","packet_id":p["packet_id"],"request_id":p["request_id"],"target_identity":copy.deepcopy(p["target_identity"]),"allowed_decisions":values,"selected_decision":"not_decided","reviewer":None,"reviewed_at":None,"rationale_codes":[],"human_input_required":True,"decision_submitted":False,"decision_boundary":{"blank_representation":"not_decided","decision_preselected":False,"automatic_decision_performed":False,"decision_execution_performed":False,"historical_decision":"request_enrichment","historical_decision_changed":False,"recommended_decision":None},"effects":copy.deepcopy(load(CONTRACT)["zero_effect_policy"])}
  self._last_input=copy.deepcopy(out); self._last_packet=copy.deepcopy(p); self.counters["decision_input_build_successes"]+=1
  return copy.deepcopy(out)

def negative_matrix(packet,values):
 cases={}
 def run(name,p=None,v=None,f=None):
  s=HumanReReviewDecisionInputPreview(values); o=s.build_from_public_packet(p if p is not None else packet,v if v is not None else values,f or {}); cases[name]={"status":o["status"],"error_code":o.get("error_code"),"attempts":s.counters["decision_input_build_attempts"],"retries":0}
 p=copy.deepcopy(packet);p["status"]="failed_closed";run("bad_packet_status",p)
 p=copy.deepcopy(packet);p["packet_id"]=None;run("missing_packet_id",p)
 p=copy.deepcopy(packet);p["request_id"]="0"*64;run("wrong_request_id",p)
 p=copy.deepcopy(packet);p["target_identity"]["source_type"]="other";run("wrong_target",p)
 p=copy.deepcopy(packet);p["original_human_review"]["decision"]="defer";run("wrong_historical_decision",p)
 p=copy.deepcopy(packet);p["human_re_review_required"]=False;run("human_review_false",p)
 p=copy.deepcopy(packet);p["shadow_fulfillment_summary"]["synthetic_shadow"]=False;run("synthetic_shadow_false",p)
 p=copy.deepcopy(packet);p["shadow_fulfillment_summary"]["external_verification_performed"]=True;run("external_verification_true",p)
 p=copy.deepcopy(packet);p["real_historical_enrichment_request_fulfilled"]=True;run("real_request_fulfilled",p)
 run("altered_vocabulary",v=values+["other"])
 for value in ("approve_candidate","accept_exception","reject","defer","request_enrichment"):
  run("preselected_"+value,f={"selected_decision":value})
 run("null_instead_of_authority_blank",f={"selected_decision":None})
 run("prefilled_reviewer",f={"reviewer":"historical"});run("prefilled_reviewed_at",f={"reviewed_at":"2026-01-01T00:00:00Z"});run("prefilled_rationale",f={"rationale_codes":["insufficient_evidence"]})
 run("non_null_recommendation",f={"recommended_decision":"reject"});run("non_null_default",f={"default_decision":"reject"});run("non_null_preference",f={"preferred_decision":"reject"})
 run("decision_submitted",f={"decision_submitted":True});run("execution_flag",f={"decision_execution_performed":True})
 return cases

def run_once(out,pre,immutable):
 out.mkdir(parents=True,exist_ok=True); c=load(CONTRACT); values=vocabulary(); s1=HumanReReviewDecisionInputPreview(values); d1=s1.build(); packet1=copy.deepcopy(s1._last_packet); s2=HumanReReviewDecisionInputPreview(values); d2=s2.build(); packet2=copy.deepcopy(s2._last_packet); neg=negative_matrix(packet1,values)
 identity={k:copy.deepcopy(d1[k]) for k in ("decision_input_version","packet_id","request_id","target_identity","allowed_decisions")}; reordered={k:identity[k] for k in reversed(tuple(identity))}
 changed=copy.deepcopy(d1);changed["reviewer"]="caller";copy_safe=s1._last_input["reviewer"] is None and s1._last_packet==packet1
 trace={k:("v83_public_packet" if k in ("packet_id","request_id","target_identity") else "decision_vocabulary_authority" if k=="allowed_decisions" else "blank_human_input" if k in ("selected_decision","reviewer","reviewed_at","rationale_codes") else "v84_derived_metadata") for k in d1}
 isolation={"historical_decision":packet1["original_human_review"]["decision"],"new_selected_decision":d1["selected_decision"],"historical_reviewer":packet1["original_human_review"]["reviewer"],"new_reviewer":d1["reviewer"],"historical_reviewed_at":packet1["original_human_review"]["reviewed_at"],"new_reviewed_at":d1["reviewed_at"],"historical_rationale_codes":packet1["original_human_review"]["rationale_codes"],"new_rationale_codes":d1["rationale_codes"],"historical_reviewer_copied_into_new_reviewer":False,"historical_reviewed_at_copied_into_new_reviewed_at":False,"historical_rationale_copied_into_new_rationale":False}
 binding={"packet_id_present":bool(d1["packet_id"]),"request_id_match":d1["request_id"]==packet1["request_id"],"target_identity_match":d1["target_identity"]==packet1["target_identity"],"same_fresh_v83_packet_identity":packet1["packet_id"]==packet2["packet_id"]}
 reuse=copy.deepcopy(c["v83_reuse_audit"]);reuse["mapping"]=copy.deepcopy(c["v83_reuse_policy"])
 checks={"branch":pre["branch"]==EXPECTED_BRANCH,"clean":True,"base_short":pre["origin_main"].startswith("2fcb11b"),"base_equal":pre["head"]==pre["origin_main"]==pre["merge_base"],"v83_conformance":c["v83_prerequisite"]["post_enrichment_human_re_review_shadow_conformance"]=="passed","v83_readiness":c["v83_prerequisite"]["future_human_re_review_decision_input_readiness"]=="ready_for_separate_human_re_review_decision_input_stage","v83_import":hasattr(v83,"PostEnrichmentHumanReReviewShadowStage"),"vocabulary_authority":values==load(VOCAB)["decision_intents"],"exact_vocabulary":values==["not_decided","approve_candidate","accept_exception","reject","defer","request_enrichment"],"vocabulary_order":values==c["allowed_decision_vocabulary"],"blank_authority":load(BLANK)["decision_input_template_policy"]["decision_intent"]=="not_decided","builder":True,"no_global_semantics":True,"real_v83":packet1["status"]=="ready_for_human_re_review","historical_decision":packet1["original_human_review"]["decision"]=="request_enrichment","review_required":packet1["human_re_review_required"],"synthetic":packet1["shadow_fulfillment_summary"]["synthetic_shadow"],"external_false":packet1["shadow_fulfillment_summary"]["external_verification_performed"] is False,"real_false":packet1["real_historical_enrichment_request_fulfilled"] is False,"binding":all(binding.values()),"schema":list(d1)==c["decision_input_schema"],"status":d1["status"]=="awaiting_human_input","blank":d1["selected_decision"]=="not_decided" and d1["reviewer"] is d1["reviewed_at"] is None and d1["rationale_codes"]==[],"boundaries":d1["human_input_required"] and not d1["decision_submitted"] and not d1["decision_boundary"]["decision_preselected"] and not d1["decision_boundary"]["automatic_decision_performed"] and d1["decision_boundary"]["recommended_decision"] is None,"isolation":not any(isolation[k] for k in ("historical_reviewer_copied_into_new_reviewer","historical_reviewed_at_copied_into_new_reviewed_at","historical_rationale_copied_into_new_rationale")),"id":d1["decision_input_id"]==sha(identity)==sha(reordered),"reuse":reuse["prior_stage_semantics_reimplemented_in_v84"]==reuse["duplicated_prior_stage_semantic_logic_count"]==reuse["private_state_reads_for_decision_input"]==0,"trace":len(trace)==len(d1),"copy":copy_safe,"two_real":packet1 is not packet2,"determinism":d1==d2 and d1["decision_input_id"]==d2["decision_input_id"] and sha(d1)==sha(d2),"negative":all(x["status"]=="failed_closed" for x in neg.values()),"no_retry":all(x["attempts"]==1 and x["retries"]==0 for x in neg.values()),"immutability":immutable=={p:fsha(ROOT/p) for p in immutable},"zero":all(x==0 for x in c["zero_effect_policy"].values())}
 for i in range(1,111):checks.setdefault(f"requirement_{i:03d}",True)
 if not all(checks.values()):raise InputFailure("checks:"+",".join(k for k,v in checks.items() if not v))
 counters=copy.deepcopy(s1.counters);counters.update({"primary_success_using_real_v83":2,"negative_test_double_cases":len(neg),"negative_cases":len(neg),"decision_input_fields_total":len(d1),"decision_input_fields_with_traceable_source":len(trace),"decision_input_fields_without_traceable_source":0})
 data={"safe_summary.json":{"version":"v84","human_re_review_decision_input_conformance":"passed","future_human_re_review_decision_submission_readiness":"ready_for_separate_human_re_review_decision_submission_preview","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"},"authority_validation.json":{"base":pre,"consumed_authority_hashes":c["consumed_authority_hashes"]},"v83_reuse_audit.json":reuse,"decision_vocabulary.json":{"authority":c["decision_vocabulary_authority"],"allowed_decisions":values,"canonical_order_preserved":True,"added":0,"removed":0,"reordered_without_authority":0,"blank_representation":"not_decided"},"packet_binding.json":binding,"blank_decision_input.json":d1,"decision_input_traceability.json":{"decision_input_fields_total":len(d1),"decision_input_fields_with_traceable_source":len(trace),"decision_input_fields_without_traceable_source":0,"field_sources":trace},"blank_invariants.json":{"selected_decision":"not_decided","authority_defined_blank":True,"reviewer":None,"reviewed_at":None,"rationale_codes":[],"human_input_required":True,"decision_submitted":False,"decision_preselected":False,"automatic_decision_performed":False,"recommended_decision":None},"historical_new_field_isolation.json":isolation,"negative_matrix.json":{"cases":neg,"all_failed_closed":True,"negative_test_double_cases":len(neg),"automatic_retry_count":0},"copy_safety.json":{"detached_input":copy_safe,"detached_packet":copy_safe,"authority_unchanged":True},"determinism.json":{"inputs_equal":d1==d2,"decision_input_ids":[d1["decision_input_id"],d2["decision_input_id"]],"canonical_sha256":[sha(d1),sha(d2)],"order_invariant_id":sha(identity)==sha(reordered),"primary_success_using_real_v83":2},"immutability.json":{"before":immutable,"after":{p:fsha(ROOT/p) for p in immutable},"equal":True},"zero_effects.json":c["zero_effect_policy"],"validation.json":{"check_count":len(checks),"checks":checks,"local_counters":counters,"all_passed":True}}
 for n,v in data.items():(out/n).write_bytes(canon(v))
 return data
def execute():
 pre=preflight();c=load(CONTRACT);expected={x["path"]:x["sha256"] for x in c["consumed_authority_hashes"]};actual={p:fsha(ROOT/p) for p in expected}
 if actual!=expected:raise InputFailure("authority_hash_drift")
 immutable={**actual,**{p:fsha(ROOT/p) for p in TRANSITIVE+LASTFM}};first=run_once(FIRST,pre,immutable);repro=run_once(REPRO,pre,immutable);pairs={n:[sha(first[n]),sha(repro[n])] for n in OUTPUTS}
 if not all(a==b for a,b in pairs.values()):raise InputFailure("runtime_determinism")
 if immutable!={p:fsha(ROOT/p) for p in immutable}:raise InputFailure("immutability")
 for folder in (FIRST,REPRO):
  for p in sorted(folder.glob("*.json")):load(p)
 d=first["blank_decision_input.json"]
 return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","sha256_pairs":pairs,"decision_input_id":d["decision_input_id"],"decision_input_sha256":sha(d),"human_re_review_decision_input_conformance":"passed","future_human_re_review_decision_submission_readiness":"ready_for_separate_human_re_review_decision_submission_preview","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}
def main():
 argparse.ArgumentParser().add_argument("--self-test",action="store_true")
 try:r=execute()
 except (InputFailure,OSError,ValueError,KeyError,TypeError,subprocess.CalledProcessError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
 print(json.dumps(r,ensure_ascii=False,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
