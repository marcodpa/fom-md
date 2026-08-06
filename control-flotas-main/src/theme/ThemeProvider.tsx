/**
 * ThemeProvider + contexto del tema.
 *
 * Es la única fuente de verdad del tema en tiempo de ejecución. Resuelve el
 * esquema (siguiendo el sistema o forzado a mano), guarda la marca de la
 * empresa activa y expone el tema ya combinado para que lo consuman las
 * pantallas vía `useTheme()`.
 */

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { DEFAULT_BRAND } from './brand';
import { createTheme } from './createTheme';
import type { ColorScheme, CompanyBrand, Theme, ThemeMode } from './types';

/** Valor expuesto por el contexto: el tema + los controles para mutarlo. */
export interface ThemeContextValue {
  /** Tema activo (tokens + marca) que se está pintando. */
  theme: Theme;
  /** Preferencia del usuario: `system` | `light` | `dark`. */
  mode: ThemeMode;
  /** Esquema realmente resuelto a partir de `mode` y del sistema. */
  colorScheme: ColorScheme;
  /** Marca de la empresa activa. */
  brand: CompanyBrand;
  /** Fija la preferencia de modo. */
  setMode: (mode: ThemeMode) => void;
  /** Alterna claro/oscuro de forma manual (deja de seguir al sistema). */
  toggleColorScheme: () => void;
  /** Cambia la empresa activa, re-pintando el acento en toda la app. */
  setBrand: (brand: CompanyBrand) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Marca inicial (por defecto, la identidad general de la app). */
  initialBrand?: CompanyBrand;
  /** Modo inicial (por defecto, seguir al sistema). */
  initialMode?: ThemeMode;
}

export function ThemeProvider({
  children,
  initialBrand = DEFAULT_BRAND,
  initialMode = 'system',
}: ThemeProviderProps) {
  // Esquema del dispositivo ('light' | 'dark' | null en arranque/web).
  const systemScheme = useColorScheme();

  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [brand, setBrandState] = useState<CompanyBrand>(initialBrand);

  // Bail-out por valor: las pantallas llaman setBrand en CADA foco con un
  // objeto nuevo aunque la marca sea la misma; devolver `prev` evita
  // re-renderizar toda la app en plena transición de navegación.
  const setBrand = useCallback((b: CompanyBrand) => {
    setBrandState((prev) =>
      prev.name === b.name && prev.primaryColor === b.primaryColor && prev.logo === b.logo ? prev : b,
    );
  }, []);

  // Resuelve el esquema final: en 'system' usa el del dispositivo (con
  // 'light' como fallback); si no, el forzado por el usuario.
  const colorScheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  // El tema solo se recalcula cuando cambia el esquema o la marca.
  const theme = useMemo(() => createTheme(colorScheme, brand), [colorScheme, brand]);

  const toggleColorScheme = useCallback(() => {
    setMode(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, colorScheme, brand, setMode, toggleColorScheme, setBrand }),
    [theme, mode, colorScheme, brand, toggleColorScheme, setBrand],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
