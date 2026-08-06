-- ============================================================================
-- 0011 · TELÉFONO DEL USUARIO
-- ============================================================================
-- El formato de usuario pide un teléfono (con su código de país). Se guarda en
-- perfiles junto con el resto de datos de contacto.
-- ============================================================================

alter table public.perfiles add column if not exists telefono text;
