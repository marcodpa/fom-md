import Svg, { Circle, Path } from 'react-native-svg';

/** Nombres de los íconos de la barra inferior (FOM-DRIVER y panel de admin). */
export type TabIconName =
  | 'inicio'
  | 'inspeccion'
  | 'alertas'
  | 'resumen'
  | 'flota'
  | 'personal'
  | 'ot'
  | 'mensaje'
  | 'sync'
  | 'salir'
  | 'reporte'
  | 'costos'
  | 'empresa'
  | 'auditoria'
  | 'comparar'
  | 'editar'
  | 'ver';

type TabIconProps = {
  name: TabIconName;
  /** Color del trazo (lo pasa la barra de tabs: activo = marca, inactivo = tenue). */
  color: string;
  size?: number;
};

/**
 * Íconos de la navegación inferior del conductor, dibujados con SVG (estilo
 * "outline") para verse nítidos sin depender de una librería de íconos.
 */
export function TabIcon({ name, color, size = 24 }: TabIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'inicio' ? (
        <>
          <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" {...stroke} />
          <Path d="M9 21v-7h6v7" {...stroke} />
        </>
      ) : null}

      {name === 'inspeccion' ? (
        <>
          <Path
            d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"
            {...stroke}
          />
          <Path d="M9 3h6v4H9z" {...stroke} />
          <Path d="M9.5 13.5 11 15l3.5-3.5" {...stroke} />
        </>
      ) : null}

      {name === 'alertas' ? (
        <>
          <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" {...stroke} />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" {...stroke} />
        </>
      ) : null}

      {/* Resumen: cuadrícula de indicadores. */}
      {name === 'resumen' ? (
        <>
          <Path d="M4 4h6v6H4z" {...stroke} />
          <Path d="M14 4h6v6h-6z" {...stroke} />
          <Path d="M4 14h6v6H4z" {...stroke} />
          <Path d="M14 14h6v6h-6z" {...stroke} />
        </>
      ) : null}

      {/* Flota: camión. */}
      {name === 'flota' ? (
        <>
          <Path d="M3 6h11v9H3z" {...stroke} />
          <Path d="M14 9h4l3 3v3h-7z" {...stroke} />
          <Circle cx={7} cy={17.5} r={1.6} {...stroke} />
          <Circle cx={17} cy={17.5} r={1.6} {...stroke} />
        </>
      ) : null}

      {/* Personal: dos personas. */}
      {name === 'personal' ? (
        <>
          <Circle cx={9} cy={8} r={3} {...stroke} />
          <Path d="M3.5 20a5.5 5.5 0 0 1 11 0" {...stroke} />
          <Path d="M16 5.5a3 3 0 0 1 0 6" {...stroke} />
          <Path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" {...stroke} />
        </>
      ) : null}

      {/* OT: llave inglesa. */}
      {name === 'ot' ? (
        <Path
          d="M15.5 7a3.5 3.5 0 0 1-4.6 4.6L5 17.5 6.5 19l5.9-5.9A3.5 3.5 0 0 1 17 8.5l-2 2-1.5-1.5 2-2A3.5 3.5 0 0 1 15.5 7z"
          {...stroke}
        />
      ) : null}

      {/* Mensaje: burbuja de chat. */}
      {name === 'mensaje' ? (
        <Path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" {...stroke} />
      ) : null}

      {/* Sync: dos flechas circulares. */}
      {name === 'sync' ? (
        <>
          <Path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" {...stroke} />
          <Path d="M20 3v5h-5" {...stroke} />
          <Path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" {...stroke} />
          <Path d="M4 21v-5h5" {...stroke} />
        </>
      ) : null}

      {/* Reporte: documento con barras (mismo trazo outline de la familia). */}
      {name === 'reporte' ? (
        <>
          <Path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" {...stroke} />
          <Path d="M15 3v4h4" {...stroke} />
          <Path d="M9 17v-4" {...stroke} />
          <Path d="M12 17v-6" {...stroke} />
          <Path d="M15 17v-2" {...stroke} />
        </>
      ) : null}

      {/* Costos: moneda con signo. */}
      {name === 'costos' ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...stroke} />
          <Path d="M12 7.5v9" {...stroke} />
          <Path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.9-2.5 2s1.1 1.8 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5" {...stroke} />
        </>
      ) : null}

      {/* Empresa: edificio. */}
      {name === 'empresa' ? (
        <>
          <Path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" {...stroke} />
          <Path d="M15 9h4a1 1 0 0 1 1 1v11" {...stroke} />
          <Path d="M3 21h18" {...stroke} />
          <Path d="M8.5 7h3M8.5 11h3M8.5 15h3" {...stroke} />
        </>
      ) : null}

      {/* Auditoría: escudo con visto. */}
      {name === 'auditoria' ? (
        <>
          <Path d="M12 3 5 5.6V11c0 4.2 3 6.9 7 8.4 4-1.5 7-4.2 7-8.4V5.6z" {...stroke} />
          <Path d="M9 11.8l2 2 4-4.2" {...stroke} />
        </>
      ) : null}

      {/* Comparar: barras lado a lado. */}
      {name === 'comparar' ? (
        <>
          <Path d="M5 20v-8" {...stroke} />
          <Path d="M10 20V6" {...stroke} />
          <Path d="M15 20v-5" {...stroke} />
          <Path d="M20 20V9" {...stroke} />
        </>
      ) : null}

      {/* Salir: puerta con flecha. */}
      {name === 'salir' ? (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...stroke} />
          <Path d="M16 17l5-5-5-5" {...stroke} />
          <Path d="M21 12H9" {...stroke} />
        </>
      ) : null}

      {/* Editar: lápiz. */}
      {name === 'editar' ? (
        <>
          <Path d="M12 20h9" {...stroke} />
          <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" {...stroke} />
        </>
      ) : null}

      {/* Ver: ojo (solo lectura). */}
      {name === 'ver' ? (
        <>
          <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...stroke} />
          <Circle cx="12" cy="12" r="3" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}
