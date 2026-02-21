// ===================================================
//  app.js — Global state, Firebase init & data listener
// ===================================================

// ── Firebase SDK instances ───────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.database();
const auth = firebase.auth();

// ── Global application state ─────────────────────────

/** @type {firebase.User|null} */
let currentUser = null;

/** @type {string|null} Chef name bound to the logged-in user */
let currentRole = null;

/** The month/year currently shown in the calendar. */
let viewDate = new Date();

/** The "YYYY-MM-DD" key of the day currently open in the day panel. */
let selectedKey = "";

/** Base64 JPEG captured from the camera, waiting to be posted. */
let tempImage = null;

/** All cook posts: { [dateKey]: { [postId]: PostObject } } */
let globalData = {};

/** All planning entries: { [dateKey]: { chef: string } } */
let planData = {};

/** Google-UID → { name, email } mapping stored in Firebase. */
let usersMapping = {};

/** Set of date keys that have a 🔥 (computed by calculateStats). */
let fireDaysMap = {};

// ── Firebase real-time listener ──────────────────────

/**
 * Subscribes to the entire DB root.
 * Re-renders UI whenever any data changes.
 */
db.ref("/").on("value", snapshot => {
    const val    = snapshot.val() || {};
    globalData   = val.cook_posts    || {};
    planData     = val.planning      || {};
    usersMapping = val.users_mapping || {};

    // Keep role in sync if changed externally
    if (currentUser && usersMapping[currentUser.uid]) {
        currentRole = usersMapping[currentUser.uid].name;
    }

    render();

    // Refresh the open day panel if it's visible
    if (!document.getElementById("dayView").hidden) {
        updateHistory();
    }
});

// ── Bootstrap ────────────────────────────────────────
initAuthListener();
