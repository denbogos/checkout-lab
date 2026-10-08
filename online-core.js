(() => {
'use strict';
const cfg=window.CHECKOUT_LAB_SUPABASE||{};
const state={client:null,user:null,profile:null,match:null,players:[],visits:[],channel:null,presence:null,listeners:new Set()};
const emit=()=>state.listeners.forEach(fn=>fn({...state}));
const need=()=>{if(!state.client)throw new Error('Online backend is not configured yet.');return state.client};
async function init(){
 if(!cfg.url||!cfg.publishableKey||!window.supabase?.createClient){emit();return false}
 state.client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:{user}}=await state.client.auth.getUser(); state.user=user||null;
 if(user) await loadProfile();
 state.client.auth.onAuthStateChange(async(_e,s)=>{state.user=s?.user||null;state.profile=null;if(state.user)await loadProfile();emit()});
 emit();return true;
}
async function loadProfile(){const {data,error}=await need().from('profiles').select('*').eq('id',state.user.id).single();if(error)throw error;state.profile=data;emit();return data}
async function signUp(email,password,displayName){const {data,error}=await need().auth.signUp({email,password,options:{data:{display_name:displayName||'Player'}}});if(error)throw error;return data}
async function signIn(email,password){const {data,error}=await need().auth.signInWithPassword({email,password});if(error)throw error;return data}
async function signOut(){await leaveRealtime();const {error}=await need().auth.signOut();if(error)throw error}
async function updateProfile(patch){const allowed={};for(const k of ['username','display_name','avatar_url','country_code','bio'])if(k in patch)allowed[k]=patch[k];const {data,error}=await need().from('profiles').update(allowed).eq('id',state.user.id).select().single();if(error)throw error;state.profile=data;emit();return data}
async function createMatch(opts={}){const {data,error}=await need().rpc('create_online_match',{p_game_type:opts.gameType||501,p_double_out:opts.doubleOut!==false,p_legs_to_win:opts.legsToWin||1,p_visibility:opts.visibility||'private'});if(error)throw error;await openMatch(data.id);return data}
async function joinMatch(code){const {data,error}=await need().rpc('join_online_match',{p_room_code:String(code||'').trim().toUpperCase()});if(error)throw error;await openMatch(data.id);return data}
async function openMatch(id){await leaveRealtime();await refreshMatch(id);const c=need();
 state.channel=c.channel('match-db-'+id)
  .on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:'id=eq.'+id},()=>refreshMatch(id))
  .on('postgres_changes',{event:'*',schema:'public',table:'match_players',filter:'match_id=eq.'+id},()=>refreshMatch(id))
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'visits',filter:'match_id=eq.'+id},()=>refreshMatch(id))
  .subscribe();
 state.presence=c.channel('match-presence-'+id,{config:{presence:{key:state.user.id}}});
 state.presence.on('presence',{event:'sync'},()=>emit()).subscribe(async status=>{if(status==='SUBSCRIBED')await state.presence.track({user_id:state.user.id,username:state.profile?.username,at:new Date().toISOString()})});
 emit();
}
async function refreshMatch(id){const c=need();const [m,p,v]=await Promise.all([
 c.from('matches').select('*').eq('id',id).single(),
 c.from('match_players').select('*,profiles:user_id(username,display_name,avatar_url)').eq('match_id',id).order('seat'),
 c.from('visits').select('*').eq('match_id',id).order('id',{ascending:false}).limit(30)
]);if(m.error)throw m.error;if(p.error)throw p.error;if(v.error)throw v.error;state.match=m.data;state.players=p.data||[];state.visits=v.data||[];emit();return state.match}
async function submitVisit(score,{dartsUsed=3,checkout=false,eventId=crypto.randomUUID()}={}){const {data,error}=await need().rpc('submit_online_visit',{p_match_id:state.match.id,p_score:Number(score),p_darts_used:dartsUsed,p_checkout:checkout,p_client_event_id:eventId});if(error)throw error;await refreshMatch(state.match.id);return data}
async function sendFriendRequest(username){const {data,error}=await need().rpc('send_friend_request',{p_username:username});if(error)throw error;return data}
async function respondFriendRequest(id,accept){const {data,error}=await need().rpc('respond_friend_request',{p_friendship:id,p_accept:!!accept});if(error)throw error;return data}
async function getFriends(){const {data,error}=await need().from('friendships').select('*,requester:requester_id(username,display_name,avatar_url),addressee:addressee_id(username,display_name,avatar_url)').eq('status','accepted');if(error)throw error;return data||[]}
async function getInvites(){const {data,error}=await need().from('match_invitations').select('*,match:match_id(*),sender:sender_id(username,display_name,avatar_url)').eq('recipient_id',state.user.id).is('accepted_at',null).is('declined_at',null);if(error)throw error;return data||[]}
async function leaveRealtime(){if(!state.client)return;if(state.channel){await state.client.removeChannel(state.channel);state.channel=null}if(state.presence){await state.client.removeChannel(state.presence);state.presence=null}}
function onlineUsers(){return state.presence?.presenceState?.()||{}}
function subscribe(fn){state.listeners.add(fn);fn({...state});return()=>state.listeners.delete(fn)}
window.CheckoutOnline={state,init,subscribe,signUp,signIn,signOut,updateProfile,createMatch,joinMatch,openMatch,refreshMatch,submitVisit,sendFriendRequest,respondFriendRequest,getFriends,getInvites,onlineUsers,leaveRealtime};
})();