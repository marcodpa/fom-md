import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { AnimatedNumber } from '@/components/animated-number';
import { BottomSheet } from '@/components/bottom-sheet';
import { Card } from '@/components/card';
import { HomeActionCard } from '@/components/home-action-card';
import { MapaVehiculo } from '@/components/map-vehiculo';
import { MetricCard } from '@/components/metric-card';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { PulseDot } from '@/components/pulse-dot';
import { ScoreRing } from '@/components/score-ring';
import { TabIcon } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDriving } from '@/session';
import {
  getEmergenciaActiva,
  getInspeccionDelDia,
  getMiScore,
  getMiVehiculoActual,
  getPosicionVehiculo,
  getResumenAvisos,
  getTelemetria,
} from '@/services';
import { DEFAULT_BRAND, useReducedMotion, useTheme, useThemeController, type ColorTokens } from '@/theme';
import type {
  AlertaSeveridad,
  DriverScore,
  Emergencia,
  InspeccionDiaria,
  LatLng,
  ResumenAvisos,
  ScoreRange,
  Vehicle,
  VehicleTelemetry,
} from '@/types';

/** Alto aproximado de la lengüeta colapsada (para ubicar los botones flotantes). */
const PEEK = 96;

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
function primerNombre(nombre: string): string {
  return nombre.split(' ')[0];
}
function horaCorta(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// Telemetría → color del tema.
function rangoColor(rango: ScoreRange): keyof ColorTokens {
  if (rango === 'verde') return 'success';
  if (rango === 'amarillo') return 'warning';
  return 'danger';
}
function mensajeManejo(rango: ScoreRange): string {
  if (rango === 'verde') return 'Vas manejando seguro. Sigue así.';
  if (rango === 'amarillo') return 'Vas bien, cuida las frenadas.';
  return 'Maneja con más calma hoy. Tu seguridad es lo primero.';
}
/** Color de un nivel 0–100 % (combustible/aceite): rojo bajo, amarillo medio, verde bien. */
function nivelColor(pct: number): keyof ColorTokens {
  if (pct < 15) return 'danger';
  if (pct < 35) return 'warning';
  return 'success';
}
function tempColor(c: number): keyof ColorTokens {
  if (c >= 105) return 'danger';
  if (c >= 98) return 'warning';
  return 'text';
}

/**
 * INICIO de FOM-DRIVER. Al entrar (con chip) ES la vista de conducción: el mapa
 * a pantalla completa manda, con la emergencia flotando encima y una lengüeta
 * deslizable abajo con TODO (telemetría, índice de manejo, jornada, ficha),
 * estilo Google/Apple Maps (DISEÑO §1). Sin chip, muestra solo lo que no
 * depende del vehículo. Todo pasa por la capa de servicios (mock con «TODO API»).
 */
export default function InicioScreen() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const router = useRouter();

  const { driving, vehicle: vehiculoSesion, via } = useDriving();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleCoords, setVehicleCoords] = useState<LatLng | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [score, setScore] = useState<DriverScore | null>(null);
  const [inspeccion, setInspeccion] = useState<InspeccionDiaria | null>(null);
  const [avisos, setAvisos] = useState<ResumenAvisos | null>(null);
  const [emergenciaActiva, setEmergenciaActiva] = useState<Emergencia | null>(null);
  const [peekH, setPeekH] = useState(PEEK);

  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
      let active = true;
      getEmergenciaActiva(user ?? undefined).then((e) => {
        if (active) setEmergenciaActiva(e);
      });
      getInspeccionDelDia(user ?? undefined).then((insp) => {
        if (active) setInspeccion(insp);
      });
      return () => {
        active = false;
      };
    }, [setBrand, user]),
  );

  // Carga de una vez lo propio del vehículo/desempeño (no cambia al volver a la
  // pantalla). La inspección, el próximo viaje y la emergencia se cargan y
  // refrescan en el useFocusEffect de arriba; aquí NO se repiten (antes se pedían
  // dos veces al montar).
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [vLegado, avs, sc] = await Promise.all([
        getMiVehiculoActual(user),
        getResumenAvisos(user),
        getMiScore(user.id),
      ]);
      if (!active) return;
      // La sesión de conducción (principal / secundario por PIN, §3.5) manda;
      // el vehículo legado queda de respaldo para los conductores del modelo viejo.
      const v = vehiculoSesion ?? vLegado;
      setVehicle(v);
      setAvisos(avs);
      setScore(sc);
      const [t, pos] = await Promise.all([getTelemetria(v.id), getPosicionVehiculo(v.id)]);
      if (!active) return;
      setTelemetry(t);
      setVehicleCoords(pos);
    })();
    return () => {
      active = false;
    };
  }, [user, vehiculoSesion]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const enMarcha = telemetry?.estado === 'en_marcha';
  const fabBottom = peekH + 12;

  function irAEmergencia() {
    router.navigate('/emergencia');
  }
  function colorAlerta(sev: AlertaSeveridad): string {
    if (sev === 'critica') return colors.danger;
    if (sev === 'advertencia') return colors.warning;
    return colors.info;
  }
  const inspeccionVista = inspeccion
    ? {
        pendiente: { accent: colors.warning, subtitle: `Complétala antes de salir · ${inspeccion.totalItems} ítems`, right: 'Hacer' },
        aprobada: { accent: colors.success, subtitle: 'Aprobada · lista para salir', right: 'Ver' },
        aprobada_con_observaciones: { accent: colors.success, subtitle: 'Aprobada con observaciones', right: 'Ver' },
        bloqueada: { accent: colors.danger, subtitle: 'Falla crítica · salida bloqueada', right: 'Ver' },
      }[inspeccion.estado]
    : null;

  const totalAvisos = avisos ? avisos.alertasNoLeidas : 0;
  const alertaAccent = avisos?.ultimaAlerta ? colorAlerta(avisos.ultimaAlerta.severidad) : colors.textMuted;

  // ───────── SIN VEHÍCULO ASIGNADO ──────────
  //  Misma vista que la de cualquier conductor (franja + mapa a pantalla
  //  completa + lengüeta), pero SIN nada del vehículo: el mapa muestra solo tu
  //  ubicación y la lengüeta lleva el aviso en lugar de la telemetría. La
  //  emergencia flota dentro del mapa, en su sitio de siempre. "Mi perfil" y
  //  "Mantenimiento y alertas" NO van aquí: viven en sus pestañas.
  if (!driving) {
    return (
      <ThemedView style={styles.root}>
        {/* Franja superior fija (idéntica a la vista con vehículo). */}
        <SafeAreaView edges={['top']} style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
            <View style={styles.flex1}>
              <ThemedText variant="overline" color="textMuted">
                {saludo()}
              </ThemedText>
              <ThemedText variant="subtitle">{primerNombre(user.name)}</ThemedText>
            </View>
            <View style={[styles.inline, styles.actions, { gap: spacing.sm }]}>
              {esAdmin(user) ? (
                <PillButton label="Panel" tone="primary" onPress={() => router.navigate(esMultiempresa(user) ? '/admin' : '/panel')} />
              ) : null}
            </View>
          </View>
        </SafeAreaView>

        {/* Mapa protagonista a pantalla completa: SOLO tu ubicación (no hay
            unidad que mostrar). El SOS flota dentro, en su posición de siempre. */}
        <View style={styles.mapArea}>
          <MapaVehiculo soloUsuario hideOverlays style={styles.mapFill} />

          <PressableScale
            onPress={irAEmergencia}
            style={[styles.sosFab, { bottom: fabBottom }]}
            accessibilityRole="button"
            accessibilityLabel={emergenciaActiva ? 'Emergencia activa: ver estado' : 'Pedir ayuda de emergencia (SOS)'}>
            <View style={[styles.fabCircle, shadows.floating, { backgroundColor: colors.danger, borderColor: colors.onDanger }]}>
              {emergenciaActiva ? (
                <PulseDot color={colors.onDanger} size={16} active />
              ) : (
                <ThemedText style={[styles.sosText, { color: colors.onDanger }]}>SOS</ThemedText>
              )}
            </View>
          </PressableScale>
        </View>

        {/* Lengüeta: el aviso en lugar de la telemetría del vehículo. */}
        <BottomSheet
          peekHeight={PEEK}
          onPeekHeight={setPeekH}
          header={
            <View style={styles.peekRow}>
              <View style={[styles.inline, { gap: spacing.sm }]}>
                <View style={[styles.statusChip, { backgroundColor: colors.surfaceSunken, borderRadius: radii.pill }]}>
                  <PulseDot color={colors.textMuted} active={false} />
                  <ThemedText variant="caption" color="textMuted" style={styles.chipText}>
                    Sin unidad
                  </ThemedText>
                </View>
                <ThemedText variant="caption" color="textMuted">
                  Aún sin asignar
                </ThemedText>
              </View>
            </View>
          }>
          <Card style={{ gap: spacing.xs }}>
            <ThemedText variant="subtitle">Aún no tienes un vehículo asignado</ThemedText>
            <ThemedText variant="body" color="textSecondary">
              Avísale a tu administrador para que te asigne tu unidad. Al asignártela verás su
              monitoreo, tu inspección y su telemetría en vivo. La emergencia siempre está
              disponible.
            </ThemedText>
          </Card>
        </BottomSheet>
      </ThemedView>
    );
  }

  // Con chip pero aún cargando el vehículo: loader (evita el flash de "sin chip").
  if (!vehicle) {
    return (
      <ThemedView style={[styles.root, styles.loaderCenter]}>
        <ActivityIndicator color={colors.primary} />
      </ThemedView>
    );
  }

  // ─────────────────── CON CHIP: franja + mapa + lengüeta ─────────────────────
  return (
    <ThemedView style={styles.root}>
      {/* Franja superior fija (identidad + acciones). El mapa NO tapa la barra
          de estado del teléfono: queda debajo de esta franja. */}
      <SafeAreaView edges={['top']} style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              {saludo()}
            </ThemedText>
            <ThemedText variant="subtitle">{primerNombre(user.name)}</ThemedText>
          </View>
          <View style={[styles.inline, styles.actions, { gap: spacing.sm }]}>
            {esAdmin(user) ? (
              <PillButton label="Panel" tone="primary" onPress={() => router.navigate(esMultiempresa(user) ? '/admin' : '/panel')} />
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Mapa (protagonista) entre la franja y la lengüeta. Con la posición del
          vehículo del GPS muestra DOS puntos: la unidad + tu ubicación (§8-8). */}
      <View style={styles.mapArea}>
        <MapaVehiculo
          vehicleName={`${vehicle.marca} ${vehicle.modelo}`}
          live={enMarcha}
          markerColor={enMarcha ? colors.success : colors.textMuted}
          vehicleCoords={vehicleCoords}
          hideOverlays
          style={styles.mapFill}
        />

        {/* Uso temporal por PIN (§4.3): se ve de un vistazo a qué título conduces. */}
        {via === 'secundario' ? (
          <View style={[styles.viaPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <ThemedText variant="overline" color="info">
              {`USANDO ${vehicle.alias ?? vehicle.numero} · PIN`}
            </ThemedText>
          </View>
        ) : null}

        {/* Reportar falla: píldora con ícono + texto (acción prioritaria). */}
        <PressableScale
          onPress={() => router.navigate('/reportar')}
          style={[styles.reportFab, { bottom: fabBottom }]}
          accessibilityRole="button"
          accessibilityLabel="Reportar una falla">
          <View style={[styles.reportPill, shadows.floating, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <AlertTriangle color={colors.warning} />
            <ThemedText variant="button">Reportar una falla</ThemedText>
          </View>
        </PressableScale>

        {/* Emergencia: SOS flotante a la derecha. */}
        <PressableScale
          onPress={irAEmergencia}
          style={[styles.sosFab, { bottom: fabBottom }]}
          accessibilityRole="button"
          accessibilityLabel={emergenciaActiva ? 'Emergencia activa: ver estado' : 'Pedir ayuda de emergencia (SOS)'}>
          <View style={[styles.fabCircle, shadows.floating, { backgroundColor: colors.danger, borderColor: colors.onDanger }]}>
            {emergenciaActiva ? (
              <PulseDot color={colors.onDanger} size={16} active />
            ) : (
              <ThemedText style={[styles.sosText, { color: colors.onDanger }]}>SOS</ThemedText>
            )}
          </View>
        </PressableScale>
      </View>

      {/* Lengüeta deslizable con TODA la vista de conducción. */}
      <BottomSheet
        peekHeight={PEEK}
        onPeekHeight={setPeekH}
        header={
          <View style={styles.peekRow}>
            <View style={[styles.inline, { gap: spacing.sm }]}>
              {/* Estado como chip con tinte del color (en marcha = verde). */}
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: enMarcha ? colors.successSurface : colors.surfaceSunken, borderRadius: radii.pill },
                ]}>
                <PulseDot color={enMarcha ? colors.success : colors.textMuted} active={enMarcha} />
                <ThemedText variant="caption" color={enMarcha ? 'success' : 'textMuted'} style={styles.chipText}>
                  {enMarcha ? 'En marcha' : 'Parada'}
                </ThemedText>
              </View>
              <ThemedText variant="caption" color="textMuted">
                {vehicle.numero}
              </ThemedText>
            </View>
            <View style={[styles.inline, { gap: 4 }]}>
              <AnimatedNumber value={telemetry?.velocidadKmh ?? 0} variant="subtitle" />
              <ThemedText variant="caption" color="textMuted">
                km/h
              </ThemedText>
            </View>
          </View>
        }>
        {/* Tu transporte: TODA la info del carro + su telemetría en vivo. */}
        <Card style={{ gap: spacing.lg }}>
          <View style={[styles.inline, { gap: spacing.md }]}>
            {/* Foto del carro (tile placeholder hasta tener la foto real). */}
            <View style={[styles.vehiclePhoto, { backgroundColor: colors.surfaceSunken, borderRadius: radii.lg }]}>
              <TabIcon name="flota" color={colors.primary} size={28} />
            </View>
            <View style={styles.flex1}>
              <ThemedText variant="subtitle">{`${vehicle.marca} ${vehicle.modelo} · ${vehicle.anio}`}</ThemedText>
              <ThemedText variant="caption" color="textMuted">
                {`${vehicle.placa} · ${vehicle.numero}${vehicle.alias ? ` · ${vehicle.alias}` : ''}`}
              </ThemedText>
            </View>
            <View style={[styles.inline, { gap: 4 }]}>
              <AnimatedNumber value={telemetry?.velocidadKmh ?? 0} />
              <ThemedText variant="body" color="textSecondary">
                km/h
              </ThemedText>
            </View>
          </View>

          {telemetry ? (
            <>
              {/* Niveles con barra + porcentaje y color según el estado. */}
              <View style={{ gap: spacing.md }}>
                <LevelBar label="Combustible" pct={telemetry.combustiblePct} />
                <LevelBar label="Aceite" pct={telemetry.aceitePct} />
              </View>

              <View style={[styles.metricsGrid, { gap: spacing.md }]}>
                <MetricCard style={styles.metricItem} label="Temp. motor" value={`${telemetry.tempMotorC} °C`} valueColor={tempColor(telemetry.tempMotorC)} />
                <MetricCard style={styles.metricItem} label="Personas a bordo" value={`${telemetry.personasABordo}`} />
                <MetricCard style={styles.metricItem} label="Odómetro" value={`${telemetry.km.toLocaleString('es')} km`} />
              </View>

              <ThemedText variant="caption" color="textMuted">
                Actualizado {horaCorta(telemetry.actualizadoEn)}
              </ThemedText>
            </>
          ) : null}
        </Card>

        {/* Tu jornada */}
        <ThemedText variant="overline" color="textMuted">
          Tu jornada
        </ThemedText>
        <View style={{ gap: spacing.md }}>
          {inspeccion && inspeccionVista ? (
            <HomeActionCard
              accent={inspeccionVista.accent}
              icon={<TabIcon name="inspeccion" color={inspeccionVista.accent} size={22} />}
              title="Inspección del día"
              subtitle={inspeccionVista.subtitle}
              rightLabel={inspeccionVista.right}
              onPress={() => router.navigate('/inspeccion')}
            />
          ) : null}
          <HomeActionCard
            accent={alertaAccent}
            icon={<TabIcon name="alertas" color={alertaAccent} size={22} />}
            title="Mantenimiento y alertas"
            subtitle={avisos?.ultimaAlerta ? avisos.ultimaAlerta.titulo : 'Sin novedades'}
            rightLabel={totalAvisos > 0 ? String(totalAvisos) : undefined}
            onPress={() => router.navigate('/mantenimiento')}
          />
        </View>

        {/* Índice de manejo seguro */}
        {score ? (
          <Card style={{ gap: spacing.lg, alignItems: 'center' }}>
            <View style={[styles.rowBetween, styles.fullWidth]}>
              <ThemedText variant="overline" color="textMuted">
                Índice de manejo seguro
              </ThemedText>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: colors[`${rangoColor(score.rango)}Surface` as keyof ColorTokens], borderRadius: radii.pill },
                ]}>
                <PulseDot color={colors[rangoColor(score.rango)]} active={false} size={8} />
                <ThemedText variant="caption" color={rangoColor(score.rango)} style={[styles.chipText, styles.capitalize]}>
                  {score.rango}
                </ThemedText>
              </View>
            </View>
            <ScoreRing value={score.scoreTotal} color={rangoColor(score.rango)} />
            <View style={[styles.messageBox, styles.fullWidth, { backgroundColor: colors[`${rangoColor(score.rango)}Surface` as keyof ColorTokens], borderRadius: radii.md, padding: spacing.md }]}>
              <ThemedText variant="body" color={rangoColor(score.rango)} style={styles.center}>
                {mensajeManejo(score.rango)}
              </ThemedText>
            </View>
          </Card>
        ) : null}

        {/* Ficha del vehículo */}
        {telemetry ? (
          <Card style={{ gap: spacing.md }}>
            <ThemedText variant="overline" color="textMuted">
              Ficha del vehículo
            </ThemedText>
            <InfoRow label="Vehículo" value={`${vehicle.marca} ${vehicle.modelo}`} />
            <InfoRow label="Unidad" value={vehicle.numero} />
            <InfoRow label="Año" value={`${vehicle.anio}`} />
            <InfoRow label="Placa" value={vehicle.placa} />
            <InfoRow label="Odómetro" value={`${telemetry.km.toLocaleString('es')} km`} />
          </Card>
        ) : null}

      </BottomSheet>
    </ThemedView>
  );
}

