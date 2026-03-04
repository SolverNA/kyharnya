// ===================================================
//  api/admin/posts.js — Manage cook posts
//
//  GET    ?month=2026-03          list all posts for month
//  PATCH  { dateKey, postKey, status }   change status
//  DELETE { dateKey, postKey }           delete post
// ===================================================

const { db }           = require("../../lib/firebase");
const { requireAdmin } = require("../../lib/adminAuth");

export default async function handler(req, res) {
    if (!requireAdmin(req, res)) return;

    // ── GET: list posts for a month ───────────────────
    if (req.method === "GET") {
        const month = req.query.month; // "YYYY-MM"
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: "Invalid month param" });
        }

        const snap = await db.ref("cook_posts")
            .orderByKey()
            .startAt(month)
            .endAt(month + "\uffff")
            .once("value");

        return res.status(200).json({ ok: true, posts: snap.val() || {} });
    }

    // ── PATCH: change post status ─────────────────────
    if (req.method === "PATCH") {
        const { dateKey, postKey, status } = req.body;

        if (!dateKey || !postKey || !["approved", "rejected", "pending"].includes(status)) {
            return res.status(400).json({ error: "Invalid params" });
        }

        await db.ref(`cook_posts/${dateKey}/${postKey}/status`).set(status);
        return res.status(200).json({ ok: true });
    }

    // ── DELETE: remove post ───────────────────────────
    if (req.method === "DELETE") {
        const { dateKey, postKey } = req.body;

        if (!dateKey || !postKey) {
            return res.status(400).json({ error: "Missing dateKey or postKey" });
        }

        await db.ref(`cook_posts/${dateKey}/${postKey}`).remove();
        // Also clean up tg_messages for this post
        await db.ref(`tg_messages/${dateKey}/${postKey}`).remove();

        return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
}
