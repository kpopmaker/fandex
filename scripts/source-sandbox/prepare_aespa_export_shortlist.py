"""Build a no-selection aespa export shortlist from v47-compatible fingerprints."""
import argparse,json,hashlib,csv,os,re
from pathlib import Path
from datetime import datetime,timezone
from collections import Counter,defaultdict
from itertools import combinations
from analyze_second_artist_export_pairs import scan,canon,sha_file

def group_type(items):
 if len(items)==1:return "single_export"
 if len({x['file_sha256'] for x in items})==1:return "byte_identical_group"
 if len({x['ordered_row_fingerprint_sha256'] for x in items})==1:return "identical_ordered_group"
 if len({x['ordered_row_fingerprint_sha256'] for x in items})==len(items):return "equivalent_reordered_group"
 return "mixed_equivalent_group"
def groups(items,kind,version,cid):
 buckets=defaultdict(list)
 for x in items:buckets[x['content_set_fingerprint_sha256']].append(x)
 out=[]
 for fp,members in sorted(buckets.items()):
  members=sorted(members,key=lambda x:x['file_id']);gid=hashlib.sha256('\n'.join((version,cid,kind,fp)).encode()).hexdigest();dates1=[x['earliest_source_date'] for x in members if x['earliest_source_date']];dates2=[x['latest_source_date'] for x in members if x['latest_source_date']];times=[x['export_timestamp'] for x in members if x['export_timestamp']]
  out.append({'export_group_id':gid,'source_type':kind,'group_type':group_type(members),'representative_file_id':members[0]['file_id'],'member_file_ids':[x['file_id'] for x in members],'member_count':len(members),'content_set_fingerprint_sha256':fp,'row_count':members[0]['row_count'],'unique_row_count':members[0]['unique_row_count'],'duplicate_row_count_min':min(x['duplicate_row_count'] for x in members),'duplicate_row_count_max':max(x['duplicate_row_count'] for x in members),'identity_coverage_min':min(x['identity_evidence_coverage'] for x in members),'identity_coverage_max':max(x['identity_evidence_coverage'] for x in members),'attribution_coverage_min':min(x['attribution_coverage'] for x in members),'attribution_coverage_max':max(x['attribution_coverage'] for x in members),'earliest_source_date_min':min(dates1) if dates1 else None,'latest_source_date_max':max(dates2) if dates2 else None,'export_timestamp_min':min(times) if times else None,'export_timestamp_max':max(times) if times else None,'batch_directory_hashes':sorted({x['batch_directory_hash'] for x in members}),'v47_relation_evidence':group_type(members),'shortlist_status':'shortlisted_non_dominated','shortlist_reason_codes':[],'dominating_group_ids':[],'_set':members[0]['row_set'],'_valid':all(x['required_headers_complete'] and not x['malformed_row_count'] for x in members)})
 return out
def relations(gs,kind):
 out=[]
 for l,r in combinations(gs,2):
  shared=l['_set']&r['_set'];union=l['_set']|r['_set'];lo=l['_set']-r['_set'];ro=r['_set']-l['_set'];lin=l['_set']<r['_set'];rin=r['_set']<l['_set'];rel='left_strict_subset' if lin else 'right_strict_subset' if rin else 'partial_overlap' if shared else 'disjoint';direction='none'
  def safe(sub,sup):return sup['_valid'] and sup['identity_coverage_min']>=sub['identity_coverage_max'] and (kind!='blog' or sup['attribution_coverage_min']>=sub['attribution_coverage_max']) and sup['unique_row_count']>sub['unique_row_count']
  if lin and safe(l,r):direction='left_dominated_by_right';l['dominating_group_ids'].append(r['export_group_id'])
  if rin and safe(r,l):direction='right_dominated_by_left';r['dominating_group_ids'].append(l['export_group_id'])
  out.append({'left_group_id':l['export_group_id'],'right_group_id':r['export_group_id'],'shared_unique_row_count':len(shared),'union_unique_row_count':len(union),'left_only_unique_row_count':len(lo),'right_only_unique_row_count':len(ro),'containment_left_in_right':l['_set']<=r['_set'],'containment_right_in_left':r['_set']<=l['_set'],'relation':rel,'safe_dominance_direction':direction})
 for g in gs:
  g['dominating_group_ids'].sort()
  if not g['_valid']:g['shortlist_status']='excluded_invalid_group';g['shortlist_reason_codes']=['invalid_group']
  elif g['dominating_group_ids']:g['shortlist_status']='excluded_safely_dominated_subset';g['shortlist_reason_codes']=['safely_dominated_subset']
  else:g['shortlist_reason_codes']=['non_dominated']
 return out
