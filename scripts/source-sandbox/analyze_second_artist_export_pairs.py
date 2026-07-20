"""Analyze Naver alternate exports without selecting a candidate or file."""
import argparse
import csv
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict
from itertools import combinations
import re
import os

NEWS_FIELDS=["query","title","originallink","link","description","pubDate"]
BLOG_FIELDS=["query","title","link","description","bloggername","bloggerlink","postdate"]
NEWS_ATTR={"publisher","publisher_name","press","press_name","media","media_name","office","office_name","provider","journalist","reporter","author","author_name","writer","writer_name"}
BLOG_ATTR={"bloggername","blogger_name","blogname","blog_name","author","author_name","writer","writer_name","publisher","publisher_name"}
RESOLVED={"unique_valid_export","equivalent_duplicate_exports","objectively_dominant_export"}

def norm(v): return " ".join(str(v or "").strip().split()).casefold()
def canon(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode("utf-8")
def sha_file(p):
 d=hashlib.sha256()
 with Path(p).open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):d.update(b)
 return d.hexdigest()
def fid(rel): return hashlib.sha256(rel.encode("utf-8")).hexdigest()
def cov(n,d): return round(n/d,6) if d else 0.0
def stamp(name):
 m=re.findall(r"(?<!\d)(20\d{6})[_-]?(\d{6})(?!\d)",name)
 if not m:return None
 try:return datetime.strptime("".join(m[-1]),"%Y%m%d%H%M%S")
 except ValueError:return None
def parse_date(value,kind):
 text=str(value or "").strip()
 formats=["%a, %d %b %Y %H:%M:%S %z"] if kind=="news" else ["%Y%m%d"]
 for fmt in formats:
  try:return datetime.strptime(text,fmt).date().isoformat()
  except ValueError:pass
 return None
def identity_match(row,q):
 q=norm(q)
 if len(re.sub(r"\s+","",q))<2:return False
 vals=[norm(row.get(k)) for k in ("query","title","description")]
 if q.isascii():return any(re.search(r"(?<![a-z0-9])"+re.escape(q)+r"(?![a-z0-9])",v,re.I) for v in vals)
 return any(q in v for v in vals)

def scan(path,root):
 rel=path.relative_to(root).as_posix();name=path.name.casefold()
 with path.open(encoding="utf-8-sig",newline="") as f:
  rd=csv.DictReader(f);headers=list(rd.fieldnames or []);hs=set(headers)
  if set(NEWS_FIELDS)<=hs:kind,fields,attrs="news",NEWS_FIELDS,NEWS_ATTR
  elif set(BLOG_FIELDS)<=hs:kind,fields,attrs="blog",BLOG_FIELDS,BLOG_ATTR
  elif "naver_news" in name:kind,fields,attrs="news",NEWS_FIELDS,NEWS_ATTR
  elif "naver_blog" in name:kind,fields,attrs="blog",BLOG_FIELDS,BLOG_ATTR
  else:return None
  rows=list(rd)
 malformed=sum(None in r for r in rows);complete=set(fields)<=hs;queries=sorted({norm(r.get("query")) for r in rows if norm(r.get("query"))})
 row_hashes=[]
 for r in rows:row_hashes.append(hashlib.sha256(canon([norm(r.get(k)) for k in fields])).hexdigest())
 unique=set(row_hashes);columns=sorted(hs&attrs);attr=sum(any(str(r.get(c) or "").strip() for c in columns) for r in rows)
 dates=sorted(d for d in (parse_date(r.get("pubDate" if kind=="news" else "postdate"),kind) for r in rows) if d)
 ts=stamp(path.name)
 return {"file_id":fid(rel),"source_type":kind,"file_sha256":sha_file(path),"ordered_row_fingerprint_sha256":hashlib.sha256(canon(row_hashes)).hexdigest(),"content_set_fingerprint_sha256":hashlib.sha256(canon(sorted(unique))).hexdigest(),"row_count":len(rows),"unique_row_count":len(unique),"duplicate_row_count":len(rows)-len(unique),"required_headers_complete":complete,"malformed_row_count":malformed,"identity_evidence_coverage":cov(sum(identity_match(r,queries[0] if queries else "") for r in rows),len(rows)),"attribution_coverage":cov(attr,len(rows)),"earliest_source_date":dates[0] if dates else None,"latest_source_date":dates[-1] if dates else None,"export_timestamp":ts.isoformat() if ts else None,"batch_directory_hash":hashlib.sha256(path.parent.relative_to(root).as_posix().encode()).hexdigest(),"queries":queries,"row_set":unique}

