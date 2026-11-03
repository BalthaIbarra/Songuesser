import { useEffect, useState } from 'react';
import type { PlayerControls } from '../hooks/usePlayer';
import { getDevices, isMobileBrowser, type Device } from '../spotify/player';

const TYPE_ICONS: Record<string, string> = {
  Computer: '💻',
  Smartphone: '📱',
  Tablet: '📱',
  Speaker: '🔊',
  TV: '📺',
};

/** Elegir dónde suena la música: esta página o un dispositivo de Spotify Connect. */
export function DevicePicker({ player }: { player: PlayerControls }) {
  // En celular (o si el reproductor web falló) lo mostramos abierto: es la única forma de jugar.
  const needsExternal = isMobileBrowser || (!!player.error && !player.external);
  const [open, setOpen] = useState(needsExternal);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsExternal) setOpen(true);
  }, [needsExternal]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setDevices(await getDevices());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Al abrir el panel, buscamos dispositivos una vez.
  useEffect(() => {
    if (open && devices === null) void refresh();
  }, [open]);

  const current = player.external ? player.external.name : 'Este navegador';

  if (!open) {
    return (
      <button className="btn btn-ghost small" onClick={() => setOpen(true)}>
        🔈 Suena en: <strong>{current}</strong> · cambiar
      </button>
    );
  }

  return (
    <div className="devices">
      <div className="devices-head">
        <strong>¿Dónde suena la música?</strong>
        {!needsExternal && (
          <button className="btn btn-ghost small" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        )}
      </div>

      {needsExternal && (
        <p className="muted small">
          {isMobileBrowser
            ? 'Spotify no permite reproducir dentro del navegador del celular.'
            : 'El reproductor de esta página no está disponible.'}{' '}
          Abrí la app de Spotify en algún dispositivo (este celular, una PC o un parlante), poné
          cualquier canción un segundo y tocá "Buscar". Si usás la app en este mismo celular, no la
          mires: ahí se ve el nombre de la canción 😉
        </p>
      )}

      <div className="pick-list">
        {!isMobileBrowser && !player.error && (
          <button
            className={`pick-item ${!player.external ? 'selected' : ''}`}
            onClick={() => player.selectDevice(null)}
          >
            <span className="pick-thumb">🌐</span>
            <span className="pick-text">
              <strong>Este navegador</strong>
              <span className="muted small">Recomendado</span>
            </span>
          </button>
        )}
        {devices?.map((d) => (
          <button
            key={d.id}
            className={`pick-item ${player.external?.id === d.id ? 'selected' : ''}`}
            onClick={() => player.selectDevice(d)}
          >
            <span className="pick-thumb">{TYPE_ICONS[d.type] ?? '🎵'}</span>
            <span className="pick-text">
              <strong>{d.name}</strong>
              <span className="muted small">{d.type}</span>
            </span>
          </button>
        ))}
        {devices?.length === 0 && (
          <p className="muted small">No encontré dispositivos con Spotify abierto.</p>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading} onClick={refresh}>
        {loading ? 'Buscando…' : '↻ Buscar dispositivos'}
      </button>
    </div>
  );
}
