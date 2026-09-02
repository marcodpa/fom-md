'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const {
  runWithActorStore,
  setCurrentActor,
} = require('../dist/authentication/actor-context.js');
const {
  ConsoleFleetService,
} = require('../dist/console-api/console-fleet.service.js');
const {
  ConsoleSessionGuard,
} = require('../dist/console-api/console-session.guard.js');
const {
  ConsoleBrowserMutationGuard,
} = require('../dist/console-api/console-browser-mutation.guard.js');
const {
  ConsoleAuthController,
} = require('../dist/console-api/console-auth.controller.js');

const root = join(__dirname, '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

/**
 * Fuente sin comentarios.
 *
 * Las comprobaciones de abajo afirman que ciertos nombres NO aparecen. Los
 * comentarios de este módulo los mencionan constantemente, porque explican
 * precisamente por qué no se usan —«no se reutiliza el Bearer móvil», «aquí no
 * hay tenantId»—. Sin quitarlos, la prosa que documenta la decisión haría
 * fallar la prueba que la verifica.
 */
const BLOQUE = new RegExp(String.raw`/\*[\s\S]*?\*/`, "g");
const LINEA = new RegExp(String.raw`//[^
]*`, "g");
const codigo = (relative) =>
  read(relative).replace(BLOQUE, '').replace(LINEA, '');

const controller = codigo('src/console-api/console.controller.ts');
const guard = codigo('src/console-api/console-session.guard.ts');
const fleet = codigo('src/console-api/console-fleet.service.ts');
const dto = codigo('src/console-api/console.dto.ts');
const module_ = read('src/console-api/console-api.module.ts');
const actorService = read('src/authentication/actor-context.service.ts');

// ============================================================
// CONTRATO DE SEGURIDAD — Issue #173, opción B
// ------------------------------------------------------------
// Lo que se comprueba aquí no es que el código exista, sino que las tres
// promesas del contrato sean ciertas: la cookie es la única credencial, el
// tenant jamás viene del cliente, y un recurso ajeno es indistinguible de uno
// inexistente.
// ============================================================

test('la cookie de sesión es la única credencial de la consola', () => {
  assert.match(guard, /__Host-fom_session/u);
  assert.match(controller, /@UseGuards\(ConsoleSessionGuard\)/u);
  assert.match(controller, /@Controller\('api\/v1\/console'\)/u);

  // El token interno NO participa. Si apareciera, la superficie volvería a ser
  // inservible para una web publicada, que es justo el problema que resuelve.
  assert.doesNotMatch(guard, /internalAuthToken|x-fom-map-internal-token/u);
  assert.doesNotMatch(controller, /internalAuthToken|x-fom-map-internal-token/u);

  // Tampoco se reutiliza el Bearer móvil en el navegador.
  assert.doesNotMatch(guard, /authorization|Bearer/iu);
});

test('las mutaciones de navegador validan CSRF, JSON y Origin en runtime', () => {
  const mutationGuard = new ConsoleBrowserMutationGuard();
  const context = (method, headers = {}) => ({
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  });
  const valid = {
    origin: 'https://fom.example',
    'content-type': 'application/json; charset=utf-8',
    'x-fom-csrf': 'fom-browser-v1',
  };

  assert.equal(mutationGuard.canActivate(context('POST', valid)), true);
  assert.equal(mutationGuard.canActivate(context('GET')), true);

  for (const [headers, label] of [
    [{ ...valid, origin: undefined }, 'sin Origin'],
    [{ ...valid, origin: 'javascript:alert(1)' }, 'esquema no HTTP'],
    [{ ...valid, origin: 'https://user@fom.example' }, 'credenciales'],
    [{ ...valid, origin: 'https://fom.example/ruta' }, 'ruta en Origin'],
    [{ ...valid, 'x-fom-csrf': 'incorrecto' }, 'marcador incorrecto'],
    [{ ...valid, 'x-fom-csrf': undefined }, 'sin marcador'],
    [{ ...valid, 'content-type': 'text/plain' }, 'content type simple'],
    [{ ...valid, 'content-type': undefined }, 'sin content type'],
  ]) {
    assert.throws(
      () => mutationGuard.canActivate(context('PATCH', headers)),
      (error) => error.status === 403,
      label,
    );
  }
});

test('el cambio inicial limpia la cookie y exige una sesión nueva', async () => {
  const controller = new ConsoleAuthController(
    { authenticate: async () => ({ userId: ACTOR_UNO.userId }) },
    {},
    {
      completeInitialChange: async () => ({ changed: true }),
    },
  );
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
  };
  const result = await controller.changeInitialPassword(
    { cookie: '__Host-fom_session=testigo-anterior' },
    { currentPassword: 'temporal-segura-0001', newPassword: 'definitiva-segura-0002' },
    response,
  );
  assert.equal(result.changed, true);
  assert.equal(result.authenticated, false);
  assert.match(response.headers['set-cookie'], /__Host-fom_session=;/u);
  assert.match(response.headers['set-cookie'], /Max-Age=0/u);
});

