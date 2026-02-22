// ===================================================
//  auth.js — Authentication via Telegram Mini App
// ===================================================

/**
 * Reads Telegram WebApp context, finds user in Firebase mapping,
 * sets currentUser/currentRole globals, and updates header UI.
 * Shows blocking screen if opened outside Telegram or unregistered.
 */
function initAuthListener() {
    const tg = window.Telegram?.WebApp;

    if (!tg || !tg.initData) {
        _showNotTelegramScreen();
        return;
    }

    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;
    if (!user) {
        _showNotTelegramScreen();
        return;
    }

    const userId = String(user.id);

    db.ref("users_mapping/" + userId).once("value", snap => {
        if (snap.exists()) {
            const data  = snap.val();
            currentUser = { uid: userId, displayName: data.name, photoURL: "" };
            currentRole = data.name;
            _showLoggedInUI(user, data.name);
        } else {
            _showRegisterViaBotScreen(user);
        }

        render();
    });
}

// ── Private helpers ──────────────────────────────────

/**
 * Updates the header pill with avatar and role name.
 * Hides login/logout buttons (not used in TG Mini App).
 */
function _showLoggedInUI(tgUser, role) {
    const photo = tgUser.photo_url || "";

    document.getElementById("userProfile").innerHTML = `
    <img src="${photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(role) + '&background=4f46e5&color=fff'}"
    alt="${role}"
    style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
    <div>
    <div style="font-size:13px; font-weight:bold;">${role}</div>
    <div style="font-size:10px; color:var(--gray);">Статистика</div>
    </div>
    `;

    document.getElementById("loginUI").style.display   = "none";
    document.getElementById("logoutUI").style.display  = "none";
    document.getElementById("authModal").style.display = "none";
}

/**
 * Replaces page content with a message directing user to open via Telegram.
 */
function _showNotTelegramScreen() {
    document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;
    justify-content:center;height:100vh;padding:30px;
    font-family:'Inter',-apple-system,sans-serif;text-align:center;
    background:#f1f5f9;color:#0f172a;">
    <div style="font-size:64px;margin-bottom:20px;">🍳</div>
    <h2 style="margin:0 0 10px;">Кухарня</h2>
    <p style="color:#64748b;margin:0 0 30px;">Приложение доступно только через Telegram.</p>
    <a href="https://t.me/${getTgBotUsername()}"
    style="display:inline-block;padding:14px 28px;background:#4f46e5;color:white;
    border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">
    Открыть в Telegram
    </a>
    </div>
    `;
}

/**
 * Replaces page content directing unregistered user to /start the bot first.
 */
function _showRegisterViaBotScreen(tgUser) {
    document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;
    justify-content:center;height:100vh;padding:30px;
    font-family:'Inter',-apple-system,sans-serif;text-align:center;
    background:#f1f5f9;color:#0f172a;">
    <div style="font-size:64px;margin-bottom:20px;">👋</div>
    <h2 style="margin:0 0 10px;">Привет, ${tgUser.first_name}!</h2>
    <p style="color:#64748b;margin:0 0 30px;">
    Сначала зарегистрируйся в боте — напиши <b>/start</b> и выбери своё имя.
    </p>
    <a href="https://t.me/${getTgBotUsername()}"
    style="display:inline-block;padding:14px 28px;background:#4f46e5;color:white;
    border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">
    Открыть бота
    </a>
    </div>
    `;
}

function getTgBotUsername() {
    return "kyharnya_bot";
}
