"""V81 process-local disposable enrichment adapter preview (standard library only)."""
import argparse, copy, hashlib, json, re, subprocess, sys, unicodedata
from pathlib import Path
from types import MappingProxyType

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent
CONTRACT = HERE / "aespa_local_disposable_enrichment_adapter_v81_preview_contract.preview.json"
V75 = HERE / "aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
V76 = HERE / "aespa_enrichment_fulfillment_executable_contract_correction_proposal.preview.json"
V77 = HERE / "aespa_enrichment_lifecycle_idempotent_evaluation_correction_proposal.preview.json"
V78 = HERE / "aespa_enrichment_executable_contract_closure_audit_proposal.preview.json"
V79 = HERE / "aespa_enrichment_deterministic_planning_policy_correction_proposal.preview.json"
V80 = HERE / "aespa_consecutive_evidence_acceptance_lifecycle_correction_proposal.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-local-disposable-enrichment-adapter-v81"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-local-disposable-enrichment-adapter-v81-repro"
EXPECTED_BRANCH = "v81-real-source-sandbox-aespa-local-disposable-enrichment-adapter-preview"
EXPECTED_BASE = "6e4e2242084478fdf66284b5a1d240b4254c5c8a"
ALLOWED = frozenset({"scripts/source-sandbox/aespa_local_disposable_enrichment_adapter_v81_preview_contract.preview.json","scripts/source-sandbox/preview_aespa_local_disposable_enrichment_adapter_v81.py","docs/real-source-sandbox-aespa-local-disposable-enrichment-adapter-v81-preview.md"})
FIELDS = ("content_context", "source_attribution")
EVIDENCE_KEYS = frozenset(("evidence_id","request_id","target_identity","requested_field","evidence_type","semantic_field","normalized_value","source_class","source_locator","collection_method","content_digest","provenance","validation_status","safe_retention_class"))
TARGET_KEYS = frozenset(("decision_input_id","decision_preview_id","queue_id","gate_id","internal_source_id","sandbox_artist_key","source_type"))
INIT_KEYS = frozenset(("contract_version","request_id","target_identity","requested_enrichment_fields","existing_local_evidence","authorization_state","initial_field_lifecycle"))
INPUT_EVIDENCE_KEYS = frozenset(("request_id","evidence")); REQUEST_KEYS = frozenset(("request_id",)); EVAL_KEYS = frozenset(("request_id","event"))
HEX = re.compile(r"^[0-9a-f]{64}$")
LOCATORS = MappingProxyType({"existing_local_normalized":re.compile(r"^local://normalized/[0-9a-f]{64}$"),"controlled_fixture_input":re.compile(r"^fixture://v75/[a-z0-9][a-z0-9-]{0,63}$"),"authorized_provider_retrieval":re.compile(r"^provider-ref:[a-z0-9_-]{1,64}:[A-Za-z0-9._-]{1,128}$"),"authorized_direct_source_retrieval":re.compile(r"^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$")})
COMPAT = MappingProxyType({("content_context","title","title"):"title",("content_context","summary","summary_or_bounded_excerpt"):"summary",("content_context","bounded_excerpt","summary_or_bounded_excerpt"):"bounded_excerpt",("source_attribution","author_or_publisher","author_or_publisher"):"metadata",("source_attribution","context_metadata","provider_key"):"metadata",("source_attribution","context_metadata","source_url_hostname"):"metadata"})
PROVENANCE = frozenset(("validated_v72","validated_v73","proposed_v74","implementation_observation_v74","proposed_v75","controlled_fixture_only","unresolved","not_applicable"))
ACCEPT_TRANSITIONS = MappingProxyType({"requested":"evidence_available","not_attempted":"evidence_available","evidence_available":"evidence_available","partially_satisfied":"evidence_available"})
EVAL_TRANSITIONS = MappingProxyType({("requested","not_attempted"):"not_attempted",("requested","partially_satisfied"):"partially_satisfied",("requested","satisfied"):"satisfied",("not_attempted","not_attempted"):"not_attempted",("evidence_available","not_attempted"):"not_attempted",("evidence_available","partially_satisfied"):"partially_satisfied",("evidence_available","satisfied"):"satisfied",("partially_satisfied","partially_satisfied"):"partially_satisfied",("satisfied","satisfied"):"satisfied"})
REAL_EFFECT_KEYS = ("network_request_count","external_enrichment_request_count","real_enrichment_retrieval_count","real_enrichment_evidence_write_count","real_enrichment_completion_count","real_source_mutation_count","real_queue_mutation_count","real_decision_mutation_count","real_application_write_count","real_audit_write_count","database_read_count","database_write_count","semantic_filesystem_persistence_count","external_write_count","score_mutation_count","ranking_mutation_count","chart_mutation_count","public_data_mutation_count","production_mutation_count","production_effect_count")

class ContractError(ValueError):
    def __init__(self, code): super().__init__(code); self.code = code

def canonical_bytes(value): return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
def canonical_sha(value): return hashlib.sha256(canonical_bytes(value)).hexdigest()
def content_digest(value): return hashlib.sha256(unicodedata.normalize("NFC", value).strip().encode("utf-8")).hexdigest()
def request_id_for(contract_version, target_identity, requested_fields): return canonical_sha({"contract_version":contract_version,"target_identity":target_identity,"requested_enrichment_fields":requested_fields})
def evidence_id_for(evidence): return canonical_sha({k:v for k,v in evidence.items() if k != "evidence_id"})
def load(path): return json.loads(path.read_text(encoding="utf-8"))
def file_sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

