"""Validate and dry-run the explicit local aespa representative export selection."""
import argparse
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

RATIONALES = [
    "equivalent_exports_collapsed",
    "safely_dominated_subset_excluded",
    "maximal_content_group_selected",
    "identity_coverage_confirmed",
    "representative_file_confirmed",
]
ZERO_COUNTS = [
    "production_write_count", "database_write_count", "storage_write_count",
    "archive_write_count", "import_execution_count", "normalization_execution_count",
    "pipeline_execution_count", "source_decision_execution_count",
    "score_calculation_count", "ranking_update_count", "artist_page_update_count",
]

def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()

def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()

def fail(message):
    raise ValueError(message)

def select(shortlist, template, contract, reviewer_id, confirmed):
    if not confirmed:
        fail("confirm_representative_selection_required")
    if reviewer_id != "project_owner":
        fail("reviewer_id_must_be_project_owner")
    if contract.get("production_policy") is not False or not contract.get("dry_run_only"):
        fail("application_contract_not_local_dry_run")
    if shortlist.get("candidate", {}).get("display_query") != "에스파":
        fail("target_candidate_mismatch")
    news_ids = shortlist.get("shortlisted_news_group_ids", [])
    blog_ids = shortlist.get("shortlisted_blog_group_ids", [])
    pairs = shortlist.get("pair_candidates", [])
    if len(news_ids) != 1:
        fail("shortlisted_news_group_count_mismatch")
    if len(blog_ids) != 1:
        fail("shortlisted_blog_group_count_mismatch")
    if len(pairs) != 1:
        fail("pair_candidate_count_mismatch")
    if len(template) != 1:
        fail("blank_template_entry_count_mismatch")
    blank = template[0]
    if blank.get("resolution_intent") != "not_resolved":
        fail("blank_template_already_resolved")
    selected_keys = ("selected_news_group_id", "selected_blog_group_id",
                     "selected_news_file_id", "selected_blog_file_id")
    if any(blank.get(key) is not None for key in selected_keys):
        fail("blank_template_selected_id_present")
    news = next((g for g in shortlist["news_export_groups"]
                 if g["export_group_id"] == news_ids[0]), None)
    blog = next((g for g in shortlist["blog_export_groups"]
                 if g["export_group_id"] == blog_ids[0]), None)
    if not news or not blog:
        fail("shortlisted_group_not_found")
    news_file = news["representative_file_id"]
    blog_file = blog["representative_file_id"]
    if news_file not in news["member_file_ids"] or blog_file not in blog["member_file_ids"]:
        fail("representative_not_group_member")
    pair = pairs[0]
    if pair.get("news_group_id") != news_ids[0] or pair.get("blog_group_id") != blog_ids[0]:
        fail("selected_pair_membership_mismatch")
    entry = copy.deepcopy(blank)
    entry.update({
        "resolution_intent": "select_representative_exports",
        "reviewer_id": reviewer_id,
        "rationale_codes": list(RATIONALES),
        "reviewer_note": None,
        "reviewed_at": None,
        "selected_news_group_id": news_ids[0],
        "selected_blog_group_id": blog_ids[0],
        "selected_news_file_id": news_file,
        "selected_blog_file_id": blog_file,
        "export_difference_acknowledged": True,
        "production_data_unchanged_acknowledged": True,
    })
    decision = {
        "decision_scope": "local_sandbox_only",
        "local_sandbox_selection_status": "selected_representative_exports",
        "production_selection_status": "not_selected",
        "import_authorization_status": "not_authorized",
        "pipeline_authorization_status": "not_authorized",
        "entries": [entry],
    }
    return decision, news, blog, pair

