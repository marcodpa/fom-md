import type { Href } from 'expo-router';

import { esCuentaPersonal, esMultiempresa, puedeConducir } from '@/auth/permissions';
import { useAuth } from '@/auth/useAuth';

import { useTenant } from './TenantProvider';

/**
 * Decide a dónde llevar al usuario tras validar credenciales (brief §5 +
 * FOM-02 §7): perfil obligatorio (si es primer ingreso) → aterrizaje según el
 * rol.
 *
 * Devuelve `null` mientras se resuelve el contexto (mostrar un loader). Cada
 * pantalla del flujo de login usa este mismo destino para avanzar al siguiente
 * paso sin lógica duplicada ni bucles.
 */
export function useLoginDestino(): Href | null {
  const { user } = useAuth();
  const tenant = useTenant();

  if (!user) return '/login';
  if (tenant.cargando) return null;

  // 1) PRIMER INGRESO (FOM-02 §3.1/§4.1/§5.1/§6.1): perfil obligatorio
  //    (cédula, licencia, carta médica) antes de cualquier superficie.
  if (!tenant.perfilCompleto) return '/completar-perfil';

  // 2) Aterrizaje según rol (FOM-02 §7). Las divisiones internas de la empresa
  //    viven en las ÁREAS (§3.1) y en los alcances de los reportes, no en un
  //    paso del login.
  if (puedeConducir(user)) return '/';
  // Cuentas personales (Ale, Santi, Sofi): su superficie doméstica (§5–§6) —
  // Ale entra directo, sin seleccionar empresa (§5.1).
  if (esCuentaPersonal(user)) return '/personal';
  // Los ADMIN FOM (los 3 desarrolladores, sin empresa) aterrizan en SU
  // superficie: la administración del sistema completo. Un rol operativo sin
  // empresa no llega aquí: el login lo corta con un mensaje claro.
  if (esMultiempresa(user)) return '/admin';
  // La gente de una COMPAÑÍA (administrador o supervisor) va a su vista de
  // MONITOREO por tabs: las compañías no operan flota propia — solo
  // administran y supervisan a sus asociadas.
  if (user.companyTipo === 'predefinida') return '/compania';
  // Administrador de una contratista → su panel operativo por pestañas (la
  // empresa la fija el AdminProvider a partir de su usuario).
  return '/panel';
}
