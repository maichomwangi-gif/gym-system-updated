/* ============ DATA LAYER ============ */
const KEY = "gmis_data_v1";
const SESSION = "gmis_session_v1";
const NOTICE_KEY = "gmis_notice_v1";

const PACKAGE_CATALOG = {
  Basic: { amount: 10000, days: 30 },
  Standard: { amount: 20000, days: 60 },
  Premium: { amount: 30000, days: 90 },
};

function uid(){ return Math.random().toString(36).slice(2,10); }
function formatDateLocal(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function today(){ return formatDateLocal(new Date()); }
function nowTime(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dateOffset(days){ const d = new Date(); d.setDate(d.getDate() + days); return formatDateLocal(d); }
function parseDate(value){ return value ? new Date(value + "T00:00:00") : null; }
function daysBetween(start, end){ return Math.ceil((end.getTime() - start.getTime()) / 86400000); }
function formatMoney(value){ return Number(value || 0).toLocaleString(); }
function weekStart(date = new Date()){
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekDates(){
  const start = weekStart();
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return formatDateLocal(d);
  });
}

function seed(){
  const tJohn = uid(), tMary = uid();
  const mAlice = uid(), mBob = uid();
  return {
    users: [
      { id: uid(), username:"micky", password:"micky123", role:"admin", name:"Administrator", refId:null },
      { id: uid(), username:"john",  password:"trainer123", role:"trainer", name:"John Smith", refId:tJohn },
      { id: uid(), username:"mary",  password:"trainer123", role:"trainer", name:"Mary Wanjiku", refId:tMary },
      { id: uid(), username:"alice", password:"member123", role:"member", name:"Alice Achieng", refId:mAlice },
      { id: uid(), username:"bob",   password:"member123", role:"member", name:"Bob Kamau", refId:mBob },
    ],
    trainers: [
      { id:tJohn, name:"John Smith", phone:"0711000001", specialty:"Strength training" },
      { id:tMary, name:"Mary Wanjiku", phone:"0711000002", specialty:"Cardio & HIIT" },
    ],
    members: [
      { id:mAlice, name:"Alice Achieng", phone:"0722111111", age:26, gender:"Female", plan:"Premium", packageType:"Premium", packageStart:dateOffset(-15), packageExpires:dateOffset(165), trainerId:tJohn, joined:today() },
      { id:mBob,   name:"Bob Kamau",     phone:"0722222222", age:31, gender:"Male",   plan:"Basic",   packageType:"Basic",   packageStart:dateOffset(-20), packageExpires:dateOffset(10),  trainerId:tMary, joined:today() },
    ],
    attendance: [
      { id:uid(), memberId:mAlice, date:dateOffset(-6), time:"07:00", timeOut:null },
      { id:uid(), memberId:mAlice, date:dateOffset(-4), time:"07:15", timeOut:"17:30" },
      { id:uid(), memberId:mAlice, date:dateOffset(-1), time:"06:50", timeOut:"20:10" },
      { id:uid(), memberId:mBob,   date:dateOffset(-2), time:"18:05", timeOut:null },
    ],
    payments: [
      { id:uid(), memberId:mAlice, amount:9000, method:"M-Pesa", date:dateOffset(-15), packageType:"Premium" },
      { id:uid(), memberId:mBob,   amount:2000, method:"Cash",   date:dateOffset(-20), packageType:"Basic" },
    ],
  };
}

let data = load();
let session = JSON.parse(localStorage.getItem(SESSION) || "null");
ensureAdminAccount();

function normalizeAdminCredentials(dataSet){
  if(!dataSet || !Array.isArray(dataSet.users)) return dataSet;
  const admin = dataSet.users.find(u => u.role === "admin");
  if(admin){
    admin.username = "micky";
    admin.password = "micky123";
  } else {
    dataSet.users.unshift({ id: uid(), username:"micky", password:"micky123", role:"admin", name:"Administrator", refId:null });
  }
  return dataSet;
}

function ensureAdminAccount(){
  if(!data || !Array.isArray(data.users)) return null;
  let admin = data.users.find(u => u.role === "admin");
  if(!admin){
    admin = { id: uid(), username:"micky", password:"micky123", role:"admin", name:"Administrator", refId:null };
    data.users.unshift(admin);
  } else {
    admin.username = "micky";
    admin.password = "micky123";
    admin.role = "admin";
    admin.name = admin.name || "Administrator";
  }
  save();
  return admin;
}

function load(){
  const raw = localStorage.getItem(KEY);
  if(raw){
    try{
      return normalizeAdminCredentials(JSON.parse(raw));
    }catch(e){}
  }
  const d = seed(); localStorage.setItem(KEY, JSON.stringify(d)); return d;
}
function save(){ localStorage.setItem(KEY, JSON.stringify(data)); }
function setSession(s){ session = s; localStorage.setItem(SESSION, JSON.stringify(s)); }
function clearSession(){ session=null; localStorage.removeItem(SESSION); }

/* ============ AUTH ============ */
function login(){
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;
  ensureAdminAccount();
  const user = data.users.find(x => x.username===u && x.password===p);
  const fallbackAdmin = (u === "micky" && p === "micky123") ? data.users.find(x => x.role === "admin") : null;
  const loginUser = user || fallbackAdmin;
  if(!loginUser){ toast("Invalid credentials"); return; }
  setSession({ userId:loginUser.id });
  document.getElementById("loginPass").value="";
  bootApp();
}
function logout(){ clearSession(); location.reload(); }
function currentUser(){ return session ? data.users.find(u=>u.id===session.userId) : null; }

/* ============ TABS / NAV ============ */
const TABS_BY_ROLE = {
  admin:   [["dashboard","Dashboard"],["members","Members"],["trainers","Trainers"],["attendance","Attendance"],["payments","Payments"],["account","My Account"]],
  trainer: [["dashboard","Dashboard"],["members","My Members"],["attendance","Attendance"],["account","My Account"]],
  member:  [["memberdashboard","Dashboard"],["package","Package"],["myprofile","My Profile"],["account","My Account"]],
};

function buildTabs(){
  const u = currentUser();
  const tabs = TABS_BY_ROLE[u.role];
  const wrap = document.getElementById("tabs");
  if(!wrap || !tabs){ return; }
  wrap.innerHTML = "";
  tabs.forEach(([id,label],i)=>{
    const b = document.createElement("button");
    b.className = "tab" + (i===0?" active":"");
    b.textContent = label;
    b.onclick = ()=> showTab(id, b);
    wrap.appendChild(b);
  });
  showTab(tabs[0][0], wrap.firstChild);
}
function showTab(id, btn){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  if(btn) btn.classList.add("active");
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  const panel = document.getElementById("panel-"+id);
  if(panel) panel.classList.add("active");
  render();
}

/* ============ TOAST ============ */
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove("show"), 2000);
}

