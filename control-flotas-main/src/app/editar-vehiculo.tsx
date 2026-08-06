import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { confirmar } from '@/lib/confirmar';
import { validarAnio, validarIdVehiculo, validarPlaca } from '@/lib/validate';
import { LISTA_MARCAS, MARCAS, TIPOS_VEHICULO, tipoVehiculoPorValor } from '@/lib/vehiculos';
import {
  actualizarVehiculo,
  eliminarVehiculo,
  esDesempleados,
  getEmpresasSistema,
  getVehiculo,
} from '@/services';
import { useTheme } from '@/theme';
import type { Company, VehicleType } from '@/types';

/** Nombre legible de la plantilla de inspección que guarda el vehículo. */
const PLANTILLA_LABEL: Record<VehicleType, string> = {
  auto: 'Automóvil / Sedán',
  camioneta: 'Camioneta / Pickup',
  camion: 'Camión',
  otro: 'Otro',
};

/**
 * EDITAR VEHÍCULO — el CRUD de unidades, espejo del de usuarios: datos de la
 * unidad (alias, marca, modelo, año, placa), su ENTE (moverla de empresa
 * dentro del alcance de quien edita) y eliminarla. Al moverla de empresa
 * pierde su área y su conductor principal (pertenecen a cada ente).
 */
