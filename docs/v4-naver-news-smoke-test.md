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

Success criteria:

- HTTP status is `200`.
- `source` is `naver_news`.
- `items` is an array.
- `items.length > 0`.
- First item includes `title`, `summary`, `sourceName`, `publishedAt`,
  `importanceScore`, and preferably `url`.
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
- Raw HTML tags are not visible in rendered news text.
- Dev server logs do not show new errors or warnings.

## Status Code Meaning

- `200`: Naver News real-data connection succeeded.
- `502`: Environment variables were read, but the Naver API request failed.
  Check Naver API key validity, product access, quota, upstream status, and
  request parameters.
- `503`: Naver credentials are not configured in the running dev server process.
  Check `.env.local` location, exact variable names, non-empty values, and
  whether the dev server was restarted from the project root.
- `400`: Request did not include a usable `q` or known v4 `artistId`.

## Pre-Production Manual Check

1. Confirm `.env.local` exists in the project root and contains the required
   variable names with non-empty values.
2. Restart the dev server from the project root.
3. Call the five API smoke test URLs and confirm the API success criteria.
4. Open the five artist page URLs and confirm the page success criteria.
5. Check terminal logs for errors or warnings.
6. Confirm no API keys or `.env.local` values were copied into test output,
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
