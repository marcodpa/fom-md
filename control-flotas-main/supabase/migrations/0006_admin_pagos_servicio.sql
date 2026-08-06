-- ============================================================================
-- ADMIN FOM · Servicio por empresa + PAGOS
-- ============================================================================
-- Los 3 admin FOM no pertenecen a ninguna empresa: desde su Consola crean,
-- editan y eliminan todo, monitorean los PAGOS de cada empresa y pueden
-- ACTIVAR/DESACTIVAR el servicio (con el servicio suspendido, los usuarios de
-- esa empresa no pueden entrar a la app).
-- Ejecutar UNA vez en el SQL Editor (es idempotente).
-- ============================================================================

-- 1 · Interruptor del servicio por empresa.
alter table empresas add column if not exists servicio_activo boolean not null default true;

-- 2 · Pagos del servicio (los administra SOLO el admin FOM).
create table if not exists pagos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  monto      numeric(12,2) not null check (monto >= 0),
  moneda     text not null default 'USD',
  periodo    text not null,                      -- ej. '2026-07'
  estado     text not null default 'pendiente' check (estado in ('pendiente','pagado','vencido')),
  pagado_en  timestamptz,
  nota       text,
  creada_en  timestamptz not null default now()
);

alter table pagos enable row level security;

drop policy if exists pagos_admin on pagos;
create policy pagos_admin on pagos for all to authenticated
  using (soy_admin()) with check (soy_admin());
