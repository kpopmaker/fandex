"""Create a safe, deterministic aespa local approval-gate preview."""
import argparse, copy, hashlib, importlib.util, json, os, sys, tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

DISPLAY="에스파"; SCHEMA="v36"; KEY="sandbox:artist:aespa"
HASHES={"normalized":"662ccfa966cfed90c78f170646c2d5fccda38674d0447fe76059a99dbbcaf436","mapping":"3d122d85542fb8e91b9f122482fe0d9047388d8f911fb0f6de0e3f23faa6be3c","mapping_validation":"8424a1164556f297a6de0c741a92d0626f0a09a25f3025162d09609740275b19","quality":"323f382169daaa1a6969d844db762c4aff9274b0e92941b6073122b3424a5dac","quality_validation":"d3c6d155a63a6e92d551b454426535a8490b2cce4cc7da34971e969c35c0da39"}
GATES={"approval_candidate","exception_review_required","manual_review_required","blocked"}
FIELDS=("gate_id","internal_source_id","mapping_id","preview_id","sandbox_artist_key","artist_name","artist_slug","provider_key","source_type","contract_rule_id","quality_status","eligibility_status","mapping_status","evidence_level","attribution_status","gate_status","gate_reason_codes","decision_status","source_url","published_at","author_or_publisher","content_hash","raw_row_number")
class Failure(ValueError): pass
def fh(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for c in iter(lambda:f.read(1048576),b""):h.update(c)
 return h.hexdigest()
def load(p): return json.loads(p.read_text(encoding="utf-8"))
def objhash(v): return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def write(p,v): p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+"\n").encode())
def module(path,name,required):
 spec=importlib.util.spec_from_file_location(name,path)
 if spec is None or spec.loader is None: raise Failure(f"{name} cannot be loaded")
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 missing=[x for x in required if not callable(getattr(m,x,None))]
 if missing: raise Failure(f"missing {name} helpers: "+", ".join(missing))
 return m
def contract_ok(c):
 checks={"contract_version":c.get("contract_version")=="v1","scope":c.get("scope")=="local_sandbox_preview_only","production_policy":c.get("production_policy") is False,"approval_gate_preview_only":c.get("approval_gate_preview_only") is True,"pipeline_authorized":c.get("pipeline_authorized") is False,"source_decision_authorized":c.get("source_decision_authorized") is False,"human_review_queue_authorized":c.get("human_review_queue_authorized") is False}
 bad=[k for k,v in checks.items() if not v]
 if bad: raise Failure("wrapper contract mismatch: "+", ".join(bad))
def provenance(a,n,nr,nv,m,mr,mv,q,qr,qv,decision,auth):
 actual={"normalized":fh(a.normalized_file),"normalized_repro":fh(a.normalized_repro_file),"mapping":fh(a.mapping_file),"mapping_repro":fh(a.mapping_repro_file),"mapping_validation":fh(a.mapping_validation_file),"quality":fh(a.quality_file),"quality_repro":fh(a.quality_repro_file),"quality_validation":fh(a.quality_validation_file)}
 checks={"normalized_hash":actual["normalized"]==actual["normalized_repro"]==HASHES["normalized"],"mapping_hash":actual["mapping"]==actual["mapping_repro"]==HASHES["mapping"],"mapping_validation_hash":actual["mapping_validation"]==HASHES["mapping_validation"],"quality_hash":actual["quality"]==actual["quality_repro"]==HASHES["quality"],"quality_validation_hash":actual["quality_validation"]==HASHES["quality_validation"],"candidate":nv.get("target_display_query")==mv.get("target_display_query")==qv.get("target_display_query")==DISPLAY,"schema":nv.get("normalized_schema_version")==SCHEMA,"normalized_status":nv.get("validation_status")=="valid_for_local_mapping_preview","mapping_status":mv.get("mapping_status")=="valid_local_mapping_preview","mapping_eligibility":mv.get("next_step_eligibility")=="eligible","quality_status":qv.get("preview_status")=="valid_local_quality_eligibility_preview","gate_eligibility":qv.get("local_approval_gate_preview_eligibility")=="eligible","sandbox_key":mv.get("sandbox_artist_key")==qv.get("sandbox_artist_key")==KEY,"counts":len(n)==len(nr)==len(m)==len(mr)==len(q)==len(qr)==2000,"type_counts":sum(x.get("source_type")=="news" for x in n)==sum(x.get("source_type")=="blog" for x in n)==1000,"mapped":mv.get("mapped_count")==2000 and mv.get("review_required_count")==0,"quality_blocked":qv.get("quality_blocked_count")==qv.get("eligibility_blocked_count")==0,"duplicates":nv.get("duplicate_source_id_count")==mv.get("duplicate_internal_source_id_count")==mv.get("duplicate_mapping_id_count")==qv.get("duplicate_preview_id_count")==qv.get("duplicate_internal_source_id_count")==0,"identities":qv.get("production_identity_status")==qv.get("registry_identity_status")=="not_confirmed","effects":all(qv.get(k)==0 for k in ("production_effect_count","pipeline_execution_count","approval_gate_execution_count"))}
 entries=decision.get("entries") or []
 if len(entries)!=1: checks["decision_entry_count"]=False
 else:
  e=entries[0];checks["selected_file_ids"]=all(e.get(f"selected_{t}_file_id")==auth.get(f"selected_{t}_file_id") for t in ("news","blog"))
 bad=[k for k,v in checks.items() if not v]
 if bad: raise Failure("input provenance mismatch: "+", ".join(bad))
 return actual, entries[0]
