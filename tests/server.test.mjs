import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../server.mjs';
test('team authorization, persistence, concurrent updates and spectator live stream', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'california-test-'));
  let server = await startServer({port: 0, directory});
  let base = `http://localhost:${server.address().port}`;
  const request = async (path, data, token) => {
    const r = await fetch(`${base}/api/${path}`, {method: data ? 'POST' : 'GET', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(data ? {body: JSON.stringify(data)} : {})});
    return {status: r.status, data: await r.json()};
  };
  const shutdown = () => new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
  try {
    assert.equal((await request('login', {team: 'la', password: 'bad'})).status, 401);
    const la = (await request('login', {team: 'la', password: 'playball123'})).data.token;
    const oc = (await request('login', {team: 'oc', password: 'playball123'})).data.token;
    const braves = (await request('login', {team: 'braves', password: 'playball123'})).data.token;
    const mock = await request('games', {away: 'braves', home: 'cba-tigers', rosters: {away: ['BR Demo Player 1'], home: ['CT Demo Player 1']}}, braves);
    assert.equal(mock.status, 201);
    assert.equal(mock.data.owner, 'braves');
    assert.equal((await request(`games/${mock.data.id}`, {version: 0, event: {type: 'pitch', value: 'ball'}}, la)).status, 403);
    for (const module of ['views', 'teams']) {
      const asset = await fetch(`${base}/assets/${module}.js`);
      assert.equal(asset.status, 200);
      assert.match(asset.headers.get('content-type'), /javascript/);
    }
    const payload = {away: 'la', home: 'oc', rosters: {away: ['A'], home: ['B']}};
    assert.equal((await request('games', payload)).status, 401);
    const g = (await request('games', payload, la)).data;
    assert.equal((await request(`games/${g.id}`, {version: 0, event: {type: 'pitch', value: 'ball'}}, oc)).status, 403);
    const abort = new AbortController();
    const feed = await fetch(`${base}/api/games/${g.id}/stream`, {signal: abort.signal});
    const reader = feed.body.getReader(); assert.match(new TextDecoder().decode((await reader.read()).value), /"version":0/);
    const updates = await Promise.all([1, 2].map(() => request(`games/${g.id}`, {version: 0, event: {type: 'pitch', value: 'ball'}}, la)));
    assert.deepEqual(updates.map(r => r.status).sort(), [200, 409]);
    const message = await Promise.race([reader.read(), new Promise((_, reject) => {const timer = setTimeout(() => reject(Error('SSE timeout')), 3000); timer.unref();})]);
    assert.match(new TextDecoder().decode(message.value), /"version":1/); abort.abort();
    assert.equal((await fetch(`${base}/runtime/games.json`)).status, 404);
    assert.equal((await fetch(`${base}/data/library.json`)).status, 404);
    await shutdown(); server = await startServer({port: 0, directory}); base = `http://localhost:${server.address().port}`;
    assert.equal((await request(`games/${g.id}`)).data.version, 1);
    assert.equal((await request(`games/${g.id}`, {version: 1, undo: true}, la)).status, 401);
  } finally {await shutdown(); await rm(directory, {recursive: true, force: true});}
});
