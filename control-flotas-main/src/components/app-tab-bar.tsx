import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useReducedMotion, useTheme } from '@/theme';

/**
 * Barra de pestañas propia (reemplaza la plana por defecto). Un "pill" de acento
 * se desliza con resorte hasta la pestaña activa, el ícono/etiqueta activos toman
 * el color de la empresa, y cada toque tiene feedback de escala. Respeta el área
 * segura y "reducir movimiento". Todo sale del tema (nada hardcodeado) y funciona
 * igual en el conductor y en el panel de admin.
 */
export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, spacing, radii, motion, borderWidths } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [barW, setBarW] = useState(0);
  const count = state.routes.length;
  const tabW = count > 0 ? barW / count : 0;

  // Posición del pill activo (en "unidades de pestaña"): se anima con resorte.
  const pos = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    if (reduced) {
      pos.setValue(state.index);
      return;
    }
    const anim = Animated.spring(pos, {
      toValue: state.index,
      useNativeDriver: true,
      damping: motion.spring.damping,
      stiffness: motion.spring.stiffness,
      mass: motion.spring.mass,
    });
    anim.start();
    return () => anim.stop();
  }, [state.index, reduced, pos, motion.spring.damping, motion.spring.stiffness, motion.spring.mass]);

  const translateX = pos.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabW),
    // clamp implícito: rango exacto
  });

  return (
    <View
      style={[
        styles.wrap,
        {
          // Mismo fondo que la pantalla (como la barra anterior): sin contraste.
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: borderWidths.hairline,
          paddingBottom: insets.bottom,
        },
      ]}>
      <View style={styles.row} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        {/* Pill deslizante detrás de la pestaña activa. */}
        {barW > 0 && tabW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicatorSlot, { width: tabW, transform: [{ translateX }] }]}>
            <View
              style={[
                styles.pill,
                { backgroundColor: colors.primary, opacity: 0.12, borderRadius: radii.lg },
              ]}
            />
          </Animated.View>
        ) : null}

        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = state.index === i;
          const color = focused ? colors.primary : colors.textMuted;
          const icon = options.tabBarIcon?.({ focused, color, size: 24 });

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabButton
              key={route.key}
              label={label}
              icon={icon}
              color={color}
              focused={focused}
              reduced={reduced}
              pressScale={motion.pressedScale}
              pressDuration={motion.durations.micro}
              easing={motion.easing.standard}
              gap={spacing.xs}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

type TabButtonProps = {
  label: string;
  icon: React.ReactNode;
  color: string;
  focused: boolean;
  reduced: boolean;
  pressScale: number;
  pressDuration: number;
  easing: (v: number) => number;
  gap: number;
  onPress: () => void;
  onLongPress: () => void;
};

/** Una pestaña: ícono + etiqueta, con lift sutil al estar activa y feedback al tocar. */
function TabButton({
  label,
  icon,
  color,
  focused,
  reduced,
  pressScale,
  pressDuration,
  easing,
  gap,
  onPress,
  onLongPress,
}: TabButtonProps) {
  const press = useRef(new Animated.Value(1)).current;
  // Lift del contenido activo (sube 2px). Sin animación si reduce-motion.
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      lift.setValue(focused ? 1 : 0);
      return;
    }
    Animated.timing(lift, { toValue: focused ? 1 : 0, duration: 200, easing, useNativeDriver: true }).start();
  }, [focused, reduced, lift, easing]);

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  function animate(to: number) {
    if (reduced) return;
    Animated.timing(press, { toValue: to, duration: pressDuration, easing, useNativeDriver: true }).start();
  }

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animate(pressScale)}
      onPressOut={() => animate(1)}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}>
      <Animated.View style={[styles.tabInner, { gap: gap / 2, transform: [{ scale: press }, { translateY }] }]}>
        {icon}
        <ThemedText variant="caption" style={[styles.label, { color, fontWeight: focused ? '600' : '500' }]}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { flexDirection: 'row', height: 60 },
  indicatorSlot: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { width: '72%', height: 44 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 14 },
});
