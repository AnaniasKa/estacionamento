-- 0001_schema.sql — tabelas do app Estacionamento.
-- Rode no SQL Editor do Supabase, na ordem: 0001, 0002, 0003, 0004.
-- Nenhum dado pessoal aqui: membros e configurações são cadastrados à parte (README).

-- Membros autorizados (exatamente duas pessoas). O id é o mesmo de auth.users.
create table public.members (
  id    uuid primary key references auth.users (id) on delete cascade,
  name  text not null,
  email text not null unique,
  phone text null check (phone ~ '^[0-9]{10,15}$')  -- E.164 sem símbolos
);

-- Configuração do rodízio: uma única linha.
create table public.settings (
  id             boolean primary key default true check (id),
  first_month    date not null check (extract(day from first_month) = 1),
  first_payer_id uuid not null references public.members (id)
);

-- Um boleto por mês.
create table public.bills (
  id                 uuid primary key default gen_random_uuid(),
  month              date not null unique check (extract(day from month) = 1),
  payer_id           uuid not null references public.members (id),
  payer_override     boolean not null default false,
  amount             numeric(10, 2) not null check (amount > 0),
  due_date           date not null,
  barcode            text null check (barcode ~ '^[0-9]{47,48}$'),
  attachment_path    text null,
  status             text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at            timestamptz null,
  paid_by            uuid null references public.members (id),
  whatsapp_opened_at timestamptz null,
  created_by         uuid not null default auth.uid() references public.members (id),
  created_at         timestamptz not null default now(),
  check (status = 'pending' or (paid_at is not null and paid_by is not null))
);
