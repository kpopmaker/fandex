\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Existing NAVER schema must remain present and unchanged by the candidate.
SELECT to_regclass('fandex.source_ingestion_jobs') IS NOT NULL AS naver_jobs_present;
SELECT to_regclass('fandex.source_ingestion_raw_evidence') IS NOT NULL AS naver_raw_present;

INSERT INTO fandex.activity_exposure_collection_runs (
  run_id, contract_version, artist_id, provider, provider_artist_id,
  event_family, collection_status, coverage_state,
  started_at, completed_at, provider_item_count, observation_count, event_count
) VALUES (
  repeat('1',64), 'activity-exposure-event-v1', 'iu', 'musicbrainz',
  'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  'release', 'bounded_partial', 'partial',
  now() - interval '2 minutes', now(), 58, 58, 57
);

INSERT INTO fandex.activity_exposure_provider_observations (
  observation_id, run_id, artist_id, provider, provider_artist_id,
  source_entity_type, source_entity_id, request_ref,
  response_captured_at, collected_at, provider_observed_at,
  evidence_ref, raw_payload_sha256, normalization_outcome, revision_id
) VALUES (
  repeat('2',64), repeat('1',64), 'iu', 'musicbrainz',
  'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  'release-group', '1299e16d-133b-47b0-b991-36cf11eff7d7',
  'musicbrainz:release-group:1299e16d-133b-47b0-b991-36cf11eff7d7',
  now(), now(), '2010-09-28',
  'https://musicbrainz.org/release-group/1299e16d-133b-47b0-b991-36cf11eff7d7',
  repeat('a',64), 'missing_source_data', 'research-live-2026-09-23'
);

INSERT INTO fandex.activity_exposure_raw_payloads (
  observation_id, provider, raw_payload, raw_payload_sha256,
  retention_state, retention_policy_version, retained_at
) VALUES (
  repeat('2',64), 'musicbrainz', '{"kind":"bounded-release-group-evidence"}',
  repeat('a',64), 'retained', 'musicbrainz-core-field-review-v1', now()
);

-- Missing source data exists as evidence without fabricating an event or zero.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fandex.activity_exposure_events
    WHERE source_observation_id = repeat('2',64)
  ) THEN
    RAISE EXCEPTION 'missing_source_data must not fabricate an event';
  END IF;
END $$;

INSERT INTO fandex.activity_exposure_provider_observations (
  observation_id, run_id, artist_id, provider, provider_artist_id,
  source_entity_type, source_entity_id, request_ref,
  response_captured_at, collected_at, provider_observed_at,
  evidence_ref, raw_payload_sha256, normalization_outcome, revision_id
) VALUES (
  repeat('3',64), repeat('1',64), 'iu', 'musicbrainz',
  'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  'release-group', '00000000-0000-0000-0000-000000000001',
  'musicbrainz:release-group:test-collaboration',
  now(), now(), '2026-09-23',
  'https://musicbrainz.org/release-group/00000000-0000-0000-0000-000000000001',
  repeat('b',64), 'event_emitted', 'research-live-2026-09-23'
);

INSERT INTO fandex.activity_exposure_raw_payloads (
  observation_id, provider, raw_payload, raw_payload_sha256,
  retention_state, retention_policy_version, retained_at
) VALUES (
  repeat('3',64), 'musicbrainz', '{"kind":"bounded-release-evidence"}',
  repeat('b',64), 'retained', 'musicbrainz-core-field-review-v1', now()
);

INSERT INTO fandex.activity_exposure_events (
  event_record_id, event_id, revision_id, source_observation_id,
  artist_id, event_family, event_type, lifecycle_state,
  occurred_at, occurred_at_precision, collected_at,
  source_provider, source_entity_type, source_entity_id,
  provider_artist_id, provider_artist_credits, evidence_ref,
  identity_state, missing_state, evidence_state, conflict_state, time_zone_state
) VALUES (
  repeat('4',64), 'musicbrainz:release-group:test-collaboration',
  'research-live-2026-09-23', repeat('3',64),
  'iu', 'release', 'confirmed_release', 'observed',
  '2026-09-23', 'day', now(),
  'musicbrainz', 'release-group',
  '00000000-0000-0000-0000-000000000001',
  'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  '[{"providerArtistId":"b9545342-1e6d-4dae-84ac-013374ad8d7c","name":"IU"},{"providerArtistId":"collaborator-test","name":"Collaborator"}]',
  'https://musicbrainz.org/release-group/00000000-0000-0000-0000-000000000001',
  'resolved_for_research', 'covered', 'direct_provider_evidence',
  'clear', 'provider_date'
);

DO $$
DECLARE
  credit_count integer;
BEGIN
  SELECT jsonb_array_length(provider_artist_credits)
    INTO credit_count
  FROM fandex.activity_exposure_events
  WHERE event_record_id = repeat('4',64);

  IF credit_count <> 2 THEN
    RAISE EXCEPTION 'collaboration credits were not preserved';
  END IF;
