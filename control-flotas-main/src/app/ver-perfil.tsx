import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, etiquetaRol, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { ScoreRing } from '@/components/score-ring';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getDocumentosConductor, getMiPerfil, getMiScore } from '@/services';
import { useTheme, type ColorTokens } from '@/theme';
import type { CompanyTipo, DocumentoEstado, DriverScore, Role, User } from '@/types';
import { formatFecha } from '@/utils/date';

const DOC_VISTA: Record<DocumentoEstado, { tone: keyof ColorTokens; label: string }> = {
  vigente: { tone: 'success', label: 'Vigente' },
  por_vencer: { tone: 'warning', label: 'Por vencer' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

function colorPorRango(rango: DriverScore['rango']): keyof ColorTokens {
  if (rango === 'rojo') return 'danger';
  if (rango === 'amarillo') return 'warning';
  return 'success';
}

function esConductor(role?: Role): boolean {
  return role === 'conductor' || role === 'driver';
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * VER PERFIL (solo lectura) — el "ojito": abre el perfil COMPLETO de otra
 * persona (foto, rol, cédula, dirección, fecha de nacimiento, email, índice de
 * manejo si conduce y sus documentos), sin poder editar nada. El CRUD vive en
 * el "lápiz" (/editar-usuario). Lo usan los admin FOM entre ellos y sobre la
 * gente de cualquier empresa.
 */
export default function VerPerfilScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; nombre?: string; email?: string; role?: string; companyTipo?: string }>();
  const userId = params.userId || '';
  const nombreParam = params.nombre || 'Usuario';
  const emailParam = params.email || '';
  const rol = params.role as Role | undefined;
  const companyTipo = params.companyTipo as CompanyTipo | undefined;
  const conduce = esConductor(rol);

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const objetivo = { id: userId, name: nombreParam, email: emailParam, role: rol ?? 'conductor', drives: conduce } as User;
      const [perfil, documentos, score] = await Promise.all([
        getMiPerfil(userId, nombreParam),
        getDocumentosConductor(objetivo),
        conduce ? getMiScore(userId) : Promise.resolve(null),
      ]);
      return { perfil, documentos, score };
    },
    [userId],
    { onFocus: true },
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Ver el perfil completo de OTRA persona es de los administradores; el propio
  // no se abre desde el manejo de usuarios, sino desde "Mi perfil".
  if (userId === user.id) return <Redirect href="/mi-perfil" />;
  if (!esAdmin(user) || !userId) return <Redirect href="/" />;

  const perfil = data?.perfil ?? null;
  const documentos = data?.documentos ?? [];
  const score = data?.score ?? null;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Perfil" right={<Chip tone="info" label="Solo lectura" />} />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar el perfil." onRetry={recargar} />
        ) : !perfil ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton width={72} height={72} radius={radii.pill} />
            <Skeleton height={120} radius={16} />
            <Skeleton height={90} radius={16} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Encabezado: foto en círculo + nombre + rol. */}
            <View style={[styles.header, { gap: spacing.md }]}>
              {perfil.fotoUrl ? (
                <Image
                  source={{ uri: perfil.fotoUrl }}
                  recyclingKey={`${userId}:${perfil.fotoUrl}`}
                  style={[styles.avatar, { borderRadius: radii.pill, backgroundColor: colors.surfaceSunken }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { borderRadius: radii.pill, backgroundColor: colors.primary }]}>
                  <ThemedText variant="title" style={{ color: colors.onPrimary }}>
                    {iniciales(perfil.nombre)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.flex1}>
                <ThemedText variant="title">{perfil.nombre}</ThemedText>
                <ThemedText variant="caption" color="textMuted">
                  {etiquetaRol(rol ?? 'conductor', companyTipo)}
                </ThemedText>
              </View>
            </View>

            {/* Índice de manejo seguro (solo conductores). */}
            {score && conduce ? (
              <Card style={[styles.scoreCard, { gap: spacing.lg }]}>
                <ScoreRing value={score.scoreTotal} color={colorPorRango(score.rango)} size={112} />
                <View style={[styles.flex1, { gap: spacing.xs }]}>
                  <ThemedText variant="overline" color="textMuted">
                    Índice de manejo seguro
                  </ThemedText>
                  <ThemedText variant="subtitle" color={colorPorRango(score.rango)}>
                    {score.rango === 'verde' ? 'Manejo seguro' : score.rango === 'amarillo' ? 'Puede mejorar' : 'Requiere atención'}
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

            {/* Datos. */}
            <Card style={{ gap: spacing.md }}>
              <ThemedText variant="overline" color="textMuted">
                Información
              </ThemedText>
              <InfoRow label="Cédula" value={perfil.cedula || 'Sin registrar'} />
              <InfoRow label="Dirección" value={perfil.direccion || 'Sin registrar'} />
              <InfoRow
                label="Fecha de nacimiento"
                value={perfil.fechaNacimiento ? formatFecha(perfil.fechaNacimiento) : 'Sin registrar'}
              />
              <InfoRow label="Email" value={emailParam || '—'} />
            </Card>

            {/* Documentos (tocar = ver la foto y el vencimiento). */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Documentos
              </ThemedText>
              {documentos.length === 0 ? (
                <Card>
                  <ThemedText variant="caption" color="textMuted">
                    Esta persona aún no ha subido documentos.
                  </ThemedText>
                </Card>
              ) : (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {documentos.map((doc, i) => {
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
                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
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
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

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
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
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
