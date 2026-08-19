'use strict';

const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { test } = require('node:test');

// ============================================================
// SEGURIDAD DE LA PLANTILLA EN LAS MIGRACIONES
// ------------------------------------------------------------
// El SQL de cada migración vive dentro de una plantilla de TypeScript
// delimitada por comillas invertidas. Cualquier comilla invertida dentro del
// SQL cierra la cadena a media migración: el archivo deja de compilar, y el
// error que da TypeScript —«',' expected»— señala una línea que no tiene nada
// que ver con la causa.
//
// Es un error fácil de cometer y caro de diagnosticar: pasó tres veces en este
// repositorio, siempre al redactar un comentario explicando por qué una
// columna se llama como se llama. Escribir `category` con comillas invertidas
// es el reflejo natural de cualquiera que documente código.
//
// Esta prueba lo convierte en un fallo inmediato y con nombre propio, en vez de
// un error de sintaxis a cincuenta líneas de distancia.
//
// También comprueba `${`, que TypeScript interpretaría como interpolación:
// ese sí compila a veces, y entonces el daño es peor —SQL alterado en
// silencio— en lugar de un archivo que no compila.
// ============================================================

const DIRECTORIO = resolve(__dirname, '..', 'src/database/migrations/files');

const migraciones = readdirSync(DIRECTORIO)
  .filter((archivo) => archivo.endsWith('.ts'))
  .sort();

/** Devuelve el SQL de cada `pgm.sql(...)` con la línea donde empieza. */
function bloquesSql(fuente) {
  const bloques = [];
  for (const encontrado of fuente.matchAll(/pgm\.sql\(`([\s\S]*?)`\)/g)) {
    bloques.push({
      sql: encontrado[1],
      lineaInicial: fuente.slice(0, encontrado.index).split('\n').length,
    });
  }
  return bloques;
}

test('hay migraciones que revisar', () => {
  // Si el glob deja de encontrar archivos, las tres pruebas siguientes pasan
  // sin comprobar nada. Este es el canario.
  assert.ok(migraciones.length > 10, `solo se encontraron ${migraciones.length}`);
});

test('ninguna migración lleva comillas invertidas dentro del SQL', () => {
  const fallos = [];

  for (const archivo of migraciones) {
    const fuente = readFileSync(join(DIRECTORIO, archivo), 'utf8');
    for (const { sql, lineaInicial } of bloquesSql(fuente)) {
      sql.split('\n').forEach((linea, indice) => {
        if (linea.includes('`')) {
          fallos.push(`${archivo}:${lineaInicial + indice} → ${linea.trim()}`);
        }
      });
    }
  }

  assert.deepEqual(
    fallos,
    [],
    'Una comilla invertida cierra la plantilla de TypeScript y rompe la ' +
      'migración. En un comentario SQL, escribe el nombre sin comillas:\n' +
      fallos.join('\n'),
  );
});

test('ninguna migración lleva interpolación dentro del SQL', () => {
  const fallos = [];

  for (const archivo of migraciones) {
    const fuente = readFileSync(join(DIRECTORIO, archivo), 'utf8');
    for (const { sql, lineaInicial } of bloquesSql(fuente)) {
      sql.split('\n').forEach((linea, indice) => {
        if (linea.includes('${')) {
          fallos.push(`${archivo}:${lineaInicial + indice} → ${linea.trim()}`);
        }
      });
    }
  }

  assert.deepEqual(
    fallos,
    [],
    'La interpolación en una migración altera el SQL en silencio y abre la ' +
      'puerta a inyección si el valor no es constante:\n' + fallos.join('\n'),
  );
});

test('toda migración exporta up y down', () => {
  for (const archivo of migraciones) {
    const fuente = readFileSync(join(DIRECTORIO, archivo), 'utf8');
    assert.match(fuente, /export const up/u, `${archivo} no exporta up`);
    assert.match(fuente, /export const down/u, `${archivo} no exporta down`);
  }
});
