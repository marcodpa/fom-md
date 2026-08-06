import { useCallback, useMemo, useState } from 'react';

/**
 * Selección múltiple para listas con borrado masivo: un modo "seleccionar" que
 * enciende las casillas por fila y el conjunto de ids tildados. Cada pantalla
 * decide qué hacer con `ids` (ej. borrar todos con la misma marca de tiempo).
 */
export function useSeleccion() {
  const [activo, setActivo] = useState(false);
  const [ids, setIds] = useState<Set<string>>(new Set());

  const activar = useCallback(() => setActivo(true), []);
  const cancelar = useCallback(() => {
    setActivo(false);
    setIds(new Set());
  }, []);
  const alternar = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const fijar = useCallback((nuevos: string[]) => setIds(new Set(nuevos)), []);

  return useMemo(
    () => ({
      activo,
      ids,
      cantidad: ids.size,
      esta: (id: string) => ids.has(id),
      activar,
      cancelar,
      alternar,
      /** Reemplaza la selección (para "seleccionar todo" / "ninguno"). */
      fijar,
    }),
    [activo, ids, activar, cancelar, alternar, fijar],
  );
}
