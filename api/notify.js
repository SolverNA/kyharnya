// ===================================================
//  api/notify.js — Daily cron: remind unvoted chefs
// ===================================================

const { db }          = require("../lib/firebase");
const { sendMessage } = require("../lib/telegram");
const { MSG }         = require("../messages");

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end();
    }

    try {
        const todayKey   = _getTodayKey();
        const postsSnap  = await db.ref(`cook_posts/${todayKey}`).once("value");
        const posts      = postsSnap.val();

        if (!posts) return res.status(200).json({ ok: true, message: "No posts today" });

        const mappingSnap = await db.ref("users_mapping").once("value");
        const mapping     = mappingSnap.val() || {};

        const tgMsgsSnap = await db.ref(`tg_messages/${todayKey}`).once("value");
        const tgMsgs     = tgMsgsSnap.val() || {};

        let remindedCount = 0;

        for (const [postKey, post] of Object.entries(posts)) {
            if (post.status !== "pending") continue;

            const votes     = post.votes || {};
            const postTgMsg = tgMsgs[postKey];
            if (!postTgMsg) continue;

            for (const [uid, user] of Object.entries(mapping)) {
                if (!user.chatId)          continue;
                if (uid === post.authorId) continue; // author can't vote
                if (votes[uid])            continue; // already voted

                await sendMessage(user.chatId, MSG.reminder(post.chef));
                remindedCount++;
            }
        }

        return res.status(200).json({ ok: true, remindedCount });

    } catch (err) {
        console.error("Notify cron error:", err);
        return res.status(500).json({ error: err.message });
    }
}

function _getTodayKey() {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, "0");
    const d   = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