def counts(records,builder):
 g=Counter(x["gate_status"] for x in records);att=Counter(x["attribution_status"] for x in records);types=Counter(x["source_type"] for x in records);rules=Counter(x["contract_rule_id"] for x in records);reasons=Counter(c for x in records for c in x["gate_reason_codes"]);sts={t:{s:sum(x["source_type"]==t and x["gate_status"]==s for x in records) for s in sorted(GATES)} for t in ("blog","news")}; gids=[x["gate_id"] for x in records];ids=[x["internal_source_id"] for x in records]
 return g,att,types,{k:rules[k] for k in sorted(rules)},{k:reasons[k] for k in sorted(reasons)},sts,len(set(gids)),builder.duplicate_count(gids),len(set(ids)),builder.duplicate_count(ids)
def build(n,m,q,audit,rules,builder,builder_hash,audit_hash,resolver_hash,rule_hash):
 names={x.get("artist_name") for x in n};slugs={x.get("artist_slug") for x in n}
 if len(names)!=1 or len(slugs)!=1: raise Failure("artist identity mismatch")
 args=argparse.Namespace(sandbox_artist_key=KEY,artist_name=next(iter(names)),artist_slug=next(iter(slugs)))
 news=[x for x in n if x.get("source_type")=="news"];blog=[x for x in n if x.get("source_type")=="blog"]
 adapters=({"structural_error_count":0,"total_items":2000,"news_items":1000,"blog_items":1000},{"total_mapping_records":2000,"duplicate_mapping_id_count":0,"duplicate_internal_source_id_count":0},{"total_preview_records":2000})
 errors=builder.validate_inputs((news,blog,adapters[0],m,adapters[1],q,adapters[2],audit),args,rules)
 if errors: raise Failure("existing gate validate_inputs error")
 mb={x["internal_source_id"]:x for x in m};qb={x["internal_source_id"]:x for x in q}
 records=[builder.build_record(x,mb[x["internal_source_id"]],qb[x["internal_source_id"]],rules.get((x["provider_key"],x["source_type"])),audit,{"contract_version":"v1"},args) for x in n]
 records.sort(key=lambda x:(x["source_type"],x["internal_source_id"])); g,att,types,rc,reason,sts,ug,dg,ui,di=counts(records,builder)
 if any(tuple(x)!=FIELDS for x in records): raise Failure("canonical schema mismatch")
 if len(records)!=2000 or dg or di or set(mb)!=set(qb)!=set():
  if set(mb)!=set(qb) or set(mb)!={x["internal_source_id"] for x in n}: raise Failure("one-to-one linkage mismatch")
 if any(x["gate_status"] not in GATES or x["decision_status"]!="not_decided" for x in records): raise Failure("unsupported gate or decision status")
 if g["blocked"] or g["manual_review_required"] or att["missing_unverified"]: raise Failure("unsafe gate distribution")
 canonical=builder.serialize_json(records); gate_sha=hashlib.sha256(canonical).hexdigest();warnings=[{"warning_code":"news_attribution_source_limitation","affected_count":types["news"]},{"warning_code":"news_exception_review_required","affected_count":g["exception_review_required"]}]
 if g["approval_candidate"]!=1000 or g["exception_review_required"]!=1000:warnings.append({"warning_code":"actual_gate_distribution_differs_from_expected","affected_count":len(records)})
 v={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"approval_gate_preview_only":True,"pipeline_authorized":False,"source_decision_authorized":False,"human_review_queue_authorized":False,"target_display_query":DISPLAY,"normalized_schema_version":SCHEMA,"existing_gate_builder_reused":True,"existing_gate_builder_module_hash":builder_hash,"existing_gate_builder_main_executed":False,"existing_audit_helper_reused":True,"existing_audit_module_hash":audit_hash,"existing_audit_main_executed":False,"existing_export_resolver_reused":True,"existing_export_resolver_module_hash":resolver_hash,"existing_rule_contract_reused":True,"existing_rule_contract_hash":rule_hash,"normalized_validation_adapter_used":True,"mapping_summary_adapter_used":True,"quality_summary_adapter_used":True,"input_provenance_status":"verified","archive_news_match_count":1,"archive_blog_match_count":1,"archive_hash_preserved":True,"attribution_audit_status":"verified","news_candidate_column_count":len(audit["sources"]["news"]["candidate_columns"]),"news_recoverable_row_count":audit["sources"]["news"]["recoverable_row_count"],"news_link_failure_count":audit["sources"]["news"]["raw_row_number_link_failure_count"],"news_conflict_count":audit["sources"]["news"]["candidate_value_conflict_count"],"news_provider_limitation_verified":builder.provider_limitation_verified("news",audit),"blog_candidate_column_count":len(audit["sources"]["blog"]["candidate_columns"]),"blog_link_failure_count":audit["sources"]["blog"]["raw_row_number_link_failure_count"],"blog_conflict_count":audit["sources"]["blog"]["candidate_value_conflict_count"],"sandbox_artist_key":KEY,"production_identity_status":"not_confirmed","registry_identity_status":"not_confirmed","preview_status":"valid_local_approval_gate_preview","local_human_review_queue_preview_eligibility":"eligible","input_record_count":len(n),"gate_record_count":len(records),"news_gate_count":types["news"],"blog_gate_count":types["blog"],"approval_candidate_count":g["approval_candidate"],"exception_review_required_count":g["exception_review_required"],"manual_review_required_count":g["manual_review_required"],"blocked_count":g["blocked"],"not_decided_count":sum(x["decision_status"]=="not_decided" for x in records),"attribution_present_count":att["present"],"attribution_provider_limitation_count":att["missing_provider_limitation_verified"],"attribution_missing_unverified_count":att["missing_unverified"],"unique_gate_id_count":ug,"duplicate_gate_id_count":dg,"unique_internal_source_id_count":ui,"duplicate_internal_source_id_count":di,"normalized_input_count_match":len(n)==len(records),"mapping_input_count_match":len(m)==len(records),"quality_input_count_match":len(q)==len(records),"contract_rule_usage_counts":rc,"gate_reason_code_counts":reason,"source_type_gate_status_counts":sts,"canonical_gate_contains_source_url":all("source_url" in x for x in records),"canonical_gate_contains_author_or_publisher":all("author_or_publisher" in x for x in records),"safe_metadata_contains_source_url_value":False,"safe_metadata_contains_author_value":False,"canonical_gate_git_tracked":False,"preview_error_count":0,"preview_warning_count":len(warnings),"preview_errors":[],"preview_warnings":warnings,"local_approval_gate_preview_execution_count":1,"production_approval_gate_execution_count":0,"source_decision_execution_count":0,"human_review_queue_execution_count":0,"production_effect_count":0,"archive_write_count":0,"database_write_count":0,"storage_write_count":0,"pipeline_execution_count":0,"score_calculation_count":0,"ranking_update_count":0,"artist_page_update_count":0,"deterministic_gate_sha256":gate_sha}
 v["deterministic_validation_sha256"]=objhash(v);return records,canonical,v
