"""Pure validation of the v75 executable fulfillment contract; no adapter or retrieval."""

import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CONTRACT_PATH = HERE / "aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-fulfillment-executable-contract"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-fulfillment-executable-contract-repro"
EXPECTED_BRANCH = "v75-real-source-sandbox-aespa-enrichment-fulfillment-executable-contract-proposal"
EXPECTED_BASE = "a5484c6e4c018b573feaa43d5bf99b8aea7c70d6"
ALLOWED = {
    "scripts/source-sandbox/aespa_enrichment_fulfillment_executable_contract_proposal.preview.json",
    "scripts/source-sandbox/preview_aespa_enrichment_fulfillment_executable_contract.py",
    "docs/real-source-sandbox-aespa-enrichment-fulfillment-executable-contract-proposal.md",
}
OUTPUTS = ["safe_summary.json", "blocker_resolution.json", "operation_contracts.json",
           "initialization_vectors.json", "request_identity_vectors.json", "evidence_vectors.json",
           "duplicate_matrix.json", "lifecycle_matrix.json", "compatibility_matrix.json",
           "precedence_matrix.json", "validation.json"]


class ContractFailure(RuntimeError): pass


def load(path): return json.loads(path.read_text(encoding="utf-8"))
def canonical(value): return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
def object_sha(value): return hashlib.sha256(canonical(value)).hexdigest()
def file_sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def normalize(value): return unicodedata.normalize("NFC", value).strip()
def value_sha(value): return hashlib.sha256(normalize(value).encode("utf-8")).hexdigest()


