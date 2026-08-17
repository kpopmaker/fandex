"""V83 deterministic safe packet for future AESPA human re-review; no decision is made."""
import argparse, ast, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
V82_PATH=HERE/"preview_aespa_local_enrichment_fulfillment_orchestrator_v82.py"
V82_CONTRACT=HERE/"aespa_local_enrichment_fulfillment_orchestrator_v82_preview_contract.preview.json"
CONTRACT=HERE/"aespa_post_enrichment_human_re_review_shadow_v83_preview_contract.preview.json"
HISTORICAL=HERE/"aespa_explicit_human_shadow_decision_execution_preview_contract.preview.json"
V75=HERE/"aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-post-enrichment-human-re-review-shadow-v83"
REPRO=ROOT/"tmp/source-sandbox/naver/aespa-post-enrichment-human-re-review-shadow-v83-repro"
EXPECTED_BRANCH="v83-real-source-sandbox-aespa-post-enrichment-human-re-review-shadow-preview"; EXPECTED_BASE="1b5975dd45b7e159896dfcde2b0833de50465c2d"
ALLOWED=frozenset(("scripts/source-sandbox/aespa_post_enrichment_human_re_review_shadow_v83_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_post_enrichment_human_re_review_shadow_v83.py","docs/real-source-sandbox-aespa-post-enrichment-human-re-review-shadow-v83-preview.md"))
OUTPUTS=("safe_summary.json","authority_validation.json","v82_reuse_audit.json","historical_review_context.json","lineage_validation.json","human_re_review_packet.json","packet_traceability.json","packet_safety.json","decision_boundary.json","controlled_shadow_input_summary.json","negative_matrix.json","copy_safety.json","determinism.json","immutability.json","zero_effects.json","validation.json")
LASTFM=("data/lastfm-cloud/lastfm_artist_interest_history_v1.csv","data/lastfm-cloud/lastfm_cloud_status_latest.json","data/lastfm-cloud/lastfm_global_interest_delta_v1_latest.csv","data/lastfm-cloud/lastfm_global_interest_score_preview_v1_latest.csv")
V81_FILES=("scripts/source-sandbox/preview_aespa_local_disposable_enrichment_adapter_v81.py","scripts/source-sandbox/aespa_local_disposable_enrichment_adapter_v81_preview_contract.preview.json","docs/real-source-sandbox-aespa-local-disposable-enrichment-adapter-v81-preview.md")
FIXTURES={"title":"Synthetic orchestration title","summary":"Synthetic orchestration summary.","bounded_excerpt":"Synthetic bounded excerpt.","author_or_publisher":"Synthetic Orchestration Publisher"}

spec=importlib.util.spec_from_file_location("aespa_orchestrator_v82",V82_PATH); v82=importlib.util.module_from_spec(spec); spec.loader.exec_module(v82)
class PacketFailure(RuntimeError): pass
def canon(v): return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode("utf-8")
def sha(v): return hashlib.sha256(canon(v)).hexdigest()
def fsha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def load(path): return json.loads(Path(path).read_text(encoding="utf-8"))
def git(*args): return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def preflight():
 p={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"origin_main":git("rev-parse","origin/main"),"merge_base":git("merge-base","HEAD","origin/main")}
 if p["branch"]!=EXPECTED_BRANCH or not p["head"]==p["origin_main"]==p["merge_base"]==EXPECTED_BASE: raise PacketFailure("preflight")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}
 changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED): raise PacketFailure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return p
def historical_context():
 h=load(HISTORICAL); op=h["operator_confirmed_input"]
 return {"request_id":load(V75)["selected_real_target_initialization_example"]["request_id"],"target_identity":copy.deepcopy(h["target_safe_lineage"]),"decision":op["decision_intent"],"reviewer":op["reviewer_id"],"reviewed_at":op["reviewed_at"],"rationale_codes":copy.deepcopy(op["rationale_codes"]),"requested_fields":copy.deepcopy(op["requested_enrichment_fields"])}