test('el tenantId no se acepta del cliente en ninguna forma', () => {
  // Ni como parámetro de consulta declarado...
  assert.doesNotMatch(dto, /tenantId/u);
  // ...ni como parámetro de ruta, ni leído de cabeceras en el controlador.
  assert.doesNotMatch(controller, /tenantId/u);

  // El servicio lo obtiene SOLO del actor. Que no exista ninguna firma que lo
  // reciba es lo que hace imposible pasárselo por descuido.
  assert.match(fleet, /currentActor\(\)/u);
  assert.doesNotMatch(fleet, /tenantId\s*:\s*string\s*\)/u);
});

test('la identidad se resuelve con el servicio compartido, sin SQL propio', () => {
  assert.match(guard, /this\.actors\.resolveByUserId\(session\.userId\)/u);
  assert.match(actorService, /async resolveByUserId/u);
  // El módulo reutiliza el servicio de posiciones de la consola interna en vez
  // de reimplementar la consulta.
  assert.match(module_, /GpsPositionQueryService/u);
  assert.doesNotMatch(fleet, /FROM fom\.gps_positions/u);
});

test('el almacén de actor cubre toda la petición', () => {
  assert.match(module_, /apply\(ConsoleActorStoreMiddleware\)/u);
  // El almacén debe cubrir TODOS los controladores con datos: si uno queda
  // fuera, sus servicios ven actor nulo y responden vacío.
  assert.match(
    module_,
    /forRoutes\(\s*ConsoleController,\s*ConsoleDirectoryController,\s*ConsoleMaintenanceController,\s*ConsoleInspectionTemplatesController,\s*ConsoleOperationsController,\s*ConsoleTenantsController,?\s*\)/u,
  );
});

test('los listados tienen techo y la superficie es de solo lectura', () => {
  assert.match(dto, /@Max\(200\)/u);
  assert.match(dto, /@Max\(1000\)/u);
  for (const verbo of ['@Post(', '@Put(', '@Patch(', '@Delete(']) {
    assert.ok(
      !controller.includes(verbo),
      `la superficie de lectura no debe exponer ${verbo}`,
    );
  }
});

// ============================================================
// COMPORTAMIENTO: aislamiento entre empresas
// ============================================================

/** Base falsa que registra con qué parámetros se la consultó. */
function baseDatos(filas = []) {
  const consultas = [];
  return {
    consultas,
    async query(text, values = []) {
      consultas.push({ text, values });
      return { rows: filas, rowCount: filas.length };
    },
  };
}

const ACTOR_UNO = {
  userId: '11111111-1111-4111-8111-111111111111',
  tenantId: 'aaaaaaaa-1111-4111-8111-111111111111',
  role: 'fleet_manager',
  platformAdmin: false,
};

const consulta = { limit: 50, offset: 0 };

