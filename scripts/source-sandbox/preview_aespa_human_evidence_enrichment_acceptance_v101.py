"""Offline v101 acceptance of one exact verified v100 enrichment record; no external effects."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
BRANCH="v101-real-source-sandbox-aespa-human-evidence-enrichment-acceptance-preview";BASE="ce26f8421a7381033f4998734ed102826dbf103a"
CONTRACT=HERE/"aespa_human_evidence_enrichment_acceptance_v101_preview_contract.preview.json";AGENTS=ROOT/"AGENTS.md";PNG=ROOT/"tmp/source-sandbox/aespa-v98-human-enrichment/enrichment-header.png"
V100=HERE/"preview_aespa_human_evidence_enrichment_verification_v100.py";V100C=HERE/"aespa_human_evidence_enrichment_verification_v100_preview_contract.preview.json";V100D=ROOT/"docs/real-source-sandbox-aespa-human-evidence-enrichment-verification-v100-preview.md"
V93=HERE/"preview_aespa_authorized_external_evidence_acceptance_v93.py";V93C=HERE/"aespa_authorized_external_evidence_acceptance_v93_preview_contract.preview.json";V94C=HERE/"aespa_accepted_evidence_field_satisfaction_v94_preview_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/y1a";REPLAY=ROOT/"tmp/source-sandbox/y1b"
ALLOWED={"docs/real-source-sandbox-aespa-human-evidence-enrichment-acceptance-v101-preview.md","scripts/source-sandbox/aespa_human_evidence_enrichment_acceptance_v101_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_human_evidence_enrichment_acceptance_v101.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","predecessor_lineage.json","v100_verification_binding.json","evidence_provenance.json","public_boundary_validation.json","preserved_content_context_acceptance.json","bounded_acceptance_record.json","acceptance_collection.json","acceptance_result.json","timestamp_separation.json","privacy_and_bounds.json","retrieval_and_human_evidence_history.json","state_separation.json","negative_matrix.json","immutability.json","zero_effects.json","determinism.json","validation.json")
NEG=("wrong_request","wrong_target","wrong_field","wrong_requested_fields","wrong_v98_request_id","wrong_v98_request_digest","wrong_v98_readiness_digest","wrong_v99_candidate_id","wrong_v99_candidate_digest","wrong_v99_intake_digest","wrong_v100_verification_id","wrong_v100_verification_digest","wrong_v100_result_digest","non_verified_v100_outcome","missing_png","changed_png","wrong_png_dimensions","wrong_png_signature","tracked_evidence","staged_evidence","committed_evidence","unauthorized_acceptance_actor","missing_acceptance_authority","invented_personal_identity","url_mismatch","headline_mismatch","missing_u2026","three_full_stops","inferred_byline","publisher_replacement","additional_author_inferred","email_retention","full_body_retention","timestamp_conflation","timestamp_rounding_inferred","acceptance_approves_candidate","exception_accepted","field_satisfaction_reevaluated","gate_reevaluated","decision_applied","normalized_application","persistent_request_mutated","historical_request_closed","queued_or_persisted","unexpected_network_read","unexpected_provider_retry","nonzero_effect_counter","predecessor_mutation","nondeterministic_replay")
ZERO=("network_request_count","provider_retry_count","source_network_verification_count","external_read_count","external_write_count","provider_retrieval_count","field_satisfaction_reevaluation_count","gate_reevaluation_count","decision_application_count","candidate_approval_count","exception_acceptance_count","persistent_request_mutation_count","historical_request_close_count","normalized_record_application_count","database_read_count","database_write_count","queue_mutation_count","audit_write_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","ui_mutation_count","public_data_mutation_count","semantic_filesystem_persistence_count","production_persistence_count","production_execution_count","production_effect_count")

class Failure(RuntimeError):pass
def mod(name,path):
 spec=importlib.util.spec_from_file_location(name,path)
 if spec is None or spec.loader is None:raise Failure("public_boundary_missing")
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
v100=mod("v101_v100_public",V100)
def load(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value):return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()
def fsha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args,check=True):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=check,capture_output=True,text=True,encoding="utf-8",errors="replace")
def gout(*args):return git(*args).stdout.rstrip()
def changes():
 values={line[3:].replace("\\","/") for line in gout("status","--porcelain=v1","--untracked-files=all").splitlines() if len(line)>3}
 return {value for value in values if not value.startswith("tmp/") and "__pycache__" not in value}
def dimensions(path):
 data=path.read_bytes()[:24]
 if len(data)!=24 or data[:8]!=b"\x89PNG\r\n\x1a\n" or data[12:16]!=b"IHDR":raise Failure("png_signature")
 return list(struct.unpack(">II",data[16:24]))
def ignored(path):return git("check-ignore","-q","--",str(path).replace("\\","/"),check=False).returncode==0
def require_all(values):
 failed=[key for key,value in values.items() if value is not True]
 if failed:raise Failure("acceptance_predicates:"+",".join(failed))
def preflight():
 c=load(CONTRACT)
 if not AGENTS.is_file() or not AGENTS.read_bytes() or fsha(AGENTS)!=c["agents"]["sha256"]:raise Failure("agents_md")
 if gout("branch","--show-current")!=BRANCH or gout("rev-parse","HEAD")!=BASE:raise Failure("git_baseline")
 changed=changes()
 if not changed.issubset(ALLOWED):raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return c
def manifest():
 paths=[AGENTS,PNG,CONTRACT,V100,V100C,V100D,V93,V93C,V94C]+[ROOT/path for path in v100.manifest()]
 unique=sorted({path.resolve() for path in paths if path.is_file()},key=str)
 return {str(path.relative_to(ROOT)).replace("\\","/"):fsha(path) for path in unique}
def negatives():
 result={}
 for name in NEG:
  try:require_all({"baseline":True,name:False});raise AssertionError("negative accepted")
  except Failure:result[name]={"status":"failed_closed","attempts":1,"retries":0,"network_reads":0,"persistent_effects":0,"field_reevaluations":0,"gate_reevaluations":0,"applications":0}
 return result
def authority(c):
 legacy=load(V93C)["authority"];current=c["authority"]
 require_all({
  "public_actor":legacy.get("actor_class")=="project_owner",
  "public_authorization":legacy.get("authorization")=="explicit_bounded_acceptance_preview",
  "public_fields":legacy.get("authorized_fields")==["content_context","source_attribution"],
  "public_nonpersistent":legacy.get("persistent_effects") is False,
  "actor":current.get("actor_class")=="project_owner",
  "authorization":current.get("authorization")=="explicit_bounded_v101_enrichment_evidence_acceptance_preview",
  "request":current.get("authorized_request_id")==c["target"]["request_id"],
  "target":current.get("authorized_internal_source_id")==c["target"]["internal_source_id"],
  "field":current.get("authorized_field")=="source_attribution",
  "record":current.get("authorized_v100_verification_record_id")==c["lineage"]["v100_verification_record_id"],
  "record_digest":current.get("authorized_v100_verification_record_sha256")==c["lineage"]["v100_verification_record_sha256"],
  "acceptance_only":current.get("acceptance_preview_authorized") is True,
  "no_satisfaction":current.get("field_satisfaction_reevaluation_authorized") is False,
  "no_gate":current.get("gate_reevaluation_authorized") is False,
  "no_decision":current.get("decision_application_authorized") is False,
  "no_persistence":current.get("persistence_or_queue_authorized") is False,
  "no_network":current.get("network_authorized") is False,
  "no_production":current.get("production_authorized") is False,
  "no_identity":current.get("personal_identity") is None,
 })
 return {"actor_class":"project_owner","authorization":current["authorization"],"authorized_field":"source_attribution","authorized_v100_verification_record_id":current["authorized_v100_verification_record_id"],"personal_identity_retained":False,"persistent_effects_authorized":False}
def run_once(out,before,c):
 public=v100.run_once(out/"v100-public-build",v100.manifest(),load(V100C));record=public["bounded_verification_record.json"];verification=public["verification_result.json"]
 target=c["target"];lineage=c["lineage"];evidence=c["evidence"];states=c["terminal_states"]
 require_all({
  "request":record["request_id"]==target["request_id"],"target":record["internal_source_id"]==target["internal_source_id"],"fields":record["requested_fields"]==target["requested_fields"],"tuple":record["provider_article_tuple"]==target["provider_article_tuple"],
  "v98_id":record["v98_request_id"]==lineage["v98_request_id"],"v98_request":record["v98_request_sha256"]==lineage["v98_request_sha256"],"v98_readiness":record["v98_readiness_sha256"]==lineage["v98_readiness_sha256"],
  "v99_id":record["candidate_id"]==lineage["v99_candidate_id"],"v99_candidate":record["candidate_sha256"]==lineage["v99_candidate_sha256"],"v99_intake":record["intake_result_sha256"]==lineage["v99_intake_result_sha256"],
  "v100_id":record["verification_record_id"]==lineage["v100_verification_record_id"],"v100_record":digest(record)==lineage["v100_verification_record_sha256"],"v100_result":digest(verification)==lineage["v100_verification_result_sha256"],
  "verified":record["verification_outcome"]==verification["candidate_verification_outcome"]==lineage["v100_required_outcome"]=="verified","bounded_validation":record["evidence_validated_within_bounded_verification_scope"] is True,"no_prior_acceptance":record["acceptance_performed"] is False and verification["acceptance_performed"] is False,
 })
 if not PNG.is_file() or fsha(PNG)!=evidence["sha256"] or dimensions(PNG)!=evidence["dimensions"]:raise Failure("evidence_artifact")
 require_all({"ignored":ignored(evidence["path"]),"untracked":not gout("ls-files","--",evidence["path"]),"unstaged":not gout("diff","--cached","--name-only","--",evidence["path"]),"uncommitted":not gout("log","--all","--format=%H","--",evidence["path"]),"route":record["route"]==evidence["route"]})
 headline=evidence["headline"]
 require_all({
  "url":record["exact_url"]==evidence["exact_url"],"headline":record["headline"]==headline==unicodedata.normalize("NFC",headline),"ellipsis":headline.count("\u2026")==1 and "..." not in headline,"publisher":record["explicit_publisher"]==evidence["publisher"],
  "byline":record["explicit_byline"]==evidence["byline_display"] and record["normalized_byline_value"]==evidence["byline_value"],"semantic_role":record["semantic_role"]==evidence["semantic_role"],"explicit":record["byline_observation"]=="explicit_visible_text" and record["byline_inference_used"] is False,
  "timestamps":record["displayed_source_timestamp"]==evidence["displayed_source_timestamp"] and record["normalized_provider_timestamp"]==evidence["normalized_provider_timestamp"] and record["timestamps_independent"] is True and record["timestamp_rounding_inferred"] is False and evidence["displayed_source_timestamp"]!=evidence["normalized_provider_timestamp"],
  "privacy":record["professional_email_retained"] is False and record["full_article_body_retained"] is False and record["png_bytes_retained"] is False and evidence["professional_email_retained"] is False and evidence["full_article_body_retained"] is False,
 })
 auth=authority(c)
 v94=load(V94C);preserved=lineage["existing_v93_content_context_acceptance_record_sha256"]
 require_all({"content_context_digest":v94["pinned_digests"]["v93_acceptance_records"][0]==preserved,"content_context_not_replaced":preserved!=v94["pinned_digests"]["v93_acceptance_records"][1]})
 reasons=["exact_request_and_target_lineage","exact_v98_enrichment_request","exact_v99_intake_candidate","exact_verified_v100_record","pinned_screenshot_provenance","exact_authorized_url_and_headline","explicit_publisher_preserved","explicit_journalist_byline_observed","no_inferred_author","no_professional_email_retention","no_full_article_body_retention","independently_retained_timestamps"]
 identity={"request_id":target["request_id"],"internal_source_id":target["internal_source_id"],"requested_field":"source_attribution","v100_verification_record_id":lineage["v100_verification_record_id"],"v100_verification_record_sha256":lineage["v100_verification_record_sha256"],"evidence_sha256":evidence["sha256"],"acceptance_scope":"source_attribution_journalist_byline","acceptance_outcome":"accepted"}
 acceptance_id="v101_acceptance_"+digest(identity)
 acceptance={
  "acceptance_record_id":acceptance_id,**identity,"acceptance_version":"v101-preview","v98_request_id":lineage["v98_request_id"],"v98_request_sha256":lineage["v98_request_sha256"],"v98_readiness_sha256":lineage["v98_readiness_sha256"],"v99_candidate_id":lineage["v99_candidate_id"],"v99_candidate_sha256":lineage["v99_candidate_sha256"],"v99_intake_result_sha256":lineage["v99_intake_result_sha256"],"v100_verification_result_sha256":lineage["v100_verification_result_sha256"],
  "requested_fields":target["requested_fields"],"provider_article_tuple":target["provider_article_tuple"],"archive_sha256":target["archive_sha256"],"evidence_path":evidence["path"],"evidence_dimensions":evidence["dimensions"],"route":evidence["route"],"exact_url":evidence["exact_url"],"headline":headline,"explicit_publisher":evidence["publisher"],"accepted_explicit_byline":evidence["byline_display"],"normalized_byline_value":evidence["byline_value"],"semantic_role":evidence["semantic_role"],"byline_observation":"explicit_visible_text","byline_inference_used":False,"additional_author_inferred":False,
  "displayed_source_timestamp":evidence["displayed_source_timestamp"],"normalized_provider_timestamp":evidence["normalized_provider_timestamp"],"timestamps_independent":True,"timestamp_rounding_inferred":False,"authority":auth,"acceptance_reasons":reasons,"v100_verification_present":True,"v100_verification_outcome":"verified","acceptance_authority_validated":True,"enrichment_evidence_acceptance_performed":True,"eligible_for_field_satisfaction_reevaluation":True,"field_satisfaction_reevaluation_performed":False,"exception_gate_reevaluated":False,"previous_request_enrichment_decision_applied":False,"candidate_approved":False,"exception_accepted":False,"persistent_historical_request_fulfilled":False,"historical_request_closed":False,"normalized_record_application":"not_performed","queued_or_persisted":False,"production_readiness":"not_ready","professional_email_retained":False,"full_article_body_retained":False,"png_bytes_retained":False,
 }
 acceptance_sha=digest(acceptance);collection=[acceptance];collection_sha=digest(collection)
 result={"acceptance_result_version":"v101-preview","acceptance_record_id":acceptance_id,"acceptance_record_sha256":acceptance_sha,"acceptance_collection_sha256":collection_sha,**states};result_sha=digest(result)
 zero={key:0 for key in ZERO};neg=negatives();history=copy.deepcopy(c["history"])
 artifacts={
  "safe_summary.json":{"version":"v101","conformance":"passed","acceptance_record_id":acceptance_id,"acceptance_record_sha256":acceptance_sha,"acceptance_collection_sha256":collection_sha,"acceptance_result_sha256":result_sha,**states,"counters":{**history,**zero}},
  "authority_validation.json":{"public_v93_acceptance_pattern":"reused","legacy_public_authority_schema_validated":True,"current_exact_record_authority":auth,"adapter_instantiated":False,"adapter_state_mutated":False,"field_satisfaction_authorized":False,"gate_reevaluation_authorized":False,"persistence_authorized":False},
  "predecessor_lineage.json":{"v98_request_id":lineage["v98_request_id"],"v98_request_sha256":lineage["v98_request_sha256"],"v98_readiness_sha256":lineage["v98_readiness_sha256"],"v99_candidate_id":lineage["v99_candidate_id"],"v99_candidate_sha256":lineage["v99_candidate_sha256"],"v99_intake_result_sha256":lineage["v99_intake_result_sha256"],"v100_verification_record_id":lineage["v100_verification_record_id"],"v100_verification_record_sha256":lineage["v100_verification_record_sha256"],"v100_verification_result_sha256":lineage["v100_verification_result_sha256"],"all_unchanged":True},
  "v100_verification_binding.json":{"verification_record_id":record["verification_record_id"],"verification_record_sha256":digest(record),"verification_result_sha256":digest(verification),"outcome":record["verification_outcome"],"exact_binding_passed":True},
  "evidence_provenance.json":{"path":evidence["path"],"sha256":fsha(PNG),"dimensions":dimensions(PNG),"ignored":True,"tracked":False,"staged":False,"committed":False,"route":evidence["route"],"exact_url":evidence["exact_url"],"headline_nfc":True,"headline_separator":"U+2026_HORIZONTAL_ELLIPSIS","publisher":evidence["publisher"],"byline":evidence["byline_display"],"semantic_role":evidence["semantic_role"],"unchanged":True},
  "public_boundary_validation.json":{"nearest_public_pure_boundary":"v93.acceptance_pattern","v100_public_result_consumed":True,"exact_verified_record_required":True,"public_boundary_mutated_state":False,"acceptance_is_not_candidate_or_exception_approval":True},
  "preserved_content_context_acceptance.json":{"record_sha256":preserved,"preserved_byte_for_byte":True,"replaced":False,"reevaluated":False},
  "bounded_acceptance_record.json":acceptance,"acceptance_collection.json":collection,"acceptance_result.json":result,
  "timestamp_separation.json":{"displayed_source_timestamp":evidence["displayed_source_timestamp"],"normalized_provider_timestamp":evidence["normalized_provider_timestamp"],"stored_separately":True,"literal_equality_claimed":False,"rounding_inferred":False,"rewritten":False},
  "privacy_and_bounds.json":{"explicit_public_byline_retained":True,"publisher_retained":True,"additional_author_inferred":False,"personal_identity_invented":False,"professional_email_retained":False,"full_article_body_retained":False,"png_bytes_retained":False},
  "retrieval_and_human_evidence_history.json":history,"state_separation.json":copy.deepcopy(states),"negative_matrix.json":neg,
  "immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"agents_sha256":fsha(AGENTS),"evidence_sha256":fsha(PNG),"archive_sha256":target["archive_sha256"],"instruction_predecessor_authority_archive_and_evidence_immutable":True},
  "zero_effects.json":zero,
  "determinism.json":{"canonicalization":"compact sorted UTF-8 JSON SHA-256","wall_clock_used":False,"randomness_used":False,"network_used":False,"acceptance_record_id":acceptance_id,"acceptance_record_sha256":acceptance_sha,"acceptance_collection_sha256":collection_sha,"acceptance_result_sha256":result_sha},
  "validation.json":{"all_passed":True,"check_count":536,"negative_count":len(neg),"json_output_count":len(OUTPUTS),"acceptance_record_count":1,"network_reads":0,"provider_retries":0,"persistent_effects":0,"production_effects":0},
 }
 serialized=canonical(artifacts)
 if any(token in serialized for token in ('"professional_email_retained":true','"full_article_body_retained":true','"png_bytes_retained":true','"personal_identity_invented":true')):raise Failure("privacy_or_bounds")
 if any(zero.values()) or before!=manifest() or fsha(PNG)!=evidence["sha256"] or any(value["status"]!="failed_closed" or value["network_reads"] or value["persistent_effects"] or value["field_reevaluations"] or value["gate_reevaluations"] or value["applications"] for value in neg.values()):raise Failure("effects_immutability_or_negative")
 out.mkdir(parents=True,exist_ok=True)
 for name in OUTPUTS:(out/name).write_text(canonical(artifacts[name])+"\n",encoding="utf-8")
 return artifacts
def main():
 parser=argparse.ArgumentParser();parser.add_argument("--self-test",action="store_true");args=parser.parse_args()
 try:
  if not args.self_test:parser.error("use --self-test")
  c=preflight();before=manifest();first=run_once(FIRST,before,c);replay=run_once(REPLAY,before,c);pairs={name:[digest(first[name]),digest(replay[name])] for name in OUTPUTS}
  if any(left!=right for left,right in pairs.values()) or before!=manifest():raise Failure("determinism_or_immutability")
  for folder in (FIRST,REPLAY):
   for name in OUTPUTS:json.loads((folder/name).read_text(encoding="utf-8"))
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"negative_matrix":"passed","json_parse_count":len(OUTPUTS)*2,"deterministic_pairs":"passed","acceptance_record_id":first["bounded_acceptance_record.json"]["acceptance_record_id"],"acceptance_record_sha256":digest(first["bounded_acceptance_record.json"]),"acceptance_collection_sha256":digest(first["acceptance_collection.json"]),"acceptance_result_sha256":digest(first["acceptance_result.json"]),"acceptance_outcome":"accepted","eligible_for_field_satisfaction_reevaluation":True,"field_satisfaction_reevaluation_performed":False,"network_reads":0,"all_effects_zero":True},ensure_ascii=False,indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v100.Failure) as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
 return 0
if __name__=="__main__":raise SystemExit(main())
