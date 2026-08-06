import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, puedeConducir, useAuth, useSignOut } from '@/auth';
import { ActionTile } from '@/components/action-tile';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAdmin } from '@/session';
import { getCompanyBrandById, getEmpresasDelUsuario } from '@/services';
import { DEFAULT_BRAND, getContrastingTextColor, useTheme, useThemeController } from '@/theme';
import type { Company } from '@/types';

/** Empresa + su color de marca, para pintar la tarjeta del menú. */
type EmpresaItem = { company: Company; color: string };

/** Iniciales para el logo placeholder de la empresa. */
function iniciales(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * MENÚ DE EMPRESAS: el hub al que lleva el botón "Panel". Lista las empresas
 * asociadas al usuario como tarjetas; al tocar una se entra a SU panel, ya
 * pintado con su marca. Así la marca se aplica solo tras elegir empresa, sin el
 * salto visual de antes (brief §6).
 */
export default function EmpresasScreen() {
  const { colors, spacing, radii } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const { setEmpresa } = useAdmin();
  const signOut = useSignOut();
  const router = useRouter();

  const [items, setItems] = useState<EmpresaItem[] | null>(null);

  /** Entra al panel por pestañas de una empresa (fija la empresa activa). */
  function entrarAlPanel(companyId: string) {
    setEmpresa(companyId);
    router.navigate('/panel');
  }

  // El menú usa la identidad GENERAL de la app: la marca de empresa se aplica
  // recién al entrar a un panel concreto.
  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
    }, [setBrand]),
  );

  // Carga las empresas accesibles y su color de marca.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const empresas = await getEmpresasDelUsuario(user.role, user.companyId);
      const conColor = await Promise.all(
        empresas.map(async (company) => {
          const brand = await getCompanyBrandById(company.id);
          return { company, color: brand?.primaryColor ?? DEFAULT_BRAND.primaryColor };
        }),
      );
      if (active) setItems(conColor);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Una sola empresa: entra directo a su panel (sin pasar por el menú).
  useEffect(() => {
    if (items && items.length === 1) {
      setEmpresa(items[0].company.id);
      router.replace('/panel');
    }
  }, [items, setEmpresa, router]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // La gente de una compañía tiene su propia superficie de monitoreo.
  if (!esMultiempresa(user) && user.companyTipo === 'predefinida') {
    return <Redirect href="/compania" />;
  }
  // Los admin FOM ya no usan este hub: tienen su ADMINISTRACIÓN con tabs.
  if (esMultiempresa(user)) return <Redirect href="/admin" />;
  if (!esAdmin(user)) return <Redirect href="/" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <ThemedText variant="subtitle" numberOfLines={1} style={styles.topBarTitle}>
            Empresas
          </ThemedText>
          {/* Si además conduce, cambio de contexto a su vista de conductor. */}
          {puedeConducir(user) ? (
            <PillButton label="Mi conducción" tone="primary" onPress={() => router.navigate('/')} />
          ) : null}
        </View>

        {!items || items.length === 1 ? (
          // Esqueleto de carga (o navegando a la única empresa).
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={[styles.companyCard, { gap: spacing.md }]}>
                <Skeleton width={48} height={48} radius={radii.md} />
                <View style={styles.flex1}>
                  <Skeleton width="50%" height={16} />
                  <View style={{ height: spacing.xs }} />
                  <Skeleton width="30%" height={12} />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
              {/* Acciones rápidas multi-empresa: grilla ícono-primero (se
                  reconocen de un vistazo, sin bloques de solo texto). */}
              {items.length > 1 ? (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="overline" color="textMuted">
                    Acciones
                  </ThemedText>
                  <View style={[styles.tools, { gap: spacing.sm }]}>
                    <ActionTile
                      icon="reporte"
                      label="Reporte"
                      style={styles.toolBtn}
                      onPress={() => router.navigate('/reporte-multi')}
                    />
                    <ActionTile
                      icon="comparar"
                      label="Comparar"
                      style={styles.toolBtn}
                      onPress={() => router.navigate('/comparar')}
                    />
                  </View>
                </View>
              ) : null}

              <ThemedText variant="caption" color="textMuted">
                Elige una empresa para ver su panel.
              </ThemedText>

              {items.map(({ company, color }, i) => (
                <Appear key={company.id} delay={i * 70}>
                  <PressableScale onPress={() => entrarAlPanel(company.id)}>
                    <Card style={[styles.companyCard, { gap: spacing.md }]}>
                      {/* Logo placeholder con el color de marca de la empresa. */}
                      <View style={[styles.avatar, { backgroundColor: color, borderRadius: radii.md }]}>
                        <ThemedText variant="subtitle" style={{ color: getContrastingTextColor(color) }}>
                          {iniciales(company.name)}
                        </ThemedText>
                      </View>
                      <View style={styles.flex1}>
                        <ThemedText variant="subtitle">{company.name}</ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          Ver panel
                        </ThemedText>
                      </View>
                      <ThemedText variant="title" color="textMuted">
                        ›
                      </ThemedText>
                    </Card>
                  </PressableScale>
                </Appear>
              ))}

              {items.length === 0 ? (
                <Card>
                  <ThemedText variant="body" color="textMuted">
                    No tienes empresas asignadas.
                  </ThemedText>
                </Card>
              ) : null}

              {/* Único cierre de sesión de esta superficie (sin botón en el header). */}
              <PressableScale
                onPress={signOut}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                style={{ marginTop: spacing.md }}>
                <Card style={[styles.companyCard, { gap: spacing.md }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.dangerSurface, borderRadius: radii.md }]}>
                    <TabIcon name="salir" color={colors.danger} size={20} />
                  </View>
                  <View style={styles.flex1}>
                    <ThemedText variant="button" color="danger">
                      Cerrar sesión
                    </ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      Salir de tu cuenta
                    </ThemedText>
                  </View>
                </Card>
              </PressableScale>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // El título ocupa el espacio libre y se encoge antes de montarse sobre la acción.
  topBarTitle: { flex: 1, minWidth: 0 },
  scrollContent: { paddingBottom: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  // Grilla de acciones ícono-primero: ~3 por fila, crecen parejas.
  tools: { flexDirection: 'row', flexWrap: 'wrap' },
  toolBtn: { flexGrow: 1, flexBasis: 104 },
  companyCard: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
});
