import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { cambiarMiClave } from '@/services';
import { useTheme } from '@/theme';

type Estado = 'verificando' | 'listo' | 'invalido' | 'guardado';

/**
 * RECUPERAR CONTRASEÑA — la pantalla a la que lleva el enlace del correo de
 * recuperación (deep link `controlflotas://recuperar`). Supabase manda en el
 * enlace los tokens de una sesión temporal; con ellos se abre la sesión y se
 * pone la clave NUEVA. Funciona desde cualquier red/dispositivo (el correo lo
 * envían los servidores de Supabase, no la app).
 */
export default function RecuperarScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const url = Linking.useURL();

  const [estado, setEstado] = useState<Estado>('verificando');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El enlace del correo trae los tokens en el fragmento (#access_token=…):
  // con ellos abrimos la sesión de recuperación para poder fijar la clave.
  useEffect(() => {
    if (!supabase) {
      setEstado('invalido');
      return;
    }
    if (!url) return;
    const fragmento = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
    const p = new URLSearchParams(fragmento);
    const accessToken = p.get('access_token');
    const refreshToken = p.get('refresh_token');
    if (!accessToken || !refreshToken) {
      setEstado('invalido');
      return;
    }
    let activo = true;
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: e }) => {
      if (!activo) return;
      setEstado(e ? 'invalido' : 'listo');
    });
    return () => {
      activo = false;
    };
  }, [url]);

  async function onGuardar() {
    if (ocupado) return;
    setError(null);
    if (clave.trim().length < 8) {
      setError('La clave debe tener al menos 8 caracteres.');
      return;
    }
    if (clave !== confirmar) {
      setError('Las dos claves no coinciden.');
      return;
    }
    setOcupado(true);
    try {
      await cambiarMiClave(clave);
      setEstado('guardado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la clave.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Recuperar contraseña" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {estado === 'verificando' ? (
              <View style={{ gap: spacing.lg }}>
                <Skeleton height={20} width="70%" />
                <Skeleton height={120} radius={16} />
              </View>
            ) : estado === 'invalido' ? (
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="subtitle">Enlace no válido o vencido</ThemedText>
                <ThemedText variant="body" color="textSecondary">
                  Vuelve al inicio de sesión y toca “¿Olvidaste tu clave?” para recibir un correo
                  nuevo. Los enlaces caducan por seguridad.
                </ThemedText>
                <Button label="Ir a iniciar sesión" onPress={() => router.replace('/login')} />
              </Card>
            ) : estado === 'guardado' ? (
              <View style={[styles.center, { gap: spacing.lg }]}>
                <Chip tone="success" label="Contraseña actualizada ✓" />
                <ThemedText variant="body" color="textSecondary" style={styles.centerText}>
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </ThemedText>
                <Button label="Ir a iniciar sesión" onPress={() => router.replace('/login')} style={styles.fullWidth} />
              </View>
            ) : (
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  Nueva contraseña
                </ThemedText>
                <TextField
                  label="Nueva contraseña"
                  value={clave}
                  onChangeText={setClave}
                  placeholder="Mínimo 8 caracteres"
                  autoCapitalize="none"
                  secureTextEntry
                  editable={!ocupado}
                />
                <TextField
                  label="Repite la contraseña"
                  value={confirmar}
                  onChangeText={setConfirmar}
                  placeholder="Escríbela de nuevo"
                  autoCapitalize="none"
                  secureTextEntry
                  editable={!ocupado}
                />
                {error ? (
                  <ThemedText variant="caption" color="danger">
                    {error}
                  </ThemedText>
                ) : null}
                <Button
                  label={ocupado ? 'Guardando…' : 'Guardar contraseña'}
                  onPress={onGuardar}
                  loading={ocupado}
                  disabled={!clave.trim() || !confirmar.trim()}
                />
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 32 },
  center: { alignItems: 'center', paddingTop: 24 },
  centerText: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
});
