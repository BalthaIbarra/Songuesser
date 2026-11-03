import type { CSSProperties } from 'react';

interface Props {
  imageUrl: string | null;
  /** Color predominante de la portada; se suma como resplandor solo al acertar. */
  tint: string | null;
  visible: boolean;
}

/**
 * Portada del álbum de fondo, grande, difuminada y oscurecida.
 * Se muestra solo después de responder, para no dar pistas mientras suena.
 */
export function Backdrop({ imageUrl, tint, visible }: Props) {
  return (
    <div className={`backdrop ${visible && imageUrl ? 'visible' : ''}`} aria-hidden="true">
      {imageUrl && <div className="backdrop-image" style={{ backgroundImage: `url("${imageUrl}")` }} />}
      <div
        className={`backdrop-tint ${tint ? 'on' : ''}`}
        style={tint ? ({ '--tint': tint } as CSSProperties) : undefined}
      />
    </div>
  );
}
