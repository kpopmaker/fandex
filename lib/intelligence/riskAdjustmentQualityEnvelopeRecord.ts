import {
  canonicalJson,
  isSha256,
  sha256Canonical,
} from '../shared/canonicalDigest';
import {
  evaluateRiskAdjustmentUpstreamQualityEnvelope,
  type RiskAdjustmentUpstreamQualityEnvelope,
  type RiskAdjustmentUpstreamQualityEnvelopeAssessment,
} from './riskAdjustmentUpstreamQualityEnvelope';

export const RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_VERSION =
  'risk-adjustment-quality-envelope-record-v1' as const;

export const RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_ROOT =
  'fandex/risk-adjustment/upstream-quality/v1' as const;

export type RiskAdjustmentQualityEnvelopeRecordPayload = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_VERSION;
  kind: 'upstream-quality-envelope';
  variableId: RiskAdjustmentUpstreamQualityEnvelope['variableId'];
  producerContractVersion: string;
  envelopeDigest: string;
  envelope: RiskAdjustmentUpstreamQualityEnvelope;
  assessmentStatus: Exclude<
    RiskAdjustmentUpstreamQualityEnvelopeAssessment['status'],
    'invalid'
  >;
  acceptedForRiskConsumption: boolean;
}>;

export type RiskAdjustmentQualityEnvelopeRecordEnvelope =
  RiskAdjustmentQualityEnvelopeRecordPayload & Readonly<{
    recordDigest: string;
  }>;

export type RiskAdjustmentQualityEnvelopeRecordCandidate = Readonly<{
  pathname: string;
  body: string;
  envelopeDigest: string;
  recordDigest: string;
  acceptedForRiskConsumption: boolean;
  storageWriteAuthorized: false;
  productActivationAuthorized: false;
  publicPublicationAuthorized: false;
}>;

function cleanSegment(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(normalized)) {
    throw new Error('risk_adjustment_quality_record_identity_invalid');
  }
  return normalized;
}

function objectPath(
  variableId: string,
  envelopeDigest: string,
): string {
  if (!isSha256(envelopeDigest)) {
    throw new Error('risk_adjustment_quality_record_digest_invalid');
  }
  return [
    RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_ROOT,
    cleanSegment(variableId),
    envelopeDigest + '.json',
  ].join('/');
}

export function buildRiskAdjustmentQualityEnvelopeRecordCandidate(
  envelope: RiskAdjustmentUpstreamQualityEnvelope,
): RiskAdjustmentQualityEnvelopeRecordCandidate {
  const assessment =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope);
  if (assessment.status === 'invalid') {
    throw new Error(
      'risk_adjustment_quality_record_invalid_envelope:' + assessment.reason,
    );
  }

  const envelopeDigest = sha256Canonical(envelope);
  const payload: RiskAdjustmentQualityEnvelopeRecordPayload = Object.freeze({
    contractVersion: RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_VERSION,
    kind: 'upstream-quality-envelope' as const,
    variableId: envelope.variableId,
    producerContractVersion: envelope.producerContractVersion,
    envelopeDigest,
    envelope,
    assessmentStatus: assessment.status,
    acceptedForRiskConsumption:
      assessment.handoff.acceptedForRiskConsumption,
  });
  const recordDigest = sha256Canonical(payload);
  const record: RiskAdjustmentQualityEnvelopeRecordEnvelope = Object.freeze({
    ...payload,
    recordDigest,
  });

  return Object.freeze({
    pathname: objectPath(envelope.variableId, envelopeDigest),
    body: canonicalJson(record),
    envelopeDigest,
    recordDigest,
    acceptedForRiskConsumption:
      assessment.handoff.acceptedForRiskConsumption,
    storageWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}

export function decodeRiskAdjustmentQualityEnvelopeRecord(
  body: string,
): RiskAdjustmentQualityEnvelopeRecordEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('risk_adjustment_quality_record_payload_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('risk_adjustment_quality_record_payload_invalid');
  }

  const row = parsed as Partial<RiskAdjustmentQualityEnvelopeRecordEnvelope>;
  const envelope = row.envelope as
    | RiskAdjustmentUpstreamQualityEnvelope
    | undefined;
  if (!envelope) {
    throw new Error('risk_adjustment_quality_record_payload_invalid');
  }

  const assessment =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope);
  if (assessment.status === 'invalid') {
    throw new Error('risk_adjustment_quality_record_payload_invalid');
  }

  const payload: RiskAdjustmentQualityEnvelopeRecordPayload = Object.freeze({
    contractVersion: RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_VERSION,
    kind: 'upstream-quality-envelope',
    variableId: envelope.variableId,
    producerContractVersion: envelope.producerContractVersion,
    envelopeDigest: String(row.envelopeDigest ?? ''),
    envelope,
    assessmentStatus: assessment.status,
    acceptedForRiskConsumption:
      assessment.handoff.acceptedForRiskConsumption,
  });

  if (
    row.contractVersion !== RISK_ADJUSTMENT_QUALITY_ENVELOPE_RECORD_VERSION
    || row.kind !== 'upstream-quality-envelope'
    || row.variableId !== envelope.variableId
    || row.producerContractVersion !== envelope.producerContractVersion
    || !isSha256(payload.envelopeDigest)
    || payload.envelopeDigest !== sha256Canonical(envelope)
    || row.assessmentStatus !== assessment.status
    || row.acceptedForRiskConsumption
      !== assessment.handoff.acceptedForRiskConsumption
    || !isSha256(row.recordDigest)
    || row.recordDigest !== sha256Canonical(payload)
  ) {
    throw new Error('risk_adjustment_quality_record_payload_invalid');
  }

  objectPath(envelope.variableId, payload.envelopeDigest);

  return Object.freeze({
    ...payload,
    recordDigest: row.recordDigest,
  });
}
