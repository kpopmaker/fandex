import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('current FANDEX runtime routes News Blob evidence through the approved Product public-route selector', async () => {
  const source = await readFile(
    new URL(
      '../lib/server/product/fandexCurrentRuntimeAssemblyReadiness.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /getArtistProductVariablePublicRoute\([\s\S]*artistId:\s*'iu'[\s\S]*variableId:\s*'newsIssuePoint'[\s\S]*readNewsIssuePointReal:\s*getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot/,
  );
  assert.doesNotMatch(
    source,
    /getMusicAlbumPointCurrentRuntimeForIU\(\),\s*getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot\(\),/,
  );
});
