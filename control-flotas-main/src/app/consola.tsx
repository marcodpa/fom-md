import { Redirect } from 'expo-router';

/**
 * Ruta LEGADO: la Consola creció y ahora es la ADMINISTRACIÓN FOM con tabs
 * (Resumen · Empresas · Usuarios · Más) en `/admin`. Se conserva la ruta para
 * no romper enlaces viejos.
 */
export default function ConsolaLegadoRedirect() {
  return <Redirect href="/admin" />;
}
