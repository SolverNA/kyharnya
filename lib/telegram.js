// ===================================================
//  lib/telegram.js — Telegram Bot API helpers
// ===================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE  = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Generic Telegram API call
 */
async function callTelegram(method, body) {
    const res = await fetch(`${API_BASE}/${method}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
    });
    return res.json();
}

/**
 * Send a text message
 */
function sendMessage(chatId, text, extra = {}) {
    return callTelegram("sendMessage", {
        chat_id:    chatId,
        text,
        parse_mode: "HTML",
        ...extra,
    });
}

/**
 * Send a photo with caption
 */
function sendPhoto(chatId, photoUrl, caption, extra = {}) {
    return callTelegram("sendPhoto", {
        chat_id:    chatId,
        photo:      photoUrl,
        caption,
        parse_mode: "HTML",
        ...extra,
    });
}

/**
 * Edit message text (used to update vote status)
 */
function editMessageText(chatId, messageId, text, extra = {}) {
    return callTelegram("editMessageText", {
        chat_id:    chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        ...extra,
    });
}

/**
 * Edit message caption (used to update vote status on photo posts)
 */
function editMessageCaption(chatId, messageId, caption, extra = {}) {
    return callTelegram("editMessageCaption", {
        chat_id:    chatId,
        message_id: messageId,
        caption,
        parse_mode: "HTML",
        ...extra,
    });
}

/**
 * Answer a callback query (removes loading spinner on button)
 */
function answerCallbackQuery(callbackQueryId, text = "") {
    return callTelegram("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text,
    });
}

/**
 * Build inline keyboard for voting
 */
function buildVoteKeyboard(dateKey, postKey, likes, dislikes) {
    return {
        inline_keyboard: [[
            {
                text:          `👍 Одобрить (${likes})`,
                callback_data: `vote:like:${dateKey}:${postKey}`,
            },
            {
                text:          `👎 Отклонить (${dislikes})`,
                callback_data: `vote:dislike:${dateKey}:${postKey}`,
            },
        ]],
    };
}

module.exports = {
    callTelegram,
    sendMessage,
    sendPhoto,
    editMessageText,
    editMessageCaption,
    answerCallbackQuery,
    buildVoteKeyboard,
};