function readNoticeState(){
  return JSON.parse(localStorage.getItem(NOTICE_KEY) || "{}");
}
function writeNoticeState(state){
  localStorage.setItem(NOTICE_KEY, JSON.stringify(state));
}

/* ============ HELPERS ============ */
function memberName(id){ const m = data.members.find(x=>x.id===id); return m?m.name:"—"; }
function trainerName(id){ const t = data.trainers.find(x=>x.id===id); return t?t.name:"—"; }
function packageMeta(type){ return PACKAGE_CATALOG[type] || PACKAGE_CATALOG.Basic; }
function getPackageRemainingDays(member){
  if(!member) return null;
  if(typeof member.packageDaysRemaining === "number") return Math.max(0, member.packageDaysRemaining);
  if(!member.packageExpires) return null;
  const exp = parseDate(member.packageExpires);
  if(!exp) return null;
  return Math.max(0, daysBetween(new Date(), exp));
}
function setPackageRemainingDays(member, days){
  if(!member) return;
  const remaining = Math.max(0, Number(days) || 0);
  member.packageDaysRemaining = remaining;
  member.packageStatus = remaining > 0 ? "Active" : "Expired";
  member.packageExpires = remaining > 0 ? dateOffset(remaining) : today();
}
function packageDaysLeft(member){
  return getPackageRemainingDays(member);
}
function packageStatus(member){
  const daysLeft = packageDaysLeft(member);
  if(daysLeft === null) return { label:"No package", tone:"muted", daysLeft:null };
  if(daysLeft < 0) return { label:"Expired", tone:"danger", daysLeft };
  if(daysLeft <= 7) return { label:"Expiring soon", tone:"warn", daysLeft };
  return { label:"Active", tone:"ok", daysLeft };
}
function currentMember(){
  const me = currentUser();
  if(!me || me.role !== "member") return null;
  return data.members.find(x => x.id === me.refId) || null;
}
function syncMemberPackage(memberId, packageType, amount, method){
  const member = data.members.find(x => x.id === memberId);
  if(!member) return null;
  const meta = packageMeta(packageType);
  const start = today();
  member.packageType = packageType;
  member.plan = packageType;
  member.packageStart = start;
  member.packageExpires = dateOffset(meta.days);
  member.packageAmount = Number(amount || meta.amount);
  setPackageRemainingDays(member, meta.days);
  data.payments.push({
    id: uid(),
    memberId,
    amount: Number(amount || meta.amount),
    method,
    date: start,
    packageType,
  });
  save();
  return member;
}

