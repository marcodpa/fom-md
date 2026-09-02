'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

const service = read('src/console-api/console-directory.service.ts');
const controller = read('src/console-api/console-directory.controller.ts');
const dto = read('src/console-api/console-directory.dto.ts');
const roles = read('src/console-api/console-roles.ts');
const moduleSource = read('src/console-api/console-api.module.ts');
const attribution = read(
  'src/database/migrations/files/20260825180000000_add_creator_attribution.ts',
);
const credentialGrants = read(
  'src/database/migrations/files/20260825190000000_grant_directory_credential_writes.ts',
);

// ============================================================
// Directorio de consola — Issue #169 / FOM-02
// ------------------------------------------------------------
// Las promesas de seguridad de las primeras escrituras de la consola.
// Deshacer cualquiera hace fallar el CI con nombre.
// ============================================================

test('todo metodo de escritura exige rol antes de tocar la base', () => {
  const metodos = service.split(/\n  async /u).slice(1);
  const escrituras = metodos.filter((m) =>
    /INSERT INTO|UPDATE fom\./u.test(m),
  );
  assert.ok(escrituras.length >= 4, 'faltan metodos de escritura');
  for (const metodo of escrituras) {
    const nombre = metodo.slice(0, metodo.indexOf('('));
    const primerRequire = metodo.search(/require(Manager|FomAdmin)Actor\(\)/u);
    const primerSql = metodo.search(/INSERT INTO|UPDATE fom\.|SELECT/u);
    assert.ok(
      primerRequire >= 0 && primerRequire < primerSql,
      `${nombre} debe exigir rol ANTES de cualquier consulta`,
    );
  }
});

test('otorgar supervisor exige administrador FOM; admin_fom no se otorga', () => {
  assert.match(
    service,
    /dto\.role === 'supervisor'[\s\S]{0,80}requireFomAdminActor\(\)/u,
  );
  assert.match(dto, /'supervisor',\s*\n\s*'conductor',\s*\n\s*'operator',\s*\n\s*'usuario',/u);
  assert.ok(
    !/['"]admin_fom['"]/u.test(dto),
    'admin_fom no puede aparecer entre los roles otorgables',
  );
});

test('crear vehiculos es del administrador FOM; editar es de gestores', () => {
  const crear = service.slice(
    service.indexOf('async createVehicle'),
    service.indexOf('async updateVehicle'),
  );
  assert.match(crear, /requireFomAdminActor\(\)/u);
  const editar = service.slice(service.indexOf('async updateVehicle'));
  assert.match(editar, /requireManagerActor\(\)/u);
});

test('el tenant jamas viene del cliente', () => {
  // Como PROPIEDAD tipada, no como palabra: el comentario que explica la
  // regla tiene derecho a nombrarla.
  assert.ok(
    !/tenantId\s*[!?]?\s*:/u.test(dto),
    'ningun DTO puede declarar tenantId',
  );
  assert.match(service, /actor\.tenantId/u);
});

test('un ente nombrado en la RUTA se comprueba contra el alcance del actor', () => {
  // La regla de arriba prohíbe que el tenant llegue en un cuerpo. Leer la
  // gente de un contratista necesita decir CUÁL, y para eso el ente viaja en
  // la ruta — igual que en la administración de entes. Lo que autoriza sigue
  // saliendo de la sesión: esto solo elige entre los entes ya permitidos, y
  // quien decide cuáles son es `fom.actor_tenant_scope`, no el servicio.
  const alcance = service.slice(
    service.indexOf('private async alcanceDeLectura'),
    service.indexOf('async listDirectory'),
  );
  assert.match(alcance, /fom\.actor_tenant_scope/u);
  assert.match(alcance, /NotFoundException/u);
  // El camino corto —sin ente pedido— usa el de la sesión y no consulta nada.
  assert.match(alcance, /actor\.tenantId, propio: true/u);

  // Y la escritura del perfil NUNCA usa el ente pedido: solo el de la sesión.
  const perfil = service.slice(service.indexOf('async updateUserProfile'));
  assert.ok(
    !/alcanceDeLectura/u.test(perfil),
    'editar un perfil no admite elegir ente: se escribe en el propio',
  );
  assert.match(perfil, /tenant_id = \$1[\s\S]{0,120}actor\.tenantId/u);
});

test('toda alta escribe su autoria', () => {
  assert.match(service, /created_by_user_id/u);
  assert.match(service, /granted_by_user_id/u);
  assert.match(service, /assigned_by_user_id/u);
});

test('la clave temporal nace obligada a cambiarse y nunca pisa una existente', () => {
  assert.match(service, /must_change_password\)\s*\n\s*VALUES \(\$1, \$2, true\)/u);
  assert.ok(
    service.indexOf('SELECT user_id FROM fom.user_password_credentials') <
      service.indexOf('INSERT INTO fom.user_password_credentials'),
    'antes de crear la credencial hay que comprobar que no existe',
  );
  assert.match(dto, /@Length\(16, 256\)/u);
});

