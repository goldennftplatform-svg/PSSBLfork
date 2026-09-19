# PSSBL Fork

A static mirror/fork of the **Puget Sound Senior Baseball League** website
(https://www.pssbl.com), captured as it stood in September 2026.

## What's in this repo

Complete client-side application source, mirrored verbatim:

```
index.html            AngularJS 1.6 single-page app entry point
partials/             54 route templates (home, league, team, game, admin, ...)
js/                   app.js, controllers, services, filters, directives
css/                  stylesheets (StyleSheet, pssbl, helpbot, tablet)
img/                  logos, banners, draft board, clipart, textures
lib/                  ng-ckeditor.js
data/library.json     article/blog index (249 content entries)
data/articles/        259 article HTML pages + teasers
data/history/         division history pages
data/adList.json      sponsor ad list
data/marketList.json  marketplace ad list
```

All external libraries (Angular, Bootstrap, ui-bootstrap, Braintree, CKEditor,
Font Awesome) load from the same CDNs the original uses, so no local copies are
needed.

## What is NOT in this repo

The **live data API** is a PHP + database backend that cannot be forked:

- `https://pssbl.com/PHP/fetchData.php`  (scores, standings, rosters, schedules)
- `https://pssbl.com/PHP/admin.php`      (authentication / registration)
- `https://pssbl.com/PHP/payment.php`    (payments, Braintree)
- `https://pssbl.com/PHP/support.php`    (support tickets / messaging)

The API base URL is hard-coded in `js/services/data-factory.js`
(`dataFactory.configure("PSSBL.COM")`). As-forked, the app still reads *live*
data from pssbl.com's public endpoints (read-only surfaces work; login,
registration and the data-entry workflows will not until you point these at
your own backend).

Images embedded in a few articles hot-link to `pssbl.com/data/upload/...` videos
and remain external.

## Run it locally

```sh
python -m http.server 8000 --directory .
# open http://localhost:8000
```

## Things to change before treating this as your own site

1. `dataFactory.configure(...)` in `js/services/data-factory.js` — point the API
   at your own backend, or the fork keeps hammering pssbl.com's servers.
2. `dataFactory.season.*` — current year / dues / draft date constants in the
   same file.
3. Branding: logos, banners, social links in `partials/header.html` /
   `partials/footer.html`.
4. The `img/` favicon is the original league mark (see LICENSE below).

## Licensing / ownership

The site content, league marks, logos, articles and data belong to the Puget
Sound Senior Baseball League. This fork is for development/evaluation purposes;
do not publish it under the PSSBL name/branding or present its data as your own
without the league's permission. The AngularJS application code is mirrored
from the public site and inherits whatever terms the original project carries.