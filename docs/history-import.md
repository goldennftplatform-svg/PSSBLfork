# Historical recovery workshop

**Admin:** https://pssblfork.onrender.com/#admin

**Published history:** https://pssblfork.onrender.com/#history

The footer links to both. This is a review-first migration workspace: upload → parse → review → explicitly publish. It does not scrape or write to the old provider, and it does not modify live GameDay scorecards.

## One-time deployment setup

1. In the existing Render web service, add **`ADMIN_PASSWORD`** under **Environment**. Choose a separate private password and save/redeploy. Admin access is disabled until this is configured; `playball123` is only a team-testing password.
2. Confirm a persistent disk is attached and **`DATA_DIR`** points to it (the blueprint uses `/var/data/gameday` on a `/var/data` mount). The importer saves `history.json` there. A free/ephemeral instance is unsuitable for durable archives: a deploy/restart may erase its local files. Setting the variable alone does not create a disk.
3. Open Admin and sign in. Admin sessions expire after two hours or a server restart. Team sessions cannot access source files, backups, uploads or publishing.
4. Keep the service at one instance while using the file-backed store. Export a private history backup regularly and retain the old provider's original exports elsewhere too.

## Accepted files

- **CSV:** UTF-8, comma-delimited, with a header row. Quoted commas, escaped quotes, CRLF and multiline values are supported.
- **TSV:** same rules, tab-delimited.
- **JSON:** array of game objects, `{ "games": [...] }`, or one game object.
- **Final GameDay JSON exports:** replays and validates native events to recover score, inning lines, hits, errors and batting statistics. Existing exports lack game dates, so set the real default date before parsing.

Maximum **2 MB and 1,000 game rows per upload**, up to **100 stored uploads** in this first version. No XLS/XLSX/PDF/image/OCR parser is included. Export spreadsheets as CSV, and transcribe scanned scorecards before import. HTML pages should be converted into the tabular template first. Invalid files are rejected; supported files with bad rows are retained for review.

## Canonical game-summary fields

| Field | Required / behavior |
|---|---|
| `date` | `YYYY-MM-DD`; US `M/D/YYYY` is supported with a warning. No invented dates. A manually supplied default date is flagged. |
| `season` | Optional; defaults to the supplied season or date year, with an assumption note. |
| `away`, `home` | Exact PCBL names, stable GameDay IDs or published source IDs. Both teams must differ. |
| `awayScore`, `homeScore` | Whole-number final runs, 0–200. Blank is **not** zero. |
| `status` | `final` / `completed` / `complete` / `finished` / `F`. Missing status is inferred from scores with a warning for the reviewer. Other statuses are blocked. |
| `gameNumber` | 1–9; defaults to 1 with a warning. Supply 2 for a second same-day matchup. |
| `sourceId` | Optional original provider game identifier; retained for tracing. |
| `venue` | Optional field name. |

Use **Download CSV template** in Admin to get a header-only file. A **fictional format example**, not an actual result:

```csv
date,season,away,home,awayScore,homeScore,status,gameNumber,sourceId,venue
2025-06-01,2025 Spring,Braves,CBA Tigers,5,3,final,1,example-only,Example Field
```

Common headers such as `Visitor`, `Away Team`, `Home Runs`, `Game Date` are detected. For unusual exports, expand **Column matching & historical team aliases**:

```json
{"date":"Played On","away":"Visiting Club","awayScore":"Visitor R"}
```

Mapping keys are canonical names; values are the exact original header text. Multiple columns matching the same canonical field are blocked until an explicit mapping resolves them.

### Team identity

The parser does not use fuzzy guessing. Map older labels to known team IDs explicitly, for example:

```json
{"Old Braves Name":"braves"}
```

Use **Keep unmatched source names as historical-only teams** for genuinely retired clubs. Their source names receive stable historical IDs and warnings; they appear only in the historical archive, not the current-team password system. Review spelling carefully: differing names may represent the same club. Exact normalized names reuse the same historical ID. Unknown teams remain blocked unless this option is checked or a mapping is supplied.

## Review and publish

Every parsed row shows its source record number, matched teams, date, score, and review notes. Invalid rows cannot be selected. Fix them in your source or adjust mappings and upload again; earlier source files are retained.

1. Review all assumptions, especially dates, team identity, completed status, and doubleheader game numbers.
2. Select ready rows. Mixed valid/invalid files may be partially imported.
3. Check the explicit review confirmation.
4. Publish. Approved rows appear under **Historical results**, with source attribution.

Duplicate identity is **date + away team + home team + game number**. Repeated uploads/publish attempts do not create duplicates. A different score for an existing identity is flagged as a conflict and never overwrites it. There is no destructive correction/delete UI in this first version; resolve source mistakes and plan an audited correction workflow before bulk production migration. The server serializes writes to prevent two simultaneous approvals from inserting the same record.

Imported final-score summaries do **not** create fictional pitch events, innings, lineups, batting averages or earned-run statistics. Native final GameDay exports can recover those fields that actually exist in their event history. Season/team filters and W/L/T, GP, RF/RA totals summarize imported games only, and are explicitly labeled as partial recovered records, not official standings.

## Traceability and backup

The private store preserves the original UTF-8 text, filename, SHA-256 checksum, source label, parsing options, row review report, publication actions and timestamps. Source text and backups require admin access. Published records expose source attribution/review notes but not the original upload text. Only select files you intend administrators to retain; only approved results/player details become public.

**Download original** retrieves the unchanged text upload. **Download report** retrieves the current preview including duplicate checks. **Download history backup** exports the complete private store (sources + records + audit trail). Restore is not an in-browser operation: stop the single service, validate the schema-1 backup, replace `DATA_DIR/history.json`, then restart. Keep a copy of the old file. Deployment does not automatically restore backups or migrate provider databases.

## Standalone parser script

The deployed server uses the same parser as this dependency-free CLI. Run large migration batches locally first:

```sh
npm run history:parse -- old-games.csv --season "2025 Fall" --out review.json
node scripts/parse-history.mjs export.tsv --column-map columns.json --team-map aliases.json --out review.json
node scripts/parse-history.mjs final-game.json --date 2025-06-01 --out review.json
```

This is always **dry-run**: no server calls and no publication. A report includes canonical records, raw recognized fields, warnings and errors. Existing output files are not overwritten. Exit codes: `0` parsed with no invalid rows; `2` some rows need correction; `1` file/parser/options error. The report is a review document, not a source-game export to re-upload. Upload the original source and the reviewed mappings in Admin for approval. Historical-only unmatched-team retention is available through the Admin UI; CLI defaults to strict team matching.

## Future migration adapters

Once the league supplies real exports, extend `lib/history-parser.mjs` with a format-specific adapter and a scrubbed fixture test. Preserve original IDs, dates, provenance and missing-data flags. Add official pitching/fielding totals only if the source provides the needed fields. Avoid scraping player contact details or presenting inferred events as recorded plays.
