/* ==========================================================
   NORTH FORSYTH FBLA — script.js
   Edit OFFICERS, VIDEOS, and FIREBASE_CONFIG below.
   ========================================================== */


/* 1) OFFICERS — edit this list each year */
const OFFICERS = [
  { name: "Shreyas B.",         role: "President" },
  { name: "Sai Sahasra T.",     role: "Vice President of Competitive Events" },
  { name: "Aniket H.",          role: "Vice President of Competitive Events" },
  { name: "Sreecharan C.",      role: "Vice President of Fundraising" },
  { name: "Ananya G.",          role: "Vice President of Public Relations" },
  { name: "Jose O.",            role: "Vice President of Community Service" },
  { name: "Parker B.",          role: "Vice President of Chapter Management" },
  { name: "Rakshan Reddy M.",   role: "Vice President of Chapter Management" },
  { name: "Chaitanya P.",       role: "Webmaster" },
  { name: "Sahasra T.",         role: "Secretary" },
  { name: "Tanvi A.",           role: "Historian" },
  { name: "Nidarsana A.",       role: "Parliamentarian" },
  { name: "Charles B.",         role: "Treasurer" },
  { name: "Christopher S.",     role: "Reporter" },
  { name: "Phillip Tomes",      role: "Chapter Adviser" },
  { name: "Jen Crummel",        role: "Chapter Adviser" },
];


/* 2) VIDEOS — paste a YouTube ID and a title */
const VIDEOS = [
  {
    youtubeId: "dQw4w9WgXcQ",
    title:     "Welcome to NFHS FBLA — 26/27",
    tag:       "Chapter Intro",
    date:      "Aug 2026",
  },
  {
    youtubeId: "9bZkp7q19f0",
    title:     "Regional Conference Recap",
    tag:       "Recap",
    date:      "Nov 2026",
  },
  {
    youtubeId: "kJQP7kiw5Fk",
    title:     "How to Prep for Your Competitive Event",
    tag:       "Tutorial",
    date:      "Dec 2026",
  },
  {
    youtubeId: "L_jWHffIx5E",
    title:     "Officer Spotlight: Webmaster",
    tag:       "Officers",
    date:      "Jan 2027",
  },
];


/* 3) FIREBASE — your project keys (used for Auth + Firestore) */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB-qpQBw2IzQ6eZZ23XXXNsskT_sW6_N3w",
  authDomain: "nfhs-fbla-forum.firebaseapp.com",
  projectId: "nfhs-fbla-forum",
  storageBucket: "nfhs-fbla-forum.firebasestorage.app",
  messagingSenderId: "196605395161",
  appId: "1:196605395161:web:75e28f5ec4dd38f47bbec8",
};


/* ===========================================================
   ↓↓ Generally no need to edit below this line ↓↓
   =========================================================== */

/* -------------------- Static renderers -------------------- */
function renderOfficers() {
  const grid = document.getElementById("officersGrid");
  if (!grid) return;
  grid.innerHTML = OFFICERS.map((o, i) => `
    <article class="officer-card">
      <div class="officer-role-num">${String(i + 1).padStart(2, "0")} / ${String(OFFICERS.length).padStart(2, "0")}</div>
      <h3 class="officer-name">${escapeHtml(o.name)}</h3>
      <div class="officer-role">${escapeHtml(o.role)}</div>
    </article>
  `).join("");
}

function renderVideos() {
  const grid = document.getElementById("videosGrid");
  if (!grid) return;
  if (!VIDEOS.length) {
    grid.innerHTML = `<p class="forum-empty">No videos yet — check back soon.</p>`;
    return;
  }
  grid.innerHTML = VIDEOS.map(v => `
    <article class="video-card">
      <div class="video-thumb">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtubeId)}?rel=0"
          title="${escapeHtml(v.title)}" loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>
      <div class="video-meta">
        <div class="video-tag">${escapeHtml(v.tag || "Video")}</div>
        <h3 class="video-title">${escapeHtml(v.title)}</h3>
        <div class="video-date">${escapeHtml(v.date || "")}</div>
      </div>
    </article>
  `).join("");
}

function initNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  if (!nav || !toggle) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
  document.querySelectorAll(".nav-links a").forEach(a =>
    a.addEventListener("click", () => nav.classList.remove("open"))
  );
}


/* -------------------- Messaging system -------------------- */
const Messaging = {
  authMod:  null,
  fsMod:    null,
  app:      null,
  auth:     null,
  db:       null,
  user:     null,
  profile:  null,         // { name, isOfficer }
  authMode: "signin",
  unsubMember:   null,    // listener for member's own thread
  unsubInbox:    null,    // officer: list of threads
  unsubActive:   null,    // officer: messages in active thread
  activeUid:     null,    // officer: which member thread is open
  activeName:    null,
};

