(function(){
  var KEY='sp_accounts';
  var views={signup:document.getElementById('v-signup'),login:document.getElementById('v-login'),welcome:document.getElementById('v-welcome')};
  var session=null;

  /* ---------- storage helpers ---------- */
  function load(){
    try{var r=localStorage.getItem(KEY);return r?JSON.parse(r):{}}catch(e){return {}}
  }
  function save(a){
    try{localStorage.setItem(KEY,JSON.stringify(a));return true}catch(e){return false}
  }
  function toHex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
  function hash(pw,salt){
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pw)).then(toHex);
  }
  function newSalt(){return toHex(crypto.getRandomValues(new Uint8Array(16)))}

  /* ---------- view switching ---------- */
  function show(name){
    Object.keys(views).forEach(function(k){views[k].hidden=(k!==name)});
    document.title=name==='login'?'Student Login':name==='welcome'?'Welcome':'Student Sign Up';
  }
  function route(){
    if(session){show('welcome');return}
    show(location.hash==='#login'?'login':'signup');
  }
  window.addEventListener('hashchange',route);

  /* ---------- UI helpers ---------- */
  function note(id,text,isErr){
    var n=document.getElementById(id);
    n.textContent=text;
    n.className='note show'+(isErr?' err':'');
  }
  function clearNote(id){document.getElementById(id).className='note'}
  function setErr(form,key,msg){
    var box=form.querySelector('[data-f="'+key+'"]');
    box.setAttribute('data-bad',msg?'true':'false');
    box.querySelector('.msg').textContent=msg||'';
    return !msg;
  }
  function focusFirstBad(form){
    var b=form.querySelector('[data-bad="true"] input,[data-bad="true"] select');
    if(b){b.focus()}
  }
  var ID_RE=/^[A-Za-z]{2,5}\d{7}$/;

  /* ---------- sign up ---------- */
  var fs=document.getElementById('f-signup');
  var S={id:'s-id',name:'s-name',dept:'s-dept',sem:'s-sem',email:'s-email',pw:'s-pw',pw2:'s-pw2'};
  var keyMap={sid:'id',name:'name',dept:'dept',sem:'sem',email:'email',pw:'pw',pw2:'pw2'};
  function val(k){var v=document.getElementById(S[k]).value;return (k==='id'||k==='name'||k==='email')?v.trim():v}
  var sRules={
    id:function(v){return ID_RE.test(v)?'':'Enter a valid Student ID, like BCA2026001.'},
    name:function(v){return v.length>=3?'':'Enter your full name.'},
    dept:function(v){return v?'':'Select your department.'},
    sem:function(v){return v?'':'Select your semester.'},
    email:function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'':'Enter a valid email address.'},
    pw:function(v){return v.length>=8?'':'Password must be at least 8 characters.'},
    pw2:function(v){return v&&v===document.getElementById(S.pw).value?'':'Passwords do not match.'}
  };
  function sCheck(k){
    var fk=k==='id'?'sid':k;
    return setErr(fs,fk,sRules[k](val(k)));
  }
  Object.keys(S).forEach(function(k){
    var el=document.getElementById(S[k]);
    el.addEventListener('blur',function(){sCheck(k)});
    el.addEventListener('input',function(){
      clearNote('n-signup');
      if(k==='id'){el.value=el.value.toUpperCase()}
      var fk=k==='id'?'sid':k;
      if(fs.querySelector('[data-f="'+fk+'"]').getAttribute('data-bad')==='true'){sCheck(k)}
      if(k==='pw'&&val('pw2')){sCheck('pw2')}
    });
  });
  fs.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=true;
    Object.keys(S).forEach(function(k){if(!sCheck(k)){ok=false}});
    if(!ok){focusFirstBad(fs);return}
    var accounts=load();
    var id=val('id').toUpperCase();
    if(accounts[id]){
      setErr(fs,'sid','This Student ID is already registered. Log in instead.');
      focusFirstBad(fs);return;
    }
    var salt=newSalt();
    hash(val('pw'),salt).then(function(h){
      accounts[id]={name:val('name'),dept:val('dept'),sem:val('sem'),email:val('email'),salt:salt,hash:h};
      if(!save(accounts)){
        note('n-signup','Could not save the account. Your browser is blocking storage.',true);return;
      }
      fs.reset();
      Object.keys(S).forEach(function(k){setErr(fs,k==='id'?'sid':k,'')});
      location.hash='#login';
      note('n-login','Account created. Log in with your Student ID and password.',false);
    }).catch(function(){
      note('n-signup','Could not create the account in this browser.',true);
    });
  });

  /* ---------- login ---------- */
  var fl=document.getElementById('f-login');
  var lid=document.getElementById('l-id'),lpw=document.getElementById('l-pw');
  lid.addEventListener('input',function(){lid.value=lid.value.toUpperCase();clearNote('n-login')});
  lpw.addEventListener('input',function(){clearNote('n-login')});
  fl.addEventListener('submit',function(e){
    e.preventDefault();
    var id=lid.value.trim().toUpperCase(),pw=lpw.value;
    var a=setErr(fl,'sid',id?'':'Enter your Student ID.');
    var b=setErr(fl,'pw',pw?'':'Enter your password.');
    if(!a||!b){focusFirstBad(fl);return}
    var acc=load()[id];
    if(!acc){note('n-login','No account found for this Student ID. Sign up first.',true);return}
    hash(pw,acc.salt).then(function(h){
      if(h!==acc.hash){note('n-login','Wrong password. Try again.',true);return}
      session={id:id,name:acc.name,dept:acc.dept,sem:acc.sem,email:acc.email};
      renderWelcome();
      fl.reset();clearNote('n-login');
      route();
    }).catch(function(){note('n-login','Login failed in this browser.',true)});
  });

  /* ---------- welcome ---------- */
  function renderWelcome(){
    document.getElementById('w-title').textContent='Welcome, '+session.name;
  }
  document.getElementById('logout').addEventListener('click',function(){
    session=null;
    if(location.hash==='#login'){route()}else{location.hash='#login'}
  });

  /* ---------- show/hide password ---------- */
  document.querySelectorAll('[data-show]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var i=document.getElementById(btn.getAttribute('data-show'));
      var s=i.type==='password';
      i.type=s?'text':'password';
      btn.textContent=s?'Hide':'Show';
    });
  });

  route();
})();