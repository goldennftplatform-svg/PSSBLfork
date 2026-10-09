import {teams, createGame, state, append, suggestedMoves, results} from './engine.js';
const app = document.querySelector('#app');
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const name = id => teams.find(t => t.id === id)?.name || id;
let live = false, demoPassword = true, games = [], game = null, session = null, stream = null, pending = null, connection = '', busy = false;
try {session = JSON.parse(sessionStorage.getItem('pcbl-session'));} catch {}
const localKey = 'california-gameday-v1';
async function api(path, data) {
  const res = await fetch(`api/${path}`, {method: data ? 'POST' : 'GET', headers: {'Content-Type': 'application/json', ...(session ? {Authorization: `Bearer ${session.token}`} : {})}, ...(data ? {body: JSON.stringify(data)} : {})});
  const result = await res.json(); if (!res.ok) throw Error(result.error || 'Request failed.'); return result;
}
function persistLocal(next) {localStorage.setItem(localKey, JSON.stringify(next)); games = next;}
function banner() {return `<div class="notice ${live ? 'online' : ''}">${live ? `● LIVE SERVER · ${escape(connection || 'Shared games · password-protected scoring')}` : 'LOCAL DEMO · Saved on this device only. Shared live scoring requires the GameDay server.'}</div>`;}
function options(selected) {return teams.map(t => `<option value="${t.id}" ${t.id === selected ? 'selected' : ''}>${t.name}</option>`).join('');}
function authForm() {return session ? `<p class="muted">Scoring as <strong>${escape(name(session.team))}</strong> <button class="quiet" data-action="logout">Sign out</button></p>` : `<form id="login" class="panel"><h2>Team scorekeeper access</h2><p>${demoPassword ? 'Testing password: <code>playball123</code>' : 'Enter the password supplied by your team manager.'}${live ? '' : ' · Demo gate only; not real security.'}</p><div class="form-grid"><label>Your team<select name="team">${options('la')}</select></label><label>Team password<input name="password" type="password" required autocomplete="current-password"></label></div><button>Unlock scoring</button></form>`;}
function dashboard() {
  app.innerHTML = `${banner()}<section class="hero"><p class="eyebrow">SUNSHINE. NINE INNINGS. ONE LINK.</p><h1>California baseball.<br><em>Every play, live.</em></h1><p>Score the game from the dugout. Follow it from anywhere.<br>No download. Just open the link and play ball.</p><a class="button" href="#games">Open the game hub ↗</a><div class="hero-ball">⚾</div></section><div class="regions">${teams.map(t => `<span>${t.region}</span>`).join('')}</div><section id="games"><div class="section-head"><div><p class="eyebrow">GAMEDAY CENTRAL</p><h2>Scoreboards & scorecards</h2></div><span class="pill">${games.length} game${games.length === 1 ? '' : 's'}</span></div><p class="muted">California demo clubs. Enter your real player names when creating a game.</p><div class="cards">${games.length ? games.map(g => {const s = state(g); return `<a class="game-card" href="#game/${g.id}"><span class="status">${s.final ? 'FINAL' : `IN PROGRESS · ${s.side === 'away' ? 'TOP' : 'BOT'} ${s.inning}`}</span><p>${escape(name(g.away))}<b>${s.score.away}</b></p><p>${escape(name(g.home))}<b>${s.score.home}</b></p><small>Open live scorecard →</small></a>`;}).join('') : '<div class="empty">The field is ready.<br><strong>Create the first California matchup below.</strong></div>'}</div>${authForm()}${session ? `<form id="create" class="panel"><h2>Start a game</h2><p>Your team owns the scorecard. Other teams and spectators can follow the public game link.</p><div class="form-grid"><label>Away team<select name="away">${options(session.team)}</select></label><label>Home team<select name="home">${options(teams.find(t => t.id !== session.team).id)}</select></label><label>Scheduled innings<select name="innings"><option>9</option><option>7</option></select></label></div><div class="form-grid">${['away', 'home'].map(side => `<label>${side === 'away' ? 'Away' : 'Home'} batting order<textarea name="${side}Roster" rows="9" required>${Array.from({length: 9}, (_, i) => `${side === 'away' ? 'Away' : 'Home'} Player ${i + 1}`).join('\n')}</textarea><small>One player per line, in batting order. Replace demo names.</small></label>`).join('')}</div><button>Create game & score</button></form>` : ''}</section>`;
}
function scorecard() {
  if (!game) return;
  const s = state(game), edit = session?.team === game.owner, count = Math.max(game.innings, s.inning), batting = `${s.side}:${s.next[s.side]}`;
  app.innerHTML = `${banner()}<div class="section-head"><a href="#">← Game hub</a><button class="quiet" data-action="share">Copy spectator link</button></div><section class="score-hero"><p class="eyebrow">${s.final ? 'FINAL' : `${s.side === 'away' ? 'TOP' : 'BOTTOM'} ${s.inning} · ${s.outs} OUT${s.outs === 1 ? '' : 'S'}`}</p><div class="matchup"><div>${escape(name(game.away))}<strong>${s.score.away}</strong><small>AWAY</small></div><span>vs</span><div>${escape(name(game.home))}<strong>${s.score.home}</strong><small>HOME</small></div></div><div class="count">BALLS <b>${s.balls}</b> STRIKES <b>${s.strikes}</b> OUTS <b>${s.outs}</b></div></section><section class="panel"><h2>Line score</h2><div class="table-scroll"><table><thead><tr><th>Club</th>${Array.from({length: count}, (_, i) => `<th>${i + 1}</th>`).join('')}<th>R</th><th>H</th><th>E</th></tr></thead><tbody>${['away', 'home'].map(side => `<tr><th>${escape(name(game[side]))}</th>${Array.from({length: count}, (_, i) => `<td>${s.lines[side][i] ?? '–'}</td>`).join('')}<td><b>${s.score[side]}</b></td><td>${s.hits[side]}</td><td>${s.errors[side]}</td></tr>`).join('')}</tbody></table></div></section><div class="game-layout"><section class="panel"><p class="eyebrow">${s.final ? 'GAME COMPLETE' : 'AT THE PLATE'}</p><h2>${s.final ? 'In the books.' : escape(s.stats[batting].name)}</h2><div class="bases">${[2, 1, 3].map(base => `<div class="base ${s.bases[base - 1] ? 'occupied' : ''}"><b>${base}B</b><span>${s.bases[base - 1] ? escape(s.stats[s.bases[base - 1]].name) : 'Empty'}</span></div>`).join('')}</div>${edit && !s.final ? `<div class="pitch-controls"><button class="quiet" data-pitch="ball">Ball</button><button class="quiet" data-pitch="strike">Strike</button><button class="quiet" data-pitch="foul">Foul</button></div><h3>Record plate appearance</h3><div class="play-grid">${results.map(r => `<button data-play="${r}" class="${r === 'HR' ? 'accent' : ''}">${r}<small>${({'1B': 'Single', '2B': 'Double', '3B': 'Triple', HR: 'Home run', BB: 'Walk', HBP: 'Hit by pitch', K: 'Strikeout', OUT: 'Ball-in-play out', SAC: 'Sacrifice', E: 'Reached on error', FC: 'Fielder’s choice'})[r]}</small></button>`).join('')}</div><button class="quiet full" data-play="runners" ${s.bases.every(b => !b) ? 'disabled' : ''}>Runner play · steal / advance / out</button><p class="muted">Confirm runner destinations and RBI before saving. Third-out scoring requires your judgment.</p>` : `<p>${s.final ? 'Final score recorded by the scorekeeper.' : 'Spectator view · updates automatically on the live server.'}</p>${!session ? authForm() : !edit ? '<p class="muted">Only the team that created this game can score it.</p>' : ''}`}<div class="toolbar">${edit ? `<button class="quiet" data-action="undo" ${!game.events.length ? 'disabled' : ''}>Undo last action</button>${!s.final ? '<button class="quiet" data-action="final">Mark final</button>' : ''}` : ''}<button class="quiet" data-action="export">Export game JSON</button></div></section><section class="panel"><h2>Play-by-play</h2><ol class="feed">${s.log.length ? s.log.slice().reverse().map(text => `<li>${escape(text)}</li>`).join('') : '<li>Waiting for the first pitch.</li>'}</ol></section></div>${['away', 'home'].map(side => `<section class="panel"><h2>${escape(name(game[side]))} · batting card</h2><div class="table-scroll"><table><thead><tr>${['Player', 'PA', 'AB', 'H', 'R', 'RBI', 'BB', 'K', 'AVG'].map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${game.rosters[side].map((_, i) => {const p = s.stats[`${side}:${i}`]; return `<tr><th>${escape(p.name)}</th>${['PA', 'AB', 'H', 'R', 'RBI', 'BB', 'K'].map(k => `<td>${p[k]}</td>`).join('')}<td>${p.AB ? (p.H / p.AB).toFixed(3) : '—'}</td></tr>`;}).join('')}</tbody></table></div></section>`).join('')}`;
}
function openPlay(result) {
  pending = {result, version: game.version, moves: suggestedMoves(game, result)};
  const s = state(game), dialog = document.createElement('dialog'); dialog.id = 'play-dialog';
  dialog.innerHTML = `<form id="play"><p class="eyebrow">CONFIRM THE PLAY</p><h2>${result === 'runners' ? 'Runner movement' : result}</h2><p>Suggested movement is conservative. Set where each runner actually finished.</p>${Object.entries(pending.moves).map(([id, dest]) => `<label>${escape(s.stats[id].name)}<select name="${id}">${[['1', 'First base'], ['2', 'Second base'], ['3', 'Third base'], ['score', 'Scored'], ['out', 'Out']].map(([v, text]) => `<option value="${v}" ${v === dest ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`).join('')}${result !== 'runners' ? `<label>RBI credited to batter<input type="number" min="0" max="4" name="rbi" value="${['E', 'K'].includes(result) ? 0 : Object.values(pending.moves).filter(v => v === 'score').length}" required></label>` : ''}<label class="check"><input type="checkbox" name="confirmRuns">If this play ends the inning, I confirm the selected runs legally count.</label><p class="muted">For a force third out, change any “Scored” destinations to their last base so no runs count. SAC combines sacrifice bunts and flies; RBI is scorer-assigned.</p><div class="toolbar"><button>Save play</button><button type="button" class="quiet" data-action="cancel">Cancel</button></div></form>`;
  document.body.append(dialog); dialog.showModal(); dialog.addEventListener('close', () => {pending = null; dialog.remove();});
}
async function save(event, undo = false, expected = game.version) {
  if (live) game = await api(`games/${game.id}`, {version: expected, event, undo});
  else {const next = undo ? {...game, events: game.events.slice(0, -1), version: game.version + 1} : append(game, event); persistLocal(games.map(g => g.id === game.id ? next : g)); game = next;}
  scorecard();
}
async function route() {
  stream?.close(); stream = null; document.querySelector('dialog')?.close();
  games = live ? await api('games') : JSON.parse(localStorage.getItem(localKey) || '[]');
  const id = location.hash.match(/^#game\/([\w-]+)$/)?.[1];
  game = id ? games.find(g => g.id === id) : null;
  if (id && !game) {app.innerHTML = `${banner()}<section class="panel"><h1>Game not found</h1><p>${live ? 'Check the game link.' : 'Local demo games exist only in the browser where they were created. Start the live server for shared links.'}</p><a href="#">Back to game hub</a></section>`; return;}
  if (!game) {dashboard(); return;}
  scorecard();
  if (live) {
    stream = new EventSource(`api/games/${game.id}/stream`);
    stream.onmessage = e => {game = JSON.parse(e.data); connection = 'Connected · live updates'; scorecard();};
    stream.onerror = () => {connection = 'Connection lost · reconnecting (scores may be stale)'; scorecard();};
  }
}
async function guarded(fn) {if (busy) return; busy = true; try {await fn();} catch (e) {alert(e.message);} finally {busy = false;}}
document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target, d = new FormData(form);
  guarded(async () => {
    if (form.id === 'login') {
      if (live) session = await api('login', {team: d.get('team'), password: d.get('password')});
      else {if (d.get('password') !== 'playball123') throw Error('Incorrect testing password.'); session = {team: d.get('team'), token: 'local-demo'};}
      sessionStorage.setItem('pcbl-session', JSON.stringify(session)); await route();
    }
    if (form.id === 'create') {
      const payload = {away: d.get('away'), home: d.get('home'), innings: Number(d.get('innings')), rosters: Object.fromEntries(['away', 'home'].map(side => [side, d.get(`${side}Roster`).split('\n').map(n => n.trim()).filter(Boolean)]))};
      if (![payload.away, payload.home].includes(session.team)) throw Error('Choose your team as one of the clubs.');
      const g = live ? await api('games', payload) : {...createGame(crypto.randomUUID(), payload.away, payload.home, payload.rosters, payload.innings), owner: session.team};
      if (!live) persistLocal([...games, g]); location.hash = `game/${g.id}`;
    }
    if (form.id === 'play') {
      const event = {type: pending.result === 'runners' ? 'runners' : 'play', result: pending.result, moves: Object.fromEntries(Object.keys(pending.moves).map(id => [id, d.get(id)])), rbi: Number(d.get('rbi')), confirmRuns: d.has('confirmRuns')};
      await save(event, false, pending.version); document.querySelector('dialog')?.close();
    }
  });
});
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.type === 'submit' && button.form || button.disabled) return;
  guarded(async () => {
    if (button.dataset.play) openPlay(button.dataset.play);
    if (button.dataset.pitch) {const s = state(game), value = button.dataset.pitch; if (value === 'ball' && s.balls === 3) openPlay('BB'); else if (value === 'strike' && s.strikes === 2) openPlay('K'); else await save({type: 'pitch', value});}
    if (button.dataset.action === 'cancel') document.querySelector('dialog')?.close();
    if (button.dataset.action === 'logout') {session = null; sessionStorage.removeItem('pcbl-session'); await route();}
    if (button.dataset.action === 'undo' && confirm('Undo the last recorded action?')) await save(null, true);
    if (button.dataset.action === 'final' && confirm('Mark this game final? Extra innings and walk-offs are closed manually.')) await save({type: 'final'});
    if (button.dataset.action === 'share') {if (!live) {alert('This demo is local to this browser. Use the live server to share games across devices.'); return;} await navigator.clipboard.writeText(location.href); alert('Spectator link copied.');}
    if (button.dataset.action === 'export') {const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({...game, computed: state(game)}, null, 2)], {type: 'application/json'})); a.download = `california-game-${game.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);}
  });
});
window.addEventListener('hashchange', () => guarded(route));
window.addEventListener('storage', e => {if (!live && e.key === localKey) guarded(route);});
try {const config = await api('config'); live = config.live === true; demoPassword = config.demoPassword !== false;} catch {}
await guarded(route);
