import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

export type PickerOption = { id: string; label: string; helper?: string };

// ── Campo que abre el selector ─────────────────────────────────────────────

type PickerFieldProps = {
  label: string;
  /** Texto del valor actual (ej. el nombre de la empresa elegida). */
  value: string;
  onPress: () => void;
  disabled?: boolean;
};

/** Campo tipo "select": muestra etiqueta + valor y abre el modal al tocarlo. */
export function PickerField({ label, value, onPress, disabled }: PickerFieldProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ gap: spacing.xs }}>
      <ThemedText variant="overline" color="textMuted">
        {label}
      </ThemedText>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        <ThemedText variant="body" numberOfLines={1} style={styles.flex1}>
          {value}
        </ThemedText>
        {/* Chevron real (mismo trazo que la familia de íconos), no un carácter. */}
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="m6 9 6 6 6-6"
            stroke={colors.textMuted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </PressableScale>
  );
}

// ── Modal de selección (único o múltiple) ──────────────────────────────────

type OptionPickerModalProps = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  /** Ids seleccionados. En modo único, 0 o 1 elemento. */
  selectedIds: string[];
  multiSelect?: boolean;
  /** Muestra un buscador arriba para filtrar por etiqueta (ej. marcas/modelos). */
  searchable?: boolean;
  onChange: (ids: string[]) => void;
  onClose: () => void;
};

/**
 * Modal reutilizable para elegir opciones del tema. En modo único cierra al
 * tocar; en múltiple acumula y confirma con "Listo". Todo el color es del tema.
 */
export function OptionPickerModal({
  visible,
  title,
  options,
  selectedIds,
  multiSelect = false,
  searchable = false,
  onChange,
  onClose,
}: OptionPickerModalProps) {
  const { colors, radii, spacing, shadows } = useTheme();
  // Estado temporal para modo múltiple (se confirma al pulsar "Listo").
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [busqueda, setBusqueda] = useState('');

  // Re-sincroniza el borrador cada vez que se abre.
  function abrir() {
    setDraft(selectedIds);
    setBusqueda('');
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function toggle(id: string) {
    if (!multiSelect) {
      onChange([id]);
      onClose();
      return;
    }
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function confirmar() {
    onChange(draft);
    onClose();
  }

  const activeIds = multiSelect ? draft : selectedIds;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={abrir}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Hoja inferior; detiene la propagación para no cerrarse al tocar dentro. */}
        <Pressable
          style={[
            styles.sheet,
            shadows.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.lg,
              gap: spacing.md,
            },
          ]}
          onPress={() => {}}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          <ThemedText variant="subtitle">{title}</ThemedText>

          {searchable ? (
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[
                styles.buscador,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.text,
                  paddingHorizontal: spacing.md,
                },
              ]}
            />
          ) : null}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {visibles.length === 0 ? (
              <ThemedText variant="caption" color="textMuted" style={{ paddingVertical: spacing.md }}>
                Sin resultados.
              </ThemedText>
            ) : null}
            {visibles.map((opt) => {
              const active = activeIds.includes(opt.id);
              return (
                <PressableScale
                  key={opt.id}
                  onPress={() => toggle(opt.id)}
                  style={[
                    styles.option,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.surface : 'transparent',
                      borderRadius: radii.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}>
                  <View style={styles.flex1}>
                    <ThemedText variant="body" color={active ? 'primary' : 'text'}>
                      {opt.label}
                    </ThemedText>
                    {opt.helper ? (
                      <ThemedText variant="caption" color="textMuted">
                        {opt.helper}
                      </ThemedText>
                    ) : null}
                  </View>
                  {/* Marca de selección (check para múltiple, punto para único). */}
                  {active ? (
                    <ThemedText variant="body" color="primary">
                      {multiSelect ? '✓' : '●'}
                    </ThemedText>
                  ) : null}
                </PressableScale>
              );
            })}
          </ScrollView>

          {multiSelect ? (
            <Button label={`Listo (${draft.length})`} onPress={confirmar} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  flex1: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '80%' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  buscador: { height: 44, borderWidth: StyleSheet.hairlineWidth, fontSize: 15 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
});
