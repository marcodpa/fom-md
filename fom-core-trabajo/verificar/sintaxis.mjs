import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Comprueba SOLO la sintaxis de cada sentencia con el analizador real de
// PostgreSQL 17. Los errores de catalogo (tabla o tipo que todavia no existe)
// se ignoran a proposito: dependen del orden de las migraciones, no de que la
// sentencia este bien escrita. El unico codigo que interesa es 42601.
const CATALOGO = new Set([
  '42P01', '42704', '42P07', '42883', '42703', '3F000', '42710',
  '42P06', '42723', '42P16', '42809', '55000', '0A000', '42P17', '42601#',
]);

function separar(sql) {
  const out = [];
  let buf = '', i = 0, dentro = null;
  while (i < sql.length) {
    if (dentro === null) {
      const m = /^\$[a-zA-Z_]*\$/.exec(sql.slice(i));
      if (m) { dentro = m[0]; buf += dentro; i += dentro.length; continue; }
      if (sql[i] === "'") {
        let j = i + 1;
        while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) {
          j += sql[j] === "'" ? 2 : 1;
        }
        buf += sql.slice(i, j + 1); i = j + 1; continue;
      }
      if (sql.startsWith('--', i)) {
        const j = sql.indexOf('\n', i);
        const fin = j === -1 ? sql.length : j;
        buf += sql.slice(i, fin); i = fin; continue;
      }
      if (sql[i] === ';') { buf += ';'; out.push(buf); buf = ''; i += 1; continue; }
    } else if (sql.startsWith(dentro, i)) {
      buf += dentro; i += dentro.length; dentro = null; continue;
    }
    buf += sql[i]; i += 1;
  }
  if (buf.trim()) out.push(buf);
  return out.filter((s) => s.trim());
}

const db = await PGlite.create();
await db.exec('CREATE SCHEMA IF NOT EXISTS fom; CREATE SCHEMA IF NOT EXISTS fom_meta;');

let fallos = 0;
for (const archivo of process.argv.slice(2)) {
  const src = readFileSync(archivo, 'utf8');
  const bloques = [...src.matchAll(/pgm\.sql\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
  const nombre = archivo.split(/[\/]/).pop();
  for (const [n, bloque] of bloques.entries()) {
    for (const sentencia of separar(bloque)) {
      try {
        await db.exec(sentencia);
      } catch (error) {
        if (CATALOGO.has(error.code)) continue;
        if (error.code !== '42601') continue;
        fallos += 1;
        console.log('\n### SINTAXIS  %s  bloque %s', nombre, n === 0 ? 'up' : 'down');
        console.log('    %s (posicion %s)', error.message, error.position ?? '?');
        const p = Number(error.position ?? sentencia.length);
        console.log('----------------------------------------');
        console.log(sentencia.slice(Math.max(0, p - 420), p + 60));
        console.log('---------------------------------------- (el error esta al final)');
      }
    }
  }
}
console.log(fallos ? '\n%d error(es) de sintaxis' : '\nSin errores de sintaxis', fallos || '');
