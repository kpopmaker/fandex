import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../docs/research/fixtures/iu-activity-exposure-event-stream-v1.json';
import {
  isActivityExposureStreamValid,
  validateActivityExposureEvent,
  validateActivityExposureStream,
  type ActivityExposureEvent,
} from '../lib/research/activityExposure';

const identity = {
  artistId: 'iu',
  musicbrainzArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  youtubeChannelId: 'UC3SyT4_WLHzN7JmHQwKQZww',
} as const;

const events = fixture.events as unknown as ActivityExposureEvent[];

test('real IU fixture satisfies Activity Exposure event contract', () => {
  const issues = validateActivityExposureStream(events, identity);
  assert.deepEqual(issues, []);
  assert.equal(isActivityExposureStreamValid(events, identity), true);
});

test('planned event cannot be silently promoted to observed by carrying occurredAt', () => {
  const invalid = {
    ...events[0],
    eventId: 'invalid:planned-with-occurrence',
    lifecycleState: 'planned',
  } as ActivityExposureEvent;
  const issues = validateActivityExposureEvent(invalid, identity);
  assert.ok(issues.some((issue) => issue.code === 'non_observed_with_occurrence'));
});

test('observed event requires occurrence time', () => {
  const invalid = {
    ...events[0],
    eventId: 'invalid:observed-without-occurrence',
    occurredAt: null,
    occurredAtPrecision: null,
  } as ActivityExposureEvent;
  const issues = validateActivityExposureEvent(invalid, identity);
  assert.ok(issues.some((issue) => issue.code === 'observed_without_occurrence'));
});

test('partial date precision is preserved instead of fabricated', () => {
  const partial = {
    ...events[0],
    eventId: 'valid:month-precision',
    sourceEntityId: 'month-precision',
    occurredAt: '2024-02',
    occurredAtPrecision: 'month',
  } as ActivityExposureEvent;
  assert.deepEqual(validateActivityExposureEvent(partial, identity), []);

  const fabricated = {
    ...partial,
    eventId: 'invalid:precision-mismatch',
    occurredAt: '2024-02',
    occurredAtPrecision: 'day',
  } as ActivityExposureEvent;
  assert.ok(
    validateActivityExposureEvent(fabricated, identity)
      .some((issue) => issue.code === 'precision_mismatch'),
  );
});

test('youtube event must come from canonical official channel', () => {
  const invalid = {
    ...events[1],
    eventId: 'invalid:third-party-youtube',
    sourceEntityId: 'third-party-video',
    providerArtistId: 'UC_NOT_IU_OFFICIAL',
  } as ActivityExposureEvent;
  assert.ok(
    validateActivityExposureEvent(invalid, identity)
      .some((issue) => issue.code === 'youtube_channel_mismatch'),
  );
});

test('musicbrainz event must resolve to canonical artist MBID', () => {
  const invalid = {
    ...events[0],
    eventId: 'invalid:wrong-musicbrainz-artist',
    sourceEntityId: 'wrong-release-group',
    providerArtistId: '00000000-0000-0000-0000-000000000000',
  } as ActivityExposureEvent;
  assert.ok(
    validateActivityExposureEvent(invalid, identity)
      .some((issue) => issue.code === 'musicbrainz_artist_mismatch'),
  );
});

test('duplicate provider entity is rejected', () => {
  const duplicate = {
    ...events[2],
    eventId: 'duplicate:holssi',
  } as ActivityExposureEvent;
  const issues = validateActivityExposureStream([...events, duplicate], identity);
  assert.ok(issues.some((issue) => issue.code === 'duplicate_provider_entity'));
});

test('numeric score, weight, decay, active window and raw count fields are prohibited', () => {
  for (const field of ['score', 'weight', 'decay', 'activeWindowDays', 'activityCount']) {
    const invalid = {
      ...events[0],
      eventId: `invalid:methodology:${field}`,
      sourceEntityId: `invalid-${field}`,
      [field]: 1,
    } as ActivityExposureEvent;
    assert.ok(
      validateActivityExposureEvent(invalid, identity)
        .some((issue) => issue.code === 'prohibited_numeric_methodology_field'),
      field,
    );
  }
});

test('partial evidence is not zero or inactive', () => {
  const partial = events.find((event) => event.missingState === 'partial');
  assert.ok(partial);
  assert.equal(partial.lifecycleState, 'observed');
  assert.notEqual(partial.occurredAt, null);
});

test('release and official-content events on same date remain distinct families', () => {
  const sameDate = events.filter((event) => event.occurredAt === '2024-02-20');
  assert.equal(sameDate.length, 2);
  assert.deepEqual(
    new Set(sameDate.map((event) => event.eventFamily)),
    new Set(['release', 'official_content']),
  );
});
