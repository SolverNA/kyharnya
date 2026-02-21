// ===================================================
//  api/notify.js — Cron: remind unvoted chefs
//  Runs every hour via Vercel Cron
// ===================================================

const { db }          = require("../lib/firebase");
const { sendMessage } = require("../lib/telegram");

export default async function handler(req, res) {
    // Protect endpoint — only Vercel cron can call this
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end();
    }

    try {
        const todayKey    = getTodayKey();
        const postsSnap   = await db.ref(`cook_posts/${todayKey}`).once("value");
        const posts       = postsSnap.val();

        if (!posts) return res.status(200).json({ ok: true, message: "No posts today" });

        const mappingSnap = await db.ref("users_mapping").once("value");
        const mapping     = mappingSnap.val() || {};

        const tgMsgsSnap  = await db.ref(`tg_messages/${todayKey}`).once("value");
        const tgMsgs      = tgMsgsSnap.val() || {};

        let remindedCount = 0;

        for (const [postKey, post] of Object.entries(posts)) {
            if (post.status !== "pending") continue;

            const votes     = post.votes || {};
            const postTgMsg = tgMsgs[postKey];
            if (!postTgMsg) continue;

            // Find chefs who haven't voted yet (excluding author)
            for (const [uid, user] of Object.entries(mapping)) {
                if (!user.chatId)              continue;
                if (uid === post.authorId)     continue; // author can't vote
                if (votes[uid])                continue; // already voted

                // Find message_id for this user's chat
                const messageId = postTgMsg[user.chatId];
                const linkText  = messageId
                ? `\n\n👆 Найди сообщение выше и проголосуй прямо там.`
                : "";

                await sendMessage(
                    user.chatId,
                    `⏰ <b>Напоминание!</b>\n\nПовар <b>${post.chef}</b> ждёт твоей оценки готовки за сегодня.${linkText}`
                );

                remindedCount++;
            }
        }

        return res.status(200).json({ ok: true, remindedCount });

    } catch (err) {
        console.error("Notify cron error:", err);
        return res.status(500).json({ error: err.message });
    }
}

function getTodayKey() {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, "0");
    const d   = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
