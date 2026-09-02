'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { join } = require('node:path');
const { readdirSync, readFileSync } = require('node:fs');
const { Pool } = require('pg');
const {
  runWithActorStore,
  setCurrentActor,
} = require('../dist/authentication/actor-context.js');
const {
  ConsoleOperationsService,
} = require('../dist/console-api/console-operations.service.js');

// En el CI esto corre contra un PostgreSQL real con un login IN ROLE fom_app.
// En local, con FOM_WORK_ORDER_RUNTIME_PGLITE apuntando a un directorio que
// tenga @electric-sql/pglite, levanta PostgreSQL 17 en proceso. Sin esa
// salida local la evidencia solo existia en el CI, y una prueba que no se
// puede correr mientras se escribe el codigo se escribe a ciegas.
const pgliteDir = process.env.FOM_WORK_ORDER_RUNTIME_PGLITE;

let admin;
let runtime;
let cerrar = async () => {};

function bloquesDe(ruta) {
  const fuente = readFileSync(ruta, 'utf8');
  const corte = fuente.indexOf('export const down');
  const arriba = corte > 0 ? fuente.slice(0, corte) : fuente;
  const esquema = /pgm\.createSchema\(\s*'([a-z_]+)'/u.exec(arriba);
  return {
    esquema: esquema ? esquema[1] : null,
    bloques: [...arriba.matchAll(/pgm\.sql\(`([\s\S]*?)`\);/g)].map((m) => m[1]),
  };
}

async function prepararConexiones() {
  if (!pgliteDir) {
    const config = {
      host: process.env.FOM_DB_HOST,
      port: Number(process.env.FOM_DB_PORT),
      database: process.env.FOM_DB_NAME,
    };
    admin = new Pool({
      ...config,
      user: process.env.FOM_DB_USER,
      password: process.env.FOM_DB_PASSWORD,
      max: 2,
    });
    runtime = new Pool({
      ...config,
      user: process.env.FOM_45C_RUNTIME_DB_USER,
      password: process.env.FOM_45C_RUNTIME_DB_PASSWORD,
      max: 3,
    });
    cerrar = async () => {
      await runtime.end();
      await admin.end();
    };
    return;
  }
  const { createRequire } = require('node:module');
  const requerir = createRequire(join(pgliteDir, 'package.json'));
  const { PGlite } = requerir('@electric-sql/pglite');
  const db = await PGlite.create();
  await db.exec(`
    CREATE ROLE fom_app; CREATE ROLE fom_readonly;
    CREATE SCHEMA IF NOT EXISTS fom_meta;
    CREATE TABLE fom_meta.pgmigrations (
      id serial PRIMARY KEY, name varchar(255) NOT NULL,
      run_on timestamp NOT NULL);
  `);
  const dir = join(__dirname, '..', 'src/database/migrations/files');
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()) {
    const { esquema, bloques } = bloquesDe(join(dir, archivo));
    if (esquema) await db.exec(`CREATE SCHEMA IF NOT EXISTS ${esquema}`);
    for (const bloque of bloques) await db.exec(bloque);
  }
  admin = { query: (texto, valores = []) => db.query(texto, valores) };
  runtime = {
    query: async (texto, valores = []) => {
      await db.exec('SET ROLE fom_app');
      try {
        return await db.query(texto, valores);
      } finally {
        await db.exec('RESET ROLE');
      }
    },
    async connect() {
      await db.exec('SET ROLE fom_app');
      return {
        query: (texto, valores = []) => db.query(texto, valores),
        release: async () => db.exec('RESET ROLE'),
      };
    },
  };
  cerrar = async () => db.close();
}

const T1 = randomUUID();
const T2 = randomUUID();
const SUPERVISOR = randomUUID();
const DRIVER = randomUUID();
const V1 = randomUUID();
const V2 = randomUUID();
const O1 = randomUUID();
const O2 = randomUUID();
const suffix = randomUUID().slice(0, 8);
const database = {
  query: (...args) => runtime.query(...args),
  getPool: () => runtime,
};
const operations = new ConsoleOperationsService(database);

const as = (actor, body) =>
  runWithActorStore(() => {
    setCurrentActor(actor);
    return body();
  });
async function rejects(promise, status, label) {
  try {
    await promise;
    assert.fail(`${label}: debía rechazarse`);
  } catch (error) {
    assert.equal(error?.getStatus?.(), status, `${label}: ${error.message}`);
  }
}

