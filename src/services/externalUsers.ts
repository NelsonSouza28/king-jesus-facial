import { demoExternalUsers } from '../mocks/externalUsers';
import type { ExternalUser, ExternalUserApiRecord } from '../types/external';

const REQUEST_TIMEOUT_MS = 10_000;

function normalizeUser(record: ExternalUserApiRecord): ExternalUser {
  return {
    id: String(record.id),
    name: String(record.nome ?? record.name ?? '').trim(),
    registrationNumber:
      record.matricula == null && record.registrationNumber == null
        ? null
        : String(record.matricula ?? record.registrationNumber),
    className: record.turma ?? record.className ?? null,
    active: record.ativo ?? record.active ?? true,
  };
}

export async function getExternalUsers(): Promise<ExternalUser[]> {
  if (import.meta.env.VITE_USE_DEMO_EXTERNAL_USERS === 'true') {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return demoExternalUsers;
  }

  if (import.meta.env.VITE_USE_EDGE_FUNCTION === 'true') {
    const { supabase } = await import('../lib/supabase');
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('king-jesus-integration', {
      body: { operation: 'list-users' },
    });
    if (error) throw new Error('Não foi possível consultar os alunos no sistema oficial.');
    if (!Array.isArray(data)) throw new Error('A API de alunos retornou um formato inválido.');
    return (data as ExternalUserApiRecord[])
      .map(normalizeUser)
      .filter((user) => user.id && user.name && user.active);
  }

  const baseUrl = import.meta.env.VITE_EXTERNAL_API_URL?.trim();
  const endpoint = import.meta.env.VITE_EXTERNAL_USERS_ENDPOINT?.trim();
  if (!baseUrl || !endpoint) {
    throw new Error('A API externa de alunos não está configurada.');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { supabase } = await import('../lib/supabase');
    const { data: sessionData } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    if (!sessionData.session) throw new Error('Sessão do operador não encontrada.');

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Não foi possível consultar os alunos.');
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error('A API de alunos retornou um formato inválido.');
    }

    return (payload as ExternalUserApiRecord[])
      .map(normalizeUser)
      .filter((user) => user.id && user.name && user.active);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A consulta de alunos demorou mais que o esperado.');
    }
    if (error instanceof Error) throw error;
    throw new Error('A API de alunos está indisponível.');
  } finally {
    window.clearTimeout(timeout);
  }
}
