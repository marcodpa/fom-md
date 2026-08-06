import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { BarraSeleccion } from '@/components/barra-seleccion';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { SearchBar, normalizar } from '@/components/search-bar';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { useSeleccion } from '@/hooks/use-seleccion';
import { confirmar } from '@/lib/confirmar';
import { eliminarVehiculo, esDesempleados, getEmpresasSistema, getVehiculosSistema } from '@/services';
import { useTheme } from '@/theme';
import type { CompanyTipo, FleetVehicle } from '@/types';

const TIPO_LABEL: Record<CompanyTipo, string> = {
  estandar: 'Contratista',
  predefinida: 'Compañía',
  personal: 'Personal',
};

/** Ícono que identifica el tipo de ente de un vistazo. */
const TIPO_ICON: Record<CompanyTipo, TabIconName> = {
  predefinida: 'empresa',
  estandar: 'flota',
  personal: 'inicio',
};

/**
 * FLOTA del sistema — la tab del admin FOM, espejo de Usuarios pero con
 * vehículos: UNA tarjeta por empresa que se abre para ver sus unidades; en cada
 * una, el ojo abre la unidad completa (mapa, datos, conductor) y el lápiz entra
 * a su CRUD (editar / mover / eliminar). El CRUD de vehículos es exclusivo del
 * admin FOM. Búsqueda por marca, modelo, placa o id de unidad.
 */
