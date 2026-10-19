'use strict';

// Lectura independiente del recibo del migrador. No ejecuta SQL de escritura.
const { Client } = require('pg');
const expected = [
  '20261005180000000_align_transfer_platform_admin_scope',
  '20261006180000000_enable_platform_notification_receipts',
  '20261006190000000_classify_inspections_and_record_attempts',
  '20261006210000000_add_driver_behavior_events',
  '20261010210000000_enable_managed_user_credentials',
];

async function main() {
  const phase = process.argv[2];
  if (process.argv.length !== 3 || !['before', 'after'].includes(phase)) throw new Error('fase inválida');
  if (process.env.FOM_DB_NAME !== 'fom_core' || process.env.FOM_DB_USER !== 'fom_migrator' || !process.env.FOM_DB_PASSWORD || process.env.DATABASE_URL) throw new Error('identidad del migrador inválida');
  const client = new Client({
    host: process.env.FOM_DB_HOST,
    port: Number(process.env.FOM_DB_PORT || 5432),
    database: process.env.FOM_DB_NAME,
    user: process.env.FOM_DB_USER,
    password: process.env.FOM_DB_PASSWORD,
    // Mismo enlace TLS privado que el testigo de producción issue-545 existente.
    ssl: { rejectUnauthorized: false },
    application_name: 'fom-issue643-readonly-witness',
  });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const { rows: identities } = await client.query('SELECT current_database() AS db, current_user AS role');
    if (identities[0]?.db !== 'fom_core' || identities[0]?.role !== 'fom_migrator') throw new Error('base o rol incorrectos');
    const { rows } = await client.query('SELECT name FROM fom_meta.pgmigrations ORDER BY name');
    const names = rows.map(r => r.name);
    const actual = names.filter(n => expected.includes(n));
    const wanted = phase === 'before' ? [] : expected;
    const count = phase === 'before' ? 80 : 85;
    if (names.length !== count || new Set(names).size !== count || JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`inventario inesperado: total=${names.length}, nuevas=${actual.length}`);
    await client.query('COMMIT');
    console.log(`FOM_ISSUE643_DB_WITNESS=PASS phase=${phase} total=${count} new=${actual.length}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}
main().catch(() => {
  // No imprime parámetros de conexión ni mensajes que puedan contener secretos.
  console.error('FOM_ISSUE643_DB_WITNESS=FAIL: revisar identidad e inventario antes de continuar.');
  process.exitCode = 1;
});
