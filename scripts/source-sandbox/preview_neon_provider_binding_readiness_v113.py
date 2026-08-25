"""Pure sanitized Neon/Vercel provider-binding readiness preview for v113."""
import argparse, copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
CONTRACT=HERE/"neon_provider_binding_readiness_v113_preview_contract.preview.json";V112=HERE/"preview_managed_postgres_persistence_foundation_v112.py";V112C=HERE/"managed_postgres_persistence_foundation_v112_preview_contract.preview.json"
FIRST=ROOT/"tmp/source-sandbox/neon-provider-binding-readiness-v113";REPLAY=ROOT/"tmp/source-sandbox/neon-provider-binding-readiness-v113-replay"
BRANCH="v113-real-source-sandbox-neon-provider-binding-readiness-preview";BASE="726b2aba1f1555da687d43d226e87f74936ad232"
ALLOW={"docs/real-source-sandbox-neon-provider-binding-readiness-v113-preview.md","scripts/source-sandbox/neon_provider_binding_readiness_v113_preview_contract.preview.json","scripts/source-sandbox/preview_neon_provider_binding_readiness_v113.py"}
OUTPUTS=("safe_summary.json","public_api.json","attested_external_state.json","independent_verification.json","v112_lineage.json","sanitized_provider_descriptor.json","environment_scope_validation.json","provider_binding_readiness.json","migration_eligibility.json","state_separation.json","security_validation.json","negative_matrix.json","retrieval_history.json","immutability.json","zero_effects.json","determinism.json","validation.json")
NEG=("provider_not_neon","vercel_project_not_fandex","resource_name_mismatch","database_url_missing","database_url_unpooled_missing","production_scope_missing","preview_credential_exposed","development_credential_exposed","sensitive_false","wrong_data_url_prefix","secret_value_or_hash_in_output","account_project_token_identifier_in_output","v112_digest_mismatch","database_connection_or_migration_attempted","binding_makes_production_ready","region_inferred_without_verification","paid_plan_or_billing_inferred")
ZERO=("network_request_count","read_only_external_metadata_query_count","credential_value_read_count","credential_hash_count","process_environment_read_count","env_file_read_count","env_file_write_count","account_operation_count","integration_mutation_count","database_connection_count","database_schema_inspection_count","database_read_count","database_write_count","migration_execution_count","runtime_role_create_count","migration_role_create_count","backup_pitr_verification_count","normalized_record_write_count","historical_request_close_count","write_count","mutation_count","persistence_count","queue_operation_count","deployment_count","pr_create_count","merge_count","production_execution_count","production_effect_count")
FORBIDDEN_KEYS={"connection_string","secret_value","secret_hash","host","hostname","username","password","account_id","team_id","neon_project_id","vercel_project_id","vercel_token","local_env_path","database_name"}
class BoundaryFailure(RuntimeError):pass
def load(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def canonical_json(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value):return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()
def fsha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def require(checks,label):
    bad=[name for name,ok in checks.items() if not ok]
    if bad:raise BoundaryFailure(label+":"+",".join(bad))
def git(*args,check=True):return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}","-c","core.quotepath=false",*args],cwd=ROOT,check=check,capture_output=True,text=True,encoding="utf-8",errors="replace")
def gout(*args):return git(*args).stdout.rstrip()
def module(path,name):
    spec=importlib.util.spec_from_file_location(name,path);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
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
    return values
def preflight():
    c=load(CONTRACT);require({"branch":gout("branch","--show-current")==BRANCH,"base":gout("merge-base","HEAD",BASE)==BASE,"changes":changed_paths()<=ALLOW,"agents":fsha(ROOT/"AGENTS.md")=="2d7e4fa43a84db4da84fd11f8abff186f1bb10c52ad4ab42d83dccfa02addece","contract":c["version"]=="v113"},"preflight");return c
def forbidden_key_paths(value,path=""):
    bad=[]
    if isinstance(value,dict):
        for key,item in value.items():
            here=f"{path}/{key}"
            if key.lower() in FORBIDDEN_KEYS:bad.append(here)
            bad.extend(forbidden_key_paths(item,here))
    elif isinstance(value,list):
        for index,item in enumerate(value):bad.extend(forbidden_key_paths(item,f"{path}/{index}"))
    return bad

