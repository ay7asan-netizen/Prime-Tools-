// التحقق إن المستخدم أدمن
firebase.auth().onAuthStateChanged(async user => {
  if (!user) return window.location = "index.html";

  const doc = await db.collection("users").doc(user.uid).get();
  if (!doc.exists || !doc.data().isAdmin) {
    alert("ماعندك صلاحية الدخول 😎");
    return window.location = "index.html";
  }

  loadUsers();
  loadTools();
});


// عرض المستخدمين
async function loadUsers() {
  const usersDiv = document.getElementById("users");
  const users = await db.collection("users").get();
  
  usersDiv.innerHTML = "";
  users.forEach(doc => {
    const data = doc.data();
    usersDiv.innerHTML += `
      <div class="user-item">
        <p>👤 الاسم: ${data.firstName} ${data.lastName}</p>
        <p>📧 الإيميل: ${data.email}</p>
        <p>✅ حالة الأدمن: ${data.isAdmin ? "نعم" : "لا"}</p>
        <button onclick="makeAdmin('${doc.id}')">جعله أدمن</button>
        <button onclick="removeUser('${doc.id}')">حذف</button>
        <hr>
      </div>
    `;
  });
}


// جعل مستخدم أدمن
async function makeAdmin(uid) {
  await db.collection("users").doc(uid).update({
    isAdmin: true
  });
  alert("تم إعطاء صلاحيات أدمن ✅");
  loadUsers();
}


// حذف مستخدم
async function removeUser(uid) {
  if (!confirm("هل تريد حذف المستخدم؟")) return;
  await db.collection("users").doc(uid).delete();
  alert("تم حذف المستخدم ✅");
  loadUsers();
}


// عرض الأدوات (Tools)
async function loadTools() {
  const toolsDiv = document.getElementById("tools");
  const tools = await db.collection("tools").get();

  toolsDiv.innerHTML = "";
  tools.forEach(doc => {
    const data = doc.data();
    toolsDiv.innerHTML += `
      <div class="tool-item">
        <p>🛠️ اسم الأداة: ${data.name}</p>
        <p>🔢 رقم الأداة: ${data.toolId}</p>
        <button onclick="deleteTool('${doc.id}')">حذف</button>
        <hr>
      </div>
    `;
  });
}


// إضافة أداة جديدة
async function addTool() {
  const name = document.getElementById("toolName").value;
  const id = document.getElementById("toolId").value;

  if (!name || !id) return alert("ادخل اسم الأداة والرقم ✅");

  await db.collection("tools").add({
    name: name,
    toolId: id
  });

  alert("تمت الإضافة ✅");
  document.getElementById("toolName").value = "";
  document.getElementById("toolId").value = "";
  loadTools();
}


// حذف أداة
async function deleteTool(uid) {
  await db.collection("tools").doc(uid).delete();
  alert("تم حذف الأداة ✅");
  loadTools();
}


// تسجيل خروج
function logout() {
  firebase.auth().signOut();
}