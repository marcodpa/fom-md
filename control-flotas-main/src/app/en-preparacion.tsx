import { Redirect } from 'expo-router';

import { esCuentaPersonal, useAuth } from '@/auth';

/**
 * Ruta puente del Bloque 1: fue el aterrizaje temporal de las cuentas
 * personales mientras su superficie real (FOM-02 §5–§6) no existía. Hoy todas
 * las vistas por rol existen, así que solo redirige a la superficie correcta
 * (se conserva la ruta para no romper enlaces/hábitos).
 */
export default function EnPreparacionScreen() {
  const { user, status } = useAuth();

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (esCuentaPersonal(user)) return <Redirect href="/personal" />;
  return <Redirect href="/" />;
}
