import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PulseDot } from '@/components/pulse-dot';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSync } from '@/sync';
import { useTheme } from '@/theme';
import { formatHora } from '@/utils/date';

/**
 * SINCRONIZACIÓN (FOM-DRIVER). Centro de control offline-first: muestra el estado
 * de conexión, deja simular "sin conexión" para probar, lista los cambios
 * pendientes de enviar y permite sincronizar a mano. Cuidamos que ningún dato se
 * pierda aunque falte la señal.
 */
export default function SincronizacionScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { online, sincronizando, pendientes, setOnline, sincronizarAhora } = useSync();

  const [ocupado, setOcupado] = useState(false);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  async function sincronizar() {
    setOcupado(true);
    try {
      await sincronizarAhora();
    } finally {
      setOcupado(false);
    }
  }

  const estadoColor = !online ? colors.warning : sincronizando ? colors.info : colors.success;
  const estadoTexto = !online ? 'Sin conexión' : sincronizando ? 'Sincronizando…' : 'Conectado';

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Sincronización" />

        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>

          {/* Estado de conexión */}
          <Card style={{ gap: spacing.md }}>
            <View style={[styles.rowBetween]}>
              <View style={[styles.inline, { gap: spacing.sm }]}>
                <PulseDot color={estadoColor} active={online && sincronizando} />
                <ThemedText variant="subtitle">{estadoTexto}</ThemedText>
              </View>
              <ThemedText variant="caption" color="textMuted">
                {pendientes.length > 0 ? `${pendientes.length} pendiente(s)` : 'Todo al día'}
              </ThemedText>
            </View>

            <View style={[styles.rowBetween, { borderTopColor: colors.border }, styles.divider, { paddingTop: spacing.md }]}>
              <View style={styles.flex1}>
                <ThemedText variant="body">Simular sin conexión</ThemedText>
                <ThemedText variant="caption" color="textMuted">
                  Para probar el modo offline. Los cambios se guardan y se envían al reconectar.
                </ThemedText>
              </View>
              <Switch
                value={!online}
                onValueChange={(sinConexion) => setOnline(!sinConexion)}
                trackColor={{ true: colors.warning, false: colors.borderStrong }}
                thumbColor={colors.background}
              />
            </View>
          </Card>

          {/* Pendientes */}
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="overline" color="textMuted">
              Cambios pendientes
            </ThemedText>
            {pendientes.length === 0 ? (
              <Card style={{ gap: spacing.xs }}>
                <ThemedText variant="subtitle">No hay nada pendiente</ThemedText>
                <ThemedText variant="caption" color="textMuted">
                  Cuando trabajes sin conexión, aquí verás lo que falta enviar.
                </ThemedText>
              </Card>
            ) : (
              pendientes.map((op) => (
                <Card key={op.id} style={[styles.opRow, { gap: spacing.md }]}>
                  <View style={[styles.opTipo, { backgroundColor: colors.infoSurface, borderRadius: radii.pill }]}>
                    <ThemedText variant="overline" color="info">
                      {op.tipo.toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.flex1}>
                    <ThemedText variant="body">{op.descripcion}</ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      {`En espera desde ${formatHora(op.creadaEn)}`}
                    </ThemedText>
                  </View>
                </Card>
              ))
            )}
          </View>

          <Button
            label={online ? 'Sincronizar ahora' : 'Conéctate para sincronizar'}
            onPress={sincronizar}
            loading={ocupado || sincronizando}
            disabled={!online || pendientes.length === 0}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  flex1: { flex: 1 },
  opRow: { flexDirection: 'row', alignItems: 'center' },
  opTipo: { paddingHorizontal: 10, paddingVertical: 3 },
});