async function initMessaging() {
  const useFirebase = FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey
    && !FIREBASE_CONFIG.apiKey.startsWith("PASTE");

  if (!useFirebase) {
    showAuthCard("setup");
    return;
  }

  try {
    Messaging.authMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    Messaging.fsMod   = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const appMod      = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    Messaging.app  = appMod.initializeApp(FIREBASE_CONFIG);
    Messaging.auth = Messaging.authMod.getAuth(Messaging.app);
    Messaging.db   = Messaging.fsMod.getFirestore(Messaging.app);
  } catch (err) {
    console.error("Firebase failed to load.", err);
    showAuthCard("blocked");
    return;
  }

  wireAuthForm();

  Messaging.authMod.onAuthStateChanged(Messaging.auth, async (user) => {
    Messaging.user = user;
    if (!user) {
      teardownListeners();
      Messaging.profile = null;
      showSignedOut();
      return;
    }
    // Load profile (creates one if missing)
    Messaging.profile = await loadOrCreateProfile(user);
    if (Messaging.profile.isOfficer) {
      showOfficerView();
    } else {
      showMemberView();
    }
  });
}

async function loadOrCreateProfile(user) {
  const { doc, getDoc, setDoc, serverTimestamp } = Messaging.fsMod;
  const ref = doc(Messaging.db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  // First-time login: create a profile from auth info
  const data = {
    name:      user.displayName || user.email.split("@")[0],
    email:     user.email,
    isOfficer: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return data;
}

function teardownListeners() {
  [Messaging.unsubMember, Messaging.unsubInbox, Messaging.unsubActive].forEach(fn => {
    if (typeof fn === "function") fn();
  });
  Messaging.unsubMember = Messaging.unsubInbox = Messaging.unsubActive = null;
}


/* -------------------- Auth UI -------------------- */
function showSignedOut() {
  document.getElementById("messagesAuth").classList.remove("hidden");
  document.getElementById("messagesMember").classList.add("hidden");
  document.getElementById("messagesOfficer").classList.add("hidden");
  setHint("authHint", "");
  document.getElementById("authForm").reset();
}

function showAuthCard(reason) {
  document.getElementById("messagesAuth").classList.remove("hidden");
  document.getElementById("messagesMember").classList.add("hidden");
  document.getElementById("messagesOfficer").classList.add("hidden");
  const title = document.getElementById("authTitle");
  const sub   = document.getElementById("authSub");
  const form  = document.getElementById("authForm");
  if (reason === "setup") {
    title.textContent = "Messaging is in setup mode";
    sub.innerHTML = `Paste your Firebase keys into <code>FIREBASE_CONFIG</code> in <code>script.js</code> and enable Firebase Authentication to activate this section.`;
    form.style.display = "none";
    document.querySelector(".auth-tabs").style.display = "none";
  } else if (reason === "blocked") {
    title.textContent = "Messaging unavailable in this browser";
    sub.innerHTML = `Your browser or an extension is blocking the messaging service (common with Brave Shields, uBlock Origin). Lower your shields for this site, or open it in Chrome, Safari, Firefox, or Edge.`;
    form.style.display = "none";
    document.querySelector(".auth-tabs").style.display = "none";
  }
}

function wireAuthForm() {
  const tabSignin = document.getElementById("tabSignin");
  const tabSignup = document.getElementById("tabSignup");
  const form      = document.getElementById("authForm");
  const nameInput = document.getElementById("authName");
  const submitBtn = document.getElementById("authSubmit");

  function setMode(mode) {
    Messaging.authMode = mode;
    tabSignin.classList.toggle("active", mode === "signin");
    tabSignup.classList.toggle("active", mode === "signup");
    nameInput.style.display = (mode === "signup") ? "block" : "none";
    submitBtn.textContent = (mode === "signup") ? "Create account" : "Sign in";
    setHint("authHint", "");
  }
  tabSignin.addEventListener("click", () => setMode("signin"));
  tabSignup.addEventListener("click", () => setMode("signup"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const name     = nameInput.value.trim();
    setHint("authHint", "Working…");

    const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = Messaging.authMod;
    try {
      if (Messaging.authMode === "signup") {
        if (!name) { setHint("authHint", "Please enter your name.", "error"); return; }
        const cred = await createUserWithEmailAndPassword(Messaging.auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(Messaging.auth, email, password);
      }
    } catch (err) {
      setHint("authHint", friendlyAuthError(err), "error");
    }
  });

  // Sign out buttons
  document.getElementById("memberSignOut").addEventListener("click", () => Messaging.authMod.signOut(Messaging.auth));
  document.getElementById("officerSignOut").addEventListener("click", () => Messaging.authMod.signOut(Messaging.auth));
}

function friendlyAuthError(err) {
  const code = err && err.code || "";
  if (code.includes("invalid-email"))             return "That email doesn't look right.";
  if (code.includes("user-not-found"))            return "No account with that email. Try Create account?";
  if (code.includes("wrong-password"))            return "Wrong password.";
  if (code.includes("invalid-credential"))        return "Email or password is incorrect.";
  if (code.includes("email-already-in-use"))      return "That email already has an account. Try Sign in.";
  if (code.includes("weak-password"))             return "Password must be at least 6 characters.";
  if (code.includes("too-many-requests"))         return "Too many tries. Wait a minute and try again.";
  return "Something went wrong. Try again.";
}


/* -------------------- Member view -------------------- */
function showMemberView() {
  document.getElementById("messagesAuth").classList.add("hidden");
  document.getElementById("messagesMember").classList.remove("hidden");
  document.getElementById("messagesOfficer").classList.add("hidden");
  document.getElementById("memberName").textContent = Messaging.profile.name || "(no name)";

  subscribeToMemberThread();
  wireMemberComposer();
}

function subscribeToMemberThread() {
  if (Messaging.unsubMember) Messaging.unsubMember();
  const { collection, query, orderBy, onSnapshot } = Messaging.fsMod;
  const q = query(
    collection(Messaging.db, "threads", Messaging.user.uid, "messages"),
    orderBy("createdAt", "asc")
  );
  Messaging.unsubMember = onSnapshot(q, (snap) => {
    const messages = [];
    snap.forEach(d => messages.push(d.data()));
    renderMemberThread(messages);
  }, (err) => {
    console.error(err);
    document.getElementById("memberThread").innerHTML =
      `<div class="thread-empty">Couldn't load messages. Check back soon.</div>`;
  });
}

function renderMemberThread(messages) {
  const box = document.getElementById("memberThread");
  if (!messages.length) {
    box.innerHTML = `<div class="thread-empty">No messages yet. Say hi to your officers!</div>`;
    return;
  }
  box.innerHTML = messages.map(m => {
    const mine = m.senderUid === Messaging.user.uid;
    const side = mine ? "from-me" : "from-them";
    const authorTag = mine ? "" : `<div class="msg-author">${escapeHtml(m.senderName || "Officer")}</div>`;
    return `
      <div class="msg ${side}">
        ${authorTag}
        ${escapeHtml(m.text)}
        <div class="msg-meta">${formatTime(m.createdAt)}</div>
      </div>
    `;
  }).join("");
  box.scrollTop = box.scrollHeight;
}

function wireMemberComposer() {
  const form = document.getElementById("memberComposer");
  const ta   = document.getElementById("memberMessage");
  if (form.dataset.wired) return;
  form.dataset.wired = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return;
    ta.value = "";
    await sendMessage(Messaging.user.uid, text, /* fromOfficer */ false);
  });
}


/* -------------------- Officer view -------------------- */
function showOfficerView() {
  document.getElementById("messagesAuth").classList.add("hidden");
  document.getElementById("messagesMember").classList.add("hidden");
  document.getElementById("messagesOfficer").classList.remove("hidden");
  document.getElementById("officerName").textContent = Messaging.profile.name || "(no name)";
  subscribeToInbox();
}

function subscribeToInbox() {
  if (Messaging.unsubInbox) Messaging.unsubInbox();
  const { collection, query, orderBy, onSnapshot } = Messaging.fsMod;
  const q = query(collection(Messaging.db, "threads"), orderBy("updatedAt", "desc"));
  Messaging.unsubInbox = onSnapshot(q, (snap) => {
    const threads = [];
    snap.forEach(d => threads.push({ uid: d.id, ...d.data() }));
    renderInbox(threads);
  }, (err) => {
    console.error("Inbox load failed:", err);
    document.getElementById("officerInbox").innerHTML =
      `<div class="thread-empty">Couldn't load inbox. Check Firestore rules.</div>`;
  });
}

function renderInbox(threads) {
  const box = document.getElementById("officerInbox");
  if (!threads.length) {
    box.innerHTML = `<div class="thread-empty">No member messages yet.</div>`;
    return;
  }
  box.innerHTML = threads.map(t => `
    <div class="inbox-item ${t.uid === Messaging.activeUid ? "active" : ""}" data-uid="${escapeHtml(t.uid)}" data-name="${escapeHtml(t.memberName || "Member")}">
      <h4 class="inbox-name">${escapeHtml(t.memberName || "Member")}</h4>
      <p class="inbox-preview">${escapeHtml(t.lastMessage || "(no messages)")}</p>
      <div class="inbox-time">${formatTime(t.updatedAt)}</div>
    </div>
  `).join("");
  box.querySelectorAll(".inbox-item").forEach(el => {
    el.addEventListener("click", () => openOfficerThread(el.dataset.uid, el.dataset.name));
  });

  // Auto-open first thread if none active
  if (!Messaging.activeUid && threads.length) {
    openOfficerThread(threads[0].uid, threads[0].memberName || "Member");
  }
}

function openOfficerThread(memberUid, memberName) {
  Messaging.activeUid  = memberUid;
  Messaging.activeName = memberName;

  // Mark active in UI
  document.querySelectorAll(".inbox-item").forEach(el => {
    el.classList.toggle("active", el.dataset.uid === memberUid);
  });

  // Render thread shell
  const pane = document.getElementById("officerActive");
  pane.innerHTML = `
    <div class="thread-head">
      <div>
        <h3 class="thread-title">${escapeHtml(memberName)}</h3>
        <p class="thread-sub">Private conversation</p>
      </div>
    </div>
    <div class="thread-messages" id="officerThreadMessages">
      <div class="thread-loading">Loading messages…</div>
    </div>
    <form class="thread-composer" id="officerComposer">
      <textarea id="officerMessage" placeholder="Reply to ${escapeHtml(memberName)}…" maxlength="1500" required rows="2"></textarea>
      <button type="submit" class="btn btn-primary">Send</button>
    </form>
  `;

  // Subscribe to that thread's messages
  if (Messaging.unsubActive) Messaging.unsubActive();
  const { collection, query, orderBy, onSnapshot } = Messaging.fsMod;
  const q = query(
    collection(Messaging.db, "threads", memberUid, "messages"),
    orderBy("createdAt", "asc")
  );
  Messaging.unsubActive = onSnapshot(q, (snap) => {
    const messages = [];
    snap.forEach(d => messages.push(d.data()));
    renderOfficerThread(messages);
  });

  // Wire composer
  document.getElementById("officerComposer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ta   = document.getElementById("officerMessage");
    const text = ta.value.trim();
    if (!text) return;
    ta.value = "";
    await sendMessage(memberUid, text, /* fromOfficer */ true);
  });
}

