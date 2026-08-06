import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/** Estado de una carga asíncrona. */
export type AsyncEstado = 'cargando' | 'ok' | 'error';

export interface AsyncData<T> {
  /** Datos resueltos, o `null` mientras carga / si falló. */
  data: T | null;
  estado: AsyncEstado;
  /** Error capturado (para diagnóstico; la UI muestra un mensaje humano). */
  error: unknown;
  /** Reintenta la carga (para el botón "Reintentar" del ErrorState). */
  recargar: () => void;
}

interface Options {
  /**
   * Si `true`, (re)carga cada vez que la pantalla recupera el foco (útil para
   * datos que deben refrescarse al volver: listas, contadores). Si `false`
   * (por defecto), carga al montar y cuando cambian las `deps`.
   */
  onFocus?: boolean;
}

/**
 * Encapsula, UNA sola vez, el ciclo cargando → ok/error de una llamada a la capa
 * de servicios, con cancelación y reintento. Así ninguna pantalla puede olvidar
 * el manejo de error (que causaba el "loader infinito", A2). NO cambia los
 * contratos de `@/services`: recibe un *fetcher* `() => getX(...)` y lo llama
 * igual; solo orquesta el estado alrededor.
 *
 * Para varias cargas en paralelo, el fetcher devuelve un `Promise.all([...])` y
 * `data` es la tupla combinada:
 *
 *   const { data, estado, recargar } = useAsyncData(
 *     () => Promise.all([getUsuariosDeEmpresa(id), getFlotaVehiculos(id)]),
 *     [id],
 *     { onFocus: true },
 *   );
 *   const [usuarios, flota] = data ?? [[], []];
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  options: Options = {},
): AsyncData<T> {
  const { onFocus = false } = options;

  const [state, setState] = useState<{ data: T | null; estado: AsyncEstado; error: unknown }>({
    data: null,
    estado: 'cargando',
    error: null,
  });
  // Fuerza una recarga sin cambiar `deps` (botón "Reintentar").
  const [nonce, setNonce] = useState(0);

  // El fetcher se guarda en una ref para no re-disparar la carga en cada render
  // (las funciones flecha cambian de identidad), pero llamando SIEMPRE al último.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const recargar = useCallback(() => setNonce((n) => n + 1), []);

  /**
   * Lanza el fetch con guarda de cancelación y devuelve el cleanup. Si la
   * pantalla se desmonta (o cambian las deps) antes de resolver, `active` pasa a
   * `false` y NO se hace `setState` sobre un componente desmontado.
   */
  const ejecutar = useCallback(() => {
    let active = true;
    setState((s) => ({ ...s, estado: 'cargando', error: null }));
    fetcherRef.current().then(
      (data) => {
        if (active) setState({ data, estado: 'ok', error: null });
      },
      (error) => {
        if (active) setState((s) => ({ ...s, estado: 'error', error }));
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // Modo montaje / cambio de deps (cuando NO es onFocus).
  useEffect(() => {
    if (onFocus) return;
    return ejecutar();
    // `ejecutar` es estable; `deps` las controla quien llama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejecutar, onFocus, nonce, ...deps]);

  // Modo foco (siempre se llama al hook; el callback no hace nada si !onFocus).
  useFocusEffect(
    useCallback(() => {
      if (!onFocus) return;
      return ejecutar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ejecutar, onFocus, nonce, ...deps]),
  );

  return { data: state.data, estado: state.estado, error: state.error, recargar };
}