function notifyPackageExpiry(member){
  const status = packageStatus(member);
  if(status.daysLeft === null || status.daysLeft > 7) return;
  const notices = readNoticeState();
  const key = `${member.id}:${member.packageExpires || "none"}`;
  if(notices[key]) return;
  notices[key] = true;
  writeNoticeState(notices);
  toast(status.daysLeft < 0 ? `Package expired for ${member.name}` : `${member.name}'s package expires in ${status.daysLeft} day(s)`);
}

function packageBadge(member){
  const status = packageStatus(member);
  return `<span class="badge ${status.tone}">${member.packageType || member.plan || "Basic"}</span>` +
    (status.daysLeft !== null ? ` <span class="mini ${status.tone}">${status.label}${status.daysLeft >= 0 ? ` (${status.daysLeft}d left)` : ` (${Math.abs(status.daysLeft)}d overdue)`}</span>` : "");
}

function workoutTrack(member){
  const days = weekDates();
  return days.map(date => {
    const count = data.attendance.filter(a => a.memberId === member.id && a.date === date).length;
    return { date, count };
  });
}

/* ============ MEMBERS ============ */
function enforcePhoneInput(){
  const field = document.activeElement;
  if(!field || !field.id.match(/^(mPhone|tPhone)$/)) return;
  field.value = field.value.replace(/\D/g, "").slice(0, 10);
}

function enforceUsernameInput(){
  const field = document.activeElement;
  if(!field || !field.id.match(/^(mUser|tUser|newUser)$/)) return;
  const value = field.value.replace(/[^A-Za-z]/g, "").slice(0, 30);
  field.value = value;
}

function enforceAgeInput(){
  const field = document.getElementById("mAge");
  if(!field) return;
  const value = field.value.replace(/\D/g, "");
  field.value = value && Number(value) > 0 ? String(Number(value)) : "";
}

function syncRegistrationFee(){
  const plan = document.getElementById("mPlan")?.value || "Basic";
  const feeField = document.getElementById("mRegFee");
  const fees = { Basic: 10000, Standard: 20000, Premium: 30000 };
  if(feeField){ feeField.value = fees[plan] || 10000; }
}