test('toda consulta se acota al tenant del actor, no al que pida el cliente', async () => {
  const db = baseDatos([]);
  const servicio = new ConsoleFleetService(db);

  await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    await servicio.listVehicles(consulta);
    await servicio.listAreas(consulta);
    await servicio.listDrivers(consulta);
  });

  assert.equal(db.consultas.length, 3);
  for (const { text, values } of db.consultas) {
    assert.equal(
      values[0],
      ACTOR_UNO.tenantId,
      'el primer parámetro debe ser siempre el tenant del actor',
    );
    assert.match(text, /tenant_id = \$1/u);
  }
});

test('un vehículo de otra empresa responde igual que uno inexistente', async () => {
  // La base devuelve cero filas porque el WHERE lleva el tenant del actor: da
  // lo mismo que el vehículo no exista o que sea de otra empresa.
  const servicio = new ConsoleFleetService(baseDatos([]));

  await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    await assert.rejects(
      () => servicio.getVehicle('bbbbbbbb-2222-4222-8222-222222222222'),
      (error) => {
        assert.equal(error.status, 404);
        // Ni el mensaje delata la diferencia.
        assert.equal(error.message, 'Vehicle not found');
        return true;
      },
    );
  });
});

test('sin actor no se sirve nada, aunque falte el guard', async () => {
  const db = baseDatos([{ id: 'x', total: '1' }]);
  const servicio = new ConsoleFleetService(db);

  await runWithActorStore(async () => {
    // Deliberadamente NO se fija actor: simula una ruta montada sin guard.
    await assert.rejects(() => servicio.listVehicles(consulta), /not found/iu);
  });
  assert.equal(db.consultas.length, 0, 'no debe llegar a consultar la base');
});

test('los conductores no exponen datos personales ni el PIN', async () => {
  const db = baseDatos([]);
  const servicio = new ConsoleFleetService(db);

  await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    await servicio.listDrivers(consulta);
  });

  const { text } = db.consultas[0];
  for (const columna of [
    'pin_hash', 'national_id', 'phone', 'address', 'birth_date',
    'user_profiles', 'user_credentials',
  ]) {
    assert.ok(
      !text.includes(columna),
      `la consulta de conductores no debe tocar ${columna}`,
    );
  }
});

test('sin cookie de sesión el guard rechaza antes de consultar nada', async () => {
  const sesiones = {
    llamadas: 0,
    async authenticate() {
      this.llamadas += 1;
      return { userId: ACTOR_UNO.userId };
    },
  };
  const actores = {
    async resolveByUserId() {
      return ACTOR_UNO;
    },
  };
  const guardia = new ConsoleSessionGuard(sesiones, actores);
  const contexto = (headers) => ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  });

  for (const headers of [
    {},
    { cookie: 'otra=cosa' },
    { cookie: '__Host-fom_session=' },
    // Un parecido no basta: el prefijo `__Host-` es parte del nombre.
    { cookie: 'fom_session=abc' },
  ]) {
    await assert.rejects(
      () => guardia.canActivate(contexto(headers)),
      (error) => {
        assert.equal(error.status, 401);
        return true;
      },
    );
  }
  assert.equal(sesiones.llamadas, 0, 'no debe validar sesiones inexistentes');
});

test('con cookie válida el actor queda disponible para los servicios', async () => {
  const guardia = new ConsoleSessionGuard(
    { authenticate: async () => ({ userId: ACTOR_UNO.userId }) },
    { resolveByUserId: async () => ACTOR_UNO },
    // Sin cambio inicial pendiente: la sesion entra completa (#202).
    { mustChangePassword: async () => false },
  );

  await runWithActorStore(async () => {
    await guardia.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { cookie: 'otra=1; __Host-fom_session=testigo-valido' },
        }),
      }),
    });
    const { currentActor } = require('../dist/authentication/actor-context.js');
    assert.deepEqual(currentActor(), ACTOR_UNO);
  });
});

// ============================================================
// ACCESO DE LA CONSOLA
// ------------------------------------------------------------
// `/auth/login` exige `FOM_MAP_INTERNAL_AUTH_TOKEN` y FOM-TEST no lo tiene
// configurado: responde 503. Sin estas rutas, la superficie se autenticaba por
// cookie y no existía forma de conseguir la cookie.
// ============================================================

