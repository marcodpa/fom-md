import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { puedeConducir, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { dejarVehiculo, getMisUnidadesSecundario, ingresarPinEnGps } from '@/services';
import { useDriving } from '@/session';
import { useTheme } from '@/theme';

/**
 * USO TEMPORAL POR PIN (FOM-02 §4.3): el conductor secundario ingresa SU PIN en
 * el equipo GPS del vehículo y el sistema lo reconoce como conductor actual
 * temporal. Mientras llega el GPS real, esta pantalla SIMULA ese ingreso; al
 * dejar el vehículo, todo vuelve al principal.
 */
export default function PinUnidadScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();
  const { vehicle: vehiculoSesion, via, recheck } = useDriving();

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: unidades, estado, recargar } = useAsyncData(
    () => getMisUnidadesSecundario(user?.id ?? ''),
    [user?.id],
    { onFocus: true },
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!puedeConducir(user)) return <Redirect href="/" />;

  const elegida = unidades?.find((u) => u.vehicle.id === vehicleId);
  const sesionActiva = via === 'secundario' && vehiculoSesion;

  async function onIngresar() {
    if (!vehicleId || ocupado || !user) return;
    setError(null);
    if (pin.trim().length !== 4) {
      setError('El PIN tiene 4 dígitos.');
      return;
    }
    setOcupado(true);
    try {
      await ingresarPinEnGps(user.id, vehicleId, pin);
      setPin('');
      recheck(); // la sesión de conducción ahora es esta unidad
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar el PIN.');
    } finally {
      setOcupado(false);
    }
  }

  async function onDejar() {
    if (ocupado || !user) return;
    setOcupado(true);
    try {
      await dejarVehiculo(user.id);
      recheck(); // todo vuelve al principal
    } finally {
      setOcupado(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Usar otra unidad (PIN)" />

        <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
          {sesionActiva ? (
            // Sesión activa: la unidad vuelve al principal al dejarla (§4.3).
            <Card style={{ gap: spacing.md }}>
              <Chip tone="info" label="Uso temporal activo" />
              <ThemedText variant="subtitle">
                {`${vehiculoSesion.alias ?? vehiculoSesion.numero} · ${vehiculoSesion.marca} ${vehiculoSesion.modelo}`}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Estás reconocido como conductor actual. Los eventos y las ODT de este lapso quedan a
                tu nombre.
              </ThemedText>
              <Button label={ocupado ? 'Saliendo…' : 'Dejar el vehículo'} onPress={onDejar} loading={ocupado} />
            </Card>
          ) : estado === 'error' ? (
            <ErrorState description="No pudimos cargar tus unidades autorizadas." onRetry={recargar} />
          ) : !unidades ? (
            <>
              <Skeleton height={90} radius={16} />
              <Skeleton height={140} radius={16} />
            </>
          ) : unidades.length === 0 ? (
            <EmptyState
              title="Sin unidades autorizadas"
              description="Cuando tu supervisor te autorice como conductor secundario de una unidad, podrás usarla con tu PIN."
            />
          ) : (
            <Card style={{ gap: spacing.md }}>
              <ThemedText variant="caption" color="textSecondary">
                En campo, el PIN se ingresa en el equipo GPS del vehículo. Mientras llega el GPS
                real, simúlalo aquí.
              </ThemedText>
              <PickerField
                label="Unidad"
                value={elegida ? `${elegida.nombre} · ${elegida.vehicle.placa}` : 'Elegir unidad…'}
                onPress={() => setPickerVisible(true)}
                disabled={ocupado}
              />
              <TextField
                label="Tu PIN"
                value={pin}
                onChangeText={setPin}
                placeholder="••••"
                keyboardType="number-pad"
                inputMode="numeric"
                secureTextEntry
                maxLength={4}
                editable={!ocupado}
              />
              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}
              <Button label={ocupado ? 'Verificando…' : 'Ingresar PIN'} onPress={onIngresar} loading={ocupado} />
            </Card>
          )}
        </View>

        <OptionPickerModal
          visible={pickerVisible}
          title="¿Qué unidad vas a usar?"
          options={(unidades ?? []).map((u) => ({
            id: u.vehicle.id,
            label: u.nombre,
            helper: `${u.vehicle.marca} ${u.vehicle.modelo} · ${u.vehicle.placa}`,
          }))}
          selectedIds={vehicleId ? [vehicleId] : []}
          onChange={(ids) => setVehicleId(ids[0] ?? null)}
          onClose={() => setPickerVisible(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center' },
});
