// ===================================================
//  app.js — Global state & Firebase real-time listeners
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

/** Cook posts for the currently viewed month: { [dateKey]: { [postId]: PostObject } } */
let globalData   = {};

/** Planning entries for the currently viewed month: { [dateKey]: { chef: string } } */
let planData     = {};

/** Google-UID → { name, chatId, photo } mapping — loaded once */
let usersMapping = {};

/** Date keys that have a 🔥 — populated by calculateStats() */
let fireDaysMap  = {};

/** Active Firebase listeners — unsubscribed on month change */
let _unsubPosts    = null;
let _unsubPlanning = null;

// ── Helpers ───────────────────────────────────────────

/**
 * Returns "YYYY-MM" for the currently viewed month.
 * @returns {string}
 */
function getViewMonthPrefix() {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

// ── Firebase listeners ────────────────────────────────

/**
 * Loads users_mapping once — it changes rarely and is small.
 */
function _loadUsersMapping() {
    db.ref("users_mapping").on("value", snap => {
        usersMapping = snap.val() || {};
        if (currentUser && usersMapping[currentUser.uid]) {
            currentRole = usersMapping[currentUser.uid].name;
        }
    });
}

/**
 * Subscribes to cook_posts and planning for the given month prefix.
 * Unsubscribes previous listeners first.
 *
 * @param {string} prefix  e.g. "2026-03"
 */
function subscribeToMonth(prefix) {
    // Tear down previous listeners
    if (_unsubPosts) {
        db.ref(`cook_posts`).orderByKey()
        .startAt(prefix).endAt(prefix + "\uffff").off("value");
        _unsubPosts = null;
    }
    if (_unsubPlanning) {
        db.ref(`planning`).orderByKey()
        .startAt(prefix).endAt(prefix + "\uffff").off("value");
        _unsubPlanning = null;
    }

    // Reset data for new month
    globalData = {};
    planData   = {};

    // Posts for this month
    const postsQuery = db.ref("cook_posts").orderByKey()
    .startAt(prefix).endAt(prefix + "\uffff");

    _unsubPosts = postsQuery.on("value", snap => {
        globalData = snap.val() || {};
        render();
        if (!document.getElementById("dayView").hidden) {
            updateHistory();
        }
    }, err => console.error("cook_posts listener error:", err.code));

    // Planning for this month
    const planQuery = db.ref("planning").orderByKey()
    .startAt(prefix).endAt(prefix + "\uffff");

    _unsubPlanning = planQuery.on("value", snap => {
        planData = snap.val() || {};
        render();
    }, err => console.error("planning listener error:", err.code));
}

// ── Bootstrap ─────────────────────────────────────────
_loadUsersMapping();
subscribeToMonth(getViewMonthPrefix());
initAuthListener();
