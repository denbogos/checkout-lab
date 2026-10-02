-- Checkout Lab Online 3.0 — initial Supabase schema
-- Run once in Supabase SQL Editor on a fresh project.
create extension if not exists pgcrypto;

create type public.friendship_status as enum ('pending','accepted','blocked');
create type public.match_status as enum ('waiting','live','finished','cancelled');
create type public.match_visibility as enum ('private','friends','public');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  bio text check (bio is null or char_length(bio) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_unique on public.friendships
  (least(requester_id,addressee_id), greatest(requester_id,addressee_id));

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  created_by uuid not null references public.profiles(id),
  game_type smallint not null check (game_type in (301,501)),
  double_out boolean not null default true,
  legs_to_win smallint not null default 1 check (legs_to_win between 1 and 25),
  visibility public.match_visibility not null default 'private',
  status public.match_status not null default 'waiting',
  current_player_id uuid references public.profiles(id),
  leg_number smallint not null default 1,
  version bigint not null default 0,
  winner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat smallint not null check (seat in (1,2)),
  remaining integer not null,
  legs_won smallint not null default 0,
  visits_count integer not null default 0,
  darts_thrown integer not null default 0,
  points_scored integer not null default 0,
  checkout_attempts integer not null default 0,
  checkouts integer not null default 0,
  highest_checkout integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (match_id,user_id),
  unique(match_id,seat)
);

create table public.visits (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  leg_number smallint not null,
  visit_number integer not null,
  score smallint not null check (score between 0 and 180),
  darts_used smallint not null default 3 check (darts_used between 1 and 3),
  checkout boolean not null default false,
  bust boolean not null default false,
  remaining_before integer not null,
  remaining_after integer not null,
  client_event_id uuid not null,
  created_at timestamptz not null default now(),
  unique(match_id,client_event_id)
);
create index visits_match_created_idx on public.visits(match_id,id);

create table public.match_invitations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  check(sender_id <> recipient_id)
);

create table public.spectators (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(match_id,user_id)
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.visits enable row level security;
alter table public.match_invitations enable row level security;
alter table public.spectators enable row level security;

revoke all on public.profiles, public.friendships, public.matches, public.match_players,
  public.visits, public.match_invitations, public.spectators from anon;
grant select, insert, update on public.profiles to authenticated;
grant select on public.friendships, public.matches, public.match_players, public.visits,
  public.match_invitations, public.spectators to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy friendships_read_party on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id,addressee_id));

create policy matches_read on public.matches for select to authenticated using (
  visibility = 'public'
  or created_by = (select auth.uid())
  or exists (select 1 from public.match_players mp where mp.match_id=id and mp.user_id=(select auth.uid()))
  or exists (select 1 from public.spectators s where s.match_id=id and s.user_id=(select auth.uid()))
);
create policy match_players_read on public.match_players for select to authenticated using (
  exists (select 1 from public.matches m where m.id=match_id and (
    m.visibility='public' or m.created_by=(select auth.uid())
    or exists (select 1 from public.match_players me where me.match_id=m.id and me.user_id=(select auth.uid()))
    or exists (select 1 from public.spectators s where s.match_id=m.id and s.user_id=(select auth.uid()))
  ))
);
create policy visits_read on public.visits for select to authenticated using (
  exists (select 1 from public.matches m where m.id=match_id and (
    m.visibility='public' or m.created_by=(select auth.uid())
    or exists (select 1 from public.match_players me where me.match_id=m.id and me.user_id=(select auth.uid()))
    or exists (select 1 from public.spectators s where s.match_id=m.id and s.user_id=(select auth.uid()))
  ))
);
create policy invitations_read_party on public.match_invitations for select to authenticated
  using ((select auth.uid()) in (sender_id,recipient_id));
create policy spectators_read_self on public.spectators for select to authenticated
  using (user_id=(select auth.uid()));

-- Auto-create a basic profile. Username can be changed later.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.profiles(id,username,display_name)
  values (
    new.id,
    'player_' || substr(replace(new.id::text,'-',''),1,10),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Player')
  );
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper used only inside policies/functions.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_match_player(p_match uuid, p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.match_players where match_id=p_match and user_id=p_user) $$;
revoke execute on function private.is_match_player(uuid,uuid) from public, anon;
grant execute on function private.is_match_player(uuid,uuid) to authenticated;

-- Create a 2-player room. The creator is seat 1.
create or replace function public.create_online_match(
  p_game_type smallint default 501,
  p_double_out boolean default true,
  p_legs_to_win smallint default 1,
  p_visibility public.match_visibility default 'private'
) returns public.matches
language plpgsql security definer set search_path=''
as $$
declare
  uid uuid := auth.uid();
  code text;
  m public.matches;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_game_type not in (301,501) then raise exception 'Invalid game type'; end if;
  if p_legs_to_win < 1 or p_legs_to_win > 25 then raise exception 'Invalid legs target'; end if;
  loop
    code := upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from public.matches where room_code=code);
  end loop;
  insert into public.matches(room_code,created_by,game_type,double_out,legs_to_win,visibility,current_player_id)
  values(code,uid,p_game_type,p_double_out,p_legs_to_win,p_visibility,uid)
  returning * into m;
  insert into public.match_players(match_id,user_id,seat,remaining)
  values(m.id,uid,1,p_game_type);
  return m;
end $$;

