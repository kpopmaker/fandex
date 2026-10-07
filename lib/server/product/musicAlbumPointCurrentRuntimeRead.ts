import 'server-only';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
} from '../../alternative-evidence/directProviderEvidence';
import {
  adaptMusicChartEvidence,
  type MusicChartCanonicalBinding,
} from '../../alternative-evidence/musicChartEvidenceAdapter';
import {
  appendMusicChartObservationHistory,
  buildMusicChartCurrentReadModel,
} from '../../alternative-evidence/musicChartObservationHistory';
import {
  assessMusicChartCurrentness,
} from '../../alternative-evidence/musicChartCurrentness';
import {
  assessMusicChartSharedCanonicalBindings,
} from '../../alternative-evidence/musicChartCanonicalIdentityBinding';
import {
  buildProductMusicAlbumPointCandidate,
  type ProductMusicAlbumPointCandidateResult,
} from '../../product/contracts/productMusicAlbumPointCandidate';
import {
  evaluateMusicAlbumPointProductReadiness,
  type MusicAlbumPointProductReadiness,
} from '../../product/readiness/musicAlbumPointProductReadiness';
import {
  getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU,
  type MusicAlbumReportedWebStoredEvidenceServerRuntimeResult,
} from './musicAlbumReportedWebStoredEvidenceRuntime';
import {
  REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
  selectReportedAlbumSalesCurrentRelease,
  type ReportedAlbumSalesCurrentReleaseDiscovery,
  type ReportedAlbumSalesCurrentReleaseRead,
} from '../../alternative-evidence/reportedAlbumSalesCurrentRelease';
import {
  evaluateMusicAlbumReportedWebProductReadiness,
  type MusicAlbumReportedWebProductReadiness,
} from '../../product/readiness/musicAlbumReportedWebProductReadiness';

const TARGETS_PATH = resolve(
  process.cwd(),
  'data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json',
);
const CHECK_HISTORY_LATEST_PATH = resolve(
  process.cwd(),
  'data/fandex-cloud-v10/state/music_chart_check_history_v1_latest.json',
);
const CANDIDATES_PATH = resolve(
  process.cwd(),
  'data/fandex-cloud-v10/state/music_chart_artist_candidates_v2_raw_latest.json',
);
const BUGS_PATH = resolve(
  process.cwd(),
  'data/fandex-cloud-v10/state/music_chart_bugs_all_targets_v1_latest.json',
);
const CHECK_HISTORY_CSV_PATH = resolve(
  process.cwd(),
  'data/fandex-cloud-v10/state/music_chart_check_history_v1.csv',
);
const REPORTED_WEB_CURRENT_GAP_PATH = resolve(
  process.cwd(),
  'data/fandex-cloud-v10/product/iu_music_album_current_release_evidence_gap_v1.json',
);

export const MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION =
  'music-album-point-current-runtime-read-v1' as const;

export type MusicAlbumPointCurrentRuntimeReadResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION;
      candidate: ProductMusicAlbumPointCandidateResult;
      readiness: MusicAlbumPointProductReadiness;
      reportedWebStoredEvidence:
        MusicAlbumReportedWebStoredEvidenceServerRuntimeResult;
      reportedWebCurrentRelease:
        ReportedAlbumSalesCurrentReleaseRead;
      reportedWebReadiness:
        MusicAlbumReportedWebProductReadiness;
      evidence: Readonly<{
        sourceKind: 'repository-current-state+reported-web-durable-read';
        latestCheckDate: string;
        currentMusicObservationCount: number;
        albumProviderCount: 2;
        albumObservationCount: 0;
        albumHistoryState: 'research-only';
        reportedWebDurableReadState:
          MusicAlbumReportedWebStoredEvidenceServerRuntimeResult['status'];
        reportedWebDurableEvidenceCount: number;
        reportedWebCurrentReleaseState:
          ReportedAlbumSalesCurrentReleaseRead['status'];
      }>;
    }>
  | Readonly<{
      status: 'data-issue';
      contractVersion:
        typeof MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION;
      reason:
        | 'repository-state-read-failed'
        | 'repository-state-shape-invalid'
        | 'candidate-build-failed';
    }>;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