END $$;

-- A separate YouTube run demonstrates temporary raw-payload retention.
INSERT INTO fandex.activity_exposure_collection_runs (
  run_id, contract_version, artist_id, provider, provider_artist_id,
  event_family, collection_status, coverage_state,
  started_at, completed_at, provider_item_count, observation_count, event_count
) VALUES (
  repeat('5',64), 'activity-exposure-event-v1', 'iu', 'youtube',
  'UC3SyT4_WLHzN7JmHQwKQZww',
  'official_content', 'succeeded', 'covered',
  now() - interval '1 minute', now(), 1, 1, 1
);

INSERT INTO fandex.activity_exposure_provider_observations (
  observation_id, run_id, artist_id, provider, provider_artist_id,
  source_entity_type, source_entity_id, request_ref,
  response_captured_at, collected_at, source_published_at,
  provider_observed_at, evidence_ref, raw_payload_sha256,
  normalization_outcome, revision_id
) VALUES (
  repeat('6',64), repeat('5',64), 'iu', 'youtube',
  'UC3SyT4_WLHzN7JmHQwKQZww',
  'video', 'abcdefghijk', 'youtube:videos:snippet:abcdefghijk',
  now(), now(), now() - interval '1 day',
  (now() - interval '1 day')::text,
  'https://www.youtube.com/watch?v=abcdefghijk',
  repeat('c',64), 'event_emitted', 'collection-1'
);

INSERT INTO fandex.activity_exposure_raw_payloads (
  observation_id, provider, raw_payload, raw_payload_sha256,
  retention_state, retention_policy_version, retained_at, refresh_due_at
) VALUES (
  repeat('6',64), 'youtube', '{"id":"abcdefghijk"}',
  repeat('c',64), 'retained', 'youtube-non-authorized-data-v1',
  now(), now() + interval '29 days'
);

-- Eviction is allowed without erasing digest/observation/event lineage.
UPDATE fandex.activity_exposure_raw_payloads
SET raw_payload = NULL,
    retention_state = 'evicted',
    evicted_at = now(),
    updated_at = now()
WHERE observation_id = repeat('6',64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM fandex.activity_exposure_raw_payloads
    WHERE observation_id = repeat('6',64)
      AND retention_state = 'evicted'
      AND raw_payload IS NULL
      AND raw_payload_sha256 = repeat('c',64)
  ) THEN
    RAISE EXCEPTION 'raw payload eviction did not preserve lineage metadata';
  END IF;
END $$;

-- Direct in-place replacement of raw payload must fail.
DO $$
BEGIN
  BEGIN
    UPDATE fandex.activity_exposure_raw_payloads
    SET raw_payload = '{"id":"replacement"}',
        retention_state = 'retained',
        evicted_at = NULL
    WHERE observation_id = repeat('6',64);
    RAISE EXCEPTION 'expected raw payload mutation rejection';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'expected raw payload mutation rejection' THEN
        RAISE;
      END IF;
  END;
END $$;

-- YouTube retained raw payload requires a bounded refresh_due_at.
INSERT INTO fandex.activity_exposure_provider_observations (
  observation_id, run_id, artist_id, provider, provider_artist_id,
  source_entity_type, source_entity_id, request_ref,
  response_captured_at, collected_at, source_published_at,
  provider_observed_at, evidence_ref, raw_payload_sha256,
  normalization_outcome, revision_id
) VALUES (
  repeat('7',64), repeat('5',64), 'iu', 'youtube',
  'UC3SyT4_WLHzN7JmHQwKQZww',
  'video', 'lmnopqrstuv', 'youtube:videos:snippet:lmnopqrstuv',
  now(), now(), now() - interval '2 days',
  (now() - interval '2 days')::text,
  'https://www.youtube.com/watch?v=lmnopqrstuv',
  repeat('d',64), 'event_emitted', 'collection-1'
);

DO $
BEGIN
  BEGIN
    INSERT INTO fandex.activity_exposure_raw_payloads (
      observation_id, provider, raw_payload, raw_payload_sha256,
      retention_state, retention_policy_version, retained_at
    ) VALUES (
      repeat('7',64), 'youtube', '{"id":"bad"}',
      repeat('d',64), 'retained', 'youtube-non-authorized-data-v1', now()
    );
    RAISE EXCEPTION 'expected YouTube refresh boundary rejection';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
    WHEN raise_exception THEN
      IF SQLERRM = 'expected YouTube refresh boundary rejection' THEN
        RAISE;
      END IF;
  END;
END $$;

-- No numeric methodology columns may exist in the Activity Exposure candidate.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'fandex'
      AND table_name LIKE 'activity_exposure_%'
      AND column_name ~* '(score|point|weight|decay|active_window|active_until)'
  ) THEN
    RAISE EXCEPTION 'prohibited numeric methodology field exists';
  END IF;
END $$;

SELECT 'ACTIVITY_EXPOSURE_PERSISTENCE_CANDIDATE_PASS' AS result;