function addMember(){
  const u = currentUser(); if(u.role!=="admin"){ toast("Admins only"); return; }
  const name=g("mName"),phone=g("mPhone"),age=g("mAge"),gender=g("mGender"),plan=g("mPlan"),trainerId=g("mTrainer"),user=g("mUser"),pass=g("mPass");
  const regFee = Number(document.getElementById("mRegFee")?.value || 0);
  if(!name||!phone){ toast("Name and phone required"); return; }
  if(!/^\d{10}$/.test(phone)){ toast("Phone must be exactly 10 digits"); return; }
  const ageValue = Number(document.getElementById("mAge")?.value || 0);
  if(!Number.isInteger(ageValue) || ageValue <= 0){ toast("Age must be a positive whole number"); return; }
  if(!regFee || regFee <= 0){ toast("Registration fee is required"); return; }
  if(!user||!pass){ toast("Username & password required"); return; }
  if(data.users.some(x=>x.username===user)){ toast("Username taken"); return; }
  const id = uid();
  const meta = packageMeta(plan);
  data.members.push({
    id,
    name,
    phone,
    age:Number(age)||0,
    gender,
    plan,
    registrationFee: regFee,
    packageType:plan,
    packageStart:today(),
    packageExpires:dateOffset(meta.days),
    trainerId:trainerId||null,
    joined:today(),
  });
  data.users.push({id:uid(),username:user,password:pass,role:"member",name,refId:id});
  data.payments.push({
    id: uid(),
    memberId: id,
    amount: regFee,
    method: "Cash",
    date: today(),
    packageType: plan,
    paymentType: "registration",
  });
  save(); clearForm(["mName","mPhone","mAge","mUser","mPass"]);
  document.getElementById("mRegFee").value = "10000";
  toast("Member registered and payment recorded"); render();
}
function removeMember(id){
  const u = currentUser(); if(u.role!=="admin"){ toast("Admins only"); return; }
  if(!confirm("Remove this member?")) return;
  data.members = data.members.filter(m=>m.id!==id);
  data.users = data.users.filter(x=>!(x.role==="member" && x.refId===id));
  data.attendance = data.attendance.filter(a=>a.memberId!==id);
  data.payments = data.payments.filter(p=>p.memberId!==id);
  save(); toast("Member removed"); render();
}

/* ============ TRAINERS ============ */
function addTrainer(){
  const u = currentUser(); if(u.role!=="admin"){ toast("Admins only"); return; }
  const name=g("tName"),phone=g("tPhone"),spec=g("tSpec"),user=g("tUser"),pass=g("tPass");
  if(!name){ toast("Name required"); return; }
  if(!/^[A-Za-z]{1,30}$/.test(user || "")){ toast("Username must be letters only and up to 30 characters"); return; }
  if(!/^[A-Za-z]{1,30}$/.test(user || "")){ toast("Username must be letters only and up to 30 characters"); return; }
  if(!user||!pass){ toast("Username & password required"); return; }
  if(data.users.some(x=>x.username===user)){ toast("Username taken"); return; }
  const id = uid();
  data.trainers.push({id,name,phone,specialty:spec});
  data.users.push({id:uid(),username:user,password:pass,role:"trainer",name,refId:id});
  save(); clearForm(["tName","tPhone","tSpec","tUser","tPass"]);
  toast("Trainer added"); render();
}
function changeTrainerPassword(trainerId){
  const u = currentUser(); if(u.role!=="admin"){ toast("Admins only"); return; }
  const np = prompt("Enter new password for trainer:");
  if(!np) return;
  const user = data.users.find(x=>x.role==="trainer" && x.refId===trainerId);
  if(!user){ toast("No login account"); return; }
  user.password = np; save(); toast("Trainer password updated");
}function changeMemberPassword(memberId){
  const u = currentUser(); if(u.role!="admin"){ toast("Admins only"); return; }
  const np = prompt("Enter new password for member:");
  if(!np) return;
  const user = data.users.find(x=>x.role==="member" && x.refId===memberId);
  if(!user){ toast("No login account"); return; }
  user.password = np; save(); toast("Member password updated");
}
/* ============ ATTENDANCE ============ */
function addAttendance(){
  const memberId = g("aMember");
  if(!memberId){ toast("Select member"); return; }
  const date = document.getElementById("aDate").value || today();
  const timeIn = document.getElementById("aTimeIn").value || nowTime();
  const timeOut = document.getElementById("aTimeOut").value || null;
  const member = data.members.find(x => x.id === memberId);
  if(member){
    applyAttendancePackageDeduction(member);
  }
  data.attendance.push({id:uid(), memberId, date, time:timeIn, timeOut});
  save();
  clearForm(["aMember"]);
  document.getElementById("aDate").value = "";
  document.getElementById("aTimeIn").value = "";
  document.getElementById("aTimeOut").value = "";
  toast("Attendance saved");
  render();
}

