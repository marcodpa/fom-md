import Svg, { Circle, Line, Path } from 'react-native-svg';

type EyeIconProps = {
  /** `true` = ojo tachado (oculto); `false` = ojo abierto (visible). */
  off?: boolean;
  /** Color del trazo (un color resuelto del tema, no un token). */
  color: string;
  size?: number;
};

/**
 * Ícono de ojo (abrir/ocultar contraseña), dibujado con SVG para verse nítido
 * y profesional en cualquier plataforma. Trazo de línea estilo "outline".
 */
export function EyeIcon({ off = false, color, size = 22 }: EyeIconProps) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  if (off) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          {...stroke}
        />
        <Line x1={1} y1={1} x2={23} y2={23} {...stroke} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...stroke} />
      <Circle cx={12} cy={12} r={3} {...stroke} />
    </Svg>
  );
}