def compare(a,b):
 shared=a["row_set"]&b["row_set"];union=a["row_set"]|b["row_set"];lo=a["row_set"]-b["row_set"];ro=b["row_set"]-a["row_set"]
 fs=a["file_sha256"]==b["file_sha256"];oe=a["ordered_row_fingerprint_sha256"]==b["ordered_row_fingerprint_sha256"];ce=a["content_set_fingerprint_sha256"]==b["content_set_fingerprint_sha256"]
 if not union:relation="empty_equivalent"
 elif fs:relation="byte_identical"
 elif oe:relation="identical_ordered_content"
 elif ce:relation="equivalent_reordered_content"
 elif a["row_set"]<b["row_set"]:relation="left_strict_subset"
 elif b["row_set"]<a["row_set"]:relation="right_strict_subset"
 elif shared:relation="partial_overlap"
 else:relation="disjoint"
 return {"left_file_id":a["file_id"],"right_file_id":b["file_id"],"file_sha_equal":fs,"ordered_content_equal":oe,"content_set_equal":ce,"shared_unique_row_count":len(shared),"union_unique_row_count":len(union),"left_only_unique_row_count":len(lo),"right_only_unique_row_count":len(ro),"overlap_ratio":round(len(shared)/len(union),6) if union else 0,"containment_left_in_right":a["row_set"]<=b["row_set"],"containment_right_in_left":b["row_set"]<=a["row_set"],"relation":relation}

def resolve(items,kind):
 present=list(items);valid=[x for x in present if x["required_headers_complete"] and x["malformed_row_count"]==0]
 if not present:return "missing_export",[],None
 if not valid:return "invalid_export",[],None
 if len(valid)==1:return "unique_valid_export",[valid[0]["file_id"]],valid[0]["file_id"]
 if len({x["content_set_fingerprint_sha256"] for x in valid})==1:
  ids=sorted(x["file_id"] for x in valid);return "equivalent_duplicate_exports",ids,ids[0]
 dominant=[]
 for x in valid:
  others=[y for y in valid if y is not x]
  contains=all(y["row_set"]<=x["row_set"] for y in others) and any(y["row_set"]<x["row_set"] for y in others)
  quality=all(x["identity_evidence_coverage"]>=y["identity_evidence_coverage"] for y in others)
  if kind=="blog":quality=quality and all(x["attribution_coverage"]>=y["attribution_coverage"] for y in others)
  query=all(x["queries"]==y["queries"] for y in others)
  if contains and quality and query:dominant.append(x)
 if len(dominant)==1:return "objectively_dominant_export",[dominant[0]["file_id"]],dominant[0]["file_id"]
 return "unresolved_differing_exports",[],None
def public_export(x,supported):
 keys=["file_id","source_type","file_sha256","ordered_row_fingerprint_sha256","content_set_fingerprint_sha256","row_count","unique_row_count","duplicate_row_count","required_headers_complete","malformed_row_count","identity_evidence_coverage","attribution_coverage","earliest_source_date","latest_source_date","export_timestamp","batch_directory_hash"]
 d={k:x[k] for k in keys};d["is_evidence_supported"]=x["file_id"] in supported;return d
def pair_status(ns,bs,excluded):
 if excluded:return "excluded_existing_sandbox_artist"
 if ns in {"missing_export","invalid_export"} or bs in {"missing_export","invalid_export"}:return "pair_analysis_blocked"
 return "pair_preference_available" if ns in RESOLVED and bs in RESOLVED else "manual_pair_selection_required"
