create or replace function public.delete_failed_recognition_event(event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sessão obrigatória';
  end if;

  delete from public.recognition_events
  where id = event_id
    and integration_status in ('FAILED', 'PENDING');

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.delete_failed_recognition_event(uuid) from public, anon;
grant execute on function public.delete_failed_recognition_event(uuid) to authenticated;
