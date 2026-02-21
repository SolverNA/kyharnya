// ===================================================
//  config.js — Firebase configuration & app constants
// ===================================================

/** @type {import('firebase/app').FirebaseOptions} */
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyAPISpt4e1bj3ZYSFEFC3bXyHd_er1c9wY",
    authDomain:        "kyharnya.firebaseapp.com",
    databaseURL:       "https://kyharnya-default-rtdb.europe-west1.firebasedatabase.app",
    projectId:         "kyharnya",
    storageBucket:     "kyharnya.firebasestorage.app",
    messagingSenderId: "1063310079727",
    appId:             "1:1063310079727:web:dccd2f85c11979da4b0d1a",
};

/** List of all possible chef names (roles). */
const CHEFS = ["ГИЗАР", "ВИОЛЕТТА", "КАМИЛЬ"];

/** How many votes in one direction trigger a decision. */
const VOTE_THRESHOLD = 2;

/** How many days ahead planning is allowed. */
const PLAN_AHEAD_DAYS = 7;

/** Reminder notification time (daily cron) */
const REMINDER_HOUR = 8;
