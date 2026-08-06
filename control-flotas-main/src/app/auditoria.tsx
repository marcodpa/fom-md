import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar, normalizar } from '@/components/search-bar';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getAuditoria } from '@/services';
import { useTheme, type ColorTokens } from '@/theme';
import type { AuditoriaAccion, AuditoriaEntidad, AuditoriaEvento } from '@/types';

const ACCION: Record<AuditoriaAccion, { verbo: string; tono: keyof ColorTokens }> = {
  crear: { verbo: 'Creó', tono: 'success' },
  editar: { verbo: 'Editó', tono: 'info' },
  eliminar: { verbo: 'Eliminó', tono: 'danger' },
};

const ENTIDAD: Record<AuditoriaEntidad, string> = {
  empresa: 'empresa',
  usuario: 'usuario',
  vehiculo: 'vehículo',
  pago: 'pago',
  servicio: 'servicio',
};

/** Filtro por acción (segmentado de arriba). */
type AccionFiltro = 'todas' | AuditoriaAccion;
const FILTROS: { value: AccionFiltro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'crear', label: 'Creó' },
  { value: 'editar', label: 'Editó' },
  { value: 'eliminar', label: 'Eliminó' },
];

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Hora exacta HH:MM:SS (local). */
function horaExacta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type DiaGrupo = { key: string; label: string; eventos: AuditoriaEvento[] };
type MesGrupo = { key: string; label: string; dias: DiaGrupo[]; total: number };
type AnioGrupo = { key: string; label: string; meses: MesGrupo[]; total: number };

/**
 * Agrupa los eventos (ya ordenados del más reciente al más antiguo) en carpetas
 * Año → Mes → Día. Se agrupa por día LOCAL (no UTC) para que la hora venezolana
 * caiga en el día correcto.
 */
function agrupar(eventos: AuditoriaEvento[]): AnioGrupo[] {
  const anios: AnioGrupo[] = [];
  const anioMap = new Map<string, AnioGrupo>();
  const mesMap = new Map<string, MesGrupo>();
  const diaMap = new Map<string, DiaGrupo>();
  for (const e of eventos) {
    const d = new Date(e.fecha);
    const anioKey = String(d.getFullYear());
    const mesKey = `${anioKey}-${d.getMonth()}`;
    const diaKey = `${mesKey}-${d.getDate()}`;
    let anio = anioMap.get(anioKey);
    if (!anio) {
      anio = { key: anioKey, label: anioKey, meses: [], total: 0 };
      anioMap.set(anioKey, anio);
      anios.push(anio);
    }
    let mes = mesMap.get(mesKey);
    if (!mes) {
      mes = { key: mesKey, label: capitalizar(d.toLocaleString('es', { month: 'long' })), dias: [], total: 0 };
      mesMap.set(mesKey, mes);
      anio.meses.push(mes);
    }
    let dia = diaMap.get(diaKey);
    if (!dia) {
      dia = { key: diaKey, label: capitalizar(d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })), eventos: [] };
      diaMap.set(diaKey, dia);
      mes.dias.push(dia);
    }
    dia.eventos.push(e);
    mes.total++;
    anio.total++;
  }
  return anios;
}

/** Carpeta abierta por defecto: SOLO el año más reciente. Los meses y los días
 *  arrancan cerrados; se abren con un toque para no ver toda la info regada. */
function clavesRecientes(anios: AnioGrupo[]): string[] {
  return anios[0] ? [anios[0].key] : [];
}

