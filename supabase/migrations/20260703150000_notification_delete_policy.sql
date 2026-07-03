alter table public.notifications enable row level security;

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (recipient_user_id = auth.uid());

revoke all on function public.mark_all_notifications_read(uuid) from public;
grant execute on function public.mark_all_notifications_read(uuid) to authenticated;

grant select, update, delete on public.notifications to authenticated;