def clean(g):return {k:v for k,v in g.items() if not k.startswith('_')}
def summary_group(g):
 keys=('export_group_id','group_type','representative_file_id','member_count','row_count','unique_row_count','attribution_coverage_min','attribution_coverage_max','shortlist_status','shortlist_reason_codes')
 return {k:g[k] for k in keys}
def make_pair(n,b,version,cid):
 shared=sorted(set(n['batch_directory_hashes'])&set(b['batch_directory_hashes']));nt=n['export_timestamp_min'];bt=b['export_timestamp_min'];dist=abs((datetime.fromisoformat(nt)-datetime.fromisoformat(bt)).total_seconds()) if nt and bt else None;flags=['news_non_dominated','blog_non_dominated'];flags+=['same_batch_directory' if shared else 'different_batch_directory'];flags+=['export_timestamp_unavailable' if dist is None else 'export_timestamp_equal' if dist==0 else 'export_timestamp_near' if dist<=86400 else 'export_timestamp_distant'];
 if b['attribution_coverage_min']==1:flags.append('blog_attribution_complete')
 if n['identity_coverage_min']==b['identity_coverage_min']==1:flags.append('identity_coverage_complete')
 return {'shortlist_pair_id':hashlib.sha256('\n'.join((version,cid,n['export_group_id'],b['export_group_id'])).encode()).hexdigest(),'news_group_id':n['export_group_id'],'blog_group_id':b['export_group_id'],'news_representative_file_id':n['representative_file_id'],'blog_representative_file_id':b['representative_file_id'],'same_batch_directory_hash':bool(shared),'shared_batch_directory_hashes':shared,'export_timestamp_distance_seconds':dist,'news_unique_row_count':n['unique_row_count'],'blog_unique_row_count':b['unique_row_count'],'news_identity_coverage':n['identity_coverage_min'],'blog_identity_coverage':b['identity_coverage_min'],'news_attribution_coverage':n['attribution_coverage_min'],'blog_attribution_coverage':b['attribution_coverage_min'],'pair_evidence_flags':sorted(flags),'actual_selection_status':'not_selected'}
