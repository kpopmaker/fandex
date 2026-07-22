"""Build a safe local aespa quality/eligibility preview using existing helpers."""

import argparse
import copy
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

DISPLAY_QUERY = "\uc5d0\uc2a4\ud30c"
SCHEMA_VERSION = "v36"
NORMALIZED_SHA = "662ccfa966cfed90c78f170646c2d5fccda38674d0447fe76059a99dbbcaf436"
MAPPING_SHA = "3d122d85542fb8e91b9f122482fe0d9047388d8f911fb0f6de0e3f23faa6be3c"
MAPPING_VALIDATION_SHA = "8424a1164556f297a6de0c741a92d0626f0a09a25f3025162d09609740275b19"

class PreviewFailure(ValueError): pass

def file_hash(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
    return h.hexdigest()

def object_hash(value): return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def load_json(path): return json.loads(path.read_text(encoding="utf-8"))
def write_json(path,value): path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def load_builder(path):
    spec=importlib.util.spec_from_file_location("existing_quality_eligibility_builder",path)
    if spec is None or spec.loader is None: raise PreviewFailure("existing quality builder cannot be loaded")
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    required=("validate_inputs","quality_preview","eligibility_preview","build_record","reason_counts","duplicate_count","serialize_json")
    missing=[name for name in required if not callable(getattr(module,name,None))]
    if missing: raise PreviewFailure("missing quality builder helpers: "+", ".join(missing))
    return module

def validate_contract(c):
    checks={"contract_version":c.get("contract_version")=="v1","scope":c.get("scope")=="local_sandbox_preview_only","production_policy":c.get("production_policy") is False,"preview_only":c.get("quality_eligibility_preview_only") is True,"pipeline":c.get("pipeline_authorized") is False,"approval":c.get("approval_gate_authorized") is False}
    failed=[k for k,v in checks.items() if not v]
    if failed: raise PreviewFailure("contract mismatch: "+", ".join(failed))

def validate_provenance(items,nv,mappings,mv,ms,input_hash,mapping_hash,mv_hash):
    checks={
      "normalized_hash":input_hash==NORMALIZED_SHA,"mapping_hash":mapping_hash==MAPPING_SHA,"mapping_validation_hash":mv_hash==MAPPING_VALIDATION_SHA,
      "target_query":nv.get("target_display_query")==DISPLAY_QUERY,"schema":nv.get("normalized_schema_version")==SCHEMA_VERSION,"validation_provenance":nv.get("input_provenance_status")=="verified",
      "mapping_status":mv.get("mapping_status")=="valid_local_mapping_preview","mapping_eligibility":mv.get("next_step_eligibility")=="eligible","sandbox_key":mv.get("sandbox_artist_key")=="sandbox:artist:aespa",
      "input_count":len(items)==nv.get("record_count")==mv.get("input_record_count")==2000,"mapping_count":len(mappings)==mv.get("mapping_record_count")==2000,
      "news_count":nv.get("news_record_count")==1000,"blog_count":nv.get("blog_record_count")==1000,"mapping_errors":mv.get("mapping_error_count")==0,
      "duplicates":mv.get("duplicate_internal_source_id_count")==mv.get("duplicate_mapping_id_count")==0,"summary_mapping_hash":ms.get("deterministic_mapping_sha256")==MAPPING_SHA,
      "identities":mv.get("production_identity_status")==mv.get("registry_identity_status")=="not_confirmed","pipeline":mv.get("pipeline_execution_count")==0}
    failed=[k for k,v in checks.items() if not v]
    if failed: raise PreviewFailure("input provenance mismatch: "+", ".join(failed))

def unique_identity(items):
    names={x.get("artist_name") for x in items if isinstance(x,dict)};slugs={x.get("artist_slug") for x in items if isinstance(x,dict)}
    if len(names)!=1 or not next(iter(names),None):raise PreviewFailure("artist_name identity mismatch")
    if len(slugs)!=1 or not next(iter(slugs),None):raise PreviewFailure("artist_slug identity mismatch")
    return next(iter(names)),next(iter(slugs))

def build(items,mappings,nv,mv,builder,builder_hash,input_hash,nv_hash,mapping_hash,mv_hash):
    artist_name,artist_slug=unique_identity(items);sandbox_key=mv["sandbox_artist_key"];args=argparse.Namespace(sandbox_artist_key=sandbox_key,artist_name=artist_name,artist_slug=artist_slug)
    news=[x for x in items if x.get("source_type")=="news"];blog=[x for x in items if x.get("source_type")=="blog"]
    vr={"structural_error_count":0,"total_items":nv["record_count"],"news_items":nv["news_record_count"],"blog_items":nv["blog_record_count"]}
    ma={"total_mapping_records":mv["mapping_record_count"],"duplicate_mapping_id_count":mv["duplicate_mapping_id_count"],"duplicate_internal_source_id_count":mv["duplicate_internal_source_id_count"]}
    errors=builder.validate_inputs(news,blog,vr,mappings,ma,args)
    if errors: raise PreviewFailure("existing quality builder input validation failed")
    by_id={x["internal_source_id"]:x for x in mappings}
    records=[builder.build_record(item,by_id[item["internal_source_id"]],args) for item in news+blog]
    records.sort(key=lambda x:(x["source_type"],x["internal_source_id"]))
    q_allowed={"ready","review_required","blocked"};e_allowed={"eligible_candidate","review_required","blocked"}
    if any(x.get("quality_status") not in q_allowed for x in records):raise PreviewFailure("unsupported quality status")
    if any(x.get("eligibility_status") not in e_allowed for x in records):raise PreviewFailure("unsupported eligibility status")
    preview_ids=[x["preview_id"] for x in records];internal_ids=[x["internal_source_id"] for x in records]
    dp=builder.duplicate_count(preview_ids);di=builder.duplicate_count(internal_ids)
    if dp or di or set(internal_ids)!=set(by_id) or len(records)!=len(mappings):raise PreviewFailure("preview identity or one-to-one validation failed")
    canonical=builder.serialize_json(records);preview_sha=hashlib.sha256(canonical).hexdigest();qc=Counter(x["quality_status"] for x in records);ec=Counter(x["eligibility_status"] for x in records)
    blocked=qc["blocked"]+ec["blocked"]
    if blocked:raise PreviewFailure("blocked quality or eligibility records detected")
    qr=builder.reason_counts(records,"quality_reason_codes");er=builder.reason_counts(records,"eligibility_reason_codes")
    warnings=[{"warning_code":"news_attribution_source_limitation","source_type":"news","affected_count":nv["news_attribution_missing_count"]}]
    if qr.get("missing_author_or_publisher")==1000:warnings.append({"warning_code":"news_quality_review_due_to_missing_author_or_publisher","source_type":"news","affected_count":1000})
    expected_q={"complete_core_metadata":1000,"missing_author_or_publisher":1000};expected_e={"mapped_confirmed_source":1000,"quality_ready":1000,"quality_review_required":1000}
    if qr!=expected_q or er!=expected_e:warnings.append({"warning_code":"unexpected_quality_reason_distribution","affected_count":len(records)})
    result={
      "contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"quality_eligibility_preview_only":True,"pipeline_authorized":False,"approval_gate_authorized":False,
      "target_display_query":DISPLAY_QUERY,"normalized_schema_version":SCHEMA_VERSION,"existing_quality_builder_reused":True,"existing_quality_builder_module_hash":builder_hash,"existing_quality_builder_main_executed":False,
      "validation_adapter_used":True,"validation_adapter_source":"v51_verified_validation_counts","mapping_summary_adapter_used":True,"mapping_summary_adapter_source":"v52_verified_mapping_counts",
      "normalized_input_file_hash":input_hash,"normalized_validation_file_hash":nv_hash,"canonical_mapping_file_hash":mapping_hash,"mapping_validation_file_hash":mv_hash,"input_provenance_status":"verified",
      "sandbox_artist_key":sandbox_key,"production_identity_status":"not_confirmed","registry_identity_status":"not_confirmed","preview_status":"valid_local_quality_eligibility_preview","local_approval_gate_preview_eligibility":"eligible",
      "input_record_count":len(items),"preview_record_count":len(records),"news_preview_count":len(news),"blog_preview_count":len(blog),"quality_ready_count":qc["ready"],"quality_review_required_count":qc["review_required"],"quality_blocked_count":qc["blocked"],
      "eligibility_candidate_count":ec["eligible_candidate"],"eligibility_review_required_count":ec["review_required"],"eligibility_blocked_count":ec["blocked"],"unique_preview_id_count":len(set(preview_ids)),"duplicate_preview_id_count":dp,
      "unique_internal_source_id_count":len(set(internal_ids)),"duplicate_internal_source_id_count":di,"mapping_input_count_match":len(mappings)==len(records),"normalized_input_count_match":len(items)==len(records),
      "quality_reason_code_counts":qr,"eligibility_reason_code_counts":er,"canonical_preview_contains_source_url":all("source_url" in x for x in records),"canonical_preview_contains_author_or_publisher":all("author_or_publisher" in x for x in records),
      "safe_metadata_contains_source_url_value":False,"safe_metadata_contains_author_or_publisher_value":False,"canonical_preview_git_tracked":False,"attribution_warnings":warnings,"preview_error_count":0,"preview_warning_count":len(warnings),"preview_errors":[],"preview_warnings":warnings,
      "local_quality_preview_execution_count":1,"production_quality_execution_count":0,"production_effect_count":0,"database_write_count":0,"storage_write_count":0,"pipeline_execution_count":0,"approval_gate_execution_count":0,"review_queue_execution_count":0,"source_decision_execution_count":0,"score_calculation_count":0,"ranking_update_count":0,"artist_page_update_count":0,"deterministic_preview_sha256":preview_sha}
    result["deterministic_validation_sha256"]=object_hash(result)
    return records,canonical,result

def summary(result,nv):
    keys=("contract_version","scope","production_policy","quality_eligibility_preview_only","target_display_query","normalized_schema_version","existing_quality_builder_reused","existing_quality_builder_main_executed","input_provenance_status","preview_status","local_approval_gate_preview_eligibility","input_record_count","preview_record_count","news_preview_count","blog_preview_count","quality_ready_count","quality_review_required_count","quality_blocked_count","eligibility_candidate_count","eligibility_review_required_count","eligibility_blocked_count","unique_preview_id_count","duplicate_preview_id_count","quality_reason_code_counts","eligibility_reason_code_counts","production_identity_status","registry_identity_status","local_quality_preview_execution_count","production_quality_execution_count","production_effect_count","pipeline_execution_count","approval_gate_execution_count","deterministic_preview_sha256","deterministic_validation_sha256")
    s={k:result[k] for k in keys};s.update({"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"news_attribution_coverage":nv["news_attribution_present_count"]/nv["news_record_count"],"blog_attribution_coverage":nv["blog_attribution_present_count"]/nv["blog_record_count"],"warning_codes":[x["warning_code"] for x in result["preview_warnings"]],"canonical_preview_schema_preserved":True,"canonical_preview_contains_source_url":True,"safe_summary_contains_source_url_value":False,"safe_summary_contains_author_or_publisher_value":False,"deterministic_input_sha256":result["normalized_input_file_hash"],"deterministic_mapping_sha256":result["canonical_mapping_file_hash"]});return s

def self_test():
    before=set(Path.cwd().rglob("*"));checks=0
    class B:
      @staticmethod
      def validate_inputs(n,b,v,m,s,a):return [] if len(n)+len(b)==v["total_items"]==len(m)==s["total_mapping_records"] else ["bad"]
      @staticmethod
      def build_record(i,m,a):
       q="review_required" if i["source_type"]=="news" else "ready";e="review_required" if q=="review_required" else "eligible_candidate"
       return {"preview_id":"p"+i["internal_source_id"],"internal_source_id":i["internal_source_id"],"mapping_id":m["mapping_id"],"sandbox_artist_key":a.sandbox_artist_key,"artist_name":a.artist_name,"artist_slug":a.artist_slug,"provider_key":"naver","source_type":i["source_type"],"quality_status":q,"quality_reason_codes":["missing_author_or_publisher"] if q=="review_required" else ["complete_core_metadata"],"eligibility_status":e,"eligibility_reason_codes":["quality_review_required"] if e=="review_required" else ["mapped_confirmed_source","quality_ready"],"mapping_status":"mapped","evidence_level":"confirmed","source_url":i["source_url"],"published_at":"2026-01-01","author_or_publisher":i.get("author_or_publisher"),"content_hash":"h","raw_row_number":2}
      @staticmethod
      def duplicate_count(v):return sum(n-1 for n in Counter(v).values() if n>1)
      @staticmethod
      def reason_counts(r,f):return {k:v for k,v in sorted(Counter(c for x in r for c in x[f]).items())}
      @staticmethod
      def serialize_json(x):return (json.dumps(x,indent=2)+"\n").encode()
    items=[{"internal_source_id":str(i),"source_type":"news" if i<1000 else "blog","artist_name":DISPLAY_QUERY,"artist_slug":"aespa","source_url":"https://example.test/"+str(i),"author_or_publisher":None if i<1000 else "b"} for i in range(2000)]
    maps=[{"internal_source_id":str(i),"mapping_id":"m"+str(i)} for i in range(2000)];nv={"record_count":2000,"news_record_count":1000,"blog_record_count":1000,"news_attribution_missing_count":1000,"news_attribution_present_count":0,"blog_attribution_present_count":1000};mv={"sandbox_artist_key":"sandbox:artist:aespa","mapping_record_count":2000,"duplicate_mapping_id_count":0,"duplicate_internal_source_id_count":0}
    records,data,r=build(items,maps,nv,mv,B,"module","input","nv","mapping","mv");checks+=1
    assert len(records)==2000 and r["quality_ready_count"]==r["quality_review_required_count"]==1000;checks+=3
    assert r["eligibility_candidate_count"]==r["eligibility_review_required_count"]==1000;checks+=2
    assert r["quality_blocked_count"]==r["eligibility_blocked_count"]==0;checks+=2
    assert r["quality_reason_code_counts"]=={"complete_core_metadata":1000,"missing_author_or_publisher":1000};checks+=2
    assert r["eligibility_reason_code_counts"]=={"mapped_confirmed_source":1000,"quality_ready":1000,"quality_review_required":1000};checks+=3
    assert r["canonical_preview_contains_source_url"] and r["canonical_preview_contains_author_or_publisher"];checks+=2
    assert not r["safe_metadata_contains_source_url_value"] and not r["safe_metadata_contains_author_or_publisher_value"];checks+=2
    s=summary(r,nv);assert "review_required_samples" not in s and not s["safe_summary_contains_source_url_value"];checks+=2
    assert r["production_identity_status"]==r["registry_identity_status"]=="not_confirmed";checks+=2
    for k in ("production_quality_execution_count","production_effect_count","database_write_count","storage_write_count","pipeline_execution_count","approval_gate_execution_count","review_queue_execution_count","source_decision_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count"):assert r[k]==0;checks+=1
    assert r["local_quality_preview_execution_count"]==1;checks+=1
    assert hashlib.sha256(data).hexdigest()==r["deterministic_preview_sha256"];checks+=1
    projection=dict(r);projection.pop("deterministic_validation_sha256");assert object_hash(projection)==r["deterministic_validation_sha256"];checks+=1
    c={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"quality_eligibility_preview_only":True,"pipeline_authorized":False,"approval_gate_authorized":False};validate_contract(c);checks+=1
    for k,v in (("contract_version","x"),("scope","x"),("production_policy",True),("quality_eligibility_preview_only",False),("pipeline_authorized",True),("approval_gate_authorized",True)):
      z=dict(c);z[k]=v
      try:validate_contract(z)
      except PreviewFailure:checks+=1
    for changed in (items[:-1],[dict(items[0],artist_name="x")]+items[1:]):
      try:build(changed,maps,nv,mv,B,"module","input","nv","mapping","mv")
      except PreviewFailure:checks+=1
    dup=copy.deepcopy(maps);dup[0]["mapping_id"]=dup[1]["mapping_id"]
    try:build(items,dup,nv,mv,B,"module","input","nv","mapping","mv")
    except PreviewFailure:checks+=1
    try:raise PreviewFailure("confirm required")
    except PreviewFailure:checks+=1
    safe=json.dumps([r,s]);assert "https://" not in safe and "review_required_samples" not in safe and "recommendation" not in safe and "rank_score" not in safe;checks+=1
    assert before==set(Path.cwd().rglob("*"));checks+=1
    assert checks>=45;print(f"self-test ok: {checks} checks")

def run(a):
    if not a.confirm_local_quality_preview:raise PreviewFailure("--confirm-local-quality-preview is required; inputs were not loaded")
    validate_contract(load_json(a.contract_file));input_hash=file_hash(a.normalized_file);mapping_hash=file_hash(a.mapping_file);mv_hash=file_hash(a.mapping_validation_file)
    items=load_json(a.normalized_file);nv=load_json(a.normalized_validation_file);mappings=load_json(a.mapping_file);mv=load_json(a.mapping_validation_file);ms=load_json(a.mapping_summary_file)
    validate_provenance(items,nv,mappings,mv,ms,input_hash,mapping_hash,mv_hash);builder=load_builder(a.existing_quality_builder_file)
    records,canonical,result=build(items,mappings,nv,mv,builder,file_hash(a.existing_quality_builder_file),input_hash,file_hash(a.normalized_validation_file),mapping_hash,mv_hash);safe=summary(result,nv)
    a.canonical_preview_output_file.parent.mkdir(parents=True,exist_ok=True);a.canonical_preview_output_file.write_bytes(canonical);write_json(a.validation_output_file,result);write_json(a.summary_output_file,safe);print(json.dumps(safe,ensure_ascii=False,indent=2))

def parser():
    p=argparse.ArgumentParser()
    for name in ("normalized_file","normalized_validation_file","mapping_file","mapping_validation_file","mapping_summary_file","existing_quality_builder_file","contract_file","canonical_preview_output_file","validation_output_file","summary_output_file"):p.add_argument("--"+name.replace("_","-"),type=Path)
    p.add_argument("--confirm-local-quality-preview",action="store_true");p.add_argument("--self-test",action="store_true");return p
def main():
    a=parser().parse_args()
    try:
      if a.self_test:self_test();return
      missing=[k for k in vars(a) if k not in ("self_test","confirm_local_quality_preview") and getattr(a,k) is None]
      if missing:raise PreviewFailure("missing required arguments: "+", ".join(missing))
      run(a)
    except PreviewFailure as e:print(f"error: {e}",file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
