// ===================================================
//  api/admin/planning.js — Manage planning entries
//
//  GET    ?month=2026-03          list all plans for month
//  POST   { dateKey, chef }       set plan for a day
//  DELETE { dateKey }             remove plan for a day
// ===================================================

const { db }           = require("../../lib/firebase");
const { requireAdmin } = require("../../lib/adminAuth");

export default async function handler(req, res) {
    if (!requireAdmin(req, res)) return;

    if (req.method === "GET") {
        const month = req.query.month;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: "Invalid month param" });
        }

        const snap = await db.ref("planning")
            .orderByKey()
            .startAt(month)
            .endAt(month + "\uffff")
            .once("value");

        return res.status(200).json({ ok: true, planning: snap.val() || {} });
    }

    if (req.method === "POST") {
        const { dateKey, chef } = req.body;
        if (!dateKey || !chef) return res.status(400).json({ error: "Missing params" });

        await db.ref(`planning/${dateKey}`).set({ chef });
        return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
        const { dateKey } = req.body;
        if (!dateKey) return res.status(400).json({ error: "Missing dateKey" });

        await db.ref(`planning/${dateKey}`).remove();
        return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
}
