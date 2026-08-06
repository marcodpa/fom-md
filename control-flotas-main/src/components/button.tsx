import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { darken, useReducedMotion, useTheme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary: acento de marca · secondary: superficie con borde · danger: rojo. */
  variant?: ButtonVariant;
  /** Ícono guía opcional (familia propia), a la izquierda del texto. */
  icon?: TabIconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botón temático reutilizable. Todos los colores salen del tema. Microinteracción
 * al presionar (escala + tono más oscuro) y estado deshabilitado legible
 * (relleno neutro con texto aún visible), según DISENO_DIRECCION §5.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const { colors, radii, spacing, motion, shadows } = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;
  const bordered = variant === 'secondary';

  const baseBg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.surface;
  const baseFg =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.onDanger : colors.text;

  // Deshabilitado: relleno neutro con texto legible (no un botón "apagado").
  const background = isDisabled ? colors.border : pressed ? darken(baseBg, 0.08) : baseBg;
  const foreground = isDisabled ? colors.textSecondary : baseFg;

  function animateTo(value: number) {
    if (reduced) return;
    Animated.timing(scale, {
      toValue: value,
      duration: motion.durations.micro,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPressIn={() => {
        setPressed(true);
        animateTo(motion.pressedScale);
      }}
      onPressOut={() => {
        setPressed(false);
        animateTo(1);
      }}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor: bordered && !isDisabled ? colors.border : 'transparent',
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          // Píldora: la forma de acción de la app (chips y pills ya lo son).
          // Sistema de formas: acciones = pill · tarjetas = 16 · inputs = 12.
          borderRadius: radii.pill,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          transform: [{ scale }],
        },
        // Los botones RELLENOS y activos FLOTAN sobre la pantalla (sombra de
        // flotante, no de tarjeta). El secundario con borde no lleva sombra:
        // evita el "ghost-card" borde+sombra.
        !bordered && !isDisabled ? shadows.floating : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={[styles.content, { gap: spacing.sm }]}>
          {icon ? <TabIcon name={icon} color={foreground} size={18} /> : null}
          <ThemedText variant="button" numberOfLines={1} style={{ color: foreground }}>
            {label}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48, // área táctil cómoda (DISENO_DIRECCION §3)
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
