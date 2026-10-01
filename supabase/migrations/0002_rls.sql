-- 0002_rls.sql — is_member(), grants mínimos e RLS.
-- Nada para anon. Só membros autenticados leem e escrevem.

-- Quem é membro? SECURITY DEFINER para poder consultar members de dentro das policies.
create function public.is_member()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.members where id = auth.uid());
$$;

revoke execute on function public.is_member() from public, anon;
grant  execute on function public.is_member() to authenticated;

-- Grants: parte de zero (o Supabase concede amplamente por padrão) e libera só o necessário.
revoke all on table public.members  from public, anon, authenticated;
revoke all on table public.settings from public, anon, authenticated;
revoke all on table public.bills    from public, anon, authenticated;

grant select on public.members to authenticated;
grant update (name, phone) on public.members to authenticated;   -- sem insert/delete; id e email não mudam

grant select on public.settings to authenticated;
grant update (first_month, first_payer_id) on public.settings to authenticated;   -- sem insert/delete

grant select on public.bills to authenticated;                   -- sem delete

-- INSERT: id entra na lista (o bill_id é gerado no cliente). created_by e created_at ficam de fora:
-- o cliente não os informa; valem os defaults (auth.uid() e now()).
grant insert (
  id, month, payer_id, payer_override, amount, due_date, barcode, attachment_path,
  status, paid_at, paid_by, whatsapp_opened_at
) on public.bills to authenticated;

-- UPDATE: month NÃO entra (o mês de um boleto não muda), nem id, created_by e created_at.
-- Uma policy de RLS não enxerga o valor antigo (OLD), então esta imutabilidade é garantida
-- pelos grants de coluna, que o Postgres aplica antes das policies.
grant update (
  payer_id, payer_override, amount, due_date, barcode, attachment_path,
  status, paid_at, paid_by, whatsapp_opened_at
) on public.bills to authenticated;

-- RLS ligada em todas; forçada em settings e bills. Em members só ENABLE (sem FORCE): a policy
-- de members chama is_member(), que lê members; FORCE dependeria de o dono da função ignorar RLS
-- para não entrar em recursão. Mesmo sem FORCE, anon e quem está fora de members não acessam nada
-- (sem grant para anon; para authenticated a policy exige is_member()).
alter table public.members  enable row level security;
alter table public.settings enable row level security;
alter table public.settings force  row level security;
alter table public.bills    enable row level security;
alter table public.bills    force  row level security;

-- members
create policy members_select on public.members
  for select to authenticated
  using (public.is_member());

create policy members_update on public.members
  for update to authenticated
  using (public.is_member())
  with check (public.is_member());

-- settings
create policy settings_select on public.settings
  for select to authenticated
  using (public.is_member());

create policy settings_update on public.settings
  for update to authenticated
  using (public.is_member())
  with check (public.is_member());

-- bills
create policy bills_select on public.bills
  for select to authenticated
  using (public.is_member());

create policy bills_insert on public.bills
  for insert to authenticated
  with check (public.is_member() and created_by = auth.uid());

create policy bills_update on public.bills
  for update to authenticated
  using (public.is_member())
  with check (public.is_member());
