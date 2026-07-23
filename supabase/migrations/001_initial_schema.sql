begin;

-- KING JESUS Facial
-- Dimensão do embedding: 1024.
-- Confirmada em @vladmandic/human 3.3.6 com o modelo FaceRes e centralizada
-- no frontend em src/lib/constants.ts. Se o modelo mudar, a dimensão precisa
-- ser medida novamente antes de criar uma migration de alteração.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

-- Tabelas -------------------------------------------------------------------

create table if not exists public.face_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  external_user_id text not null,
  external_user_name text not null,
  registration_number text,
  class_name text,
  embedding extensions.vector(1024) not null,
  embedding_dimension integer not null default 1024,
  image_path text,
  consent_given boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint face_profiles_external_user_id_not_blank
    check (btrim(external_user_id) <> ''),
  constraint face_profiles_external_user_name_not_blank
    check (btrim(external_user_name) <> ''),
  constraint face_profiles_embedding_dimension_check
    check (
      embedding_dimension = 1024
      and extensions.vector_dims(embedding) = embedding_dimension
    ),
  constraint face_profiles_consent_check
    check (consent_given = true),
  constraint face_profiles_image_path_check
    check (
      image_path is null
      or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    )
);

create unique index if not exists face_profiles_one_active_per_external_user_idx
  on public.face_profiles (external_user_id)
  where active = true;

create index if not exists face_profiles_external_user_id_idx
  on public.face_profiles (external_user_id);

create index if not exists face_profiles_active_idx
  on public.face_profiles (active);

-- Para um MVP pequeno, a busca exata por cosseno é simples e precisa.
-- Um índice HNSW pode ser adicionado quando o volume real justificar:
-- create index ... using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists public.recognition_events (
  id uuid primary key default extensions.gen_random_uuid(),
  face_profile_id uuid references public.face_profiles(id) on delete set null,
  external_user_id text,
  confidence double precision,
  distance double precision,
  recognized_at timestamptz not null default now(),
  event_key text not null unique,
  integration_status text not null default 'PENDING',
  external_http_status integer,
  external_response jsonb,
  external_error text,
  retry_count integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),

  constraint recognition_events_event_key_not_blank
    check (btrim(event_key) <> ''),
  constraint recognition_events_integration_status_allowed
    check (integration_status in ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  constraint recognition_events_confidence_range
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint recognition_events_distance_nonnegative
    check (distance is null or distance >= 0),
  constraint recognition_events_retry_count_nonnegative
    check (retry_count >= 0),
  constraint recognition_events_http_status_range
    check (
      external_http_status is null
      or (external_http_status >= 100 and external_http_status <= 599)
    )
);

create index if not exists recognition_events_recognized_at_idx
  on public.recognition_events (recognized_at desc);

create index if not exists recognition_events_external_user_id_idx
  on public.recognition_events (external_user_id);

create index if not exists recognition_events_integration_status_idx
  on public.recognition_events (integration_status);

create table if not exists public.app_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  match_threshold double precision not null,
  recognition_interval_ms integer not null,
  recognition_cooldown_seconds integer not null,
  updated_at timestamptz not null default now(),

  constraint app_settings_match_threshold_range
    check (match_threshold > 0 and match_threshold <= 1),
  constraint app_settings_recognition_interval_range
    check (recognition_interval_ms between 250 and 60000),
  constraint app_settings_cooldown_range
    check (recognition_cooldown_seconds between 0 and 86400)
);

-- O valor 0.65 é um ponto inicial conservador de similaridade por cosseno.
-- Não representa certeza e deve ser calibrado com testes reais, diferentes
-- aparelhos, iluminação e população antes de uso em produção.
insert into public.app_settings (
  match_threshold,
  recognition_interval_ms,
  recognition_cooldown_seconds
)
select 0.65, 1000, 30
where not exists (select 1 from public.app_settings);

-- Atualização e autoria -------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_face_profile_created_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    elsif auth.uid() is not null and new.created_by <> auth.uid() then
      raise exception 'created_by inválido'
        using errcode = '42501';
    end if;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'created_by não pode ser alterado'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists face_profiles_set_updated_at on public.face_profiles;
create trigger face_profiles_set_updated_at
before update on public.face_profiles
for each row execute function public.set_updated_at();

drop trigger if exists face_profiles_set_created_by on public.face_profiles;
create trigger face_profiles_set_created_by
before insert or update on public.face_profiles
for each row execute function public.set_face_profile_created_by();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- View segura: nunca expõe o embedding ---------------------------------------

create or replace view public.face_profiles_safe
with (security_invoker = true)
as
select
  id,
  external_user_id,
  external_user_name,
  registration_number,
  class_name,
  image_path,
  consent_given,
  active,
  created_by,
  created_at,
  updated_at
from public.face_profiles;

comment on view public.face_profiles_safe is
  'Listagem segura de perfis faciais. Não contém embedding nem sua dimensão.';

-- RPC de comparação ----------------------------------------------------------

