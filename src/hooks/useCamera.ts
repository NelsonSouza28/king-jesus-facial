import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'unsupported';

function cameraError(error: unknown): { status: CameraStatus; message: string } {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      status: 'unsupported',
      message: 'Este navegador não oferece acesso compatível à câmera.',
    };
  }
  if (error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)) {
    return {
      status: 'denied',
      message: 'A permissão da câmera foi negada. Libere-a nas configurações do navegador.',
    };
  }
  return {
    status: 'unavailable',
    message: 'Nenhuma câmera disponível ou ela está sendo usada por outro aplicativo.',
  };
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async (mode: 'user' | 'environment') => {
    setError('');
    setStatus('requesting');

    if (!navigator.mediaDevices?.getUserMedia) {
      const problem = cameraError(null);
      setStatus(problem.status);
      setError(problem.message);
      return false;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('active');
      return true;
    } catch (caught) {
      const problem = cameraError(caught);
      setStatus(problem.status);
      setError(problem.message);
      return false;
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    return start(nextMode);
  }, [facingMode, start]);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, facingMode, start, stop, switchCamera };
}