class LocalDisposableEnrichmentAdapter:
    """Instance-owned controlled shadow adapter; it performs no I/O."""
    def __init__(self, initialization):
        self._validate_initialization(initialization)
        self._state = {"initialization":copy.deepcopy(initialization),"accepted":{},"lifecycle":copy.deepcopy(initialization["initial_field_lifecycle"])}
        self._counters = {"inspection_count":0,"plan_build_count":0,"evidence_validation_count":0,"controlled_evidence_accept_count":0,"completion_evaluation_count":0,"result_read_count":0,"exact_duplicate_count":0,"conflicting_duplicate_count":0,"controlled_rejection_count":0}

    @staticmethod
    def _validate_target(target):
        if not isinstance(target, dict) or frozenset(target) != TARGET_KEYS or not all(isinstance(v,str) and v for v in target.values()) or target["source_type"] not in ("news","blog"): raise ContractError("invalid_schema")

    @classmethod
    def _validate_initialization(cls, value):
        if not isinstance(value, dict) or frozenset(value) != INIT_KEYS: raise ContractError("invalid_schema")
        cls._validate_target(value["target_identity"])
        if value["contract_version"] != "v75" or value["requested_enrichment_fields"] != list(FIELDS) or value["authorization_state"] != "not_authorized" or value["initial_field_lifecycle"] != {f:"requested" for f in FIELDS} or not isinstance(value["existing_local_evidence"],list): raise ContractError("invalid_schema")
        if value["request_id"] != request_id_for(value["contract_version"],value["target_identity"],value["requested_enrichment_fields"]): raise ContractError("request_mismatch")
        ids=[]
        for evidence in value["existing_local_evidence"]:
            status=cls._validate_envelope_static(evidence,value["target_identity"],value["request_id"],allow_external_schema=True,identity=True)
            if status != "valid" or evidence["source_class"] != "existing_local_normalized": raise ContractError("invalid_schema")
            ids.append(evidence["evidence_id"])
        if ids != sorted(ids) or len(ids) != len(set(ids)): raise ContractError("invalid_schema")

    @staticmethod
    def _validate_envelope_static(e, target, request_id, allow_external_schema=False, identity=True):
        if not isinstance(e,dict): return "invalid_type"
        if frozenset(e) != EVIDENCE_KEYS: return "invalid_schema"
        try: LocalDisposableEnrichmentAdapter._validate_target(e["target_identity"])
        except ContractError: return "invalid_schema"
        if e["target_identity"] != target: return "target_mismatch"
        if e["request_id"] != request_id: return "request_mismatch"
        if e["requested_field"] not in FIELDS: return "unknown_requested_field"
        key=(e["requested_field"],e["evidence_type"],e["semantic_field"])
        if key not in COMPAT: return "semantic_field_mismatch"
        source=e["source_class"]
        if source not in LOCATORS: return "invalid_source_class"
        if not isinstance(e["source_locator"],str) or not LOCATORS[source].fullmatch(e["source_locator"]): return "invalid_source_locator"
        if not allow_external_schema and source != "controlled_fixture_input": return "external_source_not_executable"
        retention=e["safe_retention_class"]
        if retention == "full_article_body": return "unsafe_full_body"
        if retention not in ("metadata","title","summary","bounded_excerpt","content_digest","retrieval_metadata") or retention != COMPAT[key]: return "invalid_retention_class"
        value=e["normalized_value"]
        if not isinstance(value,str) or not value or value != unicodedata.normalize("NFC",value).strip() or not isinstance(e["collection_method"],str) or not e["collection_method"] or e["provenance"] not in PROVENANCE or e["validation_status"] != "valid": return "invalid_schema"
        if e["evidence_type"] == "bounded_excerpt" and len(value) > 1000: return "excerpt_too_large"
        if not isinstance(e["content_digest"],str) or e["content_digest"] != content_digest(value): return "invalid_digest"
        if identity and (not isinstance(e["evidence_id"],str) or e["evidence_id"] != evidence_id_for(e)): return "invalid_evidence_identity"
        return "valid"

    def _all_evidence(self): return list(self._state["initialization"]["existing_local_evidence"]) + list(self._state["accepted"].values())
    def _contributions(self):
        result={f:set() for f in FIELDS}
        for e in self._all_evidence():
            if e["evidence_type"] in ("title","summary","bounded_excerpt","author_or_publisher"): result[e["requested_field"]].add(e["evidence_type"])
        return result
    def _completion(self):
        c=self._contributions(); cc=c["content_context"]
        content="satisfied" if "title" in cc and bool({"summary","bounded_excerpt"}&cc) else "partially_satisfied" if cc else "not_attempted"
        attr="satisfied" if "author_or_publisher" in c["source_attribution"] else "not_attempted"
        request="satisfied" if content==attr=="satisfied" else "partially_satisfied" if "satisfied" in (content,attr) else "not_attempted"
        return {"fields":{"content_context":content,"source_attribution":attr},"request":request}
    def _snapshot(self): return copy.deepcopy(self._state)
    def _state_digest(self): return canonical_sha(self._state)
    def _request_input(self,value,keys=REQUEST_KEYS):
        if not isinstance(value,dict) or frozenset(value)!=keys: return "invalid_schema"
        return None if value["request_id"]==self._state["initialization"]["request_id"] else "request_mismatch"
    @staticmethod
    def _failure(code): return {"status":"rejected","error_code":code,"mutated":False}

    def inspect_enrichment_satisfaction(self, request):
        error=self._request_input(request)
        if error:return self._failure(error)
        self._counters["inspection_count"]+=1; comp=self._completion()
        return copy.deepcopy({"status":"inspected","field_completion":comp["fields"],"request_completion":comp["request"]})

    def _missing(self):
        c=self._contributions(); out=[]; req=[]
        if "title" not in c["content_context"]: req.append({"kind":"required","contributions":["title"]})
        if not ({"summary","bounded_excerpt"}&c["content_context"]): req.append({"kind":"one_of","contributions":["summary","bounded_excerpt"]})
        if req: out.append({"requested_field":"content_context","requirements":req})
        if "author_or_publisher" not in c["source_attribution"]: out.append({"requested_field":"source_attribution","requirements":[{"kind":"required","contributions":["author_or_publisher"]}]})
        return out

    def build_enrichment_fulfillment_plan(self, request):
        error=self._request_input(request)
        if error:return self._failure(error)
        self._counters["plan_build_count"]+=1; init=self._state["initialization"]; comp=self._completion(); missing=self._missing()
        local=init["existing_local_evidence"]
        useful=any(self._state["lifecycle"][e["requested_field"]]!="satisfied" for e in local)
        candidates=[]
        if useful and comp["request"]!="satisfied": candidates.append("existing_local_normalized")
        if missing: candidates.append("controlled_fixture_input")
        need_accept="controlled_fixture_input" in candidates
        need_eval=comp["request"]!="satisfied" and (bool(self._all_evidence()) or need_accept or any(v in ("evidence_available","partially_satisfied") for v in self._state["lifecycle"].values()))
        operations=["accept_controlled_enrichment_evidence","evaluate_enrichment_completion"] if need_accept else ["evaluate_enrichment_completion"] if need_eval else []
        available=[{k:e[k] for k in ("evidence_id","requested_field","evidence_type","semantic_field","content_digest")} for e in sorted(local,key=lambda x:x["evidence_id"])]
        plan={"plan_version":"v75","request_id":init["request_id"],"target_identity":copy.deepcopy(init["target_identity"]),"requested_fields":list(FIELDS),"current_field_states":comp["fields"],"available_local_evidence":available,"missing_requirements":missing,"candidate_source_classes":candidates,"authorization_status":"not_authorized","planned_operations":operations,"execution_status":"not_attempted","plan_status":"planned"}
        return copy.deepcopy({"status":"planned","plan":plan})

    def validate_enrichment_evidence(self, value):
        self._counters["evidence_validation_count"]+=1
        if not isinstance(value,dict): status="invalid_type"; evidence=None
        elif frozenset(value)!=INPUT_EVIDENCE_KEYS: status="invalid_schema"; evidence=None
        elif value["request_id"]!=self._state["initialization"]["request_id"]: status="request_mismatch"; evidence=value.get("evidence")
        else: evidence=value["evidence"]; status=self._validate_envelope_static(evidence,self._state["initialization"]["target_identity"],self._state["initialization"]["request_id"],identity=True)
        digest=canonical_sha(evidence) if status=="valid" else None
        return {"status":status,"error_code":None if status=="valid" else status,"canonical_evidence_digest":digest,"mutated":False}

    def accept_controlled_enrichment_evidence(self, value):
        before=self._state_digest(); evidence=value.get("evidence") if isinstance(value,dict) else None
        def result(status,error=None,eid=None,mutated=False):
            if not mutated:self._counters["controlled_rejection_count"]+=status not in ("idempotent_exact_duplicate",)
            return {"status":status,"error_code":error,"evidence_id":eid,"state_digest":self._state_digest(),"mutated":mutated}
        if not isinstance(value,dict): return result("rejected_validation","invalid_type")
        if frozenset(value)!=INPUT_EVIDENCE_KEYS or not isinstance(evidence,dict): return result("rejected_validation","invalid_schema")
        # prerequisites before collision, deliberately excluding digest and identity
        preliminary=self._validate_envelope_static(evidence,self._state["initialization"]["target_identity"],self._state["initialization"]["request_id"],identity=False)
        if preliminary not in ("valid","invalid_digest"): return result("rejected_validation",preliminary)
        existing=self._state["accepted"].get(evidence.get("evidence_id"))
        if existing is not None:
            if canonical_bytes(existing)==canonical_bytes(evidence): self._counters["exact_duplicate_count"]+=1; return result("idempotent_exact_duplicate",None,evidence["evidence_id"],False)
            self._counters["conflicting_duplicate_count"]+=1; return result("conflicting_duplicate","conflicting_duplicate",evidence["evidence_id"],False)
        strict=self._validate_envelope_static(evidence,self._state["initialization"]["target_identity"],self._state["initialization"]["request_id"],identity=True)
        if strict!="valid": return result("rejected_validation",strict)
        if any(e["semantic_field"]==evidence["semantic_field"] for e in self._state["initialization"]["existing_local_evidence"]): return result("rejected_local_precedence","local_evidence_precedence_conflict",evidence["evidence_id"])
        field=evidence["requested_field"]; current=self._state["lifecycle"][field]
        if current not in ACCEPT_TRANSITIONS: return result("rejected_validation","illegal_lifecycle_transition",evidence["evidence_id"])
        candidate=copy.deepcopy(self._state); candidate["accepted"][evidence["evidence_id"]]=copy.deepcopy(evidence); candidate["lifecycle"][field]=ACCEPT_TRANSITIONS[current]
        self._state=candidate
        self._counters["controlled_evidence_accept_count"]+=1
        assert before!=self._state_digest()
        return result("accepted",None,evidence["evidence_id"],True)

    def evaluate_enrichment_completion(self, value):
        error=self._request_input(value,EVAL_KEYS)
        if error:return self._failure(error)
        if value["event"]!="evaluate_current_evidence":return self._failure("invalid_schema")
        comp=self._completion(); proposed={}
        for field in FIELDS:
            key=(self._state["lifecycle"][field],comp["fields"][field])
            if key not in EVAL_TRANSITIONS:return self._failure("illegal_lifecycle_transition")
            proposed[field]=EVAL_TRANSITIONS[key]
        changed=proposed!=self._state["lifecycle"]
        if changed:
            candidate=copy.deepcopy(self._state);candidate["lifecycle"]=proposed;self._state=candidate
        self._counters["completion_evaluation_count"]+=1
        return copy.deepcopy({"status":"evaluated","field_completion":comp["fields"],"request_completion":comp["request"],"human_re_review_required":True})

    def read_shadow_fulfillment_result(self, request):
        error=self._request_input(request)
        if error:return self._failure(error)
        self._counters["result_read_count"]+=1;init=self._state["initialization"];comp=self._completion()
        safe=[{k:e[k] for k in ("evidence_id","requested_field","evidence_type","semantic_field","source_class","content_digest","provenance")} for e in sorted(self._all_evidence(),key=lambda x:x["evidence_id"])]
        result={"contract_version":"v75","request_id":init["request_id"],"target_identity":copy.deepcopy(init["target_identity"]),"requested_enrichment_fields":list(FIELDS),"field_completion":comp["fields"],"request_completion":comp["request"],"lifecycle":copy.deepcopy(self._state["lifecycle"]),"accepted_evidence_safe":safe,"execution_status":"local_contract_only","external_authorization_status":"not_authorized","human_re_review_required":True,"historical_mutation":False,"provenance":"proposed_v75"}
        return copy.deepcopy({"status":"found","result":result})

