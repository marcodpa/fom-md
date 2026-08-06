import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, etiquetaRol, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmpresaDatosForm } from '@/components/empresa-datos-form';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal } from '@/components/option-picker';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar, normalizar } from '@/components/search-bar';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { confirmar } from '@/lib/confirmar';
import {
  actualizarEstadoPago,
  actualizarEmpresa,
  eliminarEmpresa,
  esDesempleados,
  getEmpresasSistema,
  getFlotaVehiculos,
  getPagosEmpresa,
  getUsuariosDeEmpresa,
  listarUsuariosSistema,
  registrarPago,
  setServicioEmpresa,
} from '@/services';
import { useAdmin } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { Pago, PagoEstado } from '@/types';

const TIPO_LABEL = { estandar: 'Contratista', predefinida: 'Compañía', personal: 'Personal' } as const;

const PAGO_VISTA: Record<PagoEstado, { tone: keyof ColorTokens; label: string }> = {
  pendiente: { tone: 'warning', label: 'Pendiente' },
  pagado: { tone: 'success', label: 'Pagado' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

/**
 * ADMINISTRACIÓN DE UNA EMPRESA — solo los admin FOM (su dashboard): editar
 * sus datos, monitorear los PAGOS del servicio (registrar el cobro de cada
 * período y marcarlo pagado/vencido), ACTIVAR/DESACTIVAR el servicio (con el
 * servicio suspendido, los usuarios de esa empresa no entran a la app) y
 * eliminarla por completo.
 */
export default function ConsolaEmpresaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || '';

  const { setEmpresa } = useAdmin();

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [empresas, pagos, roster, perfilesEmpresa, flota] = await Promise.all([
        getEmpresasSistema(),
        getPagosEmpresa(companyId),
        listarUsuariosSistema(),
        getUsuariosDeEmpresa(companyId),
        getFlotaVehiculos(companyId),
      ]);
      const empresa = empresas.find((e) => e.id === companyId) ?? null;
      // Sin UNO MISMO: nadie se administra a sí mismo desde la consola (sus
      // datos propios los edita en "Mi perfil").
      const delRoster = roster.filter((u) => u.companyId === companyId && u.id !== user?.id);
      return {
        // Para qué empresa se cargó este data: si la pantalla se reutiliza al
        // navegar a otra empresa, el data viejo (que useAsyncData conserva
        // mientras recarga) no debe mostrarse ni guardarse sobre la nueva.
        fetchedFor: companyId,
        empresa,
        pagos,
        vehiculos: flota.length,
        // Con BD, el roster trae a todos con su rol; en mock, los perfiles demo
        // de la empresa completan la lista (sin rol conocido → "Conductor").
        personas:
          delRoster.length > 0
            ? delRoster
            : perfilesEmpresa.filter((p) => p.id !== user?.id).map((p) => ({
                id: p.id,
                name: p.nombre,
                email: '—',
                role: p.role ?? ('conductor' as const),
                companyId,
                drives: (p.role ?? 'conductor') === 'conductor',
              })),
        // Si es GENERAL: las empresas que tiene asignadas (su capa gerencial).
        asignadas:
          empresa?.tipo === 'predefinida'
            ? empresas.filter((e) => e.predefinidaIds?.includes(companyId))
            : [],
      };
    },
    [companyId],
    { onFocus: true },
  );

  // Buscador de la lista de personas. Se reinicia al cambiar de empresa (la
  // pantalla se reutiliza al navegar entre entes; una consulta vieja filtraría
  // a la gente de la empresa nueva, y con ≤3 personas el buscador queda oculto).
  const [personasQ, setPersonasQ] = useState('');
  useEffect(() => setPersonasQ(''), [companyId]);
  // Registrar pago.
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoPeriodo, setPagoPeriodo] = useState('');
  // Pago tocado (pendiente/vencido): abre la hoja para marcarlo pagado/vencido.
  const [pagoElegido, setPagoElegido] = useState<Pago | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `data` solo es válido cuando corresponde a la empresa ACTUAL: al cambiar de
  // empresa reusando la pantalla, useAsyncData conserva el data viejo mientras
  // recarga; hasta que coincida, se muestra el skeleton (no datos de otra).
  const listo = !!data && data.fetchedFor === companyId;
  const empresa = listo ? (data?.empresa ?? null) : null;

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Exclusivo del dashboard administrativo FOM.
  if (!esMultiempresa(user)) return <Redirect href="/" />;
  // Desempleados C.A. NO es una empresa administrable (sin panel, pagos ni
  // datos): su gente se gestiona en la tab Usuarios.
  if (esDesempleados(companyId)) return <Redirect href="/admin/usuarios" />;

  async function ejecutar(accion: () => Promise<unknown>) {
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      await accion();
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setOcupado(false);
    }
  }

  function confirmarServicio(activar: boolean) {
    if (activar) {
      ejecutar(() => setServicioEmpresa(companyId, true));
      return;
    }
    confirmar({
      titulo: 'Suspender el servicio',
      mensaje: `Los usuarios de ${empresa?.name ?? 'la empresa'} NO podrán entrar a la app hasta reactivarlo. ¿Continuar?`,
      accion: 'Suspender',
      onConfirmar: () => ejecutar(() => setServicioEmpresa(companyId, false)),
    });
  }

  function confirmarEliminar() {
    confirmar({
      titulo: 'Eliminar empresa',
      mensaje: `Se borra ${empresa?.name ?? 'la empresa'} con TODO lo suyo (vehículos, áreas, ODT, documentos…). Esto no se puede deshacer.`,
      accion: 'Eliminar todo',
      onConfirmar: () =>
        ejecutar(async () => {
          await eliminarEmpresa(companyId);
          router.back();
        }),
    });
  }

  const activo = empresa?.servicioActivo !== false;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          title={empresa?.name ?? 'Empresa'}
          right={<Chip tone={activo ? 'success' : 'danger'} label={activo ? 'Servicio activo' : 'Suspendido'} />}
        />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar la empresa." onRetry={recargar} />
        ) : !listo ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={160} radius={16} />
            <Skeleton height={120} radius={16} />
          </View>
        ) : !empresa ? (
          <ErrorState description="Esa empresa ya no existe." onRetry={() => router.back()} />
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}
              keyboardShouldPersistTaps="handled">
              {/* ── LOS NÚMEROS del ente: su vista administrativa de un vistazo ── */}
              <Card style={[styles.grid, { gap: spacing.lg }]}>
                <View style={styles.stat}>
                  <ThemedText variant="title">{`${data.personas.length}`}</ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    usuarios
                  </ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText variant="title">{`${data.vehiculos}`}</ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    vehículos
                  </ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText
                    variant="title"
                    color={data.pagos.some((p) => p.estado !== 'pagado') ? 'warning' : 'text'}>
                    {`${data.pagos.filter((p) => p.estado !== 'pagado').length}`}
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    pagos por atender
                  </ThemedText>
                </View>
              </Card>

              {/* ── OPERACIÓN: bajar del plano administrativo al operativo ── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Operación
                </ThemedText>
                {empresa.tipo === 'predefinida' ? (
                  <View style={{ gap: spacing.sm }}>
                    {/* Sus EMPRESAS ASOCIADAS: un solo acceso compacto que abre
                        la lista filtrada (como la tab Empresas, pero solo las
                        de esta compañía). */}
                    <PressableScale
                      onPress={() =>
                        router.navigate({
                          pathname: '/empresas-asociadas',
                          params: { companyId, nombre: empresa.name },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Ver las ${data.asignadas.length} empresas asociadas a ${empresa.name}`}>
                      <Card style={[styles.rowBetween, { gap: spacing.md }]}>
                        <View style={[styles.lead, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                          <TabIcon name="empresa" color={colors.primary} size={20} />
                        </View>
                        <View style={styles.flex1}>
                          <ThemedText variant="button">Empresas asociadas</ThemedText>
                          <ThemedText variant="caption" color="textMuted">
                            Contratistas y personales de esta compañía
                          </ThemedText>
                        </View>
                        <Chip tone="info" label={`${data.asignadas.length}`} />
                        <ThemedText variant="body" color="textMuted">
                          ›
                        </ThemedText>
                      </Card>
                    </PressableScale>
                    {/* Las compañías no operan flota propia: su gente entra a
                        /compania (monitoreo) al iniciar sesión. */}
                  </View>
                ) : empresa.tipo === 'personal' ? (
                  <Card>
                    <ThemedText variant="caption" color="textMuted">
                      Las cuentas personales tienen su propia superficie doméstica: la ve su
                      supervisor personal al entrar con su usuario.
                    </ThemedText>
                  </Card>
                ) : (
                  <Button
                    label="Entrar al panel operativo"
                    onPress={() => {
                      setEmpresa(companyId);
                      router.navigate('/panel');
                    }}
                  />
                )}
              </View>

              {/* ── PERSONAS de esta empresa ─────────────────────────────── */}
              <View style={{ gap: spacing.sm }}>
                <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                  <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                    {`Personas (${data.personas.length})`}
                  </ThemedText>
                  <PressableScale
                    onPress={() => router.navigate({ pathname: '/crear-usuario', params: { companyId } })}
                    accessibilityRole="button"
                    accessibilityLabel="Crear un usuario para esta empresa">
                    <ThemedText variant="button" color="primary">
                      + Crear usuario
                    </ThemedText>
                  </PressableScale>
                </View>
                {data.personas.length > 3 ? (
                  <SearchBar value={personasQ} onChangeText={setPersonasQ} placeholder="Buscar por nombre, correo o rol…" />
                ) : null}
                {(() => {
                  const nq = normalizar(personasQ);
                  const visibles = nq
                    ? data.personas.filter((p) =>
                        normalizar(`${p.name} ${p.email} ${etiquetaRol(p.role, empresa.tipo)}`).includes(nq),
                      )
                    : data.personas;
                  if (data.personas.length === 0) {
                    return (
                      <Card>
                        <ThemedText variant="caption" color="textMuted">
                          {empresa.tipo === 'predefinida'
                            ? 'Sin personas todavía. Crea a su administrador, su supervisor (solo lectura) o sus conductores.'
                            : 'Sin personas todavía. Crea a su administrador o a sus conductores.'}
                        </ThemedText>
                      </Card>
                    );
                  }
                  if (visibles.length === 0) {
                    return (
                      <Card>
                        <ThemedText variant="caption" color="textMuted">
                          {`Ninguna persona coincide con “${personasQ}”.`}
                        </ThemedText>
                      </Card>
                    );
                  }
                  return (
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {visibles.map((p, i) => (
                      <PressableScale
                        key={p.id}
                        onPress={() =>
                          router.navigate({ pathname: '/editar-usuario', params: { userId: p.id } })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Editar a ${p.name}`}
                        style={[
                          styles.rowBetween,
                          {
                            gap: spacing.md,
                            paddingVertical: spacing.md,
                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                            borderTopColor: colors.border,
                          },
                        ]}>
                        <View style={styles.flex1}>
                          <ThemedText variant="button">{p.name}</ThemedText>
                          <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                            {p.email}
                          </ThemedText>
                        </View>
                        <Chip tone="textMuted" label={etiquetaRol(p.role, empresa.tipo)} />
                        <ThemedText variant="body" color="textMuted">
                          ›
                        </ThemedText>
                      </PressableScale>
                    ))}
                  </Card>
                  );
                })()}
              </View>

              {/* ── DATOS (editar) — mismas validaciones y desplegables que el
                  alta (RIF tipo+dígitos, país+teléfono, correo). ── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  {`Datos · ${TIPO_LABEL[empresa.tipo ?? 'estandar']}`}
                </ThemedText>
                <Card style={{ gap: spacing.md }}>
                  <EmpresaDatosForm
                    empresa={empresa}
                    ocupado={ocupado}
                    onGuardar={(patch) => ejecutar(() => actualizarEmpresa(companyId, patch))}
                  />
                </Card>
              </View>

              {/* ── SERVICIO (activar / desactivar) ─────────────────────── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Servicio FOM
                </ThemedText>
                <Card style={{ gap: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flex1}>
                      <ThemedText variant="button">{activo ? 'Servicio activo' : 'Servicio suspendido'}</ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        {activo
                          ? 'Sus usuarios entran y operan con normalidad.'
                          : 'Sus usuarios NO pueden entrar a la app.'}
                      </ThemedText>
                    </View>
                    <Chip tone={activo ? 'success' : 'danger'} label={activo ? 'Activo' : 'Suspendido'} />
                  </View>
                  <Button
                    label={activo ? 'Suspender servicio' : 'Reactivar servicio'}
                    variant={activo ? 'danger' : 'primary'}
                    onPress={() => confirmarServicio(!activo)}
                    loading={ocupado}
                  />
                </Card>
              </View>

              {/* ── PAGOS del servicio ──────────────────────────────────── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  {`Pagos (${data.pagos.length})`}
                </ThemedText>
                <Card style={{ gap: spacing.md }}>
                  <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                    <TextField
                      label="Período"
                      value={pagoPeriodo}
                      onChangeText={setPagoPeriodo}
                      placeholder="2026-07"
                      style={styles.flex1}
                      editable={!ocupado}
                    />
                    <TextField
                      label="Monto (USD)"
                      value={pagoMonto}
                      onChangeText={setPagoMonto}
                      placeholder="250"
                      keyboardType="decimal-pad"
                      style={styles.flex1}
                      editable={!ocupado}
                    />
                  </View>
                  <Button
                    label="Registrar cobro"
                    variant="secondary"
                    onPress={() =>
                      ejecutar(async () => {
                        await registrarPago({ companyId, monto: Number(pagoMonto), periodo: pagoPeriodo });
                        setPagoMonto('');
                        setPagoPeriodo('');
                      })
                    }
                    loading={ocupado}
                    disabled={!pagoPeriodo.trim() || !pagoMonto.trim()}
                  />
                </Card>

                {data.pagos.length === 0 ? (
                  <Card>
                    <ThemedText variant="caption" color="textMuted">
                      Sin pagos registrados todavía.
                    </ThemedText>
                  </Card>
                ) : (
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {data.pagos.map((p, i) => {
                      const v = PAGO_VISTA[p.estado];
                      return (
                        <PressableScale
                          key={p.id}
                          onPress={() => {
                            if (p.estado === 'pagado') return;
                            // Hoja de opciones propia (Alert de 3 botones es
                            // no-op en web): marcar PAGADO o VENCIDO.
                            setPagoElegido(p);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Pago del período ${p.periodo}, ${v.label}`}
                          style={[
                            styles.rowBetween,
                            {
                              gap: spacing.md,
                              paddingVertical: spacing.md,
                              borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}>
                          <View style={styles.flex1}>
                            <ThemedText variant="button">{p.periodo}</ThemedText>
                            <ThemedText variant="caption" color="textMuted">
                              {`${p.monto.toLocaleString('es')} ${p.moneda}${p.pagadoEn ? ` · pagado ${new Date(p.pagadoEn).toLocaleDateString('es')}` : ''}`}
                            </ThemedText>
                          </View>
                          <Chip tone={v.tone} label={v.label} />
                        </PressableScale>
                      );
                    })}
                  </Card>
                )}
                <ThemedText variant="caption" color="textMuted">
                  Toca un pago pendiente para marcarlo pagado o vencido.
                </ThemedText>
              </View>

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}

              {/* ── ZONA PELIGROSA ──────────────────────────────────────── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="danger">
                  Zona peligrosa
                </ThemedText>
                <Card style={[{ gap: spacing.sm, borderColor: colors.danger, borderWidth: 1, borderRadius: radii.lg }]}>
                  <ThemedText variant="caption" color="textMuted">
                    Eliminar la empresa borra TODO lo suyo: vehículos, áreas, ODT, documentos y
                    asignaciones. No se puede deshacer.
                  </ThemedText>
                  <Button label="Eliminar empresa" variant="danger" onPress={confirmarEliminar} loading={ocupado} />
                </Card>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* Marcar un pago (hoja propia: funciona igual en nativo y web). */}
        <OptionPickerModal
          visible={!!pagoElegido}
          title={
            pagoElegido
              ? `Pago ${pagoElegido.periodo} · ${pagoElegido.monto.toLocaleString('es')} ${pagoElegido.moneda}`
              : 'Pago'
          }
          options={[
            { id: 'pagado', label: 'Marcar PAGADO', helper: 'El cobro del período se recibió' },
            { id: 'vencido', label: 'Marcar VENCIDO', helper: 'No pagaron: candidato a suspender el servicio' },
          ]}
          selectedIds={[]}
          onChange={(ids) => {
            const nuevoEstado = ids[0];
            const pago = pagoElegido;
            if (pago && (nuevoEstado === 'pagado' || nuevoEstado === 'vencido')) {
              setPagoElegido(null);
              ejecutar(() => actualizarEstadoPago(pago.id, nuevoEstado));
            }
          }}
          onClose={() => setPagoElegido(null)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { flexGrow: 1, flexBasis: '28%', gap: 2 },
  flex1: { flex: 1, minWidth: 0 },
});
