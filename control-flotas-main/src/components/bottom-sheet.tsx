import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

type BottomSheetProps = {
  /** Alto aproximado de la cabecera (se ajusta solo al medirla). */
  peekHeight: number;
  /** Cabecera siempre visible (el "peek"): se corta EXACTO donde termina. */
  header?: ReactNode;
  /** Contenido que se revela al deslizar hacia arriba. */
  children: ReactNode;
  /** Proporción del alto de pantalla que ocupa expandida (0–1). */
  expandedRatio?: number;
  /** Avisa el alto real del peek (para ubicar botones flotantes encima). */
  onPeekHeight?: (h: number) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Hoja inferior deslizable (la "lengüeta" del inicio): se arrastra hacia arriba
 * para ver todo y hacia abajo para dejar el mapa protagonista (DISEÑO §1, estilo
 * Google/Apple Maps). Mide su cabecera para que, colapsada, se corte JUSTO donde
 * termina el peek (sin dejar contenido a medias). Arrastre + "snap" suave con
 * `Animated` + `PanResponder` (sin libs extra); el contenido expandido hace
 * scroll por su cuenta.
 */
export function BottomSheet({
  peekHeight,
  header,
  children,
  expandedRatio = 0.82,
  onPeekHeight,
  style,
}: BottomSheetProps) {
  const { colors, radii, spacing, shadows } = useTheme();

  const alto = Math.round(Dimensions.get('window').height * expandedRatio);

  // Alto real de la cabecera (medido). Mientras no se mide, usa `peekHeight`.
  const [headerH, setHeaderH] = useState(peekHeight);
  const colapsada = Math.max(0, alto - headerH);

  const translateY = useRef(new Animated.Value(Math.max(0, alto - peekHeight))).current;
  const inicio = useRef(0);
  const expandido = useRef(false);
  // Posición colapsada SIEMPRE actualizada. El `PanResponder` se crea una sola
  // vez, así que sus closures no ven el `colapsada` nuevo; por eso lo leemos de
  // esta ref (si no, al bajar la lengüeta quedaba más alta con la medida vieja).
  const topeRef = useRef(Math.max(0, alto - peekHeight));
  // Posición ACTUAL de la hoja, seguida por un listener. Así, al empezar a
  // arrastrar, `inicio` se lee SIN el callback asíncrono de `stopAnimation` (que
  // corría un frame tarde y hacía saltar la lengüeta: ese era el "corte").
  const posRef = useRef(topeRef.current);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      posRef.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  // Al medir la cabecera (o cambiar), coloca el corte EXACTO de inmediato (sin
  // animación → sin salto al entrar) y actualiza la ref del tope.
  useEffect(() => {
    topeRef.current = colapsada;
    if (!expandido.current) {
      translateY.setValue(colapsada);
      posRef.current = colapsada;
    }
  }, [colapsada, translateY]);

  /** Anima la hoja a una posición con una curva suave (sin overshoot → sin hueco abajo). */
  function animarA(destino: number) {
    Animated.timing(translateY, {
      toValue: destino,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  const pan = useRef(
    PanResponder.create({
      // Solo toma el gesto si es un arrastre vertical claro; un toque simple no
      // lo captura (deja pasar los taps a los controles internos).
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        inicio.current = posRef.current;
      },
      onPanResponderMove: (_e, g) => {
        const tope = topeRef.current;
        translateY.setValue(Math.min(tope, Math.max(0, inicio.current + g.dy)));
      },
      onPanResponderRelease: (_e, g) => {
        const tope = topeRef.current;
        const actual = Math.min(tope, Math.max(0, inicio.current + g.dy));
        // Decide por gesto: velocidad clara, o por la posición al soltar.
        const expandir = g.vy < -0.4 || (g.vy <= 0.4 && actual < tope / 2);
        expandido.current = expandir;
        animarA(expandir ? 0 : tope);
      },
      onPanResponderTerminate: () => {
        // Si el sistema corta el gesto, deja la hoja en un estado definido.
        animarA(expandido.current ? 0 : topeRef.current);
      },
    }),
  ).current;

  function medirHeader(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== headerH) {
      setHeaderH(h);
      onPeekHeight?.(h);
    }
  }

  return (
    <Animated.View
      style={[
        styles.sheet,
        shadows.sheet,
        {
          height: alto,
          transform: [{ translateY }],
          backgroundColor: colors.background,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}>
      {/* Cabecera (peek): zona de arrastre. Se mide para cortar exacto. */}
      <View
        onLayout={medirHeader}
        {...pan.panHandlers}
        style={{ paddingTop: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
        {header}
      </View>

      {/* Contenido revelado (scroll cuando está expandida). */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
});
