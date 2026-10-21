import { Client } from 'pg';
import { readFile } from 'node:fs/promises';

// Ejecutar solo contra desarrollo: la suite usa datos ficticios y ROLLBACK.
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error('Falta MIGRATION_DATABASE_URL de la base de desarrollo');
if (process.env.VEXOR_TEST_TARGET !== 'development') throw new Error('Establece VEXOR_TEST_TARGET=development');
const client = new Client({ connectionString: url });
await client.connect();
try {
  const results = await client.query(await readFile('backend/tests/database/nucleo.sql', 'utf8'));
  console.log((Array.isArray(results) ? results : [results]).flatMap(r => r.rows).filter(r => r.resultado));
  const invitations=await client.query(await readFile('backend/tests/database/backend_acceso.sql','utf8'));
  console.log((Array.isArray(invitations)?invitations:[invitations]).flatMap(r=>r.rows).filter(r=>r.resultado));
} finally {
  await client.query('rollback');
  await client.end();
}
