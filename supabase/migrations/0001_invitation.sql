-- Foundation only; do not enable forms before API authorization and abuse controls exist.
create table public.invitation_parties (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 100),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.invitation_parties(id) on delete cascade,
  idempotency_key uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  message text not null check (char_length(message) between 1 and 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (party_id, idempotency_key)
);
create index wishes_public_page on public.wishes (created_at desc, id desc) where approved = true;

alter table public.invitation_parties enable row level security;
alter table public.wishes enable row level security;
-- No browser access: future endpoints authorize requests using server-only credentials.
revoke all on public.invitation_parties, public.wishes from anon, authenticated;
