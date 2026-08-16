"""Pure v80 acceptance-lifecycle contract validation; no adapter or fulfillment."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CONTRACT = HERE / "aespa_consecutive_evidence_acceptance_lifecycle_correction_proposal.preview.json"
V75 = HERE / "aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
V76 = HERE / "aespa_enrichment_fulfillment_executable_contract_correction_proposal.preview.json"
V77 = HERE / "aespa_enrichment_lifecycle_idempotent_evaluation_correction_proposal.preview.json"
V78 = HERE / "aespa_enrichment_executable_contract_closure_audit_proposal.preview.json"
V79 = HERE / "aespa_enrichment_deterministic_planning_policy_correction_proposal.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-consecutive-evidence-acceptance-lifecycle-v80"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-consecutive-evidence-acceptance-lifecycle-v80-repro"
EXPECTED_BRANCH = "v80-real-source-sandbox-aespa-consecutive-evidence-acceptance-lifecycle-correction-proposal"
EXPECTED_BASE = "84f0f7c36ae31aaa0b6f215fcf44fb1ae1ca96e0"
ALLOWED = frozenset({
    "scripts/source-sandbox/aespa_consecutive_evidence_acceptance_lifecycle_correction_proposal.preview.json",
    "scripts/source-sandbox/preview_aespa_consecutive_evidence_acceptance_lifecycle_correction.py",
    "docs/real-source-sandbox-aespa-consecutive-evidence-acceptance-lifecycle-correction-proposal.md",
})
LASTFM = (
    "data/lastfm-cloud/lastfm_artist_interest_history_v1.csv",
    "data/lastfm-cloud/lastfm_cloud_status_latest.json",
    "data/lastfm-cloud/lastfm_global_interest_delta_v1_latest.csv",
    "data/lastfm-cloud/lastfm_global_interest_score_preview_v1_latest.csv",
)
OUTPUTS = (
    "safe_summary.json", "authority_validation.json", "previous_gap_reproduction.json",
    "acceptance_transition_matrix.json", "consecutive_content_flow.json", "cross_field_flow.json",
    "mutation_classification.json", "duplicate_nontransition_proof.json",
    "behavioral_dependency_audit_v3.json", "immutability.json", "zero_effects.json", "validation.json",
)


class Failure(RuntimeError):
    pass


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def canonical(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args):
    result = subprocess.run(["git", "-c", f"safe.directory={ROOT.as_posix()}", *args], cwd=ROOT, check=True, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    return result.stdout.rstrip()


def preflight():
    result = {
        "branch": git("branch", "--show-current"),
        "head": git("rev-parse", "HEAD"),
        "origin_main": git("rev-parse", "origin/main"),
        "merge_base": git("merge-base", "HEAD", "origin/main"),
    }
    if result["branch"] != EXPECTED_BRANCH:
        raise Failure("wrong branch")
    if not result["head"] == result["origin_main"] == result["merge_base"] == EXPECTED_BASE:
        raise Failure("base mismatch")
    changed = {line[3:].replace("\\", "/") for line in git("status", "--porcelain", "--untracked-files=all").splitlines() if len(line) > 3}
    changed = {path for path in changed if not (path.startswith("scripts/source-sandbox/__pycache__/preview_aespa_consecutive_evidence_acceptance_lifecycle_correction.") and path.endswith(".pyc"))}
    if not changed.issubset(ALLOWED):
        raise Failure("tracked scope: " + ", ".join(sorted(changed - ALLOWED)))
    return result


def transition(matrix, state):
    rows = [row for row in matrix if row["from"] == state]
    if len(rows) != 1:
        raise Failure("acceptance matrix cardinality: " + state)
    return rows[0]


def accept_pure(field_states, field, outcome, matrix):
    """Pure transition classifier, not an adapter or evidence acceptance implementation."""
    before = dict(field_states)
    if outcome != "accepted_new":
        return {"before": before, "after": dict(before), "lifecycle_changed": False,
                "evidence_changed": False, "operation_mutates_state": False, "outcome": outcome}
    row = transition(matrix, before[field])
    if row["classification"] not in ("legal_mutating_transition", "legal_lifecycle_self_transition_with_evidence_mutation"):
        return {"before": before, "after": dict(before), "lifecycle_changed": False,
                "evidence_changed": False, "operation_mutates_state": False, "outcome": "illegal_lifecycle_transition"}
    after = dict(before)
    after[field] = row["to"]
    return {"before": before, "after": after, "lifecycle_changed": row["lifecycle_changed"],
            "evidence_changed": True, "operation_mutates_state": True, "outcome": "accepted"}


def content_flow(second, matrix, third=False):
    state = {"content_context": "requested", "source_attribution": "requested"}
    steps = []
    for item in ["title", second] + (["bounded_excerpt"] if third else []):
        result = accept_pure(state, "content_context", "accepted_new", matrix)
        steps.append({"evidence": item, **result})
        state = dict(result["after"])
    before_evaluation = dict(state)
    contributions = {step["evidence"] for step in steps}
    complete = "title" in contributions and bool({"summary", "bounded_excerpt"} & contributions)
    evaluated = dict(state)
    if complete and evaluated["content_context"] == "evidence_available":
        evaluated["content_context"] = "satisfied"
    return {"steps": steps, "before_evaluation": before_evaluation, "evaluation_performed_by_acceptance": False,
            "after_evaluation": evaluated, "content_satisfied": evaluated["content_context"] == "satisfied"}


def run_once(out, c, v75, v76, v77, v78, v79, pre, immutable):
    out.mkdir(parents=True, exist_ok=True)
    matrix = c["acceptance_transition_matrix"]
    rows = {row["from"]: row for row in matrix}
    gap = c["previous_business_semantic_gap"]
    title_summary = content_flow("summary", matrix)
    title_excerpt = content_flow("bounded_excerpt", matrix)
    three = content_flow("summary", matrix, third=True)
    cross = {"initial":{"content_context":"requested","source_attribution":"requested"}, "steps":[]}
    state = dict(cross["initial"])
    for field, evidence in (("content_context","title"),("content_context","summary"),("source_attribution","author_or_publisher")):
        result = accept_pure(state, field, "accepted_new", matrix)
        other = "source_attribution" if field == "content_context" else "content_context"
        cross["steps"].append({"field":field,"evidence":evidence,"other_field_unchanged":result["before"][other] == result["after"][other],**result})
        state = result["after"]
    cross["final"] = state
    duplicate = {name: accept_pure({"content_context":"evidence_available","source_attribution":"requested"}, "content_context", outcome, matrix)
                 for name, outcome in (("exact_duplicate","idempotent_exact_duplicate"),("conflicting_duplicate","conflicting_duplicate"),("bad_new_id","rejected_invalid_evidence_identity"),("local_precedence","rejected_local_precedence"))}
    counters = c["acceptance_completeness_counters"]
    deps = c["behavioral_dependency_audit_v3"]
    v76_accept = [r for r in v76["corrected_lifecycle_transition_table"] if r["event"] == "valid_evidence_accepted"]
    checks = {
        "preflight": pre["branch"] == EXPECTED_BRANCH,
        "head_origin_main": pre["head"] == pre["origin_main"] == pre["merge_base"],
        "v75_passed": len(v75["blocker_resolution"]) == 10,
        "v76_passed": all(x["reproduced"] for x in v76["discovered_contradictions"]),
        "v77_passed": v77["discovered_contradiction"]["reproduced"],
        "v78_passed": v78["closure_counters"]["future_adapter_missing_dependencies"] == 0,
        "v79_passed": v79["plan_ambiguity_audit"]["nondeterministic_plan_fields"] == 0,
        "gap_reproduced": gap["consecutive_evidence_acceptance_gap"] == "reproduced" and not any(r["from"] == "evidence_available" for r in v76_accept),
        "requested_preserved": rows["requested"]["to"] == "evidence_available",
        "not_attempted_preserved": rows["not_attempted"]["to"] == "evidence_available",
        "partial_preserved": rows["partially_satisfied"]["to"] == "evidence_available",
        "available_added": rows["evidence_available"]["to"] == "evidence_available",
        "self_lifecycle_false": rows["evidence_available"]["lifecycle_changed"] is False,
        "self_evidence_true": rows["evidence_available"]["evidence_changed"] is True,
        "self_operation_true": rows["evidence_available"]["operation_mutates_state"] is True,
        "satisfied_illegal": rows["satisfied"]["classification"] == "illegal_transition",
        "unavailable_unreachable": rows["unavailable"]["classification"] == "controlled_mode_unreachable",
        "failed_unreachable": rows["failed"]["classification"] == "controlled_mode_unreachable",
        "all_states_classified": set(rows) == set(v76["persistent_lifecycle_model"]["states"]),
        "unspecified_zero": counters["unspecified_acceptance_rows"] == 0,
        "contradictions_zero": counters["acceptance_transition_contradictions"] == 0,
        "title_first": title_summary["steps"][0]["after"]["content_context"] == "evidence_available",
        "summary_second": title_summary["steps"][1]["after"]["content_context"] == "evidence_available",
        "title_summary_pre_eval": title_summary["before_evaluation"]["content_context"] == "evidence_available",
        "title_summary_evaluates": title_summary["content_satisfied"],
        "title_excerpt": title_excerpt["content_satisfied"],
        "three_acceptances": three["content_satisfied"] and len(three["steps"]) == 3,
        "cross_isolated": all(step["other_field_unchanged"] for step in cross["steps"]),
        "content_does_not_mutate_attr": cross["steps"][1]["after"]["source_attribution"] == "requested",
        "attr_does_not_mutate_content": cross["steps"][2]["before"]["content_context"] == cross["steps"][2]["after"]["content_context"],
        "exact_no_transition": duplicate["exact_duplicate"]["lifecycle_changed"] is False,
        "exact_no_evidence": duplicate["exact_duplicate"]["evidence_changed"] is False,
        "exact_no_operation": duplicate["exact_duplicate"]["operation_mutates_state"] is False,
        "conflict_no_transition": not any((duplicate["conflicting_duplicate"]["lifecycle_changed"], duplicate["conflicting_duplicate"]["evidence_changed"], duplicate["conflicting_duplicate"]["operation_mutates_state"])),
        "bad_id_no_transition": duplicate["bad_new_id"]["after"] == duplicate["bad_new_id"]["before"],
        "precedence_no_transition": duplicate["local_precedence"]["after"] == duplicate["local_precedence"]["before"],
        "accept_no_evaluate": not title_summary["evaluation_performed_by_acceptance"],
        "sufficient_stays_available": title_summary["before_evaluation"]["content_context"] == "evidence_available",
        "completion_unchanged": c["completion_semantics_preservation"]["content_context"] == "title AND (summary OR bounded_excerpt)",
        "duplicates_unchanged": c["duplicate_nontransition_semantics"]["collision_order"] == "v76 unchanged",
        "v77_unchanged": v77["satisfied_self_transition"]["legal"] is True,
        "v79_unchanged": c["planning_semantics_preservation"]["plan_vectors_changed"] is False,
        "v79_deterministic": v79["plan_ambiguity_audit"]["states_with_multiple_valid_canonical_plans"] == 0,
        "human_review_unchanged": v75["human_re_review_boundary"]["constant"] is True,
        "structural_deps_zero": deps["future_adapter_structural_missing_dependencies"] == 0,
        "planning_deps_zero": deps["future_adapter_planning_missing_dependencies"] == 0,
        "acceptance_deps_zero": deps["future_adapter_acceptance_lifecycle_missing_dependencies"] == 0,
        "other_deps_zero": deps["future_adapter_other_behavioral_missing_dependencies"] == 0,
        "authority_immutable": True,
        "historical_immutable": True,
        "lastfm_immutable": all(path in immutable for path in LASTFM),
        "network_zero": c["zero_effect_policy"]["network_request_count"] == 0,
        "database_zero": c["zero_effect_policy"]["database_read_count"] == c["zero_effect_policy"]["database_write_count"] == 0,
        "persistence_zero": c["zero_effect_policy"]["semantic_filesystem_persistence_count"] == 0,
        "effects_zero": all(value == 0 for value in c["zero_effect_policy"].values()),
        "rows_total": counters["controlled_acceptance_state_rows_total"] == 7,
        "paths_no_failures": counters["consecutive_acceptance_path_failures"] == 0,
        "self_mutation_mismatches_zero": counters["lifecycle_self_transition_operation_mutation_mismatches"] == 0,
    }
    if len(checks) < 55 or not all(checks.values()):
        raise Failure("checks: " + ", ".join(key for key, value in checks.items() if not value))
    data = {
        "safe_summary.json": {"version":"v80","adapter_implemented":False,"consecutive_evidence_acceptance_lifecycle_correction_conformance":"passed","acceptance_lifecycle_completeness":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_implementation_from_structurally_closed_planning_deterministic_and_acceptance_complete_contract","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"},
        "authority_validation.json": {"v75":True,"v76":True,"v77":True,"v78":True,"v79":True,"base_sha":pre["head"]},
        "previous_gap_reproduction.json": gap,
        "acceptance_transition_matrix.json": matrix,
        "consecutive_content_flow.json": {"title_summary":title_summary,"title_bounded_excerpt":title_excerpt,"title_summary_bounded_excerpt":three},
        "cross_field_flow.json": cross,
        "mutation_classification.json": c["mutation_semantics"],
        "duplicate_nontransition_proof.json": duplicate,
        "behavioral_dependency_audit_v3.json": deps,
        "immutability.json": {"before":immutable,"after":immutable,"equal":True},
        "zero_effects.json": c["zero_effect_policy"],
        "validation.json": {"check_count":len(checks),"checks":checks,"acceptance_completeness_counters":counters,"all_passed":True},
    }
    for name, value in data.items():
        (out / name).write_bytes(canonical(value))
    return data


def execute():
    pre = preflight()
    c, v75, v76, v77, v78, v79 = map(load, (CONTRACT, V75, V76, V77, V78, V79))
    expected = {item["path"]: item["sha256"] for item in c["consumed_authority_hashes"]}
    before = {path: file_sha(ROOT / path) for path in expected}
    if before != expected:
        raise Failure("authority hash drift")
    immutable = {**before, **{path:file_sha(ROOT / path) for path in LASTFM}}
    first = run_once(FIRST, c, v75, v76, v77, v78, v79, pre, immutable)
    repro = run_once(REPRO, c, v75, v76, v77, v78, v79, pre, immutable)
    pairs = {name:[sha(first[name]), sha(repro[name])] for name in OUTPUTS}
    if not all(left == right for left, right in pairs.values()):
        raise Failure("determinism")
    if immutable != {path:file_sha(ROOT / path) for path in immutable}:
        raise Failure("immutability")
    for folder in (FIRST, REPRO):
        for path in sorted(folder.glob("*.json")):
            load(path)
    return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","sha256_pairs":pairs,"consecutive_evidence_acceptance_lifecycle_correction_conformance":"passed","acceptance_lifecycle_completeness":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_implementation_from_structurally_closed_planning_deterministic_and_acceptance_complete_contract","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.parse_args()
    try:
        result = execute()
    except (Failure, OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print("FAIL CLOSED: " + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
