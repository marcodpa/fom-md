import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { componerTelefono, PAIS_POR_DEFECTO, PAISES, paisPorCodigo } from '@/lib/paises';
import { validarClave, validarEmail, validarLetras, validarTelefono } from '@/lib/validate';
import { crearUsuarioConRol, getTipoEmpresa, type RolAsignable } from '@/services';
import { useTheme } from '@/theme';
import { PickerField, OptionPickerModal } from '@/components/option-picker';
import type { CompanyTipo, User } from '@/types';

/**
 * Perfiles asignables según el TIPO de ente. Regla del producto: el
 * ADMINISTRADOR crea y edita todo en su ente; el SUPERVISOR es de solo
 * lectura (paneles y reportes). Una compañía admite ambos + conductores
 * (puede operar su propia flota); una cuenta personal, perfiles personales.
 */
const OPCIONES_POR_TIPO: Record<CompanyTipo, { value: RolAsignable; label: string }[]> = {
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

/** Qué vista y permisos da cada perfil (se muestra bajo el selector). */
const ROL_CAPTION: Record<RolAsignable, string> = {
  conductor: 'Vista de conducción: inspección, mantenimiento y su unidad.',
  supervisor_company:
    'Administra su ente: crea y edita USUARIOS y asigna conductores a los vehículos. En una COMPAÑÍA además gestiona a sus contratistas asociadas (reportes, comparativas e histórico). Los vehículos los da de alta la administración FOM.',
  supervisor_personal: 'Administra la cuenta personal: sus vehículos y sus usuarios.',
  usuario_personal: 'Ve los vehículos y datos de la cuenta personal.',
};

/**
 * CREAR USUARIO — pantalla propia, igual que el alta de vehículo (directriz
 * PDF-3/4). Regla de permisos del producto: SOLO los admin FOM (Juan, Marco,
 * Juan P.) eligen el ROL/perfil (qué vista y permisos tendrá la persona); un
 * supervisor de empresa solo crea CONDUCTORES de su propia empresa. La persona
 * entra con su email y clave, y en su primer ingreso rellena su formato con
 * todos sus datos; su clave la puede cambiar luego desde el login (correo).
 */
export default function CrearUsuarioScreen() {
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || '';

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [paisCodigo, setPaisCodigo] = useState(PAIS_POR_DEFECTO.codigo);
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('Flotas2026..');
  const [role, setRole] = useState<RolAsignable>('conductor');
  const [paisPicker, setPaisPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [creado, setCreado] = useState<User | null>(null);

  const pais = paisPorCodigo(paisCodigo);

  // El tipo de empresa define QUÉ perfiles se pueden crear en ella; el tipo
  // del ente del CREADOR define su alcance (una compañía elige perfiles).
  const { data: tipos } = useAsyncData(
    () => Promise.all([getTipoEmpresa(companyId), getTipoEmpresa(user?.companyId ?? '')]),
    [companyId, user?.companyId],
  );
  const [tipo, tipoCreador] = tipos ?? [null, null];

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user) || !companyId) return <Redirect href="/" />;

  // Eligen perfil: los admin FOM (donde sea) y el ADMINISTRADOR de una
  // compañía (en su compañía y sus asociadas). El administrador de una
  // contratista crea conductores y punto.
  const puedeElegirRol = esMultiempresa(user) || tipoCreador === 'predefinida';
  const opciones = OPCIONES_POR_TIPO[tipo ?? 'estandar'];
  // Si el tipo cargó y el rol elegido no aplica, cae al primero válido.
  const roleEfectivo = opciones.some((o) => o.value === role) ? role : opciones[0].value;

  /** Valida cada casilla; devuelve true si todo está bien. */
  function validar(): boolean {
    const e: Record<string, string | null> = {};
    e.nombre = validarLetras(nombre, 'El nombre');
    e.apellido = validarLetras(apellido, 'El apellido');
    e.email = validarEmail(email);
    e.telefono = validarTelefono(telefono, pais.longitud);
    e.clave = validarClave(clave);
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  async function onCrear() {
    if (creando) return;
    setError(null);
    if (!validar()) return;
    setCreando(true);
    try {
      const nuevo = await crearUsuarioConRol({
        companyId,
        nombre: `${nombre.trim()} ${apellido.trim()}`,
        email,
        password: clave,
        role: puedeElegirRol ? roleEfectivo : 'conductor',
        telefono: componerTelefono(pais.discado, telefono),
      });
      setCreado(nuevo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el usuario.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Nuevo usuario" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {creado ? (
              /* ── Creado ✓: credenciales listas para entregar. ── */
              <View style={[styles.successCenter, { gap: spacing.lg }]}>
                <View style={[styles.successDot, { backgroundColor: colors.successSurface }]}>
                  <ThemedText variant="title" color="success">
                    ✓
                  </ThemedText>
                </View>
                <View style={{ gap: spacing.xs, alignItems: 'center' }}>
                  <ThemedText variant="title" style={styles.center}>
                    Usuario creado
                  </ThemedText>
                  <Chip tone="success" label="Listo para entrar" />
                </View>
                <Card style={[styles.fullWidth, { gap: spacing.sm }]}>
                  <ThemedText variant="body">{creado.name}</ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {`Email: ${creado.email}`}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {`Clave: ${clave.trim() || 'Flotas2026..'}`}
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    Entrégale sus credenciales. Al entrar por primera vez rellenará su formato con
                    todos sus datos (cédula, licencia, carta médica).
                  </ThemedText>
                </Card>
                <Button label="Listo" onPress={() => router.back()} style={styles.fullWidth} />
              </View>
            ) : (
              /* ── Formulario: datos de la persona + su clave. ── */
              <Card style={{ gap: spacing.md }}>
                {/* El perfil define su vista y sus permisos (solo admin FOM). */}
                {puedeElegirRol ? (
                  <View style={{ gap: spacing.sm }}>
                    <ThemedText variant="overline" color="textMuted">
                      Perfil del usuario
                    </ThemedText>
                    {opciones.length === 1 ? (
                      // Empresa GENERAL: un solo perfil posible, sin selector.
                      <Chip tone="info" label={opciones[0].label} />
                    ) : (
                      <SegmentedControl options={opciones} value={roleEfectivo} onChange={setRole} />
                    )}
                    <ThemedText variant="caption" color="textMuted">
                      {ROL_CAPTION[roleEfectivo]}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText variant="caption" color="textMuted">
                    Como administrador, creas CONDUCTORES de tu empresa. Los demás perfiles los
                    asigna la administración de FOM.
                  </ThemedText>
                )}
                <TextField
                  label="Nombre"
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Pedro"
                  editable={!creando}
                  error={errores.nombre ?? undefined}
                />
                <TextField
                  label="Apellido"
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder="Villalobos"
                  editable={!creando}
                  error={errores.apellido ?? undefined}
                />
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@empresa.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!creando}
                  error={errores.email ?? undefined}
                />

                {/* Teléfono: país (código) + número (solo dígitos). */}
                <View style={{ gap: spacing.xs }}>
                  <PickerField label="País" value={`${pais.bandera} ${pais.nombre} (${pais.discado})`} onPress={() => setPaisPicker(true)} disabled={creando} />
                  <TextField
                    label="Teléfono"
                    value={telefono}
                    onChangeText={(t) => setTelefono(t.replace(/\D/g, ''))}
                    placeholder={`${pais.longitud} dígitos`}
                    keyboardType="phone-pad"
                    inputMode="numeric"
                    editable={!creando}
                    error={errores.telefono ?? undefined}
                  />
                </View>

                <TextField
                  label="Contraseña"
                  value={clave}
                  onChangeText={setClave}
                  placeholder="Mín. 8, una mayúscula, un número y un símbolo"
                  autoCapitalize="none"
                  secureTextEntry
                  editable={!creando}
                  error={errores.clave ?? undefined}
                />
                {error ? (
                  <ThemedText variant="caption" color="danger">
                    {error}
                  </ThemedText>
                ) : null}
                <Button
                  label={creando ? 'Creando…' : 'Crear usuario'}
                  onPress={onCrear}
                  loading={creando}
                  disabled={!nombre.trim() || !apellido.trim() || !email.trim() || !clave.trim() || !telefono.trim()}
                />
                <ThemedText variant="caption" color="textMuted">
                  La persona entra con este email y clave; su perfil (formato con todos sus datos)
                  lo llena ella en su primer ingreso.
                </ThemedText>
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

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
  successCenter: { alignItems: 'center', paddingTop: 24 },
  successDot: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
});
