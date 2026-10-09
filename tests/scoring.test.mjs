import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, append, state, suggestedMoves} from '../assets/engine.js';
const rosters = {away: Array.from({length: 9}, (_, i) => `A${i}`), home: Array.from({length: 9}, (_, i) => `H${i}`)};
const fresh = () => createGame('test', 'la', 'oc', rosters);
function play(g, result) {const moves = suggestedMoves(g, result); return append(g, {type: 'play', result, moves, rbi: ['E', 'K'].includes(result) ? 0 : Object.values(moves).filter(v => v === 'score').length});}
test('bases-loaded walk forces one run; grand slam credits hits, runs and RBI', () => {
  let g = fresh(); for (let i = 0; i < 4; i++) g = play(g, 'BB');
  assert.equal(state(g).score.away, 1); assert.equal(state(g).stats['away:3'].AB, 0);
  g = play(g, 'HR'); const s = state(g);
  assert.equal(s.score.away, 5); assert.equal(s.hits.away, 1); assert.equal(s.stats['away:4'].RBI, 4); assert.equal(s.stats['away:4'].TB, 4); assert.deepEqual(s.bases, [null, null, null]);
});
test('third out clears bases and changes side; full inning advances; undo replays', () => {
  let g = play(fresh(), '1B'); for (let i = 0; i < 6; i++) g = play(g, 'K');
  assert.equal(state(g).inning, 2); assert.equal(state(g).side, 'away');
  assert.equal(state({...g, events: g.events.slice(0, -1)}).outs, 2);
});
test('runner plays preserve batter and count; collisions and excessive outs rejected', () => {
  let g = play(fresh(), '1B'); g = append(g, {type: 'pitch', value: 'ball'});
  g = append(g, {type: 'runners', moves: {'away:0': '2'}});
  assert.equal(state(g).next.away, 1); assert.equal(state(g).balls, 1); assert.equal(state(g).bases[1], 'away:0');
  assert.throws(() => append(g, {type: 'play', result: '1B', moves: {'away:0': '1', 'away:1': '1'}, rbi: 0}), /same base/);
});
test('third-out runs require explicit confirmation', () => {
  let g = play(fresh(), '3B'); g = play(g, 'K'); g = play(g, 'K');
  const e = {type: 'play', result: 'OUT', moves: {'away:0': 'score', 'away:3': 'out'}, rbi: 1};
  assert.throws(() => append(g, e), /Confirm runs/);
  assert.equal(state(append(g, {...e, confirmRuns: true})).score.away, 1);
});
test('fouls cap at two strikes; fourth ball requires walk; final blocks writes', () => {
  let g = fresh(); for (let i = 0; i < 4; i++) g = append(g, {type: 'pitch', value: 'foul'});
  assert.equal(state(g).strikes, 2);
  for (let i = 0; i < 3; i++) g = append(g, {type: 'pitch', value: 'ball'});
  assert.throws(() => append(g, {type: 'pitch', value: 'ball'}), /walk/);
  g = append(g, {type: 'final'}); assert.throws(() => play(g, 'HR'), /final/);
});
test('errors charge fielding side and do not count as hits', () => {
  const s = state(play(fresh(), 'E')); assert.equal(s.errors.home, 1); assert.equal(s.hits.away, 0); assert.equal(s.stats['away:0'].AB, 1);
});
