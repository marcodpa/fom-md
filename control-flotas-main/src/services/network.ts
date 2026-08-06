import { MOCK_HABILITADO } from '@/lib/supabase';

/** Simula latencia de red para que los mocks se comporten como una API real. */
export function fakeNetwork<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Semilla de datos SIMULADOS: devuelve el arreglo de ejemplo solo si el mock
 * está habilitado (sin BD); con Supabase conectado devuelve `[]`, así la app no
 * inventa empresas, usuarios, vehículos ni sus métricas. Para reactivar la
 * simulación en pruebas, se corre sin `.env`.
 */
export function seed<T>(datos: T[]): T[] {
  return MOCK_HABILITADO ? datos : [];
}
