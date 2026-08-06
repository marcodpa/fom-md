import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { cambiarMiClave } from '@/services';
import { useTheme } from '@/theme';

/**
 * CAMBIAR MI CONTRASEÑA (ya logueado, desde el perfil). Pide la clave nueva
 * dos veces para evitar errores de tipeo. La actual no se pide porque la
 * sesión ya está verificada; para recuperarla sin poder entrar está el
 * correo de recuperación desde el login.
 */
export default function CambiarClaveScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

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
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la clave.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Cambiar contraseña" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {listo ? (
              <View style={[styles.center, { gap: spacing.lg }]}>
                <Chip tone="success" label="Contraseña actualizada ✓" />
                <ThemedText variant="body" color="textSecondary" style={styles.centerText}>
                  Tu nueva contraseña ya está activa. Úsala la próxima vez que inicies sesión.
                </ThemedText>
                <Button label="Listo" onPress={() => router.back()} style={styles.fullWidth} />
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
                  label={ocupado ? 'Guardando…' : 'Cambiar contraseña'}
                  onPress={onGuardar}
                  loading={ocupado}
                  disabled={!clave.trim() || !confirmar.trim()}
                />
                <ThemedText variant="caption" color="textMuted">
                  ¿No puedes entrar a la app? Recupera tu contraseña por correo desde la pantalla de
                  inicio de sesión.
                </ThemedText>
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