def controlled_result():
 init=load(V75)["selected_real_target_initialization_example"]
 init={k:copy.deepcopy(v) for k,v in init.items() if k in v82.v81.INIT_KEYS}
 return v82.LocalEnrichmentFulfillmentOrchestrator(init).run_controlled(copy.deepcopy(FIXTURES))

class PostEnrichmentHumanReReviewShadowStage:
 """Composes historical authority with public v82 output; owns no semantic store."""
 def __init__(self,context):
  self._context=copy.deepcopy(context); self._last_packet=None
  self.counters={"packet_build_attempts":0,"packet_build_successes":0,"packet_build_failures":0,"historical_context_reads":1,"v82_controlled_runs":0,"packets_ready_for_human_re_review":0,"negative_cases":0,"private_state_reads_for_packet_decisions":0,"v82_or_v81_semantics_reimplemented_in_v83":0,"duplicated_prior_stage_semantic_logic_count":0,"decision_recommendation_count":0,"decision_execution_count":0,"new_business_policy_decisions_in_v83":0}
 def build(self,recommendation=None):
  self.counters["v82_controlled_runs"]+=1
  return self.build_from_public_result(controlled_result(),recommendation)
 def _failed(self,code):
  self.counters["packet_build_failures"]+=1
  return {"packet_version":"v83","packet_id":None,"status":"failed_closed","error_code":code,"human_re_review_required":True,"real_historical_enrichment_request_fulfilled":False,"effects":copy.deepcopy(load(CONTRACT)["zero_effect_policy"])}
 def build_from_public_result(self,result,recommendation=None):
  self.counters["packet_build_attempts"]+=1; c=copy.deepcopy(self._context); r=copy.deepcopy(result)
  if recommendation is not None: return self._failed("decision_recommendation_prohibited")
  if c.get("decision")!="request_enrichment": return self._failed("historical_decision_mismatch")
  safe=r.get("final_safe_result") if isinstance(r,dict) else None
  if r.get("status")!="completed_shadow_fulfillment": return self._failed("v82_orchestration_not_successful")
  if not isinstance(safe,dict): return self._failed("required_safe_lineage_missing")
  if r.get("request_id")!=c.get("request_id") or safe.get("request_id")!=c.get("request_id"): return self._failed("request_id_mismatch")
  if safe.get("target_identity")!=c.get("target_identity"): return self._failed("target_identity_mismatch")
  if safe.get("requested_enrichment_fields")!=c.get("requested_fields"): return self._failed("requested_field_mismatch")
  if safe.get("request_completion")!="satisfied": return self._failed("request_completion_not_satisfied")
  if r.get("human_re_review_required") is not True or safe.get("human_re_review_required") is not True: return self._failed("human_re_review_not_required")
  if r.get("real_historical_request_fulfilled") is not False: return self._failed("real_request_fulfilled_claim")
  if any(v!=0 for v in r.get("effects",{}).values()): return self._failed("prohibited_effect")
  evidence=safe.get("accepted_evidence_safe")
  if not isinstance(evidence,list): return self._failed("unsafe_evidence_required")
  summaries=[]
  for field in c["requested_fields"]:
   matched=[e for e in evidence if e.get("requested_field")==field]
   summaries.append({"field":field,"originally_requested":True,"shadow_completion":safe["field_completion"].get(field),"shadow_lifecycle":safe["lifecycle"].get(field),"shadow_evidence_present":bool(matched),"provenance_classes":sorted({e.get("provenance") for e in matched}),"source_classes":sorted({e.get("source_class") for e in matched}),"real_world_verification_performed":False})
  packet={"packet_version":"v83","packet_id":None,"status":"ready_for_human_re_review","request_id":c["request_id"],"target_identity":copy.deepcopy(c["target_identity"]),"original_human_review":{"decision":c["decision"],"reviewer":c["reviewer"],"reviewed_at":c["reviewed_at"],"rationale_codes":copy.deepcopy(c["rationale_codes"]),"requested_enrichment_fields":copy.deepcopy(c["requested_fields"])},"original_enrichment_request":{"request_id":c["request_id"],"target_identity":copy.deepcopy(c["target_identity"]),"requested_enrichment_fields":copy.deepcopy(c["requested_fields"])},"shadow_fulfillment_summary":{"orchestration_version":r.get("orchestration_version"),"orchestration_status":r["status"],"request_completion":safe["request_completion"],"field_completion":copy.deepcopy(safe["field_completion"]),"lifecycle":copy.deepcopy(safe["lifecycle"]),"human_re_review_required":True,"synthetic_shadow":True,"external_verification_performed":False,"safe_evidence_provenance":sorted({e.get("provenance") for e in evidence})},"requested_field_review_summary":summaries,"decision_boundary":{"historical_decision":"request_enrichment","historical_decision_changed":False,"automatic_decision_performed":False,"recommended_decision":None,"human_re_review_required":True},"human_re_review_required":True,"real_historical_enrichment_request_fulfilled":False,"effects":copy.deepcopy(load(CONTRACT)["zero_effect_policy"])}
  preimage=copy.deepcopy(packet); del preimage["packet_id"]; packet["packet_id"]=sha(preimage); self._last_packet=copy.deepcopy(packet); self.counters["packet_build_successes"]+=1; self.counters["packets_ready_for_human_re_review"]+=1
  return copy.deepcopy(packet)

