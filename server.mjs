import http from 'node:http';
import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {randomUUID, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {teams, createGame, append} from './assets/engine.js';

export async function startServer({port = Number(process.env.PORT || 8080), directory = process.env.DATA_DIR || './runtime', passwords = JSON.parse(process.env.TEAM_PASSWORDS || '{}')} = {}) {
  await mkdir(directory, {recursive: true});
  let games = {};
  try {games = JSON.parse(await readFile(`${directory}/games.json`, 'utf8'));} catch (e) {if (e.code !== 'ENOENT') throw e;}
  const salt = randomBytes(32), keys = Object.fromEntries(teams.map(t => [t.id, scryptSync(passwords[t.id] || 'playball123', salt, 32)]));
  const sessions = new Map(), attempts = new Map(), listeners = new Map();
  let queue = Promise.resolve();
  function serialize(fn) {const pending = queue.then(fn); queue = pending.catch(() => {}); return pending;}
  async function save(next) {await writeFile(`${directory}/games.tmp`, JSON.stringify(next)); await rename(`${directory}/games.tmp`, `${directory}/games.json`); games = next;}
  const json = (res, code, data) => {res.writeHead(code, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}); res.end(JSON.stringify(data));};
  async function body(req) {
    let content = ''; for await (const chunk of req) {content += chunk; if (content.length > 65536) throw Error('Request too large.');}
    return JSON.parse(content || '{}');
  }
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, {error: 'Cross-origin writes are disabled.'});
      if (url.pathname === '/api/config') return json(res, 200, {live: true, demoPassword: teams.some(t => !passwords[t.id])});
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress, old = attempts.get(ip), record = old && old.until > Date.now() ? old : {count: 0, until: Date.now() + 60000};
        attempts.set(ip, record);
        if (++record.count > 10) return json(res, 429, {error: 'Too many attempts. Wait a minute.'});
        const b = await body(req);
        if (!keys[b.team] || typeof b.password !== 'string' || b.password.length > 200 || !timingSafeEqual(keys[b.team], scryptSync(b.password, salt, 32))) return json(res, 401, {error: 'Incorrect team password.'});
        const token = randomBytes(32).toString('hex'); sessions.set(token, {team: b.team, expires: Date.now() + 12 * 3600000});
        return json(res, 200, {token, team: b.team});
      }
      if (url.pathname === '/api/games' && req.method === 'GET') return json(res, 200, Object.values(games));
      const match = url.pathname.match(/^\/api\/games\/([\w-]+)(\/stream)?$/);
      if (match && req.method === 'GET') {
        const game = games[match[1]]; if (!game) return json(res, 404, {error: 'Game not found.'});
        if (!match[2]) return json(res, 200, game);
        res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'});
        res.write(`data: ${JSON.stringify(game)}\n\n`);
        const set = listeners.get(game.id) || new Set(); listeners.set(game.id, set); set.add(res);
        const timer = setInterval(() => res.write(': heartbeat\n\n'), 20000);
        req.on('close', () => {clearInterval(timer); set.delete(res); if (!set.size) listeners.delete(game.id);}); return;
      }
      if (req.method === 'POST' && (url.pathname === '/api/games' || match)) {
        const session = sessions.get((req.headers.authorization || '').replace(/^Bearer /, ''));
        if (!session || session.expires < Date.now()) return json(res, 401, {error: 'Sign in with your team password.'});
        const b = await body(req);
        return await serialize(async () => {
          if (!match) {
            if (![b.away, b.home].includes(session.team)) return json(res, 403, {error: 'Create games for your own team.'});
            const g = {...createGame(randomUUID(), b.away, b.home, b.rosters, b.innings), owner: session.team};
            await save({...games, [g.id]: g}); return json(res, 201, g);
          }
          const g = games[match[1]];
          if (!g) return json(res, 404, {error: 'Game not found.'});
          if (g.owner !== session.team) return json(res, 403, {error: 'Only the game’s scoring team can edit this game.'});
          if (b.version !== g.version) return json(res, 409, {error: 'Another scorekeeper updated this game. Refresh and retry.'});
          const next = b.undo ? {...g, events: g.events.slice(0, -1), version: g.version + 1} : append(g, b.event);
          await save({...games, [g.id]: next});
          for (const client of listeners.get(g.id) || []) client.write(`data: ${JSON.stringify(next)}\n\n`);
          return json(res, 200, next);
        });
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, {error: 'Endpoint not found.'});
      const file = {'/': 'index.html', '/index.html': 'index.html', '/assets/app.js': 'assets/app.js', '/assets/engine.js': 'assets/engine.js', '/assets/gameday.css': 'assets/gameday.css'}[url.pathname];
      if (!file || !['GET', 'HEAD'].includes(req.method)) return json(res, 404, {error: 'Not found.'});
      const content = await readFile(new URL(file, import.meta.url));
      res.writeHead(200, {'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin'});
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (e) {if (!res.headersSent) json(res, 400, {error: e.message}); else res.end();}
  });
  await new Promise(resolve => server.listen(port, resolve));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(); console.log(`California GameDay: http://localhost:${server.address().port}`);
}
