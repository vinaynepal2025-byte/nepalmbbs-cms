// ============================================================
// WRC NEPAL STAFF TRACKER — app.js
// ============================================================
var GOOGLE_CLIENT_ID='190330738-1is7qojb509potnqgo3bs3758o5ppfuv.apps.googleusercontent.com';
var SU='https://tgsiltcuisgejmdkovxz.supabase.co';
var SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnc2lsdGN1aXNnZWptZGtvdnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjg1MTcsImV4cCI6MjA5NjY0NDUxN30.QfB5QQAnQR7-lFNHQwXmILZIdX96eJ6Q1hO-O2zt6gc';
var I2N=1.6,N2I=0.625;
var CU=null,DB=null;
var allV=[],allE=[],vSF='',eSF='all';
var rData=null,admCurData='visitors';
var noticesCache=[];
var visitMode='physical';

// ============================================================
// CONFIG DATA
// ============================================================
var NEPAL_COLLEGES=["WRC Nepal","Tribhuvan University Institute of Medicine (IOM)","Kathmandu University School of Medical Sciences (KUSMS)","B.P. Koirala Institute of Health Sciences (BPKIHS)","Patan Academy of Health Sciences (PAHS)","Kathmandu Medical College (KMC)","Nepal Medical College (NMC)","Kist Medical College","National Medical College","Chitwan Medical College","College of Medical Sciences (CMC) Bharatpur","Manipal College of Medical Sciences Pokhara","Gandaki Medical College Pokhara","Universal College of Medical Sciences Bhairahawa","Lumbini Medical College Palpa","Devdaha Medical College Rupandehi","Nepalgunj Medical College","National Academy of Medical Sciences (NAMS)","Birat Medical College Biratnagar","Nobel Medical College Biratnagar","Janaki Medical College Janakpur","Bharatpur Hospital Medical College","Karnali Academy of Health Sciences","Province Health Science Academy","Madhesh Institute of Health Sciences","Universal Medical College Nepal","Janamaitri Medical College"];

var INDIA_STATES={
"Andhra Pradesh":["Visakhapatnam","Vijayawada","Guntur","Tirupati"],
"Bihar":["Patna","Gaya","Muzaffarpur","Bhagalpur","Darbhanga","Purnia"],
"Delhi":["New Delhi","Delhi"],
"Gujarat":["Ahmedabad","Surat","Vadodara","Rajkot"],
"Haryana":["Gurugram","Faridabad","Panipat"],
"Karnataka":["Bengaluru","Mysuru","Hubli"],
"Kerala":["Kochi","Thiruvananthapuram","Kozhikode"],
"Madhya Pradesh":["Bhopal","Indore","Gwalior","Jabalpur"],
"Maharashtra":["Mumbai","Pune","Nagpur","Nashik"],
"Punjab":["Ludhiana","Amritsar","Jalandhar","Chandigarh"],
"Rajasthan":["Jaipur","Jodhpur","Udaipur","Kota"],
"Tamil Nadu":["Chennai","Coimbatore","Madurai"],
"Telangana":["Hyderabad","Warangal"],
"Uttar Pradesh":["Lucknow","Kanpur","Varanasi","Agra","Noida","Allahabad","Gorakhpur","Meerut","Ghaziabad"],
"Uttarakhand":["Dehradun","Haridwar"],
"West Bengal":["Kolkata","Howrah","Siliguri"],
"Assam":["Guwahati"],
"Odisha":["Bhubaneswar","Cuttack"],
"Jharkhand":["Ranchi","Jamshedpur"],
"Chhattisgarh":["Raipur","Bhilai"],
"Other State":["Other City"]
};

var SL={
  'MBBS 2024':['Student 1','Student 2','Student 3','Student 4','Student 5','Student 6','Student 7','Student 8']
};
function genBatchYears(){
  var years=[];
  var cy=new Date().getFullYear();
  for(var y=cy;y>=2010;y--){years.push('MBBS '+y);}
  return years;
}

// ============================================================
// INDEXEDDB
// ============================================================
function initDB(){
  return new Promise(function(res,rej){
    var r=indexedDB.open('WRC_v1',2);
    r.onupgradeneeded=function(e){
      var db=e.target.result;
      ['visitors','expenses','attendance','notices_sent','batches','leads','lead_activity','lead_reports'].forEach(function(s){
        if(!db.objectStoreNames.contains(s)){
          db.createObjectStore(s,{keyPath:'id',autoIncrement:true});
        }
      });
    };
    r.onsuccess=function(e){DB=e.target.result;res();};
    r.onerror=rej;
  });
}
function dbAll(store){
  return new Promise(function(res,rej){
    var tx=DB.transaction(store,'readonly');
    tx.objectStore(store).getAll().onsuccess=function(e){res(e.target.result);};
    tx.onerror=rej;
  });
}
function dbAdd(store,data){
  return new Promise(function(res,rej){
    var d=Object.assign({},data,{ts:Date.now()});
    var tx=DB.transaction(store,'readwrite');
    tx.objectStore(store).add(d).onsuccess=function(e){res(e.target.result);};
    tx.onerror=rej;
  });
}
function dbPut(store,data){
  return new Promise(function(res,rej){
    var tx=DB.transaction(store,'readwrite');
    tx.objectStore(store).put(data).onsuccess=function(e){res(e.target.result);};
    tx.onerror=rej;
  });
}
function dbDel(store,id){
  return new Promise(function(res,rej){
    var tx=DB.transaction(store,'readwrite');
    tx.objectStore(store).delete(id).onsuccess=res;
    tx.onerror=rej;
  });
}

// ============================================================
// CLOUD (Supabase)
// ============================================================
function cGet(table,extra){
  extra=extra||'';
  return fetch(SU+'/rest/v1/'+table+'?order=created_at.desc'+extra,{
    headers:{'apikey':SK,'Authorization':'Bearer '+SK}
  }).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
}
function cPost(table,data){
  return fetch(SU+'/rest/v1/'+table,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=minimal'},
    body:JSON.stringify(data)
  }).catch(function(){});
}
function cPatch(table,match,data){
  var qs=Object.keys(match).map(function(k){return k+'=eq.'+encodeURIComponent(match[k]);}).join('&');
  return fetch(SU+'/rest/v1/'+table+'?'+qs,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=minimal'},
    body:JSON.stringify(data)
  }).catch(function(){});
}
function cDelete(table,extId,extra){
  var qs='or=(external_id.eq.'+encodeURIComponent(extId)+',id.eq.'+encodeURIComponent(extId)+')';
  if(extra){Object.keys(extra).forEach(function(k){qs+='&'+k+'=eq.'+encodeURIComponent(extra[k]);});}
  return fetch(SU+'/rest/v1/'+table+'?'+qs,{
    method:'DELETE',
    headers:{'apikey':SK,'Authorization':'Bearer '+SK}
  }).catch(function(){});
}
function recSignature(r){
  var copy={};
  Object.keys(r||{}).sort().forEach(function(k){
    if(k==='id'||k==='external_id'||k==='created_at'||k==='ts')return;
    copy[k]=r[k];
  });
  return JSON.stringify(copy);
}
// Merges local (IndexedDB) + cloud (Supabase) records without duplicating,
// and without letting cloud "resurrect" records that were deleted locally.
function mergeCloudLocal(local,cloud){
  var map={},order=[];
  (local||[]).forEach(function(r){
    var key=(r.external_id!=null)?('e'+r.external_id):('s'+recSignature(r));
    if(!(key in map))order.push(key);
    map[key]=r;
  });
  (cloud||[]).forEach(function(r){
    var key=(r.external_id!=null)?('e'+r.external_id):('s'+recSignature(r));
    if(!(key in map)){order.push(key);map[key]=r;}
  });
  return order.map(function(k){return map[k];});
}

// ============================================================
// TOAST / MODAL
// ============================================================
function toast(m,err){
  var t=document.getElementById('toast');
  t.textContent=m;
  t.style.background=err?'rgba(200,50,50,0.95)':'rgba(28,22,58,0.97)';
  t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},3000);
}
function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}

// ============================================================
// LOGIN
// ============================================================
var lm='email';
function populateLoginDropdowns(){
  var orgSel=document.getElementById('lOrg');
  var html='';
  for(var i=0;i<NEPAL_COLLEGES.length;i++){
    html+='<option value="'+NEPAL_COLLEGES[i]+'">'+NEPAL_COLLEGES[i]+'</option>';
  }
  html+='<option value="__custom__">+ Type Custom Organization</option>';
  orgSel.innerHTML=html;
}
function setLT(m){
  lm=m;
  document.getElementById('ltab-email').classList.toggle('active',m==='email');
  document.getElementById('ltab-phone').classList.toggle('active',m==='phone');
  document.getElementById('lef').style.display=m==='email'?'block':'none';
  document.getElementById('lpf').style.display=m==='phone'?'block':'none';
}
function onRoleChange(){
  var r=document.getElementById('lRole').value;
  document.getElementById('lAdminPin').style.display=r==='admin'?'block':'none';
  document.getElementById('bootstrapInfo').style.display='none';
  if(r==='admin'){checkIfNoAdminsExist();}
}
function checkIfNoAdminsExist(){
  fetch(SU+'/rest/v1/admin_users?select=id&limit=1',{
    headers:{'apikey':SK,'Authorization':'Bearer '+SK}
  }).then(function(r){return r.ok?r.json():null;}).then(function(data){
    if(data && data.length===0){
      document.getElementById('bootstrapInfo').style.display='block';
    }
  }).catch(function(){});
}
function showBootstrapInfo(){
  document.getElementById('bootstrapInfo').style.display='block';
}
function onOrgChange(){
  var v=document.getElementById('lOrg').value;
  document.getElementById('lCustomOrg').style.display=v==='__custom__'?'block':'none';
}
function handleLogin(){
  var name=document.getElementById('lName').value.trim();
  var email=document.getElementById('lEmail').value.trim();
  var phone=document.getElementById('lPhone').value.trim();
  var role=document.getElementById('lRole').value;
  var orgEl=document.getElementById('lOrg');
  var org=orgEl?orgEl.value:'WRC Nepal';
  var customEl=document.getElementById('lCustomOrgInput');
  if(org==='__custom__' && customEl){org=customEl.value.trim();}
  if(!name){toast('Please enter your name',true);return;}
  if(lm==='email' && !email){toast('Please enter your email',true);return;}
  if(lm==='phone' && !phone){toast('Please enter your phone',true);return;}
  if(!org || org==='__custom__'){toast('Please select organization',true);return;}
  if(role==='admin'){
    var pinEl=document.getElementById('lPinInput');
    var pwd=pinEl?pinEl.value.trim():'';
    if(!pwd){toast('Admin password required',true);return;}
    doAdminLogin(name,email,phone,role,org,pwd);
    return;
  }
  doFinalLogin(name,email,phone,role,org);
}
function doAdminLogin(name,email,phone,role,org,pwd){
  var btn=document.getElementById('loginBtn');
  if(btn){btn.textContent='🔐 Verifying...';btn.disabled=true;}
  verifyAdmin(email||phone,pwd).then(function(ok){
    if(btn){btn.textContent='🚀 Enter App';btn.disabled=false;}
    if(!ok){toast('Invalid admin credentials',true);return;}
    doFinalLogin(name,email,phone,role,org);
  }).catch(function(){
    if(btn){btn.textContent='🚀 Enter App';btn.disabled=false;}
    toast('Verification failed',true);
  });
}
function doFinalLogin(name,email,phone,role,org){
  var orgKey=org.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
  var id=lm==='email'?email:phone;
  CU={name:name,email:email,phone:phone,org:org,orgKey:orgKey,role:role,id:id,loginTime:Date.now()};
  localStorage.setItem('wrc_u',JSON.stringify(CU));
  startApp();
}
function checkAuth(){
  var s=localStorage.getItem('wrc_u');
  if(s){
    try{
      var u=JSON.parse(s);
      if(u.loginTime && Date.now()-u.loginTime > 30*24*60*60*1000){
        localStorage.removeItem('wrc_u');return;
      }
      CU=u;startApp();
    }catch(e){localStorage.removeItem('wrc_u');}
  }
}
function startApp(){
  document.getElementById('LS').style.display='none';
  document.getElementById('MA').style.display='flex';
  initUI();
  loadDash();
  loadV();loadE();loadLeads();loadAttHist();
  if(CU && CU.role==='admin'){
    document.getElementById('adminNavBtn').style.display='flex';
  }
  if('Notification' in window && Notification.permission==='default'){
    setTimeout(function(){Notification.requestPermission();},3000);
  }
  setTimeout(loadNotifBadge,2000);
}
function doLogout(){
  if(!confirm('Logout?'))return;
  localStorage.removeItem('wrc_u');
  location.reload();
}

// ============================================================
// UI INIT
// ============================================================
function populateModalDropdowns(){
  // College dropdown in Add Visit modal
  var ciSel=document.getElementById('vciSel');
  var html='';
  for(var i=0;i<NEPAL_COLLEGES.length;i++){
    html+='<option value="'+NEPAL_COLLEGES[i]+'">'+NEPAL_COLLEGES[i]+'</option>';
  }
  html+='<option value="__custom__">+ Type Custom College</option>';
  ciSel.innerHTML=html;

  // State dropdown
  var stateSel=document.getElementById('vstateSel');
  var sHtml='';
  var states=Object.keys(INDIA_STATES);
  for(var j=0;j<states.length;j++){
    sHtml+='<option value="'+states[j]+'">'+states[j]+'</option>';
  }
  stateSel.innerHTML=sHtml;
  onStateChange();

  // Batch year dropdown
  var batchSel=document.getElementById('abatch');
  var years=genBatchYears();
  var bHtml='';
  for(var k=0;k<years.length;k++){
    bHtml+='<option value="'+years[k]+'">'+years[k]+'</option>';
  }
  bHtml+='<option value="__custom__">+ Custom Batch Name</option>';
  batchSel.innerHTML=bHtml;
}
function onStateChange(){
  var state=document.getElementById('vstateSel').value;
  var citySel=document.getElementById('vcitySel');
  var cities=INDIA_STATES[state]||['Other City'];
  var html='';
  for(var i=0;i<cities.length;i++){
    html+='<option value="'+cities[i]+'">'+cities[i]+'</option>';
  }
  html+='<option value="__custom__">+ Type Custom City</option>';
  citySel.innerHTML=html;
  document.getElementById('vcityCustomWrap').style.display='none';
}
function onCityChange(){
  var v=document.getElementById('vcitySel').value;
  document.getElementById('vcityCustomWrap').style.display=v==='__custom__'?'block':'none';
}
function onCollegeChange(){
  var v=document.getElementById('vciSel').value;
  document.getElementById('vciCustomWrap').style.display=v==='__custom__'?'block':'none';
}
function onBatchChange(){
  var v=document.getElementById('abatch').value;
  document.getElementById('abatchCustomWrap').style.display=v==='__custom__'?'block':'none';
}
function setVisitMode(mode){
  visitMode=mode;
  document.getElementById('vmode-physical').classList.toggle('active',mode==='physical');
  document.getElementById('vmode-virtual').classList.toggle('active',mode==='virtual');
  document.getElementById('physicalFields').style.display=mode==='physical'?'block':'none';
  document.getElementById('virtualFields').style.display=mode==='virtual'?'block':'none';
}
function openAddVisit(){
  openM('mav');
}