test('el alta de persona es transaccional', () => {
  const alta = service.slice(
    service.indexOf('async createUser'),
    service.indexOf('async listUsers'),
  );
  assert.match(alta, /'BEGIN'/u);
  assert.match(alta, /'COMMIT'/u);
  assert.match(alta, /'ROLLBACK'/u);
  assert.match(alta, /client\.release\(\)/u);
});

test('el PIN del secundario solo existe hasheado; el principal no usa PIN', () => {
  assert.match(service, /dto\.role === 'secundario' && !dto\.pin/u);
  assert.match(service, /dto\.role === 'principal' && dto\.pin/u);
  assert.match(service, /hashPassword\(\s*dto\.pin\s*\)|hashPassword\(dto\.pin\)/u);
  assert.ok(
    !/pin_hash[^\n]*dto\.pin[^H]/u.test(service),
    'el PIN en claro no puede viajar a la base',
  );
});

test('lo inexistente y lo ajeno responden igual', () => {
  const cuatrocientoscuatro = service.match(/NotFoundException\('Not found'\)/gu);
  assert.ok(
    cuatrocientoscuatro && cuatrocientoscuatro.length >= 3,
    'el 404 debe ser uniforme',
  );
});

test('las asignaciones se revocan, no se borran', () => {
  assert.match(service, /SET valid_to = clock_timestamp\(\)/u);
  assert.ok(!/DELETE FROM/u.test(service), 'el servicio no borra nada');
});

test('el modulo protege el controlador con sesion y almacen de actor', () => {
  assert.match(
    controller,
    /@UseGuards\(ConsoleSessionGuard, ConsoleBrowserMutationGuard\)/u,
  );
  assert.match(moduleSource, /ConsoleDirectoryController,\s*\n\s*ConsoleMaintenanceController,\s*\n\s*ConsoleInspectionTemplatesController,\s*\n\s*ConsoleOperationsController,\s*\n\s*ConsoleTenantsController,\s*\n\s*\)/u);
});

test('el cambio inicial revoca sesiones web dentro de la misma funcion', () => {
  const initialChange = read(
    'src/database/migrations/files/20260825210000000_add_initial_password_change_function.ts',
  );
  assert.match(initialChange, /UPDATE fom\.auth_sessions/u);
  assert.match(initialChange, /session_type = 'web'/u);
  assert.match(initialChange, /revoked_at = clock_timestamp\(\)/u);
});

test('los roles heredados se traducen antes de comparar', () => {
  assert.match(roles, /owner: 'supervisor'/u);
  assert.match(roles, /administrator: 'supervisor'/u);
  assert.match(roles, /fleet_manager: 'supervisor'/u);
  assert.match(roles, /viewer: 'usuario'/u);
});

test('la autoria es inmutable en la base y con permisos minimos', () => {
  assert.match(attribution, /reject_attribution_change/u);
  assert.match(attribution, /REVOKE ALL ON FUNCTION fom\.reject_attribution_change\(\) FROM PUBLIC/u);
  assert.match(attribution, /granted_by_user_id/u);
  for (const tabla of ['vehicles', 'gps_devices', 'areas', 'tenants', 'users', 'tenant_memberships']) {
    assert.match(
      attribution,
      new RegExp(`${tabla}_attribution_immutable`, 'u'),
      `falta el guardian de autoria de ${tabla}`,
    );
  }
});

test('el permiso de credenciales concede solo el alta: ni UPDATE ni DELETE', () => {
  assert.match(
    credentialGrants,
    /GRANT INSERT \(user_id, password_hash, must_change_password\)/u,
  );
  // El oraculo de minimo privilegio del CI prohibe UPDATE sobre
  // password_hash, y este permiso lo respeta: sobrescribir hashes ajenos es
  // poder de secuestro de cuentas y el alta no lo necesita.
  assert.ok(
    !/GRANT[\s\S]*UPDATE/u.test(credentialGrants),
    'el permiso no debe incluir UPDATE',
  );
  assert.ok(!/GRANT[\s\S]*DELETE/u.test(credentialGrants));
});

// ============================================================
// Administración de personas — Issue #202, reglas 9 y 10
// ============================================================

const credentialReset = read(
  'src/database/migrations/files/20260827120000000_add_credential_reset_function.ts',
);

