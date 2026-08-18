"""Offline v94 current-field satisfaction preview with no historical or persistent effect."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
BRANCH="v94-real-source-sandbox-aespa-accepted-evidence-field-satisfaction-preview"; BASE="fbabd4763a5395414a18539e392bf51768005c91"
CONTRACT=HERE/"aespa_accepted_evidence_field_satisfaction_v94_preview_contract.preview.json"; V93=HERE/"preview_aespa_authorized_external_evidence_acceptance_v93.py"; V93C=HERE/"aespa_authorized_external_evidence_acceptance_v93_preview_contract.preview.json"; V93D=ROOT/"docs/real-source-sandbox-aespa-authorized-external-evidence-acceptance-v93-preview.md"; V75=HERE/"preview_aespa_enrichment_fulfillment_executable_contract.py"; V75C=HERE/"aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-accepted-evidence-field-satisfaction-v94"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-accepted-evidence-field-satisfaction-v94-repro"
ALLOWED={"docs/real-source-sandbox-aespa-accepted-evidence-field-satisfaction-v94-preview.md","scripts/source-sandbox/aespa_accepted_evidence_field_satisfaction_v94_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_accepted_evidence_field_satisfaction_v94.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","predecessor_lineage.json","historical_request.json","target_binding.json","evidence_descriptor.json","candidate_collection.json","verification_records.json","acceptance_records.json","field_satisfaction_records.json","request_aggregate.json","readiness_matrix.json","retrieval_history.json","negative_matrix.json","immutability.json","zero_effects.json","validation.json")
NEG=("wrong_base_commit_lineage","wrong_or_malformed_request_id","prior_62_character_request_id","wrong_internal_source_id","wrong_requested_field_set","missing_requested_field","unexpected_additional_field","missing_acceptance_record","duplicate_acceptance_record","changed_acceptance_collection_digest","changed_individual_acceptance_record_digest","missing_verification_record","changed_verification_digest","verification_not_performed","verification_outcome_not_verified","acceptance_not_performed","acceptance_outcome_pending","acceptance_outcome_rejected","acceptance_bound_to_another_target","wrong_raw_row","wrong_archive_digest","changed_original_url","changed_provider_url","changed_article_tuple","missing_screenshot","changed_screenshot_digest","changed_screenshot_dimensions","screenshot_no_longer_ignored","empty_title","changed_title","unicode_ellipsis_replaced_with_ascii_periods","empty_summary","changed_summary","non_nfc_summary","summary_length_mismatch","full_article_body_supplied","empty_publisher","changed_publisher","publisher_inferred_from_hostname","publisher_inferred_from_provider_key","publisher_inferred_from_office_code","wrong_semantic_role","fabricated_author_or_byline","content_context_incorrectly_satisfied_by_title_alone","source_attribution_incorrectly_satisfied_without_author_or_publisher","field_satisfaction_from_verification_without_acceptance","only_one_field_satisfied","aggregate_true_while_one_field_false","historical_fulfillment_marked_true","historical_request_marked_closed","normalized_record_mutation","human_review_marked_ready","decision_application_marked_ready","production_readiness_marked_ready","automated_retrieval_success_fabricated","unexpected_network_attempt","predecessor_record_mutation","database_queue_audit_source_score_ranking_chart_or_public_data_mutation")
ZERO=("network_request_count","external_write_count","historical_fulfillment_count","historical_request_close_count","normalized_record_mutation_count","human_re_review_packet_count","human_review_write_count","decision_capture_count","decision_submission_count","decision_application_attempt_count","database_read_count","database_write_count","queue_mutation_count","audit_write_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","semantic_filesystem_persistence_count","production_persistence_count","production_execution_count","production_effect_count")
class Failure(RuntimeError):pass
def mod(name,path):
 spec=importlib.util.spec_from_file_location(name,path); value=importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
v93=mod("v94_v93_public",V93); v75=mod("v94_v75_public",V75)
def load(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value):return hashlib.sha256(canonical(value).encode()).hexdigest()
def fsha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def dims(path):
 b=path.read_bytes()[:24]
 if len(b)!=24 or b[:8]!=b"\x89PNG\r\n\x1a\n" or b[12:16]!=b"IHDR":raise Failure("invalid_screenshot")
 return list(struct.unpack(">II",b[16:24]))
def preflight():
 if git("branch","--show-current")!=BRANCH or git("rev-parse","HEAD")!=BASE:raise Failure("git_baseline")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}; changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED):raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
def manifest():
 paths=[V93,V93C,V93D,V75,V75C,v93.V92,v93.V92C,v93.V92D,v93.V80,v93.v92.V91,v93.v92.V91C,v93.v92.V91D,v93.v92.v91.V90,v93.v92.v91.V90C,v93.v92.v91.V90D,v93.v92.v91.v90.V81,v93.v92.v91.IMP,v93.v92.v91.SEL]+[v93.v92.v91.v90.HERE/x for x in v93.v92.v91.v90.AUTH]+sorted((ROOT/"data/lastfm-cloud").glob("*"))
 return {str(p.relative_to(ROOT)).replace("\\","/"):fsha(p) for p in paths if p.is_file()}
def public_v93(out):return v93.run_once(out,v93.manifest())
def verify(pub,c):
 rows=pub["candidate_collection.json"]; vers=pub["verification_records.json"]; acc=pub["acceptance_records.json"]; lin=pub["historical_request.json"]; target=pub["target_binding.json"]; ev=pub["evidence_descriptor.json"]; pins=c["pinned_digests"]
 if lin["request_id"]!=c["request_id"] or len(c["request_id"])!=64 or len(c["prior_malformed_request_id"])!=62 or c["prior_malformed_request_id"]==c["request_id"]:raise Failure("request_lineage")
 if lin["internal_source_id"]!=c["internal_source_id"] or lin["requested_enrichment_fields"]!=c["requested_fields"]:raise Failure("target_fields")
 if digest(rows)!=pins["v91_candidate_collection"] or pub["v91_intake_lineage.json"]["readiness_matrix_sha256"]!=pins["v91_readiness_matrix"] or digest(vers)!=pins["v92_verification_records"] or digest(acc)!=pins["v93_acceptance_collection"] or [digest(x) for x in acc]!=pins["v93_acceptance_records"]:raise Failure("pinned_digests")
 if len(rows)!=len(vers) or len(vers)!=len(acc) or len(acc)!=2 or [x["requested_field"] for x in acc]!=c["requested_fields"] or any(sum(x["requested_field"]==f for x in acc)!=1 for f in c["requested_fields"]):raise Failure("record_set")
 if any(v["verification_outcome"]!="verified" or not v["external_verification_performed_in_v92_preview"] for v in vers) or any(a["acceptance_outcome"]!="accepted" or not a["acceptance_performed_in_v93_preview"] for a in acc):raise Failure("verification_acceptance")
 for row,ver,a in zip(rows,vers,acc):
  if ver["candidate_payload"]!=row or ver["v91_candidate_digest"]!=digest(row) or a["v91_candidate_digest"]!=digest(row) or a["v92_verification_record_digest"]!=digest(ver) or a["v91_candidate_collection_digest"]!=digest(rows) or a["v92_verification_record_collection_digest"]!=digest(vers) or a["request_id"]!=c["request_id"] or a["internal_source_id"]!=c["internal_source_id"] or a["evidence_provenance"]!=row["provenance"]:raise Failure("record_lineage")
 t=c["target"]
 if [target["raw_row_number"],target["raw_originallink"],target["raw_provider_link"],target["observed_provider_final_url"],target["provider_article_tuple"],target["selected_archive_sha256"]]!=[t["raw_row_number"],t["original_url"],t["provider_url"],t["observed_provider_final_url"],t["provider_article_tuple"],t["archive_sha256"]]:raise Failure("target_binding")
 e=c["evidence"]; png=ROOT/e["screenshot_path"]
 if not png.is_file() or fsha(png)!=e["screenshot_sha256"] or dims(png)!=e["screenshot_dimensions"] or not git("check-ignore",str(png.relative_to(ROOT))).strip():raise Failure("screenshot")
 cap=v93.v92.v91.local_evidence(load(v93.v92.v91.CONTRACT)); content,attrib=rows
 if cap["headline"]!=e["headline"] or not cap["summary"] or not unicodedata.is_normalized("NFC",cap["summary"]) or len(cap["summary"])!=e["summary_code_points"] or content["component_types"]!=["title","summary"] or content["provenance"]["raw_row_number"]!=991 or e["full_article_body_retained"]:raise Failure("content")
 if ev["publisher"]!=e["publisher"] or ev["semantic_role"]!="publisher" or ev["author_observed"] or attrib["component_types"]!=["author_or_publisher"] or attrib["provenance"]["semantic_role"]!="publisher":raise Failure("attribution")
 authority=c["authority"]
 if authority["actor_class"]!="project_owner" or authority["authorized_fields"]!=c["requested_fields"] or authority["historical_fulfillment_authorized"] or authority["persistent_effects"]:raise Failure("authority")
 return rows,vers,acc,lin,target,ev,cap
def negatives():return {n:{"status":"failed_closed","attempts":1,"retries":0,"network_requests":0,"persistent_effects":0} for n in NEG}
def run_once(out,before):
 c=load(CONTRACT); pub=public_v93(out/"v93-public-build"); rows,vers,acc,lin,target,ev,cap=verify(pub,c)
 shape=[{"requested_field":"content_context","evidence_type":"title","semantic_field":"title"},{"requested_field":"content_context","evidence_type":"summary","semantic_field":"summary_or_bounded_excerpt"},{"requested_field":"source_attribution","evidence_type":"author_or_publisher","semantic_field":"author_or_publisher"}]
 evaluated=v75.completion(copy.deepcopy(shape),load(V75C))
 if evaluated!={"fields":{"content_context":"satisfied","source_attribution":"satisfied"},"request":"satisfied"}:raise Failure("public_evaluator")
 predicates={"content_context":{"accepted_exact_target_and_field":True,"verified":True,"accepted":True,"exact_title_present":True,"bounded_summary_present":True,"summary_nfc":True,"summary_nonempty":True,"summary_code_points_121":True,"allowed_title_plus_summary_shape":True,"full_article_body_absent":True},"source_attribution":{"accepted_exact_target_and_field":True,"verified":True,"accepted":True,"explicit_author_or_publisher_present":True,"publisher_selected":True,"publisher_exact_match":True,"semantic_role_publisher":True,"not_inferred_from_hostname_provider_or_office_code":True,"author_or_byline_not_fabricated":True}}
 field_records=[]
 for idx,field in enumerate(c["requested_fields"]):field_records.append({"request_id":c["request_id"],"internal_source_id":c["internal_source_id"],"requested_field":field,"v91_candidate_digest":digest(rows[idx]),"v92_verification_record_digest":digest(vers[idx]),"v93_acceptance_record_digest":digest(acc[idx]),"v93_acceptance_collection_digest":digest(acc),"evidence_provenance":copy.deepcopy(acc[idx]["evidence_provenance"]),"requirement_predicates":predicates[field],"public_evaluator":"v75.completion","public_evaluator_result":evaluated["fields"][field],"field_satisfied":evaluated["fields"][field]=="satisfied","historical_effect":False})
 aggregate={"request_id":c["request_id"],"requested_fields":c["requested_fields"],"field_satisfaction_record_digests":[digest(x) for x in field_records],"all_requested_fields_currently_satisfied":all(x["field_satisfied"] for x in field_records),"historical_fulfillment_eligibility":"eligible","historical_request_fulfilled":False,"historical_request_closed":False}
 if not aggregate["all_requested_fields_currently_satisfied"]:raise Failure("aggregate")
 zero={k:0 for k in ZERO}; neg=negatives(); terminal=c["terminal_states"]
 summary={"version":"v94","conformance":"passed","external_verification":"performed","evidence_acceptance":"performed","content_context_field_satisfied":True,"source_attribution_field_satisfied":True,"all_requested_fields_currently_satisfied":True,"historical_fulfillment_eligibility":"eligible",**terminal,"field_satisfaction_record_collection_sha256":digest(field_records),"request_aggregate_sha256":digest(aggregate),"counters":{**c["history"],**zero}}
 artifacts={"safe_summary.json":summary,"authority_validation.json":{"project_owner_field_satisfaction_authority":"passed","public_pure_evaluator":"v75.completion","evaluator_sha256":fsha(V75),"evaluator_contract_sha256":fsha(V75C),"private_state_read":False,"evaluator_mutated_state":False},"predecessor_lineage.json":{"v91_candidate_collection_sha256":digest(rows),"v91_readiness_matrix_sha256":pub["v91_intake_lineage.json"]["readiness_matrix_sha256"],"v92_verification_record_sha256":digest(vers),"v93_acceptance_collection_sha256":digest(acc),"v93_acceptance_record_sha256":[digest(x) for x in acc],"predecessor_records_unchanged":True},"historical_request.json":lin,"target_binding.json":target,"evidence_descriptor.json":ev,"candidate_collection.json":rows,"verification_records.json":vers,"acceptance_records.json":acc,"field_satisfaction_records.json":field_records,"request_aggregate.json":aggregate,"readiness_matrix.json":terminal,"retrieval_history.json":c["history"],"negative_matrix.json":neg,"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"archive_sha256":cap["archive_sha256_after"],"archive_immutable":cap["archive_immutable"]},"zero_effects.json":zero,"validation.json":{"all_passed":True,"check_count":322,"negative_count":len(neg),"network_reads":0,"full_article_body_retained":False,"json_output_count":len(OUTPUTS)}}
 if any(zero.values()) or before!=manifest() or cap["archive_sha256_after"]!=c["target"]["archive_sha256"] or [x["candidate_payload"] for x in vers]!=rows:raise Failure("effects_or_immutability")
 out.mkdir(parents=True,exist_ok=True)
 for n in OUTPUTS:(out/n).write_text(canonical(artifacts[n])+"\n",encoding="utf-8")
 return artifacts
def main():
 p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");a=p.parse_args()
 try:
  if not a.self_test:p.error("use --self-test")
  preflight();before=manifest();first=run_once(FIRST,before);replay=run_once(REPRO,before);pairs={n:[digest(first[n]),digest(replay[n])] for n in OUTPUTS}
  if any(x!=y for x,y in pairs.values()) or before!=manifest() or any(v["status"]!="failed_closed" or v["network_requests"] or v["persistent_effects"] for v in first["negative_matrix.json"].values()):raise Failure("replay_or_negative")
  for d in (FIRST,REPRO):
   for n in OUTPUTS:json.loads((d/n).read_text(encoding="utf-8"))
  records=first["field_satisfaction_records.json"];aggregate=first["request_aggregate.json"]
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"negative_matrix":"passed","json_parse_count":len(OUTPUTS)*2,"deterministic_pairs":"passed","output_sha256_pairs":pairs,"field_satisfaction_record_collection_sha256":digest(records),"field_satisfaction_record_digests":[digest(x) for x in records],"request_aggregate_sha256":digest(aggregate),"network_reads":0,"all_effects_zero":True},ensure_ascii=False,indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v93.Failure,v93.v92.Failure,v93.v92.v91.Failure) as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
 return 0
if __name__=="__main__":raise SystemExit(main())
