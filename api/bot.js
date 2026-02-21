// ===================================================
//  api/bot.js — Telegram webhook handler
// ===================================================

const { db }                  = require("../lib/firebase");
const {
    sendMessage,
    answerCallbackQuery,
    editMessageCaption,
    buildVoteKeyboard,
} = require("../lib/telegram");

// Chef names — must match config.js
const CHEFS          = ["ГИЗАР", "ВИОЛЕТТА", "КАМИЛЬ"];
const VOTE_THRESHOLD = 2;

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const update = req.body;

    try {
        // ── Inline button pressed ──────────────────
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
            return res.status(200).json({ ok: true });
        }

        // ── Text message ───────────────────────────
        if (update.message?.text) {
            await handleMessage(update.message);
            return res.status(200).json({ ok: true });
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error("Bot handler error:", err);
        res.status(200).json({ ok: true }); // Always 200 to Telegram
    }
}

// ── Message handler ──────────────────────────────

async function handleMessage(message) {
    const chatId = message.chat.id;
    const userId = String(message.from.id);
    const text   = message.text?.trim();

    if (text === "/start") {
        await handleStart(chatId, userId);
        return;
    }

    // Handle role selection reply
    const waitingSnap = await db.ref(`waiting_registration/${userId}`).once("value");
    if (waitingSnap.exists() && CHEFS.includes(text)) {
        await handleRoleSelection(chatId, userId, text);
        return;
    }

    // Check if user is registered
    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};
    const isRegistered = Object.keys(mapping).some(uid => uid === userId);

    if (!isRegistered) {
        await sendMessage(chatId, "⛔ Доступ запрещён. Бот только для поваров Кухарни.");
    }
}

async function handleStart(chatId, userId) {
    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};

    // Already registered
    if (mapping[userId]) {
        await sendMessage(chatId,
                          `👋 Привет, <b>${mapping[userId].name}</b>!\n\nТы уже зарегистрирован в Кухарне.`
        );
        return;
    }

    // Find taken roles
    const takenRoles = Object.values(mapping).map(u => u.name);
    const freeRoles  = CHEFS.filter(c => !takenRoles.includes(c));

    if (freeRoles.length === 0) {
        await sendMessage(chatId,
                          "⛔ Все места заняты. Доступ запрещён."
        );
        return;
    }

    // Show available roles as keyboard
    await db.ref(`waiting_registration/${userId}`).set(true);

    const keyboard = {
        keyboard:        freeRoles.map(role => [{ text: role }]),
        resize_keyboard: true,
        one_time_keyboard: true,
    };

    await sendMessage(chatId,
                      "👨‍🍳 Добро пожаловать в <b>Кухарню</b>!\n\nВыбери, кто ты — это действие нельзя отменить:",
                      { reply_markup: keyboard }
    );
}

async function handleRoleSelection(chatId, userId, chosenRole) {
    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};

    // Double-check role not taken
    const takenRoles = Object.values(mapping).map(u => u.name);
    if (takenRoles.includes(chosenRole)) {
        await sendMessage(chatId, `❌ Роль <b>${chosenRole}</b> уже занята. Выбери другую.`);
        return;
    }

    const username = `@${(Math.random() * 1000).toFixed(0)}`; // placeholder

    await db.ref(`users_mapping/${userId}`).set({
        name:      chosenRole,
        telegramId: userId,
        chatId:    String(chatId),
    });

    await db.ref(`waiting_registration/${userId}`).remove();

    await sendMessage(chatId,
                      `✅ Отлично! Ты зарегистрирован как <b>${chosenRole}</b>.\n\nТеперь ты будешь получать уведомления о готовке и голосованиях.`,
                      { reply_markup: { remove_keyboard: true } }
    );
}

// ── Callback query handler (voting) ─────────────