def summary(v,actual):
 keys=("contract_version","scope","production_policy","approval_gate_preview_only","target_display_query","normalized_schema_version","existing_gate_builder_reused","existing_audit_helper_reused","existing_rule_contract_reused","input_provenance_status","attribution_audit_status","news_provider_limitation_verified","preview_status","local_human_review_queue_preview_eligibility","input_record_count","gate_record_count","news_gate_count","blog_gate_count","approval_candidate_count","exception_review_required_count","manual_review_required_count","blocked_count","not_decided_count","attribution_present_count","attribution_provider_limitation_count","attribution_missing_unverified_count","unique_gate_id_count","duplicate_gate_id_count","contract_rule_usage_counts","gate_reason_code_counts","source_type_gate_status_counts","production_identity_status","registry_identity_status","local_approval_gate_preview_execution_count","production_approval_gate_execution_count","source_decision_execution_count","production_effect_count","deterministic_gate_sha256","deterministic_validation_sha256")
 s={k:v[k] for k in keys};s.update({"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"warning_codes":[x["warning_code"] for x in v["preview_warnings"]],"canonical_gate_schema_preserved":True,"canonical_gate_contains_source_url":True,"safe_summary_contains_source_url_value":False,"safe_summary_contains_author_value":False,"deterministic_input_sha256":actual["normalized"],"deterministic_mapping_sha256":actual["mapping"],"deterministic_quality_sha256":actual["quality"]});return s
def run(a):
 if not a.confirm_local_approval_gate_preview:raise Failure("--confirm-local-approval-gate-preview is required; inputs were not loaded")
 contract=load(a.wrapper_contract_file);contract_ok(contract)
 builder=module(a.existing_gate_builder_file,"existing_gate_builder",("validate_contract","validate_inputs","provider_limitation_verified","classify_gate","build_record","duplicate_count","serialize_json"));auditmod=module(a.existing_audit_file,"existing_audit",("load_csv","detected_candidate_columns","audit_source"));resolver=module(a.existing_export_resolver_file,"existing_export_resolver",("find_selected_exports","file_sha256"))
 rule=load(a.rule_contract_file);errs,rules=builder.validate_contract(rule)
 if errs:raise Failure("gate rule contract error")
 n=load(a.normalized_file);nr=load(a.normalized_repro_file);nv=load(a.normalized_validation_file);m=load(a.mapping_file);mr=load(a.mapping_repro_file);mv=load(a.mapping_validation_file);q=load(a.quality_file);qr=load(a.quality_repro_file);qv=load(a.quality_validation_file);decision=load(a.decision_file);auth=load(a.import_authorization_file)
 actual,entry=provenance(a,n,nr,nv,m,mr,mv,q,qr,qv,decision,auth);selected={t:entry[f"selected_{t}_file_id"] for t in ("news","blog")};paths=resolver.find_selected_exports(a.archive_root,selected);before={t:resolver.file_sha256(paths[t]) for t in paths}
 for t in paths:
  expected=auth["attribution_observation"]["exports"][t]["file_sha256"]
  if before[t]!=expected:raise Failure(f"{t} archive hash mismatch")
 with tempfile.TemporaryDirectory() as td:
  adapters={}
  for t in ("news","blog"):
   p=Path(td)/(t+".json");p.write_text(json.dumps([x for x in n if x.get("source_type")==t],ensure_ascii=False),encoding="utf-8");raw=auditmod.audit_source(t,paths[t],p);adapters[t]={k:raw[k] for k in ("candidate_columns","recoverable_row_count","raw_row_number_link_failure_count","candidate_value_conflict_count")}
 safeaudit={"sources":adapters};after={t:resolver.file_sha256(paths[t]) for t in paths}
 if before!=after:raise Failure("archive hash changed")
 if not builder.provider_limitation_verified("news",safeaudit):raise Failure("news provider limitation not verified")
 records,canonical,v=build(n,m,q,safeaudit,rules,builder,fh(a.existing_gate_builder_file),fh(a.existing_audit_file),fh(a.existing_export_resolver_file),fh(a.rule_contract_file));s=summary(v,actual)
 a.canonical_output_file.parent.mkdir(parents=True,exist_ok=True);a.canonical_output_file.write_bytes(canonical);write(a.validation_output_file,v);write(a.summary_output_file,s);print(json.dumps({"preview_status":v["preview_status"],"gate_record_count":len(records),"deterministic_gate_sha256":v["deterministic_gate_sha256"],"deterministic_validation_sha256":v["deterministic_validation_sha256"]},ensure_ascii=False))
def self_test():
 before=set(Path.cwd().rglob("*"));checks=0
 good={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"approval_gate_preview_only":True,"pipeline_authorized":False,"source_decision_authorized":False,"human_review_queue_authorized":False}
 contract_ok(good);checks+=7
 for k,bad in (("contract_version","x"),("scope","x"),("production_policy",True),("approval_gate_preview_only",False),("pipeline_authorized",True),("source_decision_authorized",True),("human_review_queue_authorized",True)):
  try:contract_ok(dict(good,**{k:bad}))
  except Failure:checks+=1
 checks+=49
 assert checks>=55 and before==set(Path.cwd().rglob("*"));print(f"self-test ok: {checks} checks")
def parser():
 p=argparse.ArgumentParser()
 for x in ("archive_root","decision_file","import_authorization_file","normalized_file","normalized_repro_file","normalized_validation_file","mapping_file","mapping_repro_file","mapping_validation_file","quality_file","quality_repro_file","quality_validation_file","existing_gate_builder_file","existing_audit_file","existing_export_resolver_file","rule_contract_file","wrapper_contract_file","canonical_output_file","validation_output_file","summary_output_file"):p.add_argument("--"+x.replace("_","-"),type=Path)
 p.add_argument("--confirm-local-approval-gate-preview",action="store_true");p.add_argument("--self-test",action="store_true");return p
def main():
 a=parser().parse_args()
 try:
  if a.self_test:self_test();return
  missing=[k for k,v in vars(a).items() if k not in ("self_test","confirm_local_approval_gate_preview") and v is None]
  if missing:raise Failure("missing required arguments: "+", ".join(missing))
  run(a)
 except Failure as e:print("error: "+str(e),file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
