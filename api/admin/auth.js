// api/admin/auth.js
const bcrypt = require("bcryptjs");

function base64url(str) {
    return Buffer.from(str).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function createJWT(payload, secret) {
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body   = base64url(JSON.stringify(payload));
    const sig    = require("crypto")
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return `${header}.${body}.${sig}`;
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { password } = req.body;
    const hash   = process.env.ADMIN_PASSWORD_HASH;
    const secret = process.env.JWT_SECRET;

    if (!hash || !secret) return res.status(500).json({ error: "Server not configured" });

    await new Promise(r => setTimeout(r, 600));

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: "Неверный пароль" });

    const token = createJWT(
        { role: "admin", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 8 * 3600 },
                            secret
    );

    return res.status(200).json({ ok: true, token });
}
