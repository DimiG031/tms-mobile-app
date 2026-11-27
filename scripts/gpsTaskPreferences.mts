import fs from 'node:fs';
import { target, taskPreferencesSource } from './lib/gpsTaskPreferences.mts';

const mode = process.argv[2];
if (mode !== '--apply' && mode !== '--remove') throw Error('Use --apply or --remove; rebuild Android afterwards.');
const root = new URL('../node_modules/', import.meta.url);
const version = JSON.parse(fs.readFileSync(new URL('expo-task-manager/package.json', root), 'utf8')).version;
if (version !== '14.0.9') throw Error('Unsupported expo-task-manager version; refusing preferences patch.');
const file = new URL(target, root);
const source = fs.readFileSync(file, 'utf8');
const prepared = taskPreferencesSource(source, mode === '--remove');
fs.writeFileSync(file, prepared);
console.log(mode === '--remove'
  ? 'Task preferences patch removed. Rebuild Android; no stored tasks or queued writes were deleted.'
  : 'Task preferences patch applied for local Android acceptance (debug/release). Rebuild Android. Device verification pending; no stored tasks or queued writes were deleted.');
