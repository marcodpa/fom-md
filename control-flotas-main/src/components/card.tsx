import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

/** Tarjeta temática: superficie + borde + radio + padding + sombra, del tema. */
export function Card({ style, children, ...rest }: ViewProps) {
  const { colors, radii, spacing, shadows, borderWidths } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: borderWidths.hairline,
          borderRadius: radii.lg,
          padding: spacing.lg,
        },
        shadows.card,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}
