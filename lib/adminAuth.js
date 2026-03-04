// ===================================================
//  lib/adminAuth.js — JWT middleware for admin routes
//  Reads token from Authorization: Bearer <token>
// ===================================================

const crypto = require("crypto");

function base64urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return Buffer.from(str, "base64").toString("utf8");
}

/**
 * Call at the top of every admin handler.
 * Returns true if authorized, or sends 401 and returns false.
 */
function requireAdmin(req, res) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ error: "Server not configured" });
        return false;
    }

    // Read from Authorization header: "Bearer <token>"
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }

    try {
        const parts = token.split(".");
        if (parts.length !== 3) throw new Error("bad format");

        const [header, payload, sig] = parts;

        // Verify signature
        const expected = crypto
        .createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        if (sig !== expected) throw new Error("invalid signature");

        // Verify expiry
        const data = JSON.parse(base64urlDecode(payload));
        if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
            throw new Error("token expired");
        }

        return true;
    } catch (e) {
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }
}

module.exports = { requireAdmin };
