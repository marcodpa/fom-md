import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/auth';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { LoginBackground } from '@/components/login-background';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GRADOS_LICENCIA, gradoPorValor } from '@/lib/licencias';
import { validarFecha, validarNumerico, vigenciaDeFecha } from '@/lib/validate';
import { completarPerfil } from '@/services';
import { useLoginDestino, useTenant } from '@/session';
import { useTheme } from '@/theme';

/** Formato de identificación: venezolana (V), extranjera (E) o internacional. */
type FormatoId = 'V' | 'E' | 'INT';

/** Aviso de vigencia bajo una fecha ya escrita (vencida / por vencer). */
function avisoVigencia(fecha: string): { texto: string; tono: 'danger' | 'warning' } | null {
  if (validarFecha(fecha)) return null;
  const v = vigenciaDeFecha(fecha);
  if (v === 'vencido') return { texto: 'Está vencida: al entrar no podrás manejar hasta renovarla.', tono: 'danger' };
  if (v === 'por_vencer') return { texto: 'Vence pronto (30 días o menos): renuévala a tiempo.', tono: 'warning' };
  return null;
}

/**
 * PERFIL OBLIGATORIO del primer ingreso (FOM-02 §3.1/§4.1/§5.1/§6.1): cédula,
 * licencia y carta médica. Nadie pasa a su superficie sin completarlo. Comparte
 * el lenguaje visual del login (fondo hero + tarjeta + entrada suave).
 */
