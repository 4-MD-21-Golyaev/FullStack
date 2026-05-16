import { ICON_PATHS, type IconName } from './iconPaths';
import { ICON_BBOXES } from './iconBboxes';

export type { IconName };

export interface IconProps {
  name: IconName;
  size?: number;
  glyphSize?: number;
  /**
   * Цвет иконки. По умолчанию наследуется через `currentColor` —
   * достаточно задать `color` на родительском элементе через CSS-токен.
   * Явный проп нужен только для хардкода вне CSS-контекста.
   */
  color?: string;
  className?: string;
}

const ICON_CONTAINER_SIZE = 20;
const DEFAULT_GLYPH_SIZE = 16;

export function Icon({
  name,
  size = ICON_CONTAINER_SIZE,
  glyphSize = DEFAULT_GLYPH_SIZE,
  color = 'currentColor',
  className,
}: IconProps) {
  const bbox = ICON_BBOXES[name];
  const scale = glyphSize / Math.max(bbox.width, bbox.height);
  const offsetX = (ICON_CONTAINER_SIZE - bbox.width * scale) / 2 - bbox.x * scale;
  const offsetY = (ICON_CONTAINER_SIZE - bbox.height * scale) / 2 - bbox.y * scale;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_CONTAINER_SIZE} ${ICON_CONTAINER_SIZE}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      <g
        transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}
        dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      />
    </svg>
  );
}