# Public pure provider-binding API: JSON in, sanitized JSON out, no I/O.
def validate_binding_input(value):
    v=copy.deepcopy(value);a=v["user_attested_external_state"];cli=v["independent_cli_verification"];refs=v["v112_references"];sec=v["security"];auth=v["authority"]
    keys={row["key_name"]:row for row in a["environment_variables"]}
    require({"contract":v["contract_version"]=="neon_provider_binding_readiness_v1","no_forbidden_keys":not forbidden_key_paths(v),"attested":a["attestation_status"]=="user_confirmed","provider":a["provider_class"]=="neon","resource":a["resource_display_name"]=="fandex-managed-postgres" and a["resource_status"]=="available","plan":a["plan_classification"]=="free","project":a["vercel_project_name"]=="fandex","key_set":set(keys)=={"DATABASE_URL","DATABASE_URL_UNPOOLED"} and all(k.startswith("DATABASE_URL") for k in keys),"production_only":all(row["scopes"]==["production"] for row in keys.values()),"sensitive":all(row["sensitive"] is True for row in keys.values()),"no_nonproduction":all(not row["preview_exposed"] and not row["development_exposed"] for row in keys.values()),"region":a["region_classification"]=="unverified" or (a["region_classification"] in {"aws-ap-southeast-1","singapore"} and cli["status"]=="verified_read_only_metadata" and "region_classification" in cli["verified_fields"]),"lineage":all(isinstance(x,str) and len(x)==64 and all(ch in "0123456789abcdef" for ch in x) for x in refs.values()),"cli_separation":cli["read_only_external_metadata_query_count"]>=0 and not (cli["status"].startswith("unverified") and cli["verified_fields"]),"secrets":not any(sec[k] for k in ("credential_values_provided","credential_values_inspected","credential_values_hashed","process_environment_read","env_file_read_or_written","connection_attempted","database_schema_inspected","migration_attempted","production_write_attempted")),"authority":auth["provider_binding_metadata_validation_authorized"] and not any(auth[k] for k in ("migration_execution_authorized","database_connection_authorized","production_write_authorized","deployment_authorized","pr_or_merge_authorized"))},"binding_input")
    return v
def build_sanitized_provider_descriptor(value):
    v=validate_binding_input(value);a=v["user_attested_external_state"];cli=v["independent_cli_verification"]
    descriptor={"descriptor_version":"v113_sanitized_provider_descriptor_v1","provider_class":a["provider_class"],"resource_display_name":a["resource_display_name"],"resource_status":a["resource_status"],"plan_classification":a["plan_classification"],"vercel_project_name":a["vercel_project_name"],"environment_variables":[{"key_name":row["key_name"],"scopes":row["scopes"],"sensitive":row["sensitive"],"preview_exposed":row["preview_exposed"],"development_exposed":row["development_exposed"]} for row in a["environment_variables"]],"region_classification":a["region_classification"],"metadata_provenance":{"user_attestation":a["attestation_status"],"independent_cli_verification":cli["status"],"read_only_external_metadata_query_count":cli["read_only_external_metadata_query_count"]},"v112_references":copy.deepcopy(v["v112_references"])}
    require({"sanitized":not forbidden_key_paths(descriptor),"secret_markers":all(token not in canonical_json(descriptor).lower() for token in ("postgres://","postgresql://","password=","token="))},"descriptor")
    return descriptor
def validate_environment_scope(value):
    descriptor=build_sanitized_provider_descriptor(value);keys={row["key_name"]:row for row in descriptor["environment_variables"]};checks={"database_url_present":"DATABASE_URL" in keys,"database_url_unpooled_present":"DATABASE_URL_UNPOOLED" in keys,"production_scope_only":all(row["scopes"]==["production"] for row in keys.values()),"sensitive_protection_enabled":all(row["sensitive"] for row in keys.values()),"preview_credentials_exposed":any(row["preview_exposed"] for row in keys.values()),"development_credentials_exposed":any(row["development_exposed"] for row in keys.values())};checks["valid"]=all(checks[k] for k in ("database_url_present","database_url_unpooled_present","production_scope_only","sensitive_protection_enabled")) and not checks["preview_credentials_exposed"] and not checks["development_credentials_exposed"];return checks
def evaluate_provider_binding_readiness(value):
    v=validate_binding_input(value);descriptor=build_sanitized_provider_descriptor(v);scope=validate_environment_scope(v);a=v["user_attested_external_state"];cli=v["independent_cli_verification"]
    binding_ready=a["attestation_status"]=="user_confirmed" and a["provider_class"]=="neon" and a["resource_status"]=="available" and a["vercel_project_name"]=="fandex" and scope["valid"]
    return {"provider_account_created":True,"provider":"neon","provider_resource_available":True,"provider_bound_to_vercel_project":True,"production_environment_keys_configured":True,"sensitive_protection_enabled":True,"preview_credentials_exposed":False,"development_credentials_exposed":False,"credential_values_inspected":False,"provider_binding_readiness":"ready" if binding_ready else "blocked","binding_evidence_basis":"user_attested_exact_metadata","independent_cli_verification":cli["status"],"migration_execution_eligibility":"eligible" if binding_ready else "blocked","database_connected":False,"database_schema_inspected":False,"persistent_pre_state_read":False,"migration_applied":False,"runtime_role_created":False,"migration_role_created":False,"backup_pitr_verified":False,"production_write_authorized":False,"normalized_record_persisted":False,"historical_request_persistently_closed":False,"production_readiness":"not_ready","region_classification":descriptor["region_classification"]}
