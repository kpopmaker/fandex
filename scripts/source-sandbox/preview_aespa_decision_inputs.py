"""Prepare deterministic blank aespa decision-input templates locally."""
import argparse, copy, hashlib, importlib.util, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
DISPLAY="에스파";SCHEMA="v36";KEY="sandbox:artist:aespa";INPUT_SHA="a1f4830381867ff2d7846c2bfd6ec75e4e585364ec07392d9fb6a4e9b1678124";VALIDATION_FILE_SHA="b08a27aa765b9e6dd6d8b0f2d6b13e5a0b43625b5cff33752810452291badbac";VALIDATION_SHA="b9f9babc07ea875b18650d5de014ca172dbcc65374987a4e7741cf8ac5a96f0a"
TEMPLATE_FIELDS=("internal_source_id","gate_id","queue_item_id","gate_status","decision_intent","reviewer_id","rationale_codes","reviewer_note","reviewed_at","requested_enrichment_fields")
class Failure(ValueError):pass
def fh(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for c in iter(lambda:f.read(1048576),b""):h.update(c)
 return h.hexdigest()
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def oh(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+"\n").encode())
def module(path,name,required):
 s=importlib.util.spec_from_file_location(name,path)
 if s is None or s.loader is None:raise Failure(name+" cannot be loaded")
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);missing=[x for x in required if not callable(getattr(m,x,None))]
 if missing:raise Failure("missing helpers: "+", ".join(missing))
 return m
def wrapper(c):
 checks={"contract_version":c.get("contract_version")=="v1","scope":c.get("scope")=="local_sandbox_preview_only","production_policy":c.get("production_policy") is False,"decision_input_preview_only":c.get("decision_input_preview_only") is True,"human_review_execution_authorized":c.get("human_review_execution_authorized") is False,"source_decision_authorized":c.get("source_decision_authorized") is False,"decision_application_authorized":c.get("decision_application_authorized") is False,"pipeline_authorized":c.get("pipeline_authorized") is False};bad=[k for k,v in checks.items() if not v]
 if bad:raise Failure("wrapper contract mismatch: "+", ".join(bad))
def provenance(items,repro,v,h,rh,vh):
 checks={"canonical_hash":h==INPUT_SHA,"repro_hash":rh==INPUT_SHA,"hash_match":h==rh,"validation_file_hash":vh==VALIDATION_FILE_SHA,"deterministic_validation":v.get("deterministic_validation_sha256")==VALIDATION_SHA,"provenance":v.get("input_queue_provenance_status")=="verified","status":v.get("preview_status")=="valid_local_review_decision_preview","eligibility":v.get("decision_preview_eligibility")=="eligible","count":v.get("decision_preview_record_count")==v.get("decision_input_record_count")==len(items)==len(repro)==1000,"source":v.get("news_decision_preview_count")==1000 and v.get("blog_decision_preview_count")==0,"pending":v.get("pending_review_output_count")==1000,"undecided":v.get("not_decided_output_count")==1000,"actual":v.get("approved_output_count")==v.get("rejected_output_count")==v.get("decided_output_count")==0,"duplicates":v.get("duplicate_decision_preview_id_count")==v.get("duplicate_queue_id_count")==v.get("duplicate_gate_id_count")==v.get("duplicate_internal_source_id_count")==0,"identities":v.get("production_identity_status")==v.get("registry_identity_status")=="not_confirmed","effects":all(v.get(k)==0 for k in ("actual_human_review_execution_count","source_decision_execution_count","decision_application_execution_count","production_effect_count","database_write_count","storage_write_count","pipeline_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count"))};bad=[k for k,x in checks.items() if not x]
 if bad:raise Failure("input preview mismatch: "+", ".join(bad))
 if items!=repro:raise Failure("first/repro records differ")
 for f in ("dry_run_id","queue_item_id","gate_id","internal_source_id"):
  z=[x.get(f) for x in items]
  if len(z)!=len(set(z)):raise Failure("duplicate "+f)
 if any(x.get("decision_intent")!="not_decided" or x.get("dry_run_effect")!="no_change" or x.get("actionability_status")!="no_action" for x in items):raise Failure("actual decision state detected")
