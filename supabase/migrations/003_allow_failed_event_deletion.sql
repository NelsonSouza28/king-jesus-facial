drop policy if exists "authenticated can delete failed recognition events"
  on public.recognition_events;

create policy "authenticated can delete failed recognition events"
on public.recognition_events
for delete
to authenticated
using (
  auth.uid() is not null
  and integration_status in ('FAILED', 'PENDING')
);

grant delete on public.recognition_events to authenticated;
