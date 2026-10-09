import {createGame, state, append, suggestedMoves} from './engine.js';
import {escape, banner, dashboardView, scorecardView} from './views.js';
import {mockRoster} from './teams.js';

const app = document.querySelector('#app');
let live = false, demoPassword = true, games = [], game = null, session = null;
let stream = null, pending = null, connection = '', busy = false;
try {session = JSON.parse(sessionStorage.getItem('pcbl-session'));} catch {}
const localKey = 'california-gameday-v1';
const context = () => ({live, demoPassword, games, game, session, connection});

async function api(path, data) {
  const res = await fetch(`api/${path}`, {
    method: data ? 'POST' : 'GET',
    headers: {'Content-Type': 'application/json', ...(session ? {Authorization: `Bearer ${session.token}`} : {})},
    ...(data ? {body: JSON.stringify(data)} : {})
  });
  const result = await res.json();
  if (!res.ok) throw Error(result.error || 'Request failed.');
  return result;
}

function persistLocal(next) {
  localStorage.setItem(localKey, JSON.stringify(next));
  games = next;
}

function dashboard() {
  app.className = 'dashboard-page';
  app.innerHTML = dashboardView(context());
}

function scorecard() {
  if (!game) return;
  // Preserve keyboard focus and independently scrolled tables/feed during live updates.
  const focused = document.activeElement;
  const action = focused?.dataset.action;
  const pitch = focused?.dataset.pitch;
  const play = focused?.dataset.play;
  const scrolls = [...app.querySelectorAll('.table-scroll, .feed')].map(el => [el.scrollLeft, el.scrollTop]);
  app.className = 'scorecard-page';
  app.innerHTML = scorecardView(context());
  app.querySelectorAll('.table-scroll, .feed').forEach((el, i) => {
    if (scrolls[i]) {el.scrollLeft = scrolls[i][0]; el.scrollTop = scrolls[i][1];}
  });
  const selector = action ? `[data-action="${action}"]` : pitch ? `[data-pitch="${pitch}"]` : play ? `[data-play="${play}"]` : null;
  if (selector && !document.querySelector('dialog[open]')) app.querySelector(selector)?.focus({preventScroll: true});
}

function openPlay(result) {
  pending = {result, version: game.version, moves: suggestedMoves(game, result)};
  const s = state(game), dialog = document.createElement('dialog');
  dialog.id = 'play-dialog';
  dialog.setAttribute('aria-labelledby', 'play-title');
  dialog.innerHTML = `<form id="play"><p class="eyebrow">CONFIRM THE PLAY</p><h2 id="play-title">${result === 'runners' ? 'Runner movement' : result}</h2><p class="muted">Suggested movement is conservative. Set where each runner actually finished.</p><div class="runner-fields">${Object.entries(pending.moves).map(([id, dest]) => `<label>${escape(s.stats[id].name)}<select name="${id}">${[['1', 'First base'], ['2', 'Second base'], ['3', 'Third base'], ['score', 'Scored'], ['out', 'Out']].map(([v, text]) => `<option value="${v}" ${v === dest ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`).join('')}</div>${result !== 'runners' ? `<label>RBI credited to batter<input type="number" min="0" max="4" name="rbi" value="${['E', 'K'].includes(result) ? 0 : Object.values(pending.moves).filter(v => v === 'score').length}" required></label>` : ''}<label class="check"><input type="checkbox" name="confirmRuns">If this play ends the inning, I confirm the selected runs legally count.</label><p class="muted">For a force third out, change any “Scored” destinations to their last base so no runs count. SAC combines sacrifice bunts and flies; RBI is scorer-assigned.</p><div class="toolbar"><button>Save play</button><button type="button" class="quiet" data-action="cancel">Cancel</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener('close', () => {pending = null; dialog.remove();});
}

async function save(event, undo = false, expected = game.version) {
  if (live) game = await api(`games/${game.id}`, {version: expected, event, undo});
  else {
    const next = undo ? {...game, events: game.events.slice(0, -1), version: game.version + 1} : append(game, event);
    persistLocal(games.map(g => g.id === game.id ? next : g));
    game = next;
  }
  scorecard();
}

