import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { LastfmRealSignalReadModel, LastfmRealSignalSourceBundle } from './contracts';
import { buildLastfmRealSignalReadModel } from './readModel';

const LASTFM_DATA_DIRECTORY = join(process.cwd(), 'data', 'lastfm-cloud');

const SOURCE_FILES = Object.freeze({
  historyCsv: 'lastfm_artist_interest_history_v1.csv',
  deltaCsv: 'lastfm_global_interest_delta_v1_latest.csv',
  scoreCsv: 'lastfm_global_interest_score_preview_v1_latest.csv',
  statusJson: 'lastfm_cloud_status_latest.json',
});

export async function readLastfmRealSignalSourceBundle(): Promise<LastfmRealSignalSourceBundle> {
  const [historyCsv, deltaCsv, scoreCsv, statusJson] = await Promise.all([
    readFile(join(LASTFM_DATA_DIRECTORY, SOURCE_FILES.historyCsv), 'utf8'),
    readFile(join(LASTFM_DATA_DIRECTORY, SOURCE_FILES.deltaCsv), 'utf8'),
    readFile(join(LASTFM_DATA_DIRECTORY, SOURCE_FILES.scoreCsv), 'utf8'),
    readFile(join(LASTFM_DATA_DIRECTORY, SOURCE_FILES.statusJson), 'utf8'),
  ]);

  return Object.freeze({ historyCsv, deltaCsv, scoreCsv, statusJson });
}

export async function readLastfmRealSignalReadModel(): Promise<LastfmRealSignalReadModel> {
  return buildLastfmRealSignalReadModel(await readLastfmRealSignalSourceBundle());
}
