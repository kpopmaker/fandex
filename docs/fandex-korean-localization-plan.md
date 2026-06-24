# FANDEX Korean Localization Plan

Status: MVP localization structure. FANDEX now presents the core public pages in
Korean by default and offers a lightweight KO/EN toggle without locale routes or
external i18n packages.

## Why Korean Default Is Needed

FANDEX is currently aimed at Korean consumers, K-pop fans, entertainment
marketers, and industry watchers. The product value is easier to understand when
the first-view positioning, free search boundary, paid category gate, sample
report, and Early Access CTA read like a domestic Korean service.

The default copy should make this clear:

1. FANDEX analyzes K-pop and entertainment industry issues, fandom, brand, and
   activity signals with data.
2. Free search is limited to basic artist information, a partial FANDEX score,
   and issue tone preview.
3. Music/album, news/issue, SNS/fandom, brand-fit, comparison, AI
   interpretation, and weekly reports are subscriber research categories.

## Language Direction

Default language: KO.

Secondary language: EN.

The current MVP does not introduce full i18n routing. It keeps the existing
routes and uses a small client-side toggle to switch visible copy on the page.

## Applied Routes

This localization pass applies to the core routes:

1. `/`
2. `/search`
3. `/sample-report`
4. `/research`

The main navigation also includes a KO/EN toggle next to the theme toggle.

## KO/EN Toggle

The toggle is implemented with a small client component:

1. Default value is KO.
2. Clicking switches between KO and EN.
3. The selected value is saved to `localStorage` with the key
   `fandex-language`.
4. The component writes `document.documentElement.dataset.language`.
5. Page copy uses lightweight KO/EN spans and CSS state based on
   `html[data-language='en']`.

This avoids adding `/ko`, `/en`, middleware, proxy, next-intl, i18next, or a
translation management layer during the MVP stage.

## Not Done Yet

This step does not implement:

1. Full i18n routing.
2. Locale-specific URLs.
3. SEO `hreflang`.
4. Full translation management.
5. External i18n package.
6. Locale-aware metadata.
7. Full app-wide translation coverage.

## Next TODO

1. Normalize translation copy into shared objects.
2. Localize metadata.
3. Localize OG title and description.
4. Structure i18n at the component level.
5. Review copy with real Korean user feedback.
6. Apply the final FANDEX v1 terminology after the scoring formula is fixed.