function initUI(){
  var now=new Date();
  var h=now.getHours();
  var g=h<12?'Good Morning ☀️':h<17?'Good Afternoon 🌤️':'Good Evening 🌙';
  document.getElementById('dgreet').textContent=g;
  document.getElementById('dname').textContent=CU.name+' · '+(CU.org||'WRC Nepal');
  document.getElementById('hOrg').textContent=CU.org||'WRC Nepal';
  var av=document.getElementById('uav');
  if(av){av.textContent=CU.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();}
  document.getElementById('sn').value=CU.name||'';
  document.getElementById('se').value=CU.email||'';
  document.getElementById('sp').value=CU.phone||'';
  document.getElementById('sc').value=CU.org||'';
  document.getElementById('appurl').textContent=window.location.href;
  var td=new Date().toISOString().slice(0,10);
  ['vvd','edf','edt','adate'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value=td;
  });
  var ak=localStorage.getItem('wrc_ai_key');
  if(ak){var el2=document.getElementById('aiK');if(el2)el2.value=ak;}
  populateModalDropdowns();
  setupPWA();
}

// ============================================================
// NAVIGATION
// ============================================================
function showSec(name,navEl){
  document.querySelectorAll('.sec').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.nbtn').forEach(function(n){n.classList.remove('active');});
  var sec=document.getElementById('sec-'+name);
  if(sec)sec.classList.add('active');
  if(navEl)navEl.classList.add('active');
  document.getElementById('MC').scrollTop=0;
  if(name==='dashboard')loadDash();
  if(name==='visitors')loadV();
  if(name==='leads')loadLeads();
  if(name==='expenses')loadE();
  if(name==='reports')loadRep('v');
  if(name==='notices')loadNotices();
  if(name==='admin')loadAdminOverview();
  if(name==='attendance')loadAttHist();
}

// ============================================================
// DASHBOARD
// ============================================================
function loadDash(){
  Promise.all([dbAll('visitors'),dbAll('expenses'),dbAll('attendance')]).then(function(results){
    var v=results[0],e=results[1],a=results[2];
    document.getElementById('sv1').textContent=v.length;
    document.getElementById('sv2').textContent=a.length;
    var m=new Date().toISOString().slice(0,7);
    var me=e.filter(function(x){return (x.df||'').slice(0,7)===m;});
    var ti=me.reduce(function(s,x){return s+(x.cur==='INR'?+x.amt:+x.amt*N2I);},0);
    document.getElementById('sv3').textContent='₹'+Math.round(ti).toLocaleString('en-IN');
    var fu=v.filter(function(x){return x.fd && new Date(x.fd)<=new Date();});
    document.getElementById('sv4').textContent=fu.length;
    document.getElementById('dr').innerHTML=renderVList(v.slice(-5).reverse())||'<div class="empty"><div class="emico">👥</div><div class="emtxt">Add your first visitor!</div></div>';
    document.getElementById('dfu').innerHTML=fu.length?renderVList(fu):'<div class="empty"><div class="emico">✅</div><div class="emtxt">No pending follow-ups</div></div>';
  });
}