export default function AdminFlotaSistemaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [vehiculos, empresas] = await Promise.all([getVehiculosSistema(), getEmpresasSistema()]);
      return { vehiculos, empresas };
    },
    [],
    { onFocus: true },
  );

  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const sel = useSeleccion();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Al salir de la pestaña se sale del modo selección: no arrastra un modo de
  // borrado abierto ni ids fantasma al volver.
  const salirSeleccion = sel.cancelar;
  useFocusEffect(useCallback(() => () => salirSeleccion(), [salirSeleccion]));

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  const vehiculos = data?.vehiculos ?? [];
  const empresas = data?.empresas ?? [];

  const flotaDe = (companyId: string) => vehiculos.filter((v) => v.vehicle.companyId === companyId);
  const empresasReales = empresas.filter((e) => !esDesempleados(e.id));
  // Unidades cuya empresa ya no existe (visible, no huérfana).
  const sinEmpresa = vehiculos.filter((v) => !empresas.some((e) => e.id === v.vehicle.companyId));

  const nq = normalizar(q);
  const resultados = nq
    ? vehiculos.filter((v) => {
        const u = v.vehicle;
        return normalizar(`${u.marca} ${u.modelo} ${u.placa} ${u.numero} ${u.alias ?? ''}`).includes(nq);
      })
    : [];

  function toggleEmpresa(id: string) {
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  /** Borra las unidades tildadas: una por una, pero TODAS con la misma hora
   *  exacta en la auditoría (una sola acción, un solo instante). */
  function eliminarSeleccion() {
    if (ocupado) return;
    // Se revalidan los ids contra la lista vigente (evita borrar/auditar ids
    // fantasma si la lista cambió mientras estaba la selección abierta).
    const ids = vehiculos.filter((fv) => sel.esta(fv.vehicle.id)).map((fv) => fv.vehicle.id);
    if (ids.length === 0) return;
    confirmar({
      titulo: `Eliminar ${ids.length} vehículo${ids.length === 1 ? '' : 's'}`,
      mensaje: `Se eliminarán ${ids.length} unidad${ids.length === 1 ? '' : 'es'} con su historial. No se puede deshacer.`,
      accion: 'Eliminar',
      onConfirmar: async () => {
        setOcupado(true);
        setAviso(null);
        const fecha = new Date().toISOString();
        const res = await Promise.allSettled(ids.map((id) => eliminarVehiculo(id, { fecha })));
        const fallidos = res.filter((r) => r.status === 'rejected').length;
        setOcupado(false);
        sel.cancelar();
        recargar();
        if (fallidos) setAviso(`No se pudieron eliminar ${fallidos} de ${ids.length}. Intenta de nuevo.`);
      },
    });
  }

  /** Botón-ícono compacto (lápiz = editar / ojo = ver). */
  function IconoAccion({ icono, etiqueta, onPress }: { icono: 'editar' | 'ver'; etiqueta: string; onPress: () => void }) {
    return (
      <PressableScale
        onPress={onPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radii.pill }]}>
        <TabIcon name={icono} color={colors.primary} size={18} />
      </PressableScale>
    );
  }

  /** Fila de una unidad: ojo para VER (mapa/datos/conductor), lápiz para el CRUD. */
  function renderVehiculo(fv: FleetVehicle, conBorde: boolean) {
    const v = fv.vehicle;
    const titulo = v.alias ?? v.numero;
    const rowStyle = [
      styles.row,
      {
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderTopWidth: conBorde ? StyleSheet.hairlineWidth : 0,
        borderTopColor: colors.border,
      },
    ];
    const contenido = (
      <>
        {sel.activo ? (
          <Checkbox checked={sel.esta(v.id)} onPress={() => sel.alternar(v.id)} label={`Seleccionar ${titulo}`} />
        ) : null}
        <View style={styles.flex1}>
          <ThemedText variant="button">{titulo}</ThemedText>
          <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
            {`${v.marca} ${v.modelo} · ${v.placa}`}
          </ThemedText>
        </View>
        {fv.conductorActual ? <Chip tone="textMuted" label={fv.conductorActual} /> : null}
        {sel.activo ? null : (
          <>
            <IconoAccion
              icono="ver"
              etiqueta={`Ver la unidad ${titulo}`}
              onPress={() => router.navigate({ pathname: '/unidad', params: { vehicleId: v.id, companyId: v.companyId } })}
            />
            <IconoAccion
              icono="editar"
              etiqueta={`Editar la unidad ${titulo}`}
              onPress={() => router.navigate({ pathname: '/editar-vehiculo', params: { vehicleId: v.id } })}
            />
          </>
        )}
      </>
    );
    // En modo selección, toda la fila tilda/destilda; si no, es una fila normal.
    return sel.activo ? (
      <PressableScale
        key={v.id}
        onPress={() => sel.alternar(v.id)}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar ${titulo}`}
        style={rowStyle}>
        {contenido}
      </PressableScale>
    ) : (
      <View key={v.id} style={rowStyle}>
        {contenido}
      </View>
    );
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm }]}>
          <View>
            <ThemedText variant="overline" color="textMuted">
              FOM · Administración del sistema
            </ThemedText>
            <ThemedText variant="title">Flota</ThemedText>
          </View>
          {/* Acciones en su PROPIA fila: no le quitan ancho al título. */}
          <View style={styles.acciones}>
            {sel.activo ? (
              <PillButton label="Cancelar" onPress={ocupado ? () => {} : sel.cancelar} />
            ) : (
              <>
                <PillButton
                  label="Seleccionar"
                  onPress={() => {
                    setAviso(null);
                    sel.activar();
                  }}
                />
                <PillButton label="+ Nuevo vehículo" tone="primary" onPress={() => router.navigate('/crear-vehiculo')} />
              </>
            )}
          </View>
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar la flota." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={64} radius={16} />
            ))}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}
            keyboardShouldPersistTaps="handled">
            <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por marca, modelo, placa o id…" />

            {aviso ? (
              <Card>
                <ThemedText variant="caption" color="danger">
                  {aviso}
                </ThemedText>
              </Card>
            ) : null}

            {nq ? (
              /* ── RESULTADOS DE BÚSQUEDA (planos, todas las empresas) ── */
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  {`Resultados (${resultados.length})`}
                </ThemedText>
                {resultados.length === 0 ? (
                  <Card>
                    <ThemedText variant="caption" color="textMuted">
                      {`Ninguna unidad coincide con “${q}”.`}
                    </ThemedText>
                  </Card>
                ) : (
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {resultados.map((v, i) => renderVehiculo(v, i > 0))}
                  </Card>
                )}
              </View>
            ) : (
              <>
                {/* ── VEHÍCULOS POR EMPRESA (tocar abre sus unidades) ── */}
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="overline" color="textMuted">
                    {`Vehículos por empresa (${empresasReales.length})`}
                  </ThemedText>
                  {empresasReales.length === 0 ? (
                    <Card>
                      <ThemedText variant="caption" color="textMuted">
                        Sin empresas todavía: crea la primera en la pestaña Empresas.
                      </ThemedText>
                    </Card>
                  ) : (
                    empresasReales.map((e) => {
                      const abierta = abiertas.has(e.id);
                      const flota = flotaDe(e.id);
                      return (
                        <Card key={e.id} style={{ gap: 0, paddingVertical: spacing.xs }}>
                          <PressableScale
                            onPress={() => toggleEmpresa(e.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`${abierta ? 'Ocultar' : 'Ver'} las unidades de ${e.name}`}
                            style={[styles.row, { gap: spacing.md, paddingVertical: spacing.sm }]}>
                            <View style={[styles.lead, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                              <TabIcon name={TIPO_ICON[e.tipo ?? 'estandar']} color={colors.primary} size={20} />
                            </View>
                            <View style={styles.flex1}>
                              <ThemedText variant="button">{e.name}</ThemedText>
                              <ThemedText variant="caption" color="textMuted">
                                {TIPO_LABEL[e.tipo ?? 'estandar']}
                              </ThemedText>
                            </View>
                            <Chip tone="textMuted" label={`${flota.length}`} />
                            <ThemedText variant="body" color="textMuted">
                              {abierta ? '▾' : '›'}
                            </ThemedText>
                          </PressableScale>

                          {abierta ? (
                            <View>
                              {flota.length === 0 ? (
                                <ThemedText variant="caption" color="textMuted" style={{ paddingVertical: spacing.sm }}>
                                  Sin vehículos todavía.
                                </ThemedText>
                              ) : (
                                flota.map((v) => renderVehiculo(v, true))
                              )}
                              {sel.activo ? null : (
                                <View
                                  style={[
                                    styles.row,
                                    {
                                      paddingVertical: spacing.sm,
                                      borderTopWidth: StyleSheet.hairlineWidth,
                                      borderTopColor: colors.border,
                                    },
                                  ]}>
                                  <PillButton
                                    label="+ Añadir vehículo"
                                    tone="primary"
                                    onPress={() => router.navigate({ pathname: '/crear-vehiculo', params: { companyId: e.id } })}
                                  />
                                </View>
                              )}
                            </View>
                          ) : null}
                        </Card>
                      );
                    })
                  )}
                </View>

                {/* ── SIN EMPRESA (su empresa fue eliminada) ── */}
                {sinEmpresa.length > 0 ? (
                  <View style={{ gap: spacing.sm }}>
                    <ThemedText variant="overline" color="textMuted">
                      Sin empresa
                    </ThemedText>
                    <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                      {sinEmpresa.map((v, i) => renderVehiculo(v, i > 0))}
                    </Card>
                  </View>
                ) : null}

                <ThemedText variant="caption" color="textMuted">
                  Toca una empresa para ver sus unidades. En cada una: el ojo abre la unidad completa
                  (mapa, datos y su conductor) y el lápiz entra a editarla, moverla de ente o
                  eliminarla.
                </ThemedText>
              </>
            )}
          </ScrollView>
        )}

        {sel.activo ? (
          <BarraSeleccion
            cantidad={sel.cantidad}
            ocupado={ocupado}
            onCancelar={ocupado ? () => {} : sel.cancelar}
            onEliminar={eliminarSeleccion}
            etiqueta="Eliminar"
          />
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {},
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  flex1: { flex: 1, minWidth: 0 },
});
