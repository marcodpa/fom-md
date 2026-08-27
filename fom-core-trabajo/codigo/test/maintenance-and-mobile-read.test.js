'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

const consulta = read('src/maintenance/maintenance-query.service.ts');
const consolaMantenimiento = read(
  'src/console-api/console-maintenance.controller.ts',
);
const movilOperaciones = read('src/mobile/mobile-operations.controller.ts');
const puente = read('src/mobile/mobile-actor-scope.ts');
const moduloMovil = read('src/mobile/mobile.module.ts');
const moduloConsola = read('src/console-api/console-api.module.ts');

// ============================================================
// Mantenimiento y lectura móvil
// ------------------------------------------------------------
// Las tablas del programa delta existían sin superficie que las sirviera.
// Esto abre la lectura en las dos puertas SIN duplicar el SQL, y estas
// pruebas fijan justamente eso: una sola verdad, dos autenticaciones.
// ============================================================

test('el servicio de mantenimiento nunca deduce el tenant', () => {
  assert.ok(
    !/currentActor\(/u.test(consulta),
    'el tenant llega por parametro, no del almacen',
  );
  const consultas = consulta.match(/tenant_id = \$1/gu) ?? [];
  assert.ok(consultas.length >= 4, 'toda consulta se acota por tenant');
  assert.ok(
    !/tenant_id = \$[2-9]/u.test(consulta),
    'el tenant siempre es el primer parametro',
  );
});

test('las lecturas de mantenimiento tienen techo y orden determinista', () => {
  const limites = consulta.match(/LIMIT \$\d+ OFFSET \$\d+/gu) ?? [];
  assert.ok(limites.length >= 3, 'todo listado esta paginado');
  // Sin desempate por identidad, dos filas iguales pueden intercambiarse
  // entre paginas y una persona desaparece del listado.
  assert.match(consulta, /ORDER BY plan\.enabled DESC, plan\.service_name, plan\.id/u);
  assert.match(consulta, /action\.due_odometer_km NULLS LAST,\s*\n\s*action\.id/u);
  assert.match(consulta, /ORDER BY reading\.observed_at DESC, reading\.id DESC/u);
});

test('una unidad ajena responde 404, no una lista vacia', () => {
  const bloque = consulta.slice(consulta.indexOf('async listOdometer'));
  assert.ok(
    bloque.indexOf('FROM fom.vehicles WHERE tenant_id') <
      bloque.indexOf('FROM fom.vehicle_odometer_readings'),
    'la pertenencia se comprueba antes de listar',
  );
  assert.match(bloque, /NotFoundException\('Not found'\)/u);
});

test('el conteo de unidades por plan lo hace la base', () => {
  assert.match(consulta, /SELECT count\(\*\) FROM fom\.maintenance_plan_vehicles/u);
});

test('la superficie de mantenimiento es solo lectura', () => {
  for (const escritura of ['INSERT INTO', 'UPDATE fom.', 'DELETE FROM']) {
    assert.ok(
      !consulta.includes(escritura),
      `el servicio de consulta no debe contener ${escritura}`,
    );
  }
  for (const verbo of ['@Post(', '@Patch(', '@Put(', '@Delete(']) {
    assert.ok(!consolaMantenimiento.includes(verbo), `consola: ${verbo}`);
    assert.ok(!movilOperaciones.includes(verbo), `movil: ${verbo}`);
  }
});

test('el movil reutiliza las consultas de la consola, no las reescribe', () => {
  assert.match(movilOperaciones, /ConsoleOperationsService/u);
  assert.match(movilOperaciones, /ConsoleFleetService/u);
  assert.ok(
    !/SELECT /u.test(movilOperaciones),
    'el controlador movil no puede llevar SQL propio',
  );
  assert.match(moduloConsola, /exports: \[ConsoleFleetService, ConsoleOperationsService\]/u);
  assert.match(moduloMovil, /ConsoleApiModule/u);
});

test('el actor movil sale del token y jamas del cliente', () => {
  assert.match(puente, /runWithActorStore/u);
  assert.match(puente, /platformAdmin: false/u);
  // El controlador solo pasa el actor que resolvio su guard.
  const declaraciones = movilOperaciones.match(/@MobileActor\(\)/gu) ?? [];
  assert.ok(declaraciones.length >= 9, 'cada ruta recibe el actor del guard');
  // El unico tenant que circula es el del actor: cualquier otra procedencia
  // —un parametro de consulta, un cuerpo— seria el cliente eligiendo empresa.
  const usos = movilOperaciones.match(/[A-Za-z.]*tenantId/gu) ?? [];
  for (const uso of usos) {
    assert.ok(
      uso === 'actor.tenantId' || uso === 'tenantId',
      `tenantId solo puede venir del actor, no de ${uso}`,
    );
  }
  assert.ok(
    !/query\.tenantId|body\.tenantId/u.test(movilOperaciones),
    'ninguna ruta lee tenantId de la peticion',
  );
});

test('toda respuesta movil prohibe la cache intermedia', () => {
  const rutas = (movilOperaciones.match(/@Get\(/gu) ?? []).length;
  const cabeceras = (
    movilOperaciones.match(/@Header\('Cache-Control', 'no-store'\)/gu) ?? []
  ).length;
  assert.equal(cabeceras, rutas, 'una cabecera no-store por ruta');
});

test('las dos superficies exigen sesion antes de consultar', () => {
  assert.match(consolaMantenimiento, /@UseGuards\(ConsoleSessionGuard\)/u);
  assert.match(movilOperaciones, /@UseGuards\(MobileSessionGuard\)/u);
  assert.match(consolaMantenimiento, /UnauthorizedException\('Console session required'\)/u);
});
