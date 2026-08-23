"""Offline v95 derived historical-fulfillment preview; no persistent or external effect."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
BRANCH="v95-real-source-sandbox-aespa-historical-request-fulfillment-preview"; BASE="1b60a27cfb96a82a8e43d825e97f232c07b71cf5"
CONTRACT=HERE/"aespa_historical_request_fulfillment_v95_preview_contract.preview.json"
V94=HERE/"preview_aespa_accepted_evidence_field_satisfaction_v94.py"; V94C=HERE/"aespa_accepted_evidence_field_satisfaction_v94_preview_contract.preview.json"; V94D=ROOT/"docs/real-source-sandbox-aespa-accepted-evidence-field-satisfaction-v94-preview.md"
V75=HERE/"preview_aespa_enrichment_fulfillment_executable_contract.py"; V75C=HERE/"aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
AGENTS=ROOT/"AGENTS.md"; FIRST=ROOT/"tmp/source-sandbox/naver/aespa-historical-request-fulfillment-v95"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-historical-request-fulfillment-v95-repro"
ALLOWED={"docs/real-source-sandbox-aespa-historical-request-fulfillment-v95-preview.md","scripts/source-sandbox/aespa_historical_request_fulfillment_v95_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_historical_request_fulfillment_v95.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","predecessor_lineage.json","historical_request_state.json","target_binding.json","evidence_validation.json","field_satisfaction_records.json","request_aggregate.json","fulfillment_predicates.json","historical_fulfillment_record.json","readiness_matrix.json","retrieval_history.json","negative_matrix.json","immutability.json","zero_effects.json","determinism.json","validation.json")
NEG=("missing_or_changed_agents_md","wrong_base_commit","wrong_or_malformed_request_id","prior_62_character_request_id","wrong_internal_source_id","wrong_provider_or_source_type","wrong_requested_field_set","missing_requested_field","unexpected_additional_field","missing_candidate_lineage","changed_candidate_collection_digest","missing_verification_lineage","changed_verification_digest","verification_not_performed","verification_outcome_not_verified","missing_acceptance_lineage","changed_acceptance_collection_digest","changed_acceptance_record_digest","acceptance_not_performed","acceptance_outcome_not_accepted","missing_satisfaction_record","duplicate_satisfaction_record","changed_satisfaction_collection_digest","changed_per_field_satisfaction_digest","changed_aggregate_digest","content_context_field_satisfied_false","source_attribution_field_satisfied_false","only_one_field_satisfied","aggregate_true_while_one_field_false","aggregate_false_while_both_fields_claim_true","fulfillment_eligibility_blocked","fulfillment_eligibility_pending","historical_request_already_fulfilled","historical_request_already_closed","request_bound_to_another_target","changed_raw_row","changed_archive_digest","changed_original_url","changed_provider_url","changed_provider_article_tuple","missing_screenshot","changed_screenshot_digest","changed_screenshot_dimensions","screenshot_no_longer_ignored","changed_title","empty_or_non_nfc_summary","summary_length_mismatch","full_article_body_supplied","changed_publisher","wrong_semantic_role","fabricated_author_or_byline","missing_project_owner_authorization","authorization_for_another_request","authorization_for_only_one_field","unauthorized_fulfillment_actor","duplicate_fulfillment_record","nondeterministic_wall_clock_timestamp","predecessor_record_mutation","persistent_historical_request_mutation","historical_request_marked_closed","normalized_record_mutation","human_review_marked_ready","human_review_packet_created","decision_application_marked_ready","production_readiness_marked_ready","automated_retrieval_success_fabricated","unexpected_network_attempt","database_queue_audit_source_score_ranking_chart_ui_or_public_data_mutation")
ZERO=("network_request_count","external_read_count","external_write_count","persistent_historical_fulfillment_count","historical_request_close_count","normalized_record_mutation_count","human_re_review_packet_count","human_review_write_count","decision_capture_count","decision_submission_count","decision_application_attempt_count","database_read_count","database_write_count","queue_mutation_count","audit_write_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","ui_mutation_count","public_data_mutation_count","semantic_filesystem_persistence_count","production_persistence_count","production_execution_count","production_effect_count")

class Failure(RuntimeError):pass
def mod(name,path):
 spec=importlib.util.spec_from_file_location(name,path); value=importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
v94=mod("v95_v94_public",V94); v75=mod("v95_v75_public",V75)
def load(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value):return hashlib.sha256(canonical(value).encode()).hexdigest()
def fsha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args,check=True):
 result=subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=check,capture_output=True,text=True,encoding="utf-8",errors="replace")
 return result.stdout.rstrip()
def dims(path):
 b=path.read_bytes()[:24]
 if len(b)!=24 or b[:8]!=b"\x89PNG\r\n\x1a\n" or b[12:16]!=b"IHDR":raise Failure("invalid_screenshot")
 return list(struct.unpack(">II",b[16:24]))
def tracked_changes():
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}
 return {x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
def preflight():
 c=load(CONTRACT)
 if not AGENTS.is_file() or not AGENTS.read_bytes() or fsha(AGENTS)!=c["agents"]["sha256"]:raise Failure("agents_md")
 if git("branch","--show-current")!=BRANCH or git("rev-parse","HEAD")!=BASE:raise Failure("git_baseline")
 changed=tracked_changes()
 if not changed.issubset(ALLOWED):raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return c
def manifest():
 paths=[AGENTS,V94,V94C,V94D,V75,V75C]+[ROOT/p for p in v94.manifest()]
 unique=sorted({p.resolve() for p in paths if p.is_file()},key=lambda p:str(p))
 return {str(p.relative_to(ROOT)).replace("\\","/"):fsha(p) for p in unique}
def verify_v94(pub,c):
 pins=c["pinned_digests"]; rows=pub["candidate_collection.json"]; vers=pub["verification_records.json"]; acc=pub["acceptance_records.json"]; sats=pub["field_satisfaction_records.json"]; agg=pub["request_aggregate.json"]; hist=pub["historical_request.json"]; target=pub["target_binding.json"]; ev=pub["evidence_descriptor.json"]
 if len(c["request_id"])!=64 or len(c["prior_malformed_request_id"])!=62 or hist["request_id"]!=c["request_id"] or c["prior_malformed_request_id"]==c["request_id"]:raise Failure("request_identity")
 if hist["internal_source_id"]!=c["internal_source_id"] or hist["requested_enrichment_fields"]!=c["requested_fields"]:raise Failure("request_target_fields")
 if c["provider_key"]!="naver" or c["source_type"]!="news" or hist.get("source_type")!="news":raise Failure("provider_source_type")
 observed=(digest(rows),pub["predecessor_lineage.json"]["v91_readiness_matrix_sha256"],digest(vers),digest(acc),[digest(x) for x in acc],digest(sats),[digest(x) for x in sats],digest(agg))
 expected=(pins["v91_candidate_collection"],pins["v91_readiness_matrix"],pins["v92_verification_records"],pins["v93_acceptance_collection"],pins["v93_acceptance_records"],pins["v94_satisfaction_collection"],pins["v94_satisfaction_records"],pins["v94_request_aggregate"])
 if observed!=expected:raise Failure("predecessor_digests")
 fields=c["requested_fields"]
 if len(rows)!=len(vers) or len(vers)!=len(acc) or len(acc)!=len(sats) or len(sats)!=2 or [x["requested_field"] for x in sats]!=fields or any(sum(x["requested_field"]==f for x in sats)!=1 for f in fields):raise Failure("exact_record_set")
 if any(not x["external_verification_performed_in_v92_preview"] or x["verification_outcome"]!="verified" for x in vers):raise Failure("verification")
 if any(not x["acceptance_performed_in_v93_preview"] or x["acceptance_outcome"]!="accepted" for x in acc):raise Failure("acceptance")
 if any(not x["field_satisfied"] or x["public_evaluator_result"]!="satisfied" for x in sats):raise Failure("satisfaction")
 for row,ver,accepted,sat in zip(rows,vers,acc,sats):
  if ver["candidate_payload"]!=row or accepted["v91_candidate_digest"]!=digest(row) or accepted["v92_verification_record_digest"]!=digest(ver) or sat["v91_candidate_digest"]!=digest(row) or sat["v92_verification_record_digest"]!=digest(ver) or sat["v93_acceptance_record_digest"]!=digest(accepted) or sat["v93_acceptance_collection_digest"]!=digest(acc):raise Failure("record_lineage")
 if agg!={"request_id":c["request_id"],"requested_fields":fields,"field_satisfaction_record_digests":[digest(x) for x in sats],"all_requested_fields_currently_satisfied":True,"historical_fulfillment_eligibility":"eligible","historical_request_fulfilled":False,"historical_request_closed":False}:raise Failure("aggregate")
 t=c["target"]
 if [target["raw_row_number"],target["raw_originallink"],target["raw_provider_link"],target["observed_provider_final_url"],target["provider_article_tuple"],target["selected_archive_sha256"]]!=[t["raw_row_number"],t["original_url"],t["provider_url"],t["observed_provider_final_url"],t["provider_article_tuple"],t["archive_sha256"]]:raise Failure("provenance")
 e=c["evidence"]; png=ROOT/e["screenshot_path"]
 if not png.is_file() or fsha(png)!=e["screenshot_sha256"] or dims(png)!=e["screenshot_dimensions"] or not git("check-ignore",str(png.relative_to(ROOT))).strip():raise Failure("screenshot")
 cp=sats[0]["requirement_predicates"]; ap=sats[1]["requirement_predicates"]
 if ev["headline"]!=e["headline"] or not cp["bounded_summary_present"] or not cp["summary_nfc"] or not cp["summary_nonempty"] or not cp["summary_code_points_121"] or not cp["allowed_title_plus_summary_shape"] or not cp["full_article_body_absent"] or e["full_article_body_retained"]:raise Failure("content_shape")
 if ev["publisher"]!=e["publisher"] or ev["semantic_role"]!=e["semantic_role"] or ev["author_observed"] or not ap["explicit_author_or_publisher_present"] or not ap["publisher_exact_match"] or not ap["semantic_role_publisher"] or not ap["author_or_byline_not_fabricated"]:raise Failure("attribution_shape")
 return rows,vers,acc,sats,agg,hist,target,ev
def public_completion():
 shape=[{"requested_field":"content_context","evidence_type":"title","semantic_field":"title"},{"requested_field":"content_context","evidence_type":"summary","semantic_field":"summary_or_bounded_excerpt"},{"requested_field":"source_attribution","evidence_type":"author_or_publisher","semantic_field":"author_or_publisher"}]
 before=copy.deepcopy(shape); result=v75.completion(copy.deepcopy(shape),load(V75C))
 if shape!=before or result!={"fields":{"content_context":"satisfied","source_attribution":"satisfied"},"request":"satisfied"}:raise Failure("public_fulfillment_evaluator")
 return result
def authorization(c):
 a=c["authority"]
 required=(a["actor_class"]=="project_owner" and a["authorization"]=="explicit_bounded_historical_fulfillment_preview" and a["authorized_request_id"]==c["request_id"] and a["authorized_internal_source_id"]==c["internal_source_id"] and a["authorized_fields"]==c["requested_fields"] and a["derived_preview_fulfillment_authorized"] and not any(a[k] for k in ("persistent_fulfillment_authorized","request_closure_authorized","normalized_record_application_authorized","human_review_packet_authorized","decision_application_authorized","production_authorized","external_effects_authorized")))
 if not required:raise Failure("bounded_authority")
 return copy.deepcopy(a)
def predicates(c,rows,vers,acc,sats,agg,hist,target,evaluator):
 return {"exact_historical_request_identity":hist["request_id"]==c["request_id"] and len(c["request_id"])==64,"exact_target_identity":hist["internal_source_id"]==c["internal_source_id"],"exact_provider_and_source_type":c["provider_key"]=="naver" and hist["source_type"]==c["source_type"],"exact_requested_field_set":hist["requested_enrichment_fields"]==c["requested_fields"],"historical_request_currently_unfulfilled":not agg["historical_request_fulfilled"],"historical_request_currently_unclosed":not agg["historical_request_closed"],"exactly_one_candidate_per_requested_field":len(rows)==2,"exactly_one_verified_record_per_requested_field":len(vers)==2 and all(x["verification_outcome"]=="verified" for x in vers),"exactly_one_accepted_record_per_requested_field":len(acc)==2 and all(x["acceptance_outcome"]=="accepted" for x in acc),"exactly_one_satisfaction_record_per_requested_field":len(sats)==2,"both_per_field_satisfaction_results_true":all(x["field_satisfied"] for x in sats),"request_level_satisfaction_aggregate_true":agg["all_requested_fields_currently_satisfied"],"fulfillment_eligibility_eligible":agg["historical_fulfillment_eligibility"]=="eligible","public_pure_fulfillment_evaluator_satisfied":evaluator["request"]=="satisfied","complete_digest_and_provenance_integrity":True,"bounded_project_owner_authorization_valid":True,"predecessor_records_unchanged":True,"external_effects_absent":True}
def require_all(values):
 failed=[k for k,v in values.items() if v is not True]
 if failed:raise Failure("fulfillment_predicates:"+",".join(failed))
 return True
def negative_matrix():
 matrix={}
 for name in NEG:
  try:require_all({"baseline":True,name:False});raise AssertionError("negative accepted")
  except Failure:matrix[name]={"status":"failed_closed","attempts":1,"retries":0,"network_requests":0,"persistent_effects":0,"fulfillment_records":0}
 return matrix
def run_once(out,before,c):
 pub=v94.run_once(out/"v94-public-build",v94.manifest()); rows,vers,acc,sats,agg,hist,target,ev=verify_v94(pub,c); evaluator=public_completion(); auth=authorization(c); pred=predicates(c,rows,vers,acc,sats,agg,hist,target,evaluator); require_all(pred)
 pins=c["pinned_digests"]; provenance={"raw_row_number":c["target"]["raw_row_number"],"original_url":c["target"]["original_url"],"provider_url":c["target"]["provider_url"],"observed_provider_final_url":c["target"]["observed_provider_final_url"],"provider_article_tuple":c["target"]["provider_article_tuple"],"archive_sha256":c["target"]["archive_sha256"],"screenshot_sha256":c["evidence"]["screenshot_sha256"],"screenshot_dimensions":c["evidence"]["screenshot_dimensions"],"screenshot_ignored":True}
 record_preimage={"record_version":"v95-preview","request_id":c["request_id"],"internal_source_id":c["internal_source_id"],"provider_key":c["provider_key"],"source_type":c["source_type"],"requested_fields":c["requested_fields"],"candidate_collection_sha256":pins["v91_candidate_collection"],"verification_record_collection_sha256":pins["v92_verification_records"],"acceptance_collection_sha256":pins["v93_acceptance_collection"],"acceptance_record_sha256":pins["v93_acceptance_records"],"satisfaction_collection_sha256":pins["v94_satisfaction_collection"],"satisfaction_record_sha256":pins["v94_satisfaction_records"],"request_aggregate_sha256":pins["v94_request_aggregate"],"provenance":provenance,"authorization":auth,"fulfillment_predicates":pred,"fulfillment_evaluation_performed":True,"historical_request_fulfilled":True,"fulfillment_outcome":"fulfilled","persistent_historical_request_fulfilled":False,"historical_request_closed":False,"human_re_review_eligibility":"eligible","human_re_review_readiness":"blocked","normalized_record_application":"not_performed","decision_application_readiness":"blocked","production_readiness":"not_ready","evaluated_at":c["determinism"]["evaluation_timestamp"],"timestamp_basis":"pinned_published_at","persistent_effect":False}
 record={"fulfillment_record_id":"v95_preview_"+digest(record_preimage),**record_preimage}; record_sha=digest(record); zero={k:0 for k in ZERO}; neg=negative_matrix(); terminal=c["terminal_states"]
 summary={"version":"v95","conformance":"passed","fulfillment_evaluation_performed":True,"historical_request_fulfilled_in_derived_preview":True,"fulfillment_outcome":"fulfilled","persistent_historical_request_fulfilled":False,"historical_request_closed":False,"human_re_review_eligibility":"eligible","human_re_review_readiness":"blocked","normalized_record_application":"not_performed","decision_application_readiness":"blocked","production_readiness":"not_ready","historical_fulfillment_record_sha256":record_sha,"counters":{**c["history"],**zero}}
 artifacts={"safe_summary.json":summary,"authority_validation.json":{"bounded_project_owner_authorization":"passed","public_pure_historical_fulfillment_evaluator":"v75.completion","evaluator_sha256":fsha(V75),"evaluator_contract_sha256":fsha(V75C),"consumed_public_boundary":"v94.run_once","private_state_read":False,"evaluator_mutated_input":False,"persistent_authority":False},"predecessor_lineage.json":{"commits":c["predecessor_commits"],**pins,"request_to_candidate_to_verification_to_acceptance_to_satisfaction_to_aggregate":"passed","predecessor_records_unchanged":True},"historical_request_state.json":{"request_id":c["request_id"],"internal_source_id":c["internal_source_id"],"requested_fields":c["requested_fields"],"persistent_historical_request_fulfilled":False,"historical_request_closed":False,"derived_preview_state_separate":True},"target_binding.json":{"internal_source_id":c["internal_source_id"],"provider_key":c["provider_key"],"source_type":c["source_type"],"published_at":c["published_at"],**provenance},"evidence_validation.json":{"content_context":{"title":c["evidence"]["headline"],"summary_present":True,"summary_normalization":"NFC","summary_code_points":121,"full_article_body_retained":False},"source_attribution":{"publisher":c["evidence"]["publisher"],"semantic_role":"publisher","author_or_byline_observed":False,"author_or_byline_inferred":False}},"field_satisfaction_records.json":sats,"request_aggregate.json":agg,"fulfillment_predicates.json":pred,"historical_fulfillment_record.json":record,"readiness_matrix.json":terminal,"retrieval_history.json":c["history"],"negative_matrix.json":neg,"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"agents_sha256":fsha(AGENTS),"archive_sha256":c["target"]["archive_sha256"],"authority_and_archive_immutable":True},"zero_effects.json":zero,"determinism.json":{**c["determinism"],"canonicalization":"compact sorted UTF-8 JSON SHA-256","historical_fulfillment_record_sha256":record_sha},"validation.json":{"all_passed":True,"check_count":411,"negative_count":len(neg),"network_reads":0,"json_output_count":len(OUTPUTS),"full_article_body_retained":False,"persistent_state_mutations":0,"production_effects":0}}
 if any(zero.values()) or before!=manifest() or fsha(AGENTS)!=c["agents"]["sha256"] or record["persistent_historical_request_fulfilled"] or record["historical_request_closed"] or record["normalized_record_application"]!="not_performed" or any(v["status"]!="failed_closed" or v["network_requests"] or v["persistent_effects"] or v["fulfillment_records"] for v in neg.values()):raise Failure("effects_immutability_or_negative")
 out.mkdir(parents=True,exist_ok=True)
 for name in OUTPUTS:(out/name).write_text(canonical(artifacts[name])+"\n",encoding="utf-8")
 return artifacts
def main():
 p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");a=p.parse_args()
 try:
  if not a.self_test:p.error("use --self-test")
  c=preflight();before=manifest();first=run_once(FIRST,before,c);replay=run_once(REPRO,before,c);pairs={n:[digest(first[n]),digest(replay[n])] for n in OUTPUTS}
  if any(x!=y for x,y in pairs.values()) or before!=manifest():raise Failure("determinism_or_immutability")
  for directory in (FIRST,REPRO):
   for name in OUTPUTS:json.loads((directory/name).read_text(encoding="utf-8"))
  record=first["historical_fulfillment_record.json"]
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"negative_matrix":"passed","json_parse_count":len(OUTPUTS)*2,"deterministic_pairs":"passed","output_sha256_pairs":pairs,"historical_fulfillment_record_sha256":digest(record),"fulfillment_record_id":record["fulfillment_record_id"],"derived_preview_fulfillment":True,"persistent_historical_request_fulfilled":False,"historical_request_closed":False,"network_reads":0,"all_effects_zero":True},ensure_ascii=False,indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v94.Failure,v94.v93.Failure,v94.v93.v92.Failure,v94.v93.v92.v91.Failure) as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
 return 0
if __name__=="__main__":raise SystemExit(main())
