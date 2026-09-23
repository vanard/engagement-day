-- New wishes appear immediately. Existing hidden/pending rows stay hidden because
-- the old schema cannot distinguish a pending wish from an owner rejection.
begin;

alter table public.wishes alter column approved set default true;

create or replace function public.submit_wish(p_token_hash text, p_key uuid, p_name text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  party uuid;
  saved_wish public.wishes%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('outcome', 'invalid_token');
  end if;
  select id into party from public.invitation_parties where token_hash = p_token_hash for update;
  if party is null then return jsonb_build_object('outcome', 'invalid_token'); end if;
  if p_key is null or p_name is null or p_message is null
    or char_length(btrim(p_name)) not between 1 and 100
    or char_length(btrim(p_message)) not between 1 and 1000 then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;
  select * into saved_wish from public.wishes where party_id = party and idempotency_key = p_key;
  if found then
    if saved_wish.name <> btrim(p_name) or saved_wish.message <> btrim(p_message) then
      return jsonb_build_object('outcome', 'conflict');
    end if;
  else
    if (select count(*) from public.wishes where party_id = party and created_at > now() - interval '1 hour') >= 3 then
      return jsonb_build_object('outcome', 'rate_limited');
    end if;
    insert into public.wishes(party_id, idempotency_key, name, message)
      values (party, p_key, btrim(p_name), btrim(p_message)) returning * into saved_wish;
  end if;
  return jsonb_build_object(
    'outcome', 'saved',
    'approved', saved_wish.approved,
    'wish', jsonb_build_object(
      'id', saved_wish.id,
      'name', saved_wish.name,
      'message', saved_wish.message,
      'createdAt', saved_wish.created_at
    )
  );
end;
$$;

revoke all on function public.submit_wish(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_wish(text, uuid, text, text) to service_role;

commit;
