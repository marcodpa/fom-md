import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

// Promueve al propietario a admin_fom (Issue #330). Ese rol no se otorga
// por API a proposito (regla 2 del #258); la via con recibo es esta
// migracion. Idempotente: si la persona o la empresa no existen (CI), no
// toca nada. La reversion devuelve el rol de origen solo si sigue siendo
// admin_fom.

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    UPDATE fom.tenant_memberships AS m SET role = 'admin_fom'
      FROM fom.users AS u, fom.tenants AS t
     WHERE m.user_id = u.id AND m.tenant_id = t.id
       AND u.email = 'marcodpacheco@gmail.com' AND t.code = 'fom-operations'
       AND m.status = 'active' AND m.role <> 'admin_fom';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    UPDATE fom.tenant_memberships AS m SET role = 'fleet_manager'
      FROM fom.users AS u, fom.tenants AS t
     WHERE m.user_id = u.id AND m.tenant_id = t.id
       AND u.email = 'marcodpacheco@gmail.com' AND t.code = 'fom-operations'
       AND m.role = 'admin_fom';
  `);
};
