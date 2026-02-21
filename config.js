// ===================================================
//  config.js — Firebase configuration & app constants
// ===================================================

/** @type {import('firebase/app').FirebaseOptions} */
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyA123c63SiYKZ6gUutup51cUEFk2eW-hY8",
    authDomain:        "egfesf.firebaseapp.com",
    projectId:         "egfesf",
    storageBucket:     "egfesf.firebasestorage.app",
    messagingSenderId: "374992022938",
    appId:             "1:374992022938:web:67916c8442861733eb9e23",
    databaseURL:       "https://egfesf-default-rtdb.europe-west1.firebasedatabase.app",
};

/** List of all possible chef names (roles). */
const CHEFS = ["ГИЗАР", "ВИОЛЕТТА", "КАМИЛЬ"];

/** How many votes in one direction trigger a decision. */
const VOTE_THRESHOLD = 2;

/** How many days ahead planning is allowed. */
const PLAN_AHEAD_DAYS = 7;