async function route() {
  // Section anchors are navigation within the current view, not a data reload.
  if (['#games', '#dugout', '#teams', '#scorekeeper-access'].includes(location.hash) && document.querySelector(location.hash)) {
    document.querySelector(location.hash)?.scrollIntoView({behavior: 'smooth'});
    return;
  }
  stream?.close(); stream = null;
  document.querySelector('dialog')?.close();
  games = live ? await api('games') : JSON.parse(localStorage.getItem(localKey) || '[]');
  const id = location.hash.match(/^#game\/([\w-]+)$/)?.[1];
  game = id ? games.find(g => g.id === id) : null;
  if (id && !game) {
    app.innerHTML = `${banner(context())}<section class="panel"><h1>Game not found</h1><p>${live ? 'Check the game link.' : 'Local demo games exist only in the browser where they were created. Start the live server for shared links.'}</p><a href="#">Back to game hub</a></section>`;
    return;
  }
  if (!game) {
    connection = '';
    dashboard();
    if (['#games', '#dugout', '#teams'].includes(location.hash)) document.querySelector(location.hash)?.scrollIntoView();
    return;
  }
  scorecard();
  if (live) {
    stream = new EventSource(`api/games/${game.id}/stream`);
    stream.onmessage = e => {game = JSON.parse(e.data); connection = 'Connected · live updates'; scorecard();};
    stream.onerror = () => {connection = 'Connection lost · reconnecting (scores may be stale)'; scorecard();};
  }
}

async function guarded(fn) {
  if (busy) return;
  busy = true;
  try {await fn();} catch (e) {alert(e.message);} finally {busy = false;}
}

document.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target, d = new FormData(form);
  guarded(async () => {
    if (form.id === 'login') {
      if (live) session = await api('login', {team: d.get('team'), password: d.get('password')});
      else {
        if (d.get('password') !== 'playball123') throw Error('Incorrect testing password.');
        session = {team: d.get('team'), token: 'local-demo'};
      }
      sessionStorage.setItem('pcbl-session', JSON.stringify(session));
      // Keep the scorecard URL intact even when the login panel was reached by an anchor.
      if (game) history.replaceState(null, '', `#game/${game.id}`);
      else history.replaceState(null, '', location.pathname + location.search);
      await route();
    }
    if (form.id === 'create') {
      const payload = {
        away: d.get('away'), home: d.get('home'), innings: Number(d.get('innings')),
        rosters: Object.fromEntries(['away', 'home'].map(side => [side, d.get(`${side}Roster`).split('\n').map(n => n.trim()).filter(Boolean)]))
      };
      if (![payload.away, payload.home].includes(session.team)) throw Error('Choose your team as one of the clubs.');
      const g = live ? await api('games', payload) : {...createGame(crypto.randomUUID(), payload.away, payload.home, payload.rosters, payload.innings), owner: session.team};
      if (!live) persistLocal([...games, g]);
      location.hash = `game/${g.id}`;
      window.scrollTo(0, 0);
    }
    if (form.id === 'play') {
      const event = {type: pending.result === 'runners' ? 'runners' : 'play', result: pending.result, moves: Object.fromEntries(Object.keys(pending.moves).map(id => [id, d.get(id)])), rbi: Number(d.get('rbi')), confirmRuns: d.has('confirmRuns')};
      await save(event, false, pending.version);
      document.querySelector('dialog')?.close();
    }
  });
});

document.addEventListener('click', event => {
  const anchor = event.target.closest('a');
  const href = anchor?.getAttribute('href');
  if (['#games', '#dugout', '#teams', '#scorekeeper-access'].includes(href) && document.querySelector(href)) {
    event.preventDefault();
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    document.querySelector(href).scrollIntoView({behavior}); return;
  }
  const button = event.target.closest('button');
  if (!button || button.type === 'submit' && button.form || button.disabled) return;
  guarded(async () => {
    if (button.dataset.play) openPlay(button.dataset.play);
    if (button.dataset.pitch) {
      const s = state(game), value = button.dataset.pitch;
      if (value === 'ball' && s.balls === 3) openPlay('BB');
      else if (value === 'strike' && s.strikes === 2) openPlay('K');
      else await save({type: 'pitch', value});
    }
    if (button.dataset.action === 'cancel') document.querySelector('dialog')?.close();
    if (button.dataset.action === 'logout') {
      session = null; sessionStorage.removeItem('pcbl-session');
      history.replaceState(null, '', game ? `#game/${game.id}` : location.pathname + location.search);
      await route();
    }
    if (button.dataset.action === 'undo' && confirm('Undo the last recorded action?')) await save(null, true);
    if (button.dataset.action === 'final' && confirm('Mark this game final? Extra innings and walk-offs are closed manually.')) await save({type: 'final'});
    if (button.dataset.action === 'share') {
      if (!live) {alert('This demo is local to this browser. Use the live server to share games across devices.'); return;}
      const link = new URL(location.href); link.hash = `game/${game.id}`;
      await navigator.clipboard.writeText(link.href); alert('Spectator link copied.');
    }
    if (button.dataset.action === 'export') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({...game, computed: state(game)}, null, 2)], {type: 'application/json'}));
      a.download = `california-game-${game.id}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
});
document.addEventListener('input', event => {
  if (event.target.matches('#create textarea')) event.target.dataset.demo = 'false';
});
document.addEventListener('change', event => {
  if (!event.target.matches('#create select[name="away"], #create select[name="home"]')) return;
  const roster = document.querySelector(`#create textarea[name="${event.target.name}Roster"]`);
  if (roster.dataset.demo === 'true') roster.value = mockRoster(event.target.value).join('\n');
});
window.addEventListener('hashchange', () => guarded(route));
window.addEventListener('storage', e => {
  if (!live && e.key === localKey) guarded(async () => {
    games = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (game) {game = games.find(g => g.id === game.id); scorecard();} else dashboard();
  });
});
try {const config = await api('config'); live = config.live === true; demoPassword = config.demoPassword !== false;} catch {}
await guarded(route);