async function handleCallbackQuery(query) {
    const userId = String(query.from.id);
    const chatId = query.message.chat.id;
    const data   = query.data;

    // Verify user is registered
    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};
    const userRecord  = mapping[userId];

    if (!userRecord) {
        await answerCallbackQuery(query.id, "⛔ Доступ запрещён");
        return;
    }

    // Parse callback data: "vote:like:2025-01-15:postKey"
    const parts = data.split(":");
    if (parts[0] !== "vote") return;

    const [, voteType, dateKey, postKey] = parts;

    // Run vote transaction in Firebase
    const postRef = db.ref(`cook_posts/${dateKey}/${postKey}`);
    const result  = await postRef.transaction(post => {
        if (!post || post.status !== "pending") return post;

        // Prevent author from voting
        if (post.authorId === userId) return post;

        if (!post.votes) post.votes = {};

        post.votes[userId] = {
            val:   voteType,
            name:  userRecord.name,
            photo: "",
        };

        const votes    = Object.values(post.votes);
        const likes    = votes.filter(v => v.val === "like").length;
        const dislikes = votes.filter(v => v.val === "dislike").length;

        if (likes    >= VOTE_THRESHOLD) post.status = "approved";
        if (dislikes >= VOTE_THRESHOLD) post.status = "rejected";

        return post;
    });

    const post = result.snapshot.val();
    if (!post) {
        await answerCallbackQuery(query.id, "Пост не найден");
        return;
    }

    // Author can't vote
    if (post.authorId === userId) {
        await answerCallbackQuery(query.id, "❌ Нельзя голосовать за свой пост");
        return;
    }

    const votes    = Object.values(post.votes || {});
    const likes    = votes.filter(v => v.val === "like").length;
    const dislikes = votes.filter(v => v.val === "dislike").length;

    // If decision reached — update all TG messages for this post and remove buttons
    if (post.status !== "pending") {
        await answerCallbackQuery(query.id,
                                  post.status === "approved" ? "✅ Одобрено!" : "❌ Отклонено"
        );
        await updatePostMessages(dateKey, postKey, post, likes, dislikes);
    } else {
        // Update buttons with new counts for all chat messages
        await answerCallbackQuery(query.id,
                                  voteType === "like" ? "👍 Проголосовал за" : "👎 Проголосовал против"
        );
        await refreshVoteButtons(dateKey, postKey, post, likes, dislikes);
    }
}

/**
 * Updates all TG messages for a post when voting is complete.
 * Removes inline buttons and sets final status caption.
 */
async function updatePostMessages(dateKey, postKey, post, likes, dislikes) {
    const tgMsgSnap = await db.ref(`tg_messages/${dateKey}/${postKey}`).once("value");
    const tgMsgs    = tgMsgSnap.val();
    if (!tgMsgs) return;

    const statusLine = post.status === "approved"
    ? "✅ <b>ОДОБРЕНО</b>"
    : "🚫 <b>ОТКЛОНЕНО</b>";

    const caption = `${statusLine}\n\n👨‍🍳 Готовил: <b>${post.chef}</b>\n⏰ ${post.time}\n\n👍 ${likes}  👎 ${dislikes}`;

    for (const [chatId, messageId] of Object.entries(tgMsgs)) {
        await editMessageCaption(chatId, messageId, caption, {
            reply_markup: { inline_keyboard: [] },
        });
    }
}

/**
 * Refreshes vote counts on buttons without removing them.
 */
async function refreshVoteButtons(dateKey, postKey, post, likes, dislikes) {
    const tgMsgSnap = await db.ref(`tg_messages/${dateKey}/${postKey}`).once("value");
    const tgMsgs    = tgMsgSnap.val();
    if (!tgMsgs) return;

    const keyboard = buildVoteKeyboard(dateKey, postKey, likes, dislikes);

    for (const [chatId, messageId] of Object.entries(tgMsgs)) {
        await editMessageCaption(chatId, messageId, null, {
            reply_markup: keyboard,
        }).catch(() => {}); // ignore if caption unchanged
    }
}
