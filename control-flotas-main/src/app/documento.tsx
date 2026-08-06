import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { EvidenceField } from '@/components/evidence-field';
import { PhotoViewer } from '@/components/photo-viewer';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { actualizarVencimientoDocumento, agregarFotosDocumento, getDocumento } from '@/services';
import { useTheme, type ColorTokens } from '@/theme';
import type { DocumentoEstado } from '@/types';
import { formatFecha } from '@/utils/date';

const DOC_VISTA: Record<DocumentoEstado, { tone: keyof ColorTokens; label: string }> = {
  vencido: { tone: 'danger', label: 'Vencido' },
  por_vencer: { tone: 'warning', label: 'Por vencer' },
  vigente: { tone: 'success', label: 'Vigente' },
};

/**
 * DETALLE DE UN DOCUMENTO (directriz PDF-3): se entra tocando el documento —
 * no a una lista general. Aquí vive su FOTO (subible a Cloudinary, ampliable y
 * descargable), su fecha de vencimiento (de la que saltan las alertas) y su
 * info. Los del vehículo pertenecen al vehículo; los personales, al usuario.
 */
export default function DocumentoScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || '';

  const { data: doc, estado, recargar } = useAsyncData(() => getDocumento(id), [id]);

  // Fotos nuevas por subir + visor a pantalla completa.
  const [nuevasUris, setNuevasUris] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);

  // Editar el vencimiento (dentro del documento).
  const [editandoVence, setEditandoVence] = useState(false);
  const [venceDraft, setVenceDraft] = useState('');
  const [guardandoVence, setGuardandoVence] = useState(false);
  const [errorVence, setErrorVence] = useState<string | null>(null);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  async function onGuardarVence() {
    if (guardandoVence) return;
    setErrorVence(null);
    setGuardandoVence(true);
    try {
      await actualizarVencimientoDocumento(id, venceDraft);
      setEditandoVence(false);
      recargar();
    } catch (e) {
      setErrorVence(e instanceof Error ? e.message : 'No se pudo actualizar el vencimiento.');
    } finally {
      setGuardandoVence(false);
    }
  }

  async function onGuardarFotos() {
    if (subiendo || nuevasUris.length === 0) return;
    setErrorSubida(null);
    setSubiendo(true);
    try {
      await agregarFotosDocumento(id, nuevasUris);
      setNuevasUris([]);
      recargar();
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : 'No se pudieron guardar las fotos.');
    } finally {
      setSubiendo(false);
    }
  }

  const v = doc ? DOC_VISTA[doc.estado] : null;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={doc?.tipo ?? 'Documento'} right={v ? <Chip tone={v.tone} label={v.label} /> : undefined} />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar el documento." onRetry={recargar} />
        ) : estado === 'cargando' || !doc || !v ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={90} radius={16} />
            <Skeleton height={180} radius={16} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Info del documento: a quién pertenece y cuándo vence. */}
            <Card style={{ gap: spacing.md }}>
              <View style={[styles.row, { gap: spacing.md }]}>
                <View style={[styles.lead, { borderRadius: radii.md }]}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[v.tone], opacity: 0.14, borderRadius: radii.md }]} />
                  <TabIcon name="inspeccion" color={colors[v.tone]} size={22} />
                </View>
                <View style={styles.flex1}>
                  <ThemedText variant="subtitle">{doc.tipo}</ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    {doc.ambito === 'vehiculo' ? 'Documento de la unidad' : 'Tu documento personal'}
                  </ThemedText>
                </View>
              </View>
              {/* El vencimiento manda: de aquí salta la alerta. Se puede editar. */}
              <View style={[styles.venceBox, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm }]}>
                {editandoVence ? (
                  <>
                    <ThemedText variant="overline" color="textMuted">
                      Nueva fecha de vencimiento
                    </ThemedText>
                    <TextField
                      value={venceDraft}
                      onChangeText={setVenceDraft}
                      placeholder="AAAA-MM-DD"
                      autoCapitalize="none"
                      editable={!guardandoVence}
                    />
                    {errorVence ? (
                      <ThemedText variant="caption" color="danger">
                        {errorVence}
                      </ThemedText>
                    ) : null}
                    <View style={[styles.venceActions, { gap: spacing.sm }]}>
                      <Button
                        label={guardandoVence ? 'Guardando…' : 'Guardar fecha'}
                        onPress={onGuardarVence}
                        loading={guardandoVence}
                        style={styles.flex1}
                      />
                      <Button
                        label="Cancelar"
                        variant="secondary"
                        onPress={() => setEditandoVence(false)}
                        style={styles.flex1}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.venceRow}>
                    <View style={styles.flex1}>
                      <ThemedText variant="overline" color="textMuted">
                        Vence
                      </ThemedText>
                      <ThemedText variant="subtitle" color={v.tone}>
                        {formatFecha(doc.venceEn)}
                      </ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        De esta fecha salen las alertas por vencer.
                      </ThemedText>
                    </View>
                    <PressableScale
                      onPress={() => {
                        setVenceDraft(doc.venceEn.slice(0, 10));
                        setErrorVence(null);
                        setEditandoVence(true);
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Editar la fecha de vencimiento">
                      <View style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill }]}>
                        <TabIcon name="editar" color={colors.primary} size={18} />
                      </View>
                    </PressableScale>
                  </View>
                )}
              </View>
            </Card>

            {/* Fotos guardadas del documento (tocar = pantalla completa). */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Fotos del documento
              </ThemedText>
              {doc.fotoUrls && doc.fotoUrls.length > 0 ? (
                <View style={[styles.fotosRow, { gap: spacing.sm }]}>
                  {doc.fotoUrls.map((url) => (
                    <Pressable
                      key={url}
                      onPress={() => setFotoAbierta(url)}
                      accessibilityRole="imagebutton"
                      accessibilityLabel="Ver la foto del documento a pantalla completa">
                      <Image
                        source={{ uri: url }}
                        style={[styles.foto, { borderRadius: radii.lg, backgroundColor: colors.surfaceSunken }]}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="Sin foto todavía"
                  description="Súbela aquí y tenla a mano cuando la necesites."
                />
              )}
            </View>

            {/* Subir foto nueva (cámara o galería → Cloudinary). */}
            <Card style={{ gap: spacing.md }}>
              <ThemedText variant="overline" color="textMuted">
                Subir foto
              </ThemedText>
              <EvidenceField uris={nuevasUris} onChange={setNuevasUris} />
              {errorSubida ? (
                <ThemedText variant="caption" color="danger">
                  {errorSubida}
                </ThemedText>
              ) : null}
              {nuevasUris.length > 0 ? (
                <Button
                  label={subiendo ? 'Guardando…' : `Guardar ${nuevasUris.length > 1 ? `${nuevasUris.length} fotos` : 'foto'}`}
                  onPress={onGuardarFotos}
                  loading={subiendo}
                />
              ) : null}
            </Card>
          </ScrollView>
        )}

        {/* Visor a pantalla completa (zoom + descarga). */}
        <PhotoViewer uri={fotoAbierta} onClose={() => setFotoAbierta(null)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  venceBox: {},
  venceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  venceActions: { flexDirection: 'row' },
  editBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  fotosRow: { flexDirection: 'row', flexWrap: 'wrap' },
  foto: { width: 148, height: 104 },
  flex1: { flex: 1, minWidth: 0 },
});
