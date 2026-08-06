import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type AvatarPickerProps = {
  /** Foto actual (URL o URI local), o `undefined` para mostrar las iniciales. */
  uri?: string;
  /** Nombre, para las iniciales del avatar sin foto. */
  nombre: string;
  /** Devuelve la nueva foto elegida (UNA sola: reemplaza la anterior). */
  onChange: (uri: string) => void;
  size?: number;
};

/** Iniciales para el avatar cuando no hay foto. */
function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Foto de perfil estilo red social: UNA sola foto, en círculo, que se
 * reemplaza (no se acumula como las evidencias). Tomar con la cámara o elegir
 * de la galería. La subida a Cloudinary la hace quien guarda el perfil.
 */
export function AvatarPicker({ uri, nombre, onChange, size = 96 }: AvatarPickerProps) {
  const { colors, spacing } = useTheme();

  async function tomarFoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Habilita la cámara para tomar tu foto de perfil.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
  }

  async function elegirDeGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Habilita la galería para elegir tu foto de perfil.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
  }

  return (
    <View style={[styles.wrap, { gap: spacing.md }]}>
      {uri ? (
        <Image
          source={{ uri }}
          // recyclingKey = URL: si cambia (otra cuenta, otra foto), expo-image
          // NO reutiliza la imagen cacheada de antes — cada quien ve la suya.
          recyclingKey={uri}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSunken }}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary },
          ]}>
          <ThemedText variant="title" style={{ color: colors.onPrimary }}>
            {iniciales(nombre)}
          </ThemedText>
        </View>
      )}
      <View style={[styles.actions, { gap: spacing.sm }]}>
        <PillButton label="Tomar foto" tone="primary" onPress={tomarFoto} />
        <PillButton label="Galería" onPress={elegirDeGaleria} />
        {uri ? <PillButton label="Quitar" tone="danger" onPress={() => onChange('')} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row' },
});
