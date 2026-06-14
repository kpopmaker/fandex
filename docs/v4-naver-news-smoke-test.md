# FANDEX v4 Naver News Smoke Test

This checklist verifies that the v4 Naver News real-data path is connected
without exposing API credentials.

## Environment

Create `.env.local` in the project root with these variable names:

```env
NAVER_NEWS_CLIENT_ID=
NAVER_NEWS_CLIENT_SECRET=
```

Do not commit `.env.local` or paste the values into logs, issues, docs, or PR
descriptions. Restart the dev server after changing environment variables.

## API Smoke Test URLs

Run these against the local dev server:

- `http://localhost:3000/api/v4/news?artistId=aespa&display=6`
- `http://localhost:3000/api/v4/news?artistId=ive&display=6`
- `http://localhost:3000/api/v4/news?artistId=riize&display=6`
- `http://localhost:3000/api/v4/news?artistId=lesserafim&display=6`
- `http://localhost:3000/api/v4/news?artistId=newjeans&display=6`

Supported query parameters:

- `artistId`: v4 artist id. Used to build the configured artist news query.
- `q`: raw search query. Used when `artistId` is not provided.
- `display`: result count, clamped to `1-100`.
- `start`: pagination start offset, clamped to `1-1000`.
- `sort`: `date` by default, or `sim`.

Pagination smoke test examples:

- `http://localhost:3000/api/v4/news?artistId=aespa&display=3&start=1`
- `http://localhost:3000/api/v4/news?artistId=aespa&display=3&start=4`

Success criteria:

- HTTP status is `200`.
- `source` is `naver_news`.
- `items` is an array.
- `items.length > 0`.
- First item includes `title`, `summary`, `sourceName`, `publishedAt`,
  `importanceScore`, and preferably `url`.
- `start` in the response reflects the requested pagination start offset.
- `sourceName` is derived from the original article link hostname when
  available. It is not hard-coded to `Naver`.
- `title` and `summary` do not expose raw HTML tags such as `<b>`.

## Artist Page Smoke Test URLs

Run these against the local dev server:

- `http://localhost:3000/artists/aespa`
- `http://localhost:3000/artists/ive`
- `http://localhost:3000/artists/riize`
- `http://localhost:3000/artists/lesserafim`
- `http://localhost:3000/artists/newjeans`

Success criteria:

- Page status is `200`.
- Latest news section renders.
- Latest news is real Naver News, not mock fallback.
- News title, summary, published time, and source display without layout breakage.
- News cards and the news modal show `sourceStatus` badges when available.
- The news modal shows an `Open source` link when the item has a source URL.
- Raw HTML tags are not visible in rendered news text.
- Dev server logs do not show new errors or warnings.

## Standard Error Response

Error responses use this shape:

```json
{
  "ok": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

`details` is optional and appears only when extra context is useful.

## Status Code Meaning

- `200`: Naver News real-data connection succeeded.
- `502`: Environment variables were read, but the Naver API request failed.
  Check Naver API key validity, product access, quota, upstream status, and
  request parameters.
  - Error code: `upstream_error`
- `503`: Naver credentials are not configured in the running dev server process.
  Check `.env.local` location, exact variable names, non-empty values, and
  whether the dev server was restarted from the project root.
  - Error code: `missing_credentials`
  - `details.requiredEnv` lists the required variable names.
- `400`: Request did not include a usable `q` or known v4 `artistId`.
  - Error code: `missing_query`
  - `details.availableArtistIds` lists available v4 artist ids.

## Pre-Production Manual Check

1. Confirm `.env.local` exists in the project root and contains the required
   variable names with non-empty values.
2. Restart the dev server from the project root.
3. Call the five API smoke test URLs and confirm the API success criteria.
4. Call the pagination smoke test URLs and confirm the response `start` values.
5. Open the five artist page URLs and confirm the page success criteria.
6. Open at least one news modal and confirm the `sourceStatus` badge and
   `Open source` link behavior.
7. Check terminal logs for errors or warnings.
8. Confirm no API keys or `.env.local` values were copied into test output,
   commits, docs, issue comments, screenshots, or PR descriptions.

## Latest Verified Result

The first real-connection smoke test passed for:

- `aespa`: API `200`, `items.length=6`, artist page `200`, real news rendered.
- `ive`: API `200`, `items.length=6`, artist page `200`, real news rendered.
- `riize`: API `200`, `items.length=6`, artist page `200`, real news rendered.
- `lesserafim`: API `200`, `items.length=6`, artist page `200`, real news rendered.
- `newjeans`: API `200`, `items.length=6`, artist page `200`, real news rendered.

No raw HTML tag exposure was observed, and no dev server error or warning was
observed during the smoke test.

Additional verified behavior:

- `start=1` and `start=4` pagination smoke tests returned the requested `start`
  values with `items.length=3`.
- `sourceName` was verified as article-link based, including examples such as
  `Yonhap News`, `Topstarnews`, and `BreakNews`.
- News cards and modals show `sourceStatus` badges.
- News modals show `Open source` links when source URLs are available.
