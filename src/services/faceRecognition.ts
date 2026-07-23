import {
  DEFAULT_MATCH_THRESHOLD,
  DEFAULT_RECOGNITION_COOLDOWN_SECONDS,
  DEFAULT_RECOGNITION_INTERVAL_MS,
} from '../lib/constants';
import { detectFaces, validateEmbedding } from '../lib/human';
import { supabase } from '../lib/supabase';
import type {
  FaceMatch,
  RecognitionAnalysis,
  RecognitionSettings,
} from '../types/facial';

export async function getRecognitionSettings(): Promise<RecognitionSettings> {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('app_settings')
    .select('match_threshold, recognition_interval_ms, recognition_cooldown_seconds')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('Não foi possível carregar as configurações do reconhecimento.');

  const envThreshold = Number(import.meta.env.VITE_FACE_MATCH_THRESHOLD);
  const envInterval = Number(import.meta.env.VITE_RECOGNITION_INTERVAL_MS);
  const envCooldown = Number(import.meta.env.VITE_RECOGNITION_COOLDOWN_SECONDS);

  return {
    matchThreshold:
      data?.match_threshold
      ?? (Number.isFinite(envThreshold) && envThreshold > 0
        ? envThreshold
        : DEFAULT_MATCH_THRESHOLD),
    intervalMs:
      data?.recognition_interval_ms
      ?? (Number.isFinite(envInterval) && envInterval >= 250
        ? envInterval
        : DEFAULT_RECOGNITION_INTERVAL_MS),
    cooldownSeconds:
      data?.recognition_cooldown_seconds
      ?? (Number.isFinite(envCooldown) && envCooldown >= 0
        ? envCooldown
        : DEFAULT_RECOGNITION_COOLDOWN_SECONDS),
  };
}

export async function analyzeRecognitionFrame(
  video: HTMLVideoElement,
  threshold: number,
): Promise<RecognitionAnalysis> {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return { kind: 'NO_FACE' };
  }

  const analysisCanvas = document.createElement('canvas');
  const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
  analysisCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  analysisCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  analysisCanvas.getContext('2d')?.drawImage(
    video,
    0,
    0,
    analysisCanvas.width,
    analysisCanvas.height,
  );
  const result = await detectFaces(analysisCanvas);
  if (result.face.length === 0) return { kind: 'NO_FACE' };
  if (result.face.length > 1) return { kind: 'MULTIPLE_FACES' };

  const face = result.face[0];
  const videoArea = analysisCanvas.width * analysisCanvas.height;
  const faceArea = face.box[2] * face.box[3];
  if (!videoArea || faceArea / videoArea < 0.06) {
    return { kind: 'FACE_TOO_SMALL' };
  }

  const embedding = validateEmbedding(face);
  if (!embedding) return { kind: 'INVALID_EMBEDDING' };

  const { data, error } = await supabase.rpc('match_face_profile', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: 1,
  });
  if (error) throw new Error('Não foi possível comparar o rosto.');

  const match = (data?.[0] ?? null) as FaceMatch | null;
  return match ? { kind: 'MATCH', match } : { kind: 'UNKNOWN' };
}