const authController = codigo('src/console-api/console-auth.controller.ts');

test('el acceso de consola no depende del token interno', () => {
  assert.match(authController, /@Controller\('api\/v1\/console\/auth'\)/u);
  assert.doesNotMatch(authController, /internalAuthToken|assertInternalCaller/u);
  // Reutiliza el servicio de sesiones, no una autenticación propia.
  assert.match(authController, /this\.sessions\.login/u);
  assert.match(authController, /this\.sessions\.authenticate/u);
});

test('login, cambio de clave y logout comparten el guard CSRF', () => {
  assert.match(authController, /@UseGuards\(ConsoleBrowserMutationGuard\)/u);
});

test('la cookie de sesión lleva todas sus defensas', () => {
  for (const atributo of ['HttpOnly', 'Secure', 'SameSite=Strict', '__Host-']) {
    assert.ok(
      authController.includes(atributo),
      `la cookie debe declarar ${atributo}`,
    );
  }
});

test('salir revoca del lado del servidor, no solo borra la cookie', () => {
  // Borrar la cookie sin revocar dejaría vivo cualquier testigo ya copiado.
  assert.match(authController, /this\.sessions\.logout/u);
  assert.match(authController, /Max-Age=\$\{maxAge\}/u);
});

test('el alcance se resuelve en cada petición, no se guarda en la cookie', () => {
  // Así una membresía revocada surte efecto en la siguiente llamada, sin
  // esperar a que la sesión caduque.
  assert.match(authController, /resolveByUserId/u);
  assert.doesNotMatch(authController, /tenantId.*=.*cookie|cookie.*tenantId/u);
});

// ============================================================
// OPERACIÓN Y CUMPLIMIENTO (#170/#171 servidos por la consola)
// ============================================================

const {
  ConsoleOperationsService,
} = require('../dist/console-api/console-operations.service.js');
const opsController = codigo('src/console-api/console-operations.controller.ts');
const opsService = codigo('src/console-api/console-operations.service.ts');