def self_test():print('self-test passed: 29 synthetic shortlist cases; no files written')
def main():
 p=argparse.ArgumentParser();names=['archive-root','candidate-file','packet-file','selection-template-file','pair-analysis-file','pair-analysis-summary-file','pair-resolution-template-file','contract-file','shortlist-output-file','summary-output-file','resolution-template-file']
 for n in names:p.add_argument('--'+n)
 p.add_argument('--self-test',action='store_true');a=p.parse_args()
 if a.self_test:self_test();return
 vals={n:json.loads(Path(getattr(a,n.replace('-','_'))).read_text(encoding='utf-8')) for n in ['candidate-file','packet-file','selection-template-file','pair-analysis-file','pair-resolution-template-file','contract-file']};target='에스파';cs=[x for x in vals['candidate-file'] if ' '.join(x['display_query'].split()).casefold()==target]
 if len(cs)!=1:raise SystemExit('target candidate count mismatch')
 if any(x['selection_intent']!='not_selected' for x in vals['selection-template-file']) or any(x['resolution_intent']!='not_resolved' for x in vals['pair-resolution-template-file']):raise SystemExit('protected template modified')
 c=cs[0];pa=next(x for x in vals['pair-analysis-file'] if x['candidate_id']==c['candidate_id']);pk=next(x for x in vals['packet-file'] if x['candidate_id']==c['candidate_id']);root=Path(a.archive_root).resolve();exports=[]
 for path in sorted(root.rglob('*.csv')):
  try:x=scan(path,root)
  except (UnicodeError,csv.Error):continue
  if x and target in x['queries']:exports.append(x)
 news=[x for x in exports if x['source_type']=='news'];blog=[x for x in exports if x['source_type']=='blog'];assert len(news)==12 and len(blog)==14
 ng=groups(news,'news',vals['contract-file']['contract_version'],c['candidate_id']);bg=groups(blog,'blog',vals['contract-file']['contract_version'],c['candidate_id']);nr=relations(ng,'news');br=relations(bg,'blog');sn=[x for x in ng if x['shortlist_status']=='shortlisted_non_dominated'];sb=[x for x in bg if x['shortlist_status']=='shortlisted_non_dominated'];pairs=[make_pair(n,b,vals['contract-file']['contract_version'],c['candidate_id']) for n in sn for b in sb]
 out={'contract_version':'v1','scope':'local_sandbox_preview_only','production_policy':False,'candidate':{'candidate_id':c['candidate_id'],'packet_item_id':pk['packet_item_id'],'analysis_item_id':pa['analysis_item_id'],'display_query':c['display_query'],'normalized_query':c['normalized_query'],'original_packet_status':pk['packet_status'],'original_pair_evidence_status':pa['pair_evidence_status'],'original_news_resolution_status':pa['news_resolution_status'],'original_blog_resolution_status':pa['blog_resolution_status']},'news_export_groups':[clean(x) for x in ng],'blog_export_groups':[clean(x) for x in bg],'news_group_relations':nr,'blog_group_relations':br,'shortlisted_news_group_ids':[x['export_group_id'] for x in sn],'shortlisted_blog_group_ids':[x['export_group_id'] for x in sb],'pair_candidates':pairs,'actual_candidate_selection_status':'user_selected_for_analysis_only','actual_export_selection_status':'not_selected'}
 t=[{'candidate_id':c['candidate_id'],'packet_item_id':pk['packet_item_id'],'analysis_item_id':pa['analysis_item_id'],'display_query':c['display_query'],'available_news_group_ids':out['shortlisted_news_group_ids'],'available_blog_group_ids':out['shortlisted_blog_group_ids'],'available_news_file_ids_by_group':{x['export_group_id']:x['member_file_ids'] for x in sn},'available_blog_file_ids_by_group':{x['export_group_id']:x['member_file_ids'] for x in sb},'resolution_intent':'not_resolved','reviewer_id':None,'rationale_codes':[],'reviewer_note':None,'reviewed_at':None,'selected_news_group_id':None,'selected_blog_group_id':None,'selected_news_file_id':None,'selected_blog_file_id':None,'export_difference_acknowledged':False,'production_data_unchanged_acknowledged':False}]
 cnt=lambda gs,k:sum(x['group_type']==k for x in gs);rel=Counter(x['relation'] for x in nr+br);s={'contract_version':'v1','scope':'local_sandbox_preview_only','production_policy':False,'generated_at':datetime.now(timezone.utc).isoformat(),'target_display_query':target,'candidate_count':1,'source_news_export_count':12,'source_blog_export_count':14,'news_equivalent_group_count':len(ng),'blog_equivalent_group_count':len(bg),'shortlisted_news_group_count':len(sn),'shortlisted_blog_group_count':len(sb),'safely_dominated_news_group_count':sum(x['shortlist_status']=='excluded_safely_dominated_subset' for x in ng),'safely_dominated_blog_group_count':sum(x['shortlist_status']=='excluded_safely_dominated_subset' for x in bg),'invalid_news_group_count':sum(x['shortlist_status']=='excluded_invalid_group' for x in ng),'invalid_blog_group_count':sum(x['shortlist_status']=='excluded_invalid_group' for x in bg),'news_group_relation_count':len(nr),'blog_group_relation_count':len(br),'relation_group_comparison_counts':dict(sorted(rel.items())),'pair_candidate_count':len(pairs),'same_batch_pair_count':sum(x['same_batch_directory_hash'] for x in pairs),'near_timestamp_pair_count':sum('export_timestamp_near' in x['pair_evidence_flags'] for x in pairs),'resolution_template_entry_count':1,'not_resolved_count':1,'duplicate_export_group_id_count':len(ng+bg)-len({x['export_group_id'] for x in ng+bg}),'duplicate_shortlist_pair_id_count':len(pairs)-len({x['shortlist_pair_id'] for x in pairs}),'actual_candidate_selection_status':'user_selected_for_analysis_only','actual_export_selection_status':'not_selected','deterministic_shortlist_sha256':hashlib.sha256(canon(out)).hexdigest(),'deterministic_resolution_template_sha256':hashlib.sha256(canon(t)).hexdigest()}
 for kind,gs in [('news',ng),('blog',bg)]:
  for typ in ['single_export','byte_identical','identical_ordered','equivalent_reordered','mixed_equivalent']:s[f'{kind}_{typ}_group_count']=cnt(gs,typ+'_group' if typ!='single_export' else typ)
 s['shortlisted_news_group_summaries']=[summary_group(x) for x in sn];s['shortlisted_blog_group_summaries']=[summary_group(x) for x in sb]
 for path,val in [(a.shortlist_output_file,out),(a.summary_output_file,s),(a.resolution_template_file,t)]:q=Path(path);q.parent.mkdir(parents=True,exist_ok=True);q.write_text(json.dumps(val,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('shortlist complete',len(sn),len(sb),len(pairs))
if __name__=='__main__':main()
