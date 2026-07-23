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
  const event = data as RecognitionEvent;
  if (import.meta.env.VITE_USE_DEMO_EXTERNAL_USERS !== 'true') {
    return sendRecognitionEvent(event.id);
  }
  return event;
}

export async function sendRecognitionEvent(eventId: string): Promise<RecognitionEvent> {
  if (!supabase) throw new Error('Supabase não configurado.');
  let sendFailed = false;
  if (import.meta.env.VITE_USE_EDGE_FUNCTION === 'true') {
    const { error } = await supabase.functions.invoke('king-jesus-integration', {
      body: { operation: 'send-event', event_id: eventId },
    });
    sendFailed = Boolean(error);
  } else {
    const baseUrl = import.meta.env.VITE_EXTERNAL_API_URL?.trim();
    const endpoint = import.meta.env.VITE_EXTERNAL_RECOGNITION_ENDPOINT?.trim();
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: event } = await supabase
      .from('recognition_events')
      .select(`
        id,
        external_user_id,
        confidence,
        distance,
        recognized_at,
        retry_count,
        face_profile:face_profiles!recognition_events_face_profile_id_fkey(class_name)
      `)
      .eq('id', eventId)
      .single();
    if (!baseUrl || !endpoint || !sessionData.session || !event) {
      throw new Error('Integração direta não configurada.');
    }
    await supabase.from('recognition_events').update({
      integration_status: 'SENDING',
      last_attempt_at: new Date().toISOString(),
      retry_count: Number(event.retry_count || 0) + 1,
      external_error: null,
    }).eq('id', eventId);
    try {
      const linkedProfile = event.face_profile as unknown as
        | { class_name: string | null }
        | { class_name: string | null }[]
        | null;
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id,
          external_user_id: event.external_user_id,
          confidence: event.confidence,
          distance: event.distance,
          recognized_at: event.recognized_at,
          class_name: Array.isArray(linkedProfile)
            ? linkedProfile[0]?.class_name
            : linkedProfile?.class_name,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      await supabase.from('recognition_events').update({
        integration_status: response.ok ? 'SENT' : 'FAILED',
        external_http_status: response.status,
        external_error: response.ok ? null : String(payload.erro || 'Falha na API oficial.').slice(0, 500),
      }).eq('id', eventId);
      sendFailed = !response.ok;
    } catch {
      await supabase.from('recognition_events').update({
        integration_status: 'FAILED',
        external_http_status: null,
        external_error: 'API oficial indisponível.',
      }).eq('id', eventId);
      sendFailed = true;
    }
  }
  const { data, error } = await supabase
    .from('recognition_events')
    .select('id, face_profile_id, external_user_id, confidence, distance, recognized_at, event_key, integration_status, external_http_status, external_error, retry_count, last_attempt_at, created_at')
    .eq('id', eventId)
    .single();
  if (error) throw new Error('O evento foi salvo, mas o status da integração não pôde ser consultado.');
  if (sendFailed && data.integration_status !== 'FAILED') {
    throw new Error('O evento foi salvo, mas não pôde ser enviado ao sistema oficial.');
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

export async function deleteFailedRecognitionEvent(eventId: string) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('recognition_events')
    .delete()
    .eq('id', eventId)
    .in('integration_status', ['FAILED', 'PENDING']);
  if (error) throw new Error('Não foi possível excluir o evento.');
}
