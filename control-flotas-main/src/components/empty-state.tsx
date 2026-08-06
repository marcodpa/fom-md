import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type EmptyStateProps = {
  title: string;
  /** Explica en tono amable qué falta y por qué (nunca un vacío frío). */
  description?: string;
  /** Glifo opcional; por defecto uno neutro. */
  icon?: ReactNode;
  /** Acción opcional (ej. "Asignar viaje"). */
  action?: { label: string; onPress: () => void };
};

/** Glifo neutro por defecto (bandeja vacía). */
function EmptyGlyph({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M4 13l2-7h12l2 7" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M4 13h5a3 3 0 0 0 6 0h5v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={0.6} fill={color} />
    </Svg>
  );
}

/**
 * Estado VACÍO de una lista/panel: ícono tenue + una línea de qué pasa + acción
 * opcional. Tono de cuidado ("Cuando te asignen un viaje, aparecerá aquí"),
 * nunca frío (DIRECCION_VISUAL_v2 §8). Todo sale del tema.
 */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.wrap, { padding: spacing.xl, gap: spacing.md }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
        {icon ?? <EmptyGlyph color={colors.textMuted} />}
      </View>
      <View style={[styles.text, { gap: spacing.xs }]}>
        <ThemedText variant="subtitle" style={styles.center}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText variant="body" color="textSecondary" style={styles.center}>
            {description}
          </ThemedText>
        ) : null}
      </View>
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  text: { alignItems: 'center', maxWidth: 320 },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', maxWidth: 260, width: '100%' },
});
