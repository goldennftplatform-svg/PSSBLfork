#!/usr/bin/env node
import {readFile, writeFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {parseHistory} from '../lib/history-parser.mjs';

// Standalone dry-run parser. It never publishes records or connects to a server.
const [file, ...args] = process.argv.slice(2);
if (!file || file === '--help') {
  console.log('Usage: node scripts/parse-history.mjs export.csv [--out report.json] [--date YYYY-MM-DD] [--season "2025 Fall"] [--team-map teams.json] [--column-map columns.json]\nPreview only. Exit code 2 means some rows need review. Publishing happens in the protected Admin importer.');
} else {
  try {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--out', '--date', '--season', '--team-map', '--column-map'].includes(args[i]) || !args[i + 1]) throw Error('Unknown or incomplete option. Run with --help.');
      options[args[i]] = args[i + 1];
    }
    const report = parseHistory({filename: basename(file), content: await readFile(file, 'utf8'), defaultDate: options['--date'], season: options['--season'], teamMap: options['--team-map'] ? JSON.parse(await readFile(options['--team-map'], 'utf8')) : {}, columnMap: options['--column-map'] ? JSON.parse(await readFile(options['--column-map'], 'utf8')) : {}});
    if (options['--out']) await writeFile(options['--out'], JSON.stringify(report, null, 2), {flag: 'wx'});
    else console.log(JSON.stringify(report, null, 2));
    console.error(`${report.total} rows: ${report.valid} ready for review, ${report.invalid} need correction. No history was published.`);
    if (report.invalid) process.exitCode = 2;
  } catch (e) {console.error(e.message); process.exitCode = 1;}
}
