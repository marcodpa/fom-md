import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { componerRif, componerTelefono, PAIS_POR_DEFECTO, PAISES, paisPorCodigo, TIPOS_RIF, type TipoRif } from '@/lib/paises';
import { validarEmail, validarRif, validarTelefono } from '@/lib/validate';
import { crearEmpresa, crearUsuarioConRol, getPredefinidas } from '@/services';
import { useTheme } from '@/theme';
import type { Company, CompanyTipo, User } from '@/types';

/** Significado de cada letra de RIF, para el selector. */
const RIF_LABEL: Record<TipoRif, string> = {
  J: 'J · Jurídico (empresa)',
  V: 'V · Venezolano',
  E: 'E · Extranjero',
  P: 'P · Pasaporte',
  G: 'G · Gobierno',
  C: 'C · Consejo comunal',
};

/** Qué es cada tipo de ente, explicado de un vistazo bajo el selector. */
const TIPO_CAPTION: Record<CompanyTipo, string> = {
  predefinida:
    'La ente general (ej. Chevron): puede tener contratistas y personales asignadas — ve sus reportes y paneles — y además operar su propia flota.',
  estandar: 'Empresa operativa con su flota; debe asignarse a una compañía existente (ej. Samfor → Chevron).',
  personal: 'Cuenta doméstica: familias u oficinas pequeñas que monitorean sus vehículos.',
};

/**
 * ALTA DE ENTE (FOM-02 §1.1, solo Admin FOM). Tres tipos: COMPAÑÍA (la
 * general, con asociadas y flota propia), CONTRATISTA (asignable a una
 * compañía) y PERSONAL (doméstica). Flujo: crear la ente → crear su
 * ADMINISTRADOR (o supervisor personal) → crear los vehículos (wizard §1.2).
 */
