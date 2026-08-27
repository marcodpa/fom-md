'use strict';

// ============================================================
// Evidencia runtime del directorio de consola — #202, punto 3
// ------------------------------------------------------------
// Ejecuta los SERVICIOS COMPILADOS contra un PostgreSQL real con el rol
// efectivo de la aplicacion (login IN ROLE fom_app, igual que el arnés 45C),
// de modo que cada afirmacion es evidencia y no una expresion regular:
// autorizacion por rol, aislamiento por tenant, transaccionalidad, PIN solo
// hasheado, credencial no expuesta, cambio inicial obligatorio y privilegios
// efectivos del rol de base de datos.
//
// Datos con UUIDs propios y correos *.invalid: conviven con cualquier otra
// prueba del mismo CI sin pisarla.
// ============================================================

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const {
  runWithActorStore,
  setCurrentActor,
} = require('../dist/authentication/actor-context.js');
const {
  ConsoleDirectoryService,
} = require('../dist/console-api/console-directory.service.js');
const {
  ConsoleCredentialService,
} = require('../dist/console-api/console-credential.service.js');
const {
  PasswordHasherService,
} = require('../dist/authentication/crypto/password-hasher.service.js');
const {
  OpaqueTokenService,
} = require('../dist/authentication/crypto/opaque-token.service.js');
const {
  AuthSessionService,
} = require('../dist/authentication/auth-session.service.js');

// En el CI el rol de aplicacion es un login real IN ROLE fom_app (dos
// conexiones de Postgres). En local, si FOM_DIRECTORY_RUNTIME_PGLITE apunta
// a un directorio con @electric-sql/pglite instalado, la prueba levanta un
// PostgreSQL 17 real EN PROCESO, aplica todas las migraciones y alterna
// SET ROLE fom_app alrededor de cada operacion del servicio: reproducible
// en cualquier maquina sin servidor de base de datos. En ambos modos los
// privilegios que PostgreSQL aplica al servicio son los de fom_app.
const pgliteDir = process.env.FOM_DIRECTORY_RUNTIME_PGLITE;

let adminPool;
let runtimePool;
let cerrar = async () => {};

