# Integração com o sistema oficial

A função `king-jesus-integration` mantém o token do sistema oficial fora do
navegador.

```powershell
supabase functions deploy king-jesus-integration
supabase secrets set KING_JESUS_API_URL=https://SEU-SITE-OFICIAL.vercel.app
supabase secrets set KING_JESUS_INTEGRATION_TOKEN=O_MESMO_TOKEN_DA_VERCEL
```

No site facial publicado, configure `VITE_USE_EDGE_FUNCTION=true` e
`VITE_USE_DEMO_EXTERNAL_USERS=false`. O token da integração nunca deve ser
criado como variável `VITE_*`.

Na Vercel do sistema oficial, configure:

- `SUPABASE_SERVICE_ROLE_KEY`
- `FACIAL_INTEGRATION_TOKEN` com o mesmo token usado acima
- `FACIAL_APP_ORIGINS` com as URLs permitidas, separadas por vírgula

Antes de ativar o envio, execute `database/integracao-facial.sql` no SQL Editor
do Supabase do sistema oficial.
