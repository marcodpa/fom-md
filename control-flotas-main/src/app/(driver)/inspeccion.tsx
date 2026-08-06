import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InspectionItem } from '@/components/inspection-item';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressBar } from '@/components/progress-bar';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDriving } from '@/session';
import {
  enviarInspeccion,
  getMiVehiculoActual,
  getPlantillaInspeccion,
  getTelemetria,
  solicitarOtraUnidad,
} from '@/services';
import { useTheme } from '@/theme';
import type {
  InspeccionItem as InspeccionItemType,
  InspeccionItemRespuesta,
  InspeccionPlantilla,
  ResultadoInspeccion,
  Vehicle,
  VehicleTelemetry,
} from '@/types';

/**
 * INSPECCIÓN diaria (FOM-02 §4.1): el chequeo del vehículo antes de arrancar.
 * Tres respuestas por ítem — ✅ Conforme / ⚠️ Observación / ❌ Falla (con la
 * pregunta "¿crear ODT?" en fallas no críticas). Si la falla es de un ítem
 * CRÍTICO, la app bloquea la salida y genera la ODT automáticamente (regla
 * nuestra que se conserva). Guarda con o sin señal (offline-first).
 */
export default function InspeccionScreen() {
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const { driving, vehicle: vehiculoSesion } = useDriving();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [plantilla, setPlantilla] = useState<InspeccionPlantilla | null>(null);

  // Respuestas por id de ítem (controladas aquí).
  const [respuestas, setRespuestas] = useState<Record<string, InspeccionItemRespuesta>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<ResultadoInspeccion | null>(null);

  useEffect(() => {
    // Sin vehículo asignado no se carga nada (se muestra el aviso).
    if (!user || !driving) return;
    let active = true;
    (async () => {
      // La unidad de la sesión (principal, o secundario por PIN — §4.3: el
      // secundario también puede hacer la inspección de ESA unidad).
      const v = vehiculoSesion ?? (await getMiVehiculoActual(user));
      if (!active) return;
      setVehicle(v);
      const [t, p] = await Promise.all([getTelemetria(v.id), getPlantillaInspeccion(v.tipo)]);
      if (!active) return;
      setTelemetry(t);
      setPlantilla(p);
    })();
    return () => {
      active = false;
    };
  }, [user, driving, vehiculoSesion]);

  // Lista plana de ítems (para contar y validar).
  const items = useMemo<InspeccionItemType[]>(
    () => plantilla?.categorias.flatMap((c) => c.items) ?? [],
    [plantilla],
  );

  const respondidos = Object.keys(respuestas).length;
  const total = items.length;
  const progreso = total > 0 ? (respondidos / total) * 100 : 0;
  const fallas = Object.values(respuestas).filter((r) => r.estado === 'falla').length;

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  function responder(respuesta: InspeccionItemRespuesta) {
    setRespuestas((prev) => ({ ...prev, [respuesta.itemId]: respuesta }));
  }

  async function onSubmit() {
    if (!vehicle || !telemetry || !user) return;
    setError(null);

    // Todos los ítems deben estar respondidos.
    const faltan = total - respondidos;
    if (faltan > 0) {
      setError(`Responde todos los ítems antes de enviar (faltan ${faltan}).`);
      return;
    }

    // Las fallas en ítems críticos exigen foto (se vuelven ODT).
    const criticasSinFoto = items.filter(
      (it) =>
        it.critico &&
        respuestas[it.id]?.estado === 'falla' &&
        !(respuestas[it.id]?.evidenciaUris?.length),
    );
    if (criticasSinFoto.length > 0) {
      setError('Adjunta una foto en las fallas críticas para generar la ODT.');
      return;
    }

    // En las fallas NO críticas hay que responder "¿crear ODT?" (§4.1).
    const sinDecision = items.filter(
      (it) =>
        !it.critico &&
        respuestas[it.id]?.estado === 'falla' &&
        respuestas[it.id]?.crearOdt === undefined,
    );
    if (sinDecision.length > 0) {
      setError('En cada falla, responde si quieres crear la ODT o solo registrarla.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await enviarInspeccion({
        vehicleId: vehicle.id,
        driverId: user.id,
        ubicacionTexto: telemetry.ubicacionTexto,
        respuestas: Object.values(respuestas),
      });
      setResultado(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la inspección.');
    } finally {
      setSubmitting(false);
    }
  }

  const cargando = !vehicle || !telemetry || !plantilla;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Barra superior */}
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View>
            <ThemedText variant="overline" color="textMuted">
              FOM · Conductor
            </ThemedText>
            <ThemedText variant="title">Inspección</ThemedText>
          </View>
        </View>

        {!driving ? (
          <EmptyState
            title="Aún no tienes un vehículo asignado"
            description="La inspección es de tu unidad. Cuando tu administrador te asigne tu vehículo, cargamos su checklist para que la hagas antes de salir."
          />
        ) : resultado ? (
          <ResultadoView
            resultado={resultado}
            onInicio={() => router.navigate('/')}
          />
        ) : cargando ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton width="90%" height={14} />
            <Card style={{ gap: spacing.sm }}>
              <Skeleton width="35%" height={12} />
              <Skeleton width="70%" height={16} />
            </Card>
            <Skeleton height={8} radius={4} />
            {[0, 1].map((i) => (
              <Card key={i} style={{ gap: spacing.sm }}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="85%" height={14} />
              </Card>
            ))}
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}>
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={{ gap: spacing.xs }}>
                <ThemedText variant="body" color="textSecondary">
                  Revisa tu unidad antes de salir. Si algo crítico falla, detenemos la salida y
                  avisamos a tu empresa. Que llegues bien.
                </ThemedText>
              </View>

              {/* Vehículo (solo lectura) */}
              <Card style={{ gap: spacing.xs }}>
                <ThemedText variant="caption" color="textMuted">
                  Vehículo
                </ThemedText>
                <ThemedText variant="subtitle">
                  {`${vehicle.marca} ${vehicle.modelo} · ${vehicle.numero}`}
                </ThemedText>
              </Card>

              {/* Progreso */}
              <View style={{ gap: spacing.sm }}>
                <View style={styles.progressRow}>
                  <ThemedText variant="caption" color="textSecondary">
                    {`${respondidos} de ${total} revisados`}
                  </ThemedText>
                  {fallas > 0 ? (
                    <ThemedText variant="caption" color="danger">
                      {`${fallas} con falla`}
                    </ThemedText>
                  ) : null}
                </View>
                <ProgressBar
                  value={progreso}
                  color={fallas > 0 ? colors.warning : colors.success}
                />
              </View>

              {/* Checklist por categorías */}
              {plantilla.categorias.map((categoria) => (
                <View key={categoria.nombre} style={{ gap: spacing.xs }}>
                  <ThemedText variant="overline" color="textMuted">
                    {categoria.nombre}
                  </ThemedText>
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {categoria.items.map((item, i) => (
                      <View key={item.id}>
                        {i > 0 ? (
                          <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        ) : null}
                        <InspectionItem
                          item={item}
                          respuesta={respuestas[item.id]}
                          onChange={responder}
                        />
                      </View>
                    ))}
                  </Card>
                </View>
              ))}

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}

              <Button
                label="Enviar inspección"
                onPress={onSubmit}
                loading={submitting}
                disabled={respondidos === 0}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Vista de resultado: aprobada (puede salir) o bloqueada (falla crítica + OT). */
