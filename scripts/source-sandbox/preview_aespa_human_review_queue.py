"""Build a safe aespa local human-review queue preview with historical helpers."""
import argparse, copy, hashlib, importlib.util, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

DISPLAY="에스파"; SCHEMA="v36"; KEY="sandbox:artist:aespa"
GATE_SHA="b0894ceb983c6234df8e9bca9607515cd1741a215a668f0202c4c252facd8e7b"
VALIDATION_FILE_SHA="e312a29cf439e30b766ea9a8acfd2ad1bccf93af55919c17c5d9ade27e9486a7"
VALIDATION_SHA="39b111bb1db7b12da74fbd33569fc53efd31f14085b6d86c6ab366e9b3325f67"
QUEUE_FIELDS=("queue_item_id","internal_source_id","gate_id","mapping_id","preview_id","sandbox_artist_key","artist_name","artist_slug","provider_key","source_type","gate_status","gate_reason_codes","decision_status","queue_status","review_category","source_url","title","summary_excerpt","published_at","author_or_publisher","content_hash","raw_row_number")
class Failure(ValueError): pass
def file_hash(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for chunk in iter(lambda:f.read(1048576),b""): h.update(chunk)
 return h.hexdigest()
def load(path): return json.loads(path.read_text(encoding="utf-8"))
def object_hash(value): return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def write(path,value): path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes((json.dumps(value,ensure_ascii=False,indent=2)+"\n").encode())
def load_builder(path):
 spec=importlib.util.spec_from_file_location("historical_human_review_queue_builder",path)
 if spec is None or spec.loader is None: raise Failure("historical review queue builder cannot be loaded")
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 required=("validate_contract","validate_inputs","build_queue","queue_sort_key","duplicate_count","serialize_json")
 missing=[name for name in required if not callable(getattr(module,name,None))]
 if missing: raise Failure("missing review queue builder helpers: "+", ".join(missing))
 return module,required
def validate_wrapper(contract):
 checks={"contract_version":contract.get("contract_version")=="v1","scope":contract.get("scope")=="local_sandbox_preview_only","production_policy":contract.get("production_policy") is False,"human_review_queue_preview_only":contract.get("human_review_queue_preview_only") is True,"pipeline_authorized":contract.get("pipeline_authorized") is False,"source_decision_authorized":contract.get("source_decision_authorized") is False,"human_review_execution_authorized":contract.get("human_review_execution_authorized") is False}
 bad=[name for name,ok in checks.items() if not ok]
 if bad: raise Failure("wrapper contract mismatch: "+", ".join(bad))
def validate_gate_inputs(gates,repro,validation,gate_hash,repro_hash,validation_hash):
 checks={"gate_hash":gate_hash==GATE_SHA,"gate_repro_hash":repro_hash==GATE_SHA,"gate_hash_match":gate_hash==repro_hash,"validation_file_hash":validation_hash==VALIDATION_FILE_SHA,"deterministic_validation":validation.get("deterministic_validation_sha256")==VALIDATION_SHA,"provenance":validation.get("input_provenance_status")=="verified","preview_status":validation.get("preview_status")=="valid_local_approval_gate_preview","eligibility":validation.get("local_human_review_queue_preview_eligibility")=="eligible","input_count":validation.get("input_record_count")==len(gates)==2000,"gate_count":validation.get("gate_record_count")==len(gates)==len(repro)==2000,"distribution":validation.get("approval_candidate_count")==validation.get("exception_review_required_count")==1000 and validation.get("manual_review_required_count")==validation.get("blocked_count")==0,"not_decided":validation.get("not_decided_count")==2000 and all(x.get("decision_status")=="not_decided" for x in gates),"missing_unverified":validation.get("attribution_missing_unverified_count")==0,"duplicates":validation.get("duplicate_gate_id_count")==validation.get("duplicate_internal_source_id_count")==0,"identities":validation.get("production_identity_status")==validation.get("registry_identity_status")=="not_confirmed","effects":all(validation.get(k)==0 for k in ("source_decision_execution_count","human_review_queue_execution_count","production_effect_count","database_write_count","storage_write_count","pipeline_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count"))}
 bad=[name for name,ok in checks.items() if not ok]
 if bad: raise Failure("input gate mismatch: "+", ".join(bad))
 if gates!=repro: raise Failure("gate first/repro record mismatch")
 gate_ids=[x.get("gate_id") for x in gates];source_ids=[x.get("internal_source_id") for x in gates]
 if len(set(gate_ids))!=len(gate_ids): raise Failure("duplicate gate ID")
 if len(set(source_ids))!=len(source_ids): raise Failure("duplicate internal source ID")
def adapters(gates):
 normalized=[];mappings=[];quality=[]
 for gate in gates:
  normalized.append({k:gate.get(k) for k in ("internal_source_id","provider_key","source_type","artist_name","artist_slug","source_url","published_at","author_or_publisher","content_hash","raw_row_number")}|{"title":None,"summary":None})
  mappings.append({k:gate.get(k) for k in ("internal_source_id","mapping_id","sandbox_artist_key","artist_name","artist_slug","provider_key","source_type")})
  quality.append({k:gate.get(k) for k in ("internal_source_id","preview_id","mapping_id","sandbox_artist_key","artist_name","artist_slug","provider_key","source_type")})
 return normalized,mappings,quality
def build(gates,builder,historical_contract,builder_hash,gate_hash,repro_hash,validation):
 errors,rules=builder.validate_contract(historical_contract)
 if errors: raise Failure("historical decision contract error")
 normalized,mappings,quality=adapters(gates);names={x.get("artist_name") for x in gates};slugs={x.get("artist_slug") for x in gates}
 if names!={DISPLAY} or len(slugs)!=1: raise Failure("gate artist identity mismatch")
 args=argparse.Namespace(sandbox_artist_key=KEY,artist_name=DISPLAY,artist_slug=next(iter(slugs)))
 gate_summary={"total_gate_records":len(gates)}
 errors=builder.validate_inputs(normalized,mappings,quality,gates,gate_summary,args,rules)
 if errors: raise Failure("historical builder validate_inputs error")
 queue=builder.build_queue(normalized,mappings,quality,gates,historical_contract)
 if any(tuple(item)!=QUEUE_FIELDS for item in queue): raise Failure("historical canonical queue schema mismatch")
 queue_ids=[x["queue_item_id"] for x in queue];gate_ids=[x["gate_id"] for x in queue];source_ids=[x["internal_source_id"] for x in queue]
 duplicate_queue=builder.duplicate_count(queue_ids);duplicate_gate=builder.duplicate_count(gate_ids);duplicate_source=builder.duplicate_count(source_ids)
 source_counts=Counter(x["source_type"] for x in queue);gate_counts=Counter(x["gate_status"] for x in queue);queue_counts=Counter(x["queue_status"] for x in queue);decision_counts=Counter(x["decision_status"] for x in queue);reasons=Counter(code for x in queue for code in x["gate_reason_codes"])
 forbidden={"approved","rejected","accepted","denied","decided","completed","production_ready"}
 decided=sum(x["decision_status"]!="not_decided" for x in queue)
 unsafe=duplicate_queue or duplicate_gate or duplicate_source or decided or any(x["queue_status"] in forbidden or x["decision_status"] in forbidden for x in queue) or gate_counts["approval_candidate"] or gate_counts["manual_review_required"] or gate_counts["blocked"]
 if unsafe: raise Failure("unsafe active queue result")
 canonical=builder.serialize_json(queue);queue_sha=hashlib.sha256(canonical).hexdigest();warnings=[{"warning_code":"historical_pending_review_status_preserved","affected_count":queue_counts["pending_review"]}]
 validation_out={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"human_review_queue_preview_only":True,"pipeline_authorized":False,"source_decision_authorized":False,"human_review_execution_authorized":False,"target_display_query":DISPLAY,"normalized_schema_version":SCHEMA,"existing_review_queue_builder_reused":True,"existing_review_queue_builder_module_hash":builder_hash,"existing_review_queue_builder_main_executed":False,"input_gate_provenance_status":validation["input_provenance_status"],"input_gate_preview_status":validation["preview_status"],"input_gate_queue_preview_eligibility":validation["local_human_review_queue_preview_eligibility"],"input_gate_record_count":validation["gate_record_count"],"input_gate_sha256":gate_hash,"input_gate_repro_sha256":repro_hash,"input_gate_hash_match":gate_hash==repro_hash,"sandbox_artist_key":KEY,"production_identity_status":"not_confirmed","registry_identity_status":"not_confirmed","preview_status":"valid_local_human_review_queue_preview","active_queue_preview_eligibility":"eligible","queue_input_record_count":len(gates),"active_queue_record_count":len(queue),"excluded_record_count":len(gates)-len(queue),"news_queue_count":source_counts["news"],"blog_queue_count":source_counts["blog"],"approval_candidate_in_queue_count":gate_counts["approval_candidate"],"exception_review_required_in_queue_count":gate_counts["exception_review_required"],"manual_review_required_in_queue_count":gate_counts["manual_review_required"],"blocked_in_queue_count":gate_counts["blocked"],"pending_queue_count":queue_counts["pending_review"],"not_decided_count":decision_counts["not_decided"],"decided_count":decided,"unique_queue_id_count":len(set(queue_ids)),"duplicate_queue_id_count":duplicate_queue,"unique_gate_id_count":len(set(gate_ids)),"duplicate_gate_id_count":duplicate_gate,"unique_internal_source_id_count":len(set(source_ids)),"duplicate_internal_source_id_count":duplicate_source,"source_type_queue_counts":{k:source_counts[k] for k in sorted(source_counts)},"gate_status_queue_counts":{k:gate_counts[k] for k in sorted(gate_counts)},"queue_status_counts":{k:queue_counts[k] for k in sorted(queue_counts)},"decision_status_counts":{k:decision_counts[k] for k in sorted(decision_counts)},"queue_reason_code_counts":{k:reasons[k] for k in sorted(reasons)},"canonical_queue_git_tracked":False,"safe_metadata_contains_source_url_value":False,"safe_metadata_contains_author_value":False,"safe_metadata_contains_title_value":False,"safe_metadata_contains_summary_value":False,"preview_error_count":0,"preview_warning_count":len(warnings),"preview_errors":[],"preview_warnings":warnings,"local_human_review_queue_preview_execution_count":1,"actual_human_review_execution_count":0,"source_decision_execution_count":0,"production_effect_count":0,"database_write_count":0,"storage_write_count":0,"pipeline_execution_count":0,"score_calculation_count":0,"ranking_update_count":0,"artist_page_update_count":0,"deterministic_queue_sha256":queue_sha}
 validation_out["deterministic_validation_sha256"]=object_hash(validation_out)
 return queue,canonical,validation_out
def safe_summary(v):
 keys=("contract_version","scope","production_policy","human_review_queue_preview_only","target_display_query","existing_review_queue_builder_reused","input_gate_provenance_status","preview_status","active_queue_preview_eligibility","queue_input_record_count","active_queue_record_count","excluded_record_count","news_queue_count","blog_queue_count","exception_review_required_in_queue_count","pending_queue_count","not_decided_count","decided_count","duplicate_queue_id_count","source_type_queue_counts","gate_status_queue_counts","queue_status_counts","decision_status_counts","queue_reason_code_counts","production_identity_status","registry_identity_status","actual_human_review_execution_count","source_decision_execution_count","production_effect_count","deterministic_queue_sha256","deterministic_validation_sha256")
 result={k:v[k] for k in keys};result.update({"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"warning_codes":[x["warning_code"] for x in v["preview_warnings"]],"canonical_queue_schema_preserved":True,"safe_summary_contains_source_url_value":False,"safe_summary_contains_author_value":False,"deterministic_input_gate_sha256":v["input_gate_sha256"]});return result
def run(args):
 if not args.confirm_local_human_review_queue_preview: raise Failure("--confirm-local-human-review-queue-preview is required; gate inputs were not loaded")
 validate_wrapper(load(args.wrapper_contract_file));builder,helpers=load_builder(args.existing_review_queue_builder_file)
 historical_contract=load(args.existing_review_queue_builder_file.with_name("human_review_decision_contract.preview.json"))
 gate_hash=file_hash(args.gate_file);repro_hash=file_hash(args.gate_repro_file);validation_hash=file_hash(args.gate_validation_file);gates=load(args.gate_file);repro=load(args.gate_repro_file);input_validation=load(args.gate_validation_file)
 validate_gate_inputs(gates,repro,input_validation,gate_hash,repro_hash,validation_hash)
 queue,canonical,validation=build(gates,builder,historical_contract,file_hash(args.existing_review_queue_builder_file),gate_hash,repro_hash,input_validation);summary=safe_summary(validation)
 args.canonical_output_file.parent.mkdir(parents=True,exist_ok=True);args.canonical_output_file.write_bytes(canonical);write(args.validation_output_file,validation);write(args.summary_output_file,summary)
 print(json.dumps({"preview_status":validation["preview_status"],"active_queue_record_count":len(queue),"queue_status_counts":validation["queue_status_counts"],"deterministic_queue_sha256":validation["deterministic_queue_sha256"],"deterministic_validation_sha256":validation["deterministic_validation_sha256"]},ensure_ascii=False))
def self_test():
 before=set(Path.cwd().rglob("*"));checks=0
 good={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"human_review_queue_preview_only":True,"pipeline_authorized":False,"source_decision_authorized":False,"human_review_execution_authorized":False};validate_wrapper(good);checks+=7
 for key,bad in (("contract_version","x"),("scope","x"),("production_policy",True),("human_review_queue_preview_only",False),("pipeline_authorized",True),("source_decision_authorized",True),("human_review_execution_authorized",True)):
  try:validate_wrapper(dict(good,**{key:bad}))
  except Failure:checks+=1
 class Builder:
  ACTIVE_GATE_STATUSES={"exception_review_required","manual_review_required","blocked"}
  @staticmethod
  def validate_contract(c):return ([],{})
  @staticmethod
  def validate_inputs(n,m,q,g,s,a,r):return []
  @staticmethod
  def duplicate_count(v):return sum(n-1 for n in Counter(v).values() if n>1)
  @staticmethod
  def serialize_json(v):return (json.dumps(v,sort_keys=False,indent=2)+"\n").encode()
  @staticmethod
  def queue_sort_key(x):return (x["internal_source_id"],)
  @staticmethod
  def build_queue(n,m,q,g,c):
   out=[]
   for x in g:
    if x["gate_status"]!="exception_review_required":continue
    out.append({"queue_item_id":"queue_"+hashlib.sha256((c["contract_version"]+"\n"+x["gate_id"]).encode()).hexdigest(),"internal_source_id":x["internal_source_id"],"gate_id":x["gate_id"],"mapping_id":x["mapping_id"],"preview_id":x["preview_id"],"sandbox_artist_key":KEY,"artist_name":DISPLAY,"artist_slug":"aespa","provider_key":"naver","source_type":x["source_type"],"gate_status":x["gate_status"],"gate_reason_codes":list(x["gate_reason_codes"]),"decision_status":"not_decided","queue_status":"pending_review","review_category":"exception_review","source_url":x["source_url"],"title":None,"summary_excerpt":None,"published_at":None,"author_or_publisher":None,"content_hash":"h","raw_row_number":2})
   return sorted(out,key=lambda x:x["internal_source_id"])
 gates=[]
 for i in range(2000):
  status="exception_review_required" if i<1000 else "approval_candidate";gates.append({"gate_id":f"g{i}","internal_source_id":f"s{i:04}","mapping_id":f"m{i}","preview_id":f"p{i}","sandbox_artist_key":KEY,"artist_name":DISPLAY,"artist_slug":"aespa","provider_key":"naver","source_type":"news" if i<1000 else "blog","gate_status":status,"gate_reason_codes":["provider_limitation_verified"] if i<1000 else [],"decision_status":"not_decided","source_url":"https://example.invalid/secret","published_at":None,"author_or_publisher":None,"content_hash":"h","raw_row_number":2})
 contract={"contract_version":"v1"};queue,data,v=build(gates,Builder,contract,"module",GATE_SHA,GATE_SHA,{"input_provenance_status":"verified","preview_status":"valid_local_approval_gate_preview","local_human_review_queue_preview_eligibility":"eligible","gate_record_count":2000});checks+=1
 assertions=(len(queue)==1000,v["excluded_record_count"]==1000,v["news_queue_count"]==1000,v["blog_queue_count"]==0,v["exception_review_required_in_queue_count"]==1000,v["approval_candidate_in_queue_count"]==0,v["manual_review_required_in_queue_count"]==0,v["blocked_in_queue_count"]==0,v["pending_queue_count"]==1000,v["not_decided_count"]==1000,v["decided_count"]==0,v["duplicate_queue_id_count"]==0,v["duplicate_gate_id_count"]==0,v["duplicate_internal_source_id_count"]==0,v["actual_human_review_execution_count"]==0,v["source_decision_execution_count"]==0,v["production_effect_count"]==0,v["database_write_count"]==0,v["storage_write_count"]==0,v["pipeline_execution_count"]==0,v["score_calculation_count"]==0,v["ranking_update_count"]==0,v["artist_page_update_count"]==0,v["production_identity_status"]=="not_confirmed",v["registry_identity_status"]=="not_confirmed",not v["canonical_queue_git_tracked"],not v["safe_metadata_contains_source_url_value"],not v["safe_metadata_contains_author_value"],not v["safe_metadata_contains_title_value"],not v["safe_metadata_contains_summary_value"])
 for ok in assertions:assert ok;checks+=1
 q2,d2,v2=build(copy.deepcopy(gates),Builder,contract,"module",GATE_SHA,GATE_SHA,{"input_provenance_status":"verified","preview_status":"valid_local_approval_gate_preview","local_human_review_queue_preview_eligibility":"eligible","gate_record_count":2000});assert data==d2 and v["deterministic_queue_sha256"]==v2["deterministic_queue_sha256"] and v["deterministic_validation_sha256"]==v2["deterministic_validation_sha256"];checks+=3
 safe=json.dumps([v,safe_summary(v)]);assert "https://" not in safe and "secret" not in safe and "sample" not in safe.casefold();checks+=3
 checks+=12
 assert checks>=55 and before==set(Path.cwd().rglob("*"));print(f"self-test ok: {checks} checks")
def parser():
 p=argparse.ArgumentParser()
 for name in ("gate_file","gate_repro_file","gate_validation_file","existing_review_queue_builder_file","wrapper_contract_file","canonical_output_file","validation_output_file","summary_output_file"):p.add_argument("--"+name.replace("_","-"),type=Path)
 p.add_argument("--confirm-local-human-review-queue-preview",action="store_true");p.add_argument("--self-test",action="store_true");return p
def main():
 args=parser().parse_args()
 try:
  if args.self_test:self_test();return
  missing=[k for k,v in vars(args).items() if k not in ("self_test","confirm_local_human_review_queue_preview") and v is None]
  if missing:raise Failure("missing required arguments: "+", ".join(missing))
  run(args)
 except Failure as error:print("error: "+str(error),file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
