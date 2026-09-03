CREATE TABLE fandex.album_research_observation_records (
  record_id char(64) PRIMARY KEY CHECK (record_id ~ '^[0-9a-f]{64}$'),
  record_version text NOT NULL CHECK (record_version = 'album-direct-observation-research-v1'),
  provider text NOT NULL CHECK (provider IN ('circle-chart', 'hanteo-chart')),
  source_entity_id char(64) NOT NULL CHECK (source_entity_id ~ '^[0-9a-f]{64}$'),
  source_record_id char(64) NOT NULL CHECK (source_record_id ~ '^[0-9a-f]{64}$'),
  observation_id char(64) NOT NULL UNIQUE CHECK (observation_id ~ '^[0-9a-f]{64}$'),
  payload_digest char(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
  fandex_artist_id text NOT NULL CHECK (length(trim(fandex_artist_id)) > 0),
  fandex_release_id text NOT NULL CHECK (length(trim(fandex_release_id)) > 0),
  provider_period text NOT NULL CHECK (length(trim(provider_period)) > 0),
  record_state text NOT NULL CHECK (record_state IN ('original', 'revised')),
  supersedes_record_id char(64) REFERENCES fandex.album_research_observation_records(record_id),
  intake_plan_digest char(64) NOT NULL CHECK (intake_plan_digest ~ '^[0-9a-f]{64}$'),
  write_grant_digest char(64) NOT NULL CHECK (write_grant_digest ~ '^[0-9a-f]{64}$'),
  authorization_snapshot jsonb NOT NULL CHECK (octet_length(authorization_snapshot::text) <= 4096),
  observation_payload jsonb NOT NULL CHECK (octet_length(observation_payload::text) <= 32768),
  observed_at timestamptz NOT NULL,
  collected_at timestamptz NOT NULL,
  revision_observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT album_research_revision_state_consistent CHECK (
    (record_state = 'original' AND supersedes_record_id IS NULL AND revision_observed_at IS NULL)
    OR
    (record_state = 'revised' AND supersedes_record_id IS NOT NULL AND revision_observed_at IS NOT NULL)
  ),
  CONSTRAINT album_research_no_self_supersession CHECK (supersedes_record_id IS NULL OR supersedes_record_id <> record_id)
);

CREATE INDEX album_research_observation_release_period_idx
  ON fandex.album_research_observation_records (fandex_release_id, provider, provider_period);

CREATE INDEX album_research_observation_series_created_idx
  ON fandex.album_research_observation_records (source_entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION fandex.reject_album_research_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'album_research_observation_records is append-only';
END;
$function$;

DROP TRIGGER IF EXISTS album_research_observation_records_append_only
  ON fandex.album_research_observation_records;
CREATE TRIGGER album_research_observation_records_append_only
BEFORE UPDATE OR DELETE ON fandex.album_research_observation_records
FOR EACH ROW EXECUTE FUNCTION fandex.reject_album_research_observation_mutation();

REVOKE ALL ON TABLE fandex.album_research_observation_records FROM PUBLIC;
REVOKE ALL ON FUNCTION fandex.reject_album_research_observation_mutation() FROM PUBLIC;