function ResultadoView({
  resultado,
  onInicio,
}: {
  resultado: ResultadoInspeccion;
  onInicio: () => void;
}) {
  const { colors, spacing, radii } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const bloqueada = resultado.estado === 'bloqueada';
  const conObservaciones = resultado.estado === 'aprobada_con_observaciones';

  const accent = bloqueada ? colors.danger : conObservaciones ? colors.warning : colors.success;
  const surface = bloqueada
    ? colors.dangerSurface
    : conObservaciones
      ? colors.warningSurface
      : colors.successSurface;
  const titulo = bloqueada
    ? 'Salida bloqueada'
    : conObservaciones
      ? 'Aprobada con observaciones'
      : 'Inspección aprobada';
  const detalle = bloqueada
    ? 'Encontramos una falla crítica. Por tu seguridad, no puedes salir. Avisamos a tu supervisor para reasignarte otra unidad o esperar la reparación.'
    : conObservaciones
      ? 'Puedes salir, pero registramos observaciones para darles seguimiento. Maneja con cuidado y que llegues bien.'
      : 'Tu unidad está lista. Maneja con cuidado y que llegues bien.';

  async function pedirOtraUnidad() {
    await solicitarOtraUnidad();
    Alert.alert('Solicitud enviada', 'Tu supervisor recibió la solicitud de otra unidad.');
  }

  function esperarReparacion() {
    Alert.alert('Entendido', 'Te avisaremos cuando tu unidad esté reparada y lista.');
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
      <View style={styles.resultCenter}>
        <View style={[styles.resultDot, { backgroundColor: surface, borderRadius: radii.pill }]}>
          <ThemedText variant="title" style={{ color: accent }}>
            {bloqueada ? '!' : '✓'}
          </ThemedText>
        </View>
        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <ThemedText variant="title" style={styles.center}>
            {titulo}
          </ThemedText>
          <ThemedText variant="body" color="textSecondary" style={styles.center}>
            {detalle}
          </ThemedText>
        </View>
      </View>

      {/* ODT generadas por las fallas críticas */}
      {resultado.ordenesGeneradas.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="overline" color="textMuted">
            {`ODT generadas (${resultado.ordenesGeneradas.length})`}
          </ThemedText>
          {resultado.ordenesGeneradas.map((ot) => (
            /* Tocar la ODT entra a verla por dentro (directriz PDF-4). */
            <PressableScale
              key={ot.id}
              onPress={() =>
                router.navigate({ pathname: '/orden', params: { id: ot.id, companyId: user?.companyId ?? '' } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Abrir la ODT ${ot.id}`}>
              <Card style={{ gap: spacing.xs }}>
                <View style={styles.progressRow}>
                  <ThemedText variant="subtitle">{ot.id}</ThemedText>
                  <OTStatusBadge estado={ot.estado} />
                </View>
                <ThemedText variant="caption" color="textSecondary">
                  {ot.descripcion}
                </ThemedText>
                <ThemedText variant="caption" color="primary">
                  Tócala para verla por dentro
                </ThemedText>
              </Card>
            </PressableScale>
          ))}
        </View>
      ) : null}

      {/* Al bloquear: reasignar o esperar */}
      {bloqueada ? (
        <View style={{ gap: spacing.sm }}>
          <Button label="Pedir otra unidad" onPress={pedirOtraUnidad} />
          <Button label="Esperar reparación" variant="secondary" onPress={esperarReparacion} />
        </View>
      ) : null}

      <Button label="Ir al inicio" onPress={onInicio} variant={bloqueada ? 'secondary' : 'primary'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  resultCenter: {
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  resultDot: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
