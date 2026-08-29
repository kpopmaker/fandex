CREATE TABLE fandex.source_ingestion_jobs (
  job_id char(64) PRIMARY KEY CHECK (job_id ~ '^[0-9a-f]{64}$'),
  idempotency_key char(64) NOT NULL UNIQUE CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  request_sha256 char(64) NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  contract_version text NOT NULL CHECK (contract_version = 'v121_naver_news_ingestion_v1'),
  provider text NOT NULL CHECK (provider = 'naver-news'),
  collection_key text NOT NULL CHECK (
    octet_length(collection_key) BETWEEN 1 AND 128
    AND collection_key ~ '^[a-z0-9][a-z0-9._:-]*$'
  ),
  request_contract jsonb NOT NULL CHECK (octet_length(request_contract::text) <= 8192),
  status text NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'retryable_failed', 'dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts = 8 AND attempt_count <= max_attempts),
  claim_token char(64) CHECK (claim_token IS NULL OR claim_token ~ '^[0-9a-f]{64}$'),
  lease_owner text CHECK (lease_owner IS NULL OR octet_length(lease_owner) BETWEEN 1 AND 128),
  lease_expires_at timestamptz,
  result_sha256 char(64) CHECK (result_sha256 IS NULL OR result_sha256 ~ '^[0-9a-f]{64}$'),
  raw_evidence_count integer NOT NULL DEFAULT 0 CHECK (raw_evidence_count >= 0),
  normalized_record_count integer NOT NULL DEFAULT 0 CHECK (normalized_record_count >= 0),
  duplicate_record_count integer NOT NULL DEFAULT 0 CHECK (duplicate_record_count >= 0),
  rejected_item_count integer NOT NULL DEFAULT 0 CHECK (rejected_item_count >= 0),
  bounded_error_metadata jsonb CHECK (
    bounded_error_metadata IS NULL OR octet_length(bounded_error_metadata::text) <= 4096
  ),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT source_ingestion_jobs_collection_unique UNIQUE (provider, collection_key),
  CONSTRAINT source_ingestion_jobs_lease_state CHECK (
    (status = 'running' AND claim_token IS NOT NULL AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR
    (status <> 'running' AND claim_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)
  ),
  CONSTRAINT source_ingestion_jobs_result_state CHECK (
    (status = 'succeeded' AND result_sha256 IS NOT NULL)
    OR
    (status <> 'succeeded' AND result_sha256 IS NULL)
  )
);

CREATE TABLE fandex.source_ingestion_raw_evidence (
  evidence_id char(64) PRIMARY KEY CHECK (evidence_id ~ '^[0-9a-f]{64}$'),
  job_id char(64) NOT NULL REFERENCES fandex.source_ingestion_jobs(job_id),
  item_index integer NOT NULL CHECK (item_index >= 0 AND item_index < 100),
  observed_at timestamptz NOT NULL,
  raw_payload jsonb NOT NULL CHECK (octet_length(raw_payload::text) <= 24576),
  raw_payload_sha256 char(64) NOT NULL CHECK (raw_payload_sha256 ~ '^[0-9a-f]{64}$'),
  normalization_outcome text NOT NULL CHECK (normalization_outcome IN ('normalized', 'duplicate', 'rejected')),
  normalized_record_id char(64) CHECK (normalized_record_id IS NULL OR normalized_record_id ~ '^[0-9a-f]{64}$'),
  rejection_code text CHECK (rejection_code IN ('missing_title', 'missing_source_url', 'invalid_published_at')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT source_ingestion_raw_job_index_unique UNIQUE (job_id, item_index),
  CONSTRAINT source_ingestion_raw_rejection_state CHECK (
    (normalization_outcome = 'rejected' AND rejection_code IS NOT NULL AND normalized_record_id IS NULL)
    OR
    (normalization_outcome <> 'rejected' AND rejection_code IS NULL AND normalized_record_id IS NOT NULL)
  )
);

CREATE TABLE fandex.source_ingestion_normalized_records (
  record_id char(64) PRIMARY KEY CHECK (record_id ~ '^[0-9a-f]{64}$'),
  raw_evidence_id char(64) NOT NULL REFERENCES fandex.source_ingestion_raw_evidence(evidence_id),
  provider text NOT NULL CHECK (provider = 'naver-news'),
  source_type text NOT NULL CHECK (source_type = 'news_article'),
  source_url text NOT NULL CHECK (octet_length(source_url) BETWEEN 1 AND 4096),
  naver_url text CHECK (naver_url IS NULL OR octet_length(naver_url) BETWEEN 1 AND 4096),
  source_host text NOT NULL CHECK (octet_length(source_host) BETWEEN 1 AND 512),
  title text NOT NULL CHECK (octet_length(title) BETWEEN 1 AND 2048),
  summary text NOT NULL CHECK (octet_length(summary) <= 8192),
  published_at timestamptz NOT NULL,
  collected_at timestamptz NOT NULL,
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  record_sha256 char(64) NOT NULL UNIQUE CHECK (record_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_payload jsonb NOT NULL CHECK (octet_length(normalized_payload::text) <= 16384),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE fandex.source_ingestion_raw_evidence
  ADD CONSTRAINT source_ingestion_raw_normalized_record_fk
  FOREIGN KEY (normalized_record_id)
  REFERENCES fandex.source_ingestion_normalized_records(record_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE fandex.source_ingestion_audit_events (
  job_id char(64) NOT NULL REFERENCES fandex.source_ingestion_jobs(job_id),
  sequence bigint NOT NULL CHECK (sequence > 0),
  event_type text NOT NULL CHECK (event_type IN (
    'job_enqueued',
    'job_claimed',
    'collection_received',
    'raw_evidence_prepared',
    'normalization_prepared',
    'job_succeeded',
    'job_retryable_failed',
    'job_dead_lettered'
  )),
  event_sha256 char(64) NOT NULL CHECK (event_sha256 ~ '^[0-9a-f]{64}$'),
  bounded_payload jsonb NOT NULL CHECK (octet_length(bounded_payload::text) <= 4096),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id, sequence)
);

CREATE INDEX source_ingestion_jobs_claim_idx
  ON fandex.source_ingestion_jobs (status, lease_expires_at, attempt_count, created_at);

CREATE INDEX source_ingestion_raw_job_idx
  ON fandex.source_ingestion_raw_evidence (job_id, item_index);

CREATE INDEX source_ingestion_normalized_published_idx
  ON fandex.source_ingestion_normalized_records (published_at DESC, record_id);

CREATE OR REPLACE FUNCTION fandex.reject_source_ingestion_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'source ingestion evidence, normalized records, and audit events are append-only';
END;
$function$;

CREATE TRIGGER source_ingestion_raw_evidence_append_only
BEFORE UPDATE OR DELETE ON fandex.source_ingestion_raw_evidence
FOR EACH ROW EXECUTE FUNCTION fandex.reject_source_ingestion_append_only_mutation();

CREATE TRIGGER source_ingestion_normalized_records_append_only
BEFORE UPDATE OR DELETE ON fandex.source_ingestion_normalized_records
FOR EACH ROW EXECUTE FUNCTION fandex.reject_source_ingestion_append_only_mutation();

CREATE TRIGGER source_ingestion_audit_events_append_only
BEFORE UPDATE OR DELETE ON fandex.source_ingestion_audit_events
FOR EACH ROW EXECUTE FUNCTION fandex.reject_source_ingestion_append_only_mutation();

REVOKE ALL ON TABLE fandex.source_ingestion_jobs FROM PUBLIC;
REVOKE ALL ON TABLE fandex.source_ingestion_raw_evidence FROM PUBLIC;
REVOKE ALL ON TABLE fandex.source_ingestion_normalized_records FROM PUBLIC;
REVOKE ALL ON TABLE fandex.source_ingestion_audit_events FROM PUBLIC;
REVOKE ALL ON FUNCTION fandex.reject_source_ingestion_append_only_mutation() FROM PUBLIC;

GRANT SELECT, INSERT ON TABLE fandex.source_ingestion_jobs TO fandex_runtime;
GRANT UPDATE (
  status,
  attempt_count,
  claim_token,
  lease_owner,
  lease_expires_at,
  result_sha256,
  raw_evidence_count,
  normalized_record_count,
  duplicate_record_count,
  rejected_item_count,
  bounded_error_metadata,
  updated_at
) ON TABLE fandex.source_ingestion_jobs TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.source_ingestion_raw_evidence TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.source_ingestion_normalized_records TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.source_ingestion_audit_events TO fandex_runtime;
