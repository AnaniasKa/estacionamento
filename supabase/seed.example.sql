-- seed.example.sql — MODELO de cadastro inicial. Copie para fora do repositório (ou edite só no
-- SQL Editor), troque cada <PLACEHOLDER> e rode como postgres, DEPOIS das migrations.
-- NUNCA salve valores reais neste arquivo nem faça commit com eles.
--
-- Pré-requisito: os dois usuários já existem em Authentication > Users (Auto Confirm User
-- marcado). Os ids abaixo são os "User UID" mostrados nessa tela.
-- No SQL Editor, auth.uid() é nulo; por isso created_by é informado explicitamente.

-- 1) Os dois membros. Telefone: só dígitos com DDI+DDD (10 a 15 dígitos), ou null.
insert into public.members (id, name, email, phone) values
  ('<ID_DO_USUARIO_1>', '<NOME_1>', '<EMAIL_1>', '<TELEFONE_1_OU_NULL>'),
  ('<ID_DO_USUARIO_2>', '<NOME_2>', '<EMAIL_2>', '<TELEFONE_2_OU_NULL>');
-- Exemplo de telefone: '<DDI><DDD><NUMERO>' entre aspas simples; para não informar, use null (sem aspas).

-- 2) Configuração do rodízio (uma única linha).
--    first_month: primeiro dia de um mês, ex.: '<AAAA-MM-01>'.
--    first_payer_id: um dos dois ids acima; é quem paga o first_month, o outro paga o seguinte.
insert into public.settings (first_month, first_payer_id)
values ('<AAAA-MM-01>', '<ID_DO_USUARIO_1>');

-- 3) Boleto de teste (opcional, para rodar o verify.sql). Apague depois, se quiser:
--      delete from public.bills where barcode = '<LINHA_DIGITAVEL_DE_TESTE_47_DIGITOS>';
--    month: primeiro dia do mês. payer_id: quem paga esse mês (já gravado, não muda com os Ajustes).
--    barcode: só dígitos, 47 ou 48. Use um número inventado, nunca um boleto real.
insert into public.bills (month, payer_id, payer_override, amount, due_date, barcode, status, created_by)
values (
  '<AAAA-MM-01>',
  '<ID_DO_PAGADOR_DO_MES>',
  false,
  <VALOR_EX_180.00>,
  '<AAAA-MM-DD_VENCIMENTO>',
  '<LINHA_DIGITAVEL_DE_TESTE_47_DIGITOS>',
  'pending',
  '<ID_DO_USUARIO_1>'
);
