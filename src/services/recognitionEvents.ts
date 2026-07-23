import { supabase } from '../lib/supabase';
import type {
  FaceMatch,
  RecognitionEvent,
  RecognitionEventListItem,
} from '../types/facial';
import { createRecognitionEventKey } from '../utils/eventKey';

export async function createRecognitionEvent(match: FaceMatch) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const recognizedAt = new Date();
  const { data, error } = await supabase
    .from('recognition_events')
    .insert({
      face_profile_id: match.id,
      external_user_id: match.external_user_id,
      confidence: Math.max(0, Math.min(1, match.similarity)),
      distance: Math.max(0, match.distance),
      recognized_at: recognizedAt.toISOString(),
      event_key: createRecognitionEventKey(match.id, recognizedAt),
      integration_status: 'PENDING',
    })
    .select('id, face_profile_id, external_user_id, confidence, distance, recognized_at, event_key, integration_status, external_http_status, external_error, retry_count, last_attempt_at, created_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Este evento já foi registrado.');
    throw new Error('Não foi possível registrar o reconhecimento.');
  }
  return data as RecognitionEvent;
}

export async function listRecognitionEvents(): Promise<RecognitionEventListItem[]> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase
    .from('recognition_events')
    .select(`
      id,
      face_profile_id,
      external_user_id,
      confidence,
      distance,
      recognized_at,
      event_key,
      integration_status,
      external_http_status,
      external_error,
      retry_count,
      last_attempt_at,
      created_at,
      face_profile:face_profiles!recognition_events_face_profile_id_fkey(
        external_user_name,
        registration_number,
        class_name
      )
    `)
    .order('recognized_at', { ascending: false })
    .limit(200);

  if (error) throw new Error('Não foi possível carregar os eventos.');
  return (data ?? []) as unknown as RecognitionEventListItem[];
}