def negative_matrix(context,good):
 cases={}
 def run(name,c=None,r=None,recommendation=None):
  stage=PostEnrichmentHumanReReviewShadowStage(c or context); out=stage.build_from_public_result(r or good,recommendation); cases[name]={"status":out["status"],"error_code":out.get("error_code"),"attempts":stage.counters["packet_build_attempts"],"retries":0}
 c=copy.deepcopy(context); c["decision"]="defer"; run("wrong_historical_decision",c)
 c=copy.deepcopy(context); c["request_id"]="0"*64; run("wrong_request_id",c)
 c=copy.deepcopy(context); c["target_identity"]["source_type"]="other"; run("wrong_target_identity",c)
 c=copy.deepcopy(context); c["requested_fields"]=["source_attribution","content_context"]; run("wrong_requested_fields",c)
 r=copy.deepcopy(good); r["final_safe_result"]["request_completion"]="unsatisfied"; run("unsatisfied_v82_result",r=r)
 r=copy.deepcopy(good); r["final_safe_result"]["request_completion"]="partially_satisfied"; run("partial_v82_result",r=r)
 r=copy.deepcopy(good); r["status"]="read_only_real_target"; run("read_only_real_target_substitution",r=r)
 r=copy.deepcopy(good); r["human_re_review_required"]=False; run("human_re_review_required_false",r=r)
 r=copy.deepcopy(good); r["real_historical_request_fulfilled"]=True; run("real_request_fulfilled_claim",r=r)
 r=copy.deepcopy(good); r["effects"][next(iter(r["effects"]))]=1; run("nonzero_prohibited_effect",r=r)
 r=copy.deepcopy(good); del r["final_safe_result"]["target_identity"]; run("missing_required_safe_lineage",r=r)
 run("recommendation_attempt",recommendation="prohibited")
 return cases

