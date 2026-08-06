import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { periodoMesActual } from '@/services';
import { useTheme } from '@/theme';
import type { ReportPeriod } from '@/types';

/** Tipo de período: el mes en curso o un rango de fechas personalizado. */
export type PeriodoTipo = 'mes' | 'personalizado';

const TIPO_OPTIONS: SegmentOption<PeriodoTipo>[] = [
  { value: 'mes', label: 'Este mes' },
  { value: 'personalizado', label: 'Personalizado' },
];

/** Construye el período elegido a partir del tipo y las fechas personalizadas. */
export function construirPeriodo(tipo: PeriodoTipo, desde: string, hasta: string): ReportPeriod {
  if (tipo === 'mes') return periodoMesActual();
  return { desde, hasta, label: `${desde || '—'} – ${hasta || '—'}` };
}

type PeriodoSelectorProps = {
  tipo: PeriodoTipo;
  desde: string;
  hasta: string;
  onTipoChange: (t: PeriodoTipo) => void;
  onDesdeChange: (v: string) => void;
  onHastaChange: (v: string) => void;
};

/**
 * Selector de rango de tiempo de un reporte (brief §6): el mes en curso o un
 * rango de fechas personalizado. Reutilizable por los generadores de reportes.
 */
export function PeriodoSelector({
  tipo,
  desde,
  hasta,
  onTipoChange,
  onDesdeChange,
  onHastaChange,
}: PeriodoSelectorProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="overline" color="textMuted">
        Período
      </ThemedText>
      <SegmentedControl options={TIPO_OPTIONS} value={tipo} onChange={onTipoChange} />
      {tipo === 'personalizado' ? (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Desde"
              value={desde}
              onChangeText={onDesdeChange}
              placeholder="AAAA-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Hasta"
              value={hasta}
              onChangeText={onHastaChange}
              placeholder="AAAA-MM-DD"
              autoCapitalize="none"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
