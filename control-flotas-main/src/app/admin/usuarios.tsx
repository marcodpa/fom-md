import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, etiquetaRol, useAuth } from '@/auth';
import { BarraSeleccion } from '@/components/barra-seleccion';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal } from '@/components/option-picker';
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
import { eliminarUsuario, eliminarUsuarioDefinitivo, esDesempleados, getEmpresasSistema, listarUsuariosSistema } from '@/services';
import { useTheme } from '@/theme';
import type { CompanyTipo, Role, User } from '@/types';

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

/** ¿Es uno de los administradores del sistema (no se toca desde aquí)? */
function esAdminFom(role: Role): boolean {
  return role === 'admin' || role === 'superAdmin';
}

/**
 * USUARIOS del sistema — la tab del admin FOM. Arriba, SOLO los 3 admin del
 * sistema; debajo, UNA tarjeta por empresa (general, normal o personal) que se
 * abre para ver los perfiles de esa empresa, reasignarlos o añadir gente.
 */
export default function AdminUsuariosSistemaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [usuarios, empresas] = await Promise.all([listarUsuariosSistema(), getEmpresasSistema()]);
      return { usuarios, empresas };
    },
    [],
    { onFocus: true },
  );

  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [empresaPicker, setEmpresaPicker] = useState(false);
  const [q, setQ] = useState('');
  const sel = useSeleccion();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Salir de la pestaña sale del modo selección (no arrastra un borrado abierto).
  const salirSeleccion = sel.cancelar;
  useFocusEffect(useCallback(() => () => salirSeleccion(), [salirSeleccion]));

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  // Uno NO se administra a sí mismo: su ficha no aparece en el manejo de
  // usuarios (sus datos propios los edita en "Mi perfil").
  const usuarios = (data?.usuarios ?? []).filter((u) => u.id !== user.id);
  const empresas = data?.empresas ?? [];

  const admins = usuarios.filter((u) => esAdminFom(u.role));
  const usuariosDe = (companyId: string) =>
    usuarios.filter((u) => !esAdminFom(u.role) && u.companyId === companyId);
  // Desempleados C.A. es solo el CONTENEDOR de gente sin empleo: se muestra en
  // su propia sección (Respaldo), no como una empresa más.
  const empresasReales = empresas.filter((e) => !esDesempleados(e.id));
  const desempleados = empresas.find((e) => esDesempleados(e.id)) ?? null;
  const enRespaldo = desempleados ? usuariosDe(desempleados.id) : [];
  // Gente cuya empresa ya no existe (p. ej. fue eliminada): visible, no huérfana.
  const sinEmpresa = usuarios.filter(
    (u) => !esAdminFom(u.role) && (!u.companyId || !empresas.some((e) => e.id === u.companyId)),
  );

  // Tipo del ente de un usuario (para etiquetar su rol como "Supervisor" en una
  // compañía o "Administrador" en una contratista/empresa).
  const tipoDe = (cid?: string) => empresas.find((e) => e.id === cid)?.tipo;

  // Búsqueda: cuando hay texto, se aplana a TODOS los usuarios que coinciden
  // (nombre, correo o rol) en vez de la vista agrupada por empresa.
  const nq = normalizar(q);
  const resultados = nq
    ? usuarios.filter((u) => normalizar(`${u.name} ${u.email} ${etiquetaRol(u.role, tipoDe(u.companyId))}`).includes(nq))
    : [];

  function toggleEmpresa(id: string) {
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  /** Borra los usuarios tildados: los del Respaldo (ya sin empleo) se borran de
   *  forma DEFINITIVA; el resto pasa a Desempleados C.A. Los admin FOM nunca se
   *  tocan. Cada borrado queda en la auditoría uno por uno, todos con la MISMA
   *  hora exacta (una sola acción). */
  function eliminarSeleccion() {
    if (ocupado || sel.cantidad === 0) return;
    const elegidos = usuarios.filter((u) => sel.esta(u.id) && !esAdminFom(u.role));
    if (elegidos.length === 0) return;
    const aBorrar = desempleados ? elegidos.filter((u) => u.companyId === desempleados.id) : [];
    const aRespaldo = elegidos.filter((u) => !aBorrar.includes(u));
    const partes: string[] = [];
    if (aRespaldo.length) partes.push(`${aRespaldo.length} ${aRespaldo.length === 1 ? 'pasa' : 'pasan'} a Desempleados C.A.`);
    if (aBorrar.length) partes.push(`${aBorrar.length} se ${aBorrar.length === 1 ? 'borra' : 'borran'} permanentemente`);
    confirmar({
      titulo: `Eliminar ${elegidos.length} usuario${elegidos.length === 1 ? '' : 's'}`,
      mensaje: `${partes.join(' · ')}. No se puede deshacer.`,
      accion: 'Eliminar',
      onConfirmar: async () => {
        setOcupado(true);
        setAviso(null);
        const fecha = new Date().toISOString();
        const res = await Promise.allSettled([
          ...aRespaldo.map((u) => eliminarUsuario(u.id, { fecha })),
          ...aBorrar.map((u) => eliminarUsuarioDefinitivo(u.id, { fecha })),
        ]);
        const fallidos = res.filter((r) => r.status === 'rejected').length;
        setOcupado(false);
        sel.cancelar();
        recargar();
        if (fallidos) setAviso(`No se pudieron eliminar ${fallidos} de ${elegidos.length}. Intenta de nuevo.`);
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

  /** Fila de una persona: lápiz para EDITAR (CRUD) y ojo para VER el perfil.
   *  `tipo` es el del ente al que pertenece (define si el rol se llama
   *  "Administrador" o "Supervisor"). */
  function renderUsuario(u: User, conBorde: boolean, tipo?: CompanyTipo) {
    // Los admin FOM no se eliminan desde aquí: no son tildables.
    const seleccionable = !esAdminFom(u.role);
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
        {sel.activo && seleccionable ? (
          <Checkbox checked={sel.esta(u.id)} onPress={() => sel.alternar(u.id)} label={`Seleccionar ${u.name}`} />
        ) : null}
        <View style={styles.flex1}>
          <ThemedText variant="button">{u.name}</ThemedText>
          <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
            {u.email}
          </ThemedText>
        </View>
        <Chip tone="textMuted" label={etiquetaRol(u.role, tipo)} />
        {sel.activo ? null : (
          <>
            <IconoAccion
              icono="ver"
              etiqueta={`Ver el perfil de ${u.name}`}
              onPress={() =>
                router.navigate({ pathname: '/ver-perfil', params: { userId: u.id, nombre: u.name, email: u.email, role: u.role, ...(tipo ? { companyTipo: tipo } : {}) } })
              }
            />
            {/* Los admin FOM no se editan desde aquí: solo se ven. */}
            {esAdminFom(u.role) ? null : (
              <IconoAccion
                icono="editar"
                etiqueta={`Editar a ${u.name}`}
                onPress={() => router.navigate({ pathname: '/editar-usuario', params: { userId: u.id } })}
              />
            )}
          </>
        )}
      </>
    );
    // En selección, la fila del usuario tildable alterna al tocarla.
    return sel.activo && seleccionable ? (
      <PressableScale
        key={u.id}
        onPress={() => sel.alternar(u.id)}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar ${u.name}`}
        style={rowStyle}>
        {contenido}
      </PressableScale>
    ) : (
      <View key={u.id} style={rowStyle}>
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
            <ThemedText variant="title">Usuarios</ThemedText>
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
                <PillButton label="+ Crear usuario" tone="primary" onPress={() => setEmpresaPicker(true)} />
              </>
            )}
          </View>
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar los usuarios." onRetry={recargar} />
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
            <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por nombre, correo o rol…" />

            {aviso ? (
              <Card>
                <ThemedText variant="caption" color="danger">
                  {aviso}
                </ThemedText>
              </Card>
            ) : null}

            {nq ? (
              /* ── RESULTADOS DE BÚSQUEDA (planos, todos los grupos) ── */
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  {`Resultados (${resultados.length})`}
                </ThemedText>
                {resultados.length === 0 ? (
                  <Card>
                    <ThemedText variant="caption" color="textMuted">
                      {`Ningún usuario coincide con “${q}”.`}
                    </ThemedText>
                  </Card>
                ) : (
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {resultados.map((u, i) => renderUsuario(u, i > 0, tipoDe(u.companyId)))}
                  </Card>
                )}
              </View>
            ) : (
              <>
            {/* ── LOS 3 ADMIN DEL SISTEMA ─────────────────────────────── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Administración FOM
              </ThemedText>
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {admins.map((u, i) => (
                  <PressableScale
                    key={u.id}
                    onPress={() =>
                      router.navigate({ pathname: '/ver-perfil', params: { userId: u.id, nombre: u.name, email: u.email, role: u.role } })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ver el perfil de ${u.name}`}
                    style={[
                      styles.row,
                      {
                        gap: spacing.md,
                        paddingVertical: spacing.md,
                        borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      },
                    ]}>
                    <View style={styles.flex1}>
                      <ThemedText variant="button">{u.name}</ThemedText>
                      <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                        {u.email}
                      </ThemedText>
                    </View>
                    <Chip tone="info" label="Admin FOM" />
                    <ThemedText variant="body" color="textMuted">
                      ›
                    </ThemedText>
                  </PressableScale>
                ))}
              </Card>
            </View>

            {/* ── USUARIOS POR EMPRESA (tocar abre sus perfiles) ───────── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {`Usuarios por empresa (${empresasReales.length})`}
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
                  const gente = usuariosDe(e.id);
                  return (
                    <Card key={e.id} style={{ gap: 0, paddingVertical: spacing.xs }}>
                      <PressableScale
                        onPress={() => toggleEmpresa(e.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${abierta ? 'Ocultar' : 'Ver'} los perfiles de ${e.name}`}
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
                        <Chip tone="textMuted" label={`${gente.length}`} />
                        <ThemedText variant="body" color="textMuted">
                          {abierta ? '▾' : '›'}
                        </ThemedText>
                      </PressableScale>

                      {abierta ? (
                        <View>
                          {gente.length === 0 ? (
                            <ThemedText
                              variant="caption"
                              color="textMuted"
                              style={{ paddingVertical: spacing.sm }}>
                              Sin usuarios todavía.
                            </ThemedText>
                          ) : (
                            gente.map((u) => renderUsuario(u, true, e.tipo))
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
                                label="+ Añadir usuario"
                                tone="primary"
                                onPress={() =>
                                  router.navigate({ pathname: '/crear-usuario', params: { companyId: e.id } })
                                }
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

            {/* ── SIN EMPRESA (su empresa fue eliminada) ───────────────── */}
            {sinEmpresa.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Sin empresa
                </ThemedText>
                <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                  {sinEmpresa.map((u, i) => renderUsuario(u, i > 0))}
                </Card>
                <ThemedText variant="caption" color="textMuted">
                  Su empresa ya no existe: no pueden entrar hasta que los reasignes.
                </ThemedText>
              </View>
            ) : null}

            {/* ── RESPALDO: Desempleados C.A. — NO es una empresa, es el
                contenedor de la gente eliminada de su ente. Aquí se guardan
                (sin poder entrar a la app) hasta reasignarlos con el lápiz. ── */}
            {desempleados ? (
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  {`Respaldo · ${desempleados.name} (${enRespaldo.length})`}
                </ThemedText>
                {enRespaldo.length === 0 ? (
                  <Card>
                    <ThemedText variant="caption" color="textMuted">
                      Vacío. Aquí caen los usuarios que elimines de su empresa: se conservan para
                      poder reasignarlos después sin volver a crearlos.
                    </ThemedText>
                  </Card>
                ) : (
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {enRespaldo.map((u, i) => renderUsuario(u, i > 0))}
                  </Card>
                )}
                <ThemedText variant="caption" color="textMuted">
                  Sin empleo: no pueden entrar a la app. Con el lápiz, asígnalos a una empresa para
                  reactivarlos.
                </ThemedText>
              </View>
            ) : null}

            <ThemedText variant="caption" color="textMuted">
              Toca una ente para ver sus perfiles. En cada persona: el ojo abre su perfil completo
              (solo lectura) y el lápiz entra a editarla (datos, ente, perfil o eliminarla).
            </ThemedText>
              </>
            )}
          </ScrollView>
        )}

        {/* Elegir empresa para el usuario nuevo (sin la ente de respaldo). */}
        <OptionPickerModal
          visible={empresaPicker}
          title="¿De qué empresa será el usuario?"
          options={empresas.filter((e) => !esDesempleados(e.id)).map((e) => ({ id: e.id, label: e.name }))}
          selectedIds={[]}
          onChange={(ids) => {
            const id = ids[0];
            if (id) {
              setEmpresaPicker(false);
              router.navigate({ pathname: '/crear-usuario', params: { companyId: id } });
            }
          }}
          onClose={() => setEmpresaPicker(false)}
        />

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