/** Ícono de "reportar falla": triángulo de alerta. */
function AlertTriangle({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.6 L21.5 20 H2.5 Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 9.5 V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 17.2 h0.01" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Barra de nivel (combustible/aceite): el relleno se LLENA con animación al
 * aparecer y el % cuenta hasta su valor. El color sale del estado (verde/
 * amarillo/rojo). Respeta "reducir movimiento" (aparece lleno, sin contar).
 */
function LevelBar({ label, pct }: { label: string; pct: number }) {
  const { colors, radii, motion } = useTheme();
  const reduced = useReducedMotion();
  const tone = nivelColor(pct);
  const color = colors[tone];
  const target = Math.max(3, Math.min(100, pct));

  const fill = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [shown, setShown] = useState(reduced ? Math.round(pct) : 0);

  useEffect(() => {
    if (reduced) {
      fill.setValue(1);
      setShown(Math.round(pct));
      return;
    }
    fill.setValue(0);
    const id = fill.addListener(({ value }) => setShown(Math.round(value * pct)));
    const anim = Animated.timing(fill, {
      toValue: 1,
      duration: 900,
      easing: motion.easing.standard,
      useNativeDriver: false, // animamos width (%), no transform
    });
    anim.start();
    return () => {
      anim.stop();
      fill.removeListener(id);
    };
  }, [pct, reduced, fill, motion.easing.standard]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${target}%`] });

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.rowBetween}>
        <ThemedText variant="caption" color="textSecondary">
          {label}
        </ThemedText>
        <ThemedText variant="subtitle" tabular style={{ color }}>
          {`${shown}%`}
        </ThemedText>
      </View>
      <View style={[styles.levelTrack, { backgroundColor: colors.surfaceSunken, borderRadius: radii.pill }]}>
        <Animated.View style={[styles.levelFill, { width, backgroundColor: color, borderRadius: radii.pill }]} />
      </View>
    </View>
  );
}

/** Fila etiqueta–valor. */
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
  headerBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  mapArea: { flex: 1, overflow: 'hidden' },
  mapFill: { ...StyleSheet.absoluteFillObject, height: '100%', borderRadius: 0, borderWidth: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  peekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontWeight: '600' },
  loaderCenter: { alignItems: 'center', justifyContent: 'center' },
  sosFab: { position: 'absolute', right: 18 },
  reportFab: { position: 'absolute', left: 18 },
  // Píldora "usando unidad por PIN" (§4.3), centrada sobre el mapa.
  viaPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fabCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  reportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sosText: { fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metricItem: { flexGrow: 1, flexBasis: '47%' },
  levelTrack: { height: 10, overflow: 'hidden' },
  levelFill: { height: 10 },
  fullWidth: { alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  messageBox: { alignItems: 'center' },
  capitalize: { textTransform: 'capitalize' },
  flex1: { flex: 1, minWidth: 0 },
  vehiclePhoto: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  // Grupo de acciones: mantiene su tamaño, no se comprime contra el título.
  actions: { flexShrink: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
});
