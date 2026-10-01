import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRiskAdjustmentQualityEnvelopeRecordCandidate,
  decodeRiskAdjustmentQualityEnvelopeRecord,
  RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_ROOT,
} from '../lib/intelligence/riskAdjustmentQualityEnvelopeRecord';
import type {
  RiskAdjustmentUpstreamQualityEnvelope,
} from '../lib/intelligence/riskAdjustmentUpstreamQualityEnvelope';

const semanticStates: Readonly<Record<string, string>> = {
  availability: 'available-nonzero',
  identity: 'resolved',
  confidence: 'high',
  coverage: 'complete',
  freshness: 'current',
  conflict: 'none',
  revision: 'stable',
  history: 'sufficient',
  volatility: 'unknown',
};

const semantic = (dimension: string, stateValue = semanticStates[dimension]) => ({
  semanticId: 'news:' + dimension,
  semanticVersion: 'v1',
  stateValue,
  evidenceRefs: ['contract:news:' + dimension],
});

function envelope(
  overrides: Partial<RiskAdjustmentUpstreamQualityEnvelope> = {},
): RiskAdjustmentUpstreamQualityEnvelope {
  return {
    contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
    producerContractVersion: 'news-issue-quality-v1',
    variableId: 'newsIssuePoint',
    lifecycleState: 'production',
    materialClass: 'real',
    input: {
      variableId: 'newsIssuePoint',
      lifecycleState: 'production',
      materialClass: 'real',
      confidenceState: 'high',
      availabilityState: 'available-nonzero',
      identityState: 'resolved',
      coverageState: 'complete',
      freshnessState: 'current',
      conflictState: 'none',
      revisionState: 'stable',
      volatilityState: 'unknown',
      historyState: 'sufficient',
      evidenceRefs: ['naver-news-job:job-1'],
    },
    requiredDimensionSemantics: {
      availability: semantic('availability'),
      identity: semantic('identity'),
      confidence: semantic('confidence'),
      coverage: semantic('coverage'),
      freshness: semantic('freshness'),
      conflict: semantic('conflict'),
      revision: semantic('revision'),
      history: semantic('history'),
    },
    optionalDimensionSemantics: {},
    ...overrides,
  };
}

test('accepted upstream envelope becomes deterministic non-writing provenance record', () => {
  const candidate =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(envelope());

  assert.match(
    candidate.pathname,
    new RegExp(
      '^' +
      RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_ROOT.replaceAll('/', '\\/') +
      '\\/newsIssuePoint\\/[0-9a-f]{64}\\.json$',
    ),
  );
  assert.match(candidate.envelopeDigest, /^[0-9a-f]{64}$/);
  assert.match(candidate.recordDigest, /^[0-9a-f]{64}$/);
  assert.equal(candidate.acceptedForRiskConsumption, true);
  assert.equal(candidate.storageWriteAuthorized, false);
  assert.equal(candidate.productActivationAuthorized, false);
  assert.equal(candidate.publicPublicationAuthorized, false);
});

test('provenance record round trips and preserves assessment status', () => {
  const candidate =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(envelope());
  const decoded = decodeRiskAdjustmentQualityEnvelopeRecord(candidate.body);

  assert.equal(decoded.recordDigest, candidate.recordDigest);
  assert.equal(decoded.envelopeDigest, candidate.envelopeDigest);
  assert.equal(decoded.variableId, 'newsIssuePoint');
  assert.equal(decoded.assessmentStatus, 'accepted');
  assert.equal(decoded.acceptedForRiskConsumption, true);
});

test('same envelope produces the same path and digests', () => {
  const first =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(envelope());
  const second =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(envelope());

  assert.equal(first.pathname, second.pathname);
  assert.equal(first.envelopeDigest, second.envelopeDigest);
  assert.equal(first.recordDigest, second.recordDigest);
  assert.equal(first.body, second.body);
});

test('metadata-blocked envelope can be recorded without becoming consumable', () => {
  const blockedEnvelope = envelope({
    requiredDimensionSemantics: {
      availability: semantic('availability'),
      identity: semantic('identity'),
      confidence: semantic('confidence'),
      coverage: semantic('coverage'),
      freshness: semantic('freshness'),
      conflict: semantic('conflict'),
      revision: semantic('revision'),
    },
  });

  const candidate =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(blockedEnvelope);
  const decoded =
    decodeRiskAdjustmentQualityEnvelopeRecord(candidate.body);

  assert.equal(decoded.assessmentStatus, 'required-metadata-blocked');
  assert.equal(decoded.acceptedForRiskConsumption, false);
  assert.equal(candidate.acceptedForRiskConsumption, false);
});

test('tampered envelope payload fails closed', () => {
  const candidate =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(envelope());
  const parsed = JSON.parse(candidate.body);
  parsed.envelope.input.coverageState = 'incomplete';

  assert.throws(
    () => decodeRiskAdjustmentQualityEnvelopeRecord(JSON.stringify(parsed)),
    /risk_adjustment_quality_record_payload_invalid/,
  );
});

test('tampered record digest fails closed', () => {
  const candidate =
    buildRiskAdjustmentQualityEnvelopeRecordCandidate(envelope());
  const parsed = JSON.parse(candidate.body);
  parsed.recordDigest = 'f'.repeat(64);

  assert.throws(
    () => decodeRiskAdjustmentQualityEnvelopeRecord(JSON.stringify(parsed)),
    /risk_adjustment_quality_record_payload_invalid/,
  );
});

test('invalid upstream envelope cannot become a provenance record', () => {
  assert.throws(
    () => buildRiskAdjustmentQualityEnvelopeRecordCandidate(
      envelope({ producerContractVersion: '' }),
    ),
    /risk_adjustment_quality_record_invalid_envelope:producer-contract-version-invalid/,
  );
});
