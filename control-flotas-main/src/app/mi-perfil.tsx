import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { etiquetaRol, useAuth } from '@/auth';
import { AvatarPicker } from '@/components/avatar-picker';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { ScoreRing } from '@/components/score-ring';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { subirFotoCloudinary } from '@/lib/cloudinary';
import { GRADOS_LICENCIA, gradoPorValor } from '@/lib/licencias';
import { componerTelefono, PAIS_POR_DEFECTO, PAISES, paisPorCodigo, separarTelefono } from '@/lib/paises';
import { validarFecha, validarLetras, validarNumerico, validarTelefono, vigenciaDeFecha } from '@/lib/validate';
import { actualizarMiPerfil, getDocumentosConductor, getMiPerfil, getMiScore } from '@/services';
import { useTheme, type ColorTokens } from '@/theme';
import type { DocumentoEstado, DriverScore } from '@/types';
import { formatFecha } from '@/utils/date';

/** Aviso de vigencia bajo una fecha ya escrita (vencida / por vencer). */
function avisoVigencia(fecha: string): { texto: string; tono: 'danger' | 'warning' } | null {
  if (!fecha.trim() || validarFecha(fecha)) return null;
  const v = vigenciaDeFecha(fecha);
  if (v === 'vencido') return { texto: 'Está vencida: renuévala para poder manejar.', tono: 'danger' };
  if (v === 'por_vencer') return { texto: 'Vence pronto (30 días o menos): renuévala a tiempo.', tono: 'warning' };
  return null;
}

/** Documento personal declarado (cédula/licencia/carta) con su info del perfil. */
type DocDeclarado = { tipo: string; sub?: string; vence?: string };

/** Chip de vigencia (Vigente / Por vencer / Vencido) de una fecha de vencimiento. */
function chipVigencia(vence?: string): { tone: keyof ColorTokens; label: string } | null {
  if (!vence) return null;
  const v = vigenciaDeFecha(vence);
  if (v === 'vencido') return { tone: 'danger', label: 'Vencido' };
  if (v === 'por_vencer') return { tone: 'warning', label: 'Por vencer' };
  return { tone: 'success', label: 'Vigente' };
}

