import {teams} from './teams.js';
import {escape} from './views.js';

const tokenKey = 'gameday-admin-token';
const canonical = 'date,season,away,home,awayScore,homeScore,status,gameNumber,sourceId,venue';
const historyLink = '<a class="text-link" href="#history">View published history ↗</a>';
function download(content, filename, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type})); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const errorBox = message => message ? `<div class="import-message error" role="alert">${escape(message)}</div>` : '';

export async function mountAdmin(root, {live}) {
  const controller = new AbortController();
  let token = sessionStorage.getItem(tokenKey), imports = [], current = null, configured = false, message = '', error = '', busy = false;
  const request = async (path, data) => {
    const r = await fetch(`api/admin/${path}`, {method: data ? 'POST' : 'GET', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(data ? {body: JSON.stringify(data)} : {})});
    const result = await r.json();
    if (r.status === 401) {token = null; sessionStorage.removeItem(tokenKey);}
    if (!r.ok) throw Error(result.error || 'Admin request failed.');
    return result;
  };
  function login() {
    return `<section class="panel admin-login"><p class="eyebrow">LEAGUE ADMINISTRATION</p><h2>Keep the past in play.</h2><p class="muted">Admin access is separate from team scorekeeping. Original uploads are private; only reviewed records become public.</p>${!live ? '<div class="import-message">Uploads require the live GameDay server. Open your Render website to manage history.</div>' : !configured ? '<div class="import-message"><strong>One-time Render setup</strong><p>Add <code>ADMIN_PASSWORD</code> in your Render service’s Environment settings, save and redeploy. Choose a separate admin password; the team testing password does not unlock this area.</p><p>For durable uploads, attach a persistent disk and point <code>DATA_DIR</code> at it. On Render free instances, local files can disappear after a restart or deploy.</p></div>' : `<form id="admin-login"><label>Admin password<input name="password" type="password" required autocomplete="current-password"></label><button>Sign in to admin →</button></form>`}${historyLink}</section>`;
  }
  function uploadForm() {
    return `<form id="history-upload" class="panel">
      <p class="eyebrow">01 / BRING YOUR FILES</p><h2>Upload an old scorebook.</h2>
      <p class="muted">CSV, TSV, JSON, or a final GameDay JSON export. Up to 2 MB / 1,000 games. Export Excel as CSV first; scanned scorecards and PDFs need transcription.</p>
      <label class="upload-zone">Choose a game export<input name="file" type="file" accept=".csv,.tsv,.json,text/csv,text/tab-separated-values,application/json" required><small>The original text is preserved privately. Uploading never publishes a game.</small></label>
      <div class="form-grid"><label>Source / system name<input name="sourceLabel" placeholder="e.g. PCBL 2025 season export" maxlength="150" required></label><label>Default season (optional)<input name="season" placeholder="e.g. 2025 Fall" maxlength="80"></label><label>Default game date (optional)<input name="defaultDate" type="date"><small>Only for rows missing a date. This assumption is flagged.</small></label></div>
      <details class="import-options"><summary>Column matching & historical team aliases</summary>
      <p class="muted">Common headers are detected automatically. Override with JSON: canonical field → your exact header. Fields: <code>${canonical}</code>.</p>
      <label>Column mapping<textarea name="columnMap" rows="3" placeholder='{"away":"Visiting Club","awayScore":"Visitor R"}'>{}</textarea></label>
      <label>Team aliases<textarea name="teamMap" rows="3" placeholder='{"Old Club Name":"braves"}'>{}</textarea></label>
      <p class="muted">Exact matches only. Unknown teams are blocked until reviewed. No fuzzy guessing.</p>
      <label class="check"><input name="allowHistoricalTeams" type="checkbox">Keep unmatched source names as historical-only teams. I will review their identities before publishing.</label>
      <p class="muted">Use this for retired clubs. They appear in history, not in current-team scoring or password access. Typo variants may create separate historical identities; use an alias to merge into a known club.</p>
      <details><summary>Available team IDs</summary><div class="team-id-list">${teams.map(t => `<span><code>${t.id}</code> ${escape(t.name)}</span>`).join('')}</div></details></details>
      <div class="toolbar"><button>Parse & preview →</button><button type="button" class="quiet" data-admin="template">Download CSV template</button></div></form>`;
  }
  function preview() {
    if (!current) return '<div class="panel"><p class="eyebrow">02 / REVIEW BEFORE PUBLISHING</p><h2>No surprises in the record.</h2><p class="muted">Upload a file or open an earlier import to see matched teams, dates, scores, assumptions, and duplicates. Correct rejected rows in the source and upload again.</p></div>';
    const ready = current.rows.filter(r => !r.errors.length && !r.duplicate).length;
    return `<section class="panel import-preview"><div class="section-head"><div><p class="eyebrow">02 / REVIEW THE RECOVERY</p><h2>${escape(current.filename)}</h2></div><span class="pill">${ready} ready</span></div><p class="muted">${current.total} rows · ${current.invalid} invalid · ${current.rows.filter(r => r.duplicate).length} already imported. Review warnings even on valid rows. Summary imports cannot recreate missing plays or player stats.</p><p class="source-fingerprint">SHA-256 <code>${escape(current.sha256)}</code></p><div class="toolbar"><button class="quiet" data-admin="select-ready">Select ready rows</button><button class="quiet" data-admin="clear">Clear selection</button><button class="quiet" data-admin="source">Download original</button><button class="quiet" data-admin="report">Download report</button></div><div class="table-scroll import-table" tabindex="0" role="region" aria-label="Import preview"><table><thead><tr><th>Select</th><th>Source row</th><th>Date / season</th><th>Matchup / score</th><th>Review</th></tr></thead><tbody>${current.rows.map(row => {
      const r = row.record, blocked = row.errors.length || row.duplicate;
      return `<tr class="${blocked ? 'review-blocked' : ''}"><td><input class="row-select" type="checkbox" value="${row.index}" aria-label="Select source row ${row.line}" ${blocked ? 'disabled' : ''}></td><td>${row.line}</td><td>${escape(r?.date || row.raw.date || 'Missing date')}<small>${escape(r?.season || '')}</small></td><td>${escape(r?.awayName || row.raw.away || '?')} @ ${escape(r?.homeName || row.raw.home || '?')}<strong>${r ? `${r.awayScore} – ${r.homeScore}` : 'Needs correction'}</strong><small>Game ${r?.gameNumber || '?'}</small></td><td>${row.errors.map(e => `<p class="row-error">${escape(e)}</p>`).join('')}${row.duplicate ? `<p class="row-error">${row.duplicate.conflict ? `Conflicting score already imported (${row.duplicate.awayScore}–${row.duplicate.homeScore}). Not overwritten.` : 'Already imported. Skipped to prevent duplication.'}</p>` : ''}<details><summary>${row.warnings.length} review notes</summary><ul>${row.warnings.map(w => `<li>${escape(w)}</li>`).join('')}</ul></details></td></tr>`;
    }).join('')}</tbody></table></div><label class="check"><input type="checkbox" id="review-confirm">I reviewed the selected records, dates, team mappings, scores, and assumptions. Publish them to the public historical results.</label><button data-admin="publish" ${ready ? '' : 'disabled'}>Publish selected records →</button><p class="muted">Nothing is sent to the old league website. Existing GameDay games are not changed.</p></section>`;
  }
  function render() {
    if (controller.signal.aborted) return;
    root.className = 'admin-page';
    root.innerHTML = `<div class="game-navigation"><a class="back-link" href="#">← Game center</a>${historyLink}${token ? '<button class="quiet" data-admin="logout">Sign out of admin</button>' : ''}</div><section class="admin-intro"><p class="eyebrow">THE HISTORY WORKSHOP</p><h1>Old games.<br><em>A new home.</em></h1><p>Recover the records you have. Keep the source. Review what’s missing.</p></section>${errorBox(error)}${message ? `<div class="import-message" role="status">${escape(message)}</div>` : ''}${!token ? login() : `<div class="admin-grid">${uploadForm()}<aside class="panel import-list"><div class="section-head"><h2>Import archive</h2><span class="pill">${imports.length}</span></div>${imports.length ? imports.map(b => `<button class="import-item quiet" data-import="${b.id}"><strong>${escape(b.filename)}</strong><span>${escape(b.sourceLabel)} · ${b.total} rows</span><small>${b.published} published · ${escape(b.createdAt.slice(0, 10))}</small></button>`).join('') : '<p class="muted">Your original exports and review history will be saved here.</p>'}<button class="quiet full" data-admin="backup">Download history backup ↓</button><p class="muted">Backup includes original files, parse results, published records and the import audit trail. Keep it private.</p></aside></div>${preview()}`}`;
  }
  async function run(fn) {
    if (busy) return; busy = true; error = ''; message = '';
    root.querySelectorAll('button').forEach(b => {b.disabled = true;});
    try {await fn();} catch (e) {error = e.message;} finally {busy = false; render();}
  }
  root.addEventListener('submit', event => {
    event.preventDefault(); event.stopPropagation(); const form = event.target, d = new FormData(form);
    run(async () => {
      if (form.id === 'admin-login') {
        token = (await request('login', {password: d.get('password')})).token;
        sessionStorage.setItem(tokenKey, token); imports = await request('imports');
      }
      if (form.id === 'history-upload') {
        const file = d.get('file'); if (!file?.size || file.size > 2 * 1024 * 1024) throw Error('Choose a nonempty file no larger than 2 MB.');
        const content = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer());
        current = await request('imports', {filename: file.name, content, sourceLabel: d.get('sourceLabel'), season: d.get('season'), defaultDate: d.get('defaultDate'), columnMap: JSON.parse(d.get('columnMap') || '{}'), teamMap: JSON.parse(d.get('teamMap') || '{}'), allowHistoricalTeams: d.has('allowHistoricalTeams')});
        imports = await request('imports'); message = 'File preserved and parsed. Review below; nothing has been published.';
      }
    });
  }, {signal: controller.signal});
  root.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    event.stopPropagation();
    if (button.disabled || button.form && button.type === 'submit') return;
    const action = button.dataset.admin;
    if (action === 'select-ready' || action === 'clear') {root.querySelectorAll('.row-select:not(:disabled)').forEach(c => {c.checked = action === 'select-ready';}); return;}
    const selected = [...root.querySelectorAll('.row-select:checked')].map(c => Number(c.value));
    const confirmed = root.querySelector('#review-confirm')?.checked;
    run(async () => {
      if (button.dataset.import) current = await request(`imports/${button.dataset.import}`);
      if (action === 'logout') {await request('logout', {}); token = null; sessionStorage.removeItem(tokenKey); current = null;}
      if (action === 'template') download(`${canonical}\r\n`, 'gameday-history-template.csv', 'text/csv');
      if (action === 'report') download(JSON.stringify(current, null, 2), 'history-preview.json');
      if (action === 'backup') download(JSON.stringify(await request('backup'), null, 2), 'gameday-history-backup.json');
      if (action === 'source') {
        const r = await fetch(`api/admin/imports/${current.id}/source`, {headers: {Authorization: `Bearer ${token}`}});
        if (!r.ok) throw Error('Unable to download original. Sign in again if your session expired.');
        download(await r.text(), current.filename, 'application/octet-stream');
      }
      if (action === 'publish') {
        if (!selected.length || !confirmed) throw Error('Select ready rows and check the review confirmation before publishing.');
        const result = await request(`imports/${current.id}/publish`, {rows: selected, confirm: true});
        current = result.preview; imports = await request('imports'); message = `${result.added} historical records published. ${result.skipped} duplicates skipped.`;
      }
    });
  }, {signal: controller.signal});
  try {
    if (live) {configured = (await fetch('api/config').then(r => r.json())).adminConfigured; if (token) imports = await request('imports');}
    else token = null;
  } catch (e) {error = e.message;}
  render();
  return () => controller.abort();
}

