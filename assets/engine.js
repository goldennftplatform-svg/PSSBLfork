export const teams = [
  {id: 'la', name: 'Los Angeles', region: 'Los Angeles County'},
  {id: 'oc', name: 'Orange County', region: 'Orange County'},
  {id: 'sd', name: 'San Diego', region: 'San Diego County'},
  {id: 'ie', name: 'Inland Empire', region: 'Riverside / San Bernardino'}
];
export const results = ['1B', '2B', '3B', 'HR', 'BB', 'HBP', 'K', 'OUT', 'SAC', 'E', 'FC'];
export function createGame(id, away, home, rosters, innings = 9) {
  if (!teams.some(t => t.id === away) || !teams.some(t => t.id === home) || away === home) throw Error('Choose two different California teams.');
  for (const side of ['away', 'home']) {
    if (!Array.isArray(rosters[side]) || rosters[side].length < 1 || rosters[side].length > 15 || rosters[side].some(n => typeof n !== 'string' || !n.trim() || n.length > 60)) throw Error('Enter 1–15 player names per lineup, at most 60 characters each.');
  }
  return {id, away, home, rosters, innings: innings === 7 ? 7 : 9, events: [], version: 0};
}
export function state(game) {
  const s = {inning: 1, side: 'away', outs: 0, balls: 0, strikes: 0, bases: [null, null, null], score: {away: 0, home: 0}, hits: {away: 0, home: 0}, errors: {away: 0, home: 0}, lines: {away: [], home: []}, next: {away: 0, home: 0}, stats: {}, log: [], final: false};
  for (const side of ['away', 'home']) game.rosters[side].forEach((name, i) => {s.stats[`${side}:${i}`] = {name, PA: 0, AB: 0, H: 0, R: 0, RBI: 0, BB: 0, HBP: 0, K: 0, TB: 0};});
  const run = (id) => {s.score[s.side]++; s.lines[s.side][s.inning - 1] = (s.lines[s.side][s.inning - 1] || 0) + 1; s.stats[id].R++;};
  for (const e of game.events) {
    if (s.final) throw Error('Game is final. Undo the final marker to resume.');
    s.lines[s.side][s.inning - 1] ??= 0;
    if (e.type === 'final') {s.final = true; s.log.push('Game marked final by scorekeeper'); continue;}
    if (e.type === 'pitch') {
      if (!['ball', 'strike', 'foul'].includes(e.value)) throw Error('Invalid pitch.');
      if (e.value === 'ball') {if (s.balls === 3) throw Error('Record a walk to complete ball four.'); s.balls++;}
      if (e.value === 'strike') {if (s.strikes === 2) throw Error('Record a strikeout to complete strike three.'); s.strikes++;}
      if (e.value === 'foul') s.strikes = Math.min(2, s.strikes + 1);
      continue;
    }
    if (!['play', 'runners'].includes(e.type)) throw Error('Invalid event.');
    const batter = `${s.side}:${s.next[s.side]}`;
    const ids = s.bases.filter(Boolean);
    if (e.type === 'play') {
      if (!results.includes(e.result)) throw Error('Invalid plate appearance.');
      ids.push(batter);
    }
    if (!e.moves || Object.keys(e.moves).length !== ids.length || ids.some(id => !Object.hasOwn(e.moves, id))) throw Error('Specify a destination for every runner.');
    const destinations = Object.values(e.moves);
    if (destinations.some(v => !['1', '2', '3', 'score', 'out'].includes(v))) throw Error('Invalid runner destination.');
    const occupied = destinations.filter(v => ['1', '2', '3'].includes(v));
    if (new Set(occupied).size !== occupied.length) throw Error('Two runners cannot occupy the same base.');
    const outs = destinations.filter(v => v === 'out').length;
    if (s.outs + outs > 3) throw Error('This play would record more than three outs.');
    const scored = destinations.filter(v => v === 'score').length;
    if (s.outs + outs === 3 && scored && e.confirmRuns !== true) throw Error('Confirm runs count on the third out (never on a force out or batter out before first).');
    if (e.type === 'play') {
      if (['K', 'OUT', 'SAC'].includes(e.result) && e.moves[batter] !== 'out') throw Error('This result requires the batter to be out.');
      if (['1B', '2B', '3B', 'HR', 'BB', 'HBP', 'E', 'FC'].includes(e.result) && e.moves[batter] === 'out') throw Error('Use OUT for a batter retired on this simplified scorecard.');
      if (e.result === 'HR' && destinations.some(v => v !== 'score')) throw Error('A home run must score every runner and the batter.');
      if (['BB', 'HBP'].includes(e.result) && e.moves[batter] !== '1') throw Error('A walk or hit batter must reach first base.');
      if (!Number.isInteger(e.rbi) || e.rbi < 0 || e.rbi > scored || (['E', 'K'].includes(e.result) && e.rbi !== 0)) throw Error('Check RBI credit (0 through runs scored; none on error or strikeout).');
      const p = s.stats[batter]; p.PA++;
      if (!['BB', 'HBP', 'SAC'].includes(e.result)) p.AB++;
      if (['1B', '2B', '3B', 'HR'].includes(e.result)) {p.H++; s.hits[s.side]++; p.TB += { '1B': 1, '2B': 2, '3B': 3, HR: 4 }[e.result];}
      if (['BB', 'HBP', 'K'].includes(e.result)) p[e.result]++;
      if (e.result === 'E') s.errors[s.side === 'away' ? 'home' : 'away']++;
      p.RBI += e.rbi;
      s.log.push(`${s.side === 'away' ? 'Top' : 'Bottom'} ${s.inning} · ${p.name}: ${e.result}${scored ? ` · ${scored} run(s)` : ''}`);
      s.next[s.side] = (s.next[s.side] + 1) % game.rosters[s.side].length;
      s.balls = 0; s.strikes = 0;
    } else s.log.push(`${s.side === 'away' ? 'Top' : 'Bottom'} ${s.inning} · Runner adjustment${scored ? ` · ${scored} run(s)` : ''}`);
    s.bases = [null, null, null];
    for (const id of ids) {const d = e.moves[id]; if (d === 'score') run(id); else if (d !== 'out') s.bases[Number(d) - 1] = id;}
    s.outs += outs;
    if (s.outs === 3) {s.outs = 0; s.bases = [null, null, null]; s.balls = 0; s.strikes = 0; if (s.side === 'home') {s.inning++; s.side = 'away';} else s.side = 'home';}
  }
  return s;
}
export function append(game, event) {
  const next = {...game, events: [...game.events, event], version: game.version + 1}; state(next); return next;
}
export function suggestedMoves(game, result) {
  const s = state(game), moves = {}, batter = `${s.side}:${s.next[s.side]}`;
  s.bases.forEach((id, i) => {if (id) moves[id] = String(i + 1);});
  if (result === 'runners') return moves;
  const advance = {'1B': 1, '2B': 2, '3B': 3, HR: 4}[result];
  if (advance) {
    s.bases.forEach((id, i) => {if (id) moves[id] = i + 1 + advance >= 4 ? 'score' : String(i + 1 + advance);});
    moves[batter] = advance === 4 ? 'score' : String(advance);
  } else if (['BB', 'HBP', 'E', 'FC'].includes(result)) {
    moves[batter] = '1';
    for (let i = 0; i < 3 && s.bases[i]; i++) moves[s.bases[i]] = i === 2 ? 'score' : String(i + 2);
  } else moves[batter] = 'out';
  return moves;
}
