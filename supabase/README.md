# Supabase — ETAPA 2

Esta pasta contém a estrutura inicial do banco, as regras de segurança e a
configuração do bucket privado do KING JESUS Facial.

## Aplicar a migration

### Opção 1 — SQL Editor

1. Abra o projeto no painel do Supabase.
2. Acesse **SQL Editor**.
3. Copie todo o conteúdo de `migrations/001_initial_schema.sql`.
4. Execute o script em uma única operação.
5. Confira se as tabelas, a view `face_profiles_safe`, a função
   `match_face_profile` e o bucket `face-images` foram criados.

### Opção 2 — Supabase CLI no Windows 11

No PowerShell, depois de instalar e autenticar a CLI:

```powershell
cd "C:\Users\nelso\OneDrive\Desktop\reconhecimento facial\king-jesus-facial"
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

O `project-ref` não é segredo. Não salve a `service_role` no frontend.

## Segurança implementada

- RLS ativa em `face_profiles`, `recognition_events` e `app_settings`.
- Nenhuma política de acesso para o papel anônimo.
- Operadores autenticados podem consultar a view segura.
- A coluna `embedding` não possui privilégio de leitura para `authenticated`.
- O embedding somente é comparado por `match_face_profile`.
- A RPC valida sessão, dimensão, limite e quantidade de resultados.
- A busca usa distância de cosseno, compatível com a comparação do Human.
- `similarity` é apenas um indicador técnico, não certeza de identidade.

## Dimensão e calibração

O modelo FaceRes do `@vladmandic/human@3.3.6` produz um descritor com 1024
posições. Isso foi confirmado nos descritores de referência distribuídos no
próprio pacote. O valor também está em `src/lib/constants.ts`.

O limite inicial `0.65` precisa ser calibrado com capturas reais. Trocar o
modelo facial exige medir novamente a dimensão e criar uma nova migration.

## Bucket privado

A migration cria ou atualiza o bucket `face-images` com:

- acesso privado;
- limite de 5 MB;
- JPG/JPEG, PNG ou WEBP;
- caminhos no formato
  `{auth_user_id}/{face_profile_id}/{uuid}.ext`;
- leitura e remoção disponíveis somente para operadores autenticados;
- upload e atualização restritos à pasta do operador autenticado.

As telas deverão criar URLs assinadas temporárias. Nunca use URL pública.

O Storage do Supabase deve ser manipulado pela API de Storage. Na substituição
ou exclusão de um perfil, o frontend deverá remover primeiro o objeto antigo e
depois atualizar ou excluir o registro. Excluir linhas diretamente de
`storage.objects` não remove corretamente o arquivo físico.

## Verificações após executar

No SQL Editor, com uma sessão de operador autenticada no aplicativo:

```sql
select * from public.face_profiles_safe limit 10;
select * from public.app_settings;
```

Uma consulta direta a `embedding` usando o papel `authenticated` deve falhar:

```sql
select embedding from public.face_profiles;
```

O bucket deve aparecer como privado na página **Storage**.
