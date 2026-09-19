import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IU_LUMINATE_BASELINE_ACQUISITION_BOUNDARY_RESEARCH,
  IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_DESCRIPTOR,
  IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH,
} from '../lib/alternative-evidence/iuLuminateBaselineAcquisitionResearch';
import { IU_PIECES_RELEASE_ID } from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import { IU_THE_WINNING_RELEASE_ID } from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

test('The Winning is current and Pieces is the first chronological eligible baseline candidate', () => {
  const targets = IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH;
  assert.equal(targets[0].fandexReleaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(targets[0].role, 'current');
  assert.equal(targets[1].fandexReleaseId, IU_PIECES_RELEASE_ID);
  assert.equal(targets[1].role, 'baseline-candidate');
  assert.equal(targets[1].acquisitionState, 'first-baseline-candidate');
  assert.equal(targets[1].releaseDate, '2021-12-29');
});

test('candidate order does not preselect a normalization baseline without comparable Luminate observations', () => {
  assert.equal(IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_DESCRIPTOR.baselinePreselectionWithoutObservation, false);
  assert.equal(IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_DESCRIPTOR.missingCandidateObservationMayBecomeZero, false);
  assert.equal(IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_DESCRIPTOR.territoryMustBeSingleLane, true);
  assert.deepEqual(IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_DESCRIPTOR.allowedTerritories, ['US', 'CA']);
});

test('bounded fallbacks are Pieces then LILAC then Love poem, never Modern Times by modeled-catalog accident', () => {
  const baselineTitles = IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH
    .filter((target) => target.role === 'baseline-candidate')
    .map((target) => target.canonicalTitle);
  assert.deepEqual(baselineTitles, ['Pieces', 'LILAC', 'Love poem']);
  assert.equal(IU_LUMINATE_BASELINE_ACQUISITION_BOUNDARY_RESEARCH.state,
    'identity-extension-required-before-earlier-search');
  assert.match(IU_LUMINATE_BASELINE_ACQUISITION_BOUNDARY_RESEARCH.reason, /Modern Times must not be selected/);
});