function renderOfficerThread(messages) {
  const box = document.getElementById("officerThreadMessages");
  if (!box) return;
  if (!messages.length) {
    box.innerHTML = `<div class="thread-empty">No messages in this thread yet.</div>`;
    return;
  }
  box.innerHTML = messages.map(m => {
    const fromOfficer = m.fromOfficer;
    const side = fromOfficer ? "from-me" : "from-them";
    const authorTag = fromOfficer ? "" : `<div class="msg-author">${escapeHtml(m.senderName || "Member")}</div>`;
    return `
      <div class="msg ${side}">
        ${authorTag}
        ${escapeHtml(m.text)}
        <div class="msg-meta">${formatTime(m.createdAt)}</div>
      </div>
    `;
  }).join("");
  box.scrollTop = box.scrollHeight;
}


/* -------------------- Send (works for both sides) -------------------- */
async function sendMessage(memberUid, text, fromOfficer) {
  const { doc, setDoc, addDoc, collection, serverTimestamp } = Messaging.fsMod;

  // Ensure the thread document exists / is up to date
  const threadRef = doc(Messaging.db, "threads", memberUid);
  await setDoc(threadRef, {
    memberUid:   memberUid,
    memberName:  fromOfficer ? Messaging.activeName : Messaging.profile.name,
    lastMessage: text.slice(0, 140),
    updatedAt:   serverTimestamp(),
  }, { merge: true });

  // Append the message
  const msgRef = collection(Messaging.db, "threads", memberUid, "messages");
  await addDoc(msgRef, {
    text:        text,
    senderUid:   Messaging.user.uid,
    senderName:  Messaging.profile.name,
    fromOfficer: !!fromOfficer,
    createdAt:   serverTimestamp(),
  });
}


/* -------------------- Helpers -------------------- */
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function setHint(id, msg, kind = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = "auth-hint" + (kind ? " " + kind : "");
}


/* -------------------- Boot -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderOfficers();
  renderVideos();
  initNav();
  initMessaging();
});
