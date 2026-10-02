import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('privacy route exposes required YouTube and Google policy disclosures', async () => {
  const privacy = await source('app/privacy/page.tsx');

  for (const required of [
    'YouTube API Services',
    'YouTube Terms of Service',
    'Google Privacy Policy',
    'https://www.youtube.com/t/terms',
    'https://policies.google.com/privacy',
    'https://security.google.com/settings/security/permissions',
    'YouTube Authorized Data',
    'refresh',
    '삭제',
  ]) {
    assert.ok(
      privacy.includes(required),
      `privacy policy is missing required disclosure: ${required}`,
    );
  }
});

test('privacy route makes the YouTube consent and Non-Authorized Data retention boundary explicit', async () => {
  const privacy = await source('app/privacy/page.tsx');

  assert.ok(privacy.includes('30 calendar days'));
  assert.ok(privacy.includes('30일 이내에 삭제하거나'));
  assert.ok(
    privacy.includes('Privacy Policy를 확인하고 동의할 수 있는'),
  );
  assert.ok(
    privacy.includes('Production에서 활성화하지 않습니다'),
  );
});

test('privacy route does not claim provider approval or active OAuth collection', async () => {
  const privacy = await source('app/privacy/page.tsx');

  assert.ok(
    privacy.includes('provider approval 없이'),
  );
  assert.ok(
    privacy.includes('현재 public-reaction 범위는 YouTube Authorized Data를'),
  );
  assert.ok(
    privacy.includes('사용하지 않습니다'),
  );
});

test('terms bind YouTube-powered features to YouTube Terms of Service', async () => {
  const terms = await source('app/terms/page.tsx');

  assert.ok(terms.includes('YouTube Terms of Service'));
  assert.ok(terms.includes('https://www.youtube.com/t/terms'));
  assert.ok(terms.includes('YouTube API Services Terms of Service'));
  assert.ok(
    terms.includes('이용자는 YouTube Terms of'),
  );
});

test('legal links are persistently exposed from the root layout footer', async () => {
  const [layout, footer] = await Promise.all([
    source('app/layout.tsx'),
    source('app/components/LegalFooter.tsx'),
  ]);

  assert.ok(layout.includes('<LegalFooter />'));
  assert.ok(footer.includes('href="/privacy"'));
  assert.ok(footer.includes('href="/terms"'));
  assert.ok(footer.includes('https://www.youtube.com/t/terms'));
  assert.ok(footer.includes('https://policies.google.com/privacy'));
});

test('legal pages provide a public developer contact path without embedding secrets', async () => {
  const [privacy, terms] = await Promise.all([
    source('app/privacy/page.tsx'),
    source('app/terms/page.tsx'),
  ]);

  for (const content of [privacy, terms]) {
    assert.ok(
      content.includes('https://github.com/kpopmaker/fandex/issues'),
    );
    assert.equal(/access_token=|refresh_token=|client_secret=|api_key=/i.test(content), false);
  }
});