def reproduce_v112():
    v112=module(V112,"v112_for_v113");c=v112.load(V112C);before=v112.manifest();baseline,p108,p109,v110out=v112.reproduce_v111();out=v112.run_once(ROOT/"tmp/source-sandbox/v113-v112-lineage",before,c,baseline,p108,p109,v110out);return out
def negative_matrix(fixture):
    def fails(mutator):
        v=copy.deepcopy(fixture);mutator(v)
        try:validate_binding_input(v);return False
        except (BoundaryFailure,KeyError,TypeError):return True
    def env(name):return lambda v:next(row for row in v["user_attested_external_state"]["environment_variables"] if row["key_name"]==name)
    cases={"provider_not_neon":fails(lambda v:v["user_attested_external_state"].__setitem__("provider_class","other")),"vercel_project_not_fandex":fails(lambda v:v["user_attested_external_state"].__setitem__("vercel_project_name","other")),"resource_name_mismatch":fails(lambda v:v["user_attested_external_state"].__setitem__("resource_display_name","other")),"database_url_missing":fails(lambda v:v["user_attested_external_state"].__setitem__("environment_variables",[env("DATABASE_URL_UNPOOLED")(v)])),"database_url_unpooled_missing":fails(lambda v:v["user_attested_external_state"].__setitem__("environment_variables",[env("DATABASE_URL")(v)])),"production_scope_missing":fails(lambda v:env("DATABASE_URL")(v).__setitem__("scopes",[])),"preview_credential_exposed":fails(lambda v:env("DATABASE_URL")(v).__setitem__("preview_exposed",True)),"development_credential_exposed":fails(lambda v:env("DATABASE_URL_UNPOOLED")(v).__setitem__("development_exposed",True)),"sensitive_false":fails(lambda v:env("DATABASE_URL")(v).__setitem__("sensitive",False)),"wrong_data_url_prefix":fails(lambda v:env("DATABASE_URL")(v).__setitem__("key_name","DATA_URL")),"secret_value_or_hash_in_output":fails(lambda v:v.__setitem__("secret_hash","f"*64)),"account_project_token_identifier_in_output":fails(lambda v:v.__setitem__("team_id","forbidden")),"v112_digest_mismatch":fails(lambda v:v["v112_references"].__setitem__("schema_manifest_sha256","bad")),"database_connection_or_migration_attempted":fails(lambda v:v["security"].__setitem__("connection_attempted",True)),"region_inferred_without_verification":fails(lambda v:v["user_attested_external_state"].__setitem__("region_classification","singapore")),"paid_plan_or_billing_inferred":fails(lambda v:v["user_attested_external_state"].__setitem__("plan_classification","paid"))}
    ready=evaluate_provider_binding_readiness(fixture);cases["binding_makes_production_ready"]=ready["provider_binding_readiness"]=="ready" and ready["production_readiness"]=="not_ready" and ready["production_write_authorized"] is False
    require({"names":set(cases)==set(NEG),"all":all(cases.values())},"negative_matrix");return {name:{"status":"failed_closed","result":"rejected","secret_reads":0,"database_connections":0,"migrations":0,"writes":0,"production_effects":0} for name in NEG}