/** Fila-carpeta (año / mes / día) con su chevron y su cuenta. */
function Carpeta({ label, total, abierta, onPress, nivel }: { label: string; total: number; abierta: boolean; onPress: () => void; nivel: number }) {
  const { colors, spacing, radii } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${abierta ? 'Cerrar' : 'Abrir'} ${label}`}
      style={[
        styles.folder,
        {
          paddingLeft: spacing.lg + nivel * spacing.md,
          paddingRight: spacing.lg,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
          backgroundColor: nivel === 2 ? colors.surfaceSunken : 'transparent',
          borderRadius: nivel === 2 ? radii.md : 0,
        },
      ]}>
      <ThemedText variant="body" color="textMuted">
        {abierta ? '▾' : '›'}
      </ThemedText>
      <ThemedText variant={nivel === 0 ? 'subtitle' : 'button'} style={styles.flex1} numberOfLines={1}>
        {label}
      </ThemedText>
      <Chip tone="textMuted" label={`${total}`} />
    </PressableScale>
  );
}

/** Una acción registrada: qué, quién y hora exacta. */
function EventoFila({ e }: { e: AuditoriaEvento }) {
  const { spacing } = useTheme();
  const a = ACCION[e.accion];
  return (
    <View style={[styles.evento, { paddingLeft: spacing.lg + 3 * spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.sm, gap: 2 }]}>
      <View style={styles.rowTop}>
        <Chip tone={a.tono} label={a.verbo} />
        <ThemedText variant="button" style={styles.flex1} numberOfLines={2}>
          {`${ENTIDAD[e.entidad]} · ${e.objetivo}`}
        </ThemedText>
      </View>
      {e.companyNombre || e.detalle ? (
        <ThemedText variant="caption" color="textSecondary">
          {[e.companyNombre, e.detalle].filter(Boolean).join(' · ')}
        </ThemedText>
      ) : null}
      <ThemedText variant="caption" color="textMuted">
        {`${e.actorNombre} · ${horaExacta(e.fecha)}`}
      </ThemedText>
    </View>
  );
}

/**
 * AUDITORÍA — el historial de cada mutación (crear / editar / eliminar) del
 * sistema, organizado en CARPETAS por Año → Mes → Día. Cada acción muestra qué
 * se hizo, quién lo hizo y su fecha y hora EXACTAS. Arriba: buscador (objetivo,
 * persona, tipo o detalle) y filtro por tipo de acción. La ven el admin FOM
 * (todo) y la gente de una compañía (lo suyo); la RLS filtra por alcance.
 */
export default function AuditoriaScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();

  const { data: eventos, estado, recargar } = useAsyncData(getAuditoria, [], { onFocus: true });

  const [q, setQ] = useState('');
  const [accion, setAccion] = useState<AccionFiltro>('todas');
  // Carpetas abiertas (conjunto ABSOLUTO de claves). Se inicializa UNA vez con la
  // carpeta más reciente; a partir de ahí manda lo que el usuario abra/cierre.
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current || !eventos || eventos.length === 0) return;
    setAbiertas(new Set(clavesRecientes(agrupar(eventos))));
    iniciado.current = true;
  }, [eventos]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esMultiempresa(user) && user.companyTipo !== 'predefinida') {
    return <Redirect href="/" />;
  }

  const nq = normalizar(q);
  // Solo el BUSCADOR de texto abre todo (para ver las coincidencias sin drilling).
  // El filtro por acción (Creó/Editó/Eliminó) NO auto-expande: conserva la misma
  // estructura de carpetas (año abierto, meses y días cerrados).
  const buscando = nq !== '';
  const filtrados = (eventos ?? []).filter((e) => {
    if (accion !== 'todas' && e.accion !== accion) return false;
    if (!nq) return true;
    return normalizar(
      `${ACCION[e.accion].verbo} ${ENTIDAD[e.entidad]} ${e.objetivo} ${e.actorNombre} ${e.companyNombre ?? ''} ${e.detalle ?? ''}`,
    ).includes(nq);
  });
  const anios = agrupar(filtrados);

  // Al filtrar, TODO abierto (para ver los resultados sin drilling); si no, manda
  // el conjunto de carpetas abiertas. Tocar una carpeta no hace nada al filtrar.
  const abierto = (key: string) => buscando || abiertas.has(key);
  const toggle = (key: string) => {
    if (buscando) return;
    setAbiertas((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Auditoría" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar la auditoría." onRetry={recargar} />
        ) : !eventos ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={84} radius={16} />
            ))}
          </View>
        ) : eventos.length === 0 ? (
          <EmptyState
            title="Sin actividad registrada"
            description="Cada vez que alguien cree, edite o elimine una empresa, un usuario o un vehículo, quedará registrado aquí: qué se hizo, quién lo hizo y cuándo."
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por acción, persona, tipo o detalle…" />
            <SegmentedControl options={FILTROS} value={accion} onChange={setAccion} />

            {filtrados.length === 0 ? (
              <Card>
                <ThemedText variant="caption" color="textMuted">
                  Ninguna acción coincide con el filtro.
                </ThemedText>
              </Card>
            ) : (
              anios.map((anio) => (
                <Card key={anio.key} style={{ gap: 0, paddingVertical: spacing.xs, paddingHorizontal: 0 }}>
                  <Carpeta label={anio.label} total={anio.total} abierta={abierto(anio.key)} onPress={() => toggle(anio.key)} nivel={0} />
                  {abierto(anio.key)
                    ? anio.meses.map((mes) => (
                        <View key={mes.key}>
                          <Carpeta label={mes.label} total={mes.total} abierta={abierto(mes.key)} onPress={() => toggle(mes.key)} nivel={1} />
                          {abierto(mes.key)
                            ? mes.dias.map((dia) => (
                                <View key={dia.key} style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xs }}>
                                  <Carpeta
                                    label={dia.label}
                                    total={dia.eventos.length}
                                    abierta={abierto(dia.key)}
                                    onPress={() => toggle(dia.key)}
                                    nivel={2}
                                  />
                                  {abierto(dia.key) ? dia.eventos.map((e) => <EventoFila key={e.id} e={e} />) : null}
                                </View>
                              ))
                            : null}
                        </View>
                      ))
                    : null}
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  folder: { flexDirection: 'row', alignItems: 'center' },
  evento: { flexDirection: 'column' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1, minWidth: 0 },
});
