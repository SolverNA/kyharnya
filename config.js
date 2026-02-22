// ===================================================
//  config.js — App constants
//  Firebase keys are injected by Vercel at build time
//  via window.ENV (see index.html inline script)
// ===================================================

/** Firebase config — values come from Vercel env vars injected into HTML */
const FIREBASE_CONFIG = {
    apiKey:            window.ENV.FIREBASE_API_KEY,
    authDomain:        window.ENV.FIREBASE_AUTH_DOMAIN,
    databaseURL:       window.ENV.FIREBASE_DATABASE_URL,
    projectId:         window.ENV.FIREBASE_PROJECT_ID,
    storageBucket:     window.ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId:             window.ENV.FIREBASE_APP_ID,
};

/** List of all possible chef names (roles). */
const CHEFS = ["ГИЗАР", "ВИОЛЕТТА", "КАМИЛЬ"];

/** How many votes in one direction trigger a decision. */
const VOTE_THRESHOLD = 2;

/** How many days ahead planning is allowed. */
const PLAN_AHEAD_DAYS = 7;
