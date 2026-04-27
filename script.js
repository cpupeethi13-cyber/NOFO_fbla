/* ==========================================================
   NORTH FORSYTH FBLA — script.js
   Edit OFFICERS, VIDEOS, and FIREBASE_CONFIG below to update
   the site without touching HTML or CSS.
   ========================================================== */


/* -----------------------------------------------------------
   1) OFFICERS — edit this list each year
   ----------------------------------------------------------- */
const OFFICERS = [
  { name: "Shreyas Boddani",         role: "President" },
  { name: "Sai Sahasra T.",         role: "Vice President of Competitive Events" },
  { name: "Aniket Hunakunti",         role: "Vice President of Competitive Events" },
  { name: "Sreecharan Chintada",         role: "Vice President of Fundraising" },
  { name: "Ananya Gunti",         role: "Vice President of Public Relations" },
  { name: "Jose Oblando",         role: "Vice President of Community Service" },
  { name: "Parker Bingaman",         role: "Vice President of Chapter Management" },
   { name: "Rakshan Reddy Mallela",         role: "Voce President of Chapter Management" },
   { name: "Chaitanya Pupeethi",         role: "Webmaster" },
   { name: "Sahasra Talla",         role: "Secretary" },
   { name: "Tanvi Annam",         role: "Historian" },
   { name: "Nidarsana Ayyappan",         role: "Parlimentarian" },
   { name: "Charles Briscoe",         role: "Treasurer" },
   { name: "Christopher Stegbauer",         role: "Reporter" },
  { name: "Phillip Tomes", role: "Chapter Adviser" },
   { name: "Jen Crummel", role: "Chapter Adviser" },
];


/* -----------------------------------------------------------
   2) VIDEOS — paste a YouTube ID and a title.
   To get the ID: from https://www.youtube.com/watch?v=ABC123XYZ
   the ID is: ABC123XYZ
   ----------------------------------------------------------- */
const VIDEOS = [
  {
    youtubeId: "dQw4w9WgXcQ",        // <- replace with your video IDs
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


/* -----------------------------------------------------------
   3) FIREBASE — for the forum (free tier, no user accounts)
   Follow README.md to create a free Firebase project and
   paste your config below. Until then the forum runs in
   "local-only" mode using your browser's storage so you can
   preview how it looks.
   ----------------------------------------------------------- */
const FIREBASE_CONFIG = {
     apiKey: "AIzaSyB-qpQBw2IzQ6eZZ23XXXNsskT_sW6_N3w",
     authDomain: "nfhs-fbla-forum.firebaseapp.com",
     projectId: "nfhs-fbla-forum",
     storageBucket: "nfhs-fbla-forum.firebasestorage.app",
     messagingSenderId: "196605395161",
     appId: "1:196605395161:web:75e28f5ec4dd38f47bbec8"
   };


/* ===========================================================
   ↓↓ Generally no need to edit below this line ↓↓
   =========================================================== */


/* -------------------- Officers render -------------------- */
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


/* -------------------- Videos render -------------------- */
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
          title="${escapeHtml(v.title)}"
          loading="lazy"
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


/* -------------------- Mobile nav toggle -------------------- */
function initNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  if (!nav || !toggle) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
  document.querySelectorAll(".nav-links a").forEach(a =>
    a.addEventListener("click", () => nav.classList.remove("open"))
  );
}


/* -------------------- Forum -------------------- */
/**
 * The forum can run in two modes:
 *   A) FIREBASE mode — real, public forum where everyone sees
 *      everyone's posts. Requires you to fill in FIREBASE_CONFIG.
 *   B) LOCAL mode    — fallback: posts live only in this
 *      browser. Useful for previewing the design.
 */

let forumMode = "local";
let firestoreDb = null;
let firestoreFns = null;

async function initForum() {
  const form = document.getElementById("forumForm");
  const list = document.getElementById("forumList");
  const hint = document.getElementById("forumHint");
  if (!form || !list) return;

  const useFirebase = FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey;

  if (useFirebase) {
    try {
      const appMod  = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
      const fsMod   = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const app     = appMod.initializeApp(FIREBASE_CONFIG);
      firestoreDb   = fsMod.getFirestore(app);
      firestoreFns  = fsMod;
      forumMode     = "firebase";
    } catch (err) {
      console.error("Firebase failed to load — falling back to local mode.", err);
      forumMode = "local";
    }
  }

  // Inject a banner if running in local mode so the user knows
  if (forumMode === "local") {
    const warn = document.createElement("div");
    warn.className = "forum-config-warn";
    warn.innerHTML = `
      <strong>Forum is in local-preview mode.</strong>
      Posts you submit here are only visible in your browser.
      To make this a real forum visible to everyone, follow the
      Firebase setup steps in <code>README.md</code> and paste your
      keys into <code>FIREBASE_CONFIG</code> in <code>script.js</code>.
    `;
    list.parentNode.insertBefore(warn, list);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name  = (document.getElementById("forumName").value || "Anonymous").trim().slice(0, 40);
    const title = document.getElementById("forumTitle").value.trim().slice(0, 100);
    const body  = document.getElementById("forumBody").value.trim().slice(0, 1500);
    if (!title || !body) return;

    setHint(hint, "Posting…");
    try {
      await postQuestion({ name, title, body, ts: Date.now() });
      form.reset();
      setHint(hint, "Posted! Thanks for asking.", "success");
      await renderPosts();
    } catch (err) {
      console.error(err);
      setHint(hint, "Hmm, that didn't go through. Try again.", "error");
    }
  });

  await renderPosts();
}

