-- 0003_storage.sql — bucket privado "boletos" (PDF, máx. 5 MB) e policies.
-- Arquivos ficam em <bill_id>/<nome>.pdf e só são acessados por URL assinada.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('boletos', 'boletos', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = 5242880,
      allowed_mime_types = array['application/pdf'];

-- RLS já vem ligada em storage.objects. Sem policy para anon.
create policy boletos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'boletos' and public.is_member());

create policy boletos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'boletos' and public.is_member());

create policy boletos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'boletos' and public.is_member())
  with check (bucket_id = 'boletos' and public.is_member());

create policy boletos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'boletos' and public.is_member());
