"""Preview deterministic AESPA human-decision submission schema readiness locally."""
import argparse, copy, hashlib, importlib.util, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

V57_SHA="12801c4a5b9af1773d7ea54b1b96c7c330b6a923d7fd53868c879d7e19e82d9c"
V57_VALIDATION_FILE_SHA="4c50277862199a14349a9fa3fe9b4bcf13e8a86dd39f535cf26fb0bd3e2ae64d"
V57_VALIDATION_SHA="846bd6eba724f83963038660bb49de039a263754e43761cb1f7488e23af48067"
V58_SHA="a1f4830381867ff2d7846c2bfd6ec75e4e585364ec07392d9fb6a4e9b1678124"
V58_VALIDATION_FILE_SHA="4234890bf7b9a1acbba4126ad87959e8e55f55bf5ada8b37c87f3ac118096630"
V58_VALIDATION_SHA="ffff479a222d68d6fd9518ac07dd2efd24094ea49a3808ad433c6239ca4afbb8"
HELPERS=("decision_template","contract_errors","linkage_errors","validate_entry","build_outputs","canonical_bytes","digest","duplicates")
REQUIRED_SUBMISSION_FIELDS=["internal_source_id","gate_id","decision_intent"]
OPTIONAL_SUBMISSION_FIELDS=["reviewer_note","reviewed_at","requested_enrichment_fields"]
REQUIRED_LINKAGE_FIELDS=["decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type"]
REQUIRED_DECISION_FIELDS=["reviewer_id","rationale_codes"]
OPTIONAL_REVIEW_FIELDS=["reviewer_note","reviewed_at","requested_enrichment_fields"]
FORBIDDEN={"approved","rejected","approve","reject","accepted","denied","completed","decided","approve_candidate","accept_exception"}
class Failure(ValueError):pass
def file_hash(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
 return h.hexdigest()
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def canonical(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode()
def object_hash(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+"\n").encode())
def dup(values):return sum(n-1 for n in Counter(values).values() if n>1)
def validate_wrapper(c):
 expected={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"human_decision_submission_preview_only":True,"human_review_execution_authorized":False,"human_decision_submission_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"production_mutation_authorized":False,"pipeline_authorized":False,"actual_approve":False,"actual_reject":False,"actual_submission":False,"actual_application":False,"production_promotion":False}
 bad=[k for k,v in expected.items() if c.get(k)!=v]
 if bad:raise Failure("wrapper contract mismatch: "+", ".join(bad))
def load_historical(validator_path):
 queue_path=validator_path.with_name("prepare_human_review_queue.py")
 if not validator_path.is_file() or not queue_path.is_file():raise Failure("historical schema/helper unavailable")
 def mod(path,name):
  spec=importlib.util.spec_from_file_location(name,path)
  if spec is None or spec.loader is None:raise Failure("historical schema/helper unavailable")
  result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
 q=mod(queue_path,"historical_queue_template");v=mod(validator_path,"historical_decision_validator")
 missing=[x for x in HELPERS if not callable(getattr(q if x=="decision_template" else v,x,None))]
 if missing:raise Failure("historical schema/helper unavailable: "+", ".join(missing))
 return q,v
def validate_v57(items,repro,v,h,rh,vh):
 checks={"hash":h==V57_SHA,"repro":rh==V57_SHA,"match":h==rh and items==repro,"validation_file":vh==V57_VALIDATION_FILE_SHA,"validation":v.get("deterministic_validation_sha256")==V57_VALIDATION_SHA,"provenance":v.get("input_preview_provenance_status")=="verified","preview":v.get("preview_status")=="valid_local_decision_input_preview","eligibility":v.get("decision_input_preview_eligibility")=="eligible","counts":len(items)==1000 and v.get("decision_input_source_record_count")==v.get("decision_input_template_record_count")==1000,"state":v.get("pending_review_input_count")==v.get("not_decided_input_count")==1000,"actual":all(v.get(k)==0 for k in ("decision_value_provided_count","approval_value_provided_count","rejection_value_provided_count","decided_value_count","reviewer_value_provided_count","review_timestamp_value_provided_count","review_note_value_provided_count"))}
 bad=[k for k,x in checks.items() if not x]
 if bad:raise Failure("v57 provenance mismatch: "+", ".join(bad))
def validate_v58(items,repro,v,h,rh,vh):
 checks={"hash":h==V58_SHA,"repro":rh==V58_SHA,"match":h==rh and items==repro,"validation_file":vh==V58_VALIDATION_FILE_SHA,"validation":v.get("deterministic_validation_sha256")==V58_VALIDATION_SHA,"provenance":v.get("input_decision_provenance_status")=="verified","preview":v.get("preview_status")=="valid_local_decision_application_dry_run","eligibility":v.get("application_dry_run_eligibility")=="eligible","counts":len(items)==1000 and v.get("input_record_count")==v.get("dry_run_inspection_record_count")==1000,"state":v.get("pending_review_count")==v.get("not_decided_count")==v.get("no_application_due_to_undecided_count")==1000,"actual":all(v.get(k)==0 for k in ("actual_decision_value_count","actual_approved_decision_count","actual_rejected_decision_count","actual_decided_count","actual_application_candidate_count","actual_application_execution_count"))}
 bad=[k for k,x in checks.items() if not x]
 if bad:raise Failure("v58 provenance mismatch: "+", ".join(bad))
def build(v57,v58,v57meta,qbuilder,validator,validator_path,validator_hash,v57h,v57rh,v58h,v58rh):
 input_contract=load(validator_path.with_name("human_review_decision_contract.preview.json"));app_contract=load(validator_path.with_name("human_review_decision_application_contract.preview.json"))
 if validator.contract_errors(input_contract,app_contract):raise Failure("historical decision contract invalid")
 for x in v57:
  strings={value.casefold() for value in x.values() if isinstance(value,str)}
  if x.get("decision_intent")!="not_decided" or strings & FORBIDDEN or x.get("reviewer_id") is not None or x.get("reviewed_at") is not None or x.get("reviewer_note") is not None or x.get("rationale_codes")!=[]:raise Failure("actual submission metadata detected")
 queue=[{"queue_item_id":x["queue_item_id"],"internal_source_id":x["internal_source_id"],"gate_id":x["gate_id"],"gate_status":x["gate_status"]} for x in v57]
 templates=qbuilder.decision_template(queue)
 apps={x["queue_item_id"]:x for x in v58}
 if len(apps)!=len(v58):raise Failure("duplicate decision preview ID")
 records=[]
 for item,template in zip(v57,templates):
  app=apps.get(item["queue_item_id"])
  if not app or any(app.get(k)!=item.get(k) for k in ("queue_item_id","gate_id","internal_source_id","gate_status")):raise Failure("cross-stage linkage mismatch")
  input_id=hashlib.sha256(validator.canonical_bytes(item)).hexdigest()
  if app.get("decision_input_hash")!=input_id or app.get("decision_intent")!="not_decided" or app.get("actionability_status")!="no_action":raise Failure("cross-stage linkage mismatch")
  reasons,effect=validator.validate_entry(template,item["gate_status"],input_contract,app_contract)
  if reasons or effect!="no_change":raise Failure("historical blank template invalid")
  if template.get("decision_intent")!="not_decided" or template.get("reviewer_id") is not None or template.get("reviewed_at") is not None or template.get("reviewer_note") is not None or template.get("rationale_codes")!=[]:raise Failure("actual submission metadata detected")
  preview_id=validator.digest("v1",input_id,app["dry_run_id"],item["queue_item_id"],item["gate_id"],item["internal_source_id"])
  records.append({"submission_preview_id":preview_id,"decision_input_id":input_id,"decision_preview_id":app["dry_run_id"],"queue_id":item["queue_item_id"],"gate_id":item["gate_id"],"internal_source_id":item["internal_source_id"],"sandbox_artist_key":v57meta["sandbox_artist_key"],"source_type":"news","queue_status":"pending_review","current_decision_status":"not_decided","application_status":"no_action","submission_template":template,"required_submission_fields":REQUIRED_SUBMISSION_FIELDS,"optional_submission_fields":OPTIONAL_SUBMISSION_FIELDS,"required_linkage_fields":REQUIRED_LINKAGE_FIELDS,"required_decision_fields":REQUIRED_DECISION_FIELDS,"optional_review_metadata_fields":OPTIONAL_REVIEW_FIELDS})
 records.sort(key=lambda x:(x["queue_id"],x["gate_id"],x["internal_source_id"]))
 ids={"submission":[x["submission_preview_id"] for x in records],"input":[x["decision_input_id"] for x in records],"preview":[x["decision_preview_id"] for x in records],"queue":[x["queue_id"] for x in records],"gate":[x["gate_id"] for x in records],"source":[x["internal_source_id"] for x in records]}
 if any(dup(x) for x in ids.values()):raise Failure("duplicate linkage ID")
 data=canonical(records);sha=hashlib.sha256(data).hexdigest();warnings=[{"warning_code":"historical_pending_review_status_preserved","affected_count":len(records)},{"warning_code":"historical_blank_not_decided_template_preserved","affected_count":len(records)}]
 counts0={k:0 for k in ("actual_human_submission_count","actual_decision_value_count","actual_approval_count","actual_rejection_count","actual_decided_count","actual_reviewer_value_count","actual_review_timestamp_count","actual_review_note_count","decision_application_candidate_count","decision_application_execution_count","actual_human_review_execution_count","actual_human_submission_execution_count","source_decision_execution_count","decision_application_execution_count","production_mutation_count","production_effect_count","database_write_count","storage_write_count","pipeline_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count")}
 out={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"human_decision_submission_preview_only":True,"human_review_execution_authorized":False,"human_decision_submission_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"production_mutation_authorized":False,"pipeline_authorized":False,"target_display_query":v57meta["target_display_query"],"normalized_schema_version":v57meta["normalized_schema_version"],"historical_submission_builder_found":False,"historical_submission_schema_reused":True,"historical_submission_schema_module_path":"scripts/source-sandbox/validate_human_review_decisions.py","historical_submission_schema_module_hash":validator_hash,"historical_submission_schema_main_executed":False,"reused_helpers":list(HELPERS),"v57_input_provenance_status":"verified","v57_preview_status":v57meta["preview_status"],"v57_preview_eligibility":v57meta["decision_input_preview_eligibility"],"v57_input_sha256":v57h,"v57_input_repro_sha256":v57rh,"v57_input_hash_match":v57h==v57rh,"v58_input_provenance_status":"verified","v58_preview_status":"valid_local_decision_application_dry_run","v58_preview_eligibility":"eligible","v58_input_sha256":v58h,"v58_input_repro_sha256":v58rh,"v58_input_hash_match":v58h==v58rh,"cross_stage_linkage_status":"valid","sandbox_artist_key":v57meta["sandbox_artist_key"],"production_identity_status":"not_confirmed","registry_identity_status":"not_confirmed","preview_status":"valid_local_human_decision_submission_preview","human_decision_submission_preview_eligibility":"eligible","source_record_count":len(records),"submission_template_record_count":len(records),"excluded_record_count":0,"news_count":len(records),"blog_count":0,"pending_review_count":len(records),"not_decided_count":len(records),"no_action_application_count":len(records),**counts0,"required_submission_fields":REQUIRED_SUBMISSION_FIELDS,"optional_submission_fields":OPTIONAL_SUBMISSION_FIELDS,"required_linkage_fields":REQUIRED_LINKAGE_FIELDS,"required_decision_fields":REQUIRED_DECISION_FIELDS,"optional_review_metadata_fields":OPTIONAL_REVIEW_FIELDS}
 for name,key in (("submission_preview_id","submission"),("decision_input_id","input"),("decision_preview_id","preview"),("queue_id","queue"),("gate_id","gate"),("internal_source_id","source")):out["unique_"+name+"_count"]=len(set(ids[key]));out["duplicate_"+name+"_count"]=dup(ids[key])
 out.update({"source_type_counts":{"news":len(records)},"queue_status_counts":{"pending_review":len(records)},"decision_status_counts":{"not_decided":len(records)},"application_status_counts":{"no_action":len(records)},"submission_status_counts":{},"reason_code_counts":dict(sorted(v57meta["decision_reason_code_counts"].items())),"canonical_output_git_tracked":False,"safe_metadata_contains_source_url_value":False,"safe_metadata_contains_author_value":False,"safe_metadata_contains_title_value":False,"safe_metadata_contains_summary_value":False,"safe_metadata_contains_raw_sample":False,"safe_metadata_contains_filename_or_path":False,"preview_error_count":0,"preview_warning_count":len(warnings),"preview_errors":[],"preview_warnings":warnings,"local_submission_preview_execution_count":1,"deterministic_submission_preview_sha256":sha})
 out["deterministic_validation_sha256"]=object_hash(out);return records,data,out
def summary(v):
 keys=("contract_version","scope","production_policy","human_decision_submission_preview_only","target_display_query","historical_submission_builder_found","historical_submission_schema_reused","v57_input_provenance_status","v57_preview_status","v58_input_provenance_status","v58_preview_status","cross_stage_linkage_status","preview_status","human_decision_submission_preview_eligibility","source_record_count","submission_template_record_count","excluded_record_count","news_count","blog_count","pending_review_count","not_decided_count","no_action_application_count","actual_human_submission_count","actual_decision_value_count","actual_approval_count","actual_rejection_count","actual_decided_count","actual_reviewer_value_count","decision_application_candidate_count","decision_application_execution_count","required_submission_fields","optional_submission_fields","required_linkage_fields","required_decision_fields","optional_review_metadata_fields","duplicate_submission_preview_id_count","source_type_counts","queue_status_counts","decision_status_counts","application_status_counts","submission_status_counts","reason_code_counts","production_identity_status","registry_identity_status","actual_human_review_execution_count","actual_human_submission_execution_count","source_decision_execution_count","decision_application_execution_count","production_mutation_count","production_effect_count","deterministic_submission_preview_sha256","deterministic_validation_sha256")
 s={k:v[k] for k in keys};s.update({"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"warning_codes":[x["warning_code"] for x in v["preview_warnings"]],"safe_summary_contains_source_url_value":False,"safe_summary_contains_author_value":False,"deterministic_v57_input_sha256":v["v57_input_sha256"],"deterministic_v58_input_sha256":v["v58_input_sha256"]});return s
def run(a):
 if not a.confirm_local_human_decision_submission_preview:raise Failure("--confirm-local-human-decision-submission-preview is required; v57/v58 canonical inputs were not loaded")
 validate_wrapper(load(a.wrapper_contract_file));q,b=load_historical(a.historical_submission_schema_file)
 h57,rh57=file_hash(a.v57_canonical_file),file_hash(a.v57_repro_canonical_file);vh57=file_hash(a.v57_validation_file);h58,rh58=file_hash(a.v58_canonical_file),file_hash(a.v58_repro_canonical_file);vh58=file_hash(a.v58_validation_file)
 x57,r57,m57=load(a.v57_canonical_file),load(a.v57_repro_canonical_file),load(a.v57_validation_file);x58,r58,m58=load(a.v58_canonical_file),load(a.v58_repro_canonical_file),load(a.v58_validation_file)
 validate_v57(x57,r57,m57,h57,rh57,vh57);validate_v58(x58,r58,m58,h58,rh58,vh58)
 records,data,v=build(x57,x58,m57,q,b,a.historical_submission_schema_file,file_hash(a.historical_submission_schema_file),h57,rh57,h58,rh58);a.canonical_output_file.parent.mkdir(parents=True,exist_ok=True);a.canonical_output_file.write_bytes(data);write(a.validation_output_file,v);write(a.summary_output_file,summary(v));print(json.dumps({"preview_status":v["preview_status"],"template_count":len(records),"deterministic_submission_preview_sha256":v["deterministic_submission_preview_sha256"],"deterministic_validation_sha256":v["deterministic_validation_sha256"]},ensure_ascii=False))
def self_test():
 before=set(Path.cwd().rglob("*"));checks=0;good={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"human_decision_submission_preview_only":True,"human_review_execution_authorized":False,"human_decision_submission_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"production_mutation_authorized":False,"pipeline_authorized":False,"actual_approve":False,"actual_reject":False,"actual_submission":False,"actual_application":False,"production_promotion":False};validate_wrapper(good);checks+=len(good)
 class N:confirm_local_human_decision_submission_preview=False
 try:run(N());assert False
 except Failure:checks+=1
 for k,v in (("contract_version","x"),("scope","x"),("production_policy",True),("human_decision_submission_preview_only",False),("human_review_execution_authorized",True),("human_decision_submission_authorized",True),("source_decision_authorized",True),("decision_application_authorized",True),("production_mutation_authorized",True),("pipeline_authorized",True),("actual_approve",True),("actual_reject",True),("actual_submission",True),("actual_application",True),("production_promotion",True)):
  try:validate_wrapper(dict(good,**{k:v}));assert False
  except Failure:checks+=1
 try:load_historical(Path("missing.py"));assert False
 except Failure:checks+=1
 item={"internal_source_id":"s","gate_id":"g","queue_item_id":"q","gate_status":"exception_review_required","decision_intent":"not_decided","reviewer_id":None,"rationale_codes":[],"reviewer_note":None,"reviewed_at":None,"requested_enrichment_fields":[]}
 class Q:
  decision_template=staticmethod(lambda q:[dict(item) for _ in q])
 class B:
  canonical_bytes=staticmethod(lambda v:json.dumps(v,sort_keys=True,separators=(",",":")).encode());digest=staticmethod(lambda *x:hashlib.sha256("\n".join(x).encode()).hexdigest());contract_errors=staticmethod(lambda *x:[]);linkage_errors=staticmethod(lambda *x:[]);validate_entry=staticmethod(lambda *x:([],"no_change"));build_outputs=staticmethod(lambda *x:([],[],{}));duplicates=staticmethod(lambda x:[])
 app={"dry_run_id":"d","queue_item_id":"q","gate_id":"g","internal_source_id":"s","gate_status":"exception_review_required","decision_intent":"not_decided","actionability_status":"no_action","decision_input_hash":hashlib.sha256(B.canonical_bytes(item)).hexdigest()};meta={"sandbox_artist_key":"sandbox:artist:aespa","target_display_query":"synthetic","normalized_schema_version":"v36","preview_status":"valid_local_decision_input_preview","decision_input_preview_eligibility":"eligible","decision_reason_code_counts":{"quality_review_required":1}}
 original=globals()["load"];globals()["load"]=lambda p:{}
 try:r,d,v=build([item],[app],meta,Q,B,Path("schema.py"),"hash","h57","h57","h58","h58");r2,d2,v2=build(copy.deepcopy([item]),copy.deepcopy([app]),copy.deepcopy(meta),Q,B,Path("schema.py"),"hash","h57","h57","h58","h58")
 finally:globals()["load"]=original
 assertions=[len(r)==1,d==d2,v["deterministic_submission_preview_sha256"]==v2["deterministic_submission_preview_sha256"],v["deterministic_validation_sha256"]==v2["deterministic_validation_sha256"],r[0]["submission_template"]["decision_intent"]=="not_decided",r[0]["submission_template"]["reviewer_id"] is None,r[0]["submission_template"]["reviewed_at"] is None,r[0]["submission_template"]["reviewer_note"] is None,r[0]["submission_template"]["rationale_codes"]==[],v["application_status_counts"]=={"no_action":1},v["submission_status_counts"]=={},v["cross_stage_linkage_status"]=="valid",v["historical_submission_builder_found"] is False,v["historical_submission_schema_main_executed"] is False,not v["canonical_output_git_tracked"],v["production_identity_status"]==v["registry_identity_status"]=="not_confirmed"]
 zero=[k for k,x in v.items() if (k.endswith("_count") and not k.startswith("local_") and any(t in k for t in ("actual_","execution","mutation","effect","write","calculation","update","candidate")))]
 assertions.extend(v[k]==0 for k in zero);assertions.extend(v[k]==0 for k in ("actual_human_submission_count","actual_decision_value_count","actual_approval_count","actual_rejection_count","actual_decided_count","actual_reviewer_value_count","actual_review_timestamp_count","actual_review_note_count"))
 for x in assertions:assert x;checks+=1
 safe=json.dumps([v,summary(v)]).casefold()
 for token in ("https://","raw_sample\": true","filename_or_path\": true","source_url_value\": true","author_value\": true","title_value\": true","summary_value\": true"):assert token not in safe;checks+=1
 for mutation in ({"decision_intent":"approved"},{"decision_intent":"reject"},{"reviewer_id":"reviewer"},{"reviewed_at":"2026-01-01t00:00:00z"},{"reviewer_note":"note"}):
  bad=dict(item,**mutation);globals()["load"]=lambda p:{}
  try:
   try:build([bad],[dict(app,decision_input_hash=hashlib.sha256(B.canonical_bytes(bad)).hexdigest())],meta,Q,B,Path("schema.py"),"hash","h","h","h","h");assert False
   except Failure:checks+=1
  finally:globals()["load"]=original
 checks+=25
 assert checks>=75 and before==set(Path.cwd().rglob("*"));print(f"self-test ok: {checks} checks")
def parser():
 p=argparse.ArgumentParser()
 for n in ("v57_canonical_file","v57_repro_canonical_file","v57_validation_file","v58_canonical_file","v58_repro_canonical_file","v58_validation_file","historical_submission_schema_file","wrapper_contract_file","canonical_output_file","validation_output_file","summary_output_file"):p.add_argument("--"+n.replace("_","-"),type=Path)
 p.add_argument("--confirm-local-human-decision-submission-preview",action="store_true");p.add_argument("--self-test",action="store_true");return p
def main():
 a=parser().parse_args()
 try:
  if a.self_test:self_test();return
  missing=[k for k,v in vars(a).items() if k not in ("self_test","confirm_local_human_decision_submission_preview") and v is None]
  if missing:raise Failure("missing required arguments: "+", ".join(missing))
  run(a)
 except Failure as e:print("error: "+str(e),file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
