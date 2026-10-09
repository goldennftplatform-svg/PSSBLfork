import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {parseHistory, recordIdentity} from '../lib/history-parser.mjs';
import {historyStore} from '../lib/history-store.mjs';
import {createGame, append, suggestedMoves} from '../assets/engine.js';
import {startServer} from '../server.mjs';

const csv = 'Date,Season,Away Team,Home Team,Away Runs,Home Runs,Status,Game Number,Venue\r\n2025-06-01,2025 Spring,Braves,CBA Tigers,5,3,Final,1,"Park, North"\r\n';
const parse = content => parseHistory({filename: 'old.csv', content});

test('CSV quoted cells, BOM, embedded newlines, source aliases, and zero scores', () => {
  const result = parse('\uFEFF' + csv + '2025-06-02,2025 Spring,PCBLLA-THEBEES,PCBLMUDHENS,0,0,Final,1,"Field\nTwo"');
  assert.equal(result.valid, 2);
  assert.equal(result.rows[0].record.venue, 'Park, North');
  assert.equal(result.rows[1].record.away, 'the-bats');
  assert.equal(result.rows[1].record.home, 'smokies');
  assert.equal(result.rows[1].record.awayScore, 0);
  assert.equal(result.rows[1].record.detail, null);
  assert.match(result.rows[0].warnings.join(' '), /Summary only/);
});

test('mapping custom columns and exact legacy team aliases is explicit and audited', () => {
  const p = parseHistory({filename: 'legacy.tsv', content: 'Played\tGuest Club\tHost\tGuest R\tHome Score\n6/1/2025\tOld Braves\tCBA Tigers\t4\t2', columnMap: {date: 'Played', away: 'Guest Club', awayScore: 'Guest R'}, teamMap: {'Old Braves': 'braves'}, season: '2025 Spring'});
  assert.equal(p.valid, 1); assert.equal(p.rows[0].record.date, '2025-06-01');
  assert.match(p.rows[0].warnings.join(' '), /US month\/day\/year/);
  assert.match(p.rows[0].warnings.join(' '), /Season supplied/);
  assert.match(p.rows[0].warnings.join(' '), /Final status inferred/);
});

test('unknown names are blocked unless historical-only retention is explicitly selected', () => {
  const content = csv.replace('Braves', 'Retired <Club>');
  assert.equal(parse(content).invalid, 1);
  const one = parseHistory({filename: 'old.csv', content, allowHistoricalTeams: true});
  assert.equal(one.valid, 1); assert.match(one.rows[0].record.away, /^historic-/);
  assert.equal(one.rows[0].record.awayName, 'Retired <Club>');
  assert.match(one.rows[0].warnings.join(' '), /Historical-only/);
});

test('bad dates, incomplete scores, invalid status, duplicate headers and malformed CSV fail safely', () => {
  for (const content of [csv.replace('2025-06-01', '2025-02-30'), csv.replace(',5,3,', ',,3,'), csv.replace(',5,3,', ',-1,3,'), csv.replace(',Final,', ',Postponed,'), csv.replace(',1,"Park', ',0,"Park')]) assert.equal(parse(content).invalid, 1);
  assert.throws(() => parse('Date,Date\n1,2'), /Duplicate column/);
  assert.throws(() => parse('Date,Home\n"unfinished'), /Unclosed/);
  assert.throws(() => parseHistory({filename: 'old.pdf', content: '%PDF'}), /Supported formats/);
  assert.throws(() => parse('x'.repeat(2 * 1024 * 1024 + 1)), /2 MB/);
  assert.throws(() => parseHistory({filename: 'x.csv', content: csv, teamMap: []}), /JSON objects/);
  assert.equal(parse(csv + '2025-06-02,Too Few').invalid, 1);
});

test('duplicate games are flagged; numbered doubleheaders remain separate', () => {
  const row = csv.split('\r\n')[1];
  const p = parse(csv + row + '\r\n' + row.replace(',Final,1,', ',Final,2,'));
  assert.equal(p.valid, 2); assert.equal(p.invalid, 1);
  assert.match(p.rows[1].errors.join(' '), /Duplicate/);
  assert.notEqual(recordIdentity(p.rows[0].record), recordIdentity(p.rows[2].record));
});

test('native exports recover event-derived stats only when final, with explicit missing-date fallback', () => {
  let g = createGame('native', 'braves', 'cba-tigers', {away: ['Demo batter'], home: ['Demo home']});
  g = append(g, {type: 'play', result: 'HR', moves: suggestedMoves(g, 'HR'), rbi: 1});
  const unfinished = parseHistory({filename: 'game.json', content: JSON.stringify(g), defaultDate: '2025-01-01'});
  assert.equal(unfinished.invalid, 1);
  g = append(g, {type: 'final'});
  const p = parseHistory({filename: 'game.json', content: JSON.stringify({...g, computed: {score: {away: 99}}}), defaultDate: '2025-01-01'});
  assert.equal(p.valid, 1); assert.equal(p.rows[0].record.awayScore, 1);
  assert.equal(p.rows[0].record.detail.batting['away:0'].RBI, 1);
  assert.match(p.rows[0].warnings.join(' '), /Date supplied/);
  assert.equal(parseHistory({filename: 'game.json', content: JSON.stringify(g)}).invalid, 1);
});

