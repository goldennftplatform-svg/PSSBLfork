# California GameDay — maintainer notes

The user's current direction supersedes the previous mirror/archive policy: remove Washington/PSSBL content and create a California browser-only live scoring platform. Legacy source remains available in git history, not the served site.

- Current stack: dependency-free Node 22 server and vanilla ES-module frontend.
- Run `npm start`; verify with `npm test` and a browser at mobile width.
- California demo teams are defined in `assets/engine.js`. Do not describe them as official league teams. Obtain actual clubs and rosters from the owner.
- Testing password is `playball123` for each club. Production passwords come from server-only `TEAM_PASSWORDS` JSON.
- True cross-device live scoring requires the Node server. GitHub Pages runs a clearly labeled local demo only. Never imply localStorage or a client-side password is secure shared infrastructure.
- Server writes require a token scoped to the game's owner team and the current game version. Keep validation in the shared engine, not only the UI.
- Game state and batting stats are replayed from events. Preserve undo and correct behavior after restart.
- The scorer confirms runner destinations, RBI, and third-out run legality. Never silently award runs based solely on hit type.
- Scheduled innings do not force a final result; scorekeepers explicitly mark final.
- `runtime/` contains private operational data and must not be committed. Only allowlisted frontend files are served by Node.
- No requests to legacy Washington APIs, no archived Washington pages, no old merchant or affiliate links.
- No dependencies, generated bundles, or package lock needed currently. Prefer targeted meaningful tests for scoring and authorization changes.
- Commit/push/deploy only when requested. A static deployment alone does not deploy the live service.