async function readJson(pathname: string): Promise<unknown> {
  return JSON.parse(await readFile(pathname, 'utf8')) as unknown;
}

function targetBindings(value: unknown): readonly MusicChartCanonicalBinding[] {
  const root = record(value);
  const artists = root?.artists;
  if (!Array.isArray(artists)) {
    throw new Error('music_album_runtime_targets_invalid');
  }

  const bindings = artists.map((entry) => {
    const item = record(entry);
    const canonicalArtistId = item?.canonicalArtistId;
    const artist = item?.artist;
    if (
      typeof canonicalArtistId !== 'string'
      || canonicalArtistId.trim().length === 0
      || typeof artist !== 'string'
      || artist.trim().length === 0
    ) {
      throw new Error('music_album_runtime_target_invalid');
    }
    return Object.freeze({
      canonicalArtistId: canonicalArtistId.trim(),
      artist: artist.trim(),
    });
  });

  return Object.freeze(bindings);
}

function latestCheckDate(value: unknown): string {
  const root = record(value);
  const latest = root?.latestCheckDate;
  if (
    typeof latest !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(latest)
  ) {
    throw new Error('music_album_runtime_latest_check_date_invalid');
  }
  return latest;
}

function collectionHistoryDates(csv: string): readonly string[] {
  const dates = csv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));

  return Object.freeze(
    [...new Set(dates)].sort((left, right) => left.localeCompare(right)),
  );
}

function reportedWebCurrentDiscovery(
  value: unknown,
): ReportedAlbumSalesCurrentReleaseDiscovery {
  const root = record(value);
  const current = record(root?.currentReleaseCandidate);
  const claim = record(root?.reportedHanteoFirstWeekClaim);
  const verification = record(current?.verificationBoundary);
  const evidence = current?.evidenceRefs;

  if (
    root?.canonicalArtistId !== 'iu'
    || root?.asOf === undefined
    || typeof root.asOf !== 'string'
    || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(root.asOf)
    || Number.isNaN(Date.parse(root.asOf))
    || current === null
    || claim === null
    || verification === null
    || verification.currentSelectorEligible !== false
    || typeof current.releaseTitle !== 'string'
    || current.releaseTitle.trim() === ''
    || typeof current.physicalReleaseDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(current.physicalReleaseDate)
    || current.identityState !== 'candidate'
    || current.latestPhysicalReleaseState !== 'candidate-latest'
    || !Array.isArray(evidence)
  ) {
    throw new Error(
      'music_album_runtime_reported_web_current_gap_invalid',
    );
  }

  const evidenceRefs = evidence.map((entry) => {
    const item = record(entry);
    if (
      typeof item?.evidenceId !== 'string'
      || item.evidenceId.trim() === ''
    ) {
      throw new Error(
        'music_album_runtime_reported_web_current_gap_evidence_invalid',
      );
    }
    return item.evidenceId.trim();
  });

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
    canonicalArtistId: 'iu',
    releaseScope: 'physical-album-eligible' as const,
    canonicalReleaseId: null,
    releaseTitle: current.releaseTitle.trim(),
    releaseDate: current.physicalReleaseDate,
    identityState: 'candidate' as const,
    latestReleaseState: 'candidate-latest' as const,
    firstWeekCompletionState: 'unknown' as const,
    providerPeriodStart:
      typeof claim.providerPeriodStart === 'string'
        ? claim.providerPeriodStart
        : null,
    providerPeriodEnd:
      typeof claim.providerPeriodEnd === 'string'
        ? claim.providerPeriodEnd
        : null,
    evidenceRefs: Object.freeze([...new Set(evidenceRefs)].sort()),
    observedAt: null,
    collectedAt: root.asOf,
  });
}

