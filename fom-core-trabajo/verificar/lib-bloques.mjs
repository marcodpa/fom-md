import { readFileSync } from 'node:fs';

/**
 * Extrae el SQL de una migracion, separando up() de down().
 *
 * Una migracion puede tener VARIOS `pgm.sql(...)` en cada direccion: la de
 * telemetria tiene cuatro en up() —lock_timeout, ALTER, restricciones y
 * comentarios—. Quedarse con el primero hacia creer que la migracion se habia
 * aplicado cuando en realidad solo se habia ejecutado el `SET LOCAL`.
 *
 * El corte es la posicion de `export const down`: lo que viene antes pertenece
 * a up(), lo que viene despues a down().
 */
export function bloquesDe(archivo) {
  const src = readFileSync(archivo, 'utf8');
  const corte = src.indexOf('export const down');
  const up = [];
  const down = [];
  for (const m of src.matchAll(/pgm\.sql\(`([\s\S]*?)`\)/g)) {
    (corte === -1 || m.index < corte ? up : down).push(m[1]);
  }
  const esquema = /pgm\.createSchema\(\s*'([a-z_]+)'/.exec(src);
  return { up, down, esquema: esquema?.[1] ?? null };
}
