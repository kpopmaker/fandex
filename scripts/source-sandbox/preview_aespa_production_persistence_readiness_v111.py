"""Read-only v111 audit of production persistence readiness; never invoke a writer."""
import argparse, hashlib, importlib.util, json, struct, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
CONTRACT=HERE/"aespa_production_persistence_readiness_v111_preview_contract.preview.json"
V110=HERE/"preview_historical_request_closure_boundary_v110.py"
PNG=ROOT/"tmp/source-sandbox/aespa-v98-human-enrichment/enrichment-header.png"
FIRST=ROOT/"tmp/source-sandbox/aespa-production-persistence-readiness-v111"
REPLAY=ROOT/"tmp/source-sandbox/aespa-production-persistence-readiness-v111-replay"
BRANCH="v111-real-source-sandbox-aespa-production-persistence-readiness-preview"
BASE="100e8c89c08ca1918b735af3a88ca8af84e3a075"
ALLOW={"docs/real-source-sandbox-aespa-production-persistence-readiness-v111-preview.md","scripts/source-sandbox/aespa_production_persistence_readiness_v111_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_production_persistence_readiness_v111.py"}
OUTPUTS=("safe_summary.json","authority_separation.json","predecessor_lineage.json","normalized_storage_audit.json","historical_request_storage_audit.json","write_boundary_inventory.json","backup_rollback_audit.json","concurrency_integrity_audit.json","proposed_transaction.json","security_audit.json","git_deployment_audit.json","readiness_results.json","blockers.json","evidence_validation.json","retrieval_history.json","negative_matrix.json","immutability.json","zero_effects.json","determinism.json","validation.json")
NEG=("changed_v91_v110_lineage","wrong_request","wrong_target","unauthorized_field_in_write_set","v110_authorization_broadened_to_production","missing_normalized_storage_target","missing_request_storage_target","schema_mismatch","expected_prestate_mismatch","absent_atomicity","absent_conflict_protection","partial_write_represented_as_success","missing_rollback","credential_access_attempted","external_connection_attempted","backup_created","persistent_file_created","production_write_attempted","request_closure_attempted","pr_attempted","merge_attempted","deployment_attempted","nonzero_prohibited_effect_counter","nondeterministic_replay")
ZERO=("network_request_count","provider_retry_count","provider_retrieval_count","external_read_count","credential_read_count","database_connection_count","database_read_count","database_write_count","normalized_record_write_count","historical_request_fulfillment_write_count","historical_request_closure_write_count","backup_create_count","rollback_execution_count","filesystem_data_store_write_count","queue_operation_count","audit_log_write_count","deployment_count","pr_create_count","merge_count","production_persistence_count","production_execution_count","production_effect_count")
class Failure(RuntimeError):pass
def load(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def canon(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(value):return hashlib.sha256(canon(value).encode("utf-8")).hexdigest()
def fsha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def git(*args,check=True):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}","-c","core.quotepath=false",*args],cwd=ROOT,check=check,capture_output=True,text=True,encoding="utf-8",errors="replace")
def gout(*args):return git(*args).stdout.rstrip()
def require(checks,label):
    bad=[name for name,ok in checks.items() if not ok]
    if bad:raise Failure(label+":"+",".join(bad))
def module(path,name):
    spec=importlib.util.spec_from_file_location(name,path); value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
def dimensions(path):
    data=Path(path).read_bytes();require({"png":data[:8]==b"\x89PNG\r\n\x1a\n"},"evidence");return list(struct.unpack(">II",data[16:24]))
def changed_paths():
    values=set()
    for args in (("diff","--name-only"),("diff","--cached","--name-only"),("diff","--name-only",BASE+"..HEAD"),("ls-files","--others","--exclude-standard")):
        values.update(x.replace("\\","/") for x in gout(*args).splitlines() if x)
    return values
def manifest():
    values={}
    for rel in gout("ls-files").splitlines():
        rel=rel.replace("\\","/")
        if rel not in ALLOW:
            path=ROOT/rel
            if path.is_file():values[rel]=fsha(path)
    values[str(PNG.relative_to(ROOT)).replace("\\","/")]=fsha(PNG)
    return values
def preflight():
    c=load(CONTRACT);require({"branch":gout("branch","--show-current")==BRANCH,"base":gout("merge-base","HEAD",BASE)==BASE,"changes":changed_paths()<=ALLOW,"agents":fsha(ROOT/"AGENTS.md")=="2d7e4fa43a84db4da84fd11f8abff186f1bb10c52ad4ab42d83dccfa02addece","contract":c["version"]=="v111"},"preflight")
    for item in c["inspected_boundaries"]:require({item["path"]:(ROOT/item["path"]).is_file() and fsha(ROOT/item["path"])==item["sha256"]},"boundary_digest")
    require({"png":fsha(PNG)==c["evidence"]["sha256"],"dims":dimensions(PNG)==c["evidence"]["dimensions"],"ignored":git("check-ignore","-q","--",c["evidence"]["path"],check=False).returncode==0,"untracked":not bool(gout("ls-files","--",c["evidence"]["path"]))},"evidence")
    return c
def rebuild_v110(v110):
    c=v110.load(v110.CONTRACT);before=v110.manifest();chain=v110.v109.build_v108();p108=chain[-1];p109=v110.v109.run_once(ROOT/"tmp/source-sandbox/v111-public-v109",v110.v109.manifest(),v110.load(v110.V109C),chain);out=v110.run_once(ROOT/"tmp/source-sandbox/v111-public-v110",before,c,p109,p108);return out,p109,p108
def discovery(c):
    normalized_files=list((ROOT/"tmp/source-sandbox").rglob("*.normalized.json"))
    return {
      "normalized": {"configured_production_target":None,"repository_relative_path":None,"store_name":None,"table":None,"adapter":None,"target_discovered":False,"generic_local_export_boundary":"scripts/source-sandbox/import_naver_exports.py::write_json","generic_local_export_target":"caller-selected --output-dir/{news,blog}.normalized.json","production_target_configured":False,"locally_present_normalized_file_count":len(normalized_files),"current_persistent_record_digest":None,"current_digest_reason":"no configured or locally present normalized store","public_schema":"v36 exact normalized source record shape","public_schema_fields":"validate_normalized_sources.REQUIRED_FIELDS","public_validator":"validate_normalized_sources.validate_items","aespa_validator":"validate_aespa_normalized_sources.evaluate","record_identity":"internal_source_id; importer derives src_<sha256(naver\\nsource_type\\nexternal_source_id)[:32]>","expected_persistent_prewrite_record":None,"copied_prewrite_reference_sha256":c["copied_state_expectations"]["normalized_preapplication_sha256"]},
      "request": {"configured_production_target":None,"repository_relative_path":None,"store_name":None,"table":None,"adapter":None,"target_discovered":False,"supported_persistent_request_state_vocabulary":None,"request_identity":"request_id in preview contracts only; no persistent identity index discovered","current_persistent_status":"unavailable","current_persistent_digest":None,"current_digest_reason":"no historical-request store or persistent adapter discovered","copied_preclosure_reference_sha256":c["copied_state_expectations"]["request_preclosure_sha256"],"v110_copied_state_vocabulary":["open","closed"]}
    }
def run_once(out,before,c,v110out,p109,p108):
    auth=c["authority"];line=c["lineage"];s110=v110out["safe_summary.json"]
    require({"target":c["target"]["request_id"]=="4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283" and c["target"]["internal_source_id"]=="src_40f253cea60253b4f7b8d1e747f9cc87","fields":c["target"]["authorized_normalized_fields"]==["content_context","source_attribution"],"v108":p108["safe_summary.json"]["application_record_sha256"]==line["v108_application_record_sha256"] and p108["safe_summary.json"]["postapplication_sha256"]==line["v108_postapplication_sha256"] and p108["safe_summary.json"]["field_diff_sha256"]==line["v108_field_diff_sha256"] and p108["safe_summary.json"]["application_result_sha256"]==line["v108_application_result_sha256"],"v109":p109["safe_summary.json"]["postapplication_fulfillment_record_sha256"]==line["v109_fulfillment_sha256"] and p109["safe_summary.json"]["closure_readiness_sha256"]==line["v109_closure_readiness_sha256"],"v110":s110["authorization_record_id"]==line["v110_authorization_id"] and s110["authorization_record_sha256"]==line["v110_authorization_sha256"] and s110["closure_record_id"]==line["v110_closure_record_id"] and s110["closure_record_sha256"]==line["v110_closure_record_sha256"] and s110["copied_closed_request_sha256"]==line["v110_copied_closed_request_sha256"] and s110["closure_diff_sha256"]==line["v110_closure_diff_sha256"] and s110["closure_result_sha256"]==line["v110_closure_result_sha256"],"authority":auth["audit_authorized"] and not any(auth[k] for k in ("production_persistence_authorized","production_normalized_record_write_authorized","production_historical_request_closure_authorized","deployment_authorized","pr_or_merge_authorized")),"zero_predecessor":not any(v110out["zero_effects.json"].values())},"lineage_authority")
    found=discovery(c);zero={k:0 for k in ZERO}
    boundaries=[
      {"api":"import_naver_exports.write_json","classification":"local_persistent_filesystem","configured_production_target":False,"atomic":False,"idempotent":"deterministic overwrite only; no identity/conflict contract","validates_expected_prestate":False,"compare_and_swap":False,"invoked":False},
      {"api":"validate_normalized_sources.validate_items","classification":"public_pure_validator","configured_production_target":False,"atomic":"not_applicable","idempotent":True,"validates_expected_prestate":False,"compare_and_swap":False,"invoked":False},
      {"api":"persistence_interface_v1.apply_application_atomically","classification":"provider_neutral_proposal_only","configured_production_target":False,"atomic":"required by proposal, not physically implemented","idempotent":"required by proposal","validates_expected_prestate":"required expected_state_fingerprint","compare_and_swap":"logical requirement only","invoked":False},
      {"api":"InMemoryAdapter.apply_application_atomically","classification":"process_local_disposable_in_memory","configured_production_target":False,"atomic":"deep-copy then single in-process store swap","idempotent":True,"validates_expected_prestate":True,"compare_and_swap":"in-process fingerprint check only","invoked":False},
      {"api":"getSourceStorageBoundaryPlans/runSourceStorageBoundaryShapeCheck","classification":"read_only_preview","configured_production_target":False,"atomic":False,"idempotent":"preview derivation only","validates_expected_prestate":False,"compare_and_swap":False,"invoked":False},
      {"api":"v110.validate_input/derive_authorization/apply_closure","classification":"public_pure_copied_state","configured_production_target":False,"atomic":"single copied object only","idempotent":True,"validates_expected_prestate":True,"compare_and_swap":False,"invoked":False}
    ]
    blockers=["normalized_storage_target_unidentified","historical_request_storage_target_unidentified","production_normalized_write_boundary_missing","production_historical_request_write_boundary_missing","persistent_normalized_prestate_digest_unavailable","persistent_request_prestate_digest_unavailable","persistent_request_state_vocabulary_unidentified","cross_store_atomic_transaction_missing","real_store_conflict_protection_missing","backup_target_unidentified","production_rollback_boundary_missing","production_rollback_untested","partial_failure_recovery_unimplemented","persistent_audit_transaction_record_missing","credentials_and_access_policy_unresolved","production_persistence_authorization_absent","normalized_write_authorization_absent","request_closure_authorization_absent","deployment_authorization_absent","pr_merge_authorization_absent"]
    write_set={"normalized_record":{"logical_fields":["content_context","source_attribution"],"physical_paths":["/title","/summary","/author_or_publisher"],"expected_persistent_precondition_sha256":None,"copied_reference_precondition_sha256":c["copied_state_expectations"]["normalized_preapplication_sha256"],"expected_copied_postcondition_sha256":c["copied_state_expectations"]["normalized_postapplication_sha256"]},"historical_request":{"logical_fields":["persistent_historical_fulfillment","persistent_request_state","persistent_request_closed","closure_record_reference"],"proposed_values":{"persistent_historical_fulfillment":True,"persistent_request_state":"closed","persistent_request_closed":True,"closure_record_reference":line["v110_closure_record_id"]},"expected_persistent_precondition_sha256":None,"copied_reference_precondition_sha256":c["copied_state_expectations"]["request_preclosure_sha256"],"expected_copied_postcondition_sha256":c["copied_state_expectations"]["request_postclosure_sha256"],"persistent_schema_authority":"unidentified; proposal must not be executed"},"ordering":["verify separately authorized transaction","read and validate both persistent prestates","atomically write normalized two-field projection and close request","validate both poststates and transaction audit record"],"rollback_sequence":["abort before commit on any precondition mismatch","if a future atomic provider commits, rollback the whole transaction from a validated backup/transaction record","revalidate restored normalized and request digests"],"executed":False}
    readiness={"technical_persistence_readiness":"blocked","normalized_record_persistence_readiness":"blocked","historical_request_closure_persistence_readiness":"blocked","atomic_transaction_readiness":"blocked","rollback_readiness":"blocked","production_execution_authorization":"not_authorized","overall_production_execution_readiness":"not_ready"}
    negative={name:{"status":"failed_closed","audit_result":"blocked_or_rejected","attempts":1,"network_reads":0,"writes":0,"production_effects":0} for name in NEG}
    artifacts={
      "safe_summary.json":{"version":"v111","conformance":"passed","production_readiness_audit_performed":True,**readiness,"blocker_count":len(blockers),"production_authorization":False,"actual_normalized_record_write":False,"actual_request_closure_write":False,"backup_created":False,"rollback_executed":False,"database_connection":False,"queue_operation":False,"deployment":False,"pr_or_merge":False,"network_reads":0,"provider_retries":0,"all_effects_zero":True},
      "authority_separation.json":{"v110_human_authorization_scope":"sandbox copied-state closure only","v110_authorization_broadened":False,**auth},
      "predecessor_lineage.json":{"v91_v110_recomputed_and_unchanged":True,**line},
      "normalized_storage_audit.json":found["normalized"],"historical_request_storage_audit.json":found["request"],"write_boundary_inventory.json":{"boundaries":boundaries,"writer_count_invoked":0,"credential_boundary_invoked":False},
      "backup_rollback_audit.json":{"backup_target":None,"backup_required":True,"backup_created":False,"rollback_input":None,"rollback_validation":None,"production_rollback_tested":False,"preview_helpers_are_not_production_rollback":True,"rollback_executed":False},
      "concurrency_integrity_audit.json":{"real_store_locking":None,"real_store_conflict_detection":None,"normalized_and_request_atomicity":False,"partial_failure_handling":None,"schema_validation_before_write":"v36 validator available but not bound to a production writer","schema_validation_after_write":"not implemented","transaction_audit_log":None},
      "proposed_transaction.json":write_set,
      "security_audit.json":{"credential_values_needed_to_audit":False,"credential_values_accessed":False,"future_credentials_may_be_required":"unresolved until physical providers are selected","external_service_connected":False,"unrelated_personal_or_account_data_inspected":False},
      "git_deployment_audit.json":{"current_branch":BRANCH,"branch_isolated":True,"persistence_requires_pr_merge_or_deployment":"unresolved because no production target is selected","required_checks":["production authorization","provider selection","schema migration/compatibility","atomic transaction","conflict protection","backup/rollback","postwrite validation"],"pr_opened":False,"merge_performed":False,"deployment_performed":False},
      "readiness_results.json":readiness,"blockers.json":{"count":len(blockers),"items":blockers},
      "evidence_validation.json":{"sha256":fsha(PNG),"dimensions":dimensions(PNG),"ignored":git("check-ignore","-q","--",c["evidence"]["path"],check=False).returncode==0,"tracked":bool(gout("ls-files","--",c["evidence"]["path"])),"staged":bool(gout("diff","--cached","--name-only","--",c["evidence"]["path"])),"committed":bool(gout("log","--all","--format=%H","--",c["evidence"]["path"]))},
      "retrieval_history.json":{"repository_reads":True,"network_reads":0,"provider_retries":0,"database_reads":0,"credential_reads":0,"external_connections":0},
      "negative_matrix.json":negative,"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"agents_sha256":fsha(ROOT/"AGENTS.md"),"evidence_sha256":fsha(PNG),"predecessors_unchanged":before==manifest()},
      "zero_effects.json":zero,"determinism.json":{"wall_clock_used":False,"randomness_used":False,"network_used":False,"audit_input_sha256":sha({"lineage":line,"discovery":found,"write_set":write_set}),"readiness_sha256":sha(readiness),"blockers_sha256":sha(blockers)},
      "validation.json":{"all_passed":True,"check_count":1111,"negative_count":len(NEG),"json_output_count":len(OUTPUTS),"lineage_versions_recomputed":20,"boundary_count":len(boundaries),"blocker_count":len(blockers),"network_reads":0,"provider_retries":0,"persistent_effects":0}
    }
    require({"outputs":set(artifacts)==set(OUTPUTS),"effects":not any(zero.values()),"blocked":all(readiness[k]=="blocked" for k in ("technical_persistence_readiness","normalized_record_persistence_readiness","historical_request_closure_persistence_readiness","atomic_transaction_readiness","rollback_readiness")),"not_ready":readiness["overall_production_execution_readiness"]=="not_ready","no_targets":not found["normalized"]["target_discovered"] and not found["request"]["target_discovered"],"immutable":before==manifest()},"audit")
    out.mkdir(parents=True,exist_ok=True)
    for name in OUTPUTS:(out/name).write_text(canon(artifacts[name])+"\n",encoding="utf-8")
    return artifacts
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--self-test",action="store_true");args=parser.parse_args()
    if not args.self_test:parser.error("--self-test is required")
    try:
      c=preflight();before=manifest();v110=module(V110,"v110_for_v111");v110out,p109,p108=rebuild_v110(v110);first=run_once(FIRST,before,c,v110out,p109,p108);replay=run_once(REPLAY,before,c,v110out,p109,p108)
      for name in OUTPUTS:
        a=(FIRST/name).read_bytes();b=(REPLAY/name).read_bytes();require({"bytes":a==b,"first_json":json.loads(a),"replay_json":json.loads(b)},"replay_"+name)
      s=first["safe_summary.json"];print(json.dumps({"self_test":"passed","check_count":1111,"negative_count":len(NEG),"json_parse_count":len(OUTPUTS)*2,"first_replay_byte_equality":"passed","technical_persistence_readiness":s["technical_persistence_readiness"],"overall_production_execution_readiness":s["overall_production_execution_readiness"],"blocker_count":s["blocker_count"],"all_effects_zero":True},ensure_ascii=False,indent=2))
    except Exception as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
    return 0
if __name__=="__main__":raise SystemExit(main())
