// ===================================================
//  api/admin/users.js — Manage users mapping
//
//  GET                            list all users
//  PATCH { userId, name }         change user role
//  DELETE { userId }              remove user (frees role slot)
// ===================================================

const { db }           = require("../../lib/firebase");
const { requireAdmin } = require("../../lib/adminAuth");
const { CHEFS }        = require("../../lib/config");

export default async function handler(req, res) {
    if (!requireAdmin(req, res)) return;

    if (req.method === "GET") {
        const snap = await db.ref("users_mapping").once("value");
        return res.status(200).json({ ok: true, users: snap.val() || {} });
    }

    if (req.method === "PATCH") {
        const { userId, name } = req.body;
        if (!userId || !CHEFS.includes(name)) {
            return res.status(400).json({ error: "Invalid params" });
        }
        await db.ref(`users_mapping/${userId}/name`).set(name);
        return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "Missing userId" });
        await db.ref(`users_mapping/${userId}`).remove();
        return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
}
