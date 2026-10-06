create table if not exists private.valid_visit_scores(
  darts smallint not null,
  score smallint not null,
  primary key(darts,score)
);

with recursive legal(value) as (
  select 0 union select generate_series(1,20) union select generate_series(1,20)*2
  union select generate_series(1,20)*3 union select 25 union select 50
), totals(darts,total) as (
  select 0,0 union all select totals.darts+1,totals.total+legal.value from totals cross join legal where totals.darts<3
)
insert into private.valid_visit_scores(darts,score)
select distinct darts,total from totals where darts between 0 and 3
on conflict do nothing;

create or replace function private.is_valid_visit_score(p_score integer, p_darts integer)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select exists(select 1 from private.valid_visit_scores where darts=p_darts and score=p_score)
$$;

alter table public.matches add column if not exists leg_starter_id uuid references auth.users(id) on delete set null;
update public.matches set leg_starter_id=created_by where leg_starter_id is null;

create or replace function public.join_online_match(p_room_code text)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid:=auth.uid(); m public.matches;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into m from public.matches where room_code=upper(trim(p_room_code)) for update;
  if m.id is null then raise exception 'Room not found'; end if;
  if exists(select 1 from public.match_players where match_id=m.id and user_id=uid) then return m; end if;
  if m.status<>'waiting' then raise exception 'Room is not waiting'; end if;
  if (select count(*) from public.match_players where match_id=m.id)>=2 then raise exception 'Room is full'; end if;
  insert into public.match_players(match_id,user_id,seat,remaining) values(m.id,uid,2,m.game_type);
  update public.matches set status='live',started_at=coalesce(started_at,now()),version=version+1 where id=m.id returning * into m;
  return m;
end
$$;

create or replace function public.create_online_match(
  p_game_type smallint default 501,
  p_double_out boolean default true,
  p_legs_to_win smallint default 1,
  p_visibility public.match_visibility default 'private'::public.match_visibility
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid:=auth.uid(); code text; m public.matches;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_game_type not in (301,501) then raise exception 'Invalid game type'; end if;
  if p_legs_to_win < 1 or p_legs_to_win > 7 then raise exception 'Invalid legs target'; end if;
  if p_visibility <> 'private'::public.match_visibility then raise exception 'Only private beta matches are enabled'; end if;
  loop
    code:=upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from public.matches where room_code=code);
  end loop;
  insert into public.matches(room_code,created_by,game_type,double_out,legs_to_win,visibility,current_player_id,leg_starter_id)
  values(code,uid,p_game_type,p_double_out,p_legs_to_win,p_visibility,uid,uid)
  returning * into m;
  insert into public.match_players(match_id,user_id,seat,remaining) values(m.id,uid,1,p_game_type);
  return m;
end
$$;

drop function if exists public.submit_online_visit(uuid,smallint,smallint,boolean,uuid);

create function public.submit_online_visit(
  p_match_id uuid,
  p_score smallint,
  p_darts_used smallint default 3,
  p_checkout_double smallint default null,
  p_client_event_id uuid default extensions.gen_random_uuid()
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid:=auth.uid(); m public.matches; me public.match_players; opp public.match_players;
  new_remaining integer; is_bust boolean:=false; vnum integer; won_leg boolean:=false;
  double_score integer; setup_score integer; next_starter uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not private.is_valid_visit_score(p_score,p_darts_used) then raise exception 'Impossible visit score'; end if;
  if p_checkout_double is not null and p_checkout_double not between 1 and 20 and p_checkout_double<>25 then raise exception 'Invalid finishing double'; end if;

  select * into m from public.matches where id=p_match_id for update;
  if m.id is null or m.status<>'live' then raise exception 'Match is not live'; end if;
  if m.current_player_id<>uid then raise exception 'Not your turn'; end if;
  select * into me from public.match_players where match_id=m.id and user_id=uid for update;
  select * into opp from public.match_players where match_id=m.id and user_id<>uid for update;
  if me.user_id is null or opp.user_id is null then raise exception 'Both players required'; end if;
  if exists(select 1 from public.visits where match_id=m.id and client_event_id=p_client_event_id) then return m; end if;

  new_remaining:=me.remaining-p_score;
  if new_remaining<0 or (m.double_out and new_remaining=1) then is_bust:=true; end if;

  if m.double_out and new_remaining=0 then
    if p_checkout_double is null then
      is_bust:=true;
    else
      double_score:=p_checkout_double*2;
      setup_score:=p_score-double_score;
      if setup_score<0 or not private.is_valid_visit_score(setup_score,p_darts_used-1) then
        raise exception 'Finishing double does not match this visit';
      end if;
      won_leg:=true;
    end if;
  elsif not m.double_out and new_remaining=0 then
    won_leg:=true;
  elsif p_checkout_double is not null then
    raise exception 'Finishing double is only valid on a checkout';
  end if;

  if is_bust then new_remaining:=me.remaining;won_leg:=false;p_checkout_double:=null;end if;
  select coalesce(max(visit_number),0)+1 into vnum from public.visits where match_id=m.id and leg_number=m.leg_number;
  insert into public.visits(match_id,user_id,leg_number,visit_number,score,darts_used,checkout,bust,remaining_before,remaining_after,client_event_id)
  values(m.id,uid,m.leg_number,vnum,p_score,p_darts_used,won_leg,is_bust,me.remaining,new_remaining,p_client_event_id);

  update public.match_players set remaining=new_remaining,visits_count=visits_count+1,darts_thrown=darts_thrown+p_darts_used,
    points_scored=points_scored+(case when is_bust then 0 else p_score end),
    checkout_attempts=checkout_attempts+(case when p_checkout_double is not null then 1 else 0 end),
    checkouts=checkouts+(case when won_leg then 1 else 0 end),highest_checkout=greatest(highest_checkout,case when won_leg then p_score else 0 end)
  where match_id=m.id and user_id=uid;

  if won_leg then
    update public.match_players set legs_won=legs_won+1 where match_id=m.id and user_id=uid;
    select * into me from public.match_players where match_id=m.id and user_id=uid;
    if me.legs_won>=m.legs_to_win then
      update public.matches set status='finished',winner_id=uid,finished_at=now(),version=version+1 where id=m.id returning * into m;
    else
      next_starter:=case when m.leg_starter_id=uid then opp.user_id else uid end;
      update public.match_players set remaining=m.game_type where match_id=m.id;
      update public.matches set leg_number=leg_number+1,current_player_id=next_starter,leg_starter_id=next_starter,version=version+1 where id=m.id returning * into m;
    end if;
  else
    update public.matches set current_player_id=opp.user_id,version=version+1 where id=m.id returning * into m;
  end if;
  return m;
end
$$;

revoke all on function private.is_valid_visit_score(integer,integer) from public,anon,authenticated;
revoke all on function public.submit_online_visit(uuid,smallint,smallint,smallint,uuid) from public,anon;
grant execute on function public.submit_online_visit(uuid,smallint,smallint,smallint,uuid) to authenticated;
revoke all on function public.create_online_match(smallint,boolean,smallint,public.match_visibility) from public,anon;
grant execute on function public.create_online_match(smallint,boolean,smallint,public.match_visibility) to authenticated;
revoke all on function public.join_online_match(text) from public,anon;
grant execute on function public.join_online_match(text) to authenticated;