def analyze_candidate(c,p,exports,version):
 news=sorted([x for x in exports if x["source_type"]=="news" and c["normalized_query"] in x["queries"]],key=lambda x:x["file_id"]);blog=sorted([x for x in exports if x["source_type"]=="blog" and c["normalized_query"] in x["queries"]],key=lambda x:x["file_id"])
 ns,ni,ncan=resolve(news,"news");bs,bi,bcan=resolve(blog,"blog");excluded=p["packet_status"]=="excluded";pes=pair_status(ns,bs,excluded);nc=[compare(a,b) for a,b in combinations(news,2)];bc=[compare(a,b) for a,b in combinations(blog,2)]
 reasons=sorted({ns,bs,pes});aid=hashlib.sha256("\n".join((version,c["candidate_id"],ns,bs,pes)).encode()).hexdigest()
 return {"analysis_item_id":aid,"candidate_id":c["candidate_id"],"packet_item_id":p["packet_item_id"],"display_query":c["display_query"],"candidate_status":"excluded" if excluded else "active","news_resolution_status":ns,"blog_resolution_status":bs,"pair_evidence_status":pes,"news_export_count":len(news),"blog_export_count":len(blog),"valid_news_export_count":sum(x["required_headers_complete"] and not x["malformed_row_count"] for x in news),"valid_blog_export_count":sum(x["required_headers_complete"] and not x["malformed_row_count"] for x in blog),"news_equivalent_export_count":len(ni) if ns=="equivalent_duplicate_exports" else 0,"blog_equivalent_export_count":len(bi) if bs=="equivalent_duplicate_exports" else 0,"news_differing_export_count":len(news)-len(ni),"blog_differing_export_count":len(blog)-len(bi),"evidence_supported_news_file_ids":ni,"evidence_supported_blog_file_ids":bi,"news_canonical_evidence_file_id":ncan,"blog_canonical_evidence_file_id":bcan,"news_export_summaries":[public_export(x,ni) for x in news],"blog_export_summaries":[public_export(x,bi) for x in blog],"news_pairwise_comparisons":nc,"blog_pairwise_comparisons":bc,"pair_reason_codes":reasons,"actual_selection_status":"not_selected"}