test('las lecturas y las escrituras de operación van tras sesión y CSRF', () => {
  assert.match(
    opsController,
    /@UseGuards\(ConsoleSessionGuard, ConsoleBrowserMutationGuard\)/u,
  );
  // La lista de mutaciones es CERRADA y se enumera aquí a propósito: que
  // añadir una escritura obligue a tocar esta prueba es el punto. Lo que se
  // vigila no es «que no haya escrituras» —levantar una orden es trabajo
  // legítimo del supervisor— sino que no aparezca ninguna sin que alguien
  // la haya declarado.
  const mutaciones = [
    /@Patch\('work-orders\/:workOrderId\/status'\)/u,
    /@Post\('work-orders'\)/u,
    /@Patch\('notifications\/:notificationId\/read'\)/u,
    /@Post\('notifications\/read-all'\)/u,
    /@Post\('documents'\)/u,
    /@Patch\('documents\/:documentId'\)/u,
    /@Post\('alert-rules'\)/u,
    /@Patch\('alert-rules\/:alertRuleId'\)/u,
  ];
  for (const ruta of mutaciones) {
    assert.match(opsController, ruta);
  }
  // El total tiene que cuadrar con la lista: si aparece una escritura que
  // nadie declaró aquí, esto falla, que es exactamente el punto.
  const totalMutaciones =
    (opsController.match(/@Patch\(/gu) ?? []).length +
    (opsController.match(/@Post\(/gu) ?? []).length;
  assert.equal(totalMutaciones, mutaciones.length);
  for (const verbo of ['@Put(', '@Delete(']) {
    assert.ok(!opsController.includes(verbo), `no debe exponer ${verbo}`);
  }
});

test('la superficie de consola entera se enumera, no solo un controlador', () => {
  // La enumeracion anterior cubria un controlador y daba la sensacion de
  // cerrar la puerta entera. Aqui se cuentan TODAS las mutaciones que expone
  // la consola: si aparece una que nadie declaro —en cualquier controlador—
  // esto falla, que es el unico modo de que la lista sirva de algo.
  const controladores = {
    operaciones: opsController,
    directorio: codigo('src/console-api/console-directory.controller.ts'),
    entes: codigo('src/console-api/console-tenants.controller.ts'),
    sesion: codigo('src/console-api/console-auth.controller.ts'),
  };

  const ESPERADAS = {
    operaciones: [
      "@Post('work-orders')",
      "@Patch('work-orders/:workOrderId/status')",
      "@Patch('notifications/:notificationId/read')",
      "@Post('notifications/read-all')",
      "@Post('documents')",
      "@Patch('documents/:documentId')",
      "@Post('alert-rules')",
      "@Patch('alert-rules/:alertRuleId')",
    ],
    directorio: [
      "@Post('users')",
      "@Patch('users/:userId')",
      "@Post('users/:userId/credential-reset')",
      "@Patch('users/:userId/profile')",
      "@Post('vehicles')",
      "@Patch('vehicles/:vehicleId')",
      "@Post('vehicles/:vehicleId/drivers')",
      "@Patch('driver-assignments/:assignmentId/revoke')",
      "@Post('gps-devices')",
      "@Patch('gps-devices/:deviceId')",
      "@Post('gps-devices/:deviceId/installation')",
      "@Patch('gps-installations/:assignmentId/remove')",
    ],
    entes: [
      "@Post('tenants')",
      "@Patch('tenants/:tenantId')",
      "@Post('tenants/:tenantId/contractors')",
      "@Patch('tenant-relationships/:relationshipId/end')",
      "@Post('tenants/:tenantId/areas')",
      "@Patch('areas/:areaId')",
    ],
    sesion: ["@Post('login')", "@Post('password')", "@Post('logout')"],
  };

  for (const [nombre, fuente] of Object.entries(controladores)) {
    for (const ruta of ESPERADAS[nombre]) {
      assert.ok(fuente.includes(ruta), `${nombre}: falta ${ruta}`);
    }
    const total =
      (fuente.match(/@Post\(/gu) ?? []).length +
      (fuente.match(/@Patch\(/gu) ?? []).length;
    assert.equal(
      total,
      ESPERADAS[nombre].length,
      `${nombre}: hay ${total} mutaciones y solo ${ESPERADAS[nombre].length} declaradas`,
    );
    // PUT y DELETE no existen en esta superficie, en ningun controlador.
    for (const verbo of ['@Put(', '@Delete(']) {
      assert.ok(!fuente.includes(verbo), `${nombre} no debe exponer ${verbo}`);
    }
  }

  // Toda mutacion pasa por la guarda de navegador. La de SESION la llevan
  // todos menos el controlador de sesion, que no puede exigirla: iniciar
  // sesion es precisamente lo que todavia no la tiene.
  for (const [nombre, fuente] of Object.entries(controladores)) {
    assert.match(
      fuente,
      /ConsoleBrowserMutationGuard/u,
      `${nombre} sin guarda de navegador`,
    );
    if (nombre === 'sesion') continue;
    assert.match(
      fuente,
      /@UseGuards\(ConsoleSessionGuard, ConsoleBrowserMutationGuard\)/u,
      `${nombre} sin guardas de sesion y CSRF`,
    );
  }
});

test('operación: toda escritura exige rol antes de tocar la base', () => {
  const metodos = opsService.split(/\n  async /u).slice(1);
  const escrituras = metodos.filter((m) => /INSERT INTO|UPDATE fom\./u.test(m));
  assert.ok(escrituras.length >= 2, 'faltan metodos de escritura');
  for (const metodo of escrituras) {
    const nombre = metodo.slice(0, metodo.indexOf('('));
    const primerRequire = metodo.search(/requireManagerActor\(\)/u);
    const primerSql = metodo.search(/INSERT INTO|UPDATE fom\.|SELECT/u);
    assert.ok(
      primerRequire >= 0 && primerRequire < primerSql,
      `${nombre} debe exigir rol ANTES de cualquier consulta`,
    );
  }
});

test('la orden nace nombrando a quien la abrió', () => {
  // El trigger del histórico toma el actor de `last_status_actor_user_id`.
  // Si una creación no la escribe, la primera línea del histórico queda
  // anónima — y un histórico anónimo no sirve para lo único que sirve.
  const creacion = opsService.slice(opsService.indexOf('async createWorkOrder'));
  const insert = creacion.slice(0, creacion.indexOf('RETURNING'));
  assert.match(insert, /last_status_actor_user_id/u);
});

test('operación: toda consulta se acota al tenant del actor', async () => {
  const db = baseDatos([]);
  const servicio = new ConsoleOperationsService(db);

  await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    await servicio.listWorkOrders(consulta);
    await servicio.listInspections(consulta);
    await servicio.listDocuments(consulta);
    await servicio.listAlertRules(consulta);
    await servicio.listNotifications(consulta);
    await servicio.summary();
  });

  assert.ok(db.consultas.length >= 6);
  for (const { text, values } of db.consultas) {
    assert.equal(values[0], ACTOR_UNO.tenantId);
    // El resumen usa subconsultas con `tenant_id = $1` dentro; los listados lo
    // llevan en el WHERE principal. En ambos casos el unico parametro de
    // tenant es el del actor.
    assert.match(text, /tenant_id = \$1/u);
  }
});

test('una orden ajena responde 404 sin consultar su historial', async () => {
  const db = baseDatos([]);
  const servicio = new ConsoleOperationsService(db);

  await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    await assert.rejects(
      () => servicio.getWorkOrder('bbbbbbbb-2222-4222-8222-222222222222'),
      (error) => error.status === 404,
    );
  });
  // Si consultara el historial antes de comprobar la orden, el tiempo de
  // respuesta delataría si una orden ajena existe.
  assert.equal(db.consultas.length, 1, 'el historial no debe consultarse');
});

