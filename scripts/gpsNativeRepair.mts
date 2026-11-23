import fs from 'node:fs';
import { repairs, repairSource } from './lib/gpsNativeRepair.mts';
const mode = process.argv[2];
if (mode !== '--development' && mode !== '--remove') throw new Error('Use --development or --remove; target Android acceptance is pending.');
const root = new URL('../node_modules/', import.meta.url);
const version = JSON.parse(fs.readFileSync(new URL('expo-task-manager/package.json', root), 'utf8')).version;
if (version !== '14.0.9') throw new Error('Unsupported expo-task-manager version; refusing native repair.');
const locationVersion = JSON.parse(fs.readFileSync(new URL('expo-location/package.json', root), 'utf8')).version;
if (locationVersion !== '19.0.8') throw new Error('Unsupported expo-location version; refusing native repair.');
const prepared = repairs.map(({path, edits}) => {
  const file = new URL(path, root);
  return {file, content: repairSource(fs.readFileSync(file, 'utf8'), edits, mode === '--remove')};
});
for (const {file, content} of prepared) fs.writeFileSync(file, content);
console.log(mode === '--remove' ? 'Development GPS repair removed; rebuild Android.' : 'Development GPS repair v1 applied. Rebuild Android; target device acceptance is still required.');