export async function mountHistory(root, {live}) {
  const controller = new AbortController(); let records = [], error = '', season = '', team = '';
  const render = () => {
    if (controller.signal.aborted) return;
    const filtered = records.filter(r => (!season || r.season === season) && (!team || r.away === team || r.home === team));
    const clubs = new Map(), totals = new Map();
    for (const r of records) {clubs.set(r.away, r.awayName); clubs.set(r.home, r.homeName);}
    for (const r of filtered) for (const side of ['away', 'home']) {
      const other = side === 'away' ? 'home' : 'away', id = r[side], row = totals.get(id) || {name: r[`${side}Name`], W: 0, L: 0, T: 0, RF: 0, RA: 0, GP: 0};
      row.GP++; row.RF += r[`${side}Score`]; row.RA += r[`${other}Score`]; row[r[`${side}Score`] > r[`${other}Score`] ? 'W' : r[`${side}Score`] < r[`${other}Score`] ? 'L' : 'T']++;
      totals.set(id, row);
    }
    root.className = 'history-page';
    root.innerHTML = `<div class="game-navigation"><a class="back-link" href="#">← Game center</a><a class="text-link" href="#admin">Admin / import history ↗</a></div><section class="admin-intro"><p class="eyebrow">THE RECOVERED SCOREBOOK</p><h1>Every season<br><em>has a story.</em></h1><p>Reviewed historical records with source attribution. These totals describe imported games only, not a complete official league archive.</p></section>${errorBox(error)}${!live ? '<div class="import-message">Historical records are available on the live server, not the GitHub Pages demo.</div>' : ''}<section class="panel"><div class="section-head"><h2>Historical results</h2><span class="pill">${filtered.length} games</span></div><div class="form-grid"><label>Season<select id="history-season"><option value="">All seasons</option>${[...new Set(records.map(r => r.season))].sort().map(s => `<option value="${escape(s)}" ${s === season ? 'selected' : ''}>${escape(s)}</option>`).join('')}</select></label><label>Team<select id="history-team"><option value="">All teams</option>${[...clubs].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => `<option value="${escape(id)}" ${id === team ? 'selected' : ''}>${escape(name)}</option>`).join('')}</select></label></div>${filtered.length ? `<div class="table-scroll" tabindex="0" role="region" aria-label="Historical results"><table><thead><tr><th>Date</th><th>Away</th><th>Score</th><th>Home</th><th>Recovered detail / source</th></tr></thead><tbody>${filtered.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `<tr><td>${escape(r.date)}<small>${escape(r.season)} · Game ${r.gameNumber}</small></td><th>${escape(r.awayName)}</th><td><strong>${r.awayScore} – ${r.homeScore}</strong></td><th>${escape(r.homeName)}</th><td><details><summary>${r.detail ? 'Native game details' : 'Final score only'} · source</summary><p>${escape(r.provenance.sourceLabel)} · row ${r.provenance.row}<br>Imported ${escape(r.provenance.importedAt.slice(0, 10))}</p><p>${escape(r.venue || 'Venue not supplied')}</p><ul>${r.provenance.warnings.map(w => `<li>${escape(w)}</li>`).join('')}</ul>${r.detail ? `<p>Hits: ${r.detail.hits.away}–${r.detail.hits.home} · Errors: ${r.detail.errors.away}–${r.detail.errors.home}</p><p>Innings (away): ${r.detail.lines.away.join(' / ')}<br>Innings (home): ${r.detail.lines.home.join(' / ')}</p><ul>${Object.entries(r.detail.batting).map(([id, p]) => `<li>${id.startsWith('away:') ? 'Away' : 'Home'} · ${escape(p.name)}: ${p.H}/${p.AB}, ${p.R} R, ${p.RBI} RBI</li>`).join('')}</ul>` : '<p>No innings or player statistics were invented for this record.</p>'}</details></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h3>A place for the past.</h3><p>No reviewed records match this view yet. Upload old game exports in Admin to get started.</p></div>'}</section>${totals.size ? `<section class="panel recovered-totals"><h2>Recovered team totals</h2><p class="muted">Calculated only from the filtered imported games above. Partial archives are not official standings.</p><div class="table-scroll" tabindex="0" role="region" aria-label="Recovered team totals"><table><thead><tr><th>Team</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>RF</th><th>RA</th></tr></thead><tbody>${[...totals.values()].sort((a, b) => b.W - a.W || a.name.localeCompare(b.name)).map(r => `<tr><th>${escape(r.name)}</th>${['GP', 'W', 'L', 'T', 'RF', 'RA'].map(k => `<td>${r[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : ''}`;
  };
  root.addEventListener('change', event => {
    if (event.target.id === 'history-season') season = event.target.value;
    if (event.target.id === 'history-team') team = event.target.value;
    render();
  }, {signal: controller.signal});
  try {if (live) {const r = await fetch('api/history'); if (!r.ok) throw Error('Unable to load history.'); records = await r.json();}} catch (e) {error = e.message;}
  render(); return () => controller.abort();
}
