import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  crearReglaAlerta,
  getAreas,
  getCompanyBrandById,
  getFlotaVehiculos,
  getReglasAlerta,
} from '@/services';
import { useTheme, useThemeController } from '@/theme';
import type { ReglaAlertaTipo } from '@/types';

/**
 * REGLAS DE ALERTA (FOM-02 §3.6): el supervisor crea la regla (exceso de
 * velocidad con límite, o mantenimiento preventivo cada X km) y la asigna a UN
 * vehículo o a VARIOS — con el atajo práctico de seleccionar por área. Cada
 * vehículo asignado queda monitoreado; al cumplirse una de mantenimiento, la
 * ODT preventiva se crea sola (§3.4).
 */
export default function ReglasAlertaScreen() {
  const { spacing } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const params = useLocalSearchParams<{ companyId?: string }>();
  // El supervisor PERSONAL (Ale, §5.1) solo configura alertas de SU cuenta;
  // los demás roles llegan con la empresa activa del panel.
  const companyId =
    user?.role === 'supervisor_personal' ? (user.companyId ?? '') : params.companyId || '';

  // ── Formulario de nueva regla ──
  const [tipo, setTipo] = useState<ReglaAlertaTipo>('velocidad');
  const [umbral, setUmbral] = useState('');
  const [servicio, setServicio] = useState('');
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [vehPicker, setVehPicker] = useState(false);
  const [areaPicker, setAreaPicker] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!companyId) return;
      let active = true;
      getCompanyBrandById(companyId).then((b) => {
        if (active && b) setBrand(b);
      });
      return () => {
        active = false;
      };
    }, [companyId, setBrand]),
  );

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [reglas, flota, areas] = await Promise.all([
        getReglasAlerta(companyId),
        getFlotaVehiculos(companyId),
        getAreas(companyId),
      ]);
      return { reglas, flota, areas };
    },
    [companyId],
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Crean alertas: el panel operativo y el supervisor PERSONAL (Ale, §5.1).
  // Ni Lino (no crea nada, §2.1) ni los usuarios personales (§6.1).
  if (!esAdmin(user) && user.role !== 'supervisor_personal') return <Redirect href="/" />;

  const etiquetaDe = (id: string) => {
    const v = data?.flota.find((f) => f.vehicle.id === id)?.vehicle;
    return v ? (v.alias ?? v.numero) : id;
  };

  const asignacionTexto =
    vehicleIds.length === 0
      ? 'Elegir vehículos…'
      : vehicleIds.length <= 3
        ? vehicleIds.map(etiquetaDe).join(', ')
        : `${vehicleIds.length} vehículos`;

  async function onCrear() {
    if (creando || !user) return;
    setError(null);
    setCreando(true);
    try {
      await crearReglaAlerta({
        companyId,
        tipo,
        umbral: Number(umbral.replace(',', '.')),
        servicio: servicio || undefined,
        vehicleIds,
        creadaPor: user.id,
      });
      setUmbral('');
      setServicio('');
      setVehicleIds([]);
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la alerta.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Reglas de alerta" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar las alertas." onRetry={recargar} />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {/* Crear regla (§3.6) */}
            <Card style={{ gap: spacing.md }}>
              <ThemedText variant="overline" color="textMuted">
                Nueva alerta
              </ThemedText>
              <SegmentedControl
                options={[
                  { value: 'velocidad', label: 'Exceso de velocidad' },
                  { value: 'mantenimiento', label: 'Mantenimiento' },
                ]}
                value={tipo}
                onChange={setTipo}
              />
              <TextField
                label={tipo === 'velocidad' ? 'Límite (km/h)' : 'Cada cuántos km'}
                value={umbral}
                onChangeText={setUmbral}
                placeholder={tipo === 'velocidad' ? '80' : '3000'}
                keyboardType="number-pad"
                inputMode="numeric"
                editable={!creando}
              />
              {tipo === 'mantenimiento' ? (
                <TextField
                  label="Servicio"
                  value={servicio}
                  onChangeText={setServicio}
                  placeholder='Ej. "Cambio de aceite"'
                  editable={!creando}
                />
              ) : null}
              <PickerField label="Asignar a" value={asignacionTexto} onPress={() => setVehPicker(true)} />
              <Button
                label="Seleccionar por área"
                variant="secondary"
                onPress={() => setAreaPicker(true)}
                disabled={(data?.areas.length ?? 0) === 0}
              />
              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}
              <Button label={creando ? 'Creando…' : 'Crear alerta'} onPress={onCrear} loading={creando} />
            </Card>

            {/* Reglas activas */}
            {estado === 'cargando' || !data ? (
              [0, 1].map((i) => <Skeleton key={i} height={72} radius={16} />)
            ) : data.reglas.length === 0 ? (
              <EmptyState
                title="Sin alertas configuradas"
                description="Crea la primera: velocidad o mantenimiento, asignada a tus vehículos."
              />
            ) : (
              data.reglas.map((r) => (
                <Card key={r.id} style={{ gap: spacing.sm }}>
                  {/* El título CEDE espacio (flex + minWidth 0) y envuelve a dos
                      líneas; el chip de estado nunca se monta encima. */}
                  <View style={[styles.rowTitulo, { gap: spacing.sm }]}>
                    <ThemedText variant="subtitle" style={styles.tituloRegla}>
                      {r.tipo === 'velocidad'
                        ? `Velocidad > ${r.umbral} km/h`
                        : `${r.servicio ?? 'Mantenimiento'} · cada ${r.umbral.toLocaleString('es')} km`}
                    </ThemedText>
                    <Chip tone={r.activa ? 'success' : 'textMuted'} label={r.activa ? 'Activa' : 'Pausada'} />
                  </View>
                  <ThemedText variant="caption" color="textSecondary" numberOfLines={2}>
                    {`Asignada a: ${r.vehicleIds.map(etiquetaDe).join(', ')}`}
                  </ThemedText>
                  {r.tipo === 'mantenimiento' && r.progresoKm ? (
                    <ThemedText variant="caption" color="textMuted">
                      {r.vehicleIds
                        .map((id) => `${etiquetaDe(id)}: ${(r.progresoKm?.[id] ?? 0).toLocaleString('es')} km`)
                        .join(' · ')}
                    </ThemedText>
                  ) : null}
                </Card>
              ))
            )}

            <ThemedText variant="caption" color="textMuted">
              Cuando una regla de mantenimiento se cumple, la ODT preventiva se crea sola y te llega
              la notificación. Al cerrarla, el contador se reinicia.
            </ThemedText>
          </ScrollView>
        )}

        {/* Selección de vehículos (1..N, §3.6) */}
        <OptionPickerModal
          visible={vehPicker}
          title="Asignar a vehículos"
          options={(data?.flota ?? []).map((f) => ({
            id: f.vehicle.id,
            label: f.vehicle.alias ?? f.vehicle.numero,
            helper: `${f.vehicle.marca} ${f.vehicle.modelo} · ${f.vehicle.placa}`,
          }))}
          selectedIds={vehicleIds}
          multiSelect
          onChange={setVehicleIds}
          onClose={() => setVehPicker(false)}
        />
        {/* Atajo práctico: todos los vehículos de un área (§3.6). */}
        <OptionPickerModal
          visible={areaPicker}
          title="Todos los de un área"
          options={(data?.areas ?? []).map((a) => ({ id: a.id, label: a.nombre }))}
          selectedIds={[]}
          onChange={(ids) => {
            const areaId = ids[0];
            if (!areaId || !data) return;
            setVehicleIds(data.flota.filter((f) => f.vehicle.areaId === areaId).map((f) => f.vehicle.id));
          }}
          onClose={() => setAreaPicker(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Título arriba-alineado con el chip: el texto envuelve, el chip no se mueve.
  rowTitulo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tituloRegla: { flex: 1, minWidth: 0 },
});
