// ===================================================
//  app.js — Global state & data listener
//  Firebase already initialized in firebase-init.js
// ===================================================

// ── Global application state ─────────────────────────

/** @type {{ uid: string, displayName: string, photoURL: string }|null} */
let currentUser = null;

/** @type {string|null} */
let currentRole = null;

let viewDate    = new Date();
let selectedKey = "";
let tempImage   = null;
let globalData  = {};
let planData    = {};
let usersMapping = {};
let fireDaysMap  = {};

// ── Firebase real-time listener ──────────────────────

db.ref("/").on("value", snapshot => {
    const val    = snapshot.val() || {};
    globalData   = val.cook_posts    || {};
    planData     = val.planning      || {};
    usersMapping = val.users_mapping || {};

    if (currentUser && usersMapping[currentUser.uid]) {
        currentRole = usersMapping[currentUser.uid].name;
    }

    render();

    if (!document.getElementById("dayView").hidden) {
        updateHistory();
    }
});

// ── Bootstrap ────────────────────────────────────────
initAuthListener();
