import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EvidenceField } from '@/components/evidence-field';
import { ODT_ESTADO_LABEL } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/text-field';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { crearOrdenDeTrabajo, getMiVehiculoActual, getTelemetria } from '@/services';
import { useDriving } from '@/session';
import { useTheme } from '@/theme';
import type { FaultType, Vehicle, VehicleTelemetry, WorkOrder } from '@/types';

/** Opciones de tipo de falla (opcional). */
const FAULT_OPTIONS: { value: FaultType; label: string }[] = [
  { value: 'motor', label: 'Motor' },
  { value: 'frenos', label: 'Frenos' },
  { value: 'neumaticos', label: 'Neumáticos' },
  { value: 'electrico', label: 'Eléctrico' },
  { value: 'carroceria', label: 'Carrocería' },
  { value: 'otro', label: 'Otro' },
];

export default function ReportarScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { driving, vehicle: vehiculoSesion, via } = useDriving();
  const router = useRouter();

  // Datos que se rellenan solos (vehículo + ubicación desde GPS).
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);

  // Datos que aporta el conductor.
  const [tipoFalla, setTipoFalla] = useState<FaultType | undefined>(undefined);
  const [descripcion, setDescripcion] = useState('');
  const [evidenciaUris, setEvidenciaUris] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<WorkOrder | null>(null);

  useEffect(() => {
    // Sin vehículo asignado no hay a quién reportarle la falla.
    if (!user || !driving) return;
    let active = true;
    (async () => {
      // Vehículo AUTOMÁTICO (§4.2): la unidad de tu sesión — la tuya como
      // principal, o la que estás usando por PIN como secundario.
      const v = vehiculoSesion ?? (await getMiVehiculoActual(user));
      if (!active) return;
      setVehicle(v);
      const t = await getTelemetria(v.id);
      if (active) setTelemetry(t);
    })();
    return () => {
      active = false;
    };
  }, [user, driving, vehiculoSesion]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  async function onSubmit() {
    if (!vehicle || !telemetry || !user) return;
    setError(null);

    if (descripcion.trim().length === 0) {
      setError('Describe la falla para poder crear la ODT.');
      return;
    }
    if (evidenciaUris.length === 0) {
      setError('Adjunta al menos una foto de la falla (obligatorio).');
      return;
    }

    setSubmitting(true);
    try {
      const creada = await crearOrdenDeTrabajo({
        vehicleId: vehicle.id,
        driverId: user.id,
        descripcion,
        tipoFalla,
        ubicacionTexto: telemetry.ubicacionTexto,
        evidenciaUris,
        // Quién la creó (§3.3): titular, o secundario identificado por su PIN.
        autorVia: via === 'secundario' ? 'secundario' : 'principal',
      });
      setOrden(creada);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la ODT.');
    } finally {
      setSubmitting(false);
    }
  }

  const cargando = !vehicle || !telemetry;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Reportar una falla" />

        {!driving ? (
          <EmptyState
            title="Aún no tienes un vehículo asignado"
            description="El reporte de falla es de tu unidad. Cuando tu administrador te asigne tu vehículo, podrás crear la ODT."
          />
        ) : orden ? (
          <SuccessView orden={orden} onClose={() => router.back()} />
        ) : cargando ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}>
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              keyboardShouldPersistTaps="handled">
              <View style={{ gap: spacing.xs }}>
                <ThemedText variant="title">Nueva ODT</ThemedText>
                <ThemedText variant="body" color="textSecondary">
                  Reporta la falla de tu vehículo. Se generará una ODT (orden de trabajo) para que
                  el supervisor de tu empresa la gestione.
                </ThemedText>
              </View>

              {/* Se rellena solo (solo lectura). */}
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="caption" color="textMuted">
                  Se registra automáticamente
                </ThemedText>
                <InfoRow label="Vehículo" value={`${vehicle.marca} ${vehicle.modelo} · ${vehicle.numero}`} />
                <InfoRow label="Conductor" value={user.name} />
                <InfoRow label="Ubicación" value={telemetry.ubicacionTexto} />
              </Card>

              {/* Tipo de falla (opcional). */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="caption" color="textSecondary">
                  Tipo de falla (opcional)
                </ThemedText>
                <View style={[styles.chips, { gap: spacing.sm }]}>
                  {FAULT_OPTIONS.map((opt) => {
                    const active = tipoFalla === opt.value;
                    return (
                      <PressableScale
                        key={opt.value}
                        onPress={() => setTipoFalla(active ? undefined : opt.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors.primary : colors.surfaceSunken,
                            borderColor: active ? colors.primary : colors.border,
                            borderRadius: radii.pill,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                          },
                        ]}>
                        <ThemedText variant="caption" color={active ? 'onPrimary' : 'textSecondary'}>
                          {opt.label}
                        </ThemedText>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Descripción (obligatoria). */}
              <TextField
                label="Descripción de la falla"
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Ej. El motor se recalienta al subir pendientes…"
                multiline
                editable={!submitting}
                style={styles.textarea}
              />

              {/* Evidencia (foto obligatoria). */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="caption" color="textSecondary">
                  Evidencia (foto obligatoria)
                </ThemedText>
                <EvidenceField uris={evidenciaUris} onChange={setEvidenciaUris} />
              </View>

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}

              <Button label="Crear ODT" icon="ot" onPress={onSubmit} loading={submitting} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Vista de confirmación tras enviar la orden. */
function SuccessView({ orden, onClose }: { orden: WorkOrder; onClose: () => void }) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View style={[styles.content, styles.successCenter, { padding: spacing.lg, gap: spacing.lg }]}>
      <View
        style={[
          styles.successDot,
          { backgroundColor: colors.successSurface, borderRadius: radii.pill },
        ]}>
        <ThemedText variant="title" color="success">
          ✓
        </ThemedText>
      </View>
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <ThemedText variant="title" style={styles.center}>
          ODT creada
        </ThemedText>
        <ThemedText variant="body" color="textSecondary" style={styles.center}>
          Tu ODT {orden.id} quedó en estado “{ODT_ESTADO_LABEL[orden.estado]}”. El supervisor de tu
          empresa la revisará.
        </ThemedText>
      </View>
      <Button label="Volver" onPress={onClose} variant="secondary" />
    </View>
  );
}

/** Fila etiqueta–valor para tarjetas de solo lectura. */
function InfoRow({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.infoRow, { gap: spacing.md }]}>
      <ThemedText variant="body" color="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="body" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  successCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successDot: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
});
