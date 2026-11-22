import fs from 'node:fs';
import { versions, patches, probeSource } from './lib/gpsNativeProbe.mts';
const mode = process.argv[2];
if (mode !== '--development' && mode !== '--remove') throw new Error('Use --development or --remove; never apply to a production build.');
const root = new URL('../node_modules/', import.meta.url);
for (const [name, expected] of Object.entries(versions)) {
  const actual = JSON.parse(fs.readFileSync(new URL(name + '/package.json', root), 'utf8')).version;
  if (actual !== expected) throw new Error('Unsupported native package version: ' + name);
}
const prepared = patches.map(({ path, edits }) => {
  const file = new URL(path, root);
  return { file, content: probeSource(fs.readFileSync(file, 'utf8'), edits, mode === '--remove') };
});
for (const { file, content } of prepared) fs.writeFileSync(file, content);
console.log(mode === '--remove' ? 'GPS native probe removed; rebuild to remove it from the APK.' : 'GPS native probe v1 applied for a local development build. Rebuild Android; Metro reload alone is insufficient.');
