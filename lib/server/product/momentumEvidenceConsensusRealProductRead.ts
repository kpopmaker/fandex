import 'server-only';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../../product/contracts/productMomentumEvidenceConsensus';
import {
  readMomentumEvidenceConsensusShadowProductFromJsonl,
  readMomentumEvidenceConsensusStoredEvidenceFromJsonl,
  type MomentumEvidenceConsensusStoredEvidenceReadResult,
} from '../ingestion/momentumEvidenceConsensusRepository';

const IU_MOMENTUM_EVIDENCE_CONSENSUS_ARTIFACT_PATH = resolve(
  process.cwd(),
  'data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl',
);

async function readIUArtifact(): Promise<string | null> {
  try {
    return await readFile(
      IU_MOMENTUM_EVIDENCE_CONSENSUS_ARTIFACT_PATH,
      'utf8',
    );
  } catch {
    return null;
  }
}

export async function getMomentumEvidenceConsensusShadowProductForIU():
  Promise<ProductMomentumEvidenceConsensusReadModelResult> {
  const jsonl = await readIUArtifact();

  if (jsonl === null) {
    const issues = Object.freeze([
      Object.freeze({
        code: 'runtime-read-failed' as const,
      }),
    ]) as readonly [
      Readonly<{ code: 'runtime-read-failed' }>,
    ];
    return Object.freeze({
      status: 'data-issue' as const,
      issues,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    });
  }

  return readMomentumEvidenceConsensusShadowProductFromJsonl({
    artistId: 'iu',
    jsonl,
  });
}

export async function getMomentumEvidenceConsensusStoredEvidenceForIU(
  carrierRecordId: string,
): Promise<MomentumEvidenceConsensusStoredEvidenceReadResult> {
  const jsonl = await readIUArtifact();

  if (jsonl === null) {
    return Object.freeze({
      status: 'data-issue' as const,
      reason: 'history-validation-failed' as const,
    });
  }

  return readMomentumEvidenceConsensusStoredEvidenceFromJsonl({
    artistId: 'iu',
    carrierRecordId,
    jsonl,
  });
}