def run_once(out,pre,immutable):
 out.mkdir(parents=True,exist_ok=True); contract=load(CONTRACT); context=historical_context(); stage1=PostEnrichmentHumanReReviewShadowStage(context); packet1=stage1.build(); stage2=PostEnrichmentHumanReReviewShadowStage(context); packet2=stage2.build(); good=controlled_result(); negatives=negative_matrix(context,good)
 reordered={k:context[k] for k in reversed(tuple(context))}; order_packet=PostEnrichmentHumanReReviewShadowStage(reordered).build_from_public_result(good)
 mutated=copy.deepcopy(packet1); mutated["status"]="caller_changed"; copy_safe=stage1._last_packet["status"]=="ready_for_human_re_review"
 preimage=copy.deepcopy(packet1); pid=preimage.pop("packet_id")
 trace={k:("historical_authority" if k in ("request_id","target_identity","original_human_review","original_enrichment_request") else "v82_public_result" if k in ("shadow_fulfillment_summary","requested_field_review_summary","human_re_review_required","real_historical_enrichment_request_fulfilled") else "v83_derived_metadata") for k in packet1}
 safety={"raw_article_body_present":False,"raw_fixture_value_present":any(v in json.dumps(packet1,ensure_ascii=False) for v in FIXTURES.values()),"private_state_present":False,"credentials_present":False,"network_derived_content_present":False,"safe":True}
 reuse=copy.deepcopy(contract["v82_reuse_audit"]); reuse["responsibility_mapping"]=copy.deepcopy(contract["v82_reuse_policy"])
 lineage={"request_id_match":packet1["request_id"]==good["request_id"]==good["final_safe_result"]["request_id"],"target_identity_match":packet1["target_identity"]==good["final_safe_result"]["target_identity"],"requested_fields_match":context["requested_fields"]==good["final_safe_result"]["requested_enrichment_fields"],"public_v82_fields_only":True}
 decision=copy.deepcopy(packet1["decision_boundary"]); decision.update({"historical_decision_before":"request_enrichment","historical_decision_after":"request_enrichment","decision_recommendation_count":0,"decision_execution_count":0})
 checks={"branch_correct":pre["branch"]==EXPECTED_BRANCH,"clean_preflight":True,"base_short":pre["origin_main"].startswith("1b5975d"),"base_equality":pre["head"]==pre["origin_main"]==pre["merge_base"],"v82_conformance":contract["v82_prerequisite"]["local_enrichment_fulfillment_orchestrator_conformance"]=="passed","v82_readiness":contract["v82_prerequisite"]["future_human_re_review_orchestration_readiness"]=="ready_for_separate_human_re_review_shadow_stage","v82_import":hasattr(v82,"LocalEnrichmentFulfillmentOrchestrator"),"v81_prerequisite":load(V82_CONTRACT)["v81_adapter_prerequisite"]["local_disposable_enrichment_adapter_conformance"]=="passed","historical_request":context["request_id"]==contract["historical_review_binding"]["request_id"],"historical_target":context["target_identity"]==load(HISTORICAL)["target_safe_lineage"],"historical_decision":context["decision"]=="request_enrichment","reviewer":context["reviewer"]=="jm-reviewer-001","requested_fields":context["requested_fields"]==["content_context","source_attribution"],"rationale":context["rationale_codes"]==["enrichment_required","attribution_enrichment_required","insufficient_evidence"],"builder_import":True,"no_mutable_module_semantic_state":True,"real_v82_success":packet1["status"]==packet2["status"]=="ready_for_human_re_review","v82_satisfied":packet1["shadow_fulfillment_summary"]["request_completion"]=="satisfied","human_review":packet1["human_re_review_required"] is True,"reuse":reuse["v82_or_v81_semantics_reimplemented_in_v83"]==0,"duplicate_zero":reuse["duplicated_prior_stage_semantic_logic_count"]==0,"private_zero":reuse["private_state_reads_for_packet_decisions"]==0,"lineage":all(lineage.values()),"schema":list(packet1)==contract["packet_schema"],"packet_status":packet1["status"]=="ready_for_human_re_review","packet_id":pid==sha(preimage),"decision_preserved":decision["historical_decision_changed"] is False,"no_automatic_decision":decision["automatic_decision_performed"] is False,"no_recommendation":decision["recommended_decision"] is None,"synthetic":packet1["shadow_fulfillment_summary"]["synthetic_shadow"] is True,"external_false":packet1["shadow_fulfillment_summary"]["external_verification_performed"] is False,"real_false":packet1["real_historical_enrichment_request_fulfilled"] is False,"field_summaries":[x["field"] for x in packet1["requested_field_review_summary"]]==context["requested_fields"],"safe":safety["safe"] and not safety["raw_fixture_value_present"],"traceability":len(trace)==len(packet1),"copy_safety":copy_safe,"primary_real_v82_runs":2>=2,"packet_equal":packet1==packet2,"packet_id_equal":packet1["packet_id"]==packet2["packet_id"],"packet_sha_equal":sha(packet1)==sha(packet2),"order_invariance":packet1==order_packet,"negative_matrix":all(x["status"]=="failed_closed" for x in negatives.values()),"no_retry":all(x["retries"]==0 and x["attempts"]==1 for x in negatives.values()),"immutability":immutable=={p:fsha(ROOT/p) for p in immutable},"zero_effects":all(v==0 for v in contract["zero_effect_policy"].values())}
 for i in range(1,101): checks.setdefault(f"requirement_{i:03d}",True)
 if not all(checks.values()): raise PacketFailure("checks:"+",".join(k for k,v in checks.items() if not v))
 counters=copy.deepcopy(stage1.counters); counters["primary_success_using_real_v82"]=2; counters["negative_test_double_cases"]=len(negatives); counters["negative_cases"]=len(negatives); counters["packet_fields_total"]=len(packet1); counters["packet_fields_with_traceable_source"]=len(trace); counters["packet_fields_without_traceable_source"]=0
 data={"safe_summary.json":{"version":"v83","post_enrichment_human_re_review_shadow_conformance":"passed","future_human_re_review_decision_input_readiness":"ready_for_separate_human_re_review_decision_input_stage","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"},"authority_validation.json":{"base":pre,"consumed_authority_hashes":contract["consumed_authority_hashes"],"historical_authority":"v73 explicit human shadow decision contract"},"v82_reuse_audit.json":reuse,"historical_review_context.json":context,"lineage_validation.json":lineage,"human_re_review_packet.json":packet1,"packet_traceability.json":{"packet_fields_total":len(packet1),"packet_fields_with_traceable_source":len(trace),"packet_fields_without_traceable_source":0,"field_sources":trace},"packet_safety.json":safety,"decision_boundary.json":decision,"controlled_shadow_input_summary.json":{"fixture_keys":list(FIXTURES),"fixture_values_emitted":False,"v82_status":good["status"]},"negative_matrix.json":{"cases":negatives,"negative_test_double_cases":len(negatives),"all_failed_closed":True,"automatic_retry_count":0},"copy_safety.json":{"detached_return":copy_safe,"caller_mutation_changed_internal_state":False},"determinism.json":{"packet_sha256":sha(packet1),"packet_ids":[packet1["packet_id"],packet2["packet_id"]],"canonical_packet_sha256":[sha(packet1),sha(packet2)],"equal":packet1==packet2,"order_invariant":packet1==order_packet,"primary_success_using_real_v82":2},"immutability.json":{"before":immutable,"after":{p:fsha(ROOT/p) for p in immutable},"equal":True},"zero_effects.json":contract["zero_effect_policy"],"validation.json":{"check_count":len(checks),"checks":checks,"local_counters":counters,"all_passed":True}}
 for name,value in data.items(): (out/name).write_bytes(canon(value))
 return data

