// ===================================================
//  lib/adminAuth.js — JWT verification middleware
//  Used by all /api/admin/* endpoints except auth.js
// ===================================================

const crypto = require("crypto");

/**
 * Verifies the admin JWT from the HttpOnly cookie.
 * Returns true if valid, sends 401 and returns false if not.
 *
 * Usage in any admin endpoint:
 *   if (!requireAdmin(req, res)) return;
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 * @returns {boolean}
 */
function requireAdmin(req, res) {
    const cookie = req.headers.cookie || "";
    const match  = cookie.match(/admin_token=([^;]+)/);

    if (!match) {
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }

    const token  = match[1];
    const parts  = token.split(".");

    if (parts.length !== 3) {
        res.status(401).json({ error: "Invalid token" });
        return false;
    }

    const [header, body, sig] = parts;
    const expected = crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(`${header}.${body}`)
        .digest("base64url");

    if (expected !== sig) {
        res.status(401).json({ error: "Invalid signature" });
        return false;
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(body, "base64url").toString());
    } catch {
        res.status(401).json({ error: "Invalid token payload" });
        return false;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
        res.status(401).json({ error: "Token expired" });
        return false;
    }

    return true;
}

module.exports = { requireAdmin };
