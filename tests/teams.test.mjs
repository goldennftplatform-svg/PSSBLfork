import test from 'node:test';
import assert from 'node:assert/strict';
import {teams, allTeams, getTeam, mockRoster} from '../assets/teams.js';
import {createGame} from '../assets/engine.js';
import {dashboardView, scorecardView} from '../assets/views.js';

test('published directory preserves all 28 team names and source divisions', () => {
  assert.equal(teams.length, 28);
  assert.equal(new Set(allTeams.map(t => t.id)).size, allTeams.length);
  assert.deepEqual(Object.fromEntries(['AAA', 'AA', 'A', 'Majors', 'Inactive'].map(d => [d, teams.filter(t => t.division === d).length])), {AAA: 8, AA: 5, A: 8, Majors: 6, Inactive: 1});
  assert.equal(getTeam('crooks').active, false);
  assert.equal(getTeam('cerveceros').sourceId, 'PCBLL-BURBANKBREWERS');
  assert.equal(getTeam('the-bats').sourceId, 'PCBLLA-THEBEES');
  assert.equal(getTeam('smokies').sourceId, 'PCBLMUDHENS');
  for (const t of teams) {assert.match(t.url, /^https:\/\/www.htosports.com\/teams\//); assert.equal(mockRoster(t.id).length, 9); assert.match(mockRoster(t.id)[0], /Demo Player/);}
});

test('directory is available in login and setup, with explicit mock/inactive labels', () => {
  const ctx = {live: true, demoPassword: true, session: null, games: []};
  const html = dashboardView(ctx);
  for (const t of teams) assert.ok(html.includes(`value="${t.id}"`));
  assert.match(html, /Crooks \(inactive — mock only\)/);
  assert.match(html, /2026-10-09/);
  assert.match(html, /not official PCBL records/);
  const setup = dashboardView({...ctx, session: {team: 'braves'}});
  assert.match(setup, /BR Demo Player 1/);
  assert.match(setup, /value="berserkers" selected/);
});

test('real team scorecards escape user-entered names and preserve legacy games', () => {
  for (const [away, home] of [['braves', 'cba-tigers'], ['la', 'oc']]) {
    const game = {...createGame('test', away, home, {away: ['<img onerror=alert(1)>'], home: ['Player']}), owner: away};
    const html = scorecardView({live: true, game, session: {team: away}});
    assert.ok(!html.includes('<img onerror='));
    assert.match(html, /&lt;img onerror/);
    assert.ok(html.includes(getTeam(away).name));
  }
});
