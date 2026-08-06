import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MapaVehiculo } from '@/components/map-vehiculo';
import { PressableScale } from '@/components/pressable-scale';
import { PulseDot } from '@/components/pulse-dot';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  cancelarSOS,
  cerrarEmergencia,
  definirTipoEmergencia,
  enviarMensajeEmergencia,
  enviarSOS,
  getEmergenciaActiva,
  getMiVehiculoActual,
  getTelemetria,
} from '@/services';
import { useTheme } from '@/theme';
import type { Emergencia, EmergenciaTipo, Vehicle, VehicleTelemetry } from '@/types';
import { formatHora } from '@/utils/date';

/** Tipos de emergencia que puede elegir el conductor. */
const TIPOS: { value: EmergenciaTipo; label: string }[] = [
  { value: 'accidente', label: 'Accidente' },
  { value: 'mecanica', label: 'Falla mecánica' },
  { value: 'salud', label: 'Salud' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'otro', label: 'Otro' },
];

/**
 * EMERGENCIA (SOS) de FOM-DRIVER. Sigue el flujo del documento: se activa con un
 * toque (compartiendo ubicación en vivo), el operador contacta por el
 * seguimiento, el conductor elige el tipo, recibe instrucciones y el caso se
 * cierra al resolverse. La emergencia nunca depende del chip: la seguridad
 * primero.
 */
