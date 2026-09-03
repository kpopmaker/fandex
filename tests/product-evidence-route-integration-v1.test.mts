import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const artistPageSource = readFileSync(
  new URL('../app/artists/[artistId]/page.tsx', import.meta.url),
  'utf8',
);
const variableSource = readFileSync(
  new URL(
    '../app/components/product/ArtistProductVariableDetail.tsx',
    import.meta.url,
  ),
  'utf8',
);
const detailSource = readFileSync(
  new URL(
    '../app/artists/[artistId]/evidence/[evidenceId]/page.tsx',
    import.meta.url,
  ),
  'utf8',
);

test('Artist route maps selected Variables through the canonical Evidence query', () => {
  assert.match(artistPageSource, /getArtistProductVariableEvidence/);
  assert.match(artistPageSource, /evidenceCollections=/);
  assert.match(variableSource, /<ProductEvidenceList/);
  assert.doesNotMatch(variableSource, /getArtistRecentIssueSignals/);
  assert.doesNotMatch(variableSource, /relatedVariableKey/);
});

test('Evidence detail route resolves via Product query and fails closed with 404', () => {
  assert.match(detailSource, /getArtistProductEvidence\(\{/);
  assert.match(detailSource, /if \(result\.status !== 'ok'\)/);
  assert.match(detailSource, /notFound\(\)/);
  assert.doesNotMatch(detailSource, /getArtistRecentIssueSignals/);
  assert.doesNotMatch(detailSource, /\?\?[^\n]*(evidence|item)/i);
});

test('Evidence back link preserves the existing Variable deep-link contract', () => {
  assert.match(
    detailSource,
    /\?variables=\$\{model\.relation\.relatedVariableId\}#variable-chart/,
  );
  assert.match(variableSource, /id="variable-chart"/);
  assert.match(variableSource, /#variable-chart/);
});