def validate(decision, news, blog, pair, contract):
    errors = []
    entry = decision["entries"][0]
    checks = {
        "resolution_intent_valid": entry["resolution_intent"] == contract["accepted_resolution_intent"],
        "reviewer_role_valid": entry["reviewer_id"] == "project_owner",
        "rationale_order_valid": entry["rationale_codes"] == RATIONALES,
        "news_representative_membership": entry["selected_news_file_id"] in news["member_file_ids"],
        "blog_representative_membership": entry["selected_blog_file_id"] in blog["member_file_ids"],
        "news_representative_exact": entry["selected_news_file_id"] == news["representative_file_id"],
        "blog_representative_exact": entry["selected_blog_file_id"] == blog["representative_file_id"],
        "pair_membership": pair["news_group_id"] == entry["selected_news_group_id"] and pair["blog_group_id"] == entry["selected_blog_group_id"],
        "difference_acknowledged": entry["export_difference_acknowledged"] is True,
        "production_unchanged_acknowledged": entry["production_data_unchanged_acknowledged"] is True,
        "reviewed_at_not_generated": entry["reviewed_at"] is None,
        "attribution_rationale_not_used": "attribution_coverage_confirmed" not in entry["rationale_codes"],
    }
    errors.extend(sorted(key for key, value in checks.items() if not value))
    result = {
        "contract_version": contract["contract_version"],
        "scope": contract["scope"],
        "production_policy": False,
        "dry_run_only": True,
        "candidate_count": 1,
        "decision_entry_count": 1,
        "valid_decision_count": 0 if errors else 1,
        "invalid_decision_count": 1 if errors else 0,
        "validation_errors": errors,
        "validation_checks": checks,
        "selected_news_group_count": 1,
        "selected_blog_group_count": 1,
        "selected_news_file_count": 1,
        "selected_blog_file_count": 1,
        "representative_membership_confirmed_count": int(checks["news_representative_membership"]) + int(checks["blog_representative_membership"]),
        "pair_membership_confirmed_count": int(checks["pair_membership"]),
        "attribution_observation": {
            "news_attribution_coverage": news["attribution_coverage_min"],
            "blog_attribution_coverage": blog["attribution_coverage_min"],
            "news_attribution_gap": "existing_source_limitation_acknowledged",
            "usage": "not_used_for_selection_automation_or_ranking",
        },
        "production_effect_count": 0,
    }
    result["deterministic_validation_sha256"] = digest(result)
    return result

def dry_run(decision, validation, contract):
    if validation["invalid_decision_count"]:
        fail("decision_validation_failed")
    entry = decision["entries"][0]
    result = {
        "contract_version": contract["contract_version"], "scope": contract["scope"],
        "production_policy": False, "dry_run_only": True,
        "candidate_id": entry["candidate_id"], "display_query": entry["display_query"],
        "resolution_intent": entry["resolution_intent"],
        "local_sandbox_selection_status": "selected_representative_exports",
        "production_selection_status": "not_selected",
        "import_authorization_status": "not_authorized",
        "pipeline_authorization_status": "not_authorized",
        "selected_news_group_id": entry["selected_news_group_id"],
        "selected_blog_group_id": entry["selected_blog_group_id"],
        "selected_news_file_id": entry["selected_news_file_id"],
        "selected_blog_file_id": entry["selected_blog_file_id"],
        "would_record_local_sandbox_selection": True,
        "would_select_news_group": True, "would_select_blog_group": True,
        "would_select_news_representative_file": True,
        "would_select_blog_representative_file": True,
        "would_preserve_production_data": True,
        "would_require_import_approval_next": True,
    }
    result.update({key: 0 for key in ZERO_COUNTS})
    result["deterministic_dry_run_sha256"] = digest(result)
    return result

def build_summary(decision, validation, run, news, blog, contract):
    entry = decision["entries"][0]
    return {
        "contract_version": contract["contract_version"], "scope": contract["scope"],
        "production_policy": False, "dry_run_only": True,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "target_display_query": entry["display_query"],
        "resolution_intent": entry["resolution_intent"], "reviewer_id": entry["reviewer_id"],
        "rationale_codes": entry["rationale_codes"],
        "selected_news_group_count": 1, "selected_blog_group_count": 1,
        "selected_news_file_count": 1, "selected_blog_file_count": 1,
        "selected_pair_count": 1,
        "news_selected_group_member_count": news["member_count"],
        "blog_selected_group_member_count": blog["member_count"],
        "news_selected_row_count": news["row_count"], "blog_selected_row_count": blog["row_count"],
        "news_selected_unique_row_count": news["unique_row_count"],
        "blog_selected_unique_row_count": blog["unique_row_count"],
        "news_attribution_coverage": news["attribution_coverage_min"],
        "blog_attribution_coverage": blog["attribution_coverage_min"],
        "valid_decision_count": validation["valid_decision_count"],
        "invalid_decision_count": validation["invalid_decision_count"],
        "local_sandbox_selection_status": run["local_sandbox_selection_status"],
        "production_selection_status": run["production_selection_status"],
        "import_authorization_status": run["import_authorization_status"],
        "pipeline_authorization_status": run["pipeline_authorization_status"],
        "production_effect_count": 0,
        "deterministic_decision_sha256": digest(decision),
        "deterministic_validation_sha256": validation["deterministic_validation_sha256"],
        "deterministic_dry_run_sha256": run["deterministic_dry_run_sha256"],
    }