async function seed() {
  await admin.query(
    `INSERT INTO fom.tenants (id, code, name, kind, status, category)
     VALUES ($1, 'wo-one-' || $3, 'WO One', 'organization', 'active', 'contratista'),
            ($2, 'wo-two-' || $3, 'WO Two', 'organization', 'active', 'contratista')`,
    [T1, T2, suffix],
  );
  await admin.query(
    `INSERT INTO fom.users (id, email, display_name, status, email_verified_at)
     VALUES ($1, 'wo-super-' || $3 || '@runtime.invalid', 'WO Supervisor', 'active', clock_timestamp()),
            ($2, 'wo-driver-' || $3 || '@runtime.invalid', 'WO Driver', 'active', clock_timestamp())`,
    [SUPERVISOR, DRIVER, suffix],
  );
  await admin.query(
    `INSERT INTO fom.tenant_memberships
       (tenant_id, user_id, role, status, activated_at)
     VALUES ($1, $2, 'supervisor', 'active', clock_timestamp()),
            ($1, $3, 'conductor', 'active', clock_timestamp())`,
    [T1, SUPERVISOR, DRIVER],
  );
  await admin.query(
    `INSERT INTO fom.vehicles (id, tenant_id, code)
     VALUES ($1, $2, 'wo-v1-' || $5), ($3, $4, 'wo-v2-' || $5)`,
    [V1, T1, V2, T2, suffix],
  );
  await admin.query(
    `INSERT INTO fom.work_orders
       (id, tenant_id, vehicle_id, created_by_user_id, description)
     VALUES ($1, $2, $3, $4, 'Orden propia de prueba'),
            ($5, $6, $7, NULL, 'Orden ajena de prueba')`,
    [O1, T1, V1, DRIVER, O2, T2, V2],
  );
}

