import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = process.argv[2];
const db = await PGlite.create();
await db.exec(`
  CREATE ROLE fom_app; CREATE ROLE fom_readonly;
  CREATE SCHEMA IF NOT EXISTS fom_meta;
  CREATE TABLE fom_meta.pgmigrations (
    id serial PRIMARY KEY, name varchar(255) NOT NULL, run_on timestamp NOT NULL);
`);

const bloquesDe = (f) => {
  const src = readFileSync(join(DIR, f), 'utf8');
  return [...src.matchAll(/pgm\.sql\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
};
const archivos = readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort();

for (const f of archivos) {
  const src = readFileSync(join(DIR, f), 'utf8');
  const esq = /pgm\.createSchema\(\s*'([a-z_]+)'/.exec(src);
  if (esq) await db.exec(`CREATE SCHEMA IF NOT EXISTS ${esq[1]}`);
  const b = bloquesDe(f)[0];
  if (b) await db.exec(b);
}
console.log('aplicadas las %d migraciones', archivos.length);

const tablas = async () => (await db.query(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='fom'"
)).rows[0].n;
console.log('tablas en fom antes de revertir: %d', await tablas());

// Revertir solo las cuatro nuevas, en orden inverso, como hace el CI.
const nuevas = archivos.filter((f) => f.startsWith('20260818')).reverse();
for (const f of nuevas) {
  const down = bloquesDe(f)[1];
  if (!down) { console.log('  SIN down(): %s', f); continue; }
  try {
    await db.exec(down);
    console.log('  revertida  %s', f.slice(18));
  } catch (error) {
    console.log('\nFALLA AL REVERTIR %s', f.slice(18));
    console.log('  %s [%s]', error.message, error.code ?? '');
    if (error.detail) console.log('  detail: %s', error.detail);
    if (error.position) {
      const p = Number(error.position);
      console.log('  --- contexto ---');
      console.log(down.slice(Math.max(0, p - 300), p + 90));
    }
    process.exit(1);
  }
}
console.log('tablas en fom despues de revertir: %d', await tablas());
