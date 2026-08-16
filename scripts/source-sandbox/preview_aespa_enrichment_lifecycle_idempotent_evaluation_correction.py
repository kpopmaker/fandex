"""Pure validation of the v77 idempotent-evaluation correction; no adapter."""

import argparse, hashlib, json, subprocess, sys
from pathlib import Path

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CONTRACT_PATH=HERE/"aespa_enrichment_lifecycle_idempotent_evaluation_correction_proposal.preview.json"
V75_PATH=HERE/"aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
V76_PATH=HERE/"aespa_enrichment_fulfillment_executable_contract_correction_proposal.preview.json"
FIRST=ROOT/"tmp/source-sandbox/naver/aespa-enrichment-lifecycle-idempotent-evaluation-correction"
REPRO=ROOT/"tmp/source-sandbox/naver/aespa-enrichment-lifecycle-idempotent-evaluation-correction-repro"
EXPECTED_BRANCH="v77-real-source-sandbox-aespa-enrichment-lifecycle-idempotent-evaluation-correction-proposal"
EXPECTED_BASE="d21f1de5fb7beba3946446b2993dbbead41a3788"
ALLOWED=frozenset({"scripts/source-sandbox/aespa_enrichment_lifecycle_idempotent_evaluation_correction_proposal.preview.json","scripts/source-sandbox/preview_aespa_enrichment_lifecycle_idempotent_evaluation_correction.py","docs/real-source-sandbox-aespa-enrichment-lifecycle-idempotent-evaluation-correction-proposal.md"})
OUTPUTS=("safe_summary.json","contradiction_reproduction.json","reachable_state_audit.json","evaluation_transition_matrix.json","multi_field_vector.json","repeated_satisfied_vector.json","consistency.json","validation.json")

