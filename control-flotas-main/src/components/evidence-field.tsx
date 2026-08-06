import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { PhotoViewer } from '@/components/photo-viewer';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type EvidenceFieldProps = {
  /** URIs de las fotos actuales (controlado por el padre). */
  uris: string[];
  onChange: (uris: string[]) => void;
};

/**
 * Captura de evidencia (fotos) — encapsula `expo-image-picker`.
 *
 * Todo el acceso a cámara/galería vive aquí, aislado: si mañana cambia el
 * mecanismo de captura, se toca solo este componente. La foto es obligatoria
 * a nivel de formulario (brief sección 8); aquí solo se gestionan las fotos.
 */
export function EvidenceField({ uris, onChange }: EvidenceFieldProps) {
  const { colors, radii, spacing } = useTheme();
  // Foto abierta a pantalla completa (visor), o null.
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);

  async function tomarFoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Habilita la cámara para tomar la foto de evidencia.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) onChange([...uris, ...res.assets.map((a) => a.uri)]);
  }

  async function elegirDeGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Habilita la galería para adjuntar la foto.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: true,
    });
    if (!res.canceled) onChange([...uris, ...res.assets.map((a) => a.uri)]);
  }

  function quitar(uri: string) {
    onChange(uris.filter((u) => u !== uri));
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={[styles.actions, { gap: spacing.sm }]}>
        <ActionTile label="Tomar foto" onPress={tomarFoto} />
        <ActionTile label="Galería" onPress={elegirDeGaleria} />
      </View>

      {uris.length > 0 ? (
        <View style={[styles.thumbs, { gap: spacing.sm }]}>
          {uris.map((uri) => (
            <View
              key={uri}
              style={[styles.thumbWrap, { borderRadius: radii.md, borderColor: colors.border }]}>
              {/* Tocar la foto la abre a pantalla completa (no en miniatura). */}
              <Pressable
                onPress={() => setFotoAbierta(uri)}
                accessibilityRole="imagebutton"
                accessibilityLabel="Ver foto a pantalla completa"
                style={styles.thumb}>
                <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
              </Pressable>
              <Pressable
                onPress={() => quitar(uri)}
                hitSlop={6}
                style={[styles.remove, { backgroundColor: colors.danger, borderRadius: radii.pill }]}>
                <ThemedText variant="caption" style={{ color: colors.onDanger }}>
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <PhotoViewer uri={fotoAbierta} onClose={() => setFotoAbierta(null)} />
    </View>
  );
}

/** Botón-tarjeta para una acción de captura (cámara / galería). */
function ActionTile({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.tile,
        {
          backgroundColor: colors.surfaceSunken,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingVertical: spacing.lg,
        },
      ]}>
      <ThemedText variant="button" color="primary">
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
