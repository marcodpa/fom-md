import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { ActionTile } from '@/components/action-tile';
import { AnimatedNumber } from '@/components/animated-number';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal } from '@/components/option-picker';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { cloudinaryConfigurado } from '@/lib/cloudinary';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { esDesempleados, getEmpresasSistema, listarPagosSistema, listarUsuariosSistema } from '@/services';
import { useTheme, type ColorTokens } from '@/theme';
import type { PagoEstado } from '@/types';

type EstadoBd = 'probando' | 'ok' | 'sin_conexion' | 'mock';

const PAGO_VISTA: Record<PagoEstado, { tone: keyof ColorTokens; label: string }> = {
  pendiente: { tone: 'warning', label: 'Pendiente' },
  pagado: { tone: 'success', label: 'Pagado' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

/**
 * RESUMEN del sistema — el tablero de los administradores FOM: estado de la
 * plataforma en vivo (BD y fotos), los números del negocio (empresas activas
 * y suspendidas, usuarios, pagos por atender) y las acciones de creación a un
 * toque. Lo que hay que ATENDER (pagos vencidos/pendientes) sale de primero.
 */
export default function AdminResumenSistemaScreen() {
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const [estadoBd, setEstadoBd] = useState<EstadoBd>(supabaseConfigurado ? 'probando' : 'mock');
  const [empresaPicker, setEmpresaPicker] = useState(false);

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [empresas, usuarios, pagos] = await Promise.all([
        getEmpresasSistema(),
        listarUsuariosSistema(),
        listarPagosSistema(),
      ]);
      return { empresas, usuarios, pagos };
    },
    [],
    { onFocus: true },
  );

  // Ping real a la BD en CADA foco (la tab vive toda la sesión: con deps []
  // el semáforo quedaría congelado en el primer resultado).
  useFocusEffect(
    useCallback(() => {
      if (!supabase) return;
      let active = true;
      supabase
        .from('empresas')
        .select('slug')
        .limit(1)
        .then(({ error }) => {
          if (!active) return;
          setEstadoBd(error ? 'sin_conexion' : 'ok');
        });
      return () => {
        active = false;
      };
    }, []),
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  // Desempleados C.A. es solo el contenedor de gente sin empleo: no cuenta como
  // empresa ni como servicio suspendido en los números del sistema.
  const empresas = (data?.empresas ?? []).filter((e) => !esDesempleados(e.id));
  const usuarios = data?.usuarios ?? [];
  const pagos = data?.pagos ?? [];
  const suspendidas = empresas.filter((e) => e.servicioActivo === false).length;
  const porAtender = pagos.filter((p) => p.estado !== 'pagado');

  const BD_VISTA: Record<EstadoBd, { tone: keyof ColorTokens; label: string }> = {
    probando: { tone: 'textMuted', label: 'Probando…' },
    ok: { tone: 'success', label: 'Conectada ✓' },
    sin_conexion: { tone: 'danger', label: 'No responde' },
    mock: { tone: 'warning', label: 'Modo mock' },
  };

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Barra superior propia: esta vista es del SISTEMA, no de una empresa. */}
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              FOM · Administración del sistema
            </ThemedText>
            <ThemedText variant="title">Resumen</ThemedText>
          </View>
          <Chip tone="info" label={user.name.split(' ')[0]} />
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar el resumen." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={90} radius={16} />
            <Skeleton height={120} radius={16} />
            <Skeleton height={120} radius={16} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
            {/* ── PLATAFORMA (en vivo) ─────────────────────────────────── */}
            <Card style={{ gap: spacing.md }}>
              <View style={styles.rowBetween}>
                <ThemedText variant="button">Base de datos</ThemedText>
                <Chip tone={BD_VISTA[estadoBd].tone} label={BD_VISTA[estadoBd].label} />
              </View>
              <View style={styles.rowBetween}>
                <ThemedText variant="button">Fotos (Cloudinary)</ThemedText>
                <Chip
                  tone={cloudinaryConfigurado() ? 'success' : 'warning'}
                  label={cloudinaryConfigurado() ? 'Configurado ✓' : 'Locales'}
                />
              </View>
            </Card>

            {/* ── LOS NÚMEROS DEL SISTEMA ──────────────────────────────── */}
            <Card style={[styles.grid, { gap: spacing.lg }]}>
              <View style={styles.stat}>
                <AnimatedNumber value={empresas.length} variant="title" />
                <ThemedText variant="caption" color="textMuted">
                  empresas
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <AnimatedNumber
                  value={suspendidas}
                  variant="title"
                  color={suspendidas > 0 ? 'danger' : 'text'}
                />
                <ThemedText variant="caption" color="textMuted">
                  suspendidas
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <AnimatedNumber value={usuarios.length} variant="title" />
                <ThemedText variant="caption" color="textMuted">
                  usuarios
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <AnimatedNumber
                  value={porAtender.length}
                  variant="title"
                  color={porAtender.length > 0 ? 'warning' : 'text'}
                />
                <ThemedText variant="caption" color="textMuted">
                  pagos por atender
                </ThemedText>
              </View>
            </Card>

            {/* ── CREAR (todo el sistema) ──────────────────────────────── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Crear
              </ThemedText>
              <View style={[styles.tools, { gap: spacing.sm }]}>
                <ActionTile icon="empresa" label="Empresa" style={styles.toolBtn} onPress={() => router.navigate('/crear-empresa')} />
                <ActionTile icon="personal" label="Usuario" style={styles.toolBtn} onPress={() => setEmpresaPicker(true)} />
                <ActionTile icon="flota" label="Vehículo" style={styles.toolBtn} onPress={() => router.navigate('/crear-vehiculo')} />
              </View>
            </View>

            {/* ── PAGOS POR ATENDER (vencidos primero) ─────────────────── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {`Pagos por atender (${porAtender.length})`}
              </ThemedText>
              {porAtender.length === 0 ? (
                <Card>
                  <ThemedText variant="caption" color="textMuted">
                    Todo cobrado. Registra los cobros de cada período dentro de cada empresa.
                  </ThemedText>
                </Card>
              ) : (
                <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                  {porAtender.slice(0, 5).map((p, i) => {
                    const v = PAGO_VISTA[p.estado];
                    return (
                      <PressableScale
                        key={p.id}
                        onPress={() => router.navigate({ pathname: '/consola-empresa', params: { companyId: p.companyId } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Pago de ${p.companyNombre}, ${v.label}`}
                        style={[
                          styles.rowBetween,
                          {
                            gap: spacing.md,
                            paddingVertical: spacing.md,
                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                            borderTopColor: colors.border,
                          },
                        ]}>
                        <View style={styles.flex1}>
                          <ThemedText variant="button">{p.companyNombre}</ThemedText>
                          <ThemedText variant="caption" color="textMuted">
                            {`${p.periodo} · ${p.monto.toLocaleString('es')} ${p.moneda}`}
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
              {porAtender.length > 5 ? (
                <ThemedText variant="caption" color="textMuted">
                  {`…y ${porAtender.length - 5} más. El detalle completo vive dentro de cada empresa.`}
                </ThemedText>
              ) : null}
            </View>
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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { flexGrow: 1, flexBasis: '42%', gap: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tools: { flexDirection: 'row', flexWrap: 'wrap' },
  toolBtn: { flexGrow: 1, flexBasis: 104 },
  flex1: { flex: 1, minWidth: 0 },
});
