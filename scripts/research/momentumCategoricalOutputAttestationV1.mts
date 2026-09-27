import { readFile } from 'node:fs/promises';

import {
  buildFandexMomentumCategoricalOutputAttestation,
  type MomentumCurrentDualSourceEvaluationEvidence,
} from '../../lib/intelligence/fandexMomentumCategoricalOutputAttestation';

const EVIDENCE_URL = new URL(
  '../../data/momentum-product/iu_momentum_current_dual_source_evaluation_v1.json',
  import.meta.url,
);

const raw = await readFile(EVIDENCE_URL, 'utf8');
const evidence = JSON.parse(raw) as MomentumCurrentDualSourceEvaluationEvidence;
const attestation =
  buildFandexMomentumCategoricalOutputAttestation(evidence);

process.stdout.write(
  'FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION='
    + JSON.stringify(attestation)
    + '\n',
);
