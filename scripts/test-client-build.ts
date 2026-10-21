import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const secrets = ['SUPABASE_SECRET_KEY', 'DATABASE_URL', 'MIGRATION_DATABASE_URL']
  .flatMap((key) => {
    const value = process.env[key];
    if (!value) return [];
    if (key.endsWith('DATABASE_URL')) {
      const url = new URL(value);
      return [value, decodeURIComponent(url.password)];
    }
    return [value];
  })
  .filter((value) => value.length > 12);
async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await scan(file);
    else {
      const contents = await readFile(file);
      assert.ok(
        !secrets.some((secret) => contents.includes(secret)),
        'Secreto en el bundle público',
      );
    }
  }
}
await scan('dist/web');
const manifest = JSON.parse(await readFile('dist/web/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
for (const icon of manifest.icons) {
  const png = await readFile(join('dist/web', icon.src));
  const size = Number(icon.sizes.split('x')[0]);
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
const worker = await readFile('dist/web/sw.js', 'utf8');
assert.ok(worker.includes('/offline.html'));
assert.ok(worker.includes('/api/'));
assert.ok(worker.includes('/auth/'));
console.log(
  'Bundle público sin secretos locales; manifest, dimensiones de iconos y exclusiones del worker correctos.',
);
