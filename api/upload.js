// ===================================================
//  api/upload.js — Upload photo to Cloudinary,
//                  save post to Firebase,
//                  send Telegram notifications
//
//  Security: verifies Telegram initData HMAC signature
//  before processing any request.
// ===================================================

const crypto                          = require("crypto");
const { db }                          = require("../lib/firebase");
const { sendPhoto, buildVoteKeyboard } = require("../lib/telegram");
const { MSG }                          = require("../messages");

// ── Telegram initData verification ───────────────────

/**
 * Verifies that initData was genuinely signed by Telegram.
 * Throws if invalid or expired (> 24h old).
 *
 * @param {string} initData  Raw initData string from Telegram.WebApp
 * @returns {{ userId: string }} Verified user info
 */
function verifyTelegramInitData(initData) {
    if (!initData) throw new Error("Missing initData");

    const params = new URLSearchParams(initData);
    const hash   = params.get("hash");
    if (!hash) throw new Error("Missing hash in initData");

    // Build the data-check string: all fields except hash, sorted, joined by \n
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

    // HMAC-SHA256 with key = HMAC-SHA256("WebAppData", BOT_TOKEN)
    const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.BOT_TOKEN)
    .digest();

    const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

    if (expectedHash !== hash) {
        throw new Error("Invalid initData signature");
    }

    // Check freshness — reject data older than 24 hours
    const authDate = Number(params.get("auth_date"));
    const age      = Math.floor(Date.now() / 1000) - authDate;
    if (age > 86400) {
        throw new Error("initData expired");
    }

    // Extract userId from the user JSON field
    const userJson = params.get("user");
    if (!userJson) throw new Error("No user in initData");
    const user = JSON.parse(userJson);

    return { userId: String(user.id) };
}

// ── Main handler ─────────────────────────────────────

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { imageBase64, chef, author, authorId, dateKey, time, initData } = req.body;

    if (!imageBase64 || !chef || !authorId || !dateKey) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // ── Verify Telegram identity ──────────────────────
    try {
        const verified = verifyTelegramInitData(initData);

        // Ensure the authorId in the request matches the verified Telegram user
        if (verified.userId !== authorId) {
            return res.status(403).json({ error: "User mismatch" });
        }
    } catch (err) {
        console.warn("initData verification failed:", err.message);
        return res.status(403).json({ error: "Unauthorized: " + err.message });
    }

    try {
        // ── 1. Upload to Cloudinary ───────────────────
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        const formData = new FormData();
        formData.append("file",          imageBase64);
        formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder",        "kyharnya");

        const cloudRes  = await fetch(cloudinaryUrl, { method: "POST", body: formData });
        const cloudData = await cloudRes.json();

        if (!cloudData.secure_url) {
            console.error("Cloudinary error:", cloudData);
            return res.status(500).json({ error: "Image upload failed" });
        }

        const imageUrl = cloudData.secure_url;

        // ── 2. Save post to Firebase ──────────────────
        const postData = { img: imageUrl, chef, author, authorId, time, status: "pending", votes: {} };
        const postRef  = await db.ref(`cook_posts/${dateKey}`).push(postData);
        const postKey  = postRef.key;

        // ── 3. Send Telegram notifications ───────────
        const mappingSnap = await db.ref("users_mapping").once("value");
        const mapping     = mappingSnap.val() || {};
        const keyboard    = buildVoteKeyboard(dateKey, postKey, 0, 0);
        const tgMessages  = {};

        for (const [uid, user] of Object.entries(mapping)) {
            if (!user.chatId) continue;

            const isAuthor = uid === authorId;
            const caption  = isAuthor
            ? MSG.newPostAuthor(chef, dateKey, time)
            : MSG.newPostVoter(chef, dateKey, time);
            const extra    = isAuthor ? {} : { reply_markup: keyboard };

            const sentMsg = await sendPhoto(user.chatId, imageUrl, caption, extra);

            if (sentMsg.ok && sentMsg.result) {
                tgMessages[user.chatId] = sentMsg.result.message_id;
            }
        }

        if (Object.keys(tgMessages).length > 0) {
            await db.ref(`tg_messages/${dateKey}/${postKey}`).set(tgMessages);
        }

        return res.status(200).json({ ok: true, postKey, imageUrl });

    } catch (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ error: err.message });
    }
}
