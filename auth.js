// ===================================================
//  auth.js — Authentication via Telegram Mini App
// ===================================================

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

    const userId   = String(user.id);
    const photoURL = user.photo_url || "";

    db.ref("users_mapping/" + userId).once("value", snap => {
        if (snap.exists()) {
            const data = snap.val();

            // Используем сохранённое фото или свежее из Telegram
            const photo = data.photo || photoURL;

            currentUser = { uid: userId, displayName: data.name, photoURL: photo };
            currentRole = data.name;

            // Обновляем фото в Firebase если появилось новое
            if (photoURL && data.photo !== photoURL) {
                db.ref("users_mapping/" + userId + "/photo").set(photoURL);
            }

            _showLoggedInUI(user, data.name, photo);
        } else {
            _showRegisterViaBotScreen(user);
        }

        render();
    });
}

// ── Private helpers ──────────────────────────────────

function _showLoggedInUI(tgUser, role, photo) {
    const avatarSrc = photo ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(role)}&background=4f46e5&color=fff`;

    document.getElementById("userProfile").innerHTML = `
        <img src="${avatarSrc}"
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
