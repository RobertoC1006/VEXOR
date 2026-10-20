import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';

const db = new PGlite();
try {
  await db.exec(await readFile('tests/db/bootstrap.sql', 'utf8'));
  const migrations = (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const file of migrations) {
    await db.exec('begin');
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    await db.exec('commit');
    console.log(`Migración aplicada desde cero: ${file}`);
  }
  const results = await db.exec(await readFile('tests/db/nucleo.sql', 'utf8'));
  const rows = results.flatMap(r => r.rows).filter((r: any) => r.resultado);
  const invitations = await db.exec(await readFile('tests/db/backend_acceso.sql','utf8'));
  rows.push(...invitations.flatMap(r=>r.rows).filter((r:any)=>r.resultado));
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/nucleo-local.json', JSON.stringify({ engine: 'PGlite PostgreSQL', at: new Date().toISOString(), rows }, null, 2));
  console.log(rows);
} catch (error: any) {
  console.error({ message: error.message, code: error.code, detail: error.detail, where: error.where });
  process.exitCode = 1;
} finally {
  await db.close();
}
