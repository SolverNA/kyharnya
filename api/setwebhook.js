// ===================================================
//  api/setwebhook.js — One-time: register webhook URL
//  Call once after deploy: /api/setwebhook?secret=SETUP
// ===================================================

export default async function handler(req, res) {
    if (req.query.secret !== "SETUP") {
        return res.status(403).json({ error: "Forbidden" });
    }

    const host       = req.headers.host;
    const webhookUrl = `https://${host}/api/bot`;
    const token      = process.env.BOT_TOKEN;

    const r = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ url: webhookUrl }),
        }
    );

    const data = await r.json();
    return res.status(200).json(data);
}
