// ===================================================
//  api/env.js — Serves Firebase public config to frontend
//  Only exposes keys that are safe for client-side use
// ===================================================

export default function handler(req, res) {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // These are PUBLIC keys — safe to expose to browser
    // Secret keys (FIREBASE_PRIVATE_KEY, BOT_TOKEN etc) are never sent here
    res.send(`window.ENV = ${JSON.stringify({
        FIREBASE_API_KEY:             process.env.FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN:         process.env.FIREBASE_AUTH_DOMAIN,
        FIREBASE_DATABASE_URL:        process.env.FIREBASE_DATABASE_URL,
        FIREBASE_PROJECT_ID:          process.env.FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET:      process.env.FIREBASE_STORAGE_BUCKET,
        FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
        FIREBASE_APP_ID:              process.env.FIREBASE_APP_ID,
    })};`);
}
