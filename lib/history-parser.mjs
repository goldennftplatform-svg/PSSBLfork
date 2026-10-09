import {createHash} from 'node:crypto';
import {allTeams, getTeam} from '../assets/teams.js';
import {createGame, state} from '../assets/engine.js';

export const IMPORT_LIMIT_BYTES = 2 * 1024 * 1024;
export const IMPORT_LIMIT_ROWS = 1000;
const key = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  date: ['date', 'gamedate', 'playedon', 'dateplayed'],
  season: ['season', 'seasonname', 'year'],
  away: ['away', 'awayteam', 'visitor', 'visitors', 'visitorteam', 'visitingteam'],
  home: ['home', 'hometeam', 'host', 'hostteam'],
  awayScore: ['awayscore', 'awayruns', 'visitorscore', 'visitorruns', 'visitingscore'],
  homeScore: ['homescore', 'homeruns', 'hostscore'],
  status: ['status', 'gamestatus', 'resultstatus'],
  gameNumber: ['gamenumber', 'gameno', 'doubleheadergame', 'doubleheader'],
  sourceId: ['sourceid', 'gameid', 'id', 'externalid'],
  venue: ['venue', 'field', 'location', 'ballpark']
};
const text = (value, max = 150) => String(value ?? '').trim().slice(0, max);

// Quoted CSV/TSV, including escaped quotes, CRLF and embedded newlines.
export function readDelimited(content, delimiter) {
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  const pushCell = () => {row.push(cell); cell = ''; closed = false;};
  const pushRow = () => {pushCell(); if (row.some(v => v.trim())) rows.push(row); row = []; if (rows.length > IMPORT_LIMIT_ROWS + 1) throw Error(`Maximum ${IMPORT_LIMIT_ROWS} rows per file.`);};
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quoted) {
      if (c === '"' && content[i + 1] === '"') {cell += '"'; i++;}
      else if (c === '"') {quoted = false; closed = true;}
      else cell += c;
    } else if (c === delimiter) pushCell();
    else if (c === '\n' || c === '\r') {pushRow(); if (c === '\r' && content[i + 1] === '\n') i++;}
    else if (c === '"' && !cell && !closed) quoted = true;
    else if (closed && c.trim()) throw Error('Unexpected text after a quoted CSV field.');
    else if (!closed) cell += c;
  }
  if (quoted) throw Error('Unclosed quoted CSV field.');
  if (cell || row.length) pushRow();
  const headers = rows.shift();
  if (!headers?.length || headers.some(h => !key(h))) throw Error('The first row must contain nonempty column headers.');
  if (new Set(headers.map(key)).size !== headers.length) throw Error('Duplicate column headers. Give every column a unique name.');
  return {headers, rows: rows.map((values, i) => ({data: Object.fromEntries(headers.map((h, j) => [h, values[j] ?? ''])), line: i + 2, error: values.length !== headers.length ? 'Column count does not match the header row.' : null}))};
}

