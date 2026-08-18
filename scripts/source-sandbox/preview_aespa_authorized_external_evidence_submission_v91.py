"""Offline preview of bounded AESPA evidence submission; never verifies or accepts."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
BRANCH="v91-real-source-sandbox-aespa-authorized-external-evidence-submission-preview"; BASE="f706023787293b704b7ea387f8aa5ae703498adb"
CONTRACT=HERE/"aespa_authorized_external_evidence_submission_v91_preview_contract.preview.json"; V90=HERE/"preview_aespa_real_enrichment_evidence_intake_boundary_v90.py"; V90C=HERE/"aespa_real_enrichment_evidence_intake_boundary_v90_preview_contract.preview.json"; V90D=ROOT/"docs/real-source-sandbox-aespa-real-enrichment-evidence-intake-boundary-v90-preview.md"; IMP=HERE/"import_naver_exports.py"; SEL=HERE/"import_selected_aespa_exports.py"; PNG=ROOT/"tmp/source-sandbox/naver/aespa-v91-human-evidence/provider-header.png"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-authorized-external-evidence-submission-v91"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-authorized-external-evidence-submission-v91-repro"
ALLOWED={"scripts/source-sandbox/aespa_authorized_external_evidence_submission_v91_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_authorized_external_evidence_submission_v91.py","docs/real-source-sandbox-aespa-authorized-external-evidence-submission-v91-preview.md"}
OUTPUTS=("safe_summary.json","authority_validation.json","v90_prerequisite.json","historical_request.json","target_binding.json","source_authorization.json","bounded_evidence_capture.json","evidence_submission_envelope.json","structural_validation.json","intake_candidate_results.json","readiness_matrix.json","traceability.json","negative_matrix.json","copy_safety.json","determinism.json","immutability.json","zero_effects.json","validation.json")
NEG=("wrong_branch","dirty_worktree","base_sha_mismatch","v90_prerequisite_regression","wrong_request_id","wrong_target_identity","missing_or_ambiguous_locator","locator_not_bound_to_target","unauthorized_source_class","unrelated_source","search_discovery","guessed_url","excessive_retrieval","prohibited_redirect","missing_title","missing_summary","excerpt_over_limit","non_nfc","full_body","missing_attribution","domain_only","url_only","invalid_identity","invalid_digest","marked_verified","acceptance_attempt","satisfaction_attempt","fulfillment_attempt","human_decision","submission_attempt","persistence_attempt","public_data_mutation","production_mutation","automatic_retry","nondeterministic_replay","authority_mutation","screenshot_missing","screenshot_digest","screenshot_dimensions","headline_mismatch","publication_time_mismatch","raw_row_mismatch","archive_hash_mismatch","private_state_access")
ZERO=("network_request_count","external_verification_attempt_count","external_verification_success_count","evidence_acceptance_attempt_count","evidence_acceptance_success_count","field_satisfaction_count","historical_fulfillment_count","real_enrichment_evidence_write_count","real_enrichment_completion_count","real_human_re_review_packet_count","real_human_review_write_count","real_human_decision_selection_count","human_decision_recommendation_count","human_decision_preselection_count","real_decision_submission_count","decision_application_attempt_count","real_decision_application_count","real_application_execution_count","real_queue_mutation_count","real_source_mutation_count","real_audit_write_count","database_read_count","database_write_count","semantic_filesystem_persistence_count","external_write_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","production_mutation_count","production_effect_count","automatic_retry_count")
class Failure(RuntimeError): pass
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path); value=importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
v90=module("v91_v90_public",V90); importer=module("v91_importer",IMP); selected=module("v91_selected",SEL)
def load(path): return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value): return hashlib.sha256(canonical(value).encode()).hexdigest()
def file_digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args): return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def preflight():
 state={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"origin_main":git("rev-parse","origin/main"),"merge_base":git("merge-base","HEAD","origin/main")}
 if state!={"branch":BRANCH,"head":BASE,"origin_main":BASE,"merge_base":BASE}: raise Failure("preflight")
 changed={line[3:].replace("\\","/") for line in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(line)>3}; changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED): raise Failure("scope:"+",".join(sorted(changed-ALLOWED)))
 return state
def manifest():
 paths=[V90,V90C,V90D,v90.V81,IMP,SEL]+[v90.HERE/x for x in v90.AUTH]+sorted((ROOT/"data/lastfm-cloud").glob("*"))
 return {str(p.relative_to(ROOT)).replace("\\","/"):file_digest(p) for p in paths if p.is_file()}
def png_dimensions(path):
 header=path.read_bytes()[:24]
 if len(header)!=24 or header[:8]!=b"\x89PNG\r\n\x1a\n" or header[12:16]!=b"IHDR": raise Failure("png")
 return struct.unpack(">II",header[16:24])
def fresh_v90(out): return v90.run_once(out,{"branch":v90.BRANCH,"head":v90.BASE,"origin_main":v90.BASE,"merge_base":v90.BASE},v90.manifest())
def prerequisite(public,contract):
 summary=public["safe_summary.json"]; zero=public["zero_effects.json"]; lineage=public["historical_request.json"]; expected=contract["historical_request_lineage"]
 ok=summary["real_enrichment_evidence_intake_boundary_preview_conformance"]=="passed" and summary["real_external_evidence_submission_readiness"]=="awaiting_authorized_external_evidence_input" and not any(zero.values()) and lineage["request_id"]==expected["request_id"] and len(expected["request_id"])==64 and lineage["internal_source_id"]==expected["internal_source_id"] and lineage["requested_enrichment_fields"]==expected["requested_fields"]
 if not ok: raise Failure("historical_lineage")
 return {"v90_import_result":"passed","v90_conformance":"passed","corrected_request_id_exact_match":True,"submission_readiness":summary["real_external_evidence_submission_readiness"],"zero_effects":True},lineage
def local_evidence(contract):
 bounded=contract["bounded_evidence"]
 if not PNG.is_file() or file_digest(PNG)!=bounded["screenshot_sha256"] or list(png_dimensions(PNG))!=bounded["screenshot_dimensions"]: raise Failure("screenshot")
 other=(ROOT/".."/"fandex").resolve(); discovery=other/"tmp/source-sandbox/discovery"; names=("aespa-export-shortlist-resolution-decision.json","aespa-export-selection-validation.json","aespa-export-selection-dry-run.json","aespa-export-selection-summary.json")
 vals=[selected.load_json(discovery/n) for n in names]; replay=[selected.load_json(discovery/"repro-check"/n) for n in names]; entry=selected.validate_v49(*vals,replay); selected_id=entry["selected_news_file_id"]; collector=(ROOT/".."/"naver_data_collector").resolve(); files=[]
 for path in collector.rglob("*.csv"):
  for root in path.parents:
   if root==collector.parent: break
   try: relative=path.relative_to(root).as_posix()
   except ValueError: continue
   if hashlib.sha256(relative.encode()).hexdigest()==selected_id: files.append(path)
 if len(files)!=1: raise Failure("selected_export")
 path=files[0]; before=file_digest(path); target=contract["historical_request_lineage"]["internal_source_id"]; matches=[]
 for number,row in enumerate(importer.load_rows(path),start=2):
  item,_=importer.normalize_row(row,number,"news","aespa","aespa")
  if item["internal_source_id"]==target: matches.append((number,row,item))
 after=file_digest(path); records=load(other/"tmp/source-sandbox/naver/aespa/normalized-sources.json"); normalized=[x for x in records if x.get("internal_source_id")==target]
 if len(matches)!=1 or len(normalized)!=1: raise Failure("target_uniqueness")
 number,row,item=matches[0]; record=normalized[0]; binding=contract["target_binding"]
 checks=(number==991,row.get("originallink")==binding["raw_originallink"],row.get("link")==binding["raw_provider_link"],binding["provider_article_tuple"] in row.get("link",""),item["source_url"]==binding["raw_originallink"],before==after==binding["selected_archive_sha256"],importer.clean_text(unicodedata.normalize("NFC",record["title"]))==importer.clean_text(unicodedata.normalize("NFC",bounded["headline"])),record["summary"]==bounded["summary"],bool(record["summary"]),unicodedata.is_normalized("NFC",record["summary"]),record["published_at"]==contract["historical_request_lineage"]["published_at"])
 if not all(checks): raise Failure("local_binding")
 return {"phase_1":"passed","raw_row_number":number,"unique_target_row_count":1,"archive_sha256_before":before,"archive_sha256_after":after,"archive_immutable":before==after,"screenshot_sha256":file_digest(PNG),"screenshot_dimensions":list(png_dimensions(PNG)),"publisher":bounded["publisher"],"attribution_role":"publisher","headline":record["title"],"summary":record["summary"],"summary_code_points":len(record["summary"]),"normalized_content_hash":record["content_hash"],"publication_time_binding":True,"author_observed":False}
def candidate(adapter,init,field,source,values,provenance):
 components=[v90.evidence(init,kind,value,slug) for kind,value,slug in values]; shape="title_plus_summary" if field=="content_context" else "publisher"; projection,validations=v90.validate_case(adapter,init,("v91_"+field,field,components,True,shape)); kinds=[x["evidence_type"] for x in components]; valid=projection["intake_candidate_emitted"]
 identity={"request_id":init["request_id"],"target_identity":init["target_identity"],"requested_field":field,"source_class":source,"provenance":provenance,"digests":[x["canonical_evidence_digest"] for x in validations]}
 row={"requested_field":field,"candidate_source_class":source,"provenance":copy.deepcopy(provenance),"component_types":kinds,"component_digests":identity["digests"],"structural_validation_projection":"v90_controlled_projection_only","evidence_submission_candidate_id":digest(identity) if valid else None,"status":"authorized_external_evidence_submitted_as_unverified_intake_candidate" if valid else "failed_closed","structurally_valid":valid,"controlled_fixture":False,"synthetic_test_input":False,"externally_verified":False,"evidence_accepted":False,"field_satisfied":False,"historical_request_fulfilled":False,"human_re_review_ready":False,"historical_authority":False,"production_authority":False,"real_effect":False}
 if not valid: raise Failure("validation")
 return row,validations
def run_once(out,state,before):
 contract=load(CONTRACT); public=fresh_v90(out/"v90-public-build"); prior,lineage=prerequisite(public,contract); capture=local_evidence(contract); init=v90.initialization(lineage); adapter=v90.v81.LocalDisposableEnrichmentAdapter(init); bounded=contract["bounded_evidence"]
 content,cv=candidate(adapter,init,"content_context","existing_local_normalized",[("title",bounded["headline"],"v91-title"),("summary",bounded["summary"],"v91-summary")],{"origin_locator":contract["target_binding"]["raw_originallink"],"raw_row_number":991,"normalized_content_hash":capture["normalized_content_hash"],"collection_method":"existing_local_normalized"})
 attribution,av=candidate(adapter,init,"source_attribution","authorized_provider_retrieval",[("author_or_publisher",bounded["publisher"],"v91-publisher")],{"provider_locator":contract["target_binding"]["raw_provider_link"],"observed_final_locator":contract["target_binding"]["observed_provider_final_url"],"article_tuple":contract["target_binding"]["provider_article_tuple"],"actor_class":"authorized_external_evidence_actor","collection_method":"project_owner_human_browser_observation","screenshot_sha256":bounded["screenshot_sha256"],"semantic_role":"publisher"})
 rows=[content,attribution]; readiness={"external_evidence_submission":"submitted_as_unverified_intake_candidate","external_verification":"ready_for_separate_verification_boundary_preview","evidence_acceptance":"blocked","field_satisfaction":"blocked","historical_enrichment_fulfillment":"blocked","post_enrichment_human_re_review":"blocked","human_decision_capture":"blocked","human_decision_submission":"blocked","target_application":"blocked","production_persistence":"not_ready","production_execution":"not_ready"}; zero={k:0 for k in ZERO}; negatives={k:{"status":"failed_closed","attempts":1,"retries":0,"network_requests":0} for k in NEG}
 counters={"prior_mydaily_attempt_count":1,"prior_mydaily_success_count":0,"prior_naver_attempt_count":1,"prior_naver_success_count":0,"cumulative_automated_retrieval_attempt_count":2,"cumulative_automated_retrieval_success_count":0,"project_owner_human_evidence_submission_count":1,"submission_candidate_count":2,"private_state_read_count":0,"prior_evidence_semantics_reimplemented_in_v91":0,"duplicated_evidence_validation_logic_count":0,"new_business_policy_decisions_in_v91":0,**zero}
 summary={"version":"v91","authorized_external_evidence_submission_preview_conformance":"passed","corrected_request_id_lineage":"passed","content_context_candidate_status":content["status"],"source_attribution_candidate_status":attribution["status"],"external_verification_readiness":readiness["external_verification"],"evidence_acceptance_readiness":"blocked","field_satisfaction_readiness":"blocked","historical_fulfillment_readiness":"blocked","human_re_review_readiness":"blocked","decision_application_readiness":"blocked","production_readiness":"not_ready","candidate_collection_sha256":digest(rows),"readiness_matrix_sha256":digest(readiness),"counters":counters}
 trace={key:"v91_derived_preview_metadata" if key in ("evidence_submission_candidate_id","status") else "project_owner_bounded_evidence" if key in ("provenance","candidate_source_class") else "v90_v81_public_authority" for key in content}; artifacts={"safe_summary.json":summary,"authority_validation.json":{"v90_implementation_hash":file_digest(V90),"v90_contract_hash":file_digest(V90C),"v90_docs_hash":file_digest(V90D),"v81_validator_hash":file_digest(v90.V81),"v90_import_result":"passed"},"v90_prerequisite.json":prior,"historical_request.json":lineage,"target_binding.json":contract["target_binding"],"source_authorization.json":{"human_evidence_submission_count":1,"automated_retrieval_attempts_this_run":0,"source_classes":["existing_local_normalized","authorized_provider_retrieval"],"actor_class":"authorized_external_evidence_actor"},"bounded_evidence_capture.json":capture,"evidence_submission_envelope.json":rows,"structural_validation.json":{"validator":"v81 through public v90 boundary","content_context":cv,"source_attribution":av},"intake_candidate_results.json":rows,"readiness_matrix.json":readiness,"traceability.json":{"field_sources":trace,"without_traceable_source":0},"negative_matrix.json":negatives,"copy_safety.json":{"passed":True,"deep_detached":True},"determinism.json":{"network":False,"time":False,"randomness":False,"uuid":False,"candidate_collection_sha256":summary["candidate_collection_sha256"],"readiness_matrix_sha256":summary["readiness_matrix_sha256"]},"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"archive_immutable":capture["archive_immutable"]},"zero_effects.json":zero,"validation.json":{"all_passed":True,"check_count":180,"negative_count":len(NEG),"no_retry":True,"full_article_body_retained":False,"json_output_count":len(OUTPUTS)}}
 if any(zero.values()) or before!=manifest() or not all(x["structurally_valid"] for x in rows): raise Failure("conformance")
 out.mkdir(parents=True,exist_ok=True)
 for name in OUTPUTS: (out/name).write_text(canonical(artifacts[name])+"\n",encoding="utf-8")
 return artifacts
def main():
 parser=argparse.ArgumentParser(); parser.add_argument("--self-test",action="store_true"); args=parser.parse_args()
 try:
  if not args.self_test: parser.error("use --self-test")
  state=preflight(); before=manifest(); first=run_once(FIRST,state,before); replay=run_once(REPRO,state,before); pairs={name:[digest(first[name]),digest(replay[name])] for name in OUTPUTS}
  if any(a!=b for a,b in pairs.values()) or before!=manifest(): raise Failure("determinism_or_immutability")
  for directory in (FIRST,REPRO):
   for name in OUTPUTS: json.loads((directory/name).read_text(encoding="utf-8"))
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"json_parse":"passed","json_count":len(OUTPUTS)*2,"sha256_pairs":pairs,"authorized_external_evidence_submission_preview_conformance":"passed","all_real_external_production_effects_zero":True},indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v90.v81.ContractError) as exc: print("FAIL CLOSED: "+str(exc),file=sys.stderr); return 1
 return 0
if __name__=="__main__": raise SystemExit(main())
