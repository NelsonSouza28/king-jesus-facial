import { useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { FaceOverlay } from './FaceOverlay';

export function CameraCapture({
  analyzing,
  onCapture,
  onClose,
}: {
  analyzing: boolean;
  onCapture: (video: HTMLVideoElement) => void;
  onClose: () => void;
}) {
  const { videoRef, status, error, facingMode, start, stop, switchCamera } = useCamera();

  useEffect(() => {
    void start('user');
  }, [start]);

  const close = () => {
    stop();
    onClose();
  };

  return (
    <section className="camera-card" aria-label="Captura facial">
      <div className="camera-viewport">
        <video
          ref={videoRef}
          muted
          playsInline
          className={facingMode === 'user' ? 'camera-mirrored' : ''}
        />
        <FaceOverlay analyzing={analyzing} />
        {status !== 'active' && (
          <div className="camera-state">
            {status === 'requesting' && <span className="spinner" />}
            <p>
              {status === 'requesting'
                ? 'Solicitando permissão da câmera…'
                : error || 'Câmera desligada'}
            </p>
            {['denied', 'unavailable'].includes(status) && (
              <button className="button button-secondary" type="button" onClick={() => void start(facingMode)}>
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
      <div className="camera-tip">
        <span aria-hidden="true">◎</span>
        <p><b>Olhe diretamente para a câmera</b> Centralize o rosto, retire óculos escuros e procure boa iluminação.</p>
      </div>
      <div className="camera-actions">
        <button className="button button-secondary" type="button" onClick={() => void switchCamera()} disabled={status !== 'active' || analyzing}>
          Trocar câmera
        </button>
        <button className="button button-primary" type="button" onClick={() => videoRef.current && onCapture(videoRef.current)} disabled={status !== 'active' || analyzing}>
          {analyzing ? <><span className="button-spinner" /> Analisando…</> : 'Capturar rosto'}
        </button>
        <button className="button button-ghost" type="button" onClick={close} disabled={analyzing}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
