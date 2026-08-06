import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Indica si el usuario activó "reducir movimiento" en el sistema. Las
 * animaciones de la app deben consultarlo para desactivarse o suavizarse
 * (DISENO_DIRECCION §7: respetar siempre la preferencia de accesibilidad).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
