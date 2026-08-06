import { forwardRef, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { EyeIcon } from '@/components/eye-icon';
import { ThemedText } from '@/components/themed-text';
import { useReducedMotion, useTheme } from '@/theme';

export type TextFieldProps = TextInputProps & {
  /** Etiqueta opcional encima del campo. */
  label?: string;
  /** Mensaje de error: pinta el borde en peligro y lo muestra debajo (B3/A2). */
  error?: string;
};

/**
 * Campo de texto temático: colores, bordes y radios salen del tema. Al enfocar,
 * un HALO en el acento de la marca se enciende suavemente alrededor del campo
 * (feedback que comunica "estás escribiendo aquí", restraint §7); con error, el
 * halo es de peligro. Respeta "reducir movimiento" (enciende sin animar).
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, style, onFocus, onBlur, multiline, secureTextEntry, ...rest },
  ref,
) {
  const { colors, spacing, radii, typography, borderWidths, motion } = useTheme();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  // Visibilidad del texto en campos de contraseña (botón "ojito").
  const [revelado, setRevelado] = useState(false);

  const esPassword = !!secureTextEntry;
  // Prioridad de borde: error > foco > reposo.
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  const borderWidth = error || focused ? borderWidths.focus : borderWidths.hairline;

  // Halo de foco: se enciende al enfocar (o siempre que haya error).
  const halo = useRef(new Animated.Value(0)).current;
  const haloVisible = focused || !!error;
  useEffect(() => {
    if (reduced) {
      halo.setValue(haloVisible ? 1 : 0);
      return;
    }
    const anim = Animated.timing(halo, {
      toValue: haloVisible ? 1 : 0,
      duration: motion.durations.fast,
      easing: motion.easing.standard,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [haloVisible, reduced, halo, motion.durations.fast, motion.easing.standard]);

  return (
    <View style={{ gap: spacing.xs, alignSelf: 'stretch' }}>
      {label ? (
        <ThemedText variant="caption" color={error ? 'danger' : focused ? 'primary' : 'textSecondary'}>
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.inputWrap}>
        {/* Halo animado alrededor del campo (opacidad, hilo nativo). */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              borderColor: error ? colors.danger : colors.primary,
              borderWidth: borderWidths.focus,
              borderRadius: radii.md + 3,
              opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
            },
          ]}
        />
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          multiline={multiline}
          accessibilityLabel={label}
          // En contraseña, se oculta salvo que el usuario pulse el ojito.
          secureTextEntry={esPassword && !revelado}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              backgroundColor: colors.surface,
              color: colors.text,
              // El borde se ilumina con el acento al enfocar (o peligro si hay error).
              borderColor,
              borderWidth,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              // Deja sitio al ojito para que no tape el texto.
              paddingRight: esPassword ? 48 : spacing.md,
              fontSize: typography.fontSize.md,
            },
            multiline && styles.multiline,
            style,
          ]}
          {...rest}
        />
        {esPassword ? (
          <Pressable
            onPress={() => setRevelado((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revelado ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={styles.eyeButton}>
            {/* Ojo abierto = visible; ojo tachado = oculto. */}
            <EyeIcon off={!revelado} color={revelado ? colors.primary : colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText variant="caption" color="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  // Anillo que rodea el campo, un pelo por fuera del borde.
  halo: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
  },
  // Ocupa el borde derecho del campo, centrado verticalmente.
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
