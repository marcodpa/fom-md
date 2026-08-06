/**
 * Servicio de cuentas / multi-tenant (capa de datos abstracta).
 *
 * Resuelve el contexto que la app necesita al iniciar sesión (brief §5): si el
 * usuario a qué Cuenta/Tenant pertenece y si completó su perfil (para
 * elegir si hay más de una). Hoy es un mock; migrar es reescribir el cuerpo
 * marcado con «TODO API».
 */

import { esMultiempresa } from '@/auth/permissions';
import { supabase } from '@/lib/supabase';
import type { ContextoLogin, Cuenta, Role, User } from '@/types';

import { fakeNetwork } from './network';
import { tienePerfilCompletoSync } from './userService';


// Cuentas (tenants) por empresa. La cuenta personal (Ale Sampieri, FOM-02 §5)
// es persona natural: sin sedes, experiencia simplificada.
const CUENTAS: Record<string, Cuenta> = {
  Samfor: { id: 'cta-Samfor', nombre: 'Samfor', tipo: 'juridica' },
  petrosur: { id: 'cta-petrosur', nombre: 'Petrosur', tipo: 'juridica' },
  chevron: { id: 'cta-chevron', nombre: 'Chevron', tipo: 'juridica' },
  'pdvsa-petroboscan': { id: 'cta-pdvsa', nombre: 'PDVSA Petroboscan', tipo: 'juridica' },
  sampieri: { id: 'cta-sampieri', nombre: 'Ale Sampieri', tipo: 'natural' },
};

/**
 * Contexto de login del usuario: su cuenta y el estado de su perfil. El
 * multiempresa (admin) no tiene una sola cuenta: elige empresa en su menú.
 *
 * TODO API: GET /auth/contexto  (tras validar credenciales)
 */
// Roles con perfil obligatorio al primer ingreso (FOM-02 §3.1/§4.1/§5.1/§6.1).
const ROLES_CON_GATE_PERFIL = new Set<Role>([
  'supervisor_company',
  'conductor',
  'supervisor_personal',
  'usuario_personal',
]);

export async function getContextoLogin(user: User): Promise<ContextoLogin> {
  const cuenta = !esMultiempresa(user) && user.companyId ? (CUENTAS[user.companyId] ?? null) : null;

  if (!ROLES_CON_GATE_PERFIL.has(user.role)) {
    return fakeNetwork({ cuenta, perfilCompleto: true });
  }

  // BD provisional: el gate del primer ingreso lee `perfil_completo` real.
  if (supabase) {
    const { data } = await supabase
      .from('perfiles')
      .select('perfil_completo')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      return { cuenta, perfilCompleto: (data as { perfil_completo: boolean }).perfil_completo };
    }
  }

  return fakeNetwork({ cuenta, perfilCompleto: tienePerfilCompletoSync(user.id) });
}
