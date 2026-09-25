-- Activity Exposure v1 Production migration candidate.
-- NOT AUTHORIZED FOR NEON MAIN APPLICATION WITHOUT EXPLICIT USER APPROVAL.

CREATE TABLE fandex.activity_exposure_collection_runs (
  run_id char(64) PRIMARY KEY CHECK (run_id ~ '^[0-9a-f]{64}$'),
  contract_version text NOT NULL CHECK (contract_version = 'activity-exposure-event-v1'),
  artist_id text NOT NULL CHECK (octet_length(artist_id) BETWEEN 1 AND 128),
  provider text NOT NULL CHECK (provider IN ('musicbrainz', 'youtube')),
  provider_artist_id text NOT NULL CHECK (octet_length(provider_artist_id) BETWEEN 1 AND 256),
  event_family text NOT NULL CHECK (event_family IN ('release', 'official_content')),
  collection_status text NOT NULL CHECK (
    collection_status IN ('succeeded', 'bounded_partial', 'provider_unavailable', 'credential_blocked', 'invalid')
  ),
  coverage_state text NOT NULL CHECK (
    coverage_state IN ('covered', 'partial', 'missing_source_data', 'identity_unresolved', 'provider_unavailable', 'invalid')
  ),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  provider_item_count integer CHECK (provider_item_count IS NULL OR provider_item_count >= 0),
  observation_count integer NOT NULL DEFAULT 0 CHECK (observation_count >= 0),
  event_count integer NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  bounded_error_metadata jsonb CHECK (
    bounded_error_metadata IS NULL OR octet_length(bounded_error_metadata::text) <= 4096
  ),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_exposure_run_terminal_time CHECK (
    (collection_status IN ('succeeded', 'bounded_partial', 'provider_unavailable', 'credential_blocked', 'invalid')
      AND completed_at IS NOT NULL)
  )
);

CREATE TABLE fandex.activity_exposure_provider_observations (
  observation_id char(64) PRIMARY KEY CHECK (observation_id ~ '^[0-9a-f]{64}$'),
  run_id char(64) NOT NULL REFERENCES fandex.activity_exposure_collection_runs(run_id),
  artist_id text NOT NULL CHECK (octet_length(artist_id) BETWEEN 1 AND 128),
  provider text NOT NULL CHECK (provider IN ('musicbrainz', 'youtube')),
  provider_artist_id text NOT NULL CHECK (octet_length(provider_artist_id) BETWEEN 1 AND 256),
  source_entity_type text NOT NULL CHECK (octet_length(source_entity_type) BETWEEN 1 AND 128),
  source_entity_id text NOT NULL CHECK (octet_length(source_entity_id) BETWEEN 1 AND 512),
  request_ref text NOT NULL CHECK (octet_length(request_ref) BETWEEN 1 AND 4096),
  response_captured_at timestamptz NOT NULL,
  collected_at timestamptz NOT NULL,
  source_published_at timestamptz,
  provider_observed_at text,
  evidence_ref text NOT NULL CHECK (octet_length(evidence_ref) BETWEEN 1 AND 4096),
  raw_payload_sha256 char(64) NOT NULL CHECK (raw_payload_sha256 ~ '^[0-9a-f]{64}$'),
  normalization_outcome text NOT NULL CHECK (
    normalization_outcome IN (
      'event_emitted',
      'missing_source_data',
      'identity_unresolved',
      'provider_unavailable',
      'invalid',
      'no_event'
    )
  ),
  revision_id text NOT NULL CHECK (octet_length(revision_id) BETWEEN 1 AND 256),
  supersedes_observation_id char(64)
    REFERENCES fandex.activity_exposure_provider_observations(observation_id),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_exposure_observation_unique
    UNIQUE (provider, source_entity_type, source_entity_id, revision_id)
);

