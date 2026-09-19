import {
  artistIndexChartProfiles,
  type ArtistIndexChartProfile,
} from '../../../app/data/v4/charts/artistIndexChartData';
import {
  getArtistRecentIssueSignals,
  type PreviewIssueSignal,
} from '../../../app/data/v4/charts/issueSignals';
import type {
  ProductEvidenceDataIssue,
  ProductEvidenceReadModel,
  ProductEvidenceReadModelResult,
} from '../contracts/productEvidence';
import { PRODUCT_VARIABLE_DEFINITION_BY_ID } from '../variables/productVariableDefinitions';

export type ArtistProductEvidenceInput = Readonly<{
  artistId: string;
  evidenceId: string;
}>;

export type ProductEvidenceRuntime = Readonly<{
  getArtistProfile: (artistId: string) => ArtistIndexChartProfile | undefined;
  getArtistIssueSignals: (
    artistId: string,
    limit?: number,
  ) => readonly PreviewIssueSignal[];
}>;

const PRODUCT_EVIDENCE_ID_PATTERN =
  /^([a-z0-9]+(?:-[a-z0-9]+)*)-issue-(\d{2})$/;

const defaultRuntime: ProductEvidenceRuntime = Object.freeze({
  getArtistProfile: (artistId: string) =>
    artistIndexChartProfiles.find((profile) => profile.artistId === artistId),
  getArtistIssueSignals: (artistId: string, limit?: number) =>
    getArtistRecentIssueSignals(artistId, limit),
});

function dataIssue(code: ProductEvidenceDataIssue['code']) {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([Object.freeze({ code })]),
  });
}

export type ProductEvidenceIdentityValidation =
  | Readonly<{
      status: 'valid';
      evidenceId: string;
      sourceArtistId: string;
    }>
  | Readonly<{
      status: 'invalid';
      rawEvidenceId: string;
    }>;

export function validateProductEvidenceId(
  rawEvidenceId: string,
): ProductEvidenceIdentityValidation {
  const evidenceId = rawEvidenceId.trim();
  const match = PRODUCT_EVIDENCE_ID_PATTERN.exec(evidenceId);
  const sourceArtistId = match?.[1];
  const ordinal = Number(match?.[2]);

  if (!sourceArtistId || ordinal < 1 || ordinal > 10) {
    return Object.freeze({ status: 'invalid', rawEvidenceId });
  }

  return Object.freeze({
    status: 'valid',
    evidenceId,
    sourceArtistId,
  });
}

function getSourceLabel(sourceType: PreviewIssueSignal['sourceType']) {
  return sourceType === 'editorial_seed'
    ? '에디토리얼 시드'
    : '미리보기 이슈 신호';
}

function mapIssueSignalToProductEvidence(
  profile: ArtistIndexChartProfile,
  issue: PreviewIssueSignal,
): ProductEvidenceReadModel | null {
  const variableDefinition = PRODUCT_VARIABLE_DEFINITION_BY_ID.get(
    issue.relatedVariableKey,
  );

  if (!variableDefinition || issue.relatedArtistName !== profile.artistName) {
    return null;
  }

  return Object.freeze({
    identity: Object.freeze({
      evidenceId: issue.id,
      artistId: profile.artistId,
    }),
    artist: Object.freeze({
      artistId: profile.artistId,
      displayName: profile.artistName,
    }),
    relation: Object.freeze({
      relatedVariableId: variableDefinition.variableId,
      relatedSourceVariableKey: issue.relatedVariableKey,
      relatedVariableName: variableDefinition.displayName,
    }),
    title: issue.title,
    summary: issue.summary,
    dataOrigin: 'synthetic' as const,
    presentation: 'preview' as const,
    source: Object.freeze({
      sourceType: issue.sourceType,
      sourceLabel: getSourceLabel(issue.sourceType),
    }),
    time: Object.freeze({
      observationTime: Object.freeze({ kind: 'unknown' as const }),
      sourceTimeLabel: issue.dateLabel,
    }),
  });
}

export function getArtistProductEvidence(
  input: ArtistProductEvidenceInput,
  runtime: ProductEvidenceRuntime = defaultRuntime,
): ProductEvidenceReadModelResult {
  const identity = validateProductEvidenceId(input.evidenceId);

  if (identity.status === 'invalid') {
    return dataIssue('invalid-evidence-identity');
  }

  const artistId = input.artistId.trim();

  if (identity.sourceArtistId !== artistId) {
    return dataIssue('artist-evidence-mismatch');
  }

  const profile = runtime.getArtistProfile(artistId);

  if (!profile) {
    return dataIssue('artist-not-found');
  }

  const issue = runtime
    .getArtistIssueSignals(profile.artistId, 100)
    .find((candidate) => candidate.id === identity.evidenceId);

  if (!issue) {
    return dataIssue('evidence-not-found');
  }

  const model = mapIssueSignalToProductEvidence(profile, issue);

  return model
    ? Object.freeze({ status: 'ok', model })
    : dataIssue('source-state-conflict');
}

export function getArtistProductEvidenceStaticParams() {
  return artistIndexChartProfiles.flatMap((profile) =>
    getArtistRecentIssueSignals(profile.artistId, 100).map((issue) => ({
      artistId: profile.artistId,
      evidenceId: issue.id,
    })),
  );
}