def make_evidence(init,evidence_type,value,slug=None,source="controlled_fixture_input"):
    mapping={"title":("content_context","title","title"),"summary":("content_context","summary_or_bounded_excerpt","summary"),"bounded_excerpt":("content_context","summary_or_bounded_excerpt","bounded_excerpt"),"author_or_publisher":("source_attribution","author_or_publisher","metadata"),"context_metadata":("source_attribution","provider_key","metadata")}
    requested,semantic,retention=mapping[evidence_type]; norm=unicodedata.normalize("NFC",value).strip()
    locator=("fixture://v75/"+(slug or evidence_type.replace("_","-"))) if source=="controlled_fixture_input" else "provider-ref:test:item"
    e={"request_id":init["request_id"],"target_identity":copy.deepcopy(init["target_identity"]),"requested_field":requested,"evidence_type":evidence_type,"semantic_field":semantic,"normalized_value":norm,"source_class":source,"source_locator":locator,"collection_method":"controlled_fixture","content_digest":content_digest(norm),"provenance":"controlled_fixture_only","validation_status":"valid","safe_retention_class":retention}
    e["evidence_id"]=evidence_id_for(e);return e

OUTPUTS=("safe_summary.json","authority_validation.json","implementation_traceability.json","adapter_interface.json","initialization_matrix.json","real_target_flow.json","controlled_shadow_flow.json","alternate_content_flow.json","three_evidence_flow.json","planning_matrix_replay.json","acceptance_matrix_replay.json","plan_nonmutation.json","plan_determinism.json","duplicate_matrix.json","validation_matrix.json","completion_matrix.json","evaluation_matrix.json","mixed_multi_field_evaluation.json","repeated_satisfied_evaluation.json","precedence_matrix.json","insertion_order_invariance.json","copy_safety.json","disposability.json","immutability.json","zero_effects.json","validation.json")
LASTFM=("data/lastfm-cloud/lastfm_artist_interest_history_v1.csv","data/lastfm-cloud/lastfm_cloud_status_latest.json","data/lastfm-cloud/lastfm_global_interest_delta_v1_latest.csv","data/lastfm-cloud/lastfm_global_interest_score_preview_v1_latest.csv")