CREATE TABLE fandex.activity_exposure_raw_payloads (
  observation_id char(64) PRIMARY KEY
    REFERENCES fandex.activity_exposure_provider_observations(observation_id),
  provider text NOT NULL CHECK (provider IN ('musicbrainz', 'youtube')),
  raw_payload jsonb,
  raw_payload_sha256 char(64) NOT NULL CHECK (raw_payload_sha256 ~ '^[0-9a-f]{64}$'),
  retention_state text NOT NULL CHECK (
    retention_state IN ('retained', 'evicted', 'not_retained')
  ),
  retention_policy_version text NOT NULL
    CHECK (octet_length(retention_policy_version) BETWEEN 1 AND 128),
  retained_at timestamptz,
  refresh_due_at timestamptz,
  refreshed_at timestamptz,
  evicted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_exposure_raw_retention_state CHECK (
    (
      retention_state = 'retained'
      AND raw_payload IS NOT NULL
      AND retained_at IS NOT NULL
      AND evicted_at IS NULL
    )
    OR
    (
      retention_state = 'evicted'
      AND raw_payload IS NULL
      AND retained_at IS NOT NULL
      AND evicted_at IS NOT NULL
    )
    OR
    (
      retention_state = 'not_retained'
      AND raw_payload IS NULL
      AND retained_at IS NULL
      AND evicted_at IS NULL
    )
  ),
  CONSTRAINT activity_exposure_youtube_refresh_boundary CHECK (
    provider <> 'youtube'
    OR retention_state <> 'retained'
    OR (
      refresh_due_at IS NOT NULL
      AND refresh_due_at > retained_at
      AND refresh_due_at <= retained_at + INTERVAL '30 days'
    )
  )
);

CREATE TABLE fandex.activity_exposure_events (
  event_record_id char(64) PRIMARY KEY CHECK (event_record_id ~ '^[0-9a-f]{64}$'),
  event_id text NOT NULL CHECK (octet_length(event_id) BETWEEN 1 AND 512),
  revision_id text NOT NULL CHECK (octet_length(revision_id) BETWEEN 1 AND 256),
  supersedes_event_record_id char(64)
    REFERENCES fandex.activity_exposure_events(event_record_id),
  source_observation_id char(64) NOT NULL
    REFERENCES fandex.activity_exposure_provider_observations(observation_id),
  artist_id text NOT NULL CHECK (octet_length(artist_id) BETWEEN 1 AND 128),
  event_family text NOT NULL CHECK (event_family IN ('release', 'official_content')),
  event_type text NOT NULL CHECK (octet_length(event_type) BETWEEN 1 AND 128),
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN ('planned', 'observed', 'cancelled', 'unknown')
  ),
  announced_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  occurred_at text,
  occurred_at_precision text CHECK (
    occurred_at_precision IS NULL
    OR occurred_at_precision IN ('year', 'month', 'day', 'timestamp')
  ),
  source_published_at timestamptz,
  collected_at timestamptz NOT NULL,
  source_provider text NOT NULL CHECK (source_provider IN ('musicbrainz', 'youtube')),
  source_entity_type text NOT NULL CHECK (octet_length(source_entity_type) BETWEEN 1 AND 128),
  source_entity_id text NOT NULL CHECK (octet_length(source_entity_id) BETWEEN 1 AND 512),
  canonical_family_id text,
  provider_artist_id text NOT NULL CHECK (octet_length(provider_artist_id) BETWEEN 1 AND 256),
  provider_artist_credits jsonb NOT NULL CHECK (
    jsonb_typeof(provider_artist_credits) = 'array'
    AND jsonb_array_length(provider_artist_credits) > 0
  ),
  evidence_ref text NOT NULL CHECK (octet_length(evidence_ref) BETWEEN 1 AND 4096),
  identity_state text NOT NULL CHECK (octet_length(identity_state) BETWEEN 1 AND 128),
  missing_state text NOT NULL CHECK (
    missing_state IN (
      'covered',
      'partial',
      'missing_source_data',
      'identity_unresolved',
      'provider_unavailable',
      'not_in_scope',
      'invalid'
    )
  ),
  evidence_state text NOT NULL CHECK (octet_length(evidence_state) BETWEEN 1 AND 128),
  conflict_state text NOT NULL CHECK (octet_length(conflict_state) BETWEEN 1 AND 128),
  time_zone_state text NOT NULL CHECK (octet_length(time_zone_state) BETWEEN 1 AND 128),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_exposure_event_revision_unique UNIQUE (event_id, revision_id),
  CONSTRAINT activity_exposure_observed_occurrence CHECK (
    (lifecycle_state = 'observed' AND occurred_at IS NOT NULL AND occurred_at_precision IS NOT NULL)
    OR
    (lifecycle_state <> 'observed')
  ),
  CONSTRAINT activity_exposure_missing_not_observed_absence CHECK (
    NOT (
      lifecycle_state = 'observed'
      AND occurred_at IS NOT NULL
      AND missing_state NOT IN ('covered', 'partial')
    )
  )
);

