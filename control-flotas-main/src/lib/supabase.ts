/**
 * Cliente de Supabase (BD PROVISIONAL para pruebas).
 *
 * Lee la URL y la anon key de variables de entorno EXPO_PUBLIC_* (ver
 * `.env.example`). La sesión de auth persiste en AsyncStorage (nativo).
 *
 * Migración prevista: los servicios de `src/services/*` se irán conectando a
 * este cliente reescribiendo SOLO los cuerpos marcados «TODO API»; cuando
 * exista la BD final, se apunta la URL/key y se retira esta provisional.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** ¿Hay credenciales configuradas? (sin ellas, la app sigue en modo mock). */
export const supabaseConfigurado = Boolean(url && anonKey);

/**
 * ¿Se sirven datos SIMULADOS? Solo cuando NO hay BD configurada. Con Supabase
 * conectado, la app trabaja EXCLUSIVAMENTE con lo que existe en la base: las
 * semillas mock quedan vacías y la telemetría de ejemplo (velocidad, ubicación,
 * índices) no se genera. Para hacer pruebas con datos simulados, se corre sin
 * `.env` (o se activa una BD vacía).
 */
export const MOCK_HABILITADO = !supabaseConfigurado;

/**
 * Cliente único de Supabase. Si no hay credenciales, es `null` y la capa de
 * servicios continúa sirviendo los mocks — así la app nunca se rompe por un
 * .env ausente.
 */
export const supabase = supabaseConfigurado
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // En nativo no hay URL de retorno que detectar.
        detectSessionInUrl: false,
      },
    })
  : null;
