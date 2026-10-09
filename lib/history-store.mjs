import {readFile, writeFile, rename} from 'node:fs/promises';
import {randomUUID, createHash} from 'node:crypto';
import {parseHistory, recordIdentity} from './history-parser.mjs';

export async function historyStore(directory) {
  let db = {schema: 1, batches: [], records: [], audit: []}, queue = Promise.resolve();
  try {db = JSON.parse(await readFile(`${directory}/history.json`, 'utf8'));} catch (e) {if (e.code !== 'ENOENT') throw e;}
  if (db.schema !== 1 || !Array.isArray(db.batches) || !Array.isArray(db.records) || !Array.isArray(db.audit)) throw Error('Unsupported history store format.');
  const serialize = fn => {const job = queue.then(fn); queue = job.catch(() => {}); return job;};
  async function save(next) {await writeFile(`${directory}/history.tmp`, JSON.stringify(next)); await rename(`${directory}/history.tmp`, `${directory}/history.json`); db = next;}
  function summary(batch) {return {id: batch.id, filename: batch.filename, createdAt: batch.createdAt, sourceLabel: batch.sourceLabel, sha256: batch.sha256, total: batch.preview.total, valid: batch.preview.valid, invalid: batch.preview.invalid, published: db.records.filter(r => r.provenance.batchId === batch.id).length};}
  function find(id) {const batch = db.batches.find(b => b.id === id); if (!batch) throw Error('Import not found.'); return batch;}
  function preview(id) {
    const batch = find(id);
    return {...summary(batch), ...batch.preview, options: batch.options, rows: batch.preview.rows.map(row => {
      const duplicate = row.record && db.records.find(r => r.identity === recordIdentity(row.record));
      return {...row, duplicate: duplicate ? {id: duplicate.id, awayScore: duplicate.awayScore, homeScore: duplicate.homeScore, conflict: duplicate.awayScore !== row.record.awayScore || duplicate.homeScore !== row.record.homeScore} : null};
    })};
  }
  return {
    list: () => db.batches.map(summary).reverse(),
    preview,
    source: id => ({filename: find(id).filename, content: find(id).content}),
    publicRecords: () => db.records.map(({identity, ...record}) => record),
    backup: () => db,
    upload: input => serialize(async () => {
      const filename = String(input.filename || '').split(/[\\/]/).pop().slice(0, 150);
      const options = {columnMap: input.columnMap || {}, teamMap: input.teamMap || {}, defaultDate: input.defaultDate || '', season: input.season || '', allowHistoricalTeams: input.allowHistoricalTeams === true};
      const parsed = parseHistory({filename, content: input.content, ...options});
      if (db.batches.length >= 100) throw Error('This history store has reached 100 uploads. Export a backup and arrange archive maintenance before importing more.');
      const batch = {id: randomUUID(), filename, content: input.content, sha256: createHash('sha256').update(input.content).digest('hex'), sourceLabel: String(input.sourceLabel || 'Legacy export').slice(0, 150), createdAt: new Date().toISOString(), options, preview: parsed};
      await save({...db, batches: [...db.batches, batch], audit: [...db.audit, {type: 'upload', batchId: batch.id, at: batch.createdAt}]});
      return preview(batch.id);
    }),
    publish: (id, selected) => serialize(async () => {
      const batch = find(id);
      if (!Array.isArray(selected) || !selected.length || selected.some(i => !Number.isInteger(i)) || new Set(selected).size !== selected.length) throw Error('Select one or more unique valid row indices.');
      const rows = selected.map(i => batch.preview.rows[i]);
      if (rows.some(row => !row?.record || row.errors.length)) throw Error('Selection contains invalid or missing rows. Correct and re-upload those rows first.');
      const at = new Date().toISOString(), added = [], skipped = [];
      for (const row of rows) {
        const identity = recordIdentity(row.record);
        if (db.records.some(r => r.identity === identity) || added.some(r => r.identity === identity)) {skipped.push(row.index); continue;}
        added.push({...row.record, id: randomUUID(), identity, provenance: {batchId: batch.id, filename: batch.filename, sourceLabel: batch.sourceLabel, sha256: batch.sha256, row: row.line, parserVersion: batch.preview.parserVersion, importedAt: at, warnings: row.warnings}});
      }
      await save({...db, records: [...db.records, ...added], audit: [...db.audit, {type: 'publish', batchId: id, at, selected, added: added.map(r => r.id), skipped}]});
      return {added: added.length, skipped: skipped.length, message: 'Already imported matchups are never overwritten.', preview: preview(id)};
    })
  };
}
