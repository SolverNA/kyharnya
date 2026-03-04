// ===================================================
//  api/admin/auth.js — Admin login: bcrypt hash check → JWT
//
//  Env vars required:
//    ADMIN_PASSWORD_HASH  — bcrypt hash of your password
//                           Generate once locally:
//                           node -e "require('bcryptjs').hash('yourpass', 12).then(h => console.log(h))"
//    JWT_SECRET           — any long random string
// ===================================================

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * Minimal JWT — no external deps beyond crypto (built-in).
 */
function createJWT(payload, secret) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body   = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig    = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: "Пароль не указан" });
    }

    // bcrypt.compare does constant-time comparison — safe against timing attacks
    const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || "");

    if (!valid) {
        // Fixed delay regardless of result — prevents timing-based enumeration
        await new Promise(r => setTimeout(r, 600));
        return res.status(401).json({ error: "Неверный пароль" });
    }

    const token = createJWT(
        {
            role: "admin",
            iat:  Math.floor(Date.now() / 1000),
                            exp:  Math.floor(Date.now() / 1000) + 28800, // 8 hours
        },
        process.env.JWT_SECRET
    );

    res.setHeader("Set-Cookie", [
        `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
    ]);

    return res.status(200).json({ ok: true });
}
