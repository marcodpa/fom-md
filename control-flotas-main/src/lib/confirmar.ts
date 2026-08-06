/**
 * Confirmación destructiva multiplataforma. En nativo usa Alert.alert; en web
 * Alert.alert es un NO-OP (react-native-web lo implementa vacío), así que ahí
 * se usa window.confirm — sin esto, suspender/eliminar/revocar serían
 * imposibles desde el navegador y el botón parecería colgado.
 */

import { Alert, Platform } from 'react-native';

export function confirmar(opciones: {
  titulo: string;
  mensaje: string;
  /** Texto del botón que ejecuta la acción (ej. "Eliminar todo"). */
  accion: string;
  destructivo?: boolean;
  onConfirmar: () => void;
}): void {
  const { titulo, mensaje, accion, destructivo = true, onConfirmar } = opciones;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${titulo}\n\n${mensaje}`)) onConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: accion, style: destructivo ? 'destructive' : 'default', onPress: onConfirmar },
  ]);
}
