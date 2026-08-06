import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, puedeGestionarA, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { confirmar } from '@/lib/confirmar';
import { componerTelefono, PAIS_POR_DEFECTO, PAISES, paisPorCodigo, separarTelefono } from '@/lib/paises';
import { validarClave, validarEmail, validarLetras, validarTelefono } from '@/lib/validate';
import {
  actualizarUsuario,
  cambiarClaveUsuario,
  eliminarUsuario,
  eliminarUsuarioDefinitivo,
  esDesempleados,
  getEmpresasSistema,
  listarUsuariosSistema,
  type RolAsignable,
} from '@/services';
import { useTheme } from '@/theme';
import type { Company, CompanyTipo, Role } from '@/types';

/** Perfiles válidos según el TIPO del ente elegido (misma regla del alta). */
const OPCIONES_ROL_POR_TIPO: Record<CompanyTipo, { value: RolAsignable; label: string }[]> = {
  estandar: [
    { value: 'conductor', label: 'Conductor' },
    { value: 'supervisor_company', label: 'Administrador' },
  ],
  // En una compañía, administrador y supervisor son lo mismo: un solo rol
  // "Supervisor" (con poder de administrar a su compañía y sus asociadas).
  predefinida: [{ value: 'supervisor_company', label: 'Supervisor' }],
  personal: [
    { value: 'supervisor_personal', label: 'Supervisor personal' },
    { value: 'usuario_personal', label: 'Usuario personal' },
  ],
};

function esAdminFom(role: Role): boolean {
  return role === 'admin' || role === 'superAdmin';
}

/**
 * EDITAR USUARIO — el CRUD completo sobre una persona ya creada: su
 * información (nombre, email), su ENTE (moverla de empresa o dejarla sin
 * empresa), su PERFIL, y eliminarla del sistema. El admin FOM alcanza a
 * todos; un administrador de compañía, a su compañía y sus asociadas; un
 * administrador de contratista o cuenta personal, solo a su gente (el
 * servidor valida el alcance de nuevo).
 */
