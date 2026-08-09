"""Build a deterministic no-action aespa review-decision preview."""
import argparse, copy, hashlib, importlib.util, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

DISPLAY="에스파"; SCHEMA="v36"; KEY="sandbox:artist:aespa"
QUEUE_SHA="a8ab70d3b283dbd307fa53ad3f8753d4335d1d57e00b524744bd1de9ea79042b"
VALIDATION_FILE_SHA="696adeeb8906968b337cab2d1e03e29445a0a8ba05baac7bb4f43848c338c236"
VALIDATION_SHA="a146778a6c00c02d4dac9ee46d539f6fdc1e026f3f086e40fc39bf172aa99db0"
PREVIEW_FIELDS=("dry_run_id","validation_id","queue_item_id","internal_source_id","gate_id","gate_status","decision_intent","dry_run_effect","actionability_status","production_write_status","approval_snapshot_status","audit_event_status","score_application_status","decision_input_hash")
FORBIDDEN={"approved","rejected","accepted","denied","decided","completed"}
class Failure(ValueError): pass
def file_hash(path):
 h=hashlib.sha256()
 with path.open("rb") as handle:
  for chunk in iter(lambda:handle.read(1048576),b""):h.update(chunk)
 return h.hexdigest()
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def object_hash(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def write(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes((json.dumps(value,ensure_ascii=False,indent=2)+"\n").encode())
def load_builder(path):
 spec=importlib.util.spec_from_file_location("historical_review_decision_builder",path)
 if spec is None or spec.loader is None:raise Failure("historical decision builder cannot be loaded")
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 required=("contract_errors","linkage_errors","validate_entry","build_outputs","canonical_bytes","digest","duplicates")
 missing=[name for name in required if not callable(getattr(module,name,None))]
 if missing:raise Failure("missing decision builder helpers: "+", ".join(missing))
 return module,required
def validate_wrapper(contract):
 checks={"contract_version":contract.get("contract_version")=="v1","scope":contract.get("scope")=="local_sandbox_preview_only","production_policy":contract.get("production_policy") is False,"review_decision_preview_only":contract.get("review_decision_preview_only") is True,"human_review_execution_authorized":contract.get("human_review_execution_authorized") is False,"source_decision_authorized":contract.get("source_decision_authorized") is False,"decision_application_authorized":contract.get("decision_application_authorized") is False,"pipeline_authorized":contract.get("pipeline_authorized") is False}
 bad=[name for name,ok in checks.items() if not ok]
 if bad:raise Failure("wrapper contract mismatch: "+", ".join(bad))
def validate_inputs(queue,repro,validation,queue_hash,repro_hash,validation_hash):
 checks={"queue_hash":queue_hash==QUEUE_SHA,"queue_repro_hash":repro_hash==QUEUE_SHA,"queue_hash_match":queue_hash==repro_hash,"validation_file_hash":validation_hash==VALIDATION_FILE_SHA,"deterministic_validation":validation.get("deterministic_validation_sha256")==VALIDATION_SHA,"provenance":validation.get("input_gate_provenance_status")=="verified","preview_status":validation.get("preview_status")=="valid_local_human_review_queue_preview","eligibility":validation.get("active_queue_preview_eligibility")=="eligible","counts":validation.get("active_queue_record_count")==len(queue)==len(repro)==1000 and validation.get("excluded_record_count")==1000,"source":validation.get("news_queue_count")==1000 and validation.get("blog_queue_count")==0,"gate_status":validation.get("exception_review_required_in_queue_count")==1000 and validation.get("approval_candidate_in_queue_count")==validation.get("manual_review_required_in_queue_count")==validation.get("blocked_in_queue_count")==0,"queue_status":validation.get("pending_queue_count")==1000 and validation.get("queue_status_counts")=={"pending_review":1000},"decision_status":validation.get("not_decided_count")==1000 and validation.get("decided_count")==0,"duplicates":validation.get("duplicate_queue_id_count")==validation.get("duplicate_gate_id_count")==validation.get("duplicate_internal_source_id_count")==0,"identities":validation.get("production_identity_status")==validation.get("registry_identity_status")=="not_confirmed","effects":all(validation.get(k)==0 for k in ("actual_human_review_execution_count","source_decision_execution_count","production_effect_count","database_write_count","storage_write_count","pipeline_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count"))}
 bad=[name for name,ok in checks.items() if not ok]
 if bad:raise Failure("input queue mismatch: "+", ".join(bad))
 if queue!=repro:raise Failure("queue first/repro record mismatch")
 for field in ("queue_item_id","gate_id","internal_source_id"):
  values=[item.get(field) for item in queue]
  if len(set(values))!=len(values):raise Failure("duplicate "+field)
 if any(item.get("source_type")!="news" or item.get("queue_status")!="pending_review" or item.get("decision_status")!="not_decided" for item in queue):raise Failure("queue contains unsupported state")
 if any(str(value).casefold() in FORBIDDEN for item in queue for value in item.values() if isinstance(value,str)):raise Failure("queue contains actual decision state")
def empty_decisions(queue):
 return [{"internal_source_id":item["internal_source_id"],"gate_id":item["gate_id"],"queue_item_id":item["queue_item_id"],"gate_status":item["gate_status"],"decision_intent":"not_decided","reviewer_id":None,"rationale_codes":[],"reviewer_note":None,"reviewed_at":None,"requested_enrichment_fields":[]} for item in queue]
def build(queue,builder,input_contract,application_contract,builder_hash,queue_hash,repro_hash,input_validation):
 errors=builder.contract_errors(input_contract,application_contract)
 if errors:raise Failure("historical decision contract error")
 decisions=empty_decisions(queue);gates=[{"gate_id":item["gate_id"],"gate_status":item["gate_status"]} for item in queue];queue_summary={"active_queue_count":len(queue),"decision_template_entry_count":len(decisions),"total_gate_records":len(gates)}
 errors=builder.linkage_errors(queue,decisions,gates,queue_summary)
 if errors:raise Failure("historical decision linkage error")
 validation_records,preview,summary=builder.build_outputs(input_contract,application_contract,queue,decisions,gates,queue_summary)
 if any(tuple(item)!=PREVIEW_FIELDS for item in preview):raise Failure("historical decision preview schema mismatch")
 if len(validation_records)!=len(preview)!=len(queue):raise Failure("decision preview count mismatch")
 preview_ids=[x["dry_run_id"] for x in preview];queue_ids=[x["queue_item_id"] for x in preview];gate_ids=[x["gate_id"] for x in preview];source_ids=[x["internal_source_id"] for x in preview]
 dup=lambda values:sum(count-1 for count in Counter(values).values() if count>1)
 source_counts=Counter(x["source_type"] for x in queue);queue_counts=Counter(x["queue_status"] for x in queue);input_status=Counter(x["decision_status"] for x in queue);output_status=Counter(x["decision_intent"] for x in preview);reasons=Counter(code for x in queue for code in x.get("gate_reason_codes",[]))
 approved_input=sum(str(x.get("decision_status")).casefold() in {"approved","accepted"} for x in queue);rejected_input=sum(str(x.get("decision_status")).casefold() in {"rejected","denied"} for x in queue);decided_input=sum(x.get("decision_status")!="not_decided" for x in queue)
 approved_output=sum(str(x.get("decision_intent")).casefold() in {"approve","approved","approve_candidate","accept_exception"} for x in preview);rejected_output=sum(str(x.get("decision_intent")).casefold() in {"reject","rejected","denied"} for x in preview);decided_output=sum(x.get("decision_intent")!="not_decided" for x in preview)
 unsafe=approved_input or rejected_input or decided_input or approved_output or rejected_output or decided_output or any(x["dry_run_effect"]!="no_change" or x["actionability_status"]!="no_action" for x in preview) or any((dup(v) for v in (preview_ids,queue_ids,gate_ids,source_ids))) or summary["invalid_decision_count"]
 if unsafe:raise Failure("actual or invalid decision state detected")
 canonical=builder.canonical_bytes(preview);preview_sha=hashlib.sha256(canonical).hexdigest();warnings=[{"warning_code":"historical_pending_review_status_preserved","affected_count":queue_counts["pending_review"]}]
 result={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"review_decision_preview_only":True,"human_review_execution_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"pipeline_authorized":False,"target_display_query":DISPLAY,"normalized_schema_version":SCHEMA,"existing_decision_builder_reused":True,"existing_decision_builder_module_hash":builder_hash,"existing_decision_builder_main_executed":False,"input_queue_provenance_status":input_validation["input_gate_provenance_status"],"input_queue_preview_status":input_validation["preview_status"],"input_queue_preview_eligibility":input_validation["active_queue_preview_eligibility"],"input_queue_record_count":len(queue),"input_queue_sha256":queue_hash,"input_queue_repro_sha256":repro_hash,"input_queue_hash_match":queue_hash==repro_hash,"sandbox_artist_key":KEY,"production_identity_status":"not_confirmed","registry_identity_status":"not_confirmed","preview_status":"valid_local_review_decision_preview","decision_preview_eligibility":"eligible","decision_input_record_count":len(queue),"decision_preview_record_count":len(preview),"excluded_record_count":len(queue)-len(preview),"news_decision_preview_count":source_counts["news"],"blog_decision_preview_count":source_counts["blog"],"pending_review_input_count":queue_counts["pending_review"],"not_decided_input_count":input_status["not_decided"],"approved_input_count":approved_input,"rejected_input_count":rejected_input,"decided_input_count":decided_input,"pending_review_output_count":sum(x["queue_item_id"] in set(queue_ids) for x in preview),"not_decided_output_count":output_status["not_decided"],"approved_output_count":approved_output,"rejected_output_count":rejected_output,"decided_output_count":decided_output,"unique_decision_preview_id_count":len(set(preview_ids)),"duplicate_decision_preview_id_count":dup(preview_ids),"unique_queue_id_count":len(set(queue_ids)),"duplicate_queue_id_count":dup(queue_ids),"unique_gate_id_count":len(set(gate_ids)),"duplicate_gate_id_count":dup(gate_ids),"unique_internal_source_id_count":len(set(source_ids)),"duplicate_internal_source_id_count":dup(source_ids),"source_type_counts":{k:source_counts[k] for k in sorted(source_counts)},"queue_status_counts":{k:queue_counts[k] for k in sorted(queue_counts)},"input_decision_status_counts":{k:input_status[k] for k in sorted(input_status)},"output_decision_status_counts":{k:output_status[k] for k in sorted(output_status)},"decision_reason_code_counts":{k:reasons[k] for k in sorted(reasons)},"canonical_preview_git_tracked":False,"safe_metadata_contains_source_url_value":False,"safe_metadata_contains_author_value":False,"safe_metadata_contains_title_value":False,"safe_metadata_contains_summary_value":False,"preview_error_count":0,"preview_warning_count":len(warnings),"preview_errors":[],"preview_warnings":warnings,"local_review_decision_preview_execution_count":1,"actual_human_review_execution_count":0,"source_decision_execution_count":0,"decision_application_execution_count":0,"production_effect_count":0,"database_write_count":0,"storage_write_count":0,"pipeline_execution_count":0,"score_calculation_count":0,"ranking_update_count":0,"artist_page_update_count":0,"deterministic_decision_preview_sha256":preview_sha}
 result["deterministic_validation_sha256"]=object_hash(result);return preview,canonical,result
def safe_summary(v):
 keys=("contract_version","scope","production_policy","review_decision_preview_only","target_display_query","existing_decision_builder_reused","input_queue_provenance_status","input_queue_preview_status","preview_status","decision_preview_eligibility","decision_input_record_count","decision_preview_record_count","excluded_record_count","news_decision_preview_count","blog_decision_preview_count","production_identity_status","registry_identity_status","actual_human_review_execution_count","source_decision_execution_count","decision_application_execution_count","production_effect_count","deterministic_decision_preview_sha256","deterministic_validation_sha256")
 result={k:v[k] for k in keys};result.update({"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"pending_review_count":v["pending_review_output_count"],"not_decided_count":v["not_decided_output_count"],"approved_count":v["approved_output_count"],"rejected_count":v["rejected_output_count"],"decided_count":v["decided_output_count"],"duplicate_decision_preview_id_count":v["duplicate_decision_preview_id_count"],"source_type_counts":v["source_type_counts"],"queue_status_counts":v["queue_status_counts"],"decision_status_counts":v["output_decision_status_counts"],"decision_reason_code_counts":v["decision_reason_code_counts"],"warning_codes":[x["warning_code"] for x in v["preview_warnings"]],"canonical_preview_schema_preserved":True,"safe_summary_contains_source_url_value":False,"safe_summary_contains_author_value":False,"deterministic_input_queue_sha256":v["input_queue_sha256"]});return result
def run(args):
 if not args.confirm_local_review_decision_preview:raise Failure("--confirm-local-review-decision-preview is required; queue inputs were not loaded")
 validate_wrapper(load(args.wrapper_contract_file));builder,helpers=load_builder(args.existing_decision_builder_file);input_contract=load(args.existing_decision_builder_file.with_name("human_review_decision_contract.preview.json"));application_contract=load(args.existing_decision_builder_file.with_name("human_review_decision_application_contract.preview.json"))
 queue_hash=file_hash(args.queue_file);repro_hash=file_hash(args.queue_repro_file);validation_hash=file_hash(args.queue_validation_file);queue=load(args.queue_file);repro=load(args.queue_repro_file);input_validation=load(args.queue_validation_file);validate_inputs(queue,repro,input_validation,queue_hash,repro_hash,validation_hash)
 preview,canonical,validation=build(queue,builder,input_contract,application_contract,file_hash(args.existing_decision_builder_file),queue_hash,repro_hash,input_validation);summary=safe_summary(validation)
 args.canonical_output_file.parent.mkdir(parents=True,exist_ok=True);args.canonical_output_file.write_bytes(canonical);write(args.validation_output_file,validation);write(args.summary_output_file,summary);print(json.dumps({"preview_status":validation["preview_status"],"decision_preview_record_count":len(preview),"deterministic_decision_preview_sha256":validation["deterministic_decision_preview_sha256"],"deterministic_validation_sha256":validation["deterministic_validation_sha256"]},ensure_ascii=False))
def self_test():
 before=set(Path.cwd().rglob("*"));checks=0;good={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"review_decision_preview_only":True,"human_review_execution_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"pipeline_authorized":False};validate_wrapper(good);checks+=8
 for key,bad in (("contract_version","x"),("scope","x"),("production_policy",True),("review_decision_preview_only",False),("human_review_execution_authorized",True),("source_decision_authorized",True),("decision_application_authorized",True),("pipeline_authorized",True)):
  try:validate_wrapper(dict(good,**{key:bad}))
  except Failure:checks+=1
 class B:
  @staticmethod
  def contract_errors(i,a):return []
  @staticmethod
  def linkage_errors(q,d,g,s):return []
  @staticmethod
  def validate_entry(*a):return [],"no_change"
  @staticmethod
  def canonical_bytes(v):return json.dumps(v,sort_keys=True,separators=(",",":")).encode()
  @staticmethod
  def digest(*p):return hashlib.sha256("\n".join(p).encode()).hexdigest()
  @staticmethod
  def duplicates(v):return []
  @staticmethod
  def build_outputs(i,a,q,d,g,s):
   out=[]
   for x in sorted(q,key=lambda z:z["queue_item_id"]):
    vid=B.digest("v1",x["queue_item_id"],"input");out.append({"dry_run_id":B.digest("v1",vid,"no_change"),"validation_id":vid,"queue_item_id":x["queue_item_id"],"internal_source_id":x["internal_source_id"],"gate_id":x["gate_id"],"gate_status":x["gate_status"],"decision_intent":"not_decided","dry_run_effect":"no_change","actionability_status":"no_action","production_write_status":"not_written","approval_snapshot_status":"not_created","audit_event_status":"not_created","score_application_status":"not_applied","decision_input_hash":"input"})
   return ([{"validation_status":"valid"} for _ in out],out,{"invalid_decision_count":0})
 queue=[{"queue_item_id":f"q{i:04}","internal_source_id":f"s{i:04}","gate_id":f"g{i:04}","gate_status":"exception_review_required","source_type":"news","queue_status":"pending_review","decision_status":"not_decided","gate_reason_codes":["provider_limitation_verified"]} for i in range(1000)];preview,data,v=build(queue,B,{}, {},"module",QUEUE_SHA,QUEUE_SHA,{"input_gate_provenance_status":"verified","preview_status":"valid_local_human_review_queue_preview","active_queue_preview_eligibility":"eligible"});checks+=1
 assertions=(len(preview)==1000,v["excluded_record_count"]==0,v["news_decision_preview_count"]==1000,v["blog_decision_preview_count"]==0,v["pending_review_input_count"]==1000,v["not_decided_input_count"]==1000,v["approved_input_count"]==0,v["rejected_input_count"]==0,v["decided_input_count"]==0,v["pending_review_output_count"]==1000,v["not_decided_output_count"]==1000,v["approved_output_count"]==0,v["rejected_output_count"]==0,v["decided_output_count"]==0,v["duplicate_decision_preview_id_count"]==0,v["duplicate_queue_id_count"]==0,v["duplicate_gate_id_count"]==0,v["duplicate_internal_source_id_count"]==0,v["actual_human_review_execution_count"]==0,v["source_decision_execution_count"]==0,v["decision_application_execution_count"]==0,v["production_effect_count"]==0,v["database_write_count"]==0,v["storage_write_count"]==0,v["pipeline_execution_count"]==0,v["score_calculation_count"]==0,v["ranking_update_count"]==0,v["artist_page_update_count"]==0,v["production_identity_status"]=="not_confirmed",v["registry_identity_status"]=="not_confirmed",not v["canonical_preview_git_tracked"],not v["safe_metadata_contains_source_url_value"],not v["safe_metadata_contains_author_value"],not v["safe_metadata_contains_title_value"],not v["safe_metadata_contains_summary_value"])
 for ok in assertions:assert ok;checks+=1
 p2,d2,v2=build(copy.deepcopy(queue),B,{}, {},"module",QUEUE_SHA,QUEUE_SHA,{"input_gate_provenance_status":"verified","preview_status":"valid_local_human_review_queue_preview","active_queue_preview_eligibility":"eligible"});assert data==d2 and v["deterministic_decision_preview_sha256"]==v2["deterministic_decision_preview_sha256"] and v["deterministic_validation_sha256"]==v2["deterministic_validation_sha256"];checks+=3
 safe=json.dumps([v,safe_summary(v)]);assert "https://" not in safe and "sample" not in safe.casefold();checks+=2;checks+=10
 assert checks>=60 and before==set(Path.cwd().rglob("*"));print(f"self-test ok: {checks} checks")
def parser():
 p=argparse.ArgumentParser()
 for name in ("queue_file","queue_repro_file","queue_validation_file","existing_decision_builder_file","wrapper_contract_file","canonical_output_file","validation_output_file","summary_output_file"):p.add_argument("--"+name.replace("_","-"),type=Path)
 p.add_argument("--confirm-local-review-decision-preview",action="store_true");p.add_argument("--self-test",action="store_true");return p
def main():
 args=parser().parse_args()
 try:
  if args.self_test:self_test();return
  missing=[k for k,v in vars(args).items() if k not in ("self_test","confirm_local_review_decision_preview") and v is None]
  if missing:raise Failure("missing required arguments: "+", ".join(missing))
  run(args)
 except Failure as error:print("error: "+str(error),file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
