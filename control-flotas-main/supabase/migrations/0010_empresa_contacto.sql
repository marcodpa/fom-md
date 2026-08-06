-- ============================================================================
-- 0010 · CONTACTO DE LA EMPRESA (teléfono + correo)
-- ============================================================================
-- Los formatos de FOM piden, además del RIF, un TELÉFONO (con su código de
-- país) y un CORREO por empresa. Antes solo existía el campo libre `contacto`.
-- ============================================================================

alter table public.empresas add column if not exists telefono text;
alter table public.empresas add column if not exists email text;