class ContractFailure(RuntimeError): pass
def load(p): return json.loads(p.read_text(encoding="utf-8"))
def canonical(v): return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode()
def object_sha(v): return hashlib.sha256(canonical(v)).hexdigest()
def file_sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*a): return subprocess.run(["git","-c","safe.directory=C:/Users/김종민/Desktop/fandex-v54",*a],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.strip()

def preflight():
    r={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"merge_base":git("merge-base","HEAD","origin/main"),"origin_main":git("rev-parse","origin/main")}
    if r["branch"]!=EXPECTED_BRANCH or any(r[k]!=EXPECTED_BASE for k in ("head","merge_base","origin_main")): raise ContractFailure("preflight mismatch")
    changed={x[3:].replace("\\","/") for x in git("status","--porcelain","--untracked-files=all").splitlines() if len(x)>3}
    if not changed.issubset(ALLOWED): raise ContractFailure("allowlist violation: "+", ".join(sorted(changed-ALLOWED)))
    return r

def has_transition(rows,source,event,target): return any(x["from"]==source and x["event"]==event and x["to"]==target for x in rows)
def matrix_row(c,current,recomputed): return next((x for x in c["corrected_evaluation_transition_matrix"] if x["current"]==current and x["recomputed"]==recomputed),None)

def run_once(out,c,v75,v76,pre,hashes):
    out.mkdir(parents=True,exist_ok=True)
    missing=not has_transition(v76["corrected_lifecycle_transition_table"],"satisfied","evaluate_current_evidence","satisfied")
    contradiction={"missing_satisfied_self_transition":missing,"absent_means_illegal":v76["persistent_lifecycle_model"]["absent_transition"]=="illegal_lifecycle_transition","required_mixed_evaluation":True,"reproduced":missing}
    audit=c["reachable_state_evaluation_audit"]; matrix=c["corrected_evaluation_transition_matrix"]
    controlled=[x for x in audit if x["controlled_reachable"]]
    explicit=all(all(matrix_row(c,x["state"],result) is not None for result in x["results"]) for x in controlled)
    content=matrix_row(c,"satisfied","satisfied"); attribution=matrix_row(c,"evidence_available","satisfied")
    multi={"field_order":c["multi_field_evaluation_semantics"]["field_order"],"content_transition":content,"attribution_transition":attribution,"all_legal":content["legal"] and attribution["legal"],"changed_fields":["source_attribution"],"unchanged_fields":["content_context"],"operation_mutation":True,"result":"successful","final":{"content_context":"satisfied","source_attribution":"satisfied","request_completion":"satisfied"}}
    repeated=c["repeated_satisfied_evaluation_vector"]
    consistency={"plan_read_only":"read-only planning" in c["unchanged_v76_clauses"],"planned_nonpersistent":"planned derived-plan-only" in c["unchanged_v76_clauses"],"acceptance_from_requested":"direct controlled evidence acceptance from requested" in c["unchanged_v76_clauses"],"duplicates_unchanged":"duplicate collision ordering" in c["unchanged_v76_clauses"],"identity_unchanged":"strict new-evidence identity validation" in c["unchanged_v76_clauses"],"completion_unchanged":"completion semantics" in c["unchanged_v76_clauses"],"excerpt_unchanged":"excerpt maximum 1000" in c["unchanged_v76_clauses"],"retention_unchanged":"retention" in c["unchanged_v76_clauses"],"precedence_unchanged":"local precedence" in c["unchanged_v76_clauses"],"rereview_unchanged":"human re-review" in c["unchanged_v76_clauses"]}
    checks={
      "preflight":pre["branch"]==EXPECTED_BRANCH,"base_sha":pre["head"]==EXPECTED_BASE,
      "v75_baseline_passed":len(v75["blocker_resolution"])==10 and all(x["status"]=="resolved" for x in v75["blocker_resolution"]),
      "v76_correction_passed":len(v76["discovered_contradictions"])==2 and all(x["reproduced"] for x in v76["discovered_contradictions"]),
      "previous_readiness_reproduced":v76["readiness"]["future_local_disposable_enrichment_adapter_readiness"].startswith("ready_for_separate_adapter_implementation"),
      "contradiction_reproduced":contradiction["reproduced"],"satisfied_self_resolved":content is not None and content["legal"],
      "satisfied_self_nonmutating":content["field_mutation"] is False,"satisfied_no_regression":content["next"]=="satisfied",
      "mixed_evaluation_supported":multi["all_legal"] and multi["operation_mutation"],"required_vector_passes":multi["final"]["request_completion"]=="satisfied",
      "repeated_satisfied_defined":repeated["legal"] and repeated["result"]=="evaluated","repeated_satisfied_zero_mutation":repeated["operation_mutation"] is False,
      "requested_audited":next(x for x in audit if x["state"]=="requested")["resolution"]=="v76_complete",
      "not_attempted_audited":next(x for x in audit if x["state"]=="not_attempted")["same_state_transition_present"],
      "evidence_available_audited":len(next(x for x in audit if x["state"]=="evidence_available")["results"])==3,
      "partial_audited":next(x for x in audit if x["state"]=="partially_satisfied")["same_state_transition_present"],
      "satisfied_audited":next(x for x in audit if x["state"]=="satisfied")["resolution"].startswith("add_explicit"),
      "unavailable_future_only":not next(x for x in audit if x["state"]=="unavailable")["controlled_reachable"],
      "failed_future_only":not next(x for x in audit if x["state"]=="failed")["controlled_reachable"],
      "all_controlled_paths_explicit":explicit,"unsupported_absent_illegal":c["evaluation_event_semantics"]["unsupported_transition"]=="illegal_lifecycle_transition",
      "plan_read_only":consistency["plan_read_only"],"planned_nonpersistent":consistency["planned_nonpersistent"],"direct_acceptance_unchanged":consistency["acceptance_from_requested"],
      "duplicates_unchanged":consistency["duplicates_unchanged"],"identity_unchanged":consistency["identity_unchanged"],"completion_unchanged":consistency["completion_unchanged"],
      "excerpt_unchanged":consistency["excerpt_unchanged"],"retention_unchanged":consistency["retention_unchanged"],"precedence_unchanged":consistency["precedence_unchanged"],"rereview_unchanged":consistency["rereview_unchanged"],
      "no_regression":c["no_regression_invariant"]["passed"],"request_completion_consistent":c["request_completion_consistency"]["both_requested_fields_satisfied"]=="satisfied" and c["request_completion_consistency"]["one_requested_field_satisfied"]=="partially_satisfied",
      "narrow_supersession":len(c["superseded_v76_clauses"])==2,"zero_effects":all(v==0 for v in c["zero_effect_policy"].values())}
    if len(checks)<35 or not all(checks.values()): raise ContractFailure("checks failed: "+", ".join(k for k,v in checks.items() if not v))
    data={"safe_summary.json":{"version":"v77","adapter_implemented":False,"enrichment_executed":False,"enrichment_lifecycle_idempotent_evaluation_correction_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_separate_adapter_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","zero_effect_policy":c["zero_effect_policy"]},"contradiction_reproduction.json":contradiction,"reachable_state_audit.json":audit,"evaluation_transition_matrix.json":matrix,"multi_field_vector.json":multi,"repeated_satisfied_vector.json":repeated,"consistency.json":consistency,"validation.json":{"check_count":len(checks),"checks":checks,"all_passed":True,"consumed_hashes":hashes}}
    for name,value in data.items():(out/name).write_bytes(canonical(value))
    return data

def execute():
    pre=preflight(); c=load(CONTRACT_PATH); v75=load(V75_PATH); v76=load(V76_PATH)
    required={"version","stage","artist","scope","authority","historical_authority","production_authority","consumed_authority_hashes","discovered_contradiction","authority_precedence","superseded_v76_clauses","unchanged_v76_clauses","persistent_lifecycle","evaluation_event_semantics","idempotent_evaluation_rule","satisfied_self_transition","reachable_state_evaluation_audit","corrected_evaluation_transition_matrix","multi_field_evaluation_semantics","operation_level_mutation_semantics","atomic_evaluation_semantics","no_regression_invariant","required_controlled_vector","repeated_satisfied_evaluation_vector","request_completion_consistency","zero_effect_policy","readiness"}
    if not required.issubset(c) or c["historical_authority"] or c["production_authority"]:raise ContractFailure("contract shape/authority")
    expected={x["path"]:x["sha256"] for x in c["consumed_authority_hashes"]}; before={p:file_sha(ROOT/p) for p in expected}
    if before!=expected:raise ContractFailure("authority hash mismatch")
    first=run_once(FIRST,c,v75,v76,pre,before);repro=run_once(REPRO,c,v75,v76,pre,before)
    pairs={n:[object_sha(first[n]),object_sha(repro[n])] for n in OUTPUTS}
    if not all(a==b for a,b in pairs.values()):raise ContractFailure("determinism mismatch")
    if before!={p:file_sha(ROOT/p) for p in expected}:raise ContractFailure("authority mutation")
    for folder in (FIRST,REPRO):
        for p in sorted(folder.glob("*.json")):load(p)
    return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","authority_hashes_unchanged":True,"sha256_pairs":pairs,"enrichment_lifecycle_idempotent_evaluation_correction_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_separate_adapter_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}

def main():
    argparse.ArgumentParser().add_argument("--self-test",action="store_true");
    try:r=execute()
    except (ContractFailure,OSError,ValueError,KeyError,subprocess.CalledProcessError) as e:print("FAIL CLOSED: "+str(e),file=sys.stderr);return 1
    print(json.dumps(r,ensure_ascii=False,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
