'use strict';

// ============================================================
// Evidencia runtime de las escrituras de cumplimiento
// ------------------------------------------------------------
// Ejecuta los servicios COMPILADOS contra un PostgreSQL real con el rol
// efectivo de la aplicación: avisos, documentos, reglas de alerta y equipos
// GPS. Lo que se comprueba no es que el código llame a la base, sino que la
// base ACEPTE lo que el código le manda — que es donde han aparecido los
// defectos reales de este proyecto.
//
// En el CI el rol de aplicación es un login real IN ROLE fom_app. En local,
// con FOM_COMPLIANCE_RUNTIME_PGLITE apuntando a un directorio con
// @electric-sql/pglite instalado, levanta PostgreSQL 17 en proceso.
// ============================================================

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
const {
  ConsoleDirectoryService,
} = require('../dist/console-api/console-directory.service.js');

const pgliteDir = process.env.FOM_COMPLIANCE_RUNTIME_PGLITE;

let adminPool;
let runtimePool;
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
    adminPool = new Pool({
      ...config,
      user: process.env.FOM_DB_USER,
      password: process.env.FOM_DB_PASSWORD,
      max: 2,
    });
    runtimePool = new Pool({
      ...config,
      user: process.env.FOM_45C_RUNTIME_DB_USER,
      password: process.env.FOM_45C_RUNTIME_DB_PASSWORD,
      max: 3,
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
  const dir = join(__dirname, '..', 'src/database/migrations/files');
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()) {
    const { esquema, bloques } = bloquesDe(join(dir, archivo));
    if (esquema) await db.exec(`CREATE SCHEMA IF NOT EXISTS ${esquema}`);
    for (const bloque of bloques) await db.exec(bloque);
  }
  adminPool = { query: (texto, valores = []) => db.query(texto, valores) };
  runtimePool = {
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

const SUFIJO = randomUUID().slice(0, 8);
const T_PROPIO = randomUUID();
const T_AJENO = randomUUID();
const ADMIN = randomUUID();
const SUPERVISOR = randomUUID();
const CONDUCTOR = randomUUID();
const V_PROPIO = randomUUID();
const V_AJENO = randomUUID();

const actorDe = (userId, role) => ({
  userId,
  tenantId: T_PROPIO,
  role,
  platformAdmin: false,
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

async function sembrar() {
  await adminPool.query(
    `INSERT INTO fom.tenants (id, code, name, kind, status, category)
     VALUES ($1, 'cw-propio-' || $3, 'CW Propio', 'organization', 'active', 'contratista'),
            ($2, 'cw-ajeno-' || $3, 'CW Ajeno', 'organization', 'active', 'contratista')`,
    [T_PROPIO, T_AJENO, SUFIJO],
  );
  await adminPool.query(
    `INSERT INTO fom.users (id, email, display_name, status, email_verified_at)
     VALUES ($1, 'cw-admin-' || $4 || '@runtime.invalid', 'CW Admin', 'active', clock_timestamp()),
            ($2, 'cw-super-' || $4 || '@runtime.invalid', 'CW Super', 'active', clock_timestamp()),
            ($3, 'cw-driver-' || $4 || '@runtime.invalid', 'CW Driver', 'active', clock_timestamp())`,
    [ADMIN, SUPERVISOR, CONDUCTOR, SUFIJO],
  );
  await adminPool.query(
    `INSERT INTO fom.tenant_memberships
       (tenant_id, user_id, role, status, activated_at)
     VALUES ($1, $2, 'admin_fom', 'active', clock_timestamp()),
            ($1, $3, 'supervisor', 'active', clock_timestamp()),
            ($1, $4, 'conductor', 'active', clock_timestamp())`,
    [T_PROPIO, ADMIN, SUPERVISOR, CONDUCTOR],
  );
  await adminPool.query(
    `INSERT INTO fom.vehicles (id, tenant_id, code)
     VALUES ($1, $2, 'cw-v1-' || $5), ($3, $4, 'cw-v2-' || $5)`,
    [V_PROPIO, T_PROPIO, V_AJENO, T_AJENO, SUFIJO],
  );
}

async function main() {
  await prepararConexiones();
  await sembrar();

  const base = {
    query: (...args) => runtimePool.query(...args),
    getPool: () => runtimePool,
  };
  const operaciones = new ConsoleOperationsService(base);
  // El directorio pide un hasheador, pero nada de lo que se prueba aquí lo
  // usa: las claves tienen su propia evidencia en console-directory-runtime.
  const directorio = new ConsoleDirectoryService(base, {
    hash: async () => 'no-usado',
  });

  const admin = actorDe(ADMIN, 'admin_fom');
  const supervisor = actorDe(SUPERVISOR, 'supervisor');
  const conductor = actorDe(CONDUCTOR, 'conductor');

  // ---- AVISOS -----------------------------------------------------------

  const avisoPropio = randomUUID();
  const avisoAjeno = randomUUID();
  await adminPool.query(
    `INSERT INTO fom.notifications (id, tenant_id, title)
     VALUES ($1, $2, 'Aviso propio'), ($3, $4, 'Aviso ajeno')`,
    [avisoPropio, T_PROPIO, avisoAjeno, T_AJENO],
  );

  await rechaza(
    como(conductor, () => operaciones.markNotificationRead(avisoPropio)),
    403,
    'conductor marca avisos',
  );
  await rechaza(
    como(supervisor, () => operaciones.markNotificationRead(avisoAjeno)),
    404,
    'aviso de otra empresa',
  );

  const marcado = await como(supervisor, () =>
    operaciones.markNotificationRead(avisoPropio),
  );
  assert.ok(marcado.notification.readAt, 'el aviso debe quedar con fecha');

  // Marcar dos veces conserva la PRIMERA fecha: es la hora en que de verdad
  // se atendió, y reescribirla borraría el único dato útil.
  const primeraFecha = marcado.notification.readAt;
  const remarcado = await como(supervisor, () =>
    operaciones.markNotificationRead(avisoPropio),
  );
  assert.deepEqual(remarcado.notification.readAt, primeraFecha);

  const otroAviso = randomUUID();
  await adminPool.query(
    `INSERT INTO fom.notifications (id, tenant_id, title)
     VALUES ($1, $2, 'Segundo aviso')`,
    [otroAviso, T_PROPIO],
  );
  const todos = await como(supervisor, () =>
    operaciones.markAllNotificationsRead(),
  );
  assert.equal(todos.markedCount, 1, 'solo queda uno sin leer');

  // Marcar todos NO alcanza a la otra empresa.
  const ajenoSigue = await adminPool.query(
    `SELECT read_at FROM fom.notifications WHERE id = $1`,
    [avisoAjeno],
  );
  assert.equal(ajenoSigue.rows[0].read_at, null);

  // Marcar un aviso lo OCULTA A TODA LA EMPRESA, asi que tiene que quedar
  // dicho quien lo hizo. Y en la misma transaccion: si el aviso se oculta y
  // el registro no llega, se pierde justo el caso en el que hacia falta.
  const auditoriaAvisos = await adminPool.query(
    `SELECT action, actor_user_id, changes
       FROM fom.audit_log
      WHERE tenant_id = $1 AND entity_type = 'notification'
      ORDER BY occurred_at`,
    [T_PROPIO],
  );
  const accionesAviso = auditoriaAvisos.rows.map((r) => r.action);
  assert.ok(accionesAviso.includes('notification.read'));
  assert.ok(accionesAviso.includes('notification.read_all'));
  for (const fila of auditoriaAvisos.rows) {
    assert.equal(fila.actor_user_id, SUPERVISOR, fila.action + ' sin actor');
  }
  // El lote se audita como UNA accion que dice a que alcanzo, no como cien
  // entradas iguales que se esconden entre si.
  const lote = auditoriaAvisos.rows.find((r) => r.action === 'notification.read_all');
  assert.equal(lote.changes.markedCount, 1);
  assert.deepEqual(lote.changes.notificationIds, [otroAviso]);
  // Marcar dos veces el mismo aviso no multiplica la historia sin necesidad:
  // hubo dos decisiones, hay dos entradas, y ninguna se perdio.
  assert.equal(
    accionesAviso.filter((a) => a === 'notification.read').length,
    2,
    'cada marcado deja su rastro',
  );

  // ---- DOCUMENTOS -------------------------------------------------------

  await rechaza(
    como(conductor, () =>
      operaciones.createDocument({
        scope: 'vehiculo',
        vehicleId: V_PROPIO,
        documentType: 'rcv',
        expiresOn: '2027-01-31',
      })),
    403,
    'conductor crea documentos',
  );
  await rechaza(
    como(supervisor, () =>
      operaciones.createDocument({
        scope: 'vehiculo',
        vehicleId: V_AJENO,
        documentType: 'rcv',
        expiresOn: '2027-01-31',
      })),
    404,
    'documento sobre unidad ajena',
  );
  // El ámbito y el titular tienen que ser coherentes en las DOS direcciones.
  await rechaza(
    como(supervisor, () =>
      operaciones.createDocument({
        scope: 'vehiculo',
        vehicleId: V_PROPIO,
        holderUserId: CONDUCTOR,
        documentType: 'rcv',
        expiresOn: '2027-01-31',
      })),
    400,
    'documento de vehiculo con titular persona',
  );
  await rechaza(
    como(supervisor, () =>
      operaciones.createDocument({
        scope: 'persona',
        documentType: 'licencia_conducir',
        expiresOn: '2027-01-31',
      })),
    400,
    'documento de persona sin titular',
  );

  const doc = await como(supervisor, () =>
    operaciones.createDocument({
      scope: 'vehiculo',
      vehicleId: V_PROPIO,
      documentType: 'rcv',
      documentNumber: 'RCV-991',
      issuedOn: '2026-02-01',
      expiresOn: '2027-01-31',
      notes: 'Poliza anual',
    }),
  );
  assert.equal(doc.document.status, 'active');
  assert.equal(doc.document.documentType, 'rcv');

  const docPersona = await como(supervisor, () =>
    operaciones.createDocument({
      scope: 'persona',
      holderUserId: CONDUCTOR,
      documentType: 'licencia_conducir',
      expiresOn: '2028-06-30',
    }),
  );
  assert.equal(docPersona.document.holderUserId, CONDUCTOR);
  assert.equal(docPersona.document.vehicleId, null);

  // Una fecha de CALENDARIO viaja como texto, nunca como instante.
  //
  // No es cosmético: el controlador de documentos dice que existe para evitar
  // «un documento vencido que aparece vigente por un huso horario», y el
  // conversor por defecto convierte una columna `date` en un Date a medianoche
  // local. Un vencimiento del 31 se lee como 30 en cuanto el que mira está en
  // otro huso — exactamente el fallo que el módulo dice prevenir.
  assert.equal(typeof doc.document.expiresOn, 'string');
  assert.equal(doc.document.expiresOn, '2027-01-31');
  assert.equal(doc.document.issuedOn, '2026-02-01');

  // Mover el vencimiento, que es la corrección más frecuente del módulo.
  const movido = await como(supervisor, () =>
    operaciones.updateDocument(doc.document.id, { expiresOn: '2028-01-31' }),
  );
  assert.equal(typeof movido.document.expiresOn, 'string');
  assert.equal(movido.document.expiresOn, '2028-01-31');

  // Y la LECTURA —que ya estaba en producción— tampoco puede corromperla.
  const listado = await como(supervisor, () =>
    operaciones.listDocuments({ limit: 50, offset: 0 }),
  );
  const enLista = listado.items.find((d) => d.id === doc.document.id);
  assert.ok(enLista, 'el documento debe aparecer en el listado');
  assert.equal(typeof enLista.expiresOn, 'string');
  assert.equal(enLista.expiresOn, '2028-01-31');

  // Archivar mueve estado Y fecha a la vez: la base exige que vayan juntos,
  // y si el servicio dejara una sin la otra el UPDATE fallaría entero.
  const archivado = await como(supervisor, () =>
    operaciones.updateDocument(doc.document.id, { status: 'archived' }),
  );
  assert.equal(archivado.document.status, 'archived');
  assert.ok(archivado.document.archivedAt, 'archivar exige su fecha');

  const desarchivado = await como(supervisor, () =>
    operaciones.updateDocument(doc.document.id, { status: 'active' }),
  );
  assert.equal(desarchivado.document.status, 'active');
  assert.equal(desarchivado.document.archivedAt, null);

  await rechaza(
    como(supervisor, () => operaciones.updateDocument(doc.document.id, {})),
    400,
    'actualizar sin cambios',
  );

  // ---- REGLAS DE ALERTA -------------------------------------------------

  await rechaza(
    como(supervisor, () =>
      operaciones.createAlertRule({ ruleType: 'velocidad' })),
    400,
    'regla de velocidad sin umbral',
  );
  await rechaza(
    como(supervisor, () =>
      operaciones.createAlertRule({
        ruleType: 'velocidad',
        thresholdKph: 90,
        thresholdKm: 5000,
      })),
    400,
    'regla de velocidad con kilometros',
  );
  await rechaza(
    como(supervisor, () =>
      operaciones.createAlertRule({ ruleType: 'mantenimiento', thresholdKm: 5000 })),
    400,
    'mantenimiento sin nombre de servicio',
  );

  const velocidad = await como(supervisor, () =>
    operaciones.createAlertRule({ ruleType: 'velocidad', thresholdKph: 90 }),
  );
  assert.equal(velocidad.alertRule.thresholdKph, 90);
  assert.equal(velocidad.alertRule.thresholdKm, null);
  assert.equal(velocidad.alertRule.isActive, true);

  const mantenimiento = await como(supervisor, () =>
    operaciones.createAlertRule({
      ruleType: 'mantenimiento',
      thresholdKm: 5000,
      serviceName: 'Cambio de aceite',
    }),
  );
  assert.equal(mantenimiento.alertRule.thresholdKm, 5000);
  assert.equal(mantenimiento.alertRule.thresholdKph, null);

  const desactivada = await como(supervisor, () =>
    operaciones.updateAlertRule(velocidad.alertRule.id, { isActive: false }),
  );
  assert.equal(desactivada.alertRule.isActive, false);

  await rechaza(
    como(supervisor, () => operaciones.updateAlertRule(randomUUID(), { isActive: false })),
    404,
    'regla inexistente',
  );

  // ---- EQUIPOS GPS ------------------------------------------------------

  const imei = '86' + String(Date.now()).slice(-13);
  await rechaza(
    como(supervisor, () =>
      directorio.registerGpsDevice({
        imei,
        model: 'GT06N',
        protocolFamily: 'coban-gps103',
      })),
    403,
    'supervisor registra equipos',
  );

  const equipo = await como(admin, () =>
    directorio.registerGpsDevice({
      imei,
      model: 'GT06N',
      protocolFamily: 'coban-gps103',
    }),
  );
  assert.equal(equipo.gpsDevice.status, 'inventory');
  assert.equal(equipo.gpsDevice.imei, imei);

  // El IMEI es único en TODA la plataforma, no por empresa.
  await rechaza(
    como(admin, () =>
      directorio.registerGpsDevice({
        imei,
        model: 'GT06N',
        protocolFamily: 'coban-gps103',
      })),
    409,
    'IMEI repetido',
  );

  await rechaza(
    como(supervisor, () =>
      directorio.installGpsDevice(equipo.gpsDevice.id, { vehicleId: V_AJENO })),
    404,
    'instalar sobre unidad ajena',
  );

  const instalacion = await como(supervisor, () =>
    directorio.installGpsDevice(equipo.gpsDevice.id, {
      vehicleId: V_PROPIO,
      notes: 'Montado bajo el tablero',
    }),
  );
  assert.equal(instalacion.installation.vehicleId, V_PROPIO);

  // Montarlo pasa el equipo a activo: si siguiera en `inventory`, el
  // inventario mentiria sobre lo que hay en la gaveta.
  const trasMontar = await adminPool.query(
    `SELECT status FROM fom.gps_devices WHERE id = $1`,
    [equipo.gpsDevice.id],
  );
  assert.equal(trasMontar.rows[0].status, 'active');

  // Ni el equipo en dos unidades, ni la unidad con dos equipos.
  await rechaza(
    como(supervisor, () =>
      directorio.installGpsDevice(equipo.gpsDevice.id, { vehicleId: V_PROPIO })),
    409,
    'equipo ya instalado',
  );
  const segundoImei = '86' + String(Date.now() + 1).slice(-13);
  const otroEquipo = await como(admin, () =>
    directorio.registerGpsDevice({
      imei: segundoImei,
      model: 'GT06N',
      protocolFamily: 'coban-gps103',
    }),
  );
  await rechaza(
    como(supervisor, () =>
      directorio.installGpsDevice(otroEquipo.gpsDevice.id, {
        vehicleId: V_PROPIO,
      })),
    409,
    'unidad ya tiene equipo',
  );

  // Ajustar el equipo en inventario: quien puede, quien no, y que persiste.
  await rechaza(
    como(conductor, () =>
      directorio.updateGpsDevice(otroEquipo.gpsDevice.id, { status: 'maintenance' })),
    403,
    'conductor ajusta equipos',
  );
  await rechaza(
    como(supervisor, () => directorio.updateGpsDevice(randomUUID(), { status: 'lost' })),
    404,
    'equipo inexistente',
  );
  await rechaza(
    como(supervisor, () => directorio.updateGpsDevice(otroEquipo.gpsDevice.id, {})),
    400,
    'ajustar sin cambios',
  );

  const ajustado = await como(supervisor, () =>
    directorio.updateGpsDevice(otroEquipo.gpsDevice.id, {
      status: 'maintenance',
      manufacturer: 'Concox',
      serialNumber: 'SN-0099',
    }),
  );
  assert.equal(ajustado.gpsDevice.status, 'maintenance');
  assert.equal(ajustado.gpsDevice.manufacturer, 'Concox');
  const persistido = await adminPool.query(
    `SELECT status, manufacturer, serial_number FROM fom.gps_devices WHERE id = $1`,
    [otroEquipo.gpsDevice.id],
  );
  assert.equal(persistido.rows[0].status, 'maintenance');
  assert.equal(persistido.rows[0].serial_number, 'SN-0099');

  // Un equipo que EXISTE no es un equipo instalable. En mantenimiento, dado
  // por perdido o de baja no esta fisicamente disponible, y montarlo dejaria
  // un vehiculo que parece rastreado y no lo esta — el peor fallo de este
  // dominio, porque no se nota hasta que hace falta la posicion.
  for (const estado of ['maintenance', 'lost', 'inactive']) {
    await adminPool.query(
      `UPDATE fom.gps_devices SET status = $2 WHERE id = $1`,
      [otroEquipo.gpsDevice.id, estado],
    );
    await rechaza(
      como(supervisor, () =>
        directorio.installGpsDevice(otroEquipo.gpsDevice.id, { vehicleId: V_PROPIO })),
      409,
      'instalar un equipo en estado ' + estado,
    );
  }
  // Y no quedo ninguna asignacion a medias de esos intentos.
  const sinAsignar = await adminPool.query(
    `SELECT count(*)::int AS filas FROM fom.gps_device_assignments
      WHERE gps_device_id = $1`,
    [otroEquipo.gpsDevice.id],
  );
  assert.equal(sinAsignar.rows[0].filas, 0);
  await adminPool.query(
    `UPDATE fom.gps_devices SET status = 'inventory' WHERE id = $1`,
    [otroEquipo.gpsDevice.id],
  );

  // Desmontar CIERRA la instalación, no la borra.
  const retirada = await como(supervisor, () =>
    directorio.removeGpsInstallation(instalacion.installation.id, {
      notes: 'Se retira por falla',
    }),
  );
  assert.ok(retirada.installation.removedAt);
  const historia = await adminPool.query(
    `SELECT count(*)::int AS filas FROM fom.gps_device_assignments
      WHERE gps_device_id = $1`,
    [equipo.gpsDevice.id],
  );
  assert.equal(historia.rows[0].filas, 1, 'la instalacion se cierra, no se borra');

  // Cerrar dos veces no encuentra nada abierto que cerrar.
  await rechaza(
    como(supervisor, () =>
      directorio.removeGpsInstallation(instalacion.installation.id, {})),
    404,
    'desmontar dos veces',
  );

  // Y con el equipo libre, la unidad admite otro.
  const reinstalada = await como(supervisor, () =>
    directorio.installGpsDevice(otroEquipo.gpsDevice.id, {
      vehicleId: V_PROPIO,
    }),
  );
  assert.equal(reinstalada.installation.vehicleId, V_PROPIO);

  // ---- LA PERSONA COMPLETA ----------------------------------------------

  // Perfil: lo escribe el servidor y lo valida la base en su formato.
  await rechaza(
    como(supervisor, () =>
      directorio.updateUserProfile(CONDUCTOR, { nationalId: '12345678' })),
    400,
    'cedula sin el prefijo v-',
  );
  await rechaza(
    como(supervisor, () =>
      directorio.updateUserProfile(CONDUCTOR, { phone: '04141234567' })),
    400,
    'telefono sin codigo de pais',
  );

  // «Completo» son los CUATRO datos, que es lo que dice
  // `user_profiles_completion_check`. Con menos, el perfil sigue pendiente —
  // y perseguir lo pendiente es para lo que sirve la marca.
  const soloCedula = await como(supervisor, () =>
    directorio.updateUserProfile(CONDUCTOR, { nationalId: 'v-12345678' }),
  );
  assert.equal(soloCedula.profile.nationalId, 'v-12345678');
  assert.equal(soloCedula.profile.profileComplete, false);

  const conTelefono = await como(supervisor, () =>
    directorio.updateUserProfile(CONDUCTOR, { phone: '+584141234567' }),
  );
  assert.equal(conTelefono.profile.profileComplete, false, 'faltan dos datos');

  const perfil = await como(supervisor, () =>
    directorio.updateUserProfile(CONDUCTOR, {
      address: 'Av. Bella Vista, Maracaibo',
      birthDate: '1990-05-14',
    }),
  );
  assert.equal(perfil.profile.profileComplete, true);
  assert.equal(perfil.profile.phone, '+584141234567');
  assert.equal(perfil.profile.birthDate, '1990-05-14');

  // Una vez completo NO se vuelve atras: lo prohibe el trigger de la base, y
  // con razon — que alguien corrija un campo no deshace que los papeles se
  // entregaron. La marca es un hecho ocurrido, no el estado de un formulario.
  const corregido = await como(supervisor, () =>
    directorio.updateUserProfile(CONDUCTOR, { phone: '+584149998877' }),
  );
  assert.equal(corregido.profile.profileComplete, true);
  assert.equal(corregido.profile.phone, '+584149998877');

  // Y la cedula es unica: no puede haber dos personas con el mismo documento.
  await rechaza(
    como(supervisor, () =>
      directorio.updateUserProfile(SUPERVISOR, { nationalId: 'v-12345678' })),
    409,
    'cedula repetida',
  );

  // El listado unido: cuenta, perfil, unidad asignada y papel por vencer.
  await como(supervisor, () =>
    directorio.assignDriver(V_PROPIO, { userId: CONDUCTOR, role: 'principal' }),
  );
  const gente = await como(supervisor, () =>
    directorio.listDirectory({ limit: 50, offset: 0 }),
  );
  const elConductor = gente.items.find((p) => p.userId === CONDUCTOR);
  assert.ok(elConductor, 'el conductor debe aparecer');
  assert.equal(elConductor.nationalId, 'v-12345678');
  assert.equal(elConductor.profileComplete, true);
  // En el ente propio, quien no tiene fila de perfil SI esta incompleto: eso
  // se sabe, y es un pendiente real que perseguir.
  const elSupervisor = gente.items.find((p) => p.userId === SUPERVISOR);
  assert.equal(elSupervisor.profileComplete, false);
  assert.equal(elSupervisor.nationalId, null);
  assert.equal(elConductor.vehicleId, V_PROPIO, 'debe traer la unidad vigente');
  assert.equal(elConductor.assignmentRole, 'principal');
  // La licencia que se le creo antes es el papel que vence primero.
  assert.equal(elConductor.nextDocumentType, 'licencia_conducir');
  assert.equal(typeof elConductor.nextDocumentExpiresOn, 'string');
  assert.equal(elConductor.nextDocumentExpiresOn, '2028-06-30');
  assert.equal(gente.scope.writable, true, 'su propio ente se administra');

  // Se puede buscar por cedula, que es como se busca a alguien de verdad.
  const porCedula = await como(supervisor, () =>
    directorio.listDirectory({ limit: 50, offset: 0, q: '12345678' }),
  );
  assert.equal(porCedula.items.length, 1);
  assert.equal(porCedula.items[0].userId, CONDUCTOR);

  // Mirar a un ente que no esta en el alcance responde 404, igual que uno
  // inexistente: distinguirlos convertiria esto en un buscador de empresas.
  await rechaza(
    como(supervisor, () =>
      directorio.listDirectory({ limit: 50, offset: 0 }, T_AJENO)),
    404,
    'gente de una empresa fuera de alcance',
  );
  await rechaza(
    como(supervisor, () =>
      directorio.listDirectory({ limit: 50, offset: 0 }, randomUUID())),
    404,
    'gente de una empresa inexistente',
  );
  await rechaza(
    como(conductor, () => directorio.listDirectory({ limit: 50, offset: 0 })),
    403,
    'conductor lee el directorio',
  );

  // Y el perfil de alguien de OTRO ente no se escribe, aunque se pueda leer.
  const ajeno = randomUUID();
  await adminPool.query(
    `INSERT INTO fom.users (id, email, display_name, status, email_verified_at)
     VALUES ($1, 'cw-ajeno-' || $2 || '@runtime.invalid', 'CW Ajeno', 'active', clock_timestamp())`,
    [ajeno, SUFIJO],
  );
  await adminPool.query(
    `INSERT INTO fom.tenant_memberships
       (tenant_id, user_id, role, status, activated_at)
     VALUES ($1, $2, 'conductor', 'active', clock_timestamp())`,
    [T_AJENO, ajeno],
  );
  await rechaza(
    como(supervisor, () =>
      directorio.updateUserProfile(ajeno, { phone: '+584141112233' })),
    404,
    'perfil de alguien de otra empresa',
  );

  // ---- LA COMPAÑÍA Y SUS CONTRATISTAS -----------------------------------
  //
  // El caso real: Chevron tiene contratistas, y su supervisor ve la gente de
  // varios. Lo permite `fom.actor_tenant_scope` cuando el ente propio es de
  // categoria `compania` — que es lo que el panel llama «predefinida».

  const T_COMPANIA = randomUUID();
  const SUPER_COMPANIA = randomUUID();
  await adminPool.query(
    `INSERT INTO fom.tenants (id, code, name, kind, status, category)
     VALUES ($1, 'cw-comp-' || $2, 'CW Compania', 'organization', 'active', 'compania')`,
    [T_COMPANIA, SUFIJO],
  );
  await adminPool.query(
    `INSERT INTO fom.users (id, email, display_name, status, email_verified_at)
     VALUES ($1, 'cw-supcomp-' || $2 || '@runtime.invalid', 'CW Super Compania',
             'active', clock_timestamp())`,
    [SUPER_COMPANIA, SUFIJO],
  );
  await adminPool.query(
    `INSERT INTO fom.tenant_memberships
       (tenant_id, user_id, role, status, activated_at)
     VALUES ($1, $2, 'supervisor', 'active', clock_timestamp())`,
    [T_COMPANIA, SUPER_COMPANIA],
  );

  const superCompania = {
    userId: SUPER_COMPANIA,
    tenantId: T_COMPANIA,
    role: 'supervisor',
    platformAdmin: false,
  };

  // Sin la relacion, el contratista no esta a la vista.
  await rechaza(
    como(superCompania, () =>
      directorio.listDirectory({ limit: 50, offset: 0 }, T_PROPIO)),
    404,
    'contratista todavia no colgado',
  );

  await adminPool.query(
    `INSERT INTO fom.tenant_relationships
       (company_tenant_id, contractor_tenant_id)
     VALUES ($1, $2)`,
    [T_COMPANIA, T_PROPIO],
  );

  const delContratista = await como(superCompania, () =>
    directorio.listDirectory({ limit: 50, offset: 0 }, T_PROPIO),
  );
  const conductorAjeno = delContratista.items.find((p) => p.userId === CONDUCTOR);
  assert.ok(conductorAjeno, 'la compañia ve la gente de su contratista');
  assert.equal(conductorAjeno.displayName, 'CW Driver');
  assert.equal(conductorAjeno.role, 'conductor');

  // Ve QUIEN es y QUE maneja, pero no su documento de identidad: la politica
  // de fila exige compartir un ente activo, y una compañia no comparte ente
  // con la gente de su contratista. Esa linea la traza la base sola.
  assert.equal(conductorAjeno.nationalId, null, 'la cedula no cruza la frontera');
  assert.equal(conductorAjeno.phone, null, 'el telefono tampoco');
  // Y «perfil completo» vuelve NULO, no `false`. La diferencia importa: este
  // conductor SI tiene su perfil completo, y decir «incompleto» porque la
  // politica lo oculta manda a perseguir un pendiente que no existe. Un dato
  // oculto no es un dato negativo.
  assert.equal(
    conductorAjeno.profileComplete,
    null,
    'lo oculto se responde como desconocido, no como incompleto',
  );
  assert.equal(conductorAjeno.vehicleCode, 'cw-v1-' + SUFIJO);

  // Y es SOLO lectura: quien administra a un contratista es el contratista.
  assert.equal(delContratista.scope.writable, false);
  await rechaza(
    como(superCompania, () =>
      directorio.updateUserProfile(CONDUCTOR, { phone: '+584140000000' })),
    404,
    'la compañia no edita a la gente de su contratista',
  );
  await rechaza(
    como(superCompania, () =>
      directorio.updateMembership(CONDUCTOR, { status: 'suspended' })),
    404,
    'la compañia no suspende a la gente de su contratista',
  );

  // ---- AUDITORÍA --------------------------------------------------------



  const auditoria = await adminPool.query(
    `SELECT action, entity_type, actor_user_id
       FROM fom.audit_log
      WHERE tenant_id = $1
        AND action IN ('document.create', 'document.update',
                       'alert_rule.create', 'alert_rule.update',
                       'gps_device.register', 'gps_device.install',
                       'gps_device.remove', 'gps_device.update',
                       'user_profile.update')
      ORDER BY occurred_at`,
    [T_PROPIO],
  );
  const acciones = auditoria.rows.map((r) => r.action);
  for (const esperada of [
    'document.create',
    'document.update',
    'alert_rule.create',
    'alert_rule.update',
    'gps_device.register',
    'gps_device.install',
    'gps_device.remove',
    'gps_device.update',
    'user_profile.update',
  ]) {
    assert.ok(acciones.includes(esperada), `falta la auditoria de ${esperada}`);
  }
  // Toda entrada nombra a quien la firmó: una auditoría anónima no es
  // auditoría.
  for (const fila of auditoria.rows) {
    assert.ok(fila.actor_user_id, `${fila.action} quedo sin actor`);
  }

  // ---- PERMISOS MÍNIMOS -------------------------------------------------

  // Lo que la aplicación NO debe poder hacer, comprobado contra la base y no
  // contra el código: si alguien amplía un permiso, falla aquí.
  const permisos = await adminPool.query(
    `SELECT
       has_column_privilege('fom_app','fom.notifications','read_at','UPDATE') AS marca_leido,
       has_column_privilege('fom_app','fom.documents','expires_on','UPDATE') AS mueve_vencimiento,
       has_column_privilege('fom_app','fom.documents','scope','UPDATE') AS cambia_ambito,
       has_column_privilege('fom_app','fom.documents','created_by_user_id','UPDATE') AS reescribe_autor,
       has_column_privilege('fom_app','fom.alert_rules','rule_type','UPDATE') AS cambia_tipo_regla,
       has_table_privilege('fom_app','fom.documents','DELETE') AS borra_documentos,
       has_table_privilege('fom_app','fom.notifications','DELETE') AS borra_avisos`,
  );
  assert.deepEqual(permisos.rows[0], {
    marca_leido: true,
    mueve_vencimiento: true,
    cambia_ambito: false,
    reescribe_autor: false,
    cambia_tipo_regla: false,
    borra_documentos: false,
    borra_avisos: false,
  });

  console.log('CONSOLE_COMPLIANCE_WRITES_RUNTIME=PASS');
}

main()
  .catch((error) => {
    console.error('CONSOLE_COMPLIANCE_WRITES_RUNTIME=FAIL');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrar();
  });