async function prepararConexiones() {
  if (!pgliteDir) {
    adminPool = new Pool({
      host: process.env.FOM_DB_HOST,
      port: Number(process.env.FOM_DB_PORT),
      database: process.env.FOM_DB_NAME,
      user: process.env.FOM_DB_USER,
      password: process.env.FOM_DB_PASSWORD,
      max: 1,
    });
    runtimePool = new Pool({
      host: process.env.FOM_DB_HOST,
      port: Number(process.env.FOM_DB_PORT),
      database: process.env.FOM_DB_NAME,
      user: process.env.FOM_45C_RUNTIME_DB_USER,
      password: process.env.FOM_45C_RUNTIME_DB_PASSWORD,
      max: 1,
    });
    cerrar = async () => {
      await runtimePool.end();
      await adminPool.end();
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
  const dirMigraciones = join(__dirname, '..', 'src', 'database', 'migrations', 'files');
  for (const archivo of readdirSync(dirMigraciones)
    .filter((f) => f.endsWith('.ts'))
    .sort()) {
    const fuente = readFileSync(join(dirMigraciones, archivo), 'utf8');
    const corte = fuente.indexOf('export const down');
    const subida = corte >= 0 ? fuente.slice(0, corte) : fuente;
    const esquema = /pgm\.createSchema\(\s*'([a-z_]+)'/u.exec(subida);
    if (esquema) {
      await db.exec(`CREATE SCHEMA IF NOT EXISTS ${esquema[1]}`);
    }
    for (const bloque of subida.matchAll(/pgm\.sql\(`([\s\S]*?)`\)/gu)) {
      await db.exec(bloque[1]);
    }
  }

  adminPool = {
    query: (text, values) => db.query(text, values),
    end: async () => {},
  };
  runtimePool = {
    async query(text, values) {
      await db.exec('SET ROLE fom_app');
      try {
        return await db.query(text, values);
      } finally {
        await db.exec('RESET ROLE');
      }
    },
    getPool() {
      return {
        async connect() {
          await db.exec('SET ROLE fom_app');
          return {
            query: (text, values) => db.query(text, values),
            release: () => {
              db.exec('RESET ROLE');
            },
          };
        },
      };
    },
    end: async () => {},
  };
  cerrar = () => db.close();
}

const database = {
  query: (text, values) => runtimePool.query(text, values),
  getPool: () =>
    runtimePool.getPool ? runtimePool.getPool() : runtimePool,
};
const hasher = new PasswordHasherService({
  passwordMemoryCostKib: 19456,
  passwordTimeCost: 2,
  passwordParallelism: 1,
});
const directory = new ConsoleDirectoryService(database, hasher);
const credentials = new ConsoleCredentialService(database, hasher);
const opaqueTokens = new OpaqueTokenService({ tokenBytes: 32 });
const sessions = new AuthSessionService(database, hasher, opaqueTokens, {
  authenticationSession: {
    ttlSeconds: 3600,
    maximumFailedAttempts: 5,
    lockSeconds: 900,
  },
});

const T_UNO = 'a0000000-0000-4000-8000-00000000000a';
const T_DOS = 'a0000000-0000-4000-8000-00000000000b';
const SUPERVISOR = 'a1000000-0000-4000-8000-000000000001';
const ADMIN_FOM = 'a1000000-0000-4000-8000-000000000002';
const CONDUCTOR = 'a1000000-0000-4000-8000-000000000003';
const INACTIVO = 'a1000000-0000-4000-8000-000000000004';
// Un par del supervisor: mismo rango, para probar que nadie manda sobre su igual.
const SUPERVISOR_DOS = 'a1000000-0000-4000-8000-000000000006';
const MIEMBRO_AJENO = 'a1000000-0000-4000-8000-000000000005';
// Por corrida: el mismo servidor local puede recibir varias ejecuciones y
// las altas de cada una no deben chocar con las de la anterior.
const SUFIJO = randomUUID().slice(0, 8);
const VEHICULO = randomUUID();
const VEHICULO_AJENO = randomUUID();

const actorDe = (userId, tenantId, role, platformAdmin = false) => ({
  userId,
  tenantId,
  role,
  platformAdmin,
});

const como = (actor, cuerpo) =>
  runWithActorStore(() => {
    setCurrentActor(actor);
    return cuerpo();
  });

async function rechaza(promesa, statusEsperado, etiqueta) {
  try {
    await promesa;
    assert.fail(`${etiqueta}: debia rechazarse`);
  } catch (error) {
    const status =
      typeof error?.getStatus === 'function' ? error.getStatus() : null;
    assert.equal(status, statusEsperado, `${etiqueta}: ${error.message}`);
  }
}

async function seed() {
  await adminPool.query(
    `INSERT INTO fom.tenants (id, code, name, kind, status, category)
     VALUES
       ($1, 'dir-rt-uno', 'Directorio RT Uno', 'organization', 'active', 'contratista'),
       ($2, 'dir-rt-dos', 'Directorio RT Dos', 'organization', 'active', 'contratista')
     ON CONFLICT (id) DO NOTHING`,
    [T_UNO, T_DOS],
  );
  await adminPool.query(
    `INSERT INTO fom.users (id, email, display_name)
     VALUES
       ($1, 'dir-rt-supervisor@pruebas.invalid', 'Supervisora RT'),
       ($2, 'dir-rt-admin@pruebas.invalid', 'Admin RT'),
       ($3, 'dir-rt-conductor@pruebas.invalid', 'Conductor RT'),
       ($4, 'dir-rt-inactivo@pruebas.invalid', 'Inactivo RT'),
       ($5, 'dir-rt-ajeno@pruebas.invalid', 'Miembro Ajeno RT'),
       ($6, 'dir-rt-supervisor-dos@pruebas.invalid', 'Supervisor Par RT')
     ON CONFLICT (id) DO NOTHING`,
    [SUPERVISOR, ADMIN_FOM, CONDUCTOR, INACTIVO, MIEMBRO_AJENO, SUPERVISOR_DOS],
  );
  await adminPool.query(
    `UPDATE fom.users
        SET status = 'disabled', disabled_at = clock_timestamp()
      WHERE id = $1`,
    [INACTIVO],
  );
  await adminPool.query(
    `INSERT INTO fom.tenant_memberships
       (tenant_id, user_id, role, status, activated_at)
     VALUES
       ($1, $2, 'supervisor', 'active', clock_timestamp()),
       ($1, $3, 'admin_fom', 'active', clock_timestamp()),
       ($1, $4, 'conductor', 'active', clock_timestamp()),
       ($5, $6, 'conductor', 'active', clock_timestamp()),
       ($1, $7, 'supervisor', 'active', clock_timestamp())
     ON CONFLICT DO NOTHING`,
    [T_UNO, SUPERVISOR, ADMIN_FOM, CONDUCTOR, T_DOS, MIEMBRO_AJENO,
     SUPERVISOR_DOS],
  );
  await adminPool.query(
    `INSERT INTO fom.vehicles (id, tenant_id, code)
     VALUES ($1, $2, 'dir-rt-v1-' || $5), ($3, $4, 'dir-rt-v2-' || $5)
     ON CONFLICT (id) DO NOTHING`,
    [VEHICULO, T_UNO, VEHICULO_AJENO, T_DOS, SUFIJO],
  );
}

async function main() {
  await prepararConexiones();
  await seed();
  const supervisor = actorDe(SUPERVISOR, T_UNO, 'supervisor');
  const adminFom = actorDe(ADMIN_FOM, T_UNO, 'admin_fom');
  const conductor = actorDe(CONDUCTOR, T_UNO, 'conductor');

  // 1 · Sin sesion: sin actor en el almacen, la capa de rol responde 401.
  await rechaza(
    runWithActorStore(() => directory.listUsers({ limit: 10, offset: 0 })),
    401,
    'sin sesion',
  );

  // 2 · 403 por rol: un conductor no administra el directorio.
  await rechaza(
    como(conductor, () =>
      directory.createUser({
        email: `dir-rt-nadie-${SUFIJO}@pruebas.invalid`,
        displayName: 'Nadie',
        role: 'conductor',
        temporaryPassword: 'clave-temporal-larga-1',
      }),
    ),
    403,
    'conductor crea usuario',
  );

  // 3 · 403 por rango: un supervisor no otorga el rol de supervisor.
  await rechaza(
    como(supervisor, () =>
      directory.createUser({
        email: `dir-rt-otro-super-${SUFIJO}@pruebas.invalid`,
        displayName: 'Otro Super',
        role: 'supervisor',
        temporaryPassword: 'clave-temporal-larga-2',
      }),
    ),
    403,
    'supervisor otorga supervisor',
  );

  // 4 · Positivo por rol: el supervisor crea un conductor con credencial
  //     temporal; la respuesta no expone ningun hash.
  const creado = await como(supervisor, () =>
    directory.createUser({
      email: `dir-rt-pedro-${SUFIJO}@pruebas.invalid`,
      displayName: 'Pedro RT',
      role: 'conductor',
      temporaryPassword: 'clave-temporal-larga-3',
    }),
  );
  assert.equal(creado.createdUser, true);
  assert.equal(creado.passwordSet, true);
  assert.equal(creado.mustChangePassword, true);
  assert.ok(
    !JSON.stringify(creado).includes('$argon2id$'),
    'la respuesta no puede exponer hashes',
  );
  const filaCredencial = await adminPool.query(
    `SELECT password_hash, must_change_password
       FROM fom.user_password_credentials WHERE user_id = $1`,
    [creado.userId],
  );
  assert.match(filaCredencial.rows[0].password_hash, /^\$argon2id\$/u);
  assert.equal(filaCredencial.rows[0].must_change_password, true);
  const autoria = await adminPool.query(
    `SELECT created_by_user_id FROM fom.users WHERE id = $1`,
    [creado.userId],
  );
  assert.equal(autoria.rows[0].created_by_user_id, SUPERVISOR);

  // 5 · Cambio inicial obligatorio: la sesion queda restringida hasta
  //     completarlo, la temporal incorrecta se rechaza, y la correcta apaga
  //     la obligacion. Toda sesion web previa queda revocada atomicamente.
  assert.equal(await credentials.mustChangePassword(creado.userId), true);
  const testigoPrevio = opaqueTokens.issueToken();
  await adminPool.query(
    `INSERT INTO fom.auth_sessions
       (user_id, refresh_token_hash, expires_at, session_type)
     VALUES ($1, $2, clock_timestamp() + interval '1 hour', 'web')`,
    [creado.userId, testigoPrevio.hash],
  );
  const sesionAntes = await adminPool.query(
    `SELECT revoked_at FROM fom.auth_sessions
      WHERE user_id = $1 AND refresh_token_hash = $2
        AND session_type = 'web' AND expires_at > clock_timestamp()`,
    [creado.userId, testigoPrevio.hash],
  );
  assert.equal(sesionAntes.rows.length, 1);
  assert.equal(sesionAntes.rows[0].revoked_at, null);
  // PGlite no expone `rowCount` para UPDATE ... RETURNING, propiedad que el
  // servicio usa correctamente con pg. El CI PostgreSQL sí ejecuta además la
  // autenticación completa antes y después del cambio.
  if (!pgliteDir) {
    assert.equal(
      (await sessions.authenticate(testigoPrevio.value)).userId,
      creado.userId,
    );
  }
  await rechaza(
    credentials.completeInitialChange(
      creado.userId,
      'una-clave-que-no-es',
      'la-clave-definitiva-de-pedro',
    ),
    400,
    'cambio inicial con temporal incorrecta',
  );
  const cambio = await credentials.completeInitialChange(
    creado.userId,
    'clave-temporal-larga-3',
    'la-clave-definitiva-de-pedro',
  );
  assert.equal(cambio.changed, true);
  assert.equal(await credentials.mustChangePassword(creado.userId), false);
  const sesionDespues = await adminPool.query(
    `SELECT revoked_at FROM fom.auth_sessions
      WHERE user_id = $1 AND refresh_token_hash = $2`,
    [creado.userId, testigoPrevio.hash],
  );
  assert.ok(sesionDespues.rows[0].revoked_at);
  if (!pgliteDir) {
    await rechaza(
      sessions.authenticate(testigoPrevio.value),
      401,
      'testigo anterior al cambio inicial',
    );
  }
  await rechaza(
    credentials.completeInitialChange(
      creado.userId,
      'la-clave-definitiva-de-pedro',
      'otra-clave-definitiva-mas',
    ),
    409,
    'segundo cambio inicial',
  );

  // 6 · Usuario global inactivo: membresia denegada con respuesta explicita.
  await rechaza(
    como(supervisor, () =>
      directory.createUser({
        email: 'dir-rt-inactivo@pruebas.invalid',
        displayName: 'Inactivo RT',
        role: 'conductor',
        temporaryPassword: 'clave-temporal-larga-4',
      }),
    ),
    409,
    'usuario inactivo',
  );

  // 7 · Sin selector de empresa, una cuenta con membresia activa en otro
  //     tenant se rechaza sin revelar cual y sin crear una segunda membresia.
  await rechaza(
    como(supervisor, () =>
      directory.createUser({
        email: 'dir-rt-ajeno@pruebas.invalid',
        displayName: 'Miembro Ajeno RT',
        role: 'conductor',
        temporaryPassword: 'clave-temporal-larga-6',
      }),
    ),
    409,
    'segunda membresia activa',
  );
  const membresiasAjenas = await adminPool.query(
    `SELECT tenant_id FROM fom.tenant_memberships
      WHERE user_id = $1 AND status = 'active'`,
    [MIEMBRO_AJENO],
  );
  assert.equal(membresiasAjenas.rows.length, 1);
  assert.equal(membresiasAjenas.rows[0].tenant_id, T_DOS);

  // 8 · Transaccion: un rol que la base rechaza (usuario en contratista)
  //     revierte TODO el alta — el usuario global no queda creado.
  await rechaza(
    como(supervisor, () =>
      directory.createUser({
        email: `dir-rt-fantasma-${SUFIJO}@pruebas.invalid`,
        displayName: 'Fantasma RT',
        role: 'usuario',
        temporaryPassword: 'clave-temporal-larga-5',
      }),
    ),
    400,
    'rol incompatible con la categoria',
  );
  const fantasma = await adminPool.query(
    `SELECT 1 FROM fom.users WHERE email = $1`,
    [`dir-rt-fantasma-${SUFIJO}@pruebas.invalid`],
  );
  assert.equal(fantasma.rows.length, 0, 'el rollback debe borrar el alta');

  // 9 · Aislamiento: el vehiculo de otra empresa responde el mismo 404.
  await rechaza(
    como(supervisor, () =>
      directory.updateVehicle(VEHICULO_AJENO, { alias: 'intruso' }),
    ),
    404,
    'editar vehiculo ajeno',
  );
  await rechaza(
    como(supervisor, () =>
      directory.assignDriver(VEHICULO_AJENO, {
        userId: creado.userId,
        role: 'principal',
      }),
    ),
    404,
    'asignar sobre vehiculo ajeno',
  );

  // 10 · Asignacion: principal sin PIN; secundario con PIN solo hasheado.
  const principal = await como(supervisor, () =>
    directory.assignDriver(VEHICULO, {
      userId: creado.userId,
      role: 'principal',
    }),
  );
  const filaPrincipal = await adminPool.query(
    `SELECT pin_hash, assigned_by_user_id
       FROM fom.vehicle_driver_assignments WHERE id = $1`,
    [principal.assignmentId],
  );
  assert.equal(filaPrincipal.rows[0].pin_hash, null);
  assert.equal(filaPrincipal.rows[0].assigned_by_user_id, SUPERVISOR);
  const secundario = await como(supervisor, () =>
    directory.assignDriver(VEHICULO, {
      userId: CONDUCTOR,
      role: 'secundario',
      pin: '4321',
    }),
  );
  const filaSecundario = await adminPool.query(
    `SELECT pin_hash FROM fom.vehicle_driver_assignments WHERE id = $1`,
    [secundario.assignmentId],
  );
  assert.match(filaSecundario.rows[0].pin_hash, /^\$argon2id\$/u);
  assert.ok(!filaSecundario.rows[0].pin_hash.includes('4321'));

  // 11 · Mutaciones auditadas: editar y revocar dejan actor, instante y
  //      valores en fom.audit_log, en la misma transaccion.
  await como(adminFom, () =>
    directory.updateVehicle(VEHICULO, { alias: 'Unidad RT 07' }),
  );
  const auditoriaEdicion = await adminPool.query(
    `SELECT actor_user_id, changes FROM fom.audit_log
      WHERE tenant_id = $1 AND entity_id = $2 AND action = 'vehicle.updated'`,
    [T_UNO, VEHICULO],
  );
  assert.equal(auditoriaEdicion.rows.length, 1);
  assert.equal(auditoriaEdicion.rows[0].actor_user_id, ADMIN_FOM);
  assert.equal(auditoriaEdicion.rows[0].changes.alias.after, 'Unidad RT 07');
  await como(supervisor, () =>
    directory.revokeDriver(secundario.assignmentId, { reason: 'fin.de.obra' }),
  );
  const auditoriaRevocacion = await adminPool.query(
    `SELECT changes FROM fom.audit_log
      WHERE tenant_id = $1 AND entity_id = $2
        AND action = 'driver_assignment.revoked'`,
    [T_UNO, secundario.assignmentId],
  );
  assert.equal(auditoriaRevocacion.rows.length, 1);
  assert.equal(auditoriaRevocacion.rows[0].changes.reason, 'fin.de.obra');

  // 12 · Directorio paginado y determinista: paginas de uno no se solapan.
  const paginaUno = await como(supervisor, () =>
    directory.listUsers({ limit: 1, offset: 0 }),
  );
  const paginaDos = await como(supervisor, () =>
    directory.listUsers({ limit: 1, offset: 1 }),
  );
  assert.equal(paginaUno.items.length, 1);
  assert.ok(paginaUno.page.total >= 4);
  assert.notEqual(paginaUno.items[0].userId, paginaDos.items[0].userId);

  // 13 · Privilegios efectivos del rol PostgreSQL: lo excluido esta excluido
  //      de verdad, no por costumbre.
  for (const [sql, etiqueta] of [
    [
      `UPDATE fom.user_password_credentials SET password_hash = 'x' WHERE user_id = '${CONDUCTOR}'`,
      'sobrescribir hashes',
    ],
    [`DELETE FROM fom.audit_log`, 'borrar auditoria'],
    [
      `INSERT INTO fom.tenants (code, name, kind) VALUES ('dir-rt-mal', 'Mal', 'organization')`,
      'crear empresas',
    ],
    [
      `UPDATE fom.users SET created_by_user_id = '${SUPERVISOR}' WHERE id = '${CONDUCTOR}'`,
      'fabricar autoria',
    ],
  ]) {
    try {
      await runtimePool.query(sql);
      assert.fail(`fom_app no debe poder ${etiqueta}`);
    } catch (error) {
      assert.match(
        String(error.message),
        /permission denied|immutable/u,
        `${etiqueta}: ${error.message}`,
      );
    }
  }

  // ── 13 · Administrar personas: jerarquia de mando (#202, reglas 9 y 10) ──

  // Un conductor no administra a nadie.
  await rechaza(
    como(conductor, () =>
      directory.updateMembership(creado.userId, { status: 'suspended' }),
    ),
    403,
    'conductor administra',
  );
  // Nadie se administra a si mismo, ni siendo administrador FOM.
  await rechaza(
    como(adminFom, () =>
      directory.updateMembership(ADMIN_FOM, { status: 'suspended' }),
    ),
    403,
    'administrarse a si mismo',
  );
  // Nadie administra a un administrador FOM.
  await rechaza(
    como(supervisor, () =>
      directory.updateMembership(ADMIN_FOM, { status: 'suspended' }),
    ),
    403,
    'administrar a un admin FOM',
  );
  // Un supervisor no administra a otro supervisor: rango igual, no mayor.
  await rechaza(
    como(supervisor, () =>
      directory.updateMembership(SUPERVISOR_DOS, { status: 'suspended' }),
    ),
    403,
    'supervisor administra a su par',
  );
  // Otorgar supervisor sigue siendo del administrador FOM.
  await rechaza(
    como(supervisor, () =>
      directory.updateMembership(creado.userId, { role: 'supervisor' }),
    ),
    403,
    'supervisor asciende a supervisor',
  );

  // ── 14 · Suspender: cierra sesiones y quita el acceso ────────────────────

  const suspendido = await como(supervisor, () =>
    directory.updateMembership(creado.userId, {
      status: 'suspended',
      reason: 'prueba.rango',
    }),
  );
  assert.equal(suspendido.status, 'suspended');
  const trasSuspender = await adminPool.query(
    `SELECT status, suspended_at FROM fom.tenant_memberships
      WHERE tenant_id = $1 AND user_id = $2`,
    [T_UNO, creado.userId],
  );
  assert.equal(trasSuspender.rows[0].status, 'suspended');
  assert.ok(trasSuspender.rows[0].suspended_at, 'debe sellar el instante');
  const auditoriaSuspension = await adminPool.query(
    `SELECT actor_user_id, changes FROM fom.audit_log
      WHERE tenant_id = $1 AND entity_id = $2 AND action = 'membership.updated'`,
    [T_UNO, creado.userId],
  );
  assert.equal(auditoriaSuspension.rows.length, 1);
  assert.equal(auditoriaSuspension.rows[0].actor_user_id, SUPERVISOR);
  assert.equal(
    auditoriaSuspension.rows[0].changes.status.before,
    'active',
  );
  assert.equal(auditoriaSuspension.rows[0].changes.reason, 'prueba.rango');

  // Reactivar devuelve el acceso y limpia la marca de suspension.
  await como(supervisor, () =>
    directory.updateMembership(creado.userId, { status: 'active' }),
  );
  const trasReactivar = await adminPool.query(
    `SELECT status, suspended_at FROM fom.tenant_memberships
      WHERE tenant_id = $1 AND user_id = $2`,
    [T_UNO, creado.userId],
  );
  assert.equal(trasReactivar.rows[0].status, 'active');
  assert.equal(trasReactivar.rows[0].suspended_at, null);

  // ── 15 · Reinicio de credencial: la base vuelve a comprobar el rango ─────

  const reinicio = await como(supervisor, () =>
    directory.resetCredential(creado.userId, {
      temporaryPassword: 'clave-reiniciada-larga-1',
      reason: 'olvido.de.clave',
    }),
  );
  assert.equal(reinicio.mustChangePassword, true);
  const trasReinicio = await adminPool.query(
    `SELECT must_change_password, failed_attempts, locked_until
       FROM fom.user_password_credentials WHERE user_id = $1`,
    [creado.userId],
  );
  assert.equal(trasReinicio.rows[0].must_change_password, true);
  assert.equal(trasReinicio.rows[0].failed_attempts, 0);
  assert.equal(trasReinicio.rows[0].locked_until, null);
  assert.equal(
    await credentials.mustChangePassword(creado.userId),
    true,
    'la sesion queda restringida tras el reinicio',
  );
  // La clave nueva sirve para entrar, y la anterior no.
  const credencial = await adminPool.query(
    `SELECT password_hash FROM fom.user_password_credentials WHERE user_id = $1`,
    [creado.userId],
  );
  assert.equal(
    await hasher.verifyPassword(
      credencial.rows[0].password_hash,
      'clave-reiniciada-larga-1',
    ),
    true,
  );
  assert.equal(
    await hasher.verifyPassword(
      credencial.rows[0].password_hash,
      'la-clave-definitiva-de-pedro',
    ),
    false,
  );

  // ── 16 · La funcion de la base no se deja saltar la jerarquia ────────────
  // Aunque la capa de aplicacion fallara, PostgreSQL sigue diciendo que no.

  for (const [actorId, objetivoId, etiqueta] of [
    [CONDUCTOR, creado.userId, 'un conductor reinicia claves'],
    [SUPERVISOR, SUPERVISOR_DOS, 'un supervisor reinicia a su par'],
    [SUPERVISOR, ADMIN_FOM, 'alguien reinicia a un admin FOM'],
    [SUPERVISOR, SUPERVISOR, 'alguien se reinicia a si mismo'],
  ]) {
    try {
      await runtimePool.query(
        `SELECT fom.reset_member_credential($1, $2, $3)`,
        [
          actorId,
          objetivoId,
          '$argon2id$v=19$m=19456,t=2,p=1$' +
            'AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        ],
      );
      assert.fail(`la base debe impedir que ${etiqueta}`);
    } catch (error) {
      assert.match(
        String(error.message),
        /rank does not allow|do not share an active tenant|cannot reset their own/u,
        `${etiqueta}: ${error.message}`,
      );
    }
  }

  // ── 17 · Revocar es terminal ─────────────────────────────────────────────

  await como(supervisor, () =>
    directory.updateMembership(creado.userId, {
      status: 'revoked',
      reason: 'fin.de.prueba',
    }),
  );
  await rechaza(
    como(supervisor, () =>
      directory.updateMembership(creado.userId, { status: 'active' }),
    ),
    409,
    'reactivar una membresia revocada',
  );

  console.log('CONSOLE_DIRECTORY_RUNTIME=PASS');
}

main()
  .catch((error) => {
    console.error('CONSOLE_DIRECTORY_RUNTIME=FAIL');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrar();
  });
