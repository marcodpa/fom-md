import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

/** Iniciales (máx. 2) para el avatar sin foto. */
function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type AvatarProps = {
  /** Foto real de la persona (URL). Sin ella, se muestran las iniciales. */
  uri?: string;
  /** Nombre, para las iniciales cuando no hay foto. */
  nombre: string;
  size?: number;
};

/**
 * Avatar de una persona: su FOTO real si la tiene; si no, sus INICIALES en un
 * círculo con el color de marca — nunca una foto de relleno aleatoria. Fuente
 * única para las listas de personal y las cabeceras de perfil.
 */
export function Avatar({ uri, nombre, size = 44 }: AvatarProps) {
  const { colors, radii } = useTheme();
  const box = { width: size, height: size, borderRadius: radii.pill };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        recyclingKey={uri}
        style={[box, { backgroundColor: colors.surfaceSunken }]}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[box, styles.fallback, { backgroundColor: colors.primary }]}>
      <ThemedText variant="button" style={{ color: colors.onPrimary }}>
        {iniciales(nombre)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