test('la jerarquia de mando niega por las cuatro razones', () => {
  const cuerpo = roles.slice(roles.indexOf('export function puedeAdministrarA'));
  assert.match(cuerpo, /actor\.userId === objetivo\.userId\) return false/u);
  assert.match(cuerpo, /=== 'admin_fom'\) return false/u);
  assert.match(cuerpo, /rangoActor < 3\) return false/u);
  assert.match(cuerpo, /rangoActor > rangoDe\(objetivo\.role\)/u);
});

test('el rango solo distingue a quien manda sobre alguien', () => {
  assert.match(roles, /admin_fom: 4/u);
  assert.match(roles, /supervisor: 3/u);
  assert.match(roles, /RANGO\[canonicalRole\(role\)\] \?\? 1/u);
  assert.ok(
    !/conductor: \d/u.test(roles) && !/operator: \d/u.test(roles),
    'conductor y operator no pueden tener rango propio',
  );
});

test('administrar exige rango antes de escribir, y bajo candado', () => {
  const bloque = service.slice(
    service.indexOf('async updateMembership'),
    service.indexOf('async resetCredential'),
  );
  assert.ok(
    bloque.indexOf('FOR UPDATE') < bloque.indexOf('requireCanManage'),
    'la membresia se lee bajo candado antes de decidir',
  );
  assert.ok(
    bloque.indexOf('requireCanManage') <
      bloque.indexOf('UPDATE fom.tenant_memberships'),
    'el rango se comprueba antes de escribir',
  );
  assert.match(
    bloque,
    /dto\.role === 'supervisor'[\s\S]{0,160}canonicalRole\(actorMembership\.role\) !== 'admin_fom'/u,
  );
  assert.match(bloque, /'membership.updated'/u);
  assert.match(bloque, /lockIdentities/u);
});

test('perder el acceso cierra las sesiones abiertas', () => {
  const bloque = service.slice(
    service.indexOf('async updateMembership'),
    service.indexOf('async resetCredential'),
  );
  assert.match(bloque, /estado !== 'active'/u);
  assert.match(bloque, /UPDATE fom\.auth_sessions SET revoked_at/u);
});

test('el reinicio de clave lo escribe la base, no el servicio', () => {
  const bloque = service.slice(service.indexOf('async resetCredential'));
  assert.match(bloque, /fom\.reset_member_credential\(\$1, \$2, \$3\)/u);
  assert.ok(
    !/UPDATE fom\.user_password_credentials/u.test(bloque),
    'el servicio no puede escribir credenciales directamente',
  );
  assert.match(bloque, /hashPassword\(/u);
  // El secreto nunca entra en la auditoria.
  const auditoria = bloque.slice(bloque.indexOf('this.audit'));
  assert.ok(!/passwordHash/u.test(auditoria));
});

test('la funcion de reinicio comprueba la autorizacion por su cuenta', () => {
  assert.match(credentialReset, /SECURITY DEFINER/u);
  assert.match(credentialReset, /console_session_token/u);
  assert.match(credentialReset, /refresh_token_hash/u);
  assert.match(credentialReset, /sha256/u);
  assert.match(credentialReset, /actor_user_id = target_user_id/u);
  assert.match(credentialReset, /target_role = 'admin_fom'/u);
  assert.match(credentialReset, /actor_rank <= target_rank/u);
  assert.match(credentialReset, /actor_membership\.status = 'active'/u);
  assert.match(credentialReset, /must_change_password = true/u);
  assert.match(credentialReset, /UPDATE fom\.auth_sessions/u);
  assert.match(credentialReset, /tenant_id = shared_tenant/u);
  assert.match(credentialReset, /argon2id/u);
  assert.match(
    credentialReset,
    /REVOKE ALL ON FUNCTION\s*\n\s*fom\.reset_member_credential/u,
  );
});

test('el actor del reinicio no es un UUID suministrado por la aplicacion', () => {
  assert.doesNotMatch(
    credentialReset,
    /CREATE FUNCTION fom\.reset_member_credential\(\s*actor_user_id uuid/u,
  );
  assert.match(credentialReset, /active_tenant_count <> 1/u);
  assert.match(credentialReset, /pg_advisory_xact_lock/u);
  assert.match(credentialReset, /FOR UPDATE/u);
});

test('revocar es terminal y no se administra una membresia inexistente', () => {
  const bloque = service.slice(
    service.indexOf('async updateMembership'),
    service.indexOf('async resetCredential'),
  );
  assert.match(bloque, /A revoked membership cannot be changed/u);
  assert.match(bloque, /NotFoundException\('Not found'\)/u);
});
