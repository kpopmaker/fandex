import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const variableSource = readFileSync(
  new URL('../app/components/product/ArtistProductVariableDetail.tsx', import.meta.url),
  'utf8',
);
const evidencePageSource = readFileSync(
  new URL('../app/artists/[artistId]/evidence/[evidenceId]/page.tsx', import.meta.url),
  'utf8',
);
const evidenceContractSource = readFileSync(
  new URL('../lib/product/contracts/productEvidence.ts', import.meta.url),
  'utf8',
);
const storedEvidenceQuerySource = readFileSync(
  new URL('../lib/product/queries/getArtistProductStoredEvidenceJob.ts', import.meta.url),
  'utf8',
);

test('Candidate A preserves truth semantics without fallback or methodology changes', () => {
  assert.match(variableSource, /Product 시계열/);
  assert.match(variableSource, /현재 8시간 window · 확인 불가/);
  assert.doesNotMatch(variableSource, /currentWindow\?\.slotEvidence\.length \?\? 0/);
  assert.match(evidencePageSource, /Evidence lineage · Shadow/);
  assert.doesNotMatch(evidencePageSource, /Source publication: Shadow/);
  assert.match(evidenceContractSource, /collectionLifecycle: 'shadow'/);
  assert.doesNotMatch(
    evidenceContractSource,
    /ProductStoredEvidenceJobReadModel[\s\S]*publication: ProductPublication/,
  );
  assert.match(storedEvidenceQuerySource, /collectionLifecycle: 'shadow' as const/);
  assert.doesNotMatch(storedEvidenceQuerySource, /readLegacyProductVariable|synthetic|preview/i);
});
