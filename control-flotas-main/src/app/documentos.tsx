import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getDocumentosConductor, getDocumentosVehiculo } from '@/services';
import { useDriving } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { Documento, DocumentoEstado } from '@/types';
import { formatFecha } from '@/utils/date';

/** Estado de vigencia → token de color + etiqueta. */
const DOC_VISTA: Record<DocumentoEstado, { tone: keyof ColorTokens; label: string }> = {
  vencido: { tone: 'danger', label: 'Vencido' },
  por_vencer: { tone: 'warning', label: 'Por vencer' },
  vigente: { tone: 'success', label: 'Vigente' },
};

/**
 * DOCUMENTOS (FOM-DRIVER). Pantalla full-screen a la que se llega desde "Más".
 * Los TUYOS (licencia, carta médica, cédula) están SIEMPRE; los del VEHÍCULO
 * son los de la unidad EN LA QUE ESTÁS ahora mismo — la app lo valida con tu
 * sesión de conducción (titular, PIN o chip; directriz PDF-4). Si no estás en
 * ninguna unidad, no se muestran documentos de vehículo.
 */
export default function DocumentosScreen() {
  const { spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  // La unidad REAL de tu sesión de conducción (no una fija del mock).
  const { vehicle: unidadActual } = useDriving();

  const [docsVehiculo, setDocsVehiculo] = useState<Documento[]>([]);
  const [docsConductor, setDocsConductor] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);

  // Recarga en cada foco: al volver de "Añadir documento" la lista ya lo trae.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      (async () => {
        // Los personales están siempre; los del vehículo, según DÓNDE estás.
        const conductor = await getDocumentosConductor(user);
        if (!active) return;
        setDocsConductor(conductor);
        if (unidadActual) {
          const veh = await getDocumentosVehiculo(unidadActual.id);
          if (!active) return;
          setDocsVehiculo(veh);
        } else {
          setDocsVehiculo([]);
        }
        setCargando(false);
      })();
      return () => {
        active = false;
      };
    }, [user, unidadActual]),
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Documentos" />

        {cargando ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={[styles.card, { gap: spacing.md }]}>
                <Skeleton width={40} height={40} radius={radii.md} />
                <View style={styles.flex1}>
                  <Skeleton width="55%" height={16} />
                  <View style={{ height: 6 }} />
                  <Skeleton width="40%" height={12} />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
            {/* PERSONALES (de cualquier rol): cédula, licencia, carta médica,
                permisos de trabajo… con su vencimiento. */}
            <View style={{ gap: spacing.sm }}>
              <View style={styles.sectionRow}>
                <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                  Tus documentos
                </ThemedText>
                <PillButton
                  label="+ Añadir"
                  tone="primary"
                  onPress={() => router.navigate({ pathname: '/nuevo-documento', params: { ambito: 'persona' } })}
                />
              </View>
              {docsConductor.length === 0 ? (
                <Card>
                  <ThemedText variant="caption" color="textMuted">
                    Sube tu cédula, tu licencia o tus permisos de trabajo con su fecha de
                    vencimiento: te avisamos antes de que venzan.
                  </ThemedText>
                </Card>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {docsConductor.map((doc) => (
                    <DocRow key={doc.id} doc={doc} />
                  ))}
                </View>
              )}
            </View>

            {/* Del vehículo EN EL QUE ESTÁS (lo valida la sesión de conducción). */}
            <View style={{ gap: spacing.sm }}>
              <View style={styles.sectionRow}>
                <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                  {unidadActual
                    ? `Tu unidad ahora · ${unidadActual.alias ?? unidadActual.numero}`
                    : 'Tu unidad'}
                </ThemedText>
                {unidadActual ? (
                  <PillButton
                    label="+ Añadir"
                    tone="primary"
                    onPress={() =>
                      router.navigate({
                        pathname: '/nuevo-documento',
                        params: { ambito: 'vehiculo', vehicleId: unidadActual.id },
                      })
                    }
                  />
                ) : null}
              </View>
              {unidadActual ? (
                <View style={{ gap: spacing.md }}>
                  {docsVehiculo.map((doc) => (
                    <DocRow key={doc.id} doc={doc} />
                  ))}
                </View>
              ) : (
                <Card style={{ gap: spacing.xs }}>
                  <ThemedText variant="body" color="textSecondary">
                    No estás en ninguna unidad. Cuando estés en una (como titular, con tu PIN o por
                    chip), verás aquí SUS documentos.
                  </ThemedText>
                </Card>
              )}
            </View>

            <ThemedText variant="caption" color="textMuted">
              Mantén tus documentos al día. Los que estén por vencer aparecen también en Alertas.
            </ThemedText>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Fila de un documento: tocarla ENTRA AL DOCUMENTO (su detalle con la foto y
 * la info), no a una lista general (directriz PDF-3).
 */
function DocRow({ doc }: { doc: Documento }) {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const v = DOC_VISTA[doc.estado];

  return (
    <PressableScale
      onPress={() => router.navigate({ pathname: '/documento', params: { id: doc.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Abrir el documento ${doc.tipo}`}>
      <Card style={[styles.card, { gap: spacing.md }]}>
        <View style={[styles.lead, { borderRadius: radii.md }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[v.tone], opacity: 0.14, borderRadius: radii.md }]} />
          <TabIcon name="inspeccion" color={colors[v.tone]} size={20} />
        </View>
        <View style={styles.flex1}>
          <ThemedText variant="subtitle">{doc.tipo}</ThemedText>
          <ThemedText variant="caption" color="textMuted">
            {`Vence: ${formatFecha(doc.venceEn)}${doc.fotoUrls?.length ? ' · 📎 con foto' : ''}`}
          </ThemedText>
        </View>
        <Chip tone={v.tone} label={v.label} />
        <ThemedText variant="body" color="textMuted">
          ›
        </ThemedText>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  card: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex1: { flex: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