create or replace function public.match_face_profile(
  query_embedding extensions.vector(1024),
  match_threshold double precision,
  match_count integer
)
returns table (
  id uuid,
  external_user_id text,
  external_user_name text,
  registration_number text,
  class_name text,
  image_path text,
  distance double precision,
  similarity double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória'
      using errcode = '42501';
  end if;

  if query_embedding is null
     or extensions.vector_dims(query_embedding) <> 1024 then
    raise exception 'Dimensão de embedding inválida'
      using errcode = '22023';
  end if;

  if match_threshold is null
     or match_threshold <= 0
     or match_threshold > 1 then
    raise exception 'Limite de comparação inválido'
      using errcode = '22023';
  end if;

  if match_count is null or match_count < 1 or match_count > 20 then
    raise exception 'Quantidade de resultados inválida'
      using errcode = '22023';
  end if;

  return query
  select
    fp.id,
    fp.external_user_id,
    fp.external_user_name,
    fp.registration_number,
    fp.class_name,
    fp.image_path,
    (fp.embedding OPERATOR(extensions.<=>) query_embedding)::double precision
      as distance,
    (
      1 - (fp.embedding OPERATOR(extensions.<=>) query_embedding)
    )::double precision as similarity
  from public.face_profiles as fp
  where fp.active = true
    and fp.embedding is not null
    and (
      1 - (fp.embedding OPERATOR(extensions.<=>) query_embedding)
    ) >= match_threshold
  order by fp.embedding OPERATOR(extensions.<=>) query_embedding
  limit match_count;
end;
$$;

comment on function public.match_face_profile(
  extensions.vector,
  double precision,
  integer
) is
  'Compara descritores FaceRes de 1024 posições por distância de cosseno. Similaridade é indicador técnico, não certeza absoluta.';

-- Row Level Security ----------------------------------------------------------

alter table public.face_profiles enable row level security;
alter table public.recognition_events enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "authenticated can read face profiles" on public.face_profiles;
create policy "authenticated can read face profiles"
on public.face_profiles
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "authenticated can insert face profiles" on public.face_profiles;
create policy "authenticated can insert face profiles"
on public.face_profiles
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and consent_given = true
);

drop policy if exists "authenticated can update face profiles" on public.face_profiles;
create policy "authenticated can update face profiles"
on public.face_profiles
for update
to authenticated
using (auth.uid() is not null)
with check (
  auth.uid() is not null
  and consent_given = true
);

drop policy if exists "authenticated can delete face profiles" on public.face_profiles;
create policy "authenticated can delete face profiles"
on public.face_profiles
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists "authenticated can read recognition events" on public.recognition_events;
create policy "authenticated can read recognition events"
on public.recognition_events
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "authenticated can insert recognition events" on public.recognition_events;
create policy "authenticated can insert recognition events"
on public.recognition_events
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "authenticated can update recognition events" on public.recognition_events;
create policy "authenticated can update recognition events"
on public.recognition_events
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "authenticated can read app settings" on public.app_settings;
create policy "authenticated can read app settings"
on public.app_settings
for select
to authenticated
using (auth.uid() is not null);

-- Privilégios por coluna: embedding pode ser gravado, mas não consultado
-- diretamente pelo frontend. Comparações passam exclusivamente pela RPC.

revoke all on public.face_profiles from anon, authenticated;
revoke all on public.recognition_events from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.face_profiles_safe from anon, authenticated;

grant select (
  id,
  external_user_id,
  external_user_name,
  registration_number,
  class_name,
  image_path,
  consent_given,
  active,
  created_by,
  created_at,
  updated_at
) on public.face_profiles to authenticated;

grant insert (
  id,
  external_user_id,
  external_user_name,
  registration_number,
  class_name,
  embedding,
  embedding_dimension,
  image_path,
  consent_given,
  active,
  created_by
) on public.face_profiles to authenticated;

grant update (
  external_user_id,
  external_user_name,
  registration_number,
  class_name,
  embedding,
  embedding_dimension,
  image_path,
  consent_given,
  active,
  updated_at
) on public.face_profiles to authenticated;

grant delete on public.face_profiles to authenticated;
grant select, insert, update on public.recognition_events to authenticated;
grant select on public.app_settings to authenticated;
grant select on public.face_profiles_safe to authenticated;

revoke all on function public.match_face_profile(
  extensions.vector,
  double precision,
  integer
) from public, anon;
grant execute on function public.match_face_profile(
  extensions.vector,
  double precision,
  integer
) to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_face_profile_created_by() from public, anon, authenticated;

-- Storage --------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'face-images',
  'face-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated can read own face images" on storage.objects;
drop policy if exists "authenticated can read face images" on storage.objects;
create policy "authenticated can read face images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'face-images'
  and auth.uid() is not null
);

drop policy if exists "authenticated can upload own face images" on storage.objects;
create policy "authenticated can upload own face images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'face-images'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) = 2
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and name ~ (
    '^' || auth.uid()::text
    || '/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  )
);

drop policy if exists "authenticated can update own face images" on storage.objects;
create policy "authenticated can update own face images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'face-images'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'face-images'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) = 2
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

drop policy if exists "authenticated can delete own face images" on storage.objects;
drop policy if exists "authenticated can delete face images" on storage.objects;
create policy "authenticated can delete face images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'face-images'
  and auth.uid() is not null
);

commit;