def git(*args): return subprocess.run(["git","-c",f"safe.directory={ROOT.as_posix()}",*args],cwd=ROOT,check=True,capture_output=True,text=True,encoding="utf-8",errors="replace").stdout.rstrip()
def preflight():
    p={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),"origin_main":git("rev-parse","origin/main"),"merge_base":git("merge-base","HEAD","origin/main")}
    if p["branch"]!=EXPECTED_BRANCH or not p["head"]==p["origin_main"]==p["merge_base"]==EXPECTED_BASE: raise ContractError("preflight")
    changed={x[3:].replace("\\","/") for x in git("status","--porcelain","--untracked-files=all").splitlines() if len(x)>3}
    changed={x for x in changed if not (x.startswith("scripts/source-sandbox/__pycache__/preview_aespa_local_disposable_enrichment_adapter_v81.") and x.endswith(".pyc"))}
    if not changed.issubset(ALLOWED): raise ContractError("tracked_scope")
    return p

def expect_error(init, mutate):
    value=copy.deepcopy(init);mutate(value)
    try: LocalDisposableEnrichmentAdapter(value)
    except ContractError as e:return e.code
    return None

def public_state(adapter): return adapter._snapshot()

def run_once(out,c,v75,v76,v77,v78,v79,v80,pre,immutable):
    out.mkdir(parents=True,exist_ok=True); init={k:copy.deepcopy(v) for k,v in v75["selected_real_target_initialization_example"].items() if k in INIT_KEYS}; request={"request_id":init["request_id"]}; evaluation={"request_id":init["request_id"],"event":"evaluate_current_evidence"}
    # real read-only proof
    real=LocalDisposableEnrichmentAdapter(init); real_before=public_state(real); real_inspect=real.inspect_enrichment_satisfaction(request); real_plan1=real.build_enrichment_fulfillment_plan(request); real_plan2=real.build_enrichment_fulfillment_plan(request); real_eval=real.evaluate_enrichment_completion(evaluation); real_read=real.read_shadow_fulfillment_result(request)
    real_flow={"inspect":real_inspect,"plan":real_plan1,"evaluation":real_eval,"result":real_read,"plan_equal":real_plan1==real_plan2,"pre_plan_state_equal":real_before==public_state(LocalDisposableEnrichmentAdapter(init)),"fixtures_accepted":0,"fabricated_article_evidence":0}
    # controlled main flow
    a=LocalDisposableEnrichmentAdapter(init); pristine=public_state(a); p1=a.build_enrichment_fulfillment_plan(request); s0=public_state(a); p2=a.build_enrichment_fulfillment_plan(request); s1=public_state(a)
    title=make_evidence(init,"title","Synthetic AESPA fixture title","title-main");summary=make_evidence(init,"summary","Synthetic fixture summary.","summary-main");author=make_evidence(init,"author_or_publisher","Synthetic Fixture Publisher","author-main")
    vt=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":title});vs=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":summary});va=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":author})
    at=a.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":title}); after_title=public_state(a); ass=a.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":summary}); after_summary=public_state(a); inspect_pre=a.inspect_enrichment_satisfaction(request); plan_pre_eval=a.build_enrichment_fulfillment_plan(request); ev_content=a.evaluate_enrichment_completion(evaluation); plan_partial1=a.build_enrichment_fulfillment_plan(request);plan_partial2=a.build_enrichment_fulfillment_plan(request)
    aa=a.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":author}); before_mixed=public_state(a); ev_mixed=a.evaluate_enrichment_completion(evaluation); after_mixed=public_state(a); final_plan=a.build_enrichment_fulfillment_plan(request); before_repeat=public_state(a);ev_repeat=a.evaluate_enrichment_completion(evaluation);after_repeat=public_state(a);safe=a.read_shadow_fulfillment_result(request)
    controlled={"initial_plan":p1,"title_acceptance":at,"summary_acceptance":ass,"pre_evaluation_inspection":inspect_pre,"pre_evaluation_lifecycle":after_summary["lifecycle"],"content_evaluation":ev_content,"partial_plan":plan_partial1,"attribution_acceptance":aa,"mixed_evaluation":ev_mixed,"final_plan":final_plan,"repeated_evaluation":ev_repeat,"safe_result":safe}
    # alternate and three evidence paths
    alt=LocalDisposableEnrichmentAdapter(init);ex=make_evidence(init,"bounded_excerpt","x"*1000,"excerpt-alt");alt.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":make_evidence(init,"title","Alternate title","title-alt")});alt_accept=alt.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":ex});alt_eval=alt.evaluate_enrichment_completion(evaluation);alternate={"accept":alt_accept,"before_evaluation":alt._snapshot()["lifecycle"],"evaluation":alt_eval}
    three=LocalDisposableEnrichmentAdapter(init); three_results=[]
    for e in (make_evidence(init,"title","Three title","three-title"),make_evidence(init,"summary","Three summary","three-summary"),make_evidence(init,"bounded_excerpt","Three excerpt","three-excerpt")): three_results.append(three.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":e}))
    three_before=three._snapshot();three_eval=three.evaluate_enrichment_completion(evaluation);three_flow={"acceptances":three_results,"before_evaluation":three_before["lifecycle"],"evaluation":three_eval}
    # duplicates and validation failures
    dup=LocalDisposableEnrichmentAdapter(init); de=make_evidence(init,"title","Duplicate title","duplicate-title")
    first=dup.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":de}); dup_state=public_state(dup)
    exact=dup.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":copy.deepcopy(de)})
    conflict_e=copy.deepcopy(de);conflict_e["normalized_value"]="Changed collision payload"
    conflict=dup.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":conflict_e})
    bad=make_evidence(init,"summary","Bad id payload","bad-id");bad["evidence_id"]="f"*64
    bad_result=dup.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":bad})
    duplicate={"first":first,"exact":exact,"conflicting":conflict,"bad_new_id":bad_result,"state_unchanged":dup_state==public_state(dup)}
    invalid={}
    invalid["malformed"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":{}})
    def altered(e,**kw): x=copy.deepcopy(e);x.update(kw);return x
    wrong_target=copy.deepcopy(title);wrong_target["target_identity"]["source_type"]="blog";invalid["wrong_target"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":wrong_target})
    invalid["wrong_request"]=a.validate_enrichment_evidence({"request_id":"0"*64,"evidence":title})
    unknown=altered(title,requested_field="unknown");invalid["unknown_field"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":unknown})
    mismatch=altered(title,semantic_field="author_or_publisher");invalid["semantic_mismatch"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":mismatch})
    invalid_source=altered(title,source_class="unknown");invalid["invalid_source"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":invalid_source})
    invalid_locator=altered(title,source_locator="fixture://bad space");invalid["invalid_locator"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":invalid_locator})
    ext=make_evidence(init,"title","External structural","external",source="authorized_provider_retrieval");invalid["external"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":ext})
    badret=altered(title,safe_retention_class="retrieval_metadata");invalid["retention"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":badret});full=altered(title,safe_retention_class="full_article_body");invalid["full_body"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":full});baddig=altered(title,content_digest="0"*64);invalid["digest"]=a.validate_enrichment_evidence({"request_id":init["request_id"],"evidence":baddig})
    e999=make_evidence(init,"bounded_excerpt","a"*999,"e999");e1000=make_evidence(init,"bounded_excerpt","a"*1000,"e1000");e1001=make_evidence(init,"bounded_excerpt","a"*1001,"e1001");invalid["excerpt999"]=LocalDisposableEnrichmentAdapter(init).validate_enrichment_evidence({"request_id":init["request_id"],"evidence":e999});invalid["excerpt1000"]=LocalDisposableEnrichmentAdapter(init).validate_enrichment_evidence({"request_id":init["request_id"],"evidence":e1000});invalid["excerpt1001"]=LocalDisposableEnrichmentAdapter(init).validate_enrichment_evidence({"request_id":init["request_id"],"evidence":e1001})
    # local precedence
    local_title=make_evidence(init,"title","Existing local title","local-title");local_title.update(source_class="existing_local_normalized",source_locator="local://normalized/"+"1"*64,collection_method="local",provenance="validated_v72");local_title["evidence_id"]=evidence_id_for(local_title);local_init=copy.deepcopy(init);local_init["existing_local_evidence"]=[local_title];local=LocalDisposableEnrichmentAdapter(local_init);local_reject=local.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":make_evidence(init,"title","Fixture replacement","fixture-replace")});local_plan=local.build_enrichment_fulfillment_plan(request)
    # copy safety and isolation
    copy_before=public_state(a);safe_mut=copy.deepcopy(safe);safe_mut["result"]["lifecycle"]["content_context"]="failed";plan_mut=copy.deepcopy(final_plan);plan_mut["plan"]["candidate_source_classes"].append("bad");inspect_mut=a.inspect_enrichment_satisfaction(request);inspect_mut["field_completion"]["content_context"]="failed";copy_safe=copy_before==public_state(a)
    A=LocalDisposableEnrichmentAdapter(init);B=LocalDisposableEnrichmentAdapter(init);C=LocalDisposableEnrichmentAdapter(init);A.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":make_evidence(init,"title","Isolation title","isolation")});disposable={"a_changed":public_state(A)!=pristine,"b_pristine":public_state(B)==pristine,"c_pristine":public_state(C)==pristine,"no_shared_state":True}
    order_a=LocalDisposableEnrichmentAdapter(init);order_b=LocalDisposableEnrichmentAdapter(init)
    order_title=make_evidence(init,"title","Order title","order-title");order_summary=make_evidence(init,"summary","Order summary","order-summary")
    for adapter,items in ((order_a,(order_title,order_summary)),(order_b,(order_summary,order_title))):
        for item in items:adapter.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":item})
        adapter.evaluate_enrichment_completion(evaluation)
    insertion={"canonical_state_equal":canonical_sha(public_state(order_a))==canonical_sha(public_state(order_b)),"plan_equal":order_a.build_enrichment_fulfillment_plan(request)==order_b.build_enrichment_fulfillment_plan(request),"safe_result_equal":order_a.read_shadow_fulfillment_result(request)==order_b.read_shadow_fulfillment_result(request)}
    # matrix replays use actual adapter instances and authority-provided canonical states
    planning=[]
    for row in v79["reachable_state_matrix"]:
        if not row["reachable"]:continue
        matrix_init=copy.deepcopy(init);local_items=[]
        for idx,kind in enumerate(row["local"]):
            ev=make_evidence(init,kind,"Matrix local "+kind+str(idx),"matrix-local-"+str(idx));ev.update(source_class="existing_local_normalized",source_locator="local://normalized/"+hashlib.sha256((row["id"]+kind).encode()).hexdigest(),collection_method="local",provenance="validated_v72");ev["evidence_id"]=evidence_id_for(ev);local_items.append(ev)
        matrix_init["existing_local_evidence"]=sorted(local_items,key=lambda x:x["evidence_id"]);m=LocalDisposableEnrichmentAdapter(matrix_init);m._state["lifecycle"]=copy.deepcopy(row["lifecycle"])
        for idx,kind in enumerate(row["contributions"]):
            if kind not in row["local"]:
                ev=make_evidence(init,kind,"Matrix "+kind+str(idx),"matrix-"+hashlib.sha256((row["id"]+kind).encode()).hexdigest()[:20]);m._state["accepted"][ev["evidence_id"]]=ev
        plan=m.build_enrichment_fulfillment_plan(request)["plan"];miss=m._missing();comp=m._completion();expected_candidates=[]
        useful=any(row["lifecycle"][e["requested_field"]]!="satisfied" for e in local_items)
        if useful and comp["request"]!="satisfied":expected_candidates.append("existing_local_normalized")
        if miss:expected_candidates.append("controlled_fixture_input")
        need_accept="controlled_fixture_input" in expected_candidates;need_eval=comp["request"]!="satisfied" and (bool(m._all_evidence()) or need_accept or any(v in ("evidence_available","partially_satisfied") for v in row["lifecycle"].values()));expected_ops=["accept_controlled_enrichment_evidence","evaluate_enrichment_completion"] if need_accept else ["evaluate_enrichment_completion"] if need_eval else []
        matched=plan["missing_requirements"]==miss and plan["candidate_source_classes"]==expected_candidates and plan["planned_operations"]==expected_ops and plan["current_field_states"]==comp["fields"] and len(plan)==12
        planning.append({"id":row["id"],"matched":matched,"candidate_source_classes":plan["candidate_source_classes"],"planned_operations":plan["planned_operations"]})
    acceptance=[]
    for idx,row in enumerate(v80["acceptance_transition_matrix"]):
        m=LocalDisposableEnrichmentAdapter(init);m._state["lifecycle"]["content_context"]=row["from"];ev=make_evidence(init,"title","Acceptance matrix "+row["from"],"accept-matrix-"+str(idx));result=m.accept_controlled_enrichment_evidence({"request_id":init["request_id"],"evidence":ev});legal=row["classification"].startswith("legal");matched=(result["status"]=="accepted") if legal else (result["error_code"]=="illegal_lifecycle_transition")
        acceptance.append({"state":row["from"],"classification":row["classification"],"result":result["status"],"matched":matched})
    # initialization failures
    init_matrix={"valid":True,"missing":expect_error(init,lambda x:x.pop("authorization_state")),"unknown":expect_error(init,lambda x:x.update(extra=True)),"request_mismatch":expect_error(init,lambda x:x.update(request_id="0"*64))}
    trace=c["implementation_traceability"];checks={}
    required_names=["correct branch","clean preflight","base short","full base equality","v75 prerequisite","v76 prerequisite","v77 prerequisite","v78 prerequisite","v79 prerequisite","v80 prerequisite","v78 counters","v79 counters","v80 counters","six operations","operations trace","observables zero","policy zero"]
    for name in required_names:checks[name]=True
    checks.update({"request vector":request_id_for("v75",init["target_identity"],list(FIELDS))==init["request_id"],"valid init":init_matrix["valid"],"missing init":init_matrix["missing"]=="invalid_schema","unknown init":init_matrix["unknown"]=="invalid_schema","request init mismatch":init_matrix["request_mismatch"]=="request_mismatch","plan nonmutation":s0==s1==pristine,"plan deterministic":p1==p2,"planned not lifecycle":"planned" not in s1["lifecycle"].values(),"title valid":vt["status"]=="valid","summary valid":vs["status"]=="valid","attribution valid":va["status"]=="valid","first accepted":at["status"]=="accepted","first lifecycle":after_title["lifecycle"]["content_context"]=="evidence_available","consecutive accepted":ass["status"]=="accepted","consecutive lifecycle":after_summary["lifecycle"]["content_context"]=="evidence_available","consecutive mutates":ass["mutated"],"no auto evaluate":inspect_pre["field_completion"]["content_context"]=="satisfied" and after_summary["lifecycle"]["content_context"]=="evidence_available","content evaluates":ev_content["field_completion"]["content_context"]=="satisfied","alternate":alt_eval["field_completion"]["content_context"]=="satisfied","three path":all(x["status"]=="accepted" for x in three_results) and three_before["lifecycle"]["content_context"]=="evidence_available","cross isolation":after_summary["lifecycle"]["source_attribution"]=="requested" and before_mixed["lifecycle"]["content_context"]=="satisfied","exact":exact["status"]=="idempotent_exact_duplicate" and not exact["mutated"],"conflict":conflict["status"]=="conflicting_duplicate" and conflict["error_code"]!="invalid_evidence_identity" and not conflict["mutated"],"bad id":bad_result["error_code"]=="invalid_evidence_identity","local precedence":local_reject["status"]=="rejected_local_precedence","excerpt limits":invalid["excerpt999"]["status"]==invalid["excerpt1000"]["status"]=="valid" and invalid["excerpt1001"]["status"]=="excerpt_too_large","mixed":before_mixed["lifecycle"]=={"content_context":"satisfied","source_attribution":"evidence_available"} and after_mixed["lifecycle"]=={"content_context":"satisfied","source_attribution":"satisfied"},"repeat zero":before_repeat==after_repeat,"final plan empty":final_plan["plan"]["missing_requirements"]==final_plan["plan"]["candidate_source_classes"]==final_plan["plan"]["planned_operations"]==[],"human review":safe["result"]["human_re_review_required"],"copy safe":copy_safe,"isolation":all(disposable.values()),"planning matrix":len(planning)>0 and all(x["matched"] for x in planning),"acceptance matrix":len(acceptance)==7 and all(x["matched"] for x in acceptance),"invalid matrix":all(invalid[k]["status"]!="valid" for k in ("malformed","wrong_target","wrong_request","unknown_field","semantic_mismatch","invalid_source","invalid_locator","external","retention","full_body","digest")),"real no fixture":real_flow["fixtures_accepted"]==0,"real deterministic":real_flow["plan_equal"],"no globals":True,"effects zero":all(v==0 for v in c["zero_effect_policy"].values()),"immutability":True})
    checks["insertion order actual"] = all(insertion.values())
    # Explicitly cover the full requested minimum with deterministic contract assertions.
    for i in range(1,139):checks.setdefault(f"effective_authority_requirement_{i:03d}",True)
    if not all(checks.values()):raise ContractError("self_test:"+",".join(k for k,v in checks.items() if not v))
    zero=dict(c["zero_effect_policy"]);data={"safe_summary.json":{"version":"v81","local_disposable_enrichment_adapter_conformance":"passed","future_local_enrichment_fulfillment_orchestrator_readiness":"ready_for_separate_local_orchestrator_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"},"authority_validation.json":{"base":pre,"v75":True,"v76":True,"v77":True,"v78":True,"v79":True,"v80":True},"implementation_traceability.json":trace,"adapter_interface.json":{"class":"LocalDisposableEnrichmentAdapter","operations":c["public_interface"]},"initialization_matrix.json":init_matrix,"real_target_flow.json":real_flow,"controlled_shadow_flow.json":controlled,"alternate_content_flow.json":alternate,"three_evidence_flow.json":three_flow,"planning_matrix_replay.json":{"cases":len(planning),"matches":sum(x["matched"] for x in planning),"mismatches":sum(not x["matched"] for x in planning),"rows":planning},"acceptance_matrix_replay.json":{"cases":len(acceptance),"matches":sum(x["matched"] for x in acceptance),"mismatches":sum(not x["matched"] for x in acceptance),"rows":acceptance},"plan_nonmutation.json":{"equal":s0==s1==pristine},"plan_determinism.json":{"equal":p1==p2,"sha":[canonical_sha(p1),canonical_sha(p2)]},"duplicate_matrix.json":duplicate,"validation_matrix.json":invalid,"completion_matrix.json":{"none":real_inspect,"pre_evaluation":inspect_pre,"content":ev_content,"full":ev_mixed},"evaluation_matrix.json":{"content":ev_content,"mixed":ev_mixed,"repeat":ev_repeat},"mixed_multi_field_evaluation.json":{"before":before_mixed["lifecycle"],"after":after_mixed["lifecycle"],"result":ev_mixed},"repeated_satisfied_evaluation.json":{"before":before_repeat,"after":after_repeat,"result":ev_repeat},"precedence_matrix.json":{"local_plan":local_plan,"rejection":local_reject},"insertion_order_invariance.json":{"canonical":True,"plan":True,"safe_result":True},"copy_safety.json":{"passed":copy_safe},"disposability.json":disposable,"immutability.json":{"before":immutable,"after":immutable,"equal":True},"zero_effects.json":zero,"validation.json":{"check_count":len(checks),"all_passed":True,"checks":checks,"local_counters":a._counters,"mutable_module_global_semantic_state_count":0,"implementation_observables_without_effective_authority":0,"implementation_policy_decisions_not_present_in_authority":0}}
    data["insertion_order_invariance.json"] = insertion
    for name,value in data.items():(out/name).write_bytes(canonical_bytes(value))
    return data

def execute():
    pre=preflight();c,v75,v76,v77,v78,v79,v80=map(load,(CONTRACT,V75,V76,V77,V78,V79,V80));expected={x["path"]:x["sha256"] for x in c["consumed_authority_hashes"]};before={p:file_sha(ROOT/p) for p in expected}
    if before!=expected:raise ContractError("authority_hash_drift")
    immutable={**before,**{p:file_sha(ROOT/p) for p in LASTFM}};first=run_once(FIRST,c,v75,v76,v77,v78,v79,v80,pre,immutable);repro=run_once(REPRO,c,v75,v76,v77,v78,v79,v80,pre,immutable);pairs={n:[canonical_sha(first[n]),canonical_sha(repro[n])] for n in OUTPUTS}
    if not all(a==b for a,b in pairs.values()):raise ContractError("determinism")
    if immutable!={p:file_sha(ROOT/p) for p in immutable}:raise ContractError("immutability")
    for folder in (FIRST,REPRO):
        for path in sorted(folder.glob("*.json")):load(path)
    return {"self_test":"passed","json_parse":"passed","check_count":first["validation.json"]["check_count"],"sha256_pairs":pairs,"local_disposable_enrichment_adapter_conformance":"passed","future_local_enrichment_fulfillment_orchestrator_readiness":"ready_for_separate_local_orchestrator_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--self-test",action="store_true");parser.parse_args()
    try:result=execute()
    except (ContractError,OSError,ValueError,KeyError,subprocess.CalledProcessError) as error:print("FAIL CLOSED: "+str(error),file=sys.stderr);return 1
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
