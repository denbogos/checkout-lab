(() => {
'use strict';
const cfg=window.CHECKOUT_LAB_SUPABASE||{};
const state={client:null,user:null,profile:null,match:null,players:[],visits:[],channel:null,presence:null,realtimeStatus:'OFFLINE',listeners:new Set()};
let refreshPromise=null,pollTimer=null,pollGeneration=0,lastSnapshotKey='';
const emit=()=>state.listeners.forEach(fn=>fn({...state}));
const need=()=>{if(!state.client)throw new Error('Online backend is not configured yet.');return state.client};
const roomFromUrl=()=>new URLSearchParams(location.search).get('room')?.trim().toUpperCase()||'';
const setRoomUrl=code=>{const url=new URL(location.href);code?url.searchParams.set('room',code):url.searchParams.delete('room');history.replaceState(null,'',url)};
async function init(){
 if(!cfg.url||!cfg.publishableKey||!window.supabase?.createClient){emit();return false}
 state.client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:{user},error}=await state.client.auth.getUser();if(error)throw error;state.user=user||null;
 if(state.user){await loadProfile();if(roomFromUrl())await joinMatch(roomFromUrl())}
 state.client.auth.onAuthStateChange((_event,session)=>{
  setTimeout(async()=>{try{state.user=session?.user||null;state.profile=null;if(state.user){await loadProfile();if(roomFromUrl()&&!state.match)await joinMatch(roomFromUrl())}else{await leaveRealtime();state.match=null;state.players=[];state.visits=[]}emit()}catch(err){state.lastError=err.message;emit()}},0);
 });
 emit();return true;
}
async function loadProfile(){const {data,error}=await need().from('profiles').select('*').eq('id',state.user.id).single();if(error)throw error;state.profile=data;emit();return data}
async function signUp(email,password,displayName){const {data,error}=await need().auth.signUp({email,password,options:{data:{display_name:displayName||'Player'}}});if(error)throw error;return data}
async function signIn(email,password){const {data,error}=await need().auth.signInWithPassword({email,password});if(error)throw error;return data}
async function signOut(){await leaveRealtime();setRoomUrl('');const {error}=await need().auth.signOut();if(error)throw error}
async function updateProfile(patch){const allowed={};for(const k of ['username','display_name','avatar_url','country_code','bio'])if(k in patch)allowed[k]=patch[k];const {data,error}=await need().from('profiles').update(allowed).eq('id',state.user.id).select().single();if(error)throw error;state.profile=data;emit();return data}
async function createMatch(opts={}){const {data,error}=await need().rpc('create_online_match',{p_game_type:opts.gameType||501,p_double_out:opts.doubleOut!==false,p_legs_to_win:opts.legsToWin||1,p_visibility:'private'});if(error)throw error;setRoomUrl(data.room_code);await openMatch(data.id);return data}
async function joinMatch(code){const normalized=String(code||'').trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(normalized))throw new Error('Room code must contain 6 characters.');const {data,error}=await need().rpc('join_online_match',{p_room_code:normalized});if(error)throw error;setRoomUrl(data.room_code);await openMatch(data.id);return data}
async function openMatch(id){await leaveRealtime();await refreshMatch(id);const c=need();
 state.realtimeStatus='CONNECTING';
 state.channel=c.channel('match-db-'+id)
  .on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:'id=eq.'+id},()=>refreshMatch(id))
  .on('postgres_changes',{event:'*',schema:'public',table:'match_players',filter:'match_id=eq.'+id},()=>refreshMatch(id))
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'visits',filter:'match_id=eq.'+id},()=>refreshMatch(id))
  .subscribe(status=>{state.realtimeStatus=status;emit()});
 state.presence=c.channel('match-presence-'+id,{config:{presence:{key:state.user.id}}});
 state.presence.on('presence',{event:'sync'},()=>emit()).subscribe(async status=>{if(status==='SUBSCRIBED')await state.presence.track({user_id:state.user.id,at:new Date().toISOString()})});
 startPolling(id);emit();
}
async function refreshMatch(id){
 if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{const c=need();const [m,p,v]=await Promise.all([
  c.from('matches').select('*').eq('id',id).single(),
  c.from('match_players').select('*,profiles:user_id(username,display_name,avatar_url)').eq('match_id',id).order('seat'),
  c.from('visits').select('*').eq('match_id',id).order('id',{ascending:false}).limit(30)
 ]);if(m.error)throw m.error;if(p.error)throw p.error;if(v.error)throw v.error;
  const players=p.data||[],visits=v.data||[];
  const snapshotKey=[m.data.version,m.data.status,m.data.current_player_id,players.map(x=>`${x.user_id}:${x.remaining}:${x.legs_won}`).join(','),visits[0]?.id||0,visits.length].join('|');
  state.match=m.data;state.players=players;state.visits=visits;
  if(snapshotKey!==lastSnapshotKey){lastSnapshotKey=snapshotKey;emit()}
  return state.match})().finally(()=>{refreshPromise=null});
 return refreshPromise;
}
function stopPolling(){if(pollTimer)clearTimeout(pollTimer);pollTimer=null;pollGeneration++}
function startPolling(id){
 stopPolling();const generation=pollGeneration;
 const tick=async()=>{
  if(generation!==pollGeneration||state.match?.id!==id)return;
  try{await refreshMatch(id);state.lastError=''}catch(error){state.lastError=error.message;emit()}
  if(generation!==pollGeneration||state.match?.id!==id)return;
  pollTimer=setTimeout(tick,state.realtimeStatus==='SUBSCRIBED'?15000:2000);
 };
 pollTimer=setTimeout(tick,2000);
}
async function submitVisit(score,{dartsUsed=3,checkoutDouble=null,eventId=crypto.randomUUID()}={}){if(!state.match)throw new Error('Match is not open.');const {data,error}=await need().rpc('submit_online_visit',{p_match_id:state.match.id,p_score:Number(score),p_darts_used:Number(dartsUsed),p_checkout_double:checkoutDouble===null?null:Number(checkoutDouble),p_client_event_id:eventId});if(error)throw error;await refreshMatch(state.match.id);return data}
async function leaveRealtime(){stopPolling();if(!state.client)return;if(state.channel){await state.client.removeChannel(state.channel);state.channel=null}if(state.presence){await state.client.removeChannel(state.presence);state.presence=null}state.realtimeStatus='OFFLINE'}
async function leaveMatch(){await leaveRealtime();state.match=null;state.players=[];state.visits=[];lastSnapshotKey='';setRoomUrl('');emit()}
function inviteUrl(){if(!state.match)return '';const url=new URL(location.href);url.search='';url.searchParams.set('room',state.match.room_code);return url.href}
function onlineUsers(){return state.presence?.presenceState?.()||{}}
function subscribe(fn){state.listeners.add(fn);fn({...state});return()=>state.listeners.delete(fn)}
window.CheckoutOnline={state,init,subscribe,signUp,signIn,signOut,updateProfile,createMatch,joinMatch,openMatch,refreshMatch,submitVisit,onlineUsers,leaveRealtime,leaveMatch,inviteUrl};
})();
