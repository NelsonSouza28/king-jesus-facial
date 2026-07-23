import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaceOverlay } from '../components/FaceOverlay';
import { StatusBadge } from '../components/StatusBadge';
import { useCamera } from '../hooks/useCamera';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const stateTone = {
  IDLE: 'neutral',
  LOADING_MODELS: 'loading',
  SEARCHING: 'searching',
  MULTIPLE_FACES: 'warning',
  FACE_TOO_SMALL: 'warning',
  UNKNOWN: 'error',
  IDENTIFIED: 'success',
  COOLDOWN: 'warning',
  ERROR: 'error',
} as const;

export function RecognitionPage() {
  const online = useOnlineStatus();
  const camera = useCamera();
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const recognition = useFaceRecognition(
    camera.videoRef,
    running && camera.status === 'active' && online,
  );

  const startRecognition = async () => {
    setStarting(true);
    try {
      await recognition.prepare();
      const started = await camera.start('user');
      setRunning(started);
    } catch {
      recognition.reset();
    } finally {
      setStarting(false);
    }
  };

  const stopRecognition = () => {
    setRunning(false);
    camera.stop();
    recognition.reset();
  };

  const shownState =
    camera.status === 'requesting'
      ? 'Solicitando permissão da câmera…'
      : camera.error || recognition.statusMessage;

  return (
    <>
      <section className="page-heading recognition-heading">
        <div>
          <p className="eyebrow">IDENTIFICAÇÃO</p>
          <h1>Reconhecimento</h1>
          <p>Posicione uma pessoa por vez em frente à câmera para registrar a identificação.</p>
        </div>
        <span className={`connection-pill ${online ? 'connection-online' : 'connection-offline'}`}>
          <i /> {online ? 'Conectado' : 'Sem conexão'}
        </span>
      </section>

      {!online && (
        <div className="offline-notice" role="alert">
          É necessário estar conectado para consultar e registrar reconhecimentos.
        </div>
      )}

      <div className="recognition-layout">
        <section className="recognition-camera-card">
          <div className="recognition-camera">
            <video
              ref={camera.videoRef}
              muted
              playsInline
              className={camera.facingMode === 'user' ? 'camera-mirrored' : ''}
            />
            <FaceOverlay analyzing={running && recognition.visualState === 'SEARCHING'} />
            {!running && (
              <div className="recognition-camera-empty">
                <span aria-hidden="true">◎</span>
                <h2>Câmera desligada</h2>
                <p>Inicie quando estiver pronto para reconhecer.</p>
              </div>
            )}
            {running && recognition.lastMatch && (
              <div className={`recognition-result-overlay tone-${stateTone[recognition.visualState]}`}>
                <span className="recognition-avatar">
                  {recognition.lastMatch.external_user_name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <div>
                  <small>{recognition.visualState === 'IDENTIFIED' ? 'PESSOA IDENTIFICADA' : 'ROSTO LOCALIZADO'}</small>
                  <b>{recognition.lastMatch.external_user_name}</b>
                  <p>{recognition.lastMatch.class_name || 'Turma não informada'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="recognition-controls">
            {!running ? (
              <button
                className="button button-primary"
                type="button"
                onClick={() => void startRecognition()}
                disabled={starting || !online}
              >
                {starting ? <><span className="button-spinner" /> Preparando…</> : 'Iniciar câmera'}
              </button>
            ) : (
              <>
                <button className="button button-secondary" type="button" onClick={() => void camera.switchCamera()}>
                  Trocar câmera
                </button>
                <button className="button button-danger" type="button" onClick={stopRecognition}>
                  Parar câmera
                </button>
              </>
            )}
          </div>
        </section>

        <aside className="recognition-status-panel">
          <div className={`recognition-state tone-${stateTone[recognition.visualState]}`} aria-live="polite">
            <span className="recognition-state-icon" aria-hidden="true">
              {recognition.visualState === 'IDENTIFIED' ? '✓' : recognition.visualState === 'ERROR' || recognition.visualState === 'UNKNOWN' ? '!' : '◎'}
            </span>
            <p className="eyebrow">STATUS ATUAL</p>
            <h2>{shownState}</h2>
            {recognition.visualState === 'SEARCHING' && <span className="recognition-pulse" />}
          </div>

          {recognition.lastMatch && (
            <article className="match-details">
              <div><span>Aluno</span><b>{recognition.lastMatch.external_user_name}</b></div>
              <div><span>ID externo</span><b>{recognition.lastMatch.external_user_id}</b></div>
              <div><span>Confiança da identificação</span><b>{Math.round(recognition.lastMatch.similarity * 100)}%</b></div>
              <div><span>Turma</span><b>{recognition.lastMatch.class_name || 'Não informada'}</b></div>
              {recognition.lastEvent && (
                <div><span>Integração</span><StatusBadge status={recognition.lastEvent.integration_status} /></div>
              )}
              <small>Confira o nome e a turma antes de prosseguir.</small>
            </article>
          )}

          <Link className="button button-secondary" to="/cadastro">Abrir cadastro facial</Link>
        </aside>
      </div>
    </>
  );
}
