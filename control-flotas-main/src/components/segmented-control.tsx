import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useReducedMotion, useTheme } from '@/theme';

export type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Control segmentado de selección única. La selección es una CÁPSULA FLOTANTE
 * (píldora con sombra) que se desliza con el resorte del tema por un riel
 * hundido — el mismo gesto físico de la barra de tabs. También EN REPOSO se ve
 * distinto de un bloque: cápsula sobre riel cápsula, no rectángulo pintado.
 * Respeta reduce-motion (salta sin animar). Todo del tema.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, radii, spacing, motion, shadows } = useTheme();
  const reduced = useReducedMotion();

  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  // Ancho útil de la pista (sin el padding interno) repartido por igual.
  const segWidth = trackWidth > 0 ? (trackWidth - spacing.xs * 2) / options.length : 0;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (segWidth <= 0) return;
    const destino = index * segWidth;
    if (reduced) {
      x.setValue(destino);
      return;
    }
    Animated.spring(x, {
      toValue: destino,
      useNativeDriver: true,
      damping: motion.spring.damping,
      stiffness: motion.spring.stiffness,
      mass: motion.spring.mass,
      // Sin rebote que descubra el borde de la pista.
      overshootClamping: true,
    }).start();
  }, [index, segWidth, reduced, x, motion.spring]);

  return (
    <View
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[
        styles.row,
        {
          backgroundColor: colors.surfaceSunken,
          borderColor: colors.border,
          // Riel en cápsula: el control completo es una píldora, como los
          // botones y chips (sistema de formas: acciones = pill).
          borderRadius: radii.pill,
          padding: spacing.xs,
        },
      ]}>
      {/* Píldora deslizante bajo el segmento activo. */}
      {segWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            // FLOTA de verdad: sombra de elemento flotante, no de tarjeta.
            shadows.floating,
            {
              width: segWidth,
              left: spacing.xs,
              top: spacing.xs,
              bottom: spacing.xs,
              backgroundColor: colors.primary,
              borderRadius: radii.pill,
              transform: [{ translateX: x }],
            },
          ]}
        />
      ) : null}

      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={[styles.segment, { paddingVertical: spacing.sm }]}>
            <ThemedText
              variant="caption"
              color={active ? 'onPrimary' : 'textSecondary'}
              numberOfLines={1}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  // minHeight 44: área táctil cómoda (accesibilidad, v2 §9).
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, zIndex: 1 },
  pill: { position: 'absolute' },
});
