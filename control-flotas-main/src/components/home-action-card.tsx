import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type HomeActionCardProps = {
  /** Color de acento (semántico): tiñe el chip guía y la etiqueta derecha. */
  accent: string;
  /** Título de la tarjeta. */
  title: string;
  /** Línea secundaria. */
  subtitle: string;
  /** Ícono guía (ej. el del tab de destino). Si no se pasa, muestra un punto. */
  icon?: ReactNode;
  /** Etiqueta a la derecha (hora, contador…), opcional. */
  rightLabel?: string;
  /** Acción al tocar. */
  onPress: () => void;
};

/**
 * Fila-tarjeta tocable del INICIO del conductor (inspección, próximo viaje,
 * alertas). Un chip guía con tinte del color semántico (verde = todo bien,
 * amarillo = atención, rojo = urgente) da lectura de un vistazo. Feedback al
 * tocar y un chevron que invita a entrar al detalle.
 */
export function HomeActionCard({ accent, title, subtitle, icon, rightLabel, onPress }: HomeActionCardProps) {
  const { spacing, radii } = useTheme();

  return (
    <PressableScale onPress={onPress}>
      <Card style={[styles.row, { gap: spacing.md }]}>
        {/* Chip guía: tinte del acento + el ícono del destino (o un punto). */}
        <View style={[styles.leading, { borderRadius: radii.md }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: 0.14, borderRadius: radii.md }]} />
          {icon ?? <View style={[styles.dot, { backgroundColor: accent }]} />}
        </View>

        <View style={styles.flex1}>
          <ThemedText variant="subtitle">{title}</ThemedText>
          <ThemedText variant="caption" color="textMuted">
            {subtitle}
          </ThemedText>
        </View>

        {rightLabel ? (
          <ThemedText variant="button" style={{ color: accent }}>
            {rightLabel}
          </ThemedText>
        ) : null}

        <ThemedText variant="body" color="textMuted">
          ›
        </ThemedText>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex1: { flex: 1 },
});