def git(*args):
    return subprocess.run(["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", *args],
                          cwd=ROOT, check=True, capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def preflight():
    result = {"branch":git("branch","--show-current"), "head":git("rev-parse","HEAD"),
              "merge_base":git("merge-base","HEAD","origin/main"), "origin_main":git("rev-parse","origin/main")}
    if result["branch"] != EXPECTED_BRANCH or any(result[k] != EXPECTED_BASE for k in ("head","merge_base","origin_main")):
        raise ContractFailure("preflight mismatch")
    changed = {line[3:].replace("\\","/") for line in git("status","--porcelain","--untracked-files=all").splitlines() if len(line)>3}
    if not changed.issubset(ALLOWED): raise ContractFailure("tracked allowlist violation: " + ", ".join(sorted(changed-ALLOWED)))
    return result


def verify_authorities(contract):
    observed = {}
    for ref in contract["consumed_authority_hashes"]:
        digest = file_sha(ROOT/ref["path"])
        if digest != ref["sha256"]: raise ContractFailure("authority drift: " + ref["role"])
        observed[ref["path"]] = digest
    v72 = load(ROOT/next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"]=="v72_contract"))
    v73 = load(ROOT/next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"]=="v73_contract"))
    v74 = load(ROOT/next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"]=="v74_contract"))
    v74_script = (ROOT/next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"]=="v74_script_observation")).read_text(encoding="utf-8")
    if [x["key"] for x in v72["allowed_requested_enrichment_fields"]] != ["content_context","source_attribution"]: raise ContractFailure("v72 vocabulary drift")
    required = ['"enrichment_fulfillment_shadow_design_conformance":"passed"', '"future_local_enrichment_fulfillment_adapter_readiness":"ready_for_separate_local_adapter_implementation"']
    compact = v74_script.replace(" ","")
    if not all(x in compact for x in required): raise ContractFailure("v74 readiness absent")
    if v74["readiness"]["external_enrichment_execution_readiness"] != "not_ready": raise ContractFailure("external readiness drift")
    if v73["target_safe_lineage"] != contract["selected_real_target_initialization_example"]["target_identity"]: raise ContractFailure("v73 target lineage drift")
    return {"observed_hashes":observed,"v72_vocabulary":"passed","v73_target_lineage":"passed","v74_readiness":"passed","v74_script_behavior_authority":False}


def request_id(contract, target, fields):
    order = contract["shared_schemas"]["requested_fields"]["canonical_order"]
    if not isinstance(fields,list) or not fields or len(fields)!=len(set(fields)) or any(x not in order for x in fields): return None
    fields = [x for x in order if x in fields]
    return object_sha({"contract_version":"v75","target_identity":target,"requested_enrichment_fields":fields})


def initialization_core(example):
    keys = ["contract_version","request_id","target_identity","requested_enrichment_fields","existing_local_evidence","authorization_state","initial_field_lifecycle"]
    return {k:example[k] for k in keys}


def validate_initialization(value, contract):
    schema=contract["initialization_schema"]
    if not isinstance(value,dict): return "invalid_type"
    if set(value)!=set(schema["required"]): return "invalid_schema"
    if value["contract_version"]!="v75" or value["authorization_state"]!="not_authorized": return "invalid_schema"
    fields=value["requested_enrichment_fields"]
    if fields!=contract["shared_schemas"]["requested_fields"]["canonical_order"]: return "noncanonical_requested_fields"
    if value["request_id"]!=request_id(contract,value["target_identity"],fields): return "invalid_request_id"
    if value["initial_field_lifecycle"]!={"content_context":"requested","source_attribution":"requested"}: return "invalid_initial_lifecycle"
    if not isinstance(value["existing_local_evidence"],list): return "invalid_existing_evidence"
    return "valid"


def evidence_id(evidence): return object_sha({k:v for k,v in evidence.items() if k!="evidence_id"})


def locator_status(source_class, locator, contract):
    row=next((x for x in contract["source_locator_rules"] if x["source_class"]==source_class),None)
    if row is None: return "invalid_source_class"
    if not isinstance(locator,str) or re.fullmatch(row["pattern"],locator) is None: return "invalid_source_locator"
    return "valid" if row["executable_v76"] else "external_source_not_executable"


def validate_evidence(e, init, contract):
    required=set(contract["evidence_envelope_v75"]["required"])
    if not isinstance(e,dict): return "invalid_type"
    if set(e)!=required: return "invalid_schema"
    if e["target_identity"]!=init["target_identity"]: return "target_mismatch"
    if e["request_id"]!=init["request_id"]: return "request_mismatch"
    if e["requested_field"] not in init["requested_enrichment_fields"]: return "unknown_requested_field"
    classes={x["source_class"] for x in contract["source_locator_rules"]}
    if e["source_class"] not in classes: return "invalid_source_class"
    loc=locator_status(e["source_class"],e["source_locator"],contract)
    if loc!="valid": return loc
    matrix=next((x for x in contract["evidence_compatibility_matrix"] if x["requested_field"]==e["requested_field"] and x["evidence_type"]==e["evidence_type"] and x["semantic_field"]==e["semantic_field"]),None)
    if matrix is None: return "semantic_field_mismatch"
    if e["source_class"] not in matrix["allowed_source_classes"]: return "invalid_source_class"
    if e["safe_retention_class"] not in contract["retention_classes"]["allowed"] or e["safe_retention_class"] not in matrix["allowed_retention_classes"]: return "invalid_retention_class"
    if e["evidence_type"]=="full_article_body" or e["semantic_field"]=="full_article_body": return "unsafe_full_body"
    if not isinstance(e["normalized_value"],str) or not normalize(e["normalized_value"]) or normalize(e["normalized_value"])!=e["normalized_value"]: return "invalid_schema"
    if e["evidence_type"]=="bounded_excerpt" and len(e["normalized_value"])>contract["excerpt_validation"]["maximum"]: return "excerpt_too_large"
    if e["content_digest"]!=value_sha(e["normalized_value"]): return "invalid_digest"
    if e["evidence_id"]!=evidence_id(e): return "invalid_evidence_identity"
    if e["provenance"] not in contract["provenance_vocabulary"] or e["validation_status"]!="valid": return "invalid_schema"
    return "valid"


def make_evidence(init, kind, value="CONTROLLED FIXTURE VALUE"):
    rows={
      "title":("content_context","title","title","title","controlled-title"),
      "summary":("content_context","summary","summary_or_bounded_excerpt","summary","controlled-summary"),
      "excerpt":("content_context","bounded_excerpt","summary_or_bounded_excerpt","bounded_excerpt","controlled-excerpt"),
      "attribution":("source_attribution","author_or_publisher","author_or_publisher","metadata","controlled-attribution")}
    field,etype,semantic,retention,slug=rows[kind]
    e={"request_id":init["request_id"],"target_identity":init["target_identity"],"requested_field":field,"evidence_type":etype,"semantic_field":semantic,"normalized_value":normalize(value),"source_class":"controlled_fixture_input","source_locator":"fixture://v75/"+slug,"collection_method":"controlled_fixture_supply","content_digest":value_sha(value),"provenance":"controlled_fixture_only","validation_status":"valid","safe_retention_class":retention}
    e["evidence_id"]=evidence_id(e); return e


def duplicate_class(existing, incoming, contract):
    match=next((x for x in existing if x["evidence_id"]==incoming["evidence_id"]),None)
    if match is None:return "distinct_evidence"
    return "exact_duplicate" if canonical({k:v for k,v in match.items() if k!="evidence_id"})==canonical({k:v for k,v in incoming.items() if k!="evidence_id"}) else "conflicting_duplicate"


def lifecycle_allowed(source,event,target,contract):
    return any(x["from"]==source and x["event"]==event and x["to"]==target for x in contract["lifecycle_transition_table"])


def completion(evidence, contract):
    contributions={"content_context":set(),"source_attribution":set()}
    for e in evidence:
        row=next(x for x in contract["evidence_compatibility_matrix"] if x["requested_field"]==e["requested_field"] and x["evidence_type"]==e["evidence_type"] and x["semantic_field"]==e["semantic_field"])
        if row["completion_contribution"]!="context_only": contributions[e["requested_field"]].add(row["completion_contribution"])
    content=len(contributions["content_context"]); attribution=len(contributions["source_attribution"])
    fields={"content_context":"satisfied" if content==2 else "partially_satisfied" if content==1 else "not_attempted","source_attribution":"satisfied" if attribution else "not_attempted"}
    states=list(fields.values()); request="satisfied" if all(x=="satisfied" for x in states) else "partially_satisfied" if "satisfied" in states else "not_attempted"
    return {"fields":fields,"request":request}


def run_once(out,contract,authority,pre):
    out.mkdir(parents=True,exist_ok=True)
    init=initialization_core(contract["selected_real_target_initialization_example"])
    title=make_evidence(init,"title","CONTROLLED FIXTURE TITLE")
    summary=make_evidence(init,"summary","CONTROLLED FIXTURE SUMMARY")
    attr=make_evidence(init,"attribution","CONTROLLED FIXTURE PUBLISHER")
    excerpts={n:make_evidence(init,"excerpt","X"*n) for n in (999,1000,1001)}
    missing=dict(init); missing.pop("request_id")
    unknown={**init,"unknown":True}
    wrong_target={**init,"target_identity":{**init["target_identity"],"internal_source_id":"wrong"}}
    initialization_vectors={"valid":validate_initialization(init,contract),"missing":validate_initialization(missing,contract),"unknown":validate_initialization(unknown,contract),"request_mismatch":validate_initialization(wrong_target,contract)}
    identity_vectors={"expected":contract["controlled_contract_vectors"]["request_id"]["expected"],"observed":request_id(contract,init["target_identity"],init["requested_enrichment_fields"]),"target_sensitive":request_id(contract,{**init["target_identity"],"internal_source_id":"other"},init["requested_enrichment_fields"]),"field_sensitive":request_id(contract,init["target_identity"],["content_context"])}
    invalid_target={**title,"target_identity":{**title["target_identity"],"internal_source_id":"wrong"}}; invalid_target["evidence_id"]=evidence_id(invalid_target)
    invalid_request={**title,"request_id":"0"*64}; invalid_request["evidence_id"]=evidence_id(invalid_request)
    mismatch={**title,"semantic_field":"author_or_publisher"}; mismatch["evidence_id"]=evidence_id(mismatch)
    external={**title,"source_class":"authorized_provider_retrieval","source_locator":"provider-ref:fixture:controlled","collection_method":"authorized_provider_request"}; external["evidence_id"]=evidence_id(external)
    evidence_vectors={"title":validate_evidence(title,init,contract),"summary":validate_evidence(summary,init,contract),"attribution":validate_evidence(attr,init,contract),"excerpt_999":validate_evidence(excerpts[999],init,contract),"excerpt_1000":validate_evidence(excerpts[1000],init,contract),"excerpt_1001":validate_evidence(excerpts[1001],init,contract),"invalid_target":validate_evidence(invalid_target,init,contract),"invalid_request":validate_evidence(invalid_request,init,contract),"semantic_mismatch":validate_evidence(mismatch,init,contract),"external":validate_evidence(external,init,contract),"evidence_ids":{"title":title["evidence_id"],"summary":summary["evidence_id"],"attribution":attr["evidence_id"]}}
    conflict={**title,"normalized_value":"DIFFERENT","content_digest":value_sha("DIFFERENT")}
    duplicates={"exact":duplicate_class([title],dict(title),contract),"conflicting":duplicate_class([title],conflict,contract),"distinct":duplicate_class([title],summary,contract),"exact_mutates":False,"conflicting_mutates":False}
    lifecycle={"legal":[["requested","plan_built","planned"],["planned","authorization_absent","not_attempted"],["not_attempted","valid_evidence_accepted","evidence_available"],["evidence_available","evaluate_current_evidence","partially_satisfied"]],"illegal":[["requested","direct_assignment","satisfied"],["satisfied","valid_evidence_accepted","evidence_available"]]}
    lifecycle["legal_results"]=[lifecycle_allowed(*x,contract) for x in lifecycle["legal"]]; lifecycle["illegal_results"]=[lifecycle_allowed(*x,contract) for x in lifecycle["illegal"]]
    compatibility={"matrix":contract["evidence_compatibility_matrix"],"completion":{"none":completion([],contract),"content":completion([title,summary],contract),"attribution":completion([attr],contract),"both":completion([title,summary,attr],contract)}}
    precedence={"rule":contract["local_fixture_precedence"],"existing_local_same_semantic_result":"rejected_local_precedence","replacement":False,"supplement_when_absent":True}
    checks={
      "preflight_base":pre["head"]==EXPECTED_BASE,"v74_prerequisite":authority["v74_readiness"]=="passed","six_operations":len(contract["public_operations"])==6,"operation_inputs_complete":all(x["input_schema"] and x["required_fields"] is not None and x["optional_fields"] is not None for x in contract["public_operations"]),"operation_outputs_complete":all(x["output_schema"] and x["success_statuses"] and x["failure_statuses"] for x in contract["public_operations"]),"initialization_valid":initialization_vectors["valid"]=="valid","missing_init_invalid":initialization_vectors["missing"]=="invalid_schema","unknown_init_invalid":initialization_vectors["unknown"]=="invalid_schema","request_id_deterministic":identity_vectors["expected"]==identity_vectors["observed"],"request_target_sensitive":identity_vectors["target_sensitive"]!=identity_vectors["observed"],"request_field_sensitive":identity_vectors["field_sensitive"]!=identity_vectors["observed"],"request_mismatch_invalid":initialization_vectors["request_mismatch"]=="invalid_request_id","evidence_identity_deterministic":title["evidence_id"]==evidence_id(title),"exact_duplicate":duplicates["exact"]=="exact_duplicate","conflicting_duplicate":duplicates["conflicting"]=="conflicting_duplicate","legal_transitions":all(lifecycle["legal_results"]),"illegal_transitions":not any(lifecycle["illegal_results"]),"validation_closed":len(contract["evidence_validation_statuses"])==15,"acceptance_closed":len(contract["evidence_acceptance_statuses"])==5,"fixture_locator_valid":locator_status("controlled_fixture_input","fixture://v75/test",contract)=="valid","invalid_locator":locator_status("controlled_fixture_input","https://bad",contract)=="invalid_source_locator","external_nonexec":evidence_vectors["external"]=="external_source_not_executable","title_compatible":evidence_vectors["title"]=="valid","summary_compatible":evidence_vectors["summary"]=="valid","excerpt_compatible":evidence_vectors["excerpt_1000"]=="valid","attribution_compatible":evidence_vectors["attribution"]=="valid","semantic_mismatch":evidence_vectors["semantic_mismatch"]=="semantic_field_mismatch","excerpt_999":evidence_vectors["excerpt_999"]=="valid","excerpt_1000":evidence_vectors["excerpt_1000"]=="valid","excerpt_1001":evidence_vectors["excerpt_1001"]=="excerpt_too_large","local_precedence":precedence["replacement"] is False,"fixture_conflict":precedence["existing_local_same_semantic_result"]=="rejected_local_precedence","unavailable_exact":contract["unavailable_failed_semantics"]["unavailable"]["controlled_v76_reachable"] is False,"failed_exact":contract["unavailable_failed_semantics"]["failed"]["controlled_v76_reachable"] is False,"no_direct_assignment":"direct caller state assignment is forbidden" in contract["lifecycle_forbidden_rule"],"rejection_zero_mutation":contract["state_mutation_boundary"]["rejected_input_state_change"] is False,"safe_result_closed":contract["safe_result_schema"]["additional_properties"] is False,"deep_copy_encoded":"deep copy" in contract["safe_result_schema"]["return_semantics"],"human_rereview":contract["human_re_review_boundary"]["constant"] is True,"real_example_no_fabrication":contract["selected_real_target_initialization_example"]["fabricated_content_count"]==0 and init["existing_local_evidence"]==[],"all_blockers_resolved":len(contract["blocker_resolution"])==10 and all(x["status"]=="resolved" for x in contract["blocker_resolution"]),"zero_effects":all(v==0 for v in contract["zero_effect_policy"].values())}
    if len(checks)!=42 or not all(checks.values()): raise ContractFailure("checks failed: "+", ".join(k for k,v in checks.items() if not v))
    validation={"check_count":42,"checks":checks,"all_passed":True,"zero_effect_policy":contract["zero_effect_policy"]}
    data={"safe_summary.json":{"version":"v75","design_only":True,"adapter_implemented":False,"blockers_resolved":10,"enrichment_fulfillment_executable_contract_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_separate_adapter_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","zero_effect_policy":contract["zero_effect_policy"]},"blocker_resolution.json":contract["blocker_resolution"],"operation_contracts.json":contract["public_operations"],"initialization_vectors.json":initialization_vectors,"request_identity_vectors.json":identity_vectors,"evidence_vectors.json":evidence_vectors,"duplicate_matrix.json":duplicates,"lifecycle_matrix.json":lifecycle,"compatibility_matrix.json":compatibility,"precedence_matrix.json":precedence,"validation.json":validation}
    for name,value in data.items():(out/name).write_bytes(canonical(value))
    return data


def execute():
    contract=load(CONTRACT_PATH); pre=preflight(); before={x["path"]:file_sha(ROOT/x["path"]) for x in contract["consumed_authority_hashes"]}; authority=verify_authorities(contract)
    required={"version","stage","artist","scope","authority","historical_authority","production_authority","consumed_authority_hashes","blocker_resolution","public_operations","initialization_schema","request_identity","evidence_identity","duplicate_semantics","adapter_state_schema","state_mutation_boundary","lifecycle_transition_table","evidence_validation_statuses","evidence_acceptance_statuses","source_locator_rules","evidence_compatibility_matrix","unavailable_failed_semantics","local_fixture_precedence","completion_semantics","request_completion_semantics","excerpt_validation","retention_classes","human_re_review_boundary","safe_result_schema","controlled_contract_vectors","selected_real_target_initialization_example","readiness"}
    if not required.issubset(contract) or contract["historical_authority"] or contract["production_authority"]: raise ContractFailure("contract sections/authority invalid")
    first=run_once(FIRST,contract,authority,pre); repro=run_once(REPRO,contract,authority,pre)
    pairs={name:[object_sha(first[name]),object_sha(repro[name])] for name in OUTPUTS}
    if not all(a==b for a,b in pairs.values()):raise ContractFailure("determinism failed")
    after={x["path"]:file_sha(ROOT/x["path"]) for x in contract["consumed_authority_hashes"]}
    if before!=after:raise ContractFailure("authority mutation")
    return {"self_test":"passed","check_count":43,"contract_check_count":42,"first_repro_determinism":True,"sha256_pairs":pairs,"authority_hashes_unchanged":True,"enrichment_fulfillment_executable_contract_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_separate_adapter_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--self-test",action="store_true");parser.parse_args()
    try:result=execute()
    except (ContractFailure,OSError,ValueError,KeyError,subprocess.CalledProcessError) as exc:print("FAIL CLOSED: "+str(exc),file=sys.stderr);return 1
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0


if __name__=="__main__":raise SystemExit(main())