/** Semáforo del estado de vigencia de un documento. */
const DOC_VISTA: Record<DocumentoEstado, { tone: keyof ColorTokens; label: string }> = {
  vigente: { tone: 'success', label: 'Vigente' },
  por_vencer: { tone: 'warning', label: 'Por vencer' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

/** Color del tema para el semáforo del índice de manejo seguro. */
function colorPorRango(rango: DriverScore['rango']): keyof ColorTokens {
  if (rango === 'rojo') return 'danger';
  if (rango === 'amarillo') return 'warning';
  return 'success';
}

/** Iniciales para el avatar sin foto. */
function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * MI PERFIL — como un perfil de red social: se VE (foto en círculo, nombre,
 * rol, índice de manejo si conduces, tus datos y tus documentos), y con el
 * LÁPIZ de arriba a la derecha se pasa a EDITAR (cambiar datos y subir otra
 * foto de perfil — una sola). El email lo cambia un administrador (es tu
 * cuenta de acceso). Los documentos se abren tocándolos: ahí ves su foto y
 * editas su vencimiento.
 */
export default function MiPerfilScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [perfil, documentos, score] = await Promise.all([
        getMiPerfil(user?.id ?? '', user?.name ?? ''),
        getDocumentosConductor(user ?? undefined),
        user?.drives ? getMiScore(user.id) : Promise.resolve(null),
      ]);
      return { perfil, documentos, score };
    },
    [user?.id],
    { onFocus: true },
  );

  // Modo edición + borrador. El borrador se precarga por USUARIO (cargadoId =
  // id de quien se precargó): si cambia la cuenta, se vuelve a sincronizar y
  // NUNCA se arrastra la foto/datos de otra persona a este formulario.
  const [editando, setEditando] = useState(false);
  const [cargadoId, setCargadoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [paisCodigo, setPaisCodigo] = useState(PAIS_POR_DEFECTO.codigo);
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);
  // Licencia y carta médica (solo se muestran/editan si conduces).
  const [licNumero, setLicNumero] = useState('');
  const [gradoValor, setGradoValor] = useState('');
  const [licVence, setLicVence] = useState('');
  const [cartaVence, setCartaVence] = useState('');
  const [gradoPicker, setGradoPicker] = useState(false);
  const [paisPicker, setPaisPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perfil = data?.perfil ?? null;

  useEffect(() => {
    if (perfil && user && cargadoId !== user.id) {
      setNombre(perfil.nombre);
      setCedula(perfil.cedula ?? '');
      const tel = separarTelefono(perfil.telefono ?? '');
      setPaisCodigo(tel.codigo);
      setTelefono(tel.numero);
      setDireccion(perfil.direccion ?? '');
      setFechaNacimiento(perfil.fechaNacimiento ?? '');
      setFotoUri(perfil.fotoUrl);
      setLicNumero(perfil.licenciaNumero ?? '');
      setGradoValor(perfil.licenciaCategoria ?? '');
      setLicVence(perfil.licenciaVence ?? '');
      setCartaVence(perfil.cartaMedicaVence ?? '');
      setCargadoId(user.id);
    }
  }, [perfil, user, cargadoId]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const documentos = data?.documentos ?? [];
  const score = data?.score ?? null;
  const rolTexto = etiquetaRol(user.role, user.companyTipo);

  // Documentos personales DECLARADOS (con su número/vencimiento del perfil).
  // Solo el conductor tiene licencia y carta médica. Cada uno se empareja por
  // TIPO con la foto ya subida (si existe), para vivir en un solo lugar.
  const grado = perfil?.licenciaCategoria
    ? gradoPorValor(perfil.licenciaCategoria)?.label ?? perfil.licenciaCategoria
    : '';
  const docsPersonales: DocDeclarado[] = perfil
    ? ([
        perfil.cedula ? { tipo: 'Cédula de identidad', sub: `Nº ${perfil.cedula}` } : null,
        user.drives && perfil.licenciaNumero
          ? { tipo: 'Licencia de conducir', sub: `Nº ${perfil.licenciaNumero}${grado ? ` · ${grado}` : ''}`, vence: perfil.licenciaVence }
          : null,
        user.drives && perfil.cartaMedicaVence ? { tipo: 'Carta médica', vence: perfil.cartaMedicaVence } : null,
      ] as (DocDeclarado | null)[]).filter((d): d is DocDeclarado => d !== null)
    : [];
  const tiposDeclarados = new Set(docsPersonales.map((d) => d.tipo));
  // Documentos subidos que NO son de los declarados (ej. un permiso de trabajo).
  const docsExtra = documentos.filter((d) => !tiposDeclarados.has(d.tipo));

  function abrirEdicion() {
    // Rearranca el borrador con lo último cargado y entra a editar. Si hay una
    // recarga EN VUELO (estado 'cargando', p. ej. justo tras guardar), `perfil`
    // puede estar rancio: en ese caso se conserva el borrador actual (que ya
    // tiene lo recién guardado) para no revertir visualmente lo guardado.
    if (perfil && estado !== 'cargando') {
      setNombre(perfil.nombre);
      setCedula(perfil.cedula ?? '');
      const tel = separarTelefono(perfil.telefono ?? '');
      setPaisCodigo(tel.codigo);
      setTelefono(tel.numero);
      setDireccion(perfil.direccion ?? '');
      setFechaNacimiento(perfil.fechaNacimiento ?? '');
      setFotoUri(perfil.fotoUrl);
      setLicNumero(perfil.licenciaNumero ?? '');
      setGradoValor(perfil.licenciaCategoria ?? '');
      setLicVence(perfil.licenciaVence ?? '');
      setCartaVence(perfil.cartaMedicaVence ?? '');
    }
    setError(null);
    setErrores({});
    setEditando(true);
  }

  const pais = paisPorCodigo(paisCodigo);

  /**
   * Valida los datos (mismas reglas que el alta): personales para TODOS
   * (nombre solo letras, cédula con dígitos si se escribe, teléfono por país,
   * fecha de nacimiento válida) y, SOLO para conductores, la licencia/carta
   * médica obligatorias (así un campo vaciado no borra el dato válido).
   */
  function validar(): boolean {
    const e: Record<string, string | null> = {};
    // El nombre/teléfono se validan SOLO si cambiaron: un valor preexistente
    // (creado sin este validador) no debe bloquear guardar los demás datos.
    if (!nombre.trim()) e.nombre = 'Escribe tu nombre y apellido.';
    else if (nombre.trim() !== (perfil?.nombre ?? '').trim()) e.nombre = validarLetras(nombre, 'El nombre y apellido');
    if (cedula.trim() && !/\d/.test(cedula)) e.cedula = 'La cédula debe incluir números.';
    const telCompuesto = telefono.trim() ? componerTelefono(pais.discado, telefono) : '';
    if (telefono.trim() && telCompuesto !== (perfil?.telefono ?? '')) e.telefono = validarTelefono(telefono, pais.longitud);
    if (fechaNacimiento.trim()) e.fechaNacimiento = validarFecha(fechaNacimiento);
    if (user?.drives) {
      e.licNumero = validarNumerico(licNumero, { campo: 'La licencia', min: 4 });
      if (!gradoValor.trim()) e.grado = 'Elige el grado de tu licencia.';
      e.licVence = validarFecha(licVence);
      e.cartaVence = validarFecha(cartaVence);
    }
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  async function onGuardar() {
    if (ocupado || !user) return;
    setError(null);
    if (!validar()) return;
    setOcupado(true);
    try {
      // La foto (si es nueva y local) sube a Cloudinary; una URL ya remota se
      // deja igual.
      const fotoFinal = fotoUri ? await subirFotoCloudinary(fotoUri) : undefined;
      await actualizarMiPerfil(user.id, {
        nombre,
        cedula: cedula.trim() || undefined,
        telefono: telefono.trim() ? componerTelefono(pais.discado, telefono) : '',
        direccion: direccion.trim() || undefined,
        fechaNacimiento: fechaNacimiento.trim() || undefined,
        fotoUrl: fotoFinal,
        // La licencia/carta médica solo la mandan los conductores (así no se
        // borra por accidente en quien no la tiene).
        ...(user.drives
          ? {
              licenciaNumero: licNumero,
              licenciaCategoria: gradoValor,
              licenciaVence: licVence,
              cartaMedicaVence: cartaVence,
            }
          : {}),
      });
      setEditando(false);
      // No se resetea cargadoId: al re-abrir edición, abrirEdicion() re-siembra
      // el borrador desde el perfil ya fresco; resetear aquí lo re-sembraría con
      // la data en caché (aún la vieja) durante la recarga.
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          title="Mi perfil"
          right={
            editando ? (
              <PillButton label="Cancelar" onPress={() => setEditando(false)} />
            ) : perfil ? (
              <PressableScale
                onPress={abrirEdicion}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Editar mi perfil">
                <View
                  style={[
                    styles.editBtn,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radii.pill },
                  ]}>
                  <TabIcon name="editar" color={colors.primary} size={20} />
                </View>
              </PressableScale>
            ) : undefined
          }
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          {estado === 'error' ? (
            <ErrorState description="No pudimos cargar tu perfil." onRetry={recargar} />
          ) : !perfil ? (
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <Skeleton width={96} height={96} radius={48} style={styles.center} />
              <Skeleton height={120} radius={16} />
              <Skeleton height={90} radius={16} />
            </View>
          ) : editando ? (
            /* ───────────── EDITAR ───────────── */
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              keyboardShouldPersistTaps="handled">
              {/* Foto de perfil (una sola, en círculo). */}
              <AvatarPicker uri={fotoUri} nombre={nombre || user.name} onChange={setFotoUri} />

              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  Mi información
                </ThemedText>
                <TextField
                  label="Nombre y apellido"
                  value={nombre}
                  onChangeText={setNombre}
                  editable={!ocupado}
                  error={errores.nombre ?? undefined}
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

                <TextField
                  label="Dirección"
                  value={direccion}
                  onChangeText={setDireccion}
                  placeholder="Av. 5 de Julio, Maracaibo"
                  editable={!ocupado}
                />
                <TextField
                  label="Fecha de nacimiento"
                  value={fechaNacimiento}
                  onChangeText={setFechaNacimiento}
                  placeholder="AAAA-MM-DD"
                  autoCapitalize="none"
                  editable={!ocupado}
                  error={errores.fechaNacimiento ?? undefined}
                />
                <ThemedText variant="caption" color="textMuted">
                  {`Email: ${user.email} · lo cambia un administrador (es tu cuenta de acceso).`}
                </ThemedText>
              </Card>

              {/* Licencia y carta médica: solo conductores. Renuévalas aquí
                  cuando cambien, con las mismas reglas de fecha del alta. */}
              {user.drives ? (
                <Card style={{ gap: spacing.md }}>
                  <ThemedText variant="overline" color="textMuted">
                    Licencia y carta médica
                  </ThemedText>
                  <TextField
                    label="Licencia · número"
                    value={licNumero}
                    onChangeText={(t) => setLicNumero(t.replace(/\D/g, ''))}
                    placeholder="Solo números"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    editable={!ocupado}
                    error={errores.licNumero ?? undefined}
                  />
                  <View style={{ gap: spacing.xs }}>
                    <PickerField
                      label="Licencia · grado"
                      value={gradoPorValor(gradoValor)?.label ?? (gradoValor || 'Elige el grado')}
                      onPress={() => setGradoPicker(true)}
                      disabled={ocupado}
                    />
                    {errores.grado ? (
                      <ThemedText variant="caption" color="danger">
                        {errores.grado}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={{ gap: spacing.xs }}>
                    <TextField
                      label="Licencia · vence"
                      value={licVence}
                      onChangeText={setLicVence}
                      placeholder="AAAA-MM-DD"
                      autoCapitalize="none"
                      editable={!ocupado}
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
                      autoCapitalize="none"
                      editable={!ocupado}
                      error={errores.cartaVence ?? undefined}
                    />
                    {avisoVigencia(cartaVence) ? (
                      <ThemedText variant="caption" color={avisoVigencia(cartaVence)!.tono}>
                        {avisoVigencia(cartaVence)!.texto}
                      </ThemedText>
                    ) : null}
                  </View>
                </Card>
              ) : null}

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}

              <Button label={ocupado ? 'Guardando…' : 'Guardar cambios'} onPress={onGuardar} loading={ocupado} />
            </ScrollView>
          ) : (
            /* ───────────── VER ───────────── */
            <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              {/* Encabezado: foto en círculo + nombre + rol. */}
              <View style={[styles.header, { gap: spacing.md }]}>
                {perfil.fotoUrl ? (
                  <Image
                    source={{ uri: perfil.fotoUrl }}
                    // recyclingKey por usuario+URL: evita que expo-image muestre
                    // la foto cacheada de otra cuenta al reutilizar la vista.
                    recyclingKey={`${user.id}:${perfil.fotoUrl}`}
                    style={[styles.avatar, { borderRadius: radii.pill, backgroundColor: colors.surfaceSunken }]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      { borderRadius: radii.pill, backgroundColor: colors.primary },
                    ]}>
                    <ThemedText variant="title" style={{ color: colors.onPrimary }}>
                      {iniciales(perfil.nombre)}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.flex1}>
                  <ThemedText variant="title">{perfil.nombre}</ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    {rolTexto}
                  </ThemedText>
                </View>
              </View>

              {/* Índice de manejo seguro (solo si conduces). */}
              {score ? (
                <Card style={[styles.scoreCard, { gap: spacing.lg }]}>
                  <ScoreRing value={score.scoreTotal} color={colorPorRango(score.rango)} size={112} />
                  <View style={[styles.flex1, { gap: spacing.xs }]}>
                    <ThemedText variant="overline" color="textMuted">
                      Índice de manejo seguro
                    </ThemedText>
                    <ThemedText variant="subtitle" color={colorPorRango(score.rango)}>
                      {score.rango === 'verde'
                        ? 'Manejo seguro'
                        : score.rango === 'amarillo'
                          ? 'Puedes mejorar'
                          : 'Requiere atención'}
                    </ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      Por cada 100 km
                    </ThemedText>
                    <View style={{ gap: 2 }}>
                      <EventoRow label="Excesos de velocidad" valor={score.excesosVelocidad100km} />
                      <EventoRow label="Frenadas bruscas" valor={score.frenadasBruscas100km} />
                      <EventoRow label="Aceleraciones bruscas" valor={score.aceleracionesBruscas100km} />
                    </View>
                  </View>
                </Card>
              ) : null}

              {/* Mis datos. */}
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  Mi información
                </ThemedText>
                <InfoRow label="Cédula" value={perfil.cedula || 'Sin registrar'} />
                <InfoRow label="Teléfono" value={perfil.telefono || 'Sin registrar'} />
                <InfoRow label="Dirección" value={perfil.direccion || 'Sin registrar'} />
                <InfoRow
                  label="Fecha de nacimiento"
                  value={perfil.fechaNacimiento ? formatFecha(perfil.fechaNacimiento) : 'Sin registrar'}
                />
                <InfoRow label="Email" value={user.email} />
              </Card>

              {/* MIS DOCUMENTOS — un solo lugar: los personales DECLARADOS (con su
                  número y vencimiento del perfil) y su foto. Tocar = ver la foto
                  si ya la subiste, o subirla (emparejada con el tipo). Debajo,
                  cualquier documento extra que hayas subido. */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Mis documentos
                </ThemedText>
                {docsPersonales.length === 0 && docsExtra.length === 0 ? (
                  <Card>
                    <ThemedText variant="caption" color="textMuted">
                      Completa tu cédula (y tu licencia y carta médica si conduces) desde el lápiz de
                      arriba: aparecerán aquí para subirles la foto.
                    </ThemedText>
                  </Card>
                ) : (
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    {docsPersonales.map((dp, i) => {
                      const foto = documentos.find((d) => d.tipo === dp.tipo);
                      // El vencimiento/estado vive en el documento SUBIDO si existe
                      // (es lo que ven Alertas y el detalle, p. ej. una cédula que no
                      // declara vencimiento en el perfil pero sí al subir la foto);
                      // sin foto todavía, usamos lo declarado en el perfil.
                      const venceMostrar = foto?.venceEn ?? dp.vence;
                      const vig = foto ? DOC_VISTA[foto.estado] : chipVigencia(dp.vence);
                      return (
                        <PressableScale
                          key={dp.tipo}
                          onPress={() =>
                            foto
                              ? router.navigate({ pathname: '/documento', params: { id: foto.id } })
                              : router.navigate({ pathname: '/nuevo-documento', params: { ambito: 'persona', tipo: dp.tipo } })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={foto ? `Ver la foto de ${dp.tipo}` : `Subir la foto de ${dp.tipo}`}
                          style={[
                            styles.docRow,
                            {
                              gap: spacing.md,
                              paddingHorizontal: spacing.lg,
                              paddingVertical: spacing.md,
                              borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}>
                          <View style={styles.flex1}>
                            <ThemedText variant="button">{dp.tipo}</ThemedText>
                            <ThemedText variant="caption" color="textMuted">
                              {[dp.sub, venceMostrar ? `Vence ${formatFecha(venceMostrar)}` : null, foto ? null : 'Sin foto — toca para subir']
                                .filter(Boolean)
                                .join(' · ')}
                            </ThemedText>
                          </View>
                          {vig ? <Chip tone={vig.tone} label={vig.label} /> : null}
                          <ThemedText variant="body" color="textMuted">
                            ›
                          </ThemedText>
                        </PressableScale>
                      );
                    })}
                    {docsExtra.map((doc, i) => {
                      const v = DOC_VISTA[doc.estado];
                      return (
                        <PressableScale
                          key={doc.id}
                          onPress={() => router.navigate({ pathname: '/documento', params: { id: doc.id } })}
                          accessibilityRole="button"
                          accessibilityLabel={`Abrir el documento ${doc.tipo}`}
                          style={[
                            styles.docRow,
                            {
                              gap: spacing.md,
                              paddingHorizontal: spacing.lg,
                              paddingVertical: spacing.md,
                              borderTopWidth: i === 0 && docsPersonales.length === 0 ? 0 : StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}>
                          <View style={styles.flex1}>
                            <ThemedText variant="button">{doc.tipo}</ThemedText>
                            <ThemedText variant="caption" color="textMuted">
                              {`Vence ${formatFecha(doc.venceEn)}`}
                            </ThemedText>
                          </View>
                          <Chip tone={v.tone} label={v.label} />
                          <ThemedText variant="body" color="textMuted">
                            ›
                          </ThemedText>
                        </PressableScale>
                      );
                    })}
                  </Card>
                )}
              </View>

              {/* ── SEGURIDAD ── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Seguridad
                </ThemedText>
                <Button
                  label="Cambiar contraseña"
                  variant="secondary"
                  onPress={() => router.navigate('/cambiar-clave')}
                />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* Grado de licencia (solo selección, lista de Venezuela). */}
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

/** Fila etiqueta–valor de "Mi información". */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText variant="body" color="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="body" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

/** Fila de un evento de manejo (por 100 km). */
function EventoRow({ label, valor }: { label: string; valor: number }) {
  return (
    <View style={styles.eventoRow}>
      <ThemedText variant="caption" color="textSecondary">
        {label}
      </ThemedText>
      <ThemedText variant="caption">{valor.toFixed(1)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  center: { alignSelf: 'center' },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  scoreCard: { flexDirection: 'row', alignItems: 'center' },
  docRow: { flexDirection: 'row', alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  eventoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  flex1: { flex: 1, minWidth: 0 },
});
