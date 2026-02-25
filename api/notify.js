// ===================================================
//  api/notify.js — Daily cron notifications
//
//  Запускается раз в день в 6:00 UTC (9:00 МСК).
//  Vercel Hobby поддерживает только один запуск в сутки.
//
//  Отправляет оба типа уведомлений за один вызов:
//  1. Назначенному повару — "сегодня готовишь ты"
//  2. Всем остальным    — напоминание проголосовать
//     (только если есть незакрытые посты)
// ===================================================

const { db }          = require("../lib/firebase");
const { sendMessage } = require("../lib/telegram");
const { MSG }         = require("../messages");

export default async function handler(req, res) {
    const isVercelCron = req.headers["x-vercel-cron"] === "1";
    const authHeader   = req.headers.authorization;

    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end();
    }

    try {
        const cooking = await _sendCookingReminders();
        const vote    = await _sendVoteReminders();

        console.log("Notify done:", { cooking, vote });
        return res.status(200).json({ ok: true, cooking, vote });

    } catch (err) {
        console.error("Notify cron error:", err);
        return res.status(500).json({ error: err.message });
    }
}

// ── Тип 1: Кто готовит сегодня ───────────────────────

async function _sendCookingReminders() {
    const todayKey = _getTodayKey();
    const plan     = await db.ref(`planning/${todayKey}`).once("value");
    const planData = plan.val();

    if (!planData?.chef) return 0;

    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};
    let sent = 0;

    for (const [, user] of Object.entries(mapping)) {
        if (user.name !== planData.chef) continue;
        if (!user.chatId) continue;
        await sendMessage(user.chatId, MSG.cookingToday(planData.chef, todayKey));
        sent++;
    }

    return sent;
}

// ── Тип 2: Напоминание проголосовать ─────────────────
// Актуально если вчерашний пост остался без решения

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
        if (!tgMsgs[postKey]) continue;

        const votes = post.votes || {};
        for (const [uid, user] of Object.entries(mapping)) {
            if (!user.chatId)          continue;
            if (uid === post.authorId) continue;
            if (votes[uid])            continue;
            await sendMessage(user.chatId, MSG.reminder(post.chef));
            sent++;
        }
    }

    return sent;
}

function _getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
