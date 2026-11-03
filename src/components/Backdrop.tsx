interface Props {
  imageUrl: string | null;
  visible: boolean;
}

/**
 * Portada del álbum de fondo, grande, difuminada y oscurecida.
 * Se muestra solo después de responder, para no dar pistas mientras suena.
 */
export function Backdrop({ imageUrl, visible }: Props) {
  return (
    <div className={`backdrop ${visible && imageUrl ? 'visible' : ''}`} aria-hidden="true">
      {imageUrl && <div className="backdrop-image" style={{ backgroundImage: `url("${imageUrl}")` }} />}
    </div>
  );
}
