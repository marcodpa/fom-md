import { StyleSheet, View } from 'react-native';

import { EvidenceField } from '@/components/evidence-field';
import { PressableScale } from '@/components/pressable-scale';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';
import type { InspeccionItem, InspeccionItemEstado, InspeccionItemRespuesta } from '@/types';

type InspectionItemProps = {
  item: InspeccionItem;
  /** Respuesta actual (controlada por el padre), o `undefined` si sin responder. */
  respuesta?: InspeccionItemRespuesta;
  onChange: (respuesta: InspeccionItemRespuesta) => void;
};

/**
 * Un ítem del checklist preoperacional (FOM-02 §4.1): nombre, si es crítico, y
 * las tres respuestas ✅ Conforme / ⚠️ Observación / ❌ Falla. En observación se
 * puede anotar qué se vio; en falla se piden nota + evidencia y, si el ítem NO
 * es crítico, la pregunta "¿crear ODT?" (los críticos generan su ODT siempre y
 * bloquean la salida — protección que se conserva).
 */
export function InspectionItem({ item, respuesta, onChange }: InspectionItemProps) {
  const { colors, spacing, radii } = useTheme();
  const estado = respuesta?.estado;

  function setEstado(nuevo: InspeccionItemEstado) {
    onChange({
      itemId: item.id,
      estado: nuevo,
      nota: nuevo === 'conforme' ? undefined : respuesta?.nota,
      // La evidencia solo acompaña a una falla.
      evidenciaUris: nuevo === 'falla' ? respuesta?.evidenciaUris : undefined,
      crearOdt: nuevo === 'falla' ? respuesta?.crearOdt : undefined,
    });
  }

  return (
    <View style={[styles.root, { gap: spacing.sm, paddingVertical: spacing.md }]}>
      <View style={[styles.header, { gap: spacing.md }]}>
        <View style={styles.flex1}>
          <View style={[styles.titleRow, { gap: spacing.sm }]}>
            <ThemedText variant="body">{item.nombre}</ThemedText>
            {item.critico ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.dangerSurface, borderRadius: radii.pill, paddingHorizontal: spacing.sm },
                ]}>
                <ThemedText variant="overline" color="danger">
                  Crítico
                </ThemedText>
              </View>
            ) : null}
          </View>
          {item.ayuda ? (
            <ThemedText variant="caption" color="textMuted">
              {item.ayuda}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Tres respuestas (§4.1): Conforme / Observación / Falla */}
      <View style={[styles.toggle, { gap: spacing.sm }]}>
        <ToggleButton
          label="✓ Conforme"
          active={estado === 'conforme'}
          activeBg={colors.success}
          activeFg={colors.onSuccess}
          onPress={() => setEstado('conforme')}
        />
        <ToggleButton
          label="⚠ Observación"
          active={estado === 'observacion'}
          activeBg={colors.warning}
          activeFg={colors.onWarning}
          onPress={() => setEstado('observacion')}
        />
        <ToggleButton
          label="✕ Falla"
          active={estado === 'falla'}
          activeBg={colors.danger}
          activeFg={colors.onDanger}
          onPress={() => setEstado('falla')}
        />
      </View>

      {/* Observación: qué se vio (sin bloquear ni ODT). */}
      {estado === 'observacion' ? (
        <TextField
          label="¿Qué observaste? (opcional)"
          value={respuesta?.nota ?? ''}
          onChangeText={(nota) => onChange({ itemId: item.id, estado: 'observacion', nota })}
          placeholder="Ej. el limpiaparabrisas deja rayas…"
          multiline
          style={styles.textarea}
        />
      ) : null}

      {/* Falla: nota + evidencia + ¿crear ODT? (solo pregunta en no críticos). */}
      {estado === 'falla' ? (
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="¿Qué observaste? (opcional)"
            value={respuesta?.nota ?? ''}
            onChangeText={(nota) =>
              onChange({ itemId: item.id, estado: 'falla', nota, evidenciaUris: respuesta?.evidenciaUris, crearOdt: respuesta?.crearOdt })
            }
            placeholder="Ej. la llanta delantera derecha está muy gastada…"
            multiline
            style={styles.textarea}
          />
          <ThemedText variant="caption" color="textSecondary">
            Evidencia (foto)
          </ThemedText>
          <EvidenceField
            uris={respuesta?.evidenciaUris ?? []}
            onChange={(evidenciaUris) =>
              onChange({ itemId: item.id, estado: 'falla', nota: respuesta?.nota, evidenciaUris, crearOdt: respuesta?.crearOdt })
            }
          />
          {item.critico ? (
            <ThemedText variant="caption" color="danger">
              Ítem crítico: se creará la ODT automáticamente y la salida queda bloqueada.
            </ThemedText>
          ) : (
            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="caption" color="textSecondary">
                ¿Crear ODT?
              </ThemedText>
              <View style={[styles.toggle, { gap: spacing.sm }]}>
                <ToggleButton
                  label="Sí, crear ODT"
                  active={respuesta?.crearOdt === true}
                  activeBg={colors.primary}
                  activeFg={colors.onPrimary}
                  onPress={() =>
                    onChange({ itemId: item.id, estado: 'falla', nota: respuesta?.nota, evidenciaUris: respuesta?.evidenciaUris, crearOdt: true })
                  }
                />
                <ToggleButton
                  label="Solo registrar"
                  active={respuesta?.crearOdt === false}
                  activeBg={colors.textSecondary}
                  activeFg={colors.background}
                  onPress={() =>
                    onChange({ itemId: item.id, estado: 'falla', nota: respuesta?.nota, evidenciaUris: respuesta?.evidenciaUris, crearOdt: false })
                  }
                />
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

/** Botón del toggle de respuesta. Inactivo: superficie con borde; activo: color. */
function ToggleButton({
  label,
  active,
  activeBg,
  activeFg,
  onPress,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  activeFg: string;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.toggleBtn,
        {
          backgroundColor: active ? activeBg : colors.surfaceSunken,
          borderColor: active ? activeBg : colors.border,
          borderRadius: radii.md,
          paddingVertical: spacing.sm,
        },
      ]}>
      <ThemedText
        variant="caption"
        numberOfLines={1}
        style={{ color: active ? activeFg : colors.textSecondary }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {},
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingVertical: 2 },
  flex1: { flex: 1 },
  toggle: { flexDirection: 'row' },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
