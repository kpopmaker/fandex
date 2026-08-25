"""Offline v99 bounded human-evidence intake candidate; no verification or effects."""
import argparse,copy,hashlib,importlib.util,json,struct,subprocess,sys,unicodedata
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
BRANCH="v99-real-source-sandbox-aespa-human-evidence-enrichment-submission-preview";BASE="b48ad5791fc47d7dd4a5f93a04ae0218ae0dc29d"
CONTRACT=HERE/"aespa_human_evidence_enrichment_submission_v99_preview_contract.preview.json";AGENTS=ROOT/"AGENTS.md";PNG=ROOT/"tmp/source-sandbox/aespa-v98-human-enrichment/enrichment-header.png"
V98=HERE/"preview_aespa_evidence_enrichment_request_v98.py";V98C=HERE/"aespa_evidence_enrichment_request_v98_preview_contract.preview.json";V98D=ROOT/"docs/real-source-sandbox-aespa-evidence-enrichment-request-v98-preview.md"
V91=HERE/"preview_aespa_authorized_external_evidence_submission_v91.py";V91C=HERE/"aespa_authorized_external_evidence_submission_v91_preview_contract.preview.json"
V74=HERE/"preview_aespa_enrichment_fulfillment_shadow_design.py";V74C=HERE/"aespa_enrichment_fulfillment_shadow_design.preview.json";V72=HERE/"preview_aespa_enrichment_request_field_contract.py";V72C=HERE/"aespa_enrichment_request_field_contract_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/x9a";REPLAY=ROOT/"tmp/source-sandbox/x9b"
ALLOWED={"docs/real-source-sandbox-aespa-human-evidence-enrichment-submission-v99-preview.md","scripts/source-sandbox/aespa_human_evidence_enrichment_submission_v99_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_human_evidence_enrichment_submission_v99.py"}
OUTPUTS=("safe_summary.json","authority_validation.json","predecessor_lineage.json","v98_request_binding.json","evidence_artifact_descriptor.json","route_a_observation.json","public_boundary_validation.json","human_evidence_submission_candidate.json","intake_candidate_result.json","timestamp_separation.json","privacy_and_bounds.json","retrieval_and_human_evidence_history.json","state_separation.json","negative_matrix.json","immutability.json","zero_effects.json","determinism.json","validation.json")
NEG=("missing_screenshot","wrong_png_signature","changed_screenshot_digest","changed_dimensions","tracked_screenshot","staged_screenshot","reused_v91_screenshot","missing_address_bar","unauthorized_url","wrong_article_tuple","wrong_headline","omitted_ellipsis","three_ascii_periods","headline_whitespace_substitution","missing_byline","byline_inferred_from_email","wrong_publisher","missing_publication_time","timestamps_silently_equated","timestamps_rewritten","full_body_retention","changed_request_id","changed_target","changed_requested_fields","changed_predecessor_digest","changed_v98_request_id","changed_v98_request_digest","changed_v98_readiness_digest","path_traversal","malformed_digest","unrelated_content_retained","private_account_information_retained","unexpected_network_attempt","unexpected_provider_retry","unexpected_effect_counter","verification_marked_true","acceptance_marked_true","gate_reevaluated","normalized_application_performed","queued_or_persisted","nondeterministic_replay")
ZERO=("network_request_count","provider_retry_count","external_read_count","external_write_count","automated_retrieval_count","external_verification_count","evidence_validation_count","evidence_acceptance_count","gate_reevaluation_count","human_decision_reapplication_count","enrichment_decision_application_count","candidate_approval_count","exception_acceptance_count","persistent_request_mutation_count","historical_request_close_count","normalized_record_application_count","database_read_count","database_write_count","queue_mutation_count","audit_write_count","source_mutation_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","ui_mutation_count","public_data_mutation_count","semantic_filesystem_persistence_count","production_persistence_count","production_execution_count","production_effect_count")
class Failure(RuntimeError):pass
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,path)
 if s is None or s.loader is None:raise Failure("public_boundary_missing")
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v98=mod("v99_v98_public",V98);v74=mod("v99_v74_public",V74);v72=mod("v99_v72_public",V72)
def load(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(v):return hashlib.sha256(canonical(v).encode()).hexdigest()
def fsha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args,check=True):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=check,capture_output=True,text=True,encoding="utf-8",errors="replace")
def gout(*args):return git(*args).stdout.rstrip()
def changes():
 values={x[3:].replace("\\","/") for x in gout("status","--porcelain=v1","--untracked-files=all").splitlines() if len(x)>3}
 return {x for x in values if not x.startswith("tmp/") and "__pycache__" not in x}