export default function EditarVehiculoScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = params.vehicleId || '';

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [vehiculo, empresas] = await Promise.all([getVehiculo(vehicleId), getEmpresasSistema()]);
      return { vehiculo, empresas };
    },
    [vehicleId],
    { onFocus: true },
  );

  // Formulario (se precarga UNA vez por unidad; el refetch no pisa lo editado).
  const [cargadoId, setCargadoId] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [placa, setPlaca] = useState('');
  const [idUnidad, setIdUnidad] = useState('');
  // Tipo NUEVO elegido (granular): '' = no se tocó, se conserva la plantilla.
  const [tipoValor, setTipoValor] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [empresaPicker, setEmpresaPicker] = useState(false);
  const [marcaPicker, setMarcaPicker] = useState(false);
  const [modeloPicker, setModeloPicker] = useState(false);
  const [tipoPicker, setTipoPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [ocupado, setOcupado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehiculo = data?.vehiculo ?? null;
  // Modelos de la marca elegida (o texto libre si la marca no está en catálogo).
  const modelosDeMarca = marca ? (MARCAS[marca] ?? []) : [];
  const marcaSinCatalogo = !!marca && modelosDeMarca.length === 0;

  useEffect(() => {
    if (vehiculo && cargadoId !== vehiculo.id) {
      setAlias(vehiculo.alias ?? '');
      setMarca(vehiculo.marca);
      setModelo(vehiculo.modelo);
      setAnio(String(vehiculo.anio));
      setPlaca(vehiculo.placa);
      setIdUnidad(vehiculo.numero ?? '');
      setTipoValor('');
      setCompanyId(vehiculo.companyId);
      setErrores({});
      setCargadoId(vehiculo.id);
    }
  }, [vehiculo, cargadoId]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // El CRUD de vehículos es SOLO de la administración FOM. Los administradores
  // de una ente solo ven la unidad y asignan su conductor (en /unidad).
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  const empresas = data?.empresas ?? [];

  // ENTES a las que FOM puede mover la unidad (no compañías: no operan flota).
  const alcance: Company[] = empresas.filter(
    (e) => (e.tipo ?? 'estandar') !== 'predefinida' && !esDesempleados(e.id),
  );
  const puedeMover = alcance.length > 1;
  const empresaActual = empresas.find((e) => e.id === companyId);

  /** Valida los datos de la unidad (mismo criterio que el alta). */
  function validar(): boolean {
    const e: Record<string, string | null> = {};
    if (!alias.trim()) e.alias = 'Ponle el alias interno de la unidad.';
    if (!marca.trim()) e.marca = 'Elige la marca.';
    if (!modelo.trim()) e.modelo = 'Elige el modelo.';
    e.anio = validarAnio(anio);
    e.placa = validarPlaca(placa);
    e.idUnidad = validarIdVehiculo(idUnidad);
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  async function onGuardar() {
    if (ocupado || !vehiculo) return;
    setError(null);
    setGuardado(false);
    if (!validar()) return;
    setOcupado(true);
    try {
      const anioNum = Number(anio.trim());
      // El tipo se guarda por su PLANTILLA (lo que persiste el vehículo); solo
      // se envía si se eligió una nueva y cambia respecto a la actual.
      const nuevaPlantilla = tipoValor ? tipoVehiculoPorValor(tipoValor)?.plantilla : undefined;
      await actualizarVehiculo({
        vehicleId,
        alias: alias.trim() !== (vehiculo.alias ?? '') ? alias : undefined,
        marca: marca.trim() !== vehiculo.marca ? marca : undefined,
        modelo: modelo.trim() !== vehiculo.modelo ? modelo : undefined,
        anio: Number.isFinite(anioNum) && anioNum !== vehiculo.anio ? anioNum : undefined,
        placa: placa.trim().toUpperCase() !== vehiculo.placa ? placa : undefined,
        tipo: nuevaPlantilla && nuevaPlantilla !== vehiculo.tipo ? nuevaPlantilla : undefined,
        numero: idUnidad.trim().toUpperCase() !== (vehiculo.numero ?? '').toUpperCase() ? idUnidad : undefined,
        companyId: companyId !== vehiculo.companyId ? companyId : undefined,
      });
      setGuardado(true);
      // El formulario ya refleja lo guardado; NO se resetea cargadoId porque
      // re-precargaría con la data en caché (aún la vieja) durante la recarga.
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setOcupado(false);
    }
  }

  function onEliminar() {
    if (!vehiculo) return;
    confirmar({
      titulo: 'Eliminar vehículo',
      mensaje: `Se elimina ${vehiculo.alias ?? vehiculo.numero} (${vehiculo.placa}) con su historial. Esto no se puede deshacer.`,
      accion: 'Eliminar',
      onConfirmar: async () => {
        setError(null);
        setOcupado(true);
        try {
          await eliminarVehiculo(vehicleId);
          router.back();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo eliminar.');
          setOcupado(false);
        }
      },
    });
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={vehiculo ? (vehiculo.alias ?? vehiculo.numero) : 'Vehículo'} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          {estado === 'error' ? (
            <ErrorState description="No pudimos cargar el vehículo." onRetry={recargar} />
          ) : !data ? (
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <Skeleton height={260} radius={16} />
              <Skeleton height={90} radius={16} />
            </View>
          ) : !vehiculo ? (
            <ErrorState description="Ese vehículo ya no existe." onRetry={() => router.back()} />
          ) : (
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              keyboardShouldPersistTaps="handled">
              {/* ── LA UNIDAD ── */}
              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="overline" color="textMuted">
                    Unidad
                  </ThemedText>
                  {guardado ? <Chip tone="success" label="Guardado ✓" /> : null}
                </View>
                <TextField
                  label="Alias"
                  value={alias}
                  onChangeText={setAlias}
                  placeholder="Camioneta de Producción"
                  editable={!ocupado}
                  error={errores.alias ?? undefined}
                />

                {/* Marca (buscador). */}
                <View style={{ gap: 4 }}>
                  <PickerField label="Marca" value={marca || 'Elige la marca'} onPress={() => setMarcaPicker(true)} disabled={ocupado} />
                  {errores.marca ? (
                    <ThemedText variant="caption" color="danger">{errores.marca}</ThemedText>
                  ) : null}
                </View>

                {/* Modelo (buscador por marca, o libre si la marca no tiene catálogo). */}
                {marcaSinCatalogo ? (
                  <TextField label="Modelo" value={modelo} onChangeText={setModelo} editable={!ocupado} error={errores.modelo ?? undefined} />
                ) : (
                  <View style={{ gap: 4 }}>
                    <PickerField
                      label="Modelo"
                      value={modelo || (marca ? 'Elige el modelo' : 'Elige la marca primero')}
                      onPress={() => {
                        if (marca && !ocupado) setModeloPicker(true);
                      }}
                      disabled={ocupado || !marca}
                    />
                    {errores.modelo ? (
                      <ThemedText variant="caption" color="danger">{errores.modelo}</ThemedText>
                    ) : null}
                  </View>
                )}

                <TextField
                  label="Año"
                  value={anio}
                  onChangeText={(t) => setAnio(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  editable={!ocupado}
                  error={errores.anio ?? undefined}
                />
                <TextField
                  label="Placa"
                  value={placa}
                  onChangeText={setPlaca}
                  autoCapitalize="characters"
                  editable={!ocupado}
                  error={errores.placa ?? undefined}
                />

                {/* Tipo de vehículo (incluye industriales). Guarda su plantilla
                    de inspección; si no se toca, se conserva la actual. El área
                    y el conductor se gestionan en la pantalla de la unidad. */}
                <PickerField
                  label="Tipo de vehículo"
                  value={
                    tipoValor
                      ? (tipoVehiculoPorValor(tipoValor)?.label ?? tipoValor)
                      : vehiculo?.tipo
                        ? PLANTILLA_LABEL[vehiculo.tipo]
                        : 'Elige el tipo'
                  }
                  onPress={() => setTipoPicker(true)}
                  disabled={ocupado}
                />

                {/* Id de la unidad en el sistema (sin espacios). */}
                <TextField
                  label="Id de la unidad"
                  value={idUnidad}
                  onChangeText={(t) => setIdUnidad(t.replace(/\s/g, ''))}
                  placeholder="Ej. U-07, CAM-123, #A15"
                  autoCapitalize="characters"
                  editable={!ocupado}
                  error={errores.idUnidad ?? undefined}
                />
              </Card>

              {/* ── SU ENTE ── */}
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  Ente
                </ThemedText>
                {puedeMover ? (
                  <>
                    <PickerField
                      label="Empresa"
                      value={empresaActual?.name ?? companyId}
                      onPress={() => setEmpresaPicker(true)}
                      disabled={ocupado}
                    />
                    <ThemedText variant="caption" color="textMuted">
                      Al moverla de empresa, la unidad pierde su área y su conductor principal (se
                      reasignan en la ente nueva).
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText variant="caption" color="textMuted">
                    {`Empresa: ${empresaActual?.name ?? '—'}`}
                  </ThemedText>
                )}
              </Card>

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}

              <Button label={ocupado ? 'Guardando…' : 'Guardar cambios'} onPress={onGuardar} loading={ocupado} />

              {/* ── ZONA PELIGROSA ── */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="danger">
                  Zona peligrosa
                </ThemedText>
                <Button label="Eliminar" variant="danger" onPress={onEliminar} disabled={ocupado} />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* Marca (buscador). Cambiarla limpia el modelo elegido. */}
        <OptionPickerModal
          visible={marcaPicker}
          title="Marca del vehículo"
          searchable
          options={LISTA_MARCAS.map((m) => ({ id: m, label: m }))}
          selectedIds={marca ? [marca] : []}
          onChange={(ids) => {
            const m = ids[0] ?? '';
            setMarca(m);
            setModelo('');
          }}
          onClose={() => setMarcaPicker(false)}
        />

        {/* Modelo (buscador, según la marca). */}
        <OptionPickerModal
          visible={modeloPicker}
          title={marca ? `Modelo (${marca})` : 'Modelo'}
          searchable
          options={modelosDeMarca.map((m) => ({ id: m, label: m }))}
          selectedIds={modelo ? [modelo] : []}
          onChange={(ids) => setModelo(ids[0] ?? '')}
          onClose={() => setModeloPicker(false)}
        />

        {/* Tipo de vehículo (incluye industriales). */}
        <OptionPickerModal
          visible={tipoPicker}
          title="Tipo de vehículo"
          searchable
          options={TIPOS_VEHICULO.map((t) => ({ id: t.value, label: t.label }))}
          selectedIds={tipoValor ? [tipoValor] : []}
          onChange={(ids) => setTipoValor(ids[0] ?? '')}
          onClose={() => setTipoPicker(false)}
        />

        {/* Mover la unidad a otra ente del alcance. */}
        <OptionPickerModal
          visible={empresaPicker}
          title="¿A qué ente pertenece la unidad?"
          options={alcance.map((e) => ({ id: e.id, label: e.name }))}
          selectedIds={companyId ? [companyId] : []}
          onChange={(ids) => {
            const id = ids[0];
            if (!id) return;
            setEmpresaPicker(false);
            setCompanyId(id);
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
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
