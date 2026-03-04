// ===================================================
//  api/admin/posts.js — Manage cook posts
//
//  GET    ?month=2026-03                          list posts
//  POST   { dateKey, postData }                   create post
//  PATCH  { dateKey, postKey, status }            change status
//  DELETE { dateKey, postKey }                    delete post
// ===================================================

const { db }           = require("../../lib/firebase");
const { requireAdmin } = require("../../lib/adminAuth");

export default async function handler(req, res) {
    if (!requireAdmin(req, res)) return;

    // ── GET ───────────────────────────────────────────
    if (req.method === "GET") {
        const month = req.query.month;
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

    // ── POST: create new post ─────────────────────────
    if (req.method === "POST") {
        const { dateKey, postData } = req.body;

        if (!dateKey || !postData || !postData.chef) {
            return res.status(400).json({ error: "Missing dateKey or postData.chef" });
        }

        // Sanitize — don't allow arbitrary fields
        const clean = {
            img:      postData.img      || "",
            chef:     postData.chef,
            author:   postData.author   || postData.chef,
            authorId: postData.authorId || "admin",
            time:     postData.time     || "00:00",
            status:   ["approved","rejected","pending"].includes(postData.status)
            ? postData.status
            : "approved",
            votes:    {},
        };

        const ref = await db.ref(`cook_posts/${dateKey}`).push(clean);
        return res.status(200).json({ ok: true, postKey: ref.key });
    }

    // ── PATCH: change status ──────────────────────────
    if (req.method === "PATCH") {
        const { dateKey, postKey, status } = req.body;

        if (!dateKey || !postKey || !["approved","rejected","pending"].includes(status)) {
            return res.status(400).json({ error: "Invalid params" });
        }

        await db.ref(`cook_posts/${dateKey}/${postKey}/status`).set(status);
        return res.status(200).json({ ok: true });
    }

    // ── DELETE ────────────────────────────────────────
    if (req.method === "DELETE") {
        const { dateKey, postKey } = req.body;

        if (!dateKey || !postKey) {
            return res.status(400).json({ error: "Missing dateKey or postKey" });
        }

        await db.ref(`cook_posts/${dateKey}/${postKey}`).remove();
        await db.ref(`tg_messages/${dateKey}/${postKey}`).remove();
        return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
}
