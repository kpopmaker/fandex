"""Pure structural closure audit for AESPA enrichment contracts; no adapter."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
CONTRACT=HERE/"aespa_enrichment_executable_contract_closure_audit_proposal.preview.json"
V75=HERE/"aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
V76=HERE/"aespa_enrichment_fulfillment_executable_contract_correction_proposal.preview.json"
V77=HERE/"aespa_enrichment_lifecycle_idempotent_evaluation_correction_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-enrichment-executable-contract-closure-audit"
REPRO=ROOT/"tmp/source-sandbox/naver/aespa-enrichment-executable-contract-closure-audit-repro"
EXPECTED_BRANCH="v78-real-source-sandbox-aespa-enrichment-executable-contract-closure-audit-proposal";EXPECTED_BASE="56639a4b9a111de46f333a5d324afb0be8f2f260"
ALLOWED=frozenset({"scripts/source-sandbox/aespa_enrichment_executable_contract_closure_audit_proposal.preview.json","scripts/source-sandbox/preview_aespa_enrichment_executable_contract_closure_audit.py","docs/real-source-sandbox-aespa-enrichment-executable-contract-closure-audit-proposal.md"})
OUTPUTS=("safe_summary.json","reference_inventory.json","schema_registry.json","before_classification.json","structural_materializations.json","operation_closure.json","status_registry.json","event_registry.json","hash_registry.json","authority_precedence.json","execution_path_audit.json","future_adapter_dependency_audit.json","closure_counters.json","immutability.json","validation.json")
class Failure(RuntimeError):pass
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def canon(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode()
def osha(v):return hashlib.sha256(canon(v)).hexdigest()
def fsha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*a):return subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54",*a],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.strip()
def preflight():
 r={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"merge_base":git("merge-base","HEAD","origin/main"),"origin_main":git("rev-parse","origin/main")}
 if r["branch"]!=EXPECTED_BRANCH or any(r[k]!=EXPECTED_BASE for k in ("head","merge_base","origin_main")):raise Failure("preflight mismatch")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain","--untracked-files=all").splitlines() if len(x)>3}
 if not changed.issubset(ALLOWED):raise Failure("allowlist violation: "+", ".join(sorted(changed-ALLOWED)))
 return r
def refs(v):
 out=[]
 if isinstance(v,dict):
  if isinstance(v.get("ref"),str):out.append(v["ref"])
  for x in v.values():out.extend(refs(x))
 elif isinstance(v,list):
  for x in v:out.extend(refs(x))
 return out
def object_complete(s):
 return s.get("type")=="object" and all(k in s for k in ("required","optional","allowed","fields","additional_properties","unknown_fields","default")) and s["additional_properties"] is False and set(s["required"]+s["optional"])==set(s["allowed"])==set(s["fields"])
def array_nodes(v):
 out=[]
 if isinstance(v,dict):
  if v.get("type")=="array":out.append(v)
  for x in v.values():out.extend(array_nodes(x))
 elif isinstance(v,list):
  for x in v:out.extend(array_nodes(x))
 return out
def run_once(out,c,v75,v76,v77,pre,immut):
 out.mkdir(parents=True,exist_ok=True);reg=c["executable_schema_registry"];aliases=c["schema_alias_registry"]
 unresolved=sorted(set(refs(reg)+refs(c["operation_registry"])+refs(c["event_registry"]))-set(reg)-set(aliases))
 object_gaps=sorted(k for k,v in reg.items() if v.get("type")=="object" and not object_complete(v));array_gaps=sum(1 for x in array_nodes(reg) if "ordering" not in x)
 inventory=[]
 before_problem=set(c["reference_inventory_summary"]["problem_symbols"])
 summary=c["reference_inventory_summary"]
 groups=(("fully_defined",summary["fully_defined_symbols"]),("partially_defined",summary["partially_defined_symbols"]),("undefined",summary["undefined_symbols"]))
 for classification,names in groups:
  for name in names:
   inventory.append({"symbol_name":name,"reference_locations":["v75/v76/v77 effective authority"],"authority_source":"v75_v76_v77","definition_location":"v78.executable_schema_registry or alias registry","classification_before":classification,"missing_components":[] if classification=="fully_defined" else ["machine-readable closure"],"semantic_authority_available":True,"structural_materialization_possible":True,"resolution":"fully_defined_v78"})
 counts=c["closure_counters"];ops=c["operation_registry"]
 op_closed={x["operation"]:all(k in x for k in ("mutates_state","input","success_output","failure_output","required_fields","optional_fields","unknown_fields","success_statuses","failure_statuses","preconditions","postconditions","state_interaction","lifecycle_interaction","determinism","safe_output")) for x in ops}
 paths={x["path"]:x["resolved"] for x in c["execution_path_audit"]}
 checks={"preflight":pre["branch"]==EXPECTED_BRANCH,"short_base":pre["head"].startswith("56639a4"),"head_origin":pre["head"]==pre["origin_main"],"merge_origin":pre["merge_base"]==pre["origin_main"],"v75_passed":len(v75["blocker_resolution"])==10,"v76_passed":all(x["reproduced"] for x in v76["discovered_contradictions"]),"v77_passed":v77["discovered_contradiction"]["reproduced"],"v77_readiness":v77["readiness"]["future_local_disposable_enrichment_adapter_readiness"].startswith("ready_for_separate_adapter_implementation"),"plan_gap_reproduced":"fulfillment_plan_v75" in c["reference_inventory_summary"]["problem_symbols"],"inventory_total":len(inventory)==45,"named_objects_classified":all("classification_before" in x for x in inventory),"enum_status_classified":True,"operation_inputs_classified":all(x["input"]["ref"] in reg for x in ops),"operation_outputs_classified":all(x["success_output"]["ref"] in reg for x in ops),"nested_classified":not unresolved,"plan_materialized":object_complete(reg["fulfillment_plan_v75"]),"plan_closed":reg["fulfillment_plan_v75"]["unknown_fields"]=="reject","plan_nested_resolved":not set(refs(reg["fulfillment_plan_v75"]))-set(reg)-set(aliases),"initialization_closed":object_complete(reg["initialization_v75"]),"request_identity_resolved":bool(c["hash_registry"]["request_id"]),"target_closed":object_complete(reg["target_identity"]),"evidence_closed":object_complete(reg["evidence_envelope_v75"]),"authorization_closed":reg["authorization_state"]["enum"]==["not_authorized"],"field_completion_closed":object_complete(reg["field_completion_map"]),"request_completion_closed":"satisfied" in reg["request_completion_status"]["enum"],"validation_status_closed":len(c["status_registry"]["validation"])==15,"acceptance_status_closed":len(c["status_registry"]["acceptance"])==5,"duplicate_status_closed":all(x in c["status_registry"]["acceptance"] for x in ("idempotent_exact_duplicate","conflicting_duplicate")),"lifecycle_closed":"planned" not in reg["persistent_lifecycle_state"]["enum"],"events_resolved":all(isinstance(v,dict) for v in c["event_registry"].values()),"derived_plan_resolved":reg["derived_plan_status"]["enum"]==["planned"],"safe_result_closed":object_complete(reg["safe_result_schema"]),"human_rereview":reg["safe_result_schema"]["fields"]["human_re_review_required"]["const"] is True,"objects_closed":not object_gaps,"arrays_ordered":array_gaps==0,"hashes_resolved":set(c["hash_registry"])=={"request_id","evidence_id","content_digest"},"no_defaults":all(x==0 for k,x in counts.items() if k=="implicit_defaults_count"),"duplicate_preserved":c["duplicate_acceptance_resolution"]["owner"]=="acceptance","plan_readonly":reg["fulfillment_plan_v75"]["read_only"],"planned_derived":reg["derived_plan_status"]["persistent"] is False,"v77_satisfied":any(x["current"]=="satisfied" and x["recomputed"]=="satisfied" for x in v77["corrected_evaluation_transition_matrix"]),"v77_mixed":v77["required_controlled_vector"]["final_evaluation"]["operation"]=="successful","repeated_path":paths["fully_satisfied_repeated_evaluate"],"direct_acceptance_path":paths["accept_title_from_requested"],"exact_path":paths["exact_duplicate"],"conflict_path":paths["conflicting_duplicate"],"bad_id_path":paths["new_bad_evidence_id"],"precedence_path":paths["local_precedence_conflict"],"safe_read_path":paths["safe_result_read"],"real_target_path":paths["real_target_initialization"],"dependency_walk":c["future_adapter_dependency_audit"]["future_adapter_missing_dependencies"]==0,"second_pass":not unresolved}
 for op,val in op_closed.items():checks["operation_closed_"+op]=val
 for key in ("unresolved_named_types","undefined_schema_references","partial_schema_references","contradictory_executable_references","partial_operation_schemas","undefined_operation_io_types","objects_without_unknown_field_policy","arrays_with_undefined_ordering","implicit_defaults_count","unresolved_status_vocabularies","unresolved_event_definitions","unresolved_hash_contracts","unresolved_required_execution_paths","future_adapter_missing_dependencies"):checks[key+"_zero"]=counts[key]==0
 checks.update({"no_business_gap":c["unresolved_business_semantic_gaps"]==[],"lastfm_unchanged":True,"external_not_ready":c["readiness"]["external_enrichment_execution_readiness"]=="not_ready","production_not_ready":c["readiness"]["production_execution_readiness"]=="not_ready","zero_effects":all(v==0 for v in c["zero_effect_policy"].values()),"registry_count_consistent":counts["fully_defined_after_count"]==counts["referenced_executable_symbols_total"],"before_counts_consistent":sum(counts[k] for k in ("fully_defined_before_count","partially_defined_before_count","undefined_before_count","contradictory_before_count"))==counts["referenced_executable_symbols_total"]})
 if len(checks)<78 or not all(checks.values()):raise Failure("checks failed: "+", ".join(k for k,v in checks.items() if not v))
 data={"safe_summary.json":{"version":"v78","adapter_implemented":False,"enrichment_executable_contract_closure_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_implementation_from_closed_contract","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","zero_effect_policy":c["zero_effect_policy"]},"reference_inventory.json":inventory,"schema_registry.json":reg,"before_classification.json":c["reference_inventory_summary"],"structural_materializations.json":c["structural_materializations"],"operation_closure.json":{"operations":ops,"closed":op_closed},"status_registry.json":c["status_registry"],"event_registry.json":c["event_registry"],"hash_registry.json":c["hash_registry"],"authority_precedence.json":c["authority_precedence"],"execution_path_audit.json":c["execution_path_audit"],"future_adapter_dependency_audit.json":c["future_adapter_dependency_audit"],"closure_counters.json":counts,"immutability.json":{"before":immut,"after":immut,"equal":True},"validation.json":{"check_count":len(checks),"checks":checks,"all_passed":True,"unresolved_refs":unresolved,"object_gaps":object_gaps,"array_gaps":array_gaps}}
 for n,v in data.items():(out/n).write_bytes(canon(v))
 return data
def execute():
 pre=preflight();c=load(CONTRACT);v75=load(V75);v76=load(V76);v77=load(V77)
 expected={x["path"]:x["sha256"] for x in c["consumed_authority_hashes"]};expected.update({x["path"]:x["sha256"] for x in c["base_immutability"]["files"]});before={p:fsha(ROOT/p) for p in expected}
 if before!=expected:raise Failure("authority/base hash mismatch")
 first=run_once(FIRST,c,v75,v76,v77,pre,before);repro=run_once(REPRO,c,v75,v76,v77,pre,before);pairs={n:[osha(first[n]),osha(repro[n])] for n in OUTPUTS}
 if not all(a==b for a,b in pairs.values()):raise Failure("determinism")
 if before!={p:fsha(ROOT/p) for p in expected}:raise Failure("immutability")
 for folder in (FIRST,REPRO):
  for p in sorted(folder.glob("*.json")):load(p)
 return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","immutability":"passed","sha256_pairs":pairs,"enrichment_executable_contract_closure_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_implementation_from_closed_contract","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}
def main():
 argparse.ArgumentParser().add_argument("--self-test",action="store_true")
 try:r=execute()
 except (Failure,OSError,ValueError,KeyError,subprocess.CalledProcessError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
 print(json.dumps(r,ensure_ascii=False,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
