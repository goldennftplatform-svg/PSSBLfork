# California GameDay

A mobile-first baseball hub and browser scorecard for the California PCBL proposal. No app installation. Open a game link to follow it; sign in with the scoring team's password to record plays.

The previous Washington articles, team records, images, affiliate links, forms, and PHP connections have been removed. The new region covers Los Angeles County, Orange County, San Diego County, and the Inland Empire. These are **demo clubs**, not verified PCBL membership or schedules. Supply official teams and rosters before using this as the league's record system.

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

Run one Node service using `npm start`. Route HTTPS traffic to its `PORT` (default 8080). Attach a **persistent disk** and set `DATA_DIR` to its mount path. Games are saved atomically to `games.json`; back up this file. A restart preserves games but signs users out. Use a single instance: the JSON store is not a multi-instance database.

Environment variables:

| Variable | Meaning |
|---|---|
| `PORT` | HTTP port, default `8080` |
| `DATA_DIR` | Persistent storage folder, default `./runtime` |
| `TEAM_PASSWORDS` | JSON map with `la`, `oc`, `sd`, `ie` passwords |

Example PowerShell for local testing with custom passwords:

```powershell
$env:TEAM_PASSWORDS='{"la":"replace-la-password","oc":"replace-oc-password","sd":"replace-sd-password","ie":"replace-ie-password"}'
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
- `assets/gameday.css`: responsive California visual design.
- `server.mjs`: authentication, persistence, API, live events; serves only current frontend files.
- `tests/`: scoring and server integration tests.

Everything you do matters. Connect the dots.