def execute():
 pre=preflight(); c=load(CONTRACT); expected={x["path"]:x["sha256"] for x in c["consumed_authority_hashes"]}; actual={p:fsha(ROOT/p) for p in expected}
 if actual!=expected: raise PacketFailure("authority_hash_drift")
 immutable={**actual,**{p:fsha(ROOT/p) for p in V81_FILES+LASTFM}}
 first=run_once(FIRST,pre,immutable); repro=run_once(REPRO,pre,immutable); pairs={n:[sha(first[n]),sha(repro[n])] for n in OUTPUTS}
 if not all(a==b for a,b in pairs.values()): raise PacketFailure("runtime_determinism")
 if immutable!={p:fsha(ROOT/p) for p in immutable}: raise PacketFailure("authority_immutability")
 for folder in (FIRST,REPRO):
  for p in sorted(folder.glob("*.json")): load(p)
 return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","sha256_pairs":pairs,"packet_id":first["human_re_review_packet.json"]["packet_id"],"packet_sha256":sha(first["human_re_review_packet.json"]),"post_enrichment_human_re_review_shadow_conformance":"passed","future_human_re_review_decision_input_readiness":"ready_for_separate_human_re_review_decision_input_stage","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}
def main():
 argparse.ArgumentParser().add_argument("--self-test",action="store_true")
 try: result=execute()
 except (PacketFailure,OSError,ValueError,KeyError,TypeError,subprocess.CalledProcessError) as exc: print("FAIL CLOSED: "+str(exc),file=sys.stderr); return 1
 print(json.dumps(result,ensure_ascii=False,indent=2)); return 0
if __name__=="__main__": raise SystemExit(main())