function validDate(value, warnings) {
  let v = text(value);
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {v = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`; warnings.push('Slash date interpreted as US month/day/year.');}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) throw Error('Missing or invalid date. Use YYYY-MM-DD (or supply a default date).');
  return v;
}

function resolveTeam(value, teamMap, allowHistoricalTeams, warnings) {
  const raw = text(value), normalized = key(raw);
  const override = Object.entries(teamMap).find(([label]) => key(label) === normalized);
  if (override) {const found = getTeam(override[1]); if (!found) throw Error(`Team mapping for "${raw}" is not a known team ID.`); return found;}
  const matches = allTeams.filter(t => [t.id, t.name, t.sourceId].some(v => v && key(v) === normalized));
  if (!matches.length && raw && normalized && allowHistoricalTeams) {
    warnings.push(`Historical-only team "${raw}" retained from source; not matched to the current PCBL directory.`);
    return {id: `historic-${createHash('sha256').update(normalized).digest('hex').slice(0, 20)}`, name: raw};
  }
  if (matches.length !== 1) throw Error(`Unrecognized or ambiguous team "${raw || '(empty)'}". Add an exact team mapping or explicitly retain historical-only team names.`);
  return matches[0];
}

export const recordIdentity = record => createHash('sha256').update(JSON.stringify([record.date, record.away, record.home, record.gameNumber])).digest('hex');

export function parseHistory({filename, content, columnMap = {}, teamMap = {}, defaultDate = '', season = '', allowHistoricalTeams = false}) {
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > IMPORT_LIMIT_BYTES) throw Error('Upload a UTF-8 text file no larger than 2 MB.');
  if (![columnMap, teamMap].every(m => m && typeof m === 'object' && !Array.isArray(m) && Object.values(m).every(v => typeof v === 'string' && v.length <= 150))) throw Error('Column and team mappings must be JSON objects of text values.');
  if (Object.keys(columnMap).some(k => !Object.hasOwn(aliases, k))) throw Error('Unknown column-map field. Use the canonical field names in the template.');
  content = content.replace(/^\uFEFF/, '');
  const ext = text(filename).toLowerCase().split('.').pop();
  let input, headers;
  if (ext === 'json') {
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.games) ? parsed.games : [parsed];
    if (!rows.every(r => r && typeof r === 'object' && !Array.isArray(r))) throw Error('JSON must contain game objects or a {games: [...]} object.');
    input = rows.map((data, i) => ({data, line: i + 1}));
    headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  } else if (['csv', 'tsv'].includes(ext)) {
    const result = readDelimited(content, ext === 'tsv' ? '\t' : ',');
    input = result.rows; headers = result.headers;
  } else throw Error('Supported formats: CSV, TSV and JSON. Export Excel sheets as CSV; PDF/images need transcription first.');
  if (!input.length || input.length > IMPORT_LIMIT_ROWS) throw Error(`Upload 1–${IMPORT_LIMIT_ROWS} game rows at a time.`);
  const seen = new Set();
  const rows = input.map(({data, line, error}, index) => {
    const errors = error ? [error] : [], warnings = [], raw = {};
    const fields = {};
    for (const [canonical, names] of Object.entries(aliases)) {
      const candidates = Object.keys(data).filter(h => columnMap[canonical] ? h === columnMap[canonical] : names.includes(key(h)));
      if (candidates.length > 1) errors.push(`Multiple columns match ${canonical}; choose one in column mapping.`);
      fields[canonical] = candidates.length ? data[candidates[0]] : '';
      raw[canonical] = text(fields[canonical]);
    }
    let record = null;
    try {
      const date = validDate(fields.date || defaultDate, warnings);
      if (!fields.date && defaultDate) warnings.push('Date supplied by the importer, not present in the source row.');
      const away = resolveTeam(fields.away, teamMap, allowHistoricalTeams === true, warnings), home = resolveTeam(fields.home, teamMap, allowHistoricalTeams === true, warnings);
      if (away.id === home.id) throw Error('Away and home teams must differ.');
      if (away.active === false || home.active === false) warnings.push('Includes a team currently marked inactive; confirm historical identity.');
      const score = (v, side) => {if (!/^\d{1,3}$/.test(String(v).trim()) || Number(v) > 200) throw Error(`Missing or invalid ${side} score (0–200).`); return Number(v);};
      let awayScore, homeScore, detail = null;
      if (Object.hasOwn(data, 'events') || Object.hasOwn(data, 'rosters')) {
        if (!Array.isArray(data.events) || data.events.length > 20000) throw Error('Invalid native game event history.');
        const native = createGame('validation', away.id, home.id, data.rosters, data.innings);
        const computed = state({...native, events: data.events});
        if (!computed.final) throw Error('Native GameDay export is not final. Mark the original game final before importing.');
        awayScore = computed.score.away; homeScore = computed.score.home;
        detail = {lines: computed.lines, hits: computed.hits, errors: computed.errors, batting: computed.stats};
        warnings.push('Score and batting details replayed from the original GameDay events.');
      } else {
        awayScore = score(fields.awayScore, 'away'); homeScore = score(fields.homeScore, 'home');
        if (fields.status && !['final', 'completed', 'complete', 'finished', 'f'].includes(key(fields.status))) throw Error('Only completed/final games can be published. Postponed, canceled, forfeited or in-progress rows need manual review.');
        if (!fields.status) warnings.push('Final status inferred from supplied scores; confirm this game finished.');
        warnings.push('Summary only: innings, play-by-play and player stats cannot be reconstructed from a final score.');
      }
      const gameNumber = fields.gameNumber === '' ? 1 : Number(fields.gameNumber);
      if (!Number.isInteger(gameNumber) || gameNumber < 1 || gameNumber > 9) throw Error('Game number must be 1–9 for doubleheaders.');
      if (fields.gameNumber === '') warnings.push('Game number defaults to 1; set 2 for a second same-day matchup.');
      const seasonName = text(fields.season || season || date.slice(0, 4), 80);
      if (!fields.season) warnings.push(season ? 'Season supplied by the importer.' : 'Season inferred from the game date year.');
      record = {date, season: seasonName, away: away.id, home: home.id, awayName: away.name, homeName: home.name, awayScore, homeScore, gameNumber, sourceId: text(fields.sourceId), venue: text(fields.venue), status: 'final', detail};
      const identity = recordIdentity(record);
      if (seen.has(identity)) errors.push('Duplicate same-day matchup/game number within this upload.');
      seen.add(identity);
    } catch (e) {errors.push(e.message);}
    return {index, line, raw, record, errors, warnings};
  });
  return {parserVersion: 1, format: ext, headers, rows, total: rows.length, valid: rows.filter(r => !r.errors.length).length, invalid: rows.filter(r => r.errors.length).length};
}
