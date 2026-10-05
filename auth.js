(() => {
'use strict';

const SDK_URL='https://esm.sh/@supabase/supabase-js@2.117.2';
const cfg=window.CHECKOUT_LAB_SUPABASE||{};
let client=null;
let currentUser=null;
let mode='login';
let notice='';
let noticeType='info';
let busy=false;

const ru=()=>document.documentElement.dataset.lang!=='en';
const t=(a,b)=>ru()?a:b;
const root=()=>document.getElementById('auth-root');

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function shortEmail(email=''){
  if(email.length<=24)return email;
  const [name,domain='']=email.split('@');
  return name.slice(0,10)+'…@'+domain;
}
function setNotice(text,type='info'){notice=text;noticeType=type;renderModal();}
function setBusy(value){busy=value;renderModal();}

function ensureButtons(){
  const topbar=document.querySelector('.topbar');
  if(topbar&&!topbar.querySelector('.auth-trigger')){
    const btn=document.createElement('button');
    btn.className='auth-trigger';
    btn.type='button';
    const before=topbar.querySelector('.lang-toggle,.settings-toggle,.theme-toggle,.mobile-menu-button');
    topbar.insertBefore(btn,before||null);
  }
  const menu=document.querySelector('.mobile-menu');
  if(menu&&!menu.querySelector('.auth-menu-trigger')){
    const btn=document.createElement('button');
    btn.className='auth-menu-trigger';
    btn.type='button';
    menu.insertBefore(btn,menu.firstChild);
  }
  updateButtons();
  bindTriggers();
}
function updateButtons(){
  document.querySelectorAll('.auth-trigger').forEach(btn=>{
    btn.innerHTML=currentUser
      ? '<span class="auth-dot"></span><span>'+escapeHtml(shortEmail(currentUser.email||t('Аккаунт','Account')))+'</span>'
      : '<span class="auth-user-icon">●</span><span>'+t('Войти','Sign in')+'</span>';
    btn.title=currentUser?.email||t('Войти или зарегистрироваться','Sign in or create an account');
  });
  document.querySelectorAll('.auth-menu-trigger').forEach(btn=>{
    btn.textContent=currentUser
      ? '● '+(currentUser.email||t('Аккаунт','Account'))
      : '● '+t('Войти / Регистрация','Sign in / Sign up');
  });
}
function bindTriggers(){
  document.querySelectorAll('.auth-trigger,.auth-menu-trigger').forEach(btn=>{
    if(btn.dataset.authBound)return;
    btn.dataset.authBound='1';
    btn.addEventListener('click',()=>openModal(currentUser?'account':'login'));
  });
}

function openModal(next='login'){
  mode=next;
  notice='';
  noticeType='info';
  document.body.classList.add('auth-open');
  renderModal(true);
}
function closeModal(){
  document.body.classList.remove('auth-open');
  const el=document.querySelector('.auth-backdrop');
  if(el)el.remove();
}
function modalMarkup(){
  if(mode==='account'&&currentUser){
    return `<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button class="auth-close" type="button" aria-label="${t('Закрыть','Close')}">×</button>
      <span class="auth-kicker">CHECKOUT LAB</span>
      <h2 id="auth-title">${t('Аккаунт','Account')}</h2>
      <div class="auth-account-email">${escapeHtml(currentUser.email||'')}</div>
      <div class="auth-verified">✓ ${t('Почта подтверждена','Email verified')}</div>
      <p class="auth-copy">${t('Аккаунт подключён. Дальше к нему можно привязать историю матчей, друзей и онлайн-игры.','Your account is connected. Match history, friends and online games can be linked next.')}</p>
      <button class="auth-primary auth-signout" type="button">${t('Выйти','Sign out')}</button>
    </div>`;
  }

  const signup=mode==='signup';
  const reset=mode==='reset';
  return `<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <button class="auth-close" type="button" aria-label="${t('Закрыть','Close')}">×</button>
    <span class="auth-kicker">CHECKOUT LAB</span>
    <h2 id="auth-title">${reset?t('Восстановление пароля','Reset password'):signup?t('Создать аккаунт','Create account'):t('Вход','Sign in')}</h2>
    <p class="auth-copy">${reset?t('Укажи почту — отправим ссылку для восстановления.','Enter your email and we will send a recovery link.'):signup?t('Регистрация бесплатная. После неё подтвердите почту по ссылке в письме.','Registration is free. Confirm your email using the link we send you.'):t('Войди в свой аккаунт Checkout Lab.','Sign in to your Checkout Lab account.')}</p>
    <form class="auth-form">
      <label><span>Email</span><input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="name@example.com"></label>
      ${reset?'':`<label><span>${t('Пароль','Password')}</span><input id="auth-password" name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="8" required placeholder="${t('Минимум 8 символов','At least 8 characters')}"></label>`}
      <button class="auth-primary" type="submit" ${busy?'disabled':''}>${busy?t('Подождите…','Please wait…'):reset?t('Отправить ссылку','Send recovery link'):signup?t('Зарегистрироваться','Create account'):t('Войти','Sign in')}</button>
    </form>
    ${notice?`<div class="auth-notice ${noticeType}">${escapeHtml(notice)}</div>`:''}
    ${signup&&noticeType==='success'?'<button class="auth-resend" type="button">'+t('Отправить письмо ещё раз','Resend confirmation email')+'</button>':''}
    <div class="auth-switch">
      ${reset?'<button type="button" data-auth-mode="login">'+t('← Вернуться ко входу','← Back to sign in')+'</button>':signup?'<span>'+t('Уже есть аккаунт?','Already have an account?')+'</span><button type="button" data-auth-mode="login">'+t('Войти','Sign in')+'</button>':'<span>'+t('Нет аккаунта?','No account yet?')+'</span><button type="button" data-auth-mode="signup">'+t('Регистрация','Sign up')+'</button>'}
    </div>
    ${!signup&&!reset?'<button class="auth-forgot" type="button" data-auth-mode="reset">'+t('Забыли пароль?','Forgot password?')+'</button>':''}
  </div>`;
}
function renderModal(focus=false){
  if(!document.body.classList.contains('auth-open'))return;
  let backdrop=document.querySelector('.auth-backdrop');
  if(!backdrop){
    backdrop=document.createElement('div');
    backdrop.className='auth-backdrop';
    (root()||document.body).appendChild(backdrop);
  }
  backdrop.innerHTML=modalMarkup();
  backdrop.onclick=e=>{if(e.target===backdrop)closeModal();};
  backdrop.querySelector('.auth-close')?.addEventListener('click',closeModal);
  backdrop.querySelectorAll('[data-auth-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.authMode;notice='';renderModal(true);}));
  backdrop.querySelector('.auth-form')?.addEventListener('submit',handleSubmit);
  backdrop.querySelector('.auth-signout')?.addEventListener('click',handleSignOut);
  backdrop.querySelector('.auth-resend')?.addEventListener('click',handleResend);
  if(focus)setTimeout(()=>backdrop.querySelector('#auth-email')?.focus(),0);
}
async function handleSubmit(e){
  e.preventDefault();
  if(!client){setNotice(t('Для входа нужен интернет. Проверь соединение и обнови страницу.','Internet access is required. Check your connection and reload the page.'),'error');return;}
  const email=e.currentTarget.email.value.trim();
  const password=e.currentTarget.password?.value||'';
  if(!email)return;
  setBusy(true);
  try{
    if(mode==='signup'){
      const {data,error}=await client.auth.signUp({email,password});
      if(error)throw error;
      if(data.session){
        currentUser=data.user;
        closeModal();updateButtons();
      }else{
        notice=t('Готово! Мы отправили письмо. Открой его и нажми ссылку подтверждения.','Done! We sent an email. Open it and click the confirmation link.');
        noticeType='success';
      }
    }else if(mode==='reset'){
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});
      if(error)throw error;
      notice=t('Ссылка для восстановления отправлена на почту.','Password recovery link sent.');
      noticeType='success';
    }else{
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      currentUser=data.user;
      closeModal();updateButtons();
    }
  }catch(err){
    const raw=String(err?.message||err||'');
    let friendly=raw;
    if(/invalid login credentials/i.test(raw))friendly=t('Неверная почта или пароль.','Invalid email or password.');
    else if(/email not confirmed/i.test(raw))friendly=t('Сначала подтвердите почту по ссылке из письма.','Confirm your email using the link we sent first.');
    else if(/password/i.test(raw)&&/least|short/i.test(raw))friendly=t('Пароль должен содержать минимум 8 символов.','Password must contain at least 8 characters.');
    notice=friendly;noticeType='error';
  }finally{busy=false;renderModal();}
}
async function handleResend(){
  if(!client)return;
  const email=document.querySelector('#auth-email')?.value.trim();
  if(!email){setNotice(t('Введите email ещё раз.','Enter your email again.'),'error');return;}
  setBusy(true);
  const {error}=await client.auth.resend({type:'signup',email});
  busy=false;
  if(error)setNotice(error.message,'error');
  else setNotice(t('Письмо отправлено повторно.','Confirmation email sent again.'),'success');
}
async function handleSignOut(){
  if(!client)return;
  setBusy(true);
  await client.auth.signOut();
  currentUser=null;busy=false;closeModal();updateButtons();
}
async function init(){
  if(!root()){
    const r=document.createElement('div');r.id='auth-root';document.body.appendChild(r);
  }
  ensureButtons();
  new MutationObserver(()=>ensureButtons()).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('auth-open'))closeModal();});
  if(!cfg.url||!cfg.publishableKey)return;
  try{
    const mod=await import(SDK_URL);
    client=mod.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await client.auth.getSession();
    currentUser=data.session?.user||null;
    updateButtons();
    client.auth.onAuthStateChange((event,session)=>{
      currentUser=session?.user||null;
      updateButtons();
      if(event==='SIGNED_IN'&&currentUser&&location.hash){
        history.replaceState(null,'',location.pathname+location.search);
      }
    });
  }catch(err){
    console.warn('Checkout Lab auth unavailable',err);
    client=null;updateButtons();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();