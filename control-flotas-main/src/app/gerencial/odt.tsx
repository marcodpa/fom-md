import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { PhotoViewer } from '@/components/photo-viewer';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getOrdenDeTrabajo } from '@/services';
import { useTheme } from '@/theme';

function formatFechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Detalle de una ODT en la vista gerencial (FOM-02 §2.1): SOLO LECTURA. Muestra
 * el reporte, la evidencia y —si está cerrada— el cierre completo (qué se hizo,
 * costo, factura, fecha de resolución). Sin acciones: este rol no crea, edita
 * ni elimina nada.
 */
export default function GerencialOdtScreen() {
  const { colors, spacing, radii } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || '';

  const { data: orden, estado } = useAsyncData(() => getOrdenDeTrabajo(id), [id]);
  // Foto abierta a pantalla completa (visor), o null.
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="ODT" right={<Chip tone="info" label="Solo lectura" />} />

        {estado === 'cargando' ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton width="50%" height={24} />
            <Card style={{ gap: spacing.md }}>
              <Skeleton width="35%" height={14} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={14} />
            </Card>
            <Skeleton height={150} radius={radii.lg} />
          </View>
        ) : !orden ? (
          <View style={styles.loader}>
            <ThemedText variant="body" color="textMuted">
              No se encontró la ODT.
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                <View style={styles.flex1}>
                  <ThemedText variant="overline" color="textMuted">
                    {orden.id}
                  </ThemedText>
                  <ThemedText variant="title">{orden.vehicleLabel}</ThemedText>
                </View>
                <OTStatusBadge estado={orden.estado} />
              </View>

              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="overline" color="textMuted">
                    Detalle
                  </ThemedText>
                  <Chip
                    tone={orden.tipo === 'preventiva' ? 'info' : 'warning'}
                    label={orden.tipo === 'preventiva' ? 'Preventiva' : 'Correctiva'}
                  />
                </View>
                <InfoRow
                  label="La creó"
                  value={`${orden.driverName}${orden.autorVia === 'secundario' ? ' (secundario, PIN)' : orden.autorVia === 'principal' ? ' (principal)' : ''}`}
                />
                <InfoRow label="Fecha y hora" value={formatFechaLarga(orden.creadaEn)} />
                <InfoRow label="Ubicación" value={orden.ubicacionTexto} />
                <View style={{ gap: spacing.xs }}>
                  <ThemedText variant="caption" color="textSecondary">
                    Descripción
                  </ThemedText>
                  <ThemedText variant="body">{orden.descripcion}</ThemedText>
                </View>
              </Card>

              {/* Cierre (§3.3), visible cuando la empresa la cerró. */}
              {orden.estado === 'cerrada' ? (
                <Card style={{ gap: spacing.md }}>
                  <ThemedText variant="overline" color="textMuted">
                    Cierre
                  </ThemedText>
                  {orden.notaSolucion ? <InfoRow label="Qué se hizo" value={orden.notaSolucion} /> : null}
                  {orden.costo != null ? (
                    <InfoRow label="Costo" value={`$${orden.costo.toLocaleString('es')}`} />
                  ) : null}
                  {orden.resueltaEn ? (
                    <InfoRow label="Resuelta el" value={formatFechaLarga(orden.resueltaEn)} />
                  ) : null}
                  {orden.evidenciaResolucionUrls && orden.evidenciaResolucionUrls.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing.md }}>
                      {orden.evidenciaResolucionUrls.map((url) => (
                        <Pressable
                          key={url}
                          onPress={() => setFotoAbierta(url)}
                          accessibilityRole="imagebutton"
                          accessibilityLabel="Ver foto a pantalla completa">
                          <Image
                            source={{ uri: url }}
                            style={[
                              styles.evidence,
                              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                            ]}
                          />
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </Card>
              ) : null}

              {/* Evidencia del reporte original */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Evidencia
                </ThemedText>
                {orden.evidenciaUrls && orden.evidenciaUrls.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.md }}>
                    {orden.evidenciaUrls.map((url) => (
                      <Pressable
                        key={url}
                        onPress={() => setFotoAbierta(url)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel="Ver foto a pantalla completa">
                        <Image
                          source={{ uri: url }}
                          style={[
                            styles.evidence,
                            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                          ]}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <Card>
                    <ThemedText variant="body" color="textMuted">
                      Sin fotos adjuntas.
                    </ThemedText>
                  </Card>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Visor a pantalla completa: tocar una evidencia la abre entera. */}
        <PhotoViewer uri={fotoAbierta} onClose={() => setFotoAbierta(null)} />
      </SafeAreaView>
    </ThemedView>
  );
}

/** Fila etiqueta–valor. */
function InfoRow({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.infoRow, { gap: spacing.md }]}>
      <ThemedText variant="body" color="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="body" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { paddingBottom: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1, minWidth: 0 },
  evidence: { width: 220, height: 150, borderWidth: StyleSheet.hairlineWidth },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
});