CREATE INDEX activity_exposure_runs_provider_idx
  ON fandex.activity_exposure_collection_runs (artist_id, provider, completed_at DESC);

CREATE INDEX activity_exposure_observations_entity_idx
  ON fandex.activity_exposure_provider_observations
    (provider, source_entity_type, source_entity_id, collected_at DESC);

CREATE INDEX activity_exposure_events_artist_time_idx
  ON fandex.activity_exposure_events
    (artist_id, event_family, collected_at DESC, event_record_id);

CREATE OR REPLACE FUNCTION fandex.reject_activity_exposure_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'activity exposure collection, observation, and event records are append-only';
END;
$function$;

CREATE TRIGGER activity_exposure_collection_runs_append_only
BEFORE UPDATE OR DELETE ON fandex.activity_exposure_collection_runs
FOR EACH ROW EXECUTE FUNCTION fandex.reject_activity_exposure_immutable_mutation();

CREATE TRIGGER activity_exposure_provider_observations_append_only
BEFORE UPDATE OR DELETE ON fandex.activity_exposure_provider_observations
FOR EACH ROW EXECUTE FUNCTION fandex.reject_activity_exposure_immutable_mutation();

CREATE TRIGGER activity_exposure_events_append_only
BEFORE UPDATE OR DELETE ON fandex.activity_exposure_events
FOR EACH ROW EXECUTE FUNCTION fandex.reject_activity_exposure_immutable_mutation();

CREATE OR REPLACE FUNCTION fandex.reject_activity_exposure_raw_payload_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'activity exposure raw payload rows are retained as metadata; evict payload bytes instead';
  END IF;

  IF NOT (
    OLD.retention_state = 'retained'
    AND NEW.retention_state = 'evicted'
    AND OLD.raw_payload IS NOT NULL
    AND NEW.raw_payload IS NULL
    AND NEW.raw_payload_sha256 = OLD.raw_payload_sha256
    AND NEW.provider = OLD.provider
    AND NEW.retention_policy_version = OLD.retention_policy_version
    AND NEW.retained_at = OLD.retained_at
    AND NEW.refresh_due_at IS NOT DISTINCT FROM OLD.refresh_due_at
    AND NEW.evicted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'raw payload update must be a retained-to-evicted transition';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER activity_exposure_raw_payload_bounded_mutation
BEFORE UPDATE OR DELETE ON fandex.activity_exposure_raw_payloads
FOR EACH ROW EXECUTE FUNCTION fandex.reject_activity_exposure_raw_payload_mutation();

REVOKE ALL ON TABLE fandex.activity_exposure_collection_runs FROM PUBLIC;
REVOKE ALL ON TABLE fandex.activity_exposure_provider_observations FROM PUBLIC;
REVOKE ALL ON TABLE fandex.activity_exposure_raw_payloads FROM PUBLIC;
REVOKE ALL ON TABLE fandex.activity_exposure_events FROM PUBLIC;
REVOKE ALL ON FUNCTION fandex.reject_activity_exposure_immutable_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION fandex.reject_activity_exposure_raw_payload_mutation() FROM PUBLIC;

GRANT SELECT, INSERT ON TABLE fandex.activity_exposure_collection_runs TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.activity_exposure_provider_observations TO fandex_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE fandex.activity_exposure_raw_payloads TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.activity_exposure_events TO fandex_runtime;