def template(a):return {"analysis_item_id":a["analysis_item_id"],"candidate_id":a["candidate_id"],"packet_item_id":a["packet_item_id"],"display_query":a["display_query"],"pair_evidence_status":a["pair_evidence_status"],"news_resolution_status":a["news_resolution_status"],"blog_resolution_status":a["blog_resolution_status"],"available_news_file_ids":[x["file_id"] for x in a["news_export_summaries"]],"available_blog_file_ids":[x["file_id"] for x in a["blog_export_summaries"]],"evidence_supported_news_file_ids":a["evidence_supported_news_file_ids"],"evidence_supported_blog_file_ids":a["evidence_supported_blog_file_ids"],"resolution_intent":"not_resolved","reviewer_id":None,"rationale_codes":[],"reviewer_note":None,"reviewed_at":None,"selected_news_file_id":None,"selected_blog_file_id":None,"export_difference_acknowledged":False,"production_data_unchanged_acknowledged":False}
def make_summary(a,t,contract):
 pair=Counter(x["pair_evidence_status"] for x in a);nr=Counter(x["news_resolution_status"] for x in a);br=Counter(x["blog_resolution_status"] for x in a);rels=Counter(y["relation"] for x in a for k in ("news_pairwise_comparisons","blog_pairwise_comparisons") for y in x[k]);reasons=Counter(y for x in a for y in x["pair_reason_codes"]);active=[x for x in a if x["candidate_status"]=="active"]
 d={"contract_version":contract["contract_version"],"scope":contract["scope"],"production_policy":False,"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"total_candidate_count":len(a),"excluded_candidate_count":len(a)-len(active),"active_candidate_count":len(active),"pair_preference_available_count":pair["pair_preference_available"],"manual_pair_selection_required_count":pair["manual_pair_selection_required"],"pair_analysis_blocked_count":pair["pair_analysis_blocked"]}
 for label,key in [("unique_valid","unique_valid_export"),("equivalent_duplicate","equivalent_duplicate_exports"),("objectively_dominant","objectively_dominant_export"),("unresolved_differing","unresolved_differing_exports"),("missing","missing_export"),("invalid","invalid_export")]:d[label+"_news_count"]=nr[key];d[label+"_blog_count"]=br[key]
 d.update({"total_news_export_count":sum(x["news_export_count"] for x in a),"total_blog_export_count":sum(x["blog_export_count"] for x in a),"total_news_pairwise_comparison_count":sum(len(x["news_pairwise_comparisons"]) for x in a),"total_blog_pairwise_comparison_count":sum(len(x["blog_pairwise_comparisons"]) for x in a),"relation_comparison_counts":dict(sorted(rels.items())),"pair_reason_code_counts":dict(sorted(reasons.items())),"resolution_template_entry_count":len(t),"not_resolved_count":sum(x["resolution_intent"]=="not_resolved" for x in t),"duplicate_analysis_item_id_count":len(a)-len({x["analysis_item_id"] for x in a}),"duplicate_candidate_id_count":len(a)-len({x["candidate_id"] for x in a}),"active_candidate_summaries":[{k:x[k] for k in ["candidate_id","display_query","pair_evidence_status","news_resolution_status","blog_resolution_status","news_export_count","blog_export_count","evidence_supported_news_file_ids","evidence_supported_blog_file_ids","pair_reason_codes"]} for x in active],"deterministic_analysis_sha256":hashlib.sha256(canon(a)).hexdigest(),"deterministic_resolution_template_sha256":hashlib.sha256(canon(t)).hexdigest()});return d

def synthetic(fid_,rows,kind="news",sha=None,ordered=None,content=None,attr=1,valid=True,ts="2026-01-01T00:00:00"):
 s=set(rows);return {"file_id":fid_,"source_type":kind,"file_sha256":sha or fid_,"ordered_row_fingerprint_sha256":ordered or hashlib.sha256(canon(rows)).hexdigest(),"content_set_fingerprint_sha256":content or hashlib.sha256(canon(sorted(s))).hexdigest(),"row_count":len(rows),"unique_row_count":len(s),"duplicate_row_count":len(rows)-len(s),"required_headers_complete":valid,"malformed_row_count":0,"identity_evidence_coverage":1,"attribution_coverage":attr,"earliest_source_date":None,"latest_source_date":None,"export_timestamp":ts,"batch_directory_hash":"b","queries":["x"],"row_set":s}
def self_test():
 a=synthetic("a",["1"]);assert resolve([a],"news")[0]=="unique_valid_export"
 assert resolve([a,synthetic("b",["1"],sha=a["file_sha256"])],"news")[0]=="equivalent_duplicate_exports"
 assert resolve([a,synthetic("b",["1"],ordered=a["ordered_row_fingerprint_sha256"])],"news")[0]=="equivalent_duplicate_exports"
 assert resolve([synthetic("a",["1","2"]),synthetic("b",["2","1"])],"news")[0]=="equivalent_duplicate_exports"
 assert resolve([a,synthetic("b",["1","2"])],"news")[0]=="objectively_dominant_export"
 assert resolve([synthetic("a",["1","2"]),synthetic("b",["1","3","4"])],"news")[0]=="unresolved_differing_exports"
 assert resolve([synthetic("a",["1"],ts="2027"),synthetic("b",["2"],ts="2026")],"news")[0]=="unresolved_differing_exports"
 assert resolve([synthetic("a",["1"],kind="blog",attr=1),synthetic("b",["1","2"],kind="blog",attr=.5)],"blog")[0]=="unresolved_differing_exports"
 assert compare(synthetic("a",["1","2"]),synthetic("b",["2","3"]))["relation"]=="partial_overlap";assert compare(a,synthetic("b",["2"]))["relation"]=="disjoint"
 assert pair_status("missing_export","unique_valid_export",False)=="pair_analysis_blocked";assert pair_status("unique_valid_export","invalid_export",False)=="pair_analysis_blocked";assert pair_status("unique_valid_export","equivalent_duplicate_exports",False)=="pair_preference_available";assert pair_status("unresolved_differing_exports","unique_valid_export",False)=="manual_pair_selection_required";assert pair_status("x","x",True)=="excluded_existing_sandbox_artist"
 fake={"analysis_item_id":"a","candidate_id":"c","packet_item_id":"p","display_query":"X","pair_evidence_status":"manual_pair_selection_required","news_resolution_status":"unresolved_differing_exports","blog_resolution_status":"unique_valid_export","news_export_summaries":[],"blog_export_summaries":[],"evidence_supported_news_file_ids":[],"evidence_supported_blog_file_ids":[]};t=template(fake);assert t["resolution_intent"]=="not_resolved" and t["selected_news_file_id"] is None and t["reviewer_id"] is None and t["rationale_codes"]==[]
 text=json.dumps(t);assert "C:/" not in text and all(('"'+k+'"') not in text for k in ["title","description","link"])
 print("self-test passed: 22 synthetic analysis cases; no files written")

def main():
 p=argparse.ArgumentParser();names=["archive-root","candidate-file","candidate-summary-file","packet-file","packet-summary-file","selection-template-file","contract-file","analysis-output-file","summary-output-file","resolution-template-file"]
 for n in names:p.add_argument("--"+n)
 p.add_argument("--self-test",action="store_true");args=p.parse_args()
 if args.self_test:self_test();return
 if not all(getattr(args,n.replace("-","_")) for n in names):p.error("all file arguments required")
 selection=json.loads(Path(args.selection_template_file).read_text(encoding="utf-8"));non=sum(x.get("selection_intent")!="not_selected" for x in selection)
 if non:print(f"protected selection input detected: non-not-selected count={non}");raise SystemExit(1)
 candidates=json.loads(Path(args.candidate_file).read_text(encoding="utf-8"));packets=json.loads(Path(args.packet_file).read_text(encoding="utf-8"));contract=json.loads(Path(args.contract_file).read_text(encoding="utf-8"));root=Path(args.archive_root).resolve();repo=Path.cwd().resolve()
 protected=list(root.rglob("*.csv"))+[Path(getattr(args,n)) for n in ["candidate_file","candidate_summary_file","packet_file","packet_summary_file","selection_template_file"]]+[x for x in (repo/"tmp/source-sandbox/naver/iu").rglob("*") if x.is_file()];before={x:sha_file(x) for x in protected}
 exports=[]
 for path in sorted(root.rglob("*.csv"),key=lambda x:x.relative_to(root).as_posix().casefold()):
  try:item=scan(path,root)
  except (UnicodeError,csv.Error):continue
  if item:exports.append(item)
 pmap={x["candidate_id"]:x for x in packets};analysis=sorted([analyze_candidate(c,pmap[c["candidate_id"]],exports,contract["contract_version"]) for c in candidates],key=lambda x:x["display_query"].casefold());resolution=[template(x) for x in analysis if x["candidate_status"]!="excluded"];summary=make_summary(analysis,resolution,contract)
 changed=[x.name for x,h in before.items() if sha_file(x)!=h]
 if changed:print("protected files changed: "+", ".join(changed));raise SystemExit(1)
 for target,value in [(args.analysis_output_file,analysis),(args.summary_output_file,summary),(args.resolution_template_file,resolution)]:q=Path(target);q.parent.mkdir(parents=True,exist_ok=True);q.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"analysis complete: active={summary['active_candidate_count']} preference={summary['pair_preference_available_count']} manual={summary['manual_pair_selection_required_count']}")
if __name__=="__main__":main()
