-- ============================================================================
-- 0009 · DOCUMENTOS PROPIOS (todos los roles) + FLOTA DE LA COMPAÑÍA
-- ============================================================================
-- 1) Cada usuario SUBE y administra sus documentos PERSONALES (cédula,
--    licencia, carta médica, permisos de trabajo) con vencimiento y fotos —
--    cualquier rol, no solo conductores. Antes solo escribían admins y
--    operadores de la empresa del vehículo.
drop policy if exists doc_write_propio on public.documentos;
create policy doc_write_propio on public.documentos
  for all to authenticated
  using (ambito = 'persona' and user_id = auth.uid())
  with check (ambito = 'persona' and user_id = auth.uid());

-- 2) El ADMINISTRADOR de una compañía administra los vehículos de sus
--    empresas asociadas: editarlos y MOVERLOS ENTRE sus contratistas (el
--    destino también debe estar en su alcance).
drop policy if exists vehiculos_update_compania on public.vehiculos;
create policy vehiculos_update_compania on public.vehiculos
  for update to authenticated
  using (empresa_id in (select public.alcance_compania()))
  with check (empresa_id in (select public.alcance_compania()));

drop policy if exists vehiculos_delete_compania on public.vehiculos;
create policy vehiculos_delete_compania on public.vehiculos
  for delete to authenticated
  using (empresa_id in (select public.alcance_compania()));
