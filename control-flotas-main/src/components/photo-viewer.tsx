import { Image } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type PhotoViewerProps = {
  /** URI de la foto abierta, o `null` (cerrado). */
  uri: string | null;
  onClose: () => void;
};

const ZOOM_MAX = 5;
const ZOOM_DOBLE_TAP = 2.5;

/**
 * Visor de foto a PANTALLA COMPLETA: tocar una evidencia la abre entera (no
 * una miniatura). Con ZOOM (pellizco + doble toque) y DESCARGA a la galería
 * del teléfono. Fondo negro; cierre con ✕ o tocando el fondo.
 */
export function PhotoViewer({ uri, onClose }: PhotoViewerProps) {
  const { spacing, radii } = useTheme();
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Zoom y arrastre (reanimated: corre en el hilo de UI, sin jank).
  const scale = useSharedValue(1);
  const scaleInicial = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const txInicial = useSharedValue(0);
  const tyInicial = useSharedValue(0);

  // Cada foto abre limpia: sin zoom, centrada, sin avisos viejos.
  useEffect(() => {
    scale.value = 1;
    scaleInicial.value = 1;
    tx.value = 0;
    ty.value = 0;
    txInicial.value = 0;
    tyInicial.value = 0;
    setAviso(null);
    setGuardando(false);
  }, [uri, scale, scaleInicial, tx, ty, txInicial, tyInicial]);

  const pellizco = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(scaleInicial.value * e.scale, 1), ZOOM_MAX);
    })
    .onEnd(() => {
      scaleInicial.value = scale.value;
      if (scale.value <= 1.02) {
        // Volvió al tamaño natural: re-centrar.
        scale.value = withTiming(1);
        scaleInicial.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        txInicial.value = 0;
        tyInicial.value = 0;
      }
    });

  const arrastre = Gesture.Pan()
    .onUpdate((e) => {
      // Solo tiene sentido arrastrar cuando hay zoom.
      if (scaleInicial.value > 1) {
        tx.value = txInicial.value + e.translationX;
        ty.value = tyInicial.value + e.translationY;
      }
    })
    .onEnd(() => {
      txInicial.value = tx.value;
      tyInicial.value = ty.value;
    });

  const dobleToque = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const acercar = scale.value <= 1.02;
      scale.value = withTiming(acercar ? ZOOM_DOBLE_TAP : 1);
      scaleInicial.value = acercar ? ZOOM_DOBLE_TAP : 1;
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      txInicial.value = 0;
      tyInicial.value = 0;
    });

  // Un toque simple sobre la foto SIN zoom cierra (igual que el fondo).
  const toqueSimple = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(dobleToque)
    .onEnd(() => {
      if (scaleInicial.value <= 1.02) runOnJS(onClose)();
    });

  const gestos = Gesture.Simultaneous(pellizco, arrastre, Gesture.Exclusive(dobleToque, toqueSimple));

  const estiloFoto = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  /** Descarga la foto a la galería (Cloudinary o local; pide permiso una vez). */
  async function descargar() {
    if (!uri || guardando) return;
    if (Platform.OS === 'web') {
      setAviso('La descarga está disponible en la app móvil.');
      return;
    }
    setGuardando(true);
    setAviso(null);
    try {
      const permiso = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!permiso.granted) {
        setAviso('Habilita el acceso a fotos para guardarla.');
        return;
      }
      let local = uri;
      if (/^https?:\/\//.test(uri)) {
        // Remota (Cloudinary): primero baja a caché, luego a la galería.
        const archivo = await File.downloadFileAsync(uri, new Directory(Paths.cache, 'descargas'));
        local = archivo.uri;
      }
      await MediaLibrary.saveToLibraryAsync(local);
      setAviso('Guardada en tu galería ✓');
    } catch {
      setAviso('No se pudo guardar la foto. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      {/* El Modal crea su propia raíz nativa: los gestos necesitan la suya. */}
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.backdrop}>
          {/* Tocar el fondo cierra. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar foto" />

          {uri ? (
            <GestureDetector gesture={gestos}>
              <Animated.View style={[styles.photoWrap, estiloFoto]}>
                <Image source={{ uri }} style={styles.photo} contentFit="contain" />
              </Animated.View>
            </GestureDetector>
          ) : null}

          {/* Cerrar */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto"
            style={[styles.action, { top: spacing.xl * 2, right: spacing.lg, borderRadius: radii.pill }]}>
            <ThemedText variant="subtitle" style={styles.actionText}>
              ✕
            </ThemedText>
          </Pressable>

          {/* Descargar a la galería */}
          <Pressable
            onPress={descargar}
            hitSlop={12}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel="Descargar foto a la galería"
            style={[
              styles.action,
              styles.download,
              { bottom: spacing.xl * 2, borderRadius: radii.pill, opacity: guardando ? 0.6 : 1 },
            ]}>
            <ThemedText variant="button" style={styles.actionText}>
              {guardando ? 'Guardando…' : '↓ Descargar'}
            </ThemedText>
          </Pressable>

          {/* Resultado de la descarga (o pista de zoom). */}
          {aviso ? (
            <View style={[styles.avisoWrap, { bottom: spacing.xl * 2 + 56 }]} pointerEvents="none">
              <View style={[styles.aviso, { borderRadius: radii.pill }]}>
                <ThemedText variant="caption" style={styles.actionText}>
                  {aviso}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: { width: '100%', height: '78%' },
  photo: { width: '100%', height: '100%' },
  action: {
    position: 'absolute',
    minWidth: 40,
    height: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  download: { alignSelf: 'center' },
  actionText: { color: '#FFFFFF' },
  avisoWrap: { position: 'absolute', alignSelf: 'center' },
  aviso: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
});
