// ===================================================
//  api/env.js — Публичный конфиг для фронтенда
//  Отдаёт только те ключи, которые безопасно слать в браузер.
//  Секреты (FIREBASE_PRIVATE_KEY, BOT_TOKEN и т.д.) сюда НЕ попадают.
// ===================================================

export default function handler(req, res) {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");

    res.send(`window.ENV = ${JSON.stringify({
        // ── Firebase (публичные ключи) ──
        FIREBASE_API_KEY:             process.env.FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN:         process.env.FIREBASE_AUTH_DOMAIN,
        FIREBASE_DATABASE_URL:        process.env.FIREBASE_DATABASE_URL,
        FIREBASE_PROJECT_ID:          process.env.FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET:      process.env.FIREBASE_STORAGE_BUCKET,
        FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
        FIREBASE_APP_ID:              process.env.FIREBASE_APP_ID,

        // ── Настройки приложения ──
        // Меняй через Vercel env — код трогать не нужно
        CHEFS:           process.env.CHEFS           || "ГИЗАР,ВИОЛЕТТА,КАМИЛЬ",
        VOTE_THRESHOLD:  process.env.VOTE_THRESHOLD  || "2",
        PLAN_AHEAD_DAYS: process.env.PLAN_AHEAD_DAYS || "7",
    })};`);
}
