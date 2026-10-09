# California GameDay

A mobile-first baseball hub and browser scorecard for the California PCBL proposal. No app installation. Open a game link to follow it; sign in with the scoring team's password to record plays.

The previous Washington articles, team records, images, affiliate links, forms, and PHP connections have been removed. The team directory now includes **28 published PCBL team names** from the LA League and Majors directories linked from pcbl.com, checked October 9, 2026: 8 AAA, 5 AA, 8 Single A, 6 active Majors, and Crooks (listed inactive). These are sourced names/divisions; generated batting orders and games remain **mock records**, not official league results.

The layout adapts to widescreen desktops, iPads in portrait and landscape, and phones. Desktop uses a two-column game hub and side-by-side scoring workspace; tablets retain a game/feed split; phone controls remain touch-sized. Wide score tables scroll within their panels instead of widening the page.

### Published team directory

Sources: [PCBL LA League](https://www.pcbl.com/la-league) → [LA teams](https://www.htosports.com/teams/default.asp?u=PCBLLA&s=baseball&p=teams), and [PCBL Majors](https://www.pcbl.com/majors-division) → [Majors teams](https://www.htosports.com/teams/default.asp?u=PCBLMAJORS&s=baseball&p=teams). `assets/teams.js` records source URLs, retrieval date, stable team IDs, division, and active/inactive status. Source IDs are preserved even where a team's current name differs from its older URL.

All 28 clubs are selectable for mock testing, grouped by division. Nine explicitly labeled demo players are prefilled per lineup. Changing a team refreshes an untouched demo lineup; user-edited names are preserved. No official players, schedules, standings, or results are imported. The four old regional demo IDs remain readable for existing saved games and passwords but are not included in the published club count. This is a snapshot, not an ongoing scrape.

## Run shared live scoring

Install Node.js 22 or newer, then:

```sh
npm start
```

Open **http://localhost:8080**. No npm dependencies or build step are needed. On a local network, other devices can open `http://YOUR-COMPUTER-LAN-IP:8080` if the firewall permits it. Public use needs an HTTPS Node host.

**Testing password for every team: `playball123`.** Choose a team in the access panel. Create a matchup involving that team, enter batting-order names (one per line), and start scoring. The creating team owns the scorecard. Other teams cannot edit it. Spectator links require no password.

### Included

- Mobile scoreboard, inning line score, base occupancy, ball/strike/out counts.
- Singles, doubles, triples, home runs, walks, hit batters, strikeouts, outs, sacrifices, errors, and fielder's choice.
- Explicit runner destinations for steals, advances, caught stealing, and multi-out plays.
- Automatically derived runs, hits, errors, plate appearances, at-bats, runs scored, RBI, walks, strikeouts, total bases, and batting average.
- Fourth ball / third strike opens a walk / strikeout confirmation. Fouls never increase a two-strike count.
- Third out advances the half-inning. Extra innings are available; final and walk-off closure are manual.
- Undo last action, JSON export, persistent game records, and live spectator updates via server-sent events.
- Server-side password checking, team-scoped write access, expiring sessions, login throttling, and conflict detection when two scorers edit simultaneously.

### Scoring boundaries

Runner advancement is **suggested, never assumed to be official**. Confirm actual destinations and RBI before saving. For third-out plays, the scorer must determine whether runs legally count; no runs may count on a force third out or a batter retired before first. The form explains how to exclude those runs. SAC combines sacrifice bunts and flies. Errors count once for a reached-on-error result; multiple fielding errors, pitching stats, earned runs, substitutions, fielding notation, season aggregation, and official rules adjudication are not yet implemented. This is a tested first-pass game scorecard, not a complete official scoring system.

## Deploy the live server

### Render setup

`render.yaml` configures one Node web service, an API health check, and a 1 GB persistent disk. The build runs the test suite before starting the app. **This uses paid compute and storage**; review the current cost in Render before approving the deployment. The free web service tier is not a durable hosting option for this file-backed game store.

After committing and pushing `render.yaml`:

1. Sign in at https://dashboard.render.com using your hosting account.
2. Choose **New → Blueprint**, connect GitHub, and select `goldennftplatform-svg/PSSBLfork` on `main`.
3. Review the service and disk pricing, then deploy the blueprint.
4. Open the HTTPS service URL Render assigns. It serves both the website and the live API; use this URL for scorers and spectators instead of the GitHub Pages demo.
5. Confirm the banner reads **LIVE SERVER**. Create a test game, copy its spectator link, and open it on another phone. A saved play should update there automatically.
6. Restart the service and verify the test game remains. Sign in again after a restart.

The requested testing password remains `playball123`. For real games, set `TEAM_PASSWORDS` in Render's Environment settings using the JSON format below; keep real passwords out of the blueprint and repository. Download JSON exports as additional game backups. Deployments can briefly interrupt connections with a persistent disk; spectator streams reconnect automatically.

### Other Node hosts

Run one Node service using `npm start`. Route HTTPS traffic to its `PORT` (default 8080). Attach a **persistent disk** and set `DATA_DIR` to its mount path. Games are saved atomically to `games.json`; back up this file. A restart preserves games but signs users out. Use a single instance: the JSON store is not a multi-instance database.

Environment variables:

| Variable | Meaning |
|---|---|
| `PORT` | HTTP port, default `8080` |
| `DATA_DIR` | Persistent storage folder, default `./runtime` |
| `TEAM_PASSWORDS` | JSON map keyed by IDs in `assets/teams.js`, e.g. `berserkers`, `braves`, `cba-tigers`; legacy IDs remain supported |

Example PowerShell for local testing with custom passwords:

```powershell
$env:TEAM_PASSWORDS='{"berserkers":"replace-berserkers-password","braves":"replace-braves-password","cba-tigers":"replace-tigers-password"}'
npm start
```

Set real passwords as host secrets, not in git. Missing keys fall back to `playball123` for testing. Team passwords are shared within that club; individual accounts/audit identities are not implemented. Rosters and game records are public to spectators—enter only names you intend to publish.

### GitHub Pages

GitHub Pages can serve the frontend, but cannot run this live server. Without `/api/config`, the UI visibly switches to **LOCAL DEMO**: games are saved in that browser's local storage and the password is only a demonstration gate. This is not secure or cross-device live scoring. Sharing is disabled in local demo mode. Serve the frontend and API together on the Node host for real shared games.

## Development

```sh
npm test
```

- `assets/engine.js`: deterministic event-based scoring and validation.
- `assets/app.js`: hub, login, scorer, spectator view, local demo.
- `assets/views.js`: dashboard, sourced team directory, responsive scorebook markup.
- `assets/teams.js`: sourced PCBL clubs and clearly labeled mock lineup generator.
- `assets/gameday.css`: responsive California visual design.
- `server.mjs`: authentication, persistence, API, live events; serves only current frontend files.
- `tests/`: scoring and server integration tests.

Everything you do matters. Connect the dots.
