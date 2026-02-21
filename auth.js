// ===================================================
//  auth.js — Authentication & role-binding logic
// ===================================================

/**
 * Called by Google Identity Services after a successful sign-in.
 * @param {{ credential: string }} response
 */
function onGoogleSignIn(response) {
    const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
    auth.signInWithCredential(credential)
        .catch(err => alert("Ошибка авторизации: " + err.message));
}

/**
 * Reacts to Firebase Auth state changes.
 * Sets global `currentUser` / `currentRole` and updates the header UI.
 */
function initAuthListener() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;

            db.ref("users_mapping").once("value", snap => {
                usersMapping = snap.val() || {};

                if (usersMapping[user.uid]) {
                    currentRole = usersMapping[user.uid].name;
                    _showLoggedInUI(user, currentRole);
                } else {
                    showAuthModal(user.uid);
                }
            });

            document.getElementById("loginUI").style.display  = "none";
            document.getElementById("logoutUI").style.display = "block";

        } else {
            currentUser = null;
            currentRole = null;

            document.getElementById("userProfile").innerHTML   = "<b>Вход не выполнен</b>";
            document.getElementById("loginUI").style.display   = "block";
            document.getElementById("logoutUI").style.display  = "none";
            document.getElementById("authModal").style.display = "none";
        }

        render();
    });
}

/**
 * Renders the role-selection modal for a new (unbound) user.
 * @param {string} uid
 */
function showAuthModal(uid) {
    const modal     = document.getElementById("authModal");
    const container = document.getElementById("roleButtons");
    modal.style.display = "flex";

    const takenRoles = Object.values(usersMapping).map(u => u.name);
    let freeSlots = 0;
    let html = "";

    CHEFS.forEach(chef => {
        if (takenRoles.includes(chef)) {
            html += `<button class="role-btn" disabled>${chef} (Занято)</button>`;
        } else {
            html += `<button class="role-btn" onclick="bindRole('${uid}', '${chef}')">${chef}</button>`;
            freeSlots++;
        }
    });

    if (freeSlots === 0) {
        html = "<div style='color:red; font-weight:bold;'>Нет свободных мест. Доступ запрещен.</div>";
        setTimeout(() => auth.signOut(), 3000);
    }

    container.innerHTML = html;
}

/**
 * Saves the chosen role for a user in Firebase.
 * @param {string} uid
 * @param {string} name
 */
function bindRole(uid, name) {
    db.ref("users_mapping/" + uid)
        .set({ name, email: currentUser.email })
        .then(() => {
            currentRole        = name;
            usersMapping[uid]  = { name };
            _showLoggedInUI(currentUser, name);
        });
}

// ── Private helpers ──────────────────────────────────

/**
 * Updates the header profile pill and hides the auth modal.
 * @param {firebase.User} user
 * @param {string} role
 */
function _showLoggedInUI(user, role) {
    document.getElementById("userProfile").innerHTML = `
        <img src="${user.photoURL}" alt="${role}">
        <div>
            <div style="font-size:13px; font-weight:bold;">${role}</div>
            <div style="font-size:10px; color:var(--gray);">Статистика</div>
        </div>
    `;
    document.getElementById("authModal").style.display = "none";
}