/* ============ PAYMENTS ============ */
function syncPaymentAmount(){
  const amountField = document.getElementById("pAmount");
  const packageType = document.getElementById("pPackage")?.value || "";
  if(!amountField) return;
  if(packageType){
    const meta = packageMeta(packageType);
    amountField.value = meta.amount;
  } else {
    amountField.value = "";
  }
}

function addPayment(){
  const u = currentUser(); if(u.role!=="admin"){ toast("Admins only"); return; }
  const memberId=g("pMember"), amount=Number(g("pAmount")), method=g("pMethod"), packageType=g("pPackage") || null;
  if(!memberId||!amount){ toast("Member & amount required"); return; }
  data.payments.push({id:uid(),memberId,amount,method,date:today(),packageType});
  if(packageType){
    const meta = packageMeta(packageType);
    const member = data.members.find(x => x.id === memberId);
    if(member){
      member.packageType = packageType;
      member.plan = packageType;
      member.packageStart = today();
      member.packageExpires = dateOffset(meta.days);
      member.packageAmount = amount;
      setPackageRemainingDays(member, meta.days);
    }
  }
  save(); clearForm(["pAmount"]); toast("Payment recorded"); render();
}

function applyAttendancePackageDeduction(member){
  if(!member) return;
  const remaining = getPackageRemainingDays(member);
  if(remaining === null || remaining <= 0){
    member.packageStatus = "Expired";
    setPackageRemainingDays(member, 0);
    return;
  }
  setPackageRemainingDays(member, remaining - 1);
}

function purchasePackage(){
  const member = currentMember();
  if(!member){ toast("Members only"); return; }
  const packageType = g("pkgType");
  const amount = Number(g("pkgAmount"));
  const method = g("pkgMethod");
  const paymentRef = g("pkgPaymentRef").trim();
  if(!packageType || !amount){ toast("Package & amount required"); return; }
  syncMemberPackage(member.id, packageType, amount, method);
  const payment = data.payments[data.payments.length - 1];
  if(payment){
    payment.paymentRefType = "Payment reference";
    payment.paymentRef = paymentRef || null;
  }
  clearForm(["pkgAmount", "pkgPaymentRef"]);
  setText("pkgExpiry", `Expires on ${member.packageExpires}`);
  toast("Package updated");
  render();
}

function setPackageDefaults(){
  const type = g("pkgType");
  const meta = packageMeta(type);
  const amount = document.getElementById("pkgAmount");
  const expiry = document.getElementById("pkgExpiry");
  const method = document.getElementById("pkgMethod")?.value || "Cash";
  const refWrap = document.getElementById("pkgPaymentRefWrap");
  const refLabel = document.getElementById("pkgPaymentRefLabel");
  if(amount) amount.value = meta.amount;
  if(expiry) expiry.textContent = `Valid for ${meta.days} days`;
  if(refWrap && refLabel){
    refWrap.style.display = "none";
    refLabel.textContent = "Payment reference";
  }
}

/* ============ ACCOUNT ============ */
function changeOwnUser(){
  const nv = g("newUser").trim(); if(!nv){ toast("Enter username"); return; }
  if(!/^[A-Za-z]{1,30}$/.test(nv)){ toast("Username must be letters only and up to 30 characters"); return; }
  const me = currentUser();
  if(data.users.some(x=>x.username===nv && x.id!==me.id)){ toast("Username taken"); return; }
  me.username = nv; save(); document.getElementById("newUser").value=""; toast("Username updated");
}
function changeOwnPass(){
  const cur = g("curPass"), np = g("newPass");
  const me = currentUser();
  if(me.password!==cur){ toast("Current password wrong"); return; }
  if(!np){ toast("Enter new password"); return; }
  me.password = np; save(); clearForm(["curPass","newPass"]); toast("Password updated");
}

