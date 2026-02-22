// ===================================================
//  lib/telegram.js — Telegram Bot API helpers
// ===================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE  = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method, body) {
    const res = await fetch(`${API_BASE}/${method}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
    });
    return res.json();
}

function sendMessage(chatId, text, extra = {}) {
    return callTelegram("sendMessage", {
        chat_id:    chatId,
        text,
        parse_mode: "HTML",
        ...extra,
    });
}

function sendPhoto(chatId, photoUrl, caption, extra = {}) {
    return callTelegram("sendPhoto", {
        chat_id:    chatId,
        photo:      photoUrl,
        caption,
        parse_mode: "HTML",
        ...extra,
    });
}

function editMessageCaption(chatId, messageId, caption, extra = {}) {
    return callTelegram("editMessageCaption", {
        chat_id:    chatId,
        message_id: messageId,
        caption,
        parse_mode: "HTML",
        ...extra,
    });
}

// ── Только кнопки, caption не трогаем ──
function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
    return callTelegram("editMessageReplyMarkup", {
        chat_id:      chatId,
        message_id:   messageId,
        reply_markup: replyMarkup,
    });
}

function answerCallbackQuery(callbackQueryId, text = "") {
    return callTelegram("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text,
    });
}

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
    editMessageCaption,
    editMessageReplyMarkup,
    answerCallbackQuery,
    buildVoteKeyboard,
};
