import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('musicAlbumPoint current runtime performs a durable reported-web read without converting it into a direct-provider observation', () => {
  const source = readFileSync(
    new URL(
      '../lib/server/product/musicAlbumPointCurrentRuntimeRead.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU/,
  );
  assert.match(source, /reportedWebStoredEvidence/);
  assert.match(
    source,
    /reportedWebDurableReadState/,
  );
  assert.match(
    source,
    /reportedWebDurableEvidenceCount/,
  );
  assert.match(
    source,
    /repository-current-state\+reported-web-durable-read/,
  );

  assert.match(source, /albumObservations: \[\]/);
  assert.doesNotMatch(
    source,
    /reportedWebStoredEvidence[\s\S]{0,500}albumObservations:/,
  );
});

test('reported-web durable state does not claim Production activation or invent a Product score in the current runtime reader', () => {
  const source = readFileSync(
    new URL(
      '../lib/server/product/musicAlbumPointCurrentRuntimeRead.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /reportedWebStoredEvidence[\s\S]{0,1000}(?:productActivationAuthorized:\s*true|numericProductEligible:\s*true|productValue:\s*\d)/,
  );
});