export default function CompletarPerfilScreen() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { user, status } = useAuth();
  const { marcarPerfilCompleto } = useTenant();
  const destino = useLoginDestino();

  const [formatoId, setFormatoId] = useState<FormatoId>('V');
  const [cedulaNum, setCedulaNum] = useState('');
  const [licNumero, setLicNumero] = useState('');
  const [gradoValor, setGradoValor] = useState('');
  const [gradoLibre, setGradoLibre] = useState('');
  const [licVence, setLicVence] = useState('');
  const [cartaVence, setCartaVence] = useState('');
  const [gradoPicker, setGradoPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Con formato venezolano/extranjero se usan los GRADOS de licencia de
  // Venezuela (lista de solo selección); con internacional, texto libre.
  const esVE = formatoId === 'V' || formatoId === 'E';

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!destino) {
    return (
      <ThemedView style={[styles.root, styles.loaderCenter]}>
        <LoginBackground />
        <ActivityIndicator color={colors.primary} />
      </ThemedView>
    );
  }
  // Si el perfil ya no es el paso pendiente, avanza a la superficie del rol.
  if (destino !== '/completar-perfil') return <Redirect href={destino} />;

  function validar(): boolean {
    const e: Record<string, string | null> = {};
    // Cédula: solo dígitos; venezolana/extranjera 6–9, internacional ≥ 4.
    e.cedula = validarNumerico(cedulaNum, { campo: 'La cédula', min: esVE ? 6 : 4, max: esVE ? 9 : undefined });
    e.licNumero = validarNumerico(licNumero, { campo: 'La licencia', min: 4 });
    if (esVE && !gradoValor) e.grado = 'Elige el grado de tu licencia.';
    if (!esVE && !gradoLibre.trim()) e.grado = 'Indica el grado/categoría de tu licencia.';
    e.licVence = validarFecha(licVence);
    e.cartaVence = validarFecha(cartaVence);
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  async function guardar() {
    if (!user || guardando) return;
    setError(null);
    if (!validar()) return;
    setGuardando(true);
    try {
      await completarPerfil({
        userId: user.id,
        nombre: user.name,
        companyId: user.companyId,
        cedula: formatoId === 'INT' ? cedulaNum.trim() : `${formatoId}-${cedulaNum.trim()}`,
        licenciaNumero: licNumero.trim(),
        // El grado venezolano se guarda por su código ('1'..'5') para poder
        // filtrar qué vehículos puede manejar; el internacional, tal cual.
        licenciaCategoria: esVE ? gradoValor : gradoLibre.trim(),
        licenciaVence: licVence,
        cartaMedicaVence: cartaVence,
      });
      marcarPerfilCompleto(); // el destino recalcula y redirige a tu superficie
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu perfil.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <LoginBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}>
          {/* Hero: credencial + título */}
          <Appear style={styles.hero}>
            <View style={[styles.mark, shadows.card, { backgroundColor: colors.primary, borderRadius: radii.xl }]}>
              <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
                <Path d="M4 6h16v12H4z" stroke={colors.onPrimary} strokeWidth={1.8} strokeLinejoin="round" />
                <Circle cx={9} cy={11} r={2} stroke={colors.onPrimary} strokeWidth={1.6} />
                <Path d="M6.5 16c.5-1.5 1.6-2.3 2.5-2.3s2 .8 2.5 2.3" stroke={colors.onPrimary} strokeWidth={1.6} strokeLinecap="round" />
                <Path d="M14 10h4M14 13h4" stroke={colors.onPrimary} strokeWidth={1.6} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={{ gap: spacing.xs, alignItems: 'center' }}>
              <ThemedText variant="title" style={styles.center}>
                {`Hola, ${user.name.split(' ')[0]}`}
              </ThemedText>
              <ThemedText variant="body" color="textSecondary" style={styles.center}>
                Antes de empezar, completa tu perfil: cédula, licencia y carta médica.
              </ThemedText>
            </View>
          </Appear>

          {/* Tarjeta con el formulario */}
          <Appear
            delay={140}
            style={[
              styles.card,
              shadows.card,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg },
            ]}>
            {/* Formato de identificación (define el largo de la cédula y los grados). */}
            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="overline" color="textMuted">
                Identificación
              </ThemedText>
              <SegmentedControl
                options={[
                  { value: 'V', label: 'Venezolana' },
                  { value: 'E', label: 'Extranjera' },
                  { value: 'INT', label: 'Internacional' },
                ]}
                value={formatoId}
                onChange={(f) => setFormatoId(f)}
              />
            </View>
            <TextField
              label="Número de cédula"
              value={cedulaNum}
              onChangeText={(t) => setCedulaNum(t.replace(/\D/g, ''))}
              placeholder={esVE ? '12345678' : 'Solo números'}
              keyboardType="number-pad"
              inputMode="numeric"
              editable={!guardando}
              error={errores.cedula ?? undefined}
            />
            <TextField
              label="Licencia · número"
              value={licNumero}
              onChangeText={(t) => setLicNumero(t.replace(/\D/g, ''))}
              placeholder="Solo números"
              keyboardType="number-pad"
              inputMode="numeric"
              editable={!guardando}
              error={errores.licNumero ?? undefined}
            />

            {/* Grado de licencia: lista de Venezuela (solo selección) o libre. */}
            {esVE ? (
              <View style={{ gap: spacing.xs }}>
                <PickerField
                  label="Licencia · grado"
                  value={gradoPorValor(gradoValor)?.label ?? 'Elige el grado'}
                  onPress={() => setGradoPicker(true)}
                  disabled={guardando}
                />
                {errores.grado ? (
                  <ThemedText variant="caption" color="danger">
                    {errores.grado}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <TextField
                label="Licencia · grado/categoría"
                value={gradoLibre}
                onChangeText={setGradoLibre}
                placeholder="Categoría de tu país"
                editable={!guardando}
                error={errores.grado ?? undefined}
              />
            )}

            <View style={{ gap: spacing.xs }}>
              <TextField
                label="Licencia · vence"
                value={licVence}
                onChangeText={setLicVence}
                placeholder="AAAA-MM-DD"
                keyboardType="numbers-and-punctuation"
                editable={!guardando}
                error={errores.licVence ?? undefined}
              />
              {avisoVigencia(licVence) ? (
                <ThemedText variant="caption" color={avisoVigencia(licVence)!.tono}>
                  {avisoVigencia(licVence)!.texto}
                </ThemedText>
              ) : null}
            </View>

            <View style={{ gap: spacing.xs }}>
              <TextField
                label="Carta médica · vence"
                value={cartaVence}
                onChangeText={setCartaVence}
                placeholder="AAAA-MM-DD"
                keyboardType="numbers-and-punctuation"
                editable={!guardando}
                error={errores.cartaVence ?? undefined}
              />
              {avisoVigencia(cartaVence) ? (
                <ThemedText variant="caption" color={avisoVigencia(cartaVence)!.tono}>
                  {avisoVigencia(cartaVence)!.texto}
                </ThemedText>
              ) : null}
            </View>

            {error ? (
              <ThemedText variant="caption" color="danger">
                {error}
              </ThemedText>
            ) : null}
            <Button label={guardando ? 'Guardando…' : 'Guardar y continuar'} onPress={guardar} loading={guardando} />
            <ThemedText variant="caption" color="textMuted" style={styles.center}>
              Al entrar, sube las fotos o PDF de tu cédula, licencia y carta médica desde “Mi perfil
              → Mis documentos”; se guardan solo en tu cuenta.
            </ThemedText>
          </Appear>
        </ScrollView>

        {/* Grado de licencia (Venezuela): solo selección, sin escribir. */}
        <OptionPickerModal
          visible={gradoPicker}
          title="Grado de tu licencia"
          options={GRADOS_LICENCIA.map((g) => ({ id: g.value, label: g.label }))}
          selectedIds={gradoValor ? [gradoValor] : []}
          onChange={(ids) => {
            const g = ids[0];
            if (g) setGradoValor(g);
            setGradoPicker(false);
          }}
          onClose={() => setGradoPicker(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  center: { textAlign: 'center' },
  loaderCenter: { alignItems: 'center', justifyContent: 'center' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: 16 },
  mark: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  card: { alignSelf: 'stretch', borderWidth: StyleSheet.hairlineWidth },
});
