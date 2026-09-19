# PROMPTME — README for machines

You are operating on **PSSBLfork**, a static AngularJS 1.6 SPA forked from
pssbl.com (Puget Sound Senior Baseball League) and rebranded as a proposal
build for the Pacific Coast Baseball League (PCBL). This file is the
system-prompt-style contract for any agent/automation touching this repo.
Read it before acting. Everything you do matters.

## Identity
- Public repo/handles: `goldennftplatform-svg`, hWonderOfTheWorld ("Flywheel
  Whisperer"). Mantra: "Connect the dots. Everything here is NFA. ez."
- The build's framing: a **low-cost, cleaner stats/data proposal for the real
  PCBL** (pcbl.com/la-league). It is not an official league site, is not a
  claim of ownership, and must never present PSSBL's archived data as its own.

## Non-negotiables (DO NOT touch)
1. `data/` is an **verbatim archive**: `library.json`, `articles/` (259),
   `history/`, `config.json`. Never rebrand, rewrite, or reformat it. Path
   normalization for Pages hosting is the only sanctioned change (done: `/img/`
   → `img/` in six season articles + HallOfFame, `/data/` → `data/` in JS).
2. **Functional URLs stay live**:
   - `js/services/data-factory.js` `configure("PSSBL.COM")` and all API bases
     (`pssbl.com/PHP/{fetchData,admin,payment,support}.php`, plus the
     `.NET`/`richbonny.space` test hosts).
   - `js/services/helpbot-factory.js` beta.pssbl.com + pssbl.richbonny.space
     fallbacks; `js/controllers/player-controller.js` b-cdn video URL.
   - Amazon `tag=pssbl-20` affiliate links and the
     `stores.loyaltee.com/PSSBL/shop/home` merch link in
     `partials/home.html`, `partials/market.html`. Revenue stays with PSSBL.
3. `partials/test.html` is an untouched dev/debug page. Leave it.
4. Never commit secrets. There are none in this repo; keep it that way.

## Committed conventions
- Header: `partials/header.html` uses `img/PCBL_header_logo.png` (wonk-footer,
   LinkedinPalette 051230), `img/PCBL_banner.png`, socials =
   facebook.com/pcblla, instagram.com/pcbleague, youtube.com/@pcbl2025,
   flickr.com/photos/pcbl/ (no Twitter — PCBL has none).
- Footer: `img/PCBL_footer_logo.png`, "Pacific Coast Baseball League — Amateur
   Adult Baseball in Los Angeles", © Pacific Coast Baseball League.
- Contact: visible UI emails are `info@pcbl.org` (PCBL's published address).
   README tells a real owner to point these at their own inbox.
- Brand images generated via System.Drawing (script:
   `C:\Users\PreSafu\AppData\Local\Temp\opencode\make-pcbl-branding.ps1`), on
   the original PNG dimensions: header 146x130, footer 150x148, plate 60x60,
   banner 945x70, favicon 16 + 32.
- Module id is `pcblApp` (renamed from `pssblApp`; pattern is
   `angular.module('pcblApp')` / `ng-app="pcblApp"`).
- Angular module name and `app.*` renames: only `app.js`, helpbot-* files, and
   `index.html` name the module; every controller/directive/service uses the
   globals `app`/`Utilities` from `app.js`.
- Files are UTF-8 (no BOM). Windows spelling gotcha: use `[System.IO.File]
::ReadAllText/WriteAllText` + `New-Object System.Text.UTF8Encoding($false)`;
  never `Set-Content` (adds BOM/newline changes).

## PowerShell gotcha (already hit, recorded here so nobody repeats it)
PowerShell variables are case-insensitive: a `$path` GraphicsPath variable
clobbered the `$Path` parameter and produced garbage-named files. Use distinct
names (`$gp` for GraphicsPath) and always verify created files' real names.

## Environment / workflow
- OS win32, shell PowerShell 5.1, workdir `C:\Users\PreSafu\Desktop\PSSBLfork`.
  Chaining: `cmd1; if ($?) { cmd2 }` (PowerShell has no `&&`). No `cd` between
  commands — use the `workdir` parameter.
- `gh` 2.95.0 authed as `goldennftplatform-svg`. Pages target:
  `https://goldennftplatform-svg.github.io/PSSBLfork/` (branch main, root).
- Serving test: `python -m http.server 8000 --directory .`.
- Commit only when the user asks. Match repo style (short imperative lines).

## State as of this writing
- Every partial in `partials/` is rebranded except `test.html`; home/market
  keep PSSBL affiliate/store URLs with honest alt text ("Team Gear Store").
- All absolute `/data/` and `/img/` paths in app code are relative.
- `README.md`, `PROMPTME.md`, `.nojekyll`, `.gitignore` exist.
- TODO remains: local verification run, then commit + push, then enable Pages
  and verify the live URL returns the app.

Connect the dots. Everything here is NFA. ez.