/* ============ UTIL ============ */
function g(id){ return document.getElementById(id).value; }
function clearForm(ids){ ids.forEach(i=>document.getElementById(i).value=""); }
function del(){} // legacy

/* ============ RENDER ============ */
function render(){
  if(!session) return;
  const me = currentUser();
  // selects
  fillTrainerSelect();
  fillMemberSelects();
  syncPaymentAmount();

  // dashboard stats
  setText("sMembers", data.members.length);
  setText("sTrainers", data.trainers.length);
  setText("sToday", data.attendance.filter(a=>a.date===today()).length);
  const isAdmin = me.role === "admin";

  renderMembers();
  renderTrainers();
  renderAttendance();
  renderPayments();
  renderMemberDashboard();
  renderMemberPackage();
  renderMyProfile();

  // Hide admin-only forms for non-admins
  toggle("memberForm", isAdmin);
  toggle("trainerForm", isAdmin);
  toggle("payForm", isAdmin);

  const member = currentMember();
  if(member) notifyPackageExpiry(member);
}
function setText(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }
function toggle(id, on){ const e=document.getElementById(id); if(e) e.style.display = on?"":"none"; }

function fillTrainerSelect(){
  const sel = document.getElementById("mTrainer");
  sel.innerHTML = '<option value="">— none —</option>' + data.trainers.map(t=>`<option value="${t.id}">${t.name}</option>`).join("");
}
function fillMemberSelects(){
  const me = currentUser();
  let members = data.members;
  if(me.role==="trainer") members = members.filter(m=>m.trainerId===me.refId);
  const opts = '<option value="">— select —</option>' + members.map(m=>`<option value="${m.id}">${m.name}</option>`).join("");
  ["aMember","pMember"].forEach(id=>{ const e=document.getElementById(id); if(e) e.innerHTML = opts; });
  if(document.getElementById("pMember")?.value){ syncPaymentAmount(); }
}

