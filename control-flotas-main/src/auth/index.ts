/**
 * Punto de entrada del módulo de autenticación.
 *
 *   import { AuthProvider, useAuth } from '@/auth';
 */

export { AuthProvider, AuthContext, type AuthContextValue } from './AuthProvider';
export { useAuth } from './useAuth';
export { useSignOut } from './useSignOut';
export {
  esAdmin,
  puedeConducir,
  esConductorPuro,
  esMultiempresa,
  esCuentaPersonal,
  etiquetaRol,
  rangoDe,
  puedeGestionarA,
} from './permissions';
