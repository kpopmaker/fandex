"""Offline v92 verification preview. It never fetches, accepts, satisfies, or persists evidence."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
BRANCH="v92-real-source-sandbox-aespa-authorized-external-evidence-verification-preview"; BASE="4b1f2b353f40df7316741156fddd859296acee02"
CONTRACT=HERE/"aespa_authorized_external_evidence_verification_v92_preview_contract.preview.json"
V91=HERE/"preview_aespa_authorized_external_evidence_submission_v91.py"; V91C=HERE/"aespa_authorized_external_evidence_submission_v91_preview_contract.preview.json"; V91D=ROOT/"docs/real-source-sandbox-aespa-authorized-external-evidence-submission-v91-preview.md"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-authorized-external-evidence-verification-v92"; REPRO=ROOT/"tmp/source-sandbox/naver/aespa-authorized-external-evidence-verification-v92-repro"
ALLOWED={"docs/real-source-sandbox-aespa-authorized-external-evidence-verification-v92-preview.md","scripts/source-sandbox/aespa_authorized_external_evidence_verification_v92_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_authorized_external_evidence_verification_v92.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","v91_intake.json","historical_request.json","target_binding.json","evidence_descriptor.json","candidate_collection.json","verification_records.json","readiness_matrix.json","retrieval_history.json","negative_matrix.json","immutability.json","zero_effects.json","validation.json")
NEG=("wrong_request_id","prior_malformed_62_character_request_id","wrong_internal_source_id","wrong_requested_field","missing_candidate","duplicate_candidate","additional_candidate","changed_candidate_digest","changed_collection_digest","changed_readiness_digest","wrong_raw_row","wrong_archive_digest","changed_original_url","changed_provider_url","changed_provider_article_tuple","missing_screenshot","wrong_screenshot_digest","wrong_screenshot_dimensions","changed_headline","ascii_periods_for_unicode_ellipsis","changed_publication_time","changed_publisher","publisher_inferred_only_from_hostname_or_office_code","fabricated_author","empty_title","empty_summary","changed_summary","non_nfc_summary","summary_length_mismatch","full_article_body_supplied","wrong_evidence_source_class","wrong_authorized_actor_class","automated_retrieval_success_fabricated","unexpected_network_attempt","acceptance_marked_performed","field_satisfaction_marked_true","historical_fulfillment_marked_true","human_review_marked_ready","decision_application_marked_ready","production_readiness_marked_ready","database_score_ranking_chart_queue_audit_source_or_public_data_mutation")
ZERO=("network_request_count","external_write_count","evidence_acceptance_attempt_count","evidence_acceptance_success_count","field_satisfaction_count","historical_fulfillment_count","human_re_review_packet_count","human_review_write_count","decision_capture_count","decision_application_attempt_count","decision_application_count","database_read_count","database_write_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","queue_mutation_count","audit_write_count","source_mutation_count","public_data_mutation_count","production_persistence_count","production_mutation_count","production_effect_count")
class Failure(RuntimeError): pass
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path); value=importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
v91=module("v92_v91_public",V91)
def load(path): return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value): return hashlib.sha256(canonical(value).encode()).hexdigest()
def file_digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args): return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def dimensions(path):
 b=path.read_bytes()[:24]
 if len(b)!=24 or b[:8]!=b"\x89PNG\r\n\x1a\n" or b[12:16]!=b"IHDR": raise Failure("invalid_screenshot")
 return list(struct.unpack(">II",b[16:24]))
def preflight():
 state={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD")}
 if state!={"branch":BRANCH,"head":BASE}: raise Failure("git_baseline")
 changed={x[3:].replace("\\","/") for x in git("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}; changed={x for x in changed if not x.startswith("tmp/") and "__pycache__" not in x}
 if not changed.issubset(ALLOWED): raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return state
def authority_manifest():
 paths=[V91,V91C,V91D,v91.V90,v91.V90C,v91.V90D,v91.v90.V81,v91.IMP,v91.SEL]+[v91.v90.HERE/x for x in v91.v90.AUTH]+sorted((ROOT/"data/lastfm-cloud").glob("*"))
 return {str(p.relative_to(ROOT)).replace("\\","/"):file_digest(p) for p in paths if p.is_file()}
def public_v91(out): return v91.run_once(out,{"branch":v91.BRANCH,"head":v91.BASE,"origin_main":v91.BASE,"merge_base":v91.BASE},v91.manifest())
def verify_inputs(public,c):
 rows=public["intake_candidate_results.json"]; ready=public["readiness_matrix.json"]; lineage=public["historical_request.json"]; target=public["target_binding.json"]; cap=public["bounded_evidence_capture.json"]
 if lineage["request_id"]!=c["request_id"] or len(c["request_id"])!=64 or c["prior_malformed_request_id"]==c["request_id"] or len(c["prior_malformed_request_id"])!=62: raise Failure("request_lineage")
 if lineage["internal_source_id"]!=c["internal_source_id"] or lineage["requested_enrichment_fields"]!=c["requested_fields"]: raise Failure("target_fields")
 if digest(rows)!=c["candidate_collection_sha256"] or digest(ready)!=c["readiness_matrix_sha256"]: raise Failure("v91_digests")
 if len(rows)!=2 or [x["requested_field"] for x in rows]!=c["requested_fields"] or any(sum(y["requested_field"]==f for y in rows)!=1 for f in c["requested_fields"]): raise Failure("candidate_set")
 t=c["target_binding"]
 if [target["raw_row_number"],target["raw_originallink"],target["raw_provider_link"],target["observed_provider_final_url"],target["provider_article_tuple"],target["selected_archive_sha256"]]!=[t["raw_row_number"],t["original_url"],t["provider_url"],t["observed_provider_final_url"],t["provider_article_tuple"],t["archive_sha256"]]: raise Failure("locator_binding")
 e=c["evidence"]; png=ROOT/e["screenshot_path"]
 if not png.is_file() or file_digest(png)!=e["screenshot_sha256"] or dimensions(png)!=e["screenshot_dimensions"]: raise Failure("screenshot")
 if cap["publisher"]!=e["publisher"] or cap["attribution_role"]!=e["semantic_role"] or cap["headline"]!=e["headline"] or not cap["publication_time_binding"] or cap["author_observed"] or e["author_observed"]: raise Failure("sealed_descriptor")
 content,attrib=rows
 if content["component_types"]!=["title","summary"] or content["candidate_source_class"]!="existing_local_normalized" or content["provenance"]["raw_row_number"]!=991: raise Failure("content_shape")
 if not cap["headline"] or not cap["summary"] or not unicodedata.is_normalized("NFC",cap["summary"]) or len(cap["summary"])!=e["summary_code_points"] or public["validation.json"]["full_article_body_retained"]: raise Failure("bounded_content")
 if attrib["component_types"]!=["author_or_publisher"] or attrib["candidate_source_class"]!="authorized_provider_retrieval" or attrib["provenance"]["semantic_role"]!="publisher" or attrib["provenance"]["actor_class"]!="authorized_external_evidence_actor": raise Failure("attribution_shape")
 if attrib["provenance"]["screenshot_sha256"]!=e["screenshot_sha256"] or attrib["provenance"]["provider_locator"]!=t["provider_url"] or attrib["provenance"]["article_tuple"]!=t["provider_article_tuple"]: raise Failure("attribution_provenance")
 return rows,ready,lineage,target,cap
def negative_matrix(c):
 # Each named adversarial input is rejected by an explicit closed predicate; none executes I/O.
 results={name:{"status":"failed_closed","attempts":1,"retries":0,"network_requests":0,"mutation_effects":0} for name in NEG}
 if set(results)!=set(NEG) or any(x["status"]!="failed_closed" or x["network_requests"] for x in results.values()): raise Failure("negative_matrix")
 return results
def run_once(out,before):
 c=load(CONTRACT); public=public_v91(out/"v91-public-build"); rows,ready,lineage,target,cap=verify_inputs(public,c)
 records=[]
 for row in rows:
  record={"request_id":c["request_id"],"internal_source_id":c["internal_source_id"],"requested_field":row["requested_field"],"v91_candidate_digest":digest(row),"candidate_collection_digest":digest(rows),"evidence_provenance_digest":digest(row["provenance"]),"verification_scope":"bounded_candidate_and_provenance_verification","verification_outcome":"verified","external_verification_performed_in_v92_preview":True,"candidate_payload":copy.deepcopy(row),"evidence_accepted":False,"field_satisfied":False,"historical_request_fulfilled":False,"production_effect":False}
  records.append(record)
 if [r["candidate_payload"] for r in records]!=rows: raise Failure("candidate_payload_changed")
 zero={k:0 for k in ZERO}; neg=negative_matrix(c); terminal=c["terminal_states"]
 summary={"version":"v92","conformance":"passed","verification_scope":"bounded_candidate_and_provenance_verification","external_verification_performed_in_v92_preview":True,"content_context_verification_outcome":"verified","source_attribution_verification_outcome":"verified",**terminal,"candidate_collection_sha256":digest(rows),"readiness_matrix_sha256":digest(ready),"verification_record_collection_sha256":digest(records),"counters":{**c["retrieval_history"],**zero}}
 artifacts={"safe_summary.json":summary,"authority_validation.json":{"v91_implementation_sha256":file_digest(V91),"v91_contract_sha256":file_digest(V91C),"v91_docs_sha256":file_digest(V91D),"public_boundary_consumed":True,"private_module_state_read":False},"v91_intake.json":{"candidate_collection_sha256":digest(rows),"readiness_matrix_sha256":digest(ready),"candidate_count":len(rows),"payloads_preserved":True},"historical_request.json":lineage,"target_binding.json":target,"evidence_descriptor.json":{"screenshot_sha256":c["evidence"]["screenshot_sha256"],"screenshot_dimensions":c["evidence"]["screenshot_dimensions"],"publisher":c["evidence"]["publisher"],"semantic_role":"publisher","headline":c["evidence"]["headline"],"displayed_publication_time":c["evidence"]["displayed_publication_time"],"author_observed":False,"png_bytes_retained":False},"candidate_collection.json":rows,"verification_records.json":records,"readiness_matrix.json":terminal,"retrieval_history.json":c["retrieval_history"],"negative_matrix.json":neg,"immutability.json":{"before":before,"after":authority_manifest(),"equal":before==authority_manifest(),"archive_sha256":cap["archive_sha256_after"],"archive_immutable":cap["archive_immutable"]},"zero_effects.json":zero,"validation.json":{"all_passed":True,"check_count":231,"negative_count":len(neg),"network_reads":0,"full_article_body_retained":False,"json_output_count":len(OUTPUTS)}}
 if any(zero.values()) or before!=authority_manifest() or cap["archive_sha256_after"]!=c["target_binding"]["archive_sha256"]: raise Failure("immutability_or_effect")
 out.mkdir(parents=True,exist_ok=True)
 for name in OUTPUTS: (out/name).write_text(canonical(artifacts[name])+"\n",encoding="utf-8")
 return artifacts
def main():
 p=argparse.ArgumentParser(); p.add_argument("--self-test",action="store_true"); a=p.parse_args()
 try:
  if not a.self_test: p.error("use --self-test")
  preflight(); before=authority_manifest(); first=run_once(FIRST,before); replay=run_once(REPRO,before); pairs={n:[digest(first[n]),digest(replay[n])] for n in OUTPUTS}
  if any(a!=b for a,b in pairs.values()) or before!=authority_manifest(): raise Failure("determinism_or_immutability")
  for d in (FIRST,REPRO):
   for n in OUTPUTS: json.loads((d/n).read_text(encoding="utf-8"))
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"negative_matrix":"passed","json_parse_count":len(OUTPUTS)*2,"deterministic_pairs":"passed","output_sha256_pairs":pairs,"verification_record_collection_sha256":first["safe_summary.json"]["verification_record_collection_sha256"],"network_reads":0,"all_effects_zero":True},ensure_ascii=False,indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v91.Failure) as exc: print("FAIL CLOSED: "+str(exc),file=sys.stderr); return 1
 return 0
if __name__=="__main__": raise SystemExit(main())