export default function EmergenciaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [emergencia, setEmergencia] = useState<Emergencia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [v, activa] = await Promise.all([getMiVehiculoActual(user), getEmergenciaActiva(user)]);
      if (!active) return;
      setVehicle(v);
      setEmergencia(activa);
      const t = await getTelemetria(v.id);
      if (!active) return;
      setTelemetry(t);
      setCargando(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  async function pedirAyuda() {
    if (!vehicle || !telemetry || !user) return;
    setOcupado(true);
    try {
      const creada = await enviarSOS({
        driverId: user.id,
        vehicleId: vehicle.id,
        ubicacionTexto: telemetry.ubicacionTexto,
      });
      setEmergencia(creada);
    } finally {
      setOcupado(false);
    }
  }

  async function elegirTipo(tipo: EmergenciaTipo) {
    if (!emergencia) return;
    const r = await definirTipoEmergencia(emergencia.id, tipo);
    setEmergencia(r);
  }

  async function enviar() {
    const limpio = texto.trim();
    if (!emergencia || limpio.length === 0) return;
    setTexto('');
    const r = await enviarMensajeEmergencia(emergencia.id, limpio);
    setEmergencia(r);
  }

  async function cerrar() {
    if (!emergencia) return;
    setOcupado(true);
    try {
      const r = await cerrarEmergencia(emergencia.id);
      setEmergencia(r); // queda 'atendida' → vista de caso cerrado
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar() {
    if (!emergencia) return;
    setOcupado(true);
    try {
      await cancelarSOS(emergencia.id);
      router.back();
    } finally {
      setOcupado(false);
    }
  }

  function llamarCentral() {
    if (emergencia?.telefonoCentral) Linking.openURL(`tel:${emergencia.telefonoCentral}`);
  }

  const activa = emergencia?.estado === 'activa';
  const cerrada = emergencia?.estado === 'atendida';

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Emergencia" />

        {cargando ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : cerrada ? (
          // ───────────── Caso cerrado ─────────────
          <View style={[styles.centerFill, { padding: spacing.xl, gap: spacing.lg }]}>
            <View style={[styles.bigDot, { backgroundColor: colors.successSurface, borderRadius: radii.pill }]}>
              <ThemedText variant="title" color="success">
                ✓
              </ThemedText>
            </View>
            <View style={{ gap: spacing.xs, alignItems: 'center' }}>
              <ThemedText variant="title" style={styles.center}>
                Caso cerrado
              </ThemedText>
              <ThemedText variant="body" color="textSecondary" style={styles.center}>
                Nos alegra que estés bien. Cuídate y sigue con precaución.
              </ThemedText>
            </View>
            <Button label="Volver al inicio" onPress={() => router.navigate('/')} />
          </View>
        ) : !activa ? (
          // ───────────── Pedir ayuda ─────────────
          <View style={[styles.centerFill, { padding: spacing.xl, gap: spacing.xl }]}>
            <View style={[styles.sosBig, { backgroundColor: colors.danger }]}>
              <ThemedText variant="title" style={{ color: colors.onDanger }}>
                SOS
              </ThemedText>
            </View>
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="title" color="danger" style={styles.center}>
                ¿Necesitas ayuda?
              </ThemedText>
              <ThemedText variant="body" color="textSecondary" style={styles.center}>
                Al pedir ayuda avisamos a tu operador y compartimos tu ubicación en vivo. Luego nos
                dices qué pasa.
              </ThemedText>
            </View>
            <View style={styles.stretch}>
              <Button label="Pedir ayuda ahora" onPress={pedirAyuda} loading={ocupado} />
            </View>
            <ThemedText variant="caption" color="textMuted" style={styles.center}>
              Úsalo solo ante una emergencia real.
            </ThemedText>
          </View>
        ) : (
          // ───────────── Activa: seguimiento en vivo ─────────────
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled">
              {/* Estado */}
              <View style={[styles.inline, { gap: spacing.sm }]}>
                <PulseDot color={colors.danger} size={12} active />
                <ThemedText variant="title">Ayuda en camino</ThemedText>
              </View>

              {/* Ubicación en vivo */}
              <MapaVehiculo
                vehicleName={vehicle ? `${vehicle.marca} ${vehicle.modelo}` : user.name}
                live
                markerColor={colors.danger}
                style={[styles.map, { borderRadius: radii.lg }]}
              />
              <ThemedText variant="caption" color="textMuted" style={styles.center}>
                Compartiendo tu ubicación en vivo · {emergencia?.ubicacionTexto}
              </ThemedText>

              {/* Tipo (si aún no se definió) */}
              {emergencia && emergencia.tipo === null ? (
                <Card style={{ gap: spacing.sm }}>
                  <ThemedText variant="subtitle">¿Qué tipo de emergencia es?</ThemedText>
                  <View style={[styles.chips, { gap: spacing.sm }]}>
                    {TIPOS.map((opt) => (
                      <PressableScale
                        key={opt.value}
                        onPress={() => elegirTipo(opt.value)}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                            borderRadius: radii.pill,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                          },
                        ]}>
                        <ThemedText variant="caption" color="textSecondary">
                          {opt.label}
                        </ThemedText>
                      </PressableScale>
                    ))}
                  </View>
                </Card>
              ) : null}

              {/* Seguimiento */}
              <View style={{ gap: spacing.sm }}>
                {emergencia?.seguimiento.map((m) => {
                  if (m.autor === 'sistema') {
                    return (
                      <ThemedText key={m.id} variant="caption" color="textMuted" style={styles.center}>
                        {m.texto}
                      </ThemedText>
                    );
                  }
                  const propio = m.autor === 'conductor';
                  return (
                    <View key={m.id} style={[styles.bubbleRow, propio ? styles.right : styles.left]}>
                      <View
                        style={[
                          styles.bubble,
                          {
                            backgroundColor: propio ? colors.primary : colors.surface,
                            borderColor: colors.border,
                            borderRadius: radii.lg,
                            padding: spacing.md,
                          },
                        ]}>
                        <ThemedText variant="body" style={{ color: propio ? colors.onPrimary : colors.text }}>
                          {m.texto}
                        </ThemedText>
                        <ThemedText
                          variant="overline"
                          style={{
                            color: propio ? colors.onPrimary : colors.textMuted,
                            opacity: propio ? 0.8 : 1,
                            marginTop: 4,
                            textAlign: 'right',
                          }}>
                          {formatHora(m.hora)}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Acciones */}
              <View style={{ gap: spacing.sm }}>
                <Button label="Llamar a la central" onPress={llamarCentral} />
                <Button label="Marcar como resuelto" variant="secondary" onPress={cerrar} loading={ocupado} />
                <Pressable onPress={cancelar} hitSlop={8} style={styles.linkCenter}>
                  <ThemedText variant="button" color="danger">
                    Cancelar (falsa alarma)
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>

            {/* Barra de envío al operador */}
            <View
              style={[
                styles.inputBar,
                { padding: spacing.md, gap: spacing.sm, borderTopColor: colors.border, backgroundColor: colors.background },
              ]}>
              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder="Escríbele al operador…"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.lg,
                  },
                ]}
                multiline
                onSubmitEditing={enviar}
                returnKeyType="send"
              />
              <PressableScale
                onPress={enviar}
                disabled={texto.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje"
                accessibilityState={{ disabled: texto.trim().length === 0 }}
                style={[
                  styles.send,
                  {
                    backgroundColor: texto.trim().length === 0 ? colors.border : colors.primary,
                    borderRadius: radii.pill,
                  },
                ]}>
                <ThemedText variant="button" style={{ color: colors.onPrimary }}>
                  ➤
                </ThemedText>
              </PressableScale>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  center: { textAlign: 'center' },
  linkCenter: { alignSelf: 'center', paddingVertical: 4 },
  stretch: { alignSelf: 'stretch' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 16,
  },
  sosBig: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigDot: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: { height: 220, borderWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: StyleSheet.hairlineWidth },
  bubbleRow: { flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderWidth: StyleSheet.hairlineWidth },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  send: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
