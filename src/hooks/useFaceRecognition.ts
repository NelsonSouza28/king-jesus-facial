import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { loadHumanModels } from '../lib/human';
import {
  analyzeRecognitionFrame,
  getRecognitionSettings,
} from '../services/faceRecognition';
import { createRecognitionEvent } from '../services/recognitionEvents';
import type {
  FaceMatch,
  RecognitionEvent,
  RecognitionSettings,
} from '../types/facial';
import { useCooldown } from './useCooldown';

export type RecognitionVisualState =
  | 'IDLE'
  | 'LOADING_MODELS'
  | 'SEARCHING'
  | 'MULTIPLE_FACES'
  | 'FACE_TOO_SMALL'
  | 'UNKNOWN'
  | 'IDENTIFIED'
  | 'COOLDOWN'
  | 'ERROR';

export function useFaceRecognition(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [visualState, setVisualState] = useState<RecognitionVisualState>('IDLE');
  const [statusMessage, setStatusMessage] = useState('Câmera desligada');
  const [settings, setSettings] = useState<RecognitionSettings | null>(null);
  const [lastMatch, setLastMatch] = useState<FaceMatch | null>(null);
  const [lastEvent, setLastEvent] = useState<RecognitionEvent | null>(null);
  const busyRef = useRef(false);
  const holdResultUntilRef = useRef(0);
  const { activate, remainingSeconds } = useCooldown();

  const prepare = useCallback(async () => {
    setVisualState('LOADING_MODELS');
    setStatusMessage('Carregando configurações…');
    const [nextSettings] = await Promise.all([
      getRecognitionSettings(),
      loadHumanModels(setStatusMessage),
    ]);
    setSettings(nextSettings);
    setVisualState('SEARCHING');
    setStatusMessage('Modelos prontos. Procurando rosto…');
    return nextSettings;
  }, []);

  const reset = useCallback(() => {
    setVisualState('IDLE');
    setStatusMessage('Câmera desligada');
    setLastMatch(null);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (!enabled || !settings) return;

    let active = true;
    const analyze = async () => {
      if (
        !active
        || busyRef.current
        || !videoRef.current
        || Date.now() < holdResultUntilRef.current
      ) return;

      busyRef.current = true;
      try {
        const analysis = await analyzeRecognitionFrame(
          videoRef.current,
          settings.matchThreshold,
        );
        if (!active) return;

        if (analysis.kind === 'MATCH') {
          const remaining = remainingSeconds(analysis.match.external_user_id);
          setLastMatch(analysis.match);
          if (remaining > 0) {
            setVisualState('COOLDOWN');
            setStatusMessage(`Reconhecimento recente. Aguarde ${remaining}s.`);
            holdResultUntilRef.current = Date.now() + 1_000;
            return;
          }

          setStatusMessage('Pessoa identificada. Registrando evento…');
          const event = await createRecognitionEvent(analysis.match);
          if (!active) return;
          activate(analysis.match.external_user_id, settings.cooldownSeconds);
          setLastEvent(event);
          setVisualState('IDENTIFIED');
          setStatusMessage(
            event.integration_status === 'SENT'
              ? 'Presença registrada no KING JESUS.'
              : 'Evento salvo. O envio ao KING JESUS precisa ser revisado.',
          );
          holdResultUntilRef.current = Date.now() + 3_000;
          return;
        }

        setLastMatch(null);
        setLastEvent(null);
        if (analysis.kind === 'MULTIPLE_FACES') {
          setVisualState('MULTIPLE_FACES');
          setStatusMessage('Mais de um rosto detectado.');
        } else if (analysis.kind === 'FACE_TOO_SMALL') {
          setVisualState('FACE_TOO_SMALL');
          setStatusMessage('Aproxime o rosto da câmera.');
        } else if (analysis.kind === 'UNKNOWN') {
          setVisualState('UNKNOWN');
          setStatusMessage('Rosto não reconhecido.');
        } else if (analysis.kind === 'INVALID_EMBEDDING') {
          setVisualState('ERROR');
          setStatusMessage('Não foi possível gerar o descritor facial.');
        } else {
          setVisualState('SEARCHING');
          setStatusMessage('Procurando rosto…');
        }
      } catch (error) {
        if (!active) return;
        setVisualState('ERROR');
        setStatusMessage(
          error instanceof Error ? error.message : 'Falha ao analisar o rosto.',
        );
        holdResultUntilRef.current = Date.now() + 2_000;
      } finally {
        busyRef.current = false;
      }
    };

    void analyze();
    const interval = window.setInterval(() => void analyze(), settings.intervalMs);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activate, enabled, remainingSeconds, settings, videoRef]);

  return {
    visualState,
    statusMessage,
    settings,
    lastMatch,
    lastEvent,
    prepare,
    reset,
  };
}