export async function getMusicAlbumPointCurrentRuntimeForIU():
  Promise<MusicAlbumPointCurrentRuntimeReadResult> {
  let targets: unknown;
  let checkHistory: unknown;
  let candidates: unknown;
  let bugs: unknown;
  let historyCsv: string;
  let reportedWebCurrentGap: unknown;
  const reportedWebStoredEvidence =
    await getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU();

  try {
    [targets, checkHistory, candidates, bugs, historyCsv, reportedWebCurrentGap] =
      await Promise.all([
        readJson(TARGETS_PATH),
        readJson(CHECK_HISTORY_LATEST_PATH),
        readJson(CANDIDATES_PATH),
        readJson(BUGS_PATH),
        readFile(CHECK_HISTORY_CSV_PATH, 'utf8'),
        readJson(REPORTED_WEB_CURRENT_GAP_PATH),
      ]);
  } catch {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion: MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION,
      reason: 'repository-state-read-failed' as const,
    });
  }

  let bindings: readonly MusicChartCanonicalBinding[];
  let latest: string;
  let reportedWebDiscovery: ReportedAlbumSalesCurrentReleaseDiscovery;
  try {
    bindings = targetBindings(targets);
    latest = latestCheckDate(checkHistory);
    reportedWebDiscovery = reportedWebCurrentDiscovery(
      reportedWebCurrentGap,
    );
  } catch {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion: MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION,
      reason: 'repository-state-shape-invalid' as const,
    });
  }

  try {
    const reportedWebCurrentRelease =
      selectReportedAlbumSalesCurrentRelease({
        discovery: reportedWebDiscovery,
        currentReleaseBinding: null,
        storedEvidence:
          reportedWebStoredEvidence.status === 'ok'
            ? reportedWebStoredEvidence.evidence
            : [],
      });

    const reportedWebReadiness =
      evaluateMusicAlbumReportedWebProductReadiness(
        reportedWebCurrentRelease,
      );

    const adapted = adaptMusicChartEvidence({
      checkHistoryPayload: checkHistory,
      melonGeniePayload: candidates,
      bugsPayload: bugs,
      bindings,
    });
    const observations = adapted.observations.filter(
      (observation) => observation.canonicalArtistId === 'iu',
    );
    const history = appendMusicChartObservationHistory({
      existing: [],
      observations,
    });
    const music = buildMusicChartCurrentReadModel({
      history,
      asOf: `${latest}T23:59:59+09:00`,
    });
    const candidate = buildProductMusicAlbumPointCandidate({
      artistId: 'iu',
      music,
      musicCurrentness: assessMusicChartCurrentness({
        music,
        collectionHistoryDates: collectionHistoryDates(historyCsv),
      }),
      albumObservations: [],
      albumProviders: [
        CIRCLE_EVIDENCE_DESCRIPTOR,
        HANTEO_EVIDENCE_DESCRIPTOR,
      ],
      musicCanonicalIdentityIntegration: 'external-binding',
      musicCanonicalIdentityBindingAssessment:
        assessMusicChartSharedCanonicalBindings(bindings),
      albumHistoryState: 'research-only',
    });
    const readiness = evaluateMusicAlbumPointProductReadiness(candidate);

    return Object.freeze({
      status: 'ok' as const,
      contractVersion: MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION,
      candidate,
      readiness,
      reportedWebStoredEvidence,
      reportedWebCurrentRelease,
      reportedWebReadiness,
      evidence: Object.freeze({
        sourceKind:
          'repository-current-state+reported-web-durable-read' as const,
        latestCheckDate: latest,
        currentMusicObservationCount: observations.length,
        albumProviderCount: 2 as const,
        albumObservationCount: 0 as const,
        albumHistoryState: 'research-only' as const,
        reportedWebDurableReadState:
          reportedWebStoredEvidence.status,
        reportedWebDurableEvidenceCount:
          reportedWebStoredEvidence.status === 'ok'
            ? reportedWebStoredEvidence.evidenceCount
            : 0,
        reportedWebCurrentReleaseState:
          reportedWebCurrentRelease.status,
      }),
    });
  } catch {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion: MUSIC_ALBUM_POINT_CURRENT_RUNTIME_READ_VERSION,
      reason: 'candidate-build-failed' as const,
    });
  }
}
