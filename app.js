// Prime Tool — Ahmed (Firebase + QR + i18n)

// 1) THEME & I18N
const translations = {
  ar:{ login:"تسجيل الدخول", register:"تسجيل حساب جديد", welcome:"مرحباً", scan:"مسح QR", logout:"خروج", admin:"لوحة الأدمن", unlock:"فتح", pending:"طلبات التسجيل", tools:"الأدوات", history:"السجل", settings:"الإعدادات", scanTitle:"مسح QR" },
  en:{ login:"Login", register:"Create Account", welcome:"Welcome", scan:"Scan QR", logout:"Logout", admin:"Admin Panel", unlock:"Unlock", pending:"Pending Requests", tools:"Tools", history:"History", settings:"Settings", scanTitle:"QR Scanner" },
  de:{ login:"Anmelden", register:"Konto erstellen", welcome:"Willkommen", scan:"QR scannen", logout:"Abmelden", admin:"Adminbereich", unlock:"Entsperren", pending:"Ausstehende Anträge", tools:"Werkzeuge", history:"Verlauf", settings:"Einstellungen", scanTitle:"QR-Scanner" }
};

let currentLang = 'ar';
function applyLang(){
  const t = translations[currentLang];
  const ids = {
    't-login':t.login,'t-register':t.register,'t-welcome':t.welcome,'t-scan':t.scan,
    't-logout':t.logout,'t-admin':t.admin,'t-unlock':t.unlock,'t-pending':t.pending,
    't-tools':t.tools,'t-history':t.history,'t-settings':t.settings,'t-scanTitle':t.scanTitle
  };
  Object.keys(ids).forEach(id=>{
    if(document.getElementById(id)) document.getElementById(id).textContent = ids[id];
  });
  document.documentElement.setAttribute('dir', currentLang==='ar'?'rtl':'ltr');
}
document.querySelectorAll('.lang').forEach(el=>{
  el.addEventListener('click',()=>{ currentLang = el.dataset.lang; applyLang(); });
});

// THEME TOGGLE
document.getElementById('themeToggle').addEventListener('click',()=>{
  document.body.dataset.theme =
  document.body.dataset.theme==='dark'?'light':'dark';
});

