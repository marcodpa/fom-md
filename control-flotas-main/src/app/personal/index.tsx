import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useSignOut } from '@/auth';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MapaVehiculo } from '@/components/map-vehiculo';
import { OptionPickerModal } from '@/components/option-picker';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  asignarConductorPrincipal,
  crearUsuarioPersonal,
  evaluarReglas,
  getDocumentosConductor,
  getDocumentosVehiculo,
  getFlotaVehiculos,
  getNotificacionesNoLeidas,
  getReglasAlerta,
  getUsuariosDeEmpresa,
} from '@/services';
import { DEFAULT_BRAND, useTheme, useThemeController, type ColorTokens } from '@/theme';
import type { Documento, DocumentoEstado, MapMarker } from '@/types';

const DOC_VISTA: Record<DocumentoEstado, { tone: keyof ColorTokens; label: string }> = {
  vigente: { tone: 'success', label: 'Vigente' },
  por_vencer: { tone: 'warning', label: 'Por vencer' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function venceTexto(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * CUENTAS PERSONALES (FOM-02 §5–§6), con variante interna por rol:
 *  - Ale (supervisor personal): TODOS sus carros con toda su info — mapa (cada
 *    carro + dónde está ella), km y velocidad, alertas de mantenimiento y
 *    documentos por vencer (carros y usuarios); crea usuarios, asigna el
 *    principal de cada carro y configura alertas multi-carro.
 *  - Santi/Sofi (usuario personal): SU vehículo en el mapa + su propia
 *    ubicación + alertas (mantenimiento y documentos). No crean ni editan nada.
 */
export default function PersonalHomeScreen() {
  const { colors, spacing, radii } = useTheme();
  const { setBrand } = useThemeController();
  const { user } = useAuth();
  const signOut = useSignOut();
  const router = useRouter();

  const esSupervisora = user?.role === 'supervisor_personal';
  const companyId = user?.companyId ?? '';

  // Crear usuario (solo supervisor personal, §5.1).
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [principalPickerDe, setPrincipalPickerDe] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Las cuentas personales usan la identidad general de la app.
  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
    }, [setBrand]),
  );

  const { data, estado, recargar } = useAsyncData(
    async () => {
      // El motor de reglas corre primero (§5.2: "alerta cumplida → notificación").
      await evaluarReglas(companyId);
      const [flota, usuarios, reglas, noLeidas, docsUsuario] = await Promise.all([
        getFlotaVehiculos(companyId),
        getUsuariosDeEmpresa(companyId),
        getReglasAlerta(companyId),
        getNotificacionesNoLeidas(companyId),
        getDocumentosConductor(user ?? undefined),
      ]);
      // Documentos por carro (trimestres, RCV, carné, póliza — §5.2).
      const docsPorCarro = await Promise.all(flota.map((f) => getDocumentosVehiculo(f.vehicle.id)));
      return { flota, usuarios, reglas, noLeidas, docsUsuario, docsPorCarro };
    },
    [companyId],
    { onFocus: true },
  );

  // Vista de USUARIO personal: solo su vehículo.
  const miCarro = useMemo(
    () => data?.flota.find((f) => f.vehicle.conductorPrincipalId === user?.id) ?? null,
    [data, user?.id],
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      (data?.flota ?? []).map((f) => ({
        id: f.vehicle.id,
        label: f.vehicle.alias ?? f.vehicle.numero,
        coords: f.coords,
        live: f.estado === 'en_marcha',
      })),
    [data],
  );

  async function onCrearUsuario() {
    if (creando) return;
    setFormError(null);
    setCreando(true);
    try {
      await crearUsuarioPersonal(companyId, nuevoNombre, nuevoEmail);
      setNuevoNombre('');
      setNuevoEmail('');
      recargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear el usuario.');
    } finally {
      setCreando(false);
    }
  }

  async function onAsignarPrincipal(vehicleId: string, userId: string | null) {
    setOcupado(true);
    try {
      await asignarConductorPrincipal(vehicleId, userId);
      recargar();
    } finally {
      setOcupado(false);
    }
  }

  if (!user) return null;

  // Solo la primera carga: el refetch por foco no borra el contenido visible.
  const cargando = !data;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              {saludo()}
            </ThemedText>
            <ThemedText variant="subtitle" numberOfLines={1}>
              {user.name.split(' ')[0]}
            </ThemedText>
          </View>
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar tus vehículos." onRetry={recargar} />
        ) : cargando ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={220} radius={radii.lg} />
            <Skeleton height={110} radius={radii.lg} />
            <Skeleton height={110} radius={radii.lg} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {/* ── MAPA (§5.2/§6.1): carros + TU ubicación, siempre. ── */}
            <Appear distance={10}>
              {esSupervisora ? (
                markers.length > 0 ? (
                  <MapaVehiculo markers={markers} style={{ height: 240 }} />
                ) : null
              ) : miCarro ? (
                <MapaVehiculo
                  vehicleName={miCarro.vehicle.alias ?? `${miCarro.vehicle.marca} ${miCarro.vehicle.modelo}`}
                  live={miCarro.estado === 'en_marcha'}
                  vehicleCoords={miCarro.coords}
                  style={{ height: 240 }}
                />
              ) : (
                <EmptyState
                  title="Sin vehículo asignado"
                  description="Cuando te asignen tu vehículo, lo verás aquí en el mapa."
                />
              )}
            </Appear>

            {/* ── Notificaciones (§5.2: alerta cumplida → notificación). ── */}
            {esSupervisora ? (
              <Appear delay={70}>
                <PressableScale
                  onPress={() => router.navigate({ pathname: '/notificaciones', params: { companyId } })}
                  accessibilityRole="button"
                  accessibilityLabel="Ver notificaciones">
                  <Card style={[styles.rowBetween, { gap: spacing.md }]}>
                    <View style={styles.flex1}>
                      <ThemedText variant="subtitle">Notificaciones</ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        Alertas de mantenimiento cumplidas
                      </ThemedText>
                    </View>
                    <Chip tone={data.noLeidas > 0 ? 'warning' : 'textMuted'} label={`${data.noLeidas} nuevas`} />
                  </Card>
                </PressableScale>
              </Appear>
            ) : null}

            {/* ── CARROS (§5.2): toda su info; el usuario personal ve el suyo. ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {esSupervisora ? 'Tus carros' : 'Tu vehículo'}
              </ThemedText>
              {(esSupervisora ? data.flota : miCarro ? [miCarro] : []).map((f, i) => {
                const principal = data.usuarios.find((u) => u.id === f.vehicle.conductorPrincipalId);
                const docs = data.docsPorCarro[data.flota.indexOf(f)] ?? [];
                const porVencer = docs.filter((d) => d.estado !== 'vigente');
                return (
                  <Appear key={f.vehicle.id} delay={100 + i * 70}>
                    <Card style={{ gap: spacing.sm }}>
                      <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                        <ThemedText variant="subtitle" numberOfLines={1} style={styles.flex1}>
                          {f.vehicle.alias ?? f.vehicle.numero}
                        </ThemedText>
                        <Chip
                          tone={f.estado === 'en_marcha' ? 'success' : 'textMuted'}
                          label={f.estado === 'en_marcha' ? `${f.velocidadKmh} km/h` : 'Parado'}
                        />
                      </View>
                      <ThemedText variant="caption" color="textSecondary">
                        {`${f.vehicle.marca} ${f.vehicle.modelo} · ${f.vehicle.placa} · ${(f.km ?? 0).toLocaleString('es')} km`}
                      </ThemedText>
                      {esSupervisora ? (
                        <PressableScale
                          onPress={() => setPrincipalPickerDe(f.vehicle.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Cambiar el conductor principal de ${f.vehicle.alias ?? f.vehicle.numero}`}>
                          <View style={styles.rowBetween}>
                            <ThemedText variant="caption" color="textMuted">
                              Principal
                            </ThemedText>
                            <ThemedText variant="body" color="primary">
                              {`${principal?.nombre ?? 'Sin asignar'} ›`}
                            </ThemedText>
                          </View>
                        </PressableScale>
                      ) : null}
                      {porVencer.length > 0 ? (
                        <ThemedText variant="caption" color="warning">
                          {`Documentos por atender: ${porVencer.map((d) => d.tipo).join(', ')}`}
                        </ThemedText>
                      ) : null}
                    </Card>
                  </Appear>
                );
              })}
            </View>

            {/* ── ALERTAS de mantenimiento (§5.1/§6.1). ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Alertas de mantenimiento
              </ThemedText>
              {data.reglas.length === 0 ? (
                <Card>
                  <ThemedText variant="caption" color="textMuted">
                    Sin alertas configuradas todavía.
                  </ThemedText>
                </Card>
              ) : (
                <Card style={{ gap: spacing.sm }}>
                  {data.reglas
                    .filter((r) => !miCarro || esSupervisora || r.vehicleIds.includes(miCarro.vehicle.id))
                    .map((r) => (
                      <View key={r.id} style={styles.rowBetween}>
                        <View style={styles.flex1}>
                          <ThemedText variant="body">
                            {`${r.servicio ?? 'Mantenimiento'} · cada ${r.umbral.toLocaleString('es')} km`}
                          </ThemedText>
                          <ThemedText variant="caption" color="textMuted">
                            {r.vehicleIds
                              .filter((id) => esSupervisora || id === miCarro?.vehicle.id)
                              .map((id) => {
                                const carro = data.flota.find((f) => f.vehicle.id === id);
                                const avance = r.progresoKm?.[id] ?? 0;
                                return `${carro?.vehicle.alias ?? id}: ${avance.toLocaleString('es')} km`;
                              })
                              .join(' · ')}
                          </ThemedText>
                        </View>
                        <Chip
                          tone={r.vehicleIds.some((id) => (r.progresoKm?.[id] ?? 0) >= r.umbral) ? 'danger' : 'success'}
                          label={r.vehicleIds.some((id) => (r.progresoKm?.[id] ?? 0) >= r.umbral) ? 'Vencida' : 'Al día'}
                        />
                      </View>
                    ))}
                </Card>
              )}
              {esSupervisora ? (
                <Button
                  label="Configurar alertas"
                  variant="secondary"
                  onPress={() => router.navigate({ pathname: '/reglas-alerta', params: { companyId } })}
                />
              ) : null}
            </View>

            {/* ── DOCUMENTOS por vencer de las personas (§5.2/§6.1). ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {esSupervisora ? 'Documentos de tus usuarios' : 'Tus documentos'}
              </ThemedText>
              <Card style={{ gap: spacing.sm }}>
                {data.docsUsuario.map((d: Documento) => {
                  const vista = DOC_VISTA[d.estado];
                  return (
                    <View key={d.id} style={styles.rowBetween}>
                      <View style={styles.flex1}>
                        <ThemedText variant="body">{d.tipo}</ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          {`Vence: ${venceTexto(d.venceEn)}`}
                        </ThemedText>
                      </View>
                      <Chip tone={vista.tone} label={vista.label} />
                    </View>
                  );
                })}
              </Card>
            </View>

            {/* ── USUARIOS (§5.1: Ale crea a Santi y Sofi). ── */}
            {esSupervisora ? (
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Tus usuarios
                </ThemedText>
                <Card style={{ gap: spacing.sm }}>
                  {data.usuarios.map((u) => (
                    <View key={u.id} style={styles.rowBetween}>
                      <ThemedText variant="body">{u.nombre}</ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        {data.flota.find((f) => f.vehicle.conductorPrincipalId === u.id)?.vehicle.alias ??
                          'Sin carro asignado'}
                      </ThemedText>
                    </View>
                  ))}
                </Card>
                <Card style={{ gap: spacing.md }}>
                  <ThemedText variant="overline" color="textMuted">
                    Crear usuario
                  </ThemedText>
                  <TextField label="Nombre" value={nuevoNombre} onChangeText={setNuevoNombre} placeholder="Nombre y apellido" editable={!creando} />
                  <TextField label="Email" value={nuevoEmail} onChangeText={setNuevoEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" editable={!creando} />
                  {formError ? (
                    <ThemedText variant="caption" color="danger">
                      {formError}
                    </ThemedText>
                  ) : null}
                  <Button label={creando ? 'Creando…' : 'Crear usuario'} onPress={onCrearUsuario} loading={creando} />
                  <ThemedText variant="caption" color="textMuted">
                    Cada usuario llena su perfil (cédula, licencia, carta médica) al entrar por
                    primera vez.
                  </ThemedText>
                </Card>
              </View>
            ) : null}

            {ocupado ? (
              <ThemedText variant="caption" color="textMuted">
                Guardando…
              </ThemedText>
            ) : null}

            {/* Único cierre de sesión de esta superficie (sin botón en el header). */}
            <PressableScale
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión">
              <Card style={[styles.rowBetween, { gap: spacing.md }]}>
                <View style={[styles.salirLead, { backgroundColor: colors.dangerSurface, borderRadius: radii.md }]}>
                  <TabIcon name="salir" color={colors.danger} size={20} />
                </View>
                <View style={styles.flex1}>
                  <ThemedText variant="button" color="danger">
                    Cerrar sesión
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    Salir de tu cuenta
                  </ThemedText>
                </View>
              </Card>
            </PressableScale>
          </ScrollView>
        )}

        {/* Asignar principal de un carro (§5.1). */}
        <OptionPickerModal
          visible={!!principalPickerDe}
          title="Conductor principal"
          options={(data?.usuarios ?? []).map((u) => ({ id: u.id, label: u.nombre }))}
          selectedIds={
            principalPickerDe
              ? [data?.flota.find((f) => f.vehicle.id === principalPickerDe)?.vehicle.conductorPrincipalId ?? ''].filter(Boolean)
              : []
          }
          onChange={(ids) => {
            if (principalPickerDe) onAsignarPrincipal(principalPickerDe, ids[0] ?? null);
          }}
          onClose={() => setPrincipalPickerDe(null)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1, minWidth: 0 },
  salirLead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