function setHint(el, msg, kind = "") {
  if (!el) return;
  el.textContent = msg;
  el.className = "forum-hint" + (kind ? " " + kind : "");
}

async function postQuestion(post) {
  if (forumMode === "firebase") {
    const { collection, addDoc, serverTimestamp } = firestoreFns;
    await addDoc(collection(firestoreDb, "forum_posts"), {
      name:  post.name,
      title: post.title,
      body:  post.body,
      createdAt: serverTimestamp(),
    });
  } else {
    const all = JSON.parse(localStorage.getItem("nfhsfbla_forum") || "[]");
    all.unshift(post);
    localStorage.setItem("nfhsfbla_forum", JSON.stringify(all.slice(0, 200)));
  }
}

async function renderPosts() {
  const list = document.getElementById("forumList");
  if (!list) return;
  list.innerHTML = `<div class="forum-loading">Loading the forum…</div>`;

  let posts = [];
  try {
    if (forumMode === "firebase") {
      const { collection, getDocs, query, orderBy, limit } = firestoreFns;
      const q    = query(collection(firestoreDb, "forum_posts"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      snap.forEach(doc => {
        const d = doc.data();
        posts.push({
          name:  d.name  || "Anonymous",
          title: d.title || "(no title)",
          body:  d.body  || "",
          ts:    d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : Date.now(),
        });
      });
    } else {
      posts = JSON.parse(localStorage.getItem("nfhsfbla_forum") || "[]");
    }
  } catch (err) {
    console.error("Forum read failed", err);
    list.innerHTML = `<div class="forum-empty">Couldn't load posts right now.</div>`;
    return;
  }

  if (!posts.length) {
    list.innerHTML = `<div class="forum-empty">No questions yet — be the first to ask one!</div>`;
    return;
  }

  list.innerHTML = posts.map(p => `
    <article class="forum-post">
      <div class="forum-post-head">
        <h3 class="forum-post-title">${escapeHtml(p.title)}</h3>
        <div class="forum-post-meta">
          <span class="forum-post-author">${escapeHtml(p.name || "Anonymous")}</span>
          · ${formatDate(p.ts)}
        </div>
      </div>
      <p class="forum-post-body">${escapeHtml(p.body)}</p>
    </article>
  `).join("");
}


/* -------------------- Helpers -------------------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}


/* -------------------- Boot -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderOfficers();
  renderVideos();
  initNav();
  initForum();
});