// ============================================================
// VISITORS
// ============================================================
var CLR=['#ff8fa3','#06d6a0','#b39dff','#ff9a5c','#4fc3f7','#ffd166'];
var SM={'New':'bdg-pu','Interested':'bdg-tl','Hot lead':'bdg-or','Admitted':'bdg-tl','Not interested':'bdg-rd','Follow-up':'bdg-yl'};
function renderVList(list){
  if(!list||!list.length)return '';
  return list.map(function(v,i){
    var c=CLR[i%CLR.length];
    var ini=v.n.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
    var tags='';
    if(v.vt)tags+='<span class="bdg bdg-pu" style="font-size:10px;">'+v.vt+'</span>';
    if(v.ci)tags+='<span class="bdg bdg-tl" style="font-size:10px;">🏫 '+v.ci+'</span>';
    if(v.mode==='virtual')tags+='<span class="bdg bdg-yl" style="font-size:10px;">🎥 Virtual</span>';
    var badge=v.st2?'<span class="bdg '+(SM[v.st2]||'bdg-pu')+'" style="font-size:10px;">'+v.st2+'</span>':'';
    var dt=v.vd?new Date(v.vd).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'';
    var loc=v.mode==='virtual'?(v.vvCity||'')+' '+(v.vvState||''):(v.cy||'')+' '+(v.st||'');
    return '<div class="li" onclick="showVD('+v.id+')">'
      +'<div class="liav" style="background:'+c+'22;color:'+c+'">'+ini+'</div>'
      +'<div class="libody"><div class="liname">'+v.n+'</div>'
      +'<div class="limeta">'+loc+' '+(v.rn?'· '+v.rn:'')+'</div>'
      +'<div class="litags">'+tags+'</div></div>'
      +'<div class="lirght"><div class="lidate">'+dt+'</div>'+badge+'</div></div>';
  }).join('');
}
function loadV(){
  dbAll('visitors').then(function(v){
    cGet('visitors').then(function(cv){
      allV=mergeCloudLocal(v,cv);
      renderV();
    });
  });
}
function renderV(){
  var list=allV.slice().reverse();
  var q=document.getElementById('vsrch')?document.getElementById('vsrch').value.toLowerCase():'';
  if(q)list=list.filter(function(v){return JSON.stringify(v).toLowerCase().indexOf(q)>-1;});
  if(vSF)list=list.filter(function(v){return v.st2===vSF;});
  var el=document.getElementById('vlist');
  el.innerHTML=renderVList(list)||'<div class="empty"><div class="emico">👥</div><div class="emtxt">No visitors found</div></div>';
}
function setVF(s,el){
  vSF=s;
  document.querySelectorAll('#sec-visitors .stab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  renderV();
}
function getSelectedChecks(ids){
  var out=[];
  ids.forEach(function(id){
    var el=document.getElementById(id);
    if(el&&el.checked)out.push(el.value);
  });
  return out;
}
function saveV(){
  var n=document.getElementById('vn').value.trim();
  if(!n){toast('Please enter visitor name',true);return;}

  var vTypes=getSelectedChecks(['vt1','vt2','vt3','vt4','vt5','vt6','vt7','vt8','vt9','vt10']);
  var docs=getSelectedChecks(['dc1','dc2','dc3','dc4','dc5','dc6','dc7']);
  var nvEl=document.querySelector('input[name="nv"]:checked');

  var college=document.getElementById('vciSel').value;
  if(college==='__custom__'){
    var ciCustom=document.getElementById('vciCustom');
    college=ciCustom?ciCustom.value.trim():'';
  }

  var data={
    n:n,
    mode:visitMode,
    vt:document.getElementById('vvt').value,
    ph:document.getElementById('vph').value,
    em:document.getElementById('vem').value,
    ci:college,
    vd:document.getElementById('vvd').value,
    nv:nvEl?nvEl.value:'',
    vis:vTypes,
    rt:document.getElementById('vrt').value,
    rn:document.getElementById('vrn').value,
    ns:document.getElementById('vns').value,
    ap:document.getElementById('vap').value,
    doc:docs,
    mq:document.getElementById('vmq').value,
    st2:document.getElementById('vst2').value,
    fd:document.getElementById('vfd').value,
    nt:document.getElementById('vnt').value,
    user_org:CU.orgKey,
    user_name:CU.name
  };

  if(visitMode==='physical'){
    var city=document.getElementById('vcitySel').value;
    if(city==='__custom__'){
      var cityCustom=document.getElementById('vcityCustom');
      city=cityCustom?cityCustom.value.trim():'';
    }
    data.cy=city;
    data.st=document.getElementById('vstateSel').value;
  } else {
    var platEl=document.querySelector('input[name="vplatform"]:checked');
    data.platform=platEl?platEl.value:'';
    data.vvCity=document.getElementById('vvCity').value;
    data.vvState=document.getElementById('vvState').value;
    data.vvDuration=document.getElementById('vvDuration').value;
    var mlEl=document.getElementById('vMeetLink');
    data.meetLink=mlEl?mlEl.value:'';
  }

  dbAdd('visitors',data).then(function(id){
    data.id=id;data.external_id=id;
    dbPut('visitors',data).then(function(){
      cPost('visitors',data);
      closeM('mav');
      clearVForm();
      toast('✅ Visit saved!');
      loadV();loadDash();
    });
  });
}
function clearVForm(){
  ['vn','vph','vem','vmq','vrn','vns','vnt','vfd','vcityCustom','vciCustom','vvCity','vvState','vvDuration','vMeetLink'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  document.querySelectorAll('#mav .chi').forEach(function(c){c.checked=false;});
  setVisitMode('physical');
}
function showVD(id){
  dbAll('visitors').then(function(vs){
    var v=vs.find(function(x){return x.id===id;});
    if(!v)return;
    document.getElementById('vdtitle').innerHTML=v.n+' <button class="cbtn" onclick="closeM(\'mvd\')">✕</button>';
    var sm=SM[v.st2]||'bdg-pu';
    var ph=v.ph?v.ph.replace(/\D/g,''):'';
    var locRow=v.mode==='virtual'
      ? '<div class="rr"><span class="rk">📍 Caller Location</span><span class="rv">'+(v.vvCity||'')+' '+(v.vvState||'')+'</span></div>'
        +'<div class="rr"><span class="rk">🎥 Platform</span><span class="rv">'+(v.platform||'—')+'</span></div>'
        +'<div class="rr"><span class="rk">⏱️ Duration</span><span class="rv">'+(v.vvDuration||'—')+' min</span></div>'
      : '<div class="rr"><span class="rk">📍 Location</span><span class="rv">'+(v.cy||'')+' '+(v.st||'')+'</span></div>';
    var body='<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;">'
      +'<span class="bdg '+sm+'">'+(v.st2||'New')+'</span>'
      +'<span class="bdg bdg-yl">'+(v.mode==='virtual'?'🎥 Virtual':'🏫 Physical')+'</span>'
      +(v.vt?'<span class="bdg bdg-pu">'+v.vt+'</span>':'')
      +(v.nv?'<span class="bdg bdg-tl">'+v.nv+'</span>':'')
      +'</div>'
      +'<div class="rc">'
      +'<div class="rr"><span class="rk">📞 Contact</span><span class="rv">'+(v.ph||'—')+'</span></div>'
      +'<div class="rr"><span class="rk">📧 Email</span><span class="rv">'+(v.em||'—')+'</span></div>'
      +locRow
      +'<div class="rr"><span class="rk">🏫 College Interest</span><span class="rv">'+(v.ci||'—')+'</span></div>'
      +'<div class="rr"><span class="rk">📅 Visit Date</span><span class="rv">'+(v.vd||'—')+'</span></div>'
      +'<div class="rr"><span class="rk">🎯 Visit Types</span><span class="rv" style="max-width:55%;text-align:right;font-size:11px;">'+((v.vis||[]).join(', ')||'—')+'</span></div>'
      +'<div class="rr"><span class="rk">🔗 Reference</span><span class="rv">'+(v.rt||'')+' '+(v.rn?'— '+v.rn:'')+'</span></div>'
      +'<div class="rr"><span class="rk">🎯 NEET</span><span class="rv">'+(v.ns||'—')+'</span></div>'
      +'<div class="rr"><span class="rk">📋 Plan</span><span class="rv">'+(v.ap||'—')+'</span></div>'
      +'<div class="rr"><span class="rk">📄 Docs</span><span class="rv">'+((v.doc||[]).join(', ')||'None')+'</span></div>'
      +'<div class="rr"><span class="rk">💬 Queries</span><span class="rv" style="max-width:55%;text-align:right;font-size:11px;">'+(v.mq||'—')+'</span></div>'
      +(v.fd?'<div class="rr"><span class="rk">⏰ Follow-up</span><span class="rv" style="color:var(--yl);">'+v.fd+'</span></div>':'')
      +'</div>'
      +'<div class="brow">'
      +(ph?'<a href="https://wa.me/'+ph+'" target="_blank" class="gbtn gbtn-tl gbtn-sm">💬 WhatsApp</a>':'')
      +(ph?'<a href="tel:'+v.ph+'" class="gbtn gbtn-bl gbtn-sm">📞 Call</a>':'')
      +'<button class="gbtn gbtn-gl gbtn-sm" onclick="shrV('+id+')">📤 Share</button>'
      +'<button class="gbtn gbtn-gl gbtn-sm" style="color:var(--rd);" onclick="delV('+id+')">🗑️ Delete</button>'
      +'</div>';
    document.getElementById('vdbody').innerHTML=body;
    openM('mvd');
  });
}
function delV(id){
  if(!confirm('Delete this record?'))return;
  dbDel('visitors',id).then(function(){
    allV=allV.filter(function(x){return x.id!==id;});
    cDelete('visitors',id,{user_org:CU.orgKey});
    closeM('mvd');renderV();loadDash();
    toast('Deleted');
  });
}

// WhatsApp report builder for ONE visitor - matches the form fields exactly
function buildVisitorReportText(v){
  var lines=[];
  lines.push('*WRC NEPAL — VISITOR REPORT*');
  lines.push('================================');
  lines.push('');
  lines.push('*Name:* '+v.n);
  lines.push('*Visitor Type:* '+(v.vt||'-'));
  lines.push('*Visit Mode:* '+(v.mode==='virtual'?'Virtual':'Physical'));
  lines.push('*Contact:* '+(v.ph||'-'));
  lines.push('*Email:* '+(v.em||'-'));
  lines.push('');
  if(v.mode==='virtual'){
    lines.push('*--- Virtual Visit Details ---*');
    lines.push('*Platform:* '+(v.platform||'-'));
    lines.push('*Caller Location:* '+(v.vvCity||'-')+', '+(v.vvState||'-'));
    lines.push('*Call Duration:* '+(v.vvDuration||'-')+' min');
  } else {
    lines.push('*--- Physical Visit Details ---*');
    lines.push('*City:* '+(v.cy||'-'));
    lines.push('*State:* '+(v.st||'-'));
  }
  lines.push('');
  lines.push('*College Interest:* '+(v.ci||'-'));
  lines.push('*Visit Date:* '+(v.vd||'-'));
  lines.push('*Nepal Visit:* '+(v.nv||'-'));
  lines.push('*Visit Types:* '+((v.vis||[]).join(', ')||'-'));
  lines.push('');
  lines.push('*Reference Type:* '+(v.rt||'-'));
  lines.push('*Reference Name:* '+(v.rn||'-'));
  lines.push('*NEET Score:* '+(v.ns||'-'));
  lines.push('*Admission Plan:* '+(v.ap||'-'));
  lines.push('');
  lines.push('*Documents Submitted:* '+((v.doc||[]).join(', ')||'None'));
  lines.push('');
  lines.push('*Major Queries:*');
  lines.push(v.mq||'-');
  lines.push('');
  lines.push('*Status:* '+(v.st2||'New'));
  if(v.fd)lines.push('*Follow-up Date:* '+v.fd);
  if(v.nt)lines.push('*Notes:* '+v.nt);
  lines.push('');
  lines.push('================================');
  lines.push('Recorded by: '+(v.user_name||CU.name));
  lines.push('Organization: '+(v.user_org||CU.org));
  return lines.join('\n');
}
function shrV(id){
  dbAll('visitors').then(function(vs){
    var v=vs.find(function(x){return x.id===id;});
    if(!v)return;
    var t=buildVisitorReportText(v);
    if(navigator.share)navigator.share({title:'Visitor Report - '+v.n,text:t});
    else{navigator.clipboard.writeText(t).then(function(){toast('Copied!');});}
  });
}

// ============================================================
// EXPENSES
// ============================================================
function expSub(){
  var cat=document.getElementById('ecat').value;
  ['Travel','Food','Hotel','Media','Other'].forEach(function(c){
    var el=document.getElementById('sub-'+c);
    if(el)el.style.display=c===cat?'block':'none';
  });
}
function updateCvt(){
  var a=parseFloat(document.getElementById('eamt').value)||0;
  var c=document.getElementById('ecur').value;
  var box=document.getElementById('cvbox');
  if(!box)return;
  if(a>0){
    box.style.display='block';
    if(c==='INR'){
      document.getElementById('cvf').textContent='₹'+a.toLocaleString('en-IN')+' INR';
      document.getElementById('cvt2').textContent='रू'+Math.round(a*I2N).toLocaleString()+' NPR';
    } else {
      document.getElementById('cvf').textContent='रू'+a.toLocaleString()+' NPR';
      document.getElementById('cvt2').textContent='₹'+Math.round(a*N2I).toLocaleString('en-IN')+' INR';
    }
  } else {box.style.display='none';}
}
function handleR(e){
  var f=e.target.files[0];
  if(!f)return;
  document.getElementById('rtxt').textContent='✅ '+f.name;
  var reader=new FileReader();
  reader.onload=function(ev){rData=ev.target.result;};
  reader.readAsDataURL(f);
}
function saveE(){
  var amt=parseFloat(document.getElementById('eamt').value)||0;
  if(!amt){toast('Please enter amount',true);return;}
  var cat=document.getElementById('ecat').value;
  if(!cat){toast('Please select category',true);return;}
  var meals=getSelectedChecks(['f1','f2','f3','f4','f5']);
  var mdt=getSelectedChecks(['m1','m2','m3','m4','m5']);
  var pmEl=document.querySelector('input[name="pm"]:checked');
  var pm=pmEl?pmEl.value:'';
  var data={
    cat:cat,
    df:document.getElementById('edf').value,
    dt:document.getElementById('edt').value,
    amt:amt,
    cur:document.getElementById('ecur').value,
    pm:pm,
    pur:document.getElementById('epur').value,
    rv:document.getElementById('erv').value,
    tm:document.getElementById('etm')?document.getElementById('etm').value:'',
    fl:document.getElementById('efl')?document.getElementById('efl').value:'',
    tl:document.getElementById('etl')?document.getElementById('etl').value:'',
    mt:meals,
    fp:document.getElementById('efp')?document.getElementById('efp').value:'',
    hn:document.getElementById('ehn')?document.getElementById('ehn').value:'',
    eci:document.getElementById('eci')?document.getElementById('eci').value:'',
    eco:document.getElementById('eco')?document.getElementById('eco').value:'',
    ermt:document.getElementById('ermt')?document.getElementById('ermt').value:'',
    ents:document.getElementById('ents')?document.getElementById('ents').value:'',
    mdt:mdt,
    oth:document.getElementById('eoth')?document.getElementById('eoth').value:'',
    rcpt:rData,
    user_org:CU.orgKey,
    user_name:CU.name
  };
  rData=null;
  dbAdd('expenses',data).then(function(id){
    data.id=id;data.external_id=id;
    dbPut('expenses',data).then(function(){
      cPost('expenses',data);
      closeM('mae');
      clearEForm();
      toast('✅ Expense saved!');
      loadE();
    });
  });
}
function clearEForm(){
  ['eamt','epur','erv','efl','etl','efp','ehn','eoth'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  document.querySelectorAll('#mae .chi').forEach(function(c){c.checked=false;});
  document.getElementById('cvbox').style.display='none';
  document.getElementById('rtxt').textContent='Tap to upload receipt';
  document.getElementById('ecat').value='';
  ['Travel','Food','Hotel','Media','Other'].forEach(function(c){
    var el=document.getElementById('sub-'+c);if(el)el.style.display='none';
  });
}
function setEF(f,el){
  eSF=f;
  document.querySelectorAll('#sec-expenses .stab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  renderE();
}
function loadE(){
  dbAll('expenses').then(function(e){
    cGet('expenses').then(function(ce){
      allE=mergeCloudLocal(e,ce);
      var ti=allE.reduce(function(s,x){return s+(x.cur==='INR'?+x.amt:+x.amt*N2I);},0);
      var tn=allE.reduce(function(s,x){return s+(x.cur==='NPR'?+x.amt:+x.amt*I2N);},0);
      document.getElementById('etinr').textContent='₹'+Math.round(ti).toLocaleString('en-IN');
      document.getElementById('etnpr').textContent='रू'+Math.round(tn).toLocaleString();
      renderE();
    });
  });
}
function renderE(){
  var list=allE.slice().reverse();
  if(eSF!=='all')list=list.filter(function(e){return e.cat===eSF;});
  var qEl=document.getElementById('esrch');
  var q=qEl?qEl.value.toLowerCase():'';
  if(q)list=list.filter(function(e){return JSON.stringify(e).toLowerCase().indexOf(q)>-1;});
  var el=document.getElementById('elist');
  if(!list.length){el.innerHTML='<div class="empty"><div class="emico">🧾</div><div class="emtxt">No expenses found</div></div>';return;}
  var icons={Travel:'🚗',Food:'🍽️',Hotel:'🏨',Media:'📰',Other:'📦'};
  var cols={Travel:'#ff9a5c',Food:'#06d6a0',Hotel:'#b39dff',Media:'#4fc3f7',Other:'#ffd166'};
  el.innerHTML=list.map(function(x){
    var ico=icons[x.cat]||'📦';
    var col=cols[x.cat]||'#ffd166';
    var sub=x.tm||(x.mt||[]).join(', ')||x.hn||(x.mdt||[]).join(', ')||x.oth||x.pur||'';
    var ainr=x.cur==='INR'?x.amt:Math.round(+x.amt*N2I);
    var anpr=x.cur==='NPR'?x.amt:Math.round(+x.amt*I2N);
    return '<div class="li" style="cursor:default;">'
      +'<div class="liav" style="background:'+col+'22;color:'+col+';font-size:20px;">'+ico+'</div>'
      +'<div class="libody">'
      +'<div class="liname">'+x.cat+(sub?' — '+sub:'')+'</div>'
      +'<div class="limeta">'+(x.df||'')+' '+(x.pm?'· '+x.pm:'')+'</div>'
      +'</div>'
      +'<div class="lirght" style="align-items:flex-end;gap:4px;">'
      +'<div style="font-size:15px;font-weight:700;color:'+col+';">'+(x.cur==='INR'?'₹':'रू')+parseFloat(x.amt).toLocaleString()+'</div>'
      +'<div style="font-size:10px;color:var(--t3);">'+(x.cur==='INR'?'रू'+anpr+' NPR':'₹'+ainr+' INR')+'</div>'
      +'<button class="gbtn gbtn-gl gbtn-sm" style="padding:3px 8px;font-size:10px;color:var(--rd);" onclick="delE('+x.id+')">🗑️</button>'
      +'</div></div>';
  }).join('');
}
function delE(id){
  if(!confirm('Delete this expense?'))return;
  dbDel('expenses',id).then(function(){
    allE=allE.filter(function(x){return x.id!==id;});
    cDelete('expenses',id,{user_org:CU.orgKey});
    renderE();loadDash();
    toast('Deleted');
  });
}

// ============================================================
// ATTENDANCE (with Excel upload)
// ============================================================
var currentStudentList=[];
function loadAtt(){
  var b=document.getElementById('abatch').value;
  if(b==='__custom__'){
    var cb=document.getElementById('abatchCustom');
    b=cb?cb.value.trim():'';
    if(!b){toast('Please enter custom batch name',true);return;}
  }
  var students=SL[b]||currentStudentList.slice();
  if(!students.length){
    toast('No student list. Upload Excel or use default batch.',true);
    students=SL['MBBS 2024'];
  }
  renderAttTable(students);
}
function renderAttTable(students){
  document.getElementById('atbody').innerHTML=students.map(function(name,i){
    return '<tr>'
      +'<td style="color:var(--t3);">'+(i+1)+'</td>'
      +'<td style="font-weight:500;font-size:12px;">'+name+'</td>'
      +'<td><div style="display:flex;gap:5px;">'
      +'<input type="radio" class="ar pr" name="a'+i+'" id="p'+i+'" value="P"><label class="arl" for="p'+i+'">✅</label>'
      +'<input type="radio" class="ar ab" name="a'+i+'" id="a'+i+'" value="A"><label class="arl" for="a'+i+'">❌</label>'
      +'</div></td>'
      +'<td><input class="gi" style="padding:5px 8px;font-size:11px;" placeholder="Reason..." id="r'+i+'"></td>'
      +'</tr>';
  }).join('');
  currentStudentList=students;
  document.getElementById('attc').style.display='block';
}
function handleExcelUpload(e){
  var f=e.target.files[0];
  if(!f)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var data=new Uint8Array(ev.target.result);
      var wb=XLSX.read(data,{type:'array'});
      var sheetName=wb.SheetNames[0];
      var sheet=wb.Sheets[sheetName];
      var rows=XLSX.utils.sheet_to_json(sheet,{header:1});
      var names=[];
      for(var i=0;i<rows.length;i++){
        var row=rows[i];
        if(!row||!row.length)continue;
        var val=row[0];
        if(typeof val==='string'){
          var low=val.toLowerCase().trim();
          if(low==='name'||low==='student name'||low==='s.no'||low==='sno'||low==='')continue;
        }
        if(val&&String(val).trim()){
          names.push(String(val).trim());
        }
      }
      if(!names.length){toast('No names found in Excel file',true);return;}
      renderAttTable(names);
      toast('✅ Loaded '+names.length+' students from Excel');
    }catch(err){
      toast('Could not read Excel file',true);
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(f);
}
function markAllP(){
  currentStudentList.forEach(function(_,i){
    var el=document.getElementById('p'+i);
    if(el)el.checked=true;
  });
}
function getCurrentBatchName(){
  var b=document.getElementById('abatch').value;
  if(b==='__custom__'){
    var cb=document.getElementById('abatchCustom');
    return cb?cb.value.trim():'';
  }
  return b;
}
function saveAtt(){
  var b=getCurrentBatchName();
  var d=document.getElementById('adate').value;
  var sub=document.getElementById('asubj').value;
  var s=currentStudentList;
  if(!s.length){toast('Load students first',true);return;}
  var recs=s.map(function(name,i){
    var stEl=document.querySelector('input[name="a'+i+'"]:checked');
    return {n:name,st:stEl?stEl.value:'—',reason:document.getElementById('r'+i)?document.getElementById('r'+i).value:''};
  });
  var rec={b:b,d:d,sub:sub,recs:recs,user_org:CU.orgKey,user_name:CU.name};
  dbAdd('attendance',rec).then(function(id){
    rec.id=id;rec.external_id=id;
    dbPut('attendance',rec).then(function(){
      cPost('attendance',rec);
      toast('✅ Attendance saved!');
      loadAttHist();
    });
  });
}
var allAttHist=[],attHistCache=[];
function loadAttHist(){
  dbAll('attendance').then(function(all){
    cGet('attendance').then(function(call){
      allAttHist=mergeCloudLocal(all,call);
      renderAttHist();
    });
  });
}
function renderAttHist(){
  var el=document.getElementById('attHist');
  var qEl=document.getElementById('attsrch');
  var q=qEl?qEl.value.toLowerCase():'';
  var list=allAttHist.slice().reverse();
  if(q)list=list.filter(function(a){return ((a.b||'')+' '+(a.d||'')+' '+(a.sub||'')).toLowerCase().indexOf(q)>-1;});
  attHistCache=list;
  if(!list.length){el.innerHTML='<div class="empty"><div class="emico">📋</div><div class="emtxt">No records found</div></div>';return;}
  el.innerHTML=list.slice(0,20).map(function(a,idx){
    var p=(a.recs||[]).filter(function(r){return r.st==='P';}).length;
    var ab=(a.recs||[]).filter(function(r){return r.st==='A';}).length;
    return '<div class="rc" style="margin-bottom:8px;">'
      +'<div style="font-size:13px;font-weight:600;">'+a.b+' · '+a.d+(a.sub?' · '+a.sub:'')+'</div>'
      +'<div style="display:flex;gap:8px;font-size:12px;margin-top:5px;">'
      +'<span style="color:var(--tl);">✅ '+p+' Present</span>'
      +'<span style="color:var(--rd);">❌ '+ab+' Absent</span>'
      +'</div>'
      +'<div class="brow" style="margin-top:8px;">'
      +'<button class="gbtn gbtn-gl gbtn-sm" onclick="shrAttIdx('+idx+')">📤 Share</button>'
      +'<button class="gbtn gbtn-gl gbtn-sm" style="color:var(--rd);" onclick="delAtt('+idx+')">🗑️ Delete</button>'
      +'</div></div>';
  }).join('');
}
function delAtt(idx){
  var a=attHistCache[idx];
  if(!a)return;
  if(!confirm('Delete this attendance record?'))return;
  dbDel('attendance',a.id).then(function(){
    allAttHist=allAttHist.filter(function(x){return x!==a;});
    if(a.external_id!=null)cDelete('attendance',a.external_id,{user_org:CU.orgKey});
    renderAttHist();
    toast('Deleted');
  });
}
function shrAttIdx(idx){
  var a=attHistCache[idx];
  if(!a)return;
  var t=buildAttendanceReportText(a);
  if(navigator.share)navigator.share({title:'Attendance Report',text:t});
  else{navigator.clipboard.writeText(t).then(function(){toast('Copied!');});}
}
function buildAttendanceReportText(a){
  var lines=[];
  lines.push('*WRC NEPAL — ATTENDANCE REPORT*');
  lines.push('================================');
  lines.push('');
  lines.push('*Batch:* '+a.b);
  lines.push('*Date:* '+(a.d||'-'));
  if(a.sub)lines.push('*Subject:* '+a.sub);
  lines.push('');
  var p=0,ab=0;
  (a.recs||[]).forEach(function(r,i){
    var status=r.st==='P'?'Present':r.st==='A'?'Absent':'-';
    if(r.st==='P')p++;
    if(r.st==='A')ab++;
    lines.push((i+1)+'. '+r.n+' — '+status+(r.reason?' ('+r.reason+')':''));
  });
  lines.push('');
  lines.push('================================');
  lines.push('*Total Present:* '+p+' | *Total Absent:* '+ab);
  lines.push('Recorded by: '+(a.user_name||CU.name));
  lines.push('Organization: '+(a.user_org||CU.org));
  return lines.join('\n');
}
function shareAtt(){
  var b=getCurrentBatchName();
  var d=document.getElementById('adate').value;
  var sub=document.getElementById('asubj').value;
  var s=currentStudentList;
  var recs=s.map(function(name,i){
    var stEl=document.querySelector('input[name="a'+i+'"]:checked');
    return {n:name,st:stEl?stEl.value:'—',reason:document.getElementById('r'+i)?document.getElementById('r'+i).value:''};
  });
  var t=buildAttendanceReportText({b:b,d:d,sub:sub,recs:recs,user_name:CU.name,user_org:CU.org});
  if(navigator.share)navigator.share({title:'Attendance',text:t});
  else{navigator.clipboard.writeText(t).then(function(){toast('Copied!');});}
}

// ============================================================
// REPORTS - Individual generate/export/share per section
// ============================================================
function loadRep(type){
  var el=document.getElementById('rpc');
  el.innerHTML='<div class="loading"><span class="spin"></span>Loading...</div>';
  Promise.all([dbAll('visitors'),dbAll('expenses'),dbAll('attendance')]).then(function(res){
    var v=res[0],e=res[1],a=res[2];
    allV=v;allE=e;
    if(type==='v')renderVisitorReport(v);
    else if(type==='e')renderExpenseReport(e);
    else renderAttendanceReport(a);
  });
}
function rpTab(t,el){
  document.querySelectorAll('#sec-reports .stab').forEach(function(x){x.classList.remove('active');});
  el.classList.add('active');
  loadRep(t);
}
function renderVisitorReport(v){
  var el=document.getElementById('rpc');
  var tot=v.length,adm=v.filter(function(x){return x.st2==='Admitted';}).length;
  var hot=v.filter(function(x){return x.st2==='Hot lead';}).length;
  var docs=v.filter(function(x){return x.doc&&x.doc.length;}).length;
  var virt=v.filter(function(x){return x.mode==='virtual';}).length;
  var byRef={};
  v.forEach(function(x){var r=x.rn||x.rt||'Direct';byRef[r]=(byRef[r]||0)+1;});
  var refRows=Object.keys(byRef).sort(function(a,b){return byRef[b]-byRef[a];}).map(function(k){
    return '<div class="rr"><span class="rk">'+k+'</span><span class="rv">'+byRef[k]+'</span></div>';
  }).join('');
  el.innerHTML='<div class="rc"><div class="rr"><span class="rk">Total Visitors</span><span class="rv" style="color:var(--pu);">'+tot+'</span></div>'
    +'<div class="rr"><span class="rk">Physical Visits</span><span class="rv">'+(tot-virt)+'</span></div>'
    +'<div class="rr"><span class="rk">Virtual Visits</span><span class="rv">'+virt+'</span></div>'
    +'<div class="rr"><span class="rk">Admitted</span><span class="rv" style="color:var(--tl);">'+adm+'</span></div>'
    +'<div class="rr"><span class="rk">Hot Leads</span><span class="rv" style="color:var(--or);">'+hot+'</span></div>'
    +'<div class="rr"><span class="rk">Docs Received</span><span class="rv">'+docs+'</span></div>'
    +'<div class="rtot"><span>Conversion</span><span style="color:var(--tl);">'+(tot?Math.round(adm/tot*100):0)+'%</span></div></div>'
    +'<div class="rc"><div style="font-size:13px;font-weight:600;margin-bottom:8px;">By Reference</div>'+(refRows||'<div class="emtxt">No data</div>')+'</div>'
    +'<div class="sh"><div class="sht">Generate Full Report</div></div>'
    +'<div class="srow">'
    +'<div class="sbtn" onclick="shrVisitorsReport(\'wa\')"><div class="sico2" style="background:rgba(37,211,102,0.15);">💬</div><div class="slbl2">WhatsApp</div></div>'
    +'<div class="sbtn" onclick="shrVisitorsReport(\'em\')"><div class="sico2" style="background:rgba(79,195,247,0.15);">📧</div><div class="slbl2">Email</div></div>'
    +'<div class="sbtn" onclick="shrVisitorsReport(\'cp\')"><div class="sico2">📋</div><div class="slbl2">Copy</div></div>'
    +'<div class="sbtn" onclick="dlVisitorsCSV()"><div class="sico2" style="background:rgba(179,157,255,0.15);">⬇️</div><div class="slbl2">CSV</div></div>'
    +'</div>';
}
function buildVisitorsReportText(v){
  var lines=[];
  lines.push('*WRC NEPAL — VISITORS SUMMARY REPORT*');
  lines.push('Date: '+new Date().toLocaleDateString('en-IN'));
  lines.push('================================');
  var tot=v.length,adm=v.filter(function(x){return x.st2==='Admitted';}).length;
  var hot=v.filter(function(x){return x.st2==='Hot lead';}).length;
  lines.push('Total Visitors: '+tot);
  lines.push('Admitted: '+adm);
  lines.push('Hot Leads: '+hot);
  lines.push('Conversion Rate: '+(tot?Math.round(adm/tot*100):0)+'%');
  lines.push('================================');
  lines.push('');
  v.slice().reverse().forEach(function(x,i){
    lines.push((i+1)+'. '+x.n+' — '+(x.cy||x.vvCity||'-')+' — '+(x.st2||'New')+' — '+(x.vd||'-'));
  });
  lines.push('');
  lines.push('Generated by: '+CU.name+' | '+CU.org);
  return lines.join('\n');
}
function shrVisitorsReport(via){
  var t=buildVisitorsReportText(allV);
  doShare(via,'WRC Visitors Report',t);
}
function dlVisitorsCSV(){
  var cols=['n','vt','mode','ph','em','cy','st','vvCity','vvState','platform','ci','ns','ap','st2','vd','fd','rn','rt'];
  var hdrs='Name,Type,Mode,Phone,Email,City,State,VirtualCity,VirtualState,Platform,College,NEET,Plan,Status,VisitDate,Followup,RefName,RefType';
  var rows=allV.map(function(x){return cols.map(function(c){return '"'+(x[c]||'').toString().replace(/"/g,"'")+'"';}).join(',');});
  var csv=hdrs+'\n'+rows.join('\n');
  downloadCSV(csv,'WRC_Visitors_'+new Date().toISOString().slice(0,10)+'.csv');
}

function renderExpenseReport(e){
  var el=document.getElementById('rpc');
  var ti=e.reduce(function(s,x){return s+(x.cur==='INR'?+x.amt:+x.amt*N2I);},0);
  var byCat={};
  e.forEach(function(x){byCat[x.cat]=(byCat[x.cat]||0)+(x.cur==='INR'?+x.amt:+x.amt*N2I);});
  var catRows=Object.keys(byCat).map(function(k){
    return '<div class="rr"><span class="rk">'+k+'</span><span class="rv">₹'+Math.round(byCat[k]).toLocaleString('en-IN')+'</span></div>';
  }).join('');
  el.innerHTML='<div class="rc">'+(catRows||'<div class="emtxt">No expenses</div>')+'<div class="rtot"><span>Total INR</span><span style="color:var(--or);">₹'+Math.round(ti).toLocaleString('en-IN')+'</span></div>'
    +'<div class="rtot"><span>Total NPR</span><span style="color:var(--tl);">रू'+Math.round(ti*I2N).toLocaleString()+'</span></div></div>'
    +'<div class="sh"><div class="sht">Generate Full Report</div></div>'
    +'<div class="srow">'
    +'<div class="sbtn" onclick="shrExpensesReport(\'wa\')"><div class="sico2" style="background:rgba(37,211,102,0.15);">💬</div><div class="slbl2">WhatsApp</div></div>'
    +'<div class="sbtn" onclick="shrExpensesReport(\'em\')"><div class="sico2">📧</div><div class="slbl2">Email</div></div>'
    +'<div class="sbtn" onclick="shrExpensesReport(\'cp\')"><div class="sico2">📋</div><div class="slbl2">Copy</div></div>'
    +'<div class="sbtn" onclick="dlExpensesCSV()"><div class="sico2" style="background:rgba(179,157,255,0.15);">⬇️</div><div class="slbl2">CSV</div></div>'
    +'</div>';
}
function buildExpensesReportText(e){
  var lines=[];
  lines.push('*WRC NEPAL — EXPENSE REPORT*');
  lines.push('Date: '+new Date().toLocaleDateString('en-IN'));
  lines.push('================================');
  var byCat={};
  e.forEach(function(x){byCat[x.cat]=(byCat[x.cat]||0)+(x.cur==='INR'?+x.amt:+x.amt*N2I);});
  Object.keys(byCat).forEach(function(k){
    lines.push(k+': ₹'+Math.round(byCat[k]).toLocaleString('en-IN'));
  });
  var ti=e.reduce(function(s,x){return s+(x.cur==='INR'?+x.amt:+x.amt*N2I);},0);
  lines.push('--------------------------------');
  lines.push('Total: ₹'+Math.round(ti).toLocaleString('en-IN')+' INR / रू'+Math.round(ti*I2N).toLocaleString()+' NPR');
  lines.push('================================');
  lines.push('');
  lines.push('*Detailed Entries:*');
  e.slice().reverse().forEach(function(x,i){
    var sub=x.tm||(x.mt||[]).join(', ')||x.hn||(x.mdt||[]).join(', ')||x.oth||x.pur||'';
    lines.push((i+1)+'. '+x.cat+(sub?' ('+sub+')':'')+' — '+(x.cur==='INR'?'₹':'रू')+x.amt+' — '+(x.df||'-'));
  });
  lines.push('');
  lines.push('Generated by: '+CU.name+' | '+CU.org);
  return lines.join('\n');
}
function shrExpensesReport(via){
  var t=buildExpensesReportText(allE);
  doShare(via,'WRC Expense Report',t);
}
function dlExpensesCSV(){
  var cols=['cat','df','dt','amt','cur','pm','pur','rv','tm','fl','tl','hn','user_name'];
  var hdrs='Category,DateFrom,DateTo,Amount,Currency,Payment,Purpose,RelatedVisitor,TransportMode,From,To,Hotel,RecordedBy';
  var rows=allE.map(function(x){return cols.map(function(c){return '"'+(x[c]||'').toString().replace(/"/g,"'")+'"';}).join(',');});
  var csv=hdrs+'\n'+rows.join('\n');
  downloadCSV(csv,'WRC_Expenses_'+new Date().toISOString().slice(0,10)+'.csv');
}

var allAtt=[];
function renderAttendanceReport(a){
  allAtt=a;
  var el=document.getElementById('rpc');
  if(!a.length){
    el.innerHTML='<div class="empty"><div class="emico">📋</div><div class="emtxt">No attendance yet</div></div>';
    return;
  }
  el.innerHTML=a.slice().reverse().map(function(x,idx){
    var p=(x.recs||[]).filter(function(r){return r.st==='P';}).length;
    var ab=(x.recs||[]).filter(function(r){return r.st==='A';}).length;
    return '<div class="rc"><div style="font-size:13px;font-weight:600;">'+x.b+' · '+x.d+(x.sub?' · '+x.sub:'')+'</div>'
      +'<div style="font-size:12px;color:var(--t3);margin-top:4px;">Present: '+p+' | Absent: '+ab+'</div>'
      +'<div class="brow" style="margin-top:8px;">'
      +'<button class="gbtn gbtn-tl gbtn-sm" onclick="shrSingleAtt('+idx+',\'wa\')">💬 WhatsApp</button>'
      +'<button class="gbtn gbtn-gl gbtn-sm" onclick="shrSingleAtt('+idx+',\'cp\')">📋 Copy</button>'
      +'<button class="gbtn gbtn-gl gbtn-sm" onclick="dlSingleAttCSV('+idx+')">⬇️ CSV</button>'
      +'</div></div>';
  }).join('');
}
function shrSingleAtt(idx,via){
  var a=allAtt.slice().reverse()[idx];
  if(!a)return;
  var t=buildAttendanceReportText(a);
  doShare(via,'Attendance - '+a.b,t);
}
function dlSingleAttCSV(idx){
  var a=allAtt.slice().reverse()[idx];
  if(!a)return;
  var hdrs='S.No,Name,Status,Reason';
  var rows=(a.recs||[]).map(function(r,i){
    var st=r.st==='P'?'Present':r.st==='A'?'Absent':'-';
    return (i+1)+',"'+r.n+'","'+st+'","'+(r.reason||'')+'"';
  });
  var csv=hdrs+'\n'+rows.join('\n');
  downloadCSV(csv,'WRC_Attendance_'+a.b.replace(/\s/g,'_')+'_'+(a.d||'')+'.csv');
}

function doShare(via,title,text){
  if(via==='wa'){window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(text),'_blank');}
  else if(via==='em'){window.open('mailto:?subject='+encodeURIComponent(title)+'&body='+encodeURIComponent(text),'_blank');}
  else if(via==='cp'){navigator.clipboard.writeText(text).then(function(){toast('✅ Copied!');});}
  else if(navigator.share){navigator.share({title:title,text:text});}
}
function downloadCSV(csv,filename){
  var a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download=filename;
  a.click();
  toast('✅ Downloaded!');
}

// ============================================================
// NOTICES
// ============================================================
function loadNotices(){
  var el=document.getElementById('nlist');
  el.innerHTML='<div class="loading"><span class="spin"></span>Loading...</div>';
  cGet('notices').then(function(notices){
    if(!notices||!notices.length){
      dbAll('notices_sent').then(function(local){
        noticesCache=local.slice().reverse();
        renderNotices(el);
      });
      return;
    }
    noticesCache=notices;
    renderNotices(el);
    updNotifBadge(notices.length);
  }).catch(function(){
    el.innerHTML='<div class="empty"><div class="emico">🔔</div><div class="emtxt">No notices yet</div></div>';
  });
}
function renderNotices(el){
  if(!noticesCache.length){el.innerHTML='<div class="empty"><div class="emico">🔔</div><div class="emtxt">No notices yet</div></div>';return;}
  var now=new Date();
  var visible=noticesCache.filter(function(n){
    if(n.target && n.target!=='all' && n.target!==CU.role)return false;
    if(n.expiry && new Date(n.expiry)<now)return false;
    return true;
  });
  el.innerHTML=visible.map(function(n,i){
    return renderNCard(n,i,false);
  }).join('');
}
function renderNCard(n,i,isAdmin){
  var typeIco={General:'📢',Urgent:'🚨',Holiday:'🎉',Exam:'📝',Admission:'🎓',Meeting:'🤝'};
  var ico=typeIco[n.type]||'📢';
  var urgent=n.priority==='High'||n.type==='Urgent';
  var timeAgo=getTimeAgo(n.sent_at||n.ts);
  var html='<div class="ncard'+(urgent?' urgent':'')+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">'
    +'<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:4px;">'+ico+' '+n.title+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;">'
    +(urgent?'<span class="bdg bdg-rd" style="font-size:10px;">🔴 Urgent</span>':'')
    +(n.target&&n.target!=='all'?'<span class="bdg bdg-yl" style="font-size:10px;">'+n.target+'</span>':'')
    +'</div></div>'
    +'<div style="font-size:10px;color:var(--t3);white-space:nowrap;">'+timeAgo+'</div>'
    +'</div>'
    +'<div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:8px;">'+n.body+'</div>'
    +(n.video?'<a href="'+n.video+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(255,0,0,0.15);border:1px solid rgba(255,0,0,0.3);border-radius:20px;font-size:12px;color:#ff6b6b;text-decoration:none;margin-bottom:8px;">▶️ Watch Video</a>':'')
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">'
    +'<div style="font-size:10px;color:var(--t3);">By '+(n.sent_by||'Admin')+'</div>'
    +'<div style="display:flex;gap:6px;">'
    +'<button class="gbtn gbtn-gl gbtn-sm" onclick="shrNotice('+i+')">📤</button>'
    +(isAdmin?'<button class="gbtn gbtn-gl gbtn-sm" style="color:var(--rd);" onclick="delNotice('+i+')">🗑️</button>':'')
    +'</div></div>'
    +(n.expiry?'<div style="font-size:10px;color:var(--yl);margin-top:4px;">⏰ Valid until: '+n.expiry+'</div>':'')
    +'</div>';
  return html;
}
function shrNotice(i){
  var n=noticesCache[i];
  if(!n)return;
  var t=n.title+'\n\n'+n.body+(n.video?'\n\nVideo: '+n.video:'');
  if(navigator.share)navigator.share({title:n.title,text:t});
  else{navigator.clipboard.writeText(t).then(function(){toast('Copied!');});}
}
function delNotice(i){
  var n=noticesCache[i];
  if(!n||!confirm('Delete notice?'))return;
  fetch(SU+'/rest/v1/notices?ts=eq.'+n.ts,{method:'DELETE',headers:{'apikey':SK,'Authorization':'Bearer '+SK}})
    .then(function(){noticesCache.splice(i,1);loadAdminSentNotices();toast('Deleted');})
    .catch(function(){toast('Error',true);});
}
function updNotifBadge(count){
  var b=document.getElementById('nbadge');
  if(!b)return;
  if(count&&count>0){b.style.display='block';b.textContent=count>9?'9+':count;}
  else b.style.display='none';
}
function loadNotifBadge(){
  cGet('notices').then(function(n){if(n&&n.length)updNotifBadge(n.length);}).catch(function(){});
}
function getTimeAgo(ts){
  if(!ts)return '';
  var d=new Date(typeof ts==='number'?ts:ts);
  var diff=Date.now()-d.getTime();
  var mins=Math.floor(diff/60000);
  if(mins<1)return 'Just now';
  if(mins<60)return mins+'m ago';
  var hrs=Math.floor(mins/60);
  if(hrs<24)return hrs+'h ago';
  return Math.floor(hrs/24)+'d ago';
}

// ============================================================
// ADMIN
// ============================================================
function admTab(tab,el){
  document.querySelectorAll('#admTabs .stab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  ['overview','sendnotice','alldata','admSettings'].forEach(function(t){
    var d=document.getElementById('adm-'+t);if(d)d.style.display='none';
  });
  var show=document.getElementById('adm-'+tab);
  if(show)show.style.display='block';
  if(tab==='overview')loadAdminOverview();
  if(tab==='sendnotice')loadAdminSentNotices();
  if(tab==='alldata')admData('visitors',document.querySelector('#adm-alldata .stab'));
  if(tab==='admSettings')loadAdminsList();
}
function loadAdminOverview(){
  Promise.all([
    cGet('visitors'),cGet('expenses'),cGet('notices')
  ]).then(function(res){
    var v=res[0]||[],e=res[1]||[],n=res[2]||[];
    var orgs={};
    v.forEach(function(x){var o=x.user_org||'Unknown';if(!orgs[o])orgs[o]={v:0,e:0};orgs[o].v++;});
    e.forEach(function(x){var o=x.user_org||'Unknown';if(!orgs[o])orgs[o]={v:0,e:0};orgs[o].e+=(x.cur==='INR'?+x.amt:+x.amt*N2I);});
    var ti=e.reduce(function(s,x){return s+(x.cur==='INR'?+x.amt:+x.amt*N2I);},0);
    document.getElementById('adv').textContent=v.length;
    document.getElementById('ado').textContent=Object.keys(orgs).length;
    document.getElementById('ade').textContent='₹'+Math.round(ti).toLocaleString('en-IN');
    document.getElementById('adn').textContent=n.length;
    var el=document.getElementById('admOrgList');
    if(!Object.keys(orgs).length){el.innerHTML='<div class="emtxt">No cloud data yet. Users need internet once to sync.</div>';return;}
    el.innerHTML=Object.keys(orgs).sort(function(a,b){return orgs[b].v-orgs[a].v;}).map(function(org){
      return '<div style="background:var(--s2);border:1px solid var(--b);border-radius:var(--rx);padding:10px 12px;margin-bottom:8px;">'
        +'<div style="font-size:13px;font-weight:600;color:var(--tx);margin-bottom:5px;">🏫 '+org+'</div>'
        +'<div style="display:flex;gap:12px;font-size:12px;">'
        +'<span style="color:var(--pu);">👥 '+orgs[org].v+' visitors</span>'
        +'<span style="color:var(--or);">💰 ₹'+Math.round(orgs[org].e).toLocaleString('en-IN')+'</span>'
        +'</div></div>';
    }).join('');
  }).catch(function(){
    document.getElementById('admOrgList').innerHTML='<div class="emtxt">Connect to internet to view all data</div>';
  });
}
function sendNotice(){
  var title=document.getElementById('ntitle').value.trim();
  var body=document.getElementById('nbody').value.trim();
  if(!title||!body){toast('Title and message required',true);return;}
  var data={
    title:title,body:body,
    type:document.getElementById('ntype').value,
    target:document.getElementById('ntarget').value,
    video:document.getElementById('nvideo').value,
    priority:document.getElementById('npriority').value,
    expiry:document.getElementById('nexpiry').value,
    sent_by:CU.name,org:CU.orgKey,org_name:CU.org,
    sent_at:new Date().toISOString(),ts:Date.now()
  };
  dbAdd('notices_sent',data).then(function(){
    cPost('notices',data).then(function(){
      sendPushNotif(data);
      toast('📢 Notice published!');
      document.getElementById('ntitle').value='';
      document.getElementById('nbody').value='';
      document.getElementById('nvideo').value='';
      loadAdminSentNotices();
    });
  });
}
function sendPushNotif(notice){
  if('Notification' in window && Notification.permission==='granted'){
    navigator.serviceWorker.ready.then(function(reg){
      reg.showNotification(notice.title,{
        body:notice.body.slice(0,100),
        tag:'wrc-'+Date.now(),vibrate:[200,100,200]
      });
    }).catch(function(){});
  }
}
function loadAdminSentNotices(){
  var el=document.getElementById('sentNotices');
  if(!el)return;
  cGet('notices').then(function(notices){
    if(!notices||!notices.length){
      dbAll('notices_sent').then(function(local){
        noticesCache=local.slice().reverse();
        if(!noticesCache.length){el.innerHTML='<div class="empty"><div class="emico">📢</div><div class="emtxt">No notices sent yet</div></div>';return;}
        el.innerHTML=noticesCache.map(function(n,i){return renderNCard(n,i,true);}).join('');
      });
      return;
    }
    noticesCache=notices;
    el.innerHTML=notices.map(function(n,i){return renderNCard(n,i,true);}).join('');
  }).catch(function(){el.innerHTML='<div class="emtxt">Could not load notices</div>';});
}
function admData(type,el){
  admCurData=type;
  if(el){document.querySelectorAll('#adm-alldata .stab').forEach(function(t){t.classList.remove('active');});el.classList.add('active');}
  var listEl=document.getElementById('admDataList');
  listEl.innerHTML='<div class="loading"><span class="spin"></span>Loading...</div>';
  cGet(type).then(function(data){
    if(!data||!data.length){listEl.innerHTML='<div class="empty"><div class="emico">📋</div><div class="emtxt">No data yet</div></div>';return;}
    if(type==='visitors'){
      listEl.innerHTML=data.map(function(v){
        return '<div style="background:var(--s1);border:1px solid var(--b);border-radius:var(--rx);padding:10px;margin-bottom:8px;font-size:12px;">'
          +'<div style="display:flex;justify-content:space-between;"><span style="font-weight:600;">'+(v.n||'—')+'</span>'
          +'<span class="bdg '+(SM[v.st2]||'bdg-pu')+'" style="font-size:10px;">'+(v.st2||'New')+'</span></div>'
          +'<div style="color:var(--t3);margin-top:3px;">'+(v.user_org||'')+' · '+(v.cy||v.vvCity||'')+'</div></div>';
      }).join('');
    } else if(type==='expenses'){
      listEl.innerHTML=data.map(function(ex){
        return '<div style="background:var(--s1);border:1px solid var(--b);border-radius:var(--rx);padding:10px;margin-bottom:8px;font-size:12px;display:flex;justify-content:space-between;">'
          +'<div><div style="font-weight:600;">'+(ex.cat||'—')+'</div><div style="color:var(--t3);">'+(ex.user_org||'')+' · '+(ex.user_name||'')+'</div></div>'
          +'<div style="font-weight:700;color:var(--or);">'+(ex.cur==='INR'?'₹':'रू')+parseFloat(ex.amt||0).toLocaleString()+'</div></div>';
      }).join('');
    } else {
      listEl.innerHTML=data.map(function(a){
        var p=(a.recs||[]).filter(function(r){return r.st==='P';}).length;
        return '<div style="background:var(--s1);border:1px solid var(--b);border-radius:var(--rx);padding:10px;margin-bottom:8px;font-size:12px;">'
          +'<div style="font-weight:600;">'+(a.b||'')+' · '+(a.d||'')+'</div>'
          +'<div style="color:var(--t3);">Present: '+p+' / '+(a.recs||[]).length+' | Org: '+(a.user_org||'—')+'</div></div>';
      }).join('');
    }
  }).catch(function(){listEl.innerHTML='<div class="emtxt">Connect to internet to view all data</div>';});
}
function admExport(){
  cGet(admCurData).then(function(data){
    if(!data||!data.length){toast('No data',true);return;}
    var keys=Object.keys(data[0]).filter(function(k){return k!=='rcpt'&&k!=='attachment';});
    var csv=keys.join(',')+'\n'+data.map(function(r){
      return keys.map(function(k){return '"'+(r[k]||'').toString().replace(/"/g,"'")+'"';}).join(',');
    }).join('\n');
    downloadCSV(csv,'WRC_Admin_'+admCurData+'_'+new Date().toISOString().slice(0,10)+'.csv');
  }).catch(function(){toast('Error downloading',true);});
}

// ============================================================
// ADMIN AUTH
// ============================================================
function hashPwd(pwd){
  var encoder=new TextEncoder();
  var data=encoder.encode(pwd+'WRC_SALT_2025');
  return crypto.subtle.digest('SHA-256',data).then(function(buf){
    return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  });
}
function verifyAdmin(identifier,pwd){
  return fetch(SU+'/rest/v1/admin_users?select=id&limit=1',{
    method:'GET',
    headers:{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json'}
  }).then(function(r){
    if(!r.ok){
      toast('Could not reach server (status '+r.status+'). Check internet connection.',true);
      throw new Error('count-check-failed');
    }
    return r.json();
  }).then(function(allAdmins){
    var count=(allAdmins && allAdmins.length) ? allAdmins.length : 0;

    // BOOTSTRAP: no admin exists anywhere yet -> this login becomes the first Super Admin
    if(count===0){
      if(pwd.length<8){
        toast('First admin password must be at least 8 characters',true);
        return false;
      }
      return hashPwd(pwd).then(function(hash){
        var data={identifier:identifier,pwd_hash:hash,name:(CU&&CU.name)?CU.name:'Super Admin',admin_level:'superadmin',org:'all',is_active:true,created_at:new Date().toISOString()};
        return fetch(SU+'/rest/v1/admin_users',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=representation'},
          body:JSON.stringify(data)
        }).then(function(r2){
          if(!r2.ok){
            return r2.text().then(function(errText){
              toast('Could not create admin: '+errText.slice(0,80),true);
              return false;
            });
          }
          localStorage.setItem('wrc_sa_hash',hash);
          localStorage.setItem('wrc_sa_id',identifier);
          toast('🎉 First Admin account created!');
          return true;
        });
      });
    }

    // Normal path: verify against existing records
    return hashPwd(pwd).then(function(hash){
      return fetch(SU+'/rest/v1/admin_users?select=id,name&identifier=eq.'+encodeURIComponent(identifier)+'&pwd_hash=eq.'+hash+'&is_active=eq.true',{
        headers:{'apikey':SK,'Authorization':'Bearer '+SK}
      }).then(function(r3){return r3.ok?r3.json():[];}).then(function(data){
        if(data&&data.length>0)return true;
        var lh=localStorage.getItem('wrc_sa_hash');
        var li=localStorage.getItem('wrc_sa_id');
        if(lh&&li===identifier&&lh===hash)return true;
        toast('Password does not match any admin account for this email/phone',true);
        return false;
      });
    });
  }).catch(function(err){
    if(err && err.message==='count-check-failed'){return false;}
    // Offline fallback: check local super-admin hash only
    return hashPwd(pwd).then(function(hash){
      var lh=localStorage.getItem('wrc_sa_hash');
      var li=localStorage.getItem('wrc_sa_id');
      if(lh&&li===identifier&&lh===hash)return true;
      toast('Offline and no local admin match found',true);
      return false;
    });
  });
}
function setupAdmin(){
  var id=document.getElementById('saId').value.trim();
  var pwd=document.getElementById('saPwd').value;
  var conf=document.getElementById('saConf').value;
  if(!id){toast('Email/Phone required',true);return;}
  if(pwd.length<8){toast('Password min 8 characters',true);return;}
  if(pwd!==conf){toast('Passwords do not match',true);return;}
  hashPwd(pwd).then(function(hash){
    var data={identifier:id,pwd_hash:hash,name:CU.name||'Super Admin',admin_level:'superadmin',org:CU.orgKey||'all',is_active:true,created_at:new Date().toISOString()};
    cPost('admin_users',data).then(function(){
      localStorage.setItem('wrc_sa_hash',hash);
      localStorage.setItem('wrc_sa_id',id);
      toast('✅ Admin password saved!');
      document.getElementById('saPwd').value='';
      document.getElementById('saConf').value='';
      loadAdminsList();
    });
  });
}

// ============================================================
// PASSWORD RECOVERY / REGENERATE
// ============================================================
var recoverTargetId='';
function checkRecoverEligibility(){
  var id=document.getElementById('recId').value.trim();
  var msg=document.getElementById('recoverMsg');
  if(!id){msg.innerHTML='<span style="color:var(--rd);">Please enter email or phone</span>';return;}
  msg.innerHTML='<span class="spin"></span> Checking...';
  fetch(SU+'/rest/v1/admin_users?select=id,name,admin_level,is_active&identifier=eq.'+encodeURIComponent(id),{
    headers:{'apikey':SK,'Authorization':'Bearer '+SK}
  }).then(function(r){return r.ok?r.json():[];}).then(function(data){
    if(!data||!data.length){
      msg.innerHTML='<span style="color:var(--rd);">No admin found with this email/phone. Ask your Super Admin to add you, or login as Admin role to bootstrap the first account if none exists yet.</span>';
      return;
    }
    if(!data[0].is_active){
      msg.innerHTML='<span style="color:var(--rd);">This admin account is disabled. Contact your Super Admin.</span>';
      return;
    }
    fetch(SU+'/rest/v1/admin_users?select=id&limit=2',{
      headers:{'apikey':SK,'Authorization':'Bearer '+SK}
    }).then(function(r2){return r2.ok?r2.json():[];}).then(function(allAdmins){
      if(allAdmins.length===1){
        recoverTargetId=id;
        msg.innerHTML='<span style="color:var(--tl);">✅ Account found: '+data[0].name+'. You are the only admin, so you can reset your password directly below.</span>';
        document.getElementById('recoverStep2').style.display='block';
      } else {
        msg.innerHTML='<span style="color:var(--yl);">Account found: '+data[0].name+'. For security, multiple admins exist — please ask your Super Admin to reset your password from Admin Panel → Settings → Existing Admins.</span>';
      }
    });
  }).catch(function(){
    msg.innerHTML='<span style="color:var(--rd);">Could not check — connect to internet and try again.</span>';
  });
}
function doPasswordReset(){
  var np=document.getElementById('recNewPwd').value;
  var cp=document.getElementById('recConfPwd').value;
  if(np.length<8){toast('Password min 8 characters',true);return;}
  if(np!==cp){toast('Passwords do not match',true);return;}
  hashPwd(np).then(function(hash){
    fetch(SU+'/rest/v1/admin_users?identifier=eq.'+encodeURIComponent(recoverTargetId),{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK},
      body:JSON.stringify({pwd_hash:hash})
    }).then(function(){
      localStorage.setItem('wrc_sa_hash',hash);
      localStorage.setItem('wrc_sa_id',recoverTargetId);
      toast('✅ Password reset! You can login now.');
      closeM('mrecover');
      document.getElementById('recNewPwd').value='';
      document.getElementById('recConfPwd').value='';
      document.getElementById('recId').value='';
      document.getElementById('recoverStep2').style.display='none';
      document.getElementById('recoverMsg').innerHTML='';
    }).catch(function(){toast('Reset failed — check connection',true);});
  });
}
function regenerateAdminPwd(identifier,adminName){
  var np=prompt('Set a new password for '+adminName+' (min 6 characters):');
  if(!np)return;
  if(np.length<6){toast('Password min 6 characters',true);return;}
  hashPwd(np).then(function(hash){
    fetch(SU+'/rest/v1/admin_users?identifier=eq.'+encodeURIComponent(identifier),{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK},
      body:JSON.stringify({pwd_hash:hash})
    }).then(function(){
      toast('✅ Password regenerated for '+adminName);
    }).catch(function(){toast('Failed to regenerate',true);});
  });
}
function addAdmin(){
  var name=document.getElementById('newAdmName').value.trim();
  var id=document.getElementById('newAdmId').value.trim();
  var pwd=document.getElementById('newAdmPwd').value;
  var level=document.getElementById('newAdmLevel').value;
  if(!name||!id||!pwd){toast('All fields required',true);return;}
  if(pwd.length<6){toast('Password min 6 chars',true);return;}
  hashPwd(pwd).then(function(hash){
    var data={identifier:id,pwd_hash:hash,name:name,admin_level:level,org:'all',is_active:true,created_by:CU.id,created_at:new Date().toISOString()};
    cPost('admin_users',data).then(function(){
      toast('✅ Admin added!');
      document.getElementById('newAdmName').value='';
      document.getElementById('newAdmId').value='';
      document.getElementById('newAdmPwd').value='';
      loadAdminsList();
    });
  });
}
function loadAdminsList(){
  var el=document.getElementById('adminsList');
  if(!el)return;
  fetch(SU+'/rest/v1/admin_users?select=id,name,identifier,admin_level,is_active&order=created_at.desc',{
    headers:{'apikey':SK,'Authorization':'Bearer '+SK}
  }).then(function(r){return r.ok?r.json():[];}).then(function(admins){
    if(!admins.length){el.innerHTML='<div class="emtxt">No admins yet. Setup above first.</div>';return;}
    el.innerHTML=admins.map(function(a){
      return '<div style="background:var(--s2);border:1px solid var(--b);border-radius:var(--rx);padding:10px 12px;margin-bottom:8px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;">'
        +'<div><div style="font-size:13px;font-weight:600;">'+a.name+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+a.identifier+' · '+a.admin_level+'</div></div>'
        +'<span class="bdg '+(a.is_active?'bdg-tl':'bdg-rd')+'" style="font-size:10px;">'+(a.is_active?'Active':'Inactive')+'</span>'
        +'</div>'
        +'<div class="brow" style="margin-top:8px;">'
        +'<button class="gbtn gbtn-gl gbtn-sm" onclick="regenerateAdminPwd(\''+a.identifier+'\',\''+a.name.replace(/'/g,"\\'")+'\')">🔄 Regenerate Password</button>'
        +'</div>'
        +'</div>';
    }).join('');
  }).catch(function(){el.innerHTML='<div class="emtxt">Could not load. Check connection.</div>';});
}

// ============================================================
// SETTINGS
// ============================================================
function saveSett(){
  CU.name=document.getElementById('sn').value;
  CU.email=document.getElementById('se').value;
  CU.phone=document.getElementById('sp').value;
  CU.org=document.getElementById('sc').value;
  CU.orgKey=CU.org.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
  localStorage.setItem('wrc_u',JSON.stringify(CU));
  initUI();toast('✅ Profile saved!');
}
function saveAI(){
  localStorage.setItem('wrc_ai_svc','gemini');
  localStorage.setItem('wrc_ai_key',document.getElementById('aiK').value.trim());
  toast('✅ Gemini API key saved!');
}
function cpLink(){navigator.clipboard.writeText(window.location.href).then(function(){toast('✅ Link copied!');});}
function shrLink(){
  if(navigator.share)navigator.share({title:'WRC Nepal Staff Tracker',url:window.location.href,text:'WRC Nepal Staff Tracker app'});
  else cpLink();
}

// ============================================================
// GLOBAL SEARCH — across Visitors, Leads, Expenses, Attendance
// ============================================================
function globalSearch(inputId,resultsId){
  inputId=inputId||'gsrchHome';
  resultsId=resultsId||'gsrchResultsHome';
  var inEl=document.getElementById(inputId);
  var out=document.getElementById(resultsId);
  if(!inEl||!out)return;
  var q=inEl.value.trim().toLowerCase();
  if(!q){out.innerHTML='';return;}
  var results=[];
  (allV||[]).forEach(function(v){
    if(JSON.stringify(v).toLowerCase().indexOf(q)>-1){
      results.push({type:'Visitor',icon:'👥',label:v.n,sub:(v.ph||v.ci||''),
        action:"showSec('visitors');closeM('mldd');closeM('mvd');setTimeout(function(){showVD("+v.id+");},60);"});
    }
  });
  (allLeads||[]).forEach(function(l){
    if(JSON.stringify(l).toLowerCase().indexOf(q)>-1){
      results.push({type:'Lead',icon:'🎯',label:l.n,sub:(l.ph||l.co||''),
        action:"showSec('leads');setTimeout(function(){showLeadDetail("+l.id+");},60);"});
    }
  });
  (allE||[]).forEach(function(e){
    if(JSON.stringify(e).toLowerCase().indexOf(q)>-1){
      results.push({type:'Expense',icon:'🧾',label:e.cat+' — '+(e.cur==='INR'?'₹':'रू')+e.amt,sub:(e.pur||e.df||''),
        action:"showSec('expenses');"});
    }
  });
  (allAttHist||[]).forEach(function(a){
    if(((a.b||'')+' '+(a.d||'')+' '+(a.sub||'')).toLowerCase().indexOf(q)>-1){
      results.push({type:'Attendance',icon:'📋',label:(a.b||'')+' · '+(a.d||''),sub:a.sub||'',
        action:"showSec('attendance');"});
    }
  });
  if(!results.length){out.innerHTML='<div class="empty" style="padding:16px;"><div class="emtxt">No matches found</div></div>';return;}
  out.innerHTML=results.slice(0,30).map(function(r){
    return '<div class="li" onclick="'+r.action.replace(/"/g,'&quot;')+'"><div class="liav" style="background:var(--s1);">'+r.icon+'</div>'
      +'<div class="libody"><div class="liname">'+r.label+'</div><div class="limeta">'+r.type+(r.sub?' · '+r.sub:'')+'</div></div></div>';
  }).join('');
}

// ============================================================
// AI
// ============================================================
function aiSend(){
  var q=document.getElementById('aiq').value.trim();
  if(!q)return;
  aiQ(q);
}
function aiQ(q){
  document.getElementById('aiq').value=q;
  var rp=document.getElementById('airp');
  rp.style.display='block';
  rp.innerHTML='<span class="spin"></span> Thinking...';
  var tot=allV.length;
  var hot=allV.filter(function(v){return v.st2==='Hot lead';}).length;
  var adm=allV.filter(function(v){return v.st2==='Admitted';}).length;
  var ti=allE.reduce(function(s,x){return s+(x.cur==='INR'?+x.amt:+x.amt*N2I);},0);
  var key=localStorage.getItem('wrc_ai_key')||'';
  if(!key){
    rp.innerHTML='📊 <b>Quick Summary:</b><br>Visitors: '+tot+' | Hot: '+hot+' | Admitted: '+adm+'<br>Expenses: ₹'+Math.round(ti).toLocaleString('en-IN')+'<br><br><em>Add your free Gemini API key in Settings for detailed AI analysis!</em>';
    return;
  }
  var ctx='WRC Nepal Staff data - Visitors:'+tot+', Hot leads:'+hot+', Admitted:'+adm+', Total expenses INR:'+Math.round(ti)+'. Today:'+new Date().toLocaleDateString('en-IN')+'. Answer briefly.';
  callGemini(ctx+'\n\nQuestion: '+q).then(function(resp){
    rp.innerHTML=resp.replace(/\n/g,'<br>');
  }).catch(function(err){
    rp.innerHTML='⚠️ AI error: '+err+'. Check your Gemini API key in Settings.';
  });
}

// ============================================================
// LEADS CONTROL — CRM
// ============================================================
var allLeads=[],ldFilter='';
var LDSM={'New':'bdg-pu','Interested':'bdg-tl','Hot lead':'bdg-or','Admitted':'bdg-tl','Not interested':'bdg-rd','Follow-up':'bdg-yl'};

function normPhone(p){return (p||'').replace(/[^0-9]/g,'').slice(-10);}

function loadLeads(){
  dbAll('leads').then(function(l){
    cGet('leads').then(function(cl){
      allLeads=mergeCloudLocal(l,cl).filter(function(x){return x.n;});
      renderLeads();
      var el=document.getElementById('ld1');if(el)el.textContent=allLeads.length;
      updateSentTodayCount();
    });
  });
}
function ldTab(name,el){
  var bar=document.getElementById('ldMainTabs');
  if(bar)bar.querySelectorAll('.stab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  ['contacts','reports','log'].forEach(function(n){
    var s=document.getElementById('ld-'+n);
    if(s)s.style.display=(n===name)?'block':'none';
  });
  if(name==='log')renderSendLog();
}
function setLdF(s,el){
  ldFilter=s;
  document.querySelectorAll('#ldFilterTabs .stab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  renderLeads();
}
function renderLeads(){
  var list=allLeads.slice().reverse();
  var qEl=document.getElementById('ldsrch');
  var q=qEl?qEl.value.toLowerCase():'';
  if(q)list=list.filter(function(l){return JSON.stringify(l).toLowerCase().indexOf(q)>-1;});
  if(ldFilter)list=list.filter(function(l){return l.st===ldFilter;});
  var el=document.getElementById('ldlist');
  if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty"><div class="emico">🎯</div><div class="emtxt">No leads found. Import Excel or Sync Contacts to begin.</div></div>';return;}
  el.innerHTML=list.map(function(l,i){
    var c=CLR[i%CLR.length];
    var ini=(l.n||'?').split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
    var ph=l.ph?l.ph.replace(/\D/g,''):'';
    var badge=l.st?'<span class="bdg '+(LDSM[l.st]||'bdg-pu')+'" style="font-size:10px;">'+l.st+'</span>':'';
    return '<div class="li" style="align-items:center;">'
      +'<input type="checkbox" class="ldchk" data-id="'+l.id+'" style="width:18px;height:18px;flex-shrink:0;">'
      +'<div class="liav" style="background:'+c+'22;color:'+c+'" onclick="showLeadDetail('+l.id+')">'+ini+'</div>'
      +'<div class="libody" onclick="showLeadDetail('+l.id+')"><div class="liname">'+l.n+'</div>'
      +'<div class="limeta">'+(l.co||'')+(ph?' · '+ph:'')+'</div>'
      +'<div class="litags">'+badge+'</div></div>'
      +'<div class="lirght" style="display:flex;flex-direction:column;gap:5px;">'
      +(ph?'<a href="https://wa.me/'+ph+'" target="_blank" class="gbtn gbtn-tl gbtn-sm" style="padding:5px 10px;" onclick="event.stopPropagation();logLeadActivity('+l.id+',\'App Opened\',\'whatsapp\',\'Opened WhatsApp chat\')">💬</a>':'')
      +(ph?'<a href="tel:'+ph+'" class="gbtn gbtn-gl gbtn-sm" style="padding:5px 10px;" onclick="event.stopPropagation();">📞</a>':'')
      +'</div></div>';
  }).join('');
}
function toggleAllLeadSel(cb){
  document.querySelectorAll('.ldchk').forEach(function(c){c.checked=cb.checked;});
}
function getSelectedLeadIds(){
  var ids=[];
  document.querySelectorAll('.ldchk:checked').forEach(function(c){ids.push(parseInt(c.getAttribute('data-id'),10));});
  return ids;
}

// ---- Add / import leads ----
function addLeadIfNew(data){
  var np=normPhone(data.ph);
  var exists=allLeads.some(function(l){
    return (np && normPhone(l.ph)===np) || (data.em && l.em && l.em.toLowerCase()===data.em.toLowerCase());
  });
  if(exists)return Promise.resolve(false);
  var rec={n:data.n,ph:data.ph||'',em:data.em||'',co:data.co||'',nt:data.nt||'',st:data.st||'New',
    src:data.src||'Manual',user_org:CU.orgKey,user_name:CU.name,created_at:new Date().toISOString()};
  return dbAdd('leads',rec).then(function(id){
    rec.id=id;rec.external_id=id;
    return dbPut('leads',rec).then(function(){
      allLeads.push(rec);
      cPost('leads',rec);
      return true;
    });
  });
}
function saveLead(){
  var n=document.getElementById('ldn').value.trim();
  if(!n){toast('Please enter lead name',true);return;}
  var data={n:n,ph:document.getElementById('ldph').value.trim(),em:document.getElementById('ldem').value.trim(),
    co:document.getElementById('ldco').value.trim(),st:document.getElementById('ldst').value,
    nt:document.getElementById('ldnt').value.trim(),src:'Manual',user_org:CU.orgKey,user_name:CU.name,
    created_at:new Date().toISOString()};
  dbAdd('leads',data).then(function(id){
    data.id=id;data.external_id=id;
    dbPut('leads',data).then(function(){
      allLeads.push(data);
      cPost('leads',data);
      closeM('mladd');
      ['ldn','ldph','ldem','ldco','ldnt'].forEach(function(fid){var e=document.getElementById(fid);if(e)e.value='';});
      toast('✅ Lead added!');
      loadLeads();
    });
  });
}
function handleLeadExcel(event){
  var file=event.target.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var wb=XLSX.read(e.target.result,{type:'array'});
      var sheet=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
      var promises=[],rowCount=0;
      rows.forEach(function(row){
        var keys=Object.keys(row);
        function pick(names){
          for(var i=0;i<keys.length;i++){
            var k=keys[i].toLowerCase().trim();
            if(names.indexOf(k)>-1)return row[keys[i]];
          }
          return '';
        }
        var name=String(pick(['name','full name','lead name','student name'])||'').trim();
        if(!name)return;
        rowCount++;
        var phone=String(pick(['phone','mobile','contact','whatsapp','number','phone number'])||'').replace(/[^0-9+]/g,'');
        var email=String(pick(['email','email address'])||'').trim();
        var college=String(pick(['college','organization','org','institute'])||'').trim();
        var notes=String(pick(['notes','remarks','comment'])||'').trim();
        promises.push(addLeadIfNew({n:name,ph:phone,em:email,co:college,nt:notes,st:'New',src:'Excel Import'}));
      });
      Promise.all(promises).then(function(results){
        var actual=results.filter(Boolean).length;
        toast('✅ '+actual+' new leads imported (of '+rowCount+' rows scanned)');
        loadLeads();
      });
    }catch(err){toast('Excel parse error: '+err.message,true);}
  };
  reader.readAsArrayBuffer(file);
  event.target.value='';
}

// ---- Google Contacts sync (OAuth via Google Identity Services) ----
var gTokenClient=null;
function ensureGISClient(cb){
  if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){
    toast('Google sign-in is still loading — try again in a second',true);
    return;
  }
  if(!gTokenClient){
    gTokenClient=google.accounts.oauth2.initTokenClient({
      client_id:GOOGLE_CLIENT_ID,
      scope:'https://www.googleapis.com/auth/contacts.readonly',
      callback:cb
    });
  } else {
    gTokenClient.callback=cb;
  }
  gTokenClient.requestAccessToken();
}
function syncGoogleContacts(){
  ensureGISClient(function(resp){
    if(!resp||resp.error){toast('Google sign-in failed / cancelled',true);return;}
    toast('Importing contacts...');
    fetchGoogleContactsPage(resp.access_token,'',0);
  });
}
function fetchGoogleContactsPage(token,pageToken,importedCount){
  var url='https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,organizations&pageSize=200'+(pageToken?'&pageToken='+pageToken:'');
  fetch(url,{headers:{'Authorization':'Bearer '+token}}).then(function(r){return r.json();}).then(function(d){
    if(d.error){toast('Google Contacts error: '+d.error.message,true);return;}
    var conns=d.connections||[];
    var promises=conns.map(function(p){
      var name=p.names&&p.names[0]?p.names[0].displayName:'';
      var phone=p.phoneNumbers&&p.phoneNumbers[0]?p.phoneNumbers[0].value.replace(/[^0-9+]/g,''):'';
      var email=p.emailAddresses&&p.emailAddresses[0]?p.emailAddresses[0].value:'';
      var org=p.organizations&&p.organizations[0]?(p.organizations[0].name||''):'';
      if(!name||(!phone&&!email))return Promise.resolve(false);
      return addLeadIfNew({n:name,ph:phone,em:email,co:org,st:'New',src:'Google Contacts'});
    });
    Promise.all(promises).then(function(results){
      var added=results.filter(Boolean).length;
      importedCount+=added;
      if(d.nextPageToken){
        fetchGoogleContactsPage(token,d.nextPageToken,importedCount);
      } else {
        toast('✅ '+importedCount+' contacts imported from Google');
        loadLeads();
      }
    });
  }).catch(function(){toast('Google Contacts fetch failed',true);});
}

// ---- Lead detail + status ----
var curLeadId=null;
function showLeadDetail(id){
  var l=allLeads.find(function(x){return x.id===id;});
  if(!l)return;
  curLeadId=id;
  document.getElementById('lddtitle').innerHTML=l.n+' <button class="cbtn" onclick="closeM(\'mldd\')">✕</button>';
  var ph=l.ph?l.ph.replace(/\D/g,''):'';
  var statuses=['New','Interested','Hot lead','Follow-up','Admitted','Not interested'];
  var html='<div class="fld"><label>Status</label><select class="gs" id="lddSt" onchange="updateLeadStatus('+id+')">'
    +statuses.map(function(s){return '<option value="'+s+'"'+(l.st===s?' selected':'')+'>'+s+'</option>';}).join('')
    +'</select></div>'
    +'<div class="rc"><div class="rr"><span class="rk">Phone</span><span class="rv">'+(l.ph||'—')+'</span></div>'
    +'<div class="rr"><span class="rk">Email</span><span class="rv">'+(l.em||'—')+'</span></div>'
    +'<div class="rr"><span class="rk">College</span><span class="rv">'+(l.co||'—')+'</span></div>'
    +'<div class="rr"><span class="rk">Source</span><span class="rv">'+(l.src||'—')+'</span></div></div>'
    +(l.nt?'<div class="fld"><label>Notes</label><div style="font-size:12px;color:var(--t2);">'+l.nt+'</div></div>':'')
    +'<div class="brow">'
    +(ph?'<a href="https://wa.me/'+ph+'" target="_blank" class="gbtn gbtn-tl gbtn-sm" onclick="logLeadActivity('+id+',\'App Opened\',\'whatsapp\',\'Opened WhatsApp chat\')">💬 WhatsApp</a>':'')
    +(ph?'<a href="tel:'+ph+'" class="gbtn gbtn-gl gbtn-sm">📞 Call</a>':'')
    +'<button class="gbtn gbtn-bl gbtn-sm" onclick="openVoiceCompose('+id+')">🎙️ Voice Msg</button>'
    +'<button class="gbtn gbtn-pu gbtn-sm" onclick="openCallSummary('+id+')">📞 Call Summary</button>'
    +'<button class="gbtn gbtn-or gbtn-sm" onclick="openMediaShare('+id+')">📎 Share Media</button>'
    +'<button class="gbtn gbtn-gl gbtn-sm" onclick="openMeetLink('+id+')">🎥 Meeting Link</button>'
    +'<button class="gbtn gbtn-gl gbtn-sm" style="color:var(--rd);" onclick="delLead('+id+')">🗑️ Delete</button>'
    +'</div>'
    +'<div class="dvdr"></div>'
    +'<div class="sht" style="margin-bottom:8px;">🗂️ Activity Timeline</div>'
    +'<div id="lddTimeline"><div class="loading"><span class="spin"></span>Loading...</div></div>';
  document.getElementById('lddbody').innerHTML=html;
  openM('mldd');
  loadLeadTimeline(id);
}
function updateLeadStatus(id){
  var st=document.getElementById('lddSt').value;
  var l=allLeads.find(function(x){return x.id===id;});
  if(!l)return;
  l.st=st;
  dbPut('leads',l);
  cPatch('leads',{external_id:id,user_org:CU.orgKey},{st:st});
  toast('✅ Status updated');
  renderLeads();
}
function delLead(id){
  if(!confirm('Delete this lead?'))return;
  dbDel('leads',id).then(function(){
    allLeads=allLeads.filter(function(x){return x.id!==id;});
    cDelete('leads',id,{user_org:CU.orgKey});
    closeM('mldd');renderLeads();
    var el=document.getElementById('ld1');if(el)el.textContent=allLeads.length;
    toast('Deleted');
  });
}

// ---- Activity logging & timeline ----
function logLeadActivity(leadId,type,channel,content){
  var l=allLeads.find(function(x){return x.id===leadId;});
  var rec={contact_id:leadId,contact_name:l?l.n:'',contact_phone:l?l.ph:'',
    type:type,channel:channel||'',content:content||'',
    sent_by:CU.name,user_org:CU.orgKey,created_at:new Date().toISOString()};
  dbAdd('lead_activity',rec).then(function(aid){
    rec.id=aid;rec.external_id=aid;
    dbPut('lead_activity',rec);
    cPost('lead_activity',rec);
    if(document.getElementById('lddTimeline'))loadLeadTimeline(leadId);
    updateSentTodayCount();
  });
}
function loadLeadTimeline(id){
  dbAll('lead_activity').then(function(all){
    var mine=all.filter(function(a){return a.contact_id===id;}).sort(function(a,b){return (b.ts||0)-(a.ts||0);});
    var el=document.getElementById('lddTimeline');
    if(!el)return;
    if(!mine.length){el.innerHTML='<div class="emtxt" style="text-align:center;padding:14px;">No activity yet</div>';return;}
    el.innerHTML=mine.map(function(a){
      var dt=a.created_at?new Date(a.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      return '<div class="rc" style="padding:10px 12px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);"><span>'+a.type+(a.channel?' · '+a.channel:'')+'</span><span>'+dt+'</span></div>'
        +(a.content?'<div style="font-size:12px;margin-top:4px;">'+a.content+'</div>':'')+'</div>';
    }).join('');
  });
}
function updateSentTodayCount(){
  var el=document.getElementById('ld2');
  if(!el)return;
  dbAll('lead_activity').then(function(all){
    var td=new Date().toISOString().slice(0,10);
    var cnt=all.filter(function(a){return (a.created_at||'').slice(0,10)===td;}).length;
    el.textContent=cnt;
  });
}

// ---- Send Log tab (who got what, when — searchable + summarized) ----
function renderSendLog(){
  var qEl=document.getElementById('ldLogSrch');
  var q=qEl?qEl.value.toLowerCase():'';
  dbAll('lead_activity').then(function(all){
    var list=all.slice().sort(function(a,b){return (b.ts||0)-(a.ts||0);});
    if(q)list=list.filter(function(a){return ((a.contact_name||'')+(a.contact_phone||'')).toLowerCase().indexOf(q)>-1;});
    var el=document.getElementById('ldloglist');
    var sum=document.getElementById('ldLogSummary');
    if(q&&list.length){
      var byType={};
      list.forEach(function(a){byType[a.type]=(byType[a.type]||0)+1;});
      sum.style.display='block';
      sum.innerHTML='<div style="font-size:13px;font-weight:700;margin-bottom:8px;">Summary for "'+q+'"</div>'
        +Object.keys(byType).map(function(k){return '<div class="rr"><span class="rk">'+k+'</span><span class="rv">'+byType[k]+'</span></div>';}).join('')
        +'<div class="rtot"><span>Total interactions</span><span>'+list.length+'</span></div>';
    } else if(sum){ sum.style.display='none'; }
    if(!el)return;
    if(!list.length){el.innerHTML='<div class="empty"><div class="emico">🗂️</div><div class="emtxt">No activity logged yet</div></div>';return;}
    el.innerHTML=list.map(function(a){
      var dt=a.created_at?new Date(a.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      return '<div class="li" style="cursor:default;"><div class="liav" style="background:var(--s2);">'+((a.contact_name||'?')[0]||'?').toUpperCase()+'</div>'
        +'<div class="libody"><div class="liname">'+(a.contact_name||'Unknown')+'</div>'
        +'<div class="limeta">'+a.type+(a.channel?' via '+a.channel:'')+' · '+(a.contact_phone||'')+'</div></div>'
        +'<div class="lirght"><div class="lidate">'+dt+'</div></div></div>';
    }).join('');
  });
}

// ---- Voice message composer (Speech-to-text + Gemini) ----
var voiceRecog=null,voiceTargetId=null;
function getSpeechRecognizer(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Voice input not supported in this browser — try Chrome',true);return null;}
  var r=new SR();
  r.lang='en-IN';r.continuous=true;r.interimResults=false;
  return r;
}
function openVoiceCompose(leadId){
  voiceTargetId=leadId;
  var l=allLeads.find(function(x){return x.id===leadId;});
  document.getElementById('voiceTargetLbl').textContent='To: '+(l?l.n+' ('+(l.ph||'no phone on file')+')':'—');
  document.getElementById('voiceTranscript').value='';
  document.getElementById('voiceFinal').value='';
  openM('mvoice');
}
function toggleVoiceRecord(){
  var btn=document.getElementById('voiceRecBtn');
  if(voiceRecog){voiceRecog.stop();voiceRecog=null;btn.textContent='🎤 Tap to Speak';return;}
  voiceRecog=getSpeechRecognizer();
  if(!voiceRecog)return;
  btn.textContent='⏹️ Stop';
  var ta=document.getElementById('voiceTranscript');
  voiceRecog.onresult=function(e){
    var t='';
    for(var i=e.resultIndex;i<e.results.length;i++){t+=e.results[i][0].transcript+' ';}
    ta.value=(ta.value+' '+t).trim();
  };
  voiceRecog.onerror=function(){btn.textContent='🎤 Tap to Speak';voiceRecog=null;};
  voiceRecog.onend=function(){if(voiceRecog){btn.textContent='🎤 Tap to Speak';voiceRecog=null;}};
  voiceRecog.start();
}
function callGemini(prompt){
  var key=localStorage.getItem('wrc_ai_key')||'';
  if(!key)return Promise.reject('add your free Gemini key in Settings');
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+key,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.candidates&&d.candidates[0]&&d.candidates[0].content)return d.candidates[0].content.parts[0].text;
    throw (d.error?d.error.message:'no AI response');
  });
}
function aiRestructureVoice(){
  var t=document.getElementById('voiceTranscript').value.trim();
  if(!t){toast('Speak or type something first',true);return;}
  var out=document.getElementById('voiceFinal');
  out.value='Thinking...';
  var l=allLeads.find(function(x){return x.id===voiceTargetId;});
  var prompt='Rewrite the following rough spoken note into a short, professional, polite WhatsApp message for a prospective medical/MBBS admission lead named '+(l?l.n:'the recipient')+'. Keep it concise and warm, same language as the input. Do not use placeholders like [Name]. Only output the final message text.\n\nRough note: '+t;
  callGemini(prompt).then(function(txt){out.value=txt.trim();}).catch(function(err){out.value=t;toast('AI unavailable ('+err+') — using raw transcript',true);});
}
function sendVoiceMessage(){
  var msg=(document.getElementById('voiceFinal').value||'').trim()||document.getElementById('voiceTranscript').value.trim();
  if(!msg){toast('Nothing to send',true);return;}
  var l=allLeads.find(function(x){return x.id===voiceTargetId;});
  if(!l||!l.ph){toast('No phone number for this lead',true);return;}
  window.open('https://wa.me/'+l.ph.replace(/\D/g,'')+'?text='+encodeURIComponent(msg),'_blank');
  logLeadActivity(voiceTargetId,'Text Message','whatsapp',msg.slice(0,200));
  closeM('mvoice');
}

// ---- Call summary recorder (post-call, manual voice → AI summary) ----
var callRecog=null,callTargetId=null;
function openCallSummary(leadId){
  callTargetId=leadId;
  var l=allLeads.find(function(x){return x.id===leadId;});
  document.getElementById('callTargetLbl').textContent='For: '+(l?l.n+' ('+(l.ph||'')+')':'—');
  document.getElementById('callTranscript').value='';
  document.getElementById('callFinal').value='';
  openM('mcallsum');
}
function toggleCallRecord(){
  var btn=document.getElementById('callRecBtn');
  if(callRecog){callRecog.stop();callRecog=null;btn.textContent='🎤 Tap to Speak Summary';return;}
  callRecog=getSpeechRecognizer();
  if(!callRecog)return;
  btn.textContent='⏹️ Stop';
  var ta=document.getElementById('callTranscript');
  callRecog.onresult=function(e){
    var t='';
    for(var i=e.resultIndex;i<e.results.length;i++){t+=e.results[i][0].transcript+' ';}
    ta.value=(ta.value+' '+t).trim();
  };
  callRecog.onerror=function(){btn.textContent='🎤 Tap to Speak Summary';callRecog=null;};
  callRecog.onend=function(){if(callRecog){btn.textContent='🎤 Tap to Speak Summary';callRecog=null;}};
  callRecog.start();
}
function aiSummarizeCall(){
  var t=document.getElementById('callTranscript').value.trim();
  if(!t){toast('Speak the summary first',true);return;}
  var out=document.getElementById('callFinal');
  out.value='Thinking...';
  var l=allLeads.find(function(x){return x.id===callTargetId;});
  var prompt='Turn this rough spoken note about a phone/WhatsApp call with a lead named '+(l?l.n:'')+' into a short, structured professional call-summary with sections: Key Points, Concerns Raised, Next Follow-up Action. Keep it brief.\n\nRough note: '+t;
  callGemini(prompt).then(function(txt){out.value=txt.trim();}).catch(function(err){out.value=t;toast('AI unavailable ('+err+') — using raw transcript',true);});
}
function saveCallSummary(){
  var summary=(document.getElementById('callFinal').value||'').trim()||document.getElementById('callTranscript').value.trim();
  if(!summary){toast('Nothing to save',true);return;}
  logLeadActivity(callTargetId,'Call Summary','call',summary);
  closeM('mcallsum');
  toast('✅ Call summary saved to lead record');
}

// ---- Media sharing (gallery/drive file → WhatsApp) ----
var mediaTargetIds=[],pickedMediaFile=null;
function openMediaShare(leadId){
  mediaTargetIds=leadId?[leadId]:getSelectedLeadIds();
  if(!mediaTargetIds.length){toast('Select at least one contact first',true);return;}
  var names=mediaTargetIds.map(function(id){var l=allLeads.find(function(x){return x.id===id;});return l?l.n:'';}).join(', ');
  document.getElementById('mediaTargetLbl').textContent='To: '+names;
  document.getElementById('mediaFileTxt').textContent='Tap to pick from Gallery / Drive / Files';
  document.getElementById('mediaCaption').value='';
  pickedMediaFile=null;
  openM('mmedia');
}
function handleMediaPick(event){
  var f=event.target.files[0];
  if(!f)return;
  pickedMediaFile=f;
  document.getElementById('mediaFileTxt').textContent='✓ '+f.name;
}
function shareMediaNow(){
  if(!pickedMediaFile){toast('Pick a file first',true);return;}
  var type=document.querySelector('input[name="mty"]:checked').value;
  var caption=document.getElementById('mediaCaption').value.trim();
  var l=allLeads.find(function(x){return x.id===mediaTargetIds[0];});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[pickedMediaFile]})){
    navigator.share({files:[pickedMediaFile],title:type,text:caption||('Sharing '+type)})
      .then(function(){
        mediaTargetIds.forEach(function(id){logLeadActivity(id,type,'whatsapp/share',caption||pickedMediaFile.name);});
        toast('✅ Shared! Choose WhatsApp in the share sheet.');
        closeM('mmedia');
      }).catch(function(){});
  } else {
    toast('Direct file-share not supported here — opening WhatsApp chat, please attach the file manually.',true);
    if(l&&l.ph)window.open('https://wa.me/'+l.ph.replace(/\D/g,'')+(caption?'?text='+encodeURIComponent(caption):''),'_blank');
    mediaTargetIds.forEach(function(id){logLeadActivity(id,type,'whatsapp(manual attach)',caption||pickedMediaFile.name);});
    closeM('mmedia');
  }
}

// ---- Guided bulk WhatsApp send (one-by-one, since true auto-bulk isn't allowed by WhatsApp) ----
var bulkQueue=[],bulkIdx=0,bulkMessageText='';
function openBulkShare(){
  var ids=getSelectedLeadIds();
  if(!ids.length){toast('Select at least one contact first',true);return;}
  bulkQueue=ids;bulkIdx=0;
  document.getElementById('bulkMsg').value='';
  document.getElementById('bulkProgress').textContent='';
  document.getElementById('bulkNextBtn').style.display='none';
  openM('mbulk');
}
function startBulkSend(){
  bulkMessageText=document.getElementById('bulkMsg').value.trim();
  if(!bulkMessageText){toast('Type a message first',true);return;}
  bulkIdx=0;
  bulkSendCurrent();
}
function bulkSendCurrent(){
  if(bulkIdx>=bulkQueue.length){
    document.getElementById('bulkProgress').textContent='✅ Done! Sent to '+bulkQueue.length+' contacts.';
    document.getElementById('bulkNextBtn').style.display='none';
    return;
  }
  var l=allLeads.find(function(x){return x.id===bulkQueue[bulkIdx];});
  document.getElementById('bulkProgress').textContent='Contact '+(bulkIdx+1)+' of '+bulkQueue.length+': '+(l?l.n:'')+(l&&l.ph?' ('+l.ph+')':' — no phone, skipping');
  document.getElementById('bulkNextBtn').style.display='inline-flex';
  if(l&&l.ph){
    window.open('https://wa.me/'+l.ph.replace(/\D/g,'')+'?text='+encodeURIComponent(bulkMessageText),'_blank');
  } else {
    bulkIdx++;bulkSendCurrent();
  }
}
function bulkSendNext(){
  var l=allLeads.find(function(x){return x.id===bulkQueue[bulkIdx];});
  if(l)logLeadActivity(l.id,'Text Message','whatsapp',bulkMessageText.slice(0,200));
  bulkIdx++;
  bulkSendCurrent();
}

// ---- Virtual meeting link generator ----
var meetTargetId=null;
function openMeetLink(leadId){
  meetTargetId=leadId;
  var l=allLeads.find(function(x){return x.id===leadId;});
  document.getElementById('meetTargetLbl').textContent='For: '+(l?l.n+' ('+(l.ph||l.em||'')+')':'—');
  document.getElementById('meetLink').value='';
  openM('mmeet');
}
function generateMeetLink(){
  var type=document.querySelector('input[name="mtype"]:checked').value;
  var link='';
  if(type==='jitsi'){
    var room='WRC-'+Math.random().toString(36).slice(2,10);
    link='https://meet.jit.si/'+room;
  } else if(type==='gmeet'){
    link='https://meet.google.com/new';
    toast('Google Meet opens a fresh room — you must be signed into Google when you open it.');
  } else {
    var l=allLeads.find(function(x){return x.id===meetTargetId;});
    link=l&&l.ph?'https://wa.me/'+l.ph.replace(/\D/g,''):'';
  }
  document.getElementById('meetLink').value=link;
}
function copyMeetLink(){
  var v=document.getElementById('meetLink').value;
  if(!v){toast('Generate a link first',true);return;}
  navigator.clipboard.writeText(v).then(function(){toast('✅ Link copied');});
}
function sendMeetLinkWA(){
  var v=document.getElementById('meetLink').value;
  if(!v){toast('Generate a link first',true);return;}
  var l=allLeads.find(function(x){return x.id===meetTargetId;});
  if(!l||!l.ph){toast('No phone for this contact',true);return;}
  var msg='Hi '+l.n+', please join our virtual meeting here: '+v;
  window.open('https://wa.me/'+l.ph.replace(/\D/g,'')+'?text='+encodeURIComponent(msg),'_blank');
  logLeadActivity(meetTargetId,'Meeting Link','whatsapp',v);
  closeM('mmeet');
}
// Standalone meeting-link generator used inside the Add Visit (virtual) form
function generateVisitMeetLink(){
  var room='WRC-'+Math.random().toString(36).slice(2,10);
  document.getElementById('vMeetLink').value='https://meet.jit.si/'+room;
  toast('✅ Instant meeting link generated');
}
function sendVisitMeetLinkWA(){
  var link=document.getElementById('vMeetLink').value;
  var ph=(document.getElementById('vph').value||'').replace(/\D/g,'');
  if(!link){toast('Generate a link first',true);return;}
  if(!ph){toast('Enter the visitor\'s phone number first',true);return;}
  var name=document.getElementById('vn').value||'there';
  window.open('https://wa.me/'+ph+'?text='+encodeURIComponent('Hi '+name+', please join our virtual meeting here: '+link),'_blank');
}

// ---- Lead report generation (view/edit/export/copy/send) ----
function generateLeadReport(){
  var ids=getSelectedLeadIds();
  if(!ids.length){toast('Select contacts from the Contacts tab first',true);return;}
  dbAll('lead_activity').then(function(allAct){
    var leads=ids.map(function(id){return allLeads.find(function(x){return x.id===id;});}).filter(Boolean);
    var lines=['📊 LEAD REPORT — '+new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}),
      'Prepared by: '+CU.name+' ('+(CU.org||'')+')',''];
    leads.forEach(function(l){
      var acts=allAct.filter(function(a){return a.contact_id===l.id;});
      lines.push('— '+l.n+' | '+(l.ph||'no phone')+' | '+(l.co||'')+' | Status: '+(l.st||'New'));
      if(l.nt)lines.push('  Notes: '+l.nt);
      lines.push('  Interactions: '+acts.length+(acts.length?(' (latest: '+acts[acts.length-1].type+')'):''));
      lines.push('');
    });
    var text=lines.join('\n');
    var out=document.getElementById('ldReportOut');
    out.innerHTML='<div class="fld"><label>Report (editable)</label><textarea class="gta" id="ldReportText" style="min-height:220px;">'+text+'</textarea></div>'
      +'<div class="brow">'
      +'<button class="gbtn gbtn-tl gbtn-sm" onclick="copyLeadReport()">📋 Copy</button>'
      +'<button class="gbtn gbtn-pu gbtn-sm" onclick="exportLeadReportExcel()">📥 Export Excel</button>'
      +'<button class="gbtn gbtn-gl gbtn-sm" onclick="sendLeadReportWA()">💬 Send via WhatsApp</button>'
      +'<button class="gbtn gbtn-or gbtn-sm" onclick="sendLeadReportEmail()">✉️ Send via Email</button>'
      +'</div>';
    window._ldReportLeads=leads;
    saveLeadReportRecord(text,ids);
  });
}
function saveLeadReportRecord(text,ids){
  var rec={title:'Lead Report '+new Date().toLocaleDateString('en-IN'),content:text,contact_ids:JSON.stringify(ids),
    created_by:CU.name,user_org:CU.orgKey,created_at:new Date().toISOString()};
  dbAdd('lead_reports',rec).then(function(id){rec.id=id;rec.external_id=id;dbPut('lead_reports',rec);cPost('lead_reports',rec);});
}
function copyLeadReport(){
  var t=document.getElementById('ldReportText').value;
  navigator.clipboard.writeText(t).then(function(){toast('✅ Report copied');});
}
function exportLeadReportExcel(){
  var leads=window._ldReportLeads||[];
  if(!leads.length){toast('Generate a report first',true);return;}
  var rows=leads.map(function(l){return {Name:l.n,Phone:l.ph,Email:l.em,College:l.co,Status:l.st,Notes:l.nt||'',Source:l.src||''};});
  var ws=XLSX.utils.json_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Lead Report');
  XLSX.writeFile(wb,'Lead_Report_'+new Date().toISOString().slice(0,10)+'.xlsx');
}
function sendLeadReportWA(){
  var t=document.getElementById('ldReportText').value;
  if(!t){toast('Nothing to send',true);return;}
  var single=(window._ldReportLeads||[])[0];
  var ph=single&&single.ph?single.ph.replace(/\D/g,''):'';
  window.open('https://wa.me/'+(ph?ph:'')+'?text='+encodeURIComponent(t),'_blank');
}
function sendLeadReportEmail(){
  var t=document.getElementById('ldReportText').value;
  if(!t){toast('Nothing to send',true);return;}
  var single=(window._ldReportLeads||[])[0];
  var to=single&&single.em?single.em:'';
  window.open('mailto:'+to+'?subject='+encodeURIComponent('Lead Report — '+(CU.org||'WRC Nepal'))+'&body='+encodeURIComponent(t),'_blank');
}

// ============================================================
// PWA
// ============================================================
var deferredPrompt=null;
function setupPWA(){
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();deferredPrompt=e;
    var c=document.getElementById('pwabtn');
    if(c)c.innerHTML='<button class="gbtn gbtn-pu gbtn-full" onclick="instPWA()">📲 Install App Now</button>';
    var ib=document.getElementById('ibc');
    if(ib)ib.innerHTML='<div class="ibanner"><div style="font-size:24px;">📲</div><div class="ibtxt"><strong>Install as App</strong>Works offline on phone</div><button class="gbtn gbtn-pu gbtn-sm" onclick="instPWA()">Install</button></div>';
  });
}
function instPWA(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(r){
      if(r.outcome==='accepted')toast('✅ App installed!');
      deferredPrompt=null;
    });
  }
}

// ============================================================
// SERVICE WORKER
// ============================================================
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(function(){});
}

// ============================================================
// INIT
// ============================================================
initDB().then(function(){
  populateLoginDropdowns();
  checkAuth();
}).catch(function(e){
  console.error('DB error:',e);
  populateLoginDropdowns();
  checkAuth();
});
