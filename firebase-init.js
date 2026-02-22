// ===================================================
//  firebase-init.js — Firebase initialization
//  Must load BEFORE auth.js and app.js
// ===================================================

firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.database();
const auth = firebase.auth();
