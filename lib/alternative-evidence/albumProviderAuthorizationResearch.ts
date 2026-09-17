export const ALBUM_PROVIDER_AUTHORIZATION_RESEARCH_CONTRACT_VERSION =
  'album-provider-authorization-research-v1' as const;

export const HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_PROVIDER_AUTHORIZATION_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  providerId: 'hanteo-chart' as const,
  officialInquiryEntry: 'https://www.hanteochart.com/ko/about' as const,
  officialInquiryForm:
    'https://resource.hanteochart.io/qna/%ED%95%9C%ED%84%B0%EC%B0%A8%ED%8A%B8_%EB%AC%B8%EC%9D%98%EC%8B%A0%EC%B2%AD%EC%84%9C.docx' as const,
  directProductContributionEligible: false as const,
  productionEligible: false as const,
  semantics: 'provider-authorization-and-contract-clarification-request' as const,
});

export type AuthorizationAnswer = 'allowed' | 'allowed-with-conditions' | 'not-allowed' | 'not-addressed';
export type SemanticsAnswer = 'verified' | 'partially-verified' | 'not-verified' | 'not-addressed';

export type AlbumProviderAuthorizationResponse = Readonly<{
  acquisition: AuthorizationAnswer;
  automatedAccess: AuthorizationAnswer;
  normalizedStorage: AuthorizationAnswer;
  retention: AuthorizationAnswer;
  commercialUse: AuthorizationAnswer;
  derivedPublication: AuthorizationAnswer;
  rawRedistribution: AuthorizationAnswer;
  providerPeriodDefinition: SemanticsAnswer;
  historicalQueryContract: SemanticsAnswer;
  revisionPolicy: SemanticsAnswer;
  responseEvidenceId: string | null;
}>;

export const HANTEO_AUTHORIZATION_QUESTIONS = Object.freeze([
  'May FANDEX programmatically access Hanteo Physical Album Chart data for recurring data collection?',
  'If an API or licensed data feed is required, what product, authentication method, rate limit, and commercial terms apply?',
  'May FANDEX store normalized chart observations including artist, release, chart period, rank, and physical-album sales units?',
  'What retention period is permitted for normalized observations and derived aggregates?',
  'May FANDEX use the normalized data in a commercial K-pop intelligence product?',
  'May FANDEX publish derived metrics or scores based on the licensed observations, with Hanteo attribution and without redistributing raw payloads?',
  'Is redistribution of raw Hanteo payloads or raw chart data prohibited or separately licensed?',
  'For weekly Physical Album Chart observations, what exact KST cutoff/start/end rules define the provider period?',
  'Is historical weekly data available through an authorized API/feed, and what date range is supported?',
  'How are late retailer transmissions, corrections, and revised sales totals represented, and should clients replace or append revised observations?',
] as const);

export type AlbumProviderAuthorizationAssessment = Readonly<{
  state: 'eligible-for-onboarding-review' | 'blocked';
  rightsResolved: boolean;
  semanticsResolved: boolean;
  blockers: readonly string[];
}>;

const allowed = (value: AuthorizationAnswer) =>
  value === 'allowed' || value === 'allowed-with-conditions';

export function evaluateAlbumProviderAuthorizationResponse(
  response: AlbumProviderAuthorizationResponse,
): AlbumProviderAuthorizationAssessment {
  const blockers: string[] = [];
  const requiredRights: readonly [keyof AlbumProviderAuthorizationResponse, string][] = [
    ['acquisition', 'provider-acquisition-rights-unresolved'],
    ['automatedAccess', 'provider-automation-rights-unresolved'],
    ['normalizedStorage', 'provider-normalized-storage-rights-unresolved'],
    ['retention', 'provider-retention-rights-unresolved'],
    ['commercialUse', 'provider-commercial-use-rights-unresolved'],
    ['derivedPublication', 'provider-derived-publication-rights-unresolved'],
  ];

  for (const [key, blocker] of requiredRights) {
    const value = response[key];
    if (typeof value !== 'string' || !allowed(value as AuthorizationAnswer)) blockers.push(blocker);
  }

  if (response.rawRedistribution === 'not-addressed') {
    blockers.push('provider-raw-redistribution-policy-unresolved');
  }
  if (response.providerPeriodDefinition !== 'verified') {
    blockers.push('provider-period-definition-unresolved');
  }
  if (response.historicalQueryContract !== 'verified') {
    blockers.push('provider-historical-query-contract-unresolved');
  }
  if (response.revisionPolicy !== 'verified') {
    blockers.push('provider-revision-policy-unresolved');
  }
  if (!response.responseEvidenceId || response.responseEvidenceId.trim() === '') {
    blockers.push('provider-authorization-response-evidence-missing');
  }

  const rightsResolved = !blockers.some((blocker) => blocker.includes('rights') || blocker.includes('redistribution'));
  const semanticsResolved = !blockers.some((blocker) => blocker.startsWith('provider-period-') || blocker.startsWith('provider-historical-') || blocker.startsWith('provider-revision-'));

  return Object.freeze({
    state: blockers.length === 0 ? 'eligible-for-onboarding-review' as const : 'blocked' as const,
    rightsResolved,
    semanticsResolved,
    blockers: Object.freeze([...new Set(blockers)]),
  });
}