// 2) FIREBASE INIT
const firebaseConfig = {
  apiKey: "AIzaSyCEbKMZHqJQ-UU6Qco7FlAue0E4mCWd4UY",
  authDomain: "prime-tools99.firebaseapp.com",
  projectId: "prime-tools99",
  storageBucket: "prime-tools99.firebasestorage.app",
  messagingSenderId: "112360376529",
  appId: "1:112360376529:web:f5fac1d99a87f7f5a85df0",
  measurementId: "G-WR1SJ3CZ3K"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
// 3) AUTH
const authScreen=document.getElementById('authScreen');
const userScreen=document.getElementById('userScreen');
const adminScreen=document.getElementById('adminScreen');
const authMsg=document.getElementById('authMsg');

async function handleRegister(){
  const firstName=document.getElementById('firstName').value.trim();
  const lastName=document.getElementById('lastName').value.trim();
  const address=document.getElementById('address').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPass').value;

  if(!firstName||!lastName||!address||!email||!pass){
    authMsg.textContent="املأ جميع البيانات"; return;
  }
  try{
    const res=await auth.createUserWithEmailAndPassword(email,pass);
    await db.collection("users").doc(res.user.uid).set({
      firstName,lastName,address,email,status:"pending"
    });
    authMsg.textContent="تم التسجيل بنجاح بانتظار الموافقة ✅";
  }catch(e){authMsg.textContent=e.message;}
}
document.getElementById('registerBtn').onclick=handleRegister;

async function handleLogin(){
  const email=document.getElementById('email').value;
  const pass=document.getElementById('password').value;
  try{
    await auth.signInWithEmailAndPassword(email,pass);
  }catch(e){authMsg.textContent=e.message;}
}
document.getElementById('loginBtn').onclick=handleLogin;

auth.onAuthStateChanged(async user=>{
  if(!user){
    authScreen.classList.remove("hidden");
    userScreen.classList.add("hidden");
    adminScreen.classList.add("hidden");
    return;
  }
  const doc=await db.collection("users").doc(user.uid).get();
  const data=doc.data();
  if(!data||data.status!=="approved"){
    authMsg.textContent="حسابك بانتظار الموافقة";
    return;
  }
  authScreen.classList.add("hidden");
  userScreen.classList.remove("hidden");
});

// LOGOUT
document.getElementById('logoutBtn').onclick=()=>auth.signOut();

// 4) ADMIN PANEL
document.getElementById('appTitle').onclick=()=>{
  adminScreen.classList.remove("hidden");
};
document.getElementById('closeAdmin').onclick=()=>{
  adminScreen.classList.add("hidden");
};
document.getElementById('unlockBtn').onclick=async()=>{
  const pin=document.getElementById('pinInput').value;
  const doc=await db.collection("config").doc("admin").get();
  if(doc.exists && pin===doc.data().pin){
    document.getElementById('adminBody').classList.remove("hidden");
  }else{
    document.getElementById('pinStatus').textContent="PIN خطأ";
  }
};// ===== Admin: Pending users (قبول/رفض) =====
async function loadPending(){
  const box = document.getElementById('pendingList');
  if(!box) return;
  box.innerHTML = '';
  const q = await db.collection('users').where('status','==','pending').get();
  if(q.empty){ box.innerHTML = '<div class="item"><span>لا توجد طلبات</span></div>'; return; }
  q.forEach(doc=>{
    const u = doc.data();
    const row = document.createElement('div');
    row.className='item';
    row.innerHTML = `
      <div><b>${u.firstName} ${u.lastName}</b><div class="muted">${u.email} — ${u.address}</div></div>
      <div>
        <button class="ghost" data-approve>قبول</button>
        <button class="ghost" data-reject>رفض</button>
      </div>`;
    row.querySelector('[data-approve]').onclick = async()=>{
      await db.collection('users').doc(doc.id).update({status:'approved'});
      loadPending();
    };
    row.querySelector('[data-reject]').onclick = async()=>{
      await db.collection('users').doc(doc.id).update({status:'rejected'});
      loadPending();
    };
    box.appendChild(row);
  });
}

// ===== أدوات (إضافة/عرض/حذف + توليد QR صغير) =====
document.getElementById('addTool').onclick = async ()=>{
  const name = document.getElementById('toolName').value.trim();
  if(!name) return;
  const ref = db.collection('tools').doc();
  await ref.set({
    name, code:`TOOL:${ref.id}`, status:'available', currentHolder:null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById('toolName').value='';
  loadTools();
};

async function loadTools(){
  const box = document.getElementById('toolsList');
  if(!box) return;
  box.innerHTML = '';
  const q = await db.collection('tools').orderBy('createdAt','desc').get();
  if(q.empty){ box.innerHTML = '<div class="item"><span>لا أدوات بعد</span></div>'; return; }
  q.forEach(doc=>{
    const t = doc.data();
    const row = document.createElement('div');
    row.className='item';
    row.innerHTML = `
      <div><b>${t.name}</b><div class="muted">${t.code} — الحالة: ${t.status}</div></div>
      <div>
        <div id="qr-${doc.id}" class="badge">QR</div>
        <button class="ghost" data-del>حذف</button>
      </div>`;
    row.querySelector('[data-del]').onclick = async ()=>{
      await db.collection('tools').doc(doc.id).delete();
      loadTools();
    };
    box.appendChild(row);
    setTimeout(()=>{ new QRCode(document.getElementById('qr-'+doc.id), {text:t.code, width:64, height:64}); },0);
  });
}

// ===== السجل =====
async function loadHistory(){
  const box = document.getElementById('historyList');
  if(!box) return;
  box.innerHTML='';
  const q = await db.collection('borrows').orderBy('createdAt','desc').limit(50).get();
  if(q.empty){ box.innerHTML='<div class="item"><span>لا سجلات</span></div>'; return; }
  q.forEach(doc=>{
    const h = doc.data();
    const row = document.createElement('div');
    row.className='item';
    const when = h.createdAt?.toDate?.().toLocaleString?.() || '';
    row.innerHTML = `<div><b>${h.action==='out'?'أخذ':'إرجاع'}</b> — ${h.toolName||h.toolId}</div>
                     <div class="muted">${h.userName||h.uid} — ${when}</div>`;
    box.appendChild(row);
  });
}

// ===== ماسح QR + إدخال يدوي =====
const scanModal = document.getElementById('scanModal');
document.getElementById('openScanner').onclick = ()=>{
  scanModal.showModal();
  // الكاميرا تعمل فقط عبر HTTPS أو localhost
  const scanner = new Html5QrcodeScanner('qrReader',{fps:10, qrbox:250});
  scanner.render(async (text)=>{
    await handleToolCode(text);
    scanner.clear().catch(()=>{});
    scanModal.close();
  }, ()=>{});
};
document.getElementById('closeScan').onclick = ()=> scanModal.close();

document.getElementById('manualBtn').onclick = async ()=>{
  const code = document.getElementById('manualCode').value.trim();
  if(code) await handleToolCode(code);
};

async function handleToolCode(raw){
  const user = auth.currentUser;
  if(!user){ alert('سجّل الدخول أولاً'); return; }
  const toolId = raw.startsWith('TOOL:') ? raw.split(':')[1] : raw;
  const ref = db.collection('tools').doc(toolId);
  const snap = await ref.get();
  if(!snap.exists){ alert('أداة غير مسجلة'); return; }
  const t = snap.data();
  const u = (await db.collection('users').doc(user.uid).get()).data();
  if(t.status==='available'){
    await ref.update({
      status:'checked_out',
      currentHolder:{uid:user.uid,name:`${u.firstName} ${u.lastName}`, timestamp:firebase.firestore.FieldValue.serverTimestamp()}
    });
    await db.collection('borrows').add({
      toolId, toolName:t.name, uid:user.uid, userName:`${u.firstName} ${u.lastName}`,
      action:'out', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('تم إعارة الأداة ✅');
  }else{
    await ref.update({ status:'available', currentHolder:null });
    await db.collection('borrows').add({
      toolId, toolName:t.name, uid:user.uid, userName:`${u.firstName} ${u.lastName}`,
      action:'in', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('تم إرجاع الأداة ✅');
  }
  loadTools(); loadHistory();
}

// ===== تبويبات الأدمن + حفظ PIN =====
document.querySelectorAll('.tab').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tabcontent').forEach(c=>c.classList.add('hidden'));
    document.getElementById('tab-'+btn.dataset.tab).classList.remove('hidden');
  };
});
document.getElementById('savePin').onclick = async ()=>{
  const newPin = document.getElementById('newPin').value.trim();
  if(!newPin) return;
  await db.collection('config').doc('admin').set({pin:newPin},{merge:true});
  alert('تم تحديث PIN');
};

// ===== بعد فتح الأدمن بالـ PIN، حمّل البيانات =====
document.getElementById('unlockBtn').addEventListener('click', ()=>{
  // بعد نجاح الفتح (الكود الأساسي عندك), نادِ:
  setTimeout(()=>{ loadPending(); loadTools(); loadHistory(); }, 300);
});

// تطبيق اللغة أول مرة
applyLang();