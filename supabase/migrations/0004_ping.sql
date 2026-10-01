-- 0004_ping.sql — função de keep-alive liberada para anon.
-- Rode no SQL Editor do Supabase DEPOIS de 0001, 0002 e 0003.
--
-- EXCEÇÃO DELIBERADA à regra "nada para anon" (0002_rls.sql):
-- Projetos Free do Supabase são pausados por inatividade de banco, e o papel anon não tem acesso a
-- nenhuma tabela. Um workflow agendado do GitHub chama esta função com a chave pública (anon) para
-- gerar atividade real no Postgres sem precisar de segredo nem de usuário de login.
--
-- O que ela expõe: nada além do próprio fato de existir. Devolve sempre true, não lê nem grava
-- tabela alguma, não recebe parâmetros e roda com os privilégios de quem chama (security invoker),
-- ou seja, anon continua sem acesso a qualquer dado. Qualquer pessoa com a chave pública pode
-- chamá-la, e o único efeito possível é uma consulta trivial ao banco.

create or replace function public.ping()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select true;
$$;

-- Parte de zero (funções novas em public recebem execute por padrão para public, anon e
-- authenticated) e libera só anon.
revoke execute on function public.ping() from public, anon, authenticated;
grant  execute on function public.ping() to anon;