function renderMemberDashboard(){
  const me = currentUser();
  const wrap = document.getElementById("memberDashboard");
  if(!wrap) return;
  if(me.role !== "member"){
    wrap.innerHTML = "";
    return;
  }
  const member = currentMember();
  if(!member){
    wrap.innerHTML = `<div class="empty">No member profile found</div>`;
    return;
  }
  const status = packageStatus(member);
  const track = workoutTrack(member);
  const totalWeek = track.reduce((sum, item) => sum + item.count, 0);
  wrap.innerHTML = `
    <div class="card hero">
      <div>
        <div class="eyebrow">Member Dashboard</div>
        <h3>${member.name}</h3>
        <p class="muted">Weekly workout track and package status</p>
      </div>
      <div class="hero-stats">
        <div><span>Package</span><b>${member.packageType || member.plan || "Basic"}</b></div>
        <div><span>Days left</span><b>${status.daysLeft === null ? "N/A" : status.daysLeft}</b></div>
        <div><span>This week</span><b>${totalWeek}</b></div>
      </div>
    </div>
    <div class="track-grid">
      ${track.map(item => `
        <div class="track-day">
          <span>${new Date(item.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}</span>
          <strong>${item.count}</strong>
          <div class="bar"><i style="width:${Math.min(item.count * 100, 100)}%"></i></div>
        </div>
      `).join("")}
    </div>
    <div class="notice ${status.tone}">${status.label}${status.daysLeft === null ? "" : `: ${status.daysLeft >= 0 ? `${status.daysLeft} day(s) left` : `${Math.abs(status.daysLeft)} day(s) overdue`}`}</div>
  `;
}

function renderMemberPackage(){
  const me = currentUser();
  const wrap = document.getElementById("memberPackage");
  if(!wrap) return;
  if(me.role !== "member"){
    wrap.innerHTML = "";
    return;
  }
  const member = currentMember();
  if(!member){
    wrap.innerHTML = `<div class="empty">No package information</div>`;
    return;
  }
  const status = packageStatus(member);
  wrap.innerHTML = `
    <div class="card">
      <h3>Renew Package</h3>
      <div class="grid">
        <div>
          <label>Package Type</label>
          <select id="pkgType" onchange="setPackageDefaults()">
            ${Object.keys(PACKAGE_CATALOG).map(type => `<option ${type === (member.packageType || member.plan || "Basic") ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Amount (KSh)</label>
          <input id="pkgAmount" type="number" value="${member.packageAmount || packageMeta(member.packageType || member.plan || "Basic").amount}" />
        </div>
        <div>
          <label>Payment Method</label>
          <select id="pkgMethod" onchange="setPackageDefaults()"><option>Cash</option></select>
        </div>
      </div>
      <div id="pkgPaymentRefWrap" class="grid" style="display:none">
        <div>
          <label id="pkgPaymentRefLabel">Payment reference</label>
          <input id="pkgPaymentRef" placeholder="Optional" />
        </div>
      </div>
      <button class="primary" onclick="purchasePackage()">Pay Package</button>
      <div id="pkgExpiry" class="hint-text">${status.daysLeft === null ? "Package validity will appear here" : `Expires on ${member.packageExpires}`}</div>
    </div>
    <div class="card">
      <h3>Package Details</h3>
      <p><b>Package:</b> ${packageBadge(member)}</p>
      <p><b>Start:</b> ${member.packageStart || member.joined}</p>
      <p><b>Expires:</b> ${member.packageExpires || "—"}</p>
      <p><b>Status:</b> <span class="notice ${status.tone}">${status.label}</span></p>
    </div>
  `;
  setPackageDefaults();
}

function renderMembers(){
  const tb = document.getElementById("tMembers");
  const me = currentUser();
  let list = data.members;
  if(me.role==="trainer") list = list.filter(m=>m.trainerId===me.refId);
  if(!list.length){ tb.innerHTML = `<tr><td colspan="6" class="empty">No members</td></tr>`; return; }
  tb.innerHTML = list.map(m=>`
    <tr>
      <td>${m.name}</td><td>${m.phone||"—"}</td>
      <td>${packageBadge(m)}</td>
      <td>${trainerName(m.trainerId)}</td>
      <td>${m.packageExpires || m.joined}</td>
      <td>${me.role==="admin"?`
        <button onclick="changeMemberPassword('${m.id}')">Reset Password</button>
        <button class="danger" onclick="removeMember('${m.id}')">Remove</button>`:""}</td>
    </tr>`).join("");
}

function renderTrainers(){
  const tb = document.getElementById("tTrainers");
  const me = currentUser();
  const th = document.getElementById("thTrainerAct"); if(th) th.textContent = me.role==="admin"?"Actions":"";
  if(!data.trainers.length){ tb.innerHTML = `<tr><td colspan="5" class="empty">No trainers</td></tr>`; return; }
  tb.innerHTML = data.trainers.map(t=>{
    const count = data.members.filter(m=>m.trainerId===t.id).length;
    return `<tr><td>${t.name}</td><td>${t.phone||"—"}</td><td>${t.specialty||"—"}</td><td>${count}</td>
    <td>${me.role==="admin"?`<button onclick="changeTrainerPassword('${t.id}')">Change Password</button>`:""}</td></tr>`;
  }).join("");
}

function clearAttFilter(){ document.getElementById("rFrom").value=""; document.getElementById("rTo").value=""; renderAttendance(); }
function renderAttendance(){
  const tb = document.getElementById("tAttendance");
  const me = currentUser();
  const from = document.getElementById("rFrom")?.value;
  const to   = document.getElementById("rTo")?.value;
  let list = [...data.attendance].reverse();
  if(me.role==="trainer"){
    const mine = new Set(data.members.filter(m=>m.trainerId===me.refId).map(m=>m.id));
    list = list.filter(a=>mine.has(a.memberId));
  }
  if(from) list = list.filter(a=>a.date>=from);
  if(to)   list = list.filter(a=>a.date<=to);

  // summary
  const total = list.length;
  const uniq = new Set(list.map(a=>a.memberId)).size;
  const sum = document.getElementById("reportSummary");
  if(sum) sum.textContent = `Total check-ins: ${total} • Unique members: ${uniq}`;

  if(!list.length){ tb.innerHTML = `<tr><td colspan="5" class="empty">No records</td></tr>`; return; }
  tb.innerHTML = list.map(a=>`
    <tr><td>${a.date}</td><td>${a.time || "—"}</td><td>${a.timeOut || "—"}</td><td>${memberName(a.memberId)}</td>
    <td>${me.role==="admin"?`<button class="danger" onclick="delAtt('${a.id}')">Delete</button>`:""}</td></tr>`).join("");
}
function delAtt(id){ if(!confirm("Delete?"))return; data.attendance=data.attendance.filter(a=>a.id!==id); save(); render(); }

function renderPayments(){
  const tb = document.getElementById("tPayments");
  if(!data.payments.length){ tb.innerHTML = `<tr><td colspan="6" class="empty">No payments</td></tr>`; return; }
  const totalsByMember = data.payments.reduce((acc, payment) => {
    acc[payment.memberId] = (acc[payment.memberId] || 0) + Number(payment.amount || 0);
    return acc;
  }, {});
  tb.innerHTML = [...data.payments].reverse().map(p=>`
    <tr><td>${p.date}</td><td>${memberName(p.memberId)}</td><td>${p.packageType || "—"}</td><td>${p.method}</td>
    <td>KSh ${formatMoney(p.amount)}${p.paymentRef ? `<div class="hint-text">${p.paymentRefType || "Reference"}: ${p.paymentRef}</div>` : ""}</td>
    <td>KSh ${formatMoney(totalsByMember[p.memberId] || 0)}</td>
    <td><button class="danger" onclick="delPay('${p.id}')">Delete</button></td></tr>`).join("");
}
function delPay(id){ if(!confirm("Delete?"))return; data.payments=data.payments.filter(p=>p.id!==id); save(); render(); }

function renderMyProfile(){
  const me = currentUser();
  if(me.role!=="member") return;
  const m = data.members.find(x=>x.id===me.refId);
  const wrap = document.getElementById("myProfile");
  if(!m){ wrap.innerHTML = "<div class='empty'>No profile</div>"; return; }
  const status = packageStatus(m);
  wrap.innerHTML = `
    <p><b>Name:</b> ${m.name}</p>
    <p><b>Phone:</b> ${m.phone}</p>
    <p><b>Package:</b> ${packageBadge(m)}</p>
    <p><b>Trainer:</b> ${trainerName(m.trainerId)}</p>
    <p><b>Joined:</b> ${m.joined}</p>
    <p><b>Expiry:</b> ${m.packageExpires || "—"}</p>
    <p><b>Status:</b> <span class="notice ${status.tone}">${status.label}</span></p>`;
  document.getElementById("myAtt").innerHTML =
    data.attendance.filter(a=>a.memberId===m.id).reverse()
      .map(a=>`<tr><td>${a.date}</td><td>${a.time || "—"}</td><td>${a.timeOut || "—"}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">None</td></tr>`;
  document.getElementById("myPay").innerHTML =
    data.payments.filter(p=>p.memberId===m.id).reverse()
      .map(p=>`<tr><td>${p.date}</td><td>${p.method}</td><td>KSh ${formatMoney(p.amount)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">None</td></tr>`;
}

/* ============ BOOT ============ */
function showLoginView(){
  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");
  if(loginView) loginView.style.display = "flex";
  if(appView) appView.style.display = "none";
}

function bootApp(){
  document.getElementById("loginView").style.display = "none";
  document.getElementById("appView").style.display = "block";
  const me = currentUser();
  document.getElementById("whoName").textContent = me.name;
  document.getElementById("whoRole").textContent = me.role;
  buildTabs();
}

function initializeApp(){
  try {
    if(session && currentUser()){
      bootApp();
    } else {
      showLoginView();
    }
  } catch (error) {
    console.error(error);
    showLoginView();
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