export default function CrearEmpresaScreen() {
  const { spacing, colors } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  // ── Empresa ──
  const [nombre, setNombre] = useState('');
  const [rifLetra, setRifLetra] = useState<TipoRif>('J');
  const [rifNumero, setRifNumero] = useState('');
  const [paisCodigo, setPaisCodigo] = useState(PAIS_POR_DEFECTO.codigo);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState<CompanyTipo>('predefinida');
  const [predefinidaIds, setPredefinidaIds] = useState<string[]>([]);
  const [predefPicker, setPredefPicker] = useState(false);
  const [rifPicker, setRifPicker] = useState(false);
  const [paisPicker, setPaisPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);
  const [empresa, setEmpresa] = useState<Company | null>(null);

  const pais = paisPorCodigo(paisCodigo);

  // ── Supervisor (§1.1 paso 2) ──
  const [supNombre, setSupNombre] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [creandoSup, setCreandoSup] = useState(false);
  const [supervisor, setSupervisor] = useState<User | null>(null);

  const [error, setError] = useState<string | null>(null);

  const { data: predefinidas } = useAsyncData(getPredefinidas, []);
  const predefTexto =
    predefinidaIds.length === 0
      ? 'Sin asignar (opcional)'
      : predefinidaIds
          .map((id) => predefinidas?.find((p) => p.id === id)?.name ?? id)
          .join(', ');

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Dar de alta empresas es del Admin (§1.1).
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  /** Valida cada casilla; devuelve true si todo está bien. */
  function validar(): boolean {
    const e: Record<string, string | null> = {};
    if (!nombre.trim()) e.nombre = 'Ponle nombre a la empresa.';
    e.rif = validarRif(rifNumero);
    e.telefono = validarTelefono(telefono, pais.longitud);
    e.email = validarEmail(email);
    // Una contratista debe pertenecer a una compañía; personal es opcional.
    if (tipo === 'estandar' && predefinidaIds.length === 0) {
      e.tipo = 'Una contratista debe asignarse a una compañía existente.';
    }
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  async function onCrearEmpresa() {
    if (creandoEmpresa) return;
    setError(null);
    if (!validar()) return;
    setCreandoEmpresa(true);
    try {
      const c = await crearEmpresa({
        name: nombre,
        rif: componerRif(rifLetra, rifNumero),
        telefono: componerTelefono(pais.discado, telefono),
        email,
        tipo,
        predefinidaIds: predefinidaIds.length > 0 ? predefinidaIds : undefined,
      });
      setEmpresa(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la empresa.');
    } finally {
      setCreandoEmpresa(false);
    }
  }

  // El responsable del ente: cuenta personal → SUPERVISOR PERSONAL; compañía →
  // SUPERVISOR (admin y supervisor son lo mismo); contratista → ADMINISTRADOR.
  const tipoEnte = empresa?.tipo ?? tipo;
  const esPersonal = tipoEnte === 'personal';
  const tituloResponsable = esPersonal
    ? 'Supervisor personal'
    : tipoEnte === 'predefinida'
      ? 'Supervisor de la compañía'
      : 'Administrador de la empresa';

  async function onCrearSupervisor() {
    if (creandoSup || !empresa) return;
    setError(null);
    setCreandoSup(true);
    try {
      const s = await crearUsuarioConRol({
        companyId: empresa.id,
        nombre: supNombre,
        email: supEmail,
        role: empresa.tipo === 'personal' ? 'supervisor_personal' : 'supervisor_company',
      });
      setSupervisor(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el usuario.');
    } finally {
      setCreandoSup(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Nueva empresa" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {/* ── 1) CREAR EMPRESA ── */}
            <Card style={{ gap: spacing.md }}>
              <View style={styles.rowBetween}>
                <ThemedText variant="overline" color="textMuted">
                  1 · Empresa
                </ThemedText>
                {empresa ? <Chip tone="success" label="Creada" /> : null}
              </View>
              <TextField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Samfor" editable={!empresa} error={errores.nombre ?? undefined} />

              {/* RIF: tipo (letra) + dígitos (solo números). */}
              <View style={{ gap: spacing.xs }}>
                <PickerField label="Tipo de RIF" value={RIF_LABEL[rifLetra]} onPress={() => setRifPicker(true)} disabled={!!empresa} />
                <TextField
                  label="Número de RIF"
                  value={rifNumero}
                  onChangeText={(t) => setRifNumero(t.replace(/\D/g, ''))}
                  placeholder="301234567"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  editable={!empresa}
                  error={errores.rif ?? undefined}
                />
                {rifNumero ? (
                  <ThemedText variant="caption" color="textMuted">
                    {`Quedará como ${componerRif(rifLetra, rifNumero)}`}
                  </ThemedText>
                ) : null}
              </View>

              {/* Teléfono: país (código) + número (solo dígitos). */}
              <View style={{ gap: spacing.xs }}>
                <PickerField label="País" value={`${pais.bandera} ${pais.nombre} (${pais.discado})`} onPress={() => setPaisPicker(true)} disabled={!!empresa} />
                <TextField
                  label="Teléfono"
                  value={telefono}
                  onChangeText={(t) => setTelefono(t.replace(/\D/g, ''))}
                  placeholder={`${pais.longitud} dígitos`}
                  keyboardType="phone-pad"
                  inputMode="numeric"
                  editable={!empresa}
                  error={errores.telefono ?? undefined}
                />
              </View>

              <TextField
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="contacto@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!empresa}
                error={errores.email ?? undefined}
              />

              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Tipo de ente
                </ThemedText>
                <SegmentedControl
                  options={[
                    { value: 'predefinida', label: 'Compañía' },
                    { value: 'estandar', label: 'Contratista' },
                    { value: 'personal', label: 'Personal' },
                  ]}
                  value={tipo}
                  onChange={(t) => {
                    if (empresa) return;
                    setTipo(t);
                    // Una compañía no se asigna a otra compañía.
                    if (t === 'predefinida') setPredefinidaIds([]);
                  }}
                />
                <ThemedText variant="caption" color="textMuted">
                  {TIPO_CAPTION[tipo]}
                </ThemedText>
              </View>
              {tipo !== 'predefinida' ? (
                <View style={{ gap: spacing.xs }}>
                  <PickerField
                    label={tipo === 'estandar' ? 'Asignar a una compañía (obligatorio)' : 'Asignar a una compañía (opcional)'}
                    value={predefTexto}
                    onPress={() => setPredefPicker(true)}
                    disabled={!!empresa}
                  />
                  {errores.tipo ? (
                    <ThemedText variant="caption" color="danger">
                      {errores.tipo}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
              {!empresa ? (
                <Button
                  label={creandoEmpresa ? 'Creando…' : 'Crear empresa'}
                  onPress={onCrearEmpresa}
                  loading={creandoEmpresa}
                />
              ) : null}
            </Card>

            {/* ── 2) CREAR AL RESPONSABLE (administrador / supervisor personal) ── */}
            {empresa ? (
              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="overline" color="textMuted">
                    {`2 · ${tituloResponsable}`}
                  </ThemedText>
                  {supervisor ? <Chip tone="success" label="Invitado" /> : null}
                </View>
                {!supervisor ? (
                  <>
                    <ThemedText variant="caption" color="textMuted">
                      {esPersonal
                        ? 'Administra la cuenta: sus vehículos y sus usuarios.'
                        : 'Crea y edita todo en su ente: vehículos, usuarios, ODT. (El SUPERVISOR de solo lectura se crea después, desde Usuarios.)'}
                    </ThemedText>
                    <TextField label="Nombre" value={supNombre} onChangeText={setSupNombre} placeholder="Yeison" editable={!creandoSup} />
                    <TextField
                      label="Email"
                      value={supEmail}
                      onChangeText={setSupEmail}
                      placeholder="admin@empresa.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!creandoSup}
                    />
                    <Button
                      label={creandoSup ? 'Enviando…' : 'Crear e invitar'}
                      onPress={onCrearSupervisor}
                      loading={creandoSup}
                    />
                  </>
                ) : (
                  <ThemedText variant="caption" color="textSecondary">
                    {`${supervisor.name} (${tituloResponsable} · ${empresa.name}) recibió su invitación. Al entrar llenará su perfil: cédula, licencia y carta médica.`}
                  </ThemedText>
                )}
              </Card>
            ) : null}

            {/* ── 3) CREAR LOS VEHÍCULOS (§1.2, incluye el GPS) ── */}
            {empresa ? (
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  3 · Vehículos (con su GPS)
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary">
                  Cada vehículo se crea con su GPS instalado y verificado — sin GPS no se termina el
                  alta.
                </ThemedText>
                <Button label="Crear un vehículo" variant="secondary" onPress={() => router.navigate('/crear-vehiculo')} />
              </Card>
            ) : null}

            {empresa ? (
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="caption" color="textMuted">
                  {empresa.tipo === 'predefinida'
                    ? 'La compañía puede operar su propia flota Y ver los reportes y paneles de sus asociadas. Asígnale contratistas o personales al crearlas (o editándolas).'
                    : 'Cuando termines, el administrador toma el control: conductores, áreas, asignaciones y alertas.'}
                </ThemedText>
                <Button label="Listo" onPress={() => router.back()} />
              </View>
            ) : null}

            {error ? (
              <ThemedText variant="caption" color="danger">
                {error}
              </ThemedText>
            ) : null}

            {/* Nota de contraseña de demo, discreta y honesta. */}
            {supervisor ? (
              <ThemedText variant="caption" color="textMuted" style={{ color: colors.textMuted }}>
                Mock: la invitación deja la credencial lista con la contraseña de demo del equipo.
              </ThemedText>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <OptionPickerModal
          visible={predefPicker}
          title="Asignar a compañía(s)"
          options={(predefinidas ?? []).map((p) => ({ id: p.id, label: p.name }))}
          selectedIds={predefinidaIds}
          multiSelect
          onChange={setPredefinidaIds}
          onClose={() => setPredefPicker(false)}
        />

        {/* Tipo de RIF (la letra). */}
        <OptionPickerModal
          visible={rifPicker}
          title="Tipo de RIF"
          options={TIPOS_RIF.map((l) => ({ id: l, label: RIF_LABEL[l] }))}
          selectedIds={[rifLetra]}
          onChange={(ids) => {
            const l = ids[0] as TipoRif;
            if (l) setRifLetra(l);
            setRifPicker(false);
          }}
          onClose={() => setRifPicker(false)}
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
