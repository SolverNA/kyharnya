// ===================================================
//  config.js — Фронтенд-константы
//  Все значения приходят через /api/env → window.ENV
//  Ничего не захардкожено — всё управляется через Vercel env vars
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

/** Список поваров — берётся из env, формат "ИМЯ1,ИМЯ2,ИМЯ3" */
const CHEFS = window.ENV.CHEFS.split(",").map(s => s.trim());

/** Сколько голосов нужно для решения */
const VOTE_THRESHOLD = Number(window.ENV.VOTE_THRESHOLD);

/** На сколько дней вперёд разрешено планирование */
const PLAN_AHEAD_DAYS = Number(window.ENV.PLAN_AHEAD_DAYS);
