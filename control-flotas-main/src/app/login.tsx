import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { LoginBackground } from '@/components/login-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { recuperarClave } from '@/services';
import { useLoginDestino } from '@/session';
import { DEFAULT_BRAND, useReducedMotion, useTheme, useThemeController } from '@/theme';

/**
 * Marca de FOM: el tile de color de empresa con un brillo superior (dimensión) y
 * la flecha de navegación (rutas/flota). Todo el color sale del tema.
 */
function BrandMark({ size = 76, primary, onPrimary, radius }: { size?: number; primary: string; onPrimary: string; radius: number }) {
  // La flecha vive en un lienzo de 24; se escala/centra dentro del tile.
  const glyph = size * 0.5;
  const scale = glyph / 24;
  const offset = (size - glyph) / 2;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="mark-sheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={onPrimary} stopOpacity={0.22} />
          <Stop offset="0.55" stopColor={onPrimary} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} rx={radius} fill={primary} />
      <Rect x={0} y={0} width={size} height={size} rx={radius} fill="url(#mark-sheen)" />
      <G transform={`translate(${offset}, ${offset}) scale(${scale})`}>
        <Path d="M12 2 20 21l-8-4.5L4 21z" fill={onPrimary} />
      </G>
    </Svg>
  );
}

export default function LoginScreen() {
  const { colors, spacing, radii, shadows, typography } = useTheme();
  const { setBrand } = useThemeController();
  const { status, user, signIn } = useAuth();
  const reduced = useReducedMotion();
  // Destino tras validar credenciales (perfil → dashboard según rol).
  const destino = useLoginDestino();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Recuperación de clave por correo (verificación).
  const [recuperando, setRecuperando] = useState(false);
  const [recuperacion, setRecuperacion] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  // Con el teclado abierto la MARCA se repliega: así la tarjeta cabe y queda
  // centrada sola, sin saltos ni desplazamientos que la descoloquen.
  const heroA = useRef(new Animated.Value(1)).current;

  // Entrada coreografiada (logo → wordmark → tagline → tarjeta) + adornos en bucle.
  const markA = useRef(new Animated.Value(0)).current;
  const wordA = useRef(new Animated.Value(0)).current;
  const tagA = useRef(new Animated.Value(0)).current;
  const cardA = useRef(new Animated.Value(0)).current;
  // Campos del formulario: entran escalonados dentro de la tarjeta.
  const emailA = useRef(new Animated.Value(0)).current;
  const passA = useRef(new Animated.Value(0)).current;
  const btnA = useRef(new Animated.Value(0)).current;
  const footerA = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const haloA = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Con "reducir movimiento": todo aparece de una, sin desplazamiento.
    if (reduced) {
      [markA, wordA, tagA, cardA, emailA, passA, btnA, footerA].forEach((v) => v.setValue(1));
      return;
    }
    const enter = (v: Animated.Value, delay: number, duration: number) =>
      Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });

    Animated.stagger(0, [
      enter(markA, 0, 620),
      enter(wordA, 170, 560),
      enter(tagA, 300, 520),
      enter(cardA, 430, 600),
      enter(emailA, 560, 460),
      enter(passA, 620, 460),
      enter(btnA, 690, 460),
      enter(footerA, 780, 460),
    ]).start();

    const flotar = Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatA, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const latir = Animated.loop(
      Animated.sequence([
        Animated.timing(haloA, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloA, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    flotar.start();
    latir.start();
    return () => {
      flotar.stop();
      latir.stop();
    };
  }, [reduced, markA, wordA, tagA, cardA, emailA, passA, btnA, footerA, floatA, haloA]);

  // El teclado abre → la marca se repliega (y vuelve al cerrarse). Al animar su
  // ALTO, el formulario se re-centra solo en el espacio que queda: nada salta ni
  // se pasa de largo.
  useEffect(() => {
    const abrir = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const cerrar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animar = (hacia: number) =>
      Animated.timing(heroA, {
        toValue: hacia,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        // Se anima el ALTO: no puede ir por el hilo nativo.
        useNativeDriver: false,
      }).start();
    const alAbrir = Keyboard.addListener(abrir, () => animar(0));
    const alCerrar = Keyboard.addListener(cerrar, () => animar(1));
    return () => {
      alAbrir.remove();
      alCerrar.remove();
    };
  }, [heroA]);

  // El login siempre con la identidad base de la app, nunca con la marca de la
  // última empresa vista (brief §6).
  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
    }, [setBrand]),
  );

  if (status === 'signedIn' && user) {
    // Mientras se resuelve el contexto (cuenta/perfil), un loader breve.
    if (!destino) {
      return (
        <ThemedView style={[styles.root, styles.loading]}>
          <LoginBackground />
          <ActivityIndicator color={colors.primary} />
        </ThemedView>
      );
    }
    return <Redirect href={destino} />;
  }

  /** Recuperación de clave: envía el correo de verificación (Supabase o mock). */
  async function onRecuperarClave() {
    if (recuperando) return;
    setError(null);
    if (!email.trim()) {
      setError('Escribe tu email arriba y vuelve a tocar "¿Olvidaste tu clave?".');
      return;
    }
    setRecuperando(true);
    try {
      await recuperarClave(email);
      setRecuperacion('Listo: si el correo existe, te llegará un enlace para cambiar tu clave.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el correo.');
    } finally {
      setRecuperando(false);
    }
  }

  async function onSubmit() {
    if (submitting) return;
    // No se limpia el error aquí: al reintentar con el mismo mensaje, evitamos
    // que la caja de error desaparezca y reaparezca (lo que hacía saltar y
    // re-centrar todo el layout al presionar repetidamente).
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  // Interpolaciones de entrada (por elemento, para la coreografía escalonada).
  const markStyle = {
    opacity: markA,
    transform: [{ scale: markA.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
  };
  const wordStyle = {
    opacity: wordA,
    transform: [{ translateY: wordA.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  const tagStyle = {
    opacity: tagA,
    transform: [{ translateY: tagA.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
  const cardStyle = {
    opacity: cardA,
    transform: [{ translateY: cardA.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
  };
  // Entrada de cada fila del formulario (fade + leve subida).
  const rowStyle = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });
  const floatY = floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const haloScale = haloA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const haloOpacity = haloA.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.08] });

  return (
    <ThemedView style={styles.root}>
      <LoginBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.xxl }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}>
          {/* Marca + bienvenida (entrada escalonada). Se repliega con el teclado. */}
          <Animated.View
            style={[
              styles.hero,
              {
                gap: spacing.lg,
                marginTop: spacing.xxl,
                opacity: heroA,
                maxHeight: heroA.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }),
              },
            ]}>
            <Animated.View
              style={[styles.markWrap, markStyle]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              {/* Halo latente detrás del logo (decorativo: el nombre "FOM" ya lo anuncia). */}
              <Animated.View
                style={[
                  styles.halo,
                  { backgroundColor: colors.primary, borderRadius: radii.xl + 12, opacity: haloOpacity, transform: [{ scale: haloScale }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.brandMark,
                  shadows.floating,
                  { borderRadius: radii.xl, transform: [{ translateY: floatY }] },
                ]}>
                <BrandMark size={76} primary={colors.primary} onPrimary={colors.onPrimary} radius={radii.xl} />
              </Animated.View>
            </Animated.View>

            <View style={{ gap: spacing.xs, alignItems: 'center' }}>
              <Animated.View style={wordStyle}>
                <ThemedText variant="display" style={[styles.center, styles.wordmark]}>
                  FOM
                </ThemedText>
              </Animated.View>
              <Animated.View style={tagStyle}>
                <ThemedText variant="overline" color="textSecondary" style={styles.center}>
                  Fleet Operations & Maintenance
                </ThemedText>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Formulario en tarjeta elevada */}
          <Animated.View
            style={[
              styles.card,
              shadows.floating,
              { backgroundColor: colors.surfaceElevated, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg },
              cardStyle,
            ]}>
            <View style={{ gap: 2 }}>
              <ThemedText
                variant="subtitle"
                style={{ fontSize: typography.fontSize.xl, lineHeight: typography.lineHeight.xl }}>
                Inicia sesión
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Bienvenido de vuelta a tu panel
              </ThemedText>
            </View>

            <View style={{ gap: spacing.md }}>
              <Animated.View style={rowStyle(emailA)}>
                <TextField
                  label="Correo"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tucorreo@empresa.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!submitting}
                />
              </Animated.View>
              <Animated.View style={rowStyle(passA)}>
                <TextField
                  ref={passwordRef}
                  label="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  editable={!submitting}
                />
              </Animated.View>

              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: colors.dangerSurface, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
                  ]}>
                  <View style={[styles.errorDot, { backgroundColor: colors.danger }]} />
                  <ThemedText variant="caption" color="danger" style={styles.flex1}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}

              <Animated.View style={rowStyle(btnA)}>
                <Button label="Entrar" onPress={onSubmit} loading={submitting} disabled={!canSubmit} style={{ marginTop: spacing.xs }} />
              </Animated.View>

              {/* Cambio de clave con verificación por correo (para todos). */}
              <Animated.View style={rowStyle(btnA)}>
                {recuperacion ? (
                  <ThemedText variant="caption" color="success" style={styles.center}>
                    {recuperacion}
                  </ThemedText>
                ) : (
                  <Pressable
                    onPress={onRecuperarClave}
                    disabled={recuperando}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Recuperar mi clave por correo">
                    <ThemedText variant="caption" color="primary" style={styles.center}>
                      {recuperando ? 'Enviando correo…' : '¿Olvidaste tu clave? Te enviamos un correo'}
                    </ThemedText>
                  </Pressable>
                )}
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View style={rowStyle(footerA)}>
            <ThemedText variant="caption" color="textMuted" style={styles.center}>
              Gestión de flotas · multiempresa · en una sola app
            </ThemedText>
          </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  // `overflow: hidden` para que al replegarse con el teclado no se desborde.
  hero: { alignItems: 'center', overflow: 'hidden' },
  markWrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 96,
    height: 96,
  },
  brandMark: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wordmark de marca: sale de la escala display, con más presencia y tracking
  // ajustado (identidad, no texto de cuerpo).
  wordmark: { fontSize: 46, lineHeight: 50, letterSpacing: -1.2 },
  card: {
    alignSelf: 'stretch',
  },
  center: { textAlign: 'center' },
  loading: { alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorDot: { width: 8, height: 8, borderRadius: 4 },
  flex1: { flex: 1 },
});