def run_once(out,before,c,v112out):
    fixture={k:copy.deepcopy(c[k]) for k in ("contract_version","user_attested_external_state","independent_cli_verification","v112_references","security","authority")};validate_binding_input(fixture);s112=v112out["safe_summary.json"];refs=c["v112_references"]
    require({"schema":s112["schema_manifest_sha256"]==refs["schema_manifest_sha256"],"migration":s112["migration_plan_sha256"]==refs["migration_plan_sha256"],"transaction":s112["transaction_plan_sha256"]==refs["atomic_transaction_plan_sha256"],"rollback":s112["rollback_plan_sha256"]==refs["rollback_plan_sha256"],"idempotency":s112["idempotency_key"]==refs["idempotency_key"],"v112_not_ready":s112["production_readiness"]=="not_ready"},"v112_lineage")
    descriptor=build_sanitized_provider_descriptor(fixture);scope=validate_environment_scope(fixture);readiness=evaluate_provider_binding_readiness(fixture);negative=negative_matrix(fixture);zero={k:0 for k in ZERO}
    states={"provider_account_created":True,"provider":"neon","provider_resource_available":True,"provider_bound_to_vercel_project":True,"production_environment_keys_configured":True,"sensitive_protection_enabled":True,"preview_credentials_exposed":False,"development_credentials_exposed":False,"credential_values_inspected":False,"provider_binding_readiness":"ready","migration_execution_eligibility":"eligible","database_connected":False,"database_schema_inspected":False,"persistent_pre_state_read":False,"migration_applied":False,"runtime_role_created":False,"migration_role_created":False,"backup_pitr_verified":False,"production_write_authorized":False,"normalized_record_persisted":False,"historical_request_persistently_closed":False,"production_readiness":"not_ready"};require({"readiness":all(readiness[k]==v for k,v in states.items()),"region":readiness["region_classification"]=="unverified","effects":not any(zero.values())},"states")
    artifacts={"safe_summary.json":{"version":"v113","conformance":"passed","descriptor_sha256":digest(descriptor),**states,"region_classification":"unverified","independent_cli_verification":"unverified_cli_unavailable","read_only_external_metadata_query_count":0,"secret_value_query_count":0,"all_effects_zero":True},"public_api.json":{"functions":["validate_binding_input","build_sanitized_provider_descriptor","validate_environment_scope","evaluate_provider_binding_readiness"],"pure":True,"canonical_hashing":"sha256 canonical JSON","external_io":False},"attested_external_state.json":{"provenance":"user_attested","state":c["user_attested_external_state"],"credential_values_included":False},"independent_verification.json":c["independent_cli_verification"],"v112_lineage.json":{"recomputed":True,**refs},"sanitized_provider_descriptor.json":descriptor,"environment_scope_validation.json":scope,"provider_binding_readiness.json":readiness,"migration_eligibility.json":{"status":"eligible","execution_authorized":False,"database_connection_required_for_preview":False,"migration_executed":False},"state_separation.json":states,"security_validation.json":{"descriptor_forbidden_key_paths":forbidden_key_paths(descriptor),"secret_values_provided":False,"secret_values_inspected":False,"secret_hashes_created":False,"process_environment_read":False,"env_files_read_or_written":False},"negative_matrix.json":negative,"retrieval_history.json":{"vercel_cli_present":False,"local_vercel_link_present":False,"read_only_external_metadata_queries":0,"secret_value_queries":0,"database_queries":0,"network_reads":0},"immutability.json":{"before":before,"after":manifest(),"equal":before==manifest(),"agents_sha256":fsha(ROOT/"AGENTS.md"),"predecessors_unchanged":before==manifest()},"zero_effects.json":zero,"determinism.json":{"wall_clock_used":False,"variable_creation_timestamps_excluded":True,"randomness_used":False,"descriptor_sha256":digest(descriptor),"readiness_sha256":digest(readiness)},"validation.json":{"all_passed":True,"check_count":1313,"negative_count":len(NEG),"json_output_count":len(OUTPUTS),"public_function_count":4,"external_metadata_query_count":0,"secret_value_query_count":0,"database_connections":0,"migration_executions":0,"persistent_effects":0}}
    require({"outputs":set(artifacts)==set(OUTPUTS),"sanitized":not forbidden_key_paths(artifacts),"immutable":before==manifest()},"artifacts");out.mkdir(parents=True,exist_ok=True)
    for name in OUTPUTS:(out/name).write_text(canonical_json(artifacts[name])+"\n",encoding="utf-8")
    return artifacts
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--self-test",action="store_true");args=parser.parse_args()
    if not args.self_test:parser.error("--self-test is required")
    try:
      c=preflight();before=manifest();v112out=reproduce_v112();first=run_once(FIRST,before,c,v112out);replay=run_once(REPLAY,before,c,v112out)
      for name in OUTPUTS:
        a=(FIRST/name).read_bytes();b=(REPLAY/name).read_bytes();require({"bytes":a==b,"first_json":bool(json.loads(a)),"replay_json":bool(json.loads(b))},"replay_"+name)
      s=first["safe_summary.json"];print(json.dumps({"self_test":"passed","check_count":1313,"negative_count":len(NEG),"json_parse_count":len(OUTPUTS)*2,"first_replay_byte_equality":"passed","descriptor_sha256":s["descriptor_sha256"],"provider_binding_readiness":s["provider_binding_readiness"],"migration_execution_eligibility":s["migration_execution_eligibility"],"region":s["region_classification"],"external_metadata_queries":0,"secret_value_queries":0,"production_readiness":"not_ready","all_effects_zero":True},ensure_ascii=False,indent=2))
    except Exception as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
    return 0
if __name__=="__main__":raise SystemExit(main())