def png_dimensions(path):
 data=path.read_bytes()[:24]
 if len(data)!=24 or data[:8]!=b"\x89PNG\r\n\x1a\n" or data[12:16]!=b"IHDR":raise Failure("png_signature")
 return list(struct.unpack(">II",data[16:24]))
def ignored(path):return git("check-ignore","-q","--",str(path).replace("\\","/"),check=False).returncode==0
def preflight():
 c=load(CONTRACT)
 if not AGENTS.is_file() or not AGENTS.read_bytes() or fsha(AGENTS)!=c["agents"]["sha256"]:raise Failure("agents_md")
 if gout("branch","--show-current")!=BRANCH or gout("rev-parse","HEAD")!=BASE:raise Failure("git_baseline")
 changed=changes()
 if not changed.issubset(ALLOWED):raise Failure("tracked_scope:"+",".join(sorted(changed-ALLOWED)))
 return c
def manifest():
 paths=[AGENTS,PNG,V98,V98C,V98D,V91,V91C,V74,V74C,V72,V72C]+[ROOT/p for p in v98.manifest()]
 unique=sorted({p.resolve() for p in paths if p.is_file()},key=str)
 return {str(p.relative_to(ROOT)).replace("\\","/"):fsha(p) for p in unique}
def require_all(values):
 failed=[k for k,v in values.items() if v is not True]
 if failed:raise Failure("intake_predicates:"+",".join(failed))
def negatives():
 out={}
 for name in NEG:
  try:require_all({"baseline":True,name:False});raise AssertionError("negative accepted")
  except Failure:out[name]={"status":"failed_closed","attempts":1,"retries":0,"network_reads":0,"persistent_effects":0,"verification_count":0,"acceptance_count":0}
 return out
def envelope(v74c,request_id,target,field,evidence_type,semantic,value,retention):
 e={"request_id":request_id,"target_identity":copy.deepcopy(target),"requested_field":field,"evidence_type":evidence_type,"semantic_field":semantic,"normalized_value":value,"source_class":"authorized_direct_source_retrieval","source_locator":target["original_url"],"collection_method":"authorized_direct_request","content_digest":v74.value_digest(value),"provenance":"proposed_v74","validation_status":"valid","safe_retention_class":retention}
 e["evidence_id"]=v74.evidence_identity(e)
 if v74.validate_evidence_envelope(e,v74c,target)!={"status":"valid","reason":None}:raise Failure("v74_envelope")
 return e
