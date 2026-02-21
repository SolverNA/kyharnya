// ===================================================
//  api/upload.js — Upload photo to Cloudinary,
//                  save post to Firebase,
//                  send notification to Telegram
// ===================================================

const { db }             = require("../lib/firebase");
const { sendPhoto, buildVoteKeyboard } = require("../lib/telegram");

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { imageBase64, chef, author, authorId, dateKey, time } = req.body;

    if (!imageBase64 || !chef || !authorId || !dateKey) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // ── 1. Upload to Cloudinary ──────────────────
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        const cloudRes = await fetch(cloudinaryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                file:         imageBase64,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                folder:       "kyharnya",
            }),
        });

        const cloudData = await cloudRes.json();

        if (!cloudData.secure_url) {
            console.error("Cloudinary error:", cloudData);
            return res.status(500).json({ error: "Image upload failed" });
        }

        const imageUrl = cloudData.secure_url;

        // ── 2. Save post to Firebase ─────────────────
        const postData = {
            img:      imageUrl,
            chef,
            author,
            authorId,
            time,
            status:   "pending",
            votes:    {},
        };

        const postRef  = await db.ref(`cook_posts/${dateKey}`).push(postData);
        const postKey  = postRef.key;

        // ── 3. Send to all registered chefs in Telegram ──
        const mappingSnap = await db.ref("users_mapping").once("value");
        const mapping     = mappingSnap.val() || {};

        const caption  = `🍽 <b>Новая готовка!</b>\n\n👨‍🍳 Готовил: <b>${chef}</b>\n📅 ${dateKey}\n⏰ ${time}\n\n<i>Проголосуй:</i>`;
        const keyboard = buildVoteKeyboard(dateKey, postKey, 0, 0);

        const tgMessages = {};

        for (const [uid, user] of Object.entries(mapping)) {
            if (!user.chatId) continue;

            // Author sees the post but can't vote — send without buttons
            const extra = uid === authorId
            ? {}
            : { reply_markup: keyboard };

            const sentMsg = await sendPhoto(user.chatId, imageUrl, caption, extra);

            if (sentMsg.ok && sentMsg.result) {
                tgMessages[user.chatId] = sentMsg.result.message_id;
            }
        }

        // Save TG message IDs so we can edit them later when voting completes
        if (Object.keys(tgMessages).length > 0) {
            await db.ref(`tg_messages/${dateKey}/${postKey}`).set(tgMessages);
        }

        return res.status(200).json({ ok: true, postKey, imageUrl });

    } catch (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ error: err.message });
    }
}
