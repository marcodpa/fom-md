import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Aplica TODAS las migraciones en orden contra un PostgreSQL 17 real (WASM).
// Ninguna migracion de este repositorio usa PostGIS ni TimescaleDB, asi que la
// unica diferencia con el motor del CI son esas extensiones, que aqui no hacen
// falta. Esto convierte una vuelta de 25 minutos en una de veinte segundos.
const DIR = process.argv[2];
const db = await PGlite.create();
await db.exec(`
  CREATE ROLE fom_app;
  CREATE ROLE fom_readonly;
  CREATE SCHEMA IF NOT EXISTS fom_meta;
  -- La crea node-pg-migrate, no una migracion; aqui se emula igual.
  CREATE TABLE fom_meta.pgmigrations (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL,
    run_on timestamp NOT NULL
  );
`);

const archivos = readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort();
for (const archivo of archivos) {
  const src = readFileSync(join(DIR, archivo), 'utf8');
  const bloques = [...src.matchAll(/pgm\.sql\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
  const creaEsquema = /pgm\.createSchema\(\s*'([a-z_]+)'/.exec(src);
  try {
    if (creaEsquema) await db.exec(`CREATE SCHEMA IF NOT EXISTS ${creaEsquema[1]}`);
    if (bloques[0]) await db.exec(bloques[0]);
    console.log('  ok   %s', archivo.slice(18));
  } catch (error) {
    console.log('\nFALLA %s', archivo.slice(18));
    console.log('  %s [%s]', error.message, error.code ?? '');
    for (const k of ['detail', 'hint', 'where']) if (error[k]) console.log('  %s: %s', k, error[k]);
    if (error.position && bloques[0]) {
      const p = Number(error.position);
      console.log('  --- contexto ---');
      console.log(bloques[0].slice(Math.max(0, p - 300), p + 90));
    }
    process.exit(1);
  }
}
console.log('\nTODAS LAS MIGRACIONES APLICADAS');

// Ademas de aplicar, ejercitar los scripts SQL que el CI corre despues. Son
// los que detectan que una columna nueva rompio a quien ya escribia.
for (const script of process.argv.slice(3)) {
  try {
    await db.exec(readFileSync(script, 'utf8'));
    console.log('  ok   %s', script);
  } catch (error) {
    console.log('\nFALLA %s\n  %s [%s]', script, error.message, error.code ?? '');
    if (error.detail) console.log('  detail: %s', error.detail);
    process.exit(1);
  }
}
