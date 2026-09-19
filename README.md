# PSSBLfork — stat-site, rebranded as a PCBL proposal

A static fork of the **Puget Sound Senior Baseball League** website (pssbl.com),
captured September 2026, with the site chrome rebranded to the **Pacific Coast
Baseball League** (PCBL, the LA adult league at pcbl.com/la-league).

Everything you do matters. This is a **proposal build** — a low-cost, zero-
maintenance way for the PCBL to get a cleaner stats/data site — not a
claim to own anything that belongs to the league it was forked from.

---

## What this repo is

The full client-side AngularJS 1.6 SPA of pssbl.com, mirrored verbatim:

```
index.html            app entry point (ng-app="pcblApp")
partials/             ~54 route templates
js/                   controllers, services, filters, directives
css/                  stylesheets (StyleSheet, pcbl, helpbot, tablet)
img/                  logos, banners, draft board, clipart, ad art
lib/                  ng-ckeditor.js
data/library.json     article index (249 content entries)
data/articles/        259 archived article pages
data/history/         division history pages
data/adList.json      sponsor ad list
data/marketList.json  marketplace ad list
```

Everything the browser needs is served statically — no build step. External
libraries (Angular, Bootstrap, ui-bootstrap, Braintree, CKEditor, Font Awesome)
load from the same CDNs the original uses.

## What was rebranded (and what deliberately was not)

**Changed to PCBL** — site chrome only:

- `index.html` title/meta/OG, favicon (`img/PCBL_favicon.png`), apple-touch icon
- `partials/header.html` — logo (`img/PCBL_header_logo.png`), banner
  (`img/PCBL_banner.png`), nav labels (About the PCBL / League Staff / Hall of
  Fame), social icons → PCBL's real Facebook / Instagram / YouTube / Flickr,
  contact line → info@pcbl.org
- `partials/footer.html` — `img/PCBL_footer_logo.png`, outside links, copyright
- `partials/home.html`, `league.html`, `division.html`, `event.html`,
  `market.html`, `media.html`, `chat.html` — page titles, copy, the Twitter
  embed replaced with a "PCBL Around the Web" social link well
- Form/account partials (signup, register, login, draft, free-agent, waiver,
  career, admin pages) — brand text, support emails → info@pcbl.org, the
  Seattle PO Box lines → "contact info@pcbl.org for the mailing address"
- `css/pssbl.css` → `css/pcbl.css`
- `js/` — module id `pssblApp` → `pcblApp`, `dataFactory.configure("PSSBL.COM")`
  guard label, helpbot strings, ICS `PRODID`/`UID`/`ORGANIZER`, admin copy
- All asset/data paths made relative (`/data/…` → `data/…`, `/img/…` →
  `img/…`) so the whole tree serves from a repo subpath on GitHub Pages.

**Deliberately kept as-is** — do not "clean these up," they are intentional:

- `data/` (`library.json`, `articles/`, `history/`, `config.json`) — archived
  verbatim. It is the PSSBL's content and history; a proposal build does not
  rewrite the source league's pages.
- `js/services/data-factory.js` — the PSSBL.COM endpoint picker and every API
  base URL (`fetchData.php`, `admin.php`, `payment.php`, `support.php`) stay
  functional. As forked, read-only surfaces hit the live pssbl.com endpoints;
  login/registration/payment will not work against your own backend until this
  is repointed.
- Amazon affiliate links (`tag=pssbl-20`) and the Loyaltee merch-store link in
  `partials/home.html` — keep the PSSBL's revenue streams attached to their own
  tracking tags. Do not redirect them.
- `partials/test.html` — dev debug page, left untouched.
- Article hot-links to `pssbl.com/data/upload/...` videos — external, untouched.

## Run it locally

```sh
python -m http.server 8000 --directory .
# open http://localhost:8000
```

No build, no dependencies.

## Before this becomes a real site (if the PCBL wants it)

1. **Point the API at your own backend.** `dataFactory.configure(...)` and the
   season constants in `js/services/data-factory.js`. As long as this points at
   pssbl.com, the fork keeps reading their public endpoints — fine for the
   read-only proposal, wrong for a live site.
2. **Replace `info@pcbl.org`** (used across partials/admin) with whatever
   mailbox actually owns the inbox. Left as the league's published public
   address.
3. **Swap the editorially-odd leftover Seattle bits** you care about (the
   header's commented survey line, `img/clipart/safeco.jpg` in the event page)
   — left in because the fork is a mirror, not a redesign.
4. **Your own backend for auth/payments** if the goal is a full replacement.

## Licensing / ownership

The site content, league marks, logos, articles and data belong to the Puget
Sound Senior Baseball League (and, for the rebranded chrome, reference the
Pacific Coast Baseball League). This fork is for development/evaluation and is
published under the original fork's name so nobody mistakes it for an official
PCBL/PSSBL site. Do not present the archived data as your own, and do not run
this under the PSSBL branding.

Connect the dots. Everything here is NFA. ez.