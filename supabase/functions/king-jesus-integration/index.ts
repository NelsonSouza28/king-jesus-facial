import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ erro: 'Sessão obrigatória.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const officialUrl = Deno.env.get('KING_JESUS_API_URL')
  const integrationToken = Deno.env.get('KING_JESUS_INTEGRATION_TOKEN')
  if (!supabaseUrl || !anonKey || !serviceRole || !officialUrl || !integrationToken) {
    return json({ erro: 'Integração não configurada no servidor.' }, 503)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) return json({ erro: 'Sessão inválida.' }, 401)

  let input: { operation?: string; event_id?: string }
  try {
    input = await request.json()
  } catch {
    return json({ erro: 'Corpo JSON inválido.' }, 400)
  }

  const endpoint = input.operation === 'list-users'
    ? '/api/alunos'
    : input.operation === 'send-event'
      ? '/api/reconhecimentos'
      : null
  if (!endpoint) return json({ erro: 'Operação inválida.' }, 400)

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let payload: Record<string, unknown> | undefined

  if (input.operation === 'send-event') {
    if (!input.event_id) return json({ erro: 'event_id é obrigatório.' }, 400)
    const { data: event, error } = await admin
      .from('recognition_events')
      .select('id, external_user_id, confidence, distance, recognized_at, retry_count')
      .eq('id', input.event_id)
      .single()
    if (error || !event) return json({ erro: 'Evento não encontrado.' }, 404)

    await admin.from('recognition_events').update({
      integration_status: 'SENDING',
      last_attempt_at: new Date().toISOString(),
      retry_count: Number(event.retry_count || 0) + 1,
      external_error: null,
    }).eq('id', event.id)

    payload = {
      event_id: event.id,
      external_user_id: event.external_user_id,
      confidence: event.confidence,
      distance: event.distance,
      recognized_at: event.recognized_at,
    }
  }

  try {
    const response = await fetch(`${officialUrl.replace(/\/$/, '')}${endpoint}`, {
      method: input.operation === 'list-users' ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${integrationToken}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    const result = await response.json().catch(() => ({ erro: 'Resposta inválida da API oficial.' }))

    if (input.operation === 'send-event' && input.event_id) {
      await admin.from('recognition_events').update({
        integration_status: response.ok ? 'SENT' : 'FAILED',
        external_http_status: response.status,
        external_error: response.ok ? null : String(result.erro || 'Falha na API oficial.').slice(0, 500),
      }).eq('id', input.event_id)
    }
    return json(result, response.status)
  } catch {
    if (input.operation === 'send-event' && input.event_id) {
      await admin.from('recognition_events').update({
        integration_status: 'FAILED',
        external_http_status: null,
        external_error: 'API oficial indisponível.',
      }).eq('id', input.event_id)
    }
    return json({ erro: 'API oficial indisponível.' }, 502)
  }
})
