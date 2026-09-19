import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getProductEvidencePresentation } from '../lib/product/presentation/productEvidencePresentation';

const listSource = readFileSync(
  new URL('../app/components/product/ProductEvidenceList.tsx', import.meta.url),
  'utf8',
);

const detailSource = readFileSync(
  new URL(
    '../app/artists/[artistId]/evidence/[evidenceId]/page.tsx',
    import.meta.url,
  ),
  'utf8',
);

const launchSurfaceSource = `${listSource}\n${detailSource}`;

test('Evidence presentation derives public labels from Product truth axes', () => {
  assert.deepEqual(
    getProductEvidencePresentation({
      presentation: 'preview',
      dataOrigin: 'synthetic',
    }),
    {
      presentationLabel: '미리보기',
      dataOriginLabel: '합성 데이터',
      disclosureText:
        '이 자료는 연결된 합성 미리보기 근거입니다. 실제 관측 데이터나 공식 발표 목록으로 해석하지 않습니다.',
    },
  );

  assert.deepEqual(
    getProductEvidencePresentation({
      presentation: 'standard',
      dataOrigin: 'observed',
    }),
    {
      presentationLabel: '표준 표시',
      dataOriginLabel: '관측 데이터',
      disclosureText: '표시 상태: 표준 표시 · 데이터 유형: 관측 데이터',
    },
  );
});

test('Evidence list exposes truthful state and an artist-scoped CTA', () => {
  assert.match(listSource, /관련 근거/);
  assert.match(listSource, /getProductEvidencePresentation/);
  assert.match(listSource, /presentationLabel/);
  assert.match(listSource, /dataOriginLabel/);
  assert.doesNotMatch(listSource, />\s*미리보기\s*</);
  assert.doesNotMatch(listSource, />\s*합성 데이터\s*</);
  assert.match(listSource, /근거 보기/);
  assert.match(
    listSource,
    /\/artists\/\$\{evidence\.identity\.artistId\}\/evidence\/\$\{evidence\.identity\.evidenceId\}/,
  );
  assert.match(listSource, /break-words/);
  assert.match(listSource, /min-w-0/);
});

test('Evidence detail shows only supported source and time semantics', () => {
  assert.match(detailSource, /getProductEvidencePresentation/);
  assert.match(detailSource, /evidencePresentation\.presentationLabel/);
  assert.match(detailSource, /evidencePresentation\.dataOriginLabel/);
  assert.match(detailSource, /evidencePresentation\.disclosureText/);
  assert.doesNotMatch(detailSource, />\s*미리보기\s*</);
  assert.doesNotMatch(detailSource, />\s*합성 데이터\s*</);

  assert.match(detailSource, /관련 아티스트/);
  assert.match(detailSource, /관련 변수/);
  assert.match(detailSource, /출처/);
  assert.match(detailSource, /데이터 기준/);
  assert.match(detailSource, /관측 시점 미확정/);
  assert.doesNotMatch(detailSource, /providerPeriod/);
  assert.doesNotMatch(detailSource, /sourceUrl/);
  assert.doesNotMatch(detailSource, /원문 보기/);
});

test('Evidence launch copy contains no causal or unproven quality claim', () => {
  for (const prohibitedCopy of [
    '상승 원인',
    '핵심 원인',
    'Main Driver',
    'Contribution',
    'Verified',
    'Trusted',
    'Strong Evidence',
  ]) {
    assert.equal(launchSurfaceSource.includes(prohibitedCopy), false);
  }
});