create or replace function public.join_online_match(p_room_code text)
returns public.matches
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); m public.matches;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into m from public.matches where room_code=upper(trim(p_room_code)) for update;
  if m.id is null then raise exception 'Room not found'; end if;
  if m.status <> 'waiting' then raise exception 'Room is not waiting'; end if;
  if exists(select 1 from public.match_players where match_id=m.id and user_id=uid) then return m; end if;
  if (select count(*) from public.match_players where match_id=m.id) >= 2 then raise exception 'Room is full'; end if;
  insert into public.match_players(match_id,user_id,seat,remaining) values(m.id,uid,2,m.game_type);
  update public.matches set status='live',started_at=coalesce(started_at,now()),version=version+1 where id=m.id returning * into m;
  return m;
end $$;

-- Atomic authoritative scoring. Client supplies only visit facts; DB validates turn and remaining.
create or replace function public.submit_online_visit(
  p_match_id uuid,
  p_score smallint,
  p_darts_used smallint default 3,
  p_checkout boolean default false,
  p_client_event_id uuid default gen_random_uuid()
) returns public.matches
language plpgsql security definer set search_path=''
as $$
declare
  uid uuid:=auth.uid(); m public.matches; me public.match_players; opp public.match_players;
  new_remaining integer; is_bust boolean:=false; vnum integer; won_leg boolean:=false;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_score < 0 or p_score > 180 or p_darts_used < 1 or p_darts_used > 3 then raise exception 'Invalid visit'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if m.id is null or m.status<>'live' then raise exception 'Match is not live'; end if;
  if m.current_player_id<>uid then raise exception 'Not your turn'; end if;
  select * into me from public.match_players where match_id=m.id and user_id=uid for update;
  select * into opp from public.match_players where match_id=m.id and user_id<>uid for update;
  if me.user_id is null or opp.user_id is null then raise exception 'Both players required'; end if;
  if exists(select 1 from public.visits where match_id=m.id and client_event_id=p_client_event_id) then return m; end if;

  new_remaining:=me.remaining-p_score;
  if new_remaining<0 then is_bust:=true; end if;
  if m.double_out and new_remaining=1 then is_bust:=true; end if;
  if new_remaining=0 and m.double_out and not p_checkout then is_bust:=true; end if;
  if new_remaining=0 and (not m.double_out or p_checkout) then won_leg:=true; end if;
  if is_bust then new_remaining:=me.remaining; p_checkout:=false; end if;

  select coalesce(max(visit_number),0)+1 into vnum from public.visits where match_id=m.id and leg_number=m.leg_number;
  insert into public.visits(match_id,user_id,leg_number,visit_number,score,darts_used,checkout,bust,remaining_before,remaining_after,client_event_id)
  values(m.id,uid,m.leg_number,vnum,p_score,p_darts_used,p_checkout and won_leg,is_bust,me.remaining,new_remaining,p_client_event_id);

  update public.match_players set
    remaining=new_remaining,
    visits_count=visits_count+1,
    darts_thrown=darts_thrown+p_darts_used,
    points_scored=points_scored+(case when is_bust then 0 else p_score end),
    checkout_attempts=checkout_attempts+(case when p_checkout then 1 else 0 end),
    checkouts=checkouts+(case when won_leg then 1 else 0 end),
    highest_checkout=greatest(highest_checkout,case when won_leg then p_score else 0 end)
  where match_id=m.id and user_id=uid;

  if won_leg then
    update public.match_players set legs_won=legs_won+1 where match_id=m.id and user_id=uid;
    select * into me from public.match_players where match_id=m.id and user_id=uid;
    if me.legs_won>=m.legs_to_win then
      update public.matches set status='finished',winner_id=uid,finished_at=now(),version=version+1 where id=m.id returning * into m;
    else
      update public.match_players set remaining=m.game_type where match_id=m.id;
      update public.matches set leg_number=leg_number+1,current_player_id=opp.user_id,version=version+1 where id=m.id returning * into m;
    end if;
  else
    update public.matches set current_player_id=opp.user_id,version=version+1 where id=m.id returning * into m;
  end if;
  return m;
end $$;

create or replace function public.send_friend_request(p_username text)
returns public.friendships
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); other uuid; f public.friendships;
begin
  select id into other from public.profiles where lower(username)=lower(trim(p_username));
  if uid is null or other is null or other=uid then raise exception 'Invalid player'; end if;
  if exists(select 1 from public.friendships where least(requester_id,addressee_id)=least(uid,other) and greatest(requester_id,addressee_id)=greatest(uid,other))
    then raise exception 'Friendship already exists'; end if;
  insert into public.friendships(requester_id,addressee_id) values(uid,other) returning * into f;
  return f;
end $$;

create or replace function public.respond_friend_request(p_friendship uuid,p_accept boolean)
returns public.friendships
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); f public.friendships;
begin
  update public.friendships set status=case when p_accept then 'accepted'::public.friendship_status else 'blocked'::public.friendship_status end,updated_at=now()
  where id=p_friendship and addressee_id=uid and status='pending' returning * into f;
  if f.id is null then raise exception 'Request not found'; end if;
  return f;
end $$;

revoke execute on function public.create_online_match(smallint,boolean,smallint,public.match_visibility) from public,anon;
revoke execute on function public.join_online_match(text) from public,anon;
revoke execute on function public.submit_online_visit(uuid,smallint,smallint,boolean,uuid) from public,anon;
revoke execute on function public.send_friend_request(text) from public,anon;
revoke execute on function public.respond_friend_request(uuid,boolean) from public,anon;
grant execute on function public.create_online_match(smallint,boolean,smallint,public.match_visibility) to authenticated;
grant execute on function public.join_online_match(text) to authenticated;
grant execute on function public.submit_online_visit(uuid,smallint,smallint,boolean,uuid) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;

-- Realtime for early-stage match synchronization. Presence is handled on private app channels.
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.match_players;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.visits;
exception when duplicate_object then null; end $$;
