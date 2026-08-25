CREATE SCHEMA IF NOT EXISTS fandex;

REVOKE ALL ON SCHEMA fandex FROM PUBLIC;

CREATE TABLE IF NOT EXISTS fandex.schema_migrations (
  version bigint PRIMARY KEY CHECK (version > 0),
  migration_sha256 char(64) NOT NULL CHECK (migration_sha256 ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fandex.normalized_sources (
  internal_source_id text PRIMARY KEY,
  provider text NOT NULL,
  source_type text NOT NULL,
  office_code text NOT NULL,
  article_id text NOT NULL,
  title text,
  summary text,
  author_or_publisher text,
  displayed_source_timestamp timestamp without time zone NOT NULL,
  normalized_provider_timestamp timestamptz NOT NULL,
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  record_version bigint NOT NULL CHECK (record_version > 0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT normalized_sources_provider_article_unique
    UNIQUE (provider, source_type, office_code, article_id)
);

CREATE TABLE fandex.historical_enrichment_requests (
  request_id char(64) PRIMARY KEY CHECK (request_id ~ '^[0-9a-f]{64}$'),
  internal_source_id text NOT NULL REFERENCES fandex.normalized_sources(internal_source_id),
  requested_fields text[] NOT NULL,
  request_state text NOT NULL CHECK (request_state IN ('open', 'closed')),
  persistent_fulfilled boolean NOT NULL DEFAULT false,
  persistent_closed boolean NOT NULL DEFAULT false,
  closure_record_reference text,
  state_sha256 char(64) NOT NULL CHECK (state_sha256 ~ '^[0-9a-f]{64}$'),
  record_version bigint NOT NULL CHECK (record_version > 0),
  CONSTRAINT historical_request_closed_matches_state
    CHECK ((request_state = 'closed') = persistent_closed),
  CONSTRAINT historical_request_closed_is_fulfilled
    CHECK (NOT persistent_closed OR (persistent_fulfilled AND closure_record_reference IS NOT NULL))
);

CREATE TABLE fandex.source_evidence_provenance (
  provenance_id char(64) PRIMARY KEY CHECK (provenance_id ~ '^[0-9a-f]{64}$'),
  internal_source_id text NOT NULL REFERENCES fandex.normalized_sources(internal_source_id),
  source_url text NOT NULL,
  exact_headline text NOT NULL,
  publisher text NOT NULL,
  journalist_byline text,
  normalized_journalist text,
  semantic_roles jsonb NOT NULL,
  displayed_source_timestamp timestamp without time zone NOT NULL,
  normalized_provider_timestamp timestamptz NOT NULL,
  evidence_sha256 char(64) NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_width integer NOT NULL CHECK (evidence_width > 0),
  evidence_height integer NOT NULL CHECK (evidence_height > 0),
  verification_lineage jsonb NOT NULL,
  acceptance_lineage jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT source_evidence_digest_unique UNIQUE (internal_source_id, evidence_sha256)
);

CREATE TABLE fandex.persistence_transactions (
  idempotency_key char(64) PRIMARY KEY CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  request_id char(64) NOT NULL REFERENCES fandex.historical_enrichment_requests(request_id),
  internal_source_id text NOT NULL REFERENCES fandex.normalized_sources(internal_source_id),
  canonical_payload_digest char(64) NOT NULL CHECK (canonical_payload_digest ~ '^[0-9a-f]{64}$'),
  expected_normalized_version bigint NOT NULL CHECK (expected_normalized_version > 0),
  expected_normalized_digest char(64) NOT NULL CHECK (expected_normalized_digest ~ '^[0-9a-f]{64}$'),
  expected_request_version bigint NOT NULL CHECK (expected_request_version > 0),
  expected_request_digest char(64) NOT NULL CHECK (expected_request_digest ~ '^[0-9a-f]{64}$'),
  normalized_application_reference char(64) NOT NULL CHECK (normalized_application_reference ~ '^[0-9a-f]{64}$'),
  closure_record_reference char(64) NOT NULL CHECK (closure_record_reference ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('applying', 'applied', 'compensated', 'rejected')),
  before_digests jsonb NOT NULL,
  after_digests jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fandex.persistence_audit_events (
  idempotency_key char(64) NOT NULL REFERENCES fandex.persistence_transactions(idempotency_key),
  sequence bigint NOT NULL CHECK (sequence > 0),
  event_type text NOT NULL,
  event_digest char(64) NOT NULL CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  bounded_payload jsonb NOT NULL CHECK (octet_length(bounded_payload::text) <= 16384),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idempotency_key, sequence)
);

CREATE TABLE fandex.ingestion_outbox (
  outbox_id char(64) PRIMARY KEY CHECK (outbox_id ~ '^[0-9a-f]{64}$'),
  idempotency_key char(64) NOT NULL REFERENCES fandex.persistence_transactions(idempotency_key),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'applied', 'retryable_failed', 'dead_letter')),
  event_type text NOT NULL,
  bounded_payload jsonb NOT NULL CHECK (octet_length(bounded_payload::text) <= 16384),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts = 8),
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  bounded_error_metadata jsonb CHECK (bounded_error_metadata IS NULL OR octet_length(bounded_error_metadata::text) <= 4096),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ingestion_outbox_transaction_event_unique UNIQUE (idempotency_key, event_type),
  CONSTRAINT ingestion_outbox_attempt_bound CHECK (attempt_count <= max_attempts)
);

CREATE INDEX ingestion_outbox_claim_idx
  ON fandex.ingestion_outbox (status, next_attempt_at, lease_expires_at);

CREATE OR REPLACE FUNCTION fandex.reject_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'persistence_audit_events is append-only';
END;
$function$;

DROP TRIGGER IF EXISTS persistence_audit_events_append_only ON fandex.persistence_audit_events;
CREATE TRIGGER persistence_audit_events_append_only
BEFORE UPDATE OR DELETE ON fandex.persistence_audit_events
FOR EACH ROW EXECUTE FUNCTION fandex.reject_audit_event_mutation();

REVOKE ALL ON ALL TABLES IN SCHEMA fandex FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fandex FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fandex FROM PUBLIC;