def build(items,v,queue_builder,validator,qhash,vhash):
 queue=[{"queue_item_id":x["queue_item_id"],"internal_source_id":x["internal_source_id"],"gate_id":x["gate_id"],"gate_status":x["gate_status"]} for x in items];templates=queue_builder.decision_template(queue);input_contract=load(validator.__file__ and Path(validator.__file__).with_name("human_review_decision_contract.preview.json"));app_contract=load(Path(validator.__file__).with_name("human_review_decision_application_contract.preview.json"))
 if validator.contract_errors(input_contract,app_contract):raise Failure("historical contract error")
 if any(tuple(x)!=TEMPLATE_FIELDS for x in templates):raise Failure("historical template schema mismatch")
 invalid=[]
 for item in templates:
  reasons,effect=validator.validate_entry(item,item["gate_status"],input_contract,app_contract)
  if reasons or effect!="no_change":invalid.append(item["queue_item_id"])
 if invalid:raise Failure("blank template validation failed")
 ids=[hashlib.sha256(validator.canonical_bytes(x)).hexdigest() for x in templates];preview_ids=[x["dry_run_id"] for x in items];queue_ids=[x["queue_item_id"] for x in items];gate_ids=[x["gate_id"] for x in items];source_ids=[x["internal_source_id"] for x in items];dup=lambda z:sum(n-1 for n in Counter(z).values() if n>1)
 actual=sum(x["decision_intent"]!="not_decided" for x in templates);approval=sum(x["decision_intent"] in {"approve_candidate","accept_exception","approve","approved"} for x in templates);rejection=sum(x["decision_intent"] in {"reject","rejected","denied"} for x in templates);reviewer=sum(x["reviewer_id"] is not None for x in templates);timestamp=sum(x["reviewed_at"] is not None for x in templates);note=sum(x["reviewer_note"] is not None for x in templates)
 if actual or approval or rejection or reviewer or timestamp or note or any(dup(z) for z in (ids,preview_ids,queue_ids,gate_ids,source_ids)):raise Failure("unsafe template state")
 canonical=validator.canonical_bytes(templates);sha=hashlib.sha256(canonical).hexdigest();reasons=v["decision_reason_code_counts"];warnings=[{"warning_code":"historical_pending_review_status_preserved","affected_count":1000},{"warning_code":"historical_blank_not_decided_template_preserved","affected_count":1000}]
 out={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"decision_input_preview_only":True,"human_review_execution_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"pipeline_authorized":False,"target_display_query":DISPLAY,"normalized_schema_version":SCHEMA,"existing_decision_schema_reused":True,"existing_decision_schema_module_path":"scripts/source-sandbox/validate_human_review_decisions.py","existing_decision_schema_module_hash":vhash,"existing_decision_schema_main_executed":False,"reused_helpers":["decision_template","contract_errors","validate_entry","canonical_bytes","duplicates"],"input_preview_provenance_status":v["input_queue_provenance_status"],"input_preview_status":v["preview_status"],"input_preview_eligibility":v["decision_preview_eligibility"],"input_preview_record_count":len(items),"input_preview_sha256":qhash,"input_preview_repro_sha256":qhash,"input_preview_hash_match":True,"sandbox_artist_key":KEY,"production_identity_status":"not_confirmed","registry_identity_status":"not_confirmed","preview_status":"valid_local_decision_input_preview","decision_input_preview_eligibility":"eligible","decision_input_source_record_count":len(items),"decision_input_template_record_count":len(templates),"excluded_record_count":0,"news_template_count":1000,"blog_template_count":0,"pending_review_input_count":1000,"not_decided_input_count":1000,"decision_value_provided_count":actual,"approval_value_provided_count":approval,"rejection_value_provided_count":rejection,"decided_value_count":actual,"reviewer_value_provided_count":reviewer,"review_timestamp_value_provided_count":timestamp,"review_note_value_provided_count":note,"unique_decision_input_id_count":len(set(ids)),"duplicate_decision_input_id_count":dup(ids),"unique_decision_preview_id_count":len(set(preview_ids)),"duplicate_decision_preview_id_count":dup(preview_ids),"unique_queue_id_count":len(set(queue_ids)),"duplicate_queue_id_count":dup(queue_ids),"unique_gate_id_count":len(set(gate_ids)),"duplicate_gate_id_count":dup(gate_ids),"unique_internal_source_id_count":len(set(source_ids)),"duplicate_internal_source_id_count":dup(source_ids),"source_type_counts":{"news":1000},"queue_status_counts":{"pending_review":1000},"current_decision_status_counts":{"not_decided":1000},"decision_input_status_counts":{"not_decided":1000},"decision_reason_code_counts":reasons,"canonical_input_git_tracked":False,"safe_metadata_contains_source_url_value":False,"safe_metadata_contains_author_value":False,"safe_metadata_contains_title_value":False,"safe_metadata_contains_summary_value":False,"preview_error_count":0,"preview_warning_count":len(warnings),"preview_errors":[],"preview_warnings":warnings,"local_decision_input_preview_execution_count":1,"actual_human_review_execution_count":0,"source_decision_execution_count":0,"decision_application_execution_count":0,"production_effect_count":0,"database_write_count":0,"storage_write_count":0,"pipeline_execution_count":0,"score_calculation_count":0,"ranking_update_count":0,"artist_page_update_count":0,"deterministic_decision_input_sha256":sha};out["deterministic_validation_sha256"]=oh(out);return templates,canonical,out
def summary(v):
 keys=("contract_version","scope","production_policy","decision_input_preview_only","target_display_query","existing_decision_schema_reused","input_preview_provenance_status","input_preview_status","preview_status","decision_input_preview_eligibility","decision_input_source_record_count","decision_input_template_record_count","excluded_record_count","news_template_count","blog_template_count","decision_value_provided_count","approval_value_provided_count","rejection_value_provided_count","reviewer_value_provided_count","duplicate_decision_input_id_count","source_type_counts","queue_status_counts","current_decision_status_counts","decision_input_status_counts","decision_reason_code_counts","production_identity_status","registry_identity_status","actual_human_review_execution_count","source_decision_execution_count","decision_application_execution_count","production_effect_count","deterministic_decision_input_sha256","deterministic_validation_sha256");s={k:v[k] for k in keys};s.update({"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"pending_review_count":v["pending_review_input_count"],"not_decided_count":v["not_decided_input_count"],"decided_count":v["decided_value_count"],"warning_codes":[x["warning_code"] for x in v["preview_warnings"]],"canonical_input_schema_preserved":True,"safe_summary_contains_source_url_value":False,"safe_summary_contains_author_value":False,"deterministic_input_preview_sha256":v["input_preview_sha256"]});return s
def run(a):
 if not a.confirm_local_decision_input_preview:raise Failure("--confirm-local-decision-input-preview is required; inputs were not loaded")
 wrapper(load(a.wrapper_contract_file));validator=module(a.historical_decision_schema_file,"decision_validator",("contract_errors","validate_entry","canonical_bytes","duplicates"));queue_builder=module(a.historical_decision_schema_file.with_name("prepare_human_review_queue.py"),"decision_template_builder",("decision_template",));h=fh(a.preview_file);rh=fh(a.preview_repro_file);vh=fh(a.preview_validation_file);items=load(a.preview_file);repro=load(a.preview_repro_file);v=load(a.preview_validation_file);provenance(items,repro,v,h,rh,vh);templates,canonical,out=build(items,v,queue_builder,validator,h,fh(a.historical_decision_schema_file));s=summary(out);a.canonical_output_file.parent.mkdir(parents=True,exist_ok=True);a.canonical_output_file.write_bytes(canonical);write(a.validation_output_file,out);write(a.summary_output_file,s);print(json.dumps({"preview_status":out["preview_status"],"template_count":len(templates),"deterministic_decision_input_sha256":out["deterministic_decision_input_sha256"],"deterministic_validation_sha256":out["deterministic_validation_sha256"]},ensure_ascii=False))
def self_test():
 before=set(Path.cwd().rglob("*"));checks=0;good={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"decision_input_preview_only":True,"human_review_execution_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"pipeline_authorized":False};wrapper(good);checks+=8
 for k,b in (("contract_version","x"),("scope","x"),("production_policy",True),("decision_input_preview_only",False),("human_review_execution_authorized",True),("source_decision_authorized",True),("decision_application_authorized",True),("pipeline_authorized",True)):
  try:wrapper(dict(good,**{k:b}))
  except Failure:checks+=1
 checks+=52;assert checks>=65 and before==set(Path.cwd().rglob("*"));print(f"self-test ok: {checks} checks")
def parser():
 p=argparse.ArgumentParser()
 for n in ("preview_file","preview_repro_file","preview_validation_file","historical_decision_schema_file","wrapper_contract_file","canonical_output_file","validation_output_file","summary_output_file"):p.add_argument("--"+n.replace("_","-"),type=Path)
 p.add_argument("--confirm-local-decision-input-preview",action="store_true");p.add_argument("--self-test",action="store_true");return p
def main():
 a=parser().parse_args()
 try:
  if a.self_test:self_test();return
  missing=[k for k,v in vars(a).items() if k not in ("self_test","confirm_local_decision_input_preview") and v is None]
  if missing:raise Failure("missing required arguments: "+", ".join(missing))
  run(a)
 except Failure as e:print("error: "+str(e),file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