test('el filtro de estado no duplica el catálogo; la mutación sí cierra destinos', () => {
  // El catálogo vive en el dominio de la base (#170). Duplicarlo en el DTO
  // recrearía el problema que aquel PR quitó: ampliar obligando a acertar en
  // varios sitios.
  const dtoFuente = codigo('src/console-api/console.dto.ts');
  const filtro = dtoFuente.slice(
    dtoFuente.indexOf('export class WorkOrderQueryDto'),
    dtoFuente.indexOf('export const WORK_ORDER_STATUSES'),
  );
  assert.doesNotMatch(filtro, /@IsIn|abierta|en_revision|aprobada|cancelada/u);
  assert.match(dtoFuente, /export const WORK_ORDER_STATUSES/u);
});

test('los documentos no exponen la ruta de almacenamiento', async () => {
  const db = baseDatos([]);
  const servicio = new ConsoleOperationsService(db);

  await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    await servicio.listDocuments(consulta);
  });
  assert.ok(
    !db.consultas[0].text.includes('storage_key'),
    'storage_key es una ruta interna del almacén y no debe publicarse',
  );
});

test('el resumen sale de una sola consulta', async () => {
  const filas = [{
    odtAbiertas: '2', odtEnRevision: '1', odtCerradas: '7',
    inspeccionesHoy: '0', inspeccionesPendientes: '3',
    docsVencidos: '1', docsPorVencer: '4', alertasSinLeer: '5',
  }];
  const db = baseDatos(filas);
  const servicio = new ConsoleOperationsService(db);

  const resumen = await runWithActorStore(async () => {
    setCurrentActor(ACTOR_UNO);
    return servicio.summary();
  });

  assert.equal(db.consultas.length, 1, 'contadores de instantes distintos no cuadran entre sí');
  // Y todos llegan como números, no como las cadenas del driver.
  for (const valor of Object.values(resumen)) {
    assert.equal(typeof valor, 'number');
  }
  assert.equal(resumen.odtCerradas, 7);
});