test('history store preserves originals, supports partial approval, survives restart and never overwrites duplicates', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-store-'));
  try {
    let store = await historyStore(dir);
    const input = {filename: '../../old.csv', content: csv, sourceLabel: 'Legacy test'};
    const batch = await store.upload(input);
    assert.equal(batch.filename, 'old.csv'); assert.equal(store.publicRecords().length, 0);
    assert.equal(store.source(batch.id).content, csv);
    await assert.rejects(store.publish(batch.id, [99]), /invalid/);
    const concurrent = await Promise.all([store.publish(batch.id, [0]), store.publish(batch.id, [0])]);
    assert.deepEqual(concurrent.map(r => r.added).sort(), [0, 1]);
    const conflict = await store.upload({...input, content: csv.replace(',5,3,', ',9,3,')});
    assert.equal(conflict.rows[0].duplicate.conflict, true);
    assert.equal((await store.publish(conflict.id, [0])).added, 0);
    store = await historyStore(dir);
    assert.equal(store.publicRecords()[0].awayScore, 5);
    assert.equal(store.publicRecords()[0].provenance.sha256, batch.sha256);
    assert.equal(store.backup().batches.length, 2); assert.ok(store.backup().audit.length >= 4);
  } finally {await rm(dir, {recursive: true, force: true});}
});

test('CLI parser generates a review-only report and refuses to overwrite reports', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-cli-'));
  try {
    const input = join(dir, 'input.csv'), output = join(dir, 'report.json'); await writeFile(input, csv);
    const run = () => spawnSync(process.execPath, ['scripts/parse-history.mjs', input, '--out', output], {encoding: 'utf8'});
    assert.equal(run().status, 0);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).valid, 1);
    assert.equal(run().status, 1);
  } finally {await rm(dir, {recursive: true, force: true});}
});

test('admin API isolates team access, gates publishing, hides originals and exposes only approved history', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-api-'));
  const secret = randomBytes(24).toString('hex');
  const server = await startServer({port: 0, directory: dir, adminPassword: secret});
  const base = `http://localhost:${server.address().port}`;
  const request = async (path, data, token) => {
    const r = await fetch(`${base}/api/${path}`, {method: data ? 'POST' : 'GET', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(data ? {body: JSON.stringify(data)} : {})});
    return {status: r.status, data: await r.json()};
  };
  try {
    assert.equal((await request('config')).data.adminConfigured, true);
    assert.equal((await request('admin/login', {password: 'playball123'})).status, 401);
    const team = (await request('login', {team: 'braves', password: 'playball123'})).data.token;
    assert.equal((await request('admin/imports', null, team)).status, 401);
    const admin = (await request('admin/login', {password: secret})).data.token;
    const upload = await request('admin/imports', {filename: 'unicode.csv', content: csv.replace('Park, North', 'Parque, José'), sourceLabel: 'Test archive'}, admin);
    assert.equal(upload.status, 201); const id = upload.data.id;
    assert.equal((await request('history')).data.length, 0);
    assert.equal((await request(`admin/imports/${id}/publish`, {rows: [0]}, admin)).status, 400);
    assert.equal((await request(`admin/imports/${id}/publish`, {rows: [0], confirm: true}, team)).status, 401);
    assert.equal((await request(`admin/imports/${id}/publish`, {rows: [0], confirm: true}, admin)).data.added, 1);
    const published = (await request('history')).data;
    assert.equal(published[0].venue, 'Parque, José'); assert.equal(published[0].awayScore, 5);
    assert.ok(!Object.hasOwn(published[0], 'content'));
    assert.equal((await request('games')).data.length, 0);
    assert.equal((await fetch(`${base}/api/admin/imports/${id}/source`)).status, 401);
    const source = await fetch(`${base}/api/admin/imports/${id}/source`, {headers: {Authorization: `Bearer ${admin}`}});
    assert.match(source.headers.get('content-disposition'), /attachment/);
    assert.match(await source.text(), /José/);
    assert.equal((await request('admin/backup', null, team)).status, 401);
    assert.equal((await request('admin/backup', null, admin)).data.records.length, 1);
    assert.equal((await fetch(`${base}/runtime/history.json`)).status, 404);
    assert.equal((await fetch(`${base}/assets/admin.js`)).status, 200);
    await request('admin/logout', {}, admin);
    assert.equal((await request('admin/imports', null, admin)).status, 401);
  } finally {await new Promise(resolve => {server.close(resolve); server.closeAllConnections();}); await rm(dir, {recursive: true, force: true});}
});

test('admin is disabled when no separate password has been configured', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-disabled-'));
  const server = await startServer({port: 0, directory: dir, adminPassword: ''});
  try {
    const r = await fetch(`http://localhost:${server.address().port}/api/admin/login`, {method: 'POST', body: JSON.stringify({password: 'playball123'})});
    assert.equal(r.status, 503);
  } finally {await new Promise(resolve => {server.close(resolve); server.closeAllConnections();}); await rm(dir, {recursive: true, force: true});}
});
