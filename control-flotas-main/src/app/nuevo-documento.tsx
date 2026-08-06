import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EvidenceField } from '@/components/evidence-field';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { crearDocumento, getMiPerfil } from '@/services';
import { useTheme } from '@/theme';

/** Documento del catálogo, con lo que YA está declarado (número/vencimiento). */
type DocOpcion = {
  tipo: string;
  /** Número declarado (cédula/licencia): se muestra, no se reescribe. */
  numero?: string;
  /** Vencimiento declarado (licencia/carta): se pre-carga y no se edita. */
  venceFijo?: string;
};

/** Tipos de documento del vehículo (los del alta). */
const DOCS_VEHICULO = ['Trimestres', 'Responsabilidad civil (RCV)', 'Carné de circulación', 'Póliza de seguro'];

/**
 * AÑADIR DOCUMENTO — un solo flujo: eliges de la LISTA de documentos con los
 * que trabajamos (los personales salen de lo que ya declaraste en tu perfil:
 * cédula, licencia, carta médica; los del vehículo, los del alta). El número y
 * el vencimiento vienen de esa info declarada — solo subes la foto y se
 * empareja. Así no se sube "otra cédula" con otra fecha.
 */
export default function NuevoDocumentoScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ ambito?: string; vehicleId?: string; tipo?: string }>();
  const esVehiculo = params.ambito === 'vehiculo' && !!params.vehicleId;
  const tipoParam = params.tipo;

  // Info personal ya declarada (para pre-cargar cédula/licencia/carta médica).
  const { data: perfil } = useAsyncData(
    () => (user && !esVehiculo ? getMiPerfil(user.id, user.name) : Promise.resolve(null)),
    [user?.id, esVehiculo],
  );

  const [elegido, setElegido] = useState<DocOpcion | null>(null);
  const [venceEn, setVenceEn] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [tipoPicker, setTipoPicker] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-selecciona el documento si vino indicado (desde "Mi perfil") y ya cargó
  // el perfil, para traer su número/vencimiento declarado.
  useEffect(() => {
    if (!tipoParam || elegido || esVehiculo || !perfil) return;
    const numero =
      tipoParam === 'Cédula de identidad'
        ? perfil.cedula
        : tipoParam === 'Licencia de conducir'
          ? perfil.licenciaNumero
          : undefined;
    const venceFijo =
      tipoParam === 'Licencia de conducir'
        ? perfil.licenciaVence
        : tipoParam === 'Carta médica'
          ? perfil.cartaMedicaVence
          : undefined;
    setElegido({ tipo: tipoParam, numero, venceFijo });
    setVenceEn(venceFijo ?? '');
  }, [tipoParam, elegido, esVehiculo, perfil]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  // Catálogo según la vista: del vehículo (tipos del alta) o personales (lo que
  // el perfil tenga declarado). Solo el conductor tiene licencia y carta médica.
  const opciones: DocOpcion[] = esVehiculo
    ? DOCS_VEHICULO.map((t) => ({ tipo: t }))
    : [
        { tipo: 'Cédula de identidad', numero: perfil?.cedula },
        ...(user.drives && perfil?.licenciaNumero
          ? [{ tipo: 'Licencia de conducir', numero: perfil.licenciaNumero, venceFijo: perfil.licenciaVence }]
          : []),
        ...(user.drives && perfil?.cartaMedicaVence
          ? [{ tipo: 'Carta médica', venceFijo: perfil.cartaMedicaVence }]
          : []),
      ];

  function elegir(tipo: string) {
    const op = opciones.find((o) => o.tipo === tipo) ?? { tipo };
    setElegido(op);
    setVenceEn(op.venceFijo ?? '');
    setTipoPicker(false);
  }

  // El vencimiento solo se escribe cuando NO está declarado (ej. la cédula).
  const venceBloqueado = !!elegido?.venceFijo;

  async function onCrear() {
    if (ocupado || !user || !elegido) return;
    setError(null);
    setOcupado(true);
    try {
      await crearDocumento({
        ambito: esVehiculo ? 'vehiculo' : 'persona',
        userId: user.id,
        vehicleId: esVehiculo ? params.vehicleId : undefined,
        tipo: elegido.tipo,
        venceEn,
        fotoUris: fotos,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el documento.');
      setOcupado(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={esVehiculo ? 'Documento del vehículo' : 'Documento personal'} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            <Card style={{ gap: spacing.md }}>
              {/* Se ELIGE de la lista (no se escribe): así el documento se
                  empareja con el tipo y la info ya declarada. */}
              <PickerField
                label="¿Qué documento es?"
                value={elegido?.tipo ?? 'Elige el documento'}
                onPress={() => setTipoPicker(true)}
                disabled={ocupado}
              />

              {/* Número declarado (cédula/licencia): solo se muestra, no se toca. */}
              {elegido?.numero ? (
                <ThemedText variant="caption" color="textSecondary">
                  {`Número: ${elegido.numero} · lo tomamos de tu perfil.`}
                </ThemedText>
              ) : null}

              <View style={{ gap: spacing.xs }}>
                <TextField
                  label="Fecha de vencimiento"
                  value={venceEn}
                  onChangeText={setVenceEn}
                  placeholder="AAAA-MM-DD"
                  autoCapitalize="none"
                  editable={!ocupado && !venceBloqueado}
                />
                {venceBloqueado ? (
                  <ThemedText variant="caption" color="textMuted">
                    Este vencimiento viene de tu perfil. Para cambiarlo, edítalo en “Mi perfil”.
                  </ThemedText>
                ) : null}
              </View>

              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="caption" color="textSecondary">
                  Foto del documento
                </ThemedText>
                <EvidenceField uris={fotos} onChange={setFotos} />
              </View>

              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}
              <Button
                label={ocupado ? 'Guardando…' : 'Guardar documento'}
                onPress={onCrear}
                loading={ocupado}
                disabled={!elegido || !venceEn.trim()}
              />
              <ThemedText variant="caption" color="textMuted">
                Cuando esté por vencer (30 días antes) te avisamos en Alertas.
              </ThemedText>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Lista de documentos con los que trabajamos. */}
        <OptionPickerModal
          visible={tipoPicker}
          title="¿Qué documento es?"
          options={opciones.map((o) => ({
            id: o.tipo,
            label: o.tipo,
            helper: o.venceFijo ? `Vence ${o.venceFijo} (de tu perfil)` : o.numero ? `Nº ${o.numero}` : undefined,
          }))}
          selectedIds={elegido ? [elegido.tipo] : []}
          onChange={(ids) => {
            if (ids[0]) elegir(ids[0]);
          }}
          onClose={() => setTipoPicker(false)}
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
});
