# California GameDay — maintainer notes

The user's current direction supersedes the previous mirror/archive policy: remove Washington/PSSBL content and create a California browser-only live scoring platform. Legacy source remains available in git history, not the served site.

- Current stack: dependency-free Node 22 server and vanilla ES-module frontend.
- Run `npm start`; verify with `npm test` and a browser at mobile width.
- `assets/teams.js` contains 28 names from PCBL's linked LA/Majors team directories, checked 2026-10-09. Preserve attribution, source IDs, division membership, and the inactive Crooks label. Player lineups and generated games are mock data; never present them as official results. Preserve legacy IDs for existing games.
- Testing password is `playball123` for each club. Production passwords come from server-only `TEAM_PASSWORDS` JSON.
- True cross-device live scoring requires the Node server. GitHub Pages runs a clearly labeled local demo only. Never imply localStorage or a client-side password is secure shared infrastructure.
- Server writes require a token scoped to the game's owner team and the current game version. Keep validation in the shared engine, not only the UI.
- Game state and batting stats are replayed from events. Preserve undo and correct behavior after restart.
- The scorer confirms runner destinations, RBI, and third-out run legality. Never silently award runs based solely on hit type.
- Scheduled innings do not force a final result; scorekeepers explicitly mark final.
- `runtime/` contains private operational data and must not be committed. Only allowlisted frontend files are served by Node.
- No requests to legacy Washington APIs, no archived Washington pages, no old merchant or affiliate links.
- No dependencies, generated bundles, or package lock needed currently. Prefer targeted meaningful tests for scoring and authorization changes.
- Responsive layouts live in `assets/gameday.css`; templates in `assets/views.js`. Check 390px phones, 768/820px portrait tablets, 1024/1180px landscape tablets, and 1440/1920px desktops. Table overflow must stay within the panel. Keep a 44px minimum interactive target.
- Standing user authorization: automatically commit and push completed, checked builds to `main` so the connected Render service can deploy them. No repeated approval needed. Stage only intended files, never secrets, and verify deployment before claiming a build is live. The live service is https://pssblfork.onrender.com/; GitHub Pages is only the local-demo frontend.
- Do not open visible browser pages on the user's PC without permission. Use background HTTP checks and automated tests; be explicit about any visual checks not performed.