async function main() {
  await prepararConexiones();
  await seed();
  const supervisor = {
    userId: SUPERVISOR,
    tenantId: T1,
    role: 'supervisor',
    platformAdmin: false,
  };
  const driver = { ...supervisor, userId: DRIVER, role: 'conductor' };

  // ---- Levantar la orden desde la consola -------------------------------
  //
  // Es la puerta que le faltaba al supervisor: la app solo deja reportar
  // sobre la unidad asignada, y él no maneja ninguna.

  await rejects(
    as(driver, () =>
      operations.createWorkOrder({
        vehicleId: V1,
        description: 'El conductor no levanta ordenes desde la consola',
      })),
    403,
    'conductor crea desde consola',
  );
  await rejects(
    as(supervisor, () =>
      operations.createWorkOrder({
        vehicleId: V2,
        description: 'Unidad de otra empresa, no debe poder abrirse',
      })),
    404,
    'crear sobre unidad ajena',
  );
  await rejects(
    as(supervisor, () =>
      operations.createWorkOrder({
        vehicleId: randomUUID(),
        description: 'Unidad que no existe en ninguna empresa',
      })),
    404,
    'crear sobre unidad inexistente',
  );

  const abierta = await as(supervisor, () =>
    operations.createWorkOrder({
      vehicleId: V1,
      description: 'Se rompio el parabrisas del lado del conductor',
      failureType: 'carroceria',
      location: 'Patio de Maracaibo',
    }),
  );
  assert.equal(abierta.workOrder.status, 'abierta');
  assert.equal(abierta.workOrder.kind, 'correctiva');
  assert.equal(abierta.workOrder.failureType, 'carroceria');
  assert.equal(abierta.workOrder.vehicleId, V1);
  assert.ok(abierta.workOrder.createdAt);

  // El supervisor tambien programa trabajo que todavia no es una falla.
  const preventiva = await as(supervisor, () =>
    operations.createWorkOrder({
      vehicleId: V1,
      kind: 'preventiva',
      description: 'Cambio de aceite programado por kilometraje',
    }),
  );
  assert.equal(preventiva.workOrder.kind, 'preventiva');
  assert.equal(preventiva.workOrder.failureType, null);

  // La orden nace con autor y SIN `author_via`: quien abre desde la consola
  // no lo hace como conductor principal ni secundario de la unidad.
  const autoria = await admin.query(
    `SELECT created_by_user_id, author_via, tenant_id
       FROM fom.work_orders WHERE id = $1`,
    [abierta.workOrder.id],
  );
  assert.equal(autoria.rows[0].created_by_user_id, SUPERVISOR);
  assert.equal(autoria.rows[0].author_via, null);
  assert.equal(autoria.rows[0].tenant_id, T1);

  // Nace abierta de verdad, no por lo que diga la respuesta: se comprueba
  // contra la base.
  const recienNacida = await admin.query(
    `SELECT status::text AS status FROM fom.work_orders WHERE id = $1`,
    [abierta.workOrder.id],
  );
  assert.equal(recienNacida.rows[0].status, 'abierta');

  // El histórico arranca en la creación, con un evento de nacimiento
  // (sin estado anterior) que NOMBRA a quien la abrió. Ese nombre no es
  // decorativo: es la diferencia entre un histórico y una lista de cambios
  // anónimos.
  const nacimiento = await admin.query(
    `SELECT sequence_number, from_status, to_status::text AS to_status,
            actor_user_id
       FROM fom.work_order_events WHERE work_order_id = $1
       ORDER BY sequence_number`,
    [abierta.workOrder.id],
  );
  assert.equal(nacimiento.rows.length, 1);
  assert.equal(nacimiento.rows[0].sequence_number, 1);
  assert.equal(nacimiento.rows[0].from_status, null);
  assert.equal(nacimiento.rows[0].to_status, 'abierta');
  assert.equal(nacimiento.rows[0].actor_user_id, SUPERVISOR);

  // Y la recien creada se puede mover: creacion y ciclo de vida encajan.
  const movida = await as(supervisor, () =>
    operations.transitionWorkOrder(abierta.workOrder.id, {
      expectedStatus: 'abierta',
      status: 'en_revision',
      note: 'Se pide el vidrio al proveedor',
    }),
  );
  assert.equal(movida.workOrder.status, 'en_revision');
  assert.equal(movida.event.sequence, 2);
  assert.equal(movida.event.fromStatus, 'abierta');

  await rejects(
    as(driver, () =>
      operations.transitionWorkOrder(O1, {
        expectedStatus: 'abierta', status: 'en_revision', note: 'No autorizado',
      })),
    403,
    'conductor cambia estado',
  );
  await rejects(
    as(supervisor, () =>
      operations.transitionWorkOrder(O2, {
        expectedStatus: 'abierta', status: 'en_revision', note: 'Orden ajena',
      })),
    404,
    'orden cross-tenant',
  );

  const review = await as(supervisor, () =>
    operations.transitionWorkOrder(O1, {
      expectedStatus: 'abierta', status: 'en_revision', note: 'Diagnóstico iniciado',
    }),
  );
  assert.equal(review.workOrder.status, 'en_revision');
  assert.equal(review.event.fromStatus, 'abierta');
  assert.equal(review.event.toStatus, 'en_revision');
  assert.equal(review.event.note, 'Diagnóstico iniciado');
  await rejects(
    as(supervisor, () =>
      operations.transitionWorkOrder(O1, {
        expectedStatus: 'abierta', status: 'cerrada', note: 'Cliente obsoleto',
        resolutionNote: 'No debe entrar',
      })),
    409,
    'estado obsoleto',
  );

  const closed = await as(supervisor, () =>
    operations.transitionWorkOrder(O1, {
      expectedStatus: 'en_revision', status: 'cerrada', note: 'Trabajo terminado',
      resolutionNote: 'Se corrigió la conexión eléctrica',
      resolutionCost: 125.5,
      resolutionCurrency: 'USD',
    }),
  );
  assert.equal(closed.workOrder.status, 'cerrada');
  assert.equal(closed.workOrder.resolutionCost, 125.5);
  assert.ok(closed.workOrder.resolvedAt);

  const reopened = await as(supervisor, () =>
    operations.transitionWorkOrder(O1, {
      expectedStatus: 'cerrada', status: 'en_revision', note: 'Falla reapareció',
    }),
  );
  assert.equal(reopened.workOrder.status, 'en_revision');
  assert.equal(reopened.workOrder.resolvedAt, null);
  assert.equal(reopened.workOrder.resolutionCost, 125.5);

  const audit = await admin.query(
    `SELECT sequence_number, actor_user_id, from_status, to_status, note
       FROM fom.work_order_events WHERE tenant_id = $1 AND work_order_id = $2
       ORDER BY sequence_number`,
    [T1, O1],
  );
  assert.equal(audit.rows.length, 4);
  assert.equal(audit.rows[1].actor_user_id, SUPERVISOR);

  // La creacion depende de poder escribir DOS columnas concretas. Si alguien
  // ajusta los permisos, que falle aqui y no en produccion con la orden a
  // medio abrir.
  const columnasDeCreacion = await admin.query(
    `SELECT
       has_column_privilege(
         'fom_app','fom.work_orders','created_by_user_id','INSERT'
       ) AS puede_autor,
       has_column_privilege(
         'fom_app','fom.work_orders','last_status_actor_user_id','INSERT'
       ) AS puede_actor_de_estado`,
  );
  assert.deepEqual(columnasDeCreacion.rows[0], {
    puede_autor: true,
    puede_actor_de_estado: true,
  });

  const privileges = await admin.query(
    `SELECT
       has_table_privilege('fom_app','fom.work_order_events','SELECT') AS table_select,
       has_column_privilege(
         'fom_app','fom.work_order_events','sequence_number','SELECT'
       ) AS can_select_sequence,
       has_column_privilege(
         'fom_app','fom.work_order_events','actor_user_id','SELECT'
       ) AS can_select_actor,
       has_table_privilege('fom_app','fom.work_order_events','INSERT') AS can_insert,
       has_table_privilege('fom_app','fom.work_order_events','UPDATE') AS can_update,
       has_table_privilege('fom_app','fom.work_order_events','DELETE') AS can_delete`,
  );
  assert.deepEqual(privileges.rows[0], {
    table_select: false,
    can_select_sequence: true,
    can_select_actor: true,
    can_insert: false,
    can_update: false,
    can_delete: false,
  });
  console.log('CONSOLE_WORK_ORDER_LIFECYCLE_RUNTIME=PASS');
}

main()
  .catch((error) => {
    console.error('CONSOLE_WORK_ORDER_LIFECYCLE_RUNTIME=FAIL');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrar();
  });
