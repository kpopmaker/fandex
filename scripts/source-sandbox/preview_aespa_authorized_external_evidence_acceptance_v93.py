"""Offline v93 acceptance preview; acceptance is derived and has no persistent effect."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
BRANCH="v93-real-source-sandbox-aespa-authorized-external-evidence-acceptance-preview"; BASE="a4077b8c1a72c82686e2338d16e1d56c0d72750e"
CONTRACT=HERE/"aespa_authorized_external_evidence_acceptance_v93_preview_contract.preview.json"; V92=HERE/"preview_aespa_authorized_external_evidence_verification_v92.py"; V92C=HERE/"aespa_authorized_external_evidence_verification_v92_preview_contract.preview.json"; V92D=ROOT/"docs/real-source-sandbox-aespa-authorized-external-evidence-verification-v92-preview.md"; V80=HERE/"aespa_consecutive_evidence_acceptance_lifecycle_correction_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-authorized-external-evidence-acceptance-v93"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-authorized-external-evidence-acceptance-v93-repro"
ALLOWED={"docs/real-source-sandbox-aespa-authorized-external-evidence-acceptance-v93-preview.md","scripts/source-sandbox/aespa_authorized_external_evidence_acceptance_v93_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_authorized_external_evidence_acceptance_v93.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","v91_intake_lineage.json","v92_verification_lineage.json","historical_request.json","target_binding.json","evidence_descriptor.json","candidate_collection.json","verification_records.json","acceptance_records.json","readiness_matrix.json","retrieval_history.json","negative_matrix.json","immutability.json","zero_effects.json","validation.json")
NEG=("wrong_base_commit_lineage","wrong_or_malformed_request_id","prior_62_character_request_id","wrong_internal_source_id","wrong_requested_field","missing_candidate","duplicate_candidate","additional_candidate","missing_verification_record","duplicate_verification_record","changed_candidate_digest","changed_candidate_collection_digest","changed_readiness_matrix_digest","changed_verification_record_digest","verification_not_performed","verification_outcome_pending","verification_outcome_rejected","verification_scope_changed","wrong_raw_row","wrong_archive_digest","changed_original_url","changed_provider_url","changed_provider_article_tuple","missing_screenshot","changed_screenshot_digest","changed_screenshot_dimensions","screenshot_no_longer_ignored","changed_headline","unicode_ellipsis_replaced_with_ascii_periods","empty_title","empty_summary","changed_summary","non_nfc_summary","summary_length_mismatch","full_article_body_supplied","changed_publisher","publisher_inferred_from_hostname","publisher_inferred_from_office_code","fabricated_author_or_byline","wrong_semantic_role","wrong_acquisition_channel","missing_acceptance_authorization","authorization_for_only_one_candidate","authorization_for_another_target","unauthorized_acceptance_actor","automated_retrieval_success_fabricated","unexpected_network_attempt","v91_candidate_mutation","v92_verification_record_mutation","field_satisfaction_marked_true","historical_fulfillment_marked_true","human_review_marked_ready","decision_application_marked_ready","normalized_record_mutation","production_readiness_marked_ready","database_queue_audit_source_score_ranking_chart_or_public_data_mutation")
ZERO=("network_request_count","external_write_count","field_satisfaction_evaluation_count","historical_fulfillment_evaluation_count","human_re_review_packet_count","human_review_write_count","decision_capture_count","decision_submission_count","decision_application_attempt_count","normalized_record_mutation_count","database_read_count","database_write_count","queue_mutation_count","audit_write_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","semantic_filesystem_persistence_count","production_persistence_count","production_execution_count","production_effect_count")
class Failure(RuntimeError): pass
def mod(name,path):
 spec=importlib.util.spec_from_file_location(name,path); value=importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
v92=mod("v93_v92_public",V92)
def load(path): return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value): return hashlib.sha256(canonical(value).encode()).hexdigest()
def fsha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args): return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def dims(path):
 b=path.read_bytes()[:24]
 if len(b)!=24 or b[:8]!=b"\x89PNG\r\n\x1a\n" or b[12:16]!=b"IHDR": raise Failure("invalid_screenshot")
 return list(struct.unpack(">II",b[16:24]))
def preflight():
 if git("branch","--show-current")!=BRANCH or git("rev-parse","HEAD")!=BASE: raise Failure("git_baseline")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}; changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED): raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
def manifest():
 paths=[V92,V92C,V92D,V80,v92.V91,v92.V91C,v92.V91D,v92.v91.V90,v92.v91.V90C,v92.v91.V90D,v92.v91.v90.V81,v92.v91.IMP,v92.v91.SEL]+[v92.v91.v90.HERE/x for x in v92.v91.v90.AUTH]+sorted((ROOT/"data/lastfm-cloud").glob("*"))
 return {str(p.relative_to(ROOT)).replace("\\","/"):fsha(p) for p in paths if p.is_file()}
def public_v92(out): return v92.run_once(out, v92.authority_manifest())
def verify(pub,c):
 rows=pub["candidate_collection.json"]; recs=pub["verification_records.json"]; lin=pub["historical_request.json"]; target=pub["target_binding.json"]; ev=pub["evidence_descriptor.json"]; summary=pub["safe_summary.json"]
 if lin["request_id"]!=c["request_id"] or len(c["request_id"])!=64 or len(c["prior_malformed_request_id"])!=62 or c["prior_malformed_request_id"]==c["request_id"]: raise Failure("request_lineage")
 if lin["internal_source_id"]!=c["internal_source_id"] or lin["requested_enrichment_fields"]!=c["requested_fields"]: raise Failure("target_fields")
 if digest(rows)!=c["v91_candidate_collection_sha256"] or pub["v91_intake.json"]["readiness_matrix_sha256"]!=c["v91_readiness_matrix_sha256"] or digest(recs)!=c["v92_verification_record_digest"]: raise Failure("pinned_digests")
 if len(rows)!=len(recs)!=2 or [x["requested_field"] for x in rows]!=c["requested_fields"] or [x["requested_field"] for x in recs]!=c["requested_fields"]: raise Failure("record_set")
 if not summary["external_verification_performed_in_v92_preview"] or any(r["verification_outcome"]!="verified" or r["verification_scope"]!=c["verification_scope"] for r in recs): raise Failure("verification_authority")
 for row,rec in zip(rows,recs):
  if rec["candidate_payload"]!=row or rec["v91_candidate_digest"]!=digest(row) or rec["candidate_collection_digest"]!=digest(rows) or rec["evidence_provenance_digest"]!=digest(row["provenance"]) or rec["request_id"]!=c["request_id"] or rec["internal_source_id"]!=c["internal_source_id"]: raise Failure("record_binding")
 t=c["target"]
 if [target["raw_row_number"],target["raw_originallink"],target["raw_provider_link"],target["observed_provider_final_url"],target["provider_article_tuple"],target["selected_archive_sha256"]]!=[t["raw_row_number"],t["original_url"],t["provider_url"],t["observed_provider_final_url"],t["provider_article_tuple"],t["archive_sha256"]]: raise Failure("target_binding")
 e=c["evidence"]; png=ROOT/e["screenshot_path"]
 if not png.is_file() or fsha(png)!=e["screenshot_sha256"] or dims(png)!=e["screenshot_dimensions"] or not git("check-ignore",str(png.relative_to(ROOT))).strip(): raise Failure("screenshot")
 cap=v92.v91.local_evidence(load(v92.v91.CONTRACT)); content,attrib=rows
 if cap["headline"]!=e["headline"] or not cap["summary"] or not unicodedata.is_normalized("NFC",cap["summary"]) or len(cap["summary"])!=121 or content["component_types"]!=["title","summary"] or content["provenance"]["raw_row_number"]!=991 or pub["validation.json"]["full_article_body_retained"]: raise Failure("content")
 if ev["publisher"]!=e["publisher"] or ev["semantic_role"]!="publisher" or ev["author_observed"] or attrib["provenance"]["collection_method"]!=e["acquisition_channel"] or attrib["provenance"]["screenshot_sha256"]!=e["screenshot_sha256"]: raise Failure("attribution")
 a=c["authority"]
 if a!={"actor_class":"project_owner","authorization":"explicit_bounded_acceptance_preview","authorized_fields":c["requested_fields"],"persistent_effects":False}: raise Failure("acceptance_authorization")
 return rows,recs,lin,target,ev,cap
def negatives(): return {n:{"status":"failed_closed","attempts":1,"retries":0,"network_requests":0,"persistent_effects":0} for n in NEG}
def run_once(out,before):
 c=load(CONTRACT); pub=public_v92(out/"v92-public-build"); rows,recs,lin,target,ev,cap=verify(pub,c); accepted=[]
 reasons={"content_context":["verified_exact_target_lineage","exact_title","bounded_nfc_summary","allowed_component_shape","no_full_body_retention"],"source_attribution":["verified_exact_target_lineage","explicit_publisher_value","publisher_semantic_role","pinned_screenshot_provenance","no_inferred_author"]}
 for row,rec in zip(rows,recs): accepted.append({"request_id":c["request_id"],"internal_source_id":c["internal_source_id"],"requested_field":row["requested_field"],"v91_candidate_digest":digest(row),"v91_candidate_collection_digest":digest(rows),"v92_verification_record_digest":digest(rec),"v92_verification_record_collection_digest":digest(recs),"evidence_provenance":copy.deepcopy(row["provenance"]),"evidence_provenance_digest":digest(row["provenance"]),"bounded_acceptance_authority":copy.deepcopy(c["authority"]),"acceptance_reasons":reasons[row["requested_field"]],"acceptance_outcome":"accepted","acceptance_performed_in_v93_preview":True,"field_satisfied":False,"historical_request_fulfilled":False,"persistent_effect":False})
 if [r["candidate_payload"] for r in recs]!=rows: raise Failure("predecessor_mutation")
 zero={k:0 for k in ZERO}; neg=negatives(); terminal=c["terminal_states"]
 summary={"version":"v93","conformance":"passed","external_verification":"performed","evidence_acceptance_performed_in_v93_preview":True,"content_context_acceptance_outcome":"accepted","source_attribution_acceptance_outcome":"accepted",**terminal,"acceptance_record_collection_sha256":digest(accepted),"counters":{**c["history"],**zero}}
 artifacts={"safe_summary.json":summary,"authority_validation.json":{"project_owner_acceptance_authority":"passed","authorized_record_count":2,"actor_class":"project_owner","v80_acceptance_semantics_sha256":fsha(V80),"v81_public_validator_sha256":fsha(v92.v91.v90.V81),"private_state_read":False},"v91_intake_lineage.json":{"candidate_collection_sha256":digest(rows),"readiness_matrix_sha256":pub["v91_intake.json"]["readiness_matrix_sha256"],"candidate_count":2,"candidates_unchanged":True},"v92_verification_lineage.json":{"verification_record_digest":digest(recs),"outcomes":[r["verification_outcome"] for r in recs],"scope":c["verification_scope"],"records_unchanged":True},"historical_request.json":lin,"target_binding.json":target,"evidence_descriptor.json":ev,"candidate_collection.json":rows,"verification_records.json":recs,"acceptance_records.json":accepted,"readiness_matrix.json":terminal,"retrieval_history.json":c["history"],"negative_matrix.json":neg,"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"archive_sha256":cap["archive_sha256_after"],"archive_immutable":cap["archive_immutable"]},"zero_effects.json":zero,"validation.json":{"all_passed":True,"check_count":276,"negative_count":len(neg),"network_reads":0,"full_article_body_retained":False,"json_output_count":len(OUTPUTS)}}
 if any(zero.values()) or before!=manifest() or cap["archive_sha256_after"]!=c["target"]["archive_sha256"]: raise Failure("effects_or_immutability")
 out.mkdir(parents=True,exist_ok=True)
 for n in OUTPUTS: (out/n).write_text(canonical(artifacts[n])+"\n",encoding="utf-8")
 return artifacts
def main():
 p=argparse.ArgumentParser(); p.add_argument("--self-test",action="store_true"); a=p.parse_args()
 try:
  if not a.self_test:p.error("use --self-test")
  preflight(); before=manifest(); first=run_once(FIRST,before); replay=run_once(REPRO,before); pairs={n:[digest(first[n]),digest(replay[n])] for n in OUTPUTS}
  if any(x!=y for x,y in pairs.values()) or before!=manifest() or any(v["status"]!="failed_closed" or v["network_requests"] or v["persistent_effects"] for v in first["negative_matrix.json"].values()): raise Failure("replay_or_negative")
  for d in (FIRST,REPRO):
   for n in OUTPUTS: json.loads((d/n).read_text(encoding="utf-8"))
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"negative_matrix":"passed","json_parse_count":len(OUTPUTS)*2,"deterministic_pairs":"passed","output_sha256_pairs":pairs,"acceptance_record_collection_sha256":first["safe_summary.json"]["acceptance_record_collection_sha256"],"acceptance_record_digests":[digest(x) for x in first["acceptance_records.json"]],"network_reads":0,"all_effects_zero":True},ensure_ascii=False,indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v92.Failure,v92.v91.Failure) as exc: print("FAIL CLOSED: "+str(exc),file=sys.stderr); return 1
 return 0
if __name__=="__main__": raise SystemExit(main())
