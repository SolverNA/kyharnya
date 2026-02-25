// ===================================================
//  config.js — App constants
//  Firebase keys are injected via window.ENV (api/env.js)
// ===================================================

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

// ── Notification settings ─────────────────────────────
// Все времена в UTC. Москва = UTC+3, поэтому вычитай 3 часа.
// Пример: хочешь в 10:00 МСК → ставь 7

/**
 * Час (UTC) для отправки напоминания проголосовать.
 * 7 UTC = 10:00 МСК
 */
const REMINDER_HOUR_UTC = 7;

/**
 * Час (UTC) для уведомления "ты готовишь сегодня".
 * 6 UTC = 9:00 МСК
 */
const COOKING_REMINDER_HOUR_UTC = 6;
