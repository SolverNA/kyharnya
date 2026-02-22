// ===================================================
//  app.js — Global state & Firebase real-time listener
// ===================================================

/** @type {{ uid: string, displayName: string, photoURL: string }|null} */
let currentUser  = null;

/** @type {string|null} Chef name bound to the logged-in user */
let currentRole  = null;

/** Month/year currently shown in the calendar */
let viewDate     = new Date();

/** "YYYY-MM-DD" key of the day currently open in the day panel */
let selectedKey  = "";

/** Base64 JPEG captured from camera, waiting to be posted */
let tempImage    = null;

/** All cook posts keyed by date then post ID: { [dateKey]: { [postId]: PostObject } } */
let globalData   = {};

/** Planning entries keyed by date: { [dateKey]: { chef: string } } */
let planData     = {};

/** Google-UID → { name, chatId } mapping stored in Firebase */
let usersMapping = {};

/** Date keys that have a 🔥 — populated by calculateStats() */
let fireDaysMap  = {};

// ── Firebase real-time listener ──────────────────────

db.ref("/").on("value", snapshot => {
    const val    = snapshot.val() || {};

    console.log("=== Firebase snapshot received ===");
    console.log("cook_posts keys:", Object.keys(val.cook_posts || {}));
    console.log("planning keys:", Object.keys(val.planning || {}));
    console.log("users_mapping keys:", Object.keys(val.users_mapping || {}));
    console.log("Full val:", JSON.stringify(val).slice(0, 500));

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
}, error => {
    console.error("=== Firebase read ERROR ===", error.code, error.message);
});

// ── Bootstrap ─────────────────────────────────────────
initAuthListener();
