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

  const baseUrl = import.meta.env.VITE_EXTERNAL_API_URL?.trim();
  const endpoint = import.meta.env.VITE_EXTERNAL_USERS_ENDPOINT?.trim();
  if (!baseUrl || !endpoint) {
    throw new Error('A API externa de alunos não está configurada.');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
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
