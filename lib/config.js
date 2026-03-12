// ===================================================
//  lib/config.js — Server-side app constants from env
//  Используется в api/bot.js, api/upload.js и др.
// ===================================================

module.exports = {
    CHEFS:          (process.env.CHEFS || "ГИЗАР,ВИОЛЕТТА,КАМИЛЬ").split(",").map(s => s.trim()),
    VOTE_THRESHOLD: Number(process.env.VOTE_THRESHOLD)  || 2,
    PLAN_AHEAD_DAYS:Number(process.env.PLAN_AHEAD_DAYS) || 7,
};