def self_test():
    group = lambda gid, fid: {"export_group_id": gid, "representative_file_id": fid, "member_file_ids": [fid], "member_count": 1, "row_count": 1, "unique_row_count": 1, "attribution_coverage_min": 1.0}
    base = {"candidate": {"display_query": "에스파"}, "shortlisted_news_group_ids": ["n"], "shortlisted_blog_group_ids": ["b"], "news_export_groups": [group("n", "nf")], "blog_export_groups": [group("b", "bf")], "pair_candidates": [{"news_group_id": "n", "blog_group_id": "b"}]}
    blank = [{"candidate_id": "c", "packet_item_id": "p", "analysis_item_id": "a", "display_query": "에스파", "resolution_intent": "not_resolved", "reviewer_id": None, "rationale_codes": [], "reviewer_note": None, "reviewed_at": None, "selected_news_group_id": None, "selected_blog_group_id": None, "selected_news_file_id": None, "selected_blog_file_id": None, "export_difference_acknowledged": False, "production_data_unchanged_acknowledged": False}]
    contract = {"contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False, "dry_run_only": True, "accepted_resolution_intent": "select_representative_exports"}
    decision, news, blog, pair = select(base, blank, contract, "project_owner", True)
    validation = validate(decision, news, blog, pair, contract); run = dry_run(decision, validation, contract)
    assert validation["valid_decision_count"] == 1 and all(run[k] == 0 for k in ZERO_COUNTS)
    assert decision["entries"][0]["rationale_codes"] == RATIONALES and decision["entries"][0]["reviewed_at"] is None
    assert decision["entries"][0]["selected_news_file_id"] == "nf" and decision["entries"][0]["selected_blog_file_id"] == "bf"
    assert "attribution_coverage_confirmed" not in decision["entries"][0]["rationale_codes"]
    failures = 0
    mutations = []
    for change in ("no_confirm", "bad_reviewer", "no_news", "two_news", "no_blog", "two_blog", "no_pair", "two_pair", "resolved", "selected", "bad_news_member", "bad_blog_member", "bad_pair"):
        s, t = copy.deepcopy(base), copy.deepcopy(blank)
        reviewer, confirmed = "project_owner", True
        if change == "no_confirm": confirmed = False
        elif change == "bad_reviewer": reviewer = "person"
        elif change == "no_news": s["shortlisted_news_group_ids"] = []
        elif change == "two_news": s["shortlisted_news_group_ids"] = ["n", "n2"]
        elif change == "no_blog": s["shortlisted_blog_group_ids"] = []
        elif change == "two_blog": s["shortlisted_blog_group_ids"] = ["b", "b2"]
        elif change == "no_pair": s["pair_candidates"] = []
        elif change == "two_pair": s["pair_candidates"] *= 2
        elif change == "resolved": t[0]["resolution_intent"] = "defer"
        elif change == "selected": t[0]["selected_news_group_id"] = "n"
        elif change == "bad_news_member": s["news_export_groups"][0]["member_file_ids"] = []
        elif change == "bad_blog_member": s["blog_export_groups"][0]["member_file_ids"] = []
        elif change == "bad_pair": s["pair_candidates"][0]["news_group_id"] = "other"
        try: select(s, t, contract, reviewer, confirmed)
        except ValueError: failures += 1
    assert failures == 13
    assert digest(decision) == digest(copy.deepcopy(decision)) and digest(run) == digest(copy.deepcopy(run))
    serialized = json.dumps([decision, validation, run]).casefold()
    assert not any(term in serialized for term in ('"score"', '"rank"', '"recommendation"', '"title"', '"description"', '"url"', '"filename"', "archive/"))
    assertions = 27
    print(f"self-test passed: {assertions} synthetic cases; no files written")

def main():
    parser = argparse.ArgumentParser()
    for name in ("shortlist-file", "shortlist-summary-file", "blank-template-file", "shortlist-contract-file", "application-contract-file", "decision-output-file", "validation-output-file", "dry-run-output-file", "summary-output-file"):
        parser.add_argument("--" + name)
    parser.add_argument("--reviewer-id")
    parser.add_argument("--confirm-representative-selection", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test(); return
    required = [key for key, value in vars(args).items() if key not in ("self_test", "confirm_representative_selection") and not value]
    if required:
        parser.error("all file arguments and reviewer-id are required")
    load = lambda name: json.loads(Path(getattr(args, name)).read_text(encoding="utf-8"))
    shortlist = load("shortlist_file"); load("shortlist_summary_file"); template = load("blank_template_file")
    load("shortlist_contract_file"); contract = load("application_contract_file")
    decision, news, blog, pair = select(shortlist, template, contract, args.reviewer_id, args.confirm_representative_selection)
    validation = validate(decision, news, blog, pair, contract)
    run = dry_run(decision, validation, contract)
    summary = build_summary(decision, validation, run, news, blog, contract)
    for attr, value in (("decision_output_file", decision), ("validation_output_file", validation), ("dry_run_output_file", run), ("summary_output_file", summary)):
        path = Path(getattr(args, attr)); path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("selection dry-run complete: valid=1 production_effects=0")

if __name__ == "__main__":
    main()