export default function EditarUsuarioScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId || '';

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [usuarios, empresas] = await Promise.all([listarUsuariosSistema(), getEmpresasSistema()]);
      return { usuarios, empresas };
    },
    [userId],
    { onFocus: true },
  );

  // Formulario (se precarga UNA vez por usuario; el refetch no pisa lo editado).
  const [cargadoId, setCargadoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [paisCodigo, setPaisCodigo] = useState(PAIS_POR_DEFECTO.codigo);
  const [telefono, setTelefono] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<RolAsignable>('conductor');
  const [empresaPicker, setEmpresaPicker] = useState(false);
  const [paisPicker, setPaisPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [ocupado, setOcupado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cambiar la clave de este usuario (solo admin FOM).
  const [claveNueva, setClaveNueva] = useState('');
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [claveOk, setClaveOk] = useState(false);
  const [claveError, setClaveError] = useState<string | null>(null);

  const objetivo = data?.usuarios.find((u) => u.id === userId) ?? null;

  useEffect(() => {
    if (objetivo && cargadoId !== objetivo.id) {
      setNombre(objetivo.name);
      setEmail(objetivo.email);
      setCedula(objetivo.cedula ?? '');
      const tel = separarTelefono(objetivo.telefono ?? '');
      setPaisCodigo(tel.codigo);
      setTelefono(tel.numero);
      setCompanyId(objetivo.companyId ?? null);
      const r = objetivo.role;
      if (
        r === 'conductor' ||
        r === 'supervisor_company' ||
        r === 'supervisor_personal' ||
        r === 'usuario_personal'
      ) {
        setRole(r);
      }
      setCargadoId(objetivo.id);
    }
  }, [objetivo, cargadoId]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Editan: admin FOM, administradores de ente y supervisores personales.
  if (!esAdmin(user) && user.role !== 'supervisor_personal') return <Redirect href="/" />;
  // Uno NO se edita a sí mismo desde aquí (ni cambia su rol, ni se elimina de
  // su ente): sus datos propios van por "Mi perfil". Y solo se administra a
  // rangos MENORES — nunca a un par ni a alguien por encima.
  if (objetivo && !puedeGestionarA(user, objetivo)) {
    return <Redirect href={objetivo.id === user.id ? '/mi-perfil' : '/'} />;
  }

  const esFom = esMultiempresa(user);
  const empresas = data?.empresas ?? [];

  // ENTES al alcance del que edita (el servidor lo re-valida).
  // Destinos donde se puede COLOCAR a la persona. Nunca "Desempleados C.A.":
  // a ese respaldo solo se llega con el botón Eliminar.
  const propia = empresas.find((e) => e.id === user.companyId);
  const alcance: Company[] = (
    esFom
      ? empresas
      : propia
        ? propia.tipo === 'predefinida'
          ? [propia, ...empresas.filter((e) => e.predefinidaIds?.includes(propia.id))]
          : [propia]
        : []
  ).filter((e) => !esDesempleados(e.id));
  const puedeMover = esFom || alcance.length > 1;

  const empresaActual = companyId ? empresas.find((e) => e.id === companyId) : null;
  const tipoActual: CompanyTipo = empresaActual?.tipo ?? 'estandar';
  const opcionesRol = OPCIONES_ROL_POR_TIPO[tipoActual];
  const roleEfectivo = opcionesRol.some((o) => o.value === role) ? role : opcionesRol[0].value;

  const pais = paisPorCodigo(paisCodigo);

  /** Valida la información editable (mismo criterio que el alta). */
  function validar(): boolean {
    const e: Record<string, string | null> = {};
    // Nombre/teléfono se validan SOLO si cambiaron: un valor preexistente
    // (creado sin este validador) no debe bloquear editar los demás datos.
    if (!nombre.trim()) e.nombre = 'Escribe el nombre y apellido.';
    else if (nombre.trim() !== (objetivo?.name ?? '').trim()) e.nombre = validarLetras(nombre, 'El nombre y apellido');
    e.email = validarEmail(email);
    // La cédula es opcional aquí; si la escriben, debe incluir números.
    if (cedula.trim() && !/\d/.test(cedula)) e.cedula = 'La cédula debe incluir números.';
    const telCompuesto = telefono.trim() ? componerTelefono(pais.discado, telefono) : '';
    if (telefono.trim() && telCompuesto !== (objetivo?.telefono ?? '')) e.telefono = validarTelefono(telefono, pais.longitud);
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  async function onGuardar() {
    if (ocupado || !objetivo) return;
    setError(null);
    setGuardado(false);
    if (!validar()) return;
    setOcupado(true);
    try {
      const cambioEmpresa = (objetivo.companyId ?? null) !== companyId;
      // El rol solo se manda si el admin lo CAMBIÓ (tocó el selector) o si se
      // mueve de ente (debe encajar en el tipo nuevo). Sin eso NO se re-envía:
      // así editar solo el teléfono de un usuario no le cambia el perfil en
      // silencio por el auto-ajuste de opciones del selector.
      const cambioRol = role !== objetivo.role;
      const rolFinal = (cambioRol || cambioEmpresa) && companyId ? roleEfectivo : undefined;
      // Teléfono compuesto ("+58 4141234567"); vacío = se limpia.
      const telefonoFinal = telefono.trim() ? componerTelefono(pais.discado, telefono) : '';
      await actualizarUsuario({
        userId,
        nombre: nombre.trim() !== objetivo.name ? nombre : undefined,
        email: email.trim().toLowerCase() !== objetivo.email ? email : undefined,
        cedula: cedula.trim() !== (objetivo.cedula ?? '') ? cedula : undefined,
        telefono: telefonoFinal !== (objetivo.telefono ?? '') ? telefonoFinal : undefined,
        ...(cambioEmpresa ? { companyId } : {}),
        role: rolFinal && rolFinal !== objetivo.role ? rolFinal : undefined,
      });
      setGuardado(true);
      // El formulario ya refleja lo guardado; NO se resetea cargadoId porque
      // re-precargaría con la data en caché (aún la vieja) durante la recarga.
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setOcupado(false);
    }
  }

  async function onCambiarClave() {
    if (cambiandoClave) return;
    setClaveError(null);
    setClaveOk(false);
    // Misma regla fuerte que el alta: 8+, mayúscula, número y carácter especial.
    const errClave = validarClave(claveNueva);
    if (errClave) {
      setClaveError(errClave);
      return;
    }
    setCambiandoClave(true);
    try {
      await cambiarClaveUsuario(userId, claveNueva);
      setClaveNueva('');
      setClaveOk(true);
    } catch (e) {
      setClaveError(e instanceof Error ? e.message : 'No se pudo cambiar la clave.');
    } finally {
      setCambiandoClave(false);
    }
  }

  function onEliminar() {
    if (!objetivo) return;
    confirmar({
      titulo: 'Eliminar de su empresa',
      mensaje: `${objetivo.name} sale de su empresa y pasa a Desempleados C.A. (respaldo, solo visible para FOM). Su cuenta NO se borra: podrá reasignarse después.`,
      accion: 'Eliminar',
      onConfirmar: async () => {
        setError(null);
        setOcupado(true);
        try {
          await eliminarUsuario(userId);
          router.back();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo eliminar.');
          setOcupado(false);
        }
      },
    });
  }

  /** Borrado PERMANENTE (solo desde el respaldo, solo admin FOM). */
  function onEliminarDefinitivo() {
    if (!objetivo) return;
    confirmar({
      titulo: 'Eliminar definitivamente',
      mensaje: `Se BORRA la cuenta de ${objetivo.name} por completo: su acceso y todo su perfil. Esto NO se puede deshacer. Hazlo solo si de verdad no volverá.`,
      accion: 'Eliminar definitivamente',
      onConfirmar: async () => {
        setError(null);
        setOcupado(true);
        try {
          await eliminarUsuarioDefinitivo(userId);
          router.back();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta.');
          setOcupado(false);
        }
      },
    });
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={objetivo?.name ?? 'Usuario'} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          {estado === 'error' ? (
            <ErrorState description="No pudimos cargar el usuario." onRetry={recargar} />
          ) : !data ? (
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <Skeleton height={220} radius={16} />
              <Skeleton height={90} radius={16} />
            </View>
          ) : !objetivo ? (
            <ErrorState description="Ese usuario ya no existe." onRetry={() => router.back()} />
          ) : esAdminFom(objetivo.role) ? (
            <View style={[styles.content, { padding: spacing.lg }]}>
              <Card>
                <ThemedText variant="caption" color="textMuted">
                  Los administradores FOM no se editan desde aquí.
                </ThemedText>
              </Card>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              keyboardShouldPersistTaps="handled">
              {/* ── SU INFORMACIÓN ── */}
              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="overline" color="textMuted">
                    Información
                  </ThemedText>
                  {guardado ? <Chip tone="success" label="Guardado ✓" /> : null}
                </View>
                <TextField
                  label="Nombre y apellido"
                  value={nombre}
                  onChangeText={setNombre}
                  editable={!ocupado}
                  error={errores.nombre ?? undefined}
                />
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!ocupado}
                  error={errores.email ?? undefined}
                />
                <TextField
                  label="Cédula"
                  value={cedula}
                  onChangeText={setCedula}
                  placeholder="V-12.345.678"
                  autoCapitalize="characters"
                  editable={!ocupado}
                  error={errores.cedula ?? undefined}
                />

                {/* Teléfono: país (código) + número (solo dígitos), como el alta. */}
                <View style={{ gap: spacing.xs }}>
                  <PickerField
                    label="País"
                    value={`${pais.bandera} ${pais.nombre} (${pais.discado})`}
                    onPress={() => setPaisPicker(true)}
                    disabled={ocupado}
                  />
                  <TextField
                    label="Teléfono"
                    value={telefono}
                    onChangeText={(t) => setTelefono(t.replace(/\D/g, ''))}
                    placeholder={`${pais.longitud} dígitos`}
                    keyboardType="phone-pad"
                    inputMode="numeric"
                    editable={!ocupado}
                    error={errores.telefono ?? undefined}
                  />
                </View>
              </Card>

              {/* ── SU ENTE Y SU PERFIL ── */}
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  Ente y perfil
                </ThemedText>
                {puedeMover ? (
                  <PickerField
                    label="Empresa"
                    value={companyId ? (empresaActual?.name ?? companyId) : 'Sin empresa'}
                    onPress={() => setEmpresaPicker(true)}
                    disabled={ocupado}
                  />
                ) : (
                  <ThemedText variant="caption" color="textMuted">
                    {`Empresa: ${empresaActual?.name ?? '—'}`}
                  </ThemedText>
                )}
                {companyId ? (
                  <SegmentedControl options={opcionesRol} value={roleEfectivo} onChange={setRole} />
                ) : (
                  <ThemedText variant="caption" color="warning">
                    Sin empresa no puede entrar a la app. Asígnale una para reactivarlo.
                  </ThemedText>
                )}
              </Card>

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}

              <Button label={ocupado ? 'Guardando…' : 'Guardar cambios'} onPress={onGuardar} loading={ocupado} />

              {/* ── CONTRASEÑA (solo admin FOM): fijarle una clave nueva. Nunca
                  a otro admin FOM (el objetivo no lo es: los admin no se editan
                  aquí). ── */}
              {esFom ? (
                <Card style={{ gap: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="overline" color="textMuted">
                      Contraseña
                    </ThemedText>
                    {claveOk ? <Chip tone="success" label="Cambiada ✓" /> : null}
                  </View>
                  <TextField
                    label="Nueva contraseña"
                    value={claveNueva}
                    onChangeText={setClaveNueva}
                    placeholder="8+, mayúscula, número y especial"
                    autoCapitalize="none"
                    secureTextEntry
                    editable={!cambiandoClave}
                  />
                  {claveError ? (
                    <ThemedText variant="caption" color="danger">
                      {claveError}
                    </ThemedText>
                  ) : null}
                  <Button
                    label={cambiandoClave ? 'Cambiando…' : 'Cambiar contraseña'}
                    variant="secondary"
                    onPress={onCambiarClave}
                    loading={cambiandoClave}
                    disabled={!claveNueva.trim()}
                  />
                  <ThemedText variant="caption" color="textMuted">
                    La persona entrará con esta clave nueva. También puede recuperarla sola por
                    correo desde el login.
                  </ThemedText>
                </Card>
              ) : null}

              {/* ── ZONA PELIGROSA: un solo "Eliminar" — sale de su empresa y
                  pasa a Desempleados C.A.; la cuenta NO se borra de la BD. ── */}
              {esDesempleados(objetivo.companyId) ? (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="caption" color="textMuted">
                    Esta persona está en el respaldo (Desempleados C.A.). Asígnale una empresa arriba
                    para reactivarla.
                  </ThemedText>
                  {/* Borrado permanente: solo la administración FOM y solo aquí. */}
                  {esFom ? (
                    <View style={{ gap: spacing.sm }}>
                      <ThemedText variant="overline" color="danger">
                        Zona peligrosa
                      </ThemedText>
                      <Button
                        label="Eliminar definitivamente"
                        variant="danger"
                        onPress={onEliminarDefinitivo}
                        disabled={ocupado}
                      />
                      <ThemedText variant="caption" color="textMuted">
                        Borra la cuenta por completo (acceso y perfil). No se puede deshacer.
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="overline" color="danger">
                    Zona peligrosa
                  </ThemedText>
                  <Button label="Eliminar" variant="danger" onPress={onEliminar} disabled={ocupado} />
                  <ThemedText variant="caption" color="textMuted">
                    Sale de su empresa y pasa a Desempleados C.A. (respaldo). Su cuenta se conserva
                    para poder reasignarla después.
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* Mover de ente (la salida "a ninguna" es el botón Eliminar, que lo
            manda a Desempleados C.A.). */}
        <OptionPickerModal
          visible={empresaPicker}
          title="¿A qué ente pertenece?"
          options={alcance.map((e) => ({ id: e.id, label: e.name }))}
          selectedIds={companyId ? [companyId] : []}
          onChange={(ids) => {
            const id = ids[0];
            if (!id) return;
            setEmpresaPicker(false);
            setCompanyId(id);
          }}
          onClose={() => setEmpresaPicker(false)}
        />

        {/* País del teléfono. */}
        <OptionPickerModal
          visible={paisPicker}
          title="País del teléfono"
          options={PAISES.map((p) => ({ id: p.codigo, label: `${p.bandera} ${p.nombre} (${p.discado})` }))}
          selectedIds={[paisCodigo]}
          onChange={(ids) => {
            const c = ids[0];
            if (c) setPaisCodigo(c);
            setPaisPicker(false);
          }}
          onClose={() => setPaisPicker(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
