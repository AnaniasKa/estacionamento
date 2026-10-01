-- verify.sql — conferência de acesso. Rode no SQL Editor (como postgres), bloco por bloco.
-- Não altera nada: os testes de escrita rodam dentro de blocos que terminam sem gravar.
--
-- ORDEM DE TESTE:
--   1) Rode as migrations 0001, 0002 e 0003, nessa ordem.
--   2) Crie os dois usuários em Authentication > Users e insira members e settings
--      (SQL de cadastro no README).
--   3) Lance um boleto de teste (pelo app, ou por INSERT como postgres).
--   4) Só então rode os blocos (A) e (B). Com tabelas vazias, "0 linhas" não prova nada:
--      o bloco (0) mostra quantas linhas existem de verdade e precisam ser > 0.
-- Os blocos (C) e (D) verificam privilégios e policies diretamente e valem mesmo sem dados.

-- (0) Linhas reais, vistas por você (postgres). Precisam ser > 0 para (A) e (B) valerem.
select 'members'  as tabela, count(*) as linhas from public.members
union all select 'settings', count(*) from public.settings
union all select 'bills',    count(*) from public.bills
union all select 'storage.objects (boletos)', count(*) from storage.objects where bucket_id = 'boletos';


-- (A) Como ANON: nenhuma tabela legível nem gravável.
-- Sucesso = "Success. No rows returned". Falha = erro "FALHA (anon): ..." listando o problema.
do $$
declare
  t     text;
  n     bigint;
  fails text := '';
begin
  set local role anon;

  foreach t in array array['public.members', 'public.settings', 'public.bills', 'storage.objects'] loop
    begin
      execute format('select count(*) from %s', t) into n;
      if n > 0 then fails := fails || format(' %s: %s linhas visíveis;', t, n); end if;
    exception when insufficient_privilege then
      null;  -- esperado: permission denied
    end;
  end loop;

  begin
    execute $q$insert into public.bills (month, payer_id, amount, due_date)
                values ('2000-01-01', gen_random_uuid(), 1, '2000-01-10')$q$;
    fails := fails || ' bills: INSERT foi permitido;';
  exception
    when insufficient_privilege then null;
    when others then fails := fails || format(' bills: INSERT falhou por outro motivo (%s);', sqlerrm);
  end;

  reset role;
  if fails <> '' then raise exception 'FALHA (anon):%', fails; end if;
end $$;


-- (B) Como usuário AUTENTICADO que NÃO está em members (uuid aleatório).
-- Mesmo critério de sucesso/falha do bloco (A).
do $$
declare
  t     text;
  n     bigint;
  rc    bigint;
  fails text := '';
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  foreach t in array array['public.members', 'public.settings', 'public.bills', 'storage.objects'] loop
    begin
      execute format('select count(*) from %s', t) into n;
      if n > 0 then fails := fails || format(' %s: %s linhas visíveis;', t, n); end if;
    exception when insufficient_privilege then
      null;
    end;
  end loop;

  begin
    execute $q$insert into public.bills (month, payer_id, amount, due_date)
                values ('2000-01-01', gen_random_uuid(), 1, '2000-01-10')$q$;
    fails := fails || ' bills: INSERT foi permitido;';
  exception
    when insufficient_privilege then null;   -- violação de RLS (42501)
    when others then fails := fails || format(' bills: INSERT falhou por outro motivo (%s);', sqlerrm);
  end;

  begin
    update public.bills set amount = amount;
    get diagnostics rc = row_count;
    if rc > 0 then fails := fails || format(' bills: UPDATE alterou %s linhas;', rc); end if;
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.bills;
    get diagnostics rc = row_count;
    if rc > 0 then fails := fails || format(' bills: DELETE apagou %s linhas;', rc); end if;
  exception when insufficient_privilege then null;
  end;

  reset role;
  if fails <> '' then raise exception 'FALHA (autenticado fora de members):%', fails; end if;
end $$;


-- (C) Privilégios por role (não depende de haver dados). Esperado:
--   anon: tudo false, em todas as linhas.
--   rls_ligada = true nas três; rls_forcada = false em members e true em settings e bills.
--   authenticated: members select+update(colunas); settings select+update(colunas);
--                  bills select+insert+update(colunas); nenhum delete/insert onde não cabe.
select
  c.relname as tabela,
  has_table_privilege('anon',          c.oid, 'select') as anon_select,
  has_table_privilege('anon',          c.oid, 'insert') as anon_insert,
  has_table_privilege('anon',          c.oid, 'update') as anon_update,
  has_table_privilege('anon',          c.oid, 'delete') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'select') as auth_select,
  has_table_privilege('authenticated', c.oid, 'insert') as auth_insert,
  has_table_privilege('authenticated', c.oid, 'update') as auth_update,
  has_table_privilege('authenticated', c.oid, 'delete') as auth_delete,
  c.relrowsecurity      as rls_ligada,
  c.relforcerowsecurity as rls_forcada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('members', 'settings', 'bills')
order by c.relname;

-- Colunas com UPDATE para authenticated (esperado: members=name,phone; settings=first_month,first_payer_id;
-- bills=amount, attachment_path, barcode, due_date, paid_at, paid_by, payer_id, payer_override,
-- status, whatsapp_opened_at; ou seja, SEM id, month, created_by e created_at).
select table_name, string_agg(column_name, ', ' order by column_name) as colunas_update
from information_schema.column_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
group by table_name
order by table_name;

-- Imutabilidade em bills. Esperado:
--   month, created_by, created_at, id: update = false para authenticated.
--   id: insert = true (bill_id gerado no cliente); created_by e created_at: insert = false.
select
  col as coluna,
  has_column_privilege('authenticated', 'public.bills', col, 'update') as auth_update,
  has_column_privilege('authenticated', 'public.bills', col, 'insert') as auth_insert
from unnest(array['id', 'month', 'created_by', 'created_at', 'payer_id', 'payer_override']) as col;

-- is_member(): anon sem execute; authenticated com execute.
select
  has_function_privilege('anon',          'public.is_member()', 'execute') as anon_executa,
  has_function_privilege('authenticated', 'public.is_member()', 'execute') as authenticated_executa;

-- INFORMATIVO: dono de is_member() e se ignora RLS. Como members não usa FORCE, isto não é
-- mais crítico; serve só para você saber como o projeto está configurado.
select p.proname, r.rolname as dono, r.rolbypassrls
from pg_proc p
join pg_roles r on r.oid = p.proowner
where p.pronamespace = 'public'::regnamespace and p.proname = 'is_member';


-- (D) Policies por tabela. Esperado: todas com roles = {authenticated}, nenhuma para anon/public,
-- sem DELETE em members/settings/bills, e 4 policies (select/insert/update/delete) em storage.objects
-- filtradas por bucket_id = 'boletos'.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public'  and tablename in ('members', 'settings', 'bills'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'boletos_%')
order by schemaname, tablename, cmd, policyname;

-- Qualquer policy de storage.objects que NÃO seja do bucket boletos (só para você saber que existe).
select policyname, roles, cmd, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname not like 'boletos_%';

-- Bucket: esperado public = false, 5242880 bytes, {application/pdf}.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'boletos';