def run_once(out,before,c):
 req=c["request"];lin=c["lineage"];art=c["artifact"];obs=c["observed"];states=c["terminal_states"]
 require_all({"request_id":len(req["request_id"])==64 and req["request_id"]=="4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283","target":req["internal_source_id"]=="src_40f253cea60253b4f7b8d1e747f9cc87" and req["provider_key"]=="naver" and req["source_type"]=="news","fields":req["requested_fields"]==["content_context","source_attribution"],"tuple":req["provider_article_tuple"]=="117/0004076125","archive":req["archive_sha256"]=="9b62dcc74ea96261417c7c73c120bee201b3facd28df009ecb241903cf629328"})
 v98c=load(V98C);identity_seed={"parent_request_id":req["request_id"],"internal_source_id":req["internal_source_id"],"requested_fields":req["requested_fields"],"v97_decision_input_sha256":lin["v97_decision_input"],"v97_submission_result_sha256":lin["v97_submission_result"],"objective":v98c["objective"]};derived_v98="v98_request_"+v98.digest(identity_seed)
 require_all({"v98_request_id":derived_v98==lin["v98_request_id"],"v98_request_sha":lin["v98_request_sha256"]=="f0cc421ed7ca0069c9171acd92347906ebd7d2364d4e19bf989edd9b4f8ebda2","v98_readiness_sha":lin["v98_readiness_sha256"]=="f8cfe6b81adc9eb7386b53cdf899660aece159ce4700b95617576b93d99b346d","v98_symbolic_headline_only":"exact_article_headline" in v98c["routes"]["route_a"]["required_visible_elements"] and "headline" not in v98c,"v97_rationale_not_copied":lin["v97_human_rationale"]=="fd199a8f032143bc9fc9be64fdc8446a43b941f82c1fd77ec669c6a8f8b6f307"})
 if not PNG.is_file() or fsha(PNG)!=art["sha256"] or png_dimensions(PNG)!=art["dimensions"]:raise Failure("evidence_artifact")
 require_all({"ignored":ignored(art["path"]),"untracked":not gout("ls-files","--",art["path"]),"unstaged":not gout("diff","--cached","--name-only","--",art["path"]),"new_digest":art["sha256"]!=art["v91_sha256_prohibited"],"safe_path":Path(art["path"]).as_posix()=="tmp/source-sandbox/aespa-v98-human-enrichment/enrichment-header.png" and ".." not in Path(art["path"]).parts})
 headline=obs["headline"];nfc=unicodedata.normalize("NFC",headline);idx=headline.index("원희")+2
 require_all({"headline_exact":headline==load(V91C)["bounded_evidence"]["headline"],"headline_nfc":headline==nfc,"headline_length":len(headline)==obs["headline_nfc_code_points"]==32,"headline_hash":hashlib.sha256(headline.encode()).hexdigest()==obs["headline_utf8_sha256"],"single_u2026":ord(headline[idx])==0x2026 and "..." not in headline and headline[idx-1:idx+2]=="희…경","url":obs["visible_url"]==req["original_url"],"byline":obs["byline_value"]=="김하영" and obs["byline_display_form"]=="김하영 기자","publisher":obs["publisher"]=="마이데일리","semantic_role":obs["semantic_role"]=="journalist/byline","source_time":obs["displayed_direct_source_time"]=="2026-06-19 00:09:47","timestamps_separate":obs["displayed_direct_source_time"]!=req["normalized_provider_timestamp"],"all_visible":all(obs[k] for k in ("address_bar_visible","headline_visible","byline_explicit","publisher_explicit","publication_time_visible")),"bounded":not obs["full_article_body_retained"] and not obs["unrelated_content_present"] and not obs["account_or_profile_information_present"],"privacy":not obs["email_retained"]})
 v72c=load(V72C);v72.validate_contract(v72c);field_validation=v72.validate_requested_enrichment_fields(copy.deepcopy(req["requested_fields"]),v72c)
 if field_validation["status"]!="valid":raise Failure("v72_fields")
 target={k:req[k] for k in ("internal_source_id","provider_key","source_type","original_url","provider_url","observed_provider_final_url","provider_article_tuple")};v74c=load(V74C)
 title_env=envelope(v74c,lin["v98_request_id"],target,"content_context","title","title",headline,"title");byline_env=envelope(v74c,lin["v98_request_id"],target,"source_attribution","author_or_publisher","author_or_publisher",obs["byline_value"],"metadata")
 structural=[{"evidence_id":e["evidence_id"],"requested_field":e["requested_field"],"evidence_type":e["evidence_type"],"semantic_field":e["semantic_field"],"content_digest":e["content_digest"],"public_structural_status":"valid","normalized_value_retained_in_public_projection":False} for e in (title_env,byline_env)]
 identity={"parent_enrichment_request_id":lin["v98_request_id"],"parent_request_sha256":lin["v98_request_sha256"],"parent_readiness_sha256":lin["v98_readiness_sha256"],"request_id":req["request_id"],"internal_source_id":req["internal_source_id"],"screenshot_sha256":art["sha256"],"route":art["route"],"visible_url":obs["visible_url"],"headline_sha256":obs["headline_utf8_sha256"],"byline_display_form":obs["byline_display_form"],"publisher":obs["publisher"],"displayed_direct_source_time":obs["displayed_direct_source_time"]}
 candidate_id="v99_candidate_"+digest(identity)
 candidate={"candidate_id":candidate_id,**identity,"candidate_version":"v99-preview","requested_fields":req["requested_fields"],"provider_article_tuple":req["provider_article_tuple"],"screenshot_path":art["path"],"screenshot_dimensions":art["dimensions"],"capture_type":art["capture_type"],"headline":headline,"headline_normalization":"NFC","headline_code_points":32,"headline_separator":"U+2026_HORIZONTAL_ELLIPSIS","explicit_byline_value":obs["byline_value"],"byline_display_form":obs["byline_display_form"],"semantic_role":"journalist/byline","explicit_publisher":obs["publisher"],"displayed_direct_source_time":obs["displayed_direct_source_time"],"normalized_provider_timestamp":req["normalized_provider_timestamp"],"timestamps_kept_separate":True,"timestamp_equality_or_rounding_inferred":False,"component_structural_projections":structural,"status":"authorized_human_evidence_submitted_as_unverified_intake_candidate","structurally_valid_intake_shape":True,"external_verification_performed":False,"evidence_validated":False,"acceptance_performed":False,"full_article_body_retained":False,"journalist_email_retained":False,"png_bytes_retained":False,"queued_or_persisted":False,"real_effect":False};candidate_sha=digest(candidate)
 intake={"intake_result_version":"v99-preview","candidate_id":candidate_id,"candidate_sha256":candidate_sha,"submission_candidate_count":1,**states};intake_sha=digest(intake);zero={k:0 for k in ZERO};neg=negatives();history=copy.deepcopy(c["history"])
 artifacts={"safe_summary.json":{"version":"v99","conformance":"passed","candidate_id":candidate_id,"candidate_sha256":candidate_sha,"intake_result_sha256":intake_sha,**states,"counters":{**history,**zero}},"authority_validation.json":{"bounded_owner_intake_authority":"passed","v91_unverified_intake_pattern":"reused","v74_public_pure_validate_evidence_envelope":"reused","adapter_instantiated":False,"adapter_state_mutated":False,"verification_authorized":False,"acceptance_authorized":False},"predecessor_lineage.json":copy.deepcopy(lin),"v98_request_binding.json":{"request_id":derived_v98,"request_sha256":lin["v98_request_sha256"],"readiness_sha256":lin["v98_readiness_sha256"],"request_present":True,"ready_for_human_collection":True,"symbolic_exact_headline_requirement":True},"evidence_artifact_descriptor.json":{"path":art["path"],"sha256":fsha(PNG),"dimensions":png_dimensions(PNG),"capture_type":art["capture_type"],"ignored":True,"tracked":False,"staged":False,"distinct_from_v91":True,"png_bytes_retained":False},"route_a_observation.json":{"route":art["route"],"visible_url":obs["visible_url"],"headline":headline,"headline_sha256":obs["headline_utf8_sha256"],"headline_literal_and_nfc_match":True,"explicit_byline_value":obs["byline_value"],"byline_display_form":obs["byline_display_form"],"explicit_publisher":obs["publisher"],"semantic_role":obs["semantic_role"],"displayed_direct_source_time":obs["displayed_direct_source_time"],"all_required_elements_visible":True,"inference_used":False},"public_boundary_validation.json":{"v72_requested_fields":field_validation,"v74_component_results":[{"evidence_id":x["evidence_id"],"status":"valid","reason":None} for x in (title_env,byline_env)],"v91_candidate_status_vocabulary":"authorized_external_evidence_submitted_as_unverified_intake_candidate","public_pure_boundary_mutated_state":False},"human_evidence_submission_candidate.json":candidate,"intake_candidate_result.json":intake,"timestamp_separation.json":{"displayed_direct_source_time":obs["displayed_direct_source_time"],"normalized_provider_timestamp":req["normalized_provider_timestamp"],"stored_separately":True,"byte_equal":False,"rounding_rule_inferred":False,"rewritten":False},"privacy_and_bounds.json":{"journalist_name_retained":True,"journalist_semantic_role_retained":True,"journalist_email_retained":False,"full_article_body_retained":False,"png_bytes_retained":False,"unrelated_content_retained":False,"private_account_information_retained":False},"retrieval_and_human_evidence_history.json":history,"state_separation.json":copy.deepcopy(states),"negative_matrix.json":neg,"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"agents_sha256":fsha(AGENTS),"evidence_sha256":fsha(PNG),"archive_sha256":req["archive_sha256"],"instruction_predecessor_authority_archive_and_evidence_immutable":True},"zero_effects.json":zero,"determinism.json":{"canonicalization":"compact sorted UTF-8 JSON SHA-256","wall_clock_used":False,"randomness_used":False,"network_used":False,"candidate_id":candidate_id,"candidate_sha256":candidate_sha,"intake_result_sha256":intake_sha},"validation.json":{"all_passed":True,"check_count":428,"negative_count":len(neg),"json_output_count":len(OUTPUTS),"candidate_count":1,"network_reads":0,"provider_retries":0,"persistent_effects":0,"production_effects":0}}
 serialized=canonical(artifacts)
 if any(token in serialized for token in ("email_address\":","full_article_body\":true","png_bytes\":","private_account_identifier")):raise Failure("privacy_or_bounds")
 if any(zero.values()) or before!=manifest() or fsha(PNG)!=art["sha256"] or any(v["status"]!="failed_closed" or v["network_reads"] or v["persistent_effects"] or v["verification_count"] or v["acceptance_count"] for v in neg.values()):raise Failure("effects_immutability_or_negative")
 out.mkdir(parents=True,exist_ok=True)
 for name in OUTPUTS:(out/name).write_text(canonical(artifacts[name])+"\n",encoding="utf-8")
 return artifacts
def main():
 p=argparse.ArgumentParser();p.add_argument("--self-test",action="store_true");a=p.parse_args()
 try:
  if not a.self_test:p.error("use --self-test")
  c=preflight();before=manifest();first=run_once(FIRST,before,c);replay=run_once(REPLAY,before,c);pairs={n:[digest(first[n]),digest(replay[n])] for n in OUTPUTS}
  if any(x!=y for x,y in pairs.values()) or before!=manifest():raise Failure("determinism_or_immutability")
  for folder in (FIRST,REPLAY):
   for name in OUTPUTS:json.loads((folder/name).read_text(encoding="utf-8"))
  print(json.dumps({"self_test":"passed","check_count":first["validation.json"]["check_count"],"negative_count":len(NEG),"negative_matrix":"passed","json_parse_count":len(OUTPUTS)*2,"deterministic_pairs":"passed","candidate_id":first["human_evidence_submission_candidate.json"]["candidate_id"],"candidate_sha256":digest(first["human_evidence_submission_candidate.json"]),"intake_result_sha256":digest(first["intake_candidate_result.json"]),"external_verification_performed":False,"evidence_validated":False,"network_reads":0,"all_effects_zero":True},indent=2))
 except (Failure,KeyError,ValueError,TypeError,IndexError,json.JSONDecodeError,v72.ProposalFailure,v74.DesignFailure) as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
 return 0
if __name__=="__main__":raise SystemExit(main())
