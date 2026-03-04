// ===================================================
//  api/bot.js — Telegram webhook handler
// ===================================================

const { db }                  = require("../lib/firebase");
const {
    sendMessage,
    answerCallbackQuery,
    editMessageCaption,
    editMessageReplyMarkup,
    buildVoteKeyboard,
} = require("../lib/telegram");
const { MSG } = require("../messages");

const CHEFS          = ["ГИЗАР", "ВИОЛЕТТА", "КАМИЛЬ"];
const VOTE_THRESHOLD = 2;

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const update = req.body;

    try {
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
            return res.status(200).json({ ok: true });
        }

        if (update.message?.text) {
            await handleMessage(update.message);
            return res.status(200).json({ ok: true });
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error("Bot handler error:", err);
        res.status(200).json({ ok: true });
    }
}

async function handleMessage(message) {
    const chatId = message.chat.id;
    const userId = String(message.from.id);
    const text   = message.text?.trim();

    if (text === "/start") {
        await handleStart(chatId, userId);
        return;
    }

    const waitingSnap = await db.ref(`waiting_registration/${userId}`).once("value");
    if (waitingSnap.exists() && CHEFS.includes(text)) {
        await handleRoleSelection(chatId, userId, text);
        return;
    }

    const mappingSnap  = await db.ref("users_mapping").once("value");
    const mapping      = mappingSnap.val() || {};
    const isRegistered = Object.keys(mapping).some(uid => uid === userId);

    if (!isRegistered) {
        await sendMessage(chatId, MSG.notRegistered());
    }
}

async function handleStart(chatId, userId) {
    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};

    if (mapping[userId]) {
        await sendMessage(chatId, MSG.alreadyRegistered(mapping[userId].name));
        return;
    }

    const takenRoles = Object.values(mapping).map(u => u.name);
    const freeRoles  = CHEFS.filter(c => !takenRoles.includes(c));

    if (freeRoles.length === 0) {
        await sendMessage(chatId, MSG.noSlots());
        return;
    }

    await db.ref(`waiting_registration/${userId}`).set(true);

    await sendMessage(chatId, MSG.welcome(), {
        reply_markup: {
            keyboard:          freeRoles.map(role => [{ text: role }]),
                      resize_keyboard:   true,
                      one_time_keyboard: true,
        },
    });
}

async function handleRoleSelection(chatId, userId, chosenRole) {
    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};

    const takenRoles = Object.values(mapping).map(u => u.name);
    if (takenRoles.includes(chosenRole)) {
        await sendMessage(chatId, MSG.roleTaken(chosenRole));
        return;
    }

    // Получаем фото профиля через Telegram API
    let photoURL = "";
    try {
        const photosRes  = await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`
        );
        const photosData = await photosRes.json();
        const fileId     = photosData.result?.photos?.[0]?.[0]?.file_id;

        if (fileId) {
            const fileRes  = await fetch(
                `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
            );
            const fileData = await fileRes.json();
            const filePath = fileData.result?.file_path;
            if (filePath) {
                photoURL = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
            }
        }
    } catch (e) {
        // Фото недоступно — не критично
    }

    await db.ref(`users_mapping/${userId}`).set({
        name:       chosenRole,
        telegramId: userId,
        chatId:     String(chatId),
                                                photo:      photoURL,
    });

    await db.ref(`waiting_registration/${userId}`).remove();

    await sendMessage(chatId, MSG.registered(chosenRole), {
        reply_markup: { remove_keyboard: true },
    });
}

async function handleCallbackQuery(query) {
    const userId = String(query.from.id);
    const data   = query.data;

    const mappingSnap = await db.ref("users_mapping").once("value");
    const mapping     = mappingSnap.val() || {};
    const userRecord  = mapping[userId];

    if (!userRecord) {
        await answerCallbackQuery(query.id, "⛔ Доступ запрещён");
        return;
    }

    const parts = data.split(":");
    if (parts[0] !== "vote") return;

    const [, voteType, dateKey, postKey] = parts;

    const postRef = db.ref(`cook_posts/${dateKey}/${postKey}`);
    const result  = await postRef.transaction(post => {
        if (!post || post.status !== "pending") return post;
        if (post.authorId === userId) return post;

        if (!post.votes) post.votes = {};

        // Используем сохранённое фото из users_mapping
        post.votes[userId] = {
            val:   voteType,
            name:  userRecord.name,
            photo: userRecord.photo || "",
        };

        const votes    = Object.values(post.votes);
        const likes    = votes.filter(v => v.val === "like").length;
        const dislikes = votes.filter(v => v.val === "dislike").length;

        if (likes    >= VOTE_THRESHOLD) post.status = "approved";
        if (dislikes >= VOTE_THRESHOLD) post.status = "rejected";

        return post;
    });

    const post = result.snapshot.val();
    if (!post) { await answerCallbackQuery(query.id, "Пост не найден"); return; }

    if (post.authorId === userId) {
        await answerCallbackQuery(query.id, "❌ Нельзя голосовать за свой пост");
        return;
    }

    const votes    = Object.values(post.votes || {});
    const likes    = votes.filter(v => v.val === "like").length;
    const dislikes = votes.filter(v => v.val === "dislike").length;

    if (post.status !== "pending") {
        await answerCallbackQuery(query.id, post.status === "approved" ? "✅ Одобрено!" : "❌ Отклонено");
        await _finalizePostMessages(dateKey, postKey, post, likes, dislikes);
    } else {
        await answerCallbackQuery(query.id, voteType === "like" ? "👍 Проголосовал за" : "👎 Проголосовал против");
        await _refreshVoteButtons(dateKey, postKey, likes, dislikes);
    }
}

async function _finalizePostMessages(dateKey, postKey, post, likes, dislikes) {
    const tgMsgSnap = await db.ref(`tg_messages/${dateKey}/${postKey}`).once("value");
    const tgMsgs    = tgMsgSnap.val();
    if (!tgMsgs) return;

    const caption = post.status === "approved"
    ? MSG.approved(post.chef, post.time, likes, dislikes)
    : MSG.rejected(post.chef, post.time, likes, dislikes);

    for (const [chatId, messageId] of Object.entries(tgMsgs)) {
        await editMessageCaption(chatId, messageId, caption, {
            reply_markup: { inline_keyboard: [] },
        });
    }
}

async function _refreshVoteButtons(dateKey, postKey, likes, dislikes) {
    const tgMsgSnap = await db.ref(`tg_messages/${dateKey}/${postKey}`).once("value");
    const tgMsgs    = tgMsgSnap.val();
    if (!tgMsgs) return;

    const keyboard = buildVoteKeyboard(dateKey, postKey, likes, dislikes);

    for (const [chatId, messageId] of Object.entries(tgMsgs)) {
        await editMessageReplyMarkup(chatId, messageId, keyboard).catch(() => {});
    }
}
