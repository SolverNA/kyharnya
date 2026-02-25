// ===================================================
//  api/notify.js — Daily cron notifications
//
//  Два типа уведомлений:
//  1. COOKING_REMINDER (раньше) — назначенному повару "ты готовишь сегодня"
//  2. VOTE_REMINDER (позже)    — напоминание проголосовать за пост
//
//  Vercel запускает этот endpoint по расписанию из vercel.json.
//  Реальное время определяется по текущему UTC-часу внутри функции.
// ===================================================

const { db }          = require("../lib/firebase");
const { sendMessage } = require("../lib/telegram");
const { MSG }         = require("../messages");

// ── Время уведомлений (UTC) ──────────────────────────
// Меняй здесь — и в vercel.json соответственно!
// Москва = UTC+3. Хочешь в 9:00 МСК → 6 UTC.
const COOKING_REMINDER_HOUR_UTC = 6;  // 9:00 МСК — кому готовить сегодня
const VOTE_REMINDER_HOUR_UTC    = 7;  // 10:00 МСК — напоминание проголосовать

export default async function handler(req, res) {
    // Защита: только Vercel cron или ручной вызов с секретом
    const authHeader = req.headers.authorization;
    const isVercelCron = req.headers["x-vercel-cron"] === "1";

    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end();
    }

    const currentHourUTC = new Date().getUTCHours();
    const results = { cooking: 0, vote: 0, skipped: false };

    try {
        // ── Тип 1: Уведомление назначенному повару ──
        if (currentHourUTC === COOKING_REMINDER_HOUR_UTC) {
            results.cooking = await _sendCookingReminders();
        }

        // ── Тип 2: Напоминание проголосовать ──
        if (currentHourUTC === VOTE_REMINDER_HOUR_UTC) {
            results.vote = await _sendVoteReminders();
        }

        if (currentHourUTC !== COOKING_REMINDER_HOUR_UTC &&
            currentHourUTC !== VOTE_REMINDER_HOUR_UTC) {
            results.skipped = true;
            }

            console.log(`Notify done at UTC ${currentHourUTC}:00`, results);
        return res.status(200).json({ ok: true, hourUTC: currentHourUTC, ...results });

    } catch (err) {
        console.error("Notify cron error:", err);
        return res.status(500).json({ error: err.message });
    }
}

// ── Тип 1: Кто готовит сегодня ───────────────────────

async function _sendCookingReminders() {
    const todayKey    = _getTodayKey();
    const plan        = await db.ref(`planning/${todayKey}`).once("value");
    const planData    = plan.val();

    // Нет плана на сегодня — ничего не делаем
    if (!planData?.chef) return 0;

    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};

    let sent = 0;

    // Находим запись назначенного повара и отправляем ему
    for (const [uid, user] of Object.entries(mapping)) {
        if (user.name !== planData.chef) continue;
        if (!user.chatId) continue;

        await sendMessage(user.chatId, MSG.cookingToday(planData.chef, todayKey));
        sent++;
    }

    return sent;
}

// ── Тип 2: Напоминание проголосовать ─────────────────

async function _sendVoteReminders() {
    const todayKey   = _getTodayKey();
    const postsSnap  = await db.ref(`cook_posts/${todayKey}`).once("value");
    const posts      = postsSnap.val();

    if (!posts) return 0;

    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};

    const tgMsgsSnap = await db.ref(`tg_messages/${todayKey}`).once("value");
    const tgMsgs     = tgMsgsSnap.val() || {};

    let sent = 0;

    for (const [postKey, post] of Object.entries(posts)) {
        if (post.status !== "pending") continue;

        const votes     = post.votes || {};
        const postTgMsg = tgMsgs[postKey];
        if (!postTgMsg) continue;

        for (const [uid, user] of Object.entries(mapping)) {
            if (!user.chatId)          continue;
            if (uid === post.authorId) continue; // автор не голосует
            if (votes[uid])            continue; // уже проголосовал

            await sendMessage(user.chatId, MSG.reminder(post.chef));
            sent++;
        }
    }

    return sent;
}

function _getTodayKey() {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, "0");
    const d   = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
